// Pages whose hero sits under the topbar. On these pages the topbar is transparent until the page
// is scrolled. Values match the `currentPage` handle that Topbar resolves from the current route.
const TRANSPARENT_HEADER_PAGES = ['LandingPage', 'CMSPage:apply_now', 'CMSPage:berlin'];

/**
 * Should the topbar be transparent over the page hero (until scrolled)?
 *
 * @param {string?} currentPage e.g. "LandingPage" or "CMSPage:apply_now"
 * @returns {boolean}
 */
export const isTransparentHeaderPage = currentPage =>
  TRANSPARENT_HEADER_PAGES.includes(currentPage);

// The apply page replaces the topbar "Sign up" button with an "Apply now" button.
const APPLY_PAGE = 'CMSPage:apply_now';

// The topbar "Apply now" button opens the signup form of this user type. The "Apply now" buttons in
// content/pages/apply_now (Console) lead to the same form: /signup/practitioner.
export const APPLY_USER_TYPE = 'practitioner';

/**
 * Is the current page the "become a practitioner" apply page?
 *
 * @param {string?} currentPage e.g. "CMSPage:apply_now"
 * @returns {boolean}
 */
export const isApplyPage = currentPage => currentPage === APPLY_PAGE;
