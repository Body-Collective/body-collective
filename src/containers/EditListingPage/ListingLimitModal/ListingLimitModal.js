import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import { Modal, NamedLink } from '../../../components';

import css from './ListingLimitModal.module.css';

/**
 * Shown when a practitioner's plan allows no more listings (Essential: one listing): they can
 * subscribe to Professional on the Manage subscription page.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element}
 */
const ListingLimitModal = props => {
  const { isOpen, onClose, onManageDisableScrolling } = props;
  return (
    <Modal
      id="ListingLimitModal"
      containerClassName={css.modalContainer}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <h2 className={css.title}>
        <FormattedMessage id="ListingLimitModal.title" />
      </h2>
      <p className={css.message}>
        <FormattedMessage id="ListingLimitModal.message" />
      </p>
      <NamedLink name="ManageSubscriptionPage" className={css.subscribeLink}>
        <FormattedMessage id="ListingLimitModal.subscribe" />
      </NamedLink>
    </Modal>
  );
};

export default ListingLimitModal;
