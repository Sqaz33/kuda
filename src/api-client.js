export class ApiError extends Error {
  constructor(message, { code, status, retryAfter, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    Object.assign(this, { code, status, retryAfter, requestId });
  }
}

export function createApiClient({
  baseUrl,
  getToken,
  onUnauthorized,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000,
}) {
  const pendingKeys = new Map();
  const newKey = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  async function request(path, { method = 'GET', body, idempotencyKey, retrySafe = false } = {}) {
    const token = getToken();
    const scope = JSON.stringify([token, method, path, body]);
    if (retrySafe) {
      if (!pendingKeys.has(scope)) pendingKeys.set(scope, newKey());
      idempotencyKey = pendingKeys.get(scope);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new ApiError('Сервер вернул некорректный ответ. Повторите запрос.', {
          status: response.status,
          code: 'INVALID_RESPONSE',
        });
      }
      if (!response.ok) {
        if (retrySafe && response.status < 500 && response.status !== 429)
          pendingKeys.delete(scope);
        const retryAfter = Number(response.headers.get('Retry-After'));
        if (response.status === 401 && data.error?.code === 'UNAUTHORIZED')
          await onUnauthorized?.(token);
        throw new ApiError(
          data.error?.message || 'Не удалось выполнить запрос. Попробуйте ещё раз.',
          {
            code: data.error?.code || `HTTP_${response.status}`,
            status: response.status,
            retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
            requestId: response.headers.get('X-Request-ID'),
          },
        );
      }
      pendingKeys.delete(scope);
      if (token !== getToken())
        throw new ApiError('Профиль изменился. Повторите действие в текущем профиле.', {
          code: 'SESSION_CHANGED',
        });
      return data;
    } catch (error) {
      if (controller.signal.aborted)
        throw new ApiError('Сервер долго не отвечает. Повторите запрос.', { code: 'TIMEOUT' });
      if (error instanceof TypeError)
        throw new ApiError('Нет связи с сервером. Проверьте соединение.', {
          code: 'NETWORK_ERROR',
        });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  const roomPath = (id) => `/v1/rooms/${encodeURIComponent(id)}`;
  const command = (id, action, retrySafe = false) =>
    request(`${roomPath(id)}/${action}`, { method: 'POST', body: {}, retrySafe });
  return {
    request,
    me: () => request('/v1/me'),
    logout: () => request('/v1/auth/session', { method: 'DELETE' }),
    guest: (name) => request('/v1/auth/guest', { method: 'POST', body: { name } }),
    miniApp: (provider, initData) => {
      if (provider !== 'telegram')
        return Promise.reject(
          new ApiError('Этот способ входа пока недоступен.', {
            code: 'AUTH_METHOD_DISABLED',
            status: 501,
          }),
        );
      return request('/v1/auth/telegram', { method: 'POST', body: { initData } });
    },
    transfer: () => request('/v1/auth/transfer', { method: 'POST', body: {}, retrySafe: true }),
    exchange: (transferCode) =>
      request('/v1/auth/transfer/exchange', { method: 'POST', body: { transferCode } }),
    estimate: (constraints) =>
      request('/v1/catalog/estimate', { method: 'POST', body: constraints }),
    createRoom: (constraints) =>
      request('/v1/rooms', { method: 'POST', body: { constraints }, retrySafe: true }),
    roomByCode: (code) => request(`/v1/rooms/code/${encodeURIComponent(code)}`),
    preview: (token) => request(`/v1/invites/${encodeURIComponent(token)}`),
    join: (token) =>
      request(`/v1/invites/${encodeURIComponent(token)}/join`, { method: 'POST', body: {} }),
    rooms: () => request('/v1/rooms'),
    room: (id) => request(roomPath(id)),
    start: (id) => command(id, 'start'),
    rotateInvite: (id) => command(id, 'rotate-invite', true),
    cancelRoom: (id) => command(id, 'cancel'),
    leaveRoom: (id) => command(id, 'leave'),
    removeMember: (id, memberId) =>
      request(`${roomPath(id)}/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' }),
    vote: (id, venueId, value, userId) =>
      request(`${roomPath(id)}/votes`, {
        method: 'PUT',
        body: { venueId, value },
        idempotencyKey: `vote:${id}:${userId}:${venueId}`,
      }),
    finish: (id) => command(id, 'finish'),
    closeVoting: (id) => command(id, 'close-voting'),
    extend: (id) => command(id, 'extend', true),
    choose: (id, venueId) =>
      request(`${roomPath(id)}/winner`, { method: 'PUT', body: { venueId } }),
    bookingNote: (id, note) =>
      request(`${roomPath(id)}/booking-note`, { method: 'PUT', body: { note } }),
    report: (id, venueId, reason) =>
      request(`${roomPath(id)}/reports`, {
        method: 'POST',
        body: { venueId, reason },
        retrySafe: true,
      }),
    track: (name, properties = {}) => {
      const allowed = Object.fromEntries(
        Object.entries(properties).filter(([key]) => ['roomId', 'venueId', 'action'].includes(key)),
      );
      return request('/v1/events', { method: 'POST', body: { name, properties: allowed } });
    },
  };
}
