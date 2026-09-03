// Wrap window.fetch to attach the Convex Auth token as an Authorization: Bearer
// header. Used by dashboard callers of /api/dashboard/* endpoints; the server
// side (aom-studio/api/_lib/verifyTenant.js) checks the same token against the
// deployment's JWKS.
//
// With no session the request goes out without an Authorization header and the
// endpoint answers 401, which is the correct outcome.
import { ensureFreshToken } from './convex.js';

function notifyRateLimited(url, response) {
  try {
    const h = response?.headers;
    let retryAfter = null;
    if (h?.get) {
      const v = h.get('retry-after') || h.get('Retry-After');
      if (v) {
        const n = Number(v);
        if (Number.isFinite(n)) retryAfter = n;
        else {
          const d = Date.parse(v);
          if (Number.isFinite(d)) retryAfter = Math.max(0, Math.round((d - Date.now()) / 1000));
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('corner:rate-limited', {
        detail: { url: String(url || ''), retryAfter, status: 429, at: Date.now() },
      }));
    }
  } catch {}
}

function notifyAuthRefreshNeeded(reason, detail = {}) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('corner:auth-refresh-needed', {
        detail: { reason, ...detail, at: Date.now() },
      }));
    }
  } catch {}
}

export async function authFetch(url, opts = {}) {
  let token = null;
  try {
    token = await ensureFreshToken();
  } catch {
    token = null;
  }
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  // 429: surface a banner with a Retry button instead of silently failing the turn.
  if (res && res.status === 429) notifyRateLimited(url, res);
  // 404 on an API call right after an account switch: the token may still be the
  // old account's. Signal so listeners can refresh once before showing a 404.
  if (res && res.status === 404 && String(url || '').includes('/api/')) {
    notifyAuthRefreshNeeded('404-after-profile-click', { url: String(url || ''), status: 404 });
  }
  if (res && res.status === 401) {
    notifyAuthRefreshNeeded('401-unauthorized', { url: String(url || ''), status: 401 });
  }
  return res;
}
