// resultLinks.js — which links in an agent message deserve a tappable card.
// Completed web work must always land as a button/card, never a bare URL buried in
// text (Patrik 2026-07-13). Sources, in order: the structured completion payload
// (metadata.result_payload from task-complete.sh → post-task-chat-message.py), then
// any http(s) URL the agent shared in its text — the bridge-voiced completion path
// carries no structured payload, so the text lift is what makes it "every time".

const MEDIA_RE = /\.(png|jpe?g|gif|webp|svg|heic|bmp|mp4|mov|webm|m4v|avi|mp3|wav|m4a|aac|ogg)(\?[^\s]*)?$/i;
// Backticks excluded (qa-sweep 2026-07-17): agents wrap URLs in markdown code
// spans, and a captured trailing ` made the href a broken address (a live Drive
// link rendered as …LMWi2eG%60 — dead for the user).
const URL_RE = /https?:\/\/[^\s<>"'()[\]`]+/g;

function cleanUrl(u) {
  return String(u || '').replace(/[.,;:!?`*_]+$/, '');
}

function isCardable(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  // Images/videos/audio already render as media (attachments / inline markdown),
  // a link card on top would double them.
  if (MEDIA_RE.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    // A dev-machine URL is not a link in Patrik's world — nothing to tap.
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false;
  } catch { return false; }
  return true;
}

export function extractLinkCards({ text = '', resultPayload = null, attachments = [] } = {}) {
  const cards = [];
  const seen = new Set();
  const attached = new Set((attachments || []).map((a) => (a && a.url) || '').filter(Boolean));
  const push = (url, summary) => {
    const u = cleanUrl(url);
    if (!u || seen.has(u) || attached.has(u) || !isCardable(u)) return;
    seen.add(u);
    cards.push({ url: u, summary: summary || '' });
  };
  const rp = resultPayload && typeof resultPayload === 'object' ? resultPayload : {};
  const rtype = String(rp.type || '').toLowerCase();
  // check_external's payload is a URL to go look at — same card.
  if ((rtype === 'link' || rtype === 'check_external') && rp.payload) push(String(rp.payload).trim(), rp.summary);
  for (const u of String(text).match(URL_RE) || []) {
    if (cards.length >= 3) break;
    push(u, '');
  }
  return cards;
}

// Drop a trailing bare URL from the bubble text when a card already carries it, so the
// same link never shows twice (sentence + card). Only a whitespace-preceded bare URL at
// the very end is stripped — mid-sentence links and markdown links stay in the prose.
export function stripTrailingCardUrl(text, cards) {
  let out = String(text || '');
  if (!cards || !cards.length) return out;
  const urls = new Set(cards.map((c) => c.url));
  for (;;) {
    const m = out.match(/(^|[\s`])(https?:\/\/[^\s<>"'()[\]`]+)[\s.,;:!?`]*$/);
    if (!m || !urls.has(cleanUrl(m[2]))) break;
    out = out.slice(0, m.index).replace(/[\s:—–`-]+$/, '').trimEnd();
  }
  return out;
}
