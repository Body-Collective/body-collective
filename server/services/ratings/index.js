const log = require('../../log');
const { getIntegrationSdk } = require('../../api-util/sdk');

/**
 * Aggregate ratings of listings, shown on listing cards and the practitioner profile.
 *
 * When a customer has reviewed a transaction, their rating is added to the listing's metadata:
 *   { aggregateRating: average rating × 100 (e.g. 4.67 => 467), numberOfRatings }
 * The rating is read from the customer's review saved on the transaction (never from the
 * browser), and the transaction is marked (metadata.isAggregatedRatingUpdated) so that a rating
 * is counted once.
 */

const RATING_MULTIPLIER = 100;

const ratingError = (status, code) => {
  const error = new Error(code);
  error.status = status;
  error.code = code;
  error.isRatingError = true;
  return error;
};

const findIncluded = (included, type, id) =>
  included.find(i => i.type === type && i.id.uuid === id?.uuid) || null;

/**
 * The rating of the customer's review of the provider in a transaction, or null.
 *
 * @param {Object} tx Transaction entity
 * @param {Array<Object>} included
 * @returns {number|null} 1 to 5
 */
const getCustomerRating = (tx, included) => {
  const customerId = tx.relationships?.customer?.data?.id?.uuid;
  const reviewRefs = tx.relationships?.reviews?.data || [];
  const review = reviewRefs
    .map(ref => findIncluded(included, 'review', ref.id))
    .find(
      r =>
        r?.attributes?.type === 'ofProvider' &&
        r?.relationships?.author?.data?.id?.uuid === customerId
    );
  const rating = review?.attributes?.rating;
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
};

/**
 * The new aggregate rating of a listing with one more rating.
 *
 * @param {Object} metadata Listing metadata
 * @param {number} rating
 * @returns {Object} { aggregateRating, numberOfRatings }
 */
const addRating = (metadata, rating) => {
  const { aggregateRating = 0, numberOfRatings = 0 } = metadata || {};
  const count = Number.isInteger(numberOfRatings) && numberOfRatings > 0 ? numberOfRatings : 0;
  const average = count > 0 ? aggregateRating / RATING_MULTIPLIER : 0;
  const newAverage = (average * count + rating) / (count + 1);
  return {
    aggregateRating: Math.round(newAverage * RATING_MULTIPLIER),
    numberOfRatings: count + 1,
  };
};

/**
 * Adds the customer's review rating of a transaction to the listing's aggregate rating.
 *
 * @param {Object} params
 * @param {string} params.transactionId
 * @param {string} params.userId The logged in user: must be the customer
 * @returns {Promise<Object>} { aggregateRating, numberOfRatings }
 */
const updateAggregateRating = async ({ transactionId, userId }) => {
  const iSdk = getIntegrationSdk();
  const txResponse = await iSdk.transactions.show({
    id: transactionId,
    include: ['listing', 'customer', 'reviews', 'reviews.author'],
  });
  const tx = txResponse.data.data;
  const included = txResponse.data.included || [];

  if (tx.relationships?.customer?.data?.id?.uuid !== userId) {
    throw ratingError(403, 'not-allowed');
  }
  if (tx.attributes.metadata?.isAggregatedRatingUpdated) {
    throw ratingError(409, 'already-updated');
  }
  const rating = getCustomerRating(tx, included);
  if (!rating) {
    throw ratingError(409, 'no-review');
  }
  const listingRef = tx.relationships?.listing?.data;
  const listing = findIncluded(included, 'listing', listingRef?.id);
  if (!listing) {
    throw ratingError(409, 'no-listing');
  }

  // Marked first, so that a repeated request can't count the rating twice
  await iSdk.transactions.updateMetadata({
    id: tx.id,
    metadata: { isAggregatedRatingUpdated: true },
  });

  const updated = addRating(listing.attributes.metadata, rating);
  try {
    await iSdk.listings.update({ id: listing.id, metadata: updated });
  } catch (e) {
    // Not counted: let a later request try again
    await iSdk.transactions
      .updateMetadata({ id: tx.id, metadata: { isAggregatedRatingUpdated: false } })
      .catch(e2 => log.error(e2, 'aggregate-rating-unmark-failed', { transactionId }));
    throw e;
  }
  return updated;
};

module.exports = {
  RATING_MULTIPLIER,
  addRating,
  getCustomerRating,
  updateAggregateRating,
};
