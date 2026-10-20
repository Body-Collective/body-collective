const mockSdk = {
  transactions: { show: jest.fn(), transition: jest.fn(), transitionSpeculative: jest.fn() },
};
const mockIntegrationSdk = { transactions: { updateMetadata: jest.fn() } };
const mockStripe = {
  findPaymentIntentsForTransaction: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  createTransferReversal: jest.fn(),
  createRefund: jest.fn(),
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
  findPaymentIntentsForTransaction: (...args) =>
    mockStripe.findPaymentIntentsForTransaction(...args),
  retrievePaymentIntent: (...args) => mockStripe.retrievePaymentIntent(...args),
  createTransferReversal: (...args) => mockStripe.createTransferReversal(...args),
  createRefund: (...args) => mockStripe.createRefund(...args),
}));

const transactionCancel = require('./transaction-cancel');

const DAY_MS = 24 * 60 * 60 * 1000;
const CUSTOMER_ID = 'customer-1';
const PROVIDER_ID = 'provider-1';
const TX_ID = '6a8b6676-2a2d-4bb4-b3d7-d9c1f7762d0b';

const yyyymmdd = date =>
  Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
      date.getUTCDate()
    ).padStart(2, '0')}`
  );

const txResponse = ({
  processName = 'default-booking',
  lastTransition = 'transition/accept',
  daysToStart = 10,
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
          attributes: { publicData: { event_date_sort: yyyymmdd(start) } },
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
    transfer: { id: 'tr_1', amount: 10000, amount_reversed: 0 },
  },
});

const call = async (userId, action) => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  await transactionCancel({ tokenUserId: userId, body: { transactionId: TX_ID, action } }, res);
  return res;
};

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
  });

  it('previews the refund without moving money', async () => {
    const res = await call(CUSTOMER_ID, 'preview');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ currency: 'eur', paid: 10000, fee: 175, refund: 9825 });
    expect(calls).toEqual([]);
  });

  it('cancels an accepted booking: reversal, refund, then the transition', async () => {
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
      expect.objectContaining({ status: 'refunded', refundAmount: 9825, stripeRefundId: 're_1' })
    );
  });

  it('cancels a purchased seminar place by the date of the event', async () => {
    mockSdk.transactions.show.mockResolvedValue(
      txResponse({ processName: 'default-purchase', lastTransition: 'transition/confirm-payment' })
    );
    const res = await call(CUSTOMER_ID, 'cancel');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(calls).toEqual(['speculative', 'metadata', 'reversal', 'refund', 'transition']);
  });

  it('refuses 7 days or less before the start, without moving money', async () => {
    mockSdk.transactions.show.mockResolvedValue(txResponse({ daysToStart: 5 }));
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
        transfer: { id: 'tr_1', amount: 10000, amount_reversed: 8500 },
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
