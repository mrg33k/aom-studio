# CV4 v2 Design Brief

**Status:** Active (R75-v1)  
**Branch:** `cv4-explore-v2`  
**Canonical source:** CV3 + 11 foundational additions  
**Owner:** Steffen (brand) + Bobby (web)

---

## Design Lens

CV4 v2 is a faithful 1:1 port of CV3 into static hand-authored HTML + CSS, with a design lens rooted in **terminal + IDE + dense productivity tools** (Bloomberg Terminal × Linear × Notion sidebar aesthetic).

**The north star:** Signal-forward, calm, dense. Every pixel is information or whitespace, nothing decorative. The interface gets out of your way; you control the flow.

**Anti-inspiration:** Bright/bubbly SaaS dashboards, glass-morphic soft-future vibes, gradient hero text, pastel card grids, marble textures, default Bootstrap blues. Not our world.

---

## Foundational Rules (Non-Negotiable)

### 1. Dark Mode as Baseline
- **Background palette:**
  - `.c-s1`: #08141C (deepest, nearly black, app shell)
  - `.c-dim`: #1A2438 (lighter dark, panel backgrounds, cards)
  - `.c-bg`: #0F1B2E (fallback alternative to c-s1)

- **Text palette:**
  - `.c-text`: #E8EBEF (primary body text, 93% opacity = 87% contrast on c-s1)
  - `.c-text2`: #9CA3AF (secondary, dimmer, supporting copy, 60% opacity)
  - `.c-muted`: #6B7280 (very dim, captions, metadata, 50% opacity)

- **Accent palette:**
  - `.c-accent`: #10B981 (emerald green, CTAs, active states, breathing animations)
  - `.c-success`: derived from accent (identical in current palette)
  - `.c-border`: #2D3A4A (medium gray, dividers, subtle structure)
  - `.c-border2`: #1F2937 (very subtle borders, barely visible)

**What this means:** Never use bright saturated colors as primary background. Never use white text on dark. The palette is carefully tuned for terminal-like readability.

### 2. Typography: No Defaults

**Font stack:**
```css
--ff-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--ff-mono: 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace;
```

Inter is intentional (CV3 canonical choice), not a default. If a project demands a different sans-serif (Helvetica, Grotesk, etc.), that goes in a NEW DESIGN.md override, not in CV4's default.

**Type scale (all sizes are `clamp()` responsive):**
- H1: `clamp(26px, 5.5vw, 40px)` @ fw-extrabold (800), letter-spacing -0.04em
- H2: `clamp(20px, 4vw, 32px)` @ fw-bold (700)
- H3: 18px @ fw-bold (700), rarely used (prefer H2)
- Body: 14px (base) @ fw-regular (400), line-height 1.5
- Caption: 12px @ fw-regular (400), opacity 0.7

**Hierarchy rules:**
- H1 commands attention: must be visibly heavier and larger than H2
- Body text minimum 14px on desktop, 16px on mobile (readability floor)
- Supporting text (captions, metadata) 12px, never below (WCAG AA contrast required)
- Headings use 1.08 line-height (tight). Body uses 1.5 (generous).

### 3. Spacing System

**Token scale (4px base unit):**
```
--sp-xs: 4px
--sp-sm: 8px
--sp-md: 12px
--sp-lg: 16px
--sp-xl: 20px
--sp-2xl: 24px
--sp-3xl: 32px
--sp-4xl: 40px
--sp-5xl: 48px
```

**Application:**
- Padding inside cards/panels: `--sp-lg` minimum (16px)
- Margins between sections: `--sp-2xl` (24px) or `--sp-3xl` (32px)
- Gap between list items: `--sp-md` (12px)
- Button padding: `--sp-md --sp-lg` (12px vertical, 16px horizontal)

**Whitespace philosophy:** Dense but breathable. Cards are compact (padding-lg), sections have clear separation (sp-2xl/3xl gaps), lists are scannable without wasted space.

### 4. Responsive Breakpoints

**Mobile-first, desktop-enhanced:**
- Default: single-column flex layout (max-width: 1439px)
- Desktop: 3-column CSS Grid at min-width: 1440px
- Extra-small phones: additional media query at max-width: 389px for further size adjustments

**Layout dimensions:**
- Desktop left rail (agents+projects): 240px fixed width
- Desktop center (main content): `1fr` (flexible)
- Desktop right rail (activity+cut-scene): 280px fixed width
- Total content max-width: responsive, no artificial constraint

**Mobile specifics:**
- Full-width single column
- Sidebars collapse to sticky header + accordion drawers
- Modals/overlays use 90vh max-height with bottom-drawer style
- Floating action button (FAB): 56x56px, bottom-right
- Safe area padding: `env(safe-area-inset-bottom)` on iOS

### 5. Component Aesthetics (Mandatory)

**Buttons:**
- Primary (`.btn-primary`): background #10B981 (accent), text #08141C (s1), hover #0CA771 (darkened accent)
- Secondary (`.btn-secondary`): background transparent, border #2D3A4A (border), text #E8EBEF (text), hover background #1A2438 @ 0.5 opacity
- No rounded corners: 6px border-radius standard for buttons and inputs
- No shadows on default state; hover adds subtle shadow only on desktop
- Minimum touch target: 44px height + width (WCAG AA)

**Cards/Panels:**
- Background: `.c-dim` (#1A2438) or `.c-s1` (#08141C) depending on prominence
- Border: 1px solid `.c-border` (#2D3A4A) optional (use sparingly; whitespace is cleaner)
- Border-radius: 8px for panels, 6px for smaller cards
- Padding: min `.sp-lg` (16px); larger panels use `.sp-2xl` (24px)
- Hover state: background slightly lighter, accent border if clickable

**Inputs:**
- Background: rgba(26, 36, 56, 0.5) (dim with low alpha)
- Border: 1px solid `.c-border` (#2D3A4A)
- Focus: border-color change to `.c-accent` (#10B981), background slightly opaque
- Placeholder text: `.c-muted` opacity
- Font size: 14px minimum (16px on mobile for zoom prevention)

**Message Bubbles (Chat):**
- User: accent background (#10B981), text c-s1, right-aligned, max-width 80% on desktop, 90% on mobile
- Assistant: dim background (#1A2438), border #2D3A4A, text c-text, left-aligned
- Message timestamp: `.c-text2` opacity 0.5, font-size 12px

**Step Indicators (Message Steps):**
- Active step: accent breathing-dot animation, text c-text
- Done step: c-muted static dot, text c-text2
- Flex layout with gap between dot and text
- Font size: 12px (small, supporting)

**Overlays/Modals:**
- Backdrop: full viewport dark, rgba(0, 0, 0, 0.5) or equivalent tint
- Modal box: background c-dim, border c-border, centered, max-width responsive (600px desktop, 90vw mobile)
- Border-radius: 8px
- Padding: sp-2xl minimum
- Entrance: fade-in or scale-in animation, 0.3s ease-out

**Floating Elements:**
- Floating call bar: position fixed, bottom-right, background c-dim, border c-accent, padding sp-lg, shadow-lg
- FAB (mobile): 56x56px circle, background c-accent, position fixed bottom-right, shadow-lg
- Drawer/Sheet (mobile): position fixed bottom, rounded-top 12px, translateY animation, max-height 90vh

---

## Layout Patterns

### Desktop 3-Column Rail (≥1440px)
```
├─ Left (240px fixed)          ├─ Center (1fr)       ├─ Right (280px fixed)
│  Agents list                  │  Active view        │  Activity feed
│  Projects list                │  (home/thread/      │  Cut-scene overlay
│  Pinned/unpinned              │   tasks/project-    │  (on first return)
│  Drag-to-reorder              │   chat, etc.)       │
│  Overflow scrollable          │  Overflow scrollable│  Overflow scrollable
│                               │                    │
```

**Grid definition:**
```css
display: grid;
grid-template-columns: 240px 1fr 280px;
height: 100vh;
```

**Rail styling:**
- Left/right rails: border-right/border-left (1px #2D3A4A), overflow-y auto, background c-s1 or c-dim
- Center: main content area, flex column, overflow-y auto, background c-s1
- All rails: sticky header sections with light background tint

### Mobile Single Column (max-width: 1439px)
```
├─ Header (sticky)
├─ Content (main)
├─ Input bar (sticky bottom, safe-area padding)
```

**Header:** mobile-header class, flex space-between, padding sp-lg/sp-md, border-bottom c-border
**Content:** flex-column, padding sp-lg, full width
**Sidebars:** accordion drawers that slide from left/bottom
**Bottom input:** sticky, flex row, gap sp-md, padding-bottom includes `env(safe-area-inset-bottom)`

### Accordion Pattern (Mobile Navigation)
- `.accordion-header`: clickable bar, padding sp-md, background c-dim, flex space-between
- `.accordion-toggle`: rotates 0°→180° on open (0.2s transition)
- `.accordion-content`: max-height 0→500px on open (0.3s transition)
- `.accordion-list`: padding sp-md 0, children have border-bottom dividers

---

## Animation + Micro-Interactions

**Keyframe animations (all in `styles/animations.css`):**
1. `breathing-dot`: opacity 1→0.5→1, 2s infinite (used for active step indicators)
2. `pulse`: transform scale 1→1.05→1, 2s infinite (optional subtle emphasis)
3. `slide-up`: translateY 20px→0px, 0.3s ease-out (message entrance)
4. `slide-in-left`: translateX -20px→0px, 0.3s ease-out (drawer open)
5. `slide-in-right`: translateX 20px→0px, 0.3s ease-out (drawer open)
6. `fade-in`: opacity 0→1, 0.2s ease-in
7. `fade-out`: opacity 1→0, 0.2s ease-out
8. `scale-in`: transform scale 0.9→1, 0.2s ease-out
9. `chain-float-up`: translateY 0→-20px, opacity 1→0, 0.8s ease-out (staggered for multi-item lists)

**Transition utilities:**
- `.transition-all`: transition: all 0.2s ease
- `.transition-colors`: transition: background-color, border-color, color 0.2s ease
- `.transition-opacity`: transition: opacity 0.2s ease
- `.transition-transform`: transition: transform 0.2s ease

**Interactive states:**
- Button hover: background lightens, optional accent border, cursor pointer, 0.2s all
- Link hover: text c-accent, underline appears (if not already underlined)
- Input focus: border-color c-accent, background slightly opaque, no outline
- Card hover (clickable): background slightly lighter, accent border if action exists

**Approval gates:** No animation without purpose. Every keyframe must communicate state change or entrance. No decorative flourishes.

---

## Content Standards

### No Placeholder Content
- All example text is real: real agent names (Steffen, Cleo, Bobby), real task descriptions, real project names
- All dates/times are plausible (current date context)
- All statistics are realistic (if showing "87% success rate", that's a plausible number)
- Empty states are designed (intentional whitespace + message, not broken layouts)

### Real Data Sources
- Agent list pulled from actual team config (Steffen Brand, Cleo Video, Bobby Web, etc.)
- Project list pulled from actual project names (Ambition Mechanical, ISA Energy, Pala, etc.)
- Task examples show realistic work (brand review, social clip edit, API debug, etc.)
- Messages show realistic conversation patterns (multi-turn, with step threads)

---

## V4 Foundational Additions (New to CV4, Not in CV3)

### 1. Time-Aware Greeting
**Location:** home.html hero section  
**Behavior:** JavaScript computed at page load
- 6am–11:59am: "Good morning"
- 12pm–4:59pm: "Good afternoon"
- 5pm–8:59pm: "Good evening"
- 9pm–5:59am: "Burning the midnight oil" (or "Late night, huh?")

**Visual:** Large h1, below-nav hero area, paired with time-of-day emoji or icon (optional)

### 2. Cut-Scene Overlay
**Location:** home.html, right rail on desktop, dismissible
**Trigger:** Page load if unread notifications exist, or visible-on-first-return flag (sessionStorage)  
**Content:**
- Backdrop: dark, semi-transparent, full viewport
- Center card: max-width 600px, background c-dim, padding sp-2xl
- Title: "Welcome back, Patrik"
- Items list: stale projects, needs_input tasks, pending approvals, skill recommendations
- Each item: icon + title + action button
- Dismiss button closes overlay

### 3. Message Steps Feature
**Location:** below assistant messages in chat views  
**Visual structure:**
```
<div class="message-steps">
  <div class="step done">
    <div class="step-dot"></div>
    <div class="step-text">Step label</div>
  </div>
  <div class="step">
    <div class="step-dot"></div>
    <div class="step-text">In-progress step</div>
  </div>
</div>
```

**Styling:**
- `.step-dot`: 8px circle, background c-accent if active (.step), c-muted if done (.step.done)
- Active dots animate with breathing-dot keyframe
- Done dots are static
- Flex layout with 8px gap
- Font size 12px, line-height normal

### 4. Project Chat View
**Location:** project-chat.html  
**Responsibility:** Scoped team chat for a specific project
**Layout:**
- Header: project name, context line ("EA · X tasks · Last update Yhr ago"), action buttons
- Messages: same styling as 1:1 chat, with message-steps support
- Right panel: Current State (status, active tasks, team, last update)
- Input: same as 1:1
- Mobile: sidebars collapse to drawers

### 5. Responsive Desktop/Mobile Parity
**Desktop (≥1440px):**
- 3-column rail layout (agents | content | activity)
- Rich hover states
- Sidebar is always visible
- Overlays center at max-width 600px

**Mobile (max-width: 1439px):**
- Single column, flex layout
- Sidebars collapse to accordion or sticky header
- Overlays use bottom-drawer style (rounded top, translateY animation)
- Buttons/inputs increased to 44px touch targets
- Font sizes responsive via clamp()
- Safe area padding on bottom

**Extra-small (max-width: 389px):**
- Further font reductions
- Padding reduced to sp-md instead of sp-lg

---

## Verification Checklist (Gate Compliance)

### Gate 1: Lens Fidelity
- [ ] Every color used is defined in tokens.css (no hardcoded hex except placeholders)
- [ ] Typography uses only Inter (sans) or JetBrains Mono (code)
- [ ] Layout grid is 3-column on desktop, single-column on mobile per spec above
- [ ] No gradient backgrounds, marble textures, or AI-default patterns

### Gate 2: Anti-Claude Defaults
- [ ] No gradient hero text
- [ ] No glassmorphism (unless explicitly frozen glass lens needed)
- [ ] No soft pastel card grids (#FFF7ED, #F5F0FF, etc.)
- [ ] No symmetrical centered hero layout without design reason
- [ ] No generic Bootstrap blue buttons (#3B82F6)
- [ ] No default Inter without design decision (intentional choice documented)

### Gate 3: Real Content
- [ ] No lorem ipsum
- [ ] No "Placeholder text here"
- [ ] All agent names are real team members
- [ ] All project names are real projects
- [ ] All task examples are realistic work
- [ ] Empty states have intentional messaging, not broken layouts

### Gate 4: Live Verification
- [ ] verify-page.py run at 1440px, screenshot reviewed
- [ ] verify-page.py run at 390px, screenshot reviewed
- [ ] No console errors
- [ ] No visible error text

### Gate 5: Mobile + Desktop Verified
- [ ] Desktop layout at 1440px verified
- [ ] Mobile layout at 390px verified
- [ ] Type readable at both sizes (no truncation, min 16px on mobile body)
- [ ] Touch targets 44px+ on mobile
- [ ] Tap zones don't overlap

### Gate 6: Hierarchy
- [ ] H1 is visibly larger/heavier than H2
- [ ] Body text minimum 14px
- [ ] Contrast ratios meet WCAG AA (4.5:1 body, 3:1 headings minimum)
- [ ] Supporting text doesn't drop below 12px
- [ ] Headings have clear precedence

### Gate 7: Quality Bar
- [ ] Would Patrik say "ship it"?
- [ ] Buttons are functional, not decorative
- [ ] Interactions feel polished (hover, focus, animations smooth)
- [ ] Layout communicates hierarchy without user effort
- [ ] Design has a point of view (not Tailwind defaults)
- [ ] No clunky interactions or confusing affordances

---

## Cross-References
- **Color tokens:** `styles/tokens.css`
- **Typography:** `styles/base.css`
- **Animations:** `styles/animations.css`
- **Desktop layout:** `styles/desktop.css`
- **Mobile layout:** `styles/mobile.css`
- **Component inventory:** `INVENTORY.md`
- **Verify rule:** `.claude/rules/verify-before-done.md`
- **Design gate rule:** `.claude/rules/design-criteria-gate.md`
- **AOM Design Standards:** `.claude/skills/brand-agent/AOM-DESIGN-STANDARDS.md`

---

## Approval & Calibration

**Status:** Drafted R75-v1, ready for Steffen review  
**Last updated:** 2026-05-04  
**Owner:** Steffen (brand sign-off) + Bobby (implementation sign-off)

Patrik: if the lens described here doesn't match your intent for CV4, update this DESIGN.md before we proceed to shipping. The lens drives every decision below; drifting from it introduces the very clutter we're trying to avoid.
