import { Platform, Share } from 'react-native';

export function inviteLink(token) {
  const origin =
    process.env.EXPO_PUBLIC_WEB_URL ||
    (Platform.OS === 'web' ? window.location.origin : 'http://localhost:8081');
  return `${origin.replace(/\/$/, '')}/?invite=${encodeURIComponent(token)}`;
}

export function inviteFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const query =
      parsed.searchParams.get('invite') ||
      parsed.searchParams.get('startapp') ||
      parsed.searchParams.get('tgWebAppStartParam');
    if (query) return query;
    const match = parsed.pathname.match(/\/invite\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function shareInvite(token) {
  const link = inviteLink(token);
  if (Platform.OS === 'web') {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Вечер в Куда',
          text: 'Присоединяйся к выбору места',
          url: link,
        });
        return 'shared';
      } catch {
        /* use copy */
      }
    }
    await navigator.clipboard.writeText(link);
    return 'copied';
  }
  await Share.share({ message: `Присоединяйся к выбору места: ${link}` });
  return 'shared';
}
