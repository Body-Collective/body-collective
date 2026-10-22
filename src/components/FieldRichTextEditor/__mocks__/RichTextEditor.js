import React from 'react';

/**
 * Test double of the rich text editor: jsdom can't run Tiptap's editable element, so tests type
 * into a textarea that takes and gives the stored text like the editor.
 *
 * @component
 * @returns {JSX.Element}
 */
const RichTextEditor = props => {
  const { id, value, onChange, onFocus, onBlur, placeholder, labelledBy, describedBy } = props;
  return (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      aria-labelledby={labelledBy || undefined}
      aria-describedby={describedBy || undefined}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
};

export default RichTextEditor;
