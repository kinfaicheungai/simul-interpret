// Cloudflare Workers entry point. Static files in public/ are served through the
// ASSETS binding, but only after the Basic Auth check in createHandler.
import { createHandler, loadConfig } from './app.js';

let cached;

export default {
  async fetch(request, env) {
    if (!cached) {
      try {
        const config = loadConfig(env);
        cached = createHandler(config, {
          serveAsset: async request => {
            const response = await env.ASSETS.fetch(request);
            return response.status === 404 ? null : response;
          },
        });
      } catch (error) {
        console.error(error.message);
        return new Response('Server not configured: ' + error.message, { status: 500 });
      }
    }
    return cached(request);
  },
};
