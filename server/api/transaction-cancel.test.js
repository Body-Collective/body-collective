const mockSdk = {
  transactions: { show: jest.fn(), transition: jest.fn(), transitionSpeculative: jest.fn() },
};
const mockIntegrationSdk = { transactions: { updateMetadata: jest.fn(), show: jest.fn() } };
const mockStripe = {
  findPaymentIntentsForTransaction: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  createTransferReversal: jest.fn(),
  createRefund: jest.fn(),
  getDestinationPaymentAvailability: jest.fn(),
  createPayout: jest.fn(),
  updatePaymentIntentMetadata: jest.fn(),
  findPendingPayouts: jest.fn(),
  findPendingRefunds: jest.fn(),
  findPayoutForTransaction: jest.fn(),
};

jest.mock('../log', () => ({ error: () => {} }));
jest.mock('../api-util/sdk', () => ({
  createCookieTokenStore: () => ({}),
  getSdk: () => mockSdk,
  getTrustedSdk: () => Promise.resolve(mockSdk),
  getIntegrationSdk: () => mockIntegrationSdk,
  handleError: (res, e) => res.status(e.status || 500).json({ status: e.status || 500 }),
}));
jest.mock('../services/stripe', () => ({
  REFUND_DONE: 'done',
  REFUND_PENDING: 'pending',
  REFUND_STATUS_KEY: 'bodycollective-cancellation-refund',
  PAYOUT_PAID: 'paid',
  PAYOUT_PENDING: 'pending',
  PAYOUT_STATUS_KEY: 'bodycollective-cancellation-payout',
  findPaymentIntentsForTransaction: (...args) =>
    mockStripe.findPaymentIntentsForTransaction(...args),
  retrievePaymentIntent: (...args) => mockStripe.retrievePaymentIntent(...args),
  createTransferReversal: (...args) => mockStripe.createTransferReversal(...args),
  createRefund: (...args) => mockStripe.createRefund(...args),
  getDestinationPaymentAvailability: (...args) =>
    mockStripe.getDestinationPaymentAvailability(...args),
  createPayout: (...args) => mockStripe.createPayout(...args),
  updatePaymentIntentMetadata: (...args) => mockStripe.updatePaymentIntentMetadata(...args),
  findPendingPayouts: (...args) => mockStripe.findPendingPayouts(...args),
  findPendingRefunds: (...args) => mockStripe.findPendingRefunds(...args),
  findPayoutForTransaction: (...args) => mockStripe.findPayoutForTransaction(...args),
}));

const transactionCancel = require('./transaction-cancel');
const { processPendingRefunds } = require('../services/cancellation/refund');

const DAY_MS = 24 * 60 * 60 * 1000;
const CUSTOMER_ID = 'customer-1';
const PROVIDER_ID = 'provider-1';
const TX_ID = '6a8b6676-2a2d-4bb4-b3d7-d9c1f7762d0b';

const txResponse = ({
  processName = 'default-booking',
  lastTransition = 'transition/accept',
  daysToStart = 10,
  cancellationPolicy,
} = {}) => {
  const start = new Date(Date.now() + daysToStart * DAY_MS);
  return {
    data: {
      data: {
        id: { uuid: TX_ID },
        type: 'transaction',
        attributes: {
          processName,
          lastTransition,
          protectedData: cancellationPolicy ? { cancellationPolicy } : {},
          payinTotal: { amount: 10000, currency: 'EUR' },
          payoutTotal: { amount: 8500, currency: 'EUR' },
        },
        relationships: {
          booking: { data: { id: { uuid: 'booking-1' }, type: 'booking' } },
          listing: { data: { id: { uuid: 'listing-1' }, type: 'listing' } },
          customer: { data: { id: { uuid: CUSTOMER_ID }, type: 'user' } },
          provider: { data: { id: { uuid: PROVIDER_ID }, type: 'user' } },
        },
      },
      included: [
        { id: { uuid: 'booking-1' }, type: 'booking', attributes: { start } },
        {
          id: { uuid: 'listing-1' },
          type: 'listing',
          attributes: {
            publicData: {
              transactionProcessAlias: `${processName}/release-1`,
              event_start: Math.floor(start.getTime() / 1000),
            },
          },
        },
      ],
    },
  };
};

const paymentIntent = () => ({
  latest_charge: {
    amount: 10000,
    currency: 'eur',
    captured: true,
    amount_refunded: 0,
    application_fee_amount: 1500,
    balance_transaction: { fee: 175, currency: 'eur' },
    transfer: {
      id: 'tr_1',
      amount: 10000,
      amount_reversed: 0,
      destination: 'acct_1',
      destination_payment: 'py_1',
    },
  },
});

// Cancel first (the refund marked pending before), then move the money, then record it
const CANCEL_WITH_REFUND = [
  'refund-pending',
  'transition',
  'reversal',
  'refund',
  'metadata',
  'refund-done',
];

const call = async (userId, action) => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  await transactionCancel({ tokenUserId: userId, body: { transactionId: TX_ID, action } }, res);
  return res;
};

const purchase = (daysToStart, cancellationPolicy) =>
  txResponse({
    processName: 'default-purchase',
    lastTransition: 'transition/confirm-payment',
    daysToStart,
    cancellationPolicy,
  });

describe('transaction-cancel', () => {
  let calls;
  beforeEach(() => {
    jest.clearAllMocks();
    calls = [];
    mockSdk.transactions.show.mockResolvedValue(txResponse());
    mockSdk.transactions.transitionSpeculative.mockImplementation(async () =>
      calls.push('speculative')
    );
    mockSdk.transactions.transition.mockImplementation(async () => calls.push('transition'));
    mockIntegrationSdk.transactions.updateMetadata.mockImplementation(async () =>
      calls.push('metadata')
    );
    mockStripe.findPaymentIntentsForTransaction.mockResolvedValue([{ id: 'pi_1' }]);
    mockStripe.retrievePaymentIntent.mockResolvedValue(paymentIntent());
    mockStripe.createTransferReversal.mockImplementation(async () => {
      calls.push('reversal');
      return { id: 'trr_1' };
    });
    mockStripe.createRefund.mockImplementation(async () => {
      calls.push('refund');
      return { id: 're_1' };
    });
    mockStripe.getDestinationPaymentAvailability.mockResolvedValue({
      isAvailable: true,
      availableOn: new Date(),
    });
    mockStripe.createPayout.mockImplementation(async () => {
      calls.push('payout');
      return { id: 'po_1' };
    });
    mockStripe.findPayoutForTransaction.mockResolvedValue(null);
    mockStripe.updatePaymentIntentMetadata.mockImplementation(async (id, metadata) => {
      const status = metadata['bodycollective-cancellation-refund'];
      if (status) {
        calls.push(`refund-${status}`);
      }
      return {};
    });
  });

  it('previews the refund without moving money', async () => {
    const res = await call(CUSTOMER_ID, 'preview');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      policy: 'treatment',
      refundShare: 1,
      currency: 'eur',
      paid: 10000,
      fee: 175,
      refund: 9825,
    });
    expect(calls).toEqual([]);
  });

  it('cancels a treatment more than 24 hours before: refund minus the Stripe fee', async () => {
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(calls).toEqual(CANCEL_WITH_REFUND);
    expect(mockStripe.createTransferReversal).toHaveBeenCalledWith(
      expect.objectContaining({ transferId: 'tr_1', amount: 8500 })
    );
    expect(mockStripe.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: 'pi_1', amount: 9825 })
    );
    const transitionParams = mockSdk.transactions.transition.mock.calls[0][0];
    expect(transitionParams.transition).toEqual('transition/customer-cancel');
    expect(transitionParams.params.metadata.cancellation).toEqual(
      expect.objectContaining({
        status: 'refunding',
        refundShare: 1,
        refundAmount: 9825,
        payoutAmount: 0,
        hasRefund: true,
        hasPayout: false,
      })
    );
    // Recorded once the money has been moved
    const recorded = mockIntegrationSdk.transactions.updateMetadata.mock.calls[0][0];
    expect(recorded.metadata.cancellation).toEqual(
      expect.objectContaining({ status: 'refunded', stripeRefundId: 're_1' })
    );
  });

  it('cancels a treatment within 24 hours without a refund and pays the practitioner', async () => {
    mockSdk.transactions.show.mockResolvedValue(txResponse({ daysToStart: 0.5 }));
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(calls).toEqual(['refund-pending', 'transition', 'payout', 'metadata', 'refund-done']);
    expect(mockStripe.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acct_1', amount: 8500, currency: 'eur' })
    );
  });

  it('refunds half of a seminar place 30 to 14 days before and keeps the payout pending', async () => {
    mockSdk.transactions.show.mockResolvedValue(purchase(20));
    mockStripe.getDestinationPaymentAvailability.mockResolvedValue({
      isAvailable: false,
      availableOn: new Date('2026-11-01T00:00:00Z'),
    });
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(calls).toEqual(CANCEL_WITH_REFUND);
    expect(mockStripe.createTransferReversal).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4250 })
    );
    expect(mockStripe.createRefund).toHaveBeenCalledWith(expect.objectContaining({ amount: 4913 }));
    expect(mockStripe.updatePaymentIntentMetadata).toHaveBeenCalledWith(
      'pi_1',
      expect.objectContaining({
        'bodycollective-cancellation-payout': 'pending',
        'bodycollective-cancellation-payout-amount': '4250',
      })
    );
  });

  it('gives no refund for a non-refundable seminar, also long before', async () => {
    mockSdk.transactions.show.mockResolvedValue(purchase(60, 'seminar-non-refundable'));
    const res = await call(CUSTOMER_ID, 'preview');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ policy: 'seminar-non-refundable', refundShare: 0, refund: 0 })
    );
  });

  it('refuses once it has started, without moving money', async () => {
    mockSdk.transactions.show.mockResolvedValue(txResponse({ daysToStart: -1 }));
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ status: 403, code: 'too-late' });
    expect(calls).toEqual([]);
  });

  it('refuses the practitioner', async () => {
    const res = await call(PROVIDER_ID, 'cancel');
    expect(res.json).toHaveBeenCalledWith({ status: 403, code: 'not-allowed' });
    expect(calls).toEqual([]);
  });

  it('refuses a booking that is not accepted', async () => {
    mockSdk.transactions.show.mockResolvedValue(
      txResponse({ lastTransition: 'transition/confirm-payment' })
    );
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.json).toHaveBeenCalledWith({ status: 403, code: 'not-allowed' });
  });

  it('stops when the Stripe payment does not match the transaction', async () => {
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      latest_charge: { ...paymentIntent().latest_charge, amount: 9999 },
    });
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.json).toHaveBeenCalledWith({ status: 409, code: 'payment-mismatch' });
    expect(calls).toEqual([]);
  });

  it('does not reverse or refund again what was already moved (retry)', async () => {
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      latest_charge: {
        ...paymentIntent().latest_charge,
        amount_refunded: 9825,
        transfer: { ...paymentIntent().latest_charge.transfer, amount_reversed: 8500 },
      },
    });
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(calls).toEqual(['refund-pending', 'transition', 'metadata', 'refund-done']);
  });

  it('keeps the cancellation when moving the money fails, for the job to finish', async () => {
    mockStripe.createRefund.mockRejectedValueOnce(new Error('Stripe down'));
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(calls).toEqual(['refund-pending', 'transition', 'reversal']);
  });

  it('moves no money when the cancel transition fails', async () => {
    mockSdk.transactions.transition.mockRejectedValueOnce({ status: 409 });
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(calls).toEqual(['refund-pending']);
    expect(mockStripe.createRefund).not.toHaveBeenCalled();
  });

  it('uses the event start copied to the transaction, not a later date on the listing', async () => {
    // Listing moved to 5 days ahead, but the place was sold for an event 40 days ahead
    const response = purchase(5);
    response.data.data.attributes.protectedData = {
      cancellationPolicy: 'seminar',
      cancellationStartTime: Math.floor((Date.now() + 40 * DAY_MS) / 1000),
    };
    mockSdk.transactions.show.mockResolvedValue(response);
    const res = await call(CUSTOMER_ID, 'preview');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ refundShare: 1 }));
  });

  describe('pending refunds job', () => {
    const pendingPi = (startedAt, share = '0.5') => ({
      id: 'pi_1',
      metadata: {
        'sharetribe-transaction-id': TX_ID,
        'bodycollective-cancellation-refund': 'pending',
        'bodycollective-cancellation-refund-share': share,
        'bodycollective-cancellation-refund-started-at': startedAt,
      },
    });
    const now = new Date('2026-10-20T12:00:00Z');

    it('finishes the refund of a transaction that is cancelled', async () => {
      mockStripe.findPendingRefunds.mockResolvedValue([pendingPi('2026-10-20T11:00:00Z')]);
      const cancelled = purchase(20);
      cancelled.data.data.attributes.lastTransition = 'transition/customer-cancel';
      cancelled.data.data.attributes.metadata = {
        cancellation: { status: 'refunding', refundShare: 0.5 },
      };
      mockIntegrationSdk.transactions.show.mockResolvedValue(cancelled);
      mockStripe.getDestinationPaymentAvailability.mockResolvedValue({
        isAvailable: false,
        availableOn: new Date('2026-11-01T00:00:00Z'),
      });

      expect(await processPendingRefunds(now)).toEqual(1);
      expect(mockStripe.createTransferReversal).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4250 })
      );
      expect(mockStripe.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4913 })
      );
      expect(calls).toEqual(['reversal', 'refund', 'metadata', 'refund-done']);
    });

    it('refunds nothing when the transaction was not cancelled, and unmarks it', async () => {
      mockStripe.findPendingRefunds.mockResolvedValue([pendingPi('2026-10-20T11:00:00Z')]);
      mockIntegrationSdk.transactions.show.mockResolvedValue(purchase(20));
      expect(await processPendingRefunds(now)).toEqual(0);
      expect(mockStripe.createRefund).not.toHaveBeenCalled();
      expect(mockStripe.updatePaymentIntentMetadata).toHaveBeenCalledWith('pi_1', {
        'bodycollective-cancellation-refund': '',
      });
    });

    it('leaves recent cancellations to the request that started them', async () => {
      mockStripe.findPendingRefunds.mockResolvedValue([pendingPi('2026-10-20T11:55:00Z')]);
      expect(await processPendingRefunds(now)).toEqual(0);
      expect(mockIntegrationSdk.transactions.show).not.toHaveBeenCalled();
    });

    it('uses the refund share of the cancel transition, not the one of the payment mark', async () => {
      // Two requests on both sides of a policy limit: the one that cancelled had a 100% refund
      mockStripe.findPendingRefunds.mockResolvedValue([pendingPi('2026-10-20T11:00:00Z', '0.5')]);
      const cancelled = purchase(40);
      cancelled.data.data.attributes.lastTransition = 'transition/customer-cancel';
      cancelled.data.data.attributes.metadata = {
        cancellation: { status: 'refunding', refundShare: 1 },
      };
      mockIntegrationSdk.transactions.show.mockResolvedValue(cancelled);
      expect(await processPendingRefunds(now)).toEqual(1);
      expect(mockStripe.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 9825 })
      );
      // The practitioner keeps nothing: no payout
      expect(mockStripe.createPayout).not.toHaveBeenCalled();
    });

    it('skips a transaction without a valid refund share', async () => {
      mockStripe.findPendingRefunds.mockResolvedValue([pendingPi('2026-10-20T11:00:00Z')]);
      const cancelled = purchase(20);
      cancelled.data.data.attributes.lastTransition = 'transition/customer-cancel';
      cancelled.data.data.attributes.metadata = { cancellation: { refundShare: '1' } };
      mockIntegrationSdk.transactions.show.mockResolvedValue(cancelled);
      expect(await processPendingRefunds(now)).toEqual(0);
      expect(mockStripe.createRefund).not.toHaveBeenCalled();
    });

    it('skips a mark without a readable start time', async () => {
      mockStripe.findPendingRefunds.mockResolvedValue([pendingPi('not a date')]);
      expect(await processPendingRefunds(now)).toEqual(0);
      expect(mockIntegrationSdk.transactions.show).not.toHaveBeenCalled();
    });
  });

  it('does not start a second cancellation of the same payment', async () => {
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      ...paymentIntent(),
      metadata: { 'bodycollective-cancellation-refund': 'pending' },
    });
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.json).toHaveBeenCalledWith({ status: 409, code: 'already-cancelling' });
    expect(calls).toEqual([]);
  });

  it('answers a bad request with 400', async () => {
    const res = await call(CUSTOMER_ID, 'delete');
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
