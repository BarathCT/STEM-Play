import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Trash2 } from 'lucide-react';

export default function CollapseView(props) {
  const { node, editor, updateAttributes, getPos } = props;
  const { summary = 'More info', open = true } = node.attrs || {};
  const editable = editor?.isEditable;

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

  return (
    <NodeViewWrapper as="div" data-collapse className="my-2">
      <details open={open} className="border rounded-lg p-2">
        <summary className="font-semibold cursor-pointer">
          {editable ? (
            <input
              className="inline-block border rounded px-2 py-1 text-sm"
              value={summary}
              onChange={(e) => updateAttributes({ summary: e.target.value })}
              onBlur={(e) => updateAttributes({ summary: e.target.value.trim() || 'More info' })}
            />
          ) : (
            summary
          )}
        </summary>
        <div className="details-content mt-2">
          <NodeViewContent as="div" />
        </div>
      </details>
      {editable && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={!!open}
              onChange={(e) => updateAttributes({ open: e.target.checked })}
            />
            Open by default
          </label>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 border rounded text-red-600 hover:bg-red-50"
            onClick={onDelete}
            title="Delete collapse block"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}