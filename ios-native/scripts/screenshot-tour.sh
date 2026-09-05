#!/usr/bin/env bash
# screenshot-tour.sh — corner:corner-smooth-loop R0-ios native screen tour.
#
# Drives CornerUITests/ScreenTour on one Mac's simulators and collects the
# frames:  cd ios-native && scripts/screenshot-tour.sh [device name ...]
# With no args, runs the three R0 devices (iPhone 17 Pro,
# iPhone SE (3rd generation), iPad Pro 13-inch (M5)).
#
# Credentials come from TOUR_EMAIL / TOUR_PASSWORD in the environment, or from
# ios-native/.tour.env (gitignored) as a fallback. The password is never
# printed, logged, or committed.
#
# Exit code: non-zero only if a build fails or a device produced no frames.
# Missing frames are reported in summary.md, not fatal.
set -uo pipefail

cd "$(dirname "$0")/.."

DEFAULT_DEVICES=(
  "iPhone 17 Pro"
  "iPhone SE (3rd generation)"
  "iPad Pro 13-inch (M5)"
)
if [[ $# -gt 0 ]]; then
  DEVICES=("$@")
else
  DEVICES=("${DEFAULT_DEVICES[@]}")
fi

# --- credentials -------------------------------------------------------------
if [[ -z "${TOUR_EMAIL:-}" || -z "${TOUR_PASSWORD:-}" ]]; then
  if [[ -f .tour.env ]]; then
    # shellcheck disable=SC1091
    set -a; source .tour.env; set +a
  fi
fi
if [[ -z "${TOUR_EMAIL:-}" || -z "${TOUR_PASSWORD:-}" ]]; then
  echo "screenshot-tour: TOUR_EMAIL / TOUR_PASSWORD unset and no .tour.env" >&2
  exit 2
fi

# --- project -----------------------------------------------------------------
/opt/homebrew/bin/xcodegen generate >/dev/null 2>&1 || {
  echo "screenshot-tour: xcodegen generate failed" >&2
  exit 1
}

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="deliverables/screen-tour/$STAMP"
mkdir -p "$OUT"

slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -d '()' | tr ' ' '-' | tr -s '-'
}

resolve_udid() {
  python3 -c "
import json, subprocess, sys
want = sys.argv[1]
data = json.loads(subprocess.run(
    ['xcrun', 'simctl', 'list', 'devices', 'available', '-j'],
    capture_output=True, text=True, check=True).stdout)
for runtime, devs in data['devices'].items():
    for d in devs:
        if d['name'] == want:
            print(d['udid']); raise SystemExit(0)
raise SystemExit(1)
" "$1"
}

# Track simulators this script booted, so only those get shut down.
BOOTED=""
shutdown_booted() {
  for id in $BOOTED; do
    xcrun simctl shutdown "$id" >/dev/null 2>&1 || true
  done
}
trap shutdown_booted EXIT

SUMMARY="$OUT/summary.md"
{
  echo "# Screen tour $STAMP"
  echo ""
} > "$SUMMARY"

OVERALL_RC=0

for DEVICE in "${DEVICES[@]}"; do
  SLUG="$(slugify "$DEVICE")"
  DEST="$OUT/$SLUG"
  mkdir -p "$DEST"
  echo "=== $DEVICE ($SLUG) ==="

  UDID="$(resolve_udid "$DEVICE" 2>/dev/null || true)"
  if [[ -z "$UDID" ]]; then
    echo "  no available simulator named '$DEVICE'; skipping"
    {
      echo "## $DEVICE ($SLUG)"
      echo ""
      echo "- status: device not found, skipped"
      echo ""
    } >> "$SUMMARY"
    OVERALL_RC=1
    continue
  fi

  STATE="$(python3 -c "
import json, subprocess, sys
data = json.loads(subprocess.run(
    ['xcrun', 'simctl', 'list', 'devices', 'available', '-j'],
    capture_output=True, text=True, check=True).stdout)
for devs in data['devices'].values():
    for d in devs:
        if d['udid'] == '$UDID':
            print(d['state']); raise SystemExit(0)
" 2>/dev/null || echo "unknown")"
  if [[ "$STATE" != "Booted" ]]; then
    xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
    xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || true
    BOOTED="$BOOTED $UDID"
  fi

  xcrun simctl ui "$UDID" appearance dark >/dev/null 2>&1 || true
  xcrun simctl status_bar "$UDID" override \
    --time 9:41 --batteryState charged --batteryLevel 100 \
    --cellularBars 4 --wifiBars 3 >/dev/null 2>&1 || true

  DEST_ARG="platform=iOS Simulator,id=$UDID"

  # Fresh slate: uninstalling wipes the Keychain session, so the first attempt
  # always meets the genuine sign-in screen (never a stale session).
  xcrun simctl uninstall "$UDID" com.aheadofmarket.corner >/dev/null 2>&1 || true

  run_tour() {
    local attempt_dir="$1"
    mkdir -p "$attempt_dir"
    local build_rc=0 test_rc=0
    xcodebuild build-for-testing \
      -project Corner.xcodeproj -scheme Corner \
      -destination "$DEST_ARG" \
      -derivedDataPath build/tour \
      >"$attempt_dir/$SLUG.build.log" 2>&1 || build_rc=$?
    if [[ $build_rc -ne 0 ]]; then
      echo "$build_rc 0"
      return
    fi
    # TEST_RUNNER_* is stripped by the runner (the test reads TOUR_*);
    # unprefixed copies ride along for runners that inherit the env directly.
    TOUR_EMAIL="$TOUR_EMAIL" TOUR_PASSWORD="$TOUR_PASSWORD" \
    TEST_RUNNER_TOUR_EMAIL="$TOUR_EMAIL" \
    TEST_RUNNER_TOUR_PASSWORD="$TOUR_PASSWORD" \
    xcodebuild test-without-building \
      -project Corner.xcodeproj -scheme Corner \
      -destination "$DEST_ARG" \
      -derivedDataPath build/tour \
      -only-testing:CornerUITests/ScreenTour \
      -resultBundlePath "$attempt_dir/$SLUG.xcresult" \
      >>"$attempt_dir/$SLUG.build.log" 2>&1 || test_rc=$?
    echo "$build_rc $test_rc"
  }

  read -r BUILD_RC TEST_RC < <(run_tour "$DEST")
  echo "  attempt 1: build=$BUILD_RC test=$TEST_RC"

  # On failure, bootstrap the Keychain session once via the app's own Debug
  # auto-sign-in hook (no UI involved) and rerun: the tour then takes its
  # documented Keychain-survived path. At most two attempts per device.
  if [[ $BUILD_RC -ne 0 || $TEST_RC -ne 0 ]]; then
    mkdir -p "$DEST/first-attempt"
    mv "$DEST/$SLUG.build.log" "$DEST/first-attempt/" 2>/dev/null || true
    rm -rf "$DEST/first-attempt/$SLUG.xcresult" 2>/dev/null || true
    mv "$DEST/$SLUG.xcresult" "$DEST/first-attempt/" 2>/dev/null || true
    if [[ $BUILD_RC -eq 0 ]]; then
      echo "  bootstrapping Keychain session via AUTO_SIGNIN launch..."
      SIMCTL_CHILD_UITEST_REAL_BACKEND=1 \
      SIMCTL_CHILD_AUTO_SIGNIN_EMAIL="$TOUR_EMAIL" \
      SIMCTL_CHILD_AUTO_SIGNIN_PASSWORD="$TOUR_PASSWORD" \
      xcrun simctl launch "$UDID" com.aheadofmarket.corner >/dev/null 2>&1 || true
      sleep 60
      xcrun simctl terminate "$UDID" com.aheadofmarket.corner >/dev/null 2>&1 || true
      sleep 5
      read -r BUILD_RC TEST_RC < <(run_tour "$DEST/retry")
      echo "  attempt 2: build=$BUILD_RC test=$TEST_RC"
      # The retry is the run of record: promote its log/xcresult.
      mv "$DEST/retry/$SLUG.build.log" "$DEST/$SLUG.build.log" 2>/dev/null || true
      rm -rf "$DEST/$SLUG.xcresult" 2>/dev/null || true
      mv "$DEST/retry/$SLUG.xcresult" "$DEST/" 2>/dev/null || true
      rmdir "$DEST/retry" 2>/dev/null || true
    else
      echo "  BUILD FAILED (see first-attempt/$SLUG.build.log)"
    fi
  fi
  if [[ $BUILD_RC -ne 0 || $TEST_RC -ne 0 ]]; then
    OVERALL_RC=1
  fi

  # --- pull PNGs + timing out of the xcresult --------------------------------
  FRAMES_DIR="$DEST/frames"
  mkdir -p "$FRAMES_DIR"
  XCRESULT="$(ls -td "$DEST"/*.xcresult build/tour/Logs/Test/*.xcresult 2>/dev/null | head -1 || true)"
  if [[ -n "$XCRESULT" ]]; then
    EXPORT_DIR="$DEST/_attachments"
    xcrun xcresulttool export attachments \
      --path "$XCRESULT" --output-path "$EXPORT_DIR" >/dev/null 2>&1 || true
    if [[ -f "$EXPORT_DIR/manifest.json" ]]; then
      python3 - "$EXPORT_DIR/manifest.json" "$FRAMES_DIR" <<'EOF' || true
import json, os, re, shutil, sys
manifest_path, frames = sys.argv[1], sys.argv[2]
with open(manifest_path) as f:
    root = json.load(f)
groups = root if isinstance(root, list) else [root]
export_root = os.path.dirname(manifest_path)
timing_written = False
for group in groups:
    if not isinstance(group, dict):
        continue
    for att in group.get("attachments", []):
        shr = att.get("suggestedHumanReadableName", "")
        fn = att.get("exportedFileName", "")
        src = os.path.join(export_root, fn)
        if not fn or not os.path.isfile(src):
            continue
        if fn.endswith(".mp4"):
            continue
        stem, ext = os.path.splitext(shr)
        if stem == "timing":
            shutil.copyfile(src, os.path.join(frames, "..", "timing.txt"))
            timing_written = True
            continue
        if re.fullmatch(r"[0-9]{2}[a-z0-9-]*(-MISSING)?", stem) \
                and ext.lower() in (".png", ".jpg", ".jpeg"):
            shutil.copyfile(src, os.path.join(frames, stem + ext))
if not timing_written:
    open(os.path.join(frames, "..", "timing.txt"), "w").write("(no timing attachment)\n")
EOF
    fi
  fi
  if [[ ! -f "$DEST/timing.txt" ]]; then
    echo "(no timing attachment)" > "$DEST/timing.txt"
  fi
  mv "$DEST"/frames/*.png "$DEST"/ 2>/dev/null || true
  rmdir "$DEST"/frames 2>/dev/null || true

  FRAME_COUNT="$(ls "$DEST"/[0-9][0-9]-*.png 2>/dev/null | wc -l | tr -d ' ')"
  MISSING="$(ls "$DEST"/*-MISSING.png 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/-MISSING\.png//' | tr '\n' ' ' || true)"
  [[ -z "$MISSING" ]] && MISSING="(none)"

  if [[ "$FRAME_COUNT" -eq 0 ]]; then
    echo "  no frames produced"
    OVERALL_RC=1
  else
    echo "  $FRAME_COUNT frames"
  fi

  {
    echo "## $DEVICE ($SLUG)"
    echo ""
    echo "- udid: $UDID"
    echo "- build exit: $BUILD_RC, test exit: $TEST_RC"
    if [[ -d "$DEST/first-attempt" ]]; then
      echo "- attempts: 2 (first failed; its log/xcresult are under first-attempt/)"
    else
      echo "- attempts: 1"
    fi
    if grep -q "signin=skipped" "$DEST/timing.txt" 2>/dev/null; then
      echo "- skipped: 00-signin-empty, 01-signin-filled (Keychain session survived; the sign-in UI never appeared)"
    fi
    echo "- frames:"
    for f in "$DEST"/[0-9][0-9]-*.png; do
      [[ -e "$f" ]] || continue
      echo "  - $(basename "$f")"
    done
    echo "- missing: $MISSING"
    echo "- timing:"
    echo '```'
    cat "$DEST/timing.txt"
    echo '```'
    echo ""
  } >> "$SUMMARY"
done

trap - EXIT
shutdown_booted

echo "$SUMMARY"
exit "$OVERALL_RC"
