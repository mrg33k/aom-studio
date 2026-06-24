// cv6next — Live Scribe tool (the 8th tool: meeting capture).
// Structure grafted from design-system-2026-06-24/ui_kits/tools/livescribe.html, mounted via
// TemplateScreen with useLiveScribe. HELD-C: there is no transcription / diarization backend,
// so recording, the live transcript, the helper, and auto-extract are all honest empty/disabled
// states — never faked. The header (timer, waveform) + two-panel layout render so the design
// reads; the Stop / Ask helper / Send controls are disabled with "not wired yet" tooltips.
// When a real backend lands, useLiveScribe flips state to 'ready' and binds live turns.

import { useMediaQuery } from '../cv6kit/useMediaQuery.js';
import { useLiveScribe } from './data/useLiveScribe.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/livescribe.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases (loop var names used inside the template)
const LIVESCRIBE_ALIASES = {
  transcript: 'turn',
  actionItems: 'item',
  decisions: 'item',
};

function composeLiveScribe(raw, screenName) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6][data-screen]')].find(
    (n) => n.getAttribute('data-screen') === screenName
  );
  if (!screen) return '';
  // Strip any baked topbar (the shell provides the shared nav)
  screen.querySelector('.topbar')?.remove();
  screen.setAttribute('style', 'width:100%;height:100%');
  // Inject shared loading/error states (the template carries its own empty states inline)
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"], [data-state="error"]').forEach(
    (b) => screen.appendChild(b.cloneNode(true))
  );
  return screen.outerHTML;
}

const HTML_DESKTOP = composeLiveScribe(template, 'livescribe-desktop');
const HTML_MOBILE = composeLiveScribe(template, 'livescribe-mobile');

export default function LiveScribe({ onNav, onOpenNav }) {
  const { state, data } = useLiveScribe('aom');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    openCommandK: () => {},
    search: () => {},
    // Held-c (no transcription backend yet): inert, never faked. The template also
    // renders these controls disabled with "not wired yet" tooltips.
    openExtracted: () => {},
    pauseRecording: () => {},
    stopAndSave: () => {},
    askHelper: () => {},
  };

  const html = isMobile ? HTML_MOBILE : HTML_DESKTOP;

  return (
    <TemplateScreen
      html={html}
      data={data}
      actions={actions}
      state={state}
      aliases={LIVESCRIBE_ALIASES}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
