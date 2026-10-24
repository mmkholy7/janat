import { readFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import { onRequest } from './functions/api/calendar';
import { languageFromPath, languages } from './src/languages';
import { dateSite, renderDatePage, renderDatePages, subjectForPath, subjectUrl } from './src/dates-pages';
import { localizeHtml, sitemap } from './src/seo';

const calendarFeed: Plugin = {
  name: 'janat-calendar-feed',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || '/', 'http://localhost');
      if (url.pathname !== '/api/calendar') { next(); return; }
      try {
        const result = onRequest({ request: new Request(url, { method: request.method }) });
        response.statusCode = result.status;
        result.headers.forEach((value, key) => response.setHeader(key, value));
        response.end(await result.text());
      } catch {
        response.statusCode = 500;
        response.end('Calendar temporarily unavailable');
      }
    });
  },
};

// Dev server: localize index.html for /, /ar/, /ur/ … so the dev site matches production.
const localizedDevHtml: Plugin = {
  name: 'janat-seo-dev',
  apply: 'serve',
  transformIndexHtml: {
    order: 'pre',
    // Fasting-date pages arrive already rendered (no seo markers left).
    handler: (html, context) => !html.includes('<!--seo:head-->') ? html : localizeHtml(html, languageFromPath(new URL(context.originalUrl ?? '/', 'http://localhost').pathname) ?? 'en'),
  },
};

// Dev server: render /fasting/…, /ur/fasting/2026-11/ … on request, like the static files in production.
const datePagesDev: Plugin = {
  name: 'janat-dates-dev',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || '/', 'http://localhost');
      const site = dateSite(new Date());
      if (!url.pathname.endsWith('/') && subjectForPath(site, `${url.pathname}/`)) {
        response.statusCode = 301;
        response.setHeader('Location', `${url.pathname}/${url.search}`);
        response.end();
        return;
      }
      const match = subjectForPath(site, url.pathname);
      if (!match) { next(); return; }
      try {
        const template = await readFile(new URL('./index.html', import.meta.url), 'utf8');
        const html = renderDatePage(template, match.lang, match.subject, site, { script: '/src/page.ts', styles: ['/src/theme.css'] });
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(await server.transformIndexHtml(request.url || '/', html));
      } catch (error) {
        next(error);
      }
    });
  },
};

// Build: pre-render one crawlable page per language (dist/index.html, dist/ur/index.html, …) and the sitemap.
const localizedPages: Plugin = {
  name: 'janat-seo-pages',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    const page = bundle['index.html'];
    if (!page || page.type !== 'asset') throw new Error('index.html was not emitted');
    const template = String(page.source);
    for (const language of languages) {
      const chunk = Object.values(bundle).find(item => item.type === 'chunk' && item.facadeModuleId?.replace(/\\/g, '/').endsWith(`/src/locales/${language}.ts`));
      const html = localizeHtml(template, language, chunk && language !== 'en' ? [`<link rel="modulepreload" crossorigin href="/${chunk.fileName}" />`] : []);
      if (language === 'en') page.source = html;
      // en/index.html backs the explicit English link; its canonical URL is still `/`.
      this.emitFile({ type: 'asset', fileName: `${language}/index.html`, source: html });
    }
    // Fasting-date pages: hub, years, months and occasions in every language. A monthly scheduled deploy keeps them current.
    const script = Object.values(bundle).find(item => item.type === 'chunk' && item.facadeModuleId?.replace(/\\/g, '/').endsWith('/src/page.ts'));
    if (!script) throw new Error('src/page.ts was not bundled');
    const site = dateSite(new Date());
    for (const { path, html } of renderDatePages(template, site, { script: `/${script.fileName}` })) this.emitFile({ type: 'asset', fileName: path, source: html });
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(new Date(), site.subjects.map(subjectUrl)) });
  },
};

export default defineConfig({
  plugins: [calendarFeed, datePagesDev, localizedDevHtml, localizedPages],
  build: {
    rollupOptions: {
      input: { index: 'index.html', page: 'src/page.ts', embed: 'embed/index.html' },
    },
  },
});
