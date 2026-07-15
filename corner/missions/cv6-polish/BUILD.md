# CV6 Polish - Mission Build Plan

**Started:** 2026-07-15
**Mission path:** `corner:cv6-polish`

## Working protocol (every round)

1. rex writes the round brief; Codex builds headless in the mission worktree
   (`.claude/worktrees/cv6-polish/`), updates this BUILD.md, runs `node --test`,
   `npm run test:tenant-context`, and `npm run build` in its sandbox.
2. Codex CANNOT run browsers; any browser claim from Codex is unverified by definition.
   rex reruns the playwright specs externally (tmux + vite on 127.0.0.1) and screenshots
   both widths before anything lands.
3. rex lands: commit in worktree, merge to main, verify merged main as a separate step,
   push (auto-deploys), `vercel inspect --wait`, probe live URLs, screenshot and look.
4. Visual rounds complete the design gate inline here before code: name the font, the
   brand, and "This design is unmistakably Corner because ___".
5. Spec patterns that survive this repo: `?demo=<surface>` no-auth fixtures mounting the
   real component with seeded data; POST intercepts on bare paths (no `?**`);
   getByRole accessible-name asserts, not getByText.

## Rounds

### R0 - Email records: our own Sent copy on every send path

Backend truth round carried from `corner:truth-contracts` R6 (Patrik approved keeping
our own copy). On every send-success across every agent/worker send path, log the exact
outgoing email body into `support_wish_updates.kind=response` (the app's Sent copy);
Gmail stays the verification source. Manual paths (`api/support/reply.js`,
`api/support/send-staged.js`) already do this; the agent/worker paths do not.
Also correct the stale needs-patrik card that called this already built.

**Status:** queued.

### R1 - Global motion: logo loader, screen transitions, touch feedback

- Replace every generic loading state in CV6 with the Corner logo loader: the mark
  (`public/cv6/assets/corner-logo.svg` / `corner-logo-white.svg`) filling from the
  baseline up in the theme accent, on the theme ground, correct in all three themes.
  One shared component; no per-screen spinner forks. Keep honest loading language
  (`corner:cv6-loading-language` round stands).
- Screen-to-screen transitions: consistent, fast, no white flash, no layout jump when
  moving between the 7 pages (desktop tool switch + mobile drawer navigation).
- Touch feedback baseline: every tappable control gets a visible pressed/active state
  and a minimum 44px hit target on mobile; builds on the R6 template action-control
  normalization in `cv6kit/templateEngine.js`.

Design gate: font stays the CV6 system stack (`--font-sans`/`--font-mono` tokens);
brand is Corner (CV6 design system). This design is unmistakably Corner because the
loader IS the Corner mark itself filling with the theme accent (#3B82F6 family via
`--accent`) on the CV6 ground token, using the same easing vocabulary as the existing
`statPulse`/`spin` motion, and no surface anywhere shows a generic spinner.

**Status:** queued.

### R2 - Top bar consistency

One shared top bar contract across Home, Chat, Files, Review, Email, Tracker, Command,
Scribe, Settings, Search: same height, same left/right affordance order (back, title,
search, menu, profile), same accessible labels, desktop and mobile. Kill per-screen
drift in `.topbar`/`.mhdr` usage.

**Status:** queued.

### R3 - Chat feel (Patrik's number one)

Composer and send feel instant (optimistic echo already exists; make focus, key
handling, and scroll-to-new never stutter), room switching fast, day folds smooth,
chips and attachments comfortably tappable, no dead taps. Desktop and mobile.

**Status:** queued.

### R4 - Home + Search polish.

Critic queue (Steffen pass, 2026-07-15, Catch Up modal): give "Go to room" real
button chrome to match its role as the escape hatch; right-size the modal to short
threads or seed trigger context at the top so the empty space carries meaning.

### R5 - Files + Review polish.

Critic queue (Steffen pass, 2026-07-15, preview viewers; item 1 is the "fix before
elite" priority):
1. File-type kicker (Web page / Video / Image) on the dark shell sits at the ~3:1
   `--faint` level; lift to 12px `--muted` (>=4.5:1) or drop it (dark-shell branches
   only; the PDF/docx eyebrow rides the light `.doc` paper and is fine).
2. Saved-HTML reader prints the filename twice (fake URL bar + pane header); kill the
   `.burl` text, keep the traffic-light frame.
3. Review's custom video scrubber has no mute/volume; add a mute toggle.
4. "Pin mode: off" pill floats orphaned over page content; icon + clearer label,
   nudge clear of content.
5. Mobile image preview floats in a black void; vertically center it in the media area.
### R6 - Email + Campaign polish.
### R7 - Tracker + Command polish.
### R8 - Scribe + Settings polish.

Per-screen simplification sweeps: remove clutter and extra clicks, honest states,
consistent language, both widths. One coherent high-impact workflow per round.

**Status:** all queued.

### R9 - Notifications v1

Corner currently has no notification system. Design and ship an in-app notification
center: bell + unread badge in the shared top bar, a panel listing real events only
(agent finished work, needs-you items, review handoffs), mark-as-read that survives
reload, backed by real rows (no fake UI, system-level for every tenant, not special to
Patrik). Push/browser notifications are a later round if Patrik wants them.

**Status:** queued.
