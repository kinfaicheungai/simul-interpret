// Shared request handler built on Web standard APIs (Request/Response/crypto.subtle),
// so the same code runs on Cloudflare Workers (src/worker.js) and Node (server.js).
//
// Two ways to get a translation session:
//  - Owner: the app's own OPENAI_API_KEY, unlocked with APP_PASSWORD (sent as Basic auth by the page).
//  - Own key: a visitor sends their own OpenAI API key in X-OpenAI-Key. It is forwarded to OpenAI
//    for this one request and never stored or logged.

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
    MAX_SESSION_MINUTES = '30', SESSIONS_PER_MINUTE = '6', ALLOW_OWN_KEY = 'true',
  } = env;
  const ownerEnabled = Boolean(OPENAI_API_KEY?.trim() || APP_PASSWORD);
  if (ownerEnabled) {
    if (!OPENAI_API_KEY?.trim()) throw new Error('Set OPENAI_API_KEY (or remove APP_PASSWORD).');
    if (!APP_PASSWORD || !/^[!-~]{20,}$/.test(APP_PASSWORD)) {
      throw new Error('Set APP_PASSWORD (20+ printable ASCII characters, no spaces).');
    }
  }
  const ownKeyEnabled = ALLOW_OWN_KEY !== 'false';
  if (!ownerEnabled && !ownKeyEnabled) throw new Error('Enable owner mode (OPENAI_API_KEY + APP_PASSWORD) or ALLOW_OWN_KEY.');
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(APP_USERNAME)) throw new Error('APP_USERNAME may only use letters, digits, . _ -');
  const maxMinutes = Number(MAX_SESSION_MINUTES);
  const perMinute = Number(SESSIONS_PER_MINUTE);
  if (!(maxMinutes >= 1 && maxMinutes <= 120)) throw new Error('MAX_SESSION_MINUTES must be 1–120.');
  if (!(perMinute >= 1 && perMinute <= 60)) throw new Error('SESSIONS_PER_MINUTE must be 1–60.');
  return {
    apiKey: OPENAI_API_KEY?.trim(), username: APP_USERNAME, password: APP_PASSWORD,
    ownerEnabled, ownKeyEnabled, maxMinutes, perMinute,
  };
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
const OWN_KEY_PATTERN = /^sk-[!-~]{20,400}$/;

// Messages are codes; the page shows them in the user's interface language.
const UPSTREAM_ERRORS = { 401: 'key_invalid', 403: 'key_no_access', 404: 'key_no_access', 429: 'key_quota' };

/**
 * @param config  result of loadConfig()
 * @param options.serveAsset (request, pathname) => Promise<Response|null>
 * @param options.fetchImpl  fetch used to reach OpenAI (overridable in tests)
 */
export function createHandler(config, { serveAsset, fetchImpl = fetch }) {
  const expectedAuth = config.ownerEnabled
    ? sha256('Basic ' + btoa(config.username + ':' + config.password)) : null;
  // Best-effort limiter per identity. On Cloudflare it is per isolate, not global.
  const recent = new Map();

  const respond = (request, status, body, type = 'text/plain; charset=utf-8') =>
    new Response(request.method === 'HEAD' ? null : body, {
      status, headers: { 'Content-Type': type, ...SECURITY_HEADERS },
    });
  const json = (request, status, data) => respond(request, status, JSON.stringify(data), 'application/json');

  async function isOwner(request) {
    if (!expectedAuth) return false;
    const header = request.headers.get('authorization');
    if (!header) return false;
    return equalBytes(await sha256(header), await expectedAuth);
  }

  function allow(identity) {
    const now = Date.now();
    const times = (recent.get(identity) ?? []).filter(time => now - time < 60_000);
    if (recent.size > 5000) recent.clear();
    if (times.length >= config.perMinute) { recent.set(identity, times); return false; }
    times.push(now);
    recent.set(identity, times);
    return true;
  }

  return async function handle(request) {
    const { pathname: path } = new URL(request.url);
    const isGet = request.method === 'GET' || request.method === 'HEAD';

    if (isGet && path === '/healthz') return respond(request, 200, 'ok');
    if (isGet && path === '/config') {
      return json(request, 200, {
        maxMinutes: config.maxMinutes, languages: LANGUAGES,
        ownerEnabled: config.ownerEnabled, ownKeyEnabled: config.ownKeyEnabled,
      });
    }
    if (request.method === 'POST' && path === '/login') {
      return (await isOwner(request)) ? json(request, 200, { ok: true }) : json(request, 401, { error: 'wrong_password' });
    }
    if (isGet) {
      const asset = await serveAsset(request, path);
      if (asset) {
        const headers = new Headers(asset.headers);
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
        return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers });
      }
    }
    if (request.method !== 'POST' || path !== '/session') return respond(request, 404, 'Not found.');
    if (request.headers.get('x-interpreter-request') !== 'start') return respond(request, 403, 'Request blocked.');

    // Who is asking, and whose key pays?
    let apiKey;
    let identity;
    const ownKey = request.headers.get('x-openai-key')?.trim();
    if (ownKey) {
      if (!config.ownKeyEnabled) return json(request, 403, { error: 'own_key_disabled' });
      if (!OWN_KEY_PATTERN.test(ownKey)) return json(request, 400, { error: 'key_format' });
      apiKey = ownKey;
      identity = 'key:' + hex(await sha256(ownKey));
    } else if (await isOwner(request)) {
      apiKey = config.apiKey;
      identity = 'owner:' + config.username;
    } else {
      return json(request, 401, { error: 'login_required' });
    }

    let options = {};
    try {
      const raw = await request.text();
      if (raw.length > 2048) throw new Error('too large');
      if (raw) options = JSON.parse(raw);
    } catch { return json(request, 400, { error: 'bad_request' }); }
    const language = options.language ?? 'zh';
    const noise = options.noise ?? 'near_field';
    if (!LANGUAGES.includes(language) || !NOISE_MODES.includes(noise)) return json(request, 400, { error: 'bad_request' });

    if (!allow(identity)) return json(request, 429, { error: 'too_many' });

    try {
      const upstream = await fetchImpl(OPENAI_API + '/client_secrets', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': hex(await sha256('live-interpreter:' + identity)),
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
        // Never log the key; OpenAI's error body does not contain it.
        console.error('client_secrets failed', identity.startsWith('key:') ? 'own-key' : 'owner', upstream.status, detail.slice(0, 300));
        return json(request, 502, { error: UPSTREAM_ERRORS[upstream.status] ?? 'upstream', status: upstream.status });
      }
      const { value, expires_at } = await upstream.json();
      if (typeof value !== 'string' || !value.startsWith('ek_')) return json(request, 502, { error: 'upstream' });
      return json(request, 200, { value, expires_at });
    } catch (error) {
      console.error('client_secrets error', error?.name, error?.message);
      return json(request, 502, { error: 'unreachable' });
    }
  };
}
