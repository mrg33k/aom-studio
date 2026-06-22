// CornerCV6 — the fresh CV6 surface. /dashboard renders THIS now (B: fresh start).
// Every visible screen is a Claude Design fill-in template, mounted through the engine
// and fed real data. Nothing is hand-drawn; nothing is faked. Screens fill in as
// Claude Design labels them. CV4 stays reachable at /cv4 as the fallback.
//
// First screen live: the Support inbox (real support mail, filtered to real people).

import { useMemo } from 'react';
import './cv6.css';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { useSupportInbox } from './data/useSupportInbox.js';
import inboxRaw from './templates/support-inbox.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// Compose the screen fragment with the shared loading/error blocks once, so the
// engine's data-state switching covers every state from one mounted tree.
function composedSupportHtml() {
  const doc = new DOMParser().parseFromString(inboxRaw, 'text/html');
  const screen = doc.querySelector('[data-cv6]');
  const body = screen?.querySelector('.scrbody');
  if (body) {
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    sd.querySelectorAll('[data-state="loading"], [data-state="error"]').forEach((b) => body.appendChild(b.cloneNode(true)));
  }
  return screen ? screen.outerHTML : '';
}

const SUPPORT_ALIASES = { needsYou: 'email', watching: 'email', 'email.tags': 'tag' };

function SupportInbox({ worldId }) {
  const { state, data, reload } = useSupportInbox(worldId);
  const html = useMemo(composedSupportHtml, []);
  const actions = useMemo(() => ({
    // Tapping a row / opening a thread is the next wire (thread detail screen).
    openThread: () => {},
    search: () => {},
    openNav: () => {},
    nav: () => {},
    browseWatching: () => {},
    emptyAction: () => {},
    retry: () => reload(),
    viewOffline: () => {},
  }), [reload]);

  return <TemplateScreen html={html} data={data} actions={actions} state={state} aliases={SUPPORT_ALIASES} />;
}

export default function CornerCV6() {
  // Support is AOM-only today; default the world to aom for this first screen.
  const worldId = 'aom';
  return (
    <div data-cv6 data-theme="dark" style={{
      minHeight: '100dvh', background: 'var(--ground, #0b0d10)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{
        font: '12.5px/1.5 system-ui', color: 'var(--muted, #8b95a3)',
        padding: '14px 16px 10px', textAlign: 'center', letterSpacing: '.2px',
      }}>
        Corner is being rebuilt on the new design. Support is live; more screens land as they are ready.
      </div>
      <div style={{
        width: 'min(420px, 100%)', flex: 1, display: 'flex', alignItems: 'stretch',
      }}>
        <SupportInbox worldId={worldId} />
      </div>
    </div>
  );
}
