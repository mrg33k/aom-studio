// cv6next — Onboarding, desktop (split: lead rail + step body).
// Structure from design-system-2026-06-24 wired/onboarding/index.html, mounted via
// TemplateScreen with real data from useOnboarding. Injects loading/error/empty states,
// binds real data + actions, manages step progression.

import { useMemo } from 'react';
import { useOnboarding } from './data/useOnboarding.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/onboarding.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases
const ONBOARDING_ALIASES = {
  steps: 'step',
  connections: 'conn',
  agents: 'agent',
  themes: 'theme',
};

function composeOnboardingDesktop(raw, screenName) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6][data-screen]')].find(
    (n) => n.getAttribute('data-screen') === screenName
  );
  if (!screen) return '';
  screen.setAttribute('style', 'width:100%;height:100%');
  // Inject shared loading/error/empty states
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach(
    (b) => screen.appendChild(b.cloneNode(true))
  );
  return screen.outerHTML;
}

const DESKTOP_HTML = composeOnboardingDesktop(template, 'onboarding-desktop');

export default function OnboardingDesktop({ onNav, onOpenNav }) {
  const { state, data, stepIndex, setStepIndex, theme, setTheme } = useOnboarding('aom');

  const actions = {
    back: () => {
      if (stepIndex > 0) {
        setStepIndex(stepIndex - 1);
      }
    },
    skipStep: () => {
      if (stepIndex < 5) {
        setStepIndex(stepIndex + 1);
      }
    },
    next: () => {
      if (stepIndex < 5) {
        setStepIndex(stepIndex + 1);
      } else {
        // Final step: advance to Home
        onNav?.('home');
      }
    },
    // Held-c (no backing): inert, never faked.
    toggleConnect: () => {},
    togglePermission: () => {},
    setTheme: (id) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cv6-theme', id);
        document.documentElement.setAttribute('data-app-theme', id);
        setTheme(id);
      }
    },
  };

  return (
    <TemplateScreen
      html={DESKTOP_HTML}
      data={data}
      actions={actions}
      state={state}
      aliases={ONBOARDING_ALIASES}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
