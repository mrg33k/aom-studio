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
  const day = () => window.CURRICULUM.monday;

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
    if (screen === 'hub') { currentBlockIdx = -1; renderHub(); renderRail(); return; }
    if (typeof screen === 'number') {
      currentBlockIdx = screen;
      renderBlock(day().blocks[screen]);
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
      renderHub();
      // celebrate
      if (SS) SS.awardStar('Day complete');
    } else {
      currentBlockIdx = n;
      renderBlock(blocks[n]);
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

  // ---- gold star earn animation ----
  window.addEventListener('ss:star', (e) => {
    const t = document.createElement('div');
    t.className = 'star-toast';
    t.innerHTML = `<span class="star">★</span><span class="msg"><b>+1 Gold Star</b> · ${e.detail.reason || 'nice'}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2200);

    // also tick the hub counter if it's visible
    const counter = document.querySelector('#hub-star-count');
    if (counter) counter.textContent = SS.goldStars;
  });

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
    // Soft lock: he can tap the next 3 unfinished blocks ahead. Lets him
    // skip past a bug / boring module while we fix. Blocks 4+ ahead stay
    // locked so he doesn't blow through the day randomly.
    const SKIP_WINDOW = 3;
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

    host.innerHTML = `
      <div class="top-rail">
        <span class="label">Today · ${d.theme}</span>
        <div class="meter"><div class="fill" style="width:${pct}%"></div></div>
        <span class="pct">${pct}%</span>
      </div>

      <div class="greeting-row">
        <h1>${greeting()}, ${SS ? SS.state.name : 'Ethan'}.</h1>
        <div class="right-stats">
          <div class="stat-pill"><div class="num"><span class="star">★</span> <span id="hub-star-count">${stars}</span></div><div class="label">Gold Stars</div></div>
          <div class="stat-pill"><div class="num">${streak}</div><div class="label">Day Streak</div></div>
        </div>
      </div>

      ${stars < 150 ? `
        <div class="reward-bar">
          <div class="reward-bar-label">
            <span class="reward-num">${stars}</span> of <strong>150 stars</strong> → <span class="reward-prize">a new game from GameStop</span>
          </div>
          <div class="reward-bar-track"><div class="reward-bar-fill" style="width: ${Math.min(100, (stars/150)*100)}%"></div></div>
        </div>
      ` : `
        <div class="reward-bar redeemed">
          <div class="reward-bar-label" style="text-align: center;">
            <strong style="color: var(--amber); font-size: 18px;">★ 150 stars earned. New game unlocked.</strong>
            <div style="margin-top: var(--space-2); font-size: 14px; color: var(--ink-soft);">Ask Mom or Dad about your GameStop trip.</div>
          </div>
        </div>
      `}

      <div class="day-theme">Today's theme — <strong>${d.theme}</strong>. ${d.themeDesc}</div>

      ${lastWrite ? `
        <div class="yesterday-preview">
          <span class="label">Yesterday you wrote</span>
          "${lastWrite.body.slice(0, 120)}${lastWrite.body.length > 120 ? '…' : ''}"
        </div>
      ` : ''}

      <div class="section-label">Today's plan — ${blocks.length} blocks, ${doneCount} done</div>
      <div class="block-list">
        ${blocks.map(renderBlockCard).join('')}
      </div>
    `;

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
