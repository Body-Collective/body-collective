import React from 'react';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import { FormattedMessage } from '../../../../util/reactIntl';
import { NamedLink } from '../../../../components';

import css from './TopbarBottomNav.module.css';

const IconHome = () => (
  <svg className={css.icon} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.25v-6.25h-3.5V21H5a1 1 0 0 1-1-1v-9.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const IconExplore = () => (
  <svg className={css.icon} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M15.5 15.5 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const IconBookings = () => (
  <svg className={css.icon} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 4.75h10a1 1 0 0 1 1 1V20l-6-3.25L6 20V5.75a1 1 0 0 1 1-1Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const IconProfile = () => (
  <svg className={css.icon} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M5.75 19.25c.7-3.15 3.05-5 6.25-5s5.55 1.85 6.25 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const startsWithPage = (currentPage, pageName) =>
  typeof currentPage === 'string' && currentPage.indexOf(pageName) === 0;

const isHomeActive = currentPage => currentPage === 'LandingPage';

const isExploreActive = currentPage => startsWithPage(currentPage, 'SearchPage');

const isBookingsActive = currentPage =>
  startsWithPage(currentPage, 'InboxPage') ||
  currentPage === 'OrderDetailsPage' ||
  currentPage === 'SaleDetailsPage';

const isProfileActive = currentPage =>
  currentPage === 'ProfileSettingsPage' ||
  currentPage === 'AccountSettingsPage' ||
  startsWithPage(currentPage, 'ProfilePage') ||
  currentPage === 'ManageListingsPage' ||
  ACCOUNT_SETTINGS_PAGES.includes(currentPage);

const NavItem = props => {
  const { name, params, labelId, icon, isActive, notificationCount = 0 } = props;
  const notificationDot = notificationCount > 0 ? <span className={css.notificationDot} /> : null;

  return (
    <NamedLink
      name={name}
      params={params}
      className={classNames(css.item, { [css.itemActive]: isActive })}
      activeClassName=""
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={css.iconWrap}>
        {icon}
        {notificationDot}
      </span>
      <span className={css.label}>
        <FormattedMessage id={labelId} />
      </span>
    </NamedLink>
  );
};

/**
 * Mobile-only bottom navigation: Home, Explore, Bookings, Profile.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.currentPage
 * @param {string} props.inboxTab
 * @param {number} props.notificationCount
 * @param {Object} props.intl
 * @returns {JSX.Element}
 */
const TopbarBottomNav = props => {
  const { currentPage, inboxTab, notificationCount = 0, intl } = props;

  return (
    <nav
      className={css.root}
      aria-label={intl.formatMessage({ id: 'TopbarBottomNav.screenreader.navigation' })}
    >
      <NavItem
        name="LandingPage"
        labelId="TopbarBottomNav.home"
        icon={<IconHome />}
        isActive={isHomeActive(currentPage)}
      />
      <NavItem
        name="SearchPage"
        labelId="TopbarBottomNav.explore"
        icon={<IconExplore />}
        isActive={isExploreActive(currentPage)}
      />
      <NavItem
        name="InboxPage"
        params={{ tab: inboxTab }}
        labelId="TopbarBottomNav.bookings"
        icon={<IconBookings />}
        isActive={isBookingsActive(currentPage)}
        notificationCount={notificationCount}
      />
      <NavItem
        name="ProfileSettingsPage"
        labelId="TopbarBottomNav.profile"
        icon={<IconProfile />}
        isActive={isProfileActive(currentPage)}
      />
    </nav>
  );
};

export default TopbarBottomNav;
