import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { LanguageProvider, useLanguage } from '../../context/languageContext';

import useChangeLanguage from './useChangeLanguage';

jest.mock('../../ducks/user.duck', () => ({
  saveCurrentUserLanguage: language => ({
    type: 'test/saveCurrentUserLanguage',
    payload: language,
  }),
}));

const Probe = () => {
  const { language } = useLanguage();
  const changeLanguage = useChangeLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <button onClick={() => changeLanguage('de')}>choose de</button>
      <button onClick={() => changeLanguage('en')}>choose en</button>
    </div>
  );
};

const renderProbe = currentUser => {
  const actions = [];
  const store = configureStore({
    reducer: {
      user: (state = { currentUser }) => state,
      log: (state = null, action) => {
        actions.push(action);
        return state;
      },
    },
  });
  render(
    <Provider store={store}>
      <LanguageProvider initialLanguage="en">
        <Probe />
      </LanguageProvider>
    </Provider>
  );
  return () => actions.filter(a => a.type === 'test/saveCurrentUserLanguage');
};

describe('useChangeLanguage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.scrollTo = jest.fn();
  });

  it('changes the language and scrolls to the top of the page', () => {
    renderProbe(null);
    fireEvent.click(screen.getByText('choose de'));
    expect(screen.getByTestId('language')).toHaveTextContent('de');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('does nothing when the language is already in use', () => {
    const saved = renderProbe({ id: { uuid: 'user1' } });
    fireEvent.click(screen.getByText('choose en'));
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(saved()).toHaveLength(0);
  });

  it('saves the language of a user who has logged in', () => {
    const saved = renderProbe({ id: { uuid: 'user1' } });
    fireEvent.click(screen.getByText('choose de'));
    expect(saved().map(a => a.payload)).toEqual(['de']);
  });

  it('does not save anything for a visitor', () => {
    const saved = renderProbe(null);
    fireEvent.click(screen.getByText('choose de'));
    expect(saved()).toHaveLength(0);
  });
});
