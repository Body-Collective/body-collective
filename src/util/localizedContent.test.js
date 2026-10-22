import { textFingerprint } from './textFingerprint';
import {
  getContentLanguage,
  getListingDescription,
  getListingTitle,
  getProfileBio,
  localizePractitionerProfile,
} from './localizedContent';

const en = { locale: 'en-GB' };
const de = { locale: 'de-DE' };

describe('localizedContent', () => {
  it('reads the language from the locale', () => {
    expect(getContentLanguage(de)).toEqual('de');
    expect(getContentLanguage({ locale: 'fr-FR' })).toBeNull();
  });

  it('shows the listing title and description in the language, or the original', () => {
    const listing = {
      attributes: {
        title: 'Ayurvedische Massage',
        description: 'Original',
        publicData: {
          title_en: 'Ayurvedic massage',
          description_en: '  ',
          translationSources: { title: textFingerprint('Ayurvedische Massage') },
        },
      },
    };
    expect(getListingTitle(listing, en)).toEqual('Ayurvedic massage');
    expect(getListingTitle(listing, de)).toEqual('Ayurvedische Massage');
    expect(getListingDescription(listing, en)).toEqual('Original');
  });

  it('shows the original title in the language the listing was written in', () => {
    const listing = {
      attributes: {
        title: 'Ayurveda Massage',
        publicData: {
          translationSourceLanguage: 'en',
          title_en: 'An older title',
          title_de: 'Ayurveda-Massage',
          translationSources: { title: textFingerprint('Ayurveda Massage') },
        },
      },
    };
    expect(getListingTitle(listing, en)).toEqual('Ayurveda Massage');
    expect(getListingTitle(listing, de)).toEqual('Ayurveda-Massage');
  });

  it('shows the original when the translation was made from an older text', () => {
    const listing = {
      attributes: {
        title: 'Ayurveda Massage - Berlin',
        publicData: {
          translationSourceLanguage: 'de',
          title_en: 'Lomi Lomi Ritual',
          translationSources: { title: textFingerprint('Lomi-Lomi-Ritual') },
        },
      },
    };
    expect(getListingTitle(listing, en)).toEqual('Ayurveda Massage - Berlin');
    // Translations saved before the fingerprints can't be checked
    delete listing.attributes.publicData.translationSources;
    expect(getListingTitle(listing, en)).toEqual('Ayurveda Massage - Berlin');
  });

  it('shows the profile texts in the language, keeping years and lists that changed', () => {
    const profile = {
      bio: 'Hallo',
      publicData: {
        translations: {
          en: {
            bio: 'Hello',
            experience: ['Ayurvedic massage since 2007'],
            training: [{ title: 'Tantra massage training', teacher: 'Tantra Zentrum' }],
          },
        },
      },
    };
    expect(getProfileBio(profile, en)).toEqual('Hello');
    expect(getProfileBio(profile, de)).toEqual('Hallo');

    const practitioner = {
      professionalTitle: 'Therapeutin',
      experience: ['Ayurvedische Massage seit 2007'],
      training: [{ year: '2007', title: 'Ausbildung Tantramassage', teacher: 'Tantra Zentrum' }],
      // One more row than the translation: kept as written
      furtherTraining: [{ year: '', title: 'Kali-Praxis', teacher: '' }],
    };
    const localized = localizePractitionerProfile(practitioner, {
      ...profile.publicData.translations.en,
      furtherTraining: [],
    });
    expect(localized.experience).toEqual(['Ayurvedic massage since 2007']);
    expect(localized.training).toEqual([
      { year: '2007', title: 'Tantra massage training', teacher: 'Tantra Zentrum' },
    ]);
    expect(localized.furtherTraining).toEqual(practitioner.furtherTraining);
    expect(localized.professionalTitle).toEqual('Therapeutin');
  });
});
