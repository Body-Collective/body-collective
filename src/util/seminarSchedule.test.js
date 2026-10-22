import {
  formatSeminarSchedule,
  fromUnixSeconds,
  getSeminarScheduleInitialValues,
  getSeminarSchedulePublicData,
  toUnixSeconds,
  withoutLegacySeminarFields,
  formatSeminarCardDates,
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
      seminarStartTime: '10:00',
      seminarEndTime: '17:45',
      event_type: 'retreat',
    };
    const publicData = getSeminarSchedulePublicData(values);
    expect(publicData).toEqual({
      event_type: 'retreat',
      event_start: Date.UTC(2026, 8, 12, 8, 0) / 1000,
      event_end: Date.UTC(2026, 8, 14, 15, 45) / 1000,
    });
    expect(getSeminarScheduleInitialValues(publicData)).toEqual(values);
    expect(getSeminarScheduleInitialValues({})).toEqual({});
  });

  it('formats the dates and times, or the old text of older listings', () => {
    const intl = {
      formatDate: (d, o) => new Intl.DateTimeFormat('en-GB', o).format(d),
      formatTime: (d, o) => new Intl.DateTimeFormat('en-GB', o).format(d),
    };
    const { dates, times } = formatSeminarSchedule(intl, {
      event_start: Date.UTC(2026, 8, 12, 8, 0) / 1000,
      event_end: Date.UTC(2026, 8, 14, 15, 45) / 1000,
    });
    expect(dates).toEqual('Sat, 12 Sept 2026 – Mon, 14 Sept 2026');
    expect(times).toEqual('10:00 – 17:45');
    expect(formatSeminarSchedule(intl, { seminar_date: '12–14 Sep' })).toEqual({
      dates: '12–14 Sep',
      times: null,
    });
    expect(formatSeminarSchedule(intl, {})).toBeNull();
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
});
