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
const AZ_OFFSET_MINUTES = -7 * 60
const LIGHT_START_MIN = 6 * 60 + 30
const LIGHT_END_MIN   = 19 * 60 + 30

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
    if (userSet && (theme === 'light' || theme === 'dark')) return { theme, userSet: true }
    return { theme: theme === 'light' ? 'light' : 'dark', userSet: false }
  } catch {
    return { theme: 'dark', userSet: false }
  }
}

function resolve({ theme, userSet }) {
  if (userSet && (theme === 'light' || theme === 'dark')) return theme
  return arizonaModeNow()
}

function syncDom(mode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', mode)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', mode === 'light' ? '#F6F2E9' : '#06090F')
}

export function useThemeMode() {
  const [stored, setStored] = useState(readStored)
  const [mode, setMode] = useState(() => resolve(readStored()))

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

  useEffect(() => { syncDom(mode) }, [mode])

  // Sync across handlers: storage events fire for cross-tab changes; the
  // `cv4-theme-changed` custom event covers in-tab changes from the
  // CornerV4 moon toggle (which writes localStorage directly).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onChange = () => setStored(readStored())
    window.addEventListener('storage', onChange)
    window.addEventListener('cv4-theme-changed', onChange)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener('cv4-theme-changed', onChange)
    }
  }, [])

  const setTheme = useCallback((next) => {
    if (next !== 'light' && next !== 'dark') return
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

  const cycleOverride = useCallback(() => {
    if (!stored.userSet) { setTheme('light'); return }
    if (mode === 'light') { setTheme('dark'); return }
    clearOverride()
  }, [stored.userSet, mode, setTheme, clearOverride])

  const override = stored.userSet ? mode : 'auto'

  return {
    mode,
    override,
    isLight: mode === 'light',
    setTheme,
    setOverride: setTheme,
    clearOverride,
    cycleOverride,
  }
}
