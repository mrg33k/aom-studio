// CV4 HomeView switcher — pill picker top-right of the home pane.
// URL ?home=v1|v2|v3 reads/writes the variant; localStorage persists it.
//
// R-CV4-6 — Editorial × Terminal hybrids:
//   V1 — Letter    (editorial-leaning; italic serif + mono accents)
//   V2 — Briefing  (balanced; terminal frames around italic-serif labels)
//   V3 — Console   (terminal-leaning; one big editorial lead headline)

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cv4-home-variant'
const VARIANTS = [
  { key: 'v1', label: 'V1', name: 'Letter' },
  { key: 'v2', label: 'V2', name: 'Briefing' },
  { key: 'v3', label: 'V3', name: 'Console' },
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
