/**
 * Profile of a practitioner (user type "practitioner"), shown on their profile page and edited in
 * Profile settings. Customers keep the default profile.
 *
 * Saved to the user's public data:
 *  - professionalTitle: string, e.g. "Therapist" (shown above the name)
 *  - locations: Array<string>, places typed by the practitioner (city, town or island), at most
 *    MAX_LOCATIONS; how many are shown depends on the plan (getVisibleLocations)
 *  - languagesSpoken: Array<string>, see LANGUAGE_OPTIONS
 *  - quote, quoteAuthor: string
 *  - experience: Array<string>, one line each, e.g. "Ayurvedic massage since 2007"
 *  - training, furtherTraining: Array<{ year, title, teacher }>, year is e.g. "2007",
 *    "ongoing" (ONGOING) or empty
 */

export const PRACTITIONER_USER_TYPE = 'practitioner';

// Locations: at most this many, and how many the plans show (Essential one, Professional all)
export const MAX_LOCATIONS = 3;
const LOCATIONS_BY_PLAN = { essential: 1, professional: MAX_LOCATIONS };
const MAX_LOCATION_LENGTH = 60;

// Locations saved when they were chosen from a list, as the place names
const LEGACY_LOCATION_NAMES = { berlin: 'Berlin', balearic_islands: 'Balearic Islands' };

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

const cleanLocations = values =>
  (Array.isArray(values) ? values : [])
    .map(value => LEGACY_LOCATION_NAMES[value] || cleanText(value, MAX_LOCATION_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_LOCATIONS);

/**
 * How many locations a plan shows on the profile and allows in Profile settings.
 *
 * @param {string} plan 'essential' or 'professional' (see util/subscription.js)
 * @returns {number}
 */
export const getMaxLocationsForPlan = plan => LOCATIONS_BY_PLAN[plan] || 1;

/**
 * The locations shown on the profile: as many as the plan allows. The others stay saved, e.g.
 * after a change from Professional to Essential.
 *
 * @param {Array<string>} locations
 * @param {string} plan
 * @returns {Array<string>}
 */
export const getVisibleLocations = (locations, plan) =>
  locations.slice(0, getMaxLocationsForPlan(plan));

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
    locations: cleanLocations(data.locations),
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
    locations: withRow(profile.locations, ''),
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
