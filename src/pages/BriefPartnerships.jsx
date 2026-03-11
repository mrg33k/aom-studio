import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Handshake, Building2, Truck, HardHat, Scale, ShieldCheck, Wrench, Users, Mic } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Partnership Strategy for Construction Retainers | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Actionable partnership targets for AOM to grow construction retainers. CPAs, bonding agents, supply houses, trade associations, and more.');
    setMeta('og:title', 'Partnership Strategy: Why Partnerships Beat Cold Email', true);
    setMeta('og:description', 'Specific, actionable partnership targets for AOM. Built so Jacob can start reaching out.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/partnerships', true);
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

const tier1Categories = [
  {
    letter: 'A',
    title: 'Construction CPAs and Bookkeepers',
    icon: Building2,
    why: 'Their clients ask for business advice constantly. When a contractor says "I need more jobs," the CPA has no answer. AOM gives them one.',
    targets: [
      { name: 'Whyte CPA', note: 'Specializes in HVAC, electrical, plumbing, GC accounting', approach: 'Email founder directly' },
      { name: 'Sean Core CPA', note: 'Dedicated contractor/construction CPA practice', approach: 'Email or LinkedIn DM' },
      { name: 'Conover Asay CPAs', note: 'Full construction accounting page. GCs, subs, construction mgmt', approach: 'Email construction practice partner' },
      { name: 'Wallace Plese + Dreher', note: 'Mid-size firm, dedicated construction vertical across AZ', approach: 'Request meeting with construction lead' },
      { name: 'Price Kong', note: 'Construction Services Group with extensive experience', approach: 'Request meeting with group head' },
    ],
  },
  {
    letter: 'B',
    title: 'Construction Business Coaches',
    icon: Users,
    why: 'They coach contractors on growth but can\'t deliver marketing. Their clients keep asking "how do I get more visible?" AOM fills that gap.',
    targets: [
      { name: 'Waters Business Consulting', note: 'Grew a construction company from $7.5M to $43M', approach: 'Email founder, reference their case study' },
      { name: 'The Aspire Institute', note: 'Dedicated contractor coaching, only vertical', approach: 'Propose becoming their recommended marketing vendor' },
      { name: 'Action Coach of Arizona', note: 'Has a specific construction coaching landing page', approach: 'LinkedIn + email' },
    ],
  },
  {
    letter: 'C',
    title: 'Surety Bonding Agents',
    icon: ShieldCheck,
    why: 'They see contractors at a pivotal growth moment: bidding bigger projects. A contractor going from $500K to $2M jobs NEEDS better marketing.',
    targets: [
      { name: 'Constructors Bonding, Inc. (CBI)', note: 'Arizona\'s largest surety agents since 1981', approach: '"Your clients are growing, we help them look like it"' },
      { name: 'CCI Surety', note: 'Southwest Regional Office in Phoenix, hard-to-place bonds', approach: 'Email the Phoenix office' },
      { name: 'Southwest Bond Services', note: '25+ years in AZ, local, relationship-driven', approach: 'Phone call + follow-up email' },
    ],
  },
];

const tier2Categories = [
  {
    letter: 'D',
    title: 'HVAC/Plumbing Supply Houses',
    icon: Wrench,
    why: 'Every mechanical contractor walks into a supply house multiple times a week. They host events, training days, product launches.',
    targets: [
      { name: 'Arizona Climate Supply', note: 'Local, HVAC and plumbing, Phoenix showroom' },
      { name: 'Johnstone Supply Phoenix', note: 'Major HVAC distributor, hosts training events' },
      { name: 'HVAC Depot Arizona', note: 'Arizona-focused wholesale, smaller = easier yes' },
      { name: 'Central Arizona Supply', note: 'Largest in-stock plumbing selection in Phoenix' },
    ],
  },
  {
    letter: 'E',
    title: 'Construction Staffing Agencies',
    icon: HardHat,
    why: 'They know exactly which contractors are growing (because they\'re hiring more workers). Introductions to growing companies.',
    targets: [
      { name: 'Trades Corp', note: 'Arizona\'s premier construction staffing, Phoenix HQ' },
      { name: 'Tradesmen International', note: 'National brand, local Phoenix office' },
      { name: 'K5 Rental', note: 'Family-owned equipment rental, personal relationships' },
    ],
  },
  {
    letter: 'F',
    title: 'Vehicle Wrap / Fleet Graphics',
    icon: Truck,
    why: 'A contractor who wraps their trucks already invests in brand visibility. They\'ve crossed the "marketing matters" threshold. Lead quality is excellent.',
    targets: [
      { name: '1st Impressions Truck Lettering', note: 'Central Phoenix since 1994, 30 years of relationships' },
      { name: 'Fast-Trac Designs', note: 'Arizona\'s leading vehicle wrap provider since 2007' },
      { name: 'SmartWrap', note: 'Phoenix-based, design + install' },
    ],
  },
];

const tier3Categories = [
  {
    letter: 'G',
    title: 'Trade Associations',
    icon: Handshake,
    targets: [
      { name: 'MTCAZ', note: 'HVAC/mechanical contractors across AZ' },
      { name: 'Arizona Builders Alliance', note: '380+ commercial contractors' },
      { name: 'SMACNA Arizona', note: 'Sheet metal and HVAC contractors' },
      { name: 'ASA-AZ', note: 'Subcontractors across trades' },
      { name: 'NAIOP Arizona', note: '900+ commercial real estate professionals' },
    ],
  },
  {
    letter: 'H',
    title: 'Construction Attorneys',
    icon: Scale,
    targets: [
      { name: 'Lang Thal King & Hanson', note: '#5 in AZ for construction litigation' },
      { name: 'Righi Fitch Law Group', note: 'ROC complaints, mechanics liens' },
      { name: 'Holden Willits', note: 'Best Lawyers 2026, Tier 1 in Phoenix' },
    ],
  },
];

const nicheIdeas = [
  { title: 'Film a Supply House Event for Free', desc: 'Half a day of shooting. Walk away with a highlight reel, face time with 30-50 contractors, and a relationship.' },
  { title: 'Construction Podcast Guest Strategy', desc: 'Building Arizona, AZ ROC Talk Podcast, Construction Hall of Fame. One episode reaches their entire audience.' },
  { title: 'ROC Licensing Schools as Referral Partners', desc: 'Every student who passes becomes a newly licensed contractor who needs a website and social media. Day zero.' },
  { title: 'Equipment Rental Company Partnerships', desc: 'Contractors who rent big = working on big projects. Equipment companies know who\'s growing.' },
  { title: 'The "Contractor\'s Wife" Network', desc: 'In small construction companies, the owner\'s spouse often manages marketing. Facebook groups, local meetups. Zero competition.' },
];

const weeklyPlan = [
  { week: 'Week 1', focus: 'CPAs + Bonding Agents', details: '5 CPA emails + 3 bonding agent emails + LinkedIn follow-ups' },
  { week: 'Week 2', focus: 'Coaches + Supply Houses', details: '3 coach emails + 2 in-person supply house visits' },
  { week: 'Week 3', focus: 'Wrap Shops + Staffing', details: '3-4 wrap shop emails + 2-3 staffing emails + 1 in-person visit' },
  { week: 'Week 4', focus: 'Associations + Attorneys', details: 'MTCAZ proposal first, then ABA + 2-3 attorney emails' },
];

function TierSection({ title, subtitle, categories, tierLabel }) {
  return (
    <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
      <div className="max-w-5xl mx-auto">
        <motion.div {...fadeUp()}>
          <SectionKicker>{tierLabel}</SectionKicker>
          <OrangeBar />
        </motion.div>

        <motion.h2
          className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-3"
          {...fadeUp(0.1)}
        >
          {title}
        </motion.h2>

        <motion.p
          className="font-body text-lg text-aom-text-muted leading-relaxed max-w-[55ch] mb-10"
          {...fadeUp(0.15)}
        >
          {subtitle}
        </motion.p>

        <div className="space-y-8">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.letter}
                className="p-6 md:p-8 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.1)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-aom-orange/30 text-aom-orange">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-headline text-lg font-bold text-aom-text-light">{cat.letter}. {cat.title}</h3>
                  </div>
                </div>

                {cat.why && (
                  <p className="font-body text-base text-white/60 leading-relaxed mb-5 max-w-[60ch]">{cat.why}</p>
                )}

                <div className="space-y-3">
                  {cat.targets.map((t, j) => (
                    <div key={j} className="flex items-start gap-3 pl-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                      <div>
                        <span className="font-body text-base text-aom-text-light font-medium">{t.name}</span>
                        <span className="font-body text-sm text-aom-text-muted ml-2">{t.note}</span>
                        {t.approach && (
                          <p className="font-body text-sm text-aom-sage mt-1">{t.approach}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function BriefPartnerships() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">
      {/* Hero */}
      <section className="bg-aom-night py-20 md:py-32 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.a
            href="/briefs"
            className="font-body text-sm text-aom-text-muted hover:text-aom-orange transition-colors inline-flex items-center gap-2 mb-12"
            {...fadeUp()}
          >
            <ArrowLeft size={14} /> All Briefs
          </motion.a>

          <motion.div {...fadeUp(0.05)}>
            <SectionKicker>STRATEGY BRIEF / MARCH 10, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            PARTNERSHIP STRATEGY: WHY PARTNERSHIPS BEAT COLD EMAIL
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.2)}
          >
            Specific, actionable partnership targets for AOM to grow construction retainers and adjacent revenue. Built so Jacob can start reaching out.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
              Alex (Deal Architect)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Core insight */}
      <section className="bg-aom-night-card border-y border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug mb-4"
            {...fadeUp()}
          >
            Cold email says "trust me."
          </motion.p>
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-orange leading-snug mb-6"
            {...fadeUp(0.1)}
          >
            Partnership says "your CPA sent me."
          </motion.p>
          <motion.p
            className="font-body text-base text-white/50 max-w-[50ch] mx-auto"
            {...fadeUp(0.15)}
          >
            Construction is a handshake industry. Partnerships compress the sales timeline because you're borrowing trust someone else already built.
          </motion.p>
        </div>
      </section>

      {/* Tier 1 */}
      <TierSection
        tierLabel="TIER 1: ALREADY HAVE THE RELATIONSHIP"
        title="READY TO REFER"
        subtitle="Service providers who already have trust with your exact customer. One referral relationship here replaces 50 cold emails."
        categories={tier1Categories}
      />

      {/* Tier 2 */}
      <section className="bg-aom-night-card">
        <TierSection
          tierLabel="TIER 2: HIGH VOLUME ACCESS"
          title="YOUR EXACT CUSTOMER, CONCENTRATED"
          subtitle="Companies that see hundreds of contractors every week. Physical access, event co-hosting, referral swaps."
          categories={tier2Categories}
        />
      </section>

      {/* Tier 3 */}
      <TierSection
        tierLabel="TIER 3: STRATEGIC POSITIONING"
        title="SHOW UP WHERE THEY GATHER"
        subtitle="Not for cold outreach. For showing up, filming events, building credibility in the room."
        categories={tier3Categories}
      />

      {/* Niche Ideas */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>OUTSIDE THE BOX</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THE ONES NOBODY ELSE IS DOING
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nicheIdeas.map((idea, i) => (
              <motion.div
                key={idea.title}
                className="p-6 border border-white/10 bg-aom-orange/[0.03] hover:border-aom-orange/30 transition-colors"
                {...fadeUp(i * 0.08)}
              >
                <h3 className="font-headline text-lg font-bold text-aom-text-light mb-2">{idea.title}</h3>
                <p className="font-body text-base text-white/60 leading-relaxed">{idea.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Execution Plan */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>EXECUTION PLAN FOR JACOB</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            4-WEEK ROLLOUT
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {weeklyPlan.map((w, i) => (
              <motion.div
                key={w.week}
                className="p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.1)}
              >
                <span className="font-headline text-sm font-bold text-aom-orange uppercase tracking-[0.1em]">{w.week}</span>
                <h3 className="font-headline text-xl font-bold text-aom-text-light mt-2 mb-2">{w.focus}</h3>
                <p className="font-body text-base text-white/60">{w.details}</p>
              </motion.div>
            ))}
          </div>

          {/* Success metrics */}
          <motion.div className="p-6 md:p-8 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">SUCCESS METRICS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { number: '5', label: 'Meetings booked in 30 days' },
                { number: '2', label: 'Active referral partners in 60 days' },
                { number: '1', label: 'Event filmed in 60 days' },
                { number: '3', label: 'Warm leads from partners in 90 days' },
              ].map((m, i) => (
                <div key={m.label} className="text-center">
                  <p className="font-headline text-3xl font-bold text-aom-orange">{m.number}</p>
                  <p className="font-body text-sm text-aom-text-muted mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Insight */}
      <section className="bg-aom-night-card border-t border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug max-w-[50ch] mx-auto"
            {...fadeUp()}
          >
            AOM doesn't need to convince 100 contractors that marketing matters. AOM needs to convince 10 trusted advisors to say "call AOM" when the question comes up. That's the leverage play.
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-aom-night py-8 px-6 text-center">
        <a
          href="https://aheadofmarket.com"
          className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-3"
        >
          AOM
        </a>
        <p className="font-body text-xs text-aom-text-muted">
          Strategy brief by Alex (Deal Architect). March 10, 2026.
        </p>
        <a
          href="/briefs"
          className="font-body text-xs text-aom-text-muted hover:text-aom-orange transition-colors mt-1 inline-block"
        >
          View all briefs
        </a>
      </footer>
    </div>
  );
}
