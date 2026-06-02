import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Users, Zap, Star, Clock,
  Check, ArrowRight, Download
} from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

const ORANGE = '#E85D26';

// ─── Product catalog ────────────────────────────────────────────────────────
// To add a new product: add an object to this array. No component changes needed.
const PRODUCTS = [
  {
    id: 'ai-prompt-playbook',
    badge: 'DIGITAL DOWNLOAD',
    title: "The Business Owner's AI Playbook",
    subtitle:
      '50 ready-to-use prompts that save real time every week — client emails, hiring posts, sales outreach, and more. Written for business owners, not tech people.',
    price: 47,
    gumroadUrl: 'https://aom-inhouse.gumroad.com/l/ai-prompt-playbook',
    stats: [
      { value: '50', label: 'Prompts' },
      { value: '5', label: 'Categories' },
      { value: '∞', label: 'Uses' },
    ],
    categories: [
      { icon: FileText, title: 'Client Communications', desc: 'Follow-ups, proposals, scope changes, and update emails — done in 30 seconds.', count: 10 },
      { icon: Users,    title: 'Hiring & Operations',   desc: 'Job posts, interview questions, onboarding docs, and team SOPs.',           count: 10 },
      { icon: Zap,      title: 'Sales & Outreach',      desc: 'Cold emails, follow-up sequences, objection responses, and meeting prep.',  count: 10 },
      { icon: Star,     title: 'Content & Social',      desc: 'Instagram captions, LinkedIn posts, project spotlights, and company updates.', count: 10 },
      { icon: Clock,    title: 'Strategy & Planning',   desc: 'Weekly reviews, goal setting, priority lists, and decision frameworks.',    count: 10 },
    ],
    includes: [
      'Instant PDF download — use today',
      'Works with ChatGPT, Claude, or any AI tool',
      'Written for real businesses, not tech people',
      'Covers every part of running your operation',
      'Free updates when new prompts are added',
    ],
    callout: "The exact prompts AOM's team uses every day.",
  },
];

// ─── ProductCard (grid tile) ────────────────────────────────────────────────
function ProductCard({ product, onSelect, selected }) {
  return (
    <motion.button
      onClick={() => onSelect(product)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="text-left w-full rounded-xl p-6 cursor-pointer transition-all duration-200"
      style={{
        background: selected ? 'rgba(232,93,38,0.08)' : 'rgba(255,255,255,0.03)',
        border: selected ? `1px solid ${ORANGE}` : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <span
        className="inline-block text-xs font-body font-semibold tracking-widest px-2 py-1 rounded mb-4"
        style={{ background: 'rgba(232,93,38,0.15)', color: ORANGE }}
      >
        {product.badge}
      </span>
      <h3 className="font-headline text-xl text-white mb-2 leading-snug">{product.title}</h3>
      <p className="font-body text-sm text-white/60 mb-5 leading-relaxed">{product.subtitle}</p>
      <div className="flex items-center justify-between">
        <span className="font-headline text-2xl text-white">${product.price}</span>
        <span
          className="text-xs font-body font-semibold tracking-wide px-3 py-1.5 rounded"
          style={{ background: ORANGE, color: '#fff' }}
        >
          Get it →
        </span>
      </div>
    </motion.button>
  );
}

// ─── ComingSoonCard ─────────────────────────────────────────────────────────
function ComingSoonCard() {
  return (
    <div
      className="rounded-xl p-6 flex flex-col justify-between min-h-[220px]"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}
    >
      <span className="inline-block text-xs font-body font-semibold tracking-widest px-2 py-1 rounded bg-white/5 text-white/25">
        COMING SOON
      </span>
      <div>
        <h3 className="font-headline text-xl text-white/20 mb-2">New product in development</h3>
        <p className="font-body text-sm text-white/20">More tools for business owners launching soon.</p>
      </div>
    </div>
  );
}

// ─── ProductDetail (expanded view + sticky buy card) ────────────────────────
function ProductDetail({ product }) {
  if (!product) return null;

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10"
    >
      {/* Left: content */}
      <div className="lg:col-span-2 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {product.stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-5 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="font-headline text-3xl text-white mb-1">{s.value}</div>
              <div className="font-body text-xs text-white/50 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div>
          <h4 className="font-headline text-lg text-white mb-4">What's inside</h4>
          <div className="space-y-3">
            {product.categories.map(({ icon: Icon, title, desc, count }) => (
              <div
                key={title}
                className="flex gap-4 p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(232,93,38,0.12)' }}
                >
                  <Icon size={18} style={{ color: ORANGE }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-headline text-sm text-white">{title}</span>
                    <span className="font-body text-xs text-white/30">{count} prompts</span>
                  </div>
                  <p className="font-body text-sm text-white/55 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Callout */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'rgba(232,93,38,0.06)', borderLeft: `3px solid ${ORANGE}` }}
        >
          <p className="font-body text-sm text-white/75 italic">{product.callout}</p>
        </div>
      </div>

      {/* Right: sticky buy card */}
      <div className="lg:col-span-1">
        <div className="sticky top-28">
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div>
              <div className="font-headline text-3xl text-white">${product.price}</div>
              <div className="font-body text-sm text-white/40 mt-0.5">One-time purchase</div>
            </div>

            <ul className="space-y-2">
              {product.includes.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                  <span className="font-body text-sm text-white/70">{item}</span>
                </li>
              ))}
            </ul>

            <a
              href={product.gumroadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-headline text-sm tracking-wide hover:brightness-110 transition-all duration-200"
              style={{ background: ORANGE, color: '#fff' }}
            >
              <Download size={16} />
              Buy Now — ${product.price}
            </a>

            <p className="font-body text-xs text-white/30 text-center">
              Instant download. Secure checkout via Gumroad.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Marketplace() {
  const [selected, setSelected] = useState(PRODUCTS[0]);

  return (
    <div className="min-h-screen" style={{ background: '#0C0C0C', color: '#F0ECE6' }}>
      <SiteNav />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="inline-block text-xs font-body font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ background: 'rgba(232,93,38,0.12)', color: ORANGE }}
          >
            AOM MARKETPLACE
          </span>
          <h1 className="font-display-serif text-5xl md:text-6xl text-white leading-tight mb-5">
            Tools that do<br />
            <span style={{ color: ORANGE }}>the work for you.</span>
          </h1>
          <p className="font-body text-lg text-white/55 max-w-xl leading-relaxed">
            Digital products built from what actually works at AOM. No fluff — just tools
            that save time and move your business forward.
          </p>
        </motion.div>
      </section>

      <div className="border-t border-white/10 max-w-6xl mx-auto" />

      {/* Product grid + detail */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onSelect={setSelected}
              selected={selected?.id === p.id}
            />
          ))}
          <ComingSoonCard />
        </div>

        <ProductDetail product={selected} />
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="border-t border-white/10 pt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-headline text-2xl text-white mb-2">Want the full picture?</h3>
            <p className="font-body text-sm text-white/50 max-w-sm">
              The AI Audit goes deeper — a full look at your business and a custom roadmap
              for where AI can save you the most time.
            </p>
          </div>
          <a
            href="/book"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-headline text-sm tracking-wide border border-white/20 text-white hover:border-white/50 transition-all whitespace-nowrap"
          >
            Book an AI Audit
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
