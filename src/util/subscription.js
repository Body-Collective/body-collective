/**
 * Subscription plans.
 *
 * Essential is free and the default. Professional is a Stripe subscription: the webhook and the
 * checkout confirmation (server/api/stripe/subscriptionSync.js) write it to `profile.metadata`,
 * which only the marketplace can edit. A missing `subscriptionPlan` therefore means Essential.
 */

export const PLAN_ESSENTIAL = 'essential';
export const PLAN_PROFESSIONAL = 'professional';

// Only this user type (see Console: Users -> User types) has plans, so only they get the
// Manage subscription tab in account settings.
export const SUBSCRIPTION_USER_TYPE = 'practitioner';

/**
 * @typedef {Object} Subscription
 * @property {string} plan 'essential' or 'professional'
 * @property {string|null} status Stripe subscription status, e.g. 'active', 'past_due', 'canceled'
 * @property {boolean} cancelAtPeriodEnd True when the subscription was cancelled but still runs
 * @property {string|null} currentPeriodEnd ISO date the current billing period ends
 * @property {boolean} hasBillingAccount True when the user can open the Stripe billing portal
 */

/**
 * @param {Object} currentUser current user entity
 * @returns {Subscription}
 */
export const getSubscription = currentUser => {
  const metadata = currentUser?.attributes?.profile?.metadata || {};
  return {
    plan: metadata.subscriptionPlan === PLAN_PROFESSIONAL ? PLAN_PROFESSIONAL : PLAN_ESSENTIAL,
    status: metadata.subscriptionStatus || null,
    cancelAtPeriodEnd: !!metadata.subscriptionCancelAtPeriodEnd,
    currentPeriodEnd: metadata.subscriptionCurrentPeriodEnd || null,
    hasBillingAccount: !!metadata.stripeCustomerId,
  };
};

/**
 * The Stripe payment link for the Professional plan, with the user added to it. Stripe sends
 * `client_reference_id` back with the checkout, which is how the webhook knows whose plan to
 * update.
 *
 * @param {Object} currentUser current user entity
 * @returns {string|null} URL, or null when the payment link isn't configured
 */
export const getProfessionalPaymentLinkUrl = currentUser => {
  const paymentLink = process.env.REACT_APP_STRIPE_PROFESSIONAL_PAYMENT_LINK;
  const userId = currentUser?.id?.uuid;
  if (!paymentLink || !userId) {
    return null;
  }

  const url = new URL(paymentLink);
  url.searchParams.set('client_reference_id', userId);
  const email = currentUser?.attributes?.email;
  if (email) {
    url.searchParams.set('prefilled_email', email);
  }
  return url.toString();
};

/**
 * Whether the account settings show the Manage subscription tab for this user.
 *
 * @param {Object} currentUser current user entity
 * @returns {boolean}
 */
export const showManageSubscriptionForUser = currentUser =>
  currentUser?.attributes?.profile?.publicData?.userType === SUBSCRIPTION_USER_TYPE;
