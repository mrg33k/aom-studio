// GET /api/local/file?path=context/task-status.jsonl
// Local development endpoint: read files from AOM-EA repo
// Used by useDataPipe to fetch agent-notifications.md, punch-list.md, active-missions.md, task-status.jsonl
// Also used by FilesTab docs panel to render .md agent files.
//
// AUTH + SCOPE (r7:open-agent-surface, 2026-07-27). This was the widest read in
// the open surface: unauthenticated, `Access-Control-Allow-Origin: *`, and it
// hands back ANY file under the AOM-EA repo root as text. The traversal guard
// was real but answers a different question — it stops you leaving the repo, it
// never stopped you reading everything INSIDE it. The repo root holds `.env`
// (the Supabase service-role key, the GitHub token, provider API keys),
// `corner/state/**` (live agent state, mailbox and support JSON), and every
// world's CONTEXT/VISION/BUILD canon. `?path=.env` was a complete credential
// dump to an anonymous GET.
//
// TWO changes, because either alone is insufficient:
//   1. A verified session is now required. There is no tenant to check against
//      — these are AOM-internal operator documents, not per-world resources —
//      so the gate is "prove you are a signed-in Corner user", callerIdentity.
//   2. An explicit READABLE ALLOWLIST. Authentication alone would still let any
//      signed-in member of ANY world read `.env`, and a credential file is not
//      something a gate should be the only thing standing in front of. Only the
//      operator documents this endpoint was built to serve are reachable; a
//      dotfile, anything under corner/state, and anything not matching the
//      allowlist are refused whoever asks.

import fs from 'fs';
import path from 'path';
import { callerIdentity } from '../_lib/verifyTenant.js';
import { applyCors } from '../_lib/originAllowlist.js';

// Resolve AOM-EA root: prefer env var, then hardcoded dev path, then sibling-dir fallback.
const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const BASE_PATH = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

// Exactly what the known callers ask for: the operator markdown at the repo
// root, the context/ pipeline files, and agent .md files. Extend deliberately.
const READABLE_PATTERNS = [
  /^[a-z0-9._-]+\.md$/i,                       // punch-list.md, active-missions.md, COWORK.md
  /^context\/[a-z0-9._/-]+\.(md|jsonl|json)$/i, // task-status.jsonl, agent-notifications.md
  /^corner\/users\/[a-z0-9-]+\/[a-z0-9._/-]+\.md$/i,
  /^corner\/missions\/[a-z0-9._/-]+\.md$/i,
];

function isReadable(rel) {
  if (!rel || rel.includes('..')) return false;
  if (rel.startsWith('/')) return false;
  // No dotfiles / dotdirs anywhere in the path — this is what keeps `.env`,
  // `.git/config` and `.claude/**` out regardless of the patterns above.
  if (rel.split('/').some((seg) => seg.startsWith('.'))) return false;
  return READABLE_PATTERNS.some((re) => re.test(rel));
}

export default async function handler(req, res) {
  applyCors(req, res, 'GET');
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { path: filePath } = req.query;

  // Prevent path traversal attacks
  if (!filePath || typeof filePath !== 'string' || filePath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const who = await callerIdentity(req);
  if (!who) return res.status(401).json({ error: 'sign in required' });

  if (!isReadable(filePath)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const fullPath = path.join(BASE_PATH, filePath);

    // Ensure the requested file is within BASE_PATH
    if (!fullPath.startsWith(BASE_PATH)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found', path: filePath });
    }

    // Read file
    const content = fs.readFileSync(fullPath, 'utf-8');

    return res.status(200).json({
      path: filePath,
      content,
      lastModified: new Date(fs.statSync(fullPath).mtime).toISOString(),
    });
  } catch (error) {
    console.error(`[/api/local/file] Error reading ${filePath}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
