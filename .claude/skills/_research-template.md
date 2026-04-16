# Research Skills — Shared Template

All `research-*` skills follow this intake/output contract.

---

## Intake

Every skill accepts arguments in this order:

```
/<skill-name> <topic> [project=<slug>] [add=<agent|all>]
```

- **topic** (required) — subject to research. Can be a phrase or a question.
- **project** (optional) — project slug to file the brief under in INDEX.json. Defaults to `unassigned`.
- **add** (optional) — inject the finished brief into an agent's knowledge folder. Pass an agent slug (e.g. `elon`) or `all` to inject into every agent.

Examples:

```
/research-competitor Notion
/research-deeply "remote work trends 2025" project=corner
/research-person "Paul Graham" project=outreach add=elon
```

---

## Research Loop

Each skill defines its own research loop. The loop always:

1. Runs **at least 3 angle searches** via `WebSearch`.
2. Uses `WebFetch` to read the most relevant pages in full.
3. Synthesizes findings into a structured brief body.
4. Cites every source used (URL or citation string).

---

## Output: Write the Brief

After the research loop, every skill calls `write-brief.py`:

```bash
python scripts/write-brief.py \
  --title "<Human-readable title>" \
  --topic "<canonical-topic-tag>" \
  --skill "<skill-name>" \
  --project "<project-slug or unassigned>" \
  --sources "<url1>,<url2>,..." \
  --slug "<optional-custom-slug>" \
  --summary "<one-line summary for INDEX.json>" \
  --content "<full markdown body>"
```

The script writes `docs/briefs/<slug>.md` with this frontmatter:

```yaml
---
title: <topic>
topic: <canonical topic tag>
skill: <name of skill that wrote it>
date: <YYYY-MM-DD>
project: <slug or 'unassigned'>
sources:
  - <url1>
  - <url2>
---
```

It also updates `docs/briefs/INDEX.json` — mapping `project slug → list of brief entries`.

---

## -webpage Variant

Any skill can be suffixed with `-webpage` (e.g. `/research-person-webpage`) to also publish the brief to `aheadofmarket.com/briefs/<slug>`.

After writing the brief, the `-webpage` variant invokes `/brand-page` (Steffen's rendering layer) with the brief path and slug.

> **Dependency note:** The `/briefs/<slug>` route on aheadofmarket.com does not exist yet. Before a -webpage variant can go live, scaffold the route in `src/pages/` and add it to the Vercel routing config. This is a known prerequisite — do not fake the URL.

---

## -add Variant (Knowledge Injection)

Any skill can be suffixed with `-add` (e.g. `/research-person-add`) to inject the finished brief into an agent's knowledge folder.

After writing the brief, the `-add` variant:

1. Determines the target: specific agent slug or `all`.
2. Copies `docs/briefs/<slug>.md` into:
   - Single agent: `projects/<agent>/knowledge/<slug>.md`
   - All agents: loops over every folder in `projects/` and copies to each `knowledge/` sub-folder.
3. Confirms injection with a list of destinations.

---

## Confirmation Output

After every research run, print:

```
[research-<skill>] Brief written: docs/briefs/<slug>.md
[research-<skill>] INDEX.json updated: <project> -> <slug>
[research-<skill>] Sources: <n> cited
```

If -webpage: also print the URL (or the dependency warning if the route isn't live).
If -add: print each knowledge path the brief was injected into.
