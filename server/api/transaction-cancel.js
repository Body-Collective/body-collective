const { types } = require('sharetribe-flex-sdk');

const log = require('../log');
const { createCookieTokenStore, getSdk, getTrustedSdk, handleError } = require('../api-util/sdk');
const { getCancelError, getCancelTransition, getStartTime } = require('../services/cancellation');
const { cancelWithRefund, getPaymentAndAmounts } = require('../services/cancellation/refund');

/**
 * Customer cancellation with a refund of the payment minus the Stripe fee: an accepted booking
 * (Studio, Mobile Service) or a purchased place (Seminars & Events), until 7 days before the start.
 * See server/services/cancellation/policy.js. Runs after middleware.auth (req.tokenUserId).
 *
 * Body:
 *  - transactionId
 *  - action: 'preview' (the amounts, nothing changes) or 'cancel'
 *
 * Responds with { currency, paid, fee, refund } (minor units), and the transition when cancelled.
 * Errors: { status, code } with code 'invalid-request', 'not-allowed', 'no-start-time',
 * 'too-late', 'no-payment', 'payment-not-captured', 'currency-mismatch', 'payment-mismatch' or
 * 'cancel-failed'.
 */

const ACTIONS = ['preview', 'cancel'];

const fail = (res, status, code) => res.status(status).json({ status, code });

const findIncluded = (txData, included, relationship) => {
  const ref = txData.relationships?.[relationship]?.data;
  return ref ? included.find(i => i.type === ref.type && i.id.uuid === ref.id.uuid) : null;
};

module.exports = async (req, res) => {
  const { transactionId, action } = req.body || {};
  const userId = req.tokenUserId;
  const txIdString = transactionId?.uuid || transactionId;

  if (!txIdString || typeof txIdString !== 'string' || !ACTIONS.includes(action)) {
    return fail(res, 400, 'invalid-request');
  }

  try {
    // The SDK of the user: they only see their own transactions. The trusted SDK is only used for
    // the privileged cancel transition. Both share one cookie token store.
    const tokenStore = createCookieTokenStore(req, res);
    const sdk = getSdk(req, res, tokenStore);
    const txResponse = await sdk.transactions.show({
      id: new types.UUID(txIdString),
      include: ['booking', 'listing', 'customer', 'provider'],
    });
    const { data: tx, included = [] } = txResponse.data;
    const { processName, lastTransition } = tx.attributes;
    const customerId = tx.relationships?.customer?.data?.id?.uuid;
    const providerId = tx.relationships?.provider?.data?.id?.uuid;
    const role = userId === customerId ? 'customer' : userId === providerId ? 'provider' : null;

    const cancelTransition = getCancelTransition(processName, lastTransition);
    const startTime = getStartTime({
      processName,
      booking: findIncluded(tx, included, 'booking'),
      listing: findIncluded(tx, included, 'listing'),
    });
    const error = getCancelError({ role, cancelTransition, startTime, now: new Date() });
    if (error) {
      return fail(res, 403, error);
    }

    const { paymentIntentId, amounts } = await getPaymentAndAmounts(tx);
    const { currency, paid, fee, refund } = amounts;
    if (action === 'preview') {
      return res.status(200).json({ currency, paid, fee, refund });
    }

    const trustedSdk = await getTrustedSdk(req, res, tokenStore);
    await cancelWithRefund({ tx, cancelTransition, paymentIntentId, amounts, trustedSdk });
    return res.status(200).json({ transition: cancelTransition, currency, paid, fee, refund });
  } catch (e) {
    if (e.isCancelError) {
      return fail(res, e.status, e.code);
    }
    // Stripe errors (and missing configuration) carry details that shouldn't reach the browser
    if (!e.status) {
      log.error(e, 'transaction-cancel-failed', { transactionId: txIdString });
      return fail(res, 500, 'cancel-failed');
    }
    return handleError(res, e);
  }
};
