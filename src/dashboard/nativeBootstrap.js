// Native shell bootstrap. The App Store bundle still ships the compiled CV6
// application; only API requests are sent to the canonical Corner origin.

export function installNativeBootstrap() {
  if (typeof window === 'undefined') return false;
  const capacitor = window.Capacitor;
  const native = capacitor?.isNativePlatform?.() === true;
  if (!native || window.__cornerNativeBootstrapped) return native;
  window.__cornerNativeBootstrapped = true;

  const appOrigin = import.meta.env.VITE_CORNER_API_ORIGIN || 'https://aheadofmarket.com';
  window.CornerNative = { ...(window.CornerNative || {}), appOrigin };
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api/')) return originalFetch(`${appOrigin}${input}`, init);
    if (input instanceof Request && input.url.startsWith(`${window.location.origin}/api/`)) {
      return originalFetch(new Request(input.url.replace(window.location.origin, appOrigin), input), init);
    }
    return originalFetch(input, init);
  };

  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    window.history.replaceState({}, '', '/dashboard');
  }
  return true;
}
