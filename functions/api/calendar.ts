import { addDays, calendarInvite, dateKey, fastDay, timedCalendar } from '../../src/calendar';
import { cityName, findCity, isMethod, type City, type MethodId } from '../../src/cities';
import { messages } from '../../src/locales';
import { languageInfo, type Language } from '../../src/languages';
import { ramadanEvents } from '../../src/prayer-times';
import { ramadanDaysBetween } from '../../src/ramadan';

const allowed: Record<string, string[]> = {
  fast: ['activity', 'lang', 'weekly', 'white', 'adjustment'],
  quran: ['activity', 'lang', 'weekly', 'white', 'adjustment'],
  ramadan: ['activity', 'lang', 'adjustment', 'method', 'city', 'lat', 'lng'],
};
// Two decimals at most, so a feed never carries a precise location.
const coordinate = (value: string | null, limit: number) => value !== null && /^-?\d{1,3}(\.\d{1,2})?$/.test(value) && Math.abs(Number(value)) <= limit ? Number(value) : null;
type Place = { lat: number; lng: number; city?: City };

function place(params: URLSearchParams): Place | null {
  const city = params.get('city'), lat = params.get('lat'), lng = params.get('lng');
  if (city !== null) { const found = findCity(city); return found && lat === null && lng === null ? { lat: found.lat, lng: found.lng, city: found } : null; }
  const latitude = coordinate(lat, 90), longitude = coordinate(lng, 180);
  return latitude === null || longitude === null ? null : { lat: latitude, lng: longitude };
}

export function onRequest({ request }: { request: Request }): Response {
  const headers = { 'Content-Type': 'text/plain;charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
  const params = new URL(request.url).searchParams;
  const activity = params.get('activity') || 'fast';
  const keys = Object.hasOwn(allowed, activity) ? allowed[activity] : [];
  const invalid = [...params.keys()].some(key => !keys.includes(key) || params.getAll(key).length !== 1);
  const language = params.get('lang') || 'en';
  const adjustment = params.get('adjustment') || '0';
  const weekly = params.get('weekly') || 'true';
  const white = params.get('white') || 'true';
  const where = activity === 'ramadan' ? place(params) : null;
  const method = params.get('method') ?? where?.city?.method ?? 'MuslimWorldLeague';
  if (invalid || !Object.hasOwn(messages, language)
    || !['-1', '0', '1'].includes(adjustment) || !['true', 'false'].includes(weekly)
    || !['true', 'false'].includes(white) || (activity === 'fast' && weekly === 'false' && white === 'false')
    || (activity === 'ramadan' && (!where || !isMethod(method)))) {
    return new Response('Invalid calendar preferences', { status: 400, headers });
  }
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 12));
  const copy = messages[language as Language];
  let calendar: string;
  if (activity === 'ramadan') {
    const name = `Janat | ${copy.ramadanTimes}${where!.city ? ` · ${cityName(where!.city, language as Language)}` : ''}`;
    const number = new Intl.NumberFormat(languageInfo[language as Language].locale, { useGrouping: false });
    const days = ramadanDaysBetween(start, addDays(start, 407), Number(adjustment));
    calendar = timedCalendar(name, ramadanEvents(days, where!.lat, where!.lng, method as MethodId, copy, value => number.format(value)));
  } else {
    const days: { date: Date; key: string }[] = [];
    for (let offset = 0; offset < 408; offset++) {
      const date = addDays(start, offset);
      if (activity === 'quran') { days.push({ date, key: dateKey(date) }); continue; }
      const day = fastDay(date, Number(adjustment));
      if (day && ((weekly === 'true' && day.reasons.includes('weekly')) || (white === 'true' && day.reasons.includes('white')))) days.push(day);
    }
    const title = activity === 'quran' ? copy.quranInviteTitle : copy.inviteTitle;
    const body = activity === 'quran' ? copy.quranInviteBody : copy.inviteBody;
    calendar = calendarInvite(days, `Janat | ${title}`, body, activity as 'fast' | 'quran');
  }
  return new Response(request.method === 'HEAD' ? null : calendar, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': `inline; filename="janat-${activity}.ics"`,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
