/* Summer School — tap/hover/highlight any word for a definition
 * Uses Free Dictionary API (no key needed). Caches hits in localStorage.
 * Logs every lookup to SS.vocab so words feed future drills.
 */

(function () {
  'use strict';

  const CACHE_KEY = 'ss-dict-cache-v1';
  const API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) {}

  const persist = () => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
  };

  // ---- popup element (single, reused) ----
  const pop = document.createElement('div');
  pop.className = 'dict-pop';
  pop.style.display = 'none';
  pop.innerHTML = `
    <div class="dict-head">
      <span class="dict-word"></span>
      <span class="dict-pos"></span>
    </div>
    <div class="dict-pron"></div>
    <div class="dict-def"></div>
    <div class="dict-ex"></div>
  `;
  document.body.appendChild(pop);

  const els = {
    word:  pop.querySelector('.dict-word'),
    pos:   pop.querySelector('.dict-pos'),
    pron:  pop.querySelector('.dict-pron'),
    def:   pop.querySelector('.dict-def'),
    ex:    pop.querySelector('.dict-ex')
  };

  function place(pop, rect) {
    const padding = 12;
    const popW = 280;
    const popH = pop.offsetHeight || 140;
    let x = rect.left + (rect.width / 2) - (popW / 2);
    let y = rect.bottom + 8 + window.scrollY;
    // clamp horizontally
    x = Math.max(padding, Math.min(x, window.innerWidth - popW - padding));
    // flip above if would overflow viewport bottom
    if (rect.bottom + popH + 24 > window.innerHeight) {
      y = rect.top + window.scrollY - popH - 8;
    }
    pop.style.left = x + 'px';
    pop.style.top  = y + 'px';
  }

  function hide() {
    pop.style.display = 'none';
    pop.classList.remove('show');
  }

  function setLoading(word, rect) {
    els.word.textContent = word;
    els.pos.textContent = '';
    els.pron.textContent = '';
    els.def.textContent = 'Looking up…';
    els.ex.textContent = '';
    pop.style.display = 'block';
    pop.classList.add('show');
    place(pop, rect);
  }

  function setNotFound(word, rect) {
    els.word.textContent = word;
    els.pos.textContent = '';
    els.pron.textContent = '';
    els.def.textContent = "Hmm, can't find that one. It might be a name or a made-up word.";
    els.ex.textContent = '';
    place(pop, rect);
  }

  function render(word, entry, rect) {
    const meaning = (entry.meanings || [])[0] || {};
    const def = (meaning.definitions || [])[0] || {};
    els.word.textContent = word;
    els.pos.textContent  = meaning.partOfSpeech ? meaning.partOfSpeech : '';
    els.pron.textContent = entry.phonetic || '';
    els.def.textContent  = def.definition || '';
    els.ex.textContent   = def.example ? '"' + def.example + '"' : '';
    place(pop, rect);
  }

  async function lookup(word, rect) {
    word = word.trim().toLowerCase().replace(/[^a-z\-']/g, '');
    if (!word || word.length < 2) { hide(); return; }

    if (cache[word]) {
      if (cache[word] === 'NOT_FOUND') {
        setNotFound(word, rect);
      } else {
        render(word, cache[word], rect);
        if (window.SS) window.SS.logVocab(word, cache[word].meanings?.[0]?.definitions?.[0]?.definition);
      }
      return;
    }

    setLoading(word, rect);
    try {
      const res = await fetch(API + encodeURIComponent(word));
      if (!res.ok) { cache[word] = 'NOT_FOUND'; persist(); setNotFound(word, rect); return; }
      const data = await res.json();
      const entry = data[0];
      cache[word] = entry;
      persist();
      render(word, entry, rect);
      if (window.SS) window.SS.logVocab(word, entry.meanings?.[0]?.definitions?.[0]?.definition);
    } catch (e) {
      console.warn('dict lookup failed', e);
      hide();
    }
  }

  // ---- find the word at a point (works for click + hover) ----
  function wordAt(target, clientX, clientY) {
    // Use Range API to find the word at coordinates
    let range;
    if (document.caretPositionFromPoint) {
      const cp = document.caretPositionFromPoint(clientX, clientY);
      if (!cp || !cp.offsetNode) return null;
      range = document.createRange();
      range.setStart(cp.offsetNode, cp.offset);
      range.setEnd(cp.offsetNode, cp.offset);
    } else if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(clientX, clientY);
    } else return null;

    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;

    const text = range.startContainer.nodeValue;
    let i = range.startOffset;
    let start = i, end = i;
    const isW = (c) => /[\w\-']/.test(c);
    while (start > 0 && isW(text[start - 1])) start--;
    while (end < text.length && isW(text[end])) end++;
    if (start === end) return null;
    const word = text.slice(start, end);

    // get bounding rect for that word
    const r = document.createRange();
    r.setStart(range.startContainer, start);
    r.setEnd(range.startContainer, end);
    const rect = r.getBoundingClientRect();
    return { word, rect };
  }

  // ---- bind triggers ----
  // hover (debounced)
  let hoverTimer = null;
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-dict]');
    if (!target) { clearTimeout(hoverTimer); hide(); return; }
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      const hit = wordAt(target, e.clientX, e.clientY);
      if (hit && hit.word) lookup(hit.word, hit.rect);
    }, 250);
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-dict]')) {
      clearTimeout(hoverTimer);
      // give the popup time to be reached / clicked before hiding
      hoverTimer = setTimeout(hide, 600);
    }
  });

  pop.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
  pop.addEventListener('mouseleave', () => { hoverTimer = setTimeout(hide, 200); });

  // tap (mobile / iPad)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.dict-pop')) return;
    const target = e.target.closest('[data-dict]');
    if (!target) { hide(); return; }
    const hit = wordAt(target, e.clientX, e.clientY);
    if (hit && hit.word) lookup(hit.word, hit.rect);
  });

  // text selection → definition for the selected word
  document.addEventListener('mouseup', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text || !text.match(/^[a-zA-Z\-']{2,}$/)) return;
    const range = sel.getRangeAt(0);
    if (!range.startContainer.parentElement?.closest('[data-dict]')) return;
    const rect = range.getBoundingClientRect();
    lookup(text, rect);
  });

  // escape to close
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
})();
