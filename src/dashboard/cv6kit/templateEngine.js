// CV6 template engine — corner:corner-ui-cv6
//
// Reads a Claude Design "fill-in template" (the design markup, labeled) and binds
// real data + actions to it WITHOUT touching the look. The markup is the design
// file, verbatim; this only fills the labeled blanks. See TEMPLATE-ENGINE.md and
// corner/missions/corner-ui-cv6/REQUEST-TO-CLAUDE-DESIGN-templates.md for the label
// vocabulary.
//
// Labels supported:
//   data-bind="path"                  set this element's text (or img/input value) from data
//   data-each="item in items"         repeat this element once per array entry (alias `item`)
//   data-each="items"                 same, alias auto-derived (singularized)
//   data-state="empty loading error"  show this element only in one of the listed states
//   data-action="approve"             on click, call actions.approve(arg, event)
//   data-arg="email.id"               the value passed to the action (resolved from data)
//   data-target="review"             a static arg for nav-style actions (used if no data-arg)
//
// The DOM binder (bindTemplate) is the only DOM-touching export. The rest are pure
// and unit-tested in node (see tmp test / TEMPLATE-ENGINE.md).

// ── pure helpers (no DOM) ──────────────────────────────────────────────────

const IRREGULAR = { people: 'person', children: 'child', data: 'datum', media: 'mediaItem' };

export function singularize(name) {
  if (IRREGULAR[name]) return IRREGULAR[name];
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses')) return name.slice(0, -2);
  if (name.endsWith('s')) return name.slice(0, -1);
  return name + 'Item'; // fallback guarantees alias !== list name
}

export function parseEach(expr) {
  const m = String(expr).trim().match(/^([A-Za-z_$][\w$]*)\s+in\s+(.+)$/);
  if (m) return { alias: m[1], list: m[2].trim() };
  const list = String(expr).trim();
  return { alias: singularize(list.split('.').pop()), list };
}

// Build the data-each alias map from a screen's JSON contract `data` block, so the
// host never hand-writes aliases. A list field declares its item name (`"item"`);
// nested lists key off the parent item, matching the template's data-each path
// (e.g. needsYou -> "email", and email.tags -> "tag").
export function aliasesFromContract(contractData) {
  const map = {};
  (function walk(node, itemPrefix) {
    for (const [key, val] of Object.entries(node || {})) {
      if (val && typeof val === 'object' && val.list) {
        const item = val.item || singularize(key);
        map[itemPrefix ? `${itemPrefix}.${key}` : key] = item;
        if (val.shape) walk(val.shape, item);
      }
    }
  })(contractData, null);
  return map;
}

// Resolve "a.b.c" against a stack of scopes (innermost first). The FIRST scope that
// owns the leading segment wins, so item scopes shadow the root data.
export function resolvePath(scopes, path) {
  const parts = String(path).split('.');
  const head = parts[0];
  let base;
  for (const s of scopes) {
    if (s && Object.prototype.hasOwnProperty.call(s, head)) { base = s; break; }
  }
  if (base === undefined) return undefined;
  let val = base;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
}

export function stateMatches(stateAttr, current) {
  return String(stateAttr).split(/[\s,]+/).filter(Boolean).includes(current);
}

// ── DOM binder ─────────────────────────────────────────────────────────────

function applyValue(el, val) {
  if (val == null) return;
  const tag = el.tagName;
  if (tag === 'IMG' || tag === 'SOURCE') { el.setAttribute('src', String(val)); return; }
  if (tag === 'INPUT' || tag === 'TEXTAREA') { el.value = String(val); return; }
  el.textContent = String(val);
}

function isNativeInteractive(el) {
  return ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY'].includes(el.tagName);
}

function actionLabel(action, el) {
  const target = el.getAttribute('data-target');
  if (action === 'search' || action === 'openCommandK') return 'Search';
  if (action === 'openNav') return 'Menu';
  if (action === 'openProfile') return 'Profile';
  if (action === 'toggleTheme') return 'Theme';
  if (action === 'openNotifications') return 'Notifications';
  if (action === 'download') return 'Download';
  if (action === 'nav' && target === 'back') return 'Back';
  if (/^(close|cancel)/i.test(action)) return 'Close';
  return '';
}

export function setActionPressed(el, pressed) {
  if (!el || !el.classList || typeof el.setAttribute !== 'function') return;
  const active = !!pressed;
  el.classList.toggle('is-pressed', active);
  el.setAttribute('data-cv6-pressed', active ? 'true' : 'false');
}

function prepareActionControl(el, action) {
  el.classList.add('cv6-action-control');
  el.setAttribute('data-cv6-action-control', action);
  el.setAttribute('data-cv6-pressed', 'false');
  if (!isNativeInteractive(el)) {
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  }
  if (!el.hasAttribute('aria-label') && !el.textContent.trim()) {
    const label = actionLabel(action, el);
    if (label) el.setAttribute('aria-label', label);
  }
}

function applyBindings(el, scopes, ctx) {
  if (!el || el.nodeType !== 1) return;

  // data-each — this element is the row template; expand it into N bound clones.
  const eachExpr = el.getAttribute('data-each');
  if (eachExpr) {
    const parsed = parseEach(eachExpr);
    // The item alias comes from the screen's JSON contract (e.g. needsYou -> "email"),
    // falling back to "x in xs" syntax or singularizing the list name.
    const alias = (ctx.aliases && ctx.aliases[eachExpr]) || parsed.alias;
    const list = parsed.list;
    // Tolerate a non-array binding (e.g. a path that resolves to an object or a
    // scalar): treat it as empty rather than letting `.forEach` throw and take the
    // whole screen down via the error boundary. A list path should be an array; if
    // it isn't, render zero rows (the same as an empty list) instead of crashing.
    const resolved = resolvePath(scopes, list);
    const items = Array.isArray(resolved) ? resolved : [];
    const parent = el.parentNode;
    if (!parent) return;
    const anchor = el.ownerDocument.createComment('each:' + list);
    parent.insertBefore(anchor, el);
    el.removeAttribute('data-each');
    el.remove();
    items.forEach((item, i) => {
      const clone = el.cloneNode(true);
      parent.insertBefore(clone, anchor);
      applyBindings(clone, [{ [alias]: item, $item: item, $index: i }, ...scopes], ctx);
    });
    return;
  }

  // data-state — keep only the branch matching the current state; skip the rest.
  const st = el.getAttribute('data-state');
  if (st != null) {
    const visible = stateMatches(st, ctx.state);
    el.hidden = !visible;
    // The [hidden] UA rule loses to an inline display (e.g. the Review viewer's
    // style="display:flex"), which left non-matching branches VISIBLE — raw template
    // copy showing through every loading state. Force it.
    if (!visible && el.style) el.style.setProperty('display', 'none', 'important');
    if (!visible) return; // do not bind (or expand each inside) a hidden branch
  }

  // data-switch — show only the descendant [data-case] branch whose value matches the
  // resolved path (e.g. step.id in a multi-step flow), removing the rest so exactly one
  // case renders at a time. The first |-separated token is the path; any remaining tokens
  // are a human-readable enumeration of the cases and are ignored here. Runs before the
  // recursion below so non-matching branches are never bound (or their data-each expanded).
  const sw = el.getAttribute('data-switch');
  if (sw != null) {
    const path = sw.split('|')[0].trim();
    const v = resolvePath(scopes, path);
    const want = v == null ? '' : String(v);
    for (const c of Array.from(el.querySelectorAll('[data-case]'))) {
      if (c.getAttribute('data-case') !== want) c.remove();
    }
  }

  // data-bind — fill the value.
  const bindPath = el.getAttribute('data-bind');
  if (bindPath) applyValue(el, resolvePath(scopes, bindPath));

  // data-html — fill this element's innerHTML from data (rendered content:
  // a document's markdown rendered to HTML, an <img>/<video> viewer, etc).
  // Distinct from data-bind (which sets textContent). The host stays agnostic;
  // the source must already be trusted/rendered HTML built by the screen's data
  // hook (same-tenant files via the tenant-gated project-file endpoint).
  // Skip the write when the string is unchanged: resetting innerHTML replaces the
  // children even for identical markup, which restarts a playing <video> / reloads a
  // PDF <iframe> on every rebind. Paired with data-cv6-keep (TemplateScreen grafts the
  // same node across re-binds) this keeps live media alive through data ticks.
  const htmlPath = el.getAttribute('data-html');
  if (htmlPath != null) {
    const v = resolvePath(scopes, htmlPath);
    if (v != null && el.__cv6Html !== String(v)) { el.innerHTML = String(v); el.__cv6Html = String(v); }
  }

  // data-mod — drive a documented per-item visual variation from data. Form
  // "verb:path", several allowed, separated by ";". The host stays design-agnostic:
  // every verb just toggles the design's `is-<value>` modifier class (the verb —
  // is- / dot / stp / stroke / glyph / state — is a human label of WHICH property it
  // affects; the look always lives in the design's own `.base.is-<value>` CSS). The
  // one exception is `width:` (a numeric like goal.pct), set as an inline width %,
  // because a progress fill can't be a finite set of classes.
  const mod = el.getAttribute('data-mod');
  if (mod) {
    for (const one of mod.split(';')) {
      const ix = one.indexOf(':');
      if (ix < 0) continue;
      const verb = one.slice(0, ix).trim();
      const val = resolvePath(scopes, one.slice(ix + 1).trim());
      if (val == null) continue;
      if (verb === 'width') { if (el.style) el.style.width = `${val}%`; continue; }
      // left:/top: place an element at a live percentage position (e.g. a review
      // pin marker at pin.x/pin.y). Like width, a free coordinate can't be a finite
      // set of classes, so it is an inline-% exception. The host owns the value.
      if (verb === 'left') { if (el.style) el.style.left = `${val}%`; continue; }
      if (verb === 'top') { if (el.style) el.style.top = `${val}%`; continue; }
      // keyboard selection rides a data attribute, not an is-* class, so a row can carry
      // BOTH its depth-indent (is-d1/is-d2) and the selected highlight at the same time.
      if (verb === 'knav') { el.setAttribute('data-knav', val); continue; }
      // acur: mark the ACTIVE one of a segmented control (a filter chip, a tab) with
      // aria-current so assistive tech — and the QA census — read the already-selected
      // item as an intentional no-op rather than a dead control. Truthy value ('on',
      // 'true') sets it; the off/false peers drop the attribute. Same contract the
      // desktop React tabs already carry via aria-current.
      if (verb === 'acur') {
        if (val && val !== 'off' && val !== 'false' && val !== 'no' && val !== '0') el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
        continue;
      }
      // swap to the design's documented is-<value> class; drop any prior is-*.
      const classes = (el.getAttribute('class') || '').split(/\s+/).filter((c) => c && !c.startsWith('is-'));
      classes.push(`is-${val}`);
      el.setAttribute('class', classes.join(' '));
    }
  }

  // data-action — wire the click.
  const action = el.getAttribute('data-action');
  if (action) {
    prepareActionControl(el, action);
    const argPath = el.getAttribute('data-arg');
    const target = el.getAttribute('data-target');
    // Stamp the RESOLVED arg onto the node so delegated listeners on a stable
    // wrapper (context menus, long-press) can identify a row without a rebind
    // — the click closure below is invisible to them. Scalar ids only.
    if (argPath) {
      const resolved = resolvePath(scopes, argPath);
      if (resolved != null && (typeof resolved === 'string' || typeof resolved === 'number')) {
        el.setAttribute('data-cv6-arg', String(resolved));
      }
    }
    const handler = (e) => {
      const fn = ctx.actions[action];
      if (typeof fn !== 'function') return;
      // A nested data-action (e.g. an Assign button inside a click-to-open row) must NOT
      // also fire its container's action. Stop bubbling once a real action handles the click.
      e.stopPropagation();
      const arg = argPath ? resolvePath(scopes, argPath) : (target != null ? target : undefined);
      fn(arg, e);
    };
    el.addEventListener('click', handler);
    const press = () => {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      setActionPressed(el, true);
    };
    const release = () => setActionPressed(el, false);
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('blur', release);
    const keyHandler = (e) => {
      if (isNativeInteractive(el)) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      handler(e);
    };
    el.addEventListener('keydown', keyHandler);
    ctx.cleanups.push(() => {
      el.removeEventListener('click', handler);
      el.removeEventListener('keydown', keyHandler);
      el.removeEventListener('pointerdown', press);
      el.removeEventListener('pointerup', release);
      el.removeEventListener('pointercancel', release);
      el.removeEventListener('pointerleave', release);
      el.removeEventListener('blur', release);
    });
  }

  // recurse — snapshot children first because data-each mutates the sibling list.
  for (const child of Array.from(el.childNodes)) applyBindings(child, scopes, ctx);
}

// Bind a labeled template that is already in the DOM. Returns a cleanup function
// that removes every listener it attached.
export function bindTemplate(root, { data = {}, actions = {}, state = 'ready', aliases = {} } = {}) {
  const ctx = { actions, state, aliases, cleanups: [] };
  for (const child of Array.from(root.childNodes)) applyBindings(child, [data], ctx);
  return () => { ctx.cleanups.forEach((fn) => fn()); ctx.cleanups.length = 0; };
}
