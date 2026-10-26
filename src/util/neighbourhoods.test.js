import { getListingPlaceLine, getNeighbourhoodOptions, getRegionOfOrigin } from './neighbourhoods';

describe('neighbourhoods', () => {
  const wedding = { lat: 52.5503, lng: 13.3647 };
  const palma = { lat: 39.5696, lng: 2.6502 };

  it('tells the region of an address', () => {
    expect(getRegionOfOrigin(wedding).id).toEqual('berlin');
    expect(getRegionOfOrigin(palma).id).toEqual('balearic-islands');
    expect(getRegionOfOrigin({ lat: 48.1351, lng: 11.582 })).toBeNull();
    expect(getRegionOfOrigin(null)).toBeNull();
  });

  it("offers the neighbourhoods of the address's region, or all outside the regions", () => {
    const options = origin => getNeighbourhoodOptions(origin);
    expect(options(wedding)).toContain('wedding');
    expect(options(wedding)).not.toContain('mallorca');
    expect(options(palma)).toEqual(['mallorca', 'ibiza', 'formentera', 'menorca']);
    expect(options(null)).toHaveLength(12);
  });

  it('shows the place on cards: city or region, then area or town', () => {
    const intl = {
      formatMessage: ({ id }) =>
        ({ 'Neighbourhood.kreuzberg': 'Kreuzberg', 'Neighbourhood.mallorca': 'Mallorca' }[id]),
    };
    const place = (address, neighbourhood) =>
      getListingPlaceLine({ location: { address }, neighbourhood }, intl);
    expect(place('Liebenwalder Straße 33, 13347 Berlin, Deutschland', 'kreuzberg')).toEqual(
      'Berlin · Kreuzberg'
    );
    expect(place('Carrer de sa Lluna 5, 07100 Sóller, Spanien', 'mallorca')).toEqual(
      'Mallorca · Sóller'
    );
    expect(place('Liebenwalder Straße 33, 13347 Berlin, Deutschland')).toEqual('Berlin');
    expect(place('Mallorca, Spanien', 'mallorca')).toEqual('Mallorca');
  });
});
