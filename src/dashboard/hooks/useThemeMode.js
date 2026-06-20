import { useEffect, useState, useCallback } from 'react'

// Single source of truth for the dashboard's light/dark theme.
//
// Reads + writes the same `cv4-theme` localStorage key + `<html
// data-theme>` attribute that CornerV4's existing moon toggle has been
// using since the original CV4 cutover. Adds an Arizona time-of-day
// auto-seed: if the user has never manually flipped the theme,
// `useThemeMode` chooses light during the daylight window (06:30–19:30
// MST, no DST) and dark otherwise.
//
// Manual toggles call `setTheme('light' | 'dark')` which writes the
// `cv4-theme-user-set` flag so future loads keep the locked choice.
// Clearing the override (clearOverride / cycleOverride) reverts to the
// clock.

const KEY_THEME = 'cv4-theme'
const KEY_USER_SET = 'cv4-theme-user-set'
const KEY_GLASS_INDEX = 'cv4-glass-index'
// How many glass backdrops there are. Keep in sync with CORNER_GLASS_BACKDROPS
// in cv4/GlassBackdrop.jsx.
export const GLASS_BACKDROP_COUNT = 11
// One uniform dark-frosted glass card style (2026-06-18, Patrik: "listen to the
// design" — the design is a single translucent dark-frosted glass, no white
// light-card variant). The cycle is one stop per backdrop photo; the card style
// is always 'dark'. (Was 2×backdrops with an alternating light/dark card style,
// which left some panels light and some dark on the same screen.)
export const GLASS_VARIANT_COUNT = GLASS_BACKDROP_COUNT
const AZ_OFFSET_MINUTES = -7 * 60
const LIGHT_START_MIN = 6 * 60 + 30
const LIGHT_END_MIN   = 19 * 60 + 30

function readGlassIndex() {
  if (typeof window === 'undefined') return 0
  try {
    const n = parseInt(window.localStorage?.getItem(KEY_GLASS_INDEX) ?? '0', 10)
    return Number.isFinite(n) && n >= 0 && n < GLASS_VARIANT_COUNT ? n : 0
  } catch { return 0 }
}

function arizonaMinutesNow() {
  const now = new Date()
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes()
  return (utcMin + AZ_OFFSET_MINUTES + 24 * 60) % (24 * 60)
}

function arizonaModeNow() {
  const m = arizonaMinutesNow()
  return m >= LIGHT_START_MIN && m < LIGHT_END_MIN ? 'light' : 'dark'
}

function readStored() {
  if (typeof window === 'undefined') return { theme: 'dark', userSet: false }
  try {
    const userSet = window.localStorage?.getItem(KEY_USER_SET) === '1'
    const theme = window.localStorage?.getItem(KEY_THEME)
    if (userSet && (theme === 'light' || theme === 'dark' || theme === 'glass')) return { theme, userSet: true }
    return { theme: theme === 'light' ? 'light' : 'dark', userSet: false }
  } catch {
    return { theme: 'dark', userSet: false }
  }
}

function resolve({ theme, userSet }) {
  if (userSet && (theme === 'light' || theme === 'dark' || theme === 'glass')) return theme
  // Auto-seed only ever picks light/dark — glass is opt-in (user cycles into it).
  return arizonaModeNow()
}

function syncDom(mode, glassCard) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  // data-glass-card drives whether the frosted cards are light or dark glass.
  if (mode === 'glass') root.setAttribute('data-glass-card', glassCard)
  else root.removeAttribute('data-glass-card')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const color = mode === 'light' ? '#F6F2E9'
      : mode === 'glass' ? (glassCard === 'light' ? '#E9ECF5' : '#0B0D12')
      : '#06090F'
    meta.setAttribute('content', color)
  }
}

// One stop per backdrop photo (1:1 now that the light-card style is retired).
function backdropOf(glassIndex) { return glassIndex % GLASS_BACKDROP_COUNT }
// Uniform dark-frosted glass (2026-06-18, Patrik). Light-card variant retired.
function cardStyleOf() { return 'dark' }

export function useThemeMode() {
  const [stored, setStored] = useState(readStored)
  const [mode, setMode] = useState(() => resolve(readStored()))
  // Which glass backdrop is showing (0..GLASS_BACKDROP_COUNT-1). The toggle
  // steps this on each click while in glass mode, then rolls over to light.
  const [glassIndex, setGlassIndexState] = useState(readGlassIndex)

  useEffect(() => {
    setMode(resolve(stored))
    if (stored.userSet) return
    // Auto window: re-check every minute so the theme flips at 06:30 and
    // 19:30 even if the tab stays open all day.
    let id = null
    const tick = () => {
      setMode(arizonaModeNow())
      id = window.setTimeout(tick, 60 * 1000)
    }
    id = window.setTimeout(tick, 60 * 1000)
    return () => { if (id) window.clearTimeout(id) }
  }, [stored])

  useEffect(() => { syncDom(mode, cardStyleOf(glassIndex)) }, [mode, glassIndex])

  // Sync across handlers: storage events fire for cross-tab changes; the
  // `cv4-theme-changed` custom event covers in-tab changes from the
  // CornerV4 moon toggle (which writes localStorage directly).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onChange = () => { setStored(readStored()); setGlassIndexState(readGlassIndex()) }
    window.addEventListener('storage', onChange)
    window.addEventListener('cv4-theme-changed', onChange)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener('cv4-theme-changed', onChange)
    }
  }, [])

  const setTheme = useCallback((next) => {
    if (next !== 'light' && next !== 'dark' && next !== 'glass') return
    try {
      window.localStorage?.setItem(KEY_THEME, next)
      window.localStorage?.setItem(KEY_USER_SET, '1')
    } catch { /* ignore */ }
    setStored({ theme: next, userSet: true })
    setMode(next)
    window.dispatchEvent(new Event('cv4-theme-changed'))
  }, [])

  const clearOverride = useCallback(() => {
    try {
      window.localStorage?.removeItem(KEY_USER_SET)
    } catch { /* ignore */ }
    const next = arizonaModeNow()
    setStored({ theme: next, userSet: false })
    setMode(next)
    window.dispatchEvent(new Event('cv4-theme-changed'))
  }, [])

  const setGlassIndex = useCallback((i) => {
    const idx = ((i % GLASS_VARIANT_COUNT) + GLASS_VARIANT_COUNT) % GLASS_VARIANT_COUNT
    try { window.localStorage?.setItem(KEY_GLASS_INDEX, String(idx)) } catch { /* ignore */ }
    setGlassIndexState(idx)
    window.dispatchEvent(new Event('cv4-theme-changed'))
  }, [])

  // Cycle the toggle through the full theme library:
  //   light → dark → glass[0..N-1] → light.
  // Each glass step is one backdrop photo (uniform dark-frosted card style).
  // Backdrops do NOT auto-drift; each crystal-ball click steps once, and after
  // the last photo it rolls over to light.
  const cycleTheme = useCallback(() => {
    if (mode === 'light') { setTheme('dark'); return }
    if (mode === 'dark') { setGlassIndex(0); setTheme('glass'); return }
    // mode === 'glass' — step to the next combo, or roll over to light.
    if (glassIndex < GLASS_VARIANT_COUNT - 1) { setGlassIndex(glassIndex + 1); return }
    setGlassIndex(0)
    setTheme('light')
  }, [mode, glassIndex, setTheme, setGlassIndex])

  // Legacy: light → dark → auto (kept for any caller still on the 2-mode model).
  const cycleOverride = useCallback(() => {
    if (!stored.userSet) { setTheme('light'); return }
    if (mode === 'light') { setTheme('dark'); return }
    if (mode === 'dark') { setTheme('glass'); return }
    clearOverride()
  }, [stored.userSet, mode, setTheme, clearOverride])

  const override = stored.userSet ? mode : 'auto'
  const backdropIndex = backdropOf(glassIndex)
  const glassCard = cardStyleOf(glassIndex)

  return {
    mode,
    override,
    isLight: mode === 'light',
    isGlass: mode === 'glass',
    glassIndex,
    glassVariantCount: GLASS_VARIANT_COUNT,
    backdropIndex,
    backdropCount: GLASS_BACKDROP_COUNT,
    glassCard,           // 'dark' | 'light'
    setGlassIndex,
    setTheme,
    setOverride: setTheme,
    clearOverride,
    cycleTheme,
    cycleOverride,
  }
}
