// CV4 HomeView — router for the three variants (V1/V2/V3).
//
// R-CV4-5 (2026-05-12): Patrik asked for mobile-first + 1:1 data parity with
// /dashboard + a switcher so we can pick between directions. Three variants
// live under ./home/. URL ?home=v1|v2|v3 drives selection. Defaults V1.
//
// Mounted as ChatPanel's `cv4HomeView` slot via CornerNav.

import HomeSwitcher, { useHomeVariant } from './home/HomeSwitcher.jsx'
import HomeViewV1 from './home/HomeViewV1.jsx'
import HomeViewV2 from './home/HomeViewV2.jsx'
import HomeViewV3 from './home/HomeViewV3.jsx'
import './home/home.css'

export default function HomeView() {
  const [variant, setVariant] = useHomeVariant()

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <HomeSwitcher variant={variant} onChange={setVariant} />
      {variant === 'v2' && <HomeViewV2 />}
      {variant === 'v3' && <HomeViewV3 />}
      {(!variant || variant === 'v1') && <HomeViewV1 />}
    </div>
  )
}
