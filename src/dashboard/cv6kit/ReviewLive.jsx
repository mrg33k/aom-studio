import { useState, useEffect, useCallback } from 'react';
import { ReviewView } from './ReviewView';
import { authFetch } from '../lib/authFetch.js';

/**
 * ReviewLive — wires the Claude-design Review screen (ReviewView) to REAL data:
 * the world's recent deliverables across all rooms, via the deployed, auth'd
 * GET /api/dashboard/review-queue?world=<world> (the same queue source the review
 * tool already uses). Read-only browse on the phone: a list of recent finished
 * work; tap one to read it (content pulled via project-file). Approve / request
 * changes are HELD until that action is defined, so ReviewView hides its action
 * bar while no onApprove/onReject is passed. onExit returns home. Real data only.
 */

function titleCaseSlug(s) {
  return String(s || '').replace(/[-_:]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!then) return '';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function mapItem(it) {
  const projectName = titleCaseSlug(it.project || '');
  const missionName = it.mission ? titleCaseSlug(it.mission) : '';
  return {
    id: it.path,
    path: it.path,
    title: it.name || it.path || 'Untitled',
    source: [projectName, missionName].filter(Boolean).join(' / '),
    timestamp: timeAgo(it.last_modified),
    tone: (it.type && it.type.color) || 'var(--accent)',
    typeKey: (it.type && it.type.key) || 'doc',
    typeLabel: (it.type && it.type.label) || 'File',
    projectName,
    missionName,
  };
}

const TEXT_RE = /\.(md|txt|js|jsx|ts|tsx|py|go|rs|java|json|css|html|yml|yaml|sh)$/i;
const MD_RE = /\.(md|txt)$/i;

// Turn raw markdown into the kit doc shape { title, body, sections:[{title,body}] }
// so the document renders as the clean sectioned layout (not raw # and ** symbols).
function stripInline(s) {
  return String(s)
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\((?:[^)]+)\)/g, '$1')
    .replace(/^\s{0,3}[-*+]\s+/, '• ')
    .replace(/^\s{0,3}>\s?/, '');
}
function parseDoc(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let title = '';
  const intro = [];
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const t = stripInline(h[2].trim());
      if (h[1].length === 1 && !title && !sections.length && !intro.join('').trim()) { title = t; continue; }
      cur = { title: t, body: [] };
      sections.push(cur);
      continue;
    }
    const clean = stripInline(line);
    (cur ? cur.body : intro).push(clean);
  }
  const join = (arr) => arr.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    title,
    body: join(intro),
    sections: sections.map((s) => ({ title: s.title, body: join(s.body) })).filter((s) => s.title || s.body),
  };
}

export function ReviewLive({ worldId = 'aom', onExit, onMenu }) {
  const [queueItems, setQueueItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId)}`);
        if (!res || !res.ok) { if (alive) setQueueItems([]); return; }
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        if (alive) setQueueItems(items.map(mapItem));
      } catch { if (alive) setQueueItems([]); }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [worldId]);

  const openItem = useCallback(async (item) => {
    // Show the item shell immediately, then fill the body from the real file.
    setMetadata({ from: { name: item.projectName || 'Agent', initials: (item.projectName || 'A').slice(0, 2).toUpperCase() }, location: item.missionName || '' });
    setSelectedItem({ id: item.id, title: item.title, source: item.title, content: { body: 'Loading…' } });
    try {
      const isText = TEXT_RE.test(item.path || '');
      const isMd = MD_RE.test(item.path || '');
      let content;
      let docTitle = item.title;
      if (isText) {
        const res = await authFetch(`/api/dashboard/project-file?raw=1&path=${encodeURIComponent(item.path)}`);
        const text = res && res.ok ? await res.text() : null;
        if (text == null) content = { body: 'Could not load this file.' };
        else if (!text.trim()) content = { body: 'This file is empty.' };
        else if (isMd) { const p = parseDoc(text); content = { body: p.body, sections: p.sections }; if (p.title) docTitle = p.title; }
        else content = { body: text };
      } else {
        content = { body: 'This is an image or media file. Open it on your computer to review it properly.' };
      }
      setSelectedItem((s) => (s && s.id === item.id ? { ...s, title: docTitle, content } : s));
    } catch {
      setSelectedItem((s) => (s && s.id === item.id ? { ...s, content: { body: 'Could not load this file.' } } : s));
    }
  }, []);

  return (
    <ReviewView
      queueItems={queueItems}
      selectedItem={selectedItem}
      comments={[]}
      metadata={metadata}
      queueSummary={{ readyCount: queueItems.length, pipelineCount: 0 }}
      onSelectItem={openItem}
      onMenu={onMenu}
      onBack={() => { if (selectedItem) { setSelectedItem(null); } else if (onExit) { onExit(); } }}
    />
  );
}
