import { addDays, calendarInvite, dateKey, fastDay } from '../../src/calendar';
import { messages, type Language } from '../../src/i18n';

export function onRequest({ request }: { request: Request }): Response {
  const headers = { 'Content-Type': 'text/plain;charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
  const params = new URL(request.url).searchParams;
  const allowed = ['activity', 'lang', 'weekly', 'white', 'adjustment'];
  const invalid = [...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1);
  const activity = params.get('activity') || 'fast';
  const language = params.get('lang') || 'en';
  const adjustment = params.get('adjustment') || '0';
  const weekly = params.get('weekly') || 'true';
  const white = params.get('white') || 'true';
  if (invalid || !['fast', 'quran'].includes(activity) || !Object.hasOwn(messages, language)
    || !['-1', '0', '1'].includes(adjustment) || !['true', 'false'].includes(weekly)
    || !['true', 'false'].includes(white) || (activity === 'fast' && weekly === 'false' && white === 'false')) {
    return new Response('Invalid calendar preferences', { status: 400, headers });
  }
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 12));
  const days: { date: Date; key: string }[] = [];
  for (let offset = 0; offset < 408; offset++) {
    const date = addDays(start, offset);
    if (activity === 'quran') { days.push({ date, key: dateKey(date) }); continue; }
    const day = fastDay(date, Number(adjustment));
    if (day && ((weekly === 'true' && day.reasons.includes('weekly')) || (white === 'true' && day.reasons.includes('white')))) days.push(day);
  }
  const copy = messages[language as Language];
  const title = activity === 'quran' ? copy.quranInviteTitle : copy.inviteTitle;
  const body = activity === 'quran' ? copy.quranInviteBody : copy.inviteBody;
  const calendar = calendarInvite(days, `Janat | ${title}`, body, activity as 'fast' | 'quran');
  return new Response(request.method === 'HEAD' ? null : calendar, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': `inline; filename="janat-${activity}.ics"`,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}