// AOM AI Guide — email capture + prompt delivery
// Part of corner:digital-products R3.
//
// Accepts POST { email, category, prompts: [{label, prompt}] }
//   1. Validates the email
//   2. Stores the lead in Supabase `guide_leads` (skipped silently if table missing)
//   3. Emails the prompts to the user via Resend
//
// Required env:
//   RESEND_API_KEY            — Resend API key
//   SUPABASE_URL              — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { email, category, prompts } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const safeCategory = (category && typeof category === 'string') ? category : 'unknown';

  // Store lead in Supabase — fire-and-forget; missing table doesn't block send.
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { error } = await supabase.from('guide_leads').insert({
        email: cleanEmail,
        category: safeCategory,
      });
      if (error) console.warn('Lead store warning:', error.message);
    }
  } catch (e) {
    console.warn('Lead store failed (table may not exist yet):', e.message);
  }

  const promptList = Array.isArray(prompts) ? prompts : [];
  const promptsHtml = promptList.map((p) => `
    <div style="margin-bottom:24px; padding:20px; background:#f9f9f9; border-radius:10px; border:1px solid #eee;">
      <div style="font-weight:700; font-size:15px; color:#0C0C0C; margin-bottom:8px;">${escapeHtml(p.label)}</div>
      <div style="font-size:14px; color:#444; line-height:1.6; white-space:pre-wrap;">${escapeHtml(p.prompt)}</div>
    </div>
  `).join('');

  const categoryLabel = safeCategory.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background:#fff; margin:0; padding:0;">
  <div style="max-width:600px; margin:0 auto; padding:40px 24px;">
    <div style="margin-bottom:32px;">
      <span style="display:inline-block; background:#E85D26; color:#fff; font-size:11px; font-weight:700; letter-spacing:0.1em; padding:4px 10px; border-radius:100px;">AHEAD OF MARKET</span>
    </div>
    <h1 style="font-size:26px; font-weight:700; color:#0C0C0C; margin:0 0 8px;">Your AI prompts for ${escapeHtml(categoryLabel)}</h1>
    <p style="font-size:15px; color:#666; margin:0 0 32px; line-height:1.6;">Here are the prompts you generated — ready to paste directly into ChatGPT or Claude.</p>
    ${promptsHtml}
    <div style="margin-top:40px; padding:24px; background:#fff7f4; border-radius:12px; border:1px solid #fde4d6; text-align:center;">
      <div style="font-size:15px; font-weight:600; color:#0C0C0C; margin-bottom:8px;">Want AI working across your whole business?</div>
      <div style="font-size:14px; color:#666; margin-bottom:16px;">The AI Flow is a full audit of your operation — we find every place AI can save you time or money.</div>
      <a href="https://aheadofmarket.com/book" style="display:inline-block; background:#E85D26; color:#fff; font-size:14px; font-weight:700; padding:12px 24px; border-radius:10px; text-decoration:none;">Book an AI Flow →</a>
    </div>
    <div style="margin-top:32px; font-size:12px; color:#999; text-align:center;">
      You're receiving this because you used the free AI Business Guide at <a href="https://aheadofmarket.com/ai-guide" style="color:#E85D26;">aheadofmarket.com</a>.
    </div>
  </div>
</body>
</html>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'AOM <hello@aheadofmarket.com>',
      to: cleanEmail,
      subject: `Your AI prompts for ${categoryLabel}`,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
