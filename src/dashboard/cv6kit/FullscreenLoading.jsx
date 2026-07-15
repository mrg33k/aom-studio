import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './kit.css';

const DEFAULT_TIMEOUT_MS = 10000;
const THEMES = new Set(['dark', 'light', 'glass']);

function persistedTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage?.getItem('cv6-theme');
    return THEMES.has(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
}

function useWatchdog(active, timeoutMs) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!active) {
      setExpired(false);
      return undefined;
    }
    setExpired(false);
    const timer = window.setTimeout(() => setExpired(true), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [active, timeoutMs]);

  return expired;
}

export function FullscreenLoading({
  label = 'Preparing your workspace',
  delayedLabel = 'Still working',
  delayedDetail = 'This is taking longer than expected. Corner will show the real state as soon as it settles.',
  theme,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  active = true,
  className = '',
  inline = false,
  compact = false,
}) {
  const ref = useRef(null);
  const [inheritedTheme, setInheritedTheme] = useState(() => persistedTheme());
  const delayed = useWatchdog(active, timeoutMs);
  const resolvedTheme = theme || inheritedTheme;
  const rootClass = [
    'cv6-logo-loader',
    inline ? 'is-inline' : 'is-fullscreen',
    compact ? 'is-compact' : '',
    delayed ? 'is-delayed' : '',
    className,
  ].filter(Boolean).join(' ');

  useLayoutEffect(() => {
    const boot = document.getElementById('cv6-boot-loader');
    if (boot) boot.remove();
    document.documentElement.removeAttribute('data-cv6-boot');
  }, []);

  useEffect(() => {
    if (theme) return undefined;
    const root = ref.current;
    if (!root) return undefined;
    // The loader itself carries data-theme for token scoping, so start above it.
    // data-app-theme is the live shell flip and must win over a screen's baked
    // data-theme="dark" attribute.
    const host = root.parentElement?.closest('[data-app-theme]')
      || root.parentElement?.closest('[data-theme]')
      || document.documentElement;
    const readTheme = () => {
      const next = host?.getAttribute('data-app-theme') || host?.getAttribute('data-theme') || persistedTheme();
      setInheritedTheme(next);
    };
    readTheme();
    if (!host || typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(readTheme);
    observer.observe(host, { attributes: true, attributeFilter: ['data-app-theme', 'data-theme'] });
    return () => observer.disconnect();
  }, [theme]);

  if (!active) return null;

  return (
    <div
      ref={ref}
      data-cv6kit
      data-theme={resolvedTheme}
      data-cv6-logo-loader
      data-loading={active ? 'true' : 'false'}
      className={rootClass}
      role="status"
      aria-live="polite"
      aria-label={delayed ? delayedLabel : label}
    >
      <div className="cv6-logo-loader__inner">
        <CornerLoaderMark compact={compact} />
        <div className="cv6-logo-loader__label">{delayed ? delayedLabel : label}</div>
        {delayed && <div className="cv6-logo-loader__detail">{delayedDetail}</div>}
      </div>
    </div>
  );
}

export function CornerLoaderMark({ compact = false, className = '' }) {
  return (
    <span
      className={['cv6-logo-loader__mark', compact ? 'is-glyph' : '', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <span className="cv6-logo-loader__base" />
      <span className="cv6-logo-loader__fill" />
    </span>
  );
}

export const CornerLogoLoader = FullscreenLoading;

export default FullscreenLoading;
