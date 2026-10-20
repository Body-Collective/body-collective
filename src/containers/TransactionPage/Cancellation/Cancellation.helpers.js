import { getCancelDeadline, startOfDayInBerlin } from '../../../util/cancellation';
import {
  BOOKING_PROCESS_NAME,
  PURCHASE_PROCESS_NAME,
  getProcess,
  resolveLatestProcessName,
} from '../../../transactions/transaction';

/**
 * When the session or the event of the transaction starts: the start of the booking, or the start
 * of the event day (listing field event_date_sort) in Berlin for Seminars & Events.
 *
 * @param {string} processName
 * @param {Object} transaction
 * @returns {Date|null}
 */
const getStartTime = (processName, transaction) => {
  if (processName === BOOKING_PROCESS_NAME) {
    return transaction?.booking?.attributes?.start || null;
  }
  if (processName === PURCHASE_PROCESS_NAME) {
    return startOfDayInBerlin(transaction?.listing?.attributes?.publicData?.event_date_sort);
  }
  return null;
};

/**
 * Cancellation status of a transaction for the transaction page. Only customers can cancel. The
 * server (server/api/transaction-cancel.js) enforces the same rules.
 *
 * @param {Object} params
 * @param {Object} params.transaction The transaction, with the booking and the listing
 * @param {'customer'|'provider'} params.transactionRole
 * @param {Array<Object>} params.nextTransitions Transitions the current user can make now
 * @param {Date} [params.now]
 * @returns {Object|null} null if cancellation doesn't apply to the transaction
 */
export const getCancellationInfo = ({ transaction, transactionRole, nextTransitions, now }) => {
  const processName = resolveLatestProcessName(transaction?.attributes?.processName);
  if (![BOOKING_PROCESS_NAME, PURCHASE_PROCESS_NAME].includes(processName)) {
    return null;
  }

  const t = getProcess(processName).transitions;
  const { lastTransition, metadata = {} } = transaction.attributes || {};
  const isCustomer = transactionRole === 'customer';
  const nextTransitionNames = (nextTransitions || []).map(nt => nt?.attributes?.name);
  const startTime = getStartTime(processName, transaction);
  const cancelDeadline = startTime ? getCancelDeadline(startTime) : null;
  const currentTime = now || new Date();

  // Booking before acceptance: free
  const canCancelRequest =
    isCustomer &&
    !!t.CUSTOMER_CANCEL_REQUEST &&
    nextTransitionNames.includes(t.CUSTOMER_CANCEL_REQUEST);

  // Accepted booking or purchased place: refund minus the Stripe fee, more than 7 days before
  const canCancel =
    isCustomer &&
    !!cancelDeadline &&
    nextTransitionNames.includes(t.CUSTOMER_CANCEL) &&
    currentTime.getTime() < cancelDeadline.getTime();

  const isCancelledRequest = !!t.CUSTOMER_CANCEL_REQUEST && lastTransition === t.CUSTOMER_CANCEL_REQUEST;
  const isCancelledWithRefund = lastTransition === t.CUSTOMER_CANCEL;

  if (!canCancelRequest && !canCancel && !isCancelledRequest && !isCancelledWithRefund) {
    return null;
  }

  return {
    isBooking: processName === BOOKING_PROCESS_NAME,
    canCancelRequest,
    canCancel,
    startTime,
    cancelDeadline,
    isCancelledRequest,
    isCancelledWithRefund,
    // Refund details stored by the server: amounts in minor units and currency
    cancellation: metadata.cancellation || null,
  };
};
