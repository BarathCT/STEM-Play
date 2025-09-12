import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ButtonView from './ButtonView';

const VARIANT_CLASSES = {
  primary: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700',
  secondary: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200',
  success: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700',
  warning: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700',
  danger: 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700',
};

const Button = Node.create({
  name: 'button',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      href: { default: '', parseHTML: el => el.getAttribute('href') || '' },
      label: { default: 'Button', parseHTML: el => el.textContent || 'Button' },
      variant: { default: 'primary' },
      target: { default: '_blank' },
      rel: { default: 'noopener noreferrer' },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-button]' }];
  },

  // Rendered HTML for read-only contexts
  renderHTML({ HTMLAttributes }) {
    const { label, variant, ...rest } = HTMLAttributes;
    return [
      'a',
      mergeAttributes(rest, {
        'data-button': 'true',
        class: VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
      }),
      label || 'Button',
    ];
  },

  addCommands() {
    return {
      insertButton:
        attrs =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                href: '#',
                label: 'Button',
                variant: 'primary',
                target: '_blank',
                rel: 'noopener noreferrer',
                ...(attrs || {}),
              },
            })
            .run(),
      updateButton:
        attrs =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonView);
  },
});

export default Button;