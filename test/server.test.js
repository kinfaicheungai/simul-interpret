import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../server.js';
import { loadConfig } from '../src/app.js';
import worker from '../src/worker.js';
import { VERSION } from '../src/version.js';
import { readFileSync } from 'node:fs';

const env = { OPENAI_API_KEY: 'sk-owner', APP_PASSWORD: 'a'.repeat(24) };
const auth = 'Basic ' + Buffer.from('interpreter:' + 'a'.repeat(24)).toString('base64');
const userKey = 'sk-proj-' + 'u'.repeat(40);
let upstreamCalls = [];
let upstreamStatus = 200;
let base;
let server;

before(async () => {
  const fakeFetch = async (url, init) => {
    upstreamCalls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    if (upstreamStatus !== 200) return new Response('{"error":{}}', { status: upstreamStatus });
    return new Response(JSON.stringify({ value: 'ek_test', expires_at: 1 }), { status: 200 });
  };
  server = createApp({ ...env, SESSIONS_PER_MINUTE: '3' }, { fetchImpl: fakeFetch });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const session = (body, headers = { Authorization: auth }) => fetch(base + '/session', {
  method: 'POST',
  headers: { 'X-Interpreter-Request': 'start', 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('config validation', () => {
  assert.throws(() => loadConfig({ OPENAI_API_KEY: 'x', APP_PASSWORD: 'short' }));
  assert.throws(() => loadConfig({ APP_PASSWORD: 'a'.repeat(24) }));
  assert.throws(() => loadConfig({ ALLOW_OWN_KEY: 'false' }));
  const ownOnly = loadConfig({});
  assert.equal(ownOnly.ownerEnabled, false);
  assert.equal(ownOnly.ownKeyEnabled, true);
});

test('page and config are public, no Basic Auth popup', async () => {
  assert.equal((await fetch(base + '/healthz')).status, 200);
  const page = await fetch(base + '/?utm=1');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('www-authenticate'), null);
  assert.match(page.headers.get('content-security-policy'), /connect-src 'self' https:\/\/api\.openai\.com/);
  const config = await (await fetch(base + '/config')).json();
  assert.equal(config.ownerEnabled, true);
  assert.equal(config.ownKeyEnabled, true);
});

test('owner login checks the password', async () => {
  assert.equal((await fetch(base + '/login', { method: 'POST', headers: { Authorization: auth } })).status, 200);
  const wrong = 'Basic ' + Buffer.from('interpreter:nope').toString('base64');
  assert.equal((await fetch(base + '/login', { method: 'POST', headers: { Authorization: wrong } })).status, 401);
});

test('session needs a password or own key', async () => {
  const res = await session({}, {});
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: 'login_required' });
  assert.equal((await session({}, { Authorization: auth, 'X-Interpreter-Request': 'nope' })).status, 403);
  assert.equal((await session({}, { 'X-OpenAI-Key': 'not-a-key' })).status, 400);
  assert.equal((await session({ language: 'klingon' })).status, 400);
});

test('owner session uses the server key and forwards settings', async () => {
  upstreamCalls = [];
  const res = await session({ language: 'ja', noise: 'far_field' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { value: 'ek_test', expires_at: 1 });
  const call = upstreamCalls[0];
  assert.equal(call.headers.Authorization, 'Bearer sk-owner');
  assert.equal(call.body.session.model, 'gpt-realtime-translate');
  assert.equal(call.body.session.audio.output.language, 'ja');
  assert.deepEqual(call.body.session.audio.input.noise_reduction, { type: 'far_field' });
});

test('own key session uses the visitor key', async () => {
  upstreamCalls = [];
  const res = await session({}, { 'X-OpenAI-Key': userKey });
  assert.equal(res.status, 200);
  assert.equal(upstreamCalls[0].headers.Authorization, 'Bearer ' + userKey);
});

test('OpenAI errors map to readable codes', async () => {
  upstreamStatus = 401;
  const res = await session({}, { 'X-OpenAI-Key': userKey });
  upstreamStatus = 200;
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'key_invalid', status: 401 });
});

test('rate limit is per identity', async () => {
  // Owner used 1 of 3 slots above.
  assert.equal((await session({})).status, 200);
  assert.equal((await session({})).status, 200);
  assert.equal((await session({})).status, 429);
  const otherKey = 'sk-proj-' + 'o'.repeat(40);
  assert.equal((await session({}, { 'X-OpenAI-Key': otherKey })).status, 200);
});

test('Cloudflare worker serves assets and guards sessions', async () => {
  const assetEnv = { ...env, ASSETS: { fetch: async req => new URL(req.url).pathname === '/'
    ? new Response('<html>', { headers: { 'Content-Type': 'text/html' } })
    : new Response('nope', { status: 404 }) } };
  const call = (path, init = {}) => worker.fetch(new Request('https://x.workers.dev' + path, init), assetEnv);
  assert.equal((await call('/healthz')).status, 200);
  const page = await call('/');
  assert.equal(page.status, 200);
  assert.equal(await page.text(), '<html>');
  assert.ok(page.headers.get('content-security-policy'));
  assert.equal((await call('/missing')).status, 404);
  const blocked = await call('/session', { method: 'POST', headers: { 'X-Interpreter-Request': 'start' } });
  assert.equal(blocked.status, 401);
});

test('version is consistent', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.version, VERSION);
  assert.match(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), new RegExp('## v' + VERSION.replaceAll('.', '\\.')));
  assert.equal((await (await fetch(base + '/config')).json()).version, VERSION);
});
