// cv6next — Start-a-mission / New-project composer, the ONE creation flow for the
// whole surface. Extracted from CornerCV6.jsx (the All-rooms "New" overlay) so every
// entry point — desktop Home "New", mobile Home "New", Organize's "New project" on
// both breakpoints — opens the exact same overlay and hits the exact same backend
// (createMissionInProject → create-mission-from-drawer, createProjectFromHome →
// create-project-from-chat). Live build of the CV6 design
// deliverables/design-system-2026-06-28/guidelines/pattern-new-mission.html.
//
// One overlay, two modes via data-switch on composer.mode: "Start a mission" (name +
// goal + project + assign + priority + when; name optional, goal-derived when blank)
// and "New project" (name + about). Field picks
// ride the DOM (.is-on) + a ref — no setState — so the uncontrolled text boxes are
// never wiped mid-edit by a re-bind; the project/agent lists are frozen at open so a
// realtime data tick can't rebuild the overlay under the user's thumbs.

import { useEffect, useMemo, useRef, useState } from 'react';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import { createMissionInProject, createProjectFromHome } from './data/useHomeData.js';

// Agents show as TITLES (roles), never persona names — hard doctrine 2026-06-23
// (agentTitles.js: "a name never leaks ANYWHERE"). The Assign-To list shows the role
// title exactly as Home's roster does; a generic fallback only when the title is
// missing so no row is ever blank.
function composerAgentLabel(a) {
  const slug = String(a.id || '');
  const title = String(a.name || '');
  if (!slug || slug === '__auto') return title || 'Auto';
  return title || 'Agent';
}

const NEW_COMPOSER_ALIASES = { 'composer.projects': 'proj', 'composer.agents': 'ag' };
const NEW_COMPOSER_HTML = `
<div data-cv6 data-theme="dark" style="position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
  <style>
    .cmp-card .cmp-field{display:flex;flex-direction:column;gap:8px;}
    .cmp-card .cmp-flab{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
    .cmp-card .cmp-inp{border:1px solid var(--hair);background:var(--surface-2);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--fg);font-family:var(--font-sans);width:100%;box-sizing:border-box;outline:none;}
    .cmp-card textarea.cmp-inp{resize:none;line-height:1.5;}
    .cmp-card .cmp-inp::placeholder{color:var(--faint);}
    .cmp-card .cmp-seg{display:flex;gap:7px;flex-wrap:wrap;}
    .cmp-card .cmp-seg button{height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--hair);background:var(--surface-2);color:var(--muted);font-size:13px;font-weight:600;font-family:var(--font-sans);cursor:pointer;}
    .cmp-card .cmp-seg button.is-on{border-color:transparent;background:var(--accent);color:#fff;}
    .cmp-card .cmp-tab{flex:1;height:38px;border-radius:10px;border:1px solid var(--hair);background:var(--surface-2);color:var(--muted);font-size:13px;font-weight:600;font-family:var(--font-sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;}
    .cmp-card .cmp-tab.is-on{border-color:transparent;background:var(--accent);color:#fff;}
    .cmp-card .cmp-row{display:flex;align-items:center;gap:9px;padding:11px 13px;border:1px solid var(--hair);background:var(--surface-2);border-radius:11px;cursor:pointer;color:var(--fg);font-size:14px;font-weight:600;}
    .cmp-card .cmp-row.is-on{border-color:var(--accent);background:var(--accent-weak);}
    .cmp-card .cmp-row .cmp-chk{margin-left:auto;color:var(--accent);opacity:0;display:flex;}
    .cmp-card .cmp-row.is-on .cmp-chk{opacity:1;}
    .cmp-card .cmp-list{display:flex;flex-direction:column;gap:7px;max-height:168px;overflow-y:auto;}
    .cmp-card .cmp-submit.is-off{opacity:.55;cursor:not-allowed;}
  </style>
  <div data-action="closeComposer" style="position:absolute;inset:0;background:rgba(4,6,9,.62);"></div>
  <div class="cmp-card" style="position:relative;width:100%;max-width:520px;max-height:92%;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;background:var(--ground);box-shadow:0 34px 80px -22px rgba(0,0,0,.62);border:1px solid var(--hair);">
    <div style="display:flex;align-items:center;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--divider);flex:none;">
      <span style="width:40px;height:40px;border-radius:12px;background:var(--accent-weak);display:flex;align-items:center;justify-content:center;flex:none;"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/></svg></span>
      <div style="flex:1;min-width:0;"><div style="font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--fg);" data-bind="composer.title">Start a mission</div><div style="font-size:12px;color:var(--muted);" data-bind="composer.subtitle">A room + an agent, pointed at one goal</div></div>
      <span class="ib" data-action="closeComposer" style="width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></span>
    </div>
    <div style="display:flex;gap:7px;padding:14px 22px 2px;flex:none;">
      <button class="cmp-tab" data-mod="is-:composer.tabMission" data-action="setComposerMode" data-target="mission"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/></svg>Start a mission</button>
      <button class="cmp-tab" data-mod="is-:composer.tabProject" data-action="setComposerMode" data-target="project"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>New project</button>
    </div>
    <div data-switch="composer.mode" style="padding:16px 22px;overflow-y:auto;display:flex;flex-direction:column;gap:18px;">
      <div data-case="mission" style="display:flex;flex-direction:column;gap:18px;">
        <div class="cmp-field">
          <div class="cmp-flab">Mission name <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--faint);">· blank = named from the goal</span></div>
          <input class="cmp-inp" data-bind="draft.missionName" placeholder="e.g. Print framing lock">
        </div>
        <div class="cmp-field">
          <div class="cmp-flab">What should the room get done?</div>
          <textarea class="cmp-inp" data-bind="draft.goal" placeholder="e.g. Lock the print framing before Apr 29" style="min-height:64px;"></textarea>
        </div>
        <div class="cmp-field">
          <div class="cmp-flab">Project</div>
          <div class="cmp-list">
            <div class="cmp-row cmp-projrow" data-each="composer.projects" data-mod="is-:proj.picked" data-action="pickComposerProject" data-arg="proj.slug"><span style="width:20px;height:20px;border-radius:6px;background:var(--accent-weak);display:flex;align-items:center;justify-content:center;flex:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" data-bind="proj.name">Project</span><span class="cmp-chk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></div>
          </div>
        </div>
        <div class="cmp-field">
          <div class="cmp-flab">Assign to</div>
          <div class="cmp-list">
            <div class="cmp-row cmp-agrow" data-each="composer.agents" data-mod="is-:ag.picked" data-action="pickComposerAgent" data-arg="ag.id"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" data-bind="ag.name">Auto</span><span class="cmp-chk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></div>
          </div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div class="cmp-field" style="flex:1;min-width:150px;"><div class="cmp-flab">Priority</div><div class="cmp-seg cmp-pri"><button data-mod="is-:composer.priSel.low" data-action="setComposerPriority" data-target="low">Low</button><button data-mod="is-:composer.priSel.med" data-action="setComposerPriority" data-target="med">Med</button><button data-mod="is-:composer.priSel.high" data-action="setComposerPriority" data-target="high">High</button></div></div>
          <div class="cmp-field" style="flex:1;min-width:150px;"><div class="cmp-flab">When</div><div class="cmp-seg cmp-when"><button data-mod="is-:composer.whenSel.now" data-action="setComposerWhen" data-target="now">Now</button><button data-mod="is-:composer.whenSel.week" data-action="setComposerWhen" data-target="this-week">This week</button></div></div>
        </div>
      </div>
      <div data-case="project" style="display:flex;flex-direction:column;gap:18px;">
        <div class="cmp-field">
          <div class="cmp-flab">Project name</div>
          <input class="cmp-inp" data-bind="draft.name" placeholder="e.g. Space Rising">
        </div>
        <div class="cmp-field">
          <div class="cmp-flab">What's it about? <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--faint);">· gives agents the gist</span></div>
          <textarea class="cmp-inp" data-bind="draft.about" placeholder="A line or two on what this project is for" style="min-height:72px;"></textarea>
        </div>
      </div>
    </div>
    <div style="padding:4px 22px 20px;display:flex;align-items:center;gap:11px;flex:none;border-top:1px solid var(--divider);padding-top:16px;">
      <span class="cmp-hint" style="flex:1;font-size:11.5px;color:var(--faint);line-height:1.4;" data-bind="composer.hint">The more you give it, the better the room starts.</span>
      <span class="cmp-err" role="alert" style="display:none;flex:1;font-size:11.5px;color:#e5484d;line-height:1.4;font-weight:600;"></span>
      <button data-action="closeComposer" style="height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--hair);background:var(--surface-2);color:var(--fg);font-size:14px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">Cancel</button>
      <button class="cmp-submit" data-mod="is-:composer.submitState" data-action="submitComposer" style="height:44px;padding:0 20px;border-radius:12px;border:none;background:var(--accent);color:#fff;font-size:14px;font-weight:600;font-family:var(--font-sans);display:flex;align-items:center;gap:8px;cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg><span data-bind="composer.ctaLabel">Start mission</span></button>
    </div>
  </div>
</div>`;

// Props: worldId, projects [{id?, slug, name}], agents [{id, name}] (may be empty —
// "Auto" is always offered), initialMode 'mission' | 'project', onClose(), and
// onCreated(kind) fired after a successful submit so the host can refetch its lists.
export default function NewComposer({ worldId, projects, agents, initialMode = 'mission', onClose, onCreated }) {
  // Convex is always writable; the old no-workspace read-only gate is gone.
  const localReadOnly = false;
  // Freeze the project/agent lists at open so a realtime data tick can't re-bind the
  // overlay and wipe a half-typed goal (same guarantee the Home inline version gave).
  const [snap] = useState(() => ({
    projects: (projects || []).map((p) => ({ id: p.id ?? p.slug, slug: p.slug || p.id, name: p.name })),
    agents: (agents || []).map((a) => ({ id: a.id, name: composerAgentLabel(a) })),
  }));
  const startMode = initialMode === 'project' ? 'project' : 'mission';
  const [mode, setMode] = useState(startMode);
  const formRef = useRef(null);
  const busyRef = useRef(false); // guards double-submit; drives the button's busy look
  const selRef = useRef({
    mode: startMode,
    projectId: (projects && projects[0] && (projects[0].slug || projects[0].id)) || '',
    agentId: '__auto', agentName: '', priority: 'med', when: 'now',
  });

  // DEF-7: autofocus the first text field each time the composer opens or mode changes.
  // TemplateScreen renders via innerHTML so React autoFocus doesn't reach inside it;
  // do it imperatively after the paint settles.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = formRef.current?.querySelector('.cmp-inp');
      if (el) { try { el.focus(); } catch (_) { /* noop */ } }
    });
    return () => cancelAnimationFrame(id);
  }, [mode]);

  // Field picks (project/agent/priority/when) are written to selRef AND toggled on the
  // DOM directly — no setState — so the uncontrolled goal/name/about boxes are never
  // wiped mid-edit by a re-bind. Only the mode toggle (which swaps the whole field set
  // anyway) goes through React state.
  const actions = useMemo(() => ({
    closeComposer: () => onClose?.(),
    setComposerMode: (m) => {
      const next = m === 'project' ? 'project' : 'mission';
      selRef.current = { ...selRef.current, mode: next };
      setMode(next);
    },
    pickComposerProject: (slug, e) => {
      selRef.current.projectId = slug;
      formRef.current?.querySelectorAll('.cmp-projrow').forEach((r) => r.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    pickComposerAgent: (id, e) => {
      selRef.current.agentId = id;
      const nm = e?.currentTarget?.querySelector('span')?.textContent?.trim() || '';
      selRef.current.agentName = (id === '__auto') ? '' : nm; // Auto = let the room route it
      formRef.current?.querySelectorAll('.cmp-agrow').forEach((r) => r.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    setComposerPriority: (v, e) => {
      selRef.current.priority = v;
      formRef.current?.querySelectorAll('.cmp-pri button').forEach((b) => b.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    setComposerWhen: (v, e) => {
      selRef.current.when = v;
      formRef.current?.querySelectorAll('.cmp-when button').forEach((b) => b.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    // Submit AWAITS the real backend and only closes on a confirmed create. On failure
    // it surfaces an honest inline error and keeps the sheet open with the typed text
    // intact — never close-and-pretend. Errors/busy are written straight to the DOM (no
    // setState) so the uncontrolled goal/name boxes are never wiped mid-flight.
    submitComposer: async () => {
      const root = formRef.current;
      const sel = selRef.current;
      if (busyRef.current) return; // a create is already in flight
      const showErr = (msg) => {
        const e = root?.querySelector('.cmp-err');
        const h = root?.querySelector('.cmp-hint');
        if (e) { e.textContent = msg; e.style.display = 'block'; }
        if (h) h.style.display = 'none';
      };
      const clearErr = () => {
        const e = root?.querySelector('.cmp-err');
        if (e) { e.textContent = ''; e.style.display = 'none'; }
      };
      const setBusy = (on) => {
        busyRef.current = on;
        const btn = root?.querySelector('[data-action="submitComposer"]');
        if (btn) { btn.style.opacity = on ? '.6' : ''; btn.style.pointerEvents = on ? 'none' : ''; }
      };
      clearErr();
      if (localReadOnly) {
        showErr('Creation needs a connected workspace. Local mode is read-only.');
        return;
      }

      if (sel.mode === 'project') {
        const name = root?.querySelector('[data-bind="draft.name"]')?.value?.trim() || '';
        const about = root?.querySelector('[data-bind="draft.about"]')?.value?.trim() || '';
        if (!name) { showErr('Give the project a name first.'); return; }
        setBusy(true);
        const res = await createProjectFromHome({ worldId, name, about });
        if (res && res.ok) { onClose?.(); onCreated?.('project'); return; }
        setBusy(false);
        showErr('Could not create the project. Please try again.');
        return;
      }

      const goal = root?.querySelector('[data-bind="draft.goal"]')?.value?.trim() || '';
      if (!goal) { showErr('Tell the room what to get done first.'); return; }
      const projectSlug = sel.projectId;
      if (!projectSlug) { showErr('Pick a project for this mission.'); return; }
      // The mission is named by the user when they typed one; the goal-derived title is
      // only the fallback so the fast path (goal only) still works in one field.
      const missionName = root?.querySelector('[data-bind="draft.missionName"]')?.value?.trim() || '';
      const title = (missionName || goal.split('\n')[0]).slice(0, 80);
      const priLabel = { low: 'Low', med: 'Medium', high: 'High' }[sel.priority] || '';
      const whenLabel = { now: 'Now', 'this-week': 'This week' }[sel.when] || '';
      setBusy(true);
      const res = await createMissionInProject({ worldId, projectSlug, title, goal, agentName: sel.agentName || '', priority: priLabel, when: whenLabel });
      if (res && res.ok) { onClose?.(); onCreated?.('mission'); return; }
      setBusy(false);
      showErr('Could not start the mission. Please try again.');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [worldId, onClose, onCreated]);

  // Highlights for the current picks are computed fresh from the ref each render, so a
  // mode toggle restores them.
  const sel = selRef.current;
  const data = {
    composer: {
      mode,
      title: mode === 'project' ? 'New project' : 'Start a mission',
      subtitle: mode === 'project' ? 'A home for related missions & files' : 'A room + an agent, pointed at one goal',
      ctaLabel: localReadOnly ? 'Read-only locally' : (mode === 'project' ? 'Create project' : 'Start mission'),
      hint: localReadOnly ? 'Creation needs a connected workspace. Local mode is read-only.' : 'The more you give it, the better the room starts.',
      submitState: localReadOnly ? 'off' : 'on',
      tabMission: mode === 'mission' ? 'on' : 'off',
      tabProject: mode === 'project' ? 'on' : 'off',
      projects: snap.projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name, picked: (p.slug === sel.projectId) ? 'on' : 'off' })),
      agents: [{ id: '__auto', name: 'Auto', picked: (!sel.agentId || sel.agentId === '__auto') ? 'on' : 'off' }, ...snap.agents.map((a) => ({ id: a.id, name: a.name, picked: (sel.agentId === a.id) ? 'on' : 'off' }))],
      priSel: { low: sel.priority === 'low' ? 'on' : 'off', med: sel.priority === 'med' ? 'on' : 'off', high: sel.priority === 'high' ? 'on' : 'off' },
      whenSel: { now: sel.when === 'now' ? 'on' : 'off', week: sel.when === 'this-week' ? 'on' : 'off' },
    },
  };

  return (
    // DEF-8: Escape closes the composer (keyboard-attached tablet / desktop-width phone).
    // The outer div captures keydown before any input element can swallow it; Escape
    // never conflicts with normal text entry.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={formRef} style={{ position: 'absolute', inset: 0, zIndex: 40 }} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } }}>
      <TemplateScreen html={NEW_COMPOSER_HTML} data={data} actions={actions} state="ready"
        aliases={NEW_COMPOSER_ALIASES} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
