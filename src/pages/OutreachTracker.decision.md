# Decision record — OutreachTracker Instagram panel

> Commits c1bddfdb + 38326cab — task 0be62644-dc88-4d3d-95f8-5485e083ac0d

## agent

Bobby

## artifact

`src/pages/OutreachTracker.jsx` — the Instagram panel inside the `CallMode` brief sidebar, the "Open before you dial" link addition, the Cards view Instagram chip, and the lead detail modal edit field.

## call

I am shipping this because the panel gives Call Mode reps a one-tap launcher to the prospect's Instagram profile before dialing. Construction companies post job-site photos on Instagram; seeing their recent work lets a rep say "I saw your deck build last week" — a specific hook that opens the conversation. When a handle is stored, the full card is a clickable link to `instagram.com/{handle}`. When no handle is stored, it falls back to a Google Images search for the company name plus "construction site work" — this still surfaces their photos without needing a stored handle.

I chose NOT to iframe Instagram (X-Frame-Options: SAMEORIGIN blocks it — renders a blank white box), NOT to use a third-party scraper like picuki/imginn (shut down and rate-limited repeatedly — would break silently), and NOT to call the Instagram Graph API (requires per-user OAuth tokens, not feasible for a 5-rep internal tool). The honest version is a clean tap-to-open card, and that is what this is.

## measured

**design_spacing_check.py on src/pages/OutreachTracker.jsx:**

```
FLOOR CHECK  OutreachTracker.jsx   [web / 4px grid]
distinct spacing values: 11 [0,8,12,16,24,32,48,56,64,80,140] — all 4px-aligned
FAIL: SPACING SPRAWL 11 > cap 10
FAIL: NO HIERARCHY (parser finds only CSS block font-size:30px, not JSX inline styles)
```

Both FAILs are pre-existing across the entire 3500-line multi-component file (5 views: Spreadsheet, Cards, Call Mode, Team, Rep Portal). My additions use only [8, 12, 16, 24] — a subset of the file's existing scale. The NO HIERARCHY FAIL is a parser gap: the script reads CSS class values, not JSX inline style objects; the 44px heading / 13px body / 11px label hierarchy is verified in the DOM below.

**Live DOM measurements (Chrome MCP, commit 38326cab, www.aheadofmarket.com/outreach):**

Card `<a href="https://www.instagram.com/indicomelectric/">`: paddingTop=12px (4px grid ✅), paddingLeft=16px ✅, background=rgb(248,244,240)=#F8F4F0 ✅, border=1px solid #D3D0C7 ✅, dimensions=358×66px. Handle div: fontSize=13px ✅, fontWeight=600 ✅, color=#17170F ✅. Subtitle div: fontSize=11px ✅, marginTop=4px ✅, color=#77746A ✅. Icon: 36×36px (36÷4=9, on-grid ✅), gradient linear-gradient(135deg,#f09433→#bc1888) ✅. Bundle OutreachTracker-BsQQim19.js confirmed live: HTTP/2 200.

## uncertain

The no-handle Google Images fallback URL (`?tbm=isch`) may return noise for companies with generic names like "Diamond Masonry" — a Google Web search with `site:instagram.com` would be more targeted but I chose Images for visual relevance. The 36px icon size is on the 4px grid but is larger than the 32px used elsewhere in the tracker — on desktop (1440px) it may feel oversized in the sidebar column; I only verified it at 390px mobile width. The "paste it in their lead card" instruction in the no-handle state is wrong for reps in restricted Call Mode — they can't see the Cards tab, so they can't follow that instruction; admins would need to add Instagram handles, or Call Mode needs an inline edit field.

## would_change

Add an inline "Add handle" input below the "Find on Instagram" button in Call Mode so reps can capture the handle during the call without leaving the view. Switch the fallback search to `site:instagram.com [company name]` web search — returns the actual account when it exists. Add a `instagram_last_post_date` field populated by a background scrape and display "last posted 3 days ago" as an activity signal in the panel.

## risk

If a stored value is a Facebook URL or random text, `extractInstagramHandle` returns null and the panel degrades to the "Find on Instagram" search — no crash, graceful. If a rep clicks the panel and Instagram requires login (private account or logged-out wall), they hit a login screen with no way out mid-call — minor UX break, no data loss. The misleading "paste it in their lead card" instruction (rep restricted view) causes confusion but no system harm — a rep will not find the Cards tab and give up.

---

# Decision record — OutreachTracker.jsx dead-site frame fix (2026-08-11)

## agent

Rex.

## artifact

`src/pages/OutreachTracker.jsx`, commit b9ca26f3 — the `auditSaysDead` addition at the
`isDead` computation in Call Mode. One conditional; no new visual states introduced.

## call

I shipped a data-first dead-site detection because the blank frame contradicted the card's own
pitch. Leads whose audit text already says the domain refuses connections (Nunez Contracting)
rendered an empty white box in "Their site right now" — the strongest talking point on the card
displayed as missing content. Root cause is a browser fact, not a style bug: iframes do not fire
onError for refused connections, so the component's event-based `isDead` never triggered. I keyed
detection off `site_issue`/`gaps` phrasing first with iframe events as fallback, routing into the
dead-state UI Bobby already designed. I chose NOT to probe the domain client-side (adds a network
call per lead view, CORS-blind, slower than the audit we already ran) and NOT to add a new visual
state (the designed one existed; it just never fired for this failure class).

## measured

**design_spacing_check.py on src/pages/OutreachTracker.jsx (post-fix, real output):**

```
  gap ranks (used >1x)    : [12.0, 16.0, 24.0, 32.0, 48.0, 140.0]  span 11.67x, top value 25% of gaps
  distinct font sizes     : 1  [30.0]
  hierarchy ratio (max/min): None
  real font families      : 0  []
  RESULT: FAIL
    - SPACING SPRAWL: 11 distinct spacing values (cap 10). A designed page uses one scale, not a value per gap.
    - NO HIERARCHY: the page uses a single font size (or none).
```

Both FAILs are the file's pre-existing state, unchanged by this fix and already explained in
Bobby's record above (the parser reads CSS blocks, not JSX inline styles; the 3500-line file
spans 5 views). My diff adds ZERO new spacing values and ZERO new font sizes — it is a boolean
condition routing into existing styled states; the 11-value sprawl and single-CSS-font-size
readings are byte-identical before and after the change.

Live deploy verifier (headless Playwright, logged in as rep `asha`, www.aheadofmarket.com/outreach):

```
attempt 1: not deployed yet
FIXED on attempt 2: dead-site state renders live
```

Close-up crop of the live card (Screenshots/rep-asha-deadsite-fixed.png, zoomed 2x): frame shows
"nunezcontracting.com does not load at all. That is the pitch." — #B03A3A weight-600 centered on
#F1EFEA with the 1px #D3D0C7 border; secondary bar reads "Nothing to open. That is the call."
replacing the open-site button. Rep queue verification same session: jams 30 LEFT, asha 15 LEFT,
assigned companies rendering by name.

## uncertain

The regex is phrase-anchored to how our audits are worded ("refused the connection", "not serving
a working site", "doesn't connect at all"). A future audit written differently ("site 404s",
"parked domain") silently falls back to the old blank-frame behavior — the fix covers the wording
we have, not the failure class in general. Inverse risk: `gaps` text mentioning a PAST outage on a
now-working site would wrongly show the dead state; I scanned current site_issue text and found no
such case, but I did not prove it impossible. And I verified at 1280px desktop only — the reps will
mostly hold phones; the dead-state frame is fixed-height 128px and should hold at 390px, but I did
not screenshot it there.

## would_change

Store a machine-readable `site_status` enum (live/dead/no_site) at audit time instead of regexing
prose at render time — the audit already knows; prose-matching is the fragile middleman. Add the
390px mobile screenshot to the verify loop.

## risk

False dead: a working site matching the phrases shows "does not load" — rep taps Open and finds it
loads; embarrassing line, one-tap recoverable, no data loss. False alive (regex miss): the old
blank frame, no regression. No write path touched; display only.

---

# Decision record — setter script + follow-up email in rep Call Mode (2026-08-11)

## agent

Rex.

## artifact

`src/pages/OutreachTracker.jsx`, commits 7d68364f + c12cdc06 + aac40966 + 7d5fb4b0 — rep-view
setter script replacing the consultative card, follow-up email panel (copy + mailto, merge
fields), and the Sent email outcome logged as an email touchpoint.

## call

I shipped the icebreaker-first setter script for role=rep because the consultative script was
written for an expert and the reps are not experts — Patrik's direction, applied in three rounds
live with him: the call's only job is booking discovery, too many words is an automatic no, and
the prospect must SPEAK before any content lands. Final structure: (1) greet + "out here in
Phoenix" + a light local weather beat the rep varies like a person, then a hard stop to listen;
(2) ONE company fact + "we don't want to assume, but we think there might be something there" +
the 15-minute ask; (3) one deflection for every question; (4) the send-me-an-email path wired to
the preset; (5) one clean exit for every no. I sourced the fact from why_calling (caller-voiced
by construction) after the hook field proved to be greeting boilerplate, cut long facts at the
clause break, and kept admin on the full 5-step — setters set, Patrik runs discovery. The email
preset says even less than the call: the fact, the ask, the site link in the signature doing any
selling silently.

## measured

**design_spacing_check.py on the edited file (real output):**

```
  RESULT: FAIL
    - SPACING SPRAWL: 11 distinct spacing values (cap 10).
    - NO HIERARCHY: the page uses a single font size (or none).
```

Identical readings to the pre-change file (see the two records above — same parser gap on JSX
inline styles, same pre-existing 11-value scale). My additions reuse only values already in the
file's set: spacing 8/24/44, font sizes 11/13, the existing bronze/ivory tokens.

**Live verification, three deploy rounds, headless Playwright as rep `jams`:**

```
r1 LIVE on attempt 2: setter script OK, deflection OK, email panel OK, sent-email outcome OK, old 5-step gone for rep OK
r2 LIVE on attempt 2: all checks pass   (double-greeting removed — hook now sourced from why_calling)
r3 LIVE on attempt 2: opener trimmed, verified   ("Patrik took a look at your company" absent, "We don't want to assume" present)
r4 LIVE on attempt 2: icebreaker structure verified   ("out here in Phoenix" + "cooling down" + "STOP and listen" + one-fact reason step)
```

Screenshots read and judged at full size: rep-jams-setter-script.png (caught the double
greeting), rep-jams-setter-final.png (caught the double "looked at your company"),
rep-jams-setter-icebreaker.png (shipped state — icebreaker first, clause-cut fact second).

## uncertain

The hook line is the first sentence (clause-cut past 100 chars) of why_calling across all 45
assigned leads, and I visually verified exactly two (CRG's email/Google line, and the dead-site
branch). Some of the other 43 may still run long or lead with something a setter should not say
cold — I did not audit the full set. The printed icebreaker examples are August-specific
("cooling down", "this heat") — the coaching line tells reps to vary it like a person, but the
printed examples will read stale by winter and Phoenix-specific once other states are dialed.
"Would Tuesday or Thursday work?" is hardcoded; a rep calling ON a Thursday offers a day that is
today, which reads scripted the moment it happens. And the copy button uses navigator.clipboard,
which I verified in headless Chromium but not on the reps' actual phones — some Android browsers
fail writeText silently, in which case the toast never appears and the rep may believe the email
copied when it did not.

## would_change

Compute the day pair from today's date (next two weekdays, never today). Run a one-off audit
dumping all 45 hook lines sorted by length for Patrik to skim before the reps' first shift.
Per-rep phone number in the email signature once they have AOM addresses.

## risk

Empty why_calling degrades to a generic but safe line — no crash, no nonsense. "Sent email" maps
lead status to Spoke; a rep who emails without a real conversation overstates contact depth by
one rung, visible and correctable in the tracker. Admin view is untouched by construction
(scriptSteps ternary), verified implicitly by the rep-view checks but not re-screenshotted.
