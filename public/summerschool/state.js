/* Summer School — persistence layer
 * Everything Ethan does saves. Day 5 remembers Day 1.
 * localStorage for now; schema is forward-compat so server sync can drop in.
 */

window.SS = window.SS || {};

(function () {
  'use strict';

  const KEY = 'ss-state-v1';

  const DEFAULT = {
    name: 'Ethan',
    streak: 0,
    lastDayCompleted: null,        // ISO date string
    goldStars: 0,
    days: {},                      // { 'YYYY-MM-DD': { completedBlocks: [...], blockData: {...} } }
    vocab: {},                     // word -> { count, firstSeen, definition }
    spelling: {                    // tracking per word
      seen: {},                    // word -> times seen
      missed: {}                   // word -> times missed
    },
    writingPieces: [],             // { date, prompt, body, dadApproved }
    bagAnswers: {},                // day -> { name, pitch, level1, money, blurb }
    wpmRecord: 0,
    wordRunHigh: 0,
    artifacts: []                  // saved Show Dad pieces
  };

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      cache = raw ? deepMerge(DEFAULT, JSON.parse(raw)) : structuredClone(DEFAULT);
    } catch (e) {
      console.warn('state load failed, using default', e);
      cache = structuredClone(DEFAULT);
    }
    return cache;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('state save failed', e);
    }
  }

  function deepMerge(a, b) {
    const out = structuredClone(a);
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
        out[k] = deepMerge(a[k] || {}, b[k]);
      } else {
        out[k] = b[k];
      }
    }
    return out;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function ensureDay(d) {
    const s = load();
    if (!s.days[d]) s.days[d] = { completedBlocks: [], blockData: {} };
    return s.days[d];
  }

  // === public API ===
  const SS = {
    get state() { return load(); },

    // streak
    get streak() { return load().streak; },
    tickStreak() {
      const s = load();
      const t = today();
      if (s.lastDayCompleted === t) return s.streak;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      s.streak = (s.lastDayCompleted === yesterday) ? s.streak + 1 : 1;
      s.lastDayCompleted = t;
      save();
      return s.streak;
    },

    // gold stars — policy-driven economy (day-1 fix: 125 stars in one day was 25x pace)
    // Target: ~10 stars/day cap from real work, ~50/week, 150 = GameStop game every other Fri-ish.
    // Star events are predefined. Anything not in the table awards ZERO stars.
    get goldStars() { return load().goldStars; },

    awardStar(event, payload) {
      // Backward-compat: old call sites passed a free-text reason string.
      // Those land in 'legacy-zero' bucket — zero stars, a one-time console
      // note so we can find and update remaining bad callers.
      if (typeof event !== 'string') return load().goldStars;
      const POLICY = {
        // real work — earn stars
        'reading-comp-perfect':     { stars: 3, copy: 'Nailed the reading + comp' },
        'quiz-first-try':           { stars: 2, copy: 'Quiz passed first try' },
        'spelling-round-perfect':   { stars: 2, copy: 'Perfect spelling round' },
        'handwriting-uploaded':     { stars: 3, copy: 'Handwriting submitted' },
        'bag-beat-shipped':         { stars: 3, copy: 'Build-A-Game beat shipped' },
        'writing-approved':         { stars: 2, copy: 'Writing approved' },
        'video-quiz-perfect':       { stars: 2, copy: 'Video quiz nailed' },
        'speedread-comp-perfect':   { stars: 2, copy: 'Speed-read + nailed comp' },
        'math-quickfire-perfect':   { stars: 2, copy: 'Math sweep perfect' },
        'math-lesson-mastered':     { stars: 3, copy: 'Math concept mastered' },
        'word-run-cleared':         { stars: 1, copy: 'Word Run cleared' },
        'tiles-round-complete':     { stars: 1, copy: 'Word Tiles round complete' },
        'wpm-personal-best':        { stars: 1, copy: 'New WPM record' },
        'showed-parent':            { stars: 1, copy: 'Showed Mom or Dad' },
        'speed-bonus':              { stars: 1, copy: '🚀 That was fast!' },
        'concept-complete':         { stars: 0, copy: '' },
        'money-math-correct':       { stars: 1, copy: 'Money math correct' },
        'money-bucket-mastered':    { stars: 1, copy: 'Bucket mastered' },
        'day-complete':             { stars: 3, copy: 'Day complete' },
        'week-streak':              { stars: 5, copy: 'Week streak hit' },
        // explicit zero — old habit events the day-1 retro nuked
        'legacy-zero':              { stars: 0, copy: '' },
      };
      const rule = POLICY[event];
      if (!rule) {
        // Unknown event name — log once, award 0. Likely a typo / old call site.
        if (!window.__ssStarMissing) window.__ssStarMissing = {};
        if (!window.__ssStarMissing[event]) {
          window.__ssStarMissing[event] = 1;
          console.warn(`[SS] awardStar: unknown event "${event}" — 0 stars awarded. Add to POLICY table.`);
        }
        return load().goldStars;
      }
      if (rule.stars <= 0) return load().goldStars;
      const s = load();
      s.goldStars += rule.stars;
      save();
      window.dispatchEvent(new CustomEvent('ss:star', {
        detail: { count: s.goldStars, reason: rule.copy, awarded: rule.stars, event, payload }
      }));
      return s.goldStars;
    },

    // day progress
    completeBlock(blockId, data) {
      const t = today();
      const d = ensureDay(t);
      if (!d.completedBlocks.includes(blockId)) d.completedBlocks.push(blockId);
      if (data) d.blockData[blockId] = data;
      // record completion time + duration if we have a start timestamp
      d.blockMetrics = d.blockMetrics || {};
      const m = d.blockMetrics[blockId] || {};
      m.completedAt = Date.now();
      if (m.startedAt && !m.durationMs) m.durationMs = m.completedAt - m.startedAt;
      d.blockMetrics[blockId] = m;
      save();
      window.dispatchEvent(new CustomEvent('ss:block-complete', { detail: { blockId, data } }));
    },
    // Per-block metrics — called by app.js when the user opens a block.
    startBlock(blockId) {
      const d = ensureDay(today());
      d.blockMetrics = d.blockMetrics || {};
      if (!d.blockMetrics[blockId]) d.blockMetrics[blockId] = { startedAt: Date.now(), opens: 1 };
      else d.blockMetrics[blockId].opens = (d.blockMetrics[blockId].opens || 0) + 1;
      save();
    },
    todayMetrics() {
      const d = ensureDay(today());
      return {
        date: today(),
        completed: d.completedBlocks.slice(),
        blockMetrics: d.blockMetrics || {},
        blockData: d.blockData || {},
        goldStars: load().goldStars,
        streak: load().streak,
      };
    },
    isBlockDone(blockId) {
      const d = ensureDay(today());
      return d.completedBlocks.includes(blockId);
    },
    dayProgress() {
      const d = ensureDay(today());
      return d.completedBlocks.length;
    },
    blockData(blockId) {
      const d = ensureDay(today());
      return d.blockData[blockId] || null;
    },

    // vocab log (words he looked up)
    logVocab(word, definition) {
      const s = load();
      const w = word.toLowerCase();
      if (!s.vocab[w]) s.vocab[w] = { count: 0, firstSeen: today(), definition };
      s.vocab[w].count++;
      if (definition && !s.vocab[w].definition) s.vocab[w].definition = definition;
      save();
    },
    recentLookups(n = 10) {
      const s = load();
      return Object.entries(s.vocab)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, n)
        .map(([w, v]) => ({ word: w, ...v }));
    },

    // spelling history
    recordSpelling(word, correct) {
      const s = load();
      const w = word.toLowerCase();
      s.spelling.seen[w] = (s.spelling.seen[w] || 0) + 1;
      if (!correct) s.spelling.missed[w] = (s.spelling.missed[w] || 0) + 1;
      save();
    },

    // writing
    saveWritingPiece(prompt, body) {
      const s = load();
      s.writingPieces.push({ date: today(), prompt, body, dadApproved: false });
      save();
    },
    dadApproveLatest() {
      const s = load();
      if (s.writingPieces.length) {
        s.writingPieces[s.writingPieces.length - 1].dadApproved = true;
        save();
      }
    },
    latestWriting() {
      const s = load();
      return s.writingPieces[s.writingPieces.length - 1] || null;
    },

    // Build-A-Game arc
    saveBagBeat(day, beat, content) {
      const s = load();
      if (!s.bagAnswers[day]) s.bagAnswers[day] = {};
      s.bagAnswers[day][beat] = content;
      save();
    },
    getBag(day) {
      return load().bagAnswers[day] || {};
    },

    // WPM record
    setWpmRecord(wpm) {
      const s = load();
      if (wpm > s.wpmRecord) {
        s.wpmRecord = wpm;
        save();
        SS.awardStar('wpm-personal-best', { wpm });
        return true;
      }
      return false;
    },
    get wpmRecord() { return load().wpmRecord; },

    // Word Run high score
    setWordRunHigh(score) {
      const s = load();
      if (score > s.wordRunHigh) {
        s.wordRunHigh = score;
        save();
        return true;
      }
      return false;
    },
    get wordRunHigh() { return load().wordRunHigh; },

    // artifacts (Show Dad pieces)
    saveArtifact(art) {
      const s = load();
      s.artifacts.push({ ...art, date: today() });
      save();
    },

    // hard reset (dev only — not exposed in UI)
    reset() {
      localStorage.removeItem(KEY);
      cache = null;
    }
  };

  window.SS = SS;
})();
