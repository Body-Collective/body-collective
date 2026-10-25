import React from 'react';

import { getStartOf } from '../../../../util/dates';
import {
  EVENT_TYPE,
  EVENT_TYPES,
  SEMINAR_DATES,
  SEMINAR_END_TIME,
  SEMINAR_START_TIME,
  SEMINAR_TIME_OPTIONS,
  getSeminarSchedulePublicData,
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

// Required, and the seminar must end after it starts (e.g. not 18:00 – 10:00 on one day)
const validEndTime = (requiredMessage, endBeforeStartMessage) => (value, allValues) => {
  if (!value) {
    return requiredMessage;
  }
  const { event_start, event_end } = getSeminarSchedulePublicData(allValues);
  return event_start != null && event_end != null && event_end <= event_start
    ? endBeforeStartMessage
    : undefined;
};

/**
 * Type, dates and times of a Seminars & Events listing: the type of the event (seminar, training,
 * ...), the first and the last day, and the start and the end time (Berlin time). The dates are
 * stored as unix timestamps: see util/seminarSchedule.js.
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId
 * @param {Object} props.intl
 * @returns {JSX.Element}
 */
const SeminarScheduleFields = props => {
  const { formId, intl } = props;
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
      <div className={css.seminarTimes}>
        <FieldSelect
          id={`${formId}.${SEMINAR_START_TIME}`}
          name={SEMINAR_START_TIME}
          className={css.seminarTime}
          label={t('seminarStartTime')}
          validate={required(t('seminarTimeRequired'))}
        >
          <option disabled value="">
            {t('seminarTimePlaceholder')}
          </option>
          {SEMINAR_TIME_OPTIONS.map(time => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </FieldSelect>
        <FieldSelect
          id={`${formId}.${SEMINAR_END_TIME}`}
          name={SEMINAR_END_TIME}
          className={css.seminarTime}
          label={t('seminarEndTime')}
          validate={validEndTime(t('seminarTimeRequired'), t('seminarEndBeforeStart'))}
        >
          <option disabled value="">
            {t('seminarTimePlaceholder')}
          </option>
          {SEMINAR_TIME_OPTIONS.map(time => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </FieldSelect>
      </div>
      <p className={css.seminarScheduleHelp}>{t('seminarScheduleHelp')}</p>
    </div>
  );
};

export default SeminarScheduleFields;
