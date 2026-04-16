---
name: research-podcast
description: Find the most relevant podcast episodes on a topic, pull transcripts or summaries, synthesize into a brief. Same pattern as research-youtube.
trigger: /research-podcast
user-invocable: true
---

# research-podcast

Find the most relevant podcast episodes on a topic, extract key insights from transcripts or show notes, synthesize into a brief.

## Usage

```
/research-podcast <topic> [project=<slug>] [add=<agent|all>]
```

## Research Loop

### 1. Find Episodes
```
WebSearch: "<topic> podcast episode 2025"
WebSearch: "<topic> best podcast episode interview"
WebSearch: "<topic> podcast transcript"
WebSearch: "site:listennotes.com <topic>"
```

Target: 5 most relevant episodes. Prefer recent (2024-2026) and authoritative hosts/guests.

### 2. Get Transcripts or Show Notes
For each episode:
```
WebSearch: "<podcast name> <episode title> transcript"
WebFetch: the episode page (show notes often have key quotes)
WebFetch: transcript page if available
```

If no transcript: use `yt-dlp` on the YouTube version if it exists:
```bash
python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
transcript = YouTubeTranscriptApi.get_transcript('VIDEO_ID')
print(' '.join([t['text'] for t in transcript]))
"
```

### 3. Synthesize
For each episode: extract the 3-5 most quotable insights. Then synthesize across all 5 episodes.

## Brief Structure

```markdown
## TL;DR
What do the podcast ecosystem's best minds say about this topic?

## Episodes

### 1. [Podcast Name] — "[Episode Title]"
Host: ... Guest: ... Date: ...
URL: ...
**Key Insights:**
- "Direct quote or paraphrase" — [Guest name]
- ...
**Best for:** Who should listen.

[... repeat for each episode ...]

## Synthesis
Common threads across episodes. Where experts agree. Where they diverge.

## Gaps
What the podcast world isn't talking about yet.

## Sources
All URLs used.
```

## Webpage Variant

Use `/research-podcast-webpage` to also publish to aheadofmarket.com/briefs/<slug>.

## Output

Call `write-brief.py`. See `.claude/skills/_research-template.md`.
