import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, TrendingUp, Building2 } from 'lucide-react';

// --- SEO ---
function useSEO() {
  useEffect(() => {
    document.title = 'Which Arizona HVAC Companies Are Running Facebook Ads? | AOM Research';

    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', 'Live data from Meta\'s Ad Library: 7 out of 10 major Arizona HVAC companies run paid Facebook and Instagram ads. See who\'s advertising and what\'s working.');
    setMeta('og:title', 'Your Competitors Are Already Advertising. Are You?', true);
    setMeta('og:description', 'We analyzed every active Meta ad from Arizona\'s top HVAC companies. Here\'s the data.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/research/hvac-ads-arizona', true);
  }, []);
}

// --- ANIMATION PRESETS ---
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
});

// --- DATA ---
const stats = [
  { number: '7/10', label: 'Running Meta Ads' },
  { number: '$0.69', label: 'Avg Cost Per Click' },
  { number: '32%', label: 'Lower CPL with Video' },
  { number: '< 10%', label: 'Of Contractors Advertising' },
];

const companies = [
  {
    name: 'George Brazil',
    adCount: 4,
    offer: '$59 check-up, $1,500 off mini-split, $4,000 off HVAC system',
    takeaway: 'Testing 4 price points at once. That\'s not guessing. That\'s data.',
    format: 'VIDEO + IMAGE CAROUSEL',
  },
  {
    name: 'Chas Roberts',
    adCount: 2,
    offer: 'Free second opinion for anyone unhappy with a competitor\'s quote',
    takeaway: 'Targeting people already shopping for HVAC. Bottom of funnel, high intent.',
    format: 'IMAGE ADS',
  },
  {
    name: 'American Home Water & Air',
    adCount: 4,
    offer: 'Save up to $3,100+ on a new high-efficiency AC system',
    takeaway: '3 variants of the same ad. Aggressive A/B testing, optimizing in real time.',
    format: 'MULTI-VARIANT IMAGE',
  },
  {
    name: 'Brewer\'s AC',
    adCount: 5,
    offer: 'Brand awareness + TRANE partnerships, locally owned since 1982',
    takeaway: 'Most diverse ad strategy in this research. Mixing brand and product.',
    format: 'VIDEO + IMAGE',
  },
  {
    name: 'Ideal Air',
    adCount: 6,
    offer: 'Up to $1,125 in rebates for a new AC, plus insulation services',
    takeaway: 'Running ads for 18+ months straight. You don\'t keep paying if it\'s not working.',
    format: 'IMAGE ADS',
  },
  {
    name: 'Ambient Edge',
    adCount: 4,
    offer: 'Educational content + M&A announcements across western AZ',
    takeaway: 'Using ads to position as the expert, not just a vendor. Smart brand play.',
    format: 'VIDEO + IMAGE',
  },
  {
    name: 'Francisco\'s Cooling',
    adCount: 1,
    offer: 'AC maintenance with fear-based messaging about Arizona heat',
    takeaway: 'Even small companies can compete with hyper-local targeting. Gilbert only.',
    format: 'IMAGE AD',
  },
];

const patterns = [
  {
    num: '01',
    title: 'Specific Dollar Amounts',
    desc: 'Never "great deals" or "affordable prices." Always "$59 check-up" or "$3,100 savings." Real numbers build trust.',
    example: 'George Brazil: 4 different price points in 4 different ads, launched same day.',
  },
  {
    num: '02',
    title: 'Video First',
    desc: '32% lower cost per lead vs static images. Vertical format for mobile. Real footage from job sites, not stock video.',
    example: 'George Brazil and Brewer\'s both lead with video. The numbers back it up.',
  },
  {
    num: '03',
    title: 'Local Identity',
    desc: '"Your neighbors." "Locally owned since 1982." City-specific targeting. Community contests. People hire people they trust.',
    example: 'Brewer\'s: "We\'re more than an HVAC company. We\'re your neighbors!"',
  },
  {
    num: '04',
    title: 'Urgency + Fear',
    desc: '"Arizona heat can destroy your AC." "Not happy with your quote?" Seasonal timing. All campaigns launched Feb-Mar before summer.',
    example: 'Francisco\'s: "Arizona heat can destroy your AC system if it isn\'t maintained."',
  },
  {
    num: '05',
    title: 'Multi-Campaign Testing',
    desc: 'Top companies run 3 to 6 ads simultaneously. Different offers, formats, audiences. Keep what works, kill what doesn\'t.',
    example: 'American Home Water & Air: 3 variants of the same ad launched within hours.',
  },
];

const gapStats = [
  { number: '274+', label: 'HVAC Contractors in Phoenix' },
  { number: '~30%', label: 'Have Active Facebook Pages' },
  { number: '< 10%', label: 'Run Paid Meta Ads' },
  { number: '$9,000+/mo', label: 'Average Google PPC Spend' },
  { number: '1/40th', label: 'Facebook Cost vs Google Per Click' },
];

const ctaBullets = [
  'Custom video content from real job sites',
  'Facebook + Instagram ad campaigns built for your market',
  'Monthly content calendar with consistent posting',
  'Performance tracking and optimization',
];

// --- SCROLL TO CTA ---
function scrollToCTA() {
  const el = document.getElementById('cta-section');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// --- COMPONENTS ---

function SectionKicker({ children }) {
  return (
    <p className="text-xs font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-4">
      {children}
    </p>
  );
}

function OrangeBar() {
  return <div className="w-12 h-[2px] bg-aom-orange mb-4" />;
}

function CTAButton({ children, className = '', onClick }) {
  return (
    <button
      onClick={onClick || scrollToCTA}
      className={`bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight px-8 py-4 min-h-[44px] hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/30 text-base cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

// --- SECTION A: HERO ---
function Hero() {
  return (
    <section className="bg-aom-night py-20 md:py-32 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <motion.a
          href="https://aheadofmarket.com"
          className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-12"
          {...fadeUp()}
        >
          AOM
        </motion.a>

        <motion.div {...fadeUp(0.1)}>
          <SectionKicker>MARKET RESEARCH / MARCH 2026</SectionKicker>
        </motion.div>

        <motion.div {...fadeUp(0.15)}>
          <OrangeBar />
        </motion.div>

        <motion.h1
          className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
          {...fadeUp(0.2)}
        >
          YOUR COMPETITORS ARE ALREADY ADVERTISING. ARE YOU?
        </motion.h1>

        <motion.p
          className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-10"
          {...fadeUp(0.3)}
        >
          We analyzed every active Facebook and Instagram ad from Arizona's top HVAC companies. Here's what we found.
        </motion.p>

        <motion.div {...fadeUp(0.4)}>
          <CTAButton>GET YOUR FREE AD STRATEGY SESSION</CTAButton>
        </motion.div>
      </div>
    </section>
  );
}

// --- SECTION B: STAT BAR ---
function StatBar() {
  return (
    <section className="bg-aom-night-card border-y border-white/10">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className={`p-4 md:p-8 text-center ${i < stats.length - 1 ? 'border-r border-white/10' : ''} ${i < 2 ? 'border-b md:border-b-0 border-white/10' : ''}`}
            {...fadeUp(i * 0.12)}
          >
            <p className="font-headline text-4xl md:text-5xl font-extrabold text-aom-orange">{stat.number}</p>
            <p className="font-body text-sm text-aom-text-muted uppercase tracking-[0.15em] mt-2">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// --- SECTION C: COMPANY PROFILES ---
function CompanyCards() {
  return (
    <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
      <div className="max-w-5xl mx-auto">
        <motion.div {...fadeUp()}>
          <SectionKicker>COMPETITIVE ANALYSIS</SectionKicker>
          <OrangeBar />
        </motion.div>

        <motion.h2
          className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
          {...fadeUp(0.1)}
        >
          REAL COMPANIES. REAL ADS. REAL RESULTS.
        </motion.h2>

        <motion.p
          className="font-body text-lg text-aom-text-muted leading-relaxed max-w-[55ch] mb-10"
          {...fadeUp(0.15)}
        >
          We pulled live data from Meta's Ad Library on March 10, 2026. Here's who's spending money to win your customers.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {companies.map((company, i) => (
            <motion.div
              key={company.name}
              className="p-6 md:p-8 border border-white/10 bg-white/[0.03] hover:border-aom-orange/30 hover:-translate-y-1 transition-all duration-300"
              {...fadeUp(i * 0.12)}
            >
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h3 className="font-headline text-lg font-bold text-aom-text-light">{company.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-body font-medium bg-aom-orange/15 text-aom-orange rounded-sm tracking-wide">
                  {company.adCount} ACTIVE {company.adCount === 1 ? 'AD' : 'ADS'}
                </span>
              </div>
              <p className="font-body text-base text-white/70 mb-3">{company.offer}</p>
              <p className="font-body text-sm text-aom-text-muted italic">{company.takeaway}</p>
              <p className="text-xs font-body text-aom-sage uppercase tracking-[0.15em] mt-4">{company.format}</p>
            </motion.div>
          ))}
        </div>

        {/* Not advertising callout */}
        <motion.div
          className="p-6 md:p-8 border border-white/10 bg-aom-orange/5 mb-10"
          {...fadeUp()}
        >
          <h3 className="font-headline text-xl font-bold text-aom-text-light mb-3">WHO'S NOT ADVERTISING?</h3>
          <p className="font-body text-base text-white/60">
            Parker & Sons ($210M revenue), Howard Air, and Goettl have zero active Meta ads. The biggest players aren't in this game yet. The window is open.
          </p>
        </motion.div>

        {/* Mid-page CTA */}
        <motion.div className="text-center" {...fadeUp()}>
          <button
            onClick={scrollToCTA}
            className="font-body text-base text-aom-orange hover:text-aom-orange-hover inline-flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
          >
            SEE WHAT WE'D BUILD FOR YOU <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// --- SECTION D: PATTERNS ---
function Patterns() {
  return (
    <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
      <div className="max-w-5xl mx-auto">
        <motion.div {...fadeUp()}>
          <SectionKicker>AD STRATEGY BREAKDOWN</SectionKicker>
          <OrangeBar />
        </motion.div>

        <motion.h2
          className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
          {...fadeUp(0.1)}
        >
          THE PLAYBOOK EVERY WINNING AD FOLLOWS
        </motion.h2>

        <div>
          {patterns.map((p, i) => (
            <motion.div
              key={p.num}
              className={`grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 py-8 ${i < patterns.length - 1 ? 'border-b border-white/10' : ''}`}
              {...fadeUp(i * 0.12)}
            >
              <div className="md:col-span-2">
                <span className="font-headline text-3xl md:text-5xl font-extrabold text-aom-orange/30">{p.num}</span>
              </div>
              <div className="md:col-span-10">
                <h3 className="font-headline text-xl font-bold text-aom-text-light mb-2">{p.title}</h3>
                <p className="font-body text-base text-white/60 leading-relaxed">{p.desc}</p>
                <p className="font-body text-sm text-aom-sage italic mt-2">{p.example}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- SECTION E: THE GAP ---
function TheGap() {
  return (
    <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
      <div className="max-w-5xl mx-auto">
        <motion.div {...fadeUp()}>
          <SectionKicker>THE OPPORTUNITY</SectionKicker>
          <OrangeBar />
        </motion.div>

        <motion.h2
          className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
          {...fadeUp(0.1)}
        >
          HERE'S WHAT MOST CONTRACTORS ARE MISSING
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Left: supporting text */}
          <motion.div className="md:col-span-7" {...fadeUp(0.15)}>
            <p className="font-body text-lg text-white/60 leading-relaxed mb-6">
              The biggest HVAC companies in Arizona are spending $9,000+ per month on Google Ads. They're paying $29 per click. Meanwhile, Facebook delivers the same leads for $0.69 per click.
            </p>
            <p className="font-body text-lg text-white/60 leading-relaxed mb-6">
              Most contractors don't have a Facebook ad strategy. Most don't even have a consistent social media presence. The ones who do are pulling leads at a fraction of the cost.
            </p>
            <p className="font-body text-lg text-white/60 leading-relaxed">
              This isn't about being everywhere. It's about being where your customers are already scrolling, with content that makes them stop and call.
            </p>
          </motion.div>

          {/* Right: stat stack */}
          <div className="md:col-span-5">
            {gapStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className={`py-4 ${i < gapStats.length - 1 ? 'border-b border-white/10' : ''}`}
                {...fadeUp(0.15 + i * 0.1)}
              >
                <p className="font-headline text-3xl font-extrabold text-aom-orange">{stat.number}</p>
                <p className="font-body text-sm text-aom-text-muted">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Closing quote */}
        <motion.p
          className="font-headline text-2xl md:text-3xl font-bold text-aom-text-light text-center leading-snug mt-16 max-w-[50ch] mx-auto"
          {...fadeUp(0.2)}
        >
          THE COMPANIES SHOWING UP IN FEEDS TODAY ARE THE ONES WINNING CONTRACTS TOMORROW. THE REST ARE PAYING 10X TO CATCH UP.
        </motion.p>
      </div>
    </section>
  );
}

// --- SECTION F: CTA ---
function CTASection() {
  return (
    <section id="cta-section" className="bg-aom-orange/5 border-t border-aom-orange/40 py-12 px-6 md:py-24 md:px-12">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          className="font-headline text-3xl md:text-4xl font-bold uppercase text-aom-text-light mb-4"
          {...fadeUp()}
        >
          READY TO SHOW UP WHERE YOUR CUSTOMERS ARE LOOKING?
        </motion.h2>

        <motion.p
          className="font-body text-lg text-white/60 mb-8"
          {...fadeUp(0.1)}
        >
          This is the kind of research we do for every client. Yours is next. AOM builds and manages complete social media advertising programs for contractors. Real content. Real strategy. Real results.
        </motion.p>

        <motion.ul
          className="font-body text-base text-white/70 space-y-3 max-w-md mx-auto text-left mb-8"
          {...fadeUp(0.15)}
        >
          {ctaBullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-aom-orange flex-shrink-0 mt-1" />
              <span>{bullet}</span>
            </li>
          ))}
        </motion.ul>

        <motion.p
          className="font-headline text-xl font-bold text-aom-text-light mt-8 mb-6"
          {...fadeUp(0.2)}
        >
          Starting at $3,000/month
        </motion.p>

        <motion.div {...fadeUp(0.25)}>
          <a
            href="https://aheadofmarket.com/#construction"
            className="inline-block bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight px-8 py-4 min-h-[44px] hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/30 text-base w-full sm:w-auto text-center"
          >
            BOOK A FREE STRATEGY CALL
          </a>
        </motion.div>

        <motion.div className="mt-4" {...fadeUp(0.3)}>
          <a
            href="https://ambitionac.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm text-aom-orange hover:text-aom-orange-hover inline-flex items-center gap-1 transition-colors min-h-[44px]"
          >
            See Our Work with Ambition Mechanical <ArrowRight size={14} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// --- SECTION G: FOOTER ---
function FooterNote() {
  return (
    <footer className="bg-aom-night py-8 px-6 text-center">
      <a
        href="https://aheadofmarket.com"
        className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-3"
      >
        AOM
      </a>
      <p className="font-body text-xs text-aom-text-muted">
        Research conducted March 2026 using Meta Ad Library public data.
      </p>
      <a
        href="https://aheadofmarket.com"
        className="font-body text-xs text-aom-text-muted hover:text-aom-text-light transition-colors mt-1 inline-block"
      >
        aheadofmarket.com
      </a>
    </footer>
  );
}

// --- MAIN PAGE ---
export default function ResearchHVAC() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">
      <Hero />
      <StatBar />
      <CompanyCards />
      <Patterns />
      <TheGap />
      <CTASection />
      <FooterNote />
    </div>
  );
}
