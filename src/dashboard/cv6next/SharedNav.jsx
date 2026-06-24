// SharedNav -- ONE navigation, two forms (design-system-2026-06-23, item 7).
// Desktop renders the top tool bar; mobile renders the drawer. BOTH read the same
// ordered NAV_TOOLS list, so order / icons / active state never drift between
// screens. Contract: deliverables/.../wired/components/nav.json.
//
// Drop-in rule: every page mounts this one nav. If a screen hand-rolls its own
// tool list, it's wrong -- point it back here.
import React from 'react';

// --- the ONE ordered tool list both forms render -------------------------------
// `route` is the view-machine target onPick receives. `wired` is whether that
// surface exists live yet -- the full list is the design's source of truth (all 8),
// but we render only wired tools so there are no dead taps. Flip `wired` to true as
// each screen (organize/review/livescribe) lands.
export const NAV_TOOLS = [
  { id: 'home',       label: 'Home',     route: 'home',       wired: true },
  { id: 'chat',       label: 'Chat',     route: 'chat',       wired: true },
  { id: 'organize',   label: 'Organize', route: 'organize',   wired: true },
  { id: 'review',     label: 'Review',   route: 'review',     wired: true },
  { id: 'support',    label: 'Support',  route: 'support',    wired: true },
  { id: 'tracker',    label: 'Tracker',  route: 'tracker',    wired: true },
  { id: 'command',    label: 'Command',  route: 'command',    wired: true },
  { id: 'livescribe', label: 'Scribe',   route: 'livescribe', wired: false, mobileLabel: 'Live Scribe' },
];

// What the nav actually renders today: the wired tools, in the design's order.
const VISIBLE_TOOLS = NAV_TOOLS.filter((t) => t.wired);

// Shared glyphs -- identical desktop + mobile (the contract requires same icons).
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
function Icon({ id, size = 19 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', ...S };
  switch (id) {
    case 'home':       return <svg {...p}><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></svg>;
    case 'chat':       return <svg {...p}><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>;
    case 'organize':   return <svg {...p}><path d="M12 4 3 8l9 4 9-4-9-4Z" /><path d="m3 12 9 4 9-4" /></svg>;
    case 'review':     return <svg {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
    case 'support':    return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>;
    case 'tracker':    return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
    case 'command':    return <svg {...p}><path d="M7 4H4v16h3M17 4h3v16h-3" /></svg>;
    case 'livescribe': return <svg {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    default:           return null;
  }
}

const SearchGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

// A badge on a tool: {kind:'status', status:'live'|'working'|..., count} renders an
// .astat chip; {kind:'needs', count} renders the red needs-count. Omit when zero.
function Badge({ badge }) {
  if (!badge || !badge.count) return null;
  if (badge.kind === 'needs') return <span className="needs-count">{badge.count}</span>;
  return <span className={`astat is-${badge.status || 'live'}`}><span className="sd" />{badge.count}</span>;
}

const LOGO = '/cv6/assets/corner-logo-white.svg';

// --- DESKTOP: the top tool bar -------------------------------------------------
export function DesktopNav({ current, onPick, onOpenCommandK, onOpenProfile, userInitials = 'P', badges = {} }) {
  return (
    <div className="topbar">
      <div className="tgreet" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <img src={LOGO} alt="Corner" style={{ height: 20 }} />
      </div>
      <div className="toolnav">
        {VISIBLE_TOOLS.map((t) => (
          <div key={t.id} className={`ctile${t.id === current ? ' on' : ''}`}
            onClick={() => onPick?.(t.route)} role="button" aria-label={t.label}>
            <Icon id={t.id} />
            <span className="clab">{t.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="ib" onClick={() => onOpenCommandK?.()} role="button" aria-label="Search"><SearchGlyph /></div>
        <div className="av" onClick={() => onOpenProfile?.()} role="button" aria-label="Profile">{userInitials}</div>
      </div>
    </div>
  );
}

// --- MOBILE: the drawer --------------------------------------------------------
export function MobileNav({ open, current, onPick, onClose, badges = {} }) {
  if (!open) return null;
  return (
    <div className="navscrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div className="navdrawer" onClick={(e) => e.stopPropagation()}
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 12px', borderBottom: '1px solid var(--divider)', marginBottom: 8 }}>
          <img src={LOGO} alt="Corner" style={{ height: 19 }} />
          <div className="ib" onClick={onClose} role="button" aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: 9 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </div>
        </div>
        {VISIBLE_TOOLS.map((t) => (
          <div key={t.id} className={`navrow${t.id === current ? ' on' : ''}`}
            onClick={() => { onPick?.(t.route); onClose?.(); }} role="button">
            <span className="ni"><Icon id={t.id} /></span>
            <span className="nl">{t.mobileLabel || t.label}</span>
            <Badge badge={badges[t.id]} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default { NAV_TOOLS, DesktopNav, MobileNav };
