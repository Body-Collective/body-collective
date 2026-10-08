const { getSdk, handleError } = require('../api-util/sdk');

/**
 * Authenticates the user of the request with the session cookie and returns the current user.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object (a refreshed token is saved to the cookie)
 * @returns {Promise<Object>} { currentUser, userId, userType, state }
 * @throws {Error} 401 when there is no logged in user
 */
async function authenticateUser(req, res) {
  const sdk = getSdk(req, res);
  const userResponse = await sdk.currentUser.show({
    'fields.user': ['state', 'profile.publicData.userType'],
  });
  const currentUser = userResponse?.data?.data;

  if (!currentUser) {
    const error = new Error('Unauthorized');
    error.status = 401;
    error.statusText = 'Unauthorized';
    error.data = {};
    throw error;
  }

  return {
    currentUser,
    userId: currentUser.id.uuid,
    userType: currentUser.attributes?.profile?.publicData?.userType,
    state: currentUser.attributes?.state,
  };
}

/**
 * Lets only logged in users through. Adds the user to the request:
 * `req.tokenUserId`, `req.userType` and `req.userState`.
 */
async function auth(req, res, next) {
  try {
    const { userId, userType, state } = await authenticateUser(req, res);
    req.tokenUserId = userId;
    req.userType = userType;
    req.userState = state;
    next();
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = auth;
