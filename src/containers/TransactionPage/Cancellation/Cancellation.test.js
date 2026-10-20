import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import Cancellation from './Cancellation';
import { getCancellationInfo } from './Cancellation.helpers';

const { screen, userEvent, waitFor } = testingLibrary;

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-01T12:00:00.000Z');
const start = new Date('2026-10-20T14:00:00.000Z');
const end = new Date('2026-10-20T17:00:00.000Z');

const bookingTx = ({ lastTransition, metadata = {} }) => ({
  attributes: { processName: 'default-booking', lastTransition, metadata },
  booking: { attributes: { start, end } },
  listing: { attributes: { publicData: {} } },
});
const purchaseTx = ({ lastTransition, eventDate = 20261020 }) => ({
  attributes: { processName: 'default-purchase', lastTransition, metadata: {} },
  listing: { attributes: { publicData: { event_date_sort: eventDate } } },
});
const next = names => names.map(name => ({ attributes: { name } }));

describe('getCancellationInfo', () => {
  it('offers a free cancellation to the customer before the booking is accepted', () => {
    const info = getCancellationInfo({
      transaction: bookingTx({ lastTransition: 'transition/confirm-payment' }),
      transactionRole: 'customer',
      nextTransitions: next(['transition/customer-cancel-request']),
      now: NOW,
    });
    expect(info.canCancelRequest).toBe(true);
    expect(info.canCancel).toBe(false);
  });

  it('offers a cancellation with refund more than 7 days before an accepted booking', () => {
    const params = {
      transaction: bookingTx({ lastTransition: 'transition/accept' }),
      transactionRole: 'customer',
      nextTransitions: next(['transition/customer-cancel']),
    };
    expect(getCancellationInfo({ ...params, now: NOW }).canCancel).toBe(true);
    // 7 days or less before the start: nothing to show
    expect(getCancellationInfo({ ...params, now: new Date(start.getTime() - 7 * DAY_MS) })).toBe(
      null
    );
  });

  it('offers a cancellation of a purchased place until 7 days before the event day in Berlin', () => {
    const params = {
      transaction: purchaseTx({ lastTransition: 'transition/confirm-payment' }),
      transactionRole: 'customer',
      nextTransitions: next(['transition/customer-cancel']),
    };
    const info = getCancellationInfo({ ...params, now: NOW });
    expect(info.isBooking).toBe(false);
    expect(info.canCancel).toBe(true);
    // The event day starts on 2026-10-19T22:00:00Z in Berlin (summer time)
    expect(info.cancelDeadline).toEqual(new Date('2026-10-12T22:00:00.000Z'));
    expect(getCancellationInfo({ ...params, now: new Date('2026-10-13T00:00:00.000Z') })).toBe(
      null
    );
  });

  it('does not offer a cancellation of a place without an event date', () => {
    expect(
      getCancellationInfo({
        transaction: purchaseTx({ lastTransition: 'transition/confirm-payment', eventDate: null }),
        transactionRole: 'customer',
        nextTransitions: next(['transition/customer-cancel']),
        now: NOW,
      })
    ).toBe(null);
  });

  it('does not let the provider cancel', () => {
    expect(
      getCancellationInfo({
        transaction: bookingTx({ lastTransition: 'transition/accept' }),
        transactionRole: 'provider',
        nextTransitions: next(['transition/complete']),
        now: NOW,
      })
    ).toBe(null);
  });

  it('shows the refund after a cancellation', () => {
    const cancellation = { paidAmount: 10000, feeAmount: 175, refundAmount: 9825, currency: 'eur' };
    const info = getCancellationInfo({
      transaction: bookingTx({
        lastTransition: 'transition/customer-cancel',
        metadata: { cancellation },
      }),
      transactionRole: 'customer',
      nextTransitions: [],
      now: NOW,
    });
    expect(info.isCancelledWithRefund).toBe(true);
    expect(info.cancellation).toEqual(cancellation);
  });
});

describe('Cancellation', () => {
  // The confirmation modals are rendered in a portal
  beforeAll(() => {
    const portalRoot = document.createElement('div');
    portalRoot.id = 'portal-root';
    document.body.appendChild(portalRoot);
  });

  const baseProps = {
    transactionRole: 'customer',
    otherUserDisplayName: 'Hank',
    listingTitle: 'Yoga retreat',
    timeZone: 'Europe/Berlin',
    onCancelRequest: jest.fn(() => Promise.resolve()),
    onFetchCancelPreview: jest.fn(() => Promise.resolve()),
    onCancel: jest.fn(() => Promise.resolve()),
    onManageDisableScrolling: jest.fn(),
    cancelPreview: null,
    cancelPreviewInProgress: false,
    cancelInProgress: false,
  };
  const acceptedInfo = {
    isBooking: true,
    canCancel: true,
    startTime: start,
    cancelDeadline: new Date(start.getTime() - 7 * DAY_MS),
  };

  it('shows the refund before the customer confirms the cancellation', async () => {
    const onCancel = jest.fn(() => Promise.resolve());
    const onFetchCancelPreview = jest.fn(() => Promise.resolve());
    render(
      <Cancellation
        {...baseProps}
        info={acceptedInfo}
        onCancel={onCancel}
        onFetchCancelPreview={onFetchCancelPreview}
        cancelPreview={{ currency: 'eur', paid: 10000, fee: 175, refund: 9825 }}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'TransactionPage.Cancellation.cancelButton.booking' })
    );
    await waitFor(() => expect(onFetchCancelPreview).toHaveBeenCalled());
    expect(screen.getByText('TransactionPage.Cancellation.fee')).toBeInTheDocument();
    expect(screen.getByText('TransactionPage.Cancellation.refund')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'TransactionPage.Cancellation.cancelConfirm.booking' })
    );
    expect(onCancel).toHaveBeenCalled();
  });

  it('tells the provider that there is no payout after a place is cancelled', () => {
    render(
      <Cancellation
        {...baseProps}
        transactionRole="provider"
        info={{ isBooking: false, isCancelledWithRefund: true, cancellation: null }}
      />
    );
    expect(
      screen.getByText('TransactionPage.Cancellation.cancelledProvider.place')
    ).toBeInTheDocument();
  });
});
