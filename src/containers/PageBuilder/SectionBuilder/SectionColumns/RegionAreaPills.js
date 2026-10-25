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
  // Islands with their own areas (e.g. Mallorca) show them in a second row once chosen
  const mainAreas = areas.filter(area => !area.parentSlug);
  const activeMainSlug = selectedArea?.parentSlug || selectedArea?.slug || null;
  const activeMainArea = mainAreas.find(area => area.slug === activeMainSlug) || null;
  const subAreas = activeMainSlug ? areas.filter(area => area.parentSlug === activeMainSlug) : [];

  return (
    <div className={classNames(css.root, className)}>
      <ul
        className={css.list}
        aria-label={intl.formatMessage({ id: 'RegionAreaPills.ariaLabel' }, { label: areaLabel })}
      >
        {mainAreas.map(area => {
          const isActive = activeMainSlug ? activeMainSlug === area.slug : area.isDefault;
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
      {subAreas.length > 0 && activeMainArea ? (
        <ul
          className={css.subList}
          aria-label={intl.formatMessage(
            { id: 'RegionAreaPills.subAreasAriaLabel' },
            { area: activeMainArea.name }
          )}
        >
          {[activeMainArea, ...subAreas].map(area => {
            const isActive = selectedArea?.slug === area.slug;
            return (
              <li key={area.slug} className={css.item}>
                <button
                  type="button"
                  className={classNames(css.subPill, { [css.active]: isActive })}
                  aria-pressed={isActive}
                  onClick={() => selectArea(area)}
                >
                  {area.parentSlug
                    ? area.name
                    : intl.formatMessage(
                        { id: 'RegionAreaPills.allOfArea' },
                        { area: activeMainArea.name }
                      )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default RegionAreaPills;
