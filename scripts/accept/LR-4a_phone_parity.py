#!/usr/bin/env python3
# scripts/accept/LR-4a_phone_parity.py — gate for LR-4a (phone parity:
# Gemini call produces the same scaffolds + chat-room landings as the
# text path of LR-2/LR-3).
#
# Mission: corner:launch-readiness · LR-4a (locked 2026-05-02; impl 2026-05-05).
#
# What's tested (static-source-grep, mirrors LR-1 / LR-2 gate style):
#   1. voice-summary.js TERMINAL_AGENTS includes 'ea'.
#   2. voice-summary.js still rejects non-terminal agents with the
#      TERMINAL_AGENTS list interpolated into the error.
#   3. VoiceChat.jsx TERMINAL_AGENTS mirror set includes 'ea' (so the
#      dashboard fires /api/dashboard/voice-summary for EA call ends).
#   4. voice-handoff.js has NO agent allowlist (per-agent-agnostic).
#   5. supabase-listener.py allowed_sources covers both 'voice-handoff'
#      and 'voice-summary'.
#   6. supabase-listener.py calls _append_voice_call_to_tape for the
#      voice sources before the relay-inbox write.
#   7. supabase-listener.py uses the same write_to_relay_inbox call for
#      voice as for typed dashboard messages (no source-specific branch).
#
# The end-to-end live-call gate (real Gemini call → EA scaffolds) lives
# off this gate, runs against production, and is deferred to LR-4b /
# launch-final per the mission doctrine.
#
# Usage:
#   python3 scripts/accept/LR-4a_phone_parity.py
#
# Exit codes: 0 = all PASS, 1 = at least one check FAILED.

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AOM_EA_LISTENER = os.path.expanduser(
    '~/Documents/Dev/aom-studio-transfer/AOM-EA/scripts/supabase-listener.py'
)

checks = []


def record(name, passed, detail=''):
    checks.append({'name': name, 'pass': passed, 'detail': detail})
    tag = 'PASS' if passed else 'FAIL'
    suffix = f' ({detail})' if detail else ''
    print(f'{tag} — {name}{suffix}')


def read_file(path):
    try:
        with open(path) as f:
            return f.read()
    except OSError:
        return None


# ── 1. voice-summary.js TERMINAL_AGENTS ────────────────────────────────────────

def voice_summary_checks():
    rel = 'api/dashboard/voice-summary.js'
    src = read_file(os.path.join(ROOT, rel))
    if src is None:
        record(f'{rel} readable', False, 'file not found')
        return
    record(f'{rel} readable', True)

    # Must contain TERMINAL_AGENTS set with 'ea'.
    m = re.search(r"const TERMINAL_AGENTS\s*=\s*new\s+Set\(\[([^\]]+)\]\)", src)
    if not m:
        record('voice-summary.js TERMINAL_AGENTS declaration found', False)
        return
    record('voice-summary.js TERMINAL_AGENTS declaration found', True)
    body = m.group(1)
    members = {x.strip().strip("'\"") for x in body.split(',') if x.strip()}
    record(
        "voice-summary.js TERMINAL_AGENTS includes 'ea'",
        'ea' in members,
        f'members={sorted(members)}',
    )
    # Sanity: still includes elon + gary (no regression).
    record(
        "voice-summary.js TERMINAL_AGENTS still includes 'elon'+'gary'",
        {'elon', 'gary'}.issubset(members),
        f'members={sorted(members)}',
    )

    # Error string still interpolates the allowlist, so future drift is loud.
    record(
        'voice-summary.js error message interpolates TERMINAL_AGENTS',
        '[...TERMINAL_AGENTS]' in src and 'voice-summary only supports terminal agents' in src,
    )


# ── 2. VoiceChat.jsx TERMINAL_AGENTS mirror ────────────────────────────────────

def voice_chat_checks():
    rel = 'src/dashboard/components/VoiceChat.jsx'
    src = read_file(os.path.join(ROOT, rel))
    if src is None:
        record(f'{rel} readable', False, 'file not found')
        return
    record(f'{rel} readable', True)

    m = re.search(r"const TERMINAL_AGENTS\s*=\s*new\s+Set\(\[([^\]]+)\]\)", src)
    if not m:
        record('VoiceChat.jsx TERMINAL_AGENTS declaration found', False)
        return
    record('VoiceChat.jsx TERMINAL_AGENTS declaration found', True)
    members = {x.strip().strip("'\"") for x in m.group(1).split(',') if x.strip()}
    record(
        "VoiceChat.jsx TERMINAL_AGENTS includes 'ea'",
        'ea' in members,
        f'members={sorted(members)}',
    )
    record(
        "VoiceChat.jsx TERMINAL_AGENTS still includes 'elon'+'gary'",
        {'elon', 'gary'}.issubset(members),
        f'members={sorted(members)}',
    )

    # Sanity: VoiceChat.jsx must still call /api/dashboard/voice-summary
    # gated by TERMINAL_AGENTS so that EA call-ends actually fire the path.
    record(
        'VoiceChat.jsx fires /api/dashboard/voice-summary inside TERMINAL_AGENTS gate',
        'TERMINAL_AGENTS.has(agentSlug)' in src and "'/api/dashboard/voice-summary'" in src,
    )
    record(
        'VoiceChat.jsx awaits /api/dashboard/voice-handoff for every agent',
        "'/api/dashboard/voice-handoff'" in src and 'await fetch' in src,
    )


# ── 3. voice-handoff.js is agent-agnostic ──────────────────────────────────────

def voice_handoff_checks():
    rel = 'api/dashboard/voice-handoff.js'
    src = read_file(os.path.join(ROOT, rel))
    if src is None:
        record(f'{rel} readable', False, 'file not found')
        return
    record(f'{rel} readable', True)
    # No TERMINAL_AGENTS allowlist in voice-handoff (per-agent-agnostic).
    record(
        'voice-handoff.js has NO TERMINAL_AGENTS allowlist',
        'TERMINAL_AGENTS' not in src,
    )
    # Source tag is voice-handoff (matches listener allowed_sources).
    record(
        "voice-handoff.js writes source='voice-handoff'",
        "source: 'voice-handoff'" in src,
    )


# ── 4. supabase-listener.py voice-source symmetry (cross-repo) ─────────────────

def supabase_listener_checks():
    src = read_file(AOM_EA_LISTENER)
    if src is None:
        record('supabase-listener.py readable', False, f'not found at {AOM_EA_LISTENER}')
        return
    record('supabase-listener.py readable', True)

    # allowed_sources tuple covers both voice sources.
    m = re.search(r"allowed_sources\s*=\s*\(([^)]+)\)", src)
    if not m:
        record('supabase-listener.py allowed_sources tuple found', False)
        return
    record('supabase-listener.py allowed_sources tuple found', True)
    members = {x.strip().strip("'\"") for x in m.group(1).split(',') if x.strip()}
    record(
        "supabase-listener.py allowed_sources covers 'voice-handoff'",
        'voice-handoff' in members,
        f'members={sorted(members)}',
    )
    record(
        "supabase-listener.py allowed_sources covers 'voice-summary'",
        'voice-summary' in members,
        f'members={sorted(members)}',
    )

    # Tape append fires for both voice sources before relay-inbox write.
    record(
        'supabase-listener.py appends voice-source bodies to the tape',
        'source in ("voice-handoff", "voice-summary")' in src
        and '_append_voice_call_to_tape(agent, text, source, record)' in src,
    )

    # The relay-inbox write is the single shared path (no voice-only branch).
    record(
        'supabase-listener.py uses one write_to_relay_inbox call for all sources',
        'write_to_relay_inbox(text, msg_id, "corner-dashboard"' in src,
    )


# ── 5. brief vs reality: TERMINAL_AGENTS lives in voice-summary.js ─────────────

def brief_haiku_chat_check():
    """The round brief lists haiku-chat.js as the file to edit; in practice
    TERMINAL_AGENTS does not live there. Document the mismatch so a re-read
    doesn't re-litigate."""
    rel = 'api/dashboard/haiku-chat.js'
    src = read_file(os.path.join(ROOT, rel))
    if src is None:
        record(f'{rel} readable (sanity)', False, 'file not found')
        return
    record(
        'haiku-chat.js intentionally has NO TERMINAL_AGENTS (Bobby-tier dispatcher, not voice path)',
        'TERMINAL_AGENTS' not in src,
    )


def main():
    voice_summary_checks()
    voice_chat_checks()
    voice_handoff_checks()
    supabase_listener_checks()
    brief_haiku_chat_check()

    total = len(checks)
    passed = sum(1 for c in checks if c['pass'])
    print()
    print(f'──── LR-4a phone-parity gate: {passed}/{total} PASS ────')
    if passed != total:
        for c in checks:
            if not c['pass']:
                print(f'  FAIL — {c["name"]}{(": " + c["detail"]) if c["detail"] else ""}')
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
