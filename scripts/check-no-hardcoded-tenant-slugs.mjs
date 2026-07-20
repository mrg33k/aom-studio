import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src', 'api']
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx'])
const PROHIBITED = ['aom', 'ben', 'arsenal']

const ALLOWLIST = new Set([
  'api/_lib/tenantContext.js',
  'api/_lib/mailNoise.js',
  'api/_lib/uploadsIdentity.js',
  'api/support/admin-auth.js',
  'api/support/inbox.js',
  'api/support/thread.js',
  'api/support/wishes.js',
  'api/dashboard/project-file.js',
  'api/dashboard/reset-agent.js',
  'api/dashboard/mission-folders.js',
  'api/dashboard/poke-agent.js',
  'api/dashboard/project-summary.js',
  'api/dashboard/voice-session.js',
  'api/dashboard/admin-tickets.js',
  'api/dashboard/agent-customize.js',
  'api/dashboard/active-agents.js',
  'api/dashboard/create-project-from-chat.js',
  'api/dashboard/project-files.js',
  'api/dashboard/review-queue.js',
  // Intentional AOM operator boundary: this endpoint controls the single local
  // support watcher, not a tenant-selectable dashboard resource. The UI is
  // likewise gated to the AOM world and the endpoint still verifies AOM auth.
  'api/dashboard/support-autoreply.js',
  'api/dashboard/set-supabase-client-context.js',
  'api/dashboard/supabase-messages.js',
  'api/dashboard/supabase-status.js',
  'api/dashboard/v2-task-list.js',
  'api/integrations/list.js',
  'api/deal-bank/add.js',
  'api/relay-sms.js',
  'src/dashboard/lib/clientConfig.js',
  'src/dashboard/lib/fixtureClient.js',
  'src/dashboard/components/cv3/session/StorageQuotaMeter.jsx',
  'src/dashboard/cv4/HomeView.jsx',
  'src/dashboard/cv6next/OnboardingDesktop.jsx',
  'src/dashboard/cv6next/OnboardingMobile.jsx',
  'src/dashboard/cv6next/SettingsMobile.jsx',
  'src/dashboard/cv6kit/CommandLive.jsx',
  'src/dashboard/cv6kit/OrganizeLive.jsx',
  'src/dashboard/cv6kit/ReviewLive.jsx',
  'src/dashboard/cv6kit/SettingsLive.jsx',
  'src/dashboard/cv6kit/SupportLive.jsx',
  'src/dashboard/cv6kit/TrackerLive.jsx',
  'src/utils/analyze-municipalities.js',
])

const tenantPattern = new RegExp(
  [
    String.raw`verifyTenant\(\s*['"](?:${PROHIBITED.join('|')})['"]`,
    String.raw`\b(?:client_id|world_id|tenant_id|client|world|tenant)\s*[:=]\s*['"](?:${PROHIBITED.join('|')})['"]`,
    String.raw`\b(?:client_id|world_id|tenant_id|client|world|tenant)=eq\.(?:${PROHIBITED.join('|')})\b`,
    String.raw`payload->>(?:client_id|world_id|tenant_id)=eq\.(?:${PROHIBITED.join('|')})\b`,
  ].join('|'),
  'i',
)

const uppercaseTenantConstantPattern = new RegExp(
  String.raw`\b[A-Z0-9_]*(?:CLIENT|TENANT|WORLD)[A-Z0-9_]*\s*=\s*['"](?:${PROHIBITED.join('|')})['"]`,
)

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full)
  }
  return files
}

const failures = []
for (const scanDir of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, scanDir))) {
    const rel = path.relative(ROOT, file)
    if (ALLOWLIST.has(rel)) continue
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, idx) => {
      if (tenantPattern.test(line) || uppercaseTenantConstantPattern.test(line)) {
        failures.push(`${rel}:${idx + 1}: ${line.trim()}`)
      }
    })
  }
}

if (failures.length) {
  console.error('Hardcoded tenant slug guard failed:')
  for (const line of failures) console.error(line)
  process.exit(1)
}

console.log('hardcoded tenant slug guard ok')
