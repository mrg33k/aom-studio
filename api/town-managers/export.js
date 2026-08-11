import { requireSuperAdmin, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function escapeCsvValue(value) {
  const normalizedValue = value == null ? '' : String(value);
  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function buildCsvRow(values) {
  return values.map(escapeCsvValue).join(',');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // CSV export of member PII (name, email, phone) for arsenal town managers.
  // Was a fully unauthenticated service-key export — super-admin only now.
  try {
    await requireSuperAdmin(req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: townManagers, error } = await supabase
      .from('members')
      .select('display_name, email, metadata')
      .or('role.eq.town_manager,role.eq.town manager,metadata->>role.eq.town_manager,metadata->>role.eq.town manager');

    if (error) {
      console.error('Error fetching town managers:', error);
      return res.status(500).json({ error: 'Failed to fetch town managers' });
    }

    const csvLines = [
      buildCsvRow(['Name', 'Email', 'Phone Number']),
      ...(townManagers || []).map((manager) => {
        const metadata = manager?.metadata && typeof manager.metadata === 'object' ? manager.metadata : {};
        const phoneNumber = metadata.phone_number || metadata.phone || metadata.phoneNumber || '';
        return buildCsvRow([
          manager?.display_name || '',
          manager?.email || '',
          phoneNumber,
        ]);
      }),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="arsenal_town_managers.csv"');

    return res.status(200).send(csvLines.join('\n'));
  } catch (error) {
    console.error('Error in GET /api/town-managers/export:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
