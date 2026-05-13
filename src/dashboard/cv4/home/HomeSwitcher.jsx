// CV4 HomeView switcher — pill picker top-right of the home pane.
// URL ?home=v1|v2|v3 reads/writes the variant; localStorage persists it.
//
// Three directions:
//   V1 — Editorial Briefing  (refined, restrained, NYT-briefing energy)
//   V2 — Newspaper Front     (display masthead, lead story, multi-column)
//   V3 — Terminal Briefing   (mono dense ops console)

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cv4-home-variant'
const VARIANTS = [
  { key: 'v1', label: 'V1', name: 'Editorial' },
  { key: 'v2', label: 'V2', name: 'Newspaper' },
  { key: 'v3', label: 'V3', name: 'Terminal' },
]

export function useHomeVariant() {
  const [variant, setVariant] = useState(() => {
    if (typeof window === 'undefined') return 'v1'
    const url = new URLSearchParams(window.location.search).get('home')
    if (url && VARIANTS.some((v) => v.key === url)) return url
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && VARIANTS.some((v) => v.key === stored)) return stored
    return 'v1'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, variant)
    const url = new URL(window.location.href)
    if (url.searchParams.get('home') !== variant) {
      url.searchParams.set('home', variant)
      window.history.replaceState({}, '', url.toString())
    }
  }, [variant])

  return [variant, setVariant]
}

export default function HomeSwitcher({ variant, onChange }) {
  return (
    <div className="cv4-home-switcher" data-testid="cv4-home-switcher">
      {VARIANTS.map((v) => (
        <button
          key={v.key}
          className="cv4-home-switcher__pill"
          data-active={variant === v.key ? 'true' : 'false'}
          onClick={() => onChange(v.key)}
          aria-label={`Switch to ${v.name} home view`}
        >
          <span className="cv4-home-switcher__pill-label">{v.label}</span>
          <span className="cv4-home-switcher__pill-name">{v.name}</span>
        </button>
      ))}
    </div>
  )
}
