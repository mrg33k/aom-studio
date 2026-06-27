// GET /api/local/file?path=context/task-status.jsonl
// Local development endpoint: read files from AOM-EA repo
// Used by useDataPipe to fetch agent-notifications.md, punch-list.md, active-missions.md, task-status.jsonl
// Also used by FilesTab docs panel to render .md agent files.

import fs from 'fs';
import path from 'path';

// Resolve AOM-EA root: prefer env var, then hardcoded dev path, then sibling-dir fallback.
const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const BASE_PATH = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-cache');

  const { path: filePath } = req.query;

  // Prevent path traversal attacks
  if (!filePath || typeof filePath !== 'string' || filePath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
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
