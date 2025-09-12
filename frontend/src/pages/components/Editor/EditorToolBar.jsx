import React, { useState } from 'react';
import { List, ListOrdered, CheckSquare, Table, Smile, SquarePlus, Trash2, Link as LinkIcon } from 'lucide-react';

const EMOJIS = ['😀','😁','😂','🤣','😊','😍','🤩','😎','🤓','🙌','👏','🔥','⭐','✅','❗','⚠️','❤️','🚀','🌟','📚','🧠'];

export default function EditorToolbar({ editor }) {
  const [showEmoji, setShowEmoji] = useState(false);

  if (!editor) return null;

  function insertButton() {
    const label = prompt('Button label', 'Read more');
    if (label === null) return;
    const href = prompt('Button link (URL)', 'https://example.com');
    if (href === null) return;
    editor.chain().focus().insertContent({
      type: 'button',
      attrs: { label: label.trim() || 'Button', href: href.trim() || '#', variant: 'primary', target: '_blank', rel: 'noopener noreferrer' },
    }).run();
  }

  function insertTable() {
    const r = Math.max(1, parseInt(prompt('Rows', '3') || '3', 10));
    const c = Math.max(1, parseInt(prompt('Columns', '3') || '3', 10));
    const header = window.confirm('Include header row?');
    editor.chain().focus().insertCustomTable({ rows: r, cols: c, headerRows: header ? 1 : 0 }).run();
  }

  function deleteSelection() {
    // Delete current selection or the selected node (like table/button/collapse)
    editor.chain().focus().deleteSelection().run();
  }

  return (
    <div className="flex flex-wrap gap-2 border rounded-md px-2 py-1 bg-white">
      <button
        type="button"
        className={`px-2 py-1 text-sm rounded border ${editor.isActive('bulletList') ? 'bg-gray-100' : ''}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="w-4 h-4 inline-block mr-1" />
        Bullets
      </button>
      <button
        type="button"
        className={`px-2 py-1 text-sm rounded border ${editor.isActive('orderedList') ? 'bg-gray-100' : ''}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="w-4 h-4 inline-block mr-1" />
        Numbered
      </button>
      <button
        type="button"
        className={`px-2 py-1 text-sm rounded border ${editor.isActive('taskList') ? 'bg-gray-100' : ''}`}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list"
      >
        <CheckSquare className="w-4 h-4 inline-block mr-1" />
        Tasks
      </button>

      <div className="relative">
        <button
          type="button"
          className="px-2 py-1 text-sm rounded border"
          onClick={() => setShowEmoji((s) => !s)}
          title="Insert emoji"
        >
          <Smile className="w-4 h-4 inline-block mr-1" />
          Emoji
        </button>
        {showEmoji && (
          <div className="absolute z-10 mt-1 bg-white border rounded shadow p-2 grid grid-cols-8 gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="px-1 py-0.5 text-base hover:bg-gray-50 rounded"
                onClick={() => {
                  editor.chain().focus().insertContent(e).run();
                  setShowEmoji(false);
                }}
                aria-label={`Insert ${e}`}
                title={e}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="px-2 py-1 text-sm rounded border"
        onClick={insertButton}
        title="Insert button"
      >
        <SquarePlus className="w-4 h-4 inline-block mr-1" />
        Button
      </button>

      <button
        type="button"
        className="px-2 py-1 text-sm rounded border"
        onClick={insertTable}
        title="Insert table"
      >
        <Table className="w-4 h-4 inline-block mr-1" />
        Table
      </button>

      <button
        type="button"
        className="px-2 py-1 text-sm rounded border text-red-600 hover:bg-red-50"
        onClick={deleteSelection}
        title="Delete selection/node"
      >
        <Trash2 className="w-4 h-4 inline-block mr-1" />
        Delete
      </button>

      <a
        href="https://tiptap.dev/api/extensions/task-list"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <LinkIcon className="w-3 h-3" />
        Lists help
      </a>
    </div>
  );
}