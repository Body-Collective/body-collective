import { useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import { useLanguage } from '../../context/languageContext';
import { getStoredLanguage, getUserLanguage, storeLanguage } from '../../util/language';

import { saveCurrentUserLanguage } from '../../ducks/user.duck';

/**
 * Keeps the language of the app in line with the user. It shows nothing.
 *
 * - A visitor who has not logged in has the language that was chosen in this browser (saved in
 *   localStorage). The server does not know it, it only reads the cookie, so the language of the
 *   first render can differ from it.
 * - When a user has logged in, the language saved to the profile is the one that counts. It is
 *   saved in the browser too, so that it stays when the user logs out and the server can render the
 *   pages in it.
 * - An older account that has no language gets the one that is in use.
 *
 * Choosing a language is done with useChangeLanguage, which also saves it to the profile.
 *
 * @component
 * @param {Object} props
 * @param {Object?} props.currentUser the logged in user
 * @param {Function} props.onSaveLanguage saves the language to the profile of the user
 * @returns {null}
 */
export const LanguageSyncComponent = props => {
  const { currentUser, onSaveLanguage } = props;
  const { language, setLanguage } = useLanguage();

  // The effect has to run when the user changes, not when the language does: choosing a language
  // changes the language at once and the profile a moment later, and the profile must not
  // bring the old language back in between.
  const languageRef = useRef(language);
  languageRef.current = language;

  const userId = currentUser?.id?.uuid;
  const accountLanguage = getUserLanguage(currentUser);

  useEffect(() => {
    const languageInUse = languageRef.current;

    if (!userId) {
      const browserLanguage = getStoredLanguage();
      if (browserLanguage && browserLanguage !== languageInUse) {
        setLanguage(browserLanguage);
      }
    } else if (accountLanguage) {
      if (accountLanguage !== languageInUse) {
        setLanguage(accountLanguage);
      } else {
        storeLanguage(accountLanguage);
      }
    } else {
      onSaveLanguage(languageInUse);
    }
  }, [userId, accountLanguage]);

  return null;
};

const mapStateToProps = state => ({ currentUser: state.user.currentUser });

const mapDispatchToProps = dispatch => ({
  onSaveLanguage: language => dispatch(saveCurrentUserLanguage(language)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LanguageSyncComponent);
