// Corner Dashboard - Room Grid Specification
// Corner C2 Grid Spec - loaded from Steffen's c2-grid-spec.json
// Machine-readable room positions, furniture, animations, colors

const GRID_SPEC = {
  meta: {
    product: 'Corner',
    version: '1.0',
    author: 'Steffen',
  },
  grid: {
    cellSize: 64,
    cols: 8,
    rows: 6,
    isoAngle: 30,
    isoRatio: '2:1',
  },
  rooms: [
    {
      id: 'patrik', name: "Patrik's Corner Office", agent: 'Patrik', role: 'Owner / CEO',
      position: { col: 0, row: 0 }, size: { cols: 2, rows: 1 },
      walls: { north: 'exterior-window', west: 'exterior-window', south: 'interior-door', east: 'interior-door' },
      floor: 'wood-walnut', floorColor: '#8B6D4A',
      lighting: 'warm-pendant', lightColor: '#FFD87A',
      agentColor: '#E85D26',
      statusColors: { active: '#E85D26', idle: '#8A5A3A', offline: '#3D2A1A' },
      furniture: ['walnut-l-desk', 'laptop-open', 'coffee-mug-steam', 'small-potted-plant', 'brass-pendant-light', 'mood-board-wall', 'executive-chair'],
      ambientAnimations: [
        { id: 'monitor-flicker', target: 'laptop-open', frameCount: 4, frameDuration: 800, loop: true },
        { id: 'steam-rise', target: 'coffee-mug-steam', frameCount: 6, frameDuration: 400, loop: true },
        { id: 'light-pulse', target: 'brass-pendant-light', frameCount: 2, frameDuration: 2000, loop: true },
      ],
      personality: 'Spacious, minimal, boss energy. Two windows, most breathing room of any room.',
    },
    {
      id: 'mom', name: "Mom's Command Center", agent: 'Mom', role: 'Orchestrator',
      position: { col: 2, row: 0 }, size: { cols: 2, rows: 1 },
      walls: { north: 'exterior-window', west: 'interior-door', south: 'interior-open', east: 'interior' },
      floor: 'wood-oak', floorColor: '#A07850',
      lighting: 'overhead-panel', lightColor: '#E0D8C8',
      agentColor: '#F59E0B',
      statusColors: { active: '#F59E0B', idle: '#A07830', offline: '#4A3818' },
      furniture: ['standing-desk', 'monitor-triple-dashboard', 'pipeline-wall-screen', 'status-light-strip', 'priority-board', 'post-it-wall', 'ergonomic-stool'],
      ambientAnimations: [
        { id: 'dashboard-scroll', target: 'monitor-triple-dashboard', frameCount: 8, frameDuration: 600, loop: true },
        { id: 'status-blink', target: 'status-light-strip', frameCount: 4, frameDuration: 1000, loop: true },
        { id: 'screen-update', target: 'pipeline-wall-screen', frameCount: 3, frameDuration: 2000, loop: true },
      ],
      personality: 'Mission control. Intense, organized. Multiple monitors, status lights, always watching the pipeline.',
    },
    {
      id: 'alex', name: "Alex's Strategy Room", agent: 'Alex', role: 'Strategy / Biz Dev',
      position: { col: 4, row: 0 }, size: { cols: 2, rows: 1 },
      walls: { north: 'exterior-window', west: 'interior', south: 'interior-open', east: 'interior' },
      floor: 'wood-dark', floorColor: '#6B5240',
      lighting: 'warm-desk-lamp', lightColor: '#FFB74D',
      agentColor: '#3B82F6',
      statusColors: { active: '#3B82F6', idle: '#2A5090', offline: '#1A2A50' },
      furniture: ['mahogany-desk', 'laptop-open', 'bookshelf-strategy', 'whiteboard-offer-ladder', 'desk-globe', 'coffee-cup', 'leather-chair', 'strategy-docs-spread'],
      ambientAnimations: [
        { id: 'monitor-flicker', target: 'laptop-open', frameCount: 4, frameDuration: 800, loop: true },
        { id: 'globe-spin', target: 'desk-globe', frameCount: 12, frameDuration: 500, loop: true },
      ],
      personality: 'Consulting firm partner office. Warm but analytical. Books, globe, whiteboard with market maps.',
    },
    {
      id: 'steve', name: "Steve's Advisory Lab", agent: 'Steve', role: 'AI Advisory Lead',
      position: { col: 6, row: 0 }, size: { cols: 2, rows: 1 },
      walls: { north: 'exterior-window', west: 'interior', south: 'interior-door', east: 'exterior-window' },
      floor: 'wood-light', floorColor: '#C4A882',
      lighting: 'overhead-panel', lightColor: '#E0D8C8',
      agentColor: '#7C9A72',
      statusColors: { active: '#7C9A72', idle: '#4A6040', offline: '#2A3A20' },
      furniture: ['clean-desk', 'laptop-schema', 'bookshelf-technical', 'wall-architecture-diagrams', 'desk-globe-small', 'calculator', 'desk-chair'],
      ambientAnimations: [
        { id: 'monitor-flicker', target: 'laptop-schema', frameCount: 4, frameDuration: 800, loop: true },
        { id: 'diagram-highlight', target: 'wall-architecture-diagrams', frameCount: 3, frameDuration: 3000, loop: true },
      ],
      personality: 'Quiet, focused, analytical. NE corner. Architecture diagrams on walls. Where frameworks are born.',
    },
    {
      id: 'steffen', name: "Steffen's Design Studio", agent: 'Steffen', role: 'Brand / Creative Director',
      position: { col: 0, row: 1 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior-door', west: 'exterior-arched-window', south: 'interior', east: 'interior-open' },
      floor: 'wood-warm', floorColor: '#C4956A',
      lighting: 'natural-golden', lightColor: '#FFD87A',
      agentColor: '#C9A84C',
      statusColors: { active: '#C9A84C', idle: '#8A7030', offline: '#4A3A18' },
      furniture: ['art-desk', 'imac-color-wheel', 'mood-board-large', 'canvases-leaning', 'pantone-books', 'paint-swatches', 'arched-window', 'desk-stool'],
      ambientAnimations: [
        { id: 'monitor-flicker', target: 'imac-color-wheel', frameCount: 4, frameDuration: 800, loop: true },
        { id: 'sunlight-shift', target: 'arched-window', frameCount: 3, frameDuration: 5000, loop: true },
      ],
      personality: 'Art studio. Arched window with golden light. Mood boards, canvases, warm wood floor. The most creative room.',
    },
    {
      id: 'main-hall', name: 'Main Hall', agent: null, role: 'Communal Space',
      position: { col: 2, row: 1 }, size: { cols: 4, rows: 1 },
      walls: { north: 'interior-open', west: 'interior-open', south: 'interior-open', east: 'interior-open' },
      floor: 'wood-warm', floorColor: '#C4956A',
      lighting: 'overhead-warm', lightColor: '#FFB74D',
      agentColor: null,
      statusColors: null,
      furniture: ['couch-sectional', 'whiteboard-pipeline', 'potted-plant-tall', 'coffee-station', 'espresso-machine', 'pendant-lights-cluster', 'rug-area'],
      ambientAnimations: [
        { id: 'steam-rise', target: 'espresso-machine', frameCount: 6, frameDuration: 400, loop: true },
        { id: 'light-pulse', target: 'pendant-lights-cluster', frameCount: 2, frameDuration: 3000, loop: true },
      ],
      personality: 'Open communal heart. Couch, whiteboard with pipeline, coffee station, tall plant. Cross-team energy.',
    },
    {
      id: 'jacob', name: "Jacob's Outreach Office", agent: 'Jacob', role: 'Outreach',
      position: { col: 6, row: 1 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior-door', west: 'interior-open', south: 'interior', east: 'exterior-window' },
      floor: 'carpet-commercial', floorColor: '#7A7068',
      lighting: 'overhead-fluorescent', lightColor: '#E0D8C8',
      agentColor: '#EF4444',
      statusColors: { active: '#EF4444', idle: '#A03030', offline: '#501818' },
      furniture: ['metal-desk', 'phone-headset', 'monitor-crm', 'phoenix-map-wall', 'business-cards-stack', 'notepad', 'coffee-cups-plural', 'desk-chair'],
      ambientAnimations: [
        { id: 'monitor-flicker', target: 'monitor-crm', frameCount: 4, frameDuration: 800, loop: true },
        { id: 'phone-ring', target: 'phone-headset', frameCount: 3, frameDuration: 200, loop: false },
      ],
      personality: 'Professional but scrappy. Grinding. Phoenix metro map with pins, stack of business cards, multiple coffee cups.',
    },
    {
      id: 'bobby', name: "Bobby's Dev Lab", agent: 'Bobby', role: 'Web Dev',
      position: { col: 0, row: 2 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior', west: 'exterior-window', south: 'interior', east: 'interior' },
      floor: 'wood-dark', floorColor: '#5A4A3A',
      lighting: 'led-purple', lightColor: '#CE93D8',
      agentColor: '#9C27B0',
      statusColors: { active: '#9C27B0', idle: '#6A1A7A', offline: '#3A0A40' },
      furniture: ['l-desk-dark', 'monitor-triple-code', 'mechanical-keyboard-rgb', 'headphones-desk', 'succulent-plant', 'energy-drink', 'led-strip-purple', 'geometric-pendant'],
      ambientAnimations: [
        { id: 'code-scroll', target: 'monitor-triple-code', frameCount: 8, frameDuration: 300, loop: true },
        { id: 'led-breathe', target: 'led-strip-purple', frameCount: 6, frameDuration: 800, loop: true },
        { id: 'keyboard-type', target: 'mechanical-keyboard-rgb', frameCount: 4, frameDuration: 150, loop: false },
      ],
      personality: 'Dev cave. Purple LED underglow, triple monitors, dark walls, late-night energy. The room hums.',
    },
    {
      id: 'colton', name: "Colton's Builder Bay", agent: 'Colton', role: 'Backup Builder',
      position: { col: 2, row: 2 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior-open', west: 'interior-shared-shelf', south: 'interior', east: 'interior' },
      floor: 'wood-medium', floorColor: '#A07850',
      lighting: 'overhead-neutral', lightColor: '#E0D8C8',
      agentColor: '#06B6D4',
      statusColors: { active: '#06B6D4', idle: '#047A8A', offline: '#023A40' },
      furniture: ['standing-desk-compact', 'monitor-dual', 'component-library-wall', 'shared-shelf-window', 'desk-organizer', 'task-chair'],
      ambientAnimations: [
        { id: 'code-scroll', target: 'monitor-dual', frameCount: 8, frameDuration: 300, loop: true },
        { id: 'monitor-flicker', target: 'monitor-dual', frameCount: 4, frameDuration: 800, loop: true },
      ],
      personality: 'Similar to Bobby but smaller, more organized. Methodical. Shared tooling shelf between rooms.',
    },
    {
      id: 'cleo', name: "Cleo's Content Studio", agent: 'Cleo', role: 'Content Production',
      position: { col: 4, row: 2 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior-open', west: 'interior', south: 'interior', east: 'interior' },
      floor: 'wood-dark', floorColor: '#5A4A3A',
      lighting: 'warm-desk-lamp', lightColor: '#FFB74D',
      agentColor: '#F97316',
      statusColors: { active: '#F97316', idle: '#A04A10', offline: '#502508' },
      furniture: ['editing-desk', 'monitor-dual-timeline', 'camera-tripod', 'clapperboard', 'film-reel-poster', 'desk-lamp-orange', 'brick-accent-wall', 'speaker-setup', 'headphones-hook', 'waveform-monitor'],
      ambientAnimations: [
        { id: 'timeline-scrub', target: 'monitor-dual-timeline', frameCount: 6, frameDuration: 500, loop: true },
        { id: 'waveform-pulse', target: 'waveform-monitor', frameCount: 8, frameDuration: 200, loop: true },
        { id: 'light-warm-flicker', target: 'desk-lamp-orange', frameCount: 2, frameDuration: 3000, loop: true },
      ],
      personality: 'Content studio. Camera, editing timeline, dark brick wall, orange desk lamp. Audio waveforms on secondary monitor.',
    },
    {
      id: 'tony', name: "Tony's Social Media Hub", agent: 'Tony', role: 'Social Media',
      position: { col: 6, row: 2 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior', west: 'interior', south: 'exterior', east: 'exterior-window' },
      floor: 'wood-light', floorColor: '#C4A882',
      lighting: 'ring-light', lightColor: '#FFFFFF',
      agentColor: '#EC4899',
      statusColors: { active: '#EC4899', idle: '#A03060', offline: '#501830' },
      furniture: ['modern-desk', 'phone-screens-multi', 'content-calendar-wall', 'ring-light-corner', 'trendy-posters', 'colorful-accent-shelf', 'desk-chair-modern'],
      ambientAnimations: [
        { id: 'phone-scroll', target: 'phone-screens-multi', frameCount: 6, frameDuration: 400, loop: true },
        { id: 'ring-light-on', target: 'ring-light-corner', frameCount: 2, frameDuration: 4000, loop: true },
        { id: 'notification-pop', target: 'phone-screens-multi', frameCount: 3, frameDuration: 300, loop: false },
      ],
      personality: 'Young energy. Phone screens showing socials, content calendar, ring light, trendy posters. Most colorful room.',
    },
    {
      id: 'elmo', name: "Elmo's QA Lab", agent: 'Elmo', role: 'Quality Assurance',
      position: { col: 2, row: 3 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior', west: 'exterior', south: 'exterior', east: 'interior' },
      floor: 'tile-white', floorColor: '#D0D0D0',
      lighting: 'overhead-clinical', lightColor: '#F0F0F0',
      agentColor: '#10B981',
      statusColors: { active: '#10B981', idle: '#087050', offline: '#043828' },
      furniture: ['clinical-desk', 'monitor-dual-screenshots', 'checklist-wall', 'red-pen', 'magnifying-glass', 'lab-coat-hook', 'task-chair-white'],
      ambientAnimations: [
        { id: 'screenshot-compare', target: 'monitor-dual-screenshots', frameCount: 4, frameDuration: 1500, loop: true },
        { id: 'checklist-tick', target: 'checklist-wall', frameCount: 2, frameDuration: 3000, loop: false },
      ],
      personality: 'Clean, clinical, orderly. White-ish walls, dual screenshots side by side, magnifying glass, lab coat. The inspector.',
    },
    {
      id: 'elon', name: "Elon's Server Room", agent: 'Elon', role: 'Infrastructure / Systems',
      position: { col: 4, row: 3 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior', west: 'interior', south: 'exterior', east: 'exterior' },
      floor: 'tile-industrial', floorColor: '#8B9DAF',
      lighting: 'bare-bulb', lightColor: '#C0C8D0',
      agentColor: '#4CAF50',
      statusColors: { active: '#4CAF50', idle: '#2A6A2A', offline: '#143814' },
      furniture: ['server-rack-1', 'server-rack-2', 'server-rack-3', 'terminal-desk', 'green-screen-terminal', 'exposed-conduit', 'cables-ceiling', 'bare-bulb-overhead'],
      ambientAnimations: [
        { id: 'server-blink', target: 'server-rack-1', frameCount: 4, frameDuration: 600, loop: true },
        { id: 'server-blink-2', target: 'server-rack-2', frameCount: 4, frameDuration: 800, loop: true },
        { id: 'terminal-scroll', target: 'green-screen-terminal', frameCount: 8, frameDuration: 200, loop: true },
        { id: 'bulb-flicker', target: 'bare-bulb-overhead', frameCount: 2, frameDuration: 5000, loop: true },
      ],
      personality: 'Engine room. No windows, no natural light. Server racks with green/blue blink dots, green terminal, exposed cables. Coldest room. Functional, not decorative.',
    },
    {
      id: 'gary', name: "Gary's Ops Center", agent: 'Gary', role: 'AOM Operations',
      position: { col: 6, row: 3 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior', west: 'interior', south: 'exterior', east: 'exterior-window' },
      floor: 'wood-dark', floorColor: '#6B5240',
      lighting: 'warm-desk-lamp', lightColor: '#FFB74D',
      agentColor: '#FF6B35',
      statusColors: { active: '#FF6B35', idle: '#A03A10', offline: '#501C08' },
      furniture: ['operations-desk', 'monitor-dual', 'ops-board-wall', 'filing-cabinet', 'coffee-mug', 'task-chair'],
      ambientAnimations: [
        { id: 'monitor-flicker', target: 'monitor-dual', frameCount: 4, frameDuration: 800, loop: true },
      ],
      personality: 'Ops hub. Warm and organized. Two monitors, ops board, filing cabinet. Gets things done.',
    },
    {
      id: 'rex', name: "Rex's Office", agent: 'Rex', role: 'Executive Assistant',
      position: { col: 2, row: 3 }, size: { cols: 2, rows: 1 },
      walls: { north: 'interior', west: 'interior', south: 'exterior-window', east: 'interior' },
      floor: 'wood-oak', floorColor: '#A07850',
      lighting: 'warm-desk-lamp', lightColor: '#FFD87A',
      agentColor: '#FF4F00',
      statusColors: { active: '#FF4F00', idle: '#993000', offline: '#4D1800' },
      furniture: ['executive-desk', 'monitor-dual', 'leather-chair', 'whiteboard', 'coffee-mug', 'standing-lamp'],
      ambientAnimations: [
        { id: 'monitor-flicker', target: 'monitor-dual', frameCount: 4, frameDuration: 800, loop: true },
      ],
      personality: 'Corner office energy. Clean desk, dual monitors, whiteboard with the plan. The room where things get decided.',
    },
  ],
  colorPalette: {
    background: '#0A0F1E',
    exteriorWalls: '#4A5568',
    exteriorWallStroke: '#2D3748',
    interiorWalls: '#718096',
    interiorWallStroke: '#4A5568',
    windowLight: '#FFD87A',
    windowLightOuter: 'rgba(255, 216, 122, 0.15)',
    monitorBlue: '#4FC3F7',
    monitorGreen: '#81C784',
    monitorPurple: '#CE93D8',
    ledPurple: '#9C27B0',
    ledPurpleGlow: 'rgba(156, 39, 176, 0.3)',
    serverGreen: '#4CAF50',
    serverBlue: '#2196F3',
    ambientWarm: '#FFB74D',
    ambientWarmGlow: 'rgba(255, 183, 77, 0.2)',
    groundPlane: '#0D1225',
    groundPlaneEdge: '#1A2035',
    signText: '#FDF6EC',
    signBackground: '#1A1A17',
    doorColor: '#5A4A3A',
    nameplate: { background: 'rgba(10, 15, 30, 0.85)', text: '#FDF6EC', border: 'rgba(255, 255, 255, 0.08)' },
  },
  rendering: {
    wallHeight: 48,
    wallThicknessExterior: 4,
    wallThicknessInterior: 2,
    doorWidth: 24,
    windowWidth: 40,
    roofCutaway: true,
    shadowDirection: 'south-east',
    shadowOpacity: 0.15,
    shadowBlur: 8,
    lightSpillRadius: 32,
    lightSpillOpacity: 0.12,
    nameplateOffset: { x: 0, y: -8 },
    nameplateFont: 'Inter',
    nameplateFontSize: 11,
    nameplateFontWeight: 600,
    zoomLevels: {
      overview: { scale: 0.5, showNameplates: true, showFurnitureDetail: false, showAnimations: false },
      floor: { scale: 1.0, showNameplates: true, showFurnitureDetail: true, showAnimations: true },
      room: { scale: 2.0, showNameplates: false, showFurnitureDetail: true, showAnimations: true },
    },
  },
  interactivity: {
    roomHover: { borderGlow: true, glowOpacity: 0.3, glowSpread: 4, cursor: 'pointer', nameplateBold: true },
    agentActiveIndicator: { type: 'pulsing-dot', size: 6, position: 'top-right-of-room', pulseSpeed: 1500 },
    roomDimWhenInactive: { brightness: 0.4, transition: '400ms ease' },
    roomBrightWhenActive: { brightness: 1.0, transition: '400ms ease' },
  },
  entrance: {
    position: { col: 3, row: 4 },
    sign: 'CORNER',
    signFont: 'Syne',
    signFontWeight: 800,
    signFontSize: 14,
    signColor: '#FDF6EC',
    awningColor: '#1A1A17',
    facing: 'south',
  },
}

// Derive a lookup map for rooms by id
const ROOM_MAP = {}
for (const room of GRID_SPEC.rooms) {
  ROOM_MAP[room.id] = room
}

// Derive agent list from rooms (only rooms with agents)
export const AGENTS = GRID_SPEC.rooms
  .filter(r => r.agent !== null)
  .map(r => ({
    slug: r.id,
    name: r.agent,
    role: r.role,
    color: r.agentColor,
    statusColors: r.statusColors,
    floor: r.floor,
    floorColor: r.floorColor,
    lightColor: r.lightColor,
    monitorColor: r.lightColor, // fallback
  }))

// Add Paige and Pixel as growth-zone agents (not in grid spec yet but in product)
AGENTS.push(
  { slug: 'paige', name: 'Paige', role: 'Client Success', color: '#66BB6A', statusColors: { active: '#66BB6A', idle: '#3A7A3A', offline: '#1A401A' }, floor: 'wood-warm', floorColor: '#C4956A', lightColor: '#FFB74D', monitorColor: '#A5D6A7' },
  { slug: 'pixel', name: 'Pixel', role: 'Media Librarian', color: '#00BCD4', statusColors: { active: '#00BCD4', idle: '#007A8A', offline: '#003A42' }, floor: 'wood-warm', floorColor: '#C4956A', lightColor: '#80DEEA', monitorColor: '#B0BEC5' },
  { slug: 'mark', name: 'Mark', role: 'Photos & Lighting', color: '#8B9DAF', statusColors: { active: '#8B9DAF', idle: '#5A6E80', offline: '#2A3A48' }, floor: 'wood-dark', floorColor: '#6B5240', lightColor: '#B0C4D4', monitorColor: '#B0C4D4' },
)

// ─── PROJECT ROOMS ──────────────────────────────────────────────────────────
// Project cubes on the grid alongside agent rooms. Use existing room styles
// until Steffen designs proper project spaces. hidden=true to toggle off.
const PROJECTS = [
  { slug: 'ambition-mechanical', name: 'Ambition', type: 'project', color: '#E85D26', statusColors: { active: '#E85D26', idle: '#8A5A3A', offline: '#3D2A1A' }, floor: 'wood-walnut', floorColor: '#8B6D4A', lightColor: '#FFD87A', monitorColor: '#FFD87A', hidden: false, team: ['bobby', 'steffen', 'tony', 'cleo'] },
  { slug: 'corner', name: 'Corner', type: 'project', color: '#3B82F6', statusColors: { active: '#3B82F6', idle: '#2A5090', offline: '#1A2A50' }, floor: 'wood-dark', floorColor: '#6B5240', lightColor: '#90CAF9', monitorColor: '#90CAF9', hidden: false, team: ['bobby', 'elon', 'steve', 'steffen'] },
  { slug: 'isa-energy', name: 'ISA Energy', type: 'project', color: '#4CAF50', statusColors: { active: '#4CAF50', idle: '#2E7D32', offline: '#1B5E20' }, floor: 'wood-light', floorColor: '#C4A882', lightColor: '#A5D6A7', monitorColor: '#A5D6A7', hidden: false, team: ['cleo', 'paige'] },
  { slug: 'skylar', name: 'Skylar', type: 'project', color: '#AB47BC', statusColors: { active: '#AB47BC', idle: '#7B1FA2', offline: '#4A148C' }, floor: 'wood-walnut', floorColor: '#8B6D4A', lightColor: '#CE93D8', monitorColor: '#CE93D8', hidden: false, team: ['cleo'] },
  { slug: 'brandon-wiley', name: 'Brandon Wiley', type: 'project', color: '#EF5350', statusColors: { active: '#EF5350', idle: '#C62828', offline: '#7F1D1D' }, floor: 'wood-dark', floorColor: '#6B5240', lightColor: '#EF9A9A', monitorColor: '#EF9A9A', hidden: false, team: ['cleo', 'paige'] },
  { slug: 'kohrs', name: 'KOHRS', type: 'project', color: '#FDD835', statusColors: { active: '#FDD835', idle: '#F9A825', offline: '#F57F17' }, floor: 'wood-oak', floorColor: '#A07850', lightColor: '#FFF59D', monitorColor: '#FFF59D', hidden: false, team: ['tony', 'cleo'] },
  { slug: 'nabi', name: 'NABI', type: 'project', color: '#FFB300', statusColors: { active: '#FFB300', idle: '#FF8F00', offline: '#E65100' }, floor: 'wood-walnut', floorColor: '#8B6D4A', lightColor: '#FFE082', monitorColor: '#FFE082', hidden: false, team: ['cleo', 'paige'] },
  { slug: 'outreach', name: 'Outreach', type: 'project', color: '#26A69A', statusColors: { active: '#26A69A', idle: '#00897B', offline: '#00695C' }, floor: 'wood-light', floorColor: '#C4A882', lightColor: '#80CBC4', monitorColor: '#80CBC4', hidden: false, team: ['jacob', 'alex'] },
  { slug: 'ai-advisory', name: 'AI Advisory', type: 'project', color: '#29B6F6', statusColors: { active: '#29B6F6', idle: '#0288D1', offline: '#01579B' }, floor: 'wood-dark', floorColor: '#6B5240', lightColor: '#81D4FA', monitorColor: '#81D4FA', hidden: false, team: ['steve', 'elon', 'alex'] },
  { slug: 'included-health', name: 'Included Health', type: 'project', color: '#78909C', statusColors: { active: '#78909C', idle: '#546E7A', offline: '#37474F' }, floor: 'wood-oak', floorColor: '#A07850', lightColor: '#B0BEC5', monitorColor: '#B0BEC5', hidden: true, team: ['paige'] },
  { slug: 'conrad-foundation', name: 'Conrad Foundation', type: 'project', color: '#0EA5E9', statusColors: { active: '#0EA5E9', idle: '#0369A1', offline: '#0C4A6E' }, floor: 'wood-light', floorColor: '#C4A882', lightColor: '#7DD3FC', monitorColor: '#7DD3FC', hidden: false, team: ['alex', 'steve', 'cleo'] },
  { slug: 'rpg-mechanics', name: 'RPG Mechanics', type: 'project', color: '#A78BFA', statusColors: { active: '#A78BFA', idle: '#53457D', offline: '#211B32' }, floor: 'wood-light', floorColor: '#C4A882', lightColor: '#DCD0FD', monitorColor: '#DCD0FD', hidden: false, team: ['bobby'] },
  // ── Special rooms ──────────────────────────────────────────────────────────
  { slug: 'aom-team', name: 'AOM Team', type: 'special', color: '#F59E0B', statusColors: { active: '#F59E0B', idle: '#A07830', offline: '#4A3818' }, floor: 'wood-oak', floorColor: '#A07850', lightColor: '#FFD87A', monitorColor: '#FFD87A', hidden: false, team: ['patrik', 'rex', 'mom', 'alex', 'steve', 'steffen', 'bobby', 'colton', 'cleo', 'tony', 'jacob', 'elmo', 'elon', 'gary', 'pixel'] },
]

// ---- GROUPED HEX GRID LAYOUT ORDER ----
// ALL_ROOMS order controls default room positions on the hex grid.
// Matches the ROW_SIZES config in CanvasOffice.jsx:
//   Row 0 (4): Core team      -- Elon, Gary, Bobby, Steffen
//   Row 1 (4): Creative+      -- Cleo, Jacob, AOM Team, Patrik
//   Row 2 (5): Top projects   -- Corner, Ambition, KOHRS, ISA, Skylar
//   Row 3 (4): More projects  -- Brandon Wiley, NABI, Outreach, AI Advisory
//   Row 4 (overflow, 6 max): On-set crew -- Mark
// Hidden rooms appended last (not rendered):
//   included-health
// Removed from grid (still in AGENTS/GRID_SPEC for board view + chat):
//   mom, pixel, paige, alex, steve, colton, tony

const _AGENT_MAP = Object.fromEntries(AGENTS.map(a => [a.slug, { ...a, type: 'agent', hidden: false }]))
const _PROJECT_MAP = Object.fromEntries(PROJECTS.map(p => [p.slug, p]))

const ALL_ROOMS = [
  // Row 0 -- Core team
  _AGENT_MAP['rex'],
  _AGENT_MAP['elon'],
  _AGENT_MAP['gary'],
  _AGENT_MAP['bobby'],
  _AGENT_MAP['steffen'],
  // Row 1 -- Creative + special
  _AGENT_MAP['cleo'],
  _AGENT_MAP['jacob'],
  _PROJECT_MAP['aom-team'],
  _AGENT_MAP['patrik'],
  // Row 2 -- Top projects
  _PROJECT_MAP['corner'],
  _PROJECT_MAP['ambition-mechanical'],
  _PROJECT_MAP['kohrs'],
  _PROJECT_MAP['isa-energy'],
  _PROJECT_MAP['skylar'],
  // Row 3 -- More projects
  _PROJECT_MAP['brandon-wiley'],
  _PROJECT_MAP['nabi'],
  _PROJECT_MAP['outreach'],
  _PROJECT_MAP['ai-advisory'],
  _PROJECT_MAP['conrad-foundation'],
  _PROJECT_MAP['rpg-mechanics'],
  // Row 4 (overflow) -- On-set crew
  _AGENT_MAP['mark'],
  // Hidden -- not rendered on hex grid (still accessible in Board view, chat dropdowns, @mentions)
  _PROJECT_MAP['included-health'],
].filter(Boolean)
