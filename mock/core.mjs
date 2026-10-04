import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const randomId = () => randomBytes(12).toString('base64url');
const categories = ['cafe', 'restaurant', 'bar'];
const names = [
  'Neon Velvet',
  'Соль и хлеб',
  'Бюро',
  'Встреча',
  'Пятый стол',
  'Светлый зал',
  'Берег',
  'Пятница',
  'Лист',
  'Городская кухня',
  'Точка сбора',
  'Параллель',
  'Площадь',
  'Вечерний круг',
  'Квартал',
  'У причала',
  'Друзья',
  'Соседи',
  'Северный стол',
  'Окно',
  'Тёплый свет',
  'Рядом',
  'Терраса',
  'Место встречи',
  'Мастерская вкуса',
  'Новый берег',
  'Мята',
  'Седьмое небо',
  'Тёплый двор',
  'Корица',
  'Камыши',
  'Огни города',
  'Полдень',
  'Три товарища',
  'Лампа',
  'Дом у реки',
  'Маяк',
  'Рыжий кот',
  'Восточный двор',
  'Чердак',
  'Сад',
  'Залив',
];

export const venues = names.map((name, index) => ({
  id: `venue-${index + 1}`,
  name,
  category: index === 0 ? 'bar' : categories[index % 3],
  photoKey: index % 3 === 0 ? 'neon' : index % 3 === 1 ? 'salt' : 'hero',
  cuisine: ['Европейская кухня', 'Авторская кухня', 'Кофе и десерты', 'Смешанная кухня'][index % 4],
  district: index < 20 ? 'Центральный' : 'Ворошиловский',
  address: `Волгоград, улица Мира, ${index + 3}`,
  priceHint: `Ориентир ${1100 + (index % 5) * 180} ₽/чел.`,
  budgetMin: 1100 + (index % 5) * 180,
  hoursLabel: 'Часы работы на выбранную дату уточняются',
  tags: [index % 2 ? 'Для компании' : 'Уютно', index % 3 ? 'Еда' : 'Разговоры'],
  phone: null,
  website: null,
  mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`Волгоград, улица Мира, ${index + 3}`)}`,
}));

export function catalog(constraints) {
  if (constraints?.city !== 'Волгоград') return [];
  let found = venues.filter(
    (venue) =>
      (constraints.categories || []).includes(venue.category) &&
      venue.budgetMin <= Number(constraints.budgetMax),
  );
  if (constraints.area?.type === 'district' && constraints.area.district !== 'Весь город') {
    found = found.filter((venue) => venue.district === constraints.area.district);
  }
  if (constraints.exclusions?.length) {
    found = found.filter(
      (venue) =>
        !constraints.exclusions.some((term) =>
          `${venue.name} ${venue.tags.join(' ')}`
            .toLowerCase()
            .includes(String(term).toLowerCase()),
        ),
    );
  }
  return found;
}

export function validConstraints(value) {
  const time = Date.parse(`${value?.date}T${value?.time}:00+03:00`);
  return (
    value?.city === 'Волгоград' &&
    value?.timeZone === 'Europe/Volgograd' &&
    Number.isFinite(time) &&
    time > Date.now() &&
    ['district', 'radius'].includes(value?.area?.type) &&
    (value.area.type === 'district'
      ? Boolean(value.area.district)
      : Boolean(value.area.pointAddress) && Number(value.area.radiusKm) > 0) &&
    Array.isArray(value.categories) &&
    value.categories.length > 0 &&
    value.categories.every((c) => categories.includes(c)) &&
    Number(value.budgetMax) >= 300 &&
    Number(value.partySize) >= 2 &&
    Number(value.partySize) <= 12 &&
    Number(value.deadlineMinutes) >= 5 &&
    Number(value.deadlineMinutes) <= 120
  );
}

export function verifyInitData(initData, botToken) {
  if (!botToken || !initData || initData.length > 8192) return null;
  const params = new URLSearchParams(initData);
  const entries = [...params.entries()];
  if (
    entries.filter(([key]) => key === 'hash').length !== 1 ||
    new Set(entries.map(([key]) => key)).size !== entries.length
  )
    return null;
  const hash = params.get('hash');
  if (!/^[a-f0-9]{64}$/i.test(hash || '')) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > 3600) return null;
  const signed = entries
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculated = createHmac('sha256', secret).update(signed).digest();
  const supplied = Buffer.from(hash, 'hex');
  if (supplied.length !== calculated.length || !timingSafeEqual(supplied, calculated)) return null;
  try {
    const user = JSON.parse(params.get('user'));
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function checkPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function calculateMatches(room) {
  const finished = room.members.filter((member) => member.finished).map((member) => member.id);
  const quorum = Math.max(2, Math.ceil(room.members.length * 0.75));
  const incomplete = finished.length < room.members.length;
  const eligible =
    finished.length >= quorum
      ? finished
      : room.members
          .filter((member) => Object.keys(room.votes[member.id] || {}).length)
          .map((member) => member.id);
  const scored = room.candidates
    .map((venue) => {
      const likes = eligible.filter((id) => room.votes[id]?.[venue.id] === 'like').length;
      return { venue, likes, total: eligible.length };
    })
    .sort((a, b) => b.likes - a.likes || a.venue.name.localeCompare(b.venue.name));
  const unanimous =
    finished.length >= quorum ? scored.filter((match) => match.likes === finished.length) : [];
  if (unanimous.length)
    return { matches: unanimous.slice(0, 5), matchMode: 'unanimous', incomplete };
  const majority =
    finished.length >= quorum
      ? scored.filter((match) => match.likes >= Math.ceil(finished.length * 0.6) && match.likes > 0)
      : [];
  if (majority.length) return { matches: majority.slice(0, 3), matchMode: 'majority', incomplete };
  return {
    matches: scored.filter((match) => match.likes > 0).slice(0, 3),
    matchMode: 'host_choice',
    incomplete,
  };
}

export function createMemoryStore() {
  const users = new Map();
  const tokens = new Map();
  const rooms = new Map();
  const emails = new Map();
  function issue(user) {
    const token = randomId() + randomId();
    users.set(user.id, user);
    tokens.set(token, user.id);
    return { token, user };
  }
  function current(token) {
    return users.get(tokens.get(token)) || null;
  }
  function makeCode() {
    let code;
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
    } while (
      [...rooms.values()].some(
        (room) =>
          room.code === code && !['completed', 'expired', 'cancelled'].includes(room.status),
      )
    );
    return code;
  }
  function createRoom(host, constraints, demoParticipantCount = 0) {
    const demoNames = ['Миша · тест', 'Лиза · тест'];
    const count = Math.max(
      0,
      Math.min(Math.floor(demoParticipantCount) || 0, demoNames.length, constraints.partySize - 1),
    );
    const room = {
      id: randomId(),
      code: makeCode(),
      inviteToken: randomId() + randomId(),
      hostId: host.id,
      hostName: host.name,
      status: 'waiting',
      constraints,
      createdAt: new Date().toISOString(),
      deadlineAt: null,
      expiresAt: new Date(
        Date.parse(`${constraints.date}T${constraints.time}:00+03:00`) + 6 * 3600000,
      ).toISOString(),
      members: [
        { id: host.id, name: host.name, status: 'waiting', finished: false },
        ...demoNames.slice(0, count).map((name) => ({
          id: `demo:${randomId()}`,
          name,
          status: 'waiting',
          finished: false,
          isDemo: true,
        })),
      ],
      candidates: [],
      votes: {},
      matches: [],
      matchMode: null,
      incomplete: false,
      winner: null,
      bookingNote: null,
      reports: [],
      removedIds: [],
    };
    rooms.set(room.id, room);
    return room;
  }
  function serialize(room, user) {
    return {
      id: room.id,
      code: room.code,
      inviteToken: room.inviteToken,
      hostId: room.hostId,
      hostName: room.hostName,
      status: room.status,
      constraints: room.constraints,
      members: room.members.map((member) => ({ ...member })),
      candidates: room.candidates,
      ownVotes: user ? { ...(room.votes[user.id] || {}) } : {},
      selfFinished: Boolean(room.members.find((member) => member.id === user?.id)?.finished),
      matches: room.matches,
      matchMode: room.matchMode,
      incomplete: room.incomplete,
      winner: room.winner,
      bookingNote: room.bookingNote,
      deadlineAt: room.deadlineAt,
      expiresAt: room.expiresAt,
      createdAt: room.createdAt,
    };
  }
  function preview(room, token, user = null) {
    let access = 'active';
    let reason = null;
    if (!room || room.inviteToken !== token) {
      access = 'invalid';
      reason = 'Ссылка была изменена или не существует.';
    } else if (room.removedIds?.includes(user?.id)) {
      access = 'removed';
      reason = 'Организатор исключил вас из комнаты.';
    } else if (room.status === 'selected' || room.status === 'completed') access = 'selected';
    else if (room.status === 'cancelled' || room.status === 'expired') {
      access = room.status;
      reason = 'Встреча уже закрыта.';
    } else if (
      room.members.length >= room.constraints.partySize &&
      !room.members.some((member) => member.id === user?.id)
    ) {
      access = 'full';
      reason = 'В комнате уже все участники.';
    }
    return {
      token,
      access,
      reason,
      room: room
        ? {
            id: room.id,
            code: room.code,
            hostId: room.hostId,
            hostName: room.hostName,
            status: room.status,
            constraints: room.constraints,
            members: room.members.map(({ id, name, finished }) => ({ id, name, finished })),
            winner: access === 'selected' ? room.winner : null,
            bookingNote: access === 'selected' ? room.bookingNote : null,
          }
        : null,
    };
  }
  return { users, tokens, rooms, emails, issue, current, createRoom, serialize, preview };
}
