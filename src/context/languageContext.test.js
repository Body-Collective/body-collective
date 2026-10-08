import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  getCookieLanguage,
  getStoredLanguage,
} from '../util/language';

import { LanguageProvider, useLanguage } from './languageContext';

const Probe = () => {
  const { language, languages, setLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="languages">{languages.join(',')}</span>
      <button onClick={() => setLanguage('de')}>de</button>
      <button onClick={() => setLanguage('en')}>en</button>
      <button onClick={() => setLanguage('fr')}>fr</button>
    </div>
  );
};

describe('languageContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'bc_language=; path=/; max-age=0';
  });

  it('is the default language without a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('language')).toHaveTextContent(DEFAULT_LANGUAGE);
    expect(screen.getByTestId('languages')).toHaveTextContent('en,de');
  });

  it('starts with the initial language, without saving it', () => {
    render(
      <LanguageProvider initialLanguage="de">
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId('language')).toHaveTextContent('de');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('falls back to the default language when the initial language is not supported', () => {
    render(
      <LanguageProvider initialLanguage="fr">
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId('language')).toHaveTextContent('en');
  });

  it('changes the language and saves it in the browser and in the cookie', () => {
    render(
      <LanguageProvider initialLanguage="en">
        <Probe />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByText('de'));
    expect(screen.getByTestId('language')).toHaveTextContent('de');
    expect(getStoredLanguage()).toEqual('de');
    expect(getCookieLanguage()).toEqual('de');

    fireEvent.click(screen.getByText('en'));
    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(getStoredLanguage()).toEqual('en');
  });

  it('does not change to a language that the app does not have', () => {
    render(
      <LanguageProvider initialLanguage="de">
        <Probe />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText('fr'));
    expect(screen.getByTestId('language')).toHaveTextContent('de');
    expect(getStoredLanguage()).toBeNull();
  });
});
