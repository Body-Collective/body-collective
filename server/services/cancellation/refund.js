const { types } = require('sharetribe-flex-sdk');

const log = require('../../log');
const { getIntegrationSdk } = require('../../api-util/sdk');
const {
  REFUND_DONE,
  REFUND_PENDING,
  REFUND_STATUS_KEY,
  createRefund,
  createTransferReversal,
  findPaymentIntentsForTransaction,
  findPendingRefunds,
  retrievePaymentIntent,
  updatePaymentIntentMetadata,
} = require('../stripe');
const { TRANSITIONS, formatMoney, getRefundAmounts } = require('./index');
const { payOutOrSchedule } = require('./payouts');

// Metadata keys on the PaymentIntent of a cancellation in progress
const REFUND_SHARE_KEY = 'bodycollective-cancellation-refund-share';
const REFUND_STARTED_AT_KEY = 'bodycollective-cancellation-refund-started-at';

// The job finishes a refund only when the request that started it has had time to finish it
const PENDING_REFUND_GRACE_MS = 10 * 60 * 1000;

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
 * The Stripe payment of the transaction and the amounts of the cancellation. The payment must
 * match the totals of the transaction, otherwise it needs manual handling.
 *
 * @param {Object} tx Transaction entity
 * @param {number} refundShare 0 to 1, see getRefundShare
 * @returns {Promise<Object>} { paymentIntentId, paymentIntentMetadata, amounts } (see
 * getRefundAmounts)
 */
const getPaymentAndAmounts = async (tx, refundShare) => {
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
  let paymentIntentMetadata;
  try {
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);
    paymentIntentMetadata = paymentIntent.metadata || {};
    amounts = getRefundAmounts(paymentIntent, refundShare);
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

  return { paymentIntentId, paymentIntentMetadata, amounts };
};

/**
 * Moves the money of a cancellation whose transition is done, and records it. Each step only
 * moves what hasn't been moved yet and uses an idempotency key, so it can be run again.
 *
 *  1. Takes back the refunded part of the practitioner's share (transfer reversal)
 *  2. Refunds the customer (refund share × (payment − Stripe fee))
 *  3. Pays out the rest of the practitioner's share, now or when the funds are available
 *  4. Records the refund in the metadata of the transaction (status 'refunded') and marks the
 *     refund of the PaymentIntent done
 *
 * @param {Object} params
 * @param {Object} params.txId Transaction id (UUID object)
 * @param {string} params.paymentIntentId
 * @param {Object} params.amounts See getRefundAmounts
 * @param {Object} params.cancellation The cancellation stored to the metadata by the transition
 * @returns {Promise<Object>} The cancellation details
 */
const finishCancellation = async ({ txId, paymentIntentId, amounts, cancellation }) => {
  const transactionId = txId.uuid;

  const reverseAmount = amounts.reversal - amounts.alreadyReversed;
  const reversal =
    reverseAmount > 0
      ? await createTransferReversal({
          transferId: amounts.transferId,
          amount: reverseAmount,
          idempotencyKey: `cancel-reversal-${transactionId}`,
          metadata: { transactionId },
        })
      : null;

  const refundAmount = amounts.refund - amounts.alreadyRefunded;
  const stripeRefund =
    refundAmount > 0
      ? await createRefund({
          paymentIntentId,
          amount: refundAmount,
          idempotencyKey: `cancel-refund-${transactionId}`,
          metadata: { transactionId },
        })
      : null;

  // Paid now or marked pending for the job; throws only if neither worked (this step is then
  // retried by the job, which never pays out twice)
  await payOutOrSchedule({ paymentIntentId, transactionId, amounts });

  const done = {
    ...cancellation,
    status: 'refunded',
    refundedAt: new Date().toISOString(),
    stripeRefundId: stripeRefund?.id || cancellation?.stripeRefundId || null,
    stripeTransferReversalId: reversal?.id || cancellation?.stripeTransferReversalId || null,
  };
  await getIntegrationSdk().transactions.updateMetadata({
    id: txId,
    metadata: { cancellation: done },
  });
  await updatePaymentIntentMetadata(paymentIntentId, { [REFUND_STATUS_KEY]: REFUND_DONE });
  return done;
};

/**
 * Cancels the transaction, refunds the customer their share and pays out what the practitioner
 * keeps.
 *
 *  1. Marks the refund pending on the PaymentIntent (with the refund share), so that the
 *     cancellation job can finish it if this request is interrupted
 *  2. Cancels with the privileged transition. This comes before any money is moved: once the
 *     transaction is cancelled, nothing else can happen to it (e.g. the order being marked
 *     delivered and paid out). The metadata gets the amounts (status 'refunding'), which the
 *     emails show.
 *  3. Moves the money and records it (finishCancellation). If that fails, the transaction stays
 *     cancelled and the job finishes the refund.
 *
 * @param {Object} params
 * @param {Object} params.tx Transaction entity
 * @param {string} params.cancelTransition
 * @param {string} params.paymentIntentId
 * @param {Object} params.paymentIntentMetadata
 * @param {Object} params.amounts See getRefundAmounts
 * @param {Object} params.trustedSdk Trusted SDK of the customer
 * @returns {Promise<Object>} The cancellation details
 */
const cancelWithRefund = async ({
  tx,
  cancelTransition,
  paymentIntentId,
  paymentIntentMetadata,
  amounts,
  trustedSdk,
}) => {
  // A cancellation of this payment already started or finished (e.g. a second click): don't
  // write over its mark. The job finishes a started one.
  if (paymentIntentMetadata?.[REFUND_STATUS_KEY]) {
    throw cancelError(409, 'already-cancelling');
  }

  const { currency, paid, fee, refund, payout, refundShare } = amounts;
  const startedAt = new Date().toISOString();
  const cancellation = {
    status: 'refunding',
    refundShare,
    paidAmount: paid,
    feeAmount: fee,
    refundAmount: refund,
    payoutAmount: payout,
    currency,
    // For the emails
    hasRefund: refund > 0,
    hasPayout: payout > 0,
    paidText: formatMoney(paid, currency),
    feeText: formatMoney(fee, currency),
    refundText: formatMoney(refund, currency),
    payoutText: formatMoney(payout, currency),
    cancelledBy: 'customer',
    cancelledAt: startedAt,
  };

  // 1. Mark the refund pending
  await updatePaymentIntentMetadata(paymentIntentId, {
    [REFUND_STATUS_KEY]: REFUND_PENDING,
    [REFUND_SHARE_KEY]: `${refundShare}`,
    [REFUND_STARTED_AT_KEY]: startedAt,
  });

  // 2. Cancel. If this fails, the pending mark stays: the job checks that the transaction isn't
  // cancelled and removes it (another request might have cancelled it at the same time).
  await trustedSdk.transactions.transition({
    id: tx.id,
    transition: cancelTransition,
    params: { metadata: { cancellation } },
  });

  // 3. Move the money
  try {
    return await finishCancellation({ txId: tx.id, paymentIntentId, amounts, cancellation });
  } catch (e) {
    log.error(e, 'transaction-cancel-refund-pending', { transactionId: tx.id.uuid });
    return cancellation;
  }
};

// The refund shares the policies can give (see ./policy.js)
const VALID_REFUND_SHARES = [0, 0.5, 1];

/**
 * Finishes the refunds of cancellations that were interrupted after the transition (see
 * cancelWithRefund). Only transactions that Sharetribe shows as cancelled by the customer are
 * refunded, with the refund share that the cancel transition stored in the transaction's
 * metadata (written in the same step as the cancellation, so it's the one that counts).
 *
 * @param {Date} [now]
 * @returns {Promise<number>} Number of refunds finished
 */
const processPendingRefunds = async (now = new Date()) => {
  const paymentIntents = await findPendingRefunds();
  let count = 0;
  for (const pi of paymentIntents) {
    const { metadata } = pi;
    const transactionId = metadata['sharetribe-transaction-id'];
    const startedAt = new Date(metadata[REFUND_STARTED_AT_KEY]).getTime();
    if (Number.isNaN(startedAt)) {
      log.error(new Error('Invalid start time'), 'transaction-cancel-refund-invalid', {
        transactionId,
      });
      continue;
    }
    if (now.getTime() - startedAt <= PENDING_REFUND_GRACE_MS) {
      continue;
    }
    try {
      const txResponse = await getIntegrationSdk().transactions.show({
        id: new types.UUID(transactionId),
      });
      const tx = txResponse.data.data;
      const { lastTransition, metadata: txMetadata = {} } = tx.attributes;
      const isCancelled = lastTransition === TRANSITIONS.CUSTOMER_CANCEL;
      if (!isCancelled) {
        // The transition never happened: nothing to refund (an empty value removes the key)
        await updatePaymentIntentMetadata(pi.id, { [REFUND_STATUS_KEY]: '' });
        continue;
      }
      const refundShare = txMetadata.cancellation?.refundShare;
      if (!VALID_REFUND_SHARES.includes(refundShare)) {
        log.error(new Error('Invalid refund share'), 'transaction-cancel-refund-invalid', {
          transactionId,
        });
        continue;
      }
      const { amounts } = await getPaymentAndAmounts(tx, refundShare);
      await finishCancellation({
        txId: tx.id,
        paymentIntentId: pi.id,
        amounts,
        cancellation: txMetadata.cancellation,
      });
      count += 1;
    } catch (e) {
      // Tried again on the next round
      log.error(e, 'transaction-cancel-refund-retry-failed', { transactionId });
    }
  }
  return count;
};

module.exports = {
  cancelError,
  cancelWithRefund,
  getPaymentAndAmounts,
  processPendingRefunds,
};
