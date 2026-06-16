/* Wizard Chat — minimal test interface for summerschool
 * Replaces form-based UI with direct chat to the Wizard.
 * Sends messages to /api/embed/chat, polls /api/embed/messages for replies.
 */

(function () {
  'use strict';

  const APP_HOST = document.getElementById('app-host');
  const EMBED_ID = 'emb_summerschool'; // Registered embed ID in _embeds.json
  const POLL_INTERVAL_MS = 1500; // Poll for new messages every 1.5s
  const VIDEO_EMBEDS_ENABLED = false; // Off until the curated-video layer is approved (council decision #2)

  // Game-progress tuning (design values, honest — driven by real completions).
  const XP_PER_SUBJECT = 10; // each subject the Wizard marks "done" in the ledger
  const XP_PER_LEVEL = 50; // 5 completed subjects per level
  const SUMMER_WIN_XP = 1200; // ~120 subjects across the summer = "win summer school"

  // App state
  let appState = {
    messages: [],
    inputValue: '',
    essayInput: '', // draft text in the Writing Desk box (preserved across renders)
    isLoading: false,
    sinceTs: null, // ISO timestamp — poll for messages newer than this
    sessionId: null,
    dayState: null, // Wizard's day ledger string — drives Today's Quests
    essay: null, // array of sentences Ethan typed into the Writing Desk today
    assignments: null, // [{text, status}] the Wizard tracks + follows up on
    projects: null, // [{name, status}] Ethan's own projects, for fun (Build R6)
    reminders: null, // [{text, status}] his own to-dos the Wizard holds as his EA (Build R8 slice 3)
    progress: null, // { totalDone, todayDone, streak, activeDays } base from page load
    baseDone: 0, // all-time subjects done BEFORE today (today is tracked live)
    doneCount: null, // today's completed-subject count (live; null until baseline set)
    hudReady: false, // suppresses the win-burst during the initial load
    celebrateMsg: null, // transient win-burst banner text
    resumeBanner: null, // "welcome back, you're on X" after a refresh (never lose his place)
    worldOpen: false, // My World overview overlay (Build R8 slice 2) — additive, never the default surface
    theme: localStorage.getItem('wizard-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  };

  // Parse the Wizard's day ledger ("Reading=done; Specials1(Music)=next; note=...")
  // into quest entries + a note. Unknown fragments are skipped, not crashed on.
  function parseDayState(state) {
    if (!state || typeof state !== 'string') return null;
    const quests = [];
    let note = '';
    // Split on ';' but not inside parens — the checklist detail uses commas
    // and may contain ';'-free prose; parens carry per-subject steps.
    for (const part of state.split(/;(?![^(]*\))/)) {
      const m = part.match(/^\s*([^=]+?)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim();
      if (/^(note|now)$/i.test(key)) {
        // "now" is the Wizard's save point — more useful on screen than the
        // internal revisit note when both exist.
        if (/^now$/i.test(key) || !note) note = val;
        continue;
      }
      // Specials1(Communication) → Communication; plain keys pass through
      const special = key.match(/^Specials?\d*\s*\(([^)]+)\)$/i);
      const name = special ? special[1].trim() : key;
      // Skip unnamed-special placeholders the model sometimes copies from the
      // ledger template ("Specials1(name)" / "none") — a junk "NAME" row on the
      // board just confuses him.
      if (!name || /^(name|none|\(none\))$/i.test(name)) continue;
      // Status is the first token; optional "(convo done, step: ...)" detail follows
      const detailMatch = val.match(/^([^(\s]+)\s*(?:\(([^)]*)\))?/);
      const status = (detailMatch ? detailMatch[1] : val).toLowerCase().replace(/\s+/g, '-');
      const stepMatch = detailMatch && detailMatch[2] ? detailMatch[2].match(/step:\s*([^,)]+)/i) : null;
      quests.push({ name, status, step: stepMatch ? stepMatch[1].trim() : '' });
    }
    return quests.length ? { quests, note } : null;
  }

  function questStatusMeta(status) {
    switch (status) {
      case 'done': return { icon: '&#10004;', label: 'Done', cls: 'quest-done' };
      case 'in-progress': return { icon: '&#9670;', label: 'In progress', cls: 'quest-active' };
      case 'next': return { icon: '&#10148;', label: 'Up next', cls: 'quest-next' };
      default: return { icon: '&#9675;', label: 'Not started', cls: 'quest-todo' };
    }
  }

  function renderQuestsPanel() {
    const parsed = parseDayState(appState.dayState);
    if (!parsed) {
      return `<div class="action-placeholder">
            <span class="action-placeholder-icon">&#10022;</span>
            Your quests for today are being prepared by the Wizard &mdash; they&rsquo;ll appear here when your morning session begins.
          </div>`;
    }
    const rows = parsed.quests
      .map((q) => {
        const meta = questStatusMeta(q.status);
        const isNow = q.status === 'in-progress';
        const stepHtml = q.step && isNow
          ? `<div class="quest-step">${escapeHtml(q.step)}</div>`
          : '';
        // The subject he's on RIGHT NOW is the hero of the board — a gold NOW
        // badge with a live dot, so he always knows the one thing to do now.
        const statusHtml = isNow
          ? `<span class="quest-now"><span class="quest-now-dot"></span>NOW</span>`
          : `<span class="quest-status">${meta.label}</span>`;
        return `<div class="quest-row ${meta.cls}">
            <span class="quest-icon">${meta.icon}</span>
            <span class="quest-name">${escapeHtml(q.name)}${stepHtml}</span>
            ${statusHtml}
          </div>`;
      })
      .join('');
    // The ledger's now=/note= fields are the Wizard's internal teacher notes
    // (frank observations, save points) — never rendered on Ethan's screen.
    return `<div class="quest-list">${rows}</div>`;
  }

  // --- Game progress (Build R6) ----------------------------------------------
  // Honest: every number traces to subjects the Wizard marked "done" in the
  // real ledger. Today's count is live (from day_state each turn); the all-time
  // base + streak are fetched once on page load.

  function countDoneNow() {
    const parsed = parseDayState(appState.dayState);
    return parsed ? parsed.quests.filter((q) => q.status === 'done').length : 0;
  }

  // The subject Ethan is currently on — for the "welcome back" resume bar so a
  // refresh never leaves him guessing where he was. In-progress wins, else the
  // next queued, else the first not-yet-done.
  function currentSubject() {
    const parsed = parseDayState(appState.dayState);
    if (!parsed) return null;
    const ip = parsed.quests.find((q) => q.status === 'in-progress');
    if (ip) return ip.name;
    const nx = parsed.quests.find((q) => q.status === 'next');
    if (nx) return nx.name;
    const todo = parsed.quests.find((q) => q.status !== 'done');
    return todo ? todo.name : null;
  }

  function levelTitle(level) {
    if (level >= 20) return 'Archmage';
    if (level >= 14) return 'Sage';
    if (level >= 9) return 'Mage';
    if (level >= 6) return 'Adept';
    if (level >= 4) return 'Scribe';
    if (level >= 2) return 'Scholar';
    return 'Apprentice';
  }

  function gameStats() {
    const today = appState.doneCount || 0;
    const totalDone = (appState.baseDone || 0) + today;
    const xp = totalDone * XP_PER_SUBJECT;
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const levelPct = Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);
    const winPct = Math.min(100, Math.round((xp / SUMMER_WIN_XP) * 100));
    const streak = (appState.progress && appState.progress.streak) || 0;
    const parsed = parseDayState(appState.dayState);
    const todayTotal = parsed ? parsed.quests.length : 0;
    return { xp, level, title: levelTitle(level), levelPct, winPct, streak, todayDone: today, todayTotal };
  }

  // After a ledger update, see whether a new subject just completed and fire
  // the win-burst. Silent during the initial load (hudReady=false).
  function checkCompletion() {
    const live = countDoneNow();
    if (appState.doneCount == null) {
      appState.doneCount = live;
      return;
    }
    if (appState.hudReady && live > appState.doneCount) {
      const gained = live - appState.doneCount;
      triggerCelebration('Quest complete!  +' + gained * XP_PER_SUBJECT + ' XP');
    }
    appState.doneCount = live;
  }

  let celebrateTimer = null;
  function triggerCelebration(msg) {
    appState.celebrateMsg = msg;
    render();
    if (celebrateTimer) clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(() => {
      appState.celebrateMsg = null;
      render();
    }, 2600);
  }

  function renderGameHud() {
    const s = gameStats();
    const streakHtml = s.streak > 1
      ? `<div class="hud-streak"><span class="hud-streak-icon">&#9650;</span>${s.streak}-day streak</div>`
      : '';
    const todayHtml = s.todayTotal
      ? `${s.todayDone}/${s.todayTotal} quests today`
      : 'Begin your climb';
    return `
      <div class="game-hud">
        <div class="hud-top">
          <div class="hud-level">
            <span class="hud-level-num">Lv ${s.level}</span>
            <span class="hud-level-title">${s.title}</span>
          </div>
          ${streakHtml}
        </div>
        <div class="hud-xpbar"><div class="hud-xpbar-fill" style="width:${s.levelPct}%"></div></div>
        <div class="hud-xp-label">${s.xp} XP &middot; ${todayHtml}</div>
        <div class="hud-prize">
          <div class="hud-prize-label"><span class="hud-prize-orn">&#10022;</span> Road to winning Summer School</div>
          <div class="hud-prizebar"><div class="hud-prizebar-fill" style="width:${s.winPct}%"></div></div>
          <div class="hud-prize-sub">${s.winPct}% &middot; a reward waits at the finish</div>
        </div>
      </div>`;
  }

  // --- Assignments (Build R5) — what the Wizard set for Ethan to do ----------
  function renderAssignments() {
    const items = appState.assignments || [];
    if (!items.length) return '';
    const rows = items.map((a, i) => {
      const done = (a.status || '').toLowerCase() === 'done';
      // Pending items get a tappable check so Ethan can mark his own work done.
      const icon = done
        ? `<span class="assign-icon">&#10004;</span>`
        : `<button type="button" class="assign-icon check-btn" title="Mark done" onclick="window.__wizardChat.completeItem('assignment', ${i})">&#9675;</button>`;
      return `<div class="assign-row ${done ? 'assign-done' : ''}">
          ${icon}
          <span class="assign-text">${escapeHtml(a.text)}</span>
        </div>`;
    }).join('');
    return `<div class="assign-panel">
        <div class="action-title">&#9998; Assignments</div>
        <div class="assign-list">${rows}</div>
      </div>`;
  }

  // --- After-school check-in (Build R7) --------------------------------------
  // True when Ethan's Phoenix clock is in the after-school window (2:10pm-9pm) —
  // when school lets out at Kenilworth. Drives the check-in chip + the
  // after_school flag on chat sends (so the Wizard wraps up the day). A
  // ?afterschool=1 URL param forces it on for testing/screenshots only.
  function isAfterSchoolNow() {
    try {
      if (/[?&]afterschool=1\b/.test(window.location.search)) return true;
      const s = new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix', hour12: false, hour: '2-digit', minute: '2-digit' });
      const m = s.match(/(\d{1,2}):(\d{2})/);
      if (!m) return false;
      const mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      return mins >= (14 * 60 + 10) && mins < (21 * 60); // 2:10pm - 9pm
    } catch (e) { return false; }
  }
  // Time-aware header (Build R8 slice 5) — the greeting matched his real clock.
  // Saying "Morning, Ethan" at 8pm is exactly the HUD-vs-reality mismatch that
  // pulls his focus, so the title + subtitle track the Phoenix time of day.
  function headerGreeting() {
    let mins = 9 * 60; // safe default = morning
    try {
      const s = new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix', hour12: false, hour: '2-digit', minute: '2-digit' });
      const m = s.match(/(\d{1,2}):(\d{2})/);
      if (m) mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    } catch (e) {}
    if (isAfterSchoolNow()) return { title: 'Afternoon, Ethan', sub: 'School&rsquo;s out &mdash; let&rsquo;s wrap up today' };
    if (mins < 12 * 60) return { title: 'Morning, Ethan', sub: 'The Wizard awaits &mdash; today&rsquo;s lessons are ready' };
    if (mins < 17 * 60) return { title: 'Afternoon, Ethan', sub: 'The Wizard awaits &mdash; let&rsquo;s keep today going' };
    return { title: 'Evening, Ethan', sub: 'Winding down &mdash; a little more and you&rsquo;re set' };
  }

  function renderAfterSchoolChip() {
    if (!isAfterSchoolNow()) return '';
    return `<div class="afterschool-chip">
      <span class="afterschool-icon">&#9790;</span>
      <div class="afterschool-body">
        <div class="afterschool-title">After-school check&#8209;in</div>
        <div class="afterschool-sub">Let&rsquo;s wrap up today and set up tomorrow.</div>
      </div>
    </div>`;
  }

  // --- Ethan's projects (Build R6) — his own ideas, for fun ------------------
  function renderProjects() {
    const items = appState.projects || [];
    if (!items.length) return '';
    const rows = items.map((p, i) => {
      const done = (p.status || '').toLowerCase() === 'done';
      // Tap a project to open it — the Wizard becomes Ethan's teammate on it.
      return `<button type="button" class="project-row ${done ? 'project-done' : ''}"
          ${appState.isLoading ? 'disabled' : ''}
          onclick="window.__wizardChat.openProject(${i})"
          title="Open this project with the Wizard">
          <span class="project-icon">${done ? '&#9733;' : '&#9671;'}</span>
          <span class="project-text">${escapeHtml(p.name)}</span>
          <span class="project-open">&#10148;</span>
        </button>`;
    }).join('');
    return `<div class="project-panel">
        <div class="action-title">&#9670; My Projects</div>
        <div class="project-list">${rows}</div>
        <div class="project-hint">Tap a project to work on it with the Wizard.</div>
      </div>`;
  }

  // --- Reminders (Build R8 slice 3) — the Wizard as Ethan's EA ---------------
  // His own to-dos (not school). The Wizard holds them and brings them up.
  function renderReminders() {
    const all = appState.reminders || [];
    const open = all.map((r, i) => ({ r, i })).filter(({ r }) => (r.status || '').toLowerCase() !== 'done');
    if (!open.length) return '';
    const rows = open.map(({ r, i }) => `<div class="remind-row">
          <button type="button" class="remind-icon check-btn" title="Mark done" onclick="window.__wizardChat.completeItem('reminder', ${i})">&#9788;</button>
          <span class="remind-text">${escapeHtml(r.text)}</span>
        </div>`).join('');
    return `<div class="remind-panel">
        <div class="action-title">&#9788; Wizard Is Remembering</div>
        <div class="remind-list">${rows}</div>
      </div>`;
  }

  // --- My World overview (Build R8 slice 2) — Ethan's own Corner home --------
  // A tap-in overview of his areas: his School (the Wizard class) + his own
  // Projects. Additive overlay — the chat stays his default surface, so a
  // refresh always lands him back in his place. Tapping an area takes him in.
  function renderWorld() {
    if (!appState.worldOpen) return '';
    const g = gameStats();
    const subj = currentSubject();
    const projects = appState.projects || [];
    const projectCards = projects.length
      ? projects.map((p, i) => {
          const done = (p.status || '').toLowerCase() === 'done';
          return `<button type="button" class="world-card world-card--project ${done ? 'is-done' : ''}"
              onclick="window.__wizardChat.openProject(${i})">
              <span class="world-card-icon">${done ? '&#9733;' : '&#9671;'}</span>
              <span class="world-card-body">
                <span class="world-card-title">${escapeHtml(p.name)}</span>
                <span class="world-card-sub">${done ? 'Finished &mdash; open to revisit' : 'Open to work on it with the Wizard'}</span>
              </span>
              <span class="world-card-go">&#10148;</span>
            </button>`;
        }).join('')
      : `<div class="world-empty">No projects yet. Tell the Wizard something you want to build for fun and it will show up here.</div>`;
    const openReminders = (appState.reminders || []).filter((r) => (r.status || '').toLowerCase() !== 'done');
    const worldReminders = openReminders.length
      ? `<div class="world-section-label">The Wizard Is Remembering</div>
         <div class="world-card-list">${openReminders.map((r) => `<div class="world-card world-card--remind">
            <span class="world-card-icon">&#9788;</span>
            <span class="world-card-body"><span class="world-card-title">${escapeHtml(r.text)}</span></span>
          </div>`).join('')}</div>`
      : '';
    return `<div class="world-overlay" onclick="if(event.target===this)window.__wizardChat.closeWorld()">
        <div class="world-panel" role="dialog" aria-label="Ethan's Corner">
          <button class="world-close" title="Back to the Wizard" onclick="window.__wizardChat.closeWorld()">&times;</button>
          <div class="world-head">
            <div class="world-eyebrow">&#10022; Ethan&rsquo;s Corner</div>
            <h2 class="world-title">My World</h2>
          </div>
          <div class="world-section-label">School</div>
          <button type="button" class="world-card world-card--school" onclick="window.__wizardChat.closeWorld()">
            <span class="world-card-icon">&#9876;</span>
            <span class="world-card-body">
              <span class="world-card-title">Summer School with the Wizard</span>
              <span class="world-card-sub">Level ${g.level} ${escapeHtml(g.title)} &middot; ${g.todayDone}/${g.todayTotal || 6} done today${subj ? ` &middot; on ${escapeHtml(subj)}` : ''}</span>
            </span>
            <span class="world-card-go">&#10148;</span>
          </button>
          <div class="world-section-label">My Projects</div>
          <div class="world-card-list">${projectCards}</div>
          ${worldReminders}
        </div>
      </div>`;
  }

  // --- Countdown to school (Build R8 R4) -------------------------------------
  // Frames the summer as prep: days until 7th grade at Kenilworth. Date is our
  // canon (CONTEXT.md "August 3rd, 7th grade starts"); confirm with Patrik and
  // change SCHOOL_START if Kenilworth's actual first day differs.
  const SCHOOL_START = '2026-08-03';
  function daysUntilSchool() {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      const now = new Date(today + 'T00:00:00-07:00');
      const start = new Date(SCHOOL_START + 'T00:00:00-07:00');
      return Math.round((start - now) / 86400000);
    } catch (e) { return null; }
  }
  function renderCountdown() {
    const d = daysUntilSchool();
    if (d == null || d < 0) return '';
    if (d === 0) {
      return `<div class="countdown-chip">
        <span class="countdown-num">0</span>
        <span class="countdown-label">First day of 7th grade at Kenilworth. You&rsquo;re ready.</span>
      </div>`;
    }
    return `<div class="countdown-chip">
      <span class="countdown-num">${d}</span>
      <span class="countdown-label">day${d === 1 ? '' : 's'} until 7th grade at Kenilworth.<br>Let&rsquo;s be ready.</span>
    </div>`;
  }

  // --- Writing Desk (Build R6) -----------------------------------------------
  // A real surface where Ethan TYPES his essay one sentence at a time. Opens
  // when the Wizard marks Writing in-progress, or once the essay has content.

  function isWritingActive() {
    const parsed = parseDayState(appState.dayState);
    if (parsed) {
      const w = parsed.quests.find((q) => /writ/i.test(q.name));
      if (w && w.status === 'in-progress') return true;
    }
    return !!(appState.essay && appState.essay.length);
  }

  function renderWritingDesk() {
    const sentences = appState.essay || [];
    const bodyHtml = sentences.length
      ? `<div class="essay-paragraph">${sentences
          .map((sn, i) => `<span class="essay-sentence${i === sentences.length - 1 ? ' essay-sentence--new' : ''}">${escapeHtml(sn)}</span>`)
          .join(' ')}</div>
         <div class="essay-count">${sentences.length} sentence${sentences.length === 1 ? '' : 's'} written</div>`
      : `<div class="essay-empty">Your essay starts here. Type your first sentence below &mdash; one at a time, and watch it grow into a whole paragraph.</div>`;
    return `
      <div class="writing-desk">
        <div class="action-title">&#9998; My Writing Desk</div>
        ${bodyHtml}
        <div class="essay-input-row">
          <textarea
            class="essay-input"
            rows="3"
            placeholder="Write your next sentence here..."
            ${appState.isLoading ? 'disabled' : ''}
            onkeydown="if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); window.__wizardChat.addSentence(this.value); }"
          >${escapeHtml(appState.essayInput || '')}</textarea>
          <button
            class="essay-add-btn"
            ${appState.isLoading ? 'disabled' : ''}
            onclick="window.__wizardChat.addSentence(document.querySelector('.essay-input').value)"
          >Add my sentence</button>
        </div>
        <div class="essay-hint">Type your sentence, then add it. Press Enter or tap the button. Talking it through doesn&rsquo;t count &mdash; writing it does.</div>
      </div>`;
  }

  // Derive today's day name for curriculum context
  function getTodayDay() {
    const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return DAY_NAMES[new Date().getDay()];
  }

  // Initialize visitor ID — localStorage so the conversation survives
  // refreshes and new tabs (was sessionStorage, which wiped on refresh).
  function initSessionId() {
    // Testing reset: /summerschool?reset wipes the saved session and starts
    // a brand-new day (fresh visitor id = fresh history + fresh AI memory).
    // Param is stripped from the URL so a refresh doesn't re-reset.
    if (new URLSearchParams(window.location.search).has('reset')) {
      localStorage.removeItem('wizard-chat-session-id');
      sessionStorage.removeItem('wizard-chat-session-id');
      window.history.replaceState({}, '', window.location.pathname);
    }
    let sid = localStorage.getItem('wizard-chat-session-id');
    if (!sid) {
      // Migrate any old sessionStorage id so today's thread isn't lost
      sid = sessionStorage.getItem('wizard-chat-session-id');
      if (!sid) {
        sid = 'ss-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      }
      localStorage.setItem('wizard-chat-session-id', sid);
    }
    appState.sessionId = sid;
  }

  // Apply the game-progress base returned by the load path.
  function applyProgress(progress) {
    if (!progress) return;
    appState.progress = progress;
    const total = progress.totalDone || 0;
    const today = progress.todayDone || 0;
    appState.baseDone = Math.max(0, total - today);
    appState.doneCount = today;
  }

  // Load this visitor's conversation for TODAY from the server (survives
  // refresh, new tab, device sleep — the server is the source of truth).
  // Scoped to today's Phoenix midnight so we get ALL of today's messages
  // without hitting the 200-row cap on 7-day history.
  async function loadHistory() {
    try {
      // Full-day history: scope to today in Phoenix timezone.
      // Arizona (Phoenix) stays on MST = UTC-7 year-round (no DST).
      const todayPhoenix = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      const sinceTodayMidnight = new Date(todayPhoenix + 'T00:00:00-07:00').toISOString();

      const params = new URLSearchParams({
        embed_id: EMBED_ID,
        history: '1',
        visitor_id: 'ethan-' + appState.sessionId,
        since: sinceTodayMidnight,
      });
      const response = await fetch(`/api/embed/messages?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data.day_state) appState.dayState = data.day_state;
      if (Array.isArray(data.essay)) appState.essay = data.essay;
      if (Array.isArray(data.assignments)) appState.assignments = data.assignments;
      if (Array.isArray(data.projects)) appState.projects = data.projects;
      if (Array.isArray(data.reminders)) appState.reminders = data.reminders;
      applyProgress(data.progress);
      if (!Array.isArray(data.messages) || data.messages.length === 0) return false;
      let hadVisible = false;
      for (const msg of data.messages) {
        // Skip hidden session-start triggers (sent by requestWizardGreeting on
        // a fresh day — they're internal scaffolding, not part of Ethan's convo).
        if (msg.role === 'user' && (msg.text || '').trim() === '<<session-start>>') continue;
        hadVisible = true;
        appState.messages.push({
          role: msg.role || 'wizard',
          text: msg.text || '',
          timestamp: msg.timestamp || Date.now(),
          id: msg.id,
        });
        if (msg.timestamp && (!appState.sinceTs || msg.timestamp > appState.sinceTs)) {
          appState.sinceTs = msg.timestamp;
        }
      }
      return hadVisible;
    } catch (e) {
      console.warn('History load error:', e);
      return false;
    }
  }

  // Request a server-generated opening greeting for a fresh session.
  // Posts a hidden <<session-start>> trigger — the Wizard uses the day
  // ledger + cross-day memory to craft a personalized opener (e.g. "Morning,
  // Ethan! Yesterday you crushed those math problems…"). The trigger message
  // is never added to appState.messages — Ethan only sees the Wizard's reply.
  // The day_state in the reply seeds the Today's Quests panel immediately.
  async function requestWizardGreeting() {
    appState.isLoading = true;
    render();
    try {
      const response = await fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embed_id: EMBED_ID,
          content: '<<session-start>>',
          visitor_id: 'ethan-' + appState.sessionId,
          host_origin: window.location.origin,
          // After 2:10pm the opening greeting becomes the after-school check-in.
          after_school: isAfterSchoolNow(),
        }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.day_state) appState.dayState = data.day_state;
      if (Array.isArray(data.essay)) appState.essay = data.essay;
      if (Array.isArray(data.assignments)) appState.assignments = data.assignments;
      if (Array.isArray(data.projects)) appState.projects = data.projects;
      if (Array.isArray(data.reminders)) appState.reminders = data.reminders;
      if (appState.doneCount == null) appState.doneCount = countDoneNow();
      // Advance sinceTs so the poll picks up from after the greeting was inserted.
      if (data.since_ts && data.since_ts > appState.sinceTs) {
        appState.sinceTs = data.since_ts;
      }
      // Show the Wizard's greeting reply immediately (no poll wait).
      if (data.reply && data.reply.text) {
        appState.messages.push({
          role: 'assistant',
          text: data.reply.text,
          timestamp: Date.now(),
          id: data.reply.id,
        });
      }
    } catch (e) {
      console.warn('[wizard] Session greeting request failed:', e);
    } finally {
      appState.isLoading = false;
    }
  }

  // Send a message to the Wizard. opts.essayMode marks it as a Writing Desk
  // sentence — the server appends it to today's essay and tells the Wizard to
  // react to it, while it also flows through chat as a normal turn.
  async function sendMessage(text, opts) {
    opts = opts || {};
    if (!text.trim()) return;
    appState.resumeBanner = null; // he's moving again — drop the welcome-back bar

    // Optimistically add user message to UI
    appState.messages.push({
      role: 'user',
      text: text,
      timestamp: Date.now(),
    });

    appState.inputValue = '';
    render();

    // Send to embed API
    try {
      appState.isLoading = true;
      const payload = {
        embed_id: EMBED_ID,
        content: text,
        visitor_id: 'ethan-' + appState.sessionId,
        host_origin: window.location.origin,
      };
      if (opts.essayMode) payload.essay_mode = true;
      if (isAfterSchoolNow()) payload.after_school = true;
      if (opts.projectFocus) payload.project_focus = opts.projectFocus;
      const response = await fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Send failed:', response.status, response.statusText);
        // Keep the user's message visible — silently vanishing is worse than an error.
        // Show a retry nudge so Ethan knows to send again.
        appState.messages.push({
          role: 'assistant',
          text: "Hmm, something went wrong on my end — can you send that again?",
          timestamp: Date.now(),
        });
      } else {
        const data = await response.json();
        if (data.day_state) appState.dayState = data.day_state;
        if (Array.isArray(data.essay)) appState.essay = data.essay;
      if (Array.isArray(data.assignments)) appState.assignments = data.assignments;
      if (Array.isArray(data.projects)) appState.projects = data.projects;
      if (Array.isArray(data.reminders)) appState.reminders = data.reminders;
        checkCompletion();
        // Use the server's since_ts so we poll from after the user message
        if (data.since_ts) {
          appState.sinceTs = appState.sinceTs || data.since_ts;
        }
        // The API now returns the Wizard's reply inline — render it right
        // away instead of waiting on the poll (poll dedupes by id).
        if (data.reply && data.reply.text) {
          appState.messages.push({
            role: 'assistant',
            text: data.reply.text,
            timestamp: Date.now(),
            id: data.reply.id,
          });
        } else if (data.ai_error) {
          console.error('Wizard reply error:', data.ai_error);
          appState.messages.push({
            role: 'assistant',
            text: "Hmm, something flickered on my end — try sending that again in a moment.",
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      console.error('Send error:', e);
      // Keep the user's message visible; show a retry nudge.
      appState.messages.push({
        role: 'assistant',
        text: "Hmm, something went wrong on my end — can you send that again?",
        timestamp: Date.now(),
      });
    } finally {
      appState.isLoading = false;
      render();
    }
  }

  // Poll for new messages from the Wizard
  async function pollMessages() {
    if (!appState.sinceTs) return; // sinceTs set at init; just a safety guard
    try {
      const params = new URLSearchParams({
        embed_id: EMBED_ID,
        since: appState.sinceTs,
        visitor_id: 'ethan-' + appState.sessionId,
      });
      const response = await fetch(`/api/embed/messages?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn('Poll failed:', response.status);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        // Track the newest timestamp so next poll doesn't re-fetch the same rows
        const seenIds = new Set(appState.messages.map((m) => m.id).filter(Boolean));
        let gotNew = false;
        for (const msg of data.messages) {
          if (seenIds.has(msg.id)) continue;
          appState.messages.push({
            role: msg.role || 'wizard',
            text: msg.text || msg.content || '',
            timestamp: msg.timestamp || Date.now(),
            id: msg.id,
          });
          // Advance since_ts to just after the last message we saw
          if (msg.timestamp && msg.timestamp > appState.sinceTs) {
            appState.sinceTs = msg.timestamp;
          }
          gotNew = true;
        }
        if (gotNew) render();
      }
    } catch (e) {
      console.warn('Poll error:', e);
    }
  }

  // Extract YouTube/Vimeo URL from text
  function extractVideoUrl(text) {
    // YouTube patterns: youtu.be/ID or youtube.com/watch?v=ID
    const youtubeMatch = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return { type: 'youtube', id: youtubeMatch[1] };
    }
    // Vimeo pattern: vimeo.com/ID
    const vimeoMatch = text.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { type: 'vimeo', id: vimeoMatch[1] };
    }
    return null;
  }

  // Create video embed HTML
  function createVideoEmbed(video) {
    if (video.type === 'youtube') {
      return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${video.id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px; margin-top: 8px;"></iframe>`;
    } else if (video.type === 'vimeo') {
      return `<iframe src="https://player.vimeo.com/video/${video.id}" width="100%" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="border-radius: 8px; margin-top: 8px;"></iframe>`;
    }
    return '';
  }

  // Render the chat UI
  function render() {
    // Preserve anything the user has typed across re-renders (polls)
    const liveInput = document.querySelector('.chat-input');
    if (liveInput) appState.inputValue = liveInput.value;
    const liveEssay = document.querySelector('.essay-input');
    if (liveEssay) appState.essayInput = liveEssay.value;

    const messagesHtml = appState.messages
      .filter((msg) => msg.text && msg.text.trim())
      .map((msg, idx) => {
        const isWizard = msg.role === 'wizard' || msg.role === 'assistant';
        const classes = isWizard ? 'message wizard-message' : 'message user-message';
        // Video embeds disabled pending the curated-video decision (canon: no video in chat).
        // Re-enable by flipping VIDEO_EMBEDS_ENABLED once the council approves a curated layer.
        const video = VIDEO_EMBEDS_ENABLED ? extractVideoUrl(msg.text) : null;
        const videoHtml = video ? createVideoEmbed(video) : '';
        return `<div class="${classes}">${formatMessage(msg.text)}${videoHtml}</div>`;
      })
      .join('');

    const loadingIndicator = appState.isLoading
      ? `<div class="message wizard-message typing-indicator">
           <span class="typing-label">The Wizard is thinking</span>
           <span class="typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
         </div>`
      : '';

    const celebrateHtml = appState.celebrateMsg
      ? `<div class="celebrate-burst">${escapeHtml(appState.celebrateMsg)}</div>`
      : '';

    const html = `
      <div class="wizard-chat-container">
        ${celebrateHtml}
        <div class="chat-header">
          <h1><span class="header-ornament-inline">&#10022;</span> ${headerGreeting().title} <span class="header-ornament-inline">&#10022;</span></h1>
          <p>${headerGreeting().sub}</p>
          <div class="theme-selector" title="Choose Light or Dark Theme">
            <button class="theme-btn light ${appState.theme === 'light' ? 'active' : ''}" onclick="window.__wizardChat.setTheme('light')" title="Light Theme">
              <span class="theme-icon">&#9728;</span>
            </button>
            <button class="theme-btn dark ${appState.theme === 'dark' ? 'active' : ''}" onclick="window.__wizardChat.setTheme('dark')" title="Dark Theme">
              <span class="theme-icon">&#9790;</span>
            </button>
          </div>
          <button class="world-btn" title="My World" onclick="window.__wizardChat.openWorld()">
            <span class="world-btn-icon">&#9636;</span> My World
          </button>
        </div>
        ${renderWorld()}

        <div class="wizard-rail">
          <img class="wizard-figure" src="/summerschool/wizard.png?v=20260611a" alt="The Wizard" />
          <div class="wizard-nameplate">The Wizard</div>
        </div>

        <div class="messages-container${appState.messages.length === 0 && appState.isLoading ? ' messages-container--init' : ''}">
          ${appState.resumeBanner ? `<div class="resume-banner">
            <span class="resume-text">Welcome back, Ethan. You&rsquo;re on <strong>${escapeHtml(appState.resumeBanner)}</strong> &mdash; pick up right below.</span>
            <button class="resume-dismiss" title="Got it" onclick="window.__wizardChat.dismissResume()">&times;</button>
          </div>` : ''}
          ${messagesHtml}
          ${loadingIndicator}
        </div>

        <div class="chat-input-area">
          <input
            type="text"
            class="chat-input"
            placeholder="Speak to the Wizard..."
            value="${escapeHtml(appState.inputValue)}"
            ${appState.isLoading ? 'disabled' : ''}
            onkeyup="if (event.key === 'Enter') window.__wizardChat.send(this.value)"
          />
          <button
            class="send-button"
            ${appState.isLoading ? 'disabled' : ''}
            onclick="window.__wizardChat.send(document.querySelector('.chat-input').value)"
          >
            Send &#10038;
          </button>
        </div>

        <div class="action-panel">
          ${renderAfterSchoolChip()}
          ${renderCountdown()}
          ${renderGameHud()}
          ${isWritingActive() ? renderWritingDesk() : ''}
          <div class="action-title">&#10022; Today's Quests</div>
          ${renderQuestsPanel()}
          ${renderAssignments()}
          ${renderProjects()}
          ${renderReminders()}
        </div>
      </div>
    `;

    APP_HOST.innerHTML = html;

    // Auto-scroll to bottom
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Escape HTML to prevent injection
  // Escape HTML first, then render the tiny markdown subset agents emit
  // (**bold**, *italic*, line breaks) so Ethan never sees raw asterisks.
  function formatMessage(text) {
    return escapeHtml(text.trim())
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API for the UI to call
  window.__wizardChat = {
    send: (text) => {
      if (text && text.trim()) {
        appState.inputValue = '';
        sendMessage(text);
      }
    },
    dismissResume: () => {
      appState.resumeBanner = null;
      render();
    },
    openProject: (i) => {
      const items = appState.projects || [];
      const p = items[i];
      if (!p || appState.isLoading) return;
      appState.worldOpen = false; // if opened from My World, drop back into the chat
      // Opening a project is Ethan's move — send it as his message, and tell the
      // Wizard (via project_focus) to be his teammate on it right now.
      sendMessage(`Let’s work on my project: ${p.name}`, { projectFocus: p.name });
    },
    completeItem: (kind, i) => {
      const list = kind === 'reminder' ? appState.reminders : appState.assignments;
      const item = list && list[i];
      if (!item || (item.status || '').toLowerCase() === 'done') return;
      item.status = 'done'; // optimistic — server confirms below
      render();
      fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embed_id: EMBED_ID,
          content: '<<complete>>',
          visitor_id: 'ethan-' + appState.sessionId,
          host_origin: window.location.origin,
          complete: { kind, text: item.text },
        }),
      }).then((r) => r.ok ? r.json() : null).then((data) => {
        if (!data) return;
        if (Array.isArray(data.reminders)) appState.reminders = data.reminders;
        if (Array.isArray(data.assignments)) appState.assignments = data.assignments;
        render();
      }).catch(() => {});
    },
    openWorld: () => {
      appState.worldOpen = true;
      render();
    },
    closeWorld: () => {
      appState.worldOpen = false;
      render();
    },
    addSentence: (text) => {
      const t = (text || '').trim();
      if (!t || appState.isLoading) return;
      appState.essayInput = '';
      // Optimistically grow the Desk; the server response replaces it with the
      // authoritative essay so there's never a double-count.
      appState.essay = [...(appState.essay || []), t];
      sendMessage(t, { essayMode: true });
    },
    toggleTheme: () => {
      appState.theme = appState.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('wizard-theme', appState.theme);
      applyTheme();
      render();
    },
    setTheme: (theme) => {
      if (appState.theme !== theme) {
        appState.theme = theme;
        localStorage.setItem('wizard-theme', theme);
        applyTheme();
        render();
      }
    },
  };

  function applyTheme() {
    if (appState.theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }

  // Initialize and start polling
  async function init() {
    initSessionId();
    applyTheme();

    // Start the poll window from now; loadHistory or greeting will advance it
    appState.sinceTs = new Date().toISOString();
    render();

    // Pull the existing conversation back — refresh must not lose the thread.
    // loadHistory is scoped to today so it returns all of today's messages.
    // It also fetches today's day_state + essay + progress base.
    const hadHistory = await loadHistory();
    // Is he returning to a day already in progress? The server-loaded day ledger
    // is the signal (set by loadHistory even when the literal message thread
    // doesn't replay). Capture it BEFORE any greeting so a brand-new day — where
    // the greeting is what first creates the ledger — doesn't falsely flag it.
    const returningMidDay = !!currentSubject();
    // Show the "Welcome back, you're on X" marker IMMEDIATELY when he's returning
    // to an in-progress day — before the (slower) greeting call — so the instant
    // reassurance is there even on refreshes where the literal thread didn't
    // replay (R8 slice 6 fix). Pure UI from the loaded ledger; nothing resets.
    if (returningMidDay) {
      appState.resumeBanner = currentSubject();
      render();
    }
    if (!hadHistory) {
      // No thread to replay — ask the server for a personalized greeting. The
      // Wizard uses the day ledger + cross-day memory (yesterday's ledger) to
      // craft the opener (a contextual "welcome back" when mid-day). No
      // hardcoded fallback message.
      await requestWizardGreeting();
    }
    if (appState.doneCount == null) appState.doneCount = countDoneNow();
    appState.hudReady = true; // win-bursts only fire on completions from here on
    render();

    // Start polling for new messages
    setInterval(pollMessages, POLL_INTERVAL_MS);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
