import React, { useEffect, useState } from 'react';
import {
  ArrowRight, Upload, MessageSquare, Sparkles, FileText,
  Calendar, Handshake, Camera, Package,
} from 'lucide-react';
import CTAButton from './CTAButton';
import { HOW_IT_WORKS } from './content';

/**
 * TwoWaysSection
 * Four layout variants of the "Two ways. Pick one." how-to-hire section.
 * A: Twin cards (current)       — side-by-side, icon header + step list, CTA per card.
 * B: VS split with center OR    — open layout, vertical divider, no card borders.
 * C: Horizontal step flow       — each path is a left-to-right row of step boxes with arrows.
 * D: Tabbed compact             — single big card, tabs flip between online/in-person.
 *
 * Picker top-right of section. Choice persists in localStorage.
 */

const STORAGE_KEY = 'aom_two_variant';
const VARIANTS = ['A', 'B', 'C', 'D'];
const VARIANT_LABELS = { A: 'Twin', B: 'VS', C: 'Flow', D: 'Tabs' };
const DEFAULT_VARIANT = 'B';

const STEP_ICONS_ONLINE = [Upload, MessageSquare, Sparkles, FileText];
const STEP_ICONS_IN_PERSON = [Calendar, Handshake, Camera, Package];

function useVariant() {
  const [v, setV] = useState(DEFAULT_VARIANT);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VARIANTS.includes(stored)) setV(stored);
    } catch {}
  }, []);
  const set = (next) => {
    setV(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };
  return [v, set];
}

function VariantPicker({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 border border-white/[0.10] rounded-full bg-black/40 backdrop-blur p-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 px-2">Layout</span>
      {VARIANTS.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`font-mono text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full transition-colors ${
            value === v ? 'bg-[#E85D26] text-[#0C0C0C]' : 'text-[#F0ECE6]/60 hover:text-[#F0ECE6]'
          }`}
        >
          {v} · {VARIANT_LABELS[v]}
        </button>
      ))}
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-5">How to hire us</p>
      <h2 className="font-headline text-[42px] md:text-[80px] leading-[0.94] tracking-[-0.025em]">
        Two ways. <em className="font-display-italic italic font-medium text-[#E85D26]">Pick one.</em>
      </h2>
      <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-6 leading-[1.55]">
        You don't need a meeting to start. Most clients hire us online and never visit. Some prefer to shake hands. Both work.
      </p>
    </div>
  );
}

const headerIconFor = (idx) => (idx === 0 ? Upload : Handshake);
const ctaFor = (idx) => (idx === 0 ? 'Send your files' : 'Book a visit');
const iconsFor = (idx) => (idx === 0 ? STEP_ICONS_ONLINE : STEP_ICONS_IN_PERSON);

/* ───────────────────────── A — Twin cards (current) ───────────────────────── */
function VariantA({ openBrief }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
      {HOW_IT_WORKS.map((path, idx) => {
        const HeaderIcon = headerIconFor(idx);
        const icons = iconsFor(idx);
        return (
          <div key={path.title} className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-7 md:p-10">
            <div className="flex items-center gap-4 mb-7">
              <div className="w-14 h-14 rounded-2xl bg-[#E85D26]/12 border border-[#E85D26]/30 flex items-center justify-center">
                <HeaderIcon size={24} className="text-[#E85D26]" />
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26]">{path.eyebrow}</p>
                <h3 className="font-headline text-[28px] md:text-[34px] leading-[1.0] tracking-[-0.02em] mt-1">{path.title}</h3>
              </div>
            </div>
            <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.55] mb-8">{path.summary}</p>
            <ol className="space-y-5">
              {path.steps.map((s, i) => {
                const StepIcon = icons[i];
                return (
                  <li key={s.n} className="flex gap-4 items-start">
                    <div className="shrink-0 relative">
                      <div className="w-11 h-11 rounded-xl bg-[#0C0C0C] border border-white/[0.10] flex items-center justify-center">
                        <StepIcon size={18} className="text-[#F0ECE6]/85" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E85D26] text-[#0C0C0C] font-mono text-[10px] font-bold flex items-center justify-center">{s.n}</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="font-headline text-[18px] md:text-[20px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]">{s.label}</p>
                      <p className="font-body text-[13.5px] md:text-[14px] text-[#F0ECE6]/65 mt-1.5 leading-[1.55]">{s.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-9">
              <CTAButton size="md" fullWidth onClick={() => openBrief?.()}>{ctaFor(idx)}</CTAButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── B — VS split ───────────────────────── */
function VariantB({ openBrief }) {
  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
      {/* Center divider + OR badge */}
      <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-[#E85D26]/40 to-transparent" />
      <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#0C0C0C] border-2 border-[#E85D26] items-center justify-center z-10">
        <span className="font-headline text-[18px] tracking-[-0.01em] text-[#E85D26]">or</span>
      </div>

      {HOW_IT_WORKS.map((path, idx) => {
        const HeaderIcon = headerIconFor(idx);
        const icons = iconsFor(idx);
        return (
          <div key={path.title} className={`flex flex-col ${idx === 0 ? 'lg:pr-12' : 'lg:pl-12'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#E85D26] text-[#0C0C0C] flex items-center justify-center">
                <HeaderIcon size={28} />
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-1">{path.eyebrow}</p>
                <h3 className="font-headline text-[34px] md:text-[44px] leading-[0.95] tracking-[-0.025em]">{path.title}</h3>
              </div>
            </div>
            <p className="font-body text-[16px] md:text-[17px] text-[#F0ECE6]/75 leading-[1.6] mb-8 max-w-md">{path.summary}</p>
            <div className="space-y-4 flex-1">
              {path.steps.map((s, i) => {
                const StepIcon = icons[i];
                return (
                  <div key={s.n} className="flex items-start gap-4 border-b border-white/[0.08] pb-4">
                    <div className="flex items-center gap-3 shrink-0 pt-0.5">
                      <span className="font-headline text-[28px] md:text-[36px] leading-none tracking-[-0.02em] text-[#E85D26]">{String(s.n).padStart(2, '0')}</span>
                      <StepIcon size={18} className="text-[#F0ECE6]/55" />
                    </div>
                    <div className="flex-1">
                      <p className="font-headline text-[18px] md:text-[20px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]">{s.label}</p>
                      <p className="font-body text-[14px] text-[#F0ECE6]/65 mt-1 leading-[1.55]">{s.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-9 self-start">
              <CTAButton size="md" onClick={() => openBrief?.()}>{ctaFor(idx)}</CTAButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── C — Horizontal step flow ───────────────────────── */
function VariantC({ openBrief }) {
  return (
    <div className="space-y-12">
      {HOW_IT_WORKS.map((path, idx) => {
        const HeaderIcon = headerIconFor(idx);
        const icons = iconsFor(idx);
        return (
          <div key={path.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E85D26]/12 border border-[#E85D26]/30 flex items-center justify-center">
                  <HeaderIcon size={20} className="text-[#E85D26]" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]">{path.eyebrow}</p>
                  <h3 className="font-headline text-[24px] md:text-[28px] leading-[1.0] tracking-[-0.015em] mt-0.5">{path.title}</h3>
                </div>
              </div>
              <CTAButton size="sm" onClick={() => openBrief?.()}>{ctaFor(idx)}</CTAButton>
            </div>
            {/* Horizontal step flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-2 relative">
              {path.steps.map((s, i) => {
                const StepIcon = icons[i];
                const isLast = i === path.steps.length - 1;
                return (
                  <React.Fragment key={s.n}>
                    <div className="relative bg-[#0C0C0C] border border-white/[0.10] rounded-xl p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          <StepIcon size={16} className="text-[#F0ECE6]/85" />
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]">Step {s.n}</span>
                      </div>
                      <p className="font-headline text-[17px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]">{s.label}</p>
                      <p className="font-body text-[12.5px] text-[#F0ECE6]/65 leading-[1.5]">{s.body}</p>
                    </div>
                    {!isLast && (
                      <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none" style={{ left: `calc(${((i + 1) / 4) * 100}% - 14px)` }}>
                        <div className="w-7 h-7 rounded-full bg-[#0a0a0a] border border-[#E85D26]/40 flex items-center justify-center">
                          <ArrowRight size={12} className="text-[#E85D26]" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── D — Tabbed compact ───────────────────────── */
function VariantD({ openBrief }) {
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
          <h3 className="font-headline text-[36px] md:text-[52px] leading-[0.95] tracking-[-0.025em]">{path.title}</h3>
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
                  <p className="font-headline text-[20px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]">{s.label}</p>
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

const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD };

export default function TwoWaysSection({ openBrief }) {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || RENDER[DEFAULT_VARIANT];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 relative">
      <div className="max-w-[1440px] mx-auto">
        <SectionHeader />
        <Variant openBrief={openBrief} />
        {VARIANTS.length > 1 && (
          <div className="mt-12 flex justify-end">
            <VariantPicker value={variant} onChange={setVariant} />
          </div>
        )}
      </div>
    </section>
  );
}
