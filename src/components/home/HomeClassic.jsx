import React from 'react';
import { ArrowRight } from 'lucide-react';
import StickyVideoDeck from './StickyVideoDeck';
import RecentWorkSection from './RecentWorkSection';
import TwoWaysSection from './TwoWaysSection';
import StatsSection from './StatsSection';
import CustomerStoriesSection from './CustomerStoriesSection';
import ServicesChartSection from './ServicesChartSection';
import ArticlesSection from './ArticlesSection';
import CTAButton from './CTAButton';
import { HERO_DECK, SERVICES } from './content';

/**
 * HomeClassic -- Superside-faithful AOM homepage.
 * Dark base, structural grids, sticky-deck hero, comparison matrix, etc.
 */

export default function HomeClassic({ openBrief }) {
  return (
    <div className="bg-[#0C0C0C] text-[#F0ECE6]">
      {/* 1. HERO -- Superside-shape: text left, masked 2-col video deck right */}
      <section className="relative overflow-hidden lg:min-h-[900px] xl:min-h-[965px]">
        <div className="px-6 md:px-12 pt-28 md:pt-36 pb-12 lg:pb-0 lg:py-40 max-w-[1608px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-24 xl:gap-32 relative lg:min-h-[700px] xl:min-h-[805px]">
            {/* Left half — text, takes lg:w-1/2 */}
            <div className="lg:w-1/2 flex flex-col">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#E85D26] mb-6">
                <span className="inline-block w-6 h-px bg-[#E85D26] mr-3 align-middle" />
                Available anywhere · 2026
              </p>
              <h1 className="font-display-serif text-[12vw] md:text-[80px] lg:text-[88px] xl:text-[112px] leading-[0.92] tracking-[-0.025em] max-w-[700px]">
                A creative team<br />you can actually <em className="font-display-italic italic font-medium text-[#E85D26]">hire.</em>
              </h1>
              <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 mt-8 leading-[1.55] max-w-xl">
                We make brands, websites, ads, and videos. Hire us online by sending us your files. Or hire us in person. Either way, we reply within 24 hours and start working.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-10">
                <CTAButton size="lg" variant="08" onClick={() => openBrief?.()}>Start a project</CTAButton>
                <a href="#work" className="border border-white/20 px-6 py-3.5 rounded-full font-body font-medium text-[14px] hover:bg-white/5 transition-colors no-underline text-[#F0ECE6]">
                  See the work
                </a>
              </div>
            </div>

            {/* Right half — masked 2-col deck. lg:absolute pulls it to right side, full height */}
            <div className="lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-1/2 lg:pr-8 xl:pr-10 lg:pl-4">
              <StickyVideoDeck items={HERO_DECK} theme="classic" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. RECENT WORK — 4 layout variants, picker bottom-right of section */}
      <RecentWorkSection />

      {/* 3. HOW IT WORKS — 4 layout variants, picker bottom-right of section */}
      <TwoWaysSection openBrief={openBrief} />

      {/* 5. STATS — 4 layout variants, picker bottom-right of section */}
      <StatsSection />

      {/* 6 + 7. CUSTOMER STORIES — 4 layout variants, picker bottom-right */}
      <CustomerStoriesSection />

      {/* 8. SERVICES OVERVIEW */}
      <section className="py-24 md:py-28 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
            <h2 className="font-display-serif text-[36px] md:text-[60px] leading-[0.94] tracking-[-0.025em] max-w-2xl">
              Move fast with <em className="font-display-italic italic font-medium text-[#E85D26]">16+ services</em>, fuel results across every team.
            </h2>
            <a href="#services" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-1.5 no-underline">
              See all services <ArrowRight size={13} />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
            {SERVICES.map((g) => (
              <div key={g.group}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-4">{g.group}</p>
                <ul className="space-y-2">
                  {g.items.map((it) => (
                    <li key={it} className="font-body text-[14.5px] text-[#F0ECE6]/85 hover:text-[#F0ECE6] transition-colors">{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

 {/* 9a. SERVICES CHART, chart-led "what we do" above the timeline */}
      <ServicesChartSection />

      {/* 9b. ARTICLES — projects in plain language, mixed video and non-video */}
      <ArticlesSection />

 {/* 10. LET'S MAKE SOMETHING, the closing banner */}
      <section className="py-32 md:py-40 px-6 md:px-12 border-t border-white/[0.06] text-center bg-gradient-to-b from-[#0C0C0C] to-[#1a0d05]">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="font-display-serif text-[60px] md:text-[140px] leading-[0.85] tracking-[-0.03em]">
            Let's <em className="font-display-italic italic font-medium text-[#E85D26]">make something.</em>
          </h2>
          <div className="mt-12 inline-block">
            <CTAButton size="lg" variant="08" onClick={() => openBrief?.()}>Start a project</CTAButton>
          </div>
        </div>
      </section>

      {/* 11. TALK + EMAIL FOOTER */}
      <footer className="px-6 md:px-12 pt-20 md:pt-28 pb-10 border-t border-white/[0.08] bg-[#0a0a0a]">
        <div className="max-w-[1440px] mx-auto">
          {/* Talk row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-12 pb-14 md:pb-16 border-b border-white/[0.10]">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-[#E85D26]" />
                <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Talk to us</p>
              </div>
              <h3 className="font-display-serif text-[44px] md:text-[88px] leading-[0.9] tracking-[-0.03em] text-[#F0ECE6]">
                A real person<br /><em className="font-display-italic italic font-medium text-[#E85D26]">replies.</em>
              </h3>
              <p className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/65 mt-6 max-w-xl leading-[1.6]">
                Email is the fastest way in. We answer within one business day. Always.
              </p>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-3">
              <a
                href="mailto:hello@aom-inhouse.com"
                className="group flex items-baseline justify-between gap-4 border-b border-white/[0.10] hover:border-[#E85D26] py-5 no-underline transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]/85">Email</p>
                  <p className="font-display-serif text-[24px] md:text-[32px] tracking-[-0.018em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors break-all">hello@aom-inhouse.com</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-1.5 shrink-0 group-hover:gap-2.5 transition-all">
                  Send <ArrowRight size={13} />
                </span>
              </a>
              <a
                href="tel:+16025551234"
                className="group flex items-baseline justify-between gap-4 border-b border-white/[0.10] hover:border-[#E85D26] py-5 no-underline transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]/85">Phone</p>
                  <p className="font-display-serif text-[24px] md:text-[32px] tracking-[-0.018em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">(602) 555-1234</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-1.5 shrink-0 group-hover:gap-2.5 transition-all">
                  Call <ArrowRight size={13} />
                </span>
              </a>
            </div>
          </div>

          {/* Bottom row — logo + links + copyright */}
          <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <a href="/" className="font-display-serif text-[20px] tracking-[-0.02em] text-[#F0ECE6] hover:text-[#E85D26] transition-colors no-underline">
                AOM<span className="text-[#E85D26]">.</span>
              </a>
              <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/40">Ahead of Market</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { label: 'Articles', href: '/articles' },
                { label: 'The team', href: '/#team' },
                { label: 'Pricing', href: '/#pricing' },
                { label: 'Client portal', href: '/portal' },
              ].map((l) => (
                <a key={l.href} href={l.href} className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 hover:text-[#F0ECE6] transition-colors no-underline">
                  {l.label}
                </a>
              ))}
            </nav>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40">
              &copy; {new Date().getFullYear()} Ahead of Market. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}