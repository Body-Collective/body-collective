import React from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { REVIEW_TYPE_OF_PROVIDER } from '../../util/types';
import {
  ONGOING,
  getPractitionerProfile,
  getVisibleLocations,
} from '../../util/practitionerProfile';
import { getSubscription } from '../../util/subscription';
import { SEMINAR_LISTING_TYPE } from '../../util/seminarSchedule';
import {
  getProfileBio,
  getProfileTranslation,
  localizePractitionerProfile,
} from '../../util/localizedContent';

import { AvatarLarge, ListingCard, NamedLink, Reviews } from '../../components';

import EventCard from '../PageBuilder/SectionBuilder/SectionListings/EventCard';

import css from './PractitionerProfile.module.css';

const CARD_ASPECT_WIDTH = 2;
const CARD_ASPECT_HEIGHT = 3;
const CARD_IMAGE_SIZES = '(max-width: 767px) 100vw, (max-width: 1100px) 33vw, 340px';

const IconPin = () => (
  <svg className={css.metaIcon} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
);

const IconGlobe = () => (
  <svg className={css.metaIcon} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5z" />
  </svg>
);

// Paragraphs of the bio: separated by empty lines, line breaks kept
const Paragraphs = ({ text, className }) =>
  text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map((p, i) => (
      <p key={i} className={className}>
        {p}
      </p>
    ));

// Rows of trainings: year (or "ongoing"), training and teacher or school
const TrainingList = ({ titleId, rows, intl }) =>
  rows.length > 0 ? (
    <section className={css.column}>
      <h2 className={css.columnTitle}>
        <FormattedMessage id={titleId} />
      </h2>
      <ul className={css.list}>
        {rows.map((row, i) => (
          <li key={i} className={css.trainingRow}>
            <span className={css.trainingYear}>
              {row.year && row.year.toLowerCase() === ONGOING
                ? intl.formatMessage({ id: 'PractitionerProfile.ongoing' })
                : row.year}
            </span>
            <span className={css.trainingText}>
              <span className={css.trainingTitle}>{row.title}</span>
              {row.teacher ? <span className={css.trainingTeacher}>{row.teacher}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

// e.g. "Berlin", "Berlin & Mallorca", "Berlin, Mallorca & Ibiza"
const joinWithAnd = items =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}` : items[0];

const FactRow = ({ labelId, value }) =>
  value ? (
    <li className={css.factRow}>
      <span className={css.factLabel}>
        <FormattedMessage id={labelId} />
      </span>
      <span className={css.factValue}>{value}</span>
    </li>
  ) : null;

/**
 * Profile page of a practitioner: header, quote, bio, experience and trainings, their treatments
 * and seminars (rows shown only with listings), and the reviews they have received. The data is
 * edited in Profile settings, see util/practitionerProfile.js. Customers have the default profile.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.user User entity of the practitioner
 * @param {Array<Object>} props.listings Their published listings
 * @param {Array<Object>} props.reviews Reviews about them
 * @param {boolean} props.showLinkToProfileSettingsPage Own profile: link to edit it
 * @returns {JSX.Element}
 */
const PractitionerProfile = props => {
  const intl = useIntl();
  const { user, listings = [], reviews = [], showLinkToProfileSettingsPage } = props;
  const userProfile = user?.attributes?.profile || {};
  const { displayName, publicData } = userProfile;
  // Texts in the visitor's language (see util/localizedContent.js)
  const bio = getProfileBio(userProfile, intl);
  const profile = localizePractitionerProfile(
    getPractitionerProfile(publicData),
    getProfileTranslation(userProfile, intl)
  );
  const {
    professionalTitle,
    locations,
    languagesSpoken,
    quote,
    quoteAuthor,
    experience,
    training,
    furtherTraining,
  } = profile;

  const label = (prefix, key) => intl.formatMessage({ id: `PractitionerProfile.${prefix}.${key}` });
  // As many locations as the practitioner's plan shows (typed by them, not translated)
  const locationLabels = getVisibleLocations(locations, getSubscription(user).plan);
  const languageLabels = languagesSpoken.map(key => label('language', key));

  const seminars = listings.filter(
    l => l.attributes?.publicData?.listingType === SEMINAR_LISTING_TYPE
  );
  const treatments = listings.filter(
    l => l.attributes?.publicData?.listingType !== SEMINAR_LISTING_TYPE
  );
  const offers = [
    treatments.length > 0 ? intl.formatMessage({ id: 'PractitionerProfile.offerSessions' }) : null,
    seminars.length > 0 ? intl.formatMessage({ id: 'PractitionerProfile.offerSeminars' }) : null,
  ].filter(Boolean);

  const receivedReviews = reviews.filter(r => r.attributes?.type === REVIEW_TYPE_OF_PROVIDER);
  const hasFacts =
    experience.length > 0 ||
    languageLabels.length > 0 ||
    locationLabels.length > 0 ||
    offers.length > 0;
  const hasTrainings = training.length > 0 || furtherTraining.length > 0;

  return (
    <div className={css.root}>
      <div className={css.content}>
        <header className={css.header}>
          <AvatarLarge className={css.avatar} user={user} disableProfileLink />
          <div className={css.headerText}>
            <p className={css.professionalTitle}>
              {professionalTitle || intl.formatMessage({ id: 'PractitionerProfile.defaultTitle' })}
            </p>
            <h1 className={css.name}>{displayName}</h1>
            {locationLabels.length > 0 || languageLabels.length > 0 ? (
              <p className={css.meta}>
                {locationLabels.length > 0 ? (
                  <span className={css.metaItem}>
                    <IconPin />
                    {joinWithAnd(locationLabels)}
                  </span>
                ) : null}
                {languageLabels.length > 0 ? (
                  <span className={css.metaItem}>
                    <IconGlobe />
                    {languageLabels.join(', ')}
                  </span>
                ) : null}
              </p>
            ) : null}
            {showLinkToProfileSettingsPage ? (
              <NamedLink className={css.editLink} name="ProfileSettingsPage">
                <FormattedMessage id="PractitionerProfile.editProfile" />
              </NamedLink>
            ) : null}
          </div>
        </header>

        {quote ? (
          <blockquote className={css.quote}>
            <p className={css.quoteText}>“{quote}”</p>
            {quoteAuthor ? <footer className={css.quoteAuthor}>{quoteAuthor}</footer> : null}
          </blockquote>
        ) : null}

        {bio ? (
          <div className={css.bio}>
            <Paragraphs text={bio} className={css.bioParagraph} />
          </div>
        ) : null}

        {hasFacts || hasTrainings ? (
          <div className={css.columns}>
            {hasFacts ? (
              <section className={css.column}>
                {experience.length > 0 ? (
                  <>
                    <h2 className={css.columnTitle}>
                      <FormattedMessage id="PractitionerProfile.experienceHeading" />
                    </h2>
                    <ul className={css.list}>
                      {experience.map((line, i) => (
                        <li key={i} className={css.experienceRow}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <ul className={css.list}>
                  <FactRow
                    labelId="PractitionerProfile.languages"
                    value={languageLabels.join(', ')}
                  />
                  <FactRow
                    labelId="PractitionerProfile.locations"
                    value={locationLabels.join(' · ')}
                  />
                  <FactRow labelId="PractitionerProfile.offers" value={offers.join(' · ')} />
                </ul>
              </section>
            ) : null}
            {hasTrainings ? (
              <div className={css.trainings}>
                <TrainingList
                  titleId="PractitionerProfile.trainingHeading"
                  rows={training}
                  intl={intl}
                />
                <TrainingList
                  titleId="PractitionerProfile.furtherTrainingHeading"
                  rows={furtherTraining}
                  intl={intl}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {treatments.length > 0 ? (
        <section className={css.listingsSection}>
          <div className={css.content}>
            <h2 className={css.sectionTitle}>
              <FormattedMessage id="PractitionerProfile.treatmentsHeading" />
            </h2>
            <ul className={css.grid}>
              {treatments.map(listing => (
                <li key={listing.id.uuid}>
                  <ListingCard
                    listing={listing}
                    renderSizes={CARD_IMAGE_SIZES}
                    aspectWidth={CARD_ASPECT_WIDTH}
                    aspectHeight={CARD_ASPECT_HEIGHT}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {seminars.length > 0 ? (
        <section className={css.listingsSection}>
          <div className={css.content}>
            <h2 className={css.sectionTitle}>
              <FormattedMessage id="PractitionerProfile.seminarsHeading" />
            </h2>
            <ul className={css.grid}>
              {seminars.map(listing => (
                <li key={listing.id.uuid}>
                  <EventCard
                    listing={listing}
                    renderSizes={CARD_IMAGE_SIZES}
                    aspectWidth={CARD_ASPECT_WIDTH}
                    aspectHeight={CARD_ASPECT_HEIGHT}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {receivedReviews.length > 0 ? (
        <section className={css.reviewsSection}>
          <div className={css.content}>
            <h2 className={css.sectionTitle}>
              <FormattedMessage
                id="PractitionerProfile.reviewsHeading"
                values={{ count: receivedReviews.length }}
              />
            </h2>
            <Reviews reviews={receivedReviews} />
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default PractitionerProfile;
