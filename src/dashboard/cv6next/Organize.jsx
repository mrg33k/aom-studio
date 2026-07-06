// cv6next — Organize tool (desktop + mobile routing).
// Mounts OrganizeDesktop or OrganizeMobile based on viewport.

import React from 'react';
import { useMediaQuery } from '../cv6kit/useMediaQuery.js';
import OrganizeDesktop from './OrganizeDesktop';
import OrganizeMobile from './OrganizeMobile';

export default function Organize({ onNav, onOpenNav, onAssignFile }) {
  const isMobile = useMediaQuery('(max-width: 899px)') // app-wide tablet rule: below 900 = mobile layout (loop R15);

  if (isMobile) {
    return <OrganizeMobile onNav={onNav} onOpenNav={onOpenNav} onAssignFile={onAssignFile} />;
  }

  return <OrganizeDesktop onNav={onNav} onOpenNav={onOpenNav} onAssignFile={onAssignFile} />;
}
