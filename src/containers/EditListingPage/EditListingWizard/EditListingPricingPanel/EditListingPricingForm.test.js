import React from 'react';
import '@testing-library/jest-dom';

import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingPricingForm from './EditListingPricingForm';

const { screen, userEvent, fireEvent } = testingLibrary;

const noop = () => null;

describe('EditListingDeliveryForm', () => {
  it('Check that price can be given and submit button activates', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const saveActionMsg = 'Save price';
    render(
      <EditListingPricingForm
        intl={fakeIntl}
        dispatch={noop}
        onSubmit={onSubmit}
        marketplaceCurrency="USD"
        unitType="day"
        listingMinimumPriceSubUnits={0}
        saveActionMsg={saveActionMsg}
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
      />
    );

    // Test that save button is disabled at first
    // Saving with missing or invalid fields shows the errors instead of saving
    await user.click(screen.getByRole('button', { name: saveActionMsg }));
    expect(onSubmit).not.toHaveBeenCalled();

    // Fill mandatory attributes
    const price = 'EditListingPricingForm.pricePerProduct';
    await user.type(screen.getByRole('textbox', { name: price }), '10');

    // Test that save button is enabled
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeEnabled();
  });
});
