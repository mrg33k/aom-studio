// cv6next — Live Scribe tool (the 8th tool: meeting capture).
// Structure grafted from design-system-2026-06-24/ui_kits/tools/livescribe.html, mounted via
// TemplateScreen with useLiveScribe. The backend is REAL: 15s audio chunks transcribe via
// Gemini (v2-transcribe-audio), action items/decisions extract via livescribe-sessions, and
// stopped sessions save to the same store. Wired controls (desktop + mobile): the capture
// toggle (start / stop & save) and Send (save + copy the markdown summary). Controls with
// no backend (pause, ask-the-helper, extracted-drilldown) stay honestly disabled with a
// reason — never clickable-dead (no-fake-UI rule).
// Fixed 2026-07-06: recording produced no visible transcript (state-branch mismatch +
// a base64 stack overflow killed every chunk) — see useLiveScribe.js for the details.

import { useMediaQuery } from '../cv6kit/useMediaQuery.js';
import { useLiveScribe } from './data/useLiveScribe.js';
import { useWorldId } from '../lib/tenantContext.jsx';
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
  // The design file carries two text-only loading branches (transcript + screen).
  // Replace both with the shared Corner loader so a single real `starting` state
  // never renders competing loading visuals.
  screen.querySelectorAll('[data-state="loading"]').forEach((node) => node.remove());
  // Inject the shared loading skeleton only. The shared ERROR card is NOT appended:
  // scribe's only error source is the microphone, the template carries its own
  // truthful inline error branch, and the shared card's unbound sample copy ("We
  // couldn't reach the board · net::ERR_TIMED_OUT") told users their network was
  // down when their mic was missing (Finder DEF-11) — with dead Retry/offline
  // buttons on top.
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"]').forEach(
    (b) => screen.appendChild(b.cloneNode(true))
  );
  return screen.outerHTML;
}

const HTML_DESKTOP = composeLiveScribe(template, 'livescribe-desktop');
const HTML_MOBILE = composeLiveScribe(template, 'livescribe-mobile');

export default function LiveScribe({ onNav, onOpenNav, onSearch }) {
  const worldId = useWorldId();
  const { state, recording, data, controls } = useLiveScribe(worldId);
  const isMobile = useMediaQuery('(max-width: 899px)'); // app-wide tablet rule: below 900 = mobile layout (loop R15)

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    // Header controls do what they do on every other screen (closure sweep
    // 2026-07-06: the profile bubble was DEAD here — census scribe-1440 #11 —
    // and search/cmdK were unwired no-ops; all open the nav overlay like Command).
    openCommandK: () => onSearch?.(),
    search: () => onSearch?.(),
    openProfile: () => onOpenNav?.(),
    // The one capture button: idle starts the mic, recording stops + saves.
    // Nothing records without this tap (no surprise microphone).
    toggleCapture: () => (recording ? controls.stop() : controls.start()),
    // Save the session and copy the markdown summary (transcript + actions +
    // decisions) to the clipboard. The status line reports what happened.
    sendToDashboard: () => controls.sendSummary(),
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
