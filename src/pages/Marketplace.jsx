import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Users, Zap, Star, Clock,
  Check, ArrowRight, Download, Eye, Sparkles,
  MessageSquare, TrendingUp, LayoutGrid, PenTool, BarChart2,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

const ORANGE = '#E85D26';
const AMBER = '#FFA500';

// ─── Product catalog ────────────────────────────────────────────────────────
// Each product has:
//   status:     'live' | 'hidden' | 'coming-soon' | 'soft-launch'
//   visibility: 'public' | 'preview-only'
//
// Public marketplace renders products with visibility:'public' and status in
// ('live', 'soft-launch'). Admin preview (?preview=aom) also surfaces hidden
// + coming-soon items so the pipeline is inspectable without shipping.
//
// To soft-launch a product: status:'soft-launch' + visibility:'public' (lives
// on the page with a "Limited Release" label) OR + visibility:'preview-only'
// (still gated to admin). To ship publicly: status:'live' + visibility:'public'.
const PRODUCTS = [
  {
    id: 'ai-guide',
    status: 'live',
    visibility: 'public',
    badge: 'FREE TOOL',
    title: 'The AI Business Guide',
    subtitle:
 'Interactive guide to using AI prompts for your business, free to explore. Answer 2 questions, get personalized prompts you can use today.',
    free: true,
    href: '/ai-guide',
    stats: [
      { value: '30+', label: 'Prompts' },
      { value: '6', label: 'Categories' },
      { value: 'Free', label: 'Forever' },
    ],
    categories: [
 { icon: MessageSquare, title: 'Client Communications', desc: 'Follow-ups, project updates, difficult client responses, and welcome emails, done in seconds.', count: 5 },
      { icon: Users,         title: 'Hiring & Team',         desc: 'Job postings, interview questions, offer letters, and onboarding checklists.',               count: 5 },
      { icon: TrendingUp,    title: 'Sales & Outreach',      desc: 'Cold emails, follow-up sequences, objection responses, and proposal intros.',                count: 5 },
      { icon: LayoutGrid,    title: 'Operations',            desc: 'SOPs, delegation briefs, weekly agendas, and process audit prompts.',                        count: 5 },
      { icon: PenTool,       title: 'Content & Marketing',   desc: 'Social captions, content calendars, case studies, and bio copy.',                           count: 5 },
      { icon: BarChart2,     title: 'Finance & Reporting',   desc: 'Invoice follow-ups, pricing scripts, expense reviews, and cash flow questions.',             count: 5 },
    ],
 callout: 'Answer 2 quick questions, walk away with prompts you can use today.',
  },
  {
    id: 'ai-prompt-playbook',
    status: 'hidden',
    visibility: 'preview-only',
    badge: 'DIGITAL DOWNLOAD',
    title: "The Business Owner's AI Playbook",
    subtitle:
 '50 ready-to-use prompts that save real time every week, client emails, hiring posts, sales outreach, and more. Written for business owners, not tech people.',
    price: 47,
    gumroadUrl: 'https://aom-inhouse.gumroad.com/l/ai-prompt-playbook',
    stats: [
      { value: '50', label: 'Prompts' },
      { value: '5', label: 'Categories' },
      { value: '∞', label: 'Uses' },
    ],
    categories: [
 { icon: FileText, title: 'Client Communications', desc: 'Follow-ups, proposals, scope changes, and update emails, done in 30 seconds.', count: 10 },
      { icon: Users,    title: 'Hiring & Operations',   desc: 'Job posts, interview questions, onboarding docs, and team SOPs.',           count: 10 },
      { icon: Zap,      title: 'Sales & Outreach',      desc: 'Cold emails, follow-up sequences, objection responses, and meeting prep.',  count: 10 },
      { icon: Star,     title: 'Content & Social',      desc: 'Instagram captions, LinkedIn posts, project spotlights, and company updates.', count: 10 },
      { icon: Clock,    title: 'Strategy & Planning',   desc: 'Weekly reviews, goal setting, priority lists, and decision frameworks.',    count: 10 },
    ],
    includes: [
 'Instant PDF download, use today',
      'Works with ChatGPT, Claude, or any AI tool',
      'Written for real businesses, not tech people',
      'Covers every part of running your operation',
      'Free updates when new prompts are added',
    ],
    callout: "The exact prompts AOM's team uses every day.",
  },
  // ── Pipeline (preview-only, not yet built) ────────────────────────────────
  {
    id: 'ai-templates-bundle',
    status: 'coming-soon',
    visibility: 'preview-only',
    badge: 'TEMPLATE BUNDLE',
    title: 'AI-Ready Templates',
    subtitle:
 'Plug-and-play templates for proposals, SOPs, hiring docs, and client onboarding, pre-wired to work with your favorite AI tool.',
    targetPrice: 97,
    eta: 'Q3 2026',
  },
  {
    id: 'ai-workflow-builder',
    status: 'coming-soon',
    visibility: 'preview-only',
    badge: 'INTERACTIVE TOOL',
    title: 'AI Workflow Builder',
    subtitle:
 'Map a repetitive task in your business, get a step-by-step AI workflow back, with prompts, tools, and the exact order of operations.',
    targetPrice: 197,
    eta: 'Q3 2026',
  },
  {
    id: 'business-owner-ai-course',
    status: 'coming-soon',
    visibility: 'preview-only',
    badge: 'COURSE',
    title: "The Business Owner's AI Course",
    subtitle:
 'A 4-week course that takes you from AI-curious to running a leaner operation, the same playbook AOM used internally.',
    targetPrice: 497,
    eta: 'Q4 2026',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  hidden: 'HIDDEN',
  'coming-soon': 'COMING SOON',
  'soft-launch': 'LIMITED RELEASE',
  live: 'LIVE',
};

// ─── ProductCard (used in soft-launch grid + admin hidden grid) ─────────────
function ProductCard({ product, onSelect, selected }) {
  const isInteractive = typeof onSelect === 'function';
  return (
    <motion.button
      onClick={isInteractive ? () => onSelect(product) : undefined}
      whileHover={isInteractive ? { y: -4 } : undefined}
      transition={{ duration: 0.2 }}
      className="text-left w-full rounded-xl p-6 transition-all duration-200"
      style={{
        background: selected ? 'rgba(232,93,38,0.08)' : 'rgba(255,255,255,0.03)',
        border: selected ? `1px solid ${ORANGE}` : '1px solid rgba(255,255,255,0.1)',
        cursor: isInteractive ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span
          className="inline-block text-xs font-body font-semibold tracking-widest px-2 py-1 rounded"
          style={{
            background: product.free ? 'rgba(74,222,128,0.12)' : 'rgba(232,93,38,0.15)',
            color: product.free ? '#4ade80' : ORANGE,
          }}
        >
          {product.badge}
        </span>
        {product.status === 'hidden' && (
          <span
            className="inline-block text-xs font-body font-semibold tracking-widest px-2 py-1 rounded"
            style={{ background: 'rgba(255,165,0,0.12)', color: AMBER }}
          >
            HIDDEN
          </span>
        )}
        {product.status === 'soft-launch' && (
          <span
            className="inline-block text-xs font-body font-semibold tracking-widest px-2 py-1 rounded"
            style={{ background: 'rgba(255,165,0,0.15)', color: AMBER }}
          >
            LIMITED RELEASE
          </span>
        )}
      </div>
      <h3 className="font-headline text-xl text-white mb-2 leading-snug">{product.title}</h3>
      <p className="font-body text-sm text-white/60 mb-5 leading-relaxed">{product.subtitle}</p>
      <div className="flex items-center justify-between">
        {product.free ? (
          <span className="font-headline text-2xl" style={{ color: '#4ade80' }}>Free</span>
        ) : (
          <span className="font-headline text-2xl text-white">${product.price}</span>
        )}
        {isInteractive && (
          <span
            className="text-xs font-body font-semibold tracking-wide px-3 py-1.5 rounded"
            style={{ background: ORANGE, color: '#fff' }}
          >
            {product.free ? 'Explore →' : 'Preview →'}
          </span>
        )}
        {!isInteractive && product.status === 'soft-launch' && (
          <span
            className="text-xs font-body font-semibold tracking-wide px-3 py-1.5 rounded"
            style={{ background: 'rgba(255,165,0,0.15)', color: AMBER }}
          >
            Request access
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ─── ComingSoonTile (preview-only pipeline slot) ────────────────────────────
function ComingSoonTile({ product }) {
  return (
    <div
      className="rounded-xl p-6 flex flex-col min-h-[200px]"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="inline-block text-xs font-body font-semibold tracking-widest px-2 py-1 rounded"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}
        >
          {product.badge}
        </span>
        <span
          className="inline-block text-xs font-body font-semibold tracking-widest px-2 py-1 rounded"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
        >
          COMING SOON
        </span>
      </div>
      <h4 className="font-headline text-lg text-white/70 mb-1 leading-snug">{product.title}</h4>
      <p className="font-body text-sm text-white/40 mb-4 leading-relaxed flex-1">{product.subtitle}</p>
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <span className="font-body text-xs text-white/35 uppercase tracking-wider">
          Target {product.eta}
        </span>
        {product.targetPrice && (
          <span className="font-headline text-base text-white/55">
            ~${product.targetPrice}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── ProductDetail (expanded view + sticky buy card) ────────────────────────
function ProductDetail({ product }) {
  const navigate = useNavigate();
  if (!product || !product.categories || !product.stats) return null;

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
        {product.callout && (
          <div
            className="rounded-xl p-5"
            style={{ background: 'rgba(232,93,38,0.06)', borderLeft: `3px solid ${ORANGE}` }}
          >
            <p className="font-body text-sm text-white/75 italic">{product.callout}</p>
          </div>
        )}
      </div>

      {/* Right: sticky buy card */}
      <div className="lg:col-span-1">
        <div className="sticky top-28">
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {product.free ? (
              <>
                <div>
                  <div className="font-headline text-3xl" style={{ color: '#4ade80' }}>Free</div>
                  <div className="font-body text-sm text-white/40 mt-0.5">No account required</div>
                </div>
                <ul className="space-y-2">
                  {[
                    '30+ personalized prompts',
                    'Covers 6 key business areas',
                    'Ready to use in ChatGPT or Claude',
                    'Works in under 3 minutes',
                    'No login required',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
                      <span className="font-body text-sm text-white/70">{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(product.href)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-headline text-sm tracking-wide hover:brightness-110 transition-all duration-200"
                  style={{ background: ORANGE, color: '#fff' }}
                >
                  <ArrowRight size={16} />
                  Start the Guide — Free
                </button>
                <p className="font-body text-xs text-white/30 text-center">
                  No email. No signup. Instant access.
                </p>
              </>
            ) : (
              <>
                <div>
                  <div className="font-headline text-3xl text-white">${product.price}</div>
                  <div className="font-body text-sm text-white/40 mt-0.5">One-time purchase</div>
                </div>
                <ul className="space-y-2">
                  {(product.includes || []).map((item) => (
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
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Marketplace() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPreview = new URLSearchParams(location.search).get('preview') === 'aom';

  // Public-facing products: only visibility:'public' AND status in ('live', 'soft-launch').
  const publicProducts = PRODUCTS.filter(
    (p) => p.visibility === 'public' && (p.status === 'live' || p.status === 'soft-launch')
  );
  const hiddenProducts = PRODUCTS.filter((p) => p.status === 'hidden');
  const comingSoonProducts = PRODUCTS.filter((p) => p.status === 'coming-soon');
  const softLaunchProducts = PRODUCTS.filter(
    (p) => p.status === 'soft-launch' && p.visibility === 'public'
  );

  // Hero product = the free AI Guide (primary path)
  const heroProduct = publicProducts.find((p) => p.free) || publicProducts[0];

  // Selected hidden product for admin ProductDetail panel
  const [selectedHidden, setSelectedHidden] = useState(hiddenProducts[0] || null);

  return (
    <div className="min-h-screen" style={{ background: '#0C0C0C', color: '#F0ECE6' }}>
      <SiteNav />

      {/* ── HERO: Free AI Guide as the primary conversion driver ── */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: headline + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="inline-block text-xs font-body font-semibold tracking-widest mb-5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
            >
              FREE — NO SIGNUP
            </span>
            <h1 className="font-display-serif text-5xl md:text-6xl text-white leading-tight mb-6">
              Get AI working<br />
              <span style={{ color: ORANGE }}>for your business.</span>
            </h1>
            <p className="font-body text-lg text-white/60 leading-relaxed mb-8 max-w-lg">
              The AI Business Guide walks you through using AI for client communications,
              hiring, sales, operations, and more. Pick your challenge, answer two questions,
              walk away with prompts you can use today.
            </p>

            {/* Key proof points */}
            <ul className="space-y-3 mb-10">
              {[
                '30+ personalized AI prompts, ready to copy',
                'Covers 6 key areas of running a business',
                'Works with ChatGPT, Claude, or any AI tool',
                'Takes under 5 minutes. No signup required.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
                  <span className="font-body text-sm text-white/70">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <button
                onClick={() => navigate(heroProduct?.href || '/ai-guide')}
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-headline text-base tracking-wide hover:brightness-110 active:scale-95 transition-all duration-200"
                style={{ background: ORANGE, color: '#fff' }}
              >
                <ArrowRight size={18} />
                Start the Guide — Free
              </button>
              <span className="font-body text-xs text-white/30">
                No account. No credit card.
              </span>
            </div>
          </motion.div>

          {/* Right: guide preview card — clean, airy, no clutter */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden lg:block"
          >
            <div
              className="rounded-2xl p-8"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-headline text-base text-white/80">The AI Business Guide</span>
                <span
                  className="text-xs font-body font-semibold tracking-widest px-2.5 py-1 rounded"
                  style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
                >
                  FREE
                </span>
              </div>
              <div className="space-y-3">
                {heroProduct?.categories?.slice(0, 4).map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="flex items-center gap-3.5 p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(232,93,38,0.12)' }}
                    >
                      <Icon size={15} style={{ color: ORANGE }} />
                    </div>
                    <div>
                      <div className="font-headline text-sm text-white/85 leading-tight">{title}</div>
 <div className="font-body text-xs text-white/40 mt-0.5 leading-snug">{desc.split(', ')[0].trim()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="font-body text-xs text-white/30 text-center mt-5">
                + 2 more categories · 30 prompts total
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Public soft-launch grid (lives on public page; "Limited Release" label) ── */}
      {softLaunchProducts.length > 0 && (
        <section className="py-12 px-6 max-w-6xl mx-auto">
          <div className="border-t border-white/10 pt-12">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <h2 className="font-headline text-2xl text-white">Limited Release</h2>
              <span
                className="text-xs font-body font-semibold tracking-widest px-2 py-1 rounded"
                style={{ background: 'rgba(255,165,0,0.12)', color: AMBER }}
              >
                EARLY ACCESS
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {softLaunchProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── ADMIN PREVIEW (gated by ?preview=aom) ── */}
      {isAdminPreview && (
        <>
          {/* Admin banner */}
          <section className="py-6 px-6 max-w-6xl mx-auto">
            <div
              className="rounded-xl px-5 py-4 flex items-center gap-3"
              style={{ background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.25)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,165,0,0.15)' }}
              >
                <Eye size={15} style={{ color: AMBER }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-headline text-sm text-white">Admin preview mode</div>
                <div className="font-body text-xs text-white/45">
                  Showing hidden + pipeline products. Remove <code className="text-white/70">?preview=aom</code> for the public view.
                </div>
              </div>
              <span
                className="text-xs font-body font-semibold tracking-widest px-3 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'rgba(255,165,0,0.15)', color: AMBER }}
              >
                NOT PUBLIC
              </span>
            </div>
          </section>

          {/* Hidden products section */}
          {hiddenProducts.length > 0 && (
            <section className="py-12 px-6 max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <h2 className="font-headline text-2xl text-white/85">Hidden products</h2>
                <span className="font-body text-sm text-white/40">
                  Flagged for future launch — not visible to the public.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {hiddenProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onSelect={setSelectedHidden}
                    selected={selectedHidden?.id === p.id}
                  />
                ))}
              </div>

              {selectedHidden && <ProductDetail product={selectedHidden} />}
            </section>
          )}

          {/* Coming-soon section */}
          {comingSoonProducts.length > 0 && (
            <section className="py-12 px-6 max-w-6xl mx-auto">
              <div className="border-t border-white/10 pt-12">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles size={18} className="text-white/40" />
                  <h2 className="font-headline text-2xl text-white/85">Coming soon</h2>
                </div>
                <p className="font-body text-sm text-white/40 mb-6">
 Product pipeline, not yet built. Flip <code className="text-white/60">status</code> to <code className="text-white/60">'soft-launch'</code> or <code className="text-white/60">'live'</code> when ready.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {comingSoonProducts.map((p) => (
                    <ComingSoonTile key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Admin footer hint */}
          <section className="py-6 px-6 max-w-6xl mx-auto">
            <p className="font-body text-xs text-white/25 text-center">
              To soft-launch a product: <code>status: 'soft-launch'</code> + <code>visibility: 'public'</code> in <code>Marketplace.jsx</code>.
              {' '}To ship publicly: <code>status: 'live'</code> + <code>visibility: 'public'</code>.
            </p>
          </section>
        </>
      )}

      {/* ── Bottom CTA: AI Flow — prominent booking section ── */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl p-10 md:p-14"
          style={{
            background: 'linear-gradient(135deg, rgba(232,93,38,0.12) 0%, rgba(232,93,38,0.04) 100%)',
            border: '1px solid rgba(232,93,38,0.25)',
          }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1">
              <span
                className="inline-block text-xs font-body font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
                style={{ background: 'rgba(232,93,38,0.15)', color: ORANGE }}
              >
                PERSONALIZED SERVICE
              </span>
              <h3 className="font-headline text-3xl md:text-4xl text-white mb-3 leading-tight">
                Want the full picture?
              </h3>
              <p className="font-body text-base text-white/60 max-w-md leading-relaxed">
                The AI Flow goes deeper — a real look at your business and a custom roadmap
                for where AI saves you the most time. AOM meets with you directly.
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0">
              <a
                href="/book"
                className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-headline text-base tracking-wide hover:brightness-110 active:scale-95 transition-all duration-200 whitespace-nowrap"
                style={{ background: ORANGE, color: '#fff' }}
              >
                Book an AI Flow
                <ArrowRight size={18} />
              </a>
              <span className="font-body text-xs text-white/35">
                Free consultation · No commitment
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
}