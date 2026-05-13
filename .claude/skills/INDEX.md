# Skills Index

Organized by category. Research skills output briefs to `docs/briefs/` and update `docs/briefs/INDEX.json`.

See `.claude/skills/_research-template.md` for the research intake/output contract.

---

## research- (Research / Intelligence)

| Skill | Trigger | When to use |
|-------|---------|-------------|
| `/research-deeply` | `/research-deeply <topic>` | Reddit + forums + web deep dive. Find the communities that worship the topic. |
| `/research-deeply-webpage` | `/research-deeply-webpage <topic>` | Same as research-deeply + publish to aheadofmarket.com/briefs/<slug>. |
| `/research-youtube` | `/research-youtube <topic>` | Find 5 best YouTube videos, pull transcripts, synthesize. |
| `/research-add` | `/research-add <topic> add=<agent\|all>` | Research + inject brief into one or all agents' knowledge folders. |
| `/research-competitor` | `/research-competitor <company>` | Single competitor: site + social + press + pricing + positioning. |
| `/research-market` | `/research-market <category>` | Market sizing, trends, key players, timing. TAM/SAM style. |
| `/research-person` | `/research-person "<name>"` | Profile a prospect or founder for outreach or meeting prep. |
| `/research-pattern` | `/research-pattern "<how do best X do Y>"` | Pull 10 examples, extract shared pattern. |
| `/research-x-community` | `/research-x-community <niche>` | X/Twitter community map: influential voices + current conversation. |
| `/research-podcast` | `/research-podcast <topic>` | Find best podcast episodes, pull transcripts, synthesize. |

---

## video- (Editing mission)

| Skill | Trigger | When to use |
|-------|---------|-------------|
| `/video-cycle` | `/video-cycle "<brief>" [footage=<path>]` | Run one cycle of the video-editing mission (`docs/missions/video-editing/`). Raw cut → improvement operator → distill playbook. Use on every real video deliverable so the playbook compounds. |

---

## Extensions

Any skill can be extended:

- **`-webpage`** — also publishes to `aheadofmarket.com/briefs/<slug>` (requires `/briefs/` route to be scaffolded first)
- **`-add`** — injects the brief into an agent's knowledge folder (`add=<slug>` or `add=all`)

Example: `/research-person-webpage "Paul Graham" project=outreach`

---

## Shared Infrastructure

- **Template:** `.claude/skills/_research-template.md` — intake/output contract all skills follow
- **Brief writer:** `scripts/write-brief.py` — writes `docs/briefs/<slug>.md` with frontmatter + updates INDEX.json
- **Briefs index:** `docs/briefs/INDEX.json` — maps project slug → list of briefs
