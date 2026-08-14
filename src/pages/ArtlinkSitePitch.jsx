import React from 'react'

const CSS = `
  @import url("https://use.typekit.net/ipx2tgl.css");
  @import url('https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,700&display=swap');

  .asp-page { box-sizing: border-box; }
  .asp-page *, .asp-page *::before, .asp-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .asp-root {
    --al-red: #CD2127;
    --al-black: #0A0A0A;
    --al-white: #FFFFFF;
    --al-gray: #1A1A1A;
    --al-light: #F5F0EB;
    --al-rule: rgba(10, 10, 10, 0.08);
    --al-rule-dark: rgba(255, 255, 255, 0.10);
    --al-font: "neutraface-2", "Futura", "Avenir Next", "Jost", "Helvetica Neue", system-ui, sans-serif;
    font-family: var(--al-font);
    font-weight: 300;
    color: var(--al-black);
    background: var(--al-white);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .asp-root img { max-width: 100%; height: auto; display: block; }

  /* ─── SHARED ─────────────────────────────────────────────────── */
  .asp-eyebrow {
    font-family: var(--al-font);
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.30em;
    text-transform: uppercase;
    color: rgba(10,10,10,0.40);
    margin-bottom: 20px;
  }
  .asp-eyebrow.asp-light { color: rgba(255,255,255,0.45); }
  .asp-eyebrow.asp-red   { color: var(--al-red); }

  .asp-root h1 {
    font-family: var(--al-font);
    font-weight: 700;
    font-size: clamp(52px, 9vw, 120px);
    line-height: 0.90;
    letter-spacing: -0.02em;
  }
  .asp-root h2 {
    font-family: var(--al-font);
    font-weight: 700;
    font-size: clamp(36px, 5.5vw, 72px);
    line-height: 0.95;
    letter-spacing: -0.02em;
  }
  .asp-root h3 {
    font-family: var(--al-font);
    font-weight: 700;
    font-size: clamp(22px, 3vw, 32px);
    line-height: 1.05;
    letter-spacing: -0.01em;
  }
  .asp-root p {
    font-weight: 300;
    font-size: 18px;
    line-height: 1.65;
    max-width: 60ch;
  }
  .asp-root p + p { margin-top: 16px; }

  .asp-wrap {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 64px;
  }

  /* ─── STICKY NAV ─────────────────────────────────────────────── */
  .asp-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10,10,10,0.92);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .asp-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 64px;
    max-width: 1280px;
    margin: 0 auto;
  }
  .asp-nav-brand {
    color: var(--al-white);
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    text-decoration: none;
  }
  .asp-nav-brand .asp-thin { font-weight: 300; }
  .asp-nav-brand .asp-dot { color: var(--al-red); margin: 0 6px; }
  .asp-nav-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.40);
  }
  .asp-nav-links { display: flex; gap: 32px; list-style: none; }
  .asp-nav-links a {
    color: rgba(255,255,255,0.55);
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    transition: color 0.2s;
  }
  .asp-nav-links a:hover { color: var(--al-red); }

  /* ─── ARC LABELS ─────────────────────────────────────────────── */
  .asp-arc-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--al-red);
    margin-bottom: 40px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .asp-arc-label::after {
    content: '';
    display: block;
    height: 1px;
    width: 64px;
    background: var(--al-red);
    opacity: 0.5;
  }

  /* ─── ARC 1: BRAND OPENER ────────────────────────────────────── */

  /* Splash */
  .asp-splash {
    height: 100vh;
    min-height: 600px;
    background-image: url('/artlink-pitch/hero-brand-architecture.png');
    background-size: cover;
    background-position: center 40%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .asp-splash::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.62);
  }
  .asp-splash-inner {
    position: relative;
    text-align: center;
    padding: 0 40px;
  }
  .asp-splash-kicker {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    margin-bottom: 48px;
  }
  .asp-splash-logo {
    width: clamp(200px, 32vw, 480px);
    margin: 0 auto 56px;
    display: block;
  }
  .asp-splash-headline {
    font-size: clamp(14px, 1.6vw, 22px);
    font-weight: 300;
    letter-spacing: 0.04em;
    color: rgba(255,255,255,0.80);
    max-width: 46ch;
    margin: 0 auto 40px;
  }
  .asp-splash-scroll {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.30);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .asp-splash-scroll::before {
    content: '';
    display: block;
    width: 1px;
    height: 48px;
    background: rgba(255,255,255,0.20);
  }

  /* Brand: Mark */
  .asp-brand-mark {
    background: var(--al-black);
    padding: 160px 0;
    text-align: center;
  }
  .asp-brand-mark-logo {
    width: clamp(240px, 40vw, 560px);
    margin: 0 auto 80px;
  }
  .asp-brand-mark-body {
    font-size: 20px;
    font-weight: 300;
    color: rgba(255,255,255,0.65);
    max-width: 52ch;
    margin: 0 auto;
    line-height: 1.7;
  }

  /* Brand: Color */
  .asp-brand-color {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 72vh;
  }
  .asp-color-slab {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 80px 72px;
  }
  .asp-color-slab.asp-red-slab  { background: var(--al-red); }
  .asp-color-slab.asp-black-slab { background: var(--al-black); }
  .asp-color-name {
    font-weight: 700;
    font-size: clamp(48px, 7vw, 96px);
    letter-spacing: -0.02em;
    line-height: 0.9;
    color: rgba(255,255,255,0.92);
    margin-bottom: 40px;
  }
  .asp-color-specs {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 8px 20px;
    font-size: 13px;
    color: rgba(255,255,255,0.55);
  }
  .asp-color-specs dt {
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-size: 10px;
    padding-top: 3px;
    color: rgba(255,255,255,0.35);
  }
  .asp-color-specs dd {
    color: rgba(255,255,255,0.78);
    font-weight: 400;
    font-feature-settings: "tnum";
  }

  /* Brand: Typography */
  .asp-brand-type {
    background: var(--al-white);
    padding: 140px 0 120px;
  }
  .asp-type-giant {
    margin-top: 80px;
    padding: 64px 0 48px;
    border-top: 1px solid var(--al-rule);
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 48px;
    align-items: end;
  }
  .asp-type-meta {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: rgba(10,10,10,0.40);
    line-height: 2.0;
    padding-bottom: 8px;
  }
  .asp-type-spec-bold {
    font-weight: 700;
    font-size: clamp(64px, 10vw, 144px);
    letter-spacing: -0.02em;
    line-height: 0.88;
    font-family: var(--al-font);
  }
  .asp-type-spec-light {
    font-weight: 300;
    font-size: clamp(64px, 10vw, 144px);
    letter-spacing: 0.01em;
    line-height: 0.88;
    font-family: var(--al-font);
  }
  .asp-type-abc {
    margin-top: 16px;
    font-size: 14px;
    color: rgba(10,10,10,0.35);
    letter-spacing: 0.06em;
    font-family: var(--al-font);
    line-height: 2.0;
  }
  .asp-type-note {
    margin-top: 20px;
    font-size: 16px;
    font-weight: 300;
    color: rgba(10,10,10,0.60);
    max-width: 54ch;
    line-height: 1.7;
  }

  /* Brand: Lockup Variants */
  .asp-brand-lockups {
    background: var(--al-light);
    padding: 120px 0;
  }
  .asp-lockup-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-top: 72px;
  }
  .asp-lockup-card {
    overflow: hidden;
  }
  .asp-lockup-frame {
    aspect-ratio: 4 / 3;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
  }
  .asp-lockup-frame.asp-lf-white  { background: #FFFFFF; }
  .asp-lockup-frame.asp-lf-black  { background: var(--al-black); }
  .asp-lockup-frame.asp-lf-red    { background: var(--al-red); }
  .asp-lockup-frame img { max-width: 75%; max-height: 80%; width: auto; }
  .asp-lockup-caption {
    padding: 16px 20px;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 500;
    color: rgba(10,10,10,0.45);
    background: var(--al-white);
    border-top: 1px solid var(--al-rule);
  }

  /* ─── ARC 2: REIMAGINED HOMEPAGE ─────────────────────────────── */

  /* Homepage hero */
  .asp-hp-hero {
    height: 100vh;
    min-height: 700px;
    background-image: url('/artlink-pitch/homepage-hero.png');
    background-size: cover;
    background-position: center 55%;
    position: relative;
    display: flex;
    align-items: flex-end;
  }
  .asp-hp-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top,
      rgba(0,0,0,0.85) 0%,
      rgba(0,0,0,0.30) 55%,
      rgba(0,0,0,0.10) 100%);
  }
  .asp-hp-hero-inner {
    position: relative;
    width: 100%;
    padding: 80px 80px 100px;
    max-width: 1280px;
    margin: 0 auto;
  }
  .asp-hp-logo-small {
    width: 180px;
    margin-bottom: 48px;
    display: block;
  }
  .asp-hp-hero-headline {
    color: var(--al-white);
    font-size: clamp(56px, 9vw, 128px);
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 0.88;
    margin-bottom: 32px;
    max-width: 12ch;
  }
  .asp-hp-hero-sub {
    font-size: 20px;
    font-weight: 300;
    color: rgba(255,255,255,0.78);
    max-width: 42ch;
    line-height: 1.6;
    margin-bottom: 48px;
  }
  .asp-hp-hero-tags {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .asp-hp-hero-tag {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    padding: 10px 20px;
    border: 1px solid rgba(255,255,255,0.22);
  }

  /* Homepage programs */
  .asp-hp-programs {
    background: var(--al-black);
    padding: 0;
    position: relative;
    overflow: hidden;
  }
  .asp-programs-bg {
    position: absolute;
    inset: 0;
    background-image: url('/artlink-pitch/programs-gallery.png');
    background-size: cover;
    background-position: center;
    opacity: 0.18;
  }
  .asp-programs-inner {
    position: relative;
    padding: 120px 0;
  }
  .asp-programs-header {
    margin-bottom: 72px;
  }
  .asp-programs-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }
  .asp-program-card {
    background: rgba(255,255,255,0.04);
    padding: 40px 36px 48px;
    border-top: 2px solid transparent;
    transition: border-color 0.25s, background 0.25s;
  }
  .asp-program-card:hover {
    background: rgba(255,255,255,0.08);
    border-top-color: var(--al-red);
  }
  .asp-program-card:hover .asp-program-num { color: var(--al-red); }
  .asp-program-num {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.25em;
    color: rgba(255,255,255,0.25);
    margin-bottom: 24px;
    transition: color 0.25s;
  }
  .asp-program-name {
    font-weight: 700;
    font-size: 22px;
    letter-spacing: -0.01em;
    color: var(--al-white);
    margin-bottom: 16px;
    line-height: 1.1;
    font-family: var(--al-font);
  }
  .asp-program-desc {
    font-size: 15px;
    font-weight: 300;
    color: rgba(255,255,255,0.55);
    line-height: 1.65;
    max-width: 30ch;
  }

  /* Homepage stats / artinerary */
  .asp-hp-stats {
    background: var(--al-white);
    padding: 140px 0;
    border-bottom: 1px solid var(--al-rule);
  }
  .asp-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    margin-top: 80px;
    border-left: 1px solid var(--al-rule);
  }
  .asp-stat-block {
    padding: 48px 56px;
    border-right: 1px solid var(--al-rule);
    border-bottom: 1px solid var(--al-rule);
  }
  .asp-stat-num {
    font-weight: 700;
    font-size: clamp(48px, 6vw, 80px);
    letter-spacing: -0.02em;
    line-height: 0.9;
    color: var(--al-black);
    margin-bottom: 16px;
    font-family: var(--al-font);
  }
  .asp-stat-num .asp-stat-red { color: var(--al-red); }
  .asp-stat-label {
    font-size: 13px;
    font-weight: 300;
    color: rgba(10,10,10,0.50);
    line-height: 1.6;
    max-width: 22ch;
  }

  /* Homepage footer preview */
  .asp-hp-footer-preview {
    background: var(--al-black);
    padding: 80px 0;
  }
  .asp-hpf-inner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 64px;
    flex-wrap: wrap;
  }
  .asp-hpf-logo {
    width: 200px;
    margin-bottom: 24px;
  }
  .asp-hpf-tagline {
    font-size: 16px;
    font-weight: 300;
    color: rgba(255,255,255,0.50);
    max-width: 38ch;
    line-height: 1.7;
  }
  .asp-hpf-links {
    display: flex;
    flex-direction: column;
    gap: 12px;
    list-style: none;
    padding-top: 8px;
  }
  .asp-hpf-links a {
    font-size: 13px;
    font-weight: 400;
    color: rgba(255,255,255,0.40);
    text-decoration: none;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    transition: color 0.2s;
  }
  .asp-hpf-links a:hover { color: var(--al-red); }
  .asp-mockup-label {
    display: inline-block;
    background: var(--al-red);
    color: var(--al-white);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    padding: 6px 14px;
    margin-bottom: 40px;
  }

  /* ─── ARC 3: SOCIAL SYSTEM ───────────────────────────────────── */
  .asp-social {
    background: var(--al-light);
    padding: 140px 0;
  }
  .asp-social-intro {
    max-width: 600px;
    margin-bottom: 80px;
  }
  .asp-social-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  /* Instagram post mockup 1:1 */
  .asp-ig-post {
    position: relative;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: var(--al-black);
  }
  .asp-ig-post img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .asp-ig-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.42);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 28px;
  }
  .asp-ig-kicker {
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--al-red);
    margin-bottom: 10px;
  }
  .asp-ig-headline {
    font-weight: 700;
    font-size: 22px;
    letter-spacing: -0.01em;
    line-height: 1.0;
    color: var(--al-white);
    margin-bottom: 8px;
    font-family: var(--al-font);
  }
  .asp-ig-sub {
    font-size: 13px;
    font-weight: 300;
    color: rgba(255,255,255,0.65);
    line-height: 1.5;
  }
  /* Instagram story mockup 9:16 */
  .asp-ig-story {
    position: relative;
    grid-row: span 2;
    aspect-ratio: 9 / 16;
    overflow: hidden;
    background: var(--al-black);
  }
  .asp-ig-story img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .asp-ig-story-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom,
      rgba(0,0,0,0.20) 0%,
      rgba(0,0,0,0.0) 40%,
      rgba(0,0,0,0.70) 100%);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 36px 28px;
  }
  .asp-story-red-bar {
    width: 32px;
    height: 3px;
    background: var(--al-red);
    margin-bottom: 16px;
  }
  .asp-ig-story-headline {
    font-weight: 700;
    font-size: 28px;
    letter-spacing: -0.01em;
    line-height: 1.0;
    color: var(--al-white);
    margin-bottom: 12px;
    font-family: var(--al-font);
  }
  .asp-ig-story-sub {
    font-size: 13px;
    font-weight: 300;
    color: rgba(255,255,255,0.65);
    line-height: 1.5;
  }
  /* Text-only social post (dark) */
  .asp-ig-text-post {
    aspect-ratio: 1 / 1;
    background: var(--al-black);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 36px;
  }
  .asp-ig-text-post .asp-ig-text-headline {
    font-weight: 700;
    font-size: clamp(26px, 3.5vw, 40px);
    letter-spacing: -0.02em;
    line-height: 0.95;
    color: var(--al-white);
    margin-bottom: 20px;
    font-family: var(--al-font);
    max-width: 14ch;
  }
  .asp-ig-text-post .asp-ig-text-sub {
    font-size: 13px;
    font-weight: 300;
    color: rgba(255,255,255,0.50);
    line-height: 1.6;
    max-width: 22ch;
  }
  .asp-ig-text-post .asp-ig-text-logo {
    width: 120px;
    margin-bottom: 32px;
  }

  /* ─── ARC 4: BRAND APPLICATIONS ─────────────────────────────── */
  .asp-applications {
    background: var(--al-black);
    padding: 140px 0 0;
  }
  .asp-apps-intro {
    margin-bottom: 100px;
  }
  .asp-apps-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    align-items: stretch;
  }

  /* Event poster mockup */
  .asp-poster-frame {
    position: relative;
    background: var(--al-black);
    aspect-ratio: 2 / 3;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .asp-poster-frame img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .asp-poster-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top,
      rgba(0,0,0,0.90) 0%,
      rgba(0,0,0,0.45) 50%,
      rgba(0,0,0,0.10) 100%);
  }
  .asp-poster-content {
    position: relative;
    padding: 48px;
  }
  .asp-poster-red-rule {
    width: 48px;
    height: 3px;
    background: var(--al-red);
    margin-bottom: 24px;
  }
  .asp-poster-program {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--al-red);
    margin-bottom: 16px;
  }
  .asp-poster-title {
    font-weight: 700;
    font-size: clamp(32px, 4.5vw, 64px);
    letter-spacing: -0.015em;
    line-height: 0.92;
    color: var(--al-white);
    margin-bottom: 24px;
    font-family: var(--al-font);
  }
  .asp-poster-meta {
    font-size: 14px;
    font-weight: 300;
    color: rgba(255,255,255,0.55);
    line-height: 1.7;
  }
  .asp-poster-logo {
    width: 140px;
    margin-top: 40px;
    opacity: 0.75;
  }

  /* Billboard / Banner */
  .asp-billboard-frame {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 7;
  }
  .asp-billboard-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .asp-billboard-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: center;
    padding: 0 72px;
    gap: 80px;
  }
  .asp-billboard-text {}
  .asp-billboard-eyebrow {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--al-red);
    margin-bottom: 20px;
  }
  .asp-billboard-headline {
    font-weight: 700;
    font-size: clamp(36px, 5.5vw, 80px);
    letter-spacing: -0.02em;
    line-height: 0.90;
    color: var(--al-white);
    margin-bottom: 24px;
    font-family: var(--al-font);
  }
  .asp-billboard-sub {
    font-size: 16px;
    font-weight: 300;
    color: rgba(255,255,255,0.60);
    max-width: 36ch;
    line-height: 1.6;
  }
  .asp-billboard-logo-col {
    flex-shrink: 0;
  }
  .asp-billboard-logo {
    width: clamp(160px, 18vw, 280px);
    opacity: 0.85;
  }

  /* Poster description card */
  .asp-app-desc {
    padding: 64px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .asp-app-desc.asp-dark {
    background: rgba(255,255,255,0.04);
    border-left: 1px solid rgba(255,255,255,0.08);
  }

  /* ─── CLOSE / PITCH CTA ───────────────────────────────────────── */
  .asp-pitch-cta {
    background: var(--al-black);
    padding: 180px 0 160px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .asp-cta-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: end;
  }
  .asp-cta-headline {
    font-weight: 700;
    font-size: clamp(44px, 6.5vw, 96px);
    letter-spacing: -0.025em;
    line-height: 0.88;
    color: var(--al-white);
    font-family: var(--al-font);
  }
  .asp-cta-headline .asp-cta-red { color: var(--al-red); }
  .asp-cta-body {
    font-size: 18px;
    font-weight: 300;
    color: rgba(255,255,255,0.55);
    line-height: 1.7;
    margin-bottom: 48px;
    max-width: 48ch;
  }
  .asp-cta-contact {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--al-red);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid rgba(205,33,39,0.30);
    padding-bottom: 4px;
    transition: border-color 0.2s;
  }
  .asp-cta-contact:hover { border-color: var(--al-red); }

  /* Footer */
  .asp-footer {
    background: #050505;
    padding: 60px 0 40px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .asp-footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 24px;
  }
  .asp-footer-logo { width: 140px; opacity: 0.50; }
  .asp-footer-meta {
    font-size: 12px;
    font-weight: 300;
    color: rgba(255,255,255,0.25);
    letter-spacing: 0.06em;
    line-height: 1.8;
  }
  .asp-footer-aom {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.20);
  }
  .asp-footer-aom a {
    color: rgba(205,33,39,0.60);
    text-decoration: none;
    transition: color 0.2s;
  }
  .asp-footer-aom a:hover { color: var(--al-red); }

  /* ─── DIVIDER ─────────────────────────────────────────────────── */
  .asp-arc-divider {
    background: var(--al-red);
    height: 3px;
  }
  .asp-arc-divider-wide {
    background: var(--al-black);
    padding: 40px 0;
    text-align: center;
  }
  .asp-arc-divider-wide .asp-arc-divider-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.40em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.25);
  }

  /* ─── RESPONSIVE ──────────────────────────────────────────────── */
  @media (max-width: 900px) {
    .asp-nav-inner  { padding: 14px 24px; }
    .asp-nav-links  { display: none; }
    .asp-wrap       { padding: 0 28px; }
    .asp-brand-color { grid-template-columns: 1fr; }
    .asp-color-slab  { padding: 60px 36px; min-height: 40vh; }
    .asp-type-giant  { grid-template-columns: 1fr; }
    .asp-lockup-grid { grid-template-columns: 1fr 1fr; }
    .asp-programs-grid { grid-template-columns: 1fr 1fr; }
    .asp-stats-grid    { grid-template-columns: 1fr; }
    .asp-social-grid   { grid-template-columns: 1fr 1fr; }
    .asp-apps-row      { grid-template-columns: 1fr; }
    .asp-cta-inner     { grid-template-columns: 1fr; gap: 40px; }
    .asp-hpf-inner     { flex-direction: column; }
    .asp-hp-hero-inner { padding: 60px 28px 80px; }
    .asp-billboard-overlay { padding: 0 36px; gap: 32px; flex-wrap: wrap; align-items: flex-end; padding-bottom: 48px; }
  }
  @media (max-width: 600px) {
    .asp-programs-grid { grid-template-columns: 1fr; }
    .asp-lockup-grid   { grid-template-columns: 1fr; }
    .asp-social-grid   { grid-template-columns: 1fr; }
    .asp-ig-story      { grid-row: span 1; aspect-ratio: 1/1; }
  }
`

const PROGRAMS = [
  {
    num: '01',
    name: 'First Fridays',
    desc: 'Monthly art walk drawing 14,000–20,000 visitors to downtown Phoenix galleries and studios every first Friday. One of the largest in the United States.',
  },
  {
    num: '02',
    name: 'Art Detour',
 desc: 'Phoenix\'s original art walk, a month-long self-guided tour every March connecting galleries, studios, and businesses across the downtown arts districts.',
  },
  {
    num: '03',
    name: 'TAFF',
 desc: 'The Artist Forward Fund, three annual grants of $1,000 each to support artists in creating new exhibition concepts for the mood room.',
  },
  {
    num: '04',
    name: 'mood room',
    desc: 'A dedicated space by Artlink addressing the needs of 21st century artistic practice. Home to TAFF grant exhibitions and emerging artist platforms.',
  },
  {
    num: '05',
    name: 'In Residence',
 desc: 'Artist residency program across three downtown Phoenix properties, Portland on the Park, The Summit at Copper Square, and The Bower Willo.',
  },
  {
    num: '06',
    name: 'Art d\'Core Gala',
 desc: 'The Arts and Culture Party of the Year, Artlink\'s signature gala celebrating the arts community and the philanthropists who sustain it.',
  },
]

export default function ArtlinkSitePitch() {
  return (
    <div className="asp-page">
      <style>{CSS}</style>

      <div className="asp-root">

        {/* ── STICKY NAV ── */}
        <nav className="asp-nav">
          <div className="asp-nav-inner">
            <a className="asp-nav-brand" href="#brand">
              ART<span className="asp-thin">LINK</span>
              <span className="asp-dot">·</span>
              <span className="asp-thin" style={{ fontSize: 13 }}>AOM Pitch</span>
            </a>
            <ul className="asp-nav-links">
              <li><a href="#brand">Brand</a></li>
              <li><a href="#homepage">Homepage</a></li>
              <li><a href="#social">Social</a></li>
              <li><a href="#applications">Applications</a></li>
            </ul>
            <span className="asp-nav-label">Prepared by AOM · 2026</span>
          </div>
        </nav>

        {/* ═══════════════════════════════════════════════════════
            SPLASH — full-screen intro
        ═══════════════════════════════════════════════════════ */}
        <div className="asp-splash">
          <div className="asp-splash-inner">
 <div className="asp-splash-kicker">Artlink Phoenix, Brand Elevation Pitch</div>
            <img
              className="asp-splash-logo"
              src="/artlink/Artlink_Logo_Rev.png"
              alt="Artlink wordmark reversed on dark"
            />
            <div className="asp-splash-headline">
              The brand, at the level the work deserves.
            </div>
            <div className="asp-splash-scroll">Scroll to explore</div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ARC 1 — BRAND IN FULL
        ═══════════════════════════════════════════════════════ */}
        <div id="brand">
          <div className="asp-arc-divider-wide" style={{ background: 'var(--al-black)' }}>
 <div className="asp-arc-divider-label">Arc 01, Brand Standards</div>
          </div>

          {/* THE MARK */}
          <section className="asp-brand-mark">
            <div className="asp-wrap">
              <div className="asp-arc-label" style={{ color: 'var(--al-red)', justifyContent: 'center' }}>
                The Mark
              </div>
            </div>
            <img
              className="asp-brand-mark-logo"
              src="/artlink/Artlink_Logo_Rev.png"
              alt="Artlink primary reversed lockup"
            />
            <div className="asp-wrap">
              <p className="asp-brand-mark-body">
 One wordmark. A geometric sans-serif in two weights, Bold for "ART," Light for "LINK", held together by a single circular arc. That circle is the only ornamental gesture in the entire mark. It reads as connection. It says everything without explaining anything.
              </p>
            </div>
          </section>

          {/* COLOR SYSTEM */}
          <section className="asp-brand-color">
            <div className="asp-color-slab asp-red-slab">
              <div className="asp-color-name">Red.</div>
              <dl className="asp-color-specs">
                <dt>HEX</dt>  <dd>#CD2127</dd>
                <dt>RGB</dt>  <dd>205 · 33 · 39</dd>
                <dt>CMYK</dt> <dd>15 · 100 · 100 · 0</dd>
                <dt>Use</dt>  <dd>Single accent. Never decorative.</dd>
              </dl>
            </div>
            <div className="asp-color-slab asp-black-slab">
              <div className="asp-color-name">Black.</div>
              <dl className="asp-color-specs">
                <dt>HEX</dt>  <dd>#000000</dd>
                <dt>CMYK</dt> <dd>K · 100</dd>
                <dt>Use</dt>  <dd>Primary type, all lockup surfaces.</dd>
              </dl>
            </div>
          </section>

          {/* TYPOGRAPHY */}
          <section className="asp-brand-type">
            <div className="asp-wrap">
              <div className="asp-eyebrow">Typography</div>
              <h2>NeutraFace.</h2>
              <p style={{ marginTop: 24, maxWidth: '56ch' }}>
 Designed by Christian Schwartz. Rooted in Richard Neutra's mid-century architectural lettering, considered, upright, geometric. The mark uses Bold and Light as direct contrast. The brand uses only those two weights. No exceptions.
              </p>

              <div className="asp-type-giant">
 <div className="asp-type-meta">NeutraFace<br />Bold, Display</div>
                <div>
                  <div className="asp-type-spec-bold">ART</div>
                  <div className="asp-type-abc">ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789</div>
                </div>
              </div>

              <div className="asp-type-giant">
 <div className="asp-type-meta">NeutraFace<br />Light, Body</div>
                <div>
                  <div className="asp-type-spec-light">LINK</div>
                  <div className="asp-type-abc" style={{ fontWeight: 300 }}>abcdefghijklmnopqrstuvwxyz · 0123456789</div>
                  <p className="asp-type-note">
                    NeutraFace carries a mid-century sensibility: clean geometry, deliberate proportions, never fashionable. It was the obvious choice for a Phoenix arts organization. Richard Neutra built homes and civic structures across Arizona — his lettering belongs here.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* LOCKUP VARIANTS */}
          <section className="asp-brand-lockups">
            <div className="asp-wrap">
              <div className="asp-eyebrow">Lockup Variants</div>
              <h2>Five authorized lockups.</h2>
              <p style={{ marginTop: 24, maxWidth: '52ch' }}>
                Each variant is defined by its surface. The two-color default on white. The reverse for dark backgrounds. Single-color editions for one-ink applications. Every use case is covered.
              </p>

              <div className="asp-lockup-grid">
                <div className="asp-lockup-card">
                  <div className="asp-lockup-frame asp-lf-white">
                    <img src="/artlink/Artlink_Logo.png" alt="Default lockup" />
                  </div>
                  <div className="asp-lockup-caption">Default · Black + Red · Light</div>
                </div>

                <div className="asp-lockup-card">
                  <div className="asp-lockup-frame asp-lf-black">
                    <img src="/artlink/Artlink_Logo_Rev.png" alt="Reverse lockup" />
                  </div>
                  <div className="asp-lockup-caption">Reverse · White + Red · Dark</div>
                </div>

                <div className="asp-lockup-card">
                  <div className="asp-lockup-frame asp-lf-white">
                    <img
                      src="/artlink/Artlink_Logo.png"
                      alt="One-color black"
                      style={{ filter: 'grayscale(100%) contrast(120%)' }}
                    />
                  </div>
                  <div className="asp-lockup-caption">One-color · 100% Black</div>
                </div>

                <div className="asp-lockup-card">
                  <div className="asp-lockup-frame asp-lf-black">
                    <img
                      src="/artlink/Artlink_Logo_Rev.png"
                      alt="One-color white"
                      style={{ filter: 'grayscale(100%) brightness(2)' }}
                    />
                  </div>
                  <div className="asp-lockup-caption">One-color · 100% White</div>
                </div>

                <div className="asp-lockup-card">
                  <div className="asp-lockup-frame asp-lf-white">
                    <img
                      src="/artlink/Artlink_Logo.png"
                      alt="Watermark 30% black"
                      style={{ filter: 'grayscale(100%)', opacity: 0.30 }}
                    />
                  </div>
                  <div className="asp-lockup-caption">Watermark · 30% Black</div>
                </div>

                <div className="asp-lockup-card">
                  <div className="asp-lockup-frame asp-lf-black">
                    <img src="/artlink/Artlink_Logo_Rev_square.png" alt="Square reverse" />
                  </div>
                  <div className="asp-lockup-caption">Square · Reverse · Tight Crop</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ARC 2 — REIMAGINED HOMEPAGE
        ═══════════════════════════════════════════════════════ */}
        <div id="homepage">
          <div className="asp-arc-divider" />
          <div className="asp-arc-divider-wide">
 <div className="asp-arc-divider-label">Arc 02, Reimagined Homepage</div>
          </div>

          {/* HERO */}
          <section className="asp-hp-hero">
            <div className="asp-hp-hero-inner">
              <div className="asp-mockup-label">Homepage Concept · artlinkphx.org</div>
              <img
                className="asp-hp-logo-small"
                src="/artlink/Artlink_Logo_Rev.png"
                alt="Artlink"
              />
              <h1 className="asp-hp-hero-headline">
                Phoenix,<br />Connected.
              </h1>
              <p className="asp-hp-hero-sub">
                Artlink keeps the arts integral to our development by connecting artists, businesses, and the community.
              </p>
              <div className="asp-hp-hero-tags">
                <span className="asp-hp-hero-tag">First Fridays</span>
                <span className="asp-hp-hero-tag">Art Detour · March</span>
                <span className="asp-hp-hero-tag">TAFF Grants</span>
                <span className="asp-hp-hero-tag">Art d'Core Gala</span>
              </div>
            </div>
          </section>

          {/* PROGRAMS RAIL */}
          <section className="asp-hp-programs">
            <div className="asp-programs-bg" />
            <div className="asp-programs-inner">
              <div className="asp-wrap">
                <div className="asp-programs-header">
                  <div className="asp-eyebrow asp-light">Programs + Initiatives</div>
                  <h2 style={{ color: 'var(--al-white)' }}>
                    Six ways<br />art moves<br />Phoenix.
                  </h2>
                </div>
                <div className="asp-programs-grid">
                  {PROGRAMS.map(p => (
                    <div className="asp-program-card" key={p.num}>
                      <div className="asp-program-num">{p.num}</div>
                      <div className="asp-program-name">{p.name}</div>
                      <div className="asp-program-desc">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* STATS / ARTINERARY */}
          <section className="asp-hp-stats">
            <div className="asp-wrap">
              <div className="asp-eyebrow">By the numbers</div>
              <h2>A legacy built on<br />connection.</h2>
              <p style={{ marginTop: 24, maxWidth: '52ch' }}>
                Founded in 1989. More than 35 years of connecting artists, businesses, and the city of Phoenix. The numbers below are what the redesigned homepage would lead with.
              </p>
            </div>
            <div className="asp-wrap">
              <div className="asp-stats-grid">
                <div className="asp-stat-block">
                  <div className="asp-stat-num">1988<span className="asp-stat-red">.</span></div>
 <div className="asp-stat-label">Art Detour founded, Phoenix's first art walk</div>
                </div>
                <div className="asp-stat-block">
                  <div className="asp-stat-num">20<span className="asp-stat-red">K</span></div>
                  <div className="asp-stat-label">Monthly visitors to First Fridays at peak</div>
                </div>
                <div className="asp-stat-block">
                  <div className="asp-stat-num">35<span className="asp-stat-red">+</span></div>
                  <div className="asp-stat-label">Years keeping art integral to Phoenix's development</div>
                </div>
                <div className="asp-stat-block">
                  <div className="asp-stat-num">6<span className="asp-stat-red">.</span></div>
                  <div className="asp-stat-label">Programs connecting artists to city and community</div>
                </div>
                <div className="asp-stat-block">
                  <div className="asp-stat-num">$3<span className="asp-stat-red">K</span></div>
                  <div className="asp-stat-label">In TAFF grants awarded to local artists annually</div>
                </div>
                <div className="asp-stat-block">
                  <div className="asp-stat-num">1<span className="asp-stat-red">.</span></div>
                  <div className="asp-stat-label">City. Hundreds of artists, studios, and galleries linked.</div>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER PREVIEW */}
          <section className="asp-hp-footer-preview">
            <div className="asp-wrap">
              <div className="asp-mockup-label" style={{ marginBottom: 48 }}>
                Homepage Footer · Concept
              </div>
              <div className="asp-hpf-inner">
                <div>
                  <img className="asp-hpf-logo" src="/artlink/Artlink_Logo_Rev.png" alt="Artlink" />
                  <p className="asp-hpf-tagline">
                    Artlink keeps the arts integral to our development by connecting artists, businesses, and the community. Since 1989.
                  </p>
                </div>
                <ul className="asp-hpf-links">
                  <li><a href="#brand">First Fridays</a></li>
                  <li><a href="#brand">Art Detour</a></li>
                  <li><a href="#brand">TAFF Grants</a></li>
                  <li><a href="#brand">Artinerary</a></li>
                  <li><a href="#brand">ArtistsAZ.com</a></li>
                </ul>
                <ul className="asp-hpf-links">
                  <li><a href="#brand">About Artlink</a></li>
                  <li><a href="#brand">Board + Staff</a></li>
                  <li><a href="#brand">Partner with Us</a></li>
                  <li><a href="#brand">Donate</a></li>
                  <li><a href="#brand">Contact</a></li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ARC 3 — SOCIAL DESIGN SYSTEM
        ═══════════════════════════════════════════════════════ */}
        <div id="social">
          <div className="asp-arc-divider" style={{ background: 'var(--al-red)' }} />
          <div className="asp-arc-divider-wide">
 <div className="asp-arc-divider-label">Arc 03, Social Design System</div>
          </div>

          <section className="asp-social">
            <div className="asp-wrap">
              <div className="asp-social-intro">
                <div className="asp-eyebrow">Instagram · Brand on Social</div>
                <h2>The brand<br />has range.</h2>
                <p style={{ marginTop: 24 }}>
                  Six post concepts — feed and story format — showing how the Artlink brand system extends to Instagram. Every post uses only the authorized palette: Artlink Red, Black, White. The photography does the emotional work. The type does the rest.
                </p>
              </div>

              <div className="asp-social-grid">

                {/* Post 1: First Fridays (1:1 photo) */}
                <div className="asp-ig-post">
                  <img src="/artlink-pitch/social-first-fridays.png" alt="First Fridays crowd" />
                  <div className="asp-ig-overlay">
                    <div className="asp-ig-kicker">First Fridays · Monthly</div>
                    <div className="asp-ig-headline">Tonight.<br />Roosevelt Row.</div>
 <div className="asp-ig-sub">First Friday of the month, galleries open, streets alive</div>
                  </div>
                </div>

                {/* Story: Art d'Core Gala (9:16) */}
                <div className="asp-ig-story">
                  <img src="/artlink-pitch/social-gala.png" alt="Art d'Core Gala" />
                  <div className="asp-ig-story-overlay">
                    <div className="asp-story-red-bar" />
                    <div className="asp-ig-story-headline">Art d'Core<br />Gala 2026</div>
                    <div className="asp-ig-story-sub">The Arts and Culture Party of the Year</div>
                  </div>
                </div>

                {/* Post 2: Artist Spotlight (1:1 photo) */}
                <div className="asp-ig-post">
                  <img src="/artlink-pitch/social-artist-studio.png" alt="Artist in studio" />
                  <div className="asp-ig-overlay">
                    <div className="asp-ig-kicker">TAFF · Artist Forward Fund</div>
                    <div className="asp-ig-headline">Artists,<br />forward.</div>
                    <div className="asp-ig-sub">Three grants. Three new exhibitions. Applications open.</div>
                  </div>
                </div>

                {/* Post 3: Art Detour text-only (1:1 dark) */}
                <div className="asp-ig-text-post">
                  <img
                    className="asp-ig-text-logo"
                    src="/artlink/Artlink_Logo_Rev.png"
                    alt="Artlink"
                  />
                  <div className="asp-ig-text-headline">Art<br />Detour<br />March.</div>
                  <div className="asp-ig-text-sub">A month-long art walk across downtown Phoenix. Self-guided. Free.</div>
                </div>

                {/* Post 4: Artinerary red announcement */}
                <div
                  className="asp-ig-post"
                  style={{ background: 'var(--al-red)' }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                      padding: 32,
                    }}
                  >
                    <div style={{
                      fontWeight: 700,
                      fontSize: 'clamp(28px, 4vw, 48px)',
                      letterSpacing: '-0.02em',
                      lineHeight: 0.95,
                      color: 'var(--al-white)',
                      marginBottom: 20,
                      fontFamily: 'var(--al-font)',
                    }}>
                      Your map<br />to Phoenix<br />art.
                    </div>
                    <div style={{
                      fontWeight: 500,
                      fontSize: 12,
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.70)',
                    }}>
                      Artinerary.com
                    </div>
                    <img
                      src="/artlink/Artlink_Logo_Rev.png"
                      alt="Artlink"
                      style={{ width: 120, marginTop: 32, opacity: 0.80 }}
                    />
                  </div>
                </div>

                {/* Post 5: In Residence (1:1 dark) */}
                <div className="asp-ig-text-post" style={{ background: '#111111' }}>
                  <div style={{
                    fontWeight: 500,
                    fontSize: 10,
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: 'var(--al-red)',
                    marginBottom: 20,
                  }}>
                    In Residence · Downtown PHX
                  </div>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 'clamp(22px, 3.5vw, 36px)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.0,
                    color: 'var(--al-white)',
                    marginBottom: 20,
                    fontFamily: 'var(--al-font)',
                    maxWidth: '14ch',
                  }}>
                    Live where<br />art lives.
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.6,
                    maxWidth: '22ch',
                  }}>
                    Artist residencies at three downtown Phoenix properties.
                  </div>
                  <div style={{
                    width: 40,
                    height: 2,
                    background: 'var(--al-red)',
                    marginTop: 28,
                  }} />
                </div>

              </div>
            </div>
          </section>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ARC 4 — BRAND APPLICATIONS
        ═══════════════════════════════════════════════════════ */}
        <div id="applications">
          <div className="asp-arc-divider" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="asp-arc-divider-wide">
 <div className="asp-arc-divider-label">Arc 04, Brand Applications</div>
          </div>

          <section className="asp-applications">
            <div className="asp-wrap">
              <div className="asp-apps-intro">
                <div className="asp-eyebrow asp-light">Taking it higher</div>
                <h2 style={{ color: 'var(--al-white)' }}>The brand,<br />off the screen.</h2>
                <p style={{ marginTop: 24, color: 'rgba(255,255,255,0.55)', maxWidth: '52ch' }}>
                  Two larger-format applications — an event poster and a billboard concept — showing how the Artlink mark scales to physical space. The same discipline: Red, Black, White. NeutraFace. Nothing else.
                </p>
              </div>
            </div>

            {/* Poster + description */}
            <div className="asp-apps-row">
              <div className="asp-poster-frame">
                <img src="/artlink-pitch/poster-art-detour.png" alt="Art Detour Arizona" />
                <div className="asp-poster-overlay" />
                <div className="asp-poster-content">
                  <div className="asp-poster-red-rule" />
                  <div className="asp-poster-program">Art Detour · March 2026</div>
                  <div className="asp-poster-title">
                    Arizona's<br />Art Walk<br />Returns.
                  </div>
                  <div className="asp-poster-meta">
                    A month-long celebration of<br />
                    Arizona's creative community.<br />
                    Downtown Phoenix · Free · All Month.
                  </div>
                  <img
                    className="asp-poster-logo"
                    src="/artlink/Artlink_Logo_Rev.png"
                    alt="Artlink"
                  />
                </div>
              </div>

              <div className="asp-app-desc asp-dark">
                <div className="asp-arc-label" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  Application 01
                </div>
                <h3 style={{ color: 'var(--al-white)', marginBottom: 24, fontSize: 28 }}>
 Event Poster , <br />Art Detour March
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.50)', marginBottom: 32 }}>
 A vertical format event poster using the desert landscape as both canvas and context. The Sonoran desert and the Arizona sky aren't decoration, they are the frame that makes Phoenix art meaningful.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.50)' }}>
                  NeutraFace Bold commands the headline. NeutraFace Light handles the logistics. Artlink Red anchors the mark and the rule above the program name. Nothing else is needed.
                </p>
              </div>
            </div>

            {/* Billboard */}
            <div className="asp-billboard-frame" style={{ marginTop: 2 }}>
              <img src="/artlink-pitch/billboard.png" alt="Downtown Phoenix mural district" />
              <div className="asp-billboard-overlay">
                <div className="asp-billboard-text">
                  <div className="asp-mockup-label" style={{ marginBottom: 24 }}>
                    Billboard Concept
                  </div>
                  <div className="asp-billboard-eyebrow">Art Detour · Downtown Phoenix</div>
                  <div className="asp-billboard-headline">
                    Where<br />Phoenix<br />Makes Art.
                  </div>
                  <div className="asp-billboard-sub">
                    Art Detour — March 2026 — A month-long celebration across downtown Phoenix galleries and studios. Free and open to all.
                  </div>
                </div>
                <div className="asp-billboard-logo-col">
                  <img
                    className="asp-billboard-logo"
                    src="/artlink/Artlink_Logo_Rev.png"
                    alt="Artlink"
                  />
                </div>
              </div>
            </div>

          </section>
        </div>

        {/* ═══════════════════════════════════════════════════════
            CLOSE — PITCH CTA
        ═══════════════════════════════════════════════════════ */}
        <section className="asp-pitch-cta">
          <div className="asp-wrap">
            <div className="asp-cta-inner">
              <div>
                <div className="asp-eyebrow asp-red" style={{ marginBottom: 32 }}>
                  Prepared by AOM · 2026
                </div>
                <h2 className="asp-cta-headline">
                  This is what<br />your brand<br />
                  <span className="asp-cta-red">can do.</span>
                </h2>
              </div>
              <div>
                <p className="asp-cta-body">
                  Every page on this demo is the brand applied. No conceptual mockups, no stock photography, no generic templates. This is real — built in a day, deployed to a live URL, ready to share with your board.
                </p>
                <p className="asp-cta-body">
                  AOM can build the full site, extend the social system, and launch the Art Detour poster in production. The question is timing.
                </p>
                <a className="asp-cta-contact" href="mailto:hello@aom-inhouse.com">
                  Let's talk → hello@aom-inhouse.com
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="asp-footer">
          <div className="asp-wrap">
            <div className="asp-footer-inner">
              <img
                className="asp-footer-logo"
                src="/artlink/Artlink_Logo_Rev.png"
                alt="Artlink"
              />
              <div className="asp-footer-meta">
                Brand standards source: Ben G. Smith / Arsenal GPA · 2026<br />
                Photography: AI-generated for demonstration purposes
              </div>
              <div className="asp-footer-aom">
                Pitch prepared by <a href="https://aheadofmarket.com">AOM</a> · 2026
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}