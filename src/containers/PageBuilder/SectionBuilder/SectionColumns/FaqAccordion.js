import React, { useState } from 'react';

import Field, { hasDataInFields } from '../../Field';

import css from './FaqAccordion.module.css';

const Chevron = () => (
  <svg
    className={css.chevron}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/**
 * One FAQ row. The CMS block title is the question; description (or text) is the answer.
 *
 * @param {Object} props
 * @param {Object} props.block
 * @param {boolean} props.defaultOpen
 * @param {Object} props.options
 * @returns {JSX.Element|null}
 */
const FaqItem = props => {
  const { block, defaultOpen, options } = props;
  const { blockId, title, text, description } = block;
  const answer = description || text;
  const hasQuestion = hasDataInFields([title], options);
  const hasAnswer = hasDataInFields([answer], options);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!hasQuestion) {
    return null;
  }

  return (
    <details
      className={css.item}
      id={blockId}
      open={isOpen}
      onToggle={event => {
        const nextOpen = event.currentTarget.open;
        if (nextOpen !== isOpen) {
          setIsOpen(nextOpen);
        }
      }}
    >
      <summary className={css.question}>
        <span className={css.questionText}>
          <Field data={title} options={options} />
        </span>
        <Chevron />
      </summary>
      {hasAnswer ? (
        <div className={css.answer}>
          <Field data={answer} options={options} />
        </div>
      ) : null}
    </details>
  );
};

/**
 * Accordion list for the FAQ section. Each CMS block is one question/answer pair.
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.blocks
 * @param {Object} props.options
 * @returns {JSX.Element}
 */
const FaqAccordion = props => {
  const { blocks = [], options } = props;

  return (
    <div className={css.root}>
      {blocks.map((block, index) => (
        <FaqItem
          key={block.blockId || `faq-${index}`}
          block={block}
          defaultOpen={index === 0}
          options={options}
        />
      ))}
    </div>
  );
};

export default FaqAccordion;
