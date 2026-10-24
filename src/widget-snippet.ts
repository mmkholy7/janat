import { SITE_URL, datesPath, isLanguage, type Language } from './languages';

// The embeddable widget (/embed/) and the code people paste to show it on their own site.
export type WidgetView = 'month' | 'list';
export type WidgetTheme = 'auto' | 'light' | 'dark';
export type WidgetSize = 'sidebar' | 'card' | 'full';
export type WidgetOptions = { lang: Language | 'auto'; view: WidgetView; theme: WidgetTheme; size: WidgetSize; height: number };

export const widgetViews: readonly WidgetView[] = ['month', 'list'];
export const widgetThemes: readonly WidgetTheme[] = ['auto', 'light', 'dark'];
export const widgetSizes: Record<WidgetSize, number | null> = { sidebar: 320, card: 440, full: null };
export const widgetHeights: Record<WidgetView, number> = { month: 560, list: 600 };
export const WIDGET_HEIGHT = { min: 380, max: 900 };

export const defaultWidget = (lang: Language | 'auto' = 'auto'): WidgetOptions => ({ lang, view: 'month', theme: 'auto', size: 'card', height: widgetHeights.month });

/** Reads ?lang=ur&view=list&theme=dark; anything unknown falls back to the defaults. */
export function readWidgetQuery(search: string): Pick<WidgetOptions, 'lang' | 'view' | 'theme'> {
  const params = new URLSearchParams(search);
  const lang = params.get('lang'), view = params.get('view'), theme = params.get('theme');
  return {
    lang: isLanguage(lang) ? lang : 'auto',
    view: widgetViews.includes(view as WidgetView) ? view as WidgetView : 'month',
    theme: widgetThemes.includes(theme as WidgetTheme) ? theme as WidgetTheme : 'auto',
  };
}

/** The iframe address; defaults are left out so the code stays short. */
export function widgetSrc(options: Pick<WidgetOptions, 'lang' | 'view' | 'theme'>, origin = SITE_URL) {
  const params = new URLSearchParams();
  if (options.lang !== 'auto') params.set('lang', options.lang);
  if (options.view !== 'month') params.set('view', options.view);
  if (options.theme !== 'auto') params.set('theme', options.theme);
  const query = params.toString();
  return `${origin}/embed/${query ? `?${query}` : ''}`;
}

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const clampHeight = (height: number) => Math.round(Math.min(WIDGET_HEIGHT.max, Math.max(WIDGET_HEIGHT.min, Number.isFinite(height) ? height : widgetHeights.month)));

/**
 * The code to paste: the iframe plus a plain credit link. Search engines don't credit links inside iframes,
 * so the visible link under the widget is what tells them which calendar the site uses.
 */
export function widgetSnippet(options: WidgetOptions, credit: { language: Language; title: string }) {
  const width = widgetSizes[options.size];
  const maxWidth = width ? `max-width:${width}px;` : '';
  const iframe = `<iframe src="${escapeAttribute(widgetSrc(options))}" title="${escapeAttribute(`${credit.title} · Janat`)}" loading="lazy" style="display:block;border:0;width:100%;${maxWidth}height:${clampHeight(options.height)}px"></iframe>`;
  const link = `<p style="${maxWidth}margin:6px 0 0;font:13px/1.5 system-ui,sans-serif;text-align:center"><a href="${SITE_URL}${datesPath(credit.language)}">${escapeText(credit.title)} · Janat</a></p>`;
  return `${iframe}\n${link}`;
}
