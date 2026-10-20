import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

// After a customer cancellation with a refund minus the Stripe fee, the line items still show the
// payout of the provider, but there is no payout: the cancellation card explains it instead.
const hasCustomerCancellation = transaction => !!transaction?.attributes?.metadata?.cancellation;

// Activity feed messages for the customer cancellations: the default (state based) message
// doesn't say who cancelled.
const getCancelTransitionMessages = transitions =>
  [
    [transitions.CUSTOMER_CANCEL_REQUEST, 'customerCancelledRequest'],
    [transitions.CUSTOMER_CANCEL, 'customerCancelled'],
  ]
    .filter(([transition]) => !!transition)
    .map(([transition, key]) => ({
      transition,
      translationId: `TransactionPage.ActivityFeed.default-booking.${key}`,
    }));

/**
 * Get state data against booking process for TransactionPage's UI.
 * I.e. info about showing action buttons, current state etc.
 *
 * @param {*} txInfo detials about transaction
 * @param {*} processInfo  details about process
 */
export const getStateDataForBookingProcess = (txInfo, processInfo) => {
  const { transaction, transactionRole, nextTransitions } = txInfo;
  const isProviderBanned = transaction?.provider?.attributes?.banned;
  const isCustomerBanned = transaction?.provider?.attributes?.banned;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  const {
    processName,
    processState,
    states,
    transitions,
    isCustomer,
    actionButtonProps,
    leaveReviewProps,
  } = processInfo;

  const stateData = new ConditionalResolver([processState, transactionRole])
    .cond([states.INQUIRY, CUSTOMER], () => {
      const transitionNames = Array.isArray(nextTransitions)
        ? nextTransitions.map(t => t.attributes.name)
        : [];
      const requestAfterInquiry = transitions.REQUEST_PAYMENT_AFTER_INQUIRY;
      const hasCorrectNextTransition = transitionNames.includes(requestAfterInquiry);
      const showOrderPanel = !isProviderBanned && hasCorrectNextTransition;
      return { processName, processState, showOrderPanel, showDetailCardHeadings: true };
    })
    .cond([states.INQUIRY, PROVIDER], () => {
      return { processName, processState, showDetailCardHeadings: true };
    })
    .cond([states.PREAUTHORIZED, CUSTOMER], () => {
      return { processName, processState, showDetailCardHeadings: true, showExtraInfo: true };
    })
    .cond([states.PREAUTHORIZED, PROVIDER], () => {
      const primary = isCustomerBanned ? null : actionButtonProps(transitions.ACCEPT, PROVIDER);
      const secondary = isCustomerBanned ? null : actionButtonProps(transitions.DECLINE, PROVIDER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: primary,
        secondaryButtonProps: secondary,
      };
    })
    .cond([states.DELIVERED, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsFirstLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_PROVIDER, CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_CUSTOMER, PROVIDER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED, _], () => {
      return { processName, processState, showDetailCardHeadings: true, showReviews: true };
    })
    .cond([states.CANCELED, PROVIDER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showBreakDown: !hasCustomerCancellation(transaction),
      };
    })
    .default(() => {
      // Default values for other states
      return { processName, processState, showDetailCardHeadings: true };
    })
    .resolve();

  return { ...stateData, transitionMessages: getCancelTransitionMessages(transitions) };
};
