# CV3 Gap Analysis

> Auto-generated comparison: `public/cv3.html` (Steffen's mockup) vs `src/dashboard/CornerV3.jsx` (current implementation).
> Each item includes: what's wrong, where in the code, what the fix is.
> Task descriptions should reference this file by section.

## FILE MAP: CornerV3.jsx (1846 lines)

Use `read_file` with `start_line` and `end_line` to read specific sections. Never read lines 1-100 and assume you've seen the whole file.

| Section | Lines | What's there |
|---------|-------|-------------|
| Color palette (const C) | 24-49 | All color constants |
| AomLogo component | 53-61 | Logo rendering |
| BellIcon component | 65-105 | Notification bell |
| UserAvatar component | 109-133 | User avatar circle |
| Badge component | 137-159 | Count badges |
| Tab component | 163-204 | Nav tab button |
| Icon helpers | 208-240 | Home, Tasks, Chat SVG icons |
| Status config | 243-298 | Status dot colors/labels |
| AgentCard component | 315-400 | Home tab agent cards |
| HomePanel component | 402-506 | Home tab layout + hero |
| TasksPanel component | 554-900+ | Tasks tab (search, filters, cards, stats) |
| ChatPanel (imported) | ~900+ | Chat tab |
| Main component + state | 1580-1700 | State, hooks, handlers |
| NAV BAR render | 1739-1834 | The actual nav bar JSX |
| Content area | 1836-1846 | Tab content switcher |

---

## GAPS: NAV BAR

### 1. Nav background color (CRITICAL)
- **Spec** (cv3.html:25): `background: var(--bg)` = `#06090F` (nearly black)
- **Current** (CornerV3.jsx:1742): `background: C.s1` = `#111827` (visible gray)
- **Fix**: Line 1742, change `C.s1` to `C.bg`

### 2. Extra border between Row 1 and Row 2
- **Spec** (cv3.html:25): Single `border-bottom` on `.nav` container only. No internal borders.
- **Current** (CornerV3.jsx:1761): `borderBottom: '1px solid ' + C.border` on Row 1 div
- **Fix**: Line 1761, remove the `borderBottom` property entirely

### 3. Row 1 layout model
- **Spec** (cv3.html:28): `justify-content: space-between` on `.nav-top`
- **Current** (CornerV3.jsx:1757-1760): Uses `gap: 12` with `flex: 1` on center div
- **Impact**: Minor. Visually similar. Low priority fix.

### 4. Row 2 layout model
- **Spec** (cv3.html:48): `justify-content: space-between` on `.nav-tabs`
- **Current** (CornerV3.jsx:1791): `gap: 2` + `marginLeft: auto` on stats
- **Impact**: Minor. Visually equivalent. Low priority.

### 5. Stats dot size
- **Spec** (cv3.html:60): `width:5px; height:5px`
- **Current** (CornerV3.jsx:1824): `width: 6, height: 6`
- **Fix**: Lines 1824, 1828: change 6 to 5

### 6. Mobile hide uses JS instead of CSS
- **Spec** (cv3.html:57 implied): CSS media query `@media (max-width:480px)`
- **Current** (CornerV3.jsx:1817): `window.innerWidth < 480` inline JS check
- **Impact**: JS check doesn't update on resize. Should use CSS media query or a resize listener.

---

## GAPS: HOME VIEW

### 7. Hero heading size (CRITICAL)
- **Spec** (cv3.html:70): `font-size: clamp(26px, 5.5vw, 40px); font-weight: 800; line-height: 1.08; letter-spacing: -0.04em`
- **Current** (CornerV3.jsx:448-449): `fontSize: 22, fontWeight: 700, lineHeight: 1.2`
- **Fix**: Line 448-449, change to `fontSize: 'clamp(26px, 5.5vw, 40px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.04em'`

### 8. Hero padding
- **Spec** (cv3.html:67): `padding: 28px 20px 12px`
- **Current** (CornerV3.jsx:441): `padding: '24px 20px 32px'`
- **Fix**: Line 441, change to `padding: '28px 20px 12px'`

### 9. Hero radial gradient glow (MISSING)
- **Spec** (cv3.html:68): `::after` pseudo with `radial-gradient(ellipse at 30% 40%, rgba(16,185,129,0.035), transparent 60%)`, height 140px
- **Current**: Not implemented. No glow effect.
- **Fix**: Add a positioned div behind the hero with the gradient. Since inline styles can't do `::after`, use a child div with `position: absolute`.

### 10. Hero subtext format
- **Spec** (cv3.html:69): `font-size: 12px; font-weight: 500; color: var(--muted)` with status dot + "All systems running"
- **Current** (CornerV3.jsx:456): `fontSize: 13, color: C.muted` with "N agents active" text, no dot
- **Fix**: Line 456, change fontSize to 12, add fontWeight 500, add a green dot before the text

### 11. Agent cards are intentionally different
- **Spec** (cv3.html:75): Subtle list items. `padding: 12px 14px, borderRadius: 14, bg: s1`, horizontal row with 38px circle avatar
- **Current** (CornerV3.jsx:315-400): Bold wallet-style colored blocks with 38px name, full-width colored bg
- **Note**: This was a DELIBERATE change per Patrik's directive in CV3-BUILD-SHEET.md lines 57-97 ("BOLD WALLET STYLE -- Patrik's vision"). The build sheet was updated AFTER the mockup. Current implementation follows the updated spec. NO CHANGE NEEDED.

### 12. Agent card hover transform
- **Spec** (BUILD-SHEET:76): `translateY(-3px), boxShadow: '0 12px 32px rgba(0,0,0,0.35)'`
- **Current** (CornerV3.jsx:334): `translateY(-1px)`, no boxShadow on hover
- **Fix**: Line 334, change to `translateY(-3px)`. Add boxShadow on hover state.

### 13. Agent card border radius
- **Spec** (BUILD-SHEET:68): `borderRadius: 20`
- **Current** (CornerV3.jsx:329): `borderRadius: 10`
- **Fix**: Line 329, change 10 to 20

### 14. Agent card padding
- **Spec** (BUILD-SHEET:65): `padding: '20px 20px 16px'`
- **Current** (CornerV3.jsx:340): `padding: '14px 16px 14px'`
- **Fix**: Line 340, change to `padding: '20px 20px 16px'`

### 15. Agent name font size
- **Spec** (BUILD-SHEET:79): `fontSize: 32`
- **Current** (CornerV3.jsx:354): `fontSize: 38`
- **Fix**: Line 354, change 38 to 32

### 16. Agent name letter spacing
- **Spec** (BUILD-SHEET:79): `letterSpacing: '-0.03em'`
- **Current** (CornerV3.jsx:359): `letterSpacing: '-0.02em'`
- **Fix**: Line 359, change to `-0.03em`

---

## GAPS: TASKS VIEW

### 17. Search bar border radius
- **Spec** (cv3.html:93): `border-radius: 12px`
- **Current** (CornerV3.jsx:650): `borderRadius: 8`
- **Fix**: Line 650, change 8 to 12

### 18. Search bar padding
- **Spec** (cv3.html:93): `padding: 9px 14px`
- **Current** (CornerV3.jsx:648): `padding: '7px 10px 7px 30px'`
- **Fix**: Line 648, change to `padding: '9px 14px 9px 36px'` (preserve space for icon)

### 19. Search bar background
- **Spec** (cv3.html:93): `background: var(--s1)` = `#111827`
- **Current** (CornerV3.jsx:649): `background: 'rgba(255,255,255,0.05)'`
- **Fix**: Line 649, change to `background: C.s1`

### 20. Search bar border
- **Spec** (cv3.html:93): `border: 1px solid var(--border)`
- **Current** (CornerV3.jsx:649): `border: '1px solid rgba(255,255,255,0.08)'`
- **Fix**: Use `C.border` instead of hardcoded rgba

### 21. Filter pill styling
- **Spec** (cv3.html:100): `padding: 5px 12px, borderRadius: 16, fontSize: 10, fontWeight: 700, bg: s1, color: text2`
- **Current** (CornerV3.jsx:679-689): `padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600`
- **Fix**: padding 4->5, borderRadius 20->16, fontSize 11->10, fontWeight 600->700

### 22. Active filter pill colors
- **Spec** (cv3.html:101): `background: var(--accent-bg), border-color: rgba(16,185,129,0.2), color: var(--accent)`
- **Current** (CornerV3.jsx:685-686): Uses blue `rgba(59,158,255,0.14/0.45)` instead of accent green
- **Fix**: Change to accent-based colors matching spec

### 23. Shipped task card title size
- **Spec** (cv3.html:111): `font-size: 16px; font-weight: 800; line-height: 1.2; color: #0A0A0A`
- **Current** (CornerV3.jsx:742): `fontSize: 14, fontWeight: 700` with yellow color for building tasks
- **Fix**: Shipped (done) cards should use fontSize 16, fontWeight 800, color #0A0A0A

---

## GAPS: AGENT CARDS (CRITICAL -- must match cv3.html exactly)

The current bold wallet-style cards were a Patrik directive but the SIZING from Steffen's mockup is perfect and must be matched. Steffen's cards are subtle horizontal rows, not bold vertical blocks.

### 24. Agent cards must match cv3.html layout exactly (CRITICAL)
- **Spec** (cv3.html:75-89): Horizontal row layout. `padding: 12px 14px, borderRadius: 14px, background: var(--s1), border: 1px solid var(--border)`. 38px circle avatar on left, info in middle, status+unread on right.
- **Current** (CornerV3.jsx:315-400): Vertical stacked blocks with full-width colored backgrounds, 38px text names.
- **Fix**: Rewrite AgentCard to match cv3.html exactly:
  - Container: `display: flex, alignItems: center, gap: 12px, padding: '12px 14px', borderRadius: 14, background: C.s1, border: '1px solid ' + C.border`
  - Avatar: 38x38 circle (borderRadius: '50%'), colored background, single initial letter, fontSize 15, fontWeight 800
  - Info section: flex 1. Top row = name (fontSize 13, fontWeight 700) + time (fontSize 10, color dim, JetBrains Mono). Bottom = preview text (fontSize 12, color muted, truncated).
  - Right section: status dot+label (fontSize 9, fontWeight 600, JetBrains Mono) + optional unread badge (minWidth 18, height 18, borderRadius 9, background accent, fontSize 9, fontWeight 800)
  - Active card: `borderColor: rgba(16,185,129,0.15)` + 2px green left border via `::before` or a positioned div
  - Hover: `background: s2, borderColor: border2, translateY(-1px), boxShadow: 0 6px 20px rgba(0,0,0,0.25)`
  - Grid: `display: flex, flexDirection: column, gap: 6px, padding: '0 16px'`
  - Section label above cards: `fontSize: 10, fontWeight: 700, color: muted, uppercase, letterSpacing: 0.1em, JetBrains Mono, padding: '18px 20px 8px'`
  - onClick: set selectedAgent + switch to chat tab (already wired)

### 25. Agent card onclick opens chat with that agent
- **Spec** (cv3.html:300): `onclick="openChat('rex','Rex','EA','var(--accent)')"`
- **Current**: Already wired via `onSelectAgent`. Verify it switches to chat tab AND sets the correct agent context.

---

## GAPS: HERO GREETING (rotating messages)

### 26. Hero greeting should rotate on each reload (NEW)
- **Spec**: Static "Hey Patrik, what are we working on?" in cv3.html
- **Required**: Array of energy-boosting greetings that shuffle each page load. Examples:
  - "Hey {name}, what are we working on?"
  - "Let's build something great today, {name}."
  - "Ready when you are, {name}."
  - "What's the move, {name}?"
  - "Back at it, {name}. What's first?"
  - "Good {timeOfDay}, {name}. Let's go."
- **Fix**: In HomePanel (CornerV3.jsx ~line 415), replace the static greeting with a random pick from an array. Use time-of-day variants too.

### 27. Hero subtext should show agent status with dot
- **Spec** (cv3.html:294): `<div class="hero-sub"><div class="dot"></div> Rex is online</div>` -- green dot + "Rex is online"
- **Current** (CornerV3.jsx:456-460): Just "N agents active" text, no dot, no specific agent
- **Fix**: Show the most recently active agent name + status dot. e.g. "Rex is online" or "Bobby is building"

---

## GAPS: INPUT BAR (must match cv3.html exactly)

### 28. Input bar should be persistent across ALL views (CRITICAL)
- **Spec** (cv3.html:456-475): Input bar is OUTSIDE all views, at the bottom of .app. Visible on Home, Tasks, AND Chat.
- **Current**: Input bar only appears in chat view. Home and Tasks views have no input.
- **Fix**: Move the input bar rendering OUTSIDE the tab content switch. It should always render at the bottom regardless of which tab is active.

### 29. Input bar on Home opens chat with last-talked-to agent (NEW)
- **Spec** (cv3.html:459): `onfocus="if(!document.getElementById('v-chat').classList.contains('on'))openChat('rex','Rex','EA','var(--accent)')"`
- When user focuses the input on Home tab, it should auto-switch to chat with their last active agent (or Rex as default).
- **Fix**: Track `lastChatAgent` in state. On input focus while on Home/Tasks tab, switch to chat tab with that agent.

### 30. Input bar design must match cv3.html exactly
- **Spec** (cv3.html:207-225):
  - Container: `padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px)), background: var(--bg), borderTop: 1px solid var(--border)`
  - Wrapper: `background: var(--s1), border: 1.5px solid var(--border2), borderRadius: 26px, padding: 5px 5px 5px 16px, maxWidth: 560px, margin: 0 auto`
  - Focus: `borderColor: rgba(16,185,129,0.25), boxShadow: 0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)`
  - Input text: `fontSize: 15, fontWeight: 500, placeholder color: muted`
  - Attach button: 36x36 circle, paperclip SVG, color muted
  - Commands button: 36x36 circle, terminal SVG, color muted
  - Mic button: 42x42 circle, background accent (#10B981), color #000
  - Send button: 42x42 circle, background accent, hidden by default, shows when text present, replaces mic
- **Current**: Chat input exists but is scoped inside ChatPanel, not persistent. Design doesn't match.

### 31. Send button replaces mic when text present
- **Spec** (cv3.html:221-224): `.send{display:none}` by default, `.send.show{display:flex}` when input has text. Mic hides when send shows.
- **Fix**: Toggle between mic and send button based on whether input field has text content.

---

## GAPS: VOICE MODE (must match cv3.html design)

### 32. Voice mode design must match cv3.html
- **Spec** (cv3.html:186-201):
  - Container: `padding: 14px 20px, background: bg2, borderTop: 1px solid border`
  - Waveform: 9 bars, width 3px, borderRadius 2, background accent, `animation: vw 1s ease-in-out infinite` with staggered delays
  - Bar heights: 14, 26, 38, 30, 18, 34, 22, 40, 16
  - Status text: `fontSize: 12, fontWeight: 600, color: accent, JetBrains Mono, textAlign: center`
  - Transcript: `fontSize: 13, color: text2, textAlign: center`
  - End button: 42x42 circle, background red, color white
  - Mute button: 42x42 circle, background s2, color muted, border
  - Voice mode replaces input bar (input-bar display:none when voice is on)
- **Current**: VoiceChat.jsx exists with Gemini integration but visual design differs from mockup.
- **Fix**: Match the exact visual design. 9 bars with correct heights and stagger. Same button layout.

---

## GAPS: NAVIGATION (1:1 match required)

### 33. Nav background (same as #1 but emphasizing)
- **Fix**: Line 1742, change `C.s1` to `C.bg`. This is the MOST VISIBLE difference.

### 34. Nav should show ONLY Home and Tasks tabs (CRITICAL)
- **Spec** (cv3.html:278-281): Only Home and Tasks visible by default. Chat tab has `style="display:none"` and only appears after clicking an agent card.
- **Current**: Home, Tasks, and Chat all visible at all times.
- **Fix**: Remove Chat from the default visible tabs. Show Chat tab ONLY after an agent card is clicked. Nav must be EXACTLY like Steffen's: Home + Tasks (with badge) + stats on the right. Nothing else until user interaction.

### 35. Nav stats show building count with YELLOW dot, not green
- **Spec** (cv3.html:284): `<div class="dot" style="background:var(--yellow)"></div><b>2</b> building`
- **Current** (CornerV3.jsx:1824): Uses `C.accent` (green) for building dot
- **Fix**: Line 1824, change `C.accent` to `C.yellow` for the "building" stat dot

---

## PRIORITY ORDER (updated)

**BATCH 1 -- Agent cards + hero (biggest visual impact):**
- #24: Rewrite agent cards to match cv3.html horizontal layout
- #26: Rotating hero greetings
- #27: Hero subtext with agent status dot
- #7: Hero heading size (clamp)
- #8: Hero padding
- #9: Hero radial glow

**BATCH 2 -- Input bar + voice (core interaction):**
- #28: Persistent input bar across all views
- #29: Input focus opens chat with last agent
- #30: Input bar design 1:1 match
- #31: Send/mic toggle
- #32: Voice mode design match

**BATCH 3 -- Navigation (1:1 match):**
- #1: Nav background color
- #2: Remove extra border
- #34: Hide chat tab until agent selected
- #35: Yellow building dot

**BATCH 4 -- Tasks view + polish:**
- #17-22: Search bar and filter pill styling
- #23: Shipped card title size
- #12-16: Agent card hover, name size details
- #5-6: Stats dot, mobile hide
