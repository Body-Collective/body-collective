import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { AREA_PARAM, getRegionAreas, getSelectedArea } from '../../util/regionAreas';

const RegionAreaContext = createContext(null);

/**
 * Shares the neighbourhoods of a region page (e.g. /p/berlin) with its sections: the hero search,
 * the neighbourhood pills and the listing sections. The neighbourhoods are the blocks of the
 * "region-areas" section (see util/regionAreas.js). The selected one is kept in the URL (?area=)
 * so that the page can be shared.
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.sections sections of the page asset
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
export const RegionAreaProvider = props => {
  const { sections, children } = props;
  const history = useHistory();
  const { pathname, search, hash } = useLocation();

  const areas = useMemo(() => getRegionAreas(sections), [sections]);
  const selectedArea = getSelectedArea(areas, search);

  const selectArea = useCallback(
    area => {
      const params = new URLSearchParams(search);
      if (!area || area.isDefault) {
        params.delete(AREA_PARAM);
      } else {
        params.set(AREA_PARAM, area.slug);
      }
      const nextSearch = params.toString();
      // The page stays where it is: the location is replaced, not pushed, and the data of the
      // page is not loaded again (see inPageNavigation in routing/Routes.js)
      history.replace({
        pathname,
        search: nextSearch ? `?${nextSearch}` : '',
        hash,
        state: { inPageNavigation: true },
      });
    },
    [history, pathname, search, hash]
  );

  const value = useMemo(() => (areas.length > 0 ? { areas, selectedArea, selectArea } : null), [
    areas,
    selectedArea,
    selectArea,
  ]);

  return <RegionAreaContext.Provider value={value}>{children}</RegionAreaContext.Provider>;
};

/**
 * The neighbourhoods of the current page, or null when it isn't a region page.
 *
 * @returns {{areas: Array<Object>, selectedArea: Object|null, selectArea: Function}|null}
 */
export const useRegionArea = () => useContext(RegionAreaContext);
