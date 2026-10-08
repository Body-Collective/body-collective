import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../../util/reactIntl';

import { useRegionArea } from '../../RegionAreaContext';

import css from './RegionAreaPills.module.css';

/**
 * The areas of a region page (neighbourhoods, islands...) as a row of pills. The first one is the
 * whole region. Choosing a pill filters the listing sections of the page by that area.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @returns {JSX.Element|null} list of pills, or null when the page has no areas
 */
const RegionAreaPills = props => {
  const { className } = props;
  const intl = useIntl();
  const regionArea = useRegionArea();

  if (!regionArea) {
    return null;
  }

  const { areas, areaLabel, selectedArea, selectArea } = regionArea;

  return (
    <ul
      className={classNames(css.root, className)}
      aria-label={intl.formatMessage({ id: 'RegionAreaPills.ariaLabel' }, { label: areaLabel })}
    >
      {areas.map(area => {
        const isActive = selectedArea ? selectedArea.slug === area.slug : area.isDefault;
        return (
          <li key={area.slug} className={css.item}>
            <button
              type="button"
              className={classNames(css.pill, { [css.active]: isActive })}
              aria-pressed={isActive}
              onClick={() => selectArea(area)}
            >
              {area.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default RegionAreaPills;
