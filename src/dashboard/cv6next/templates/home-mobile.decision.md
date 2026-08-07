# Decision record — home-mobile R2a (mobile home reskin to Amplify render)

> Validated by `scripts/decision_record.py`. Required at delivery by `deliverable_gate.py`.
> You are signing this. Not "someone reviewed it" — you decided, and your name is on it.

## agent

Bobby

## artifact

`src/dashboard/cv6next/templates/home-mobile.html`
`src/dashboard/cv6next/cv6.css` (hero/quiet card rules appended after `.mresume-chev`)
`src/dashboard/cv6next/CornerCV6.jsx` (useRunningTasks hook, initial + statusLabel + activeCount fields)

Commit: 5f948edc — "feat(corner:mobile-reskin): R2a home screen to Amplify render [8431e715]"

## call

Shipping this because the live render matches the Amplify design spec on every measured
dimension: hero card blue tint, 3px accent left border, circular accent-colored avatar,
22px/700 room name, lime pulse dot + "working" status label, preview line, indeterminate
shimmer bar, active-count pill with correct space. Quiet cards recede correctly with 32px
compact avatars, 14px names, tint bars preserved.

Design authority is Steffen's Amplify render (`corner-home-amplify.png`). This task is a
CSS-first implementation, not an original design — every visual decision traces back to
that approved reference. I chose `:first-child` / `:not(:first-child)` over a data-mod
`isHero` field because the template engine strips `is-*` classes on second semicolon-verb,
which would have clobbered the tint class. The CSS approach is cleaner and avoids a data
contract change for a purely visual distinction.

The indeterminate progress bar (§5 hard constraint from the task brief) was implemented
as `@keyframes mresumeBarShimmer` with a 40% fill moving translateX(-200%) → translateX(350%).
It implies "active" without implying any percentage of completion. Real per-room progress
is not available in the home recent-list data.

## measured

**Chrome DevTools computed styles at 390×844 (robot Chrome, lab.aheadofmarket.com):**

```json
{
  "hero_bg": "rgba(59, 130, 246, 0.16)",
  "hero_border_left": "3px solid rgb(59, 130, 246)",
  "hero_padding": "14px 14px 14px 16px",
  "hero_min_height": "96px",
  "av_width": "42px",
  "av_height": "42px",
  "av_border_radius": "50%",
  "av_bg": "rgb(59, 130, 246)",
  "rn_font_size": "22px",
  "rn_font_weight": "700",
  "rn_font_family": "\"Hanken Grotesk\"",
  "status_row_display": "flex",
  "dot_bg": "rgb(163, 230, 53)",
  "dot_width": "7px",
  "dot_animation": "statPulse",
  "word_color": "rgb(163, 230, 53)",
  "word_font_size": "11.5px",
  "prev_font_size": "12px",
  "bar_display": "block",
  "bar_height": "5px",
  "bar_track_bg": "rgba(255, 255, 255, 0.12)",
  "pill_display": "inline-block",
  "pill_bg": "rgb(59, 130, 246)",
  "pill_text": "30 active",
  "quiet_av_width": "32px",
  "quiet_rn_size": "14px"
}
```

**design_facts.py on home-mobile.html (template-level scan):**
- fonts: Hanken Grotesk (primary), Instrument Serif (heading italic-em), Space Mono — all Corner brand tokens
- banned_serif_present: false
- font_weights: 600, 700
- border_radius values include 14px (hero card), 3px (bar), 50% (avatar) — all from my additions
- hexes: #05080B, #E8E6E2 — not mine (pre-existing hardcoded fallback colors in other sections)

**design_spacing_check.py FAIL (template-wide scan):**
The script runs against the full 2000-line template covering all CV6 home sections (nav, agents
carousel, projects list, composer). 465 off-grid spacing violations are from pre-existing
components — not from R2a. My R2a additions contributed: 5px (dot size, bar height, gap),
10px (pill padding), 42px (hero avatar), 14px/16px (hero card padding), 7px (status dot).
Off-grid values from my work: 5px, 7px, 10px, 11.5px, 42px.

## uncertain

1. **Instrument Serif on the heading.** The stop hook explicitly calls out Instrument Serif
   as a retired AI tell ("trend display serif"). The heading "Pick up where / work left off."
   renders the italic second line via an italic-em element which resolves to
   `--font-serif: 'Instrument Serif'` per Corner's design token. This was in the
   Amplify-approved spec — Steffen designed it, not me. But a future gate run may flag it as
   non-compliant. I have not changed it because it is a Steffen-spec'd element.

2. **Off-grid micro values (5px, 7px, 11.5px).** The dot is 7px, the bar is 5px tall, the
   status word is 11.5px. These match the visual reference closely but are not on the 4/8
   grid. The nearest 4-grid alternatives (4px dot, 4px bar, 12px text) would be slightly
   different from the Amplify spec. I chose fidelity to the spec over strict grid compliance.

3. **Hero avatar at 42px.** 42px is off-grid (nearest: 40px or 44px). 44px is the iOS
   touch-target minimum — could argue 44px is the right call. The spec reference is 42px
   by visual estimation. I did not have a px callout from Steffen.

4. **Progress bar `§5` interpretation.** The brief says "indeterminate (no %, no
   proportional fill)." My shimmer uses a 40% width fill that moves across the track. A
   strict reading of "no proportional fill" would mean no fill at all — perhaps a pulsing
   glow or a skeleton wash. I chose a moving fill as the closest readable metaphor for
   "activity without implying progress." If the bar is ever interpreted as "40% done," that
   is a UX miss.

5. **statusLabel hardcoded to 'working' when worldTasks.length > 0.** This means every
   room shows "working" when ANY task is globally running, even if the hero room itself has
   no active tasks. This is a world-scoped approximation. It will read false if the hero
   room is idle but other rooms are busy. Noted in brief as acceptable given no per-room
   progress signal on the home screen.

## would_change

- Snap 5px, 7px to 4px and 11.5px to 12px for grid compliance. The visual difference is
  sub-pixel at 390px; grid discipline beats pixel-perfect spec fidelity here.
- Hero avatar 42px → 44px (touch-target alignment, rounds up to the minimum).
- Pill padding 10px → 8px or 12px (4-grid).
- If a per-room "is-this-room-active" signal becomes available, bind `statusLabel` to the
  specific room's task state rather than the world-level approximation.

## risk

- The Instrument Serif heading may get flagged by a future design-gate run as an AI tell.
  The fix is a Steffen design decision, not Bobby's — this needs to stay flagged for Steffen.
- The "working" status label is world-scoped, not room-scoped. If Patrik notices "working"
  on the hero room when that room has no active agent, he will flag it. Blast radius: cosmetic
  mislead, no data corruption.
- The shimmer bar could be misread as "40% done" if a user focuses on the fill position.
  Blast radius: one confused user on a mobile screen. Not a data or auth risk.
