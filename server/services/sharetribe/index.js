const { getIntegrationSdk } = require('../../api-util/sdk');

/**
 * Fetches a user by email with the Integration API. Use this on the server when there is no user
 * session, e.g. right after the signup and before the login.
 *
 * @param {string} email - The email address of the user
 * @param {Object} [params] - Optional query params (e.g. { 'fields.user': [...] })
 * @returns {Promise<Object>} The raw SDK response
 */
const getUserByEmail = async (email, params = {}) => {
  const iSdk = getIntegrationSdk();
  return iSdk.users.show({ email, ...params });
};

/**
 * Approves a user who is waiting for approval to join the marketplace. Users can't approve
 * themselves, so this is done with the Integration API (as the marketplace).
 *
 * @param {string} userId - The Sharetribe user id
 * @returns {Promise<Object>} The raw SDK response
 */
const approveUser = async userId => {
  const iSdk = getIntegrationSdk();
  return iSdk.users.approve({ id: userId }, { expand: true });
};

module.exports = {
  getUserByEmail,
  approveUser,
};
