import { addDays, dateKey, fastDay, fastDaysBetween, hijriDate, type FastDay } from './calendar';

// Search pages ("White Days November 2026", "Day of Arafah 2027", …) are generated from this data at build time.
// Dates follow Umm al-Qura with no adjustment, like the app's default.

/** The first month with its own page. Fixed, so published pages never disappear. */
export const FIRST_PAGE_MONTH = new Date(2026, 9, 1, 12);

export type Occasion = 'ramadan' | 'shawwal' | 'arafah' | 'ashura';
export type Marker = 'ramadan' | 'eid-fitr' | 'arafah' | 'eid-adha' | 'tashriq' | 'tasua' | 'ashura';
export type Fact = { label: 'firstDay' | 'lastDay' | 'eidFitr' | 'shawwalDays' | 'arafah' | 'eidAdha' | 'tashriq' | 'tasua' | 'ashura'; start: Date; end?: Date; noFast?: boolean };
export type OccasionPage = { kind: Occasion; slug: string; hijriYear: number; year: number; main: Date; start: Date; end: Date; facts: Fact[] };
export type MonthPage = { slug: string; year: number; month: number; start: Date; end: Date };
export type WhiteGroup = { hijriMonth: number; hijriYear: number; days: FastDay[] };
export type DatedFast = { date: Date; key: string; reasons: FastDay['reasons']; marker: Marker | null };

export const occasions: Occasion[] = ['ramadan', 'shawwal', 'arafah', 'ashura'];

const monthStart = (year: number, month: number) => new Date(year, month, 1, 12);
const monthEnd = (year: number, month: number) => new Date(year, month + 1, 0, 12);
const pad = (value: number) => String(value).padStart(2, '0');

/** Pages cover every month from FIRST_PAGE_MONTH to the end of next year, so a monthly rebuild keeps them ahead. */
export function pageWindow(today: Date) {
  return { start: FIRST_PAGE_MONTH, end: monthEnd(Math.max(today.getFullYear() + 1, FIRST_PAGE_MONTH.getFullYear()), 11) };
}

export function monthPages(today: Date): MonthPage[] {
  const { start, end } = pageWindow(today);
  const pages: MonthPage[] = [];
  for (let date = start; date <= end; date = monthStart(date.getFullYear(), date.getMonth() + 1)) {
    const year = date.getFullYear(), month = date.getMonth();
    pages.push({ slug: `${year}-${pad(month + 1)}`, year, month, start: monthStart(year, month), end: monthEnd(year, month) });
  }
  return pages;
}

export function yearPages(today: Date): number[] {
  const { start, end } = pageWindow(today);
  return Array.from({ length: end.getFullYear() - start.getFullYear() + 1 }, (_, index) => start.getFullYear() + index);
}

export function marker(date: Date): Marker | null {
  const { month, day } = hijriDate(date);
  if (month === 9) return 'ramadan';
  if (month === 10 && day === 1) return 'eid-fitr';
  if (month === 12 && day === 9) return 'arafah';
  if (month === 12 && day === 10) return 'eid-adha';
  if (month === 12 && day >= 11 && day <= 13) return 'tashriq';
  if (month === 1 && day === 9) return 'tasua';
  if (month === 1 && day === 10) return 'ashura';
  return null;
}

export const noFastMarkers: Marker[] = ['eid-fitr', 'eid-adha', 'tashriq'];
export const specialFastMarkers: Marker[] = ['arafah', 'tasua', 'ashura'];

/** Sunnah fasts in a range: the app's Mondays, Thursdays and White Days, plus Arafah, Tasu‘a and Ashura. */
export function fastsBetween(start: Date, end: Date): DatedFast[] {
  const result: DatedFast[] = [];
  for (let date = addDays(start, 0); dateKey(date) <= dateKey(end); date = addDays(date, 1)) {
    const day = fastDay(date), mark = marker(date);
    if (day || (mark && specialFastMarkers.includes(mark))) result.push({ date, key: dateKey(date), reasons: day?.reasons ?? [], marker: mark });
  }
  return result;
}

/** White Days of every Hijri month that touches the range, including days just outside it. */
export function whiteGroups(start: Date, end: Date): WhiteGroup[] {
  const groups = new Map<string, WhiteGroup>();
  for (const day of fastDaysBetween(addDays(start, -2), addDays(end, 2))) {
    if (!day.reasons.includes('white')) continue;
    const id = `${day.hijri.year}-${day.hijri.month}`;
    if (!groups.has(id)) groups.set(id, { hijriMonth: day.hijri.month, hijriYear: day.hijri.year, days: [] });
    groups.get(id)!.days.push(day);
  }
  return [...groups.values()].filter(group => group.days.some(day => day.key >= dateKey(start) && day.key <= dateKey(end)));
}

/** Ramadan, the six days of Shawwal, the Day of Arafah and Ashura, keyed by the Gregorian year of their main day. */
export function occasionsBetween(start: Date, end: Date): OccasionPage[] {
  const index = new Map<string, Date>();
  for (let date = addDays(start, -400); date <= addDays(end, 400); date = addDays(date, 1)) {
    const hijri = hijriDate(date);
    index.set(`${hijri.year}-${hijri.month}-${hijri.day}`, date);
  }
  const find = (year: number, month: number, day: number) => index.get(`${year}-${month}-${day}`);
  const last = (year: number, month: number) => find(year, month, 30) ?? find(year, month, 29);
  const pages: OccasionPage[] = [];
  const first = hijriDate(start).year - 1, final = hijriDate(end).year + 1;
  for (let hijriYear = first; hijriYear <= final; hijriYear++) {
    const ramadan = [find(hijriYear, 9, 1), last(hijriYear, 9), find(hijriYear, 10, 1)];
    const shawwal = [find(hijriYear, 10, 2), last(hijriYear, 10)];
    const dhulHijjah = [find(hijriYear, 12, 9), find(hijriYear, 12, 10), find(hijriYear, 12, 11), find(hijriYear, 12, 13)];
    const muharram = [find(hijriYear, 1, 9), find(hijriYear, 1, 10)];
    const candidates: (Omit<OccasionPage, 'slug' | 'year'> | null)[] = [
      ramadan.every(Boolean) ? { kind: 'ramadan', hijriYear, main: ramadan[0]!, start: ramadan[0]!, end: ramadan[1]!, facts: [{ label: 'firstDay', start: ramadan[0]! }, { label: 'lastDay', start: ramadan[1]! }, { label: 'eidFitr', start: ramadan[2]!, noFast: true }] } : null,
      shawwal.every(Boolean) && ramadan[2] ? { kind: 'shawwal', hijriYear, main: shawwal[0]!, start: shawwal[0]!, end: shawwal[1]!, facts: [{ label: 'eidFitr', start: ramadan[2], noFast: true }, { label: 'shawwalDays', start: shawwal[0]!, end: shawwal[1]! }] } : null,
      dhulHijjah.every(Boolean) ? { kind: 'arafah', hijriYear, main: dhulHijjah[0]!, start: dhulHijjah[0]!, end: dhulHijjah[0]!, facts: [{ label: 'arafah', start: dhulHijjah[0]! }, { label: 'eidAdha', start: dhulHijjah[1]!, noFast: true }, { label: 'tashriq', start: dhulHijjah[2]!, end: dhulHijjah[3]!, noFast: true }] } : null,
      muharram.every(Boolean) ? { kind: 'ashura', hijriYear, main: muharram[1]!, start: muharram[0]!, end: muharram[1]!, facts: [{ label: 'tasua', start: muharram[0]! }, { label: 'ashura', start: muharram[1]! }] } : null,
    ];
    for (const candidate of candidates) {
      if (!candidate || dateKey(candidate.main) < dateKey(start) || dateKey(candidate.main) > dateKey(end)) continue;
      const year = candidate.main.getFullYear();
      // Ramadan can begin twice in one Gregorian year (e.g. 2030); the second one keeps its Hijri year in the slug.
      const taken = pages.some(page => page.kind === candidate.kind && page.year === year);
      pages.push({ ...candidate, year, slug: taken ? `${candidate.kind}-${year}-${hijriYear}` : `${candidate.kind}-${year}` });
    }
  }
  return pages.sort((a, b) => a.main.getTime() - b.main.getTime());
}

export const occasionPages = (today: Date) => { const { start, end } = pageWindow(today); return occasionsBetween(start, end); };
