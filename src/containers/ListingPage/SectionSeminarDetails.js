import React, { useState } from 'react';
import classNames from 'classnames';

// Utils
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { hasFormattedContent } from '../../util/formattedText';
import { CANCELLATION_POLICY_ITEMS, getListingPolicy } from '../../util/cancellation';
import {
  EVENT_TYPE,
  EVENT_TYPES,
  SEMINAR_LISTING_TYPE,
  formatSeminarCardDates,
} from '../../util/seminarSchedule';
import {
  ABOUT_EVENT,
  FOR_WHOM,
  GOOD_TO_KNOW,
  INCLUDED,
  SCHEDULE,
  getTreatmentText,
} from '../../util/treatmentDetails';

// Shared components
import { FormattedText, Heading, IconArrowHead } from '../../components';

import css from './ListingPage.module.css';

// One dropdown: the heading opens the content
const Dropdown = props => {
  const { id, title, isOpen, onToggle, children } = props;
  const panelId = `${id}-content`;
  return (
    <li className={css.treatment}>
      <button
        type="button"
        className={classNames(css.treatmentHeader, css.treatmentToggle)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className={css.treatmentHeaderText}>
          <span className={css.treatmentName}>{title}</span>
        </span>
        <IconArrowHead
          direction={isOpen ? 'up' : 'down'}
          size="small"
          rootClassName={css.treatmentArrow}
        />
      </button>
      <div id={panelId} className={css.seminarDropdownContent} hidden={!isOpen}>
        {children}
      </div>
    </li>
  );
};

/**
 * Details of Seminars & Events listings, in the visitor's language: about the event (open text,
 * its heading follows the event type, e.g. "About this retreat"), then the programme, who it is
 * for, what's included, the cancellation policy and good to know as dropdowns. Sections without
 * content are left out; nothing for other listing types.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData Public data of the listing
 * @param {string} [props.className] Add more style rules in addition to the root class
 * @returns {JSX.Element|null}
 */
const SectionSeminarDetails = props => {
  const { publicData, className } = props;
  const intl = useIntl();
  const [openIds, setOpenIds] = useState([]);
  if (publicData?.listingType !== SEMINAR_LISTING_TYPE) {
    return null;
  }

  const text = field => getTreatmentText(publicData, field.key, intl);
  const about = text(ABOUT_EVENT);
  const eventType = publicData?.[EVENT_TYPE];
  const aboutHeadingId = `ListingPage.aboutEvent.${
    EVENT_TYPES.includes(eventType) ? eventType : 'default'
  }`;

  const policyItems = CANCELLATION_POLICY_ITEMS[getListingPolicy(publicData)] || [];
  const dropdowns = [
    ...[SCHEDULE, FOR_WHOM, INCLUDED]
      .filter(field => hasFormattedContent(text(field)))
      .map(field => ({
        id: field.key,
        title: intl.formatMessage({ id: `ListingPage.${field.messageKey}` }),
        content: <FormattedText text={text(field)} />,
      })),
    ...(policyItems.length > 0
      ? [
          {
            id: 'cancellation-policy',
            title: intl.formatMessage({ id: 'ListingPage.cancellationPolicyTitle' }),
            content: (
              <ul className={css.policyList}>
                {policyItems.map(item => (
                  <li key={item} className={css.policyItem}>
                    <FormattedMessage id={`ListingPage.cancellationPolicy.${item}`} />
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    ...(hasFormattedContent(text(GOOD_TO_KNOW))
      ? [
          {
            id: GOOD_TO_KNOW.key,
            title: intl.formatMessage({ id: `ListingPage.${GOOD_TO_KNOW.messageKey}` }),
            content: <p className={css.treatmentPlainText}>{text(GOOD_TO_KNOW)}</p>,
          },
        ]
      : []),
  ];

  const toggle = id =>
    setOpenIds(current =>
      current.includes(id) ? current.filter(i => i !== id) : [...current, id]
    );

  return (
    <div className={classNames(css.treatmentDetails, className)}>
      {hasFormattedContent(about) ? (
        <section className={css.sectionTreatmentText}>
          <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
            <FormattedMessage id={aboutHeadingId} />
          </Heading>
          <FormattedText text={about} />
        </section>
      ) : null}
      {dropdowns.length > 0 ? (
        <section className={css.sectionTreatmentPackages}>
          <ul className={css.treatments}>
            {dropdowns.map(d => (
              <Dropdown
                key={d.id}
                id={`seminar-${d.id}`}
                title={d.title}
                isOpen={openIds.includes(d.id)}
                onToggle={() => toggle(d.id)}
              >
                {d.content}
              </Dropdown>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

/**
 * The line above the description of Seminars & Events listings: the event type and the dates,
 * e.g. "Retreat · 6–13 Dec 26".
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData Public data of the listing
 * @returns {JSX.Element|null}
 */
export const SeminarKicker = props => {
  const { publicData } = props;
  const intl = useIntl();
  if (publicData?.listingType !== SEMINAR_LISTING_TYPE) {
    return null;
  }
  const eventType = publicData?.[EVENT_TYPE];
  const parts = [
    EVENT_TYPES.includes(eventType) ? intl.formatMessage({ id: `EventType.${eventType}` }) : null,
    formatSeminarCardDates(intl, publicData),
  ].filter(Boolean);
  return parts.length > 0 ? <p className={css.seminarKicker}>{parts.join(' · ')}</p> : null;
};

export default SectionSeminarDetails;
