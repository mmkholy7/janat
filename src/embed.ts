import './embed.css';
import { ArrowUpRight, Ban, CalendarPlus, ChevronLeft, ChevronRight, Moon, MoonStar, Star, Sun } from 'lucide';
import { addDays, dateKey, fastDay, hijriDate } from './calendar';
import { marker, noFastMarkers, specialFastMarkers, type Marker } from './dates';
import { SITE_URL, detectLanguage, fontUrl, languageInfo, languageLink, type Language } from './languages';
import { widgetCopy, type WidgetCopy } from './widget-copy';
import { readWidgetQuery } from './widget-snippet';

// The embeddable calendar (/embed/?lang=ur&view=list&theme=dark). It runs inside other people's pages,
// so it is cookie-free, sets no analytics and opens every link in a new tab.

type SvgNode = readonly [string, Readonly<Record<string, string | number | undefined>>, (readonly SvgNode[])?];
const iconNodes = { 'arrow-up-right': ArrowUpRight, ban: Ban, 'calendar-plus': CalendarPlus, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, moon: Moon, 'moon-star': MoonStar, star: Star, sun: Sun } as const;
type IconName = keyof typeof iconNodes;
const serialize = ([tag, attributes, children = []]: SvgNode, extra = ''): string =>
  `<${tag}${Object.entries(attributes).map(([name, value]) => ` ${name}="${value}"`).join('')}${extra}>${children.map(child => serialize(child)).join('')}</${tag}>`;
const icon = (name: IconName, className = '') => serialize(iconNodes[name] as unknown as SvgNode, ` class="icon ${className}" aria-hidden="true"`);
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------- Options ----------
const options = readWidgetQuery(location.search);
const lang: Language = options.lang === 'auto' ? detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]) : options.lang;
const copy: WidgetCopy = widgetCopy[lang];
const info = languageInfo[lang];
const root = document.documentElement;
root.lang = lang;
root.dir = info.dir;
const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => { root.dataset.theme = options.theme === 'auto' ? (darkScheme.matches ? 'dark' : 'light') : options.theme; };
applyTheme();
darkScheme.addEventListener('change', applyTheme);
document.title = `${copy.title} · Janat`;
const font = fontUrl(lang);
if (font) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: font }));

// ---------- Dates in the widget language (the app's own digits and month names) ----------
const formats = new Map<string, Intl.DateTimeFormat>();
const format = (calendar: 'gregory' | 'islamic-umalqura', formatOptions: Intl.DateTimeFormatOptions) => (date: Date) => {
  const id = `${calendar}${JSON.stringify(formatOptions)}`;
  let formatter = formats.get(id);
  if (!formatter) formats.set(id, formatter = new Intl.DateTimeFormat(`${info.locale}-u-ca-${calendar}`, formatOptions));
  // ICU names the Hijri era "যুগ" ("era") in Bengali; readers expect "হিজরি".
  const text = formatter.format(date);
  return lang === 'bn' ? text.replace(/যুগ/g, 'হিজরি') : text;
};
const f = {
  monthYear: format('gregory', { month: 'long', year: 'numeric' }),
  day: format('gregory', { day: 'numeric' }),
  weekdayShort: format('gregory', { weekday: 'short' }),
  dayMonth: format('gregory', { weekday: 'long', day: 'numeric', month: 'long' }),
  full: format('gregory', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  hijriDay: format('islamic-umalqura', { day: 'numeric' }),
  hijri: format('islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }),
  hijriMonth: format('islamic-umalqura', { month: 'long' }),
  hijriMonthYear: format('islamic-umalqura', { month: 'long', year: 'numeric' }),
};
const hijriSpan = (start: Date, end: Date) => {
  const first = hijriDate(start), last = hijriDate(end), tail = f.hijriMonthYear(end);
  if (first.month === last.month && first.year === last.year) return tail;
  return `${first.year === last.year ? f.hijriMonth(start) : f.hijriMonthYear(start)} – ${tail}`;
};

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
const todayKey = dateKey(today);
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 12);
const monthsFromNow = (date: Date) => (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth();
const RANGE = { before: -12, after: 24 };

// ---------- What kind of day is it? ----------
const markerCopy: Record<Marker, keyof WidgetCopy> = { ramadan: 'ramadan', 'eid-fitr': 'eidFitr', arafah: 'arafah', 'eid-adha': 'eidAdha', tashriq: 'tashriq', tasua: 'tasua', ashura: 'ashura' };
type Day = { date: Date; key: string; kind: 'weekly' | 'white' | 'both' | 'special' | 'ramadan' | 'no-fast' | null; label: string; mark: Marker | null };
function describe(date: Date): Day {
  const key = dateKey(date), mark = marker(date), fast = fastDay(date);
  if (mark && noFastMarkers.includes(mark)) return { date, key, mark, kind: 'no-fast', label: `${copy[markerCopy[mark]]} · ${copy.noFast}` };
  if (mark && specialFastMarkers.includes(mark)) return { date, key, mark, kind: 'special', label: copy[markerCopy[mark]] };
  if (mark === 'ramadan') return { date, key, mark, kind: 'ramadan', label: copy.ramadan };
  const white = fast?.reasons.includes('white'), weekly = fast?.reasons.includes('weekly');
  if (white) return { date, key, mark, kind: weekly ? 'both' : 'white', label: weekly ? `${copy.white} · ${copy.weekly}` : copy.white };
  if (weekly) return { date, key, mark, kind: 'weekly', label: copy.weekly };
  return { date, key, mark, kind: null, label: '' };
}
const isFast = (day: Day) => day.kind === 'weekly' || day.kind === 'white' || day.kind === 'both' || day.kind === 'special';

/** The next Sunnah fasts from today (Ramadan is obligatory, so it isn't listed). */
function upcoming(count: number) {
  const result: Day[] = [];
  for (let offset = 0; result.length < count && offset < 400; offset++) {
    const day = describe(addDays(today, offset));
    if (isFast(day)) result.push(day);
  }
  return result;
}

// ---------- Links back to Janat ----------
// utm tags show which sites embed the widget; the app's canonical tags keep these addresses out of search results.
const source = (() => { try { return document.referrer ? new URL(document.referrer).hostname : 'widget'; } catch { return 'widget'; } })();
const track = (url: URL) => { url.searchParams.set('utm_source', source); url.searchParams.set('utm_medium', 'widget'); return url.href; };
const appLink = (params: Record<string, string> = {}) => {
  const url = new URL(languageLink(lang), SITE_URL);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return track(url);
};
/** Every fast opens the app's add-to-calendar sheet for that day (it works for any date, unlike the published date pages). */
const dayLink = (day: Day) => appLink({ add: day.key });
const external = 'target="_blank" rel="noopener"';

const glyphs: Record<NonNullable<Day['kind']>, string> = {
  weekly: icon('sun'), white: icon('moon'), both: `${icon('moon')}<i class="both-dot"></i>`, special: icon('star'), ramadan: icon('moon-star'), 'no-fast': icon('ban'),
};
const glyph = (day: Day) => day.kind ? glyphs[day.kind] : '';

// ---------- Shared pieces ----------
const head = (title: string, subtitle: string, controls = '') => `
  <header class="head">
    <p class="eyebrow">${icon('moon-star')}<span>${escape(copy.title)}</span></p>
    <div class="head-row">
      <div class="head-text"><h1 id="title" aria-live="polite">${escape(title)}</h1><p class="sub" id="subtitle">${escape(subtitle)}</p></div>
      ${controls}
    </div>
  </header>`;
const foot = `<footer class="foot"><a href="${appLink()}" ${external}>${icon('moon-star', 'brand')}<span>Janat</span><small>janat.uably.com</small>${icon('arrow-up-right')}</a></footer>`;

function nextStrip() {
  const [day] = upcoming(1);
  if (!day) return '';
  const label = day.key === todayKey ? copy.today : copy.nextFast;
  return `<a class="next ${day.kind}" href="${dayLink(day)}" ${external} aria-label="${escape(`${label}: ${f.full(day.date)} · ${day.label} — ${copy.add}`)}">
    <span class="next-icon">${icon('calendar-plus')}</span>
    <span class="next-text"><small>${escape(label)}</small><strong>${escape(f.dayMonth(day.date))}</strong><em>${escape(`${f.hijri(day.date)} · ${day.label}`)}</em></span>
    <span class="go">${icon('chevron-right', 'flip')}</span>
  </a>`;
}

// ---------- Month view ----------
let shown = monthStart(today);

function monthCells(month: Date) {
  const shift = (month.getDay() + 6) % 7, first = addDays(month, -shift);
  const seen = new Set<Day['kind']>();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = describe(addDays(first, index));
    const outside = day.date.getMonth() !== month.getMonth(), past = day.key < todayKey, isToday = day.key === todayKey;
    if (!outside && day.kind) seen.add(day.kind);
    const classes = ['cell', day.kind, outside && 'outside', past && 'past', isToday && 'today'].filter(Boolean).join(' ');
    const numbers = `<span class="g" aria-hidden="true">${escape(f.day(day.date))}</span><span class="h" aria-hidden="true">${escape(f.hijriDay(day.date))}</span>${day.kind ? `<span class="mark" aria-hidden="true">${glyph(day)}</span>` : ''}`;
    const spoken = `${f.full(day.date)} · ${f.hijri(day.date)}${day.label ? ` · ${day.label}` : ''}${isToday ? ` · ${copy.today}` : ''}`;
    if (isFast(day) && !past) return `<a class="${classes}" href="${dayLink(day)}" ${external} title="${escape(day.label)}" aria-label="${escape(`${spoken} — ${copy.add}`)}">${numbers}</a>`;
    if (outside || !day.kind && !isToday) return `<div class="${classes}" aria-hidden="true">${numbers}</div>`;
    return `<div class="${classes}"${day.label ? ` title="${escape(day.label)}"` : ''}>${numbers}<span class="sr">${escape(spoken)}</span></div>`;
  });
  const legend = [
    `<span><b class="dot weekly"></b>${escape(copy.weekly)}</span>`,
    `<span><b class="dot white"></b>${escape(copy.white)}</span>`,
    ...(seen.has('special') ? [`<span><b class="dot special"></b>${escape(copy.special)}</span>`] : []),
    ...(seen.has('ramadan') ? [`<span><b class="dot ramadan"></b>${escape(copy.ramadan)}</span>`] : []),
    ...(seen.has('no-fast') ? [`<span><b class="dot no-fast"></b>${escape(copy.noFast)}</span>`] : []),
  ].join('');
  return { cells: cells.join(''), legend };
}

function renderMonthShell(container: HTMLElement) {
  const weekdays = Array.from({ length: 7 }, (_, index) => `<span>${escape(f.weekdayShort(new Date(2026, 9, 19 + index, 12)))}</span>`).join('');
  const controls = `<div class="nav">
    <button type="button" class="today-button" data-go="today" hidden>${escape(copy.today)}</button>
    <button type="button" data-go="-1" aria-label="${escape(copy.previous)}" title="${escape(copy.previous)}">${icon('chevron-left', 'flip')}</button>
    <button type="button" data-go="1" aria-label="${escape(copy.next)}" title="${escape(copy.next)}">${icon('chevron-right', 'flip')}</button>
  </div>`;
  container.innerHTML = `${head('', '', controls)}
    <div class="body">
      <div class="weekdays" aria-hidden="true">${weekdays}</div>
      <div class="grid" id="grid"></div>
      <div class="legend" id="legend"></div>
      ${nextStrip()}
    </div>${foot}`;
  container.querySelector('.nav')!.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-go]');
    if (!button || button.disabled) return;
    const go = button.dataset.go!;
    shown = go === 'today' ? monthStart(today) : new Date(shown.getFullYear(), shown.getMonth() + Number(go), 1, 12);
    updateMonth(container);
  });
  updateMonth(container);
}

function updateMonth(container: HTMLElement) {
  const end = new Date(shown.getFullYear(), shown.getMonth() + 1, 0, 12);
  const { cells, legend } = monthCells(shown);
  container.querySelector('#title')!.textContent = f.monthYear(shown);
  container.querySelector('#subtitle')!.textContent = hijriSpan(shown, end);
  container.querySelector('#grid')!.innerHTML = cells;
  container.querySelector('#legend')!.innerHTML = legend;
  const offset = monthsFromNow(shown);
  container.querySelector<HTMLButtonElement>('[data-go="-1"]')!.disabled = offset <= RANGE.before;
  container.querySelector<HTMLButtonElement>('[data-go="1"]')!.disabled = offset >= RANGE.after;
  container.querySelector<HTMLButtonElement>('[data-go="today"]')!.hidden = offset === 0;
}

// ---------- List view ----------
function renderList(container: HTMLElement) {
  const days = upcoming(6);
  const rows = days.map(day => {
    const isToday = day.key === todayKey;
    return `<li><a class="row ${day.kind}" href="${dayLink(day)}" ${external} aria-label="${escape(`${f.full(day.date)} · ${f.hijri(day.date)} · ${day.label}${isToday ? ` · ${copy.today}` : ''} — ${copy.add}`)}">
      <span class="badge" aria-hidden="true"><b>${escape(f.day(day.date))}</b><small>${escape(isToday ? copy.today : f.weekdayShort(day.date))}</small></span>
      <span class="row-text" aria-hidden="true"><strong>${escape(f.dayMonth(day.date))}</strong><small>${glyph(day)}<span>${escape(`${f.hijri(day.date)} · ${day.label}`)}</span></small></span>
      <span class="row-add" aria-hidden="true">${icon('calendar-plus')}</span>
    </a></li>`;
  }).join('');
  const first = days[0], last = days[days.length - 1];
  // The app accepts ranges of up to 31 days.
  const all = first && last && dateKey(addDays(first.date, 31)) >= last.key ? appLink({ add: first.key, to: last.key }) : first ? dayLink(first) : appLink();
  container.innerHTML = `${head(copy.heading, `${copy.today} · ${f.hijri(today)}`)}
    <div class="body list-body">
      <ol class="list">${rows}</ol>
      <a class="add-all" href="${all}" ${external}>${icon('calendar-plus')}<span>${escape(copy.add)}</span></a>
    </div>${foot}`;
}

const container = document.querySelector<HTMLElement>('#widget')!;
container.classList.add(options.view);
if (options.view === 'list') renderList(container); else renderMonthShell(container);
