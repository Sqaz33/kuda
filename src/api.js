import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const defaultBase =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8787'
    : Platform.OS === 'web'
      ? `http://${window.location.hostname}:8787`
      : 'http://localhost:8787';
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || defaultBase).replace(/\/$/, '');
let accessToken = null;

export async function loadToken() {
  try {
    accessToken =
      Platform.OS === 'web'
        ? window.localStorage.getItem('kuda.token')
        : await SecureStore.getItemAsync('kuda.token');
  } catch {
    accessToken = null;
  }
  return accessToken;
}

export async function saveToken(token) {
  accessToken = token || null;
  try {
    if (Platform.OS === 'web') {
      if (token) window.localStorage.setItem('kuda.token', token);
      else window.localStorage.removeItem('kuda.token');
    } else if (token) await SecureStore.setItemAsync('kuda.token', token);
    else await SecureStore.deleteItemAsync('kuda.token');
  } catch {
    /* A fresh login is still valid for this session. */
  }
}

export function hasToken() {
  return Boolean(accessToken);
}

export async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data.error?.message || 'Не удалось выполнить запрос. Попробуй ещё раз.',
      );
      error.code = data.error?.code || `HTTP_${response.status}`;
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error('Сервер долго не отвечает. Проверь соединение.');
    if (error instanceof TypeError) throw new Error('Нет связи с сервером. Проверь соединение.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  me: () => request('/v1/me'),
  logout: () => request('/v1/auth/session', { method: 'DELETE' }),
  guest: (name) => request('/v1/auth/guest', { method: 'POST', body: { name } }),
  email: (mode, email, password, name) =>
    request(`/v1/auth/email/${mode}`, { method: 'POST', body: { email, password, name } }),
  miniApp: (provider, initData) =>
    request(`/v1/auth/${provider}`, { method: 'POST', body: { initData } }),
  estimate: (constraints) => request('/v1/catalog/estimate', { method: 'POST', body: constraints }),
  createRoom: (constraints) => request('/v1/rooms', { method: 'POST', body: { constraints } }),
  roomByCode: (code) => request(`/v1/rooms/code/${encodeURIComponent(code)}`),
  preview: (token) => request(`/v1/invites/${encodeURIComponent(token)}`),
  join: (token) =>
    request(`/v1/invites/${encodeURIComponent(token)}/join`, { method: 'POST', body: {} }),
  rooms: () => request('/v1/rooms'),
  room: (id) => request(`/v1/rooms/${encodeURIComponent(id)}`),
  start: (id) => request(`/v1/rooms/${encodeURIComponent(id)}/start`, { method: 'POST', body: {} }),
  rotateInvite: (id) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/rotate-invite`, { method: 'POST', body: {} }),
  cancelRoom: (id) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {} }),
  vote: (id, venueId, value, userId) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/votes`, {
      method: 'PUT',
      body: { venueId, value },
      idempotencyKey: `vote:${id}:${userId}:${venueId}`,
    }),
  finish: (id) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/finish`, { method: 'POST', body: {} }),
  closeVoting: (id) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/close-voting`, { method: 'POST', body: {} }),
  extend: (id) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/extend`, { method: 'POST', body: {} }),
  choose: (id, venueId) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/winner`, { method: 'PUT', body: { venueId } }),
  bookingNote: (id, note) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/booking-note`, { method: 'PUT', body: { note } }),
  report: (id, venueId, reason) =>
    request(`/v1/rooms/${encodeURIComponent(id)}/reports`, {
      method: 'POST',
      body: { venueId, reason },
    }),
  track: (name, properties = {}) =>
    request('/v1/events', { method: 'POST', body: { name, properties } }),
};
