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

  const host = document.getElementById('app-host');
  if (!host) { console.warn('no #app-host'); return; }

  const SS = window.SS;
  const day = () => window.CURRICULUM.monday;

  // ---- side rail (always visible on desktop) ----
  let rail = document.getElementById('ss-rail');
  if (!rail) {
    rail = document.createElement('aside');
    rail.id = 'ss-rail';
    rail.className = 'ss-rail';
    document.body.appendChild(rail);
  }

  function renderRail() {
    // Only show the rail when INSIDE a block (hub already shows everything)
    if (currentBlockIdx < 0) { rail.style.display = 'none'; return; }
    rail.style.display = '';

    const d = day();
    const blocks = d.blocks;
    const doneCount = SS ? SS.dayProgress() : 0;
    const pct = Math.round((doneCount / blocks.length) * 100);

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
    const renderBlockCard = (b, idx) => {
      const done = SS && SS.isBlockDone(b.id);
      const isNext = idx === nextIdx;
      const locked = !done && !isNext;  // future blocks are visible but locked
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
