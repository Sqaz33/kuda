import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { calculateMatches, catalog, verifyInitData } from '../mock/core.mjs';
import { createMockServer } from '../mock/server.mjs';

const future = new Date(Date.now() + 2 * 86400000);
const constraints = {
  city: 'Волгоград',
  timeZone: 'Europe/Volgograd',
  date: `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`,
  time: '19:00',
  area: { type: 'district', district: 'Центральный' },
  categories: ['cafe', 'restaurant'],
  budgetMax: 2000,
  partySize: 2,
  deadlineMinutes: 30,
  exclusions: [],
};

test('catalog blocks rooms with too few eligible venues', () => {
  assert.ok(catalog(constraints).length >= 12);
  assert.equal(
    catalog({ ...constraints, area: { type: 'district', district: 'Неизвестный' } }).length,
    0,
  );
});

test('Telegram/MAX initData validation rejects tampering and stale launches', () => {
  const bot = 'test-bot-token';
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: 42, first_name: 'Маша' }),
  });
  const signed = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(bot).digest();
  params.set('hash', createHmac('sha256', secret).update(signed).digest('hex'));
  assert.equal(verifyInitData(params.toString(), bot).id, 42);
  params.set('user', JSON.stringify({ id: 43 }));
  assert.equal(verifyInitData(params.toString(), bot), null);
  params.set('auth_date', '100');
  assert.equal(verifyInitData(params.toString(), bot), null);
});

test('matching names an incomplete fallback instead of inventing consensus', () => {
  const venue = { id: 'v1', name: 'Тест' };
  const room = {
    members: [
      { id: 'a', finished: true },
      { id: 'b', finished: false },
      { id: 'c', finished: false },
    ],
    candidates: [venue],
    votes: { a: { v1: 'like' }, b: {}, c: {} },
  };
  const result = calculateMatches(room);
  assert.equal(result.matchMode, 'host_choice');
  assert.equal(result.incomplete, true);
  assert.deepEqual(
    result.matches.map((item) => item.likes),
    [1],
  );
});

test('two clients share a fixed deck, idempotent votes and a final result', async (t) => {
  const server = createMockServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(method, path, body, token) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const host = (await call('POST', '/v1/auth/guest', { name: 'Аня' })).data;
  const guest = (await call('POST', '/v1/auth/guest', { name: 'Миша' })).data;
  const estimate = await call('POST', '/v1/catalog/estimate', constraints);
  assert.ok(estimate.data.count >= 12);
  const created = (await call('POST', '/v1/rooms', { constraints }, host.token)).data;
  assert.equal(created.status, 'waiting');
  const preview = (await call('GET', `/v1/invites/${created.inviteToken}`)).data;
  assert.equal(preview.room.hostName, 'Аня');
  assert.equal(preview.room.ownVotes, undefined);
  const joined = (await call('POST', `/v1/invites/${created.inviteToken}/join`, {}, guest.token))
    .data;
  assert.equal(joined.members.length, 2);
  const started = (await call('POST', `/v1/rooms/${created.id}/start`, {}, host.token)).data;
  assert.equal(started.candidates.length, 12);
  assert.equal(
    (await call('GET', `/v1/rooms/${created.id}`, null, guest.token)).data.candidates[0].id,
    started.candidates[0].id,
  );
  const first = started.candidates[0].id;
  for (const venue of started.candidates) {
    const value = venue.id === first ? 'like' : 'dislike';
    await call('PUT', `/v1/rooms/${created.id}/votes`, { venueId: venue.id, value }, host.token);
    await call('PUT', `/v1/rooms/${created.id}/votes`, { venueId: venue.id, value }, guest.token);
  }
  const decided = (await call('GET', `/v1/rooms/${created.id}`, null, host.token)).data;
  assert.equal(decided.status, 'deciding');
  assert.equal(decided.matchMode, 'unanimous');
  assert.deepEqual(
    decided.matches.map((match) => match.venue.id),
    [first],
  );
  const repeated = await call(
    'PUT',
    `/v1/rooms/${created.id}/votes`,
    { venueId: first, value: 'like' },
    host.token,
  );
  assert.equal(repeated.status, 200);
  assert.equal(repeated.data.ownVotes[first], 'like');
  const changed = await call(
    'PUT',
    `/v1/rooms/${created.id}/votes`,
    { venueId: first, value: 'dislike' },
    host.token,
  );
  assert.equal(changed.status, 409);
  const chosen = (
    await call('PUT', `/v1/rooms/${created.id}/winner`, { venueId: first }, host.token)
  ).data;
  assert.equal(chosen.winner.id, first);
  const noted = (
    await call('PUT', `/v1/rooms/${created.id}/booking-note`, { note: 'walk_in' }, host.token)
  ).data;
  assert.equal(noted.status, 'completed');
  const reopened = (await call('GET', `/v1/invites/${created.inviteToken}`)).data;
  assert.equal(reopened.access, 'selected');
  assert.equal(reopened.room.winner.id, first);
  const upgraded = (
    await call(
      'POST',
      '/v1/auth/email/register',
      { name: 'Аня', email: 'anya@example.test', password: 'secure-pass-123' },
      host.token,
    )
  ).data;
  assert.equal(upgraded.user.id, host.user.id);
  const anotherDevice = (
    await call('POST', '/v1/auth/email/login', {
      email: 'anya@example.test',
      password: 'secure-pass-123',
    })
  ).data;
  assert.equal(anotherDevice.user.id, host.user.id);
  assert.equal(
    (await call('GET', `/v1/rooms/${created.id}`, null, anotherDevice.token)).data.winner.id,
    first,
  );
});

test('rotated invitation stops working and cancellation has a clear state', async (t) => {
  const server = createMockServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(method, path, body, token) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const host = (await call('POST', '/v1/auth/guest', { name: 'Оля' })).data;
  const room = (await call('POST', '/v1/rooms', { constraints }, host.token)).data;
  const rotated = (await call('POST', `/v1/rooms/${room.id}/rotate-invite`, {}, host.token)).data;
  assert.notEqual(rotated.inviteToken, room.inviteToken);
  assert.equal((await call('GET', `/v1/invites/${room.inviteToken}`)).status, 404);
  const cancelled = (await call('POST', `/v1/rooms/${room.id}/cancel`, {}, host.token)).data;
  assert.equal(cancelled.status, 'cancelled');
  assert.equal((await call('GET', `/v1/invites/${rotated.inviteToken}`)).data.access, 'cancelled');
});

test('a participant can finish after ten votes and cannot add more', async (t) => {
  const server = createMockServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(method, path, body, token) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const host = (await call('POST', '/v1/auth/guest', { name: 'Лена' })).data;
  const guest = (await call('POST', '/v1/auth/guest', { name: 'Саша' })).data;
  const room = (await call('POST', '/v1/rooms', { constraints }, host.token)).data;
  await call('POST', `/v1/invites/${room.inviteToken}/join`, {}, guest.token);
  const started = (await call('POST', `/v1/rooms/${room.id}/start`, {}, host.token)).data;
  for (const venue of started.candidates.slice(0, 9))
    await call(
      'PUT',
      `/v1/rooms/${room.id}/votes`,
      { venueId: venue.id, value: 'like' },
      guest.token,
    );
  assert.equal((await call('POST', `/v1/rooms/${room.id}/finish`, {}, guest.token)).status, 409);
  await call(
    'PUT',
    `/v1/rooms/${room.id}/votes`,
    { venueId: started.candidates[9].id, value: 'like' },
    guest.token,
  );
  const finished = (await call('POST', `/v1/rooms/${room.id}/finish`, {}, guest.token)).data;
  assert.equal(finished.selfFinished, true);
  assert.equal(
    (
      await call(
        'PUT',
        `/v1/rooms/${room.id}/votes`,
        { venueId: started.candidates[10].id, value: 'like' },
        guest.token,
      )
    ).status,
    409,
  );
});
