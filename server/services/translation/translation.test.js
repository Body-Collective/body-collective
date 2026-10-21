jest.mock('./openai', () => ({ requestJson: jest.fn(), isConfigured: () => true }));

const { requestJson } = require('./openai');
const { hashTexts, translateTexts } = require('./index');
const { translateListing } = require('./listing');
const { getProfileTexts, translateProfile } = require('./profile');

const answer = (sourceLanguage, items) => ({ sourceLanguage, items });

describe('translation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the original in its own language and falls back to it when a translation is missing', async () => {
    requestJson.mockResolvedValue(
      answer('de', [
        { id: 'title', translation: 'Ayurvedic massage' },
        { id: 'description', translation: '' },
      ])
    );
    const result = await translateTexts({
      title: 'Ayurvedische Massage',
      description: 'Eine ruhige Behandlung',
      empty: '  ',
    });
    expect(result).toEqual({
      sourceLanguage: 'de',
      de: { title: 'Ayurvedische Massage', description: 'Eine ruhige Behandlung' },
      en: { title: 'Ayurvedic massage', description: 'Eine ruhige Behandlung' },
    });
    // Empty texts are not sent
    expect(requestJson.mock.calls[0][0].input.items.map(i => i.id)).toEqual([
      'title',
      'description',
    ]);
  });

  it('refuses an answer without a detected language', async () => {
    requestJson.mockResolvedValue({ sourceLanguage: 'fr', items: [] });
    await expect(translateTexts({ bio: 'Bonjour' })).rejects.toEqual(
      expect.objectContaining({ code: 'no-language' })
    );
  });

  it('refuses too much text', async () => {
    await expect(translateTexts({ bio: 'x'.repeat(7000) })).rejects.toEqual(
      expect.objectContaining({ code: 'too-long' })
    );
    expect(requestJson).not.toHaveBeenCalled();
  });

  describe('listing', () => {
    const listing = (title, description, publicData = {}) => ({
      data: { data: { attributes: { title, description, publicData } } },
    });
    const sdk = () => ({ ownListings: { show: jest.fn(), update: jest.fn() } });

    it('saves the translations as separate keys', async () => {
      const s = sdk();
      s.ownListings.show.mockResolvedValue(listing('Lomi Lomi', 'A ritual'));
      requestJson.mockResolvedValue(
        answer('en', [
          { id: 'title', translation: 'Lomi Lomi' },
          { id: 'description', translation: 'Ein Ritual' },
        ])
      );
      expect(await translateListing({ sdk: s, listingId: { uuid: 'l1' } })).toEqual({
        status: 'translated',
      });
      expect(s.ownListings.update).toHaveBeenCalledWith({
        id: { uuid: 'l1' },
        publicData: expect.objectContaining({
          title_en: 'Lomi Lomi',
          title_de: 'Lomi Lomi',
          description_en: 'A ritual',
          description_de: 'Ein Ritual',
          translationSourceLanguage: 'en',
          translationSourceHash: hashTexts({ title: 'Lomi Lomi', description: 'A ritual' }),
        }),
      });
    });

    it('does not translate unchanged texts again', async () => {
      const s = sdk();
      const hash = hashTexts({ title: 'Lomi Lomi', description: 'A ritual' });
      s.ownListings.show.mockResolvedValue(
        listing('Lomi Lomi', 'A ritual', { translationSourceHash: hash })
      );
      expect(await translateListing({ sdk: s, listingId: { uuid: 'l1' } })).toEqual({
        status: 'unchanged',
      });
      expect(requestJson).not.toHaveBeenCalled();
    });

    it('does not save a translation of texts that were edited meanwhile', async () => {
      const s = sdk();
      s.ownListings.show
        .mockResolvedValueOnce(listing('Old', 'Text'))
        .mockResolvedValueOnce(listing('New', 'Text'));
      requestJson.mockResolvedValue(
        answer('en', [
          { id: 'title', translation: 'Alt' },
          { id: 'description', translation: 'Text' },
        ])
      );
      expect(await translateListing({ sdk: s, listingId: { uuid: 'l1' } })).toEqual({
        status: 'outdated',
      });
      expect(s.ownListings.update).not.toHaveBeenCalled();
    });
  });

  describe('profile', () => {
    const profile = {
      bio: 'Hallo',
      publicData: {
        professionalTitle: 'Therapeutin',
        quote: '',
        quoteAuthor: 'Saraha',
        experience: ['Ayurvedische Massage seit 2007'],
        training: [{ year: '2007', title: 'Ausbildung Tantramassage', teacher: 'Tantra Zentrum' }],
      },
    };

    it('collects the texts, without years and the quote author', () => {
      expect(getProfileTexts(profile)).toEqual({
        bio: 'Hallo',
        professionalTitle: 'Therapeutin',
        quote: '',
        'experience.0': 'Ayurvedische Massage seit 2007',
        'training.0.title': 'Ausbildung Tantramassage',
        'training.0.teacher': 'Tantra Zentrum',
      });
    });

    it('saves the translations in the shape of the profile', async () => {
      const sdk = {
        currentUser: {
          show: jest.fn().mockResolvedValue({ data: { data: { attributes: { profile } } } }),
          updateProfile: jest.fn(),
        },
      };
      requestJson.mockResolvedValue(
        answer('de', [
          { id: 'bio', translation: 'Hello' },
          { id: 'professionalTitle', translation: 'Therapist' },
          { id: 'experience.0', translation: 'Ayurvedic massage since 2007' },
          { id: 'training.0.title', translation: 'Tantra massage training' },
          { id: 'training.0.teacher', translation: 'Tantra Zentrum' },
        ])
      );
      expect(await translateProfile({ sdk })).toEqual({ status: 'translated' });
      const { translations } = sdk.currentUser.updateProfile.mock.calls[0][0].publicData;
      expect(translations.sourceLanguage).toEqual('de');
      expect(translations.en).toEqual({
        bio: 'Hello',
        professionalTitle: 'Therapist',
        quote: '',
        experience: ['Ayurvedic massage since 2007'],
        training: [{ title: 'Tantra massage training', teacher: 'Tantra Zentrum' }],
        furtherTraining: [],
      });
      expect(translations.de.training).toEqual([
        { title: 'Ausbildung Tantramassage', teacher: 'Tantra Zentrum' },
      ]);
    });
  });
});
