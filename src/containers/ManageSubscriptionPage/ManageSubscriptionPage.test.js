import React from 'react';
import '@testing-library/jest-dom';
import { useLocation } from 'react-router-dom';

import { createCurrentUser } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { ManageSubscriptionPageComponent } from './ManageSubscriptionPage';

// The page reads ?session_id=... from the location. Tests set it with useLocation.mockReturnValue.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

const { screen, waitFor } = testingLibrary;

const noop = () => Promise.resolve();

const practitioner = (id, metadata = {}) => {
  const user = createCurrentUser(id);
  return {
    ...user,
    attributes: {
      ...user.attributes,
      profile: { ...user.attributes.profile, publicData: { userType: 'practitioner' }, metadata },
    },
  };
};

const renderPage = (currentUser, onConfirmCheckout = noop) =>
  render(
    <ManageSubscriptionPageComponent
      currentUser={currentUser}
      scrollingDisabled={false}
      confirmCheckoutInProgress={false}
      confirmCheckoutError={null}
      checkoutConfirmed={false}
      onConfirmCheckout={onConfirmCheckout}
    />
  );

const activeProfessional = id =>
  practitioner(id, {
    subscriptionPlan: 'professional',
    subscriptionStatus: 'active',
    stripeCustomerId: 'cus_123',
  });

describe('ManageSubscriptionPageComponent', () => {
  beforeEach(() => {
    useLocation.mockReturnValue({ pathname: '/account/manage-subscription', search: '' });
  });
  it('shows the plans with Essential active by default', async () => {
    renderPage(practitioner('user1'));

    expect(await screen.findByText('ManageSubscriptionPage.heading')).toBeInTheDocument();
    const essential = screen.getByRole('region', { name: 'SubscriptionPlans.essential.name' });
    expect(essential).toHaveTextContent('SubscriptionPlans.activePlan');
    // The Manage subscription tab is there for practitioners
    expect(
      screen.getAllByText('LayoutWrapperAccountSettingsSideNav.manageSubscriptionTabTitle').length
    ).toBeGreaterThan(0);
  });

  it('shows the renewal date and billing button for an active Professional subscription', async () => {
    renderPage(
      practitioner('user1', {
        subscriptionPlan: 'professional',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: '2026-11-06T12:00:00.000Z',
        stripeCustomerId: 'cus_123',
      })
    );

    const professional = await screen.findByRole('region', {
      name: 'SubscriptionPlans.professional.name',
    });
    expect(professional).toHaveTextContent('SubscriptionPlans.activePlan');
    expect(screen.getByText('ManageSubscriptionPage.renewsOn')).toBeInTheDocument();
    expect(screen.getByText('SubscriptionPlans.manageBilling')).toBeInTheDocument();
  });
  describe('returning from the Stripe checkout (?session_id=...)', () => {
    beforeEach(() => {
      useLocation.mockReturnValue({
        pathname: '/account/manage-subscription',
        search: '?session_id=cs_test_1',
      });
    });

    it('confirms the checkout when the subscription is not saved yet', async () => {
      const onConfirmCheckout = jest.fn(() => Promise.resolve());
      renderPage(practitioner('user1'), onConfirmCheckout);

      await waitFor(() => expect(onConfirmCheckout).toHaveBeenCalledWith('cs_test_1'));
      expect(onConfirmCheckout).toHaveBeenCalledTimes(1);
    });

    it('does not confirm when the webhook has already saved the subscription', async () => {
      const onConfirmCheckout = jest.fn(() => Promise.resolve());
      renderPage(activeProfessional('user1'), onConfirmCheckout);

      expect(await screen.findByText('ManageSubscriptionPage.confirmed')).toBeInTheDocument();
      expect(onConfirmCheckout).not.toHaveBeenCalled();
    });
  });
});
