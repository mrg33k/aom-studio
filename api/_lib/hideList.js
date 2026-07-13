// THE Files hide-list — JS twin of AOM-EA/scripts/lib/files_hide_list.py.
// corner:one-corner M7 (Files completeness — the trust contract).
//
// Patrik's law (2026-07-13): "I don't want to look here and not see files I know
// should be there." Files must never lie by omission. This list hides ONLY system
// junk — dotfiles, VCS internals, dependency/build/caches, tmp/lock files — and
// NOTHING content-shaped. Canon docs (VISION/BUILD/PHONEBOOK/manifest.yaml),
// tapes, screenshots, deliverables, assets, archives: all SHOW. When in doubt,
// include.
//
// Keep the VALUES in lockstep with the Python module — Vercel functions can't
// import Python, so this file mirrors it exactly. Consumers:
//   - api/dashboard/project-files.js  (walk gate for the chat Files drawer)
// Python consumers of the twin: file-mirror-watcher.py, rag-server.py (_r79f15),
// mirror-files-to-storage.py.

export const HIDDEN_DIR_NAMES = new Set([
  '.git', 'node_modules', 'dist', 'build', '.next', '.vercel', '.turbo',
  '__pycache__', '.pytest_cache', '.venv', 'venv', '.cache', 'coverage',
  '.mypy_cache', '.ruff_cache', '.idea', '.vscode',
]);

export const HIDDEN_FILE_EXACT = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Thumbs.db',
]);

// NOTE: .log is NOT here — logs are content someone may need to read.
export const HIDDEN_FILE_SUFFIXES = [
  '.pyc', '.pyo', '.swp', '.swo', '.map', '.lock', '-lock.json', '.log.lock',
];

// Atomic-write temp files (`CONTEXT.md.tmp.<pid>`): `.tmp` at end or mid-name.
const TMP_MIDDLE_RE = /\.tmp(\.|$)/i;

export function isHiddenDir(name) {
  if (!name) return true;
  return HIDDEN_DIR_NAMES.has(name) || name.startsWith('.');
}

export function isHiddenFile(name) {
  if (!name) return true;
  if (name.startsWith('.')) return true;
  if (HIDDEN_FILE_EXACT.has(name)) return true;
  if (HIDDEN_FILE_SUFFIXES.some((s) => name.endsWith(s))) return true;
  if (TMP_MIDDLE_RE.test(name)) return true;
  return false;
}
