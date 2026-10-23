import { createIcons, MoonStar, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Bell, BookOpen, Check, X, Download, Copy, ShieldCheck, Settings2, Moon, Sun, Heart, Sprout, Globe, Image, Trash2, House, NotebookPen, Library, Share2, Quote, Pause, Play, Mail, Linkedin, ImageDown, Gem, HandHeart, Shuffle, Cookie, Sparkles, CalendarPlus } from 'lucide';
import { addDays, calendarEventLinks, calendarInvite, calendarSubscriptionLinks, dateKey, fastDay, fastDaysBetween, hijriDate, upcomingDays, type FastDay, type FastStatus } from './calendar';
import { loadMessages, locales, verses, type Messages } from './i18n';
import { detectLanguage, fontUrl, isLanguage, languageFromPath, languageInfo, languageLink, languagePath, languages, SITE_URL, type Language } from './languages';
import en from './locales/en';
import { faqSection } from './faq';
import { resources, type ResourceCategory } from './resources';
import { collectionKeys, gradeKeys, hadithUrl, hadiths, type Hadith } from './hadith';
import { composeDaysText, composeHadithText, shareLinks, shareNetworks, type ShareMessage, type ShareNetwork, type SharedHadith } from './share';
import { brandIcon, brands } from './brands';
import { renderShareImage, type ShareImageCell, type ShareImageFast, type ShareImageInput } from './share-image';
import { applyConsent, saveConsent, storedConsent, type Consent } from './consent';
import './theme.css';

type View = 'home' | 'calendar' | 'logbook' | 'quran' | 'resources';
type Preferences = { language: Language; adjustment: number; weekly: boolean; white: boolean; quranGoal: number };
type QuranSession = { id: string; date: string; kind: 'recitation' | 'revision'; minutes: number; pages: number };
const app = document.querySelector<HTMLDivElement>('#app')!;
const icons = { MoonStar, Gem, HandHeart, Shuffle, Cookie, Sparkles, CalendarPlus, Share2, Quote, Pause, Play, Mail, Linkedin, ImageDown, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Bell, BookOpen, Check, X, Download, Copy, ShieldCheck, Settings2, Moon, Sun, Heart, Sprout, Globe, Image, Trash2, House, NotebookPen, Library };
const navIcons: Record<View, string> = { home: 'house', calendar: 'calendar-days', logbook: 'notebook-pen', quran: 'book-open', resources: 'library' };
const shortLanguageNames: Partial<Record<Language, string>> = { ar: 'عربي', ur: 'اردو', bn: 'বাংলা', fa: 'فارسی' };
let storageAvailable = true;
applyConsent(storedConsent());
let consentOpen = storedConsent() === null;
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
let activeModal: 'reminders' | 'settings' | 'record' | 'sources' | 'calendar' | 'quran-calendar' | 'share' | null = null;
const HADITH_MS = 9000;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Start on a different hadith each day; rotation then runs every HADITH_MS.
let hadithIndex = Math.floor(Date.now() / 86400000) % hadiths.length;
let hadithPaused = reducedMotion();
let hadithHeld = false;
let hadithVisible = false;
let hadithTimer = 0;
let hadithStartedAt = 0;
let hadithRemaining = HADITH_MS;
let hadithObserver: IntersectionObserver | null = null;
type SharePeriod = 'day' | 'week' | 'month';
type DaysSubject = { kind: 'days'; period: SharePeriod; anchor: string; hadith: number };
const sharePeriods: SharePeriod[] = ['day', 'week', 'month'];
let shareSubject: DaysSubject | { kind: 'hadith'; index: number } = { kind: 'days', period: 'week', anchor: '', hadith: 0 };
let shareBlob: Blob | null = null;
let shareImageUrl = '';
let shareRequest = 0;
const availableFeeds = new Set<string>();
let focusBeforeModal: HTMLElement | null = null;
let copy: Messages = en;
let languageRequest = 0;
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
function dateLine() {
  return `<div class="date-line"><span>${icon('sun')}${format(today(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span>${icon('moon-star')}${hijriLabel(today())}<span class="date-dot"></span>${text().hijriYear} ${number(hijriDate(today(), preferences.adjustment).year)}</span></div>`;
}
function hero() {
  const day = upcomingDays(today(), 1, preferences.adjustment)[0];
  return `<section class="hero" aria-label="${text().landscape}">
    <div class="hero-image scene-${scene}" role="img" aria-label="${text().landscape}"></div><div class="hero-shade"></div>
    <div class="hero-inner">${dateLine()}<div class="hero-main"><div class="eyebrow light">${icon('sprout')} ${text().tagline}</div>
    <h1>${text().greeting}<br><span>${text().greetingEnd}</span></h1><p class="hero-intro">${text().intro}</p>
    <button class="button pale" data-action="reminders">${icon('bell')}${text().addReminders}${icon('arrow-up-right')}</button>
    <div class="verse" aria-live="off">${verseMarkup()}</div></div>
    <aside class="next-fast"><div class="eyebrow">${icon('moon')} ${text().upcoming}</div><span class="next-relative">${relativeDate(day.date)}</span>
    <h2>${format(day.date, { weekday: 'long' })}</h2><p>${format(day.date, { day: 'numeric', month: 'long' })} <span> / </span> ${hijriLabel(day.date, { day: 'numeric', month: 'long' })}</p>
    <div class="hero-badges">${badges(day)}</div>
    <div class="next-actions"><button class="hero-link" data-action="invite" data-date="${day.key}">${text().setReminder}${icon('arrow-right')}</button><button class="button small hero-share" data-action="share-day" data-date="${day.key}">${icon('share-2')}${text().share}</button></div></aside></div>
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
  return `<section class="upcoming-section"><div class="section-heading"><div><div class="eyebrow green">${text().intentions}</div><h2>${text().nextDays}</h2><p>${text().upcomingText}</p></div><div class="section-actions"><button class="button outline small" data-action="share-days">${icon('share-2')}${text().shareDays}</button><button class="text-button" data-view="calendar">${text().viewCalendar}${icon('arrow-right')}</button></div></div>
    <div class="day-cards">${days.map((day, index) => `<article class="day-card ${index === 0 ? 'nearest' : ''} ${day.reasons.includes('white') ? 'white-day' : ''}"><div class="day-top"><span>${format(day.date, { weekday: 'long' })}</span><span class="day-relative">${relativeDate(day.date)}</span></div><div class="day-date">${number(day.date.getDate())}<span>${format(day.date, { month: 'long' })}<small>${hijriLabel(day.date, { day: 'numeric', month: 'long' })}</small></span></div><div class="day-tags">${badges(day)}</div><button class="card-action" data-action="${day.key <= dateKey(today()) ? 'record' : 'invite'}" data-date="${day.key}">${day.key <= dateKey(today()) ? (logbook[day.key] ? text()[logbook[day.key]] : text().record) : text().setReminder}${icon(day.key <= dateKey(today()) ? 'check' : 'arrow-up-right')}</button></article>`).join('')}</div></section>`;
}
function power() {
  const cards = [
    { image: 'reward', icon: 'gem', title: text().powerRewardsTitle, body: text().powerRewardsText },
    { image: 'dua', icon: 'hand-heart', title: text().powerDuaTitle, body: text().powerDuaText },
    { image: 'dates', icon: 'sprout', title: text().powerHealthTitle, body: text().powerHealthText },
  ];
  const photo = (name: string) => `<img src="/images/power/${name}-640.webp" srcset="/images/power/${name}-640.webp 640w, /images/power/${name}-1080.webp 1080w" sizes="(max-width: 760px) 300px, (max-width: 1120px) 31vw, 360px" width="1080" height="1440" alt="" loading="lazy" decoding="async">`;
  return `<section class="power-section"><div class="section-heading"><div><div class="eyebrow green">${text().tagline}</div><h2>${text().power}</h2><p>${text().powerIntro}</p></div></div>
    <div class="power-grid">${cards.map((card, index) => `<article class="power-card" style="animation-delay:${index * 130}ms"><figure class="power-arch">${photo(card.image)}</figure><div class="power-body"><span class="power-medallion">${icon(card.icon)}</span><h3>${card.title}</h3><p>${card.body}</p></div></article>`).join('')}</div></section>`;
}
function hadithReference(hadith: Hadith) { return `${text()[collectionKeys[hadith.collection]]} ${hadith.number}`; }
function hadithCount(index: number) { return text().hadithCount.replace('{n}', number(index + 1)).replace('{total}', number(hadiths.length)); }
function hadithBanner() {
  const showMeaning = preferences.language !== 'ar';
  return `<section class="hadith-banner ${hadithPaused ? '' : 'playing'}" aria-roledescription="carousel" aria-labelledby="hadith-title" style="--hadith-duration:${HADITH_MS}ms">
    <div class="hadith-head"><div><h2 id="hadith-title">${icon('quote')}${text().hadithTitle}</h2><p class="hadith-intro">${text().hadithIntro}</p></div></div>
    <div class="hadith-slides" aria-live="${hadithPaused ? 'polite' : 'off'}">${hadiths.map((hadith, index) => `<figure class="hadith-slide ${index === hadithIndex ? 'active' : ''}" aria-roledescription="slide" aria-label="${hadithCount(index)}" ${index === hadithIndex ? '' : 'inert aria-hidden="true"'}><blockquote cite="${hadithUrl(hadith)}"><p class="hadith-arabic" lang="ar" dir="rtl">${hadith.arabic}</p>${showMeaning ? `<p class="hadith-meaning">${text()[hadith.key]}</p>` : ''}</blockquote><figcaption><a class="hadith-source" href="${hadithUrl(hadith)}" target="_blank" rel="noopener noreferrer">${hadithReference(hadith)}${icon('arrow-up-right')}</a><span class="grade">${text()[gradeKeys[hadith.grade]]}</span></figcaption></figure>`).join('')}</div>
    <div class="hadith-foot"><div class="hadith-controls"><button class="icon-button" data-action="hadith-prev" aria-label="${text().previousHadith}" title="${text().previousHadith}">${icon('chevron-left')}</button><span class="hadith-count">${hadithCount(hadithIndex)}</span><button class="icon-button hadith-toggle" data-action="hadith-toggle" aria-label="${hadithPaused ? text().play : text().pause}" title="${hadithPaused ? text().play : text().pause}">${icon(hadithPaused ? 'play' : 'pause')}</button><button class="icon-button" data-action="hadith-next" aria-label="${text().nextHadith}" title="${text().nextHadith}">${icon('chevron-right')}</button></div><div class="hadith-progress" aria-hidden="true"><span></span></div><button class="button small hadith-share" data-action="share-hadith">${icon('share-2')}${text().shareHadith}</button></div></section>`;
}
// The countdown pauses (keeping its remaining time) while the banner is hovered, focused, off-screen, in a hidden tab, or paused.
function syncHadith() {
  const banner = document.querySelector<HTMLElement>('.hadith-banner');
  window.clearTimeout(hadithTimer);
  if (!banner) return;
  const running = !hadithPaused && !hadithHeld && hadithVisible && !document.hidden && !activeModal;
  if (running) {
    hadithStartedAt = performance.now();
    hadithTimer = window.setTimeout(() => showHadith(hadithIndex + 1), hadithRemaining);
  } else if (hadithStartedAt) {
    hadithRemaining = Math.max(0, hadithRemaining - (performance.now() - hadithStartedAt));
    hadithStartedAt = 0;
  }
  banner.classList.toggle('held', !running);
}
function showHadith(index: number) {
  const banner = document.querySelector<HTMLElement>('.hadith-banner'); if (!banner) return;
  hadithIndex = (index + hadiths.length) % hadiths.length;
  banner.querySelectorAll<HTMLElement>('.hadith-slide').forEach((slide, position) => {
    const active = position === hadithIndex;
    slide.classList.toggle('active', active); slide.inert = !active;
    if (active) slide.removeAttribute('aria-hidden'); else slide.setAttribute('aria-hidden', 'true');
  });
  banner.querySelector('.hadith-count')!.textContent = hadithCount(hadithIndex);
  // Restart the progress bar animation from zero.
  const progress = banner.querySelector('.hadith-progress'); if (progress) progress.innerHTML = '<span></span>';
  window.clearTimeout(hadithTimer); hadithStartedAt = 0; hadithRemaining = HADITH_MS;
  syncHadith();
}
function toggleHadith(button: HTMLElement) {
  hadithPaused = !hadithPaused;
  const banner = button.closest<HTMLElement>('.hadith-banner')!;
  const label = hadithPaused ? text().play : text().pause;
  button.setAttribute('aria-label', label); button.title = label; button.innerHTML = icon(hadithPaused ? 'play' : 'pause');
  banner.querySelector('.hadith-slides')?.setAttribute('aria-live', hadithPaused ? 'polite' : 'off');
  if (!hadithPaused && !banner.classList.contains('playing')) { banner.classList.add('playing'); showHadith(hadithIndex); } else syncHadith();
  createIcons({ icons });
}
function setupHadith() {
  hadithObserver?.disconnect(); hadithObserver = null; window.clearTimeout(hadithTimer);
  hadithStartedAt = 0; hadithRemaining = HADITH_MS; hadithHeld = false;
  const banner = document.querySelector<HTMLElement>('.hadith-banner'); if (!banner) return;
  const hold = (held: boolean) => { hadithHeld = held; syncHadith(); };
  banner.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hold(true); });
  banner.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') hold(banner.contains(document.activeElement)); });
  banner.addEventListener('focusin', () => hold(true));
  banner.addEventListener('focusout', event => { if (!banner.contains(event.relatedTarget as Node | null)) hold(banner.matches(':hover')); });
  const slides = banner.querySelector<HTMLElement>('.hadith-slides')!;
  let startX = 0, startY = 0;
  slides.addEventListener('touchstart', event => { startX = event.touches[0].clientX; startY = event.touches[0].clientY; }, { passive: true });
  slides.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - startX, dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const forward = languageInfo[preferences.language].dir === 'rtl' ? dx > 0 : dx < 0;
    showHadith(hadithIndex + (forward ? 1 : -1));
  }, { passive: true });
  if (!('IntersectionObserver' in window)) { hadithVisible = true; syncHadith(); return; }
  hadithVisible = false;
  hadithObserver = new IntersectionObserver(([entry]) => { hadithVisible = entry.isIntersecting; syncHadith(); }, { threshold: .35 });
  hadithObserver.observe(banner);
  syncHadith();
}
document.addEventListener('visibilitychange', () => syncHadith());

const networkLabels: Record<ShareNetwork, () => string> = { whatsapp: () => brands.whatsapp.title, telegram: () => brands.telegram.title, facebook: () => brands.facebook.title, x: () => brands.x.title, threads: () => brands.threads.title, linkedin: () => 'LinkedIn', email: () => text().email };
const networkColors: Record<ShareNetwork, string> = { whatsapp: brands.whatsapp.color, telegram: brands.telegram.color, facebook: brands.facebook.color, x: brands.x.color, threads: brands.threads.color, linkedin: '#0A66C2', email: '#8a6a2f' };
const networkIcon = (network: ShareNetwork) => network === 'linkedin' ? icon('linkedin') : network === 'email' ? icon('mail') : brandIcon(network);
const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const shareUrl = () => `${SITE_URL}${languagePath(preferences.language)}`;
const tagLabel = (reason: FastDay['reasons'][number]) => reason === 'white' ? text().white : text().weekly;
/** Picks any hadith except the one currently shown, so "another hadith" always changes it. */
const randomHadith = (except = -1) => {
  const index = Math.floor(Math.random() * (except >= 0 ? hadiths.length - 1 : hadiths.length));
  return except >= 0 && index >= except ? index + 1 : index;
};
const sharedHadith = (hadith: Hadith, separator: 'image' | 'text'): SharedHadith => ({
  arabic: hadith.arabic, meaning: preferences.language === 'ar' ? undefined : text()[hadith.key],
  reference: separator === 'text' ? `${hadithReference(hadith)} (${text()[gradeKeys[hadith.grade]]})` : `${hadithReference(hadith)} · ${text()[gradeKeys[hadith.grade]]}`,
});
const SHARE_HORIZON = 366;
const periodKeys = { day: 'periodDay', week: 'periodWeek', month: 'periodMonth' } as const;
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 12);
const monthEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
const later = (first: Date, second: Date) => dateKey(first) >= dateKey(second) ? first : second;
const hijriSpan = (start: Date, end: Date) => `${hijriLabel(start, { month: 'long' })} – ${hijriLabel(end, { month: 'long', year: 'numeric' })}`;
const weekdayLabels = () => Array.from({ length: 7 }, (_, index) => format(new Date(2026, 9, 19 + index), { weekday: 'short' }));
const fastKind = (day: FastDay | null): ShareImageFast | undefined => !day ? undefined : day.reasons.length > 1 ? 'both' : day.reasons[0];
const formatRange = (start: Date, end: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locales[preferences.language], { calendar: 'gregory', ...options }).formatRange(start, end);
/** Starts a days share; nothing before today, and Day snaps to the next fast day. */
function daysSubject(period: SharePeriod, from: Date, hadith = randomHadith()): DaysSubject {
  const start = later(from, today());
  return { kind: 'days', period, hadith, anchor: period === 'day' ? upcomingDays(start, 1, preferences.adjustment)[0].key : dateKey(start) };
}
function shareRange(subject: DaysSubject) {
  const anchor = parseDate(subject.anchor);
  const start = subject.period === 'month' ? monthStart(anchor) : anchor;
  const end = subject.period === 'day' ? anchor : subject.period === 'week' ? addDays(anchor, 6) : monthEnd(anchor);
  // The image shows the whole month; the shared list only invites to days still ahead.
  return { start, end, days: fastDaysBetween(later(start, today()), end, preferences.adjustment) };
}
/** The anchor one day, week or month away, or null past today or a year ahead. */
function steppedAnchor(subject: DaysSubject, direction: 1 | -1): string | null {
  const anchor = parseDate(subject.anchor), now = dateKey(today());
  let next: string | undefined;
  if (subject.period === 'day') next = direction > 0 ? upcomingDays(addDays(anchor, 1), 1, preferences.adjustment)[0]?.key : fastDaysBetween(today(), addDays(anchor, -1), preferences.adjustment).at(-1)?.key;
  else if (subject.period === 'week') next = dateKey(later(addDays(anchor, 7 * direction), today()));
  else next = dateKey(later(new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1, 12), today()));
  if (!next || next < now || next > dateKey(addDays(today(), SHARE_HORIZON)) || next === subject.anchor) return null;
  return subject.period === 'month' && next.slice(0, 7) === subject.anchor.slice(0, 7) ? null : next;
}
function periodLabel(subject: DaysSubject, withYear = false) {
  const { start, end } = shareRange(subject), year = withYear ? 'numeric' : undefined;
  if (subject.period === 'day') return format(start, { weekday: 'long', day: 'numeric', month: 'long', year });
  if (subject.period === 'week') return formatRange(start, end, { day: 'numeric', month: 'long', year });
  return format(start, { month: 'long', year: 'numeric' });
}
function shareMessage(): ShareMessage {
  if (shareSubject.kind === 'hadith') return { title: text().hadithTitle, url: shareUrl(), text: composeHadithText({ ...sharedHadith(hadiths[shareSubject.index], 'text'), invite: text().shareInvite }) };
  const subject = shareSubject;
  const days = shareRange(subject).days.map(day => ({ label: format(day.date, { weekday: 'long', day: 'numeric', month: 'long' }), detail: [hijriLabel(day.date, { day: 'numeric', month: 'long' }), ...day.reasons.map(tagLabel)].join(' · ') }));
  const title = subject.period === 'day' ? text().shareDayHeading : subject.period === 'week' ? text().shareHeading : text().shareMonthHeading;
  const heading = subject.period === 'day' ? title : `${title} · ${periodLabel(subject)}`;
  return { title: heading, url: shareUrl(), text: composeDaysText({ heading, days, hadith: sharedHadith(hadiths[subject.hadith], 'text'), invite: text().shareInvite }) };
}
function shareImageInput(): ShareImageInput {
  const lang = preferences.language, style = getComputedStyle(document.documentElement);
  const common = {
    dir: languageInfo[lang].dir, italic: languageInfo[lang].dir === 'ltr' && lang !== 'bn',
    body: style.getPropertyValue('--body').trim() || 'sans-serif', display: style.getPropertyValue('--display').trim() || 'serif',
    site: `${new URL(SITE_URL).host}${languagePath(lang).replace(/\/$/, '')}`, invite: text().shareInvite,
  };
  if (shareSubject.kind === 'hadith') return { ...common, kind: 'hadith', title: text().hadithTitle, ...sharedHadith(hadiths[shareSubject.index], 'image') };
  const subject = shareSubject, { start, end, days } = shareRange(subject), hadith = sharedHadith(hadiths[subject.hadith], 'image');
  const legend = { weekly: text().weekly, white: text().white }, now = dateKey(today());
  const cell = (date: Date, extra: Partial<ShareImageCell> = {}): ShareImageCell => ({ day: number(date.getDate()), hijri: number(hijriDate(date, preferences.adjustment).day), fast: fastKind(fastDay(date, preferences.adjustment)), past: dateKey(date) < now, today: dateKey(date) === now, ...extra });
  if (subject.period === 'week') {
    const cells = Array.from({ length: 7 }, (_, index) => { const date = addDays(start, index); return cell(date, { weekday: format(date, { weekday: 'short' }), month: format(date, { month: 'short' }) }); });
    return { ...common, kind: 'week', heading: text().shareHeading, subheading: periodLabel(subject, true), cells, legend, hadith };
  }
  if (subject.period === 'month') {
    const cells = [...Array<null>((start.getDay() + 6) % 7).fill(null), ...Array.from({ length: end.getDate() }, (_, index) => cell(addDays(start, index)))];
    return { ...common, kind: 'month', heading: periodLabel(subject), subheading: `${text().shareMonthHeading} · ${hijriSpan(start, end)}`, weekdays: weekdayLabels(), cells, legend, hadith };
  }
  const day = days[0] ?? upcomingDays(start, 1, preferences.adjustment)[0];
  return { ...common, kind: 'day', heading: text().shareDayHeading, weekday: format(day.date, { weekday: 'long' }), day: number(day.date.getDate()), month: format(day.date, { month: 'long' }), detail: hijriLabel(day.date), tags: day.reasons.map(reason => ({ kind: reason, label: tagLabel(reason) })), fast: fastKind(day)!, hadith };
}
function shareFileName() {
  if (shareSubject.kind === 'hadith') return `janat-hadith-${hadiths[shareSubject.index].id}.jpg`;
  const start = dateKey(shareRange(shareSubject).start);
  return shareSubject.period === 'month' ? `janat-sunnah-fasts-${start.slice(0, 7)}.jpg` : shareSubject.period === 'week' ? `janat-sunnah-fasts-week-${start}.jpg` : `janat-sunnah-fast-${start}.jpg`;
}
const stepButton = (subject: DaysSubject, direction: 1 | -1) => {
  const label = direction < 0 ? text().previousPeriod : text().nextPeriod;
  return `<button type="button" class="icon-button" data-action="share-step" data-step="${direction}" aria-label="${label}" title="${label}" ${steppedAnchor(subject, direction) ? '' : 'disabled'}>${icon(direction < 0 ? 'chevron-left' : 'chevron-right')}</button>`;
};
const periodControls = (subject: DaysSubject) => `<div class="share-period" role="group" aria-label="${text().sharePeriod}">${sharePeriods.map(period => `<button type="button" data-action="share-period" data-period="${period}" aria-pressed="${subject.period === period}">${text()[periodKeys[period]]}</button>`).join('')}</div>
    <div class="share-step">${stepButton(subject, -1)}<span class="share-step-label" aria-live="polite">${periodLabel(subject)}</span>${stepButton(subject, 1)}</div>`;
function shareContent() {
  const links = shareLinks(shareMessage());
  const isHadith = shareSubject.kind === 'hadith';
  return `<span class="modal-icon">${icon('share-2')}</span><h2 id="modal-title">${isHadith ? text().shareHadith : text().shareDays}</h2><p>${isHadith ? text().shareHadithIntro : text().shareIntro}</p>
    ${shareSubject.kind === 'days' ? periodControls(shareSubject) : ''}
    <figure class="share-preview loading"><img alt="${text().shareImageAlt}" width="1080" height="1350" hidden></figure>
    ${isHadith ? '' : `<button class="text-button share-shuffle" data-action="shuffle-hadith">${icon('shuffle')}${text().anotherHadith}</button>`}
    <button class="button primary full share-native" data-action="native-share" ${'share' in navigator ? '' : 'hidden'}>${icon('share-2')}${text().share}</button>
    <p class="share-via">${text().shareVia}</p>
    <div class="share-networks">${shareNetworks.map(network => `<a class="share-link" data-network="${network}" href="${attribute(links[network])}" ${network === 'email' ? '' : 'target="_blank" rel="noopener noreferrer"'}><span class="share-circle" style="--brand:${networkColors[network]}">${networkIcon(network)}</span><span>${networkLabels[network]()}</span></a>`).join('')}</div>
    <div class="share-tools"><button class="button outline" data-action="copy-share">${icon('copy')}${text().copyText}</button><button class="button outline" data-action="download-share-image" disabled>${icon('image-down')}${text().downloadImage}</button></div>`;
}
async function prepareShareImage(dialog: HTMLDialogElement) {
  const request = ++shareRequest; shareBlob = null;
  const preview = dialog.querySelector<HTMLElement>('.share-preview');
  const download = dialog.querySelector<HTMLButtonElement>('[data-action="download-share-image"]');
  preview?.classList.add('loading'); if (download) download.disabled = true;
  try {
    const blob = await renderShareImage(shareImageInput());
    if (request !== shareRequest || activeModal !== 'share' || !preview?.isConnected) return;
    shareBlob = blob;
    if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
    shareImageUrl = URL.createObjectURL(blob);
    const image = preview.querySelector('img')!; image.src = shareImageUrl; image.hidden = false;
    preview.classList.remove('loading');
    if (download) download.disabled = false;
  } catch {
    if (request === shareRequest && preview) preview.hidden = true;
  }
}
async function nativeShare() {
  const message = shareMessage();
  const file = shareBlob ? new File([shareBlob], shareFileName(), { type: 'image/jpeg' }) : null;
  // Many apps drop the `url` field when files are attached, so the link goes into the text instead.
  const data: ShareData = file && navigator.canShare?.({ files: [file] })
    ? { title: message.title, text: `${message.text}\n${message.url}`, files: [file] }
    : { title: message.title, text: message.text, url: message.url };
  try { await navigator.share(data); } catch (error) {
    if ((error as DOMException).name === 'AbortError') return;
    try { await navigator.share({ title: message.title, text: message.text, url: message.url }); } catch { /* the network buttons remain available */ }
  }
}
function openShare(subject: typeof shareSubject) { shareSubject = subject; openModal('share'); }
/** Updates the open share sheet in place, so focus stays where it is. */
function refreshShare(dialog: HTMLDialogElement) {
  const links = shareLinks(shareMessage());
  dialog.querySelectorAll<HTMLAnchorElement>('.share-link').forEach(link => { link.href = links[link.dataset.network as ShareNetwork]; });
  if (shareSubject.kind === 'days') {
    const subject = shareSubject;
    dialog.querySelectorAll<HTMLElement>('[data-period]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.period === subject.period)));
    const label = dialog.querySelector('.share-step-label'); if (label) label.textContent = periodLabel(subject);
    dialog.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => { button.disabled = !steppedAnchor(subject, Number(button.dataset.step) as 1 | -1); });
  }
  void prepareShareImage(dialog);
}
function shuffleSharedHadith(dialog: HTMLDialogElement) {
  if (shareSubject.kind !== 'days') return;
  shareSubject = { ...shareSubject, hadith: randomHadith(shareSubject.hadith) };
  refreshShare(dialog);
}
function setSharePeriod(dialog: HTMLDialogElement, period: SharePeriod) {
  if (shareSubject.kind !== 'days' || shareSubject.period === period || !sharePeriods.includes(period)) return;
  shareSubject = daysSubject(period, parseDate(shareSubject.anchor), shareSubject.hadith);
  refreshShare(dialog);
}
function stepShare(dialog: HTMLDialogElement, button: HTMLButtonElement, direction: 1 | -1) {
  if (shareSubject.kind !== 'days') return;
  const anchor = steppedAnchor(shareSubject, direction);
  if (!anchor) return;
  shareSubject = { ...shareSubject, anchor };
  refreshShare(dialog);
  if (button.disabled) dialog.querySelector<HTMLButtonElement>(`[data-step="${-direction}"]`)?.focus();
}
function calendarView() {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const shift = (start.getDay() + 6) % 7;
  const first = addDays(start, -shift);
  const weekDays = weekdayLabels();
  return `<section class="page-section"><div class="section-heading"><div><div class="eyebrow green">${text().hijriYear} ${number(hijriDate(month, preferences.adjustment).year)}</div><h1>${text().calendar}</h1><p>${text().selectDate}</p></div><div class="section-actions calendar-actions"><button class="button primary" data-action="reminders">${icon('calendar-plus')}${text().subscribe}</button><button class="button outline" data-action="settings">${icon('settings-2')}${text().calendarSettings}</button></div></div>
    <div class="month-bar"><h2>${format(month, { month: 'long', year: 'numeric' })}<span>${hijriSpan(start, monthEnd(month))}</span></h2><div class="month-controls"><button class="icon-button" data-action="prev-month" aria-label="${text().previous}" title="${text().previous}">${icon('chevron-left')}</button><button class="text-button" data-action="today">${text().today}</button><button class="icon-button" data-action="next-month" aria-label="${text().next}" title="${text().next}">${icon('chevron-right')}</button><button class="button primary small month-share" data-action="share-month">${icon('share-2')}${text().share}</button></div></div>
    <div class="calendar-grid">${weekDays.map(day => `<div class="weekday">${day}</div>`).join('')}${Array.from({ length: 42 }, (_, index) => {
      const date = addDays(first, index); const key = dateKey(date); const fast = fastDay(date, preferences.adjustment); const status = logbook[key];
      const white = fast?.reasons.includes('white'), indicator = fast ? `${white ? icon('moon') : ''}${fast.reasons.includes('weekly') ? icon('sun') : ''}` : '';
      return `<button class="calendar-cell ${date.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === dateKey(today()) ? 'is-today' : ''} ${fast ? 'fast-day' : ''} ${white ? 'white-day' : ''} ${status || ''}" data-action="${key <= dateKey(today()) ? 'record' : fast ? 'invite' : 'none'}" data-date="${key}" ${key > dateKey(today()) && !fast ? 'disabled' : ''} aria-label="${format(date, { dateStyle: 'full' })}, ${hijriLabel(date)}${fast ? `, ${fast.reasons.map(tagLabel).join(', ')}` : ''}${status ? `, ${text()[status]}` : ''}"><span class="cell-date">${number(date.getDate())}<small>${number(hijriDate(date, preferences.adjustment).day)}</small></span><span class="cell-indicator">${status ? icon(status === 'fasted' ? 'check' : 'x') : indicator}<span>${status ? text()[status] : fast ? (white ? text().white : format(date, { weekday: 'short' })) : ''}</span></span></button>`;
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
// Noto Nastaliq Urdu draws ﷺ about two lines tall, so every ﷺ outside Arabic text is set in Naskh.
function markSalawat(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.includes('\uFDFA') && !node.parentElement?.closest('.salawat, [lang="ar"]')) found.push(node);
  }
  for (const node of found) {
    const fragment = document.createDocumentFragment();
    node.data.split('\uFDFA').forEach((part, index) => {
      if (index) { const mark = document.createElement('span'); mark.className = 'salawat'; mark.textContent = '\uFDFA'; fragment.append(mark); }
      if (part) fragment.append(part);
    });
    node.replaceWith(fragment);
  }
}
function render() {
  const lang = preferences.language;
  updateHead();
  app.innerHTML = `<a class="skip-link" href="#main" data-skip>${text().skipLink}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${languagePath(lang)}" data-view="home" aria-label="Janat">${icon('moon-star')}<span>janat<span class="brand-dot">.</span></span><span class="brand-ar" lang="ar">جنّات</span></a>
    <nav aria-label="${text().mainNav}">${(['home', 'calendar', 'logbook', 'quran', 'resources'] as View[]).map(item => `<button class="nav-link ${view === item ? 'active' : ''}" data-view="${item}" ${view === item ? 'aria-current="page"' : ''}>${icon(navIcons[item])}<span>${text()[item]}</span></button>`).join('')}</nav>
    <div class="header-actions"><label class="language-select" title="${text().languageLabel}">${icon('globe')}<span class="language-current" aria-hidden="true">${shortLanguageNames[lang] ?? lang.toUpperCase()}</span><select id="language" aria-label="${text().languageLabel}">${languages.map(code => `<option value="${code}" lang="${code}" ${code === lang ? 'selected' : ''}>${languageInfo[code].name}</option>`).join('')}</select></label><button class="button primary header-reminder" data-action="reminders" aria-label="${text().reminders}" title="${text().reminders}">${icon('bell')}<span>${text().reminders}</span></button></div></div></header>
    <main id="main" tabindex="-1">${view === 'home' ? `${hero()}<div class="container">${stats()}${upcoming()}${hadithBanner()}${power()}<section class="future-band"><div class="future-icon">${icon('book-open')}</div><div><span class="eyebrow green">${text().recitation} & ${text().revision}</span><h2>${text().quran}</h2><p>${text().quranIntro}</p><button class="text-button" data-view="quran">${text().quranHistory}${icon('arrow-right')}</button></div><span class="future-decoration" lang="ar">اقرأ</span></section>${faqSection(text())}</div>` : `<div class="container">${view === 'calendar' ? calendarView() : view === 'resources' ? resourcesView() : view === 'quran' ? quranView() : logbookView()}</div>`}</main>
    <footer class="site-footer"><div class="container footer-main"><span class="footer-brand">${icon('moon-star')}janat.</span><span>${text().footer}</span><button class="text-button" data-action="sources">${text().source}${icon('arrow-up-right')}</button><button class="text-button" data-action="consent-settings">${icon('cookie')}${text().consentSettings}</button><span class="privacy-footer">${icon('shield-check')}${text().privacyTitle}</span></div>
    <div class="container footer-languages"><span class="footer-languages-title">${icon('globe')}${text().languagesTitle}</span><ul>${languages.map(code => `<li><a href="${languageLink(code)}" hreflang="${code}" lang="${code}" data-language="${code}" ${code === lang ? 'aria-current="true"' : ''}>${languageInfo[code].name}</a></li>`).join('')}</ul></div></footer><dialog id="modal" aria-labelledby="modal-title"></dialog>`;
  bind(); createIcons({ icons }); markSalawat(app);
  setupHadith();
  renderConsent();
  if (!storageAvailable) toast(text().storageError);
}
function renderConsent() {
  const existing = document.querySelector<HTMLElement>('.consent');
  if (consentOpen && existing?.dataset.lang === preferences.language) return;
  existing?.remove();
  if (!consentOpen) return;
  const banner = document.createElement('section');
  banner.className = 'consent'; banner.dataset.lang = preferences.language; banner.setAttribute('aria-label', text().consentSettings);
  banner.innerHTML = `<span class="consent-icon">${icon('cookie')}</span><p>${text().consentText}</p><div class="consent-actions"><button class="button small consent-decline" data-action="consent-decline">${text().consentDecline}</button><button class="button small pale" data-action="consent-accept">${text().consentAccept}</button></div>`;
  document.body.append(banner); bind(banner); createIcons({ icons });
}
function chooseConsent(consent: Consent) {
  saveConsent(consent); consentOpen = false; renderConsent(); toast(text().saved);
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
const scheduleChip = (name: 'weekly' | 'white', glyph: string, label: string) => `<label class="schedule-chip"><input type="checkbox" name="${name}" data-schedule ${preferences[name] ? 'checked' : ''}>${icon(glyph)}<span>${label}</span>${icon('check')}</label>`;
/** A subscription keeps every future day in the calendar, so it is offered first, with single events as the fallback. */
function subscriptionChoices(activity: 'fast' | 'quran', options: { title?: string; body?: string; chips?: boolean } = {}) {
  const url = subscriptionUrl(activity);
  return `<section class="subscription-options" data-activity="${activity}"><span class="badge recommended">${icon('sparkles')}${text().recommended}</span><h3>${options.title ?? text().subscribeCalendar}</h3>${options.body ? `<p class="subscription-body">${options.body}</p>` : ''}${options.chips ? `<div class="schedule-chips">${scheduleChip('weekly', 'sun', text().weekly)}${scheduleChip('white', 'moon', text().white)}</div>` : ''}${providerChoices(calendarSubscriptionLinks(url, 'Janat'), true)}<p class="feed-status fine-print" role="status">${text().feedChecking}</p><details class="feed-link"><summary>${text().otherCalendarApps}${icon('chevron-down')}</summary><div class="feed-url-row"><input class="subscription-url" aria-label="${text().subscriptionUrl}" dir="ltr" readonly value="${url}"><button type="button" class="icon-button" data-action="copy-feed" aria-label="${text().copyCalendarUrl}" title="${text().copyCalendarUrl}" disabled>${icon('copy')}</button></div></details></section><p class="fine-print">${text().feedNote}</p>`;
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
  const dialog = document.querySelector<HTMLDialogElement>('#modal')!;
  // Opening one sheet from another keeps the focus target from before the first.
  if (!dialog.contains(document.activeElement)) focusBeforeModal = document.activeElement as HTMLElement;
  activeModal = kind; if (date) selected = date;
  let content = '';
  if (kind === 'reminders') content = `<span class="modal-icon">${icon('bell')}</span><h2 id="modal-title">${text().reminderTitle}</h2><p>${text().reminderIntro}</p><form id="reminder-form"><label class="check-row">${icon('sun')}<span>${text().weekly}</span><input name="weekly" type="checkbox" data-schedule ${preferences.weekly ? 'checked' : ''}></label><label class="check-row">${icon('moon')}<span>${text().white}<small>13 · 14 · 15</small></span><input name="white" type="checkbox" data-schedule ${preferences.white ? 'checked' : ''}></label>${subscriptionChoices('fast', { title: text().subscribeAll, body: text().subscribeAllBody })}<button class="button outline full" type="submit">${icon('download')}${text().download}</button></form><p class="fine-print">${text().calendarNote}</p><div class="privacy-note">${icon('shield-check')}<p><strong>${text().privacyTitle}</strong>${text().feedPrivacy}</p></div><p class="fine-print">${text().emailNote}</p><button class="text-button" data-action="settings">${icon('settings-2')}${text().calendarSettings}</button>`;
  if (kind === 'calendar' && selected) content = `<span class="modal-icon">${icon('calendar-days')}</span><h2 id="modal-title">${text().setReminder}</h2><p>${format(parseDate(selected), { dateStyle: 'full' })} · ${hijriLabel(parseDate(selected))}</p>${subscriptionChoices('fast', { title: text().subscribeAll, body: text().subscribeAllBody, chips: true })}<p class="share-via">${text().onlyThisDay}</p><div class="event-choices">${providerChoices(calendarEventLinks(parseDate(selected), text().inviteTitle, text().inviteBody))}</div><p class="fine-print">${text().eventNote}</p><button class="button outline full" data-action="download-single" data-date="${selected}">${icon('download')}${text().download}</button><button class="button primary full modal-share" data-action="share-day" data-date="${selected}">${icon('share-2')}${text().shareThisDay}</button>`;
  if (kind === 'quran-calendar') content = `<span class="modal-icon">${icon('book-open')}</span><h2 id="modal-title">${text().quranCalendar}</h2>${subscriptionChoices('quran')}<p class="fine-print">${text().feedPrivacy}</p><button class="button outline full" data-action="download-quran">${icon('download')}${text().download}</button><p class="fine-print">${text().quranCalendarNote}</p>`;
  if (kind === 'settings') content = `<h2 id="modal-title">${text().calendarSettings}</h2><form id="settings-form"><label class="form-label" for="adjustment">${text().adjustment}</label><select id="adjustment" name="adjustment">${[-1, 0, 1].map(value => `<option value="${value}" ${preferences.adjustment === value ? 'selected' : ''}>${value === -1 ? text().minusDay : value === 0 ? text().sameDay : text().plusDay}</option>`).join('')}</select><p class="fine-print">${text().adjustHint}</p><button class="button primary full" type="submit">${icon('check')}${text().save}</button></form><button class="text-button danger delete-button" data-action="reset">${icon('trash-2')}${text().reset}</button>`;
  if (kind === 'record' && selected) content = `<span class="modal-icon">${icon('heart')}</span><h2 id="modal-title">${text().record}</h2><p>${format(parseDate(selected), { dateStyle: 'full' })}</p><p class="hijri-record">${hijriLabel(parseDate(selected))}</p><div class="record-options"><button class="button ${logbook[selected] === 'fasted' ? 'primary' : 'outline'}" data-status="fasted">${icon('check')}${text().fasted}</button><button class="button ${logbook[selected] === 'missed' ? 'selected-missed' : 'outline'}" data-status="missed">${icon('x')}${text().missed}</button></div>${logbook[selected] ? `<button class="text-button" data-status="clear">${text().undo}</button>` : ''}`;
  if (kind === 'share') content = shareContent();
  if (kind === 'sources') content = `<h2 id="modal-title">${text().sourceTitle}</h2><p class="source-copy">${text().sourceBody}</p><div class="source-links"><a href="https://sunnah.com/tirmidhi:747" target="_blank" rel="noopener noreferrer">Jami at-Tirmidhi 747 ${icon('arrow-up-right')}</a><a href="https://sunnah.com/tirmidhi:761" target="_blank" rel="noopener noreferrer">Jami at-Tirmidhi 761 ${icon('arrow-up-right')}</a></div><p class="fine-print">${text().adjustHint}</p>`;
  dialog.innerHTML = `<button class="icon-button modal-close" data-action="close" aria-label="${text().close}" title="${text().close}">${icon('x')}</button>${content}`;
  dialog.dataset.kind = kind;
  if (!dialog.open) dialog.showModal();
  bind(dialog); createIcons({ icons }); markSalawat(dialog);
  syncHadith();
  if (kind === 'share') void prepareShareImage(dialog);
  void updateSubscriptionChoices(dialog);
  dialog.querySelectorAll<HTMLInputElement>('input[data-schedule]').forEach(input => input.addEventListener('change', () => {
    dialog.querySelectorAll<HTMLInputElement>('input[data-schedule]').forEach(box => { preferences[box.name as 'weekly' | 'white'] = box.checked; });
    persist('janat.preferences', preferences);
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
    if (action === 'consent-accept' || action === 'consent-decline') chooseConsent(action === 'consent-accept' ? 'granted' : 'denied');
    if (action === 'consent-settings') { consentOpen = true; renderConsent(); document.querySelector<HTMLElement>('.consent button')?.focus(); }
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
    if (action === 'share-days') openShare(daysSubject('week', today()));
    if (action === 'share-day') openShare(daysSubject('day', parseDate(button.dataset.date ?? dateKey(today()))));
    if (action === 'share-month') openShare(daysSubject('month', monthStart(month)));
    if (action === 'share-period') setSharePeriod(document.querySelector<HTMLDialogElement>('#modal')!, button.dataset.period as SharePeriod);
    if (action === 'share-step') stepShare(document.querySelector<HTMLDialogElement>('#modal')!, button as HTMLButtonElement, Number(button.dataset.step) < 0 ? -1 : 1);
    if (action === 'shuffle-hadith') shuffleSharedHadith(document.querySelector<HTMLDialogElement>('#modal')!);
    if (action === 'share-hadith') openShare({ kind: 'hadith', index: hadithIndex });
    if (action === 'hadith-prev' || action === 'hadith-next') showHadith(hadithIndex + (action === 'hadith-next' ? 1 : -1));
    if (action === 'hadith-toggle') toggleHadith(button);
    if (action === 'native-share') void nativeShare();
    if (action === 'copy-share') {
      const message = shareMessage();
      void navigator.clipboard.writeText(`${message.text}\n${message.url}`).then(() => toast(text().textCopied)).catch(() => toast(text().clipboardError));
    }
    if (action === 'download-share-image' && shareBlob) {
      const url = URL.createObjectURL(shareBlob); const link = document.createElement('a'); link.href = url; link.download = shareFileName(); link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); toast(text().imageSaved);
    }
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
  dialog?.addEventListener('close', () => {
    shareRequest++; shareBlob = null;
    if (shareImageUrl) { URL.revokeObjectURL(shareImageUrl); shareImageUrl = ''; }
    delete dialog.dataset.kind;
    syncHadith();
  });
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