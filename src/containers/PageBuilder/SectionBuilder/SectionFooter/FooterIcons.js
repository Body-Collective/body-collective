import React from 'react';

/**
 * Small outline icons used in the footer bottom bar. They inherit color via currentColor.
 */

/**
 * Padlock icon.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className
 * @returns {JSX.Element} SVG icon
 */
export const IconLock = ({ className }) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

/**
 * Check mark inside a circle.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className
 * @returns {JSX.Element} SVG icon
 */
export const IconCheckCircle = ({ className }) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </svg>
);

/**
 * Envelope icon.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className
 * @returns {JSX.Element} SVG icon
 */
export const IconMail = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>
);
