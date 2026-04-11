// GET /api/dashboard/git-history?filePath=src/dashboard/BoardView.jsx
// Returns the git commit history for a single file.
// Response: JSON array of { hash, author, date, message }

import { spawnSync } from 'child_process';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const filePath = typeof req.query.filePath === 'string' ? req.query.filePath.trim() : '';

  if (!filePath) {
    return res.status(400).json({ error: 'filePath query parameter is required' });
  }

  // Reject null bytes or path traversal outside the repo root
  if (filePath.includes('\0') || path.isAbsolute(filePath)) {
    return res.status(400).json({ error: 'Invalid filePath' });
  }

  const repoRoot = process.cwd();

  // Use ASCII unit separator (0x1f) to delimit fields, newline to delimit records.
  // --follow tracks file renames across history.
  // %H = full hash, %an = author name, %aI = ISO 8601 author date, %s = subject line
  const FORMAT = '%H\x1f%an\x1f%aI\x1f%s';

  const result = spawnSync(
    'git',
    ['log', '--follow', `--format=${FORMAT}`, '--', filePath],
    { cwd: repoRoot, encoding: 'utf8', timeout: 15000 }
  );

  if (result.error) {
    return res.status(500).json({ error: `git process error: ${result.error.message}` });
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    return res.status(500).json({ error: `git log failed: ${stderr || 'unknown error'}` });
  }

  const stdout = (result.stdout || '').trim();

  if (!stdout) {
    return res.status(404).json({ error: `No git history found for: ${filePath}` });
  }

  const commits = stdout
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('\x1f');
      return {
        hash: parts[0] || '',
        author: parts[1] || '',
        date: parts[2] || '',
        message: parts[3] || '',
      };
    })
    .filter(c => c.hash);

  if (commits.length === 0) {
    return res.status(404).json({ error: `No git history found for: ${filePath}` });
  }

  return res.status(200).json(commits);
}
