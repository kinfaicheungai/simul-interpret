// Local development server for Node 22+. Production runs on Cloudflare Workers (src/worker.js).
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { createHandler, loadConfig } from './src/app.js';

const TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
  webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png',
};

function staticAssets() {
  const files = ['index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];
  const map = new Map(files.map(file => [
    '/' + file, [readFileSync(new URL('./public/' + file, import.meta.url)), TYPES[file.split('.').pop()]],
  ]));
  map.set('/', map.get('/index.html'));
  return async (_request, path) => {
    const hit = map.get(path);
    return hit ? new Response(hit[0], { headers: { 'Content-Type': hit[1] } }) : null;
  };
}

export function createApp(env, { fetchImpl } = {}) {
  const handle = createHandler(loadConfig(env), { serveAsset: staticAssets(), fetchImpl });
  return createServer(async (req, res) => {
    try {
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const request = new Request(new URL(req.url, 'http://localhost'), {
        method: req.method,
        headers: Object.entries(req.headers).filter(([, v]) => typeof v === 'string'),
        body: hasBody ? Readable.toWeb(req) : undefined,
        duplex: hasBody ? 'half' : undefined,
      });
      const response = await handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error(error);
      res.writeHead(400).end('Bad request.');
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { PORT = '3000', HOST = '127.0.0.1' } = process.env;
  createApp(process.env).listen(Number(PORT), HOST, () =>
    console.log(`Live Interpreter listening on http://${HOST}:${PORT}`));
}
