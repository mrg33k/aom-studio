// cv6next — Settings, desktop (section nav left → settings content right).
// Structure from design-system-2026-06-24 wired/settings/settings.html, mounted via
// TemplateScreen with real data from useSettings. Strips baked .topbar (shell provides shared nav),
// injects loading/error/empty states, binds real data + actions.

import { useState, useMemo } from 'react';
import { useSettings } from './data/useSettings.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/settings.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases
const SETTINGS_ALIASES = {
  sections: 'section',
  profile: 'profile',
  connections: 'conn',
  rooms: 'room',
  secrets: 'secret',
  agents: 'agent',
  permissions: 'perm',
  notifications: 'notif',
  themes: 'theme',
};

function composeSettingsDesktop(raw, screenName) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6][data-screen]')].find(
    (n) => n.getAttribute('data-screen') === screenName
  );
  if (!screen) return '';
  // Strip the baked .topbar (shell provides shared nav)
  screen.querySelector('.topbar')?.remove();
  screen.setAttribute('style', 'width:100%;height:100%');
  // Inject shared loading/error/empty states
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach(
    (b) => screen.appendChild(b.cloneNode(true))
  );
  return screen.outerHTML;
}

const DESKTOP_HTML = composeSettingsDesktop(template, 'settings-desktop');

export default function SettingsDesktop({ onNav, onOpenNav }) {
  const { state, data } = useSettings('aom');
  const [activeSection, setActiveSection] = useState(
    data?.activeSection?.id || 'env'
  );

  const bindData = useMemo(() => {
    if (!data) return data;
    return {
      ...data,
      activeSection: data.sections?.find((s) => s.id === activeSection) || data.sections?.[0],
    };
  }, [data, activeSection]);

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    openCommandK: () => {},
    openProfile: () => {},
    search: () => {},
    openSection: (id) => setActiveSection(id),
    setTheme: (id) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cv6-theme', id);
        document.documentElement.setAttribute('data-app-theme', id);
      }
    },
    // Held-c (no OAuth / permissions / notification store yet): inert, never faked.
    toggleConnection: () => {},
    toggleSecret: () => {},
    togglePermission: () => {},
    toggleNotification: () => {},
    addConnection: () => {},
    rotateSecret: () => {},
    editProfile: () => {},
  };

  return (
    <TemplateScreen
      html={DESKTOP_HTML}
      data={bindData}
      actions={actions}
      state={state}
      aliases={SETTINGS_ALIASES}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
