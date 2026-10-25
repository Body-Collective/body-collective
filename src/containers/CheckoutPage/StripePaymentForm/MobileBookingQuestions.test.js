import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import MobileBookingQuestions from './MobileBookingQuestions';

const { screen, userEvent } = testingLibrary;

const configs = [
  {
    key: 'parking',
    label: 'Where is the parking?',
    schemaType: 'enum',
    showTo: 'customer',
    saveConfig: { isRequired: true },
    enumOptions: [{ option: 'on_street', label: 'On street' }],
  },
  {
    key: 'hotel_receptionist',
    label: 'Name of the receptionist',
    schemaType: 'shortText',
    showTo: 'customer',
    saveConfig: {},
  },
  {
    key: 'accommodation_type',
    label: 'Accommodation type',
    schemaType: 'enum',
    showTo: 'customer',
    saveConfig: { isRequired: true },
    enumOptions: [{ option: 'villa', label: 'Villa' }, { option: 'hotel', label: 'Hotel' }],
  },
  {
    key: 'health_note',
    label: 'Health note',
    schemaType: 'text',
    showTo: 'customer',
    saveConfig: { isRequired: true },
  },
];

const renderQuestions = () =>
  render(
    <FinalForm
      onSubmit={() => {}}
      render={({ values }) => (
        <MobileBookingQuestions formId="test" transactionFieldConfigs={configs} values={values} />
      )}
    />
  );

describe('MobileBookingQuestions', () => {
  it('asks for the receptionist only for hotels, and asks for the confirmations', async () => {
    const user = userEvent.setup();
    renderQuestions();

    expect(screen.queryByLabelText(/hotel_receptionist\.label/)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/accommodation_type\.option\.hotel/));
    expect(screen.getByLabelText(/hotel_receptionist\.label/)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/accommodation_type\.option\.villa/));
    expect(screen.queryByLabelText(/hotel_receptionist\.label/)).not.toBeInTheDocument();

    expect(screen.getByLabelText('MobileBookingQuestions.weightConfirmation')).toBeInTheDocument();
    expect(screen.getByLabelText('MobileBookingQuestions.healthDataConsent')).toBeInTheDocument();
  });
});
