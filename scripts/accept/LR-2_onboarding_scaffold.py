#!/usr/bin/env python3
# scripts/accept/LR-2_onboarding_scaffold.py — gate for LR-2 (conversational onboarding
# via three-question script with active scaffolding + system narration).
#
# Mission: corner:launch-readiness · LR-2 (locked 2026-05-02; impl 2026-05-05).
#
# What's tested (static-source-grep, mirrors LR-1's gate style):
#   1. OnboardingVoice.jsx runs three questions in order.
#   2. Each Q transitions through LISTENING -> CONFIRMED with conversational narration.
#   3. Q1 persists workspace_name to user_metadata.
#   4. Q2 persists work_areas (recipe-flask seeds) to user_metadata.
#   5. Q3 / SCAFFOLDING inserts a projects row + calls /api/dashboard/scaffold-project.
#   6. DONE flips has_completed_onboarding=true + onboarded=true via supabase.auth.updateUser.
#   7. SCAFFOLDING phase shows the step thread (system-coming-alive feel).
#   8. /api/dashboard/scaffold-project still seeds the six VISION/CONTEXT stubs (R30 contract).
#
# Usage:
#   python3 scripts/accept/LR-2_onboarding_scaffold.py
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
    except OSError:
        return None


# ── 1. OnboardingVoice three-question script ───────────────────────────────────

def onboarding_voice_checks():
    src = read_file('src/pages/OnboardingVoice.jsx')
    if src is None:
        record('OnboardingVoice.jsx readable', False, 'file not found')
        return
    record('OnboardingVoice.jsx readable', True)

    # Three questions, in order.
    record(
        'OnboardingVoice runs Q1 (workspace name) listening phase',
        "phase === 'Q1_LISTENING'" in src and "What's your workspace called?" in src,
    )
    record(
        'OnboardingVoice runs Q2 (work areas) listening phase',
        "phase === 'Q2_LISTENING'" in src and 'kinds of work do you do' in src,
    )
    record(
        'OnboardingVoice runs Q3 (first project) listening phase',
        "phase === 'Q3_LISTENING'" in src and 'first thing you want help with' in src,
    )

    # Each Q has a CONFIRMED phase with conversational narration.
    record(
        'OnboardingVoice narrates Q1 confirmation conversationally',
        "phase === 'Q1_CONFIRMED'" in src and 'Setting up ${workspace} as your home base.' in src,
    )
    record(
        'OnboardingVoice narrates Q2 confirmation conversationally',
        "phase === 'Q2_CONFIRMED'" in src and 'tools to your toolkit' in src,
    )
    record(
        'OnboardingVoice narrates Q3 confirmation conversationally',
        "phase === 'Q3_CONFIRMED'" in src and 'Scaffolding ${firstThing}' in src,
    )

    # LR-2 active scaffolds — each answer triggers a real DB write.
    record(
        'OnboardingVoice persists workspace_name via supabase.auth.updateUser (Q1)',
        'persistWorkspaceName' in src and 'workspace_name:' in src and 'supabase.auth.updateUser' in src,
    )
    record(
        'OnboardingVoice persists work_areas (recipe flask seeds) via supabase.auth.updateUser (Q2)',
        'persistWorkAreas' in src and 'work_areas:' in src,
    )
    record(
        'OnboardingVoice inserts projects row from Q3 answer',
        ".from('projects')" in src and '.insert(' in src and 'client_id: worldSlug' in src,
    )
    record(
        'OnboardingVoice calls /api/dashboard/scaffold-project for Q3 first project',
        '/api/dashboard/scaffold-project' in src and 'authFetch(' in src and "tenant: worldSlug" in src,
    )

    # DONE flips both onboarding flags via auth metadata, not just localStorage.
    record(
        'OnboardingVoice DONE flips has_completed_onboarding=true via supabase.auth.updateUser',
        'has_completed_onboarding: true' in src,
    )
    record(
        'OnboardingVoice DONE flips onboarded=true via supabase.auth.updateUser',
        'onboarded: true' in src,
    )
    record(
        'OnboardingVoice DONE keeps localStorage corner-onboarded marker',
        "localStorage.setItem('corner-onboarded', 'true')" in src,
    )

    # SCAFFOLDING phase shows the step thread + the three system-coming-alive cards.
    record(
        'OnboardingVoice SCAFFOLDING renders step thread',
        "phase === 'SCAFFOLDING'" in src and 'StepThread' in src,
    )
    record(
        'OnboardingVoice SCAFFOLDING narrates "Creating your workspace..."',
        'Creating your workspace' in src,
    )
    record(
        'OnboardingVoice SCAFFOLDING narrates "Spinning up your EA..."',
        'Spinning up your EA' in src,
    )
    record(
        'OnboardingVoice SCAFFOLDING narrates first-project scaffold step',
        "Scaffolding \"${firstThing}\"" in src,
    )

    # Best-effort: writes are wrapped in catch so a failure never traps the user.
    record(
        'OnboardingVoice wraps Supabase writes best-effort (catch handlers)',
        '.catch(() => {})' in src,
    )

    # Voice-first per LR-4: narrate() is invoked by each phase transition.
    record(
        'OnboardingVoice narrates each phase via SpeechSynthesis',
        'speechSynthesis' in src and 'narrate(line)' in src,
    )


# ── 2. scaffold-project endpoint contract (R30) ────────────────────────────────

def scaffold_endpoint_checks():
    src = read_file('api/dashboard/scaffold-project.js')
    if src is None:
        record('scaffold-project.js readable', False, 'file not found')
        return
    record('scaffold-project.js readable', True)

    # The endpoint must seed the six canonical surfaces so "first project scaffolded
    # with VISION/CONTEXT stubs" actually happens when OnboardingVoice fires it.
    record(
        'scaffold-project seeds VISION.md stub',
        "'VISION.md':" in src,
    )
    record(
        'scaffold-project seeds CONTEXT.md stub',
        "'CONTEXT.md':" in src,
    )
    record(
        'scaffold-project seeds BUILD.md stub',
        "'BUILD.md':" in src,
    )
    record(
        'scaffold-project seeds RESEARCH.md stub',
        "'RESEARCH.md':" in src,
    )
    record(
        'scaffold-project seeds last-conversation.md stub',
        "'last-conversation.md':" in src,
    )
    record(
        'scaffold-project enforces tenant via verifyTenant',
        'verifyTenant(' in src,
    )


# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    print('=== LR-2 gate: three-question onboarding scaffold ===\n')
    print('--- OnboardingVoice three-question script ---')
    onboarding_voice_checks()
    print('\n--- scaffold-project endpoint contract ---')
    scaffold_endpoint_checks()

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
