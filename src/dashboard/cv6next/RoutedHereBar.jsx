// RoutedHereBar — "Corner sent this here. Wrong room? Move it."
//
// corner:front-door R8 (2026-07-25). Patrik: "build the visible destination with one tap to
// change." When the front door is confident it opens a room and posts the message with no
// confirmation at all, which is the right speed and the wrong amount of honesty: measured on
// 74 of his real messages the router lands somewhere he did not mean about one time in five,
// and its own confidence score does not separate those from the good ones (it says ~0.9
// either way). So the answer is not another threshold. It is showing the destination after
// the fact and making it correctable in one tap.
//
// Appears ONLY after an automatic route into THIS room, only for 15 minutes, and never when
// the user picked the room themselves. It is a strip, not a modal: the message has already
// been sent and the agent is already working — this must not read as "we are waiting on you."
//
// Moving is a real move, not a copy: /api/dashboard/move-message writes the message into the
// chosen room and retracts it (plus the reply it drew) from this one, so the wrong room ends
// up looking like the message was never sent there. A correction that leaves a mess behind
// only gets used once.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { authFetch } from '../lib/authFetch';
import { readRoutedHere, clearRoutedHere, ROUTED_HERE_EVENT } from './data/routedHere.js';
import { useChatList, useProjectMissions } from './data/useHomeData.js';

const bare = (s) => (String(s || '').includes(':') ? String(s).split(':').pop() : String(s || ''));

function flattenMissions(nodes, out = []) {
  for (const m of (nodes || [])) {
    if (!m) continue;
    const slug = bare(m.slug || m.folder_name || m.id);
    if (slug) out.push({ slug, name: m.name || slug });
    if (Array.isArray(m.children) && m.children.length) flattenMissions(m.children, out);
  }
  return out;
}

// Gate component. Reading the record is a localStorage lookup, so the overwhelmingly common
// "nothing to say" case costs nothing — and, critically, mounts no data hooks. The room list
// and mission tree are only ever fetched once the bar is actually going to render, which is
// what lets the mobile room (whose parent holds neither) drop this in with no prop threading.
export default function RoutedHereBar({ room, worldId, projects, missionsByProject, onOpenRoom }) {
  const [rec, setRec] = useState(() => readRoutedHere(room, worldId));
  useEffect(() => {
    const reread = () => setRec(readRoutedHere(room, worldId));
    reread();
    // The room opens before the message finishes posting, so on a fresh auto-route this
    // component mounts a beat BEFORE the record exists. Without listening we would read
    // null once and never look again — which is exactly what happened in the first live
    // test: record written correctly, bar absent.
    window.addEventListener(ROUTED_HERE_EVENT, reread);
    return () => window.removeEventListener(ROUTED_HERE_EVENT, reread);
  }, [room, worldId]);
  if (!rec) return null;
  return (
    <RoutedHereBarBody
      // Remount cleanly per moved message so no picker state leaks between them.
      key={rec.messageId}
      rec={rec}
      onGone={() => setRec(null)}
      room={room}
      worldId={worldId}
      projects={projects}
      missionsByProject={missionsByProject}
      onOpenRoom={onOpenRoom}
    />
  );
}

function RoutedHereBarBody({ rec, onGone, worldId, projects: projectsProp, missionsByProject: missionsProp, onOpenRoom }) {
  // Supplied by the desktop room, self-fetched on mobile.
  const { data: list } = useChatList();
  const fetchedMissions = useProjectMissions(worldId);
  const projects = projectsProp?.length ? projectsProp : (list?.projects || []);
  const missionsByProject = missionsProp && Object.keys(missionsProp).length ? missionsProp : (fetchedMissions || {});
  const [picking, setPicking] = useState(false);
  const [dest, setDest] = useState('');
  const [destMission, setDestMission] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Set when the move succeeded but there is no way to navigate (mobile). The bar has to
  // say where the message went, or a successful move looks identical to nothing happening.
  const [movedTo, setMovedTo] = useState('');

  const destMissions = useMemo(
    () => (dest ? flattenMissions(missionsByProject[dest]) : []),
    [dest, missionsByProject],
  );

  const dismiss = () => { clearRoutedHere(); onGone?.(); };

  // Opening the picker makes the strip taller, and it sits at the very bottom of the
  // thread — so the new row lands under the fixed composer and "Move it" is unreachable
  // (seen live). Scroll it back into view on the next frame, once it has grown.
  const wrapRef = useRef(null);
  const openPicker = () => {
    setPicking(true);
    requestAnimationFrame(() => {
      try { wrapRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch { /* older browsers */ }
    });
  };

  const move = async () => {
    if (!dest || busy) return;
    setBusy(true);
    setErr('');
    try {
      const to = destMission ? { project: dest, mission_slug: `${dest}:${destMission}` } : { project: dest };
      const res = await authFetch('/api/dashboard/move-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, message_id: rec.messageId, text: rec.text, to, interaction_mode: rec.interactionMode }),
      });
      const d = res && res.ok ? await res.json() : null;
      if (!d?.ok) { setErr((d && d.error) || 'Could not move it. It is still here.'); setBusy(false); return; }
      clearRoutedHere();
      // Second pass, later. The server can only sweep replies that already exist, and the
      // agent in the wrong room is usually mid-answer at the moment you tap — so its reply
      // lands just after and survives, leaving an orphan under no question. Deliberately not
      // awaited and deliberately not tied to this component: the user is navigating away
      // and the cleanup should finish regardless.
      if (d.sweep_for) {
        setTimeout(() => {
          authFetch('/api/dashboard/move-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: worldId, sweep_for: d.sweep_for }),
          }).catch(() => {});
        }, 25000);
      }
      const chosen = destMission
        ? { id: destMission, name: (destMissions.find((m) => m.slug === destMission)?.name) || destMission, initials: (destMission || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug: `${dest}:${destMission}`, projectSlug: dest, status: 'ready', statusText: '' }
        : { id: dest, name: (projects.find((p) => (p.slug || p.id) === dest)?.name) || dest, initials: (dest || '?').slice(0, 2).toUpperCase(), isProject: true, status: 'ready', statusText: 'project chat' };
      if (onOpenRoom) {
        // Follow the message. Landing in the room you just chose is the confirmation that
        // it worked — a note on the old room would leave you looking at the wrong place.
        onOpenRoom(chosen, worldId);
        onGone?.();
      } else {
        setPicking(false);
        setMovedTo(chosen.name);
      }
    } catch {
      setErr('Could not move it. It is still here.');
    } finally {
      setBusy(false);
    }
  };

  // Moved, with nowhere to navigate to (mobile). Say where it went and stop.
  if (movedTo) {
    return (
      <div data-cv6-routed-here="moved" style={wrap}>
        <div style={topRow}>
          <span aria-hidden="true" style={dot} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={line}>
              Moved to <strong style={{ color: 'var(--fg)', fontWeight: 650 }}>{movedTo}</strong>. It is no longer in this room.
            </div>
          </div>
          <button type="button" onClick={dismiss} style={ghostBtn}>Got it</button>
        </div>
      </div>
    );
  }

  return (
    <div data-cv6-routed-here="" ref={wrapRef} style={wrap}>
      {/* Buttons sit on their OWN row, never beside the text. The chat column is ~370px on
          a 1440 desktop, and two buttons alongside left the sentence a ~150px gutter that
          ran ten lines tall — a one-line strip rendering as a 235px block. */}
      <div style={topRow}>
        <span aria-hidden="true" style={dot} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={line}>
            Corner sent this to <strong style={{ color: 'var(--fg)', fontWeight: 650 }}>{rec.roomName || 'this room'}</strong>
          </div>
          {/* The router's reason earns two lines at most. It is supporting evidence for a
              decision already made, not the message. */}
          {rec.reasoning ? <div style={why}>{rec.reasoning}</div> : null}
        </div>
      </div>
      {!picking ? (
        <div style={btnRow}>
          <button type="button" onClick={openPicker} style={changeBtn}>Wrong room</button>
          <button type="button" onClick={dismiss} style={ghostBtn} aria-label="Dismiss">Got it</button>
        </div>
      ) : null}

      {picking ? (
        <div style={pickRow}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flex: 'none' }}>Move to</span>
          <select value={dest} onChange={(e) => { setDest(e.target.value); setDestMission(''); }} style={selectStyle}>
            <option value="" disabled>pick a room</option>
            {projects.map((p) => (
              <option key={p.slug || p.id} value={p.slug || p.id}>{p.name || p.slug || p.id}</option>
            ))}
          </select>
          {destMissions.length ? (
            <select value={destMission} onChange={(e) => setDestMission(e.target.value)} style={selectStyle}>
              <option value="">the project chat</option>
              {destMissions.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
          ) : null}
          <button type="button" disabled={!dest || busy} onClick={move} style={{ ...primaryBtn, opacity: (!dest || busy) ? 0.5 : 1 }}>
            {busy ? 'Moving…' : 'Move it'}
          </button>
          <button type="button" disabled={busy} onClick={() => { setPicking(false); setErr(''); }} style={ghostBtn}>Cancel</button>
        </div>
      ) : null}

      {err ? <div style={errLine}>{err}</div> : null}
    </div>
  );
}

// Spacing on the 4/8 scale (design-gate R3 / spacing-density-standard).
const wrap = {
  margin: '16px 0 4px',
  padding: '12px 16px',
  borderRadius: 14,
  border: '1px solid var(--hair)',
  background: 'var(--surface)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  fontFamily: 'var(--font-sans)',
};
const topRow = { display: 'flex', alignItems: 'flex-start', gap: 12 };
// Hollow ring, not a filled dot: nothing is running here. The filled dot is reserved for
// the working indicator, and two identical dots meaning different things is worse than none.
const dot = { width: 8, height: 8, flex: 'none', marginTop: 4, borderRadius: '50%', border: '1.5px solid var(--accent)' };
const line = { fontSize: 14, color: 'var(--muted)', lineHeight: 1.4 };
// Clamped to two lines: the reason is evidence, not the headline, and an unbounded model
// sentence is what turned this strip into a 235px block in the first live shot.
const why = {
  fontSize: 12, color: 'var(--faint, var(--muted))', marginTop: 4, lineHeight: 1.4,
  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
};
const btnRow = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const pickRow = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const selectStyle = { height: 32, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, padding: '0 8px', outline: 'none', fontFamily: 'var(--font-sans)', maxWidth: '100%' };
const primaryBtn = { height: 32, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', font: '700 13px var(--font-sans)', cursor: 'pointer', flex: 'none' };
const changeBtn = { height: 32, padding: '0 16px', borderRadius: 10, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', font: '600 13px var(--font-sans)', cursor: 'pointer' };
const ghostBtn = { height: 32, padding: '0 16px', borderRadius: 10, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', font: '600 13px var(--font-sans)', cursor: 'pointer' };
const errLine = { fontSize: 12, color: 'var(--warn, #d9a441)' };
