import { describe, expect, it } from 'vitest';
import { messages } from './locales';
import { detectLanguage, fontUrl, languageFromPath, languageInfo, languageLink, languagePath, languages } from './languages';
import { cachedMessages, loadMessages } from './i18n';

const placeholders = (value: string) => [...value.matchAll(/\{[a-z]+\}/gi)].map(match => match[0]).sort();

describe('translations', () => {
  const english = messages.en as Record<string, string>;

  it.each(languages)('%s has every English key, filled in, with the same placeholders', language => {
    const copy = messages[language] as Record<string, string>;
    expect(Object.keys(copy).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(english)) {
      expect(typeof copy[key], `${language}.${key}`).toBe('string');
      expect(copy[key].trim(), `${language}.${key}`).not.toBe('');
      expect(placeholders(copy[key]), `${language}.${key}`).toEqual(placeholders(value));
    }
  });

  it('keeps each SEO title and description within search-friendly lengths', () => {
    for (const language of languages) {
      expect(messages[language].seoTitle.length, language).toBeLessThanOrEqual(90);
      expect(messages[language].seoDescription.length, language).toBeGreaterThan(70);
      expect(messages[language].seoDescription.length, language).toBeLessThanOrEqual(200);
    }
  });

  it('loads and caches a locale on demand', async () => {
    const urdu = await loadMessages('ur');
    expect(urdu.seoTitle).toBe(messages.ur.seoTitle);
    expect(cachedMessages('ur')).toBe(urdu);
  });
});

describe('language routing', () => {
  it('maps every language to a unique path and back', () => {
    expect(languagePath('en')).toBe('/');
    for (const language of languages.filter(code => code !== 'en')) {
      expect(languagePath(language)).toBe(`/${language}/`);
      expect(languageFromPath(languagePath(language))).toBe(language);
      expect(languageFromPath(`/${language}`)).toBe(language);
    }
    expect(languageFromPath('/')).toBeUndefined();
    expect(languageFromPath('/en/')).toBe('en');
    expect(languageFromPath('/de/')).toBeUndefined();
    expect(languageFromPath('/api/calendar')).toBeUndefined();
  });

  it('gives English an explicit link, because `/` follows the saved language', () => {
    expect(languageLink('en')).toBe('/en/');
    expect(languageLink('ur')).toBe('/ur/');
    expect(languageFromPath(languageLink('en'))).toBe('en');
  });

  it('detects the best language from browser preferences', () => {
    expect(detectLanguage(['ur-PK', 'en-GB'])).toBe('ur');
    expect(detectLanguage(['de-DE', 'tr-TR'])).toBe('tr');
    expect(detectLanguage(['in-ID'])).toBe('id');
    expect(detectLanguage(['prs-AF'])).toBe('fa');
    expect(detectLanguage(['ms'])).toBe('ms');
    expect(detectLanguage(['de-DE', 'ja'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('marks Arabic, Urdu and Persian as right-to-left only', () => {
    const rtl = languages.filter(language => languageInfo[language].dir === 'rtl');
    expect(rtl).toEqual(['ar', 'ur', 'fa']);
  });

  it('loads extra web fonts only for scripts that need them', () => {
    expect(fontUrl('en')).toBeUndefined();
    expect(fontUrl('ur')).toContain('Noto+Nastaliq+Urdu');
    expect(fontUrl('bn')).toContain('Hind+Siliguri');
    expect(fontUrl('fa')).toContain('Vazirmatn');
  });
});
