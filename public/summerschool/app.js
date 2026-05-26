/* Summer School — orchestrator
 * Replaces the old per-screen routing with a day-plan-driven router.
 * Renders the Hub (block list) or a single block module into #app-host.
 */

(function () {
  'use strict';

  // ?reset=1 → wipe all state and reload clean.
  // Parent hits the URL once on the kid's device to start fresh.
  if (new URLSearchParams(window.location.search).has('reset')) {
    try {
      localStorage.removeItem('ss-state-v1');
      localStorage.removeItem('ss-dict-cache-v1');
    } catch (e) {}
    // strip the query and reload so the kid sees the clean URL
    window.location.replace(window.location.pathname);
    return;
  }

  // Star system retired 2026-05-26 (Patrik): the ?fix-stars / hash-fix-stars
  // URL handlers + lastSeenStars shadow tracking are gone. Old links land on
  // the hub as if they were no-ops, which is the desired behavior.

  // ?seed-done=N → backfill the first N module blocks as done. Used after
  // localStorage gets wiped (origin mismatch, Safari evicted, etc) so we
  // can put Ethan back at "done with the morning's 41 modules" without
  // making him redo them. Skips the welcome block (auto-counts as well).
  // Reload clean afterward.
  {
    const seed = new URLSearchParams(window.location.search).get('seed-done');
    if (seed !== null) {
      const n = parseInt(seed, 10);
      if (!Number.isNaN(n) && n >= 0) {
        try {
          const todayDay = (() => {
            const forced = new URLSearchParams(window.location.search).get('day');
            if (forced && window.CURRICULUM && window.CURRICULUM[forced]) return window.CURRICULUM[forced];
            const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
            const t = DAY_NAMES[new Date().getDay()];
            return (window.CURRICULUM && window.CURRICULUM[t]) || (window.CURRICULUM && window.CURRICULUM.tuesday);
          })();
          if (todayDay && Array.isArray(todayDay.blocks)) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const raw = localStorage.getItem('ss-state-v1');
            const s = raw ? JSON.parse(raw) : {};
            s.days = s.days || {};
            s.days[todayStr] = s.days[todayStr] || { completedBlocks: [], blockData: {}, blockMetrics: {} };
            const d = s.days[todayStr];
            d.completedBlocks = d.completedBlocks || [];
            d.blockMetrics = d.blockMetrics || {};
            // Mark the first N blocks as done (in curriculum order). Include
            // welcome — total is N blocks counted from the top.
            let marked = 0;
            for (let i = 0; i < todayDay.blocks.length && marked < n; i++) {
              const b = todayDay.blocks[i];
              if (!d.completedBlocks.includes(b.id)) d.completedBlocks.push(b.id);
              if (!d.blockMetrics[b.id]) d.blockMetrics[b.id] = { startedAt: Date.now() - 60000, completedAt: Date.now(), durationMs: 60000, opens: 1 };
              marked++;
            }
            localStorage.setItem('ss-state-v1', JSON.stringify(s));
          }
        } catch (e) { console.warn('[SS] seed-done failed', e); }
      }
      window.location.replace(window.location.pathname);
      return;
    }
  }

  // ?admin=1 → inline state inspector. Star setters retired 2026-05-26 with
  // the gold-star system itself. Kept the panel as a read-only diagnostic
  // for the rest of state (modules done, streak, origin, blocks today).
  if (new URLSearchParams(window.location.search).has('admin')) {
    const raw = localStorage.getItem('ss-state-v1');
    const s = raw ? JSON.parse(raw) : { days: {}, streak: 0 };
    const todayStr = new Date().toISOString().slice(0, 10);
    const d = (s.days && s.days[todayStr]) || { completedBlocks: [], blockMetrics: {} };
    const completedCount = (d.completedBlocks || []).length;
    const origin = window.location.origin;

    document.body.innerHTML = '';
    document.body.style.background = '#F5EFE5';
    document.body.style.fontFamily = "'Fraunces', 'Times New Roman', serif";
    const wrap = document.createElement('div');
    wrap.style.cssText = 'max-width: 520px; margin: 24px auto; padding: 24px; background: #FFF; border-radius: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.08);';
    wrap.innerHTML = `
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #C8932E; margin-bottom: 8px;">Summer School · Admin</div>
      <h1 style="font-size: 28px; line-height: 1.15; font-weight: 500; margin: 0 0 16px;">Ethan's state</h1>

      <div style="background: #F5EFE5; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px;">
        <div style="display:flex; justify-content: space-between; padding: 6px 0; font-size: 15px;">
          <span style="color: #6B6B6B;">Origin (THIS device)</span><span style="font-family: 'Geist', system-ui, sans-serif; font-size: 13px;">${origin}</span>
        </div>
        <div style="display:flex; justify-content: space-between; padding: 6px 0; font-size: 15px;">
          <span style="color: #6B6B6B;">Modules done today</span><strong>${completedCount}</strong>
        </div>
        <div style="display:flex; justify-content: space-between; padding: 6px 0; font-size: 15px;">
          <span style="color: #6B6B6B;">Streak</span><span>${s.streak || 0} days</span>
        </div>
      </div>

      <a href="/summerschool/?day=tuesday" style="display: inline-block; background: #1A1814; color: #F5EFE5; padding: 12px 22px; border-radius: 999px; text-decoration: none; font-weight: 600;">Open Summer School →</a>
    `;
    document.body.appendChild(wrap);
    return;
  }

// ?report=1 → progress report. Patrik's morning glance at how Ethan did.
  // Shows today's blocks, time per block, stars earned, feedback sent to Dad.
  if (new URLSearchParams(window.location.search).has('report')) {
    const raw = localStorage.getItem('ss-state-v1');
    const s = raw ? JSON.parse(raw) : { goldStars: 0, streak: 0, days: {}, writingPieces: [], artifacts: [] };
    const todayStr = new Date().toISOString().slice(0, 10);
    const d = (s.days && s.days[todayStr]) || { completedBlocks: [], blockMetrics: {}, blockData: {} };
    const blockMeta = (window.CURRICULUM && (window.CURRICULUM.tuesday || window.CURRICULUM.monday)) || {};
    const blockTitleById = (id) => {
      for (const k of Object.keys(window.CURRICULUM || {})) {
        const day = window.CURRICULUM[k];
        if (day && day.blocks) {
          const m = day.blocks.find(b => b.id === id);
          if (m) return m.title;
        }
      }
      return id;
    };
    const fmtMs = (ms) => {
      if (!ms || ms < 0) return '—';
      const s = Math.round(ms / 1000);
      if (s < 60) return s + 's';
      const m = Math.floor(s / 60); const r = s % 60;
      return `${m}m ${r}s`;
    };
    const totalMs = Object.values(d.blockMetrics || {}).reduce((a, m) => a + (m.durationMs || 0), 0);
    const fb = JSON.parse(localStorage.getItem('ss-dad-feedback') || '[]');
    document.body.innerHTML = `
      <div style="max-width: 820px; margin: 32px auto; padding: 24px; font-family: 'Geist', system-ui, sans-serif; background: #FBF7EE; border-radius: 14px;">
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom: 20px;">
          <h1 style="font-family: 'Fraunces', serif; font-weight: 500; font-size: 36px; margin: 0;">Today's report</h1>
          <div style="font-size: 12px; color: #9A9388; letter-spacing: 0.1em; text-transform: uppercase;">${todayStr}</div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
          <div style="background: #FFF; border-radius: 12px; padding: 16px;"><div style="font-size: 11px; color: #9A9388; letter-spacing: 0.1em; text-transform: uppercase;">Modules done</div><div style="font-family: 'Fraunces', serif; font-size: 30px;">${d.completedBlocks.length}</div></div>
          <div style="background: #FFF; border-radius: 12px; padding: 16px;"><div style="font-size: 11px; color: #9A9388; letter-spacing: 0.1em; text-transform: uppercase;">Time on task</div><div style="font-family: 'Fraunces', serif; font-size: 30px;">${fmtMs(totalMs)}</div></div>
          <div style="background: #FFF; border-radius: 12px; padding: 16px;"><div style="font-size: 11px; color: #9A9388; letter-spacing: 0.1em; text-transform: uppercase;">Streak</div><div style="font-family: 'Fraunces', serif; font-size: 30px;">${s.streak || 0}</div></div>
        </div>

        <div style="background: #FFF; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #9A9388; margin-bottom: 12px;">Block-by-block</div>
          ${(d.completedBlocks || []).map(id => {
            const m = (d.blockMetrics || {})[id] || {};
            const dat = (d.blockData || {})[id];
            return `
              <div style="display:flex; justify-content:space-between; padding: 10px 0; border-bottom: 1px solid rgba(26,24,20,0.06); font-family: 'Fraunces', serif; font-size: 16px;">
                <div>
                  <div>${blockTitleById(id)}</div>
                  ${dat ? `<div style="font-size: 12px; color: #9A9388; font-family: 'Geist', system-ui, sans-serif; margin-top: 2px;">${typeof dat === 'object' ? Object.entries(dat).map(([k,v]) => `${k}: ${v}`).join(' · ') : String(dat)}</div>` : ''}
                </div>
                <div style="font-size: 14px; color: #5A554C; font-family: 'Geist', system-ui, sans-serif;">${fmtMs(m.durationMs)}${(m.opens && m.opens > 1) ? ` · opened ${m.opens}×` : ''}</div>
              </div>
            `;
          }).join('') || '<div style="color:#9A9388; font-style:italic;">No blocks completed yet today.</div>'}
        </div>

        ${fb.length ? `
          <div style="background: #FFF; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #9A9388; margin-bottom: 12px;">Tell-Dad messages (${fb.length})</div>
            ${fb.slice(-5).reverse().map(f => `
              <div style="background:#F5EFE5; border-left: 3px solid #E8A03A; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 8px;">
                <div style="font-size: 11px; color:#9A9388; margin-bottom: 4px;">${new Date(f.at).toLocaleString()}${f.block ? ' · ' + f.block : ''}</div>
                <div style="font-family: 'Fraunces', serif; font-size: 15px; white-space: pre-wrap;">${(f.text || '').replace(/</g,'&lt;')}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex; gap: 12px;">
          <a href="/summerschool/" style="background: #1A1814; color: #F5EFE5; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 600;">Back to summer school</a>
          <a href="/summerschool/?dad=1" style="background: transparent; border: 1.5px solid rgba(26,24,20,0.18); padding: 10px 20px; border-radius: 999px; text-decoration: none; color: inherit; font-weight: 600;">Tell-Dad inbox</a>
        </div>
      </div>
    `;
    return;
  }

  // ?dad=1 → Dad-mode admin view: show all fix-feedback Ethan has sent
  if (new URLSearchParams(window.location.search).has('dad')) {
    const feedback = JSON.parse(localStorage.getItem('ss-dad-feedback') || '[]');
    document.body.innerHTML = `
      <div style="max-width: 720px; margin: 40px auto; padding: 24px; font-family: 'Geist', system-ui, sans-serif; background: #FBF7EE; border-radius: 14px;">
        <h1 style="font-family: 'Fraunces', serif; font-weight: 500; font-size: 36px; margin-bottom: 8px;">Dad mode</h1>
        <div style="color: #5A554C; margin-bottom: 24px;">${feedback.length} fix${feedback.length === 1 ? '' : 'es'} from Ethan.</div>
        ${feedback.length === 0 ? '<div style="color: #9A9388; font-style: italic;">Nothing yet.</div>' : ''}
        ${feedback.slice().reverse().map(f => `
          <div style="background: #F5EFE5; border-left: 3px solid #E8A03A; border-radius: 0 14px 14px 0; padding: 16px 20px; margin-bottom: 12px;">
            <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #9A9388; margin-bottom: 8px;">${new Date(f.at).toLocaleString()}${f.block ? ' · on block ' + f.block : ''}</div>
            <div style="font-family: 'Fraunces', serif; font-size: 17px; line-height: 1.5; color: #1A1814; white-space: pre-wrap;">${(f.text || '').replace(/</g, '&lt;')}</div>
          </div>
        `).join('')}
        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <button onclick="if(confirm('Clear all feedback?')){localStorage.removeItem('ss-dad-feedback');location.reload();}" style="background: transparent; border: 1.5px solid rgba(26,24,20,0.18); padding: 10px 20px; border-radius: 999px; font-family: inherit; font-weight: 600; cursor: pointer;">Clear all</button>
          <a href="/summerschool/" style="background: #1A1814; color: #F5EFE5; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 600;">Back to summer school</a>
        </div>
      </div>
    `;
    return;
  }

  const host = document.getElementById('app-host');
  if (!host) { console.warn('no #app-host'); return; }

  const SS = window.SS;

  // Day-of-week routing — picks today's curriculum, falls back to monday.
  // Override with ?day=tuesday for testing or previewing.
  // 2026-05-25: added tuesday (Robert Nay + 4-trick day). Wed-Fri queued.
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = () => {
    const forced = new URLSearchParams(window.location.search).get('day');
    if (forced && window.CURRICULUM && window.CURRICULUM[forced]) return window.CURRICULUM[forced];
    const today = DAY_NAMES[new Date().getDay()];
    if (window.CURRICULUM && window.CURRICULUM[today]) return window.CURRICULUM[today];
    return window.CURRICULUM.monday;
  };

  // ---- side rail — FAB by default, taps to expand ----
  // Ethan flagged: the always-on sidebar blocked activities. So the rail is
  // collapsed into a bottom-right floating button. Taps open the panel.
  let fab = document.getElementById('ss-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'ss-fab';
    fab.className = 'ss-fab';
    fab.setAttribute('aria-label', 'Open day plan');
    document.body.appendChild(fab);
  }
  let backdrop = document.getElementById('ss-fab-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'ss-fab-backdrop';
    backdrop.className = 'ss-fab-backdrop';
    document.body.appendChild(backdrop);
  }
  let rail = document.getElementById('ss-rail');
  if (!rail) {
    rail = document.createElement('aside');
    rail.id = 'ss-rail';
    rail.className = 'ss-rail';
    document.body.appendChild(rail);
  }

  function toggleRail(open) {
    const next = open === undefined ? !rail.classList.contains('open') : open;
    rail.classList.toggle('open', next);
    backdrop.classList.toggle('open', next);
  }
  fab.addEventListener('click', () => toggleRail());
  backdrop.addEventListener('click', () => toggleRail(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { toggleRail(false); toggleDadChat(false); } });

  // ---- Tell-Dad FAB — bottom-left, opens a fix-feedback chat ----
  // Only allowed to chat about FIXES per Patrik's spec. Saves to localStorage;
  // Dad sees the list at /summerschool/?dad=1
  let dadFab = document.createElement('button');
  dadFab.id = 'ss-dad-fab';
  dadFab.className = 'ss-dad-fab';
  dadFab.setAttribute('aria-label', 'Send Dad a fix idea');
  dadFab.innerHTML = `<span class="dad-icon">💬</span><span class="dad-lbl">Tell Dad</span>`;
  document.body.appendChild(dadFab);

  let dadPanel = document.createElement('div');
  dadPanel.id = 'ss-dad-panel';
  dadPanel.className = 'ss-dad-panel';
  document.body.appendChild(dadPanel);

  function toggleDadChat(open) {
    const next = open === undefined ? !dadPanel.classList.contains('open') : open;
    if (next) renderDadPanel();
    dadPanel.classList.toggle('open', next);
    backdrop.classList.toggle('open', next || rail.classList.contains('open'));
  }

  function renderDadPanel() {
    const existing = JSON.parse(localStorage.getItem('ss-dad-feedback') || '[]');
    const blockTitle = currentBlockIdx >= 0 ? day().blocks[currentBlockIdx].title : 'on the hub';
    dadPanel.innerHTML = `
      <button class="ss-dad-close" aria-label="Close">×</button>
      <div class="ss-dad-head">
        <div class="ss-dad-eyebrow">Tell Dad</div>
        <div class="ss-dad-title">What's not working?</div>
        <div class="ss-dad-sub">Only for fixes — broken stuff, confusing stuff, ideas. Dad checks these.</div>
      </div>
      ${existing.length > 0 ? `<div class="ss-dad-recent">${existing.length} thing${existing.length === 1 ? '' : 's'} you've sent so far</div>` : ''}
      <textarea id="ss-dad-text" class="ss-dad-text" placeholder="What happened? What did you want it to do instead?"></textarea>
      <div class="ss-dad-context">Sending from: <strong>${blockTitle}</strong></div>
      <div class="ss-dad-actions">
        <button class="btn-secondary" id="ss-dad-cancel">Cancel</button>
        <button class="btn-amber" id="ss-dad-send">Send to Dad</button>
      </div>
      <div id="ss-dad-confirm" class="ss-dad-confirm"></div>
    `;
    dadPanel.querySelector('.ss-dad-close').onclick = () => toggleDadChat(false);
    dadPanel.querySelector('#ss-dad-cancel').onclick = () => toggleDadChat(false);
    dadPanel.querySelector('#ss-dad-send').onclick = async () => {
      const txt = dadPanel.querySelector('#ss-dad-text').value.trim();
      if (!txt) return;
      const blockTitle = currentBlockIdx >= 0 ? day().blocks[currentBlockIdx].title : 'hub';
      const entry = { at: new Date().toISOString(), text: txt, block: blockTitle, url: location.href };
      // Local mirror so Ethan sees his own history + survives offline
      const list = JSON.parse(localStorage.getItem('ss-dad-feedback') || '[]');
      list.push(entry);
      localStorage.setItem('ss-dad-feedback', JSON.stringify(list));

      // Stamp a stable visitor_id so all his messages thread together backend-side
      let vid = localStorage.getItem('ss-dad-visitor-id');
      if (!vid) {
        vid = 'ethan_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('ss-dad-visitor-id', vid);
      }

      const confirm = dadPanel.querySelector('#ss-dad-confirm');
      const sendBtn = dadPanel.querySelector('#ss-dad-send');
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';

      // POST to Corner embed pipeline — message lands in
      // aheadofmarket.com:summerschool mission room, EA picks it up
      try {
        const r = await fetch('/api/embed/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embed_id: 'emb_summerschool',
            visitor_id: vid,
            host_origin: location.origin,
            content: `[on block: ${blockTitle}]\n\n${txt}`
          })
        });
        if (r.ok) {
          confirm.textContent = 'Sent. Dad and the agent will see this.';
        } else {
          const err = await r.text();
          console.warn('embed/chat err', r.status, err);
          confirm.textContent = 'Saved here — couldn\'t reach Dad over the network. Try again later or just yell.';
        }
      } catch (e) {
        console.warn('embed/chat exception', e);
        confirm.textContent = 'Saved here — no network. Will reach Dad next time you\'re online.';
      }
      confirm.classList.add('show');
      dadPanel.querySelector('#ss-dad-text').value = '';
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send to Dad';
      setTimeout(() => toggleDadChat(false), 1600);
    };
    setTimeout(() => dadPanel.querySelector('#ss-dad-text')?.focus(), 50);
  }

  dadFab.addEventListener('click', () => { toggleRail(false); toggleDadChat(); });

  function renderRail() {
    const d = day();
    const blocks = d.blocks;
    const doneCount = SS ? SS.dayProgress() : 0;
    const pct = Math.round((doneCount / blocks.length) * 100);

    // FAB visible whenever inside a block; hidden on hub (hub already shows everything)
    if (currentBlockIdx < 0) {
      fab.style.display = 'none';
      backdrop.classList.remove('open');
      rail.classList.remove('open');
      return;
    }
    fab.style.display = 'flex';
    // FAB shows the current block number — at-a-glance progress
    fab.innerHTML = `
      <span class="fab-num">${currentBlockIdx + 1}</span>
      <span class="fab-lbl">/ ${blocks.length}</span>
    `;

    const currentLabel = `Block ${currentBlockIdx + 1} of ${blocks.length}`;
    const titleNow = blocks[currentBlockIdx].title;

    // recent done (last 3)
    const recentDone = [];
    for (let i = Math.max(0, (currentBlockIdx >= 0 ? currentBlockIdx : blocks.length) - 1); i >= 0 && recentDone.length < 3; i--) {
      if (SS && SS.isBlockDone(blocks[i].id)) recentDone.unshift({ idx: i, b: blocks[i] });
    }

    // next up (next 3 from current+1)
    const nextUp = [];
    const startIdx = currentBlockIdx >= 0 ? currentBlockIdx + 1 : (blocks.findIndex(b => !(SS && SS.isBlockDone(b.id))));
    for (let i = Math.max(0, startIdx); i < blocks.length && nextUp.length < 3; i++) {
      if (i === currentBlockIdx) continue;
      nextUp.push({ idx: i, b: blocks[i] });
    }

    rail.innerHTML = `
      <button class="ss-rail-close" aria-label="Close" id="rail-close">×</button>
      <div class="rail-progress">
        <div class="label">${currentLabel}</div>
        <div class="where">${titleNow}</div>
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
      </div>

      ${recentDone.length ? `
        <div class="rail-section">
          <div class="label">Just done</div>
          ${recentDone.map(r => `<div class="rail-item done"><span class="dot"></span><span>${r.b.title}</span></div>`).join('')}
        </div>
      ` : ''}

      ${currentBlockIdx >= 0 ? `
        <div class="rail-section">
          <div class="label">Now</div>
          <div class="rail-item now"><span class="dot"></span><span>${blocks[currentBlockIdx].title}</span></div>
        </div>
      ` : ''}

      ${nextUp.length ? `
        <div class="rail-section">
          <div class="label">Next up</div>
          ${nextUp.map(r => `<div class="rail-item"><span class="dot"></span><span>${r.b.title}</span></div>`).join('')}
        </div>
      ` : ''}

      <div class="rail-section">
        <div class="label">Today's theme</div>
        <div class="week-arc"><strong>${d.theme}</strong> · ${d.themeDesc}</div>
      </div>
    `;
    // wire the inline close button
    const closeBtn = rail.querySelector('#rail-close');
    if (closeBtn) closeBtn.onclick = () => toggleRail(false);
  }

  // ---- routing ----
  let currentBlockIdx = -1;  // -1 = hub

  function go(screen) {
    if (screen === 'hub') {
      currentBlockIdx = -1;
      window._ssActiveBlock = null;
      renderHub();
      renderRail();
      return;
    }
    if (typeof screen === 'number') {
      currentBlockIdx = screen;
      const b = day().blocks[screen];
      // Surface the active block id globally so SS.awardStar can dedupe
      // by (event, blockId) without every renderer threading it through.
      window._ssActiveBlock = b && b.id;
      if (b && SS && SS.startBlock) SS.startBlock(b.id);
      renderBlock(b);
      renderRail();
      return;
    }
    renderHub(); renderRail();
  }

  function next() {
    const blocks = day().blocks;
    // find next undone
    let n = currentBlockIdx + 1;
    while (n < blocks.length && SS && SS.isBlockDone(blocks[n].id)) n++;
    if (n >= blocks.length) {
      currentBlockIdx = -1;
      window._ssActiveBlock = null;
      renderHub();
      // celebrate
      if (SS) SS.awardStar('day-complete');
    } else {
      currentBlockIdx = n;
      const nextBlock = blocks[n];
      window._ssActiveBlock = nextBlock && nextBlock.id;
      if (nextBlock && SS && SS.startBlock) SS.startBlock(nextBlock.id);
      renderBlock(nextBlock);
    }
    renderRail();
  }

  window.SSRoute = { go, next };

  // ---- back button + data-go handler ----
  document.addEventListener('click', (e) => {
    const goEl = e.target.closest('[data-go]');
    if (goEl) { e.preventDefault(); go(goEl.dataset.go); return; }
    const backEl = e.target.closest('[data-back]');
    if (backEl) { e.preventDefault(); go('hub'); return; }
  });

  // Star system removed 2026-05-26 — Patrik: "jsut remove the stars" + "we
  // cant figure out a star system its kinda sad." Kept the listener as a
  // no-op for backwards compat in case anything still dispatches ss:star.
  // The real progress signals (modules done, time on task, fastest module,
  // streak) remain. No toasts, no counters, no reward bar.

  // ---- HUB render ----
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }

  function renderHub() {
    const d = day();
    const blocks = d.blocks;
    const doneCount = SS ? SS.dayProgress() : 0;
    const pct = Math.round((doneCount / blocks.length) * 100);
    const streak = SS ? SS.streak : 0;
    const stars = SS ? SS.goldStars : 0;
    const lastWrite = SS ? SS.latestWriting() : null;

    // split into Today's Class (topic) and Daily Drills (drill) but keep order
    const nextIdx = blocks.findIndex(x => !(SS && SS.isBlockDone(x.id)));
    // Strict sequential (2026-05-26 reshape). Only the next undone block is
    // tappable. Prior 3-block soft-skip allowed him to bypass content that
    // never got marked done — we caught a section he skipped Monday. Set
    // SKIP_WINDOW back to a small positive number ONLY after every block
    // type's forward "Continue" wiring is reliable on the live page.
    const SKIP_WINDOW = 0;
    const renderBlockCard = (b, idx) => {
      const done = SS && SS.isBlockDone(b.id);
      const isNext = idx === nextIdx;
      const inSkipWindow = nextIdx >= 0 && idx > nextIdx && idx <= nextIdx + SKIP_WINDOW;
      const locked = !done && !isNext && !inSkipWindow;
      const kindLabel = b.kind === 'topic' ? 'Today\'s Class' : 'Daily Drill';
      const kindCls = b.kind === 'topic' ? 'topic' : '';
      const cls = ['block-card', done && 'done', isNext && 'next', locked && 'locked'].filter(Boolean).join(' ');
      return `
        <button class="${cls}" data-block-idx="${idx}" ${locked ? 'disabled' : ''}>
          <div class="num">${locked ? '🔒' : String(idx + 1).padStart(2, '0')}</div>
          <div class="body">
            <div class="title">${b.title}</div>
            <div class="meta"><span class="kind ${kindCls}">${kindLabel}</span> · ${b.minutes} min${locked ? ' · locked' : ''}</div>
          </div>
          <div class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
        </button>
      `;
    };

    // Day picker — show days the curriculum has loaded.
    // Tap a day to switch (uses ?day=<name> URL). Active day highlighted.
    const availableDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      .filter(k => window.CURRICULUM && window.CURRICULUM[k]);
    const activeDay = (function () {
      const forced = new URLSearchParams(window.location.search).get('day');
      if (forced && window.CURRICULUM && window.CURRICULUM[forced]) return forced;
      const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const today = DAY_NAMES[new Date().getDay()];
      if (window.CURRICULUM && window.CURRICULUM[today]) return today;
      return 'monday';
    })();

    host.innerHTML = `
      <div class="top-rail">
        <span class="label">Today · ${d.theme}</span>
        <div class="meter"><div class="fill" style="width:${pct}%"></div></div>
        <span class="pct">${pct}%</span>
      </div>

      <div class="day-picker" style="display:flex; flex-wrap: wrap; gap: 8px; margin: var(--space-4) 0 var(--space-4);">
        ${availableDays.map(name => `
          <a href="?day=${name}" class="day-pill ${name === activeDay ? 'active' : ''}" style="
            padding: 8px 16px;
            border-radius: 999px;
            text-decoration: none;
            font-family: 'Geist', system-ui, sans-serif;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: ${name === activeDay ? 'var(--cream)' : 'var(--ink-soft)'};
            background: ${name === activeDay ? 'var(--ink)' : 'transparent'};
            border: 1.5px solid ${name === activeDay ? 'var(--ink)' : 'rgba(26,24,20,0.18)'};
          ">${name.slice(0, 3)}</a>
        `).join('')}
      </div>

      <div class="greeting-row">
        <h1>${greeting()}, ${SS ? SS.state.name : 'Ethan'}.</h1>
        <div class="right-stats">
          <div class="stat-pill"><div class="num">${doneCount}<span style="font-size:14px; color: var(--ink-quiet); font-weight: 400;"> / ${blocks.length}</span></div><div class="label">Modules Today</div></div>
          <div class="stat-pill"><div class="num">${streak}</div><div class="label">Day Streak</div></div>
        </div>
      </div>

      <div class="day-theme">Today's theme — <strong>${d.theme}</strong>. ${d.themeDesc}</div>

      ${lastWrite ? `
        <div class="yesterday-preview">
          <span class="label">Yesterday you wrote</span>
          "${lastWrite.body.slice(0, 120)}${lastWrite.body.length > 120 ? '…' : ''}"
        </div>
      ` : ''}

      <div class="section-label">${doneCount > 0 ? `${doneCount} done · ${blocks.length - doneCount} left` : `${blocks.length} modules today`}</div>
      <div class="block-list">
        ${(() => {
          // 2026-05-26 hub redesign: when there's a wall of done blocks,
          // collapse them into a single "✓ N done" pill so the next undone
          // block is the first thing he sees (not module 1 of 87).
          // The collapsed group expands on tap if he wants to scroll back.
          const cards = blocks.map((b, i) => ({ b, i, done: SS && SS.isBlockDone(b.id) }));
          // Find the first undone index — everything before that is "behind."
          const firstUndoneIdx = cards.findIndex(c => !c.done);
          const cutoff = firstUndoneIdx === -1 ? cards.length : firstUndoneIdx;
          const behind = cards.slice(0, cutoff);
          const ahead = cards.slice(cutoff);

          const behindCollapsed = behind.length >= 5
            ? `<button class="block-done-group" id="block-done-toggle" style="width:100%; text-align:left; background: rgba(45,107,60,0.08); border: 1px solid rgba(45,107,60,0.18); border-radius: var(--r-md); padding: var(--space-4) var(--space-5); margin-bottom: var(--space-3); cursor:pointer; display:flex; align-items:center; gap: var(--space-3); font-family: inherit;">
                <span style="font-size: 18px; color: #2D6B3C;">✓</span>
                <span style="flex:1; font-family: var(--font-serif); font-size: 17px;">${behind.length} done so far today</span>
                <span style="font-size: 12px; color: var(--ink-quiet);">tap to show</span>
              </button>
              <div class="block-done-expand" id="block-done-expand" style="display:none;">
                ${behind.map(c => renderBlockCard(c.b, c.i)).join('')}
              </div>`
            : behind.map(c => renderBlockCard(c.b, c.i)).join('');

          return behindCollapsed + ahead.map(c => renderBlockCard(c.b, c.i)).join('');
        })()}
      </div>
    `;

    // wire block-done-group toggle
    const toggle = host.querySelector('#block-done-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const exp = host.querySelector('#block-done-expand');
        if (!exp) return;
        const showing = exp.style.display !== 'none';
        exp.style.display = showing ? 'none' : 'block';
        toggle.querySelector('span:last-child').textContent = showing ? 'tap to show' : 'tap to hide';
      });
    }

    // wire block clicks
    host.querySelectorAll('[data-block-idx]').forEach(b => {
      b.addEventListener('click', () => {
        const idx = parseInt(b.dataset.blockIdx, 10);
        go(idx);
      });
    });
  }

  // ---- BLOCK render ----
  function renderBlock(block) {
    if (!block) { go('hub'); return; }
    const fn = window.SSMod[block.type];
    if (!fn) {
      host.innerHTML = `
        <div class="top-rail">
          <button class="back" data-back>← Back</button>
          <span class="label">Unknown block type</span>
        </div>
        <div style="padding: var(--space-7) var(--space-5); text-align: center;">
          <h2 style="font-family: var(--font-serif); font-size: 32px;">${block.title}</h2>
          <p style="color: var(--ink-soft); margin-top: var(--space-3);">Block type <code>${block.type}</code> isn't wired yet. Skipping.</p>
          <div class="center-actions" style="justify-content: center;">
            <button class="btn-primary" id="skip">Continue</button>
          </div>
        </div>
      `;
      host.querySelector('#skip').onclick = () => { if (SS) SS.completeBlock(block.id); next(); };
      return;
    }
    fn(host, block);
  }

  // ---- boot ----
  go('hub');
})();
