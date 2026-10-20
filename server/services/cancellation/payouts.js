const log = require('../../log');
const {
  PAYOUT_PAID,
  PAYOUT_PENDING,
  PAYOUT_STATUS_KEY,
  createPayout,
  findPendingPayouts,
  getDestinationPaymentAvailability,
  updatePaymentIntentMetadata,
} = require('../stripe');

/**
 * Payouts of the practitioner's share of a cancelled transaction (refund share below 100%).
 *
 * The connected accounts have manual payouts, and Sharetribe only pays out completed transactions
 * (the full amount), so the server pays out what the practitioner keeps. It's paid only when this
 * transaction's own funds are available in the connected account (some days after the payment),
 * never from other funds: until then the payout waits as "pending" in the metadata of the
 * PaymentIntent, and processPendingPayouts pays it later (see ./jobs.js).
 */

// Metadata keys on the PaymentIntent with the payout details
const AMOUNT_KEY = 'bodycollective-cancellation-payout-amount';
const ACCOUNT_KEY = 'bodycollective-cancellation-payout-account';
const PAYMENT_KEY = 'bodycollective-cancellation-payout-payment';
const AVAILABLE_ON_KEY = 'bodycollective-cancellation-payout-available-on';
const PAYOUT_ID_KEY = 'bodycollective-cancellation-payout-id';

const payProviderShare = async ({
  paymentIntentId,
  transactionId,
  accountId,
  amount,
  currency,
}) => {
  const payout = await createPayout({
    accountId,
    amount,
    currency,
    // One payout per cancelled transaction
    idempotencyKey: `cancellation-payout-${transactionId}`,
    metadata: { 'sharetribe-transaction-id': transactionId },
  });
  await updatePaymentIntentMetadata(paymentIntentId, {
    [PAYOUT_STATUS_KEY]: PAYOUT_PAID,
    [PAYOUT_ID_KEY]: payout.id,
  });
  return payout;
};

/**
 * Pays out the practitioner's share now if this transaction's funds are available, or marks it
 * pending. Never throws: a failure is retried by the job.
 *
 * @param {Object} params
 * @param {string} params.paymentIntentId
 * @param {string} params.transactionId
 * @param {Object} params.amounts See cancellation.getRefundAmounts
 * @returns {Promise<{status: 'paid'|'pending'|'none', availableOn?: Date}>}
 */
const payOutOrSchedule = async ({ paymentIntentId, transactionId, amounts }) => {
  const { payout: amount, accountId, destinationPaymentId, currency } = amounts;
  if (!(amount > 0)) {
    return { status: 'none' };
  }
  const markPending = async availableOn => {
    await updatePaymentIntentMetadata(paymentIntentId, {
      [PAYOUT_STATUS_KEY]: PAYOUT_PENDING,
      [AMOUNT_KEY]: `${amount}`,
      [ACCOUNT_KEY]: accountId,
      [PAYMENT_KEY]: destinationPaymentId,
      [AVAILABLE_ON_KEY]: availableOn.toISOString(),
    });
    return { status: PAYOUT_PENDING, availableOn };
  };

  try {
    const { isAvailable, availableOn } = await getDestinationPaymentAvailability({
      accountId,
      destinationPaymentId,
    });
    if (!isAvailable) {
      return await markPending(availableOn);
    }
    await payProviderShare({ paymentIntentId, transactionId, accountId, amount, currency });
    return { status: PAYOUT_PAID };
  } catch (e) {
    log.error(e, 'cancellation-payout-failed', { transactionId });
    try {
      // Tried again by the pending payouts job
      return await markPending(new Date());
    } catch (e2) {
      log.error(e2, 'cancellation-payout-not-scheduled', { transactionId, paymentIntentId });
      return { status: 'failed' };
    }
  }
};

/**
 * Pays out the pending payouts whose funds have become available. Only Stripe is called.
 *
 * @param {Date} [now]
 * @returns {Promise<number>} Number of payouts made
 */
const processPendingPayouts = async (now = new Date()) => {
  const paymentIntents = await findPendingPayouts();
  const due = paymentIntents.filter(
    pi => new Date(pi.metadata[AVAILABLE_ON_KEY]).getTime() <= now.getTime()
  );
  let count = 0;
  for (const pi of due) {
    const { metadata, currency } = pi;
    const accountId = metadata[ACCOUNT_KEY];
    const transactionId = metadata['sharetribe-transaction-id'];
    try {
      const { isAvailable } = await getDestinationPaymentAvailability({
        accountId,
        destinationPaymentId: metadata[PAYMENT_KEY],
      });
      if (isAvailable) {
        await payProviderShare({
          paymentIntentId: pi.id,
          transactionId,
          accountId,
          amount: Number(metadata[AMOUNT_KEY]),
          currency,
        });
        count += 1;
      }
    } catch (e) {
      // Tried again on the next round
      log.error(e, 'cancellation-payout-failed', { transactionId });
    }
  }
  return count;
};

module.exports = {
  payOutOrSchedule,
  processPendingPayouts,
};
