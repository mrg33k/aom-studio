// One-off admin script: set onboarded=true + has_completed_onboarding=true for a user.
// Usage: node scripts/set-user-onboarded.mjs patrikmatheson@gmail.com
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.production or environment.

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.production if present
function loadEnv(file) {
  try {
    const content = readFileSync(resolve(__dirname, '..', file), 'utf8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2]
      }
    }
  } catch {}
}

loadEnv('.env.production')
loadEnv('.env.local')
loadEnv('.env')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/set-user-onboarded.mjs <email>')
  process.exit(1)
}

// 1. Find user by email
const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  }
})

if (!listRes.ok) {
  console.error('Failed to list users:', await listRes.text())
  process.exit(1)
}

const listData = await listRes.json()
const users = listData.users || []
const user = users.find(u => u.email === email)

if (!user) {
  console.error(`No user found with email: ${email}`)
  process.exit(1)
}

console.log(`Found user: ${user.id} (${user.email})`)
console.log('Current user_metadata:', JSON.stringify(user.user_metadata, null, 2))

// 2. Merge onboarding flags into existing metadata
const newMeta = {
  ...user.user_metadata,
  onboarded: true,
  has_completed_onboarding: true,
  temp_password: false, // clear temp_password so password change is not forced
}

const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
  method: 'PUT',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ user_metadata: newMeta }),
})

if (!updateRes.ok) {
  console.error('Failed to update user:', await updateRes.text())
  process.exit(1)
}

const updated = await updateRes.json()
console.log('Updated user_metadata:', JSON.stringify(updated.user_metadata, null, 2))
console.log('Done. User will skip onboarding + password change on next login.')
