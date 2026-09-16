import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../../util/reactIntl';
import { createSlug } from '../../../../util/urlHelpers';

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

const getEventCardFields = listing => {
  const { title = '', publicData } = listing?.attributes || {};
  const locationSource = publicData?.location;
  const locationLabel =
    typeof locationSource === 'string'
      ? locationSource.trim() || null
      : locationSource?.address
      ? locationSource.address.split(',')[0].trim()
      : publicData?.locationName || null;

  return {
    title,
    category: publicData?.eventCategory || publicData?.category || null,
    dateLabel: publicData?.dateLabel || null,
    locationLabel,
    rating: publicData?.rating ?? publicData?.averageRating ?? null,
    reviewCount: publicData?.reviewCount ?? publicData?.reviewsCount ?? null,
    authorName: listing?.author?.attributes?.profile?.displayName || null,
  };
};

/**
 * Card used by the seminars_and_events listings section.
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
    category,
    dateLabel,
    locationLabel,
    rating,
    reviewCount,
    authorName,
  } = getEventCardFields(listing);

  const id = listing?.id?.uuid;
  const slug = createSlug(title);
  const firstImage = listing?.images?.[0] || null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k => k.startsWith('listing-card'))
    : [];
  const hasImage = Boolean(firstImage && variants.length);

  const reviewsLabel =
    reviewCount != null
      ? intl.formatMessage({ id: 'ListingCard.reviews' }, { count: Number(reviewCount) })
      : null;
  const withAuthor =
    authorName && intl.formatMessage({ id: 'EventCard.withAuthor' }, { authorName });
  const photoLabel = category
    ? intl.formatMessage({ id: 'EventCard.photoPlaceholder' }, { category })
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
        {category ? <span className={css.badge}>{category}</span> : null}
      </div>
      <div className={css.info}>
        <div className={css.titleRow}>
          <div className={css.title}>{title}</div>
          {rating != null ? (
            <div className={css.rating}>
              <RatingStarIcon />
              <span>{Number.isFinite(Number(rating)) ? Number(rating).toFixed(1) : rating}</span>
            </div>
          ) : null}
        </div>
        {dateLabel || locationLabel ? (
          <div className={css.meta}>
            {dateLabel ? <span>{dateLabel}</span> : null}
            {dateLabel && locationLabel ? <span className={css.metaDot}>·</span> : null}
            {locationLabel ? <span>{locationLabel}</span> : null}
          </div>
        ) : null}
        {withAuthor || reviewsLabel ? (
          <div className={css.meta}>
            {withAuthor ? <span>{withAuthor}</span> : null}
            {withAuthor && reviewsLabel ? <span className={css.metaDot}>·</span> : null}
            {reviewsLabel ? <span>{reviewsLabel}</span> : null}
          </div>
        ) : null}
      </div>
    </NamedLink>
  );
};

export default EventCard;
