/**
 * A short fingerprint of a text (FNV-1a, 32 bits, hex), saved with a listing's translations in
 * publicData.translationSources so that the web app only shows a translation for the text it
 * was made from. Same function as in src/util/textFingerprint.js.
 *
 * @param {string} text
 * @returns {string} 8 hex characters
 */
const textFingerprint = text => {
  let hash = 0x811c9dc5;
  const value = `${text ?? ''}`;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

module.exports = { textFingerprint };
