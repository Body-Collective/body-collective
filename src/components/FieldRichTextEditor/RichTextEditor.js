import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';

import { useIntl } from '../../util/reactIntl';
import { docToText, textToDoc } from '../../util/formattedText';

import css from './FieldRichTextEditor.module.css';

/**
 * Refuses edits that take the stored text (marks included) over the maximum length. Edits that
 * keep it as long or make it shorter always go through, so a full text is never stuck.
 */
const maxLengthExtension = maxLength =>
  Extension.create({
    name: 'maxTextLength',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          filterTransaction: (transaction, state) => {
            if (!transaction.docChanged) {
              return true;
            }
            const next = docToText(transaction.doc.toJSON()).length;
            return next <= maxLength || next <= docToText(state.doc.toJSON()).length;
          },
        }),
      ];
    },
  });

// Toolbar icons (16px)
const Icon = ({ children }) => (
  <svg
    className={css.toolIcon}
    viewBox="0 0 16 16"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const ICONS = {
  bold: (
    <Icon>
      <path d="M4.5 2.75h4.25a2.6 2.6 0 0 1 0 5.2H4.5zM4.5 7.95h5a2.65 2.65 0 0 1 0 5.3h-5z" />
    </Icon>
  ),
  italic: (
    <Icon>
      <path d="M10 2.75 6 13.25M6.5 2.75h6M3.5 13.25h6" />
    </Icon>
  ),
  underline: (
    <Icon>
      <path d="M4.25 2.5v5a3.75 3.75 0 0 0 7.5 0v-5M3.25 14h9.5" />
    </Icon>
  ),
  bulletList: (
    <Icon>
      <path d="M6.5 4h7M6.5 8h7M6.5 12h7" />
      <circle cx="3" cy="4" r="1" className={css.toolIconDot} />
      <circle cx="3" cy="8" r="1" className={css.toolIconDot} />
      <circle cx="3" cy="12" r="1" className={css.toolIconDot} />
    </Icon>
  ),
  orderedList: (
    <Icon>
      <path d="M6.5 4h7M6.5 8h7M6.5 12h7M2.5 3l1-.5v3M2.5 9.5h1.75L2.5 11.5h1.75" />
    </Icon>
  ),
  divider: (
    <Icon>
      <path d="M2 8h12M4.5 4.5h7M4.5 11.5h7" opacity=".45" />
      <path d="M2 8h12" />
    </Icon>
  ),
  undo: (
    <Icon>
      <path d="M5.5 3 2.5 6l3 3M2.75 6h7a3.75 3.75 0 0 1 0 7.5H7" />
    </Icon>
  ),
  redo: (
    <Icon>
      <path d="m10.5 3 3 3-3 3M13.25 6h-7a3.75 3.75 0 0 0 0 7.5H9" />
    </Icon>
  ),
};

const ToolButton = props => {
  const { label, hint, active = false, disabled = false, onClick, icon } = props;
  return (
    <button
      type="button"
      className={classNames(css.toolButton, { [css.toolButtonActive]: active })}
      aria-label={label}
      aria-pressed={active}
      title={`${label} (${hint})`}
      disabled={disabled}
      // The toolbar must not take the focus, or the selection to format is lost
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
    >
      {ICONS[icon]}
    </button>
  );
};

/**
 * Rich text editor (Tiptap) for the formatted texts of listings: bold, italic, underline,
 * bullet and numbered lists, with the usual shortcuts (⌘B, ⌘I, ⌘U, ⌘⇧8, ⌘⇧7). The text is stored
 * as plain text with marks (see util/formattedText.js).
 *
 * The value seeds the document; afterwards the editor owns the text, so that the form echoing
 * onChange back doesn't move the cursor. A different value from outside (e.g. the form is
 * initialized again) replaces the document.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id Id of the editable element
 * @param {string} props.value The stored text
 * @param {Function} props.onChange Called with the stored text
 * @param {Function} [props.onFocus]
 * @param {Function} [props.onBlur]
 * @param {string} [props.placeholder]
 * @param {number} props.maxLength Maximum length of the stored text
 * @param {boolean} [props.invalid] Whether to show the error style
 * @param {string} [props.labelledBy] Id of the label
 * @param {string} [props.describedBy] Id of the help text
 * @returns {JSX.Element}
 */
const RichTextEditor = props => {
  const {
    id,
    value,
    onChange,
    onFocus,
    onBlur,
    placeholder,
    maxLength,
    invalid = false,
    labelledBy,
    describedBy,
  } = props;
  const intl = useIntl();
  const seed = useRef(value || '');
  const [isEmpty, setIsEmpty] = useState(!(value || '').trim());
  // The latest callbacks, without recreating the editor
  const callbacks = useRef({ onChange, onFocus, onBlur });
  callbacks.current = { onChange, onFocus, onBlur };

  const attributes = () => ({
    id,
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-invalid': `${invalid}`,
    ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    class: css.editable,
  });

  const editor = useEditor({
    // The page may render on the server; the editor mounts in the browser
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: { HTMLAttributes: { class: css.divider } },
        strike: false,
        link: false,
        paragraph: { HTMLAttributes: { class: css.paragraph } },
        bulletList: { HTMLAttributes: { class: css.list } },
        orderedList: { HTMLAttributes: { class: css.orderedList } },
        listItem: { HTMLAttributes: { class: css.listItem } },
      }),
      maxLengthExtension(maxLength),
    ],
    content: textToDoc(seed.current),
    editorProps: { attributes: attributes() },
    onFocus: () => callbacks.current.onFocus?.(),
    onBlur: () => callbacks.current.onBlur?.(),
    onUpdate: ({ editor: instance }) => {
      setIsEmpty(instance.isEmpty);
      const text = docToText(instance.getJSON());
      seed.current = text;
      callbacks.current.onChange(text);
    },
  });

  // A value from outside (not typed here) replaces the document
  useEffect(() => {
    const next = value || '';
    if (!editor || seed.current === next) {
      return;
    }
    seed.current = next;
    if (docToText(editor.getJSON()) !== next) {
      editor.commands.setContent(textToDoc(next), { emitUpdate: false });
    }
    setIsEmpty(editor.isEmpty);
  }, [editor, value]);

  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes: attributes() } });
  }, [editor, invalid]);

  // The toolbar lights up for the formatting at the cursor
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      instance
        ? {
            bold: instance.isActive('bold'),
            italic: instance.isActive('italic'),
            underline: instance.isActive('underline'),
            bulletList: instance.isActive('bulletList'),
            orderedList: instance.isActive('orderedList'),
            canUndo: instance.can().undo(),
            canRedo: instance.can().redo(),
          }
        : {},
  });

  const label = key => intl.formatMessage({ id: `FieldRichTextEditor.${key}` });
  const run = command => () =>
    editor
      ?.chain()
      .focus()
      [command]()
      .run();

  return (
    <div className={classNames(css.editor, { [css.editorInvalid]: invalid })}>
      <div className={css.toolbar} role="toolbar" aria-label={label('toolbar')} aria-controls={id}>
        <ToolButton
          icon="bold"
          label={label('bold')}
          hint="⌘B"
          active={state?.bold}
          onClick={run('toggleBold')}
        />
        <ToolButton
          icon="italic"
          label={label('italic')}
          hint="⌘I"
          active={state?.italic}
          onClick={run('toggleItalic')}
        />
        <ToolButton
          icon="underline"
          label={label('underline')}
          hint="⌘U"
          active={state?.underline}
          onClick={run('toggleUnderline')}
        />
        <span className={css.toolDivider} aria-hidden="true" />
        <ToolButton
          icon="bulletList"
          label={label('bulletList')}
          hint="⌘⇧8"
          active={state?.bulletList}
          onClick={run('toggleBulletList')}
        />
        <ToolButton
          icon="orderedList"
          label={label('orderedList')}
          hint="⌘⇧7"
          active={state?.orderedList}
          onClick={run('toggleOrderedList')}
        />
        <ToolButton
          icon="divider"
          label={label('divider')}
          hint="---"
          onClick={run('setHorizontalRule')}
        />
        <span className={css.toolDivider} aria-hidden="true" />
        <ToolButton
          icon="undo"
          label={label('undo')}
          hint="⌘Z"
          disabled={!state?.canUndo}
          onClick={run('undo')}
        />
        <ToolButton
          icon="redo"
          label={label('redo')}
          hint="⌘⇧Z"
          disabled={!state?.canRedo}
          onClick={run('redo')}
        />
      </div>
      <div
        className={css.content}
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .run()
        }
      >
        {isEmpty && placeholder ? (
          <p className={css.placeholder} aria-hidden="true">
            {placeholder}
          </p>
        ) : null}
        <EditorContent editor={editor} className={css.editorContent} />
      </div>
    </div>
  );
};

export default RichTextEditor;
