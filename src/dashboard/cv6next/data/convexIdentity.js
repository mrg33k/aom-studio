// Who is sending / reading. The Convex session (users:viewer) owns the identity
// now; this is the one place the chat code turns it into the send / read args so
// rail reads, read receipts and sends all name the same person.

import { getViewer, hasSession } from '../../lib/convex.js';

function clean(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

export async function convexViewerIdentity() {
  if (!hasSession()) return {};
  try {
    const viewer = await getViewer();
    if (!viewer) return {};
    return {
      userId: clean(viewer.userId != null ? String(viewer.userId) : ''),
      userEmail: clean(viewer.email),
      userName: clean(viewer.name),
    };
  } catch {
    return {};
  }
}

// The backend resolves either a Convex document id or an email. Email stays the
// reliable cross-surface key (the phone may hold a device id instead of a user id).
export function convexReadIdentity(viewer) {
  return clean(viewer?.userEmail) || clean(viewer?.userId) || '';
}
