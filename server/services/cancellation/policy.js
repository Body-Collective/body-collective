/**
 * Cancellation policies of customers (practitioners can't cancel).
 *
 * Keep in sync with src/util/cancellation.js, which shows them in the app.
 *
 *  - treatment (Studio and Mobile Service, default-booking): more than 24 hours before the start,
 *    the refund share is 100%; later 0%.
 *  - seminar (Seminars & Events, default-purchase, listing field offers_cancellations = yes):
 *    more than 30 days before the start 100%, 30 to 14 days 50%, later 0%.
 *  - seminar-non-refundable (offers_cancellations = no): always 0%.
 *
 * A booking request that isn't accepted yet can always be cancelled for free (the card was only
 * authorized). After that, the Stripe fee is never refunded: the customer gets back the refund
 * share of the payment minus the Stripe fee, and the share of the practitioner and the commission
 * of the platform are reduced by the same share (see getRefundAmounts). With 0%, the customer can
 * still cancel, but gets nothing back.
 *
 * The policy of a transaction is copied to its protected data (cancellationPolicy) when it's
 * created, so later changes to the listing don't change it.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const POLICY_TREATMENT = 'treatment';
const POLICY_SEMINAR = 'seminar';
const POLICY_SEMINAR_NON_REFUNDABLE = 'seminar-non-refundable';

// Refund shares by how long before the start the customer cancels: the first rule whose time
// is shorter than the time left applies; none: 0
const POLICIES = {
  [POLICY_TREATMENT]: [{ moreThanMs: 24 * HOUR_MS, refundShare: 1 }],
  [POLICY_SEMINAR]: [
    { moreThanMs: 30 * DAY_MS, refundShare: 1 },
    { moreThanMs: 14 * DAY_MS, refundShare: 0.5 },
  ],
  [POLICY_SEMINAR_NON_REFUNDABLE]: [],
};

module.exports = {
  DAY_MS,
  HOUR_MS,
  POLICIES,
  POLICY_SEMINAR,
  POLICY_SEMINAR_NON_REFUNDABLE,
  POLICY_TREATMENT,
};
