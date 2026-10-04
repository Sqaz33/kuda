import { Platform } from 'react-native';

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
    setTimeout(resolve, 2500);
  });
}

export async function detectMiniApp() {
  if (Platform.OS !== 'web') return null;
  const address = window.location.href;
  const agent = navigator.userAgent;
  const scripts = [];
  if (window.Telegram?.WebApp || /tgWebApp/i.test(address) || /Telegram/i.test(agent))
    scripts.push(loadScript('https://telegram.org/js/telegram-web-app.js'));
  if (window.WebApp || /WebAppData=/i.test(address) || /\bMAX\b/i.test(agent))
    scripts.push(loadScript('https://st.max.ru/js/max-web-app.js'));
  await Promise.all(scripts);
  const telegram = window.Telegram?.WebApp;
  if (telegram?.initData) {
    telegram.ready?.();
    telegram.expand?.();
    return {
      provider: 'telegram',
      initData: telegram.initData,
      startParam: telegram.initDataUnsafe?.start_param || null,
    };
  }
  const max = window.WebApp;
  if (max?.initData)
    return {
      provider: 'max',
      initData: max.initData,
      startParam: max.initDataUnsafe?.start_param || null,
    };
  return null;
}
