---
name: research-deeply-webpage
description: Same as research-deeply but also publishes the brief to aheadofmarket.com/briefs/<slug> via Steffen's brand-page system.
trigger: /research-deeply-webpage
user-invocable: true
---

# research-deeply-webpage

Same as `/research-deeply` — full Reddit + forums + deep web research — but after writing the brief, also publishes it to aheadofmarket.com.

## Usage

```
/research-deeply-webpage <topic> [project=<slug>]
```

## Steps

1. Run the full `/research-deeply` research loop (see that skill).
2. Write the brief via `write-brief.py`.
3. Invoke `/brand-page` with:
   - `brief_path`: `docs/briefs/<slug>.md`
   - `slug`: the brief slug
   - `route`: `/briefs/<slug>`

## Webpage Dependency

> The `/briefs/<slug>` route does not exist yet on aheadofmarket.com.
> Before this variant goes live: scaffold `src/pages/Briefs.jsx` (or equivalent dynamic route), add it to Vercel routing config, and deploy.
> Until that route exists, report the brief path and note the URL that WILL be live once the route is scaffolded.

## Output

After completion, print:

```
[research-deeply-webpage] Brief written: docs/briefs/<slug>.md
[research-deeply-webpage] Webpage: https://aheadofmarket.com/briefs/<slug>
  (NOTE: route not yet live — scaffold src/pages/Briefs.jsx first)
```
