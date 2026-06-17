import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
import StickyVideoDeck from './home/StickyVideoDeck';
import CTAButton from './home/CTAButton';
import { HERO_DECK } from './home/content';

/**
 * HeroSection — main `/` hero, Cinema-shape ported from /r4 R3.
 * Playfair Display serif headline with italic accent. Two-column layout:
 * text left, StickyVideoDeck (auto-scrolling vertical client reels) right.
 */
export default function HeroSection({ openBrief }) {
  return (
    <section
      className="relative overflow-hidden lg:min-h-[900px] xl:min-h-[965px] bg-black text-[#F0ECE6]"
      aria-label="Hero"
    >
      <div className="px-6 md:px-12 pt-28 md:pt-36 pb-12 lg:pb-0 lg:py-40 max-w-[1608px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-24 xl:gap-32 relative lg:min-h-[700px] xl:min-h-[805px]">
          <div className="lg:w-1/2 flex flex-col">
            <div className="inline-flex items-center gap-3 bg-[#0C0C0C]/60 backdrop-blur-sm border border-[#E85D26]/30 px-3 py-1.5 rounded-full mb-8 self-start">
              <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F0ECE6]">
                Now streaming · Live reels
              </p>
            </div>
            <h1 className="font-display-serif text-[14vw] md:text-[80px] lg:text-[96px] xl:text-[120px] leading-[0.88] tracking-[-0.03em] max-w-[700px]">
              Welcome
            </h1>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/85 mt-8 leading-[1.55] max-w-xl">
              Brand films, websites, and ads for real businesses. Hire us online by sending a few files. Or hire us in person. We reply within 24 hours.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-10">
              <CTAButton size="lg" variant="06" onClick={() => openBrief?.()}>Start a project</CTAButton>
              <a
                href="#work"
                className="text-[#F0ECE6] flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.22em] no-underline px-2 py-3 hover:text-[#E85D26] transition-colors"
              >
                <Play size={14} className="fill-current" /> Watch the reel
              </a>
            </div>
          </div>
          <div className="lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-1/2 lg:pr-8 xl:pr-10 lg:pl-4">
            <StickyVideoDeck items={HERO_DECK} theme="cinema" />
          </div>
        </div>
      </div>
    </section>
  );
}
