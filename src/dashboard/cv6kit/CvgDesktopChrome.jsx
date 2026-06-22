import React from 'react';

/**
 * CvgDesktopChrome — the ONE shared desktop top bar for every CV6 tool screen.
 * Ported verbatim from the design files' `.topbar` (ui_kits/tools/*.html +
 * ui_kits/desktop/index.html): Corner wordmark (left), centered 8-tool nav with an
 * active state, search + avatar (right). One Corner header, never repeated in the body.
 *
 * Props: activeTool ('home'|'chat'|'organize'|'review'|'support'|'tracker'|'command'|'scribe'),
 *        onNav(key), user ({ initial }).
 */

// The 8 tools in the design's fixed order, with their exact icon paths.
export const CV6_TOOLS = [
  { key: 'home', label: 'Home', p: '<path d="M3 11l9-7 9 7"/><path d="M5 9.8V20h14V9.8"/>' },
  { key: 'chat', label: 'Chat', p: '<path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z"/>' },
  { key: 'organize', label: 'Organize', p: '<path d="M12 4 3 8l9 4 9-4-9-4Z"/><path d="m3 12 9 4 9-4"/>' },
  { key: 'review', label: 'Review', p: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>' },
  { key: 'support', label: 'Support', p: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>' },
  { key: 'tracker', label: 'Tracker', p: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>' },
  { key: 'command', label: 'Command', p: '<path d="M7 4H4v16h3M17 4h3v16h-3"/>' },
  { key: 'scribe', label: 'Scribe', p: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>' },
];

const Svg = ({ p, size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: p }} />
);

export function CvgDesktopChrome({ activeTool = 'home', onNav, user = {} }) {
  const active = CV6_TOOLS.find((t) => t.key === activeTool) || CV6_TOOLS[0];
  return (
    <div className="topbar" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 22, padding: '16px 28px', borderBottom: '1px solid var(--divider)' }}>
      <div style={{ flex: 'none' }}>
        <img src="/cv6/assets/corner-logo-white.svg" alt="Corner" style={{ height: 22, width: 'auto', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 8 }}>
        {CV6_TOOLS.map((t) => (
          <div key={t.key} onClick={() => onNav && onNav(t.key)} style={{ width: 66, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 0 7px', borderRadius: 'var(--radius-control,12px)', cursor: 'pointer', background: t.key === activeTool ? 'var(--accent)' : 'var(--surface)', border: t.key === activeTool ? '1px solid transparent' : '1px solid var(--hair)', color: t.key === activeTool ? '#fff' : 'var(--muted)' }}>
            <Svg p={t.p} />
            <span style={{ fontSize: 10.5, fontWeight: 600 }}>{t.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{active.label}</span>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--hair)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--avatar,var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 600 }}>{user.initial || 'P'}</div>
      </div>
    </div>
  );
}

export default CvgDesktopChrome;
