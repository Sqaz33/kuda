import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  catalog,
  calculateMatches,
  checkPassword,
  createMemoryStore,
  hashPassword,
  validConstraints,
  verifyInitData,
} from './core.mjs';

const store = createMemoryStore();
const failures = new Map();
const events = [];
const voteKeys = new Map();

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code, message) => {
  throw new ApiError(status, code, message);
};
const send = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
};
const pathPart = (url, prefix) => decodeURIComponent(url.pathname.slice(prefix.length));

async function readBody(request) {
  let data = '';
  for await (const chunk of request) {
    data += chunk;
    if (data.length > 32768) fail(413, 'BODY_TOO_LARGE', 'Слишком большой запрос.');
  }
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    fail(400, 'INVALID_JSON', 'Некорректный JSON.');
  }
}

function auth(request) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const user = store.current(token);
  if (!user) fail(401, 'UNAUTHORIZED', 'Нужен вход в приложение.');
  return user;
}
function memberRoom(id, user) {
  const room = store.rooms.get(id);
  if (!room) fail(404, 'ROOM_NOT_FOUND', 'Комната не найдена.');
  if (!room.members.some((member) => member.id === user.id))
    fail(403, 'NOT_MEMBER', 'Нет доступа к комнате.');
  maybeExpire(room);
  maybeFinalize(room);
  return room;
}
function hostRoom(id, user) {
  const room = memberRoom(id, user);
  if (room.hostId !== user.id) fail(403, 'HOST_ONLY', 'Это действие доступно организатору.');
  return room;
}
function maybeFinalize(room) {
  if (room.status !== 'swiping') return;
  if (
    room.members.every((member) => member.finished) ||
    (room.deadlineAt && Date.now() >= Date.parse(room.deadlineAt))
  ) {
    Object.assign(room, calculateMatches(room));
    room.status = 'deciding';
  }
}
function maybeExpire(room) {
  if (
    ['waiting', 'swiping', 'deciding'].includes(room.status) &&
    Date.now() >= Date.parse(room.expiresAt)
  )
    room.status = 'expired';
}
function voteForDemoMembers(room, candidates) {
  for (const member of room.members.filter((item) => item.isDemo)) {
    room.votes[member.id] ||= {};
    for (const venue of candidates) {
      room.votes[member.id][venue.id] = Math.random() < 0.6 ? 'like' : 'dislike';
    }
    member.finished = true;
    member.status = 'finished';
  }
}
function rateLimit(request) {
  const key = request.socket.remoteAddress || 'local';
  const now = Date.now();
  const attempts = (failures.get(key) || []).filter((time) => now - time < 60000);
  if (attempts.length >= 10) fail(429, 'RATE_LIMITED', 'Слишком много попыток. Подожди минуту.');
  attempts.push(now);
  failures.set(key, attempts);
}
function optionalUser(request) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  return store.current(token);
}
function mergeIdentity(source, account) {
  if (!source || source.id === account.id) return;
  for (const room of store.rooms.values()) {
    const oldMember = room.members.find((member) => member.id === source.id);
    if (!oldMember) continue;
    const existing = room.members.find((member) => member.id === account.id);
    if (existing) {
      existing.finished ||= oldMember.finished;
      room.members = room.members.filter((member) => member.id !== source.id);
    } else {
      oldMember.id = account.id;
      oldMember.name = account.name;
    }
    room.votes[account.id] = {
      ...(room.votes[source.id] || {}),
      ...(room.votes[account.id] || {}),
    };
    delete room.votes[source.id];
    if (room.hostId === source.id) {
      room.hostId = account.id;
      room.hostName = account.name;
    }
  }
  store.users.set(source.id, account);
}

export async function handle(request, response, { demoParticipants = 2 } = {}) {
  if (request.method === 'OPTIONS') {
    send(response, 204, null);
    return;
  }
  const url = new URL(request.url, 'http://localhost');
  const path = url.pathname;
  try {
    if (request.method === 'GET' && path === '/health') return send(response, 200, { ok: true });
    if (request.method === 'POST' && path === '/v1/auth/guest') {
      const { name } = await readBody(request);
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 40)
        fail(422, 'INVALID_NAME', 'Укажи имя от 2 до 40 символов.');
      return send(
        response,
        200,
        store.issue({ id: randomUUID(), name: name.trim(), method: 'guest' }),
      );
    }
    if (request.method === 'POST' && path === '/v1/auth/email/register') {
      const { name, email, password } = await readBody(request);
      if (
        typeof name !== 'string' ||
        name.trim().length < 2 ||
        !/^.+@.+\..+$/.test(email || '') ||
        typeof password !== 'string' ||
        password.length < 8
      )
        fail(422, 'INVALID_CREDENTIALS', 'Проверь имя, почту и пароль от 8 символов.');
      const key = email.trim().toLowerCase();
      if (store.emails.has(key)) fail(409, 'EMAIL_EXISTS', 'Эта почта уже зарегистрирована.');
      const linked = optionalUser(request);
      const user = {
        id: linked?.id || randomUUID(),
        name: name.trim(),
        email: key,
        method: 'email',
      };
      if (linked) {
        for (const room of store.rooms.values()) {
          const member = room.members.find((item) => item.id === linked.id);
          if (member) member.name = user.name;
          if (room.hostId === linked.id) room.hostName = user.name;
        }
      }
      store.emails.set(key, { user, passwordHash: hashPassword(password) });
      return send(response, 200, store.issue(user));
    }
    if (request.method === 'POST' && path === '/v1/auth/email/login') {
      const { email, password } = await readBody(request);
      const record = store.emails.get(
        String(email || '')
          .trim()
          .toLowerCase(),
      );
      if (!record || !checkPassword(String(password || ''), record.passwordHash))
        fail(401, 'INVALID_CREDENTIALS', 'Неверная почта или пароль.');
      mergeIdentity(optionalUser(request), record.user);
      return send(response, 200, store.issue(record.user));
    }
    if (request.method === 'POST' && (path === '/v1/auth/telegram' || path === '/v1/auth/max')) {
      const provider = path.endsWith('telegram') ? 'telegram' : 'max';
      const { initData } = await readBody(request);
      const botToken =
        provider === 'telegram' ? process.env.TELEGRAM_BOT_TOKEN : process.env.MAX_BOT_TOKEN;
      let external = verifyInitData(initData, botToken);
      if (
        !external &&
        process.env.MOCK_ALLOW_DEV_AUTH === '1' &&
        typeof initData === 'string' &&
        initData.startsWith(`mock:${provider}:`)
      ) {
        external = {
          id: initData.slice(`mock:${provider}:`.length),
          first_name: 'Тестовый участник',
        };
      }
      if (!external?.id) fail(401, 'INVALID_INIT_DATA', 'Данные мессенджера не прошли проверку.');
      const id = `${provider}:${external.id}`;
      const user = store.users.get(id) || {
        id,
        name: external.first_name || external.username || 'Участник',
        method: provider,
      };
      return send(response, 200, store.issue(user));
    }
    if (request.method === 'GET' && path === '/v1/me') return send(response, 200, auth(request));
    if (request.method === 'DELETE' && path === '/v1/auth/session') {
      const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (token) store.tokens.delete(token);
      return send(response, 200, { ok: true });
    }
    if (request.method === 'POST' && path === '/v1/events') {
      const { name, properties } = await readBody(request);
      const allowed = new Set([
        'room_created',
        'invite_opened',
        'invite_shared',
        'member_joined',
        'voting_started',
        'voting_finished',
        'fallback_shown',
        'winner_selected',
        'booking_action',
      ]);
      if (!allowed.has(name) || typeof properties !== 'object' || Array.isArray(properties))
        fail(422, 'INVALID_EVENT', 'Неизвестное событие.');
      events.push({
        name,
        properties,
        userId: optionalUser(request)?.id || null,
        at: new Date().toISOString(),
      });
      return send(response, 201, { ok: true });
    }
    if (request.method === 'POST' && path === '/v1/catalog/estimate') {
      const constraints = await readBody(request);
      if (!validConstraints(constraints))
        fail(422, 'INVALID_CONSTRAINTS', 'Проверь условия встречи.');
      return send(response, 200, { count: catalog(constraints).length, minimum: 12 });
    }
    if (request.method === 'POST' && path === '/v1/rooms') {
      const user = auth(request);
      const { constraints } = await readBody(request);
      if (!validConstraints(constraints))
        fail(422, 'INVALID_CONSTRAINTS', 'Проверь условия встречи.');
      if (catalog(constraints).length < 12)
        fail(409, 'NOT_ENOUGH_VENUES', 'Подходящих мест меньше 12. Расширь поиск.');
      return send(
        response,
        201,
        store.serialize(store.createRoom(user, constraints, demoParticipants), user),
      );
    }
    if (request.method === 'GET' && path === '/v1/rooms') {
      const user = auth(request);
      return send(
        response,
        200,
        [...store.rooms.values()]
          .filter((room) => room.members.some((member) => member.id === user.id))
          .map((room) => store.serialize(room, user)),
      );
    }
    if (request.method === 'GET' && path.startsWith('/v1/rooms/code/')) {
      rateLimit(request);
      const code = pathPart(url, '/v1/rooms/code/');
      const room = [...store.rooms.values()].find((item) => item.code === code);
      if (!room) fail(404, 'ROOM_NOT_FOUND', 'Комната с таким кодом не найдена.');
      maybeExpire(room);
      const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      return send(response, 200, store.preview(room, room.inviteToken, store.current(token)));
    }
    if (request.method === 'GET' && /^\/v1\/invites\/[^/]+$/.test(path)) {
      const token = pathPart(url, '/v1/invites/');
      const room = [...store.rooms.values()].find((item) => item.inviteToken === token);
      if (!room) fail(404, 'INVITE_NOT_FOUND', 'Ссылка не работает или была заменена.');
      maybeExpire(room);
      const authToken = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      return send(response, 200, store.preview(room, token, store.current(authToken)));
    }
    if (request.method === 'POST' && /^\/v1\/invites\/[^/]+\/join$/.test(path)) {
      const user = auth(request);
      const token = decodeURIComponent(path.split('/')[3]);
      const room = [...store.rooms.values()].find((item) => item.inviteToken === token);
      if (!room) fail(404, 'INVITE_NOT_FOUND', 'Ссылка не работает или была заменена.');
      maybeExpire(room);
      const existing = room.members.find((member) => member.id === user.id);
      if (!existing && !['waiting', 'swiping'].includes(room.status))
        fail(409, 'ROOM_CLOSED', 'Вход в комнату уже закрыт.');
      if (!existing && room.members.length >= room.constraints.partySize)
        fail(409, 'ROOM_FULL', 'В комнате уже все участники.');
      if (!existing)
        room.members.push({
          id: user.id,
          name: user.name,
          status: room.status === 'swiping' ? 'swiping' : 'waiting',
          finished: false,
        });
      return send(response, 200, store.serialize(room, user));
    }
    const roomMatch = path.match(/^\/v1\/rooms\/([^/]+)(?:\/(.+))?$/);
    if (roomMatch) {
      const id = decodeURIComponent(roomMatch[1]);
      const action = roomMatch[2] || '';
      const user = auth(request);
      if (request.method === 'GET' && !action)
        return send(response, 200, store.serialize(memberRoom(id, user), user));
      if (request.method === 'POST' && action === 'start') {
        const room = hostRoom(id, user);
        if (room.status !== 'waiting' || room.members.length < 2)
          fail(409, 'CANNOT_START', 'Для старта нужны минимум два участника.');
        room.candidates = catalog(room.constraints).slice(0, 12);
        if (room.candidates.length < 12)
          fail(409, 'NOT_ENOUGH_VENUES', 'Подходящих мест меньше 12.');
        room.deadlineAt = new Date(
          Date.now() + room.constraints.deadlineMinutes * 60000,
        ).toISOString();
        room.status = 'swiping';
        room.members.forEach((member) => {
          member.status = 'swiping';
        });
        voteForDemoMembers(room, room.candidates);
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'POST' && action === 'rotate-invite') {
        const room = hostRoom(id, user);
        if (!['waiting', 'swiping'].includes(room.status))
          fail(409, 'ROOM_CLOSED', 'Ссылку этой комнаты уже нельзя заменить.');
        room.inviteToken = randomBytes(24).toString('base64url');
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'POST' && action === 'cancel') {
        const room = hostRoom(id, user);
        if (!['waiting', 'swiping', 'deciding'].includes(room.status))
          fail(409, 'ROOM_CLOSED', 'Комната уже завершена.');
        room.status = 'cancelled';
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'PUT' && action === 'votes') {
        const room = memberRoom(id, user);
        const { venueId, value } = await readBody(request);
        if (
          !room.candidates.some((venue) => venue.id === venueId) ||
          !['like', 'dislike'].includes(value)
        )
          fail(422, 'INVALID_VOTE', 'Неверный голос или заведение.');
        const key = request.headers['idempotency-key'];
        const keyId = key ? `${user.id}:${key}` : null;
        const remembered = keyId ? voteKeys.get(keyId) : null;
        if (
          remembered &&
          (remembered.roomId !== id || remembered.venueId !== venueId || remembered.value !== value)
        )
          fail(409, 'IDEMPOTENCY_CONFLICT', 'Этот ключ уже использован для другого голоса.');
        room.votes[user.id] ||= {};
        const previous = room.votes[user.id][venueId];
        if (previous === value) return send(response, 200, store.serialize(room, user));
        if (previous && previous !== value) fail(409, 'VOTE_EXISTS', 'Это место уже оценено.');
        if (room.status !== 'swiping') fail(409, 'VOTING_CLOSED', 'Голосование уже закончилось.');
        if (room.members.find((item) => item.id === user.id)?.finished)
          fail(409, 'VOTING_FINISHED', 'Ты уже закончил выбор.');
        room.votes[user.id][venueId] = value;
        if (keyId) voteKeys.set(keyId, { roomId: id, venueId, value });
        const member = room.members.find((item) => item.id === user.id);
        if (Object.keys(room.votes[user.id]).length === room.candidates.length) {
          member.finished = true;
          member.status = 'finished';
        }
        maybeFinalize(room);
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'POST' && action === 'finish') {
        const room = memberRoom(id, user);
        if (room.status !== 'swiping' || Object.keys(room.votes[user.id] || {}).length < 10)
          fail(409, 'TOO_EARLY', 'Оцени хотя бы 10 мест.');
        const member = room.members.find((item) => item.id === user.id);
        member.finished = true;
        member.status = 'finished';
        maybeFinalize(room);
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'POST' && action === 'close-voting') {
        const room = hostRoom(id, user);
        if (room.status !== 'swiping') fail(409, 'VOTING_CLOSED', 'Голосование уже закончилось.');
        if (
          !room.members.every((member) => member.finished) &&
          Date.now() < Date.parse(room.deadlineAt)
        )
          fail(409, 'DEADLINE_NOT_REACHED', 'Дождись дедлайна или завершения всех участников.');
        Object.assign(room, calculateMatches(room));
        room.status = 'deciding';
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'POST' && action === 'extend') {
        const room = hostRoom(id, user);
        if (room.status !== 'deciding' || room.matches.length)
          fail(409, 'CANNOT_EXTEND', 'Сейчас нельзя добавить карточки.');
        const seen = new Set(room.candidates.map((venue) => venue.id));
        const more = catalog(room.constraints)
          .filter((venue) => !seen.has(venue.id))
          .slice(0, 10);
        if (!more.length)
          fail(
            409,
            'NO_MORE_VENUES',
            'Новых мест пока нет. Измени условия и создай новую комнату.',
          );
        room.candidates.push(...more);
        room.status = 'swiping';
        room.deadlineAt = new Date(Date.now() + 10 * 60000).toISOString();
        room.members.forEach((member) => {
          member.finished = false;
          member.status = 'swiping';
        });
        voteForDemoMembers(room, more);
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'PUT' && action === 'winner') {
        const room = hostRoom(id, user);
        const { venueId } = await readBody(request);
        if (room.status !== 'deciding' || !room.matches.some((match) => match.venue.id === venueId))
          fail(409, 'INVALID_WINNER', 'Выбери место из общего списка.');
        room.winner = room.matches.find((match) => match.venue.id === venueId).venue;
        room.status = 'selected';
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'PUT' && action === 'booking-note') {
        const room = hostRoom(id, user);
        const { note } = await readBody(request);
        if (room.status !== 'selected' || !['booked_by_host', 'walk_in'].includes(note))
          fail(409, 'INVALID_NOTE', 'Сначала выбери место.');
        room.bookingNote = note;
        room.status = 'completed';
        return send(response, 200, store.serialize(room, user));
      }
      if (request.method === 'POST' && action === 'reports') {
        const room = memberRoom(id, user);
        const { venueId, reason } = await readBody(request);
        if (
          !room.candidates.some((venue) => venue.id === venueId) ||
          !['closed', 'incorrect_data'].includes(reason)
        )
          fail(422, 'INVALID_REPORT', 'Укажи причину для карточки из комнаты.');
        room.reports.push({
          userId: user.id,
          venueId,
          reason,
          createdAt: new Date().toISOString(),
        });
        return send(response, 201, { id: randomUUID(), status: 'received' });
      }
    }
    fail(404, 'NOT_FOUND', 'Адрес не найден.');
  } catch (cause) {
    const status = cause.status || 500;
    if (status === 500) console.error(cause);
    send(response, status, {
      error: {
        code: cause.code || 'INTERNAL_ERROR',
        message: status === 500 ? 'Ошибка тестового сервера.' : cause.message,
      },
    });
  }
}

export function createMockServer({
  demoParticipants = Number(process.env.MOCK_DEMO_PARTICIPANTS ?? 2),
} = {}) {
  return http.createServer((request, response) => handle(request, response, { demoParticipants }));
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href
) {
  const port = Number(process.env.MOCK_PORT || 8787);
  const host = process.env.MOCK_HOST || '127.0.0.1';
  createMockServer().listen(port, host, () => console.log(`Kuda mock API: http://${host}:${port}`));
}
