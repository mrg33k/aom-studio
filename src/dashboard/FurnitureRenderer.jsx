import React from 'react'

// Config-driven furniture renderer. Loads placement from grid spec.
// Each furniture type maps to a reusable SVG component.

// Furniture type renderers - each returns SVG elements for its item
const FURNITURE_RENDERERS = {
  // DESKS
  'desk-standard': ({ x, y, w, h, color }) => (
    <rect x={x} y={y} width={w} height={h} fill={color || '#A07850'} rx={1} stroke="#7A5838" strokeWidth={0.3} />
  ),
  'desk-walnut': ({ x, y, w, h }) => (
    <rect x={x} y={y} width={w} height={h} fill="#8B6D4A" rx={1} stroke="#6B4F30" strokeWidth={0.3} />
  ),
  'desk-dark': ({ x, y, w, h }) => (
    <rect x={x} y={y} width={w} height={h} fill="#3A4050" rx={1} stroke="#252A38" strokeWidth={0.3} />
  ),
  'desk-metal': ({ x, y, w, h }) => (
    <rect x={x} y={y} width={w} height={h} fill="#5A6070" rx={1} stroke="#3A4050" strokeWidth={0.3} />
  ),

  // MONITORS
  'monitor-single': ({ x, y, glow }) => (
    <g>
      <rect x={x} y={y} width={20} height={16} fill="#1A1A2E" rx={1} stroke="#2A2A3E" strokeWidth={0.5} />
      <rect x={x + 2} y={y + 1} width={16} height={12} fill={glow || '#0D1A2E'} rx={1} />
      <rect x={x + 8} y={y + 16} width={4} height={3} fill="#3A4050" />
    </g>
  ),
  'monitor-dual': ({ x, y, glow1, glow2 }) => (
    <g>
      {[0, 1].map(i => (
        <g key={i}>
          <rect x={x + i * 22} y={y} width={20} height={16} fill="#1A1A2E" rx={1} stroke="#2A2A3E" strokeWidth={0.5} />
          <rect x={x + i * 22 + 2} y={y + 1} width={16} height={12} fill={i === 0 ? (glow1 || '#0D1A2E') : (glow2 || '#0D1A2E')} rx={1} />
        </g>
      ))}
    </g>
  ),
  'monitor-triple': ({ x, y, colors }) => (
    <g>
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x={x + i * 16} y={y} width={14} height={12} fill="#1A1A2E" rx={1} stroke="#2A2A3E" strokeWidth={0.5} />
          <rect x={x + i * 16 + 1} y={y + 1} width={12} height={9} fill={(colors && colors[i]) || '#0D1A2E'} rx={1} />
        </g>
      ))}
    </g>
  ),

  // LAPTOP
  'laptop-open': ({ x, y, glow }) => (
    <g>
      <rect x={x} y={y} width={18} height={12} fill="#333" rx={1} />
      <rect x={x + 1} y={y + 1} width={16} height={9} fill={glow || '#0D1A2E'} rx={1} />
      <rect x={x - 1} y={y + 12} width={20} height={3} fill="#444" rx={0.5} />
    </g>
  ),

  // CHAIRS
  'chair-office': ({ x, y, accent }) => (
    <g>
      <rect x={x + 2} y={y} width={12} height={10} fill={accent || '#2A3040'} rx={2} />
      <ellipse cx={x + 8} cy={y + 12} rx={6} ry={2} fill="#5A6070" />
    </g>
  ),
  'chair-executive': ({ x, y, accent }) => (
    <g>
      <rect x={x + 1} y={y - 3} width={14} height={15} fill={accent || '#2A3040'} rx={2} />
      <ellipse cx={x + 8} cy={y + 14} rx={7} ry={2.5} fill="#5A6070" />
    </g>
  ),
  'chair-stool': ({ x, y }) => (
    <g>
      <rect x={x + 3} y={y} width={10} height={6} fill="#2A3040" rx={2} />
      <line x1={x + 8} y1={y + 6} x2={x + 8} y2={y + 10} stroke="#5A6070" strokeWidth={2} />
    </g>
  ),

  // BOOKSHELF
  'bookshelf': ({ x, y }) => (
    <g>
      <rect x={x} y={y} width={32} height={40} fill="#A07850" rx={1} stroke="#7A5838" strokeWidth={0.5} />
      {[0, 1, 2].map(shelf => (
        <g key={shelf}>
          <line x1={x + 2} y1={y + 10 + shelf * 12} x2={x + 30} y2={y + 10 + shelf * 12} stroke="#7A5838" strokeWidth={0.5} />
          {[0, 1, 2, 3].map(book => (
            <rect key={book}
              x={x + 4 + book * 7} y={y + shelf * 12 + 2}
              width={3 + Math.random() * 2} height={7 + shelf}
              fill={['#3B82F6', '#EF4444', '#7C9A72', '#FDF6EC', '#8B6D4A'][book % 5]}
              opacity={0.7} rx={0.5}
            />
          ))}
        </g>
      ))}
    </g>
  ),
  'bookshelf-small': ({ x, y }) => (
    <g>
      <rect x={x} y={y} width={16} height={28} fill="#A07850" rx={1} stroke="#7A5838" strokeWidth={0.5} />
      {[0, 1].map(shelf => (
        <g key={shelf}>
          <line x1={x + 1} y1={y + 12 + shelf * 12} x2={x + 15} y2={y + 12 + shelf * 12} stroke="#7A5838" strokeWidth={0.5} />
          {[0, 1].map(book => (
            <rect key={book}
              x={x + 2 + book * 6} y={y + shelf * 12 + 2}
              width={4} height={8}
              fill={['#3B82F6', '#7C9A72'][book]} opacity={0.6} rx={0.5}
            />
          ))}
        </g>
      ))}
    </g>
  ),

  // PLANTS
  'plant-potted': ({ x, y }) => (
    <g>
      <circle cx={x + 7} cy={y + 4} r={6} fill="#5A8848" opacity={0.7} />
      <circle cx={x + 4} cy={y + 6} r={4} fill="#7CAA6A" opacity={0.5} />
      <rect x={x + 3} y={y + 10} width={8} height={6} fill="#C8B8A8" rx={1} />
    </g>
  ),
  'plant-tall': ({ x, y }) => (
    <g>
      <circle cx={x + 7} cy={y + 6} r={10} fill="#5A8848" opacity={0.5} />
      <circle cx={x + 7} cy={y + 4} r={7} fill="#7CAA6A" opacity={0.4} />
      <rect x={x + 3} y={y + 14} width={8} height={8} fill="#C8B8A8" rx={1} />
    </g>
  ),
  'plant-succulent': ({ x, y }) => (
    <g>
      <circle cx={x + 4} cy={y + 2} r={3} fill="#5A8848" opacity={0.6} />
      <rect x={x + 1} y={y + 4} width={6} height={4} fill="#C8B8A8" rx={1} />
    </g>
  ),

  // COFFEE
  'coffee-mug': ({ x, y, steam }) => (
    <g>
      <circle cx={x + 4} cy={y + 4} r={4} fill="#E8DDD0" stroke="#C8B8A8" strokeWidth={0.5} />
      <rect x={x + 7} y={y + 2} width={2} height={4} fill="#C8B8A8" rx={0.5} />
      {steam !== false && (
        <g>
          {[0, 1, 2].map(i => (
            <circle key={i} cx={x + 3 + i * 2} cy={y - 2 - i} r={0.8} fill="#FFF" opacity={0.15}>
              <animate attributeName="cy" values={`${y - 2 - i};${y - 6 - i};${y - 2 - i}`} dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.15;0.05;0.15" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      )}
    </g>
  ),

  // DESK LAMP
  'desk-lamp': ({ x, y, lightColor }) => (
    <g>
      <line x1={x + 6} y1={y + 16} x2={x + 10} y2={y + 4} stroke="#8A94A8" strokeWidth={1.5} />
      <line x1={x + 10} y1={y + 4} x2={x + 6} y2={y - 2} stroke="#8A94A8" strokeWidth={1.5} />
      <path d={`M${x + 2},${y - 2} L${x + 10},${y - 2} L${x + 8},${y + 4} L${x + 4},${y + 4} Z`}
        fill={lightColor || '#FFB74D'} opacity={0.5} />
      <circle cx={x + 6} cy={y + 2} r={4} fill={lightColor || '#FFB74D'} opacity={0.08}>
        <animate attributeName="opacity" values="0.06;0.12;0.06" dur="3s" repeatCount="indefinite" />
      </circle>
    </g>
  ),

  // PENDANT LIGHT
  'lamp-pendant': ({ x, y, lightColor }) => (
    <g>
      <line x1={x + 5} y1={0} x2={x + 5} y2={y} stroke="#B8860B" strokeWidth={0.8} />
      <polygon points={`${x},${y} ${x + 10},${y} ${x + 8},${y + 6} ${x + 2},${y + 6}`}
        fill="#B8860B" opacity={0.7} />
      <circle cx={x + 5} cy={y + 4} r={8} fill={lightColor || '#FFD87A'} opacity={0.06}>
        <animate attributeName="opacity" values="0.04;0.08;0.04" dur="6s" repeatCount="indefinite" />
      </circle>
    </g>
  ),

  // WHITEBOARD
  'whiteboard': ({ x, y, accentColor }) => (
    <g>
      <rect x={x} y={y} width={32} height={24} fill="#F0ECE6" rx={1} stroke="#B0B8C8" strokeWidth={0.5} />
      {[0, 1, 2].map(i => (
        <line key={i}
          x1={x + 4} y1={y + 6 + i * 6}
          x2={x + 20 + Math.random() * 8} y2={y + 6 + i * 6}
          stroke={accentColor || '#3B82F6'} strokeWidth={1} opacity={0.4}
        />
      ))}
      {[0, 1, 2].map(i => (
        <circle key={`marker-${i}`}
          cx={x + 8 + i * 8} cy={y + 22}
          r={1.5}
          fill={['#EF4444', '#3B82F6', '#22C55E'][i]}
        />
      ))}
    </g>
  ),
  'whiteboard-large': ({ x, y, accentColor }) => (
    <g>
      <rect x={x} y={y} width={64} height={28} fill="#F0ECE6" rx={1} stroke="#B0B8C8" strokeWidth={0.5} />
      <text x={x + 32} y={y + 8} textAnchor="middle" fill="#333" fontSize={5}
        fontFamily="JetBrains Mono, monospace" fontWeight={700} opacity={0.5}>PIPELINE</text>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <rect key={i}
          x={x + 4 + i * 10}
          y={y + 12}
          width={8} height={4}
          fill={['#E85D26', '#F59E0B', '#3B82F6', '#9C27B0', '#10B981', '#EF4444'][i]}
          opacity={0.5} rx={1}
        />
      ))}
    </g>
  ),

  // SERVER RACK
  'server-rack': ({ x, y, animate: shouldAnimate }) => (
    <g>
      <rect x={x} y={y} width={16} height={40} fill="#252A38" rx={1} stroke="#3A4050" strokeWidth={0.5} />
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i}>
          <line x1={x + 1} y1={y + 4 + i * 4.5} x2={x + 15} y2={y + 4 + i * 4.5} stroke="#3A4050" strokeWidth={0.3} />
          <circle
            cx={x + 4 + (i % 3) * 4}
            cy={y + 2 + i * 4.5}
            r={1.5}
            fill={i % 2 === 0 ? '#4CAF50' : '#2196F3'}
          >
            {shouldAnimate !== false && (
              <animate attributeName="opacity"
                values={`${0.3 + Math.random() * 0.3};${0.7 + Math.random() * 0.3};${0.3 + Math.random() * 0.3}`}
                dur={`${1 + Math.random() * 2}s`}
                repeatCount="indefinite"
                begin={`${Math.random() * 2}s`}
              />
            )}
          </circle>
        </g>
      ))}
    </g>
  ),

  // COUCH
  'couch-sectional': ({ x, y }) => (
    <g>
      <rect x={x} y={y} width={48} height={28} fill="#2A3040" rx={2} stroke="#1A2030" strokeWidth={0.5} />
      <rect x={x + 2} y={y + 2} width={30} height={14} fill="#404858" rx={2} />
      <rect x={x + 32} y={y + 2} width={14} height={24} fill="#404858" rx={2} />
    </g>
  ),

  // CAMERA ON TRIPOD
  'camera-tripod': ({ x, y, recording }) => (
    <g>
      <rect x={x + 3} y={y} width={10} height={7} fill="#252A38" rx={1} />
      <circle cx={x + 5} cy={y + 3} r={2} fill="#3A4050" stroke="#5A6070" strokeWidth={0.5} />
      {recording && (
        <circle cx={x + 11} cy={y + 1} r={1.5} fill="#EF4444">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
      <line x1={x + 8} y1={y + 7} x2={x + 4} y2={y + 22} stroke="#5A6070" strokeWidth={1} />
      <line x1={x + 8} y1={y + 7} x2={x + 12} y2={y + 22} stroke="#5A6070" strokeWidth={1} />
      <line x1={x + 8} y1={y + 7} x2={x + 8} y2={y + 20} stroke="#5A6070" strokeWidth={1} />
    </g>
  ),

  // RING LIGHT
  'ring-light': ({ x, y, active }) => (
    <g>
      <line x1={x + 8} y1={y + 16} x2={x + 8} y2={y + 28} stroke="#8A94A8" strokeWidth={1.5} />
      <circle cx={x + 8} cy={y + 8} r={8} fill="none" stroke={active ? '#FFD87A' : '#8A94A8'} strokeWidth={1.5} opacity={active ? 0.8 : 0.3}>
        {active && (
          <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
        )}
      </circle>
      {active && (
        <circle cx={x + 8} cy={y + 8} r={10} fill="#FFD87A" opacity={0.05}>
          <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <rect x={x + 6} y={y + 5} width={4} height={6} fill="#252A38" rx={1} />
    </g>
  ),

  // ESPRESSO MACHINE
  'espresso-machine': ({ x, y }) => (
    <g>
      <rect x={x} y={y} width={16} height={18} fill="#8A94A8" rx={1} stroke="#6A7488" strokeWidth={0.5} />
      <rect x={x + 2} y={y + 12} width={12} height={3} fill="#5A6070" rx={0.5} />
      <rect x={x + 5} y={y + 6} width={6} height={2} fill="#3A4050" rx={0.5} />
      <rect x={x + 6} y={y + 15} width={4} height={4} fill="#E8DDD0" rx={0.5} />
    </g>
  ),

  // AREA RUG
  'rug-area': ({ x, y, accentColor }) => (
    <rect x={x} y={y} width={64} height={32} fill={accentColor || '#8A7A68'} opacity={0.2} rx={1}
      stroke={accentColor || '#8A7A68'} strokeWidth={0.5} strokeOpacity={0.3} />
  ),
}

// Room layout definitions - maps room ID to furniture placements
// Each placement: { type, x (% of roomW), y (% of roomH), props }
const ROOM_LAYOUTS = {
  patrik: (rW, rH, isActive) => [
    { type: 'desk-walnut', x: rW * 0.15, y: rH * 0.25, w: rW * 0.5, h: rH * 0.2 },
    { type: 'laptop-open', x: rW * 0.2, y: rH * 0.18, glow: isActive ? '#E85D26' : '#0D1A2E' },
    { type: 'coffee-mug', x: rW * 0.52, y: rH * 0.26 },
    { type: 'plant-potted', x: rW * 0.78, y: rH * 0.05 },
    { type: 'lamp-pendant', x: rW * 0.35, y: rH * 0.08, lightColor: '#FFD87A' },
    { type: 'whiteboard', x: rW * 0.62, y: rH * 0.05, accentColor: '#E85D26' },
    { type: 'chair-executive', x: rW * 0.3, y: rH * 0.5, accent: 'rgba(232,93,38,0.15)' },
  ],
  mom: (rW, rH, isActive) => [
    { type: 'desk-standard', x: rW * 0.08, y: rH * 0.2, w: rW * 0.45, h: rH * 0.18, color: '#A07850' },
    { type: 'monitor-triple', x: rW * 0.1, y: rH * 0.05, colors: ['#F59E0B', '#22C55E', '#3B82F6'] },
    { type: 'whiteboard-large', x: rW * 0.55, y: rH * 0.04 },
    { type: 'chair-stool', x: rW * 0.25, y: rH * 0.45 },
  ],
  alex: (rW, rH, isActive) => [
    { type: 'desk-walnut', x: rW * 0.08, y: rH * 0.3, w: rW * 0.42, h: rH * 0.18 },
    { type: 'laptop-open', x: rW * 0.12, y: rH * 0.22, glow: isActive ? '#3B82F6' : '#1A237E' },
    { type: 'bookshelf', x: rW * 0.58, y: rH * 0.02 },
    { type: 'whiteboard', x: rW * 0.58, y: rH * 0.55, accentColor: '#3B82F6' },
    { type: 'coffee-mug', x: rW * 0.42, y: rH * 0.32 },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.55, accent: 'rgba(59,130,246,0.15)' },
  ],
  steve: (rW, rH, isActive) => [
    { type: 'desk-standard', x: rW * 0.08, y: rH * 0.3, w: rW * 0.42, h: rH * 0.18, color: '#A07850' },
    { type: 'laptop-open', x: rW * 0.12, y: rH * 0.22, glow: isActive ? '#7C9A72' : '#0D2137' },
    { type: 'bookshelf-small', x: rW * 0.78, y: rH * 0.04 },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.55, accent: 'rgba(124,154,114,0.15)' },
  ],
  steffen: (rW, rH, isActive) => [
    { type: 'desk-standard', x: rW * 0.35, y: rH * 0.35, w: rW * 0.42, h: rH * 0.18, color: '#C4956A' },
    { type: 'monitor-single', x: rW * 0.42, y: rH * 0.2, glow: isActive ? '#C9A84C' : '#1A237E' },
    { type: 'plant-potted', x: rW * 0.05, y: rH * 0.7 },
    { type: 'desk-lamp', x: rW * 0.7, y: rH * 0.2, lightColor: '#FFD87A' },
    { type: 'chair-office', x: rW * 0.45, y: rH * 0.6, accent: 'rgba(201,168,76,0.15)' },
  ],
  'main-hall': (rW, rH) => [
    { type: 'rug-area', x: rW * 0.08, y: rH * 0.1, accentColor: '#C4956A' },
    { type: 'couch-sectional', x: rW * 0.08, y: rH * 0.3 },
    { type: 'whiteboard-large', x: rW * 0.02, y: rH * 0.02 },
    { type: 'espresso-machine', x: rW * 0.82, y: rH * 0.05 },
    { type: 'plant-tall', x: rW * 0.88, y: rH * 0.35 },
  ],
  bobby: (rW, rH, isActive) => [
    { type: 'desk-dark', x: rW * 0.05, y: rH * 0.2, w: rW * 0.55, h: rH * 0.18 },
    { type: 'monitor-triple', x: rW * 0.07, y: rH * 0.04, colors: ['#CE93D8', '#4FC3F7', '#81C784'] },
    { type: 'plant-succulent', x: rW * 0.5, y: rH * 0.22 },
    { type: 'lamp-pendant', x: rW * 0.4, y: rH * 0.02, lightColor: '#CE93D8' },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.5, accent: 'rgba(156,39,176,0.15)' },
  ],
  colton: (rW, rH, isActive) => [
    { type: 'desk-standard', x: rW * 0.08, y: rH * 0.25, w: rW * 0.42, h: rH * 0.18, color: '#A07850' },
    { type: 'monitor-dual', x: rW * 0.1, y: rH * 0.08, glow1: isActive ? '#06B6D4' : '#0D1A2E', glow2: '#0D1A2E' },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.55, accent: 'rgba(6,182,212,0.15)' },
  ],
  cleo: (rW, rH, isActive) => [
    { type: 'desk-dark', x: rW * 0.05, y: rH * 0.25, w: rW * 0.45, h: rH * 0.18 },
    { type: 'monitor-dual', x: rW * 0.07, y: rH * 0.08, glow1: isActive ? '#F97316' : '#1A1A1A', glow2: '#1A1A1A' },
    { type: 'camera-tripod', x: rW * 0.65, y: rH * 0.1, recording: isActive },
    { type: 'desk-lamp', x: rW * 0.55, y: rH * 0.2, lightColor: '#FFB74D' },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.55, accent: 'rgba(249,115,22,0.15)' },
  ],
  tony: (rW, rH, isActive) => [
    { type: 'desk-standard', x: rW * 0.08, y: rH * 0.25, w: rW * 0.4, h: rH * 0.18, color: '#A07850' },
    { type: 'monitor-single', x: rW * 0.15, y: rH * 0.1, glow: isActive ? '#EC4899' : '#1A1A2E' },
    { type: 'ring-light', x: rW * 0.68, y: rH * 0.1, active: isActive },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.55, accent: 'rgba(236,72,153,0.15)' },
  ],
  jacob: (rW, rH, isActive) => [
    { type: 'desk-standard', x: rW * 0.08, y: rH * 0.25, w: rW * 0.45, h: rH * 0.18, color: '#5A6070' },
    { type: 'monitor-single', x: rW * 0.15, y: rH * 0.08, glow: isActive ? '#EF4444' : '#1A1A2E' },
    { type: 'coffee-mug', x: rW * 0.45, y: rH * 0.28, steam: true },
    { type: 'whiteboard', x: rW * 0.58, y: rH * 0.04, accentColor: '#EF4444' },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.55, accent: 'rgba(239,68,68,0.15)' },
  ],
  elmo: (rW, rH, isActive) => [
    { type: 'desk-standard', x: rW * 0.08, y: rH * 0.25, w: rW * 0.52, h: rH * 0.18, color: '#E8E0D8' },
    { type: 'monitor-dual', x: rW * 0.1, y: rH * 0.08, glow1: '#1B5E20', glow2: '#B71C1C' },
    { type: 'chair-office', x: rW * 0.2, y: rH * 0.55, accent: 'rgba(16,185,129,0.15)' },
  ],
  elon: (rW, rH, isActive) => [
    { type: 'server-rack', x: rW * 0.55, y: rH * 0.02, animate: isActive },
    { type: 'server-rack', x: rW * 0.72, y: rH * 0.02, animate: isActive },
    { type: 'server-rack', x: rW * 0.72, y: rH * 0.45, animate: isActive },
    { type: 'desk-standard', x: rW * 0.05, y: rH * 0.25, w: rW * 0.4, h: rH * 0.18, color: '#3A4050' },
    { type: 'monitor-single', x: rW * 0.12, y: rH * 0.08, glow: '#0D1A0D' },
    { type: 'chair-office', x: rW * 0.18, y: rH * 0.55, accent: 'rgba(76,175,80,0.15)' },
  ],
}

// Main render function - takes room id, dimensions, and active state
export function renderFurniture(roomId, roomW, roomH, isActive) {
  const layoutFn = ROOM_LAYOUTS[roomId]
  if (!layoutFn) return null

  const items = layoutFn(roomW, roomH, isActive)

  return (
    <g>
      {items.map((item, i) => {
        const Renderer = FURNITURE_RENDERERS[item.type]
        if (!Renderer) return null
        return <g key={`${roomId}-furniture-${i}`}><Renderer {...item} /></g>
      })}
    </g>
  )
}

export { FURNITURE_RENDERERS, ROOM_LAYOUTS }
