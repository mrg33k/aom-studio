---
name: research-pattern
description: "How do the best X do Y": pull 10 examples, extract the shared pattern. Output a pattern brief with examples.
trigger: /research-pattern
user-invocable: true
---

# research-pattern

Extract patterns from the best examples in a category. How do the best X do Y? Pull 10 real examples, find the shared pattern.

## Usage

```
/research-pattern "<how do the best X do Y>" [project=<slug>]
```

Example: `/research-pattern "how do the best SaaS companies handle churn"`

## Research Loop

### 1. Find Examples
```
WebSearch: "best examples of <Y> by <X>"
WebSearch: "<X> <Y> case study examples"
WebSearch: "<X> <Y> breakdown teardown"
WebSearch: "how <notable X> does <Y>"
```

Target: 10 concrete examples. For each, `WebFetch` the most detailed source.

### 2. Extract the Pattern
For each example, document:
- What they do specifically
- Why it works (their reasoning if stated)
- The result / outcome

Then look across all 10: what's shared? What's unique? What's table stakes vs. differentiator?

### 3. Counter-examples
```
WebSearch: "<X> <Y> failure mistake"
WebSearch: "why <Y> doesn't work for <X>"
```

What do the bad versions do? What's the anti-pattern?

## Brief Structure

```markdown
## The Pattern in One Sentence
What do the best X do, boiled down to a single principle.

## The 10 Examples

### 1. [Name/Company]
What they do: ...
Why it works: ...
Source: URL

[... repeat for each ...]

## Shared Elements
What appears in 7+ of the 10 examples. This is the core pattern.

## Variations
What the top performers do differently from each other.

## Anti-Pattern
What the mediocre versions do instead.

## How to Apply
3-5 concrete action steps based on the pattern.

## Sources
All URLs used.
```

## Output

Call `write-brief.py`. See `.Codex/skills/_research-template.md`.
