/* CV6 NotificationPrompt — reusable permission-request modal + mobile sheet.
   Design: corner/missions/corner-ui-cv6/deliverables/design-system-2026-06-21/
   guidelines/pattern-notifications.html

   Says WHY before the OS permission prompt fires: title + reasons list + Allow / Not now.
   Desktop = centered modal over dim backdrop; Mobile = bottom sheet (safe-area-inset-bottom).

   Props: { open, isDesktop, onAllow, onDismiss }
   - open: boolean — render when true
   - isDesktop: boolean — modal layout if true, bottom sheet if false
   - onAllow: fn — called when user taps Allow; also requests Notification permission
   - onDismiss: fn — called when user taps Not now or backdrop
*/

export function NotificationPrompt({ open, isDesktop, onAllow, onDismiss }) {
  if (!open) return null;

  const handleAllow = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        onAllow(result);
      } catch (err) {
        console.error('Notification permission error:', err);
        onAllow('error');
      }
    } else {
      onAllow('unavailable');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  };

  const reasons = [
    {
      title: 'Something needs you',
      desc: 'A decision only you can make'
    },
    {
      title: 'A goal is blocked',
      desc: 'An agent stopped and is waiting'
    },
    {
      title: 'An agent finished',
      desc: 'A goal or step completed'
    }
  ];

  if (isDesktop) {
    return (
      <div
        data-cv6kit
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(4, 6, 9, 0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
        onClick={handleBackdropClick}
      >
        <div
          style={{
            width: '420px',
            maxWidth: 'calc(100vw - 48px)',
            borderRadius: 'var(--radius-card)',
            background: 'var(--surface)',
            border: '1px solid var(--hair)',
            boxShadow: 'var(--shadow-window)',
            overflow: 'hidden',
          }}
        >
          {/* header */}
          <div
            style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--fg)',
              }}
            >
              Enable notifications
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--muted)',
                marginTop: '4px',
              }}
            >
              Stay in the loop as your agents work
            </div>
          </div>

          {/* reasons list */}
          <div style={{ padding: '16px 24px 20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: '12px',
              }}
            >
              We reach out when
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {reasons.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '11px',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginTop: '5px',
                      flex: 'none',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--fg)',
                      }}
                    >
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        marginTop: '2px',
                        lineHeight: '1.4',
                      }}
                    >
                      {r.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* buttons */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              padding: '0 24px 24px',
            }}
          >
            <button
              onClick={onDismiss}
              style={{
                flex: 1,
                height: '38px',
                padding: '0 14px',
                borderRadius: 'var(--radius-button)',
                border: '1px solid var(--hair)',
                background: 'var(--surface-2)',
                color: 'var(--fg)',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--chip)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--surface-2)';
              }}
            >
              Not now
            </button>
            <button
              onClick={handleAllow}
              style={{
                flex: 1,
                height: '38px',
                padding: '0 14px',
                borderRadius: 'var(--radius-button)',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={(e) => {
                e.target.style.opacity = '0.9';
              }}
              onMouseOut={(e) => {
                e.target.style.opacity = '1';
              }}
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    // Mobile bottom sheet
    return (
      <div
        data-cv6kit
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(4, 6, 9, 0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
        onClick={handleBackdropClick}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
          }}
        />
        <div
          style={{
            width: '100%',
            borderRadius: '24px 24px 0 0',
            background: 'var(--surface)',
            border: '1px solid var(--hair)',
            borderBottom: 'none',
            boxShadow: 'var(--shadow-window)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* handle / drag indicator */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '11px',
              paddingBottom: '4px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--faint)',
              }}
            />
          </div>

          {/* header */}
          <div
            style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <div
              style={{
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--fg)',
              }}
            >
              Enable notifications
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                marginTop: '3px',
              }}
            >
              Stay in the loop as your agents work
            </div>
          </div>

          {/* reasons list */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: '12px',
              }}
            >
              We reach out when
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              {reasons.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginTop: '4px',
                      flex: 'none',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--fg)',
                      }}
                    >
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        marginTop: '1px',
                        lineHeight: '1.4',
                      }}
                    >
                      {r.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '16px 20px 0',
              borderTop: '1px solid var(--divider)',
            }}
          >
            <button
              onClick={handleAllow}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: 'var(--radius-button)',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                width: '100%',
              }}
              onMouseOver={(e) => {
                e.target.style.opacity = '0.9';
              }}
              onMouseOut={(e) => {
                e.target.style.opacity = '1';
              }}
            >
              Allow
            </button>
            <button
              onClick={onDismiss}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: 'var(--radius-button)',
                border: '1px solid var(--hair)',
                background: 'var(--surface-2)',
                color: 'var(--fg)',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                width: '100%',
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--chip)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--surface-2)';
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }
}
