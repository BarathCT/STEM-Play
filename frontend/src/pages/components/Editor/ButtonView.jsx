import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Trash2, Link as LinkIcon, Type, ExternalLink, Settings } from 'lucide-react';

export default function ButtonView(props) {
  const { node, editor, selected, getPos, updateAttributes } = props;
  const { href = '#', label = 'Button', variant = 'primary', target = '_blank', rel = 'noopener noreferrer' } = node.attrs || {};
  const editable = editor?.isEditable;

  const [open, setOpen] = useState(false);
  const [tmp, setTmp] = useState({ label, href, variant, target, rel });

  function apply() {
    updateAttributes({ ...tmp });
    setOpen(false);
  }

  function onDelete() {
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

  const variants = [
    { id: 'primary', label: 'Primary' },
    { id: 'secondary', label: 'Secondary' },
    { id: 'success', label: 'Success' },
    { id: 'warning', label: 'Warning' },
    { id: 'danger', label: 'Danger' },
  ];

  return (
    <NodeViewWrapper as="span" data-button-wrapper className="relative inline-block">
      <a
        href={href || '#'}
        target={target || '_blank'}
        rel={rel || 'noopener noreferrer'}
        data-button="true"
        className={
          {
            primary: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700',
            secondary: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200',
            success: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700',
            warning: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700',
            danger: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700',
          }[variant] || 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600'
        }
        onClick={(e) => {
          // Let normal navigation happen in read-only mode.
          if (!editable) return;
          // In edit mode, don't navigate.
          e.preventDefault();
        }}
      >
        {label || 'Button'}
      </a>

      {editable && (
        <>
          <button
            type="button"
            className={`ml-1 inline-flex items-center rounded px-1.5 py-1 text-xs border ${selected ? 'border-blue-400' : 'border-gray-300'} bg-white hover:bg-gray-50 align-middle`}
            onClick={() => {
              setTmp({ label, href, variant, target, rel });
              setOpen((s) => !s);
            }}
            title="Button settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {open && (
            <div className="absolute z-10 mt-1 w-64 bg-white border rounded-md shadow-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-4 h-4 text-gray-500" />
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Label"
                  value={tmp.label}
                  onChange={(e) => setTmp((s) => ({ ...s, label: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="https://example.com"
                  value={tmp.href}
                  onChange={(e) => setTmp((s) => ({ ...s, href: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={tmp.variant}
                  onChange={(e) => setTmp((s) => ({ ...s, variant: e.target.value }))}
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <input
                  type="checkbox"
                  checked={tmp.target === '_blank'}
                  onChange={(e) =>
                    setTmp((s) => ({ ...s, target: e.target.checked ? '_blank' : '_self' }))
                  }
                />
                Open in new tab <ExternalLink className="w-3 h-3" />
              </label>

              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                    onClick={onDelete}
                    title="Delete button"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={apply}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}