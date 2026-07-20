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

// The mobile drawer is the LEFT-side menu of the one-page world: rooms first,
// Email, Settings. (Rooms opens the room directory; the full in-drawer rooms
// list is the next polish pass.)
const MOBILE_MENU = [
  { id: 'home',     label: 'Rooms',    route: 'home' },
  { id: 'support',  label: 'Email',    route: 'support' },
  { id: 'settings', label: 'Settings', route: 'settings' },
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

// --- Theme switcher (drop 7): Dark / Light / Glass segmented control. Lives in the
// mobile drawer and the desktop nav; flips data-app-theme on the shell root. Token-
// styled so it reads right in every theme.
const THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'glass', label: 'Glass' },
];
function ThemeSeg({ theme, onTheme, compact }) {
  if (!onTheme) return null;
  return (
    <div role="group" aria-label="Theme"
      style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--hair)' }}>
      {THEMES.map((t) => {
        const on = t.id === theme;
        return (
          <button key={t.id} onClick={() => onTheme(t.id)} aria-pressed={on} role="button"
            style={{ height: compact ? 28 : 34, padding: compact ? '0 11px' : '0 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: compact ? 12 : 13, fontWeight: 600, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
              background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--muted)' }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// --- DESKTOP: the top tool bar -------------------------------------------------
export function DesktopNav({ current, onPick, onOpenCommandK, onOpenProfile, userInitials = 'P', badges = {}, theme, onTheme }) {
  return (
    <div className="topbar">
      <div className="tgreet" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <img src={LOGO} alt="Corner" style={{ height: 20 }} />
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
        <ThemeSeg theme={theme} onTheme={onTheme} compact />
        <button type="button" className="ib" onClick={() => onOpenCommandK?.()} aria-label="Search"><SearchGlyph /></button>
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
          <div className="ib" onClick={onClose} role="button" aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: 9 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </div>
        </div>
        {MOBILE_MENU.map((t) => (
          <div key={t.id} className={`navrow${t.id === current ? ' on' : ''}`}
            onClick={() => { onPick?.(t.route); onClose?.(); }} role="button">
            <span className="ni"><Icon id={t.id} /></span>
            <span className="nl">{t.label}</span>
            <Badge badge={badges[t.id]} />
          </div>
        ))}
        {onTheme && (
          <div style={{ padding: '14px 14px 4px', borderTop: '1px solid var(--divider)', marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 9 }}>Theme</div>
            <ThemeSeg theme={theme} onTheme={onTheme} />
          </div>
        )}
      </div>
    </div>
  );
}

export default { NAV_TOOLS, DesktopNav, MobileNav };
