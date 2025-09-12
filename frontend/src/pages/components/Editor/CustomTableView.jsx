import React, { useMemo, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Trash2, Eraser, ChevronDown, ChevronUp, PlusSquare, MinusSquare } from 'lucide-react';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function CustomTableView(props) {
  const { node, updateAttributes, editor, selected, getPos } = props;
  const { rows, cols, headerRows = 0, data = [] } = node.attrs || {};
  const editable = editor?.isEditable;

  const [panel, setPanel] = useState(false);

  const safeData = useMemo(() => {
    const d = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (data?.[r]?.[c] ?? '')),
    );
    return d;
  }, [rows, cols, data]);

  function setCell(r, c, value) {
    const next = safeData.map((row) => row.slice());
    next[r][c] = value;
    updateAttributes({ data: next });
  }

  function addRow(afterIndex = rows - 1) {
    const idx = clamp(afterIndex, -1, rows - 1);
    const next = safeData.map((row) => row.slice());
    next.splice(idx + 1, 0, Array.from({ length: cols }, () => ''));
    updateAttributes({ rows: rows + 1, data: next });
  }

  function deleteRow(at = rows - 1) {
    if (rows <= 1) return;
    const idx = clamp(at, 0, rows - 1);
    const next = safeData.map((row) => row.slice());
    next.splice(idx, 1);
    const nextHeader = headerRows ? clamp(1, 0, Math.min(1, rows - 1)) : 0;
    updateAttributes({ rows: rows - 1, data: next, headerRows: nextHeader });
  }

  function addColumn(afterIndex = cols - 1) {
    const idx = clamp(afterIndex, -1, cols - 1);
    const next = safeData.map((row) => {
      const copy = row.slice();
      copy.splice(idx + 1, 0, '');
      return copy;
    });
    updateAttributes({ cols: cols + 1, data: next });
  }

  function deleteColumn(at = cols - 1) {
    if (cols <= 1) return;
    const idx = clamp(at, 0, cols - 1);
    const next = safeData.map((row) => {
      const copy = row.slice();
      copy.splice(idx, 1);
      return copy;
    });
    updateAttributes({ cols: cols - 1, data: next });
  }

  function toggleHeader() {
    updateAttributes({ headerRows: headerRows ? 0 : 1 });
  }

  function clearTable() {
    const next = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
    updateAttributes({ data: next });
  }

  function deleteTable() {
    try {
      if (typeof getPos === 'function') {
        const from = getPos();
        const to = from + node.nodeSize;
        editor?.chain().focus().deleteRange({ from, to }).run();
      } else {
        editor?.chain().focus().deleteSelection().run();
      }
    } catch {
      editor?.chain().focus().deleteSelection().run();
    }
  }

  return (
    <NodeViewWrapper as="div" data-custom-table className="relative my-2">
      {editable && (
        <div className="absolute -top-11 left-0 z-10 flex flex-wrap items-center gap-2 bg-white border rounded px-2 py-1 shadow">
          <button type="button" onClick={() => addRow()} className="text-xs px-2 py-1 border rounded inline-flex items-center gap-1">
            <PlusSquare className="w-3.5 h-3.5" /> Row
          </button>
          <button type="button" onClick={() => deleteRow()} className="text-xs px-2 py-1 border rounded inline-flex items-center gap-1">
            <MinusSquare className="w-3.5 h-3.5" /> Row
          </button>
          <button type="button" onClick={() => addColumn()} className="text-xs px-2 py-1 border rounded inline-flex items-center gap-1">
            <PlusSquare className="w-3.5 h-3.5" /> Col
          </button>
          <button type="button" onClick={() => deleteColumn()} className="text-xs px-2 py-1 border rounded inline-flex items-center gap-1">
            <MinusSquare className="w-3.5 h-3.5" /> Col
          </button>
          <button type="button" onClick={toggleHeader} className="text-xs px-2 py-1 border rounded">
            {headerRows ? 'No header' : 'Header row'}
          </button>

          <button type="button" onClick={() => setPanel((s) => !s)} className="text-xs px-2 py-1 border rounded inline-flex items-center gap-1">
            {panel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} More
          </button>

          {panel && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded shadow p-2 flex gap-2">
              <button type="button" onClick={clearTable} className="text-xs px-2 py-1 border rounded inline-flex items-center gap-1">
                <Eraser className="w-3.5 h-3.5" /> Clear
              </button>
              <button type="button" onClick={deleteTable} className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 inline-flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Delete table
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`ring-1 ring-gray-200 rounded ${selected ? 'ring-2 ring-blue-400' : ''}`}>
        <table className="w-full border-collapse">
          {headerRows ? (
            <thead>
              <tr>
                {Array.from({ length: cols }, (_, c) => (
                  <th key={`h-${c}`} className="border border-gray-200 bg-gray-50 p-2 text-left text-sm">
                    {editable ? (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="outline-none"
                        onBlur={(e) => setCell(0, c, e.currentTarget.textContent || '')}
                        dangerouslySetInnerHTML={{ __html: (safeData?.[0]?.[c] || '').replace(/\n/g, '<br/>') }}
                      />
                    ) : (
                      safeData?.[0]?.[c] || ''
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {Array.from({ length: rows - (headerRows ? 1 : 0) }, (_, rr) => {
              const r = rr + (headerRows ? 1 : 0);
              return (
                <tr key={`r-${r}`}>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={`c-${r}-${c}`} className="border border-gray-200 p-2 align-top text-sm">
                      {editable ? (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className="outline-none"
                          onBlur={(e) => setCell(r, c, e.currentTarget.textContent || '')}
                          dangerouslySetInnerHTML={{ __html: (safeData?.[r]?.[c] || '').replace(/\n/g, '<br/>') }}
                        />
                      ) : (
                        safeData?.[r]?.[c] || ''
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </NodeViewWrapper>
  );
}