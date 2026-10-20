const mockStripe = {
  createPayout: jest.fn(),
  findPendingPayouts: jest.fn(),
  getDestinationPaymentAvailability: jest.fn(),
  updatePaymentIntentMetadata: jest.fn(),
};

jest.mock('../../log', () => ({ error: () => {} }));
jest.mock('../stripe', () => ({
  PAYOUT_PAID: 'paid',
  PAYOUT_PENDING: 'pending',
  PAYOUT_STATUS_KEY: 'bodycollective-cancellation-payout',
  createPayout: (...args) => mockStripe.createPayout(...args),
  findPendingPayouts: (...args) => mockStripe.findPendingPayouts(...args),
  getDestinationPaymentAvailability: (...args) =>
    mockStripe.getDestinationPaymentAvailability(...args),
  updatePaymentIntentMetadata: (...args) => mockStripe.updatePaymentIntentMetadata(...args),
}));

const { payOutOrSchedule, processPendingPayouts } = require('./payouts');

const amounts = {
  payout: 4250,
  accountId: 'acct_1',
  destinationPaymentId: 'py_1',
  currency: 'eur',
};

describe('cancellation payouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStripe.createPayout.mockResolvedValue({ id: 'po_1' });
    mockStripe.updatePaymentIntentMetadata.mockResolvedValue({});
  });

  it('pays nothing when the practitioner keeps nothing', async () => {
    const result = await payOutOrSchedule({
      paymentIntentId: 'pi_1',
      transactionId: 'tx-1',
      amounts: { ...amounts, payout: 0 },
    });
    expect(result).toEqual({ status: 'none' });
    expect(mockStripe.getDestinationPaymentAvailability).not.toHaveBeenCalled();
  });

  it('pays out right away when the funds are available', async () => {
    mockStripe.getDestinationPaymentAvailability.mockResolvedValue({ isAvailable: true });
    const result = await payOutOrSchedule({
      paymentIntentId: 'pi_1',
      transactionId: 'tx-1',
      amounts,
    });
    expect(result).toEqual({ status: 'paid' });
    expect(mockStripe.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'acct_1',
        amount: 4250,
        idempotencyKey: 'cancellation-payout-tx-1',
      })
    );
  });

  it('pays the pending payouts whose funds have become available', async () => {
    const pending = availableOn => ({
      id: `pi_${availableOn}`,
      currency: 'eur',
      metadata: {
        'sharetribe-transaction-id': `tx-${availableOn}`,
        'bodycollective-cancellation-payout-amount': '4250',
        'bodycollective-cancellation-payout-account': 'acct_1',
        'bodycollective-cancellation-payout-payment': 'py_1',
        'bodycollective-cancellation-payout-available-on': availableOn,
      },
    });
    mockStripe.findPendingPayouts.mockResolvedValue([
      pending('2026-10-01T00:00:00.000Z'),
      pending('2026-12-01T00:00:00.000Z'),
    ]);
    mockStripe.getDestinationPaymentAvailability.mockResolvedValue({ isAvailable: true });

    const count = await processPendingPayouts(new Date('2026-10-20T00:00:00Z'));
    expect(count).toEqual(1);
    expect(mockStripe.createPayout).toHaveBeenCalledTimes(1);
    expect(mockStripe.updatePaymentIntentMetadata).toHaveBeenCalledWith(
      'pi_2026-10-01T00:00:00.000Z',
      expect.objectContaining({ 'bodycollective-cancellation-payout': 'paid' })
    );
  });
});
