import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp, loadConfig } from '../server.js';

const config = loadConfig({ OPENAI_API_KEY: 'sk-test', APP_PASSWORD: 'a'.repeat(24) });
const auth = 'Basic ' + Buffer.from('interpreter:' + 'a'.repeat(24)).toString('base64');
let upstreamCalls = [];
let base;
let server;

before(async () => {
  const fakeFetch = async (url, init) => {
    upstreamCalls.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ value: 'ek_test', expires_at: 1 }), { status: 200 });
  };
  server = createApp({ ...config, perMinute: 3 }, { fetchImpl: fakeFetch });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const session = (body, headers = {}) => fetch(base + '/session', {
  method: 'POST',
  headers: { Authorization: auth, 'X-Interpreter-Request': 'start', 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('config validation', () => {
  assert.throws(() => loadConfig({ OPENAI_API_KEY: 'x', APP_PASSWORD: 'short' }));
  assert.throws(() => loadConfig({ APP_PASSWORD: 'a'.repeat(24) }));
});

test('health check needs no login', async () => {
  const res = await fetch(base + '/healthz');
  assert.equal(res.status, 200);
});

test('pages require Basic Auth', async () => {
  assert.equal((await fetch(base + '/')).status, 401);
  const ok = await fetch(base + '/?utm=1', { headers: { Authorization: auth } });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-security-policy'), /connect-src 'self' https:\/\/api\.openai\.com/);
});

test('session rejects missing header and bad options', async () => {
  assert.equal((await session({}, { 'X-Interpreter-Request': 'nope' })).status, 403);
  assert.equal((await session({ language: 'klingon' })).status, 400);
  assert.equal((await session({ noise: 'loud' })).status, 400);
});

test('session forwards language and noise settings', async () => {
  upstreamCalls = [];
  const res = await session({ language: 'ja', noise: 'far_field' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { value: 'ek_test', expires_at: 1 });
  const { session: s } = upstreamCalls[0].body;
  assert.equal(s.model, 'gpt-realtime-translate');
  assert.equal(s.audio.output.language, 'ja');
  assert.deepEqual(s.audio.input.noise_reduction, { type: 'far_field' });
});

test('session is rate limited', async () => {
  // Earlier test used 1 of 3 slots.
  assert.equal((await session({})).status, 200);
  assert.equal((await session({})).status, 200);
  assert.equal((await session({})).status, 429);
});
