import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

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
      { title: 'Partnership Strategy', agent: 'Alex', date: 'Mar 10', path: '/briefs/partnerships' },
      { title: 'AI Advisory Services Strategy', agent: 'Steve', date: 'Mar 10', path: '/briefs/ai-advisory' },
      { title: 'AI Advisory Sprint Plan', agent: 'Council', date: 'Mar 10', path: '/briefs/sprint-plan' },
      { title: 'Growth Plan', agent: 'Alex', date: 'Mar 2026', path: '/growth-plan' },
      { title: 'Build Proposal Template', agent: 'Alex', date: 'Mar 2026', path: null },
      { title: 'Case Study Brief', agent: 'Alex', date: 'Mar 2026', path: null },
      { title: 'AI Advisory Offer Language', agent: 'Steve', date: 'Mar 2026', path: null },
      { title: 'Biz Dev Brief', agent: 'Alex', date: 'Mar 2026', path: null },
      { title: 'Dashboard Brief', agent: 'Alex', date: 'Mar 2026', path: null },
      { title: 'Website V2 Direction', agent: 'Alex', date: 'Mar 2026', path: null },
    ],
  },
  {
    name: 'Design Specs',
    items: [
      { title: 'Full-Screen Site Redesign', agent: 'Steffen', date: 'Mar 11', path: '/briefs/fullscreen-site' },
      { title: 'Ideas Tracker (Brain Map)', agent: 'Steffen', date: 'Mar 11', path: '/briefs/ideas-tracker' },
      { title: 'Audit Onboarding Tool', agent: 'Steffen', date: 'Mar 11', path: '/briefs/audit-onboarding' },
      { title: 'ROI Calculator Design Spec', agent: 'Steffen', date: 'Mar 12', path: null },
      { title: 'Case Study Design Spec', agent: 'Steffen', date: 'Mar 2026', path: null },
      { title: 'Audit Deliverable Design Spec', agent: 'Steffen', date: 'Mar 2026', path: null },
      { title: 'Ambition Loader Spec', agent: 'Steffen', date: 'Mar 2026', path: null },
      { title: 'Ambition Rebuild Spec', agent: 'Steffen', date: 'Mar 2026', path: null },
      { title: 'OG Image Spec', agent: 'Steffen', date: 'Mar 2026', path: null },
    ],
  },
  {
    name: 'Audits',
    items: [
      { title: 'Masterplan System Audit', agent: 'Elon', date: 'Mar 10', path: '/briefs/masterplan' },
      { title: 'Build Velocity Audit', agent: 'Elon', date: 'Mar 10', path: '/briefs/velocity' },
      { title: 'Security Architecture', agent: 'Elon', date: 'Mar 10', path: '/briefs/security' },
      { title: 'Competitive Deep Dive', agent: 'Elon', date: 'Mar 10', path: '/briefs/competitors' },
      { title: 'System Audit (Mar 9)', agent: 'Elon', date: 'Mar 9', path: null },
      { title: 'Context Efficiency Audit', agent: 'Elon', date: 'Mar 2026', path: null },
    ],
  },
  {
    name: 'Client Reports',
    items: [
      { title: 'Client Health Dashboard', agent: 'Paige', date: 'Mar 12', path: null },
      { title: 'Onboarding Sequence', agent: 'Alex', date: 'Mar 2026', path: null },
      { title: 'ROI Calculator Spec', agent: 'Steve', date: 'Mar 12', path: '/roi-calculator' },
      { title: 'Dashboard Teardown', agent: 'Elon', date: 'Mar 2026', path: null },
    ],
  },
  {
    name: 'Outreach',
    items: [
      { title: 'Outreach Plan', agent: 'Jacob', date: 'Mar 2026', path: '/outreach-plan' },
      { title: 'HVAC Ads Research', agent: 'Alex', date: 'Mar 2026', path: '/research/hvac-ads-arizona' },
      { title: 'Cold Email Analysis Brief', agent: 'Jacob', date: 'Mar 2026', path: null },
      { title: 'Voice Template', agent: 'Jacob', date: 'Mar 2026', path: null },
      { title: 'Next Batch Research', agent: 'Jacob', date: 'Mar 2026', path: null },
      { title: 'Niche Database Research', agent: 'Jacob', date: 'Mar 2026', path: null },
      { title: 'AZ ROC Leads', agent: 'Jacob', date: 'Mar 2026', path: null },
    ],
  },
  {
    name: 'Technical',
    items: [
      { title: 'Relay Compaction Fix', agent: 'Elon', date: 'Mar 2026', path: null },
      { title: 'Telegram Bridge Research', agent: 'Elon', date: 'Mar 2026', path: null },
      { title: 'Credential Rotation Plan', agent: 'Elon', date: 'Mar 2026', path: null },
      { title: 'Email Deliverability Report', agent: 'Elon', date: 'Mar 2026', path: null },
      { title: 'Mom Infrastructure Audit', agent: 'Elon', date: 'Mar 2026', path: null },
    ],
  },
  {
    name: 'Content',
    items: [
      { title: 'Crown V10 Plan', agent: 'Cleo', date: 'Mar 2026', path: null },
      { title: 'Ambition Footage Scan', agent: 'Cleo', date: 'Mar 2026', path: null },
      { title: 'Ambition Crown Editor Guide', agent: 'Cleo', date: 'Mar 2026', path: '/guides/ambition-crown' },
      { title: 'Memorial Tower Editor Guide', agent: 'Cleo', date: 'Mar 2026', path: '/guides/ambition-memorial-tower' },
      { title: 'Hook Library', agent: 'Tony', date: 'Mar 2026', path: null },
      { title: 'Platform Best Practices', agent: 'Tony', date: 'Mar 2026', path: null },
    ],
  },
  {
    name: 'Council',
    items: [
      { title: 'AI Advisory Sprint (Mar 10)', agent: 'Council', date: 'Mar 10', path: '/briefs/sprint-plan' },
      { title: 'Business Growth Strategy (Mar 10)', agent: 'Council', date: 'Mar 10', path: null },
      { title: 'AOM Website Redesign (Mar 9)', agent: 'Council', date: 'Mar 9', path: null },
      { title: 'Briefs Reorg + Offer Strategy (Mar 12)', agent: 'Council', date: 'Mar 12', path: null },
    ],
  },
];

function CategoryAccordion({ category, index, isOpen, onToggle }) {
  const itemCount = category.items.length;
  const liveCount = category.items.filter(i => i.path).length;

  return (
    <motion.div
      className="border-b border-white/[0.06]"
      {...fadeUp(index * 0.05)}
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
    <div className={`flex items-baseline justify-between py-3 px-4 rounded-sm transition-all duration-200 ${
      hasPage
        ? 'hover:bg-white/[0.03] cursor-pointer group'
        : 'opacity-60'
    }`}>
      <div className="flex items-baseline gap-3 min-w-0 flex-1">
        <span className={`font-body text-[16px] leading-snug truncate ${
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
  );

  if (hasPage) {
    return <a href={item.path} className="block">{content}</a>;
  }
  return content;
}

export default function BriefsHub() {
  useSEO();
  const [openCategories, setOpenCategories] = useState(new Set([0])); // Strategy open by default

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

  return (
    <div className="bg-[#0A0A08] min-h-screen">
      {/* Hero */}
      <section className="py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <motion.a
            href="https://aheadofmarket.com"
            className="font-headline text-base font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-[#F5F0EB] transition-colors inline-block mb-12"
            {...fadeUp()}
          >
            AOM
          </motion.a>

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

      {/* Accordion Categories */}
      <section className="px-6 md:px-12 pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="border-t border-white/[0.06]">
            {categories.map((category, i) => (
              <CategoryAccordion
                key={category.name}
                category={category}
                index={i}
                isOpen={openCategories.has(i)}
                onToggle={() => toggleCategory(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-white/[0.06]">
        <a
          href="https://aheadofmarket.com"
          className="font-headline text-base font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-[#F5F0EB] transition-colors inline-block mb-3"
        >
          AOM
        </a>
        <p className="font-mono text-sm text-aom-text-muted">
          aheadofmarket.com
        </p>
      </footer>
    </div>
  );
}
