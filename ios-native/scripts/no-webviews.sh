#!/bin/bash
# no-webviews.sh — corner:native-ios Stage 3
#
# THE WHOLE POINT OF THE REWRITE, MADE CHECKABLE. The App Store product used to be a
# Capacitor shell: one WKWebView holding the entire dashboard. That is the thing this app
# replaces, and "no web views" is not a style preference — a web view is where the
# realtime socket dies on background (the reason replies were invisible in a pocket), and
# it is what guideline 4.2 reads as a repackaged website.
#
# A rule nobody can run is a rule that decays. This script is the gate: it fails if any
# embedded web content is reintroduced into the app target.
#
# WHAT IS ALLOWED, EXPLICITLY:
#   - SFSafariViewController / SwiftUI `Link` for EXTERNAL destinations (a client's site,
#     a store URL that would not download). The open web is not a Corner surface and
#     leaving for the browser is the honest way to visit it.
#   - QLPreviewController, which may use WebKit internally to render an HTML document.
#     That is the system's own document previewer, not our product surface.
# WHAT IS NOT:
#   - WKWebView, UIWebView, or a SwiftUI wrapper around either, rendering any part of
#     Corner itself.
#
# Usage: ios-native/scripts/no-webviews.sh   (exit 0 = clean)

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

BANNED='WKWebView|UIWebView|WKUIDelegate|WKNavigationDelegate|import WebKit'
# Comments are allowed to NAME the thing (this codebase explains why the wrap failed),
# so only real code counts: strip // line comments before matching.
HITS=$(grep -rn --include='*.swift' -E "$BANNED" Corner \
  | sed 's://.*::' \
  | grep -E "$BANNED" || true)

if [ -n "$HITS" ]; then
  echo "FAIL — embedded web content is back in the app target:"
  echo "$HITS"
  exit 1
fi

# SFSafariViewController is allowed, but say where it is so an external-link escape
# hatch can never quietly become a product surface.
SAFARI=$(grep -rn --include='*.swift' -E 'SFSafariViewController|import SafariServices' Corner | sed 's://.*::' | grep -E 'SFSafariViewController|import SafariServices' || true)
if [ -n "$SAFARI" ]; then
  echo "OK — no web views. SFSafariViewController is used (allowed, external links only):"
  echo "$SAFARI"
else
  echo "OK — no web views, and no SFSafariViewController either. Every surface is SwiftUI."
fi
exit 0
