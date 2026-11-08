import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const OPENAI_API = 'https://api.openai.com/v1/realtime/translations';

// Target languages offered in the UI. The API takes a language code in
// session.audio.output.language; keep this list in sync with public/app.js.
export const LANGUAGES = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'vi', 'th', 'id', 'hi', 'ar'];
export const NOISE_MODES = ['near_field', 'far_field', 'off'];

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
  '/icon-180.png': ['icon-180.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
};

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'microphone=(self), camera=(), screen-wake-lock=(self)',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://api.openai.com; media-src 'self' blob: mediastream:; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Strict-Transport-Security': 'max-age=31536000',
};

export function loadConfig(env = process.env) {
  const {
    OPENAI_API_KEY, APP_PASSWORD, APP_USERNAME = 'interpreter',
    PORT = '3000', HOST = '127.0.0.1',
    MAX_SESSION_MINUTES = '10', SESSIONS_PER_MINUTE = '6',
  } = env;
  if (!OPENAI_API_KEY?.trim()) throw new Error('Set OPENAI_API_KEY.');
  if (!APP_PASSWORD || !/^[!-~]{20,}$/.test(APP_PASSWORD)) {
    throw new Error('Set APP_PASSWORD (20+ printable ASCII characters, no spaces).');
  }
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(APP_USERNAME)) throw new Error('APP_USERNAME may only use letters, digits, . _ -');
  const maxMinutes = Number(MAX_SESSION_MINUTES);
  const perMinute = Number(SESSIONS_PER_MINUTE);
  if (!(maxMinutes >= 1 && maxMinutes <= 120)) throw new Error('MAX_SESSION_MINUTES must be 1–120.');
  if (!(perMinute >= 1 && perMinute <= 60)) throw new Error('SESSIONS_PER_MINUTE must be 1–60.');
  return {
    apiKey: OPENAI_API_KEY.trim(), username: APP_USERNAME, password: APP_PASSWORD,
    port: Number(PORT), host: HOST, maxMinutes, perMinute,
  };
}

export function createApp(config, { fetchImpl = fetch } = {}) {
  const digest = value => createHash('sha256').update(value).digest();
  const expectedAuth = digest('Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64'));
  const safetyId = digest('live-interpreter:' + config.username).toString('hex');
  const assets = new Map(Object.entries(STATIC).map(([path, [file, type]]) =>
    [path, [readFileSync(new URL('./public/' + file, import.meta.url)), type]]));
  let sessionRequests = [];

  return createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8', extra = {}) => {
      res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...extra });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    let path;
    try { path = new URL(req.url, 'http://x').pathname; } catch { return send(400, 'Bad request.'); }
    const isGet = req.method === 'GET' || req.method === 'HEAD';

    if (isGet && path === '/healthz') return send(200, 'ok');
    if (!timingSafeEqual(digest(req.headers.authorization ?? ''), expectedAuth)) {
      return send(401, 'Login required.', undefined, {
        'WWW-Authenticate': 'Basic realm="Live Interpreter", charset="UTF-8"',
      });
    }

    if (isGet && path === '/config') {
      return send(200, JSON.stringify({ maxMinutes: config.maxMinutes, languages: LANGUAGES }), 'application/json');
    }
    if (isGet && assets.has(path)) {
      const [body, type] = assets.get(path);
      return send(200, body, type);
    }
    if (req.method !== 'POST' || path !== '/session') return send(404, 'Not found.');
    if (req.headers['x-interpreter-request'] !== 'start') return send(403, 'Request blocked.');

    let options = {};
    try {
      const raw = await readBody(req, 2048);
      if (raw) options = JSON.parse(raw);
    } catch { return send(400, 'Bad request body.'); }
    const language = options.language ?? 'zh';
    const noise = options.noise ?? 'near_field';
    if (!LANGUAGES.includes(language)) return send(400, 'Unsupported language.');
    if (!NOISE_MODES.includes(noise)) return send(400, 'Unsupported noise mode.');

    const now = Date.now();
    sessionRequests = sessionRequests.filter(time => now - time < 60_000);
    if (sessionRequests.length >= config.perMinute) return send(429, '連線次數太多，請等一分鐘再試。');
    sessionRequests.push(now);

    try {
      const upstream = await fetchImpl(OPENAI_API + '/client_secrets', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + config.apiKey,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': safetyId,
        },
        body: JSON.stringify({
          // The secret only needs to live long enough to open the WebRTC call.
          expires_after: { anchor: 'created_at', seconds: 60 },
          session: {
            model: 'gpt-realtime-translate',
            audio: {
              input: {
                transcription: { model: 'gpt-realtime-whisper' },
                noise_reduction: noise === 'off' ? null : { type: noise },
              },
              output: { language },
            },
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        console.error('client_secrets failed', upstream.status, detail.slice(0, 500));
        return send(502, 'OpenAI 連線憑證申請失敗（' + upstream.status + '）。請核對 API key、模型權限同用量。');
      }
      const { value, expires_at } = await upstream.json();
      if (typeof value !== 'string' || !value.startsWith('ek_')) {
        return send(502, 'OpenAI 回傳嘅連線憑證格式不符。');
      }
      return send(200, JSON.stringify({ value, expires_at }), 'application/json');
    } catch (error) {
      console.error('client_secrets error', error?.name, error?.message);
      return send(502, '暫時連接唔到 OpenAI，請稍後再試。');
    }
  });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const config = loadConfig();
  createApp(config).listen(config.port, config.host, () =>
    console.log(`Live Interpreter listening on http://${config.host}:${config.port}`));
}
