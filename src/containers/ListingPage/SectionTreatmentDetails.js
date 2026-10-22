import React, { useState } from 'react';
import classNames from 'classnames';

// Utils
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { hasFormattedContent } from '../../util/formattedText';
import {
  ABOUT_TREATMENT,
  GOOD_TO_KNOW,
  TREATMENT_APPROACH,
  TREATMENT_SUPPORTS,
  getTreatmentPackages,
  getTreatmentText,
  isTreatmentListingType,
} from '../../util/treatmentDetails';

// Shared components
import { FormattedText, Heading, IconArrowHead } from '../../components';

import css from './ListingPage.module.css';

// A formatted text with its heading, nothing without text
const TextSection = props => {
  const { publicData, textField, intl } = props;
  const text = getTreatmentText(publicData, textField.key, intl);
  if (!hasFormattedContent(text)) {
    return null;
  }
  return (
    <section className={css.sectionTreatmentText}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id={`ListingPage.${textField.messageKey}`} />
      </Heading>
      {textField.isPlainText ? (
        <p className={css.treatmentPlainText}>{text}</p>
      ) : (
        <FormattedText text={text} />
      )}
    </section>
  );
};

// E.g. "145 €", or "145,50 €" when there are cents
const formatPrice = (intl, priceInSubunits, currency) => {
  const hasCents = priceInSubunits % 100 !== 0;
  return intl.formatNumber(priceInSubunits / 100, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

// One treatment: name, duration and price; the description opens with a click
const TreatmentPackage = props => {
  const { treatment, id, isOpen, onToggle, currency, intl } = props;
  const { name, description, bookingLengthInMinutes, priceInSubunits } = treatment;
  const hasDescription = !!description?.trim();
  const duration = bookingLengthInMinutes
    ? intl.formatMessage(
        { id: 'ListingPage.treatmentPackage.duration' },
        { minutes: bookingLengthInMinutes }
      )
    : null;
  const price = currency ? formatPrice(intl, priceInSubunits, currency) : null;
  const meta = [duration, price].filter(Boolean).join(' · ');
  const panelId = `${id}-description`;

  const header = (
    <>
      <span className={css.treatmentHeaderText}>
        <span className={css.treatmentName}>{name}</span>
        {meta ? <span className={css.treatmentMeta}>{meta}</span> : null}
      </span>
      {hasDescription ? (
        <IconArrowHead
          direction={isOpen ? 'up' : 'down'}
          size="small"
          rootClassName={css.treatmentArrow}
        />
      ) : null}
    </>
  );

  return (
    <li className={css.treatment}>
      {hasDescription ? (
        <button
          type="button"
          className={classNames(css.treatmentHeader, css.treatmentToggle)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          {header}
        </button>
      ) : (
        <div className={css.treatmentHeader}>{header}</div>
      )}
      {hasDescription ? (
        <div id={panelId} className={css.treatmentDescription} hidden={!isOpen}>
          {description}
        </div>
      ) : null}
    </li>
  );
};

// The treatments (price variants) as a list of dropdowns: the first one open
const TreatmentPackages = props => {
  const { publicData, currency, intl } = props;
  const treatments = getTreatmentPackages(publicData, intl);
  const [openIndexes, setOpenIndexes] = useState([0]);
  if (treatments.length === 0) {
    return null;
  }

  const toggle = index =>
    setOpenIndexes(current =>
      current.includes(index) ? current.filter(i => i !== index) : [...current, index]
    );

  return (
    <section className={css.sectionTreatmentPackages}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.treatmentPackagesTitle" />
      </Heading>
      <ul className={css.treatments}>
        {treatments.map((treatment, i) => (
          <TreatmentPackage
            key={`${treatment.name}-${i}`}
            id={`treatment-${i}`}
            treatment={treatment}
            isOpen={openIndexes.includes(i)}
            onToggle={() => toggle(i)}
            currency={currency}
            intl={intl}
          />
        ))}
      </ul>
    </section>
  );
};

/**
 * Details of treatment listings (Studio and Mobile Service, see util/treatmentDetails.js), in the
 * visitor's language: about this treatment, treatment approach, what this treatment supports,
 * the treatments with their descriptions, durations and prices, and good to know. Sections
 * without content are left out; nothing for other listing types.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData Public data of the listing
 * @param {string} [props.currency] Currency of the listing's price
 * @param {string} [props.className] Add more style rules in addition to the root class
 * @returns {JSX.Element|null}
 */
const SectionTreatmentDetails = props => {
  const { publicData, currency, className } = props;
  const intl = useIntl();
  if (!isTreatmentListingType(publicData?.listingType)) {
    return null;
  }

  return (
    <div className={classNames(css.treatmentDetails, className)}>
      <TextSection publicData={publicData} textField={ABOUT_TREATMENT} intl={intl} />
      <TextSection publicData={publicData} textField={TREATMENT_APPROACH} intl={intl} />
      <TextSection publicData={publicData} textField={TREATMENT_SUPPORTS} intl={intl} />
      <TreatmentPackages publicData={publicData} currency={currency} intl={intl} />
      <TextSection publicData={publicData} textField={GOOD_TO_KNOW} intl={intl} />
    </div>
  );
};

export default SectionTreatmentDetails;
