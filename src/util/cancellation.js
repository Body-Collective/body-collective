/**
 * Customer cancellation policy, shown on the transaction page.
 *
 * Keep in sync with server/services/cancellation/policy.js, which enforces it:
 *  - Studio and Mobile Service (default-booking): a booking request can be cancelled for free
 *    before it's accepted. An accepted booking can be cancelled until 7 days before it starts.
 *  - Seminars & Events (default-purchase): a place can be cancelled until 7 days before the event
 *    (the listing field event_date_sort, from the start of that day in Berlin).
 *  - The refund is the payment minus the card processing (Stripe) fee.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

// Cancellation with a refund is possible only more than this many days before the start
export const MIN_DAYS_BEFORE_START = 7;

const TIME_ZONE = 'Europe/Berlin';

/**
 * The moment when a day starts in Berlin, e.g. 20260912 => 2026-09-11T22:00:00Z.
 *
 * @param {number|string} yyyymmdd
 * @returns {Date|null}
 */
export const startOfDayInBerlin = yyyymmdd => {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(`${yyyymmdd || ''}`);
  if (!match) {
    return null;
  }
  const [, y, m, d] = match.map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  // The offset of Berlin from UTC on that day (1 or 2 hours)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMidnight));
  const berlinHour = Number(parts.find(p => p.type === 'hour').value);
  return new Date(utcMidnight - berlinHour * 60 * 60 * 1000);
};

/**
 * The last moment when a cancellation with a refund is possible.
 *
 * @param {Date} startTime
 * @returns {Date}
 */
export const getCancelDeadline = startTime =>
  new Date(startTime.getTime() - MIN_DAYS_BEFORE_START * DAY_MS);
