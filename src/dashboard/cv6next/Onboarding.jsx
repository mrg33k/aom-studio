// cv6next — Onboarding, responsive router (desktop/mobile via useMediaQuery).
// Mounts OnboardingDesktop or OnboardingMobile depending on viewport.
// All Onboarding navigation and data managed by useOnboarding hook.

import { useMediaQuery } from '../cv6kit/useMediaQuery.js';
import OnboardingDesktop from './OnboardingDesktop.jsx';
import OnboardingMobile from './OnboardingMobile.jsx';

export default function Onboarding({ onNav, onOpenNav }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? (
    <OnboardingMobile onNav={onNav} onOpenNav={onOpenNav} />
  ) : (
    <OnboardingDesktop onNav={onNav} onOpenNav={onOpenNav} />
  );
}
