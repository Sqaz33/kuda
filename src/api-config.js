// Expo inlines EXPO_PUBLIC_* at build time. This helper has no native dependencies.
export function resolveApiBase({
  configured,
  platform,
  hostname = 'localhost',
  protocol = 'http:',
}) {
  if (configured?.trim()) {
    const url = new URL(configured.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error('EXPO_PUBLIC_API_URL должен быть HTTP(S) origin без /v1 и секретов.');
    return url.origin;
  }
  if (platform === 'android') return 'http://10.0.2.2:8787';
  if (platform !== 'web') return 'http://localhost:8787';
  const host = hostname.includes(':') && !hostname.startsWith('[') ? `[${hostname}]` : hostname;
  return `${protocol === 'https:' ? 'https:' : 'http:'}//${host}:8787`;
}
