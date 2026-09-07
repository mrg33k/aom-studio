// native-design-vs-sim.mjs — corner:corner-v2 R19, the native visual e2e.
//
// Given the booted simulators and the design export, shoots every design
// screen on all three 390/402/440-class devices (XCUITest tour against the
// real backend), builds design-vs-simulator side-by-side pairs + pixelmatch
// diffs, checks every UI row (geometry ±1pt, token colours, required
// elements), and exits non-zero on any UI row off.
//
// One command (from the mission folder):
//   node tools/native-design-vs-sim.mjs
//
// Layout it assumes (absolute, per the R19 brief):
//   ios-native .... AOM-EA/aom-studio/ios-native
//   design export  corner-v2-integration/docs/design-reference/corner-v2
//   evidence out .. corner/missions/corner-v2/rounds/evidence
//   creds ......... /tmp/corner-v2-e2e.env (CORNER_V2_E2E_EMAIL/PASSWORD;
//                   never printed, committed, or captioned)
//
// The tour reads creds from TO{UR}_EMAIL/PASSWORD or from the /tmp handoff
// this script writes (the shell never reaches the on-sim runner — proven in
// R19). The handoff holds the same secrets as the env file and is deleted
// when --keep-handoff is absent (default: deleted).

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const MISSION = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const AOM_STUDIO = path.resolve(MISSION, "..", "..", "..");
const IOS_NATIVE = path.join(AOM_STUDIO, "ios-native");
const INTEGRATION = "/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration";
const DESIGN_DIR = path.join(INTEGRATION, "docs", "design-reference", "corner-v2");
const EVIDENCE = path.join(MISSION, "rounds", "evidence");

let PNG, pixelmatch;
function loadImaging(modulesDir) {
  let req;
  try {
    req = createRequire(path.join(modulesDir, "package.json"));
  } catch (e) {
    console.error(`cannot resolve imaging modules from ${modulesDir}: ${e.message}`);
    console.error(`install pngjs + pixelmatch there, or pass --modules <dir>.`);
    process.exit(2);
  }
  PNG = req("pngjs").PNG;
  const pm = req("pixelmatch");
  pixelmatch = pm.default ?? pm;
}

function parseArgs(argv) {
  const out = {
    sim390: "0A05C9AA-9835-4C66-BF7A-9B4CF15AD80D",
    sim402: "971E7446-394B-4EF6-9796-8D9D1F916994",
    sim440: "C261F6F2-9FA6-4030-8257-6FA4046E80EB",
    design: DESIGN_DIR,
    outDir: EVIDENCE,
    modules: path.join(INTEGRATION, "node_modules"),
    screens: null, // null = all
    skipShoot: false,
    keepHandoff: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--sim-390") out.sim390 = next();
    else if (a === "--sim-402") out.sim402 = next();
    else if (a === "--sim-440") out.sim440 = next();
    else if (a === "--design") out.design = next();
    else if (a === "--out") out.outDir = next();
    else if (a === "--modules") out.modules = next();
    else if (a === "--screens") out.screens = next().split(",").map((s) => s.trim());
    else if (a === "--skip-shoot") out.skipShoot = true;
    else if (a === "--keep-handoff") out.keepHandoff = true;
    else if (a === "--help") { usage(); process.exit(0); }
    else { console.error(`unknown arg ${a}`); usage(); process.exit(2); }
  }
  return out;
}

function usage() {
  console.log(`usage: node tools/native-design-vs-sim.mjs [options]
  --sim-390 UDID  --sim-402 UDID  --sim-440 UDID
  --design DIR  --out DIR  --modules DIR
  --screens login,setup-1,setup-6,thread,drawer,settings,sheet-half,sheet-context,sheet-review,sheet-full,empty
  --skip-shoot (reuse last shots)  --keep-handoff`);
}

// screen -> { test, design, height (points), needsBackend }
const SCREENS = {
  "login":         { test: "testShoot01Login",   design: "R17-native-login-design.png",        h: 844 },
  "setup-1":       { test: "testShoot02Setup1",  design: "R17-native-setup-1-design.png",      h: 844 },
  "setup-6":       { test: "testShoot03Setup6",  design: "R17-native-setup-6-design.png",      h: 844 },
  "thread":        { test: "testShoot04Thread",  design: "R17-native-thread-design.png",       h: 844 },
  "drawer":        { test: "testShoot05Drawer",  design: "R17-native-drawer-design.png",       h: 844 },
  "settings":      { test: "testShoot06Settings", design: "R17-native-settings-design.png",    h: 844 },
  "sheet-half":    { test: "testShoot07SheetHalf", design: "R17-native-sheet-half-design.png", h: 844 },
  "sheet-context": { test: "testShoot08SheetContext", design: "R17-native-sheet-context-design.png", h: 844 },
  "sheet-review":  { test: "testShoot09SheetReview", design: null,                              h: 844 },
  "sheet-full":    { test: "testShoot09bSheetFull", design: "R17-native-sheet-full-review-design.png", h: 844 },
  "empty":         { test: "testShoot10Empty",   design: "R17-native-empty-design.png",        h: 844 },
};

const DEVICES = [
  { tag: "390", width: 390, height: 844 },
  { tag: "402", width: 402, height: 874 },
  { tag: "440", width: 440, height: 956 },
];

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

// ---------------------------------------------------------------------------
// The gate: required elements, geometry (±1pt unless noted), token colours.
// `frame` entries compare R19FRAME w/h against design points. `pixel` entries
// compare R19PIXEL samples (0-255 per channel). `scan` entries run on the
// exported PNGs (drawer width, sheet handle vs the design PNG).
// ---------------------------------------------------------------------------
const ANCHORS = {
  "login": {
    required: ["login-headline", "login-email", "login-email-continue",
               "login-sso-google", "login-sso-apple", "login-sso-sso", "login-terms"],
    frames: [
      { id: "login-sso-google", h: 50, tol: 1.5 },
      { id: "login-sso-apple", h: 50, tol: 1.5 },
      { id: "login-sso-sso", h: 50, tol: 1.5 },
      { id: "login-email", h: 50, tol: 1.5 },
    ],
    pixels: [{ label: "ground", rgb: [15, 19, 25], tol: 6 }],
  },
  "setup-1": {
    required: ["v2-setup-step", "v2-setup-continue", "v2-setup-skip", "v2-setup-connect-gmail"],
    frames: [{ id: "v2-setup-continue", h: 50, tol: 1.5 }],
    pixels: [],
  },
  "setup-6": {
    required: ["v2-setup-step", "v2-setup-name", "v2-setup-finish"],
    frames: [
      { id: "v2-setup-name", h: 50, tol: 1.5 },
      { id: "v2-setup-finish", h: 50, tol: 1.5, minY: 740, note: "bottom-docked" },
    ],
    pixels: [],
  },
  "thread": {
    required: ["chat-title", "v2-drawer-button", "v2-composer-field",
               "v2-composer-send", "v2-record", "v2-commands"],
    frames: [
      { id: "v2-composer-send", w: 50, h: 50, tol: 1.5 },
      { id: "v2-commands", h: 32, tol: 1.5 },
      { id: "v2-record", w: 36, h: 36, tol: 1.5 },
    ],
    pixels: [
      { label: "ground", rgb: [15, 19, 25], tol: 6 },
      { label: "send", rgb: [91, 155, 255], tol: 8 },
    ],
  },
  "drawer": {
    required: ["v2-drawer-close", "v2-drawer-new", "v2-drawer-new-project",
               "v2-drawer-record", "v2-drawer-settings", "v2-drawer-bell"],
    frames: [
      { id: "v2-drawer-new", h: 48, tol: 2 },
      { id: "v2-drawer-new-project", h: 48, tol: 2 },
    ],
    pixels: [{ label: "surface", rgb: [22, 27, 35], tol: 8 }],
    scans: [{ kind: "drawer-width", want: 325.5, tol: 3 }],
  },
  "settings": {
    required: ["settings-back", "settings-name", "settings-email", "settings-rerun"],
    frames: [{ id: "settings-rerun", h: 52, tol: 2 }],
    pixels: [],
  },
  "sheet-half": {
    required: ["visual-sheet-close", "review-toggle", "sheet-tab-preview", "sheet-tab-context"],
    // P082: the resting tab strip draws icon + label only — no ×.
    forbidden: ["visual-close"],
    frames: [],
    pixels: [{ label: "sheet-bg", rgb: [22, 27, 35], tol: 8 }],
    scans: [{ kind: "sheet-handle", tol: 2 }],
  },
  "sheet-context": {
    required: ["sheet-tab-preview", "sheet-tab-context"],
    frames: [],
    pixels: [],
  },
  "sheet-review": {
    required: ["review-toggle", "review-send"],
    frames: [{ id: "review-send", h: 50, tol: 3 }],
    pixels: [],
  },
  "sheet-full": {
    required: ["review-toggle", "review-send"],
    // P082: the resting tab strip draws icon + label only — no ×.
    forbidden: ["visual-close"],
    frames: [{ id: "review-send", h: 50, tol: 3 }],
    pixels: [],
    scans: [{ kind: "sheet-handle-full", tol: 3 }],
  },
  "empty": { required: [], frames: [], pixels: [] }, // unreachable on a populated account
};

function readCreds() {
  const file = "/tmp/corner-v2-e2e.env";
  const raw = fs.readFileSync(file, "utf8");
  const creds = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)\s*$/);
    if (m) creds[m[1]] = m[2];
  }
  if (!creds.CORNER_V2_E2E_EMAIL || !creds.CORNER_V2_E2E_PASSWORD) {
    throw new Error(`${file} lacks CORNER_V2_E2E_EMAIL/PASSWORD`);
  }
  return creds;
}

function writeHandoff(creds) {
  const p = "/tmp/r19-diag-env.json";
  fs.writeFileSync(p, JSON.stringify({
    email: creds.CORNER_V2_E2E_EMAIL, password: creds.CORNER_V2_E2E_PASSWORD,
  }));
  return p;
}

function runTour({ sim, screens, keepLog }) {
  const tests = screens.map((s) => `-only-testing:CornerUITests/R19ShootScreens/${SCREENS[s].test}`);
  const bundle = `/tmp/r19/tour-${sim.slice(0, 8)}.xcresult`;
  try { fs.rmSync(bundle, { recursive: true, force: true }); } catch {}
  const args = ["-project", "Corner.xcodeproj", "-scheme", "Corner",
    "-destination", `platform=iOS Simulator,id=${sim}`,
    ...tests, "-resultBundlePath", bundle, "test"];
  const res = spawnSync("xcodebuild", args, { cwd: IOS_NATIVE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const output = (res.stdout ?? "") + (res.stderr ?? "");
  if (keepLog) fs.writeFileSync(`/tmp/r19/tour-${sim.slice(0, 8)}.log`, output);
  return { output, bundle, ok: res.status === 0 };
}

function parseTour(output) {
  const status = {}, frames = {}, pixels = {};
  for (const line of output.split("\n")) {
    let m = line.match(/R19STATUS (\S+) (shot|ok|missing.*)$/);
    if (m) { status[m[1]] = m[2]; continue; }
    m = line.match(/R19FRAME (\S+) (\S+) \{([\d.]+),([\d.]+)\} ([\d.]+)x([\d.]+) label=(.*)$/);
    if (m) {
      (frames[m[1]] ??= {})[m[2]] = {
        x: +m[3], y: +m[4], w: +m[5], h: +m[6], label: m[7],
      };
      continue;
    }
    m = line.match(/R19FRAME (\S+) (\S+) MISSING$/);
    if (m) { (frames[m[1]] ??= {})[m[2]] = null; continue; }
    m = line.match(/R19PIXEL (\S+) (\S+) (\d+),(\d+),(\d+)$/);
    if (m) {
      (pixels[m[1]] ??= {})[m[2]] = [+m[3], +m[4], +m[5]];
      continue;
    }
  }
  return { status, frames, pixels };
}

function exportShots(bundle, destDir, wantScreens) {
  // xcresulttool refuses to write a manifest twice: start clean every run.
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  sh("xcrun", ["xcresulttool", "export", "attachments", "--path", bundle, "--output-path", destDir]);
  const manifest = JSON.parse(fs.readFileSync(path.join(destDir, "manifest.json"), "utf8"));
  const found = {};
  for (const entry of manifest) {
    for (const a of entry.attachments ?? []) {
      const name = a.suggestedHumanReadableName ?? "";
      const m = name.match(/^R19-(\S+?)_/);
      if (m && wantScreens.includes(m[1]) && !(m[1] in found)) {
        found[m[1]] = path.join(destDir, a.exportedFileName);
      }
    }
  }
  return found;
}

function downscale(src, height, dest) {
  sh("sips", ["-Z", String(height), src, "--out", dest]);
}

// ---------------------------------------------------------------------------
// PNG work (pngjs + pixelmatch): pairs, diffs, chrome scans.
// ---------------------------------------------------------------------------
function readPNG(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

function writePNG(png, p) {
  fs.writeFileSync(p, PNG.sync.write(png));
}

/// design left, sim-390 right, 8px divider. Both must be 844 tall.
function sideBySide(designPath, simPath, outPath) {
  const d = readPNG(designPath), s = readPNG(simPath);
  if (d.height !== 844 || s.height !== 844) {
    throw new Error(`pair heights must be 844 (design ${d.width}x${d.height}, sim ${s.width}x${s.height})`);
  }
  const gap = 8;
  const out = new PNG({ width: d.width + gap + s.width, height: 844 });
  PNG.bitblt(d, out, 0, 0, d.width, 844, 0, 0);
  PNG.bitblt(s, out, 0, 0, s.width, 844, d.width + gap, 0);
  for (let y = 0; y < 844; y++) {
    for (let x = 0; x < gap; x++) {
      const i = (out.width * y + d.width + x) << 2;
      out.data[i] = 98; out.data[i + 1] = 98; out.data[i + 2] = 107; out.data[i + 3] = 255;
    }
  }
  writePNG(out, outPath);
  return { width: out.width, height: 844 };
}

/// pixelmatch on the 390 pair, threshold 0.1. Returns differing-pixel count.
function diffPair(designPath, simPath, outPath, threshold = 0.1) {
  const d = readPNG(designPath), s = readPNG(simPath);
  if (d.width !== s.width || d.height !== s.height) {
    throw new Error(`diff pair size mismatch (design ${d.width}x${d.height}, sim ${s.width}x${s.height})`);
  }
  const diff = new PNG({ width: d.width, height: d.height });
  const count = pixelmatch(d.data, s.data, diff.data, d.width, d.height, { threshold });
  writePNG(diff, outPath);
  return count;
}

function px(png, x, y) {
  const i = (png.width * y + x) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}

/// Drawer right edge at y=250: first surface pixel scanning from the right.
function scanDrawerWidth(simPath) {
  const png = readPNG(simPath);
  for (let x = png.width - 1; x > 0; x--) {
    const [r, g, b] = px(png, x, 250);
    if (Math.abs(r - 22) <= 10 && Math.abs(g - 27) <= 10 && Math.abs(b - 35) <= 10) return x + 1;
  }
  return null;
}

/// Sheet handle: the 40x4 capsule reads as the longest run of rows with a
/// ~40px bright-grey span in x 170-220. Text and underlines trip the loose
/// test but never in handle-width runs, so the longest run wins.
function scanHandleCenter(simPath, y0 = 200, y1 = 280) {
  const png = readPNG(simPath);
  const runs = [];
  let start = null;
  for (let y = y0; y < y1; y++) {
    let n = 0;
    for (let x = 170; x <= 220; x++) {
      const [r, g, b] = px(png, x, y);
      if (r > 55 && g > 55 && b > 55 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12) n++;
    }
    if (n >= 35) {
      if (start === null) start = y;
    } else if (start !== null) {
      runs.push([start, y - 1]);
      start = null;
    }
  }
  if (start !== null) runs.push([start, y1 - 1]);
  if (!runs.length) return null;
  runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
  return (runs[0][0] + runs[0][1]) / 2;
}

/// Handle scan ranges per detent: half rides at ~239, full at ~100.
function scanRangeFor(kind) {
  return kind === "sheet-handle-full" ? [60, 160] : [200, 280];
}

// ---------------------------------------------------------------------------
// Evaluation + main.
// ---------------------------------------------------------------------------
function checkAnchors(screen, tour, sim390) {
  const a = ANCHORS[screen];
  const rows = [];
  const fr = tour.frames[screen] ?? {};
  const pxs = tour.pixels[screen] ?? {};
  const fail = (element, design, sim, delta, kind) =>
    rows.push({ screen, element, design, sim, delta, verdict: "FAIL", kind });
  const pass = (element, design, sim, delta, kind) =>
    rows.push({ screen, element, design, sim, delta, verdict: "pass", kind });

  for (const id of a.required ?? []) {
    if (fr[id]) pass(id, "present", `frame ${fr[id].w.toFixed(1)}x${fr[id].h.toFixed(1)}`, "—", "UI");
    else fail(id, "present", "MISSING", "—", "UI");
  }
  // P082: elements the design never draws at rest (a tab ×). Present =
  // FAIL — this anchor fails on the pre-fix strip, where every tab
  // carries its close button.
  for (const id of a.forbidden ?? []) {
    if (fr[id]) fail(id, "absent at rest", `frame ${fr[id].w.toFixed(1)}x${fr[id].h.toFixed(1)}`, "—", "UI");
    else pass(id, "absent at rest", "MISSING", "—", "UI");
  }
  for (const f of a.frames ?? []) {
    const got = fr[f.id];
    if (!got) { fail(`${f.id} geometry`, "present", "MISSING", "—", "UI"); continue; }
    const dims = [];
    if (f.w !== undefined) dims.push([`w${f.w}`, got.w]);
    if (f.h !== undefined) dims.push([`h${f.h}`, got.h]);
    for (const [name, value] of dims) {
      const want = parseFloat(name.slice(1));
      const d = Math.abs(value - want);
      (d <= f.tol ? pass : fail)(`${f.id} ${name}`, `${want}pt`, `${value.toFixed(1)}pt`, `${d.toFixed(1)}pt`, "UI");
    }
    if (f.minY !== undefined) {
      const ok = got.y + got.h >= f.minY;
      (ok ? pass : fail)(`${f.id} docked`, `maxY ≥ ${f.minY}${f.note ? ` (${f.note})` : ""}`,
        `maxY ${(got.y + got.h).toFixed(1)}`, ok ? "—" : `${(f.minY - got.y - got.h).toFixed(1)}pt short`, "UI");
    }
  }
  for (const p of a.pixels ?? []) {
    const got = pxs[p.label];
    if (!got) { fail(`${p.label} token`, `rgb(${p.rgb})`, "UNREADABLE", "—", "UI"); continue; }
    const d = Math.max(...got.map((v, i) => Math.abs(v - p.rgb[i])));
    (d <= p.tol ? pass : fail)(`${p.label} token`, `rgb(${p.rgb})`, `rgb(${got})`, `${d}`, "UI");
  }
  for (const s of a.scans ?? []) {
    if (s.kind === "drawer-width") {
      const got = scanDrawerWidth(sim390);
      if (got === null) fail("drawer width", `${s.want}pt`, "UNREADABLE", "—", "UI");
      else {
        const d = Math.abs(got - s.want);
        (d <= s.tol ? pass : fail)("drawer width", `${s.want}pt`, `${got}pt`, `${d.toFixed(1)}pt`, "UI");
      }
    } else if (s.kind === "sheet-handle" || s.kind === "sheet-handle-full") {
      const designP = designPathFor(screen);
      const [y0, y1] = scanRangeFor(s.kind);
      const want = scanHandleCenter(designP, ...scanRangeFor(s.kind));
      const got = scanHandleCenter(sim390, y0, y1);
      const label = s.kind === "sheet-handle-full" ? "sheet handle row (full)" : "sheet handle row";
      if (want === null || got === null) fail(label, "present", "UNREADABLE", "—", "UI");
      else {
        const d = Math.abs(got - want);
        (d <= s.tol ? pass : fail)(label, `design ${want.toFixed(1)}`, `sim ${got.toFixed(1)}`, `${d.toFixed(1)}pt`, "UI");
      }
    }
  }
  return rows;
}

function designPathFor(screen, designDir) {
  const name = SCREENS[screen].design;
  if (!name) return null;
  return path.join(designDir ?? EVIDENCE, name);
}

function main() {
  const cfg = parseArgs(process.argv.slice(2));
  loadImaging(cfg.modules);
  // sheet-review rides the half detent: pair it with the half design frame.
  SCREENS["sheet-review"].design = "R17-native-sheet-half-design.png";
  const screens = cfg.screens ?? Object.keys(SCREENS);
  for (const s of screens) {
    if (!SCREENS[s]) { console.error(`unknown screen ${s}`); process.exit(2); }
  }

  const devices = [
    { ...DEVICES[0], udid: cfg.sim390 },
    { ...DEVICES[1], udid: cfg.sim402 },
    { ...DEVICES[2], udid: cfg.sim440 },
  ];

  let handoff = "/tmp/r19-diag-env.json";
  if (!cfg.skipShoot) {
    const creds = readCreds();
    handoff = writeHandoff(creds);
  }

  const tours = {};
  for (const dev of devices) {
    let output, bundle;
    if (cfg.skipShoot) {
      bundle = `/tmp/r19/tour-${dev.udid.slice(0, 8)}.xcresult`;
      output = fs.readFileSync(`/tmp/r19/tour-${dev.udid.slice(0, 8)}.log`, "utf8");
    } else {
      console.log(`shooting ${screens.length} screens on ${dev.tag} (${dev.udid})…`);
      ({ output, bundle } = runTour({ sim: dev.udid, screens, keepLog: true }));
    }
    const tour = parseTour(output);
    tours[dev.tag] = { tour, bundle };
    // Export + downscale every shot attachment for this device.
    const expDir = `/tmp/r19/exp-${dev.tag}`;
    const found = exportShots(bundle, expDir, [...screens, "drawer-scrolled"]);
    for (const s of screens) {
      if (!found[s]) continue;
      const dest = path.join(cfg.outDir, `R19-native-${s}-sim-${dev.tag}.png`);
      downscale(found[s], dev.height, dest);
      console.log(`  ${s}: ${dest}`);
    }
    if (found["drawer-scrolled"]) {
      const dest = path.join(cfg.outDir, "R19-native-drawer-scrolled-sim-390.png");
      if (dev.tag === "390") { downscale(found["drawer-scrolled"], dev.height, dest); console.log(`  drawer-scrolled: ${dest}`); }
    }
  }
  if (!cfg.keepHandoff && !cfg.skipShoot) {
    try { fs.rmSync(handoff, { force: true }); } catch {}
  }

  // Pairs + diffs on the 390 set; anchor checks on the 390 tour data.
  const tour390 = tours["390"].tour;
  const allRows = [];
  console.log("\nscreen | design | sim | side-by-side | diff | open UI rows");
  for (const s of screens) {
    const sim390 = path.join(cfg.outDir, `R19-native-${s}-sim-390.png`);
    const st = tour390.status[s];
    if (!fs.existsSync(sim390)) {
      const why = st === undefined ? "tour never ran it" : `tour status: ${st}`;
      console.log(`${s} | ${SCREENS[s].design ?? "—"} | MISSING (${why}) | — | — | —`);
      if (s !== "empty") allRows.push({ screen: s, element: "screen", design: "shot", sim: why, delta: "—", verdict: "FAIL", kind: "UI" });
      continue;
    }
    const design = SCREENS[s].design ? path.join(cfg.outDir, SCREENS[s].design) : null;
    let pair = "—", diff = "—", diffCount = null;
    if (design && fs.existsSync(design)) {
      const dpng = readPNG(design);
      if (dpng.width !== 390 || dpng.height !== 844) {
        console.error(`${design} is ${dpng.width}x${dpng.height}, not 390x844 @1.0 — re-shoot the design frame.`);
        process.exit(2);
      }
      pair = path.join(cfg.outDir, `R19-native-${s}-side-by-side.png`);
      diff = path.join(cfg.outDir, `R19-native-${s}-diff.png`);
      sideBySide(design, sim390, pair);
      diffCount = diffPair(design, sim390, diff, 0.1);
    }
    const rows = checkAnchors(s, tour390, sim390);
    allRows.push(...rows);
    const open = rows.filter((r) => r.verdict === "FAIL");
    const diffNote = diffCount === null ? "—" : `${diffCount}px`;
    console.log(`${s} | ${SCREENS[s].design ?? "—"} | R19-native-${s}-sim-390.png | ${pair === "—" ? "—" : path.basename(pair)} | ${diff === "—" ? "—" : `${path.basename(diff)} ${diffNote}`} | ${open.length}`);
  }

  console.log("\nelement | design | simulator | Δ | verdict");
  for (const r of allRows) {
    console.log(`${r.screen} ${r.element} | ${r.design} | ${r.sim} | ${r.delta} | ${r.verdict}`);
  }
  const fails = allRows.filter((r) => r.verdict === "FAIL");
  console.log(`\n${allRows.length - fails.length}/${allRows.length} checks pass; ${fails.length} open.`);
  console.log("Note: pixelmatch diffs are evidence (real data never matches sample-data pixels); the gate is the checks above.");
  console.log("Fonts are verified by code inspection (Hanken throughout) + the side-by-sides, not by pixel.");
  process.exit(fails.length ? 1 : 0);
}

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();

