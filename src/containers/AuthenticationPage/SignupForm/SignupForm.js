import React, { useEffect, useRef, useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';
import { getPropsForCustomUserFieldInputs } from '../../../util/userHelpers';

import {
  Form,
  PrimaryButton,
  SecondaryButton,
  FieldTextInput,
  CustomExtendedDataField,
} from '../../../components';

import FieldSelectUserType from '../FieldSelectUserType';
import UserFieldDisplayName from '../UserFieldDisplayName';
import UserFieldPhoneNumber from '../UserFieldPhoneNumber';

import {
  SIGNUP_STEP_COUNT,
  getFirstStepFieldNames,
  isTwoStepSignup,
  splitUserFieldsBetweenSteps,
} from './signupSteps';

import css from './SignupForm.module.css';

const FIRST_STEP = 1;
const SECOND_STEP = 2;

const getSoleUserTypeMaybe = userTypes =>
  Array.isArray(userTypes) && userTypes.length === 1 ? userTypes[0].userType : null;

const isPasswordUsedMoreThanOnce = formValues => {
  const pw = formValues.password;
  const hasPasswordString = pw != null && pw.length >= validators.PASSWORD_MIN_LENGTH;

  if (hasPasswordString) {
    const isPasswordRepeated = Object.values(formValues).filter(v => v === pw).length > 1;
    return isPasswordRepeated;
  }
  return false;
};

const SignupFormFields = props => {
  const {
    rootClassName,
    className,
    formId,
    form,
    handleSubmit,
    inProgress,
    invalid,
    intl,
    termsAndConditions,
    preselectedUserType,
    userTypes,
    userFields,
    values,
  } = props;

  const { userType } = values || {};

  // Some user types sign up in two steps (see signupSteps.js)
  const isTwoStep = isTwoStepSignup(userType);
  const [step, setStep] = useState(FIRST_STEP);
  const stepTitleRef = useRef(null);
  const hasChangedStep = useRef(false);
  const isFirstStep = !isTwoStep || step === FIRST_STEP;
  const isLastStep = !isTwoStep || step === SECOND_STEP;

  // Start from the first step again when another user type is chosen
  useEffect(() => {
    setStep(FIRST_STEP);
  }, [userType]);

  // Show the top of the new step and move the focus to its title. This is done after the step has
  // been rendered, since the page gets shorter when the fields of the other step are hidden.
  useEffect(() => {
    if (hasChangedStep.current) {
      stepTitleRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [step]);

  // email
  const emailRequired = validators.required(
    intl.formatMessage({
      id: 'SignupForm.emailRequired',
    })
  );
  const emailValid = validators.emailFormatValid(
    intl.formatMessage({
      id: 'SignupForm.emailInvalid',
    })
  );

  // password
  const passwordRequiredMessage = intl.formatMessage({
    id: 'SignupForm.passwordRequired',
  });
  const passwordMinLengthMessage = intl.formatMessage(
    {
      id: 'SignupForm.passwordTooShort',
    },
    {
      minLength: validators.PASSWORD_MIN_LENGTH,
    }
  );
  const passwordMaxLengthMessage = intl.formatMessage(
    {
      id: 'SignupForm.passwordTooLong',
    },
    {
      maxLength: validators.PASSWORD_MAX_LENGTH,
    }
  );
  const passwordMinLength = validators.minLength(
    passwordMinLengthMessage,
    validators.PASSWORD_MIN_LENGTH
  );
  const passwordMaxLength = validators.maxLength(
    passwordMaxLengthMessage,
    validators.PASSWORD_MAX_LENGTH
  );
  const passwordRequired = validators.requiredStringNoTrim(passwordRequiredMessage);
  const passwordValidators = validators.composeValidators(
    passwordRequired,
    passwordMinLength,
    passwordMaxLength
  );

  // Custom user fields. Since user types are not supported here,
  // only fields with no user type id limitation are selected.
  const userFieldProps = getPropsForCustomUserFieldInputs(userFields, userType);
  const { firstStep: firstStepUserFieldProps, secondStep: secondStepUserFieldProps } = isTwoStep
    ? splitUserFieldsBetweenSteps(userFieldProps)
    : { firstStep: userFieldProps, secondStep: [] };

  const noUserTypes = !userType && !(userTypes?.length > 0);
  const userTypeConfig = userTypes.find(config => config.userType === userType);
  const showDefaultUserFields = userType || noUserTypes;
  const showCustomUserFields = (userType || noUserTypes) && userFieldProps?.length > 0;

  const classes = classNames(rootClassName || css.root, className);
  const submitInProgress = inProgress;
  const submitDisabled = invalid || submitInProgress || isPasswordUsedMoreThanOnce(values);

  const showStep = nextStep => {
    hasChangedStep.current = true;
    setStep(nextStep);
  };

  // The second step opens when the fields of the first step are valid. Otherwise the errors of
  // those fields are shown and the first of them gets the focus.
  const showSecondStep = formElement => {
    const firstStepFieldNames = getFirstStepFieldNames(
      form.getRegisteredFields(),
      firstStepUserFieldProps
    );
    const invalidFieldNames = firstStepFieldNames.filter(name => !!form.getFieldState(name)?.error);

    if (invalidFieldNames.length > 0) {
      invalidFieldNames.forEach(name => form.blur(name));
      formElement?.querySelector(`[name="${invalidFieldNames[0]}"]`)?.focus();
    } else if (!isPasswordUsedMoreThanOnce(values)) {
      showStep(SECOND_STEP);
    }
  };

  // The form is submitted only in the last step. Submitting it earlier (e.g. with the enter key)
  // opens the next step instead, so that the application is not sent without the second step.
  const handleFormSubmit = event => {
    if (isLastStep) {
      handleSubmit(event);
    } else {
      event.preventDefault();
      showSecondStep(event.currentTarget);
    }
  };

  const stepHeader = isTwoStep ? (
    <div className={css.stepper}>
      <p className={css.stepLabel}>
        <FormattedMessage
          id="SignupForm.stepLabel"
          values={{ current: step, total: SIGNUP_STEP_COUNT }}
        />
      </p>
      <div className={css.stepBars} aria-hidden="true">
        <span className={classNames(css.stepBar, css.stepBarDone)} />
        <span className={classNames(css.stepBar, { [css.stepBarDone]: step === SECOND_STEP })} />
      </div>
      <h2 className={css.stepTitle} tabIndex={-1} ref={stepTitleRef}>
        <FormattedMessage
          id={isFirstStep ? 'SignupForm.stepOneTitle' : 'SignupForm.stepTwoTitle'}
        />
      </h2>
      <p className={css.stepIntro}>
        <FormattedMessage
          id={isFirstStep ? 'SignupForm.stepOneIntro' : 'SignupForm.stepTwoIntro'}
        />
      </p>
    </div>
  ) : null;

  const customFields = fieldProps =>
    fieldProps.length > 0 ? (
      <div className={css.customFields}>
        {fieldProps.map(({ key, ...fieldProps }) => (
          <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
        ))}
      </div>
    ) : null;

  return (
    <Form className={classes} onSubmit={handleFormSubmit}>
      <FieldSelectUserType
        name="userType"
        userTypes={userTypes}
        hasExistingUserType={!!preselectedUserType}
        intl={intl}
      />

      {stepHeader}

      {/* The first step. A user type with only one step has everything here. */}
      <div hidden={!isFirstStep}>
        {showDefaultUserFields ? (
          <div className={css.defaultUserFields}>
            <FieldTextInput
              type="email"
              id={formId ? `${formId}.email` : 'email'}
              name="email"
              autoComplete="email"
              label={intl.formatMessage({
                id: 'SignupForm.emailLabel',
              })}
              placeholder={intl.formatMessage({
                id: 'SignupForm.emailPlaceholder',
              })}
              validate={validators.composeValidators(emailRequired, emailValid)}
            />
            <div className={css.name}>
              <FieldTextInput
                className={css.firstNameRoot}
                type="text"
                id={formId ? `${formId}.fname` : 'fname'}
                name="fname"
                autoComplete="given-name"
                label={intl.formatMessage({
                  id: 'SignupForm.firstNameLabel',
                })}
                placeholder={intl.formatMessage({
                  id: 'SignupForm.firstNamePlaceholder',
                })}
                validate={validators.required(
                  intl.formatMessage({
                    id: 'SignupForm.firstNameRequired',
                  })
                )}
              />
              <FieldTextInput
                className={css.lastNameRoot}
                type="text"
                id={formId ? `${formId}.lname` : 'lname'}
                name="lname"
                autoComplete="family-name"
                label={intl.formatMessage({
                  id: 'SignupForm.lastNameLabel',
                })}
                placeholder={intl.formatMessage({
                  id: 'SignupForm.lastNamePlaceholder',
                })}
                validate={validators.required(
                  intl.formatMessage({
                    id: 'SignupForm.lastNameRequired',
                  })
                )}
              />
            </div>

            <UserFieldDisplayName
              formName="SignupForm"
              className={css.row}
              userTypeConfig={userTypeConfig}
              intl={intl}
            />

            <FieldTextInput
              className={css.password}
              type="password"
              id={formId ? `${formId}.password` : 'password'}
              name="password"
              autoComplete="new-password"
              label={intl.formatMessage({
                id: 'SignupForm.passwordLabel',
              })}
              placeholder={intl.formatMessage({
                id: 'SignupForm.passwordPlaceholder',
              })}
              validate={passwordValidators}
            />

            <UserFieldPhoneNumber
              formName="SignupForm"
              className={css.row}
              userTypeConfig={userTypeConfig}
              intl={intl}
            />
          </div>
        ) : null}

        {showCustomUserFields ? customFields(firstStepUserFieldProps) : null}
      </div>

      {/* The second step */}
      {isTwoStep ? (
        <div hidden={!isLastStep}>
          {showCustomUserFields ? customFields(secondStepUserFieldProps) : null}
        </div>
      ) : null}

      <div className={css.bottomWrapper}>
        {isLastStep ? termsAndConditions : null}
        {isPasswordUsedMoreThanOnce(values) ? (
          <div className={css.error}>
            <FormattedMessage id="SignupForm.passwordRepeatedOnOtherFields" />
          </div>
        ) : null}
        {isLastStep ? (
          <div className={css.actions}>
            {isTwoStep ? (
              <SecondaryButton
                type="button"
                className={css.backButton}
                onClick={() => showStep(FIRST_STEP)}
              >
                <FormattedMessage id="SignupForm.back" />
              </SecondaryButton>
            ) : null}
            <PrimaryButton
              type="submit"
              className={css.submitButton}
              inProgress={submitInProgress}
              disabled={submitDisabled}
            >
              <FormattedMessage
                id={isTwoStep ? 'SignupForm.submitApplication' : 'SignupForm.signUp'}
              />
            </PrimaryButton>
          </div>
        ) : (
          <PrimaryButton type="button" onClick={event => showSecondStep(event.currentTarget.form)}>
            <FormattedMessage id="SignupForm.next" />
          </PrimaryButton>
        )}
      </div>
    </Form>
  );
};

const SignupFormComponent = props => (
  <FinalForm
    {...props}
    mutators={{ ...arrayMutators }}
    initialValues={{ userType: props.preselectedUserType || getSoleUserTypeMaybe(props.userTypes) }}
    render={formRenderProps => <SignupFormFields {...formRenderProps} />}
  />
);

/**
 * A component that renders the signup form.
 *
 * A user type that signs up in two steps (practitioners, see signupSteps.js) gets the contact
 * details first and the questions about their practice second.
 *
 * @component
 * @param {Object} props
 * @param {string} props.rootClassName - The root class name that overrides the default class css.root
 * @param {string} props.className - The class that extends the root class
 * @param {string} props.formId - The form id
 * @param {boolean} props.inProgress - Whether the form is in progress
 * @param {ReactNode} props.termsAndConditions - The terms and conditions
 * @param {string} props.preselectedUserType - The preselected user type
 * @param {propTypes.userTypes} props.userTypes - The user types
 * @param {propTypes.listingFields} props.userFields - The user fields
 * @returns {JSX.Element}
 */
const SignupForm = props => {
  const intl = useIntl();
  return <SignupFormComponent {...props} intl={intl} />;
};

export default SignupForm;
