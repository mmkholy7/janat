import { onRequest } from '../functions/api/calendar';

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

export default {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    const url = new URL(request.url);
    if (url.pathname === '/api/calendar') return onRequest({ request });
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
