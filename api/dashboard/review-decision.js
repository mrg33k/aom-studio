// POST /api/dashboard/review-decision
//
// Handles review workflow decisions: approve, request-changes, send-checklist.
// Each decision creates a structured message in the deliverable's room via Supabase,
// notifying the agent and the room that the deliverable has moved in the review flow.
//
// Actions:
//   - approve: mark deliverable as approved, emit notification to room
//   - request-changes: mark as needs-changes + notes, notify room
//   - send-checklist: send compiled checklist to deliverable's room for agent
//
// Persistence is Supabase messages table only (decisions are events, not state).

import { createClient } from '@supabase/supabase-js';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, world, deliverable, notes, checklist } = req.body || {};

  try {
    await verifyTenant((world || 'aom').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const did = clean(deliverable, 400);
  if (!did) return res.status(400).json({ error: 'deliverable required' });

  const act = String(action || '').toLowerCase().trim();
  if (!['approve', 'request-changes', 'send-checklist'].includes(act)) {
    return res.status(400).json({ error: 'action must be approve, request-changes, or send-checklist' });
  }

  // Initialize Supabase
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Construct the message to emit to the deliverable's room.
  // The message type tells the room what happened; the content carries the detail.
  let message = '';
  let messageType = 'review_decision';

  if (act === 'approve') {
    messageType = 'review_approved';
    message = `Deliverable approved: ${did}`;
  } else if (act === 'request-changes') {
    const notesText = clean(notes, 1000);
    messageType = 'review_request_changes';
    message = notesText ? `Changes requested: ${notesText}` : `Changes requested for: ${did}`;
  } else if (act === 'send-checklist') {
    const checklistText = clean(checklist, 2000);
    messageType = 'review_checklist_sent';
    message = checklistText || `Checklist sent for: ${did}`;
  }

  try {
    // Emit the decision as a message to the dashboard so it appears in chat/notifications.
    // Use a structured format so the dashboard can route and present it properly.
    const { error } = await supabase.from('messages').insert({
      type: messageType,
      content: message,
      metadata: {
        deliverable_id: did,
        action: act,
        notes: act === 'request-changes' ? clean(notes, 1000) : null,
        checklist: act === 'send-checklist' ? clean(checklist, 2000) : null,
        decided_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[review-decision] Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to record decision' });
    }

    return res.status(200).json({
      ok: true,
      action: act,
      deliverable: did,
      message,
    });
  } catch (e) {
    console.error('[review-decision] Exception:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
