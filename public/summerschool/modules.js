/* Summer School — module implementations
 * Each render function takes a host element + the block config + day content,
 * builds the module's UI inside the host, wires events, returns nothing.
 * Modules call SS.completeBlock(blockId, data) when finished.
 */

window.SSMod = (function () {
  'use strict';

  // ============================================================
  // ANTI-COPY-PASTE GUARD (Patrik 2026-05-29 #4: "disable copy and paste
  // from the text you write, hes a smart kid")
  //
  // Two delegated document-level listeners installed once at module load:
  //   1. copy/cut on lesson text inside #app-host → blocked (he can't
  //      grab the prompt or concept body and paste it into the answer).
  //   2. paste into any textarea/input inside #app-host → blocked (so
  //      even if he copied from somewhere else, it won't paste in).
  // Allows: copy from his OWN typed textareas (so he can move text
  // between his answers if he wants); selection itself (so dictionary
  // tap-to-define still works); typing normally; backspace/delete.
  // ============================================================
  (function installNoCheating() {
    if (typeof document === 'undefined') return;
    if (document.__ssAntiCheatInstalled) return;
    document.__ssAntiCheatInstalled = true;

    const blockOnLessonText = (e) => {
      const t = e.target;
      // Copying FROM his own typed answer is fine.
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
      // If the selection is inside the lesson host, block.
      const host = document.getElementById('app-host');
      if (!host) return;
      const sel = window.getSelection ? window.getSelection() : null;
      let node = (sel && sel.anchorNode) || t;
      while (node) {
        if (node === host) { e.preventDefault(); return; }
        node = node.parentNode;
      }
    };
    document.addEventListener('copy', blockOnLessonText);
    document.addEventListener('cut', blockOnLessonText);

    document.addEventListener('paste', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.tagName !== 'TEXTAREA' && t.tagName !== 'INPUT') return;
      // Walk up to confirm we're inside the lesson host (Friday + Tue + Wed
      // all live inside #app-host).
      const host = document.getElementById('app-host');
      if (!host) return;
      let node = t;
      while (node) {
        if (node === host) { e.preventDefault(); return; }
        node = node.parentNode;
      }
    });

    // Disable drag-and-drop into textareas/inputs — same exploit as paste.
    document.addEventListener('drop', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') {
        const host = document.getElementById('app-host');
        if (!host) return;
        let node = t;
        while (node) {
          if (node === host) { e.preventDefault(); return; }
          node = node.parentNode;
        }
      }
    });
  })();

  // Day-of-week routing — keep in sync with app.js. Picks today's curriculum;
  // ?day=<name> in URL overrides for preview. Fallback to monday.
  const DAY_NAMES_MOD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = () => {
    const forced = new URLSearchParams(window.location.search).get('day');
    if (forced && window.CURRICULUM && window.CURRICULUM[forced]) return window.CURRICULUM[forced];
    const today = DAY_NAMES_MOD[new Date().getDay()];
    if (window.CURRICULUM && window.CURRICULUM[today]) return window.CURRICULUM[today];
    return window.CURRICULUM.monday;
  };

  // helper: element creator
  function el(tag, props = {}, html) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    if (props.style && typeof props.style === 'object') Object.assign(e.style, props.style);
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function moduleHead(eyebrow, title) {
    return `<div class="module-head">
      <div class="eyebrow">${eyebrow}</div>
      <h2>${title}</h2>
    </div>`;
  }

  function topRail(progress, pct, withBack = true) {
    return `<div class="top-rail">
      ${withBack ? '<button class="back" data-back><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Today</button>' : '<span class="label">Today</span>'}
      <div class="meter"><div class="fill" style="width:${progress}%"></div></div>
      <span class="pct">${pct}</span>
    </div>`;
  }

  function complete(blockId, data) {
    if (window.SS) window.SS.completeBlock(blockId, data);
    window.SSRoute.next();
  }

  // Tracks the currently rendered block's minute budget so complete() can
  // judge "was that fast?" without every renderer threading it through.
  let _activeBlockBudgetMin = 6;
  let _timerInterval = null;

  // ============================================================
  // PER-MODULE TIMER
  // Renders a small countdown pill in the top rail. When it hits zero,
  // automatically adds +2 minutes and shows a quiet "take your time" toast.
  // Keeps Ethan focused without punishing him.
  // ============================================================
  function startBlockTimer(host, block) {
    _activeBlockBudgetMin = block.minutes || 6;
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    let remaining = (block.minutes || 6) * 60;
    let extended = false;

    // Inject a timer pill into the top rail if one isn't there yet.
    const ensurePill = () => {
      const rail = host.querySelector('.top-rail');
      if (!rail) return null;
      let pill = rail.querySelector('.timer-pill');
      if (!pill) {
        pill = document.createElement('span');
        pill.className = 'timer-pill';
        rail.appendChild(pill);
      }
      return pill;
    };

    const render = () => {
      const pill = ensurePill();
      if (!pill) return;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      pill.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      pill.classList.toggle('timer-low', remaining > 0 && remaining < 30);
      pill.classList.toggle('timer-extended', extended);
    };

    const tick = () => {
      remaining = Math.max(0, remaining - 1);
      render();
      if (remaining === 0 && !extended) {
        extended = true;
        remaining = 120;
        render();
        showToast('Take your time — added 2 minutes.', { kind: 'gentle' });
      }
      if (remaining === 0 && extended) {
        clearInterval(_timerInterval);
        _timerInterval = null;
      }
    };

    render();
    _timerInterval = setInterval(tick, 1000);
  }

  function showToast(msg, opts) {
    const t = document.createElement('div');
    t.className = 'ss-toast ' + (opts && opts.kind === 'gentle' ? 'ss-toast-gentle' : 'ss-toast-default');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2800);
  }

  // ============================================================
  // CONCEPT — micro-module renderer
  // Lightweight card: eyebrow + title + body paragraphs + optional reveal +
  // sticky Continue button. Powers most of the 40 per-day atomic modules
  // without rewriting the bigger renderers (mathlesson, reading, etc.).
  //
  // Block shape:
  //   { id, kind:'topic', type:'concept', minutes,
  //     subject:'Reading'|'Math'|'Roblox'|'Pitch'|...,
  //     tag: 'Reading · 01 of 10',          // small eyebrow line
  //     title: 'The Spine Words trick',
  //     body: ['paragraph 1', 'paragraph 2'],
  //     reveal: { prompt, answer },         // optional "show the answer" expander
  //     cta: 'Got it'                       // button label (defaults to "Continue")
  //   }
  // ============================================================
  function concept(host, block) {
    const tag = block.tag || (block.subject || '');
    const title = block.title || '';
    const bodyHtml = (Array.isArray(block.body) ? block.body : [block.body])
      .filter(Boolean)
      .map(p => `<p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.55; margin: 0 0 var(--space-3) 0;">${p}</p>`)
      .join('');
    const revealHtml = (block.reveal && block.reveal.prompt) ? `
      <div class="passage" style="background: #FFF; border: 1px solid rgba(26,24,20,0.10); border-radius: var(--r-md); padding: var(--space-5); margin-bottom: var(--space-4);">
        <p data-dict style="font-family: var(--font-serif); font-size: 17px; line-height: 1.45; margin: 0 0 var(--space-3) 0;">${block.reveal.prompt}</p>
        <details>
          <summary style="cursor: pointer; font-size: 13px; color: var(--amber); font-weight: 600;">Show the answer</summary>
          <p style="margin-top: var(--space-2); font-size: 16px; color: var(--ink-soft); font-style: italic; font-family: var(--font-serif); line-height: 1.5;">${block.reveal.answer || ''}</p>
        </details>
      </div>
    ` : '';
    // 2026-05-26 engagement gate (Patrik): every concept card now requires a
    // gate before Continue unlocks. Forces actual engagement instead of
    // speed-tapping through.
    //
    // 2026-05-29 Patrik update: kill multiple choice — have him type the
    // answer. A typed gate is used when block.typedCheck is present
    // (Friday curriculum) — char count + spell-check gate, same logic as
    // teach-back. Falls back to the old multi-choice gate when
    // block.check.choices is present (Tuesday/Wednesday — unchanged).
    const hasTypedCheck = block.typedCheck && block.typedCheck.q;
    const hasCheck = !hasTypedCheck && block.check && Array.isArray(block.check.choices) && block.check.choices.length >= 2;
    const typedCheckMin = (block.typedCheck && block.typedCheck.minChars) || 60;
    const typedCheckHtml = hasTypedCheck ? `
      <div class="concept-check" id="concept-check" style="background: #FFF; border: 1px solid rgba(26,24,20,0.12); border-radius: var(--r-md); padding: var(--space-5); margin-bottom: var(--space-4);">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Type the answer</div>
        <div style="font-family: var(--font-serif); font-size: 17px; line-height: 1.45; margin-bottom: var(--space-3);">${block.typedCheck.q}</div>
        <textarea id="concept-typed" rows="3" placeholder="Type a sentence or two in your own words..." style="width:100%; box-sizing:border-box; border:1px solid rgba(26,24,20,0.12); border-radius:var(--r-sm); padding:var(--space-3); font-family:'Geist',system-ui,sans-serif; font-size:15px; line-height:1.5; color:var(--ink); background:#FBFAF6; outline:none; resize:vertical; min-height:90px;"></textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); margin-top:var(--space-2); font-size:13px; font-family:'Geist',system-ui,sans-serif;">
          <div id="concept-typed-counter" style="color:var(--ink-quiet);">0 / ${typedCheckMin} characters</div>
          <div id="concept-typed-spell" style="color:var(--ink-quiet);">Spelling: will check at the word count</div>
        </div>
        <div id="concept-typed-words" style="display:none; background:#FFF6E5; border:1px solid #E5B947; border-radius:var(--r-sm); padding:var(--space-3); margin-top:var(--space-2);">
          <div style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#8B5E14; margin-bottom:var(--space-2);">Spelling — fix these</div>
          <div id="concept-typed-list" style="font-family:'Geist',system-ui,sans-serif; font-size:14px; line-height:1.7; color:var(--ink);"></div>
          <div style="margin-top:var(--space-1); font-size:12px; color:var(--ink-quiet);">Tap a word to mark it as a name or special word.</div>
        </div>
      </div>
    ` : '';
    const checkHtml = hasCheck ? `
      <div class="concept-check" id="concept-check" style="background: #FFF; border: 1px solid rgba(26,24,20,0.12); border-radius: var(--r-md); padding: var(--space-5); margin-bottom: var(--space-4);">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Did it land?</div>
        <div style="font-family: var(--font-serif); font-size: 17px; line-height: 1.45; margin-bottom: var(--space-3);">${block.check.q}</div>
        <div class="q-choices" style="display: flex; flex-direction: column; gap: var(--space-2);">
          ${block.check.choices.map((c, i) => `<button class="q-choice" data-i="${i}">${c}</button>`).join('')}
        </div>
        <div id="concept-check-feedback" style="margin-top: var(--space-3); font-size: 14px; font-family: var(--font-serif); color: var(--ink-quiet); min-height: 1.2em;"></div>
      </div>
    ` : '';

    const gateLocked = hasCheck || hasTypedCheck;
    const initialBtnText = hasTypedCheck
      ? `Type ${typedCheckMin} characters to continue`
      : (hasCheck ? 'Answer the check first' : (block.cta || 'Continue'));

    host.innerHTML = `
      ${topRail(0, tag)}
      ${moduleHead(block.subject || 'Today', title)}
      <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">
        <div class="passage" data-dict style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-bottom: var(--space-4); box-shadow: var(--shadow-card);">
          ${bodyHtml}
        </div>
        ${revealHtml}
        ${typedCheckHtml}
        ${checkHtml}
        <div class="center-actions">
          <button class="btn-primary" id="concept-go"${gateLocked ? ' disabled style="opacity:0.5;"' : ''}>${initialBtnText}</button>
        </div>
      </div>
    `;
    startBlockTimer(host, block);

    if (hasTypedCheck) {
      const goBtn = host.querySelector('#concept-go');
      const ta = host.querySelector('#concept-typed');
      const counter = host.querySelector('#concept-typed-counter');
      const spellStatus = host.querySelector('#concept-typed-spell');
      const spellBox = host.querySelector('#concept-typed-words');
      const spellList = host.querySelector('#concept-typed-list');
      const userMarkedOK = new Set();
      let refreshSeq = 0;

      function renderSuspects(suspects) {
        if (suspects.length === 0) {
          goBtn.disabled = false;
          goBtn.style.opacity = '1';
          goBtn.textContent = block.cta || 'Continue';
          spellBox.style.display = 'none';
          spellStatus.textContent = 'Spelling: clean';
          spellStatus.style.color = '#2D6B3C';
        } else {
          goBtn.disabled = true;
          goBtn.style.opacity = '0.5';
          goBtn.textContent = `Fix ${suspects.length} spelling${suspects.length === 1 ? '' : 's'}`;
          spellBox.style.display = 'block';
          spellStatus.textContent = `Spelling: ${suspects.length} word${suspects.length === 1 ? '' : 's'} to check`;
          spellStatus.style.color = '#8B5E14';
          spellList.innerHTML = suspects.map(w => `
            <span style="display:inline-flex; align-items:center; gap:4px; background:#FFE8B0; padding:4px 10px; border-radius:999px; margin:3px 4px 3px 0; font-weight:600;">
              ${w}
              <button data-mark-ok="${w}" style="background:transparent; border:none; cursor:pointer; font-size:11px; color:#8B5E14; padding:0 2px;" title="Mark as a name / accept">✓</button>
            </span>
          `).join('');
          spellList.querySelectorAll('[data-mark-ok]').forEach(btn => {
            btn.onclick = () => { userMarkedOK.add(btn.dataset.markOk); refresh(); };
          });
        }
      }

      async function refresh() {
        const mySeq = ++refreshSeq;
        const text = ta.value;
        const chars = text.trim().length;
        counter.textContent = `${chars} / ${typedCheckMin} characters`;
        counter.style.color = chars >= typedCheckMin ? '#2D6B3C' : 'var(--ink-quiet)';

        if (chars < typedCheckMin) {
          goBtn.disabled = true;
          goBtn.style.opacity = '0.5';
          goBtn.textContent = `${typedCheckMin - chars} more characters`;
          spellBox.style.display = 'none';
          spellStatus.textContent = 'Spelling: will check at the word count';
          spellStatus.style.color = 'var(--ink-quiet)';
          return;
        }

        let suspects = _initialFlag(text).filter(w => !userMarkedOK.has(w));
        if (mySeq === refreshSeq) renderSuspects(suspects);
        if (suspects.length === 0) return;

        spellStatus.textContent = `Spelling: checking ${suspects.length} word${suspects.length === 1 ? '' : 's'} with dictionary...`;
        spellStatus.style.color = '#8B5E14';
        const confirmed = (await _confirmInvalid(suspects)).filter(w => !userMarkedOK.has(w));
        if (mySeq !== refreshSeq) return;
        renderSuspects(confirmed);
      }

      ta.addEventListener('input', refresh);
      ta.addEventListener('blur', refresh);
      refresh();
    }

    if (hasCheck) {
      const goBtn = host.querySelector('#concept-go');
      const fb = host.querySelector('#concept-check-feedback');
      const checkBox = host.querySelector('#concept-check');
      checkBox.querySelectorAll('.q-choice').forEach(btn => {
        btn.onclick = () => {
          if (checkBox.dataset.locked) return;
          checkBox.dataset.locked = '1';
          const i = parseInt(btn.dataset.i, 10);
          const ok = i === block.check.right;
          btn.classList.add(ok ? 'correct' : 'wrong');
          if (!ok) {
            // Highlight the right answer so he learns
            const rightBtn = checkBox.querySelector('.q-choice[data-i="' + block.check.right + '"]');
            if (rightBtn) rightBtn.classList.add('correct');
            fb.textContent = 'Not quite — the right one is highlighted. Tap continue when you see it.';
            fb.style.color = '#8B3838';
          } else {
            fb.textContent = 'Yes — that\'s the move.';
            fb.style.color = '#2D6B3C';
          }
          goBtn.disabled = false;
          goBtn.style.opacity = '1';
          goBtn.textContent = block.cta || 'Continue';
        };
      });
    }

    host.querySelector('#concept-go').onclick = () => {
      const goBtn = host.querySelector('#concept-go');
      if (goBtn.disabled) return;
      const data = { budgetMinutes: block.minutes };
      if (hasTypedCheck) {
        const ta = host.querySelector('#concept-typed');
        const body = ta ? ta.value.trim() : '';
        data.typedAnswer = body;
        _showReviewModal(host, {
          title: 'Ready for Mom & Dad?',
          answers: [{ q: block.typedCheck.q, body }],
          onEdit: () => {
            // restore focus + cursor at the end
            if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch(e){} }
          },
          onConfirm: () => {
            if (window.SS && window.SS.saveWritingPiece && body) {
              window.SS.saveWritingPiece(block.typedCheck.q || block.title || 'Concept check', body);
            }
            if (window.SS && window.SS.saveArtifact && body) {
              window.SS.saveArtifact({ kind: 'concept-typed', block_id: block.id, subject: block.subject, question: block.typedCheck.q, body, title: block.title });
            }
            complete(block.id, data);
          }
        });
      } else {
        complete(block.id, data);
      }
    };
  }

  // ============================================================
  // WELCOME (day orientation)
  // Reads day().welcomeContent if present (day-specific copy + bullets);
  // otherwise falls back to Monday's day-1 orientation hardcoded below.
  // ============================================================
  function welcome(host, block) {
    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return 'Morning';
      if (h < 17) return 'Afternoon';
      return 'Evening';
    })();

    const wc = day().welcomeContent;
    const dayLabel = wc && wc.dayLabel ? wc.dayLabel : 'Day 1';
    const showParentNote = !wc || wc.showParentNote !== false;
    const bullets = (wc && Array.isArray(wc.bullets) && wc.bullets.length > 0)
      ? wc.bullets
      : [
          "How Roblox studios actually make money — the long road a Robux purchase travels before a developer sees a paycheck.",
          "The 3-bucket money rule (save / spend / give) and how to split your own money with it.",
          "What else your Zeus Car's Arduino chip can do — including 8 lines of code that run a real traffic light.",
          "Your first 7th-grade math concept — <strong>Unit Rates</strong> — taught with a short Khan Academy video.",
          "The story of <strong>Mikaila Ulmer</strong>, a 12-year-old who built a real lemonade business that's now in stores across the country.",
          "Plus the day's drills — typing, spelling, Word Run, Word Tiles, Speed-Read — all themed around what you just read."
        ];
    const howItWorks = (wc && wc.howItWorks)
      ? wc.howItWorks
      : "How it works: you learn, then you practice. Read or watch something. Then the games and drills test what you just picked up. Each block is only a few minutes — the day shuffles formats so your brain stays locked in.";

    const parentNoteHtml = showParentNote ? `
      <div class="parent-note">
        <div class="parent-note-eyebrow">From Mom &amp; Dad</div>
        <div class="parent-note-body">
          <p>Ethan — your mom and I built this for you this summer.</p>
          <p>You're our boy. We love you. We want you to go back to school sharper than you left — because you can, and because right now is when shaping yourself toward what you actually want is real.</p>
          <p>The stuff in here teaches you things school doesn't get to yet. How to build with code. How money actually moves. How to ship something other people care about. Entrepreneur stuff. The kind of stuff that builds a man you can respect.</p>
          <p>Take it one block at a time. Show us what you make.</p>
        </div>
        <div class="parent-note-sig">— Mom &amp; Dad</div>
      </div>
    ` : '';

    host.innerHTML = `
      ${topRail(0, dayLabel, false)}
      <div class="greeting"><h1>${greeting}, Ethan.</h1>
        <div class="sub">Today's theme — <strong>${day().theme}</strong>. ${day().themeDesc}</div>
      </div>

      ${parentNoteHtml}

      <div style="padding: var(--space-3) var(--space-5);">
        <div style="font-family: var(--font-serif); font-size: 18px; line-height: 1.55; color: var(--ink); margin-bottom: var(--space-5);">
          Today you'll learn:
        </div>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3);">
          ${bullets.map(b => `
            <li style="display: flex; gap: var(--space-3); align-items: baseline; font-family: var(--font-serif); font-size: 17px; color: var(--ink);">
              <span style="color: var(--amber); font-weight: 600;">·</span>
              <span>${b}</span>
            </li>
          `).join('')}
        </ul>
        <div style="margin-top: var(--space-6); padding: var(--space-4) var(--space-5); background: var(--cream-card); border-left: 3px solid var(--amber); border-radius: 0 var(--r-md) var(--r-md) 0; font-family: var(--font-serif); font-style: italic; font-size: 15px; line-height: 1.5; color: var(--ink-soft);">
          ${howItWorks}
        </div>
      </div>
      <div class="center-actions">
        <button class="btn-primary" id="welcome-go">Let's go</button>
      </div>
    `;
    host.querySelector('#welcome-go').onclick = () => complete(block.id);
  }

  // ============================================================
  // READING (reuses old shape, splits passage by `slice`)
  // ============================================================
  function reading(host, block) {
    const p = day().passage;
    const [a, b] = block.slice || [0, p.paragraphs.length];
    const chunk = p.paragraphs.slice(a, b);
    // Distribute Qs across chunks proportionally. With 3 chunks + 4 Qs:
    //  chunk 0 (slice [0,1]) → Qs [0]      (1 Q)
    //  chunk 1 (slice [1,2]) → Qs [1, 2]   (2 Qs)
    //  chunk 2 (slice [2,3]) → Qs [3]      (1 Q — the synthesis)
    // With 2 chunks: 0 gets Qs 0-1, last gets Qs 2-3 (synthesis).
    const totalChunks = Math.ceil(p.paragraphs.length / Math.max(1, b - a));
    let qs;
    if (a === 0) qs = p.questions.slice(0, Math.max(1, Math.floor(p.questions.length / totalChunks)));
    else if (b >= p.paragraphs.length) qs = p.questions.slice(-Math.max(1, Math.floor(p.questions.length / totalChunks)));
    else qs = p.questions.slice(Math.floor(p.questions.length / totalChunks), -Math.floor(p.questions.length / totalChunks));
    if (!qs.length) qs = p.questions.slice(-2);  // safety

    host.innerHTML = `
      ${topRail((a / p.paragraphs.length) * 100 || 30, `chunk ${a === 0 ? '1' : '2'} of 2`)}
      ${moduleHead(`Reading — ${day().passage.title}`, day().passage.hero)}
      <div class="reading-layout">
        <article class="passage" data-dict>
          ${chunk.map(par => `<p>${par}</p>`).join('')}
          <p style="font-family: var(--font-body); font-size: 13px; color: var(--ink-quiet); font-style: italic; margin-top: var(--space-5);">Tap or hover any word for its definition.</p>
        </article>
        <aside class="questions">
          <h4>Questions · need ${qs.length === 1 ? 1 : (qs.length <= 3 ? qs.length - 1 : Math.ceil(qs.length * 0.75))} of ${qs.length}</h4>
          ${qs.map((q, i) => `
            <div class="q-item" data-q="${i}">
              <div class="q-prompt">${q.q}</div>
              <div class="q-choices">
                ${q.choices.map((c, j) => `<button class="q-choice" data-i="${j}">${c}</button>`).join('')}
              </div>
            </div>
          `).join('')}
          <div id="r-gate" style="margin-top: var(--space-4); font-family: var(--font-serif); font-size: 14px; color: var(--ink-quiet);"></div>
        </aside>
      </div>
      <div class="center-actions sticky-cta">
        <button class="btn-primary" id="r-done" disabled style="opacity:0.5;">Answer the questions first</button>
      </div>
    `;

    startBlockTimer(host, block);

    // Need most-but-not-all right — but never more than exist.
    // 1 Q → need 1, 2 Qs → need 1, 3 Qs → need 2, 4 Qs → need 3
    const required = qs.length === 1 ? 1 : (qs.length <= 3 ? qs.length - 1 : Math.ceil(qs.length * 0.75));
    let answered = 0;
    let attempted = 0;
    const doneBtn = host.querySelector('#r-done');
    const gate = host.querySelector('#r-gate');

    const updateGate = () => {
      if (attempted < qs.length) {
        gate.textContent = `${attempted} of ${qs.length} answered`;
        return;
      }
      // all attempted
      if (answered >= required) {
        gate.textContent = `${answered} of ${qs.length} right — passed!`;
        gate.style.color = '#2D6B3C';
        doneBtn.disabled = false;
        doneBtn.style.opacity = '1';
        doneBtn.textContent = 'I\'m done reading';
      } else {
        gate.textContent = `${answered} of ${qs.length} right — need ${required}. Reread + try the wrong ones again.`;
        gate.style.color = '#8B3838';
        // unlock the wrong answers for retry
        host.querySelectorAll('.q-item').forEach(item => {
          item.querySelectorAll('.q-choice.wrong').forEach(b => b.classList.remove('wrong'));
          delete item.dataset.locked;
        });
        attempted = 0;
        answered = 0;
        setTimeout(() => { gate.textContent = ''; gate.style.color = ''; }, 3500);
      }
    };

    host.querySelectorAll('.q-item').forEach((item, idx) => {
      item.querySelectorAll('.q-choice').forEach(btn => {
        btn.onclick = () => {
          if (item.dataset.locked) return;
          const i = parseInt(btn.dataset.i, 10);
          const correct = qs[idx].right === i;
          btn.classList.add(correct ? 'correct' : 'wrong');
          item.dataset.locked = '1';
          if (correct) answered++;
          attempted++;
          updateGate();
        };
      });
    });

    doneBtn.onclick = () => {
      if (doneBtn.disabled) return;
      if (answered === qs.length && window.SS) window.SS.awardStar('reading-comp-perfect');
      complete(block.id, { questionsRight: answered, total: qs.length, budgetMinutes: block.minutes });
    };
  }

  // ============================================================
  // TYPING SPRINT
  // ============================================================
  function typing(host, block) {
    // Per-block override so each subject session has its own typing target.
    // Falls back to day().typingTarget for legacy callers.
    const target = (block && block.typingTarget) || day().typingTarget;
    host.innerHTML = `
      ${topRail(50, 'sprint')}
      ${moduleHead('Typing Sprint · from today\'s reading', 'Type it fast. Type it right.')}
      <div class="typing-stage module-narrow">
        <div class="typing-target" id="tt"></div>
        <input class="typing-input" id="ti" placeholder="start typing…" autocomplete="off" spellcheck="false" />
        <div class="typing-stats">
          <div class="typing-stat"><div class="v" id="tw">0</div><div class="l">WPM</div></div>
          <div class="typing-stat"><div class="v" id="tacc">100</div><div class="l">% accuracy</div></div>
        </div>
        <div class="center-actions" style="padding:0;">
          <button class="btn-amber" id="tsubmit">I'm done</button>
        </div>
      </div>
    `;

    const tt = host.querySelector('#tt');
    const ti = host.querySelector('#ti');
    const tw = host.querySelector('#tw');
    const tacc = host.querySelector('#tacc');

    const renderChars = (typed) => {
      let html = '';
      for (let i = 0; i < target.length; i++) {
        const t = target[i];
        const u = typed[i];
        let cls = '';
        if (u === undefined) cls = (i === typed.length ? 'cur' : '');
        else if (u === t) cls = 'ok';
        else cls = 'bad';
        html += `<span class="ch ${cls}">${t === ' ' ? '&nbsp;' : t}</span>`;
      }
      tt.innerHTML = html;
    };
    renderChars('');

    let started = null;
    ti.oninput = () => {
      if (!started) started = Date.now();
      const typed = ti.value;
      renderChars(typed);
      const elapsed = (Date.now() - started) / 60000;
      const words = typed.trim().split(/\s+/).length;
      const wpm = elapsed > 0 ? Math.round(words / elapsed) : 0;
      tw.textContent = wpm;
      let right = 0;
      for (let i = 0; i < typed.length && i < target.length; i++) {
        if (typed[i] === target[i]) right++;
      }
      const acc = typed.length ? Math.round((right / typed.length) * 100) : 100;
      tacc.textContent = acc;

      if (typed === target) {
        if (window.SS) window.SS.setWpmRecord(wpm);
        if (acc >= 95 && window.SS) window.SS.awardStar('legacy-zero');
      }
    };

    host.querySelector('#tsubmit').onclick = () => {
      const typed = ti.value;
      const elapsed = ((Date.now() - (started || Date.now())) / 60000) || 1;
      const wpm = Math.round((typed.trim().split(/\s+/).length || 0) / elapsed);
      complete(block.id, { wpm, accuracy: parseInt(tacc.textContent, 10) });
    };

    setTimeout(() => ti.focus(), 100);
  }

  // ============================================================
  // MONEY MOVE
  // ============================================================
  function money(host, block) {
    const m = day().money;
    if (block.part === 'concept') {
      // mini-scenarios — which bucket does each go into?
      const drills = [
        { item: 'A $40 game you really want', right: 'Spend', why: 'You want it now — that\'s the Spend bucket.' },
        { item: '$5 for a kid in your class who lost their lunch money', right: 'Give', why: 'When someone needs it more than you — Give bucket.' },
        { item: 'Saving up $200 for a longer-range Roblox dev course', right: 'Save', why: 'Long-term goal — that\'s Save bucket.' },
        { item: 'A snack at the gas station you\'re craving today', right: 'Spend', why: 'In-the-moment treat — Spend.' },
        { item: 'Your half of a birthday gift for your cousin', right: 'Give', why: 'Money flowing to someone else — Give bucket.' }
      ];
      // pick 3 random
      const pool = drills.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      let drillIdx = 0;
      let drillsRight = 0;

      const renderConcept = () => {
        host.innerHTML = `
          ${topRail(40, 'concept')}
          ${moduleHead('Money Move', m.name)}
          <div class="money-stage">
            <div class="money-card" data-dict>
              <p>${m.lesson}</p>
              <div class="money-buckets">
                ${m.buckets.map(b => `
                  <div class="money-bucket">
                    <div class="name">${b.name}</div>
                    <div class="pct">${b.pct}%</div>
                    <div class="what">${b.what}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="money-card" style="background: var(--cream);">
              <h3 style="font-family: var(--font-serif); font-weight:500; font-size:20px; margin-bottom: var(--space-2); color: var(--ink);">Quick check · ${drillIdx + 1} of ${pool.length}</h3>
              <p style="font-family: var(--font-serif); font-size: 18px; line-height: 1.4; color: var(--ink); margin-bottom: var(--space-4);">${pool[drillIdx].item}</p>
              <p style="font-size: 13px; color: var(--ink-quiet); margin-bottom: var(--space-3);">Which bucket?</p>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
                ${['Save', 'Spend', 'Give'].map(b => `<button class="btn-secondary md-c" data-c="${b}">${b}</button>`).join('')}
              </div>
              <div id="md-fb" style="margin-top: var(--space-4); font-family: var(--font-serif); font-size: 16px; min-height: 22px; color: var(--ink-soft);"></div>
            </div>

            <div class="center-actions" style="padding:0;">
              <button class="btn-primary" id="m-go" style="display:none;">${drillIdx === pool.length - 1 ? 'Got it' : 'Next'}</button>
            </div>
          </div>
        `;
        const fb = host.querySelector('#md-fb');
        const go = host.querySelector('#m-go');
        let locked = false;
        host.querySelectorAll('.md-c').forEach(btn => {
          btn.onclick = () => {
            if (locked) return; locked = true;
            const guess = btn.dataset.c;
            const right = pool[drillIdx].right === guess;
            btn.classList.add('btn-amber');
            btn.classList.remove('btn-secondary');
            if (!right) {
              btn.style.background = '#FBEDED';
              btn.style.color = '#8B3838';
            }
            fb.textContent = (right ? '✓ ' : '✗ ') + pool[drillIdx].why;
            fb.style.color = right ? '#2D6B3C' : '#8B3838';
            if (right) drillsRight++;
            go.style.display = 'inline-flex';
          };
        });
        go.onclick = () => {
          drillIdx++;
          if (drillIdx >= pool.length) {
            if (drillsRight === pool.length && window.SS) window.SS.awardStar('money-bucket-mastered');
            complete(block.id, { drillsRight, total: pool.length });
          } else {
            renderConcept();
          }
        };
      };
      renderConcept();
    } else {
      // scenario
      host.innerHTML = `
        ${topRail(70, 'split it')}
        ${moduleHead('Money Move', 'Split $' + m.scenario.amount)}
        <div class="money-stage">
          <div class="money-card">
            <p data-dict>${m.scenario.prompt} Put a number in each bucket. The three numbers add up to $${m.scenario.amount}.</p>
            <div class="money-scenario-input"><label>Save</label><input id="b-save" type="number" min="0" max="${m.scenario.amount}" value="0" /><span class="money-running">$</span></div>
            <div class="money-scenario-input"><label>Spend</label><input id="b-spend" type="number" min="0" max="${m.scenario.amount}" value="0" /><span class="money-running">$</span></div>
            <div class="money-scenario-input"><label>Give</label><input id="b-give" type="number" min="0" max="${m.scenario.amount}" value="0" /><span class="money-running">$</span></div>
            <div class="money-running" id="m-total" style="margin-top: var(--space-3); font-size: 22px;">$0 / $${m.scenario.amount}</div>
          </div>
          <div class="center-actions" style="padding:0;">
            <button class="btn-amber" id="m-done">Lock it in</button>
          </div>
        </div>
      `;
      const inputs = ['b-save', 'b-spend', 'b-give'].map(i => host.querySelector('#'+i));
      const tot = host.querySelector('#m-total');
      const done = host.querySelector('#m-done');
      const calc = () => {
        const t = inputs.reduce((s, i) => s + (parseInt(i.value || 0, 10) || 0), 0);
        tot.textContent = `$${t} / $${m.scenario.amount}`;
        tot.className = 'money-running ' + (t === m.scenario.amount ? 'ok' : (t > m.scenario.amount ? 'over' : ''));
      };
      inputs.forEach(i => i.oninput = calc);
      done.onclick = () => {
        const split = inputs.map(i => parseInt(i.value || 0, 10) || 0);
        const t = split.reduce((a, b) => a + b, 0);
        if (t === m.scenario.amount && window.SS) window.SS.awardStar('money-math-correct');
        complete(block.id, { split, total: t });
      };
    }
  }

  // ============================================================
  // ARDUINO — DYK
  // ============================================================
  function arduino(host, block) {
    const a = day().arduino;
    const wif = day().arduinoWhatIf || [];
    // simple syntax-color
    const colored = a.code
      .replace(/(\/\/[^\n]*)/g, '<span class="com">$1</span>')
      .replace(/\b(int|void|setup|loop|pinMode|digitalWrite|delay|OUTPUT|HIGH|LOW)\b/g, '<span class="key">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');

    host.innerHTML = `
      ${topRail(60, 'Arduino')}
      ${moduleHead('Did You Know', 'Your Zeus Car kit')}
      <div class="ardu-stage">
        <div class="ardu-dyk" data-dict>
          <div class="dyk-label">Did you know</div>
          <h3>${a.dykTitle}</h3>
          <p>${a.dyk}</p>
          <pre class="code-block">${colored}</pre>
        </div>

        <div class="ardu-dyk">
          <div class="dyk-label">What if you changed it?</div>
          <p style="font-family: var(--font-serif); font-size: 16px; color: var(--ink); margin-bottom: var(--space-4);">Read the code above. Answer all three to move on.</p>
          ${wif.map((q, i) => `
            <div class="q-item" data-q="${i}" style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--line); padding-bottom: var(--space-4);">
              <div class="q-prompt" style="font-family: var(--font-serif); font-size: 16px; margin-bottom: var(--space-3); color: var(--ink);">${q.q}</div>
              <div class="q-choices" style="display:flex; flex-direction:column; gap: var(--space-2);">
                ${q.choices.map((c, j) => `<button class="q-choice" data-i="${j}">${c}</button>`).join('')}
              </div>
            </div>
          `).join('')}
          <div id="a-gate" style="margin-top: var(--space-3); font-family: var(--font-serif); font-size: 14px; color: var(--ink-quiet);"></div>
        </div>

        <div class="center-actions sticky-cta" style="padding:0;">
          <button class="btn-primary" id="a-done" disabled style="opacity:0.5;">Answer all three first</button>
        </div>
      </div>
    `;

    const doneBtn = host.querySelector('#a-done');
    const gate = host.querySelector('#a-gate');
    let answered = 0, attempted = 0;
    const required = 2;  // need 2 of 3 right

    const updateGate = () => {
      if (attempted < wif.length) { gate.textContent = `${attempted} of ${wif.length} answered`; return; }
      if (answered >= required) {
        gate.textContent = `${answered} of ${wif.length} right — passed!`;
        gate.style.color = '#2D6B3C';
        doneBtn.disabled = false; doneBtn.style.opacity = '1';
        doneBtn.textContent = 'Cool, got it';
      } else {
        gate.textContent = `${answered} of ${wif.length} — need ${required}. Re-read the code and try again.`;
        gate.style.color = '#8B3838';
        host.querySelectorAll('.q-item').forEach(item => {
          item.querySelectorAll('.q-choice.wrong').forEach(b => b.classList.remove('wrong'));
          delete item.dataset.locked;
        });
        attempted = 0; answered = 0;
        setTimeout(() => { gate.textContent = ''; gate.style.color = ''; }, 3500);
      }
    };

    host.querySelectorAll('.q-item').forEach((item, idx) => {
      item.querySelectorAll('.q-choice').forEach(btn => {
        btn.onclick = () => {
          if (item.dataset.locked) return;
          const i = parseInt(btn.dataset.i, 10);
          const correct = wif[idx].right === i;
          btn.classList.add(correct ? 'correct' : 'wrong');
          item.dataset.locked = '1';
          if (correct) answered++;
          attempted++;
          updateGate();
        };
      });
    });

    doneBtn.onclick = () => {
      if (doneBtn.disabled) return;
      if (answered === wif.length && window.SS) window.SS.awardStar('quiz-first-try');
      complete(block.id, { right: answered, total: wif.length });
    };
  }

  // ============================================================
  // ARDUINO — code-snippet predict
  // ============================================================
  function arduinoCode(host, block) {
    const a = day().arduino;
    const colored = a.code
      .replace(/(\/\/[^\n]*)/g, '<span class="com">$1</span>')
      .replace(/\b(int|void|setup|loop|pinMode|digitalWrite|delay|OUTPUT|HIGH|LOW)\b/g, '<span class="key">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');

    host.innerHTML = `
      ${topRail(65, 'predict')}
      ${moduleHead('Code Snippet', 'Predict what runs')}
      <div class="ardu-stage">
        <div class="ardu-dyk">
          <pre class="code-block">${colored}</pre>
          <p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.5; color: var(--ink); margin-top: var(--space-4);">${a.predict.q}</p>
          <div class="ardu-choice">
            ${a.predict.choices.map((c, i) => `<button data-i="${i}">${c}</button>`).join('')}
          </div>
        </div>
        <div class="center-actions" style="padding:0;">
          <button class="btn-primary" id="ac-done" style="display:none;">Next</button>
        </div>
      </div>
    `;
    let locked = false;
    host.querySelectorAll('.ardu-choice button').forEach((b, i) => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const right = i === a.predict.right;
        b.classList.add(right ? 'right' : 'wrong');
        if (right && window.SS) window.SS.awardStar('quiz-first-try');
        host.querySelector('#ac-done').style.display = 'inline-flex';
      };
    });
    host.querySelector('#ac-done').onclick = () => complete(block.id);
  }

  // ============================================================
  // ARDUINO — writing micro (handwritten)
  // ============================================================
  function writingMini(host, block) {
    // Per-block override so each subject session can have its own prompt.
    // block.prompt = "..." or block.writingPrompt = "..." also works.
    // block.minSentences (default 2). Falls back to day().arduino.writingPrompt.
    const prompt = (block && (block.prompt || block.writingPrompt))
      || (day().arduino && day().arduino.writingPrompt)
      || 'Write two sentences about today\'s lesson.';
    const minSentences = (block && block.minSentences) || 2;
    const label = (block && block.label) || 'Prompt';
    const eyebrow = (block && block.eyebrow) || 'Quick Write';
    host.innerHTML = `
      ${topRail(0, 'on paper')}
      ${moduleHead(eyebrow, 'On paper, ' + minSentences + ' sentence' + (minSentences === 1 ? '' : 's'))}
      <div class="writing-stage module-narrow">
        <div class="writing-prompt">
          <div class="label">${label}</div>
          <div class="text" data-dict>${prompt}</div>
          <div class="meta"><span>Hand write it</span><span>${minSentences} sentence${minSentences === 1 ? '' : 's'} min</span></div>
        </div>
        <div class="approve-card">
          <div class="big">When it's written</div>
          <div class="small">Tap whoever you grab.</div>
          <div class="approve-row">
            <button class="btn-amber" id="approve-dad">Dad approved</button>
            <button class="btn-amber" id="approve-mom">Mom approved</button>
          </div>
        </div>
      </div>
    `;
    startBlockTimer(host, block);
    ['approve-dad', 'approve-mom'].forEach(id => {
      host.querySelector('#' + id).onclick = () => {
        if (window.SS) {
          window.SS.dadApproveLatest();
        }
        complete(block.id, { approver: id === 'approve-dad' ? 'dad' : 'mom' });
      };
    });
  }

  // ============================================================
  // MATH — quickfire
  // ============================================================
  function math(host, block) {
    const probs = day().math.problems.slice();
    let i = 0;
    let right = 0;
    let started = Date.now();

    host.innerHTML = `
      ${topRail(72, 'math')}
      ${moduleHead('Math — quickfire', 'Beat the clock')}
      <div class="math-stage">
        <div class="math-card">
          <div class="math-problem" id="m-p">${probs[0].p}</div>
          <input class="math-input" id="m-i" type="number" autocomplete="off" />
        </div>
        <div class="math-meta">
          <div>Problem <span class="v" id="m-n">1</span> of ${probs.length}</div>
          <div>Right: <span class="v" id="m-r">0</span></div>
        </div>
      </div>
    `;

    const pEl = host.querySelector('#m-p');
    const iEl = host.querySelector('#m-i');
    const nEl = host.querySelector('#m-n');
    const rEl = host.querySelector('#m-r');

    const advance = () => {
      i++;
      if (i >= probs.length) {
        const took = Math.round((Date.now() - started) / 1000);
        if (right === probs.length && window.SS) window.SS.awardStar('math-quickfire-perfect');
        complete(block.id, { right, total: probs.length, seconds: took });
        return;
      }
      pEl.textContent = probs[i].p;
      iEl.value = '';
      nEl.textContent = i + 1;
      iEl.focus();
    };

    iEl.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      const guess = parseInt(iEl.value, 10);
      if (guess === probs[i].a) {
        right++;
        rEl.textContent = right;
        pEl.style.color = 'var(--amber)';
      } else {
        pEl.style.color = '#C25A5A';
      }
      setTimeout(() => { pEl.style.color = ''; advance(); }, 350);
    };
    setTimeout(() => iEl.focus(), 100);
  }

  // ============================================================
  // INSPIRE micro-read
  // ============================================================
  function inspire(host, block) {
    const x = day().inspirational;
    const quiz = day().inspirationalQuiz || [];

    host.innerHTML = `
      ${topRail(75, '4 min read')}
      ${moduleHead('A young creator', x.title)}
      <div class="reading-layout" style="grid-template-columns: 1fr;">
        <article class="passage" data-dict><p>${x.paragraph}</p></article>

        <aside class="questions">
          <h4>Quick check · need 2 of 3</h4>
          ${quiz.map((q, i) => `
            <div class="q-item" data-q="${i}">
              <div class="q-prompt">${q.q}</div>
              <div class="q-choices">
                ${q.choices.map((c, j) => `<button class="q-choice" data-i="${j}">${c}</button>`).join('')}
              </div>
            </div>
          `).join('')}
          <div id="i-gate" style="margin-top: var(--space-3); font-family: var(--font-serif); font-size: 14px; color: var(--ink-quiet);"></div>
        </aside>
      </div>
      <div class="center-actions sticky-cta">
        <button class="btn-primary" id="i-done" disabled style="opacity:0.5;">Answer the quick check first</button>
      </div>
    `;

    const doneBtn = host.querySelector('#i-done');
    const gate = host.querySelector('#i-gate');
    let answered = 0, attempted = 0;
    const required = 2;

    const updateGate = () => {
      if (attempted < quiz.length) { gate.textContent = `${attempted} of ${quiz.length}`; return; }
      if (answered >= required) {
        gate.textContent = `${answered} of ${quiz.length} — passed!`;
        gate.style.color = '#2D6B3C';
        doneBtn.disabled = false; doneBtn.style.opacity = '1';
        doneBtn.textContent = 'Next';
      } else {
        gate.textContent = `${answered} of ${quiz.length} — need ${required}. Re-read and try again.`;
        gate.style.color = '#8B3838';
        host.querySelectorAll('.q-item').forEach(item => {
          item.querySelectorAll('.q-choice.wrong').forEach(b => b.classList.remove('wrong'));
          delete item.dataset.locked;
        });
        attempted = 0; answered = 0;
        setTimeout(() => { gate.textContent = ''; gate.style.color = ''; }, 3500);
      }
    };

    host.querySelectorAll('.q-item').forEach((item, idx) => {
      item.querySelectorAll('.q-choice').forEach(btn => {
        btn.onclick = () => {
          if (item.dataset.locked) return;
          const i = parseInt(btn.dataset.i, 10);
          const correct = quiz[idx].right === i;
          btn.classList.add(correct ? 'correct' : 'wrong');
          item.dataset.locked = '1';
          if (correct) answered++;
          attempted++;
          updateGate();
        };
      });
    });

    doneBtn.onclick = () => {
      if (doneBtn.disabled) return;
      if (answered === quiz.length && window.SS) window.SS.awardStar('quiz-first-try');
      complete(block.id, { right: answered, total: quiz.length });
    };
  }

  // ============================================================
  // BUILD-A-GAME (handwritten + parent approval)
  // ============================================================
  function bag(host, block) {
    const b = day().bagBeat;
    const arcDays = [
      { key: 'mon', label: 'Mon — Name' },
      { key: 'tue', label: 'Tue — Pitch' },
      { key: 'wed', label: 'Wed — Level 1' },
      { key: 'thu', label: 'Thu — $$' },
      { key: 'fri', label: 'Fri — Cover + Ship' }
    ];

    // Build the structured pitch worksheet. Older bagBeats may not have the
    // new fields (intro/whatIsPitch/template/why) — fall back to the old
    // prompt+help shape so other days still render.
    const hasStructure = Array.isArray(b.template) && b.template.length > 0;

    host.innerHTML = `
      ${topRail(88, 'arc day 1 of 5')}
      ${moduleHead('Build-A-Game', b.title)}
      <div class="bag-stage">
        <div class="bag-arc">
          ${arcDays.map(d => `
            <div class="bag-arc-dot ${d.key === b.day ? 'active' : ''}">
              <div class="dot"></div>${d.label}
            </div>
          `).join('')}
        </div>

        ${hasStructure ? `
          <div class="bag-prompt" data-dict>
            <div class="day-label">Today's beat</div>
            <div class="text" style="font-size: 19px; line-height: 1.45;">${b.intro}</div>
          </div>

          <div class="bag-prompt" data-dict style="background: #FBF7EE; border-left: 4px solid var(--amber);">
            <div class="day-label">What's a pitch?</div>
            <div class="text" style="font-size: 16px; line-height: 1.55;">${b.whatIsPitch}</div>
          </div>

          <div class="bag-prompt" data-dict>
            <div class="day-label">Why do this?</div>
            <div class="text" style="font-size: 16px; line-height: 1.55; font-style: italic; color: var(--ink-soft);">${b.why}</div>
          </div>

          <div class="bag-prompt" style="padding-bottom: var(--space-4);">
            <div class="day-label">Your pitch — 5 parts</div>
            <div style="display: flex; flex-direction: column; gap: var(--space-4); margin-top: var(--space-3);">
              ${b.template.map((part, i) => `
                <div style="background: #FFF; border: 1px solid rgba(26,24,20,0.08); border-radius: 12px; padding: var(--space-4) var(--space-5);">
                  <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber); margin-bottom: 6px;">${i + 1}. ${part.label}</div>
                  <div data-dict style="font-size: 15px; line-height: 1.5; color: var(--ink-soft);">${part.hint}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="bag-prompt" data-dict style="background: var(--cream-card);">
            <div class="day-label">How to do this</div>
            <div class="text" style="font-size: 16px; line-height: 1.55;">${b.help}</div>
          </div>
        ` : `
          <div class="bag-prompt">
            <div class="day-label">Today's beat</div>
            <div class="text" data-dict>${b.prompt || ''}</div>
            <div class="help">${b.help || ''}</div>
          </div>
        `}

        <div class="approve-card">
          <div class="big">When you've pitched it to Mom or Dad</div>
          <div class="small">Tap who heard your pitch. (No rush — take the whole block if you want.)</div>
          <div class="approve-row">
            <button class="btn-amber" id="bag-dad">Pitched it to Dad</button>
            <button class="btn-amber" id="bag-mom">Pitched it to Mom</button>
          </div>
          <div style="margin-top: var(--space-3); font-size: 13px; color: var(--ink-quiet); text-align: center;">
            <button class="btn-secondary" id="bag-self" style="font-size: 13px; padding: 8px 18px;">Skip for now — I'll pitch later</button>
          </div>
        </div>
      </div>
    `;

    const selfBtn = host.querySelector('#bag-self');
    if (selfBtn) selfBtn.onclick = () => {
      if (window.SS) {
        window.SS.saveBagBeat('mon', 'name', '[pitch written — sharing later]');
        window.SS.awardStar('bag-beat-shipped');
      }
      complete(block.id, { approver: 'self' });
    };

    ['bag-dad', 'bag-mom'].forEach(id => {
      host.querySelector('#' + id).onclick = () => {
        if (window.SS) {
          window.SS.saveBagBeat('mon', 'name', '[handwritten — approved by ' + (id === 'bag-dad' ? 'Dad' : 'Mom') + ']');
          window.SS.awardStar('bag-beat-shipped');
        }
        complete(block.id, { approver: id === 'bag-dad' ? 'dad' : 'mom' });
      };
    });
  }

  // ============================================================
  // SHOW DAD / MOM
  // ============================================================
  function showdad(host, block) {
    // Two flavors of this block: mid-day check-in vs end-of-day show off.
    // Same render fn but the copy + intent are different.
    const isMidDay = block.id === 'mid-showdad';

    if (isMidDay) {
      host.innerHTML = `
        ${topRail(50, 'halfway')}
        ${moduleHead('Halfway', 'Stand up. Breathe. You\'re crushing it.')}
        <div class="writing-stage module-narrow">
          <div class="approve-card">
            <div class="big">Mid-day reset.</div>
            <div class="small" style="line-height: 1.55;">
              You've done a lot already. Stand up, get water, stretch for 60 seconds.
              When you sit back down, tap below and keep going. (Optional: show Mom or Dad
              something cool you've done so far if they're around.)
            </div>
            <div class="approve-row">
              <button class="btn-amber" id="show-back">I'm back — keep going</button>
            </div>
          </div>
        </div>
      `;
      host.querySelector('#show-back').onclick = () => {
        if (window.SS) window.SS.awardStar('legacy-zero');
        complete(block.id);
      };
      return;
    }

    // End-of-day Show Off
    host.innerHTML = `
      ${topRail(96, 'show off')}
      ${moduleHead('Show off', 'Walk Mom or Dad through it')}
      <div class="writing-stage module-narrow">
        <div class="approve-card">
          <div class="big">Grab a parent.</div>
          <div class="small">Show them your game pitch and your handwritten work today. Read your pitch out loud.</div>
          <div class="approve-row">
            <button class="btn-amber" id="show-dad-final">Dad approved</button>
            <button class="btn-amber" id="show-mom-final">Mom approved</button>
          </div>
          <div style="margin-top: var(--space-3); text-align: center;">
            <button class="btn-secondary" id="show-self-final" style="font-size: 13px; padding: 8px 18px;">Skip — I'll show them later</button>
          </div>
        </div>
      </div>
    `;
    ['show-dad-final', 'show-mom-final'].forEach(id => {
      host.querySelector('#' + id).onclick = () => {
        if (window.SS) window.SS.awardStar('showed-parent');
        complete(block.id);
      };
    });
    host.querySelector('#show-self-final').onclick = () => complete(block.id);
  }

  // ============================================================
  // END-OF-DAY SPLASH
  // ============================================================
  function splash(host, block) {
    const lastWrite = window.SS ? window.SS.latestWriting() : null;
    const dadApproved = lastWrite && lastWrite.dadApproved;

    // Day-complete check — only celebrate if EVERY block is done (he can
    // skip ahead but the day isn't done until he loops back to fill in the
    // gaps). Splash itself doesn't count toward the all-done check.
    const allBlocks = day().blocks;
    const undone = allBlocks.filter(b => b.id !== block.id && window.SS && !window.SS.isBlockDone(b.id));
    if (undone.length > 0) {
      host.innerHTML = `
        <div class="day-splash">
          <div class="label">Almost there</div>
          <h1>${undone.length} block${undone.length === 1 ? '' : 's'} left.</h1>
          <p style="font-family: var(--font-serif); font-size: 18px; line-height: 1.5; color: var(--ink-soft); max-width: 480px; margin: var(--space-5) auto;">
            You jumped past these earlier. Knock them out to finish the day and tick your streak.
          </p>
          <div style="max-width: 480px; margin: var(--space-5) auto; text-align: left;">
            ${undone.slice(0, 5).map(b => `<div style="padding: var(--space-3) var(--space-4); background: var(--cream-card); border-radius: var(--r-sm); margin-bottom: var(--space-2); font-family: var(--font-serif); font-size: 16px;">${b.title}</div>`).join('')}
            ${undone.length > 5 ? `<div style="text-align: center; color: var(--ink-quiet); font-size: 13px; margin-top: var(--space-2);">+ ${undone.length - 5} more</div>` : ''}
          </div>
          <div class="center-actions" style="justify-content: center;">
            <button class="btn-primary" data-go="hub">Back to today</button>
          </div>
        </div>
      `;
      return;  // don't tick streak, don't mark complete
    }

    const streak = window.SS ? window.SS.tickStreak() : 1;

    // Milestone notes — show at 1 (first day done), 7, 14, 30, 60 day streaks
    const milestoneNote = (() => {
      if (streak === 1) return "First day in the books, Ethan. This is the work. We're glad you started.";
      if (streak === 7) return "One full week. You showed up every day. That's the muscle — keep building it.";
      if (streak === 14) return "Two weeks. You're doing this. We see it.";
      if (streak === 30) return "A month, Ethan. Most kids don't have this in them. You do.";
      if (streak === 60) return "Sixty days. You went back to school sharper than you left. We're proud as hell.";
      return null;
    })();

    host.innerHTML = `
      <div class="day-splash">
        <div class="label">Day complete</div>
        <h1>Nice work, Ethan.</h1>
        <div class="stats">
          <div class="stat"><div class="v">${streak}</div><div class="l">Day streak</div></div>
        </div>

        ${(dadApproved || milestoneNote) ? `
          <div class="parent-note" style="margin: var(--space-7) auto; max-width: 520px; text-align: left;">
            <div class="parent-note-eyebrow">From Mom &amp; Dad</div>
            <div class="parent-note-body">
              ${milestoneNote ? `<p>${milestoneNote}</p>` : ''}
              ${dadApproved && !milestoneNote ? `<p>We saw what you wrote today. Nice work, kid.</p>` : ''}
              ${dadApproved && milestoneNote ? `<p style="font-size: 17px; font-weight: 400;">We saw what you wrote today. Nice work.</p>` : ''}
            </div>
            <div class="parent-note-sig">— Mom &amp; Dad</div>
          </div>
        ` : ''}

        <div class="center-actions" style="justify-content:center;">
          <button class="btn-primary" data-go="hub">Back to today</button>
        </div>
      </div>
    `;
    if (window.SS) window.SS.completeBlock(block.id);
  }

  // ============================================================
  // WORD RUN — side-scroller
  // ============================================================
  function wordrun(host, block) {
    const target = (block.word || 'studio').toLowerCase();
    let collected = '';
    let score = 0;

    host.innerHTML = `
      ${topRail(80, 'level')}
      ${moduleHead('Word Run · vocab from today\'s reading', 'Collect letters in order to spell:')}
      <div class="wr-stage">
        <div class="wr-target">
          spell:
          <span class="word" id="wr-word">${target.split('').map(c => `<span class="gap">${c}</span>`).join('')}</span>
        </div>
        <div class="wr-canvas-wrap">
          <canvas id="wr-canvas" width="800" height="280"></canvas>
          <div class="wr-hud">
            <span id="wr-score">Score 0</span>
            <span id="wr-hint">tap / space to jump</span>
          </div>
        </div>
        <div class="wr-controls">
          <button class="btn-secondary" id="wr-restart">Restart</button>
          <button class="btn-amber" id="wr-finish">I'm done</button>
        </div>
      </div>
    `;

    const canvas = host.querySelector('#wr-canvas');
    const ctx = canvas.getContext('2d');
    const wordEl = host.querySelector('#wr-word');
    const scoreEl = host.querySelector('#wr-score');

    // game state
    const W = canvas.width, H = canvas.height;
    const groundY = H - 60;
    const player = { x: 80, y: groundY, vy: 0, w: 28, h: 36, jumping: false };
    let items = []; // {x, letter, taken, isNeeded}
    let scrollX = 0;
    let speed = 3;
    let running = true;
    let won = false;
    let mistakes = 0;
    let neededSpawnedFor = -1;  // last collected idx for which we've spawned the next needed letter

    const wantIdx = () => collected.length;

    // SPAWN RULES — fair but challenging
    //  1. After each correct collect, schedule the NEXT needed letter to appear within ~600-1000px.
    //  2. If the player misses the needed letter (it goes off screen uncollected), respawn it within 400px.
    //  3. Distractors spawn between needed letters, at minimum 220px apart.
    //  4. Distractor spawning pauses if a needed letter is currently on screen within close range.
    const NEEDED_MIN_DIST = 600;   // distance from last needed spawn until the next one
    const NEEDED_MAX_DIST = 1000;
    const DISTRACTOR_MIN_GAP = 220;
    let lastSpawnX = 0;
    let nextNeededAtX = 0;

    const spawnNeeded = () => {
      const idx = wantIdx();
      const letter = target[idx];
      if (!letter) return;
      // place it where the player CAN jump for it: vary height but reachable
      const y = groundY - 70 - Math.random() * 50;
      items.push({ x: scrollX + W + 40, y, letter: letter.toUpperCase(), taken: false, isNeeded: true });
      neededSpawnedFor = idx;
      nextNeededAtX = scrollX + W + 40 + NEEDED_MIN_DIST + Math.random() * (NEEDED_MAX_DIST - NEEDED_MIN_DIST);
      lastSpawnX = scrollX + W + 40;
    };

    const spawnDistractor = () => {
      // never use the currently-needed letter as a distractor (too confusing)
      const needed = (target[wantIdx()] || '').toUpperCase();
      let letter;
      do {
        letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      } while (letter === needed);
      const y = groundY - 70 - Math.random() * 50;
      const x = scrollX + W + 40;
      items.push({ x, y, letter, taken: false, isNeeded: false });
      lastSpawnX = x;
    };

    const updateSpawns = () => {
      const onScreenNeeded = items.some(it => !it.taken && it.isNeeded && it.x - scrollX > 0);
      // 1. Did the player miss the needed letter? (it scrolled off without being taken)
      if (!onScreenNeeded && wantIdx() < target.length && wantIdx() === neededSpawnedFor) {
        // a needed letter was spawned but is now gone uncollected — give him a quick second chance
        nextNeededAtX = scrollX + W + 60 + 200;  // respawn closer
        neededSpawnedFor = -1;
      }
      // 2. Spawn the next needed letter when we've scrolled past the planned spawn point
      if (!onScreenNeeded && wantIdx() < target.length && wantIdx() !== neededSpawnedFor) {
        // schedule if not yet scheduled
        if (nextNeededAtX <= scrollX + W) {
          spawnNeeded();
        }
      }
      // 3. Spawn distractors filling the gaps (sparse)
      const rightEdge = scrollX + W;
      if (rightEdge - lastSpawnX > DISTRACTOR_MIN_GAP + Math.random() * 100) {
        // only if NOT about to spawn a needed letter very soon
        if (Math.abs(rightEdge - nextNeededAtX) > 100) {
          spawnDistractor();
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // ground
      ctx.fillStyle = '#D4B47A';
      ctx.fillRect(0, groundY + 20, W, H - groundY);
      // ground line
      ctx.fillStyle = 'rgba(26,24,20,0.18)';
      ctx.fillRect(0, groundY + 20, W, 2);

      // far hills (parallax)
      ctx.fillStyle = 'rgba(26,24,20,0.06)';
      const hillX = -((scrollX * 0.3) % 400);
      for (let i = -1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(hillX + i * 400, groundY + 20);
        ctx.quadraticCurveTo(hillX + i * 400 + 200, groundY - 80, hillX + i * 400 + 400, groundY + 20);
        ctx.fill();
      }

      // letter items
      items.forEach(it => {
        if (it.taken) return;
        ctx.fillStyle = '#FBF7EE';
        ctx.strokeStyle = 'rgba(26,24,20,0.25)';
        ctx.lineWidth = 1.5;
        const ix = it.x - scrollX;
        ctx.beginPath();
        ctx.roundRect(ix - 18, it.y - 22, 36, 44, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1A1814';
        ctx.font = '600 22px Fraunces, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.letter, ix, it.y);
      });

      // player (silhouette)
      ctx.fillStyle = '#1A1814';
      ctx.beginPath();
      ctx.roundRect(player.x, player.y - player.h, player.w, player.h, 6);
      ctx.fill();
      // head
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y - player.h - 8, 9, 0, Math.PI * 2);
      ctx.fill();
    };

    const updateWordRow = () => {
      const html = target.split('').map((c, i) => {
        if (i < collected.length) return `<span class="got">${c}</span>`;
        return `<span class="gap">${c}</span>`;
      }).join('');
      wordEl.innerHTML = html;
    };

    const flashCanvas = (color, ms = 220) => {
      const wrap = host.querySelector('.wr-canvas-wrap');
      if (!wrap) return;
      wrap.style.boxShadow = `inset 0 0 0 4px ${color}`;
      setTimeout(() => wrap.style.boxShadow = '', ms);
    };

    const step = () => {
      if (!running) return;

      // physics
      if (player.jumping) {
        player.vy += 0.7;
        player.y += player.vy;
        if (player.y >= groundY) { player.y = groundY; player.jumping = false; player.vy = 0; }
      }

      scrollX += speed;
      updateSpawns();

      // collision: any letter within player's box
      const px = player.x + scrollX;
      items.forEach(it => {
        if (it.taken) return;
        const dx = it.x - px - player.w / 2;
        const dy = (it.y) - (player.y - player.h / 2);
        if (Math.abs(dx) < 22 && Math.abs(dy) < 30) {
          it.taken = true;
          const need = target[wantIdx()];
          if (need && it.letter.toLowerCase() === need.toLowerCase()) {
            collected += it.letter.toLowerCase();
            score += 10;
            updateWordRow();
            flashCanvas('rgba(74,155,94,0.55)', 200);
            if (collected.length === target.length) {
              won = true;
              if (window.SS) {
                window.SS.awardStar('word-run-cleared');
                window.SS.setWordRunHigh(score);
              }
              setTimeout(() => {
                running = false;
                host.querySelector('#wr-hint').textContent = 'Word complete!';
              }, 200);
            }
          } else {
            // mistake — visible penalty
            score -= 5;
            mistakes++;
            flashCanvas('rgba(194,90,90,0.65)', 280);
            scoreEl.style.color = '#C25A5A';
            setTimeout(() => scoreEl.style.color = '', 350);
          }
          scoreEl.textContent = 'Score ' + score + (mistakes ? ` · ${mistakes} miss${mistakes === 1 ? '' : 'es'}` : '');
        }
      });

      // cull
      items = items.filter(it => (it.x - scrollX) > -60);

      draw();
      requestAnimationFrame(step);
    };

    const jump = () => {
      if (!player.jumping) { player.jumping = true; player.vy = -12; }
    };

    canvas.addEventListener('click', jump);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); });
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    document.addEventListener('keydown', onKey);

    host.querySelector('#wr-restart').onclick = () => {
      collected = ''; score = 0; items = []; scrollX = 0; running = true;
      mistakes = 0; neededSpawnedFor = -1; nextNeededAtX = 0; lastSpawnX = 0;
      scoreEl.textContent = 'Score 0';
      updateWordRow();
      step();
    };
    host.querySelector('#wr-finish').onclick = () => {
      running = false;
      document.removeEventListener('keydown', onKey);
      complete(block.id, { score, completed: won });
    };

    updateWordRow();
    step();
  }

  // ============================================================
  // SPELLING — reuse old flash-and-type logic
  // ============================================================
  function spelling(host, block) {
    const words = block.words || day().spelling.slice(0, 5);
    let i = 0, right = 0, missed = [];

    const render = () => {
      const w = words[i];
      host.innerHTML = `
        ${topRail(78, `${i + 1} / ${words.length}`)}
        ${moduleHead('Spelling · words from today\'s reading', 'Lock it in')}
        <div class="spelling-stage module-narrow">
          <div class="spelling-progress">
            ${words.map((_, idx) => `<span class="spelling-pip ${idx < i ? (missed.includes(idx) ? 'missed' : 'done') : idx === i ? 'active' : ''}"></span>`).join('')}
          </div>
          <div class="spelling-flash" id="sp-flash"><div class="hint">Get ready</div></div>
          <div class="spelling-input-stage" id="sp-iwrap">
            <label>Spell it</label>
            <input class="spelling-input" id="sp-i" autocomplete="off" spellcheck="false" />
            <div class="spelling-result" id="sp-r"></div>
            <button class="btn-primary" id="sp-next">Next</button>
          </div>
        </div>
      `;
      const flash = host.querySelector('#sp-flash');
      const iWrap = host.querySelector('#sp-iwrap');
      const input = host.querySelector('#sp-i');
      const result = host.querySelector('#sp-r');
      const nextBtn = host.querySelector('#sp-next');

      let countdown = 3;
      const cd = () => {
        if (countdown > 0) {
          flash.innerHTML = `<div class="countdown">${countdown}</div>`;
          countdown--;
          setTimeout(cd, 600);
        } else {
          flash.innerHTML = `<div class="word">${w}</div>`;
          setTimeout(() => {
            flash.innerHTML = `<div class="hint">Type what you saw</div>`;
            iWrap.classList.add('show');
            input.focus();
          }, 1400);
        }
      };
      cd();

      input.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const ans = input.value.trim().toLowerCase();
        const correct = ans === w.toLowerCase();
        result.classList.add('show', correct ? 'right' : 'miss');
        result.textContent = correct ? 'Nailed it.' : `Close. It was "${w}".`;
        if (window.SS) window.SS.recordSpelling(w, correct);
        if (correct) right++; else missed.push(i);
      };
      nextBtn.onclick = () => {
        i++;
        if (i >= words.length) {
          if (right === words.length && window.SS) window.SS.awardStar('spelling-round-perfect');
          complete(block.id, { right, total: words.length, missed });
        } else {
          render();
        }
      };
    };
    render();
  }

  // ============================================================
  // TILES — reuse from v1 prototype, parameterized
  // ============================================================
  function tiles(host, block) {
    // Resolve the list of {word, clue} pairs this block should use.
    // Three modes:
    //  - block.count: 10 → randomly pull N from pool
    //  - block.words: ['studio', 'robux'] → look up in pool (legacy strings)
    //  - block.words: [{word, clue}, ...] → use as-is
    // Pool: block.tileVocab > day().tileVocab — per-block override lets each
    // subject session use its own word list (math vocab, photo terms, etc).
    const pool = (block && block.tileVocab) || day().tileVocab || [];
    const lookupClue = (w) => (pool.find(t => t.word === w) || { clue: 'From today\'s reading' }).clue;
    let wordList;
    if (block.count) {
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      wordList = shuffled.slice(0, Math.min(block.count, pool.length));
    } else if (Array.isArray(block.words)) {
      wordList = block.words.map(w => typeof w === 'string' ? { word: w, clue: lookupClue(w) } : w);
    } else {
      wordList = [{ word: 'robux', clue: lookupClue('robux') }];
    }
    let wordIdx = 0;
    let placed = [];
    let blockRight = 0;

    const PTS = { a:1,b:3,c:3,d:2,e:1,f:4,g:2,h:4,i:1,j:8,k:5,l:1,m:3,n:1,o:1,p:3,q:10,r:1,s:1,t:1,u:1,v:4,w:4,x:8,y:4,z:10 };

    const PREVIEW_MS = 3500;  // how long he sees the word before tiles appear

    const render = () => {
      const target = wordList[wordIdx].word;
      const clue = wordList[wordIdx].clue;
      placed = [];

      // build the letter pool: target letters + 3 distractors
      const letterPool = target.toUpperCase().split('');
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      while (letterPool.length < target.length + 3) {
        const r = alphabet[Math.floor(Math.random() * 26)];
        if (!letterPool.includes(r)) letterPool.push(r);
      }
      // shuffle
      for (let i = letterPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letterPool[i], letterPool[j]] = [letterPool[j], letterPool[i]];
      }

      // PREVIEW PHASE — flash the word so he's SPELLING, not guessing
      // Patrik observed Ethan guessing words from clues alone. Showing the
      // word first turns this into spelling practice (the actual goal).
      host.innerHTML = `
        ${topRail(50 + (wordIdx / wordList.length) * 30, `${wordIdx + 1} / ${wordList.length}`)}
        ${moduleHead('Word Tiles · vocab from today\'s reading', 'Lock it in')}
        <div class="tiles-stage">
          <div class="tiles-prompt" data-dict>
            <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-2);">Word ${wordIdx + 1} of ${wordList.length} — memorize it</div>
            <div style="font-family: var(--font-serif); font-size: 48px; font-weight: 500; line-height: 1; letter-spacing: 0.04em; text-align: center; color: var(--ink); margin: var(--space-5) 0;">${target}</div>
            <div style="font-family: var(--font-serif); font-size: 16px; line-height: 1.4; color: var(--ink-soft); text-align: center; font-style: italic;">${clue}</div>
            <div style="text-align: center; font-size: 12px; color: var(--ink-quiet); margin-top: var(--space-3);">Tiles in a moment...</div>
          </div>
        </div>
      `;

      // After preview, transition to the tile-building phase
      setTimeout(() => renderTiles(target, clue, letterPool), PREVIEW_MS);
    };

    const renderTiles = (target, clue, letterPool) => {

      host.innerHTML = `
        ${topRail(50 + (wordIdx / wordList.length) * 30, `${wordIdx + 1} / ${wordList.length}`)}
        ${moduleHead('Word Tiles · vocab from today\'s reading', 'Build the word')}
        <div class="tiles-stage">
          <div class="tiles-prompt" data-dict>
            <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-2);">Clue</div>
            <div style="font-family: var(--font-serif); font-size: 19px; line-height: 1.4; color: var(--ink); margin-bottom: var(--space-3);">${clue}</div>
            <div style="font-size: 13px; color: var(--ink-quiet);"><strong>${target.length} letters.</strong> Tap tiles to build the word.</div>
          </div>
          <div class="tiles-tray" id="tt-tray"></div>
          <div class="tiles-pool" id="tt-pool">
            ${letterPool.map((l, i) => `<button class="tile" data-i="${i}" data-l="${l}">${l}<span class="pts">${PTS[l.toLowerCase()] || ''}</span></button>`).join('')}
          </div>
          <div class="tiles-actions">
            <button class="btn-secondary" id="tt-clear">Clear</button>
            <button class="btn-primary" id="tt-submit">Submit</button>
          </div>
        </div>
      `;

      const tray = host.querySelector('#tt-tray');
      const pool_el = host.querySelector('#tt-pool');

      pool_el.querySelectorAll('.tile').forEach(t => {
        t.onclick = () => {
          if (t.classList.contains('placed')) return;
          t.classList.add('placed');
          const c = t.cloneNode(true);
          c.classList.remove('placed');
          c.onclick = () => { t.classList.remove('placed'); c.remove(); tray.classList.toggle('full', tray.children.length > 0); };
          tray.appendChild(c);
          tray.classList.add('full');
        };
      });
      host.querySelector('#tt-clear').onclick = () => Array.from(tray.querySelectorAll('.tile')).forEach(c => c.click());
      host.querySelector('#tt-submit').onclick = () => {
        const made = Array.from(tray.querySelectorAll('.tile')).map(t => t.dataset.l).join('').toLowerCase();
        if (made === target.toLowerCase()) {
          blockRight++;
          if (window.SS) window.SS.awardStar('legacy-zero');
          wordIdx++;
          if (wordIdx >= wordList.length) {
            complete(block.id, { right: blockRight, total: wordList.length, words: wordList.map(w => w.word) });
          } else {
            render();
          }
        } else {
          tray.style.background = '#FBEDED';
          setTimeout(() => tray.style.background = '', 500);
        }
      };
    };
    render();
  }

  // ============================================================
  // SPEED-READ — reuse RSVP logic
  // ============================================================
  function speedread(host, block) {
    // Per-block override: block.passage = { paragraphs: [], srComprehension: [] }
    // lets each subject session run its own speed-read on its own text.
    const passage = (block && block.passage) || day().passage;
    const words = passage.paragraphs.join(' ').split(/\s+/);
    const srQuiz = passage.srComprehension || [];
    let idx = 0, playing = false, timer = null;
    let stage = 'read';  // 'read' or 'quiz'

    const renderReader = () => {
      host.innerHTML = `
        ${topRail(55, '0 / ' + words.length)}
        ${moduleHead('Speed-Read · today\'s passage, one word at a time', 'Read fast — quiz after')}
        <div class="speedread-stage module-narrow">
          <div class="speedread-word" id="sr-w">Ready?</div>
          <div class="speedread-controls">
            <div class="speedread-wpm">
              <span>Words per minute</span>
              <span class="value" id="sr-v">240</span>
            </div>
            <input class="speedread-slider" type="range" min="120" max="500" step="20" value="240" id="sr-s" />
            <div class="speedread-actions">
              <button class="btn-secondary" id="sr-reset">Reset</button>
              <button class="btn-amber" id="sr-tog">Start</button>
            </div>
            <div class="center-actions" style="padding:0;">
              <button class="btn-primary" id="sr-toquiz" disabled style="opacity:0.5;">Finish reading to unlock quiz</button>
            </div>
          </div>
        </div>
      `;

      const w = host.querySelector('#sr-w');
      const v = host.querySelector('#sr-v');
      const s = host.querySelector('#sr-s');
      const tog = host.querySelector('#sr-tog');
      const toq = host.querySelector('#sr-toquiz');

      const pivot = (word) => {
        const len = word.length;
        const i = Math.min(Math.max(0, Math.floor(len * 0.35)), len - 1);
        return word.slice(0, i) + `<span class="pivot">${word[i]}</span>` + word.slice(i + 1);
      };
      const show = (word) => w.innerHTML = pivot(word);

      const tick = () => {
        if (idx >= words.length) {
          playing = false; w.innerHTML = `<span style="color: var(--amber);">Done.</span>`;
          tog.textContent = 'Run again';
          toq.disabled = false; toq.style.opacity = '1'; toq.textContent = 'Take the quiz';
          if (window.SS) window.SS.awardStar('legacy-zero');
          return;
        }
        const wd = words[idx++];
        show(wd);
        const wpm = parseInt(s.value, 10);
        const base = 60000 / wpm;
        const punct = /[.,;:!?]$/.test(wd);
        timer = setTimeout(tick, punct ? base * 1.8 : base);
      };

      tog.onclick = () => {
        if (playing) { playing = false; clearTimeout(timer); tog.textContent = 'Resume'; }
        else { playing = true; tog.textContent = 'Pause'; if (idx >= words.length) idx = 0; tick(); }
      };
      s.oninput = () => v.textContent = s.value;
      host.querySelector('#sr-reset').onclick = () => { idx = 0; show('Ready?'); playing = false; clearTimeout(timer); tog.textContent = 'Start'; toq.disabled = true; toq.style.opacity = '0.5'; toq.textContent = 'Finish reading to unlock quiz'; };
      toq.onclick = () => { clearTimeout(timer); stage = 'quiz'; renderQuiz(); };
    };

    const renderQuiz = () => {
      host.innerHTML = `
        ${topRail(60, 'quiz')}
        ${moduleHead('Speed-Read', 'What did you read?')}
        <div class="reading-layout" style="grid-template-columns: 1fr;">
          <aside class="questions">
            <h4>Comprehension · need 2 of ${srQuiz.length}</h4>
            ${srQuiz.map((q, i) => `
              <div class="q-item" data-q="${i}">
                <div class="q-prompt">${q.q}</div>
                <div class="q-choices">
                  ${q.choices.map((c, j) => `<button class="q-choice" data-i="${j}">${c}</button>`).join('')}
                </div>
              </div>
            `).join('')}
            <div id="sr-gate" style="margin-top: var(--space-3); font-family: var(--font-serif); font-size: 14px; color: var(--ink-quiet);"></div>
          </aside>
        </div>
        <div class="center-actions sticky-cta">
          <button class="btn-primary" id="sr-done" disabled style="opacity:0.5;">Answer the questions first</button>
        </div>
      `;

      const doneBtn = host.querySelector('#sr-done');
      const gate = host.querySelector('#sr-gate');
      let answered = 0, attempted = 0;
      const required = 2;

      const updateGate = () => {
        if (attempted < srQuiz.length) { gate.textContent = `${attempted} of ${srQuiz.length}`; return; }
        if (answered >= required) {
          gate.textContent = `${answered} of ${srQuiz.length} — passed!`;
          gate.style.color = '#2D6B3C';
          doneBtn.disabled = false; doneBtn.style.opacity = '1';
          doneBtn.textContent = 'I\'m done';
        } else {
          gate.textContent = `${answered} of ${srQuiz.length} — need ${required}. Re-read at slower WPM.`;
          gate.style.color = '#8B3838';
          // send back to reader for re-read
          setTimeout(() => { stage = 'read'; idx = 0; renderReader(); }, 2500);
        }
      };

      host.querySelectorAll('.q-item').forEach((item, idx) => {
        item.querySelectorAll('.q-choice').forEach(btn => {
          btn.onclick = () => {
            if (item.dataset.locked) return;
            const i = parseInt(btn.dataset.i, 10);
            const correct = srQuiz[idx].right === i;
            btn.classList.add(correct ? 'correct' : 'wrong');
            item.dataset.locked = '1';
            if (correct) answered++;
            attempted++;
            updateGate();
          };
        });
      });

      doneBtn.onclick = () => {
        if (doneBtn.disabled) return;
        if (answered === srQuiz.length && window.SS) window.SS.awardStar('speedread-comp-perfect');
        complete(block.id, { wordsRead: idx, comprehension: answered });
      };
    };

    renderReader();
  }

  // ============================================================
  // VIDEO — locked YT embed + heavy quiz
  // (placeholder — real video IDs + quizzes get plugged via curriculum)
  // ============================================================
  function video(host, block) {
    const v = block.video || day().topicVideo || {
      title: 'How a Roblox studio actually ships a game',
      ytId: 'KdaCdfXMSCk',
      questions: [
        { q: "About how many people are typically on a small Roblox studio team?", a: ['1 person', '2-6 people', '50+ people'], right: 1 },
        { q: "What's one of the biggest costs for a Roblox studio?", a: ['Server fees', "Their developers' time", 'Roblox license'], right: 1 }
      ]
    };
    let finished = false;

    const summaryHtml = (v.summary || []).map(p => `<p>${p}</p>`).join('');
    host.innerHTML = `
      ${topRail(45, 'video')}
      ${moduleHead('Video', v.title)}
      <div class="reading-layout" style="grid-template-columns: 1fr;">
        <div style="background: #000; border-radius: var(--r-md); overflow: hidden; aspect-ratio: 16 / 9; position: relative;" id="vid-stage">
          <iframe id="vid-iframe" style="width:100%; height:100%; border:0;"
            src="https://www.youtube.com/embed/${v.ytId}?rel=0&modestbranding=1&controls=1&fs=0&enablejsapi=1&disablekb=1&iv_load_policy=3"
            allow="accelerometer; encrypted-media; gyroscope"></iframe>
        </div>
        <div id="vid-summary" style="display:none;" data-dict>
          <div class="passage" style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-top: var(--space-3); box-shadow: var(--shadow-card);">
            <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Today's lesson</div>
            <h3 style="font-family: var(--font-serif); font-weight:500; font-size:24px; line-height:1.2; margin-bottom: var(--space-4);">${v.title}</h3>
            ${summaryHtml || '<p>Lesson summary is being prepared.</p>'}
            <p style="margin-top: var(--space-4); font-size: 13px; color: var(--ink-quiet); font-style: italic;">Tap or hover any word for its definition.</p>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); color: var(--ink-quiet); font-size: 13px;">
          <span id="vid-hint">Watch the whole video — quiz after.</span>
          <button class="btn-secondary" id="vid-skip">Skip to quiz</button>
        </div>
        <div id="vid-quiz" style="display:none;">
          <div class="questions">
            <h4>Quiz · what did you learn? · need ${Math.max(1, v.questions.length - 1)} of ${v.questions.length}</h4>
            ${v.questions.map((q, qi) => `
              <div class="q-item" data-q="${qi}">
                <div class="q-prompt">${q.q}</div>
                <div class="q-choices">
                  ${q.a.map((c, ci) => `<button class="q-choice" data-i="${ci}">${c}</button>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div id="vid-gate" style="margin-top: var(--space-3); font-family: var(--font-serif); font-size: 14px; color: var(--ink-quiet);"></div>
          <div class="center-actions sticky-cta" style="padding: var(--space-5) 0 0;">
            <button class="btn-primary" id="vid-done" disabled style="opacity:0.5;">Answer the questions first</button>
          </div>
        </div>
      </div>
    `;

    const showQuiz = () => {
      if (finished) return; finished = true;
      host.querySelector('#vid-quiz').style.display = 'block';
      host.querySelector('#vid-stage').style.display = 'none';
      host.querySelector('#vid-skip').style.display = 'none';
      const summary = host.querySelector('#vid-summary');
      // keep summary visible above the quiz so he can re-read while answering
      if (summary && summary.style.display === 'block') {
        // good — summary stays in view
      }

      const doneBtn = host.querySelector('#vid-done');
      const gate = host.querySelector('#vid-gate');
      let answered = 0, right = 0, attempted = 0;
      const required = Math.max(1, v.questions.length - 1);

      const updateGate = () => {
        if (attempted < v.questions.length) { gate.textContent = `${attempted} of ${v.questions.length}`; return; }
        if (right >= required) {
          gate.textContent = `${right} of ${v.questions.length} — passed!`;
          gate.style.color = '#2D6B3C';
          doneBtn.disabled = false; doneBtn.style.opacity = '1';
          doneBtn.textContent = 'Done';
        } else {
          gate.textContent = `${right} of ${v.questions.length} — need ${required}. Try again.`;
          gate.style.color = '#8B3838';
          host.querySelectorAll('.q-item').forEach(item => {
            item.querySelectorAll('.q-choice.wrong').forEach(b => b.classList.remove('wrong'));
            delete item.dataset.locked;
          });
          attempted = 0; right = 0;
          setTimeout(() => { gate.textContent = ''; gate.style.color = ''; }, 3500);
        }
      };

      v.questions.forEach((q, qi) => {
        const item = host.querySelector(`[data-q="${qi}"]`);
        item.querySelectorAll('.q-choice').forEach(btn => {
          btn.onclick = () => {
            if (item.dataset.locked) return;
            item.dataset.locked = '1';
            const i = parseInt(btn.dataset.i, 10);
            const ok = i === q.right;
            btn.classList.add(ok ? 'correct' : 'wrong');
            if (ok) right++;
            answered++;
            attempted++;
            updateGate();
          };
        });
      });
      doneBtn.onclick = () => {
        if (doneBtn.disabled) return;
        if (right === v.questions.length && window.SS) window.SS.awardStar('video-quiz-perfect');
        complete(block.id, { right, total: v.questions.length });
      };
    };

    // visible "skip to quiz" — for when video won't load (private, age-gated, etc)
    host.querySelector('#vid-skip').onclick = showQuiz;

    // If the embed fails (101/150/153 = creator disabled embedding), hide the
    // iframe and reveal the written summary in its place. He learns from the
    // text. Never sends him to YouTube proper (rabbit-hole risk).
    const showEmbedError = () => {
      const stage = host.querySelector('#vid-stage');
      const summary = host.querySelector('#vid-summary');
      const hint = host.querySelector('#vid-hint');
      const skipBtn = host.querySelector('#vid-skip');
      // flip the screen from "VIDEO" framing to "READ THIS" framing — no
      // empty player, no broken-video confusion. Hide stage, show summary,
      // update eyebrow, drop the duplicated title in the summary card.
      if (stage) stage.style.display = 'none';
      if (summary) summary.style.display = 'block';
      const eyebrow = host.querySelector('.module-head .eyebrow');
      if (eyebrow) eyebrow.textContent = "Today's lesson";
      const dupTitle = summary && summary.querySelector('h3');
      if (dupTitle) dupTitle.style.display = 'none';
      const lessonEyebrow = summary && summary.querySelector('div[style*="amber"]');
      if (lessonEyebrow) lessonEyebrow.style.display = 'none';
      if (hint) hint.innerHTML = "Read the lesson above, then tap Continue.";
      if (skipBtn) {
        skipBtn.className = 'btn-amber';
        skipBtn.textContent = 'Continue → take the quiz';
        skipBtn.style.fontSize = '16px';
        skipBtn.style.padding = '14px 28px';
      }
    };
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const bind = () => {
      try {
        new window.YT.Player('vid-iframe', {
          events: {
            onStateChange: (e) => { if (e.data === 0) showQuiz(); },
            onError: (e) => {
              // 101 / 150 / 153 = embedding disabled by the channel owner
              if (e.data === 101 || e.data === 150 || e.data === 153) showEmbedError();
            }
          }
        });
      } catch (e) { console.warn(e); }
    };
    if (window.YT && window.YT.Player) bind();
    else window.onYouTubeIframeAPIReady = bind;

    // Belt and suspenders — if the iframe shows a YT error UI that bypasses
    // the API onError event (which happens for some 150/153 cases), the user
    // can always click the YouTube button and the skip button. They're both
    // always visible up top.
  }

  // ============================================================
  // MATH LESSON — new concept (video → comprehension → practice)
  // 7th grade Maricopa curriculum, one new concept per day
  // ============================================================
  function mathlesson(host, block) {
    const ml = day().mathLesson;
    // step controls which stage renders standalone (so each can be its own
    // module card). Default 'all' = legacy multi-stage flow.
    //   'video' → just the video, advance on end / skip
    //   'practice-1' → practice problems 0-1
    //   'practice-2' → practice problems 2-3
    //   'practice-3' → practice problem 4 + final reflection
    const step = block.step || 'all';
    let stage = 0;  // 0 = intro, 1 = video, 2 = comprehension, 3 = practice
    let cRight = 0, pRight = 0;
    let practiceIdx = 0;
    let cTotal = ml.questions.length;
    let pTotal = ml.practice.length;

    const renderIntro = () => {
      host.innerHTML = `
        ${topRail(42, 'concept ' + ml.number)}
        ${moduleHead('Math — 7th grade · concept #' + ml.number, ml.title)}
        <div class="math-stage">
          <div class="math-card" data-dict style="text-align:left;">
            <div style="font-size:11px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color: var(--amber); margin-bottom: var(--space-3);">${ml.domain}</div>
            <h3 style="font-family: var(--font-serif); font-weight:500; font-size:28px; line-height:1.2; margin-bottom: var(--space-3); color: var(--ink);">${ml.title}</h3>
            <p style="font-family: var(--font-serif); font-size:17px; line-height:1.55; color: var(--ink);">${ml.goal}</p>
          </div>
          <div class="center-actions" style="padding:0;">
            <button class="btn-primary" id="ml-go">Watch the lesson</button>
          </div>
        </div>
      `;
      host.querySelector('#ml-go').onclick = () => { stage = 1; renderVideo(); };
    };

    const renderVideo = () => {
      const summaryHtml = (ml.summary || []).map(p => `<p>${p}</p>`).join('');
      host.innerHTML = `
        ${topRail(48, 'lesson video')}
        ${moduleHead('Math · ' + ml.title, 'Watch — quiz after')}
        <div class="reading-layout" style="grid-template-columns: 1fr;">
          <div style="background: #000; border-radius: var(--r-md); overflow: hidden; aspect-ratio: 16 / 9; position: relative;" id="ml-vid-stage">
            <iframe id="ml-vid" style="width:100%; height:100%; border:0;"
              src="https://www.youtube.com/embed/${ml.videoId}?rel=0&modestbranding=1&controls=1&fs=0&enablejsapi=1&disablekb=1&iv_load_policy=3"
              allow="accelerometer; encrypted-media; gyroscope"></iframe>
          </div>
          <div id="ml-summary" style="display:none;" data-dict>
            <div class="passage" style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-top: var(--space-3); box-shadow: var(--shadow-card);">
              <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Lesson · ${ml.domain}</div>
              <h3 style="font-family: var(--font-serif); font-weight:500; font-size:24px; line-height:1.2; margin-bottom: var(--space-4);">${ml.title}</h3>
              ${summaryHtml || '<p>Lesson summary is being prepared.</p>'}
              <p style="margin-top: var(--space-4); font-size: 13px; color: var(--ink-quiet); font-style: italic;">Tap or hover any word for its definition.</p>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); color: var(--ink-quiet); font-size: 13px;">
            <span id="ml-hint">Watch the whole thing. Quiz starts when it ends.</span>
            <button class="btn-secondary" id="ml-skip">Skip to quiz</button>
          </div>
        </div>
      `;
      const advance = () => { stage = 2; renderQuiz(); };
      host.querySelector('#ml-skip').onclick = advance;

      const showEmbedError = () => {
        const stg = host.querySelector('#ml-vid-stage');
        const summary = host.querySelector('#ml-summary');
        const hint = host.querySelector('#ml-hint');
        const skipBtn = host.querySelector('#ml-skip');
        if (stg) stg.style.display = 'none';
        if (summary) summary.style.display = 'block';
        const eyebrow = host.querySelector('.module-head .eyebrow');
        if (eyebrow) eyebrow.textContent = "Today's lesson";
        const dupTitle = summary && summary.querySelector('h3');
        if (dupTitle) dupTitle.style.display = 'none';
        const lessonEyebrow = summary && summary.querySelector('div[style*="amber"]');
        if (lessonEyebrow) lessonEyebrow.style.display = 'none';
        if (hint) hint.innerHTML = "Read the lesson above, then tap Continue.";
        if (skipBtn) {
          skipBtn.className = 'btn-amber';
          skipBtn.textContent = 'Continue → take the quiz';
          skipBtn.style.fontSize = '16px';
          skipBtn.style.padding = '14px 28px';
        }
      };

      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const bind = () => {
        try {
          new window.YT.Player('ml-vid', {
            events: {
              onStateChange: (e) => { if (e.data === 0) advance(); },
              onError: (e) => {
                if (e.data === 101 || e.data === 150 || e.data === 153) showEmbedError();
              }
            }
          });
        } catch (e) {}
      };
      if (window.YT && window.YT.Player) bind();
      else window.onYouTubeIframeAPIReady = bind;
    };

    const renderQuiz = () => {
      host.innerHTML = `
        ${topRail(54, 'comprehension')}
        ${moduleHead('Math · ' + ml.title, 'Did it land?')}
        <div class="reading-layout" style="grid-template-columns: 1fr;">
          <div class="questions">
            <h4>Comprehension · ${cTotal} questions</h4>
            ${ml.questions.map((q, i) => `
              <div class="q-item" data-q="${i}">
                <div class="q-prompt">${q.q}</div>
                <div class="q-choices">
                  ${q.a.map((c, j) => `<button class="q-choice" data-i="${j}">${c}</button>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="center-actions" style="padding: var(--space-4) 0 0; justify-content: center;">
            <button class="btn-primary" id="ml-q-done">On to practice</button>
          </div>
        </div>
      `;
      ml.questions.forEach((q, qi) => {
        const item = host.querySelector(`[data-q="${qi}"]`);
        item.querySelectorAll('.q-choice').forEach(btn => {
          btn.onclick = () => {
            if (item.dataset.locked) return;
            item.dataset.locked = '1';
            const i = parseInt(btn.dataset.i, 10);
            const ok = i === q.right;
            btn.classList.add(ok ? 'correct' : 'wrong');
            if (ok) cRight++;
          };
        });
      });
      host.querySelector('#ml-q-done').onclick = () => { stage = 3; renderPractice(); };
    };

    const renderPractice = () => {
      const prob = ml.practice[practiceIdx];
      host.innerHTML = `
        ${topRail(70 + (practiceIdx / pTotal) * 20, 'practice ' + (practiceIdx + 1) + ' / ' + pTotal)}
        ${moduleHead('Math · ' + ml.title, 'Try it yourself')}
        <div class="math-stage">
          <div class="math-card">
            <div style="font-family: var(--font-serif); font-size: 22px; color: var(--ink); margin-bottom: var(--space-5); line-height: 1.4;">${prob.p}</div>
            <input class="math-input" id="ml-p-i" type="number" step="any" autocomplete="off" />
            <div style="margin-top: var(--space-3); font-size: 13px; color: var(--ink-quiet);">${prob.unit || ''}</div>
          </div>
          <div class="math-meta">
            <div>Problem <span class="v">${practiceIdx + 1}</span> of ${pTotal}</div>
            <div>Right: <span class="v">${pRight}</span></div>
          </div>
          <div class="center-actions" style="padding: 0; justify-content: center;">
            <button class="btn-amber" id="ml-p-check">Check</button>
          </div>
          <div id="ml-p-feedback" style="text-align: center; font-family: var(--font-serif); font-size: 18px; margin-top: var(--space-3);"></div>
        </div>
      `;
      const input = host.querySelector('#ml-p-i');
      const check = host.querySelector('#ml-p-check');
      const fb = host.querySelector('#ml-p-feedback');
      const next = () => {
        practiceIdx++;
        if (practiceIdx >= pTotal) {
          if (pRight === pTotal && window.SS) window.SS.awardStar('math-lesson-mastered');
          if (cRight + pRight >= (cTotal + pTotal - 1) && window.SS) window.SS.awardStar('math-lesson-mastered');
          complete(block.id, { concept: ml.number, comprehension: cRight, practice: pRight });
          return;
        }
        renderPractice();
      };
      check.onclick = () => {
        const v = parseFloat(input.value);
        if (Math.abs(v - prob.a) < 0.001) {
          pRight++;
          fb.textContent = 'Correct.';
          fb.style.color = '#2D6B3C';
        } else {
          fb.textContent = `Not quite — answer was ${prob.a}${prob.unit || ''}`;
          fb.style.color = '#8B3838';
        }
        check.textContent = 'Next';
        check.onclick = next;
      };
      input.onkeydown = (e) => { if (e.key === 'Enter') check.click(); };
      setTimeout(() => input.focus(), 100);
    };

    // Standalone step renderers — each one is its own block card
    const renderVideoOnly = () => {
      const summaryHtml = (ml.summary || []).map(p => `<p>${p}</p>`).join('');
      host.innerHTML = `
        ${topRail(0, 'lesson video')}
        ${moduleHead('Math · ' + ml.title, 'Watch the video')}
        <div class="reading-layout" style="grid-template-columns: 1fr;">
          <div style="background: #000; border-radius: var(--r-md); overflow: hidden; aspect-ratio: 16 / 9; position: relative;" id="ml-vid-stage">
            <iframe id="ml-vid" style="width:100%; height:100%; border:0;"
              src="https://www.youtube.com/embed/${ml.videoId}?rel=0&modestbranding=1&controls=1&fs=0&enablejsapi=1&disablekb=1&iv_load_policy=3"
              allow="accelerometer; encrypted-media; gyroscope"></iframe>
          </div>
          <div id="ml-summary" style="display:none;" data-dict>
            <div class="passage" style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-top: var(--space-3); box-shadow: var(--shadow-card);">
              <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Lesson · ${ml.domain}</div>
              ${summaryHtml || '<p>Lesson summary is being prepared.</p>'}
            </div>
          </div>
          <div class="center-actions">
            <button class="btn-primary" id="ml-vid-done">Continue</button>
          </div>
        </div>
      `;
      startBlockTimer(host, block);
      const advance = () => complete(block.id, { budgetMinutes: block.minutes });
      host.querySelector('#ml-vid-done').onclick = advance;
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const bind = () => {
        try {
          new window.YT.Player('ml-vid', {
            events: {
              onError: (e) => {
                if (e.data === 101 || e.data === 150 || e.data === 153) {
                  const stg = host.querySelector('#ml-vid-stage');
                  const summary = host.querySelector('#ml-summary');
                  if (stg) stg.style.display = 'none';
                  if (summary) summary.style.display = 'block';
                }
              }
            }
          });
        } catch (e) {}
      };
      if (window.YT && window.YT.Player) bind();
      else window.onYouTubeIframeAPIReady = bind;
    };

    // Standalone practice subset — show N problems, then complete.
    const renderPracticeSubset = (startIdx, endIdx) => {
      const subset = ml.practice.slice(startIdx, endIdx);
      let localIdx = 0;
      let localRight = 0;
      const renderOne = () => {
        const prob = subset[localIdx];
        if (!prob) {
          if (localRight === subset.length && window.SS) window.SS.awardStar('math-quickfire-perfect');
          complete(block.id, { practice: localRight, total: subset.length, budgetMinutes: block.minutes });
          return;
        }
        host.innerHTML = `
          ${topRail(0, 'practice ' + (localIdx + 1) + ' / ' + subset.length)}
          ${moduleHead('Math · ' + ml.title, 'Try it yourself')}
          <div class="math-stage">
            <div class="math-card">
              <div style="font-family: var(--font-serif); font-size: 22px; color: var(--ink); margin-bottom: var(--space-5); line-height: 1.4;">${prob.p}</div>
              <input class="math-input" id="ml-p-i" type="number" step="any" autocomplete="off" />
              <div style="margin-top: var(--space-3); font-size: 13px; color: var(--ink-quiet);">${prob.unit || ''}</div>
            </div>
            <div class="math-meta">
              <div>Problem <span class="v">${localIdx + 1}</span> of ${subset.length}</div>
              <div>Right: <span class="v">${localRight}</span></div>
            </div>
            <div class="center-actions">
              <button class="btn-amber" id="ml-p-check">Check</button>
            </div>
            <div id="ml-p-feedback" style="text-align: center; font-family: var(--font-serif); font-size: 18px; margin-top: var(--space-3);"></div>
          </div>
        `;
        startBlockTimer(host, block);
        const input = host.querySelector('#ml-p-i');
        const check = host.querySelector('#ml-p-check');
        const fb = host.querySelector('#ml-p-feedback');
        const goNext = () => { localIdx++; renderOne(); };
        check.onclick = () => {
          const v = parseFloat(input.value);
          if (Math.abs(v - prob.a) < 0.001) {
            localRight++;
            fb.textContent = 'Correct.';
            fb.style.color = '#2D6B3C';
          } else {
            fb.textContent = `Not quite — answer was ${prob.a}${prob.unit || ''}`;
            fb.style.color = '#8B3838';
          }
          check.textContent = localIdx === subset.length - 1 ? 'Done' : 'Next';
          check.onclick = goNext;
        };
        input.onkeydown = (e) => { if (e.key === 'Enter') check.click(); };
        setTimeout(() => input.focus(), 100);
      };
      renderOne();
    };

    // Standalone concept quiz — N questions, then complete.
    const renderConceptQuiz = (qIndices) => {
      const qs = qIndices.map(i => ml.questions[i]).filter(Boolean);
      host.innerHTML = `
        ${topRail(0, 'comprehension')}
        ${moduleHead('Math · ' + ml.title, 'Did it land?')}
        <div class="reading-layout" style="grid-template-columns: 1fr;">
          <div class="questions">
            <h4>${qs.length} question${qs.length === 1 ? '' : 's'}</h4>
            ${qs.map((q, i) => `
              <div class="q-item" data-q="${i}">
                <div class="q-prompt">${q.q}</div>
                <div class="q-choices">
                  ${q.a.map((c, j) => `<button class="q-choice" data-i="${j}">${c}</button>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="center-actions">
            <button class="btn-primary" id="ml-cq-done">Continue</button>
          </div>
        </div>
      `;
      startBlockTimer(host, block);
      let right = 0;
      qs.forEach((q, qi) => {
        const item = host.querySelector(`[data-q="${qi}"]`);
        item.querySelectorAll('.q-choice').forEach(btn => {
          btn.onclick = () => {
            if (item.dataset.locked) return;
            item.dataset.locked = '1';
            const i = parseInt(btn.dataset.i, 10);
            const ok = i === q.right;
            btn.classList.add(ok ? 'correct' : 'wrong');
            if (ok) right++;
          };
        });
      });
      host.querySelector('#ml-cq-done').onclick = () => {
        if (right === qs.length && window.SS) window.SS.awardStar('quiz-first-try');
        complete(block.id, { right, total: qs.length, budgetMinutes: block.minutes });
      };
    };

    if (step === 'video') return renderVideoOnly();
    if (step === 'practice-1') return renderPracticeSubset(0, 2);
    if (step === 'practice-2') return renderPracticeSubset(2, 4);
    if (step === 'practice-3') return renderPracticeSubset(4, ml.practice.length);
    if (step === 'q-1') return renderConceptQuiz([0]);
    if (step === 'q-23') return renderConceptQuiz([1, 2]);

    renderIntro();
  }

  // ============================================================
  // TRICK-ARC (new 2026-05-25 — Tuesday trick-of-the-day pedagogy)
  // Each block teaches a named trick for a subject he hates. 5 beats:
  // setup ("yesterday this was hard") → trick (named) → demo → try → showoff.
  // ============================================================
  function trickArc(host, block) {
    const tricks = day().tricks || {};
    const t = tricks[block.trickKey];
    if (!t) {
      host.innerHTML = `${topRail(0, 'trick')}${moduleHead('Trick', block.title)}
        <div style="padding: var(--space-7) var(--space-5);">No trick data for key "${block.trickKey}".</div>
        <div class="center-actions"><button class="btn-primary" id="t-skip">Skip</button></div>`;
      host.querySelector('#t-skip').onclick = () => { complete(block.id); next(); };
      return;
    }
    host.innerHTML = `
      ${topRail(0, t.subject || '')}
      ${moduleHead(t.subject || '', t.name)}
      <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">

        <div class="passage" data-dict style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-5) var(--space-5); margin-bottom: var(--space-4); border-left: 3px solid #8B3838;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8B3838; margin-bottom: var(--space-2);">The hard part</div>
          <p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.45;">${t.hatedBecause}</p>
        </div>

        <div class="passage" data-dict style="background: #FBF7EE; border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-bottom: var(--space-4); border-left: 4px solid var(--amber);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-2);">The move</div>
          <h3 style="font-family: var(--font-serif); font-weight:500; font-size:26px; line-height:1.2; margin-bottom: var(--space-3);">${t.name}</h3>
          <p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.55;">${t.trick}</p>
        </div>

        <div class="passage" data-dict style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-5) var(--space-5); margin-bottom: var(--space-4);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-quiet); margin-bottom: var(--space-2);">See it in action</div>
          <p style="font-family: var(--font-serif); font-size: 16px; line-height: 1.55; white-space: pre-wrap;">${t.demoText}</p>
        </div>

        <div class="passage" style="background: #FFF; border: 1px solid rgba(26,24,20,0.10); border-radius: var(--r-md); padding: var(--space-5); margin-bottom: var(--space-4);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-quiet); margin-bottom: var(--space-2);">Try it once</div>
          <p data-dict style="font-family: var(--font-serif); font-size: 17px; line-height: 1.45; margin-bottom: var(--space-3);">${t.tryPrompt}</p>
          <details style="margin-top: var(--space-3);">
            <summary style="cursor: pointer; font-size: 13px; color: var(--amber); font-weight: 600;">Show the answer hint</summary>
            <p style="margin-top: var(--space-2); font-size: 15px; color: var(--ink-soft); font-style: italic;">${t.tryAnswerHint || ''}</p>
          </details>
        </div>

        <div class="passage" data-dict style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-5); margin-bottom: var(--space-4); border-left: 4px solid #2D6B3C;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2D6B3C; margin-bottom: var(--space-2);">Now show off</div>
          <p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.45;">${t.showoffPrompt}</p>
          <p style="font-size: 13px; color: var(--ink-quiet); margin-top: var(--space-3); font-style: italic;">You'll use this again tomorrow. It sticks better that way.</p>
        </div>

        <div class="center-actions sticky-cta">
          <button class="btn-amber" id="tk-got-it">I got it — what's next</button>
        </div>
      </div>
    `;
    host.querySelector('#tk-got-it').onclick = () => { complete(block.id, { trick: t.name }); next(); };
  }

  // ============================================================
  // HANDWRITING (new 2026-05-25)
  // Print lines he copies on paper. Upload photo. Ships to Tell-Dad pipeline
  // so the photo lands in the mission room for parent review.
  // ============================================================
  function handwriting(host, block) {
    const h = day().handwriting;
    if (!h) {
      host.innerHTML = `${topRail(0, 'handwriting')}${moduleHead('Handwriting', block.title)}
        <div style="padding: var(--space-5);">No handwriting data for today.</div>
        <div class="center-actions"><button class="btn-primary" id="hw-skip">Skip</button></div>`;
      host.querySelector('#hw-skip').onclick = () => { complete(block.id); next(); };
      return;
    }
    host.innerHTML = `
      ${topRail(0, 'on paper')}
      ${moduleHead('Handwriting', h.title)}
      <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">

        <div class="passage" data-dict style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-5);">
          <p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.5;">${h.intro}</p>
        </div>

        <div style="margin: var(--space-5) 0; padding: var(--space-5); background: #FFF; border: 1px dashed rgba(26,24,20,0.25); border-radius: var(--r-md);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-quiet); margin-bottom: var(--space-3);">Copy these onto paper</div>
          ${(h.lines || []).map((line, i) => `
            <div style="font-family: var(--font-serif); font-size: 16px; line-height: 1.7; padding: var(--space-2) 0; border-bottom: 1px solid rgba(26,24,20,0.06);">
              <strong style="color: var(--amber); margin-right: 6px;">${i + 1}.</strong>${line}
            </div>
          `).join('')}
        </div>

        <p data-dict style="font-size: 14px; color: var(--ink-soft); font-style: italic; margin-bottom: var(--space-4);">${h.why || ''}</p>

        <div style="background: #FBF7EE; border: 2px dashed var(--amber); border-radius: var(--r-md); padding: var(--space-5); text-align: center; margin-bottom: var(--space-4);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Upload your page</div>
          <p style="font-family: var(--font-serif); font-size: 16px; margin-bottom: var(--space-4);">${h.showoffPrompt || 'Take a photo of your paper.'}</p>
          <input type="file" id="hw-photo" accept="image/*" capture="environment" style="display: none;" />
          <button class="btn-amber" id="hw-pick" style="font-size: 16px; padding: 14px 28px;">Pick a photo</button>
          <div id="hw-preview" style="margin-top: var(--space-4);"></div>
          <div id="hw-status" style="margin-top: var(--space-3); font-size: 14px; color: var(--ink-quiet);"></div>
        </div>

        <div class="center-actions sticky-cta">
          <button class="btn-amber" id="hw-done" disabled style="opacity:0.5;">Upload a photo first</button>
        </div>
      </div>
    `;
    const fileInput = host.querySelector('#hw-photo');
    const pickBtn = host.querySelector('#hw-pick');
    const preview = host.querySelector('#hw-preview');
    const status = host.querySelector('#hw-status');
    const doneBtn = host.querySelector('#hw-done');
    let chosenFile = null;

    pickBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      chosenFile = f;
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.innerHTML = `<img src="${ev.target.result}" style="max-width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid rgba(26,24,20,0.12);" />`;
        status.textContent = 'Looks good. Tap "Send to Dad" to submit.';
        doneBtn.disabled = false;
        doneBtn.style.opacity = '1';
        doneBtn.textContent = 'Send to Dad + Mom';
      };
      reader.readAsDataURL(f);
    };

    doneBtn.onclick = async () => {
      if (doneBtn.disabled || !chosenFile) return;
      doneBtn.disabled = true;
      doneBtn.textContent = 'Sending...';
      try {
        // base64-encode and POST to the embed pipeline
        const b64 = await new Promise(r => {
          const fr = new FileReader();
          fr.onload = (e) => r(e.target.result);
          fr.readAsDataURL(chosenFile);
        });
        let vid = localStorage.getItem('ss-dad-visitor-id');
        if (!vid) { vid = 'ethan_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('ss-dad-visitor-id', vid); }
        await fetch('/api/embed/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embed_id: 'emb_summerschool',
            visitor_id: vid,
            host_origin: location.origin,
            content: `[handwriting submitted — block: ${block.title}]\n\n${(h.lines || []).join('\n')}\n\n[Image attached as base64 below — too long to inline; saved locally to gallery]`,
            metadata: { kind: 'handwriting', block_id: block.id, image_size: chosenFile.size }
          })
        }).catch(() => {});
        // Save to local artifacts
        if (window.SS && window.SS.saveArtifact) {
          window.SS.saveArtifact({ kind: 'handwriting', block_id: block.id, image: b64, title: h.title });
        }
        if (window.SS) window.SS.awardStar('handwriting-uploaded', { block_id: block.id });
        status.textContent = 'Sent. Dad will see it.';
        setTimeout(() => { complete(block.id, { uploaded: true }); next(); }, 1200);
      } catch (e) {
        status.textContent = 'Saved locally. Network was off — Dad will see it next sync.';
        if (window.SS) window.SS.awardStar('handwriting-uploaded', { block_id: block.id });
        setTimeout(() => { complete(block.id, { uploaded: false }); next(); }, 1600);
      }
    };
  }

  // ============================================================
  // ROBLOX-LESSON (new 2026-05-25)
  // Tuesday: leaderboards. Text + 3-question quiz + AI seed footer.
  // ============================================================
  function robloxLesson(host, block) {
    const r = day().robloxLesson;
    if (!r) {
      host.innerHTML = `${topRail(0, 'roblox')}${moduleHead('Roblox', block.title)}
        <div style="padding: var(--space-5);">No lesson data.</div>
        <div class="center-actions"><button class="btn-primary" id="rl-skip">Skip</button></div>`;
      host.querySelector('#rl-skip').onclick = () => { complete(block.id); next(); };
      return;
    }
    host.innerHTML = `
      ${topRail(0, 'roblox dev')}
      ${moduleHead('Roblox', r.title)}
      <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">
        <div class="passage" data-dict style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5);">
          ${(r.paragraphs || []).map(p => `<p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.6; margin-bottom: var(--space-3);">${p}</p>`).join('')}
          <p style="margin-top: var(--space-4); font-size: 13px; color: var(--ink-quiet); font-style: italic;">Tap or hover any word for its definition.</p>
        </div>

        ${r.aiSeed ? `
          <div style="background: #FBF7EE; border-left: 4px solid #6B5BBF; border-radius: 0 var(--r-md) var(--r-md) 0; padding: var(--space-4) var(--space-5); margin: var(--space-4) 0;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #6B5BBF; margin-bottom: var(--space-2);">Heads up — AI angle</div>
            <p data-dict style="font-family: var(--font-serif); font-size: 16px; line-height: 1.55;">${r.aiSeed}</p>
          </div>
        ` : ''}

        <div class="questions" style="margin-top: var(--space-5);">
          <h4>Quick check · need ${Math.max(1, (r.questions || []).length - 1)} of ${(r.questions || []).length}</h4>
          ${(r.questions || []).map((q, qi) => `
            <div class="q-item" data-q="${qi}">
              <div class="q-prompt">${q.q}</div>
              <div class="q-choices">
                ${q.a.map((c, ci) => `<button class="q-choice" data-i="${ci}">${c}</button>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div id="rl-gate" style="margin-top: var(--space-3); font-family: var(--font-serif); font-size: 14px; color: var(--ink-quiet);"></div>

        <div class="center-actions sticky-cta">
          <button class="btn-primary" id="rl-done" disabled style="opacity:0.5;">Answer the questions first</button>
        </div>
      </div>
    `;

    const doneBtn = host.querySelector('#rl-done');
    const gate = host.querySelector('#rl-gate');
    const qs = r.questions || [];
    const required = Math.max(1, qs.length - 1);
    let attempted = 0, right = 0;

    const update = () => {
      if (attempted < qs.length) { gate.textContent = `${attempted} of ${qs.length} answered`; return; }
      if (right >= required) {
        gate.textContent = `${right} of ${qs.length} — passed!`;
        gate.style.color = '#2D6B3C';
        doneBtn.disabled = false; doneBtn.style.opacity = '1';
        doneBtn.textContent = 'Done';
      } else {
        gate.textContent = `${right} of ${qs.length} — need ${required}. Re-read and try again.`;
        gate.style.color = '#8B3838';
        host.querySelectorAll('.q-item').forEach(item => {
          item.querySelectorAll('.q-choice.wrong').forEach(b => b.classList.remove('wrong'));
          delete item.dataset.locked;
        });
        attempted = 0; right = 0;
        setTimeout(() => { gate.textContent = ''; gate.style.color = ''; }, 3500);
      }
    };

    qs.forEach((q, qi) => {
      const item = host.querySelector(`[data-q="${qi}"]`);
      item.querySelectorAll('.q-choice').forEach(btn => {
        btn.onclick = () => {
          if (item.dataset.locked) return;
          item.dataset.locked = '1';
          const i = parseInt(btn.dataset.i, 10);
          const ok = i === q.right;
          btn.classList.add(ok ? 'correct' : 'wrong');
          if (ok) right++;
          attempted++;
          update();
        };
      });
    });
    doneBtn.onclick = () => {
      if (doneBtn.disabled) return;
      if (right === qs.length && window.SS) window.SS.awardStar('quiz-first-try');
      complete(block.id, { right, total: qs.length });
    };
  }

  // ============================================================
  // REPORT CARD — end-of-day summary
  // Renders modules done, total time, fastest module, stars earned. Reads
  // from SS.todayMetrics(). Used as the splash block on every day.
  // ============================================================
  function reportCard(host, block) {
    const m = (window.SS && window.SS.todayMetrics()) || {};
    const blocks = (day().blocks || []).filter(b => b.kind !== 'drill' || ['welcome', 'splash', 'report-card'].indexOf(b.type) === -1);
    const allBlocks = day().blocks || [];
    const completed = m.completed || [];

    // Filter out frame blocks (welcome / report-card / splash) from the count
    // so "modules done" is the real module total.
    const isModule = (b) => b.type !== 'welcome' && b.type !== 'splash' && b.type !== 'report-card';
    const modules = allBlocks.filter(isModule);
    const doneModules = modules.filter(b => completed.includes(b.id));
    const totalCount = modules.length;
    const doneCount = doneModules.length;

    // Total time + fastest module
    const metrics = m.blockMetrics || {};
    let totalMs = 0;
    let fastest = null;
    Object.entries(metrics).forEach(([bid, mm]) => {
      if (mm.durationMs && mm.durationMs > 0) {
        totalMs += mm.durationMs;
        if (!fastest || mm.durationMs < fastest.durationMs) {
          const blk = allBlocks.find(b => b.id === bid);
          if (blk && isModule(blk)) fastest = { ...mm, title: blk.title, blockId: bid };
        }
      }
    });
    const totalMin = Math.round(totalMs / 60000);
    const fastestSec = fastest ? Math.max(1, Math.round(fastest.durationMs / 1000)) : null;

    // Pick a compliment based on speed + completion
    let compliment = '';
    if (doneCount === totalCount && totalCount > 0) {
      compliment = totalMin > 0 && totalMin < 90
        ? `That's a fast day, Ethan. ${doneCount} modules in ${totalMin} minutes.`
        : `Big day — ${doneCount} modules. Nice work, dude.`;
    } else {
      compliment = `${doneCount} of ${totalCount} modules done. Keep going.`;
    }

    host.innerHTML = `
      ${topRail(100, 'day report')}
      <div style="padding: var(--space-7) var(--space-5);">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">${day().day || 'today'} · report card</div>
        <h1 style="font-family: var(--font-serif); font-weight: 500; font-size: 36px; line-height: 1.1; margin-bottom: var(--space-5);">${compliment}</h1>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-6);">
          <div style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-5); box-shadow: var(--shadow-card);">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-quiet); margin-bottom: var(--space-2);">Modules</div>
            <div style="font-family: var(--font-serif); font-size: 38px; line-height: 1; color: var(--ink);">${doneCount}<span style="font-size:18px; color: var(--ink-quiet);"> / ${totalCount}</span></div>
          </div>
          <div style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-5); box-shadow: var(--shadow-card);">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-quiet); margin-bottom: var(--space-2);">Time on task</div>
            <div style="font-family: var(--font-serif); font-size: 38px; line-height: 1; color: var(--ink);">${totalMin}<span style="font-size:18px; color: var(--ink-quiet);"> min</span></div>
          </div>
          <div style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-5); box-shadow: var(--shadow-card); grid-column: span 2;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-quiet); margin-bottom: var(--space-2);">Fastest module</div>
            <div style="font-family: var(--font-serif); font-size: 22px; line-height: 1.15; color: var(--ink);">${fastest ? fastest.title : '—'}</div>
            ${fastest ? `<div style="font-size: 13px; color: var(--ink-quiet); margin-top: var(--space-2);">${fastestSec}s — fast.</div>` : ''}
          </div>
        </div>

        <div style="background: #FBF7EE; border-left: 4px solid var(--amber); border-radius: 0 var(--r-md) var(--r-md) 0; padding: var(--space-5) var(--space-6); margin-bottom: var(--space-6);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-2);">Streak</div>
          <div style="font-family: var(--font-serif); font-size: 19px; line-height: 1.45; color: var(--ink);">${(m.streak || 0)} day${(m.streak || 0) === 1 ? '' : 's'} in a row. ${(m.streak || 0) >= 2 ? 'Show up tomorrow.' : 'Keep showing up.'}</div>
        </div>

        <div class="center-actions">
          <button class="btn-primary" id="rc-done">${doneCount === totalCount ? 'Day complete — show Mom & Dad' : 'Done for now'}</button>
        </div>
      </div>
    `;
    host.querySelector('#rc-done').onclick = () => {
      if (doneCount === totalCount && window.SS) {
        window.SS.tickStreak();
        window.SS.awardStar('day-complete');
      }
      complete(block.id);
    };
  }

  // ============================================================
  // REVIEW MODAL (Patrik 2026-05-29 #5: accountability + verify-before-send)
  //
  // Every typed gate (teach-back, concept typed-check, video-typed) routes
  // through this before completing the block. He has to LOOK at his
  // answer and confirm "yes, send this to Mom and Dad to review."
  //
  // Shape:
  //   _showReviewModal({
  //     title: 'Ready for Mom & Dad?',
  //     answers: [{ q: 'prompt', body: 'his answer' }, ...],
  //     onEdit: () => {...},      // back to typing
  //     onConfirm: () => {...}   // commit + advance
  //   })
  // ============================================================
  function _showReviewModal(host, opts) {
    const answers = opts.answers || [];
    const title = opts.title || 'Ready for Mom & Dad?';
    const sub = opts.subtitle || 'Read your answer below. If it looks good, send it. If not, go back and fix it.';

    // Build the review card inside the existing host. Hide the rest by
    // wrapping all current children, then prepending the review.
    const existing = Array.from(host.children).map(el => el);

    const wrap = document.createElement('div');
    wrap.id = 'ss-review-modal';
    wrap.style.cssText = 'position:fixed; inset:0; background:rgba(26,24,20,0.55); display:flex; align-items:center; justify-content:center; z-index:9999; padding:var(--space-5);';

    const card = document.createElement('div');
    card.style.cssText = 'background:#FBFAF6; border-radius:var(--r-md); max-width:640px; width:100%; max-height:85vh; overflow-y:auto; padding:var(--space-6) var(--space-6); box-shadow:0 24px 60px rgba(0,0,0,0.35);';
    const answersHtml = answers.map((a, i) => `
      <div style="margin-bottom:var(--space-4); padding:var(--space-4); background:#FFF; border:1px solid rgba(26,24,20,0.10); border-radius:var(--r-sm);">
        ${a.q ? `<div style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--amber); margin-bottom:var(--space-2);">${answers.length > 1 ? 'Answer ' + (i + 1) : 'Your answer'}</div>` : ''}
        ${a.q ? `<div style="font-family:var(--font-serif); font-size:15px; line-height:1.45; color:var(--ink-soft); margin-bottom:var(--space-2);">${a.q}</div>` : ''}
        <div style="font-family:var(--font-serif); font-size:17px; line-height:1.55; color:var(--ink); white-space:pre-wrap;">${(a.body || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>
      </div>
    `).join('');
    card.innerHTML = `
      <div style="font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--amber); margin-bottom:var(--space-2);">Verify · Mom & Dad will read this</div>
      <h2 style="font-family:var(--font-serif); font-size:26px; line-height:1.2; font-weight:500; color:var(--ink); margin:0 0 var(--space-2) 0;">${title}</h2>
      <p style="font-family:var(--font-serif); font-size:16px; line-height:1.45; color:var(--ink-soft); margin:0 0 var(--space-5) 0;">${sub}</p>
      ${answersHtml}
      <div style="display:flex; gap:var(--space-3); margin-top:var(--space-4); justify-content:flex-end; flex-wrap:wrap;">
        <button class="btn-secondary" id="rv-edit" style="padding:12px 22px; border-radius:999px; border:1.5px solid rgba(26,24,20,0.20); background:transparent; font-family:inherit; font-weight:600; cursor:pointer;">Edit again</button>
        <button class="btn-primary" id="rv-send" style="padding:12px 22px; border-radius:999px; border:none; background:var(--ink); color:var(--cream); font-family:inherit; font-weight:600; cursor:pointer;">Yes — send to Mom & Dad</button>
      </div>
    `;
    wrap.appendChild(card);
    document.body.appendChild(wrap);

    const cleanup = () => { wrap.remove(); };
    wrap.querySelector('#rv-edit').onclick = () => { cleanup(); if (opts.onEdit) opts.onEdit(); };
    wrap.querySelector('#rv-send').onclick = () => { cleanup(); if (opts.onConfirm) opts.onConfirm(); };

    // Esc closes back to editing
    const escHandler = (e) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); cleanup(); if (opts.onEdit) opts.onEdit(); }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ============================================================
  // VIDEO-TYPED — kickoff video + typed teach-back questions
  // Friday 2026-05-29 — Patrik wants every subject to open with an
  // actually-relevant kickoff video. No multi-choice quiz after — he
  // types the answers in his own words.
  //
  // Block shape:
  //   { id, kind:'topic', type:'video-typed', minutes,
  //     subject, tag, title,
  //     video: {
  //       title: 'Kickoff video — Soft Lies',
  //       ytId: 'wbftlDzIALA',
  //       creditLine: 'TEDxKids@ElCajon — Georgia Haukom'
  //     },
  //     typedQuestions: [
  //       { q: 'In your own words...', minChars: 140 },
  //       { q: 'What stuck with you...', minChars: 100 }
  //     ],
  //     cta: 'Done' }
  // ============================================================
  function videoTyped(host, block) {
    const tag = block.tag || (block.subject || '');
    const title = block.title || (block.video && block.video.title) || 'Watch the video';
    const v = block.video || {};
    const ytId = v.ytId || '';
    const credit = v.creditLine || '';
    const qs = Array.isArray(block.typedQuestions) ? block.typedQuestions : [];

    host.innerHTML = `
      ${topRail(0, tag)}
      ${moduleHead(block.subject || 'Today', title)}
      <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">
        ${credit ? `<div style="font-size:12px; color:var(--ink-quiet); margin-bottom:var(--space-3); font-family:'Geist',system-ui,sans-serif;">From <strong>${credit}</strong></div>` : ''}
        <div style="background:#000; border-radius:var(--r-md); overflow:hidden; aspect-ratio:16/9; margin-bottom:var(--space-4);">
          <iframe id="vt-iframe" style="width:100%; height:100%; border:0;"
            src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&controls=1&fs=0&enablejsapi=1&disablekb=1&iv_load_policy=3"
            allow="accelerometer; encrypted-media; gyroscope"></iframe>
        </div>
        <div style="font-size:13px; color:var(--ink-quiet); margin-bottom:var(--space-5); font-family:'Geist',system-ui,sans-serif;">Watch the whole video. Then answer below in your own words — no clicking past.</div>
        ${qs.map((q, qi) => {
          const minC = q.minChars || 120;
          return `
            <div class="vt-q" data-qi="${qi}" style="background:#FFF; border:1px solid rgba(26,24,20,0.12); border-radius:var(--r-md); padding:var(--space-5); margin-bottom:var(--space-4);">
              <div style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--amber); margin-bottom:var(--space-2);">Question ${qi + 1}</div>
              <div style="font-family:var(--font-serif); font-size:17px; line-height:1.45; margin-bottom:var(--space-3);">${q.q}</div>
              <textarea data-qi="${qi}" rows="4" placeholder="Type your answer..." style="width:100%; box-sizing:border-box; border:1px solid rgba(26,24,20,0.12); border-radius:var(--r-sm); padding:var(--space-3); font-family:'Geist',system-ui,sans-serif; font-size:15px; line-height:1.5; color:var(--ink); background:#FBFAF6; outline:none; resize:vertical; min-height:110px;"></textarea>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); margin-top:var(--space-2); font-size:13px;">
                <div class="vt-counter" data-qi="${qi}" style="color:var(--ink-quiet);">0 / ${minC} characters</div>
                <div class="vt-spell" data-qi="${qi}" style="color:var(--ink-quiet);">Spelling: will check at the word count</div>
              </div>
              <div class="vt-words" data-qi="${qi}" style="display:none; background:#FFF6E5; border:1px solid #E5B947; border-radius:var(--r-sm); padding:var(--space-3); margin-top:var(--space-2);">
                <div style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#8B5E14; margin-bottom:var(--space-2);">Spelling — fix these</div>
                <div class="vt-list" data-qi="${qi}" style="font-family:'Geist',system-ui,sans-serif; font-size:14px; line-height:1.7; color:var(--ink);"></div>
                <div style="margin-top:var(--space-1); font-size:12px; color:var(--ink-quiet);">Tap a word to mark it as a name or special word.</div>
              </div>
            </div>
          `;
        }).join('')}
        <div class="center-actions">
          <button class="btn-primary" id="vt-submit" disabled style="opacity:0.5;">Answer every question to continue</button>
        </div>
      </div>
    `;
    startBlockTimer(host, block);

    const submit = host.querySelector('#vt-submit');
    const perQuestion = qs.map((q, qi) => ({
      qi,
      minChars: q.minChars || 120,
      userMarkedOK: new Set(),
      seq: 0,
      passed: false
    }));

    function updateSubmit() {
      const allPassed = perQuestion.every(p => p.passed);
      if (allPassed && qs.length > 0) {
        submit.disabled = false;
        submit.style.opacity = '1';
        submit.textContent = block.cta || 'Done';
      } else {
        submit.disabled = true;
        submit.style.opacity = '0.5';
        const remaining = perQuestion.filter(p => !p.passed).length;
        submit.textContent = `${remaining} question${remaining === 1 ? '' : 's'} left to answer`;
      }
    }

    function renderSuspectsFor(qi, suspects) {
      const p = perQuestion[qi];
      const wordsBox = host.querySelector(`.vt-words[data-qi="${qi}"]`);
      const listBox = host.querySelector(`.vt-list[data-qi="${qi}"]`);
      const spellStatus = host.querySelector(`.vt-spell[data-qi="${qi}"]`);
      if (suspects.length === 0) {
        p.passed = true;
        wordsBox.style.display = 'none';
        spellStatus.textContent = 'Spelling: clean';
        spellStatus.style.color = '#2D6B3C';
      } else {
        p.passed = false;
        wordsBox.style.display = 'block';
        spellStatus.textContent = `Spelling: ${suspects.length} word${suspects.length === 1 ? '' : 's'} to check`;
        spellStatus.style.color = '#8B5E14';
        listBox.innerHTML = suspects.map(w => `
          <span style="display:inline-flex; align-items:center; gap:4px; background:#FFE8B0; padding:4px 10px; border-radius:999px; margin:3px 4px 3px 0; font-weight:600;">
            ${w}
            <button data-mark-ok="${w}" data-qi="${qi}" style="background:transparent; border:none; cursor:pointer; font-size:11px; color:#8B5E14; padding:0 2px;" title="Mark as a name / accept">✓</button>
          </span>
        `).join('');
        listBox.querySelectorAll('[data-mark-ok]').forEach(btn => {
          btn.onclick = () => {
            p.userMarkedOK.add(btn.dataset.markOk);
            refreshFor(qi);
          };
        });
      }
      updateSubmit();
    }

    async function refreshFor(qi) {
      const p = perQuestion[qi];
      const mySeq = ++p.seq;
      const ta = host.querySelector(`textarea[data-qi="${qi}"]`);
      const counter = host.querySelector(`.vt-counter[data-qi="${qi}"]`);
      const spellStatus = host.querySelector(`.vt-spell[data-qi="${qi}"]`);
      const wordsBox = host.querySelector(`.vt-words[data-qi="${qi}"]`);
      const text = ta.value;
      const chars = text.trim().length;
      counter.textContent = `${chars} / ${p.minChars} characters`;
      counter.style.color = chars >= p.minChars ? '#2D6B3C' : 'var(--ink-quiet)';

      if (chars < p.minChars) {
        p.passed = false;
        wordsBox.style.display = 'none';
        spellStatus.textContent = 'Spelling: will check at the word count';
        spellStatus.style.color = 'var(--ink-quiet)';
        updateSubmit();
        return;
      }

      let suspects = _initialFlag(text).filter(w => !p.userMarkedOK.has(w));
      if (mySeq === p.seq) renderSuspectsFor(qi, suspects);
      if (suspects.length === 0) return;

      spellStatus.textContent = `Spelling: checking ${suspects.length} word${suspects.length === 1 ? '' : 's'} with dictionary...`;
      spellStatus.style.color = '#8B5E14';
      const confirmed = (await _confirmInvalid(suspects)).filter(w => !p.userMarkedOK.has(w));
      if (mySeq !== p.seq) return;
      renderSuspectsFor(qi, confirmed);
    }

    qs.forEach((_, qi) => {
      const ta = host.querySelector(`textarea[data-qi="${qi}"]`);
      ta.addEventListener('input', () => refreshFor(qi));
      ta.addEventListener('blur', () => refreshFor(qi));
    });

    submit.onclick = () => {
      if (submit.disabled) return;
      const answers = qs.map((q, qi) => {
        const ta = host.querySelector(`textarea[data-qi="${qi}"]`);
        return { q: q.q, body: ta ? ta.value.trim() : '' };
      });
      _showReviewModal(host, {
        title: 'Ready for Mom & Dad?',
        subtitle: 'Read both your answers below. Mom & Dad will see exactly what you wrote.',
        answers,
        onEdit: () => {
          const firstTa = host.querySelector('textarea[data-qi="0"]');
          if (firstTa) { firstTa.focus(); try { firstTa.setSelectionRange(firstTa.value.length, firstTa.value.length); } catch(e){} }
        },
        onConfirm: () => {
          if (window.SS && window.SS.saveWritingPiece) {
            answers.forEach(a => { if (a.body) window.SS.saveWritingPiece(a.q, a.body); });
          }
          if (window.SS && window.SS.saveArtifact) {
            window.SS.saveArtifact({ kind: 'video-typed', block_id: block.id, subject: block.subject, ytId, answers, title: block.title });
          }
          complete(block.id, { ytId, answers, budgetMinutes: block.minutes });
        }
      });
    };

    updateSubmit();
  }

  // ============================================================
  // FRIDAY 2026-05-29 — Teach-back, typing-precise, spelling-drill
  // Three new renderers built for the anti-clickthrough pivot. Each is
  // gated INSIDE the block (not at the hub). No way to advance without
  // hitting the gate — character count + spell-check, or exact-match,
  // or every spelling correct.
  // ============================================================

  // Wordlist used by spell-check on teach-back. The flow:
  //   1. Skip words < 4 letters and numbers (always OK).
  //   2. Skip words in this hardcoded list (~1500 common English words +
  //      content-specific Friday vocabulary).
  //   3. Skip words already validated in the dict-cache (any word he ever
  //      hovered to look up — see dictionary.js).
  //   4. For everything left, async-fetch Free Dictionary API. If it
  //      returns 200 → cache + accept. If 404 → flag.
  //   5. He can tap ✓ on any flagged word to mark it as a name / accept.
  //
  // Short words (< 4 letters) and numbers are always OK. The gate is on
  // word count first, then spelling. Submit unlocks only when both pass.
  const FRIDAY_WORDLIST = new Set([
    // pronouns / common
    'i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','this','that','these','those','what','which','who','whom','whose','where','when','why','how',
    'am','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','can','could','should','must','might','may','shall',
    'a','an','the','and','or','but','if','then','because','so','for','to','of','in','on','at','by','from','with','about','as','up','down','out','off','over','under','again','further','once','here','there','now',
    'not','no','yes','only','very','just','also','too','still','really','almost','always','never','sometimes','today','tomorrow','yesterday','soon','later','before','after','already','yet',
    // friday content words
    'soft','lie','lies','lying','truth','truthful','true','false','say','said','saying','tell','told','telling','word','words','speak','spoke','speaking','talk','talked','talking','answer','answered','question','questions','asked','ask','asking',
    'problem','problems','solution','solutions','solve','solved','solving','attempt','attempts','attempted','try','tried','trying','decision','decisions','decide','decided','deciding','possible','impossible','mistake','mistakes','challenge','challenges','judgment','judgements','judge','judging',
    'suggest','suggested','suggesting','consider','considered','considering','develop','developed','developing','address','addressed','addressing','improve','improved','improving','prevent','prevented','preventing','struggle','struggled','struggling','respect','respected','respecting',
    'kick','kicks','snare','snares','hihat','hat','hats','beat','beats','bar','bars','time','metronome','grid','rush','rushing','drag','dragging','tempo','bpm','pad','pads','sound','sounds','record','recorded','recording','play','played','playing','music','song','songs','rhythm','pattern','patterns','easy','hard','harder','hardest','simple','simpler','simplest','foundation',
    'code','coded','coding','codes','program','programs','programmed','programming','programmer','programmers','computer','computers','game','games','roblox','lua','variable','variables','value','values','box','boxes','print','prints','printed','printing','hello','world','condition','conditions','decide','loop','loops','repeat','repeats','repeated','repeating','score','scores','health','coin','coins','level','levels','player','players','build','building','built',
    // general kid-vocab
    'i\'ll','i\'m','you\'re','don\'t','can\'t','won\'t','it\'s','that\'s','what\'s','here\'s','there\'s','let\'s','we\'re','they\'re','isn\'t','aren\'t','wasn\'t','weren\'t','hasn\'t','haven\'t','didn\'t','doesn\'t','wouldn\'t','couldn\'t','shouldn\'t','i\'ve','you\'ve','we\'ve','they\'ve','i\'d','you\'d','he\'d','she\'d','they\'d','we\'d',
    'good','bad','better','best','worse','worst','great','small','big','little','old','new','first','second','third','last','next','same','different','important','real','fake','right','wrong','easy','hard','fast','slow','high','low','top','bottom','front','back','left','center','middle',
    'people','person','kid','kids','friend','friends','family','mom','dad','parent','parents','child','children','adult','adults','teacher','teachers','student','students','class','classes','school','schools','home','homes','house','room','rooms','door','doors',
    'feel','feels','felt','feeling','think','thought','thinking','know','knew','known','knowing','understand','understood','understanding','learn','learned','learning','remember','remembered','remembering','forget','forgot','forgotten','forgetting',
    'thing','things','something','anything','nothing','everything','someone','anyone','no-one','everyone','somewhere','anywhere','nowhere','everywhere','someday','anytime',
    'help','helped','helping','work','worked','working','make','made','making','take','took','taking','give','gave','given','giving','get','got','getting','put','putting','keep','kept','keeping','start','started','starting','stop','stopped','stopping','finish','finished','finishing','done','use','used','using','show','showed','showing','see','saw','seen','seeing','look','looked','looking','watch','watched','watching','listen','listened','listening','hear','heard','hearing','read','reading','write','wrote','written','writing','type','typed','typing',
    'about','around','across','through','between','among','near','far','close','away','inside','outside','upstairs','downstairs',
    'one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','hundred','thousand','million','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth',
    'avoid','avoided','avoiding','admit','admitted','admitting','blame','blamed','blaming','trust','trusted','trusting','believe','believed','believing','honest','honesty','dishonest','damage','damaged','damaging','wreck','wrecked','wrecking','ruin','ruined','ruining','hurt','hurts','hurting','harm','harms','harmed','harming','breath','breathe','breathing',
    'really','actually','probably','maybe','perhaps','definitely','obviously','clearly','exactly','mostly','partly','mostly','sometimes','often','rarely','always','never','still','already','yet',
    'because','since','until','while','whenever','wherever','whatever','whoever','however','although','though','unless','except','besides','despite',
    'lesson','lessons','homework','project','projects','subject','subjects','module','modules','test','tests','quiz','quizzes','check','checked','checking','grade','grades','answer','answers','example','examples',
    'sequence','sequences','first','then','next','after','before','later','finally','last','order','steps','step',
    'thank','thanks','please','sorry','okay','ok','sure','fine','well','hey','hi','hello','bye','goodbye',
    // expanded common vocab (caught in 2026-05-29 first pass)
    'like','liked','liking','likes','likely','unlikely','move','moved','moving','moves','movement',
    'conversation','conversations','talk','talked','talking','talks','speak','speech','speeches',
    'damage','damages','damaged','damaging','hurt','hurts','hurting','harm','harms','harmed','harming','wreck','wrecks','wrecked','wrecking','ruin','ruins','ruined','ruining',
    'sneak','sneaky','sneaking','sneaked','sneaks','quiet','quietly','loud','loudly','noise','noisy',
    'kind','kindly','kinds','kindness','mean','meant','meaning','means','meaningful','nice','nicely','rude','rudely',
    'over','under','through','around','across','between','among','beyond','beside','behind','below','above','within','without',
    'change','changed','changing','changes','different','differently','differences','difference','same','similar','similarly','various',
    'plan','plans','planned','planning','idea','ideas','thought','thoughts','mind','minds',
    'happen','happens','happened','happening','event','events',
    'word','words','sentence','sentences','line','lines','letter','letters','paragraph','paragraphs','page','pages','book','books','story','stories',
    'phone','phones','message','messages','text','texts','email','emails','call','calls','called','calling',
    'screen','screens','app','apps','website','websites','site','sites','video','videos','image','images','photo','photos','picture','pictures',
    'food','foods','water','drink','drinks','meal','meals','breakfast','lunch','dinner','snack','snacks',
    'sleep','slept','sleeping','sleeps','tired','rest','rested','resting','wake','waking','woke','woken',
    'happy','sad','angry','mad','scared','afraid','excited','bored','calm','nervous','worried','confident',
    'maybe','probably','perhaps','definitely','certainly','sure','unsure',
    'love','loved','loving','loves','hate','hated','hating','hates','enjoy','enjoyed','enjoying','enjoys','prefer','preferred','preferring','prefers',
    'open','opened','opening','opens','close','closed','closing','closes','shut','shuts','shutting',
    'walk','walked','walking','walks','run','ran','running','runs','jump','jumped','jumping','jumps','sit','sat','sitting','sits','stand','stood','standing','stands','lie','lay','lying','lies',
    'push','pushed','pushing','pushes','pull','pulled','pulling','pulls','lift','lifted','lifting','lifts','drop','dropped','dropping','drops','throw','threw','throwing','throws','catch','caught','catching','catches',
    'eat','ate','eaten','eating','eats','drink','drank','drunk','drinking','drinks',
    'find','found','finding','finds','lose','lost','losing','loses','seek','sought','seeking','seeks',
    'send','sent','sending','sends','receive','received','receiving','receives','share','shared','sharing','shares',
    'fix','fixed','fixing','fixes','break','broke','broken','breaking','breaks','build','building','builds','make','making','makes','create','created','creating','creates',
    'choose','chose','chosen','choosing','chooses','choice','choices','option','options',
    'turn','turned','turning','turns','switch','switched','switching','switches',
    'light','lights','dark','darkness','color','colors','red','blue','green','yellow','black','white','orange','purple','pink','brown','gray',
    'mouse','mice','keyboard','keyboards','click','clicked','clicking','clicks','tap','tapped','tapping','taps','press','pressed','pressing','presses','type','typed','typing','types',
    'save','saved','saving','saves','load','loaded','loading','loads','run','ran','running','runs','crash','crashed','crashing','crashes','bug','bugs','glitch','glitches','error','errors',
    'win','won','winning','wins','lose','lost','losing','loses','tie','tied','tying','ties',
    'team','teams','group','groups','crew','partner','partners','friend','friends','enemy','enemies','rival','rivals',
    'fight','fought','fighting','fights','race','raced','racing','races','game','games','match','matches','round','rounds','battle','battles',
    'point','points','score','scores','rank','ranks','level','levels','stage','stages','tier','tiers',
    'rule','rules','law','laws','code','codes','plan','plans','goal','goals','target','targets','aim','aimed','aiming','aims',
    'name','named','naming','names','call','called','calling','calls',
    'every','each','any','all','some','none','many','few','several','most','least','more','less','enough','plenty',
    'whole','part','parts','piece','pieces','side','sides','front','fronts','back','top','tops','bottom','bottoms','edge','edges','middle','center','corner','corners',
    'inside','outside','within','around','near','far','close','distant',
    'place','places','spot','spots','area','areas','region','regions','space','spaces',
    'today','tonight','tomorrow','yesterday','morning','afternoon','evening','night','noon','midnight','dawn','dusk','weekend','weekday',
    'minute','minutes','hour','hours','second','seconds','day','days','week','weeks','month','months','year','years',
    'time','times','timer','timers','clock','clocks','watch','watches',
    'door','doors','window','windows','wall','walls','floor','floors','ceiling','ceilings','roof','roofs','stair','stairs','step',
    'house','houses','home','homes','apartment','apartments','room','rooms','kitchen','kitchens','bedroom','bedrooms','bathroom','bathrooms','garage','garages','yard','yards',
    'street','streets','road','roads','highway','highways','sidewalk','sidewalks','park','parks','field','fields',
    'car','cars','truck','trucks','bus','buses','train','trains','plane','planes','boat','boats','bike','bikes','scooter','scooters',
    'glass','plate','plates','cup','cups','bowl','bowls','spoon','spoons','fork','forks','knife','knives',
    'live','lives','lived','living','died','dying','death','born','birth',
    'meet','met','meeting','meets','introduce','introduced','introducing','introduces','greet','greeted','greeting','greets',
    'agree','agreed','agreeing','agrees','disagree','disagreed','disagreeing','disagrees','argue','argued','arguing','argues','debate','debated','debating','debates',
    'happy','happier','happiest','sad','sadder','saddest','old','older','oldest','young','younger','youngest','big','bigger','biggest','small','smaller','smallest','quick','quicker','quickest','slow','slower','slowest','fast','faster','fastest',
    'cold','colder','coldest','hot','hotter','hottest','warm','warmer','warmest','cool','cooler','coolest','dry','drier','driest','wet','wetter','wettest',
    'clean','cleaner','cleanest','dirty','dirtier','dirtiest','neat','neater','neatest','messy','messier','messiest',
    'easy','easier','easiest','hard','harder','hardest','tough','tougher','toughest','simple','simpler','simplest','complex','complicated',
    'soft','softer','softest','hard','rough','rougher','roughest','smooth','smoother','smoothest','sharp','sharper','sharpest',
    'bright','brighter','brightest','dim','dimmer','dimmest','clear','clearer','clearest','blurry','blurrier','blurriest',
    'true','truth','truthful','truly','false','falsely','honest','honesty','dishonest','lie','liar','liars','fake','faking',
    'real','reality','realistic','imaginary','imagined','imagining','imagines','pretend','pretended','pretending','pretends',
    'remember','remembered','remembering','remembers','memory','memories','forget','forgot','forgotten','forgetting','forgets',
    'understand','understood','understanding','understands','confused','confusing','confuses','confusion',
    'realize','realized','realizing','realizes','realization','notice','noticed','noticing','notices',
    'agree','agreement','disagree','disagreement','promise','promises','promised','promising',
    'mistake','mistakes','error','errors','wrong','correctly','correct','correctly','fix','fixes','fixed','fixing',
    'reason','reasons','because','since','therefore','thus','because',
    'try','tried','trying','tries','attempt','attempts','attempted','attempting','effort','efforts',
    'help','helped','helping','helps','helpful','unhelpful','support','supported','supporting','supports',
    'teach','taught','teaching','teaches','teacher','teachers','learn','learned','learning','learns','student','students',
    'explain','explained','explaining','explains','explanation','explanations','describe','described','describing','describes','description','descriptions',
    'ask','asked','asking','asks','question','questioning','questions','tell','told','telling','tells','say','said','saying','says',
    'reply','replied','replying','replies','respond','responded','responding','responds','response','responses','answer','answered','answering','answers',
    'phone','phones','calling','called','texting','texted','messaging','messaged',
    'thanks','thanked','thanking','thank','grateful','gratitude','appreciate','appreciated','appreciating','appreciates',
    'sorry','apology','apologies','apologize','apologized','apologizing','apologizes','forgive','forgave','forgiving','forgives','forgiveness',
    'follow','followed','following','follows','lead','led','leading','leads','leader','leaders',
    'wait','waited','waiting','waits','hurry','hurried','hurrying','hurries','rush','rushed','rushing','rushes',
    'enter','entered','entering','enters','exit','exited','exiting','exits','arrive','arrived','arriving','arrives','leave','left','leaving','leaves',
    'come','came','coming','comes','go','went','gone','going','goes',
    'bring','brought','bringing','brings','take','took','taken','taking','takes','carry','carried','carrying','carries',
    'buy','bought','buying','buys','sell','sold','selling','sells','pay','paid','paying','pays','cost','costs','costing','price','prices','priced','pricing',
    'money','cash','dollar','dollars','cent','cents','penny','pennies','coin','coins','bill','bills',
    'parent','parents','child','children','kid','kids','baby','babies','teen','teens','teenager','teenagers','adult','adults',
    'brother','brothers','sister','sisters','sibling','siblings','cousin','cousins','aunt','aunts','uncle','uncles','grandma','grandpa','grandparent','grandparents','grandfather','grandmother',
    'wife','husband','spouse','partner','boyfriend','girlfriend','date','dating','dated','dates',
    'cat','cats','dog','dogs','pet','pets','animal','animals','bird','birds','fish','fishes','horse','horses','cow','cows','pig','pigs',
    'flower','flowers','tree','trees','plant','plants','grass','leaf','leaves','seed','seeds','root','roots','branch','branches',
    'sun','suns','sunny','sunshine','moon','moons','star','stars','sky','skies','cloud','clouds','cloudy','rain','rainy','rained','raining','snow','snowed','snowing','snows','wind','windy',
    'water','watered','watering','waters','sea','seas','ocean','oceans','lake','lakes','river','rivers','stream','streams','beach','beaches',
    'sport','sports','ball','balls','soccer','football','basketball','baseball','tennis','golf','hockey','swimming','running',
    'word','wording','spell','spelled','spelling','sentence','sentences','phrase','phrases','grammar','punctuation','spelling',
    'song','songs','singing','sang','sung','sing','sings','music','musical','instrument','instruments','drum','drums','drumming','drummer','drummers','beat','beats',
    'show','shows','showed','showing','demonstrate','demonstrated','demonstrating','demonstrates','display','displayed','displaying','displays',
    'class','classes','classroom','classrooms','homework','assignment','assignments','exam','exams','test','tests','grade','grades','grading',
    'movie','movies','film','films','show','shows','tv','television','channel','channels',
    'gym','exercise','exercised','exercising','exercises','workout','workouts','training','trained','train','trains',
    'doctor','doctors','nurse','nurses','dentist','dentists','hospital','hospitals','sick','illness','illnesses','health','healthy','unhealthy','disease','diseases',
    'medicine','medicines','pill','pills','vaccine','vaccines','shot','shots',
    'wear','wore','worn','wearing','wears','dress','dressed','dressing','dresses','shirt','shirts','pants','pant','shoes','shoe','sock','socks','hat','hats',
    'pocket','pockets','bag','bags','backpack','backpacks','wallet','wallets','purse','purses',
    'idea','ideas','plan','plans','planning','planned','design','designed','designing','designs','create','created','creating','creates','invent','invented','inventing','invents','invention','inventions',
    'project','projects','task','tasks','goal','goals','target','targets','dream','dreams','dreamed','dreaming','dreams','aim','aimed','aiming','aims',
    'finish','finished','finishing','finishes','complete','completed','completing','completes','done','undone',
    'work','worked','working','works','job','jobs','career','careers','business','businesses','company','companies',
    'study','studied','studying','studies','research','researched','researching','researches','review','reviewed','reviewing','reviews',
    'pick','picked','picking','picks','select','selected','selecting','selects','choose','chose','chosen','choosing','chooses','choice','choices',
    'show','showed','shown','showing','shows','prove','proved','proven','proving','proves','proof',
    'count','counted','counting','counts','number','numbers','total','totals','sum','sums','add','added','adding','adds','subtract','subtracted','subtracting','subtracts',
    'multiply','multiplied','multiplying','multiplies','divide','divided','dividing','divides','math','mathematics','arithmetic',
    'list','lists','listed','listing','organize','organized','organizing','organizes','sort','sorted','sorting','sorts','arrange','arranged','arranging','arranges',
    'history','histories','past','present','future','today','tomorrow','yesterday','recently','soon','later','before','after',
    'happen','happened','happening','happens','event','events','occur','occurred','occurring','occurs','occurrence','occurrences',
    'visit','visited','visiting','visits','stay','stayed','staying','stays',
    'feel','felt','feeling','feelings','feels','sense','sensed','sensing','senses','emotion','emotions','emotional',
    'truth','true','truly','really','actually','indeed','absolutely','certainly','definitely','surely','obviously','clearly','exactly'
  ]);

  // Words this curriculum mentions that aren't in the common list — accept them
  const FRIDAY_CONTENT_WORDS = new Set([
    'ethan','patrik','dad','mom','roblox','lua','mpc','akai','snare','hihat','metronome','tiktok','youtube','console','output','wallop','script','studio','rovio','bubble','angry','birds'
  ]);

  function _normalizeWord(w) {
    return String(w || '').toLowerCase().replace(/[^a-z'\-]/g, '').replace(/^'+|'+$/g, '');
  }

  // In-memory async result cache: word -> 'valid' | 'invalid' | Promise
  // Survives the session via the same ss-dict-cache-v1 used by dictionary.js.
  const _spellAsyncCache = new Map();

  function _initialFlag(text) {
    // Phase 1 (sync): apply local wordlist + dict-cache. Returns words still
    // suspect after the cheap pass — these need the async API check.
    const out = [];
    const seen = new Set();
    const tokens = String(text || '').split(/\s+/);
    let dc = {};
    try { dc = JSON.parse(localStorage.getItem('ss-dict-cache-v1') || '{}'); } catch (e) {}
    for (const raw of tokens) {
      const w = _normalizeWord(raw);
      if (!w) continue;
      if (w.length < 4) continue;
      if (/^\d+$/.test(w)) continue;
      if (seen.has(w)) continue;
      if (FRIDAY_WORDLIST.has(w)) continue;
      if (FRIDAY_CONTENT_WORDS.has(w)) continue;
      if (dc[w] && (dc[w].definition || dc[w].meanings)) continue;
      if (_spellAsyncCache.get(w) === 'valid') continue;
      seen.add(w);
      out.push(w);
    }
    return out;
  }

  async function _confirmInvalid(words) {
    // Phase 2 (async): for each still-suspect word, query Free Dictionary
    // API. Cache result. Return only words the API also rejects (404).
    const stillBad = [];
    for (const w of words) {
      const cached = _spellAsyncCache.get(w);
      if (cached === 'valid') continue;
      if (cached === 'invalid') { stillBad.push(w); continue; }
      if (cached instanceof Promise) {
        const verdict = await cached;
        if (verdict === 'invalid') stillBad.push(w);
        continue;
      }
      const p = (async () => {
        try {
          const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w), { cache: 'force-cache' });
          if (r.ok) {
            // also drop into the existing dict-cache so future sessions know
            try {
              const dc = JSON.parse(localStorage.getItem('ss-dict-cache-v1') || '{}');
              if (!dc[w]) { dc[w] = { _spellOnly: true }; localStorage.setItem('ss-dict-cache-v1', JSON.stringify(dc)); }
            } catch (e) {}
            _spellAsyncCache.set(w, 'valid');
            return 'valid';
          }
          _spellAsyncCache.set(w, 'invalid');
          return 'invalid';
        } catch (e) {
          // Network failure → be lenient. Don't block the kid because the API is down.
          _spellAsyncCache.set(w, 'valid');
          return 'valid';
        }
      })();
      _spellAsyncCache.set(w, p);
      const verdict = await p;
      if (verdict === 'invalid') stillBad.push(w);
    }
    return stillBad;
  }

  // ============================================================
  // TEACH-BACK — typed-artifact gate
  // Block shape:
  //   { id, kind:'topic', type:'teach-back', minutes,
  //     subject, tag, title,
  //     prompt: 'In your own words, type out...',
  //     minChars: 200,                  // char-count gate
  //     spellCheck: true,               // run spell check on submit
  //     savedAs: 'writingPiece',        // optional — saves to SS.writingPieces
  //     cta: 'Submit' }
  // ============================================================
  function teachBack(host, block) {
    const tag = block.tag || (block.subject || '');
    const title = block.title || 'Teach it back';
    const prompt = block.prompt || 'Type what you learned in your own words.';
    const minChars = block.minChars || 150;

    host.innerHTML = `
      ${topRail(0, tag)}
      ${moduleHead(block.subject || 'Today', title)}
      <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">
        <div class="passage" style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-bottom: var(--space-4); box-shadow: var(--shadow-card);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Type it out</div>
          <p style="font-family: var(--font-serif); font-size: 18px; line-height: 1.55; margin: 0;">${prompt}</p>
        </div>

        <div style="background: #FFF; border: 1px solid rgba(26,24,20,0.12); border-radius: var(--r-md); padding: var(--space-4); margin-bottom: var(--space-3);">
          <textarea id="tb-text" rows="9" placeholder="Start typing..." style="width: 100%; box-sizing: border-box; border: none; outline: none; resize: vertical; font-family: 'Geist', system-ui, sans-serif; font-size: 16px; line-height: 1.6; color: var(--ink); background: transparent; min-height: 180px;"></textarea>
        </div>

        <div id="tb-status" style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); font-size: 14px; font-family: 'Geist', system-ui, sans-serif;">
          <div id="tb-counter" style="color: var(--ink-quiet);">0 / ${minChars} characters</div>
          <div id="tb-spell-status" style="color: var(--ink-quiet);">Spelling: not checked yet</div>
        </div>

        <div id="tb-spell-words" style="display: none; background: #FFF6E5; border: 1px solid #E5B947; border-radius: var(--r-md); padding: var(--space-4); margin-bottom: var(--space-4);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8B5E14; margin-bottom: var(--space-2);">Spelling — fix these</div>
          <div id="tb-spell-list" style="font-family: 'Geist', system-ui, sans-serif; font-size: 14px; line-height: 1.7; color: var(--ink);"></div>
          <div style="margin-top: var(--space-2); font-size: 12px; color: var(--ink-quiet);">Tap a word to mark it as a name or special word the dictionary doesn't have.</div>
        </div>

        <div class="center-actions">
          <button class="btn-primary" id="tb-submit" disabled style="opacity:0.5;">Keep typing — ${minChars} chars needed</button>
        </div>
      </div>
    `;
    startBlockTimer(host, block);

    const ta = host.querySelector('#tb-text');
    const counter = host.querySelector('#tb-counter');
    const submit = host.querySelector('#tb-submit');
    const spellStatus = host.querySelector('#tb-spell-status');
    const spellBox = host.querySelector('#tb-spell-words');
    const spellList = host.querySelector('#tb-spell-list');

    const userMarkedOK = new Set(); // words he marked as "name / accept"
    let refreshSeq = 0;             // race-protection: latest async wins

    function renderSpellState(suspects) {
      if (suspects.length === 0) {
        submit.disabled = false;
        submit.style.opacity = '1';
        submit.textContent = block.cta || 'Submit';
        spellBox.style.display = 'none';
        spellStatus.textContent = 'Spelling: clean';
        spellStatus.style.color = '#2D6B3C';
      } else {
        submit.disabled = true;
        submit.style.opacity = '0.5';
        submit.textContent = `Fix ${suspects.length} spelling${suspects.length === 1 ? '' : 's'} to submit`;
        spellBox.style.display = 'block';
        spellStatus.textContent = `Spelling: ${suspects.length} word${suspects.length === 1 ? '' : 's'} to check`;
        spellStatus.style.color = '#8B5E14';
        spellList.innerHTML = suspects.map(w => `
          <span style="display: inline-flex; align-items: center; gap: 4px; background: #FFE8B0; padding: 4px 10px; border-radius: 999px; margin: 3px 4px 3px 0; font-weight: 600;">
            ${w}
            <button data-mark-ok="${w}" style="background: transparent; border: none; cursor: pointer; font-size: 11px; color: #8B5E14; padding: 0 2px;" title="Mark as a name / accept">✓</button>
          </span>
        `).join('');
        spellList.querySelectorAll('[data-mark-ok]').forEach(btn => {
          btn.onclick = () => { userMarkedOK.add(btn.dataset.markOk); refresh(); };
        });
      }
    }

    async function refresh() {
      const mySeq = ++refreshSeq;
      const text = ta.value;
      const chars = text.trim().length;
      counter.textContent = `${chars} / ${minChars} characters`;
      counter.style.color = chars >= minChars ? '#2D6B3C' : 'var(--ink-quiet)';

      if (chars < minChars) {
        submit.disabled = true;
        submit.style.opacity = '0.5';
        submit.textContent = `Keep typing — ${minChars - chars} more`;
        spellBox.style.display = 'none';
        spellStatus.textContent = 'Spelling: will check when you hit the word count';
        spellStatus.style.color = 'var(--ink-quiet)';
        return;
      }

      if (block.spellCheck === false) {
        if (mySeq === refreshSeq) renderSpellState([]);
        return;
      }

      // Phase 1: sync flag from the local wordlist
      let suspects = _initialFlag(text).filter(w => !userMarkedOK.has(w));

      // Show the phase-1 result immediately so he sees something happen
      if (mySeq === refreshSeq) renderSpellState(suspects);

      if (suspects.length === 0) return;

      // Phase 2: async confirm with the dictionary API. Show "checking..."
      spellStatus.textContent = `Spelling: checking ${suspects.length} word${suspects.length === 1 ? '' : 's'} with dictionary...`;
      spellStatus.style.color = '#8B5E14';
      const confirmed = (await _confirmInvalid(suspects)).filter(w => !userMarkedOK.has(w));
      if (mySeq !== refreshSeq) return; // a newer refresh ran; abandon
      renderSpellState(confirmed);
    }

    ta.addEventListener('input', refresh);
    ta.addEventListener('blur', refresh);

    submit.onclick = () => {
      if (submit.disabled) return;
      const body = ta.value.trim();
      _showReviewModal(host, {
        title: 'Ready for Mom & Dad?',
        answers: [{ q: block.prompt, body }],
        onEdit: () => {
          if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch(e){} }
        },
        onConfirm: () => {
          if (window.SS && block.savedAs === 'writingPiece') {
            window.SS.saveWritingPiece(block.title || block.prompt || 'Teach-back', body);
          }
          if (window.SS && window.SS.saveArtifact) {
            window.SS.saveArtifact({ kind: 'teach-back', block_id: block.id, subject: block.subject, question: block.prompt, body, title: block.title });
          }
          complete(block.id, { chars: body.length, body, budgetMinutes: block.minutes });
        }
      });
    };

    refresh();
  }

  // ============================================================
  // TYPING-PRECISE — type the target string exactly, N reps in a row, no errors
  // Block shape:
  //   { id, kind:'topic', type:'typing-precise', minutes,
  //     subject, tag, title,
  //     prompt: 'Type this exactly...',
  //     target: 'I will tell the truth.',
  //     reps: 3,                        // how many perfect reps in a row
  //     cta: 'Done' }
  // ============================================================
  function typingPrecise(host, block) {
    const tag = block.tag || (block.subject || '');
    const title = block.title || 'Type it exactly';
    const prompt = block.prompt || 'Type this exactly.';
    const target = block.target || '';
    const reps = Math.max(1, block.reps || 3);

    host.innerHTML = `
      ${topRail(0, tag)}
      ${moduleHead(block.subject || 'Today', title)}
      <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">
        <div class="passage" style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-bottom: var(--space-4); box-shadow: var(--shadow-card);">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Type it exactly · ${reps}x in a row</div>
          <p style="font-family: var(--font-serif); font-size: 18px; line-height: 1.55; margin: 0 0 var(--space-4) 0;">${prompt}</p>
          <div style="background: #FFF; border: 1px solid rgba(26,24,20,0.12); border-radius: var(--r-md); padding: var(--space-3) var(--space-4); font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 16px; color: var(--ink); user-select: text;">${target.replace(/</g, '&lt;')}</div>
        </div>

        <div style="background: #FFF; border: 1px solid rgba(26,24,20,0.12); border-radius: var(--r-md); padding: var(--space-4); margin-bottom: var(--space-3);">
          <input id="tp-text" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type it here..." style="width: 100%; box-sizing: border-box; border: none; outline: none; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 17px; color: var(--ink); background: transparent;" />
        </div>

        <div id="tp-status" style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); font-size: 14px; font-family: 'Geist', system-ui, sans-serif;">
          <div id="tp-progress" style="color: var(--ink-quiet);">0 / ${reps} perfect reps</div>
          <div id="tp-feedback" style="color: var(--ink-quiet);">Type the line and press Enter.</div>
        </div>

        <div class="center-actions">
          <button class="btn-primary" id="tp-submit" disabled style="opacity:0.5;">${reps} perfect reps to finish</button>
        </div>
      </div>
    `;
    startBlockTimer(host, block);

    const input = host.querySelector('#tp-text');
    const progress = host.querySelector('#tp-progress');
    const feedback = host.querySelector('#tp-feedback');
    const submit = host.querySelector('#tp-submit');

    let perfect = 0;

    function tick() {
      progress.textContent = `${perfect} / ${reps} perfect reps`;
      if (perfect >= reps) {
        submit.disabled = false;
        submit.style.opacity = '1';
        submit.textContent = block.cta || 'Done';
        feedback.textContent = 'Locked in — nice.';
        feedback.style.color = '#2D6B3C';
      } else {
        submit.disabled = true;
        submit.style.opacity = '0.5';
        submit.textContent = `${reps - perfect} more perfect rep${reps - perfect === 1 ? '' : 's'}`;
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = input.value;
        if (v === target) {
          perfect++;
          input.value = '';
          if (perfect >= reps) {
            feedback.textContent = '';
          } else {
            feedback.textContent = `Perfect. ${reps - perfect} more.`;
            feedback.style.color = '#2D6B3C';
          }
        } else {
          perfect = 0;
          input.value = '';
          feedback.textContent = 'Not exact — count starts over. Try again.';
          feedback.style.color = '#8B3838';
        }
        tick();
      }
    });

    submit.onclick = () => {
      if (submit.disabled) return;
      if (window.SS && window.SS.saveArtifact) {
        window.SS.saveArtifact({ kind: 'typing-precise', block_id: block.id, target, reps, title: block.title });
      }
      complete(block.id, { reps, budgetMinutes: block.minutes });
    };

    tick();
    input.focus();
  }

  // ============================================================
  // SPELLING-DRILL — type each of N words exactly; all-correct to advance.
  // Block shape:
  //   { id, kind:'topic', type:'spelling-drill', minutes,
  //     subject, tag, title,
  //     intro: 'Type these N words exactly...',
  //     words: ['problem', 'solution', ...],
  //     cta: 'Done' }
  // ============================================================
  function spellingDrill(host, block) {
    const tag = block.tag || (block.subject || '');
    const title = block.title || 'Spell each word exactly';
    const intro = block.intro || 'Type each word exactly as shown.';
    const words = Array.isArray(block.words) ? block.words : [];

    let idx = 0;
    let attempts = 0; // total attempts to gauge how many tries

    function showWord() {
      const target = words[idx] || '';
      host.innerHTML = `
        ${topRail(0, tag)}
        ${moduleHead(block.subject || 'Today', title)}
        <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">
          <div class="passage" style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-6) var(--space-5); margin-bottom: var(--space-4); box-shadow: var(--shadow-card);">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber); margin-bottom: var(--space-3);">Word ${idx + 1} of ${words.length}</div>
            <p style="font-family: var(--font-serif); font-size: 17px; line-height: 1.5; margin: 0 0 var(--space-4) 0; color: var(--ink-soft);">${intro}</p>
            <div style="display: flex; align-items: baseline; gap: var(--space-4); flex-wrap: wrap;">
              <div style="font-size: 13px; color: var(--ink-quiet); letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600;">Spell this:</div>
              <div style="font-family: var(--font-serif); font-size: 36px; line-height: 1; color: var(--ink); letter-spacing: 0.02em;">${target}</div>
            </div>
          </div>

          <div style="background: #FFF; border: 1px solid rgba(26,24,20,0.12); border-radius: var(--r-md); padding: var(--space-4); margin-bottom: var(--space-3);">
            <input id="sp-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the word..." style="width: 100%; box-sizing: border-box; border: none; outline: none; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 22px; color: var(--ink); background: transparent;" />
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); font-size: 14px;">
            <div style="color: var(--ink-quiet);">${idx} / ${words.length} done · attempts: ${attempts}</div>
            <div id="sp-feedback" style="color: var(--ink-quiet);">Type the word and press Enter.</div>
          </div>

          <div class="center-actions">
            <button class="btn-primary" id="sp-check">Check spelling</button>
          </div>
        </div>
      `;
      startBlockTimer(host, block);

      const input = host.querySelector('#sp-input');
      const fb = host.querySelector('#sp-feedback');
      const checkBtn = host.querySelector('#sp-check');

      function tryWord() {
        attempts++;
        const v = String(input.value || '').trim().toLowerCase();
        if (v === target.toLowerCase()) {
          idx++;
          if (idx >= words.length) {
            // done — final celebration card
            host.innerHTML = `
              ${topRail(100, `${words.length} / ${words.length}`)}
              ${moduleHead(block.subject || 'Today', title + ' — done')}
              <div class="reading-layout module-narrow" style="grid-template-columns: 1fr;">
                <div class="passage" style="background: var(--cream-card); border-radius: var(--r-md); padding: var(--space-7) var(--space-5); margin-bottom: var(--space-4); box-shadow: var(--shadow-card); text-align: center;">
                  <div style="font-size: 38px; line-height: 1; margin-bottom: var(--space-3);">✓</div>
                  <div style="font-family: var(--font-serif); font-size: 22px; line-height: 1.3; color: var(--ink); margin-bottom: var(--space-2);">All ${words.length} spelled perfect.</div>
                  <div style="font-size: 14px; color: var(--ink-quiet);">${attempts} total attempts.</div>
                </div>
                <div class="center-actions">
                  <button class="btn-primary" id="sp-done">${block.cta || 'Continue'}</button>
                </div>
              </div>
            `;
            host.querySelector('#sp-done').onclick = () => {
              if (window.SS && window.SS.saveArtifact) {
                window.SS.saveArtifact({ kind: 'spelling-drill', block_id: block.id, words, attempts, title: block.title });
              }
              complete(block.id, { words: words.length, attempts, budgetMinutes: block.minutes });
            };
            return;
          }
          showWord();
        } else {
          fb.textContent = `Not quite — try again.`;
          fb.style.color = '#8B3838';
          input.style.borderColor = '#8B3838';
          input.value = '';
          input.focus();
        }
      }

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); tryWord(); }
      });
      checkBtn.onclick = tryWord;
      input.focus();
    }

    if (words.length === 0) { complete(block.id); return; }
    showWord();
  }

  // public registry
  // ============================================================
  return {
    welcome, reading, typing, money,
    arduino, 'arduino-code': arduinoCode, 'writing-mini': writingMini,
    math, mathlesson, inspire, bag, showdad, splash,
    wordrun, spelling, tiles, speedread, video,
    'trick-arc': trickArc,
    handwriting,
    'roblox-lesson': robloxLesson,
    concept,
    'report-card': reportCard,
    'teach-back': teachBack,
    'typing-precise': typingPrecise,
    'spelling-drill': spellingDrill,
    'video-typed': videoTyped
  };
})();
