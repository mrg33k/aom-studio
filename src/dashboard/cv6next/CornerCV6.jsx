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
import ChatGoalThread from './ChatGoalThread.jsx';
import ChatLifecycle from './ChatLifecycle.jsx';
import ChatDesktop from './ChatDesktop.jsx';
import SupportDesktop from './SupportDesktop.jsx';
import { MobileNav, DesktopNav } from './SharedNav.jsx';
import { useHome, useProjectMissions, shapeProjectState, createMissionInProject, useChatList } from './data/useHomeData.js';
import { useSupportInbox } from './data/useSupportInbox.js';
import { useRoomThread, useGoalThread } from './data/useRoomThread.js';
import { useWorldId, useCommand, useTrackerBugs } from './data/useCommandTracker.js';
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
const LIVE_NAV = new Set(['home', 'chat', 'support', 'command', 'tracker', 'back']);

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
    openCatchUp: () => { setCatchUpIndex(0); setCatchUpOpen(true); },
    nextCatchUp: () => setCatchUpIndex((i) => Math.min(i + 1, Math.max(0, (data.catchUp?.all?.length || 1) - 1))),
    prevCatchUp: () => setCatchUpIndex((i) => Math.max(0, i - 1)),
    snoozeCatchUp: () => setCatchUpIndex((i) => Math.min(i + 1, Math.max(0, (data.catchUp?.all?.length || 1) - 1))),
    snoozeAll: () => setCatchUpOpen(false),
    openCommandK: () => {}, search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    openNotifications: () => {}, openProfile: () => {}, toggleTheme: () => {},
    newRoom: () => {}, showMoreProjects: () => {},
    // draftReply (approve-and-send) sends real client email + needs an agent-drafted body;
    // held until that path + an explicit OK exist (see mission BUILD). Not faked.
    draftReply: () => {}, addToTracker: () => {}, assignAgent: () => {}, snooze: () => {},
    review: () => {}, openAttachment: () => {},
    voiceInput: () => {}, composeMessage: () => {}, sendMessage: () => {},
    openProjectChat: () => {}, openMission: () => {}, newMission: () => openNewMission(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenRoom, onOpenNav, data.projects, data.agents, data.catchUp, worldId, isDesktop, openedProject, catchUpOpen, openedProjectId]);

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
  return <TemplateScreen html={homeHtml} data={data} actions={actions} state={state}
    aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Chat list (mobile): the conversations list the Chat menu opens to ──
const CHATLIST_ALIASES = { agents: 'agent', projects: 'project' };
function ChatList({ onNav, onOpenRoom, onOpenNav }) {
  const { state, data, worldId } = useChatList();
  const html = useMemo(() => composeScreen(chatListRaw, { mobile: true, pick: 0 }), []);
  const actions = useMemo(() => ({
    nav: (t) => onNav(t === 'back' ? 'home' : t),
    search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    openRoom: (id) => {
      const agent = (data.agents || []).find((a) => String(a.id) === String(id));
      if (agent) { onOpenRoom?.(agent, worldId); return; }
      const proj = (data.projects || []).find((p) => String(p.id) === String(id));
      if (proj) onOpenRoom?.({ id: proj.id, name: proj.name, isProject: true }, worldId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenNav, onOpenRoom, data.agents, data.projects, worldId]);
  return <TemplateScreen html={html} data={data} actions={actions} state={state}
    aliases={CHATLIST_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Support inbox (the proven pilot), reachable from the nav ──
const SUPPORT_ALIASES = { needsYou: 'email', watching: 'email', 'email.tags': 'tag' };

function SupportInbox({ onNav, onOpenNav }) {
  const { state, data, reload } = useSupportInbox('aom');
  const html = useMemo(() => composeScreen(inboxRaw, { mobile: true }), []);
  const actions = useMemo(() => ({
    openThread: () => {}, search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    nav: (t) => onNav?.(t), browseWatching: () => {}, emptyAction: () => {},
    retry: () => reload(), viewOffline: () => {},
  }), [onNav, onOpenNav, reload]);
  return <TemplateScreen html={html} data={data} actions={actions} state={state}
    aliases={SUPPORT_ALIASES} style={{ width: 'min(420px, 100%)', height: '100%', margin: '0 auto' }} />;
}

// ── Chat: a room's real conversation (mobile). When the agent emits structured blocks
// (the live Goal Thread: steps, decision cards, data tables) we render the rich thread
// from that real output. Otherwise we show the real messages honestly. ──
const CHAT_ALIASES = { 'goal.checklist': 'item' };
function Chat({ room, worldId, onNav, onOpenNav }) {
  const { messages, blocks, status, send } = useRoomThread(worldId, room);
  const goal = useGoalThread(worldId, room);
  const hasGoal = !!goal;
  const liveThread = Array.isArray(blocks) && blocks.length > 0;
  const html = useMemo(() => composeChatMobile(hasGoal), [hasGoal]);
  const data = useMemo(() => ({
    room: { name: room.name, initials: room.initials || '·', statusText: room.statusText || '', count: '' },
    messages,
    goal: goal || { title: '', step: '', doneCount: '', total: '', pct: 0, checklist: [] },
    user: { initials: 'PM' },
    loading: { label: `Opening ${room.name}…` },
    empty: { title: `No messages with ${room.name} yet`, body: 'Start the conversation below.', actionLabel: '' },
    error: { title: "Couldn't load this conversation", body: 'Your connection dropped. Nothing was lost.', code: 'chat · retry' },
  }), [room, messages, goal]);
  const actions = useMemo(() => ({
    nav: (t) => onNav(t === 'back' ? 'home' : t),
    search: () => onOpenNav?.(), openNav: () => onOpenNav?.(), openProfile: () => {}, openCommandK: () => {},
    voiceInput: () => {}, composeMessage: () => {}, sendMessage: () => {},
    chooseOption: () => {}, openAgentMenu: () => {}, pauseAgent: () => {}, retaskAgent: () => {},
    approvePlan: () => {}, handoffAgent: () => {}, addContext: () => {}, addAttachment: () => {},
    openAttachment: () => {}, review: () => {}, setDataView: () => {}, toggleFollow: () => {}, retry: () => {},
  }), [onNav, onOpenNav]);
  // Live Goal Thread: the agent is emitting structured blocks for this room -> render
  // the rich step thread from that real output. Else the honest plain-message thread.
  if (liveThread) {
    return (
      <ChatGoalThread
        room={{ name: room.name, initials: room.initials || '·', statusText: room.statusText || '', status: room.status || 'ready' }}
        goal={goal} blocks={blocks}
        onBack={() => onNav('back')} onOpenNav={() => onOpenNav?.()} onSend={(t) => send?.(t)}
      />
    );
  }
  // Plain conversation: the lifecycle renderer -- real messages folded by day so a
  // long room stops being a wall of text (design item 1), with jump-to-latest.
  return (
    <ChatLifecycle
      room={{ name: room.name, initials: room.initials || '·', statusText: room.statusText || '', status: room.status || 'ready' }}
      messages={messages} status={status}
      onBack={() => onNav('back')} onOpenNav={() => onOpenNav?.()} onSend={(t) => send?.(t)}
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
    if (['home', 'support', 'command', 'tracker'].includes(v)) return v;
  } catch { /* no window */ }
  return 'home';
}

export default function CornerCV6() {
  const worldId = useWorldId();
  const isDesktop = useIsDesktop();
  const [view, setView] = useState(initialViewFromUrl); // 'home' | 'chatlist' | 'support' | 'command' | 'tracker'
  const [openedRoom, setOpenedRoom] = useState(null); // { room, worldId } -> Chat
  const [history, setHistory] = useState([]); // nav stack of { view, openedRoom } for Back
  const [navOpen, setNavOpen] = useState(false);

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
    if (['home', 'support', 'command', 'tracker'].includes(target)) goTo(target, null);
    // Chat from the menu opens the conversations list; a row there opens the Goal Thread.
    else if (target === 'chat') goTo('chatlist', null);
  }, [back, goTo]);
  // Opening a room keeps the current view underneath so Back returns to where you tapped from.
  const onOpenRoom = useCallback((room, wid) => goTo(view, { room, worldId: wid || worldId }), [goTo, view, worldId]);
  const onOpenNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const goHome = useCallback(() => { setHistory([]); setOpenedRoom(null); setView('home'); }, []);

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
  else if (view === 'command') { body = <Command worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'command'; }
  else if (view === 'tracker') { body = <Tracker worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'tracker'; }
  else if (view === 'chatlist') { body = <ChatList onNav={onNav} onOpenRoom={onOpenRoom} onOpenNav={onOpenNav} />; viewKey = 'chatlist'; }
  else { body = <Home onNav={onNav} onOpenRoom={onOpenRoom} onOpenNav={onOpenNav} />; viewKey = 'home'; }

  const current = (openedRoom || view === 'chatlist') ? 'chat' : view;
  return (
    <div data-cv6 data-theme="dark" style={{
      minHeight: '100dvh', height: '100dvh', background: 'var(--ground, #05080b)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {/* One shared desktop bar (design item 7), mounted once for every desktop
          screen; each screen's baked topbar was stripped so this is the only nav. */}
      {isDesktop && <DesktopNav current={current} onPick={onNav} />}
      <div key={viewKey} className="cv6-screenswap" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch' }}>
        <ScreenBoundary viewKey={viewKey} onHome={goHome}>{body}</ScreenBoundary>
      </div>
      <MobileNav open={navOpen} current={current} onPick={onNav} onClose={closeNav} />
    </div>
  );
}
