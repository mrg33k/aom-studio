#!/usr/bin/env bash
# run-worker.sh — start one headless Muse Spark 1.3 worker for corner:corner-smooth-loop.
#
# Usage: run-worker.sh <brief-name> [reasoning-effort] [max-steps]
#   brief-name : file stem under briefs/, e.g. R0-ios -> briefs/R0-ios.md, log rounds/logs/R0-ios.log
#   effort     : none|minimal|low|medium|high|xhigh|max|ultra (default xhigh)
#   max-steps  : model step cap (default 600)
#
# Flags mirror AOM-EA/scripts/muse-loop.sh, the proven headless recipe for this machine. The worker
# runs unattended, so approval prompts are off; the OS sandbox is off because xcodebuild, simctl and
# the vite dev server need it. Scope is held by the brief (no push, no deploy, no deletes, scoped
# git add), and the orchestrator verifies every claim before anything is pushed.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
NAME="${1:?brief name}"; EFFORT="${2:-xhigh}"; STEPS="${3:-600}"
BRIEF="$HERE/briefs/$NAME.md"; LOG="$HERE/rounds/logs/$NAME.log"
[[ -f "$BRIEF" ]] || { echo "no brief: $BRIEF" >&2; exit 2; }
mkdir -p "$HERE/rounds/logs"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH:$HOME/.local/bin"
export CORNER_AGENT=muse AOM_TAB="smooth-loop-$NAME"
cd /Users/aom-inhouse/aom-studio-transfer || exit 2
echo "start $(date '+%Y-%m-%d %H:%M:%S') effort=$EFFORT steps=$STEPS" > "$LOG"
"$HOME/.local/bin/muse" exec \
  --prompt-file "$BRIEF" \
  --workspace /Users/aom-inhouse/aom-studio-transfer \
  --reasoning-effort "$EFFORT" \
  --max-model-steps "$STEPS" \
  --disable-approval \
  --user-input-auto-resolve \
  --trust-workspace \
  --disable-sandbox \
  >> "$LOG" 2>&1
rc=$?
echo "exit=$rc at $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
tail -5 "$LOG"
exit $rc
