#!/usr/bin/env bash
# run-worker.sh — start one headless Muse Spark 1.3 worker for corner:corner-v2.
#
# Usage: run-worker.sh <brief-name> [reasoning-effort] [max-steps] [--safe]
#   brief-name : file stem under briefs/, e.g. R1-backend-reconcile -> briefs/R1-backend-reconcile.md
#                log goes to rounds/logs/<brief-name>.log
#   effort     : none|minimal|low|medium|high|xhigh|max|ultra (default xhigh)
#   max-steps  : model step cap (default 900)
#   --safe     : read-only reviewer mode (OS sandbox stays on). Use for review briefs.
#
# Same recipe as corner-smooth-loop/run-worker.sh (proven on this machine). The worker runs
# unattended; scope is held by the brief (no push, no deploy to live, no deletes, scoped git add),
# and the orchestrator verifies every claim before anything is pushed.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
AOMEA="$(cd "$HERE/../../../.." && pwd)"
NAME="${1:?brief name}"; EFFORT="${2:-xhigh}"; STEPS="${3:-900}"
SANDBOX_FLAG="--disable-sandbox"
[[ "${4:-}" == "--safe" ]] && SANDBOX_FLAG=""
BRIEF="$HERE/briefs/$NAME.md"; LOG="$HERE/rounds/logs/$NAME.log"
[[ -f "$BRIEF" ]] || { echo "no brief: $BRIEF" >&2; exit 2; }
mkdir -p "$HERE/rounds/logs"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH:$HOME/.local/bin"
export CORNER_AGENT=muse AOM_TAB="corner-v2-$NAME"
TRANSFER="$(cd "$AOMEA/.." && pwd)"
cd "$TRANSFER" || exit 2
START_TS="$(date +%s)"
echo "start $(date '+%Y-%m-%d %H:%M:%S') effort=$EFFORT steps=$STEPS" > "$LOG"
"$HOME/.local/bin/muse" exec \
  --prompt-file "$BRIEF" \
  --workspace "$TRANSFER" \
  --reasoning-effort "$EFFORT" \
  --max-model-steps "$STEPS" \
  --disable-approval \
  --user-input-auto-resolve \
  --trust-workspace \
  $SANDBOX_FLAG \
  >> "$LOG" 2>&1
rc=$?
echo "exit=$rc at $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
# corner:gateway G1 — one ledger item per round, from the report's first
# verdict line (or an honest failure item). Never fails the script.
python3 "$AOMEA/scripts/gateway/round-append.py" \
  --mission corner-v2 --rounds-dir "$HERE/rounds" --brief "$NAME" \
  --rc "$rc" --log "$LOG" --since "$START_TS" >/dev/null 2>&1 || true
tail -5 "$LOG"
exit $rc
