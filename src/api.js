import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApiClient } from './api-client';

const defaultBase =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8787'
    : Platform.OS === 'web'
      ? `http://${window.location.hostname}:8787`
      : 'http://localhost:8787';
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || defaultBase).replace(/\/$/, '');
let accessToken = null;
const unauthorizedListeners = new Set();

export function subscribeUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

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

export const api = createApiClient({
  baseUrl: API_BASE,
  getToken: () => accessToken,
  onUnauthorized: async (requestToken) => {
    if (!requestToken || requestToken !== accessToken) return;
    await saveToken(null);
    unauthorizedListeners.forEach((listener) => listener());
  },
});

export const request = api.request;
