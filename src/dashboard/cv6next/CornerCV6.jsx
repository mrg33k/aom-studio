// CornerCV6 — the fresh CV6 surface. /dashboard renders THIS now (B: fresh start).
// Every visible screen is a Claude Design fill-in template, mounted through the engine
// and fed real data. Nothing is hand-drawn; nothing is faked. Screens fill in as
// Claude Design labels them. CV4 stays reachable at ?cv4=1 as the fallback.
//
// Live screens: Home (desktop 3-column + mobile), the front door — real rooms, real
// agents, the real needs-you Catch Up. Support inbox reachable from the nav.

import { useMemo, useState, useEffect } from 'react';
import './cv6.css';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { useHome, useProjectMissions, shapeProjectState } from './data/useHomeData.js';
import { useSupportInbox } from './data/useSupportInbox.js';
import homeDesktopRaw from './templates/home-desktop.html?raw';
import homeMobileRaw from './templates/home-mobile.html?raw';
import inboxRaw from './templates/support-inbox.html?raw';
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
function composeScreen(raw, { mobile = false, pick = 0 } = {}) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const nodes = doc.querySelectorAll('[data-cv6]');
  const screen = nodes[pick] || nodes[0];
  if (!screen) return '';
  screen.setAttribute('style', mobile
    ? 'position:relative;width:100%;height:100%;background:#05080b;overflow:hidden'
    : 'width:100%;height:100%');
  // append shared states next to this screen's ready region
  const ready = screen.querySelector('[data-state="ready"]');
  const host = ready?.parentNode || screen;
  if (ready) {
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => {
      host.appendChild(b.cloneNode(true));
    });
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
};

function Home({ onNav }) {
  const isDesktop = useIsDesktop();
  const { state, data, worldId } = useHome();
  const missionsByProject = useProjectMissions(worldId);
  // Mobile "project opened" state (Home state B): tap a project -> its missions.
  const [openedProjectId, setOpenedProjectId] = useState(null);
  const openedProject = openedProjectId ? (data.projects || []).find((p) => p.id === openedProjectId) : null;

  const homeHtml = useMemo(
    () => (isDesktop
      ? composeScreen(homeDesktopRaw, { mobile: false, pick: 0 })
      : composeScreen(homeMobileRaw, { mobile: true, pick: 0 })),
    [isDesktop],
  );
  const projectHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 1 }), []);

  const actions = useMemo(() => ({
    nav: (target) => { if (target === 'back') setOpenedProjectId(null); else onNav?.(target); },
    // Tap a project on mobile -> open its real mission list. Agents + desktop projects
    // open the conversation, which is the Chat screen (next design) -> no-op for now.
    openRoom: (id) => {
      const proj = (data.projects || []).find((p) => p.id === id);
      if (proj && !isDesktop) setOpenedProjectId(id);
    },
    openCatchUp: () => {},
    openCommandK: () => {}, search: () => {}, openNav: () => {},
    openNotifications: () => {}, openProfile: () => {}, toggleTheme: () => {},
    newRoom: () => {}, showMoreProjects: () => {},
    draftReply: () => {}, addToTracker: () => {}, assignAgent: () => {}, snooze: () => {},
    review: () => {}, openAttachment: () => {},
    voiceInput: () => {}, composeMessage: () => {}, sendMessage: () => {},
    openProjectChat: () => {}, openMission: () => {}, newMission: () => {},
  }), [onNav, data.projects, isDesktop]);

  if (openedProject) {
    const pdata = shapeProjectState(openedProject, missionsByProject[openedProject.slug]);
    return <TemplateScreen html={projectHtml} data={pdata} actions={actions} state="ready"
      aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />;
  }
  return <TemplateScreen html={homeHtml} data={data} actions={actions} state={state}
    aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Support inbox (the proven pilot), reachable from the nav ──
const SUPPORT_ALIASES = { needsYou: 'email', watching: 'email', 'email.tags': 'tag' };

function SupportInbox({ onNav }) {
  const { state, data, reload } = useSupportInbox('aom');
  const html = useMemo(() => composeScreen(inboxRaw, { mobile: true }), []);
  const actions = useMemo(() => ({
    openThread: () => {}, search: () => {}, openNav: () => {},
    nav: (t) => onNav?.(t), browseWatching: () => {}, emptyAction: () => {},
    retry: () => reload(), viewOffline: () => {},
  }), [onNav, reload]);
  return <TemplateScreen html={html} data={data} actions={actions} state={state}
    aliases={SUPPORT_ALIASES} style={{ width: 'min(420px, 100%)', height: '100%', margin: '0 auto' }} />;
}

export default function CornerCV6() {
  const [screen, setScreen] = useState('home');
  // Only Home + Support are wired today; other nav targets stay put until built.
  const onNav = (target) => {
    if (target === 'home' || target === 'support') setScreen(target);
  };
  return (
    <div data-cv6 data-theme="dark" style={{
      minHeight: '100dvh', height: '100dvh', background: 'var(--ground, #05080b)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch' }}>
        {screen === 'support' ? <SupportInbox onNav={onNav} /> : <Home onNav={onNav} />}
      </div>
    </div>
  );
}
