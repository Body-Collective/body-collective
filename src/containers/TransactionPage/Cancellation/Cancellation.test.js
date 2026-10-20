import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import Cancellation from './Cancellation';
import { getCancellationInfo } from './Cancellation.helpers';

const { screen, userEvent, waitFor } = testingLibrary;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = new Date('2026-10-01T12:00:00.000Z');
const start = new Date('2026-10-20T14:00:00.000Z');
const end = new Date('2026-10-20T17:00:00.000Z');

const eventStart = new Date('2026-12-12T09:00:00.000Z');

const bookingTx = ({ lastTransition, metadata = {} }) => ({
  attributes: { processName: 'default-booking', lastTransition, metadata },
  booking: { attributes: { start, end } },
  listing: { attributes: { publicData: { transactionProcessAlias: 'default-booking/release-1' } } },
});
const purchaseTx = ({
  lastTransition,
  eventStartSec = eventStart.getTime() / 1000,
  protectedData = {},
}) => ({
  attributes: { processName: 'default-purchase', lastTransition, metadata: {}, protectedData },
  listing: {
    attributes: {
      publicData: {
        transactionProcessAlias: 'default-purchase/release-1',
        ...(eventStartSec ? { event_start: eventStartSec } : {}),
      },
    },
  },
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

  it('treatments: refund more than 24 hours before, then cancel without refund', () => {
    const params = {
      transaction: bookingTx({ lastTransition: 'transition/accept' }),
      transactionRole: 'customer',
      nextTransitions: next(['transition/customer-cancel']),
    };
    const early = getCancellationInfo({ ...params, now: NOW });
    expect(early).toEqual(
      expect.objectContaining({ canCancel: true, policy: 'treatment', refundShare: 1 })
    );
    expect(early.refundUntil).toEqual(new Date(start.getTime() - DAY_MS));

    const late = getCancellationInfo({ ...params, now: new Date(start.getTime() - HOUR_MS) });
    expect(late).toEqual(expect.objectContaining({ canCancel: true, refundShare: 0 }));
    // Started: nothing to show
    expect(getCancellationInfo({ ...params, now: start })).toBe(null);
  });

  it('seminars: 100%, 50% and nothing by the days before the event', () => {
    const params = {
      transaction: purchaseTx({ lastTransition: 'transition/confirm-payment' }),
      transactionRole: 'customer',
      nextTransitions: next(['transition/customer-cancel']),
    };
    const share = now => getCancellationInfo({ ...params, now }).refundShare;
    expect(share(new Date(eventStart.getTime() - 31 * DAY_MS))).toEqual(1);
    expect(share(new Date(eventStart.getTime() - 20 * DAY_MS))).toEqual(0.5);
    expect(share(new Date(eventStart.getTime() - 10 * DAY_MS))).toEqual(0);
  });

  it('uses the policy copied to the transaction: non-refundable events', () => {
    const info = getCancellationInfo({
      transaction: purchaseTx({
        lastTransition: 'transition/confirm-payment',
        protectedData: { cancellationPolicy: 'seminar-non-refundable' },
      }),
      transactionRole: 'customer',
      nextTransitions: next(['transition/customer-cancel']),
      now: new Date(eventStart.getTime() - 60 * DAY_MS),
    });
    expect(info).toEqual(
      expect.objectContaining({ policy: 'seminar-non-refundable', refundShare: 0 })
    );
  });

  it('does not offer a cancellation of a place without an event date', () => {
    expect(
      getCancellationInfo({
        transaction: purchaseTx({
          lastTransition: 'transition/confirm-payment',
          eventStartSec: null,
        }),
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
    policy: 'treatment',
    refundShare: 1,
    refundUntil: new Date(start.getTime() - DAY_MS),
    startTime: start,
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

  it('lets the customer cancel without a refund', () => {
    render(
      <Cancellation
        {...baseProps}
        info={{ ...acceptedInfo, refundShare: 0, refundUntil: null }}
        cancelPreview={{ currency: 'eur', paid: 10000, fee: 175, refund: 0 }}
      />
    );
    expect(
      screen.getByText('TransactionPage.Cancellation.cancelDescription.noRefundNow')
    ).toBeInTheDocument();
  });

  it('tells the provider what is paid out after a place is cancelled', () => {
    render(
      <Cancellation
        {...baseProps}
        transactionRole="provider"
        info={{
          isBooking: false,
          isCancelledWithRefund: true,
          cancellation: { payoutAmount: 4250, currency: 'eur' },
        }}
      />
    );
    expect(
      screen.getByText('TransactionPage.Cancellation.cancelledProvider.place')
    ).toBeInTheDocument();
    expect(screen.getByText('TransactionPage.Cancellation.providerPayout')).toBeInTheDocument();
  });
});
