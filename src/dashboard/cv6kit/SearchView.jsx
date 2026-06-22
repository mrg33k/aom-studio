import React from 'react';

/**
 * SearchView — CV6 global search (⌘K palette on desktop, full-screen on mobile).
 * STEP 2 SHELL: Static render of grouped results from SAMPLE_SEARCH.
 * Desktop renders dimmed app backdrop + centered palette card with search input + grouped results.
 * Mobile renders full-screen search view with search field at top + grouped results below.
 * No keyboard nav or real search logic; onQueryChange/onSelect/onClose props for future wiring.
 */

export function SearchView({
  isDesktop = false,
  query = '',
  results = {},
  onQueryChange,
  onSelect,
  onClose,
  activeTool = 'search',
  onNav,
  user = {},
  ...data
}) {
  const resultCount = Object.values(results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  const renderResultRow = (item, idx, groupKey) => {
    const isRoom = groupKey === 'rooms';
    const isMission = groupKey === 'missions';
    const isFile = groupKey === 'files';
    const isPerson = groupKey === 'people';

    if (isDesktop) {
      // Desktop: .sres (flex, align-center, gap:13px, padding:10px 14px, margin:0 8px, border-radius:11px)
      return (
        <div
          key={`${groupKey}-${idx}`}
          className="sres"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            padding: '10px 14px',
            margin: '0 8px',
            borderRadius: 11,
            cursor: 'pointer',
            background: idx === 0 ? 'var(--accent-weak)' : 'transparent',
            transition: 'background 0.15s ease',
          }}
          onClick={() => onSelect && onSelect(item, groupKey)}
        >
          {/* .sgly (width:36px, height:36px, border-radius:10px, display:flex, align-items:center, justify-content:center, flex:none) */}
          <div
            className="sgly"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              background: isRoom ? 'rgba(52,211,153,.2)' : isFile ? 'var(--chip)' : isPerson ? 'rgba(244,114,182,.18)' : 'var(--accent-weak)',
            }}
          >
            {isRoom ? (
              <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700 }}>
                {(item.initials || item.name || '??').substring(0, 2).toUpperCase()}
              </span>
            ) : isPerson ? (
              <span style={{ color: '#F8A8D0', fontSize: 12, fontWeight: 700 }}>
                {(item.initials || item.name || '??').substring(0, 2).toUpperCase()}
              </span>
            ) : isFile ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.2" />
              </svg>
            )}
          </div>

          {/* Flex container for title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* .stitle (font-size:14px, font-weight:600, color:var(--fg), white-space:nowrap, overflow:hidden, text-overflow:ellipsis) */}
            <div
              className="stitle"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--fg)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.title || item.name}
              {query && (
                <>
                  {' '}
                  <span
                    className="hl"
                    style={{
                      color: 'var(--accent)',
                      background: 'var(--accent-weak)',
                      borderRadius: 3,
                      padding: '0 2px',
                    }}
                  >
                    {query}
                  </span>
                </>
              )}
            </div>
            {/* .smeta (font-size:12px, color:var(--muted), margin-top:1px, white-space:nowrap, overflow:hidden, text-overflow:ellipsis) */}
            <div
              className="smeta"
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.meta}
            </div>
          </div>

          {/* Status or metadata right side */}
          {isRoom && item.isLive ? (
            <span
              className="astat is-live"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '.02em',
                padding: '3px 9px',
                borderRadius: 7,
                whiteSpace: 'nowrap',
                color: 'var(--success)',
                background: 'var(--success-weak)',
                flex: 'none',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flex: 'none' }}></span>
              LIVE
            </span>
          ) : isMission ? (
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--faint)',
                fontFamily: 'var(--font-mono)',
                flex: 'none',
              }}
            >
              {item.tag || '/007'}
            </span>
          ) : isFile ? (
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--faint)',
                fontFamily: 'var(--font-mono)',
                flex: 'none',
              }}
            >
              {item.size}
            </span>
          ) : null}
        </div>
      );
    } else {
      // Mobile: .mres (display:flex, align-items:center, gap:12px, padding:11px 16px, border-bottom:1px solid var(--divider))
      return (
        <div
          key={`${groupKey}-${idx}`}
          className="mres"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 16px',
            borderBottom: '1px solid var(--divider)',
            cursor: 'pointer',
          }}
          onClick={() => onSelect && onSelect(item, groupKey)}
        >
          {/* .sgly */}
          <div
            className="sgly"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              background: isRoom ? 'rgba(52,211,153,.2)' : isFile ? 'var(--chip)' : isPerson ? 'rgba(244,114,182,.18)' : 'var(--accent-weak)',
            }}
          >
            {isRoom ? (
              <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700 }}>
                {(item.initials || item.name || '??').substring(0, 2).toUpperCase()}
              </span>
            ) : isPerson ? (
              <span style={{ color: '#F8A8D0', fontSize: 12, fontWeight: 700 }}>
                {(item.initials || item.name || '??').substring(0, 2).toUpperCase()}
              </span>
            ) : isFile ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.2" />
              </svg>
            )}
          </div>

          {/* Flex container for title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="stitle"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--fg)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.title || item.name}
              {query && (
                <>
                  {' '}
                  <span
                    className="hl"
                    style={{
                      color: 'var(--accent)',
                      background: 'var(--accent-weak)',
                      borderRadius: 3,
                      padding: '0 2px',
                    }}
                  >
                    {query}
                  </span>
                </>
              )}
            </div>
            <div
              className="smeta"
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.meta}
            </div>
          </div>

          {/* Status dot on mobile (right side) */}
          {isRoom && item.isLive && (
            <span
              className="sdot is-live"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flex: 'none',
                display: 'inline-block',
                background: 'var(--success)',
                boxShadow: 'var(--glow-online)',
                animation: 'statPulse 1.7s infinite',
              }}
            ></span>
          )}
        </div>
      );
    }
  };

  const groups = [
    { key: 'rooms', label: 'Rooms', items: results.rooms || [] },
    { key: 'missions', label: 'Missions', items: results.missions || [] },
    { key: 'files', label: 'Files', items: results.files || [] },
    { key: 'people', label: 'People', items: results.people || [] },
  ];

  if (isDesktop) {
    // Desktop: ⌘K palette over dimmed app
    return (
      <div
        data-cv6kit
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 96,
        }}
      >
        {/* Dimmed app backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(4,6,9,.55)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
          onClick={onClose}
        ></div>

        {/* Palette card */}
        <div
          style={{
            position: 'relative',
            zIndex: 1000,
            width: 680,
            maxHeight: 600,
            background: 'var(--surface)',
            border: '1px solid var(--hair)',
            borderRadius: 18,
            boxShadow: '0 40px 90px -24px rgba(0,0,0,.7)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search input header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '18px 20px',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange && onQueryChange(e.target.value)}
              placeholder="Search rooms, missions, files, people..."
              style={{
                flex: 1,
                fontSize: 18,
                color: 'var(--fg)',
                fontWeight: 500,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              autoFocus
            />
            <span
              className="astat is-ready"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '.02em',
                padding: '3px 9px',
                borderRadius: 7,
                whiteSpace: 'nowrap',
                color: 'var(--muted)',
                background: 'var(--chip)',
              }}
            >
              {resultCount} results
            </span>
          </div>

          {/* Results groups (scrollable) */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '6px 0',
            }}
          >
            {groups.map((group) => (
              <div key={group.key}>
                {group.items.length > 0 && (
                  <>
                    {/* .sgrp (display:flex, align-items:center, gap:8px, padding:12px 18px 6px) */}
                    <div
                      className="sgrp"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 18px 6px',
                      }}
                    >
                      <span
                        className="eyebrow"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                        }}
                      >
                        {group.label}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--faint)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {group.items.length}
                      </span>
                    </div>
                    {/* Result rows */}
                    {group.items.map((item, idx) => renderResultRow(item, idx, group.key))}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Keyboard hints footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '11px 18px',
              borderTop: '1px solid var(--divider)',
              background: 'var(--surface-2)',
              fontSize: '11.5px',
              color: 'var(--faint)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span
              className="kbd-row"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span
                className="kbd"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 6,
                  border: '1px solid var(--hair)',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ↑
              </span>
              <span
                className="kbd"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 6,
                  border: '1px solid var(--hair)',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ↓
              </span>
              navigate
            </span>
            <span
              className="kbd-row"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span
                className="kbd"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 6,
                  border: '1px solid var(--hair)',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ↵
              </span>
              open
            </span>
            <span
              className="kbd-row"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span
                className="kbd"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 6,
                  border: '1px solid var(--hair)',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                →
              </span>
              quick reply
            </span>
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span
                className="kbd"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 6,
                  border: '1px solid var(--hair)',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                esc
              </span>
              close
            </span>
          </div>
        </div>
      </div>
    );
  } else {
    // Mobile: full-screen search with status bar + search field + results
    return (
      <div
        data-cv6kit
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--ground)',
        }}
      >
        {/* Search input bar (safe-area top — real device clock shows through) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 10px',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              height: 42,
              padding: '0 13px',
              borderRadius: 12,
              background: 'var(--surface-2)',
              border: '1px solid var(--hair)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange && onQueryChange(e.target.value)}
              placeholder="resolver"
              style={{
                flex: 1,
                fontSize: '14.5px',
                color: 'var(--fg)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              autoFocus
            />
            {query && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            )}
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--accent)',
              flex: 'none',
              cursor: 'pointer',
            }}
            onClick={onClose}
          >
            Cancel
          </span>
        </div>

        {/* Results groups (scrollable) */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
          }}
        >
          {groups.map((group) => (
            <div key={group.key}>
              {group.items.length > 0 && (
                <>
                  {/* Group header */}
                  <div
                    className="sgrp"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 18px 6px',
                    }}
                  >
                    <span
                      className="eyebrow"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                      }}
                    >
                      {group.label}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--faint)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {group.items.length}
                    </span>
                  </div>
                  {/* Result rows */}
                  {group.items.map((item, idx) => renderResultRow(item, idx, group.key))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
}

// Sample grouped search results for mock render
export const SAMPLE_SEARCH = {
  query: 'resolver',
  rooms: [
    {
      name: 'Elon · resolver patch',
      initials: 'EL',
      meta: 'Agent · live · last message 2m ago',
      isLive: true,
      type: 'room',
    },
    {
      name: 'Space Rising',
      meta: 'Project · mentions in 3 missions',
      type: 'room',
    },
  ],
  missions: [
    {
      title: 'Repo resolver drops docs-only projects',
      meta: 'CV6-142 · High · Elon · step 3 of 4',
      tag: '/007',
      type: 'mission',
    },
  ],
  files: [
    {
      title: 'resolver.ts',
      meta: 'Corner CV6 · Dashboard · edited 34m ago',
      size: '',
      type: 'file',
    },
    {
      title: 'resolver-diagram.png',
      meta: 'Corner CV6 · Dashboard · 240 KB',
      size: '',
      type: 'file',
    },
  ],
  people: [
    {
      name: 'Dana Whitfield',
      initials: 'DW',
      meta: 'Acme · raised the resolver ask',
      type: 'person',
    },
  ],
};
