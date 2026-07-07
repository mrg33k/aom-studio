// mediaFallback.js — shared "couldn't load" state for media previews.
//
// Organize + Review render <video>/<audio>/<img> as HTML strings (dangerouslySet).
// Before this, a media load error left a dead black box: Organize hid its loading
// spinner and showed nothing; Review had no error state at all. A momentary tunnel
// hiccup read as a permanently broken file even though the bytes serve fine.
//
// This installs a single global, window.__cornerMediaErr(el), that any media tag
// can call from an inline onerror. It swaps the failed element in place for a
// visible "Couldn't load this file / Retry" card. Built with real DOM + listeners
// (no nested-attribute string escaping), and Retry rebuilds the element with a
// cache-busted src. It does NOT wrap the element, so Review's scrub bar
// (ReviewPins reads v.parentElement as its host) is left intact.

function installMediaErr() {
  if (typeof window === 'undefined' || window.__cornerMediaErr) return;

  window.__cornerMediaErr = function (el) {
    if (!el || el.__cornerErrored) return;
    el.__cornerErrored = true;

    const src = el.getAttribute('data-src') || el.currentSrc || el.src || '';
    const kind = el.getAttribute('data-kind') || 'file';
    const styleText = el.style && el.style.cssText;

    // Hide a sibling loading spinner if one is present (Organize video/image box).
    const box = el.parentElement;
    const wait = box && box.querySelector('[data-media-wait]');
    if (wait) wait.style.display = 'none';

    const card = document.createElement('div');
    card.setAttribute('data-media-err', '1');
    card.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:10px;min-height:160px;padding:22px;border:1px solid var(--hair,#2a2a2e);' +
      'border-radius:10px;background:rgba(255,255,255,.02);color:#c9c9c9;text-align:center;';

    const icon = document.createElement('div');
    icon.textContent = '⚠';
    icon.style.cssText = 'font-size:22px;opacity:.55;line-height:1;';

    const msg = document.createElement('div');
    msg.textContent = "Couldn't load this file.";
    msg.style.cssText = 'font-size:13px;';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Retry';
    btn.style.cssText =
      'height:30px;padding:0 15px;border:1px solid var(--hair,#333);border-radius:15px;' +
      'background:rgba(255,255,255,.06);color:#eee;font-size:12px;font-weight:600;cursor:pointer;';
    btn.addEventListener('click', () => {
      const tag = kind === 'audio' ? 'audio' : kind === 'video' ? 'video' : 'img';
      const fresh = document.createElement(tag);
      if (tag === 'video' || tag === 'audio') {
        fresh.controls = true;
        fresh.preload = 'metadata';
        fresh.playsInline = true;
      }
      if (styleText) fresh.style.cssText = styleText;
      fresh.setAttribute('data-src', src);
      fresh.setAttribute('data-kind', kind);
      fresh.setAttribute('onerror', 'window.__cornerMediaErr(this)');
      // Cache-bust so a transient failure actually re-requests.
      fresh.src = src.split('#')[0] + '#r' + Date.now();
      card.replaceWith(fresh);
    });

    card.append(icon, msg, btn);
    el.replaceWith(card);
  };
}

installMediaErr();

// Attributes to drop onto a media tag so a failed load shows the retry card.
// Usage: `<video src="${url}" ${mediaAttrs(url, 'video')} ...>`
export function mediaAttrs(src, kind) {
  const safe = String(src == null ? '' : src).replace(/"/g, '&quot;');
  return `data-src="${safe}" data-kind="${kind}" onerror="window.__cornerMediaErr(this)"`;
}
