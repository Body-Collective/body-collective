const { types } = require('sharetribe-flex-sdk');

const log = require('../log');
const { getSdk } = require('../api-util/sdk');
const { isConfigured } = require('../services/translation/openai');
const { translateListing } = require('../services/translation/listing');
const { translateProfile } = require('../services/translation/profile');

/**
 * Translations of user content (see server/services/translation). Run after middleware.auth.
 *
 *  - POST /api/translate/listing { listingId }: the current user's own listing
 *  - POST /api/translate/profile: the current user's profile
 *
 * The texts are read from Sharetribe with the user's SDK (never taken from the request), so a
 * user can only translate their own content. Responds with { status }, or { status, code } with
 * code 'invalid-request', 'not-configured' or 'translation-failed'. OpenAI errors are only
 * logged.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const run = (kind, req, res, translate) => {
  if (!isConfigured()) {
    return res.status(503).json({ status: 503, code: 'not-configured' });
  }
  const sdk = getSdk(req, res);
  return translate(sdk)
    .then(result => res.status(200).json(result))
    .catch(e => {
      if (e?.status === 404 || e?.status === 403) {
        return res.status(e.status).json({ status: e.status, code: 'not-found' });
      }
      log.error(e, `translate-${kind}-failed`, { code: e?.code });
      return res.status(500).json({ status: 500, code: 'translation-failed' });
    });
};

const listing = (req, res) => {
  const { listingId } = req.body || {};
  const idString = listingId?.uuid || listingId;
  if (typeof idString !== 'string' || !UUID_PATTERN.test(idString)) {
    return res.status(400).json({ status: 400, code: 'invalid-request' });
  }
  return run('listing', req, res, sdk =>
    translateListing({ sdk, listingId: new types.UUID(idString) })
  );
};

const profile = (req, res) => run('profile', req, res, sdk => translateProfile({ sdk }));

module.exports = { listing, profile };
