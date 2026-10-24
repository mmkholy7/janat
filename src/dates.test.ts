import { describe, expect, it } from 'vitest';
import { dateKey } from './calendar';
import { fastsBetween, marker, monthPages, occasionPages, occasionsBetween, pageWindow, whiteGroups, yearPages } from './dates';

const day = (key: string) => new Date(`${key}T12:00:00`);
const keys = (dates: { date: Date }[] | Date[]) => dates.map(item => dateKey(item instanceof Date ? item : item.date));

describe('search page dates', () => {
  const today = day('2026-10-19');

  it('covers every month from October 2026 to the end of next year, without gaps', () => {
    const months = monthPages(today);
    expect(months[0].slug).toBe('2026-10');
    expect(months.at(-1)!.slug).toBe('2027-12');
    expect(months).toHaveLength(15);
    expect(yearPages(today)).toEqual([2026, 2027]);
    expect(monthPages(day('2027-01-05')).at(-1)!.slug).toBe('2028-12');
    expect(monthPages(day('2027-01-05'))[0].slug).toBe('2026-10');
    expect(dateKey(pageWindow(today).end)).toBe('2027-12-31');
  });

  it('finds the year’s occasions on their Umm al-Qura dates', () => {
    const pages = occasionPages(today);
    expect(pages.map(page => page.slug)).toEqual(['ramadan-2027', 'shawwal-2027', 'arafah-2027', 'ashura-2027']);
    const [ramadan, shawwal, arafah, ashura] = pages;
    expect([dateKey(ramadan.start), dateKey(ramadan.facts[2].start)]).toEqual(['2027-02-08', '2027-03-09']);
    expect(ramadan.hijriYear).toBe(1448);
    expect(dateKey(shawwal.start)).toBe('2027-03-10');
    expect(dateKey(arafah.main)).toBe('2027-05-15');
    expect(arafah.facts.find(fact => fact.label === 'eidAdha')).toMatchObject({ noFast: true });
    expect([dateKey(ashura.start), dateKey(ashura.main), ashura.hijriYear]).toEqual(['2027-06-14', '2027-06-15', 1449]);
  });

  it('keeps slugs unique when Ramadan begins twice in one year', () => {
    const ramadans = occasionsBetween(day('2030-01-01'), day('2030-12-31')).filter(page => page.kind === 'ramadan');
    expect(ramadans.map(page => page.slug)).toEqual(['ramadan-2030', 'ramadan-2030-1452']);
  });

  it('lists the White Days that touch a month, whole', () => {
    const october = whiteGroups(day('2026-10-01'), day('2026-10-31'));
    expect(october.map(group => keys(group.days))).toEqual([['2026-10-24', '2026-10-25', '2026-10-26']]);
    // 13 Dhul Hijjah is a day of Tashriq, so that month has only two White Days.
    const dhulHijjah = whiteGroups(day('2027-05-01'), day('2027-05-31')).find(group => group.hijriMonth === 12)!;
    expect(dhulHijjah.days.map(item => item.hijri.day)).toEqual([14, 15]);
  });

  it('adds Arafah and Ashura to the Sunnah fasts and leaves Eid out', () => {
    const may = fastsBetween(day('2027-05-01'), day('2027-05-31'));
    expect(may.find(fast => fast.key === '2027-05-15')).toMatchObject({ marker: 'arafah' });
    expect(may.some(fast => fast.key === '2027-05-16')).toBe(false);
    expect(marker(day('2027-05-16'))).toBe('eid-adha');
    const june = fastsBetween(day('2027-06-14'), day('2027-06-15'));
    expect(june.map(fast => fast.marker)).toEqual(['tasua', 'ashura']);
  });
});
