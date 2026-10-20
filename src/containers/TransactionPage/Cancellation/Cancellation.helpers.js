import {
  POLICIES,
  getCurrentRefund,
  getListingPolicy,
  startOfDayInBerlin,
} from '../../../util/cancellation';
import {
  BOOKING_PROCESS_NAME,
  PURCHASE_PROCESS_NAME,
  getProcess,
  resolveLatestProcessName,
} from '../../../transactions/transaction';

/**
 * When the session or the event of the transaction starts: the start of the booking, or for
 * Seminars & Events event_start (unix seconds); older listings: the start of the day of
 * event_date_sort in Berlin.
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
    const { event_start, event_date_sort } = transaction?.listing?.attributes?.publicData || {};
    return typeof event_start === 'number'
      ? new Date(event_start * 1000)
      : startOfDayInBerlin(event_date_sort);
  }
  return null;
};

/**
 * The policy of a transaction: the one copied when it was created, or the listing's (transactions
 * made before the policies were copied).
 *
 * @param {Object} transaction
 * @returns {string|null}
 */
const getTransactionPolicy = transaction => {
  const copied = transaction?.attributes?.protectedData?.cancellationPolicy;
  return POLICIES[copied] ? copied : getListingPolicy(transaction?.listing?.attributes?.publicData);
};

/**
 * Cancellation status of a transaction for the transaction page. Only customers can cancel: until
 * the start, with the refund of the cancellation policy (possibly nothing). The server
 * (server/api/transaction-cancel.js) enforces the same rules.
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
  const policy = getTransactionPolicy(transaction);
  const currentTime = now || new Date();
  const hasStarted = !startTime || startTime.getTime() <= currentTime.getTime();

  // Booking before acceptance: free
  const canCancelRequest =
    isCustomer &&
    !!t.CUSTOMER_CANCEL_REQUEST &&
    nextTransitionNames.includes(t.CUSTOMER_CANCEL_REQUEST);

  // Accepted booking or purchased place: until the start, refund by the policy
  const canCancel =
    isCustomer && !!policy && !hasStarted && nextTransitionNames.includes(t.CUSTOMER_CANCEL);
  // The refund when cancelling now, and until when it applies
  const { refundShare, until } = canCancel
    ? getCurrentRefund({ policy, startTime, now: currentTime })
    : {};

  const isCancelledRequest =
    !!t.CUSTOMER_CANCEL_REQUEST && lastTransition === t.CUSTOMER_CANCEL_REQUEST;
  const isCancelledWithRefund = lastTransition === t.CUSTOMER_CANCEL;

  if (!canCancelRequest && !canCancel && !isCancelledRequest && !isCancelledWithRefund) {
    return null;
  }

  return {
    isBooking: processName === BOOKING_PROCESS_NAME,
    canCancelRequest,
    canCancel,
    policy,
    refundShare,
    refundUntil: until || null,
    startTime,
    isCancelledRequest,
    isCancelledWithRefund,
    // Refund details stored by the server: amounts in minor units and currency
    cancellation: metadata.cancellation || null,
  };
};
