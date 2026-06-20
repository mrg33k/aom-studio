import React, { useState } from 'react';
import { SideRail } from './components/navigation/SideRail.jsx';
import { CatchUpCard } from './components/rooms/CatchUpCard.jsx';
import { RoomRow } from './components/rooms/RoomRow.jsx';
import { Button } from './components/core/Button.jsx';
import { Badge } from './components/core/Badge.jsx';

const I = {
  home: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></svg>,
  chat: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>,
  organize: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 3 8l9 4 9-4-9-4Z" /><path d="m3 12 9 4 9-4" /></svg>,
  review: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>,
};

const FOLDER = (c) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>;

// Menu (hamburger) glyph for the toggle button — Patrik 2026-06-19: the menu button is a
// menu icon, not the P avatar. White stroke so it always reads on the dark control.
const MENU_GLYPH = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>;

/**
 * Canonical mobile Home. Two states from the kit's navigation model:
 *  - open (rail in, content inset 72px) — the avatar at the top of the rail closes it
 *  - closed (content full-bleed, a menu FAB bottom-right is the only chrome) — the FAB opens it
 * Starts open (what Patrik is seeing); the menu button toggles between the two.
 */
export function MobileHomeKit() {
  const [menuOpen, setMenuOpen] = useState(true);
  const navItems = [
    { key: 'home', label: 'Home', icon: I.home },
    { key: 'chat', label: 'Chat', icon: I.chat },
    { key: 'organize', label: 'Organize', icon: I.organize },
    { key: 'review', label: 'Review', icon: I.review },
  ];

  return (
    <div data-theme="dark" style={{ position: 'fixed', inset: 0, width: '100%', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'absolute', left: 0, top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: menuOpen ? 72 : 0, bottom: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '6px 0 calc(28px + env(safe-area-inset-bottom, 0px))', transition: 'right .28s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ padding: '0 22px', marginBottom: 20, fontSize: 29, lineHeight: 1.1, fontWeight: 700, letterSpacing: '-.025em', color: 'var(--fg)' }}>
          Good evening,<br /><span style={{ color: 'var(--faint)' }}>Patrik.</span>
        </div>

        <div style={{ padding: '0 22px', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Catch up</span>
          <Badge tone="weak">4</Badge>
        </div>

        <div style={{ margin: '0 22px 20px' }}>
          <CatchUpCard project="Space Rising" mission="→ Mission /007" time="now" text="Attached file: support-ask handoff.md" glyphColor="var(--violet-400)" />
        </div>

        <div style={{ display: 'flex', gap: 10, margin: '0 22px 10px' }}>
          <Button variant="secondary" full>Reviewed</Button>
          <Button variant="secondary" full>Open file</Button>
        </div>
        <div style={{ margin: '0 22px' }}>
          <Button variant="primary" size="lg" full>Open in chat</Button>
        </div>

        <div style={{ padding: '0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>All rooms</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>See all</span>
        </div>
        <div style={{ margin: '0 22px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden' }}>
          <RoomRow status="online" name="Elon" tag="AGENT" />
          <RoomRow status="working" name="Rex" tag="AGENT" />
          <RoomRow leading={FOLDER('var(--violet-400)')} name="Space Rising" count={28} />
        </div>
      </div>

      {/* Open: the side rail. Tapping the avatar at the top closes the menu. */}
      {menuOpen && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0 }}>
          <SideRail active="home" items={navItems} onMenu={() => setMenuOpen(false)} style={{ padding: 'calc(15px + env(safe-area-inset-top, 0px)) 0 calc(16px + env(safe-area-inset-bottom, 0px))' }} />
        </div>
      )}

      {/* Closed: a menu button bottom-right is the only chrome. Tapping it opens the rail. */}
      {!menuOpen && (
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{
          position: 'absolute', right: 18, bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
          width: 54, height: 54, borderRadius: 27, padding: 0,
          border: '1px solid rgba(255,255,255,.18)',
          background: 'rgba(18,20,26,.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 28px rgba(0,0,0,.5)', cursor: 'pointer',
        }}>{MENU_GLYPH}</button>
      )}
    </div>
  );
}
