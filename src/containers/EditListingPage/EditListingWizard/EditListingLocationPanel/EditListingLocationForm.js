import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { propTypes } from '../../../../util/types';
import {
  autocompleteSearchRequired,
  autocompletePlaceSelected,
  composeValidators,
} from '../../../../util/validators';
import {
  AREA_KEY,
  NEIGHBOURHOOD_KEY,
  NEIGHBOURHOOD_LISTING_TYPES,
  getIslandAreas,
  getNeighbourhoodOptions,
  getRegionOfOrigin,
} from '../../../../util/neighbourhoods';
import { isMobileBookingListingType } from '../../../../util/mobileBookingQuestions';

// Import shared components
import {
  Form,
  FieldLocationAutocompleteInput,
  Button,
  FieldSelect,
  FieldTextInput,
} from '../../../../components';

// Import modules from this directory
import css from './EditListingLocationForm.module.css';

const identity = v => v;

// Directions to the place, e.g. doorbell, backyard, floor
const DIRECTIONS_MAX_LENGTH = 500;

// The neighbourhood is one of the options of the address's region (see util/neighbourhoods.js)
const neighbourhoodValidator = (options, requiredMessage) => value =>
  value && options.includes(value) ? undefined : requiredMessage;

/**
 * The EditListingLocationForm component.
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId - The form id
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {boolean} props.autoFocus - Whether the form is auto focused
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {boolean} props.updated - Whether the form is updated
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {Object} props.fetchErrors - The fetch errors object
 * @param {string} props.saveActionMsg - The save action message
 * @param {Function} props.onSubmit - The submit function
 * @param {Object} props.errors - The errors object
 * @param {propTypes.error} props.errors.showListingsError - The show listings error
 * @param {propTypes.error} props.errors.updateListingError - The update listing error
 * @returns {JSX.Element}
 */
export const EditListingLocationForm = props => (
  <FinalForm
    {...props}
    render={formRenderProps => {
      const {
        formId = 'EditListingLocationForm',
        autoFocus,
        className,
        rootClassName,
        disabled,
        ready,
        handleSubmit,
        invalid,
        pristine,
        saveActionMsg,
        updated,
        updateInProgress = false,
        fetchErrors,
        values,
        listingType,
      } = formRenderProps;

      const intl = useIntl();
      const addressOrigin = values.location?.selectedPlace?.origin;
      const neighbourhoodOptions = getNeighbourhoodOptions(addressOrigin);
      // Treatment listings (see util/neighbourhoods.js)
      const hasNeighbourhood = NEIGHBOURHOOD_LISTING_TYPES.includes(listingType);
      // Mobile booking: the therapist comes to the client, so no address, building or directions
      const isMobileBooking = isMobileBookingListingType(listingType);
      // Chosen among the neighbourhoods of the address's region; none outside the regions
      const showNeighbourhood = hasNeighbourhood && !!getRegionOfOrigin(addressOrigin);
      // Islands with areas (e.g. Mallorca): the area, for the filters of the region page
      const selectedNeighbourhood = values[NEIGHBOURHOOD_KEY];
      const islandAreas = getIslandAreas(selectedNeighbourhood);
      // "Neighbourhood" in Berlin, "Island" on the Balearic Islands
      const region = getRegionOfOrigin(addressOrigin);
      const neighbourhoodMessageId = key =>
        `EditListingLocationForm.neighbourhood${key}.${region?.id || 'any'}`;
      const addressRequiredMessage = intl.formatMessage({
        id: 'EditListingLocationForm.addressRequired',
      });
      const addressNotRecognizedMessage = intl.formatMessage({
        id: 'EditListingLocationForm.addressNotRecognized',
      });

      const optionalText = intl.formatMessage({
        id: 'EditListingLocationForm.optionalText',
      });

      const { updateListingError, showListingsError } = fetchErrors || {};

      const classes = classNames(rootClassName || css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          {updateListingError ? (
            <p className={css.error}>
              <FormattedMessage id="EditListingLocationForm.updateFailed" />
            </p>
          ) : null}

          {showListingsError ? (
            <p className={css.error}>
              <FormattedMessage id="EditListingLocationForm.showListingFailed" />
            </p>
          ) : null}

          <FieldLocationAutocompleteInput
            rootClassName={css.locationAddress}
            inputClassName={css.locationAutocompleteInput}
            iconClassName={css.locationAutocompleteInputIcon}
            predictionsClassName={css.predictionsRoot}
            validClassName={css.validLocation}
            autoFocus={autoFocus}
            name="location"
            id={`${formId}.location`}
            // As detailed as Mapbox can: street and house number, or a named place. Mobile
            // booking: the area where treatments are offered (a town or district is enough)
            preferDetailedAddresses={!isMobileBooking}
            label={intl.formatMessage({
              id: isMobileBooking
                ? 'EditListingLocationForm.serviceArea'
                : 'EditListingLocationForm.address',
            })}
            placeholder={intl.formatMessage({
              id: isMobileBooking
                ? 'EditListingLocationForm.serviceAreaPlaceholder'
                : 'EditListingLocationForm.addressPlaceholder',
            })}
            useDefaultPredictions={false}
            format={identity}
            valueFromForm={values.location}
            validate={composeValidators(
              autocompleteSearchRequired(addressRequiredMessage),
              autocompletePlaceSelected(addressNotRecognizedMessage)
            )}
          />

          {isMobileBooking ? (
            <p className={css.serviceAreaHelp}>
              {intl.formatMessage({ id: 'EditListingLocationForm.serviceAreaHelpText' })}
            </p>
          ) : (
            <FieldTextInput
              className={css.building}
              type="text"
              name="building"
              id={`${formId}building`}
              label={intl.formatMessage(
                { id: 'EditListingLocationForm.building' },
                { optionalText }
              )}
              placeholder={intl.formatMessage({
                id: 'EditListingLocationForm.buildingPlaceholder',
              })}
            />
          )}

          {showNeighbourhood ? (
            <FieldSelect
              // Options change with the region of the address
              key={neighbourhoodOptions.join()}
              className={css.building}
              name={NEIGHBOURHOOD_KEY}
              id={`${formId}${NEIGHBOURHOOD_KEY}`}
              label={intl.formatMessage({ id: neighbourhoodMessageId('') })}
              validate={neighbourhoodValidator(
                neighbourhoodOptions,
                intl.formatMessage({ id: neighbourhoodMessageId('Required') })
              )}
            >
              <option disabled value="">
                {intl.formatMessage({ id: neighbourhoodMessageId('Placeholder') })}
              </option>
              {neighbourhoodOptions.map(o => (
                <option key={o} value={o}>
                  {intl.formatMessage({ id: `Neighbourhood.${o}` })}
                </option>
              ))}
            </FieldSelect>
          ) : null}

          {showNeighbourhood && islandAreas.length > 0 ? (
            <FieldSelect
              key={islandAreas.join()}
              className={css.building}
              name={AREA_KEY}
              id={`${formId}${AREA_KEY}`}
              label={intl.formatMessage(
                { id: 'EditListingLocationForm.area' },
                { island: intl.formatMessage({ id: `Neighbourhood.${selectedNeighbourhood}` }) }
              )}
              validate={neighbourhoodValidator(
                islandAreas,
                intl.formatMessage({ id: 'EditListingLocationForm.areaRequired' })
              )}
            >
              <option disabled value="">
                {intl.formatMessage({ id: 'EditListingLocationForm.areaPlaceholder' })}
              </option>
              {islandAreas.map(o => (
                <option key={o} value={o}>
                  {intl.formatMessage({ id: `NeighbourhoodArea.${o}` })}
                </option>
              ))}
            </FieldSelect>
          ) : null}

          {isMobileBooking ? null : (
            <FieldTextInput
              className={css.building}
              type="textarea"
              name="directions"
              id={`${formId}directions`}
              label={intl.formatMessage(
                { id: 'EditListingLocationForm.directions' },
                { optionalText }
              )}
              placeholder={intl.formatMessage({
                id: 'EditListingLocationForm.directionsPlaceholder',
              })}
              helpText={intl.formatMessage({ id: 'EditListingLocationForm.directionsHelpText' })}
              maxLength={DIRECTIONS_MAX_LENGTH}
            />
          )}

          <Button
            className={css.submitButton}
            type="submit"
            inProgress={submitInProgress}
            disabled={submitDisabled}
            ready={submitReady}
          >
            {saveActionMsg}
          </Button>
        </Form>
      );
    }}
  />
);

export default EditListingLocationForm;
