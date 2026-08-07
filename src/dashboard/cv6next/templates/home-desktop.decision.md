# Decision record — CV6 desktop Home rows + action-items panel

## agent

rex (Patrik's EA terminal). My call, my name on it.

## artifact

Three files, one batch, shipped 2026-08-07 and live on lab.aheadofmarket.com:

- `src/dashboard/cv6next/templates/home-desktop.html` — clock icon removed from both
  recent-room row variants (`.recentrow` left rail, `.restrow` centre digest). Commit
  `c223d06d`.
- `src/dashboard/cv6next/cv6.css` — `.sdot.newdot.is-none` changed from `display:none`
  to `visibility:hidden`. Commit `d3e78254`.
- `src/dashboard/cv6next/RoomWorkList.jsx` — pending steps no longer render in the
  collapsed action-items panel. Commit `3dd6ec6c`.

## call

**I am shipping this because the desktop rows were carrying a control that does nothing
and the panel was calling a plan "work".**

The clock icon: Steffen's mobile review called it "pure noise, on all rows without
exception" and it was removed from mobile yesterday. The identical glyph sat on both
desktop row variants. Same element, same argument, so it goes. What LOST: leaving desktop
alone on the theory that a denser surface can afford more furniture. It cannot — the icon
encoded nothing, the age column already answers "when", and no row varied it.

The chevron did NOT transfer, and that is a deliberate split, not an oversight. Desktop's
lookalike is `<span class="kbd">→</span>` on rows that carry `knav` selection — it is a
keyboard hint, not decoration. Mobile's chevron pointed at an already-tappable row and
meant nothing. Same glyph, different job, so one dies and one stays.

`visibility:hidden` over `display:none`: with the clock gone, names stopped lining up,
because an absent status dot took zero width and the clock had been silently holding that
slot. Reserving the slot is right — the alternative (re-adding a spacer element) is the
same pixel result with an extra node.

Pending steps out of the resting panel: pending is the agent's intention. Rendering it
beside live work is what made the panel read as a self-filling to-do list. It stays in the
expanded view and in the "+N more" count, so nothing is hidden — it just stops claiming to
be in flight.

## measured

`design_spacing_check.py`, same file, before my change vs after (BOTH run from the real
templates directory so `cv6.css` resolves — my first attempt ran the "before" copy out of
a tmp dir, which could not see the CSS and reported a fake 8-vs-445 regression):

```
===== BEFORE (d9705fb0) =====
  RESULT: FAIL
    - OFF-GRID spacing: 445 value(s) not on the 4px grid -> 2.5, 5, 5.1, 6, 7, 8.8, 9, ...
    - SPACING SPRAWL: 41 distinct spacing values (cap 10).
    - TYPE SPRAWL: 24 distinct font sizes (cap 8).

===== AFTER (mine) =====
  RESULT: FAIL
    - OFF-GRID spacing: 445 value(s) not on the 4px grid -> 2.5, 5, 5.1, 6, 7, 8.8, 9, ...
    - SPACING SPRAWL: 41 distinct spacing values (cap 10).
    - TYPE SPRAWL: 24 distinct font sizes (cap 8).
```

Identical. The FAIL is real but pre-existing and system-wide — it comes from `cv6.css`,
the shared design system behind every CV6 screen, not from this edit. I did not fix it and
I am not claiming to: collapsing 41 spacing values and 24 type sizes across the whole
design system is its own mission, and doing it as a side effect of a two-element deletion
is how you break forty screens to tidy one.

Build + live verification:

```
✓ built in 17.43s
emit-dashboard-html: wrote dist/dashboard.html with the Corner manifest baked in

live css: CornerCV6-yKJRZUr4.css
sdot.newdot.is-none{visibility:hidden}

live CornerCV6 chunk: CornerCV6-BcGPc95f.js
clock-icon paths in LIVE bundle: 0 (was 2)
recentrow still present: 1
```

Looked at the live render at 1440px and READ it, twice — before
(`Screenshots/desktop-home-clock-removed.png`) and after the alignment fix
(`Screenshots/desktop-home-aligned.png`). In the second: "Room Organizer", "Wolfpack",
"Corner" and "Bridge-smoke" all start on the same x in both columns, where in the first
the dotted rows sat ~10px right of the undotted ones. Green activity dots still render on
Wolfpack and Corner.

## uncertain

**The action-items change is the one I am least sure of, because I never watched it
render.** I verified it by reading the selection logic and by measuring the underlying
data (65 done / 8 active / 33 pending across 48h), not by opening a room that was mid-turn
on the new build. The logic change is three lines and hard to get wrong, but "I reasoned
about it correctly" is a weaker claim than "I saw it", and I am not going to dress one up
as the other. If the panel now renders empty in a case I did not consider — a room whose
only live item is a synthetic "Working" row — I would not have caught it.

**The chevron call is a judgment I made without asking.** I decided the desktop `→` is a
keyboard affordance and kept it. If Patrik reads it as the same redundant arrow he had
removed from mobile, I have left the exact thing he asked me to clear. This mission has
already burned one lesson on an agent deciding an element was noise — Steffen briefed the
tint bars for deletion and was wrong, they carried real project identity. I may be making
the mirror of that mistake in the other direction.

**Theme and width coverage is one shot, not a sweep.** I verified dark theme at 1440px.
The alignment fix touches a shared rule that also governs the mobile row, and I did NOT
re-shoot mobile at 390px, nor check light or glass theme. `visibility:hidden` is
theme-agnostic so I expect it to hold, but expecting is not checking.

**I flagged a defect instead of fixing it and I might have that boundary wrong.** The
centre digest renders 10 recent rows while its own template comment says it "caps itself
at 6". I left it because it is outside the ask and because the list length may be a
deliberate later change the comment never caught up with. A sharper eye might say a
documented cap that no longer holds is exactly the kind of drift to fix on sight.

## would_change

With more time: run the full three-theme, three-width matrix on both Home variants rather
than one dark 1440px shot, and drive a live room mid-turn to watch the action-items panel
actually transition. Separately, the 41-value spacing sprawl in `cv6.css` deserves a real
mission — one scale, ~6 type sizes — because every CV6 screen inherits that FAIL and no
per-screen fix will ever clear it.

## risk

Small blast radius, all reversible in one revert each.

If the alignment fix is wrong, every recent-room row on Home (desktop and mobile) shifts by
8px — cosmetic, immediately visible to Patrik, zero data impact.

If the action-items change is wrong, the worst case is a panel that shows less than it
should: a room whose work is all pending would now show nothing rather than showing two
planned steps. That is a quieter failure than the one it replaces, but it IS quieter, which
means it could go unnoticed longer. Patrik is the only person who sees these surfaces
today, so nothing here reaches a client.
