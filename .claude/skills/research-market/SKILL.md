---
name: research-market
description: Market sizing, trends, key players, and timing. Sources cited. TAM/SAM style.
trigger: /research-market
user-invocable: true
---

# research-market

Market research: sizing, trends, key players, timing. Output a TAM/SAM-style brief with cited sources.

## Usage

```
/research-market <market or category> [project=<slug>]
```

## Research Loop

### 1. Market Size
```
WebSearch: "<market> market size 2025 TAM"
WebSearch: "<market> total addressable market report"
WebSearch: "<market> revenue forecast 2025 2026 2027"
```

Fetch the most credible reports/estimates. Note the source and year for each number.

### 2. Trends
```
WebSearch: "<market> trends 2025 2026"
WebSearch: "<market> growth drivers"
WebSearch: "<market> disruption emerging"
```

### 3. Key Players
```
WebSearch: "<market> top companies 2025"
WebSearch: "<market> market leaders"
WebSearch: "<market> startups funding"
```

### 4. Timing & Window
```
WebSearch: "<market> timing entry window"
WebSearch: "<market> regulation upcoming"
WebSearch: "<market> consolidation acquisition"
```

## Brief Structure

```markdown
## Market Overview
What is this market? What problem does it solve? One paragraph.

## Size
- TAM: $X billion (source, year)
- SAM (our slice): $X billion
- SOM (realistic target): $X million
- Growth rate: X% CAGR (source)

## Key Trends
1. Trend — what it means for timing
2. ...

## Key Players
| Company | Stage | Notes |
|---------|-------|-------|
| ...     | ...   | ...   |

## Timing Assessment
Is now the right time to enter? Why?

## Sources
All URLs used.
```

## Output

Call `write-brief.py`. See `.claude/skills/_research-template.md`.
