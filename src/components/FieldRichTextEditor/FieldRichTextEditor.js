import React from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import { HelpText, LabelWithTag, ValidationError } from '../../components';

import RichTextEditor from './RichTextEditor';
import css from './FieldRichTextEditor.module.css';

const DEFAULT_MAX_LENGTH = 5000;

const FieldRichTextEditorComponent = props => {
  const {
    rootClassName,
    className,
    id,
    label,
    isRequired,
    helpText,
    placeholder,
    maxLength = DEFAULT_MAX_LENGTH,
    input,
    meta,
  } = props;
  const { touched, invalid, error } = meta;
  const hasError = !!(touched && invalid && error);
  const labelId = `${id}-label`;
  const helpTextId = helpText ? `${id}-help` : null;

  return (
    <div className={classNames(rootClassName || css.root, className)}>
      {label ? <LabelWithTag id={labelId} label={label} isRequired={isRequired} /> : null}
      <RichTextEditor
        id={id}
        value={input.value || ''}
        onChange={input.onChange}
        onFocus={input.onFocus}
        onBlur={input.onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        invalid={hasError}
        labelledBy={label ? labelId : null}
        describedBy={helpTextId}
      />
      {helpText ? (
        <div id={helpTextId}>
          <HelpText helpText={helpText} />
        </div>
      ) : null}
      <ValidationError fieldMeta={meta} />
    </div>
  );
};

/**
 * Final Form field with a rich text editor (bold, italic, underline, lists) for the formatted
 * texts of listings. The value is the text with marks (see util/formattedText.js). Heavy (Tiptap):
 * exported as a loadable component in components/index.js.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.name Name of the field in Final Form
 * @param {React.ReactNode} [props.label]
 * @param {boolean} [props.isRequired] Shows the "required" tag instead of "optional"
 * @param {string} [props.helpText] Shown below the editor
 * @param {string} [props.placeholder]
 * @param {number} [props.maxLength] Maximum length of the stored text (default 5000)
 * @param {Function} [props.validate]
 * @returns {JSX.Element}
 */
const FieldRichTextEditor = props => <Field component={FieldRichTextEditorComponent} {...props} />;

export default FieldRichTextEditor;
