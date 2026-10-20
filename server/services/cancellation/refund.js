const log = require('../../log');
const { getIntegrationSdk } = require('../../api-util/sdk');
const {
  createRefund,
  createTransferReversal,
  findPaymentIntentsForTransaction,
  retrievePaymentIntent,
} = require('../stripe');
const { formatMoney, getRefundAmounts } = require('./index');

/**
 * An error that is answered to the browser with the given status and code.
 */
const cancelError = (status, code) => {
  const error = new Error(code);
  error.status = status;
  error.code = code;
  error.isCancelError = true;
  return error;
};

/**
 * The Stripe payment of the transaction and the amounts of the refund (payment minus the Stripe
 * fee). The payment must match the totals of the transaction, otherwise it needs manual handling.
 *
 * @param {Object} tx Transaction entity
 * @returns {Promise<Object>} { paymentIntentId, amounts } (see getRefundAmounts)
 */
const getPaymentAndAmounts = async tx => {
  const transactionId = tx.id.uuid;

  // Sharetribe doesn't return the PaymentIntent id once the payment is confirmed
  const paymentIntents = await findPaymentIntentsForTransaction(transactionId);
  if (paymentIntents.length !== 1) {
    log.error(new Error('Expected one Stripe payment'), 'transaction-cancel-payment-not-found', {
      transactionId,
      paymentIntentCount: paymentIntents.length,
    });
    throw cancelError(409, 'no-payment');
  }
  const paymentIntentId = paymentIntents[0].id;

  let amounts;
  try {
    amounts = getRefundAmounts(await retrievePaymentIntent(paymentIntentId));
  } catch (e) {
    if (e.code === 'payment-not-captured' || e.code === 'currency-mismatch') {
      log.error(e, 'transaction-cancel-payment-not-supported', { transactionId });
      throw cancelError(409, e.code);
    }
    throw e;
  }

  const { payinTotal, payoutTotal } = tx.attributes;
  const isMatchingPayment =
    amounts.paid === payinTotal?.amount && amounts.providerShare === payoutTotal?.amount;
  if (!isMatchingPayment) {
    log.error(new Error('The Stripe payment does not match'), 'transaction-cancel-mismatch', {
      transactionId,
    });
    throw cancelError(409, 'payment-mismatch');
  }

  return { paymentIntentId, amounts };
};

/**
 * Cancels the transaction and refunds the customer the payment minus the Stripe fee.
 *
 *  1. Checks that the cancel transition is possible (speculative transition)
 *  2. Records the cancellation in the metadata (status 'refunding'), so that an interrupted one
 *     can be found and finished
 *  3. Takes back the share of the practitioner from their Stripe account (transfer reversal)
 *  4. Refunds the customer the payment minus the Stripe fee
 *  5. Cancels with the privileged transition, which stores the refund in the metadata
 *
 * Stripe calls use idempotency keys and only move what hasn't been moved yet, so a failed
 * cancellation can safely be retried.
 *
 * @param {Object} params
 * @param {Object} params.tx Transaction entity
 * @param {string} params.cancelTransition
 * @param {string} params.paymentIntentId
 * @param {Object} params.amounts See getRefundAmounts
 * @param {Object} params.trustedSdk Trusted SDK of the customer
 * @returns {Promise<Object>} The cancellation details
 */
const cancelWithRefund = async ({ tx, cancelTransition, paymentIntentId, amounts, trustedSdk }) => {
  const txId = tx.id.uuid;
  const { currency, paid, fee, refund } = amounts;
  const cancellation = {
    paidAmount: paid,
    feeAmount: fee,
    refundAmount: refund,
    currency,
    // For the emails
    paidText: formatMoney(paid, currency),
    feeText: formatMoney(fee, currency),
    refundText: formatMoney(refund, currency),
    cancelledBy: 'customer',
  };

  // 1. The cancel transition must be possible before any money is moved
  await trustedSdk.transactions.transitionSpeculative({
    id: tx.id,
    transition: cancelTransition,
    params: { metadata: { cancellation: { ...cancellation, status: 'refunded' } } },
  });

  // 2. Record the cancellation
  const startedAt = new Date().toISOString();
  await getIntegrationSdk().transactions.updateMetadata({
    id: tx.id,
    metadata: { cancellation: { ...cancellation, status: 'refunding', startedAt } },
  });

  // 3. Take back the share of the practitioner
  const reverseAmount = amounts.providerShare - amounts.alreadyReversed;
  const reversal =
    reverseAmount > 0
      ? await createTransferReversal({
          transferId: amounts.transferId,
          amount: reverseAmount,
          idempotencyKey: `cancel-reversal-${txId}`,
          metadata: { transactionId: txId },
        })
      : null;

  // 4. Refund the customer the payment minus the Stripe fee
  const refundAmount = refund - amounts.alreadyRefunded;
  const stripeRefund =
    refundAmount > 0
      ? await createRefund({
          paymentIntentId,
          amount: refundAmount,
          idempotencyKey: `cancel-refund-${txId}`,
          metadata: { transactionId: txId },
        })
      : null;

  // 5. Cancel and store the refund
  const done = {
    ...cancellation,
    status: 'refunded',
    startedAt,
    cancelledAt: new Date().toISOString(),
    stripeRefundId: stripeRefund?.id || null,
    stripeTransferReversalId: reversal?.id || null,
  };
  await trustedSdk.transactions.transition({
    id: tx.id,
    transition: cancelTransition,
    params: { metadata: { cancellation: done } },
  });

  return done;
};

module.exports = {
  cancelError,
  cancelWithRefund,
  getPaymentAndAmounts,
};
