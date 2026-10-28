import React from 'react';
import classNames from 'classnames';

import { parseFormattedText } from '../../util/formattedText';

import css from './FormattedText.module.css';

const WRAPPERS = {
  bold: children => <strong>{children}</strong>,
  italic: children => <em>{children}</em>,
  underline: children => <u>{children}</u>,
};

const renderParts = parts =>
  parts.map((part, i) => (
    <React.Fragment key={i}>
      {part.marks.reduce((children, mark) => WRAPPERS[mark](children), part.text)}
    </React.Fragment>
  ));

/**
 * A formatted text of a listing (see util/formattedText.js): lines, bullet and numbered lists,
 * with bold, italic and underlined parts. An empty line in the text is a gap between paragraphs,
 * like in the profile texts. The text is rendered as React elements, never as HTML.
 *
 * @component
 * @param {Object} props
 * @param {string} props.text The stored text
 * @param {string} [props.className] Add more style rules in addition to the root class
 * @param {string} [props.rootClassName] Overwrite the root class
 * @returns {JSX.Element|null}
 */
const FormattedText = props => {
  const { text, className, rootClassName } = props;
  const blocks = parseFormattedText(text);
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={classNames(rootClassName || css.root, className)}>
      {blocks.map((block, i) => {
        if (block.type === 'divider') {
          return <hr key={i} className={css.divider} />;
        }
        if (block.type === 'gap') {
          return <div key={i} className={css.gap} aria-hidden="true" />;
        }
        if (block.type === 'paragraph') {
          return (
            <p key={i} className={css.paragraph}>
              {renderParts(block.parts)}
            </p>
          );
        }
        const List = block.type === 'orderedList' ? 'ol' : 'ul';
        return (
          <List key={i} className={block.type === 'orderedList' ? css.orderedList : css.list}>
            {block.items.map((item, j) => (
              <li key={j} className={css.item}>
                {renderParts(item)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
};

export default FormattedText;
