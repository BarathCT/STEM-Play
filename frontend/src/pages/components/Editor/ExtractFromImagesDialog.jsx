import React, { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
      <div
        className="relative bg-white border rounded-lg w-full max-w-2xl mx-4 shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 mt-4">{footer}</div>}
      </div>
    </div>
  );
}

async function fileToBase64(file) {
  const b64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result || '').toString().split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return { mimeType: file.type || 'image/png', data: b64, name: file.name };
}

async function geminiExtractFromImages(files, onProgress) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY');
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const results = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.({ current: i + 1, total: files.length, file: files[i].name });
    const inline = await fileToBase64(files[i]);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Extract educational content and return ONLY JSON:
{
  "title": "5-10 words",
  "subject": "one or two words if obvious, else empty",
  "summary": "1-2 sentence summary",
  "content": "body text; use - bullets for lists; preserve headings as lines"
}`,
              },
              { inlineData: { mimeType: inline.mimeType, data: inline.data } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const j = await resp.json().catch(() => null);
      throw new Error(j?.error?.message || `Gemini HTTP ${resp.status}`);
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let obj = null;
    try {
      obj = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      obj = match ? JSON.parse(match[0]) : { title: 'Untitled', subject: '', summary: '', content: text };
    }
    results.push({ file: files[i].name, ...obj });
  }
  return results;
}

function textToNodes({ heading, body }) {
  const nodes = [];
  if (heading) nodes.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] });
  if (body) {
    const lines = body.split(/\r?\n/);
    let listBuffer = [];
    for (const line of lines) {
      if (/^\s*-\s+/.test(line)) {
        listBuffer.push(line.replace(/^\s*-\s+/, ''));
      } else {
        if (listBuffer.length) {
          nodes.push({
            type: 'bulletList',
            content: listBuffer.map(t => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] })),
          });
          listBuffer = [];
        }
        const trimmed = line.trim();
        nodes.push(trimmed ? { type: 'paragraph', content: [{ type: 'text', text: trimmed }] } : { type: 'paragraph' });
      }
    }
    if (listBuffer.length) {
      nodes.push({
        type: 'bulletList',
        content: listBuffer.map(t => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] })),
      });
    }
  }
  return nodes;
}

export default function ExtractFromImagesDialog({ open, onClose, onApply }) {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function runExtract() {
    setError('');
    if (!files.length) { setError('Please select at least one image.'); return; }
    try {
      setBusy(true);
      const results = await geminiExtractFromImages(files, setProgress);
      const first = results.find(r => (r.title?.trim() || r.subject?.trim() || r.summary?.trim())) || results[0];
      const title = first?.title?.trim() || '';
      const subject = first?.subject?.trim() || '';
      const summary = first?.summary?.trim() || '';
      const nodes = [];
      for (const r of results) {
        const sectionTitle = r.title?.trim() || r.file;
        nodes.push(...textToNodes({ heading: sectionTitle, body: r.content || '' }));
      }
      onApply?.({ title, subject, summary, nodes });
      onClose?.();
    } catch (e) {
      setError(e.message || 'Extraction failed.');
    } finally {
      setBusy(false);
      setProgress({ current: 0, total: 0, file: '' });
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Extract from images"
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
          <button onClick={runExtract} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{busy ? 'Extracting…' : 'Extract'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          Select one or more images. The AI will extract text and suggest a title/subject/summary.
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-gray-50 w-fit">
          <ImagePlus className="w-4 h-4" />
          Choose images
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        </label>
        {files.length > 0 && (
          <div className="text-xs text-gray-600">
            Selected: {files.length} file(s)
            <ul className="list-disc ml-5 mt-1">
              {files.map((f) => <li key={f.name}>{f.name}</li>)}
            </ul>
          </div>
        )}
        {progress.total > 0 && (
          <div className="text-xs text-gray-600">
            Processing {progress.current}/{progress.total} {progress.file && `• ${progress.file}`}
          </div>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </Modal>
  );
}