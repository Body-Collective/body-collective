import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

import { Modal, PrimaryButton } from '../../components';

import css from './ModalApplicationUnderReview.module.css';

const IconApplicationSubmitted = props => (
  <svg
    className={props.className}
    width="56"
    height="56"
    viewBox="0 0 56 56"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="28" cy="28" r="28" fill="currentColor" />
    <path
      d="M18 28.5l7 7 13-14.5"
      fill="none"
      stroke="#FFF"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Modal that thanks a user for applying: it tells that the details have been submitted and that
 * the profile is under review. It is opened when a user logs in or signs up while the account is
 * waiting for approval from the marketplace operator.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.containerClassName overwrite components own css.container
 * @param {string} props.id
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element} Modal element
 */
const ModalApplicationUnderReview = props => {
  const {
    rootClassName,
    className,
    containerClassName,
    id,
    isOpen,
    onClose,
    onManageDisableScrolling,
  } = props;
  const classes = classNames(rootClassName || css.root, className);

  return (
    <Modal
      id={id}
      containerClassName={containerClassName || css.container}
      isOpen={isOpen}
      onClose={onClose}
      usePortal
      onManageDisableScrolling={onManageDisableScrolling}
    >
      <div className={classes}>
        <IconApplicationSubmitted className={css.icon} />
        <h2 className={css.title}>
          <FormattedMessage id="ModalApplicationUnderReview.title" />
        </h2>
        <p className={css.message}>
          <FormattedMessage id="ModalApplicationUnderReview.message" />
        </p>
        <p className={css.note}>
          <FormattedMessage id="ModalApplicationUnderReview.note" />
        </p>
        <div className={css.bottomWrapper}>
          <PrimaryButton type="button" onClick={onClose}>
            <FormattedMessage id="ModalApplicationUnderReview.close" />
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalApplicationUnderReview;
