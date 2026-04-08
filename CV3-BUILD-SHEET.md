# CV3 Build Sheet

> Source of truth: `public/cv3.html` (Steffen's design)
> Target: `src/dashboard/CornerV3.jsx` (React, inline styles)
> Every value below comes directly from the mockup. Wire 1:1.

## Color Palette (const C)

```
bg: '#06090F'          bg2: '#0B1018'
s1: '#111827'          s2: '#1A2035'         s3: '#222942'
border: 'rgba(255,255,255,0.04)'   border2: 'rgba(255,255,255,0.08)'
text: '#F1F5F9'        text2: '#94A3B8'
muted: '#475569'       dim: '#334155'
accent: '#10B981'      accent2: '#34D399'    accentBg: 'rgba(16,185,129,0.08)'
yellow: '#EAB308'      green: '#22C55E'      purple: '#A78BFA'
blue: '#60A5FA'        pink: '#F472B6'       orange: '#FB923C'
teal: '#2DD4BF'        red: '#EF4444'
```

## Fonts
- Primary: `'Inter', -apple-system, system-ui, sans-serif`
- Mono: `'JetBrains Mono', monospace` (badges, stats, timestamps, labels)
- Import: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap`

## NAV BAR (2 rows, compact)

### Row 1: Logo + World + Bell + Avatar
- Container: `padding: '10px 16px 0'`, flexbox space-between
- Logo: text "Corner." with accent-colored dot. `fontWeight: 900, fontSize: 18, letterSpacing: '-0.04em'`
- World switcher: `padding: '4px 10px 4px 6px', background: s1, border: '1px solid' + border, borderRadius: 10`
  - Icon: 22x22px, borderRadius 6, gradient(accent, blue), initial letter 10px bold
  - Name: fontSize 12, fontWeight 700, color text2
  - Arrow: `\u25BE` (down triangle), fontSize 10, color dim
- Bell: 32x32, borderRadius 10, background s1, border, accent dot 6x6 on notifications
- Avatar: 28x28, borderRadius 9, gradient(accent, blue)

### Row 2: Tabs + Stats
- Container: `padding: '8px 16px'`, flexbox space-between
- Tabs: `padding: '7px 18px', borderRadius: 10, fontSize: 12, fontWeight: 600`
  - Active: color text, bottom accent bar (2px, left 20% right 20%)
  - Badge: `minWidth: 14, height: 14, borderRadius: 7, background: accent, color: #000, fontSize: 8, fontWeight: 800, JetBrains Mono`
  - Warn badge: background yellow
- Stats (right side): `fontSize: 11, fontWeight: 600, color: dim, JetBrains Mono`
  - Format: colored dot + bold count + label ("2 building", "8 done")
  - Hidden on mobile (max-width 480px)

## HOME VIEW

### Hero
- `padding: '28px 20px 12px'`
- Subtle radial gradient glow: `radial-gradient(ellipse at 30% 40%, rgba(16,185,129,0.035), transparent 60%)`
- Sub text: `fontSize: 12, fontWeight: 500, color: muted` with status dot
- Heading: `fontSize: clamp(26px, 5.5vw, 40px), fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.04em'`
- Text: "Hey {name}, what are we working on?"

### Agent Cards (single column)
- Label: `fontSize: 10, fontWeight: 700, color: muted, uppercase, letterSpacing: '0.1em', JetBrains Mono, padding: '18px 20px 8px'`
- Grid: `flexDirection: column, gap: 6, padding: '0 16px'`
- Card: `padding: '12px 14px', borderRadius: 14, background: s1, border: '1px solid' + border, cursor: pointer, display: flex, gap: 12`
  - Hover: `background: s2, borderColor: border2, transform: translateY(-1px), boxShadow: '0 6px 20px rgba(0,0,0,0.25)'`
  - Active: `borderColor: rgba(16,185,129,0.15)`, left accent bar 2px
  - Avatar: 38x38 circle, colored bg, initial letter `fontSize: 15, fontWeight: 800, color: #000`
  - Name: `fontSize: 13, fontWeight: 700`
  - Time: `fontSize: 10, color: dim, JetBrains Mono`
  - Preview: `fontSize: 12, color: muted, ellipsis overflow`
  - Status: `fontSize: 9, fontWeight: 600, JetBrains Mono` + 5x5 dot
    - Online: color accent, Working: color yellow, Idle: color dim
  - Unread badge: `minWidth: 18, height: 18, borderRadius: 9, background: accent, color: #000, fontSize: 9, fontWeight: 800, JetBrains Mono`
- **onClick: set selectedAgent + switch to chat tab**

## TASKS VIEW

### Top Controls
- Search bar: `background: s1, border: '1px solid' + border, borderRadius: 12, padding: '9px 14px'`
  - Focus: `borderColor: rgba(16,185,129,0.15)`
  - Input: `fontSize: 13`, placeholder color dim
  - Magnifying glass icon, color dim
- Project filters: horizontal scroll, gap 4
  - Pill: `padding: '5px 12px', borderRadius: 16, fontSize: 10, fontWeight: 700, border: '1px solid' + border, background: s1, color: text2`
  - Active pill: `background: accentBg, borderColor: rgba(16,185,129,0.2), color: accent`

### Building Now Section
- Card: `background: s2, border: '1px solid rgba(234,179,8,0.1)'`
- Title: `color: yellow, fontSize: 14`
- Animated progress bar: `background: yellow, height: 2px, top edge, keyframes bld 5s (5% -> 60% -> 90%)`

### Shipped Task Cards (COLOR CODED)
- Container: `padding: '14px 16px', borderRadius: 14, cursor: pointer`
- Hover: `transform: translateY(-2px), boxShadow: '0 8px 20px rgba(0,0,0,0.3)'`
- Colors: yellow=#EAB308, green=#22C55E, purple=#A78BFA, blue=#60A5FA, pink=#F472B6, orange=#FB923C, teal=#2DD4BF
- Title: `fontSize: 16, fontWeight: 800, lineHeight: 1.2, color: #0A0A0A`
- Tags: `fontSize: 9, fontWeight: 700, color: rgba(0,0,0,0.4), uppercase`
- QA Score: `fontSize: 20, fontWeight: 800, color: rgba(0,0,0,0.55), JetBrains Mono`

### Weekly Stats Bar
- Container: `background: s1, border: '1px solid' + border, borderRadius: 14, padding: '12px 14px'`
- Title: `fontSize: 10, fontWeight: 700, muted, uppercase, JetBrains Mono`
- Bar chart: 7 bars (M-S), `background: accent, borderRadius: 3, minHeight: 2`
- Day labels: `fontSize: 8, fontWeight: 600, color: dim, JetBrains Mono`
- Metrics row: 3 values, `JetBrains Mono, fontSize: 15, fontWeight: 800`
  - Labels: `fontSize: 8, fontWeight: 600, muted, uppercase`

## CHAT VIEW

### Header
- `padding: '10px 16px', borderBottom: '1px solid' + border, background: bg2`
- Back button: `background: none, border: none, color: muted, fontSize: 18`
- Avatar: 32x32 circle, colored, initial `fontSize: 13, fontWeight: 800, color: #000`
- Name: `fontSize: 14, fontWeight: 700`
- Status: `fontSize: 11, color: accent, fontWeight: 500`
- Action buttons: 32x32, `borderRadius: 10, background: s1, border, color: muted`

### Messages
- Container: `padding: '14px 16px', gap: 6, flexDirection: column`
- User bubble: `alignSelf: flex-end, background: accent, color: #000, fontWeight: 500, borderRadius: '18px 18px 4px 18px'`
- Agent bubble: `alignSelf: flex-start, background: s2, color: text2, borderRadius: '18px 18px 18px 4px'`
- Both: `maxWidth: '80%', padding: '10px 14px', fontSize: 14, lineHeight: 1.5`
- Timestamps: `fontSize: 10, color: dim`
- Read receipts: double check marks, `fontSize: 10, color: accent`

### Typing Indicator
- `background: s2, borderRadius: '18px 18px 18px 4px', padding: '12px 16px'`
- 3 dots: 6x6, `background: muted, animation: bounce 1.2s`, staggered delays

### Inline Task Card
- `background: s1, border: '1px solid' + border, borderRadius: 14, padding: '12px 16px', maxWidth: '88%'`
- Header: accent icon 18x18 + "TASK CREATED" label in accent, JetBrains Mono
- Title: `fontSize: 14, fontWeight: 700`
- Description: `fontSize: 12, color: muted`
- Footer: status pill + agent name

### Attachments
- Image: `borderRadius: 16, maxWidth: '70%', hover scale 1.02`
- File card: `background: s2, border, borderRadius: 14, padding: '10px 14px'`
  - Icon: 36x36, `borderRadius: 10, background: accentBg, color: accent, JetBrains Mono`
  - Name: `fontSize: 13, fontWeight: 600, ellipsis`
  - Size: `fontSize: 10, color: muted, JetBrains Mono`

## INPUT BAR (persistent across views)
- `padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))', background: bg, borderTop: '1px solid' + border`
- Wrapper: `background: s1, border: '1.5px solid' + border2, borderRadius: 26, padding: '5px 5px 5px 16px', maxWidth: 560, margin: '0 auto'`
- Focus: `borderColor: rgba(16,185,129,0.25), boxShadow: '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)'`
- Input: `fontSize: 15, fontWeight: 500`
- Attach button: 36x36 circle, paperclip SVG, `color: muted`
- Commands button: 36x36 circle, terminal SVG, `color: muted`
- Mic button: 42x42 circle, `background: accent, color: #000`
- Send button: 42x42 circle, `background: accent, color: #000`, shows when text present, hides mic

## VOICE MODE
- `padding: '14px 20px', background: bg2, borderTop: '1px solid' + border`
- Waveform: 9 bars, `width: 3, borderRadius: 2, background: accent, animation: vw 1s`
  - Heights: 14, 26, 38, 30, 18, 34, 22, 40, 16 (staggered delays)
- Status: `fontSize: 12, fontWeight: 600, color: accent, JetBrains Mono`
- Transcript: `fontSize: 13, color: text2, textAlign: center`
- End button: 42x42 circle, `background: red, color: #fff`
- Mute button: 42x42 circle, `background: s2, color: muted, border`

## MOBILE (max-width 480px)
- Hero: `padding: '20px 14px 10px'`, h1 fontSize 26
- Agents grid: `padding: '0 12px'`
- Nav stats: `display: none`

## TOAST
- Fixed bottom, `background: s2, border: '1px solid rgba(34,197,94,0.15)', borderRadius: 14, padding: '10px 16px'`
- Green dot 6x6 + message `fontSize: 12, fontWeight: 600, color: text2`
