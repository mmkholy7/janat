import { describe, expect, it } from 'vitest';
import { addDays, calendarEventLinks, calendarInvite, calendarSubscriptionLinks, dateKey, fastDay, hijriDate, upcomingDays } from './calendar';
import { onRequest } from '../functions/api/calendar';

describe('fasting calendar', () => {
  it('links providers to the full subscription URL without losing preferences', () => {
    const feed = 'https://janat.uably.com/api/calendar?activity=fast&lang=ar&weekly=false&white=true&adjustment=1';
    const links = calendarSubscriptionLinks(feed, 'تقويم جنات');
    expect(new URL(links.google).searchParams.get('cid')).toBe(feed);
    expect(new URL(links.outlook).searchParams.get('url')).toBe(feed);
    expect(new URL(links.office365).searchParams.get('name')).toBe('تقويم جنات');
    expect(links.apple).toBe(feed.replace('https:', 'webcal:'));
    expect(() => calendarSubscriptionLinks('javascript:alert(1)', 'Janat')).toThrow();
  });
  it('serves a rolling public feed with valid dates and distinct activity IDs', async () => {
    const response = onRequest({ request: new Request('https://example.com/api/calendar?activity=fast&weekly=false&lang=ar') });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/calendar;charset=utf-8');
    const body = await response.text();
    const dates = [...body.matchAll(/DTSTART;VALUE=DATE:(\d{4})(\d{2})(\d{2})/g)];
    expect(dates.length).toBeGreaterThan(20);
    expect(dates.every(([, year, month, day]) => {
      const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
      return fastDay(date)?.reasons.includes('white');
    })).toBe(true);
    expect(new Set([...body.matchAll(/UID:(.+)/g)].map(match => match[1])).size).toBe(dates.length);
    const quran = await onRequest({ request: new Request('https://example.com/api/calendar?activity=quran') }).text();
    expect(quran.match(/BEGIN:VEVENT/g)).toHaveLength(408);
    expect(quran).toContain('UID:quran-');
    expect(quran).not.toContain('UID:fast-');
  });
  it('rejects invalid feed parameters and write requests and supports HEAD', async () => {
    for (const query of ['lang=unknown', 'lang=toString', 'adjustment=42', 'activity=secret', 'weekly=false&white=false', 'weekly=yes', 'lang=en&lang=ar', 'email=private@example.com']) {
      expect(onRequest({ request: new Request(`https://example.com/api/calendar?${query}`) }).status).toBe(400);
    }
    expect(onRequest({ request: new Request('https://example.com/api/calendar', { method: 'POST' }) }).status).toBe(405);
    const response = onRequest({ request: new Request('https://example.com/api/calendar', { method: 'HEAD' }) });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
  it('opens correctly encoded all-day events in Google and Microsoft calendars', () => {
    const links = calendarEventLinks(new Date(2026, 11, 31, 12), 'صيام & intention', 'Hadith: a reminder\nTomorrow');
    const google = new URL(links.google);
    expect(google.hostname).toBe('calendar.google.com');
    expect(google.searchParams.get('text')).toBe('صيام & intention');
    expect(google.searchParams.get('dates')).toBe('20261231/20270101');
    for (const provider of ['outlook', 'office365'] as const) {
      const url = new URL(links[provider]);
      expect(url.searchParams.get('startdt')).toBe('2026-12-31');
      expect(url.searchParams.get('enddt')).toBe('2027-01-01');
      expect(url.searchParams.get('allday')).toBe('true');
      expect(url.searchParams.get('subject')).toBe('صيام & intention');
      expect(url.searchParams.get('body')).toBe('Hadith: a reminder\nTomorrow');
    }
  });
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