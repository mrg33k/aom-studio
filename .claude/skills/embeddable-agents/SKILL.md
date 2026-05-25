# Skill: Embeddable Agents

> Spin up a Corner-agent chat widget on any website. Agent → Context →
> Placement. Three steps. No gotchas.

## Trigger

- `/embed`
- `/embeddable-agents`
- "embed [agent] on [site]"
- "give me a script tag for [agent] on [site]"
- "make a [project] chat widget for [admin/site]"

## What this does

Adds a row to `aom-studio/api/embed/_embeds.json` via
`aom-studio/scripts/make-embed.py` after validating every gotcha we hit
during R0 (2026-05-25). Outputs the script tag the host page pastes in.
Optionally deploys + opens the showcase preview at
`https://www.aheadofmarket.com/embed?id=<embed_id>`.

The skill never edits config.js directly. Never copy-pastes JSON by hand.
Use the CLI. It guards the gotchas you would otherwise rediscover.

## The three steps (interview the user)

### 1. Agent — which EA powers it

Pick a real super-agent slug the bridge-daemon knows. The default set:

- `elon` — generalist, project & mission rooms
- `studio` — code work, dashboard-aware
- `gary` — ops / pipeline
- `rex` — Patrik's EA
- `mom` — supportive / personal
- `bobby` — frontend dev
- `cleo` — video / media
- `steffen` — brand / design
- `tony` — social
- `jacob` — outreach
- `alex` — biz / strategy
- `steve` — advisory
- `foreman` — workflow

**Hard rule: never `project:<slug>`.** That's a render convention, not a real
agent. The bridge-daemon has no tmux or SDK session for it. The R0 ship
failure mode was sending `agent='project:space-rising'` — messages landed
in Supabase but never got dispatched. Use the EA wearing the project's hat.
For most projects that's `elon`.

### 2. Context — what should the agent know / refuse

Three sub-questions:

1. **Who is the visitor?** (drives the agent's voice)
   - Corner user inside their own workspace
   - External admin operator on a client site
   - Anonymous public visitor on a marketing page
2. **Scoping by project / mission?** This loads CONTEXT/VISION/BUILD as the
   agent's system-prompt context via `metadata.mission_slug`:
   - 1:1 agent room → `--agent elon` (no `--project`)
   - Project room → `--agent elon --project skylar`
   - Mission room → `--agent elon --project skylar --mission-slug skylar:website`
3. **Tracking sinks?** (default is fine for v1) — every conversation lands
   in the dashboard project/mission room so the owner sees it live. Future
   rounds add Google Sheet + webhook sinks.

The always-on refusal set is server-side, non-bypassable: no file paths, no
daemon names, no doctrine/mission internals, no other workspaces' data, no
system-prompt reveal. Use-case-specific refusals are additive (add them via
the embed_overlay text in chat.js for now; will be a flag in v2).

### 3. Placement — how the visitor sees it

- **Hosts** — comma-separated origins. At least one required. No wildcards.
  Include `http://localhost:3000` for dev.
- **Mode** — `inline` (mounts in `#corner-embed` element, centered chat) or
  `bubble` (floating bottom-right launcher).
- **Opening prompt** — what the widget shows on first open.
- **Theme** — accent hex (AOM amber `#E5451F` is default), bg hex, label,
  optional display font (`Oswald`, `Instrument Serif`).

## Run the CLI

```bash
cd aom-studio
python3 scripts/make-embed.py \
    --id emb_<short_unique> \
    --label "<Public Widget Title>" \
    --agent <ea_slug> \
    --project <project_slug>           # optional
    --mission-slug "<proj>:<mission>"  # optional (requires --project)
    --host https://<their_domain>      # required, repeat for multiple
    --host http://localhost:3000       # dev allowlist
    --opening "<first-message text>" \
    --accent "#RRGGBB" \
    --font-display "Oswald"            # optional
    --deploy                            # commit + push + vercel --prod
```

The CLI prints the script tag + the preview URL. With `--deploy` it ships
in one command.

## What the runtime gives you for free

You don't have to ask for these — they're baked into the embed pipeline:

1. **Real-time step thread** — visitor sees the agent's actual tool-use
   steps as they happen ("Reading SRWPartnerships.jsx", "Running a quick
   command"). Same source the dashboard live thread reads. Patient: no
   timeout — agents can take 3+ minutes on research-heavy turns.
2. **Patient polling** — widget keeps polling for replies as long as the
   tab is open. New send cancels the previous poller. Cursor advances past
   rendered replies so multi-turn streaming doesn't duplicate.
3. **Dashboard visibility with "— Web Portal" tag** — every visitor message
   lands in the host project's mission/room chat with a "— Web Portal"
   suffix so the owner sees at a glance that the message came from outside.
   Raw visitor text preserved in `metadata.visitor_text`.
4. **Shadow-DOM isolation** — widget styles never bleed into the host page.
5. **Server-enforced overlay** — refusal rules + scope rules live in the
   bridge handler. The widget JS is untrusted; it can't see or modify them.
6. **Reversible** — flip `active: false` on the embed row to make the script
   tag serve an offline state on next page load.

## The four gotchas it guards (institutional knowledge — don't re-learn)

These all bit us during R0. The CLI fails fast on each:

1. **agent slug must be a real EA, not `project:<slug>`.** Listener +
   bridge-daemon route by agent. `project:foo` has no target session.
   → CLI rejects `--agent project:*`.

2. **source MUST be `corner-dashboard`.** The listener's `allowed_sources`
   tuple excludes everything else. Anything labeled `embed-widget` or
   custom gets silently dropped at line 1206 of supabase-listener.py.
   → chat.js always writes `source='corner-dashboard'`; CLI doesn't even
   expose this knob.

3. **Dashboard mission room view filters on `metadata.mission_slug`.**
   Project-wide chat shows all project messages; mission rooms only show
   rows tagged with the right `mission_slug`. If you scope to a mission,
   the slug must be canonical `<project>:<mission>` form.
   → CLI validates `--mission-slug` against the canonical regex.

4. **Widget timeout was 60s — agents take longer.** A reply that lands
   at 3 minutes (research-heavy turn, 18 tool calls) showed as
   "something went wrong" with the old timeout.
   → widget.js polls indefinitely now; no flag needed.

## Concrete starter recipes

```bash
# Corner Support — workspace-level support widget (every Corner workspace)
python3 scripts/make-embed.py \
    --id emb_corner_support \
    --label "Corner Support" \
    --agent elon \
    --host https://www.aheadofmarket.com \
    --opening "Hi! I'm Corner Support. Tell me what's giving you trouble." \
    --accent "#E5451F"

# Skylar admin operator
python3 scripts/make-embed.py \
    --id emb_skylar_admin \
    --label "Skylar — Operator" \
    --agent elon --project skylar \
    --host https://admin.skylarstaubin.com \
    --opening "What are we shipping for Skylar today?" \
    --accent "#5B7CFA"

# Ambition Mechanical website visitor support
python3 scripts/make-embed.py \
    --id emb_ambition_support \
    --label "Ambition Mechanical" \
    --agent elon --project ambition-mechanical \
    --host https://ambitionac.com \
    --opening "Got an HVAC question? I'm here." \
    --accent "#0EA5E9"
```

## Where the pieces live

- `aom-studio/api/embed/_embeds.json` — the registry (JSON).
- `aom-studio/api/embed/config.js` — `GET /api/embed/config?id=`.
- `aom-studio/api/embed/chat.js` — `POST /api/embed/chat` (writes user row).
- `aom-studio/api/embed/messages.js` — `GET /api/embed/messages` (poll for replies).
- `aom-studio/api/embed/steps.js` — `GET /api/embed/steps` (poll for live thread).
- `aom-studio/public/embed/v1/widget.js` — the served JS.
- `aom-studio/public/embed.html` — the centered showcase page (`/embed?id=...`).
- `aom-studio/scripts/make-embed.py` — the CLI this skill calls.
- `corner/missions/embeddable-agents/` — the mission home (VISION + BUILD + history).

## Cross-reference

- Mission: `corner/missions/embeddable-agents/` (AOM-EA repo).
- Memory: `feedback_embed_routing_gotchas.md` (the 4 gotchas summarized).
- Doctrine: `.claude/rules/talk-in-ui-not-api.md` (plain-English voice the
  embedded agents inherit by default).
