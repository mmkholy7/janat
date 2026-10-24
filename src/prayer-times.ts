import { CalculationMethod, Coordinates, HighLatitudeRule, PolarCircleResolution, PrayerTimes } from 'adhan';
import type { TimedEvent } from './calendar';
import type { MethodId } from './cities';
import type { RamadanDay } from './ramadan';

export type FastTimes = { fajr: Date; maghrib: Date };

/** Fajr (the end of suhoor) and Maghrib (iftar) on the calendar day of `date` at a place, or null where they cannot be resolved (very near the poles). */
export function fastTimes(date: Date, lat: number, lng: number, method: MethodId): FastTimes | null {
  const coordinates = new Coordinates(lat, lng);
  const params = CalculationMethod[method]();
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  params.polarCircleResolution = PolarCircleResolution.AqrabYaum;
  const times = new PrayerTimes(coordinates, new Date(date.getFullYear(), date.getMonth(), date.getDate()), params);
  return Number.isNaN(times.fajr.getTime()) || Number.isNaN(times.maghrib.getTime()) ? null : { fajr: times.fajr, maghrib: times.maghrib };
}

type EventCopy = { suhoorEvent: string; iftarEvent: string; ramadanDay: string; timesNote: string };
const HALF_HOUR = 30 * 60000;

/** Suhoor ends at Fajr and iftar begins at Maghrib, so each event sits on the side of the moment that matters. */
export function ramadanEvents(days: RamadanDay[], lat: number, lng: number, method: MethodId, copy: EventCopy, formatNumber: (value: number) => string): TimedEvent[] {
  return days.flatMap(day => {
    const times = fastTimes(day.date, lat, lng, method);
    if (!times) return [];
    const description = `${copy.ramadanDay.replace('{n}', formatNumber(day.day))}\n${copy.timesNote}`;
    return [
      { uid: `suhoor-${day.key}`, start: new Date(times.fajr.getTime() - HALF_HOUR), end: times.fajr, title: copy.suhoorEvent, description },
      { uid: `iftar-${day.key}`, start: times.maghrib, end: new Date(times.maghrib.getTime() + HALF_HOUR), title: copy.iftarEvent, description },
    ];
  });
}
