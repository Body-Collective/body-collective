const { getStripe } = require('../../api-util/stripe');

/**
 * Stripe payments of Sharetribe transactions, used for cancellations: refunds, transfer reversals
 * and payouts of the practitioner's share. The secret key (STRIPE_SECRET_KEY) must belong to the
 * Stripe account connected in Sharetribe Console.
 *
 * Never send Stripe API errors to the browser.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Metadata on the PaymentIntent of a cancelled transaction whose payout to the practitioner waits
// for the funds to be available (see services/cancellation/payouts.js)
const PAYOUT_STATUS_KEY = 'bodycollective-cancellation-payout';
const PAYOUT_PENDING = 'pending';
const PAYOUT_PAID = 'paid';

// Metadata on the PaymentIntent of a transaction whose cancellation has started: the refund is
// pending until the money has been moved (see services/cancellation/refund.js)
const REFUND_STATUS_KEY = 'bodycollective-cancellation-refund';
const REFUND_PENDING = 'pending';
const REFUND_DONE = 'done';

/**
 * PaymentIntents of a Sharetribe transaction (normally one). Sharetribe APIs don't return the
 * PaymentIntent id once the payment is confirmed, but Sharetribe stores the transaction id in the
 * metadata of the PaymentIntent. A new PaymentIntent can take about a minute to show up in searches.
 *
 * @param {string} transactionId Transaction UUID
 * @returns {Promise<Array<Object>>}
 */
const findPaymentIntentsForTransaction = async transactionId => {
  // The id goes into a search query
  if (!UUID_PATTERN.test(transactionId)) {
    throw new Error('Invalid transaction id');
  }
  const result = await getStripe().paymentIntents.search({
    query: `metadata['sharetribe-transaction-id']:'${transactionId}'`,
    limit: 10,
  });
  return result.data;
};

/**
 * PaymentIntent with its charge, the balance transaction of the charge (Stripe fee) and the
 * transfer to the connected account of the practitioner.
 *
 * @param {string} paymentIntentId
 * @returns {Promise<Object>}
 */
const retrievePaymentIntent = paymentIntentId =>
  getStripe().paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction', 'latest_charge.transfer'],
  });

/**
 * Takes (part of) a transfer back from the connected account to the platform.
 *
 * @param {Object} params
 * @param {string} params.transferId
 * @param {number} params.amount In minor units (cents)
 * @param {string} params.idempotencyKey
 * @param {Object} [params.metadata]
 * @returns {Promise<Object>} The transfer reversal
 */
const createTransferReversal = ({ transferId, amount, idempotencyKey, metadata }) =>
  getStripe().transfers.createReversal(transferId, { amount, metadata }, { idempotencyKey });

/**
 * Refunds (part of) a payment to the customer, from the balance of the platform.
 *
 * @param {Object} params
 * @param {string} params.paymentIntentId
 * @param {number} params.amount In minor units (cents)
 * @param {string} params.idempotencyKey
 * @param {Object} [params.metadata]
 * @returns {Promise<Object>} The refund
 */
const createRefund = ({ paymentIntentId, amount, idempotencyKey, metadata }) =>
  getStripe().refunds.create(
    { payment_intent: paymentIntentId, amount, metadata },
    { idempotencyKey }
  );

/**
 * When the payment in the practitioner's connected account becomes available for payouts.
 *
 * @param {Object} params
 * @param {string} params.accountId Connected account id
 * @param {string} params.destinationPaymentId The transfer's destination payment (py_...)
 * @returns {Promise<{isAvailable: boolean, availableOn: Date}>}
 */
const getDestinationPaymentAvailability = async ({ accountId, destinationPaymentId }) => {
  const payment = await getStripe().charges.retrieve(
    destinationPaymentId,
    { expand: ['balance_transaction'] },
    { stripeAccount: accountId }
  );
  const { status, available_on } = payment.balance_transaction || {};
  return { isAvailable: status === 'available', availableOn: new Date(available_on * 1000) };
};

/**
 * Pays out from the practitioner's connected account to their bank account.
 *
 * @param {Object} params
 * @param {string} params.accountId Connected account id
 * @param {number} params.amount In minor units (cents)
 * @param {string} params.currency
 * @param {string} params.idempotencyKey
 * @param {Object} [params.metadata]
 * @returns {Promise<Object>} The payout
 */
const createPayout = ({ accountId, amount, currency, idempotencyKey, metadata }) =>
  getStripe().payouts.create(
    { amount, currency, metadata },
    { stripeAccount: accountId, idempotencyKey }
  );

/**
 * Updates the metadata of a PaymentIntent (merged with the existing keys).
 *
 * @param {string} paymentIntentId
 * @param {Object} metadata
 * @returns {Promise<Object>}
 */
const updatePaymentIntentMetadata = (paymentIntentId, metadata) =>
  getStripe().paymentIntents.update(paymentIntentId, { metadata });

/**
 * PaymentIntents of cancelled transactions whose payout waits for the funds to be available.
 *
 * @returns {Promise<Array<Object>>}
 */
const findPendingPayouts = async () => {
  const result = await getStripe().paymentIntents.search({
    query: `metadata['${PAYOUT_STATUS_KEY}']:'${PAYOUT_PENDING}'`,
    limit: 100,
  });
  return result.data;
};

/**
 * PaymentIntents of cancelled transactions whose refund hasn't been finished.
 *
 * @returns {Promise<Array<Object>>}
 */
const findPendingRefunds = async () => {
  const result = await getStripe().paymentIntents.search({
    query: `metadata['${REFUND_STATUS_KEY}']:'${REFUND_PENDING}'`,
    limit: 100,
  });
  return result.data;
};

module.exports = {
  REFUND_DONE,
  REFUND_PENDING,
  REFUND_STATUS_KEY,
  PAYOUT_PAID,
  PAYOUT_PENDING,
  PAYOUT_STATUS_KEY,
  createPayout,
  createRefund,
  createTransferReversal,
  findPaymentIntentsForTransaction,
  findPendingPayouts,
  findPendingRefunds,
  getDestinationPaymentAvailability,
  retrievePaymentIntent,
  updatePaymentIntentMetadata,
};
