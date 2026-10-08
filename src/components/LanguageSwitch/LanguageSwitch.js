import React from 'react';
import classNames from 'classnames';

import { LANGUAGE_NAMES } from '../../util/language';

import css from './LanguageSwitch.module.css';

/**
 * Buttons for choosing the language of the app: "DE / EN".
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.language the language in use
 * @param {Array<string>} props.languages the languages to choose from, e.g. ['en', 'de']
 * @param {Function} props.onChange called with the language that has been chosen
 * @param {string} props.ariaLabel name of the group of buttons, e.g. "Language"
 * @returns {JSX.Element}
 */
const LanguageSwitch = props => {
  const { rootClassName, className, language, languages = [], onChange, ariaLabel } = props;
  const classes = classNames(rootClassName || css.root, className);

  return (
    <div className={classes} role="group" aria-label={ariaLabel}>
      {[...languages].sort().map((code, index) => {
        const isActive = code === language;
        return (
          <React.Fragment key={code}>
            {index > 0 ? (
              <span className={css.divider} aria-hidden="true">
                /
              </span>
            ) : null}
            <button
              type="button"
              lang={code}
              className={classNames(css.language, { [css.languageActive]: isActive })}
              aria-pressed={isActive}
              aria-label={LANGUAGE_NAMES[code] || code}
              onClick={() => (isActive ? null : onChange(code))}
            >
              {code.toUpperCase()}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default LanguageSwitch;
