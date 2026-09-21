import React from 'react'

// /v4 shows the actual Claude Design "Home - Full Site v4" file, running its own
// runtime from public/home-v4/. This is the exact design (intro animation,
// questionnaire, cases, contact) — not a rebuild. Content for it currently lives
// in public/home-v4/index.html; the next step is to lift that copy into an
// editable content file + in-dashboard editor.
export default function HomeV4() {
  return (
    <iframe
      title="Ahead of Market — Home v4"
      src="/home-v4/index.html"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, background: '#060606' }}
    />
  )
}
