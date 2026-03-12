import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

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

// All briefs organized by category
const categories = [
  {
    name: 'Strategy',
    items: [
      { title: 'Partnership Strategy', agent: 'Alex', date: 'Mar 10', path: '/briefs/partnerships', summary: 'Why partnerships beat cold email. 30+ specific targets for AOM growth.' },
      { title: 'AI Advisory Services Strategy', agent: 'Steve', date: 'Mar 10', path: '/briefs/ai-advisory', summary: 'How AOM turns its internal AI system into a sellable product.' },
      { title: 'AI Advisory Sprint Plan', agent: 'Council', date: 'Mar 10', path: '/briefs/sprint-plan', summary: 'Multi-agent sprint plan for the AI advisory product launch.' },
      { title: 'Growth Plan', agent: 'Alex', date: 'Mar 2026', path: '/growth-plan', summary: 'Revenue growth strategy and client acquisition roadmap.' },
      { title: 'Build Proposal Template', agent: 'Alex', date: 'Mar 2026', path: null, summary: 'Standardized proposal format for client engagements.' },
      { title: 'Case Study Brief', agent: 'Alex', date: 'Mar 2026', path: null, summary: 'Content brief for the AOM case study page.' },
      { title: 'AI Advisory Offer Language', agent: 'Steve', date: 'Mar 2026', path: null, summary: 'Messaging and positioning for the AI advisory service.' },
      { title: 'Biz Dev Brief', agent: 'Alex', date: 'Mar 2026', path: null, summary: 'Business development strategy and pipeline targets.' },
      { title: 'Dashboard Brief', agent: 'Alex', date: 'Mar 2026', path: null, summary: 'Product brief for the AOM dashboard experience.' },
      { title: 'Website V2 Direction', agent: 'Alex', date: 'Mar 2026', path: null, summary: 'Strategic direction for the full-screen site redesign.' },
    ],
  },
  {
    name: 'Design Specs',
    items: [
      { title: 'Full-Screen Site Redesign', agent: 'Steffen', date: 'Mar 11', path: '/briefs/fullscreen-site', summary: '8-slide scroll-snap pitch deck experience for aheadofmarket.com.' },
      { title: 'Ideas Tracker (Brain Map)', agent: 'Steffen', date: 'Mar 11', path: '/briefs/ideas-tracker', summary: 'Force-directed graph visualization for idea management.' },
      { title: 'Audit Onboarding Tool', agent: 'Steffen', date: 'Mar 11', path: '/briefs/audit-onboarding', summary: 'Premium Typeform-style 27-slide audit intake experience.' },
      { title: 'ROI Calculator Design Spec', agent: 'Steffen', date: 'Mar 12', path: null, summary: '13-section implementation-ready spec for the ROI calculator page.' },
      { title: 'Case Study Design Spec', agent: 'Steffen', date: 'Mar 2026', path: null, summary: '16-section design spec for the AOM case study page.' },
      { title: 'Audit Deliverable Design Spec', agent: 'Steffen', date: 'Mar 2026', path: null, summary: 'Visual spec for the client-facing audit report.' },
      { title: 'Ambition Loader Spec', agent: 'Steffen', date: 'Mar 2026', path: null, summary: 'Loading animation spec for the Ambition Mechanical site.' },
      { title: 'Ambition Rebuild Spec', agent: 'Steffen', date: 'Mar 2026', path: null, summary: 'Full rebuild design direction for ambition-teal.vercel.app.' },
      { title: 'OG Image Spec', agent: 'Steffen', date: 'Mar 2026', path: null, summary: 'Standardized social preview images for all AOM pages.' },
    ],
  },
  {
    name: 'Audits',
    items: [
      { title: 'Masterplan System Audit', agent: 'Elon', date: 'Mar 10', path: '/briefs/masterplan', summary: 'Comprehensive audit of AOM agent system architecture.' },
      { title: 'Build Velocity Audit', agent: 'Elon', date: 'Mar 10', path: '/briefs/velocity', summary: 'Analysis of development speed and deployment efficiency.' },
      { title: 'Security Architecture', agent: 'Elon', date: 'Mar 10', path: '/briefs/security', summary: 'Security posture review and SOC 2 readiness assessment.' },
      { title: 'Competitive Deep Dive', agent: 'Elon', date: 'Mar 10', path: '/briefs/competitors', summary: 'Market analysis of AI advisory competitors and positioning.' },
      { title: 'System Audit (Mar 9)', agent: 'Elon', date: 'Mar 9', path: null, summary: 'Daily system health check and infrastructure status.' },
      { title: 'Context Efficiency Audit', agent: 'Elon', date: 'Mar 2026', path: null, summary: 'Audit of context window usage and optimization opportunities.' },
    ],
  },
  {
    name: 'Client Reports',
    items: [
      { title: 'Client Health Dashboard', agent: 'Paige', date: 'Mar 12', path: null, summary: 'Client satisfaction monitoring and risk flagging system.' },
      { title: 'Onboarding Sequence', agent: 'Alex', date: 'Mar 2026', path: null, summary: 'New client onboarding workflow and checklist.' },
      { title: 'ROI Calculator Spec', agent: 'Steve', date: 'Mar 12', path: '/roi-calculator', summary: 'Interactive ROI calculator for AI advisory prospects.' },
      { title: 'Dashboard Teardown', agent: 'Elon', date: 'Mar 2026', path: null, summary: 'Technical teardown and improvement plan for the dashboard.' },
    ],
  },
  {
    name: 'Outreach',
    items: [
      { title: 'Outreach Plan', agent: 'Jacob', date: 'Mar 2026', path: '/outreach-plan', summary: 'Email outreach strategy targeting construction and CPA verticals.' },
      { title: 'HVAC Ads Research', agent: 'Alex', date: 'Mar 2026', path: '/research/hvac-ads-arizona', summary: 'Arizona HVAC market research for targeted ad campaigns.' },
      { title: 'Cold Email Analysis Brief', agent: 'Jacob', date: 'Mar 2026', path: null, summary: 'Performance analysis of cold email campaigns and optimization.' },
      { title: 'Voice Template', agent: 'Jacob', date: 'Mar 2026', path: null, summary: 'Brand voice template for outreach communications.' },
      { title: 'Next Batch Research', agent: 'Jacob', date: 'Mar 2026', path: null, summary: 'Research for the next batch of outreach prospects.' },
      { title: 'Niche Database Research', agent: 'Jacob', date: 'Mar 2026', path: null, summary: 'Niche market database sourcing and qualification.' },
      { title: 'AZ ROC Leads', agent: 'Jacob', date: 'Mar 2026', path: null, summary: 'Arizona Registrar of Contractors lead generation.' },
    ],
  },
  {
    name: 'Technical',
    items: [
      { title: 'Relay Compaction Fix', agent: 'Elon', date: 'Mar 2026', path: null, summary: 'Fix for message loss during conversation compaction.' },
      { title: 'Telegram Bridge Research', agent: 'Elon', date: 'Mar 2026', path: null, summary: 'Research on Telegram bot relay architecture options.' },
      { title: 'Credential Rotation Plan', agent: 'Elon', date: 'Mar 2026', path: null, summary: 'Automated credential rotation and secret management.' },
      { title: 'Email Deliverability Report', agent: 'Elon', date: 'Mar 2026', path: null, summary: 'Email deliverability analysis and improvement recommendations.' },
      { title: 'Mom Infrastructure Audit', agent: 'Elon', date: 'Mar 2026', path: null, summary: 'Infrastructure audit of the Mom orchestration system.' },
    ],
  },
  {
    name: 'Content',
    items: [
      { title: 'Crown V10 Plan', agent: 'Cleo', date: 'Mar 2026', path: null, summary: 'Production plan for Crown video series version 10.' },
      { title: 'Ambition Footage Scan', agent: 'Cleo', date: 'Mar 2026', path: null, summary: 'Footage inventory scan for Ambition Mechanical content.' },
      { title: 'Ambition Crown Editor Guide', agent: 'Cleo', date: 'Mar 2026', path: '/guides/ambition-crown', summary: 'Editing guide for the Ambition Crown video project.' },
      { title: 'Memorial Tower Editor Guide', agent: 'Cleo', date: 'Mar 2026', path: '/guides/ambition-memorial-tower', summary: 'Editing guide for the Memorial Tower video project.' },
      { title: 'Hook Library', agent: 'Tony', date: 'Mar 2026', path: null, summary: 'Social media hook templates for content creation.' },
      { title: 'Platform Best Practices', agent: 'Tony', date: 'Mar 2026', path: null, summary: 'Platform-specific posting guides for LinkedIn, IG, TikTok.' },
    ],
  },
  {
    name: 'Council',
    items: [
      { title: 'AI Advisory Sprint (Mar 10)', agent: 'Council', date: 'Mar 10', path: '/briefs/sprint-plan', summary: 'Multi-agent sprint plan for the AI advisory product launch.' },
      { title: 'Business Growth Strategy (Mar 10)', agent: 'Council', date: 'Mar 10', path: null, summary: 'Council brief on AOM business growth strategy.' },
      { title: 'AOM Website Redesign (Mar 9)', agent: 'Council', date: 'Mar 9', path: null, summary: 'Council brief on the website redesign direction.' },
      { title: 'Briefs Reorg + Offer Strategy (Mar 12)', agent: 'Council', date: 'Mar 12', path: null, summary: 'Council brief on briefs reorganization and offer strategy.' },
    ],
  },
];

function CategoryAccordion({ category, index, isOpen, onToggle, isSearching }) {
  const itemCount = category.items.length;

  return (
    <motion.div
      className="border-b border-white/[0.06]"
      {...(isSearching ? {} : fadeUp(index * 0.05))}
    >
      {/* Category Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between py-5 px-6 md:px-8 transition-all duration-300 group text-left ${
          isOpen
            ? 'bg-[#111110] border-l-[3px] border-l-aom-orange'
            : 'bg-transparent border-l-[3px] border-l-transparent hover:bg-[#111110]/50'
        }`}
      >
        <div className="flex items-center gap-4">
          <h3 className={`font-headline text-[18px] font-bold tracking-[-0.01em] transition-colors duration-300 ${
            isOpen ? 'text-[#F5F0EB]' : 'text-[#F5F0EB]/70 group-hover:text-[#F5F0EB]'
          }`}>
            {category.name}
          </h3>
          <span className="font-mono text-sm text-[#7C9A72]">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        <ChevronDown
          size={18}
          className={`text-[#7C9A72] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Items */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden bg-[#111110]/60"
          >
            <div className="px-6 md:px-8 pb-4 pt-1">
              {category.items.map((item, i) => (
                <BriefItem key={item.title + i} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BriefItem({ item }) {
  const hasPage = !!item.path;

  const content = (
    <div className={`py-3 sm:py-3 px-4 rounded-sm transition-all duration-200 ${
      hasPage
        ? 'hover:bg-white/[0.03] cursor-pointer group'
        : 'opacity-60'
    }`}>
      {/* Desktop: inline row */}
      <div className="hidden sm:flex items-baseline justify-between">
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

        <div className="flex items-baseline gap-3 ml-4 shrink-0">
          <span className="font-mono text-sm text-[#7C9A72]">
            {item.agent}
          </span>
          <span className="font-mono text-sm text-[#7C9A72]/50">
            {item.date}
          </span>
        </div>
      </div>

      {/* Mobile: stacked layout - title wraps, agent+date below */}
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
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-xs text-[#7C9A72]">
            {item.agent}
          </span>
          <span className="font-mono text-xs text-[#7C9A72]/50">
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

export default function BriefsHub() {
  useSEO();
  // Fix #3: All categories collapsed by default
  const [openCategories, setOpenCategories] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [preSearchState, setPreSearchState] = useState(null);
  const searchRef = useRef(null);

  // Debounce search input by 150ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle hash-based auto-open
  useEffect(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash) {
      const idx = categories.findIndex(c => c.name.toLowerCase().replace(/\s+/g, '-') === hash);
      if (idx !== -1) {
        setOpenCategories(new Set([idx]));
        setTimeout(() => {
          const el = document.getElementById(`category-${idx}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  }, []);

  // Filter categories based on search
  const filteredCategories = debouncedQuery
    ? categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
          const q = debouncedQuery.toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            item.agent.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q) ||
            (item.summary && item.summary.toLowerCase().includes(q))
          );
        }),
      })).filter(cat => cat.items.length > 0)
    : categories;

  // When search starts, save pre-search state; when cleared, restore it
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    if (value && !searchQuery) {
      // Starting a search: save current open state
      setPreSearchState(new Set(openCategories));
    }
    if (!value && searchQuery) {
      // Clearing search: restore pre-search state
      if (preSearchState) {
        setOpenCategories(preSearchState);
        setPreSearchState(null);
      }
    }
    setSearchQuery(value);
  }, [searchQuery, openCategories, preSearchState]);

  // Auto-expand matching categories during search
  useEffect(() => {
    if (debouncedQuery) {
      const matchingIndices = new Set();
      categories.forEach((cat, i) => {
        const q = debouncedQuery.toLowerCase();
        const hasMatch = cat.items.some(item =>
          item.title.toLowerCase().includes(q) ||
          item.agent.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q) ||
          (item.summary && item.summary.toLowerCase().includes(q))
        );
        if (hasMatch) matchingIndices.add(i);
      });
      setOpenCategories(matchingIndices);
    }
  }, [debouncedQuery]);

  // Handle Escape to clear search
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setDebouncedQuery('');
      if (preSearchState) {
        setOpenCategories(preSearchState);
        setPreSearchState(null);
      }
      searchRef.current?.blur();
    }
  }, [preSearchState]);

  const toggleCategory = (index) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const liveItems = categories.reduce((sum, c) => sum + c.items.filter(i => i.path).length, 0);

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
              {categories.length} categories
            </span>
          </motion.div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="px-6 md:px-12 pb-8">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp(0.22)} className="relative">
            <Search
              size={18}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-aom-text-muted pointer-events-none"
            />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Search briefs..."
              className="w-full bg-[#1A1A17] border border-white/10 focus:border-aom-orange/40 focus:outline-none font-body text-base text-[#F5F0EB] placeholder:text-aom-text-muted pl-12 pr-5 py-4 rounded-none transition-colors duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                  if (preSearchState) {
                    setOpenCategories(preSearchState);
                    setPreSearchState(null);
                  }
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-aom-text-muted hover:text-[#F5F0EB] transition-colors"
              >
                <span className="font-mono text-xs uppercase tracking-wider">Clear</span>
              </button>
            )}
          </motion.div>
          {isSearching && (
            <p className="font-mono text-xs text-aom-text-muted mt-3">
              {filteredCategories.reduce((sum, c) => sum + c.items.length, 0)} results in {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
            </p>
          )}
        </div>
      </section>

      {/* Accordion Categories */}
      <section className="px-6 md:px-12 pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="border-t border-white/[0.06]">
            {filteredCategories.map((category) => {
              // Find original index for toggle state
              const originalIndex = categories.findIndex(c => c.name === category.name);
              return (
                <div key={category.name} id={`category-${originalIndex}`}>
                  <CategoryAccordion
                    category={category}
                    index={originalIndex}
                    isOpen={openCategories.has(originalIndex)}
                    onToggle={() => toggleCategory(originalIndex)}
                    isSearching={isSearching}
                  />
                </div>
              );
            })}
            {isSearching && filteredCategories.length === 0 && (
              <div className="py-16 text-center">
                <p className="font-body text-lg text-aom-text-muted">No briefs found for "{debouncedQuery}"</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedQuery('');
                    if (preSearchState) {
                      setOpenCategories(preSearchState);
                      setPreSearchState(null);
                    }
                  }}
                  className="font-mono text-sm text-aom-orange hover:underline mt-4"
                >
                  Clear search
                </button>
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
