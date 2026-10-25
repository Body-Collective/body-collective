import React, { useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { LISTING_STATE_DRAFT } from '../../../../util/types';
import {
  AREA_KEY,
  NEIGHBOURHOOD_KEY,
  getIslandAreas,
  getRegionOfOrigin,
} from '../../../../util/neighbourhoods';
import { isMobileBookingListingType } from '../../../../util/mobileBookingQuestions';

// Import shared components
import { H3, ListingLink } from '../../../../components';

// Import modules from this directory
import EditListingLocationForm from './EditListingLocationForm';
import css from './EditListingLocationPanel.module.css';

const getInitialValues = props => {
  const { listing } = props;
  const { geolocation, publicData } = listing?.attributes || {};

  // Only render current search if full place object is available in the URL params
  // TODO bounds are missing - those need to be queried directly from Google Places
  const locationFieldsPresent = publicData?.location?.address && geolocation;
  const location = publicData?.location || {};
  const { address, building, directions } = location;

  return {
    building,
    directions,
    [NEIGHBOURHOOD_KEY]: publicData?.[NEIGHBOURHOOD_KEY] || '',
    [AREA_KEY]: publicData?.[AREA_KEY] || '',
    location: locationFieldsPresent
      ? {
          search: address,
          selectedPlace: { address, origin: geolocation },
        }
      : null,
  };
};

/**
 * The EditListingLocationPanel component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing object
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.submitButtonText - The submit button text
 * @param {boolean} props.panelUpdated - Whether the panel is updated
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {Object} props.errors - The errors object
 * @returns {JSX.Element}
 */
const EditListingLocationPanel = props => {
  // State is needed since LocationAutocompleteInput doesn't have internal state
  // and therefore re-rendering would overwrite the values during XHR call.
  const [state, setState] = useState({ initialValues: getInitialValues(props) });
  const {
    className,
    rootClassName,
    listing,
    disabled,
    ready,
    onSubmit,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
    updatePageTitle: UpdatePageTitle,
    intl,
    asPickupLocation = false,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const isPublished = listing?.id && listing?.attributes.state !== LISTING_STATE_DRAFT;

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingLocationPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingLocationPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage(
          { id: panelHeadingProps.id },
          { ...panelHeadingProps.messageProps }
        )}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>
      <EditListingLocationForm
        className={css.form}
        initialValues={state.initialValues}
        listingType={listing?.attributes?.publicData?.listingType}
        onSubmit={values => {
          // Mobile booking: the location is the area served, without building or directions
          const isMobileBooking = isMobileBookingListingType(
            listing?.attributes?.publicData?.listingType
          );
          const { location } = values;
          const building = isMobileBooking ? '' : values.building || '';
          const directions = isMobileBooking ? '' : values.directions || '';
          // Only for an address in a region (see util/neighbourhoods.js)
          const neighbourhood = getRegionOfOrigin(location.selectedPlace.origin)
            ? values[NEIGHBOURHOOD_KEY] || null
            : null;
          const area = getIslandAreas(neighbourhood).includes(values[AREA_KEY])
            ? values[AREA_KEY]
            : null;
          // Directions to the place (doorbell, backyard, floor), shown with the address
          const cleanDirections = directions.trim();
          const {
            selectedPlace: { address, origin },
          } = location;

          // New values for listing attributes
          const updateValues = {
            geolocation: origin,
            publicData: {
              // Seminars & Events (purchase process): the address is the pickup location
              ...(asPickupLocation ? { pickupEnabled: true, shippingEnabled: false } : {}),
              location: { address, building, directions: cleanDirections },
              // Enum listing field, a search filter (see util/neighbourhoods.js)
              [NEIGHBOURHOOD_KEY]: neighbourhood,
              // The area of an island with areas (e.g. Mallorca), for the region page filters
              [AREA_KEY]: area,
            },
          };
          // Save the initialValues to state
          // LocationAutocompleteInput doesn't have internal state
          // and therefore re-rendering would overwrite the values during XHR call.
          setState({
            initialValues: {
              building,
              directions: cleanDirections,
              [NEIGHBOURHOOD_KEY]: neighbourhood || '',
              [AREA_KEY]: area || '',
              location: { search: address, selectedPlace: { address, origin } },
            },
          });
          onSubmit(updateValues);
        }}
        saveActionMsg={submitButtonText}
        disabled={disabled}
        ready={ready}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        fetchErrors={errors}
        autoFocus
      />
    </main>
  );
};

export default EditListingLocationPanel;
