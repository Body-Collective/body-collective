import React from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

// Utils
import { useIntl } from '../../../util/reactIntl';
import { required } from '../../../util/validators';
import {
  HEALTH_DATA_CONSENT,
  HEALTH_NOTE,
  HOTEL_RECEPTIONIST,
  WEIGHT_CONFIRMATION,
  formFieldName,
  getOrderedQuestionConfigs,
  isQuestionRequired,
  isQuestionShown,
} from '../../../util/mobileBookingQuestions';

// Shared components
import {
  FieldCheckbox,
  FieldTextInput,
  LabelTextWithTag,
  ValidationError,
} from '../../../components';

import css from './MobileBookingQuestions.module.css';

// A translation of the question, or the fallback (e.g. the label from Console)
const useText = () => {
  const intl = useIntl();
  return (key, part, fallback = null, values) => {
    const id = `MobileBookingQuestions.${key}.${part}`;
    return intl.messages?.[id] ? intl.formatMessage({ id }, values) : fallback;
  };
};

// The error of a field, shown below it once it was touched
const FieldError = ({ name }) => (
  <Field name={name} subscription={{ touched: true, error: true }}>
    {({ meta }) => <ValidationError fieldMeta={meta} />}
  </Field>
);

const requiredArray = message => value =>
  Array.isArray(value) && value.length > 0 ? undefined : message;

// Options of a select question as round chips (radio buttons)
const ChoiceQuestion = props => {
  const { id, name, label, options, isRequired, requiredMessage, text, questionKey } = props;
  return (
    <fieldset className={css.question}>
      <legend className={css.legend}>
        <LabelTextWithTag label={label} isRequired={isRequired} />
      </legend>
      <div className={css.chips}>
        {options.map(o => {
          const optionId = `${id}-${o.option}`;
          return (
            <Field
              key={o.option}
              name={name}
              type="radio"
              value={`${o.option}`}
              validate={isRequired ? required(requiredMessage) : undefined}
            >
              {({ input }) => (
                <label
                  htmlFor={optionId}
                  className={classNames(css.chip, { [css.chipSelected]: input.checked })}
                >
                  <input {...input} id={optionId} className={css.chipInput} />
                  {text(questionKey, `option.${o.option}`, o.label)}
                </label>
              )}
            </Field>
          );
        })}
      </div>
      <FieldError name={name} />
    </fieldset>
  );
};

/**
 * Questions of the checkout of Mobile booking listings (see util/mobileBookingQuestions.js): the
 * transaction fields of the listing type in the order of the checkout, with the conditional
 * questions (receptionist for hotels, directions without car access) and the confirmations of
 * the weight limit and of the consent to share health information.
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId
 * @param {Array<Object>} props.transactionFieldConfigs Transaction fields of the listing type
 * @param {Object} props.values Values of the checkout form
 * @returns {JSX.Element}
 */
const MobileBookingQuestions = props => {
  const { formId, transactionFieldConfigs, values } = props;
  const intl = useIntl();
  const text = useText();
  const getAnswer = key => values?.[formFieldName(key)];
  const requiredMessage = intl.formatMessage({ id: 'MobileBookingQuestions.required' });

  const questions = getOrderedQuestionConfigs(transactionFieldConfigs).filter(
    config => config.showTo === 'customer' && isQuestionShown(config.key, getAnswer)
  );

  return (
    <div className={css.root}>
      <h3 className={css.title}>{intl.formatMessage({ id: 'MobileBookingQuestions.title' })}</h3>

      {questions.map(config => {
        const { key, schemaType, enumOptions = [], label: consoleLabel } = config;
        const name = formFieldName(key);
        const id = `${formId}.${name}`;
        const label = text(key, 'label', consoleLabel);
        const isRequired = isQuestionRequired(config);
        const helpText = text(key, 'helpText', config.saveConfig?.helpText || config.helpText);
        const placeholder = text(key, 'placeholder');

        const hotelNote =
          key === HOTEL_RECEPTIONIST ? (
            <div className={css.note}>
              <strong>
                {intl.formatMessage({ id: 'MobileBookingQuestions.hotelNote.title' })}
              </strong>{' '}
              {intl.formatMessage({ id: 'MobileBookingQuestions.hotelNote.text' })}
            </div>
          ) : null;

        if (schemaType === 'enum') {
          return (
            <ChoiceQuestion
              key={key}
              id={id}
              name={name}
              label={label}
              options={enumOptions}
              isRequired={isRequired}
              requiredMessage={requiredMessage}
              text={text}
              questionKey={key}
            />
          );
        }

        return (
          <div key={key} className={classNames({ [css.conditional]: key === HOTEL_RECEPTIONIST })}>
            {hotelNote}
            <FieldTextInput
              id={id}
              name={name}
              className={css.question}
              type={schemaType === 'shortText' ? 'text' : 'textarea'}
              label={<LabelTextWithTag label={label} isRequired={isRequired} />}
              helpText={helpText}
              placeholder={placeholder}
              validate={isRequired ? required(requiredMessage) : undefined}
            />
            {key === HEALTH_NOTE ? (
              <div className={css.confirmations}>
                <FieldCheckbox
                  id={`${formId}.${WEIGHT_CONFIRMATION}`}
                  name={WEIGHT_CONFIRMATION}
                  value="confirmed"
                  label={intl.formatMessage({ id: 'MobileBookingQuestions.weightConfirmation' })}
                  validate={requiredArray(requiredMessage)}
                />
                <FieldError name={WEIGHT_CONFIRMATION} />
                <FieldCheckbox
                  id={`${formId}.${HEALTH_DATA_CONSENT}`}
                  name={HEALTH_DATA_CONSENT}
                  value="given"
                  label={intl.formatMessage({ id: 'MobileBookingQuestions.healthDataConsent' })}
                  validate={requiredArray(requiredMessage)}
                />
                <FieldError name={HEALTH_DATA_CONSENT} />
                <p className={css.privacyNote}>
                  {intl.formatMessage({ id: 'MobileBookingQuestions.privacyNote' })}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default MobileBookingQuestions;
