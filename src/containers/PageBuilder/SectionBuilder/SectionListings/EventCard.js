import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../../util/reactIntl';
import { createSlug } from '../../../../util/urlHelpers';
import {
  EVENT_TYPE,
  EVENT_TYPES,
  formatSeminarCardDates,
  isCouplesListing,
} from '../../../../util/seminarSchedule';
import { getListingRating } from '../../../../util/rating';
import { getListingTitle } from '../../../../util/localizedContent';
import { getListingPlaceLine } from '../../../../util/neighbourhoods';
import { formatMoneyAmountFirst } from '../../../../util/currency';

import { AspectRatioWrapper, NamedLink, ResponsiveImage } from '../../../../components';

import css from './EventCard.module.css';

const PhotoPlaceholderIcon = () => (
  <svg
    className={css.placeholderIcon}
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.5" />
    <path d="M21 16l-5-5-4 4-2-2-6 6" />
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

const getEventCardFields = (listing, intl) => {
  const { publicData, price } = listing?.attributes || {};
  const eventType = publicData?.[EVENT_TYPE];
  const listingRating = getListingRating(listing);
  const hasReviews = Number(listingRating?.reviewCount) > 0;
  const locationSource = publicData?.location;

  return {
    title: getListingTitle(listing, intl),
    // Seminar, Training, Workshop, Event or Retreat (see util/seminarSchedule.js)
    eventTypeLabel: EVENT_TYPES.includes(eventType)
      ? intl.formatMessage({ id: `EventType.${eventType}` })
      : null,
    // e.g. "27 Dec 26 – 3 Jan 27"
    dateLabel: formatSeminarCardDates(intl, publicData),
    // City or region · Area or town, like on treatment cards
    locationLabel:
      typeof locationSource === 'string'
        ? locationSource.trim() || null
        : locationSource?.address
        ? getListingPlaceLine(publicData, intl)
        : publicData?.locationName || null,
    // Only the star: no number of reviews on seminar cards
    rating: hasReviews ? listingRating.rating : null,
    priceLabel: price ? formatMoneyAmountFirst(intl, price) : null,
    // Booked by couples: "350 € / couple"
    isCouples: isCouplesListing(publicData),
    authorName: listing?.author?.attributes?.profile?.displayName || null,
  };
};

/**
 * Card of Seminars & Events listings (home page, region pages, profiles): the type of the event
 * on the image, then the title, the dates, the place, the host, and the price with the rating.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className
 * @param {Object} props.listing listing-shaped entity
 * @param {string?} props.renderSizes
 * @param {number} props.aspectWidth
 * @param {number} props.aspectHeight
 * @returns {JSX.Element}
 */
const EventCard = props => {
  const intl = useIntl();
  const { className, listing, renderSizes, aspectWidth = 4, aspectHeight = 5 } = props;

  const {
    title,
    eventTypeLabel,
    dateLabel,
    locationLabel,
    rating,
    priceLabel,
    isCouples,
    authorName,
  } = getEventCardFields(listing, intl);

  const id = listing?.id?.uuid;
  const slug = createSlug(title);
  const firstImage = listing?.images?.[0] || null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k => k.startsWith('listing-card'))
    : [];
  const hasImage = Boolean(firstImage && variants.length);

  const withAuthor =
    authorName && intl.formatMessage({ id: 'EventCard.withAuthor' }, { authorName });
  const photoLabel = eventTypeLabel
    ? intl.formatMessage({ id: 'EventCard.photoPlaceholder' }, { category: eventTypeLabel })
    : null;

  return (
    <NamedLink
      className={classNames(css.root, className)}
      name="ListingPage"
      params={{ id, slug }}
      ariaLabel={title}
    >
      <div className={css.media}>
        <AspectRatioWrapper className={css.frame} width={aspectWidth} height={aspectHeight}>
          {hasImage ? (
            <ResponsiveImage
              rootClassName={css.image}
              alt={title}
              image={firstImage}
              variants={variants}
              sizes={renderSizes}
            />
          ) : (
            <div className={css.placeholder}>
              <PhotoPlaceholderIcon />
              {photoLabel ? <span className={css.placeholderLabel}>{photoLabel}</span> : null}
            </div>
          )}
        </AspectRatioWrapper>
        {eventTypeLabel ? <span className={css.badge}>{eventTypeLabel}</span> : null}
      </div>
      <div className={css.info}>
        <div className={css.title}>{title}</div>
        {dateLabel ? <div className={css.date}>{dateLabel}</div> : null}
        {locationLabel ? <div className={css.meta}>{locationLabel}</div> : null}
        {withAuthor ? <div className={css.meta}>{withAuthor}</div> : null}
        <div className={css.priceRow}>
          {priceLabel && isCouples ? (
            <span className={css.price}>
              <span className={css.priceValue}>{priceLabel}</span>{' '}
              <span className={css.pricePrefix}>
                {intl.formatMessage({ id: 'EventCard.perCouple' })}
              </span>
            </span>
          ) : priceLabel ? (
            <span className={css.price}>
              <span className={css.pricePrefix}>
                {intl.formatMessage({ id: 'ListingCard.priceFromPrefix' })}
              </span>{' '}
              <span className={css.priceValue}>{priceLabel}</span>
            </span>
          ) : (
            <span />
          )}
          {rating != null ? (
            <span className={css.rating}>
              <RatingStarIcon />
              <span>{Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : rating}</span>
            </span>
          ) : (
            // No reviews yet: the rating appears with the first review
            <span className={css.rating}>{intl.formatMessage({ id: 'ListingCard.new' })}</span>
          )}
        </div>
      </div>
    </NamedLink>
  );
};

export default EventCard;
