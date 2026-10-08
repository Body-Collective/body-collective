import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import ModalApplicationUnderReview from './ModalApplicationUnderReview';

const { screen, userEvent } = testingLibrary;

describe('ModalApplicationUnderReview', () => {
  const renderModal = props =>
    render(
      <ModalApplicationUnderReview
        id="ApplicationUnderReview"
        isOpen
        onClose={() => null}
        onManageDisableScrolling={() => null}
        {...props}
      />,
      { messages: enMessages, withPortals: true }
    );

  it('thanks the user and tells that the details are submitted and the profile is under review', async () => {
    renderModal();

    expect(await screen.findByRole('heading', { name: 'Thank you!' })).toBeInTheDocument();
    expect(
      screen.getByText('Your details have been submitted and your profile is under review.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
  });

  it('does not offer the close button of the modal when it is not open', async () => {
    renderModal({ isOpen: false });

    // Give the portal time to render the (hidden) modal
    expect(await screen.findByRole('heading', { name: 'Thank you!', hidden: true })).toBeDefined();
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  });

  it('calls onClose when the user closes the modal with the button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ onClose });

    await user.click(await screen.findByRole('button', { name: 'Got it' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the user closes the modal with the close button of the modal', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal({ onClose });

    await user.click(await screen.findByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
