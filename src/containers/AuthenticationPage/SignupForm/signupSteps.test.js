import {
  SIGNUP_STEP_COUNT,
  getFirstStepFieldNames,
  isTwoStepSignup,
  splitUserFieldsBetweenSteps,
} from './signupSteps';

const fieldProps = key => ({ key, name: `pub_${key}`, fieldConfig: { key } });

describe('signupSteps', () => {
  it('has two steps', () => {
    expect(SIGNUP_STEP_COUNT).toEqual(2);
  });

  describe('isTwoStepSignup', () => {
    it('is true for practitioners', () => {
      expect(isTwoStepSignup('practitioner')).toEqual(true);
    });

    it('is false for other user types and for no user type', () => {
      expect(isTwoStepSignup('customer')).toEqual(false);
      expect(isTwoStepSignup('')).toEqual(false);
      expect(isTwoStepSignup(null)).toEqual(false);
      expect(isTwoStepSignup(undefined)).toEqual(false);
    });
  });

  describe('splitUserFieldsBetweenSteps', () => {
    const userFieldProps = [
      fieldProps('company'),
      fieldProps('website'),
      fieldProps('instagram'),
      fieldProps('about_practice'),
      fieldProps('years_experience'),
    ];

    it('keeps the company, website and Instagram in the first step', () => {
      const { firstStep } = splitUserFieldsBetweenSteps(userFieldProps);
      expect(firstStep.map(props => props.key)).toEqual(['company', 'website', 'instagram']);
    });

    it('puts the other fields in the second step in the same order', () => {
      const { secondStep } = splitUserFieldsBetweenSteps(userFieldProps);
      expect(secondStep.map(props => props.key)).toEqual(['about_practice', 'years_experience']);
    });

    it('does not lose or repeat any field', () => {
      const { firstStep, secondStep } = splitUserFieldsBetweenSteps(userFieldProps);
      expect(firstStep.length + secondStep.length).toEqual(userFieldProps.length);
    });

    it('handles no fields', () => {
      expect(splitUserFieldsBetweenSteps([])).toEqual({ firstStep: [], secondStep: [] });
    });
  });

  describe('getFirstStepFieldNames', () => {
    const firstStepUserFieldProps = [fieldProps('company'), fieldProps('website')];

    it('returns the default fields and the custom fields of the first step', () => {
      const registered = [
        'userType',
        'email',
        'fname',
        'lname',
        'displayName',
        'password',
        'phoneNumber',
        'pub_company',
        'pub_website',
        'pub_about_practice',
        'terms',
      ];
      expect(getFirstStepFieldNames(registered, firstStepUserFieldProps)).toEqual([
        'email',
        'fname',
        'lname',
        'displayName',
        'password',
        'phoneNumber',
        'pub_company',
        'pub_website',
      ]);
    });

    it('leaves out the fields that are not in the form', () => {
      // E.g. the user type does not have display name or phone number
      const registered = ['email', 'fname', 'lname', 'password', 'pub_company'];
      expect(getFirstStepFieldNames(registered, firstStepUserFieldProps)).toEqual([
        'email',
        'fname',
        'lname',
        'password',
        'pub_company',
      ]);
    });
  });
});
