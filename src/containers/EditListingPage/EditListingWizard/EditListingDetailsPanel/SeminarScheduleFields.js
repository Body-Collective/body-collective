import React from 'react';

import { getStartOf } from '../../../../util/dates';
import {
  BOOKING_FOR,
  BOOKING_FOR_OPTIONS,
  EVENT_TYPE,
  EVENT_TYPES,
  SEMINAR_DATES,
} from '../../../../util/seminarSchedule';
import { required } from '../../../../util/validators';

import { FieldDateRangePicker, FieldSelect } from '../../../../components';

import css from './EditListingDetailsForm.module.css';

// Seminars can be planned up to 5 years ahead
const MAX_YEARS_AHEAD = 5;

const isOutsideRange = day => {
  const today = getStartOf(new Date(), 'day');
  const last = getStartOf(today, 'day', null, MAX_YEARS_AHEAD * 365, 'days');
  return day < today || day > last;
};

// The first day is required; without a last day, the event takes one day
const requiredDates = message => value => (value?.startDate ? undefined : message);

/**
 * Type, booking unit and dates of a Seminars & Events listing: the type of the event (seminar, training,
 * ...), who one booking is for (one person or a couple), and the first and the last day (Berlin
 * time; the daily times are in the programme). The dates are stored as unix timestamps: see
 * util/seminarSchedule.js.
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId
 * @param {Object} props.intl
 * @param {Object} props.values Values of the form
 * @returns {JSX.Element}
 */
const SeminarScheduleFields = props => {
  const { formId, intl, values } = props;
  const t = (id, values) => intl.formatMessage({ id: `EditListingDetailsForm.${id}` }, values);

  return (
    <div className={css.seminarSchedule}>
      <FieldSelect
        id={`${formId}.${EVENT_TYPE}`}
        name={EVENT_TYPE}
        className={css.seminarEventType}
        label={t('eventType')}
        validate={required(t('eventTypeRequired'))}
      >
        <option disabled value="">
          {t('eventTypePlaceholder')}
        </option>
        {EVENT_TYPES.map(type => (
          <option key={type} value={type}>
            {intl.formatMessage({ id: `EventType.${type}` })}
          </option>
        ))}
      </FieldSelect>
      <FieldSelect
        id={`${formId}.${BOOKING_FOR}`}
        name={BOOKING_FOR}
        className={css.seminarEventType}
        label={t('bookingFor')}
        validate={required(t('bookingForRequired'))}
      >
        {BOOKING_FOR_OPTIONS.map(option => (
          <option key={option} value={option}>
            {t(`bookingFor.${option}`)}
          </option>
        ))}
      </FieldSelect>
      <p className={css.seminarScheduleHelp}>
        {t(`bookingForHelp.${values?.[BOOKING_FOR] || BOOKING_FOR_OPTIONS[0]}`)}
      </p>
      <FieldDateRangePicker
        className={css.seminarDates}
        name={SEMINAR_DATES}
        isDaily
        startDateId={`${formId}.seminarStartDate`}
        startDateLabel={t('seminarStartDate')}
        startDatePlaceholderText={t('seminarDatePlaceholder')}
        endDateId={`${formId}.seminarEndDate`}
        endDateLabel={t('seminarEndDate')}
        endDatePlaceholderText={t('seminarDatePlaceholder')}
        isOutsideRange={isOutsideRange}
        validate={requiredDates(t('seminarDatesRequired'))}
      />
      <p className={css.seminarScheduleHelp}>{t('seminarScheduleHelp')}</p>
    </div>
  );
};

export default SeminarScheduleFields;
