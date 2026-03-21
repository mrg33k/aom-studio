#!/bin/bash
# check-imports.sh -- Catch missing lucide-react imports before they crash production.
# Runs: vite build (catches syntax errors) + scans for icon references without imports.
# Exit 1 = broken, do not push.

set -e
cd "$(dirname "$0")/.."

echo "[check-imports] Building..."
npx vite build --logLevel error 2>&1 | tail -5
if [ $? -ne 0 ]; then
  echo "[check-imports] BUILD FAILED. Do not push."
  exit 1
fi

echo "[check-imports] Scanning for missing lucide-react icons..."

# For each JSX file that imports from lucide-react, extract imported names
# Then find icon: UsedName patterns and check they exist in imports
FAIL=0
for file in $(grep -rl "from 'lucide-react'" src/ --include="*.jsx" 2>/dev/null); do
  # Get imported names (handle "Map as MapIcon" -> both Map and MapIcon)
  IMPORTED=$(grep "from 'lucide-react'" "$file" | sed "s/import {//;s/} from.*//;s/,/\n/g" | sed 's/ as /\n/g' | tr -d ' ' | sort -u)

  # Get icon: references
  USED=$(grep -oP 'icon:\s*\K[A-Z][a-zA-Z0-9]+' "$file" 2>/dev/null | sort -u)

  for icon in $USED; do
    if ! echo "$IMPORTED" | grep -q "^${icon}$"; then
      echo "  MISSING: $file uses icon: $icon but doesn't import it"
      FAIL=1
    fi
  done
done

if [ $FAIL -eq 1 ]; then
  echo "[check-imports] MISSING IMPORTS FOUND. Fix before pushing."
  exit 1
fi

echo "[check-imports] All clean."
exit 0
