/**
 * Neighbourhoods of listings: public data "neighbourhood" (an option id), defined here, not in
 * Console. The search page keeps it as a filter (pub_neighbourhood, see SearchPage.shared.js).
 * Its search schema (enum) is created with flex-cli:
 *   flex-cli search set --key neighbourhood --scope public --type enum --schema-for listing -m <marketplace>
 *
 * The practitioner chooses it on the Location tab, among the neighbourhoods of the region of the
 * address: Berlin or the Balearic Islands. The region pages filter their listings by it (block
 * links like "/s?pub_neighbourhood=mitte", see util/regionAreas.js).
 */

export const NEIGHBOURHOOD_KEY = 'neighbourhood';
export const NEIGHBOURHOOD_SEARCH_PARAM = `pub_${NEIGHBOURHOOD_KEY}`;
// Listing types that have a neighbourhood (treatments and Seminars & Events, with an address)
export const NEIGHBOURHOOD_LISTING_TYPES = [
  'daily_booking',
  'mobile_service',
  'seminar_event_booking',
];

// Regions with their area (north, east, south, west) and their neighbourhoods (option ids are
// stored in listings: don't change them)
export const REGIONS = [
  {
    id: 'berlin',
    // Card line "Berlin · Kreuzberg": the city, then the neighbourhood
    cityFirst: true,
    bounds: { ne: { lat: 52.68, lng: 13.77 }, sw: { lat: 52.33, lng: 13.08 } },
    neighbourhoods: [
      'mitte',
      'kreuzberg',
      'friedrichshain',
      'prenzlauer-berg',
      'neukoelln',
      'wedding',
      'schoeneberg',
      'charlottenburg',
    ],
  },
  {
    id: 'balearic-islands',
    // Card line "Mallorca · Sóller": the island, then the town
    cityFirst: false,
    bounds: { ne: { lat: 40.15, lng: 4.4 }, sw: { lat: 38.6, lng: 1.1 } },
    neighbourhoods: ['mallorca', 'ibiza', 'formentera', 'menorca'],
  },
];

// Option ids; their names are translations: Neighbourhood.<option id>
export const NEIGHBOURHOOD_OPTIONS = REGIONS.flatMap(region => region.neighbourhoods);

// Areas of an island, for the filters of the region page only (cards show the town of the
// address): public data "area" (an option id, search schema enum). Names are translations:
// NeighbourhoodArea.<option id>. A new island or region just needs its short list here.
export const AREA_KEY = 'area';
export const AREA_SEARCH_PARAM = `pub_${AREA_KEY}`;
export const ISLAND_AREAS = {
  mallorca: ['palma', 'tramuntana', 'southwest', 'north', 'east', 'south', 'centre'].map(
    area => `mallorca-${area}`
  ),
};
export const AREA_OPTIONS = Object.values(ISLAND_AREAS).flat();

/**
 * The areas of an island (or neighbourhood), e.g. the seven areas of Mallorca.
 *
 * @param {string} neighbourhood Option id, e.g. 'mallorca'
 * @returns {Array<string>} option ids
 */
export const getIslandAreas = neighbourhood => ISLAND_AREAS[neighbourhood] || [];

/**
 * The neighbourhood search param, if it has known option ids, e.g. "mitte" or "mallorca,ibiza".
 *
 * @param {string?} value
 * @returns {Object} { pub_neighbourhood: value } or an empty object
 */
export const validNeighbourhoodParam = value => {
  const options = typeof value === 'string' ? value.split(',').filter(Boolean) : [];
  const isValid = options.length > 0 && options.every(o => NEIGHBOURHOOD_OPTIONS.includes(o));
  return isValid ? { [NEIGHBOURHOOD_SEARCH_PARAM]: value } : {};
};

/**
 * The area search param, if it has known option ids, e.g. "mallorca-tramuntana".
 *
 * @param {string?} value
 * @returns {Object} { pub_area: value } or an empty object
 */
export const validAreaParam = value => {
  const options = typeof value === 'string' ? value.split(',').filter(Boolean) : [];
  const isValid = options.length > 0 && options.every(o => AREA_OPTIONS.includes(o));
  return isValid ? { [AREA_SEARCH_PARAM]: value } : {};
};

const isInBounds = (origin, bounds) =>
  origin.lat <= bounds.ne.lat &&
  origin.lat >= bounds.sw.lat &&
  origin.lng <= bounds.ne.lng &&
  origin.lng >= bounds.sw.lng;

/**
 * The region of an address, from its coordinates.
 *
 * @param {Object?} origin LatLng of the address
 * @returns {Object|null} one of REGIONS, or null outside of them
 */
export const getRegionOfOrigin = origin => {
  const hasCoordinates = Number.isFinite(origin?.lat) && Number.isFinite(origin?.lng);
  return (hasCoordinates && REGIONS.find(region => isInBounds(origin, region.bounds))) || null;
};

/**
 * The neighbourhoods to choose from for an address: the ones of its region, or all of them when
 * the address is outside the regions (or not chosen yet).
 *
 * @param {Object?} origin LatLng of the address
 * @returns {Array<string>} option ids
 */
export const getNeighbourhoodOptions = origin => {
  const region = getRegionOfOrigin(origin);
  return region ? region.neighbourhoods : NEIGHBOURHOOD_OPTIONS;
};

/**
 * The name of the listing's neighbourhood or island, e.g. "Wedding".
 *
 * @param {Object} publicData Public data of the listing
 * @param {Object} intl
 * @returns {string|null}
 */
export const getNeighbourhoodName = (publicData, intl) => {
  const option = publicData?.[NEIGHBOURHOOD_KEY];
  return NEIGHBOURHOOD_OPTIONS.includes(option)
    ? intl.formatMessage({ id: `Neighbourhood.${option}` })
    : null;
};

// The town of a Mapbox address: the part with the postcode, e.g. "13347 Berlin" => "Berlin"
const POSTCODE_AND_TOWN = /^\d{4,5}\s+(.+)$/;
const getTownOfAddress = address => {
  const parts = `${address || ''}`.split(',').map(part => part.trim());
  const match = parts.map(part => POSTCODE_AND_TOWN.exec(part)).find(Boolean);
  return match ? match[1] : null;
};

/**
 * The place of a listing on its card: "City or region · Area or town", e.g. "Berlin · Kreuzberg"
 * or "Mallorca · Sóller". Without a neighbourhood, the town of the address (or its first part).
 *
 * @param {Object} publicData Public data of the listing
 * @param {Object} intl
 * @returns {string|null}
 */
export const getListingPlaceLine = (publicData, intl) => {
  const address = publicData?.location?.address || '';
  const town = getTownOfAddress(address);
  const option = publicData?.[NEIGHBOURHOOD_KEY];
  const region = REGIONS.find(r => r.neighbourhoods.includes(option));
  if (!region) {
    return town || address.split(',')[0].trim() || null;
  }
  const name = getNeighbourhoodName(publicData, intl);
  const parts = region.cityFirst ? [town, name] : [name, town];
  return parts.filter((part, i) => part && parts.indexOf(part) === i).join(' · ');
};
