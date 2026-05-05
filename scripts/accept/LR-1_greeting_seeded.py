#!/usr/bin/env python3
# scripts/accept/LR-1_greeting_seeded.py — gate for LR-1 (proactive EA greeting on first load).
#
# What's tested:
#   1. create-world.js seeds a greeting into messages (agent='ea', role='agent') at cold-start.
#   2. create-world.js greeting text includes display name + "welcome".
#   3. create-world.js message is scoped to worldSlug and has a unique id.
#   4. accept-invite.js seeds a greeting for invited users (step 4 of the POST handler).
#   5. accept-invite.js has an inviter-name variant (invited_by branch) and a fallback.
#   6. accept-invite.js greeting is non-fatal (try/catch wraps the seed call).
#
# Usage:
#   python3 scripts/accept/LR-1_greeting_seeded.py
#
# Exit codes: 0 = all PASS, 1 = at least one check FAILED.

import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

checks = []

def record(name, passed, detail=''):
    checks.append({'name': name, 'pass': passed, 'detail': detail})
    tag = 'PASS' if passed else 'FAIL'
    suffix = f' ({detail})' if detail else ''
    print(f'{tag} — {name}{suffix}')

def read_file(rel_path):
    full = os.path.join(ROOT, rel_path)
    try:
        with open(full) as f:
            return f.read()
    except OSError as e:
        return None

# ── 1. create-world.js: cold-start greeting seeding ──────────────────────────

def cold_start_checks():
    src = read_file('api/dashboard/create-world.js')
    if src is None:
        record('create-world.js readable', False, 'file not found')
        return
    record('create-world.js readable', True)

    record(
        'create-world.js POSTs to /rest/v1/messages',
        '/rest/v1/messages' in src,
    )
    record(
        'create-world.js seeds greeting with agent=ea',
        "agent: 'ea'" in src,
    )
    record(
        'create-world.js seeds greeting with role=agent',
        "role: 'agent'" in src,
    )
    record(
        'create-world.js greeting text includes display name token',
        '${displayName}' in src,
    )
    record(
        'create-world.js greeting text includes "welcome"',
        'welcome' in src.lower(),
    )
    record(
        'create-world.js assigns unique message id via randomUUID',
        'randomUUID()' in src,
    )
    record(
        'create-world.js scopes message to worldSlug via client_id',
        'client_id: worldSlug' in src,
    )

# ── 2. accept-invite.js: invited-user greeting seeding ───────────────────────

def invited_user_checks():
    src = read_file('api/accept-invite.js')
    if src is None:
        record('accept-invite.js readable', False, 'file not found')
        return
    record('accept-invite.js readable', True)

    record(
        'accept-invite.js has EA greeting seed step',
        'Seed EA greeting' in src,
    )
    record(
        'accept-invite.js seeds greeting with agent=ea',
        "agent: 'ea'" in src,
    )
    record(
        'accept-invite.js seeds greeting with role=agent',
        "role: 'agent'" in src,
    )
    record(
        'accept-invite.js has inviter-name lookup (getInviterDisplayName)',
        'getInviterDisplayName' in src or 'inviterName' in src,
    )
    record(
        'accept-invite.js invited-by branch produces personalised greeting',
        'invited you in' in src,
    )
    record(
        'accept-invite.js fallback text when inviter name unknown ("someone")',
        'someone' in src,
    )
    record(
        'accept-invite.js greeting seed is non-fatal (try/catch)',
        '/* non-fatal' in src or 'non-fatal: user is in' in src,
    )
    record(
        'accept-invite.js message scoped to worldSlug via client_id',
        'client_id: worldSlug' in src,
    )

# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    print('=== LR-1 gate: greeting seeding ===\n')
    print('--- cold-start (create-world.js) ---')
    cold_start_checks()
    print('\n--- invited-user (accept-invite.js) ---')
    invited_user_checks()

    failed = [c for c in checks if not c['pass']]
    total = len(checks)
    passed = total - len(failed)
    print(f'\n{passed}/{total} PASS')
    if failed:
        print('FAILED:')
        for c in failed:
            suffix = f' ({c["detail"]})' if c["detail"] else ''
            print(f'  — {c["name"]}{suffix}')
    sys.exit(1 if failed else 0)

run()
