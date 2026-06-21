import { useState, useEffect, useMemo } from 'react';
import { CommandView } from './CommandView';

/**
 * CommandLive — wires the Claude-design Command screen (CommandView, the goal
 * ledger) to REAL data: the master loop's per-room goal memory via
 * GET /api/dashboard/room-goals?world=<world>. Read-only on the phone: a featured
 * goal over the room roster with status. A room with an unanswered open question
 * surfaces as "blocked" (needs you, amber) and sorts to the top. Tapping a room
 * hands off to the real open-room handler (onSelectRoom). The interactive controls
 * — master-loop toggle, inline reply, edit-goal, autopilot — stay on the desktop
 * CommandTracker. onBack returns home. Real data only; 30s refresh.
 */

function titleCaseSlug(s) {
  return String(s || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// "corner:corner-ui-cv4" -> "Corner Ui Cv4"; "elon" -> "Elon"
function roomName(slug) {
  if (!slug) return '';
  if (!slug.includes(':')) return titleCaseSlug(slug);
  const parts = slug.split(':');
  return titleCaseSlug(parts[parts.length - 1]);
}

// short, de-noised goal line for the roster sub-text
function shortGoal(goal) {
  const clean = String(goal || '').replace(/\s+/g, ' ').trim();
  return clean.length > 90 ? `${clean.slice(0, 89).trimEnd()}…` : clean;
}

const PALETTE = ['var(--violet-400)', 'var(--accent)', '#34D399', '#F59E0B', '#F472B6', '#22D3EE'];

function mapRoom([slug, v], i) {
  const rawQ = v && v.open_question;
  const openQuestion = rawQ && String(rawQ).trim() && rawQ !== 'None' ? String(rawQ).trim() : '';
  // An unanswered open question = blocked on Patrik (amber). Else active = live. Else idle.
  let status = 'idle';
  if (openQuestion) status = 'blocked';
  else if (v && (v.status === 'active' || v.status === 'working')) status = 'live';
  else if (v && (v.status === 'blocked' || v.status === 'error')) status = 'blocked';
  return {
    id: slug,
    slug,
    name: roomName(slug),
    color: PALETTE[i % PALETTE.length],
    goal: (v && v.goal) || '',
    status,
    openQuestion,
    lastReviewed: (v && v.last_reviewed) || '',
  };
}

export function CommandLive({ worldId = 'aom', onSelectRoom, onBack }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/dashboard/room-goals?world=${encodeURIComponent(worldId)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const obj = d && d.rooms && typeof d.rooms === 'object' ? d.rooms : {};
          setRooms(Object.entries(obj).map(mapRoom));
        })
        .catch(() => { if (alive) setRooms([]); });
    };
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [worldId]);

  // Needs-you first, then live, then idle; within a tier, freshest review first.
  const sorted = useMemo(() => {
    const order = { blocked: 0, live: 1, idle: 2 };
    return [...rooms].sort((a, b) => {
      const d = (order[a.status] ?? 9) - (order[b.status] ?? 9);
      if (d) return d;
      return String(b.lastReviewed).localeCompare(String(a.lastReviewed));
    });
  }, [rooms]);

  // Featured = the top room that needs you, else the top live goal, else the first.
  const featured = useMemo(() => {
    const f = sorted.find((r) => r.status === 'blocked') || sorted.find((r) => r.status === 'live') || sorted[0];
    if (!f) return null;
    return {
      id: f.id,
      slug: f.slug,
      room: f.name,
      color: f.color,
      goal: f.goal,
      status: f.status,
      checklist: f.openQuestion ? [{ label: f.openQuestion, state: 'pending' }] : [],
    };
  }, [sorted]);

  const roster = useMemo(
    () => sorted
      .filter((r) => !featured || r.id !== featured.id)
      .map((r) => ({ id: r.id, slug: r.slug, name: r.name, color: r.color, sub: shortGoal(r.goal), status: r.status })),
    [sorted, featured],
  );

  const liveCount = useMemo(() => rooms.filter((r) => r.status === 'live').length, [rooms]);

  return (
    <CommandView
      summary={{ roomCount: rooms.length, liveCount }}
      featured={featured}
      rooms={roster}
      onSelectRoom={(r) => onSelectRoom && onSelectRoom(r)}
      onBack={onBack}
    />
  );
}
