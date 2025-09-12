import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

// Custom nodes (same as student BlogView)
import ButtonExt from '../components/Editor/Button';
import CustomTableExt from '../components/Editor/CustomTable';
import CollapseExt from '../components/Editor/Collapse';

/* ---------- Helpers shared with BlogView ---------- */
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
  if (!apiKey) throw new Error('Gemini key missing');
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    contents: [{
      role: 'user',
      parts: [{
        text: `Explain the following word or short phrase in one concise sentence and give one very simple example suitable for a student.
Return ONLY JSON (no backticks):
{ "meaning": "short", "example": "simple sentence", "simple": "synonym" }
Term: ${term}`
      }]
    }]
  };
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let obj = null;
  try { obj = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : null; }
  if (!obj || (!obj.meaning && !obj.simple)) throw new Error('Parse error');
  return obj;
}
async function defineTerm(term) {
  const t = (term || '').trim();
  if (!t) throw new Error('Empty');
  try { const d = await dictionaryDefine(t); return { meaning: d.meaning, example: d.example || '', simple: '' }; }
  catch { return await geminiDefine(t); }
}
async function geminiSimplify(text, level = 'sentence') {
  const apiKey = getEnv('VITE_GEMINI_API_KEY');
  if (!apiKey) {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    const maxChars = level === 'paragraph' ? 220 : 140;
    return { simple: trimmed.length > maxChars ? trimmed.slice(0, maxChars).trim() + '…' : trimmed };
  }
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const instruction = level === 'paragraph'
    ? 'Rewrite the text in one short, simple sentence for students.'
    : 'Rewrite in very simple words (max 12 words).';
  const body = {
    generationConfig: { temperature: 0.25, maxOutputTokens: 160 },
    contents: [{
      role: 'user',
      parts: [{ text: `${instruction}
Return ONLY JSON (no backticks):
{ "simple": "text" }
Text: ${text}` }]
    }]
  };
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
  const data = await resp.json();
  const t = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let obj = null;
  try { obj = JSON.parse(t); } catch { const m = t.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : null; }
  if (!obj || !obj.simple) throw new Error('Parse error');
  return obj;
}

/* Read-only TipTap viewer (same as student) */
function PreviewViewer({ content, onHeadings }) {
  const containerRef = useRef(null);

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
    onCreate: () => requestAnimationFrame(() => collectHeadings()),
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => collectHeadings());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  function collectHeadings() {
    const el = containerRef.current;
    if (!el || !onHeadings) return;
    const hs = Array.from(el.querySelectorAll('h1, h2, h3'));
    const items = [];
    const used = new Set();
    hs.forEach((h) => {
      const text = h.textContent || '';
      if (!text.trim()) return;
      let id = slugify(text);
      let i = 1;
      while (used.has(id)) id = `${id}-${i++}`;
      used.add(id);
      if (!h.id) h.id = id;
      const level = h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3;
      items.push({ id, text, level });
    });
    onHeadings(items);
  }

  if (!editor) return null;
  return (
    <div ref={containerRef}>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
}

/* Tooltip (scroll-aware), mirrors BlogView */
function SelectionMeaningTooltip({ anchorEl }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('small'); // small | medium | large
  const [mode, setMode] = useState('idle'); // idle | meaning | simplify
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  const rafRef = useRef(0);

  function classifySelection(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.trim().length;
    if (words <= 4 && chars <= 40) return 'small';
    if (words <= 30 && chars <= 250) return 'medium';
    return 'large';
  }
  function computeRect() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    return rect;
  }
  function place(rect) {
    const margin = 8;
    let top = rect.bottom + margin;
    let left = rect.left + rect.width / 2;
    const vw = window.innerWidth; const pad = 12;
    left = Math.max(pad, Math.min(vw - pad, left));
    setPos({ top, left });
  }

  useEffect(() => {
    function isInside(node, container) {
      if (!node || !container) return false;
      let n = node.nodeType === 3 ? node.parentElement : node;
      while (n) { if (n === container) return true; n = n.parentElement; }
      return false;
    }
    function onSelection() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return setVisible(false);
      const text = (sel.toString() || '').trim();
      if (!text || !/[A-Za-z]/.test(text)) return setVisible(false);
      const range = sel.getRangeAt(0);
      if (!isInside(range.startContainer, anchorEl)) return setVisible(false);
      const rect = computeRect(); if (!rect) return setVisible(false);
      place(rect);
      setTerm(text);
      setCategory(classifySelection(text));
      setMode('idle'); setRes(null); setErr('');
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

  useEffect(() => {
    function onScrollResize() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = computeRect();
        if (rect) place(rect);
      });
    }
    if (visible) {
      window.addEventListener('scroll', onScrollResize, { passive: true });
      window.addEventListener('resize', onScrollResize);
      window.addEventListener('orientationchange', onScrollResize);
      return () => {
        window.removeEventListener('scroll', onScrollResize);
        window.removeEventListener('resize', onScrollResize);
        window.removeEventListener('orientationchange', onScrollResize);
      };
    }
  }, [visible]);

  async function doMeaning() {
    setMode('meaning'); setLoading(true); setRes(null); setErr('');
    try { const out = await defineTerm(term); setRes(out); }
    catch (e) { setErr(e.message || 'Failed to get meaning.'); }
    finally { setLoading(false); }
  }
  async function doSimplify() {
    setMode('simplify'); setLoading(true); setRes(null); setErr('');
    try {
      const level = category === 'small' ? 'sentence' : 'paragraph';
      const out = await geminiSimplify(term, level);
      setRes(out);
    } catch (e) { setErr(e.message || 'Failed to simplify.'); }
    finally { setLoading(false); }
  }

  if (!visible) return null;

  return (
    <div className="fixed z-50" style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}>
      <div className="max-w-sm rounded-lg border bg-white shadow-xl">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-xs font-medium text-gray-700 truncate">
            {category === 'small' ? 'Meaning or simpler term' : 'Simpler term'}
          </div>
          <button type="button" className="p-1 text-gray-500 hover:text-gray-700" onClick={() => { setVisible(false); setRes(null); setErr(''); setMode('idle'); }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          {category === 'small' && (
            <button type="button" onClick={doMeaning} className="px-2.5 py-1.5 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
              Meaning
            </button>
          )}
          <button type="button" onClick={doSimplify} className="px-2.5 py-1.5 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50">
            Simplify
          </button>
          <div className="ml-auto text-[11px] text-gray-500">“{term.length > 26 ? term.slice(0, 26) + '…' : term}”</div>
        </div>
        <div className="px-3 pb-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Working…
            </div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : res ? (
            <div className="space-y-2 text-sm">
              {res.meaning ? <div className="text-gray-900">{res.meaning}</div> : null}
              {res.example ? <div className="text-gray-700"><span className="font-medium">Example:</span> {res.example}</div> : null}
              {res.simple ? <div className="text-gray-700"><span className="font-medium">Simpler:</span> {res.simple}</div> : null}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Choose an option above.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Lightweight modal container (no outside click to close) */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-6xl mx-4 bg-white border rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-4">{children}</div>
        <div className="px-4 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function StudentPreviewModal({ open, onClose, blog, loading, error }) {
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

  return (
    <Modal open={open} onClose={onClose} title="Student view (preview)">
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-600 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading preview…
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : !blog ? (
        <div className="text-gray-500">Not found.</div>
      ) : (
        <div className="mx-auto w-full">
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

          {/* Content area */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div ref={contentContainerRef} className="relative rounded-xl border bg-white p-5">
                {/* Anchored, scroll-aware tooltip */}
                <SelectionMeaningTooltip anchorEl={contentContainerRef.current} />
                <PreviewViewer content={blog.content} onHeadings={() => {}} />
              </div>
            </div>

            {/* Sidebar note */}
            <aside className="lg:col-span-4">
              <div className="sticky top-2 rounded-lg border bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-gray-900">Table of contents</div>
                <div className="text-xs text-gray-500">Headings appear inline in content preview.</div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </Modal>
  );
}