import { createIcons, Leaf, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Bell, BookOpen, Check, X, Download, Copy, ShieldCheck, Settings2, Moon, Sun, Heart, Sprout, Globe, Image, Trash2, House, NotebookPen, Library } from 'lucide';
import { addDays, calendarEventLinks, calendarInvite, calendarSubscriptionLinks, dateKey, fastDay, hijriDate, upcomingDays, type FastDay, type FastStatus } from './calendar';
import { loadMessages, locales, verses, type Messages } from './i18n';
import { detectLanguage, fontUrl, isLanguage, languageFromPath, languageInfo, languageLink, languagePath, languages, type Language } from './languages';
import en from './locales/en';
import { faqSection } from './faq';
import { resources, type ResourceCategory } from './resources';
import './style.css';
import './dark.css';
import './design.css';

type View = 'home' | 'calendar' | 'logbook' | 'quran' | 'resources';
type Preferences = { language: Language; adjustment: number; weekly: boolean; white: boolean; quranGoal: number };
type QuranSession = { id: string; date: string; kind: 'recitation' | 'revision'; minutes: number; pages: number };
const app = document.querySelector<HTMLDivElement>('#app')!;
const icons = { Leaf, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Bell, BookOpen, Check, X, Download, Copy, ShieldCheck, Settings2, Moon, Sun, Heart, Sprout, Globe, Image, Trash2, House, NotebookPen, Library };
const navIcons: Record<View, string> = { home: 'house', calendar: 'calendar-days', logbook: 'notebook-pen', quran: 'book-open', resources: 'library' };
const shortLanguageNames: Partial<Record<Language, string>> = { ar: 'عربي', ur: 'اردو', bn: 'বাংলা', fa: 'فارسی' };
let storageAvailable = true;
function load(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { storageAvailable = false; return null; }
}
const rawPreferences = load('janat.preferences') as Partial<Preferences> | null;
const storedLanguage = isLanguage(rawPreferences?.language) ? rawPreferences.language : undefined;
let preferences: Preferences = {
  language: storedLanguage ?? 'en',
  adjustment: [-1, 0, 1].includes(Number(rawPreferences?.adjustment)) ? Number(rawPreferences?.adjustment) : 0,
  weekly: rawPreferences?.weekly !== false, white: rawPreferences?.white !== false,
  quranGoal: Number.isInteger(rawPreferences?.quranGoal) && Number(rawPreferences?.quranGoal) >= 1 && Number(rawPreferences?.quranGoal) <= 1440 ? Number(rawPreferences?.quranGoal) : 15,
};
const rawLog = load('janat.logbook');
let logbook: Record<string, FastStatus> = {};
if (rawLog && typeof rawLog === 'object' && !Array.isArray(rawLog)) {
  logbook = Object.fromEntries(Object.entries(rawLog).filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && (value === 'fasted' || value === 'missed')));
}
const rawQuran = load('janat.quran');
let quranSessions: QuranSession[] = Array.isArray(rawQuran) ? rawQuran.filter(validSession) : [];
const routeView = (): View => ['calendar', 'logbook', 'quran', 'resources'].includes(location.hash.slice(1)) ? location.hash.slice(1) as View : 'home';
let view: View = routeView();
let resourceCategory: 'all' | ResourceCategory = 'all';
let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
let scene = 0;
let selected: string | null = null;
let activeModal: 'reminders' | 'settings' | 'record' | 'sources' | 'calendar' | 'quran-calendar' | null = null;
const availableFeeds = new Set<string>();
let focusBeforeModal: HTMLElement | null = null;
let copy: Messages = en;
let languageRequest = 0;
let videoObserver: IntersectionObserver | null = null;
const text = () => copy;
const today = () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12);
const icon = (name: string, extra = '') => `<i data-lucide="${name}" ${extra} aria-hidden="true"></i>`;
const number = (value: number) => new Intl.NumberFormat(locales[preferences.language], { useGrouping: false }).format(value);
const format = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locales[preferences.language], { calendar: 'gregory', ...options }).format(date);
const hijriLabel = (date: Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) => new Intl.DateTimeFormat(`${locales[preferences.language]}-u-ca-islamic-umalqura`, options).format(addDays(date, preferences.adjustment));
const parseDate = (key: string) => new Date(`${key}T12:00:00`);
function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageAvailable = false; toast(text().storageError); }
}
function toast(message: string) {
  document.querySelector('.toast')?.remove();
  const notification = document.createElement('div'); notification.className = 'toast'; notification.setAttribute('role', 'status'); notification.textContent = message;
  document.body.append(notification); window.setTimeout(() => notification.remove(), 4000);
}
function badges(day: FastDay) {
  return day.reasons.map(reason => `<span class="badge ${reason}">${reason === 'white' ? icon('moon') : icon('sun')}${reason === 'white' ? text().white : text().weekly}</span>`).join('');
}
function relativeDate(date: Date) {
  const distance = Math.round((date.getTime() - today().getTime()) / 86400000);
  return distance === 0 ? text().today : distance === 1 ? text().tomorrow : text().inDays.replace('{n}', number(distance));
}
function verseMarkup() {
  const verse = verses[scene];
  return `<p lang="ar" dir="rtl">${verse.arabic}</p><span>${text()[verse.key]}</span><small>${text().quran} ${verse.ref}</small>`;
}
function hero() {
  const day = upcomingDays(today(), 1, preferences.adjustment)[0];
  return `<section class="hero" aria-label="${text().landscape}">
    <div class="hero-image scene-${scene}" role="img" aria-label="${text().landscape}"></div><div class="hero-shade"></div>
    <div class="hero-inner"><div class="hero-main"><div class="eyebrow light">${icon('sprout')} ${text().tagline}</div>
    <h1>${text().greeting}<br><span>${text().greetingEnd}</span></h1><p class="hero-intro">${text().intro}</p>
    <button class="button pale" data-action="reminders">${icon('bell')}${text().addReminders}${icon('arrow-up-right')}</button>
    <div class="verse" aria-live="off">${verseMarkup()}</div></div>
    <aside class="next-fast"><div class="eyebrow">${icon('moon')} ${text().upcoming}</div><span class="next-relative">${relativeDate(day.date)}</span>
    <h2>${format(day.date, { weekday: 'long' })}</h2><p>${format(day.date, { day: 'numeric', month: 'long' })} <span> / </span> ${hijriLabel(day.date, { day: 'numeric', month: 'long' })}</p>
    <div class="hero-badges">${badges(day)}</div><div class="hadith"><span class="quote-mark">“</span><p>${text().hadith}</p><a href="https://sunnah.com/muslim:1159a" target="_blank" rel="noopener noreferrer">Sahih Muslim 1159 ${icon('arrow-up-right')}</a></div>
    <button class="hero-link" data-action="invite" data-date="${day.key}">${text().setReminder}${icon('arrow-right')}</button></aside></div>
    <div class="scene-controls"><div class="scene-dots">${verses.map((_, index) => `<button class="scene-dot ${scene === index ? 'active' : ''}" data-action="scene" data-scene="${index}" aria-label="${text().changeScene} ${index + 1}" aria-pressed="${scene === index}"></button>`).join('')}</div><button class="scene-label" data-action="scene" data-scene="${(scene + 1) % 3}">${icon('image')} ${text().changeScene}</button></div>
  </section>`;
}
function stats() {
  const monthEntries = Object.entries(logbook).filter(([key]) => key.startsWith(dateKey(today()).slice(0, 7)));
  const fasts = monthEntries.filter(([, value]) => value === 'fasted').length;
  const allFasts = Object.values(logbook).filter(value => value === 'fasted').length;
  const nextWhite = upcomingDays(today(), 30, preferences.adjustment).find(day => day.reasons.includes('white'))!;
  return `<section class="stats" aria-label="${text().journey}"><div class="journey-title"><span class="icon-tile">${icon('sprout')}</span><div><h2>${text().journey}</h2><p>${text().monthProgress}</p></div></div>
    <div class="stat"><span class="stat-value">${number(fasts)}<small>${text().days}</small></span><span>${text().thisMonth}</span></div>
    <div class="stat"><span class="stat-value">${number(allFasts)}<small>${text().days}</small></span><span>${text().total}</span></div>
    <div class="stat white-stat"><span class="stat-caption">${icon('moon')}${text().white}</span><strong>${format(nextWhite.date, { day: 'numeric', month: 'short' })}</strong><span>${hijriLabel(nextWhite.date, { day: 'numeric', month: 'long' })}</span></div></section>`;
}
function upcoming() {
  const days = upcomingDays(today(), 4, preferences.adjustment);
  return `<section class="upcoming-section"><div class="section-heading"><div><div class="eyebrow green">${text().intentions}</div><h2>${text().nextDays}</h2><p>${text().upcomingText}</p></div><button class="text-button" data-view="calendar">${text().viewCalendar}${icon('arrow-right')}</button></div>
    <div class="day-cards">${days.map((day, index) => `<article class="day-card ${index === 0 ? 'nearest' : ''}"><div class="day-top"><span>${format(day.date, { weekday: 'long' })}</span><span class="day-relative">${relativeDate(day.date)}</span></div><div class="day-date">${number(day.date.getDate())}<span>${format(day.date, { month: 'long' })}<small>${hijriLabel(day.date, { day: 'numeric', month: 'long' })}</small></span></div><div class="day-tags">${badges(day)}</div><button class="card-action" data-action="${day.key <= dateKey(today()) ? 'record' : 'invite'}" data-date="${day.key}">${day.key <= dateKey(today()) ? (logbook[day.key] ? text()[logbook[day.key]] : text().record) : text().setReminder}${icon(day.key <= dateKey(today()) ? 'check' : 'arrow-up-right')}</button></article>`).join('')}</div></section>`;
}
function power() {
  const cards = [
    { file: 'salah', title: text().powerRewardsTitle, body: text().powerRewardsText },
    { file: 'dua', title: text().powerDuaTitle, body: text().powerDuaText },
    { file: 'dates', title: text().powerHealthTitle, body: text().powerHealthText },
  ];
  return `<section class="power-section"><div class="section-heading"><div><div class="eyebrow green">${text().tagline}</div><h2>${text().power}</h2><p>${text().powerIntro}</p></div></div>
    <div class="power-grid">${cards.map((card, index) => `<article class="power-card" style="animation-delay:${index * 130}ms"><video src="/videos/${card.file}.mp4" poster="/videos/${card.file}.webp" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video><div class="power-overlay"><h3>${card.title}</h3><p>${card.body}</p></div></article>`).join('')}</div></section>`;
}
function calendarView() {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const shift = (start.getDay() + 6) % 7;
  const first = addDays(start, -shift);
  const weekDays = Array.from({ length: 7 }, (_, index) => format(new Date(2026, 9, 19 + index), { weekday: 'short' }));
  return `<section class="page-section"><div class="section-heading"><div><div class="eyebrow green">${text().hijriYear} ${number(hijriDate(month, preferences.adjustment).year)}</div><h1>${text().calendar}</h1><p>${text().selectDate}</p></div><button class="button outline" data-action="settings">${icon('settings-2')}${text().calendarSettings}</button></div>
    <div class="month-bar"><h2>${format(month, { month: 'long', year: 'numeric' })}<span>${hijriLabel(start, { month: 'long' })} – ${hijriLabel(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12), { month: 'long', year: 'numeric' })}</span></h2><div class="month-controls"><button class="icon-button" data-action="prev-month" aria-label="${text().previous}" title="${text().previous}">${icon('chevron-left')}</button><button class="text-button" data-action="today">${text().today}</button><button class="icon-button" data-action="next-month" aria-label="${text().next}" title="${text().next}">${icon('chevron-right')}</button></div></div>
    <div class="calendar-grid">${weekDays.map(day => `<div class="weekday">${day}</div>`).join('')}${Array.from({ length: 42 }, (_, index) => {
      const date = addDays(first, index); const key = dateKey(date); const fast = fastDay(date, preferences.adjustment); const status = logbook[key];
      return `<button class="calendar-cell ${date.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === dateKey(today()) ? 'is-today' : ''} ${fast ? 'fast-day' : ''} ${status || ''}" data-action="${key <= dateKey(today()) ? 'record' : fast ? 'invite' : 'none'}" data-date="${key}" ${key > dateKey(today()) && !fast ? 'disabled' : ''} aria-label="${format(date, { dateStyle: 'full' })}, ${hijriLabel(date)}${status ? `, ${text()[status]}` : ''}"><span class="cell-date">${number(date.getDate())}<small>${number(hijriDate(date, preferences.adjustment).day)}</small></span><span class="cell-indicator">${status ? icon(status === 'fasted' ? 'check' : 'x') : fast ? icon(fast.reasons.includes('white') ? 'moon' : 'sun') : ''}<span>${status ? text()[status] : fast ? (fast.reasons.includes('white') ? text().white : format(date, { weekday: 'short' })) : ''}</span></span></button>`;
    }).join('')}</div><div class="calendar-legend"><span><b class="legend-dot weekly"></b>${text().weekly}</span><span><b class="legend-dot white"></b>${text().white}</span><span>${icon('check')}${text().fasted}</span></div><p class="muted calendar-hint">${text().adjustHint}</p></section>`;
}
function logbookView() {
  const entries = Object.entries(logbook).sort(([first], [second]) => second.localeCompare(first));
  const totals = `<div class="log-totals">${(['fasted', 'missed'] as FastStatus[]).map(status => `<span class="log-total ${status}">${icon(status === 'fasted' ? 'check' : 'x')}<strong>${number(entries.filter(([, value]) => value === status).length)}</strong>${text()[status]}</span>`).join('')}</div>`;
  const recent = Array.from({ length: 31 }, (_, offset) => addDays(today(), -offset)).filter(date => fastDay(date, preferences.adjustment) && !logbook[dateKey(date)]).slice(0, 5);
  return `<section class="page-section"><div class="section-heading"><div><div class="eyebrow green">${text().journey}</div><h1>${text().logbook}</h1></div><button class="button outline" data-action="backup">${icon('download')}${text().backup}</button></div>
    ${stats()}${totals}<div class="log-layout"><div><h2 class="list-title">${text().all}</h2>${!entries.length ? `<div class="empty-state">${icon('book-open')}<h3>${text().empty}</h3><p>${text().emptyDetail}</p></div>` : `<div class="log-list">${entries.map(([key, status]) => `<button class="log-row" data-action="record" data-date="${key}"><span class="status-icon ${status}">${icon(status === 'fasted' ? 'check' : 'x')}</span><span><strong>${format(parseDate(key), { weekday: 'long', day: 'numeric', month: 'long' })}</strong><small>${hijriLabel(parseDate(key))}</small></span><span class="log-status ${status}">${text()[status]}</span></button>`).join('')}</div>`}</div><aside><h2 class="list-title">${text().pastDays}</h2>${recent.map(date => `<button class="recent-row" data-action="record" data-date="${dateKey(date)}"><span>${format(date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>${icon('arrow-up-right')}</button>`).join('')}<button class="text-button" data-view="calendar">${text().viewCalendar}${icon('arrow-right')}</button></aside></div></section>`;
}
function resourcesView() {
  const categories = { all: text().resourceAll, quran: text().quran, hadith: text().hadithCategory, learning: text().learningCategory };
  const filtered = resources.filter(resource => resourceCategory === 'all' || resource.category === resourceCategory);
  return `<section class="page-section resources-section"><div class="section-heading"><div><div class="eyebrow green">${text().learningCategory}</div><h1>${text().resources}</h1><p>${text().resourcesIntro}</p></div><label class="resource-filter"><select id="resource-category" aria-label="${text().resourceAll}">${Object.entries(categories).map(([key, label]) => `<option value="${key}" ${resourceCategory === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><div class="resource-grid">${filtered.map(resource => `<article class="resource-card"><span class="resource-category">${icon(resource.category === 'quran' ? 'book-open' : resource.category === 'hadith' ? 'moon' : 'sprout')}${categories[resource.category]}</span><h2>${resource.name}</h2><p>${text()[resource.description]}</p><a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="resource-link">${text().visit}${icon('arrow-up-right')}<span dir="ltr">${new URL(resource.url).hostname}</span></a></article>`).join('')}</div><p class="resource-note">${icon('shield-check')}${text().resourceNote}</p></section>`;
}
function validSession(value: unknown): value is QuranSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as QuranSession;
  return typeof session.id === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(session.id)
    && typeof session.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(session.date)
    && session.date >= '2000-01-01' && session.date <= dateKey(new Date())
    && dateKey(new Date(`${session.date}T12:00:00`)) === session.date
    && ['recitation', 'revision'].includes(session.kind)
    && Number.isInteger(session.minutes) && session.minutes >= 1 && session.minutes <= 1440
    && Number.isInteger(session.pages) && session.pages >= 0 && session.pages <= 604;
}
function quranView() {
  const todayMinutes = quranSessions.filter(session => session.date === dateKey(today())).reduce((sum, session) => sum + session.minutes, 0);
  const totals = { sessions: quranSessions.length, minutes: quranSessions.reduce((sum, session) => sum + session.minutes, 0), pages: quranSessions.reduce((sum, session) => sum + session.pages, 0) };
  const entries = [...quranSessions].reverse().sort((first, second) => second.date.localeCompare(first.date));
  return `<section class="page-section quran-section"><div class="section-heading"><div><div class="eyebrow green">${text().journey}</div><h1>${text().quran}</h1><p>${text().quranIntro}</p></div><button class="button outline" data-action="quran-invite">${icon('bell')}${text().quranCalendar}</button></div>
    <div class="quran-summary">${Object.entries(totals).map(([key, value]) => `<div><strong data-total="${key}">${number(value)}</strong><span>${text()[key as keyof typeof totals]}</span></div>`).join('')}<div class="quran-progress"><span>${text().goalProgress}</span><strong>${number(todayMinutes)} / ${number(preferences.quranGoal)}</strong><progress max="${preferences.quranGoal}" value="${Math.min(todayMinutes, preferences.quranGoal)}" aria-label="${text().goalProgress}"></progress></div></div>
    <div class="quran-layout"><section class="quran-entry"><h2>${text().saveSession}</h2><form id="quran-session"><label for="session-date">${text().sessionDate}</label><input id="session-date" name="date" type="date" min="2000-01-01" max="${dateKey(today())}" value="${dateKey(today())}" required><label for="session-kind">${text().activity}</label><select id="session-kind" name="kind"><option value="recitation">${text().recitation}</option><option value="revision">${text().revision}</option></select><div class="quran-numbers"><label>${text().minutes}<input name="minutes" type="number" inputmode="numeric" min="1" max="1440" step="1" value="15" required></label><label>${text().pages}<input name="pages" type="number" inputmode="numeric" min="0" max="604" step="1" value="1" required></label></div><button type="submit" class="button primary full">${icon('check')}${text().saveSession}</button></form><form id="quran-goal"><label for="daily-goal">${text().dailyGoal}</label><div><input id="daily-goal" name="goal" type="number" inputmode="numeric" min="1" max="1440" step="1" value="${preferences.quranGoal}" required><button type="submit" class="icon-button" title="${text().save}" aria-label="${text().save}">${icon('check')}</button></div></form></section>
    <section class="quran-history"><h2>${text().quranHistory}</h2>${entries.length ? `<div class="quran-sessions">${entries.map(session => `<div class="quran-row"><span class="icon-tile">${icon(session.kind === 'revision' ? 'moon' : 'book-open')}</span><div><strong>${text()[session.kind]}</strong><small>${format(parseDate(session.date), { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><span class="quran-row-totals">${number(session.minutes)} ${text().minutes}<small>${number(session.pages)} ${text().pages}</small></span><button class="icon-button" data-action="delete-session" data-id="${session.id}" aria-label="${text().removeSession}" title="${text().removeSession}">${icon('trash-2')}</button></div>`).join('')}</div>` : `<div class="empty-state">${icon('book-open')}<h3>${text().noSessions}</h3></div>`}<p class="fine-print">${text().localQuran}</p><div class="quran-tools"><button class="text-button" data-action="backup">${icon('download')}${text().backup}</button><button class="text-button danger" data-action="reset-quran">${icon('trash-2')}${text().resetQuran}</button></div></section></div><p class="fine-print">${text().quranCalendarNote}</p></section>`;
}
function updateHead() {
  const lang = preferences.language;
  document.documentElement.lang = lang; document.documentElement.dir = languageInfo[lang].dir;
  document.title = view === 'home' ? text().seoTitle : `${text()[view]} · Janat`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().seoDescription);
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = new URL(languagePath(lang), canonical.href).href;
}
function playVisibleVideos() {
  videoObserver?.disconnect();
  const videos = document.querySelectorAll<HTMLVideoElement>('.power-card video');
  videos.forEach(video => { video.muted = true; });
  if (!videos.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  videoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    const video = entry.target as HTMLVideoElement;
    if (entry.isIntersecting) void video.play().catch(() => {}); else video.pause();
  }), { rootMargin: '120px 0px' });
  videos.forEach(video => videoObserver!.observe(video));
}
function render() {
  const lang = preferences.language;
  updateHead();
  app.innerHTML = `<a class="skip-link" href="#main" data-skip>${text().skipLink}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${languagePath(lang)}" data-view="home" aria-label="Janat">${icon('leaf')}<span>janat<span class="brand-dot">.</span></span><span class="brand-ar" lang="ar">جنّات</span></a>
    <nav aria-label="${text().mainNav}">${(['home', 'calendar', 'logbook', 'quran', 'resources'] as View[]).map(item => `<button class="nav-link ${view === item ? 'active' : ''}" data-view="${item}" ${view === item ? 'aria-current="page"' : ''}>${icon(navIcons[item])}<span>${text()[item]}</span></button>`).join('')}</nav>
    <div class="header-actions"><label class="language-select" title="${text().languageLabel}">${icon('globe')}<span class="language-current" aria-hidden="true">${shortLanguageNames[lang] ?? lang.toUpperCase()}</span><select id="language" aria-label="${text().languageLabel}">${languages.map(code => `<option value="${code}" lang="${code}" ${code === lang ? 'selected' : ''}>${languageInfo[code].name}</option>`).join('')}</select></label><button class="button primary header-reminder" data-action="reminders" aria-label="${text().reminders}" title="${text().reminders}">${icon('bell')}<span>${text().reminders}</span></button></div></div></header>
    <main id="main" tabindex="-1">${view === 'home' ? `<div class="date-line container"><span>${icon('sun')}${format(today(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span>${hijriLabel(today())}<span class="date-dot"></span>${text().hijriYear} ${number(hijriDate(today(), preferences.adjustment).year)}</span></div>${hero()}<div class="container">${stats()}${upcoming()}${power()}<section class="future-band"><div class="future-icon">${icon('book-open')}</div><div><span class="eyebrow green">${text().recitation} & ${text().revision}</span><h2>${text().quran}</h2><p>${text().quranIntro}</p><button class="text-button" data-view="quran">${text().quranHistory}${icon('arrow-right')}</button></div><span class="future-decoration" lang="ar">اقرأ</span></section>${faqSection(text())}</div>` : `<div class="container">${view === 'calendar' ? calendarView() : view === 'resources' ? resourcesView() : view === 'quran' ? quranView() : logbookView()}</div>`}</main>
    <footer class="site-footer"><div class="container footer-main"><span class="footer-brand">${icon('leaf')}janat.</span><span>${text().footer}</span><button class="text-button" data-action="sources">${text().source}${icon('arrow-up-right')}</button><span class="privacy-footer">${icon('shield-check')}${text().privacyTitle}</span></div>
    <div class="container footer-languages"><span class="footer-languages-title">${icon('globe')}${text().languagesTitle}</span><ul>${languages.map(code => `<li><a href="${languageLink(code)}" hreflang="${code}" lang="${code}" data-language="${code}" ${code === lang ? 'aria-current="true"' : ''}>${languageInfo[code].name}</a></li>`).join('')}</ul></div></footer><dialog id="modal" aria-labelledby="modal-title"></dialog>`;
  bind(); createIcons({ icons });
  playVisibleVideos();
  if (!storageAvailable) toast(text().storageError);
}
function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCalendar(singleDate?: string) {
  const days: FastDay[] = singleDate ? [fastDay(parseDate(singleDate), preferences.adjustment)].filter((day): day is FastDay => !!day) : Array.from({ length: 90 }, (_, offset) => fastDay(addDays(today(), offset), preferences.adjustment)).filter((day): day is FastDay => !!day && ((preferences.weekly && day.reasons.includes('weekly')) || (preferences.white && day.reasons.includes('white'))));
  if (!days.length) { toast(text().noSelection); return; }
  downloadFile(calendarInvite(days, text().inviteTitle, text().inviteBody), singleDate ? `janat-${singleDate}.ics` : 'janat-fasting-90-days.ics', 'text/calendar;charset=utf-8'); toast(text().downloaded);
}
function subscriptionUrl(activity: 'fast' | 'quran') {
  const url = new URL('/api/calendar', location.origin);
  url.search = new URLSearchParams({ activity, lang: preferences.language, adjustment: String(preferences.adjustment), weekly: String(preferences.weekly), white: String(preferences.white) }).toString();
  return url.href;
}
function providerChoices(links: Record<string, string>, subscription = false) {
  const labels: Record<string, string> = { google: 'Google Calendar', outlook: 'Outlook.com', office365: 'Microsoft 365', apple: 'Apple Calendar' };
  return `<div class="provider-choices" aria-label="${text().calendarProvider}">${Object.entries(links).map(([provider, url]) => `<a class="provider-link" data-provider="${provider}" ${subscription ? 'data-subscription aria-disabled="true"' : ''} ${subscription ? '' : `href="${url}"`} target="_blank" rel="noopener noreferrer">${icon('calendar-days')}<span>${labels[provider]}</span>${icon('arrow-up-right')}</a>`).join('')}</div>`;
}
function subscriptionChoices(activity: 'fast' | 'quran') {
  return `<section class="subscription-options" data-activity="${activity}"><h3>${text().subscribeCalendar}</h3>${providerChoices(calendarSubscriptionLinks(subscriptionUrl(activity), 'Janat'), true)}<p class="feed-status fine-print" role="status">${text().feedChecking}</p><div class="feed-url-row"><input class="subscription-url" aria-label="${text().subscriptionUrl}" dir="ltr" readonly value="${subscriptionUrl(activity)}"><button type="button" class="icon-button" data-action="copy-feed" aria-label="${text().copyCalendarUrl}" title="${text().copyCalendarUrl}" disabled>${icon('copy')}</button></div><p class="fine-print">${text().feedNote}</p></section>`;
}
async function updateSubscriptionChoices(dialog: HTMLDialogElement) {
  const options = dialog.querySelector<HTMLElement>('.subscription-options'); if (!options) return;
  const activity = options.dataset.activity as 'fast' | 'quran';
  const url = subscriptionUrl(activity);
  const input = options.querySelector<HTMLInputElement>('.subscription-url')!; input.value = url;
  const links = calendarSubscriptionLinks(url, 'Janat');
  const status = options.querySelector<HTMLElement>('.feed-status')!;
  const copy = options.querySelector<HTMLButtonElement>('[data-action="copy-feed"]')!;
  const anchors = options.querySelectorAll<HTMLAnchorElement>('[data-subscription]');
  anchors.forEach(anchor => { anchor.removeAttribute('href'); anchor.setAttribute('aria-disabled', 'true'); });
  copy.disabled = true; status.textContent = text().feedChecking;
  if (activity === 'fast' && !preferences.weekly && !preferences.white) { status.textContent = text().noSelection; return; }
  try {
    if (!availableFeeds.has(url)) {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      if (!response.ok || !response.headers.get('Content-Type')?.startsWith('text/calendar')) throw new Error('Calendar unavailable');
      availableFeeds.add(url);
    }
    if (!dialog.open || options !== dialog.querySelector('.subscription-options') || input.value !== url) return;
    anchors.forEach(anchor => { anchor.href = links[anchor.dataset.provider as keyof typeof links]; anchor.setAttribute('aria-disabled', 'false'); });
    copy.disabled = false; status.textContent = '';
  } catch {
    if (dialog.open && options === dialog.querySelector('.subscription-options') && input.value === url) status.textContent = text().feedUnavailable;
  }
}
function closeModal() { (document.querySelector('#modal') as HTMLDialogElement).close(); activeModal = null; focusBeforeModal?.focus(); }
function openModal(kind: NonNullable<typeof activeModal>, date?: string) {
  focusBeforeModal = document.activeElement as HTMLElement; activeModal = kind; if (date) selected = date;
  const dialog = document.querySelector<HTMLDialogElement>('#modal')!;
  let content = '';
  if (kind === 'reminders') content = `<span class="modal-icon">${icon('bell')}</span><h2 id="modal-title">${text().reminderTitle}</h2><p>${text().reminderIntro}</p><form id="reminder-form"><label class="check-row">${icon('sun')}<span>${text().weekly}</span><input name="weekly" type="checkbox" ${preferences.weekly ? 'checked' : ''}></label><label class="check-row">${icon('moon')}<span>${text().white}<small>13 · 14 · 15</small></span><input name="white" type="checkbox" ${preferences.white ? 'checked' : ''}></label>${subscriptionChoices('fast')}<button class="button outline full" type="submit">${icon('download')}${text().download}</button></form><p class="fine-print">${text().calendarNote}</p><div class="privacy-note">${icon('shield-check')}<p><strong>${text().privacyTitle}</strong>${text().feedPrivacy}</p></div><p class="fine-print">${text().emailNote}</p><button class="text-button" data-action="settings">${icon('settings-2')}${text().calendarSettings}</button>`;
  if (kind === 'calendar' && selected) content = `<span class="modal-icon">${icon('calendar-days')}</span><h2 id="modal-title">${text().calendarProvider}</h2><p>${format(parseDate(selected), { dateStyle: 'full' })} · ${hijriLabel(parseDate(selected))}</p>${providerChoices(calendarEventLinks(parseDate(selected), text().inviteTitle, text().inviteBody))}<p class="fine-print">${text().eventNote}</p><button class="button outline full" data-action="download-single" data-date="${selected}">${icon('download')}${text().download}</button>`;
  if (kind === 'quran-calendar') content = `<span class="modal-icon">${icon('book-open')}</span><h2 id="modal-title">${text().quranCalendar}</h2>${subscriptionChoices('quran')}<p class="fine-print">${text().feedPrivacy}</p><button class="button outline full" data-action="download-quran">${icon('download')}${text().download}</button><p class="fine-print">${text().quranCalendarNote}</p>`;
  if (kind === 'settings') content = `<h2 id="modal-title">${text().calendarSettings}</h2><form id="settings-form"><label class="form-label" for="adjustment">${text().adjustment}</label><select id="adjustment" name="adjustment">${[-1, 0, 1].map(value => `<option value="${value}" ${preferences.adjustment === value ? 'selected' : ''}>${value === -1 ? text().minusDay : value === 0 ? text().sameDay : text().plusDay}</option>`).join('')}</select><p class="fine-print">${text().adjustHint}</p><button class="button primary full" type="submit">${icon('check')}${text().save}</button></form><button class="text-button danger delete-button" data-action="reset">${icon('trash-2')}${text().reset}</button>`;
  if (kind === 'record' && selected) content = `<span class="modal-icon">${icon('heart')}</span><h2 id="modal-title">${text().record}</h2><p>${format(parseDate(selected), { dateStyle: 'full' })}</p><p class="hijri-record">${hijriLabel(parseDate(selected))}</p><div class="record-options"><button class="button ${logbook[selected] === 'fasted' ? 'primary' : 'outline'}" data-status="fasted">${icon('check')}${text().fasted}</button><button class="button ${logbook[selected] === 'missed' ? 'selected-missed' : 'outline'}" data-status="missed">${icon('x')}${text().missed}</button></div>${logbook[selected] ? `<button class="text-button" data-status="clear">${text().undo}</button>` : ''}`;
  if (kind === 'sources') content = `<h2 id="modal-title">${text().sourceTitle}</h2><p class="source-copy">${text().sourceBody}</p><div class="source-links"><a href="https://sunnah.com/tirmidhi:747" target="_blank" rel="noopener noreferrer">Jami at-Tirmidhi 747 ${icon('arrow-up-right')}</a><a href="https://sunnah.com/tirmidhi:761" target="_blank" rel="noopener noreferrer">Jami at-Tirmidhi 761 ${icon('arrow-up-right')}</a></div><p class="fine-print">${text().adjustHint}</p>`;
  dialog.innerHTML = `<button class="icon-button modal-close" data-action="close" aria-label="${text().close}" title="${text().close}">${icon('x')}</button>${content}`;
  if (!dialog.open) dialog.showModal();
  bind(dialog); createIcons({ icons });
  void updateSubscriptionChoices(dialog);
  dialog.querySelectorAll<HTMLInputElement>('#reminder-form input[type="checkbox"]').forEach(input => input.addEventListener('change', () => {
    const form = dialog.querySelector<HTMLFormElement>('#reminder-form')!; const data = new FormData(form);
    preferences.weekly = data.has('weekly'); preferences.white = data.has('white'); persist('janat.preferences', preferences);
    void updateSubscriptionChoices(dialog);
  }));
  dialog.querySelector('#reminder-form')?.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); preferences.weekly = data.has('weekly'); preferences.white = data.has('white'); persist('janat.preferences', preferences); exportCalendar(); });
  dialog.querySelector('#settings-form')?.addEventListener('submit', event => { event.preventDefault(); preferences.adjustment = Number(new FormData(event.target as HTMLFormElement).get('adjustment')); persist('janat.preferences', preferences); closeModal(); render(); toast(text().saved); });
  dialog.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(button => button.addEventListener('click', () => { if (!selected || selected > dateKey(today())) return; const status = button.dataset.status; if (status === 'clear') delete logbook[selected]; else logbook[selected] = status as FastStatus; persist('janat.logbook', logbook); closeModal(); render(); toast(text().recorded); }));
}
function bind(root: ParentNode = app) {
  root.querySelectorAll<HTMLElement>('[data-view]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); view = button.dataset.view as View; history.pushState(null, '', `#${view}`); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  root.querySelectorAll<HTMLElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'reminders' || action === 'settings' || action === 'sources') openModal(action);
    if (action === 'record') openModal('record', button.dataset.date);
    if (action === 'close') closeModal();
    if (action === 'invite') openModal('calendar', button.dataset.date);
    if (action === 'download-single') exportCalendar(button.dataset.date);
    if (action === 'copy-feed') {
      const input = button.closest('.subscription-options')?.querySelector<HTMLInputElement>('.subscription-url');
      if (input) void navigator.clipboard.writeText(input.value).then(() => toast(text().calendarUrlCopied)).catch(() => { input.select(); toast(text().clipboardError); });
    }
    if (action === 'scene') { scene = Number(button.dataset.scene); render(); }
    if (action === 'prev-month' || action === 'next-month') { month = new Date(month.getFullYear(), month.getMonth() + (action === 'next-month' ? 1 : -1), 1, 12); render(); }
    if (action === 'today') { month = new Date(today().getFullYear(), today().getMonth(), 1, 12); render(); }
    if (action === 'backup') downloadFile(JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), logbook, quranSessions, preferences }, null, 2), 'janat-logbook.json', 'application/json');
    if (action === 'quran-invite') openModal('quran-calendar');
    if (action === 'download-quran') {
      const days = Array.from({ length: 30 }, (_, offset) => { const date = addDays(today(), offset + 1); return { date, key: dateKey(date) }; });
      downloadFile(calendarInvite(days, text().quranInviteTitle, text().quranInviteBody, 'quran'), 'janat-quran-30-days.ics', 'text/calendar;charset=utf-8'); toast(text().downloaded);
    }
    if (action === 'delete-session') { quranSessions = quranSessions.filter(session => session.id !== button.dataset.id); persist('janat.quran', quranSessions); render(); toast(text().recorded); }
    if (action === 'reset-quran' && window.confirm(text().resetQuranConfirm)) { quranSessions = []; persist('janat.quran', quranSessions); render(); }
    if (action === 'reset' && window.confirm(text().resetConfirm)) { logbook = {}; persist('janat.logbook', logbook); closeModal(); render(); }
  }));
  root.querySelector('#language')?.addEventListener('change', event => { const value = (event.target as HTMLSelectElement).value; if (isLanguage(value)) void switchLanguage(value); });
  root.querySelectorAll<HTMLAnchorElement>('a[data-language]').forEach(link => link.addEventListener('click', event => {
    const language = link.dataset.language;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !isLanguage(language)) return;
    event.preventDefault(); void switchLanguage(language).then(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }));
  root.querySelector('[data-skip]')?.addEventListener('click', event => { event.preventDefault(); document.querySelector<HTMLElement>('#main')?.focus(); });
  root.querySelector('#resource-category')?.addEventListener('change', event => { resourceCategory = (event.target as HTMLSelectElement).value as typeof resourceCategory; render(); });
  root.querySelector('#quran-session')?.addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(event.target as HTMLFormElement);
    const session = { id: crypto.randomUUID(), date: data.get('date'), kind: data.get('kind'), minutes: Number(data.get('minutes')), pages: Number(data.get('pages')) };
    if (!validSession(session)) { toast(text().invalidSession); return; }
    quranSessions.push(session); persist('janat.quran', quranSessions); render(); toast(text().recorded);
  });
  root.querySelector('#quran-goal')?.addEventListener('submit', event => {
    event.preventDefault(); const goal = Number(new FormData(event.target as HTMLFormElement).get('goal'));
    if (!Number.isInteger(goal) || goal < 1 || goal > 1440) return;
    preferences.quranGoal = goal; persist('janat.preferences', preferences); render(); toast(text().saved);
  });
  const dialog = root.querySelector<HTMLDialogElement>('#modal');
  let pointerStartedOutside = false;
  dialog?.addEventListener('pointerdown', event => {
    const rect = dialog.getBoundingClientRect();
    pointerStartedOutside = event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  });
  dialog?.addEventListener('click', event => {
    if (pointerStartedOutside && event.target === dialog) closeModal();
    pointerStartedOutside = false;
  });
  dialog?.addEventListener('cancel', () => { activeModal = null; });
}
function ensureFont(language: Language) {
  const href = fontUrl(language);
  if (!href || document.querySelector(`link[data-font="${language}"]`)) return;
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; link.dataset.font = language;
  document.head.append(link);
}
async function resolveLanguage(language: Language): Promise<[Language, Messages]> {
  ensureFont(language);
  const loaded = await loadMessages(language);
  return loaded === en && language !== 'en' ? ['en', en] : [language, loaded];
}
async function switchLanguage(requested: Language, updateUrl = true) {
  const request = ++languageRequest;
  const [language, loaded] = await resolveLanguage(requested);
  if (request !== languageRequest) return;
  copy = loaded; preferences.language = language; persist('janat.preferences', preferences);
  if (updateUrl) history.replaceState(history.state, '', `${languagePath(language)}${location.search}${location.hash}`);
  render();
}
async function init() {
  const pathLanguage = languageFromPath(location.pathname);
  const requested = pathLanguage ?? storedLanguage ?? detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
  const [language, loaded] = await resolveLanguage(requested);
  copy = loaded; preferences.language = language;
  if (pathLanguage && pathLanguage !== storedLanguage) persist('janat.preferences', preferences);
  if (languageFromPath(location.pathname) !== (language === 'en' ? undefined : language) && ['/', '/index.html', `/${requested}/`].includes(location.pathname)) {
    history.replaceState(history.state, '', `${languagePath(language)}${location.search}${location.hash}`);
  }
  render();
}
window.addEventListener('popstate', () => {
  view = routeView();
  // Language switches replace history entries, so older entries can carry a stale language path.
  if (languageFromPath(location.pathname) !== (preferences.language === 'en' ? undefined : preferences.language)) {
    history.replaceState(history.state, '', `${languagePath(preferences.language)}${location.search}${location.hash}`);
  }
  render();
});
void init();
window.setInterval(() => {
  if (view !== 'home' || activeModal || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  scene = (scene + 1) % 3;
  const image = document.querySelector('.hero-image'); if (image) image.className = `hero-image scene-${scene}`;
  const verse = document.querySelector('.verse'); if (verse) verse.innerHTML = verseMarkup();
  document.querySelectorAll<HTMLButtonElement>('.scene-dot').forEach((dot, index) => { dot.classList.toggle('active', index === scene); dot.setAttribute('aria-pressed', String(index === scene)); });
  const nextScene = document.querySelector<HTMLElement>('.scene-label'); if (nextScene) nextScene.dataset.scene = String((scene + 1) % 3);
}, 20000);