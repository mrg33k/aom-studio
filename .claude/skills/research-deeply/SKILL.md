---
name: research-deeply
description: Deep research on any topic via Reddit, niche forums, and web search. Finds communities that worship the topic. Outputs a brief to docs/briefs/.
trigger: /research-deeply
user-invocable: true
---

# research-deeply

Deep-dive research: Reddit threads, niche forums, Google search, community discussions. Find the people who are obsessed with the topic — not just the marketing pages.

## Usage

```
/research-deeply <topic> [project=<slug>] [add=<agent|all>]
```

## Research Loop

Run all searches in parallel where possible:

### 1. Reddit + Forums
```
WebSearch: "<topic> site:reddit.com"
WebSearch: "<topic> reddit 2025 2026 discussion"
WebSearch: "<topic> forum community enthusiasts"
WebSearch: "<topic> discord slack community"
```

For each promising thread/post: `WebFetch` the page and extract real opinions, heated debates, consensus views, and outsider takes.

### 2. Niche Communities
```
WebSearch: "<topic> forum enthusiasts niche"
WebSearch: "best forum for <topic>"
WebSearch: "<topic> subreddit wiki"
```

Identify the 2-3 communities that LIVE this topic. What are their names? What do they argue about? What's the orthodoxy vs. the heresy?

### 3. Deep Web Search
```
WebSearch: "<topic> best practices 2025 2026"
WebSearch: "<topic> vs alternatives comparison"
WebSearch: "<topic> criticism problems downsides"
WebSearch: "<topic> hidden gem underrated"
```

`WebFetch` the 3-5 most relevant pages in full.

## Brief Structure

```markdown
## TL;DR
One paragraph. What is the consensus? What's the real story underneath?

## Communities That Worship This
List each community (subreddit, forum, Discord) with a one-line description of their vibe.

## What the Believers Say
Top arguments for / best use cases. Cite specific posts/threads.

## What the Critics Say
Real objections, not strawmen. Where does the consensus break down?

## Hidden Gems
Underrated angles, counterintuitive takes, or niche sub-topics most people miss.

## Key Sources
List all URLs used.
```

## Output

Call `write-brief.py` with the above content. See `.claude/skills/_research-template.md` for the exact command.
