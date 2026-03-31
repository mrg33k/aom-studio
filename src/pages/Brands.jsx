import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock } from 'lucide-react'

const brands = [
  {
    id: 's3c',
    name: 'S3C',
    full: 'Semiconductor Services & Supply Coalition',
    description: 'Logo system and brand identity for a semiconductor industry coalition. Three concepts: seal, monogram, badge.',
    accentColor: '#0E9FFF',
    link: '/brands/s3c',
    logo: '/images/s3c/c03-circular-seal-nobg.png',
    status: 'live',
    tag: 'Industrial / Coalition',
  },
  {
    id: 'aom',
    name: 'AOM',
    full: 'Ahead of Market',
    description: 'Creative production and AI systems company. Video, web, brand, social, and AI-powered workflows for growth-stage businesses.',
    accentColor: '#E85D26',
    link: '/brand',
    logo: '/brand/aom-mono-white.svg',
    status: 'live',
    tag: 'Production / AI Systems',
  },
  {
    id: 'ambition',
    name: 'Ambition Mechanical',
    full: 'Commercial & Industrial HVAC/R',
    description: 'Premium commercial and industrial mechanical contractor. Built around execution, craft, and industrial energy.',
    accentColor: '#1a237e',
    link: '/brands/ambition',
    logo: '/ambition-logo.png',
    status: 'live',
    tag: 'Commercial / Industrial',
  },
  {
    id: 'included-health',
    name: 'Included Health',
    full: 'Healthcare Navigation & Advocacy',
    description: 'Brand reference for Included Health. Colors, typography, and visual identity guidelines.',
    accentColor: '#00B5A3',
    link: '/brands/included-health',
    logo: null,
    logoText: 'IH',
    status: 'live',
    tag: 'Healthcare / Technology',
  },
  {
    id: 'v2v',
    name: 'Valor to Victory',
    full: 'Veteran Homeownership & Investment',
    description: 'Nonprofit empowering veterans through homeownership, real estate investment, VA loan education, and financial guidance.',
    accentColor: '#C9A84C',
    link: '/brands/v2v',
    logo: null,
    logoText: 'V2V',
    status: 'coming-soon',
    tag: 'Nonprofit / Veterans',
  },
]

export default function Brands() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0e1a', color: '#f0f0f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        backgroundColor: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
            <img src="/brand/aom-mono-white.svg" alt="AOM" style={{ height: 16, opacity: 0.6 }} />
            <span>aheadofmarket.com</span>
          </Link>
          <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>Brand Portfolio</span>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 56px' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E85D26', fontWeight: 600, marginBottom: 20 }}>
          Our Brands
        </p>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 80px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 0.9, textTransform: 'uppercase', margin: 0, color: '#f0f0f0' }}>
          Brand<br />Portfolio
        </h1>
        <p style={{ marginTop: 28, maxWidth: 480, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', fontSize: 16 }}>
          Identity work built by AOM. Every brand below is a full system: logo, color, type, and voice.
        </p>
      </section>

      {/* Brand Grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 100px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 1,
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          {brands.map(brand => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}>
        <img src="/brand/aom-mono-white.svg" alt="AOM" style={{ height: 18, opacity: 0.3 }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Ahead of Market / Brand Work
        </span>
      </footer>
    </div>
  )
}

function BrandCard({ brand }) {
  const isComingSoon = brand.status === 'coming-soon'

  const cardContent = (
    <div style={{
      backgroundColor: '#0d1220',
      padding: '40px',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'relative',
      transition: 'background-color 0.2s ease',
      cursor: isComingSoon ? 'default' : 'pointer',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }}
      onMouseEnter={e => { if (!isComingSoon) e.currentTarget.style.backgroundColor = '#111827' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0d1220' }}
    >
      {/* Accent bar */}
      <div style={{
        width: 32, height: 2,
        backgroundColor: brand.accentColor,
        marginBottom: 28,
        transition: 'width 0.3s ease',
      }} />

      {/* Logo */}
      <div style={{ height: 52, marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        {brand.logo ? (
          <img
            src={brand.logo}
            alt={brand.name}
            style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain', opacity: isComingSoon ? 0.4 : 1 }}
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: 4,
            border: `1px solid ${brand.accentColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: brand.accentColor, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6,
          }}>
            {brand.logoText || brand.id.toUpperCase()}
          </div>
        )}
      </div>

      {/* Tag */}
      <p style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 8 }}>
        {brand.tag}
      </p>

      {/* Name */}
      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em', color: '#f0f0f0', margin: '0 0 10px', lineHeight: 1.1 }}>
        {brand.name}
      </h2>

      {/* Full name */}
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: 16, lineHeight: 1.4 }}>
        {brand.full}
      </p>

      {/* Description */}
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', marginBottom: 'auto', paddingBottom: 28 }}>
        {brand.description}
      </p>

      {/* CTA */}
      {isComingSoon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: brand.accentColor, opacity: 0.5 }}>
          <Clock size={12} />
          Coming Soon
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: brand.accentColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          View Brand
          <ArrowUpRight size={13} />
        </span>
      )}
    </div>
  )

  if (isComingSoon) return cardContent

  return (
    <Link to={brand.link} style={{ textDecoration: 'none', display: 'block' }}>
      {cardContent}
    </Link>
  )
}
