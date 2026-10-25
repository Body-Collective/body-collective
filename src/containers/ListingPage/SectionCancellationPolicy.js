import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { CANCELLATION_POLICY_ITEMS, getListingPolicy } from '../../util/cancellation';

import { Heading } from '../../components';

import css from './ListingPage.module.css';

/**
 * Cancellation policy of the listing: Studio and Mobile Service listings (booking process) and
 * Seminars & Events (purchase process; listing field cancellation_policy, standard or
 * non-refundable). Nothing for other processes.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData Public data of the listing
 * @returns {JSX.Element|null}
 */
const SectionCancellationPolicy = props => {
  const { publicData } = props;
  const items = CANCELLATION_POLICY_ITEMS[getListingPolicy(publicData)];
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
