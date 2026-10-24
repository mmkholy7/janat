import { describe, expect, it } from 'vitest';
import { currentRamadan, juzForDay, nextRamadanStart, parseKhatm, parseQada, qadaAllowed, qadaDay, ramadanDaysBetween } from './ramadan';
import { cities, cityName, defaultCity, findCity, isMethod, methods, nearestCity, roundCoordinate, validLatitude, validLongitude } from './cities';
import { fastTimes } from './prayer-times';
import { addDays, dateKey, hijriDate, timedCalendar } from './calendar';
import { languages } from './languages';

const noon = (key: string) => new Date(`${key}T12:00:00`);
const clock = (date: Date, timeZone: string) => new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);

describe('Ramadan dates', () => {
  it('finds the next Ramadan before it starts, and the current one while it lasts', () => {
    const next = currentRamadan(noon('2026-10-19'));
    expect(next.hijriYear).toBe(1448);
    expect(next.days[0]).toMatchObject({ key: '2027-02-08', day: 1 });
    expect(next.days.at(-1)).toMatchObject({ key: '2027-03-08', day: 29 });
    expect(currentRamadan(noon('2027-02-20')).days[0].key).toBe('2027-02-08');
    expect(currentRamadan(noon('2027-03-09')).hijriYear).toBe(1449);
  });

  it('moves with the one-day adjustment', () => {
    expect(currentRamadan(noon('2026-10-19'), 1).days[0].key).toBe('2027-02-07');
    expect(currentRamadan(noon('2026-10-19'), -1).days[0].key).toBe('2027-02-09');
  });

  it('gives the start of the following Ramadan, even during Ramadan', () => {
    expect(nextRamadanStart(noon('2026-10-19')).getTime()).toBe(noon('2027-02-08').getTime());
    expect(nextRamadanStart(noon('2027-02-20')).getTime()).toBe(noon('2028-01-28').getTime());
  });

  it('lists the Ramadan days inside a window with their day numbers', () => {
    const days = ramadanDaysBetween(noon('2027-03-06'), noon('2027-03-12'));
    expect(days.map(day => [day.key, day.day])).toEqual([['2027-03-06', 27], ['2027-03-07', 28], ['2027-03-08', 29]]);
  });

  it('spreads the 30 juz over the month', () => {
    expect(juzForDay(1, 30)).toEqual([1]);
    expect(juzForDay(30, 30)).toEqual([30]);
    expect(juzForDay(28, 29)).toEqual([28]);
    expect(juzForDay(29, 29)).toEqual([29, 30]);
    expect(juzForDay(0, 29)).toEqual([]);
    expect(juzForDay(30, 29)).toEqual([]);
  });
});

describe('stored Ramadan data', () => {
  it('keeps only valid, past and distinct make-up fasts', () => {
    expect(parseQada({ owed: 5, made: ['2026-10-01', '2026-10-01', '2026-02-30', '2026-12-01', 'x', 7, '1999-12-31'] }, '2026-10-19')).toEqual({ owed: 5, made: ['2026-10-01'] });
    expect(parseQada({ owed: -1 }, '2026-10-19')).toEqual({ owed: 0, made: [] });
    expect(parseQada({ owed: 2.5 }, '2026-10-19').owed).toBe(0);
    expect(parseQada({ owed: 10000 }, '2026-10-19').owed).toBe(0);
    expect(parseQada(null, '2026-10-19')).toEqual({ owed: 0, made: [] });
    expect(parseQada([1, 2], '2026-10-19')).toEqual({ owed: 0, made: [] });
  });

  it('keeps only juz numbers from 1 to 30', () => {
    expect(parseKhatm([3, 1, 3, 0, 31, 2.5, '4', 30])).toEqual([1, 3, 30]);
    expect(parseKhatm({})).toEqual([]);
  });

  it('skips Ramadan, both Eids and the days of Tashriq for make-up fasts', () => {
    expect(qadaAllowed(noon('2027-02-07'))).toBe(true);
    expect(qadaAllowed(noon('2027-02-08'))).toBe(false);
    expect(qadaAllowed(noon('2027-03-08'))).toBe(false);
    expect(qadaAllowed(noon('2027-03-09'))).toBe(false);
    expect(qadaAllowed(noon('2027-03-10'))).toBe(true);
    expect(dateKey(qadaDay(noon('2027-02-20'), 1))).toBe('2027-03-10');
    expect(dateKey(qadaDay(noon('2027-02-20'), -1))).toBe('2027-02-07');
    expect(dateKey(qadaDay(noon('2026-10-20'), 1))).toBe('2026-10-20');
    const blocked = Array.from({ length: 366 }, (_, index) => addDays(noon('2027-01-01'), index)).filter(day => !qadaAllowed(day)).map(day => hijriDate(day));
    expect(blocked.filter(day => day.month === 12).map(day => day.day)).toEqual([10, 11, 12, 13]);
    expect(blocked.filter(day => day.month === 10).map(day => day.day)).toEqual([1]);
    expect(qadaAllowed(noon('2027-02-07'), 1)).toBe(false);
  });
});

describe('cities', () => {
  it('has unique ids, valid places and a known method for each', () => {
    expect(new Set(cities.map(city => city.id)).size).toBe(cities.length);
    for (const city of cities) {
      expect(city.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(isMethod(city.method), city.id).toBe(true);
      expect(Math.abs(city.lat)).toBeLessThan(90);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: city.tz })).not.toThrow();
      for (const language of languages) expect(cityName(city, language).trim(), `${city.id} ${language}`).not.toBe('');
    }
  });

  it('defaults to a city in the visitor’s time zone, else one for their language', () => {
    expect(defaultCity('Asia/Karachi', 'en').id).toBe('karachi');
    expect(defaultCity('UTC', 'ur').id).toBe('karachi');
    expect(defaultCity(undefined, 'bn').id).toBe('dhaka');
  });

  it('finds the nearest city and validates rounded coordinates', () => {
    expect(nearestCity(51.45, -0.97).id).toBe('london');
    expect(nearestCity(24.9, 67.1).id).toBe('karachi');
    expect(roundCoordinate(51.50729)).toBe(51.51);
    expect(validLatitude(51.51)).toBe(true);
    expect(validLatitude(51.507)).toBe(false);
    expect(validLatitude(91)).toBe(false);
    expect(validLongitude(-179.99)).toBe(true);
    expect(validLongitude(Number.NaN)).toBe(false);
    expect(findCity('atlantis')).toBeUndefined();
    expect(findCity('__proto__')).toBeUndefined();
  });
});

describe('suhoor and iftar times', () => {
  it('matches known times for the first day of Ramadan 1448', () => {
    const at = (id: string) => { const city = findCity(id)!; const times = fastTimes(noon('2027-02-08'), city.lat, city.lng, city.method)!; return [clock(times.fajr, city.tz), clock(times.maghrib, city.tz)]; };
    expect(at('london')).toEqual(['05:51', '17:05']);
    expect(at('karachi')).toEqual(['05:53', '18:22']);
    expect(at('makkah')).toEqual(['05:38', '18:15']);
    expect(at('jakarta')).toEqual(['04:36', '18:17']);
  });

  it('works for every method and far from the equator', () => {
    for (const method of methods) {
      const times = fastTimes(noon('2027-02-08'), 69.65, 18.96, method);
      expect(times, method).not.toBeNull();
      expect(times!.maghrib.getTime() - times!.fajr.getTime(), method).toBeGreaterThan(0);
    }
  });

  it('gives no times where the sun cannot resolve them, instead of invalid dates', () => {
    expect(fastTimes(noon('2027-02-08'), 90, 0, 'MuslimWorldLeague')).toBeNull();
    expect(fastTimes(noon('2027-02-08'), -89.9, 10, 'MuslimWorldLeague')).toBeNull();
  });
});

describe('timed calendar', () => {
  it('writes UTC times with an alert at the start', () => {
    const ics = timedCalendar('Janat | Ramadan', [{ uid: 'iftar-2027-02-08', start: new Date('2027-02-08T17:05:00Z'), end: new Date('2027-02-08T17:35:00Z'), title: 'Iftar, Maghrib', description: 'Day 1; calculated' }]);
    expect(ics).toContain('DTSTART:20270208T170500Z\r\nDTEND:20270208T173500Z\r\n');
    expect(ics).toContain('UID:iftar-2027-02-08@janat.local');
    expect(ics).toContain('SUMMARY:Iftar\\, Maghrib');
    expect(ics).toContain('DESCRIPTION:Day 1\\; calculated');
    expect(ics).toContain('TRIGGER:PT0S');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
