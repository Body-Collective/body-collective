import React from 'react';
import '@testing-library/jest-dom';

import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingPricingAndStockForm from './EditListingPricingAndStockForm';

const { screen, userEvent, fireEvent } = testingLibrary;

const noop = () => null;

describe('EditListingDeliveryForm', () => {
  it('Check that price can be given and submit button activates', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const saveActionMsg = 'Save price';
    render(
      <EditListingPricingAndStockForm
        intl={fakeIntl}
        dispatch={noop}
        onSubmit={onSubmit}
        marketplaceCurrency="USD"
        listingMinimumPriceSubUnits={0}
        unitType="item"
        listingType={{ listingType: 'sell-bikes', stockType: 'multipleItems' }}
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
    const price = 'EditListingPricingAndStockForm.pricePerProduct';
    await user.type(screen.getByRole('textbox', { name: price }), '10');
    const stock = 'EditListingPricingAndStockForm.stockLabel';
    await user.type(screen.getByRole('spinbutton', { name: stock }), '10');

    // Test that save button is enabled
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeEnabled();
  });

  it('Seminars: asks the total and the spots booked elsewhere, not below the spots booked', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const saveActionMsg = 'Save spots';
    render(
      <EditListingPricingAndStockForm
        intl={fakeIntl}
        dispatch={noop}
        onSubmit={onSubmit}
        initialValues={{ spotsTotal: 12, spotsBookedElsewhere: 0 }}
        marketplaceCurrency="USD"
        listingMinimumPriceSubUnits={0}
        unitType="item"
        listingType={{ listingType: 'seminar_event_booking', stockType: 'multipleItems' }}
        seminarBookedHere={2}
        saveActionMsg={saveActionMsg}
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
      />
    );

    expect(screen.queryByText('EditListingPricingAndStockForm.stockLabel')).not.toBeInTheDocument();
    const price = 'EditListingPricingAndStockForm.pricePerProduct';
    await user.type(screen.getByRole('textbox', { name: price }), '10');
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeEnabled();

    // 2 spots are booked here and 9 elsewhere: a total of 10 is too low
    const elsewhere = 'EditListingPricingAndStockForm.spotsBookedElsewhereLabel';
    await user.clear(screen.getByRole('spinbutton', { name: elsewhere }));
    await user.type(screen.getByRole('spinbutton', { name: elsewhere }), '9');
    const total = 'EditListingPricingAndStockForm.spotsTotalLabel.individuals';
    await user.clear(screen.getByRole('spinbutton', { name: total }));
    await user.type(screen.getByRole('spinbutton', { name: total }), '10');
    // Saving with missing or invalid fields shows the errors instead of saving
    await user.click(screen.getByRole('button', { name: saveActionMsg }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(screen.getByRole('spinbutton', { name: total }));
    await user.type(screen.getByRole('spinbutton', { name: total }), '11');
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeEnabled();
  });
});
