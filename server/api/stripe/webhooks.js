const { getStripe, toId } = require('../../api-util/stripe');
const log = require('../../log');
const { syncSubscription } = require('./subscriptionSync');

const { STRIPE_WEBHOOK_SECRET } = process.env;

const SUBSCRIPTION_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
];

/**
 * Stripe webhook endpoint (POST /api/stripe/webhooks) for subscriptions.
 *
 * Register it in the Stripe Dashboard (Developers -> Webhooks) with these events:
 *   checkout.session.completed
 *   customer.subscription.created / updated / deleted / paused / resumed
 *
 * It responds with 500 when syncing fails, so Stripe retries the event.
 */
module.exports = async (req, res) => {
  let event;
  try {
    // server/index.js keeps the raw body when a global JSON parser runs first (CSP enabled).
    // Otherwise express.raw on this route gives a Buffer body.
    const payload = req.rawBody || req.body;
    event = getStripe().webhooks.constructEvent(
      payload,
      req.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    log.error(e, 'stripe-webhook-signature-failed');
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    const object = event.data.object;

    if (event.type === 'checkout.session.completed') {
      // client_reference_id is the Sharetribe user id, added to the payment link URL.
      if (object.mode === 'subscription' && object.subscription) {
        await syncSubscription(toId(object.subscription), object.client_reference_id);
      }
    } else if (SUBSCRIPTION_EVENTS.includes(event.type)) {
      await syncSubscription(object.id);
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    log.error(e, 'stripe-webhook-handling-failed', { type: event.type, id: event.id });
    return res.status(500).json({ error: 'Webhook handling failed' });
  }
};
