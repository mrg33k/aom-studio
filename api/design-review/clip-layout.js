import { createHash, timingSafeEqual } from 'node:crypto';
import { stateGet, stateSet } from '../_lib/stateStore.js';

const KIND = 'clip_layout_review';
const SCOPE = 'phoenix-prosperity-20260926';
const WORLD = 'aom';
// The review link carries the edit key. Only its digest is kept in source.
const KEY_HASH = '9485dde5cb62e4be72ed6979bdbeee91442d03c672061dc1ad0330a2f1202d9c';
const IDS = new Set(['main1', 'main2', 'main3', 'main4', 'main5', 'main6', 'end1', 'end2']);

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
      layouts[id][name] = { x, y, w, h };
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
    const data = await stateGet(KIND, SCOPE, WORLD);
    return res.status(200).json(data || { layouts: {}, pins: {}, instagramOn: false });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });
  const state = cleanState(req.body);
  const ok = await stateSet(KIND, SCOPE, WORLD, state);
  if (!ok) return res.status(500).json({ error: 'Could not save the review.' });
  return res.status(200).json({ ok: true, updated: state.updated });
}
