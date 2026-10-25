import React, { useState } from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import { Modal, PrimaryButton, SecondaryButton } from '../../../components';

import css from './Cancellation.module.css';

/**
 * The organiser (provider) of a Seminars & Events listing cancels a booked place, e.g. when the
 * event doesn't take place: transition/provider-cancel of the purchase process, with the full
 * payment refunded to the customer (Sharetribe's full refund). Shown only while the transition
 * is possible for the current user.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.canCancel Whether provider-cancel is a next transition for the user
 * @param {string} props.customerName Display name of the customer
 * @param {string} props.listingTitle
 * @param {Function} props.onCancel Makes the transition; returns a promise
 * @param {boolean} props.inProgress
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element|null}
 */
const OrganiserCancel = props => {
  const {
    canCancel,
    customerName,
    listingTitle,
    onCancel,
    inProgress,
    onManageDisableScrolling,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  if (!canCancel) {
    return null;
  }

  const values = { customerName, listingTitle };
  const cancel = () => {
    setHasFailed(false);
    return onCancel()
      .then(() => setIsOpen(false))
      .catch(() => setHasFailed(true));
  };

  return (
    <div className={css.card}>
      <h3 className={css.cardTitle}>
        <FormattedMessage id="OrganiserCancel.title" />
      </h3>
      <p className={css.note}>
        <FormattedMessage id="OrganiserCancel.text" values={values} />
      </p>
      <SecondaryButton className={css.cardButton} onClick={() => setIsOpen(true)}>
        <FormattedMessage id="OrganiserCancel.button" />
      </SecondaryButton>

      <Modal
        id="OrganiserCancelModal"
        containerClassName={css.modalContainer}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onManageDisableScrolling={onManageDisableScrolling}
        usePortal
      >
        <h2 className={css.modalTitle}>
          <FormattedMessage id="OrganiserCancel.confirmTitle" />
        </h2>
        <p className={css.modalDescription}>
          <FormattedMessage id="OrganiserCancel.confirmText" values={values} />
        </p>
        {hasFailed ? (
          <p className={css.error}>
            <FormattedMessage id="OrganiserCancel.failed" />
          </p>
        ) : null}
        <div className={css.modalActions}>
          <SecondaryButton className={css.modalButton} onClick={() => setIsOpen(false)}>
            <FormattedMessage id="OrganiserCancel.keep" />
          </SecondaryButton>
          <PrimaryButton className={css.dangerButton} inProgress={inProgress} onClick={cancel}>
            <FormattedMessage id="OrganiserCancel.confirm" />
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
};

export default OrganiserCancel;
