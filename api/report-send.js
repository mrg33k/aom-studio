// Manual sends from the /reports editor. Requires a signed-in Supabase session
// (same auth the dashboard APIs use) — the editor calls this via authFetch.
//
// POST { client, mode }
//   mode "test" — email the draft preview to hello@aom-inhouse.com only.
//   mode "now"  — publish this week and email the client, same as the Friday cron.

import { authenticateWorldRequest, WorldAuthError } from './_lib/worldAuth.js';
import { convexQuery, convexMutation, REPORT_CLIENTS } from './_lib/reportsStore.js';
import { sendReportEmail } from './_lib/reportMailer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    await authenticateWorldRequest(req);
  } catch (error) {
    const status = error instanceof WorldAuthError ? error.status : 401;
    return res.status(status).json({ error: String(error?.message || error) });
  }

  const { client, mode } = req.body || {};
  if (!REPORT_CLIENTS.includes(client)) return res.status(400).json({ error: 'Unknown client' });
  if (!['test', 'now'].includes(mode)) return res.status(400).json({ error: 'mode must be "test" or "now"' });

  try {
    const draft = await convexQuery('reports:get', { client });
    if (!draft) return res.status(404).json({ error: 'No draft' });

    if (mode === 'test') {
      const sent = await sendReportEmail(draft, { test: true });
      return res.status(200).json({ ok: true, mode, to: sent.to });
    }

    if (!draft.recipients || draft.recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients set for this client' });
    }
    await convexMutation('reports:publishAndRoll', { client });
    const sent = await sendReportEmail(draft);
    return res.status(200).json({ ok: true, mode, week: draft.weekNumber, to: sent.to });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
}
