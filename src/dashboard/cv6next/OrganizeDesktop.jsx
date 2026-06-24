// cv6next — Organize, desktop (tree → files → preview).
// Structure from design-system-2026-06-24 wired/tools/organize.html
// mounted via TemplateScreen with real data from useOrganize.

import React, { useState, useMemo } from 'react';
import { useOrganize } from './data/useOrganize.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/organize.html?raw';

const NAV = [
  { k: 'home', label: 'Home', d: 'M3 11l9-7 9 7|M5 9.8V20h14V9.8' },
  { k: 'chat', label: 'Chat', d: 'M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z' },
  { k: 'organize', label: 'Organize', d: 'M12 4 3 8l9 4 9-4-9-4Z|m3 8 9 4 9-4' },
  { k: 'review', label: 'Review', d: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z|circle cx="12" cy="12" r="2.6"' },
  { k: 'support', label: 'Support', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' },
  { k: 'tracker', label: 'Tracker', d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z|M12 2v3M12 19v3M2 12h3M19 12h3' },
  { k: 'command', label: 'Command', d: 'M7 4H4v16h3M17 4h3v16h-3' },
  { k: 'livescribe', label: 'Scribe', d: 'M9 2h6v12H9Z|path d="M5 11a7 7 0 0 0 14 0M12 18v3"' },
];

export default function OrganizeDesktop({ onNav, onOpenNav }) {
  const { state, data } = useOrganize('aom');
  const [pickedFile, setPickedFile] = useState(null);
  const selectedFile = useMemo(() => pickedFile || data?.files?.[0] || null, [pickedFile, data?.files]);

  // Bind template data
  const bindData = {
    tree: data?.tree || [],
    folder: data?.folder || { name: 'Projects', fileCount: 0, folderCount: 0 },
    files: data?.files || [],
    preview: selectedFile?.preview || data?.preview || {},
    // ... other bindings as needed
  };

  const handleNav = (target) => {
    if (target === 'back') onNav?.('home');
    else onNav?.(target);
  };

  const handleOpenFile = (fileId) => {
    const f = data?.files?.find((x) => x.id === fileId);
    setPickedFile(f);
  };

  const handleActions = {
    nav: (target) => handleNav(target),
    openCommandK: () => console.log('command-k'),
    openProfile: () => console.log('profile'),
    openTreeNode: (nodeId) => console.log('tree node:', nodeId),
    openFile: (fileId) => handleOpenFile(fileId),
  };

  // For now, render the mounted template via TemplateScreen
  // This is the simplest integration that follows SupportDesktop pattern
  return (
    <TemplateScreen
      state={state}
      data={bindData}
      template={template}
      screen="organize-desktop"
      onAction={handleActions}
      fallback={<div style={{ padding: 24, color: 'var(--muted)' }}>Loading Organize…</div>}
    />
  );
}
