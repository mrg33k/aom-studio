#!/usr/bin/env bash
# scripts/check-deploy-staleness.sh
#
# Alerts when origin/main is ahead of aheadofmarket.com's production deployment.
# Run locally or via CI. Exit 0 = in sync, exit 1 = stale (with alert).
#
# Usage:
#   ./scripts/check-deploy-staleness.sh
#   ./scripts/check-deploy-staleness.sh --max-hours 4   (default: 2 hours)
#
# How it works:
#   1. Gets the latest READY production deployment timestamp for `aom-studio`
#   2. Gets the latest commit on origin/main timestamp from git
#   3. Alerts if the commit is newer than the deployment by more than MAX_HOURS
#
# Added 2026-08-06 (corner:integrations): after discovering 7-day silent staleness
# where every push to main silently skipped production for a week.

set -euo pipefail

MAX_HOURS=2
if [[ "${1:-}" == "--max-hours" ]]; then
  MAX_HOURS=${2:-2}
elif [[ -n "${1:-}" ]]; then
  MAX_HOURS=$1
fi

echo "=== Deployment Staleness Check ==="
echo "Project: aom-studio → aheadofmarket.com/dashboard"
echo "Max allowed lag: ${MAX_HOURS} hours"
echo ""

# Ask for machine-readable data from the production project explicitly. Do not rely
# on the checkout's linked project or parse Vercel's human table (which is written to
# stderr and was the reason the old check silently found no deployment).
VERCEL_DEPLOY_JSON=$(vercel ls aom-studio \
  --environment production \
  --format json \
  --status READY \
  --scope aheads-projects-d2a4c70f \
  2>/dev/null || true)
DEPLOY_CREATED_MS=$(printf '%s\n' "$VERCEL_DEPLOY_JSON" | sed -n 's/.*"createdAt": \([0-9][0-9]*\).*/\1/p' | head -1)
DEPLOY_URL=$(printf '%s\n' "$VERCEL_DEPLOY_JSON" | sed -n 's/.*"url": "\([^"]*\)".*/\1/p' | head -1)

if [[ -z "$DEPLOY_CREATED_MS" || -z "$DEPLOY_URL" ]]; then
  echo "⚠️  Could not read Vercel production deployment list."
  echo "   Check: vercel ls aom-studio --environment production --format json --scope aheads-projects-d2a4c70f"
  exit 1
fi

echo "Latest production deployment: https://${DEPLOY_URL}"

# Get latest commit on origin/main
MAIN_COMMIT=$(git log --oneline -1 origin/main 2>/dev/null || git log --oneline -1 HEAD)
MAIN_COMMIT_TIME=$(git log -1 --format="%ct" origin/main 2>/dev/null || git log -1 --format="%ct" HEAD)
DEPLOY_CREATED_SECONDS=$(( DEPLOY_CREATED_MS / 1000 ))
CHECKED_AT_SECONDS=$(date +%s)
COMMIT_AGE_HOURS=$(( (CHECKED_AT_SECONDS - MAIN_COMMIT_TIME) / 3600 ))
DEPLOY_AGE_HOURS=$(( (CHECKED_AT_SECONDS - DEPLOY_CREATED_SECONDS) / 3600 ))

echo "Latest origin/main commit: $MAIN_COMMIT"
echo "Commit age: ~${COMMIT_AGE_HOURS}h ago"
echo ""

echo "Production deployment age: ~${DEPLOY_AGE_HOURS}h"

# Alert when origin/main is newer than the latest production deployment beyond the
# allowed grace period. Negative lag means production is newer than the commit.
LAG_SECONDS=$(( MAIN_COMMIT_TIME - DEPLOY_CREATED_SECONDS ))
LAG_HOURS=$(( LAG_SECONDS / 3600 ))
MAX_LAG_SECONDS=$(( MAX_HOURS * 3600 ))

if (( LAG_SECONDS > MAX_LAG_SECONDS )); then
  echo ""
  echo "🚨 STALE DEPLOYMENT DETECTED"
  echo "   Production is ~${LAG_HOURS}h behind origin/main."
  echo "   This means pushes are NOT reaching production automatically."
  echo ""
  echo "   To fix: check GitHub Actions at https://github.com/mrg33k/aom-studio/actions"
  echo "   Or deploy a clean commit explicitly to Vercel project aom-studio."
  exit 1
else
  echo ""
  echo "✅ Production appears current. No staleness detected."
  exit 0
fi
