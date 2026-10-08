import {
  LAZY_IMAGES_FROM_SECTION_INDEX,
  isLazyImagesSection,
  pickFieldOptions,
  resolveFooterFieldKeys,
  resolveFooterKeys,
} from './PageBuilder.helpers';

describe('PageBuilder.helpers', () => {
  describe('resolveFooterKeys()', () => {
    const messages = {
      'Footer.discover': 'Entdecken',
      'Footer.aboutUs': 'Über uns',
      'Footer.massageBodywork': 'Massage & Körperarbeit',
    };

    it('replaces the translation keys of the footer in a markdown text', () => {
      const markdown =
        '#### Footer.discover\n\n[Footer.massageBodywork](/s?pub_categoryLevel1=massage)\n[Footer.aboutUs](/p/about)';
      expect(resolveFooterKeys(markdown, messages)).toEqual(
        '#### Entdecken\n\n[Massage & Körperarbeit](/s?pub_categoryLevel1=massage)\n[Über uns](/p/about)'
      );
    });

    it('leaves a key that has no text, and the texts that have no keys, as they are', () => {
      expect(resolveFooterKeys('[Footer.unknown](/x)', messages)).toEqual('[Footer.unknown](/x)');
      expect(resolveFooterKeys('Holistic Care', messages)).toEqual('Holistic Care');
      expect(resolveFooterKeys('Our Footer. Not a key', messages)).toEqual('Our Footer. Not a key');
    });

    it('works without a text or messages', () => {
      expect(resolveFooterKeys(undefined, messages)).toBeUndefined();
      expect(resolveFooterKeys('Footer.discover')).toEqual('Footer.discover');
    });
  });

  describe('resolveFooterFieldKeys()', () => {
    it('replaces the keys in the content of a field and keeps the rest of the field', () => {
      const field = { fieldType: 'text', content: 'Footer.slogan' };
      expect(resolveFooterFieldKeys(field, { 'Footer.slogan': 'Ganzheitlich' })).toEqual({
        fieldType: 'text',
        content: 'Ganzheitlich',
      });
    });

    it('gives back a field that has no content as it is', () => {
      expect(resolveFooterFieldKeys(undefined, {})).toBeUndefined();
      const field = { fieldType: 'text' };
      expect(resolveFooterFieldKeys(field, {})).toBe(field);
    });
  });

  describe('isLazyImagesSection()', () => {
    it('returns false for section indexes before LAZY_IMAGES_FROM_SECTION_INDEX', () => {
      for (let i = 0; i < LAZY_IMAGES_FROM_SECTION_INDEX; i++) {
        expect(isLazyImagesSection(i)).toEqual(false);
      }
    });

    it('returns true for indexes at or after LAZY_IMAGES_FROM_SECTION_INDEX', () => {
      expect(isLazyImagesSection(LAZY_IMAGES_FROM_SECTION_INDEX)).toEqual(true);
      expect(isLazyImagesSection(LAZY_IMAGES_FROM_SECTION_INDEX + 5)).toEqual(true);
    });

    it('returns false for non-number indexes', () => {
      expect(isLazyImagesSection(undefined)).toEqual(false);
      expect(isLazyImagesSection(null)).toEqual(false);
    });
  });

  describe('pickFieldOptions()', () => {
    it('returns an empty object when options are empty', () => {
      expect(pickFieldOptions()).toEqual({});
      expect(pickFieldOptions({})).toEqual({});
    });

    it('keeps fieldComponents, fetchPriority, and lazyImages only', () => {
      const fieldComponents = { custom: {} };
      expect(
        pickFieldOptions({
          fieldComponents,
          fetchPriority: 'high',
          lazyImages: true,
          defaultClasses: { title: 'x' },
          featuredListings: {},
        })
      ).toEqual({ fieldComponents, fetchPriority: 'high', lazyImages: true });
    });

    it('omits fetchPriority and lazyImages when falsy', () => {
      expect(pickFieldOptions({ fetchPriority: null, lazyImages: false })).toEqual({});
    });
  });
});
