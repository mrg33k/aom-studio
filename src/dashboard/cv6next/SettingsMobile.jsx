// cv6next — Settings, mobile (list → detail navigation, no fixed layout).
// Mounts [data-screen="settings-mobile"] from template, injects real data,
// manages back navigation between sections list and detail views.

import { useState, useMemo } from 'react';
import { useSettings } from './data/useSettings.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/settings.html?raw';
import statesRaw from './templates/states-extra.html?raw';

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

function composeSettingsMobile(raw, screenName) {
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

const MOBILE_HTML = composeSettingsMobile(template, 'settings-mobile');

export default function SettingsMobile({ onNav, onOpenNav }) {
  const { state, data } = useSettings('aom');
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedSection, setSelectedSection] = useState(null);

  const bindData = useMemo(() => {
    if (!data) return data;
    // For detail view, show the selected section's data
    const section = selectedSection
      ? data.sections?.find((s) => s.id === selectedSection)
      : data.sections?.[0];
    return {
      ...data,
      activeSection: section,
      view, // pass view to template so it can show list or detail
    };
  }, [data, view, selectedSection]);

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    openCommandK: () => {},
    openProfile: () => {},
    search: () => {},
    openSection: (id) => {
      setSelectedSection(id);
      setView('detail');
    },
    backToSectionList: () => {
      setView('list');
      setSelectedSection(null);
    },
    setTheme: (id) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cv6-theme', id);
        document.documentElement.setAttribute('data-app-theme', id);
      }
    },
    // Held-c
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
      html={MOBILE_HTML}
      data={bindData}
      actions={actions}
      state={state}
      aliases={SETTINGS_ALIASES}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
