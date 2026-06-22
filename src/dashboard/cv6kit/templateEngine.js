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
    const items = resolvePath(scopes, list) || [];
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
    if (!visible) return; // do not bind (or expand each inside) a hidden branch
  }

  // data-bind — fill the value.
  const bindPath = el.getAttribute('data-bind');
  if (bindPath) applyValue(el, resolvePath(scopes, bindPath));

  // data-mod — swap a documented per-item modifier class from data. Form
  // "prefix:path" (e.g. "is-:email.avatarTint" -> replaces any is-* class with
  // is-<value>). Several allowed, separated by ";". Keeps the look in the design's
  // own classes; never invents CSS.
  const mod = el.getAttribute('data-mod');
  if (mod) {
    for (const one of mod.split(';')) {
      const ix = one.indexOf(':');
      if (ix < 0) continue;
      const prefix = one.slice(0, ix).trim();
      const val = resolvePath(scopes, one.slice(ix + 1).trim());
      if (val == null || !prefix) continue;
      const classes = (el.getAttribute('class') || '').split(/\s+/).filter((c) => c && !c.startsWith(prefix));
      classes.push(prefix + val);
      el.setAttribute('class', classes.join(' '));
    }
  }

  // data-action — wire the click.
  const action = el.getAttribute('data-action');
  if (action) {
    const argPath = el.getAttribute('data-arg');
    const target = el.getAttribute('data-target');
    const handler = (e) => {
      const fn = ctx.actions[action];
      if (typeof fn !== 'function') return;
      const arg = argPath ? resolvePath(scopes, argPath) : (target != null ? target : undefined);
      fn(arg, e);
    };
    el.addEventListener('click', handler);
    ctx.cleanups.push(() => el.removeEventListener('click', handler));
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
