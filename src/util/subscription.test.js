import { createCurrentUser } from './testData';
import {
  PLAN_ESSENTIAL,
  PLAN_PROFESSIONAL,
  getProfessionalPaymentLinkUrl,
  getSubscription,
  showManageSubscriptionForUser,
} from './subscription';

const userWithProfile = (id, profile) => {
  const user = createCurrentUser(id);
  return { ...user, attributes: { ...user.attributes, profile: { ...profile } } };
};

describe('subscription util', () => {
  describe('getSubscription(currentUser)', () => {
    it('should default to the Essential plan without a subscription', () => {
      expect(getSubscription(null)).toEqual({
        plan: PLAN_ESSENTIAL,
        status: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        hasBillingAccount: false,
      });
      expect(getSubscription(userWithProfile('user1', { metadata: {} })).plan).toEqual(
        PLAN_ESSENTIAL
      );
    });

    it('should read the Professional subscription from profile metadata', () => {
      const currentUser = userWithProfile('user1', {
        metadata: {
          subscriptionPlan: PLAN_PROFESSIONAL,
          subscriptionStatus: 'active',
          subscriptionCancelAtPeriodEnd: true,
          subscriptionCurrentPeriodEnd: '2026-11-06T00:00:00.000Z',
          stripeCustomerId: 'cus_123',
        },
      });
      expect(getSubscription(currentUser)).toEqual({
        plan: PLAN_PROFESSIONAL,
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: '2026-11-06T00:00:00.000Z',
        hasBillingAccount: true,
      });
    });

    it('should treat an unknown plan as Essential', () => {
      const currentUser = userWithProfile('user1', { metadata: { subscriptionPlan: 'gold' } });
      expect(getSubscription(currentUser).plan).toEqual(PLAN_ESSENTIAL);
    });
  });

  describe('showManageSubscriptionForUser(currentUser)', () => {
    it('should be true only for the practitioner user type', () => {
      const practitioner = userWithProfile('user1', { publicData: { userType: 'practitioner' } });
      const customer = userWithProfile('user2', { publicData: { userType: 'customer' } });
      expect(showManageSubscriptionForUser(practitioner)).toEqual(true);
      expect(showManageSubscriptionForUser(customer)).toEqual(false);
      expect(showManageSubscriptionForUser(null)).toEqual(false);
    });
  });

  describe('getProfessionalPaymentLinkUrl(currentUser)', () => {
    const OLD_LINK = process.env.REACT_APP_STRIPE_PROFESSIONAL_PAYMENT_LINK;
    afterEach(() => {
      process.env.REACT_APP_STRIPE_PROFESSIONAL_PAYMENT_LINK = OLD_LINK;
    });

    it('should add the user to the payment link', () => {
      process.env.REACT_APP_STRIPE_PROFESSIONAL_PAYMENT_LINK = 'https://buy.stripe.com/test_abc';
      const currentUser = createCurrentUser('user1');
      const url = new URL(getProfessionalPaymentLinkUrl(currentUser));
      expect(url.origin + url.pathname).toEqual('https://buy.stripe.com/test_abc');
      expect(url.searchParams.get('client_reference_id')).toEqual('user1');
      expect(url.searchParams.get('prefilled_email')).toEqual(currentUser.attributes.email);
    });

    it('should return null when the payment link is not configured', () => {
      process.env.REACT_APP_STRIPE_PROFESSIONAL_PAYMENT_LINK = '';
      expect(getProfessionalPaymentLinkUrl(createCurrentUser('user1'))).toEqual(null);
    });
  });
});
