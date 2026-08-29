// Public weekly report pages: /wolfpack, /ambition, /kohrs, /ella (+ week
// archives) are rewritten here (vercel.json). Renders the latest published week
// from Convex in the exact old static-template look. ?preview=1 renders the live
// draft instead — used by the /reports editor, never linked publicly.

import { convexQuery, REPORT_CLIENTS } from './_lib/reportsStore.js';
import { renderReportHtml, renderPlaceholderHtml } from './_lib/reportTemplate.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('GET only');
  const client = String(req.query.client || '').toLowerCase();
  if (!REPORT_CLIENTS.includes(client)) return res.status(404).send('Unknown client');

  try {
    const preview = req.query.preview === '1';
    const weekParam = req.query.week ? parseInt(String(req.query.week), 10) : null;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (preview) {
      const draft = await convexQuery('reports:get', { client });
      if (!draft) return res.status(404).send('No draft');
      res.setHeader('Cache-Control', 'private, no-store');
      return res
        .status(200)
        .send(renderReportHtml(draft, { latestWeekNumber: draft.weekNumber, preview: true }));
    }

    const latest = await convexQuery('reports:latest', { client });

    if (weekParam) {
      const week = await convexQuery('reports:getWeek', { client, weekNumber: weekParam });
      if (!week) return res.status(404).send('No such week');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res
        .status(200)
        .send(renderReportHtml(week, { latestWeekNumber: latest ? latest.weekNumber : weekParam }));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    if (!latest) {
      const draft = await convexQuery('reports:get', { client });
      return res
        .status(200)
        .send(renderPlaceholderHtml(draft ? draft.clientName : client));
    }
    return res
      .status(200)
      .send(renderReportHtml(latest, { latestWeekNumber: latest.weekNumber }));
  } catch (error) {
    return res.status(500).send(`Report temporarily unavailable: ${String(error?.message || error)}`);
  }
}
