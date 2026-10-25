/**
 * Questions of the checkout of Mobile booking listings (listing type mobile_service): where the
 * treatment takes place and what the therapist should know. They are transaction fields of the
 * listing type in Console (saved to the protected data of the transaction, seen only by the
 * customer and the therapist of the booking). This file adds what Console can't do:
 *  - the order of the questions
 *  - conditional questions: the receptionist's name for hotels, directions without car access
 *  - two required confirmations: the weight limit of the treatment table and the consent to share
 *    health information (GDPR), saved with the time of the consent
 * Labels, help texts and option names are translations (MobileBookingQuestions.<key>.*), the
 * Console labels are the fallback.
 */

export const MOBILE_LISTING_TYPE = 'mobile_service';

// Console transaction field keys, in the order of the checkout
export const LOCATION = 'mobile_service_location';
export const ACCOMMODATION_TYPE = 'accommodation_type';
export const HOTEL_RECEPTIONIST = 'hotel_receptionist';
export const CAR_ACCESS = 'car_access';
export const CAR_DIRECTIONS = 'car_directions';
export const PARKING = 'parking';
export const HEALTH_NOTE = 'health_note';
export const QUESTION_KEYS = [
  LOCATION,
  ACCOMMODATION_TYPE,
  HOTEL_RECEPTIONIST,
  CAR_ACCESS,
  CAR_DIRECTIONS,
  PARKING,
  HEALTH_NOTE,
];

// Questions asked only for an answer of another question
const CONDITIONS = {
  [HOTEL_RECEPTIONIST]: { key: ACCOMMODATION_TYPE, value: 'hotel', isRequired: true },
  [CAR_DIRECTIONS]: { key: CAR_ACCESS, value: 'no', isRequired: false },
};

// Confirmations of the checkout (form field names and protected data keys)
export const WEIGHT_CONFIRMATION = 'weightConfirmed';
export const HEALTH_DATA_CONSENT = 'healthDataConsent';

// Form field name of a transaction field (see util/fieldHelpers.js)
export const formFieldName = key => `prot_${key}`;

/**
 * @param {string} listingType
 * @returns {boolean}
 */
export const isMobileBookingListingType = listingType => listingType === MOBILE_LISTING_TYPE;

/**
 * Whether the transaction fields are the Mobile booking questions.
 *
 * @param {Array<Object>} transactionFieldConfigs
 * @returns {boolean}
 */
export const hasMobileBookingQuestions = transactionFieldConfigs =>
  (transactionFieldConfigs || []).some(config => QUESTION_KEYS.includes(config?.key));

/**
 * The transaction field configs of the questions, in the order of the checkout (others after).
 *
 * @param {Array<Object>} transactionFieldConfigs
 * @returns {Array<Object>}
 */
export const getOrderedQuestionConfigs = transactionFieldConfigs => {
  const configs = transactionFieldConfigs || [];
  const order = key => {
    const i = QUESTION_KEYS.indexOf(key);
    return i < 0 ? QUESTION_KEYS.length : i;
  };
  return [...configs].sort((a, b) => order(a.key) - order(b.key));
};

/**
 * Whether a question is asked, given the answers so far.
 *
 * @param {string} key Transaction field key
 * @param {Function} getAnswer key => the answer to that question
 * @returns {boolean}
 */
export const isQuestionShown = (key, getAnswer) => {
  const condition = CONDITIONS[key];
  return !condition || getAnswer(condition.key) === condition.value;
};

/**
 * Whether a question must be answered: conditional questions only when they are shown, others as
 * set in Console.
 *
 * @param {Object} config Transaction field config
 * @returns {boolean}
 */
export const isQuestionRequired = config =>
  CONDITIONS[(config?.key)] ? CONDITIONS[config.key].isRequired : !!config?.saveConfig?.isRequired;

/**
 * The form values without the answers of questions that aren't shown, e.g. a receptionist's name
 * typed before the accommodation was changed from hotel to villa.
 *
 * @param {Object} formValues
 * @returns {Object}
 */
export const withoutHiddenAnswers = formValues => {
  const values = { ...(formValues || {}) };
  const getAnswer = key => values[formFieldName(key)];
  Object.keys(CONDITIONS).forEach(key => {
    if (!isQuestionShown(key, getAnswer)) {
      delete values[formFieldName(key)];
    }
  });
  return values;
};

/**
 * Protected data of the confirmations of the checkout.
 *
 * @param {Object} formValues
 * @param {Date} [now]
 * @returns {Object} { weightConfirmed, healthDataConsent: { given, givenAt } }, or nothing when
 * they weren't asked
 */
export const getConfirmationsProtectedData = (formValues, now = new Date()) => {
  const isChecked = name => Array.isArray(formValues?.[name]) && formValues[name].length > 0;
  if (!isChecked(WEIGHT_CONFIRMATION) && !isChecked(HEALTH_DATA_CONSENT)) {
    return {};
  }
  return {
    [WEIGHT_CONFIRMATION]: isChecked(WEIGHT_CONFIRMATION),
    [HEALTH_DATA_CONSENT]: {
      given: isChecked(HEALTH_DATA_CONSENT),
      givenAt: now.toISOString(),
    },
  };
};
