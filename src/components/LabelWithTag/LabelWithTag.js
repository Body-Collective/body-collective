import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';

import css from './LabelWithTag.module.css';

/**
 * Label of a form field with a tag that tells whether the field is required or optional.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.id] Id of the label (e.g. for aria-labelledby)
 * @param {string} [props.htmlFor] Id of the input
 * @param {React.ReactNode} props.label
 * @param {boolean} [props.isRequired] Shows "required" instead of "optional"
 * @param {string} [props.className] Add more style rules in addition to the root class
 * @returns {JSX.Element}
 */
const LabelWithTag = props => {
  const { id, htmlFor, label, isRequired = false, className } = props;
  const intl = useIntl();
  return (
    <label id={id} htmlFor={htmlFor} className={classNames(css.root, className)}>
      {label}{' '}
      <span className={css.tag} aria-hidden="true">
        {intl.formatMessage({
          id: isRequired ? 'LabelWithTag.required' : 'LabelWithTag.optional',
        })}
      </span>
    </label>
  );
};

/**
 * The content of a label with the tag, for fields that render the label element themselves
 * (e.g. FieldTextInput).
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.label
 * @param {boolean} [props.isRequired]
 * @returns {JSX.Element}
 */
export const LabelTextWithTag = props => {
  const { label, isRequired = false } = props;
  const intl = useIntl();
  return (
    <>
      {label}{' '}
      <span className={css.tag} aria-hidden="true">
        {intl.formatMessage({
          id: isRequired ? 'LabelWithTag.required' : 'LabelWithTag.optional',
        })}
      </span>
    </>
  );
};

export default LabelWithTag;
