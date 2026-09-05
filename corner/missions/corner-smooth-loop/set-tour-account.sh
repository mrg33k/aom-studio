#!/usr/bin/env bash
# set-tour-account.sh — give the native screen tour a working sign-in on the canonical Convex
# deployment (neat-pony-216), using Patrik's own account with a fresh random password.
#
# What it does, in order:
#   1. generates a random 21-char password (never printed)
#   2. reads AUTH_SEED_KEY from the deployment env (the gate for auth:adminSetPassword)
#   3. calls auth:adminSetPassword { email, password, key, temporary:false }
#      (temporary:false so the app does not force a password change and bounce the tour)
#   4. proves sign-in with the same POST /api/action auth:signIn call the iOS app makes
#   5. writes ios-native/.tour.env (gitignored) with TOUR_EMAIL / TOUR_PASSWORD
#
# Usage: corner/missions/corner-smooth-loop/set-tour-account.sh [email]   (default hello@aom-inhouse.com)
# Afterwards, change the password yourself in the app's Account screen whenever you like; the tour
# reads .tour.env, so update that file too (or re-run this script).
set -euo pipefail
EMAIL="${1:-hello@aom-inhouse.com}"
CONVEX_REPO=/Users/aom-inhouse/aom-studio-transfer/corner-convex
ENV_FILE=/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native/.tour.env
cd "$CONVEX_REPO"
PW="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)!"
KEY="$(npx convex env get AUTH_SEED_KEY 2>/dev/null | tr -d '\n')"
[[ -n "$KEY" ]] || { echo "could not read AUTH_SEED_KEY from the deployment env" >&2; exit 2; }
export EMAIL PW KEY ENV_FILE
python3 -s - <<'EOF'
import json, os, subprocess, urllib.request
email, pw, key, env_file = os.environ["EMAIL"], os.environ["PW"], os.environ["KEY"], os.environ["ENV_FILE"]
args = json.dumps({"email": email, "password": pw, "key": key, "temporary": False})
r = subprocess.run(["npx", "convex", "run", "auth:adminSetPassword", args], capture_output=True, text=True)
out = (r.stdout + r.stderr).replace(pw, "<pw>").replace(key, "<key>").strip()
print("adminSetPassword exit", r.returncode, "|", out[:300])
if r.returncode != 0:
    raise SystemExit(3)
body = json.dumps({"path": "auth:signIn", "args": {"provider": "password", "params": {"email": email, "password": pw, "flow": "signIn"}}, "format": "json"}).encode()
req = urllib.request.Request("https://neat-pony-216.convex.cloud/api/action", data=body, headers={"Content-Type": "application/json"})
res = json.loads(urllib.request.urlopen(req, timeout=20).read())
val = res.get("value")
ok = res.get("status") == "success" and isinstance(val, dict) and bool(val.get("tokens"))
print("signIn:", res.get("status"), "| tokens:", "yes" if ok else "no", "| err:", (res.get("errorMessage") or "")[:120])
if not ok:
    raise SystemExit(4)
with open(env_file, "w") as f:
    f.write(f"TOUR_EMAIL={email}\nTOUR_PASSWORD={pw}\n")
os.chmod(env_file, 0o600)
print("wrote", env_file, "(gitignored). Tour account ready.")
EOF
