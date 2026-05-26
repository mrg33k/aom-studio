// useDefaultView — per-user "what loads first when you open the dashboard" setting.
// Default = 'home' (the brutalist welcome + agent/project chooser at corner:home-screen).
// User can override via the command menu ("Make default room") to land in a specific
// agent or project room instead. Reset from the top-right settings menu.
//
// Mission: corner:home-screen R1.
// Storage: localStorage, keyed by user id so multiple users on one device don't collide.

import { useCallback, useEffect, useState } from 'react'

const KEY_PREFIX = 'cv4_default_view_'

function read(userId) {
  if (!userId) return { kind: 'home' }
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    if (!raw) return { kind: 'home' }
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.kind) return { kind: 'home' }
    return parsed
  } catch (_) { return { kind: 'home' } }
}

function write(userId, value) {
  if (!userId) return
  try {
    if (!value || value.kind === 'home') {
      localStorage.removeItem(KEY_PREFIX + userId)
    } else {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(value))
    }
  } catch (_) {}
}

export function useDefaultView(userId) {
  const [defaultView, setDefaultViewState] = useState(() => read(userId))

  useEffect(() => {
    setDefaultViewState(read(userId))
  }, [userId])

  const setDefaultView = useCallback((value) => {
    write(userId, value)
    setDefaultViewState(value || { kind: 'home' })
  }, [userId])

  const resetToHome = useCallback(() => {
    write(userId, null)
    setDefaultViewState({ kind: 'home' })
  }, [userId])

  return { defaultView, setDefaultView, resetToHome }
}
