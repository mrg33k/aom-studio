import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import briefsIndex from '../data/briefs-index.json';

function useSEO() {
  useEffect(() => {
    document.title = 'Briefs | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'All agent reports, specs, audits, and briefs organized by topic. Strategy, design, outreach, technical, and more.');
    setMeta('og:title', 'AOM Briefs', true);
    setMeta('og:description', 'Agent reports and deliverables organized by category.', true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs', true);
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-30px' },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
});

// Fallback items that don't have frontmatter yet (shown as "Coming")
// These get merged with generated data so the list always shows the full picture.
// As agents add frontmatter, items move from this list to the generated index automatically.
const fallbackItems = [
  // Client Strategy
  { title: 'Ambition Mechanical: Market Research & Strategy', agent: 'Alex', date: 'Mar 2026', path: '/briefs/ambition-market-strategy', category: 'Strategy', summary: 'Deep market research for Ambition Mechanical. Trade orgs, 20+ GC profiles, PM firms, values alignment, and full marketing strategy.' },
  // Strategy
  { title: 'Growth Plan', agent: 'Alex', date: 'Mar 2026', path: '/growth-plan', category: 'Strategy', summary: 'Revenue growth strategy and client acquisition roadmap.' },
  { title: 'Build Proposal Template', agent: 'Alex', date: 'Mar 2026', path: null, category: 'Strategy', summary: 'Standardized proposal format for client engagements.' },
  { title: 'Case Study Brief', agent: 'Alex', date: 'Mar 2026', path: null, category: 'Strategy', summary: 'Content brief for the AOM case study page.' },
  { title: 'AI Advisory Offer Language', agent: 'Steve', date: 'Mar 2026', path: null, category: 'Strategy', summary: 'Messaging and positioning for the AI advisory service.' },
  { title: 'Biz Dev Brief', agent: 'Alex', date: 'Mar 2026', path: null, category: 'Strategy', summary: 'Business development strategy and pipeline targets.' },
  { title: 'Dashboard Brief', agent: 'Alex', date: 'Mar 2026', path: null, category: 'Strategy', summary: 'Product brief for the AOM dashboard experience.' },
  { title: 'Website V2 Direction', agent: 'Alex', date: 'Mar 2026', path: null, category: 'Strategy', summary: 'Strategic direction for the full-screen site redesign.' },
  // Design Specs
  { title: 'Case Study Design Spec', agent: 'Steffen', date: 'Mar 2026', path: null, category: 'Design Specs', summary: '16-section design spec for the AOM case study page.' },
  { title: 'Audit Deliverable Design Spec', agent: 'Steffen', date: 'Mar 2026', path: null, category: 'Design Specs', summary: 'Visual spec for the client-facing audit report.' },
  { title: 'Ambition Loader Spec', agent: 'Steffen', date: 'Mar 2026', path: null, category: 'Design Specs', summary: 'Loading animation spec for the Ambition Mechanical site.' },
  { title: 'Ambition Rebuild Spec', agent: 'Steffen', date: 'Mar 2026', path: null, category: 'Design Specs', summary: 'Full rebuild design direction for ambition-teal.vercel.app.' },
  { title: 'OG Image Spec', agent: 'Steffen', date: 'Mar 2026', path: null, category: 'Design Specs', summary: 'Standardized social preview images for all AOM pages.' },
  // Audits
  { title: 'System Audit (Mar 9)', agent: 'Elon', date: 'Mar 9', path: null, category: 'Audits', summary: 'Daily system health check and infrastructure status.' },
  { title: 'Context Efficiency Audit', agent: 'Elon', date: 'Mar 2026', path: null, category: 'Audits', summary: 'Audit of context window usage and optimization opportunities.' },
  // Client Reports
  { title: 'Client Health Dashboard', agent: 'Paige', date: 'Mar 12', path: null, category: 'Client Reports', summary: 'Client satisfaction monitoring and risk flagging system.' },
  { title: 'Onboarding Sequence', agent: 'Alex', date: 'Mar 2026', path: null, category: 'Client Reports', summary: 'New client onboarding workflow and checklist.' },
  { title: 'ROI Calculator Spec', agent: 'Steve', date: 'Mar 12', path: '/roi-calculator', category: 'Client Reports', summary: 'Interactive ROI calculator for AI advisory prospects.' },
  { title: 'Dashboard Teardown', agent: 'Elon', date: 'Mar 2026', path: null, category: 'Client Reports', summary: 'Technical teardown and improvement plan for the dashboard.' },
  // Outreach
  { title: 'Outreach Plan', agent: 'Jacob', date: 'Mar 2026', path: '/outreach-plan', category: 'Outreach', summary: 'Email outreach strategy targeting construction and CPA verticals.' },
  { title: 'HVAC Ads Research', agent: 'Alex', date: 'Mar 2026', path: '/research/hvac-ads-arizona', category: 'Outreach', summary: 'Arizona HVAC market research for targeted ad campaigns.' },
  { title: 'Cold Email Analysis Brief', agent: 'Jacob', date: 'Mar 2026', path: null, category: 'Outreach', summary: 'Performance analysis of cold email campaigns and optimization.' },
  { title: 'Voice Template', agent: 'Jacob', date: 'Mar 2026', path: null, category: 'Outreach', summary: 'Brand voice template for outreach communications.' },
  { title: 'Next Batch Research', agent: 'Jacob', date: 'Mar 2026', path: null, category: 'Outreach', summary: 'Research for the next batch of outreach prospects.' },
  { title: 'Niche Database Research', agent: 'Jacob', date: 'Mar 2026', path: null, category: 'Outreach', summary: 'Niche market database sourcing and qualification.' },
  { title: 'AZ ROC Leads', agent: 'Jacob', date: 'Mar 2026', path: null, category: 'Outreach', summary: 'Arizona Registrar of Contractors lead generation.' },
  // Technical
  { title: 'Relay Compaction Fix', agent: 'Elon', date: 'Mar 2026', path: null, category: 'Technical', summary: 'Fix for message loss during conversation compaction.' },
  { title: 'Telegram Bridge Research', agent: 'Elon', date: 'Mar 2026', path: null, category: 'Technical', summary: 'Research on Telegram bot relay architecture options.' },
  { title: 'Credential Rotation Plan', agent: 'Elon', date: 'Mar 2026', path: null, category: 'Technical', summary: 'Automated credential rotation and secret management.' },
  { title: 'Email Deliverability Report', agent: 'Elon', date: 'Mar 2026', path: null, category: 'Technical', summary: 'Email deliverability analysis and improvement recommendations.' },
  { title: 'Mom Infrastructure Audit', agent: 'Elon', date: 'Mar 2026', path: null, category: 'Technical', summary: 'Infrastructure audit of the Mom orchestration system.' },
  // Content
  { title: 'Crown V10 Plan', agent: 'Cleo', date: 'Mar 2026', path: null, category: 'Content', summary: 'Production plan for Crown video series version 10.' },
  { title: 'Ambition Footage Scan', agent: 'Cleo', date: 'Mar 2026', path: null, category: 'Content', summary: 'Footage inventory scan for Ambition Mechanical content.' },
  { title: 'Ambition Crown Editor Guide', agent: 'Cleo', date: 'Mar 2026', path: '/guides/ambition-crown', category: 'Content', summary: 'Editing guide for the Ambition Crown video project.' },
  { title: 'Memorial Tower Editor Guide', agent: 'Cleo', date: 'Mar 2026', path: '/guides/ambition-memorial-tower', category: 'Content', summary: 'Editing guide for the Memorial Tower video project.' },
  { title: 'Hook Library', agent: 'Tony', date: 'Mar 2026', path: null, category: 'Content', summary: 'Social media hook templates for content creation.' },
  { title: 'Platform Best Practices', agent: 'Tony', date: 'Mar 2026', path: null, category: 'Content', summary: 'Platform-specific posting guides for LinkedIn, IG, TikTok.' },
  // Council
  { title: 'Business Growth Strategy (Mar 10)', agent: 'Council', date: 'Mar 10', path: null, category: 'Council', summary: 'Council brief on AOM business growth strategy.' },
  { title: 'AOM Website Redesign (Mar 9)', agent: 'Council', date: 'Mar 9', path: null, category: 'Council', summary: 'Council brief on the website redesign direction.' },
  { title: 'Briefs Reorg + Offer Strategy (Mar 12)', agent: 'Council', date: 'Mar 12', path: null, category: 'Council', summary: 'Council brief on briefs reorganization and offer strategy.' },
];

// Category display order
const CATEGORY_ORDER = [
  'Strategy',
  'Design Specs',
  'Audits',
  'Client Reports',
  'Outreach',
  'Technical',
  'Content',
  'Council',
];

const FILTER_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  ...CATEGORY_ORDER.map(c => ({ value: c, label: c })),
];

// Parse a date string into something sortable.
// Generated items have ISO dates like "2026-03-15".
// Fallback items have strings like "Mar 2026", "Mar 12", "Mar 9".
function parseDateForSort(dateStr) {
  if (!dateStr) return 0;
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr).getTime();
  }
  // "Mar 12" style (no year) - assume 2026
  const monthDay = dateStr.match(/^([A-Za-z]+)\s+(\d+)$/);
  if (monthDay) {
    const d = new Date(`${monthDay[1]} ${monthDay[2]}, 2026`);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  // "Mar 2026" style
  const monthYear = dateStr.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

// Build a flat list of all briefs, merged from generated + fallback
function buildAllBriefs() {
  const generatedPaths = new Set();
  const generatedTitles = new Set();
  const allBriefs = [];

  for (const cat of briefsIndex.categories) {
    for (const item of cat.items) {
      generatedPaths.add(item.path);
      generatedTitles.add(item.title.toLowerCase());
      allBriefs.push({
        ...item,
        date: item.dateFormatted || item.date,
        dateSort: parseDateForSort(item.date),
        category: cat.name,
      });
    }
  }

  // Add fallback items that aren't already in generated data
  for (const f of fallbackItems) {
    if (f.path && generatedPaths.has(f.path)) continue;
    if (generatedTitles.has(f.title.toLowerCase())) continue;
    allBriefs.push({
      ...f,
      dateSort: parseDateForSort(f.date),
    });
  }

  return allBriefs;
}

function BriefItem({ item }) {
  const hasPage = !!item.path;

  const content = (
    <div className={`py-4 px-5 md:px-6 rounded-sm transition-all duration-200 ${
      hasPage
        ? 'hover:bg-white/[0.04] cursor-pointer group'
        : 'opacity-50'
    }`}>
      {/* Desktop layout */}
      <div className="hidden sm:block">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0 flex-1">
            <span className={`font-body text-[16px] leading-snug ${
              hasPage
                ? 'text-[#F5F0EB] group-hover:text-aom-orange transition-colors'
                : 'text-[#F5F0EB]/50'
            }`}>
              {item.title}
            </span>
            {!hasPage && (
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/20 shrink-0">
                Coming
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-4 ml-4 shrink-0">
            <span className="font-mono text-[13px] text-aom-orange/70">
              {item.category}
            </span>
            <span className="font-mono text-sm text-[#7C9A72]">
              {item.agent}
            </span>
            <span className="font-mono text-[13px] font-semibold text-[#A8A29E]/70 min-w-[80px] text-right tabular-nums" title={item.date}>
              {item.date}
            </span>
          </div>
        </div>
        {item.summary && (
          <p className="font-body text-[14px] text-aom-text-muted leading-relaxed mt-1.5 max-w-[70ch]">
            {item.summary}
          </p>
        )}
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden">
        <div className="flex items-start gap-2">
          <span className={`font-body text-[16px] leading-snug ${
            hasPage
              ? 'text-[#F5F0EB] group-hover:text-aom-orange transition-colors'
              : 'text-[#F5F0EB]/50'
          }`}>
            {item.title}
          </span>
          {!hasPage && (
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/20 shrink-0 mt-1">
              Coming
            </span>
          )}
        </div>
        {item.summary && (
          <p className="font-body text-[13px] text-aom-text-muted leading-relaxed mt-1">
            {item.summary}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono text-[11px] text-aom-orange/70">
            {item.category}
          </span>
          <span className="font-mono text-xs text-[#7C9A72]">
            {item.agent}
          </span>
          <span className="font-mono text-xs font-semibold text-[#A8A29E]/70 tabular-nums">
            {item.date}
          </span>
        </div>
      </div>
    </div>
  );

  if (hasPage) {
    return <a href={item.path} className="block">{content}</a>;
  }
  return content;
}

function CategoryDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = FILTER_OPTIONS.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full sm:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full sm:w-auto flex items-center justify-between gap-3
          bg-[#1A1A17] border transition-colors duration-300
          font-body text-[16px] text-[#F5F0EB]
          px-5 py-3.5 min-w-[220px]
          ${isOpen ? 'border-aom-orange/40' : 'border-white/10 hover:border-white/20'}
        `}
      >
        <span>{selectedOption?.label || 'Recent'}</span>
        <ChevronDown
          size={16}
          className={`text-[#7C9A72] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 top-full left-0 right-0 sm:right-auto mt-1 bg-[#1A1A17] border border-white/10 shadow-lg min-w-[220px]"
          >
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-5 py-3 font-body text-[15px] transition-colors duration-150
                  ${value === option.value
                    ? 'text-aom-orange bg-white/[0.04]'
                    : 'text-[#F5F0EB]/70 hover:text-[#F5F0EB] hover:bg-white/[0.03]'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BriefsHub() {
  useSEO();

  const allBriefs = useMemo(() => buildAllBriefs(), []);

  const [activeFilter, setActiveFilter] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchRef = useRef(null);

  // Debounce search input by 150ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle hash-based filter
  useEffect(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash) {
      const matchedCategory = CATEGORY_ORDER.find(
        c => c.toLowerCase().replace(/\s+/g, '-') === hash
      );
      if (matchedCategory) {
        setActiveFilter(matchedCategory);
      }
    }
  }, []);

  // Filter by category
  const categoryFiltered = useMemo(() => {
    if (activeFilter === 'recent') return allBriefs;
    return allBriefs.filter(b => b.category === activeFilter);
  }, [allBriefs, activeFilter]);

  // Filter by search
  const displayBriefs = useMemo(() => {
    let results = categoryFiltered;
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      results = results.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.agent.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.summary && item.summary.toLowerCase().includes(q))
      );
    }
    // Sort by date descending (newest first)
    return [...results].sort((a, b) => (b.dateSort || 0) - (a.dateSort || 0));
  }, [categoryFiltered, debouncedQuery]);

  // Handle Escape to clear search
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setDebouncedQuery('');
      searchRef.current?.blur();
    }
  }, []);

  const totalItems = allBriefs.length;
  const liveItems = allBriefs.filter(i => i.path).length;
  const isSearching = debouncedQuery.length > 0;

  return (
    <div className="bg-[#0A0A08] min-h-screen">
      {/* Shared nav */}
      <SiteNav />

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-20 md:pb-28 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">

          <motion.p
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#7C9A72] mb-4"
            {...fadeUp(0.05)}
          >
            Reports + Deliverables
          </motion.p>

          <motion.div {...fadeUp(0.08)}>
            <div className="w-12 h-[2px] bg-aom-orange mb-6" />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-[-0.02em] text-[#F5F0EB] leading-[0.95] mb-6"
            {...fadeUp(0.12)}
          >
            BRIEFS
          </motion.h1>

          <motion.p
            className="font-body text-lg text-aom-text-muted leading-relaxed max-w-[55ch] mb-8"
            {...fadeUp(0.16)}
          >
            Every agent report, design spec, audit, and strategy brief. Organized by topic, produced by specialized agents, reviewed before publishing.
          </motion.p>

          <motion.div
            className="flex items-center gap-6"
            {...fadeUp(0.2)}
          >
            <span className="font-mono text-sm text-[#7C9A72]">
              {totalItems} total
            </span>
            <span className="font-mono text-sm text-aom-text-muted">
              {liveItems} live
            </span>
            <span className="font-mono text-sm text-aom-text-muted">
              {CATEGORY_ORDER.length} categories
            </span>
          </motion.div>
        </div>
      </section>

      {/* Filter bar: dropdown + search */}
      <section className="px-6 md:px-12 pb-8">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-3">
            <CategoryDropdown
              value={activeFilter}
              onChange={setActiveFilter}
            />
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-aom-text-muted pointer-events-none"
              />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search briefs..."
                className="w-full bg-[#1A1A17] border border-white/10 focus:border-aom-orange/40 focus:outline-none font-body text-base text-[#F5F0EB] placeholder:text-aom-text-muted pl-12 pr-5 py-3.5 rounded-none transition-colors duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedQuery('');
                  }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-aom-text-muted hover:text-[#F5F0EB] transition-colors"
                >
                  <span className="font-mono text-xs uppercase tracking-wider">Clear</span>
                </button>
              )}
            </div>
          </motion.div>
          {isSearching && (
            <p className="font-mono text-xs text-aom-text-muted mt-3">
              {displayBriefs.length} {displayBriefs.length === 1 ? 'result' : 'results'}
              {activeFilter !== 'recent' ? ` in ${activeFilter}` : ''}
            </p>
          )}
        </div>
      </section>

      {/* Brief list */}
      <section className="px-6 md:px-12 pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="border-t border-white/[0.06]">
            {displayBriefs.length > 0 ? (
              displayBriefs.map((item, i) => (
                <motion.div
                  key={item.title + item.agent + i}
                  className="border-b border-white/[0.06]"
                  {...(isSearching ? {} : fadeUp(Math.min(i * 0.03, 0.5)))}
                >
                  <BriefItem item={item} />
                </motion.div>
              ))
            ) : (
              <div className="py-16 text-center">
                <p className="font-body text-lg text-aom-text-muted">
                  {isSearching
                    ? `No briefs found for "${debouncedQuery}"`
                    : `No briefs in ${activeFilter}`
                  }
                </p>
                {isSearching && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedQuery('');
                    }}
                    className="font-mono text-sm text-aom-orange hover:underline mt-4"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Shared footer */}
      <SiteFooter />
    </div>
  );
}
