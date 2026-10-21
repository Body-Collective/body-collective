const { LANGUAGES, hashTexts, translateTexts } = require('./index');

/**
 * Translations of a listing's title and description, saved to the listing's public data as
 * separate top-level keys so that keyword search finds them (search schemas of type text):
 *   title_en, title_de, description_en, description_de,
 *   translationSourceLanguage, translationSourceHash
 * The listing's own title and description stay as the author wrote them.
 */

const FIELDS = ['title', 'description'];

const sourceTexts = listing => {
  const { title, description } = listing?.attributes || {};
  return { title: title || '', description: description || '' };
};

/**
 * Translates the title and description of a listing, if they changed since the last
 * translation.
 *
 * @param {Object} params
 * @param {Function} params.show Returns a promise of the listing entity
 * @param {Function} params.update Saves the given public data to the listing
 * @returns {Promise<{status: 'translated'|'unchanged'|'empty'|'outdated'}>}
 */
const translateListingWith = async ({ show, update }) => {
  const listing = await show();
  const texts = sourceTexts(listing);
  const hash = hashTexts(texts);
  if (listing.attributes.publicData?.translationSourceHash === hash) {
    return { status: 'unchanged' };
  }

  const translated = await translateTexts(texts);
  if (!translated) {
    return { status: 'empty' };
  }

  // The listing may have been edited during the translation: keep the newer one's translation
  const current = await show();
  if (hashTexts(sourceTexts(current)) !== hash) {
    return { status: 'outdated' };
  }

  const publicData = {
    translationSourceLanguage: translated.sourceLanguage,
    translationSourceHash: hash,
  };
  LANGUAGES.forEach(language => {
    FIELDS.forEach(field => {
      publicData[`${field}_${language}`] = translated[language][field] ?? texts[field] ?? null;
    });
  });
  await update(publicData);
  return { status: 'translated' };
};

/**
 * Translates the current user's own listing.
 *
 * @param {Object} params
 * @param {Object} params.sdk The SDK of the logged in user (only their own listings)
 * @param {Object} params.listingId UUID
 * @returns {Promise<Object>} See translateListingWith
 */
const translateListing = ({ sdk, listingId }) =>
  translateListingWith({
    show: () => sdk.ownListings.show({ id: listingId }).then(r => r.data.data),
    update: publicData => sdk.ownListings.update({ id: listingId, publicData }),
  });

module.exports = { translateListing, translateListingWith };
