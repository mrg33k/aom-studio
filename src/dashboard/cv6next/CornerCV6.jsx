// CornerCV6 — the fresh CV6 surface. /dashboard renders THIS now (B: fresh start).
// Every visible screen is a Claude Design fill-in template, mounted through the engine
// and fed real data. Nothing is hand-drawn; nothing is faked. Screens fill in as
// Claude Design labels them. CV4 stays reachable at ?cv4=1 as the fallback.
//
// Live screens: Home (desktop 3-column + mobile), the front door — real rooms, real
// agents, the real needs-you Catch Up. Support inbox reachable from the nav.

import { useMemo, useState, useEffect, useCallback, useRef, Component } from 'react';
import { createPortal } from 'react-dom';
import './cv6.css';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import Cv6FullComposer from './Cv6FullComposer.jsx';
import MessageAttachments from './MessageAttachments.jsx';
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';
import { authFetch } from '../lib/authFetch';
import { AssignButton } from '../cv6kit/AssignButton.jsx';
import { useTreeContextMenu, renameNode, moveNode, createNode, findMissionNode } from './TreeContextMenu.jsx';
import ActivityDock from './ActivityDock.jsx';
import { GoalThreadBody, SendCtx, ReviewCtx, AgentBlocks, WorkingTurn } from './ChatGoalThread.jsx';
import Review from './Review.jsx';
import ReviewDesktop from './ReviewDesktop.jsx';
import ChatLifecycle from './ChatLifecycle.jsx';
import ChatDesktop, { FilesShelf, fileKind, libKindLabel, shelfItems } from './ChatDesktop.jsx';
import SupportDesktop from './SupportDesktop.jsx';
import Organize from './Organize.jsx';
import Settings from './Settings.jsx';
import Onboarding from './Onboarding.jsx';
import LiveScribe from './LiveScribe.jsx';
import Search from './Search.jsx';
import { MobileNav, DesktopNav } from './SharedNav.jsx';
import { useHome, useProjectMissions, shapeProjectState, createMissionInProject, createProjectFromHome, useChatList } from './data/useHomeData.js';
import { useSupportInbox } from './data/useSupportInbox.js';
import { useRoomThread, useGoalThread } from './data/useRoomThread.js';
import { useWorldId, useCommand, useTrackerBugs } from './data/useCommandTracker.js';
import { useDemoBlocksFeed } from './data/useDemoBlocks.js';
import homeDesktopRaw from './templates/home-desktop.html?raw';
import homeMobileRaw from './templates/home-mobile.html?raw';
import inboxRaw from './templates/support-inbox.html?raw';
import supportThreadRaw from './templates/support-thread.html?raw';
import chatRaw from './templates/chat.html?raw';
import kitRaw from './templates/kit.html?raw';
import commandRaw from './templates/command.html?raw';
import trackerRaw from './templates/tracker.html?raw';
import chatListRaw from './templates/chat-list.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// Turn a project's stored summary markdown into a clean 1-2 sentence room blurb for the
// catch-up card. Strips markdown (headers, bullets, links, emphasis), collapses whitespace,
// then takes the first one or two sentences (capped) so the card reads as a real summary.
function roomSummarySentences(md, max = 2) {
  // Use only the FIRST paragraph (the status line). summary_md is a status line followed by a
  // [done]/[failed] task bullet list; pulling the bullets would leak "done ..." into the card.
  const firstPara = String(md || '').split(/\n\s*\n/)[0] || '';
  let s = firstPara
    .replace(/```[\s\S]*?```/g, ' ')        // code fences
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')   // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links -> text
    .replace(/\s*[—–]\s*/g, ', ')             // em/en dash -> comma (on-brand, no dashes)
    .replace(/[#>*_`~]+/g, ' ')               // md punctuation (keep hyphens inside words)
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  const parts = s.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [s];
  let out = parts.slice(0, max).join(' ').trim();
  if (out.length > 240) out = out.slice(0, 237).trimEnd() + '…';
  return out;
}

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
// 'review' was missing here, so design templates whose chrome carries a Review tile
// silently dropped it — a live tool with a stripped tile (2026-07-01 audit). The
// design files also write the Scribe target as 'live-scribe'; accept both spellings.
const LIVE_NAV = new Set(['home', 'chat', 'support', 'organize', 'review', 'command', 'tracker', 'onboarding', 'livescribe', 'live-scribe', 'back']);

function composeScreen(raw, { mobile = false, pick = 0, sharedNav = false } = {}) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const nodes = doc.querySelectorAll('[data-cv6]');
  const screen = nodes[pick] || nodes[0];
  if (!screen) return '';
  // Strip nav tiles that point at not-yet-built tools (no dead ends). Design files
  // write the Scribe target as 'live-scribe'; the view machine routes 'livescribe' —
  // normalize the attribute so the tile survives AND routes.
  screen.querySelectorAll('[data-action="nav"][data-target]').forEach((tile) => {
    if (tile.getAttribute('data-target') === 'live-scribe') tile.setAttribute('data-target', 'livescribe');
    if (!LIVE_NAV.has(tile.getAttribute('data-target'))) tile.remove();
  });
  // One shared nav (design item 7): the desktop top bar is now mounted once in the
  // shell, so strip this screen's baked-in .topbar to avoid a double bar.
  if (sharedNav && !mobile) screen.querySelector('.topbar')?.remove();
  // A mobile screen is a fixed header (.mhdr, flex:none) over a scroll body (.scrbody,
  // flex:1 overflow:auto). For that to scroll, the screen must be a flex column — the
  // design's fixed-px mockup never needed it, so it was missing and the body clipped
  // instead of scrolling. Add it whenever the screen has a scroll body.
  const hasScrollBody = !!screen.querySelector('.scrbody');
  screen.setAttribute('style', mobile
    ? `position:relative;width:100%;height:100%;background:#05080b;overflow:hidden${hasScrollBody ? ';display:flex;flex-direction:column' : ''}`
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
  agents: 'room', projects: 'room', recent: 'rec', 'convo.messages': 'msg',
  'room.missions': 'mission',
  'catchUp.rest': 'card',
  'catchUp.current.actionItems': 'actionItem',
  'catchUp.current.attachments': 'attachment',
  'goal.summary': 'summary', 'goal.checklist': 'step',
  missions: 'mission',
  assignableAgents: 'agentPick',
  'catchUp.items': 'item',
};

// Projects pagination: show this many by default, rest behind "Show N more".
const PROJ_LIMIT = 8;

// Add-to-Tracker drawer (catch-up card, Patrik 2026-06-25): a bottom sheet shown ONLY when
// one+ trackers already exist for the card's mission — pick an existing one or create a new
// one. Built from the proven Tracker "Switch" sheet visual (scrim + bottom sheet + .trk rows),
// so it rides the design system, not a freestyle. Layered as an overlay so it works over Home
// and the full-deck. (No tracker yet => we create + add silently, no drawer; see addToTracker.)
const ADD_TRACKER_ALIASES = { trackers: 'tracker' };
const ADD_TRACKER_SHEET_HTML = `
<div data-cv6 data-theme="dark" data-screen="tracker-mobile" style="position:absolute;inset:0;">
  <div data-action="closeTrackerSheet" style="position:absolute;inset:0;background:rgba(0,0,0,.55);"></div>
  <div style="position:absolute;left:0;right:0;bottom:0;background:var(--ground);border-top-left-radius:22px;border-top-right-radius:22px;border-top:1px solid var(--hair);padding:8px 16px max(22px, env(safe-area-inset-bottom, 0px));box-shadow:0 -22px 54px -22px rgba(0,0,0,.65);max-height:80%;overflow-y:auto;-webkit-overflow-scrolling:touch;">
    <div style="width:38px;height:4px;border-radius:3px;background:var(--divider);margin:6px auto 14px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;"><span style="font-size:17px;font-weight:700;letter-spacing:-.01em;color:var(--fg);" data-bind="sheet.title">Add to Tracker</span><div class="ib" style="width:32px;height:32px;border-radius:9px;" data-action="closeTrackerSheet"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></div></div>
    <div style="font-size:12.5px;color:var(--muted);margin:0 2px 16px;" data-bind="sheet.missionLine">Mission</div>
    <div class="eyebrow" style="margin:0 2px 8px;">Add to existing</div>
    <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:14px;">
      <!-- ONE row per mission tracker for this card's mission -->
      <div class="trk" data-each="trackers" data-action="pickTracker" data-arg="tracker.id"><span class="pdot is-faint"></span><div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:600;color:var(--fg);" data-bind="tracker.name">Tracker</div><div style="font-size:11.5px;color:var(--muted);" data-bind="tracker.scope">Scope</div></div><span class="mono" style="font-size:11px;color:var(--faint);" data-bind="tracker.count">0</span></div>
    </div>
    <!-- create-new affordance -->
    <div class="trk" data-action="newTrackerForItem" style="border:1px dashed var(--hair);gap:11px;cursor:pointer;"><span style="width:27px;height:27px;border-radius:8px;background:var(--accent-weak);color:var(--accent);display:flex;align-items:center;justify-content:center;flex:none;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span><span style="font-size:14px;font-weight:600;color:var(--accent);">New tracker for this mission</span></div>
  </div>
</div>`;

// Start-a-mission / New-project composer — the live build of the CV6 "New mission / new
// project" design (deliverables/design-system-2026-06-28/guidelines/pattern-new-mission.html).
// One overlay, two modes via data-switch on composer.mode: "Start a mission" (goal + project +
// assign + priority + when → createMissionInProject) and "New project" (name + about →
// createProjectFromHome). Picks ride the DOM (.is-on) so the uncontrolled text boxes survive.
const NEW_COMPOSER_ALIASES = { 'composer.projects': 'proj', 'composer.agents': 'ag' };
const NEW_COMPOSER_HTML = `
<div data-cv6 data-theme="dark" style="position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
  <style>
    .cmp-card .cmp-field{display:flex;flex-direction:column;gap:8px;}
    .cmp-card .cmp-flab{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
    .cmp-card .cmp-inp{border:1px solid var(--hair);background:var(--surface-2);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--fg);font-family:var(--font-sans);width:100%;box-sizing:border-box;}
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
  </style>
  <div data-action="closeComposer" style="position:absolute;inset:0;background:rgba(4,6,9,.62);"></div>
  <div class="cmp-card" style="position:relative;width:100%;max-width:520px;max-height:92%;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;background:var(--ground);box-shadow:0 34px 80px -22px rgba(0,0,0,.62);border:1px solid var(--hair);">
    <div style="display:flex;align-items:center;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--divider);flex:none;">
      <span style="width:40px;height:40px;border-radius:12px;background:var(--accent-weak);display:flex;align-items:center;justify-content:center;flex:none;"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/></svg></span>
      <div style="flex:1;min-width:0;"><div style="font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--fg);" data-bind="composer.title">Start a mission</div><div style="font-size:12px;color:var(--muted);" data-bind="composer.subtitle">A room + an agent, pointed at one goal</div></div>
      <span class="ib" data-action="closeComposer" style="width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></span>
    </div>
    <div style="display:flex;gap:7px;padding:14px 22px 2px;flex:none;">
      <button class="cmp-tab" data-mod="is-:composer.tabMission" data-action="setComposerMode" data-arg="mission"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/></svg>Start a mission</button>
      <button class="cmp-tab" data-mod="is-:composer.tabProject" data-action="setComposerMode" data-arg="project"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>New project</button>
    </div>
    <div data-switch="composer.mode" style="padding:16px 22px;overflow-y:auto;display:flex;flex-direction:column;gap:18px;">
      <div data-case="mission" style="display:flex;flex-direction:column;gap:18px;">
        <div class="cmp-field">
          <div class="cmp-flab">What should the room get done?</div>
          <textarea class="cmp-inp" data-bind="draft.goal" placeholder="e.g. Lock the print framing before Apr 29" style="min-height:64px;"></textarea>
        </div>
        <div class="cmp-field">
          <div class="cmp-flab">Project</div>
          <div class="cmp-list">
            <div class="cmp-row cmp-projrow" data-each="composer.projects" data-mod="is-:proj.picked" data-action="pickComposerProject" data-arg="proj.slug"><span style="width:20px;height:20px;border-radius:6px;background:rgba(139,124,246,.16);display:flex;align-items:center;justify-content:center;flex:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" data-bind="proj.name">Project</span><span class="cmp-chk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></div>
          </div>
        </div>
        <div class="cmp-field">
          <div class="cmp-flab">Assign to</div>
          <div class="cmp-list">
            <div class="cmp-row cmp-agrow" data-each="composer.agents" data-mod="is-:ag.picked" data-action="pickComposerAgent" data-arg="ag.id"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" data-bind="ag.name">Auto</span><span class="cmp-chk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></div>
          </div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div class="cmp-field" style="flex:1;min-width:150px;"><div class="cmp-flab">Priority</div><div class="cmp-seg cmp-pri"><button data-mod="is-:composer.priSel.low" data-action="setComposerPriority" data-arg="low">Low</button><button data-mod="is-:composer.priSel.med" data-action="setComposerPriority" data-arg="med">Med</button><button data-mod="is-:composer.priSel.high" data-action="setComposerPriority" data-arg="high">High</button></div></div>
          <div class="cmp-field" style="flex:1;min-width:150px;"><div class="cmp-flab">When</div><div class="cmp-seg cmp-when"><button data-mod="is-:composer.whenSel.now" data-action="setComposerWhen" data-arg="now">Now</button><button data-mod="is-:composer.whenSel.week" data-action="setComposerWhen" data-arg="this-week">This week</button></div></div>
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
      <span style="flex:1;font-size:11.5px;color:var(--faint);line-height:1.4;">The more you give it, the better the room starts.</span>
      <button data-action="closeComposer" style="height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--hair);background:var(--surface-2);color:var(--fg);font-size:14px;font-weight:600;font-family:var(--font-sans);cursor:pointer;">Cancel</button>
      <button data-action="submitComposer" style="height:44px;padding:0 20px;border-radius:12px;border:none;background:var(--accent);color:#fff;font-size:14px;font-weight:600;font-family:var(--font-sans);display:flex;align-items:center;gap:8px;cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg><span data-bind="composer.ctaLabel">Start mission</span></button>
    </div>
  </div>
</div>`;

// Build the tracker row for a catch-up item, keyed to the tracker's real columns (a freshly
// created mission tracker defaults to ['Item','Status']; a user-made one may differ). First
// column carries the item text; a Status-like column (if any) defaults to Open.
function trackerRowForItem(tracker, itemText) {
  const cols = Array.isArray(tracker?.columns) && tracker.columns.length ? tracker.columns : ['Item', 'Status'];
  const row = {};
  row[cols[0]] = itemText;
  const statusCol = cols.find((c) => /status/i.test(c));
  if (statusCol && statusCol !== cols[0]) row[statusCol] = 'Open';
  return row;
}
// Thin POST wrapper for the user trackers API (create / add-row). Returns parsed JSON or null.
async function postTrackerApi(body) {
  try {
    const r = await authFetch('/api/dashboard/trackers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return r && r.ok ? await r.json() : null;
  } catch { return null; }
}

// Cv6QuickThread — the Home col3 quick-reply message list, rendered as React (portaled
// into the template's empty .convo-thread host) so attachments draw as real cards
// (image thumbs, galleries, file cards, collections) with Review affordances — same
// MessageAttachments the main Chat tool uses — instead of plain "Attached file:" text.
// Group consecutive messages from the same sender into one visual group (one avatar
// + name + timestamp, N bubbles), matching the design system's plain-conversation.
function groupChatMessages(list) {
  const groups = [];
  for (const m of list) {
    const key = m.isUser ? '__you' : (m.agentName || 'agent');
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, isUser: !!m.isUser, items: [m] });
  }
  return groups;
}

function Cv6QuickThread({ target, messages, blocks, goal, onReview, onSend, awaiting, liveSteps, room }) {
  if (!target) return null;
  const list = Array.isArray(messages) ? messages : [];
  const groups = groupChatMessages(list);
  // Live step loader: while the agent is actively working this turn, useRoomThread exposes
  // the in-flight goal-thread blocks (same source the full Chat tool reads). Show the loader
  // even before the first message lands so an empty room still ticks (parity with Chat).
  const live = Array.isArray(blocks) && blocks.length > 0;
  // The working strip's header restates the ask: room goal if set, else the newest user
  // message (same rule the full Chat tool uses, so the two read identically).
  const askGoal = (() => {
    if (goal?.title) return goal;
    for (let i = list.length - 1; i >= 0; i -= 1) { if (list[i]?.isUser && list[i].text) return { title: list[i].text }; }
    return goal;
  })();
  return createPortal(
    (list.length === 0 && !live && !awaiting) ? (
      <div className="convo-empty" style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)', fontSize: 13, maxWidth: 240, lineHeight: 1.5 }}>
        No messages in this room yet. Send the first one below.
      </div>
    ) : (
      <SendCtx.Provider value={onSend || (() => {})}>
      <ReviewCtx.Provider value={(file) => { if (file) onReview?.(file); }}>
      <div className="pconv">
        {groups.map((g, gi) => {
          const head = g.items[0];
          const lastTime = g.items[g.items.length - 1].time;
          if (g.isUser) {
            return (
              <div className="me" key={gi}>
                {g.items.map((m, i) => (
                  <span key={i} style={{ display: 'contents' }}>
                    {m.text ? <div className="pb-me">{m.text}</div> : null}
                    {m.attachments?.length ? <MessageAttachments attachments={m.attachments} onReview={onReview} /> : null}
                  </span>
                ))}
                {lastTime ? <div className="ts">{lastTime}</div> : null}
              </div>
            );
          }
          return (
            <div className="grp" key={gi}>
              <span className={`av is-${head.agentTint || 'violet'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{head.agentInitials || '·'}</span>
              <div className="stack">
                {head.agentName ? <div className="gname">{head.agentName}</div> : null}
                {g.items.map((m, i) => (
                  <span key={i} style={{ display: 'contents' }}>
                    {m.text ? <div className="pb"><ChatMessageRenderer content={m.text} /></div> : null}
                    {/* Rich blocks: a finished turn shows its step thread inline (the durable
                        record), lone answer blocks render inline — AgentBlocks decides per message.
                        The live working thread renders once, below (WorkingTurn), so no double render. */}
                    {m.blocks?.length ? <div style={{ marginTop: 8, width: '100%' }}><AgentBlocks goal={goal} blocks={m.blocks} /></div> : null}
                    {m.attachments?.length ? <MessageAttachments attachments={m.attachments} onReview={onReview} /> : null}
                  </span>
                ))}
                {lastTime ? <div className="ts">{lastTime}</div> : null}
              </div>
            </div>
          );
        })}
        {/* The live "agent is working" strip — the SAME one the full Chat tool shows, so the
            quick chat reads identically. On iff the agent is working this turn (awaiting),
            its steps ticking from real tool activity. (Patrik 2026-06-27: was missing here.) */}
        {awaiting ? <WorkingTurn room={room} steps={liveSteps} goal={askGoal} /> : null}
      </div>
      </ReviewCtx.Provider>
      </SendCtx.Provider>
    ),
    target,
  );
}

// Turn a catch-up card into the room handle useRoomThread + onOpenRoom expect.
function cardToRoom(card) {
  if (!card) return null;
  if (card.missionSlug) return { id: String(card.missionSlug).split(':').pop(), name: card.subject || card.from || 'Room', missionSlug: card.missionSlug, projectSlug: card.project || '', isMission: true };
  if (card.project) return { id: card.project, name: card.from || card.project, projectSlug: card.project, isProject: true };
  if (card.agent) return { id: card.agent, name: card.from || card.agent };
  return null;
}

// The conversation, rendered as grouped bubbles (shared look with the quick-reply thread
// and the Chat tool). Non-portal so it can live inside the Catch Up modal.
function InlineBubbleThread({ messages }) {
  const groups = groupChatMessages(Array.isArray(messages) ? messages : []);
  if (!groups.length) return <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>No conversation yet.</div>;
  return (
    <div className="pconv">
      {groups.map((g, gi) => {
        const head = g.items[0];
        const lastTime = g.items[g.items.length - 1].time;
        if (g.isUser) {
          return (
            <div className="me" key={gi}>
              {g.items.map((m, i) => (m.text ? <div className="pb-me" key={i}>{m.text}</div> : null))}
              {lastTime ? <div className="ts">{lastTime}</div> : null}
            </div>
          );
        }
        return (
          <div className="grp" key={gi}>
            <span className={`av is-${head.agentTint || 'violet'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{head.agentInitials || '·'}</span>
            <div className="stack">
              {head.agentName ? <div className="gname">{head.agentName}</div> : null}
              {g.items.map((m, i) => (m.text ? <div className="pb" key={i}><ChatMessageRenderer content={m.text} /></div> : null))}
              {lastTime ? <div className="ts">{lastTime}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Catch Up modal (Patrik 2026-06-26): clicking Catch Up opens the actual conversation
// for the item that needs him, with a reply box, so he can read the context and respond
// in place. Replying posts into the room; once he replies the agent is no longer waiting
// on him, so the card clears itself on the next poll. Prev/next walk the needs-you deck.
function CatchUpModal({ card, worldId, idx, total, onPrev, onNext, onClose, onGoToRoom }) {
  const room = useMemo(() => cardToRoom(card), [card?.id]);
  const { messages, send } = useRoomThread(worldId, room);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages?.length]);
  const submit = () => { const t = draft.trim(); if (!t || !room) return; send(t); setDraft(''); };
  const caughtUp = !room || !card?.id;
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(4,6,9,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px,94%)', height: 'min(86%,720px)', background: 'var(--ground)', border: '1px solid var(--hair)', borderRadius: 16, boxShadow: 'var(--shadow-window)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 18px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{caughtUp ? 'All caught up' : (card.from || 'Needs you')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{caughtUp ? 'Nothing needs you right now.' : `${card.subject || ''}${total > 1 ? `  ·  ${idx + 1} of ${total}` : ''}`}</div>
          </div>
          {!caughtUp && onGoToRoom ? <button onClick={onGoToRoom} className="filesbtn" style={{ cursor: 'pointer' }}>Go to room</button> : null}
          <div className="ib" onClick={onClose} style={{ cursor: 'pointer', width: 34, height: 34 }} title="Close"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></div>
        </div>
        <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 18px 14px' }}>
          {caughtUp ? <div style={{ color: 'var(--muted)', fontSize: 13.5, textAlign: 'center', padding: '40px 0' }}>You're all caught up. New things that need you will show here.</div> : <InlineBubbleThread messages={messages} />}
        </div>
        {!caughtUp ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderTop: '1px solid var(--divider)' }}>
            {total > 1 ? <div className="ib" onClick={onPrev} style={{ cursor: 'pointer', width: 38, height: 38 }} title="Previous"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg></div> : null}
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder={`Reply to ${card.from || 'this room'}…`} style={{ flex: 1, minWidth: 0, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 14px', color: 'var(--fg)', fontSize: 14, outline: 'none' }} />
            <button onClick={submit} title="Send" style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
            {total > 1 ? <div className="ib" onClick={onNext} style={{ cursor: 'pointer', width: 38, height: 38 }} title="Next"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg></div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Files panel for the Home col3 quick chat (Patrik 2026-06-30). The "Files" button in the
// conversation header used to jump to the Organize tool; now it opens this panel in place —
// the SAME shelf the full Chat tool's Files drawer shows (the room's real library files +
// links shared in the conversation). Rendered as an overlay over the Conversation column so
// you never leave Home. host = the .home-files anchor inside the Conversation column (a
// data-cv6-keep node that survives re-binds); the panel is position:absolute and covers the
// .convo column, which is position:relative in CSS. null host = closed.
function HomeFilesPanel({ host, room, messages, onClose, onReview }) {
  const libProjectSlug = room?.isMission ? room.projectSlug : (room?.isProject ? room.id : null);
  const [roomFiles, setRoomFiles] = useState([]);
  useEffect(() => {
    if (!libProjectSlug) { setRoomFiles([]); return undefined; }
    let alive = true;
    authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(libProjectSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const flat = [];
        for (const f of (d.files || [])) flat.push(f);
        for (const m of (d.missions || [])) for (const f of (m.files || [])) flat.push(f);
        setRoomFiles(flat);
      })
      .catch(() => { if (alive) setRoomFiles([]); });
    return () => { alive = false; };
  }, [libProjectSlug]);
  // Shelf = the room's library files (project/mission rooms) + links from the conversation;
  // agent rooms fall back to whatever files/links the conversation itself carries. Mirrors the
  // full Chat tool's shelf build (ChatDesktop) so the two read identically.
  const shelf = useMemo(() => {
    const convo = shelfItems(messages || []);
    if (!libProjectSlug) return convo;
    const lib = roomFiles.map((f) => ({
      type: 'file', kind: fileKind(f.name), name: f.name, url: f.path, path: f.path,
      ts: f.last_modified || null, who: '', size: 0, libKind: libKindLabel(f.kind),
    }));
    const links = convo.filter((i) => i.type === 'link');
    const merged = [...lib, ...links];
    merged.sort((a, b) => (new Date(b.ts || 0).getTime() || 0) - (new Date(a.ts || 0).getTime() || 0));
    return merged;
  }, [messages, roomFiles, libProjectSlug]);
  if (!host) return null;
  return createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 12, background: 'var(--ground)', display: 'flex', flexDirection: 'column' }}>
      <div className="cvhdr">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Files</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room?.name || ''}</div>
        </div>
        <div className="filesbtn" onClick={onClose} role="button" title="Close files" style={{ cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          Close
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 20px' }}>
        <FilesShelf items={shelf} onReview={onReview} />
      </div>
    </div>,
    host,
  );
}

function Home({ onNav, onOpenRoom, onOpenNav, onCommandK, pendingProjectId, onProjectConsumed }) {
  const isDesktop = useIsDesktop();
  const { state, data, worldId } = useHome();
  const [missionReload, setMissionReload] = useState(0);
  const missionsByProject = useProjectMissions(worldId, missionReload);

  // ── R-TREE-MENU: right-click / long-press on the Rooms rail → Rename / Move ──
  // .projrow carries the project id, .missrow the full colon mission slug (both
  // stamped as data-cv6-arg by the template engine at bind time).
  const homeWrapRef = useRef(null);
  const homeProjectsRef = useRef([]);
  const missionsByProjectRef = useRef({});
  const resolveHomeHit = useCallback((rowEl) => {
    const id = rowEl.getAttribute('data-cv6-arg') || '';
    if (!id) return null;
    const projects = homeProjectsRef.current || [];
    if (rowEl.classList.contains('projrow')) {
      const p = projects.find((x) => x.id === id || x.slug === id);
      if (!p?.slug) return null;
      return { kind: 'project', projectSlug: p.slug, name: p.name || p.slug };
    }
    if (rowEl.classList.contains('missrow')) {
      const projectSlug = id.includes(':') ? id.slice(0, id.indexOf(':')) : null;
      if (!projectSlug) return null;
      const leaf = id.slice(id.lastIndexOf(':') + 1);
      const found = findMissionNode(missionsByProjectRef.current?.[projectSlug], id, leaf);
      const node = found?.node;
      const path = node?.path || null;
      return {
        kind: 'mission',
        projectSlug,
        missionSlug: node?.folder_name || leaf,
        name: node?.name || leaf,
        path,
        canMove: !path || path.startsWith('corner/users/'),
      };
    }
    return null;
  }, []);
  const { overlay: treeCtxOverlay } = useTreeContextMenu({
    wrapRef: homeWrapRef,
    resolveHit: resolveHomeHit,
    listProjects: () => (homeProjectsRef.current || []).filter((p) => p.slug).map((p) => ({ slug: p.slug, name: p.name })),
    onRename: async (target, name) => { await renameNode(authFetch, target, name, worldId); setMissionReload((k) => k + 1); },
    onMove: async (target, dest) => { await moveNode(authFetch, target, dest, worldId); setMissionReload((k) => k + 1); },
    onCreate: async (target, name) => { await createNode(authFetch, target, name, worldId); setMissionReload((k) => k + 1); },
  });
  // Latest data for the context-menu resolver (refs, so the delegated listener
  // never needs re-binding — same pattern as curCardRef).
  homeProjectsRef.current = data.projects || [];
  missionsByProjectRef.current = missionsByProject || {};

  // Desktop Home: which project folders are fanned open to their missions, and which have
  // had "show N more" tapped. Matches the Chat rail tree.
  const [expandedHomeProjects, setExpandedHomeProjects] = useState(() => new Set());
  const [missionShowAll, setMissionShowAll] = useState(() => new Set());
  // Which sub-mission nodes (nested children) are open inside a project folder.
  const [expandedHomeNodes, setExpandedHomeNodes] = useState(() => new Set());
  // Mobile "project opened" state (Home state B): tap a project -> its missions.
  const [openedProjectId, setOpenedProjectId] = useState(null);
  const openedProject = openedProjectId ? (data.projects || []).find((p) => p.id === openedProjectId) : null;
  // A project tapped on another surface (Chat list) routes here to open its home.
  // Mobile only — the project-detail screen is phone-framed; desktop waits on its own design.
  useEffect(() => {
    if (pendingProjectId && !isDesktop) {
      setOpenedProjectId(pendingProjectId);
      onProjectConsumed?.();
    }
  }, [pendingProjectId, isDesktop, onProjectConsumed]);
  // New-mission form (Home state C). Seeded on open so it stays stable + uncontrolled.
  const [missionSeed, setMissionSeed] = useState(null);
  const missionFormRef = useRef(null);
  const missionAgentRef = useRef('');
  // Start-a-mission / New-project composer (the All-rooms "New" button, CV6 design system).
  // `composer` (null | { mode }) drives the overlay + the mission/project switch; the field
  // picks (project/agent/priority/when) live in a ref + are toggled on the DOM directly so the
  // overlay never re-binds mid-typing and wipes the uncontrolled goal/name boxes.
  const [composer, setComposer] = useState(null);
  const composerFormRef = useRef(null);
  const composerSelRef = useRef({ mode: 'mission', projectId: '', agentId: '__auto', priority: 'med', when: 'now' });
  // Catch Up full deck (Home state D): cycle the real needs-you cards.
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [catchUpIndex, setCatchUpIndex] = useState(0);
  // Cleared Catch Up items, remembered per-device (no backend mark-handled exists yet,
  // so this survives reload on this device but does not sync across devices).
  const [catchUpDismissed, setCatchUpDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cv6.catchup.dismissed') || '[]'); } catch { return []; }
  });
  // The live Catch Up deck: real inbox cards minus the ones cleared on this device.
  // Shaped once so the Home card and the full-screen deck always agree.
  const liveCatchUp = useMemo(() => {
    const all = (data.catchUp?.all || []).filter((c) => !catchUpDismissed.includes(c.id));
    const idx = Math.min(catchUpIndex, Math.max(0, all.length - 1));
    return {
      ...(data.catchUp || {}),
      all, count: all.length,
      // When caught up (no real item), the action buttons have nothing to act on -> hide them.
      actionsState: all.length ? 'has' : 'none',
      // The desktop deck shows a peeking stack behind the front card only when 2+ remain.
      stackState: all.length > 1 ? 'has' : 'none',
      position: all.length ? idx + 1 : 0,
      current: all[idx] || { id: '', kind: 'agent', kindLabel: '', from: 'Caught up', subject: '', summary: 'Nothing needs you right now. New items from your agents and inbox will land here.', actionItems: [], attachments: [], actionState: 'none' },
      items: all.map((c, i) => ({ ...c, deckState: i === idx ? 'current' : (i < idx ? 'prev' : 'next') })),
    };
  }, [data.catchUp, catchUpDismissed, catchUpIndex]);

  // Real room summary for the current catch-up card (Patrik: an actual 1-2 sentence summary
  // of what's happening in that room, not the message's first line). Pulls the daemon-written
  // project summary (open items, recent wins, last intent) for the current card's project and
  // caches it per slug. Agent-thread cards (no project) keep the message preview. File cards
  // keep the file chip. (project-summary is the same source the CV4 home/Tasks panel uses.)
  const [roomSummaries, setRoomSummaries] = useState({});
  const curProject = liveCatchUp.current?.project || '';
  useEffect(() => {
    if (!curProject || roomSummaries[curProject] !== undefined) return undefined;
    let alive = true;
    authFetch('/api/dashboard/project-summary?slug=' + encodeURIComponent(curProject))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        const p = j?.event?.payload || {};
        const text = roomSummarySentences(p.summary_md || p.last_human_intent || '');
        setRoomSummaries((m) => ({ ...m, [curProject]: text }));
      })
      .catch(() => { if (alive) setRoomSummaries((m) => ({ ...m, [curProject]: '' })); });
    return () => { alive = false; };
  }, [curProject, roomSummaries]);

  // The card summary is the agent's actual ask (summarizeAsk in useDataPipe), which is
  // what tells Patrik why he's the bottleneck. We deliberately do NOT override it with the
  // generic project status here (that read as "stupid" — it hid the real question).
  const liveCatchUpView = liveCatchUp;

  // Catch Up column visibility (Patrik 2026-06-27): when nothing needs you, the whole column
  // is hidden — Rooms + Conversation fill the space. When the FIRST new item lands (empty ->
  // non-empty), the column slides in once. colState: 'none' = hidden, 'in' = animate-in (one
  // shot, ~460ms), 'has' = present and settled (no animation on later data ticks). We drive
  // this in React rather than pure CSS because TemplateScreen rebuilds the column DOM on every
  // data tick, so a CSS-on-insert animation would replay on unrelated updates.
  const prevCatchCountRef = useRef(liveCatchUpView.count);
  const [catchColAnimating, setCatchColAnimating] = useState(false);
  useEffect(() => {
    const prev = prevCatchCountRef.current;
    const now = liveCatchUpView.count;
    prevCatchCountRef.current = now;
    if (prev === 0 && now > 0) {
      setCatchColAnimating(true);
      const t = setTimeout(() => setCatchColAnimating(false), 460);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [liveCatchUpView.count]);
  const catchColState = !liveCatchUpView.count ? 'none' : (catchColAnimating ? 'in' : 'has');

  // Inline "Draft reply" on a catch-up card (Patrik): the reply composer replaces the action
  // buttons in place, with a Send button that posts the reply into that room (the same
  // supabase-messages path the Chat composer uses). curCardRef holds the latest current card
  // so the Send handler reads the right room without churning the actions memo.
  const [replyOpen, setReplyOpen] = useState(false);
  // After a Home quick-reply sends, the card shows "working" feedback (parity with the
  // chat tool) instead of vanishing silently. { label } while the agent is on it.
  const [replyWorking, setReplyWorking] = useState(null);
  const curCardRef = useRef(null);
  curCardRef.current = liveCatchUpView.current;
  useEffect(() => { setReplyOpen(false); setTrackerStatus(null); setReplyWorking(null); }, [curProject, catchUpIndex]); // reset on card change
  const sendCatchupReply = useCallback(async (text) => {
    const body = String(text || '').trim();
    const card = curCardRef.current;
    if (!worldId || !body || !card) return false;
    const payload = card.missionSlug
      ? { client_id: worldId, agent: 'corner', project: card.project, text: body, role: 'user', source: 'corner-dashboard', metadata: { mission_slug: card.missionSlug } }
      : card.project
        ? { client_id: worldId, agent: 'corner', project: card.project, text: body, role: 'user', source: 'corner-dashboard' }
        : { client_id: worldId, agent: card.agent || card.id, text: body, role: 'user', source: 'corner-dashboard' };
    // Show "working" the instant you send (parity with the chat tool's WorkingTurn).
    const pname = card.project ? String(card.project).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
    const who = card.agentName || pname || 'Your agent';
    setReplyOpen(false);
    setReplyWorking({ label: `${who} is on it…` });
    try {
      const r = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const ok = !!(r && r.ok);
      if (!ok) { setReplyWorking(null); return false; }
      // Hold the working state briefly so you SEE it landed, then advance the deck
      // (the reply itself shows in the chat tool; the card is handled on this device).
      const id = card.id;
      setTimeout(() => {
        setReplyWorking(null);
        if (id) setCatchUpDismissed((prev) => {
          const next = prev.includes(id) ? prev : [...prev, id];
          try { localStorage.setItem('cv6.catchup.dismissed', JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
      }, 2600);
      return ok;
    } catch { setReplyWorking(null); return false; }
  }, [worldId]);

  // Add to Tracker (Patrik catch-up spec): the card is tied to a mission. addToTracker resolves
  // the mission, looks up existing mission trackers (user trackers API, NOT the cv6-bugs board),
  // and either creates one + adds the item (no tracker yet) or opens a bottom drawer to pick
  // existing vs create-new. trackerSheet holds the open-drawer state; trackerToast is the
  // transient "Added to <tracker>" confirmation (a real signal without faking a live screen).
  const [trackerSheet, setTrackerSheet] = useState(null);
  // The CARD itself reports the add (Patrik 2026-06-25): 'adding' shows a spinner the instant
  // the button is tapped (immediate feedback, no waiting on the network), then 'added' flips to
  // a check + "Added to <tracker>" before the handled card clears off the deck.
  const [trackerStatus, setTrackerStatus] = useState(null); // null | 'adding' | 'added'
  const [trackerAddedName, setTrackerAddedName] = useState('');
  const trackerTimerRef = useRef(null);
  useEffect(() => () => { if (trackerTimerRef.current) clearTimeout(trackerTimerRef.current); }, []);

  // Derive the mission identity + the item text from a catch-up card. A project card carries
  // project/missionSlug (from = project name, subject = mission name); an agent-thread card has
  // no project (from = agent title). The tracker is named for the mission, scoped by the project.
  const trackerTargetForCard = useCallback((card) => {
    if (!card) return null;
    const isAgentThread = !card.project;
    const name = isAgentThread ? (card.from || 'Agent') : (card.subject || 'General');
    const scope = isAgentThread ? 'Agent' : (card.from || '');
    const file = card.contentState === 'file' ? (card.attachments && card.attachments[0]) : null;
    let item = file && file.name ? `File: ${file.name}` : (card.summary || card.subject || card.from || 'Catch-up item');
    item = String(item).replace(/\s+/g, ' ').trim().slice(0, 280);
    return { name, scope, item };
  }, []);

  // Finish an add: flip the card to its "Added to <tracker>" state, close any drawer, then
  // after a beat clear the handled card from the deck (tracked = handled, same dismiss the
  // reply Send uses). The card carries the confirmation, so there's no separate toast.
  const finishTrackerAdd = useCallback((card, trackerName) => {
    setTrackerSheet(null);
    setTrackerAddedName(trackerName);
    setTrackerStatus('added');
    if (trackerTimerRef.current) clearTimeout(trackerTimerRef.current);
    trackerTimerRef.current = setTimeout(() => {
      setTrackerStatus(null);
      const id = card && card.id;
      if (id) setCatchUpDismissed((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        try { localStorage.setItem('cv6.catchup.dismissed', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }, 1100);
  }, []);

  const addToTracker = useCallback(async () => {
    const card = curCardRef.current;
    const target = trackerTargetForCard(card);
    if (!worldId || !target) return;
    setTrackerStatus('adding'); // immediate feedback the instant the button is tapped
    // Pull existing mission trackers for THIS mission (name+scope composite key).
    let mine = [];
    try {
      const r = await authFetch('/api/dashboard/trackers?world=' + encodeURIComponent(worldId));
      const j = r && r.ok ? await r.json() : null;
      const all = Array.isArray(j?.trackers) ? j.trackers : [];
      mine = all.filter((t) => t.template === 'mission' && t.name === target.name && (t.scope || '') === target.scope);
    } catch { mine = []; }
    if (mine.length === 0) {
      // No tracker for this mission yet -> create it with the mission attached + add the item.
      const cj = await postTrackerApi({ action: 'create', world: worldId, name: target.name, scope: target.scope, template: 'mission' });
      const t = cj?.tracker;
      if (t) { postTrackerApi({ action: 'add-row', world: worldId, id: t.id, row: trackerRowForItem(t, target.item) }); finishTrackerAdd(card, target.name); }
      else setTrackerStatus(null); // create failed -> drop back to the action buttons
      return;
    }
    // One+ exist -> the drawer is the feedback now; open it to pick existing vs create-new.
    setTrackerStatus(null);
    setTrackerSheet({ card, target, missionLine: `${target.scope || 'Agent'} · ${target.name}`, trackers: mine });
  }, [worldId, trackerTargetForCard, finishTrackerAdd]);

  const trackerSheetActions = useMemo(() => ({
    closeTrackerSheet: () => setTrackerSheet(null),
    pickTracker: (id) => {
      const s = trackerSheet; if (!s) return;
      const t = (s.trackers || []).find((x) => x.id === id); if (!t) return;
      postTrackerApi({ action: 'add-row', world: worldId, id: t.id, row: trackerRowForItem(t, s.target.item) });
      finishTrackerAdd(s.card, t.name); // optimistic: confirm on the card, write in the background
    },
    newTrackerForItem: async () => {
      const s = trackerSheet; if (!s) return;
      setTrackerStatus('adding');
      const cj = await postTrackerApi({ action: 'create', world: worldId, name: s.target.name, scope: s.target.scope, template: 'mission' });
      const t = cj?.tracker; if (!t) { setTrackerStatus(null); return; }
      postTrackerApi({ action: 'add-row', world: worldId, id: t.id, row: trackerRowForItem(t, s.target.item) });
      finishTrackerAdd(s.card, t.name);
    },
  }), [trackerSheet, worldId, finishTrackerAdd]);

  // Agents accordion (top of Home): one "Agents" row that expands its roster in place,
  // default collapsed so the front door stays calm. (Decided 2026-06-23.)
  const [agentsOpen, setAgentsOpen] = useState(false);
  // All Rooms is built for hundreds: show a first page of projects with a real
  // "Show N more" that expands the rest in place (default collapsed = calm front door).
  const [projShowAll, setProjShowAll] = useState(false);
  // Keyboard navigation state (desktop only): tracks selected row in All Rooms list.
  // -1 = nothing selected. 0..agentsLen-1 = agents. agentsLen..agentsLen+projLen-1 = projects.
  const [knavSelectedIdx, setKnavSelectedIdx] = useState(-1);
  // Track keyboard nav room open state and which room is opened for col3 view.
  // null = no room open. 'col3' = room displayed in Conversation col. 'full' = full Chat opened.
  const [knavRoomOpenState, setKnavRoomOpenState] = useState(null);
  const [knavOpenedRoom, setKnavOpenedRoom] = useState(null); // shape: { id, name, initials, isProject, ... }
  // The key (a:<id> / rec:<key> / p:<slug> / m:<missionSlug>) of the node currently shown in
  // col3, so a second → on the SAME node opens its full chat (Patrik 2026-06-25 arrow spec).
  const [knavOpenedKey, setKnavOpenedKey] = useState(null);
  // navNodes is the single ordered list the arrow keys walk (recent + agents + projects +
  // each expanded project's missions), kept in a ref so the keydown handler reads the live
  // list without re-subscribing. Built in render from the same data the rows render from.
  const navNodesRef = useRef([]);
  // Real conversation for the col3 quick reply room (desktop): load the opened room's actual
  // thread so selecting a room shows real messages, not a mockup (Patrik 2026-06-25). Same
  // useRoomThread the full Chat tool uses, so the quick panel and the full chat agree.
  const quickThread = useRoomThread(worldId, knavOpenedRoom);
  const quickSend = quickThread && quickThread.send;
  // Live goal thread for the col3 quick room — feeds Cv6QuickThread's live step loader so the
  // quick reply shows the same ticking progress the full Chat tool does (Patrik #1, 2026-06-26).
  const quickGoal = useGoalThread(worldId, knavOpenedRoom);
  // Pin the col3 quick chat to the newest message: when a room opens or a message lands, scroll
  // the thread to the bottom (Patrik 2026-06-25: it was loading at the top). rAF so it runs after
  // the template engine paints the new rows. The thread element only exists on desktop home.
  const quickLen = (quickThread && quickThread.messages && quickThread.messages.length) || 0;
  useEffect(() => {
    // Keep the col3 thread pinned to its newest message for AS LONG AS the room is
    // open, not just at load. The home template re-binds on every realtime tick
    // (TemplateScreen resets innerHTML), rebuilding the thread DOM and resetting
    // scrollTop — a one-shot pin let the view "jump back to the middle" seconds
    // later. This stays attached and re-pins on every DOM change, but only while
    // the user is at the bottom (a `stick` intent flag), so scrolling up to read
    // history is never yanked back down.
    if (!knavOpenedRoom) return undefined;
    const stick = { current: true };
    const getEl = () => document.querySelector('[data-screen="convo"] .convo-thread');
    const pin = () => { if (!stick.current) return; const el = getEl(); if (el) el.scrollTop = el.scrollHeight; };
    // Capture phase so the listener still fires on the recreated node; records the
    // user's stick intent from where they left the scroll.
    const onScroll = (e) => { const el = getEl(); if (!el || e.target !== el) return; stick.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 90; };
    document.addEventListener('scroll', onScroll, true);
    const obs = new MutationObserver(() => requestAnimationFrame(pin));
    obs.observe(document.body, { childList: true, subtree: true });
    requestAnimationFrame(pin);
    return () => { document.removeEventListener('scroll', onScroll, true); obs.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knavOpenedKey, knavOpenedRoom]);
  // col3 quick-reply composer host (Patrik 2026-06-25): the composer is now the React
  // Cv6Composer (CV4-style pill + slash commands + send), portaled into the template's
  // [data-cv6-composer] node. The template re-binds on every realtime tick / new message,
  // recreating that node, so we track it with a MutationObserver and re-point the portal;
  // the Cv6Composer instance persists (kept mounted in JSX) so typed text survives a re-bind.
  const [composerHost, setComposerHost] = useState(null);
  useEffect(() => {
    if (!isDesktop) { setComposerHost(null); return undefined; }
    const pick = () => {
      const el = document.querySelector('[data-screen="home-desktop"] [data-cv6-composer]');
      setComposerHost((prev) => (prev === el ? prev : (el || null)));
    };
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [isDesktop]);
  // col3 quick-reply thread host: the message list is React (Cv6QuickThread) portaled into
  // the template's emptied .convo-thread, so attachments render as cards (same pattern as the
  // composer host). Tracked across template re-binds with a MutationObserver.
  const [threadHost, setThreadHost] = useState(null);
  useEffect(() => {
    if (!isDesktop) { setThreadHost(null); return undefined; }
    const pick = () => {
      const el = document.querySelector('[data-screen="convo"] .convo-thread');
      setThreadHost((prev) => (prev === el ? prev : (el || null)));
    };
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [isDesktop]);
  // Files panel host: a STABLE data-cv6-keep anchor inside the Conversation column, NOT the
  // column itself. Earlier this portaled into [data-screen="convo"] and set position:relative
  // imperatively — but the column is rebuilt on every ~2.5s realtime re-bind, so that inline
  // position got wiped and the overlay momentarily escaped its column (it read as a separate
  // third column). The .home-files node is grafted back across re-binds like the thread/composer
  // hosts, so the portal target never changes; the overlay anchors via .convo{position:relative}
  // in CSS. filesOpen toggles it; it auto-closes when the open room changes/closes.
  const [convoColHost, setConvoColHost] = useState(null);
  const [filesOpen, setFilesOpen] = useState(false);
  useEffect(() => {
    if (!isDesktop) { setConvoColHost(null); return undefined; }
    const pick = () => {
      const el = document.querySelector('[data-screen="convo"] .home-files');
      setConvoColHost((prev) => (prev === el ? prev : (el || null)));
    };
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [isDesktop]);
  // Close the files panel whenever the open room changes (or no room is open), so it never
  // shows a stale room's files.
  useEffect(() => { setFilesOpen(false); }, [knavOpenedKey]);
  const catchUpHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 5 }), []);

  const homeHtml = useMemo(
    () => (isDesktop
      ? composeScreen(homeDesktopRaw, { mobile: false, pick: 0, sharedNav: true })
      : composeScreen(homeMobileRaw, { mobile: true, pick: 0 })),
    [isDesktop],
  );
  const projectHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 1 }), []);
  const missionHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 2 }), []);

  // Keyboard navigation for All Rooms list (desktop only). Combines agents + projects
  // into a single list for ↑/↓ navigation. → opens quick chat (col 3), → again opens full Chat.
  // ← steps back. Arrow keys only work when NOT typing in an input/search.
  useEffect(() => {
    if (!isDesktop) return; // keyboard nav desktop-only
    const handleKeyDown = (e) => {
      // Guard: ignore if focused on a text input, EXCEPT the quick-reply composer.
      // We focus the composer on room open so you can type immediately; the arrows
      // must still navigate from there. So: while the composer is EMPTY, let the arrow
      // keys drive navigation; the moment you've typed something, the arrows go back to
      // moving the cursor inside the box (we bail). Other inputs (search, ⌘K) always bail.
      const focused = document.activeElement;
      const inComposer = !!(focused && focused.closest && focused.closest('[data-cv6-composer]'));
      const composerHasText = inComposer && !!((focused.value || focused.textContent || '').trim());
      const isOtherTextInput = focused && !inComposer && (
        focused.tagName === 'INPUT' ||
        focused.tagName === 'TEXTAREA' ||
        focused.contentEditable === 'true' ||
        focused.getAttribute('role') === 'searchbox' ||
        focused.closest('[role="combobox"]') // ⌘K palette
      );
      if (isOtherTextInput) return;
      if (inComposer && composerHasText) return; // typed something → arrows move the cursor

      const nodes = navNodesRef.current || [];
      if (!nodes.length) return;
      const openCol3 = (node) => { setKnavOpenedRoom(node.roomObj); setKnavRoomOpenState('col3'); setKnavOpenedKey(node.key); };
      const openFull = (node) => { onOpenRoom?.(node.roomObj, worldId); setKnavRoomOpenState('full'); };

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKnavSelectedIdx((prev) => (prev <= 0 ? 0 : prev - 1)); // move only; folder + col3 persist
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Start at the top (recent) from nothing, then step down — into a project's missions
        // when its folder is open (they sit right under it in navNodes).
        setKnavSelectedIdx((prev) => (prev < 0 ? 0 : Math.min(prev + 1, nodes.length - 1)));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (knavSelectedIdx < 0 || knavSelectedIdx >= nodes.length) { setKnavSelectedIdx(0); return; }
        const node = nodes[knavSelectedIdx];
        if (node.kind === 'project') {
          const expanded = expandedHomeProjects.has(node.id);
          if (!expanded) {
            // First → on a project: fan the folder open AND open its chat in col3.
            setExpandedHomeProjects((prev) => { const n = new Set(prev); n.add(node.id); return n; });
            openCol3(node);
          } else if (knavOpenedKey === node.key && knavRoomOpenState === 'col3') {
            openFull(node); // → again on the same project (nothing typed): full chat tool
          } else {
            openCol3(node);
          }
        } else if (node.kind === 'mission' && node.isFolder) {
          // A mission that is itself a folder (has sub-missions) expands on → like a project:
          // first → fans it open AND opens its chat in col3; → again opens the full chat tool.
          const expanded = expandedHomeNodes.has(node.id);
          if (!expanded) {
            setExpandedHomeNodes((prev) => { const n = new Set(prev); n.add(node.id); return n; });
            openCol3(node);
          } else if (knavOpenedKey === node.key && knavRoomOpenState === 'col3') {
            openFull(node);
          } else {
            openCol3(node);
          }
        } else if (knavOpenedKey === node.key && knavRoomOpenState === 'col3') {
          openFull(node); // → again on a recent/mission/agent already in col3: full chat tool
        } else {
          openCol3(node); // first → on a recent/mission/agent: quick chat in col3
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const node = (knavSelectedIdx >= 0 && knavSelectedIdx < nodes.length) ? nodes[knavSelectedIdx] : null;
        if (knavRoomOpenState === 'full') {
          setKnavRoomOpenState('col3'); // ← out of the full chat tool, back to the col3 list
        } else if (node && node.kind === 'project' && expandedHomeProjects.has(node.id)) {
          // ← on an open folder closes it; selection stays so ↓ goes to the next project.
          setExpandedHomeProjects((prev) => { const n = new Set(prev); n.delete(node.id); return n; });
          setKnavOpenedRoom(null); setKnavRoomOpenState(null); setKnavOpenedKey(null);
        } else if (node && node.kind === 'mission' && node.isFolder && expandedHomeNodes.has(node.id)) {
          // ← on an open sub-folder mission closes it; selection stays on the folder row.
          setExpandedHomeNodes((prev) => { const n = new Set(prev); n.delete(node.id); return n; });
          setKnavOpenedRoom(null); setKnavRoomOpenState(null); setKnavOpenedKey(null);
        } else if (knavRoomOpenState === 'col3') {
          setKnavOpenedRoom(null); setKnavRoomOpenState(null); setKnavOpenedKey(null);
        } else {
          setKnavSelectedIdx(-1); // nothing open -> deselect (back to the top)
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, knavSelectedIdx, knavRoomOpenState, knavOpenedKey, expandedHomeProjects, expandedHomeNodes, onOpenRoom, worldId]);

  // When a room opens in the quick-reply column (keyboard → or a click), drop the
  // cursor straight into its composer so you can type without clicking. The keydown
  // guard above keeps the arrows live while the box is empty, so you can keep moving.
  useEffect(() => {
    if (!isDesktop || !knavOpenedRoom || knavRoomOpenState !== 'col3') return undefined;
    // The composer portal mounts a beat after the room opens, and a template re-bind can
    // briefly steal focus back to <body>. So re-apply focus for a short window WHENEVER
    // nothing is focused, and stop the moment the composer holds it or the user has
    // clicked into something else — never fight the user for the cursor.
    let cancelled = false; let tries = 0;
    const tick = () => {
      if (cancelled) return;
      tries += 1;
      const host = document.querySelector('[data-screen="home-desktop"] [data-cv6-composer]');
      const el = host && (host.querySelector('textarea') || host.querySelector('input[type="text"]') || host.querySelector('input:not([type="file"]):not([type="hidden"])'));
      const active = document.activeElement;
      const userElsewhere = active && active !== document.body && !(active.closest && active.closest('[data-cv6-composer]')) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (el && active === document.body) { try { el.focus(); } catch (_) { /* noop */ } }
      if (tries < 24 && !userElsewhere) timer = setTimeout(tick, 90);
    };
    let timer = setTimeout(tick, 60);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isDesktop, knavOpenedRoom, knavRoomOpenState]);

  // Keep the keyboard-selected row visible: when selection moves (incl. into a freshly
  // expanded sub-folder), scroll it into the rooms list so arrow nav never walks off-screen.
  useEffect(() => {
    if (!isDesktop || knavSelectedIdx < 0) return undefined;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('[data-screen="home-desktop"] .scrollcap [data-knav="sel"]');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [knavSelectedIdx, isDesktop, expandedHomeProjects, expandedHomeNodes]);

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
    // Tap an agent/project on Home. Desktop: open it in the col3 "quick reply room" (stay on
    // Home), NOT a jump to the full chat tool (Patrik 2026-06-25: a click should open the quick
    // reply room). Mobile keeps its own project-detail screen. A second open / the keyboard's
    // second → takes you into the full chat tool.
    openRoom: (id) => {
      const agent = (data.agents || []).find((a) => a.id === id);
      if (agent) {
        if (isDesktop) { setKnavOpenedRoom(agent); setKnavRoomOpenState('col3'); setKnavOpenedKey(`a:${agent.id}`); }
        else onOpenRoom?.(agent, worldId);
        return;
      }
      const proj = (data.projects || []).find((p) => p.id === id);
      if (!proj) return;
      if (isDesktop) {
        const roomObj = { id: proj.slug || proj.id, name: proj.name, initials: (proj.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: proj.status || 'ready', statusText: 'project chat' };
        setKnavOpenedRoom(roomObj); setKnavRoomOpenState('col3'); setKnavOpenedKey(`p:${proj.id}`);
        setExpandedHomeProjects((prev) => { const n = new Set(prev); n.add(proj.id); return n; });
      } else {
        setOpenedProjectId(id);
      }
    },
    // Tap a recently-active row -> open it in the col3 quick reply room (desktop) or its real
    // conversation (mobile). Keyed lookup so a project slug and an agent id never collide.
    openRecent: (key) => {
      const r = (data.recent || []).find((x) => x.key === key || x.id === key);
      if (!r) return;
      let roomObj;
      if (r.kind === 'mission') {
        const slug = String(r.missionSlug || '');
        roomObj = { id: slug.split(':').pop(), name: r.name, initials: (r.name || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug: slug, projectSlug: slug.split(':')[0], status: 'ready', statusText: r.sub || slug.split(':')[0] };
      } else if (r.kind === 'project') {
        roomObj = { id: r.project, name: r.name, initials: (r.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: 'ready', statusText: 'project chat' };
      } else {
        roomObj = (data.agents || []).find((a) => a.id === r.agent) || { id: r.agent || r.id, name: r.name, initials: (r.name || '?').slice(0, 2).toUpperCase(), status: 'ready' };
      }
      if (isDesktop) { setKnavOpenedRoom(roomObj); setKnavRoomOpenState('col3'); setKnavOpenedKey(`rec:${r.key}`); }
      else onOpenRoom?.(roomObj, worldId);
    },
    // Desktop Home: tap a project folder to fan its missions open inline AND open its chat in
    // col3. Mobile keeps its own project-detail screen.
    toggleProjectMissions: (id) => {
      if (!isDesktop) { setOpenedProjectId(id); return; }
      const proj = (data.projects || []).find((p) => p.id === id);
      setExpandedHomeProjects((prev) => {
        const n = new Set(prev);
        if (n.has(id)) { n.delete(id); setKnavOpenedRoom(null); setKnavRoomOpenState(null); setKnavOpenedKey(null); }
        else {
          n.add(id);
          if (proj) { setKnavOpenedRoom({ id: proj.slug || proj.id, name: proj.name, initials: (proj.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: proj.status || 'ready', statusText: 'project chat' }); setKnavRoomOpenState('col3'); setKnavOpenedKey(`p:${id}`); }
        }
        return n;
      });
    },
    showAllMissions: (id) => setMissionShowAll((prev) => (prev.has(id) ? prev : new Set(prev).add(id))),
    toggleMissionNode: (id) => setExpandedHomeNodes((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    // Tap a mission row -> open that mission in the col3 quick reply room (desktop) or its real
    // chat (mobile).
    openMissionRow: (id) => {
      const missionSlug = String(id || '');
      if (!missionSlug) return;
      const projectSlug = missionSlug.split(':')[0];
      const proj = (data.projects || []).find((p) => p.slug === projectSlug || p.id === projectSlug);
      const list = missionsByProject[projectSlug] || [];
      const m = list.find((x) => (String(x.slug || '').includes(':') ? x.slug : `${projectSlug}:${x.slug}`) === missionSlug);
      const rawName = String(m?.name || missionSlug.split(':').pop() || '');
      const name = rawName.includes(':') ? rawName.slice(rawName.lastIndexOf(':') + 1).trim() : rawName;
      const roomObj = { id: missionSlug.split(':').pop(), name, initials: (name || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug, projectSlug, status: 'ready', statusText: proj?.name || projectSlug };
      if (isDesktop) { setKnavOpenedRoom(roomObj); setKnavRoomOpenState('col3'); setKnavOpenedKey(`m:${missionSlug}`); }
      else onOpenRoom?.(roomObj, worldId);
    },
    toggleAgents: () => setAgentsOpen((o) => !o),
    openCatchUp: () => { setCatchUpIndex(0); setCatchUpOpen(true); },
    nextCatchUp: () => setCatchUpIndex((i) => Math.min(i + 1, Math.max(0, (data.catchUp?.all?.length || 1) - 1))),
    prevCatchUp: () => setCatchUpIndex((i) => Math.max(0, i - 1)),
    snoozeCatchUp: () => setCatchUpIndex((i) => Math.min(i + 1, Math.max(0, (data.catchUp?.all?.length || 1) - 1))),
    snoozeAll: () => setCatchUpOpen(false),
    // Clear a Catch Up item for good (per-device). The id comes through a real data
    // path (catchUp.current.id), so it arrives correctly. The card drops out of the deck.
    dismissCatchUp: (id) => {
      if (!id) return;
      setCatchUpDismissed((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        try { localStorage.setItem('cv6.catchup.dismissed', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    },
    // Search opens the command palette (room/agent search), not the nav menu.
    openCommandK: () => (onCommandK ? onCommandK() : onOpenNav?.()), search: () => (onCommandK ? onCommandK() : onOpenNav?.()), openNav: () => onOpenNav?.(),
    openNotifications: () => {}, openProfile: () => {}, toggleTheme: () => {},
    // All-rooms "New" → open the Start-a-mission composer (CV6 design). Default it to a
    // mission in the first project with Auto-assign; the user can flip to New project inside.
    newRoom: () => {
      // Freeze the project/agent lists into the composer state so a realtime data tick can't
      // re-bind the overlay and wipe a half-typed goal (the picks ride a ref, not live data).
      const projSnap = (data.projects || []).map((p) => ({ id: p.id, slug: p.slug || p.id, name: p.name }));
      const agentSnap = (data.agents || []).map((a) => ({ id: a.id, name: a.name }));
      const first = projSnap[0];
      composerSelRef.current = { mode: 'mission', projectId: first ? first.slug : '', agentId: '__auto', agentName: '', priority: 'med', when: 'now' };
      setComposer({ mode: 'mission', projects: projSnap, agents: agentSnap });
    },
    showMoreProjects: () => setProjShowAll(true),
    // Catch Up deck navigation (desktop arrows + mobile next). Clamp against the LIVE deck
    // length (inbox minus device-dismissed) so the arrows never run past the last card.
    catchUpPrev: () => setCatchUpIndex((i) => Math.max(0, i - 1)),
    catchUpNext: () => setCatchUpIndex((i) => {
      const n = (data.catchUp?.all || []).filter((c) => !catchUpDismissed.includes(c.id)).length;
      return Math.min(i + 1, Math.max(0, n - 1));
    }),
    // Draft reply opens an inline composer in the card (the action buttons make way); Send
    // posts the reply into that room. cancelReply closes it. sendReply reads the uncontrolled
    // textarea from the DOM at click time so typing survives re-renders.
    draftReply: () => setReplyOpen(true),
    cancelReply: () => setReplyOpen(false),
    sendReply: (_arg, e) => {
      const ta = e?.currentTarget?.closest('.creply')?.querySelector('.creply-input');
      const v = ta && ta.value;
      if (v && v.trim()) sendCatchupReply(v);
    },
    addToTracker: () => addToTracker(), assignAgent: () => {}, snooze: () => {},
    // "Go to room" (Patrik 2026-06-25, replacing the dead "Send to agent"): open the card's
    // own conversation — the mission thread, else the project chat, else the agent thread.
    goToRoom: () => {
      const card = curCardRef.current;
      if (!card) return;
      if (card.missionSlug) {
        const slug = String(card.missionSlug);
        const missionSlug = slug.includes(':') ? slug : `${card.project}:${slug}`;
        const name = card.subject || slug.split(':').pop();
        onOpenRoom?.({ id: slug.split(':').pop(), name, initials: (name || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug, projectSlug: card.project, status: 'ready', statusText: card.from }, worldId);
        return;
      }
      if (card.project) {
        onOpenRoom?.({ id: card.project, name: card.from, initials: (card.from || '?').slice(0, 2).toUpperCase(), isProject: true, status: 'ready', statusText: 'project chat' }, worldId);
        return;
      }
      const agent = (data.agents || []).find((a) => a.id === card.agent) || { id: card.agent || card.id, name: card.from, initials: (card.from || '?').slice(0, 2).toUpperCase(), status: 'ready' };
      onOpenRoom?.(agent, worldId);
    },
    // Attachment cards: tapping the file (or Review) opens the Review tool ON that file.
    // The card carries only the filename + its room, so we hand Review { name, project,
    // missionSlug } and let it resolve the real deliverable in the queue.
    review: (fileId) => { const c = curCardRef.current; onNav?.('review', fileId ? { name: String(fileId), project: c?.project || '', missionSlug: c?.missionSlug || '' } : null); },
    openAttachment: (fileId) => { const c = curCardRef.current; onNav?.('review', fileId ? { name: String(fileId), project: c?.project || '', missionSlug: c?.missionSlug || '' } : null); },
    voiceInput: () => {}, composeMessage: () => {},
    // Files button in the col3 conversation header: open the room's file shelf in place
    // (HomeFilesPanel overlay), instead of jumping to the Organize tool. Only meaningful when
    // a room is open in col3; harmless otherwise.
    toggleFiles: () => setFilesOpen((o) => !o),
    // Send a quick reply from the col3 room panel: read the uncontrolled input and post into the
    // opened room via the same thread the full Chat uses (Patrik: the quick reply room should work).
    sendMessage: (_arg, e) => {
      const root = e?.currentTarget?.closest('.composer') || document.querySelector('[data-screen="convo"] .composer');
      const inp = root && root.querySelector('.convo-input');
      const v = inp && inp.value;
      if (v && v.trim() && quickSend) { quickSend(v.trim()); if (inp) inp.value = ''; }
    },
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
  }), [onNav, onOpenRoom, onOpenNav, onCommandK, data.projects, data.agents, data.recent, data.catchUp, worldId, isDesktop, openedProject, catchUpOpen, openedProjectId, missionsByProject, catchUpDismissed, sendCatchupReply, addToTracker, quickSend]);

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

  // Start-a-mission / New-project composer actions. Field picks (project/agent/priority/when)
  // are written to composerSelRef AND toggled on the DOM directly — no setState — so the
  // uncontrolled goal/name/about boxes are never wiped mid-edit by a re-bind. Only the mode
  // toggle (which swaps the whole field set anyway) goes through React state.
  const composerActions = useMemo(() => ({
    closeComposer: () => setComposer(null),
    setComposerMode: (mode) => {
      const m = mode === 'project' ? 'project' : 'mission';
      composerSelRef.current = { ...composerSelRef.current, mode: m };
      setComposer((c) => ({ ...c, mode: m })); // keep the frozen project/agent lists
    },
    pickComposerProject: (slug, e) => {
      composerSelRef.current.projectId = slug;
      composerFormRef.current?.querySelectorAll('.cmp-projrow').forEach((r) => r.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    pickComposerAgent: (id, e) => {
      composerSelRef.current.agentId = id;
      const nm = e?.currentTarget?.querySelector('span')?.textContent?.trim() || '';
      composerSelRef.current.agentName = (id === '__auto') ? '' : nm; // Auto = let the room route it
      composerFormRef.current?.querySelectorAll('.cmp-agrow').forEach((r) => r.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    setComposerPriority: (v, e) => {
      composerSelRef.current.priority = v;
      composerFormRef.current?.querySelectorAll('.cmp-pri button').forEach((b) => b.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    setComposerWhen: (v, e) => {
      composerSelRef.current.when = v;
      composerFormRef.current?.querySelectorAll('.cmp-when button').forEach((b) => b.classList.remove('is-on'));
      e?.currentTarget?.classList.add('is-on');
    },
    submitComposer: () => {
      const root = composerFormRef.current;
      const sel = composerSelRef.current;
      if (sel.mode === 'project') {
        const name = root?.querySelector('[data-bind="draft.name"]')?.value?.trim() || '';
        const about = root?.querySelector('[data-bind="draft.about"]')?.value?.trim() || '';
        if (!name) return; // a project needs a name
        createProjectFromHome({ worldId, name, about });
        setComposer(null);
        setMissionReload((k) => k + 1);
        return;
      }
      const goal = root?.querySelector('[data-bind="draft.goal"]')?.value?.trim() || '';
      if (!goal) return; // a mission needs a goal (its first line becomes the title)
      const projectSlug = sel.projectId;
      if (!projectSlug) return; // a mission must live in a project
      const title = goal.split('\n')[0].slice(0, 80);
      const priLabel = { low: 'Low', med: 'Medium', high: 'High' }[sel.priority] || '';
      const whenLabel = { now: 'Now', 'this-week': 'This week' }[sel.when] || '';
      createMissionInProject({ worldId, projectSlug, title, goal, agentName: sel.agentName || '', priority: priLabel, when: whenLabel });
      setComposer(null);
      setMissionReload((k) => k + 1);
    },
  }), [worldId]);

  // Card footer state drives the bottom of the catch-up card: 'none' = caught up (hide it),
  // 'actions' = the suggested-action buttons, 'reply' = the inline reply composer.
  const catchUpRender = {
    ...liveCatchUpView,
    colState: catchColState,
    footerState: replyWorking ? 'working'
      : !liveCatchUpView.count ? 'none'
        : trackerStatus === 'adding' ? 'adding'
          : trackerStatus === 'added' ? 'added'
            : (replyOpen ? 'reply' : 'actions'),
    statusText: replyWorking ? replyWorking.label
      : trackerStatus === 'added' ? `Added to ${trackerAddedName}` : 'Adding to tracker…',
  };

  // Add-to-Tracker overlay: the pick-a-tracker bottom drawer. Rendered over whatever surface
  // shows the catch-up card (Home + the full-deck), so the action works everywhere the button
  // appears. The drawer only opens when one+ trackers already exist for the mission; otherwise
  // addToTracker creates silently and the card's own 'adding'/'added' state is the feedback.
  const trackerSheetData = trackerSheet
    ? { sheet: { title: 'Add to Tracker', missionLine: trackerSheet.missionLine },
        trackers: (trackerSheet.trackers || []).map((t) => ({ id: t.id, name: t.name, scope: t.scope || '', count: Array.isArray(t.rows) ? t.rows.length : 0 })) }
    : { sheet: { title: '', missionLine: '' }, trackers: [] };
  const trackerOverlay = trackerSheet ? (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
      <TemplateScreen html={ADD_TRACKER_SHEET_HTML} data={trackerSheetData} actions={trackerSheetActions} state="ready"
        aliases={ADD_TRACKER_ALIASES} style={{ width: '100%', height: '100%' }} />
    </div>
  ) : null;

  if (catchUpOpen) {
    // Clicking Catch Up opens the actual conversation for the item that needs Patrik
    // (his ask 2026-06-26), not a card deck. Prev/next walk the needs-you items; the
    // dimmed Home ground sits behind so it reads as a focused modal.
    const cur = liveCatchUpView.current;
    const total = liveCatchUpView.all?.length || 0;
    const goToRoom = () => { const r = cardToRoom(cur); if (r) onOpenRoom?.(r, worldId); setCatchUpOpen(false); };
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--ground)' }} />
        <CatchUpModal card={cur} worldId={worldId} idx={catchUpIndex} total={total}
          onPrev={actions.prevCatchUp} onNext={actions.nextCatchUp} onClose={() => setCatchUpOpen(false)}
          onGoToRoom={goToRoom} />
        {trackerOverlay}
      </div>
    );
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
  const allProjects = data.projects || [];
  const projShown = projShowAll ? allProjects.slice() : allProjects.slice(0, PROJ_LIMIT);
  // arrays carry their bound scalars as props (the engine reads projects.count /
  // projects.moreCount / projects.moreState); set them on the sliced array we pass
  // through. count = the TRUE total (header "Projects · N"), independent of how many
  // rows are shown; moreCount = how many are still hidden.
  projShown.count = allProjects.length;
  projShown.moreCount = projShowAll ? 0 : Math.max(0, allProjects.length - PROJ_LIMIT);
  projShown.moreState = projShown.moreCount > 0 ? 'has' : 'none';

  // Build the navigable model the arrow keys walk, in the SAME visual order the rows render:
  // agents (when open) -> recent -> each project (and its missions when the folder is open).
  // navNodes is the single source of truth; the rows tag knavSel from the selected node's key,
  // and the keydown handler reads navNodes via navNodesRef. (Patrik 2026-06-25 arrow spec.)
  const recentList = data.recent || [];
  const agentsList = agentsOpen ? (data.agents || []) : [];
  const HOME_MISSION_CAP = 8;
  // Corner's top-level rooms mirror the top nav exactly: the 8 tools in nav order
  // first, then the 3 grouping folders (General / Business Ops / Older Versions).
  // So the sidebar tree reads like the nav bar, and no tool hides behind "Show more".
  const CORNER_NAV_ORDER = ['home', 'chat', 'organize', 'review', 'support', 'tracker', 'command', 'live-scribe'];
  const cornerRootRank = (node) => {
    const raw = String(node.slug || node.name || '').split(':').pop().toLowerCase();
    const i = CORNER_NAV_ORDER.indexOf(raw);
    return i >= 0 ? i : CORNER_NAV_ORDER.length; // groups sort after all tools
  };
  const cornerRootSort = (nodes) => [...(nodes || [])].sort((a, b) => {
    const ra = cornerRootRank(a); const rb = cornerRootRank(b);
    if (ra !== rb) return ra - rb;
    return missionLabelClean(a.name || a.slug).localeCompare(missionLabelClean(b.name || b.slug));
  });
  const missionDotStatus = (s) => (['running', 'building', 'active'].includes(String(s || '').toLowerCase()) ? 'live' : 'ready');
  // The project is already the folder above, so drop a "Parent:" prefix from the mission name.
  const missionLabelClean = (n) => { const s = String(n || ''); return (s.includes(':') ? s.slice(s.lastIndexOf(':') + 1).trim() : s) || s; };
  const projRoomObj = (p) => ({ id: p.slug || p.id, name: p.name, initials: (p.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: p.status || 'ready', statusText: 'project chat' });
  const missionRoomObj = (missionSlug, name, projName) => { const slug = String(missionSlug || ''); const short = missionLabelClean(name || slug.split(':').pop()); return { id: slug.split(':').pop(), name: short, initials: (short || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug: slug, projectSlug: slug.split(':')[0], status: 'ready', statusText: projName || slug.split(':')[0] }; };
  const recentRoomObj = (r) => {
    if (r.kind === 'mission') return missionRoomObj(r.missionSlug, r.name, r.sub);
    if (r.kind === 'project') return projRoomObj({ slug: r.project, name: r.name });
    return (data.agents || []).find((a) => a.id === r.agent) || { id: r.agent || r.id, name: r.name, initials: (r.name || '?').slice(0, 2).toUpperCase(), status: 'ready' };
  };

  // Flatten a recursive mission tree into depth-tagged rows. depth is 'd1' for
  // roots, 'd2' for children. Cap applies to roots only; expanded children always show.
  // Folders (missions that contain sub-missions) group ABOVE leaf missions at every level,
  // each group alphabetical — so a plain mission never sits wedged between two sub-folders.
  const sortMissions = (nodes) => [...(nodes || [])].sort((a, b) => {
    const af = (Array.isArray(a.children) && a.children.length) ? 0 : 1;
    const bf = (Array.isArray(b.children) && b.children.length) ? 0 : 1;
    if (af !== bf) return af - bf;
    return missionLabelClean(a.name || a.slug).localeCompare(missionLabelClean(b.name || b.slug));
  });
  // `sorter` orders THIS level (caller passes cornerRootSort for Corner's nav-order
  // roots); children always fall back to the generic folders-first sort.
  const flattenMissionTree = (nodes, depth, expandedNodes, p, sorter) => {
    const rows = [];
    for (const m of (sorter || sortMissions)(nodes)) {
      const id = String(m.slug || '').includes(':') ? m.slug : `${p.slug}:${m.slug}`;
      const hasChildren = Array.isArray(m.children) && m.children.length > 0;
      const isOpen = hasChildren && expandedNodes.has(id);
      rows.push({ id, name: missionLabelClean(m.name || m.slug), status: hasChildren ? (p.tint || 'violet') : missionDotStatus(m.status), depth: depth === 'd0' ? null : depth, caret: hasChildren ? (isOpen ? 'open' : 'closed') : 'none', isFolder: hasChildren, roomObj: missionRoomObj(id, m.name, p.name) });
      if (isOpen && hasChildren) rows.push(...flattenMissionTree(m.children, 'd2', expandedNodes, p));
    }
    return rows;
  };

  // per-project fan-open missions (only when the folder is open). Cap on ROOT nodes.
  const projShownNodes = projShown.map((p) => {
    const open = expandedHomeProjects.has(p.id);
    const isCorner = p.slug === 'corner';
    const tree = open ? (isCorner ? cornerRootSort(missionsByProject[p.slug] || []) : sortMissions(missionsByProject[p.slug] || [])) : [];
    // Corner's roots ARE the nav (8 tools + 3 groups) — show them all, never hide a tool.
    const cap = isCorner ? Math.max(HOME_MISSION_CAP, tree.length) : HOME_MISSION_CAP;
    const showAll = missionShowAll.has(p.id);
    const cappedTree = showAll ? tree : tree.slice(0, cap);
    const more = open && !showAll ? Math.max(0, tree.length - cap) : 0;
    const missions = flattenMissionTree(cappedTree, 'd1', expandedHomeNodes, p, isCorner ? cornerRootSort : undefined);
    return { p, open, missions, more };
  });

  // assemble navNodes (visual order) and stash for the keydown handler
  const navNodes = [];
  for (const a of agentsList) navNodes.push({ key: `a:${a.id}`, kind: 'agent', roomObj: a });
  for (const r of recentList) navNodes.push({ key: `rec:${r.key}`, kind: 'recent', roomObj: recentRoomObj(r) });
  for (const pn of projShownNodes) {
    navNodes.push({ key: `p:${pn.p.id}`, kind: 'project', id: pn.p.id, roomObj: projRoomObj(pn.p) });
    if (pn.open) for (const m of pn.missions) navNodes.push({ key: `m:${m.id}`, kind: 'mission', id: m.id, isFolder: m.isFolder, roomObj: m.roomObj });
  }
  navNodesRef.current = navNodes;
  const selectedKey = (knavSelectedIdx >= 0 && knavSelectedIdx < navNodes.length) ? navNodes[knavSelectedIdx].key : null;

  // tag rows from the selected node's key
  const recentWithNav = recentList.map((r) => ({ ...r, knavSel: selectedKey === `rec:${r.key}` ? 'sel' : 'off' }));
  recentWithNav.count = recentList.count != null ? recentList.count : recentWithNav.length;
  recentWithNav.has = recentWithNav.length ? 'has' : 'none';
  const agentsWithNav = agentsList.map((a) => ({ ...a, knavSel: selectedKey === `a:${a.id}` ? 'sel' : 'off' }));
  const projectsWithNav = projShownNodes.map((pn) => ({
    ...pn.p,
    knavSel: selectedKey === `p:${pn.p.id}` ? 'sel' : 'off',
    caret: pn.open ? 'open' : 'closed',
    missions: pn.missions.map((m) => ({ id: m.id, name: m.name, status: m.status, depth: m.depth, caret: m.caret, knavSel: selectedKey === `m:${m.id}` ? 'sel' : 'off' })),
    moreCount: pn.more,
    moreState: pn.more > 0 ? 'has' : 'none',
  }));

  // When a room is opened (click or keyboard), col3 shows that room's real conversation.
  const baseRoom = knavOpenedRoom || data.room || { name: '', initials: '', statusText: '', status: 'ready' };
  // Subtitle (Patrik 2026-06-25): mission -> its project name (the title is the mission name, so
  // together they read "Mission / Project"); project -> "Project chat"; agent -> "Direct chat".
  // No raw slugs.
  const roomSubtitle = baseRoom.isMission ? (baseRoom.statusText || baseRoom.projectSlug || 'Mission')
    : baseRoom.isProject ? 'Project chat'
      : (baseRoom.statusText || 'Direct chat');
  const displayedRoom = { ...baseRoom, subtitle: roomSubtitle };
  const displayedGoal = knavOpenedRoom
    ? { has: 'active', title: '', step: '', total: '', pct: 0, summary: [], checklist: [] }
    : (data.goal || { has: 'none', title: 'Pick a room to see its goal', step: '', total: '', pct: 0, summary: [], checklist: [] });
  // The opened room's real messages for the col3 quick chat (newest at the bottom).
  const convoMessages = (quickThread && quickThread.messages ? quickThread.messages : []).slice(-40).map((m) => ({
    initials: m.agentInitials || '·', tint: m.agentTint || 'violet', name: m.agentName || '', time: m.time || '', text: m.text || '',
  }));
  const convo = { messages: convoMessages, has: convoMessages.length ? 'has' : 'none', loading: knavOpenedRoom && !convoMessages.length ? 'on' : 'off' };

  const homeData = {
    ...data,
    catchUp: catchUpRender,
    agents: agentsWithNav,
    agentsTotal,
    agentsOpen: agentsOpen ? 'open' : 'closed',
    recent: recentWithNav,
    projects: projectsWithNav,
    room: displayedRoom,
    goal: displayedGoal,
    convo,
  };
  // Start-a-mission / New-project composer overlay (the All-rooms "New"). Highlights for the
  // current picks are computed fresh from the ref each render, so a mode toggle restores them.
  const composerMode = composer?.mode || 'mission';
  const csel = composerSelRef.current;
  const composerData = composer ? {
    composer: {
      mode: composerMode,
      title: composerMode === 'project' ? 'New project' : 'Start a mission',
      subtitle: composerMode === 'project' ? 'A home for related missions & files' : 'A room + an agent, pointed at one goal',
      ctaLabel: composerMode === 'project' ? 'Create project' : 'Start mission',
      tabMission: composerMode === 'mission' ? 'on' : 'off',
      tabProject: composerMode === 'project' ? 'on' : 'off',
      projects: (composer.projects || []).map((p) => ({ id: p.id, slug: p.slug, name: p.name, picked: (p.slug === csel.projectId) ? 'on' : 'off' })),
      agents: [{ id: '__auto', name: 'Auto', picked: (!csel.agentId || csel.agentId === '__auto') ? 'on' : 'off' }, ...(composer.agents || []).map((a) => ({ id: a.id, name: a.name, picked: (csel.agentId === a.id) ? 'on' : 'off' }))],
      priSel: { low: csel.priority === 'low' ? 'on' : 'off', med: csel.priority === 'med' ? 'on' : 'off', high: csel.priority === 'high' ? 'on' : 'off' },
      whenSel: { now: csel.when === 'now' ? 'on' : 'off', week: csel.when === 'this-week' ? 'on' : 'off' },
    },
  } : null;
  const composerOverlay = composer ? (
    <div ref={composerFormRef} style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
      <TemplateScreen html={NEW_COMPOSER_HTML} data={composerData} actions={composerActions} state="ready"
        aliases={NEW_COMPOSER_ALIASES} style={{ width: '100%', height: '100%' }} />
    </div>
  ) : null;
  return (
    <div ref={homeWrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={homeHtml} data={homeData} actions={actions} state={state}
        aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />
      {treeCtxOverlay}
      <Cv6QuickThread
        target={knavOpenedRoom ? threadHost : null}
        messages={(quickThread && quickThread.messages ? quickThread.messages : []).slice(-40)}
        blocks={quickThread && quickThread.blocks}
        goal={quickGoal}
        onSend={quickSend}
        awaiting={quickThread && quickThread.awaiting}
        liveSteps={quickThread && quickThread.liveSteps}
        room={displayedRoom}
        onReview={(f) => { const files = Array.isArray(f) ? f : (f && typeof f === 'object' ? [f] : null); onNav?.('review', files?.length ? { files } : null); }}
      />
      <Cv6FullComposer
        target={knavOpenedRoom ? composerHost : null}
        room={knavOpenedRoom}
        worldId={worldId}
        agents={data.agents}
        quickSend={quickSend}
        onClose={() => { setKnavOpenedRoom(null); setKnavRoomOpenState(null); setKnavOpenedKey(null); }}
      />
      <HomeFilesPanel
        host={filesOpen && knavOpenedRoom ? convoColHost : null}
        room={knavOpenedRoom}
        messages={quickThread && quickThread.messages}
        onClose={() => setFilesOpen(false)}
        onReview={(f) => { const files = Array.isArray(f) ? f : (f && typeof f === 'object' ? [f] : null); onNav?.('review', files?.length ? { files } : null); }}
      />
      {trackerOverlay}
      {composerOverlay}
    </div>
  );
}

// ── Chat list (mobile): the conversations list the Chat menu opens to ──
const CHATLIST_ALIASES = { agents: 'agent', projects: 'project' };
function ChatList({ onNav, onOpenRoom, onOpenProject, onOpenNav, onCommandK }) {
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
    // Search opens the room+agent palette, not the nav menu.
    search: () => (onCommandK ? onCommandK() : onOpenNav?.()), openNav: () => onOpenNav?.(),
    setFilter: (f) => setFilter(f || 'all'),
    // "New goal" from the list level: open the command palette (the room picker)
    // so you choose where to start — an honest jump to a real surface, not a faked
    // new-goal backend. Falls back to opening the nav if no palette is wired.
    newGoal: () => (onCommandK ? onCommandK() : onOpenNav?.()),
    openRoom: (id) => {
      const agent = allAgents.find((a) => String(a.id) === String(id));
      if (agent) { onOpenRoom?.(agent, worldId); return; }
      // A project row opens the project's home (missions + general chat), not a bare chat.
      const proj = allProjects.find((p) => String(p.id) === String(id));
      if (proj) onOpenProject?.(proj);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenNav, onOpenRoom, onOpenProject, onCommandK, allAgents, allProjects, worldId]);
  return <TemplateScreen html={html} data={view} actions={actions} state={state}
    aliases={CHATLIST_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Support inbox (the proven pilot), reachable from the nav ──
const SUPPORT_ALIASES = { needsYou: 'email', watching: 'email', 'email.tags': 'tag' };

const SUPPORT_THREAD_ALIASES = {};
function SupportInbox({ onNav, onOpenNav, onAssignEmail }) {
  const { state, data, reload } = useSupportInbox('aom');
  const html = useMemo(() => composeScreen(inboxRaw, { mobile: true }), []);
  const threadHtml = useMemo(() => composeScreen(supportThreadRaw, { mobile: true }), []);
  // Tapping an email opens its thread view (P9). openEmailId holds the opened ask; null = inbox list.
  const [openEmailId, setOpenEmailId] = useState(null);
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
    openThread: (id) => setOpenEmailId(id), search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
    nav: (t) => onNav?.(t), browseWatching: () => setFilter('watching'), emptyAction: () => {},
    setFilter: (f) => setFilter(f || 'all'),
    retry: () => reload(), viewOffline: () => {},
    assignAgent: (emailId) => onAssignEmail?.(emailId),
  }), [onNav, onOpenNav, reload, onAssignEmail]);

  // Opened-thread view: find the tapped ask and render its real email. Back returns to the list.
  const openedEmail = useMemo(() => {
    if (!openEmailId) return null;
    const all = [...(data.needsYou || []), ...(data.watching || [])];
    return all.find((e) => String(e.id) === String(openEmailId)) || null;
  }, [openEmailId, data.needsYou, data.watching]);
  const threadData = useMemo(() => {
    const e = openedEmail || {};
    const n = e.threadCount || 1;
    return {
      thread: {
        subject: e.subject || 'Conversation',
        sender: e.sender || (e.snippet || '').split(' · ')[0] || 'Sender',
        senderSub: e.senderSub || 'to you',
        countLabel: `${e.sender || 'Sender'} · ${n} message${n === 1 ? '' : 's'}`,
        time: e.time || '',
        body: e.body || (e.snippet || '').split(' · ').slice(1).join(' · ') || 'No message body.',
        initials: e.initials || '·', avatarTint: e.avatarTint || 'violet',
      },
    };
  }, [openedEmail]);
  const threadActions = useMemo(() => ({
    closeThread: () => setOpenEmailId(null), nav: (t) => { setOpenEmailId(null); onNav?.(t); },
    search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
  }), [onNav, onOpenNav]);

  if (openEmailId && openedEmail) {
    return <TemplateScreen html={threadHtml} data={threadData} actions={threadActions} state="ready"
      aliases={SUPPORT_THREAD_ALIASES} style={{ width: 'min(420px, 100%)', height: '100%', margin: '0 auto' }} />;
  }
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

  // If demo mode, use demo feed; otherwise use real thread (ONE hook call, not two).
  const rt = isDemo ? null : useRoomThread(worldId, room);
  const messages = isDemo ? demoFeed : rt.messages;
  const status = isDemo ? 'ready' : rt.status;
  const send = isDemo ? () => {} : rt.send;
  const liveSteps = isDemo ? [] : rt.liveSteps; // the agent's real activity, for the building live thread
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
    handoffAgent: () => {}, addContext: () => {}, addAttachment: () => {},
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
      messages={messages} status={status} goal={liveThread ? goal : null} liveSteps={liveSteps}
      awaiting={isDemo ? false : rt.awaiting}
      onBack={() => onNav('back')} onOpenNav={() => onOpenNav?.()} onSend={(t) => send?.(t)}
      onOpenReview={(files) => onNav('review', files?.length ? { files, project: room?.projectSlug || (room?.isProject ? room?.id : '') } : null)}
    />
  );
}

// ── Command (mobile): real activity dock (running jobs); goal ledger honest ──
const COMMAND_ALIASES = {
  'activity.jobs': 'job', 'goal.checklist': 'step',
  'ledger.others': 'room', 'ledger.rooms': 'room', watchers: 'watcher',
};
function Command({ worldId, onNav, onOpenNav, onOpenRoom }) {
  const { state, data, toggleWatcher } = useCommand(worldId);
  const isDesktop = useIsDesktop();
  const html = useMemo(() => composeScreen(commandRaw, { mobile: !isDesktop, pick: isDesktop ? 0 : 1, sharedNav: isDesktop }), [isDesktop]);
  const actions = useMemo(() => {
    // Tapping a ledger row opens that room's conversation (room.id = the project slug).
    const openRoomById = (id) => {
      const rooms = data?.ledger?.rooms || [];
      const r = rooms.find((x) => String(x.id) === String(id));
      if (!r && !id) return;
      onOpenRoom?.({ id: r?.id || id, name: r?.name || 'Room', isProject: true, status: r?.status || 'ready' }, worldId);
    };
    return {
      nav: (t) => onNav(t === 'back' ? 'home' : t), search: () => onOpenNav?.(), openNav: () => onOpenNav?.(),
      openCommandK: () => onOpenNav?.(), openProfile: () => onOpenNav?.(),
      // Ledger rows open their room's chat. The watcher toggle arms/disarms the
      // master loop for that room (room-autopilot — the daemon honors the flag).
      // Re-task/add-watcher still have no mechanism -> inert, not faked.
      openGoal: (id) => openRoomById(id), openJob: () => {}, toggleWatcher: (id) => toggleWatcher?.(id), addWatcher: () => {},
      manageActivity: () => {}, retaskGoal: () => {},
    };
  }, [onNav, onOpenNav, onOpenRoom, worldId, data, toggleWatcher]);
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
function Tracker({ worldId, onNav, onOpenNav, onAssignBug }) {
  const { state, data, switchTracker, createTracker, createBug, updateBug, canCreate } = useTrackerBugs(worldId);
  // Optimistically reflect a status change in the open detail (selectedBug is a snapshot).
  const applyStatusToSelected = (id, status) => setSelectedBug((b) => (b && b.id === id) ? {
    ...b, statusLabel: status,
    isOpen: status === 'Open' ? 'on' : 'off',
    isProgress: status === 'In progress' ? 'on' : 'off',
    isDone: status === 'Done' ? 'on' : 'off',
  } : b);
  const isDesktop = useIsDesktop();
  // sheet: null | 'switch' | 'new' (create-tracker) | 'detail' (bug preview) | 'newbug' (new-issue)
  const [sheet, setSheet] = useState(null);
  const [selectedBug, setSelectedBug] = useState(null);
  const [bugFormSeed, setBugFormSeed] = useState(null);
  const newFormRef = useRef(null);
  const bugFormRef = useRef(null);
  const draftKindRef = useRef('project'); // the new-tracker form is uncontrolled
  const bugPriorityRef = useRef('high');  // the new-issue form is uncontrolled
  const bugStatusRef = useRef('Open');
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
    bugPriorityRef.current = 'high'; bugAssigneeRef.current = ''; bugStatusRef.current = 'Open';
    setBugFormSeed({
      draftBug: { title: '', description: '', priority: 'high', isHigh: 'on', isMed: 'off', isLow: 'off', isOpen: 'on', isProgress: 'off', isDone: 'off' },
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
    newBug: () => openNewBug(), assignAgent: (bugId) => onAssignBug?.(bugId), pauseAgent: () => {},
    openAttachment: () => {}, retry: () => {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenNav, data.bugs, data.assignableAgents, data.activeTracker, canCreate, onAssignBug]);

  const detailActions = useMemo(() => ({
    nav: () => setSheet(null),
    assignAgent: (bugId) => onAssignBug?.(bugId), openAttachment: () => {},
    changeStatus: (status, e) => {
      const el = e?.currentTarget;
      // The engine resolves data-arg as a DATA PATH, so the literal "Open"/"Done"
      // never arrives as `status`. Read it straight off the tapped pill instead.
      const s = el?.getAttribute('data-arg') || status;
      if (!selectedBug?.id || !s) return;
      el?.parentNode?.querySelectorAll('.tkseg').forEach((seg) => seg.classList.toggle('is-on', seg === el));
      updateBug({ id: selectedBug.id, status: s });
      applyStatusToSelected(selectedBug.id, s);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onAssignBug, selectedBug, updateBug]);

  const newBugActions = useMemo(() => ({
    nav: () => setSheet(null),
    // Priority + assignee are toggled directly in the DOM (e.currentTarget) so typed text
    // in the title/description survives — no React re-render of the form.
    setBugPriority: (p, e) => {
      bugPriorityRef.current = p === 'low' ? 'low' : p === 'med' ? 'med' : 'high';
      // Scope to THIS control's row so the status segments (same class) aren't cleared.
      const row = e?.currentTarget?.parentNode;
      row?.querySelectorAll('.tkseg').forEach((seg) => seg.classList.toggle('is-on', seg === e?.currentTarget));
    },
    setBugStatus: (s, e) => {
      bugStatusRef.current = (s === 'In progress' || s === 'Done') ? s : 'Open';
      const row = e?.currentTarget?.parentNode;
      row?.querySelectorAll('.tkseg').forEach((seg) => seg.classList.toggle('is-on', seg === e?.currentTarget));
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
      createBug({ title, description, priority: bugPriorityRef.current, status: bugStatusRef.current, assigneeId: bugAssigneeRef.current });
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
      assignAgent: (bugId) => onAssignBug?.(bugId),
      // status change is real (cv6-bugs update, persisted). per-bug checklist has no
      // honest store yet -> inert (not faked).
      changeStatus: (status, e) => {
        const el = e?.currentTarget;
        const s = el?.getAttribute('data-arg') || status; // engine resolves data-arg as a path; read the literal off the pill
        if (!dbug?.id || !s) return;
        el?.parentNode?.querySelectorAll('.tkseg').forEach((seg) => seg.classList.toggle('is-on', seg === el));
        updateBug({ id: dbug.id, status: s });
        applyStatusToSelected(dbug.id, s);
      },
      addChecklistItem: () => {}, toggleChecklistItem: () => {},
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
    if (['home', 'support', 'organize', 'command', 'tracker', 'review', 'settings', 'onboarding', 'livescribe'].includes(v)) return v;
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
  const [assignConfig, setAssignConfig] = useState(null); // { type, id, title } for AssignButton overlay
  // When you tap "Review" on a Home catch-up file card, this carries the deliverable to
  // open ({ name, project, missionSlug }) into the Review tool. Reset on every nav to
  // review, so opening Review from the tool bar (no target) lands on the queue, not a
  // stale file.
  const [reviewTarget, setReviewTarget] = useState(null);
  // Tapping a project anywhere (Chat list, etc.) opens that project's home on Home —
  // its missions list + the "step into general project chat" button — instead of jumping
  // straight into a chat. Home consumes this and opens its (proven) project-detail screen.
  const [pendingProjectId, setPendingProjectId] = useState(null);

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
  const onNav = useCallback((target, arg) => {
    if (target === 'back') { back(); return; }
    if (['home', 'support', 'command', 'tracker', 'organize', 'review', 'settings', 'livescribe'].includes(target)) {
      // Carry a catch-up "Review this file" target into the Review tool; a plain
      // toolbar nav('review') passes no arg and clears any prior target.
      if (target === 'review') setReviewTarget(arg && typeof arg === 'object' ? arg : null);
      goTo(target, null);
      return;
    }
    // Chat from the menu opens the conversations list; a row there opens the Goal Thread.
    // "See all" rooms (Home All Rooms header) routes to the same full rooms list (was a
    // dead 'rooms' target that fell through to nothing).
    else if (target === 'chat' || target === 'rooms') goTo('chatlist', null);
  }, [back, goTo]);
  // Opening a room keeps the current view underneath so Back returns to where you tapped from.
  const onOpenRoom = useCallback((room, wid) => goTo(view, { room, worldId: wid || worldId }), [goTo, view, worldId]);
  // Open a project's home (missions + general chat) on the Home surface.
  const onOpenProject = useCallback((proj) => {
    const id = proj?.id || proj;
    if (!id) return;
    setPendingProjectId(id);
    goTo('home', null);
  }, [goTo]);
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
      onNav={onNav} onOpenNav={onOpenNav}
      onReviewFile={(f, proj) => { const files = Array.isArray(f) ? f : (f && typeof f === 'object' ? [f] : null); onNav('review', files?.length ? { files, project: proj || '' } : null); }} />;
    viewKey = `chatdesktop:${openedRoom?.room?.id || 'list'}`;
  }
  else if (openedRoom) { body = <Chat room={openedRoom.room} worldId={openedRoom.worldId} onNav={onNav} onOpenNav={onOpenNav} />; viewKey = `chat:${openedRoom.room?.id}`; }
  else if (view === 'support') { body = isDesktop ? <SupportDesktop onNav={onNav} onOpenNav={onOpenNav} onAssignEmail={(emailId) => setAssignConfig({ type: 'email', id: emailId, title: 'Assign email to agent' })} /> : <SupportInbox onNav={onNav} onOpenNav={onOpenNav} onAssignEmail={(emailId) => setAssignConfig({ type: 'email', id: emailId, title: 'Assign email to agent' })} />; viewKey = 'support'; }
  else if (view === 'organize') { body = <Organize onNav={onNav} onOpenNav={onOpenNav} onAssignFile={(fileId) => setAssignConfig({ type: 'file', id: fileId, title: 'Assign file to agent' })} />; viewKey = 'organize'; }
  else if (view === 'settings') { body = <Settings onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'settings'; }
  else if (view === 'onboarding') { body = <Onboarding onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'onboarding'; }
  else if (view === 'livescribe') { body = <LiveScribe onNav={onNav} onOpenNav={onOpenNav} />; viewKey = 'livescribe'; }
  else if (view === 'command') { body = <Command worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} onOpenRoom={onOpenRoom} />; viewKey = 'command'; }
  else if (view === 'tracker') { body = <Tracker worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} onAssignBug={(bugId) => setAssignConfig({ type: 'bug', id: bugId, title: 'Assign bug to agent' })} />; viewKey = 'tracker'; }
  else if (view === 'review') { body = isDesktop ? <ReviewDesktop worldId={worldId} target={reviewTarget} onNav={onNav} onOpenNav={onOpenNav} onAssignDeliverable={(delivId) => setAssignConfig({ type: 'deliverable', id: delivId, title: 'Assign deliverable to agent' })} /> : <Review worldId={worldId} target={reviewTarget} onNav={onNav} onOpenNav={onOpenNav} onAssignDeliverable={(delivId) => setAssignConfig({ type: 'deliverable', id: delivId, title: 'Assign deliverable to agent' })} />; viewKey = 'review'; }
  else if (view === 'chatlist') { body = <ChatList onNav={onNav} onOpenRoom={onOpenRoom} onOpenProject={onOpenProject} onOpenNav={onOpenNav} onCommandK={() => setSearchOpen(true)} />; viewKey = 'chatlist'; }
  else { body = <Home onNav={onNav} onOpenRoom={onOpenRoom} onOpenNav={onOpenNav} onCommandK={() => setSearchOpen(true)} pendingProjectId={pendingProjectId} onProjectConsumed={() => setPendingProjectId(null)} />; viewKey = 'home'; }

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
      {/* P7: Activity dock — background activity tracking (floating across all screens) */}
      <ActivityDock worldId={worldId} onOpenJob={(jobId) => onNav?.('command')} />
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
      {/* AssignButton overlay — opened by artifact surfaces (review, tracker, support, organize). */}
      {assignConfig && (
        <AssignButton
          artifactType={assignConfig.type}
          artifactId={assignConfig.id}
          artifactTitle={assignConfig.title}
          autoOpen
          onClose={() => setAssignConfig(null)}
          onSuccess={() => setAssignConfig(null)}
          onError={() => setAssignConfig(null)}
        />
      )}
    </div>
  );
}
