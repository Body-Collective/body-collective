import React from 'react';

import { useIntl } from '../../../util/reactIntl';
import {
  HEALTH_DATA_CONSENT,
  WEIGHT_CONFIRMATION,
  getOrderedQuestionConfigs,
  isQuestionShown,
} from '../../../util/mobileBookingQuestions';

import { Heading } from '../../../components';

import css from './TransactionFields.module.css';

/**
 * Answers to the questions of a Mobile booking checkout (see util/mobileBookingQuestions.js), in
 * the order of the checkout, with the labels and option names in the reader's language. Shown on
 * the booking page to the customer and the therapist of the booking only (protected data).
 *
 * @component
 * @param {Object} props
 * @param {Object} props.protectedData Protected data of the transaction
 * @param {Array<Object>} props.transactionFieldConfigs Transaction fields of the listing type
 * @param {boolean} [props.isCustomerBanned]
 * @param {string} [props.bannedUserMessage]
 * @returns {JSX.Element|null}
 */
const MobileBookingAnswers = props => {
  const {
    protectedData = {},
    transactionFieldConfigs,
    isCustomerBanned,
    bannedUserMessage,
  } = props;
  const intl = useIntl();
  const text = (key, part, fallback) => {
    const id = `MobileBookingQuestions.${key}.${part}`;
    return intl.messages?.[id] ? intl.formatMessage({ id }) : fallback;
  };

  // Saved by role: customer_<key> (see util/fieldHelpers.js)
  const getAnswer = key => protectedData[`customer_${key}`];
  const answers = getOrderedQuestionConfigs(transactionFieldConfigs)
    .filter(config => config.showTo === 'customer' && isQuestionShown(config.key, getAnswer))
    .map(config => {
      const value = getAnswer(config.key);
      if (value == null || `${value}`.trim() === '') {
        return null;
      }
      const option = (config.enumOptions || []).find(o => `${o.option}` === `${value}`);
      const answer = option
        ? text(config.key, `option.${option.option}`, option.label)
        : isCustomerBanned && bannedUserMessage
        ? bannedUserMessage
        : `${value}`;
      return { key: config.key, label: text(config.key, 'label', config.label), answer };
    })
    .filter(Boolean);

  if (answers.length === 0) {
    return null;
  }

  const confirmations = [
    protectedData[WEIGHT_CONFIRMATION]
      ? intl.formatMessage({ id: 'MobileBookingAnswers.weightConfirmed' })
      : null,
    protectedData[HEALTH_DATA_CONSENT]?.given
      ? intl.formatMessage({ id: 'MobileBookingAnswers.healthDataConsentGiven' })
      : null,
  ].filter(Boolean);

  return (
    <section className={css.mobileBookingAnswers}>
      <Heading as="h3" rootClassName={css.mobileBookingTitle}>
        {intl.formatMessage({ id: 'MobileBookingAnswers.title' })}
      </Heading>
      <dl className={css.answerList}>
        {answers.map(({ key, label, answer }) => (
          <div key={key} className={css.answerRow}>
            <dt className={css.answerLabel}>{label}</dt>
            <dd className={css.answerValue}>{answer}</dd>
          </div>
        ))}
      </dl>
      {confirmations.length > 0 ? (
        <ul className={css.confirmationList}>
          {confirmations.map(line => (
            <li key={line} className={css.confirmation}>
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

export default MobileBookingAnswers;
