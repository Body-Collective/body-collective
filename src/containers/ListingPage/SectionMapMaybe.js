import React, { Component } from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import classNames from 'classnames';
import { propTypes } from '../../util/types';
import { obfuscatedCoordinates } from '../../util/maps';
import { Heading, Map } from '../../components';

import css from './ListingPage.module.css';

/**
 * The SectionMapMaybe component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.latlng} [props.geolocation] - The geolocation
 * @param {propTypes.uuid} props.listingId - The listing id
 * @param {string} [props.directions] - Directions to the place in the visitor's language
 * @param {string} [props.neighbourhood] - Name of the listing's neighbourhood or island
 * @param {string} [props.serviceArea] - Mobile booking: the area served, e.g. "Berlin · Kreuzberg".
 *   Shown instead of the address, with a note that the therapist comes to the client
 * @returns {JSX.Element} section map maybe component
 */
class SectionMapMaybe extends Component {
  constructor(props) {
    super(props);
    this.state = { isStatic: true };
  }

  render() {
    const {
      className,
      rootClassName,
      geolocation,
      publicData,
      listingId,
      mapsConfig,
      directions,
      neighbourhood,
      serviceArea,
    } = this.props;

    if (!geolocation) {
      return null;
    }

    const address = publicData && publicData.location ? publicData.location.address : '';
    const building = publicData?.location?.building || '';
    // Mapbox addresses: "Liebenwalder Straße 33, 13347 Berlin, Deutschland". Shown as the street,
    // then the postcode and city with the neighbourhood ("13347 Berlin · Wedding"), without the
    // country
    const addressParts = address
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
    const [street, ...placeParts] =
      addressParts.length > 2 ? addressParts.slice(0, -1) : addressParts;
    const place = [placeParts.join(', '), neighbourhood].filter(Boolean).join(' · ');
    const classes = classNames(rootClassName || css.sectionMap, className);
    const cacheKey = listingId ? `${listingId.uuid}_${geolocation.lat}_${geolocation.lng}` : null;

    const mapProps = mapsConfig.fuzzy.enabled
      ? { obfuscatedCenter: obfuscatedCoordinates(geolocation, mapsConfig.fuzzy.offset, cacheKey) }
      : { address, center: geolocation };
    const map = <Map {...mapProps} useStaticMap={this.state.isStatic} />;

    return (
      <section className={classes} id="listing-location">
        <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
          <FormattedMessage id="ListingPage.locationTitle" />
        </Heading>
        {serviceArea ? (
          <div className={css.locationAddress}>
            <p className={css.locationAddressLine}>{serviceArea}</p>
            <p className={css.locationDirections}>
              <FormattedMessage id="ListingPage.mobileServiceArea" />
            </p>
          </div>
        ) : address ? (
          <div className={css.locationAddress}>
            <p className={css.locationAddressLine}>{street}</p>
            {building ? <p className={css.locationAddressLine}>{building}</p> : null}
            {place ? <p className={css.locationAddressLine}>{place}</p> : null}
            {directions ? <p className={css.locationDirections}>{directions}</p> : null}
          </div>
        ) : null}
        {this.state.isStatic ? (
          <button
            className={css.map}
            onClick={() => {
              this.setState({ isStatic: false });
            }}
          >
            {map}
          </button>
        ) : (
          <div className={css.map}>{map}</div>
        )}
      </section>
    );
  }
}

export default SectionMapMaybe;
