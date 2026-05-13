// CornerV3/V4 color palette — single source of truth.
// R36 (2026-05-13) — tokens resolve via CSS variables so the Arizona
// time-of-day theme can flip the whole dashboard. The light palette
// activates when <html data-theme-mode="light"> (driven by
// `useThemeMode`). Default is dark. See `injectThemeVars` below for
// the var-table that ships at app boot.

export const C = {
  bg:        'var(--c-bg)',
  bg2:       'var(--c-bg2)',
  s1:        'var(--c-s1)',
  s2:        'var(--c-s2)',
  s3:        'var(--c-s3)',
  border:    'var(--c-border)',
  border2:   'var(--c-border2)',
  text:      'var(--c-text)',
  text2:     'var(--c-text2)',
  muted:     'var(--c-muted)',
  dim:       'var(--c-dim)',
  accent:    'var(--c-accent)',
  accent2:   'var(--c-accent2)',
  accentBg:  'var(--c-accent-bg)',
  // Chip backgrounds (replace the `C.dim + '40'` concat pattern; the
  // var resolves to a pre-mixed rgba per palette).
  chipBg:    'var(--c-chip-bg)',
  yellow:    'var(--c-yellow)',
  green:     'var(--c-green)',
  purple:    'var(--c-purple)',
  blue:      'var(--c-blue)',
  pink:      'var(--c-pink)',
  orange:    'var(--c-orange)',
  teal:      'var(--c-teal)',
  red:       'var(--c-red)',
}

const DARK_PALETTE = {
  '--c-bg':         '#06090F',
  '--c-bg2':        '#0B1018',
  '--c-s1':         '#111827',
  '--c-s2':         '#1A2035',
  '--c-s3':         '#222942',
  '--c-border':     'rgba(255,255,255,0.04)',
  '--c-border2':    'rgba(255,255,255,0.08)',
  '--c-text':       '#F1F5F9',
  '--c-text2':      '#94A3B8',
  '--c-muted':      '#475569',
  '--c-dim':        '#334155',
  '--c-accent':     '#10B981',
  '--c-accent2':    '#34D399',
  '--c-accent-bg':  'rgba(16,185,129,0.08)',
  '--c-chip-bg':    'rgba(51,65,85,0.25)',
  '--c-yellow':     '#EAB308',
  '--c-green':      '#22C55E',
  '--c-purple':     '#A78BFA',
  '--c-blue':       '#60A5FA',
  '--c-pink':       '#F472B6',
  '--c-orange':     '#FB923C',
  '--c-teal':       '#2DD4BF',
  '--c-red':        '#EF4444',
}

const LIGHT_PALETTE = {
  '--c-bg':         '#F6F2E9',
  '--c-bg2':        '#FAF7F0',
  '--c-s1':         '#FFFFFF',
  '--c-s2':         '#F1ECDF',
  '--c-s3':         '#E8E2D0',
  '--c-border':     'rgba(26,31,44,0.08)',
  '--c-border2':    'rgba(26,31,44,0.14)',
  '--c-text':       '#1A1F2C',
  '--c-text2':      'rgba(26,31,44,0.62)',
  '--c-muted':      'rgba(26,31,44,0.48)',
  '--c-dim':        'rgba(26,31,44,0.32)',
  '--c-accent':     '#0E8F66',
  '--c-accent2':    '#10B981',
  '--c-accent-bg':  'rgba(14,143,102,0.12)',
  '--c-chip-bg':    'rgba(26,31,44,0.10)',
  '--c-yellow':     '#B45309',
  '--c-green':      '#059669',
  '--c-purple':     '#6D28D9',
  '--c-blue':       '#2563EB',
  '--c-pink':       '#BE185D',
  '--c-orange':     '#C2410C',
  '--c-teal':       '#0F766E',
  '--c-red':        '#B91C1C',
}

// Inject a stylesheet binding the var-tables to `[data-theme-mode]`.
// Called once at app boot from `main.jsx` so every component reading
// from `C` resolves correctly before first paint. Safe to call again —
// rewrites the singleton <style> tag.
const STYLE_ID = 'cv3-theme-vars'
function paletteCss(palette) {
  return Object.entries(palette).map(([k, v]) => `${k}: ${v};`).join(' ')
}
export function injectThemeVars() {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  // We bind to `[data-theme]` (the attribute CornerV4 already manages
  // for its existing light/dark CSS) so both the moon toggle and the
  // useThemeMode hook flip the same switch.
  el.textContent = `
    :root, :root[data-theme="dark"], [data-theme="dark"] { ${paletteCss(DARK_PALETTE)} }
    :root[data-theme="light"], [data-theme="light"]      { ${paletteCss(LIGHT_PALETTE)} }
    html { background: var(--c-bg); }
    body { background: var(--c-bg); color: var(--c-text); }
  `
}

export const agentColors = {
  rex:     '#10B981',
  bobby:   '#EAB308',
  colton:  '#EAB308',
  steffen: '#A78BFA',
  cleo:    '#F472B6',
  elon:    '#60A5FA',
  gary:    '#FB923C',
  alex:    '#22C55E',
  tony:    '#22C55E',
  jacob:   '#FACC15',
}

export const STATUS_CONFIG = {
  BUILDING: { color: C.yellow,  pulse: false, label: 'Building'  },
  PLANNING: { color: '#F59E0B', pulse: false, label: 'Planning'  },
  QA:       { color: '#3B9EFF', pulse: false, label: 'QA'        },
  QUEUED:   { color: '#F59E0B', pulse: false, label: 'Queued'    },
  IDLE:     { color: '#3D4D60', pulse: false, label: 'Idle'      },
}

export function getStatusCfg(status) {
  return STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.IDLE
}
