import en, { type Messages } from './locales/en';
import { languageInfo, languages, type Language } from './languages';

export { languages, type Language, type Messages };

export const locales = Object.fromEntries(languages.map(language => [language, languageInfo[language].locale])) as Record<Language, string>;

export const verses = [
  { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', ref: '94:5', key: 'verse0' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', ref: '2:152', key: 'verse1' },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ', ref: '57:4', key: 'verse2' },
] as const;

const loaders: Record<Exclude<Language, 'en'>, () => Promise<{ default: Messages }>> = {
  ar: () => import('./locales/ar'),
  ur: () => import('./locales/ur'),
  id: () => import('./locales/id'),
  tr: () => import('./locales/tr'),
  bn: () => import('./locales/bn'),
  fa: () => import('./locales/fa'),
  ms: () => import('./locales/ms'),
  fr: () => import('./locales/fr'),
  es: () => import('./locales/es'),
};

const cache = new Map<Language, Messages>([['en', en]]);

export const cachedMessages = (language: Language) => cache.get(language);

export async function loadMessages(language: Language): Promise<Messages> {
  const cached = cache.get(language);
  if (cached) return cached;
  try {
    const loaded = (await loaders[language as Exclude<Language, 'en'>]()).default;
    cache.set(language, loaded);
    return loaded;
  } catch {
    return en;
  }
}
