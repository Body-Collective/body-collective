const { handleError } = require('../api-util/sdk');
const { approveUser } = require('../services/sharetribe');

// Users of this type join the marketplace without a review. Practitioners are approved by hand.
const AUTO_APPROVED_USER_TYPE = 'customer';
const PENDING_APPROVAL = 'pendingApproval';

/**
 * Approves the logged in customer right after the signup, so that customers can use the
 * marketplace at once. Practitioners stay waiting until an operator approves them in Console.
 *
 * Runs after `middleware.auth`, which adds the user of the session to the request.
 * Responds with { userId, state }.
 */
module.exports = async (req, res) => {
  const { tokenUserId: userId, userType, userState } = req;

  if (userType !== AUTO_APPROVED_USER_TYPE) {
    return res.status(403).json({ error: 'Only customers are approved automatically.' });
  }
  // Nothing to do, e.g. the user is already approved
  if (userState !== PENDING_APPROVAL) {
    return res.status(200).json({ userId, state: userState });
  }

  try {
    const response = await approveUser(userId);
    const state = response?.data?.data?.attributes?.state;
    res.status(200).json({ userId, state });
  } catch (error) {
    handleError(res, error);
  }
};
