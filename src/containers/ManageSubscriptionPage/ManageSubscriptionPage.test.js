import React from 'react';
import '@testing-library/jest-dom';

import { createCurrentUser } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { ManageSubscriptionPageComponent } from './ManageSubscriptionPage';

const { screen } = testingLibrary;

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

const renderPage = currentUser =>
  render(
    <ManageSubscriptionPageComponent
      currentUser={currentUser}
      scrollingDisabled={false}
      confirmCheckoutInProgress={false}
      confirmCheckoutError={null}
      checkoutConfirmed={false}
      onConfirmCheckout={noop}
    />
  );

describe('ManageSubscriptionPageComponent', () => {
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
});
