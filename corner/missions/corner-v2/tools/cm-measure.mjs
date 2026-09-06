// Comp-match measurement: design export vs built app, same viewport, same anchors.
// Run from the corner-v2-integration worktree: node /tmp/cm.mjs
import { chromium } from "@playwright/test";
import path from "node:path";

const ROOT = process.cwd();
const DESIGN = "file://" + path.join(ROOT, "docs/design-reference/corner-v2/Corner v2.dc.html");
const BUILT = "http://127.0.0.1:5173/c/project-aster";
const SESSION = { userId: "u1", worldId: "w1", email: "hello@aom-inhouse.com", name: "Patrik" };

// [label, design anchor text, built anchor text, pick]
const ANCHORS = [
  ["search field", "Search", "Search", "field"],
  ["+ New button", "New", "New", "btn"],
  ["Project + button", "Project", "Project", "btn"],
  ["recent row", "Site hero rebuild", "Launch review", "row"],
  ["project row (Aster)", "Aster", "Aster", "row"],
  ["mission row", "Spring launch deck", "Launch review", "row"],
  ["files row", "Files", "Files", "row"],
  ["new mission row", "New mission", "New mission", "row"],
  ["preview tab", "Preview", "Preview", "self"],
  ["context tab", "Context", "Context", "self"],
  ["review button", "Review", "Review", "btn"],
  ["agent body", "Before I start", "Before I start", "self"],
  ["user bubble", "Buyers. Keep the film for press.", "Buyers. Keep the film for press.", "self"],
  ["question option", "Retail buyers", "Retail buyers", "row"],
  ["composer placeholder", "Tell Aster what to make next", "Tell Aster what to make next", "field"],
  ["record chip", "Record", "Record", "btn"],
  ["status (Working)", "Working", "Working", "self"],
  ["footer name", "Patrik", "Patrik", "footer"],
];

function measureAll(anchors) {
  const all = [...document.querySelectorAll("body *")];
  const own = (el) => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim();
  const findByText = (t, last) => {
    const exact = all.filter(el => own(el) === t || el.placeholder === t);
    const starts = exact.length ? exact : all.filter(el => own(el).startsWith(t));
    if (!starts.length) return null;
    return last ? starts[starts.length - 1] : starts[0];
  };
  const rowOf = (el) => {
    let cur = el;
    for (let i = 0; i < 6 && cur; i++) {
      if (cur.matches("[data-row], li, a, button, [role=button], [role=option], label, [class*=row], [class*=Row], [class*=item], [class*=option]")) return cur;
      cur = cur.parentElement;
    }
    return el.parentElement || el;
  };
  const measure = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight, ff: cs.fontFamily.split(",")[0].replace(/"/g, ""),
      color: cs.color, bg: cs.backgroundColor, br: cs.borderRadius, bw: cs.borderTopWidth };
  };
  const out = {};
  for (const [label, t, pick] of anchors) {
    const el = findByText(t, pick === "footer");
    if (!el) { out[label] = null; continue; }
    let target = el;
    if (pick === "row") target = rowOf(el);
    else if (pick === "btn") target = el.closest("button, [role=button], a") || rowOf(el);
    else if (pick === "field") target = el.matches("input, textarea") ? el : (el.closest("input, textarea") || el.parentElement);
    else if (pick === "footer") target = rowOf(el);
    out[label] = { self: measure(el), target: measure(target) };
  }
  const climb = (x, y, min, max) => { let cur = document.elementFromPoint(x, y); for (let i = 0; i < 12 && cur; i++) { const s = cur.getBoundingClientRect(); const v = (max > 200) ? s.width : s.height; if (v >= min && v <= max) return measure(cur); cur = cur.parentElement; } return null; };
  out["pane sidebar"] = { target: climb(100, 450, 200, 1200) };
  out["pane conversation"] = { target: climb(500, 450, 200, 1200) };
  out["pane visual"] = { target: climb(1100, 450, 200, 1200) };
  out["header sidebar"] = { target: climb(100, 28, 48, 72) };
  out["header conversation"] = { target: climb(500, 28, 48, 72) };
  out["header visual"] = { target: climb(1100, 28, 48, 72) };
  return out;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const d = await ctx.newPage();
await d.goto(DESIGN);
await d.getByText("Spring launch deck").first().waitFor({ timeout: 15000 });
await d.waitForTimeout(800);
const D = await d.evaluate(measureAll, ANCHORS.map(a => [a[0], a[1], a[3]]));
await d.screenshot({ path: "/tmp/cm-design.png" });

const b = await ctx.newPage();
await b.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await b.addInitScript((s) => { localStorage.setItem("corner_session", JSON.stringify(s)); localStorage.setItem("corner_theme", "dark"); }, SESSION);
await b.goto(BUILT);
await b.locator(".v2-workspace").waitFor({ timeout: 15000 });
await b.waitForTimeout(800);
const B = await b.evaluate(measureAll, ANCHORS.map(a => [a[0], a[2], a[3]]));
await b.screenshot({ path: "/tmp/cm-built.png" });
await browser.close();

const fmt = (m) => m ? `${m.w}x${m.h} @${m.x},${m.y} fs=${m.fs} lh=${m.lh} fw=${m.fw} ${m.ff} br=${m.br} bg=${m.bg} col=${m.color} bw=${m.bw}` : "(missing)";
for (const k of Object.keys(D)) {
  const dd = D[k], bb = B[k];
  console.log(`\n## ${k}\n  D: ${fmt(dd && dd.target)}\n  B: ${fmt(bb && bb.target)}`);
  if (dd && dd.self && bb && bb.self && dd.target !== dd.self) console.log(`  D.self: ${fmt(dd.self)}\n  B.self: ${fmt(bb.self)}`);
}
