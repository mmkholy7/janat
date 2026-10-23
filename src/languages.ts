export const languages = ['en', 'ar', 'ur', 'id', 'tr', 'bn', 'fa', 'ms', 'fr', 'es'] as const;
export type Language = typeof languages[number];

export const SITE_URL = 'https://janat.uably.com';

type LanguageInfo = { name: string; locale: string; dir: 'ltr' | 'rtl'; ogLocale: string; font?: string };

export const languageInfo: Record<Language, LanguageInfo> = {
  en: { name: 'English', locale: 'en-GB', dir: 'ltr', ogLocale: 'en_GB' },
  ar: { name: 'العربية', locale: 'ar-SA', dir: 'rtl', ogLocale: 'ar_AR' },
  ur: { name: 'اردو', locale: 'ur-PK', dir: 'rtl', ogLocale: 'ur_PK', font: 'Noto+Nastaliq+Urdu:wght@400;600;700' },
  id: { name: 'Bahasa Indonesia', locale: 'id-ID', dir: 'ltr', ogLocale: 'id_ID' },
  tr: { name: 'Türkçe', locale: 'tr-TR', dir: 'ltr', ogLocale: 'tr_TR' },
  bn: { name: 'বাংলা', locale: 'bn-BD', dir: 'ltr', ogLocale: 'bn_BD', font: 'Hind+Siliguri:wght@400;500;600;700' },
  fa: { name: 'فارسی', locale: 'fa-IR', dir: 'rtl', ogLocale: 'fa_IR', font: 'Vazirmatn:wght@400;500;600;700;800' },
  ms: { name: 'Bahasa Melayu', locale: 'ms-MY', dir: 'ltr', ogLocale: 'ms_MY' },
  fr: { name: 'Français', locale: 'fr-FR', dir: 'ltr', ogLocale: 'fr_FR' },
  es: { name: 'Español', locale: 'es-ES', dir: 'ltr', ogLocale: 'es_ES' },
};

export const isLanguage = (value: unknown): value is Language => typeof value === 'string' && (languages as readonly string[]).includes(value);

export const languagePath = (language: Language) => language === 'en' ? '/' : `/${language}/`;

// `/` follows the saved language, so links that must open English use `/en/`.
export const languageLink = (language: Language) => language === 'en' ? '/en/' : languagePath(language);

export const languageFromPath = (pathname: string): Language | undefined => {
  const segment = pathname.split('/')[1];
  return isLanguage(segment) ? segment : undefined;
};

export const fontUrl = (language: Language) => {
  const font = languageInfo[language].font;
  return font ? `https://fonts.googleapis.com/css2?family=${font}&display=swap` : undefined;
};

export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'in') return 'id';
    if (base === 'prs') return 'fa';
    if (isLanguage(base)) return base;
  }
  return 'en';
}
