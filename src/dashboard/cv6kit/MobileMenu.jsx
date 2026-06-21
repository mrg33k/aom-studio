import React from 'react';

/**
 * SideRail — the mobile side nav (72px wide, right edge, always-on).
 *
 * The design shows the rail as a fixed right-edge nav with 8 tools grouped in 3 sections,
 * a profile avatar at top, dividers, and utility buttons (theme, notifications, search) at bottom.
 * This is the OPEN state; the parent (CornerVG) controls the FAB visibility + overlay.
 *
 * Props:
 *  - open (bool): rail visible
 *  - onNav (fn): fired on tool selection: onNav(key)
 *  - activeKey (string): current active tool key
 *  - user (object): { initials } for avatar
 *  - agents (array): agents list (placeholder for future)
 *  - projects (array): projects list (placeholder for future)
 */
export function SideRail({
  open = true,
  onNav,
  activeKey = 'home',
  user = {},
  agents = [],
  projects = [],
}) {
  const { initials = 'P' } = user;

  // Icon SVGs — exact from design, no modifications
  const icons = {
    home: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 9.8V20h14V9.8"/></svg>,
    chat: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z"/></svg>,
    organize: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 3 8l9 4 9-4-9-4Z"/><path d="m3 12 9 4 9-4"/></svg>,
    review: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>,
    support: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>,
    tracker: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>,
    command: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3Z"/><path d="M9 11h6M9 15h6"/></svg>,
    scribe: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
  };

  // Eight tools in three groups: Home+Chat+Organize+Review | Support+Tracker | Command+Scribe
  const toolGroups = [
    [
      { key: 'home', label: 'Home', icon: icons.home },
      { key: 'chat', label: 'Chat', icon: icons.chat },
      { key: 'organize', label: 'Organize', icon: icons.organize },
      { key: 'review', label: 'Review', icon: icons.review },
    ],
    [
      { key: 'support', label: 'Support', icon: icons.support },
      { key: 'tracker', label: 'Tracker', icon: icons.tracker },
    ],
    [
      { key: 'command', label: 'Command', icon: icons.command },
      { key: 'scribe', label: 'Scribe', icon: icons.scribe },
    ],
  ];

  return (
    <div
      className="rail"
      style={{
        position: 'absolute',
        right: 0,
        top: 54,
        bottom: 0,
        width: 72,
        zIndex: 5,
        background: 'var(--nav, rgba(8, 11, 15, 0.55))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        borderLeft: '1px solid var(--divider)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `15px 0 16px`,
        visibility: open ? 'visible' : 'hidden',
      }}
    >
      {/* Profile avatar at top */}
      <button
        onClick={() => onNav && onNav('profile')}
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
          margin: 0,
        }}
        className="av"
        aria-label="Profile"
      >
        {initials}
      </button>

      {/* Divider */}
      <div
        className="rdiv"
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
        className="rnav"
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
        {toolGroups.map((group, groupIdx) => (
          <React.Fragment key={groupIdx}>
            {group.map((tool) => (
              <ToolItem key={tool.key} tool={tool} isActive={activeKey === tool.key} onNav={onNav} />
            ))}
            {groupIdx < toolGroups.length - 1 && (
              <div
                className="rdiv"
                style={{
                  width: 40,
                  height: '1.5px',
                  borderRadius: 1,
                  background: 'rgba(255, 255, 255, 0.28)',
                  flex: 'none',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Divider before utilities */}
      <div
        className="rdiv"
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
        className="util"
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
          className="ub"
          onClick={() => onNav && onNav('theme')}
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
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 3a9 9 0 1 0 9 9c-5 0-9-4-9-9Z" />
          </svg>
        </button>

        {/* Notifications */}
        <button
          className="ub"
          onClick={() => onNav && onNav('notifications')}
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
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
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

        {/* Search / Command palette */}
        <button
          className="ub"
          onClick={() => onNav && onNav('search')}
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
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * ToolItem — a single tool tile in the rail
 */
function ToolItem({ tool, isActive, onNav }) {
  return (
    <button
      onClick={() => onNav && onNav(tool.key)}
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
        margin: 0,
      }}
      className="ri"
      aria-label={tool.label}
    >
      {/* Active indicator line (right edge) */}
      {isActive && (
        <div
          className="ind"
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 4,
            height: 24,
            borderRadius: '4px 0 0 4px',
            background: 'var(--fg)',
          }}
        />
      )}

      {/* Icon square — morphs radius on active */}
      <div
        className="rsq"
        style={{
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive ? '#fff' : 'var(--muted)',
          background: isActive ? 'var(--accent)' : 'var(--chip)',
          borderRadius: isActive ? 13 : 19,
          transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {tool.icon}
      </div>

      {/* Label */}
      <span
        className="rl"
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: isActive ? 'var(--accent)' : 'var(--muted)',
          transition: 'color 0.2s ease',
        }}
      >
        {tool.label}
      </span>
    </button>
  );
}
