import React, { useState } from 'react';

/**
 * MobileMenu — Discord-style slide-in navigation drawer for mobile.
 *
 * Structure:
 *  - FAB (bottom-right): hamburger icon + profile avatar with accent dot. Tapping opens the drawer.
 *  - Open drawer: full-height side nav with avatar at top, tools (Home, Chat, Organize,
 *    Review, Support, Tracker, Command, Live Scribe), theme toggle, notifications, search.
 *  - No bottom bar; the menu slides in from the right, pushing content left.
 *
 * Props:
 *  - open (bool): drawer open state
 *  - onToggle (fn): fired when FAB is tapped; parent manages the state
 *  - onNav (fn): fired on tool selection: onNav(key)
 *  - activeKey (string): current active tool key (e.g. 'home', 'chat')
 *  - user (object): { initials, name, statusDot } for the profile avatar
 */
export function MobileMenu({ open = false, onToggle, onNav, activeKey = 'home', user = {} }) {
  const { initials = 'P', statusDot = 'online' } = user;

  // Icons for the 8 tools
  const I = {
    home: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7" />
        <path d="M5 9.8V20h14V9.8" />
      </svg>
    ),
    chat: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" />
      </svg>
    ),
    organize: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4 3 8l9 4 9-4-9-4Z" />
        <path d="m3 12 9 4 9-4" />
      </svg>
    ),
    review: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    ),
    support: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </svg>
    ),
    tracker: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    ),
    command: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3Z" />
        <path d="M9 11h6M9 15h6" />
      </svg>
    ),
    livescribe: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  };

  const toolItems = [
    { key: 'home', label: 'Home', icon: I.home },
    { key: 'chat', label: 'Chat', icon: I.chat },
    { key: 'organize', label: 'Organize', icon: I.organize },
    { key: 'review', label: 'Review', icon: I.review },
  ];

  const utilItems = [
    { key: 'support', label: 'Support', icon: I.support },
    { key: 'tracker', label: 'Tracker', icon: I.tracker },
  ];

  const commandItems = [
    { key: 'command', label: 'Command', icon: I.command },
    { key: 'livescribe', label: 'Live Scribe', icon: I.livescribe },
  ];

  const statusColor = statusDot === 'online' ? 'var(--success)' : 'var(--warn)';

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Overlay (when drawer is open) */}
      {open && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 4,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Drawer (slides in from right) */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 72,
          zIndex: 5,
          background: 'var(--nav, rgba(8, 11, 15, 0.55))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--divider)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: `calc(15px + env(safe-area-inset-top, 0px)) 0 calc(16px + env(safe-area-inset-bottom, 0px))`,
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Avatar at top (closes menu on tap) */}
        <button
          onClick={onToggle}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--avatar)',
            border: 'none',
            boxShadow: '0 0 0 2px var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            flex: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="Close menu"
        >
          {initials}
        </button>

        {/* Divider */}
        <div
          style={{
            width: 40,
            height: '1.5px',
            borderRadius: 1,
            background: 'rgba(255, 255, 255, 0.28)',
            flex: 'none',
            marginTop: 15,
          }}
        />

        {/* Nav items */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            padding: '6px 0',
          }}
        >
          {/* Primary tools */}
          {toolItems.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              onNav={onNav}
            />
          ))}

          {/* Divider between tool groups */}
          <div
            style={{
              width: 40,
              height: '1.5px',
              borderRadius: 1,
              background: 'rgba(255, 255, 255, 0.28)',
              flex: 'none',
            }}
          />

          {/* Utility tools */}
          {utilItems.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              onNav={onNav}
            />
          ))}

          {/* Command tools */}
          {commandItems.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              onNav={onNav}
            />
          ))}
        </div>

        {/* Divider before utilities */}
        <div
          style={{
            width: 40,
            height: '1.5px',
            borderRadius: 1,
            background: 'rgba(255, 255, 255, 0.28)',
            flex: 'none',
            marginBottom: 14,
          }}
        />

        {/* Utility buttons at bottom */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
            flex: 'none',
          }}
        >
          {/* Theme toggle */}
          <button
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 19,
              background: 'var(--chip)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Toggle theme"
            onClick={() => {}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 3a9 9 0 1 0 9 9c-5 0-9-4-9-9Z" />
            </svg>
          </button>

          {/* Notifications */}
          <button
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 19,
              background: 'var(--chip)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Notifications"
            onClick={() => {}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {/* Notification badge */}
            <span
              style={{
                position: 'absolute',
                top: 7,
                right: 9,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                border: '1.5px solid #0a0e13',
              }}
            />
          </button>

          {/* Search */}
          <button
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 19,
              background: 'var(--chip)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Search"
            onClick={() => {}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* FAB (hamburger + profile) — visible when drawer is closed */}
      {!open && (
        <button
          onClick={onToggle}
          aria-label="Open menu"
          style={{
            position: 'absolute',
            right: 18,
            bottom: `calc(18px + env(safe-area-inset-bottom, 0px))`,
            zIndex: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 56,
            padding: '0 9px 0 18px',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: 28,
            background: 'rgba(13, 17, 23, 0.72)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.7)',
            cursor: 'pointer',
          }}
        >
          {/* Hamburger lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <i style={{ display: 'block', width: 20, height: 2, borderRadius: 2, background: 'var(--fg)' }} />
            <i style={{ display: 'block', width: 14, height: 2, borderRadius: 2, background: 'var(--fg)' }} />
            <i style={{ display: 'block', width: 20, height: 2, borderRadius: 2, background: 'var(--fg)' }} />
          </div>

          {/* Profile avatar with status dot */}
          <div
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--avatar)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              flex: 'none',
            }}
          >
            {initials}
            {/* Accent dot at top-right */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: 'var(--accent)',
                border: '2.5px solid #0d1117',
              }}
            />
          </div>
        </button>
      )}
    </div>
  );
}

/**
 * NavItem — a single tool in the side nav
 */
function NavItem({ item, isActive, onNav }) {
  return (
    <button
      onClick={() => onNav && onNav(item.key)}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
      aria-label={item.label}
    >
      {/* Active indicator line (left edge) */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 19,
            transform: 'translateY(-50%)',
            width: 4,
            height: 24,
            borderRadius: '4px 0 0 4px',
            background: 'var(--fg)',
          }}
        />
      )}

      {/* Icon square */}
      <div
        style={{
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive ? '#fff' : 'var(--muted)',
          background: isActive ? 'var(--accent)' : 'var(--chip)',
          borderRadius: isActive ? 13 : 19,
          transition: 'all 0.2s ease',
        }}
      >
        {item.icon}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: isActive ? 'var(--accent)' : 'var(--muted)',
          transition: 'color 0.2s ease',
        }}
      >
        {item.label}
      </span>
    </button>
  );
}
