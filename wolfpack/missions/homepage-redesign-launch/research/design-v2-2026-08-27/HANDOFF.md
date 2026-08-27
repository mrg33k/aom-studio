# Wolfpack site v2 — build-out handoff

Source of truth: the `.dc.html` files in this project. Original live site for copy reference: `original.html` + the `wolfpack-site/` folder.

## 1. Templates → pages
Apply the matching template to every page of its type. Do not invent new layouts.

| Template file | Use for |
|---|---|
| `Wolfpack Evolution B v2.dc.html` | Homepage only (includes brand intro loader — homepage only) |
| `Hydro Jetting.dc.html` | ALL service pages: hydro-jetting, drain-cleaning, air-compressor, backflow-testing, water-heaters, leak-detection, emergency. Swap hero copy, before/afters, steps per the original page's copy — copy is verbatim from `wolfpack-site/<service>/index.html`, never rewritten |
| `Services.dc.html` | services overview |
| `Property Managers.dc.html` | property-managers |
| `General Contractors.dc.html` | general-contractors |
| `Scottsdale.dc.html` | ALL 15 city pages (phoenix, scottsdale, tempe, mesa, chandler, gilbert, glendale, peoria, surprise, goodyear, avondale, paradise-valley, apache-junction, litchfield-park, san-tan-valley). Swap city name + hero copy from each original city page |
| `Wolf Header.dc.html` / `Wolf Footer.dc.html` | Shared on every page. Header owns: nav, services quick-links bar, theme toggle (persists via localStorage `wp-v2-theme`), mobile burger + sheet, and the contact drawer (opens from any `href="#contact"`) |

## 2. Non-negotiables
- Nav wording and link structure are CLIENT-APPROVED: Home / Services (8-item dropdown) / Property Managers / General Contractors / Contact, plus the stacked `602-550-5452 / 24/7 Emergency` CTA and the 8-label services bar. Never reword; only restyle.
- All copy comes verbatim from the original pages. No invented client names, stats, or testimonials.
- Every primary CTA ("Request a walkthrough" etc.) links to `#contact` (opens the drawer). Phone CTAs stay `tel:6025505452`.
- Fill in the currently-dead `#` links (drain-cleaning, air-compressor, backflow, water-heaters, leak-detection, emergency, contact, city links) as those pages get built.

## 3. Images (already on this machine, in `uploads/`)
Prefer these new branded/service shots over the old `assets/work-*.jpg` anywhere a working/service shot is needed:
- Hydro jetting: `01-hydro-jetting-v2-brand.png` (homepage hero, current), `01-hydro-jetting-v3-brand.png` (service hero), `01-hydro-jetting-a`, `02-b`, `03-c`, `04-d`
- Drain & camera: `05/06/07-drain-camera-*` · Air compressor: `08/09` · Maintenance: `10/11` · Backflow: `12/13` · Water heaters/boilers: `14/15/16` · Leak detection: `17/18` · Emergency: `19/20`
- GC portfolio photos: `assets/gc/*.jpg` (mapped in `General Contractors.dc.html`)
- Pipe before/afters: `assets/pipe-*.jpg` — keep, they are real results
- Testimonial slider images are stand-ins; replace with real Target/Ritz/Edison location shots or logos when available

## 4. Mobile-first rules (already applied — replicate exactly on new pages)
- Container padding `0 clamp(20px,4vw,48px)`; section padding `clamp(64px,10vw,120px) 0`
- Grids: `repeat(auto-fit, minmax(min(100%,<240–400>px), 1fr))` — never fixed column counts
- Stat bands: `display:flex;flex-wrap:wrap` with `flex:1 1 <min>px` cells
- Type: `clamp()` on all display sizes; body text ≥15px; nothing under 12px
- Header: wordmark hides <1100px; burger + sheet menu <860px; services bar horizontally scrollable on phones
- Tap targets ≥44px; `prefers-reduced-motion` disables all animation (loader included)

## 5. Brand intro loader
Pure CSS stinger (blue burst → white circle → wolf slam → wordmark → collapse), ~2.5s, homepage only, assets `assets/loader-mark.png` + `assets/loader-word.png`. Full animation source lives in `uploads/Logo animation stinger designs/` if a video export is ever needed.

## 6. Theme
Dark is default. Light mode via header toggle; both themes are driven by the CSS variables in each page's `:root[data-theme=...]` block — copy that block unchanged to new pages.
