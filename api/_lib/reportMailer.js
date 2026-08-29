// Weekly report email via Resend. Same domain constraint as api/guide-email.js:
// only sourcing.directory is verified, so we send from there with reply-to
// aheadofmarket.com until the aheadofmarket.com domain is verified in Resend.
// hello@aom-inhouse.com is BCC'd on every send so Patrik always has a copy.

import { Resend } from 'resend';
import { escapeHtml } from './reportTemplate.js';

const FROM = process.env.REPORTS_EMAIL_FROM || 'Ahead of Market <hello@sourcing.directory>';
const REPLY_TO = process.env.REPORTS_EMAIL_REPLY_TO || 'hello@aheadofmarket.com';
const BCC = process.env.REPORTS_EMAIL_BCC || 'hello@aom-inhouse.com';
const SITE = 'https://aheadofmarket.com';

export function reportEmailSubject(draft) {
  if (draft.emailSubject && draft.emailSubject.trim()) return draft.emailSubject.trim();
  return `${draft.clientName} × Ahead of Market — Week ${draft.weekNumber} update`;
}

export function reportEmailHtml(draft, { url }) {
  const intro =
    draft.emailIntro && draft.emailIntro.trim()
      ? draft.emailIntro.trim()
      : `Here's your Week ${draft.weekNumber} update — what shipped, what's in motion, and what we need from you.`;
  const done = (draft.tasks || []).filter((t) => t.status === 'done').length;
  const summary =
    done > 0
      ? `<p style="margin:0 0 20px;font-size:13px;color:#6E685B">${done} task${done === 1 ? '' : 's'} shipped this week &middot; full breakdown in the report.</p>`
      : '';
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F5F2EA;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EA;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border:1.5px solid #CFC8B8">
        <tr><td style="padding:28px 32px 20px;border-bottom:1.5px solid #CFC8B8">
          <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;color:#6E685B;margin-bottom:8px">Weekly Update</div>
          <div style="font-size:19px;font-weight:700;color:#151209">${escapeHtml(draft.headerLine)}</div>
          <div style="font-size:12px;color:#6E685B;margin-top:4px">Week ${Number(draft.weekNumber) || 1} &middot; ${escapeHtml(draft.dateLabel)}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 28px">
          <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#45413A">${escapeHtml(intro)}</p>
          ${summary}
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#B58A38;color:#FFFFFF;text-decoration:none;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;padding:12px 22px">View this week&rsquo;s report &rarr;</a>
          <p style="margin:20px 0 0;font-size:12px;color:#6E685B">Or open: <a href="${escapeHtml(url)}" style="color:#B58A38">${escapeHtml(url)}</a></p>
        </td></tr>
        <tr><td style="padding:14px 32px;border-top:1.5px solid #CFC8B8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#6E685B">
          Ahead of Market
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Sends the weekly report email. `test: true` sends only to the BCC address
// with a [TEST] subject and links the draft preview instead of the public page.
export async function sendReportEmail(draft, { test = false } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  const resend = new Resend(apiKey);

  const url = test
    ? `${SITE}/api/report-page?client=${draft.client}&preview=1`
    : `${SITE}/${draft.client}`;
  const to = test ? [BCC] : draft.recipients;
  if (!to || to.length === 0) throw new Error('No recipients');

  const payload = {
    from: FROM,
    to,
    reply_to: REPLY_TO,
    subject: (test ? '[TEST] ' : '') + reportEmailSubject(draft),
    html: reportEmailHtml(draft, { url }),
  };
  if (!test) payload.bcc = [BCC];

  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
  return { id: data?.id || null, to };
}
