const dates = require('../src/utils/dates');

describe('utils/dates', () => {
  describe('toDate', () => {
    it('parses ISO strings and passes Date instances through', () => {
      const parsed = dates.toDate('2026-03-04T10:00:00.000Z');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe('2026-03-04T10:00:00.000Z');

      const same = new Date();
      expect(dates.toDate(same)).toBe(same);
    });

    it('returns null for missing or unparseable values', () => {
      expect(dates.toDate(undefined)).toBeNull();
      expect(dates.toDate('')).toBeNull();
      expect(dates.toDate('not-a-date')).toBeNull();
    });
  });

  describe('startOfDay / endOfDay', () => {
    it('brackets the UTC day', () => {
      const start = dates.startOfDay('2026-03-04T13:45:12.000Z');
      const end = dates.endOfDay('2026-03-04T13:45:12.000Z');

      expect(start.toISOString()).toBe('2026-03-04T00:00:00.000Z');
      expect(end.toISOString()).toBe('2026-03-04T23:59:59.999Z');
    });
  });

  describe('addDays / addMinutes', () => {
    it('shifts by whole days and minutes', () => {
      expect(dates.addDays('2026-03-04T00:00:00.000Z', 3).toISOString()).toBe('2026-03-07T00:00:00.000Z');
      expect(dates.addMinutes('2026-03-04T00:00:00.000Z', 90).toISOString()).toBe('2026-03-04T01:30:00.000Z');
    });
  });

  describe('toDateOnly', () => {
    it('formats DATEONLY values as YYYY-MM-DD in UTC', () => {
      expect(dates.toDateOnly('2026-12-25T23:30:00.000Z')).toBe('2026-12-25');
    });
  });

  describe('isPast', () => {
    it('treats yesterday as past and tomorrow as future', () => {
      expect(dates.isPast(dates.addDays(new Date(), -1))).toBe(true);
      expect(dates.isPast(dates.addDays(new Date(), 1))).toBe(false);
    });

    it('is false for unusable input rather than throwing', () => {
      expect(dates.isPast(null)).toBe(false);
      expect(dates.isPast('nonsense')).toBe(false);
    });
  });

  describe('calculateAge', () => {
    it('counts whole years and clamps month/day before subtracting', () => {
      expect(dates.calculateAge('1990-01-01')).toBeGreaterThanOrEqual(35);
      expect(dates.calculateAge('1990-12-31')).toBeGreaterThanOrEqual(35);
    });

    it('does not go negative before a birthday in the current year', () => {
      const birthday = new Date();
      birthday.setFullYear(birthday.getFullYear() - 10);
      birthday.setMonth(11, 31);
      expect(dates.calculateAge(birthday.toISOString().slice(0, 10))).toBeGreaterThanOrEqual(9);
    });
  });

  describe('daysBetween', () => {
    it('is zero for the same instant and positive across days', () => {
      expect(dates.daysBetween('2026-03-04T00:00:00.000Z', '2026-03-04T00:00:00.000Z')).toBe(0);
      expect(dates.daysBetween('2026-03-04T00:00:00.000Z', '2026-03-07T00:00:00.000Z')).toBe(3);
    });
  });

  describe('combineDateTime', () => {
    it('builds a UTC timestamp from a date and 24-hour time', () => {
      expect(dates.combineDateTime('2026-03-04', '14:30').toISOString()).toBe('2026-03-04T14:30:00.000Z');
    });

    it('defaults a missing time to midnight', () => {
      expect(dates.combineDateTime('2026-03-04').toISOString()).toBe('2026-03-04T00:00:00.000Z');
    });
  });

  describe('timeToMinutes', () => {
    it('orders slots by minutes since midnight', () => {
      expect(dates.timeToMinutes('09:30')).toBe(570);
      expect(dates.timeToMinutes('00:00')).toBe(0);
      expect(dates.timeToMinutes(undefined)).toBe(0);
    });
  });
});