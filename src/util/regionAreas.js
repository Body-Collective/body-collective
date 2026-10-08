/**
 * Region pages (e.g. /p/berlin) show a region's neighbourhoods as pills, and filter the page's
 * listing sections by the selected one.
 *
 * The neighbourhoods are the blocks of the "region-areas" section in Console:
 * - block title: the label of the pill
 * - block text: of the first block only: how the whole region is put in a sentence, e.g. "across
 *   the city" in "8 practitioners across the city"
 * - block link address: a search page URL, e.g. "/s?address=Mitte,+Berlin&bounds=52.5,13.4,52.4,13.3".
 *   Search for the neighbourhood on the search page and copy the URL
 * - block anchor id: the value of ?area= in the page URL (the title is used when it's empty)
 * The first block is the whole region. It's what the page shows by default.
 */

// Section ids (the "Anchor link ID" of a section in Console) that make a page a region page
export const REGION_HERO_SECTION_ID = 'region-hero';
export const REGION_AREAS_SECTION_ID = 'region-areas';
export const REGION_PRACTITIONERS_SECTION_ID = 'region-practitioners';
export const REGION_EVENTS_SECTION_ID = 'region-events';
export const AREA_PARAM = 'area';

/**
 * Is the section one of the listing sections of a region page?
 *
 * @param {string?} sectionId
 * @returns {boolean}
 */
export const isRegionListingsSectionId = sectionId =>
  sectionId === REGION_PRACTITIONERS_SECTION_ID || sectionId === REGION_EVENTS_SECTION_ID;

// Search params that tell where to look. A neighbourhood replaces these in a section's query.
const LOCATION_PARAMS = ['address', 'bounds', 'origin'];

const slugify = text =>
  `${text || ''}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Search params of a search page URL or a query string.
 *
 * @param {string?} value e.g. "/s?address=Berlin&bounds=1,2,3,4", "https://example.com/s?a=b" or "a=b&c=d"
 * @returns {Object} e.g. { address: 'Berlin', bounds: '1,2,3,4' }
 */
export const parseSearchQuery = value => {
  if (typeof value !== 'string' || value.trim() === '') {
    return {};
  }
  const withoutHash = value.split('#')[0];
  const queryStart = withoutHash.indexOf('?');
  const isPathWithoutQuery = queryStart < 0 && /^(\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(withoutHash);
  if (isPathWithoutQuery) {
    return {};
  }
  const queryString = queryStart >= 0 ? withoutHash.slice(queryStart + 1) : withoutHash;
  return Object.fromEntries(new URLSearchParams(queryString).entries());
};

/**
 * The neighbourhoods defined in the "region-areas" section of a page.
 *
 * @param {Array<Object>?} allSections sections of the page asset
 * @returns {Array<{slug: string, name: string, description: string, params: Object, isDefault: boolean}>}
 */
export const getRegionAreas = allSections => {
  const section = (allSections || []).find(s => s.sectionId === REGION_AREAS_SECTION_ID);
  return (section?.blocks || [])
    .map(block => ({
      name: (block.title?.content || block.blockName || '').trim(),
      description: (block.text?.content || '').trim(),
      slug: block.blockId || '',
      params: parseSearchQuery(block.callToAction?.href),
    }))
    .filter(area => area.name)
    .map((area, index) => ({
      ...area,
      slug: area.slug || slugify(area.name),
      isDefault: index === 0,
    }));
};

/**
 * The selected neighbourhood, from the ?area= param of the page URL.
 *
 * @param {Array<Object>} areas from getRegionAreas
 * @param {string?} search location search string, e.g. "?area=mitte"
 * @returns {Object|null} the neighbourhood, or null for the whole region (the default)
 */
export const getSelectedArea = (areas, search) => {
  const slug = new URLSearchParams(search || '').get(AREA_PARAM);
  return (slug && areas.find(area => area.slug === slug && !area.isDefault)) || null;
};

/**
 * A section's listing search query, pointed at a neighbourhood. The category etc. of the query stay,
 * and the neighbourhood's address and bounds take the place of the region's.
 *
 * @param {string?} listingSearchQuery query of the section in Console
 * @param {Object|null} area from getSelectedArea. Null leaves the query as it is
 * @returns {string|undefined} query string
 */
export const getAreaListingSearchQuery = (listingSearchQuery, area) => {
  if (!area) {
    return listingSearchQuery;
  }
  const params = parseSearchQuery(listingSearchQuery);
  LOCATION_PARAMS.forEach(key => delete params[key]);
  LOCATION_PARAMS.forEach(key => {
    if (area.params[key]) {
      params[key] = area.params[key];
    }
  });
  return new URLSearchParams(params).toString();
};

/**
 * Search params for the search page for a neighbourhood. The first block (the whole region) is used
 * when none is given, so a search from a region page stays in the region.
 *
 * @param {Array<Object>} areas from getRegionAreas
 * @param {Object|null} area selected neighbourhood
 * @returns {Object} e.g. { address: 'Berlin', bounds: '1,2,3,4' }
 */
export const getAreaSearchParams = (areas, area) => {
  const { params = {} } = area || areas[0] || {};
  return LOCATION_PARAMS.reduce(
    (picked, key) => (params[key] ? { ...picked, [key]: params[key] } : picked),
    {}
  );
};
