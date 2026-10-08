import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useLanguage } from '../../context/languageContext';

import { saveCurrentUserLanguage } from '../../ducks/user.duck';

/**
 * Returns a function that changes the language of the app at once. For a user who has logged in
 * the language is saved to the profile too: that is the language that counts after the login, on
 * all devices.
 *
 * The page is scrolled to the top, since the sections of the page change with the language.
 *
 * @returns {(language: string) => void}
 */
const useChangeLanguage = () => {
  const dispatch = useDispatch();
  const { language: currentLanguage, setLanguage } = useLanguage();
  const isLoggedIn = useSelector(state => !!state.user?.currentUser?.id);

  return useCallback(
    language => {
      if (language === currentLanguage) {
        return;
      }
      setLanguage(language);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
      if (isLoggedIn) {
        dispatch(saveCurrentUserLanguage(language));
      }
    },
    [dispatch, currentLanguage, setLanguage, isLoggedIn]
  );
};

export default useChangeLanguage;
