// cv6next — room-scoped feed of background jobs a handed-off agent is running RIGHT NOW.
//
// Powers the chat "working in the background" card (Patrik 2026-07-25: "no way for a user
// to know a background task is actively running" — show a card with an elapsed timer that
// appears only while it runs, then vanishes). Fetches only actively-executing tasks
// (building | running) for the viewer's world, narrowed to the room's project when the
// room maps to one. Refetches on any tasks realtime change (debounced) with a slow poll
// fallback — the same realtime-first pattern useDataPipe uses for the HUD.

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
    if (room.project) return room.project;
    const ms = String(room.missionSlug || room.id || '');
    if (ms.includes(':')) return ms.split(':')[0];
  }
  return null;
}

export function useRunningTasks(room) {
  const worldId = useWorldId();
  const [tasks, setTasks] = useState([]);
  const projectSlug = roomProjectSlug(room);
  // Read the freshest scope inside the stable fetch closure without re-creating it.
  const projRef = useRef(projectSlug);
  projRef.current = projectSlug;

  const fetchNow = useCallback(async () => {
    if (!worldId) { setTasks([]); return; }
    try {
      const qs = new URLSearchParams({ client: worldId });
      if (projRef.current) qs.set('project', projRef.current);
      const res = await authFetch(`/api/dashboard/running-tasks?${qs.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch {
      // transient network/poll error — keep the last known set, next tick recovers
    }
  }, [worldId]);

  useEffect(() => {
    if (!worldId) { setTasks([]); return undefined; }
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
        .subscribe();
    }
    return () => {
      clearInterval(poll);
      if (debounce) clearTimeout(debounce);
      if (ch && supabase) supabase.removeChannel(ch);
    };
  }, [worldId, projectSlug, fetchNow]);

  return tasks;
}
