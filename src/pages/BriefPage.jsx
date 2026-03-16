import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
});

function useBriefSEO(brief) {
  useEffect(() => {
    if (!brief) return;
    document.title = `${brief.title} | AOM Brief`;
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', brief.summary);
    setMeta('og:title', brief.title, true);
    setMeta('og:description', brief.summary, true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', `https://aheadofmarket.com/briefs/${brief.slug}`, true);
  }, [brief]);
}

export default function BriefPage() {
  const { slug } = useParams();
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadBrief() {
      try {
        // Dynamic import of the brief JSON file
        const module = await import(`../data/briefs/${slug}.json`);
        setBrief(module.default || module);
        setLoading(false);
      } catch (err) {
        console.error(`Brief "${slug}" not found:`, err);
        setError(true);
        setLoading(false);
      }
    }
    loadBrief();
  }, [slug]);

  useBriefSEO(brief);

  if (loading) {
    return (
      <div className="bg-[#0A0A08] min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-[#8A847C]">Loading...</p>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="bg-[#0A0A08] min-h-screen">
        <SiteNav />
        <div className="pt-28 md:pt-36 pb-20 px-6 md:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-headline text-4xl font-bold text-[#F5F0EB] mb-4">Brief Not Found</h1>
            <p className="font-body text-lg text-[#8A847C] mb-8">
              The brief you're looking for doesn't exist or hasn't been published yet.
            </p>
            <a
              href="/briefs"
              className="inline-flex items-center gap-2 font-mono text-sm text-[#E85D26] hover:text-[#F5F0EB] transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Briefs
            </a>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A08] min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-12 md:pb-16 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <motion.div {...fadeUp(0)}>
            <a
              href="/briefs"
              className="inline-flex items-center gap-2 font-mono text-sm text-[#8A847C] hover:text-[#F5F0EB] transition-colors mb-10"
            >
              <ArrowLeft size={14} />
              All Briefs
            </a>
          </motion.div>

          {/* Category micro-label */}
          <motion.p
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#7C9A72] mb-4"
            {...fadeUp(0.05)}
          >
            {brief.category}
          </motion.p>

          {/* Orange bar */}
          <motion.div {...fadeUp(0.08)}>
            <div className="w-12 h-[2px] bg-[#E85D26] mb-6" />
          </motion.div>

          {/* Title */}
          <motion.h1
            className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] text-[#F5F0EB] leading-[1.1] mb-6"
            {...fadeUp(0.12)}
          >
            {brief.title}
          </motion.h1>

          {/* Summary */}
          {brief.summary && (
            <motion.p
              className="font-body text-lg text-[#8A847C] leading-relaxed max-w-[55ch] mb-6"
              {...fadeUp(0.16)}
            >
              {brief.summary}
            </motion.p>
          )}

          {/* Metadata bar */}
          <motion.div
            className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/[0.06]"
            {...fadeUp(0.2)}
          >
            <span className="font-mono text-sm text-[#7C9A72]">
              {brief.agent}
            </span>
            <span className="text-white/10">|</span>
            <span className="font-mono text-sm text-[#8A847C]">
              {brief.dateFormatted || brief.date}
            </span>
            {brief.updated && (
              <>
                <span className="text-white/10">|</span>
                <span className="font-mono text-sm text-[#8A847C]">
                  Updated {brief.updated}
                </span>
              </>
            )}
            {brief.tags && brief.tags.length > 0 && (
              <>
                <span className="text-white/10">|</span>
                {brief.tags.map(tag => (
                  <span key={tag} className="font-mono text-xs text-[#8A847C]/60 bg-white/[0.03] px-2 py-1">
                    {tag}
                  </span>
                ))}
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 md:px-12 pb-20 md:pb-28">
        <motion.div
          className="max-w-3xl mx-auto"
          {...fadeUp(0.25)}
        >
          <div
            className="brief-content"
            dangerouslySetInnerHTML={{ __html: brief.content }}
          />
        </motion.div>
      </section>

      {/* Back to briefs CTA */}
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-3xl mx-auto border-t border-white/[0.06] pt-8">
          <a
            href="/briefs"
            className="inline-flex items-center gap-2 font-mono text-sm text-[#E85D26] hover:text-[#F5F0EB] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to All Briefs
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
