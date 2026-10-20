import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import {
  POLICY_SEMINAR,
  POLICY_SEMINAR_NON_REFUNDABLE,
  POLICY_TREATMENT,
  getListingPolicy,
} from '../../util/cancellation';

import { Heading } from '../../components';

import css from './ListingPage.module.css';

// The lines of each customer cancellation policy (see src/util/cancellation.js)
const POLICY_ITEMS = {
  [POLICY_TREATMENT]: ['treatmentFree', 'treatmentRefund', 'treatmentNoRefund'],
  [POLICY_SEMINAR]: ['seminarRefund', 'seminarHalf', 'seminarNoRefund'],
  [POLICY_SEMINAR_NON_REFUNDABLE]: ['nonRefundable'],
};

/**
 * Cancellation policy of the listing: Studio and Mobile Service listings (booking process) and
 * Seminars & Events (purchase process; with or without cancellations, listing field
 * offers_cancellations). Nothing for other processes.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData Public data of the listing
 * @returns {JSX.Element|null}
 */
const SectionCancellationPolicy = props => {
  const { publicData } = props;
  const items = POLICY_ITEMS[getListingPolicy(publicData)];
  if (!items) {
    return null;
  }

  return (
    <section className={css.sectionCancellationPolicy}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.cancellationPolicyTitle" />
      </Heading>
      <ul className={css.policyList}>
        {items.map(item => (
          <li key={item} className={css.policyItem}>
            <FormattedMessage id={`ListingPage.cancellationPolicy.${item}`} />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SectionCancellationPolicy;
