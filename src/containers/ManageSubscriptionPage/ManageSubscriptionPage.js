import React, { useEffect, useRef, useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { createBillingPortalSession } from '../../util/api';
import { pathByRouteName } from '../../util/routes';
import {
  PLAN_PROFESSIONAL,
  getProfessionalPaymentLinkUrl,
  getSubscription,
  showManageSubscriptionForUser,
} from '../../util/subscription';
import { showCreateListingLinkForUser, showPaymentDetailsForUser } from '../../util/userHelpers';

import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H3, IconSpinner, LayoutSideNavigation, Page, UserNav } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import { confirmCheckout } from './ManageSubscriptionPage.duck';
import SubscriptionPlans from './SubscriptionPlans';
import css from './ManageSubscriptionPage.module.css';

// Statuses where the user still has the plan, but there is something to tell them about
const STATUS_PAST_DUE = 'past_due';

const formatDate = (intl, isoDate) =>
  intl.formatDate(new Date(isoDate), { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Account settings tab for the subscription: the plans, with the user's own marked as active.
 * Essential is active by default. Subscribing happens on a Stripe payment link, and Stripe sends the
 * user back here with ?session_id=... which is saved to the profile straight away.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} [props.currentUser] - The current user
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {boolean} [props.confirmCheckoutInProgress] - Whether the checkout is being confirmed
 * @param {propTypes.error} [props.confirmCheckoutError] - Error when confirming the checkout
 * @param {boolean} [props.checkoutConfirmed] - Whether the checkout was confirmed
 * @param {Function} props.onConfirmCheckout - Saves the subscription of a checkout session
 * @returns {JSX.Element}
 */
export const ManageSubscriptionPageComponent = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();
  const {
    currentUser,
    scrollingDisabled,
    confirmCheckoutInProgress,
    confirmCheckoutError,
    checkoutConfirmed,
    onConfirmCheckout,
  } = props;

  const [manageBillingInProgress, setManageBillingInProgress] = useState(false);
  const [manageBillingError, setManageBillingError] = useState(false);
  const [returnedAlreadyActive, setReturnedAlreadyActive] = useState(false);

  const subscription = getSubscription(currentUser);
  const isProfessional = subscription.plan === PLAN_PROFESSIONAL;

  // Stripe redirects back here with ?session_id=... after the payment link checkout. That is a full
  // page load, so the current user was just fetched. If the webhook has already saved the
  // subscription, there is nothing to confirm. Otherwise save it now, without waiting for the
  // webhook (which also isn't reachable when developing locally).
  const sessionId = new URLSearchParams(location.search).get('session_id');
  const handledSessionId = useRef(null);
  useEffect(() => {
    if (!sessionId || !currentUser?.id || handledSessionId.current === sessionId) {
      return;
    }
    handledSessionId.current = sessionId;

    const dropSessionIdFromUrl = () =>
      history.replace(pathByRouteName('ManageSubscriptionPage', routeConfiguration));

    if (isProfessional) {
      setReturnedAlreadyActive(true);
      dropSessionIdFromUrl();
      return;
    }

    onConfirmCheckout(sessionId)
      .then(dropSessionIdFromUrl)
      .catch(() => {
        // The error is shown from the store. The webhook may still save the subscription.
      });
  }, [sessionId, currentUser?.id]);

  const handleManageBilling = () => {
    setManageBillingInProgress(true);
    setManageBillingError(false);
    createBillingPortalSession()
      .then(({ url }) => {
        if (!url) {
          throw new Error('No billing portal url');
        }
        window.location.assign(url);
      })
      .catch(() => {
        setManageBillingInProgress(false);
        setManageBillingError(true);
      });
  };

  const showManageListingsLink = showCreateListingLinkForUser(config, currentUser);
  const { showPayoutDetails, showPaymentMethods } = showPaymentDetailsForUser(config, currentUser);
  const accountSettingsNavProps = {
    currentPage: 'ManageSubscriptionPage',
    showPaymentMethods,
    showPayoutDetails,
    showManageSubscription: showManageSubscriptionForUser(currentUser),
  };

  const renderStatus = () => {
    if (confirmCheckoutInProgress) {
      return (
        <p className={css.notice} role="status">
          <IconSpinner className={css.spinner} />
          <FormattedMessage id="ManageSubscriptionPage.confirming" />
        </p>
      );
    }
    if (confirmCheckoutError) {
      return (
        <p className={css.noticeError} role="alert">
          <FormattedMessage id="ManageSubscriptionPage.confirmFailed" />
        </p>
      );
    }
    if ((checkoutConfirmed || returnedAlreadyActive) && isProfessional) {
      return (
        <p className={css.notice} role="status">
          <FormattedMessage id="ManageSubscriptionPage.confirmed" />
        </p>
      );
    }
    if (isProfessional && subscription.status === STATUS_PAST_DUE) {
      return (
        <p className={css.noticeError} role="alert">
          <FormattedMessage id="ManageSubscriptionPage.pastDue" />
        </p>
      );
    }
    if (isProfessional && subscription.currentPeriodEnd) {
      const date = formatDate(intl, subscription.currentPeriodEnd);
      return (
        <p className={css.notice}>
          <FormattedMessage
            id={
              subscription.cancelAtPeriodEnd
                ? 'ManageSubscriptionPage.endsOn'
                : 'ManageSubscriptionPage.renewsOn'
            }
            values={{ date }}
          />
        </p>
      );
    }
    return null;
  };

  return (
    <Page
      title={intl.formatMessage({ id: 'ManageSubscriptionPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSideNavigation
        topbar={
          <>
            <TopbarContainer
              desktopClassName={css.desktopTopbar}
              mobileClassName={css.mobileTopbar}
            />
            <UserNav
              currentPage="ManageSubscriptionPage"
              showManageListingsLink={showManageListingsLink}
            />
          </>
        }
        sideNav={null}
        useAccountSettingsNav
        accountSettingsNavProps={accountSettingsNavProps}
        footer={<FooterContainer />}
        intl={intl}
      >
        <div className={css.content}>
          <H3 as="h1">
            <FormattedMessage id="ManageSubscriptionPage.heading" />
          </H3>
          <p className={css.intro}>
            <FormattedMessage id="ManageSubscriptionPage.intro" />
          </p>

          {renderStatus()}

          <SubscriptionPlans
            activePlan={subscription.plan}
            paymentLinkUrl={getProfessionalPaymentLinkUrl(currentUser)}
            hasBillingAccount={subscription.hasBillingAccount}
            onManageBilling={handleManageBilling}
            manageBillingInProgress={manageBillingInProgress}
          />

          {manageBillingError ? (
            <p className={css.noticeError} role="alert">
              <FormattedMessage id="ManageSubscriptionPage.manageBillingFailed" />
            </p>
          ) : null}
        </div>
      </LayoutSideNavigation>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    confirmCheckoutInProgress,
    confirmCheckoutError,
    checkoutConfirmed,
  } = state.ManageSubscriptionPage;
  return {
    currentUser,
    confirmCheckoutInProgress,
    confirmCheckoutError,
    checkoutConfirmed,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onConfirmCheckout: sessionId => dispatch(confirmCheckout(sessionId)),
});

const ManageSubscriptionPage = compose(connect(mapStateToProps, mapDispatchToProps))(
  ManageSubscriptionPageComponent
);

export default ManageSubscriptionPage;
