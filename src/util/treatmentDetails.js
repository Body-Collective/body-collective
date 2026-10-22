import { getContentLanguage } from './localizedContent';
import { isTranslationCurrent } from './textFingerprint';

/**
 * Details of treatment listings (listing types Studio and Mobile Service): formatted texts
 * written with the rich text editor (see util/formattedText.js) and the treatments with their
 * descriptions, durations and prices (the listing's price variants).
 *
 * The text fields are listing fields in Console (public data, text). Their labels and help texts
 * come from translations here, so that the form is in the user's language. The server translates
 * the texts and the price variants' names and descriptions (see server/services/translation/listing.js)
 * to publicData.translations.<language>.
 */

export const TREATMENT_LISTING_TYPES = ['daily_booking', 'mobile_service'];

// The formatted text fields in the order of the form and the listing page. messageKey is the
// part of the translation keys: EditListingDetailsForm.<messageKey>.* and ListingPage.<messageKey>
export const ABOUT_TREATMENT = { key: 'about_treatment', messageKey: 'aboutTreatment' };
export const TREATMENT_APPROACH = { key: 'treatment_approach', messageKey: 'treatmentApproach' };
export const TREATMENT_SUPPORTS = { key: 'treatment_supports', messageKey: 'treatmentSupports' };
// Plain multi-line text (no formatting toolbar)
export const GOOD_TO_KNOW = { key: 'good_to_know', messageKey: 'goodToKnow', isPlainText: true };
export const TREATMENT_TEXT_FIELDS = [
  ABOUT_TREATMENT,
  TREATMENT_APPROACH,
  TREATMENT_SUPPORTS,
  GOOD_TO_KNOW,
];
export const TREATMENT_TEXT_FIELD_KEYS = TREATMENT_TEXT_FIELDS.map(f => f.key);

/**
 * @param {string} listingType
 * @returns {boolean}
 */
export const isTreatmentListingType = listingType => TREATMENT_LISTING_TYPES.includes(listingType);

/**
 * The formatted text field of the given listing field key, or undefined.
 *
 * @param {string} key Listing field key
 * @returns {Object|undefined} { key, messageKey }
 */
export const getTreatmentTextField = key => TREATMENT_TEXT_FIELDS.find(f => f.key === key);

const nonEmpty = value => (typeof value === 'string' && value.trim() !== '' ? value : null);

// Translated texts of the listing in the visitor's language, or an empty object
const getListingTranslation = (publicData, intl) => {
  // In the language the listing was written in, the original is shown
  const language = getContentLanguage(intl);
  const isOriginalLanguage = language === publicData?.translationSourceLanguage;
  const translation = language && !isOriginalLanguage ? publicData?.translations?.[language] : null;
  return translation && typeof translation === 'object' ? translation : {};
};

/**
 * A formatted text field of the listing in the visitor's language (the original without a
 * translation).
 *
 * @param {Object} publicData
 * @param {string} key Listing field key
 * @param {Object} intl
 * @returns {string}
 */
export const getTreatmentText = (publicData, key, intl) => {
  const original = typeof publicData?.[key] === 'string' ? publicData[key] : '';
  const translated = nonEmpty(getListingTranslation(publicData, intl)[key]);
  return (translated && isTranslationCurrent(publicData, key, original) && translated) || original;
};

/**
 * The treatments of the listing (its price variants) in the visitor's language. A translation is
 * only used when it was made from the variant's current text.
 *
 * @param {Object} publicData
 * @param {Object} intl
 * @returns {Array<{ name: string, description: string, bookingLengthInMinutes: number|null, priceInSubunits: number }>}
 */
export const getTreatmentPackages = (publicData, intl) => {
  const variants = Array.isArray(publicData?.priceVariants) ? publicData.priceVariants : [];
  const translated = getListingTranslation(publicData, intl).priceVariants;
  const translations = Array.isArray(translated) ? translated : [];
  // A translation made from the variant's current text, or the original
  const text = (translation, id, original) =>
    (nonEmpty(translation) && isTranslationCurrent(publicData, id, original) && translation) ||
    original ||
    '';

  return variants
    .map((variant, i) => ({
      name: text(translations[i]?.name, `variant_${i}_name`, variant?.name),
      description: text(
        translations[i]?.description,
        `variant_${i}_description`,
        variant?.description
      ),
      bookingLengthInMinutes: Number.isInteger(variant?.bookingLengthInMinutes)
        ? variant.bookingLengthInMinutes
        : null,
      priceInSubunits: variant?.priceInSubunits,
    }))
    .filter(treatment => Number.isInteger(treatment.priceInSubunits));
};
