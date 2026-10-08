import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  storeLanguage,
} from '../util/language';

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  languages: SUPPORTED_LANGUAGES,
  setLanguage: () => {},
});

/**
 * Provides the language of the app: the texts, and the language version of the page sections, are
 * picked by it. The language can be changed without reloading the page.
 *
 * Choosing a language saves it in the browser (localStorage and a cookie, see util/language.js).
 * Saving it to the profile of a logged in user is not done here, see containers/LanguageSync.
 *
 * @component
 * @param {Object} props
 * @param {string} props.initialLanguage the language of the first render. On a page that has been
 * rendered on the server, it has to be the one that the server used.
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
export const LanguageProvider = props => {
  const { initialLanguage, children } = props;
  const [language, setLanguageState] = useState(
    isSupportedLanguage(initialLanguage) ? initialLanguage : DEFAULT_LANGUAGE
  );

  const setLanguage = useCallback(nextLanguage => {
    if (isSupportedLanguage(nextLanguage)) {
      setLanguageState(nextLanguage);
      storeLanguage(nextLanguage);
    }
  }, []);

  const value = useMemo(() => ({ language, languages: SUPPORTED_LANGUAGES, setLanguage }), [
    language,
    setLanguage,
  ]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/**
 * The language of the app. Without a LanguageProvider (e.g. in tests) it is the default language.
 *
 * @returns {{ language: string, languages: Array<string>, setLanguage: Function }}
 */
export const useLanguage = () => useContext(LanguageContext);
