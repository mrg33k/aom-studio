import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Video, FileText } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = "Editor's Guides | AOM";
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', "Footage guides and editor's references for AOM productions. Shot inventories, gap analysis, and edit recommendations.");
    setMeta('og:title', "Editor's Guides | AOM", true);
    setMeta('og:description', "Footage guides and editor's references for AOM productions.", true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', 'https://aheadofmarket.com/guides', true);
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
});

function SectionKicker({ children }) {
  return <p className="text-xs font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-4">{children}</p>;
}

function OrangeBar() {
  return <div className="w-12 h-[2px] bg-aom-orange mb-4" />;
}

const guides = [
  {
    title: 'Ambition Mechanical: Memorial Tower Insulation',
    path: '/guides/ambition-memorial-tower',
    project: 'Ambition Mechanical',
    date: 'Aug 2025 - Jan 2026',
    type: "EDITOR'S GUIDE",
    icon: Video,
    summary: '354 video clips across 8 shoot dates over 6 months. 5 cameras, 9 DJI MIC recordings, 356 photos. Multi-camera insulation project with massive progression and interview potential. The most documented Ambition job site.',
    stats: {
      clips: 354,
      duration: '8 dates',
      size: '5 cameras',
    },
  },
  {
    title: 'Ambition Mechanical: Crown HVAC Service',
    path: '/guides/ambition-crown',
    project: 'Ambition Mechanical',
    date: 'March 5, 2026',
    type: "EDITOR'S GUIDE",
    icon: Video,
    summary: '73 video clips, 3 lav recordings, 5 drone stills. Full rooftop exhaust fan replacement at Crown commercial building. Shot inventory, gap analysis, and edit recommendations for 30s, 60s, and long-form cuts.',
    stats: {
      clips: 73,
      duration: '~28 min',
      size: '~105 GB',
    },
  },
];

function GuideCard({ guide, index }) {
  const Icon = guide.icon;
  return (
    <motion.a
      href={guide.path}
      className="block p-6 md:p-8 border border-white/10 bg-white/[0.02] hover:border-aom-orange/30 hover:-translate-y-1 transition-all duration-300 group"
      {...fadeUp(index * 0.08)}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-body font-medium uppercase tracking-[0.15em] text-aom-text-muted">
          {guide.type}
        </span>
        <div className="w-10 h-10 flex items-center justify-center border border-white/10 text-aom-text-muted group-hover:text-aom-orange group-hover:border-aom-orange/30 transition-colors">
          <Icon size={20} />
        </div>
      </div>

      <h3 className="font-headline text-xl font-bold text-aom-text-light mb-3 group-hover:text-aom-orange transition-colors">
        {guide.title}
      </h3>

      <p className="font-body text-base text-white/50 leading-relaxed mb-5">
        {guide.summary}
      </p>

      {guide.stats && (
        <div className="flex gap-6 mb-5">
          <div>
            <p className="font-headline text-lg font-bold text-aom-orange">{guide.stats.clips}</p>
            <p className="font-body text-xs text-aom-text-muted uppercase tracking-wider">Clips</p>
          </div>
          <div>
            <p className="font-headline text-lg font-bold text-aom-text-light">{guide.stats.duration}</p>
            <p className="font-body text-xs text-aom-text-muted uppercase tracking-wider">Duration</p>
          </div>
          <div>
            <p className="font-headline text-lg font-bold text-aom-text-light">{guide.stats.size}</p>
            <p className="font-body text-xs text-aom-text-muted uppercase tracking-wider">Size</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-aom-orange" />
          <span className="font-body text-sm text-aom-text-muted">{guide.project}</span>
          <span className="font-body text-sm text-white/30">|</span>
          <span className="font-body text-sm text-white/30">{guide.date}</span>
        </div>
        <ArrowRight size={16} className="text-aom-text-muted group-hover:text-aom-orange transition-colors" />
      </div>
    </motion.a>
  );
}

export default function GuidesHub() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">
      {/* Hero */}
      <section className="bg-aom-night py-20 md:py-32 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.a
            href="https://aheadofmarket.com"
            className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-12"
            {...fadeUp()}
          >
            AOM
          </motion.a>

          <motion.div {...fadeUp(0.05)}>
            <SectionKicker>PRODUCTION REFERENCES</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            EDITOR'S GUIDES
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch]"
            {...fadeUp(0.2)}
          >
            Shot inventories, gap analysis, and edit recommendations for every AOM production. Everything an editor needs to cut without guessing.
          </motion.p>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="bg-aom-night pb-12 px-6 md:pb-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ALL GUIDES</SectionKicker>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide, i) => (
              <GuideCard key={guide.path} guide={guide} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-aom-night py-8 px-6 text-center border-t border-white/10">
        <a
          href="https://aheadofmarket.com"
          className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-3"
        >
          AOM
        </a>
        <p className="font-body text-xs text-aom-text-muted">
          aheadofmarket.com
        </p>
      </footer>
    </div>
  );
}
