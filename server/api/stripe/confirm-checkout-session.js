const { getSdk, handleError } = require('../../api-util/sdk');
const { getStripe, toId } = require('../../api-util/stripe');
const { syncSubscription } = require('./subscriptionSync');

/**
 * Write the plan bought through the payment link to the logged-in user's profile right away,
 * instead of waiting for the webhook (POST /api/stripe/confirm-checkout-session).
 *
 * The payment link redirects to /account/manage-subscription?session_id={CHECKOUT_SESSION_ID},
 * and that page posts { sessionId }. Running this and the webhook both is safe: the sync re-reads
 * the subscription from Stripe.
 *
 * Responds with { subscriptionPlan, subscriptionStatus } as written to the profile, or { ok: true }
 * when the sync left the profile unchanged (e.g. the subscription was replaced by a newer one).
 */
module.exports = async (req, res) => {
  try {
    const { sessionId } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const currentUserResponse = await getSdk(req, res).currentUser.show();
    const userId = currentUserResponse.data.data.id.uuid;

    const session = await getStripe()
      .checkout.sessions.retrieve(sessionId)
      .catch(e => {
        if (e?.code === 'resource_missing') {
          return null;
        }
        throw e;
      });

    if (!session) {
      return res.status(400).json({ error: 'Checkout session not found.' });
    }

    // client_reference_id is the user id that was added to the payment link URL.
    if (session.client_reference_id !== userId) {
      return res.status(403).json({ error: 'Checkout session belongs to another user.' });
    }

    if (session.mode !== 'subscription' || !session.subscription) {
      return res.status(400).json({ error: 'Checkout session is not for a subscription.' });
    }

    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Checkout session is not complete.' });
    }

    const result = await syncSubscription(toId(session.subscription), userId);

    return res.status(200).json(result || { ok: true });
  } catch (e) {
    return handleError(res, e);
  }
};
