import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api-client.js';

function setup(handler) {
  const calls = [];
  const api = createApiClient({
    baseUrl: 'https://api.test',
    getToken: () => 'session',
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options, json: options.body ? JSON.parse(options.body) : undefined });
      return handler(calls.at(-1), calls.length);
    },
  });
  return { api, calls };
}
const json = (value, status = 200, headers) =>
  new Response(JSON.stringify(value), { status, headers });

test('real API paths, bearer and vote idempotency match the contract', async () => {
  const { api, calls } = setup(() => json({ id: 'room' }));
  await api.vote('room', 'venue', 'like', 'user');
  assert.equal(calls[0].url, 'https://api.test/v1/rooms/room/votes');
  assert.equal(calls[0].method, 'PUT');
  assert.equal(calls[0].headers.Authorization, 'Bearer session');
  assert.equal(calls[0].headers['Idempotency-Key'], 'vote:room:user:venue');
  assert.deepEqual(calls[0].json, { venueId: 'venue', value: 'like' });
});

test('ambiguous network retry reuses create key; a new successful operation gets a new key', async () => {
  const { api, calls } = setup((_, count) => {
    if (count === 1) throw new TypeError('network');
    return json({ id: 'room' }, 201);
  });
  const conditions = { city: 'Волгоград' };
  await assert.rejects(api.createRoom(conditions), { code: 'NETWORK_ERROR' });
  await api.createRoom(conditions);
  await api.createRoom(conditions);
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  assert.notEqual(calls[1].headers['Idempotency-Key'], calls[2].headers['Idempotency-Key']);
});

test('server failures retain keys for rotate, extend and reports', async () => {
  const { api, calls } = setup((_, count) =>
    json(
      count % 2 ? { error: { code: 'SERVICE_UNAVAILABLE', message: 'retry' } } : { ok: true },
      count % 2 ? 503 : 200,
    ),
  );
  for (const action of [
    () => api.rotateInvite('r'),
    () => api.extend('r'),
    () => api.report('r', 'v', 'closed'),
  ]) {
    await assert.rejects(action());
    await action();
    assert.equal(calls.at(-1).headers['Idempotency-Key'], calls.at(-2).headers['Idempotency-Key']);
  }
});

test('analytics contains only server-supported properties', async () => {
  const { api, calls } = setup(() => json({ ok: true }, 201));
  await api.track('fallback_shown', { roomId: 'r', mode: 'host_choice', incomplete: true });
  assert.deepEqual(calls[0].json, { name: 'fallback_shown', properties: { roomId: 'r' } });
  await api.track('booking_action', { roomId: 'r', venueId: 'v', action: 'call' });
  assert.equal(calls[1].json.properties.action, 'call');
});

test('email/MAX are not offered as supported production auth', async () => {
  const { api, calls } = setup(() => json({ token: 'token' }));
  assert.equal(api.email, undefined);
  await assert.rejects(api.miniApp('max', 'init'), { status: 501, code: 'AUTH_METHOD_DISABLED' });
  assert.equal(calls.length, 0);
});

test('401 expires a session and 429 preserves retry metadata', async () => {
  let expired;
  const api = createApiClient({
    baseUrl: '',
    getToken: () => 'old-session',
    onUnauthorized: (token) => {
      expired = token;
    },
    fetchImpl: async () => json({ error: { code: 'UNAUTHORIZED', message: 'Войдите' } }, 401),
  });
  await assert.rejects(api.me(), { status: 401 });
  assert.equal(expired, 'old-session');
  const limited = setup(() =>
    json({ error: { code: 'RATE_LIMITED', message: 'Позже' } }, 429, {
      'Retry-After': '12',
      'X-Request-ID': 'trace',
    }),
  );
  await assert.rejects(limited.api.rooms(), {
    code: 'RATE_LIMITED',
    retryAfter: 12,
    requestId: 'trace',
  });
});

test('malformed success responses are not accepted as room data', async () => {
  const { api } = setup(() => new Response('<html>proxy error</html>', { status: 200 }));
  await assert.rejects(api.rooms(), { code: 'INVALID_RESPONSE' });
});

test('a delayed response from another session cannot populate the new profile', async () => {
  let token = 'old-session';
  const api = createApiClient({
    baseUrl: '',
    getToken: () => token,
    fetchImpl: async () => {
      token = 'new-session';
      return json([{ id: 'private-old-room' }]);
    },
  });
  await assert.rejects(api.rooms(), { code: 'SESSION_CHANGED' });
});
