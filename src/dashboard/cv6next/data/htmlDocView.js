// Sandboxed inline HTML/web-page reader for Corner Files + Review.
//
// HTML artifacts used to fall through the generic document branch and show a
// "download this file" card. This reader fetches the source text, rewrites local
// sibling assets through the Range/CORS-capable RAG tunnel, and loads the page into
// a sandboxed srcdoc iframe. The iframe stays isolated from Corner while the
// pin-shield gives Review's existing comment system a click surface.

import { useEffect } from 'react';
import { cornerLogoLoaderMarkup } from '../../cv6kit/cornerLogoLoaderMarkup.js';

const TUNNEL_BASE = 'https://rag.aheadofmarket.com';
const INK = '#1a1a1a';
const INK_MID = '#6a6a72';

function escAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const WAIT_HTML = cornerLogoLoaderMarkup('Loading web page…', {
  paper: true,
  compact: true,
  minHeight: 320,
  waitAttribute: 'data-html-wait',
});

function pinControls() {
  return '<div class="pinshield" style="position:absolute;inset:0;display:none;cursor:crosshair;z-index:4;"></div>'
    + '<button class="pinmode-toggle" type="button" style="position:absolute;top:10px;right:10px;z-index:5;display:flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:none;border-radius:15px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);color:#fff;font-size:11.5px;font-weight:600;cursor:pointer;">Pin mode: off</button>';
}

export function isHtmlName(name) {
  return /\.html?$/i.test(String(name || '').split(/[?#]/)[0]);
}

export function htmlShellHtml(src, name, sourcePath = '') {
  const label = name || 'Web page';
  return '<div class="browser" data-html-preview>'
    + '<div class="bchrome"><span class="bdot" style="background:#f87171;"></span><span class="bdot" style="background:#fbbf24;"></span><span class="bdot" style="background:#34d399;"></span>'
    + `<div class="burl">${escAttr(label)}</div></div>`
    + '<div style="position:relative;min-height:320px;background:#fff;">'
    + `<div data-html-doc data-html-src="${escAttr(src)}" data-html-name="${escAttr(label)}" data-html-path="${escAttr(sourcePath)}">${WAIT_HTML}</div>`
    + pinControls()
    + '</div></div>';
}

function dirname(value) {
  const clean = String(value || '').split(/[?#]/)[0].replace(/\\/g, '/');
  const ix = clean.lastIndexOf('/');
  return ix >= 0 ? clean.slice(0, ix + 1) : '';
}

function joinPath(base, relative) {
  const out = [];
  for (const part of `${base}${relative}`.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function isPassthroughUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(String(value || '').trim());
}

function assetUrl(value, { src, sourcePath }) {
  const raw = String(value || '').trim();
  if (!raw || isPassthroughUrl(raw)) return raw;

  // Uploaded HTML normally has a conventional absolute URL, so normal URL
  // resolution preserves sibling CSS/images/scripts without involving the tunnel.
  const absoluteSource = /^https?:\/\//i.test(sourcePath) ? sourcePath
    : (/^https?:\/\//i.test(src) && !/\/project-file-raw\?/i.test(src) ? src : '');
  if (absoluteSource) {
    try { return new URL(raw, absoluteSource).href; } catch { return raw; }
  }

  // Mirrored Corner HTML uses a query-string raw endpoint. A normal <base> cannot
  // resolve siblings through that endpoint, so rewrite each relative asset to its
  // own canonical tunnel URL.
  if (sourcePath) {
    const path = raw.startsWith('/') ? raw.replace(/^\/+/, '') : joinPath(dirname(sourcePath), raw);
    return `${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(path)}`;
  }
  try { return new URL(raw, src).href; } catch { return raw; }
}

function rewriteCssUrls(css, ctx) {
  return String(css || '').replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (whole, quote, value) => {
    const next = assetUrl(value, ctx);
    return `url("${String(next).replace(/"/g, '%22')}")`;
  });
}

// Exported for focused browser regression coverage.
export function rewriteHtmlForPreview(source, src, sourcePath = '') {
  const doc = new DOMParser().parseFromString(String(source || ''), 'text/html');
  const ctx = { src, sourcePath };

  // A source-authored base can escape the artifact's folder and make otherwise
  // local assets disappear. Resolve every relevant URL explicitly instead.
  doc.querySelectorAll('base').forEach((node) => node.remove());
  // A stored page's production CSP often names its original origin and blocks all
  // rewritten preview assets inside srcdoc. The iframe sandbox is the security
  // boundary here, so discard only CSP meta tags while preserving normal metadata.
  doc.querySelectorAll('meta[http-equiv]').forEach((node) => {
    if (String(node.getAttribute('http-equiv') || '').toLowerCase() === 'content-security-policy') node.remove();
  });
  for (const [selector, attr] of [
    ['img[src],script[src],iframe[src],source[src],audio[src],video[src],input[src]', 'src'],
    ['link[href]', 'href'],
    ['video[poster]', 'poster'],
  ]) {
    doc.querySelectorAll(selector).forEach((node) => {
      const value = node.getAttribute(attr);
      if (value) node.setAttribute(attr, assetUrl(value, ctx));
    });
  }
  doc.querySelectorAll('[srcset]').forEach((node) => {
    const next = String(node.getAttribute('srcset') || '').split(',').map((part) => {
      const bits = part.trim().split(/\s+/);
      if (!bits[0] || /^data:/i.test(bits[0])) return part.trim();
      bits[0] = assetUrl(bits[0], ctx);
      return bits.join(' ');
    }).join(', ');
    node.setAttribute('srcset', next);
  });
  doc.querySelectorAll('[style]').forEach((node) => node.setAttribute('style', rewriteCssUrls(node.getAttribute('style'), ctx)));
  doc.querySelectorAll('style').forEach((node) => { node.textContent = rewriteCssUrls(node.textContent, ctx); });

  // Relative navigation leaves the isolated preview instead of failing inside a
  // query-string base. It opens separately; review comments stay on the artifact.
  doc.querySelectorAll('a[href]').forEach((node) => {
    const href = node.getAttribute('href') || '';
    if (!isPassthroughUrl(href)) node.setAttribute('href', assetUrl(href, ctx));
    node.removeAttribute('target');
    node.removeAttribute('rel');
  });

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

function errorCard(src, name) {
  return '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:9px;min-height:220px;padding:24px;background:#fff;box-sizing:border-box;">'
    + `<span style="font-size:14px;font-weight:700;color:${INK};">This web page could not load</span>`
    + `<span style="font-size:12.5px;color:${INK_MID};">Retry the inline preview. Your file is unchanged.</span>`
    + '<span style="display:flex;gap:10px;">'
    + '<button type="button" data-html-retry style="height:32px;padding:0 14px;border:none;border-radius:9px;background:#0066FF;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Retry</button>'
    + `<span hidden>${escAttr(name)}</span></span></div>`;
}

async function hydrateOne(node, registry) {
  const src = node.getAttribute('data-html-src') || '';
  const name = node.getAttribute('data-html-name') || 'Web page';
  const sourcePath = node.getAttribute('data-html-path') || '';
  if (!src) return;
  const entry = { dead: false };
  registry.set(node, entry);
  try {
    const response = await fetch(src, { credentials: 'omit' });
    if (!response.ok) throw new Error(`fetch ${response.status}`);
    const source = await response.text();
    if (entry.dead || !node.isConnected) return;
    if (!/<(?:!doctype|html|head|body|style|script|main|div)\b/i.test(source)) throw new Error('not html');

    const iframe = document.createElement('iframe');
    iframe.title = name;
    iframe.setAttribute('data-html-frame', '1');
    iframe.setAttribute('sandbox', 'allow-scripts allow-modals allow-popups');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('style', 'display:block;width:100%;height:max(520px,62vh);border:0;background:#fff;');
    iframe.srcdoc = rewriteHtmlForPreview(source, src, sourcePath);
    node.replaceChildren(iframe);
  } catch {
    if (!entry.dead && node.isConnected) {
      node.innerHTML = errorCard(src, name);
      node.querySelector('[data-html-retry]')?.addEventListener('click', () => {
        entry.dead = true;
        node.innerHTML = WAIT_HTML;
        hydrateOne(node, registry);
      }, { once: true });
    }
  }
}

export function useHtmlDocs(wrapRef, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const registry = new Map();
    const sweep = () => {
      for (const node of wrap.querySelectorAll('[data-html-doc]:not([data-html-live])')) {
        node.setAttribute('data-html-live', '1');
        hydrateOne(node, registry);
      }
      for (const [node, entry] of registry) {
        if (!node.isConnected) { entry.dead = true; registry.delete(node); }
      }
    };
    sweep();
    const observer = new MutationObserver(sweep);
    observer.observe(wrap, { subtree: true, childList: true });
    return () => {
      observer.disconnect();
      for (const [, entry] of registry) entry.dead = true;
      registry.clear();
    };
  }, [wrapRef, enabled]);
}
