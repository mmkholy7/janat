import { faqEntries, faqSection } from './faq';
import { datesPath, fontUrl, languageInfo, languageLink, languagePath, languages, SITE_URL, type Language } from './languages';
import { messages } from './locales';

export { SITE_URL };
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escapeXml = (value: string) => escapeHtml(value).replace(/'/g, '&apos;');

export const pageUrl = (language: Language) => `${SITE_URL}${languagePath(language)}`;

export function structuredData(language: Language) {
  const copy = messages[language];
  const url = pageUrl(language);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Janat',
        alternateName: 'جنّات',
        inLanguage: languages.map(code => languageInfo[code].locale),
      },
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: 'Janat',
        url,
        description: copy.seoDescription,
        inLanguage: languageInfo[language].locale,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        image: OG_IMAGE,
        featureList: [copy.weekly, copy.white, copy.logbook, copy.reminders, copy.quran],
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        url,
        inLanguage: languageInfo[language].locale,
        mainEntity: faqEntries(copy).map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };
}

/** A page that exists in every language: its title, description, URL per language and JSON-LD. */
export type MetaPage = { title: string; description: string; url: (language: Language) => string; jsonLd: unknown };

export function headTags(language: Language, extra: string[] = []) {
  const copy = messages[language];
  return metaTags(language, { title: copy.seoTitle, description: copy.seoDescription, url: pageUrl, jsonLd: structuredData(language) }, extra);
}

export function metaTags(language: Language, page: MetaPage, extra: string[] = []) {
  const copy = messages[language];
  const info = languageInfo[language];
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const font = fontUrl(language);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${page.url(language)}" />`,
    ...languages.map(code => `<link rel="alternate" hreflang="${code}" href="${page.url(code)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${page.url('en')}" />`,
    '<meta name="application-name" content="Janat" />',
    '<meta name="apple-mobile-web-app-title" content="Janat" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Janat" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${page.url(language)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(copy.ogImageAlt)}" />`,
    `<meta property="og:locale" content="${info.ogLocale}" />`,
    ...languages.filter(code => code !== language).map(code => `<meta property="og:locale:alternate" content="${languageInfo[code].ogLocale}" />`),
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(copy.ogImageAlt)}" />`,
    ...(font ? [`<link rel="stylesheet" href="${font}" data-font="${language}" />`] : []),
    ...extra,
    `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
}

export function staticApp(language: Language) {
  const copy = messages[language];
  const links = languages.map(code => `<li><a href="${languageLink(code)}" hreflang="${code}" lang="${code}"${code === language ? ' aria-current="true"' : ''}>${languageInfo[code].name}</a></li>`).join('');
  return `<div class="static-shell">
      <header class="site-header"><div class="header-inner"><a class="brand" href="${languagePath(language)}" aria-label="Janat"><span>janat<span class="brand-dot">.</span></span><span class="brand-ar" lang="ar">جنّات</span></a></div></header>
      <main id="main"><section class="static-hero"><div class="container"><p class="eyebrow light">${copy.tagline}</p><h1>${copy.greeting}<br><span>${copy.greetingEnd}</span></h1><p class="hero-intro">${copy.intro}</p><p class="static-summary">${copy.seoDescription}</p><div class="static-links"><a class="button pale" href="${datesPath(language)}">${copy.datesNav}</a><a class="button dates-ghost" href="${datesPath(language, 'widget')}">${copy.widgetNav}</a></div></div></section>
      <div class="container">${faqSection(copy)}</div></main>
      <footer class="site-footer"><div class="container footer-languages"><span class="footer-languages-title">${copy.languagesTitle}</span><ul>${links}</ul></div></footer>
    </div>`;
}

export function localizeHtml(html: string, language: Language, extraHead: string[] = []) {
  for (const marker of ['<!--seo:head-->', '<!--seo:app-->']) {
    if (!html.includes(marker)) throw new Error(`index.html is missing the ${marker} marker`);
  }
  return html
    .replace(/<html[^>]*>/, () => `<html lang="${language}" dir="${languageInfo[language].dir}">`)
    .replace('<!--seo:head-->', () => headTags(language, extraHead))
    .replace('<!--seo:app-->', () => staticApp(language));
}

/** The home page in every language, then each extra page (given as its URL per language) in every language. */
export function sitemap(lastModified: Date, extra: ((language: Language) => string)[] = []) {
  const date = lastModified.toISOString().slice(0, 10);
  const urls = [pageUrl, ...extra].map(url => {
    const alternates = [...languages.map(code => [code, url(code)]), ['x-default', url('en')]]
      .map(([code, href]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${escapeXml(href)}" />`).join('\n');
    return languages.map(code => `  <url>\n    <loc>${escapeXml(url(code))}</loc>\n    <lastmod>${date}</lastmod>\n${alternates}\n  </url>`).join('\n');
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}
