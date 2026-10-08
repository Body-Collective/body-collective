import React, { useEffect } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { useConfiguration } from '../../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import {
  REGION_EVENTS_SECTION_ID,
  REGION_PRACTITIONERS_SECTION_ID,
  getAreaListingSearchQuery,
} from '../../../../util/regionAreas';
import { pickFieldOptions } from '../../PageBuilder.helpers';

// Import shared components
import { ErrorMessage, IconSpinner, ListingCard, NamedLink } from '../../../../components';

import Field, { hasDataInFields } from '../../Field';
import { useRegionArea } from '../../RegionAreaContext';

import SectionContainer from '../SectionContainer';
import EventCard from './EventCard';

import css from './RegionSectionListings.module.css';

// A region page shows all the listings of an area at once (up to this many), in a grid
const REGION_LISTING_COUNT = 24;
// The card images are portrait. The image variants are cropped to this ratio.
const CARD_ASPECT_WIDTH = 2;
const CARD_ASPECT_HEIGHT = 3;
const CARD_IMAGE_SIZES = '(max-width: 767px) 100vw, (max-width: 1100px) 33vw, 280px';
// TODO: ratings and reviews are not saved to the listings yet. Until they are, the cards of
// practitioners show these. A rating that is saved to the listing (publicData.rating and
// publicData.reviewCount) is shown instead.
const STATIC_RATING = { rating: 5, reviewCount: 41 };

/**
 * Listings section of a region page (e.g. /p/berlin): a grid of the listings of the section's
 * query (Console: "listing selection" is a search query). When an area (a neighbourhood, an
 * island...) is chosen with the pills of the page, the listings of that area are shown instead.
 *
 * Section ids: "region-practitioners" shows a count of the listings above the grid,
 * "region-events" shows event cards and is left out when there is nothing to show.
 *
 * @component
 * @param {Object} props
 * @param {string} props.sectionId id of the section
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.defaultClasses
 * @param {Object?} props.appearance
 * @param {Object?} props.title
 * @param {Object?} props.description
 * @param {Object?} props.callToAction
 * @param {Object} props.options extra options for the section component, includes featuredListings
 * @param {Array<Object>} props.allSections all the sections of the page
 * @returns {JSX.Element|null} section with the listing cards
 */
const RegionSectionListings = props => {
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    appearance,
    title,
    description,
    callToAction,
    options,
    allSections,
  } = props;
  const config = useConfiguration();
  const intl = useIntl();
  const regionArea = useRegionArea();

  const { featuredListings } = options;
  const {
    onFetchFeaturedListings,
    getListingEntitiesById,
    parentPage,
    featuredListingData,
  } = featuredListings;

  const isEvents = sectionId === REGION_EVENTS_SECTION_ID;
  const showCount = sectionId === REGION_PRACTITIONERS_SECTION_ID;
  const areas = regionArea?.areas || [];
  const selectedArea = regionArea?.selectedArea || null;
  const areaSlug = selectedArea?.slug || null;

  const data = featuredListingData?.[sectionId] || {};
  const { listingIds, fetched = false, inProgress = false, error, totalItems } = data;
  const loadedAreaSlug = data.areaSlug || null;
  const listings = listingIds ? getListingEntitiesById(listingIds) : [];

  useEffect(() => {
    // Load the listings, and load them again when another area is chosen
    const isUpToDate = loadedAreaSlug === areaSlug && (fetched || inProgress);
    if (!isUpToDate) {
      const listingImageConfig = {
        ...config.layout.listingImage,
        aspectWidth: CARD_ASPECT_WIDTH,
        aspectHeight: CARD_ASPECT_HEIGHT,
      };
      onFetchFeaturedListings(sectionId, parentPage, listingImageConfig, allSections, {
        areaSlug,
        perPage: REGION_LISTING_COUNT,
      });
    }
  }, [areaSlug]);

  // Events are only shown when there are some
  if (isEvents && listings.length === 0) {
    return null;
  }

  const fieldOptions = pickFieldOptions(options);
  const hasHeaderFields = hasDataInFields([title, description, callToAction], fieldOptions);

  const section = allSections.find(s => s.sectionId === sectionId);
  const searchQuery = getAreaListingSearchQuery(section?.listingSearchQuery, selectedArea);
  const hasMore = fetched && !inProgress && totalItems > listings.length;

  // Where an area is: the text of its block in Console ("across the city", "on Mallorca"), or
  // "in Mitte" when the block has no text
  const getScope = area =>
    area.description ||
    intl.formatMessage({ id: 'RegionSectionListings.inArea' }, { area: area.name });

  // "8 practitioners across the city" or "3 practitioners in Mitte"
  const wholeRegion = areas.find(area => area.isDefault);
  const count = totalItems ?? listings.length;
  const getCountLabel = () => {
    if (!showCount || !fetched || inProgress || error || !wholeRegion) {
      return null;
    }
    return intl.formatMessage(
      { id: 'RegionSectionListings.count' },
      { count, scope: getScope(selectedArea || wholeRegion) }
    );
  };
  const countLabel = getCountLabel();

  let content = null;
  if (error) {
    content = (
      <div className={css.message} role="alert">
        <h4 className={css.messageTitle}>
          <FormattedMessage id="SectionListings.genericErrorTitle" />
        </h4>
        <ErrorMessage error={error} />
      </div>
    );
  } else if (listings.length === 0 && !fetched) {
    content = (
      <div className={css.loading}>
        <IconSpinner />
      </div>
    );
  } else if (listings.length === 0) {
    content = (
      <div className={css.message} role="status">
        <p className={css.messageTitle}>
          {selectedArea ? (
            <FormattedMessage
              id="RegionSectionListings.emptyInArea"
              values={{ scope: getScope(selectedArea) }}
            />
          ) : (
            <FormattedMessage id="RegionSectionListings.emptyInRegion" />
          )}
        </p>
        <p className={css.messageText}>
          <FormattedMessage id="RegionSectionListings.emptyHint" />
        </p>
        <NamedLink name="SearchPage" className={css.link}>
          <FormattedMessage id="SectionListings.noListingsFoundCTA" />
        </NamedLink>
      </div>
    );
  } else {
    content = (
      <ul className={classNames(css.grid, { [css.dimmed]: inProgress })} aria-busy={inProgress}>
        {listings.map(listing => (
          <li key={listing.id.uuid} className={css.item}>
            {isEvents ? (
              <EventCard
                className={css.card}
                listing={listing}
                renderSizes={CARD_IMAGE_SIZES}
                aspectWidth={CARD_ASPECT_WIDTH}
                aspectHeight={CARD_ASPECT_HEIGHT}
              />
            ) : (
              <ListingCard
                className={css.card}
                aspectRatioClassName={css.cardImage}
                fallbackRating={STATIC_RATING}
                listing={listing}
                renderSizes={CARD_IMAGE_SIZES}
                aspectWidth={CARD_ASPECT_WIDTH}
                aspectHeight={CARD_ASPECT_HEIGHT}
              />
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      {hasHeaderFields ? (
        <header className={defaultClasses.sectionDetails}>
          <Field data={title} className={defaultClasses.title} options={fieldOptions} />
          <Field data={description} className={defaultClasses.description} options={fieldOptions} />
          <Field data={callToAction} className={defaultClasses.ctaButton} options={fieldOptions} />
        </header>
      ) : null}

      {showCount ? (
        <p className={css.count} role="status">
          {countLabel || ' '}
        </p>
      ) : null}

      {content}

      {hasMore && searchQuery ? (
        <div className={css.more}>
          <NamedLink name="SearchPage" to={{ search: `?${searchQuery}` }} className={css.link}>
            <FormattedMessage id="RegionSectionListings.viewAll" values={{ count: totalItems }} />
          </NamedLink>
        </div>
      ) : null}
    </SectionContainer>
  );
};

export default RegionSectionListings;
