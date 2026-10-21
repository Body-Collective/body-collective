const { LANGUAGES, hashTexts, translateTexts } = require('./index');

/**
 * Translations of a user's profile texts: the bio and, for practitioners, the professional
 * title, quote, experience and trainings (title and teacher; years and the quote author stay as
 * written). Saved to the user's public data:
 *   translations: { sourceLanguage, sourceHash, en: {...}, de: {...} }
 * with the same shape as the originals (see src/util/practitionerProfile.js).
 */

const TRAINING_LISTS = ['training', 'furtherTraining'];

const asText = value => (typeof value === 'string' ? value : '');
const asList = value => (Array.isArray(value) ? value : []);

/**
 * The texts of a profile to translate, by id.
 *
 * @param {Object} profile User profile attributes
 * @returns {Object} { [id]: string }
 */
const getProfileTexts = profile => {
  const publicData = profile?.publicData || {};
  const texts = {
    bio: asText(profile?.bio),
    professionalTitle: asText(publicData.professionalTitle),
    quote: asText(publicData.quote),
  };
  asList(publicData.experience).forEach((line, i) => {
    texts[`experience.${i}`] = asText(line);
  });
  TRAINING_LISTS.forEach(list => {
    asList(publicData[list]).forEach((row, i) => {
      texts[`${list}.${i}.title`] = asText(row?.title);
      texts[`${list}.${i}.teacher`] = asText(row?.teacher);
    });
  });
  return texts;
};

/**
 * The translated profile texts of a language, in the shape of the originals.
 *
 * @param {Object} profile User profile attributes
 * @param {Object} byId Translated texts by id
 * @returns {Object}
 */
const buildTranslatedProfile = (profile, byId) => {
  const publicData = profile?.publicData || {};
  const text = id => byId[id] ?? '';
  return {
    bio: text('bio'),
    professionalTitle: text('professionalTitle'),
    quote: text('quote'),
    experience: asList(publicData.experience).map((_, i) => text(`experience.${i}`)),
    ...TRAINING_LISTS.reduce(
      (lists, list) => ({
        ...lists,
        [list]: asList(publicData[list]).map((_, i) => ({
          title: text(`${list}.${i}.title`),
          teacher: text(`${list}.${i}.teacher`),
        })),
      }),
      {}
    ),
  };
};

/**
 * Translates a user's profile texts, if they changed since the last translation.
 *
 * @param {Object} params
 * @param {Function} params.show Returns a promise of the user's profile attributes
 * @param {Function} params.update Saves the given public data to the user's profile
 * @returns {Promise<{status: 'translated'|'unchanged'|'empty'|'outdated'}>}
 */
const translateProfileWith = async ({ show, update }) => {
  const profile = await show();
  const texts = getProfileTexts(profile);
  const hash = hashTexts(texts);
  if (profile.publicData?.translations?.sourceHash === hash) {
    return { status: 'unchanged' };
  }

  const translated = await translateTexts(texts);
  if (!translated) {
    return { status: 'empty' };
  }

  // The profile may have been edited during the translation
  const current = await show();
  if (hashTexts(getProfileTexts(current)) !== hash) {
    return { status: 'outdated' };
  }

  const translations = { sourceLanguage: translated.sourceLanguage, sourceHash: hash };
  LANGUAGES.forEach(language => {
    translations[language] = buildTranslatedProfile(profile, translated[language]);
  });
  await update({ translations });
  return { status: 'translated' };
};

/**
 * Translates the current user's profile.
 *
 * @param {Object} params
 * @param {Object} params.sdk The SDK of the logged in user
 * @returns {Promise<Object>} See translateProfileWith
 */
const translateProfile = ({ sdk }) =>
  translateProfileWith({
    show: () => sdk.currentUser.show().then(r => r.data.data.attributes.profile),
    update: publicData => sdk.currentUser.updateProfile({ publicData }),
  });

module.exports = {
  buildTranslatedProfile,
  getProfileTexts,
  translateProfile,
  translateProfileWith,
};
