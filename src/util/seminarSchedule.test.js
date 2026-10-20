import {
  formatSeminarSchedule,
  fromUnixSeconds,
  getSeminarScheduleInitialValues,
  getSeminarSchedulePublicData,
  toUnixSeconds,
  withoutLegacySeminarFields,
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
    };
    const publicData = getSeminarSchedulePublicData(values);
    expect(publicData).toEqual({
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
});
