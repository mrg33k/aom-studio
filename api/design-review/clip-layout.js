import { createHash, timingSafeEqual } from 'node:crypto';

const TUNNEL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';
const FILE = 'corner/users/aom/projects/outreach/missions/clipping-viability/deliverables/layout-review-state.json';
// The review link carries the edit key. Only its digest is kept in source.
const KEY_HASH = '9485dde5cb62e4be72ed6979bdbeee91442d03c672061dc1ad0330a2f1202d9c';
const IDS = new Set(['main1', 'main2', 'main3', 'main4', 'main5', 'main6', 'end1', 'end2']);
async function readFile() {
  const response = await fetch(`${TUNNEL}/project-file-raw?path=${encodeURIComponent(FILE)}`, {
    headers: { 'User-Agent': 'aom-layout-review' },
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Review read returned ${response.status}`);
  return await response.json();
}

async function writeFile(state, key) {
  const response = await fetch(`${TUNNEL}/clip-layout-review-write`, {
    method: 'POST',
    headers: { 'X-Review-Key': key, 'Content-Type': 'application/json', 'User-Agent': 'aom-layout-review' },
    body: JSON.stringify({ state }),
  });
  if (!response.ok) throw new Error(`Review write returned ${response.status}`);
}

function authorized(req) {
  const key = String(req.headers['x-review-key'] || req.query?.key || '');
  const hash = createHash('sha256').update(key).digest();
  return timingSafeEqual(hash, Buffer.from(KEY_HASH, 'hex'));
}

function cleanState(input) {
  const layouts = {};
  const pins = {};
  for (const [id, items] of Object.entries(input?.layouts || {})) {
    if (!IDS.has(id) || !items || typeof items !== 'object') continue;
    layouts[id] = {};
    for (const [name, box] of Object.entries(items).slice(0, 12)) {
      if (!/^[a-z][a-z0-9-]{0,30}$/i.test(name) || !box) continue;
      const nums = ['x', 'y', 'w', 'h'].map(k => Number(box[k]));
      if (nums.some(n => !Number.isFinite(n))) continue;
      const [x, y, w, h] = nums;
      if (x < -1080 || x > 2160 || y < -1920 || y > 3840 || w < 25 || w > 2160 || h < 25 || h > 3840) continue;
      const z = Number(box.z);
      layouts[id][name] = { x, y, w, h, ...(Number.isInteger(z) && z >= 0 && z <= 100 ? { z } : {}) };
    }
  }
  for (const [id, list] of Object.entries(input?.pins || {})) {
    if (!IDS.has(id) || !Array.isArray(list)) continue;
    pins[id] = list.slice(0, 100).map(p => ({
      id: String(p?.id || '').slice(0, 50),
      x: Math.min(1, Math.max(0, Number(p?.x) || 0)),
      y: Math.min(1, Math.max(0, Number(p?.y) || 0)),
      text: String(p?.text || '').trim().slice(0, 700),
      created: String(p?.created || '').slice(0, 40),
    })).filter(p => p.id && p.text);
  }
  return { layouts, pins, instagramOn: !!input?.instagramOn, updated: new Date().toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!authorized(req)) return res.status(403).json({ error: 'This review link is missing its edit key.' });
  if (req.method === 'GET') {
    try {
      const data = await readFile();
      return res.status(200).json(data || { layouts: {}, pins: {}, instagramOn: false });
    } catch (error) {
      console.error('[clip-layout-review] read failed:', error?.message || error);
      return res.status(502).json({ error: 'Could not load the review.' });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });
  let submitted = req.body;
  if (typeof submitted?.state === 'string') {
    try { submitted = JSON.parse(submitted.state); }
    catch (_) { return res.status(400).json({ error: 'Invalid review state.' }); }
  }
  const state = cleanState(submitted);
  try {
    await writeFile(state, String(req.headers['x-review-key'] || req.query?.key || ''));
  } catch (error) {
    console.error('[clip-layout-review] write failed:', error?.message || error);
    return res.status(500).json({ error: 'Could not save the review.' });
  }
  return res.status(200).json({ ok: true, updated: state.updated });
}
