import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const brands = [
  {
    name: 'AOM',
    full: 'Ahead of Market',
    description: 'Creative production and AI systems company. Video, web, brand, social, and AI-powered workflows.',
    accentColor: '#E85D26',
    link: '/brand',
  },
  {
    name: 'Ambition Mechanical',
    full: 'Commercial & Industrial HVAC/R',
    description: 'Premium commercial/industrial mechanical contractor. HVAC/R installation, service, repair, and energy management.',
    accentColor: '#1a237e',
    link: '/brands/ambition',
  },
]

export default function BrandsHub() {
  return (
    <div className="min-h-screen bg-[#FDF6EC] text-[#0A0A0A] relative">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#FDF6EC]/90 backdrop-blur-md border-b border-[#D9D3CB]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-[#7A7267] hover:text-[#0A0A0A] transition-colors">
            <ArrowLeft size={16} />
            <span className="font-body text-[11px] font-medium uppercase tracking-[0.2em]">Back to Site</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-headline text-sm font-extrabold uppercase tracking-tight text-[#0A0A0A]">AOM</span>
            <span className="text-[#D9D3CB]">/</span>
            <span className="font-body text-[11px] text-[#7A7267] uppercase tracking-[0.15em] font-medium">Brands</span>
          </div>
          <span className="font-body text-[10px] text-[#7A7267]">v1.0</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-40 px-6 md:px-12 max-w-6xl mx-auto">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-[#E85D26] mb-6">Brand Hub</p>
        <h1 className="font-headline text-5xl md:text-8xl font-extrabold uppercase tracking-[-0.02em] text-[#0A0A0A] leading-[0.85]">
          BRAND<br />GUIDELINES
        </h1>
        <p className="text-[#7A7267] text-lg mt-8 max-w-xl leading-relaxed font-body">
          Visual identity, voice, and standards for every brand AOM manages. Select a brand to view its full guidelines.
        </p>
      </section>

      {/* Brand Cards */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="border-t border-[#D9D3CB] pt-16">
          <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-[#7A7267] mb-8">Active Brands</p>
          <div className="grid md:grid-cols-2 gap-6">
            {brands.map(brand => (
              <Link
                key={brand.name}
                to={brand.link}
                className="group p-8 md:p-10 border border-[#D9D3CB] bg-white shadow-sm hover:border-opacity-60 transition-all duration-300"
                style={{ '--accent': brand.accentColor }}
              >
                <div
                  className="w-12 h-[2px] mb-6 transition-all duration-300 group-hover:w-20"
                  style={{ backgroundColor: brand.accentColor }}
                />
                <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-[#7A7267] mb-3">
                  {brand.full}
                </p>
                <h2 className="font-headline text-2xl md:text-4xl font-extrabold uppercase tracking-tight text-[#0A0A0A] mb-4">
                  {brand.name}
                </h2>
                <p className="text-[#7A7267] text-sm leading-relaxed mb-6 font-body">
                  {brand.description}
                </p>
                <span
                  className="inline-flex items-center gap-2 text-sm font-bold font-body transition-colors duration-300"
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
        <footer className="py-16 border-t border-[#D9D3CB] mt-16 text-center">
          <p className="font-body text-[10px] text-[#7A7267] uppercase tracking-[0.2em]">
            AOM Brand Hub / All managed brand identities in one place
          </p>
        </footer>
      </div>
    </div>
  )
}
