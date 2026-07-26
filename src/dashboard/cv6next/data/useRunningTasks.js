// cv6next — room-scoped feed of work that is still in flight for this room.
//
// Powers the chat "working in the background" card (Patrik 2026-07-25: "no way for a user
// to know a background task is actively running" — show a card with an elapsed timer that
// appears only while it runs, then vanishes).
//
// TWO kinds, because tasks alone left the card blank exactly when it was needed:
//   tasks    — dispatched jobs actively executing (tasks table, building | running)
//   promises — pending come-backs (followups table): an agent said it would report back
//              and hasn't. This is the only signal that survives past the agent's reply,
//              which is when the room's `awaiting` step strip disappears and the user
//              starts asking "is it actually running?".
//
// Both are scoped to the viewer's world and narrowed to the room's project when the room
// maps to one. Refetches on tasks OR followups realtime changes (debounced) with a slow
// poll fallback — the same realtime-first pattern useDataPipe uses for the HUD.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { useWorldId } from '../../lib/tenantContext.jsx';

// The project a room maps to: a project room -> its own slug; a mission room -> its parent
// project (explicit field, else the slug before ':'). 1:1 / world rooms return null, so the
// card shows every running job in the world — the honest answer to "is anything running?".
function roomProjectSlug(room) {
  if (!room) return null;
  if (room.isProject) return room.slug || room.id || null;
  if (room.isMission) {
    // Mission room objects carry the parent project in `projectSlug` (verified across
    // every mission-room construction in CornerCV6). Fall back to an explicit `project`
    // field, then to the slug-before-':' only as a last resort.
    if (room.projectSlug) return room.projectSlug;
    if (room.project) return room.project;
    const ms = String(room.missionSlug || room.id || '');
    if (ms.includes(':')) return ms.split(':')[0];
  }
  return null;
}

const EMPTY = { tasks: [], promises: [] };

export function useRunningTasks(room) {
  const worldId = useWorldId();
  const [state, setState] = useState(EMPTY);
  const projectSlug = roomProjectSlug(room);
  // Read the freshest scope inside the stable fetch closure without re-creating it.
  const projRef = useRef(projectSlug);
  projRef.current = projectSlug;

  const fetchNow = useCallback(async () => {
    if (!worldId) { setState(EMPTY); return; }
    try {
      const qs = new URLSearchParams({ client: worldId });
      if (projRef.current) qs.set('project', projRef.current);
      const res = await authFetch(`/api/dashboard/running-tasks?${qs.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setState({
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        // `promises` is absent on an older deployed endpoint — treat as empty, never
        // crash the card during a rolling deploy.
        promises: Array.isArray(data.promises) ? data.promises : [],
      });
    } catch {
      // transient network/poll error — keep the last known set, next tick recovers
    }
  }, [worldId]);

  useEffect(() => {
    if (!worldId) { setState(EMPTY); return undefined; }
    // Clear on every scope change (world or room switch) so the new room never
    // flashes the previous room's jobs during the fetch round-trip.
    setState(EMPTY);
    fetchNow();
    const poll = setInterval(fetchNow, 30000);
    let debounce = null;
    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => { debounce = null; fetchNow(); }, 1500);
    };
    let ch = null;
    if (supabase) {
      ch = supabase
        .channel(`running-tasks-${worldId}-${Math.random().toString(36).slice(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, schedule)
        // followups flip pending -> fired the moment a come-back lands, so the card
        // must clear on that too; without this the promise row would linger until the
        // 30s poll and read as "still waiting" after the answer already arrived.
        .on('postgres_changes', { event: '*', schema: 'public', table: 'followups' }, schedule)
        .subscribe();
    }
    return () => {
      clearInterval(poll);
      if (debounce) clearTimeout(debounce);
      if (ch && supabase) supabase.removeChannel(ch);
    };
  }, [worldId, projectSlug, fetchNow]);

  return state;
}
