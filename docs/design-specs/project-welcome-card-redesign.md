# Design Spec: Project Welcome Card Redesign
**Steffen | Corner Dashboard — Task Tab**
`src/dashboard/components/cv3/TasksPanel.jsx` · Welcome card section (lines ~947–974)

---

## 1. What Changes

### Remove
- The `{greeting}` h1 (Good morning / Good afternoon / Good evening) and all time-based logic
- The `const greeting` and `const greetingHour` variables — delete them entirely
- The `{filteredActive.length} task(s) in motion · ... done` sub-line (replaced by new layout below)

### Keep
- The scrollable wrapper structure
- The search bar + project filter pills immediately below the card
- All task-list rendering beneath

---

## 2. Headline Treatment (Proposed)

**Hero stat moment, not a greeting.**

### Proposed Headline: Dynamic Status Number

```
┌──────────────────────────────────────┐
│  PROJECT NAME                        │  ← label: 11px Space Grotesk 600, tracking 0.12em, C.muted
│                                      │
│  3                                   │  ← display: Syne 800, 72px, C.text
│  IN MOTION                           │  ← label: 12px Space Grotesk 700, tracking 0.18em, C.accent
│                                      │
│  ● 1 needs input  · ✓ 4 this week   │  ← 12px Space Grotesk, C.text2
└──────────────────────────────────────┘
```

**Rules for the big number:**
- `activeTasks.length > 0` → show count, label "IN MOTION"
- `activeTasks.length === 0 && waitingTasks.length > 0` → show waiting count, label "NEED INPUT" (label color: `C.yellow`)
- `activeTasks.length === 0 && waitingTasks.length === 0` → show "ALL", label "CLEAR" (label color: `C.accent`)

The big number is always derived from live task data — never static, never time-gated.

---

## 3. Full Card Structure

```
┌─ Welcome Card ──────────────────────────────────────────┐
│                                                          │
│  [PROJECT LABEL]                                         │
│                                                          │
│  [HERO NUMBER]                                           │
│  [STATUS LABEL]                                          │
│                                                          │
│  [stat]  ·  [stat]  ·  [stat]                           │
│                                                          │
│  ┌─ Live task strip (max 2 chips) ─────────────────────┐ │
│  │  ● Agent  Task title                   status pill  │ │
│  │  ● Agent  Task title                   status pill  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────── + New ──┘
```

### Sections

**A. Project label** (top-left)
- Text: active project name (or "All Projects" when no filter)
- Font: Space Grotesk 600, 11px, letter-spacing 0.12em, `C.muted`
- Transform: uppercase

**B. Hero number**
- Font: Syne 800, `clamp(56px, 8vw, 72px)`, `C.text`
- Letter-spacing: -0.04em
- Line-height: 0.95
- Margin-top: 8px

**C. Status label**
- Font: Space Grotesk 700, 12px, letter-spacing 0.18em
- Transform: uppercase
- Color: `C.accent` (IN MOTION / ALL CLEAR) | `C.yellow` (NEED INPUT)
- Margin-top: 6px

**D. Stat row**
- Three stats in one line, separated by `·`
- Format: `[count] [noun]` — e.g. "1 needs input", "4 this week", "2 done"
- Font: Space Grotesk 400, 12px, `C.text2`
- Only show non-zero stats; omit zero counts to keep it clean
- If all zero: show "Nothing running" in `C.muted`

**E. Live task strip** (conditional — only if `activeTasks.length > 0`)
- Shows up to 2 most-recent active tasks
- Each chip: `[agent color dot] [task title truncated to 1 line] [status pill]`
- Background: `C.s1` (`#111827`)
- Border: `1px solid C.border2`
- Border-radius: 10px
- Padding: 8px 12px per chip
- Font: Inter 500, 12px, `C.text`
- Agent dot: 6px circle, `agentColors[agent]` color
- Status pill: 9px, uppercase label, same color as `LIFECYCLE` map in the component
- Click → could open task detail (no-op in spec; builder to decide)

**F. "+ New task" quick action**
- Right-aligned in the card footer
- Style: ghost/text button — `+` icon + "New task" in Space Grotesk 500 12px, `C.muted`
- On hover: `C.accent` color, no background fill
- This is already available via the FAB; this in-card link is a shortcut alias

---

## 4. Layout — Desktop

```
padding: 28px 24px 20px
marginBottom: 24px (before searchbar)
```

Card is full-width within the panel. No explicit card border — let it breathe as a section of the panel itself.

Optional: a subtle `1px solid C.border` underline at card bottom to divide it from the search bar, replacing the gap-only separation currently used.

**Desktop column breakdown (panel ~380px wide):**
- Hero number + labels: left-aligned, full width
- Stat row: left-aligned, wraps naturally
- Live task strip: full width, 2 rows max

---

## 5. Layout — Mobile

Below `520px` viewport width:

- Hero number: `clamp(40px, 10vw, 56px)` (smaller scale)
- Stat row: allow wrap, `gap: 6px`, display flex-wrap
- Live task strip: hidden (too cramped — task list is right below)
- "+ New task" button: full-width, left-aligned

```css
@media (max-width: 520px) {
  .welcome-hero-number { font-size: clamp(40px, 10vw, 56px); }
  .welcome-task-strip  { display: none; }
  .welcome-new-btn     { width: 100%; text-align: left; }
}
```

---

## 6. Brand Token Usage

| Element | Token | Value |
|---|---|---|
| Card background | `C.bg` (implicit panel bg) | `#06090F` |
| Hero number | `C.text` | `#F1F5F9` |
| Status label (active) | `C.accent` | `#10B981` |
| Status label (waiting) | `C.yellow` | `#EAB308` |
| Stat row text | `C.text2` | `#94A3B8` |
| Project label | `C.muted` | `#475569` |
| Live strip bg | `C.s1` | `#111827` |
| Live strip border | `C.border2` | `rgba(255,255,255,0.08)` |
| Card divider | `C.border` | `rgba(255,255,255,0.04)` |
| Hero font | Syne 800 | display scale |
| Label font | Space Grotesk 600–700 | label scale |
| Stat font | Space Grotesk 400 | body-sm scale |

Spacing follows the brand scale from `/brand/v4`:
- Card internal padding: 28px top/sides (LG+MD = ~28px) → XL (32px) tops
- Between hero and stat row: 16px (MD)
- Between stat row and strip: 12px (SM)
- Below card to searchbar: 24px (LG)

---

## 7. Interactions

| Target | Interaction | Behavior |
|---|---|---|
| Hero number | None (informational) | Static display |
| Status label | None | Static display |
| Stat "needs input" | Click | Scroll / filter to waiting tasks |
| Stat "this week" | Click | Toggle view to completed tab |
| Live task chip | Click | Open task detail (same as clicking task in list) |
| Live task chip | Hover | Background: `C.s2`, cursor: pointer |
| "+ New task" | Click | Trigger existing new-task modal / FAB action |
| "+ New task" | Hover | Color: `C.accent` |

All transitions: `0.15s ease` on color/background. No scale transforms on hover (keeps it grounded).

---

## 8. Builder Notes

- Delete `greetingHour`, `greeting` const and the `{greeting}` h1 block (lines 847–849 and 958–973 in current file)
- The welcome card wraps in the same `{ marginBottom: 28 }` div currently used for the greeting
- `agentColors` is already imported from `cv3Colors.js` — use it for the live strip dots
- Syne must be loaded: check `index.html` for `fonts.googleapis.com/css2?family=Syne` — add if missing
- Space Grotesk: same check, add if missing
- Responsive breakpoint: implement via inline style with `window.innerWidth` check + resize listener, or a CSS class — builder's choice, but keep consistent with how the rest of the panel handles responsiveness
