import React, { useState, useEffect } from 'react';
import { MobileHomeWired } from './cv6kit/MobileHomeWired.jsx';
import { DesktopHomeWired } from './cv6kit/DesktopHomeWired.jsx';
import { ChatStepThread } from './cv6kit/ChatStepThread.jsx';
import { TrackerView } from './cv6kit/TrackerView.jsx';
import { CommandView } from './cv6kit/CommandView.jsx';
import { SupportView } from './cv6kit/SupportView.jsx';
import { OrganizeView } from './cv6kit/OrganizeView.jsx';
import { ReviewView } from './cv6kit/ReviewView.jsx';
import { ScribeView } from './cv6kit/ScribeView.jsx';
import { OnboardingView } from './cv6kit/OnboardingView.jsx';
import { SettingsView } from './cv6kit/SettingsView.jsx';
import { MobileMenu } from './cv6kit/MobileMenu.jsx';
import { ActivityDock } from './cv6kit/ActivityDock.jsx';
import CvgChatSurface from './cv4/CvgChatSurface.jsx';
import './cv6kit/kit.css';

// Sample Step Thread (the kit Chat view) — used to verify the layout in
// isolation. The real wiring waits on a step-emission feed (BUILD.md R-KIT-5).
const SAMPLE_CHAT = {
  target: { name: 'Elon', initials: 'EL', statusLine: 'Space Rising · Mission /007 · working now' },
  steps: [
    { id: 's1', kind: 'done', title: 'Read the brief & pulled the repo', sub: 'Scanned 28 missions and the task-runner. Everything lined up except one thing.' },
    { id: 's2', kind: 'snag', title: 'Hit a snag', statusLabel: 'Needs you', sub: 'The Space Rising repo is not wired into the task runner yet, so the print cannot build. Two ways forward, your call:', choices: [
      { id: 'quick', recommended: true, title: 'Quick reversible fix', sub: 'Wire it in now, migrate cleanly later. Unblocks the print.' },
      { id: 'clean', title: 'Do it the clean way', sub: 'Set up a proper projects entry first. Slower, but tidier long-term.' },
    ] },
    { id: 's3', kind: 'choice', title: 'You chose the quick fix', sub: '"but pin the framing first."' },
    { id: 's4', kind: 'working', title: 'Patching the resolver', statusLabel: 'Working', sub: 'Pinned your framing, now teaching the task runner where the repo lives.', progress: { pct: 64, label: '3/4' } },
    { id: 's5', kind: 'upnext', title: 'Re-run the print build', statusLabel: 'Up next' },
  ],
};

const SAMPLE_TRACKER = {
  tracker: { name: 'CV6 Bugs', projectName: 'Corner CV6', openCount: 12 },
  bugs: [
    { id: 'CV6-142', title: 'Repo resolver drops docs-only projects', status: 'open', priority: 'high', assignee: { initials: 'EL', name: 'Elon', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' }, updated: '2h' },
    { id: 'CV6-138', title: 'Catch Up cards crowd All Rooms', status: 'in_progress', priority: 'med', assignee: { initials: 'RX', name: 'Rex', tone: '#A3E635', toneBg: 'rgba(163,230,53,.2)' }, updated: '5h' },
    { id: 'CV6-131', title: 'Nav overlaps home indicator', status: 'in_progress', priority: 'med', assignee: { initials: 'EL', name: 'Elon', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' }, updated: '8h' },
    { id: 'CV6-126', title: 'Glass contrast dips on lightest photo', status: 'open', priority: 'low', assignee: { initials: 'GA', name: 'Gary', tone: 'var(--warn)', toneBg: 'rgba(251,191,36,.2)' }, updated: '1d' },
  ],
};

const SAMPLE_COMMAND = {
  summary: { roomCount: 6, liveCount: 3 },
  featured: {
    room: 'Space Rising', color: 'var(--violet-400)', status: 'live',
    goal: 'Lock Interactive/community framing before the Apr 29 print.',
    checklist: [
      { label: 'Pull repo & scan task-runner', state: 'done' },
      { label: 'Patch resolve_repo_path()', state: 'queued' },
      { label: 'Route docs-only to AOM-EA', state: 'working' },
    ],
  },
  rooms: [
    { id: 'r1', name: 'Corner', color: 'var(--accent)', sub: 'Ship CV6 mobile parity', status: 'live' },
    { id: 'r2', name: 'Included Health', color: 'var(--pink-400)', sub: 'Batch02 culture deck', status: 'blocked' },
    { id: 'r3', name: 'Loop Test Project', color: 'var(--faint)', sub: 'Validate routing across missions', status: 'idle' },
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
const SAMPLE = {
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

const SAMPLE_RECENT = [
  { from: 'agent', author: 'Elon', initials: 'EL', time: '9:24', text: 'Pulled the latest numbers — the launch deck is ready for your review.' },
  { from: 'me', time: '9:26', text: 'Looks good. Send it once the cover slide is updated.' },
  { from: 'agent', author: 'Elon', initials: 'EL', time: '9:27', text: 'On it. Cover swapped and out the door in five.' },
];

const SAMPLE_SUPPORT = {
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

const SAMPLE_ORGANIZE = {
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
  selectedFileId: 'f1',
};

const SAMPLE_REVIEW = {
  queueSummary: { readyCount: 2, pipelineCount: 4 },
  queueItems: [
    { id: 'rv1', title: 'Support ask — handoff', source: 'Corner → Dashboard', timestamp: '11:15 PM', status: 'ready' },
    { id: 'rv2', title: 'Included culture deck — batch 03', source: 'Cleo → Included Health', timestamp: '9:40 PM', status: 'ready' },
    { id: 'rv3', title: 'Andocia proposal copy', source: 'Alex → Andocia', timestamp: '4:02 PM', status: 'pending' },
  ],
  selectedItem: {
    id: 'rv1', title: 'Support ask — handoff', source: 'handoff.md', location: 'Corner → Dashboard',
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

const SAMPLE_SCRIBE = {
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
const SAMPLE_CVG_MESSAGES = [
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

  return (
    <div data-cv6kit data-theme="glass" style={{ minHeight: '100dvh', background: 'var(--ground)' }}>
      {screen === 'menu' ? (
        <div style={{ height: '100dvh', width: '100%', position: 'relative' }}>
          <MobileMenu
            open={menuOpen}
            onToggle={() => setMenuOpen(!menuOpen)}
            onNav={(key) => setActiveKey(key)}
            activeKey={activeKey}
            user={{ initials: 'P', statusDot: 'online' }}
          />
        </div>
      ) : screen === 'cvgchat' ? (
        <div style={{ height: '100dvh' }}>
          <CvgChatSurface worldId={null} target={{ type: 'agent', name: 'Elon', slug: 'elon' }} kit previewMessages={SAMPLE_CVG_MESSAGES} onSend={noop} onBack={noop} />
        </div>
      ) : screen === 'chat' ? (
        <ChatStepThread {...SAMPLE_CHAT} onBack={noop} onSend={noop} onChoice={noop} />
      ) : screen === 'tracker' ? (
        <TrackerView {...SAMPLE_TRACKER} onSelectBug={noop} onNewBug={noop} />
      ) : screen === 'command' ? (
        <CommandView {...SAMPLE_COMMAND} onSelectRoom={noop} />
      ) : screen === 'support' ? (
        <SupportView {...SAMPLE_SUPPORT} isDesktop={isDesktop} onSelectItem={noop} onBack={noop} onDraftReply={noop} onMarkResolved={noop} />
      ) : screen === 'organize' ? (
        <OrganizeView {...SAMPLE_ORGANIZE} onSelectProject={noop} onSelectFile={noop} onBack={noop} />
      ) : screen === 'review' ? (
        <ReviewView {...SAMPLE_REVIEW} onSelectItem={noop} onApprove={noop} onReject={noop} onComment={noop} onSendNotes={noop} />
      ) : screen === 'scribe' ? (
        <ScribeView {...SAMPLE_SCRIBE} mode={isDesktop ? 'desktop' : 'mobile'} onStop={noop} onSelectItem={noop} onBack={noop} />
      ) : screen === 'onboarding' ? (
        <OnboardingView step={0} steps={5} onNext={noop} onSkip={noop} onBack={noop} />
      ) : screen === 'settings' ? (
        <SettingsView theme="glass" onThemeChange={noop} onConnect={noop} onCycleScope={noop} onEditConnection={noop} onTogglePerm={noop} onToggleNotify={noop} onBackToList={noop} />
      ) : screen === 'dock' ? (
        <div style={{ height: '100dvh', background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end', padding: '16px' }}>
          <ActivityDock activities={[
            { state: 'recording', title: 'Recording', sub: 'Corner · Dashboard · 08:42', badge: 'REC', badgeColor: '#F87171', badgeBg: 'rgba(248,113,113,.16)' },
            { state: 'working', title: 'Elon · patching', sub: 'CV6-142 · step 2 of 3' },
            { state: 'working', title: 'Print build', sub: 'space-rising · 58%' },
          ]} onActivitySelect={noop} />
        </div>
      ) : isDesktop ? (
        <DesktopHomeWired {...SAMPLE} recentMessages={SAMPLE_RECENT} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      ) : (
        <MobileHomeWired {...SAMPLE} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      )}
    </div>
  );
}
