// Shared reader for /api/dashboard/room-activity — "which rooms were active lately",
// over a 6000-row (~11 day) window rather than the dashboard's 100-message poll.
//
// Extracted out of useIntakeRoute 2026-08-06 when Home's recent list became the second
// consumer. It lives in its own module rather than being exported from useIntakeRoute
// because useIntakeRoute already imports from useHomeData — importing back the other way
// would make a cycle. Two callers, one module-level cache, one request between them.
//
// See api/dashboard/room-activity.js for why the wide window exists and why it is
// deliberately NOT part of the hot poll.
import { authFetch } from '../../lib/authFetch';

// Per-tab memo: the payload is edge-cached (180s) and describes "which rooms were active
// lately", so re-fetching it on every keystroke-to-send would be waste. Refreshed on a
// short TTL so a room the user just worked in still climbs the ranking within the session.
const ACTIVITY_TTL_MS = 120000;
const ACTIVITY_TIMEOUT_MS = 2500;
let activityCache = { worldId: '', at: 0, value: null };

export async function fetchRoomActivity(worldId, { recencyOnly = false } = {}) {
  const now = Date.now();
  // Recency-only requests use a separate cache key so they don't evict the full digest.
  const cacheKey = recencyOnly ? 'fast' : 'full';
  if (activityCache.value && activityCache.worldId === worldId && activityCache.mode === cacheKey && (now - activityCache.at) < ACTIVITY_TTL_MS) {
    return activityCache.value;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACTIVITY_TIMEOUT_MS);
  try {
    const q = `client=${encodeURIComponent(worldId)}${recencyOnly ? '&recency_only=1' : ''}`;
    const res = await authFetch(`/api/dashboard/room-activity?${q}`, { signal: controller.signal });
    const value = res && res.ok ? await res.json() : null;
    if (value && (value.projects || value.missions)) {
      activityCache = { worldId, at: now, value, mode: cacheKey };
      return value;
    }
    return null;
  } catch {
    // Both callers degrade rather than fail: the router falls back to Home's own data
    // and the send still goes through; the recent list falls back to 100-message
    // recency and shows fewer rooms. Neither shows an error or an empty screen.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
