/**
 * Stripe client and subscription plan config.
 *
 * There is one paid plan, "Professional", sold through a Stripe payment link. Without a
 * subscription a user is on "Essential", which is free and has no Stripe subscription.
 */
const Stripe = require('stripe');

const { STRIPE_SECRET_KEY } = process.env;

const PLAN_PROFESSIONAL = 'professional';

// Subscription statuses that keep the plan's benefits. past_due keeps them while Stripe
// retries the payment; canceled, unpaid, incomplete(_expired) and paused don't.
const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due'];

let stripeClient = null;
const getStripe = () => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY);
  }
  return stripeClient;
};

// Stripe returns an id string, or the expanded object when it's been expanded.
const toId = value => (value && typeof value === 'object' ? value.id : value) || null;

module.exports = {
  PLAN_PROFESSIONAL,
  ACTIVE_SUBSCRIPTION_STATUSES,
  getStripe,
  toId,
};
