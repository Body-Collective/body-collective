import moment from 'moment-timezone/builds/moment-timezone-with-data-10-year-range.min';

/**
 * Dates and times of Seminars & Events listings.
 *
 * The practitioner picks the first and the last day and a start and an end time. They are stored
 * to the public data of the listing as unix timestamps (seconds), in Berlin time:
 *  - event_start: first day + start time
 *  - event_end: last day + end time
 * event_start and event_end have search schemas (long), so listing queries can sort and filter
 * by them, e.g. sort=-pub_event_start (upcoming first) or pub_event_end=<now>, (not over yet).
 *
 * The type of the event (event_type: seminar, training, ...) is chosen with the dates. It has a
 * search schema (enum) and is shown on the cards; its names are translations EventType.<type>.
 *
 * Older listings have the Console fields seminar_date and seminar_times (free text) and
 * event_date_sort (YYYYMMDD). They are not asked anymore, but still shown when there's no
 * event_start.
 */

export const SEMINAR_LISTING_TYPE = 'seminar_event_booking';
export const SEMINAR_TIME_ZONE = 'Europe/Berlin';

// Console fields replaced by the date range and time selectors
export const LEGACY_SEMINAR_FIELD_KEYS = ['seminar_date', 'seminar_times', 'event_date_sort'];

// Types of events (option ids are stored in listings: don't change them)
export const EVENT_TYPE = 'event_type';
export const EVENT_TYPES = ['seminar', 'training', 'workshop', 'event', 'retreat'];

// Who one booking is for (booking_for): one person, or a couple. For couples, the price is per
// couple and the spots (stock) are couples; a booking takes one spot either way.
export const BOOKING_FOR = 'booking_for';
export const BOOKING_FOR_INDIVIDUALS = 'individuals';
export const BOOKING_FOR_COUPLES = 'couples';
export const BOOKING_FOR_OPTIONS = [BOOKING_FOR_INDIVIDUALS, BOOKING_FOR_COUPLES];

/**
 * Who one booking of the listing is for: 'individuals' (also older listings) or 'couples'.
 *
 * @param {Object} publicData
 * @returns {string}
 */
export const getBookingFor = publicData =>
  publicData?.[BOOKING_FOR] === BOOKING_FOR_COUPLES ? BOOKING_FOR_COUPLES : BOOKING_FOR_INDIVIDUALS;

/**
 * Whether one booking of the listing is for a couple.
 *
 * @param {Object} publicData
 * @returns {boolean}
 */
export const isCouplesListing = publicData => getBookingFor(publicData) === BOOKING_FOR_COUPLES;

/**
 * The event type search param, if it has known types, e.g. "retreat" or "seminar,workshop".
 *
 * @param {string?} value
 * @returns {Object} { pub_event_type: value } or an empty object
 */
export const validEventTypeParam = value => {
  const types = typeof value === 'string' ? value.split(',').filter(Boolean) : [];
  const isValid = types.length > 0 && types.every(t => EVENT_TYPES.includes(t));
  return isValid ? { [`pub_${EVENT_TYPE}`]: value } : {};
};

// Seminars take whole days (Berlin time): from the start of the first to the end of the last
const DAY_START = '00:00';
const DAY_END = '23:59';

// Form field names
export const SEMINAR_DATES = 'seminarDates';

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
  const eventTypeMaybe = EVENT_TYPES.includes(publicData?.[EVENT_TYPE])
    ? { [EVENT_TYPE]: publicData[EVENT_TYPE] }
    : {};
  const bookingForMaybe = { [BOOKING_FOR]: getBookingFor(publicData) };
  if (!start || !end) {
    return { ...eventTypeMaybe, ...bookingForMaybe };
  }
  // One-day events: no last day in the form
  const isOneDay = start.day.getTime() === end.day.getTime();
  return {
    ...eventTypeMaybe,
    ...bookingForMaybe,
    [SEMINAR_DATES]: { startDate: start.day, endDate: isOneDay ? null : end.day },
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
  const eventType = values?.[EVENT_TYPE];
  return {
    [EVENT_TYPE]: EVENT_TYPES.includes(eventType) ? eventType : null,
    [BOOKING_FOR]: BOOKING_FOR_OPTIONS.includes(values?.[BOOKING_FOR])
      ? values[BOOKING_FOR]
      : BOOKING_FOR_INDIVIDUALS,
    // The event takes the whole days: the daily times are in the programme (listing field
    // schedule). One-day events have no last day: they end on the first day.
    event_start: toUnixSeconds(startDate, DAY_START),
    event_end: toUnixSeconds(endDate || startDate, DAY_END),
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

// Short month names of the cards, e.g. "12–14 Sep 26" or "12.–14. Sep. 26"
const SHORT_MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  de: [
    'Jan.',
    'Feb.',
    'März',
    'Apr.',
    'Mai',
    'Juni',
    'Juli',
    'Aug.',
    'Sep.',
    'Okt.',
    'Nov.',
    'Dez.',
  ],
};

/**
 * The dates of the seminar on its card, short, in the language of the page (Berlin time):
 *  - one day: "1 Nov 26" / "1. Nov. 26"
 *  - same month: "12–14 Sep 26" / "12.–14. Sep. 26"
 *  - different months: "31 Oct – 5 Nov 26" / "31. Okt. – 5. Nov. 26"
 *  - across the year: "27 Dec 26 – 3 Jan 27" / "27. Dez. 26 – 3. Jan. 27"
 * Older listings: their seminar_date text.
 *
 * @param {Object} intl
 * @param {Object} publicData
 * @returns {string|null}
 */
export const formatSeminarCardDates = (intl, publicData) => {
  const schedule = getSeminarSchedule(publicData);
  if (!schedule) {
    return publicData?.seminar_date || null;
  }
  const isGerman = `${intl?.locale || ''}`.toLowerCase().startsWith('de');
  const months = isGerman ? SHORT_MONTHS.de : SHORT_MONTHS.en;
  const parts = date => {
    const m = moment(date).tz(SEMINAR_TIME_ZONE);
    return {
      day: m.date(),
      month: months[m.month()],
      year: m.format('YY'),
      key: m.format('YYYYMMDD'),
    };
  };
  const start = parts(schedule.start);
  const end = parts(schedule.end);
  const day = d => (isGerman ? `${d.day}.` : `${d.day}`);
  const dayMonth = d => `${day(d)} ${d.month}`;
  const full = d => `${dayMonth(d)} ${d.year}`;

  if (start.key === end.key) {
    return full(start);
  }
  if (start.year !== end.year) {
    return `${full(start)} – ${full(end)}`;
  }
  if (start.month !== end.month) {
    return `${dayMonth(start)} – ${full(end)}`;
  }
  return `${day(start)}–${full(end)}`;
};

/**
 * Query params that leave out seminars that are over (their end is in the past).
 *
 * @param {Date} [now]
 * @returns {Object} { pub_event_end: '<now in seconds>,' }
 */
export const getUpcomingSeminarsParams = (now = new Date()) => ({
  pub_event_end: `${Math.floor(now.getTime() / 1000)},`,
});
