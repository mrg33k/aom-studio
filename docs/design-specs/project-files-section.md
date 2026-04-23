# Design Spec: Files Section — Project Task Tab

**Status:** Ready for build  
**Author:** Steffen (design) via Bobby  
**Date:** 2026-04-16  
**Task ID:** ddb6213d-a4c5-42fe-8d5a-db0660790666

---

## 1. Placement within Task Tab

The Files section lives at the **top of the Task tab**, above the task list, as a **collapsible section block**. It does not replace any existing UI — it inserts above the first task row.

```
┌─────────────────────────────────┐
│  TASK TAB                       │
│                                 │
│  ┌─── FILES ─────────────────┐  │
│  │  [Briefs row]             │  │
│  │  [Attachments row]        │  │
│  └───────────────────────────┘  │
│                                 │
│  ── Tasks ──────────────────    │
│  [ Task card ]                  │
│  [ Task card ]                  │
└─────────────────────────────────┘
```

**Section header:** A single-row strip — `FILES` label (uppercase, 10px, `C.muted`, 0.08em letter-spacing) flush left, file count badge (numeric pill, 11px, `C.dim` background, `C.text2` color) next to it, and a chevron button on the right to collapse/expand. Collapsed by default when there are no files; expanded by default when files exist.

**Separator:** 1px `C.border` line below the header strip, 1px `C.border` line between the Files block and the task list below it.

---

## 2. Layout: Briefs vs. Attachments

Files are split into two visual sub-rows inside the section:

### Row A — Briefs (first-class)

Briefs are markdown strategy documents sourced from `/briefs/` with structured metadata (title, summary, agent, date). They deserve premium real estate.

- **Layout:** Horizontal scroll row on mobile; wrapping flex row on desktop (max 3 per row, then wrap)
- **Card size:** 200px wide × 80px tall (desktop); 160px wide × 72px tall (mobile)
- **Card anatomy:**
  - Top-left: `📄` icon replaced by a small monochrome "page with fold" SVG icon (16px, `C.muted`) — no emoji
  - Top-right: date chip (10px, `C.dim` text, no background)
  - Main: brief title, 13px, 600 weight, `C.text`, 2-line clamp with `text-overflow: ellipsis`
  - Bottom: agent name, 11px, `C.muted`
- **Card style:**
  - Background: `C.s2` (`#1A2035`)
  - Border: `1px solid rgba(255,255,255,0.08)` (default), `1px solid rgba(16,185,129,0.35)` (hover)
  - Border-radius: 10px
  - Left accent bar: 3px wide, `C.accent` (`#10B981`), full-height, border-radius 10px 0 0 10px — this is the visual marker that separates briefs from generic files
- **Click behavior:** Opens the brief in a new tab at `/briefs/<slug>` (existing brief page route)
- **Hover state:** Slight background lift to `C.s3` (`#222942`), accent border brightens to `rgba(16,185,129,0.5)`, cursor `pointer`

### Row B — Attachments (chat uploads + other files)

All other files: images, PDFs, videos, design files, archives.

- **Layout:** Compact list view (single column), each row 40px tall
- **Row anatomy (left to right):**
  - File type icon: 18px, centered in a 28×28 rounded-6 chip — icon is SVG (not emoji), colored per type (see §3)
  - File name: 13px, `C.text`, truncated with ellipsis, flex-1
  - File size: 11px, `C.muted`, right-aligned, flex-shrink-0
  - Action button: download arrow icon (14px, `C.muted`), appears on row hover only
- **Row style:**
  - Background: transparent (default), `rgba(255,255,255,0.03)` on hover
  - Border-bottom: `1px solid C.border` (omit on last row)
  - No outer border on the list itself

**Section divider between Briefs and Attachments:** A `FILES` sub-label pattern:
- `BRIEFS` label (uppercase, 9px, `C.dim`, letter-spacing 0.08em) — only shown if both rows have content
- `ATTACHMENTS` label — same style, shown above attachment list if briefs also present

If only one type exists, the sub-labels are omitted.

---

## 3. File Type Icons

All icons are inline SVGs, not emoji. Color by type:

| Type | Icon | Color token |
|------|------|-------------|
| Markdown / brief | document-with-fold | `C.accent` (#10B981) |
| PDF | document-with-lines | `#F87171` (red-400) |
| Image (png/jpg/gif/webp) | photo-frame | `C.blue` (#60A5FA) |
| Video | play-circle | `C.purple` (#A78BFA) |
| Audio | waveform | `C.teal` (#2DD4BF) |
| Design (fig/sketch/psd) | layers | `C.pink` (#F472B6) |
| Spreadsheet (xlsx/csv) | table-grid | `C.green` (#22C55E) |
| Archive (zip/tar) | archive-box | `C.yellow` (#EAB308) |
| Generic / unknown | document-plain | `C.muted` (#475569) |

Icon chip background: icon color at 12% opacity. E.g., PDF chip: `rgba(248,113,113,0.12)`.

**Click behavior:**
- Image: opens in a lightbox overlay (dark background, centered, close on outside click)
- PDF: opens in new tab
- Video: opens in lightbox with `<video>` tag
- All others: triggers browser download

---

## 4. Empty State

When no files and no briefs are attached to the project:

```
┌───────────────────────────────┐
│  FILES  ∨                     │
│  ─────────────────────────── │
│                               │
│     [folder-open icon, 24px]  │
│     No files yet              │   ← 13px, C.muted
│     Drop a brief or attach    │   ← 12px, C.dim
│     files from chat           │   ← 12px, C.dim
│                               │
└───────────────────────────────┘
```

- Section still renders (not hidden), height ~80px
- No attach button in the empty state itself — see §5 for upload affordance
- The folder icon: `C.dim` stroke, 24px, centered

---

## 5. Upload / Attach Affordance

A single **attach icon button** lives in the section header row, left of the chevron:

- Size: 24×24px, border-radius 6px
- Style: `background: transparent`, `border: none` (default); `background: rgba(255,255,255,0.06)` on hover
- Icon: paperclip SVG, 14px, `C.muted` color (matches existing chat attach button aesthetic)
- Behavior: opens the same file input used in the chat compose bar (`fileInputRef.current?.click()`)
- Tooltip: `"Attach file to project"`

No drag-and-drop target in V1. Keep scope tight — the chat input already accepts files and they surface here automatically.

---

## 6. Brand Alignment

### Colors
All values from `src/dashboard/lib/cv3Colors.js`:
- Section background: transparent (inherits Task tab's `C.bg` / `#06090F`)
- Card/chip backgrounds: `C.s1` (#111827) to `C.s3` (#222942)
- Accent: `C.accent` (#10B981) — brief accent bar and hover borders
- Text hierarchy: `C.text` → `C.text2` → `C.muted` → `C.dim` (4 levels, strictly respected)
- Danger/removal: `#F87171` (already used in task panel `Remove` buttons)

### Typography
- Font: `'Inter', sans-serif` throughout
- No JetBrains Mono in this panel (monospace is reserved for code/key values)
- Section label: 10px, 700 weight, uppercase, `C.muted`, 0.08em letter-spacing — matches existing sub-headers in the settings panel
- File names: 13px, 500 weight — matches task card body text weight
- Metadata (size, date, agent): 11px, `C.muted`

### Spacing
- Section outer padding: 12px 14px — matches `ProjectChatView` panel padding
- Card gap (briefs row): 8px
- Row height (attachments): 40px, 8px vertical padding each side
- Section header height: 32px

### Radius
- Brief cards: 10px — matches `ResultPreview` box radius in TasksPanel
- File type icon chips: 6px — matches agent avatar borderRadius in switcher
- Section header chevron button: 8px

### Motion
- Collapse/expand: `max-height` transition, 200ms ease — same pattern as existing collapsible sections
- Hover state transitions: 150ms ease — matches card hover patterns in CornerV3

---

## 7. Desktop vs. Mobile

### Desktop (≥ 768px, `!isMobile`)

- Brief cards: flex-wrap row, up to 3 per row before wrapping, each 200px wide
- Attachment list: full width, row hover reveals download button
- Section header: `FILES` label + count badge + attach button + chevron, all on one row
- Brief card shows agent name and date simultaneously

### Mobile (`isMobile` flag in context)

- Brief cards: **horizontal scroll row** — `overflowX: auto`, `WebkitOverflowScrolling: touch`, no wrap, each card 160px × 72px — matches the pattern already used in Settings tab nav on mobile
- Attachment list: full width, same as desktop but download button always visible (no hover on touch)
- Section header: same single row but attach button omitted — file attachment on mobile goes through the chat compose bar only
- Brief card: truncate agent name, keep title (2-line clamp)

---

## 8. Notes for the Builder

- `filesOpen` / `setFilesOpen` state already exists in `ProjectChatView.jsx` and drives the existing chat-header files panel. The Task tab's Files section is a **separate** toggle, driven by new state (`taskFilesOpen`).
- Brief data comes from `/api/dashboard/files?type=text&client=<slug>` — existing endpoint. Filter for `filename` ending in `.md` to separate briefs from generic text files. Briefs from the public briefs index (`/briefs/`) are a separate read from `briefs-index.json`; the builder should decide whether to pull from the API or the static index. Recommendation: use the static briefs-index and filter by project slug.
- Attachment data is the same `/api/dashboard/files` endpoint — non-markdown entries.
- The section collapse state should **not** be persisted — reset to default (open if files exist, closed if empty) on each project open.
- Do not add a Files tab at the top nav level. The section lives inside the Task tab only.
