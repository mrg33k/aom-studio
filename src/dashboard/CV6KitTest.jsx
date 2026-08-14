import React, { useState, useEffect } from 'react';
import { MobileHomeWired } from './cv6kit/MobileHomeWired.jsx';
import { MobileHomeExact, SAMPLE_HOME_M } from './cv6kit/MobileHomeExact.jsx';
import { MobileProjectWired } from './cv6kit/MobileProjectWired.jsx';
import { NewRoomModal } from './cv6kit/NewRoomModal.jsx';
import { DesktopHomeWired } from './cv6kit/DesktopHomeWired.jsx';
import { DesktopHomeView } from './cv6kit/DesktopHomeView.jsx';

// Sample for the /cv6kit?screen=project preview (the "project opened, missions
// inside" design — FRAME 3). Live CornerVG feeds real missions; this is no-auth.
export const SAMPLE_PROJECT = { slug: 'space-rising', name: 'Space Rising', color: 'var(--violet-400)' };
export const SAMPLE_PROJECT_MISSIONS = [
  { slug: 'lock-print-framing', name: 'Lock the print framing', status: 'running', agent: 'Elon' },
  { slug: 'resolver-patch', name: 'Resolver patch & tests', status: 'running', agent: 'Rex' },
  { slug: 'changelog-v6', name: 'Changelog for v6', status: 'idle', agent: 'Gary' },
  { slug: 'print-spec', name: 'Print spec summary', status: 'done', is_done: true, agent: 'Elon' },
];
import { ChatStepThread } from './cv6kit/ChatStepThread.jsx';
import { TrackerView } from './cv6kit/TrackerView.jsx';
import { CommandView } from './cv6kit/CommandView.jsx';
import { SupportView } from './cv6kit/SupportView.jsx';
import { OrganizeView } from './cv6kit/OrganizeView.jsx';
import { ReviewView } from './cv6kit/ReviewView.jsx';
import { MobileChatList } from './cv6kit/MobileChatList.jsx';
import MobileNavDrawer from './cv6kit/MobileNavDrawer.jsx';
import KitGallery from './cv6kit/KitGallery.jsx';
import { TrackerLive } from './cv6kit/TrackerLive.jsx';
import { ScribeView } from './cv6kit/ScribeView.jsx';
import { OnboardingView } from './cv6kit/OnboardingView.jsx';
import { SettingsView } from './cv6kit/SettingsView.jsx';
import { SideRail as MobileMenu } from './cv6kit/MobileMenu.jsx';
import { ActivityDock } from './cv6kit/ActivityDock.jsx';
import CvgChatSurface from './cv4/CvgChatSurface.jsx';
import './cv6kit/kit.css';

// Sample Step Thread (the kit Chat view) — used to verify the layout in
// isolation. The real wiring waits on a step-emission feed (BUILD.md R-KIT-5).
export const SAMPLE_CHAT = {
  goal: { name: 'Lock the print framing', stepDone: 2, stepTotal: 4 },
  target: { name: 'Elon', initials: 'EL', statusLine: 'working · step 3 of 4' },
  steps: [
    { id: 's1', kind: 'done', title: 'Read brief & pulled repo', sub: 'Scanned 28 missions.' },
    { id: 's2', kind: 'snag', title: 'Hit a snag', statusLabel: 'Needs you', sub: 'Repo isn\'t wired into the runner yet. Your call:', choices: [
      { id: 'quick', recommended: true, title: 'Quick reversible fix', sub: 'Wire it in now, migrate cleanly later. Unblocks the print.' },
      { id: 'clean', title: 'Do it the clean way', sub: 'Set up a proper projects entry first. Slower, but tidier long-term.' },
    ] },
    { id: 's3', kind: 'choice', title: 'You chose the quick fix', sub: 'but pin the framing first.' },
    { id: 's4', kind: 'working', title: 'Patching the resolver', statusLabel: 'Working', sub: 'Pinned your framing, now teaching the task runner where the repo lives.', progress: { pct: 64, label: '3/4' } },
  ],
};

export const SAMPLE_TRACKER = {
  tracker: { name: 'CV6 Bugs', projectName: 'Corner CV6', openCount: 12 },
  bugs: [
    { id: 'CV6-142', title: 'Repo resolver drops docs-only projects', status: 'open', priority: 'high', assignee: { initials: 'EL', name: 'Elon', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' }, updated: '2h' },
    { id: 'CV6-138', title: 'Catch Up cards crowd All Rooms', status: 'in_progress', priority: 'med', assignee: { initials: 'RX', name: 'Rex', tone: '#A3E635', toneBg: 'rgba(163,230,53,.2)' }, updated: '5h' },
    { id: 'CV6-131', title: 'Nav overlaps home indicator', status: 'in_progress', priority: 'med', assignee: { initials: 'EL', name: 'Elon', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' }, updated: '8h' },
    { id: 'CV6-126', title: 'Glass contrast dips on lightest photo', status: 'open', priority: 'low', assignee: { initials: 'GA', name: 'Gary', tone: 'var(--warn)', toneBg: 'rgba(251,191,36,.2)' }, updated: '1d' },
  ],
};

export const SAMPLE_COMMAND = {
  summary: { roomCount: 6, liveCount: 3 },
  featured: {
    room: 'Space Rising', color: 'var(--violet-400)', status: 'live',
    goal: 'Lock Interactive/community framing before the Apr 29 print.',
    checklist: [
      { label: 'Pull repo & scan task-runner', state: 'done' },
      { label: 'Patch resolve_repo_path()', state: 'queued' },
      { label: 'Route docs-only to AOM-EA', state: 'working' },
    ],
    watchers: [
      { name: 'Elon', initials: 'EL', role: 'Master loop', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)', active: true },
      { name: 'Gary', initials: 'GA', role: 'Verifier', tone: 'var(--warn)', toneBg: 'rgba(251,191,36,.2)', active: true },
      { name: 'Patrik', initials: 'P', role: 'Owner', tone: 'var(--muted)', toneBg: 'var(--chip)', active: false },
    ],
  },
  rooms: [
    { id: 'r1', name: 'Corner', color: 'var(--accent)', sub: 'Ship CV6 mobile parity', status: 'live' },
    { id: 'r2', name: 'Included Health', color: 'var(--pink-400)', sub: 'Batch02 culture deck', status: 'blocked' },
    { id: 'r3', name: 'Loop Test Project', color: 'var(--faint)', sub: 'Validate routing across missions', status: 'ready' },
  ],
  activities: [
    { state: 'recording', title: 'Recording', sub: 'Corner · Dashboard · 08:42', badge: 'REC', badgeColor: '#F87171', badgeBg: 'rgba(248,113,113,.16)' },
    { state: 'working', title: 'Elon · patching', sub: 'CV6-142 · step 2 of 3' },
    { state: 'working', title: 'Print build', sub: 'space-rising · 58%' },
  ],
};

/**
 * CV6 Kit preview route (/cv6kit). Renders the REAL wired Home components (the
 * same ones mounted in CornerVG on /dashboard) but with sample props, so the
 * layout + data mapping can be verified without auth. Responsive: the desktop
 * three-column Home when the viewport is wide (>=1024px), the mobile Home when
 * narrow — mirroring the isDesktop gate in CornerVG. On /dashboard the same
 * components are fed live data.
 */
export const SAMPLE = {
  user: { user_metadata: { full_name: 'Patrik Matheson' } },
  agents: [
    { slug: 'elon', name: 'Elon', status: 'online' },
    { slug: 'rex', name: 'Rex', status: 'working' },
  ],
  projectRooms: [
    { slug: 'space-rising', name: 'Space Rising', tasks: Array.from({ length: 28 }), color: 'var(--violet-400)' },
    { slug: 'andocia', name: 'Andocia', tasks: Array.from({ length: 6 }), color: 'var(--blue-400, #5B9BFF)' },
  ],
  catchup: [
    { id: 'c1', roomName: 'Space Rising', senderName: 'Elon', timeAgo: 'now', messagePreview: 'Need your sign-off on the launch deck before I send it out.' },
  ],
};

export const SAMPLE_RECENT = [
  { from: 'agent', author: 'Elon', initials: 'EL', time: '9:24', text: 'Pulled the latest numbers. The launch deck is ready for your review.' },
  { from: 'me', time: '9:26', text: 'Looks good. Send it once the cover slide is updated.' },
  { from: 'agent', author: 'Elon', initials: 'EL', time: '9:27', text: 'On it. Cover swapped and out the door in five.' },
];

export const SAMPLE_SUPPORT = {
  counts: { openWishes: 3, waitingWishes: 1, openEmails: 2, respondedEmails: 5 },
  wishes: [
    { id: 'w1', name: 'Dana Reyes', email: 'dana@included.health', subject: 'Can the EA pull weekly numbers automatically?', message: 'Love the dashboard. Is there a way to have my assistant compile the Monday metrics without me asking each week?', status: 'needs_you', created_at: '2026-06-20T14:10:00Z', access_code: 'WISH-4821', source: 'web' },
    { id: 'w2', name: 'Marcus Hale', email: 'marcus@andocia.com', subject: 'Mobile app keeps logging me out', message: 'Every time I switch apps and come back I have to sign in again on my phone.', status: 'working', created_at: '2026-06-20T11:02:00Z', access_code: 'WISH-4817', source: 'web' },
    { id: 'w3', name: 'Priya Shah', email: 'priya@valor.vc', subject: 'Add a way to share a room read-only', message: 'I want to show a project to a partner without letting them post.', status: 'open', created_at: '2026-06-19T22:40:00Z', access_code: 'WISH-4809', source: 'email' },
  ],
  inbox: [
    { id: 'e1', from: 'Will Host', email: 'will@andocia.com', subject: 'Re: Corner build proposal', snippet: 'This looks great. One question on the timeline for the second phase…', threadId: 't1', lastInbound: '2026-06-20T15:30:00Z', lastReply: null, date: '2026-06-20T09:00:00Z' },
    { id: 'e2', from: 'Sarah Kim', email: 'sarah@included.health', subject: 'Culture deck feedback', snippet: 'Team loved batch 02. Can we get three more in the same style?', threadId: 't2', lastInbound: '2026-06-20T13:12:00Z', lastReply: '2026-06-20T13:40:00Z', date: '2026-06-19T18:00:00Z' },
  ],
};

export const SAMPLE_ORGANIZE = {
  projects: [
    { id: 'corner', slug: 'corner', name: 'Corner', color: 'var(--accent)', status: 'WORKING', tasks: Array.from({ length: 14 }) },
    { id: 'included', slug: 'included-health', name: 'Included Health', color: 'var(--pink-400, #F472B6)', status: 'IDLE', tasks: Array.from({ length: 6 }) },
    { id: 'andocia', slug: 'andocia', name: 'Andocia', color: 'var(--violet-400)', status: 'IDLE', tasks: Array.from({ length: 9 }) },
  ],
  files: [
    { id: 'f1', name: 'dashboard-port-plan.md', type: 'md', updated: '34m', size: 8214, content: '# Dashboard port plan\n\nMove every screen to the Claude design, keep the logic. Start with the screens that already have data.' },
    { id: 'f2', name: 'launch-deck-cover.png', type: 'png', updated: '2h', size: 184320 },
    { id: 'f3', name: 'room-goals.json', type: 'json', updated: '5h', size: 4096 },
    { id: 'f4', name: 'handoff-2026-06-20.md', type: 'md', updated: '1d', size: 5310, content: '# Handoff\n\nColumns opened on desktop home. Glass box removed. Next: graft the tool screens live.' },
  ],
  selectedProjectId: 'corner',
  selectedFileIds: [],
};

// Interactive Organize preview: opens ON FILES inside a project ("open on files,
// switch from top"). Tap the project name in the breadcrumb to switch projects via
// the bottom sheet, so the new flow is reviewable.
function OrganizePreview() {
  const [sel, setSel] = useState('corner');
  const projects = SAMPLE_ORGANIZE.projects.map((p) => ({ ...p, fileCount: (p.tasks && p.tasks.length) || 0 }));
  const nope = () => {};
  return (
    <OrganizeView
      projects={projects}
      files={SAMPLE_ORGANIZE.files}
      selectedProjectId={sel}
      selectedFileIds={[]}
      onSelectProject={(proj) => setSel(proj.slug || proj.id)}
      onSelectFile={nope}
      onBack={nope}
      onMenu={nope}
      onMove={nope}
      onRename={nope}
      onShare={nope}
      onDelete={nope}
    />
  );
}

// Interactive Review preview: opens on the real queue list, tap an item to read the
// document, back returns to the queue. Mirrors the live read-only flow (no actions).
function ReviewPreview() {
  const [sel, setSel] = useState(null);
  const item = sel ? SAMPLE_REVIEW.selectedItem : null;
  return (
    <ReviewView
      queueItems={SAMPLE_REVIEW.queueItems}
      selectedItem={item}
      comments={[]}
      metadata={item ? { location: item.location } : {}}
      queueSummary={SAMPLE_REVIEW.queueSummary}
      onSelectItem={() => setSel('rv1')}
      onMenu={() => {}}
      onBack={() => setSel(null)}
    />
  );
}

// Interactive Support preview: lands on the real inbox (wishes + emails), tap a row
// to open its thread detail, back returns to the inbox. Mirrors SupportLive.
function SupportPreview() {
  const [sel, setSel] = useState(null);
  const tagged = [
    ...SAMPLE_SUPPORT.wishes.map((w) => ({ ...w, type: 'wish' })),
    ...SAMPLE_SUPPORT.inbox.map((e) => ({ ...e, type: 'email' })),
  ];
  const item = sel ? tagged.find((x) => x.id === sel) || null : null;
  return (
    <SupportView
      wishes={SAMPLE_SUPPORT.wishes}
      inbox={SAMPLE_SUPPORT.inbox}
      counts={SAMPLE_SUPPORT.counts}
      selectedItem={item}
      onSelectItem={(it) => setSel(it.id)}
      onBack={() => setSel(null)}
      onClose={() => {}}
      onDraftReply={() => {}}
      onMarkResolved={() => {}}
    />
  );
}

// Interactive Navigation preview: the mobile global nav drawer (right-anchored)
// open over a real chat-list backdrop, so the scrim + tool rows + status badges
// read in context — the design's "open" state. Tap the scrim to close (reveals the
// edge grabber), tap the grabber to reopen, tap a row to switch the active tool.
// This is the SAME component mounted globally in CornerVG on every cv6 phone screen.
function NavPreview() {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState('chat');
  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <MobileChatList
        agents={[
          { slug: 'elon', name: 'Elon', status: 'working' },
          { slug: 'rex', name: 'Rex', status: 'working' },
          { slug: 'gary', name: 'Gary', status: 'idle' },
        ]}
        projectRooms={[
          { slug: 'space-rising', name: 'Space Rising', color: 'var(--violet-400)', tasks: Array.from({ length: 28 }) },
          { slug: 'corner', name: 'Corner', color: 'var(--accent)', tasks: Array.from({ length: 84 }) },
        ]}
        onOpenAgent={() => {}}
        onOpenProject={() => {}}
        onMenu={() => setOpen(true)}
        onBack={() => {}}
      />
      <MobileNavDrawer
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onNav={(k) => setActive(k)}
        activeKey={active}
        user={{ initials: 'P', name: 'Patrik' }}
        badges={{ chat: { kind: 'live', count: 3 }, review: { kind: 'done', count: 40 }, support: { needs: 3 }, command: { kind: 'live', count: 4 } }}
      />
    </div>
  );
}

export const SAMPLE_REVIEW = {
  queueSummary: { readyCount: 4, pipelineCount: 0 },
  queueItems: [
    { id: 'rv1', title: 'Support ask · handoff', source: 'Corner / Dashboard', timestamp: '11:15', status: 'ready', typeKey: 'doc', typeLabel: 'Document', tone: '#0066FF' },
    { id: 'rv2', title: 'Hero photo set · 6 shots', source: 'Space Rising', timestamp: '11:12', status: 'ready', typeKey: 'image', typeLabel: 'Image', tone: '#8B5CF6' },
    { id: 'rv3', title: 'Onboarding walkthrough', source: 'Corner', timestamp: '10:58', status: 'ready', typeKey: 'video', typeLabel: 'Video', tone: '#EC4899' },
    { id: 'rv4', title: 'cv6 preview · live site', source: 'Dashboard', timestamp: '10:40', status: 'ready', typeKey: 'live', typeLabel: 'Live URL', tone: '#34D399' },
  ],
  selectedItem: {
    id: 'rv1', title: 'Support ask · handoff', source: 'handoff.md', location: 'Corner / Dashboard',
    content: {
      body: 'The Claude design is now the single source of truth for the dashboard. Every screen moves to it while keeping the working logic underneath.',
      sections: [
        { title: 'Interactive / community', body: 'Chat keeps the live message stream; the new look sits on top of it.' },
        { title: 'Rollout order', body: 'Start with the screens that already have data, then the new-feature screens.' },
      ],
    },
  },
  comments: [
    { id: 1, position: { top: 150 }, initials: 'P', text: 'Lead with the user outcome here, not the mechanism.', target: "on 'Interactive/community'", resolved: false },
    { id: 2, position: { top: 250 }, initials: 'P', text: 'Good. Keep this concrete.', target: "on 'Rollout order'", resolved: false },
  ],
  metadata: { from: { name: 'Elon', initials: 'EL' }, location: 'Corner → Dashboard', status: 'Ready' },
};

export const SAMPLE_SCRIBE = {
  recording: { isRecording: true, elapsed: 1287, destination: 'Space Rising · Mission /007' },
  transcript: [
    { speaker: 'Patrik', timestamp: '00:21', text: 'Let’s lock the framing before the print date. Interactive and community lead.' },
    { speaker: 'Elon', timestamp: '00:34', text: 'Got it. I’ll pin that and re-run the build once the resolver patch lands.', tone: 'accent' },
    { speaker: 'Patrik', timestamp: '01:02', text: 'And make sure the docs-only projects still route. That broke last time.' },
  ],
  extracted: {
    actions: [
      { id: 'a1', text: 'Pin Interactive/community framing before the print', assignee: 'Elon', tone: 'accent' },
      { id: 'a2', text: 'Patch the repo resolver for docs-only projects', assignee: 'Elon' },
    ],
    quotes: [
      { id: 'q1', text: 'Interactive and community lead.', speaker: 'Patrik', timestamp: '00:21' },
    ],
    decisions: [
      { id: 'd1', text: 'Quick reversible fix now, clean migration later', tone: 'success' },
    ],
  },
};

// Real live-chat surface (CvgChatSurface) — the SAME component mounted in CornerVG
// on the phone, now wearing the kit glass skin (kit prop). previewMessages seeds the
// thread so /cv6kit?screen=cvgchat shows it with no auth. This is what taps on Chat
// render on /dashboard; the only difference here is the messages are sample, not live.
export const SAMPLE_CVG_MESSAGES = [
  { id: 'm1', role: 'assistant', sender: 'Elon', timestamp: '2026-06-20T09:24:00Z', text: 'Pulled the latest numbers. The launch deck is ready for your review whenever you want to take a look.' },
  { id: 'm2', role: 'user', timestamp: '2026-06-20T09:26:00Z', text: 'Looks good. Send it once the cover slide is updated.' },
  { id: 'm3', role: 'assistant', sender: 'Elon', timestamp: '2026-06-20T09:27:00Z', text: 'On it. Cover swapped and out the door in five.' },
];

export default function CV6KitTest() {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('home');

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const noop = () => {};
  const screen = (typeof window !== 'undefined' && (window.location.search.match(/[?&]screen=([a-z]+)/) || [])[1]) || 'home';
  const newRoomKind = (typeof window !== 'undefined' && (window.location.search.match(/[?&]kind=([a-z]+)/) || [])[1]) || 'project';
  // ?state=empty|loading|error lets us preview a tool's empty / loading / error states.
  const stateVar = (typeof window !== 'undefined' && (window.location.search.match(/[?&]state=([a-z]+)/) || [])[1]) || '';
  // ?theme=dark|light|glass for the kit gallery (defaults glass).
  const themeVar = (typeof window !== 'undefined' && (window.location.search.match(/[?&]theme=([a-z]+)/) || [])[1]) || 'glass';

  if (screen === 'kit') return <KitGallery theme={themeVar} />;

  return (
    <div data-cv6kit data-theme="glass" style={{ minHeight: '100dvh', background: 'var(--ground)' }}>
      {screen === 'deskhome' ? (
        /* The faithful exact pull of the canonical desktop Home (sample data) —
           the full three-column design for review. The live wrapper feeds real data. */
        <DesktopHomeView onNav={noop} onSelectRoom={noop} onNewRoom={noop} onOpenFiles={noop} />
      ) : screen === 'menu' ? (
        <div style={{ height: '100dvh', width: '100%', position: 'relative' }}>
          <MobileMenu
            open={menuOpen}
            onToggle={() => setMenuOpen(!menuOpen)}
            onNav={(key) => setActiveKey(key)}
            activeKey={activeKey}
            user={{ initials: 'P', statusDot: 'online' }}
          />
        </div>
      ) : screen === 'project' ? (
        <MobileProjectWired project={SAMPLE_PROJECT} sampleMissions={SAMPLE_PROJECT_MISSIONS} onBack={noop} onOpenChat={noop} onOpenMission={noop} onNewMission={noop} />
      ) : screen === 'newroom' ? (
        /* New project / mission modal (cv6 glass). ?kind=mission for the mission
           variant. Rendered over the sample Home so the frosted glass reads. */
        <div style={{ height: '100dvh', position: 'relative' }}>
          <MobileHomeWired {...SAMPLE} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
          <NewRoomModal kind={newRoomKind} busy={false} error={null} onSubmit={noop} onClose={noop} />
        </div>
      ) : screen === 'cvgchat' ? (
        <div style={{ height: '100dvh' }}>
          <CvgChatSurface worldId={null} target={{ type: 'agent', name: 'Elon', slug: 'elon' }} kit previewMessages={SAMPLE_CVG_MESSAGES} onSend={noop} onBack={noop} />
        </div>
      ) : screen === 'chatlist' ? (
        <MobileChatList
          agents={[
            { slug: 'elon', name: 'Elon', status: 'online' },
            { slug: 'rex', name: 'Rex', status: 'working' },
            { slug: 'gary', name: 'Gary', status: 'idle' },
          ]}
          projectRooms={[
            { slug: 'space-rising', name: 'Space Rising', color: 'var(--violet-400)', tasks: Array.from({ length: 28 }) },
            { slug: 'corner', name: 'Corner', color: 'var(--accent)', tasks: Array.from({ length: 84 }) },
          ]}
          onOpenAgent={noop}
          onOpenProject={noop}
          onBack={noop}
        />
      ) : screen === 'nav' ? (
        <NavPreview />
      ) : screen === 'chat' ? (
        <ChatStepThread {...SAMPLE_CHAT} onBack={noop} onSend={noop} onChoice={noop} />
      ) : screen === 'tracker' ? (
        <TrackerView {...SAMPLE_TRACKER} onSelectBug={noop} onNewBug={noop} />
      ) : screen === 'trackerlive' ? (
        /* TrackerLive against the real (public) cv6-bugs endpoint — verifies the live wiring. */
        <TrackerLive worldId="aom" onBack={noop} onDiscuss={noop} />
      ) : screen === 'command' ? (
        stateVar === 'empty' ? (
          <CommandView status="loaded" summary={{ roomCount: 0, liveCount: 0 }} featured={null} rooms={[]} activities={[]} onSelectRoom={noop} />
        ) : stateVar === 'loading' ? (
          <CommandView status="loading" summary={{}} featured={null} rooms={[]} activities={[]} onSelectRoom={noop} />
        ) : stateVar === 'error' ? (
          <CommandView status="error" summary={{}} featured={null} rooms={[]} activities={[]} onSelectRoom={noop} />
        ) : (
          <CommandView status="loaded" {...SAMPLE_COMMAND} onSelectRoom={noop} />
        )
      ) : screen === 'support' ? (
        <SupportPreview />
      ) : screen === 'organize' ? (
        <OrganizePreview />
      ) : screen === 'review' ? (
        <ReviewPreview />
      ) : screen === 'scribe' ? (
        <ScribeView {...SAMPLE_SCRIBE} mode={isDesktop ? 'desktop' : 'mobile'} onStop={noop} onSelectItem={noop} onBack={noop} />
      ) : screen === 'onboarding' ? (
        <OnboardingView step={0} steps={5} onNext={noop} onSkip={noop} onBack={noop} />
      ) : screen === 'settings' ? (
        <SettingsView theme="glass" onThemeChange={noop} onConnect={noop} onCycleScope={noop} onEditConnection={noop} onTogglePerm={noop} onToggleNotify={noop} onBackToList={noop} />
      ) : screen === 'dock' ? (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--ground)' }}>
          {/* Float variant — under mock headers */}
          <div style={{ flex: 'none', height: '120px', background: 'var(--surface)', borderBottom: '1px solid var(--divider)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Recording</div>
            <ActivityDock
              job={{ kind: 'recording', label: 'Recording · 08:42', detail: 'Corner · Dashboard' }}
              onOpen={noop}
              onExpand={noop}
              variant="float"
            />
          </div>

          <div style={{ flex: 'none', height: '120px', background: 'var(--surface-2)', borderBottom: '1px solid var(--divider)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Working Agent</div>
            <ActivityDock
              job={{ kind: 'working', label: 'Elon · filing 40 files', detail: 'into Projects · 28 done' }}
              onOpen={noop}
              onExpand={noop}
              variant="float"
            />
          </div>

          <div style={{ flex: 'none', height: '120px', background: 'var(--surface)', borderBottom: '1px solid var(--divider)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Secondary Agent</div>
            <ActivityDock
              job={{ kind: 'secondary', label: 'Gary · pre-screening', detail: '40 in queue · 12 flagged' }}
              onOpen={noop}
              onExpand={noop}
              variant="float"
            />
          </div>

          <div style={{ flex: 'none', height: '120px', background: 'var(--surface-2)', borderBottom: '1px solid var(--divider)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Drafting</div>
            <ActivityDock
              job={{ kind: 'drafting', label: 'Elon · drafting reply', detail: 'Acme · for your approval' }}
              onOpen={noop}
              onExpand={noop}
              variant="float"
            />
          </div>

          {/* Rail variant — stacked cards */}
          <div style={{ flex: 1, padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>Rail Variant (Command view)</div>
            <ActivityDock
              jobs={[
                { kind: 'recording', label: 'Recording · 08:42', detail: 'Corner · Dashboard' },
                { kind: 'working', label: 'Elon · patching', detail: 'CV6-142 · step 2 of 3' },
                { kind: 'working', label: 'Print build', detail: 'space-rising · 58%' },
              ]}
              onSelectJob={noop}
              variant="rail"
            />
          </div>
        </div>
      ) : screen === 'homeexact' ? (
        /* The verbatim transcription of the design's mobile Home (menu-closed frame),
           rendered with the design's own sample so it matches the file 1:1. */
        <MobileHomeExact {...SAMPLE_HOME_M} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      ) : isDesktop ? (
        <DesktopHomeWired {...SAMPLE} recentMessages={SAMPLE_RECENT} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      ) : (
        <MobileHomeWired {...SAMPLE} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      )}
    </div>
  );
}
