const log = require('../log');
const { getSdk, handleError } = require('../api-util/sdk');
const { normalizeVatId, checkVatId } = require('../services/vat');

/**
 * Saves the VAT ID of the logged in user to their private data (visible only to the user and
 * the marketplace operator), checked in the EU's VIES database. Runs after middleware.auth.
 *
 * Body: { vatId } or { noVatId: true }
 * Responds with { vatId, noVatId, vatIdCheck }, or { status: 400, code: 'invalid-vat-id' }.
 */
module.exports = async (req, res) => {
  const { vatId: rawVatId, noVatId } = req.body || {};

  let privateData;
  if (noVatId === true) {
    privateData = { vatId: null, noVatId: true, vatIdCheck: null };
  } else {
    const vatId = normalizeVatId(rawVatId);
    if (!vatId) {
      return res.status(400).json({ status: 400, code: 'invalid-vat-id' });
    }
    const vatIdCheck = await checkVatId(vatId);
    privateData = { vatId, noVatId: false, vatIdCheck };
  }

  try {
    const sdk = getSdk(req, res);
    await sdk.currentUser.updateProfile({ privateData });
    return res.status(200).json(privateData);
  } catch (e) {
    log.error(e, 'save-vat-id-failed', {});
    return handleError(res, e);
  }
};
