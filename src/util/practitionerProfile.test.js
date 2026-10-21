import {
  getPractitionerProfile,
  getPractitionerProfileFormValues,
  getPractitionerProfilePublicData,
  isPractitioner,
} from './practitionerProfile';

describe('practitionerProfile', () => {
  it('knows practitioners', () => {
    const user = userType => ({ attributes: { profile: { publicData: { userType } } } });
    expect(isPractitioner(user('practitioner'))).toBe(true);
    expect(isPractitioner(user('customer'))).toBe(false);
    expect(isPractitioner(null)).toBe(false);
  });

  it('keeps only known options and trainings with a title', () => {
    const profile = getPractitionerProfile({
      locations: ['berlin', 'paris'],
      languagesSpoken: ['english', 'german', 'klingon'],
      experience: ['  20 years of bodywork ', '', 42],
      training: [
        { year: '2007', title: 'Tantra massage training', teacher: 'Tantra Zentrum' },
        { year: '2010', title: '   ', teacher: 'nobody' },
      ],
    });
    expect(profile.locations).toEqual(['berlin']);
    // In the order of the options
    expect(profile.languagesSpoken).toEqual(['german', 'english']);
    expect(profile.experience).toEqual(['20 years of bodywork']);
    expect(profile.training).toEqual([
      { year: '2007', title: 'Tantra massage training', teacher: 'Tantra Zentrum' },
    ]);
    expect(profile.furtherTraining).toEqual([]);
  });

  it('starts the form lists with an empty row and drops empty rows when saving', () => {
    const values = getPractitionerProfileFormValues({});
    expect(values.experience).toEqual(['']);
    expect(values.training).toEqual([{ year: '', title: '', teacher: '' }]);
    expect(getPractitionerProfilePublicData(values)).toEqual(
      expect.objectContaining({ experience: [], training: [], furtherTraining: [] })
    );
  });
});
