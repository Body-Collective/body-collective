import { getLegacyDescriptionValues } from './treatmentDetails';

describe('treatmentDetails', () => {
  it('moves the long description of older listings to the about text', () => {
    const long = `Ayurveda massage with warm oils. ${'Deep relaxation for body and mind. '.repeat(
      10
    )}`;
    expect(getLegacyDescriptionValues(long, {}, 'about_treatment')).toEqual({
      description: 'Ayurveda massage with warm oils.',
      about: long.trim(),
    });
    // An about text of its own is kept; a first sentence that is too long isn't proposed
    const oneSentence = `A${'a'.repeat(200)}`;
    expect(
      getLegacyDescriptionValues(oneSentence, { about_treatment: 'Mine' }, 'about_treatment')
    ).toEqual({ description: '', about: 'Mine' });
    // Short descriptions stay as they are
    expect(getLegacyDescriptionValues('Short.', {}, 'about_treatment')).toBeNull();
  });
});
