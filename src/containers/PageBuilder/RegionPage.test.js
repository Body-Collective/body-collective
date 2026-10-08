import React from 'react';
import '@testing-library/jest-dom';
import { useLocation } from 'react-router-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import SectionBuilder from './SectionBuilder/SectionBuilder';

const { waitFor, userEvent } = testingLibrary;

const areaBlock = (name, blockId, href, text) => ({
  blockType: 'defaultBlock',
  blockName: name,
  blockId,
  title: { fieldType: 'heading3', content: name },
  ...(text ? { text: { fieldType: 'markdown', content: text } } : {}),
  callToAction: { fieldType: 'internalButtonLink', content: name, href },
});

const sections = [
  {
    sectionType: 'hero',
    sectionId: 'region-hero',
    title: { fieldType: 'heading1', content: 'Berlin' },
    callToAction: { fieldType: 'search', searchFields: { locationSearch: true } },
  },
  {
    sectionType: 'columns',
    sectionId: 'region-areas',
    numColumns: 1,
    blocks: [
      areaBlock(
        'All of Berlin',
        'all-of-berlin',
        's?address=Berlin%2C+Deutschland&bounds=52.67%2C13.76%2C52.33%2C13.08',
        'across the city'
      ),
      areaBlock('Mitte', 'mitte', 's?address=Mitte%2C+Berlin&bounds=52.54%2C13.42%2C52.50%2C13.36'),
      areaBlock(
        'Neukölln',
        'neukoelln',
        's?address=Neuk%C3%B6lln%2C+Berlin&bounds=52.49%2C13.47%2C52.45%2C13.40'
      ),
    ],
  },
  {
    sectionType: 'listings',
    sectionId: 'region-practitioners',
    numColumns: 4,
    listingSelection: 'queryString',
    listingSearchQuery:
      'address=Berlin%2C+Deutschland&bounds=52.67%2C13.76%2C52.33%2C13.08&pub_listingType=daily_booking',
  },
];

// Shows where the page is, so that the tests can see what choosing a neighbourhood does to the URL
const LocationProbe = () => {
  const { pathname, search, state } = useLocation();
  return (
    <div data-testid="location">
      {pathname}
      {search}
      {state?.inPageNavigation ? ' (in page)' : ''}
    </div>
  );
};

// A region page of islands. The description of the areas section names the kind of area, and the
// blocks have text to tell where they are ("on Mallorca")
const islandSections = [
  sections[0],
  {
    sectionType: 'columns',
    sectionId: 'region-areas',
    numColumns: 1,
    description: { fieldType: 'paragraph', content: 'Island' },
    blocks: [
      areaBlock(
        'All islands',
        'all-islands',
        's?address=Balearic+Islands&bounds=40.08%2C4.31%2C38.64%2C1.21',
        'across the islands'
      ),
      areaBlock(
        'Mallorca',
        'mallorca',
        's?address=Mallorca&bounds=39.97%2C3.49%2C39.26%2C2.32',
        'on Mallorca'
      ),
      areaBlock('Ibiza', 'ibiza', 's?address=Ibiza&bounds=39.12%2C1.65%2C38.80%2C1.15'),
    ],
  },
  sections[2],
];

const renderRegionPage = ({
  featuredListingData = {},
  onFetchFeaturedListings = jest.fn(),
  pageSections = sections,
} = {}) => {
  const featuredListings = {
    featuredListingData,
    parentPage: 'berlin',
    onFetchFeaturedListings,
    getListingEntitiesById: () => [],
  };
  // The tests show the message keys as texts by default. Here the English texts are shown instead.
  const result = render(
    <>
      <SectionBuilder sections={pageSections} options={{ featuredListings }} />
      <LocationProbe />
    </>,
    { messages: enMessages }
  );
  return { ...result, onFetchFeaturedListings };
};

describe('Region page', () => {
  it('shows the neighbourhoods as pills, with the whole region chosen', () => {
    const { getByRole } = renderRegionPage();
    const pills = ['All of Berlin', 'Mitte', 'Neukölln'];
    pills.forEach(name => expect(getByRole('button', { name })).toBeInTheDocument());
    expect(getByRole('button', { name: 'All of Berlin' })).toHaveAttribute('aria-pressed', 'true');
    expect(getByRole('button', { name: 'Mitte' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('chooses a neighbourhood with the area param, and the whole region by removing it', async () => {
    const { getByRole, getByTestId } = renderRegionPage();

    await userEvent.click(getByRole('button', { name: 'Mitte' }));
    await waitFor(() => {
      expect(getByTestId('location')).toHaveTextContent('/?area=mitte (in page)');
    });
    expect(getByRole('button', { name: 'Mitte' })).toHaveAttribute('aria-pressed', 'true');
    expect(getByRole('button', { name: 'All of Berlin' })).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(getByRole('button', { name: 'All of Berlin' }));
    await waitFor(() => {
      expect(getByTestId('location')).not.toHaveTextContent('area=');
    });
    expect(getByRole('button', { name: 'All of Berlin' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('loads the listings of the page, and the listings of a neighbourhood when it is chosen', async () => {
    const { getByRole, onFetchFeaturedListings } = renderRegionPage();

    expect(onFetchFeaturedListings).toHaveBeenCalledTimes(1);
    expect(onFetchFeaturedListings.mock.calls[0][0]).toEqual('region-practitioners');
    expect(onFetchFeaturedListings.mock.calls[0][4]).toEqual({ areaSlug: null, perPage: 24 });

    await userEvent.click(getByRole('button', { name: 'Neukölln' }));
    expect(onFetchFeaturedListings).toHaveBeenCalledTimes(2);
    expect(onFetchFeaturedListings.mock.calls[1][4]).toEqual({
      areaSlug: 'neukoelln',
      perPage: 24,
    });
  });

  it('does not load the listings again when they are already there', () => {
    const { onFetchFeaturedListings } = renderRegionPage({
      featuredListingData: {
        'region-practitioners': { fetched: true, listingIds: [], totalItems: 0, areaSlug: null },
      },
    });
    expect(onFetchFeaturedListings).not.toHaveBeenCalled();
  });

  it('counts the listings of the region and of the chosen neighbourhood', async () => {
    const featuredListingData = {
      'region-practitioners': { fetched: true, listingIds: [], totalItems: 8, areaSlug: null },
    };
    const { getByRole, getByText, queryByText } = renderRegionPage({ featuredListingData });
    expect(getByText('8 practitioners across the city')).toBeInTheDocument();
    expect(getByText('No practitioners here yet.')).toBeInTheDocument();

    await userEvent.click(getByRole('button', { name: 'Mitte' }));
    // The count of the region is not shown for a neighbourhood while its listings load
    expect(queryByText('8 practitioners across the city')).not.toBeInTheDocument();
  });

  it('searches for the neighbourhood chosen in the hero, without filtering the page', async () => {
    const { getByRole, getByText, getByTestId } = renderRegionPage();

    await userEvent.click(getByRole('combobox', { name: 'Neighbourhood' }));
    await userEvent.click(getByRole('option', { name: 'Neukölln' }));
    expect(getByText('Neukölln', { selector: 'span' })).toBeInTheDocument();
    // The page keeps showing the whole region
    expect(getByRole('button', { name: 'All of Berlin' })).toHaveAttribute('aria-pressed', 'true');
    expect(getByTestId('location')).not.toHaveTextContent('area=');

    await userEvent.click(getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(getByTestId('location')).toHaveTextContent('/s?address=Neuk');
    });
    expect(getByTestId('location')).toHaveTextContent('bounds=52.49%2C13.47%2C52.45%2C13.40');
  });
  describe('with islands', () => {
    const renderIslands = options => renderRegionPage({ pageSections: islandSections, ...options });

    it('names the hero field and the pills after the kind of area, without showing it as text', () => {
      const { getByRole, queryByText } = renderIslands();

      expect(getByRole('combobox', { name: 'Island' })).toBeInTheDocument();
      expect(getByRole('list', { name: 'Filter by Island' })).toBeInTheDocument();
      // The description of the areas section is a name for the field, not a text of the page
      expect(queryByText('Island', { selector: 'p' })).not.toBeInTheDocument();
    });

    it('names the hero field a neighbourhood when the page does not say otherwise', () => {
      const { getByRole } = renderRegionPage();

      expect(getByRole('combobox', { name: 'Neighbourhood' })).toBeInTheDocument();
      expect(getByRole('list', { name: 'Filter by Neighbourhood' })).toBeInTheDocument();
    });

    it('tells where the listings are in the words of the block of the area', async () => {
      const wholeRegion = {
        'region-practitioners': { fetched: true, listingIds: [], totalItems: 8, areaSlug: null },
      };
      const { getByText } = renderIslands({ featuredListingData: wholeRegion });
      expect(getByText('8 practitioners across the islands')).toBeInTheDocument();
    });

    it('counts the listings of an island with the text of its block', async () => {
      const mallorca = {
        'region-practitioners': {
          fetched: true,
          listingIds: [],
          totalItems: 3,
          areaSlug: 'mallorca',
        },
      };
      const { getByRole, getByText, queryByText } = renderIslands({
        featuredListingData: mallorca,
      });

      await userEvent.click(getByRole('button', { name: 'Mallorca' }));
      expect(getByText('3 practitioners on Mallorca')).toBeInTheDocument();
      expect(queryByText(/in Mallorca/)).not.toBeInTheDocument();
    });

    it('says in an area when its block has no text', async () => {
      const featuredListingData = {
        'region-practitioners': { fetched: true, listingIds: [], totalItems: 0, areaSlug: 'ibiza' },
      };
      const { getByRole, getByText } = renderIslands({ featuredListingData });

      await userEvent.click(getByRole('button', { name: 'Ibiza' }));
      expect(getByText('0 practitioners in Ibiza')).toBeInTheDocument();
      expect(getByText('No practitioners in Ibiza yet.')).toBeInTheDocument();
    });

    it('says on the island in the empty message when the block has text', async () => {
      const featuredListingData = {
        'region-practitioners': {
          fetched: true,
          listingIds: [],
          totalItems: 0,
          areaSlug: 'mallorca',
        },
      };
      const { getByRole, getByText } = renderIslands({ featuredListingData });

      await userEvent.click(getByRole('button', { name: 'Mallorca' }));
      expect(getByText('0 practitioners on Mallorca')).toBeInTheDocument();
      expect(getByText('No practitioners on Mallorca yet.')).toBeInTheDocument();
    });
  });
});
