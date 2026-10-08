import React, { useState } from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import { IconLocation, OutsideClickHandler } from '../../../../../components';

import { useRegionArea } from '../../../RegionAreaContext';

import css from './FilterNeighbourhood.module.css';

const LISTBOX_ID = 'neighbourhood-listbox';

const NeighbourhoodDropdown = props => {
  const { input, areas, areaLabel, className, rootClassName, alignLeft } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // The first neighbourhood is the whole region, which is what an empty field searches for
  const selectedArea = areas.find(area => !area.isDefault && area.slug === input.value) || null;
  const isSelected = area => (selectedArea ? selectedArea.slug === area.slug : area.isDefault);

  const toggle = () => {
    setIsOpen(open => !open);
    setActiveIndex(-1);
  };

  const choose = area => {
    input.onChange(area.isDefault ? '' : area.slug);
    setIsOpen(false);
  };

  const onKeyDown = e => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(index => Math.min(index + 1, areas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (areas[activeIndex]) {
        choose(areas[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const placeholder = areaLabel;
  const classes = classNames(rootClassName || css.root, className);

  return (
    <OutsideClickHandler className={classes} onOutsideClick={() => setIsOpen(false)}>
      <div className={css.dropdownContainer}>
        <div
          role="combobox"
          aria-label={placeholder}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={LISTBOX_ID}
          tabIndex={0}
          className={classNames(css.toggleButton, { [css.unselected]: !selectedArea })}
          onClick={toggle}
          onKeyDown={onKeyDown}
        >
          <IconLocation rootClassName={css.icon} />
          <span className={css.label}>{selectedArea ? selectedArea.name : placeholder}</span>
        </div>

        {isOpen ? (
          <ul
            className={classNames(css.dropdownContent, { [css.alignLeft]: alignLeft })}
            role="listbox"
            id={LISTBOX_ID}
          >
            {areas.map((area, index) => (
              <li
                key={area.slug}
                className={classNames(css.option, {
                  [css.selectedOption]: isSelected(area),
                  [css.activeOption]: index === activeIndex,
                })}
                role="option"
                aria-selected={isSelected(area)}
                onClick={() => choose(area)}
              >
                {area.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </OutsideClickHandler>
  );
};

/**
 * Search field of a region page hero (e.g. /p/berlin) that replaces the location field. It lists
 * the areas of the page (neighbourhoods, islands...), and is named after them. Like the other
 * fields of the hero search, it only takes part in the search that opens the search page: it
 * doesn't filter the listings of the region page itself (the pills do that).
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {boolean?} props.alignLeft align the list of neighbourhoods to the left edge of the field
 * @returns {JSX.Element|null} the field, or null when the page has no areas
 */
const FilterNeighbourhood = props => {
  const regionArea = useRegionArea();

  if (!regionArea) {
    return null;
  }

  return (
    <Field
      name="neighbourhood"
      component={NeighbourhoodDropdown}
      areas={regionArea.areas}
      areaLabel={regionArea.areaLabel}
      {...props}
    />
  );
};

export default FilterNeighbourhood;
