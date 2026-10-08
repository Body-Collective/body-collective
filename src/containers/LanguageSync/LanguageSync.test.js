import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

import { LanguageProvider, useLanguage } from '../../context/languageContext';
import { createCurrentUser } from '../../util/testData';
import { getCookieLanguage, getStoredLanguage, storeLanguage } from '../../util/language';

import { LanguageSyncComponent } from './LanguageSync';

const Probe = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <button onClick={() => setLanguage('de')}>choose de</button>
    </div>
  );
};

const userWithLanguage = language =>
  createCurrentUser('user1', {
    profile: {
      firstName: 'A',
      lastName: 'B',
      displayName: 'A B',
      abbreviatedName: 'AB',
      publicData: language ? { language } : {},
    },
  });

const renderSync = ({ initialLanguage = 'en', currentUser = null, onSaveLanguage = jest.fn() }) => {
  const result = render(
    <LanguageProvider initialLanguage={initialLanguage}>
      <LanguageSyncComponent currentUser={currentUser} onSaveLanguage={onSaveLanguage} />
      <Probe />
    </LanguageProvider>
  );
  return { ...result, onSaveLanguage };
};

describe('LanguageSync', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'bc_language=; path=/; max-age=0';
  });

  describe('a visitor who has not logged in', () => {
    it('gets the language that was chosen in this browser', () => {
      storeLanguage('de');
      // The first render has the language of the cookie of the server, which may be the default
      renderSync({ initialLanguage: 'en' });
      expect(screen.getByTestId('language')).toHaveTextContent('de');
    });

    it('stays in the language of the page when nothing has been chosen', () => {
      renderSync({ initialLanguage: 'en' });
      expect(screen.getByTestId('language')).toHaveTextContent('en');
      expect(getStoredLanguage()).toBeNull();
    });
  });

  describe('a user who has logged in', () => {
    it('gets the language of the account, also when another one was chosen in the browser', () => {
      storeLanguage('en');
      const { onSaveLanguage } = renderSync({
        initialLanguage: 'en',
        currentUser: userWithLanguage('de'),
      });

      expect(screen.getByTestId('language')).toHaveTextContent('de');
      // It is kept in the browser, for the server and for the time after the logout
      expect(getStoredLanguage()).toEqual('de');
      expect(getCookieLanguage()).toEqual('de');
      expect(onSaveLanguage).not.toHaveBeenCalled();
    });

    it('keeps the browser in line with the account when the language is the same', () => {
      renderSync({ initialLanguage: 'de', currentUser: userWithLanguage('de') });

      expect(screen.getByTestId('language')).toHaveTextContent('de');
      expect(getStoredLanguage()).toEqual('de');
    });

    it('saves the language in use to an older account that has none', () => {
      const { onSaveLanguage } = renderSync({
        initialLanguage: 'de',
        currentUser: userWithLanguage(null),
      });

      expect(screen.getByTestId('language')).toHaveTextContent('de');
      expect(onSaveLanguage).toHaveBeenCalledTimes(1);
      expect(onSaveLanguage).toHaveBeenCalledWith('de');
    });

    it('does not bring the old language back while a newly chosen one is being saved', () => {
      const { onSaveLanguage } = renderSync({
        initialLanguage: 'en',
        currentUser: userWithLanguage('en'),
      });

      fireEvent.click(screen.getByText('choose de'));
      expect(screen.getByTestId('language')).toHaveTextContent('de');
      expect(onSaveLanguage).not.toHaveBeenCalled();
    });

    it('ignores a language of the account that the app does not have', () => {
      const { onSaveLanguage } = renderSync({
        initialLanguage: 'en',
        currentUser: userWithLanguage('nl'),
      });

      expect(screen.getByTestId('language')).toHaveTextContent('en');
      expect(onSaveLanguage).toHaveBeenCalledWith('en');
    });
  });
});
