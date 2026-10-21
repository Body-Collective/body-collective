/**
 * Profile of a practitioner (user type "practitioner"), shown on their profile page and edited in
 * Profile settings. Customers keep the default profile.
 *
 * Saved to the user's public data:
 *  - professionalTitle: string, e.g. "Therapist" (shown above the name)
 *  - locations: Array<string>, see LOCATION_OPTIONS
 *  - languagesSpoken: Array<string>, see LANGUAGE_OPTIONS
 *  - quote, quoteAuthor: string
 *  - experience: Array<string>, one line each, e.g. "Ayurvedic massage since 2007"
 *  - training, furtherTraining: Array<{ year, title, teacher }>, year is e.g. "2007",
 *    "ongoing" (ONGOING) or empty
 */

export const PRACTITIONER_USER_TYPE = 'practitioner';

// The regions of the marketplace (see the region pages)
export const LOCATION_OPTIONS = ['berlin', 'balearic_islands'];

export const LANGUAGE_OPTIONS = [
  'german',
  'english',
  'spanish',
  'french',
  'italian',
  'portuguese',
  'dutch',
  'catalan',
];

// The year of a training that is still going on
export const ONGOING = 'ongoing';

// Form field (object) that holds the practitioner profile in Profile settings
export const PRACTITIONER_PROFILE_FIELD = 'practitionerProfile';

const MAX_ROWS = 30;
const MAX_TEXT_LENGTH = 200;

/**
 * @param {Object} user User entity
 * @returns {boolean}
 */
export const isPractitioner = user =>
  user?.attributes?.profile?.publicData?.userType === PRACTITIONER_USER_TYPE;

const cleanText = (value, maxLength = MAX_TEXT_LENGTH) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const cleanOptions = (values, options) =>
  Array.isArray(values) ? options.filter(o => values.includes(o)) : [];

const cleanTrainingRows = rows =>
  (Array.isArray(rows) ? rows : [])
    .map(row => ({
      year: cleanText(row?.year, 20),
      title: cleanText(row?.title),
      teacher: cleanText(row?.teacher),
    }))
    .filter(row => row.title)
    .slice(0, MAX_ROWS);

/**
 * The practitioner profile from the user's public data, cleaned up.
 *
 * @param {Object} publicData
 * @returns {Object}
 */
export const getPractitionerProfile = publicData => {
  const data = publicData || {};
  return {
    professionalTitle: cleanText(data.professionalTitle, 60),
    locations: cleanOptions(data.locations, LOCATION_OPTIONS),
    languagesSpoken: cleanOptions(data.languagesSpoken, LANGUAGE_OPTIONS),
    quote: cleanText(data.quote, 600),
    quoteAuthor: cleanText(data.quoteAuthor, 80),
    experience: (Array.isArray(data.experience) ? data.experience : [])
      .map(line => cleanText(line))
      .filter(Boolean)
      .slice(0, MAX_ROWS),
    training: cleanTrainingRows(data.training),
    furtherTraining: cleanTrainingRows(data.furtherTraining),
  };
};

/**
 * Initial values of the practitioner profile form. Lists get one empty row to start with.
 *
 * @param {Object} publicData
 * @returns {Object}
 */
export const getPractitionerProfileFormValues = publicData => {
  const profile = getPractitionerProfile(publicData);
  const withRow = (rows, empty) => (rows.length > 0 ? rows : [empty]);
  return {
    ...profile,
    experience: withRow(profile.experience, ''),
    training: withRow(profile.training, { year: '', title: '', teacher: '' }),
    furtherTraining: withRow(profile.furtherTraining, { year: '', title: '', teacher: '' }),
  };
};

/**
 * Public data of the practitioner profile form (empty rows removed).
 *
 * @param {Object} values Form values of the practitioner profile
 * @returns {Object}
 */
export const getPractitionerProfilePublicData = values => getPractitionerProfile(values);
