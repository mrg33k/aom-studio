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
    spellbook: null, // [{word, status}] spelling + vocab he's mastering (Build R10)
    reading: null, // [{title, status, spot}] his book + where he is (Build R11)
    mathlab: null, // [{skill, status}] math skills he's mastering, Kenilworth focus (Build R90)
    stories: null, // [{title, text, date}] finished writing pieces, writing top priority (Build R92)
    storyOpen: null, // index of the story expanded in the My Stories card (client-only)
    progress: null, // { totalDone, todayDone, streak, activeDays } base from page load
    baseDone: 0, // all-time subjects done BEFORE today (today is tracked live)
    doneCount: null, // today's completed-subject count (live; null until baseline set)
    hudReady: false, // suppresses the win-burst during the initial load
    celebrateMsg: null, // transient win-burst banner text
    celebrateBig: false, // true = full-day-complete win (bigger burst)
    resumeBanner: null, // "welcome back, you're on X" after a refresh (never lose his place)
    worldOpen: false, // My World overview overlay (Build R8 slice 2) — additive, never the default surface
    projectActive: null, // name of the project currently open via the left bar (Build R13); null = School
    activeRoom: 'school', // which conversation room is open (Build R19): 'school' or 'project:<slug>'. Set in init from localStorage.
    roomCache: {}, // per-room thread snapshots { [roomKey]: { messages, sinceTs, loaded } } so switching rooms never loses his place
    navOpen: false, // mobile: left-bar drawer open (Build R21). Pure UI, defaults closed so the chat (his place) is visible on load.
    addingProject: false, // left-bar "add a project" inline input open (Build R13)
    addProjectValue: '', // text in the add-project input
    missions: null, // [{project, name, status}] parts of his projects (Build R13b)
    addingMission: false, // left-bar "add a mission" inline input open (Build R13b)
    addMissionValue: '', // text in the add-mission input
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
      const parsed = parseDayState(appState.dayState);
      const total = parsed ? parsed.quests.length : 0;
      // When this completion finishes the WHOLE day, give him a bigger payoff
      // than a single quest — the end-of-day win that builds toward his prize.
      if (total > 0 && live >= total) {
        triggerCelebration('Day complete! You finished everything today. ✨', true);
      } else {
        triggerCelebration('Quest complete!  +' + gained * XP_PER_SUBJECT + ' XP', false);
      }
    }
    appState.doneCount = live;
  }

  let celebrateTimer = null;
  function triggerCelebration(msg, big) {
    appState.celebrateMsg = msg;
    appState.celebrateBig = !!big;
    render();
    if (celebrateTimer) clearTimeout(celebrateTimer);
    // The full-day win lingers a beat longer so it feels like a real moment.
    celebrateTimer = setTimeout(() => {
      appState.celebrateMsg = null;
      appState.celebrateBig = false;
      render();
    }, big ? 4200 : 2600);
  }

  function renderGameHud() {
    const s = gameStats();
    // In a project room, keep the HUD to his GENERAL game progress (level + XP) —
    // the school-framed bits ("quests today" + "Road to winning Summer School")
    // belong to School, not his project space (Build R34, think-in-the-users-world).
    const inProject = appState.activeRoom && appState.activeRoom !== 'school';
    const streakHtml = s.streak > 1
      ? `<div class="hud-streak"><span class="hud-streak-icon">&#9650;</span>${s.streak}-day streak</div>`
      : '';
    const todayHtml = s.todayTotal
      ? `${s.todayDone}/${s.todayTotal} quests today`
      : 'Begin your climb';
    const xpLabel = inProject ? `${s.xp} XP` : `${s.xp} XP &middot; ${todayHtml}`;
    const prizeHtml = inProject ? '' : `
        <div class="hud-prize">
          <div class="hud-prize-label"><span class="hud-prize-orn">&#10022;</span> Road to winning Summer School</div>
          <div class="hud-prizebar"><div class="hud-prizebar-fill" style="width:${s.winPct}%"></div></div>
          <div class="hud-prize-sub">${s.winPct}% &middot; a reward waits at the finish</div>
        </div>`;
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
        <div class="hud-xp-label">${xpLabel}</div>
        ${prizeHtml}
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
    // In a project room the header brands the project (his own space with the
    // Wizard), not the school day — keeps the rooms visually separate so a
    // project never wears school's greeting (Build R20, completes R19 rooms).
    if (appState.activeRoom && appState.activeRoom !== 'school' && appState.projectActive) {
      return { title: escapeHtml(appState.projectActive), sub: 'Your project with the Wizard &mdash; let&rsquo;s build something' };
    }
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

  // --- Spellbook (Build R10) — spelling + vocab, Ethan's #1 academic gap -----
  // The day's spelling + vocabulary words live here and stack across the week so
  // he revisits and masters them. Learning words are tappable (mark mastered
  // once he's practiced); mastered words STAY visible with a check so he sees his
  // progress build up. Loaded on page load + every chat turn, so a refresh keeps
  // his place.
  function renderSpellbook() {
    const items = appState.spellbook || [];
    if (!items.length) return '';
    const mastered = items.filter((w) => (w.status || '').toLowerCase() === 'mastered').length;
    const words = items.map((w, i) => {
      const isMast = (w.status || '').toLowerCase() === 'mastered';
      // Learning word = two actions: tap the word to PRACTICE it with the Wizard
      // (active spelling, his #1 gap), tap the check when he's got it. Mastered
      // words stay lit as an achievement.
      return isMast
        ? `<span class="spell-word spell-word--mastered" title="Mastered">&#10004; ${escapeHtml(w.word)}</span>`
        : `<span class="spell-word spell-word--learning">
            <button type="button" class="spell-practice" title="Practice this word with the Wizard" onclick="window.__wizardChat.practiceSpell(${i})">${escapeHtml(w.word)}</button>
            <button type="button" class="spell-got" title="I've got it" onclick="window.__wizardChat.completeItem('spell', ${i})">&#10003;</button>
          </span>`;
    }).join('');
    return `<div class="spell-panel">
        <div class="action-title">&#128214; Spellbook <span class="spell-count">${mastered}/${items.length} mastered</span></div>
        <div class="spell-hint">Tap a word to practice it. Tap the check when you&rsquo;ve got it.</div>
        <div class="spell-words">${words}</div>
      </div>`;
  }

  // --- Practice spelling quick-start (Build R23) ----------------------------
  // Spelling is Ethan's #1 gap, and his Spellbook used to sit at the very bottom
  // of the rail. This compact chip — right under Today's Quests — lets him jump
  // straight into practicing a word with the Wizard without scrolling. Shows
  // only when he has unmastered words.
  function renderPracticeChip() {
    const words = (appState.spellbook || []).filter((w) => (w.status || '').toLowerCase() !== 'mastered');
    if (!words.length) return '';
    return `<button type="button" class="practice-chip" title="${words.length} word${words.length === 1 ? '' : 's'} to practice" ${appState.isLoading ? 'disabled' : ''} onclick="window.__wizardChat.practiceSpellStart()">
        <span class="practice-chip-icon">&#9998;</span>
        <span class="practice-chip-text">Practice spelling</span>
      </button>`;
  }

  // --- Math challenge quick-start (Build R25) --------------------------------
  // Math is Ethan's strength and his Kenilworth focus ("stay ahead"). One tap
  // pulls a 7th-grade-prep problem from the Wizard. Secondary (outline) style so
  // the spelling chip (his gap) stays the primary action. Shows when today's
  // Math isn't done yet.
  function renderMathChip() {
    const parsed = parseDayState(appState.dayState);
    if (!parsed) return '';
    const math = parsed.quests.find((q) => /math/i.test(q.name));
    if (!math || math.status === 'done') return '';
    return `<button type="button" class="practice-chip practice-chip--math" title="A 7th-grade-prep problem to stay sharp for Kenilworth" ${appState.isLoading ? 'disabled' : ''} onclick="window.__wizardChat.mathChallenge()">
        <span class="practice-chip-icon">&#128290;</span>
        <span class="practice-chip-text">Math challenge</span>
      </button>`;
  }

  // Quick-practice actions grouped into one tidy row (Build R27) — spelling
  // (his gap, primary/filled) + math (his strength, secondary/outline) sit
  // side-by-side under the quests instead of two stacked full-width blocks, so
  // the board reads calmer for a kid who distracts easily. Each still shows only
  // when relevant; the row hides entirely when neither does.
  function renderPracticeRow() {
    const spell = renderPracticeChip();
    const math = renderMathChip();
    if (!spell && !math) return '';
    return `<div class="practice-row">${spell}${math}</div>`;
  }

  // --- Bookshelf (Build R11) — his reading, carried across the week ----------
  // Reading is Ethan's other core gap. The book he's on + where he is shows here
  // and carries day to day so he picks the thread back up; finished books stack
  // on his shelf as a growing achievement. Compact: current book + a shelf count.
  function renderBookshelf() {
    const items = appState.reading || [];
    if (!items.length) return '';
    const reading = items.filter((b) => (b.status || '').toLowerCase() !== 'finished');
    const finished = items.filter((b) => (b.status || '').toLowerCase() === 'finished');
    const current = reading.length ? reading[reading.length - 1] : null;
    const currentHtml = current
      ? `<div class="book-current">
          <span class="book-title">${escapeHtml(current.title)}</span>
          ${current.spot ? `<span class="book-spot">${escapeHtml(current.spot)}</span>` : ''}
          <button type="button" class="book-read-btn" ${appState.isLoading ? 'disabled' : ''} onclick="window.__wizardChat.readWithWizard()">&#128214; Pick up my book</button>
        </div>`
      : '';
    const shelfHtml = finished.length
      ? `<div class="book-shelf">&#10004; ${finished.length} on your shelf: <span class="book-shelf-titles">${finished.map((b) => escapeHtml(b.title)).join(', ')}</span></div>`
      : '';
    if (!currentHtml && !shelfHtml) return '';
    return `<div class="book-panel">
        <div class="action-title">&#128218; Bookshelf</div>
        ${currentHtml}
        ${shelfHtml}
      </div>`;
  }

  // --- Math Lab (Build R90) — math is Ethan's #1 Kenilworth priority, but it was
  // the only academic subject with no surface that stacked his wins across the
  // week (spelling has the Spellbook, reading the Bookshelf; math just had a
  // chip that vanished). This shows the math SKILLS he's building — learning ones
  // and the mastered ones lit with a check — so the priority is visible and he
  // watches his mastery grow toward 7th grade. Read-only here (active practice is
  // the "Math challenge" chip); loaded on page load + every turn, so a refresh
  // keeps his place.
  function renderMathLab() {
    const items = appState.mathlab || [];
    if (!items.length) return '';
    const mastered = items.filter((s) => (s.status || '').toLowerCase() === 'mastered').length;
    const skills = items.map((s, i) => {
      const isMast = (s.status || '').toLowerCase() === 'mastered';
      // Mastered skills stay lit as an achievement. Learning skills are tappable:
      // tap one to drill THAT exact skill with the Wizard (Build R91) — more
      // targeted than the random Math challenge chip.
      return isMast
        ? `<span class="math-skill math-skill--mastered" title="Mastered">&#10004; ${escapeHtml(s.skill)}</span>`
        : `<button type="button" class="math-skill math-skill--learning" title="Practice this with the Wizard" ${appState.isLoading ? 'disabled' : ''} onclick="window.__wizardChat.drillMath(${i})">${escapeHtml(s.skill)}</button>`;
    }).join('');
    const hint = items.some((s) => (s.status || '').toLowerCase() !== 'mastered')
      ? `<div class="math-hint">Tap a skill to practice it with the Wizard.</div>` : '';
    return `<div class="math-panel">
        <div class="action-title">&#128290; Math Lab <span class="math-count">${mastered}/${items.length} mastered</span></div>
        ${hint}
        <div class="math-skills">${skills}</div>
      </div>`;
  }

  // --- My Stories (Build R92) — writing is the council's TOP priority, but his
  // Writing Desk essay reset every day, so finished pieces vanished. This shelf
  // stacks the stories he's finished as a growing, re-readable collection (like
  // the Bookshelf stacks finished books). Tap a title to re-read it inline.
  // Loaded on page load + every turn, so a refresh keeps his place.
  function renderStories() {
    const items = appState.stories || [];
    if (!items.length) return '';
    const open = appState.storyOpen;
    const list = items.map((s, i) => {
      const isOpen = open === i;
      const body = isOpen && s.text ? `<div class="story-text">${escapeHtml(s.text)}</div>` : '';
      return `<div class="story-item">
          <button type="button" class="story-title" aria-expanded="${isOpen}" onclick="window.__wizardChat.toggleStory(${i})">
            <span class="story-caret">${isOpen ? '&#9662;' : '&#9656;'}</span> ${escapeHtml(s.title)}
          </button>
          ${body}
        </div>`;
    }).join('');
    return `<div class="story-panel">
        <div class="action-title">&#128221; My Stories <span class="story-count">${items.length} written</span></div>
        <div class="story-hint">Tap a title to read it again.</div>
        <div class="story-list">${list}</div>
      </div>`;
  }

  // --- Project rail (Build R19) — the right panel inside a project room ------
  // In a project room the school quest board is hidden (it's school's). The rail
  // instead focuses on the open project: its parts (missions) to work on,
  // mirroring the left-bar nesting. Tap a part to jump to it with the Wizard, or
  // its circle to mark it done. Keeps project and school visually separate.
  function renderProjectRail() {
    const name = appState.projectActive;
    if (!name) return '';
    const norm = (s) => (s || '').toLowerCase().trim();
    const pn = norm(name);
    const mine = (appState.missions || []).filter((m) => {
      const mp = norm(m.project);
      if (!mp) return false;
      if (mp === pn) return true;
      const [s, l] = mp.length <= pn.length ? [mp, pn] : [pn, mp];
      return s.length >= 4 && l.includes(s);
    });
    const doneN = mine.filter((m) => norm(m.status) === 'done').length;
    const rows = mine.map((m) => {
      const mdone = norm(m.status) === 'done';
      const safeName = escapeHtml(m.name).replace(/'/g, "\\'");
      const safeProj = escapeHtml(name).replace(/'/g, "\\'");
      return `<div class="nav-mission ${mdone ? 'is-done' : ''}">
          <button type="button" class="nav-mission-check" title="${mdone ? 'Done' : 'Mark done'}" ${mdone ? 'disabled' : `onclick="window.__wizardChat.completeMission('${safeProj}','${safeName}')"`}>${mdone ? '&#10003;' : '&#9675;'}</button>
          <button type="button" class="nav-mission-label" onclick="window.__wizardChat.openMission('${safeProj}','${safeName}')">${escapeHtml(m.name)}</button>
        </div>`;
    }).join('');
    const body = mine.length
      ? `<div class="nav-mission-list proj-rail-list">${rows}</div>`
      : `<div class="proj-rail-empty">This is your project space. Tell the Wizard what you want to build next, or add a part in the left bar.</div>`;
    return `<div class="proj-rail">
        <div class="action-title">&#9671; ${escapeHtml(name)}${mine.length ? ` <span class="spell-count">${doneN}/${mine.length} parts</span>` : ''}</div>
        ${body}
      </div>`;
  }

  // --- World hint (Build R12) — board declutter -----------------------------
  // His own fun projects + life reminders moved off the school board into My
  // World (his Corner). A subtle tap-line points there so they're never lost —
  // only shown when he actually has some.
  function renderWorldHint() {
    // Projects now live in the left bar (Build R13); only point to reminders,
    // which still live in My World.
    const reminders = (appState.reminders || []).filter((r) => (r.status || '').toLowerCase() !== 'done').length;
    if (!reminders) return '';
    return `<button type="button" class="world-hint" onclick="window.__wizardChat.openWorld()">
        <span class="world-hint-icon">&#10022;</span>
        <span class="world-hint-text">Your ${reminders} reminder${reminders === 1 ? '' : 's'} ${reminders === 1 ? 'is' : 'are'} in My World</span>
        <span class="world-hint-go">&#10148;</span>
      </button>`;
  }

  // --- Side nav (Build R13) — Corner-style left bar -------------------------
  // Patrik: "just like in corner, instead of a modal his projects + ability to
  // add projects and missions/select them should appear in the left bar." His
  // Corner home lives in the left column: School (the Wizard class) + his own
  // Projects, each select-to-open, plus add a project inline. Replaces the My
  // World modal as the projects home. Additive to the existing left column —
  // no session/ledger change, so a refresh still resumes his place.
  function renderSideNav() {
    const projects = appState.projects || [];
    const subj = currentSubject();
    const onProject = appState.projectActive || null;
    const schoolActive = !onProject;
    const allMissions = appState.missions || [];
    const norm = (s) => (s || '').toLowerCase().trim();
    const projNames = projects.map((p) => norm(p.name));
    // Assign each mission to exactly ONE project: an exact name match if one
    // exists, otherwise a length-guarded containment match (so a looser project
    // phrase from the Wizard still nests, but missions never duplicate across
    // two similar projects).
    const missionProjectIdx = (m) => {
      const mp = norm(m.project);
      if (!mp) return -1;
      const exact = projNames.indexOf(mp);
      if (exact !== -1) return exact;
      let best = -1, bestLen = 0;
      projNames.forEach((pn, idx) => {
        if (!pn) return;
        const [s, l] = mp.length <= pn.length ? [mp, pn] : [pn, mp];
        if (s.length >= 4 && l.includes(s) && s.length > bestLen) { best = idx; bestLen = s.length; }
      });
      return best;
    };
    const missionsByProject = projects.map(() => []);
    allMissions.forEach((m) => { const idx = missionProjectIdx(m); if (idx !== -1) missionsByProject[idx].push(m); });
    const projectItems = projects.length
      ? projects.map((p, i) => {
          const done = (p.status || '').toLowerCase() === 'done';
          const active = onProject && norm(onProject) === norm(p.name);
          // Missions belonging to this project (Build R13b), nested under it.
          const mine = missionsByProject[i];
          const missionRows = mine.map((m) => {
            const mdone = (m.status || '').toLowerCase() === 'done';
            const safeName = escapeHtml(m.name).replace(/'/g, "\\'");
            const safeProj = escapeHtml(p.name).replace(/'/g, "\\'");
            return `<div class="nav-mission ${mdone ? 'is-done' : ''}">
                <button type="button" class="nav-mission-check" title="${mdone ? 'Done' : 'Mark done'}" ${mdone ? 'disabled' : `onclick="window.__wizardChat.completeMission('${safeProj}','${safeName}')"`}>${mdone ? '&#10003;' : '&#9675;'}</button>
                <button type="button" class="nav-mission-label" onclick="window.__wizardChat.openMission('${safeProj}','${safeName}')">${escapeHtml(m.name)}</button>
              </div>`;
          }).join('');
          // Add-a-mission shows only under the currently open project.
          const addMission = active
            ? (appState.addingMission
                ? `<form class="nav-add-form nav-add-form--mission" onsubmit="window.__wizardChat.submitAddMission(document.getElementById('nav-mission-input').value); return false;">
                    <input id="nav-mission-input" class="nav-add-input" type="text" placeholder="Add a part to work on" value="${escapeHtml(appState.addMissionValue || '')}" />
                    <button type="submit" class="nav-add-go" title="Add">&#10148;</button>
                  </form>`
                : `<button type="button" class="nav-add-mission-btn" onclick="window.__wizardChat.startAddMission()">+ Add a mission</button>`)
            : '';
          return `<div class="nav-project-group">
              <button type="button" class="nav-item nav-item--project ${active ? 'is-active' : ''}" onclick="window.__wizardChat.openProject(${i})">
                <span class="nav-item-icon">${done ? '&#9733;' : '&#9671;'}</span>
                <span class="nav-item-label">${escapeHtml(p.name)}</span>
              </button>
              ${missionRows ? `<div class="nav-mission-list">${missionRows}</div>` : ''}
              ${addMission}
            </div>`;
        }).join('')
      : `<div class="nav-empty">Nothing yet. Add something you want to build for fun.</div>`;
    const addBlock = appState.addingProject
      ? `<form class="nav-add-form" onsubmit="window.__wizardChat.submitAddProject(document.getElementById('nav-add-input').value); return false;">
          <input id="nav-add-input" class="nav-add-input" type="text" placeholder="What do you want to build?" value="${escapeHtml(appState.addProjectValue || '')}" />
          <button type="submit" class="nav-add-go" title="Add">&#10148;</button>
        </form>`
      : `<button type="button" class="nav-add-btn" onclick="window.__wizardChat.startAddProject()">+ Add a project</button>`;
    // Reminders (Build R21d): his EA-held to-dos now live in the left bar too,
    // so everything is in one Corner home and the My World modal can retire.
    // Indexed back into the full list so tap-to-complete hits the right item.
    const allReminders = appState.reminders || [];
    const openReminders = allReminders.filter((r) => (r.status || '').toLowerCase() !== 'done');
    const reminderBlock = openReminders.length
      ? `<div class="nav-section-label">Reminders</div>
         <div class="nav-reminders">${openReminders.map((r) => {
            const idx = allReminders.indexOf(r);
            return `<div class="nav-remind">
              <button type="button" class="nav-remind-check" title="Mark done" onclick="window.__wizardChat.completeItem('reminder', ${idx})">&#9675;</button>
              <span class="nav-remind-label">${escapeHtml(r.text)}</span>
            </div>`;
          }).join('')}</div>`
      : '';
    return `<nav class="side-nav ${appState.navOpen ? 'is-open' : ''}" aria-label="Ethan's Corner">
        <div class="nav-eyebrow">&#10022; Ethan&rsquo;s Corner</div>
        <div class="nav-section-label">School</div>
        <button type="button" class="nav-item nav-item--school ${schoolActive ? 'is-active' : ''}" onclick="window.__wizardChat.selectSchool()">
          <span class="nav-item-icon">&#9876;</span>
          <span class="nav-item-label">Summer School${subj ? ` <span class="nav-item-sub">on ${escapeHtml(subj)}</span>` : ''}</span>
        </button>
        ${schoolActive ? `<button type="button" class="nav-progress-btn" onclick="window.__wizardChat.progressRecap()"><span class="nav-progress-icon">&#10022;</span> How am I doing?</button>` : ''}
        <div class="nav-section-label">My Projects</div>
        <div class="nav-list">${projectItems}</div>
        ${addBlock}
        ${reminderBlock}
      </nav>`;
  }

  // --- My World overview (Build R8 slice 2) — RETIRED R21d -------------------
  // Superseded by the left bar: School + Projects + missions (R13/R13b) and now
  // Reminders (R21d) all live in the persistent Corner left bar / mobile drawer,
  // so this modal is no longer rendered or reachable (no My World button). Kept
  // defined for easy rollback; safe to delete once the left bar has proven out.
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
    // Blank-page helper (Build R30): Ethan's documented #1 writing problem is the
    // blank-page freeze. When the essay is still empty, offer a few sentence
    // starters — tap one and it drops into the box so he's finishing a sentence,
    // not staring at nothing. Only on the empty state; momentum carries after.
    const starterHtml = sentences.length
      ? ''
      : `<div class="essay-starters">
          <span class="essay-starters-label">Stuck on the first word? Tap one to start:</span>
          <div class="essay-starter-row">
            ${['I think', 'One time', 'My favorite', 'It all started when'].map((s) =>
              `<button type="button" class="essay-starter" onclick="window.__wizardChat.useStarter('${s} ')">${s}&hellip;</button>`).join('')}
          </div>
        </div>`;
    return `
      <div class="writing-desk">
        <div class="action-title">&#9998; My Writing Desk</div>
        ${bodyHtml}
        ${starterHtml}
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
        room: appState.activeRoom, // only this room's thread
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
      if (Array.isArray(data.spellbook)) appState.spellbook = data.spellbook;
      if (Array.isArray(data.reading)) appState.reading = data.reading;
      if (Array.isArray(data.mathlab)) appState.mathlab = data.mathlab;
      if (Array.isArray(data.stories)) appState.stories = data.stories;
      if (Array.isArray(data.missions)) appState.missions = data.missions;
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
  async function requestWizardGreeting(isRetry) {
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
          room: 'school', // the opening greeting is always the School day
          // After 2:10pm the opening greeting becomes the after-school check-in.
          after_school: isAfterSchoolNow(),
        }),
      });
      if (!response.ok) throw new Error('greeting http ' + response.status);
      const data = await response.json();
      if (data.day_state) appState.dayState = data.day_state;
      if (Array.isArray(data.essay)) appState.essay = data.essay;
      if (Array.isArray(data.assignments)) appState.assignments = data.assignments;
      if (Array.isArray(data.projects)) appState.projects = data.projects;
      if (Array.isArray(data.reminders)) appState.reminders = data.reminders;
      if (Array.isArray(data.spellbook)) appState.spellbook = data.spellbook;
      if (Array.isArray(data.reading)) appState.reading = data.reading;
      if (Array.isArray(data.mathlab)) appState.mathlab = data.mathlab;
      if (Array.isArray(data.stories)) appState.stories = data.stories;
      if (Array.isArray(data.missions)) appState.missions = data.missions;
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
      } else {
        throw new Error('greeting empty');
      }
    } catch (e) {
      console.warn('[wizard] Session greeting request failed:', e);
      // One quick retry before giving up — a transient hiccup shouldn't leave
      // Ethan on a blank screen.
      if (!isRetry) {
        appState.isLoading = false;
        return requestWizardGreeting(true);
      }
      // Final safety net: never a dead-end blank chat. If nothing landed, show a
      // friendly fallback so he can say hello and the normal flow takes over.
      const hasWizardMsg = appState.messages.some((m) => m.role === 'assistant' && (m.text || '').trim());
      if (!hasWizardMsg) {
        appState.messages.push({
          role: 'assistant',
          text: "Hi Ethan! Give me one second to get set up. Say hello and we'll jump into today.",
          timestamp: Date.now(),
        });
      }
    } finally {
      appState.isLoading = false;
    }
    render();
  }

  // ----- Conversation rooms (Build R19) -----
  // Ethan's chat is split into rooms — a School room (lessons) and one room per
  // project — so project talk never blends into school. Each room is its own
  // thread; we cache threads client-side and tag every API call with the active
  // room so switching (and refresh) always resumes the exact place.
  function slugifyRoom(name) {
    return String(name || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function projectRoomKey(name) { return 'project:' + slugifyRoom(name); }
  // Map a project room key back to the human project name (for the left-bar
  // highlight + resume banner). Falls back to the raw slug if not yet in the list.
  function roomProjectName(key) {
    if (!key || !key.startsWith('project:')) return null;
    const slug = key.slice('project:'.length);
    const match = (appState.projects || []).find((p) => slugifyRoom(p.name) === slug);
    return match ? match.name : slug.replace(/-/g, ' ');
  }

  // Switch the visible thread to another room. Saves the current room's thread
  // into the cache, restores (or freshly loads) the target room's thread, and
  // persists the choice so a refresh comes back to the same room. Returns true
  // if the target room came back empty (caller may seed an opening message).
  async function switchRoom(newKey, opts) {
    opts = opts || {};
    if (newKey === appState.activeRoom) return false;
    // Snapshot the room we're leaving so coming back is instant + intact.
    appState.roomCache[appState.activeRoom] = {
      messages: appState.messages,
      sinceTs: appState.sinceTs,
      loaded: true,
    };
    appState.activeRoom = newKey;
    try { localStorage.setItem('wizard-active-room', newKey); } catch (_) {}
    appState.projectActive = newKey === 'school' ? null : roomProjectName(newKey);

    const cached = appState.roomCache[newKey];
    if (cached && cached.loaded) {
      appState.messages = cached.messages;
      appState.sinceTs = cached.sinceTs;
      appState.resumeBanner = opts.label || null;
      render();
      return appState.messages.length === 0;
    }
    // First visit to this room this session — load just its thread.
    appState.messages = [];
    appState.sinceTs = new Date().toISOString();
    render();
    await loadHistory();
    appState.roomCache[newKey] = {
      messages: appState.messages,
      sinceTs: appState.sinceTs,
      loaded: true,
    };
    if (appState.messages.length > 0) appState.resumeBanner = opts.label || null;
    render();
    return appState.messages.length === 0;
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
        room: appState.activeRoom, // keep this turn in the open room's thread
      };
      if (opts.essayMode) payload.essay_mode = true;
      if (isAfterSchoolNow()) payload.after_school = true;
      if (opts.projectFocus) payload.project_focus = opts.projectFocus;
      if (opts.practiceWord) payload.practice_word = opts.practiceWord;
      if (opts.readingFocus) payload.reading_focus = opts.readingFocus;
      if (opts.mathFocus) payload.math_focus = true;
      if (opts.mathSkill) payload.math_skill = opts.mathSkill;
      if (opts.progressSummary) payload.progress_summary = opts.progressSummary;
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
      if (Array.isArray(data.spellbook)) appState.spellbook = data.spellbook;
      if (Array.isArray(data.reading)) appState.reading = data.reading;
      if (Array.isArray(data.mathlab)) appState.mathlab = data.mathlab;
      if (Array.isArray(data.stories)) appState.stories = data.stories;
      if (Array.isArray(data.missions)) appState.missions = data.missions;
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
        room: appState.activeRoom, // only poll the open room's thread
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

    // Preserve his scroll position across re-renders (the 1.5s poll re-renders).
    // Only follow new messages to the bottom if he's already near it — if he
    // scrolled up to re-read his thread, keep him where he was instead of yanking
    // him down every poll (matters now that the real thread replays).
    const prevContainer = document.querySelector('.messages-container');
    let stickToBottom = true;
    let prevScrollTop = 0;
    if (prevContainer) {
      prevScrollTop = prevContainer.scrollTop;
      const distanceFromBottom = prevContainer.scrollHeight - prevContainer.scrollTop - prevContainer.clientHeight;
      stickToBottom = distanceFromBottom < 80;
    }

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
      ? `<div class="celebrate-burst${appState.celebrateBig ? ' celebrate-burst--big' : ''}">${escapeHtml(appState.celebrateMsg)}</div>`
      : '';

    const html = `
      <div class="wizard-chat-container">
        ${celebrateHtml}
        <div class="chat-header">
          <button class="nav-toggle" title="${appState.projectActive ? escapeHtml(appState.projectActive) : 'Summer School'} — open menu" aria-label="Open menu" onclick="window.__wizardChat.toggleNav()">
            <span class="nav-toggle-bars">&#9776;</span>
            <span class="nav-toggle-label">${appState.projectActive ? escapeHtml(appState.projectActive) : 'School'}</span>
          </button>
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
        </div>

        <div class="nav-backdrop ${appState.navOpen ? 'is-open' : ''}" onclick="window.__wizardChat.closeNav()"></div>
        <div class="wizard-rail">
          ${renderSideNav()}
          <div class="wizard-figure-wrap">
            <img class="wizard-figure" src="/summerschool/wizard.png?v=20260611a" alt="The Wizard" />
            <div class="wizard-nameplate">The Wizard</div>
          </div>
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
          ${appState.activeRoom === 'school' ? `
            ${renderAfterSchoolChip()}
            ${renderCountdown()}
            ${renderGameHud()}
            <div class="action-title">&#10022; Today's Quests</div>
            ${renderQuestsPanel()}
            ${isWritingActive() ? renderWritingDesk() : ''}
            ${renderPracticeRow()}
            ${renderStories()}
            ${renderBookshelf()}
            ${renderMathLab()}
            ${renderSpellbook()}
            ${renderAssignments()}
          ` : `
            ${renderGameHud()}
            ${renderProjectRail()}
          `}
        </div>
      </div>
    `;

    APP_HOST.innerHTML = html;

    // Follow new messages to the bottom only if he was already there; otherwise
    // restore where he had scrolled to so re-reading isn't interrupted.
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = stickToBottom
        ? messagesContainer.scrollHeight
        : prevScrollTop;
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
    // Mobile drawer (Build R21): open/close the left-bar menu. Pure UI.
    toggleNav: () => { appState.navOpen = !appState.navOpen; render(); },
    closeNav: () => { if (appState.navOpen) { appState.navOpen = false; render(); } },
    openProject: async (i) => {
      const items = appState.projects || [];
      const p = items[i];
      if (!p || appState.isLoading) return;
      appState.navOpen = false; // close the mobile drawer so he lands in the chat
      appState.worldOpen = false; // if opened from My World, drop back into the chat
      // Open THIS project's own room (its own thread) — never blends with school.
      // First visit (empty room) → seed the opening message so the Wizard greets
      // him on the project; a return visit just resumes the thread where it was.
      const empty = await switchRoom(projectRoomKey(p.name), { label: p.name });
      if (empty) sendMessage(`Let’s work on my project: ${p.name}`, { projectFocus: p.name });
    },
    // Left bar: tap School to come back to the Wizard class from a project. With
    // separate rooms this just restores his school thread — no extra "back to
    // school" turn, he picks up exactly where his lesson left off.
    selectSchool: async () => {
      if (appState.isLoading) return;
      appState.navOpen = false; // close the mobile drawer
      appState.worldOpen = false;
      await switchRoom('school', { label: 'Summer School' });
    },
    // Left bar: add a project inline (Corner-style), no modal.
    startAddProject: () => { appState.addingProject = true; appState.addProjectValue = ''; render();
      const el = document.getElementById('nav-add-input'); if (el) el.focus(); },
    submitAddProject: async (val) => {
      const name = (val || '').trim();
      appState.addingProject = false; appState.addProjectValue = '';
      appState.navOpen = false; // close the mobile drawer
      render();
      if (!name) return;
      // A new project gets its own room from the very first message, so its
      // conversation never starts inside school.
      await switchRoom(projectRoomKey(name), { label: name });
      sendMessage(`I want to start a new project: ${name}`, { projectFocus: name });
    },
    // Left bar: open a mission (a part of the open project) to work on it.
    openMission: async (project, name) => {
      if (appState.isLoading) return;
      appState.navOpen = false; // close the mobile drawer
      appState.worldOpen = false;
      // Missions live inside their project's room — open the room, then focus
      // this part so the Wizard zooms straight to it.
      await switchRoom(projectRoomKey(project), { label: project });
      sendMessage(`Let's work on the "${name}" part of my project ${project}.`, { projectFocus: project });
    },
    // Left bar: tap a mission's circle to mark that part done.
    completeMission: (project, name) => {
      const list = appState.missions || [];
      const m = list.find((x) => (x.project || '').toLowerCase() === project.toLowerCase() && (x.name || '').toLowerCase() === name.toLowerCase());
      if (!m || (m.status || '').toLowerCase() === 'done') return;
      m.status = 'done'; // optimistic
      render();
      fetch('/api/embed/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embed_id: EMBED_ID, content: '<<complete>>', visitor_id: 'ethan-' + appState.sessionId, host_origin: window.location.origin, complete: { kind: 'mission', text: name, project } }),
      }).then((r) => r.ok ? r.json() : null).then((data) => {
        if (data && Array.isArray(data.missions)) appState.missions = data.missions;
        render();
      }).catch(() => {});
    },
    startAddMission: () => { appState.addingMission = true; appState.addMissionValue = ''; render();
      const el = document.getElementById('nav-mission-input'); if (el) el.focus(); },
    submitAddMission: (val) => {
      const name = (val || '').trim();
      const project = appState.projectActive;
      appState.addingMission = false; appState.addMissionValue = '';
      appState.navOpen = false; // close the mobile drawer
      render();
      if (name && project) sendMessage(`Add a mission to my project ${project}: ${name}`, { projectFocus: project });
    },
    // Spellbook: tap a word to actually PRACTICE it — the Wizard runs a quick
    // spelling check in the chat (active recall on his #1 gap). Stays in School.
    practiceSpell: (i) => {
      const list = appState.spellbook || [];
      const w = list[i];
      if (!w || appState.isLoading) return;
      sendMessage(`Can you quiz me on spelling the word "${w.word}"? Say it, use it in a sentence, ask me to spell it out loud, then check my answer and give me a quick tip if I miss it.`, { practiceWord: w.word });
    },
    // Bookshelf: tap to read with the Wizard — a reading check-in on his current
    // book (what's happened / what's next), his other core gap. Stays in School.
    readWithWizard: () => {
      if (appState.isLoading) return;
      const reading = (appState.reading || []).filter((b) => (b.status || '').toLowerCase() !== 'finished');
      const current = reading.length ? reading[reading.length - 1] : null;
      if (!current) return;
      const spot = current.spot ? ` I'm at: ${current.spot}.` : '';
      sendMessage(`Let's pick up my book "${current.title}".${spot} Can we read together — ask me what's happened so far or what I think happens next, then help me keep going?`, { readingFocus: current.title });
    },
    // "How am I doing?" — a warm, accurate progress recap from the Wizard, tied
    // to Kenilworth. Builds his REAL numbers client-side and hands them to the
    // Wizard so the recap is true, not invented.
    progressRecap: () => {
      if (appState.isLoading) return;
      appState.navOpen = false; // close the mobile drawer
      const g = gameStats();
      const totalDone = (appState.baseDone || 0) + (appState.doneCount || 0);
      const mastered = (appState.spellbook || []).filter((w) => (w.status || '').toLowerCase() === 'mastered').length;
      const books = (appState.reading || []).filter((b) => (b.status || '').toLowerCase() === 'finished').length;
      const mathMastered = (appState.mathlab || []).filter((s) => (s.status || '').toLowerCase() === 'mastered').length;
      const days = daysUntilSchool();
      const parts = [];
      if (g.todayTotal) parts.push(`${g.todayDone} of ${g.todayTotal} subjects done today`);
      if (totalDone) parts.push(`${totalDone} subjects completed in total`);
      if (g.streak > 1) parts.push(`a ${g.streak}-day streak`);
      if (mastered) parts.push(`${mastered} spelling word${mastered === 1 ? '' : 's'} mastered`);
      if (books) parts.push(`${books} book${books === 1 ? '' : 's'} finished`);
      if (mathMastered) parts.push(`${mathMastered} math skill${mathMastered === 1 ? '' : 's'} mastered`);
      if (days != null && days >= 0) parts.push(`${days} days until Kenilworth`);
      const summary = parts.join(', ') || 'just getting started today';
      sendMessage(`How am I doing so far?`, { progressSummary: summary });
    },
    // Math challenge: pull a 7th-grade-prep problem from the Wizard (his strength
    // + Kenilworth focus). Stays in School and leads the turn.
    mathChallenge: () => {
      if (appState.isLoading) return;
      sendMessage(`Can you give me a math challenge to solve? Make it a good one for 7th grade.`, { mathFocus: true });
    },
    // Math Lab drill (Build R91): tap a specific "learning" skill to practice THAT
    // exact skill with the Wizard (targeted, vs the random Math challenge chip).
    drillMath: (i) => {
      const list = appState.mathlab || [];
      const s = list[i];
      if (!s || appState.isLoading) return;
      sendMessage(`Can you give me a problem to practice "${s.skill}"? Make it a good one for 7th grade, then check my answer.`, { mathFocus: true, mathSkill: s.skill });
    },
    // My Stories (Build R92): expand/collapse a finished piece to re-read it
    // inline. Pure client-side toggle, no server round-trip.
    toggleStory: (i) => {
      appState.storyOpen = appState.storyOpen === i ? null : i;
      render();
    },
    // Quick-start chip: practice the first word he hasn't mastered yet.
    practiceSpellStart: () => {
      if (appState.isLoading) return;
      const list = appState.spellbook || [];
      const idx = list.findIndex((w) => (w.status || '').toLowerCase() !== 'mastered');
      if (idx === -1) return;
      window.__wizardChat.practiceSpell(idx);
    },
    completeItem: (kind, i) => {
      // spellbook items key on .word and finish as 'mastered'; the rest key on
      // .text and finish as 'done'.
      const list = kind === 'reminder' ? appState.reminders
        : kind === 'spell' ? appState.spellbook
        : appState.assignments;
      const item = list && list[i];
      if (!item) return;
      const doneStatus = kind === 'spell' ? 'mastered' : 'done';
      const label = kind === 'spell' ? item.word : item.text;
      if ((item.status || '').toLowerCase() === doneStatus) return;
      item.status = doneStatus; // optimistic — server confirms below
      render();
      fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embed_id: EMBED_ID,
          content: '<<complete>>',
          visitor_id: 'ethan-' + appState.sessionId,
          host_origin: window.location.origin,
          complete: { kind, text: label },
        }),
      }).then((r) => r.ok ? r.json() : null).then((data) => {
        if (!data) return;
        if (Array.isArray(data.reminders)) appState.reminders = data.reminders;
        if (Array.isArray(data.assignments)) appState.assignments = data.assignments;
        if (Array.isArray(data.spellbook)) appState.spellbook = data.spellbook;
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
    // Blank-page helper (Build R30): drop a sentence starter into the box and put
    // the cursor at the end, so he just finishes the thought instead of freezing.
    useStarter: (text) => {
      if (appState.isLoading) return;
      // Set the textarea directly (not via render): render() reads the live
      // textarea value back into essayInput at its top, so a render here would
      // clobber the starter with the still-empty box. Writing the DOM value keeps
      // it, and essayInput stays in sync for the next real render.
      appState.essayInput = text;
      const el = document.querySelector('.essay-input');
      if (el) { el.value = text; el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
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

    // Restore which room he was last in — a refresh must come back to the SAME
    // room (School or a specific project), never always-School (never lose his
    // place). Default is School for a brand-new session.
    try {
      const savedRoom = localStorage.getItem('wizard-active-room');
      if (savedRoom) appState.activeRoom = savedRoom;
    } catch (_) {}

    // Start the poll window from now; loadHistory or greeting will advance it
    appState.sinceTs = new Date().toISOString();
    render();

    // Pull the active room's thread back — refresh must not lose it. loadHistory
    // is scoped to today + the active room; it also fetches the GLOBAL day_state
    // + essay + projects + missions + progress base (panels are shared).
    const hadHistory = await loadHistory();
    appState.roomCache[appState.activeRoom] = {
      messages: appState.messages, sinceTs: appState.sinceTs, loaded: true,
    };

    if (appState.activeRoom === 'school') {
      // Is he returning to a day already in progress? The server-loaded day
      // ledger is the signal (set even when the literal thread doesn't replay).
      const returningMidDay = !!currentSubject();
      if (returningMidDay) {
        appState.resumeBanner = currentSubject();
        render();
      }
      if (!hadHistory) {
        // No thread to replay — ask the server for a personalized greeting (uses
        // the day ledger + yesterday's ledger). No hardcoded fallback message.
        await requestWizardGreeting();
      }
    } else if (hadHistory) {
      // Back in a project room — resume its thread and highlight it in the bar.
      appState.projectActive = roomProjectName(appState.activeRoom);
      appState.resumeBanner = appState.projectActive;
      render();
    } else {
      // Project room came back empty (e.g. cleared data) — never leave him on a
      // blank screen. Fall back to School and bootstrap the day there.
      appState.activeRoom = 'school';
      appState.projectActive = null;
      try { localStorage.setItem('wizard-active-room', 'school'); } catch (_) {}
      const reload = await loadHistory();
      appState.roomCache['school'] = {
        messages: appState.messages, sinceTs: appState.sinceTs, loaded: true,
      };
      if (currentSubject()) appState.resumeBanner = currentSubject();
      if (!reload) await requestWizardGreeting();
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
