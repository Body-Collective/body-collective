const { getStripe } = require('../../api-util/stripe');

/**
 * Stripe payments of Sharetribe transactions, used for cancellations with a partial refund. The
 * secret key (STRIPE_SECRET_KEY) must belong to the Stripe account connected in Sharetribe Console.
 *
 * Never send Stripe API errors to the browser.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

module.exports = {
  createRefund,
  createTransferReversal,
  findPaymentIntentsForTransaction,
  retrievePaymentIntent,
};
