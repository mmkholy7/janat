import { describe, expect, it } from 'vitest';
import template from '../index.html?raw';
import { languageInfo, languages } from './languages';
import { messages } from './locales';
import { headTags, localizeHtml, pageUrl, SITE_URL, sitemap, structuredData } from './seo';

describe('search metadata', () => {
  it.each(languages)('renders a complete %s page from index.html', language => {
    const html = localizeHtml(template, language);
    const copy = messages[language];
    expect(html).toContain(`<html lang="${language}" dir="${languageInfo[language].dir}">`);
    expect(html).not.toContain('<!--seo:');
    expect(html).toContain(`<link rel="canonical" href="${pageUrl(language)}" />`);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain(copy.greeting);
    expect(html).toContain(`<meta property="og:locale" content="${languageInfo[language].ogLocale}" />`);
    for (const code of languages) expect(html).toContain(`hreflang="${code}" href="${pageUrl(code)}"`);
    expect(html).toContain(`hreflang="x-default" href="${SITE_URL}/"`);
  });

  it('uses absolute, language-specific URLs', () => {
    expect(pageUrl('en')).toBe(`${SITE_URL}/`);
    expect(pageUrl('ur')).toBe(`${SITE_URL}/ur/`);
  });

  it('refuses a template without the prerender markers', () => {
    expect(() => localizeHtml('<html><head></head><body></body></html>', 'en')).toThrow(/seo:head/);
  });

  it('inserts text containing replacement patterns literally', () => {
    const tag = '<meta name="test" content="$& $1 $` $\'" />';
    expect(localizeHtml(template, 'en', [tag])).toContain(tag);
  });

  it('escapes the JSON-LD so it cannot close its script tag', () => {
    const json = headTags('en').match(/<script type="application\/ld\+json">(.*)<\/script>/s)?.[1] ?? '';
    expect(json).not.toContain('<');
    expect(JSON.parse(json)['@context']).toBe('https://schema.org');
  });

  it('describes the app and its FAQ in structured data', () => {
    const graph = (structuredData('ar') as { '@graph': Array<Record<string, unknown>> })['@graph'];
    expect(graph.map(node => node['@type'])).toEqual(expect.arrayContaining(['WebSite', 'WebApplication', 'FAQPage']));
    for (const node of graph.filter(node => node['@type'] !== 'WebSite')) expect(node.inLanguage).toBe('ar-SA');
    const faq = graph.find(node => node['@type'] === 'FAQPage') as { mainEntity: unknown[] };
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(5);
  });
});

describe('sitemap', () => {
  it('lists every language with reciprocal hreflang alternates', () => {
    const xml = sitemap(new Date('2026-10-19T12:00:00Z'));
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.match(/<url>/g)).toHaveLength(languages.length);
    for (const language of languages) expect(xml).toContain(`<loc>${pageUrl(language)}</loc>`);
    expect(xml.match(/hreflang="x-default"/g)).toHaveLength(languages.length);
    expect(xml.match(/<xhtml:link /g)).toHaveLength(languages.length * (languages.length + 1));
    expect(xml).toContain('<lastmod>2026-10-19</lastmod>');
  });
});
