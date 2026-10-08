import {
  localizeCategories,
  localizeConfig,
  localizeField,
  translateOr,
} from './configLocalization';

const messages = {
  'UserFields.company': 'Firmenname',
  'UserFields.company.placeholder': 'Name deiner Firma',
  'UserFields.company.required': 'Bitte gib einen Namen an',
  'UserFields.language': 'Bevorzugte Sprache',
  'UserFields.language.de': 'Deutsch',
  'ListingFields.featured_listing': 'Hervorgehobenes Angebot',
  'ListingFields.featured_listing.yes': 'Hervorgehoben',
  'TransactionFields.notes': 'Hinweise',
  'Categories.massage': 'Massage & Körperarbeit',
  'Categories.ayurveda': 'Ayurveda (DE)',
  'ListingTypes.daily_booking': 'Buchung nach Tag',
  'UserTypes.customer': 'Kund:in',
};

const companyField = {
  key: 'company',
  label: 'Company',
  saveConfig: { label: 'Company', placeholderMessage: 'Company name', isRequired: true },
  showConfig: { label: 'Company', displayInProfile: true },
};

describe('configLocalization', () => {
  describe('translateOr', () => {
    it('returns the translation or the fallback', () => {
      expect(translateOr(messages, 'UserFields.company', 'Company')).toEqual('Firmenname');
      expect(translateOr(messages, 'UserFields.website', 'Website')).toEqual('Website');
      expect(translateOr(undefined, 'UserFields.company', 'Company')).toEqual('Company');
    });

    it('does not use a message that is only the key (tests) or empty', () => {
      const keyMessages = { 'UserFields.company': 'UserFields.company', 'UserFields.x': ' ' };
      expect(translateOr(keyMessages, 'UserFields.company', 'Company')).toEqual('Company');
      expect(translateOr(keyMessages, 'UserFields.x', 'X')).toEqual('X');
    });
  });

  describe('localizeField', () => {
    it('translates the label everywhere, the placeholder and the required message', () => {
      const field = localizeField(companyField, 'UserFields', messages);
      expect(field.label).toEqual('Firmenname');
      expect(field.saveConfig).toEqual({
        label: 'Firmenname',
        placeholderMessage: 'Name deiner Firma',
        requiredMessage: 'Bitte gib einen Namen an',
        isRequired: true,
      });
      expect(field.showConfig).toEqual({ label: 'Firmenname', displayInProfile: true });
      expect(field.key).toEqual('company');
    });

    it('translates the options and keeps the text of Console for the others', () => {
      const field = localizeField(
        {
          key: 'language',
          label: 'Preferred language',
          enumOptions: [{ option: 'en', label: 'English' }, { option: 'de', label: 'German' }],
          filterConfig: { label: 'Preferred language', indexForSearch: true },
        },
        'UserFields',
        messages
      );
      expect(field.enumOptions).toEqual([
        { option: 'en', label: 'English' },
        { option: 'de', label: 'Deutsch' },
      ]);
      expect(field.filterConfig).toEqual({ label: 'Bevorzugte Sprache', indexForSearch: true });
    });

    it('keeps a field without translations as it is', () => {
      const field = { key: 'website', label: 'Website', saveConfig: { label: 'Website' } };
      expect(localizeField(field, 'UserFields', messages)).toEqual(field);
    });
  });

  describe('localizeCategories', () => {
    it('translates the names of categories and subcategories', () => {
      const categories = [
        {
          id: 'massage',
          name: 'Massage & Bodywork',
          subcategories: [{ id: 'ayurveda', name: 'Ayurveda' }, { id: 'lomi', name: 'Lomi Lomi' }],
        },
      ];
      expect(localizeCategories(categories, messages)).toEqual([
        {
          id: 'massage',
          name: 'Massage & Körperarbeit',
          subcategories: [
            { id: 'ayurveda', name: 'Ayurveda (DE)' },
            { id: 'lomi', name: 'Lomi Lomi' },
          ],
        },
      ]);
    });
  });

  describe('localizeConfig', () => {
    const config = {
      localization: { locale: 'de' },
      user: {
        userTypes: [{ userType: 'customer', label: 'Customer' }],
        userFields: [companyField],
      },
      listing: {
        listingTypes: [
          {
            listingType: 'daily_booking',
            label: 'Daily booking',
            transactionFields: [{ key: 'notes', label: 'Notes' }],
          },
        ],
        listingFields: [
          {
            key: 'featured_listing',
            label: 'Featured',
            enumOptions: [{ option: 'yes', label: 'Yes' }],
          },
        ],
        enforceValidListingType: false,
      },
      categoryConfiguration: {
        key: 'categoryLevel',
        categories: [{ id: 'massage', name: 'Massage' }],
      },
    };

    it('translates fields, categories and types, and leaves the rest as it is', () => {
      const localized = localizeConfig(config, messages);
      expect(localized.user.userTypes[0].label).toEqual('Kund:in');
      expect(localized.user.userFields[0].label).toEqual('Firmenname');
      expect(localized.listing.listingTypes[0].label).toEqual('Buchung nach Tag');
      expect(localized.listing.listingTypes[0].transactionFields[0].label).toEqual('Hinweise');
      expect(localized.listing.listingFields[0].label).toEqual('Hervorgehobenes Angebot');
      expect(localized.listing.listingFields[0].enumOptions[0].label).toEqual('Hervorgehoben');
      expect(localized.categoryConfiguration.categories[0].name).toEqual('Massage & Körperarbeit');
      expect(localized.categoryConfiguration.key).toEqual('categoryLevel');
      expect(localized.listing.enforceValidListingType).toEqual(false);
      expect(localized.localization).toBe(config.localization);
    });

    it('does not change the original config', () => {
      const before = JSON.stringify(config);
      localizeConfig(config, messages);
      expect(JSON.stringify(config)).toEqual(before);
    });

    it('returns the config as it is without messages', () => {
      expect(localizeConfig(config, null)).toBe(config);
    });
  });
});
