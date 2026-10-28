import { getContentLanguage } from './localizedContent';
import { isTranslationCurrent } from './textFingerprint';
import { formatMoneyAmountFirst } from './currency';
import { types as sdkTypes } from './sdkLoader';

const { Money } = sdkTypes;

/**
 * Details of treatment listings (listing types Studio and Mobile Service) and of Seminars & Events:
 * formatted texts written with the rich text editor (see util/formattedText.js) and, for
 * treatments, the treatments with their descriptions, durations and prices (the listing's price
 * variants).
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
// Plain multi-line text (no formatting toolbar). Treatments and Seminars & Events.
export const GOOD_TO_KNOW = { key: 'good_to_know', messageKey: 'goodToKnow', isPlainText: true };

// Seminars & Events: about the event (open text on the listing, its heading follows the event
// type: "About this retreat"), and the programme, who it is for and what's included (dropdowns)
export const ABOUT_EVENT = { key: 'about_event', messageKey: 'aboutEvent' };
export const SCHEDULE = { key: 'schedule', messageKey: 'schedule' };
export const FOR_WHOM = { key: 'for_whom', messageKey: 'forWhom' };
export const INCLUDED = { key: 'included', messageKey: 'included' };

export const TREATMENT_TEXT_FIELDS = [
  ABOUT_TREATMENT,
  TREATMENT_APPROACH,
  TREATMENT_SUPPORTS,
  ABOUT_EVENT,
  SCHEDULE,
  FOR_WHOM,
  INCLUDED,
  GOOD_TO_KNOW,
];
// Keys of all formatted text fields (treatments and Seminars & Events)
export const TREATMENT_TEXT_FIELD_KEYS = TREATMENT_TEXT_FIELDS.map(f => f.key);

/**
 * A listing query for treatments (pub_listingType=daily_booking, e.g. of a section in Console)
 * asks for all treatments: Studio and Mobile Service listings.
 *
 * @param {string?} query Query string
 * @returns {string?} Query string
 */
export const withAllTreatmentListingTypes = query => {
  if (!query) {
    return query;
  }
  const params = new URLSearchParams(query);
  if (params.get('pub_listingType') !== TREATMENT_LISTING_TYPES[0]) {
    return query;
  }
  params.set('pub_listingType', TREATMENT_LISTING_TYPES.join(','));
  return params.toString();
};

/**
 * @param {string} listingType
 * @returns {boolean}
 */
export const isTreatmentListingType = listingType => TREATMENT_LISTING_TYPES.includes(listingType);

// The description of treatment and seminar listings is a short description (one sentence)
export const SHORT_DESCRIPTION_MAX_LENGTH = 150;

/**
 * Listings created before the short description: their description is a long text that doesn't
 * fit the short description. The form then shows it in "About this treatment" / "About this
 * seminar" (if that is empty) and proposes its first sentence as the short description (empty
 * when the sentence is too long), so the listing can be saved again.
 *
 * @param {string} description The listing's description
 * @param {Object} publicData The listing's public data
 * @param {string} aboutKey Listing field key of the about text, e.g. 'about_treatment'
 * @returns {Object|null} { description, about } or null when the description fits
 */
export const getLegacyDescriptionValues = (description, publicData, aboutKey) => {
  if (typeof description !== 'string' || description.length <= SHORT_DESCRIPTION_MAX_LENGTH) {
    return null;
  }
  const firstSentence = description
    .trim()
    .split(/(?<=[.!?])\s+|\n/)[0]
    .trim();
  const hasAbout = typeof publicData?.[aboutKey] === 'string' && publicData[aboutKey].trim();
  return {
    description: firstSentence.length <= SHORT_DESCRIPTION_MAX_LENGTH ? firstSentence : '',
    about: hasAbout ? publicData[aboutKey] : description.trim(),
  };
};

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

// The treatments in the order of the listing's price variants, with prices or not
const getTreatmentsOfVariants = (publicData, intl) => {
  const variants = Array.isArray(publicData?.priceVariants) ? publicData.priceVariants : [];
  const translated = getListingTranslation(publicData, intl).priceVariants;
  const translations = Array.isArray(translated) ? translated : [];
  // A translation made from the variant's current text, or the original
  const text = (translation, id, original) =>
    (nonEmpty(translation) && isTranslationCurrent(publicData, id, original) && translation) ||
    original ||
    '';

  return variants.map((variant, i) => ({
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
  }));
};

/**
 * The treatments of the listing (its price variants) in the visitor's language. A translation is
 * only used when it was made from the variant's current text.
 *
 * @param {Object} publicData
 * @param {Object} intl
 * @returns {Array<{ name: string, description: string, bookingLengthInMinutes: number|null, priceInSubunits: number }>}
 */
export const getTreatmentPackages = (publicData, intl) =>
  getTreatmentsOfVariants(publicData, intl).filter(treatment =>
    Number.isInteger(treatment.priceInSubunits)
  );

/**
 * The price of a treatment with the amount first, e.g. "145 €" or "145,50 €".
 *
 * @param {Object} intl
 * @param {number} priceInSubunits
 * @param {string} currency
 * @returns {string}
 */
export const formatTreatmentPrice = (intl, priceInSubunits, currency) =>
  formatMoneyAmountFirst(intl, new Money(priceInSubunits, currency));

/**
 * Duration and price of a treatment, e.g. "90 min · 145 €".
 *
 * @param {Object} treatment { bookingLengthInMinutes, priceInSubunits }
 * @param {Object} intl
 * @param {string} [currency]
 * @returns {string}
 */
export const formatTreatmentMeta = (treatment, intl, currency) => {
  const { bookingLengthInMinutes, priceInSubunits } = treatment || {};
  const duration = bookingLengthInMinutes
    ? intl.formatMessage(
        { id: 'ListingPage.treatmentPackage.duration' },
        { minutes: bookingLengthInMinutes }
      )
    : null;
  const price =
    currency && Number.isInteger(priceInSubunits)
      ? formatTreatmentPrice(intl, priceInSubunits, currency)
      : null;
  return [duration, price].filter(Boolean).join(' · ');
};

/**
 * Labels of the options of the booking panel, in the order of the price variants:
 * "Abhyanga · 90 min · 145 €", with the name in the visitor's language.
 *
 * @param {Object} publicData
 * @param {Object} intl
 * @param {string} [currency]
 * @returns {Array<string>}
 */
export const getTreatmentOptionLabels = (publicData, intl, currency) =>
  getTreatmentsOfVariants(publicData, intl).map(treatment =>
    [treatment.name, formatTreatmentMeta(treatment, intl, currency)].filter(Boolean).join(' · ')
  );
