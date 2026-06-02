// POST /api/ai-hours/admin-auth
//
// Validates AI Hours facilitator credentials WITHOUT touching Supabase auth state.
// This is the core isolation fix — no supabase.auth.signIn/signOut calls here.
// Credentials are verified server-side; the client stores only a lightweight
// {email} token in 'ai-hours-admin-session' localStorage (separate from Corner session).
//
// Body: { email, password }
// Returns: { ok: true, email } | { ok: false, error }

const ADMIN_PASSWORD = process.env.AI_HOURS_ADMIN_PASSWORD || 'aom-ai-hours-admin';

const ADMIN_ALLOWLIST = [
  'patrikmatheson@gmail.com',
  'courtney@corner.aheadofmarket.com',
];

function isAOMTeamMember(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith('@aom-inhouse.com') || ADMIN_ALLOWLIST.includes(normalized);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check email is on the team allowlist
  if (!isAOMTeamMember(normalizedEmail)) {
    // Use a non-specific error to avoid leaking valid emails
    return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
  }

  // Check the shared team password
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
  }

  return res.status(200).json({ ok: true, email: normalizedEmail });
}
