const { DAY_MS, MIN_DAYS_BEFORE_START } = require('./policy');

/**
 * Rules of customer cancellations, for both processes:
 *  - default-booking (Studio and Mobile Service): an accepted booking, the session starts at the
 *    start of the booking
 *  - default-purchase (Seminars & Events): a purchased place, the event starts on the day of the
 *    listing field event_date_sort (YYYYMMDD), at midnight in Berlin
 * Practitioners can't cancel. See ./policy.js for the policy.
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
    return startOfDayInBerlin(listing?.attributes?.publicData?.event_date_sort);
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
 * Why the transaction can't be cancelled, or null if it can.
 *
 * @param {Object} params
 * @param {string|null} params.role 'customer' or 'provider'
 * @param {string|null} params.cancelTransition See getCancelTransition
 * @param {Date|null} params.startTime See getStartTime
 * @param {Date} params.now
 * @returns {string|null} 'not-allowed', 'no-start-time', 'too-late' or null
 */
const getCancelError = ({ role, cancelTransition, startTime, now }) => {
  if (role !== 'customer' || !cancelTransition) {
    return 'not-allowed';
  }
  if (!startTime) {
    return 'no-start-time';
  }
  const isEarlyEnough = startTime.getTime() - now.getTime() > MIN_DAYS_BEFORE_START * DAY_MS;
  return isEarlyEnough ? null : 'too-late';
};

/**
 * Amounts of a cancellation, from the Stripe PaymentIntent (see stripe.retrievePaymentIntent).
 *
 * Sharetribe uses destination charges: the whole payment is transferred to the connected account
 * of the practitioner, the commission comes back to the platform as an application fee and the
 * platform pays the Stripe fee. To refund the customer the payment minus the Stripe fee, and leave
 * the platform at zero, the share of the practitioner is taken back from the connected account and
 * the refund is made from the balance of the platform.
 *
 * @param {Object} paymentIntent
 * @returns {Object} In minor units: paid, fee, refund, providerShare, alreadyRefunded,
 * alreadyReversed; and currency and transferId
 */
const getRefundAmounts = paymentIntent => {
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
  return {
    currency: charge.currency,
    paid,
    fee,
    refund: Math.max(paid - fee, 0),
    providerShare: transfer.amount - (charge.application_fee_amount || 0),
    alreadyRefunded: charge.amount_refunded || 0,
    alreadyReversed: transfer.amount_reversed || 0,
    transferId: transfer.id,
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
  getRefundAmounts,
  getStartTime,
  startOfDayInBerlin,
};
