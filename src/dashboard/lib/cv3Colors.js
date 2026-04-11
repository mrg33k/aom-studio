// CornerV3 color palette (dark-first)
// Extracted from CornerV3.jsx -- single source of truth for all CV3 components.

export const C = {
  bg:        '#06090F',
  bg2:       '#0B1018',
  s1:        '#111827',
  s2:        '#1A2035',
  s3:        '#222942',
  border:    'rgba(255,255,255,0.04)',
  border2:   'rgba(255,255,255,0.08)',
  text:      '#F1F5F9',
  text2:     '#94A3B8',
  muted:     '#475569',
  dim:       '#334155',
  accent:    '#10B981',
  accent2:   '#34D399',
  accentBg:  'rgba(16,185,129,0.08)',
  yellow:    '#EAB308',
  green:     '#22C55E',
  purple:    '#A78BFA',
  blue:      '#60A5FA',
  pink:      '#F472B6',
  orange:    '#FB923C',
  teal:      '#2DD4BF',
  red:       '#EF4444',
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
