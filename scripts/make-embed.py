#!/usr/bin/env python3
"""make-embed.py — Scaffold a new Corner embed config.

Adds a row to api/embed/_embeds.json after validating every gotcha we hit
during the R0 buildout (2026-05-25). Run this from the skill at
`.claude/skills/embeddable-agents/SKILL.md`, or directly from a terminal.

Example:

  python3 scripts/make-embed.py \\
      --id emb_skylar_admin \\
      --label "Skylar — Admin" \\
      --agent elon \\
      --project skylar \\
      --mission-slug "skylar:website" \\
      --host https://admin.skylarstaubin.com \\
      --host http://localhost:3000 \\
      --opening "What are we shipping on Skylar's site today?" \\
      --accent "#5B7CFA"

What it guards:

  1. agent slug MUST be a real EA the bridge-daemon knows (elon, rex, gary,
     studio, mom, etc.) -- never 'project:<slug>' (no daemon target for that).
  2. host_allowlist is required (at least one) -- no wildcard hosts in v1.
  3. embed_id is unique inside _embeds.json.
  4. mission_slug, if given, is canonical "<project>:<mission>" form.
  5. client_id defaults to 'aom' (multi-tenant: pass --client-id for others).
  6. embed_id pattern: emb_<lowercase alphanumeric + dashes>, no spaces.

After write it prints the script tag and (with --deploy) builds + pushes +
runs `vercel --prod --yes`. With --open it also opens
https://www.aheadofmarket.com/embed/<id> in the user's browser when it's a
showcase embed.

Server-side gotchas the embed already handles (no flag needed):

  - source='corner-dashboard' (the only source the listener dispatches).
  - text suffix '— Web Portal' appended server-side so the dashboard mission
    room shows where the message came from. Visitor's widget bubble stays
    clean because the widget rendered it client-side before the POST.
  - Widget polls indefinitely (no 60s timeout) — agents can take 3+ min on
    research-heavy turns.
  - Step thread shows real bridge-daemon tool-use steps (live).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EMBEDS_PATH = REPO_ROOT / "api" / "embed" / "_embeds.json"

# Known EAs the bridge-daemon can route to. Update when new super-agents
# are added to scripts/agent_registry.py / SUPER_AGENT_SESSIONS.
KNOWN_EAS = {
    "elon", "rex", "gary", "studio", "mom",
    "bobby", "cleo", "steffen", "tony", "jacob", "alex", "steve",
    "foreman", "arsenal-ea",
}

EMBED_ID_RE = re.compile(r"^emb_[a-z0-9][a-z0-9_-]{2,40}$")
MISSION_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)+$")


def load_embeds() -> dict:
    if not EMBEDS_PATH.exists():
        return {"embeds": {}}
    return json.loads(EMBEDS_PATH.read_text())


def save_embeds(data: dict) -> None:
    EMBEDS_PATH.write_text(json.dumps(data, indent=2) + "\n")


def die(msg: str, code: int = 2) -> None:
    print(f"make-embed: {msg}", file=sys.stderr)
    sys.exit(code)


def validate(args: argparse.Namespace, existing: dict) -> None:
    if not EMBED_ID_RE.match(args.id):
        die(
            f"--id '{args.id}' invalid. Pattern: emb_<a-z0-9 dashes/underscores>, "
            "3-44 chars total."
        )
    if args.id in existing:
        die(f"--id '{args.id}' already exists in _embeds.json. Pick a new one.")
    if args.agent.startswith("project:"):
        die(
            "--agent 'project:<slug>' is wrong — the bridge-daemon has no tmux/SDK "
            "session for that. Use the real EA wearing the hat (e.g. elon, studio)."
        )
    if args.agent not in KNOWN_EAS:
        die(
            f"--agent '{args.agent}' isn't in the known-EA list ({sorted(KNOWN_EAS)}). "
            "Add it to KNOWN_EAS first if it's a new super-agent, or pick an existing one."
        )
    if not args.host:
        die("--host required at least once. No wildcard hosts in v1.")
    if args.mission_slug and not MISSION_SLUG_RE.match(args.mission_slug):
        die(
            f"--mission-slug '{args.mission_slug}' must be canonical "
            "'<project>:<mission>' (lowercase, dashes ok)."
        )
    if args.mission_slug and not args.project:
        die("--mission-slug requires --project.")


def build_entry(args: argparse.Namespace) -> dict:
    routing = {
        "agent": args.agent,
        "client_id": args.client_id,
    }
    if args.project:
        routing["project"] = args.project
    else:
        routing["project"] = None
    if args.mission_slug:
        routing["mission_slug"] = args.mission_slug
    else:
        routing["mission_slug"] = None

    placement = {
        "mode": args.placement_mode,
        "position": args.position,
        "opening_prompt": args.opening,
        "theme": {
            "accent": args.accent,
            "bg": args.bg,
            "label": args.label,
        },
    }
    if args.font_display:
        placement["theme"]["font_display"] = args.font_display

    return {
        "embed_id": args.id,
        "surface_name": args.label,
        "active": True,
        "host_allowlist": list(args.host),
        "placement": placement,
        "routing": routing,
    }


def maybe_deploy(args: argparse.Namespace) -> None:
    if not args.deploy:
        return
    print("\n→ git add + commit + push + vercel --prod --yes ...\n")
    cmds = [
        ["git", "add", str(EMBEDS_PATH.relative_to(REPO_ROOT))],
        ["git", "commit", "-m", f"feat(embed): scaffold {args.id} ({args.label})"],
        ["git", "push", "origin", "HEAD:main"],
        ["vercel", "--prod", "--yes"],
    ]
    for cmd in cmds:
        print("$ " + " ".join(cmd))
        r = subprocess.run(cmd, cwd=REPO_ROOT)
        if r.returncode != 0:
            die(f"deploy step failed: {' '.join(cmd)}", code=r.returncode)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--id", required=True, help="embed_id, e.g. emb_skylar_admin")
    p.add_argument("--label", required=True, help="surface name shown in widget header")
    p.add_argument(
        "--agent",
        required=True,
        help=f"EA slug. Must be one of: {sorted(KNOWN_EAS)}",
    )
    p.add_argument("--project", help="project slug (e.g. skylar, space-rising)")
    p.add_argument(
        "--mission-slug",
        help="canonical '<project>:<mission>' if scoping to a mission room",
    )
    p.add_argument(
        "--host",
        action="append",
        default=[],
        help="origin allowlist entry. Repeat for multiple. e.g. https://admin.example.com",
    )
    p.add_argument(
        "--client-id",
        default="aom",
        help="tenant client_id (default: aom). Use 'shared:<slug>' for shared rooms.",
    )
    p.add_argument(
        "--opening",
        default="How can I help?",
        help="opening prompt shown when widget first mounts",
    )
    p.add_argument(
        "--accent",
        default="#E5451F",
        help="theme accent hex (default: AOM amber).",
    )
    p.add_argument(
        "--bg",
        default="#0B0F14",
        help="widget background hex (default: deep cool-ink).",
    )
    p.add_argument(
        "--font-display",
        default=None,
        help="optional display font, e.g. Oswald, Instrument Serif",
    )
    p.add_argument(
        "--placement-mode",
        default="inline",
        choices=["inline", "bubble"],
        help="inline = mounts into #corner-embed on host page (centered chat). "
        "bubble = floating bottom-right launcher.",
    )
    p.add_argument(
        "--position",
        default="centered",
        help="position hint (centered | bottom-right | top-right | etc.)",
    )
    p.add_argument("--deploy", action="store_true", help="commit + push + vercel deploy")
    p.add_argument("--json", action="store_true", help="emit the new entry as JSON only")
    args = p.parse_args(argv)

    data = load_embeds()
    existing = data.get("embeds", {})
    validate(args, existing)

    entry = build_entry(args)
    existing[args.id] = entry
    data["embeds"] = existing
    save_embeds(data)

    snippet = (
        '<script src="https://aheadofmarket.com/embed/v1/widget.js"\n'
        f'        data-embed-id="{args.id}"></script>'
    )

    if args.json:
        print(json.dumps({"entry": entry, "snippet": snippet}, indent=2))
    else:
        print()
        print(f"  embed_id:        {args.id}")
        print(f"  label:           {args.label}")
        print(f"  routing.agent:   {args.agent}")
        if args.project:
            print(f"  routing.project: {args.project}")
        if args.mission_slug:
            print(f"  mission_slug:    {args.mission_slug}")
        print(f"  client_id:       {args.client_id}")
        print(f"  host allowlist:  {', '.join(args.host)}")
        print(f"  written to:      {EMBEDS_PATH.relative_to(REPO_ROOT)}")
        print()
        print("  Drop this on the host page just before </body>:\n")
        for line in snippet.splitlines():
            print(f"    {line}")
        print()
        if args.placement_mode == "inline":
            print(
                f"  Test page (showcase): https://www.aheadofmarket.com/embed?id={args.id}"
            )
            print(
                "  (the /embed page reads ?id= when set, or falls back to emb_sr_website)"
            )

    maybe_deploy(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
