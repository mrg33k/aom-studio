import React, { useState } from 'react';
import {
  Upload, MessageSquare, Sparkles, FileText,
  Calendar, Handshake, Camera, Package,
} from 'lucide-react';
import CTAButton from './CTAButton';
import { HOW_IT_WORKS } from './content';

const STEP_ICONS_ONLINE = [Upload, MessageSquare, Sparkles, FileText];
const STEP_ICONS_IN_PERSON = [Calendar, Handshake, Camera, Package];

const headerIconFor = (idx) => (idx === 0 ? Upload : Handshake);
const ctaFor = (idx) => (idx === 0 ? 'Send your files' : 'Book a visit');
const iconsFor = (idx) => (idx === 0 ? STEP_ICONS_ONLINE : STEP_ICONS_IN_PERSON);

function SectionHeader() {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-5">How to hire us</p>
      <h2 className="font-display-serif text-[42px] md:text-[80px] leading-[0.94] tracking-[-0.025em]">
        Two ways. <em className="font-display-italic italic font-medium text-[#E85D26]">Pick one.</em>
      </h2>
      <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-6 leading-[1.55]">
        You don't need a meeting to start. Most clients hire us online and never visit. Some prefer to shake hands. Both work.
      </p>
    </div>
  );
}

function TabbedContent({ openBrief }) {
  const [active, setActive] = useState(1);
  const path = HOW_IT_WORKS[active];
  const HeaderIcon = headerIconFor(active);
  const icons = iconsFor(active);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab strip */}
      <div className="inline-flex p-1.5 rounded-full border border-white/[0.10] bg-white/[0.02] mb-8">
        {HOW_IT_WORKS.map((p, i) => {
          const Icon = headerIconFor(i);
          return (
            <button
              key={p.title}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-full font-body text-[14px] font-medium transition-colors ${
                active === i ? 'bg-[#E85D26] text-[#0C0C0C]' : 'text-[#F0ECE6]/70 hover:text-[#F0ECE6]'
              }`}
            >
              <Icon size={16} />
              <span>{p.eyebrow}</span>
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-12">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#E85D26]/15 border border-[#E85D26]/30 flex items-center justify-center">
            <HeaderIcon size={28} className="text-[#E85D26]" />
          </div>
          <h3 className="font-display-serif text-[36px] md:text-[52px] leading-[0.95] tracking-[-0.025em]">{path.title}</h3>
        </div>
        <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 leading-[1.6] mb-10 max-w-xl">{path.summary}</p>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          {path.steps.map((s, i) => {
            const StepIcon = icons[i];
            return (
              <li key={s.n} className="flex gap-5">
                <div className="shrink-0 relative">
                  <div className="w-12 h-12 rounded-xl bg-[#0C0C0C] border border-white/[0.10] flex items-center justify-center">
                    <StepIcon size={20} className="text-[#F0ECE6]/85" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#E85D26] text-[#0C0C0C] font-mono text-[11px] font-bold flex items-center justify-center">{s.n}</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-display-serif text-[20px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]">{s.label}</p>
                  <p className="font-body text-[14px] text-[#F0ECE6]/65 mt-2 leading-[1.6]">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12">
          <CTAButton size="md" onClick={() => openBrief?.()}>{ctaFor(active)}</CTAButton>
        </div>
      </div>
    </div>
  );
}

export default function TwoWaysSection({ openBrief }) {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 relative">
      <div className="max-w-[1440px] mx-auto">
        <SectionHeader />
        <TabbedContent openBrief={openBrief} />
      </div>
    </section>
  );
}
