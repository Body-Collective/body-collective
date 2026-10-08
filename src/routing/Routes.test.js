import { isInPageNavigation } from './Routes';

describe('isInPageNavigation', () => {
  const inPage = {
    pathname: '/p/berlin',
    search: '?area=mitte',
    state: { inPageNavigation: true },
  };
  const plain = { pathname: '/p/berlin', search: '' };

  it('is true for a replaced location that is marked as an in-page navigation', () => {
    expect(isInPageNavigation(inPage, { action: 'REPLACE' })).toBe(true);
  });

  it('is false when the user comes back to that history entry with the back button', () => {
    // The marker stays in the state of the history entry, but coming back is a new visit
    expect(isInPageNavigation(inPage, { action: 'POP' })).toBe(false);
  });

  it('is false for a normal navigation', () => {
    expect(isInPageNavigation(inPage, { action: 'PUSH' })).toBe(false);
    expect(isInPageNavigation(plain, { action: 'REPLACE' })).toBe(false);
    expect(isInPageNavigation(plain, { action: 'PUSH' })).toBe(false);
    expect(isInPageNavigation(undefined, undefined)).toBe(false);
  });
});
