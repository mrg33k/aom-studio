// Vercel Cron (Fridays 19:00 UTC = 12:00 Arizona, vercel.json): send every due
// weekly report. Due = autoSend on, has recipients, has content, not sent in the
// last 3 days. Order per client: publish first (snapshot + roll the draft), then
// email the link — the email always points at a live published page.
//
// ?dry=1 lists what would send without publishing or emailing (still requires auth).

import { convexQuery, convexMutation } from '../_lib/reportsStore.js';
import { sendReportEmail } from '../_lib/reportMailer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || req.headers.authorization !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const due = await convexQuery('reports:listDue', {});
    if (req.query.dry === '1') {
      return res.status(200).json({
        ok: true,
        dry: true,
        due: due.map((d) => ({ client: d.client, week: d.weekNumber, recipients: d.recipients })),
      });
    }

    const results = [];
    for (const draft of due) {
      const entry = { client: draft.client, week: draft.weekNumber };
      try {
        await convexMutation('reports:publishAndRoll', { client: draft.client });
        entry.published = true;
        const sent = await sendReportEmail(draft);
        entry.emailed = sent.to;
        entry.emailId = sent.id;
      } catch (error) {
        // A publish without an email (or vice versa) must be visible, not silent.
        entry.error = String(error?.message || error);
      }
      results.push(entry);
    }

    return res.status(200).json({ ok: true, sent: results, at: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
}
