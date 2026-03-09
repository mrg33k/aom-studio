import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const brands = [
  {
    name: 'AOM',
    full: 'Ahead of Market',
    description: 'Creative production and AI systems company. Video, web, brand, social, and AI-powered workflows.',
    accentColor: '#FF4F00',
    link: '/brand',
  },
  {
    name: 'Ambition Mechanical',
    full: 'Commercial & Industrial HVAC/R',
    description: 'Premium commercial/industrial mechanical contractor. HVAC/R installation, service, repair, and energy management.',
    accentColor: '#0ea5e9',
    link: '/brands/ambition',
  },
]

export default function BrandsHub() {
  return (
    <div className="min-h-screen bg-[#0A0A08] text-[#F5F0EB] relative">
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="brands-noise"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#brands-noise)" />
        </svg>
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#0A0A08]/90 backdrop-blur-md border-b border-[#292524]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-[#A8A29E] hover:text-[#F5F0EB] transition-colors">
            <ArrowLeft size={16} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]">Back to Site</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-headline text-sm font-bold uppercase tracking-tight text-[#F5F0EB]">AOM</span>
            <span className="text-[#292524]">/</span>
            <span className="font-mono text-[10px] text-[#78716C] uppercase tracking-[0.2em]">Brands</span>
          </div>
          <span className="font-mono text-[10px] text-[#57534E]">v1.0</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-40 px-6 md:px-12 max-w-6xl mx-auto">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF4F00] mb-6">Brand Hub</p>
        <h1 className="font-headline text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-[#F5F0EB] leading-[0.85]">
          BRAND<br />GUIDELINES
        </h1>
        <p className="text-[#A8A29E] text-lg mt-8 max-w-xl leading-relaxed">
          Visual identity, voice, and standards for every brand AOM manages. Select a brand to view its full guidelines.
        </p>
      </section>

      {/* Brand Cards */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="border-t border-[#292524] pt-16">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-8">Active Brands</p>
          <div className="grid md:grid-cols-2 gap-6">
            {brands.map(brand => (
              <Link
                key={brand.name}
                to={brand.link}
                className="group p-8 md:p-10 rounded-sm border border-[#292524] bg-[#141412] shadow-xl hover:border-opacity-40 transition-all duration-300"
                style={{ '--accent': brand.accentColor }}
              >
                <div
                  className="w-12 h-[2px] mb-6 transition-all duration-300 group-hover:w-20"
                  style={{ backgroundColor: brand.accentColor }}
                />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-3">
                  {brand.full}
                </p>
                <h2 className="font-headline text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-[#F5F0EB] mb-4">
                  {brand.name}
                </h2>
                <p className="text-[#A8A29E] text-sm leading-relaxed mb-6">
                  {brand.description}
                </p>
                <span
                  className="inline-flex items-center gap-2 text-sm font-bold transition-colors duration-300"
                  style={{ color: brand.accentColor }}
                >
                  View Guidelines
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-16 border-t border-[#292524] mt-16 text-center">
          <p className="font-mono text-[10px] text-[#57534E] uppercase tracking-[0.3em]">
            AOM Brand Hub / All managed brand identities in one place
          </p>
        </footer>
      </div>
    </div>
  )
}
