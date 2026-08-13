import React, { useState } from 'react';
import SiteNavR38 from '../components/SiteNavR38';
import HomeConsoleR38 from '../components/home/HomeConsoleR38';

/**
 * R38 homepage preview — the r4 Cinema structure rebuilt in the console system
 * (paper/carbon/orange, Anton + Hanken + JetBrains Mono, V6.1 locked copy).
 * Route: /r38. No variant picker, no dev chrome.
 */

export default function HomeR38Preview() {
  const [briefOpen, setBriefOpen] = useState(false);
  const openBrief = () => setBriefOpen(true);

  return (
    <>
      <SiteNavR38 onStartProject={openBrief} />
      <HomeConsoleR38 openBrief={openBrief} />

      {briefOpen && (
        <div
          onClick={() => setBriefOpen(false)}
          className="fixed inset-0 z-[600] flex items-center justify-center bg-[#0A0A08]/70 backdrop-blur-sm cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F5F3EE] border border-[#0A0A08]/10 p-10 max-w-md mx-4 cursor-default"
          >
            <h3 className="font-anton uppercase text-[30px] leading-[1.0] text-[#0A0A08] mb-4">
              Tell us what you need
            </h3>
            <p className="font-hanken text-[15px] text-[#0A0A08]/70 leading-[1.6] mb-7">
              A sentence is fine. Email{' '}
              <a href="mailto:hello@aom-inhouse.com" className="text-[#C43800] underline">hello@aom-inhouse.com</a>{' '}
              and a real person replies within a day.
            </p>
            <button
              onClick={() => setBriefOpen(false)}
              className="font-mono text-[11px] uppercase tracking-[0.22em] bg-[#F04404] text-[#0A0A08] px-6 py-3 rounded-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
