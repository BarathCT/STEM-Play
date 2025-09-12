import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CollapseView from './CollapseView';

const Collapse = Node.create({
  name: 'collapse',
  group: 'block',
  content: 'block+',
  draggable: false,
  defining: true,

  addAttributes() {
    return {
      summary: { default: 'More info' },
      open: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'details[data-collapse]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { summary, open } = HTMLAttributes;
    return [
      'details',
      { 'data-collapse': 'true', ...(open ? { open: '' } : {}) },
      ['summary', {}, summary || 'More info'],
      ['div', { class: 'details-content' }, 0],
    ];
  },

  addCommands() {
    return {
      insertCollapse:
        (attrs = {}) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { summary: 'More info', open: true, ...(attrs || {}) },
              content: [{ type: 'paragraph' }],
            })
            .run(),
      setCollapseAttrs:
        (attrs = {}) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollapseView);
  },
});

export default Collapse;