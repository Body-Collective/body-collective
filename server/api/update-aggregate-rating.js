const { types } = require('sharetribe-flex-sdk');

const log = require('../log');
const { handleError } = require('../api-util/sdk');
const { updateAggregateRating } = require('../services/ratings');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Adds the customer's review rating to the listing's aggregate rating, after the customer has
 * reviewed a transaction. See server/services/ratings. Runs after middleware.auth
 * (req.tokenUserId).
 *
 * Body: { transactionId }
 * Responds with { aggregateRating, numberOfRatings }, or { status, code } with code
 * 'invalid-request', 'not-allowed', 'already-updated', 'no-review' or 'no-listing'.
 */
module.exports = async (req, res) => {
  const { transactionId } = req.body || {};
  const txIdString = transactionId?.uuid || transactionId;
  if (typeof txIdString !== 'string' || !UUID_PATTERN.test(txIdString)) {
    return res.status(400).json({ status: 400, code: 'invalid-request' });
  }

  try {
    const result = await updateAggregateRating({
      transactionId: new types.UUID(txIdString),
      userId: req.tokenUserId,
    });
    return res.status(200).json(result);
  } catch (e) {
    if (e.isRatingError) {
      return res.status(e.status).json({ status: e.status, code: e.code });
    }
    log.error(e, 'aggregate-rating-failed', { transactionId: txIdString });
    return handleError(res, e);
  }
};
