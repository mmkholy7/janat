import { defineConfig } from 'vite';
import { onRequest } from './functions/api/calendar';

export default defineConfig({
  plugins: [{
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
  }],
});