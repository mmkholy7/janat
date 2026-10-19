import { describe, expect, it } from 'vitest';
import { addDays, calendarInvite, dateKey, fastDay, hijriDate, upcomingDays } from './calendar';

describe('fasting calendar', () => {
  it('uses the supported Umm al-Qura calendar for 1448', () => {
    expect(hijriDate(new Date(2026, 9, 19, 12)).year).toBe(1448);
  });
  it('includes Mondays and Thursdays, but not an ordinary Tuesday', () => {
    expect(fastDay(new Date(2026, 9, 19, 12))?.reasons).toContain('weekly');
    expect(fastDay(new Date(2026, 9, 22, 12))?.reasons).toContain('weekly');
    expect(fastDay(new Date(2026, 9, 20, 12))).toBeNull();
  });
  it('includes white days, deduplicates overlaps, and excludes prohibited dates', () => {
    const start = new Date(2026, 5, 1, 12);
    const days = upcomingDays(start, 150);
    expect(new Set(days.map(day => day.key)).size).toBe(days.length);
    expect(days.some(day => day.reasons.length === 2)).toBe(true);
    for (let offset = 0; offset < 400; offset++) {
      const date = addDays(start, offset);
      const hijri = hijriDate(date);
      if ((hijri.month === 10 && hijri.day === 1) || (hijri.month === 12 && hijri.day >= 10 && hijri.day <= 13)) expect(fastDay(date)).toBeNull();
      else if (hijri.day >= 13 && hijri.day <= 15) expect(fastDay(date)?.reasons).toContain('white');
    }
  });
  it('applies local date adjustments and exports day-before reminders', () => {
    const date = new Date(2026, 9, 19, 12);
    expect(hijriDate(date, 1)).toEqual(hijriDate(addDays(date, 1)));
    const result = calendarInvite(upcomingDays(date, 2), 'Fast, with intention', 'A reminder; tomorrow');
    expect(result.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(result).toContain('TRIGGER:-P1D');
    expect(result).toContain('SUMMARY:Fast\\, with intention');
    expect(result).toContain(`DTSTART;VALUE=DATE:${dateKey(date).replace(/-/g, '')}`);
  });
  it('keeps Quran reminders distinct and folds Arabic lines by UTF-8 byte length', () => {
    const date = new Date(2026, 9, 20, 12);
    const result = calendarInvite([{ date, key: dateKey(date) }], 'تلاوة القرآن', 'مراجعة القرآن الكريم '.repeat(20), 'quran');
    expect(result).toContain('UID:quran-2026-10-20@janat.local');
    expect(result).not.toContain('UID:fast-');
    expect(result.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });
});