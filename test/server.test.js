import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { createApp } from '../server.js';
import { MemoryKV, generatePassword, loadConfig } from '../src/app.js';
import { VERSION } from '../src/version.js';
import worker from '../src/worker.js';

const env = { OPENAI_API_KEY: 'sk-owner', APP_PASSWORD: 'a'.repeat(24) };
const userKey = 'sk-proj-' + 'u'.repeat(40);
const kv = new MemoryKV();
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
  server = createApp({ ...env, SESSIONS_PER_MINUTE: '3', LOGINS_PER_MINUTE: '100' }, { fetchImpl: fakeFetch, kv });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body, headers = {}) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body ?? {}),
});
const bearer = token => ({ Authorization: 'Bearer ' + token });
const session = (headers, body = {}) => post('/session', body, { 'X-Interpreter-Request': 'start', ...headers });
let adminToken;

test('config validation', () => {
  assert.throws(() => loadConfig({ OPENAI_API_KEY: 'x', APP_PASSWORD: 'short' }));
  assert.throws(() => loadConfig({ APP_PASSWORD: 'a'.repeat(24) }));
  assert.equal(loadConfig({}).ownerEnabled, false);
  assert.equal(loadConfig(env).ownKeyEnabled, false);
  assert.match(generatePassword(), /^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
});

test('page and config are public', async () => {
  assert.equal((await fetch(base + '/healthz')).status, 200);
  const page = await fetch(base + '/?utm=1');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /connect-src 'self' https:\/\/api\.openai\.com/);
  const config = await (await fetch(base + '/config')).json();
  assert.equal(config.version, VERSION);
  assert.equal(config.accounts, true);
});

test('admin login', async () => {
  assert.equal((await post('/login', { username: 'admin', password: 'wrong' })).status, 401);
  const res = await post('/login', { username: 'admin', password: 'a'.repeat(24) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.role, 'owner');
  adminToken = data.token;
  assert.equal((await fetch(base + '/me', { headers: bearer(adminToken) })).status, 200);
});

test('session requires login and admin uses server key', async () => {
  const anon = await session({});
  assert.equal(anon.status, 401);
  assert.equal((await session(bearer('o1.9999999999999.forged'))).status, 401);
  assert.equal((await session({ 'X-OpenAI-Key': userKey })).status, 403, 'pasting keys is off by default');
  upstreamCalls = [];
  const res = await session(bearer(adminToken), { language: 'ja', noise: 'far_field' });
  assert.equal(res.status, 200);
  const call = upstreamCalls[0];
  assert.equal(call.headers.Authorization, 'Bearer sk-owner');
  assert.equal(call.body.session.audio.output.language, 'ja');
  assert.deepEqual(call.body.session.audio.input.noise_reduction, { type: 'far_field' });
});

test('only admin can manage users', async () => {
  assert.equal((await fetch(base + '/admin/users')).status, 403);
  assert.equal((await post('/admin/users/create', { username: 'Bad Name!' }, bearer(adminToken))).status, 400);
  assert.equal((await post('/admin/users/create', { username: 'admin' }, bearer(adminToken))).status, 400);
});

test('user lifecycle: create, first login with key, session uses own key, reset, delete', async () => {
  const created = await (await post('/admin/users/create', { username: 'amy' }, bearer(adminToken))).json();
  assert.equal(created.username, 'amy');
  assert.equal((await post('/admin/users/create', { username: 'amy' }, bearer(adminToken))).status, 409);

  // Stored record never contains the password or the plain key.
  assert.equal((await post('/login', { username: 'amy', password: 'nope' })).status, 401);
  const first = await post('/login', { username: 'amy', password: created.password });
  assert.equal(first.status, 409);
  assert.equal((await first.json()).error, 'need_key');
  assert.equal((await post('/login', { username: 'amy', password: created.password, apiKey: 'bad' })).status, 400);
  const login = await post('/login', { username: 'AMY', password: created.password, apiKey: userKey });
  assert.equal(login.status, 200);
  const { token, role } = await login.json();
  assert.equal(role, 'user');
  const stored = JSON.stringify([...kv.map.values()]);
  assert.ok(!stored.includes(userKey) && !stored.includes(created.password));

  upstreamCalls = [];
  assert.equal((await session(bearer(token))).status, 200);
  assert.equal(upstreamCalls[0].headers.Authorization, 'Bearer ' + userKey);

  // Second login on another device needs no key.
  const again = await post('/login', { username: 'amy', password: created.password });
  assert.equal(again.status, 200);
  const token2 = (await again.json()).token;

  // Users cannot use admin pages.
  assert.equal((await fetch(base + '/admin/users', { headers: bearer(token) })).status, 403);
  const list = await (await fetch(base + '/admin/users', { headers: bearer(adminToken) })).json();
  assert.deepEqual(list.users.map(u => [u.username, u.hasKey]), [['amy', true]]);

  // Reset: old password and old sessions stop working; key must be re-entered.
  const reset = await (await post('/admin/users/reset', { username: 'amy' }, bearer(adminToken))).json();
  assert.equal((await session(bearer(token))).status, 401);
  assert.equal((await post('/login', { username: 'amy', password: created.password })).status, 401);
  assert.equal((await post('/login', { username: 'amy', password: reset.password })).status, 409);

  // Logout and delete.
  await post('/logout', {}, bearer(token2));
  assert.equal((await post('/admin/users/delete', { username: 'amy' }, bearer(adminToken))).status, 200);
  assert.equal((await post('/login', { username: 'amy', password: reset.password })).status, 401);
});

test('user changes own password and keeps the API key', async () => {
  const created = await (await post('/admin/users/create', { username: 'ben' }, bearer(adminToken))).json();
  const first = await (await post('/login', { username: 'ben', password: created.password, apiKey: userKey })).json();
  assert.equal((await post('/account/password', { username: 'ben', password: 'wrong', newPassword: 'my-new-pass-123' })).status, 401);
  assert.equal((await post('/account/password', { username: 'ben', password: created.password, newPassword: 'short' })).status, 400);
  const changed = await post('/account/password', { username: 'ben', password: created.password, newPassword: 'my-new-pass-123' });
  assert.equal(changed.status, 200);
  const { token } = await changed.json();
  // Old password and old sessions stop working; the new token still uses the same key.
  assert.equal((await post('/login', { username: 'ben', password: created.password })).status, 401);
  assert.equal((await session(bearer(first.token))).status, 401);
  upstreamCalls = [];
  assert.equal((await session(bearer(token))).status, 200);
  assert.equal(upstreamCalls[0].headers.Authorization, 'Bearer ' + userKey);
  assert.equal((await post('/login', { username: 'ben', password: 'my-new-pass-123' })).status, 200, 'no key needed after change');
  await post('/admin/users/delete', { username: 'ben' }, bearer(adminToken));
});

test('OpenAI errors map to readable codes', async () => {
  upstreamStatus = 401;
  const res = await session(bearer(adminToken));
  upstreamStatus = 200;
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'key_invalid', status: 401 });
});

test('rate limit per identity', async () => {
  // Admin used 2 of 3 slots above.
  assert.equal((await session(bearer(adminToken))).status, 200);
  assert.equal((await session(bearer(adminToken))).status, 429);
});

test('optional pasted keys when ALLOW_OWN_KEY=true', async () => {
  const app = createApp({ ALLOW_OWN_KEY: 'true' }, { fetchImpl: async () => new Response('{"value":"ek_x","expires_at":1}') });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${app.address().port}/session`;
  const res = await fetch(url, { method: 'POST', headers: { 'X-Interpreter-Request': 'start', 'X-OpenAI-Key': userKey } });
  app.close();
  assert.equal(res.status, 200);
});

test('Cloudflare worker wiring', async () => {
  const workerEnv = { ...env, USERS: new MemoryKV(), ASSETS: { fetch: async req => new URL(req.url).pathname === '/'
    ? new Response('<html>', { headers: { 'Content-Type': 'text/html' } })
    : new Response('nope', { status: 404 }) } };
  const call = (path, init = {}) => worker.fetch(new Request('https://x.workers.dev' + path, init), workerEnv);
  assert.equal((await call('/healthz')).status, 200);
  const page = await call('/');
  assert.equal(await page.text(), '<html>');
  assert.ok(page.headers.get('content-security-policy'));
  assert.equal((await call('/missing')).status, 404);
  assert.equal((await call('/session', { method: 'POST', headers: { 'X-Interpreter-Request': 'start' } })).status, 401);
  const login = await call('/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'a'.repeat(24) }) });
  assert.equal(login.status, 200);
});

test('version is consistent', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.version, VERSION);
  assert.ok(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').includes('## v' + VERSION));
});
