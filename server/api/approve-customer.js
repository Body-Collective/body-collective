const { handleError } = require('../api-util/sdk');
const { approveUser, getUserByEmail } = require('../services/sharetribe');

// Users of this type join the marketplace without a review. Practitioners are approved by hand.
const AUTO_APPROVED_USER_TYPE = 'customer';
const PENDING_APPROVAL = 'pendingApproval';

/**
 * Approves a customer right after the signup and before the login, so that customers can use the
 * marketplace at once. Practitioners stay waiting until an operator approves them in Console.
 *
 * Body: { email } of the new user.
 * Responds with { userId, state }: 400 without an email, 403 when the user is not a customer.
 */
module.exports = async (req, res) => {
  const email = req.body?.email;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    const userResponse = await getUserByEmail(email.trim(), {
      'fields.user': ['state', 'profile.publicData.userType'],
    });
    const user = userResponse?.data?.data;
    const userId = user?.id?.uuid;
    const { state, profile } = user?.attributes || {};

    if (profile?.publicData?.userType !== AUTO_APPROVED_USER_TYPE) {
      return res.status(403).json({ error: 'Only customers are approved automatically.' });
    }
    // Nothing to do, e.g. the user is already approved
    if (state !== PENDING_APPROVAL) {
      return res.status(200).json({ userId, state });
    }

    const approveResponse = await approveUser(userId);
    res.status(200).json({ userId, state: approveResponse?.data?.data?.attributes?.state });
  } catch (error) {
    handleError(res, error);
  }
};
