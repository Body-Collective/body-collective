/**
 * A short fingerprint of a text (FNV-1a, 32 bits, hex): the server saves it with a translation
 * (publicData.translationSources), so that a translation is only shown for the text it was made
 * from. Texts edited without a new translation (e.g. in Console) show the original instead.
 *
 * Same function as in server/services/translation/fingerprint.js.
 *
 * @param {string} text
 * @returns {string} 8 hex characters
 */
export const textFingerprint = text => {
  let hash = 0x811c9dc5;
  const value = `${text ?? ''}`;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

/**
 * Whether the translation of a text was made from the given original. Translations saved
 * before the fingerprints existed can't be checked and count as outdated.
 *
 * @param {Object} publicData Public data of the listing
 * @param {string} id Id of the text, e.g. 'title', 'about_treatment', 'variant_0_name'
 * @param {string} original The current text
 * @returns {boolean}
 */
export const isTranslationCurrent = (publicData, id, original) => {
  const sources = publicData?.translationSources;
  if (!sources || typeof sources !== 'object') {
    return false;
  }
  return sources[id] === textFingerprint(original);
};
