# Live-design in the eye — mechanism spec (Corner v2 goal, item 4)

**Mission:** `corner:corner-v2`. Written 2026-09-09 by Claude. This specs the
MECHANISM only — the plumbing that lets an agent build live in the Visual Window.
It deliberately does NOT design the look of the surface: per the house rule,
Patrik names the references for anything visual, and that call is his (noted at
the foot).

## Patrik's words (goal, 2026-09-09)

- "Imagine: 'Let's make a yellow website about bikes' … the agent works live to
  generate images … with no friction of pushing, committing or pulling until they
  are ready."
- "Design it — it would live in the context window. That's the real point of the
  context windows."

So: the eye (Visual Window) becomes a live-localhost. You ask, the thing appears
IN the eye, you redirect in chat, it changes in front of you, and nothing is
committed or deployed until you say ship.

## What already exists to build on

- Visual Window renders web/HTML artifacts today: web `ArtifactStage.tsx` has a
  `liveUrl: string | null` slot and an offline HTML stand-in (`SITE_DEMO`); native
  has `WebArtifactView.swift` + `ArtifactRenderer.swift`.
- The team bridge already streams agent turns to the client.
- The gateway daemon already syncs files Dropbox-style with 18h local retention —
  the natural home for a scratch draft.

## The mechanism (four parts)

1. **A DRAFT artifact.** A new artifact state: agent-owned scratch HTML/CSS/asset
   folder the agent edits in place. It is NOT a committed file and NOT a deployed
   URL — it lives in the gateway's local scratch cache (18h retention, self-cleaning).
   One draft per design thread; opening it puts it on the stage as the active tab.

2. **The eye renders the draft LIVE.** Web: an iframe/`srcdoc` view bound to the
   draft that reloads on change (extends `ArtifactStage`'s liveUrl path — a draft
   is just a local liveUrl). Native: `WebArtifactView` pointed at the draft, same
   reload. The offline `SITE_DEMO` stand-in becomes the empty-draft placeholder.

3. **The iterate loop (no push/pull).** user message → agent edits the draft files
   in the scratch dir → the bridge emits a `draft-updated` event for that artifact
   → the eye hot-reloads → user redirects in chat ("more yellow", "bigger hero").
   No git, no deploy, no refresh button. The agent generates images/video via
   KIE (kie.ai — the user-facing gen pool; ties to item 3) straight into the
   draft's asset folder; the next reload shows them.

4. **"Ready" is the only commit.** Only when the user says ship does the draft
   graduate: the agent publishes it to a real artifact / repo / deploy target and
   writes the ledger line. Before that, closing the thread just lets the 18h cache
   reclaim it. This is the whole "no friction until ready" ask.

## Boundaries

- The draft never auto-commits, auto-deploys, or sends anything — graduation is an
  explicit user "ship" (same discipline as chat's outbound gate).
- Scratch stays in the gateway cache under the user's token; nothing secret in it
  is logged or committed.
- Hot-reload must be snappy (Patrik on the gateway: "it will need to be snappy").
  Target: an edit shows in the eye in under ~1s, or it doesn't feel live.

## Decisions only Patrik can make

1. **The look of the surface itself** (the live-design view: how the draft frames
   on the stage, the "editing / live / ready" affordances). His references call —
   he names 2-3 before any pixels. The mechanism above renders whatever that
   design specifies.
2. **What "ship" targets per artifact type.** A site → deploy where (Vercel? a
   gateway-served URL?); a deck/doc → saved where. v1 recommendation: HTML site
   drafts only, "ship" = publish to a gateway-served URL (no external deploy), so
   the whole loop stays on the machine until he wants more.
3. **Scope of v1.** HTML/site drafts only, or also decks and other artifacts?
   Recommendation: HTML/site first — it's what "yellow bikes site" is, and the eye
   already renders HTML.

## First round when unblocked (proposed)

Given decision 3 = HTML-first: a draft artifact in the gateway scratch dir + the
eye bound to it with a `draft-updated` hot-reload, driven by one real loop —
"make a yellow site about bikes," two redirects, images generated into the draft,
each showing in the eye under ~1s, then a "ship" that publishes to a
gateway-served URL and writes the ledger line. That proves live-iterate +
graduate-on-ready end to end.
