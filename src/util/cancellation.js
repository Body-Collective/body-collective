/**
 * Customer cancellation policies, shown in the app.
 *
 * Keep in sync with server/services/cancellation/policy.js, which enforces them:
 *  - treatment (Studio and Mobile Service, default-booking): a booking request can be cancelled
 *    for free before it's accepted. After that: more than 24 hours before the start, the payment
 *    minus the card processing (Stripe) fee is refunded; later nothing.
 *  - seminar (Seminars & Events, default-purchase, listing field offers_cancellations = yes):
 *    more than 30 days before the start the payment minus the Stripe fee, 30 to 14 days half of
 *    it, later nothing.
 *  - seminar-non-refundable (offers_cancellations = no): nothing.
 * The customer can always cancel until the start; the policy only decides the refund.
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const POLICY_TREATMENT = 'treatment';
export const POLICY_SEMINAR = 'seminar';
export const POLICY_SEMINAR_NON_REFUNDABLE = 'seminar-non-refundable';

// Listing field of Seminars & Events (Console): does the event offer cancellations?
export const OFFERS_CANCELLATIONS_KEY = 'offers_cancellations';

// Refund shares by how long before the start the customer cancels: the first rule whose time is
// shorter than the time left applies; none: 0
export const POLICIES = {
  [POLICY_TREATMENT]: [{ moreThanMs: 24 * HOUR_MS, refundShare: 1 }],
  [POLICY_SEMINAR]: [
    { moreThanMs: 30 * DAY_MS, refundShare: 1 },
    { moreThanMs: 14 * DAY_MS, refundShare: 0.5 },
  ],
  [POLICY_SEMINAR_NON_REFUNDABLE]: [],
};

const TIME_ZONE = 'Europe/Berlin';

/**
 * The cancellation policy of a listing: by its transaction process and, for Seminars & Events,
 * the listing field offers_cancellations (no value: cancellations are offered).
 *
 * @param {Object} publicData Public data of the listing
 * @returns {string|null}
 */
export const getListingPolicy = publicData => {
  const processName = `${publicData?.transactionProcessAlias || ''}`.split('/')[0];
  if (processName === 'default-booking') {
    return POLICY_TREATMENT;
  }
  if (processName === 'default-purchase') {
    return publicData?.[OFFERS_CANCELLATIONS_KEY] === 'no'
      ? POLICY_SEMINAR_NON_REFUNDABLE
      : POLICY_SEMINAR;
  }
  return null;
};

/**
 * The refund share when cancelling now, and until when it applies.
 *
 * @param {Object} params
 * @param {string} params.policy
 * @param {Date} params.startTime
 * @param {Date} params.now
 * @returns {Object} { refundShare, until } until: the last moment of this share (null: until
 * the start)
 */
export const getCurrentRefund = ({ policy, startTime, now }) => {
  const timeLeft = startTime.getTime() - now.getTime();
  const rule = (POLICIES[policy] || []).find(r => timeLeft > r.moreThanMs);
  return rule
    ? { refundShare: rule.refundShare, until: new Date(startTime.getTime() - rule.moreThanMs) }
    : { refundShare: 0, until: null };
};

/**
 * The moment when a day starts in Berlin, e.g. 20260912 => 2026-09-11T22:00:00Z. For Seminars &
 * Events listings made before the date and time selectors (event_date_sort).
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
