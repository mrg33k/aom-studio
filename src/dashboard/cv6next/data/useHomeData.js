// cv6next — real Home data, shaped to wired/desktop/home.json + mobile/home.json.
// This is WIRING pulled from the existing dashboard plumbing (useDataPipe), NOT design.
// Returns { state, data } for the Home fill-in templates.
//
// Real sources today: agents + projects + the needs-you inbox (catchUp) all come
// from useDataPipe — the exact pipe the current dashboard already runs on. The
// conversation column's GOAL has no honest source yet (agent run goal/step/checklist
// is not exposed), so we bind it to honest empties (no fabricated steps/bullets)
// instead of leaving the design's sample text on screen. No fake data.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getClientId } from '../../lib/clientConfig';
import { useCurrentUserSlug } from '../../hooks/useCurrentUserSlug';
import { useDataPipe } from '../../hooks/useDataPipe';

const TINTS = ['violet', 'accent', 'pink', 'teal', 'lime', 'amber'];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// agent status (online|working|running|blocked|needs_you|away|idle) -> contract enum
function agentStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'online' || v === 'live') return 'live';
  if (v === 'working' || v === 'running') return 'working';
  if (v === 'blocked' || v === 'needs_you' || v === 'needs you') return 'blocked';
  return 'ready';
}
function statusText(status, unread) {
  if (status === 'live') return unread ? `${unread} new` : 'online';
  if (status === 'working') return 'working';
  if (status === 'blocked') return 'needs you';
  return 'idle';
}
// project color (hex or css var) -> one of the 6 design tints, stable per name
function tintFor(seed) {
  let h = 0;
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
// inbox badge/sender -> the catch-up source kind (email|agent|review|support|tracker)
function cardKind(it) {
  const b = String(it?.badgeType || '').toLowerCase();
  if (b === 'task') return 'tracker';
  if (String(it?.senderType || '').toLowerCase() === 'human') return 'support';
  return 'agent';
}
function firstLine(s) { return String(s || '').split('\n')[0].slice(0, 160); }

export function shapeHome({ agents = [], projectRooms = [], inboxItems = [] } = {}) {
  const agentRooms = (agents || []).map((a) => {
    const status = agentStatus(a.status);
    return {
      id: a.id || a.slug, name: a.name || a.slug || 'Agent',
      status, statusText: statusText(status, a.unread), initials: initials(a.name || a.slug),
    };
  });
  const projects = (projectRooms || []).map((p) => ({
    id: p.id || p.slug, name: p.name || p.slug || 'Project',
    tint: tintFor(p.name || p.id), count: p.taskCount ?? p.count ?? 0,
  }));

  const cards = (inboxItems || []).map((it) => {
    const kind = cardKind(it);
    return {
      id: it.id, kind, kindLabel: kind.toUpperCase(),
      from: it.senderName || it.roomName || 'Someone',
      subject: it.roomName || firstLine(it.messagePreview) || 'New activity',
      summary: firstLine(it.messagePreview),
      time: it.timeAgo || '',
      actionItems: [], attachments: [],
    };
  });

  const catchUp = {
    count: cards.length,
    position: cards.length ? 1 : 0,
    current: cards[0] || { id: '', kind: 'agent', kindLabel: 'AGENT', from: '', subject: '', summary: '', actionItems: [], attachments: [] },
    rest: cards.slice(1),
  };

  // agents/projects are bound BOTH as lists (data-each) and as `.count` /
  // `.moreCount` (data-bind), so the arrays carry those props (arrays are objects).
  agentRooms.count = agentRooms.length;
  projects.count = projects.length;
  projects.moreCount = 0;

  // honest convo column: real header off the first agent room, empty goal body.
  const lead = agentRooms[0] || { name: '', initials: '' };
  const data = {
    rooms: { total: agentRooms.length + projects.length },
    agents: agentRooms,
    projects,
    catchUp,
    room: { name: lead.name || 'Your rooms', initials: lead.initials || '·', count: '', statusText: '', project: '', mission: '' },
    goal: { title: lead.name ? `${lead.name} has no active goal thread yet` : 'Pick a room to see its goal', step: '', total: '', pct: 0, summary: [], checklist: [] },
  };

  let state = 'ready';
  if (!agentRooms.length && !projects.length && !cards.length) state = 'empty';
  return { state, data };
}

// The Home hook: resolve the viewer (auth -> worldId -> slug), feed the existing
// data pipe, and shape it. Mirrors how CornerVG seeds worldId so we ride the same
// auth-derived world (Patrik -> aom).
export function useHome() {
  const [currentUser, setCurrentUser] = useState(null);
  const [worldId, setWorldId] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (data?.user) { setCurrentUser(data.user); setWorldId(getClientId()); }
    }).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!alive) return;
      if (session?.user) { setCurrentUser(session.user); setWorldId(getClientId()); }
      else { setCurrentUser(null); setWorldId(null); }
    });
    return () => { alive = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const currentUserSlug = useCurrentUserSlug(currentUser, worldId);
  const { agents, projectRooms, inboxItems } = useDataPipe(null, worldId, currentUserSlug);

  const { state, data } = shapeHome({ agents, projectRooms, inboxItems });
  // Honest loading until the world resolves and the first pipe read lands.
  const loading = !worldId || (!agents && !projectRooms && !inboxItems);
  return { state: loading ? 'loading' : state, data, worldId };
}
