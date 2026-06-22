import React from 'react';

/**
 * CvgMobileHeader — the ONE canonical mobile header for every CV6 phone screen.
 * Ported verbatim from ui_kits/mobile/chat-list.html + the .mhdr spec in
 * ui_kits/_base/frame.css. FIXED slot order so navigation never moves:
 *   .mback (left, "go back to where you just were")
 *   .mhtitle (flex — .mttl title + optional .msub)
 *   .mhactions (right — search .ib FIRST, then the menu .ib LAST so the menu
 *               always sits far right)
 *
 * The .mhdr/.mback/.mhtitle/.mttl/.msub/.mhactions/.ib classes are defined in
 * cv6-frame.css scoped under [data-cv6kit] — so the screen that renders this
 * header MUST have data-cv6kit on its root. Do NOT invent header markup.
 *
 * Props: title, sub, onBack, onSearch, onMenu, showBack (default true),
 *        showSearch (default true), showMenu (default true).
 */
export function CvgMobileHeader({
  title = '',
  sub = '',
  onBack,
  onSearch,
  onMenu,
  showBack = true,
  showSearch = true,
  showMenu = true,
}) {
  return (
    <div className="mhdr" style={{ height: 'auto', minHeight: 60, boxSizing: 'border-box', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {showBack && (
        <div className="mback" role="button" tabIndex={0} aria-label="Back" onClick={onBack}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </div>
      )}
      <div className="mhtitle">
        <div className="mttl">{title}</div>
        {sub ? <div className="msub">{sub}</div> : null}
      </div>
      <div className="mhactions">
        {showSearch && (
          <div className="ib" role="button" tabIndex={0} aria-label="Search" onClick={onSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </div>
        )}
        {showMenu && (
          <div className="ib" role="button" tabIndex={0} aria-label="Menu" onClick={onMenu}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default CvgMobileHeader;
