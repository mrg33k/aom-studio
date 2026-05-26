---
name: research-competitor
description: Single competitor deep-dive: site, social, press, pricing, positioning. Outputs a brief with gaps and opportunities.
trigger: /research-competitor
user-invocable: true
---

# research-competitor

Profile a single competitor in depth: website, social presence, press coverage, pricing, positioning. Output a brief with clear gaps and opportunities.

## Usage

```
/research-competitor <competitor name> [project=<slug>]
```

## Research Loop

### 1. Website & Product
```
WebSearch: "<competitor> product features pricing"
WebFetch: their homepage
WebFetch: their pricing page (if exists)
WebFetch: their docs/features page
```

### 2. Social & Community
```
WebSearch: "<competitor> twitter linkedin 2025"
WebSearch: "<competitor> reddit discussion"
WebSearch: "<competitor> customer reviews"
```

Fetch: top 2-3 review pages (G2, Capterra, Trustpilot, Reddit threads).

### 3. Press & Funding
```
WebSearch: "<competitor> funding raise 2024 2025"
WebSearch: "<competitor> news announcement"
WebSearch: "<competitor> techcrunch"
```

### 4. Positioning
```
WebSearch: "<competitor> vs <category alternatives>"
WebSearch: "<competitor> target customer"
WebSearch: "<competitor> case study"
```

## Brief Structure

```markdown
## Company Overview
Name, founded, HQ, funding, team size (if known).

## Product
What they actually sell. Key features. Notable differentiators.

## Pricing
Tiers, price points, free tier if any. Model (seat/usage/flat).

## Positioning
How they describe themselves. Who they target. Tone of voice.

## Strengths
What they do well. Where they win deals.

## Weaknesses
Where they lose. Common complaints from reviews/Reddit.

## Gaps & Opportunities
Where AOM / the client has a clear opening. What this competitor ignores.

## Sources
All URLs used.
```

## Output

Call `write-brief.py`. See `.Codex/skills/_research-template.md`.
