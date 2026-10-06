const { getIntegrationSdk, integrationTypes } = require('../../api-util/sdk');
const {
  PLAN_PROFESSIONAL,
  ACTIVE_SUBSCRIPTION_STATUSES,
  getStripe,
  toId,
} = require('../../api-util/stripe');
const log = require('../../log');

const { UUID } = integrationTypes;

const retrieveSubscriptionMaybe = (stripe, id) =>
  stripe.subscriptions.retrieve(id).catch(e => {
    if (e?.code === 'resource_missing') {
      return null;
    }
    throw e;
  });

// Cancel immediately, without proration. A payment link creates a new Stripe customer for every
// checkout, so a proration credit would land on a customer the user no longer uses.
const cancelReplacedSubscription = async (stripe, id, replacedById) => {
  await stripe.subscriptions.update(id, { metadata: { replacedBy: replacedById } });
  await stripe.subscriptions.cancel(id);
  console.log(`Cancelled subscription ${id}, replaced by ${replacedById}`);
};

// With newer Stripe API versions the billing period is on the subscription item.
const getPeriodEnd = subscription => {
  const seconds =
    subscription.items?.data?.[0]?.current_period_end || subscription.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
};

/**
 * Write the current state of a Stripe subscription to the user's Sharetribe profile.
 *
 * It always re-reads the subscription from Stripe, so events arriving out of order or more than
 * once end in the same state.
 *
 * profile.metadata (only the marketplace can write it, so users can't give themselves a plan):
 *   subscriptionPlan: 'professional' while the subscription keeps its benefits, otherwise removed
 *   subscriptionStatus: Stripe status, e.g. 'active', 'past_due' or 'canceled'
 *   subscriptionCancelAtPeriodEnd, subscriptionCurrentPeriodEnd
 *   stripeCustomerId, stripeSubscriptionId: used to open the billing portal
 *
 * @param {string} subscriptionId - Stripe subscription id
 * @param {string} [fallbackUserId] - Sharetribe user id, e.g. from the checkout client_reference_id
 * @returns {Promise<Object|undefined>} { subscriptionPlan, subscriptionStatus } as written to the
 *   profile (subscriptionPlan null when cleared), or undefined when the profile wasn't changed
 */
const syncSubscription = async (subscriptionId, fallbackUserId) => {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const userId = subscription.metadata?.userId || fallbackUserId;
  if (!userId) {
    // A subscription that didn't come through our payment link (e.g. made in the Stripe Dashboard)
    log.error(
      new Error('No Sharetribe user id for subscription'),
      'stripe-subscription-sync-no-user',
      { subscriptionId }
    );
    return;
  }

  // Payment links can't set per-user subscription metadata. Stamp it here so later subscription
  // events (renewal, cancellation) can find the user.
  if (!subscription.metadata?.userId) {
    await stripe.subscriptions.update(subscription.id, {
      metadata: { ...subscription.metadata, userId },
    });
  }

  const iSdk = getIntegrationSdk();
  const userResponse = await iSdk.users.show({ id: new UUID(userId) });
  const user = userResponse.data.data;
  const currentSubscriptionId = user?.attributes?.profile?.metadata?.stripeSubscriptionId;

  const isActive = ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
  const customerId = toId(subscription.customer);

  if (isActive) {
    // Buying the payment link twice creates a second subscription. The newest active one wins and
    // the other is cancelled, so the user isn't billed twice.
    if (currentSubscriptionId && currentSubscriptionId !== subscription.id) {
      const current = await retrieveSubscriptionMaybe(stripe, currentSubscriptionId);
      if (current && ACTIVE_SUBSCRIPTION_STATUSES.includes(current.status)) {
        if (current.created > subscription.created) {
          // This event is for the older subscription: it's the one being replaced.
          await cancelReplacedSubscription(stripe, subscription.id, current.id);
          return;
        }
        await cancelReplacedSubscription(stripe, current.id, subscription.id);
      }
    }

    await iSdk.users.updateProfile({
      id: user.id,
      metadata: {
        subscriptionPlan: PLAN_PROFESSIONAL,
        subscriptionStatus: subscription.status,
        subscriptionCancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        subscriptionCurrentPeriodEnd: getPeriodEnd(subscription),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
      },
    });
    return { subscriptionPlan: PLAN_PROFESSIONAL, subscriptionStatus: subscription.status };
  }

  // An inactive subscription only ends the plan if it's the one the user is on.
  // E.g. an abandoned second checkout must not cancel a working plan.
  if (currentSubscriptionId && currentSubscriptionId !== subscription.id) {
    return;
  }

  // Setting a metadata key to null removes it. The customer id stays, so the user can still open
  // the billing portal for invoices and to subscribe again.
  await iSdk.users.updateProfile({
    id: user.id,
    metadata: {
      subscriptionPlan: null,
      subscriptionStatus: subscription.status,
      subscriptionCancelAtPeriodEnd: null,
      subscriptionCurrentPeriodEnd: null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
    },
  });
  return { subscriptionPlan: null, subscriptionStatus: subscription.status };
};

module.exports = { syncSubscription };
