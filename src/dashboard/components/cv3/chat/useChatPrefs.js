// useChatPrefs -- user preference slice: favorites, muted agents, hidden
// agents, and the collapsible-section open/closed map. Reads from Supabase
// via /api/dashboard/preferences on mount and writes back on every toggle.
// Extracted from ChatPanel.jsx (R2b split).
import { useCallback, useEffect, useState } from 'react'
import { getClientId } from '../../../lib/clientConfig.js'
import { authFetch } from '../../../lib/authFetch.js'

export default function useChatPrefs({ worldId }) {
  // Supabase-backed favorites / muted / hidden lists
  const [favorites, setFavorites] = useState([])
  const [mutedSlugs, setMutedSlugs] = useState([])
  const [hiddenSlugs, setHiddenSlugs] = useState([])
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  // Collapsible section states (Favorites / Agents / Projects)
  const [sectionStates, setSectionStates] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aom_section_states'))
      // Force agents/projects open (v2 default change). Old localStorage may have false.
      if (saved && typeof saved === 'object') return { ...saved, favorites: true, agents: true, projects: true }
    } catch {}
    return { favorites: true, agents: true, projects: true }
  })
  const toggleSection = useCallback((key) => {
    setSectionStates(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('aom_section_states', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const savePref = useCallback((key, value) => {
    const cid = worldId || getClientId() || 'aom'
    authFetch('/api/dashboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, client_id: cid, value }),
    }).catch(() => {})
  }, [worldId])

  useEffect(() => {
    const cid = worldId || getClientId()
    if (!cid) return
    const loadPrefs = async () => {
      try {
        const [favRes, mutedRes, hiddenRes] = await Promise.all([
          authFetch(`/api/dashboard/preferences?key=aom_favorites&client=${cid}`).then(r => r.json()),
          authFetch(`/api/dashboard/preferences?key=aom_muted&client=${cid}`).then(r => r.json()),
          authFetch(`/api/dashboard/preferences?key=corner-hidden-slugs&client=${cid}`).then(r => r.json()),
        ])
        if (favRes.value) setFavorites(favRes.value)
        if (mutedRes.value) setMutedSlugs(mutedRes.value)
        if (hiddenRes.value) setHiddenSlugs(hiddenRes.value)
      } catch {}
      setPrefsLoaded(true)
    }
    loadPrefs()
  }, [worldId])

  const isFav = useCallback((type, slug) => favorites.some(f => f.type === type && f.slug === slug), [favorites])
  const isMuted = useCallback((slug) => mutedSlugs.includes(slug), [mutedSlugs])
  const isHidden = useCallback((slug) => hiddenSlugs.includes(slug), [hiddenSlugs])
  const toggleFav = useCallback((type, slug) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.type === type && f.slug === slug)
      const next = exists ? prev.filter(f => !(f.type === type && f.slug === slug)) : [...prev, { type, slug }]
      savePref('aom_favorites', next)
      return next
    })
  }, [savePref])
  const toggleMute = useCallback((slug) => {
    setMutedSlugs(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
      savePref('aom_muted', next)
      return next
    })
  }, [savePref])
  const toggleHidden = useCallback((slug) => {
    setHiddenSlugs(prev => {
      const next = prev.includes(slug) ? prev : [...prev, slug]
      savePref('corner-hidden-slugs', next)
      return next
    })
  }, [savePref])

  return {
    favorites, setFavorites,
    mutedSlugs, setMutedSlugs,
    hiddenSlugs, setHiddenSlugs,
    prefsLoaded,
    sectionStates, toggleSection,
    savePref,
    isFav, isMuted, isHidden,
    toggleFav, toggleMute, toggleHidden,
  }
}
