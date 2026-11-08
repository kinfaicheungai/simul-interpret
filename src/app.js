// Shared request handler built on Web standard APIs (Request/Response/crypto.subtle),
// so the same code runs on Cloudflare Workers (src/worker.js) and Node (server.js).
//
// Who can open a translation session:
//  - Admin (APP_USERNAME + APP_PASSWORD): uses the server's OPENAI_API_KEY.
//  - Users the admin created: each uses their own OpenAI API key. The key is stored in KV
//    encrypted with a key derived from the user's password, so nobody (admin included)
//    can read it without that password. Login hands out a session token; the session
//    record holds the API key encrypted with a key derived from that token.
//  - Optional (ALLOW_OWN_KEY=true): anyone may paste a key per request in X-OpenAI-Key.

import { VERSION } from './version.js';

const OPENAI_API = 'https://api.openai.com/v1/realtime/translations';

// Target languages offered in the UI (session.audio.output.language).
export const LANGUAGES = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'vi', 'th', 'id', 'hi', 'ar'];
export const NOISE_MODES = ['near_field', 'far_field', 'off'];

const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 10_000; // passwords are system-generated and high-entropy
const USERNAME_PATTERN = /^[a-z0-9._-]{2,32}$/;
const OWN_KEY_PATTERN = /^sk-[!-~]{20,400}$/;

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
    OPENAI_API_KEY, APP_PASSWORD, APP_USERNAME = 'admin',
    MAX_SESSION_MINUTES = '30', SESSIONS_PER_MINUTE = '6', ALLOW_OWN_KEY = 'false', LOGINS_PER_MINUTE = '10',
  } = env;
  const ownerEnabled = Boolean(OPENAI_API_KEY?.trim() || APP_PASSWORD);
  if (ownerEnabled) {
    if (!OPENAI_API_KEY?.trim()) throw new Error('Set OPENAI_API_KEY (or remove APP_PASSWORD).');
    if (!APP_PASSWORD || !/^[!-~]{20,}$/.test(APP_PASSWORD)) {
      throw new Error('Set APP_PASSWORD (20+ printable ASCII characters, no spaces).');
    }
  }
  if (!USERNAME_PATTERN.test(APP_USERNAME)) throw new Error('APP_USERNAME: 2–32 lowercase letters, digits, . _ -');
  const ownKeyEnabled = ALLOW_OWN_KEY === 'true';
  const maxMinutes = Number(MAX_SESSION_MINUTES);
  const perMinute = Number(SESSIONS_PER_MINUTE);
  if (!(maxMinutes >= 1 && maxMinutes <= 120)) throw new Error('MAX_SESSION_MINUTES must be 1–120.');
  if (!(perMinute >= 1 && perMinute <= 60)) throw new Error('SESSIONS_PER_MINUTE must be 1–60.');
  return {
    apiKey: OPENAI_API_KEY?.trim(), username: APP_USERNAME, password: APP_PASSWORD,
    ownerEnabled, ownKeyEnabled, maxMinutes, perMinute, loginsPerMinute: Math.max(1, Number(LOGINS_PER_MINUTE) || 10),
  };
}

// ---------- crypto helpers ----------
const enc = new TextEncoder();
const dec = new TextDecoder();
const toB64 = bytes => btoa(String.fromCharCode(...bytes));
const fromB64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const toB64url = bytes => toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const randomBytes = n => crypto.getRandomValues(new Uint8Array(n));

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function pbkdf2(password, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, base, 256));
}
async function encrypt(text, keyBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = randomBytes(12);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
  return { iv: toB64(iv), data: toB64(data) };
}
async function decrypt(box, keyBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.data)));
}
async function hmac(keyText, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(keyText), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

// Easy to type on a phone: 4 groups of 4 lowercase letters/digits (~79 bits).
export function generatePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const chars = Array.from(randomBytes(16), b => alphabet[b % alphabet.length]);
  return [0, 4, 8, 12].map(i => chars.slice(i, i + 4).join('')).join('-');
}

// In-memory stand-in for a KV namespace (local Node server and tests).
export class MemoryKV {
  constructor() { this.map = new Map(); }
  async get(key, type) {
    const hit = this.map.get(key);
    if (!hit || (hit.exp && hit.exp < Date.now())) return null;
    return type === 'json' ? JSON.parse(hit.value) : hit.value;
  }
  async put(key, value, options = {}) {
    this.map.set(key, { value, exp: options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : 0 });
  }
  async delete(key) { this.map.delete(key); }
  async list({ prefix = '' } = {}) {
    return { keys: [...this.map.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true };
  }
}

// Messages are codes; the page shows them in the user's interface language.
const UPSTREAM_ERRORS = { 401: 'key_invalid', 403: 'key_no_access', 404: 'key_no_access', 429: 'key_quota' };

/**
 * @param config  result of loadConfig()
 * @param options.serveAsset (request, pathname) => Promise<Response|null>
 * @param options.kv         KV namespace for users and sessions (optional)
 * @param options.fetchImpl  fetch used to reach OpenAI (overridable in tests)
 */
export function createHandler(config, { serveAsset, kv, fetchImpl = fetch }) {
  const ownerSecret = config.ownerEnabled ? 'owner-session:' + config.password + ':' + config.apiKey : null;
  const ownerPasswordHash = config.ownerEnabled ? sha256('pw:' + config.password) : null;
  const recent = new Map(); // best-effort limiter; per isolate on Cloudflare

  const respond = (request, status, body, type = 'text/plain; charset=utf-8') =>
    new Response(request.method === 'HEAD' ? null : body, {
      status, headers: { 'Content-Type': type, ...SECURITY_HEADERS },
    });

  function allow(identity, limit = config.perMinute) {
    const now = Date.now();
    const times = (recent.get(identity) ?? []).filter(time => now - time < 60_000);
    if (recent.size > 5000) recent.clear();
    if (times.length >= limit) { recent.set(identity, times); return false; }
    times.push(now);
    recent.set(identity, times);
    return true;
  }

  // ----- tokens -----
  async function ownerToken() {
    const exp = Date.now() + SESSION_DAYS * 86_400_000;
    return `o1.${exp}.${toB64url(await hmac(ownerSecret, 'o1.' + exp))}`;
  }
  async function verifyOwnerToken(token) {
    const [tag, exp, sig] = token.split('.');
    if (tag !== 'o1' || !ownerSecret || !(Number(exp) > Date.now()) || !sig) return false;
    const expected = toB64url(await hmac(ownerSecret, 'o1.' + exp));
    return equalBytes(enc.encode(sig), enc.encode(expected));
  }
  const sessionId = async token => 'session:' + hex(await sha256('session:' + token));
  const tokenKey = token => sha256('enc:' + token);

  async function createUserSession(user, apiKey) {
    const token = toB64url(randomBytes(32));
    await kv.put(await sessionId(token), JSON.stringify({
      username: user.username, version: user.version, keyEnc: await encrypt(apiKey, await tokenKey(token)),
    }), { expirationTtl: SESSION_DAYS * 86_400 });
    return token;
  }

  // Returns { role, username, apiKey? } or null.
  async function identify(request) {
    const header = request.headers.get('authorization') ?? '';
    if (!header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    if (token.startsWith('o1.')) {
      return (await verifyOwnerToken(token)) ? { role: 'owner', username: config.username, apiKey: config.apiKey } : null;
    }
    if (!kv || token.length < 20) return null;
    const session = await kv.get(await sessionId(token), 'json');
    if (!session) return null;
    const user = await kv.get('user:' + session.username, 'json');
    if (!user || user.version !== session.version) return null;
    try {
      return { role: 'user', username: user.username, apiKey: await decrypt(session.keyEnc, await tokenKey(token)) };
    } catch { return null; }
  }

  async function readJson(request) {
    const raw = await request.text();
    if (raw.length > 4096) throw new Error('too large');
    return raw ? JSON.parse(raw) : {};
  }

  // ----- routes -----
  async function login(request, send) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'local';
    if (!allow('login:' + ip, config.loginsPerMinute)) return send(429, { error: 'too_many' });
    let body;
    try { body = await readJson(request); } catch { return send(400, { error: 'bad_request' }); }
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const newKey = body.apiKey ? String(body.apiKey).trim() : '';

    if (config.ownerEnabled && username === config.username) {
      const ok = equalBytes(await sha256('pw:' + password), await ownerPasswordHash);
      if (!ok) return send(401, { error: 'wrong_login' });
      return send(200, { token: await ownerToken(), role: 'owner', username });
    }
    if (!kv) return send(401, { error: 'wrong_login' });
    const user = USERNAME_PATTERN.test(username) ? await kv.get('user:' + username, 'json') : null;
    // Run the KDF even for unknown users so timing does not reveal which names exist.
    const hash = await pbkdf2(password, user ? fromB64(user.salt) : new Uint8Array(16));
    if (!user || !equalBytes(hash, fromB64(user.hash))) return send(401, { error: 'wrong_login' });

    const passwordKey = await pbkdf2(password, fromB64(user.encSalt));
    if (newKey) {
      if (!OWN_KEY_PATTERN.test(newKey)) return send(400, { error: 'key_format' });
      user.keyEnc = await encrypt(newKey, passwordKey);
    }
    if (!user.keyEnc) return send(409, { error: 'need_key' });
    let apiKey;
    try { apiKey = await decrypt(user.keyEnc, passwordKey); } catch { return send(409, { error: 'need_key' }); }
    user.lastLogin = new Date().toISOString();
    await kv.put('user:' + username, JSON.stringify(user));
    return send(200, { token: await createUserSession(user, apiKey), role: 'user', username });
  }

  // A user changes their own password. The stored API key is re-encrypted with the new
  // password; other devices are logged out.
  async function changePassword(request, send) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'local';
    if (!allow('login:' + ip, config.loginsPerMinute)) return send(429, { error: 'too_many' });
    if (!kv) return send(503, { error: 'storage_missing' });
    let body;
    try { body = await readJson(request); } catch { return send(400, { error: 'bad_request' }); }
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const newPassword = String(body.newPassword ?? '');
    if (!/^[!-~]{10,128}$/.test(newPassword)) return send(400, { error: 'weak_password' });
    const user = USERNAME_PATTERN.test(username) ? await kv.get('user:' + username, 'json') : null;
    const hash = await pbkdf2(password, user ? fromB64(user.salt) : new Uint8Array(16));
    if (!user || !equalBytes(hash, fromB64(user.hash))) return send(401, { error: 'wrong_login' });

    let apiKey = null;
    if (user.keyEnc) {
      try { apiKey = await decrypt(user.keyEnc, await pbkdf2(password, fromB64(user.encSalt))); } catch {}
    }
    const salt = randomBytes(16);
    const encSalt = randomBytes(16);
    user.salt = toB64(salt);
    user.hash = toB64(await pbkdf2(newPassword, salt));
    user.encSalt = toB64(encSalt);
    user.keyEnc = apiKey ? await encrypt(apiKey, await pbkdf2(newPassword, encSalt)) : null;
    user.version += 1;
    await kv.put('user:' + username, JSON.stringify(user));
    if (!apiKey) return send(409, { error: 'need_key' });
    return send(200, { token: await createUserSession(user, apiKey), role: 'user', username });
  }

  async function admin(request, path, send) {
    const who = await identify(request);
    if (who?.role !== 'owner') return send(403, { error: 'admin_only' });
    if (!kv) return send(503, { error: 'storage_missing' });
    if (request.method === 'GET' && path === '/admin/users') {
      const { keys } = await kv.list({ prefix: 'user:' });
      const users = [];
      for (const { name } of keys) {
        const user = await kv.get(name, 'json');
        if (user) users.push({ username: user.username, hasKey: Boolean(user.keyEnc), createdAt: user.createdAt, lastLogin: user.lastLogin ?? null });
      }
      users.sort((a, b) => a.username.localeCompare(b.username));
      return send(200, { users });
    }
    if (request.method !== 'POST') return send(404, { error: 'not_found' });
    let body;
    try { body = await readJson(request); } catch { return send(400, { error: 'bad_request' }); }
    const username = String(body.username ?? '').trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username) || username === config.username) return send(400, { error: 'bad_username' });
    const existing = await kv.get('user:' + username, 'json');

    if (path === '/admin/users/create' || path === '/admin/users/reset') {
      if (path.endsWith('create') && existing) return send(409, { error: 'user_exists' });
      if (path.endsWith('reset') && !existing) return send(404, { error: 'no_user' });
      const password = generatePassword();
      const salt = randomBytes(16);
      const user = {
        username, salt: toB64(salt), hash: toB64(await pbkdf2(password, salt)), encSalt: toB64(randomBytes(16)),
        keyEnc: null, // re-entered by the user: it was encrypted with the old password
        version: (existing?.version ?? 0) + 1,
        createdAt: existing?.createdAt ?? new Date().toISOString(), lastLogin: existing?.lastLogin ?? null,
      };
      await kv.put('user:' + username, JSON.stringify(user));
      return send(200, { username, password });
    }
    if (path === '/admin/users/delete') {
      await kv.delete('user:' + username); // existing sessions fail the user lookup from now on
      return send(200, { ok: true });
    }
    return send(404, { error: 'not_found' });
  }

  async function openSession(request, send) {
    if (request.headers.get('x-interpreter-request') !== 'start') return send(403, { error: 'blocked' });
    let apiKey;
    let identity;
    const ownKey = request.headers.get('x-openai-key')?.trim();
    if (ownKey) {
      if (!config.ownKeyEnabled) return send(403, { error: 'own_key_disabled' });
      if (!OWN_KEY_PATTERN.test(ownKey)) return send(400, { error: 'key_format' });
      apiKey = ownKey;
      identity = 'key:' + hex(await sha256(ownKey));
    } else {
      const who = await identify(request);
      if (!who) return send(401, { error: 'login_required' });
      apiKey = who.apiKey;
      identity = who.role + ':' + who.username;
    }

    let options;
    try { options = await readJson(request); } catch { return send(400, { error: 'bad_request' }); }
    const language = options.language ?? 'zh';
    const noise = options.noise ?? 'near_field';
    if (!LANGUAGES.includes(language) || !NOISE_MODES.includes(noise)) return send(400, { error: 'bad_request' });
    if (!allow(identity)) return send(429, { error: 'too_many' });

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
        // Never log keys; OpenAI's error body does not contain them.
        console.error('client_secrets failed', identity.split(':')[0], upstream.status, detail.slice(0, 300));
        return send(502, { error: UPSTREAM_ERRORS[upstream.status] ?? 'upstream', status: upstream.status });
      }
      const { value, expires_at } = await upstream.json();
      if (typeof value !== 'string' || !value.startsWith('ek_')) return send(502, { error: 'upstream' });
      return send(200, { value, expires_at });
    } catch (error) {
      console.error('client_secrets error', error?.name, error?.message);
      return send(502, { error: 'unreachable' });
    }
  }

  return async function handle(request) {
    const send = (status, data) => respond(request, status, JSON.stringify(data), 'application/json');
    const { pathname: path } = new URL(request.url);
    const isGet = request.method === 'GET' || request.method === 'HEAD';

    if (isGet && path === '/healthz') return respond(request, 200, 'ok');
    if (isGet && path === '/config') {
      return send(200, {
        version: VERSION, maxMinutes: config.maxMinutes, languages: LANGUAGES,
        ownKeyEnabled: config.ownKeyEnabled, accounts: Boolean(kv),
      });
    }
    if (request.method === 'POST' && path === '/login') return login(request, send);
    if (request.method === 'POST' && path === '/logout') {
      const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '').trim();
      if (kv && token && !token.startsWith('o1.')) await kv.delete(await sessionId(token));
      return send(200, { ok: true });
    }
    if (isGet && path === '/me') {
      const who = await identify(request);
      return who ? send(200, { role: who.role, username: who.username }) : send(401, { error: 'login_required' });
    }
    if (request.method === 'POST' && path === '/account/password') return changePassword(request, send);
    if (path.startsWith('/admin/')) return admin(request, path, send);
    if (request.method === 'POST' && path === '/session') return openSession(request, send);
    if (isGet) {
      const asset = await serveAsset(request, path);
      if (asset) {
        const headers = new Headers(asset.headers);
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
        return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers });
      }
    }
    return respond(request, 404, 'Not found.');
  };
}
