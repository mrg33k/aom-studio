import React from 'react';
import { MobileHomeWired } from './cv6kit/MobileHomeWired.jsx';
import './cv6kit/kit.css';

/**
 * CV6 Kit preview route (/cv6kit). Renders the REAL wired mobile Home component
 * (the same one mounted in CornerVG on /dashboard) but with sample props, so the
 * component's layout + data mapping can be verified without auth. On /dashboard
 * the same component is fed live data.
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

export default function CV6KitTest() {
  return (
    <div data-cv6kit data-theme="glass" style={{ minHeight: '100dvh', background: 'var(--ground)' }}>
      <MobileHomeWired {...SAMPLE} onSelectAgent={() => {}} onSelectProject={() => {}} onCatchupOpen={() => {}} onNav={() => {}} />
    </div>
  );
}
