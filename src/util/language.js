/**
 * Languages of the app.
 *
 * The texts of the app come from the translation files in `src/translations` (the hosted
 * translations of Console are not used). The content pages made in Console have one copy of each
 * section per language: the anchor id of a section ends with the language, e.g. "hero-en" and
 * "hero-de". See `selectSectionsForLanguage`.
 *
 * The language of a visitor is saved in the browser (localStorage), and in a cookie so that the
 * server can render the page in the same language. A user who has logged in has the language saved
 * to the profile too (publicData.language), which is then the one that counts.
 */

export const SUPPORTED_LANGUAGES = ['en', 'de'];
export const DEFAULT_LANGUAGE = 'en';

// The language is written to the same key of localStorage and to a cookie of the same name
export const LANGUAGE_STORAGE_KEY = 'bc_language';
export const LANGUAGE_COOKIE_NAME = 'bc_language';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// The user field of Console (users/user-fields.json) where the language of a user is saved: a
// "single select" field in the public data of the user, with the languages as the options. It is
// shown in the signup form and in the profile settings like the other user fields.
export const LANGUAGE_USER_FIELD_KEY = 'language';

// Names of the languages in the language itself. They are not translated.
export const LANGUAGE_NAMES = {
  en: 'English',
  de: 'Deutsch',
};

/**
 * @param {*} language
 * @returns {boolean} true if the app has translations for the language
 */
export const isSupportedLanguage = language => SUPPORTED_LANGUAGES.includes(language);

/**
 * @param {*} language
 * @returns {string|null} the language if it is supported, otherwise null
 */
export const normalizeLanguage = language => (isSupportedLanguage(language) ? language : null);

/**
 * The language saved to the profile of a user.
 *
 * @param {Object?} currentUser currentUser API entity
 * @returns {string|null} e.g. "de", or null when the user has not saved a language
 */
export const getUserLanguage = currentUser =>
  normalizeLanguage(currentUser?.attributes?.profile?.publicData?.language);

///////////////////////////////
// The language of a browser //
///////////////////////////////

/**
 * The language saved in localStorage. Works only in a browser.
 *
 * @returns {string|null}
 */
export const getStoredLanguage = () => {
  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch (e) {
    // Browsers can refuse localStorage (e.g. private mode). The app works without it.
    return null;
  }
};

/**
 * The language in a cookie string, e.g. "a=b; bc_language=de".
 *
 * @param {string?} cookieString document.cookie, or the Cookie header of a request
 * @returns {string|null}
 */
export const getLanguageFromCookieString = cookieString => {
  const cookies = `${cookieString || ''}`.split(';');
  const cookie = cookies.map(c => c.trim()).find(c => c.startsWith(`${LANGUAGE_COOKIE_NAME}=`));
  const value = cookie ? cookie.slice(LANGUAGE_COOKIE_NAME.length + 1) : null;
  return normalizeLanguage(value);
};

/**
 * The language in the cookie of the browser. Works only in a browser.
 *
 * @returns {string|null}
 */
export const getCookieLanguage = () => {
  try {
    return getLanguageFromCookieString(document.cookie);
  } catch (e) {
    return null;
  }
};

/**
 * Saves the language in the browser: to localStorage, and to the cookie that the server reads.
 *
 * @param {string} language
 */
export const storeLanguage = language => {
  if (!isSupportedLanguage(language)) {
    return;
  }
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (e) {
    // See getStoredLanguage
  }
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  } catch (e) {
    // See getStoredLanguage
  }
};

////////////////////////////////////////////
// Language versions of the page sections //
////////////////////////////////////////////

const ID_LANGUAGE_PATTERN = new RegExp(`^(.+)-(${SUPPORTED_LANGUAGES.join('|')})$`);

/**
 * Splits the anchor id of a section into the id and the language.
 *
 * @param {string?} id e.g. "hero-de"
 * @returns {{ baseId: string, language: string|null }} e.g. { baseId: 'hero', language: 'de' }.
 * The language is null when the id does not end with one: the section is the same in all languages.
 */
export const parseLanguageSuffix = id => {
  const match = ID_LANGUAGE_PATTERN.exec(id || '');
  return match ? { baseId: match[1], language: match[2] } : { baseId: id || '', language: null };
};

/**
 * Picks the sections of the given language from the sections of a page. Each section of a page has
 * a copy per language, told apart by the ending of the anchor id: "hero-en", "hero-de". (Only the
 * sections are copied, the blocks in them are not.)
 *
 * - The section with the language of the id is shown.
 * - If there is no such version, the version in the default language is shown, so that a page that
 *   has not been translated yet is not left empty.
 * - A section whose id has no language is shown in all languages.
 *
 * The language is removed from the id of the picked sections ("hero"). Styles and links that are
 * made for an id ("#hero", "/p/about#faq") keep working, whatever the language is.
 *
 * @param {Array<Object>} sections sections of a page asset
 * @param {string} language the language to show
 * @returns {Array<Object>} the picked sections in the original order
 */
export const selectSectionsForLanguage = (sections, language) => {
  if (!Array.isArray(sections)) {
    return sections;
  }

  const entries = sections.map(section => ({
    section,
    ...parseLanguageSuffix(section?.sectionId),
  }));

  // The versions of each id that has a language: Map(baseId => { en: section, de: section })
  const versionsById = new Map();
  entries.forEach(({ section, baseId, language: sectionLanguage }) => {
    if (sectionLanguage) {
      const versions = versionsById.get(baseId) || {};
      // If a version is there twice, the first one counts
      versionsById.set(baseId, { [sectionLanguage]: section, ...versions });
    }
  });

  // An id is shown where its first version is in the list
  const shownIds = new Set();
  return entries.reduce((picked, { section, baseId, language: sectionLanguage }) => {
    if (!sectionLanguage) {
      return [...picked, section];
    }
    if (shownIds.has(baseId)) {
      return picked;
    }
    shownIds.add(baseId);
    const versions = versionsById.get(baseId);
    const shownVersion = versions[language] || versions[DEFAULT_LANGUAGE] || section;
    return [...picked, { ...shownVersion, sectionId: baseId }];
  }, []);
};
