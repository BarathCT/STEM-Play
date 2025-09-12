import { Node } from '@tiptap/core';

const Details = Node.create({
  name: 'details',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      summary: { default: 'More info' },
      open: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'details',
        getAttrs: el => {
          const summary = el.querySelector('summary')?.textContent || 'More info';
          const open = el.hasAttribute('open');
          return { summary, open };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { summary, open } = HTMLAttributes;
    return [
      'details',
      open ? { open: '' } : {},
      ['summary', {}, summary || 'More info'],
      ['div', { class: 'details-content' }, 0],
    ];
  },

  addCommands() {
    return {
      insertDetails:
        attrs =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { summary: 'More info', open: true, ...(attrs || {}) },
              content: [{ type: 'paragraph' }],
            })
            .run(),
      setDetailsAttrs:
        attrs =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});

export default Details;