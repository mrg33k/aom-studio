// SharedNav -- ONE navigation, two forms (design-system-2026-06-23, item 7).
// Desktop renders the top tool bar; mobile renders the drawer. BOTH read the same
// ordered NAV_TOOLS list, so order / icons / active state never drift between
// screens. Contract: deliverables/.../wired/components/nav.json.
//
// Drop-in rule: every page mounts this one nav. If a screen hand-rolls its own
// tool list, it's wrong -- point it back here.
import React, { useEffect } from 'react';

// --- the ONE ordered tool list both forms render -------------------------------
// `route` is the view-machine target onPick receives. `wired` is whether that
// surface exists live yet -- the full list is the design's source of truth (all 8),
// but we render only wired tools so there are no dead taps. Flip `wired` to true as
// each screen (organize/review/livescribe) lands.
// One Page collapse (corner:one-corner drop 4, Patrik 2026-07-20: "nothing in the
// top bar, we are leaning more towards making space"): EVERY tool left the bar.
// parked:true = the surface stays fully alive at its ?view= deep link and inside
// the room screen (Email lives pinned in the rooms rail; review lives on every
// file), it just no longer owns bar real estate. Un-park by flipping the flag.
export const NAV_TOOLS = [
  { id: 'home',       label: 'Home',     route: 'home',       wired: true, parked: true },
  // Chat tab retired (Patrik 2026-06-30); Review folded into Files (2026-07-13);
  // Support renamed Email (2026-07-13) — full history in git, ids never re-key.
  { id: 'organize',   label: 'Files',    route: 'organize',   wired: true, parked: true },
  { id: 'support',    label: 'Email',    route: 'support',    wired: true, parked: true },
  { id: 'tracker',    label: 'Tracker',  route: 'tracker',    wired: true, parked: true },
  { id: 'command',    label: 'Command',  route: 'command',    wired: true, parked: true },
  { id: 'livescribe', label: 'Scribe',   route: 'livescribe', wired: true, parked: true, mobileLabel: 'Live Scribe' },
];

// What the nav actually renders today: wired, un-parked tools (none since drop 4).
const VISIBLE_TOOLS = NAV_TOOLS.filter((t) => t.wired && !t.parked);

// The mobile drawer enters from the same RIGHT edge as the header trigger:
// Rooms first, then Email and Settings. Keeping trigger and motion on one edge
// makes the spatial model predictable.
const MOBILE_MENU = [
  { id: 'home',     label: 'Rooms',           route: 'home' },
  { id: 'support',  label: 'Email',           route: 'support' },
  // Background work window (corner:one-corner M19) — running jobs + owed
  // come-backs moved out of the chat threads into their own surface.
  { id: 'workers',  label: 'Background work', route: 'workers' },
  { id: 'settings', label: 'Settings',        route: 'settings' },
];

// Shared glyphs -- identical desktop + mobile (the contract requires same icons).
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
function Icon({ id, size = 19 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', ...S };
  switch (id) {
    case 'home':       return <svg {...p}><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></svg>;
    case 'chat':       return <svg {...p}><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>;
    case 'organize':   return <svg {...p}><path d="M12 4 3 8l9 4 9-4-9-4Z" /><path d="m3 12 9 4 9-4" /></svg>;
    case 'review':     return <svg {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
    case 'support':    return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case 'workers':    return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
    case 'tracker':    return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
    case 'command':    return <svg {...p}><path d="M7 4H4v16h3M17 4h3v16h-3" /></svg>;
    case 'livescribe': return <svg {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case 'settings':   return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></svg>;
    default:           return null;
  }
}

const SearchGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

// A badge on a tool: {kind:'status', status:'live'|'working'|..., count} renders an
// .astat chip; {kind:'needs', count} renders the needs-count pill. Omit when zero.
// The needs badge is AMBER (--warn), not accent: "waiting on you" speaks one color
// across the nav badge, the per-file NEEDS REVIEW badge, and the top-line pill
// (design-critic send-back, 2026-07-13 — red stays reserved for destructive Dismiss).
function Badge({ badge }) {
  if (!badge || !badge.count) return null;
  if (badge.kind === 'needs') {
    return (
      <span className="needs-count" style={{ background: 'var(--warn-weak, rgba(251,191,36,.16))', color: 'var(--warn, #FBBF24)', border: '1px solid rgba(251,191,36,.35)' }}>
        {badge.count}
      </span>
    );
  }
  return <span className={`astat is-${badge.status || 'live'}`}><span className="sd" />{badge.count}</span>;
}

const LOGO = '/cv6/assets/corner-logo-white.svg';

// One theme control, three states. The icon always describes the active surface:
// sun = light, moon = dark, crystal ball = glass. A click advances to the next.
const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'glass', label: 'Glass' },
];
function ThemeIcon({ theme, size = 18 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', ...S };
  if (theme === 'light') return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
  if (theme === 'glass') return <svg {...p}><circle cx="12" cy="10" r="7" /><path d="M8 18h8M9 21h6" /><path d="M9.5 8.5c1-1.2 2.3-1.8 4-1.8" /></svg>;
  return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>;
}
function ThemeCycle({ theme, onTheme, compact }) {
  if (!onTheme) return null;
  const currentIndex = Math.max(0, THEMES.findIndex((t) => t.id === theme));
  const current = THEMES[currentIndex];
  const next = THEMES[(currentIndex + 1) % THEMES.length];
  return (
    <button type="button" className="ib cv6-theme-cycle" onClick={() => onTheme(next.id)}
      aria-label={`${current.label} theme. Switch to ${next.label}`} title={`${current.label} theme`}
      style={{ width: compact ? 38 : 42, height: compact ? 38 : 42, borderRadius: '50%', cursor: 'pointer' }}>
      <ThemeIcon theme={current.id} />
    </button>
  );
}

// --- DESKTOP: the top tool bar -------------------------------------------------
export function DesktopNav({ current, onPick, onOpenCommandK, onOpenEmailColumn, onOpenWorkersColumn, onOpenProfile, onOpenAlerts, alertCount = 0, userInitials = 'P', badges = {}, theme, onTheme }) {
  return (
    <div className="topbar">
      <div className="tgreet" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <button type="button" onClick={() => onPick?.('home')} aria-label="Open Rooms home"
          style={{ display: 'flex', alignItems: 'center', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <img src={LOGO} alt="Corner" style={{ height: 20 }} />
        </button>
      </div>
      <div className="toolnav">
        {VISIBLE_TOOLS.map((t) => (
          <button key={t.id} type="button" className={`ctile${t.id === current ? ' on' : ''}`}
            onClick={() => onPick?.(t.route)} aria-label={t.label}
            aria-current={t.id === current ? 'page' : undefined}
            style={{ position: 'relative' }}>
            <Icon id={t.id} />
            <span className="clab">{t.label}</span>
            {/* Needs-you count on a tool tile (the Files row carries the waiting review
                count since the Review tool folded into Files). Same Badge the drawer uses. */}
            {badges[t.id]?.count ? (
              <span style={{ position: 'absolute', top: -6, right: -8 }}><Badge badge={badges[t.id]} /></span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="topbar-actions">
        <ThemeCycle theme={theme} onTheme={onTheme} compact />
        {/* Background work sits beside Email — same window mechanic, same entry point
            (corner:one-corner M19). On Home there is no rooms rail, so this icon is
            the desktop front door to the window. */}
        {onOpenWorkersColumn ? (
          <button type="button" className="ib" onClick={() => onOpenWorkersColumn?.() || onPick?.('workers')} aria-label="Open Background work" title="Open Background work"><Icon id="workers" size={18} /></button>
        ) : null}
        <button type="button" className={`ib${current === 'support' ? ' is-active' : ''}`} onClick={() => onOpenEmailColumn?.() || onPick?.('support')} aria-label="Open Email column" title="Open Email column"><Icon id="support" size={18} /></button>
        <button type="button" className="ib" onClick={() => onOpenCommandK?.()} aria-label="Search"><SearchGlyph /></button>
        {/* The bell: notification sound + phone notifications. The home template has
            always drawn one; the live shell never did, so the panel behind it had no
            way in until now (Patrik 2026-08-06). */}
        {onOpenAlerts ? (
          <button type="button" className="ib" style={{ position: 'relative' }} onClick={() => onOpenAlerts()} aria-label="Notifications" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            {alertCount > 0 ? (
              <span aria-hidden="true" style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--ground)' }} />
            ) : null}
          </button>
        ) : null}
        <button type="button" className="av" onClick={() => onOpenProfile?.()} aria-label="Profile">{userInitials}</button>
      </div>
    </div>
  );
}

// --- MOBILE: the drawer --------------------------------------------------------
export function MobileNav({ open, current, onPick, onClose, badges = {}, theme, onTheme }) {
  // Escape closes the drawer — standard modal behaviour, and it keeps the full-screen
  // scrim from lingering over the rest of the UI (a lingering scrim silently swallows
  // the next tap on anything underneath).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="navscrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div className="navdrawer" data-app-theme={theme} onClick={(e) => e.stopPropagation()}
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 12px', borderBottom: '1px solid var(--divider)', marginBottom: 8 }}>
          <img src={LOGO} alt="Corner" style={{ height: 19 }} />
          <button type="button" className="ib" onClick={onClose} aria-label="Close menu"
            style={{ width: 30, height: 30, borderRadius: 9, cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {MOBILE_MENU.map((t) => (
          <button type="button" key={t.id} className={`navrow${t.id === current ? ' on' : ''}`}
            onClick={() => { onPick?.(t.route); onClose?.(); }} aria-current={t.id === current ? 'page' : undefined}
            style={{ width: '100%', border: 'none', background: t.id === current ? 'var(--accent-weak)' : 'transparent', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
            <span className="ni"><Icon id={t.id} /></span>
            <span className="nl">{t.label}</span>
            <Badge badge={badges[t.id]} />
          </button>
        ))}
        {onTheme && (
          <div style={{ padding: '14px 14px 4px', borderTop: '1px solid var(--divider)', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>Theme</div><div style={{ marginTop: 3, fontSize: 13, color: 'var(--muted)' }}>{THEMES.find((t) => t.id === theme)?.label || 'Dark'}</div></div>
              <ThemeCycle theme={theme} onTheme={onTheme} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default { NAV_TOOLS, DesktopNav, MobileNav };
