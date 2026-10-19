import { createIcons, Leaf, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, CalendarDays, Bell, BookOpen, Check, X, Download, ShieldCheck, Settings2, Moon, Sun, Heart, Sprout, Globe, Image, Trash2 } from 'lucide';
import { addDays, calendarInvite, dateKey, fastDay, hijriDate, upcomingDays, type FastDay, type FastStatus } from './calendar';
import { messages, locales, verses, hadith, type Language } from './i18n';
import './style.css';

type View = 'home' | 'calendar' | 'logbook';
type Preferences = { language: Language; adjustment: number; weekly: boolean; white: boolean };
const app = document.querySelector<HTMLDivElement>('#app')!;
const icons = { Leaf, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, CalendarDays, Bell, BookOpen, Check, X, Download, ShieldCheck, Settings2, Moon, Sun, Heart, Sprout, Globe, Image, Trash2 };
let storageAvailable = true;
function load(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { storageAvailable = false; return null; }
}
const rawPreferences = load('janat.preferences') as Partial<Preferences> | null;
let preferences: Preferences = {
  language: rawPreferences?.language && ['en', 'ar', 'fr', 'es'].includes(rawPreferences.language) ? rawPreferences.language : 'en',
  adjustment: [-1, 0, 1].includes(Number(rawPreferences?.adjustment)) ? Number(rawPreferences?.adjustment) : 0,
  weekly: rawPreferences?.weekly !== false, white: rawPreferences?.white !== false,
};
const rawLog = load('janat.logbook');
let logbook: Record<string, FastStatus> = {};
if (rawLog && typeof rawLog === 'object' && !Array.isArray(rawLog)) {
  logbook = Object.fromEntries(Object.entries(rawLog).filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && (value === 'fasted' || value === 'missed')));
}
let view: View = 'home';
let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
let scene = 0;
let selected: string | null = null;
let activeModal: 'reminders' | 'settings' | 'record' | 'sources' | null = null;
let focusBeforeModal: HTMLElement | null = null;
const text = () => messages[preferences.language];
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
function hero() {
  const day = upcomingDays(today(), 1, preferences.adjustment)[0];
  return `<section class="hero" aria-label="${text().landscape}">
    <div class="hero-image scene-${scene}" role="img" aria-label="${text().landscape}"></div><div class="hero-shade"></div>
    <div class="hero-inner"><div class="hero-main"><div class="eyebrow light">${icon('sprout')} ${text().tagline}</div>
    <h1>${text().greeting}<br><span>${text().greetingEnd}</span></h1><p class="hero-intro">${text().intro}</p>
    <button class="button pale" data-action="reminders">${icon('bell')}${text().addReminders}${icon('arrow-up-right')}</button>
    <div class="verse" aria-live="off"><p lang="ar" dir="rtl">${verses[scene].arabic}</p><span>${verses[scene][preferences.language]}</span><small>${text().quran} ${verses[scene].ref}</small></div></div>
    <aside class="next-fast"><div class="eyebrow">${icon('moon')} ${text().upcoming}</div><span class="next-relative">${relativeDate(day.date)}</span>
    <h2>${format(day.date, { weekday: 'long' })}</h2><p>${format(day.date, { day: 'numeric', month: 'long' })} <span> / </span> ${hijriLabel(day.date, { day: 'numeric', month: 'long' })}</p>
    <div class="hero-badges">${badges(day)}</div><div class="hadith"><span class="quote-mark">“</span><p>${hadith[preferences.language]}</p><a href="https://sunnah.com/muslim:1159a" target="_blank" rel="noopener noreferrer">Sahih Muslim 1159 ${icon('arrow-up-right')}</a></div>
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
function render() {
  const lang = preferences.language; document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = `Janat | ${text().tagline}`;
  app.innerHTML = `<header class="site-header"><div class="header-inner"><a class="brand" href="#" data-view="home" aria-label="Janat">${icon('leaf')}<span>janat<span class="brand-dot">.</span></span><span class="brand-ar" lang="ar">جنّات</span></a>
    <nav aria-label="${text().home}">${(['home', 'calendar', 'logbook'] as View[]).map(item => `<button class="nav-link ${view === item ? 'active' : ''}" data-view="${item}" ${view === item ? 'aria-current="page"' : ''}>${text()[item]}</button>`).join('')}</nav>
    <div class="header-actions"><label class="language-select">${icon('globe')}<select id="language" aria-label="Language / اللغة"><option value="en" ${lang === 'en' ? 'selected' : ''}>EN</option><option value="ar" ${lang === 'ar' ? 'selected' : ''}>العربية</option><option value="fr" ${lang === 'fr' ? 'selected' : ''}>FR</option><option value="es" ${lang === 'es' ? 'selected' : ''}>ES</option></select></label><button class="button primary header-reminder" data-action="reminders" aria-label="${text().reminders}" title="${text().reminders}">${icon('bell')}<span>${text().reminders}</span></button></div></div></header>
    <main>${view === 'home' ? `<div class="date-line container"><span>${icon('sun')}${format(today(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span>${hijriLabel(today())}<span class="date-dot"></span>${text().hijriYear} ${number(hijriDate(today(), preferences.adjustment).year)}</span></div>${hero()}<div class="container">${stats()}${upcoming()}<section class="future-band"><div class="future-icon">${icon('book-open')}</div><div><span class="eyebrow green">${text().soon}</span><h2>${text().quran}</h2><p>${text().quranDetail}</p></div><span class="future-decoration" lang="ar">اقرأ</span></section></div>` : `<div class="container">${view === 'calendar' ? calendarView() : logbookView()}</div>`}</main>
    <footer class="container"><span class="footer-brand">${icon('leaf')}janat.</span><span>${text().footer}</span><button class="text-button" data-action="sources">${text().source}${icon('arrow-up-right')}</button><span class="privacy-footer">${icon('shield-check')}${text().privacyTitle}</span></footer><dialog id="modal" aria-labelledby="modal-title"></dialog>`;
  bind(); createIcons({ icons });
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
function closeModal() { (document.querySelector('#modal') as HTMLDialogElement).close(); activeModal = null; focusBeforeModal?.focus(); }
function openModal(kind: NonNullable<typeof activeModal>, date?: string) {
  focusBeforeModal = document.activeElement as HTMLElement; activeModal = kind; if (date) selected = date;
  const dialog = document.querySelector<HTMLDialogElement>('#modal')!;
  let content = '';
  if (kind === 'reminders') content = `<span class="modal-icon">${icon('bell')}</span><h2 id="modal-title">${text().reminderTitle}</h2><p>${text().reminderIntro}</p><form id="reminder-form"><label class="check-row">${icon('sun')}<span>${text().weekly}</span><input name="weekly" type="checkbox" ${preferences.weekly ? 'checked' : ''}></label><label class="check-row">${icon('moon')}<span>${text().white}<small>13 · 14 · 15</small></span><input name="white" type="checkbox" ${preferences.white ? 'checked' : ''}></label><button class="button primary full" type="submit">${icon('download')}${text().download}</button></form><p class="fine-print">${text().calendarNote}</p><div class="privacy-note">${icon('shield-check')}<p><strong>${text().privacyTitle}</strong>${text().privacy}</p></div><p class="fine-print">${text().emailNote}</p><button class="text-button" data-action="settings">${icon('settings-2')}${text().calendarSettings}</button>`;
  if (kind === 'settings') content = `<h2 id="modal-title">${text().calendarSettings}</h2><form id="settings-form"><label class="form-label" for="adjustment">${text().adjustment}</label><select id="adjustment" name="adjustment">${[-1, 0, 1].map(value => `<option value="${value}" ${preferences.adjustment === value ? 'selected' : ''}>${value === -1 ? text().minusDay : value === 0 ? text().sameDay : text().plusDay}</option>`).join('')}</select><p class="fine-print">${text().adjustHint}</p><button class="button primary full" type="submit">${icon('check')}${text().save}</button></form><button class="text-button danger delete-button" data-action="reset">${icon('trash-2')}${text().reset}</button>`;
  if (kind === 'record' && selected) content = `<span class="modal-icon">${icon('heart')}</span><h2 id="modal-title">${text().record}</h2><p>${format(parseDate(selected), { dateStyle: 'full' })}</p><p class="hijri-record">${hijriLabel(parseDate(selected))}</p><div class="record-options"><button class="button ${logbook[selected] === 'fasted' ? 'primary' : 'outline'}" data-status="fasted">${icon('check')}${text().fasted}</button><button class="button ${logbook[selected] === 'missed' ? 'selected-missed' : 'outline'}" data-status="missed">${icon('x')}${text().missed}</button></div>${logbook[selected] ? `<button class="text-button" data-status="clear">${text().undo}</button>` : ''}`;
  if (kind === 'sources') content = `<h2 id="modal-title">${text().sourceTitle}</h2><p class="source-copy">${text().sourceBody}</p><div class="source-links"><a href="https://sunnah.com/tirmidhi:747" target="_blank" rel="noopener noreferrer">Jami at-Tirmidhi 747 ${icon('arrow-up-right')}</a><a href="https://sunnah.com/tirmidhi:761" target="_blank" rel="noopener noreferrer">Jami at-Tirmidhi 761 ${icon('arrow-up-right')}</a></div><p class="fine-print">${text().adjustHint}</p>`;
  dialog.innerHTML = `<button class="icon-button modal-close" data-action="close" aria-label="${text().close}" title="${text().close}">${icon('x')}</button>${content}`;
  if (!dialog.open) dialog.showModal();
  bind(dialog); createIcons({ icons });
  dialog.querySelector('#reminder-form')?.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target as HTMLFormElement); preferences.weekly = data.has('weekly'); preferences.white = data.has('white'); persist('janat.preferences', preferences); exportCalendar(); });
  dialog.querySelector('#settings-form')?.addEventListener('submit', event => { event.preventDefault(); preferences.adjustment = Number(new FormData(event.target as HTMLFormElement).get('adjustment')); persist('janat.preferences', preferences); closeModal(); render(); toast(text().saved); });
  dialog.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(button => button.addEventListener('click', () => { if (!selected || selected > dateKey(today())) return; const status = button.dataset.status; if (status === 'clear') delete logbook[selected]; else logbook[selected] = status as FastStatus; persist('janat.logbook', logbook); closeModal(); render(); toast(text().recorded); }));
}
function bind(root: ParentNode = app) {
  root.querySelectorAll<HTMLElement>('[data-view]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); view = button.dataset.view as View; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  root.querySelectorAll<HTMLElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'reminders' || action === 'settings' || action === 'sources') openModal(action);
    if (action === 'record') openModal('record', button.dataset.date);
    if (action === 'close') closeModal();
    if (action === 'invite') exportCalendar(button.dataset.date);
    if (action === 'scene') { scene = Number(button.dataset.scene); render(); }
    if (action === 'prev-month' || action === 'next-month') { month = new Date(month.getFullYear(), month.getMonth() + (action === 'next-month' ? 1 : -1), 1, 12); render(); }
    if (action === 'today') { month = new Date(today().getFullYear(), today().getMonth(), 1, 12); render(); }
    if (action === 'backup') downloadFile(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), logbook, preferences }, null, 2), 'janat-logbook.json', 'application/json');
    if (action === 'reset' && window.confirm(text().resetConfirm)) { logbook = {}; persist('janat.logbook', logbook); closeModal(); render(); }
  }));
  root.querySelector('#language')?.addEventListener('change', event => { preferences.language = (event.target as HTMLSelectElement).value as Language; persist('janat.preferences', preferences); render(); });
  const dialog = root.querySelector<HTMLDialogElement>('#modal');
  dialog?.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(); } });
  dialog?.addEventListener('cancel', () => { activeModal = null; });
}
render();
window.setInterval(() => {
  if (view !== 'home' || activeModal || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  scene = (scene + 1) % 3;
  const image = document.querySelector('.hero-image'); if (image) image.className = `hero-image scene-${scene}`;
  const verse = document.querySelector('.verse'); if (verse) verse.innerHTML = `<p lang="ar" dir="rtl">${verses[scene].arabic}</p><span>${verses[scene][preferences.language]}</span><small>${text().quran} ${verses[scene].ref}</small>`;
  document.querySelectorAll<HTMLButtonElement>('.scene-dot').forEach((dot, index) => { dot.classList.toggle('active', index === scene); dot.setAttribute('aria-pressed', String(index === scene)); });
  const nextScene = document.querySelector<HTMLElement>('.scene-label'); if (nextScene) nextScene.dataset.scene = String((scene + 1) % 3);
}, 20000);