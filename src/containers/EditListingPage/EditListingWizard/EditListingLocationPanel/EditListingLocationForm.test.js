import React, { act } from 'react';
import '@testing-library/jest-dom';

import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingLocationForm from './EditListingLocationForm';

const { screen, userEvent, fireEvent } = testingLibrary;

const noop = () => null;

beforeAll(() => {
  // Mock window.scroll - otherwise, Jest/JSDOM will print a not-implemented error.
  window.mapboxgl = { accessToken: 'test' };
  window.mapboxSdk = () => ({
    geocoding: {
      forwardGeocode: () => ({
        send: () =>
          Promise.resolve({
            body: { features: [] },
          }),
      }),
    },
  });
});

describe('EditListingDeliveryForm', () => {
  it('Check that shipping fees can be given and submit button activates', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const saveActionMsg = 'Save location';
    await act(async () => {
      render(
        <EditListingLocationForm
          intl={fakeIntl}
          dispatch={noop}
          onSubmit={onSubmit}
          saveActionMsg={saveActionMsg}
          updated={false}
          updateInProgress={false}
          disabled={false}
          ready={false}
        />
      );
    });

    // Pickup fields
    const address = 'EditListingLocationForm.address';
    expect(screen.getByText(address)).toBeInTheDocument();

    const building = 'EditListingLocationForm.building';
    expect(screen.getByText(building)).toBeInTheDocument();

    // Test that save button is disabled at first
    // Saving with missing or invalid fields shows the errors instead of saving
    await user.click(screen.getByRole('button', { name: saveActionMsg }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByTestId('location-search'), 'Erottajankatu 19, Helsinki');
    await user.type(screen.getByRole('textbox', { name: building }), 'B');
  });
});
