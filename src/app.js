// Shared request handler built on Web standard APIs (Request/Response/crypto.subtle),
// so the same code runs on Cloudflare Workers (src/worker.js) and Node (server.js).

const OPENAI_API = 'https://api.openai.com/v1/realtime/translations';

// Target languages offered in the UI (session.audio.output.language).
export const LANGUAGES = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'vi', 'th', 'id', 'hi', 'ar'];
export const NOISE_MODES = ['near_field', 'far_field', 'off'];

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'microphone=(self), camera=(), screen-wake-lock=(self)',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://api.openai.com; media-src 'self' blob: mediastream:; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Strict-Transport-Security': 'max-age=31536000',
};

export function loadConfig(env) {
  const {
    OPENAI_API_KEY, APP_PASSWORD, APP_USERNAME = 'interpreter',
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
  return { apiKey: OPENAI_API_KEY.trim(), username: APP_USERNAME, password: APP_PASSWORD, maxMinutes, perMinute };
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// Compare fixed-length digests without early exit.
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/**
 * @param config  result of loadConfig()
 * @param options.serveAsset (request, pathname) => Promise<Response|null>
 * @param options.fetchImpl  fetch used to reach OpenAI (overridable in tests)
 */
export function createHandler(config, { serveAsset, fetchImpl = fetch }) {
  const expectedAuth = sha256('Basic ' + btoa(config.username + ':' + config.password));
  const safetyId = sha256('live-interpreter:' + config.username).then(hex);
  // Best-effort limiter. On Cloudflare it is per isolate, not global.
  let sessionRequests = [];

  const respond = (request, status, body, type = 'text/plain; charset=utf-8', extra = {}) =>
    new Response(request.method === 'HEAD' ? null : body, {
      status, headers: { 'Content-Type': type, ...SECURITY_HEADERS, ...extra },
    });

  return async function handle(request) {
    const send = (...args) => respond(request, ...args);
    const { pathname: path } = new URL(request.url);
    const isGet = request.method === 'GET' || request.method === 'HEAD';

    if (isGet && path === '/healthz') return send(200, 'ok');
    const given = await sha256(request.headers.get('authorization') ?? '');
    if (!equalBytes(given, await expectedAuth)) {
      return send(401, 'Login required.', undefined, {
        'WWW-Authenticate': 'Basic realm="Live Interpreter", charset="UTF-8"',
      });
    }

    if (isGet && path === '/config') {
      return send(200, JSON.stringify({ maxMinutes: config.maxMinutes, languages: LANGUAGES }), 'application/json');
    }
    if (isGet) {
      const asset = await serveAsset(request, path);
      if (asset) {
        const headers = new Headers(asset.headers);
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
        return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers });
      }
    }
    if (request.method !== 'POST' || path !== '/session') return send(404, 'Not found.');
    if (request.headers.get('x-interpreter-request') !== 'start') return send(403, 'Request blocked.');

    let options = {};
    try {
      const raw = await request.text();
      if (raw.length > 2048) throw new Error('too large');
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
          'OpenAI-Safety-Identifier': await safetyId,
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
  };
}
