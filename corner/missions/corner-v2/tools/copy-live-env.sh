#!/usr/bin/env bash
# copy-live-env.sh — copy the live deployment's environment variables to the v2 copies.
#
# Why: `npx convex export/import` moves data, not env vars, so the rehearsal and the production
# clone have no JWT_PRIVATE_KEY/JWKS (nobody can sign in) and none of the integration keys.
# Copying live's values means sessions and integrations keep working after a cutover.
#
# Multi-line PEM values (JWT_PRIVATE_KEY, APNS_PRIVATE_KEY) start with a dash, which the CLI reads
# as a flag when passed inline; every value therefore goes through a 0600 temp file and
# `--from-file`, then the file is removed. Idempotent (`--force` overwrites). Prints NAMES only.
# Run from anywhere:
#   bash /Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/tools/copy-live-env.sh
set -uo pipefail
cd /Users/aom-inhouse/aom-studio-transfer/corner-convex || exit 2
LIVE=neat-pony-216
TARGETS=("patrik-matheson:corner-v2-production:production" "adjoining-tiger-87")
# Skipped on purpose: CONVEX_DEPLOYMENT (Convex-managed), SITE_URL on the clone (set per site),
# VERCEL_* (informational), CORNER_V2_MIGRATION_KEY (clone-specific, already set).
NAMES=(APNS_KEY_ID APNS_PRIVATE_KEY APNS_TEAM_ID APNS_TOPIC ARCADE_API_KEY AUTH_SEED_KEY CORNER_MIGRATION_SECRET DEEPSEEK_API_KEY JWKS JWT_PRIVATE_KEY LEDGER_KEY MUSE_API_KEY MUSE_BASE_URL MUSE_MODEL OPENAI_API_KEY)
TMP="$(mktemp)"; chmod 600 "$TMP"
trap 'rm -f "$TMP"' EXIT
for name in "${NAMES[@]}"; do
  if ! npx convex env get "$name" --deployment "$LIVE" > "$TMP" 2>/dev/null || [ ! -s "$TMP" ]; then
    echo "$name: empty or unreadable on live, skipped"; continue
  fi
  for dep in "${TARGETS[@]}"; do
    if npx convex env set "$name" --from-file "$TMP" --force --deployment "$dep" >/dev/null 2>&1; then
      echo "$name -> $dep ok"
    else
      echo "$name -> $dep FAILED"
    fi
  done
  : > "$TMP"
done
# Rehearsal gets live's SITE_URL too (the clone already has one set by the R4 worker).
if npx convex env get SITE_URL --deployment "$LIVE" > "$TMP" 2>/dev/null && [ -s "$TMP" ]; then
  npx convex env set SITE_URL --from-file "$TMP" --force --deployment adjoining-tiger-87 >/dev/null 2>&1 && echo "SITE_URL -> adjoining-tiger-87 ok"
fi
rm -f "$TMP"
echo "done. byte counts on the clone (presence check, values never printed):"
for name in JWT_PRIVATE_KEY APNS_PRIVATE_KEY JWKS; do
  printf "  %s: %s bytes\n" "$name" "$(npx convex env get "$name" --deployment patrik-matheson:corner-v2-production:production 2>/dev/null | wc -c | tr -d ' ')"
done
