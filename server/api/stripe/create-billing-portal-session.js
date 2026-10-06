const { getSdk, handleError } = require('../../api-util/sdk');
const { getStripe } = require('../../api-util/stripe');

const { REACT_APP_MARKETPLACE_ROOT_URL } = process.env;

/**
 * Open the Stripe customer portal for the logged-in user, where they can update the card, see
 * invoices and cancel the subscription (POST /api/stripe/create-billing-portal-session).
 * Responds with { url }. The portal returns the user to the Manage subscription page.
 *
 * What the portal allows is configured in the Stripe Dashboard
 * (Settings -> Billing -> Customer portal).
 */
module.exports = async (req, res) => {
  try {
    const currentUserResponse = await getSdk(req, res).currentUser.show();
    // Only the marketplace can write profile metadata, so this id can be trusted.
    const customerId = currentUserResponse.data.data.attributes.profile.metadata?.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ error: 'No subscription found for this account.' });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${REACT_APP_MARKETPLACE_ROOT_URL}/account/manage-subscription`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    return handleError(res, e);
  }
};
