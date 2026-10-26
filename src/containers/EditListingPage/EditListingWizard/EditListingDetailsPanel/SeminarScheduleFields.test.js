import React from 'react';
import '@testing-library/jest-dom';
import { Form as FinalForm } from 'react-final-form';

import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import SeminarScheduleFields from './SeminarScheduleFields';

const { screen } = testingLibrary;

describe('SeminarScheduleFields', () => {
  it('books individuals by default, also without initial values (new listings)', () => {
    let formState = null;
    render(
      <FinalForm
        onSubmit={() => null}
        render={({ values, invalid, errors }) => {
          formState = { values, invalid, errors };
          return (
            <form>
              <SeminarScheduleFields formId="test" intl={fakeIntl} values={values} />
            </form>
          );
        }}
      />
    );
    expect(screen.getByLabelText('EditListingDetailsForm.bookingFor')).toHaveValue('individuals');
    expect(formState.values.booking_for).toEqual('individuals');
    expect(formState.errors.booking_for).toBeUndefined();
  });
});
