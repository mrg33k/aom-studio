#!/usr/bin/env bash
# scripts/check-deploy-staleness.sh
#
# Alerts when origin/main is ahead of lab.aheadofmarket.com's production deployment.
# Run locally or via CI. Exit 0 = in sync, exit 1 = stale (with alert).
#
# Usage:
#   ./scripts/check-deploy-staleness.sh
#   ./scripts/check-deploy-staleness.sh --max-hours 4   (default: 2 hours)
#
# How it works:
#   1. Gets the latest Production deployment timestamp from `vercel ls --prod`
#   2. Gets the latest commit on origin/main timestamp from git
#   3. Alerts if the commit is newer than the deployment by more than MAX_HOURS
#
# Added 2026-08-06 (corner:integrations): after discovering 7-day silent staleness
# where every push to main silently skipped production for a week.

set -e

MAX_HOURS=${1:-2}
if [[ "$1" == "--max-hours" ]]; then
  MAX_HOURS=${2:-2}
fi

echo "=== Deployment Staleness Check ==="
echo "Project: aom-studio-lab → lab.aheadofmarket.com"
echo "Max allowed lag: ${MAX_HOURS} hours"
echo ""

# Get latest production deployment age in seconds
VERCEL_DEPLOY_INFO=$(vercel ls --prod --scope aheads-projects-d2a4c70f 2>/dev/null | grep "aom-studio-lab" | head -1 || echo "")

if [[ -z "$VERCEL_DEPLOY_INFO" ]]; then
  echo "⚠️  Could not read Vercel production deployment list."
  echo "   Check: vercel ls --prod --scope aheads-projects-d2a4c70f"
  exit 1
fi

echo "Latest production entry: $VERCEL_DEPLOY_INFO"

# Get latest commit on origin/main
MAIN_COMMIT=$(git log --oneline -1 origin/main 2>/dev/null || git log --oneline -1 HEAD)
MAIN_COMMIT_TIME=$(git log -1 --format="%ct" origin/main 2>/dev/null || git log -1 --format="%ct" HEAD)
NOW=$(date +%s)
COMMIT_AGE_HOURS=$(( (NOW - MAIN_COMMIT_TIME) / 3600 ))

echo "Latest origin/main commit: $MAIN_COMMIT"
echo "Commit age: ~${COMMIT_AGE_HOURS}h ago"
echo ""

# Heuristic: vercel ls shows relative age like "34m", "7d", etc.
# Parse the age column to get a rough estimate
DEPLOY_AGE_RAW=$(echo "$VERCEL_DEPLOY_INFO" | awk '{print $1}')
DEPLOY_AGE_HOURS=0

if [[ "$DEPLOY_AGE_RAW" =~ ^([0-9]+)m$ ]]; then
  DEPLOY_AGE_HOURS=0
elif [[ "$DEPLOY_AGE_RAW" =~ ^([0-9]+)h$ ]]; then
  DEPLOY_AGE_HOURS="${BASH_REMATCH[1]}"
elif [[ "$DEPLOY_AGE_RAW" =~ ^([0-9]+)d$ ]]; then
  DEPLOY_AGE_HOURS=$(( ${BASH_REMATCH[1]} * 24 ))
fi

echo "Production deployment age: ~${DEPLOY_AGE_HOURS}h"

# Alert if deployment is older than the commit by more than MAX_HOURS
LAG=$(( DEPLOY_AGE_HOURS - COMMIT_AGE_HOURS ))

if (( LAG > MAX_HOURS )); then
  echo ""
  echo "🚨 STALE DEPLOYMENT DETECTED"
  echo "   Production is ~${LAG}h behind origin/main."
  echo "   This means pushes are NOT reaching production automatically."
  echo ""
  echo "   To fix: check GitHub Actions at https://github.com/mrg33k/aom-studio/actions"
  echo "   Or manually redeploy: ./scripts/ship-it.sh (from a clean worktree)"
  exit 1
elif (( DEPLOY_AGE_HOURS > MAX_HOURS && COMMIT_AGE_HOURS < MAX_HOURS )); then
  echo ""
  echo "🚨 STALE DEPLOYMENT DETECTED"
  echo "   Production is ~${DEPLOY_AGE_HOURS}h old but origin/main has a commit ~${COMMIT_AGE_HOURS}h old."
  echo "   Last commit probably hasn't deployed yet."
  echo ""
  echo "   Check: https://github.com/mrg33k/aom-studio/actions"
  exit 1
else
  echo ""
  echo "✅ Production appears current. No staleness detected."
  exit 0
fi
