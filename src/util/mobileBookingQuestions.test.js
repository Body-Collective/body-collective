import {
  getConfirmationsProtectedData,
  getOrderedQuestionConfigs,
  isQuestionRequired,
  isQuestionShown,
  withoutHiddenAnswers,
} from './mobileBookingQuestions';

describe('mobileBookingQuestions', () => {
  it('orders the questions like the checkout', () => {
    const configs = ['health_note', 'parking', 'accommodation_type', 'mobile_service_location'].map(
      key => ({ key })
    );
    expect(getOrderedQuestionConfigs(configs).map(c => c.key)).toEqual([
      'mobile_service_location',
      'accommodation_type',
      'parking',
      'health_note',
    ]);
  });

  it('asks the conditional questions only for the right answer', () => {
    const answers = { accommodation_type: 'hotel', car_access: 'yes' };
    const getAnswer = key => answers[key];
    expect(isQuestionShown('hotel_receptionist', getAnswer)).toBe(true);
    expect(isQuestionShown('car_directions', getAnswer)).toBe(false);
    expect(isQuestionShown('parking', getAnswer)).toBe(true);
    expect(isQuestionRequired({ key: 'hotel_receptionist', saveConfig: {} })).toBe(true);
    expect(isQuestionRequired({ key: 'car_directions', saveConfig: { isRequired: true } })).toBe(
      false
    );
    expect(isQuestionRequired({ key: 'parking', saveConfig: { isRequired: true } })).toBe(true);
  });

  it('leaves out the answers of questions that are not shown', () => {
    const values = {
      prot_accommodation_type: 'villa',
      prot_hotel_receptionist: 'Marta',
      prot_car_access: 'no',
      prot_car_directions: 'Dirt track',
    };
    expect(withoutHiddenAnswers(values)).toEqual({
      prot_accommodation_type: 'villa',
      prot_car_access: 'no',
      prot_car_directions: 'Dirt track',
    });
  });

  it('saves the confirmations with the time of the consent', () => {
    const now = new Date('2026-10-25T10:00:00.000Z');
    expect(
      getConfirmationsProtectedData(
        { weightConfirmed: ['confirmed'], healthDataConsent: ['given'] },
        now
      )
    ).toEqual({
      weightConfirmed: true,
      healthDataConsent: { given: true, givenAt: '2026-10-25T10:00:00.000Z' },
    });
    expect(getConfirmationsProtectedData({})).toEqual({});
  });
});
