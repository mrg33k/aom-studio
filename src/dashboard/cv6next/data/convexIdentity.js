// The Convex HTTP surface is public, but its rows still need the signed-in
// person's identity. Supabase owns the dashboard session; Convex owns the chat
// data. This is the one bridge between them so rail reads, read receipts, and
// sends all name the same person.

import { supabase } from '../../lib/supabase.js';

function clean(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

export async function convexViewerIdentity() {
  if (!supabase?.auth?.getSession) return {};
  try {
    const result = await supabase.auth.getSession();
    const user = result?.data?.session?.user;
    if (!user) return {};
    const meta = user.user_metadata || {};
    return {
      userId: clean(user.id),
      userEmail: clean(user.email),
      userName: clean(meta.full_name || meta.display_name || meta.name || meta.user_name),
    };
  } catch {
    return {};
  }
}

// The backend can resolve either a Convex document id or an email. The browser
// session id is a Supabase UUID, so email is the reliable cross-plane key.
export function convexReadIdentity(viewer) {
  return clean(viewer?.userEmail) || clean(viewer?.userId) || '';
}
