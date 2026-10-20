import React from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { SEMINAR_LISTING_TYPE, formatSeminarSchedule } from '../../util/seminarSchedule';

import { Heading } from '../../components';

import css from './ListingPage.module.css';

/**
 * Dates and times of a Seminars & Events listing. Nothing for other listing types.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData Public data of the listing
 * @returns {JSX.Element|null}
 */
const SectionSeminarSchedule = props => {
  const { publicData } = props;
  const intl = useIntl();
  const schedule =
    publicData?.listingType === SEMINAR_LISTING_TYPE
      ? formatSeminarSchedule(intl, publicData)
      : null;
  if (!schedule) {
    return null;
  }

  return (
    <section className={css.sectionSeminarSchedule}>
      <Heading as="h2" rootClassName={css.sectionHeading}>
        <FormattedMessage id="ListingPage.seminarScheduleTitle" />
      </Heading>
      <p className={css.text}>{schedule.dates}</p>
      {schedule.times ? <p className={css.text}>{schedule.times}</p> : null}
    </section>
  );
};

export default SectionSeminarSchedule;
