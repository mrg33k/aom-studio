---
name: research-youtube
description: Find the 5 most relevant YouTube videos on a topic, pull transcripts, synthesize into a brief. Webpage variant available via /research-youtube-webpage.
trigger: /research-youtube
user-invocable: true
---

# research-youtube

Find the 5 most relevant YouTube videos on a topic, pull their transcripts, and synthesize into a brief.

## Usage

```
/research-youtube <topic> [project=<slug>] [add=<agent|all>]
```

## Research Loop

### 1. Find Videos
```
WebSearch: "<topic> youtube 2025 2026"
WebSearch: "<topic> tutorial youtube"
WebSearch: "<topic> explained youtube"
WebSearch: "<topic> documentary youtube"
```

Select the 5 most relevant videos based on title, channel authority, and recency.

### 2. Pull Transcripts
For each video, use `yt-dlp` (if available) or the transcript API:

```bash
# Get transcript
python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
transcript = YouTubeTranscriptApi.get_transcript('VIDEO_ID')
print(' '.join([t['text'] for t in transcript]))
"
```

If transcript unavailable: note it, summarize based on title/description via `WebFetch` of the YouTube page.

### 3. Synthesize
For each video, extract:
- Key argument or main takeaway
- Most useful timestamp / section
- Who it's for (beginner, expert, practitioner)

Then synthesize across all 5: what's the consensus? What's missing? What's the best entry point?

## Brief Structure

```markdown
## TL;DR
What do the best YouTube voices say about this topic?

## Videos

### 1. [Title] — [Channel] ([duration])
URL: ...
**Summary:** One paragraph.
**Best for:** Who should watch this.
**Key timestamp:** MM:SS — [what happens there]

[... repeat for each video ...]

## Synthesis
What's the consensus across these videos? Where do they diverge?

## Gaps
What angle is missing from YouTube coverage?
```

## Webpage Variant

Use `/research-youtube-webpage` to also publish to aheadofmarket.com/briefs/<slug>.

## Output

Call `write-brief.py`. See `.Codex/skills/_research-template.md`.
