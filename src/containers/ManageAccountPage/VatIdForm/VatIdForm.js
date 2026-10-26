import React, { useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

// Import util modules
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { saveVatId } from '../../../util/api';

// Import shared components
import { FieldCheckbox, FieldTextInput, Form, H4, PrimaryButton } from '../../../components';

import css from './VatIdForm.module.css';

const NO_VAT_ID = 'noVatId';

const getInitialValues = privateData => ({
  vatId: privateData?.vatId || '',
  noVatId: privateData?.noVatId ? [NO_VAT_ID] : [],
});

/**
 * VAT ID of a practitioner, for invoicing: saved to the private data of the user (visible only to
 * the user and the marketplace) and checked in the EU's VIES database on the server. Shows the
 * result of the last check.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {Object} props.privateData Private data of the current user
 * @param {Function} props.onSaved Called after saving, e.g. to fetch the current user again
 * @returns {JSX.Element}
 */
const VatIdForm = props => {
  const { className, privateData, onSaved } = props;
  const intl = useIntl();
  const t = (id, values) => intl.formatMessage({ id: `VatIdForm.${id}` }, values);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);

  const current = saved || privateData || {};
  const check = current.noVatId ? null : current.vatIdCheck;

  const handleSubmit = values => {
    const noVatId = values.noVatId?.includes(NO_VAT_ID);
    setError(null);
    return saveVatId(noVatId ? { noVatId: true } : { vatId: values.vatId })
      .then(result => {
        setSaved(result);
        onSaved?.();
      })
      .catch(e => {
        setError(e?.data?.code === 'invalid-vat-id' ? 'invalid' : 'failed');
      });
  };

  return (
    <FinalForm
      initialValues={getInitialValues(privateData)}
      onSubmit={handleSubmit}
      validate={values => {
        const noVatId = values.noVatId?.includes(NO_VAT_ID);
        return !noVatId && !values.vatId?.trim() ? { vatId: t('vatIdRequired') } : {};
      }}
      render={({ handleSubmit, values, submitting, pristine, invalid }) => {
        const noVatId = values.noVatId?.includes(NO_VAT_ID);
        return (
          <Form className={classNames(css.root, className)} onSubmit={handleSubmit}>
            <H4 as="h2" className={css.heading}>
              <FormattedMessage id="VatIdForm.heading" />
            </H4>
            <p className={css.help}>
              <FormattedMessage id="VatIdForm.help" />
            </p>
            {noVatId ? null : (
              <FieldTextInput
                id="VatIdForm.vatId"
                name="vatId"
                type="text"
                autoComplete="off"
                label={t('vatIdLabel')}
                placeholder={t('vatIdPlaceholder')}
              />
            )}
            <div className={css.checkbox}>
              <FieldCheckbox
                id="VatIdForm.noVatId"
                name="noVatId"
                value={NO_VAT_ID}
                label={t('noVatIdLabel')}
              />
            </div>
            {check?.status && pristine ? (
              <p
                className={classNames(css.status, {
                  [css.statusValid]: check.status === 'valid',
                  [css.statusInvalid]: check.status === 'invalid',
                })}
                role="status"
              >
                {check.status === 'valid' && check.name
                  ? t('status.validWithName', { name: check.name })
                  : t(`status.${check.status}`)}
              </p>
            ) : null}
            {error ? (
              <p className={css.error} role="alert">
                {t(`error.${error}`)}
              </p>
            ) : null}
            <PrimaryButton
              className={css.submitButton}
              type="submit"
              inProgress={submitting}
              disabled={submitting || invalid || pristine}
            >
              <FormattedMessage id="VatIdForm.save" />
            </PrimaryButton>
          </Form>
        );
      }}
    />
  );
};

export default VatIdForm;
