// Weekly client report renderer — the Wolfpack /wolfpack template, made data-driven.
// Renders a reportWeeks snapshot (or a live draft, in preview) into the same
// self-contained document the hand-edited static weeks used. Font + logo now load
// from /reports-assets/ instead of being base64-inlined, everything else matches
// the week-4 markup so archived static weeks and rendered weeks look identical.

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Status drives the color classes in the template; anything unknown renders
// neutral rather than injecting a class name.
function statusClass(status) {
  return ['done', 'wip', 'next'].includes(status) ? status : '';
}

const CSS = `
@font-face{
  font-family:'Druk Cond';
  font-weight:400;font-style:normal;font-display:block;
  src:url('/reports-assets/druk-cond.otf') format('opentype');
}
:root{
  --ground:#F5F2EA;--paper:#FFFFFF;--ink:#151209;--ink-2:#45413A;--ink-3:#6E685B;
  --rule:#CFC8B8;--soft:#E6E0D2;--gold:#B58A38;--wash:#F3EBD9;
  --done:#1B6B3A;--doing:#8A6A1F;--next:#5A7A9E;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);
  font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  font-size:14px;line-height:1.4;-webkit-font-smoothing:antialiased}
.page{max-width:800px;margin:0 auto;padding:40px 40px 48px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;
  border-bottom:1.5px solid var(--rule);margin-bottom:32px}
.hdr-left h1{font-family:'Druk Cond',ui-sans-serif,sans-serif;text-transform:uppercase;
  font-weight:400;font-size:44px;line-height:.9;letter-spacing:.01em;margin-bottom:4px}
.hdr-left p{font-size:13px;color:var(--ink-2)}
.hdr-right{text-align:right;font-size:12px;color:var(--ink-3);line-height:1.5}
.hdr-right strong{color:var(--ink);font-size:13px}
.sec{margin-bottom:32px}
.sec-title{font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;
  color:var(--ink-3);padding-bottom:0;margin-bottom:14px}
.ms-tbl{width:100%;border-collapse:collapse;font-size:13px}
.ms-tbl th{font-size:9px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;
  color:var(--ink-3);padding:8px 12px 8px 0;text-align:left;border-bottom:1.5px solid var(--rule)}
.ms-tbl td{padding:12px 12px 12px 0;border-bottom:1px solid var(--soft);vertical-align:middle}
.ms-tbl tr:last-child td{border-bottom:none}
.ms-tbl .ms-num{font-weight:800;color:var(--ink-3);text-align:center;width:28px}
.ms-tbl .ms-name{font-weight:600}
.ms-tbl .ms-bar-cell{width:120px;padding-right:14px}
.ms-bar{height:7px;background:var(--soft);overflow:hidden}
.ms-fill{height:100%}
.ms-fill.done{background:var(--done)}
.ms-fill.wip{background:var(--gold)}
.tag{display:inline-block;font-size:9px;letter-spacing:.1em;text-transform:uppercase;
  font-weight:800;padding:3px 8px;line-height:1;white-space:nowrap}
.tag.done{background:var(--done);color:#fff}
.tag.wip{color:var(--doing);border:1.5px solid var(--doing)}
.tag.next{color:var(--next);border:1.5px solid var(--next)}
.tk-tbl{width:100%;border-collapse:collapse;font-size:13px}
.tk-tbl th{font-size:9px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;
  color:var(--ink-3);padding:8px 12px 8px 0;text-align:left;border-bottom:1.5px solid var(--rule)}
.tk-tbl td{padding:12px 12px 12px 0;border-bottom:1px solid var(--soft);vertical-align:middle}
.tk-tbl tr:last-child td{border-bottom:none}
.tk-tbl .tk-num{font-weight:800;color:var(--ink-3);text-align:center;width:28px;font-size:12px}
.tk-pri{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);padding-left:16px!important}
.chk{color:var(--done);font-weight:900;font-size:15px;text-align:center;width:28px}
.ask-row{display:flex;gap:16px;margin-bottom:8px;font-size:13px}
.ask-label{font-weight:700;min-width:176px}
.ask-detail{color:var(--ink-2)}
.notes{background:var(--wash);border:1.5px solid var(--rule);padding:14px 18px;font-size:13px;
  color:var(--ink-2);line-height:1.5}
.ftr{margin-top:32px;padding-top:12px;border-top:1.5px solid var(--rule);
  font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);font-weight:700;
  display:flex;justify-content:space-between}
.preview-banner{background:var(--gold);color:#fff;text-align:center;font-size:11px;
  letter-spacing:.18em;text-transform:uppercase;font-weight:800;padding:8px}
@media print{
  body{background:#fff}
  .page{padding:24px;max-width:none}
}
@media(max-width:600px){
  .page{padding:24px 18px}
  .hdr{flex-direction:column;gap:12px}
  .hdr-right{text-align:left}
}
`;

function renderHeader(week) {
  const left = week.logoUrl
    ? `<div style="display:flex;align-items:center;gap:14px"><img src="${escapeHtml(week.logoUrl)}" alt="${escapeHtml(week.clientName)}" style="height:44px;width:auto"><h1>${escapeHtml(week.headline || week.clientName)}</h1></div>
    <p></p>`
    : `<h1>${escapeHtml(week.headline || week.clientName)}</h1>
    <p></p>`;
  const links = (week.links || [])
    .map(
      (l, i) =>
        `<a href="${escapeHtml(l.url)}" style="color:var(--gold);text-decoration:none${i > 0 ? ';font-size:12px;margin-left:8px' : ''}">${escapeHtml(l.label)} &rarr;</a>`
    )
    .join('\n    ');
  return `<div class="hdr">
  <div class="hdr-left">
    ${left}
  </div>
  <div class="hdr-right">
    <strong>${escapeHtml(week.headerLine)}</strong><br>
    Week ${Number(week.weekNumber) || 1} &middot; ${escapeHtml(week.dateLabel)}<br>
    ${links}
  </div>
</div>`;
}

// Week nav: archived weeks link to /{client}/week-N/ (static folders for old
// weeks, this same renderer for newer ones), the current week links to /{client}/.
function renderWeekNav(week, latestWeekNumber) {
  const total = Math.max(Number(latestWeekNumber) || 0, Number(week.weekNumber) || 1);
  if (total < 2) return '';
  const items = [];
  for (let n = 1; n <= total; n++) {
    const isActive = n === week.weekNumber;
    const href = n === total ? `/${week.client}/` : `/${week.client}/week-${n}/`;
    const style = isActive
      ? 'color:var(--ink);text-decoration:none;padding:5px 10px;border:1.5px solid var(--ink);font-weight:800'
      : 'color:var(--ink-3);text-decoration:none;padding:5px 10px;border:1.5px solid var(--rule)';
    items.push(`<a href="${href}" style="${style}">Week ${n}</a>`);
  }
  return `<div style="display:flex;gap:10px;margin-bottom:28px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--ink-3);flex-wrap:wrap">
  ${items.join('\n  ')}
</div>`;
}

function renderMilestones(week) {
  if (!week.milestones || week.milestones.length === 0) return '';
  const rows = week.milestones
    .map((m, i) => {
      const cls = statusClass(m.status);
      const pct = Math.max(0, Math.min(100, Number(m.progress) || 0));
      return `    <tr><td class="ms-num">${i + 1}</td><td class="ms-name">${escapeHtml(m.name)}</td><td class="ms-bar-cell"><div class="ms-bar"><div class="ms-fill ${cls === 'next' ? '' : cls}" style="width:${pct}%"></div></div></td><td><span class="tag ${cls}">${escapeHtml(m.statusLabel)}</span></td></tr>`;
    })
    .join('\n');
  return `<div class="sec">
  <div class="sec-title">Project Milestones</div>
  <table class="ms-tbl">
    <tr><th class="ms-num">#</th><th>Milestone</th><th>Progress</th><th>Status</th></tr>
${rows}
  </table>
</div>`;
}

function renderTasks(week) {
  if (!week.tasks || week.tasks.length === 0) return '';
  const rows = week.tasks
    .map((t, i) => {
      const cls = statusClass(t.status);
      const chk = cls === 'done' ? '&check;' : '';
      return `    <tr><td class="tk-num">${i + 1}</td><td>${escapeHtml(t.text)}</td><td><span class="tag ${cls}">${escapeHtml(t.statusLabel)}</span></td><td class="tk-pri">${escapeHtml(t.priority)}</td><td class="chk">${chk}</td></tr>`;
    })
    .join('\n');
  return `<div class="sec">
  <div class="sec-title">This Week&rsquo;s Tasks</div>
  <table class="tk-tbl">
    <tr><th class="tk-num">#</th><th>Task</th><th>Status</th><th>Pri</th><th></th></tr>
${rows}
  </table>
</div>`;
}

function renderAsks(week) {
  if (!week.asks || week.asks.length === 0) return '';
  const rows = week.asks
    .map(
      (a) =>
        `  <div class="ask-row"><span class="ask-label">${escapeHtml(a.label)}</span><span class="ask-detail">${escapeHtml(a.detail)}</span></div>`
    )
    .join('\n');
  return `<div class="sec">
  <div class="sec-title">What We Need From You</div>
${rows}
</div>`;
}

function renderNotes(week) {
  if (!week.notes || !String(week.notes).trim()) return '';
  return `<div class="sec">
  <div class="notes">${escapeHtml(week.notes)}</div>
</div>`;
}

export function renderReportHtml(week, { latestWeekNumber, preview = false } = {}) {
  const banner = preview
    ? `<div class="preview-banner">Preview &mdash; this week has not been sent</div>`
    : '';
  const robots = preview ? `\n<meta name="robots" content="noindex">` : '';
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">${robots}
<title>${escapeHtml(week.clientName)}: Week ${Number(week.weekNumber) || 1}</title>
<style>${CSS}</style>
${banner}
<div class="page">

${renderHeader(week)}

${renderWeekNav(week, latestWeekNumber)}

${renderMilestones(week)}

${renderTasks(week)}

${renderAsks(week)}

${renderNotes(week)}

<div class="ftr">
  <span>Ahead of Market</span>
  <span>${escapeHtml(week.footerNote || 'Back next week with more')}</span>
</div>

</div>
</html>`;
}

// Shown at /{client} before the first week has been published.
export function renderPlaceholderHtml(clientName) {
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(clientName)} &times; Ahead of Market</title>
<style>${CSS}</style>
<div class="page" style="padding-top:120px;text-align:center">
  <h1 style="font-family:'Druk Cond',ui-sans-serif,sans-serif;text-transform:uppercase;font-weight:400;font-size:64px;line-height:.9">${escapeHtml(clientName)}</h1>
  <p style="margin-top:16px;font-size:13px;color:var(--ink-2)">First weekly update lands Friday.</p>
  <div class="ftr" style="margin-top:80px"><span>Ahead of Market</span><span>Weekly client reports</span></div>
</div>
</html>`;
}
