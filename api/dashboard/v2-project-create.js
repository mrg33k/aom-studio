// POST /api/dashboard/v2-project-create
// Creates a new project in the Supabase projects table

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function supabaseInsertProject(body) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`Supabase POST failed (${resp.status}): ${errText}`)
  }
  return resp.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { projectName } = req.body || {}

  if (!projectName || typeof projectName !== 'string' || !projectName.trim()) {
    return res.status(400).json({ error: 'projectName required' })
  }

  console.log('[v2-project-create] Creating project:', projectName)

  const slug = slugify(projectName)
  if (!slug) {
    return res.status(400).json({ error: 'projectName produced an empty slug' })
  }

  try {
    const newProject = {
      slug,
      name: projectName.trim(),
      repo_path: projectName.trim(),
      scan_dirs: [],
      hard_rules: '',
      is_active: true,
    }

    const result = await supabaseInsertProject(newProject)
    const created = Array.isArray(result) ? result[0] : result
    return res.status(200).json(created)
  } catch (err) {
    console.error('[v2-project-create] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
