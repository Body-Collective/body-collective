const {
  POLICIES,
  POLICY_SEMINAR,
  POLICY_SEMINAR_NON_REFUNDABLE,
  POLICY_TREATMENT,
} = require('./policy');

/**
 * Rules of customer cancellations, for both processes:
 *  - default-booking (Studio and Mobile Service): an accepted booking, the session starts at the
 *    start of the booking
 *  - default-purchase (Seminars & Events): a purchased place, the event starts at event_start
 *    (unix seconds, set by the listing form). Older listings: the day of event_date_sort
 *    (YYYYMMDD), at midnight in Berlin
 * Practitioners can't cancel. See ./policy.js for the policies.
 */

const BOOKING_PROCESS = 'default-booking';
const PURCHASE_PROCESS = 'default-purchase';

const TRANSITIONS = {
  // Booking before acceptance: free, made by the customer in the app (not privileged)
  CUSTOMER_CANCEL_REQUEST: 'transition/customer-cancel-request',
  // Booking after acceptance, and purchase: refund minus the Stripe fee (privileged)
  CUSTOMER_CANCEL: 'transition/customer-cancel',
};

// Privileged cancel transitions: they can only be made through server/api/transaction-cancel.js
const CANCEL_PRIVILEGED_TRANSITIONS = [TRANSITIONS.CUSTOMER_CANCEL];

// The last transitions that lead to the state from which customer-cancel is possible
const CANCELLABLE_AFTER = {
  [BOOKING_PROCESS]: ['transition/accept', 'transition/operator-accept'],
  [PURCHASE_PROCESS]: ['transition/confirm-payment'],
};

const TIME_ZONE = 'Europe/Berlin';

// Transitions that create a paid transaction: the cancellation policy is copied to its
// protected data then
const REQUEST_PAYMENT_TRANSITIONS = [
  'transition/request-payment',
  'transition/request-payment-after-inquiry',
];

// Listing field of Seminars & Events (Console): does the event offer cancellations?
const OFFERS_CANCELLATIONS_KEY = 'offers_cancellations';

/**
 * The cancellation policy of a listing: by its transaction process and, for Seminars & Events,
 * the listing field offers_cancellations (no value: cancellations are offered).
 *
 * @param {Object} listing Listing entity
 * @returns {string|null} 'treatment', 'seminar', 'seminar-non-refundable' or null
 */
const getListingPolicy = listing => {
  const publicData = listing?.attributes?.publicData || {};
  const processName = `${publicData.transactionProcessAlias || ''}`.split('/')[0];
  if (processName === BOOKING_PROCESS) {
    return POLICY_TREATMENT;
  }
  if (processName === PURCHASE_PROCESS) {
    return publicData[OFFERS_CANCELLATIONS_KEY] === 'no'
      ? POLICY_SEMINAR_NON_REFUNDABLE
      : POLICY_SEMINAR;
  }
  return null;
};

/**
 * The policy of a transaction: the one copied when it was created, or the listing's (transactions
 * made before the policies were copied).
 *
 * @param {Object} tx Transaction entity
 * @param {Object} listing Listing entity
 * @returns {string|null}
 */
const getTransactionPolicy = (tx, listing) => {
  const copied = tx?.attributes?.protectedData?.cancellationPolicy;
  return POLICIES[copied] ? copied : getListingPolicy(listing);
};

/**
 * Transition params with the listing's cancellation policy in the protected data, for the
 * transitions that create a paid transaction. Set by the server, so clients can't choose it.
 *
 * @param {string} transitionName
 * @param {Object} params Transition params
 * @param {Object} listing Listing entity
 * @returns {Object} params
 */
const withCancellationPolicy = (transitionName, params, listing) => {
  const policy = getListingPolicy(listing);
  return REQUEST_PAYMENT_TRANSITIONS.includes(transitionName) && policy
    ? { ...params, protectedData: { ...(params?.protectedData || {}), cancellationPolicy: policy } }
    : params;
};

/**
 * Share of the payment (minus the Stripe fee) that is refunded when cancelling now.
 *
 * @param {Object} params
 * @param {string} params.policy
 * @param {Date} params.startTime
 * @param {Date} params.now
 * @returns {number} 1, 0.5 or 0
 */
const getRefundShare = ({ policy, startTime, now }) => {
  const timeLeft = startTime.getTime() - now.getTime();
  const rule = (POLICIES[policy] || []).find(r => timeLeft > r.moreThanMs);
  return rule ? rule.refundShare : 0;
};

/**
 * The moment when a day starts in Berlin, e.g. 20260912 => 2026-09-11T22:00:00Z.
 *
 * @param {number|string} yyyymmdd
 * @returns {Date|null}
 */
const startOfDayInBerlin = yyyymmdd => {
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
 * When the session or the event of the transaction starts.
 *
 * @param {Object} params
 * @param {string} params.processName
 * @param {Object|null} params.booking Booking entity (booking process)
 * @param {Object|null} params.listing Listing entity (purchase process)
 * @returns {Date|null}
 */
const getStartTime = ({ processName, booking, listing }) => {
  if (processName === BOOKING_PROCESS) {
    const start = booking?.attributes?.start;
    return start ? new Date(start) : null;
  }
  if (processName === PURCHASE_PROCESS) {
    const { event_start, event_date_sort } = listing?.attributes?.publicData || {};
    return typeof event_start === 'number'
      ? new Date(event_start * 1000)
      : startOfDayInBerlin(event_date_sort);
  }
  return null;
};

/**
 * The privileged cancel transition of the transaction, or null if it can't be cancelled with a
 * refund now (wrong state or process).
 *
 * @param {string} processName
 * @param {string} lastTransition
 * @returns {string|null}
 */
const getCancelTransition = (processName, lastTransition) =>
  (CANCELLABLE_AFTER[processName] || []).includes(lastTransition)
    ? TRANSITIONS.CUSTOMER_CANCEL
    : null;

/**
 * Why the transaction can't be cancelled, or null if it can. Until the start it can always be
 * cancelled; the policy only decides the refund.
 *
 * @param {Object} params
 * @param {string|null} params.role 'customer' or 'provider'
 * @param {string|null} params.cancelTransition See getCancelTransition
 * @param {string|null} params.policy See getTransactionPolicy
 * @param {Date|null} params.startTime See getStartTime
 * @param {Date} params.now
 * @returns {string|null} 'not-allowed', 'no-start-time', 'too-late' (started) or null
 */
const getCancelError = ({ role, cancelTransition, policy, startTime, now }) => {
  if (role !== 'customer' || !cancelTransition || !policy) {
    return 'not-allowed';
  }
  if (!startTime) {
    return 'no-start-time';
  }
  return startTime.getTime() > now.getTime() ? null : 'too-late';
};

/**
 * Amounts of a cancellation, from the Stripe PaymentIntent (see stripe.retrievePaymentIntent).
 *
 * Sharetribe uses destination charges: the whole payment is transferred to the connected account
 * of the practitioner, the commission comes back to the platform as an application fee and the
 * platform pays the Stripe fee. With refund share r:
 *  - the customer gets back r × (payment − Stripe fee), from the balance of the platform
 *  - r × the practitioner's share is taken back from their connected account (transfer reversal);
 *    they keep the rest (payout), which the server pays out (see ./payouts.js)
 *  - the platform keeps (1 − r) × (commission − Stripe fee): nothing with r = 1, as in a normal
 *    sale with r = 0
 *
 * @param {Object} paymentIntent
 * @param {number} [refundShare] 0 to 1 (default 1)
 * @returns {Object} In minor units: paid, fee, refund, providerShare, reversal, payout,
 * alreadyRefunded, alreadyReversed; and refundShare, currency, transferId, accountId (connected
 * account) and destinationPaymentId (the payment in the connected account)
 */
const getRefundAmounts = (paymentIntent, refundShare = 1) => {
  const charge = paymentIntent?.latest_charge;
  const balanceTransaction = charge?.balance_transaction;
  const transfer = charge?.transfer;
  if (!charge?.captured || !balanceTransaction || !transfer?.id) {
    const error = new Error('The payment is not captured or has no transfer');
    error.code = 'payment-not-captured';
    throw error;
  }
  if (balanceTransaction.currency !== charge.currency) {
    // The Stripe fee is in another currency than the payment: needs manual handling
    const error = new Error('The Stripe fee is in another currency than the payment');
    error.code = 'currency-mismatch';
    throw error;
  }

  const paid = charge.amount;
  const fee = balanceTransaction.fee;
  const providerShare = transfer.amount - (charge.application_fee_amount || 0);
  const reversal = Math.round(refundShare * providerShare);
  return {
    refundShare,
    currency: charge.currency,
    paid,
    fee,
    refund: Math.round(refundShare * Math.max(paid - fee, 0)),
    providerShare,
    reversal,
    payout: providerShare - reversal,
    alreadyRefunded: charge.amount_refunded || 0,
    alreadyReversed: transfer.amount_reversed || 0,
    transferId: transfer.id,
    accountId:
      typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id,
    destinationPaymentId:
      typeof transfer.destination_payment === 'string'
        ? transfer.destination_payment
        : transfer.destination_payment?.id,
  };
};

/**
 * Money as text for emails, e.g. "€1,601.85". Amounts are in minor units.
 *
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
const formatMoney = (amount, currency) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency.toUpperCase() }).format(
    amount / 100
  );

module.exports = {
  BOOKING_PROCESS,
  CANCEL_PRIVILEGED_TRANSITIONS,
  PURCHASE_PROCESS,
  TRANSITIONS,
  formatMoney,
  getCancelError,
  getCancelTransition,
  getListingPolicy,
  getRefundAmounts,
  getRefundShare,
  getStartTime,
  getTransactionPolicy,
  startOfDayInBerlin,
  withCancellationPolicy,
};
