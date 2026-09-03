// Fake Convex backend backed by JSON fixtures.
//
// Activated when VITE_USE_FIXTURES === '1' (see ./convex.js). Run `npm run
// snapshot` to refresh the fixtures. Each JSON file under __fixtures__/latest is
// keyed by its table name (rooms.json, messages.json, tasks.json, state.json ...).
//
// convex.js routes every convexQuery / convexMutation / subscribeConvexQuery
// through fixtureConvexCall when the flag is on. Reads answer from the JSON;
// writes are no-ops that return a plausible value. The dynamic import in
// convex.js keeps this module (and the JSON) out of the prod bundle.

// eager: true so JSON is inlined at build time.
const fixtureMap = import.meta.glob('../__fixtures__/latest/*.json', {
  eager: true,
  import: 'default',
});

const fixtures = {};
for (const [path, data] of Object.entries(fixtureMap)) {
  const m = path.match(/\/([a-z_]+)\.json$/);
  if (!m) continue;
  fixtures[m[1]] = Array.isArray(data) ? data : [];
}

const table = (name) => fixtures[name] || [];

let seq = 0;
function fakeId(prefix) { seq += 1; return `${prefix}_fixture_${seq}`; }

export function fixtureViewer() {
  const users = table('users');
  const u = users.find((x) => x && x.email === 'hello@aom-inhouse.com') || users[0] || null;
  return {
    userId: u?._id || 'fixture-user',
    email: u?.email || 'hello@aom-inhouse.com',
    name: u?.name || 'Patrik Matheson',
    color: u?.color || '#3B82F6',
    initials: 'PM',
    avatarUrl: null,
    worldId: 'fixture-world',
    worldSlug: 'aom',
    worldName: 'AOM',
    role: 'owner',
    isAdmin: true,
    mustChangePassword: false,
    preferences: { onboarded: true },
    onboarded: true,
  };
}

function roomMatches(room, roomId) {
  if (!room || !roomId) return false;
  return room.legacyRoomId === roomId || String(room._id) === String(roomId);
}

export async function fixtureConvexCall(kind, path, args = {}) {
  switch (path) {
    case 'users:viewer':
    case 'users:verifyToken':
      return fixtureViewer();
    case 'worlds:resolveForSession':
      return { worldId: 'fixture-world', slug: 'aom', healed: false };
    case 'worlds:getBySlug':
      return { _id: 'fixture-world', slug: args.slug || 'aom', name: 'AOM' };
    case 'worlds:forViewer':
      return [{ worldId: 'fixture-world', slug: 'aom', name: 'AOM', role: 'owner', planTier: null }];
    case 'rooms:listRooms': {
      const rows = table('rooms').filter((r) => !args.filter || args.filter === 'all' || r.kind === args.filter);
      return rows.sort((a, b) => ((b.lastMessage?.createdAt || b.createdAt || 0) - (a.lastMessage?.createdAt || a.createdAt || 0)));
    }
    case 'messages:list': {
      const room = table('rooms').find((r) => roomMatches(r, args.roomId));
      const rows = table('messages').filter((m) => !args.roomId || (room && String(m.roomId) === String(room._id)) || m.legacyRoomId === args.roomId);
      return rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(-(args.limit || 100));
    }
    case 'messages:listSince':
      return table('messages').filter((m) => (m.createdAt || 0) >= (args.since || 0)).slice(0, args.limit || 500);
    case 'messages:send':
      return fakeId('message');
    case 'reads:markRead':
      return { ok: true };
    case 'reads:readState':
      return { baselineAt: null, familySize: 1, lastReadAt: Date.now() };
    case 'reviews:list':
      return table('reviews');
    case 'reviews:history':
      return table('review_history');
    case 'reviews:count':
      return table('reviews').length;
    case 'reviews:decide':
      return { ok: true };
    case 'tasks:find': {
      let rows = table('tasks');
      if (args.status) rows = rows.filter((t) => t.status === args.status);
      if (args.status_in) rows = rows.filter((t) => args.status_in.includes(t.status));
      if (args.client_id) rows = rows.filter((t) => t.client_id === args.client_id);
      if (args.project) rows = rows.filter((t) => t.project === args.project);
      return rows.slice(args.offset || 0, (args.offset || 0) + (args.limit || rows.length));
    }
    case 'tasks:queue':
      return { id: fakeId('task'), status: 'queued', title: args.row?.title || '' };
    case 'followups:listPending':
      return table('followups');
    case 'state:get': {
      if (args.key && !args.kind) {
        const row = table('state').find((r) => r.kind === args.key && !r.scopeId);
        return row ? row.value : null;
      }
      const rows = table('state').filter((r) => !args.kind || r.kind === args.kind);
      if (args.scopeId !== undefined) return rows.find((r) => String(r.scopeId || '') === String(args.scopeId || '')) || null;
      return rows;
    }
    case 'state:put':
    case 'state:set':
      return { ok: true, created: false };
    case 'projects:list':
      return table('projects');
    case 'agents:listStatus':
    case 'agents:list':
      return table('agents');
    case 'records:recent':
      return table('records').slice(0, args.limit || 12);
    case 'routines:list':
      return table('routines');
    case 'routines:create':
      return fakeId('routine');
    case 'routines:update':
    case 'routines:remove':
      return { ok: true };
    case 'rooms:createRoom':
      return fakeId('room');
    case 'rooms:getRoom':
      return table('rooms').find((r) => String(r._id) === String(args.roomId)) || null;
    case 'users:saveProfile':
      return { ...fixtureViewer(), ...(args.initials ? { initials: args.initials } : {}), ...(args.color ? { color: args.color } : {}) };
    case 'users:setPrefs':
      return { ...fixtureViewer().preferences, ...(args.patch || {}) };
    case 'files:generateUploadUrl':
      return 'about:blank';
    case 'auth:signIn':
      return { tokens: { token: 'fixture-token', refreshToken: 'fixture-refresh' } };
    case 'auth:signOut':
    case 'auth:changePassword':
      return { ok: true };
    default: {
      if (kind === 'query') return table(String(path).split(':')[0]);
      return { ok: true, fixture: true };
    }
  }
}

export function fixtureSummary() {
  return Object.fromEntries(Object.entries(fixtures).map(([t, rows]) => [t, rows.length]));
}

// True when an explicit ?demo=<fixture> browser-test surface is mounted. Demo fixtures
// route their network through Playwright intercepts, so data hooks may keep fetching and
// sends stay exercisable there; a real signed-out page must stay read-only instead.
export function demoFixtureActive() {
  try { return !!new URLSearchParams(window.location.search).get('demo'); }
  catch { return false; }
}
