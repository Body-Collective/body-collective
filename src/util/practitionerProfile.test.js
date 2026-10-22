import {
  getPractitionerProfile,
  getPractitionerProfileFormValues,
  getPractitionerProfilePublicData,
  getVisibleLocations,
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
      locations: ['berlin', ' Mallorca ', '', 'Ibiza', 'Lisbon'],
      languagesSpoken: ['english', 'german', 'klingon'],
      experience: ['  20 years of bodywork ', '', 42],
      training: [
        { year: '2007', title: 'Tantra massage training', teacher: 'Tantra Zentrum' },
        { year: '2010', title: '   ', teacher: 'nobody' },
      ],
    });
    // Typed places (at most 3); a location chosen from the former list becomes its name
    expect(profile.locations).toEqual(['Berlin', 'Mallorca', 'Ibiza']);
    // In the order of the options
    expect(profile.languagesSpoken).toEqual(['german', 'english']);
    expect(profile.experience).toEqual(['20 years of bodywork']);
    expect(profile.training).toEqual([
      { year: '2007', title: 'Tantra massage training', teacher: 'Tantra Zentrum' },
    ]);
    expect(profile.furtherTraining).toEqual([]);
  });

  it('shows one location with Essential and up to three with Professional', () => {
    const locations = ['Berlin', 'Mallorca', 'Ibiza'];
    expect(getVisibleLocations(locations, 'essential')).toEqual(['Berlin']);
    expect(getVisibleLocations(locations, 'professional')).toEqual(locations);
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
