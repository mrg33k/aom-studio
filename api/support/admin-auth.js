// POST /api/support/admin-auth — AOM team door for the support board.
// Validates AOM team credentials WITHOUT touching Supabase auth state (the AI Hours
// isolation pattern). Client stores only {email} in 'support-admin-session' localStorage,
// separate from Corner session and from the AI Hours session.
//
// Body: { email, password }  → { ok: true, email } | { ok: false, error }

const ADMIN_PASSWORD = process.env.SUPPORT_ADMIN_PASSWORD || 'aom-support-admin';

const ADMIN_ALLOWLIST = [
  'patrikmatheson@gmail.com',
];

function isAOMTeamMember(email) {
  if (!email) return false;
  const n = email.trim().toLowerCase();
  return n.endsWith('@aom-inhouse.com') || ADMIN_ALLOWLIST.includes(n);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password required.' });
  }
  const n = email.trim().toLowerCase();
  // Non-specific error to avoid leaking valid emails.
  if (!isAOMTeamMember(n) || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
  }
  return res.status(200).json({ ok: true, email: n });
}
