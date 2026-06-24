// cv6next — Settings, responsive router (desktop/mobile via useMediaQuery).
// Mounts SettingsDesktop or SettingsMobile depending on viewport.
// All Settings navigation and data managed by useSettings hook.

import { useMediaQuery } from '../cv6kit/useMediaQuery.js';
import SettingsDesktop from './SettingsDesktop.jsx';
import SettingsMobile from './SettingsMobile.jsx';

export default function Settings({ onNav, onOpenNav }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? (
    <SettingsMobile onNav={onNav} onOpenNav={onOpenNav} />
  ) : (
    <SettingsDesktop onNav={onNav} onOpenNav={onOpenNav} />
  );
}
