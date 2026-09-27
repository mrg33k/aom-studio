(() => {
  const W = 1080, H = 1920;
  const reviewKey = new URLSearchParams(location.search).get('key') || '';
  const isCandidate = new URLSearchParams(location.search).get('preview') === 'candidate-v1';
  const API = '/api/design-review/clip-layout';
  const STORE = 'oak-street-layout-review-v1';
  const isLocalFile = location.protocol === 'file:';
  const OPTIONS = [
    { id: 'main1', label: 'Main 1', file: 'index.html', source: '#post', parts: [
      ['speaker', 'Speaker video', '.speaker'], ['caption', 'Captions', '.caption'], ['photo', 'Supporting photo', '.support'],
      ['footer', 'Footer', '.footer'], ['logo', 'Logo', '.footer img'], ['website', 'Website', '.footer .url'], ['name', 'Name tag', '.name']
    ] },
    { id: 'main2', label: 'Main 2', file: 'option-2.html', source: '#post', parts: [
      ['speaker', 'Speaker video', '.speaker'], ['caption', 'Captions', '.caption'], ['photo', 'Supporting photo', '.support'],
      ['footer', 'Footer', '.footer'], ['logo', 'Logo', '.footer .mark'], ['brand', 'Brand name', '.footer .brand strong'],
      ['website', 'Website', '.footer .url'], ['name', 'Name tag', '.name']
    ] },
    { id: 'main3', label: 'Main 3', file: 'new-options.html', source: '#main3', parts: [
      ['headline', 'Headline', '.headline'], ['speaker', 'Speaker video', '.m3-speaker'], ['photo', 'Supporting photo', '.m3-photo'],
      ['caption', 'Captions', '.m3-caption'], ['name', 'Name tag', '.name']
    ] },
    { id: 'main4', label: 'Main 4', file: 'new-options.html', source: '#main4', parts: [
      ['headline', 'Headline', '.headline'], ['speaker', 'Speaker video', '.m4-person'], ['photo', 'Supporting photo', '.m4-photo'],
      ['caption', 'Captions', '.m4-caption'], ['name', 'Name tag', '.name']
    ] },
    { id: 'main5', label: 'Main 5', file: 'new-options.html', source: '#main5', parts: [
      ['photo', 'Supporting photo', '.m5-photo'], ['portrait', 'Speaker bubble', '.m5-portrait'], ['caption', 'Captions', '.m5-caption'],
      ['support', 'Supporting text', '.m5-support'], ['name', 'Name tag', '.name']
    ] },
    { id: 'main6', label: 'Main 6', file: 'new-options.html', source: '#main6', parts: [
      ['speaker', 'Speaker video', '.m6-speaker'], ['caption', 'Captions', '.m6-caption'], ['photo', 'Supporting photo', '.m6-photo'],
      ['footer', 'Footer', '.m6-footer'], ['logo', 'Logo', '.m6-mark'], ['brand', 'Brand name', '.m6-brand strong'],
      ['website', 'Website', '.m6-brand span'], ['name', 'Name tag', '.name']
    ] },
    { id: 'end1', label: 'End 1', file: 'new-options.html', source: '#end1', parts: [
      ['portrait', 'Speaker portrait', '.e1-portrait'], ['badge', 'Brand badge', '.e1-badge'], ['follow', 'Follow headline', '.e1-follow'],
      ['show', 'Show name', '.e1-show'], ['cta', 'Full episode', '.e1-cta'], ['website', 'Website', '.e1-site']
    ] },
    { id: 'end2', label: 'End 2', file: 'new-options.html', source: '#end2', parts: [
      ['logo', 'Logo', '.e2-mark'], ['brand', 'Brand name', '.e2-brand'], ['follow', 'Follow headline', '.e2-follow'], ['website', 'Website', '.e2-site']
    ] },
  ];
  const $ = id => document.getElementById(id);
  const cache = new Map();
  let state = { layouts: {}, pins: {}, instagramOn: false };
  let option = OPTIONS[0], partMap = new Map(), selected = null, pinMode = false, draft = null;
  let saveTimer = null, saving = false, saveAgain = false, scale = 1, revision = 0, renderTicket = 0;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const numericBox = b => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });
  const snapped = (value, e) => $('snapToggle').checked && !e?.altKey ? Math.round(value / 24) * 24 : value;
  function savePart(part) {
    layoutState()[part.id] = { ...numericBox(part.box), ...(part.zExplicit ? { z: part.z } : {}) };
    queueSave();
  }
  const setStatus = msg => { $('saveStatus').textContent = msg; };
  const backup = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) {} };
  const hasDraft = value => value && (Object.values(value.layouts || {}).some(parts => Object.keys(parts || {}).length) || Object.values(value.pins || {}).some(pins => pins?.length));
  async function transferLocalDraft() {
    // A local file cannot use the relative API path. Send a simple cross-origin
    // request to the final host; the bare domain redirects and may drop a POST
    // from an embedded file browser.
    const endpoint = `https://www.aheadofmarket.com${API}?key=${encodeURIComponent(reviewKey)}`;
    const payload = new URLSearchParams({ state: JSON.stringify(state) });
    try {
      if (navigator.sendBeacon(endpoint, payload)) {
        setStatus('Sending your saved draft for review…');
        return;
      }
    } catch (_) {}
    try {
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: payload, keepalive: true });
      setStatus('Draft sent for review');
      return;
    } catch (_) {}
    // An iframe form is a final fallback for browsers that disable beacons
    // and no-cors fetch from file pages.
    const frame = document.createElement('iframe');
    frame.name = 'layout-draft-transfer';
    frame.hidden = true;
    document.body.append(frame);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.target = frame.name;
    form.hidden = true;
    const input = document.createElement('input');
    input.name = 'state';
    input.value = JSON.stringify(state);
    form.append(input);
    document.body.append(form);
    form.submit();
    form.remove();
    setStatus('Sending your saved draft for review…');
  }
  function queueSave() {
    if (isCandidate) { setStatus('Preview only · original draft is safe'); return; }
    revision++;
    backup();
    setStatus('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 650);
  }
  async function saveState() {
    if (isCandidate) { setStatus('Preview only · original draft is safe'); return; }
    clearTimeout(saveTimer);
    if (!reviewKey) { setStatus('Saved on this phone only'); return; }
    if (isLocalFile) { transferLocalDraft(); return; }
    if (saving) { saveAgain = true; return; }
    saving = true;
    const sentRevision = revision;
    try {
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Review-Key': reviewKey }, body: JSON.stringify(state) });
      if (!response.ok) throw new Error('Save failed');
      if (sentRevision === revision) setStatus('Saved for review');
    } catch (_) { setStatus('Saved on this phone; tap Save to retry'); }
    saving = false;
    if (saveAgain || sentRevision !== revision) { saveAgain = false; saveState(); }
  }
  function fit() {
    scale = $('canvasViewport').clientWidth / W;
    $('scaledStack').style.transform = `scale(${scale})`;
  }
  function layoutState() { return state.layouts[option.id] || (state.layouts[option.id] = {}); }
  function listPins() { return state.pins[option.id] || (state.pins[option.id] = []); }

  async function template(file) {
    if (!cache.has(file)) {
      const response = await fetch(file);
      if (!response.ok) throw new Error('Could not load layout source');
      cache.set(file, new DOMParser().parseFromString(await response.text(), 'text/html'));
    }
    return cache.get(file);
  }
  function contentPosition(el) {
    const a = el.getBoundingClientRect(), c = $('canvas').getBoundingClientRect();
    return { x: (a.left - c.left) / scale, y: (a.top - c.top) / scale, w: a.width / scale, h: a.height / scale };
  }
  function applyPart(part) {
    const box = part.box;
    const b = part.base;
    part.element.style.transformOrigin = 'top left';
    part.element.style.transform = `translate(${box.x - b.x}px, ${box.y - b.y}px) scale(${box.w / b.w}, ${box.h / b.h})`;
    if (part.zExplicit) part.element.style.zIndex = String(part.z);
    Object.assign(part.hit.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
    part.hit.style.zIndex = String(part.z);
  }
  function flattenNestedPieces() {
    const root = $('canvas').shadowRoot.querySelector(option.source);
    const targets = option.parts.map(([id, , selector]) => ({ id, selector, el: root.querySelector(selector) })).filter(p => p.el);
    for (const target of targets) target.el.dataset.editorPart = target.id;
    for (const target of targets) {
      if (!targets.some(other => other !== target && other.el.contains(target.el))) continue;
      target.originalBox = contentPosition(target.el);
      target.styles = [target.el, ...target.el.querySelectorAll('*')].map(node => {
        const computed = getComputedStyle(node);
        const declarations = [];
        for (let i = 0; i < computed.length; i++) {
          const property = computed.item(i);
          declarations.push([property, computed.getPropertyValue(property), computed.getPropertyPriority(property)]);
        }
        return [node, declarations];
      });
    }
    for (const target of targets) {
      if (!target.originalBox) continue;
      const box = target.originalBox;
      // Keep the original look after lifting a footer logo or URL out of its
      // parent. This lets the band and its contents move independently.
      for (const [node, declarations] of target.styles) {
        for (const [property, value, priority] of declarations) node.style.setProperty(property, value, priority);
      }
      root.append(target.el);
      Object.assign(target.el.style, { position: 'absolute', left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`, margin: '0', transform: 'none' });
    }
  }
  function selectPart(id) {
    selected = id;
    for (const [key, part] of partMap) part.hit.classList.toggle('selected', key === id);
    const p = partMap.get(id);
    $('selectionLabel').textContent = p ? `${p.label} · ${Math.round(p.box.w)} × ${Math.round(p.box.h)}` : 'Tap a piece, then drag it.';
    for (const button of $('partList').children) button.classList.toggle('active', button.dataset.id === id);
    $('layerBack').disabled = !p;
    $('layerFront').disabled = !p;
  }
  function changeLayer(direction) {
    if (!selected) return;
    const ordered = [...partMap.values()].sort((a, b) => a.z - b.z);
    const index = ordered.findIndex(part => part.id === selected);
    const next = index + direction;
    if (next < 0 || next >= ordered.length) return;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    ordered.forEach((part, i) => {
      part.z = i + 1;
      part.zExplicit = true;
      applyPart(part);
      layoutState()[part.id] = { ...numericBox(part.box), z: part.z };
    });
    queueSave();
  }
  function drawHits() {
    $('interaction').replaceChildren();
    $('partList').replaceChildren();
    partMap = new Map();
    for (const [index, [id, label, selector]] of option.parts.entries()) {
      const el = $('canvas').shadowRoot.querySelector(`[data-editor-part="${id}"]`) || $('canvas').shadowRoot.querySelector(selector);
      if (!el) continue;
      const base = contentPosition(el);
      if (base.w < 1 || base.h < 1) continue;
      const saved = layoutState()[id];
      const box = saved ? numericBox(saved) : numericBox(base);
      const hit = document.createElement('div');
      hit.className = 'hit-box';
      hit.dataset.label = label;
      hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', `Move or resize ${label}`);
      hit.tabIndex = 0;
      const clip = getComputedStyle(el).clipPath;
      if (clip && clip !== 'none') hit.style.clipPath = clip;
      for (const corner of ['nw', 'ne', 'sw', 'se']) {
        const handle = document.createElement('span');
        handle.className = `resize-handle ${corner}`;
        handle.dataset.corner = corner;
        hit.append(handle);
      }
      const part = { id, label, element: el, hit, base, box, z: Number.isInteger(saved?.z) ? saved.z : index + 1, zExplicit: Number.isInteger(saved?.z) };
      partMap.set(id, part);
      $('interaction').append(hit);
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label; button.dataset.id = id;
      button.onclick = () => selectPart(id);
      $('partList').append(button);
      applyPart(part);
      hit.addEventListener('pointerdown', e => beginMove(e, part));
      hit.addEventListener('keydown', e => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault(); selectPart(id);
          const step = e.shiftKey ? 120 : $('snapToggle').checked ? 24 : 5;
          part.box.x += e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          part.box.y += e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          applyPart(part); savePart(part);
        } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPart(id); }
      });
    }
    selectPart(null);
  }
  function beginMove(e, part) {
    if (pinMode) return;
    e.preventDefault();
    selectPart(part.id);
    const corner = e.target.dataset.corner || null;
    const start = { x: e.clientX, y: e.clientY, box: { ...part.box } };
    part.hit.setPointerCapture(e.pointerId);
    const moving = ev => {
      const dx = (ev.clientX - start.x) / scale, dy = (ev.clientY - start.y) / scale;
      let { x, y, w, h } = start.box;
      if (!corner) { x += dx; y += dy; }
      else {
        if (corner.includes('e')) w += dx;
        if (corner.includes('s')) h += dy;
        if (corner.includes('w')) { x += dx; w -= dx; }
        if (corner.includes('n')) { y += dy; h -= dy; }
        if (w < 45) { if (corner.includes('w')) x -= 45 - w; w = 45; }
        if (h < 45) { if (corner.includes('n')) y -= 45 - h; h = 45; }
      }
      part.box = { x: clamp(snapped(x, ev), -W, W * 2), y: clamp(snapped(y, ev), -H, H * 2), w: clamp(snapped(w, ev), 45, W * 2), h: clamp(snapped(h, ev), 45, H * 2) };
      applyPart(part);
    };
    const stop = () => {
      part.hit.removeEventListener('pointermove', moving);
      part.hit.removeEventListener('pointerup', stop);
      part.hit.removeEventListener('pointercancel', stop);
      savePart(part);
    };
    part.hit.addEventListener('pointermove', moving);
    part.hit.addEventListener('pointerup', stop, { once: true });
    part.hit.addEventListener('pointercancel', stop, { once: true });
  }
  async function showOption(id) {
    const ticket = ++renderTicket;
    const next = OPTIONS.find(o => o.id === id) || OPTIONS[0];
    option = next;
    draft = null;
    $('pinDraft').hidden = true;
    selectPart(null);
    $('selectionLabel').textContent = `Loading ${next.label}…`;
    for (const button of $('layoutTabs').children) button.classList.toggle('active', button.dataset.id === next.id);
    const doc = await template(next.file);
    if (ticket !== renderTicket) return;
    const source = doc.querySelector(next.source);
    const style = doc.querySelector('style');
    if (!source || !style) throw new Error('Layout source is incomplete');
    const shadow = $('canvas').shadowRoot || $('canvas').attachShadow({ mode: 'open' });
    $('interaction').replaceChildren();
    $('pinsOnCanvas').replaceChildren();
    shadow.replaceChildren();
    const css = document.createElement('style');
    css.textContent = `:host{display:block;position:relative;width:1080px;height:1920px;overflow:hidden;} *{box-sizing:border-box;} ${style.textContent}`;
    shadow.append(css, source.cloneNode(true));
    // Main 1's footer logo has an intrinsic height. On a fresh phone load it
    // can measure as zero until the image arrives, leaving no drag handle.
    const images = [...shadow.querySelectorAll('img')];
    await Promise.race([
      Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }))),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]);
    await document.fonts.ready;
    if (ticket !== renderTicket) return;
    // Give the browser a layout pass before measuring the editable pieces.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (ticket !== renderTicket) return;
    flattenNestedPieces();
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (ticket !== renderTicket) return;
    drawHits();
    renderPins();
    $('mediaSwap').hidden = !isCandidate || option.id !== 'main4';
    $('mediaSwap').textContent = 'Show supporting visual';
    if (isCandidate && option.id === 'main4') {
      const photo = partMap.get('photo');
      photo.element.style.clipPath = 'none';
      photo.element.style.zIndex = '1';
    }
    const query = isCandidate ? `preview=candidate-v1&layout=${option.id}` : `key=${encodeURIComponent(reviewKey)}&layout=${option.id}`;
    history.replaceState(null, '', `?${query}`);
  }
  function mode(pin) {
    pinMode = pin;
    $('pinSurface').style.display = pin ? 'block' : 'none';
    $('interaction').style.display = pin ? 'none' : 'block';
    $('moveButton').classList.toggle('active', !pin);
    $('pinButton').classList.toggle('active', pin);
    $('moveButton').setAttribute('aria-pressed', String(!pin));
    $('pinButton').setAttribute('aria-pressed', String(pin));
    if (pin) selectPart(null);
    $('selectionLabel').textContent = pin ? 'Tap anywhere on the design to place a pin.' : 'Tap a piece, then drag it.';
  }
  function renderPins(activeId = null) {
    const list = listPins();
    $('pinsOnCanvas').replaceChildren();
    $('notesList').replaceChildren();
    $('noteCount').textContent = String(list.length);
    list.forEach((p, i) => {
      const marker = document.createElement('button');
      marker.className = `pin-marker${p.id === activeId ? ' active' : ''}`;
      marker.textContent = String(i + 1);
      marker.style.left = `${p.x * W}px`;
      marker.style.top = `${p.y * H}px`;
      marker.setAttribute('aria-label', `Pin ${i + 1}: ${p.text}`);
      marker.onclick = () => { renderPins(p.id); $('notesList').children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
      $('pinsOnCanvas').append(marker);
      const row = document.createElement('div');
      row.className = 'note-row';
      const number = document.createElement('span'); number.className = 'note-number'; number.textContent = String(i + 1);
      const body = document.createElement('div'); body.className = 'note-text'; body.textContent = p.text;
      const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove pin ${i + 1}`);
      remove.onclick = () => { list.splice(i, 1); renderPins(); queueSave(); };
      row.append(number, body, remove);
      $('notesList').append(row);
    });
  }
  function startPin(e) {
    const rect = $('pinSurface').getBoundingClientRect();
    draft = { x: clamp((e.clientX - rect.left) / rect.width, 0, 1), y: clamp((e.clientY - rect.top) / rect.height, 0, 1) };
    $('draftNumber').textContent = String(listPins().length + 1);
    $('pinText').value = '';
    $('pinDraft').hidden = false;
    $('pinDraft').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('pinText').focus();
  }
  function commitPin() {
    const text = $('pinText').value.trim();
    if (!draft || !text) { $('pinText').focus(); return; }
    const pin = { id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, x: draft.x, y: draft.y, text, created: new Date().toISOString() };
    listPins().push(pin);
    draft = null;
    $('pinDraft').hidden = true;
    renderPins(pin.id);
    mode(false);
    queueSave();
  }
  function setInstagram(on, save = true) {
    state.instagramOn = on;
    $('instagramToggle').checked = on;
    $('instagramOverlay').style.display = on ? 'block' : 'none';
    if (save) queueSave();
  }
  async function init() {
    if (isCandidate) {
      document.body.classList.add('candidate-preview');
      document.querySelector('.page-head h1').textContent = 'Aligned layout study';
      document.querySelector('.page-head p').textContent = 'These frames follow Patrik’s edited layouts with aligned edges and repaired layers. The original draft is unchanged.';
    }
    for (const item of OPTIONS) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = item.label; b.dataset.id = item.id;
      b.onclick = () => showOption(item.id).catch(() => setStatus('Could not open that layout'));
      $('layoutTabs').append(b);
    }
    if (isCandidate) {
      const response = await fetch('candidate-v1.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Candidate is unavailable');
      state = await response.json();
      setStatus('Preview only · original draft is safe');
    } else try { const backupState = JSON.parse(localStorage.getItem(STORE) || 'null'); if (backupState) state = backupState; } catch (_) {}
    if (isCandidate) {
      // Never replace the user's review state with an exploratory candidate.
    } else if (reviewKey && isLocalFile && hasDraft(state)) {
      transferLocalDraft();
    } else if (reviewKey && !isLocalFile) {
      try {
        const response = await fetch(API, { headers: { 'X-Review-Key': reviewKey }, cache: 'no-store' });
        if (!response.ok) throw new Error('Review link rejected');
        const saved = await response.json();
        if (saved.updated) state = saved;
        setStatus('Saved for review');
      } catch (_) { setStatus('Offline or review link needs updating'); }
    } else setStatus('Saved on this phone only');
    state.layouts ||= {}; state.pins ||= {};
    fit();
    const initial = new URLSearchParams(location.search).get('layout') || 'main1';
    await showOption(initial);
    setInstagram(!!state.instagramOn, false);
    $('moveButton').onclick = () => mode(false);
    $('pinButton').onclick = () => mode(true);
    $('pinSurface').addEventListener('click', startPin);
    $('savePin').onclick = commitPin;
    $('cancelPin').onclick = () => { draft = null; $('pinDraft').hidden = true; mode(false); };
    $('instagramToggle').onchange = e => setInstagram(e.target.checked);
    $('mediaSwap').onclick = () => {
      const photo = partMap.get('photo');
      if (!photo || option.id !== 'main4') return;
      const show = photo.element.style.zIndex !== '6';
      photo.element.style.zIndex = show ? '6' : '1';
      $('mediaSwap').textContent = show ? 'Show speaker video' : 'Show supporting visual';
    };
    $('snapToggle').onchange = e => { $('gridOverlay').style.display = e.target.checked ? 'block' : 'none'; };
    $('gridOverlay').style.display = $('snapToggle').checked ? 'block' : 'none';
    $('layerBack').onclick = () => changeLayer(-1);
    $('layerFront').onclick = () => changeLayer(1);
    $('saveNow').onclick = saveState;
    $('exportDraft').onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `clipping-layout-draft-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    $('resetLayout').onclick = async () => {
      if (!confirm(`Reset ${option.label} to its original layout?`)) return;
      delete state.layouts[option.id];
      await showOption(option.id);
      queueSave();
    };
    new ResizeObserver(fit).observe($('canvasViewport'));
  }
  init().catch(() => setStatus('The editor could not load. Please refresh.'));
})();
