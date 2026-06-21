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
    source: [projectName, missionName].filter(Boolean).join(' / ') || (it.type && it.type.label) || '',
    timestamp: timeAgo(it.last_modified),
    tone: (it.type && it.type.color) || 'var(--accent)',
    projectName,
    missionName,
  };
}

const TEXT_RE = /\.(md|txt|js|jsx|ts|tsx|py|go|rs|java|json|css|html|yml|yaml|sh)$/i;

export function ReviewLive({ worldId = 'aom', onExit }) {
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
      let body;
      if (isText) {
        const res = await authFetch(`/api/dashboard/project-file?raw=1&path=${encodeURIComponent(item.path)}`);
        body = res && res.ok ? (await res.text()) || 'This file is empty.' : 'Could not load this file.';
      } else {
        body = 'This is an image or media file. Open it on your computer to review it properly.';
      }
      setSelectedItem((s) => (s && s.id === item.id ? { ...s, content: { body } } : s));
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
      onBack={() => { if (selectedItem) { setSelectedItem(null); } else if (onExit) { onExit(); } }}
    />
  );
}
