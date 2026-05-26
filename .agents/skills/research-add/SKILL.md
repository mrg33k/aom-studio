---
name: research-add
description: Run research on a topic and inject the resulting brief into one or all agents' knowledge folders.
trigger: /research-add
user-invocable: true
---

# research-add

Research a topic (using the deep research loop) and inject the resulting brief directly into an agent's knowledge folder.

## Usage

```
/research-add <topic> add=<agent-slug|all> [project=<slug>]
```

- `add=elon` — injects into `projects/elon/knowledge/`
- `add=all` — injects into every agent under `projects/*/knowledge/`

## Steps

1. Run the `/research-deeply` research loop for the topic.
2. Write the brief via `write-brief.py`.
3. Determine injection target:
   - If `add=<agent>`: copy `docs/briefs/<slug>.md` → `projects/<agent>/knowledge/<slug>.md`
   - If `add=all`: list all folders in `projects/`, create `knowledge/` sub-folder if missing, copy to each.
4. Confirm each injection.

## Knowledge Folder Convention

Knowledge folders live at:
```
projects/<agent-slug>/knowledge/<slug>.md
```

If `projects/<agent-slug>/knowledge/` doesn't exist, create it.

## Output

```
[research-add] Brief written: docs/briefs/<slug>.md
[research-add] Injected into:
  - projects/elon/knowledge/<slug>.md
  - projects/rex/knowledge/<slug>.md
  [... or just the one agent ...]
```
