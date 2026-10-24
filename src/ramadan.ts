import { addDays, dateKey, hijriDate } from './calendar';

export type RamadanDay = { date: Date; key: string; day: number };
export type Ramadan = { hijriYear: number; days: RamadanDay[] };
export type Qada = { owed: number; made: string[] };
export const MAX_OWED = 9999;

function monthFrom(first: Date, adjustment: number): Ramadan {
  const days: RamadanDay[] = [];
  for (let date = first; hijriDate(date, adjustment).month === 9; date = addDays(date, 1)) days.push({ date, key: dateKey(date), day: days.length + 1 });
  return { hijriYear: hijriDate(first, adjustment).year, days };
}

/** The first day of the next Ramadan after `today`. */
export function nextRamadanStart(today: Date, adjustment = 0): Date {
  for (let offset = 1; offset <= 400; offset++) {
    const date = addDays(today, offset);
    const hijri = hijriDate(date, adjustment);
    if (hijri.month === 9 && hijri.day === 1) return date;
  }
  throw new Error('No Ramadan within 400 days');
}

/** The Ramadan under way on `today`, or else the next one. */
export function currentRamadan(today: Date, adjustment = 0): Ramadan {
  const hijri = hijriDate(today, adjustment);
  return monthFrom(hijri.month === 9 ? addDays(today, 1 - hijri.day) : nextRamadanStart(today, adjustment), adjustment);
}

/** Every Ramadan day from `start` to `end`, both inclusive. */
export function ramadanDaysBetween(start: Date, end: Date, adjustment = 0): RamadanDay[] {
  const result: RamadanDay[] = [];
  for (let date = addDays(start, 0); dateKey(date) <= dateKey(end); date = addDays(date, 1)) {
    const hijri = hijriDate(date, adjustment);
    if (hijri.month === 9) result.push({ date, key: dateKey(date), day: hijri.day });
  }
  return result;
}

/** The juz to read on each day so the Quran is finished by the last night; a 29-day month doubles up on its last day. */
export function juzForDay(day: number, length: number): number[] {
  if (day < 1 || day > length) return [];
  return day === length && length < 30 ? Array.from({ length: 31 - day }, (_, index) => day + index) : [day];
}

/** Make-up fasts are not kept in Ramadan, on Eid al-Fitr, Eid al-Adha or the days of Tashriq. */
export function qadaAllowed(date: Date, adjustment = 0): boolean {
  const { month, day } = hijriDate(date, adjustment);
  return month !== 9 && !(month === 10 && day === 1) && !(month === 12 && day >= 10 && day <= 13);
}

/** The nearest day from `date`, moving by `step` days, on which a make-up fast can be kept. */
export function qadaDay(date: Date, step: 1 | -1, adjustment = 0): Date {
  let day = date;
  while (!qadaAllowed(day, adjustment)) day = addDays(day, step);
  return day;
}

const validKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && value >= '2000-01-01' && dateKey(new Date(`${value}T12:00:00`)) === value;

/** Stored make-up fasts, cleaned: unknown fields dropped, future or repeated dates removed. */
export function parseQada(value: unknown, todayKey: string): Qada {
  const raw = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Partial<Record<keyof Qada, unknown>>;
  const owed = Number.isInteger(raw.owed) && (raw.owed as number) >= 0 && (raw.owed as number) <= MAX_OWED ? raw.owed as number : 0;
  const made = Array.isArray(raw.made) ? [...new Set(raw.made.filter((key): key is string => validKey(key) && key <= todayKey))].sort() : [];
  return { owed, made };
}

/** The juz (1–30) marked as read. */
export function parseKhatm(value: unknown): number[] {
  return Array.isArray(value) ? [...new Set(value.filter((juz): juz is number => Number.isInteger(juz) && juz >= 1 && juz <= 30))].sort((a, b) => a - b) : [];
}
