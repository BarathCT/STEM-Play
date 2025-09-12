import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CustomTableView from './CustomTableView';

function makeEmptyMatrix(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

const CustomTable = Node.create({
  name: 'customTable',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      rows: { default: 3 },
      cols: { default: 3 },
      headerRows: { default: 1 }, // 0 or 1
      data: { default: makeEmptyMatrix(3, 3) }, // 2D array of strings
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-custom-table]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { rows, cols, headerRows = 0, data = [] } = HTMLAttributes;
    const header = [];
    if (headerRows > 0) {
      const headerCells = [];
      for (let c = 0; c < cols; c++) {
        const text = data?.[0]?.[c] || '';
        headerCells.push(['th', { class: 'border border-gray-200 bg-gray-50 p-2 text-left text-sm' }, text]);
      }
      header.push(['tr', {}, ...headerCells]);
    }

    const body = [];
    for (let r = headerRows; r < rows; r++) {
      const rowCells = [];
      for (let c = 0; c < cols; c++) {
        const text = data?.[r]?.[c] || '';
        rowCells.push(['td', { class: 'border border-gray-200 p-2 align-top text-sm' }, text]);
      }
      body.push(['tr', {}, ...rowCells]);
    }

    return [
      'div',
      { 'data-custom-table': 'true', class: 'w-full' },
      ['table', { class: 'w-full border-collapse' },
        header.length ? ['thead', {}, ...header] : null,
        ['tbody', {}, ...body],
      ],
    ];
  },

  addCommands() {
    return {
      insertCustomTable:
        ({ rows = 3, cols = 3, headerRows = 1 } = {}) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                rows,
                cols,
                headerRows: headerRows ? 1 : 0,
                data: makeEmptyMatrix(rows, cols),
              },
            })
            .run(),
      updateCustomTable:
        (attrs = {}) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CustomTableView);
  },
});

export default CustomTable;