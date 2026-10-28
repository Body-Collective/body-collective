/**
 * After a save with missing or invalid fields, scrolls to the first field error. Final Form
 * marks all fields touched on such a save, so their errors render on the next frame.
 *
 * Forms of the listing editor don't disable their save button while fields are invalid: listings
 * saved before a field became required would otherwise just have a button that does nothing.
 */
export const scrollToFirstError = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.requestAnimationFrame(() => {
    const error = document.querySelector('[class*="ValidationError_root"]');
    const field = error?.parentElement || error;
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

/**
 * onSubmit handler of a <Form> that shows the errors of an invalid form.
 *
 * @param {Function} handleSubmit Final Form's handleSubmit
 * @param {boolean} invalid Whether the form has errors
 * @returns {Function} event handler
 */
export const submitShowingErrors = (handleSubmit, invalid) => e => {
  const result = handleSubmit(e);
  if (invalid) {
    scrollToFirstError();
  }
  return result;
};
