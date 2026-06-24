// cv6next — Review tool data. Real deliverables queue shaped to the wired template.
// Loads from /api/dashboard/review-queue, filters by Ready/Pipeline, and wires
// approve / request-changes as real decision events. No fake data.

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../lib/authFetch';
import { titleForAgent } from './agentTitles';

const TINTS = ['green', 'lime', 'amber', 'violet'];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function tintFor(seed) {
  let h = 0;
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

function relTime(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function typeLabel(type) {
  const map = {
    doc: 'Document',
    image: 'Image',
    photo: 'Photo',
    video: 'Video',
    copy: 'Copy',
    code: 'Code',
    siteshot: 'Screenshot',
    sitelive: 'Live site',
  };
  return map[type] || 'Document';
}

function typeGlyph(type) {
  const glyphs = {
    doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M9 13h6M9 17h4',
    image: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    photo: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    video: 'M23 7l-7 5 7 5V7Z|M1 5h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    copy: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M9 13h6M9 17h4',
    code: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M9 13h6M9 17h4',
    siteshot: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z',
    sitelive: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z|M12 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  };
  return glyphs[type] || glyphs.doc;
}

export function useReview(worldId = 'aom') {
  const [queue, setQueue] = useState(null);
  const [openDelId, setOpenDelId] = useState(null);
  const [filter, setFilter] = useState('ready'); // ready | pipeline
  const [status, setStatus] = useState('loading'); // loading | loaded | error

  const load = useCallback(async () => {
    let ok = false;
    try {
      const r = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId || 'aom')}`);
      if (r?.ok) {
        const d = await r.json();
        const items = (d.items || []).map((it) => {
          // review-queue.js returns: { name, path, project, mission, kind, type:{key,label,color}, last_modified }
          // type is an OBJECT, not a string — extract the key for template matching
          const typeKey = (it.type && typeof it.type === 'object') ? it.type.key : (it.type || 'doc');
          return {
            id: it.id || it.path,
            title: it.name || 'Untitled',
            who: titleForAgent(it.project || ''), // use project as agent hint for now; deliverables don't have from field
            whoRaw: it.project || '',
            whoInitials: initials(it.project || ''),
            whoTint: tintFor(it.project || ''),
            type: typeKey,
            typeLabel: typeLabel(typeKey),
            typeGlyph: typeGlyph(typeKey),
            count: 0, // no comments yet from queue endpoint
            status: 'ready', // queue only returns ready items; live ones handled separately
            statusLabel: 'READY',
            time: relTime(it.last_modified),
            location: it.mission ? `${it.project} / ${it.mission}` : it.project,
            queueState: 'ready',
            file: `${it.name} · 0 KB`, // TODO: fetch actual size
            bodyHtml: '',
            open: it.id === openDelId ? 'on' : 'off',
            pins: [],
            comments: [],
            openCount: 0,
          };
        });
        setQueue({ items, readyCount: items.filter((i) => i.status === 'ready').length, pipelineCount: 0 });
        ok = true;
      }
    } catch (e) {
      console.error('[Review load]', e);
    }
    setStatus((prev) => (ok ? 'loaded' : (queue ? prev : 'error')));
  }, [worldId, queue, openDelId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const approve = useCallback(async (deliverableId) => {
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deliverable: deliverableId, action: 'approve', world: worldId }),
      });
      if (r?.ok) {
        load();
      } else {
        console.error('[Review approve] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review approve] exception:', e);
    }
  }, [load, worldId]);

  const requestChanges = useCallback(async (deliverableId, notes) => {
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deliverable: deliverableId, action: 'request-changes', notes, world: worldId }),
      });
      if (r?.ok) {
        load();
      } else {
        console.error('[Review request-changes] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review request-changes] exception:', e);
    }
  }, [load, worldId]);

  const sendChecklist = useCallback(async (deliverableId) => {
    try {
      const del = (queue?.items || []).find((i) => i.id === deliverableId);
      if (!del) return;
      const checklist = del.comments.map((c) => c.text).join('\n');
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deliverable: deliverableId, action: 'send-checklist', checklist, world: worldId }),
      });
      if (r?.ok) {
        load();
      } else {
        console.error('[Review send-checklist] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review send-checklist] exception:', e);
    }
  }, [load, queue, worldId]);

  const data = {
    queue: {
      readyCount: queue?.readyCount || 0,
      pipelineCount: queue?.pipelineCount || 0,
      isReady: filter === 'ready' ? 'on' : 'off',
      isPipeline: filter === 'pipeline' ? 'on' : 'off',
      items: (queue?.items || []).filter((i) => filter === 'ready' ? i.status === 'ready' : i.status === 'live'),
    },
    deliverable: (queue?.items || []).find((i) => i.id === openDelId) || {
      id: '',
      file: '',
      title: '',
      bodyHtml: '',
      type: 'doc',
      typeLabel: 'Document',
      who: '',
      whoInitials: '',
      whoTint: 'green',
      location: '',
      commentsLabel: 'Pin-comments',
      commentsLabelLower: 'pin-comments',
      openCount: 0,
      pins: [],
      comments: [],
    },
    empty: { title: "You're all caught up", body: 'Nothing needs your review right now. New deliverables the agent flags will land here.', actionLabel: 'Browse waiting' },
    loading: { label: 'Gathering deliverables…' },
    error: { title: "We couldn't load your review queue", body: 'Your connection dropped. Nothing was lost. Your last view is saved.', code: 'review · retrying' },
  };

  return {
    state: status,
    data,
    actions: {
      setQueueFilter: (f) => { setFilter(f); setOpenDelId(null); },
      openDeliverable: (id) => setOpenDelId(id),
      approve,
      requestChanges,
      sendChecklist,
    },
  };
}
