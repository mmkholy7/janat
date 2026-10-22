import { defineConfig, type Plugin } from 'vite';
import { onRequest } from './functions/api/calendar';
import { languageFromPath, languages } from './src/languages';
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
    handler: (html, context) => localizeHtml(html, languageFromPath(new URL(context.originalUrl ?? '/', 'http://localhost').pathname) ?? 'en'),
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
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(new Date()) });
  },
};

export default defineConfig({
  plugins: [calendarFeed, localizedDevHtml, localizedPages],
});
