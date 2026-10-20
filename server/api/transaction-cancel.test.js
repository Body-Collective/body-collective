const mockSdk = {
  transactions: { show: jest.fn(), transition: jest.fn(), transitionSpeculative: jest.fn() },
};
const mockIntegrationSdk = { transactions: { updateMetadata: jest.fn() } };
const mockStripe = {
  findPaymentIntentsForTransaction: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  createTransferReversal: jest.fn(),
  createRefund: jest.fn(),
  getDestinationPaymentAvailability: jest.fn(),
  createPayout: jest.fn(),
  updatePaymentIntentMetadata: jest.fn(),
  findPendingPayouts: jest.fn(),
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
}));

const transactionCancel = require('./transaction-cancel');

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
    mockStripe.updatePaymentIntentMetadata.mockResolvedValue({});
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
    expect(calls).toEqual(['speculative', 'metadata', 'reversal', 'refund', 'transition']);
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
        status: 'refunded',
        refundShare: 1,
        refundAmount: 9825,
        payoutAmount: 0,
        hasRefund: true,
        hasPayout: false,
        stripeRefundId: 're_1',
      })
    );
  });

  it('cancels a treatment within 24 hours without a refund and pays the practitioner', async () => {
    mockSdk.transactions.show.mockResolvedValue(txResponse({ daysToStart: 0.5 }));
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(calls).toEqual(['speculative', 'metadata', 'transition', 'payout']);
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
    expect(calls).toEqual(['speculative', 'metadata', 'reversal', 'refund', 'transition']);
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
    expect(calls).toEqual(['speculative', 'metadata', 'transition']);
  });

  it('answers a bad request with 400', async () => {
    const res = await call(CUSTOMER_ID, 'delete');
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
