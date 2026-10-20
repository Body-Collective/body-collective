import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';

import { Modal, PrimaryButton, SecondaryButton } from '../../../components';

import css from './Cancellation.module.css';

const { Money } = sdkTypes;

const toMoney = (amount, currency) => new Money(amount, `${currency}`.toUpperCase());

const ERROR_MESSAGE_IDS = {
  'too-late': 'TransactionPage.Cancellation.error.tooLate',
};

const getErrorMessage = (intl, error) =>
  error
    ? intl.formatMessage({
        id: ERROR_MESSAGE_IDS[error.code] || 'TransactionPage.Cancellation.error.generic',
      })
    : null;

const Card = ({ title, children }) => (
  <section className={css.card}>
    <h3 className={css.cardTitle}>{title}</h3>
    {children}
  </section>
);

// Paid / non-refundable card processing fee / refund
const RefundRows = ({ intl, paid, fee, refund, currency }) => (
  <dl className={css.amounts}>
    <dt className={css.amountLabel}>
      <FormattedMessage id="TransactionPage.Cancellation.paid" />
    </dt>
    <dd className={css.amountValue}>{formatMoney(intl, toMoney(paid, currency))}</dd>
    <dt className={css.amountLabel}>
      <FormattedMessage id="TransactionPage.Cancellation.fee" />
    </dt>
    <dd className={css.amountValue}>−{formatMoney(intl, toMoney(fee, currency))}</dd>
    <dt className={classNames(css.amountLabel, css.total)}>
      <FormattedMessage id="TransactionPage.Cancellation.refund" />
    </dt>
    <dd className={classNames(css.amountValue, css.total)}>
      {formatMoney(intl, toMoney(refund, currency))}
    </dd>
  </dl>
);

/**
 * Customer cancellations on the transaction page (practitioners can't cancel):
 *
 * - Booking request, before it's accepted: cancel for free (card authorization released)
 * - Accepted booking or purchased place (Seminars & Events), more than 7 days before the start:
 *   cancel with a refund of the payment minus the card processing (Stripe) fee. The exact amounts
 *   are calculated by the server and shown before confirming.
 * - After the cancellation: what was refunded (customer), no payout (practitioner)
 *
 * @component
 * @param {Object} props
 * @param {Object|null} props.info Result of getCancellationInfo
 * @param {'customer'|'provider'} props.transactionRole
 * @param {string} props.otherUserDisplayName
 * @param {string} props.listingTitle
 * @param {string} props.timeZone Time zone of the listing
 * @param {Function} props.onCancelRequest Cancels the booking request (before acceptance)
 * @param {boolean} props.cancelRequestInProgress
 * @param {Object|null} props.cancelRequestError
 * @param {Function} props.onFetchCancelPreview
 * @param {Object|null} props.cancelPreview { currency, paid, fee, refund }
 * @param {boolean} props.cancelPreviewInProgress
 * @param {Object|null} props.cancelPreviewError
 * @param {Function} props.onCancel Cancels with a refund
 * @param {boolean} props.cancelInProgress
 * @param {Object|null} props.cancelError
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element|null}
 */
const Cancellation = props => {
  const intl = useIntl();
  const [modal, setModal] = useState(null);
  const {
    info,
    transactionRole,
    otherUserDisplayName,
    listingTitle,
    timeZone,
    onCancelRequest,
    cancelRequestInProgress,
    cancelRequestError,
    onFetchCancelPreview,
    cancelPreview,
    cancelPreviewInProgress,
    cancelPreviewError,
    onCancel,
    cancelInProgress,
    cancelError,
    onManageDisableScrolling,
  } = props;

  // The refund is calculated by the server from the actual Stripe payment. A failure is shown
  // from cancelPreviewError.
  useEffect(() => {
    if (modal === 'cancel') {
      onFetchCancelPreview().catch(() => {});
    }
  }, [modal]);

  if (!info) {
    return null;
  }

  const isCustomer = transactionRole === 'customer';
  // Message ids for bookings (Studio, Mobile Service) and places (Seminars & Events)
  const kind = info.isBooking ? 'booking' : 'place';
  const formatDate = date =>
    date
      ? intl.formatDate(date, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          ...(info.isBooking ? { hour: 'numeric', minute: '2-digit' } : {}),
          timeZone: info.isBooking ? timeZone : 'Europe/Berlin',
        })
      : '';
  const values = {
    otherUserDisplayName,
    listingTitle,
    date: formatDate(info.startTime),
  };
  const closeModal = () => setModal(null);

  // After the cancellation
  if (info.isCancelledRequest) {
    return (
      <Card title={intl.formatMessage({ id: 'TransactionPage.Cancellation.requestCancelledTitle' })}>
        <p className={css.note}>
          <FormattedMessage
            id={
              isCustomer
                ? 'TransactionPage.Cancellation.requestCancelledCustomer'
                : 'TransactionPage.Cancellation.requestCancelledProvider'
            }
            values={values}
          />
        </p>
      </Card>
    );
  }

  if (info.isCancelledWithRefund) {
    const { cancellation } = info;
    return (
      <Card title={intl.formatMessage({ id: `TransactionPage.Cancellation.cancelledTitle.${kind}` })}>
        {isCustomer ? (
          <>
            {cancellation?.refundAmount != null ? (
              <RefundRows
                intl={intl}
                paid={cancellation.paidAmount}
                fee={cancellation.feeAmount}
                refund={cancellation.refundAmount}
                currency={cancellation.currency}
              />
            ) : null}
            <p className={css.note}>
              <FormattedMessage id="TransactionPage.Cancellation.refundTiming" />
            </p>
          </>
        ) : (
          <p className={css.note}>
            <FormattedMessage
              id={`TransactionPage.Cancellation.cancelledProvider.${kind}`}
              values={values}
            />
          </p>
        )}
      </Card>
    );
  }

  // Booking request, before it's accepted: free
  if (info.canCancelRequest) {
    return (
      <>
        <Card title={intl.formatMessage({ id: 'TransactionPage.Cancellation.cancelRequestTitle' })}>
          <p className={css.note}>
            <FormattedMessage id="TransactionPage.Cancellation.cancelRequestDescription" />
          </p>
          <SecondaryButton
            className={css.cardButton}
            type="button"
            onClick={() => setModal('cancelRequest')}
          >
            <FormattedMessage id="TransactionPage.Cancellation.cancelRequestButton" />
          </SecondaryButton>
        </Card>
        <Modal
          id="CancelRequestModal"
          containerClassName={css.modalContainer}
          isOpen={modal === 'cancelRequest'}
          onClose={closeModal}
          onManageDisableScrolling={onManageDisableScrolling}
          usePortal
        >
          <h2 className={css.modalTitle}>
            <FormattedMessage id="TransactionPage.Cancellation.cancelRequestModalTitle" />
          </h2>
          <p className={css.modalDescription}>
            <FormattedMessage
              id="TransactionPage.Cancellation.cancelRequestModalDescription"
              values={values}
            />
          </p>
          {cancelRequestError ? (
            <p className={css.error} role="alert">
              {getErrorMessage(intl, cancelRequestError)}
            </p>
          ) : null}
          <div className={css.modalActions}>
            <PrimaryButton
              className={css.dangerButton}
              type="button"
              inProgress={cancelRequestInProgress}
              disabled={cancelRequestInProgress}
              onClick={() =>
                onCancelRequest()
                  .then(closeModal)
                  .catch(() => {})
              }
            >
              <FormattedMessage id="TransactionPage.Cancellation.cancelRequestConfirm" />
            </PrimaryButton>
            <SecondaryButton
              className={css.modalButton}
              type="button"
              disabled={cancelRequestInProgress}
              onClick={closeModal}
            >
              <FormattedMessage id="TransactionPage.Cancellation.keepRequest" />
            </SecondaryButton>
          </div>
        </Modal>
      </>
    );
  }

  // Accepted booking or purchased place: refund minus the card processing fee
  if (info.canCancel) {
    const previewError = getErrorMessage(intl, cancelPreviewError);
    return (
      <>
        <Card title={intl.formatMessage({ id: 'TransactionPage.Cancellation.cancelTitle' })}>
          <p className={css.note}>
            <FormattedMessage
              id={`TransactionPage.Cancellation.cancelDescription.${kind}`}
              values={{
                deadline: intl.formatDate(info.cancelDeadline, {
                  month: 'short',
                  day: 'numeric',
                  timeZone: info.isBooking ? timeZone : 'Europe/Berlin',
                }),
              }}
            />
          </p>
          <SecondaryButton
            className={css.cardButton}
            type="button"
            onClick={() => setModal('cancel')}
          >
            <FormattedMessage id={`TransactionPage.Cancellation.cancelButton.${kind}`} />
          </SecondaryButton>
        </Card>
        <Modal
          id="CancelTransactionModal"
          containerClassName={css.modalContainer}
          isOpen={modal === 'cancel'}
          onClose={closeModal}
          onManageDisableScrolling={onManageDisableScrolling}
          usePortal
        >
          <h2 className={css.modalTitle}>
            <FormattedMessage id={`TransactionPage.Cancellation.cancelModalTitle.${kind}`} />
          </h2>
          <p className={css.modalDescription}>
            <FormattedMessage
              id={`TransactionPage.Cancellation.cancelModalDescription.${kind}`}
              values={values}
            />
          </p>

          {cancelPreviewInProgress ? (
            <p className={css.note}>
              <FormattedMessage id="TransactionPage.Cancellation.loadingRefund" />
            </p>
          ) : cancelPreview ? (
            <RefundRows intl={intl} {...cancelPreview} />
          ) : null}

          {previewError || cancelError ? (
            <p className={css.error} role="alert">
              {previewError || getErrorMessage(intl, cancelError)}
            </p>
          ) : null}

          <p className={css.note}>
            <FormattedMessage id="TransactionPage.Cancellation.cancelModalNote" />
          </p>

          <div className={css.modalActions}>
            <PrimaryButton
              className={css.dangerButton}
              type="button"
              inProgress={cancelInProgress}
              disabled={!cancelPreview || cancelPreviewInProgress || cancelInProgress}
              onClick={() =>
                onCancel()
                  .then(closeModal)
                  .catch(() => {})
              }
            >
              <FormattedMessage id={`TransactionPage.Cancellation.cancelConfirm.${kind}`} />
            </PrimaryButton>
            <SecondaryButton
              className={css.modalButton}
              type="button"
              disabled={cancelInProgress}
              onClick={closeModal}
            >
              <FormattedMessage id={`TransactionPage.Cancellation.keep.${kind}`} />
            </SecondaryButton>
          </div>
        </Modal>
      </>
    );
  }

  return null;
};

export default Cancellation;
