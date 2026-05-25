/* Summer School — module implementations
 * Each render function takes a host element + the block config + day content,
 * builds the module's UI inside the host, wires events, returns nothing.
 * Modules call SS.completeBlock(blockId, data) when finished.
 */

window.SSMod = (function () {
  'use strict';

  const day = () => window.CURRICULUM.monday;

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

  // ============================================================
  // WELCOME (day 1 orientation)
  // ============================================================
  function welcome(host, block) {
    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return 'Morning';
      if (h < 17) return 'Afternoon';
      return 'Evening';
    })();
    host.innerHTML = `
      ${topRail(0, 'Day 1', false)}
      <div class="greeting"><h1>${greeting}, Ethan.</h1>
        <div class="sub">Today's theme — <strong>${day().theme}</strong>. ${day().themeDesc}</div>
      </div>

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

      <div style="padding: var(--space-3) var(--space-5);">
        <div style="font-family: var(--font-serif); font-size: 18px; line-height: 1.55; color: var(--ink); margin-bottom: var(--space-5);">
          Today you'll learn:
        </div>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3);">
          <li style="display: flex; gap: var(--space-3); align-items: baseline; font-family: var(--font-serif); font-size: 17px; color: var(--ink);">
            <span style="color: var(--amber); font-weight: 600;">·</span>
            <span>How Roblox studios actually make money — the long road a Robux purchase travels before a developer sees a paycheck.</span>
          </li>
          <li style="display: flex; gap: var(--space-3); align-items: baseline; font-family: var(--font-serif); font-size: 17px; color: var(--ink);">
            <span style="color: var(--amber); font-weight: 600;">·</span>
            <span>The 3-bucket money rule (save / spend / give) and how to split your own money with it.</span>
          </li>
          <li style="display: flex; gap: var(--space-3); align-items: baseline; font-family: var(--font-serif); font-size: 17px; color: var(--ink);">
            <span style="color: var(--amber); font-weight: 600;">·</span>
            <span>What else your Zeus Car's Arduino chip can do — including 8 lines of code that run a real traffic light.</span>
          </li>
          <li style="display: flex; gap: var(--space-3); align-items: baseline; font-family: var(--font-serif); font-size: 17px; color: var(--ink);">
            <span style="color: var(--amber); font-weight: 600;">·</span>
            <span>Your first 7th-grade math concept — <strong>Unit Rates</strong> — taught with a short Khan Academy video.</span>
          </li>
          <li style="display: flex; gap: var(--space-3); align-items: baseline; font-family: var(--font-serif); font-size: 17px; color: var(--ink);">
            <span style="color: var(--amber); font-weight: 600;">·</span>
            <span>The story of <strong>Mikaila Ulmer</strong>, a 12-year-old who built a real lemonade business that's now in stores across the country.</span>
          </li>
          <li style="display: flex; gap: var(--space-3); align-items: baseline; font-family: var(--font-serif); font-size: 17px; color: var(--ink);">
            <span style="color: var(--amber); font-weight: 600;">·</span>
            <span>Plus the day's drills — typing, spelling, Word Run, Word Tiles, Speed-Read — all themed around what you just read.</span>
          </li>
        </ul>
        <div style="margin-top: var(--space-6); padding: var(--space-4) var(--space-5); background: var(--cream-card); border-left: 3px solid var(--amber); border-radius: 0 var(--r-md) var(--r-md) 0; font-family: var(--font-serif); font-style: italic; font-size: 15px; line-height: 1.5; color: var(--ink-soft);">
          How it works: you learn, then you practice. Read or watch something. Then the games and drills test what you just picked up. Each block is only a few minutes — the day shuffles formats so your brain stays locked in.
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
      <div class="center-actions">
        <button class="btn-primary" id="r-done" disabled style="opacity:0.5;">Answer the questions first</button>
      </div>
    `;

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
      if (answered === qs.length && window.SS) window.SS.awardStar('Reading perfect');
      complete(block.id, { questionsRight: answered, total: qs.length });
    };
  }

  // ============================================================
  // TYPING SPRINT
  // ============================================================
  function typing(host, block) {
    const target = day().typingTarget;
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
        if (acc >= 95 && window.SS) window.SS.awardStar('Clean typing sprint');
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
            if (drillsRight === pool.length && window.SS) window.SS.awardStar('Bucket mastered');
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
        if (t === m.scenario.amount && window.SS) window.SS.awardStar('Money math');
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

        <div class="center-actions" style="padding:0;">
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
      if (answered === wif.length && window.SS) window.SS.awardStar('Arduino read');
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
        if (right && window.SS) window.SS.awardStar('Code-read');
        host.querySelector('#ac-done').style.display = 'inline-flex';
      };
    });
    host.querySelector('#ac-done').onclick = () => complete(block.id);
  }

  // ============================================================
  // ARDUINO — writing micro (handwritten)
  // ============================================================
  function writingMini(host, block) {
    const a = day().arduino;
    host.innerHTML = `
      ${topRail(80, 'on paper')}
      ${moduleHead('Quick Write', 'On paper, two sentences')}
      <div class="writing-stage module-narrow">
        <div class="writing-prompt">
          <div class="label">Prompt</div>
          <div class="text" data-dict>${a.writingPrompt}</div>
          <div class="meta"><span>Hand write it</span><span>2 sentences min</span></div>
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
    ['approve-dad', 'approve-mom'].forEach(id => {
      host.querySelector('#' + id).onclick = () => {
        if (window.SS) {
          window.SS.dadApproveLatest();
          window.SS.awardStar('Approved write-up');
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
        if (right === probs.length && window.SS) window.SS.awardStar('Math sweep');
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
      <div class="center-actions">
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
      if (answered === quiz.length && window.SS) window.SS.awardStar('Inspired + tested');
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
        <div class="bag-prompt">
          <div class="day-label">Today's beat</div>
          <div class="text" data-dict>${b.prompt}</div>
          <div class="help">${b.help}</div>
        </div>
        <div class="approve-card">
          <div class="big">When it's written</div>
          <div class="small">Tap the parent who read it.</div>
          <div class="approve-row">
            <button class="btn-amber" id="bag-dad">Dad approved</button>
            <button class="btn-amber" id="bag-mom">Mom approved</button>
          </div>
        </div>
      </div>
    `;

    ['bag-dad', 'bag-mom'].forEach(id => {
      host.querySelector('#' + id).onclick = () => {
        if (window.SS) {
          window.SS.saveBagBeat('mon', 'name', '[handwritten — approved by ' + (id === 'bag-dad' ? 'Dad' : 'Mom') + ']');
          window.SS.awardStar('Game name locked');
        }
        complete(block.id, { approver: id === 'bag-dad' ? 'dad' : 'mom' });
      };
    });
  }

  // ============================================================
  // SHOW DAD / MOM
  // ============================================================
  function showdad(host, block) {
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
        </div>
      </div>
    `;
    ['show-dad-final', 'show-mom-final'].forEach(id => {
      host.querySelector('#' + id).onclick = () => {
        if (window.SS) window.SS.awardStar('Showed a parent');
        complete(block.id);
      };
    });
  }

  // ============================================================
  // END-OF-DAY SPLASH
  // ============================================================
  function splash(host, block) {
    const stars = window.SS ? window.SS.goldStars : 0;
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
          <div class="stat"><div class="v">${stars}</div><div class="l">Gold stars</div></div>
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
                window.SS.awardStar('Word Run cleared');
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
          if (right === words.length && window.SS) window.SS.awardStar('Perfect spelling round');
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
    //  - block.count: 10 → randomly pull N from day().tileVocab
    //  - block.words: ['studio', 'robux'] → look up in tileVocab (legacy strings)
    //  - block.words: [{word, clue}, ...] → use as-is
    const pool = (day().tileVocab) || [];
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
          if (window.SS) window.SS.awardStar('Tiles ' + target);
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
    const words = day().passage.paragraphs.join(' ').split(/\s+/);
    const srQuiz = day().passage.srComprehension || [];
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
          if (window.SS) window.SS.awardStar('Speed-read sweep');
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
        <div class="center-actions">
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
        if (answered === srQuiz.length && window.SS) window.SS.awardStar('Speed-read + nailed');
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
          <div class="center-actions" style="padding: var(--space-5) 0 0;">
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
        if (right === v.questions.length && window.SS) window.SS.awardStar('Video quiz nailed');
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
      if (stage) stage.style.display = 'none';
      if (summary) summary.style.display = 'block';
      if (hint) hint.innerHTML = "Video can't load — read the lesson instead, then take the quiz.";
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
        if (stg) stg.style.display = 'none';
        if (summary) summary.style.display = 'block';
        if (hint) hint.innerHTML = "Video can't load — read the lesson instead, then take the quiz.";
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
          if (pRight === pTotal && window.SS) window.SS.awardStar('Math lesson nailed');
          if (cRight + pRight >= (cTotal + pTotal - 1) && window.SS) window.SS.awardStar('Concept #' + ml.number + ' mastered');
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

    renderIntro();
  }

  // public registry — add mathlesson
  // ============================================================
  // public registry
  // ============================================================
  return {
    welcome, reading, typing, money,
    arduino, 'arduino-code': arduinoCode, 'writing-mini': writingMini,
    math, mathlesson, inspire, bag, showdad, splash,
    wordrun, spelling, tiles, speedread, video
  };
})();
