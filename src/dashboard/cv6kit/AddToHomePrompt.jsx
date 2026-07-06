/**
 * AddToHomePrompt — web-to-app install nudge
 *
 * A slim top banner that appears occasionally when the app is NOT running standalone,
 * plus an iOS Share -> Add to Home Screen instruction sheet (bottom sheet).
 *
 * Props:
 *   onInstalled: callback when the app is successfully installed (Android beforeinstallprompt)
 *   onDismiss: callback when the user dismisses the prompt
 *
 * Behavior:
 *   - On mount, detect if running standalone (window.matchMedia or navigator.standalone).
 *     If yes, render nothing.
 *   - On Android/Chrome, listen for beforeinstallprompt, stash the event.
 *     The Add button calls deferredPrompt.prompt() and fires onInstalled on acceptance.
 *   - On iOS Safari, detect /iphone|ipad|ipod/i and show the bottom sheet instead
 *     (iOS has no install API, only manual Share > Add to Home Screen).
 *   - Dismissal is persisted in localStorage (cv6-a2hs-dismissed) so the banner
 *     does not nag after the user closes it.
 *   - All window API access is guarded for SSR safety.
 */

import { memo, useState, useEffect, useRef } from 'react';

export const AddToHomePrompt = memo(function AddToHomePrompt({
  onInstalled,
  onDismiss,
}) {
  // Guard for SSR
  if (typeof window === 'undefined') {
    return null;
  }

  const [isVisible, setIsVisible] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const deferredPromptRef = useRef(null);

  // Detect standalone mode on mount
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    // If already standalone, don't show anything
    if (isStandalone) {
      return;
    }

    // Desktop gets no install banner: Chrome fires beforeinstallprompt on desktop too,
    // and the banner was covering the top nav at 1440 (loop R3). Home-screen install
    // is a touch-device concern — require a coarse pointer or a narrow viewport.
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 900px)').matches;
    if (!isTouchDevice) {
      return;
    }

    // Check localStorage for previous dismissal
    const isDismissed = localStorage.getItem('cv6-a2hs-dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // Detect iOS Safari
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isIOS) {
      // iOS: show the bottom sheet with manual instructions
      setShowIosSheet(true);
      setIsVisible(true);
    } else {
      // Android/Chrome: listen for beforeinstallprompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        deferredPromptRef.current = e;
        setIsVisible(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('cv6-a2hs-dismissed', 'true');
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleAdd = async () => {
    if (showIosSheet) {
      // iOS: just close the instruction sheet and mark as dismissed
      handleDismiss();
      return;
    }

    // Android: trigger the install prompt
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === 'accepted') {
        setIsVisible(false);
        deferredPromptRef.current = null;
        if (onInstalled) {
          onInstalled();
        }
      }
      // If 'dismissed', the prompt stays visible for another try
    }
  };

  if (!isVisible) {
    return null;
  }

  // iOS instruction sheet (bottom sheet)
  if (showIosSheet) {
    return (
      <div data-cv6kit style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
        {/* Scrim */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 49,
          }}
          onClick={handleDismiss}
          aria-hidden
        />

        {/* Bottom sheet */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--ground)',
            borderTop: '1px solid var(--hair)',
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 -16px 40px -8px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Close button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '12px',
            }}
          >
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '20px',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--fg)',
            }}
          >
            Add Corner to Home Screen
          </h3>

          {/* Instructions */}
          <div
            style={{
              fontSize: '14px',
              color: 'var(--muted)',
              lineHeight: 1.5,
              marginBottom: '20px',
            }}
          >
            <p style={{ margin: '0 0 12px 0' }}>
              Get faster access to Corner as an app on your home screen.
            </p>

            <ol
              style={{
                margin: 0,
                paddingLeft: '20px',
                color: 'var(--muted)',
              }}
            >
              <li style={{ marginBottom: '8px' }}>
                Tap the <strong>Share</strong> icon at the bottom of your screen
              </li>
              <li style={{ marginBottom: '8px' }}>
                Scroll down and tap <strong>Add to Home Screen</strong>
              </li>
              <li>Tap <strong>Add</strong> to confirm</li>
            </ol>
          </div>

          {/* Action button */}
          <button
            onClick={handleAdd}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '11px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  // Android top banner
  return (
    <div data-cv6kit style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '56px',
          padding: '0 16px',
          paddingTop: 'env(safe-area-inset-top)',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--hair)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Text */}
        <div
          style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--fg)',
            lineHeight: 1.3,
          }}
        >
          Add Corner to your home screen
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          style={{
            height: '36px',
            padding: '0 14px',
            borderRadius: '9px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Add
        </button>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            background: 'var(--surface-2)',
            color: 'var(--muted)',
            border: '1px solid var(--hair)',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            fontFamily: 'var(--font-sans)',
            flexShrink: 0,
            padding: 0,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
});

AddToHomePrompt.displayName = 'AddToHomePrompt';
