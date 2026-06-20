import React, { useState, useEffect } from 'react';
import { MobileHomeWired } from './cv6kit/MobileHomeWired.jsx';
import { DesktopHomeWired } from './cv6kit/DesktopHomeWired.jsx';
import { ChatStepThread } from './cv6kit/ChatStepThread.jsx';
import { TrackerView } from './cv6kit/TrackerView.jsx';
import { CommandView } from './cv6kit/CommandView.jsx';
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

export default function CV6KitTest() {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const noop = () => {};
  const screen = (typeof window !== 'undefined' && (window.location.search.match(/[?&]screen=([a-z]+)/) || [])[1]) || 'home';

  return (
    <div data-cv6kit data-theme="glass" style={{ minHeight: '100dvh', background: 'var(--ground)' }}>
      {screen === 'chat' ? (
        <ChatStepThread {...SAMPLE_CHAT} onBack={noop} onSend={noop} onChoice={noop} />
      ) : screen === 'tracker' ? (
        <TrackerView {...SAMPLE_TRACKER} onSelectBug={noop} onNewBug={noop} />
      ) : screen === 'command' ? (
        <CommandView {...SAMPLE_COMMAND} onSelectRoom={noop} />
      ) : isDesktop ? (
        <DesktopHomeWired {...SAMPLE} recentMessages={SAMPLE_RECENT} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      ) : (
        <MobileHomeWired {...SAMPLE} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      )}
    </div>
  );
}
