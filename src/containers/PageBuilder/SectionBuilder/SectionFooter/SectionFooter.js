import React from 'react';
import classNames from 'classnames';

import { useLanguage } from '../../../../context/languageContext';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';

import { ExternalLink, LanguageSwitch, NamedLink } from '../../../../components';
import useChangeLanguage from '../../../LanguageSync/useChangeLanguage';
import { pickFieldOptions, resolveFooterFieldKeys } from '../../PageBuilder.helpers';

import Field from '../../Field';
import BlockBuilder from '../../BlockBuilder';

import SectionContainer from '../SectionContainer';
import NewsletterForm from './NewsletterForm';
import { IconCheckCircle, IconLock, IconMail } from './FooterIcons';
import css from './SectionFooter.module.css';

// The number of columns (numberOfColumns) affects styling

const GRID_CONFIG = [
  { contentCss: css.contentCol1, gridCss: css.gridCol1 },
  { contentCss: css.contentCol2, gridCss: css.gridCol2 },
  { contentCss: css.contentCol3, gridCss: css.gridCol3 },
  { contentCss: css.contentCol4, gridCss: css.gridCol4 },
];
const getIndex = numberOfColumns => numberOfColumns - 1;

const getContentCss = numberOfColumns => {
  const contentConfig = GRID_CONFIG[getIndex(numberOfColumns)];
  return contentConfig ? contentConfig.contentCss : GRID_CONFIG[0].contentCss;
};

const getGridCss = numberOfColumns => {
  const contentConfig = GRID_CONFIG[getIndex(numberOfColumns)];
  return contentConfig ? contentConfig.gridCss : GRID_CONFIG[0].gridCss;
};

/**
 * @typedef {Object} SocialMediaLinkConfig
 * @property {'socialMediaLink'} fieldType
 * @property {string} platform
 * @property {string} url
 */

/**
 * @typedef {Object} BlockConfig
 * @property {string} blockId
 * @property {string} blockName
 * @property {'defaultBlock' | 'footerBlock' | 'socialMediaLink'} blockType
 */

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * Section component that's able to show blocks in multiple different columns (defined by "numberOfColumns" prop)
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.sectionId id of the section
 * @param {'footer'} props.sectionType
 * @param {number} props.numberOfColumns columns for blocks in footer (1-4)
 * @param {Array<SocialMediaLinkConfig>?} props.socialMediaLinks array of social media link configs
 * @param {Object?} props.slogan
 * @param {Object?} props.copyright
 * @param {Object?} props.appearance
 * @param {Array<BlockConfig>?} props.blocks array of block configs
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} Section for article content
 */
const SectionFooter = props => {
  const {
    sectionId,
    className,
    rootClassName,
    numberOfColumns = 1,
    socialMediaLinks = [],
    slogan,
    appearance,
    copyright,
    blocks = [],
    options,
    linkLogoToExternalSite,
  } = props;
  const intl = useIntl();
  const { language, languages } = useLanguage();
  const onChangeLanguage = useChangeLanguage();
  const contactEmail = intl.formatMessage({ id: 'SectionFooter.contactEmail' });

  // The slogan and the copyright can have translation keys, e.g. "Footer.slogan"
  const sloganInLanguage = resolveFooterFieldKeys(slogan, intl.messages);
  const copyrightInLanguage = resolveFooterFieldKeys(copyright, intl.messages);

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldOptions = pickFieldOptions(options);
  const linksWithBlockId = socialMediaLinks?.map(sml => {
    return {
      ...sml,
      blockId: sml.link.platform,
    };
  });

  const showSocialMediaLinks = socialMediaLinks?.length > 0;

  const brandName = (
    <span className={css.logoText}>
      <FormattedMessage id="Topbar.brandName" />
    </span>
  );

  // Note: href might come as an empty string (falsy), in which case we default to 'LandingPage'.
  const logoLink = linkLogoToExternalSite?.href ? (
    <ExternalLink className={css.logoLink} href={linkLogoToExternalSite.href} target="_self">
      {brandName}
    </ExternalLink>
  ) : (
    <NamedLink className={css.logoLink} name="LandingPage">
      {brandName}
    </NamedLink>
  );

  return (
    <SectionContainer
      as="footer"
      id={sectionId}
      className={className || css.root}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      <div className={css.footer}>
        <div className={classNames(css.content, getContentCss(numberOfColumns))}>
          <div className={css.brand}>
            {logoLink}
            <Field data={sloganInLanguage} className={css.slogan} />
            <NewsletterForm className={css.newsletter} formId={`${sectionId}-newsletter`} />
          </div>
          <div className={classNames(css.grid, getGridCss(numberOfColumns))}>
            <BlockBuilder blocks={blocks} sectionId={sectionId} options={options} />
          </div>
        </div>

        <div className={css.bottomBar}>
          <div className={css.bottomRow}>
            <ul className={css.trustBadges}>
              <li className={css.trustBadge}>
                <IconLock className={css.trustIcon} />
                <FormattedMessage id="SectionFooter.securePayments" />
              </li>
              <li className={css.trustBadge}>
                <IconCheckCircle className={css.trustIcon} />
                <FormattedMessage id="SectionFooter.practitionersReviewed" />
              </li>
            </ul>

            <div className={css.bottomActions}>
              <div className={css.socialLinks}>
                {showSocialMediaLinks ? (
                  <BlockBuilder blocks={linksWithBlockId} sectionId={sectionId} options={options} />
                ) : null}
                <a
                  className={css.mailLink}
                  href={`mailto:${contactEmail}`}
                  aria-label={intl.formatMessage({ id: 'SectionFooter.contactEmailLabel' })}
                  title={intl.formatMessage({ id: 'SectionFooter.contactEmailLabel' })}
                >
                  <IconMail />
                </a>
              </div>

              <LanguageSwitch
                language={language}
                languages={languages}
                onChange={onChangeLanguage}
                ariaLabel={intl.formatMessage({ id: 'SectionFooter.languageLabel' })}
              />
            </div>
          </div>

          <Field data={copyrightInLanguage} className={css.copyright} />
        </div>
      </div>
    </SectionContainer>
  );
};

export default SectionFooter;
