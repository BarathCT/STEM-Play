import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../../utils/auth';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { ArrowLeft, Loader2, X } from 'lucide-react';

// Custom nodes
import ButtonExt from '../components/Editor/Button';
import CustomTableExt from '../components/Editor/CustomTable';
import CollapseExt from '../components/Editor/Collapse';

/* ---------- Helpers ---------- */
function slugify(text) {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function getEnv(key) {
  const v = import.meta.env?.[key];
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.toLowerCase() === 'undefined' || t.toLowerCase() === 'null') return null;
  return t;
}
const GEMINI_MODEL = getEnv('VITE_GEMINI_MODEL') || 'gemini-1.5-flash';

/* ---------- Meaning / Simplify helpers ---------- */
async function dictionaryDefine(term) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Dictionary lookup failed.');
  const arr = await r.json();
  const entry = Array.isArray(arr) && arr[0];
  const meaningBlocks = entry?.meanings || [];
  const firstDef = meaningBlocks[0]?.definitions?.[0];
  const meaning = firstDef?.definition || '';
  const example = firstDef?.example || '';
  if (!meaning) throw new Error('No meaning found.');
  return { meaning, example };
}
async function geminiDefine(term) {
  const apiKey = getEnv('VITE_GEMINI_API_KEY');
  if (!apiKey) throw new Error('Gemini API key not configured (VITE_GEMINI_API_KEY).');

  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Explain the following word or short phrase in one concise sentence and give one very simple example suitable for a student.
Return ONLY JSON (no backticks) in this schema:
{
  "meaning": "short meaning in plain language",
  "example": "one simple example sentence",
  "simple": "a simpler synonym or phrase"
}
Term: ${term}`,
          },
        ],
      },
    ],
  };

  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) {
    let message = `Gemini HTTP ${resp.status}`;
    try {
      const j = await resp.json();
      if (j?.error?.message) message = j.error.message;
    } catch {}
    throw new Error(message);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let obj = null;
  try { obj = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : null; }
  if (!obj || (!obj.meaning && !obj.simple)) throw new Error('Could not parse Gemini response.');
  return obj;
}
async function defineTerm(term) {
  const clean = (term || '').trim();
  if (!clean) throw new Error('Empty term');
  try {
    const d = await dictionaryDefine(clean);
    return { meaning: d.meaning, example: d.example || '', simple: '' };
  } catch {
    return await geminiDefine(clean);
  }
}
async function geminiSimplify(text, level = 'sentence') {
  const apiKey = getEnv('VITE_GEMINI_API_KEY');
  if (!apiKey) {
    // naive local fallback: shorten to 1-2 sentences
    const trimmed = text.trim().replace(/\s+/g, ' ');
    const maxChars = level === 'paragraph' ? 220 : 140;
    return { simple: trimmed.length > maxChars ? trimmed.slice(0, maxChars).trim() + '…' : trimmed };
  }
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const instruction =
    level === 'paragraph'
      ? 'Rewrite the text in one short, simple sentence for students.'
      : 'Rewrite in very simple words (max 12 words).';
  const body = {
    generationConfig: { temperature: 0.25, maxOutputTokens: 160 },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${instruction}
Return ONLY JSON (no backticks):
{ "simple": "text" }
Text: ${text}`,
          },
        ],
      },
    ],
  };
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) {
    let message = `Gemini HTTP ${resp.status}`;
    try { const j = await resp.json(); if (j?.error?.message) message = j.error.message; } catch {}
    throw new Error(message);
  }
  const data = await resp.json();
  const t = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let obj = null;
  try { obj = JSON.parse(t); } catch { const m = t.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : null; }
  if (!obj || !obj.simple) throw new Error('Could not parse simplified text.');
  return obj;
}

/* ---------- Read-only TipTap viewer with auto-TOC ---------- */
function ReadOnlyViewer({ content, onHeadings, contentRef }) {
  const containerRef = useRef(null);

  // Build extensions once and de-duplicate by name
  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      ButtonExt,
      CustomTableExt,
      CollapseExt,
    ];
    const seen = new Set();
    const uniq = [];
    for (const ext of exts) {
      const name = ext?.name ?? ext?.config?.name;
      if (name) {
        if (seen.has(name)) continue;
        seen.add(name);
      }
      uniq.push(ext);
    }
    return uniq;
  }, []);

  const editor = useEditor({
    editable: false,
    extensions,
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    onCreate: () => {
      requestAnimationFrame(() => collectHeadings());
    },
  });

  useEffect(() => {
    if (contentRef) contentRef.current = containerRef.current;
  }, [contentRef]);

  useEffect(() => {
    const id = requestAnimationFrame(() => collectHeadings());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  function collectHeadings() {
    const el = containerRef.current;
    if (!el) return;
    const hs = Array.from(el.querySelectorAll('h1, h2, h3'));
    const items = [];
    const used = new Set();
    hs.forEach((h) => {
      const text = h.textContent || '';
      if (!text.trim()) return;
      let id = slugify(text);
      let suffix = 1;
      while (used.has(id)) id = `${id}-${suffix++}`;
      used.add(id);
      if (!h.id) h.id = id;
      const level = h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3;
      items.push({ id, text, level });
    });
    onHeadings?.(items);
  }

  if (!editor) return null;
  return (
    <div ref={containerRef}>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
}

/* ---------- Selection tooltip (anchored, scroll-aware) ---------- */
function SelectionMeaningTooltip({ anchorEl }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('small'); // 'small' | 'medium' | 'large'
  const [mode, setMode] = useState('idle'); // 'idle' | 'meaning' | 'simplify'
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  const rafRef = useRef(0);
  const selRectRef = useRef(null); // remember last selection rect for scroll reposition

  function classifySelection(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.trim().length;
    if (words <= 4 && chars <= 40) return 'small';
    if (words <= 30 && chars <= 250) return 'medium';
    return 'large';
  }

  function computePositionFromSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    return rect;
  }

  function placeTooltip(rect) {
    // Use viewport coords (position: fixed) — recompute on scroll/resize to follow selection
    const margin = 8;
    let top = rect.bottom + margin;
    let left = rect.left + rect.width / 2;
    // Clamp horizontally to viewport
    const vw = window.innerWidth;
    const pad = 12;
    left = Math.max(pad, Math.min(vw - pad, left));
    setPos({ top, left });
  }

  // Handle selection changes
  useEffect(() => {
    function isInside(node, container) {
      if (!node || !container) return false;
      let n = node.nodeType === 3 ? node.parentElement : node;
      while (n) {
        if (n === container) return true;
        n = n.parentElement;
      }
      return false;
    }

    function onSelection() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setVisible(false);
        return;
      }
      const text = (sel.toString() || '').trim();
      if (!text || !/[A-Za-z]/.test(text)) {
        setVisible(false);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!isInside(range.startContainer, anchorEl)) {
        setVisible(false);
        return;
      }
      const rect = computePositionFromSelection();
      if (!rect) {
        setVisible(false);
        return;
      }
      selRectRef.current = rect;
      placeTooltip(rect);

      setTerm(text);
      setCategory(classifySelection(text));
      setMode('idle');
      setRes(null);
      setErr('');
      setVisible(true);
    }

    document.addEventListener('mouseup', onSelection);
    document.addEventListener('keyup', onSelection);
    document.addEventListener('selectionchange', onSelection);
    return () => {
      document.removeEventListener('mouseup', onSelection);
      document.removeEventListener('keyup', onSelection);
      document.removeEventListener('selectionchange', onSelection);
    };
  }, [anchorEl]);

  // Follow scroll/resize by recomputing from current selection rect
  useEffect(() => {
    function onScrollOrResize() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = computePositionFromSelection();
        if (rect) {
          selRectRef.current = rect;
          placeTooltip(rect);
        }
      });
    }
    if (visible) {
      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize);
      // Also track zoom or layout changes via orientation
      window.addEventListener('orientationchange', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize);
        window.removeEventListener('resize', onScrollOrResize);
        window.removeEventListener('orientationchange', onScrollOrResize);
      };
    }
  }, [visible]);

  async function doMeaning() {
    setMode('meaning');
    setLoading(true);
    setRes(null);
    setErr('');
    try {
      const out = await defineTerm(term);
      setRes(out);
    } catch (e) {
      setErr(e.message || 'Failed to get meaning.');
    } finally {
      setLoading(false);
    }
  }
  async function doSimplify() {
    setMode('simplify');
    setLoading(true);
    setRes(null);
    setErr('');
    try {
      const level = category === 'small' ? 'sentence' : 'paragraph';
      const out = await geminiSimplify(term, level);
      setRes(out);
    } catch (e) {
      setErr(e.message || 'Failed to simplify.');
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed z-50" style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}>
      <div className="max-w-sm rounded-lg border bg-white shadow-xl">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-xs font-medium text-gray-700 truncate">
            {category === 'small' ? 'Meaning or simpler term' : 'Simpler term'}
          </div>
          <button
            type="button"
            className="p-1 text-gray-500 hover:text-gray-700"
            onClick={() => { setVisible(false); setRes(null); setErr(''); setMode('idle'); }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 px-3 py-2">
          {category === 'small' && (
            <button
              type="button"
              onClick={doMeaning}
              className={`px-2.5 py-1.5 text-xs rounded border ${mode === 'meaning' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Meaning
            </button>
          )}
          <button
            type="button"
            onClick={doSimplify}
            className={`px-2.5 py-1.5 text-xs rounded border ${mode === 'simplify' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            Simplify
          </button>
          <div className="ml-auto text-[11px] text-gray-500">“{term.length > 26 ? term.slice(0, 26) + '…' : term}”</div>
        </div>

        {/* Result area */}
        <div className="px-3 pb-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === 'meaning' ? 'Getting meaning…' : 'Simplifying…'}
            </div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : res ? (
            <div className="space-y-2 text-sm">
              {mode === 'meaning' && res.meaning ? (
                <>
                  <div className="text-gray-900">{res.meaning}</div>
                  {res.example ? <div className="text-gray-700"><span className="font-medium">Example:</span> {res.example}</div> : null}
                  {res.simple ? <div className="text-gray-700"><span className="font-medium">Simpler:</span> {res.simple}</div> : null}
                </>
              ) : (
                <div className="text-gray-900">{res.simple}</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Choose an option above.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function BlogView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [headings, setHeadings] = useState([]);

  const contentContainerRef = useRef(null);

  const readingTime = useMemo(() => {
    try {
      const text = JSON.stringify(blog?.content || {}).replace(/[^\w\s]/g, ' ');
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(1, Math.round(words / 200));
    } catch {
      return 1;
    }
  }, [blog]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await authFetch(`/student/blogs/${id}`);
        if (mounted) setBlog(res.blog || null);
      } catch (e) {
        setErr(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (err) return <div className="text-center py-12 text-red-600">{err}</div>;
  if (!blog) return <div className="text-center py-12 text-gray-500">Not found.</div>;

  return (
    <div className="mx-auto w/full max-w-6xl px-4 py-6">
      {/* Back */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-indigo-50 to-sky-50 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {blog.subject && (
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-indigo-700">
              {blog.subject}
            </span>
          )}
          {blog.class?.label && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-emerald-700">
              {blog.class.label}
            </span>
          )}
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600">
            {readingTime} min read
          </span>
        </div>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{blog.title}</h1>

        <div className="mt-1 text-sm text-gray-600">
          {blog.teacher?.name ? `By ${blog.teacher.name}` : null}
        </div>

        {blog.summary && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
            {blog.summary}
          </div>
        )}
      </div>

      {/* Content + TOC */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="relative rounded-xl border bg-white p-5">
            {/* Anchored, scroll-aware tooltip */}
            <SelectionMeaningTooltip anchorEl={contentContainerRef.current} />
            <ReadOnlyViewer contentRef={contentContainerRef} content={blog.content} onHeadings={setHeadings} />
          </div>
        </div>

        {/* TOC */}
        <aside className="lg:col-span-4">
          {/* Mobile TOC as collapsible */}
          <details className="mb-4 rounded-lg border bg-white p-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium text-gray-800">Table of contents</summary>
            <nav className="mt-2">
              {headings && headings.length ? (
                <ul className="space-y-1 text-sm">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 1 ? 'ml-0' : h.level === 2 ? 'ml-4' : 'ml-8'}>
                      <a href={`#${h.id}`} className="text-gray-700 hover:text-indigo-700">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-500">No headings</div>
              )}
            </nav>
          </details>

          {/* Desktop TOC sticky */}
          <div className="sticky top-6 hidden rounded-lg border bg-white p-4 lg:block">
            <div className="mb-2 text-sm font-semibold text-gray-900">Table of contents</div>
            <nav>
              {headings && headings.length ? (
                <ul className="space-y-1 text-sm">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 1 ? 'ml-0' : h.level === 2 ? 'ml-3' : 'ml-6'}>
                      <a href={`#${h.id}`} className="text-gray-700 hover:text-indigo-700">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-500">Headings will appear here</div>
              )}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}