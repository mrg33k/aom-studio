import { useState, useEffect, useRef } from 'react';
import { SearchView } from './SearchView';
import { authFetch } from '../lib/authFetch.js';

/**
 * SearchLive — wires the CV6-design SearchView (global search palette) to REAL data.
 * Sources: ROOMS (agents + projectRooms, instant client-side filter), FILES (debounced
 * real fetch via /api/dashboard/file-search). MISSIONS and PEOPLE are currently empty.
 * Keyboard nav with arrow up/down (clamped to flat list), Enter to select, Escape to close.
 * Renders SearchView with live query state, results grouped, global selectedIndex, and
 * onSelect routed by group (rooms call onSelectAgent/onSelectProject, files close).
 */

export function SearchLive({
  worldId = 'aom',
  agents = [],
  projectRooms = [],
  isDesktop = false,
  onClose,
  onSelectAgent,
  onSelectProject,
  onNav,
  user = {},
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hits, setHits] = useState([]);
  const debounceRef = useRef(null);

  // ROOMS group: instant, client-side filter from agents + projectRooms
  const rooms = (() => {
    const all = [
      ...agents.map((a) => ({
        name: a.name || a.slug,
        initials: (a.name || a.slug).slice(0, 2).toUpperCase(),
        meta: 'Agent' + (a.status ? ' · ' + a.status : ''),
        isLive:
          String(a.status).toLowerCase() === 'online' ||
          String(a.status).toLowerCase() === 'working' ||
          String(a.status).toLowerCase() === 'active',
        type: 'room',
        _kind: 'agent',
        _raw: a,
      })),
      ...projectRooms.map((p) => ({
        name: p.name || p.slug,
        meta: 'Project',
        type: 'room',
        _kind: 'project',
        _raw: p,
      })),
    ];

    if (!query.trim()) return all;

    const q = query.trim().toLowerCase();
    return all.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item._raw.slug || '').toLowerCase().includes(q)
    );
  })();

  // FILES group: real fetch, debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authFetch(
          `/api/dashboard/file-search?world=${encodeURIComponent(worldId)}&q=${encodeURIComponent(trimmed)}`
        );
        if (!res || !res.ok) {
          setHits([]);
          return;
        }
        const data = await res.json();
        const rawHits = Array.isArray(data.hits) ? data.hits : [];

        const prettify = (s) =>
          String(s || '')
            .replace(/[-_:]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .trim();

        setHits(
          rawHits.map((hit) => ({
            title: hit.filename,
            meta:
              [prettify(hit.project), hit.parent && prettify(hit.parent)]
                .filter(Boolean)
                .join(' / ') || 'File',
            size: '',
            type: 'file',
            _raw: hit,
          }))
        );
      } catch {
        setHits([]);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, worldId]);

  // Build flat list for keyboard nav: rooms then files (missions/people empty)
  const flat = [...rooms, ...hits];

  // Clamp selectedIndex whenever results change
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(Math.max(prev, 0), Math.max(0, flat.length - 1)));
  }, [flat.length]);

  // Keyboard nav
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flat[selectedIndex]) {
          const isFile = selectedIndex >= rooms.length;
          const group = isFile ? 'files' : 'rooms';
          handleSelect(flat[selectedIndex], group);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, rooms.length, flat, onClose]);

  const handleSelect = (item, groupKey) => {
    if (groupKey === 'rooms') {
      if (item._kind === 'agent') {
        onSelectAgent?.(item._raw);
      } else if (item._kind === 'project') {
        onSelectProject?.(item._raw);
      }
      onClose?.();
    } else if (groupKey === 'files') {
      onClose?.();
    }
  };

  const results = {
    rooms,
    missions: [],
    files: hits,
    people: [],
  };

  return (
    <SearchView
      isDesktop={isDesktop}
      query={query}
      results={results}
      selectedIndex={selectedIndex}
      onQueryChange={setQuery}
      onSelect={handleSelect}
      onClose={onClose}
      activeTool="search"
      onNav={onNav}
      user={user}
    />
  );
}
