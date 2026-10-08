import { LANGUAGE_USER_FIELD_KEY } from '../../../util/language';

/**
 * Practitioners apply to join in two steps: who they are and how to reach them first, then
 * questions about their practice. Other user types sign up in one step.
 *
 * Both steps are one form: the fields of the first step stay in the form (hidden) while the second
 * step is shown, so the form is validated and submitted as a whole.
 */

export const SIGNUP_STEP_COUNT = 2;

// User types (the ids in Console) that sign up in two steps
export const TWO_STEP_USER_TYPES = ['practitioner'];

// Names of the fields that every user has in the first step
export const DEFAULT_USER_FIELD_NAMES = [
  'email',
  'fname',
  'lname',
  'displayName',
  'password',
  'phoneNumber',
];

// Custom user fields (the keys of the user fields in Console) that are in the first step too.
// The other custom user fields are in the second step, so a new field is asked there.
export const FIRST_STEP_USER_FIELD_KEYS = [
  'company',
  'website',
  'instagram',
  LANGUAGE_USER_FIELD_KEY,
];

/**
 * @param {string?} userType id of the user type
 * @returns {boolean} true if the user type signs up in two steps
 */
export const isTwoStepSignup = userType => TWO_STEP_USER_TYPES.includes(userType);

/**
 * Divides the custom user fields of the signup form between the steps.
 *
 * @param {Array<{ name: string, fieldConfig: { key: string } }>} userFieldProps from
 * getPropsForCustomUserFieldInputs
 * @returns {{ firstStep: Array, secondStep: Array }}
 */
export const splitUserFieldsBetweenSteps = userFieldProps => ({
  firstStep: userFieldProps.filter(props =>
    FIRST_STEP_USER_FIELD_KEYS.includes(props.fieldConfig?.key)
  ),
  secondStep: userFieldProps.filter(
    props => !FIRST_STEP_USER_FIELD_KEYS.includes(props.fieldConfig?.key)
  ),
});

/**
 * Names of the form fields that have to be valid before the second step can be opened.
 *
 * @param {Array<string>} registeredFieldNames names of the fields that are in the form
 * @param {Array<{ name: string }>} firstStepUserFieldProps the custom user fields of the first step
 * @returns {Array<string>}
 */
export const getFirstStepFieldNames = (registeredFieldNames, firstStepUserFieldProps) =>
  [...DEFAULT_USER_FIELD_NAMES, ...firstStepUserFieldProps.map(props => props.name)].filter(name =>
    registeredFieldNames.includes(name)
  );
