// Visual verification for TaskStatusCard variants.
// Renders all 5 variants into an inline HTML harness that mirrors the CV3 chat
// bubble background, screenshots each, and saves them to /tmp for inspection.
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT_DIR = '/tmp/task-status-card-screens'
mkdirSync(OUT_DIR, { recursive: true })

// Inline the component's rendered HTML from the React source by hand. We don't
// need the full app to render -- we just need pixel verification of the card
// design so Patrik (and future agents) can compare to Steffen's cv3.html.
const html = /* html */`<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TaskStatusCard visual check</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:#06090F;--s1:#111827;--s2:#1A2035;
      --border:rgba(255,255,255,0.04);--muted:#475569;--dim:#334155;--text:#F1F5F9;
      --yellow:#EAB308;--green:#22C55E;--red:#EF4444;--purple:#A78BFA;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:var(--bg);color:var(--text);font-family:'Inter',-apple-system,sans-serif;padding:40px 24px;min-height:100vh}
    .msgs{display:flex;flex-direction:column;gap:14px;max-width:480px;margin:0 auto}
    .row{display:flex;justify-content:flex-start}
    h1{font-size:16px;font-weight:800;margin-bottom:20px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em}
    .label{font-size:10px;color:var(--dim);margin-top:-4px;margin-bottom:-6px;text-transform:uppercase;letter-spacing:0.1em;font-family:'JetBrains Mono',monospace}
    @keyframes cv3TscBld {
      0%   { width: 5%; }
      50%  { width: 60%; }
      100% { width: 90%; }
    }
  </style>
</head>
<body>
  <div class="msgs" id="msgs">
    <h1>TaskStatusCard — 5 variants</h1>

    <!-- QUEUED -->
    <div class="label">queued</div>
    <div class="row">
      <div style="padding:14px 16px;border-radius:14px;background:var(--s2);border:1px solid rgba(234,179,8,0.08);max-width:88%;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:2px;width:30%;background:rgba(234,179,8,0.5);border-radius:14px 14px 0 0"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:18px;height:18px;border-radius:6px;background:rgba(234,179,8,0.12);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--yellow)">+</div>
          <span style="font-size:10px;font-weight:700;color:var(--yellow);text-transform:uppercase;letter-spacing:0.06em;font-family:'JetBrains Mono',monospace">Queued</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--yellow);line-height:1.25;letter-spacing:-0.01em">Redesign dashboard: home view with agent cards</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.4">Replace multi-column BoardView with focused home screen.</div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <span style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em">Bobby</span>
          <span style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em">Corner</span>
        </div>
        <div style="font-size:10px;color:var(--dim);margin-top:8px;font-family:'JetBrains Mono',monospace">2m ago</div>
      </div>
    </div>

    <!-- IN PROGRESS -->
    <div class="label">in_progress</div>
    <div class="row">
      <div style="padding:14px 16px;border-radius:14px;background:var(--s2);border:1px solid rgba(234,179,8,0.18);max-width:88%;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:2px;background:var(--yellow);border-radius:14px 14px 0 0;animation:cv3TscBld 5s ease-in-out infinite"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:18px;height:18px;border-radius:6px;background:rgba(234,179,8,0.12);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--yellow)">▶</div>
          <span style="font-size:10px;font-weight:700;color:var(--yellow);text-transform:uppercase;letter-spacing:0.06em;font-family:'JetBrains Mono',monospace">Running</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--yellow);line-height:1.25;letter-spacing:-0.01em">Auto-Scroll to Bottom</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.4">Patching ChatPanel scroll-to-bottom ref.</div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <span style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em">Bobby</span>
          <span style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em">Corner</span>
        </div>
        <div style="font-size:10px;color:var(--dim);margin-top:8px;font-family:'JetBrains Mono',monospace">just now</div>
      </div>
    </div>

    <!-- COMPLETED (Steffen's bright card) -->
    <div class="label">completed</div>
    <div class="row">
      <div style="padding:14px 16px;border-radius:14px;background:#FB923C;max-width:88%;position:relative;overflow:hidden">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
          <div style="min-width:0;flex:1">
            <div style="font-size:16px;font-weight:800;line-height:1.2;letter-spacing:-0.01em;color:#0A0A0A">Auto-Scroll to Bottom</div>
            <div style="display:flex;gap:6px;margin-top:5px">
              <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.45);text-transform:uppercase;letter-spacing:0.06em">Bobby</span>
              <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.45);text-transform:uppercase;letter-spacing:0.06em">Corner</span>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:800;color:rgba(0,0,0,0.6);line-height:1">10</div>
            <div style="font-size:8px;font-weight:600;color:rgba(0,0,0,0.35);text-transform:uppercase;text-align:right;margin-top:3px">QA</div>
          </div>
        </div>
        <div style="font-size:12px;color:rgba(0,0,0,0.62);margin-top:8px;line-height:1.4">Chat now auto-scrolls when new messages arrive.</div>
        <div style="padding:9px 11px;margin-top:10px;border-radius:10px;background:rgba(0,0,0,0.08)">
          <a href="https://aheadofmarket.com/dashboard" style="display:inline-block;padding:5px 12px;border-radius:6px;background:rgba(0,0,0,0.12);color:rgba(0,0,0,0.9);text-decoration:none;font-size:12px;font-weight:700">Open link ↗</a>
          <div style="font-size:11px;color:rgba(0,0,0,0.58);margin-top:6px;line-height:1.4">Deployed to aheadofmarket.com/dashboard</div>
        </div>
        <div style="font-size:10px;color:rgba(0,0,0,0.4);margin-top:8px;font-family:'JetBrains Mono',monospace">1m ago</div>
      </div>
    </div>

    <!-- NEEDS INPUT -->
    <div class="label">needs_input</div>
    <div class="row">
      <div style="padding:14px 16px;border-radius:14px;background:var(--yellow);max-width:88%;position:relative;overflow:hidden;box-shadow:0 6px 20px rgba(234,179,8,0.22)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:18px;height:18px;border-radius:6px;background:rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#0A0A0A">?</div>
          <span style="font-size:10px;font-weight:800;color:#0A0A0A;text-transform:uppercase;letter-spacing:0.1em;font-family:'JetBrains Mono',monospace">Needs Input</span>
        </div>
        <div style="font-size:16px;font-weight:800;line-height:1.2;letter-spacing:-0.01em;color:#0A0A0A">Port CV3 completion cards</div>
        <div style="display:flex;gap:6px;margin-top:5px">
          <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.5);text-transform:uppercase;letter-spacing:0.06em">Bobby</span>
          <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.5);text-transform:uppercase;letter-spacing:0.06em">Corner</span>
        </div>
        <div style="margin-top:10px;padding:9px 11px;border-radius:10px;background:rgba(0,0,0,0.14);font-size:13px;font-weight:500;color:#0A0A0A;line-height:1.45">Should the completion card stay on one row or allow title to wrap for long tasks?</div>
        <div style="margin-top:8px;font-size:10px;font-weight:600;color:rgba(0,0,0,0.55)">Reply below to unblock.</div>
        <div style="font-size:10px;color:rgba(0,0,0,0.4);margin-top:8px;font-family:'JetBrains Mono',monospace">just now</div>
      </div>
    </div>

    <!-- FAILED (loud) -->
    <div class="label">failed</div>
    <div class="row">
      <div style="padding:14px 16px;border-radius:14px;background:var(--red);max-width:88%;position:relative;overflow:hidden;box-shadow:0 6px 20px rgba(239,68,68,0.28)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:18px;height:18px;border-radius:6px;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff">!</div>
          <span style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.1em;font-family:'JetBrains Mono',monospace">Task Failed</span>
        </div>
        <div style="font-size:16px;font-weight:800;line-height:1.2;letter-spacing:-0.01em;color:#0A0A0A">Enrich municipality contacts</div>
        <div style="display:flex;gap:6px;margin-top:5px">
          <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.5);text-transform:uppercase;letter-spacing:0.06em">Gary</span>
          <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.5);text-transform:uppercase;letter-spacing:0.06em">Arsenal</span>
        </div>
        <div style="margin-top:10px;padding:9px 11px;border-radius:10px;background:rgba(0,0,0,0.22);font-size:12.5px;font-weight:500;color:#FEE2E2;line-height:1.45;white-space:pre-wrap">Apollo API returned 429 rate limit. Retries exhausted after 3 attempts.</div>
        <div style="font-size:10px;color:rgba(0,0,0,0.45);margin-top:8px;font-family:'JetBrains Mono',monospace">30s ago</div>
      </div>
    </div>

  </div>
</body>
</html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 560, height: 1400 } })
await page.setContent(html, { waitUntil: 'networkidle' })
// Let fonts settle
await page.waitForTimeout(800)

// Full snapshot
await page.screenshot({ path: `${OUT_DIR}/all-variants.png`, fullPage: true })

// Individual card snapshots
const labels = ['queued', 'in_progress', 'completed', 'needs_input', 'failed']
const rows = await page.locator('.row').all()
for (let i = 0; i < rows.length && i < labels.length; i++) {
  await rows[i].screenshot({ path: `${OUT_DIR}/${labels[i]}.png` })
}

await browser.close()
console.log(`Saved screenshots to ${OUT_DIR}`)
