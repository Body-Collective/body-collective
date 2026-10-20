import moment from 'moment-timezone/builds/moment-timezone-with-data-10-year-range.min';

/**
 * Dates and times of Seminars & Events listings.
 *
 * The practitioner picks the first and the last day and a start and an end time. They are stored
 * to the public data of the listing as unix timestamps (seconds), in Berlin time:
 *  - event_start: first day + start time
 *  - event_end: last day + end time
 * event_start has a search schema (long), so listing queries can sort and filter by it, e.g.
 * sort=-pub_event_start (upcoming first) or pub_event_start=<now>, (not started yet).
 *
 * Older listings have the Console fields seminar_date and seminar_times (free text) and
 * event_date_sort (YYYYMMDD). They are not asked anymore, but still shown when there's no
 * event_start.
 */

export const SEMINAR_LISTING_TYPE = 'seminar_event_booking';
export const SEMINAR_TIME_ZONE = 'Europe/Berlin';

// Console fields replaced by the date range and time selectors
export const LEGACY_SEMINAR_FIELD_KEYS = ['seminar_date', 'seminar_times', 'event_date_sort'];

// Form field names
export const SEMINAR_DATES = 'seminarDates';
export const SEMINAR_START_TIME = 'seminarStartTime';
export const SEMINAR_END_TIME = 'seminarEndTime';

const TIME_STEP_MINUTES = 15;

/**
 * Times of day for the time selectors: '00:00', '00:15', ... '23:45'.
 */
export const SEMINAR_TIME_OPTIONS = Array.from(
  { length: (24 * 60) / TIME_STEP_MINUTES },
  (_, i) => {
    const minutes = i * TIME_STEP_MINUTES;
    const hh = `${Math.floor(minutes / 60)}`.padStart(2, '0');
    const mm = `${minutes % 60}`.padStart(2, '0');
    return `${hh}:${mm}`;
  }
);

/**
 * Listing fields without the Console fields that the date range and time selectors replace.
 *
 * @param {Array<Object>} listingFields
 * @returns {Array<Object>}
 */
export const withoutLegacySeminarFields = (listingFields = []) =>
  listingFields.filter(f => !LEGACY_SEMINAR_FIELD_KEYS.includes(f?.key));

/**
 * Unix timestamp (seconds) of a day and a time of day in Berlin.
 *
 * @param {Date} day A date picked in the date picker (local midnight of the day)
 * @param {string} time 'HH:mm'
 * @returns {number|null}
 */
export const toUnixSeconds = (day, time) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time || '');
  if (!(day instanceof Date) || isNaN(day) || !match) {
    return null;
  }
  return moment
    .tz(
      {
        year: day.getFullYear(),
        month: day.getMonth(),
        date: day.getDate(),
        hour: Number(match[1]),
        minute: Number(match[2]),
      },
      SEMINAR_TIME_ZONE
    )
    .unix();
};

/**
 * The day (for the date picker: local midnight of that day) and the time of day in Berlin of a
 * unix timestamp.
 *
 * @param {number} seconds
 * @returns {Object|null} { day, time }
 */
export const fromUnixSeconds = seconds => {
  if (typeof seconds !== 'number' || !isFinite(seconds)) {
    return null;
  }
  const m = moment.unix(seconds).tz(SEMINAR_TIME_ZONE);
  return { day: new Date(m.year(), m.month(), m.date()), time: m.format('HH:mm') };
};

/**
 * Initial values of the seminar fields of the listing form.
 *
 * @param {Object} publicData
 * @returns {Object}
 */
export const getSeminarScheduleInitialValues = publicData => {
  const start = fromUnixSeconds(publicData?.event_start);
  const end = fromUnixSeconds(publicData?.event_end);
  if (!start || !end) {
    return {};
  }
  return {
    [SEMINAR_DATES]: { startDate: start.day, endDate: end.day },
    [SEMINAR_START_TIME]: start.time,
    [SEMINAR_END_TIME]: end.time,
  };
};

/**
 * Public data of the seminar fields of the listing form.
 *
 * @param {Object} values Form values
 * @returns {Object} { event_start, event_end } in unix seconds
 */
export const getSeminarSchedulePublicData = values => {
  const { startDate, endDate } = values?.[SEMINAR_DATES] || {};
  return {
    event_start: toUnixSeconds(startDate, values?.[SEMINAR_START_TIME]),
    event_end: toUnixSeconds(endDate, values?.[SEMINAR_END_TIME]),
  };
};

/**
 * Start and end of the seminar, if the listing has them.
 *
 * @param {Object} publicData
 * @returns {Object|null} { start, end } Dates
 */
export const getSeminarSchedule = publicData => {
  const { event_start, event_end } = publicData || {};
  if (typeof event_start !== 'number' || typeof event_end !== 'number') {
    return null;
  }
  return { start: new Date(event_start * 1000), end: new Date(event_end * 1000) };
};

/**
 * The dates and times of the seminar as text, in the language of the page, e.g.
 * "Sat, Sep 12 – Mon, Sep 14, 2026 · 10:00 – 18:00". Older listings: their seminar_date text.
 *
 * @param {Object} intl
 * @param {Object} publicData
 * @returns {Object|null} { dates, times }
 */
export const formatSeminarSchedule = (intl, publicData) => {
  const schedule = getSeminarSchedule(publicData);
  if (!schedule) {
    const legacyDates = publicData?.seminar_date;
    return legacyDates ? { dates: legacyDates, times: publicData?.seminar_times || null } : null;
  }

  const { start, end } = schedule;
  const dateOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SEMINAR_TIME_ZONE,
  };
  const timeOptions = { hour: '2-digit', minute: '2-digit', timeZone: SEMINAR_TIME_ZONE };
  const isSameDay =
    moment(start)
      .tz(SEMINAR_TIME_ZONE)
      .format('YYYYMMDD') ===
    moment(end)
      .tz(SEMINAR_TIME_ZONE)
      .format('YYYYMMDD');

  const dates = isSameDay
    ? intl.formatDate(start, dateOptions)
    : `${intl.formatDate(start, dateOptions)} – ${intl.formatDate(end, dateOptions)}`;
  const times = `${intl.formatTime(start, timeOptions)} – ${intl.formatTime(end, timeOptions)}`;
  return { dates, times };
};
