export type HijriDate = { year: number; month: number; day: number };
export type FastStatus = 'fasted' | 'missed';
export type FastDay = { date: Date; key: string; hijri: HijriDate; reasons: ('weekly' | 'white')[] };
const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  year: 'numeric', month: 'numeric', day: 'numeric',
});

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
}

export function hijriDate(date: Date, adjustment = 0): HijriDate {
  const parts = hijriFormatter.formatToParts(addDays(date, adjustment));
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function fastDay(date: Date, adjustment = 0): FastDay | null {
  const hijri = hijriDate(date, adjustment);
  if ((hijri.month === 10 && hijri.day === 1) || (hijri.month === 12 && hijri.day >= 10 && hijri.day <= 13)) return null;
  const reasons: FastDay['reasons'] = [];
  if (date.getDay() === 1 || date.getDay() === 4) reasons.push('weekly');
  if (hijri.day >= 13 && hijri.day <= 15) reasons.push('white');
  return reasons.length ? { date, key: dateKey(date), hijri, reasons } : null;
}

export function upcomingDays(start: Date, count = 6, adjustment = 0): FastDay[] {
  const result: FastDay[] = [];
  for (let offset = 0; result.length < count && offset < 400; offset++) {
    const day = fastDay(addDays(start, offset), adjustment);
    if (day) result.push(day);
  }
  return result;
}

export function calendarEventLinks(date: Date, title: string, description: string) {
  const start = dateKey(date);
  const end = dateKey(addDays(date, 1));
  const google = new URL('https://calendar.google.com/calendar/render');
  google.search = new URLSearchParams({ action: 'TEMPLATE', text: title, details: description, dates: `${start.replace(/-/g, '')}/${end.replace(/-/g, '')}` }).toString();
  const outlookParams = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: title, body: description, startdt: start, enddt: end, allday: 'true' });
  return {
    google: google.href,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams}`,
    office365: `https://outlook.office.com/calendar/0/deeplink/compose?${outlookParams}`,
  };
}

export function calendarSubscriptionLinks(feedUrl: string, title: string) {
  const feed = new URL(feedUrl);
  if (!['http:', 'https:'].includes(feed.protocol)) throw new Error('Unsupported calendar URL');
  const microsoft = new URLSearchParams({ url: feed.href, name: title });
  const webcal = new URL(`webcal:${feed.href.slice(feed.protocol.length)}`);
  return {
    google: `https://calendar.google.com/calendar/r?${new URLSearchParams({ cid: feed.href })}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?${microsoft}`,
    office365: `https://outlook.office.com/calendar/0/addfromweb?${microsoft}`,
    apple: webcal.href,
  };
}

export function calendarInvite(days: Pick<FastDay, 'date' | 'key'>[], title: string, description: string, activity: 'fast' | 'quran' = 'fast'): string {
  const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Janat//Activity Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escape(title)}`];
  for (const day of days) {
    lines.push('BEGIN:VEVENT', `UID:${activity}-${day.key}@janat.local`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day.key.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${dateKey(addDays(day.date, 1)).replace(/-/g, '')}`,
      `SUMMARY:${escape(title)}`, `DESCRIPTION:${escape(description)}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${escape(title)}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const encoder = new TextEncoder();
  return lines.map(line => {
    let folded = ''; let width = 0;
    for (const char of line) {
      const bytes = encoder.encode(char).length;
      if (width + bytes > 75) { folded += '\r\n '; width = 1; }
      folded += char; width += bytes;
    }
    return folded;
  }).join('\r\n') + '\r\n';
}