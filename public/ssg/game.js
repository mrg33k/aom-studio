/* ============================================================
   ISO PROTO — isometric movement mechanics prototype
   Hand-painted AI assets (Nano Banana) composited on a canvas
   isometric engine: walk, sprint, jump, gravity, elevation,
   collision, depth sort, camera follow, particles.
   ============================================================ */

(() => {
  const canvas = document.getElementById('game');
  let ctx = canvas.getContext('2d'); // swappable: ghost pass redirects draws to an offscreen mask
  const occCanvas = document.createElement('canvas');   // ghost silhouette
  const octx = occCanvas.getContext('2d');
  const maskCanvas = document.createElement('canvas');  // union of occluding geometry
  const mctx = maskCanvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ---------- tuning ----------
  const TILE_W = 148;            // screen px width of a tile diamond
  const TILE_H = TILE_W / 2;     // diamond height
  const BLOCK_Z = TILE_W * 0.46; // screen px per elevation unit
  const WALK_SPEED = 3.6;        // tiles / sec
  const SPRINT_MULT = 1.65;
  const ACCEL = 18;              // tiles / sec^2
  const GRAVITY = 19;            // z-units / sec^2 (snappy arc)
  const JUMP_V = 6.5;            // z-units / sec (max height ~1.1 blocks)
  const JUMP_CUT = 0.45;         // release space early -> shorter hop
  const JUMP_BUFFER = 0.14;      // sec: press space just before landing still jumps
  const STEP_UP = 0.05;          // max height you can walk up without jumping
  const RADIUS = 0.22;           // player collision radius in tile units

  // ---------- levels ----------
  // height: -1 = void, 0+ = walkable elevation, 'w' = water, 'p' = dirt path
  const W = 'w';
  const PATH = 'p'; // walkable road tile at z0 (R35: roads are real tiles, not teleports)
  const LEVELS = [
    {
      name: 'Emerald Isle',
      spawn: { x: 7.5, y: 9.5 },
      portals: [
        { id: 'gate-ruins', x: 12, y: 5, dest: { level: 1, x: 4.5, y: 10.2 }, sealed: true },
        { id: 'to-village', x: 1, y: 8, dest: { level: 3, x: 15.5, y: 6.5 } },
      ],
      map: [
        [-1,-1,-1,-1, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1],
        [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
        [-1, 0, 0, 0, 0, 0, W, W, 0, 0, 0, 0,-1,-1],
        [-1, 0, 0, 1, 1, 0, W, W, 0, 0, 0, 0, 0,-1],
        [ 0, 0, 0, 1, 2, 1, 0, W, W, 0, 0, 0, 0,-1],
        [ 0, 0, 1, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
        [ 0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 1, 0, 0, 0],
        [-1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0,-1],
        [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1],
        [-1,-1,-1,-1, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1],
      ],
      props: [
        { type: 'tree',    x: 2,  y: 2 },
        { type: 'tree',    x: 11, y: 3 },
        { type: 'tree',    x: 3,  y: 9 },
        { type: 'tree',    x: 12, y: 7 },
        { type: 'crystal', x: 4,  y: 5 },
        { type: 'crystal', x: 10, y: 7 },
        { type: 'boulder', x: 8,  y: 2 },
        { type: 'boulder', x: 5,  y: 10 },
        { type: 'boulder', x: 0,  y: 5 },
      ],
    },
    {
      name: 'Sunken Ruins',
      spawn: { x: 4.5, y: 10.2 },
      portals: [{ id: 'ruins-back', x: 4, y: 11, dest: { level: 0, x: 11.0, y: 5.5 } }],
      map: [
        [-1,-1,-1, 1, 1, 1,-1,-1,-1,-1,-1,-1,-1,-1],
        [-1,-1, 1, 1, 2, 1, 1,-1,-1, 0, 0, 0,-1,-1],
        [-1, 1, 1, 2, 3, 2, 1, 1, 0, 0, 1, 0, 0,-1],
        [-1, 1, 2, 3, 3, 3, 2, 1, 0, 1, 1, 1, 0,-1],
        [ 0, 1, 1, 2, 3, 2, 1, 0, 0, 1, 2, 1, 0, 0],
        [ 0, 0, 1, 1, 2, 1, 0, 0, W, W, 1, 1, 0, 0],
        [ 0, 0, 0, 1, 1, 0, 0, W, W, W, 0, 0, 0, 0],
        [-1, 0, 0, 0, 0, 0, 0, 0, W, 0, 0, 0, 0,-1],
        [-1,-1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0,-1,-1],
        [-1,-1,-1, 0, 1, 1, 1, 1, 0, 0, 0, 0,-1,-1],
        [-1,-1,-1, 0, 0, 1, 1, 0, 0,-1,-1,-1,-1,-1],
        [-1,-1,-1,-1, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1],
      ],
      props: [
        { type: 'crystal', x: 4,  y: 3 },
        { type: 'crystal', x: 10, y: 4 },
        { type: 'tree',    x: 1,  y: 7 },
        { type: 'tree',    x: 11, y: 7 },
        { type: 'boulder', x: 6,  y: 7 },
        { type: 'boulder', x: 3,  y: 8 },
      ],
    },
    {
      name: 'My Homestead',
      spawn: { x: 5.5, y: 6.5 },
      portals: [{ id: 'home-village', x: 2, y: 2, dest: { level: 3, x: 2.0, y: 6.5 } }],
      map: [
        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      ],
      // R50: homestead landmark density — grindables + a waystone landmark
      // cottage at tiles [4,1],[5,1],[4,2],[5,2]; portal at (2,2)
      props: [
        { type: 'tree',     x: 1,  y: 7 },
        { type: 'tree',     x: 9,  y: 7 },
        { type: 'tree',     x: 1,  y: 4 },
        { type: 'tree',     x: 9,  y: 2 },
        { type: 'crystal',  x: 3,  y: 5 },
        { type: 'crystal',  x: 6,  y: 5 },
        { type: 'crystal',  x: 4,  y: 7 },
        { type: 'crystal',  x: 8,  y: 4 },
        { type: 'crystal',  x: 7,  y: 6 },
        { type: 'boulder',  x: 2,  y: 4 },
        { type: 'boulder',  x: 8,  y: 7 },
        { type: 'boulder',  x: 2,  y: 6 },
        { type: 'boulder',  x: 7,  y: 2 },
        { type: 'boulder',  x: 9,  y: 5 },
        { type: 'waystone', x: 8,  y: 2 },  // landmark anchor, east end of plot
        { type: 'boulder',  x: 5,  y: 6 },
      ],
    },
    {
      // R35: the hub — a plaza of roads whose job is connecting everywhere.
      // Patrik: "the village wich is a portal (glorified hallway to other
      // places)". Houses / shops / NPC villagers plug in next.
      name: 'The Village',
      spawn: { x: 8.5, y: 10.5 },
      portals: [
        { id: 'vil-home',    x: 0,  y: 6, dest: { level: 2, x: 4.5, y: 3.5 } },
        { id: 'vil-emerald', x: 17, y: 7, dest: { level: 0, x: 2.8, y: 8.5 } },
        { id: 'vil-forest',  x: 8,  y: 0, dest: { level: 4, x: 6.5, y: 9.8 } },
      ],
      // R38: a real PLACE — bakery, mill, houses along the roads (Patrik:
      // "we need real buildings places and things to do")
      map: [
        [-1,-1,-1,-1,-1, 0,  0,  0, 'p','p', 0,  0,  0,-1,-1,-1,-1,-1],
        [-1,-1,-1, 0,  0, 0,  0,  0, 'p','p', 0,  0,  0,  0, 0,-1,-1,-1],
        [-1,-1, 0,  0,  0, 0,  0,  0, 'p','p', 0,  0,  0,  0, 0,  0,-1,-1],
        [-1, 0,  0,  0,  0, 0,  0,  0, 'p','p', 0,  0,  0,  0, 0,  0,  0,-1],
        [-1, 0,  0,  0,  0, 0,  0,  0, 'p','p', 0,  0,  0,  0, 0,  0,  0,-1],
        [ 0, 0,  0,  0,  0, 0,  0, 'p','p','p','p', 0,  0,  0, 0,  0,  0, 0],
        ['p','p','p','p','p','p','p','p','p','p','p','p','p','p','p','p','p','p'],
        ['p','p','p','p','p','p','p','p','p','p','p','p','p','p','p','p','p','p'],
        [ 0, 0,  0,  0,  0, 0,  0, 'p','p','p','p', 0,  0,  0, 0,  0,  0, 0],
        [-1, 0,  0,  0,  0, 0,  0,  0, 'p','p', 0,  0,  0,  0, 0,  0,  0,-1],
        [-1, 0,  0,  0,  0, 0,  0,  0, 'p','p', 0,  0,  0,  0, 0,  0,  0,-1],
        [-1,-1, 0,  0,  0, 0,  0,  0, 'p','p', 0,  0,  0,  0, 0,  0,-1,-1],
        [-1,-1,-1, 0,  0, 0,  0,  0,  0,  0,  0,  0,  0,  0,-1,-1,-1,-1],
        [-1,-1,-1,-1,-1, 0,  0,  0,  0,  0,  0,  0,-1,-1,-1,-1,-1,-1],
      ],
      props: [
        { type: 'tree',    x: 2,  y: 2 },
        { type: 'tree',    x: 16, y: 3 },
        { type: 'tree',    x: 2,  y: 10 },
        { type: 'tree',    x: 15, y: 11 },
        { type: 'tree',    x: 6,  y: 1 },
        { type: 'boulder', x: 6,  y: 2 },
        { type: 'boulder', x: 11, y: 11 },
        { type: 'boulder', x: 15, y: 5 },
        { type: 'crystal', x: 6,  y: 11 },
        { type: 'crystal', x: 14, y: 4 },
        { type: 'waystone', x: 10, y: 1 }, // R47: marks the north road to the forest
      ],
    },
    {
      // R35: a route, Pokemon-style — travel as gameplay. The path winds;
      // trees wall the corridor; portals at both ends.
      name: 'Forest Path',
      spawn: { x: 6.5, y: 10.2 },
      portals: [
        { id: 'fp-village', x: 6, y: 11, dest: { level: 3, x: 8.5, y: 2.0 } },
        { id: 'fp-deep',    x: 7, y: 0,  dest: { level: 5, x: 6.5, y: 9.5 } },
      ],
      map: [
        [-1,-1,-1,-1,-1, 0, 'p','p', 0,-1,-1,-1,-1,-1],
        [-1,-1,-1, 0,  0, 0, 'p','p', 0,  0,-1,-1,-1,-1],
        [-1,-1, 0,  0,'p','p','p', 0,  0,  0, 0,-1,-1,-1],
        [-1, 0,  0,  0,'p', 0,  0,  0,  0,  0, 0,  0,-1,-1],
        [-1, 0,  0,'p','p', 0,  0,  0,  0,  0, 0,  0,-1,-1],
        [-1, 0,  0,'p', 0,  0,  0,  0,  0,  0, 0,  0,-1,-1],
        [-1, 0,  0,'p','p','p', 0,  0,  0,  0, 0,  0,-1,-1],
        [-1, 0,  0,  0,  0,'p','p','p', 0,  0, 0,  0,-1,-1],
        [-1,-1, 0,  0,  0,  0,  0,'p','p', 0, 0,-1,-1,-1],
        [-1,-1, 0,  0,  0,  0,  0,  0,'p', 0, 0,-1,-1,-1],
        [-1,-1,-1, 0,  0,  0,'p','p','p', 0,-1,-1,-1,-1],
        [-1,-1,-1,-1, 0,  0,'p','p', 0,-1,-1,-1,-1,-1],
      ],
      props: [
        { type: 'tree',    x: 5,  y: 0 },
        { type: 'tree',    x: 8,  y: 1 },
        { type: 'tree',    x: 3,  y: 2 },
        { type: 'tree',    x: 8,  y: 2 },
        { type: 'tree',    x: 5,  y: 3 },
        { type: 'tree',    x: 2,  y: 4 },
        { type: 'tree',    x: 5,  y: 4 },
        { type: 'tree',    x: 2,  y: 5 },
        { type: 'tree',    x: 6,  y: 8 },
        { type: 'tree',    x: 4,  y: 7 },
        { type: 'tree',    x: 9,  y: 9 },
        { type: 'tree',    x: 5,  y: 10 },
        { type: 'crystal', x: 9,  y: 3 },
        { type: 'boulder', x: 7,  y: 6 },
        { type: 'waystone', x: 2, y: 3 },  // R47: route markers — travel reads as a journey
        { type: 'waystone', x: 5, y: 9 },
        // R49: expanded grindables — hermit's road is worth the detour
        { type: 'crystal', x: 10, y: 4 },
        { type: 'crystal', x: 11, y: 7 },
        { type: 'crystal', x: 8,  y: 10 },
        { type: 'crystal', x: 3,  y: 7 },
        { type: 'boulder', x: 10, y: 2 },
        { type: 'boulder', x: 11, y: 5 },
        { type: 'boulder', x: 9,  y: 8 },
        { type: 'boulder', x: 6,  y: 10 },
        { type: 'boulder', x: 3,  y: 9 },
        { type: 'boulder', x: 1,  y: 6 },
        { type: 'crystal', x: 10, y: 9 },
        { type: 'crystal', x: 7,  y: 2 },
      ],
    },
    {
      // R35: the resource-rich destination at the end of the road — the
      // grind zone (smashables everywhere).
      name: 'The Deep Forest',
      spawn: { x: 6.5, y: 9.5 },
      portals: [
        { id: 'df-back', x: 6, y: 11, dest: { level: 4, x: 6.5, y: 1.5 } },
      ],
      map: [
        [-1,-1,-1, 0, 0, 0,  0,  0, 0, 0,-1,-1,-1,-1],
        [-1,-1, 0, 0, 0, 0,  0,  0, 0, 0, 0,-1,-1,-1],
        [-1, 0, 0, 1, 0, 0,  0,  0, 1, 1, 0, 0,-1,-1],
        [-1, 0, 0, 1, 1, 0,  0,  0, 0, 1, 0, 0, 0,-1],
        [ 0, 0, 0, 0, 0, 0,'w','w', 0, 0, 0, 0, 0,-1],
        [ 0, 0, 0, 0, 0, 0,'w','w', 0, 0, 0, 1, 0, 0],
        [-1, 0, 1, 0, 0, 0,  0,  0, 0, 0, 0, 1, 0, 0],
        [-1, 0, 1, 1, 0, 0,  0,  0, 0, 0, 0, 0, 0,-1],
        [-1, 0, 0, 0, 0, 0,  0,  0, 0, 0, 0, 0,-1,-1],
        [-1,-1, 0, 0, 0,'p','p','p', 0, 0, 0,-1,-1,-1],
        [-1,-1,-1, 0, 0,'p','p', 0,  0, 0,-1,-1,-1,-1],
        [-1,-1,-1,-1, 0, 0,'p', 0,  0,-1,-1,-1,-1,-1],
      ],
      props: [
        { type: 'tree',    x: 4,  y: 0 },
        { type: 'tree',    x: 9,  y: 1 },
        { type: 'tree',    x: 1,  y: 3 },
        { type: 'tree',    x: 12, y: 5 },
        { type: 'tree',    x: 3,  y: 8 },
        { type: 'tree',    x: 9,  y: 8 },
        { type: 'boulder', x: 5,  y: 2 },
        { type: 'boulder', x: 10, y: 4 },
        { type: 'boulder', x: 4,  y: 7 },
        { type: 'boulder', x: 8,  y: 8 },
        { type: 'boulder', x: 2,  y: 5 },
        { type: 'crystal', x: 4,  y: 3 },
        { type: 'crystal', x: 11, y: 5 },
        { type: 'crystal', x: 7,  y: 7 },
        { type: 'crystal', x: 3,  y: 10 },
        { type: 'waystone', x: 4, y: 10 }, // R47: marks the way home out of the deep woods
        // R49: crystal grove density — this is the grind zone
        { type: 'crystal', x: 8,  y: 0 },
        { type: 'crystal', x: 2,  y: 1 },
        { type: 'crystal', x: 9,  y: 3 },
        { type: 'crystal', x: 6,  y: 6 },
        { type: 'crystal', x: 1,  y: 4 },
        { type: 'crystal', x: 10, y: 7 },
        { type: 'crystal', x: 5,  y: 9 },
        { type: 'boulder', x: 7,  y: 1 },
        { type: 'boulder', x: 1,  y: 6 },
        { type: 'boulder', x: 9,  y: 6 },
        { type: 'boulder', x: 6,  y: 3 },
        { type: 'boulder', x: 11, y: 2 },
        { type: 'boulder', x: 3,  y: 6 },
      ],
    },
  ];

  // the destroy verb (R24, pillar 2): these prop types take hits and break
  const DESTRUCTIBLE = {
    boulder: { hp: 3, color: 'rgba(150,140,125,', chunks: 14, drop: 'rock',  dropN: [2, 3] },
    crystal: { hp: 2, color: 'rgba(245,186,80,',  chunks: 16, drop: 'shard', dropN: [3, 4] },
  };
  // loot (R25): items spilled by broken props. scatter -> rest -> magnet -> bag
  const LOOT_IMG = { rock: 'boulder', shard: 'crystal' }; // tiny copies of the prop art
  const loot = [];
  const bag = { rock: 0, shard: 0 };
  let pickupCombo = 0, comboT = 0; // quick successive pickups pitch the chime up
  function spawnLoot(kind, x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.8 + Math.random() * 1.3;
      loot.push({
        kind, x, y, z: z + 0.25,
        vx: Math.cos(a) * s * 0.55, vy: Math.sin(a) * s * 0.55,
        vz: 2.2 + Math.random() * 2.2,
        age: 0, state: 'scatter', spd: 0,
        rot: Math.random() * Math.PI * 2,
      });
    }
  }
  let levelIdx = 0, MAP, ROWS, COLS, PROPS, SPAWN, PORTALS, WATER_TILES;
  // per-portal seal state survives level reloads (pass a gate once, it stays open)
  const SEALS = { 'gate-ruins': true };
  // homestead: player-built blocks persist across sessions
  const HOME_LEVEL = 2;
  let buildMode = false, buildHeld = false;
  const placedBlocks = new Set((() => {
    try { return JSON.parse(localStorage.getItem('iso-homestead') || '[]'); }
    catch { return []; }
  })());
  const savePlaced = () => {
    try { localStorage.setItem('iso-homestead', JSON.stringify([...placedBlocks])); } catch {}
  };
  function loadLevel(i) {
    levelIdx = i;
    const L = LEVELS[i];
    MAP = L.map; ROWS = MAP.length; COLS = MAP[0].length;
    // copy props so hp/flash state and destruction never mutate the level
    // definition — re-entering a room repopulates it (collection game)
    PROPS = L.props.map(pr => {
      const c = { ...pr };
      const d = DESTRUCTIBLE[c.type];
      if (d) c.hp = d.hp;
      return c;
    });
    SPAWN = L.spawn;
    PORTALS = L.portals.map(pt => ({ ...pt, sealed: !!(pt.sealed && SEALS[pt.id]) }));
    buildMode = false;
    if (i === HOME_LEVEL) {
      // re-apply the player's saved build (idempotent)
      for (const key of placedBlocks) {
        const [bx, by] = key.split(',').map(Number);
        if (MAP[by] && MAP[by][bx] === 0) MAP[by][bx] = 1;
      }
    }
    WATER_TILES = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (MAP[y][x] === W) WATER_TILES.push([x, y]);
  }
  loadLevel(0);

  // ---------- helpers ----------
  const heightAt = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return -1;
    const v = MAP[ty][tx];
    return (v === W || v === PATH) ? 0 : v;
  };
  const isWater = (tx, ty) =>
    tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && MAP[ty][tx] === W;
  const isVoid = (tx, ty) => heightAt(tx, ty) === -1 && !isWater(tx, ty);
  const propAt = (tx, ty) => PROPS.find(p => p.x === tx && p.y === ty);

  // walkable surface height at a tile, or null if you can never stand there
  const floorAt = (tx, ty) => {
    if (isVoid(tx, ty)) return null;
    return heightAt(tx, ty);
  };

  // iso projection (world tile coords -> screen, before camera)
  const isoX = (x, y) => (x - y) * (TILE_W / 2);
  const isoY = (x, y, z) => (x + y) * (TILE_H / 2) - z * BLOCK_Z;

  // ---------- assets ----------
  const ASSET_FILES = ['grass', 'grass2', 'stone', 'stone2', 'water', 'hero', 'hero_back_stand',
    'hero_side_stand',
    'nfw0', 'nfw1', 'nfw2', 'nfw3', 'nfw5', 'nfw6', 'nfw7', 'nfw8',
    'nbw0', 'nbw1', 'nbw2', 'nbw3', 'nbw4', 'nbw5', 'nbw6', 'nbw7',
    'sw0', 'sw1', 'sw2', 'sw3', 'sw4', 'sw5', 'sw6', 'sw7',
    'jp0', 'jp1', 'jp2', 'jp3', 'bj0', 'bj1', 'bj2', 'bj3', 'sj0', 'sj1', 'sj2', 'sj3',
    'tree', 'crystal', 'boulder', 'wizard', 'path', 'npc_mara', 'npc_marn',
    'bldg_bakery', 'bldg_mill', 'bldg_house', 'npc_pip', 'npc_wick',
    'owl_stand', 'owl_fly', 'owl_walk', 'owl_sit', 'bldg_cottage', 'bldg_tower', 'waystone',
    'fox_stand', 'fox_trot1', 'fox_trot2', 'fox_sit',
    'cabin_hermit', 'shrine_forest', 'npc_traveler', 'npc_sage', 'temple_crystal'];
  const HERO_FRAMES = ['hero', 'hero_back_stand', 'hero_side_stand',
    'nfw0', 'nfw1', 'nfw2', 'nfw3', 'nfw5', 'nfw6', 'nfw7', 'nfw8',
    'nbw0', 'nbw1', 'nbw2', 'nbw3', 'nbw4', 'nbw5', 'nbw6', 'nbw7',
    'sw0', 'sw1', 'sw2', 'sw3', 'sw4', 'sw5', 'sw6', 'sw7',
    'jp0', 'jp1', 'jp2', 'jp3', 'bj0', 'bj1', 'bj2', 'bj3', 'sj0', 'sj1', 'sj2', 'sj3'];
  // doubled walk cycles (R20, Patrik: "doubled the sprites would be good") —
  // 8 beats per view, ordered by foot-spread so legs visibly scissor:
  // open / mid / pass / mid / open / mid / pass / mid
  const FRONT_WALK = ['nfw8', 'nfw6', 'nfw2', 'nfw0', 'nfw7', 'nfw5', 'nfw3', 'nfw1'];
  const BACK_WALK = ['nbw0', 'nbw2', 'nbw4', 'nbw3', 'nbw1', 'nbw6', 'nbw5', 'nbw7'];
  // side view (R18): full profile so lateral movement never reads as walking
  // backwards. 8-beat cycle ordered by foot spread so the legs visibly
  // scissor: open A / mid / pass / mid / open B / mid / pass / mid.
  // sw4 is the only true legs-together passing pose — it serves both passes.
  const SIDE_WALK = ['sw0', 'sw1', 'sw4', 'sw3', 'sw2', 'sw5', 'sw4', 'sw7'];
  // per-view jump sets: [launch crouch, rise, apex tuck, fall]
  const JUMP = {
    front: ['jp0', 'jp1', 'jp2', 'jp3'],
    back:  ['bj0', 'bj1', 'bj2', 'bj3'],
    side:  ['sj0', 'sj1', 'sj2', 'sj3'],
  };
  // true pose heights relative to standing — crouch/tuck frames must NOT be
  // stretched to full height by the normalizer (measured from the jump sheet)
  const HSCALE = {
    jp0: 0.75, jp1: 0.95, jp2: 0.91, jp3: 1.0,
    bj0: 0.75, bj1: 0.95, bj2: 0.91, bj3: 1.0,
    sj0: 0.75, sj1: 0.95, sj2: 0.88, sj3: 1.0,
  };
  let HERO_H = 0; // normalized hero draw height (set at load) so all frames match
  const FOOT = {}; // per-frame horizontal feet-centroid offset (fraction of width)
  let frameDt = 0.016; // last frame's dt, for render-side easing

  // pre-downscale each asset to ~its on-screen size with stepped halving.
  // Drawing 1024px sources at ~150-300px through plain bilinear aliases hard,
  // and the aliasing crawls during camera motion — reads as world-wide jitter.
  function prescale(img, targetW) {
    let src = img, w = img.width, h = img.height;
    while (w > targetW * 2) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w / 2));
      c.height = Math.max(1, Math.round(h / 2));
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, c.width, c.height);
      src = c; w = c.width; h = c.height;
    }
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(targetW));
    c.height = Math.max(1, Math.round(targetW * (h / w)));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  // where the feet actually are in each AI-generated frame differs slightly;
  // anchoring every frame by its feet centroid stops the body shifting on swaps
  function footOffset(img) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const y0 = Math.floor(img.height * 0.85);
    const band = g.getImageData(0, y0, img.width, img.height - y0).data;
    let sum = 0, wsum = 0;
    for (let i = 0; i < band.length; i += 4) {
      const a = band[i + 3];
      if (a > 40) { sum += ((i / 4) % img.width) * a; wsum += a; }
    }
    return wsum ? (sum / wsum) / img.width - 0.5 : 0;
  }
  const IMG = {};
  const TINT = {}; // bone-white silhouettes for the occlusion ghost pass
  const PROP_TINT = {}; // white hit-flash overlays for destructibles

  function makeTint(img, color) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ---------- state ----------
  const player = {
    x: SPAWN.x, y: SPAWN.y, z: 0,
    vx: 0, vy: 0, vz: 0,
    grounded: true, facing: 1, // 1 = right, -1 = left
    face: 1,                   // smoothed render-side facing (-1..1, eased flip)
    view: 'front',             // 'front' | 'side' | 'back' — which sprite set faces the camera
    walkPhase: 0, squash: 0, coyote: 0, jumpBuf: 0, jumpHeld: false,
    dirX: 1, dirY: 0, strikeT: 0,  // facing dir (world) + strike-pose timer
    bobS: 0, squashS: 0,       // smoothed render-side bob + squash (no pops)
    dead: 0, // respawn fade timer
  };
  // trauma-based shake (research pass 2): trauma 0-1, displacement amount =
  // trauma^2 (small hops whisper, big falls punch), smooth layered-sine noise
  // instead of per-frame random so the camera never teleports
  const cam = { x: 0, y: 0, lx: 0, ly: 0, trauma: 0, init: false }; // lx/ly: smoothed look-ahead
  const addTrauma = (t) => { cam.trauma = Math.min(1, cam.trauma + t); };
  const keys = {};
  const particles = [];
  const motes = [];
  let time = 0, lastT = 0, fps = 60, jumps = 0, falls = 0;
  // WoW HUD: player HP (max 100, reduced by hard falls, regens slowly)
  let playerHp = 100, playerHpMax = 100;
  const XP_PER_DESTROY = 12, XP_PER_LEVEL = 100;
  let warp = null, warpCooldown = 0; // level-transition fade state
  let bumpCool = 0; // wall-bump puff cooldown
  let skidCool = 0; // skid-reversal dust cooldown
  let strikeCool = 0; // strike cooldown
  // ---- gate-as-cutscene (R27, vision pillar 3) ----
  // The portal is sealed until a learning challenge is passed. Approaching it
  // triggers a cutscene takeover: input lock + letterbox + camera glide to
  // the portal, then a DOM challenge overlay (pluggable content), then a
  // retention check. Pass -> gate opens with the break juice -> warp.
  // (seal state lives in SEALS, per portal id — R31)
  // ---- the Wizard (R28, vision pillar 5) ----
  // An AI mentor NPC — eventually a real Corner chat agent. Shell first:
  // fixed spot on Emerald Isle, E talks (context-sensitive: smash otherwise),
  // chat panel with a stub responder that reads live game state.
  const WIZARD = { level: 0, x: 5.5, y: 8.0 };
  // ---- the Village People (R36, vision pillars 7+8) ----
  // Characters ARE the coursework. Each villager owns a chunk of the day's
  // real curriculum (aom:summerschool), teaches it in voice, quizzes it, and
  // CHALLENGES a wrong answer back in character (never a red X). Passing pays
  // in grind currency (Pillar 8: learning multiplies the grind) and SENDS the
  // player to the next person — quest structure, not a syllabus.
  const PERKS = { smashPower: 1, magnetR: 1.25, dropBonus: 0, blockCost: 2 }; // upgraded by lessons
  // R38: real buildings — the village is a PLACE. Multi-tile solid footprints;
  // each teacher stands at their own door (bakery, mill), houses fill it out.
  const BUILDINGS = [
    { img: 'bldg_bakery', level: 3, x: 4.5,  y: 4.85,  w: 2.9, blocks: [[3,3],[4,3],[5,3],[3,4],[4,4],[5,4]] },
    { img: 'bldg_mill',   level: 3, x: 13.0, y: 10.85, w: 2.3, blocks: [[12,9],[13,9],[12,10],[13,10]] },
    { img: 'bldg_house',  level: 3, x: 13.5, y: 3.85,  w: 2.7, blocks: [[12,2],[13,2],[14,2],[12,3],[13,3],[14,3]] },
    { img: 'bldg_house',  level: 3, x: 4.5,  y: 11.85, w: 2.7, blocks: [[3,10],[4,10],[5,10],[3,11],[4,11],[5,11]] },
    // R45 (research pass 7): the player's OWN cottage — the homestead reads
    // as home, not a field. Fox weathervane on the roof; companions gather here.
    { img: 'bldg_cottage', level: 2, x: 5.0, y: 2.85, w: 2.4, blocks: [[4,1],[5,1],[4,2],[5,2]] },
    // the Wizard's tower — the Emerald landmark ("look for the tower")
    { img: 'bldg_tower',   level: 0, x: 7.5, y: 7.85, w: 1.6, blocks: [[7,6],[7,7]] },
    // R49: Forest Path — hermit's cabin tucked in the north-west clearing; forest shrine mid-route
    { img: 'cabin_hermit', level: 4, x: 3.5, y: 3.85, w: 2.2, blocks: [[2,2],[3,2],[4,2],[2,3],[3,3],[4,3]] },
    { img: 'shrine_forest',level: 4, x: 9.5, y: 6.85, w: 1.8, blocks: [[9,5],[10,5],[9,6],[10,6]] },
    // R49: Deep Forest — crystal grove temple at the heart of the zone
    { img: 'temple_crystal',level: 5, x: 5.5, y: 5.85, w: 2.6, blocks: [[4,4],[5,4],[6,4],[4,5],[5,5],[6,5]] },
  ];
  // engine-side perk implementations; lesson content names them by id (R42)
  const PERK_FNS = {
    smash2:      () => { PERKS.smashPower = 2; },
    magnet:      () => { PERKS.magnetR = 2.4; },
    shards:      () => { PERKS.dropBonus = 2; },
    cheapBlocks: () => { PERKS.blockCost = 1; },
    none:        () => {},  // R49: stub wanderers — no mechanical reward
  };
  // lesson progress is DAY-KEYED (R42): a new day automatically starts fresh
  // (companions persist forever; perks are re-earned each day with the lessons)
  const LESSONS_KEY = 'iso-lessons-' + window.ISO_DAY.key;
  const lessonsDone = new Set((() => {
    try { return JSON.parse(localStorage.getItem(LESSONS_KEY) || '[]'); }
    catch { return []; }
  })());
  const saveLessons = () => {
    try { localStorage.setItem(LESSONS_KEY, JSON.stringify([...lessonsDone])); } catch {}
  };
  // R42: identity lives here; the day's lesson CONTENT comes from lessons.js
  // (window.ISO_DAY) — new day, same village, new curriculum.
  const NPCS = [
    { id: 'mara', name: 'Mara the Baker',      img: 'npc_mara', level: 3, x: 4.5,  y: 5.4,  w: 0.62, lesson: ISO_DAY.lessons.mara }, // at the bakery door
    { id: 'marn', name: 'Old Marn the Miller', img: 'npc_marn', level: 3, x: 12.5, y: 11.5, w: 0.6,  lesson: ISO_DAY.lessons.marn }, // in front of the mill door
    { id: 'pip',  name: 'Pip the Storyteller', img: 'npc_pip',  level: 3, x: 13.5, y: 4.5,  w: 0.6,  lesson: ISO_DAY.lessons.pip  }, // in front of the NE house
    { id: 'wick', name: 'Wick the Tinker',     img: 'npc_wick', level: 3, x: 4.5,  y: 12.4, w: 0.62, lesson: ISO_DAY.lessons.wick }, // in front of the SW house
    // R49: Forest Path wanderers — stub responders, no curriculum, character voice only
    { id: 'traveler', name: 'The Traveler', img: 'npc_traveler', level: 4, x: 7.5, y: 4.5, w: 0.62, lesson: {
        title: 'A Traveler on the Road',
        waves: [
          'Hm. Another soul on the Forest Path. Not many come this way.',
          'The cabin belongs to a hermit — been there longer than the trees, they say. The shrine ahead is older still.',
          'Watch the shadows past the waystone. These woods know when you\'re paying attention.',
        ],
        subText: 'listen — wanderers know things',
        subAsk: 'what did the traveler notice?',
        question: 'What does the Traveler say about the shrine?',
        answers: [ 'It\'s older than the cabin', 'It was built last summer', 'The Wizard made it' ],
        correct: 0,
        passToast: 'The Traveler nods. Roads have memory.',
        sendTo: '',
        perk: 'none',
      },
    },
    { id: 'sage', name: 'The Forest Sage', img: 'npc_sage', level: 4, x: 5.5, y: 7.5, w: 0.62, lesson: {
        title: 'The Forest Sage',
        waves: [
          'Slow down. The Deep Forest does not open for the impatient.',
          'The crystal grove temple at the heart — those crystals predate the road. Smash carefully.',
          'Take what the forest offers. Leave the rest. That\'s the whole lesson.',
        ],
        subText: 'the sage speaks slowly for a reason',
        subAsk: 'what did the sage say about the temple?',
        question: 'What does the Sage say about the crystals in the grove?',
        answers: [ 'They predate the road', 'They regrow in winter', 'The Wizard planted them' ],
        correct: 0,
        passToast: 'The Sage turns back to the trees.',
        sendTo: '',
        perk: 'none',
      },
    },
  ];
  // re-apply earned perks on load (lessons persist like companions)
  for (const n of NPCS) if (lessonsDone.has(n.id)) PERK_FNS[n.lesson.perk]();
  // R44 (research pass 6 — NPC routine is the #1 aliveness signal): villagers
  // putter in a small loop around their workplace. Pause-heavy — they're
  // working, not patrolling. They stop and face you when you come close.
  for (const n of NPCS) {
    n.homeX = n.x; n.homeY = n.y;
    n.face = 1; n.heading = Math.random() * Math.PI * 2; n.wanderA = 0;
    n.state = 'pause'; n.stateT = 2 + Math.random() * 4; n.stepPhase = 0;
  }
  const npcCanStand = (tx, ty, self) => {
    if (heightAt(tx, ty) !== 0 || isWater(tx, ty)) return false;
    if (propAt(tx, ty)) return false;
    if (BUILDINGS.some(b => b.level === self.level && b.blocks.some(t => t[0] === tx && t[1] === ty))) return false;
    if (NPCS.some(o => o !== self && Math.floor(o.x) === tx && Math.floor(o.y) === ty)) return false;
    if (Math.floor(player.x) === tx && Math.floor(player.y) === ty) return false;
    return true;
  };
  function updateNPCs(dt) {
    if (cut) return; // hold still during cutscenes
    for (const n of NPCS) {
      if (levelIdx !== n.level) continue;
      const pd = Math.hypot(player.x - n.x, player.y - n.y);
      if (pd < 1.8) {
        // the player has their attention: stop and face them
        n.state = 'pause'; n.stateT = Math.max(n.stateT, 0.8); n.stepPhase = 0;
        const sxv = (player.x - n.x) - (player.y - n.y);
        if (Math.abs(sxv) > 0.2) n.face = sxv > 0 ? 1 : -1;
        continue;
      }
      n.stateT -= dt;
      if (n.state === 'walk') {
        n.wanderA += (Math.random() * 2 - 1) * 2.2 * dt;
        n.heading += Math.max(-1.4 * dt, Math.min(1.4 * dt, n.wanderA * dt * 8));
        // putter fence: drift back toward the workplace beyond a small radius
        const dx = n.homeX - n.x, dy = n.homeY - n.y;
        if (Math.hypot(dx, dy) > 1.3) {
          const home = Math.atan2(dy, dx);
          let diff = home - n.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          n.heading += diff * 3.0 * dt;
        }
        const sp = 0.45;
        const nx = n.x + Math.cos(n.heading) * sp * dt;
        const ny = n.y + Math.sin(n.heading) * sp * dt;
        if (npcCanStand(Math.floor(nx), Math.floor(ny), n)) { n.x = nx; n.y = ny; }
        else { n.heading += Math.PI * 0.7; n.wanderA = 0; }
        n.stepPhase += dt * 4;
        const sxv = Math.cos(n.heading) - Math.sin(n.heading);
        if (Math.abs(sxv) > 0.2) n.face = sxv > 0 ? 1 : -1;
        if (n.stateT <= 0) { n.state = 'pause'; n.stateT = 4 + Math.random() * 5; n.stepPhase = 0; }
      } else if (n.stateT <= 0) {
        n.state = 'walk'; n.stateT = 1.5 + Math.random() * 1.5;
        n.heading = Math.random() * Math.PI * 2; n.wanderA = 0;
      }
    }
  }
  const npcNear = () => NPCS.find(n =>
    levelIdx === n.level && Math.hypot(player.x - n.x, player.y - n.y) < 1.15);
  // the quest line: one breadcrumb so he always knows who to find next
  const questEl = () => document.getElementById('quest');
  function setQuest(text) {
    const el = questEl();
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('show', !!text);
  }
  // ---- the companion (R32, vision pillar 7): a fox kit on the homestead ----
  // Reynolds wander: keep a heading; each frame nudge a target point on a
  // circle projected ahead. Smooth meandering with sustained turns — never
  // per-frame random (twitchy). States: wander -> idle pause (stand/sit).
  const FOX = {
    level: HOME_LEVEL, x: 7.5, y: 4.5, heading: 0, wanderA: 0,
    state: 'wander', stateT: 2, face: 1, frame: 'fox_stand', trotPhase: 0,
    speed: 1.15,
  };
  // companions are EARNED, never given (R33 — learning is the only source).
  const companions = new Set((() => {
    try { return JSON.parse(localStorage.getItem('iso-companions') || '[]'); }
    catch { return []; }
  })());
  const saveCompanions = () => {
    try { localStorage.setItem('iso-companions', JSON.stringify([...companions])); } catch {}
  };
  // the summoning stone: an assignment slot ON the homestead
  const PEDESTAL = { x: 8, y: 3 };
  let summonStart = 0; // while >0 the stone's light builds (the held beat)
  const pedestalNear = () =>
    levelIdx === HOME_LEVEL && !companions.has('fox') &&
    Math.hypot(player.x - (PEDESTAL.x + 0.5), player.y - (PEDESTAL.y + 0.5)) < 1.2;
  const FOX_CHALLENGE = {
    waves: [
      'A fox can hear a mouse moving under two feet of snow — without seeing it at all.',
      'Its tall ears work like satellite dishes. A fox tilts its head side to side to aim them and pin down exactly where a sound comes from.',
      'Then it leaps high and dives nose-first into the snow — landing on its meal using sound alone.',
    ],
    question: 'How does a fox find a mouse it cannot see?',
    answers: [
      'By listening with its big ears and aiming them at the sound',
      'By smelling the snow until it finds the mouse',
      'By digging everywhere until it gets lucky',
    ],
    correct: 0,
  };
  function updateFox(dt) {
    if (levelIdx !== FOX.level || !companions.has('fox')) return;
    FOX.stateT -= dt;
    if (FOX.state === 'wander') {
      // wander steering
      FOX.wanderA += (Math.random() * 2 - 1) * 2.4 * dt;       // jitter on the circle
      FOX.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, FOX.wanderA * dt * 8));
      // fence: steer back toward the plot center when near the edge
      const cx = COLS / 2, cy = ROWS / 2;
      const dx = cx - FOX.x, dy = cy - FOX.y;
      if (Math.hypot(dx, dy) > 3.4) {
        const home = Math.atan2(dy, dx);
        let diff = home - FOX.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        FOX.heading += diff * 2.2 * dt;
      }
      const nx = FOX.x + Math.cos(FOX.heading) * FOX.speed * dt;
      const ny = FOX.y + Math.sin(FOX.heading) * FOX.speed * dt;
      // never walk off the plot or into a built block
      if ((floorAt(Math.floor(nx), Math.floor(ny)) ?? -1) === 0) { FOX.x = nx; FOX.y = ny; }
      else { FOX.heading += Math.PI * 0.6; FOX.wanderA = 0; }
      // trot animation + screen-space facing
      FOX.trotPhase += dt * 7;
      FOX.frame = (FOX.trotPhase | 0) % 2 === 0 ? 'fox_trot1' : 'fox_trot2';
      const sxv = Math.cos(FOX.heading) - Math.sin(FOX.heading);
      if (Math.abs(sxv) > 0.15) FOX.face = sxv > 0 ? 1 : -1;
      if (FOX.stateT <= 0) {
        FOX.state = Math.random() < 0.45 ? 'sit' : 'stand';
        FOX.stateT = 2 + Math.random() * 3;
        FOX.frame = FOX.state === 'sit' ? 'fox_sit' : 'fox_stand';
      }
    } else {
      FOX.frame = FOX.state === 'sit' ? 'fox_sit' : 'fox_stand';
      // a nearby player gets the fox's attention (face them)
      if (Math.hypot(player.x - FOX.x, player.y - FOX.y) < 2.2) {
        const sxv = (player.x - FOX.x) - (player.y - FOX.y);
        if (Math.abs(sxv) > 0.15) FOX.face = sxv > 0 ? 1 : -1;
      }
      if (FOX.stateT <= 0) {
        FOX.state = 'wander';
        FOX.stateT = 3 + Math.random() * 4;
        FOX.heading = Math.random() * Math.PI * 2;
        FOX.wanderA = 0;
      }
    }
  }
  // ---- the scholar owl (R41): earned by finishing the WHOLE day ----
  // Same Reynolds wander as the fox, hop-flutter animation. Lives on the
  // homestead beside the fox — the trophy shelf grows.
  const OWL = {
    level: HOME_LEVEL, x: 6.5, y: 3.5, heading: 2, wanderA: 0,
    state: 'wander', stateT: 3, face: 1, frame: 'owl_stand', trotPhase: 0,
    speed: 0.85,
  };
  function updateOwl(dt) {
    if (levelIdx !== OWL.level || !companions.has('owl')) return;
    OWL.stateT -= dt;
    if (OWL.state === 'wander') {
      OWL.wanderA += (Math.random() * 2 - 1) * 2.4 * dt;
      OWL.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, OWL.wanderA * dt * 8));
      const cx = COLS / 2, cy = ROWS / 2;
      const dx = cx - OWL.x, dy = cy - OWL.y;
      if (Math.hypot(dx, dy) > 3.2) {
        const home = Math.atan2(dy, dx);
        let diff = home - OWL.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        OWL.heading += diff * 2.2 * dt;
      }
      const nx = OWL.x + Math.cos(OWL.heading) * OWL.speed * dt;
      const ny = OWL.y + Math.sin(OWL.heading) * OWL.speed * dt;
      if ((floorAt(Math.floor(nx), Math.floor(ny)) ?? -1) === 0) { OWL.x = nx; OWL.y = ny; }
      else { OWL.heading += Math.PI * 0.6; OWL.wanderA = 0; }
      OWL.trotPhase += dt * 5;
      OWL.frame = (OWL.trotPhase | 0) % 2 === 0 ? 'owl_walk' : 'owl_fly'; // hop-flutter
      const sxv = Math.cos(OWL.heading) - Math.sin(OWL.heading);
      if (Math.abs(sxv) > 0.15) OWL.face = sxv > 0 ? 1 : -1;
      if (OWL.stateT <= 0) {
        OWL.state = Math.random() < 0.5 ? 'sit' : 'stand';
        OWL.stateT = 2.5 + Math.random() * 3;
        OWL.frame = OWL.state === 'sit' ? 'owl_sit' : 'owl_stand';
      }
    } else {
      OWL.frame = OWL.state === 'sit' ? 'owl_sit' : 'owl_stand';
      if (Math.hypot(player.x - OWL.x, player.y - OWL.y) < 2.2) {
        const sxv = (player.x - OWL.x) - (player.y - OWL.y);
        if (Math.abs(sxv) > 0.15) OWL.face = sxv > 0 ? 1 : -1;
      }
      if (OWL.stateT <= 0) {
        OWL.state = 'wander';
        OWL.stateT = 3 + Math.random() * 4;
        OWL.heading = Math.random() * Math.PI * 2;
        OWL.wanderA = 0;
      }
    }
  }
  // the day-review: one application question across the whole day, asked by
  // the Wizard (R41 — finishing the day deserves a ceremony, not a quest line)
  // the day-review content comes from lessons.js (R42)
  const DAY_REVIEW = ISO_DAY.review;
  // ---- build mode (R31, vision pillar 6): the homestead is YOUR plot ----
  // Expression-first per research pass 3: place anywhere on the plot, remove
  // refunds in full, no timers, no decay, nothing punishes.
  const buildAim = () => {
    const tx = Math.floor(player.x + player.dirX * 0.95);
    const ty = Math.floor(player.y + player.dirY * 0.95);
    return { tx, ty };
  };
  const canPlaceAt = (tx, ty) => {
    if (levelIdx !== HOME_LEVEL) return false;
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    if (MAP[ty][tx] !== 0) return false;                  // flat ground only
    if (PORTALS.some(pt => pt.x === tx && pt.y === ty)) return false;
    if (tx === PEDESTAL.x && ty === PEDESTAL.y) return false;
    // can't build inside a building footprint (R45 — the cottage is solid)
    if (BUILDINGS.some(b => b.level === levelIdx && b.blocks.some(t => t[0] === tx && t[1] === ty))) return false;
    if (Math.floor(player.x) === tx && Math.floor(player.y) === ty) return false;
    return true;
  };
  const placedAt = (tx, ty) => placedBlocks.has(tx + ',' + ty);
  let wizardOpen = false;
  const wizardNear = () =>
    levelIdx === WIZARD.level &&
    Math.hypot(player.x - WIZARD.x, player.y - WIZARD.y) < 1.15;
  let cut = null;            // {phase:'in'|'challenge'|'out', t}
  // challenge interface: { waves: [..strings], question, answers: [..], correct: idx }
  // PLACEHOLDER content — real content (and the Wizard) plugs in here later
  const GATE_CHALLENGE = {
    waves: [
      'Crystals are not carved — they GROW. Layer by layer, atoms stack in a repeating pattern, sometimes for thousands of years.',
      'The pattern decides the shape. Salt grows cubes. Quartz grows six-sided columns. The same rule, repeated, becomes a form.',
      'That is why no two crystals are identical: the rule is the same, but the journey — heat, space, time — is different every time.',
    ],
    question: 'Why do crystals have regular shapes?',
    answers: [
      'Atoms stack in a repeating pattern as they grow',
      'Water polishes them into shape over time',
      'They are carved by pressure underground',
    ],
    correct: 0,
  };
  const chEl = () => document.getElementById('challenge');
  function runChallenge(ch, onPass) {
    const waveEl = document.getElementById('ch-wave');
    const ansEl = document.getElementById('ch-answers');
    const barEl = document.getElementById('ch-bar');
    const subEl = document.getElementById('ch-sub');
    chEl().classList.add('show');
    let wi = 0;
    function showWave() {
      ansEl.style.display = 'none';
      waveEl.style.display = 'flex';
      subEl.textContent = ch.subText || 'read closely — the gate listens';
      const w = ch.waves[wi];
      if (typeof w === 'object' && w.video) {
        // R37: a VIDEO wave — the character shows a moving picture (real
        // curriculum kickoff videos). The continue button unlocks after a
        // minimum honest watch; no auto-pacing a video.
        subEl.textContent = w.sub || 'watch closely';
        barEl.style.transition = 'none';
        barEl.style.width = '0%';
        waveEl.textContent = '';
        waveEl.style.flexDirection = 'column';
        waveEl.style.alignItems = 'center';
        const lead = document.createElement('div');
        lead.textContent = w.lead || '';
        lead.style.cssText = 'margin-bottom:14px;';
        const fr = document.createElement('iframe');
        fr.src = `https://www.youtube.com/embed/${w.video}?rel=0`;
        fr.allow = 'autoplay; encrypted-media; fullscreen';
        fr.style.cssText = 'width:min(560px,76vw);height:min(315px,43vw);border:0;border-radius:10px;background:#000;';
        const btn = document.createElement('button');
        btn.textContent = 'I watched it';
        btn.disabled = true;
        btn.style.cssText = "margin-top:16px;padding:10px 24px;font-family:'Hanken Grotesk',sans-serif;" +
          'font-size:14px;letter-spacing:0.04em;color:#f5a623;background:rgba(245,166,35,0.08);' +
          'border:1px solid rgba(245,166,35,0.45);border-radius:8px;cursor:pointer;opacity:0.35;transition:opacity 0.5s;';
        setTimeout(() => { btn.disabled = false; btn.style.opacity = '1'; }, (w.minWatch || 25) * 1000);
        btn.onclick = () => {
          waveEl.textContent = '';
          wi++;
          if (wi < ch.waves.length) showWave();
          else showQuestion();
        };
        waveEl.append(lead, fr, btn);
        return;
      }
      waveEl.style.flexDirection = '';
      waveEl.style.alignItems = '';
      const text = w;
      waveEl.textContent = text;
      const readMs = Math.max(2600, text.length * 52); // honest reading pace
      barEl.style.transition = `width ${readMs}ms linear`;
      barEl.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => { barEl.style.width = '100%'; }));
      setTimeout(() => {
        barEl.style.transition = 'width 0.2s linear';
        barEl.style.width = '0%';
        wi++;
        if (wi < ch.waves.length) showWave();
        else showQuestion();
      }, readMs);
    }
    function showQuestion() {
      subEl.textContent = ch.subAsk || 'show the gate you understood';
      waveEl.textContent = ch.question;
      ansEl.innerHTML = '';
      ansEl.style.display = 'flex';
      ch.answers.forEach((a, i) => {
        const b = document.createElement('button');
        b.textContent = a;
        b.onclick = () => {
          if (i === ch.correct) { chEl().classList.remove('show'); onPass(); }
          else if (ch.wrongLine) {
            // Pillar 7: wrong = the CHARACTER challenges you back in voice —
            // a dramatic beat to win, never a red X. Then they re-teach.
            b.classList.add('wrong');
            setTimeout(() => {
              ansEl.style.display = 'none';
              waveEl.style.display = 'flex';
              subEl.textContent = 'they’re not letting that slide';
              waveEl.textContent = ch.wrongLine;
              // replay the teach beats, not the greeting/video (no re-watch penalty)
              setTimeout(() => { wi = ch.replayFrom || 0; showWave(); }, Math.max(2400, ch.wrongLine.length * 45));
            }, 600);
          } else {
            b.classList.add('wrong');
            // no punishment (cozy): re-read the waves, try again
            setTimeout(() => { wi = 0; showWave(); }, 700);
          }
        };
        ansEl.appendChild(b);
      });
    }
    showWave();
  }
  let destroys = 0;  // props destroyed (stats)

  for (let i = 0; i < 26; i++) {
    motes.push({
      x: Math.random() * COLS, y: Math.random() * ROWS,
      z: 0.4 + Math.random() * 2.4, ph: Math.random() * Math.PI * 2,
      sp: 0.15 + Math.random() * 0.3, r: 1 + Math.random() * 2.2,
    });
  }


  window.addEventListener('keydown', e => {
    if (wizardOpen) {
      if (e.code === 'Escape') closeWizard();
      if (e.code === 'Enter') {
        const inp = document.getElementById('wiz-input');
        const msg = inp.value.trim();
        if (msg) { wizSay(msg, 'me'); wizardAsk(msg); inp.value = ''; }
      }
      return; // chat owns the keyboard while open
    }
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyM' && !e.repeat) {
      muted = !muted;
      toast(muted ? 'sound off' : 'sound on');
    }
    audio(); // unlock AudioContext on first real keypress
    keys[e.code] = true;
    // action bar flash
    const abMap = { Space: 1, KeyE: 3, KeyB: 4, KeyT: 5, KeyM: 6, ShiftLeft: 2, ShiftRight: 2 };
    if (abMap[e.code] !== undefined && !e.repeat) {
      const slot = document.querySelector(`.ab-slot[data-slot="${abMap[e.code]}"]`);
      if (slot) { slot.classList.add('active'); setTimeout(() => slot.classList.remove('active'), 180); }
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  // a key held across a focus change never gets its keyup (browser eats it) —
  // the character walks forever. Release everything whenever focus is lost.
  const releaseAllKeys = () => { for (const k in keys) keys[k] = false; };
  window.addEventListener('blur', releaseAllKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAllKeys();
  });

  const toast = (msg) => {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1800);
  };

  // ---------- sound: procedural WebAudio, no asset files ----------
  let AC = null, muted = false;
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function sfxTone({ freq = 440, to = null, dur = 0.12, type = 'sine', vol = 0.1, delay = 0 }) {
    const ac = audio(); if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function sfxNoise({ dur = 0.15, vol = 0.08, freq = 800, delay = 0 }) {
    const ac = audio(); if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource(); n.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f); f.connect(g); g.connect(ac.destination);
    n.start(t0);
  }
  const SFX = {
    jump: () => sfxTone({ freq: 280, to: 520, dur: 0.14, type: 'triangle', vol: 0.07 }),
    land: (impact) => {
      sfxTone({ freq: 130, to: 70, dur: 0.12, type: 'triangle', vol: Math.min(0.15, 0.05 + impact * 0.014) });
      sfxNoise({ dur: 0.08, vol: Math.min(0.09, 0.02 + impact * 0.009), freq: 900 });
    },
    step: (alt) => sfxNoise({ dur: 0.045, vol: 0.03, freq: alt ? 1300 : 1050 }),
    splash: () => { sfxNoise({ dur: 0.4, vol: 0.12, freq: 600 }); sfxTone({ freq: 320, to: 90, dur: 0.3, vol: 0.05 }); },
    fall: () => sfxTone({ freq: 420, to: 70, dur: 0.5, type: 'sine', vol: 0.07 }),
    portal: () => [523, 659, 784, 1046].forEach((f, i) => sfxTone({ freq: f, dur: 0.32, vol: 0.045, delay: i * 0.07 })),
    bump: () => sfxNoise({ dur: 0.05, vol: 0.045, freq: 500 }),
    swing: () => sfxNoise({ dur: 0.07, vol: 0.028, freq: 2400 }),
    hit: () => { sfxNoise({ dur: 0.06, vol: 0.07, freq: 750 }); sfxTone({ freq: 180, to: 110, dur: 0.08, type: 'triangle', vol: 0.06 }); },
    crack: () => { sfxNoise({ dur: 0.22, vol: 0.11, freq: 650 }); sfxTone({ freq: 240, to: 60, dur: 0.2, type: 'triangle', vol: 0.08 }); },
    pickup: (combo) => {
      const f = 620 * Math.pow(1.09, Math.min(combo || 1, 8)); // pitch climbs with quick combos
      sfxTone({ freq: f, to: f * 1.5, dur: 0.11, type: 'triangle', vol: 0.06 });
    },
  };
  let stepHalf = 0; // walk-cycle half-step tracker for footstep ticks
  // frame crossfade: every sprite swap dissolves the old frame out over the
  // new one (~65ms) instead of hard-cutting — kills the residual frame-pop
  // at walk cadence and smooths walk<->idle, jump phases, landing, view flips
  const FRAME_BLEND = 0.065;
  let lastHeroFrame = 'hero', prevHeroFrame = null, frameBlendT = 9, blendDur = 0.065;

  // ---------- particles ----------
  const burst = (x, y, z, n, color, spread = 1.6, up = 1.8) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.4 + Math.random() * 0.9) * spread;
      particles.push({
        x, y, z,
        vx: Math.cos(a) * s * 0.45, vy: Math.sin(a) * s * 0.45,
        vz: (0.6 + Math.random() * 1.4) * up,
        life: 0.5 + Math.random() * 0.45, age: 0,
        r: 1.6 + Math.random() * 2.6, color,
      });
    }
  };

  // ---------- physics ----------
  function respawn(reason) {
    falls++;
    playerHp = Math.max(10, playerHp - 15); // falling costs HP; minimum 10 so player survives
    player.dead = 1;
    setTimeout(() => {
      player.x = SPAWN.x; player.y = SPAWN.y; player.z = 2.5;
      player.vx = player.vy = player.vz = 0;
      player.dead = 0;
    }, 450);
    toast(reason);
  }

  function blockedAt(tx, ty) {
    // a tile is a wall if its floor is above the player, or a prop occupies it
    if (levelIdx === HOME_LEVEL && tx === PEDESTAL.x && ty === PEDESTAL.y) return true;
    // people are solid (R36): you stop in front of a villager, not inside them
    if (levelIdx === WIZARD.level && tx === Math.floor(WIZARD.x) && ty === Math.floor(WIZARD.y)) return true;
    if (NPCS.some(n => levelIdx === n.level && tx === Math.floor(n.x) && ty === Math.floor(n.y))) return true;
    // buildings are solid across their whole footprint (R38)
    if (BUILDINGS.some(b => b.level === levelIdx && b.blocks.some(t => t[0] === tx && t[1] === ty))) return true;
    const f = floorAt(tx, ty);
    const prop = propAt(tx, ty) &&
      (Math.floor(player.x) !== tx || Math.floor(player.y) !== ty);
    if (prop) return true;
    if (f === null) return false;      // void: allow walking off (you'll fall)
    return f > player.z + STEP_UP;     // wall above current feet
  }

  // leading-edge collision: only the corners in the direction of travel block.
  // Moving away from (or alongside) a wall is always allowed — no pinning.
  // Corner correction (Celeste-style forgiveness, R23): when exactly ONE
  // leading corner clips a wall and the clip is shallow, nudge the player
  // sideways around the corner instead of stopping dead. The nudge mutates
  // the perpendicular axis directly — callers then apply the move as normal.
  const NUDGE = 0.12; // max shallow-clip depth (tiles) we slide around

  function tryMoveX(nx) {
    const lead = nx + Math.sign(nx - player.x) * RADIUS;
    const top = blockedAt(Math.floor(lead), Math.floor(player.y - RADIUS));
    const bot = blockedAt(Math.floor(lead), Math.floor(player.y + RADIUS));
    if (!top && !bot) return true;
    if (top !== bot) {
      // penetration depth of the clipped corner into its tile, along Y
      const depth = top
        ? (Math.floor(player.y - RADIUS) + 1) - (player.y - RADIUS)
        : (player.y + RADIUS) - Math.floor(player.y + RADIUS);
      const yAdj = player.y + (top ? depth + 0.012 : -(depth + 0.012));
      if (depth < NUDGE &&
          !blockedAt(Math.floor(lead), Math.floor(yAdj - RADIUS)) &&
          !blockedAt(Math.floor(lead), Math.floor(yAdj + RADIUS)) &&
          !blockedAt(Math.floor(player.x - RADIUS), Math.floor(top ? yAdj + RADIUS : yAdj - RADIUS)) &&
          !blockedAt(Math.floor(player.x + RADIUS), Math.floor(top ? yAdj + RADIUS : yAdj - RADIUS))) {
        player.y = yAdj;
        return true;
      }
    }
    return false;
  }
  function tryMoveY(ny) {
    const lead = ny + Math.sign(ny - player.y) * RADIUS;
    const lft = blockedAt(Math.floor(player.x - RADIUS), Math.floor(lead));
    const rgt = blockedAt(Math.floor(player.x + RADIUS), Math.floor(lead));
    if (!lft && !rgt) return true;
    if (lft !== rgt) {
      const depth = lft
        ? (Math.floor(player.x - RADIUS) + 1) - (player.x - RADIUS)
        : (player.x + RADIUS) - Math.floor(player.x + RADIUS);
      const xAdj = player.x + (lft ? depth + 0.012 : -(depth + 0.012));
      if (depth < NUDGE &&
          !blockedAt(Math.floor(xAdj - RADIUS), Math.floor(lead)) &&
          !blockedAt(Math.floor(xAdj + RADIUS), Math.floor(lead)) &&
          !blockedAt(Math.floor(lft ? xAdj + RADIUS : xAdj - RADIUS), Math.floor(player.y - RADIUS)) &&
          !blockedAt(Math.floor(lft ? xAdj + RADIUS : xAdj - RADIUS), Math.floor(player.y + RADIUS))) {
        player.x = xAdj;
        return true;
      }
    }
    return false;
  }

  function update(dt) {
    // level transition: fade out -> swap level -> fade in. Player frozen meanwhile.
    if (warp) {
      if (warp.phase === 'out') {
        warp.t = Math.min(1, warp.t + dt * 2.5);
        if (warp.t >= 1) {
          const d = warp.dest;
          loadLevel(d.level);
          player.x = d.x; player.y = d.y;
          player.z = (floorAt(Math.floor(d.x), Math.floor(d.y)) ?? 0) + 0.01;
          player.vx = player.vy = player.vz = 0;
          cam.init = false; // snap camera to the new level
          // WoW zone banner
          (function() {
            const banner = document.getElementById('zone-banner');
            const nameEl = document.getElementById('zone-banner-name');
            if (banner && nameEl) {
              nameEl.textContent = LEVELS[d.level].name || '';
              banner.classList.add('show');
              setTimeout(() => banner.classList.remove('show'), 2600);
            }
          })();
          particles.length = 0; // old-level particles die with the level
          loot.length = 0;       // unclaimed loot too — rooms reset whole
          burst(player.x, player.y, player.z, 18, 'rgba(245,166,35,', 1.5, 1.6);
          warpCooldown = time + 1.5;
          warp.phase = 'in';
          // R46 (research pass 7 — "coming home" closes the day's loop):
          // arriving home with the whole day done = the welcome. Companions
          // gather at the cottage door to greet you.
          if (d.level === HOME_LEVEL && NPCS.every(n => lessonsDone.has(n.id))) {
            if (companions.has('fox')) {
              FOX.x = 4.6; FOX.y = 3.6; FOX.state = 'sit'; FOX.stateT = 6;
              FOX.frame = 'fox_sit'; FOX.face = 1;
            }
            if (companions.has('owl')) {
              OWL.x = 5.8; OWL.y = 3.5; OWL.state = 'stand'; OWL.stateT = 6;
              OWL.frame = 'owl_stand'; OWL.face = -1;
            }
            setTimeout(() => {
              toast('home at last — someone’s waiting by the door');
              // a soft two-note welcome (R47) — the day lands gently
              sfxTone({ freq: 660, to: 880, dur: 0.45, type: 'sine', vol: 0.04 });
              setTimeout(() => sfxTone({ freq: 880, to: 1100, dur: 0.6, type: 'sine', vol: 0.035 }), 380);
            }, 700);
            setQuest('');
          }
        }
      } else {
        warp.t = Math.max(0, warp.t - dt * 2.5);
        if (warp.t <= 0) warp = null;
      }
      return;
    }
    if (player.dead) return;

    // slow HP regen (1.5 hp/sec)
    playerHp = Math.min(playerHpMax, playerHp + dt * 1.5);

    // input -> world-axis velocity (screen-relative diagonals).
    // During a gate cutscene the world keeps breathing but the player is held
    let ix = 0, iy = 0;
    if (cut || wizardOpen) { for (const k in keys) keys[k] = false; }
    if (keys.KeyW || keys.ArrowUp)    { ix -= 1; iy -= 1; }
    if (keys.KeyS || keys.ArrowDown)  { ix += 1; iy += 1; }
    if (keys.KeyA || keys.ArrowLeft)  { ix -= 1; iy += 1; }
    if (keys.KeyD || keys.ArrowRight) { ix += 1; iy -= 1; }
    const mag = Math.hypot(ix, iy);
    const sprint = (keys.ShiftLeft || keys.ShiftRight) ? SPRINT_MULT : 1;
    const targetSpeed = WALK_SPEED * sprint;
    let tvx = 0, tvy = 0;
    if (mag > 0) { tvx = ix / mag * targetSpeed; tvy = iy / mag * targetSpeed; }

    // exponential smoothing with 1-exp(-k*dt): identical feel at any framerate.
    // Celeste-tuned (research pass 1): start FAST (~0.1s to max), stop with a
    // touch more weight (~0.17s), and air control at 65% of ground — jumps
    // steer lighter than feet on the ground.
    const startK = 30, stopK = 18, AIR_CTRL = 0.65;
    const spdNow = Math.hypot(player.vx, player.vy);
    let rateK = (mag > 0 ? startK : stopK) * (player.grounded ? 1 : AIR_CTRL);
    // preserve takeoff momentum: faster than target mid-air in the SAME
    // direction bleeds off gently — don't snap the jump boost back to walk speed
    if (!player.grounded && spdNow > targetSpeed * 1.01 &&
        (tvx * player.vx + tvy * player.vy) > 0) rateK *= 0.25;
    const accelK = 1 - Math.exp(-rateK * dt);
    // skid: pushing hard against current travel at speed plants the feet —
    // dust + a low thunk read the reversal as a deliberate move
    if (player.grounded && mag > 0 && spdNow > 2.2 && time > skidCool &&
        (tvx * player.vx + tvy * player.vy) < -0.5 * spdNow * targetSpeed) {
      burst(player.x, player.y, player.z, 6, 'rgba(200,186,152,', 1.2, 0.9);
      SFX.bump();
      skidCool = time + 0.5;
    }
    player.vx += (tvx - player.vx) * accelK;
    player.vy += (tvy - player.vy) * accelK;

    // facing from screen-space velocity (with hysteresis so it doesn't flicker)
    const sxv = player.vx - player.vy;   // screen x
    const syv = player.vx + player.vy;   // screen y (negative = moving away/up-screen)
    if (Math.abs(sxv) > 0.3) player.facing = sxv > 0 ? 1 : -1;
    // three-view selection: near-lateral movement shows the PROFILE sprites
    // (front-view legs translating sideways read as walking backwards),
    // up-screen shows back, down-screen shows front; diagonals keep the 3/4
    // front/back views. Ratio margins + abs floors give flicker hysteresis.
    // Reads INPUT intent (tv*), not actual velocity — wall contact zeroes one
    // velocity axis and was flipping the view while sliding along walls.
    // View is also locked while airborne so sprite sets never swap mid-jump.
    if (mag > 0) {
      // world-space facing for the strike arc (normalized input direction)
      const tl = Math.hypot(tvx, tvy) || 1;
      player.dirX = tvx / tl; player.dirY = tvy / tl;
    }
    if (player.grounded && mag > 0) {
      const isx = tvx - tvy, isy = tvx + tvy; // screen-space input direction
      const axv = Math.abs(isx), ayv = Math.abs(isy);
      if (Math.abs(isx) > 0.3) player.facing = isx > 0 ? 1 : -1;
      if (axv > Math.max(0.5, ayv * 1.7)) player.view = 'side';
      else if (ayv > Math.max(0.5, axv * 0.85)) player.view = isy < 0 ? 'back' : 'front';
    }
    // eased mirror flip instead of an instant jump-cut
    player.face += (player.facing - player.face) * (1 - Math.exp(-16 * dt));

    // move with axis-separated collision (slide along walls)
    const nx = player.x + player.vx * dt;
    if (tryMoveX(nx)) player.x = nx;
    else {
      if (Math.abs(player.vx) > 2.2 && time > bumpCool && player.grounded) {
        burst(player.x + Math.sign(player.vx) * 0.28, player.y, player.z, 3, 'rgba(200,186,152,', 0.7, 0.8);
        SFX.bump();
        addTrauma(0.12);
        bumpCool = time + 0.35;
      }
      player.vx = 0;
    }
    // ny is computed AFTER the X move: tryMoveX's corner nudge mutates
    // player.y, and a pre-captured ny would overwrite the nudge right back
    const ny = player.y + player.vy * dt;
    if (tryMoveY(ny)) player.y = ny;
    else {
      if (Math.abs(player.vy) > 2.2 && time > bumpCool && player.grounded) {
        burst(player.x, player.y + Math.sign(player.vy) * 0.28, player.z, 3, 'rgba(200,186,152,', 0.7, 0.8);
        SFX.bump();
        addTrauma(0.12);
        bumpCool = time + 0.35;
      }
      player.vy = 0;
    }

    // gravity / ground
    const f = floorAt(Math.floor(player.x), Math.floor(player.y));
    const ground = f === null ? -99 : f;

    const wasGrounded = player.grounded;
    // variable gravity: releasing space while rising pulls her down sooner —
    // smooth short hops with no mid-air velocity chop. Holding space near the
    // apex HALVES gravity (Celeste's HalfGravThreshold) — a readable hang at
    // the top of the arc that makes full jumps feel intentional.
    let gravMult = (!keys.Space && player.vz > 0) ? 1.9 : 1;
    if (!player.grounded && keys.Space && Math.abs(player.vz) < 1.6) gravMult = 0.55;
    player.vz -= GRAVITY * gravMult * dt;
    player.z += player.vz * dt;

    if (player.z <= ground && player.vz <= 0) {
      if (!wasGrounded) {
        // landing: squash + dust + camera kick + thud scaled by impact speed
        const impact = Math.abs(player.vz);
        player.squash = Math.min(0.26, impact * 0.045);
        addTrauma(Math.min(0.55, impact * 0.08));
        const onWater = isWater(Math.floor(player.x), Math.floor(player.y));
        burst(player.x, player.y, ground, onWater ? 26 : 14,
              onWater ? 'rgba(120,220,230,' : 'rgba(200,185,150,', onWater ? 2.2 : 1.4);
        if (!onWater) SFX.land(impact);
      }
      player.z = ground;
      player.vz = 0;
      player.grounded = true;
      player.coyote = 0.12;
    } else {
      player.coyote -= dt;
      player.grounded = false;
    }

    // jump: edge-detect + input buffer + coyote time + variable height
    if (keys.Space && !player.jumpHeld) player.jumpBuf = JUMP_BUFFER;
    player.jumpHeld = !!keys.Space;
    player.jumpBuf = Math.max(0, player.jumpBuf - dt);

    if (player.jumpBuf > 0 && (player.grounded || player.coyote > 0) && player.vz <= 0.01) {
      player.vz = JUMP_V;
      // takeoff kick (Celeste's JumpHBoost): jumping at speed adds ~13%
      // horizontal momentum in the travel direction — a leap, not an elevator
      const hsp = Math.hypot(player.vx, player.vy);
      if (hsp > 0.6) { player.vx *= 1.13; player.vy *= 1.13; }
      player.grounded = false;
      player.coyote = 0;
      player.jumpBuf = 0;
      jumps++;
      burst(player.x, player.y, player.z, 8, 'rgba(200,185,150,', 1.1, 0.7);
      SFX.jump();
    }

    // the destroy verb (R24): E strikes the destructible in front of you.
    // Hit = flash + shake + chips + trauma tick; hp 0 = chunk burst + crack.
    player.strikeT = Math.max(0, player.strikeT - dt);
    // B toggles build mode on the homestead
    if (keys.KeyB && !buildHeld && levelIdx === HOME_LEVEL) {
      buildMode = !buildMode;
      toast(buildMode ? 'build mode — E places, E on a block removes' : 'build mode off');
      SFX.pickup(2);
    }
    buildHeld = !!keys.KeyB;

    if (keys.KeyE && time > strikeCool && pedestalNear() && !cut) {
      strikeCool = time + 0.5;
      keys.KeyE = false;
      // the summoning: same cutscene takeover as the sealed portal
      cut = { phase: 'in', t: 0, portal: { x: PEDESTAL.x, y: PEDESTAL.y } };
      for (const k in keys) keys[k] = false;
      document.body.classList.add('cutscene');
      setTimeout(() => {
        if (!cut) return;
        cut.phase = 'challenge';
        document.getElementById('ch-title').textContent = 'The Summoning Stone';
        runChallenge(FOX_CHALLENGE, () => {
          document.getElementById('ch-title').textContent = 'The Sealed Way';
          // THE HELD BEAT (research pass 5): anticipation is the dopamine
          // peak — hold on the stone ~2.3s while light + tone build, THEN
          // the arrival. Same reward, multiplied moment.
          cut.phase = 'summon';
          summonStart = time;
          sfxTone({ freq: 200, to: 980, dur: 2.2, type: 'sine', vol: 0.05 });
          setTimeout(() => {
            if (!cut) return;
            summonStart = 0;
            companions.add('fox');
            saveCompanions();
            FOX.x = PEDESTAL.x + 0.5; FOX.y = PEDESTAL.y + 1.6;
            FOX.state = 'stand'; FOX.stateT = 3;
            burst(FOX.x, FOX.y, 0, 24, 'rgba(245,166,35,', 2.0, 2.2);
            burst(FOX.x, FOX.y, 0.4, 8, 'rgba(255,240,200,', 1.2, 2.6);
            addTrauma(0.3);
            SFX.portal();
            SFX.pickup(5);
            toast("you learned the fox's secret — and she came to find you");
            cut.phase = 'out'; cut.t = 0;
            setTimeout(() => { cut = null; document.body.classList.remove('cutscene'); }, 900);
          }, 2300);
        });
      }, 950);
    } else if (keys.KeyE && time > strikeCool && buildMode && levelIdx === HOME_LEVEL) {
      strikeCool = time + 0.25;
      const { tx, ty } = buildAim();
      if (placedAt(tx, ty)) {
        // remove + full refund
        MAP[ty][tx] = 0;
        placedBlocks.delete(tx + ',' + ty);
        savePlaced();
        bag.rock += PERKS.blockCost;
        burst(tx + 0.5, ty + 0.5, 1, 8, 'rgba(150,140,125,', 1.4, 1.6);
        SFX.hit();
      } else if (canPlaceAt(tx, ty)) {
        if (bag.rock >= PERKS.blockCost) {
          MAP[ty][tx] = 1;
          placedBlocks.add(tx + ',' + ty);
          savePlaced();
          bag.rock -= PERKS.blockCost;
          burst(tx + 0.5, ty + 0.5, 1, 10, 'rgba(150,140,125,', 1.5, 1.8);
          addTrauma(0.08);
          SFX.land(3);
        } else {
          toast(`need ${PERKS.blockCost} rocks — smash boulders on the isles`);
          SFX.bump();
        }
      }
    } else if (keys.KeyE && time > strikeCool && wizardNear() && !cut &&
               NPCS.every(n => lessonsDone.has(n.id)) && !companions.has('owl')) {
      // R41: the whole-day ceremony — all lessons done, the Wizard reviews
      // the day with one application question, then the held beat pays off
      strikeCool = time + 0.5;
      keys.KeyE = false;
      cut = { phase: 'in', t: 0, portal: { x: Math.floor(WIZARD.x), y: Math.floor(WIZARD.y) } };
      for (const k in keys) keys[k] = false;
      document.body.classList.add('cutscene');
      setTimeout(() => {
        if (!cut) return;
        cut.phase = 'challenge';
        document.getElementById('ch-title').textContent = 'The Wizard';
        runChallenge(DAY_REVIEW, () => {
          document.getElementById('ch-title').textContent = 'The Sealed Way';
          cut.phase = 'summon'; // the held beat — anticipation before the payoff
          sfxTone({ freq: 220, to: 1100, dur: 2.2, type: 'sine', vol: 0.05 });
          setTimeout(() => {
            if (!cut) return;
            companions.add('owl');
            saveCompanions();
            burst(WIZARD.x, WIZARD.y + 1, 0, 26, 'rgba(245,166,35,', 2.0, 2.2);
            burst(WIZARD.x, WIZARD.y + 1, 0.4, 8, 'rgba(255,240,200,', 1.2, 2.6);
            addTrauma(0.3);
            SFX.portal();
            SFX.pickup(5);
            toast('you finished the whole day — a scholar owl has flown to your homestead');
            setQuest('A new friend waits at your homestead');
            cut.phase = 'out'; cut.t = 0;
            setTimeout(() => { cut = null; document.body.classList.remove('cutscene'); }, 900);
          }, 2300);
        });
      }, 950);
    } else if (keys.KeyE && time > strikeCool && wizardNear()) {
      strikeCool = time + 0.5;
      keys.KeyE = false;
      openWizard();
    } else if (keys.KeyE && time > strikeCool && npcNear() && !cut) {
      // R36: talk to a villager. First time = their lesson (same cutscene
      // takeover as the gates). After = they repeat where to go next.
      const npc = npcNear();
      strikeCool = time + 0.5;
      keys.KeyE = false;
      if (lessonsDone.has(npc.id)) {
        toast(npc.lesson.sendTo);
      } else {
        cut = { phase: 'in', t: 0, portal: { x: Math.floor(npc.x), y: Math.floor(npc.y) } };
        for (const k in keys) keys[k] = false;
        document.body.classList.add('cutscene');
        setTimeout(() => {
          if (!cut) return;
          cut.phase = 'challenge';
          document.getElementById('ch-title').textContent = npc.lesson.title;
          runChallenge(npc.lesson, () => {
            document.getElementById('ch-title').textContent = 'The Sealed Way';
            lessonsDone.add(npc.id);
            saveLessons();
            PERK_FNS[npc.lesson.perk]();
            const nh = heightAt(Math.floor(npc.x), Math.floor(npc.y));
            burst(npc.x, npc.y, nh, 22, 'rgba(245,166,35,', 2.0, 2.2);
            addTrauma(0.22);
            SFX.portal();
            SFX.pickup(4);
            toast(npc.lesson.passToast);
            setQuest(npc.lesson.sendTo);
            cut.phase = 'out'; cut.t = 0;
            setTimeout(() => { cut = null; document.body.classList.remove('cutscene'); }, 900);
          });
        }, 950);
      }
    } else if (keys.KeyE && time > strikeCool) {
      strikeCool = time + 0.3;
      player.strikeT = 0.16;
      player.squash = Math.max(player.squash, 0.10);
      SFX.swing();
      let target = null, best = 9;
      for (const pr of PROPS) {
        if (pr.hp === undefined) continue;
        const dx = (pr.x + 0.5) - player.x, dy = (pr.y + 0.5) - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.3) continue;
        const dot = (dx * player.dirX + dy * player.dirY) / (dist || 1);
        if (dot < 0.2 && dist > 0.6) continue; // behind you (point-blank always hits)
        if (dist < best) { best = dist; target = pr; }
      }
      if (target) {
        const d = DESTRUCTIBLE[target.type];
        const hx = target.x + 0.5, hy = target.y + 0.5, hz = heightAt(target.x, target.y);
        target.hp -= PERKS.smashPower; // Mara's loaf doubles the swing (R36)
        target.flashT = time + 0.09;
        target.shakeT = time + 0.16;
        burst(hx, hy, hz + 0.3, 5, d.color, 1.1, 1.2);
        addTrauma(0.1);
        SFX.hit();
        if (target.hp <= 0) {
          PROPS.splice(PROPS.indexOf(target), 1);
          burst(hx, hy, hz + 0.2, d.chunks, d.color, 1.9, 2.0);
          burst(hx, hy, hz + 0.4, 6, 'rgba(255,240,200,', 1.2, 2.4);
          spawnLoot(d.drop, hx, hy, hz, d.dropN[0] + ((Math.random() * (d.dropN[1] - d.dropN[0] + 1)) | 0) + PERKS.dropBonus);
          addTrauma(0.22);
          SFX.crack();
          destroys++;
          // smashing props heals a tiny bit (feel good feedback)
          playerHp = Math.min(playerHpMax, playerHp + 3);
        }
      }
    }

    // portals: step into a ring to travel. A SEALED portal's first approach
    // meets the gate: cutscene takeover + challenge before travel works
    if (player.grounded && time > warpCooldown && !cut) {
      for (const P of PORTALS) {
        const pdx = player.x - (P.x + 0.5), pdy = player.y - (P.y + 0.5);
        const d2 = Math.hypot(pdx, pdy);
        if (P.sealed && d2 < 1.1) {
          cut = { phase: 'in', t: 0, portal: P };
          for (const k in keys) keys[k] = false;
          document.body.classList.add('cutscene');
          setTimeout(() => {
            if (!cut) return;
            cut.phase = 'challenge';
            runChallenge(GATE_CHALLENGE, () => {
              // pass: the seal breaks with the destroy juice — and stays broken
              P.sealed = false;
              SEALS[P.id] = false;
              addTrauma(0.35);
              SFX.crack();
              SFX.portal();
              burst(P.x + 0.5, P.y + 0.5, heightAt(P.x, P.y), 26, 'rgba(245,166,35,', 2.2, 2.4);
              toast('the way is open');
              cut.phase = 'out'; cut.t = 0;
              setTimeout(() => { cut = null; document.body.classList.remove('cutscene'); }, 900);
            });
          }, 950);
          break;
        } else if (!P.sealed && d2 < 0.45) {
          warp = { t: 0, phase: 'out', dest: P.dest };
          burst(player.x, player.y, player.z, 22, 'rgba(245,166,35,', 1.8, 2.2);
          addTrauma(0.45); // portals are a big beat in the shake language
          SFX.portal();
          toast(LEVELS[P.dest.level].name + '…');
          break;
        }
      }
    }

    // hazards
    if (player.grounded && isWater(Math.floor(player.x), Math.floor(player.y))) {
      burst(player.x, player.y, 0, 30, 'rgba(120,220,230,', 2.6, 2.4);
      SFX.splash();
      respawn('the water takes you back…');
    }
    if (player.z < -6) { SFX.fall(); addTrauma(0.5); respawn('you fell into the void…'); }

    // walk animation phase + footstep ticks on each half-cycle.
    // Rate is strides/sec: ~1.6 walking, ~2.7 sprinting (was 2.6x = ~9/sec,
    // which strobed frames at ~19/sec and vibrated the bob — the jitter)
    const speed = Math.hypot(player.vx, player.vy);
    player.walkPhase += speed * dt * 0.45;
    // stop settle: as the stop tail decays, ease the gait to the nearest
    // footfall (half-stride = a contact pose) so she finishes the step and
    // lands on planted feet instead of freezing mid-swing into the idle
    if (player.grounded && mag === 0 && speed > 0.05 && speed < 1.2) {
      const footfall = Math.round(player.walkPhase * 2) / 2;
      player.walkPhase += (footfall - player.walkPhase) * (1 - Math.exp(-14 * dt));
    }
    const half = Math.floor(player.walkPhase * 2);
    if (half !== stepHalf) {
      if (player.grounded && speed > 0.6) SFX.step(half % 2 === 0);
      stepHalf = half;
    }
    player.squash = Math.max(0, player.squash - dt * 1.6);

    updateFox(dt);
    updateOwl(dt);
    updateNPCs(dt);

    // loot: scatter physics -> rest hover -> magnet to player -> bag.
    // Pickup feel (the dopamine half of the loop): magnet accelerates in,
    // item shrinks as it's absorbed, chime pitch climbs with quick combos.
    comboT = Math.max(0, comboT - dt);
    if (comboT === 0) pickupCombo = 0;
    for (let i = loot.length - 1; i >= 0; i--) {
      const L = loot[i];
      L.age += dt;
      const lg = floorAt(Math.floor(L.x), Math.floor(L.y)) ?? 0;
      if (L.state === 'scatter') {
        L.vz -= GRAVITY * 0.85 * dt;
        L.x += L.vx * dt; L.y += L.vy * dt; L.z += L.vz * dt;
        L.rot += L.vx * 2.5 * dt;
        if (L.z <= lg && L.vz < 0) {
          if (Math.abs(L.vz) > 1.4) { L.vz *= -0.42; L.vx *= 0.6; L.vy *= 0.6; } // one soft bounce
          else { L.z = lg; L.state = 'rest'; }
        }
      } else if (L.state === 'rest') {
        L.z = lg;
        const dx = player.x - L.x, dy = player.y - L.y;
        if (L.age > 0.4 && Math.hypot(dx, dy) < PERKS.magnetR) { L.state = 'magnet'; L.spd = 1.2; }
      } else { // magnet
        const dx = player.x - L.x, dy = player.y - L.y;
        const dz = (player.z + 0.45) - L.z;
        const dist = Math.hypot(dx, dy, dz) || 0.001;
        L.spd += 26 * dt; // ease-in acceleration — the flying-to-you feel
        L.x += dx / dist * L.spd * dt;
        L.y += dy / dist * L.spd * dt;
        L.z += dz / dist * L.spd * dt;
        if (dist < 0.3) {
          bag[L.kind]++;
          loot.splice(i, 1);
          burst(player.x, player.y, player.z + 0.5, 3,
                L.kind === 'shard' ? 'rgba(245,186,80,' : 'rgba(200,186,152,', 0.8, 1.2);
          pickupCombo++; comboT = 1.0;
          SFX.pickup(pickupCombo);
          continue;
        }
      }
    }

    // particles: run dust, heavier kicked-back trail while sprinting
    if (player.grounded && speed > 1 && Math.random() < dt * speed * 2.2) {
      const bx = player.x - player.vx * 0.07, by = player.y - player.vy * 0.07;
      const sprinting = speed > WALK_SPEED * 1.2;
      burst(bx, by, player.z, sprinting ? 3 : 1, 'rgba(200,186,152,',
            sprinting ? 1.3 : 0.5, sprinting ? 1.0 : 0.5);
    }
    // water sparkles: brief glints drifting up off the pool surface
    if (WATER_TILES.length && Math.random() < dt * 4) {
      const [wx, wy] = WATER_TILES[(Math.random() * WATER_TILES.length) | 0];
      particles.push({
        x: wx + 0.15 + Math.random() * 0.7, y: wy + 0.15 + Math.random() * 0.7,
        z: 0.02, vx: 0, vy: 0, vz: 0.35 + Math.random() * 0.3,
        life: 0.7 + Math.random() * 0.5, age: 0,
        r: 1 + Math.random() * 1.6, color: 'rgba(190,245,255,',
      });
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age > p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vz -= GRAVITY * 0.5 * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; }
    }

    // camera follows player (lerp + smoothed velocity look-ahead — raw velocity
    // look-ahead transmits every collision/accel blip straight into the camera)
    const lookK = 1 - Math.exp(-6 * dt);
    cam.lx += (player.vx - cam.lx) * lookK;
    cam.ly += (player.vy - cam.ly) * lookK;
    let px = isoX(player.x + cam.lx * 0.14, player.y + cam.ly * 0.14);
    let py = isoY(player.x + cam.lx * 0.14, player.y + cam.ly * 0.14, player.z);
    if (cut && cut.phase !== 'out' && cut.portal) {
      // cutscene: the camera leaves the player and settles on the sealed portal
      px = isoX(cut.portal.x + 0.5, cut.portal.y + 0.5);
      py = isoY(cut.portal.x + 0.5, cut.portal.y + 0.5, heightAt(cut.portal.x, cut.portal.y)) - 40;
    }
    if (!cam.init) { cam.x = px; cam.y = py; cam.init = true; }
    const camK = 1 - Math.exp(-4.5 * dt);
    cam.x += (px - cam.x) * camK;
    cam.y += (py - cam.y) * camK;
    cam.trauma = Math.max(0, cam.trauma - 1.8 * dt);
  }

  // ---------- render ----------
  function resize() {
    canvas.width = window.innerWidth * DPR;
    canvas.height = window.innerHeight * DPR;
    ctx.imageSmoothingQuality = 'high'; // resets whenever the canvas resizes
  }
  window.addEventListener('resize', resize);
  resize();

  function drawBlock(img, tx, ty, tz, bob = 0, scale = 1.02) {
    const sx = isoX(tx + 0.5, ty + 0.5);
    const sy = isoY(tx + 0.5, ty + 0.5, tz) + bob;
    const w = TILE_W * scale;
    const h = w * (img.height / img.width);
    // anchor: center of the top diamond sits at w/2, w/4 in drawn-image space
    ctx.drawImage(img, sx - w / 2, sy - w / 4, w, h);
  }

  function drawSprite(img, wx, wy, wz, targetW, scaleX = 1, squashY = 0, anchorFrac = 0.96, lean = 0, footOff = 0) {
    const sx = isoX(wx, wy);
    const sy = isoY(wx, wy, wz);
    const w = targetW;
    const h = w * (img.height / img.width) * (1 - squashY);
    ctx.save();
    ctx.translate(sx, sy);
    if (lean) ctx.rotate(lean); // screen-space tilt (applied before flip: visual direction is stable)
    // continuous scaleX gives an eased mirror flip; clamp away from 0 so she never vanishes
    const fx2 = Math.abs(scaleX) < 0.08 ? 0.08 * (scaleX < 0 ? -1 : 1) : scaleX;
    ctx.scale(fx2, 1);
    ctx.drawImage(img, -w / 2 - footOff * w, -h * anchorFrac, w, h);
    ctx.restore();
  }

  function drawShadow(wx, wy, groundZ, heightAbove, baseR) {
    const sx = isoX(wx, wy);
    const sy = isoY(wx, wy, groundZ);
    const k = Math.max(0.25, 1 - heightAbove * 0.22);
    ctx.save();
    ctx.globalAlpha = 0.34 * k;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx, sy, baseR * k, baseR * 0.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    const vw = canvas.width, vh = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // open sky (R35, Patrik: "background should be blue sky... dark void sucks")
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, '#7fbfe8');
    g.addColorStop(0.55, '#b9dcf0');
    g.addColorStop(1, '#e9f3ec');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    // drifting clouds: soft triple-ellipse puffs in the upper sky, slow wrap.
    // deterministic per-index so they never pop — pure sky layer, behind the world
    for (let i = 0; i < 6; i++) {
      const cw = vw * (0.13 + (i % 3) * 0.055);
      const cx = ((i * 631 * DPR + time * (6 + (i % 3) * 4) * DPR) % (vw + cw * 2)) - cw;
      const cy = vh * (0.05 + ((i * 37) % 26) / 100);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw * 0.50, cw * 0.15, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - cw * 0.26, cy + cw * 0.05, cw * 0.30, cw * 0.11, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cw * 0.27, cy + cw * 0.04, cw * 0.33, cw * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // world transform: center camera (+ trauma shake: amount = trauma^2,
    // layered incommensurate sines = smooth pseudo-noise, max ~22px)
    const shakeAmt = cam.trauma * cam.trauma * 22;
    const shx = shakeAmt ? (Math.sin(time * 91.7) * 0.6 + Math.sin(time * 47.3) * 0.4) * shakeAmt * DPR : 0;
    const shy = shakeAmt ? (Math.cos(time * 83.1) * 0.6 + Math.sin(time * 59.9 + 1.7) * 0.4) * shakeAmt * DPR : 0;
    ctx.setTransform(DPR, 0, 0, DPR, vw / 2 - cam.x * DPR + shx, vh * 0.52 - cam.y * DPR + shy);

    // ----- build draw list -----
    const drawList = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = MAP[y][x];
        if (v === -1) continue;
        if (v === W) {
          const bob = Math.sin(time * 1.6) * 2.5; // global phase: pool moves as one, no seams
          drawList.push({ key: (x + y) * 100 + 0, world: true, fn: () => {
            ctx.save(); ctx.globalAlpha *= 0.96;
            drawBlock(IMG.water, x, y, 0, bob + 5, 1.08);
            ctx.restore();
          }});
        } else if (v === PATH) {
          drawList.push({ key: (x + y) * 100 + 0, world: true, fn: () => drawBlock(IMG.path, x, y, 0) });
        } else {
          for (let z = 0; z <= v; z++) {
            // deterministic per-tile variants break the repeat pattern
            const grassImg = ((x * 7 + y * 13) % 3 === 0) ? IMG.grass2 : IMG.grass;
            const stoneImg = ((x * 7 + y * 13 + z * 5) % 3 === 0) ? IMG.stone2 : IMG.stone;
            const img = z === v ? (v > 0 ? stoneImg : grassImg) : stoneImg;
            drawList.push({ key: (x + y) * 100 + z * 2, world: true, fn: () => drawBlock(img, x, y, z) });
          }
        }
      }
    }

    // props
    for (const p of PROPS) {
      const h = heightAt(p.x, p.y);
      const img = IMG[p.type];
      const widths = { tree: TILE_W * 1.5, crystal: TILE_W * 0.78, boulder: TILE_W * 0.85, waystone: TILE_W * 0.62 };
      const pulse = p.type === 'crystal' ? 1 + Math.sin(time * 2.2 + p.x) * 0.025 : 1;
      // hit feedback: brief wobble + white flash overlay while flashT is live
      const wob = (p.shakeT || 0) > time ? Math.sin(time * 65) * 0.035 : 0;
      drawList.push({
        key: (p.x + p.y) * 100 + h * 2 + 1,
        world: true,
        propType: p.type,
        fn: () => {
          drawShadow(p.x + 0.5, p.y + 0.5, h, 0, TILE_W * 0.3);
          const px2 = p.x + 0.5 + wob;
          if (p.type === 'crystal') {
            ctx.save();
            ctx.shadowColor = 'rgba(245,166,35,0.85)';
            ctx.shadowBlur = 38 + Math.sin(time * 2.2 + p.x) * 14;
            drawSprite(img, px2, p.y + 0.5, h, widths[p.type] * pulse);
            ctx.restore();
          } else {
            drawSprite(img, px2, p.y + 0.5, h, widths[p.type] * pulse);
          }
          if ((p.flashT || 0) > time && PROP_TINT[p.type]) {
            ctx.save();
            ctx.globalAlpha = 0.75;
            drawSprite(PROP_TINT[p.type], px2, p.y + 0.5, h, widths[p.type] * pulse);
            ctx.restore();
          }
        }
      });
    }

    // the Wizard: gentle idle bob + staff glow; prompt hint when near
    if (levelIdx === WIZARD.level) {
      const wh = heightAt(Math.floor(WIZARD.x), Math.floor(WIZARD.y));
      drawList.push({
        key: (WIZARD.x + WIZARD.y) * 100 + wh * 2 + 1,
        world: true,
        fn: () => {
          const wob = Math.sin(time * 1.1) * 2.2; // slow breathing bob
          drawShadow(WIZARD.x, WIZARD.y, wh, 0, TILE_W * 0.26);
          ctx.save();
          ctx.translate(0, -wob);
          ctx.shadowColor = 'rgba(245,166,35,0.55)';
          ctx.shadowBlur = 22 + Math.sin(time * 1.7) * 8;
          drawSprite(IMG.wizard, WIZARD.x, WIZARD.y, wh, TILE_W * 0.7);
          ctx.restore();
          if ((wizardNear() || wizHasNews) && !wizardOpen) {
            const sx = isoX(WIZARD.x, WIZARD.y);
            const sy = isoY(WIZARD.x, WIZARD.y, wh) - TILE_W * 1.18 + Math.sin(time * 2.5) * 3;
            ctx.font = `600 ${15}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            // a waiting answer glows brighter and says so — the comeback beat
            const news = wizHasNews;
            ctx.fillStyle = news
              ? `rgba(245,196,80,${0.8 + Math.sin(time * 5) * 0.2})`
              : 'rgba(245,166,35,0.95)';
            ctx.fillText(news ? 'E — he has an answer!' : 'E — talk', sx, sy);
          }
        }
      });
    }

    // buildings (R38): drawn at their front edge so people/props sort around them
    for (const b of BUILDINGS) {
      if (b.level !== levelIdx) continue;
      const bh = heightAt(Math.floor(b.x), Math.floor(b.y) - 1);
      drawList.push({
        key: (b.x + (b.y - 0.85)) * 100 + 3,
        world: true,
        fn: () => {
          drawShadow(b.x, b.y - 0.5, bh, 0, TILE_W * 0.85);
          drawSprite(IMG[b.img], b.x, b.y, bh, TILE_W * b.w);
        }
      });
    }

    // the village people (R36): each villager idles with a breathing bob and
    // offers their lesson; an unfinished lesson glows the prompt brighter
    for (const n of NPCS) {
      if (levelIdx !== n.level) continue;
      const nh = heightAt(Math.floor(n.x), Math.floor(n.y));
      drawList.push({
        key: (n.x + n.y) * 100 + nh * 2 + 1,
        world: true,
        fn: () => {
          const breathe = Math.sin(time * 1.0 + n.homeX * 2.7) * 2.0;
          const step = n.state === 'walk' ? Math.abs(Math.sin(n.stepPhase * Math.PI)) * 2.6 : 0;
          drawShadow(n.x, n.y, nh, 0, TILE_W * 0.26);
          ctx.save();
          ctx.translate(0, -(breathe + step));
          drawSprite(IMG[n.img], n.x, n.y, nh, TILE_W * n.w, n.face);
          ctx.restore();
          const isNear = npcNear() === n;
          if (isNear && !cut) {
            const sx = isoX(n.x, n.y);
            const sy = isoY(n.x, n.y, nh) - TILE_W * 1.12 + Math.sin(time * 2.5) * 3;
            ctx.font = `600 ${15}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            const fresh = !lessonsDone.has(n.id);
            ctx.fillStyle = fresh
              ? `rgba(245,196,80,${0.8 + Math.sin(time * 5) * 0.2})`
              : 'rgba(245,166,35,0.95)';
            ctx.fillText(fresh ? `E — ${n.name} needs you` : `E — ${n.name}`, sx, sy);
          }
        }
      });
    }

    // the summoning stone: a glowing crystal pedestal until the fox is earned;
    // afterwards it rests quiet (its magic spent)
    if (levelIdx === HOME_LEVEL) {
      const earned = companions.has('fox');
      drawList.push({
        key: (PEDESTAL.x + PEDESTAL.y) * 100 + 1,
        world: true,
        fn: () => {
          drawShadow(PEDESTAL.x + 0.5, PEDESTAL.y + 0.5, 0, 0, TILE_W * 0.26);
          ctx.save();
          if (summonStart > 0) {
            // the held beat: light gathers, pulse quickens
            const build = Math.min(2.3, time - summonStart);
            ctx.shadowColor = 'rgba(255,214,130,1)';
            ctx.shadowBlur = 44 + build * 60 + Math.sin(time * (3 + build * 4)) * 12;
          } else if (earned) ctx.globalAlpha *= 0.8;
          else {
            ctx.shadowColor = 'rgba(245,166,35,0.95)';
            ctx.shadowBlur = 44 + Math.sin(time * 2.6) * 16;
          }
          drawSprite(IMG.crystal, PEDESTAL.x + 0.5, PEDESTAL.y + 0.5, 0, TILE_W * 0.72);
          ctx.restore();
          if (pedestalNear()) {
            const sx = isoX(PEDESTAL.x + 0.5, PEDESTAL.y + 0.5);
            const sy = isoY(PEDESTAL.x + 0.5, PEDESTAL.y + 0.5, 0) - TILE_W * 0.95 + Math.sin(time * 2.5) * 3;
            ctx.font = `600 15px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(245,166,35,0.95)';
            ctx.fillText('E — the stone hums…', sx, sy);
          }
        }
      });
    }

    // the companion fox: depth-sorted, mirrored by heading, soft shadow
    if (levelIdx === FOX.level && companions.has('fox') && IMG[FOX.frame]) {
      drawList.push({
        key: (FOX.x + FOX.y) * 100 + 1.4,
        world: true,
        fn: () => {
          const img = IMG[FOX.frame];
          drawShadow(FOX.x, FOX.y, 0, 0, TILE_W * 0.16);
          const bob = FOX.state === 'wander' ? Math.abs(Math.sin(FOX.trotPhase * Math.PI)) * 2.2 : 0;
          ctx.save();
          ctx.translate(0, -bob);
          const foxH = TILE_W * (FOX.frame === 'fox_sit' ? 0.46 : 0.4); // sit pose is taller
          drawSprite(img, FOX.x, FOX.y, 0, foxH * (img.width / img.height), -FOX.face);
          ctx.restore();
        }
      });
    }

    // the scholar owl (R41): same treatment as the fox
    if (levelIdx === OWL.level && companions.has('owl') && IMG[OWL.frame]) {
      drawList.push({
        key: (OWL.x + OWL.y) * 100 + 1.4,
        world: true,
        fn: () => {
          const img = IMG[OWL.frame];
          drawShadow(OWL.x, OWL.y, 0, 0, TILE_W * 0.13);
          const bob = OWL.state === 'wander' ? Math.abs(Math.sin(OWL.trotPhase * Math.PI)) * 3.0 : 0;
          ctx.save();
          ctx.translate(0, -bob);
          const owlH = TILE_W * (OWL.frame === 'owl_sit' ? 0.3 : 0.33);
          drawSprite(img, OWL.x, OWL.y, 0, owlH * (img.width / img.height), -OWL.face);
          ctx.restore();
        }
      });
    }

    // build-mode ghost: the aim tile previews the block — amber if placeable
    // or removable, dim red if not
    if (buildMode && levelIdx === HOME_LEVEL) {
      const { tx, ty } = buildAim();
      const ok = placedAt(tx, ty) || (canPlaceAt(tx, ty) && bag.rock >= PERKS.blockCost);
      drawList.push({
        key: (tx + ty) * 100 + 3.5,
        fn: () => {
          ctx.save();
          ctx.globalAlpha = 0.45 + Math.sin(time * 4) * 0.12;
          if (canPlaceAt(tx, ty) || placedAt(tx, ty)) {
            drawBlock(IMG.stone, tx, ty, placedAt(tx, ty) ? 1 : 1);
          }
          ctx.globalAlpha = 0.85;
          const gx = isoX(tx + 0.5, ty + 0.5);
          const gy = isoY(tx + 0.5, ty + 0.5, MAP[ty] && MAP[ty][tx] === 1 ? 1 : 0);
          ctx.strokeStyle = ok ? 'rgba(245,166,35,0.9)' : 'rgba(200,80,60,0.8)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(gx, gy - TILE_H / 2);
          ctx.lineTo(gx + TILE_W / 2, gy);
          ctx.lineTo(gx, gy + TILE_H / 2);
          ctx.lineTo(gx - TILE_W / 2, gy);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // portals: swirling amber rings + ground glow (sealed ones run dimmer)
    for (const P of PORTALS) {
      const ph = heightAt(P.x, P.y);
      drawList.push({
        key: (P.x + P.y) * 100 + ph * 2 + 0.8,
        fn: () => {
          const px = isoX(P.x + 0.5, P.y + 0.5);
          const py = isoY(P.x + 0.5, P.y + 0.5, ph);
          ctx.save();
          if (P.sealed) ctx.globalAlpha *= 0.55;
          const g = ctx.createRadialGradient(px, py, 2, px, py, TILE_W * 0.32);
          g.addColorStop(0, 'rgba(255,214,130,0.45)');
          g.addColorStop(1, 'rgba(255,214,130,0)');
          ctx.fillStyle = g;
          ctx.fillRect(px - TILE_W * 0.36, py - TILE_H * 0.72, TILE_W * 0.72, TILE_H * 1.3);
          ctx.shadowColor = 'rgba(245,166,35,0.9)';
          ctx.shadowBlur = 22 + Math.sin(time * 3) * 8;
          ctx.strokeStyle = 'rgba(245,166,35,0.85)';
          for (let k = 0; k < 3; k++) {
            const a0 = time * (1.1 + k * 0.45) + k * 2.1;
            ctx.lineWidth = 3 - k * 0.8;
            ctx.beginPath();
            ctx.ellipse(px, py, TILE_W * (0.34 - k * 0.07), TILE_H * (0.34 - k * 0.07), 0, a0, a0 + 4.4);
            ctx.stroke();
          }
          ctx.restore();
        }
      });
    }

    // player
    let heroDraw = null; // reused by the occlusion ghost pass
    let heroFrame = 'hero';
    if (!player.dead) {
      const groundF = floorAt(Math.floor(player.x), Math.floor(player.y));
      const speed = Math.hypot(player.vx, player.vy);
      const walking = player.grounded && speed > 0.4;
      // gentle sin^2 gait bob — the 4-frame cycle carries the leg motion now,
      // bob just adds weight. Zero exactly at each footfall, no sharp corners
      const bobTarget = walking ? Math.pow(Math.sin(player.walkPhase * Math.PI * 2), 2) * 2.5 : 0;
      player.bobS += (bobTarget - player.bobS) * (1 - Math.exp(-18 * frameDt));
      const bob = player.bobS;
      // per-view walk cycles + per-view jump sets: rise / apex tuck / fall,
      // landing absorbs into that view's crouch frame while squash is active
      const jumpSet = JUMP[player.view];
      if (!player.grounded) {
        heroFrame = player.vz > 1 ? jumpSet[1] : player.vz > -1.5 ? jumpSet[2] : jumpSet[3];
      } else if (player.squash > 0.1 || player.strikeT > 0) {
        heroFrame = jumpSet[0]; // landing crouch / strike pose (placeholder)
      } else if (walking) {
        heroFrame = player.view === 'side'
          ? SIDE_WALK[Math.floor(player.walkPhase * SIDE_WALK.length) % SIDE_WALK.length]
          : (player.view === 'back'
              ? BACK_WALK[Math.floor(player.walkPhase * BACK_WALK.length) % BACK_WALK.length]
              : FRONT_WALK[Math.floor(player.walkPhase * FRONT_WALK.length) % FRONT_WALK.length]);
      } else {
        heroFrame = player.view === 'back' ? 'hero_back_stand'
          : player.view === 'side' ? 'hero_side_stand' : 'hero';
      }
      // squash on land, stretch while rising, breathe while idle — eased, no pops
      let squashTarget = player.squash;
      if (!player.grounded && player.vz > 0) squashTarget -= Math.min(0.1, player.vz * 0.016);
      if (player.grounded && speed < 0.3) squashTarget += Math.sin(time * 2.4) * 0.012;
      player.squashS += (squashTarget - player.squashS) * (1 - Math.exp(-22 * frameDt));
      const squashY = player.squashS;
      // lean into the run (screen-space tilt from horizontal velocity),
      // plus an idle weight-shift: a slow ~7s sway cycle (research pass 2 —
      // real bodies transfer weight foot-to-foot; pure statue idles read dead)
      const idleAmt = player.grounded ? Math.max(0, 1 - speed / 0.5) : 0;
      const idleSway = Math.sin(time * 0.9) * 0.014 * idleAmt;
      const lean = Math.max(-0.085, Math.min(0.085,
        (player.vx - player.vy) * 0.013)) + idleSway;
      // frame-swap crossfade bookkeeping: on any swap, remember the old frame
      // and dissolve it out over the new one (smoothstep). Blend duration is
      // capped at half the current walk beat — at sprint cadence (~47ms/beat)
      // a fixed 65ms blend never finishes and the whole run goes mushy
      if (heroFrame !== lastHeroFrame) {
        prevHeroFrame = lastHeroFrame;
        lastHeroFrame = heroFrame;
        frameBlendT = 0;
        const beatRate = speed * 0.45 * 8; // walk-frame swaps per second
        blendDur = walking && beatRate > 0
          ? Math.min(FRAME_BLEND, 0.5 / beatRate) : FRAME_BLEND;
      }
      frameBlendT += frameDt;
      const bt = Math.min(1, frameBlendT / blendDur);
      const blendA = prevHeroFrame ? 1 - bt * bt * (3 - 2 * bt) : 0;
      heroDraw = (set, alpha) => {
        ctx.save();
        const baseA = alpha !== undefined ? alpha : 1;
        ctx.translate(0, -bob);
        const drawFrame = (name, a) => {
          const img = set[name];
          if (!img) return;
          ctx.globalAlpha = baseA * a;
          // height-normalized width (x true pose-height for crouch/tuck frames)
          const hTarget = HERO_H * (HSCALE[name] || 1);
          const w = hTarget * (img.width / img.height);
          // all sprites natively face LEFT -> mirrored when face trends right;
          // player.face is continuous, so direction changes ease instead of snap
          drawSprite(img, player.x, player.y, player.z, w,
                     -player.face, squashY, 0.97, lean, FOOT[name] || 0);
        };
        drawFrame(heroFrame, 1);
        if (blendA > 0.01) drawFrame(prevHeroFrame, blendA);
        ctx.restore();
      };
      drawList.push({
        key: (player.x + player.y) * 100 + player.z * 2 + 1.5,
        fn: () => {
          if (groundF !== null) drawShadow(player.x, player.y, groundF, player.z - groundF, TILE_W * 0.24);
          heroDraw(IMG);
        }
      });
    }

    // loot items: tiny copies of the prop art; resting items hover-bob,
    // shards glow; magneting items shrink as they're absorbed
    for (const L of loot) {
      drawList.push({
        key: (L.x + L.y) * 100 + L.z * 2 + 1.45,
        fn: () => {
          const img = IMG[LOOT_IMG[L.kind]];
          if (!img) return;
          const hover = L.state === 'rest' ? Math.sin(time * 3 + L.rot) * 2.5 : 0;
          const lg = floorAt(Math.floor(L.x), Math.floor(L.y)) ?? 0;
          let w = TILE_W * (L.kind === 'shard' ? 0.16 : 0.19);
          if (L.state === 'magnet') {
            const dx = player.x - L.x, dy = player.y - L.y;
            w *= Math.max(0.35, Math.min(1, Math.hypot(dx, dy) / 0.9)); // shrink in
          }
          drawShadow(L.x, L.y, lg, L.z - lg, w * 0.4);
          ctx.save();
          ctx.translate(0, -hover);
          if (L.kind === 'shard') {
            ctx.shadowColor = 'rgba(245,166,35,0.9)';
            ctx.shadowBlur = 16 + Math.sin(time * 3 + L.rot) * 6;
          }
          drawSprite(img, L.x, L.y, L.z, w);
          ctx.restore();
        }
      });
    }

    // particles
    for (const p of particles) {
      drawList.push({
        key: (p.x + p.y) * 100 + p.z * 2 + 1.6,
        fn: () => {
          const a = 1 - p.age / p.life;
          ctx.fillStyle = p.color + (a * 0.9).toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(isoX(p.x, p.y), isoY(p.x, p.y, p.z), p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // ambient motes (always on top of world, soft)
    for (const m of motes) {
      drawList.push({
        key: 99999,
        fn: () => {
          const fy = Math.sin(time * m.sp + m.ph) * 10;
          const a = 0.25 + 0.2 * Math.sin(time * m.sp * 2 + m.ph);
          ctx.fillStyle = `rgba(245,166,35,${a.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(isoX(m.x, m.y), isoY(m.x, m.y, m.z) + fy, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    drawList.sort((a, b) => a.key - b.key);
    for (const d of drawList) d.fn();

    // occlusion ghost: bone silhouette ONLY where world geometry covers the hero.
    // Render the silhouette to an offscreen canvas, mask it with the occluding
    // draws (destination-in), composite the intersection back at low alpha.
    // Ghost-over-canopy polish: if the occluder is a tree canopy, use an
    // outline-only ghost (shadowBlur stroke) instead of a filled bone silhouette
    // so the hero reads clearly against dark tree crowns.
    if (heroDraw) {
      const heroKey = (player.x + player.y) * 100 + player.z * 2 + 1.5;
      const occluders = drawList.filter(d => d.world && d.key > heroKey);
      if (occluders.length) {
        for (const c of [occCanvas, maskCanvas]) {
          if (c.width !== canvas.width || c.height !== canvas.height) {
            c.width = canvas.width; c.height = canvas.height;
          }
        }
        const worldT = ctx.getTransform();
        const main = ctx;
        // detect if any occluder is a tree canopy
        const hasTreeOccluder = occluders.some(d => d.propType === 'tree');
        // 1) union of all occluding geometry -> maskCanvas
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        mctx.setTransform(worldT);
        ctx = mctx;
        for (const d of occluders) d.fn();
        // 2) ghost silhouette -> occCanvas, clipped by the mask in ONE composite
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.clearRect(0, 0, occCanvas.width, occCanvas.height);
        octx.setTransform(worldT);
        ctx = octx;
        heroDraw(TINT);
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.globalCompositeOperation = 'destination-in';
        octx.drawImage(maskCanvas, 0, 0);
        octx.globalCompositeOperation = 'source-over';
        ctx = main;
        // 3) composite the intersection back over the scene
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (hasTreeOccluder) {
          // outline-only ghost for tree canopies: draw the masked silhouette as
          // a glowing outline (shadowBlur around the shape) at very low fill alpha
          // so the outline reads against both dark and mid-tone canopies
          ctx.globalAlpha = 0.18; // near-transparent fill — preserves shape hint
          ctx.drawImage(occCanvas, 0, 0);
          // stroke glow pass: composite the silhouette again with strong shadow
          ctx.globalAlpha = 0.85;
          ctx.shadowColor = 'rgba(230,220,200,0.95)';
          ctx.shadowBlur = 5;
          ctx.drawImage(occCanvas, 0, 0);
          ctx.shadowBlur = 0;
        } else {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(occCanvas, 0, 0);
        }
        ctx.restore();
      }
    }

    // god-rays: slow-drifting warm light shafts, screen-composited
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      const drift = Math.sin(time * 0.06 + i * 2.1) * vw * 0.05;
      const rx = vw * (0.22 + i * 0.27) + drift;
      const rw = vw * (0.07 + i * 0.025);
      // toned down for the light sky (R35) — screen-composite barely reads on blue,
      // kept as a faint warmth rather than visible shafts
      const pulse = 0.05 + 0.02 * Math.sin(time * 0.18 + i * 1.7);
      ctx.save();
      ctx.translate(rx, 0);
      ctx.rotate(0.30);
      const rg = ctx.createLinearGradient(0, 0, 0, vh * 1.15);
      rg.addColorStop(0, `rgba(255,228,170,${pulse.toFixed(3)})`);
      rg.addColorStop(0.7, `rgba(255,228,170,${(pulse * 0.4).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(255,228,170,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-rw / 2, -vh * 0.05, rw, vh * 1.2);
      ctx.restore();
    }
    ctx.restore();

    // vignette
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.38, vw / 2, vh / 2, vh * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,32,44,0.30)'); // lighter on the open sky (R35)
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);

    // death fade
    if (player.dead) {
      ctx.fillStyle = 'rgba(7,10,15,0.45)';
      ctx.fillRect(0, 0, vw, vh);
    }

    // level-warp fade
    if (warp) {
      ctx.fillStyle = `rgba(7,10,15,${Math.min(1, warp.t).toFixed(3)})`;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  // ---------- wizard chat (shell; Corner-bridge wiring is its own round) ----------
  const wizEl = () => document.getElementById('wizard-chat');
  function wizSay(text, who) {
    const log = document.getElementById('wiz-log');
    const div = document.createElement('div');
    div.className = 'wiz-msg ' + who;
    // agent replies arrive as light markdown — render bold, strip the rest
    // (escape first so nothing else becomes HTML)
    const esc = String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    div.innerHTML = esc
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/[*_`#]/g, '')
      .replace(/\n/g, '<br>');
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
  function openWizard() {
    wizardOpen = true;
    wizHasNews = false;
    wizEl().classList.add('show');
    const log = document.getElementById('wiz-log');
    if (!log.childElementCount) {
      wizSay('Ah — there you are. I have been watching you smash my boulders.', 'wiz');
      wizSay('Ask me anything, little adventurer. Soon I will remember all your quests.', 'wiz');
    }
    setTimeout(() => document.getElementById('wiz-input').focus(), 250);
  }
  function closeWizard() {
    wizardOpen = false;
    wizEl().classList.remove('show');
    document.getElementById('wiz-input').blur();
  }
  // ---- real backend (R29): the Wizard is an embedded Corner chat ----
  // POST -> /api/embed/chat (embed_id emb_iso_wizard, routed to the
  // iso-wizard project room, persona overlay server-side), then poll
  // /api/embed/messages for the reply. The local stub below remains the
  // OFFLINE FALLBACK so the wizard never goes mute.
  const EMBED_BASE = 'https://www.aheadofmarket.com/api/embed';
  const EMBED_ID = 'emb_iso_wizard';
  const visitorId = (() => {
    try {
      let v = localStorage.getItem('iso-visitor');
      if (!v) { v = 'kid_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('iso-visitor', v); }
      return v;
    } catch { return 'kid_anon'; }
  })();
  let wizThinking = false;
  let wizHasNews = false; // reply arrived while the panel was closed
  // latency = characterization (research pass 4): an ancient wizard SHOULD
  // ponder. Staged beats keep the "he's working on it" signal alive — a
  // static spinner decays into "it's stuck" after ~10s.
  const PONDER = [
    'The wizard strokes his beard…',
    'The amber crystal flickers…',
    'He consults the old runes…',
    'A thought is forming…',
    'He hums a very old tune…',
  ];
  async function wizardAsk(msg) {
    if (wizThinking) return;
    wizThinking = true;
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'wiz-msg wiz ponder';
    thinkingEl.textContent = PONDER[0];
    document.getElementById('wiz-log').appendChild(thinkingEl);
    let pi = 0;
    const ponderTimer = setInterval(() => {
      pi = (pi + 1) % PONDER.length;
      thinkingEl.textContent = PONDER[pi];
    }, 4200);
    const done = () => { clearInterval(ponderTimer); thinkingEl.remove(); wizThinking = false; };
    try {
      const r = await fetch(`${EMBED_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embed_id: EMBED_ID, visitor_id: visitorId, host_origin: location.origin, content: msg }),
      });
      if (!r.ok) throw new Error('chat ' + r.status);
      const { since_ts } = await r.json();
      // poll for the reply (up to ~75s, 1.5s cadence)
      for (let i = 0; i < 50; i++) {
        await new Promise(z => setTimeout(z, 1500));
        const pr = await fetch(`${EMBED_BASE}/messages?embed_id=${EMBED_ID}&since=${encodeURIComponent(since_ts)}&visitor_id=${visitorId}`);
        if (!pr.ok) continue;
        const data = await pr.json();
        const msgs = (data.messages || data || []);
        if (Array.isArray(msgs) && msgs.length) {
          done();
          for (const m of msgs) wizSay(m.text, 'wiz');
          if (!wizardOpen) { wizHasNews = true; SFX.pickup(3); } // came back later
          return;
        }
      }
      throw new Error('no reply');
    } catch (e) {
      // offline / timeout: the stub keeps him talking
      done();
      wizardRespond(msg);
    }
  }

  // stub responder: wizard-voice templates aware of live game state.
  // Kept as the OFFLINE FALLBACK behind wizardAsk (R29).
  function wizardRespond(msg) {
    const m = msg.toLowerCase();
    const total = bag.rock + bag.shard;
    let r;
    if (/shard|crystal|rock|bag|loot|collect/.test(m))
      r = total > 0
        ? `Your bag holds ${bag.shard} shard${bag.shard === 1 ? '' : 's'} and ${bag.rock} rock${bag.rock === 1 ? '' : 's'}. Crystals remember the light, you know.`
        : 'An empty bag! The boulders by the shore practically beg to be cracked open.';
    else if (/door|gate|portal|seal|stuck/.test(m))
      r = SEALS['gate-ruins']
        ? 'The sealed way opens for a curious mind, not a strong arm. Go and read what it shows you.'
        : 'You broke the seal already — knowledge suits you. More doors will come.';
    else if (/who|wizard|you/.test(m))
      r = 'A keeper of this little world. One day soon I will remember your every quest and subject — I am still waking up.';
    else if (/help|what.*do|how/.test(m))
      r = 'Smash what can be smashed (E), gather what falls, and when a way is sealed — learn your way through it.';
    else
      r = ['Hmm. The crystals hum when you say that.',
           'A fine thought. Bring it to me again when I am fully awake.',
           'The isles keep their secrets... for now. Keep collecting.'][(Math.random() * 3) | 0];
    setTimeout(() => wizSay(r, 'wiz'), 450 + Math.random() * 500);
  }

  // ---------- WoW HUD wiring ----------
  const statsEl = document.getElementById('stats');

  // minimap rendering
  function drawMinimap() {
    const mc = document.getElementById('minimap-canvas');
    if (!mc) return;
    const ctx = mc.getContext('2d');
    const W = mc.width, H = mc.height;
    ctx.clearRect(0, 0, W, H);

    // clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, H/2, W/2 - 1, 0, Math.PI * 2);
    ctx.clip();

    // draw level tiles as dots
    const tiles = LEVELS[levelIdx].tiles;
    if (tiles && tiles.length) {
      const cols = tiles[0].length, rows = tiles.length;
      const scaleX = W / cols, scaleY = H / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = tiles[r][c];
          if (!t) continue;
          let col = '#2a4a2a';
          if (t.type === 'water') col = '#1a3a5c';
          else if (t.type === 'stone' || t.type === 'wall') col = '#4a4a5a';
          else if (t.type === 'grass') col = '#2a5a2a';
          ctx.fillStyle = col;
          ctx.fillRect(c * scaleX, r * scaleY, scaleX + 0.5, scaleY + 0.5);
        }
      }
      // portals as amber dots
      (LEVELS[levelIdx].portals || []).forEach(p => {
        ctx.fillStyle = '#f5a623';
        ctx.beginPath();
        ctx.arc(p.x * scaleX + scaleX/2, p.y * scaleY + scaleY/2, 3, 0, Math.PI*2);
        ctx.fill();
      });
      // player dot
      const cols2 = tiles[0].length, rows2 = tiles.length;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x * (W/cols2), player.y * (H/rows2), 3, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // minimap border ring
    ctx.beginPath();
    ctx.arc(W/2, H/2, W/2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245,166,35,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  setInterval(() => {
    // HP bar
    const hpPct = Math.round((playerHp / playerHpMax) * 100);
    const hpFill = document.getElementById('hp-fill');
    const hpVal = document.getElementById('hp-val');
    if (hpFill) hpFill.style.width = hpPct + '%';
    if (hpVal) hpVal.textContent = Math.round(playerHp) + ' / ' + playerHpMax;

    // XP bar
    const xpTotal = destroys * XP_PER_DESTROY;
    const level = Math.floor(xpTotal / XP_PER_LEVEL) + 1;
    const xpInLevel = xpTotal % XP_PER_LEVEL;
    const xpFill = document.getElementById('xp-fill');
    const xpVal = document.getElementById('xp-val');
    if (xpFill) xpFill.style.width = xpInLevel + '%';
    if (xpVal) xpVal.textContent = 'Lv ' + level + '  ' + xpInLevel + ' / ' + XP_PER_LEVEL + ' xp';

    // bag counts
    const sc = document.getElementById('shard-count');
    const rc = document.getElementById('rock-count');
    const dc = document.getElementById('destroy-count');
    if (sc) sc.textContent = bag.shard;
    if (rc) rc.textContent = bag.rock;
    if (dc) dc.textContent = destroys;

    // minimap
    drawMinimap();

    // legacy stats div (hidden but keep it alive for debug)
    if (statsEl) {
      const h = floorAt(Math.floor(player.x), Math.floor(player.y));
      statsEl.innerHTML =
        `<span class="amber">${LEVELS[levelIdx].name}</span><br>` +
        `elev <span class="amber">${h === null ? '—' : h}</span> &nbsp; ` +
        `${fps.toFixed(0)} fps`;
    }
  }, 250);

  // ---------- boot ----------
  function loop(t) {
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;
    frameDt = dt;
    time += dt;
    fps = fps * 0.95 + (1 / dt) * 0.05;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // debug/test handle
  window.ISO = {
    player, keys, cam, occCanvas, octx, particles,
    stats: () => ({ jumps, falls, destroys, fps }),
    bag, loot,
    gate: () => ({ seals: { ...SEALS }, cut: cut && cut.phase }),
    npcs: () => ({ done: [...lessonsDone], perks: { ...PERKS }, near: (npcNear() || {}).id || null,
      pos: NPCS.map(n => ({ id: n.id, x: +n.x.toFixed(2), y: +n.y.toFixed(2), state: n.state })) }),
    resetLessons: () => { lessonsDone.clear(); saveLessons(); PERKS.smashPower = 1; PERKS.magnetR = 1.25; setQuest('Mara the Baker needs help — find her in the Village'); },
    build: () => ({ mode: buildMode, placed: [...placedBlocks] }),
    fox: () => ({ x: +FOX.x.toFixed(2), y: +FOX.y.toFixed(2), state: FOX.state, frame: FOX.frame }),
    owl: () => ({ x: +OWL.x.toFixed(2), y: +OWL.y.toFixed(2), state: OWL.state, frame: OWL.frame }),
    companions: () => [...companions],
    resetCompanions: () => { companions.clear(); saveCompanions(); },
    wizard: () => ({ near: wizardNear(), open: wizardOpen }),
    world: () => ({ MAP, ROWS, COLS, PROPS, PORTALS, PORTAL: PORTALS[0], SPAWN, levelIdx, W }),
    go: (i) => loadLevel(i),
  };

  Promise.all(ASSET_FILES.map(name => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { IMG[name] = img; res(); };
    img.onerror = () => { console.error('ASSET FAILED:', name); rej(new Error('asset: ' + name)); };
    img.src = `assets/${name}.webp`;
  }))).then(() => {
    // prescale to on-screen size (x DPR) — kills minification shimmer in motion
    const targets = {
      grass: TILE_W * 1.1, grass2: TILE_W * 1.1, stone: TILE_W * 1.1, stone2: TILE_W * 1.1,
      water: TILE_W * 1.15, tree: TILE_W * 1.55, crystal: TILE_W * 0.85, boulder: TILE_W * 0.92,
      path: TILE_W * 1.1,
      wizard: TILE_W * 0.92, npc_mara: TILE_W * 0.7, npc_marn: TILE_W * 0.68,
      bldg_bakery: TILE_W * 2.9, bldg_mill: TILE_W * 2.3, bldg_house: TILE_W * 2.7,
      npc_pip: TILE_W * 0.66, npc_wick: TILE_W * 0.7,
      owl_stand: TILE_W * 0.4, owl_fly: TILE_W * 0.45, owl_walk: TILE_W * 0.4, owl_sit: TILE_W * 0.4,
      bldg_cottage: TILE_W * 2.4, bldg_tower: TILE_W * 1.6, waystone: TILE_W * 0.68,
      fox_stand: TILE_W * 0.5, fox_trot1: TILE_W * 0.5, fox_trot2: TILE_W * 0.5, fox_sit: TILE_W * 0.5,
      // R49: Forest Path + Deep Forest assets
      cabin_hermit:   TILE_W * 2.2,
      shrine_forest:  TILE_W * 1.8,
      npc_traveler:   TILE_W * 0.66,
      npc_sage:       TILE_W * 0.68,
      temple_crystal: TILE_W * 2.6,
    };
    for (const f of HERO_FRAMES) targets[f] = TILE_W * 0.78;
    for (const k of ASSET_FILES) IMG[k] = prescale(IMG[k], (targets[k] || TILE_W) * DPR);
    HERO_H = TILE_W * 0.62 * (IMG.hero.height / IMG.hero.width);
    for (const t in DESTRUCTIBLE) PROP_TINT[t] = makeTint(IMG[t], 'rgba(255,250,235,1)');
    for (const f of HERO_FRAMES) {
      TINT[f] = makeTint(IMG[f], 'rgba(232,224,208,1)');
      FOOT[f] = footOffset(IMG[f]);
    }
    document.getElementById('loading').classList.add('done');
    // the day starts with a person, not a menu (R36/R40): breadcrumb the
    // first unmet villager in route order
    const nextIdx = NPCS.findIndex(n => !lessonsDone.has(n.id));
    if (nextIdx === 0) setQuest('Mara the Baker needs help — find her in the Village');
    else if (nextIdx > 0) setQuest(NPCS[nextIdx - 1].lesson.sendTo);
    else if (!companions.has('owl')) setQuest(NPCS[NPCS.length - 1].lesson.sendTo);
    else setQuest('');
    // R39 (research pass 6 — "the intended route"): the Wizard's morning note
    // names today's path through the people. Fresh day only.
    if (lessonsDone.size === 0) {
      const body = document.getElementById('day-body');
      body.innerHTML = '';
      ISO_DAY.note.forEach(line => {
        const d = document.createElement('div');
        d.textContent = line;
        d.style.cssText = 'margin:5px 0;text-align:left;width:100%;';
        body.appendChild(d);
      });
      body.style.flexDirection = 'column';
      const card = document.getElementById('daycard');
      setTimeout(() => card.classList.add('show'), 900);
      document.getElementById('day-go').onclick = () => {
        card.classList.remove('show');
        SFX.pickup && SFX.pickup(2);
      };
    }
    requestAnimationFrame(loop);
  }).catch(err => {
    document.getElementById('loading').textContent = 'asset load failed: ' + err;
  });
})();
