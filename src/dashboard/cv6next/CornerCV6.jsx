// CornerCV6 — the fresh CV6 surface. /dashboard renders THIS now (B: fresh start).
// Every visible screen is a Claude Design fill-in template, mounted through the engine
// and fed real data. Nothing is hand-drawn; nothing is faked. Screens fill in as
// Claude Design labels them. CV4 stays reachable at ?cv4=1 as the fallback.
//
// Live screens: Home (desktop 3-column + mobile), the front door — real rooms, real
// agents, the real needs-you Catch Up. Support inbox reachable from the nav.

import { useMemo, useState, useEffect, useCallback, useRef, Component } from 'react';
import './cv6.css';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { GoalThreadBody, SendCtx } from './ChatGoalThread.jsx';
import Review from './Review.jsx';
import ReviewDesktop from './ReviewDesktop.jsx';
import ChatLifecycle from './ChatLifecycle.jsx';
import ChatDesktop from './ChatDesktop.jsx';
import SupportDesktop from './SupportDesktop.jsx';
import Organize from './Organize.jsx';
import Settings from './Settings.jsx';
import Onboarding from './Onboarding.jsx';
import Search from './Search.jsx';
import { MobileNav, DesktopNav } from './SharedNav.jsx';
import { useHome, useProjectMissions, shapeProjectState, createMissionInProject, useChatList } from './data/useHomeData.js';
import { useSupportInbox } from './data/useSupportInbox.js';
import { useRoomThread, useGoalThread } from './data/useRoomThread.js';
import { useWorldId, useCommand, useTrackerBugs } from './data/useCommandTracker.js';
import { useDemoBlocksFeed } from './data/useDemoBlocks.js';
import homeDesktopRaw from './templates/home-desktop.html?raw';
import homeMobileRaw from './templates/home-mobile.html?raw';
import inboxRaw from './templates/support-inbox.html?raw';
import chatRaw from './templates/chat.html?raw';
import kitRaw from './templates/kit.html?raw';
import commandRaw from './templates/command.html?raw';
import trackerRaw from './templates/tracker.html?raw';
import chatListRaw from './templates/chat-list.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// ── viewport: desktop layout at >=900px, the phone layout below ──
function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 900px)').matches : true);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(min-width: 900px)');
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

// Take a raw handoff file, lift its [data-cv6] screen node, normalise the specimen
// sizing so the screen fills the surface (the design's .cv6-screen class already
// declares width/height:100%), and append the shared loading/error/empty blocks so
// data-state switching covers every state from one mounted tree. NOT a design change:
// the layout inside is untouched; only the specimen frame's fixed px box is dropped.
// The live view machine only routes these nav targets today. The design chrome (the
// desktop top bar + rails) hardcodes the full 8-tool set, so any tile pointing at a
// tool we haven't wired to /dashboard yet would be a dead control ("doesn't open").
// Until those screens are built live, drop those tiles so the nav only shows what works.
const LIVE_NAV = new Set(['home', 'chat', 'support', 'organize', 'command', 'tracker', 'onboarding', 'back']);

function composeScreen(raw, { mobile = false, pick = 0, sharedNav = false } = {}) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const nodes = doc.querySelectorAll('[data-cv6]');
  const screen = nodes[pick] || nodes[0];
  if (!screen) return '';
  // Strip nav tiles that point at not-yet-built tools (no dead ends).
  screen.querySelectorAll('[data-action="nav"][data-target]').forEach((tile) => {
    if (!LIVE_NAV.has(tile.getAttribute('data-target'))) tile.remove();
  });
  // One shared nav (design item 7): the desktop top bar is now mounted once in the
  // shell, so strip this screen's baked-in .topbar to avoid a double bar.
  if (sharedNav && !mobile) screen.querySelector('.topbar')?.remove();
  screen.setAttribute('style', mobile
    ? 'position:relative;width:100%;height:100%;background:#05080b;overflow:hidden'
    : 'width:100%;height:100%');
  // append shared states next to this screen's ready region
  const ready = screen.querySelector('[data-state="ready"]');
  const host = ready?.parentNode || screen;
  // The design body is overflow:hidden (fine for a fixed mockup, wrong for the live app
  // with many rooms). On mobile make the scroll body actually scroll, and pad the bottom
  // so the last row clears the home indicator. Desktop columns scroll on their own.
  if (mobile && ready) {
    const base = ready.getAttribute('style') || '';
    ready.setAttribute('style', `${base};overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:max(20px, env(safe-area-inset-bottom, 0px))`);
  }
  if (ready) {
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => {
      host.appendChild(b.cloneNode(true));
    });
  }
  return screen.outerHTML;
}

// Compose the real-conversation Chat (mobile): the chat tool's chrome (header +
// composer) with the thread body replaced by the agent-chat kit's real message
// element (data-each="messages"). The design's sample thread is the structured
// Goal Thread (live steps, decision cards, data tables) — that needs the agent to
// emit structured blocks, which it doesn't yet, so we honestly show the room's real
// messages instead of faking that thread. The per-message live-status pill is dropped
// (it means a live agent, not a past message).
// The Goal Thread (step thread): the wired thread-title + progress bar + the goal.checklist
// rendered with the design's own classes (.thread-title/.gchk/.gchk-mark, width:goal.pct,
// is-:item.state). Bound to REAL per-room step state; the step's state drives its look, no timer.
const GOAL_THREAD_HTML = `
<div class="cv6-goalthread" data-state="ready" style="border:1px solid var(--hair);background:var(--surface);border-radius:14px;padding:13px 14px;margin-bottom:14px;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px;">
    <span class="thread-title" style="font-size:14.5px;"><span style="color:var(--muted);font-weight:600;">Goal:</span> <span data-bind="goal.title">Current goal</span></span>
    <span class="mono" style="margin-left:auto;font-size:11px;color:var(--muted);"><span data-bind="goal.doneCount">0</span>/<span data-bind="goal.total">0</span></span>
  </div>
  <div style="height:6px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin-bottom:13px;"><div style="height:100%;border-radius:4px;background:linear-gradient(90deg,var(--accent),#6366F1);" data-mod="width:goal.pct"></div></div>
  <div style="display:flex;flex-direction:column;gap:10px;">
    <div class="gchk is-pending" style="display:flex;align-items:center;gap:10px;" data-each="goal.checklist" data-mod="is-:item.state"><span class="gchk-mark"></span><span class="gchk-label" style="flex:1;font-size:13px;" data-bind="item.label">Step</span></div>
  </div>
</div>`;
function composeChatMobile(withGoal) {
  const doc = new DOMParser().parseFromString(chatRaw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6]')].find((n) => n.getAttribute('data-screen') === 'chat-mobile');
  if (!screen) return '';
  screen.setAttribute('style', 'position:relative;width:100%;height:100%;background:#05080b;overflow:hidden');
  const body = screen.querySelector('.scrbody');
  const kitDoc = new DOMParser().parseFromString(kitRaw, 'text/html');
  const turn = kitDoc.querySelector('.turn[data-each="messages"]');
  if (body && turn) {
    const t = turn.cloneNode(true);
    t.querySelector('.astat')?.remove();
    body.innerHTML = '';
    body.setAttribute('style', `${body.getAttribute('style') || ''};overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:max(20px, env(safe-area-inset-bottom, 0px))`);
    if (withGoal) body.insertAdjacentHTML('beforeend', GOAL_THREAD_HTML);
    body.appendChild(t);
  }
  // append shared loading/error/empty states for the thread
  if (body) {
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => screen.appendChild(b.cloneNode(true)));
  }
  return screen.outerHTML;
}

// ── Home (desktop + mobile share one data shape + one set of actions) ──
const HOME_ALIASES = {
  agents: 'room', projects: 'room',
  'catchUp.rest': 'card',
  'catchUp.current.actionItems': 'actionItem',
  'catchUp.current.attachments': 'attachment',
  'goal.summary': 'summary', 'goal.checklist': 'step',
  missions: 'mission',
  assignableAgents: 'agentPick',
  'catchUp.items': 'item',
};

function Home({ onNav, onOpenRoom, onOpenNav }) {
  const isDesktop = useIsDesktop();
  const { state, data, worldId } = useHome();
  const [missionReload, setMissionReload] = useState(0);
  const missionsByProject = useProjectMissions(worldId, missionReload);
  // Mobile "project opened" state (Home state B): tap a project -> its missions.
  const [openedProjectId, setOpenedProjectId] = useState(null);
  const openedProject = openedProjectId ? (data.projects || []).find((p) => p.id === openedProjectId) : null;
  // New-mission form (Home state C). Seeded on open so it stays stable + uncontrolled.
  const [missionSeed, setMissionSeed] = useState(null);
  const missionFormRef = useRef(null);
  const missionAgentRef = useRef('');
  // Catch Up full deck (Home state D): cycle the real needs-you cards.
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [catchUpIndex, setCatchUpIndex] = useState(0);
  // Agents accordion (top of Home): one "Agents" row that expands its roster in place,
  // default collapsed so the front door stays calm. (Decided 2026-06-23.)
  const [agentsOpen, setAgentsOpen] = useState(false);
  // All Rooms is built for hundreds: show a first page of projects with a real
  // "Show N more" that expands the rest in place (default collapsed = calm front door).
  const [projShowAll, setProjShowAll] = useState(false);
  const catchUpHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 5 }), []);

  const homeHtml = useMemo(
    () => (isDesktop
      ? composeScreen(homeDesktopRaw, { mobile: false, pick: 0, sharedNav: true })
      : composeScreen(homeMobileRaw, { mobile: true, pick: 0 })),
    [isDesktop],
  );
  const projectHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 1 }), []);
  const missionHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 2 }), []);

  const openNewMission = () => {
    if (!openedProject) return;
    missionAgentRef.current = '';
    setMissionSeed({
      project: { id: openedProject.slug, name: openedProject.name, slug: openedProject.slug },
      draftMission: { title: '', goal: '' },
      assignableAgents: (data.agents || []).map((a) => ({ id: a.id, name: a.name, status: a.status || 'ready', picked: 'off' })),
    });
  };

  const actions = useMemo(() => ({
    // Back closes the deepest open sub-state first, then defers to the top-level history.
    nav: (target) => {
      if (target === 'back') {
        if (catchUpOpen) { setCatchUpOpen(false); return; }
        if (openedProjectId) { setOpenedProjectId(null); return; }
        onNav?.('back'); return;
      }
      onNav?.(target);
    },
    // Tap an agent -> open its real conversation (Chat). Tap a project on mobile ->
    // its mission list (state B). Project conversation on desktop waits for desktop Chat.
    openRoom: (id) => {
      const agent = (data.agents || []).find((a) => a.id === id);
      if (agent) { onOpenRoom?.(agent, worldId); return; }
      const proj = (data.projects || []).find((p) => p.id === id);
      if (proj && !isDesktop) setOpenedProjectId(id);
    },
    toggleAgents: () => setAgentsOpen((o) => !o),
    openCatchUp: () => { setCatchUpIndex(0); setCatchUpOpen(true); },
    nextCatchUp: () => setCatchUpIndex((i) => Math.min(i + 1, Math.max(0, (data.catchUp?.all?.length || 1) - 1))),
    prevCatchUp: () => setCatchUpIndex((i) => Math.max(0, i - 1)),
    snoozeCatchUp: () => setCatchUpIndex((i) => Math.min(i + 1, Math.max(0, (data.catchUp?.all?.length || 1) - 1))),
    snoozeAll: () => setCatchUpOpen(false),
    openCommandK: () => {}, search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    openNotifications: () => {}, openProfile: () => {}, toggleTheme: () => {},
    newRoom: () => {}, showMoreProjects: () => setProjShowAll(true),
    // draftReply (approve-and-send) sends real client email + needs an agent-drafted body;
    // held until that path + an explicit OK exist (see mission BUILD). Not faked.
    draftReply: () => {}, addToTracker: () => {}, assignAgent: () => {}, snooze: () => {},
    review: () => {}, openAttachment: () => {},
    voiceInput: () => {}, composeMessage: () => {}, sendMessage: () => {},
    // Open the project's own conversation (the general chat above the mission list).
    openProjectChat: (id) => {
      const proj = (data.projects || []).find((p) => p.id === id) || openedProject;
      if (!proj) return;
      onOpenRoom?.({ id: proj.slug || proj.id, name: proj.name, initials: (proj.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: proj.status || 'ready', statusText: 'project chat' }, worldId);
    },
    // Open a mission's own conversation. Messages tag mission_slug in
    // "<project>:<mission>" form (e.g. space-rising:deal-bank), so the room must
    // query that prefixed key, not the bare folder slug, or it reads empty.
    openMission: (id) => {
      const proj = openedProject; if (!proj) return;
      const slug = String(id || '').replace(/^\//, '');
      const list = missionsByProject[proj.slug] || [];
      const m = list.find((x) => x.slug === slug);
      const name = m?.name || slug;
      const missionSlug = slug.includes(':') ? slug : `${proj.slug}:${slug}`;
      onOpenRoom?.({ id: slug, name, initials: (name || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug, projectSlug: proj.slug, status: m?.status || 'ready', statusText: proj.name }, worldId);
    },
    newMission: () => openNewMission(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenRoom, onOpenNav, data.projects, data.agents, data.catchUp, worldId, isDesktop, openedProject, catchUpOpen, openedProjectId, missionsByProject]);

  const missionActions = useMemo(() => ({
    nav: () => setMissionSeed(null),
    setMissionAgent: (id, e) => {
      const row = e?.currentTarget;
      const already = missionAgentRef.current && missionAgentRef.current === String(id);
      missionAgentRef.current = already ? '' : String(id);
      missionFormRef.current?.querySelectorAll('.pickrow').forEach((r) => r.classList.toggle('is-on', !already && r === row));
    },
    createMission: () => {
      const root = missionFormRef.current;
      const title = root?.querySelector('[data-bind="draftMission.title"]')?.value?.trim() || '';
      const goal = root?.querySelector('[data-bind="draftMission.goal"]')?.value?.trim() || '';
      if (!title || !openedProject) return; // a mission needs a title
      const picked = (missionSeed?.assignableAgents || []).find((a) => String(a.id) === missionAgentRef.current);
      createMissionInProject({ worldId, projectSlug: openedProject.slug, title, goal, agentName: picked?.name || '' });
      setMissionSeed(null);
      setMissionReload((k) => k + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [worldId, openedProject, missionSeed]);

  if (catchUpOpen) {
    const allCards = data.catchUp?.all || [];
    const cuIdx = Math.min(catchUpIndex, Math.max(0, allCards.length - 1));
    const catchUpData = {
      catchUp: {
        count: allCards.length,
        position: allCards.length ? cuIdx + 1 : 0,
        current: allCards[cuIdx] || { id: '', kind: 'agent', kindLabel: 'AGENT', from: '', subject: '', summary: '', actionItems: [], attachments: [] },
        items: allCards.map((c, i) => ({ ...c, deckState: i === cuIdx ? 'current' : (i < cuIdx ? 'prev' : 'next') })),
      },
    };
    return <TemplateScreen html={catchUpHtml} data={catchUpData} actions={actions} state="ready"
      aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />;
  }
  if (missionSeed) {
    return (
      <div ref={missionFormRef} style={{ width: '100%', height: '100%' }}>
        <TemplateScreen html={missionHtml} data={missionSeed} actions={missionActions} state="ready"
          aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }
  if (openedProject) {
    const pdata = shapeProjectState(openedProject, missionsByProject[openedProject.slug]);
    return <TemplateScreen html={projectHtml} data={pdata} actions={actions} state="ready"
      aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />;
  }
  // Agents accordion: the roster collapses (rows hidden) but the count + caret stay. The
  // header binds agentsTotal (always the full count) and agentsOpen drives the caret rotate.
  const agentsTotal = (data.agents && data.agents.length) || 0;
  // Projects: first PROJ_LIMIT by default, the rest behind a real "Show N more".
  const PROJ_LIMIT = 8;
  const allProjects = data.projects || [];
  const projShown = projShowAll ? allProjects.slice() : allProjects.slice(0, PROJ_LIMIT);
  // arrays carry their bound scalars as props (the engine reads projects.count /
  // projects.moreCount / projects.moreState); set them on the sliced array we pass
  // through. count = the TRUE total (header "Projects · N"), independent of how many
  // rows are shown; moreCount = how many are still hidden.
  projShown.count = allProjects.length;
  projShown.moreCount = projShowAll ? 0 : Math.max(0, allProjects.length - PROJ_LIMIT);
  projShown.moreState = projShown.moreCount > 0 ? 'has' : 'none';
  const homeData = {
    ...data,
    agents: agentsOpen ? data.agents : [],
    agentsTotal,
    agentsOpen: agentsOpen ? 'open' : 'closed',
    projects: projShown,
  };
  return <TemplateScreen html={homeHtml} data={homeData} actions={actions} state={state}
    aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Chat list (mobile): the conversations list the Chat menu opens to ──
const CHATLIST_ALIASES = { agents: 'agent', projects: 'project' };
function ChatList({ onNav, onOpenRoom, onOpenNav, onCommandK }) {
  const { state, data, worldId } = useChatList();
  const html = useMemo(() => composeScreen(chatListRaw, { mobile: true, pick: 0 }), []);
  // Real client-side filter for the header chips (All / Agents / Projects / Needs you).
  const [filter, setFilter] = useState('all');
  const allAgents = data.agents || [];
  const allProjects = data.projects || [];
  const hasNeeds = (x) => Number(x?.needsCount) > 0;
  const view = useMemo(() => {
    let agents = allAgents, projects = allProjects;
    if (filter === 'agents') projects = [];
    else if (filter === 'projects') agents = [];
    else if (filter === 'needs') { agents = allAgents.filter(hasNeeds); projects = allProjects.filter(hasNeeds); }
    // arrays carry a .count the template binds for the section eyebrow (shown count).
    const ag = agents.slice(); ag.count = agents.length;
    const pr = projects.slice(); pr.count = projects.length;
    const needsTotal = allAgents.filter(hasNeeds).length + allProjects.filter(hasNeeds).length;
    return {
      ...data,
      agents: ag,
      projects: pr,
      secVis: { agents: ag.length ? 'shown' : 'hidden', projects: pr.length ? 'shown' : 'hidden' },
      chips: {
        all: filter === 'all' ? 'on' : 'off',
        agents: filter === 'agents' ? 'on' : 'off',
        projects: filter === 'projects' ? 'on' : 'off',
        needs: filter === 'needs' ? 'on' : 'off',
      },
      counts: {
        ...(data.counts || {}),
        all: allAgents.length + allProjects.length,
        agentsTotal: allAgents.length,
        projectsTotal: allProjects.length,
        needsYou: needsTotal,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter]);
  const actions = useMemo(() => ({
    nav: (t) => onNav(t === 'back' ? 'home' : t),
    search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    setFilter: (f) => setFilter(f || 'all'),
    // "New goal" from the list level: open the command palette (the room picker)
    // so you choose where to start — an honest jump to a real surface, not a faked
    // new-goal backend. Falls back to opening the nav if no palette is wired.
    newGoal: () => (onCommandK ? onCommandK() : onOpenNav?.()),
    openRoom: (id) => {
      const agent = allAgents.find((a) => String(a.id) === String(id));
      if (agent) { onOpenRoom?.(agent, worldId); return; }
      const proj = allProjects.find((p) => String(p.id) === String(id));
      if (proj) onOpenRoom?.({ id: proj.id, name: proj.name, isProject: true }, worldId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenNav, onOpenRoom, onCommandK, allAgents, allProjects, worldId]);
  return <TemplateScreen html={html} data={view} actions={actions} state={state}
    aliases={CHATLIST_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Support inbox (the proven pilot), reachable from the nav ──
const SUPPORT_ALIASES = { needsYou: 'email', watching: 'email', 'email.tags': 'tag' };

function SupportInbox({ onNav, onOpenNav }) {
  const { state, data, reload } = useSupportInbox('aom');
  const html = useMemo(() => composeScreen(inboxRaw, { mobile: true }), []);
  // Header filter chips: All (default, both sections) / Needs you / Watching — real filter
  // of the inbox sections. (Drafts chip held: no drafts inbox source yet.)
  const [filter, setFilter] = useState('all');
  const view = useMemo(() => {
    const needsYou = filter === 'watching' ? [] : (data.needsYou || []);
    const watching = filter === 'needs' ? [] : (data.watching || []);
    return {
      ...data,
      needsYou,
      watching,
      secVis: {
        needs: needsYou.length ? 'shown' : 'hidden',
        watching: watching.length ? 'shown' : 'hidden',
      },
      chips: {
        all: filter === 'all' ? 'on' : 'off',
        needs: filter === 'needs' ? 'on' : 'off',
        watching: filter === 'watching' ? 'on' : 'off',
      },
    };
  }, [data, filter]);
  const actions = useMemo(() => ({
    openThread: () => {}, search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    nav: (t) => onNav?.(t), browseWatching: () => setFilter('watching'), emptyAction: () => {},
    setFilter: (f) => setFilter(f || 'all'),
    retry: () => reload(), viewOffline: () => {},
  }), [onNav, onOpenNav, reload]);
  return <TemplateScreen html={html} data={view} actions={actions} state={state}
    aliases={SUPPORT_ALIASES} style={{ width: 'min(420px, 100%)', height: '100%', margin: '0 auto' }} />;
}

// ── Chat: a room's real conversation (mobile). When the agent emits structured blocks
// (the live Goal Thread: steps, decision cards, data tables) we render the rich thread
// from that real output. Otherwise we show the real messages honestly. ──
const CHAT_ALIASES = { 'goal.checklist': 'item' };
function Chat({ room, worldId, onNav, onOpenNav }) {
  // Demo mode: check for ?demo=blocks query param
  const demoFeed = useDemoBlocksFeed();
  const isDemo = !!demoFeed;

  // If demo mode, use demo feed; otherwise use real thread
  const messages = isDemo ? demoFeed : useRoomThread(worldId, room).messages;
  const { status, send } = isDemo ? { status: 'ready', send: () => {} } : useRoomThread(worldId, room);
  const goal = isDemo ? null : useGoalThread(worldId, room);
  const hasGoal = !!goal;
  const liveThread = Array.isArray(messages) && messages.some((m) => m.blocks?.length > 0);
  const html = useMemo(() => composeChatMobile(hasGoal), [hasGoal]);
  const data = useMemo(() => ({
    room: { name: isDemo ? 'DEMO: Block Showcase' : room.name, initials: room.initials || '·', statusText: isDemo ? 'demo' : room.statusText || '', count: '' },
    messages,
    goal: goal || { title: '', step: '', doneCount: '', total: '', pct: 0, checklist: [] },
    user: { initials: 'PM' },
    loading: { label: `Opening ${room.name}…` },
    empty: { title: `No messages with ${room.name} yet`, body: 'Start the conversation below.', actionLabel: '' },
    error: { title: "Couldn't load this conversation", body: 'Your connection dropped. Nothing was lost.', code: 'chat · retry' },
  }), [isDemo, room, messages, goal]);
  const actions = useMemo(() => ({
    nav: (t) => onNav(t === 'back' ? 'home' : t),
    search: () => onOpenNav?.(), openNav: () => onOpenNav?.(), openProfile: () => {}, openCommandK: () => {},
    voiceInput: () => {}, composeMessage: () => {}, sendMessage: () => {},
    chooseOption: () => {}, openAgentMenu: () => {}, pauseAgent: () => {}, retaskAgent: () => {},
    approvePlan: () => {}, handoffAgent: () => {}, addContext: () => {}, addAttachment: () => {},
    openAttachment: () => {}, review: () => {}, setDataView: () => {}, toggleFollow: () => {}, retry: () => {},
  }), [onNav, onOpenNav]);
  // One conversation surface. When the agent emits a structured Goal Thread it renders
  // INLINE as that agent turn (the live step thread, steps ticking) with the real
  // message history scrollable above it -- never a separate screen that replaces the
  // conversation. Plain replies render as plain turns. So you always keep your history,
  // and the goal thread is just the latest turn (design: the visual chat language).
  return (
    <ChatLifecycle
      room={{ name: isDemo ? 'DEMO: Block Showcase' : room.name, initials: room.initials || '·', statusText: isDemo ? 'demo' : room.statusText || '', status: room.status || 'ready' }}
      messages={messages} status={status} goal={liveThread ? goal : null}
      onBack={() => onNav('back')} onOpenNav={() => onOpenNav?.()} onSend={(t) => send?.(t)}
      onOpenReview={() => onNav('review')}
    />
  );
}

// ── Command (mobile): real activity dock (running jobs); goal ledger honest ──
const COMMAND_ALIASES = {
  'activity.jobs': 'job', 'goal.checklist': 'step',
  'ledger.others': 'room', 'ledger.rooms': 'room', watchers: 'watcher',
};
function Command({ worldId, onNav, onOpenNav }) {
  const { state, data } = useCommand(worldId);
  const isDesktop = useIsDesktop();
  const html = useMemo(() => composeScreen(commandRaw, { mobile: !isDesktop, pick: isDesktop ? 0 : 1, sharedNav: isDesktop }), [isDesktop]);
  const actions = useMemo(() => ({
    nav: (t) => onNav(t === 'back' ? 'home' : t), search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    openCommandK: () => onOpenNav?.(), openProfile: () => onOpenNav?.(),
    // ledger rooms open their conversation is desktop-Chat work; goal/job/watcher mutations have
    // no honest store yet -> inert (not faked). The dock + ledger render real data.
    openGoal: () => {}, openJob: () => {}, toggleWatcher: () => {}, addWatcher: () => {},
    manageActivity: () => {}, retaskGoal: () => {},
  }), [onNav, onOpenNav]);
  return <TemplateScreen html={html} data={data} actions={actions} state={state}
    aliases={COMMAND_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Tracker (mobile): the real CV6 bug list ──
const TRACKER_ALIASES = {
  bugs: 'bug', 'bug.checklist': 'item', 'agent.checklist': 'item',
  attachments: 'attachment', 'featuredBug.attachments': 'attachment',
  projectTrackers: 'tracker', missionTrackers: 'tracker',
  assignableAgents: 'agent',
};
function Tracker({ worldId, onNav, onOpenNav }) {
  const { state, data, switchTracker, createTracker, createBug, canCreate } = useTrackerBugs(worldId);
  const isDesktop = useIsDesktop();
  // sheet: null | 'switch' | 'new' (create-tracker) | 'detail' (bug preview) | 'newbug' (new-issue)
  const [sheet, setSheet] = useState(null);
  const [selectedBug, setSelectedBug] = useState(null);
  const [bugFormSeed, setBugFormSeed] = useState(null);
  const newFormRef = useRef(null);
  const bugFormRef = useRef(null);
  const draftKindRef = useRef('project'); // the new-tracker form is uncontrolled
  const bugPriorityRef = useRef('high');  // the new-issue form is uncontrolled
  const bugAssigneeRef = useRef('');

  const desktopHtml = useMemo(() => composeScreen(trackerRaw, { mobile: false, pick: 0, sharedNav: true }), []);
  const listHtml = useMemo(() => composeScreen(trackerRaw, { mobile: true, pick: 1 }), []);
  const switchHtml = useMemo(() => composeScreen(trackerRaw, { mobile: true, pick: 2 }), []);
  const newHtml = useMemo(() => composeScreen(trackerRaw, { mobile: true, pick: 3 }), []);
  const detailHtml = useMemo(() => composeScreen(trackerRaw, { mobile: true, pick: 4 }), []);
  const newBugHtml = useMemo(() => composeScreen(trackerRaw, { mobile: true, pick: 6 }), []);
  // Detail (bug preview) gets just the opened bug + its tracker; attachments are honestly empty.
  const detailData = useMemo(() => {
    // attachments: an array carrying .count (design binds both data-each + .count);
    // a {count,list} object would throw on .forEach in the engine. See useCommandTracker.
    const atts = []; atts.count = 0;
    return {
      bug: selectedBug || { id: '', title: '', statusLabel: '', priorityLabel: '', assignee: '', assigneeInitials: '·', assigneeTint: 'violet', mission: '', opened: '' },
      activeTracker: data.activeTracker,
      attachments: atts,
    };
  }, [selectedBug, data.activeTracker]);
  const openBug = (id) => {
    const bug = (data.bugs || []).find((b) => String(b.id) === String(id));
    if (bug) { setSelectedBug(bug); setSheet('detail'); }
  };
  // Snapshot the form data (real agents + active tracker name) when the "+" opens, so the
  // uncontrolled form stays stable while open and a data tick never wipes what's typed.
  const openNewBug = () => {
    if (!canCreate) return; // read-only board (Space Rising)
    bugPriorityRef.current = 'high'; bugAssigneeRef.current = '';
    setBugFormSeed({
      draftBug: { title: '', description: '', priority: 'high', isHigh: 'on', isMed: 'off', isLow: 'off' },
      assignableAgents: (data.assignableAgents || []).map((a) => ({ ...a, picked: 'off' })),
      activeTracker: data.activeTracker,
    });
    setSheet('newbug');
  };
  // Stable seed for the uncontrolled new-tracker form so a data tick never rebuilds it
  // and wipes what the user typed.
  const newData = useMemo(() => ({ draftTracker: { name: '', scope: '', kind: 'project', isProject: 'on', isMission: 'off' } }), []);

  const openNew = () => { draftKindRef.current = 'project'; setSheet('new'); };

  const listActions = useMemo(() => ({
    nav: (t) => onNav(t === 'back' ? 'home' : t), search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    openSwitcher: () => setSheet('switch'),
    openBug: (id) => openBug(id),
    newBug: () => openNewBug(), assignAgent: () => {}, pauseAgent: () => {},
    openAttachment: () => {}, retry: () => {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenNav, data.bugs, data.assignableAgents, data.activeTracker, canCreate]);

  const detailActions = useMemo(() => ({
    nav: () => setSheet(null),
    // Assign-to-agent is a separate designed action, not yet wired; keep it inert (not faked).
    assignAgent: () => {}, openAttachment: () => {},
  }), []);

  const newBugActions = useMemo(() => ({
    nav: () => setSheet(null),
    // Priority + assignee are toggled directly in the DOM (e.currentTarget) so typed text
    // in the title/description survives — no React re-render of the form.
    setBugPriority: (p, e) => {
      bugPriorityRef.current = p === 'low' ? 'low' : p === 'med' ? 'med' : 'high';
      const root = bugFormRef.current;
      root?.querySelectorAll('.tkseg').forEach((seg) => seg.classList.toggle('is-on', seg === e?.currentTarget));
    },
    setBugAssignee: (id, e) => {
      const row = e?.currentTarget;
      const already = bugAssigneeRef.current && bugAssigneeRef.current === String(id);
      bugAssigneeRef.current = already ? '' : String(id);
      const root = bugFormRef.current;
      root?.querySelectorAll('.trk').forEach((r) => {
        const on = !already && r === row;
        r.classList.toggle('is-on', on);
        r.querySelector('.tkcheck')?.classList.toggle('is-on', on);
      });
    },
    createBug: () => {
      const root = bugFormRef.current;
      const title = root?.querySelector('[data-bind="draftBug.title"]')?.value?.trim() || '';
      const description = root?.querySelector('[data-bind="draftBug.description"]')?.value?.trim() || '';
      if (!title) return; // an issue needs a title
      createBug({ title, description, priority: bugPriorityRef.current, assigneeId: bugAssigneeRef.current });
      setSheet(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [createBug]);

  const switchActions = useMemo(() => ({
    nav: () => setSheet(null), closeSwitcher: () => setSheet(null),
    openTracker: (id) => { switchTracker(id); setSheet(null); },
    newTracker: () => openNew(),
  }), [switchTracker]);

  const newActions = useMemo(() => ({
    nav: () => setSheet('switch'),
    // Toggle the segmented control in the DOM (no React re-render → typed text survives).
    setTrackerKind: (k) => {
      const kind = k === 'mission' ? 'mission' : 'project';
      draftKindRef.current = kind;
      const root = newFormRef.current;
      root?.querySelectorAll('.tkseg').forEach((seg) => {
        const on = seg.getAttribute('data-arg') === kind;
        seg.classList.toggle('is-on', on);
        seg.classList.toggle('is-off', !on);
      });
    },
    createTracker: () => {
      const root = newFormRef.current;
      const name = root?.querySelector('input[data-bind="draftTracker.name"]')?.value?.trim() || '';
      const scope = root?.querySelector('input[data-bind="draftTracker.scope"]')?.value?.trim() || '';
      if (!name) return; // a tracker needs a name
      createTracker({ name, scope, kind: draftKindRef.current });
      setSheet(null);
    },
  }), [switchTracker, createTracker]);

  // Desktop: the real 3-region layout (switcher rail + bug table + bug detail), same data.
  if (isDesktop) {
    const dbug = selectedBug || (data.bugs || [])[0] || { id: '', title: '', statusLabel: '', priorityLabel: '', assignee: '', assigneeInitials: '·', assigneeTint: 'violet', mission: '', opened: '', description: '', doneCount: '', stepCount: '', checklist: [] };
    const ddata = { ...data, bug: dbug };
    const dActions = {
      nav: (t) => onNav(t === 'back' ? 'home' : t), openCommandK: () => {}, openProfile: () => onOpenNav?.(),
      openTracker: (id) => switchTracker(id),
      openBug: (id) => { const b = (data.bugs || []).find((x) => String(x.id) === String(id)); if (b) setSelectedBug(b); },
      newBug: () => openNewBug(),
      // status change + per-bug checklist have no honest store yet -> inert (not faked).
      changeStatus: () => {}, addChecklistItem: () => {}, toggleChecklistItem: () => {},
      openAttachment: () => {}, review: () => {},
    };
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <TemplateScreen html={desktopHtml} data={ddata} actions={dActions} state={state}
          aliases={TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
        {sheet === 'newbug' && bugFormSeed && (
          <div ref={bugFormRef} style={{ position: 'absolute', inset: 0, zIndex: 10, maxWidth: 430, margin: '0 auto' }}>
            <TemplateScreen html={newBugHtml} data={bugFormSeed} actions={newBugActions} state="ready"
              aliases={TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={listHtml} data={data} actions={listActions} state={state}
        aliases={TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
      {sheet === 'switch' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <TemplateScreen html={switchHtml} data={data} actions={switchActions} state="ready"
            aliases={TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {sheet === 'new' && (
        <div ref={newFormRef} style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <TemplateScreen html={newHtml} data={newData} actions={newActions} state="ready"
            aliases={TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {sheet === 'detail' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <TemplateScreen html={detailHtml} data={detailData} actions={detailActions} state="ready"
            aliases={TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {sheet === 'newbug' && bugFormSeed && (
        <div ref={bugFormRef} style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <TemplateScreen html={newBugHtml} data={bugFormSeed} actions={newBugActions} state="ready"
            aliases={TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}

// Mobile tool switcher now lives in SharedNav (MobileNav) -- one tool list, two
// forms. The old hand-rolled NavDrawer was retired here so there is a single nav
// source (design-system-2026-06-23 item 7).

// A screen render error must not blank the whole app — show a recoverable message.
class ScreenBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidUpdate(prev) { if (prev.viewKey !== this.props.viewKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted,#8b95a3)', font: '13px/1.5 system-ui', padding: '0 28px' }}>
          <div style={{ color: 'var(--fg,#fff)', fontSize: 15, marginBottom: 6 }}>This screen hit a snag</div>
          <div>Tap back and try again. Nothing was lost.</div>
          <button onClick={() => this.props.onHome?.()} style={{ marginTop: 14, height: 36, padding: '0 16px', borderRadius: 9, border: '1px solid var(--hair,#222)', background: 'var(--surface-2,#161b24)', color: 'var(--accent,#5b9)', font: '600 13px system-ui' }}>Back to rooms</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Initial view from the URL (?view=command), so each tool is deep-linkable: a refresh
// keeps you on the page, and the screen can be linked/screenshotted directly. 'chat'
// maps to the conversations list. Unknown values fall back to Home.
function initialViewFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get('view');
    if (!v) return 'home';
    if (v === 'chat' || v === 'chatlist') return 'chatlist';
    if (['home', 'support', 'organize', 'command', 'tracker', 'review', 'settings', 'onboarding'].includes(v)) return v;
  } catch { /* no window */ }
  return 'home';
}

// ?demo=blocks — a no-auth preview of the live Goal Thread that renders one of EVERY chat
// element through the REAL renderer (ChatGoalThread / GoalThreadBody), so the whole agent
// chat vocabulary can be verified on one screen without firing into a real conversation.
function demoBlocksRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'blocks'; }
  catch { return false; }
}
const DEMO_GOAL = { title: 'Show every chat element', step: 4, doneCount: 2, total: 11, pct: 18, checklist: [] };
const DEMO_BLOCKS = [
  { type: 'step', stepIndex: 0, title: 'Read the brief and pull the repo', state: 'done', detail: 'Scanned 28 missions and the task runner.' },
  { type: 'step', stepIndex: 1, title: 'Wire the resolver', state: 'done', detail: 'Patched the runner so docs-only projects route again.' },
  { type: 'success', stepIndex: 1, title: 'Resolver fixed', detail: 'Docs-only projects now rescan cleanly. +12 −3.' },
  { type: 'data', stepIndex: 1, title: 'Build log', columns: ['Area', 'Built', 'Verified', 'Open'], rows: [['Home', 6, 6, 0], ['Tracker', 4, 3, 1], ['Support', 5, 5, 0]], totals: ['Total', 15, 14, 1] },
  { type: 'step', stepIndex: 2, title: 'Confirm the print framing', state: 'active', detail: 'Two ways to frame it, your call.' },
  { type: 'choice', stepIndex: 2, prompt: 'Two ways to frame the print', choices: [{ id: 'a', title: 'Full bleed', label: 'Recommended', style: 'rec' }, { id: 'b', title: 'Bordered', label: 'Alternative', style: 'alt' }] },
  { type: 'question', stepIndex: 2, text: 'Expand the pilot to which teams?', options: [{ id: 'cs', label: 'CS' }, { id: 'ops', label: 'Ops' }, { id: 'both', label: 'Both' }] },
  { type: 'step', stepIndex: 3, title: 'Read the Acme email', state: 'active', detail: 'Dana replied. Real, revenue-impacting, time-sensitive.' },
  { type: 'email', stepIndex: 3, from: 'Dana Whitfield', org: 'Acme', subject: 'Re: Q2 partnership scope', quote: '“Great results so far, could you get me revised pricing before Friday? We\'re locking budget this week.”', attachments: [{ name: 'current-pricing.pdf', size: '180 KB' }], flagged: 'Flagged: revenue-impacting · time-sensitive', actions: ['Draft a reply', 'Summarize thread', 'Add to Tracker'] },
  { type: 'step', stepIndex: 4, title: 'Summarize the thread', state: 'active', detail: 'Digested 3 messages into the essentials.' },
  { type: 'summary', stepIndex: 4, meta: '3 messages · 2 days', bullets: ['Wants to expand the pilot to three teams (~40 seats)', 'Needs revised pricing by Friday to lock budget', { text: 'Risk: their Q3 start vs. our rollout timeline', warn: true }], actions: [{ text: 'Send revised 3-team pricing by Friday' }, { text: 'Confirm rollout timeline works for Q3' }, { text: 'Pull current pricing sheet', done: true }], chips: ['Draft the reply', 'Add to Tracker'] },
  { type: 'step', stepIndex: 5, title: 'Show the finished Home', state: 'active', detail: 'Sent the screenshot to confirm.' },
  { type: 'artifact', stepIndex: 5, kind: 'screenshot', name: 'home-final.png · 1 comment' },
  { type: 'step', stepIndex: 6, title: 'Flag a snag', state: 'active', detail: 'One thing needs your eyes.' },
  { type: 'snag', stepIndex: 6, title: 'NEEDS A KEY', detail: 'The print service needs an API key before the run can start.' },
  { type: 'step', stepIndex: 7, title: 'Leave a voice + screen recap', state: 'active', detail: 'Audio note and a screen recording.' },
  { type: 'audio', stepIndex: 7, duration: '0:24', transcript: '“Quick update: the resolver patch is in and verified. Starting the regression test now.”' },
  { type: 'video', stepIndex: 7, duration: '1:48', title: 'Onboarding walkthrough' },
  { type: 'step', stepIndex: 8, title: 'Show the resolver patch', state: 'active', detail: 'One function, tucked away unless you want it.' },
  { type: 'code', stepIndex: 8, file: 'resolver.ts', lang: 'ts', added: 12, removed: 3, code: "// route docs-only projects too\nfunction resolveRepoPath(name) {\n  if (name === 'space-rising') {\n    return 'projects/space-rising';\n  }\n  return registry.lookup(name);\n}", explain: 'In plain terms: when a project has only docs, the runner could not find it. This adds a direct path so it routes like any other. Fully reversible.' },
  { type: 'step', stepIndex: 9, title: 'Share the print shots', state: 'active', detail: 'Four framing options to look at.' },
  { type: 'gallery', stepIndex: 9, images: [{}, {}, {}, {}, {}, {}, {}], caption: '7 framing shots' },
  { type: 'step', stepIndex: 10, title: 'Confirm before sending', state: 'active', detail: 'Anything irreversible gets an explicit yes.' },
  { type: 'thinking', stepIndex: 10, label: 'Checking the rollout calendar…' },
  { type: 'replies', stepIndex: 10, prompt: 'Pricing draft is ready. How do you want to send it?', options: [{ label: 'Send as me', primary: true }, 'Schedule for 8am', 'Let me edit first'] },
  { type: 'choiceEcho', stepIndex: 10, title: 'You chose: Send as me', detail: 'Locked in from the options above.' },
  { type: 'confirm', stepIndex: 10, text: 'This will email dana@acme.com on your behalf and add a follow-up to Tracker.', confirmLabel: 'Confirm & send', cancelLabel: 'Cancel', note: 'Anything irreversible gets an explicit confirm; you are always in the loop.' },
  { type: 'step', stepIndex: 11, title: 'Send the pricing reply', state: 'working', detail: 'Composing and sending now.', progress: 65 },
  { type: 'step', stepIndex: 12, title: 'Log the follow-up in Tracker', state: 'queued', detail: 'Starts once the email sends.' },
];

// The demo renders the SHARED GoalThreadBody (the exact renderer mobile + desktop use) in a
// page-scrolling column — no inner chat shell, so the whole thread is one tall page and a
// full-page screenshot captures every element end to end.
function DemoChatBlocks() {
  return (
    <SendCtx.Provider value={() => {}}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 40px' }}>
        <GoalThreadBody goal={DEMO_GOAL} blocks={DEMO_BLOCKS} />
      </div>
    </SendCtx.Provider>
  );
}

export default function CornerCV6() {
  const worldId = useWorldId();
  const isDesktop = useIsDesktop();
  const [view, setView] = useState(initialViewFromUrl); // 'home' | 'chatlist' | 'support' | 'command' | 'tracker'
  const [openedRoom, setOpenedRoom] = useState(null); // { room, worldId } -> Chat
  const [history, setHistory] = useState([]); // nav stack of { view, openedRoom } for Back
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // ⌘K command palette (Search.jsx)

  // ⌘K / Ctrl-K toggles the command palette from anywhere (desktop/keyboard). The
  // nav's search icon opens it too (onOpenCommandK below). Escape closes inside Search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Theme (drop 7): dark | light | glass, persisted. Applied as data-app-theme on the
  // shell root; the cv6.css override blocks re-skin every screen. Default dark = no override.
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cv6-theme') || 'dark'; } catch { return 'dark'; }
  });
  const changeTheme = useCallback((t) => {
    setTheme(t);
    try { localStorage.setItem('cv6-theme', t); } catch { /* private mode */ }
  }, []);

  // Go to a new location, remembering where we were so Back is a real page-undo.
  const goTo = useCallback((nextView, nextRoom = null) => {
    setHistory((h) => [...h, { view, openedRoom }]);
    setView(nextView); setOpenedRoom(nextRoom);
  }, [view, openedRoom]);
  // Back pops to the previous location; if the stack is empty we land on Home.
  const back = useCallback(() => {
    setHistory((h) => {
      if (!h.length) { setView('home'); setOpenedRoom(null); return h; }
      const prev = h[h.length - 1];
      setView(prev.view); setOpenedRoom(prev.openedRoom || null);
      return h.slice(0, -1);
    });
  }, []);
  const onNav = useCallback((target) => {
    if (target === 'back') { back(); return; }
    if (['home', 'support', 'command', 'tracker', 'organize', 'review', 'settings'].includes(target)) goTo(target, null);
    // Chat from the menu opens the conversations list; a row there opens the Goal Thread.
    // "See all" rooms (Home All Rooms header) routes to the same full rooms list (was a
    // dead 'rooms' target that fell through to nothing).
    else if (target === 'chat' || target === 'rooms') goTo('chatlist', null);
  }, [back, goTo]);
  // Opening a room keeps the current view underneath so Back returns to where you tapped from.
  const onOpenRoom = useCallback((room, wid) => goTo(view, { room, worldId: wid || worldId }), [goTo, view, worldId]);
  const onOpenNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const goHome = useCallback(() => { setHistory([]); setOpenedRoom(null); setView('home'); }, []);

  // ?demo=blocks — render the full chat-element preview through the real renderer and stop.
  // (After all hooks above, so hook order stays stable; the flag is constant per load.)
  const demoBlocks = useMemo(() => demoBlocksRequested(), []);
  if (demoBlocks) {
    // Auto-height (no 100dvh cap, no overflow:hidden) so the whole thread is one tall page
    // the browser scrolls — a full-page capture then reaches every element end to end.
    return (
      <div data-cv6 data-theme="dark" style={{ minHeight: '100dvh', background: 'var(--ground, #05080b)' }}>
        <DemoChatBlocks />
      </div>
    );
  }

  let body; let viewKey;
  // Desktop Chat is the real 3-column layout (rooms rail + thread + drawer), with its own
  // room selection. Both the conversations list and an opened room route to it on desktop.
  if (isDesktop && (view === 'chatlist' || openedRoom)) {
    body = <ChatDesktop worldId={worldId}
      initialRoom={openedRoom ? { id: openedRoom.room?.id, name: openedRoom.room?.name, initials: openedRoom.room?.initials, isProject: openedRoom.room?.isProject, status: openedRoom.room?.status, statusText: openedRoom.room?.statusText } : null}
      onNav={onNav} onOpenNav={onOpenNav} />;
    viewKey = `chatdesktop:${openedRoom?.room?.id || 'list'}`;
  }
  else if (openedRoom) { body = <Chat room={openedRoom.room} worldId={openedRoom.worldId} onNav={onNav} onOpenNav={onOpenNav} />; viewKey = `chat:${openedRoom.room?.id}`; }
  else if (view === 'support') { body = isDesktop ? <SupportDesktop onNav={onNav} onOpenNav={onOpenNav} /> : <SupportInbox onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'support'; }
  else if (view === 'organize') { body = <Organize onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'organize'; }
  else if (view === 'settings') { body = <Settings onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'settings'; }
  else if (view === 'onboarding') { body = <Onboarding onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'onboarding'; }
  else if (view === 'command') { body = <Command worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'command'; }
  else if (view === 'tracker') { body = <Tracker worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'tracker'; }
  else if (view === 'review') { body = isDesktop ? <ReviewDesktop worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} /> : <Review worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'review'; }
  else if (view === 'chatlist') { body = <ChatList onNav={onNav} onOpenRoom={onOpenRoom} onOpenNav={onOpenNav} onCommandK={() => setSearchOpen(true)} />; viewKey = 'chatlist'; }
  else { body = <Home onNav={onNav} onOpenRoom={onOpenRoom} onOpenNav={onOpenNav} />; viewKey = 'home'; }

  const current = (openedRoom || view === 'chatlist') ? 'chat' : view;
  return (
    <div data-cv6 data-theme="dark" data-app-theme={theme} style={{
      position: 'relative',
      minHeight: '100dvh', height: '100dvh', background: 'var(--ground, #05080b)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {/* One shared desktop bar (design item 7), mounted once for every desktop
          screen; each screen's baked topbar was stripped so this is the only nav. */}
      {isDesktop && <DesktopNav current={current} onPick={onNav} onOpenCommandK={() => setSearchOpen(true)} theme={theme} onTheme={changeTheme} />}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch' }}>
        <ScreenBoundary viewKey={viewKey} onHome={goHome}>{body}</ScreenBoundary>
      </div>
      <MobileNav open={navOpen} current={current} onPick={onNav} onClose={closeNav} theme={theme} onTheme={changeTheme} />
      {/* ⌘K command palette — jump to any room or mission. Opens its own data. */}
      {searchOpen && (
        <Search
          onClose={() => setSearchOpen(false)}
          onOpenRoom={(room, wid) => { setSearchOpen(false); onOpenRoom(room, wid); }}
        />
      )}
    </div>
  );
}
