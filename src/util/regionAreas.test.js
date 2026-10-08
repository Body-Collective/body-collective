import {
  getAreaListingSearchQuery,
  getAreaSearchParams,
  getRegionAreas,
  getSelectedArea,
  parseSearchQuery,
} from './regionAreas';

const block = (title, href, blockId) => ({
  blockId,
  blockName: title,
  title: { fieldType: 'heading3', content: title },
  callToAction: href ? { fieldType: 'internalButtonLink', href, content: title } : undefined,
});

const sections = [
  { sectionId: 'region-hero', sectionType: 'hero' },
  {
    sectionId: 'region-areas',
    sectionType: 'columns',
    blocks: [
      block(
        'All of Berlin',
        '/s?address=Berlin%2C+Deutschland&bounds=52.67%2C13.76%2C52.33%2C13.08'
      ),
      block('Mitte', '/s?address=Mitte%2C+Berlin&bounds=52.55%2C13.43%2C52.50%2C13.34', 'mitte'),
      block('Neukölln', '/s?address=Neuk%C3%B6lln%2C+Berlin&bounds=52.50%2C13.50%2C52.40%2C13.40'),
    ],
  },
];

describe('regionAreas', () => {
  describe('parseSearchQuery', () => {
    it('reads params from a search page path, a full URL and a bare query string', () => {
      const expected = { address: 'Berlin, Deutschland', bounds: '1,2,3,4' };
      const query = 'address=Berlin%2C+Deutschland&bounds=1%2C2%2C3%2C4';
      expect(parseSearchQuery(`/s?${query}`)).toEqual(expected);
      expect(parseSearchQuery(`https://example.com/s?${query}#top`)).toEqual(expected);
      expect(parseSearchQuery(query)).toEqual(expected);
    });

    it('returns an empty object for missing values', () => {
      expect(parseSearchQuery()).toEqual({});
      expect(parseSearchQuery('')).toEqual({});
      expect(parseSearchQuery('/s')).toEqual({});
    });
  });

  describe('getRegionAreas', () => {
    it('reads the neighbourhoods from the blocks of the region-areas section', () => {
      const areas = getRegionAreas(sections);
      expect(areas.map(a => a.name)).toEqual(['All of Berlin', 'Mitte', 'Neukölln']);
      expect(areas[1].params).toEqual({
        address: 'Mitte, Berlin',
        bounds: '52.55,13.43,52.50,13.34',
      });
    });

    it('uses the block id as the slug and falls back to a slug made from the title', () => {
      const areas = getRegionAreas(sections);
      expect(areas.map(a => a.slug)).toEqual(['all-of-berlin', 'mitte', 'neukolln']);
    });

    it('marks only the first block as the default (whole region)', () => {
      expect(getRegionAreas(sections).map(a => a.isDefault)).toEqual([true, false, false]);
    });

    it('returns an empty list when the page has no region-areas section', () => {
      expect(getRegionAreas([{ sectionId: 'other' }])).toEqual([]);
      expect(getRegionAreas(undefined)).toEqual([]);
    });

    it('skips blocks without a title', () => {
      const withEmpty = [
        { sectionId: 'region-areas', blocks: [{ blockId: 'x' }, block('Mitte', '/s?address=M')] },
      ];
      expect(getRegionAreas(withEmpty).map(a => a.name)).toEqual(['Mitte']);
    });
  });

  describe('getSelectedArea', () => {
    const areas = getRegionAreas(sections);

    it('finds the neighbourhood from the area param', () => {
      expect(getSelectedArea(areas, '?area=mitte').name).toEqual('Mitte');
      expect(getSelectedArea(areas, '?foo=1&area=neukolln').name).toEqual('Neukölln');
    });

    it('returns null for the whole region, an unknown area or no param', () => {
      expect(getSelectedArea(areas, '?area=all-of-berlin')).toBeNull();
      expect(getSelectedArea(areas, '?area=nowhere')).toBeNull();
      expect(getSelectedArea(areas, '')).toBeNull();
      expect(getSelectedArea(areas, undefined)).toBeNull();
    });
  });

  describe('getAreaListingSearchQuery', () => {
    const areas = getRegionAreas(sections);
    const query =
      'address=Berlin%2C+Deutschland&bounds=52.67%2C13.76%2C52.33%2C13.08&pub_categoryLevel1=massage_and_bodywork';

    it('keeps the query as it is without a neighbourhood', () => {
      expect(getAreaListingSearchQuery(query, null)).toEqual(query);
      expect(getAreaListingSearchQuery(undefined, null)).toBeUndefined();
    });

    it('swaps the location params of the query for the ones of the neighbourhood', () => {
      const result = parseSearchQuery(getAreaListingSearchQuery(query, areas[1]));
      expect(result).toEqual({
        address: 'Mitte, Berlin',
        bounds: '52.55,13.43,52.50,13.34',
        pub_categoryLevel1: 'massage_and_bodywork',
      });
    });

    it('works for a section without a query', () => {
      const result = parseSearchQuery(getAreaListingSearchQuery(undefined, areas[1]));
      expect(result.address).toEqual('Mitte, Berlin');
    });
  });

  describe('getAreaSearchParams', () => {
    const areas = getRegionAreas(sections);

    it('gives the location params of the selected neighbourhood', () => {
      expect(getAreaSearchParams(areas, areas[2])).toEqual({
        address: 'Neukölln, Berlin',
        bounds: '52.50,13.50,52.40,13.40',
      });
    });

    it('uses the whole region when nothing is selected', () => {
      expect(getAreaSearchParams(areas, null).address).toEqual('Berlin, Deutschland');
    });

    it('is empty when there are no areas', () => {
      expect(getAreaSearchParams([], null)).toEqual({});
    });
  });
});
