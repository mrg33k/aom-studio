---
name: research-x-community
description: X/Twitter version of research-deeply. Find influential voices in a niche and what they're actually saying.
trigger: /research-x-community
user-invocable: true
---

# research-x-community

Map a niche on X/Twitter: who are the influential voices, what are they saying, what's the current conversation?

## Usage

```
/research-x-community <topic or niche> [project=<slug>]
```

## Research Loop

### 1. Find the Voices
```
WebSearch: "<topic> twitter influencer 2025"
WebSearch: "<topic> X account follow"
WebSearch: "<topic> best twitter accounts"
WebSearch: "<topic> niche community twitter"
```

Target: 8-12 accounts that matter in this niche.

### 2. What They're Saying
For each key account:
```
WebSearch: "site:twitter.com OR site:x.com <username> <topic>"
WebFetch: their profile / recent tweets page
```

Also search for recent threads and viral posts:
```
WebSearch: "<topic> twitter thread 2025"
WebSearch: "<topic> viral tweet thread"
```

### 3. Current Conversation
```
WebSearch: "<topic> twitter debate 2025"
WebSearch: "<topic> controversy X 2025"
WebSearch: "<topic> trending twitter"
```

What's the hot topic right now? What are people arguing about?

## Brief Structure

```markdown
## Community Map

### Tier 1: Must-Follow (>50K followers, high signal)
| Handle | Followers | What they focus on |
|--------|-----------|-------------------|
| @...   | ...       | ...               |

### Tier 2: Rising Voices (<50K, high engagement)
[same format]

## Current Conversation (as of research date)
What's being debated right now. Top 3 threads/topics.

## Dominant Narratives
The 3-5 main viewpoints in this community.

## Contrarian Takes
Who's pushing back on consensus and why.

## Best Entry Points
If you want to engage this community, what do you post about?

## Sources
All URLs used.
```

## Output

Call `write-brief.py`. See `.claude/skills/_research-template.md`.
