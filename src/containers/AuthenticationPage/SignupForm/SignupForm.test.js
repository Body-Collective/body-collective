import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';
import { fakeIntl } from '../../../util/testData';
import enMessages from '../../../translations/en.json';

import TermsAndConditions from '../TermsAndConditions/TermsAndConditions';
import SignupForm from './SignupForm';

const { screen, fireEvent, userEvent, waitFor } = testingLibrary;

const noop = () => null;

const userTypes = [
  {
    userType: 'a',
    label: 'Seller',
  },
  {
    userType: 'b',
    label: 'Buyer',
  },
  {
    userType: 'c',
    label: 'Guest',
  },
  {
    userType: 'd',
    label: 'Host',
  },
];

const userFields = [
  {
    key: 'enumField1',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'o1', label: 'l1' },
      { option: 'o2', label: 'l2' },
      { option: 'o3', label: 'l3' },
    ],
    saveConfig: {
      label: 'Enum Field 1',
      displayInSignUp: true,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
    },
  },
  {
    key: 'enumField2',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'o1', label: 'l1' },
      { option: 'o2', label: 'l2' },
      { option: 'o3', label: 'l3' },
    ],
    saveConfig: {
      label: 'Enum Field 2',
      displayInSignUp: true,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['c', 'd'],
    },
  },
  {
    key: 'textField',
    scope: 'private',
    schemaType: 'text',
    saveConfig: {
      label: 'Text Field',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
    },
  },
  {
    key: 'booleanField',
    scope: 'protected',
    schemaType: 'boolean',
    saveConfig: {
      label: 'Boolean Field',
      displayInSignUp: false,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
    },
  },
];

const practitionerUserTypes = [
  { userType: 'practitioner', label: 'Practitioner' },
  { userType: 'customer', label: 'Customer' },
];

const practitionerUserFields = [
  {
    key: 'company',
    scope: 'public',
    schemaType: 'text',
    saveConfig: { label: 'Company name', displayInSignUp: true, isRequired: false },
    userTypeConfig: { limitToUserTypeIds: false },
  },
  {
    key: 'about_practice',
    scope: 'public',
    schemaType: 'text',
    saveConfig: { label: 'About your practice', displayInSignUp: true, isRequired: true },
    userTypeConfig: { limitToUserTypeIds: false },
  },
];

describe('SignupForm', () => {
  // Terms and conditions component passed in as props
  const termsAndConditions = (
    <TermsAndConditions onOpenTermsOfService={noop} onOpenPrivacyPolicy={noop} intl={fakeIntl} />
  );

  // // If snapshot testing is preferred, this could be used
  // // However, this form starts to be too big DOM structure to be snapshot tested nicely
  // it('matches snapshot', () => {
  //   const tree = render(
  //     <SignupForm intl={fakeIntl} termsAndConditions={termsAndConditions} onSubmit={noop} />
  //   );
  //   expect(tree.asFragment()).toMatchSnapshot();
  // });

  it('enables Sign up button when required fields are filled', async () => {
    const user = userEvent.setup();
    render(
      <SignupForm
        intl={fakeIntl}
        termsAndConditions={termsAndConditions}
        userTypes={userTypes}
        userFields={userFields}
        onSubmit={noop}
      />
    );

    // Simulate user interaction and select parent level category
    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: 'Seller' })
    );

    // Test that sign up button is disabled at first
    expect(screen.getByRole('button', { name: 'SignupForm.signUp' })).toBeDisabled();

    // Type the values to the sign up form
    await user.type(
      screen.getByRole('textbox', { name: 'SignupForm.emailLabel' }),
      'joe@example.com'
    );
    await user.type(screen.getByRole('textbox', { name: 'SignupForm.firstNameLabel' }), 'Joe');
    await user.type(screen.getByRole('textbox', { name: 'SignupForm.lastNameLabel' }), 'Dunphy');
    await user.type(screen.getByLabelText('SignupForm.passwordLabel'), 'secret-password');
    await user.type(screen.getByLabelText('Text Field'), 'Text value');

    // Test that sign up button is still disabled before clicking the checkbox
    expect(screen.getByRole('button', { name: 'SignupForm.signUp' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/AuthenticationPage.termsAndConditionsAcceptText/i));

    // Test that sign up button is enabled after typing the values
    expect(screen.getByRole('button', { name: 'SignupForm.signUp' })).toBeEnabled();
  });

  it('shows custom user fields according to configuration', async () => {
    const user = userEvent.setup();
    render(
      <SignupForm
        intl={fakeIntl}
        termsAndConditions={termsAndConditions}
        userTypes={userTypes}
        userFields={userFields}
        onSubmit={noop}
      />
    );

    // Simulate user interaction and select parent level category
    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: 'Seller' })
    );

    // Show user fields that have not been limited to type and have displayInSignUp: true
    expect(screen.getByText('Enum Field 1')).toBeInTheDocument();
    expect(screen.getByText('Text Field')).toBeInTheDocument();

    // Don't show user fields that have displayInSignUp: false
    expect(screen.queryByText('Boolean Field')).toBeNull();

    // Don't show user fields that are limited to user types – SignupForm does not support user types yet!
    expect(screen.queryByText('Enum Field 2')).toBeNull();
  });
  describe('signing up in two steps', () => {
    beforeAll(() => {
      // jsdom does not implement scrolling
      window.scrollTo = jest.fn();
    });

    const renderForm = (props = {}) =>
      render(
        <SignupForm
          intl={fakeIntl}
          termsAndConditions={termsAndConditions}
          userTypes={practitionerUserTypes}
          userFields={practitionerUserFields}
          preselectedUserType="practitioner"
          onSubmit={noop}
          {...props}
        />,
        { messages: enMessages }
      );

    const fillFirstStep = async user => {
      await user.type(screen.getByRole('textbox', { name: 'Email' }), 'joe@example.com');
      await user.type(screen.getByRole('textbox', { name: 'First name' }), 'Joe');
      await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'Dunphy');
      await user.type(screen.getByLabelText('Password'), 'secret-password');
      await user.type(screen.getByLabelText('Company name'), 'Healing Hands');
    };

    it('starts with the contact details of the practitioner', () => {
      renderForm();

      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Your details' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toBeVisible();
      expect(screen.getByLabelText('Company name')).toBeVisible();

      // The questions about the practice are in the second step
      expect(screen.getByLabelText('About your practice')).not.toBeVisible();

      expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Submit application' })).toBeNull();
      expect(
        screen.queryByLabelText(/AuthenticationPage.termsAndConditionsAcceptText/i)
      ).toBeNull();
    });

    it('stays in the first step and shows the errors if the details are not valid', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('You need to add an email.')).toBeInTheDocument();
      expect(screen.getByText('You need to add a first name.')).toBeInTheDocument();
      expect(screen.getByText('You need to add a last name.')).toBeInTheDocument();
      expect(screen.getByText('You need to add a password.')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
      expect(screen.getByLabelText('About your practice')).not.toBeVisible();
    });

    it('opens the second step when the details are valid, and the first one again with Back', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillFirstStep(user);
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'About your practice' })).toHaveFocus();
      expect(screen.getByLabelText('About your practice')).toBeVisible();
      expect(
        screen.getByLabelText(/AuthenticationPage.termsAndConditionsAcceptText/i)
      ).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Submit application' })).toBeDisabled();
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });

      // The first step is hidden but the form has kept the values
      expect(screen.getByLabelText('Company name')).not.toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('joe@example.com');
      expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue('Joe');
      expect(screen.getByLabelText('Company name')).toHaveValue('Healing Hands');
      expect(screen.getByLabelText('About your practice')).not.toBeVisible();
    });

    it('enables the submit button when the second step is filled, and submits both steps', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      renderForm({ onSubmit });

      await fillFirstStep(user);
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      // The practice has to be described and the terms accepted
      await user.type(screen.getByLabelText('About your practice'), 'Somatic therapy');
      expect(screen.getByRole('button', { name: 'Submit application' })).toBeDisabled();
      await user.click(screen.getByLabelText(/AuthenticationPage.termsAndConditionsAcceptText/i));
      expect(screen.getByRole('button', { name: 'Submit application' })).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Submit application' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          userType: 'practitioner',
          email: 'joe@example.com',
          fname: 'Joe',
          lname: 'Dunphy',
          password: 'secret-password',
          pub_company: 'Healing Hands',
          pub_about_practice: 'Somatic therapy',
        })
      );
    });

    it('opens the second step instead of submitting the form from the first step', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      renderForm({ onSubmit });

      await fillFirstStep(user);
      fireEvent.submit(screen.getByRole('textbox', { name: 'Email' }).closest('form'));

      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not open the second step if the password is used in another field', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillFirstStep(user);
      await user.clear(screen.getByLabelText('Company name'));
      await user.type(screen.getByLabelText('Company name'), 'secret-password');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      expect(
        screen.getByText('Only enter your password in the dedicated field.')
      ).toBeInTheDocument();
    });

    it('does not use steps for the other user types', () => {
      renderForm({ preselectedUserType: 'customer' });

      expect(screen.queryByText(/Step \d of 2/)).toBeNull();
      expect(screen.getByLabelText('Company name')).toBeVisible();
      expect(screen.getByLabelText('About your practice')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();
    });

    it('goes back to the first step when another user type is chosen', async () => {
      const user = userEvent.setup();
      renderForm({ preselectedUserType: undefined });

      await user.selectOptions(
        screen.getByRole('combobox'),
        screen.getByRole('option', { name: 'Practitioner' })
      );
      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();

      await fillFirstStep(user);
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();

      await user.selectOptions(
        screen.getByRole('combobox'),
        screen.getByRole('option', { name: 'Customer' })
      );
      expect(screen.queryByText(/Step \d of 2/)).toBeNull();
      expect(screen.getByRole('textbox', { name: 'Email' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    });
  });
});
