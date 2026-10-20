const log = require('../../log');
const {
  PAYOUT_PAID,
  PAYOUT_PENDING,
  PAYOUT_STATUS_KEY,
  createPayout,
  findPayoutForTransaction,
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
 *
 * There is at most one payout per transaction: before paying, the connected account's payouts are
 * checked for one with the transaction id, so a payout is never made twice, even when recording
 * it failed.
 */

// Metadata keys on the PaymentIntent with the payout details
const AMOUNT_KEY = 'bodycollective-cancellation-payout-amount';
const ACCOUNT_KEY = 'bodycollective-cancellation-payout-account';
const PAYMENT_KEY = 'bodycollective-cancellation-payout-payment';
const AVAILABLE_ON_KEY = 'bodycollective-cancellation-payout-available-on';
const PAYOUT_ID_KEY = 'bodycollective-cancellation-payout-id';

const payoutError = message => {
  const error = new Error(message);
  error.isPayoutError = true;
  return error;
};

/**
 * Pays out the practitioner's share once (see above) and records it on the PaymentIntent.
 * Requires the funds to be available and in the currency of the payment.
 */
const payProviderShare = async ({
  paymentIntentId,
  transactionId,
  accountId,
  amount,
  currency,
  fundsCurrency,
}) => {
  if (!(Number.isInteger(amount) && amount > 0)) {
    throw payoutError(`Invalid payout amount: ${amount}`);
  }
  if (fundsCurrency && fundsCurrency !== currency) {
    // The connected account holds the funds in another currency: needs manual handling
    throw payoutError(`Payout currency ${currency} differs from the funds (${fundsCurrency})`);
  }
  const payout =
    (await findPayoutForTransaction({ accountId, transactionId })) ||
    (await createPayout({
      accountId,
      amount,
      currency,
      idempotencyKey: `cancellation-payout-${transactionId}`,
      metadata: { 'sharetribe-transaction-id': transactionId },
    }));
  await updatePaymentIntentMetadata(paymentIntentId, {
    [PAYOUT_STATUS_KEY]: PAYOUT_PAID,
    [PAYOUT_ID_KEY]: payout.id,
  });
  return payout;
};

/**
 * Pays out the practitioner's share now if this transaction's funds are available, or marks it
 * pending for the job. Throws only if neither worked, so that the caller is retried.
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
    const availability = await getDestinationPaymentAvailability({
      accountId,
      destinationPaymentId,
    });
    if (!availability.isAvailable) {
      return await markPending(availability.availableOn);
    }
    await payProviderShare({
      paymentIntentId,
      transactionId,
      accountId,
      amount,
      currency,
      fundsCurrency: availability.currency,
    });
    return { status: PAYOUT_PAID };
  } catch (e) {
    log.error(e, 'cancellation-payout-failed', { transactionId });
    // Retried by the job. If this fails too, the error goes to the caller, which keeps the
    // refund pending so that the job runs the whole step again.
    return markPending(new Date());
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
  let count = 0;
  for (const pi of paymentIntents) {
    const { metadata, currency } = pi;
    const transactionId = metadata['sharetribe-transaction-id'];
    const availableOn = new Date(metadata[AVAILABLE_ON_KEY]).getTime();
    // An unreadable date is tried now (the funds are checked anyway)
    if (!Number.isNaN(availableOn) && availableOn > now.getTime()) {
      continue;
    }
    try {
      const accountId = metadata[ACCOUNT_KEY];
      const availability = await getDestinationPaymentAvailability({
        accountId,
        destinationPaymentId: metadata[PAYMENT_KEY],
      });
      if (availability.isAvailable) {
        await payProviderShare({
          paymentIntentId: pi.id,
          transactionId,
          accountId,
          amount: Number(metadata[AMOUNT_KEY]),
          currency,
          fundsCurrency: availability.currency,
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
