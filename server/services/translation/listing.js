const { LANGUAGES, hashTexts, translateTexts } = require('./index');
const { textFingerprint } = require('./fingerprint');

/**
 * Translations of a listing's texts, saved to the listing's public data:
 *  - title and description as separate top-level keys so that keyword search finds them (search
 *    schemas of type text): title_en, title_de, description_en, description_de
 *  - the formatted texts of treatment listings, the treatments (price variants) and the
 *    directions of the location in translations.<language>:
 *    { about_treatment, ..., priceVariants: [{ name, description }], directions }
 *  - translationSources: { [text id]: fingerprint } of the texts translated, so that the web app
 *    only shows a translation for the current text (see src/util/textFingerprint.js)
 *  - translationSourceLanguage, translationSourceHash
 * The listing's own texts stay as the author wrote them.
 */

const FIELDS = ['title', 'description'];

// Texts of treatment and Seminars & Events listings, see TREATMENT_TEXT_FIELDS in
// src/util/treatmentDetails.js
const TREATMENT_TEXT_KEYS = [
  'about_treatment',
  'treatment_approach',
  'treatment_supports',
  'about_event',
  'schedule',
  'for_whom',
  'included',
  'good_to_know',
];
const MAX_VARIANTS = 20;

const text = value => (typeof value === 'string' ? value : '');

const getPriceVariants = publicData =>
  (Array.isArray(publicData?.priceVariants) ? publicData.priceVariants : []).slice(0, MAX_VARIANTS);

// The texts to translate: title and description, and the other texts that are not empty
const sourceTexts = listing => {
  const { title, description, publicData } = listing?.attributes || {};
  const texts = { title: text(title), description: text(description) };
  const addMaybe = (id, value) => {
    if (text(value).trim()) {
      texts[id] = value;
    }
  };
  TREATMENT_TEXT_KEYS.forEach(key => addMaybe(key, publicData?.[key]));
  addMaybe('directions', publicData?.location?.directions);
  getPriceVariants(publicData).forEach((variant, i) => {
    addMaybe(`variant_${i}_name`, variant?.name);
    addMaybe(`variant_${i}_description`, variant?.description);
  });
  return texts;
};

// The translations of one language for publicData.translations.<language>
const listingTranslation = (translated, texts, publicData) => {
  const value = id => translated?.[id] ?? texts[id] ?? '';
  const translation = {};
  [...TREATMENT_TEXT_KEYS, 'directions'].forEach(key => {
    if (texts[key]) {
      translation[key] = value(key);
    }
  });
  const variants = getPriceVariants(publicData);
  if (variants.length > 0) {
    translation.priceVariants = variants.map((_, i) => ({
      name: value(`variant_${i}_name`),
      description: value(`variant_${i}_description`),
    }));
  }
  return translation;
};

/**
 * Translates the texts of a listing, if they changed since the last translation.
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
    translationSources: Object.keys(texts).reduce(
      (sources, id) => ({ ...sources, [id]: textFingerprint(texts[id]) }),
      {}
    ),
    translations: {},
  };
  LANGUAGES.forEach(language => {
    FIELDS.forEach(field => {
      publicData[`${field}_${language}`] = translated[language][field] ?? texts[field] ?? null;
    });
    publicData.translations[language] = listingTranslation(
      translated[language],
      texts,
      current.attributes.publicData
    );
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
