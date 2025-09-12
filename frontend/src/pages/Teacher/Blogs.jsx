import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { authFetch } from '../../utils/auth';
import {
  Plus, Pencil, Trash2, BookOpenText,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List as ListIcon, ListOrdered, Link as LinkIcon,
  Undo2, Redo2, Heading1, Heading2, Heading3, X,
  ImagePlus, ChevronDown, Table as TableIcon, Eye
} from 'lucide-react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

// Custom nodes
import ButtonExt from '../components/Editor/Button';
import CustomTableExt from '../components/Editor/CustomTable';
import CollapseExt from '../components/Editor/Collapse';

// Extract dialog
import ExtractFromImagesDialog from '../components/Editor/ExtractFromImagesDialog';

// Student preview modal (student-perspective view)
import StudentPreviewModal from './StudentPreviewModal';

/* ---------- UI ---------- */
function ToolbarButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`px-2 py-1 rounded border text-sm ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
function Banner({ type = 'error', children, onClose }) {
  const styles = type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <div className={`flex items-start gap-2 border rounded p-2 text-sm ${styles}`}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ---------- Local Modal (reusable for small editor dialogs) ---------- */
function LocalModal({ open, title, onClose, children, footer, maxWidth = 'max-w-md', zIndex = 'z-[60]' }) {
  if (!open) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center`}>
      {/* Static backdrop (no outside click close) */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-xs backdrop-brightness-75 backdrop-saturate-150" />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-white border rounded-lg w-full ${maxWidth} mx-4 shadow-2xl`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
        {footer && <div className="px-4 py-3 border-t flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Editor ---------- */
function ColorPicker({ label, value, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm bg-white">
      <span>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function RichTextEditor({ value, onChange, onEditorReady }) {
  const valueRef = useRef(value);
  const [textColor, setTextColor] = useState('#111827');
  const [bgColor, setBgColor] = useState('#fde68a');

  // Table insert dialog state
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHeader, setTableHeader] = useState(true);
  const [tableErr, setTableErr] = useState('');

  // Link insert dialog state
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkErr, setLinkErr] = useState('');

  // Collapse insert dialog state
  const [collapseOpen, setCollapseOpen] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState('More info');

  // Build extensions once and de-duplicate by name
  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: 'Write your content here…' }),
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
    extensions,
    content: value || { type: 'doc', content: [{ type: 'paragraph' }] },
    autofocus: false,
    onUpdate({ editor }) {
      const json = editor.getJSON();
      valueRef.current = json;
      onChange?.(json);
    },
    onCreate({ editor }) {
      onEditorReady?.(editor);
    },
  });

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    const incoming = JSON.stringify(value || {});
    const current = JSON.stringify(valueRef.current || {});
    if (incoming !== current) {
      editor.commands.setContent(value || { type: 'doc', content: [{ type: 'paragraph' }] }, false);
      valueRef.current = value;
    }
  }, [value, editor]);

  if (!editor) return <div className="border rounded p-3 text-sm text-gray-500">Loading editor…</div>;

  const can = editor.can();
  const chain = () => editor.chain().focus();

  // Open link dialog (prefill label from selection if present)
  const openLinkDialog = () => {
    try {
      const { from, to } = editor.state.selection || {};
      const selectedText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
      setLinkLabel(selectedText || '');
    } catch {
      setLinkLabel('');
    }
    setLinkUrl('https://');
    setLinkErr('');
    setLinkOpen(true);
  };

  // Open table dialog
  const openTableDialog = () => {
    setTableRows(3);
    setTableCols(3);
    setTableHeader(true);
    setTableErr('');
    setTableOpen(true);
  };

  // Open collapse dialog
  const openCollapseDialog = () => {
    setCollapseSummary('More info');
    setCollapseOpen(true);
  };

  function normalizeHref(raw) {
    const t = (raw || '').trim();
    if (!t) return '';
    if (/^(https?:|mailto:|tel:|\/)/i.test(t)) return t;
    return `https://${t}`;
  }

  function handleInsertLink() {
    const href = normalizeHref(linkUrl);
    if (!href) {
      setLinkErr('Please enter a valid URL.');
      return;
    }
    const label = (linkLabel || '').trim();
    const { from, to } = editor.state.selection;
    const linkAttrs = { href, target: '_blank', rel: 'noopener noreferrer' };

    if (from !== to) {
      const selectedText = editor.state.doc.textBetween(from, to, ' ');
      const text = label || selectedText || href;
      editor.chain().focus().insertContent({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: linkAttrs }],
      }).run();
    } else {
      const text = label || href;
      editor.chain().focus().insertContent({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: linkAttrs }],
      }).run();
    }
    setLinkOpen(false);
  }

  function handleInsertTable() {
    const r = Math.trunc(Number(tableRows));
    const c = Math.trunc(Number(tableCols));
    const valid =
      Number.isFinite(r) && Number.isFinite(c) &&
      r >= 1 && r <= 30 && c >= 1 && c <= 30;
    if (!valid) {
      setTableErr('Rows and Columns must be whole numbers between 1 and 30.');
      return;
    }
    editor.chain().focus().insertCustomTable({
      rows: r,
      cols: c,
      headerRows: tableHeader ? 1 : 0,
    }).run();
    setTableOpen(false);
  }

  function handleInsertCollapse() {
    const summary = (collapseSummary || '').trim() || 'More info';
    editor.chain().focus().insertCollapse({ summary }).run();
    setCollapseOpen(false);
  }

  return (
    <div className="border rounded-lg">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
        <ToolbarButton title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <ToolbarButton title="Bulleted list" active={editor.isActive('bulletList')} disabled={!can.chain().focus().toggleBulletList().run()} onClick={() => chain().toggleBulletList().run()}><ListIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} disabled={!can.chain().focus().toggleOrderedList().run()} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <ColorPicker label="A" value={textColor} onChange={(v) => { setTextColor(v); chain().setColor(v).run(); }} />
        <ColorPicker label="Bg" value={bgColor} onChange={(v) => { setBgColor(v); chain().toggleHighlight({ color: v }).run(); }} />
        <ToolbarButton title="Clear color" onClick={() => chain().unsetColor().run()}>A-</ToolbarButton>
        <ToolbarButton title="Clear highlight" onClick={() => chain().unsetHighlight().run()}>Bg-</ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Open small editor dialogs */}
        <ToolbarButton title="Insert link" onClick={openLinkDialog}><LinkIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Insert table" onClick={openTableDialog}><TableIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Insert collapsible" onClick={openCollapseDialog}><ChevronDown className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></ToolbarButton>
      </div>

      <div className="p-3">
        <EditorContent
          editor={editor}
          className="tiptap"
          ref={(el) => { if (el) el.__tiptapEditor = editor; }}
        />
      </div>

      {/* Link Insert Modal */}
      <LocalModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Insert Link"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="text-sm text-gray-700">URL</span>
              <input
                type="url"
                inputMode="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Text to display (optional)</span>
              <input
                type="text"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="If empty, use selected text or URL"
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              />
            </label>
          </div>
          {linkErr && <div className="text-sm text-red-600">{linkErr}</div>}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setLinkOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleInsertLink} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Insert</button>
          </div>
        </div>
      </LocalModal>

      {/* Table Insert Modal */}
      <LocalModal
        open={tableOpen}
        onClose={() => setTableOpen(false)}
        title="Insert Table"
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Choose table size. You can add or remove rows/columns and toggle header later from the table controls.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-700">Rows</span>
              <input
                type="number"
                min={1}
                max={30}
                value={tableRows}
                onChange={(e) => setTableRows(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
                placeholder="3"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Columns</span>
              <input
                type="number"
                min={1}
                max={30}
                value={tableCols}
                onChange={(e) => setTableCols(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
                placeholder="3"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={tableHeader}
              onChange={(e) => setTableHeader(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Include header row</span>
          </label>

          {tableErr && <div className="text-sm text-red-600">{tableErr}</div>}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTableOpen(false)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsertTable}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Insert
            </button>
          </div>
        </div>
      </LocalModal>

      {/* Collapse Insert Modal */}
      <LocalModal
        open={collapseOpen}
        onClose={() => setCollapseOpen(false)}
        title="Insert Collapsible"
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-700">Summary (dropdown title)</span>
            <input
              type="text"
              value={collapseSummary}
              onChange={(e) => setCollapseSummary(e.target.value)}
              placeholder="More info"
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            />
          </label>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setCollapseOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleInsertCollapse} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Insert</button>
          </div>
        </div>
      </LocalModal>
    </div>
  );
}

/* ---------- Page (blogs) ---------- */
export default function TeacherBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  // Main Create/Edit dialog + extract
  const [open, setOpen] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [published, setPublished] = useState(true);
  const [content, setContent] = useState({ type: 'doc', content: [{ type: 'paragraph' }] });

  // Student preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlog, setPreviewBlog] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState('');

  const editorRef = useRef(null);
  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const qs = new URLSearchParams();
      if (filterSubject) qs.set('subject', filterSubject);
      const res = await authFetch(`/teacher/blogs${qs.toString() ? `?${qs}` : ''}`);
      setBlogs(res.blogs || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterSubject]);

  const subjects = useMemo(() => Array.from(new Set(blogs.map(b => b.subject))).sort(), [blogs]);

  function openCreate() {
    setEditing(null);
    setSubject('');
    setTitle('');
    setSummary('');
    setPublished(true);
    setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
    setOpen(true);
  }
  async function openEdit(b) {
    setErr('');
    try {
      const { blog } = await authFetch(`/teacher/blogs/${b.id}`);
      setEditing(b);
      setSubject(blog.subject || '');
      setTitle(blog.title || '');
      setSummary(blog.summary || '');
      setPublished(!!blog.published);
      setContent(blog.content || { type: 'doc', content: [{ type: 'paragraph' }] });
      setOpen(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function openPreview(b) {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewErr('');
    setPreviewBlog(null);
    try {
      const { blog } = await authFetch(`/teacher/blogs/${b.id}`);
      setPreviewBlog(blog || null);
    } catch (e) {
      setPreviewErr(e.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setErr('');
    setOk('');
    try {
      const payload = { subject, title, summary, content, published };
      if (!subject.trim() || !title.trim()) {
        setErr('Subject and Title are required.');
        return;
      }
      if (editing) {
        await authFetch(`/teacher/blogs/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setOk('Blog updated.');
      } else {
        await authFetch(`/teacher/blogs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setOk('Blog created.');
      }
      setOpen(false);
      await load();
      setTimeout(() => setOk(''), 1500);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function remove(b) {
    const yes = confirm(`Delete blog "${b.title}"?`);
    if (!yes) return;
    try {
      await authFetch(`/teacher/blogs/${b.id}`, { method: 'DELETE' });
      await load();
      setOk('Blog deleted.');
      setTimeout(() => setOk(''), 1500);
    } catch (e) {
      setErr(e.message);
    }
  }

  // Apply extracted data into fields and content
  const onApplyExtract = useCallback(({ title: t, subject: s, summary: sm, nodes }) => {
    if (!title.trim() && t) setTitle(t);
    if (!subject.trim() && s) setSubject(s);
    if (!summary.trim() && sm) setSummary(sm);
    const base = content?.content ? [...content.content] : [{ type: 'paragraph' }];
    const next = { type: 'doc', content: [...base, ...nodes] };
    setContent(next);
  }, [content, subject, summary, title]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Blogs</h1>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Blog
        </button>
      </div>

      {err && <div className="mb-3"><Banner onClose={() => setErr('')}>{err}</Banner></div>}
      {ok && <div className="mb-3"><Banner type="ok" onClose={() => setOk('')}>{ok}</Banner></div>}

      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="text-sm text-gray-700 flex items-center gap-2">
            <BookOpenText className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Filter by subject</span>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">All</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : blogs.length === 0 ? (
          <div className="text-gray-500 text-sm">No blogs yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {blogs.map((b) => (
              <div key={b.id} className="border rounded-lg p-3 bg-white relative">
                {/* Student view (preview) pill in top-right corner */}
                <button
                  onClick={() => openPreview(b)}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  title="Preview student view"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>

                <div className="text-xs text-gray-500 mb-1">{b.subject}</div>
                <div className="text-base font-semibold text-gray-900">{b.title}</div>
                <div className="text-sm text-gray-600 line-clamp-3 mt-1">{b.summary || ''}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${b.published ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                    {b.published ? 'Published' : 'Draft'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b)} className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"><Pencil className="w-3 h-3" />Edit</button>
                    <button onClick={() => remove(b)} className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs"><Trash2 className="w-3 h-3" />Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal — NO outside-click to close; close via X or buttons */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-white border rounded-lg w-full max-w-5xl mx-4 shadow-2xl p-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Blog' : 'New Blog'}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={save} className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Science" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Blog title" required />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                  Published
                </label>

                {/* Only keep image extraction here */}
                <button type="button" onClick={() => setExtractOpen(true)} className="ml-auto inline-flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50 text-sm">
                  <ImagePlus className="w-4 h-4" />
                  Extract from images
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short summary (optional)" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <RichTextEditor value={content} onChange={setContent} onEditorReady={handleEditorReady} />
              </div>

              {err && <Banner onClose={() => setErr('')}>{err}</Banner>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{editing ? 'Save changes' : 'Create blog'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Preview Modal */}
      <StudentPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        blog={previewBlog}
        loading={previewLoading}
        error={previewErr}
      />

      {/* Dialogs */}
      <ExtractFromImagesDialog open={extractOpen} onClose={() => setExtractOpen(false)} onApply={onApplyExtract} />
    </div>
  );
}