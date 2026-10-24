import { ArrowRight, ArrowUpRight, Ban, CalendarDays, CalendarHeart, CalendarPlus, ChevronDown, CodeXml, Cookie, Copy, Download, Globe, Hourglass, Languages, Linkedin, Mail, Moon, MoonStar, Quote, Share2, ShieldCheck, SlidersHorizontal, Sparkles, Star, Sun, Sunrise, Sunset } from 'lucide';
import { brandIcon, brands } from './brands';
import { addDays, calendarEventLinks, calendarInvite, calendarSubscriptionLinks, dateKey, fastDay, hijriDate } from './calendar';
import { cities, cityName, type City } from './cities';
import { datesCopy, type DatesCopy } from './dates-copy';
import { fastsBetween, marker, monthPages, noFastMarkers, occasionPages, occasionsBetween, pageWindow, specialFastMarkers, whiteGroups, yearPages, type DatedFast, type Fact, type Marker, type MonthPage, type OccasionPage, type WhiteGroup } from './dates';
import { collectionKeys, gradeKeys, hadiths, hadithUrl } from './hadith';
import { datesPath, languageInfo, languageLink, languagePath, languages, SITE_URL, type Language } from './languages';
import { messages } from './locales';
import type { Messages } from './locales/en';
import { fastTimes, type FastTimes } from './prayer-times';
import { ramadanDaysBetween } from './ramadan';
import { escapeHtml, metaTags } from './seo';
import { composeDaysText, shareLinks, shareNetworks, type ShareNetwork } from './share';
import { widgetCopy } from './widget-copy';
import { defaultWidget, WIDGET_HEIGHT, widgetSizes, widgetSnippet, widgetSrc } from './widget-snippet';

// Build-time renderer for the crawlable fasting-date pages (/fasting/, /fasting/2027/, /fasting/2026-11/, /fasting/ramadan-2027/, /fasting/ramadan-2027/london/ …).
// Each page is complete HTML with no app JavaScript; src/page.ts only adds consent, copy and native sharing.

export type DateSubject = { kind: 'hub' } | { kind: 'widget' } | { kind: 'year'; year: number } | { kind: 'month'; page: MonthPage } | { kind: 'occasion'; page: OccasionPage } | { kind: 'city'; page: OccasionPage; city: City };
export type DateSite = { today: Date; months: MonthPage[]; years: number[]; occasions: OccasionPage[]; allOccasions: OccasionPage[]; subjects: DateSubject[] };

export function dateSite(now: Date): DateSite {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const months = monthPages(today), years = yearPages(today), occasions = occasionPages(today);
  const { start, end } = pageWindow(today);
  return {
    today, months, years, occasions,
    // Occasions just outside the window still label days on the first and last month pages.
    allOccasions: occasionsBetween(addDays(start, -60), addDays(end, 60)),
    subjects: [{ kind: 'hub' }, { kind: 'widget' }, ...years.map(year => ({ kind: 'year', year }) as const), ...months.map(page => ({ kind: 'month', page }) as const), ...occasions.map(page => ({ kind: 'occasion', page }) as const),
      // Suhoor and iftar timetables for each city, for every Ramadan that has not ended yet.
      ...occasions.filter(page => page.kind === 'ramadan' && dateKey(page.end) >= dateKey(today)).flatMap(page => cities.map(city => ({ kind: 'city', page, city }) as const))],
  };
}

export const subjectSlug = (subject: DateSubject) => subject.kind === 'hub' ? '' : subject.kind === 'widget' ? 'widget' : subject.kind === 'year' ? String(subject.year) : subject.kind === 'city' ? citySlug(subject.page, subject.city) : subject.page.slug;
const citySlug = (page: OccasionPage, city: City) => `${page.slug}/${city.id}`;
export const subjectUrl = (subject: DateSubject) => (language: Language) => `${SITE_URL}${datesPath(language, subjectSlug(subject))}`;

// ---------- Icons (Lucide nodes serialized once, at build time) ----------
type SvgNode = readonly [string, Readonly<Record<string, string | number | undefined>>, (readonly SvgNode[])?];
const iconNodes = {
  'arrow-right': ArrowRight, 'arrow-up-right': ArrowUpRight, ban: Ban, 'calendar-days': CalendarDays, 'calendar-heart': CalendarHeart, 'calendar-plus': CalendarPlus,
  'chevron-down': ChevronDown, 'code-xml': CodeXml, cookie: Cookie, copy: Copy, download: Download, globe: Globe, hourglass: Hourglass, languages: Languages, linkedin: Linkedin, mail: Mail, moon: Moon, 'moon-star': MoonStar,
  quote: Quote, 'share-2': Share2, 'shield-check': ShieldCheck, 'sliders-horizontal': SlidersHorizontal, sparkles: Sparkles, star: Star, sun: Sun, sunrise: Sunrise, sunset: Sunset,
} as const;
type IconName = keyof typeof iconNodes;
const serialize = ([tag, attributes, children = []]: SvgNode, extra = ''): string =>
  `<${tag}${Object.entries(attributes).map(([name, value]) => ` ${name}="${value}"`).join('')}${extra}>${children.map(child => serialize(child)).join('')}</${tag}>`;
const iconCache = new Map<IconName, string>();
const icon = (name: IconName) => {
  if (!iconCache.has(name)) iconCache.set(name, serialize(iconNodes[name] as unknown as SvgNode, ` class="lucide lucide-${name}" aria-hidden="true"`));
  return iconCache.get(name)!;
};

// ---------- Dates and numbers in the page language ----------
const formatterCache = new Map<string, Intl.DateTimeFormat>();
function dateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  const id = `${locale}${JSON.stringify(options)}`;
  let formatter = formatterCache.get(id);
  if (!formatter) formatterCache.set(id, formatter = new Intl.DateTimeFormat(locale, options));
  return formatter;
}

const dayMonthYear: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

function formatters(language: Language) {
  // Arabic pages use Western digits, which is how most people type dates into a search box.
  const base = languageInfo[language].locale, digits = language === 'ar' ? '-nu-latn' : '';
  const gregory = `${base}-u-ca-gregory${digits}`, islamic = `${base}-u-ca-islamic-umalqura${digits}`;
  // ICU names the Hijri era "যুগ" ("era") in Bengali; readers expect "হিজরি".
  const era = (text: string) => language === 'bn' ? text.replace(/যুগ/g, 'হিজরি') : text;
  const g = (date: Date, options: Intl.DateTimeFormatOptions) => dateFormat(gregory, options).format(date);
  const h = (date: Date, options: Intl.DateTimeFormatOptions) => era(dateFormat(islamic, options).format(date));
  const numbers = new Intl.NumberFormat(gregory, { useGrouping: false });
  // Arabic reads "13 ساعة 4 دقائق" more naturally than the abbreviated "13 س 4 د".
  const unit = (name: 'hour' | 'minute') => new Intl.NumberFormat(gregory, { style: 'unit', unit: name, unitDisplay: language === 'ar' ? 'long' : 'short' });
  const hours = unit('hour'), minutes = unit('minute');
  const list = new Intl.ListFormat(base, { type: 'conjunction' });
  const same = (start: Date, end: Date) => dateKey(start) === dateKey(end);
  return {
    number: (value: number) => numbers.format(value),
    list: (items: string[]) => list.format(items),
    monthYear: (date: Date) => g(date, { month: 'long', year: 'numeric' }),
    month: (date: Date) => g(date, { month: 'long' }),
    weekdayShort: (date: Date) => g(date, { weekday: 'short' }),
    /** "Mon 8 Feb", for timetable rows */
    dayShort: (date: Date) => g(date, { weekday: 'short', day: 'numeric', month: 'short' }),
    /** A clock time where the city is, like the app's ("05:51", "5:51 AM"). */
    time: (date: Date, timeZone: string) => {
      const text = dateFormat(gregory, { hour: 'numeric', minute: '2-digit', timeZone }).format(date);
      // Urdu writes "5:51 AM"; isolate it so right-to-left text doesn't flip it to "AM 5:51".
      return languageInfo[language].dir === 'rtl' && /[A-Za-z]/.test(text) ? `\u2068${text}\u2069` : text;
    },
    /** "13 hrs 4 mins" */
    duration: (ms: number) => { const total = Math.round(ms / 60000); return `${hours.format(Math.floor(total / 60))} ${minutes.format(total % 60)}`; },
    /** "Monday 2 November 2026" */
    full: (date: Date) => g(date, { weekday: 'long', ...dayMonthYear }),
    /** "Monday 2 November" */
    day: (date: Date) => g(date, { weekday: 'long', day: 'numeric', month: 'long' }),
    /** "2–4 November 2026", "30 November – 2 December" */
    range: (start: Date, end: Date, withYear = true) => {
      const options: Intl.DateTimeFormatOptions = withYear ? dayMonthYear : { day: 'numeric', month: 'long' };
      return same(start, end) ? g(start, options) : dateFormat(gregory, options).formatRange(start, end);
    },
    hijri: (date: Date) => h(date, dayMonthYear),
    hijriMonth: (date: Date) => h(date, { month: 'long', year: 'numeric' }),
    hijriRange: (start: Date, end: Date) => {
      if (same(start, end)) return h(start, dayMonthYear);
      const first = hijriDate(start), last = hijriDate(end), format = dateFormat(islamic, dayMonthYear);
      if (first.month !== last.month || first.year !== last.year) return era(format.formatRange(start, end));
      // ICU's same-month Hijri ranges read oddly in Urdu and Bengali ("جمادی الثانی 13 – 15, 1448"), so reuse the single-date pattern.
      const endDay = format.formatToParts(end).find(part => part.type === 'day')?.value;
      return era(format.formatToParts(start).map(part => part.type === 'day' ? `${part.value}–${endDay}` : part.value).join(''));
    },
    /** "Jumada I – Jumada II 1448 AH", like the app's calendar header. */
    hijriSpan: (start: Date, end: Date) => {
      const first = hijriDate(start), last = hijriDate(end), tail = h(end, { month: 'long', year: 'numeric' });
      if (first.month === last.month && first.year === last.year) return tail;
      return `${first.year === last.year ? h(start, { month: 'long' }) : h(start, { month: 'long', year: 'numeric' })} – ${tail}`;
    },
  };
}
type Formatters = ReturnType<typeof formatters>;

// ---------- Rendering context ----------
type Context = { lang: Language; d: DatesCopy; m: Messages; f: Formatters; site: DateSite; subject: DateSubject; t: (value: string) => string };
type Crumb = { name: string; href: string; url: string };
type ShareDay = { label: string; detail: string };
type PageModel = { h1: string; title: string; description: string; eyebrow: string; crumbs: Crumb[]; action: string; main: string; actions?: string };

const attribute = escapeHtml;
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
const isFuture = (c: Context, date: Date) => dateKey(date) >= dateKey(c.site.today);
const overlaps = (start: Date, end: Date, from: Date, to: Date) => dateKey(start) <= dateKey(to) && dateKey(end) >= dateKey(from);
const factEnd = (fact: Fact) => fact.end ?? fact.start;
const markerLabels: Record<Marker, keyof DatesCopy> = { ramadan: 'ramadan', 'eid-fitr': 'eidFitr', arafah: 'arafah', 'eid-adha': 'eidAdha', tashriq: 'tashriq', tasua: 'tasua', ashura: 'ashura' };
const occasionIcons: Record<OccasionPage['kind'], IconName> = { ramadan: 'moon-star', shawwal: 'calendar-heart', arafah: 'star', ashura: 'star' };
const occasionHadith: Record<OccasionPage['kind'], string[]> = { ramadan: ['ramadan-faith', 'rayyan', 'shield'], shawwal: ['shawwal', 'three-days'], arafah: ['arafah', 'for-me'], ashura: ['ashura', 'ninth-muharram', 'muharram'] };
const sunnahHadith = ['white-days', 'three-days', 'deeds-presented'];

const monthOf = (c: Context, date: Date) => c.site.months.find(page => page.year === date.getFullYear() && page.month === date.getMonth());
const pageFor = (c: Context, occasion: OccasionPage) => c.site.occasions.find(page => page.kind === occasion.kind && dateKey(page.main) === dateKey(occasion.main));
const href = (c: Context, slug = '') => datesPath(c.lang, slug);
const crumb = (c: Context, name: string, slug: string): Crumb => ({ name, href: href(c, slug), url: `${SITE_URL}${href(c, slug)}` });
const baseCrumbs = (c: Context): Crumb[] => [{ name: 'Janat', href: languageLink(c.lang), url: `${SITE_URL}${languagePath(c.lang)}` }, crumb(c, c.d.nav, '')];
const yearCrumb = (c: Context, year: number) => c.site.years.includes(year) ? [crumb(c, c.f.number(year), String(year))] : [];
const occasionName = (c: Context, occasion: OccasionPage) => `${c.d[occasion.kind]} ${c.f.number(occasion.year)}`;

function occasionValues(c: Context, occasion: OccasionPage): Record<string, string> {
  const fact = (label: Fact['label']) => occasion.facts.find(item => item.label === label);
  const eid = fact('eidFitr') ?? fact('eidAdha');
  return {
    year: c.f.number(occasion.year), hijriYear: c.f.number(occasion.hijriYear),
    start: c.f.full(occasion.start), end: c.f.full(occasion.end), date: c.f.full(occasion.main),
    eid: eid ? c.f.full(eid.start) : '', tasua: fact('tasua') ? c.f.full(fact('tasua')!.start) : '',
  };
}

const sectionHeading = (title: string, id: string, options: { eyebrow?: string; glyph?: IconName; intro?: string } = {}) =>
  `<div class="section-heading"><div>${options.eyebrow ? `<span class="eyebrow green">${options.glyph ? icon(options.glyph) : ''}${options.eyebrow}</span>` : ''}<h2 id="${id}">${title}</h2>${options.intro ? `<p>${options.intro}</p>` : ''}</div></div>`;

function badges(c: Context, fast: DatedFast) {
  const { t, d, m } = c;
  return [
    ...(fast.marker && specialFastMarkers.includes(fast.marker) ? [`<span class="badge special">${icon('star')}${t(d[markerLabels[fast.marker]])}</span>`] : []),
    ...(fast.reasons.includes('white') ? [`<span class="badge white">${icon('moon')}${t(m.white)}</span>`] : []),
    ...(fast.reasons.includes('weekly') ? [`<span class="badge weekly">${icon('sun')}${t(m.weekly)}</span>`] : []),
  ].join('');
}

type Card = { glyph: IconName; tone: string; label: string; value: string; detail?: string; noFast?: boolean; link?: { href: string; label: string } };
const factCards = (c: Context, cards: Card[]) => `<div class="dates-facts">${cards.map(card => `<article class="dates-fact ${card.tone}"><span class="icon-tile">${icon(card.glyph)}</span><div class="dates-fact-body"><h3>${c.t(card.label)}</h3><p class="dates-fact-value">${c.t(card.value)}</p>${card.detail ? `<p class="dates-fact-detail">${c.t(card.detail)}</p>` : ''}${card.noFast ? `<span class="badge no-fast">${icon('ban')}${c.t(c.d.noFasting)}</span>` : ''}${card.link ? `<a class="text-button" href="${card.link.href}">${c.t(card.link.label)}${icon('arrow-right')}</a>` : ''}</div></article>`).join('')}</div>`;

function factCard(c: Context, fact: Fact, occasion: OccasionPage, linked: boolean): Card {
  const page = linked ? pageFor(c, occasion) : undefined;
  const glyph: IconName = fact.noFast ? 'ban' : fact.label === 'shawwalDays' ? 'calendar-heart' : ['firstDay', 'lastDay'].includes(fact.label) ? 'moon-star' : 'star';
  return {
    glyph, tone: fact.noFast ? 'no-fast' : fact.label === 'firstDay' || fact.label === 'lastDay' ? 'ramadan' : 'special', label: c.d[fact.label],
    value: fact.end ? c.f.range(fact.start, fact.end) : c.f.full(fact.start), detail: fact.end ? c.f.hijriRange(fact.start, fact.end) : c.f.hijri(fact.start),
    noFast: fact.noFast, link: page ? { href: href(c, page.slug), label: occasionName(c, page) } : undefined,
  };
}

const groupStart = (group: WhiteGroup) => group.days[0].date;
const groupEnd = (group: WhiteGroup) => group.days[group.days.length - 1].date;
const sunnahGroups = (start: Date, end: Date) => whiteGroups(start, end).filter(group => group.hijriMonth !== 9);

// ---------- Shared sections ----------
function providerChoices(c: Context, links: Record<string, string>) {
  const labels: Record<string, string> = { google: 'Google Calendar', outlook: 'Outlook.com', office365: 'Microsoft 365', apple: 'Apple Calendar' };
  return `<div class="provider-choices" role="group" aria-label="${attribute(c.m.calendarProvider)}">${Object.entries(links).map(([provider, url]) => `<a class="provider-link" data-provider="${provider}" href="${attribute(url)}" target="_blank" rel="noopener noreferrer">${icon('calendar-days')}<span>${labels[provider]}</span>${icon('arrow-up-right')}</a>`).join('')}</div>`;
}

type Subscription = { feed: string; title: string; body: string };
const fastSubscription = (c: Context): Subscription => ({ feed: `${SITE_URL}/api/calendar?${new URLSearchParams({ activity: 'fast', lang: c.lang, adjustment: '0', weekly: 'true', white: 'true' })}`, title: c.m.subscribeAll, body: c.m.subscribeAllBody });

function subscription(c: Context, { feed, title, body }: Subscription = fastSubscription(c)) {
  const { m, t } = c;
  return `<section class="subscription-options"><span class="badge recommended">${icon('sparkles')}${t(m.recommended)}</span><h3>${t(title)}</h3><p class="subscription-body">${t(body)}</p>${providerChoices(c, calendarSubscriptionLinks(feed, 'Janat'))}<details class="feed-link"><summary>${t(m.otherCalendarApps)}${icon('chevron-down')}</summary><div class="feed-url-row"><input class="subscription-url" aria-label="${attribute(m.subscriptionUrl)}" dir="ltr" readonly value="${attribute(feed)}"><button type="button" class="icon-button" data-action="copy" data-copied="${attribute(m.calendarUrlCopied)}" data-error="${attribute(m.clipboardError)}" aria-label="${attribute(m.copyCalendarUrl)}" title="${attribute(m.copyCalendarUrl)}">${icon('copy')}</button></div><p class="copy-status fine-print" role="status"></p></details><p class="fine-print">${t(m.feedNote)}</p></section>`;
}

const icsLink = (c: Context, ics: string, fileName: string) => `<a class="button outline" href="data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}" download="${fileName}">${icon('download')}${c.t(c.d.icsFile)}</a>`;

function addSection(c: Context, extra = '') {
  return `<section class="dates-section" id="calendar" aria-labelledby="calendar-title">${sectionHeading(c.t(c.d.addMonth), 'calendar-title', { eyebrow: c.t(c.m.reminders), glyph: 'calendar-plus', intro: c.t(c.m.feedPrivacy) })}<div class="dates-add">${subscription(c)}${extra}</div></section>`;
}

function hadithSection(c: Context, ids: string[]) {
  const { m, t, lang } = c;
  const items = ids.map(id => {
    const hadith = hadiths.find(item => item.id === id);
    if (!hadith) throw new Error(`Unknown hadith ${id}`);
    const reference = `${m[collectionKeys[hadith.collection]]} ${hadith.number}`;
    return `<figure class="dates-hadith-item"><blockquote cite="${hadithUrl(hadith)}"><p class="hadith-arabic" lang="ar" dir="rtl">${escapeHtml(hadith.arabic)}</p>${lang === 'ar' ? '' : `<p class="hadith-meaning">${t(m[hadith.key])}</p>`}</blockquote><figcaption><a class="hadith-source" href="${hadithUrl(hadith)}" target="_blank" rel="noopener noreferrer">${t(reference)}${icon('arrow-up-right')}</a><span class="grade">${t(m[gradeKeys[hadith.grade]])}</span></figcaption></figure>`;
  });
  return `<section class="hadith-banner dates-hadith" aria-labelledby="hadith-title"><div class="hadith-head"><div><h2 id="hadith-title">${icon('quote')}${t(c.d.whyTitle)}</h2><p class="hadith-intro">${t(m.hadithIntro)}</p></div></div><div class="dates-hadith-list">${items.join('')}</div></section>`;
}

const networkLabels = (c: Context): Record<ShareNetwork, string> => ({ whatsapp: brands.whatsapp.title, telegram: brands.telegram.title, facebook: brands.facebook.title, x: brands.x.title, threads: brands.threads.title, linkedin: 'LinkedIn', email: c.m.email });
const networkColors: Record<ShareNetwork, string> = { whatsapp: brands.whatsapp.color, telegram: brands.telegram.color, facebook: brands.facebook.color, x: brands.x.color, threads: brands.threads.color, linkedin: '#0A66C2', email: '#8a6a2f' };
const networkIcon = (network: ShareNetwork) => network === 'linkedin' ? icon('linkedin') : network === 'email' ? icon('mail') : brandIcon(network);

function shareSection(c: Context, heading: string, days: ShareDay[]) {
  const { m, t } = c;
  const url = subjectUrl(c.subject)(c.lang);
  const text = composeDaysText({ heading, days, invite: m.shareInvite });
  const links = shareLinks({ title: heading, text, url });
  const labels = networkLabels(c);
  return `<section class="dates-section dates-share" id="share" aria-labelledby="share-title">${sectionHeading(t(c.d.shareTitle), 'share-title', { eyebrow: t(m.share), glyph: 'share-2', intro: t(m.shareIntro) })}
    <div class="dates-share-card"><div class="share-networks">${shareNetworks.map(network => `<a class="share-link" data-network="${network}" href="${attribute(links[network])}" ${network === 'email' ? '' : 'target="_blank" rel="noopener noreferrer"'}><span class="share-circle" style="--brand:${networkColors[network]}">${networkIcon(network)}</span><span>${t(labels[network])}</span></a>`).join('')}</div>
    <div class="dates-actions"><button type="button" class="button primary" data-action="native-share" data-title="${attribute(heading)}" data-text="${attribute(text)}" data-url="${attribute(url)}" hidden>${icon('share-2')}${t(m.share)}</button><button type="button" class="button outline" data-action="copy" data-value="${attribute(`${text}\n${url}`)}" data-copied="${attribute(m.textCopied)}">${icon('copy')}${t(m.copyText)}</button></div><p class="copy-status fine-print" role="status"></p></div></section>`;
}

function linkRow(c: Context, links: { href: string; label: string; current?: boolean }[], label: string) {
  return `<section class="dates-section dates-more" aria-label="${attribute(label)}"><ul class="dates-links">${links.map(link => `<li><a class="dates-chip" href="${link.href}"${link.current ? ' aria-current="page"' : ''}>${c.t(link.label)}</a></li>`).join('')}</ul><p class="fine-print">${c.t(c.m.adjustHint)}</p></section>`;
}

const otherYears = (c: Context) => c.site.years.map(year => ({ href: href(c, String(year)), label: c.f.number(year), current: c.subject.kind === 'year' && c.subject.year === year }));
const citySubjects = (c: Context, page: OccasionPage) => c.site.subjects.filter((subject): subject is Extract<DateSubject, { kind: 'city' }> => subject.kind === 'city' && subject.page === page);

/** Links to every city's timetable for one Ramadan. */
function citySection(c: Context, page: OccasionPage) {
  const { d, t, f } = c;
  const links = citySubjects(c, page);
  if (!links.length) return '';
  const current = c.subject.kind === 'city' ? c.subject.city.id : undefined;
  return `<section class="dates-section dates-cities" id="cities" aria-labelledby="cities-title">${sectionHeading(t(d.citiesTitle), 'cities-title', { eyebrow: t(occasionName(c, page)), glyph: 'sunset', intro: t(fill(d.citiesIntro, { year: f.number(page.year) })) })}<ul class="dates-links">${links.map(({ city }) => `<li><a class="dates-chip" href="${href(c, citySlug(page, city))}"${city.id === current ? ' aria-current="page"' : ''}>${t(cityName(city, c.lang))}</a></li>`).join('')}</ul></section>`;
}

const occasionLinks = (c: Context) => c.site.occasions.map(page => ({ href: href(c, page.slug), label: occasionName(c, page), current: c.subject.kind === 'occasion' && c.subject.page.slug === page.slug }));

// ---------- Month pages ----------
function monthGrid(c: Context, page: MonthPage) {
  const { d, m, f, t } = c;
  const shift = (page.start.getDay() + 6) % 7, first = addDays(page.start, -shift);
  const weeks = Math.ceil((shift + page.end.getDate()) / 7);
  const seen = new Set<string>();
  const cells = Array.from({ length: weeks * 7 }, (_, index) => {
    const date = addDays(first, index), fast = fastDay(date), mark = marker(date);
    let kind = '', glyphs: IconName[] = [], label = '';
    if (mark && noFastMarkers.includes(mark)) { kind = 'no-fast-day'; glyphs = ['ban']; label = d[markerLabels[mark]]; }
    else if (mark && specialFastMarkers.includes(mark)) { kind = 'fast-day special-day'; glyphs = ['star']; label = d[markerLabels[mark]]; }
    else if (mark === 'ramadan') { kind = 'ramadan-day'; glyphs = ['moon-star']; label = d.ramadan; }
    else if (fast?.reasons.includes('white')) { kind = 'fast-day white-day'; glyphs = fast.reasons.includes('weekly') ? ['moon', 'sun'] : ['moon']; label = m.white; }
    else if (fast) { kind = 'fast-day'; glyphs = ['sun']; label = f.weekdayShort(date); }
    const outside = date.getMonth() !== page.month;
    if (!outside && kind) seen.add(kind.split(' ').pop()!);
    return `<div class="calendar-cell ${outside ? 'outside' : ''} ${kind}"><span class="cell-date">${f.number(date.getDate())}<small>${f.number(hijriDate(date).day)}</small></span><span class="cell-indicator">${glyphs.map(icon).join('')}<span>${t(label)}</span></span></div>`;
  });
  const weekdays = Array.from({ length: 7 }, (_, index) => `<div class="weekday">${t(f.weekdayShort(new Date(2026, 9, 19 + index, 12)))}</div>`).join('');
  const legend = [
    `<span><b class="legend-dot weekly"></b>${t(m.weekly)}</span>`, `<span><b class="legend-dot white"></b>${t(m.white)}</span>`,
    ...(seen.has('special-day') ? [`<span><b class="legend-dot special"></b>${t(d.specialDays)}</span>`] : []),
    ...(seen.has('ramadan-day') ? [`<span><b class="legend-dot ramadan"></b>${t(d.ramadan)}</span>`] : []),
    ...(seen.has('no-fast-day') ? [`<span><b class="legend-dot no-fast"></b>${t(d.noFasting)}</span>`] : []),
  ].join('');
  return `<div class="dates-month-grid" aria-hidden="true"><div class="calendar-grid">${weekdays}${cells.join('')}</div></div><div class="calendar-legend">${legend}</div>`;
}

function fastTable(c: Context, fasts: DatedFast[], labelledBy: string) {
  const { m, d, f, t } = c;
  return `<div class="dates-table-wrap"><table class="dates-table" aria-labelledby="${labelledBy}"><thead><tr><th scope="col">${t(m.sessionDate)}</th><th scope="col">${t(d.hijriDate)}</th><th scope="col">${t(d.fast)}</th></tr></thead><tbody>${fasts.map(fast => { const rowClass = [fast.reasons.includes('white') && 'white-row', fast.marker && specialFastMarkers.includes(fast.marker) && 'special-row'].filter(Boolean).join(' '); return `<tr${rowClass ? ` class="${rowClass}"` : ''}><th scope="row">${t(f.day(fast.date))}</th><td>${t(f.hijri(fast.date))}</td><td><span class="dates-tags">${badges(c, fast)}</span></td></tr>`; }).join('')}</tbody></table></div>`;
}

function monthModel(c: Context, page: MonthPage): PageModel {
  const { d, m, f, t, site } = c;
  const name = f.monthYear(page.start);
  const fasts = fastsBetween(page.start, page.end).filter(fast => fast.marker !== 'ramadan');
  const groups = sunnahGroups(page.start, page.end);
  const related = site.allOccasions.filter(occasion => occasion.facts.some(fact => overlaps(fact.start, factEnd(fact), page.start, page.end)));
  const ramadan = related.find(occasion => occasion.kind === 'ramadan' && overlaps(occasion.start, occasion.end, page.start, page.end));
  const whiteDates = f.list(groups.map(group => f.range(groupStart(group), groupEnd(group), false)));
  const whiteHijri = f.list(groups.map(group => f.hijriRange(groupStart(group), groupEnd(group))));
  const leads = [
    ...(groups.length ? [fill(d.monthLead, { month: name, dates: whiteDates, hijri: whiteHijri })] : []),
    ...(ramadan ? [fill(d.ramadanLead, occasionValues(c, ramadan))] : []),
  ];
  const description = leads.length ? leads.join(' ') : fill(d.everyFast, { month: name });
  const weekly = fasts.filter(fast => fast.reasons.includes('weekly'));
  const seenFacts = new Set<string>();
  const cards: Card[] = [
    ...(groups.length ? [{ glyph: 'moon' as const, tone: 'white', label: m.white, value: whiteDates, detail: whiteHijri }] : []),
    { glyph: 'sun', tone: 'weekly', label: m.weekly, value: fill(d.dayCount, { n: f.number(weekly.length) }), detail: f.list(weekly.map(fast => f.number(fast.date.getDate()))) },
    ...related.flatMap(occasion => occasion.facts
      .filter(fact => overlaps(fact.start, factEnd(fact), page.start, page.end))
      .filter(fact => { const id = `${fact.label}-${dateKey(fact.start)}`; if (seenFacts.has(id)) return false; seenFacts.add(id); return true; })
      .map(fact => factCard(c, fact, occasion, true))),
  ];
  const future = fasts.filter(fast => isFuture(c, fast.date));
  const only = future.length ? `<section class="dates-only"><h3>${t(m.onlyTheseDays)}</h3><div class="dates-actions"><a class="button outline" href="${languageLink(c.lang)}?add=${dateKey(page.start)}&amp;to=${dateKey(page.end)}">${icon('calendar-plus')}${t(m.setReminder)}</a>${icsLink(c, calendarInvite(future, m.inviteTitle, m.inviteBody), `janat-${page.slug}.ics`)}</div></section>` : '';
  const index = site.months.indexOf(page);
  const previous = site.months[index - 1], next = site.months[index + 1];
  const pager = `<div class="dates-pager">${previous ? `<a class="dates-pager-link previous" href="${href(c, previous.slug)}" rel="prev"><span>${t(m.previous)}</span><strong>${t(f.monthYear(previous.start))}</strong></a>` : '<span></span>'}${next ? `<a class="dates-pager-link next" href="${href(c, next.slug)}" rel="next"><span>${t(m.next)}</span><strong>${t(f.monthYear(next.start))}</strong></a>` : '<span></span>'}</div>`;
  const h1 = fill(d.monthTitle, { month: name });
  return {
    h1, title: fill(d.monthSeoTitle, { month: name }), description, eyebrow: f.hijriSpan(page.start, page.end), action: d.addMonth,
    crumbs: [...baseCrumbs(c), ...yearCrumb(c, page.year), crumb(c, f.month(page.start), page.slug)],
    main: `<section class="dates-section dates-summary">${factCards(c, cards)}</section>
      <section class="dates-section" aria-labelledby="fasts-title">${sectionHeading(t(fill(d.everyFast, { month: name })), 'fasts-title', { eyebrow: t(f.hijriSpan(page.start, page.end)), glyph: 'calendar-days', intro: t(m.adjustHint) })}${monthGrid(c, page)}${fastTable(c, fasts, 'fasts-title')}${pager}</section>
      ${addSection(c, only)}${hadithSection(c, ramadan ? ['ramadan-faith', ...sunnahHadith] : sunnahHadith)}${shareSection(c, h1, fasts.filter(fast => isFuture(c, fast.date) || !future.length).map(fast => ({ label: f.day(fast.date), detail: `${f.hijri(fast.date)} · ${[...(fast.marker && specialFastMarkers.includes(fast.marker) ? [d[markerLabels[fast.marker]]] : []), ...fast.reasons.map(reason => reason === 'white' ? m.white : m.weekly)].join(' · ')}` })))}
      ${linkRow(c, [{ href: href(c), label: d.allDates }, ...yearCrumb(c, page.year).map(item => ({ href: item.href, label: fill(d.yearTitle, { year: item.name }) })), ...occasionLinks(c)], d.allDates)}`,
  };
}

// ---------- Occasion pages ----------
function occasionModel(c: Context, page: OccasionPage): PageModel {
  const { d, m, f, t } = c;
  const values = occasionValues(c, page);
  const h1 = fill(d[`${page.kind}Title`], values), description = fill(d[`${page.kind}Lead`], values);
  const eyebrow = page.kind === 'ramadan' || page.kind === 'shawwal' ? f.hijriMonth(page.main) : f.hijri(page.main);
  const event = isFuture(c, page.end) ? `<section class="dates-event"><span class="badge">${icon(occasionIcons[page.kind])}${t(d[page.kind])}</span><h3>${t(h1)}</h3><p class="dates-event-range">${t(f.range(page.start, page.end))}<small>${t(f.hijriRange(page.start, page.end))}</small></p>${providerChoices(c, calendarEventLinks(page.start, h1, description, page.end))}<div class="dates-actions">${icsLink(c, calendarInvite([{ date: page.start, key: dateKey(page.start), last: page.end }], h1, description), `janat-${page.slug}.ics`)}</div><p class="fine-print">${t(m.eventNote)}</p></section>` : '';
  const month = monthOf(c, page.main);
  return {
    h1, title: fill(d[`${page.kind}SeoTitle`], values), description, eyebrow, action: m.setReminder,
    crumbs: [...baseCrumbs(c), ...yearCrumb(c, page.year), crumb(c, occasionName(c, page), page.slug)],
    main: `<section class="dates-section dates-summary">${factCards(c, page.facts.map(fact => factCard(c, fact, page, false)))}</section>
      ${citySection(c, page)}${addSection(c, event)}${hadithSection(c, occasionHadith[page.kind])}${shareSection(c, h1, page.facts.map(fact => ({ label: d[fact.label], detail: `${fact.end ? f.range(fact.start, fact.end) : f.full(fact.start)} · ${fact.end ? f.hijriRange(fact.start, fact.end) : f.hijri(fact.start)}${fact.noFast ? ` · ${d.noFasting}` : ''}` })))}
      ${linkRow(c, [{ href: href(c), label: d.allDates }, ...(month ? [{ href: href(c, month.slug), label: fill(d.monthTitle, { month: f.monthYear(month.start) }) }] : []), ...occasionLinks(c)], d.allDates)}`,
  };
}

// ---------- Ramadan timetables by city ----------
function cityModel(c: Context, page: OccasionPage, city: City): PageModel {
  const { d, m, f, t, lang } = c;
  const rows = ramadanDaysBetween(page.start, page.end).map(day => ({ day, times: fastTimes(day.date, city.lat, city.lng, city.method) }));
  const first = rows[0], last = rows[rows.length - 1];
  const time = (date: Date | undefined) => date ? f.time(date, city.tz) : '—';
  const length = (times: FastTimes | null) => times ? f.duration(times.maghrib.getTime() - times.fajr.getTime()) : '—';
  const times = (row: typeof first) => `${m.suhoorEnds} ${time(row.times?.fajr)} · ${m.iftar} ${time(row.times?.maghrib)}`;
  const name = cityName(city, lang), method = m[`method${city.method}`];
  const values = { ...occasionValues(c, page), city: name, method, fajr: time(first.times?.fajr), maghrib: time(first.times?.maghrib) };
  const h1 = fill(d.cityTitle, values);
  const eid = page.facts.find(fact => fact.label === 'eidFitr');
  const cards: Card[] = [
    { glyph: 'moon-star', tone: 'ramadan', label: d.firstDay, value: f.full(first.day.date), detail: times(first) },
    { glyph: 'moon-star', tone: 'ramadan', label: d.lastDay, value: f.full(last.day.date), detail: times(last) },
    { glyph: 'hourglass', tone: 'weekly', label: d.fastLength, value: `${length(first.times)} – ${length(last.times)}`, detail: d.fastLengthDetail },
    ...(eid ? [factCard(c, eid, page, false)] : []),
  ];
  const table = `<div class="dates-table-wrap"><table class="times-table" aria-labelledby="timetable-title"><thead><tr><th scope="col">${t(m.dayColumn)}</th><th scope="col">${t(m.dateColumn)}</th><th scope="col">${icon('sunrise')}${t(m.suhoorEnds)}</th><th scope="col">${icon('sunset')}${t(m.iftar)}</th></tr></thead><tbody>${rows.map(({ day, times: row }) => `<tr data-date="${day.key}"><th scope="row">${f.number(day.day)}</th><td>${t(f.dayShort(day.date))}</td><td>${t(time(row?.fajr))}</td><td>${t(time(row?.maghrib))}</td></tr>`).join('')}</tbody></table></div>`;
  const feed = `${SITE_URL}/api/calendar?${new URLSearchParams({ activity: 'ramadan', lang, adjustment: '0', method: city.method, city: city.id })}`;
  const companion = `<section class="dates-only"><h3>${t(m.ramadanBandTitle)}</h3><p>${t(m.ramadanBandLead)}</p><div class="dates-actions"><a class="button outline" href="${languageLink(lang)}?city=${city.id}#ramadan">${icon('moon-star')}${t(m.ramadanBandCta)}</a></div></section>`;
  const month = monthOf(c, page.start);
  return {
    h1, title: fill(d.citySeoTitle, values), description: fill(d.cityLead, values), eyebrow: f.hijriMonth(page.main), action: m.setReminder,
    crumbs: [...baseCrumbs(c), ...yearCrumb(c, page.year), crumb(c, occasionName(c, page), page.slug), crumb(c, name, citySlug(page, city))],
    actions: `<a class="button pale" href="#calendar">${icon('calendar-plus')}${t(m.setReminder)}</a><a class="button dates-ghost" href="#timetable">${icon('sunset')}${t(m.timetable)}</a>`,
    main: `<section class="dates-section dates-summary">${factCards(c, cards)}</section>
      <section class="dates-section" id="timetable" aria-labelledby="timetable-title">${sectionHeading(t(m.timetable), 'timetable-title', { eyebrow: t(`${name} · ${method}`), glyph: 'sunset', intro: t(m.timesNote) })}${table}<p class="fine-print dates-note">${t(m.ramadanSighting)}</p></section>
      <section class="dates-section" id="calendar" aria-labelledby="calendar-title">${sectionHeading(t(m.subscribeTimes), 'calendar-title', { eyebrow: t(m.reminders), glyph: 'calendar-plus', intro: t(m.feedPrivacy) })}<div class="dates-add">${subscription(c, { feed, title: `${name} · ${method}`, body: m.subscribeTimesBody })}${companion}</div></section>
      ${hadithSection(c, occasionHadith.ramadan)}${shareSection(c, h1, [
        { label: d.firstDay, detail: `${f.full(first.day.date)} · ${times(first)}` },
        { label: d.lastDay, detail: `${f.full(last.day.date)} · ${times(last)}` },
        ...(eid ? [{ label: d.eidFitr, detail: `${f.full(eid.start)} · ${d.noFasting}` }] : []),
      ])}
      ${citySection(c, page)}
      ${linkRow(c, [{ href: href(c), label: d.allDates }, ...(month ? [{ href: href(c, month.slug), label: fill(d.monthTitle, { month: f.monthYear(month.start) }) }] : []), ...occasionLinks(c)], d.allDates)}`,
  };
}

// ---------- Year pages ----------
function yearModel(c: Context, year: number): PageModel {
  const { d, m, f, t, site } = c;
  const start = new Date(year, 0, 1, 12), end = new Date(year, 11, 31, 12);
  const groups = sunnahGroups(start, end);
  const values = { year: f.number(year) };
  const h1 = fill(d.yearTitle, values);
  const rows = groups.map(group => {
    const page = monthOf(c, group.days.find(day => day.key >= dateKey(start))!.date);
    const range = t(f.range(groupStart(group), groupEnd(group), false));
    return `<tr${isFuture(c, groupEnd(group)) ? '' : ' class="past"'}><th scope="row">${t(f.hijriMonth(groupStart(group)))}</th><td>${page ? `<a href="${href(c, page.slug)}">${range}</a>` : range}</td></tr>`;
  }).join('');
  const special = occasionsBetween(start, end);
  const months = site.months.filter(page => page.year === year);
  return {
    h1, title: fill(d.yearSeoTitle, values), description: fill(d.yearLead, values), eyebrow: f.hijriSpan(start, end), action: d.addMonth,
    crumbs: [...baseCrumbs(c), crumb(c, f.number(year), String(year))],
    main: `<section class="dates-section" aria-labelledby="white-title">${sectionHeading(t(m.white), 'white-title', { eyebrow: t(h1), glyph: 'moon', intro: t(m.adjustHint) })}<div class="dates-table-wrap"><table class="dates-table" aria-labelledby="white-title"><thead><tr><th scope="col">${t(d.hijriMonth)}</th><th scope="col">${t(m.white)}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      ${special.length ? `<section class="dates-section" aria-labelledby="special-title">${sectionHeading(t(d.specialDays), 'special-title', { eyebrow: t(f.number(year)), glyph: 'star' })}${factCards(c, special.map(occasion => { const page = pageFor(c, occasion); return { glyph: occasionIcons[occasion.kind], tone: occasion.kind === 'ramadan' ? 'ramadan' : 'special', label: d[occasion.kind], value: f.range(occasion.start, occasion.end), detail: f.hijriRange(occasion.start, occasion.end), link: page ? { href: href(c, page.slug), label: occasionName(c, page) } : undefined }; }))}</section>` : ''}
      ${months.length ? `<section class="dates-section" aria-labelledby="months-title">${sectionHeading(t(d.byMonth), 'months-title', { eyebrow: t(f.number(year)), glyph: 'calendar-days' })}${monthCards(c, months)}</section>` : ''}
      ${addSection(c)}${hadithSection(c, sunnahHadith)}${shareSection(c, h1, groups.filter(group => isFuture(c, groupEnd(group))).map(group => ({ label: f.range(groupStart(group), groupEnd(group), false), detail: f.hijriRange(groupStart(group), groupEnd(group)) })))}
      ${linkRow(c, [{ href: href(c), label: d.allDates }, ...otherYears(c), ...occasionLinks(c)], d.allDates)}`,
  };
}

function monthCards(c: Context, months: MonthPage[]) {
  return `<ul class="dates-months">${months.map(page => {
    const groups = sunnahGroups(page.start, page.end);
    return `<li><a class="dates-month" href="${href(c, page.slug)}"><strong>${c.t(c.f.month(page.start))}</strong><span>${groups.length ? `${icon('moon')}${c.t(c.f.list(groups.map(group => c.f.range(groupStart(group), groupEnd(group), false))))}` : `${icon('moon-star')}${c.t(c.d.ramadan)}`}</span><small>${c.t(c.f.hijriSpan(page.start, page.end))}</small></a></li>`;
  }).join('')}</ul>`;
}

// ---------- Hub ----------
function hubModel(c: Context): PageModel {
  const { d, m, f, t, site } = c;
  const years = site.years.length > 1 ? `${f.number(site.years[0])}–${f.number(site.years[site.years.length - 1])}` : f.number(site.years[0]);
  const groups = sunnahGroups(site.today, addDays(site.today, 70)).filter(group => isFuture(c, groupEnd(group))).slice(0, 2);
  const upcoming = site.occasions.filter(page => isFuture(c, page.end)).slice(0, 3);
  type Item = { date: Date; html: string; share: ShareDay };
  const items: Item[] = [
    ...groups.map(group => {
      const page = monthOf(c, groupStart(group)) ?? monthOf(c, groupEnd(group));
      const range = f.range(groupStart(group), groupEnd(group)), hijri = f.hijriRange(groupStart(group), groupEnd(group));
      return { date: groupStart(group), share: { label: m.white, detail: `${range} · ${hijri}` }, html: `<a class="dates-card white" href="${page ? href(c, page.slug) : href(c)}"><span class="dates-card-label">${icon('moon')}${t(m.white)}</span><strong>${t(range)}</strong><small>${t(hijri)}</small><span class="dates-card-more">${t(page ? fill(d.monthTitle, { month: f.monthYear(page.start) }) : d.allDates)}${icon('arrow-right')}</span></a>` };
    }),
    ...upcoming.map(page => {
      const range = f.range(page.start, page.end), hijri = f.hijriRange(page.start, page.end);
      return { date: page.start, share: { label: d[page.kind], detail: `${range} · ${hijri}` }, html: `<a class="dates-card ${page.kind === 'ramadan' ? 'ramadan' : 'special'}" href="${href(c, page.slug)}"><span class="dates-card-label">${icon(occasionIcons[page.kind])}${t(d[page.kind])}</span><strong>${t(range)}</strong><small>${t(hijri)}</small><span class="dates-card-more">${t(occasionName(c, page))}${icon('arrow-right')}</span></a>` };
    }),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const current = dateKey(new Date(site.today.getFullYear(), site.today.getMonth(), 1, 12));
  const byYear = site.years.map(year => ({ year, months: site.months.filter(page => page.year === year && dateKey(page.start) >= current) })).filter(group => group.months.length);
  const values = { years };
  return {
    h1: d.hubTitle, title: fill(d.hubSeoTitle, values), description: fill(d.hubLead, values), eyebrow: m.tagline, action: d.addMonth,
    crumbs: baseCrumbs(c),
    main: `<section class="dates-section" aria-labelledby="coming-title">${sectionHeading(t(d.comingUp), 'coming-title', { eyebrow: t(m.nextDays), glyph: 'sparkles', intro: t(m.adjustHint) })}<div class="dates-cards">${items.map(item => item.html).join('')}</div></section>
      <section class="dates-section" aria-labelledby="months-title">${sectionHeading(t(d.byMonth), 'months-title', { eyebrow: t(years), glyph: 'calendar-days' })}${byYear.map(group => `<h3 class="dates-year-heading"><a href="${href(c, String(group.year))}">${t(fill(d.yearTitle, { year: f.number(group.year) }))}${icon('arrow-right')}</a></h3>${monthCards(c, group.months)}`).join('')}</section>
      ${addSection(c)}${hadithSection(c, sunnahHadith)}${shareSection(c, d.hubTitle, items.map(item => item.share))}${widgetPromo(c)}
      ${linkRow(c, [...otherYears(c).map(link => ({ ...link, label: fill(d.yearTitle, { year: link.label }) })), ...occasionLinks(c)], d.allDates)}`,
  };
}

// ---------- Website widget ----------
function widgetPromo(c: Context) {
  const { d, t } = c;
  return `<section class="dates-section"><a class="widget-promo" href="${href(c, 'widget')}"><span class="icon-tile">${icon('code-xml')}</span><span class="widget-promo-text"><strong>${t(d.widgetTitle)}</strong><small>${t(d.feature4)}</small></span><span class="text-button">${t(d.getCode)}${icon('arrow-right')}</span></a></section>`;
}

function widgetModel(c: Context): PageModel {
  const { d, f, t, lang } = c;
  const options = defaultWidget(lang);
  const snippet = widgetSnippet(options, { language: lang, title: widgetCopy[lang].title });
  const choice = (name: string, value: string, label: string, checked: boolean, detail = '') =>
    `<label class="segment"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${t(label)}${detail ? `<small dir="ltr">${t(detail)}</small>` : ''}</span></label>`;
  const group = (legend: string, choices: string) => `<fieldset class="builder-field"><legend>${t(legend)}</legend><div class="segmented">${choices}</div></fieldset>`;
  const px = (value: number) => `${f.number(value)} px`;
  const sizeLabels = { sidebar: d.sizeSidebar, card: d.sizeCard, full: d.sizeFull } as const;
  const width = widgetSizes[options.size];
  const features: [IconName, string, string][] = [['languages', d.feature1Title, d.feature1], ['moon', d.feature2Title, d.feature2], ['calendar-plus', d.feature3Title, d.feature3], ['shield-check', d.feature4Title, d.feature4]];
  const steps = [[d.step1Title, d.step1], [d.step2Title, d.step2], [d.step3Title, d.step3]];
  return {
    h1: d.widgetTitle, title: d.widgetSeoTitle, description: d.widgetLead, eyebrow: d.widgetEyebrow, action: d.getCode,
    crumbs: [...baseCrumbs(c), crumb(c, d.widgetNav, 'widget')],
    actions: `<a class="button pale" href="#builder">${icon('code-xml')}${t(d.getCode)}</a><a class="button dates-ghost" href="${href(c)}">${icon('calendar-days')}${t(d.allDates)}</a>`,
    main: `<section class="dates-section" id="builder" aria-labelledby="builder-title">${sectionHeading(t(d.builderTitle), 'builder-title', { eyebrow: t(d.widgetEyebrow), glyph: 'sliders-horizontal', intro: t(d.builderIntro) })}
      <div class="builder" data-widget-builder data-lang="${lang}">
        <form class="builder-controls" aria-labelledby="builder-title">
          <label class="builder-field"><span class="builder-label">${t(d.widgetLanguage)}</span><select name="lang"><option value="auto">${t(d.autoLanguage)}</option>${languages.map(code => `<option value="${code}" lang="${code}"${code === lang ? ' selected' : ''}>${languageInfo[code].name}</option>`).join('')}</select></label>
          ${group(d.view, choice('view', 'month', d.viewMonth, options.view === 'month') + choice('view', 'list', d.viewList, options.view === 'list'))}
          ${group(d.theme, choice('theme', 'auto', d.themeAuto, options.theme === 'auto') + choice('theme', 'light', d.themeLight, options.theme === 'light') + choice('theme', 'dark', d.themeDark, options.theme === 'dark'))}
          ${group(d.size, (['sidebar', 'card', 'full'] as const).map(size => choice('size', size, sizeLabels[size], options.size === size, widgetSizes[size] ? px(widgetSizes[size]!) : '100%')).join(''))}
          <label class="builder-field"><span class="builder-label">${t(d.height)}<output name="height-value" dir="ltr">${px(options.height)}</output></span><input type="range" name="height" min="${WIDGET_HEIGHT.min}" max="${WIDGET_HEIGHT.max}" step="10" value="${options.height}"></label>
        </form>
        <div class="builder-preview">
          <span class="builder-label">${t(d.preview)}</span>
          <div class="builder-stage"><iframe src="${widgetSrc(options, '')}" title="${attribute(`${widgetCopy[lang].title} · Janat`)}" style="${width ? `max-width:${width}px;` : ''}height:${options.height}px"></iframe></div>
        </div>
        <div class="builder-code">
          <label class="builder-label" for="widget-code">${t(d.code)}</label>
          <textarea id="widget-code" readonly dir="ltr" rows="5" spellcheck="false">${escapeHtml(snippet)}</textarea>
          <div class="dates-actions"><button type="button" class="button primary" data-action="copy" data-target="#widget-code" data-copied="${attribute(d.codeCopied)}">${icon('copy')}${t(d.copyCode)}</button></div>
          <p class="copy-status fine-print" role="status"></p>
        </div>
      </div></section>
      <section class="dates-section" aria-labelledby="features-title">${sectionHeading(t(d.featuresTitle), 'features-title', { eyebrow: t(d.widgetNav), glyph: 'sparkles' })}<ul class="widget-features">${features.map(([glyph, title, body]) => `<li><span class="icon-tile">${icon(glyph)}</span><h3>${t(title)}</h3><p>${t(body)}</p></li>`).join('')}</ul></section>
      <section class="dates-section" aria-labelledby="steps-title">${sectionHeading(t(d.stepsTitle), 'steps-title', { eyebrow: t(d.getCode), glyph: 'code-xml' })}<ol class="widget-steps">${steps.map(([title, body], index) => `<li><span class="widget-step-number" aria-hidden="true">${f.number(index + 1)}</span><h3>${t(title)}</h3><p>${t(body)}</p></li>`).join('')}</ol></section>
      ${linkRow(c, [{ href: href(c), label: d.hubTitle }, ...otherYears(c).map(link => ({ ...link, label: fill(d.yearTitle, { year: link.label }) })), ...occasionLinks(c)], d.allDates)}`,
  };
}

// ---------- Page shell ----------
function jsonLd(c: Context, model: PageModel) {
  const url = subjectUrl(c.subject)(c.lang);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: 'Janat', alternateName: 'جنّات' },
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: model.title, description: model.description, inLanguage: languageInfo[c.lang].locale, isPartOf: { '@id': `${SITE_URL}/#website` }, breadcrumb: { '@id': `${url}#breadcrumb` } },
      { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: model.crumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) },
    ],
  };
}

function shell(c: Context, model: PageModel) {
  const { d, m, t, lang } = c;
  const slug = subjectSlug(c.subject);
  const crumbs = model.crumbs.map((item, index) => `<li>${index === model.crumbs.length - 1 ? `<span aria-current="page">${t(item.name)}</span>` : `<a href="${item.href}">${t(item.name)}</a>`}</li>`).join('');
  return `<div class="dates-shell"><a class="skip-link" href="#main">${t(m.skipLink)}</a>
    <header class="site-header"><div class="header-inner"><a class="brand" href="${languageLink(lang)}" aria-label="Janat">${icon('moon-star')}<span>janat<span class="brand-dot">.</span></span><span class="brand-ar" lang="ar">جنّات</span></a><div class="header-actions"><a class="dates-header-link" href="${href(c)}" aria-label="${attribute(d.nav)}"${c.subject.kind === 'hub' ? ' aria-current="page"' : ''}>${icon('calendar-days')}<span>${t(d.nav)}</span></a><a class="button small pale" href="${languageLink(lang)}">${t(d.openApp)}${icon('arrow-right')}</a></div></div></header>
    <main id="main" tabindex="-1"><section class="static-hero dates-hero${model.main.includes('dates-summary') ? ' has-summary' : ''}"><div class="container">
      <nav class="dates-breadcrumb" aria-label="${attribute(d.breadcrumb)}"><ol>${crumbs}</ol></nav>
      <p class="eyebrow light">${icon('moon-star')}${t(model.eyebrow)}</p><h1>${t(model.h1)}</h1><p class="hero-intro">${t(model.description)}</p>
      <div class="dates-hero-actions">${model.actions ?? `<a class="button pale" href="#calendar">${icon('calendar-plus')}${t(model.action)}</a><a class="button dates-ghost" href="#share">${icon('share-2')}${t(m.share)}</a>`}</div>
    </div></section>
    <div class="container dates-body">${model.main}</div></main>
    <footer class="site-footer"><div class="container footer-main"><span class="footer-brand">${icon('moon-star')}janat.</span><span>${t(m.footer)}</span><a class="text-button" href="${href(c)}">${icon('calendar-days')}${t(d.nav)}</a><a class="text-button" href="${href(c, 'widget')}"${c.subject.kind === 'widget' ? ' aria-current="page"' : ''}>${icon('code-xml')}${t(d.widgetNav)}</a><button type="button" class="text-button" data-action="consent-settings">${icon('cookie')}${t(m.consentSettings)}</button><span class="privacy-footer">${icon('shield-check')}${t(m.privacyTitle)}</span></div>
    <div class="container footer-languages"><span class="footer-languages-title">${icon('globe')}${t(m.languagesTitle)}</span><ul>${languages.map(code => `<li><a href="${datesPath(code, slug)}" hreflang="${code}" lang="${code}"${code === lang ? ' aria-current="true"' : ''}>${languageInfo[code].name}</a></li>`).join('')}</ul></div></footer>
    <section class="consent" aria-label="${attribute(m.consentSettings)}" hidden><span class="consent-icon">${icon('cookie')}</span><p>${t(m.consentText)}</p><div class="consent-actions"><button type="button" class="button small consent-decline" data-action="consent-decline">${t(m.consentDecline)}</button><button type="button" class="button small pale" data-action="consent-accept">${t(m.consentAccept)}</button></div></section>
  </div>`;
}

function model(c: Context): PageModel {
  const subject = c.subject;
  if (subject.kind === 'hub') return hubModel(c);
  if (subject.kind === 'widget') return widgetModel(c);
  if (subject.kind === 'year') return yearModel(c, subject.year);
  if (subject.kind === 'month') return monthModel(c, subject.page);
  if (subject.kind === 'city') return cityModel(c, subject.page, subject.city);
  return occasionModel(c, subject.page);
}

export type PageAssets = { script: string; styles?: string[] };

/** Renders one page from the app's index.html, swapping the app bundle for the small page script. */
export function renderDatePage(template: string, lang: Language, subject: DateSubject, site: DateSite, assets: PageAssets) {
  for (const mark of ['<!--seo:head-->', '<!--seo:app-->']) if (!template.includes(mark)) throw new Error(`index.html is missing the ${mark} marker`);
  const salawat = (value: string) => lang === 'ar' ? value : value.replace(/\uFDFA/g, '<span class="salawat">\uFDFA</span>');
  const c: Context = { lang, d: datesCopy[lang], m: messages[lang], f: formatters(lang), site, subject, t: value => salawat(escapeHtml(value)) };
  const page = model(c);
  const head = metaTags(lang, { title: page.title, description: page.description, url: subjectUrl(subject), jsonLd: jsonLd(c, page) });
  const scripts = [...(assets.styles ?? []).map(style => `<link rel="stylesheet" crossorigin href="${style}">`), `<script type="module" crossorigin src="${assets.script}"></script>`].join('\n    ');
  return template
    .replace(/<html[^>]*>/, () => `<html lang="${lang}" dir="${languageInfo[lang].dir}">`)
    .replace(/\s*<script type="module"[^>]*><\/script>/g, '')
    .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
    .replace('<!--seo:head-->', () => head)
    .replace('</head>', () => `    ${scripts}\n  </head>`)
    .replace('<!--seo:app-->', () => shell(c, page));
}

/** Every page in every language: `{ path: 'ur/fasting/2026-11/index.html', html }`. */
export function renderDatePages(template: string, site: DateSite, assets: PageAssets) {
  return site.subjects.flatMap(subject => languages.map(lang => ({ path: `${datesPath(lang, subjectSlug(subject)).slice(1)}index.html`, html: renderDatePage(template, lang, subject, site, assets) })));
}

/** Finds the page for a dev-server path such as /ur/fasting/2026-11/ or /fasting/ramadan-2027/london/. */
export function subjectForPath(site: DateSite, pathname: string): { lang: Language; subject: DateSubject } | undefined {
  const match = /^\/(?:([a-z]{2})\/)?fasting\/(?:([\w-]+(?:\/[\w-]+)?)\/)?$/.exec(pathname);
  if (!match) return undefined;
  const lang = languages.find(code => code === (match[1] ?? 'en'));
  if (!lang || (match[1] === 'en')) return undefined;
  const subject = site.subjects.find(item => subjectSlug(item) === (match[2] ?? ''));
  return subject ? { lang, subject } : undefined;
}
