import React, { useRef } from 'react';

/**
 * MobileNavDrawer — the CV6 mobile global navigation.
 *
 * Faithful to the design system's `ui_kits/mobile/navigation.html` (3-state nav
 * demonstrator) + the shared shell `ui_kits/_base/frame.css`. Mobile has no room
 * for the desktop 8-tool top bar, so the SAME tools live in a RIGHT-anchored drawer
 * opened two ways: tap the header menu, OR swipe in from the right edge (the
 * `.edgehint` grabber makes the gesture discoverable). The drawer SWITCHES tools;
 * the back chevron (`.mback`, owned by each tool screen) goes UP a level within a
 * tool. The drawer holds Home + the tools (each row shows a live status / needs
 * count) and a profile / Settings row at the bottom, opening from the right.
 *
 * Pure presentation — the parent (CornerVG) owns `open` state + the real data.
 * Mount inside a `position:relative` full-size container (the mobile viewport):
 * the layer anchors `position:absolute; inset:0` like `.actdock.is-float`.
 *
 * Props:
 *  - open (bool): drawer + scrim visible
 *  - onOpen (fn): open the drawer (edge grabber tap / right-edge swipe)
 *  - onClose (fn): close the drawer (scrim tap / X)
 *  - onNav (fn): tool selected — onNav(key); parent switches tool + closes
 *  - activeKey (string): current tool key (home/chat/organize/review/support/tracker/command/scribe/settings)
 *  - user (object): { initials, name }
 *  - badges (object): per-tool live signal, e.g.
 *      { chat:{kind:'live',count:3}, review:{kind:'done',count:40},
 *        support:{needs:3}, command:{kind:'live',count:4} }
 *      kind is one of live/blocked/ready/done (→ .astat is-*); `needs` → .needs-count
 *  - showEdgeHint (bool): render the closed-state grabber (default true)
 */

const SVG = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props} />
);

// Icons — exact from the design's navigation.html, so the drawer matches 1:1.
const ICONS = {
  home: <SVG width="19" height="19" strokeWidth="2"><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></SVG>,
  chat: <SVG width="19" height="19" strokeWidth="2"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></SVG>,
  organize: <SVG width="19" height="19" strokeWidth="2"><path d="M12 4 3 8l9 4 9-4-9-4Z" /><path d="m3 12 9 4 9-4" /></SVG>,
  review: <SVG width="19" height="19" strokeWidth="2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></SVG>,
  support: <SVG width="19" height="19" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></SVG>,
  tracker: <SVG width="19" height="19" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></SVG>,
  command: <SVG width="19" height="19" strokeWidth="2"><path d="M7 4H4v16h3M17 4h3v16h-3" /></SVG>,
  scribe: <SVG width="19" height="19" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></SVG>,
};

// Home + the 7 tools, in the design's drawer order. Search is the ⌘K palette
// (header search button), not a drawer row.
const TOOLS = [
  { key: 'home', label: 'Home', icon: ICONS.home },
  { key: 'chat', label: 'Chat', icon: ICONS.chat },
  { key: 'organize', label: 'Organize', icon: ICONS.organize },
  { key: 'review', label: 'Review', icon: ICONS.review },
  { key: 'support', label: 'Support', icon: ICONS.support },
  { key: 'tracker', label: 'Tracker', icon: ICONS.tracker },
  { key: 'command', label: 'Command', icon: ICONS.command },
  { key: 'scribe', label: 'Live Scribe', icon: ICONS.scribe },
];

function Badge({ badge }) {
  if (!badge) return null;
  if (badge.needs != null) {
    return <span className="needs-count">{badge.needs}</span>;
  }
  if (badge.count != null) {
    return (
      <span className={`astat is-${badge.kind || 'ready'}`}>
        <span className="sd" />
        {badge.count}
      </span>
    );
  }
  return null;
}

export default function MobileNavDrawer({
  open = false,
  onOpen,
  onClose,
  onNav,
  activeKey = 'home',
  user = {},
  badges = {},
  showEdgeHint = true,
}) {
  const { initials = 'P', name = 'You' } = user;
  const swipe = useRef({ x: 0, active: false });

  // Right-edge swipe-to-open: start in the right gutter, drag left past a threshold.
  const onEdgeTouchStart = (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    swipe.current = { x: t.clientX, active: true };
  };
  const onEdgeTouchMove = (e) => {
    if (!swipe.current.active) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    if (swipe.current.x - t.clientX > 36) {
      swipe.current.active = false;
      onOpen && onOpen();
    }
  };

  // Swipe-to-close on the open drawer: drag right past a threshold.
  const onDrawerTouchStart = (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    swipe.current = { x: t.clientX, active: true };
  };
  const onDrawerTouchMove = (e) => {
    if (!swipe.current.active) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    if (t.clientX - swipe.current.x > 60) {
      swipe.current.active = false;
      onClose && onClose();
    }
  };

  const pick = (key) => {
    onNav && onNav(key);
    onClose && onClose();
  };

  return (
    <div
      className="cv6navlayer"
      style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none' }}
    >
      {/* CLOSED — the discoverable right-edge grabber + a wider invisible swipe strip. */}
      {!open && showEdgeHint && (
        <>
          <button
            type="button"
            className="edgehint"
            onClick={onOpen}
            aria-label="Open navigation"
            style={{ pointerEvents: 'auto', border: '1px solid rgba(255,255,255,.14)', borderRight: 'none' }}
          >
            <span className="grip" />
            <SVG width="16" height="16" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></SVG>
          </button>
          <div
            aria-hidden="true"
            onTouchStart={onEdgeTouchStart}
            onTouchMove={onEdgeTouchMove}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 22, pointerEvents: 'auto' }}
          />
        </>
      )}

      {/* OPEN — scrim + the tool drawer. */}
      {open && (
        <>
          <div className="navscrim" onClick={onClose} style={{ pointerEvents: 'auto' }} />
          <div
            className="navdrawer"
            onTouchStart={onDrawerTouchStart}
            onTouchMove={onDrawerTouchMove}
            style={{ pointerEvents: 'auto' }}
            role="navigation"
            aria-label="Tools"
          >
            {/* brand + close */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 16px 14px', borderBottom: '1px solid var(--divider)',
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Corner</span>
              <button
                type="button" className="ib" onClick={onClose} aria-label="Close"
                style={{ width: 32, height: 32, borderRadius: 9 }}
              >
                <SVG width="15" height="15" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18" /></SVG>
              </button>
            </div>

            {/* tools */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {TOOLS.map((tool) => (
                <div
                  key={tool.key}
                  className={`navrow${activeKey === tool.key ? ' on' : ''}`}
                  onClick={() => pick(tool.key)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="ni">{tool.icon}</span>
                  <span className="nl">{tool.label}</span>
                  <Badge badge={badges[tool.key]} />
                </div>
              ))}
            </div>

            {/* profile → Settings & environment */}
            <div style={{ borderTop: '1px solid var(--divider)', padding: 12 }}>
              <div
                className="navrow"
                onClick={() => pick('settings')}
                role="button"
                tabIndex={0}
                style={{ gap: 12 }}
              >
                <span className="av" style={{ width: 38, height: 38, fontSize: 13 }}>{initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Settings &amp; environment</div>
                </div>
                <SVG width="17" height="17" strokeWidth="2" style={{ stroke: 'var(--faint)' }}><path d="M9 18l6-6-6-6" /></SVG>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
