import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import LanguageSwitch from './LanguageSwitch';

const { screen, userEvent } = testingLibrary;

describe('LanguageSwitch', () => {
  const renderSwitch = props =>
    render(
      <LanguageSwitch
        language="en"
        languages={['en', 'de']}
        ariaLabel="Language"
        onChange={() => null}
        {...props}
      />
    );

  it('shows the languages as DE / EN, and marks the one in use', () => {
    renderSwitch();

    const buttons = screen.getAllByRole('button');
    expect(buttons.map(b => b.textContent)).toEqual(['DE', 'EN']);
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Deutsch' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });

  it('calls onChange with the language that is chosen', async () => {
    const onChange = jest.fn();
    renderSwitch({ onChange });

    await userEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('de');
  });

  it('does nothing when the language in use is chosen', async () => {
    const onChange = jest.fn();
    renderSwitch({ onChange });

    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
