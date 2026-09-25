import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import * as validators from '../../../../util/validators';

import { Form, FieldTextInput } from '../../../../components';

import css from './NewsletterForm.module.css';

/**
 * Newsletter sign-up form shown in the footer.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.formId unique id for the form and its input
 * @param {Function?} props.onSubmit called with { email } when the form is submitted
 * @returns {JSX.Element} newsletter form
 */
const NewsletterForm = props => {
  const { className, rootClassName, formId, onSubmit } = props;
  const intl = useIntl();
  const classes = classNames(rootClassName || css.root, className);

  const emailLabel = intl.formatMessage({ id: 'SectionFooter.newsletterEmailLabel' });
  const emailPlaceholder = intl.formatMessage({ id: 'SectionFooter.newsletterEmailPlaceholder' });
  const emailRequired = validators.required(
    intl.formatMessage({ id: 'SectionFooter.newsletterEmailRequired' })
  );
  const emailValid = validators.emailFormatValid(
    intl.formatMessage({ id: 'SectionFooter.newsletterEmailInvalid' })
  );

  const handleSubmit = (values, form) => {
    if (onSubmit) {
      onSubmit(values);
    }
    setTimeout(form.reset);
  };

  return (
    <FinalForm
      onSubmit={handleSubmit}
      render={formRenderProps => {
        const { handleSubmit, submitting } = formRenderProps;
        return (
          <div className={classes}>
            <h3 className={css.title}>
              <FormattedMessage id="SectionFooter.newsletterTitle" />
            </h3>
            <p className={css.intro}>
              <FormattedMessage id="SectionFooter.newsletterIntro" />
            </p>
            <Form className={css.form} onSubmit={handleSubmit}>
              <label className={css.srOnly} htmlFor={`${formId}.email`}>
                {emailLabel}
              </label>
              <FieldTextInput
                className={css.field}
                inputRootClass={css.input}
                type="email"
                id={`${formId}.email`}
                name="email"
                autoComplete="email"
                placeholder={emailPlaceholder}
                validate={validators.composeValidators(emailRequired, emailValid)}
              />
              <button className={css.submitButton} type="submit" disabled={submitting}>
                <FormattedMessage id="SectionFooter.newsletterSubmit" />
              </button>
            </Form>
          </div>
        );
      }}
    />
  );
};

export default NewsletterForm;
