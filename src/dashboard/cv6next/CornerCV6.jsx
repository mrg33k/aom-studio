// CornerCV6 — the fresh CV6 surface. /dashboard renders THIS now (B: fresh start). [build:2026-07-20]
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
import { authFetch } from '../lib/authFetch';
import { AssignButton } from '../cv6kit/AssignButton.jsx';
import { useTreeContextMenu, renameNode, moveNode, createNode, archiveNode, findMissionNode } from './TreeContextMenu.jsx';
import ActivityDock from './ActivityDock.jsx';
import { GoalThreadBody, SendCtx } from './ChatGoalThread.jsx';
import ChatLifecycle from './ChatLifecycle.jsx';
import ChatDesktop, { FilesShelf, useRoomCrossings } from './ChatDesktop.jsx';
import { Cv6MessageThread } from './MessageThread.jsx';
import SupportDesktop, { normalizeLinks } from './SupportDesktop.jsx';
import EmailShell from './EmailShell.jsx';
import Organize from './Organize.jsx';
import Review from './Review.jsx';
import ReviewDesktop from './ReviewDesktop.jsx';
import Settings from './Settings.jsx';
import LiveScribe from './LiveScribe.jsx';
import Search from './Search.jsx';
import { MobileNav, DesktopNav } from './SharedNav.jsx';
import { CornerLogoLoader } from '../cv6kit/FullscreenLoading.jsx';
import { useHome, useProjectMissions, shapeHome, shapeProjectState, createMissionInProject, useChatList } from './data/useHomeData.js';
import { savedRoomExists, missionTreesFromResponse } from './data/lastRoomValidation.js';
import { roomProjectSlug } from './data/roomKeys.js';
import NewComposer from './NewComposer.jsx';
import { supabase } from '../lib/supabase.js';
import { demoFixtureActive } from '../lib/fixtureClient.js';
import { useSupportInbox } from './data/useSupportInbox.js';
import { useRoomThread, useGoalThread } from './data/useRoomThread.js';
import { useCommand, useTrackerBugs } from './data/useCommandTracker.js';
import { useWorldId } from '../lib/tenantContext.jsx';
import { useCommandContext, useDataContext } from './providers/DataContext.jsx';
import { titleForAgent } from './data/agentTitles.js';
import { chatWindowName, chatWindowRouteFromSearch, chatWindowUrl } from './data/chatWindowRoute.js';
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
// 'review' dropped 2026-07-13 (corner:one-corner files-tool merge): the Review tool no
// longer exists as a destination — any design-chrome tile still pointing at it is
// re-pointed to 'organize' (Files) below, so it routes instead of dead-ending. The
// design files also write the Scribe target as 'live-scribe'; accept both spellings.
const LIVE_NAV = new Set(['home', 'chat', 'support', 'organize', 'command', 'tracker', 'livescribe', 'live-scribe', 'back']);

function composeScreen(raw, { mobile = false, pick = 0, sharedNav = false, dropEmbeddedStates = false } = {}) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const nodes = doc.querySelectorAll('[data-cv6]');
  const screen = nodes[pick] || nodes[0];
  if (!screen) return '';
  // Strip nav tiles that point at not-yet-built tools (no dead ends). Design files
  // write the Scribe target as 'live-scribe'; the view machine routes 'livescribe' —
  // normalize the attribute so the tile survives AND routes.
  screen.querySelectorAll('[data-action="nav"][data-target]').forEach((tile) => {
    if (tile.getAttribute('data-target') === 'live-scribe') tile.setAttribute('data-target', 'livescribe');
    // Review folded into Files: a baked Review tile re-points to organize (never a dead end).
    if (tile.getAttribute('data-target') === 'review') tile.setAttribute('data-target', 'organize');
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
  // Mobile screens paint NO ground of their own — the wallpaper is one
  // viewport-fixed layer behind the whole app (index.html body::before), and the
  // frame + this screen are transparent so that single layer shows through
  // unbroken. Painting --ground here sized a second gradient to this screen's box
  // (below the header), which double-painted over the fixed layer and read as a
  // page "boxed in vertically" with a mismatched top strip on Chat/Files (Patrik
  // 2026-07-20). Transparent = every page shares the exact same seamless wallpaper.
  screen.setAttribute('style', mobile
    ? `position:relative;width:100%;height:100%;background:transparent;overflow:hidden${hasScrollBody ? ';display:flex;flex-direction:column' : ''}`
    : 'width:100%;height:100%');
  // append shared states next to this screen's ready region
  const ready = screen.querySelector('[data-state="ready"]');
  const host = ready?.parentNode || screen;
  if (dropEmbeddedStates && host) {
    host.querySelectorAll(':scope > [data-state="loading"], :scope > [data-state="error"], :scope > [data-state="empty"]').forEach((node) => node.remove());
  }
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
  // Transparent: chat shares the one viewport-fixed wallpaper (see composeScreen note).
  screen.setAttribute('style', 'position:relative;width:100%;height:100%;background:transparent;overflow:hidden');
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
function Cv6QuickThread({ target, messages, goal, onReview, onSend, awaiting, liveSteps, room, localReadOnly = false }) {
  // FIX G: scroll-to-bottom on load and new messages; guard against yanking the user
  // back when they've scrolled up (>100px from the bottom). Hooks must come before the
  // early return so React's rules-of-hooks are satisfied.
  const stickRef = useRef(true);
  useEffect(() => {
    if (!target) return;
    const onScroll = () => {
      stickRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [target]);
  const list = Array.isArray(messages) ? messages : [];
  useEffect(() => {
    if (!target || !stickRef.current) return;
    target.scrollTop = target.scrollHeight;
  }, [list.length, target]);

  if (!target) return null;
  return createPortal(
    <Cv6MessageThread
      messages={list}
      goal={goal}
      room={room}
      variant="homeQuick"
      mode="plain"
      liveSteps={liveSteps}
      awaiting={awaiting}
      renderLiveWork="workingTurn"
      allowBlocks
      allowAttachments
      allowLinkCards
      allowChips={false}
      onAction={onSend}
      onReviewAttachment={onReview}
      empty={localReadOnly ? 'No messages in this room yet. Connect a workspace to send messages.' : 'No messages in this room yet. Send the first one below.'}
    />,
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
  return (
    <Cv6MessageThread
      messages={messages}
      variant="modal"
      mode="modalPreview"
      allowBlocks
      allowLinkCards
      allowAttachments={false}
      allowChips={false}
      empty="No conversation yet."
    />
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
        {!caughtUp && !supabase && !demoFixtureActive() ? (
          /* Real local no-Supabase mode: sends are read-only, so no live-looking input. */
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--divider)', color: 'var(--muted)', fontSize: 12.5, textAlign: 'center' }}>Read-only here. Connect a workspace to reply.</div>
        ) : null}
        {!caughtUp && (supabase || demoFixtureActive()) ? (
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

// Files panel for the Home col3 quick chat (Patrik 2026-06-30, re-sourced drop 1).
// The "Files" button opens this panel in place over the Conversation column — the
// SAME crossings panel the full Chat tool's Files drawer shows (this chat's files,
// From agent / You sent, nothing else). host = the .home-files anchor inside the
// Conversation column (a data-cv6-keep node that survives re-binds); the panel is
// position:absolute over the .convo column. null host = closed.
function HomeFilesPanel({ host, worldId, room, onClose, onReview }) {
  const { fromAgent, youSent, status, windowFull } = useRoomCrossings(host ? worldId : null, room);
  if (!host) return null;
  return createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 12, background: 'var(--ground)', display: 'flex', flexDirection: 'column' }}>
      <div className="cvhdr">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Files</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room?.name || ''}</div>
        </div>
        <div className="filesbtn" onClick={onClose} role="button" aria-label="Close files" title="Close files" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose?.(); } }}
          style={{ cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          Close
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 20px' }}>
        <FilesShelf fromAgent={fromAgent} youSent={youSent} status={status} windowFull={windowFull} onReview={onReview} />
      </div>
    </div>,
    host,
  );
}

function Home({ onNav, onOpenRoom, onOpenWindow, onOpenNav, onCommandK, pendingProjectId, onProjectConsumed }) {
  const isDesktop = useIsDesktop();
  const { state, data, worldId } = useHome();
  const { refetch: refetchHomeData } = useDataContext();
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
        treeId: id,
        projectSlug,
        missionSlug: node?.folder_name || leaf,
        name: node?.name || leaf,
        path,
        canMove: !path || path.startsWith('corner/users/'),
      };
    }
    if (rowEl.classList.contains('recentrow') || rowEl.classList.contains('mresumecard') || rowEl.classList.contains('restrow')) {
      const recent = (data.recent || []).find((x) => x.key === id || x.id === id);
      if (!recent || recent.kind === 'agent') return null;
      if (recent.kind === 'project') {
        const project = projects.find((x) => x.slug === recent.project || x.id === recent.project);
        if (!project?.slug) return null;
        return { kind: 'project', projectSlug: project.slug, name: project.name || project.slug };
      }
      const projectSlug = recent.project || String(recent.missionSlug || '').split(':')[0];
      const treeId = recent.missionSlug || recent.id;
      const leaf = String(treeId || '').split(':').pop();
      const found = findMissionNode(missionsByProjectRef.current?.[projectSlug], treeId, leaf);
      const node = found?.node;
      return {
        kind: 'mission', treeId, projectSlug, missionSlug: node?.folder_name || leaf,
        name: node?.name || recent.name || leaf, path: node?.path || null,
        canMove: !node?.path || node.path.startsWith('corner/users/'),
      };
    }
    return null;
  }, [data.recent]);
  const { overlay: treeCtxOverlay } = useTreeContextMenu({
    wrapRef: homeWrapRef,
    resolveHit: resolveHomeHit,
    listProjects: () => (homeProjectsRef.current || []).filter((p) => p.slug).map((p) => ({ slug: p.slug, name: p.name })),
    onRename: async (target, name) => {
      await renameNode(authFetch, target, name, worldId);
      setMissionReload((k) => k + 1);
      await refetchHomeData?.();
    },
    onMove: async (target, dest) => {
      await moveNode(authFetch, target, dest, worldId);
      setMissionReload((k) => k + 1);
      await refetchHomeData?.();
    },
    onCreate: async (target, name) => {
      await createNode(authFetch, target, name, worldId);
      // Show the result: fan the parent project open (and the parent mission
      // node for nested creates) so the new subfolder is visible immediately —
      // creating into a closed folder must not look like nothing happened.
      const proj = (homeProjectsRef.current || []).find((p) => p.slug === target.projectSlug);
      if (proj?.id) setExpandedHomeProjects((prev) => new Set(prev).add(proj.id));
      if (target.kind === 'mission' && target.treeId) setExpandedHomeNodes((prev) => new Set(prev).add(target.treeId));
      setMissionReload((k) => k + 1);
    },
    // wd40 DEF-3: archive from the Home tree too — same confirm dialog as
    // Organize. The room list itself refreshes on the next data-pipe tick
    // (supabase-status.js drops archived rooms server-side).
    onArchive: async (target) => {
      await archiveNode(authFetch, target, worldId);
      setMissionReload((k) => k + 1);
      await refetchHomeData?.();
    },
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
  // The overlay itself lives in NewComposer.jsx (shared with Organize's "New project"
  // entry points); this just tracks whether it's open and which tab it starts on.
  const [composerOpen, setComposerOpen] = useState(null); // null | 'mission' | 'project'
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
  // isOpsNoise: defense-in-depth text filter for things that should never be a card even
  // if they slip past the upstream inboxNeedsResponse gate. Catches bare acks, file-share
  // notices, and URL-dominated bodies that carry no actionable ask for Patrik.
  const isOpsNoise = (summary) => {
    if (!summary) return false;
    const s = String(summary).trim();
    if (/^(synced\.?|standing by\.?|ok\.?|ready\.?|on it\.?|noted\.?|all (good|done|clear)\.?)$/i.test(s)) return true;
    if (/^shared a file\s*:/i.test(s)) return true;
    if (/^https?:\/\/\S+\.?\s*$/.test(s)) return true;
    return false;
  };
  const liveCatchUp = useMemo(() => {
    const all = (data.catchUp?.all || []).filter((c) => !catchUpDismissed.includes(c.id) && !isOpsNoise(c.summary));
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
    // Guard our OWN scroll writes: setting scrollTop fires a scroll event, and if the
    // listener below counted that as the user scrolling it would drop the stick intent
    // and strand the view. The just-sent message case is the killer — the reply's goal
    // thread grows tall UNDER the message, and a re-bind can reset the node to scrollTop 0;
    // either one used to flip stick off, leaving the view frozen in the middle (or the top).
    let programmatic = false;
    const getEl = () => document.querySelector('[data-screen="convo"] .convo-thread');
    const pin = () => {
      if (!stick.current) return;
      const el = getEl();
      if (!el) return;
      programmatic = true;
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => { programmatic = false; });
    };
    // Capture phase so the listener still fires on the recreated node; records the
    // user's stick intent from where they left the scroll. Ignore programmatic pins so
    // only a REAL user scroll (up to read history) releases the pin.
    const onScroll = (e) => { const el = getEl(); if (!el || e.target !== el || programmatic) return; stick.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 120; };
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
  // ONCE per selection change (ref guard): the Set deps churn identity without the selection
  // moving (openRoom re-adds an already-open project id), and re-pinning the selected row
  // then fights the user's own scroll (2026-07-06 scroll-hijack fix).
  // DEF-5 fix: when a room opens via Home card (knavOpenedKey changes), the selected idx
  // may not change, so the ref guard suppresses the scroll. Reset the ref on key change
  // so the scroll fires once for each newly-opened room regardless of idx stability.
  const knavAutoScrolledRef = useRef(-1);
  useEffect(() => {
    knavAutoScrolledRef.current = -1;
  }, [knavOpenedKey]);
  useEffect(() => {
    if (!isDesktop || knavSelectedIdx < 0) return undefined;
    if (knavAutoScrolledRef.current === knavSelectedIdx) return undefined;
    knavAutoScrolledRef.current = knavSelectedIdx;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('[data-screen="home-desktop"] .scrollcap [data-knav="sel"]');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [knavSelectedIdx, isDesktop, expandedHomeProjects, expandedHomeNodes]);

  // (Home .scrollcap scroll-preservation one-off retired 2026-07-06 scroll-arch R1: the
  // generic scroll-stability engine in TemplateScreen now preserves EVERY scrolled
  // descendant across rebinds — .scrollcap included — so the per-screen MutationObserver
  // hack is redundant. See src/dashboard/cv6kit/TemplateScreen.jsx.)

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
    newRoom: () => setComposerOpen('mission'),
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
    // Attachment cards: tapping the file (or Review) opens FILES on that exact file with
    // the needs-review filter on (the Review tool folded into Files, 2026-07-13). The card
    // carries only the filename + its room; Files resolves the real deliverable in the queue.
    review: (fileId) => { const c = curCardRef.current; onNav?.('organize', fileId ? { name: String(fileId), project: c?.project || '', missionSlug: c?.missionSlug || '', needsReview: true } : null); },
    openAttachment: (fileId) => { const c = curCardRef.current; onNav?.('organize', fileId ? { name: String(fileId), project: c?.project || '', missionSlug: c?.missionSlug || '', needsReview: true } : null); },
    voiceInput: () => {}, composeMessage: () => {},
    // Files button in the col3 conversation header: open the room's file shelf in place
    // (HomeFilesPanel overlay), instead of jumping to the Organize tool. Only meaningful when
    // a room is open in col3; harmless otherwise.
    toggleFiles: () => setFilesOpen((o) => !o),
    openChatWindow: () => { if (knavOpenedRoom) onOpenWindow?.(knavOpenedRoom); },
    // Send a quick reply from the col3 room panel: read the uncontrolled input and post into the
    // opened room via the same thread the full Chat uses (Patrik: the quick reply room should work).
    sendMessage: async (_arg, e) => {
      const root = e?.currentTarget?.closest('.composer') || document.querySelector('[data-screen="convo"] .composer');
      const inp = root && root.querySelector('.convo-input');
      const v = inp && inp.value;
      if (v && v.trim() && quickSend) {
        const ok = await quickSend(v.trim());
        if (inp && ok !== false) inp.value = '';
      }
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
  }), [onNav, onOpenRoom, onOpenWindow, onOpenNav, onCommandK, data.projects, data.agents, data.recent, data.catchUp, worldId, isDesktop, openedProject, catchUpOpen, openedProjectId, missionsByProject, catchUpDismissed, sendCatchupReply, addToTracker, quickSend, knavOpenedRoom]);

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


  // Card footer state drives the bottom of the catch-up card: 'none' = caught up (hide it),
  // 'actions' = the suggested-action buttons, 'reply' = the inline reply composer.
  const catchUpRender = {
    ...liveCatchUpView,
    colState: catchColState,
    // mobile deck header: "N of M · swipe →" only when there IS a next card — one bound
    // string so the template can never render "0 of 0 · swipe" (Patrik 2026-07-06)
    swipeLabel: liveCatchUpView.count > 1 ? `${liveCatchUpView.position || 1} of ${liveCatchUpView.count} · swipe →` : '',
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
  // Projects are always complete and arrive newest-activity first from useHomeData.
  const allProjects = data.projects || [];
  const projShown = allProjects.slice();
  // arrays carry their bound scalars as props (the engine reads projects.count /
  // projects.moreCount / projects.moreState); set them on the sliced array we pass
  // through. count = the TRUE total (header "Projects · N"), independent of how many
  // rows are shown; moreCount = how many are still hidden.
  projShown.count = allProjects.length;
  projShown.moreCount = 0;
  projShown.moreState = 'none';

  // Build the navigable model the arrow keys walk, in the SAME visual order the rows render:
  // agents (when open) -> recent -> each project (and its missions when the folder is open).
  // navNodes is the single source of truth; the rows tag knavSel from the selected node's key,
  // and the keydown handler reads navNodes via navNodesRef. (Patrik 2026-06-25 arrow spec.)
  // Recent activity is keyed by stable slugs, but its visible label must come
  // from the same renamed project/mission records as the tree. Otherwise a
  // successful rename appears to "not save" until the slug itself changes.
  const recentList = (data.recent || []).map((recent) => {
    if (recent.kind === 'project') {
      const project = allProjects.find((item) => item.slug === recent.project || item.id === recent.project);
      return project?.name ? { ...recent, name: project.name } : recent;
    }
    if (recent.kind !== 'mission') return recent;
    const projectSlug = recent.project || String(recent.missionSlug || '').split(':')[0];
    const treeId = recent.missionSlug || recent.id;
    const leaf = String(treeId || '').split(':').pop();
    const found = findMissionNode(missionsByProject[projectSlug], treeId, leaf);
    return found?.node?.name ? { ...recent, name: missionLabelClean(found.node.name) } : recent;
  });
  recentList.count = data.recent?.count ?? recentList.length;
  const agentsList = agentsOpen ? (data.agents || []) : [];
  const HOME_MISSION_CAP = 8;
  // Corner's top-level rooms mirror the top nav exactly: the live tools in nav order
  // first, then the grouping folders (General / Business Ops / Older Versions).
  // So the sidebar tree reads like the nav bar, and no tool hides behind "Show more".
  // ('review' and 'chat' dropped 2026-07-13 with the Files merge — dead nav entries.)
  const CORNER_NAV_ORDER = ['home', 'organize', 'support', 'tracker', 'command', 'live-scribe'];
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
  // FIX B-mod: inject roomOpen so the template can add .is-open to the active rail row.
  const recentWithNav = recentList.map((r) => ({ ...r, knavSel: selectedKey === `rec:${r.key}` ? 'sel' : 'off', roomOpen: knavOpenedKey === `rec:${r.key}` ? 'open' : 'off' }));
  recentWithNav.count = recentList.count != null ? recentList.count : recentWithNav.length;
  recentWithNav.has = recentWithNav.length ? 'has' : 'none';
  const agentsWithNav = agentsList.map((a) => ({ ...a, knavSel: selectedKey === `a:${a.id}` ? 'sel' : 'off', roomOpen: knavOpenedKey === `a:${a.id}` ? 'open' : 'off' }));
  const projectsWithNav = projShownNodes.map((pn) => ({
    ...pn.p,
    knavSel: selectedKey === `p:${pn.p.id}` ? 'sel' : 'off',
    caret: pn.open ? 'open' : 'closed',
    missions: pn.missions.map((m) => ({ id: m.id, name: m.name, status: m.status, depth: m.depth, caret: m.caret, knavSel: selectedKey === `m:${m.id}` ? 'sel' : 'off' })),
    moreCount: pn.more,
    moreState: pn.more > 0 ? 'has' : 'none',
  }));
  // Arrays double as binding hosts for header/show-more counts. Mapping creates a
  // fresh array, so copy the scalar props from projShown or the template falls back
  // to its baked "Projects · 84 / Show 78 more" sample when there are zero projects.
  projectsWithNav.count = projShown.count;
  projectsWithNav.moreCount = projShown.moreCount;
  projectsWithNav.moreState = projShown.moreState;

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
  // Start-a-mission / New-project composer overlay (the All-rooms "New") — the shared
  // NewComposer flow. On create, bump missionReload so the tree/room lists refetch.
  const composerOverlay = composerOpen ? (
    <NewComposer worldId={worldId} projects={data.projects} agents={data.agents}
      initialMode={composerOpen} onClose={() => setComposerOpen(null)}
      onCreated={() => setMissionReload((k) => k + 1)} />
  ) : null;
  return (
    <div ref={homeWrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={homeHtml} data={homeData} actions={actions} state={state}
        aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />
      {treeCtxOverlay}
      <Cv6QuickThread
        target={knavOpenedRoom ? threadHost : null}
        messages={(quickThread && quickThread.messages ? quickThread.messages : []).slice(-40)}
        goal={quickGoal}
        onSend={quickSend}
        awaiting={quickThread && quickThread.awaiting}
        liveSteps={quickThread && quickThread.liveSteps}
        room={displayedRoom}
        localReadOnly={!supabase}
        onReview={(f) => { const files = Array.isArray(f) ? f : (f && typeof f === 'object' ? [f] : null); onNav?.('organize', files?.length ? { files, project: roomProjectSlug(displayedRoom), missionSlug: roomMissionSlug(displayedRoom), needsReview: true } : null); }}
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
        worldId={worldId}
        room={knavOpenedRoom}
        onClose={() => setFilesOpen(false)}
        onReview={(f) => { const files = Array.isArray(f) ? f : (f && typeof f === 'object' ? [f] : null); onNav?.('organize', files?.length ? { files, project: roomProjectSlug(knavOpenedRoom), missionSlug: roomMissionSlug(knavOpenedRoom), needsReview: true } : null); }}
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

const SUPPORT_THREAD_ALIASES = { 'thread.summary': 'pt' };
// Where the quoted "earlier in this thread" part of an email body starts. Same split
// the desktop reading pane uses — one truth for what counts as history.
const EARLIER_CUT = /^\s*>|^-{2,}\s*Forwarded message|^Begin forwarded message:|^On .{5,80} wrote:/m;
function SupportInbox({ onNav, onOpenNav, onSearch, onAssignEmail, worldId }) {
  const { state, data, reload } = useSupportInbox(worldId);
  const html = useMemo(() => composeScreen(inboxRaw, { mobile: true, dropEmbeddedStates: true }), []);
  const threadHtml = useMemo(() => composeScreen(supportThreadRaw, { mobile: true }), []);
  // The "Draft reply" screen the design ships next to the inbox (pick=1). Tone and
  // Redo have no live mechanism yet, so they're stripped at compose time — same
  // no-dead-controls doctrine as composeScreen's dead-nav-tile removal.
  const draftHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(composeScreen(inboxRaw, { mobile: true, pick: 1 }), 'text/html');
    const scr = doc.querySelector('[data-cv6]');
    if (!scr) return '';
    const tone = scr.querySelector('[data-action="setDraftTone"]');
    tone?.parentElement?.parentElement?.remove();
    scr.querySelector('[data-action="regenerateDraft"]')?.remove();
    // An honest send-status line above the send bar (driven from the send handler
    // without a re-bind, so the user's typed edits are never wiped mid-send).
    const foot = scr.querySelector('[data-action="sendDraft"]')?.closest('div');
    foot?.insertAdjacentHTML('beforebegin', '<div class="sthr-note is-none" data-draft-note style="padding:10px 16px 0;font-size:12px;line-height:1.5;color:var(--warn);background:var(--ground);"></div>');
    return scr.outerHTML;
  }, []);
  // Tapping an email opens its thread view (P9). The opened ask is a SNAPSHOT taken at
  // tap time, not a live lookup into the polling data: a lookup meant every 30s data
  // tick rebuilt the thread DOM under the reader and threw the scroll back to the top
  // ("can't scroll the thread"). The snapshot keeps the thread still while it's read;
  // fresh data shows on the next open.
  const [openedEmail, setOpenedEmail] = useState(null);
  const [showEarlier, setShowEarlier] = useState(false);
  const [heldNote, setHeldNote] = useState('');       // why the reply button is held (shown on tap)
  const [draftOpen, setDraftOpen] = useState(false);  // the reply-with-Elon draft screen
  const [sentNote, setSentNote] = useState('');       // confirmation after a real send
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
  const openThread = useCallback((id) => {
    const all = [...(data.needsYou || []), ...(data.watching || [])];
    const e = all.find((x) => String(x.id) === String(id)) || null;
    if (!e) return;
    setOpenedEmail(e); setShowEarlier(false); setHeldNote(''); setSentNote(''); setDraftOpen(false);
  }, [data.needsYou, data.watching]);
  const actions = useMemo(() => ({
    openThread, search: () => onSearch?.(), openNav: () => onOpenNav?.(),
    nav: (t) => onNav?.(t), browseWatching: () => setFilter('watching'), emptyAction: () => {},
    // DEF-14: guard against same-filter no-op so census tools see a live handler;
    // the active chip also picks up cursor:default from .mhchip.is-on in cv6.css.
    setFilter: (f) => { const next = f || 'all'; if (filter !== next) setFilter(next); },
    retry: () => reload(), viewOffline: () => {},
    // Pass the real inbox item too, so the assign overlay carries the actual subject +
    // sender into the dispatch (not just an opaque id).
    assignAgent: (emailId) => {
      const item = [...(data.needsYou || []), ...(data.watching || [])].find((e) => String(e.id) === String(emailId)) || null;
      onAssignEmail?.(emailId, item);
    },
  }), [openThread, onNav, onOpenNav, onSearch, reload, onAssignEmail, data.needsYou, data.watching]);

  // Reply-pane intelligence for asks (wishes): staged draft + summary + options via
  // /api/support/suggest, bounded by a timeout so "Summarizing…" can never run forever —
  // it resolves to real bullets or an honest failed line. Email-scan rows don't fetch:
  // their summary/reply mechanism IS the wish pipeline (assign first).
  const isWish = openedEmail?.kind === 'wish';
  const [suggest, setSuggest] = useState(null);
  const [suggestState, setSuggestState] = useState('idle'); // idle | loading | ready | error
  useEffect(() => {
    setSuggest(null);
    if (!openedEmail || openedEmail.kind !== 'wish') { setSuggestState('idle'); return undefined; }
    let dead = false;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    setSuggestState('loading');
    authFetch(`/api/support/suggest?wish_id=${encodeURIComponent(openedEmail.wishId)}`, { credentials: 'include', signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => { if (!dead) { if (d.ok) { setSuggest(d); setSuggestState('ready'); } else setSuggestState('error'); } })
      .catch(() => { if (!dead) setSuggestState('error'); })
      .finally(() => clearTimeout(timer));
    return () => { dead = true; ctl.abort(); clearTimeout(timer); };
  }, [openedEmail]);

  const threadData = useMemo(() => {
    const e = openedEmail || {};
    const n = e.threadCount || 1;
    // Earlier messages: the quoted history the email itself carries. Real mechanism,
    // real limit — there is no mailbox thread-history endpoint yet, so what the
    // message quotes is ALL the history we can honestly show.
    const full = String((suggest?.original || e.body || (e.snippet || '').split(' · ').slice(1).join(' · ') || 'No message body.'));
    const cut = full.search(EARLIER_CUT);
    const head = cut >= 0 ? full.slice(0, cut).trim() : full;
    const tail = cut >= 0 ? full.slice(cut).trim() : '';
    // Summary: the agent's real bullets, else one honest status line.
    const bullets = (suggest?.summary?.length ? suggest.summary : e.summary) || [];
    let summaryNote = '';
    if (!bullets.length) {
      if (e.kind !== 'wish') summaryNote = 'Summaries come from your agent once this email is assigned as an ask. The full email is below.';
      else if (suggestState === 'loading') summaryNote = 'Summarizing… the full email is below.';
      else if (suggestState === 'error') summaryNote = "The summary didn't come back this time. The full email is below.";
      else summaryNote = 'No summary for this one. The full email is below.';
    }
    const replyNote = sentNote || heldNote;
    return {
      thread: {
        subject: e.subject || 'Conversation',
        sender: e.sender || (e.snippet || '').split(' · ')[0] || 'Sender',
        senderSub: e.senderSub || 'to you',
        countLabel: `${e.sender || 'Sender'} · ${n} message${n === 1 ? '' : 's'}`,
        time: e.time || '',
        body: (tail && head) ? (showEarlier ? `${head}\n\n${tail}` : head) : full,
        earlierState: (tail && head) ? 'has' : 'none',
        earlierLabel: showEarlier ? 'Hide' : 'Show',
        summary: bullets.map((text) => ({ text: normalizeLinks(text) })),
        summaryNote,
        summaryNoteState: summaryNote ? 'has' : 'none',
        replyNote,
        replyNoteState: replyNote ? 'has' : 'none',
        replyState: e.kind === 'wish' ? 'ready' : 'held',
        initials: e.initials || '·', avatarTint: e.avatarTint || 'violet',
      },
    };
  }, [openedEmail, suggest, suggestState, showEarlier, heldNote, sentNote]);

  // The draft screen's data is FROZEN at open (one snapshot): no re-binds while the
  // user types, so nothing can wipe the edit mid-composition.
  const [draftData, setDraftData] = useState(null);
  const openDraft = useCallback(() => {
    const e = openedEmail;
    if (!e || e.kind !== 'wish') {
      setHeldNote('This landed straight from your mailbox scan. Assign it to your agent and it becomes an ask you can reply to from here.');
      return;
    }
    const options = (suggest?.options?.length ? suggest.options : e.replyOptions) || [];
    const stagedBody = suggest?.staged?.body || '';
    setDraftData({
      draft: {
        to: e.sender || e.address || 'Sender',
        subject: e.subject || '',
        initials: e.initials || '·',
        avatarTint: e.avatarTint || 'violet',
        body: (stagedBody || options[0]?.text || '').trim(),
      },
    });
    setDraftOpen(true);
  }, [openedEmail, suggest]);

  const sendDraft = useCallback(async (_arg, ev) => {
    const rootEl = ev?.target?.closest?.('[data-cv6]');
    const ta = rootEl?.querySelector?.('textarea[data-bind="draft.body"]');
    const note = rootEl?.querySelector?.('[data-draft-note]');
    const btn = ev?.target?.closest?.('button');
    const text = (ta?.value || '').trim();
    const say = (msg) => { if (note) { note.textContent = msg; note.classList.remove('is-none'); note.classList.add('is-has'); } };
    if (!text) { say('Write the reply first — the box above is empty.'); return; }
    if (!openedEmail?.wishId || btn?.disabled) return;
    if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }
    try {
      let r;
      const stagedBody = (suggest?.staged?.body || '').trim();
      if (stagedBody && text === stagedBody && suggest?.staged?.draft_id) {
        // Untouched staged draft → fire the exact Gmail draft the agent staged.
        r = await authFetch('/api/support/send-staged', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ action: 'send', wish_id: openedEmail.wishId, draft_id: suggest.staged.draft_id, connection_id: suggest.staged.connection_id }),
        });
      } else {
        // Edited or written from scratch → real in-thread reply, sent as you.
        r = await authFetch('/api/support/reply', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ wish_id: openedEmail.wishId, text }),
        });
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw new Error(d.error || `send failed (${r.status})`);
      setDraftOpen(false); setDraftData(null);
      setSentNote('Sent as you, on the same thread.'); setHeldNote('');
      setTimeout(() => { reload(); }, 800);
    } catch (err) {
      say(`Send failed: ${String(err.message || err).slice(0, 120)}. Nothing went out — try again.`);
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    }
  }, [openedEmail, suggest, reload]);

  const threadActions = useMemo(() => ({
    closeThread: () => { setOpenedEmail(null); setDraftOpen(false); },
    nav: (t) => { setOpenedEmail(null); setDraftOpen(false); onNav?.(t); },
    search: () => onSearch?.(), openNav: () => onOpenNav?.(),
    toggleEarlier: () => setShowEarlier((v) => !v),
    replyViaElon: () => openDraft(),
  }), [onNav, onOpenNav, onSearch, openDraft]);
  const draftActions = useMemo(() => ({
    nav: () => { setDraftOpen(false); },
    search: () => onSearch?.(), openNav: () => onOpenNav?.(),
    sendDraft,
  }), [onOpenNav, onSearch, sendDraft]);

  if (openedEmail && draftOpen && draftData) {
    return <TemplateScreen html={draftHtml} data={draftData} actions={draftActions} state="ready"
      aliases={SUPPORT_THREAD_ALIASES} style={{ width: 'min(420px, 100%)', height: '100%', margin: '0 auto' }} />;
  }
  if (openedEmail) {
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
function Chat({ room, worldId, onNav, onOpenNav, onSearch }) {
  const [localTitle, setLocalTitle] = useState(null);
  const [localCustomTitle, setLocalCustomTitle] = useState(null);
  const { data: roomList } = useChatList();
  useEffect(() => { setLocalTitle(null); setLocalCustomTitle(null); }, [room?.id]);
  const activeRoom = useMemo(() => localTitle ? { ...room, name: localTitle, initials: localTitle.slice(0, 2).toUpperCase(), hasCustomTitle: localCustomTitle ?? room.hasCustomTitle } : room, [room, localTitle, localCustomTitle]);
  const parentProject = useMemo(() => {
    if (!activeRoom?.isProject && !activeRoom?.isMission) return null;
    const slug = activeRoom.isMission ? activeRoom.projectSlug : activeRoom.id;
    return (roomList?.projects || []).find((project) => project.slug === slug || project.id === slug) || null;
  }, [activeRoom, roomList?.projects]);
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
    room: { name: isDemo ? 'DEMO: Block Showcase' : activeRoom.name, initials: activeRoom.initials || '·', statusText: isDemo ? 'demo' : activeRoom.statusText || '', count: '' },
    messages,
    goal: goal || { title: '', step: '', doneCount: '', total: '', pct: 0, checklist: [] },
    user: { initials: 'PM' },
    loading: { label: `Opening ${activeRoom.name}…` },
    empty: { title: `No messages with ${activeRoom.name} yet`, body: 'Start the conversation below.', actionLabel: '' },
    error: { title: "Couldn't load this conversation", body: 'Your connection dropped. Nothing was lost.', code: 'chat · retry' },
  }), [isDemo, activeRoom, messages, goal]);
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
    <>
    <ChatLifecycle
      room={{ name: isDemo ? 'DEMO: Block Showcase' : activeRoom.name, initials: activeRoom.initials || '·', statusText: isDemo ? 'demo' : (activeRoom.hasCustomTitle && activeRoom.specialistTitle ? `${activeRoom.specialistTitle} specialist` : activeRoom.statusText || ''), status: activeRoom.status || 'ready' }}
      fullRoom={isDemo ? null : activeRoom} worldId={worldId} projectId={parentProject?.databaseId || activeRoom?.databaseId || ''}
      messages={messages} archivedMessages={isDemo ? [] : rt.archivedMessages} status={status} goal={liveThread ? goal : null} liveSteps={liveSteps}
      awaiting={isDemo ? false : rt.awaiting}
      onBack={() => onNav('back')} onOpenNav={() => onOpenNav?.()} onSearch={() => onSearch?.()} onRoomRenamed={isDemo ? null : (name, { reset = false } = {}) => { setLocalTitle(name); setLocalCustomTitle(activeRoom.isProject || activeRoom.isMission ? activeRoom.hasCustomTitle : !reset); }} onClearRoom={isDemo ? null : rt.clearRoom} onSend={(text, options) => send?.(text, options)}
      onOpenReview={(files) => onNav('organize', files?.length ? { files, project: room?.projectSlug || (room?.isProject ? room?.id : ''), missionSlug: roomMissionSlug(room), needsReview: true } : null)}
    />
    </>
  );
}

// ── Command: the goal ledger (rebuilt to spec, corner:corner-ui-cv6 2026-07-06) ──
// Each row = a room/terminal: GOAL NOW · STATUS (working/blocked/idle) · LIVE NOW ·
// last activity · per-row master-loop toggle. Tapping a row steps into it: desktop
// focuses the detail panel (goal + plan checklist), mobile expands the checklist
// inline. "Open room" (explicit) opens the room's conversation.
const COMMAND_ALIASES = {
  'activity.jobs': 'job', 'goal.checklist': 'step', 'goal.loops': 'loop',
  'ledger.others': 'room', 'ledger.rooms': 'room', 'room.checklist': 'step',
};
function Command({ worldId, onNav, onOpenNav, onSearch, onOpenRoom }) {
  // Get command data from context instead of calling useCommand directly.
  // This prevents redundant hook instantiation on screen navigation.
  const { command, selectedKey, setSelectedKey, statusFilter, setStatusFilter, goalEdit, setGoalEdit } = useCommandContext();
  const {
    state, data, toggleWatcher, stepToggle, stepAdd, stepDelete, stepAccept,
    answerRoomQuestion, handNextStep, setRoomGoal, setRoomStatus,
    loopCreate, loopToggle, loopRunNow, loopDelete, roomLoopsToggle,
  } = command;
  const isDesktop = useIsDesktop();
  const html = useMemo(() => composeScreen(commandRaw, { mobile: !isDesktop, pick: isDesktop ? 0 : 1, sharedNav: isDesktop }), [isDesktop]);
  const actions = useMemo(() => {
    // Open the room's conversation with the right handle shape: agent rooms open
    // the agent thread, mission rooms (parent project known) open the mission
    // thread, everything else opens as a project chat on the bare slug.
    const openRoomById = (id) => {
      const rooms = data?.ledger?.rooms || [];
      const r = rooms.find((x) => String(x.id) === String(id));
      const key = String(r?.id || id || '');
      if (!key) return;
      const name = r?.name || 'Room';
      if (key.startsWith('agent:')) {
        const slug = key.slice(6);
        onOpenRoom?.({ id: slug, slug, name, initials: (name || '?').slice(0, 2).toUpperCase(), status: 'ready' }, worldId);
      } else if (r?.projectSlug) {
        // The room's TRUE mission slug when the goal memory knows it (some
        // rooms are bare-form, some prefix-form — guessing splits the thread).
        onOpenRoom?.({ id: key, name, initials: (name || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug: r.missionSlug || `${r.projectSlug}:${key}`, projectSlug: r.projectSlug, status: 'ready' }, worldId);
      } else {
        onOpenRoom?.({ id: key, name, initials: (name || '?').slice(0, 2).toUpperCase(), isProject: true, status: r?.status || 'ready' }, worldId);
      }
    };
    return {
      nav: (t) => onNav(t === 'back' ? 'home' : t), search: () => onSearch?.(), openNav: () => onOpenNav?.(),
      openCommandK: () => onSearch?.(), openProfile: () => onOpenNav?.(),
      // Step in: select/expand the row (second tap steps back out). Changing rooms
      // closes an open set-goal row so it never carries across rooms.
      openGoal: (id) => { setGoalEdit(false); setSelectedKey((cur) => (cur === String(id) ? '' : String(id))); },
      // State the room's goal yourself (wd40 R5): Edit toggles the input row; Save
      // writes a Patrik-stated goal (edit_goal) that no loop sweep can overwrite.
      // Steffen R5 D-1: on open, PRE-POPULATE with the current goal (full stored
      // text, not the display cap) and focus — Edit edits, it doesn't make you retype.
      toggleGoalEdit: (_arg, e) => {
        const root = e?.currentTarget?.closest('[data-cv6]') || document;
        const prefill = data?.goal?.editPrefill || '';
        setGoalEdit((v) => {
          const opening = !v;
          if (opening) {
            requestAnimationFrame(() => {
              const inp = root.querySelector('[data-cv6-goaledit] input');
              if (inp) { inp.value = prefill; inp.focus(); }
            });
          }
          return opening;
        });
      },
      saveGoal: (id, e) => {
        const wrap = e?.currentTarget?.closest('[data-cv6-goaledit]');
        const inp = wrap?.querySelector('input');
        const text = inp?.value?.trim();
        if (!text || !id) return;
        setRoomGoal?.(String(id), text);
        if (inp) inp.value = '';
        setGoalEdit(false);
      },
      openRoom: (id) => openRoomById(id),
      // Per-row Loop toggle — REAL loops (routines). On = pause them, paused = resume
      // them, none at all = step into the room, where the create form lives.
      toggleRoomLoop: async (key) => {
        const rooms = data?.ledger?.rooms || [];
        const r = rooms.find((x) => String(x.key) === String(key));
        const acted = await roomLoopsToggle?.(r?.loopRunningIds || [], r?.loopResumableIds || []);
        if (!acted) { setGoalEdit(false); setSelectedKey(String(key)); }
      },
      // The master-loop watcher (room-autopilot) — its own labeled switch now.
      toggleWatch: (key) => toggleWatcher?.(key),
      // ── Loop controls (routines API; routine-daemon executes) ──
      toggleLoop: (id) => loopToggle?.(id),
      runLoopNow: (id) => loopRunNow?.(id),
      deleteLoop: (id) => loopDelete?.(id),
      // Create a loop from the in-place form: plain instruction + cadence select.
      createLoop: (id, e) => {
        const wrap = e?.currentTarget?.closest('[data-cv6-loopnew]');
        const inp = wrap?.querySelector('input');
        const sel = wrap?.querySelector('select');
        const text = inp?.value?.trim();
        if (!text || !id) return;
        const minutes = sel && sel.value ? Number(sel.value) : null;
        loopCreate?.({ key: String(id), projectSlug: data?.goal?.projectSlug || '', missionSlug: data?.goal?.missionSlug || '', prompt: text, intervalMinutes: minutes });
        if (inp) inp.value = '';
      },
      // Prefill the loop form with a work-the-plan instruction; the user still picks
      // the cadence and taps Start — nothing fires on its own.
      loopPlan: (_id, e) => {
        const root = e?.currentTarget?.closest('[data-cv6]') || document;
        const inp = root.querySelector('[data-cv6-loopnew] input');
        if (inp) {
          inp.value = "Take the next unchecked step on this room's plan and report back when it's done.";
          inp.focus();
        }
      },
      // Accept an agent-proposed step from its tag without flipping it done.
      acceptStep: (act) => stepAccept?.(act),
      // Actionable checklist (wd40 R1): tap a step = done/undone for real (room-goal-steps
      // store; checking a Proposed step claims it); Add appends a user-sourced step to the
      // same store the room's agent reads. The add input is uncontrolled — read at tap time.
      toggleStep: (act) => stepToggle?.(act),
      deleteStep: (act) => stepDelete?.(act),
      // Header chips filter the ledger by status; same chip again clears.
      filterWorking: () => setStatusFilter((f) => (f === 'working' ? '' : 'working')),
      filterBlocked: () => setStatusFilter((f) => (f === 'blocked' ? '' : 'blocked')),
      addStep: (roomKey, e) => {
        const wrap = e?.currentTarget?.closest('[data-cv6-addstep]');
        const inp = wrap?.querySelector('input');
        const text = inp?.value?.trim();
        if (!text || !roomKey) return;
        stepAdd?.(roomKey, text);
        if (inp) inp.value = '';
      },
      // Answer the room's open question in place (wd40 R2): the answer goes into the
      // room's conversation (chat send path) and the row unblocks (clear_question).
      answerQuestion: (id, e) => {
        const wrap = e?.currentTarget?.closest('[data-cv6-answer]');
        const inp = wrap?.querySelector('input');
        const text = inp?.value?.trim();
        if (!text || !id) return;
        const rooms = data?.ledger?.rooms || [];
        const r = rooms.find((x) => String(x.key) === String(id));
        answerRoomQuestion?.({ key: String(id), projectSlug: r?.projectSlug || '', missionSlug: r?.missionSlug || '', question: r?.openQuestion || '' }, text);
        if (inp) inp.value = '';
      },
      // Hand the plan's next unchecked step to the room's agent (wd40 R3): one tap
      // sends it into the room's conversation through the real send path.
      handNextStep: (id) => {
        const rooms = data?.ledger?.rooms || [];
        const r = rooms.find((x) => String(x.key) === String(id));
        const next = (r?.fullChecklist || []).find((c) => c.state !== 'done');
        if (!r || !next) return;
        handNextStep?.({ key: String(id), projectSlug: r.projectSlug || '', missionSlug: r.missionSlug || '', stepText: next.label, act: next.act });
      },
      // Retire the focused room from the ledger honestly (set_room_status —
      // the same state the master loop honors). Done = goal complete; Park =
      // stop tracking for now. Both reversible: fresh activity re-adds the row.
      markRoomDone: (id) => { if (id) { setRoomStatus?.(String(id), 'done'); setGoalEdit(false); setSelectedKey(''); } },
      parkRoom: (id) => { if (id) { setRoomStatus?.(String(id), 'parked'); setGoalEdit(false); setSelectedKey(''); } },
      // Absorbs taps on the add-step/answer rows so they don't bubble to the card's open action.
      noop: () => {},
      // A dock card is a live agent session — tapping it opens that agent's room.
      // job.id is the worker's agent slug; a task card with no known agent
      // carries '' and must no-op (an 'agent:' key would open a broken room).
      openJob: (id) => { const slug = String(id || '').trim(); if (slug) openRoomById('agent:' + slug); },
    };
  }, [onNav, onOpenNav, onSearch, onOpenRoom, worldId, data, toggleWatcher, stepToggle, stepAdd, stepDelete, stepAccept, answerRoomQuestion, handNextStep, setRoomGoal, setRoomStatus, loopCreate, loopToggle, loopRunNow, loopDelete, roomLoopsToggle, setSelectedKey, setGoalEdit]);
  return <TemplateScreen html={html} data={data} actions={actions} state={state}
    aliases={COMMAND_ALIASES} style={{ width: '100%', height: '100%' }} />;
}

// ── Tracker (mobile): the real CV6 bug list ──
// Truth fields for the bug detail panels (desktop rail + mobile sheet), loop R5: empty
// Mission/Opened rows hide instead of rendering label + blank; the checklist count
// fragment exists only when there IS a checklist. Fields are ALWAYS present so the
// template sample text can never leak through a missing bind.
const withBugTruth = (b) => {
  const cl = (b && b.checklist) || [];
  const done = cl.filter((i) => i && (i.done === true || String(i.done) === 'done' || String(i.state) === 'done')).length;
  return {
    ...b,
    missionState: String((b && b.mission) || '').trim() ? 'has' : 'none',
    openedState: String((b && b.opened) || '').trim() ? 'has' : 'none',
    checklistLabel: cl.length ? ` · ${done} of ${cl.length}` : '',
  };
};

const TRACKER_ALIASES = {
  bugs: 'bug', 'bug.checklist': 'item', 'agent.checklist': 'item',
  attachments: 'attachment', 'featuredBug.attachments': 'attachment',
  projectTrackers: 'tracker', missionTrackers: 'tracker',
  assignableAgents: 'agent',
};
function Tracker({ worldId, onNav, onOpenNav, onSearch, onAssignBug }) {
  // Get tracker data from context instead of calling useTrackerBugs directly.
  const { tracker } = useCommandContext();
  const { state, data, switchTracker, createTracker, createBug, updateBug, canCreate } = tracker;
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
    const rawBug = selectedBug || { id: '', title: '', statusLabel: '', priorityLabel: '', assignee: '', assigneeInitials: '·', assigneeTint: 'violet', mission: '', opened: '' };
    return {
      bug: withBugTruth(rawBug),
      activeTracker: data.activeTracker,
      attachments: atts,
    };
  }, [selectedBug, data.activeTracker]);
  const openBug = (id) => {
    const bug = (data.bugs || []).find((b) => String(b.id) === String(id));
    if (bug) { setSelectedBug(bug); setSheet('detail'); }
  };
  // Assign-to-agent on a bug: hand the overlay the real bug title + description, and a
  // persistence hook that stamps the picked agent (as its role title, never a persona
  // name) onto the bug row's owner — so the assignment shows in the Assignee column.
  const assignBug = (bugId) => {
    const bug = (data.bugs || []).find((b) => String(b.id) === String(bugId)) || selectedBug;
    onAssignBug?.(bugId, {
      artifactTitle: bug?.title || '',
      details: bug?.description ? `Expected: ${bug.description}` : '',
      onAssigned: (agent) => updateBug({ id: bugId, owner: titleForAgent(agent) }),
    });
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
    nav: (t) => onNav(t === 'back' ? 'home' : t), search: () => onSearch?.(), openNav: () => onOpenNav?.(),
    openSwitcher: () => setSheet('switch'),
    openBug: (id) => openBug(id),
    newBug: () => openNewBug(), assignAgent: (bugId) => assignBug(bugId), pauseAgent: () => {},
    openAttachment: () => {}, retry: () => {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [onNav, onOpenNav, onSearch, data.bugs, data.assignableAgents, data.activeTracker, canCreate, onAssignBug]);

  const detailActions = useMemo(() => ({
    nav: () => setSheet(null),
    assignAgent: (bugId) => assignBug(bugId), openAttachment: () => {},
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
    const ddata = { ...data, bug: withBugTruth(dbug) };
    const dActions = {
      nav: (t) => onNav(t === 'back' ? 'home' : t), openCommandK: () => onSearch?.(), openProfile: () => onOpenNav?.(),
      openTracker: (id) => switchTracker(id),
      openBug: (id) => { const b = (data.bugs || []).find((x) => String(x.id) === String(id)); if (b) setSelectedBug(b); },
      newBug: () => openNewBug(),
      assignAgent: (bugId) => assignBug(bugId),
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
    // corner:corner-ui-cv6 BUG1-fix — 'scribe' and 'live-scribe' are the natural deep-link
    // spellings agents/users write; map them to the internal 'livescribe' view key.
    if (v === 'scribe' || v === 'live-scribe') return 'livescribe';
    // Review folded into Files (corner:one-corner, 2026-07-13): ?view=review lands in
    // Files with the needs-review filter on (see initialFilesTargetFromUrl). Never a 404.
    if (v === 'review') return 'organize';
    // The old CV6 onboarding specimen contained deliberately unbacked OAuth,
    // permissions, and goal controls. Route that legacy deep link to the honest
    // Settings surface; the real account onboarding remains /onboarding/voice.
    if (v === 'onboarding') return 'settings';
    if (['home', 'support', 'organize', 'command', 'tracker', 'settings', 'livescribe'].includes(v)) return v;
  } catch { /* no window */ }
  return 'home';
}

// A ?view=review deep link carries an implicit intent: land in Files with the
// needs-review filter already on (the old Review tool's whole job).
function initialFilesTargetFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'review') return { needsReview: true };
  } catch { /* no window */ }
  return null;
}

// ?demo=blocks — a no-auth preview of the live Goal Thread that renders one of EVERY chat
// element through the REAL renderer (ChatGoalThread / GoalThreadBody), so the whole agent
// chat vocabulary can be verified on one screen without firing into a real conversation.
function demoBlocksRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'blocks'; }
  catch { return false; }
}
function demoCatchUpModalRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'catchup-modal'; }
  catch { return false; }
}
function demoHomeQuickThreadRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'home-quick-thread'; }
  catch { return false; }
}
function demoMobileChatLifecycleRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'mobile-chat-lifecycle'; }
  catch { return false; }
}
function demoFilePreviewsRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'file-previews'; }
  catch { return false; }
}
function demoGlobalMotionRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'global-motion'; }
  catch { return false; }
}

function demoEmailAutoReplyRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'email-autoreply'; }
  catch { return false; }
}
function demoM12MobileRequested() {
  try { return new URLSearchParams(window.location.search).get('demo') === 'm12-mobile'; }
  catch { return false; }
}

// Deterministic, no-auth capture of the two M12 surfaces. This is a visual QA
// fixture only: it mounts the real templates, binder, Email shell, and CSS while
// keeping browser screenshots independent of a live workspace or inbox.
function DemoM12Mobile() {
  const screen = (() => { try { return new URLSearchParams(window.location.search).get('screen') || 'home'; } catch { return 'home'; } })();
  const homeHtml = useMemo(() => composeScreen(homeMobileRaw, { mobile: true, pick: 0 }), []);
  const inboxHtml = useMemo(() => composeScreen(inboxRaw, { mobile: true, dropEmbeddedStates: true }), []);
  const home = useMemo(() => {
    const now = Date.now();
    const shaped = shapeHome({
      agents: [
        { slug: 'web', name: 'Web', status: 'working' },
        { slug: 'research', name: 'Research', status: 'online' },
        { slug: 'email', name: 'Email', status: 'idle' },
      ],
      projectRooms: [
        { slug: 'corner', name: 'Corner', last_message_at: now - 7 * 60_000, last_message_text: 'The mobile room hierarchy is ready for a visual pass.' },
        { slug: 'aom', name: 'AOM', last_message_at: now - 58 * 60_000, last_message_text: 'The positioning brief is ready for review.' },
        { slug: 'agent-hooks', name: 'Agent Hooks', last_message_at: now - 2 * 3_600_000, last_message_text: 'Shared the integration map and next build steps.' },
        { slug: 'ahead-of-market', name: 'aheadofmarket.com', last_message_at: now - 5 * 3_600_000, last_message_text: 'Homepage proofing is complete.' },
        { slug: 'ops', name: 'Bridge', last_message_at: now - 1_000, last_message_text: 'Chat-serving alert: bridge counter alert: event_empty' },
      ],
    }).data;
    shaped.agentsTotal = shaped.agents.length;
    // Home passes an empty roster while the accordion is closed; the total stays
    // on the header. Mirror that real render path so Projects remain visible.
    shaped.agents = [];
    shaped.agentsOpen = 'closed';
    shaped.recent.has = shaped.recent.length ? 'has' : 'none';
    shaped.projects.moreCount = 0;
    shaped.projects.moreState = 'none';
    return shaped;
  }, []);
  const inboxData = useMemo(() => ({
    counts: { needYou: 3, watching: 7 },
    chips: { all: 'on', needs: 'off', watching: 'off' },
    secVis: { needs: 'shown', watching: 'shown' },
    needsYou: [
      { id: 'e1', initials: 'JF', avatarTint: 'green', subject: 'Re: Great meeting you at the Aerospace Summit', time: '5h', snippet: 'Jessica Fry · Would Tuesday morning work?', tags: [] },
      { id: 'e2', initials: 'PB', avatarTint: 'violet', subject: 'Pilot expansion and revised pricing', time: '2d', snippet: 'Phoenix Battle · Can you send the three-team option?', tags: [] },
      { id: 'e3', initials: 'TS', avatarTint: 'pink', subject: 'Updated invitation: SR Weekly Sync', time: '5d', snippet: 'Taryn Struck · Wednesday at 8:30am', tags: [] },
    ],
    watching: [
      { id: 'e4', subject: 'Invoice paid', time: '6d', snippet: 'Accounts · Filed automatically' },
    ],
  }), []);
  const noop = useMemo(() => ({ nav: () => {}, search: () => {}, openNav: () => {}, setFilter: () => {}, openThread: () => {}, assignAgent: () => {} }), []);
  const inbox = <TemplateScreen html={inboxHtml} data={inboxData} actions={noop} state="ready" aliases={SUPPORT_ALIASES} style={{ width: '100%', height: '100%' }} />;
  return (
    <div data-cv6 data-theme="dark" data-app-theme="dark" style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--ground)', overflow: 'hidden' }}>
      {screen === 'email'
        ? <EmailShell isDesktop={false} forceAutoReply inbox={inbox} onBack={() => {}} onOpenNav={() => {}} onSearch={() => {}} />
        : <TemplateScreen html={homeHtml} data={home} actions={noop} state="ready" aliases={HOME_ALIASES} style={{ width: '100%', height: '100%' }} />}
    </div>
  );
}
function globalMotionTheme() {
  try {
    const requested = new URLSearchParams(window.location.search).get('theme');
    return ['dark', 'light', 'glass'].includes(requested) ? requested : 'dark';
  } catch { return 'dark'; }
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

function DemoCatchUpModal({ worldId }) {
  const card = {
    id: 'demo-catchup-modal',
    kind: 'agent',
    kindLabel: 'AGENT',
    from: 'Renderer Room',
    subject: 'Modal renderer',
    summary: 'Can you confirm the renderer migration?',
    project: 'renderer-room',
    missionSlug: 'renderer-room:modal-proof',
  };
  return (
    <div data-cv6 data-theme="dark" style={{ minHeight: '100dvh', background: 'var(--ground, #05080b)', position: 'relative' }}>
      <CatchUpModal
        card={card}
        worldId={worldId || 'local-render'}
        idx={0}
        total={1}
        onPrev={() => {}}
        onNext={() => {}}
        onClose={() => {}}
        onGoToRoom={() => {}}
      />
    </div>
  );
}

const DEMO_HOME_ROOM = {
  id: 'renderer-room',
  name: 'Renderer Room',
  initials: 'RR',
  isProject: true,
  status: 'ready',
  statusText: 'project chat',
};

const DEMO_HOME_MESSAGES = [
  {
    id: 'home-thread-user',
    agentInitials: 'YO',
    agentName: 'You',
    agentTint: 'accent',
    isUser: true,
    text: 'Please check the Home quick renderer.',
    time: '11:30 AM',
  },
  {
    id: 'home-thread-text',
    agentInitials: 'CO',
    agentName: 'Corner',
    agentTint: 'violet',
    isUser: false,
    text: 'Home quick thread has a fresh seeded reply.',
    time: '11:40 AM',
  },
  {
    id: 'home-thread-attachment',
    agentInitials: 'CO',
    agentName: 'Corner',
    agentTint: 'violet',
    isUser: false,
    text: '',
    time: '11:42 AM',
    attachments: [{
      url: '/demo/renderer-audit.pdf',
      name: 'renderer-audit.pdf',
      mime: 'application/pdf',
      size: 18320,
    }],
  },
  {
    id: 'home-thread-link',
    agentInitials: 'CO',
    agentName: 'Corner',
    agentTint: 'violet',
    isUser: false,
    text: 'The renderer report is live.',
    time: '11:44 AM',
    linkCards: [{
      url: 'https://example.test/home-renderer-report',
      summary: 'Home renderer report is live',
    }],
  },
];

function DemoHomeQuickThread() {
  const [open, setOpen] = useState(false);
  const [threadHost, setThreadHost] = useState(null);
  const homeHtml = useMemo(() => composeScreen(homeDesktopRaw, { mobile: false, pick: 0, sharedNav: true }), []);
  useEffect(() => {
    const pick = () => {
      const el = document.querySelector('[data-screen="convo"] .convo-thread');
      setThreadHost((prev) => (prev === el ? prev : (el || null)));
    };
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  const recent = [{
    key: 'p:renderer-room',
    id: 'renderer-room',
    kind: 'project',
    project: 'renderer-room',
    name: 'Renderer Room',
    sub: 'Project chat',
    preview: 'Home quick thread has a fresh seeded reply.',
    age: 'now',
    status: 'ready',
    initials: 'RR',
    tint: 'violet',
    knavSel: 'off',
    roomOpen: open ? 'open' : 'off',
  }];
  recent.count = recent.length;
  recent.has = 'has';
  const projects = [];
  projects.count = 0;
  projects.moreCount = 0;
  projects.moreState = 'none';
  const agents = [];
  agents.count = 0;
  const homeData = {
    rooms: { total: 1 },
    agents,
    agentsTotal: 0,
    agentsOpen: 'closed',
    recent,
    projects,
    catchUp: { count: 0, position: 0, current: {}, rest: [], all: [] },
    room: open ? DEMO_HOME_ROOM : { name: 'Your rooms', initials: '·', statusText: '', status: 'ready' },
    goal: open
      ? { has: 'active', title: '', step: '', total: '', pct: 0, summary: [], checklist: [] }
      : { has: 'none', title: 'Pick a room to see its goal', step: '', total: '', pct: 0, summary: [], checklist: [] },
    convo: { messages: [], has: open ? 'has' : 'none', loading: 'off' },
  };
  const actions = {
    openRecent: () => setOpen(true),
    openRoom: () => setOpen(true),
    nav: () => {},
    toggleFiles: () => {},
    toggleProjectMissions: () => {},
    showMoreProjects: () => {},
  };
  return (
    <div data-cv6 data-theme="dark" style={{ minHeight: '100dvh', background: 'var(--ground, #05080b)' }}>
      <TemplateScreen html={homeHtml} data={homeData} actions={actions} state="ready" aliases={HOME_ALIASES} style={{ width: '100vw', height: '100dvh' }} />
      <Cv6QuickThread
        target={open ? threadHost : null}
        messages={DEMO_HOME_MESSAGES}
        goal={homeData.goal}
        awaiting={false}
        liveSteps={[]}
        room={DEMO_HOME_ROOM}
        onSend={() => {}}
        onReview={() => {}}
      />
    </div>
  );
}

function DemoMobileChatLifecycle() {
  const [cleared, setCleared] = useState(false);
  const nowMs = Date.now();
  const at = (minutesAgo) => new Date(nowMs - minutesAgo * 60_000).toISOString();
  // Real same-origin public assets (same set DemoFilePreviews uses) so the file
  // modal's preview actually renders in the no-auth fixture — the 20/20 chat
  // file-modal loop clicks these and asserts painted content (R-CHAT-FILE-MODAL).
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const room = { id: 'renderer-room', name: 'Renderer Room', initials: 'RR', status: 'working', statusText: 'mobile fixture' };
  const messages = [
    {
      id: 'mobile-old-user',
      agentInitials: 'YO',
      agentName: 'You',
      agentTint: 'accent',
      isUser: true,
      text: 'Older mobile request for day folding.',
      time: '9:00 AM',
      ts: at(60 * 48),
    },
    {
      id: 'mobile-old-agent',
      agentInitials: 'RR',
      agentName: 'Renderer Room',
      agentTint: 'violet',
      isUser: false,
      text: 'Older mobile reply stays inside the folded day.',
      time: '9:05 AM',
      ts: at(60 * 48 - 5),
    },
    {
      id: 'mobile-long-agent',
      agentInitials: 'RR',
      agentName: 'Renderer Room',
      agentTint: 'violet',
      isUser: false,
      text: [
        'Mobile long message clamp proof begins here.',
        'This seeded reply is intentionally verbose so the mobile renderer keeps the prior long-message containment behavior.',
        'It needs enough copy to overflow the 168px clamp used by the shipped mobile ChatLifecycle turn.',
        'The shared renderer must still show Show more before expansion and Show less after expansion.',
        'Any regression here usually means the migration switched mobile into desktop bubble markup.',
        'The paragraph continues with more detail about renderer compatibility flags, day folding, and attachment galleries.',
        'This final line should remain hidden until the clamped message is expanded.',
      ].join('\n\n'),
      time: '11:26 AM',
      ts: at(34),
    },
    {
      id: 'mobile-gallery-file',
      agentInitials: 'RR',
      agentName: 'Renderer Room',
      agentTint: 'violet',
      isUser: false,
      text: '',
      time: '11:32 AM',
      ts: at(28),
      isFile: true,
      // Name stays 'mobile-gallery-proof.png' (cv6-message-renderer.spec asserts
      // the tile by this accessible name); the URL now points at a real public
      // asset so the modal preview actually paints.
      fileName: 'mobile-gallery-proof.png',
      attachmentUrl: `${origin}/corner-og.png`,
      fileMime: 'image/png',
      fileSize: 18500,
      attachments: [{ url: `${origin}/corner-og.png`, name: 'mobile-gallery-proof.png', mime: 'image/png', size: 18500 }],
    },
    // A text turn between the image and the docs keeps them as SEPARATE gallery
    // runs (consecutive isFile messages merge), preserving the renderer spec's
    // "sent 1 file" assertion on the image gallery.
    {
      id: 'mobile-doc-intro',
      agentInitials: 'RR',
      agentName: 'Renderer Room',
      agentTint: 'violet',
      isUser: false,
      text: 'Two documents follow for the file modal proof.',
      time: '11:33 AM',
      ts: at(27),
    },
    // Two consecutive DOC files → the Documents collection card, whose rows open
    // the chat file modal (FileCollectionViewer). One pdf + one md so the loop
    // exercises both the pdf.js shell path and the inline-text path.
    {
      id: 'mobile-doc-pdf',
      agentInitials: 'RR',
      agentName: 'Renderer Room',
      agentTint: 'violet',
      isUser: false,
      text: '',
      time: '11:34 AM',
      ts: at(26),
      isFile: true,
      fileName: 'Artlink_Brand_Standards.pdf',
      attachmentUrl: `${origin}/artlink/Artlink_Brand_Standards.pdf`,
      fileMime: 'application/pdf',
      fileSize: 0,
      attachments: [{ url: `${origin}/artlink/Artlink_Brand_Standards.pdf`, name: 'Artlink_Brand_Standards.pdf', mime: 'application/pdf', size: 0 }],
    },
    {
      id: 'mobile-doc-txt',
      agentInitials: 'RR',
      agentName: 'Renderer Room',
      agentTint: 'violet',
      isUser: false,
      text: '',
      time: '11:35 AM',
      ts: at(25),
      isFile: true,
      fileName: 'DESIGN.md',
      attachmentUrl: `${origin}/cv4-static/DESIGN.md`,
      fileMime: 'text/markdown',
      fileSize: 0,
      attachments: [{ url: `${origin}/cv4-static/DESIGN.md`, name: 'DESIGN.md', mime: 'text/markdown', size: 0 }],
    },
    {
      id: 'mobile-live-user',
      agentInitials: 'YO',
      agentName: 'You',
      agentTint: 'accent',
      isUser: true,
      text: 'Keep checking the mobile renderer.',
      time: '11:59 AM',
      ts: at(1),
    },
  ];
  const liveSteps = [
    { id: 'mobile-live-step-1', parent_message_id: 'mobile-live-user', step_index: 0, text: 'Checking mobile renderer output', timestamp: at(1) },
    { id: 'mobile-live-step-2', parent_message_id: 'mobile-live-user', step_index: 1, text: 'Keeping mobile gallery compatibility', timestamp: at(0) },
  ];
  return (
    <div data-cv6 data-theme="dark" style={{ width: '100vw', height: '100dvh', background: 'var(--ground, #05080b)' }}>
      <ChatLifecycle
        room={room}
        fullRoom={room}
        worldId="local-render"
        messages={cleared ? [] : messages}
        archivedMessages={cleared ? messages : []}
        status={cleared ? 'empty' : 'ready'}
        goal={cleared ? null : { title: 'Keep checking the mobile renderer.' }}
        liveSteps={cleared ? [] : liveSteps}
        awaiting={!cleared}
        onBack={() => {}}
        onOpenNav={() => {}}
        onClearRoom={async () => {
          try {
            const response = await fetch('/api/dashboard/room-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: 'local-render', agent: room.id }) });
            if (!response.ok) return false;
            setCleared(true);
            return true;
          } catch { return false; }
        }}
        onSend={async (text, options = {}) => {
          // Demo fixture: the send must be awaitable + interceptable so specs can
          // assert the composer contract; Playwright owns this POST.
          try {
            const r = await fetch('/api/dashboard/supabase-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: 'local-render', agent: 'renderer-room', text, role: 'user', source: 'demo-fixture', metadata: { interaction_mode: options.interactionMode === 'plan' ? 'plan' : 'work' } }) });
            return r.ok;
          } catch { return false; }
        }}
        onOpenReview={() => {}}
      />
    </div>
  );
}

// No-auth browser fixture for the active Files screen, whose detail pane is the
// shared Review renderer. The browser spec supplies the deliberately stale queue
// type so this fixture exercises the real API-to-viewer correction path.
function DemoFilePreviews() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const files = useMemo(() => [
    { url: 'https://fixture.local/review-page.html', name: 'review-page.html', mime: 'text/html' },
    { url: `${origin}/artlink/Artlink_Brand_Standards.pdf`, name: 'Artlink_Brand_Standards.pdf', mime: 'application/pdf' },
    { url: `${origin}/corner-og.png`, name: 'corner-og.png', mime: 'image/png' },
    { url: `${origin}/ConradFoundation/nancy-sample-tile-v1.mp4`, name: 'nancy-sample-tile-v1.mp4', mime: 'video/mp4' },
  ], [origin]);
  const selected = useMemo(() => {
    let kind = 'html';
    try { kind = new URLSearchParams(window.location.search).get('preview') || kind; } catch { /* SSR */ }
    const index = { html: 0, pdf: 1, image: 2, video: 3 }[kind] ?? 0;
    return files[index];
  }, [files]);
  return (
    <div data-cv6 data-theme="dark" style={{ width: '100vw', height: '100dvh', background: 'var(--ground, #05080b)' }}>
      <Organize
        target={{ files: [selected], project: '' }}
        onNav={() => {}}
        onOpenNav={() => {}}
        onAssignFile={() => {}}
      />
    </div>
  );
}

const GLOBAL_MOTION_ACTION_HTML = `
  <div data-cv6 data-theme="dark" class="cv6-screen" data-screen="global-motion-action" style="height:auto;min-height:96px;padding:20px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;">
    <button class="assign" data-action="acknowledgeLoading">Acknowledge loading</button>
  </div>`;

function DemoGlobalMotion() {
  // This fixture intentionally holds a declared request in flight. It is public,
  // deterministic, and mounts the real loader + template binder without tenant data.
  const inFlight = true;
  const theme = globalMotionTheme();
  return (
    <div
      data-cv6
      data-theme={theme}
      data-app-theme={theme}
      data-load-in-flight={inFlight ? 'true' : 'false'}
      style={{ minHeight: '100dvh', background: 'var(--ground)', color: 'var(--fg)', display: 'grid', placeItems: 'center', padding: 20, boxSizing: 'border-box' }}
    >
      <div style={{ width: 'min(560px, 100%)', minHeight: 360, display: 'grid', gridTemplateRows: '1fr auto', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden', background: 'var(--ground)' }}>
        {inFlight && <CornerLogoLoader inline label="Gathering your rooms" />}
        <TemplateScreen
          html={GLOBAL_MOTION_ACTION_HTML}
          data={{}}
          actions={{ acknowledgeLoading: () => {} }}
          state="ready"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}

// Bare mission slug for a room (review routing needs it; xhigh finding 3).
const roomMissionSlug = (r) => (r?.isMission ? String(r.missionSlug || r.id || '').split(':').pop() : '');

export default function CornerCV6() {
  const worldId = useWorldId();
  const isDesktop = useIsDesktop();
  const roomRegistry = useChatList();
  // iOS can defer its first `dvh` correction until the user scrolls the document,
  // which leaves a false strip of body background under an otherwise full-height
  // app. Lock the document and size the shell from VisualViewport on first paint;
  // inner chat/list panels remain the only intentional scroll owners.
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    const syncViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(viewport?.height || window.innerHeight || root.clientHeight);
        if (height > 0) root.style.setProperty('--cv6-viewport-height', `${height}px`);
      });
    };
    root.classList.add('cv6-app-active');
    syncViewport();
    requestAnimationFrame(syncViewport);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    window.addEventListener('pageshow', syncViewport);
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      window.removeEventListener('pageshow', syncViewport);
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      root.classList.remove('cv6-app-active');
      root.style.removeProperty('--cv6-viewport-height');
    };
  }, []);
  const chatWindowRoute = useMemo(() => {
    try { return chatWindowRouteFromSearch(window.location.search); } catch { return null; }
  }, []);
  const isChatWindow = Boolean(chatWindowRoute);
  const isEmailColumn = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'support' && params.get('popout') === 'email';
    } catch { return false; }
  }, []);
  // Cold start lands in the last-open room (drop 3): Home stops being the front
  // door. An explicit ?view= deep link still wins; Back still reaches Home.
  // An EXPLICIT ?view= (any value, home included) always wins over the seed —
  // and a seed saved under another tenant never replays here (xhigh findings 5+6).
  const explicitView = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('view');
  const coldSeed = (() => {
    if (chatWindowRoute) return null;
    if (explicitView) return null;
    try {
      const saved = JSON.parse(localStorage.getItem('cv6.lastRoom') || 'null');
      if (!saved || !saved.room || !saved.room.id) return null;
      if (saved.worldId && worldId && saved.worldId !== worldId) return null;
      return saved;
    } catch { return null; }
  })();
  const routeSeed = chatWindowRoute ? { room: chatWindowRoute.room, worldId: null } : null;
  const [view, setView] = useState(() => {
    if (routeSeed) return 'chatlist';
    const v = initialViewFromUrl();
    if (v !== 'home' || explicitView) return v;
    return coldSeed ? 'chatlist' : 'home';
  }); // 'home' | 'chatlist' | 'support' | 'command' | 'tracker'
  const [openedRoom, setOpenedRoom] = useState(() => routeSeed || (coldSeed ? { room: coldSeed.room, worldId: coldSeed.worldId } : null)); // { room, worldId } -> Chat
  const [restoredRoomPending, setRestoredRoomPending] = useState(() => Boolean(routeSeed || coldSeed));
  const [chatWindowInvalid, setChatWindowInvalid] = useState(false);
  const [roomNotice, setRoomNotice] = useState('');
  const [history, setHistory] = useState([]); // nav stack of { view, openedRoom } for Back
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // ⌘K command palette (Search.jsx)
  const [assignConfig, setAssignConfig] = useState(null); // { type, id, title } for AssignButton overlay
  // When you tap "Review" on a file card anywhere (Home catch-up, a chat attachment),
  // this carries the target into FILES ({ name | files, project, missionSlug,
  // needsReview }) — Files selects the room, flips the needs-review filter on, and
  // auto-opens that exact file with the verdict rail live. Reset on every plain nav
  // to Files so the toolbar entry lands on the browse view, not a stale file.
  const [filesTarget, setFilesTarget] = useState(initialFilesTargetFromUrl);
  // Tapping a project anywhere (Chat list, etc.) opens that project's home on Home —
  // its missions list + the "step into general project chat" button — instead of jumping
  // straight into a chat. Home consumes this and opens its (proven) project-detail screen.
  const [pendingProjectId, setPendingProjectId] = useState(null);
  // Review in place (corner:one-corner drop 2): reviewing a file never leaves the
  // room. Every review affordance in the app already funnels through
  // onNav('organize', { needsReview, files|name, ... }) — the router intercepts
  // that payload and mounts the review overlay OVER the current screen instead of
  // navigating away; closing it lands on the exact room state beneath. A plain
  // Files navigation (no needsReview payload) still routes to the Files tool.
  const [roomReview, setRoomReview] = useState(null);

  // A saved room is a convenience, not authority. Validate it against the live
  // agent/project registry and, for missions, the mission tree. Archived rooms
  // now fall back to Rooms with an honest notice instead of opening a phantom.
  useEffect(() => {
    if (!restoredRoomPending || !openedRoom?.room || roomRegistry.state === 'loading') return undefined;
    let alive = true;
    const room = openedRoom.room;
    const base = { agents: roomRegistry.data?.agents || [], projects: roomRegistry.data?.projects || [] };
    const invalidate = () => {
      if (!alive) return;
      if (!isChatWindow) {
        try { localStorage.removeItem('cv6.lastRoom'); } catch { /* private mode */ }
      }
      setOpenedRoom(null);
      setView(isChatWindow ? 'chatlist' : 'home');
      setHistory([]);
      if (isChatWindow) setChatWindowInvalid(true);
      else setRoomNotice('That saved room is no longer active. Showing all rooms instead.');
      setRestoredRoomPending(false);
    };
    const initial = savedRoomExists(room, base);
    if (initial === false) { invalidate(); return () => { alive = false; }; }
    if (initial === true) { setRestoredRoomPending(false); return () => { alive = false; }; }

    authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(worldId)}`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!alive) return;
        if (!payload) { setRestoredRoomPending(false); return; }
        if (!savedRoomExists(room, { ...base, missionTrees: missionTreesFromResponse(payload) })) invalidate();
        else setRestoredRoomPending(false);
      })
      .catch(() => { if (alive) setRestoredRoomPending(false); });
    return () => { alive = false; };
  }, [restoredRoomPending, openedRoom, roomRegistry.state, roomRegistry.data, worldId, isChatWindow]);

  useEffect(() => {
    if (!isChatWindow || !openedRoom?.room?.name) return;
    document.title = `${openedRoom.room.name} · Corner chat`;
  }, [isChatWindow, openedRoom?.room?.name]);

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
  // Two stale-surface syncs on every theme change:
  // 1. index.html's boot script stamps data-app-theme on <html> pre-paint (anti-flash)
  //    and nothing ever updated it after — and the glass token block is last in cv6.css,
  //    so a stale html[data-app-theme="glass"] outranked any later in-app pick on every
  //    nested [data-cv6] node. Net effect: switching INTO glass worked, switching away
  //    did nothing until a full reload. Desktop tabs get reloaded; the saved-to-home
  //    app doesn't — "themes work on desktop but not mobile" (Patrik 2026-07-19).
  // 2. The static <meta name="theme-color"> shipped dark-navy, so the phone's app
  //    chrome (status bar / task switcher) stayed dark even in light mode.
  useEffect(() => {
    document.documentElement.setAttribute('data-app-theme', theme);
    const ground = { dark: '#0A0A0B', light: '#F6F6F7', glass: '#0c1218' }[theme] || '#0A0A0B';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); document.head.appendChild(meta); }
    meta.setAttribute('content', ground);
  }, [theme]);

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
    // Legacy 'review' navs (any straggler call site) land in Files with the
    // needs-review filter on — the Review tool is a mode of Files now.
    if (target === 'review') {
      target = 'organize';
      arg = arg && typeof arg === 'object' ? { ...arg, needsReview: true } : { needsReview: true };
    }
    // Review in place (drop 2): a needs-review payload with a concrete file opens
    // the in-room overlay; you never leave the screen you are on.
    if (target === 'organize' && arg && typeof arg === 'object' && arg.needsReview && ((arg.files && arg.files.length) || arg.name)) {
      setRoomReview(arg);
      return;
    }
    if (['home', 'support', 'command', 'tracker', 'organize', 'settings', 'livescribe'].includes(target)) {
      // Carry a "Review this file" target into Files; a plain toolbar nav('organize')
      // passes no arg and clears any prior target.
      if (target === 'organize') setFilesTarget(arg && typeof arg === 'object' ? arg : null);
      goTo(target, null);
      return;
    }
    // Chat from the menu opens the conversations list; a row there opens the Goal Thread.
    // "See all" rooms (Home All Rooms header) routes to the same full rooms list (was a
    // dead 'rooms' target that fell through to nothing).
    else if (target === 'chat' || target === 'rooms') goTo('chatlist', null);
  }, [back, goTo]);
  // Opening a room keeps the current view underneath so Back returns to where you tapped from.
  // Every open also remembers the room (cv6.lastRoom) so the next cold start lands here.
  const onOpenRoom = useCallback((room, wid) => {
    setRestoredRoomPending(false);
    setRoomNotice('');
    try { localStorage.setItem('cv6.lastRoom', JSON.stringify({ room, worldId: wid || worldId })); } catch { /* private mode */ }
    goTo(view, { room, worldId: wid || worldId });
  }, [goTo, view, worldId]);
  // Open a project's home (missions + general chat) on the Home surface.
  const onOpenProject = useCallback((proj) => {
    const id = proj?.id || proj;
    if (!id) return;
    setPendingProjectId(id);
    goTo('home', null);
  }, [goTo]);
  const onOpenNav = useCallback(() => setNavOpen(true), []);
  const onSearch = useCallback(() => setSearchOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const goHome = useCallback(() => { setHistory([]); setOpenedRoom(null); setView('home'); }, []);
  const onOpenChatWindow = useCallback((room) => {
    if (!room?.id || typeof window === 'undefined') return;
    // A chat opens at one-column width. Each room has its own named window, so several
    // independent conversations can stay open and be tiled side by side on desktop.
    const width = Math.max(460, Math.min(540, (window.screen?.availWidth || 1280) - 80));
    const height = Math.max(680, Math.min(920, (window.screen?.availHeight || 900) - 90));
    const slotKey = 'cv6.chatWindowSlot';
    let slot = 0;
    try { slot = (Number(sessionStorage.getItem(slotKey) || 0) + 1) % 3; sessionStorage.setItem(slotKey, String(slot)); } catch { /* private mode */ }
    const left = Math.max(20, Math.min((window.screen?.availWidth || width) - width - 20, 24 + slot * (width + 18)));
    const top = Math.max(20, Math.round(((window.screen?.availHeight || height) - height) / 2));
    const child = window.open(
      chatWindowUrl(room, window.location.href),
      chatWindowName(room, worldId),
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
    if (!child) {
      setRoomNotice('Your browser blocked the chat window. Allow pop-ups for Corner and try again.');
      return;
    }
    try { child.opener = null; child.focus(); } catch { /* the window still opened */ }
  }, [worldId]);
  const onOpenEmailWindow = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const width = Math.max(460, Math.min(560, (window.screen?.availWidth || 1280) - 80));
    const height = Math.max(680, Math.min(920, (window.screen?.availHeight || 900) - 90));
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('cv6', '1');
    url.searchParams.set('view', 'support');
    url.searchParams.set('popout', 'email');
    const left = Math.max(20, (window.screen?.availWidth || width) - width - 24);
    const top = Math.max(20, Math.round(((window.screen?.availHeight || height) - height) / 2));
    const child = window.open(
      url.toString(),
      `corner-email-${String(worldId || 'world').replace(/[^a-z0-9_-]+/gi, '-')}`,
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
    if (!child) {
      setRoomNotice('Your browser blocked the Email column. Opening Email here instead.');
      return false;
    }
    try { child.opener = null; child.focus(); } catch { /* the window still opened */ }
    return true;
  }, [worldId]);

  // ?demo=blocks — render the full chat-element preview through the real renderer and stop.
  // (After all hooks above, so hook order stays stable; the flag is constant per load.)
  const demoBlocks = useMemo(() => demoBlocksRequested(), []);
  const demoCatchUpModal = useMemo(() => demoCatchUpModalRequested(), []);
  const demoHomeQuickThread = useMemo(() => demoHomeQuickThreadRequested(), []);
  const demoMobileChatLifecycle = useMemo(() => demoMobileChatLifecycleRequested(), []);
  const demoFilePreviews = useMemo(() => demoFilePreviewsRequested(), []);
  const demoGlobalMotion = useMemo(() => demoGlobalMotionRequested(), []);
  const demoEmailAutoReply = useMemo(() => demoEmailAutoReplyRequested(), []);
  const demoM12Mobile = useMemo(() => demoM12MobileRequested(), []);
  if (demoCatchUpModal) return <DemoCatchUpModal worldId={worldId} />;
  if (demoHomeQuickThread) return <DemoHomeQuickThread />;
  if (demoMobileChatLifecycle) return <DemoMobileChatLifecycle />;
  if (demoFilePreviews) return <DemoFilePreviews />;
  if (demoGlobalMotion) return <DemoGlobalMotion />;
  if (demoM12Mobile) return <DemoM12Mobile />;
  if (demoEmailAutoReply) {
    return (
      <div data-cv6 data-app-theme={theme} style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--ground)' }}>
        <EmailShell isDesktop={isDesktop} forceAutoReply
          inbox={<div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>Inbox fixture</div>} />
      </div>
    );
  }
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
  if (chatWindowInvalid) {
    body = (
      <div data-cv6 data-theme="dark" className="cv6-screen" style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 28, textAlign: 'center' }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>This chat is no longer available.</div><div style={{ marginTop: 7, color: 'var(--muted)', fontSize: 13 }}>It may have been archived or moved.</div><a href="/dashboard?cv6=1&view=home" style={{ display: 'inline-flex', marginTop: 18, minHeight: 40, alignItems: 'center', padding: '0 15px', borderRadius: 11, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Open Corner</a></div>
      </div>
    );
    viewKey = 'chat-window:invalid';
  }
  else if ((isDesktop || isChatWindow) && (view === 'chatlist' || openedRoom)) {
    body = <ChatDesktop worldId={worldId}
      initialRoom={openedRoom ? { id: openedRoom.room?.id, name: openedRoom.room?.name, initials: openedRoom.room?.initials, isProject: openedRoom.room?.isProject, isMission: openedRoom.room?.isMission, missionSlug: openedRoom.room?.missionSlug, projectSlug: openedRoom.room?.projectSlug, path: openedRoom.room?.path, status: openedRoom.room?.status, statusText: openedRoom.room?.statusText, specialistTitle: openedRoom.room?.specialistTitle, hasCustomTitle: openedRoom.room?.hasCustomTitle } : null}
      onNav={onNav} onOpenNav={onOpenNav} onOpenWindow={onOpenChatWindow} windowMode={isChatWindow} persistSelection={!isChatWindow}
      onAssignEmail={(emailId, item) => setAssignConfig({ type: 'email', id: emailId, title: 'Assign email to agent', artifactTitle: item?.subject || '', details: item ? `From ${item.sender || 'someone'}${item.address ? ` <${item.address}>` : ''}${item.snippet ? ` — ${item.snippet}` : ''}` : '' })}
      onReviewFile={(f, proj, mission) => { const files = Array.isArray(f) ? f : (f && typeof f === 'object' ? [f] : null); onNav('organize', files?.length ? { files, project: proj || '', missionSlug: mission || '', needsReview: true } : null); }} />;
    viewKey = `chatdesktop:${openedRoom?.room?.id || 'list'}`;
  }
  else if (openedRoom) { body = <Chat room={openedRoom.room} worldId={openedRoom.worldId || worldId} onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} />; viewKey = `chat:${openedRoom.room?.id}`; }
  else if (view === 'support') { const onAssignEmail = (emailId, item) => setAssignConfig({ type: 'email', id: emailId, title: 'Assign email to agent', artifactTitle: item?.subject || '', details: item ? `From ${item.sender || 'someone'}${item.address ? ` <${item.address}>` : ''}${item.snippet ? ` — ${item.snippet}` : ''}` : '' }); const inboxBody = isDesktop ? <SupportDesktop onNav={onNav} onOpenNav={onOpenNav} onAssignEmail={onAssignEmail} worldId={worldId} /> : <SupportInbox onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} onAssignEmail={onAssignEmail} worldId={worldId} />; body = <EmailShell isDesktop={isDesktop} inbox={inboxBody} onBack={() => onNav('back')} onOpenNav={onOpenNav} onSearch={onSearch} />; viewKey = 'support'; }
  else if (view === 'organize') { body = <Organize onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} target={filesTarget} onAssignFile={(fileId, extra) => setAssignConfig({ type: 'file', id: fileId, title: 'Assign file to agent', artifactTitle: String(fileId || '').split('/').pop() || '', ...(extra || {}) })} />; viewKey = 'organize'; }
  else if (view === 'settings') { body = <Settings onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} theme={theme} onTheme={changeTheme} />; viewKey = 'settings'; }
  else if (view === 'livescribe') { body = <LiveScribe onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} />; viewKey = 'livescribe'; }
  else if (view === 'command') { body = <Command worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} onOpenRoom={onOpenRoom} />; viewKey = 'command'; }
  else if (view === 'tracker') { body = <Tracker worldId={worldId} onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} onAssignBug={(bugId, extra) => setAssignConfig({ type: 'bug', id: bugId, title: 'Assign bug to agent', ...(extra || {}) })} />; viewKey = 'tracker'; }
  else if (view === 'chatlist') { body = <ChatList onNav={onNav} onOpenRoom={onOpenRoom} onOpenProject={onOpenProject} onOpenNav={onOpenNav} onCommandK={onSearch} />; viewKey = 'chatlist'; }
  else { body = <Home onNav={onNav} onOpenRoom={onOpenRoom} onOpenWindow={onOpenChatWindow} onOpenNav={onOpenNav} onCommandK={onSearch} pendingProjectId={pendingProjectId} onProjectConsumed={() => setPendingProjectId(null)} />; viewKey = 'home'; }

  const current = (openedRoom || view === 'chatlist') ? 'chat' : view;
  const parkedLabel = { organize: 'Files', command: 'Command', tracker: 'Tracker', livescribe: 'Scribe' }[view] || '';
  // Nav badges retired with the bar (drop 4): "waiting on you" now lives as amber
  // badges on the room rows themselves — the signal sits where the work is.
  const navBadges = {};
  return (
    <div data-cv6 data-theme="dark" data-app-theme={theme} className="cv6-app-shell" style={{
      // The wallpaper is painted ONCE as a viewport-fixed layer behind everything
      // (index.html body::before), so the frame itself stays transparent. Painting
      // the ground here instead sized the gradient to this box — and with the
      // safe-area padding that box overflows the viewport, shifting the gradient so
      // the notch strip + home-indicator strip fell on the dark edge and read as
      // flat borders that didn't blend (Patrik 2026-07-19). Transparent frame +
      // one fixed wallpaper = the strips share the exact same ground as the body.
      background: 'transparent', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      // Bottom-aware children (composer, sheets, readers) already reserve the
      // home-indicator inset. Reserving it again on the shell shortened every
      // screen and exposed a flat strip above the body-painted wallpaper.
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 0,
    }}>
      {/* The positioning context lives INSIDE the safe-area padding: every
          absolutely-positioned overlay (search, viewers, forms) anchors below the
          iPhone status bar instead of sliding under the clock in the saved-to-home
          app (Patrik 2026-07-18). The root has no position on purpose — do not
          anchor overlays to it. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* One shared desktop bar (design item 7), mounted once for every desktop
          screen; each screen's baked topbar was stripped so this is the only nav. */}
      {/* DEF-12: onOpenProfile was missing — avatar click was a dead no-op. Route to the
          settings view which already exists and is reached via onNav('settings'). */}
      {isDesktop && !isChatWindow && !isEmailColumn && <DesktopNav current={current} onPick={onNav} onOpenCommandK={onSearch} onOpenEmailWindow={onOpenEmailWindow} onOpenProfile={() => onNav('settings')} theme={theme} onTheme={changeTheme} badges={navBadges} />}
      {/* P7: Activity dock — background activity tracking (floating across all screens) */}
      {!isChatWindow && !isEmailColumn && <ActivityDock worldId={worldId} onOpenJob={(job) => {
        if (job?.live && job?.id) {
          const name = job.shortTitle || job.title || titleForAgent(job.id);
          onOpenRoom({ id: job.id, name, initials: name.slice(0, 2).toUpperCase(), status: 'active', statusText: 'working' }, worldId);
        } else onNav?.('command');
      }} />}
      {roomNotice ? (
        <div role="status" style={{ position: 'absolute', zIndex: 34, top: isDesktop ? 68 : 10, left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 28px)', padding: '9px 13px', borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--fg)', boxShadow: '0 12px 30px -12px rgba(0,0,0,.55)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{roomNotice}</span><button type="button" aria-label="Dismiss notice" onClick={() => setRoomNotice('')} style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>×</button>
        </div>
      ) : null}
      <div key={viewKey} className="cv6-screen-stage" data-cv6-view={viewKey}>
        <ScreenBoundary viewKey={viewKey} onHome={goHome}>
          {isDesktop && parkedLabel ? (
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 38, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderBottom: '1px solid var(--divider)', background: 'var(--surface)', color: 'var(--muted)', fontSize: 11.5 }}>
                <span style={{ fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--faint)' }}>Advanced tool</span>
                <span aria-hidden="true">·</span><span style={{ color: 'var(--fg)', fontWeight: 600 }}>{parkedLabel}</span>
                <span style={{ flex: 1 }} />
                {history.length ? <button type="button" onClick={back} style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', font: '600 11.5px var(--font-sans)', cursor: 'pointer' }}>Back</button> : null}
                <button type="button" onClick={goHome} style={{ height: 28, padding: '0 10px', borderRadius: 8, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', font: '600 11.5px var(--font-sans)', cursor: 'pointer' }}>All rooms</button>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{body}</div>
            </div>
          ) : body}
        </ScreenBoundary>
      </div>
      {!isChatWindow && !isEmailColumn && <MobileNav open={navOpen} current={current} onPick={onNav} onClose={closeNav} theme={theme} onTheme={changeTheme} badges={navBadges} />}
      {/* ⌘K command palette — jump to any room or mission. Opens its own data. */}
      {searchOpen && (
        <Search
          onClose={() => setSearchOpen(false)}
          onOpenMenu={() => { setSearchOpen(false); setNavOpen(true); }}
          onOpenRoom={(room, wid) => { setSearchOpen(false); onOpenRoom(room, wid); }}
        />
      )}
      {/* AssignButton overlay — opened by artifact surfaces (review, tracker, support, organize).
          artifactTitle is the REAL artifact name the surface passed (email subject, bug title,
          file name); assignConfig.title is only the overlay heading fallback. details carries
          extra context (e.g. the Review changes list) into the dispatch; onAssigned lets a
          surface persist its own field (e.g. Tracker stamps the bug's owner). */}
      {assignConfig && (
        <AssignButton
          artifactType={assignConfig.type}
          artifactId={assignConfig.id}
          artifactTitle={assignConfig.artifactTitle || assignConfig.title}
          details={assignConfig.details || ''}
          projectSlug={assignConfig.project || ''}
          worldId={worldId}
          onAssigned={assignConfig.onAssigned || null}
          autoOpen
          onClose={() => setAssignConfig(null)}
          onSuccess={() => setAssignConfig(null)}
          onError={() => setAssignConfig(null)}
        />
      )}
      {/* Review in place (drop 2): the review viewer mounted OVER the current screen.
          The room (or Home) stays alive beneath; "Back to chat" closes the overlay and
          you are exactly where you were. Composes the proven Review tools wholesale —
          verdicts, pins, request-changes and the send-back task all ride the existing
          machinery; only the LOCATION changed (never leaves the room). */}
      {roomReview && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 35, background: 'var(--ground)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--divider)' }}>
            <div onClick={() => setRoomReview(null)} role="button" tabIndex={0} aria-label="Back to chat"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); setRoomReview(null); } }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', padding: '6px 10px', borderRadius: 9 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              Back to chat
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--faint)' }}>Your decision goes back to the agent in this chat.</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {isDesktop ? (
              <ReviewDesktop worldId={worldId} target={roomReview}
                onNav={(t, p) => { setRoomReview(null); if (t !== 'back') onNav?.(t, p); }} onOpenNav={onOpenNav}
                onSendBackComplete={() => setRoomReview(null)}
                onAssignDeliverable={(id, extra) => setAssignConfig({ type: 'file', id, title: 'Assign file to agent', artifactTitle: String(id || '').split('/').pop() || '', ...(extra || {}) })} />
            ) : (
              <Review worldId={worldId} target={roomReview}
                onNav={(t, p) => { setRoomReview(null); if (t !== 'back') onNav?.(t, p); }} onOpenNav={onOpenNav}
                onSendBackComplete={() => setRoomReview(null)}
                onAssignDeliverable={(id, extra) => setAssignConfig({ type: 'file', id, title: 'Assign file to agent', artifactTitle: String(id || '').split('/').pop() || '', ...(extra || {}) })} />
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
