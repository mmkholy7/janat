import template from '../index.html?raw';
import { describe, expect, it } from 'vitest';
import { dateSite, renderDatePage, renderDatePages, subjectForPath, subjectSlug, subjectUrl } from './dates-pages';
import { languages } from './languages';
import { sitemap } from './seo';

const site = dateSite(new Date('2026-10-23T12:00:00'));
const assets = { script: '/assets/page-test.js' };
const find = (slug: string) => site.subjects.find(subject => subjectSlug(subject) === slug)!;

describe('fasting-date pages', () => {
  it('builds a hub, year, month and occasion page for the coming months', () => {
    expect(site.subjects.map(subjectSlug)).toEqual([
      '', '2026', '2027',
      '2026-10', '2026-11', '2026-12', ...Array.from({ length: 12 }, (_, index) => `2027-${String(index + 1).padStart(2, '0')}`),
      'ramadan-2027', 'shawwal-2027', 'arafah-2027', 'ashura-2027',
    ]);
  });

  it('renders every page in every language with its own address and alternates', () => {
    const pages = renderDatePages(template, site, assets);
    expect(pages).toHaveLength(site.subjects.length * languages.length);
    expect(new Set(pages.map(page => page.path)).size).toBe(pages.length);
    expect(pages.map(page => page.path)).toEqual(expect.arrayContaining(['fasting/index.html', 'fasting/2026-11/index.html', 'ur/fasting/ramadan-2027/index.html']));
    for (const { path, html } of pages) {
      const url = `https://janat.uably.com/${path.replace(/index\.html$/, '')}`;
      expect(html, path).toContain(`<link rel="canonical" href="${url}"`);
      expect(html.match(/hreflang="/g)?.length, path).toBeGreaterThanOrEqual(languages.length + 1);
      expect(html, path).toContain('application/ld+json');
      expect(html, path).toContain('<script type="module" crossorigin src="/assets/page-test.js"></script>');
      expect(html, path).not.toContain('/src/main.ts');
      expect(html, path).not.toMatch(/undefined|NaN|\{(?:month|year|years|dates|hijri|start|end|date|eid|n)\}/);
      expect(html.match(/<h1>/g), path).toHaveLength(1);
    }
  });

  it('sets the language and direction, and keeps the copy natural', () => {
    for (const lang of ['ar', 'ur', 'fa'] as const) expect(renderDatePage(template, lang, find('2026-11'), site, assets)).toContain(`<html lang="${lang}" dir="rtl">`);
    const english = renderDatePage(template, 'en', find('2026-11'), site, assets);
    expect(english).toContain('<html lang="en" dir="ltr">');
    expect(english).toContain('<title>White Days November 2026: Ayyam al-Bid &amp; Sunnah fasting dates</title>');
    expect(english).toMatch(/the White Days fall on 23\s–\s25 November \(13–15 Jumada II 1448 AH\)/);
    expect(renderDatePage(template, 'ur', find('2026-11'), site, assets)).toContain('13–15 جمادی الثانی، 1448 ہجری');
  });

  it('lets visitors add the month to their calendar and share it', () => {
    const html = renderDatePage(template, 'en', find('2026-11'), site, assets);
    expect(html).toContain('href="/en/?add=2026-11-01&amp;to=2026-11-30"');
    expect(html).toContain('webcal://janat.uably.com/api/calendar?activity=fast&amp;lang=en');
    expect(html).toContain('https://wa.me/?text=');
    expect(html).toContain('data-action="native-share"');
    const ramadan = renderDatePage(template, 'en', find('ramadan-2027'), site, assets);
    expect(ramadan).toContain('Monday, 8 February 2027');
    expect(ramadan).toContain('Sahih al-Bukhari 38');
  });

  it('lists the date pages in the sitemap', () => {
    const xml = sitemap(new Date('2026-10-23'), site.subjects.map(subjectUrl));
    expect(xml.match(/<loc>/g)).toHaveLength((site.subjects.length + 1) * languages.length);
    expect(xml).toContain('<loc>https://janat.uably.com/fasting/2026-11/</loc>');
    expect(xml).toContain('<loc>https://janat.uably.com/ur/fasting/ramadan-2027/</loc>');
  });

  it('maps dev-server paths to pages', () => {
    expect(subjectForPath(site, '/fasting/')).toMatchObject({ lang: 'en', subject: { kind: 'hub' } });
    expect(subjectForPath(site, '/ur/fasting/ramadan-2027/')).toMatchObject({ lang: 'ur', subject: { kind: 'occasion' } });
    expect(subjectForPath(site, '/fasting/2027/')).toMatchObject({ subject: { kind: 'year', year: 2027 } });
    for (const path of ['/en/fasting/', '/fasting/2030-01/', '/xx/fasting/', '/fasting', '/ur/']) expect(subjectForPath(site, path), path).toBeUndefined();
  });
});
