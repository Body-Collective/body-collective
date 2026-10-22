import { SUPPORTED_LANGUAGES } from './language';
import { isTranslationCurrent } from './textFingerprint';

/**
 * Texts written by users in the language of the visitor. The server translates them after they
 * are saved (see server/services/translation):
 *  - listings: publicData.title_<language> and description_<language> (searchable), shown only
 *    when made from the current text (publicData.translationSources, see util/textFingerprint.js)
 *  - profiles: publicData.translations.<language> (bio and the practitioner profile)
 * Without a translation, the original text is shown.
 */

/**
 * The language of the app from React Intl's locale, e.g. 'de-DE' => 'de'.
 *
 * @param {Object} intl
 * @returns {string|null}
 */
export const getContentLanguage = intl => {
  const language = `${intl?.locale || ''}`.slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(language) ? language : null;
};

// Listing fields to fetch when listing titles are shown (e.g. on cards): the translations, and
// what tells whether they were made from the current title
export const LISTING_TITLE_TRANSLATION_FIELDS = [
  ...SUPPORTED_LANGUAGES.map(language => `publicData.title_${language}`),
  'publicData.translationSources',
  'publicData.translationSourceLanguage',
];

const nonEmpty = value => (typeof value === 'string' && value.trim() !== '' ? value : null);

/**
 * The language to show a listing's translation in, or null when the original is shown: in the
 * language the listing was written in, the original is always current (its translations may be
 * older, e.g. after an edit in Console).
 *
 * @param {Object} listing
 * @param {Object} intl
 * @returns {string|null}
 */
export const getListingTranslationLanguage = (listing, intl) => {
  const language = getContentLanguage(intl);
  const sourceLanguage = listing?.attributes?.publicData?.translationSourceLanguage;
  return language && language !== sourceLanguage ? language : null;
};

/**
 * The title of a listing in the visitor's language.
 *
 * @param {Object} listing
 * @param {Object} intl
 * @returns {string}
 */
export const getListingTitle = (listing, intl) => {
  const { title = '', publicData } = listing?.attributes || {};
  const language = getListingTranslationLanguage(listing, intl);
  const translated = language ? nonEmpty(publicData?.[`title_${language}`]) : null;
  return (
    (translated && isTranslationCurrent(publicData, 'title', title) && translated) || title || ''
  );
};

/**
 * The description of a listing in the visitor's language.
 *
 * @param {Object} listing
 * @param {Object} intl
 * @returns {string}
 */
export const getListingDescription = (listing, intl) => {
  const { description = '', publicData } = listing?.attributes || {};
  const language = getListingTranslationLanguage(listing, intl);
  const translated = language ? nonEmpty(publicData?.[`description_${language}`]) : null;
  const isCurrent = isTranslationCurrent(publicData, 'description', description);
  return (translated && isCurrent && translated) || description || '';
};

/**
 * The directions to the listing's place (doorbell, backyard, floor) in the visitor's language.
 *
 * @param {Object} listing
 * @param {Object} intl
 * @returns {string}
 */
export const getListingDirections = (listing, intl) => {
  const publicData = listing?.attributes?.publicData;
  const original = publicData?.location?.directions || '';
  const language = getListingTranslationLanguage(listing, intl);
  const translated = language ? nonEmpty(publicData?.translations?.[language]?.directions) : null;
  const isCurrent = isTranslationCurrent(publicData, 'directions', original);
  return (translated && isCurrent && translated) || original;
};

/**
 * The translated profile texts of a user in the visitor's language, or null. Translations of
 * lists are only used when they match the current lists (same number of rows).
 *
 * @param {Object} profile User profile attributes
 * @param {Object} intl
 * @returns {Object|null} { bio, professionalTitle, quote, experience, training, furtherTraining }
 */
export const getProfileTranslation = (profile, intl) => {
  const language = getContentLanguage(intl);
  const translated = language ? profile?.publicData?.translations?.[language] : null;
  return translated && typeof translated === 'object' ? translated : null;
};

/**
 * The bio of a user in the visitor's language.
 *
 * @param {Object} profile User profile attributes
 * @param {Object} intl
 * @returns {string}
 */
export const getProfileBio = (profile, intl) =>
  nonEmpty(getProfileTranslation(profile, intl)?.bio) || profile?.bio || '';

const sameLength = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length;

/**
 * The practitioner profile (see util/practitionerProfile.js) with its texts in the visitor's
 * language. Years, locations, languages and the quote author stay as they are.
 *
 * @param {Object} practitionerProfile Result of getPractitionerProfile
 * @param {Object} translation Result of getProfileTranslation
 * @returns {Object}
 */
export const localizePractitionerProfile = (practitionerProfile, translation) => {
  if (!translation) {
    return practitionerProfile;
  }
  const text = (translated, original) => nonEmpty(translated) || original;
  const rows = list =>
    sameLength(practitionerProfile[list], translation[list])
      ? practitionerProfile[list].map((row, i) => ({
          ...row,
          title: text(translation[list][i]?.title, row.title),
          teacher: text(translation[list][i]?.teacher, row.teacher),
        }))
      : practitionerProfile[list];

  return {
    ...practitionerProfile,
    professionalTitle: text(translation.professionalTitle, practitionerProfile.professionalTitle),
    quote: text(translation.quote, practitionerProfile.quote),
    experience: sameLength(practitionerProfile.experience, translation.experience)
      ? practitionerProfile.experience.map((line, i) => text(translation.experience[i], line))
      : practitionerProfile.experience,
    training: rows('training'),
    furtherTraining: rows('furtherTraining'),
  };
};
