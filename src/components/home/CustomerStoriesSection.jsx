import React, { useEffect, useState } from 'react';
import { Play, Clock, Tag } from 'lucide-react';
import LazyGumlet from './LazyGumlet';
import CTAButton from './CTAButton';
import { CUSTOMER_STORIES } from './content';

/**
 * CustomerStoriesSection
 * Four layout variants of the client-story section.
 * A: Asymmetric (current)        — big featured film + smaller text card.
 * B: Equal twin cards            — two equal stories side by side, same weight.
 * C: Magazine feature spread     — one big editorial article with deep hierarchy.
 * D: Story carousel              — 3-4 stories in a horizontal grid, each clickable.
 *
 * "Read the story" CTA uses CTAButton with variant="08" override (editorial big-Syne
 * link feel that matches a magazine-style story link). Top-right of each card.
 */

const STORAGE_KEY = 'aom_stories_variant';
const VARIANTS = ['B'];
const VARIANT_LABELS = { B: 'Twin' };
const DEFAULT_VARIANT = 'B';

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

function StoryMeta({ story, light = false }) {
  const tone = light ? 'text-[#F0ECE6]/65' : 'text-[#F0ECE6]/55';
  return (
    <div className={`flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] ${tone}`}>
      <span className="inline-flex items-center gap-1.5"><Clock size={11} className="text-[#E85D26]" /> {story.duration}</span>
      <span className="inline-flex items-center gap-1.5"><Tag size={11} className="text-[#E85D26]" /> {story.tags.join(' · ')}</span>
    </div>
  );
}

/* ───────────────────────── A — Asymmetric (big film + text card) ───────────────────────── */
function VariantA() {
  const [feature, second] = CUSTOMER_STORIES;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
      {/* Feature card */}
      <article className="lg:col-span-7 relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/[0.08] bg-black group">
        <LazyGumlet id={feature.reel} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />
        <div className="absolute top-5 left-5 right-5 flex items-start justify-between gap-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26]">{feature.eyebrow}</p>
          <CTAButton size="sm" variant="08" onClick={() => {}}>Read the story</CTAButton>
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
          <div>
            <h3 className="font-headline text-[28px] md:text-[44px] leading-[0.95] tracking-[-0.02em] max-w-xl mb-3 text-[#F0ECE6]">
              <em className="text-[#E85D26]">{feature.client}</em> {feature.title.replace(/\.$/, '')}
            </h3>
            <StoryMeta story={feature} light />
          </div>
          <button className="w-12 h-12 rounded-full bg-[#E85D26] text-[#0C0C0C] flex items-center justify-center shrink-0 hover:bg-[#FF6B2C] transition-colors">
            <Play size={18} className="fill-current" />
          </button>
        </div>
      </article>
      {/* Second card */}
      <article className="lg:col-span-5 rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02] flex flex-col">
        <div className="aspect-[16/10] bg-black relative overflow-hidden">
          <LazyGumlet id={second.reel} />
        </div>
        <div className="p-7 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26]">{second.eyebrow}</p>
            <CTAButton size="sm" variant="08" onClick={() => {}}>Read</CTAButton>
          </div>
          <h3 className="font-headline text-[24px] md:text-[28px] leading-[1.05] tracking-[-0.015em] mb-4 text-[#F0ECE6]">
            {second.title}
          </h3>
          <p className="font-body text-[14.5px] text-[#F0ECE6]/70 leading-[1.55] flex-1 mb-5">{second.body}</p>
          <StoryMeta story={second} />
        </div>
      </article>
    </div>
  );
}

/* ───────────────────────── B — Equal twin cards ───────────────────────── */
function VariantB() {
  const [first, second] = CUSTOMER_STORIES;
  const cards = [first, second];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
      {cards.map((story) => (
        <article key={story.client} className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02] flex flex-col group hover:border-[#E85D26]/35 transition-colors">
          <div className="aspect-[16/10] bg-black relative overflow-hidden">
            <LazyGumlet id={story.reel} className="transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <button className="absolute bottom-5 left-5 w-12 h-12 rounded-full bg-[#E85D26] text-[#0C0C0C] flex items-center justify-center hover:bg-[#FF6B2C] transition-colors">
              <Play size={18} className="fill-current" />
            </button>
          </div>
          <div className="p-7 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26]">{story.eyebrow}</p>
              <CTAButton size="sm" variant="08" onClick={() => {}}>Read</CTAButton>
            </div>
            <h3 className="font-headline text-[26px] md:text-[32px] leading-[1.0] tracking-[-0.02em] mb-4 text-[#F0ECE6]">
              <em className="text-[#E85D26]">{story.client}</em> {story.title.replace(/\.$/, '')}.
            </h3>
            <p className="font-body text-[14.5px] text-[#F0ECE6]/70 leading-[1.6] flex-1 mb-5">{story.body}</p>
            <StoryMeta story={story} />
          </div>
        </article>
      ))}
    </div>
  );
}

/* ───────────────────────── C — Magazine feature spread ───────────────────────── */
function VariantC() {
  const [feature] = CUSTOMER_STORIES;
  return (
    <article className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
      <div className="lg:col-span-7 relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
        <LazyGumlet id={feature.reel} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        <button className="absolute bottom-7 left-7 inline-flex items-center gap-3 bg-[#E85D26] text-[#0C0C0C] font-body font-semibold text-[13px] pl-5 pr-2 py-2 rounded-full hover:bg-[#FF6B2C] transition-colors">
          Watch the film
          <span className="w-8 h-8 rounded-full bg-[#0C0C0C] text-[#FDF6EC] flex items-center justify-center">
            <Play size={13} className="fill-current" />
          </span>
        </button>
      </div>
      <div className="lg:col-span-5 sticky top-28">
        <div className="flex items-center justify-between gap-4 mb-7">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">{feature.eyebrow}</p>
          <CTAButton size="sm" variant="08" onClick={() => {}}>Read the story</CTAButton>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#F0ECE6]/55 mb-3">Featured · {feature.client}</p>
        <h3 className="font-headline text-[40px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mb-6">
          {feature.title.split(',').map((part, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <em className="text-[#E85D26]">, </em>}
              {i === arr.length - 1 ? <em className="text-[#E85D26]">{part.trim()}</em> : part.trim()}
            </React.Fragment>
          ))}
        </h3>
        <p className="font-body text-[16px] md:text-[17px] text-[#F0ECE6]/75 leading-[1.65] first-letter:font-headline first-letter:text-[56px] first-letter:float-left first-letter:mr-3 first-letter:leading-[0.95] first-letter:text-[#E85D26]">
          {feature.body}
        </p>
        <div className="mt-7 pt-6 border-t border-white/[0.10]">
          <StoryMeta story={feature} />
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────── D — Story grid (4 stories) ───────────────────────── */
function VariantD() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {CUSTOMER_STORIES.map((story) => (
        <article key={story.client} className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02] flex flex-col group hover:border-[#E85D26]/35 transition-colors">
          <div className="aspect-[4/5] bg-black relative overflow-hidden">
            <LazyGumlet id={story.reel} className="transition-transform duration-700 group-hover:scale-[1.05]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
            <p className="absolute top-4 left-4 right-4 font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#E85D26]">{story.eyebrow}</p>
            <div className="absolute bottom-5 left-5 right-5">
              <p className="font-headline text-[22px] md:text-[26px] leading-[1.0] tracking-[-0.015em] text-[#F0ECE6] mb-2">{story.client}</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/60">{story.tags.join(' · ')} · {story.duration}</p>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <p className="font-headline text-[16px] md:text-[18px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]">{story.title}</p>
            <CTAButton size="sm" variant="08" onClick={() => {}}>Read</CTAButton>
          </div>
        </article>
      ))}
    </div>
  );
}

const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD };

export default function CustomerStoriesSection() {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || RENDER[DEFAULT_VARIANT];

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 border-t border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-3">Customer stories</p>
            <h2 className="font-headline text-[36px] md:text-[60px] leading-[0.94] tracking-[-0.025em] text-[#F0ECE6]">
              Real teams. <em className="text-[#E85D26]">Real receipts.</em>
            </h2>
          </div>
          <a href="#work" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] hover:text-[#FF6B2C] transition-colors no-underline">
            All stories →
          </a>
        </div>
        <Variant />
        {VARIANTS.length > 1 && (
          <div className="mt-12 flex justify-end">
            <VariantPicker value={variant} onChange={setVariant} />
          </div>
        )}
      </div>
    </section>
  );
}
