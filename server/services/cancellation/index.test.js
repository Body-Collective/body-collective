const {
  getCancelError,
  getCancelTransition,
  getListingPolicy,
  getRefundAmounts,
  getRefundShare,
  getStartTime,
  getTransactionPolicy,
  startOfDayInBerlin,
  withCancellationPolicy,
} = require('./index');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe('cancellation rules', () => {
  describe('getCancelTransition', () => {
    it('allows the cancellation of accepted bookings and purchased places', () => {
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
    const params = { role: 'customer', cancelTransition: 'transition/customer-cancel', now };
    const policy = 'treatment';

    it('lets the customer cancel until the start, whatever the refund', () => {
      const startTime = new Date(now.getTime() + 60 * 1000);
      expect(getCancelError({ ...params, policy, startTime })).toBeNull();
    });

    it('is too late once it has started', () => {
      expect(getCancelError({ ...params, policy, startTime: now })).toEqual('too-late');
    });

    it('does not let the practitioner cancel', () => {
      const startTime = new Date(now.getTime() + 30 * DAY_MS);
      expect(getCancelError({ ...params, role: 'provider', policy, startTime })).toEqual(
        'not-allowed'
      );
    });

    it('needs a start time, a policy and a cancel transition', () => {
      expect(getCancelError({ ...params, policy, startTime: null })).toEqual('no-start-time');
      expect(getCancelError({ ...params, policy: null, startTime: now })).toEqual('not-allowed');
      expect(getCancelError({ ...params, cancelTransition: null, policy, startTime: now })).toEqual(
        'not-allowed'
      );
    });
  });

  describe('policies', () => {
    const listing = (alias, extra = {}) => ({
      attributes: { publicData: { transactionProcessAlias: alias, ...extra } },
    });

    it('picks the policy of the listing', () => {
      expect(getListingPolicy(listing('default-booking/release-1'))).toEqual('treatment');
      expect(getListingPolicy(listing('default-purchase/release-1'))).toEqual('seminar');
      expect(
        getListingPolicy(listing('default-purchase/release-1', { offers_cancellations: 'yes' }))
      ).toEqual('seminar');
      expect(
        getListingPolicy(listing('default-purchase/release-1', { offers_cancellations: 'no' }))
      ).toEqual('seminar-non-refundable');
      expect(getListingPolicy(listing('default-inquiry/release-1'))).toBeNull();
    });

    it('uses the policy copied to the transaction before the listing', () => {
      const tx = {
        attributes: { protectedData: { cancellationPolicy: 'seminar-non-refundable' } },
      };
      expect(
        getTransactionPolicy(
          { ...tx, attributes: { ...tx.attributes, processName: 'default-purchase' } },
          listing('default-purchase/release-1')
        )
      ).toEqual('seminar-non-refundable');
      expect(
        getTransactionPolicy(
          { attributes: { processName: 'default-purchase' } },
          listing('default-purchase/release-1')
        )
      ).toEqual('seminar');
    });

    it('ignores a policy the server did not write or of another process', () => {
      const purchaseTx = cancellationPolicy => ({
        attributes: { processName: 'default-purchase', protectedData: { cancellationPolicy } },
      });
      // A booking policy on a purchase: the listing's counts
      expect(
        getTransactionPolicy(purchaseTx('treatment'), listing('default-purchase/release-1'))
      ).toEqual('seminar');
      // A listing without a policy (e.g. another process): no cancellation
      expect(
        getTransactionPolicy(purchaseTx('seminar'), listing('default-inquiry/release-1'))
      ).toBeNull();
    });

    it('always writes the start of the event and drops values sent by the client', () => {
      const params = {
        protectedData: {
          note: 'x',
          cancellationPolicy: 'seminar',
          cancellationStartTime: 4102444800,
        },
      };
      // Older listing: only event_date_sort
      const old = listing('default-purchase/release-1', { event_date_sort: 20260912 });
      expect(
        withCancellationPolicy('transition/request-payment', params, old).protectedData
      ).toEqual({
        note: 'x',
        cancellationPolicy: 'seminar',
        cancellationStartTime: Date.parse('2026-09-11T22:00:00Z') / 1000,
      });
      // No date on the listing: null replaces anything stored earlier
      const none = listing('default-purchase/release-1');
      expect(
        withCancellationPolicy('transition/request-payment-after-inquiry', params, none)
          .protectedData.cancellationStartTime
      ).toBeNull();
      // Other transitions: the server-only keys are removed
      expect(withCancellationPolicy('transition/inquire', params, old).protectedData).toEqual({
        note: 'x',
      });
    });

    it('copies the policy to the protected data of paid transactions only', () => {
      const l = listing('default-purchase/release-1', { offers_cancellations: 'no' });
      const params = { listingId: 'l1', protectedData: { note: 'x' } };
      expect(withCancellationPolicy('transition/request-payment', params, l)).toEqual({
        listingId: 'l1',
        protectedData: {
          note: 'x',
          cancellationPolicy: 'seminar-non-refundable',
          cancellationStartTime: null,
        },
      });
      expect(withCancellationPolicy('transition/inquire', params, l)).toBe(params);
    });

    it('treatments: 100% more than 24 hours before, then nothing', () => {
      const now = new Date('2026-10-20T10:00:00Z');
      const share = hours =>
        getRefundShare({
          policy: 'treatment',
          startTime: new Date(now.getTime() + hours * HOUR_MS),
          now,
        });
      expect(share(25)).toEqual(1);
      expect(share(24)).toEqual(0);
      expect(share(1)).toEqual(0);
    });

    it('seminars: 100% more than 30 days before, 50% until 14 days, then nothing', () => {
      const now = new Date('2026-10-20T10:00:00Z');
      const share = (policy, days) =>
        getRefundShare({ policy, startTime: new Date(now.getTime() + days * DAY_MS), now });
      expect(share('seminar', 31)).toEqual(1);
      expect(share('seminar', 30)).toEqual(0.5);
      expect(share('seminar', 15)).toEqual(0.5);
      expect(share('seminar', 14)).toEqual(0);
      expect(share('seminar-non-refundable', 60)).toEqual(0);
    });
  });

  describe('getStartTime', () => {
    it('is the start of the booking', () => {
      const start = new Date('2026-11-01T09:00:00Z');
      expect(
        getStartTime({ processName: 'default-booking', booking: { attributes: { start } } })
      ).toEqual(start);
    });

    it('is event_start for seminars', () => {
      const listing = { attributes: { publicData: { event_start: 1789200000 } } };
      expect(getStartTime({ processName: 'default-purchase', listing })).toEqual(
        new Date(1789200000 * 1000)
      );
    });

    it('is the start of the event day in Berlin for older seminars', () => {
      const listing = { attributes: { publicData: { event_date_sort: 20260912 } } };
      // Summer time: Berlin is UTC+2
      expect(getStartTime({ processName: 'default-purchase', listing })).toEqual(
        new Date('2026-09-11T22:00:00Z')
      );
    });

    it('is null without a date', () => {
      expect(
        getStartTime({ processName: 'default-purchase', listing: { attributes: {} } })
      ).toBeNull();
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
        transfer: {
          id: 'tr_1',
          amount: 10000,
          amount_reversed: 0,
          destination: 'acct_1',
          destination_payment: 'py_1',
        },
        ...overrides,
      },
    });

    it('refunds the payment minus the Stripe fee and takes back the practitioner share', () => {
      expect(getRefundAmounts(paymentIntent())).toEqual({
        refundShare: 1,
        currency: 'eur',
        paid: 10000,
        fee: 175,
        refund: 9825,
        providerShare: 8500,
        reversal: 8500,
        payout: 0,
        alreadyRefunded: 0,
        alreadyReversed: 0,
        transferId: 'tr_1',
        accountId: 'acct_1',
        destinationPaymentId: 'py_1',
      });
    });

    it('splits the refund, the practitioner share and the commission by the refund share', () => {
      expect(getRefundAmounts(paymentIntent(), 0.5)).toEqual(
        expect.objectContaining({ refund: 4913, reversal: 4250, payout: 4250 })
      );
      expect(getRefundAmounts(paymentIntent(), 0)).toEqual(
        expect.objectContaining({ refund: 0, reversal: 0, payout: 8500 })
      );
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
