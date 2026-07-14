// cv6next — Onboarding, mobile (full-width, step indicator + content + nav).
// Mounts [data-screen="onboarding-mobile"] from template, injects real data,
// manages step progression (back/skip/next).

import { useMemo } from 'react';
import { useOnboarding } from './data/useOnboarding.js';
import { useWorldId } from '../lib/tenantContext.jsx';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/onboarding.html?raw';
import statesRaw from './templates/states-extra.html?raw';

const ONBOARDING_ALIASES = {
  steps: 'step',
  connections: 'conn',
  agents: 'agent',
  themes: 'theme',
};

function composeOnboardingMobile(raw, screenName) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6][data-screen]')].find(
    (n) => n.getAttribute('data-screen') === screenName
  );
  if (!screen) return '';
  screen.setAttribute('style', 'width:100%;height:100%');
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach(
    (b) => screen.appendChild(b.cloneNode(true))
  );
  return screen.outerHTML;
}

const MOBILE_HTML = composeOnboardingMobile(template, 'onboarding-mobile');

export default function OnboardingMobile({ onNav, onOpenNav }) {
  const worldId = useWorldId();
  const { state, data, stepIndex, setStepIndex, theme, setTheme } = useOnboarding(worldId);

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
      html={MOBILE_HTML}
      data={data}
      actions={actions}
      state={state}
      aliases={ONBOARDING_ALIASES}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
