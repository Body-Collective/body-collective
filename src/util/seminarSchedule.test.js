import {
  fromUnixSeconds,
  getSeminarScheduleInitialValues,
  getSeminarSchedulePublicData,
  toUnixSeconds,
  withoutLegacySeminarFields,
  formatSeminarCardDates,
  getSeminarSpots,
  getSpotsLeft,
} from './seminarSchedule';

describe('seminarSchedule', () => {
  it('stores a day and a time in Berlin as unix seconds (summer and winter time)', () => {
    // 12 Sep 2026 10:00 in Berlin (UTC+2)
    expect(toUnixSeconds(new Date(2026, 8, 12), '10:00')).toEqual(
      Date.UTC(2026, 8, 12, 8, 0) / 1000
    );
    // 15 Dec 2026 18:30 in Berlin (UTC+1)
    expect(toUnixSeconds(new Date(2026, 11, 15), '18:30')).toEqual(
      Date.UTC(2026, 11, 15, 17, 30) / 1000
    );
    expect(toUnixSeconds(new Date(2026, 8, 12), '')).toBeNull();
    expect(toUnixSeconds(null, '10:00')).toBeNull();
  });

  it('reads unix seconds back as the day and the time in Berlin', () => {
    const { day, time } = fromUnixSeconds(Date.UTC(2026, 8, 12, 8, 0) / 1000);
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 8, 12]);
    expect(time).toEqual('10:00');
  });

  it('turns the form values into public data and back', () => {
    const values = {
      seminarDates: { startDate: new Date(2026, 8, 12), endDate: new Date(2026, 8, 14) },
      event_type: 'retreat',
      booking_for: 'couples',
    };
    const publicData = getSeminarSchedulePublicData(values);
    // The whole days in Berlin: the daily times are in the programme
    expect(publicData).toEqual({
      event_type: 'retreat',
      booking_for: 'couples',
      event_start: Date.UTC(2026, 8, 11, 22, 0) / 1000,
      event_end: Date.UTC(2026, 8, 14, 21, 59) / 1000,
    });
    expect(getSeminarScheduleInitialValues(publicData)).toEqual(values);
    expect(getSeminarScheduleInitialValues({})).toEqual({ booking_for: 'individuals' });
  });

  it('stores a one-day event and books individuals by default', () => {
    const publicData = getSeminarSchedulePublicData({
      seminarDates: { startDate: new Date(2026, 11, 15), endDate: null },
    });
    expect(publicData).toEqual({
      event_type: null,
      booking_for: 'individuals',
      event_start: Date.UTC(2026, 11, 14, 23, 0) / 1000,
      event_end: Date.UTC(2026, 11, 15, 22, 59) / 1000,
    });
    expect(getSeminarScheduleInitialValues(publicData).seminarDates).toEqual({
      startDate: new Date(2026, 11, 15),
      endDate: null,
    });
  });

  it('hides the Console fields replaced by the date and time selectors', () => {
    const fields = [{ key: 'seminar_date' }, { key: 'event_date_sort' }, { key: 'other' }];
    expect(withoutLegacySeminarFields(fields)).toEqual([{ key: 'other' }]);
  });

  it('formats the dates of the cards, short', () => {
    const at = (y, m, d) => Date.UTC(y, m, d, 9, 0) / 1000;
    const en = { locale: 'en-GB' };
    const de = { locale: 'de-DE' };
    const card = (intl, start, end) =>
      formatSeminarCardDates(intl, { event_start: start, event_end: end });
    expect(card(en, at(2026, 8, 12), at(2026, 8, 14))).toEqual('12–14 Sep 26');
    expect(card(de, at(2026, 8, 12), at(2026, 8, 14))).toEqual('12.–14. Sep. 26');
    expect(card(en, at(2026, 9, 31), at(2026, 10, 5))).toEqual('31 Oct – 5 Nov 26');
    expect(card(de, at(2026, 9, 31), at(2026, 10, 5))).toEqual('31. Okt. – 5. Nov. 26');
    expect(card(en, at(2026, 11, 27), at(2027, 0, 3))).toEqual('27 Dec 26 – 3 Jan 27');
    expect(card(de, at(2026, 11, 27), at(2027, 0, 3))).toEqual('27. Dez. 26 – 3. Jan. 27');
    expect(card(en, at(2026, 10, 1), at(2026, 10, 1) + 3600)).toEqual('1 Nov 26');
  });

  it('counts the spots booked here from the total, the spots booked elsewhere and the stock', () => {
    // 12 spots, 3 booked elsewhere, 7 left: 2 booked on the marketplace
    const spots = getSeminarSpots({ spots_total: 12, spots_booked_elsewhere: 3 }, 7);
    expect(spots).toEqual({
      total: 12,
      bookedElsewhere: 3,
      bookedHere: 2,
      left: 7,
      hasTotal: true,
    });
    // Older listings: the stock is the total
    expect(getSeminarSpots({}, 5)).toEqual({
      total: 5,
      bookedElsewhere: 0,
      bookedHere: 0,
      left: 5,
      hasTotal: false,
    });
  });

  it('keeps the spots booked here when the organiser changes the numbers', () => {
    // 2 booked here; the organiser sells 1 more spot elsewhere and adds 2 spots
    expect(getSpotsLeft('14', '4', 2)).toEqual(8);
    expect(getSpotsLeft(12, 0, 2)).toEqual(10);
    // Never below zero
    expect(getSpotsLeft(3, 2, 2)).toEqual(0);
  });
});
