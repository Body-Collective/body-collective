import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { PLAN_ESSENTIAL, PLAN_PROFESSIONAL } from '../../util/subscription';

import SubscriptionPlans from './SubscriptionPlans';

const { screen, userEvent } = testingLibrary;

const noop = () => null;
const PAYMENT_LINK = 'https://buy.stripe.com/test_abc?client_reference_id=user1';

describe('SubscriptionPlans', () => {
  it('marks Essential as active without a button and offers Subscribe for Professional', () => {
    render(
      <SubscriptionPlans
        activePlan={PLAN_ESSENTIAL}
        paymentLinkUrl={PAYMENT_LINK}
        hasBillingAccount={false}
        onManageBilling={noop}
      />
    );

    // One active badge, on the Essential card
    expect(screen.getAllByText('SubscriptionPlans.activePlan')).toHaveLength(1);
    const essential = screen.getByRole('region', { name: 'SubscriptionPlans.essential.name' });
    expect(essential).toHaveTextContent('SubscriptionPlans.activePlan');
    expect(essential.querySelector('a, button')).toBeNull();

    const subscribe = screen.getByRole('link', { name: /SubscriptionPlans.subscribe/ });
    expect(subscribe).toHaveAttribute('href', PAYMENT_LINK);
    expect(screen.queryByText('SubscriptionPlans.manageBilling')).not.toBeInTheDocument();
  });

  it('marks Professional as active and opens billing management for a subscriber', async () => {
    const onManageBilling = jest.fn();
    render(
      <SubscriptionPlans
        activePlan={PLAN_PROFESSIONAL}
        paymentLinkUrl={PAYMENT_LINK}
        hasBillingAccount
        onManageBilling={onManageBilling}
      />
    );

    const professional = screen.getByRole('region', {
      name: 'SubscriptionPlans.professional.name',
    });
    expect(professional).toHaveTextContent('SubscriptionPlans.activePlan');
    expect(screen.queryByText('SubscriptionPlans.subscribe')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: /manageBilling/ }));
    expect(onManageBilling).toHaveBeenCalledTimes(1);
  });

  it('shows no Subscribe button when the payment link is not configured', () => {
    render(
      <SubscriptionPlans
        activePlan={PLAN_ESSENTIAL}
        paymentLinkUrl={null}
        hasBillingAccount={false}
        onManageBilling={noop}
      />
    );
    expect(screen.queryByText('SubscriptionPlans.subscribe')).not.toBeInTheDocument();
  });
});
