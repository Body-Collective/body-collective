import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { ExternalLink, NamedLink } from '../../../../components';

import css from './TopbarLogo.module.css';

/**
 * Text-based brand logo for the topbar. The text color follows the `--topbarLogoColor`
 * CSS variable set by the surrounding header, so it can switch between the transparent
 * (over photo) and the white (scrolled) header states.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.id
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object?} props.linkToExternalSite
 * @param {string?} props.linkToExternalSite.href
 * @returns {JSX.Element} linked text logo
 */
const TopbarLogo = props => {
  const { id, className, rootClassName, linkToExternalSite } = props;
  const classes = classNames(rootClassName || css.root, className);
  const brandName = (
    <span className={css.text}>
      <FormattedMessage id="Topbar.brandName" />
    </span>
  );

  // Note: href might come as an empty string (falsy), in which case we default to 'LandingPage'.
  return linkToExternalSite?.href ? (
    <ExternalLink id={id} className={classes} href={linkToExternalSite.href} target="_self">
      {brandName}
    </ExternalLink>
  ) : (
    <NamedLink id={id} className={classes} name="LandingPage">
      {brandName}
    </NamedLink>
  );
};

export default TopbarLogo;
