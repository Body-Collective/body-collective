import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { BOOKING_PROCESS_NAME, PURCHASE_PROCESS_NAME } from '../../transactions/transaction';

import { Heading } from '../../components';

import css from './ListingPage.module.css';

// The customer cancellation policy of each process. Keep in sync with src/util/cancellation.js and
// server/services/cancellation/policy.js.
const POLICY_ITEMS = {
  [BOOKING_PROCESS_NAME]: ['free', 'refund', 'noCancel', 'practitioner'],
  [PURCHASE_PROCESS_NAME]: ['refundPlace', 'noCancelPlace', 'practitioner'],
};

/**
 * Cancellation policy of the listing: Studio and Mobile Service listings (booking process) and
 * Seminars & Events (purchase process). Nothing for other processes.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData Public data of the listing
 * @returns {JSX.Element|null}
 */
const SectionCancellationPolicy = props => {
  const { publicData } = props;
  const processName = publicData?.transactionProcessAlias?.split('/')[0];
  const items = POLICY_ITEMS[processName];
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
