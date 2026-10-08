import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  getCookieLanguage,
  getLanguageFromCookieString,
  getStoredLanguage,
  getUserLanguage,
  normalizeLanguage,
  parseLanguageSuffix,
  selectSectionsForLanguage,
  storeLanguage,
} from './language';

const section = (sectionId, extra = {}) => ({ sectionId, sectionType: 'article', ...extra });

describe('language', () => {
  describe('normalizeLanguage', () => {
    it('accepts the languages of the app only', () => {
      expect(normalizeLanguage('en')).toEqual('en');
      expect(normalizeLanguage('de')).toEqual('de');
      expect(normalizeLanguage('fr')).toBeNull();
      expect(normalizeLanguage('DE')).toBeNull();
      expect(normalizeLanguage('')).toBeNull();
      expect(normalizeLanguage(undefined)).toBeNull();
    });
  });

  describe('getUserLanguage', () => {
    it('is the language in the public data of the profile', () => {
      const user = { attributes: { profile: { publicData: { language: 'de' } } } };
      expect(getUserLanguage(user)).toEqual('de');
    });

    it('is null when the user has no valid language', () => {
      expect(getUserLanguage(null)).toBeNull();
      expect(getUserLanguage({ attributes: { profile: { publicData: {} } } })).toBeNull();
      const other = { attributes: { profile: { publicData: { language: 'nl' } } } };
      expect(getUserLanguage(other)).toBeNull();
    });
  });

  describe('the language of the browser', () => {
    beforeEach(() => {
      window.localStorage.clear();
      document.cookie = `${LANGUAGE_COOKIE_NAME}=; path=/; max-age=0`;
    });

    it('is empty until a language is stored', () => {
      expect(getStoredLanguage()).toBeNull();
      expect(getCookieLanguage()).toBeNull();
    });

    it('is stored to localStorage and to a cookie for the server', () => {
      storeLanguage('de');
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toEqual('de');
      expect(getStoredLanguage()).toEqual('de');
      expect(getCookieLanguage()).toEqual('de');

      storeLanguage('en');
      expect(getStoredLanguage()).toEqual('en');
      expect(getCookieLanguage()).toEqual('en');
    });

    it('does not store a language that the app does not have', () => {
      storeLanguage('fr');
      expect(getStoredLanguage()).toBeNull();
      expect(getCookieLanguage()).toBeNull();
    });

    it('ignores an invalid value in localStorage', () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'klingon');
      expect(getStoredLanguage()).toBeNull();
    });
  });

  describe('getLanguageFromCookieString', () => {
    it('finds the language among other cookies', () => {
      expect(getLanguageFromCookieString('a=b; bc_language=de; c=d')).toEqual('de');
      expect(getLanguageFromCookieString('bc_language=en')).toEqual('en');
    });

    it('is null when there is no valid language', () => {
      expect(getLanguageFromCookieString('')).toBeNull();
      expect(getLanguageFromCookieString(undefined)).toBeNull();
      expect(getLanguageFromCookieString('a=b')).toBeNull();
      expect(getLanguageFromCookieString('bc_language=fr')).toBeNull();
      expect(getLanguageFromCookieString('other_bc_language=de')).toBeNull();
    });
  });

  describe('parseLanguageSuffix', () => {
    it('splits an id that ends with a language', () => {
      expect(parseLanguageSuffix('hero-de')).toEqual({ baseId: 'hero', language: 'de' });
      expect(parseLanguageSuffix('region-hero-en')).toEqual({
        baseId: 'region-hero',
        language: 'en',
      });
    });

    it('keeps an id that has no language as it is', () => {
      expect(parseLanguageSuffix('hero')).toEqual({ baseId: 'hero', language: null });
      expect(parseLanguageSuffix('hero-fr')).toEqual({ baseId: 'hero-fr', language: null });
      expect(parseLanguageSuffix('de')).toEqual({ baseId: 'de', language: null });
      expect(parseLanguageSuffix('-de')).toEqual({ baseId: '-de', language: null });
      expect(parseLanguageSuffix('')).toEqual({ baseId: '', language: null });
      expect(parseLanguageSuffix(undefined)).toEqual({ baseId: '', language: null });
    });

    it('only counts the language at the end of the id', () => {
      expect(parseLanguageSuffix('de-hero')).toEqual({ baseId: 'de-hero', language: null });
      expect(parseLanguageSuffix('hero-en-extra')).toEqual({
        baseId: 'hero-en-extra',
        language: null,
      });
    });
  });

  describe('selectSectionsForLanguage', () => {
    const sections = [
      section('hero-en', { title: 'Welcome' }),
      section('hero-de', { title: 'Willkommen' }),
      section('faq-en', { title: 'Questions' }),
      section('faq-de', { title: 'Fragen' }),
    ];

    it('shows the sections of the language', () => {
      expect(selectSectionsForLanguage(sections, 'de').map(s => s.title)).toEqual([
        'Willkommen',
        'Fragen',
      ]);
      expect(selectSectionsForLanguage(sections, 'en').map(s => s.title)).toEqual([
        'Welcome',
        'Questions',
      ]);
    });

    it('removes the language from the ids, so that styles and anchors are the same in each one', () => {
      expect(selectSectionsForLanguage(sections, 'de').map(s => s.sectionId)).toEqual([
        'hero',
        'faq',
      ]);
      expect(selectSectionsForLanguage(sections, 'en').map(s => s.sectionId)).toEqual([
        'hero',
        'faq',
      ]);
    });

    it('shows the default language when the section has not been translated', () => {
      const partlyTranslated = [
        section('hero-en', { title: 'Welcome' }),
        section('hero-de', { title: 'Willkommen' }),
        section('faq-en', { title: 'Questions' }),
      ];
      const picked = selectSectionsForLanguage(partlyTranslated, 'de');
      expect(picked.map(s => s.title)).toEqual(['Willkommen', 'Questions']);
      expect(picked.map(s => s.sectionId)).toEqual(['hero', 'faq']);
    });

    it('shows a section that has only another language than the default and the chosen one', () => {
      const onlyGerman = [section('hero-de', { title: 'Willkommen' })];
      expect(selectSectionsForLanguage(onlyGerman, 'en').map(s => s.title)).toEqual(['Willkommen']);
    });

    it('shows the sections that have no language in each language', () => {
      const mixed = [
        section('hero-en', { title: 'Welcome' }),
        section('shared', { title: 'Shared' }),
        section('hero-de', { title: 'Willkommen' }),
        section(undefined, { title: 'No id' }),
        section('', { title: 'Empty id' }),
      ];
      expect(selectSectionsForLanguage(mixed, 'de').map(s => s.title)).toEqual([
        'Willkommen',
        'Shared',
        'No id',
        'Empty id',
      ]);
      expect(selectSectionsForLanguage(mixed, 'en').map(s => s.title)).toEqual([
        'Welcome',
        'Shared',
        'No id',
        'Empty id',
      ]);
    });

    it('keeps the order of the page, whichever version comes first', () => {
      const reversed = [
        section('faq-de', { title: 'Fragen' }),
        section('hero-de', { title: 'Willkommen' }),
        section('faq-en', { title: 'Questions' }),
        section('hero-en', { title: 'Welcome' }),
      ];
      expect(selectSectionsForLanguage(reversed, 'en').map(s => s.title)).toEqual([
        'Questions',
        'Welcome',
      ]);
      expect(selectSectionsForLanguage(reversed, 'de').map(s => s.title)).toEqual([
        'Fragen',
        'Willkommen',
      ]);
    });

    it('does not change the sections that it is given', () => {
      const original = JSON.parse(JSON.stringify(sections));
      selectSectionsForLanguage(sections, 'de');
      expect(sections).toEqual(original);
    });

    it('works without sections', () => {
      expect(selectSectionsForLanguage([], 'de')).toEqual([]);
      expect(selectSectionsForLanguage(undefined, 'de')).toBeUndefined();
    });

    it('uses the default language when the language is not known', () => {
      expect(selectSectionsForLanguage(sections, 'fr').map(s => s.title)).toEqual([
        'Welcome',
        'Questions',
      ]);
    });
  });

  it('has English as the default language', () => {
    expect(DEFAULT_LANGUAGE).toEqual('en');
  });
});
