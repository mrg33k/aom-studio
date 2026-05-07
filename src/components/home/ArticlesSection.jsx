import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, ArrowUpRight, Globe, Palette, Film, Plus } from 'lucide-react';
import LazyGumlet from './LazyGumlet';
import { ARTICLES } from './content';

/**
 * ArticlesSection — portfolio-as-article.
 *
 * Timeline/rail variants. Patrik picked Rail (B) but wants cleaner options
 * to compare against — F/G/H are progressively quieter takes on the same
 * left-rail timeline shape.
 *
 *   B: Rail (full)        — adaptive media frame per orientation, type pills,
 *                           aspect badges, dual meta rows. Most info-dense.
 *   F: Rail · Quiet       — same rail anchor, no pills/badges, single meta
 *                           line, lighter card chrome, more whitespace.
 *   G: Rail · Editorial   — borderless, magazine-spread, big Syne headlines,
 *                           hairline dividers between items, no card chrome.
 *   H: Rail · Index       — text-led TOC, tiny square thumbs, hover reveals
 *                           floating preview, pure scannable list.
 *
 * (A/C/D/E kept in code for fallback; not exposed in picker.)
 *
 * All variants support load-more so the timeline keeps going.
 */

const STORAGE_KEY = 'aom_articles_variant';
const VARIANTS = ['B'];
const VARIANT_LABELS = { B: 'Rail' };
const DEFAULT_VARIANT = 'B';

const TYPE_META = {
  website: { label: 'Website', icon: Globe,   color: '#7C9A72' },
  brand:   { label: 'Brand',   icon: Palette, color: '#C9A84C' },
  video:   { label: 'Video',   icon: Film,    color: '#E85D26' },
};

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

function TypePill({ type, size = 'sm' }) {
  const meta = TYPE_META[type] || TYPE_META.brand;
  const Icon = meta.icon;
  const sizeCls = size === 'lg' ? 'text-[10px] px-3 py-1.5' : 'text-[9.5px] px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.22em] rounded-full bg-black/40 backdrop-blur border ${sizeCls}`} style={{ borderColor: meta.color + '50', color: meta.color }}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

const sortedArticles = (xs) => [...xs].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

const groupByMonth = (articles) => {
  const groups = [];
  let lastMonth = null;
  articles.forEach((a) => {
    if (a.month !== lastMonth) { groups.push({ month: a.month, items: [] }); lastMonth = a.month; }
    groups[groups.length - 1].items.push(a);
  });
  return groups;
};

function LoadMore({ onClick, remaining, label = 'Continue the timeline' }) {
  if (!remaining) return (
    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F0ECE6]/45 text-center">End of the visible timeline · More in the archive</p>
  );
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2.5 border border-[#E85D26]/40 hover:border-[#E85D26] bg-[#E85D26]/[0.08] hover:bg-[#E85D26]/[0.15] rounded-full px-7 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] transition-colors">
      <Plus size={14} /> {label} · {remaining} more
    </button>
  );
}

/* ───────────────────────── A — Spine timeline (centered, alternating) ───────────────────────── */
function VariantA() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(8);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  return (
    <div className="relative">
      <div className="absolute top-0 bottom-12 left-6 md:left-1/2 md:-translate-x-1/2 w-px bg-gradient-to-b from-[#E85D26]/60 via-[#E85D26]/15 to-transparent" />
      <div className="relative space-y-2">
        {grouped.map((group) => (
          <div key={group.month}>
            <div className="relative flex items-center justify-start md:justify-center mb-8 mt-12 first:mt-0">
              <div className="flex items-center gap-3 bg-[#0C0C0C] pl-4 md:px-5 py-2 relative z-10">
                <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
                <p className="font-headline text-[24px] md:text-[32px] tracking-[-0.02em] text-[#F0ECE6]">{group.month}</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26]/85">{group.items.length} {group.items.length === 1 ? 'piece' : 'pieces'}</span>
              </div>
            </div>
            <div className="space-y-6">
              {group.items.map((article, i) => {
                const onRight = i % 2 === 1;
                return (
                  <div key={article.slug} className="relative grid grid-cols-1 md:grid-cols-2 md:gap-12">
                    {!onRight && <div className="hidden md:block" />}
                    <a href={`/articles/${article.slug}`} className={`group block relative rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-[#E85D26]/35 transition-colors overflow-hidden no-underline pl-12 md:pl-0 ${onRight ? 'md:order-2' : 'md:order-1'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-5">
                        <div className="sm:col-span-2 aspect-[5/4] sm:aspect-auto bg-black relative overflow-hidden min-h-[140px]">
                          <LazyGumlet id={article.reel} className="transition-transform duration-700 group-hover:scale-[1.04]" />
                          <div className="absolute top-2 left-2"><TypePill type={article.type} /></div>
                        </div>
                        <div className="sm:col-span-3 p-5 md:p-6 flex flex-col gap-3">
                          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26]/85">{article.client} · {article.discipline}</p>
                          <h3 className="font-headline text-[18px] md:text-[22px] leading-[1.15] tracking-[-0.012em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">{article.headline}</h3>
                          <p className="font-body text-[13px] md:text-[13.5px] text-[#F0ECE6]/65 leading-[1.55]">{article.dek}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] mt-auto">
                            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{article.readTime}</span>
                            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-1.5 group-hover:gap-2 transition-all">
                              Read <ArrowUpRight size={12} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                    <span className="absolute top-7 left-3 md:left-auto md:top-7 w-3 h-3 rounded-full bg-[#E85D26] ring-4 ring-[#0C0C0C] z-10 md:hidden" />
                    <span className="hidden md:block absolute top-7 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#E85D26] ring-4 ring-[#0C0C0C] z-10" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="relative flex flex-col items-center mt-16 gap-4">
        <span className="absolute -top-4 left-6 md:left-1/2 md:-translate-x-1/2 w-3 h-3 rounded-full bg-[#E85D26]/40 ring-4 ring-[#0C0C0C]" />
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} />
      </div>
    </div>
  );
}

/* ───────────────────────── B — Rail timeline (left rail dots, single column) ─────────────────────────
 * Adaptive media frame per orientation:
 *   horizontal (16:9 case-study reels) → wide hero on the left, ~33% of card width.
 *   vertical (9:16 social reels)       → tall poster on the left, ~25% of card width, full row height.
 * Each video looks right in its native frame; the timeline gets editorial rhythm from the mix.
 */
function VariantB() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(8);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  return (
    <div className="relative pl-12 md:pl-20">
      {/* Vertical rail */}
      <div className="absolute top-0 bottom-12 left-3 md:left-7 w-px bg-gradient-to-b from-[#E85D26]/60 via-[#E85D26]/20 to-transparent" />

      <div className="space-y-12">
        {grouped.map((group) => (
          <div key={group.month}>
            {/* Month anchor */}
            <div className="relative mb-7 -ml-12 md:-ml-20 pl-12 md:pl-20">
              <span className="absolute top-2 left-0 md:left-4 w-7 h-7 rounded-full bg-[#E85D26] flex items-center justify-center ring-4 ring-[#0C0C0C]">
                <Calendar size={13} className="text-[#0C0C0C]" />
              </span>
              <div className="flex items-baseline gap-4">
                <p className="font-headline text-[34px] md:text-[44px] tracking-[-0.025em] text-[#F0ECE6]">{group.month}</p>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26]/85">{group.items.length} {group.items.length === 1 ? 'piece shipped' : 'pieces shipped'}</p>
              </div>
            </div>

            <div className="space-y-5">
              {group.items.map((article) => {
                const isVertical = article.aspect === 'vertical';
                return (
                  <a key={article.slug} href={`/articles/${article.slug}`} className="group relative block rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-[#E85D26]/35 transition-colors no-underline">
                    {/* Rail dot */}
                    <span className="absolute top-7 -left-12 md:-left-[3.5rem] w-3 h-3 rounded-full bg-[#E85D26] ring-4 ring-[#0C0C0C]" />
                    {/* Connector to rail */}
                    <span className="absolute top-[2.05rem] -left-9 md:-left-[2.6rem] w-7 md:w-9 h-px bg-[#E85D26]/40" />

                    <div className="grid grid-cols-1 sm:grid-cols-12 overflow-hidden rounded-2xl">
                      {/* Media frame — video if reel exists, otherwise a typographic card */}
                      <div
                        className={
                          isVertical
                            ? 'sm:col-span-3 aspect-[9/14] sm:aspect-auto sm:min-h-[300px] bg-black relative overflow-hidden'
                            : 'sm:col-span-5 aspect-[16/10] sm:aspect-auto sm:min-h-[200px] bg-black relative overflow-hidden'
                        }
                      >
                        {article.reel ? (
                          <>
                            <LazyGumlet
                              id={article.reel}
                              portrait={isVertical}
                              className="transition-transform duration-700 group-hover:scale-[1.04]"
                            />
                            <span className="absolute bottom-2.5 right-2.5 font-mono text-[9px] uppercase tracking-[0.22em] bg-black/65 backdrop-blur text-[#F0ECE6]/70 rounded-full px-2 py-0.5">
                              {isVertical ? '9:16' : '16:9'}
                            </span>
                          </>
                        ) : article.image ? (
                          <>
                            <img
                              src={article.image}
                              alt={article.client}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                            <span className="absolute bottom-2.5 right-2.5 font-mono text-[9px] uppercase tracking-[0.22em] bg-black/65 backdrop-blur text-[#F0ECE6]/70 rounded-full px-2 py-0.5">
                              {article.type === 'website' ? 'Web' : article.type === 'brand' ? 'Brand' : 'Read'}
                            </span>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#0C0C0C]">
                            <div
                              className="absolute inset-0 opacity-[0.18]"
                              style={{
                                backgroundImage: 'radial-gradient(rgba(232,93,38,0.6) 1px, transparent 1px)',
                                backgroundSize: '14px 14px',
                              }}
                            />
                            <div className="relative text-center">
                              <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#E85D26] mb-3">{article.discipline}</p>
                              <p className="font-headline text-[28px] md:text-[40px] leading-[0.95] tracking-[-0.02em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">
                                {article.client}
                              </p>
                            </div>
                            <span className="absolute bottom-2.5 right-2.5 font-mono text-[9px] uppercase tracking-[0.22em] bg-black/65 backdrop-blur text-[#F0ECE6]/70 rounded-full px-2 py-0.5">
                              {article.type === 'website' ? 'Web' : article.type === 'brand' ? 'Brand' : 'Read'}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <TypePill type={article.type} />
                        </div>
                      </div>

                      {/* Text column — wider when media is vertical */}
                      <div className={`${isVertical ? 'sm:col-span-9' : 'sm:col-span-7'} p-6 md:p-8 flex flex-col gap-3 justify-center`}>
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]">{article.discipline}</p>
                          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{article.readTime}</p>
                        </div>
                        <h3 className={`font-headline leading-[1.1] tracking-[-0.015em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors ${isVertical ? 'text-[24px] md:text-[34px]' : 'text-[22px] md:text-[28px]'}`}>
                          {article.headline}
                        </h3>
                        <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/65 leading-[1.55] max-w-2xl">{article.dek}</p>
                        {article.forAudience && (
                          <div className="flex items-start gap-3 pt-3 border-t border-white/[0.08]">
                            <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#E85D26]/90 shrink-0 mt-[3px]">For</p>
                            <p className="font-body text-[13px] md:text-[13.5px] text-[#F0ECE6]/85 leading-[1.5] italic">{article.forAudience}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-3 mt-auto">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{article.client} · {article.industry}</p>
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                            Read article <ArrowUpRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-12 -ml-12 md:-ml-20 pl-12 md:pl-20">
        <span className="absolute top-3 left-0 md:left-4 w-7 h-7 rounded-full bg-[#E85D26]/40 flex items-center justify-center ring-4 ring-[#0C0C0C]">
          <Plus size={13} className="text-[#E85D26]" />
        </span>
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} />
      </div>
    </div>
  );
}

/* ───────────────────────── C — Newspaper feed (date-banded dense rows) ───────────────────────── */
function VariantC() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(6);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  return (
    <div className="space-y-12">
      {grouped.map((group) => (
        <div key={group.month}>
          <div className="border-y border-[#E85D26]/30 py-3 mb-2 flex items-baseline justify-between gap-4">
            <p className="font-headline text-[28px] md:text-[36px] tracking-[-0.02em] text-[#F0ECE6]">{group.month}</p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26]/85">{group.items.length} {group.items.length === 1 ? 'article' : 'articles'} · This month</p>
          </div>
          <div className="divide-y divide-white/[0.08]">
            {group.items.map((article) => (
              <a key={article.slug} href={`/articles/${article.slug}`} className="group grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 py-7 md:py-9 hover:bg-white/[0.02] transition-colors no-underline">
                <div className="md:col-span-3 aspect-[5/4] md:aspect-[4/5] rounded-xl overflow-hidden bg-black relative">
                  <LazyGumlet id={article.reel} className="transition-transform duration-700 group-hover:scale-[1.04]" />
                  <div className="absolute top-3 left-3"><TypePill type={article.type} /></div>
                </div>
                <div className="md:col-span-7 flex flex-col gap-3 justify-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]">{article.industry} · {article.discipline}</p>
                  <h3 className="font-headline text-[26px] md:text-[36px] leading-[1.0] tracking-[-0.018em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">{article.headline}</h3>
                  <p className="font-body text-[14.5px] md:text-[15.5px] text-[#F0ECE6]/70 leading-[1.6] max-w-2xl">{article.dek}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mt-1">{article.client} · {article.readTime}</p>
                </div>
                <div className="md:col-span-2 flex md:items-center md:justify-end">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#E85D26]/40 text-[#E85D26] group-hover:bg-[#E85D26] group-hover:text-[#0C0C0C] transition-colors shrink-0">
                    <ArrowUpRight size={18} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-center pt-4 border-t border-white/[0.08]">
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} label="See more articles" />
      </div>
    </div>
  );
}

/* ───────────────────────── D — Editorial index (table-of-contents minimal) ───────────────────────── */
function VariantD() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(8);
  const [hovered, setHovered] = useState(null);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  return (
    <div className="space-y-10">
      {grouped.map((group) => (
        <div key={group.month}>
          {/* Month line */}
          <div className="flex items-center gap-5 mb-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#E85D26]">{group.month}</p>
            <span className="flex-1 h-px bg-[#E85D26]/25" />
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{String(group.items.length).padStart(2, '0')}</p>
          </div>
          <div>
            {group.items.map((article, i) => {
              const idx = all.indexOf(article) + 1;
              const isHovered = hovered === article.slug;
              return (
                <a
                  key={article.slug}
                  href={`/articles/${article.slug}`}
                  onMouseEnter={() => setHovered(article.slug)}
                  onMouseLeave={() => setHovered(null)}
                  className="group relative block py-5 md:py-6 border-b border-white/[0.08] hover:border-[#E85D26]/40 no-underline"
                >
                  <div className="grid grid-cols-12 gap-4 md:gap-6 items-baseline">
                    <span className="col-span-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26]">{String(idx).padStart(3, '0')}</span>
                    <div className="col-span-11 md:col-span-7 flex flex-col gap-1.5">
                      <h3 className="font-headline text-[22px] md:text-[34px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">{article.headline}</h3>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{article.client} · {article.industry}</p>
                    </div>
                    <span className="hidden md:flex col-span-2 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">
                      <TypePill type={article.type} />
                    </span>
                    <span className="hidden md:flex col-span-1 items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{article.readTime}</span>
                    <span className="hidden md:flex col-span-1 items-center justify-end font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26] gap-1.5 group-hover:gap-2.5 transition-all">
                      <ArrowUpRight size={14} />
                    </span>
                  </div>
                  {/* Hover thumbnail preview, floating right */}
                  <div className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-44 aspect-[16/10] rounded-lg overflow-hidden bg-black border border-[#E85D26]/40 shadow-[0_10px_40px_rgba(232,93,38,0.25)] transition-all duration-300 hidden lg:block ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                    <LazyGumlet id={article.reel} eager />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-center pt-4">
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} label="More from the index" />
      </div>
    </div>
  );
}

/* ───────────────────────── E — Magazine rows (alternating image position) ───────────────────────── */
function VariantE() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(6);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  let rowIndex = 0;
  return (
    <div className="space-y-16 md:space-y-20">
      {grouped.map((group) => (
        <div key={group.month}>
          <div className="flex items-baseline gap-5 mb-10">
            <p className="font-headline text-[44px] md:text-[64px] tracking-[-0.025em] text-[#F0ECE6]">{group.month}</p>
            <span className="flex-1 h-px bg-[#E85D26]/30" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26]/85">{group.items.length} {group.items.length === 1 ? 'piece' : 'pieces'} this month</p>
          </div>
          <div className="space-y-16 md:space-y-20">
            {group.items.map((article) => {
              const imageRight = rowIndex % 2 === 1;
              rowIndex++;
              return (
                <a key={article.slug} href={`/articles/${article.slug}`} className="group grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center no-underline">
                  <div className={`lg:col-span-7 ${imageRight ? 'lg:order-2' : 'lg:order-1'} relative aspect-[16/10] rounded-2xl overflow-hidden bg-black`}>
                    <LazyGumlet id={article.reel} className="transition-transform duration-1000 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <TypePill type={article.type} size="lg" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] bg-black/60 backdrop-blur text-[#F0ECE6] rounded-full px-3 py-1.5">{article.month}</span>
                    </div>
                  </div>
                  <div className={`lg:col-span-5 ${imageRight ? 'lg:order-1 lg:pr-6' : 'lg:order-2 lg:pl-6'} flex flex-col gap-5`}>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">{article.industry} · {article.discipline}</p>
                    <h3 className="font-headline text-[32px] md:text-[48px] leading-[0.98] tracking-[-0.02em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">{article.headline}</h3>
                    <p className="font-body text-[15.5px] md:text-[17px] text-[#F0ECE6]/70 leading-[1.6] first-letter:font-headline first-letter:text-[44px] first-letter:float-left first-letter:mr-2.5 first-letter:leading-[0.95] first-letter:text-[#E85D26]">{article.dek}</p>
                    <div className="flex items-center justify-between pt-5 border-t border-white/[0.10]">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{article.client} · {article.readTime}</p>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        Read the article <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-center pt-4 border-t border-white/[0.08]">
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} label="More features" />
      </div>
    </div>
  );
}

/* ───────────────────────── F — Rail · Quiet (stripped, more breathing room) ─────────────────────────
 * Same left-rail timeline as B but the card chrome and meta is dialed way down.
 * No type pills, no aspect badges, no top-meta row — just a single subtle byline.
 * Image still adapts to orientation. Card border is barely there. Hover lights it.
 */
function VariantF() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(8);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  return (
    <div className="relative pl-12 md:pl-16">
      <div className="absolute top-0 bottom-12 left-3 md:left-5 w-px bg-[#E85D26]/25" />

      <div className="space-y-14 md:space-y-16">
        {grouped.map((group) => (
          <div key={group.month}>
            <div className="relative mb-8 -ml-12 md:-ml-16 pl-12 md:pl-16">
              <span className="absolute top-3 left-1.5 md:left-3 w-3.5 h-3.5 rounded-full bg-[#E85D26] ring-4 ring-[#0C0C0C]" />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">{group.month}</p>
            </div>

            <div className="space-y-8 md:space-y-10">
              {group.items.map((article) => {
                const isVertical = article.aspect === 'vertical';
                return (
                  <a key={article.slug} href={`/articles/${article.slug}`} className="group relative block no-underline">
                    {/* Rail dot — small, subtle */}
                    <span className="absolute top-6 -left-12 md:-left-[3.4rem] w-2 h-2 rounded-full bg-[#E85D26]/60 ring-2 ring-[#0C0C0C]" />
                    <span className="absolute top-[1.85rem] -left-9 md:-left-12 w-7 md:w-9 h-px bg-[#E85D26]/20" />

                    <div className={`grid grid-cols-1 ${isVertical ? 'sm:grid-cols-12' : 'sm:grid-cols-12'} gap-5 md:gap-7`}>
                      <div
                        className={
                          isVertical
                            ? 'sm:col-span-2 aspect-[9/14] sm:aspect-auto sm:min-h-[180px] bg-black relative overflow-hidden rounded-lg'
                            : 'sm:col-span-4 aspect-[16/10] sm:aspect-auto sm:min-h-[150px] bg-black relative overflow-hidden rounded-lg'
                        }
                      >
                        <LazyGumlet
                          id={article.reel}
                          portrait={isVertical}
                          className="transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className={`${isVertical ? 'sm:col-span-10' : 'sm:col-span-8'} flex flex-col justify-center gap-2.5`}>
                        <h3 className={`font-headline leading-[1.1] tracking-[-0.015em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors ${isVertical ? 'text-[26px] md:text-[36px]' : 'text-[22px] md:text-[30px]'}`}>
                          {article.headline}
                        </h3>
                        <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/65 leading-[1.55] max-w-2xl">{article.dek}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mt-2 inline-flex items-center gap-2">
                          <span>{article.client}</span>
                          <span className="text-[#E85D26]/50">·</span>
                          <span>{article.discipline}</span>
                          <span className="text-[#E85D26]/50">·</span>
                          <span>{article.readTime}</span>
                          <ArrowUpRight size={11} className="text-[#E85D26] opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-14 -ml-12 md:-ml-16 pl-12 md:pl-16">
        <span className="absolute top-3 left-1.5 md:left-3 w-3 h-3 rounded-full bg-[#E85D26]/30 ring-4 ring-[#0C0C0C]" />
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} />
      </div>
    </div>
  );
}

/* ───────────────────────── G — Rail · Editorial (magazine-spread typography) ─────────────────────────
 * No card chrome at all. Each article is just typography + image, separated by
 * hairline rules. Big Syne headline carries the row. Reads like a magazine
 * features index. Rail anchors months only.
 */
function VariantG() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(6);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  return (
    <div className="relative">
      <div className="space-y-20 md:space-y-24">
        {grouped.map((group) => (
          <div key={group.month}>
            <div className="flex items-baseline gap-6 mb-12 md:mb-14 border-b border-[#E85D26]/30 pb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E85D26]" />
              <p className="font-headline text-[40px] md:text-[64px] tracking-[-0.025em] text-[#F0ECE6] leading-none">{group.month}</p>
              <span className="flex-1" />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">Vol. {String(grouped.indexOf(group) + 1).padStart(2, '0')} · {group.items.length} {group.items.length === 1 ? 'feature' : 'features'}</p>
            </div>

            <div>
              {group.items.map((article, i) => {
                const isVertical = article.aspect === 'vertical';
                const isLast = i === group.items.length - 1;
                return (
                  <a key={article.slug} href={`/articles/${article.slug}`} className={`group block no-underline py-12 md:py-14 ${isLast ? '' : 'border-b border-white/[0.08]'}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
                      <div
                        className={
                          isVertical
                            ? 'lg:col-span-3 aspect-[9/14] lg:aspect-auto lg:min-h-[280px] bg-black relative overflow-hidden'
                            : 'lg:col-span-5 aspect-[16/10] lg:aspect-auto lg:min-h-[240px] bg-black relative overflow-hidden'
                        }
                      >
                        <LazyGumlet
                          id={article.reel}
                          portrait={isVertical}
                          className="transition-transform duration-1000 group-hover:scale-[1.04]"
                        />
                      </div>
                      <div className={`${isVertical ? 'lg:col-span-9' : 'lg:col-span-7'} flex flex-col gap-5`}>
                        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#E85D26]">{article.industry} · {article.discipline}</p>
                        <h3 className={`font-headline leading-[0.98] tracking-[-0.025em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors ${isVertical ? 'text-[36px] md:text-[56px]' : 'text-[30px] md:text-[48px]'}`}>
                          {article.headline}
                        </h3>
                        <p className="font-body text-[15.5px] md:text-[17px] text-[#F0ECE6]/70 leading-[1.6] max-w-2xl">{article.dek}</p>
                        <div className="flex items-baseline gap-5 mt-2">
                          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">By the team · {article.client} · {article.readTime}</p>
                          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-2 group-hover:gap-3 transition-all ml-auto">
                            Read the article <ArrowUpRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-12 mt-8 border-t border-white/[0.08]">
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} label="More features" />
      </div>
    </div>
  );
}

/* ───────────────────────── H — Rail · Index (text-led TOC with hover preview) ─────────────────────────
 * The cleanest extreme. Items are date + headline + tiny meta. Tiny square
 * thumbnail inline. Hovering reveals a larger floating preview on desktop.
 * No card backgrounds. Pure scannable list. Best for "I am exploring all 12".
 */
function VariantH() {
  const all = sortedArticles(ARTICLES);
  const [shown, setShown] = useState(10);
  const [hovered, setHovered] = useState(null);
  const visible = all.slice(0, shown);
  const grouped = useMemo(() => groupByMonth(visible), [visible]);
  const remaining = all.length - shown;

  return (
    <div className="relative">
      <div className="space-y-12">
        {grouped.map((group) => (
          <div key={group.month}>
            <div className="flex items-center gap-4 mb-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">{group.month}</p>
              <span className="flex-1 h-px bg-[#E85D26]/25" />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{String(group.items.length).padStart(2, '0')}</p>
            </div>
            <div>
              {group.items.map((article) => {
                const isHovered = hovered === article.slug;
                const isVertical = article.aspect === 'vertical';
                return (
                  <a
                    key={article.slug}
                    href={`/articles/${article.slug}`}
                    onMouseEnter={() => setHovered(article.slug)}
                    onMouseLeave={() => setHovered(null)}
                    className="group relative grid grid-cols-12 items-center gap-4 md:gap-5 py-5 md:py-6 border-b border-white/[0.08] hover:border-[#E85D26]/40 no-underline"
                  >
                    {/* Tiny inline square thumb */}
                    <div className="col-span-2 sm:col-span-1 aspect-square bg-black relative overflow-hidden rounded">
                      <LazyGumlet id={article.reel} portrait={isVertical} />
                    </div>
                    {/* Headline + tiny byline */}
                    <div className="col-span-10 sm:col-span-9 md:col-span-7 flex flex-col gap-1.5">
                      <h3 className="font-headline text-[20px] md:text-[28px] leading-[1.1] tracking-[-0.018em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">{article.headline}</h3>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{article.client} · {article.industry} · {article.discipline}</p>
                    </div>
                    {/* Right meta — readtime + arrow */}
                    <div className="hidden sm:flex col-span-2 md:col-span-4 items-center justify-end gap-4 md:gap-6">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{article.readTime}</p>
                      <span className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full border border-[#E85D26]/30 text-[#E85D26] group-hover:bg-[#E85D26] group-hover:text-[#0C0C0C] transition-colors shrink-0">
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                    {/* Hover floating preview — desktop only */}
                    <div className={`pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 ${isVertical ? 'w-32 aspect-[9/14]' : 'w-52 aspect-[16/10]'} rounded-lg overflow-hidden bg-black border border-[#E85D26]/40 shadow-[0_10px_50px_rgba(232,93,38,0.30)] transition-all duration-300 hidden lg:block ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'}`}>
                      {isHovered && <LazyGumlet id={article.reel} portrait={isVertical} eager />}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <LoadMore onClick={() => setShown((s) => s + 4)} remaining={remaining} label="More from the index" />
      </div>
    </div>
  );
}

const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD, E: VariantE, F: VariantF, G: VariantG, H: VariantH };

export default function ArticlesSection() {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || RENDER[DEFAULT_VARIANT];

  return (
    <section id="work" className="py-24 md:py-32 px-6 md:px-12 border-t border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-3">Field notes · Articles + portfolio</p>
            <h2 className="font-headline text-[36px] md:text-[60px] leading-[0.94] tracking-[-0.025em] text-[#F0ECE6]">
              Every project, <em className="text-[#E85D26]">written down.</em>
            </h2>
            <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 mt-4 max-w-2xl leading-[1.6]">
              Websites, brand systems, and films. Each piece doubles as an article — what we shipped, how we approached it, what we would do differently. Useful if you found us through Google. Useful if you are about to hire us.
            </p>
          </div>
          <a href="/articles" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] hover:text-[#FF6B2C] transition-colors no-underline">
            All articles →
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
