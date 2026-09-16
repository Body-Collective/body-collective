// ⚠️ If you modify the styling of this component and you're using the SectionListings component in your marketplace (featured listings)
// please reflect those changes in the calculateCarouselHeight function in SectionListing.js to avoid layout issues
import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';

import { useIntl } from '../../util/reactIntl';
import { requireListingImage } from '../../util/configHelpers';
import { lazyLoadWithDimensions } from '../../util/uiHelpers';
import { createSlug } from '../../util/urlHelpers';

import {
  AspectRatioWrapper,
  NamedLink,
  ResponsiveImage,
  ListingCardThumbnail,
} from '../../components';

import { getListingCardTranslations } from './ListingCard.helpers';

import css from './ListingCard.module.css';

const LazyImage = lazyLoadWithDimensions(ResponsiveImage, { loadAfterInitialRendering: 3000 });

const FavoriteIcon = () => (
  <svg
    className={css.favoriteIcon}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const RatingStarIcon = () => (
  <svg
    className={css.ratingStar}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3.2l2.47 5.01 5.53.8-4 3.9.94 5.5L12 16.9l-4.94 2.51.94-5.5-4-3.9 5.53-.8L12 3.2z" />
  </svg>
);

/**
 * ListingCardImage
 * Component responsible for rendering the image part of the listing card.
 * It either renders the first image from the listing's images array with lazy loading,
 * or a stylized placeholder if images are disabled for the listing type.
 * Also wraps the image in a fixed aspect ratio container for consistent layout.
 * @component
 * @param {Object} props
 * @param {Object} props.listing listing entity with image data
 * @param {Function?} props.setActivePropsMaybe mouse enter/leave handlers for map highlighting
 * @param {string} props.title listing title for alt text
 * @param {string} props.renderSizes img/srcset size rules
 * @param {number} props.aspectWidth aspect ratio width
 * @param {number} props.aspectHeight aspect ratio height
 * @param {string} props.variantPrefix image variant prefix (e.g. "listing-card")
 * @param {boolean} props.showListingImage whether to show actual listing image or not
 * @param {Object?} props.style the background color for the listing card with no image
 * @returns {JSX.Element} listing image with fixed aspect ratio or fallback preview
 */
const ListingCardImage = props => {
  const {
    listing,
    setActivePropsMaybe,
    title,
    renderSizes,
    aspectWidth,
    aspectHeight,
    variantPrefix,
    aspectRatioClassName,
    lazyLoadImage,
  } = props;

  const firstImage = listing?.images?.[0] || null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const aspectRatioClass = aspectRatioClassName || css.aspectRatioWrapper;
  const ImageComponent = lazyLoadImage ? LazyImage : ResponsiveImage;

  return (
    <AspectRatioWrapper
      className={aspectRatioClass}
      width={aspectWidth}
      height={aspectHeight}
      {...setActivePropsMaybe}
    >
      <ImageComponent
        rootClassName={css.rootForImage}
        alt={title}
        image={firstImage}
        variants={variants}
        sizes={renderSizes}
        noImageMessage=" "
      />
    </AspectRatioWrapper>
  );
};

/**
 * ListingCard
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.aspectRatioClassName custom className for AspectRatioWrapper component
 * @param {Object} props.listing API entity: listing or ownListing
 * @param {string?} props.renderSizes for img/srcset
 * @param {Function?} props.setActiveListing
 * @param {boolean?} props.showAuthorInfo
 * @param {number?} props.aspectWidth override listing image aspect width
 * @param {number?} props.aspectHeight override listing image aspect height
 * @returns {JSX.Element} listing card to be used in search result panel etc.
 */
export const ListingCard = props => {
  const config = useConfiguration();
  const intl = props.intl || useIntl();

  const {
    className,
    rootClassName,
    aspectRatioClassName,
    darkMode,
    listing,
    renderSizes,
    setActiveListing,
    showAuthorInfo = true,
    lazyLoadImage = true,
    aspectWidth: aspectWidthProp,
    aspectHeight: aspectHeightProp,
  } = props;

  const translations = getListingCardTranslations(listing, config, intl);
  const {
    titlePlain,
    titleFormatted,
    cardAriaLabel,
    showPrice,
    priceTooltip,
    priceDisplay,
    authorName,
    locationLabel,
    rating,
    reviewCount,
  } = translations;

  const classes = classNames(rootClassName || css.root, className);

  const id = listing?.id?.uuid;
  const { title = '', publicData } = listing?.attributes || {};
  const slug = createSlug(title);

  const { listingType, cardStyle } = publicData || {};
  const validListingTypes = config.listing.listingTypes || [];
  const foundListingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);
  // Render the listing image only if listing images are enabled in the listing type
  const showListingImage = requireListingImage(foundListingTypeConfig);

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const imageAspectWidth = aspectWidthProp || aspectWidth;
  const imageAspectHeight = aspectHeightProp || aspectHeight;

  // Sets the listing as active in the search map when hovered (if the search map is enabled)
  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => setActiveListing(listing?.id),
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  const reviewsLabel =
    reviewCount != null
      ? intl.formatMessage({ id: 'ListingCard.reviews' }, { count: Number(reviewCount) })
      : null;
  const showMeta = Boolean(locationLabel || reviewsLabel);

  const handleFavoriteClick = event => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <NamedLink
      className={classes}
      name="ListingPage"
      params={{ id, slug }}
      ariaLabel={cardAriaLabel}
    >
      <div className={css.media}>
        {showListingImage ? (
          <ListingCardImage
            renderSizes={renderSizes}
            title={titlePlain}
            listing={listing}
            setActivePropsMaybe={setActivePropsMaybe}
            aspectWidth={imageAspectWidth}
            aspectHeight={imageAspectHeight}
            variantPrefix={variantPrefix}
            aspectRatioClassName={aspectRatioClassName}
            lazyLoadImage={lazyLoadImage}
          />
        ) : (
          <ListingCardThumbnail
            style={cardStyle}
            listingTitle={title}
            className={aspectRatioClassName}
            width={imageAspectWidth}
            height={imageAspectHeight}
            setActivePropsMaybe={setActivePropsMaybe}
          />
        )}
        <button
          type="button"
          className={css.favoriteButton}
          onClick={handleFavoriteClick}
          aria-label={intl.formatMessage({ id: 'ListingCard.saveListing' })}
        >
          <FavoriteIcon />
        </button>
      </div>
      <div className={css.info}>
        <div className={css.authorRow}>
          {showAuthorInfo && authorName ? (
            <div className={classNames(css.authorName, { [css.lightText]: darkMode })}>
              {authorName}
            </div>
          ) : (
            <span />
          )}
          {rating != null ? (
            <div className={css.rating}>
              <RatingStarIcon />
              <span className={css.ratingValue}>
                {Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : rating}
              </span>
            </div>
          ) : null}
        </div>
        {showListingImage ? (
          <div className={classNames(css.title, { [css.lightText]: darkMode })}>
            {titleFormatted}
          </div>
        ) : null}
        {showMeta ? (
          <div className={css.meta}>
            {locationLabel ? <span>{locationLabel}</span> : null}
            {locationLabel && reviewsLabel ? <span className={css.metaDot}>·</span> : null}
            {reviewsLabel ? <span>{reviewsLabel}</span> : null}
          </div>
        ) : null}
        {showPrice ? (
          <div className={css.price} title={priceTooltip}>
            <span className={css.pricePrefix}>
              {intl.formatMessage({ id: 'ListingCard.priceFromPrefix' })}
            </span>
            <span className={css.priceValue}>{priceDisplay}</span>
          </div>
        ) : null}
      </div>
    </NamedLink>
  );
};

export default ListingCard;
