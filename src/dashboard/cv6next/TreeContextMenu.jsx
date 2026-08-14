// cv6next — right-click / long-press context menu for project + mission rows.
// corner:corner-ui-cv6 R-TREE-MENU.
//
// One hook serves Home, Organize and Review: each surface passes its stable
// wrapper ref (the template DOM inside is rebuilt every data tick, so all
// listening is delegated from the wrapper) and a resolveHit(rowEl) that maps a
// row element back to the record it renders. The menu, move picker and rename
// dialog are React portals on document.body — template rebinds can't touch them.
//
// Menu actions v1 (Patrik 2026-07-02): Rename + Move. Invite deferred.
// Rename = display name only (slug/folder unchanged). Move = mission to
// another project (projects themselves don't move).

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const LONG_PRESS_MS = 550;

function activeTheme() {
  const mounted = document.querySelector('[data-cv6][data-theme]');
  return mounted?.getAttribute('data-theme') || 'dark';
}

function clampToViewport(x, y, w, h) {
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(pad, Math.min(x, vw - w - pad)),
    y: Math.max(pad, Math.min(y, vh - h - pad)),
  };
}

const S = {
  card: {
    position: 'fixed', zIndex: 9999, minWidth: 208, maxWidth: 260, boxSizing: 'border-box',
    background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 12,
    boxShadow: '0 18px 44px -12px rgba(0,0,0,.55)', padding: 6,
    fontFamily: 'var(--font-sans)', color: 'var(--fg)',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', userSelect: 'none', color: 'var(--fg)',
  },
  rowIcon: { width: 15, height: 15, flex: 'none', color: 'var(--muted)' },
  header: {
    padding: '7px 10px 5px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
    textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  scrim: { position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(4,6,9,.45)' },
  dialog: {
    position: 'fixed', zIndex: 9999, left: '50%', top: '38%', transform: 'translate(-50%,-50%)',
    width: 340, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box',
    background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14,
    boxShadow: '0 24px 64px -16px rgba(0,0,0,.6)', padding: 16,
    fontFamily: 'var(--font-sans)', color: 'var(--fg)',
  },
  input: {
    width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '10px 12px',
    borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)',
    color: 'var(--fg)', fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none',
  },
  btnRow: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  btn: {
    height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)',
    background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, fontWeight: 600,
    fontFamily: 'var(--font-sans)', cursor: 'pointer',
  },
  btnPrimary: { background: 'var(--accent)', borderColor: 'transparent', color: '#fff' },
  err: { marginTop: 10, fontSize: 12, color: 'var(--warn, #fbbf24)' },
};

function PencilIcon() {
  return (
    <svg style={S.rowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
function MoveIcon() {
  // Deliberately NOT a folder glyph: at 15px a folder-with-arrow and the
  // folder-plus of "New subfolder" are indistinguishable blobs on adjacent
  // rows. A bar + right arrow ("move out to") stays legible at menu size.
  return (
    <svg style={S.rowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v16" />
      <path d="M9 12h11M16 8l4 4-4 4" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg style={S.rowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}
function FolderPlusIcon() {
  return (
    <svg style={S.rowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M12 10.5v5M9.5 13h5" />
    </svg>
  );
}
function ArchiveIcon() {
  // Lidded box: reads as "put away", clearly distinct from the folder glyphs.
  return (
    <svg style={S.rowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <path d="M10 13h4" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg style={S.rowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.36.36.7.66.96.3.26.68.4 1.08.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

function MenuRow({ icon, label, sub, onPick, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        ...S.row,
        background: hover && !disabled ? 'var(--accent-weak)' : 'transparent',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={disabled ? undefined : onPick}
      role="menuitem"
    >
      {icon}
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {sub ? <span style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{sub}</span> : null}
    </div>
  );
}

// ── the hook ──
// wrapRef        — stable wrapper around the surface's TemplateScreen
// resolveHit     — (rowEl, ev) => null | { kind:'project'|'mission', name,
//                  projectSlug, missionSlug?, path?, canMove?, canRename? }
// listProjects   — () => [{ slug, name }] move destinations (current filtered out here)
// onRename       — async (target, newName) => throws on failure
// onMove         — async (target, destProjectSlug) => throws on failure
// onCreate       — async (target, name) => throws on failure ("New subfolder";
//                  omit to hide the item)
// onArchive      — async (target) => throws on failure ("Archive project",
//                  projects only, confirm dialog first; omit to hide the item)
export function useTreeContextMenu({ wrapRef, resolveHit, listProjects, onRename, onMove, onCreate, onArchive, onSettings }) {
  const [menu, setMenu] = useState(null);      // { x, y, target }
  const [mode, setMode] = useState('menu');    // 'menu' | 'move'
  const [rename, setRename] = useState(null);  // { kind: 'rename'|'create', target, value }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const close = useCallback(() => { setMenu(null); setMode('menu'); setError(''); }, []);
  const closeAll = useCallback(() => { close(); setRename(null); setBusy(false); }, [close]);

  const openAt = useCallback((x, y, target) => {
    const p = clampToViewport(x, y, 230, 120);
    setMode('menu'); setError('');
    setMenu({ x: p.x, y: p.y, target });
  }, []);

  // Delegated right-click + long-press on the stable wrapper. The template DOM
  // inside is rebuilt every data tick, so per-row listeners would die instantly;
  // the wrapper survives, and rows are identified via data-cv6-arg (stamped by
  // the template engine at bind time).
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return undefined;

    const hitFromEvent = (ev) => {
      const row = ev.target?.closest?.('[data-cv6-arg]');
      if (!row || !root.contains(row)) return null;
      const t = resolveHit(row, ev);
      return t ? { row, target: t } : null;
    };

    const onCtx = (ev) => {
      const hit = hitFromEvent(ev);
      if (!hit) return;
      ev.preventDefault();
      ev.stopPropagation();
      openAt(ev.clientX, ev.clientY, hit.target);
    };

    // Long-press (touch): open the same menu near the finger.
    let pressTimer = null;
    let pressStart = null;
    const clearPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } pressStart = null; };
    const onPointerDown = (ev) => {
      if (ev.pointerType !== 'touch') return;
      const hit = hitFromEvent(ev);
      if (!hit) return;
      pressStart = { x: ev.clientX, y: ev.clientY };
      pressTimer = setTimeout(() => {
        pressTimer = null;
        openAt(pressStart.x, pressStart.y, hit.target);
      }, LONG_PRESS_MS);
    };
    const onPointerMove = (ev) => {
      if (!pressStart) return;
      if (Math.abs(ev.clientX - pressStart.x) > 10 || Math.abs(ev.clientY - pressStart.y) > 10) clearPress();
    };

    root.addEventListener('contextmenu', onCtx);
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', clearPress);
    root.addEventListener('pointercancel', clearPress);
    return () => {
      root.removeEventListener('contextmenu', onCtx);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', clearPress);
      root.removeEventListener('pointercancel', clearPress);
      clearPress();
    };
  }, [wrapRef, resolveHit, openAt]);

  // Close the floating menu on outside click / Escape / scroll.
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (ev) => { if (!ev.target?.closest?.('[data-cv6-ctxmenu]')) close(); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu, close]);

  useEffect(() => {
    if (rename) setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }, [rename]);

  const startRename = useCallback(() => {
    const target = menu?.target;
    close();
    if (target) setRename({ kind: 'rename', target, value: target.name || '' });
  }, [menu, close]);

  const startCreate = useCallback(() => {
    const target = menu?.target;
    close();
    if (target) setRename({ kind: 'create', target, value: '' });
  }, [menu, close]);

  // Archive rides the same dialog state machine as rename/create — the
  // portal + scrim + busy/error plumbing is identical; only the body differs.
  const startArchive = useCallback(() => {
    const target = menu?.target;
    close();
    if (target) setRename({ kind: 'archive', target, value: '' });
  }, [menu, close]);

  const openSettings = useCallback(() => {
    const target = menu?.target;
    close();
    if (target) onSettings?.(target);
  }, [menu, close, onSettings]);

  const submitArchive = useCallback(async () => {
    if (!rename || rename.kind !== 'archive' || busy) return;
    setBusy(true); setError('');
    try {
      await onArchive(rename.target);
      closeAll();
    } catch (e) {
      setBusy(false);
 setError(e?.message || 'Could not archive the project, try again.');
    }
  }, [rename, busy, onArchive, closeAll]);

  const submitRename = useCallback(async () => {
    if (!rename || busy) return;
    const next = String(inputRef.current?.value ?? rename.value ?? '').trim();
    if (rename.kind === 'create') {
      if (!next) { closeAll(); return; }
      setBusy(true); setError('');
      try {
        await onCreate(rename.target, next);
        closeAll();
      } catch (e) {
        setBusy(false);
 setError(e?.message || 'Could not create the subfolder, try again.');
      }
      return;
    }
    if (!next || next === rename.target.name) { closeAll(); return; }
    setBusy(true); setError('');
    try {
      await onRename(rename.target, next);
      closeAll();
    } catch (e) {
      setBusy(false);
 setError(e?.message || 'Rename failed, try again.');
    }
  }, [rename, busy, onRename, onCreate, closeAll]);

  const submitMove = useCallback(async (destSlug) => {
    const target = menu?.target;
    if (!target || busy) return;
    setBusy(true); setError('');
    try {
      await onMove(target, destSlug);
      closeAll();
    } catch (e) {
      setBusy(false);
 setError(e?.message || 'Move failed, try again.');
    }
  }, [menu, busy, onMove, closeAll]);

  let overlay = null;
  if (menu || rename) {
    const theme = activeTheme();
    overlay = createPortal(
      <div data-cv6="" data-theme={theme} data-cv6-ctxmenu="">
        {menu && (
          <div style={{ ...S.card, left: menu.x, top: menu.y }} role="menu">
            <div style={S.header}>{menu.target.kind === 'project' ? 'Project' : 'Mission'} · {menu.target.name}</div>
            {mode === 'menu' && (
              <>
                <MenuRow icon={<PencilIcon />} label="Rename" onPick={startRename} disabled={menu.target.canRename === false} />
                {onSettings ? <MenuRow icon={<SettingsIcon />} label="Project settings" onPick={openSettings} /> : null}
                {onCreate && (menu.target.kind === 'project' || menu.target.path) ? (
                  <MenuRow icon={<FolderPlusIcon />} label="New subfolder" onPick={startCreate} />
                ) : null}
                {menu.target.kind === 'mission' && (
                  <MenuRow icon={<MoveIcon />} label="Move to project…" onPick={() => setMode('move')} disabled={!menu.target.canMove} />
                )}
                {onArchive && menu.target.kind === 'project' ? (
                  <MenuRow icon={<ArchiveIcon />} label="Archive project" onPick={startArchive} />
                ) : null}
              </>
            )}
            {mode === 'move' && (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {(listProjects?.() || [])
                  .filter((p) => p.slug && p.slug !== menu.target.projectSlug)
                  .map((p) => (
                    <MenuRow key={p.slug} icon={<FolderIcon />} label={p.name || p.slug} onPick={() => submitMove(p.slug)} disabled={busy} />
                  ))}
              </div>
            )}
            {busy ? <div style={{ ...S.header, textTransform: 'none', letterSpacing: 0 }}>Working…</div> : null}
            {error ? <div style={S.err}>{error}</div> : null}
          </div>
        )}
        {rename && rename.kind === 'archive' && (
          <>
            <div style={S.scrim} onClick={busy ? undefined : closeAll} />
            <div style={S.dialog}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Archive {rename.target.name}?</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
                The project leaves your rooms, tree and pickers. Nothing is deleted —
                its files and chat history stay put, and it can be restored later.
              </div>
              {error ? <div style={S.err}>{error}</div> : null}
              <div style={S.btnRow}>
                <button style={S.btn} onClick={closeAll} disabled={busy}>Cancel</button>
                <button
                  style={{ ...S.btn, ...S.btnPrimary, background: 'var(--warn, #fbbf24)', color: '#1a1408', opacity: busy ? 0.6 : 1 }}
                  onClick={submitArchive}
                  disabled={busy}
                >
                  {busy ? 'Archiving…' : 'Archive project'}
                </button>
              </div>
            </div>
          </>
        )}
        {rename && rename.kind !== 'archive' && (
          <>
            <div style={S.scrim} onClick={busy ? undefined : closeAll} />
            <div style={S.dialog}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {rename.kind === 'create' ? `New subfolder in ${rename.target.name}` : `Rename ${rename.target.kind}`}
              </div>
              <input
                ref={inputRef}
                style={S.input}
                defaultValue={rename.value}
                placeholder={rename.kind === 'create' ? 'Subfolder name' : undefined}
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape' && !busy) closeAll();
                }}
              />
              {error ? <div style={S.err}>{error}</div> : null}
              <div style={S.btnRow}>
                <button style={S.btn} onClick={closeAll} disabled={busy}>Cancel</button>
                <button style={{ ...S.btn, ...S.btnPrimary, opacity: busy ? 0.6 : 1 }} onClick={submitRename} disabled={busy}>
                  {busy ? (rename.kind === 'create' ? 'Creating…' : 'Saving…') : (rename.kind === 'create' ? 'Create' : 'Save')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>,
      document.body,
    );
  }

  return { overlay };
}

// ── shared API calls (used by all three surfaces) ──

export async function renameNode(authFetch, target, newName, worldId) {
  if (target.kind === 'project') {
    const r = await authFetch('/api/dashboard/project-update', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: target.projectSlug, name: newName, client_id: worldId }),
    });
    if (!r?.ok) throw new Error('The project could not be renamed.');
    return;
  }
  const r = await authFetch('/api/dashboard/mission-update', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_slug: target.projectSlug,
      mission_slug: target.missionSlug,
      name: newName,
      path: target.path || null,
      client_id: worldId,
    }),
  });
  if (!r?.ok) throw new Error('The mission could not be renamed.');
}

// Archive = reversible visibility flip, never a delete: projects.is_active
// goes false (+ archived_at stamped) and the endpoint hides the matching
// agent_status room row. Restore: same PATCH with is_active: true.
export async function archiveNode(authFetch, target, worldId) {
  const r = await authFetch('/api/dashboard/project-update', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: target.projectSlug, is_active: false, client_id: worldId }),
  });
  if (!r?.ok) {
    let msg = 'The project could not be archived.';
    try { const j = await r.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
    throw new Error(msg);
  }
}

export async function moveNode(authFetch, target, destProjectSlug, worldId) {
  const r = await authFetch('/api/dashboard/mission-move', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      world: worldId,
      project_slug: target.projectSlug,
      mission_slug: target.missionSlug,
      new_project_slug: destProjectSlug,
      source_path: target.path || null,
    }),
  });
  if (!r?.ok) {
    let msg = 'The mission could not be moved.';
    try { const j = await r.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
    throw new Error(msg);
  }
}

// "New subfolder" = scaffold a real nested mission home on disk under the
// right-clicked project or mission. Slug derives from the typed name; the
// typed name becomes the display name.
export function slugifyName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+$/g, '')
    .slice(0, 50);
}

// Disk home of the parent the new subfolder goes under. Projects live at
// corner/users/<world>/projects/<slug>; the platform project 'corner' is the
// repo's corner/ root (its missions live at corner/missions/). Missions use
// their registry path.
export function parentPathFor(target, worldId) {
  if (target.kind === 'mission') return target.path || null;
  if (target.projectSlug === 'corner') return 'corner';
  return `corner/users/${worldId}/projects/${target.projectSlug}`;
}

export async function createNode(authFetch, target, name, worldId) {
  const slug = slugifyName(name);
  if (!slug) throw new Error('Give the subfolder a name with at least one letter.');
  const parent = parentPathFor(target, worldId);
  if (!parent) throw new Error('This item has no folder to create inside yet.');
  const r = await authFetch('/api/dashboard/mission-create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ world: worldId, parent_path: parent, slug, name }),
  });
  if (!r?.ok) {
    let msg = 'The subfolder could not be created.';
    try { const j = await r.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
    throw new Error(msg);
  }
}

// Walk a missions-tree `tree` (registry nodes with children) and find the node
// whose full colon slug OR leaf folder matches. Returns { node, parent } or null.
export function findMissionNode(tree, fullSlug, leafSlug) {
  const stack = (tree || []).map((n) => ({ node: n, parent: null }));
  while (stack.length) {
    const { node, parent } = stack.pop();
    const slug = String(node.slug || '');
    if (slug === fullSlug || node.raw_slug === fullSlug || (leafSlug && (node.folder_name === leafSlug || slug === leafSlug || slug.endsWith(':' + leafSlug)))) {
      return { node, parent };
    }
    for (const c of node.children || []) stack.push({ node: c, parent: node });
  }
  return null;
}