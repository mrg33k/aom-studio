// cv6next: the Convex data plane's front door, now promoted to
// src/dashboard/lib/convex.js for every surface. This file re-exports it so the
// chat files keep their import path. Convex is the only plane; the old
// ?classic=1 / localStorage switch is gone.
//
// Quota discipline (Convex bills on Database I/O): callers never poll
// rooms:listRooms (fetch on load + after a send only) and subscribe to a thread
// only for the open room. Enforced at the call sites in convexRooms.js /
// useRoomThread.js.

export {
  CONVEX_URL,
  convexPlaneActive,
  convexWorldId,
  convexWorldDocId,
  convexQuery,
  convexMutation,
  convexAction,
  subscribeConvexQuery,
  useConvexLive,
  getConvexReactClient,
} from '../../lib/convex.js';
