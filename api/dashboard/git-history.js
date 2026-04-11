// GET /api/dashboard/git-history?path=src/dashboard/CornerV3.jsx
// Returns git commit history for a given file path in the repo.
// Each commit includes: hash, author, email, date, message.

import { execFileSync } from 'child_process';
import path from 'path';

const REPO_ROOT = process.cwd();

// Only allow relative paths with safe characters — no shell injection, no traversal.
function isValidPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  // Reject absolute paths and any traversal attempts
  if (path.isAbsolute(filePath)) return false;
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..')) return false;
  // Reject null bytes or shell metacharacters
  if (/[\x00`$;|&<>]/.test(filePath)) return false;
  return true;
}

function parseGitLog(output) {
  if (!output.trim()) return [];

  return output
    .trim()
    .split('\n---COMMIT---\n')
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n');
      const [hash, author, email, date, ...msgParts] = lines;
      return {
        hash: hash || '',
        author: author || '',
        email: email || '',
        date: date || '',
        message: msgParts.join('\n').trim(),
      };
    });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { path: filePath, limit } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter is required' });
  }

  if (!isValidPath(filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const maxCommits = Math.min(parseInt(limit, 10) || 50, 200);

  try {
    // Use execFileSync (no shell spawn) to avoid injection risks.
    // Format: hash, author name, author email, ISO date, then commit message body.
    const output = execFileSync(
      'git',
      [
        'log',
        '--follow',
        `--max-count=${maxCommits}`,
        '--format=%H%n%an%n%ae%n%aI%n%B---COMMIT---',
        '--',
        filePath,
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000 }
    );

    const commits = parseGitLog(output);

    if (commits.length === 0) {
      // Check whether the file actually exists in the repo
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', filePath], {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          timeout: 5000,
        });
        // File exists but has no history (e.g. untracked in git ls-files is different from no commits)
        return res.status(200).json({ commits: [], file: filePath });
      } catch {
        return res.status(404).json({ error: `File not found in repository: ${filePath}` });
      }
    }

    return res.status(200).json({ commits, file: filePath });
  } catch (err) {
    if (err.status === 128 || (err.message && err.message.includes('not a git repository'))) {
      return res.status(500).json({ error: 'Not a git repository' });
    }
    console.error('[git-history] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to retrieve git history' });
  }
}
