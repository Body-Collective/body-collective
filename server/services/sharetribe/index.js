const { getIntegrationSdk } = require('../../api-util/sdk');

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
  approveUser,
};
