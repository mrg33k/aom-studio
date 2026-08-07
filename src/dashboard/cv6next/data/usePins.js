// cv6next — Pin-comments state for the Review tool, persisted to the backend.
// Pins are POINT review-comments on a deliverable: a spot (x,y as 0..1 fractions)
// on a doc / photo / site screenshot / video frame, plus optional t (seconds) when
// the spot is on a video frame. Source of truth is /api/dashboard/review-comments
// (same disk+tunnel store the agents read), so pins survive refresh and reach the
// agent's fix-list. The viewer renders markers at x%,y% via the template engine.

import { useState, useCallback, useEffect, useRef } from 'react';
import { authFetch } from '../../lib/authFetch';

// Map a stored comment row -> the pin shape the template binds (n, x/y in %, text).
function toPin(c, i) {
  return {
    id: c.id,
    n: i + 1,
    x: Math.round((Number(c.x) || 0) * 1000) / 10, // 0..1 -> 0..100 (%)
    y: Math.round((Number(c.y) || 0) * 1000) / 10,
    t: c.t != null ? Number(c.t) : null,
    // A circled comment carries radii (fractions of the artwork -> % like x/y).
    // Absent on every pre-2026-08-07 comment, which keeps rendering as a plain pin.
    rx: c.rx != null ? Math.round((Number(c.rx) || 0) * 1000) / 10 : 0,
    ry: c.ry != null ? Math.round((Number(c.ry) || 0) * 1000) / 10 : 0,
    text: c.text || '',
    // For the comment row's sub-label: a video frame pin shows its timestamp, a
    // circled spot says so (that is what makes the note findable in a long list),
    // a plain doc/image pin shows nothing — its marker carries the location.
    anchor: c.t != null ? `at ${fmtTime(c.t)}` : (c.rx != null && c.ry != null ? 'circled' : ''),
  };
}

function fmtTime(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function usePins(deliverableId, worldId = null) {
  const [pins, setPins] = useState([]);
  const reqRef = useRef(0); // guards against out-of-order loads when switching files

  const load = useCallback(async () => {
    if (!deliverableId) { setPins([]); return; }
    const seq = ++reqRef.current;
    try {
      const r = await authFetch(`/api/dashboard/review-comments?world=${encodeURIComponent(worldId)}&deliverable=${encodeURIComponent(deliverableId)}`);
      if (!r?.ok) { if (seq === reqRef.current) setPins([]); return; }
      const d = await r.json();
      const list = Array.isArray(d?.list) ? d.list : [];
      // Only POINT comments render as on-artifact pins; pure timeline rows (none today)
      // would belong to a separate timeline bar.
      const points = list.filter((c) => c && c.type === 'point' && c.x != null && c.y != null);
      if (seq === reqRef.current) setPins(points.map(toPin));
    } catch {
      if (seq === reqRef.current) setPins([]);
    }
  }, [deliverableId, worldId]);

  // Reload whenever the open deliverable changes (and clear immediately so one
  // file's pins never flash onto the next).
  useEffect(() => { setPins([]); load(); }, [load]);

  // Create a point pin. x,y are 0..1 fractions of the viewer; t (optional) is the
  // video frame time in seconds. text is the human comment. `shape` (optional)
  // carries { rx, ry } when the user circled a region instead of tapping a spot —
  // x,y are then the circle's centre. Optimistically appends, then reloads from
  // the store to pick up the server id + ordering.
  const addPin = useCallback(async (xFrac, yFrac, text, t, shape) => {
    if (!deliverableId || !text || !String(text).trim()) return null;
    const body = {
      action: 'add', world: worldId, deliverable: deliverableId, type: 'point',
      x: Math.min(1, Math.max(0, Number(xFrac) || 0)),
      y: Math.min(1, Math.max(0, Number(yFrac) || 0)),
      text: String(text).trim(),
    };
    if (t != null && Number.isFinite(Number(t))) body.t = Number(t);
    if (shape && Number(shape.rx) > 0 && Number(shape.ry) > 0) {
      body.rx = Math.min(1, Math.max(0, Number(shape.rx)));
      body.ry = Math.min(1, Math.max(0, Number(shape.ry)));
    }
    try {
      const r = await authFetch('/api/dashboard/review-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r?.ok) { await load(); return true; }
    } catch { /* fall through */ }
    return false;
  }, [deliverableId, worldId, load]);

  const deletePin = useCallback(async (pinId) => {
    if (!deliverableId || !pinId) return;
    try {
      const r = await authFetch('/api/dashboard/review-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', world: worldId, deliverable: deliverableId, id: pinId }),
      });
      if (r?.ok) await load();
    } catch { /* ignore */ }
  }, [deliverableId, worldId, load]);

  return { pins, addPin, deletePin, reloadPins: load };
}
