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

// Paid / non-refundable card processing fee / not refunded under the policy / refund
const RefundRows = ({ intl, paid, fee, refund, currency }) => {
  const notRefunded = Math.max(paid - fee - refund, 0);
  return (
    <dl className={css.amounts}>
      <dt className={css.amountLabel}>
        <FormattedMessage id="TransactionPage.Cancellation.paid" />
      </dt>
      <dd className={css.amountValue}>{formatMoney(intl, toMoney(paid, currency))}</dd>
      <dt className={css.amountLabel}>
        <FormattedMessage id="TransactionPage.Cancellation.fee" />
      </dt>
      <dd className={css.amountValue}>−{formatMoney(intl, toMoney(fee, currency))}</dd>
      {notRefunded > 0 ? (
        <>
          <dt className={css.amountLabel}>
            <FormattedMessage id="TransactionPage.Cancellation.notRefunded" />
          </dt>
          <dd className={css.amountValue}>−{formatMoney(intl, toMoney(notRefunded, currency))}</dd>
        </>
      ) : null}
      <dt className={classNames(css.amountLabel, css.total)}>
        <FormattedMessage id="TransactionPage.Cancellation.refund" />
      </dt>
      <dd className={classNames(css.amountValue, css.total)}>
        {formatMoney(intl, toMoney(refund, currency))}
      </dd>
    </dl>
  );
};

/**
 * Customer cancellations on the transaction page (practitioners can't cancel):
 *
 * - Booking request, before it's accepted: cancel for free (card authorization released)
 * - Accepted booking or purchased place (Seminars & Events), until the start: cancel with the
 *   refund of the cancellation policy (util/cancellation.js), possibly nothing. The exact amounts
 *   are calculated by the server and shown before confirming.
 * - After the cancellation: what was refunded (customer), what is paid out (practitioner)
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
      <Card
        title={intl.formatMessage({ id: 'TransactionPage.Cancellation.requestCancelledTitle' })}
      >
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
      <Card
        title={intl.formatMessage({ id: `TransactionPage.Cancellation.cancelledTitle.${kind}` })}
      >
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
              <FormattedMessage
                id={
                  cancellation?.refundAmount > 0
                    ? 'TransactionPage.Cancellation.refundTiming'
                    : 'TransactionPage.Cancellation.noRefund'
                }
              />
            </p>
          </>
        ) : (
          <>
            <p className={css.note}>
              <FormattedMessage
                id={`TransactionPage.Cancellation.cancelledProvider.${kind}`}
                values={values}
              />
            </p>
            <p className={css.note}>
              {cancellation?.payoutAmount > 0 ? (
                <FormattedMessage
                  id="TransactionPage.Cancellation.providerPayout"
                  values={{
                    payout: formatMoney(
                      intl,
                      toMoney(cancellation.payoutAmount, cancellation.currency)
                    ),
                  }}
                />
              ) : (
                <FormattedMessage id="TransactionPage.Cancellation.providerNoPayout" />
              )}
            </p>
          </>
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

  // Accepted booking or purchased place: refund by the cancellation policy (possibly nothing)
  if (info.canCancel) {
    const previewError = getErrorMessage(intl, cancelPreviewError);
    const { refundShare, refundUntil, policy } = info;
    const descriptionId =
      policy === 'seminar-non-refundable'
        ? 'nonRefundable'
        : refundShare === 1
        ? 'fullRefund'
        : refundShare > 0
        ? 'halfRefund'
        : 'noRefundNow';
    const deadline = refundUntil
      ? intl.formatDate(refundUntil, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: info.isBooking ? timeZone : 'Europe/Berlin',
        })
      : null;
    // Without a refund, the button says so
    const hasRefund = cancelPreview ? cancelPreview.refund > 0 : refundShare > 0;
    return (
      <>
        <Card title={intl.formatMessage({ id: 'TransactionPage.Cancellation.cancelTitle' })}>
          <p className={css.note}>
            <FormattedMessage
              id={`TransactionPage.Cancellation.cancelDescription.${descriptionId}`}
              values={{ deadline }}
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
              <FormattedMessage
                id={
                  hasRefund
                    ? `TransactionPage.Cancellation.cancelConfirm.${kind}`
                    : 'TransactionPage.Cancellation.cancelWithoutRefund'
                }
              />
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
