/**
 * Aggregate rating of a listing, saved to the listing's metadata by the server after each
 * customer review (see server/services/ratings): aggregateRating is the average rating × 100
 * (e.g. 467 => 4.67) and numberOfRatings the number of ratings.
 */

export const RATING_MULTIPLIER = 100;

// Listing fields to fetch when the rating is shown (e.g. on listing cards)
export const LISTING_RATING_FIELDS = ['metadata.aggregateRating', 'metadata.numberOfRatings'];

/**
 * The average rating and the number of ratings of a listing, or null without ratings.
 *
 * @param {Object} listing Listing entity
 * @returns {Object|null} { rating, reviewCount }
 */
export const getListingRating = listing => {
  const { aggregateRating, numberOfRatings } = listing?.attributes?.metadata || {};
  return numberOfRatings > 0 && aggregateRating > 0
    ? { rating: aggregateRating / RATING_MULTIPLIER, reviewCount: numberOfRatings }
    : null;
};
