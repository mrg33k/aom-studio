import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../../lib/authFetch.js';

export default function useRoomChecklists(worldId, roomKey) {
  const [lists, setLists] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!worldId || !roomKey) { setLists([]); setStatus('idle'); return; }
    setStatus('loading');
    setError('');
    try {
      const response = await authFetch(`/api/dashboard/room-checklists?world=${encodeURIComponent(worldId)}&room=${encodeURIComponent(roomKey)}`);
      const data = response?.ok ? await response.json() : null;
      if (!data) throw new Error('Could not load lists');
      setLists(Array.isArray(data.lists) ? data.lists : []);
      setStatus('ready');
    } catch {
      setStatus('error');
      setError("Couldn't open room lists. Try again.");
    }
  }, [worldId, roomKey]);

  useEffect(() => { load(); }, [load]);

  const mutate = useCallback(async (action, fields = {}) => {
    if (!worldId || !roomKey) return null;
    setStatus('saving');
    setError('');
    try {
      const response = await authFetch('/api/dashboard/room-checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, world: worldId, room: roomKey, ...fields }),
      });
      const data = response ? await response.json().catch(() => null) : null;
      if (!response?.ok || !data?.ok) throw new Error(data?.error || 'Could not save list');
      setLists(Array.isArray(data.lists) ? data.lists : []);
      setStatus('ready');
      return data;
    } catch {
      setStatus('error');
      setError("Couldn't save that change. Your list is still here.");
      return null;
    }
  }, [worldId, roomKey]);

  return { lists, status, error, reload: load, mutate };
}
