import React, { useState, useEffect } from 'react';
import { MobileHomeWired } from './cv6kit/MobileHomeWired.jsx';
import { DesktopHomeWired } from './cv6kit/DesktopHomeWired.jsx';
import './cv6kit/kit.css';

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

  return (
    <div data-cv6kit data-theme="glass" style={{ minHeight: '100dvh', background: 'var(--ground)' }}>
      {isDesktop ? (
        <DesktopHomeWired {...SAMPLE} recentMessages={SAMPLE_RECENT} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      ) : (
        <MobileHomeWired {...SAMPLE} onSelectAgent={noop} onSelectProject={noop} onCatchupOpen={noop} onNav={noop} />
      )}
    </div>
  );
}
