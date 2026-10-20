/**
 * Cancellation policy of customer orders. One policy for all listing types for now; the exact
 * policies, controlled by the marketplace admin, will replace these values.
 *
 *  - Booking (Studio and Mobile Service), before the practitioner accepts: free, the card
 *    authorization is released (transition/customer-cancel-request in the process).
 *  - Booking after acceptance, and Seminars & Events after the purchase: until
 *    MIN_DAYS_BEFORE_START days before the session or the event, the customer is refunded the
 *    payment minus the Stripe fee (transition/customer-cancel, see server/api/transaction-cancel.js).
 *  - Later: no cancellation.
 *
 * Keep the client copy in src/util/cancellation.js in sync.
 */

// Days before the start of the session or the event when cancelling is still possible
const MIN_DAYS_BEFORE_START = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

module.exports = {
  DAY_MS,
  MIN_DAYS_BEFORE_START,
};
