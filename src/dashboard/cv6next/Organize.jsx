// cv6next — Organize tool (desktop + mobile routing).
// Mounts OrganizeDesktop or OrganizeMobile based on viewport.

import React from 'react';
import { useMediaQuery } from '../cv6kit/useMediaQuery.js';
import OrganizeDesktop from './OrganizeDesktop';
import OrganizeMobile from './OrganizeMobile';

export default function Organize({ onNav, onOpenNav }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <OrganizeMobile onNav={onNav} onOpenNav={onOpenNav} />;
  }

  return <OrganizeDesktop onNav={onNav} onOpenNav={onOpenNav} />;
}
