// cv6next — Global search (⌘K), mobile + desktop. Structure from ccds6 wired/tools/search.html
// (search-mobile field+results, search-desktop palette over dimmed app). Built in React because
// it is input-driven (a live query that re-filters on every keystroke would lose focus under the
// template engine's re-bind). Real data only: Rooms (agents + projects) and Missions come from the
// same hooks Home/Chat use, filtered client-side by the query. Files/People groups are omitted
// until a real source exists (no fake rows). Selecting a result opens that room.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatList, useProjectMissions } from './data/useHomeData.js';
import { buildSearchGroups } from './data/searchResults.js';

function useRecentSearches() {
  const KEY = 'cv6.search.recent';
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]').slice(0, 5); } catch { return []; }
  });
  const add = (query) => {
    const q = String(query || '').trim();
    if (!q) return;
    const next = [q, ...recents.filter(r => r !== q)].slice(0, 5);
    setRecents(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };
  return { recents, add };
}

function useIsDesktop() {
  const [d, setD] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 900px)').matches : true));
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const on = () => setD(mq.matches); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return d;
}

// Title with the matched substring wrapped in <span class="hl">, done in React (no innerHTML).
function Highlight({ text, q }) {
  const s = String(text || '');
  if (!q) return s;
  const i = s.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return s;
  return (<>{s.slice(0, i)}<span className="hl">{s.slice(i, i + q.length)}</span>{s.slice(i + q.length)}</>);
}

function Glyph({ type, initials, status }) {
  if (type === 'room' || type === 'person') {
    return (
      <span className="sgly" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--avatar)', width: 36, height: 36, borderRadius: type === 'person' ? '50%' : 10, flex: 'none' }}>
        {initials || '·'}
        {status ? <span className={`sdot is-${status}`} style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, border: '2px solid var(--ground)' }} /> : null}
      </span>
    );
  }
  if (type === 'action') {
    return (
      <span className="sgly" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', flex: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    );
  }
  const icon = type === 'mission'
    ? <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
    : <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />;
  return (
    <span className="sgly" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--accent-weak)', flex: 'none' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
    </span>
  );
}

export default function Search({ onClose, onOpenMenu, onOpenRoom, onAction }) {
  const isDesktop = useIsDesktop();
  const { data, worldId } = useChatList();
  const byProject = useProjectMissions(worldId);
  const agents = data?.agents || [];
  const projects = data?.projects || [];
  const recent = data?.recent || [];
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef([]);
  const listboxId = React.useId().replaceAll(':', '');
  const { recents, add: addRecent } = useRecentSearches();
  const returnFocusRef = useRef(typeof document !== 'undefined' ? document.activeElement : null);
  const restoreFocusRef = useRef(true);
  const actions = useMemo(() => [
    { id: 'all-rooms', title: 'All rooms', meta: 'Return to the room directory', action: 'home' },
    { id: 'keyboard-shortcuts', title: 'Keyboard shortcuts', meta: 'Show every available key command', action: 'shortcuts' },
  ], []);

  const groups = useMemo(() => buildSearchGroups({ query: q, agents, projects, byProject, recent, actions }), [q, agents, projects, byProject, recent, actions]);
  const indexedGroups = useMemo(() => {
    let index = 0;
    return groups.map((group) => ({
      ...group,
      results: group.results.map((result) => ({ ...result, commandIndex: index++ })),
    }));
  }, [groups]);
  const flatResults = useMemo(() => indexedGroups.flatMap((group) => group.results), [indexedGroups]);
  const total = flatResults.length;
  const selectedIndex = total ? Math.min(activeIndex, total - 1) : -1;
  const close = (restoreFocus = true) => { restoreFocusRef.current = restoreFocus; onClose?.(); };
  const pick = (r) => {
    addRecent(q);
    if (r.kind === 'action') onAction?.(r.action);
    else onOpenRoom?.(r.room, worldId);
    close(false);
  };

  useEffect(() => () => {
    if (!restoreFocusRef.current) return;
    const prior = returnFocusRef.current;
    requestAnimationFrame(() => {
      const activeColumn = document.querySelector('[data-workspace-column][data-column-active="1"]');
      const composer = activeColumn?.querySelector('.cv6-floating-composer textarea, .cv6-floating-composer input[type="text"]');
      const target = prior?.isConnected && prior !== document.body ? prior : composer;
      try { target?.focus?.({ preventScroll: true }); } catch { /* focus target disappeared */ }
    });
  }, []);

  useEffect(() => { setActiveIndex(0); }, [q]);
  useEffect(() => {
    if (!total) return;
    setActiveIndex((current) => Math.min(current, total - 1));
  }, [total]);
  useEffect(() => {
    optionRefs.current[selectedIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  const searchInput = (
    <input autoFocus type="search" role="combobox" aria-label="Search rooms and missions"
      aria-expanded="true" aria-controls={listboxId}
      aria-activedescendant={selectedIndex >= 0 ? `${listboxId}-option-${selectedIndex}` : undefined}
      aria-autocomplete="list" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms and missions…"
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
        if (e.key === 'ArrowDown' && total) {
          e.preventDefault();
          setActiveIndex((current) => Math.min(current + 1, total - 1));
          return;
        }
        if (e.key === 'ArrowUp' && total) {
          e.preventDefault();
          setActiveIndex((current) => Math.max(current - 1, 0));
          return;
        }
        if (e.key === 'Home' && total) { e.preventDefault(); setActiveIndex(0); return; }
        if (e.key === 'End' && total) { e.preventDefault(); setActiveIndex(total - 1); return; }
        if (e.key === 'Enter' && selectedIndex >= 0) { e.preventDefault(); pick(flatResults[selectedIndex]); }
      }}
      style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', fontSize: 16, fontFamily: 'var(--font-sans)' }} />
  );

  const palette = (
    <div data-cv6 data-theme="dark" style={{ width: '100%', maxWidth: isDesktop ? 640 : '100%', height: isDesktop ? 'auto' : '100%', maxHeight: isDesktop ? '70vh' : '100%', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: isDesktop ? 16 : 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: isDesktop ? '0 30px 80px -20px rgba(0,0,0,.6)' : 'none' }}>
      {isDesktop ? (
        <div className="cv6-searchbar" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" style={{ flex: 'none' }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          {searchInput}
          <button type="button" aria-label="Close search" onClick={() => close(true)} style={{ border: 'none', background: 'var(--surface-2)', color: 'var(--muted)', borderRadius: 8, padding: '6px 11px', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>esc</button>
        </div>
      ) : (
        <div className="mhdr cv6-searchbar">
          <button type="button" className="mback" aria-label="Back" onClick={() => close(true)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
          <div className="mhtitle">{searchInput}</div>
          <button type="button" className="ib" aria-label="Menu" onClick={() => onOpenMenu?.()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg></button>
        </div>
      )}
      <div id={listboxId} role="listbox" aria-label="Rooms and missions"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 8px max(12px, env(safe-area-inset-bottom, 0px))' }}>
        {!q.trim() && recents.length > 0 ? (
          <div style={{ marginBottom: 8 }}>
            <div className="eyebrow" style={{ padding: '8px 10px 6px', color: 'var(--muted)' }}>Recent</div>
            {recents.map((r, ri) => (
              <div key={ri} className="sres" onClick={() => setQ(r)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', borderRadius: 11, cursor: 'pointer' }}>
                <span className="sgly" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', flex: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </span>
                <span style={{ fontSize: 14, color: 'var(--fg)' }}>{r}</span>
              </div>
            ))}
          </div>
        ) : null}
        {total === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13.5, textAlign: 'center', padding: '32px 20px' }}>{q.trim() ? `Nothing matches "${q.trim()}".` : (!recents.length ? 'Type to search your rooms and missions.' : null)}</div>
        ) : indexedGroups.map((g) => (
          <div key={g.label} style={{ marginBottom: 8 }}>
            <div className="eyebrow" style={{ padding: '8px 10px 6px', color: 'var(--muted)' }}>{g.label} <span style={{ color: 'var(--faint)' }}>{g.count}</span></div>
            {g.results.map((r) => {
              const selected = r.commandIndex === selectedIndex;
              return (
              <div key={`${r.kind}:${r.id}`} id={`${listboxId}-option-${r.commandIndex}`}
                ref={(node) => { optionRefs.current[r.commandIndex] = node; }}
                role="option" aria-selected={selected} className={`sres${selected ? ' is-sel' : ''}`}
                onMouseEnter={() => setActiveIndex(r.commandIndex)} onClick={() => pick(r)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', borderRadius: 11, cursor: 'pointer', background: selected ? 'var(--accent-weak)' : 'transparent', outline: selected ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' : 'none' }}>
                <Glyph type={r.type} initials={r.initials} status={r.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Highlight text={r.title} q={q.trim()} /></div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.meta}</div>
                </div>
                {r.statusLabel ? <span className={`astat is-${r.status}`} style={{ fontSize: 10.5, fontWeight: 600 }}>{r.statusLabel}</span> : null}
              </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) close(true); }} style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
        {palette}
      </div>
    );
  }
  // Mobile: full-screen takeover. Anchors to the shell's inner positioning
  // context, which already sits below the iPhone status bar (safe-area fix in
  // CornerCV6 — overlays must NOT re-apply the inset or they double-pad).
  return <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'var(--ground)' }}>{palette}</div>;
}
