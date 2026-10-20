import assert from 'node:assert/strict';
import { createApiClient } from '../src/api-client.js';
import { resolveApiBase } from '../src/api-config.js';
import { currentCandidates } from '../src/room-state.js';

// Deliberately excluded from npm test: this creates persistent test users/rooms.
if (!process.env.KUDA_TEST_API_URL || process.env.KUDA_ALLOW_TEST_WRITES !== '1') {
  console.error(
    'Нужны KUDA_TEST_API_URL и KUDA_ALLOW_TEST_WRITES=1. Используйте отдельный тестовый backend с демо-каталогом, не production.',
  );
  process.exit(1);
}
const baseUrl = resolveApiBase({ configured: process.env.KUDA_TEST_API_URL });
const clients = [];
const createdRooms = [];
function client() {
  let token = null;
  const api = createApiClient({ baseUrl, getToken: () => token });
  const actor = { api, setSession: (session) => (token = session.token), user: null };
  clients.push(actor);
  return actor;
}
async function guest(name) {
  const actor = client();
  const session = await actor.api.guest(name);
  assert.ok(session.token);
  actor.setSession(session);
  actor.user = session.user;
  assert.equal((await actor.api.me()).id, actor.user.id);
  return actor;
}
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Volgograd' }).format(
  new Date(Date.now() + 2 * 86400000),
);
const constraints = {
  city: 'Волгоград',
  timeZone: 'Europe/Volgograd',
  date,
  time: '19:30',
  area: { type: 'district', district: 'Весь город' },
  categories: ['bar', 'cafe', 'restaurant'],
  budgetMax: 2000,
  partySize: 2,
  deadlineMinutes: 30,
  exclusions: [],
};

try {
  const anonymous = client();
  await assert.rejects(anonymous.api.roomByCode('0000'), { status: 401 });
  const host = await guest('API проверка: организатор');
  const member = await guest('API проверка: участник');
  const estimate = await host.api.estimate(constraints);
  assert.ok(estimate.count >= estimate.minimum, 'Нужен демо-каталог минимум из 12 мест');
  let room = await host.api.createRoom(constraints);
  createdRooms.push({ api: host.api, id: room.id });
  assert.equal(room.status, 'waiting');
  assert.ok(Number.isInteger(room.revision));
  assert.equal((await anonymous.api.preview(room.inviteToken)).room.id, room.id);
  assert.equal((await member.api.roomByCode(room.code)).room.id, room.id);
  room = await member.api.join(room.inviteToken);
  assert.equal(room.members.length, 2);
  assert.ok((await member.api.rooms()).some((item) => item.id === room.id));
  const before = room.revision;
  room = await host.api.start(room.id);
  assert.equal(room.status, 'swiping');
  assert.ok(room.revision > before);
  const candidates = currentCandidates(room);
  assert.equal(candidates.length, 12);
  for (const actor of [host, member]) {
    for (const venue of candidates)
      room = await actor.api.vote(room.id, venue.id, 'like', actor.user.id);
  }
  const repeated = await host.api.vote(room.id, candidates[0].id, 'like', host.user.id);
  assert.equal(Object.keys(repeated.ownVotes).length, 12);
  room = await host.api.closeVoting(room.id);
  assert.equal(room.status, 'deciding');
  assert.equal(room.matchMode, 'unanimous');
  assert.equal(room.resultStats.finished, 2);
  assert.ok(room.matches.length > 0);
  room = await host.api.choose(room.id, room.matches[0].venue.id);
  assert.equal(room.status, 'selected');
  assert.ok((await member.api.room(room.id)).winner);
  await host.api.track('booking_action', {
    roomId: room.id,
    venueId: room.winner.id,
    action: 'map',
  });
  room = await host.api.bookingNote(room.id, 'walk_in');
  assert.equal(room.status, 'completed');
  console.log('OK: два профиля → приглашение/код → голоса → результат → отметка брони.');

  const ticket = await host.api.transfer();
  const otherDevice = client();
  otherDevice.setSession(await otherDevice.api.exchange(ticket.transferCode));
  assert.equal((await otherDevice.api.me()).id, host.user.id);
  assert.ok((await otherDevice.api.rooms()).some((item) => item.id === room.id));
  await assert.rejects(anonymous.api.exchange(ticket.transferCode), {
    status: 401,
    code: 'INVALID_TRANSFER_CODE',
  });
  console.log('OK: перенос профиля, сохранение комнат, запрет повторного использования кода.');

  room = await host.api.createRoom(constraints);
  createdRooms.push({ api: host.api, id: room.id });
  const oldInvite = room.inviteToken;
  room = await host.api.rotateInvite(room.id);
  assert.notEqual(room.inviteToken, oldInvite);
  await assert.rejects(anonymous.api.preview(oldInvite), { status: 404, code: 'INVITE_NOT_FOUND' });
  await member.api.join(room.inviteToken);
  room = await host.api.start(room.id);
  for (const actor of [host, member]) {
    for (const venue of currentCandidates(room))
      await actor.api.vote(room.id, venue.id, 'dislike', actor.user.id);
  }
  room = await host.api.closeVoting(room.id);
  assert.equal(room.matches.length, 0);
  const oldIds = new Set(room.roundCandidateIds);
  room = await host.api.extend(room.id);
  assert.equal(room.extensionCount, 1);
  assert.ok(currentCandidates(room).length > 0);
  assert.ok(currentCandidates(room).every((venue) => !oldIds.has(venue.id)));
  for (const actor of [host, member]) {
    for (const venue of currentCandidates(room))
      await actor.api.vote(room.id, venue.id, 'dislike', actor.user.id);
  }
  room = await host.api.closeVoting(room.id);
  await assert.rejects(host.api.extend(room.id), { status: 409 });
  console.log(
    'OK: обновление приглашения, пустой результат, только новые карточки дополнительного раунда.',
  );
} catch (error) {
  console.error('FAIL:', error.code || error.name, error.message);
  process.exitCode = 1;
} finally {
  // No database deletion. Cancel only rooms created by this run that are still active.
  for (const { api, id } of createdRooms) {
    try {
      const room = await api.room(id);
      if (!['completed', 'cancelled', 'expired'].includes(room.status)) await api.cancelRoom(id);
    } catch (error) {
      console.error('Cleanup комнаты не завершён:', error.code || error.name);
      process.exitCode = 1;
    }
  }
  for (const { api } of clients) {
    try {
      await api.logout();
    } catch (error) {
      if (error.status !== 401) {
        console.error('Cleanup сессии не завершён:', error.code || error.name);
        process.exitCode = 1;
      }
    }
  }
}
