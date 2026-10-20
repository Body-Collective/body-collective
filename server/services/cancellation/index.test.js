const {
  getCancelError,
  getCancelTransition,
  getRefundAmounts,
  getStartTime,
  startOfDayInBerlin,
} = require('./index');

const DAY_MS = 24 * 60 * 60 * 1000;

describe('cancellation rules', () => {
  describe('getCancelTransition', () => {
    it('allows the refund cancellation of accepted bookings and purchased places', () => {
      expect(getCancelTransition('default-booking', 'transition/accept')).toEqual(
        'transition/customer-cancel'
      );
      expect(getCancelTransition('default-booking', 'transition/operator-accept')).toEqual(
        'transition/customer-cancel'
      );
      expect(getCancelTransition('default-purchase', 'transition/confirm-payment')).toEqual(
        'transition/customer-cancel'
      );
    });

    it('does not allow it in other states and processes', () => {
      expect(getCancelTransition('default-booking', 'transition/confirm-payment')).toBeNull();
      expect(getCancelTransition('default-booking', 'transition/complete')).toBeNull();
      expect(getCancelTransition('default-purchase', 'transition/mark-delivered')).toBeNull();
      expect(getCancelTransition('default-inquiry', 'transition/inquire')).toBeNull();
    });
  });

  describe('getCancelError', () => {
    const now = new Date('2026-10-20T10:00:00Z');
    const transition = 'transition/customer-cancel';

    it('lets the customer cancel more than 7 days before the start', () => {
      const startTime = new Date(now.getTime() + 8 * DAY_MS);
      expect(getCancelError({ role: 'customer', cancelTransition: transition, startTime, now })).toBeNull();
    });

    it('is too late 7 days or less before the start', () => {
      const startTime = new Date(now.getTime() + 7 * DAY_MS);
      expect(getCancelError({ role: 'customer', cancelTransition: transition, startTime, now })).toEqual(
        'too-late'
      );
    });

    it('does not let the practitioner cancel', () => {
      const startTime = new Date(now.getTime() + 30 * DAY_MS);
      expect(getCancelError({ role: 'provider', cancelTransition: transition, startTime, now })).toEqual(
        'not-allowed'
      );
    });

    it('needs a start time and a cancel transition', () => {
      expect(getCancelError({ role: 'customer', cancelTransition: transition, startTime: null, now })).toEqual(
        'no-start-time'
      );
      expect(getCancelError({ role: 'customer', cancelTransition: null, startTime: now, now })).toEqual(
        'not-allowed'
      );
    });
  });

  describe('getStartTime', () => {
    it('is the start of the booking', () => {
      const start = new Date('2026-11-01T09:00:00Z');
      expect(
        getStartTime({ processName: 'default-booking', booking: { attributes: { start } } })
      ).toEqual(start);
    });

    it('is the start of the event day in Berlin for seminars', () => {
      const listing = { attributes: { publicData: { event_date_sort: 20260912 } } };
      // Summer time: Berlin is UTC+2
      expect(getStartTime({ processName: 'default-purchase', listing })).toEqual(
        new Date('2026-09-11T22:00:00Z')
      );
    });

    it('is null without a date', () => {
      expect(getStartTime({ processName: 'default-purchase', listing: { attributes: {} } })).toBeNull();
      expect(getStartTime({ processName: 'default-booking', booking: null })).toBeNull();
    });
  });

  describe('startOfDayInBerlin', () => {
    it('handles winter and summer time', () => {
      expect(startOfDayInBerlin(20261215)).toEqual(new Date('2026-12-14T23:00:00Z'));
      expect(startOfDayInBerlin('20260701')).toEqual(new Date('2026-06-30T22:00:00Z'));
    });

    it('is null for anything else than YYYYMMDD', () => {
      expect(startOfDayInBerlin('12 May 2026')).toBeNull();
      expect(startOfDayInBerlin(null)).toBeNull();
    });
  });

  describe('getRefundAmounts', () => {
    const paymentIntent = (overrides = {}) => ({
      latest_charge: {
        amount: 10000,
        currency: 'eur',
        captured: true,
        amount_refunded: 0,
        application_fee_amount: 1500,
        balance_transaction: { fee: 175, currency: 'eur' },
        transfer: { id: 'tr_1', amount: 10000, amount_reversed: 0 },
        ...overrides,
      },
    });

    it('refunds the payment minus the Stripe fee', () => {
      expect(getRefundAmounts(paymentIntent())).toEqual({
        currency: 'eur',
        paid: 10000,
        fee: 175,
        refund: 9825,
        providerShare: 8500,
        alreadyRefunded: 0,
        alreadyReversed: 0,
        transferId: 'tr_1',
      });
    });

    it('does not support a payment that is not captured or in another currency', () => {
      expect(() => getRefundAmounts(paymentIntent({ captured: false }))).toThrow(
        expect.objectContaining({ code: 'payment-not-captured' })
      );
      expect(() =>
        getRefundAmounts(paymentIntent({ balance_transaction: { fee: 175, currency: 'usd' } }))
      ).toThrow(expect.objectContaining({ code: 'currency-mismatch' }));
    });
  });
});
