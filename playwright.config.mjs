// Confine discovery to this checkout's tests/ so nested worktrees under
// .claude/worktrees/ (each with its own @playwright/test install) never leak
// into a run — two installs in one run throws "did not expect test() here".
export default { testDir: 'tests' }
