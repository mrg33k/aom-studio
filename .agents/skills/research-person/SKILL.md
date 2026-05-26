---
name: research-person
description: Profile a prospect or founder: LinkedIn, content, interviews, priorities. Brief for outreach or meeting prep.
trigger: /research-person
user-invocable: true
---

# research-person

Profile a person — prospect, founder, partner — for outreach or meeting prep. Pull LinkedIn, published content, interviews, and stated priorities.

## Usage

```
/research-person "<full name>" [context=<company or role>] [project=<slug>]
```

## Research Loop

### 1. Identity & Role
```
WebSearch: "<name> <company> linkedin"
WebSearch: "<name> <company> founder CEO"
WebFetch: their LinkedIn profile (if public)
```

### 2. Published Content
```
WebSearch: "<name> interview podcast"
WebSearch: "<name> essay article blog"
WebSearch: "<name> twitter linkedin posts"
```

Fetch 2-3 of their best pieces or interviews. Extract actual quotes.

### 3. Priorities & Worldview
```
WebSearch: "<name> believes thinks about"
WebSearch: "<name> keynote talk youtube"
WebSearch: "<name> <company> strategy 2025"
```

### 4. Recent Activity
```
WebSearch: "<name> news announcement 2024 2025"
WebSearch: "<name> <company> hire raise product"
```

## Brief Structure

```markdown
## Who They Are
Name, current role, company. One-sentence summary.

## Background
Career arc. Key milestones. Where they came from.

## What They Care About
Their stated priorities, themes they write/speak about. Direct quotes where possible.

## Current Focus
What they're working on right now. What problems keep them up at night.

## Best Entry Points
- Common ground: shared interest/angle
- Best hook for outreach
- Topics to avoid

## Conversation Starters
3 specific, non-generic things to open with.

## Sources
All URLs used.
```

## Output

Call `write-brief.py`. See `.Codex/skills/_research-template.md`.
