// Web push wiring for Corner (Patrik 2026-08-06).
//
// The one thing everybody gets wrong on iPhone: Safari only grants push to a site that
// has been ADDED TO THE HOME SCREEN. In a normal Safari tab the API is either missing
// or permanently denied, no matter how the prompt is worded. So `pushSupport()` reports
// that case separately instead of saying "not supported", and the UI can tell the user
// the one thing that will actually fix it.
//
// Also: the permission prompt must be triggered by a real tap. Asking on page load is
// how you get a permanent "denied" that no code can undo.

const SW_URL = '/corner-sw.js';
const SW_SCOPE = '/dashboard';

function isStandalone() {
  try {
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  } catch { return false; }
}

function isIOS() {
  try {
    const ua = navigator.userAgent || '';
    // iPadOS 13+ reports as Macintosh; the touch-point check separates it from a real Mac.
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  } catch { return false; }
}

export function pushSupport() {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' };
  const hasApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!hasApi) {
    if (isIOS() && !isStandalone()) return { ok: false, reason: 'ios-needs-home-screen' };
    return { ok: false, reason: 'unsupported' };
  }
  if (isIOS() && !isStandalone()) return { ok: false, reason: 'ios-needs-home-screen' };
  return { ok: true, permission: Notification.permission };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerPushWorker() {
  const support = pushSupport();
  if (!support.ok) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  } catch {
    return null;
  }
}

export async function pushEnabled() {
  const support = pushSupport();
  if (!support.ok || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    return !!(await reg?.pushManager?.getSubscription());
  } catch { return false; }
}

// Must be called from a click. Returns { ok } or { ok:false, reason }.
export async function enablePush(worldId) {
  const support = pushSupport();
  if (!support.ok) return { ok: false, reason: support.reason };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const keyRes = await fetch('/api/push/subscribe?key=1');
  const { key } = await keyRes.json().catch(() => ({ key: '' }));
  if (!key) return { ok: false, reason: 'server-not-configured' };

  const reg = (await navigator.serviceWorker.getRegistration(SW_SCOPE)) || (await registerPushWorker());
  if (!reg) return { ok: false, reason: 'worker-failed' };
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub = existing || (await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  }));

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), worldId, label: isIOS() ? 'iPhone' : 'Browser' }),
  });
  if (!res.ok) return { ok: false, reason: 'store-failed' };
  return { ok: true };
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    const sub = await reg?.pushManager?.getSubscription();
    if (!sub) return { ok: true };
    await fetch('/api/push/subscribe?unsubscribe=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unsubscribe-failed' };
  }
}
