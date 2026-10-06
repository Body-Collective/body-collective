import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { PLAN_ESSENTIAL, PLAN_PROFESSIONAL } from '../../util/subscription';

import { ExternalLink, IconSpinner } from '../../components';

import css from './SubscriptionPlans.module.css';

// A copy of the pricing section on the apply page (content/pages/apply_now in Console), shown
// here with the user's own plan marked as active.
const PLANS = [
  {
    id: PLAN_ESSENTIAL,
    features: ['noMonthlyFees', 'singleLocation', 'bookDirectly', 'editorialProfile'],
    hasNote: true,
  },
  {
    id: PLAN_PROFESSIONAL,
    features: ['multipleLocations', 'publishEvents', 'bookDirectly', 'editorialProfile'],
    hasNote: false,
  },
];

const IconCheck = () => (
  <svg
    className={css.check}
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

const IconArrow = () => (
  <svg
    className={css.arrow}
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

/**
 * The two plan cards. The plan the user is on is marked as active and has no button; Essential is
 * active by default. The other plan has the button: Subscribe, which opens the Stripe payment
 * link, or Manage billing for an active subscription, which opens the Stripe billing portal.
 *
 * @component
 * @param {Object} props
 * @param {string} props.activePlan 'essential' or 'professional'
 * @param {string|null} [props.paymentLinkUrl] Stripe payment link for the Professional plan
 * @param {boolean} [props.hasBillingAccount] Whether the user can open the billing portal
 * @param {Function} props.onManageBilling Opens the billing portal
 * @param {boolean} [props.manageBillingInProgress]
 * @returns {JSX.Element}
 */
const SubscriptionPlans = props => {
  const {
    activePlan,
    paymentLinkUrl,
    hasBillingAccount,
    onManageBilling,
    manageBillingInProgress,
  } = props;
  const intl = useIntl();
  const t = id => intl.formatMessage({ id: `SubscriptionPlans.${id}` });

  const renderAction = planId => {
    // The active plan has no button, except an active subscription: its billing is managed here.
    if (planId === PLAN_ESSENTIAL) {
      return null;
    }

    if (activePlan === PLAN_PROFESSIONAL) {
      return hasBillingAccount ? (
        <button
          type="button"
          className={css.action}
          onClick={onManageBilling}
          disabled={manageBillingInProgress}
        >
          {manageBillingInProgress ? <IconSpinner className={css.spinner} /> : null}
          <FormattedMessage id="SubscriptionPlans.manageBilling" />
          <IconArrow />
        </button>
      ) : null;
    }

    return paymentLinkUrl ? (
      // The same tab, so Stripe can send the user back to this page when the payment is done
      <ExternalLink className={css.action} href={paymentLinkUrl} target="_self">
        <FormattedMessage id="SubscriptionPlans.subscribe" />
        <IconArrow />
      </ExternalLink>
    ) : null;
  };

  return (
    <div className={css.plans}>
      {PLANS.map(plan => {
        const isActive = plan.id === activePlan;
        return (
          <section
            key={plan.id}
            className={classNames(css.plan, { [css.planActive]: isActive })}
            aria-label={t(`${plan.id}.name`)}
          >
            <div className={css.badgeRow}>
              {isActive ? (
                <span className={css.badge}>
                  <IconCheck />
                  <FormattedMessage id="SubscriptionPlans.activePlan" />
                </span>
              ) : null}
            </div>

            <h3 className={css.planName}>{t(`${plan.id}.name`)}</h3>
            <p className={css.planFor}>{t(`${plan.id}.for`)}</p>
            <p className={css.planPrice}>
              <strong className={css.planPriceFigure}>{t(`${plan.id}.priceFigure`)}</strong>
              {t(`${plan.id}.priceNote`)}
            </p>

            <ul className={css.features}>
              {plan.features.map(feature => (
                <li key={feature} className={css.feature}>
                  <IconCheck />
                  {t(`feature.${feature}`)}
                </li>
              ))}
            </ul>

            {plan.hasNote ? <p className={css.note}>{t(`${plan.id}.note`)}</p> : null}

            {renderAction(plan.id)}
          </section>
        );
      })}
    </div>
  );
};

export default SubscriptionPlans;
