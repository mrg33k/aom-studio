import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Users, TrendingUp, Target, Zap, BarChart3,
  Globe, Shield, Layers, Search, Calendar, CheckCircle2, Wrench,
  Lightbulb, ExternalLink, ArrowRight
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Ambition Mechanical: Market Research & Strategy | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Deep market research and strategic marketing plan for Ambition Mechanical. GC profiles, property management firms, trade organizations, and a data-driven plan to prove ROI.');
    setMeta('og:title', 'Ambition Mechanical: Market Research & Strategy', true);
    setMeta('og:description', 'Data-driven marketing strategy built on real Phoenix market intelligence. Trade orgs, GC profiles, PM firms, and a plan that compounds.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/ambition-market-strategy', true);
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

/* ─── DATA ─── */

const heroStats = [
  { number: '$205B+', label: 'AZ Construction Investment' },
  { number: '3', label: 'Trade Orgs Mapped' },
  { number: '20+', label: 'Top GCs Profiled' },
  { number: '13+', label: 'PM Firms Identified' },
];

const tradeOrgs = [
  {
    name: 'BOMA Greater Phoenix',
    fullName: 'Building Owners and Managers Association',
    website: 'bomaphoenix.org',
    founded: '1936',
    phone: '(602) 200-3898',
    members: 'Property managers, building owners, developing professionals, building engineers, allied professionals',
    ambitionPlay: 'Allied membership + event sponsorship. Sponsoring events, presenting on HVAC innovation, or hosting a "lunch and learn" puts Mo and Eric in front of every property manager in the Valley.',
    valuePerContact: '$10-50K/year',
    bestChannel: 'LinkedIn + Events',
    events: ['State of the Market (annual flagship)', 'Monthly educational programming', 'Young Professionals Group (32 members)', 'Green Buildings Committee'],
    demographicNote: 'Property management overall is 59.5% female. 5.4% increase in women aged 39 and younger entering the field. The people who pick up the phone when a chiller goes down are increasingly younger women in assistant PM and PM roles. They are digitally native, use LinkedIn daily, and evaluate vendors differently than the old guard.',
  },
  {
    name: 'IREM Phoenix Chapter #47',
    fullName: 'Institute of Real Estate Management',
    website: 'iremphx.org',
    founded: 'International, 20,000+ members',
    members: 'Certified property managers (CPM), accredited commercial managers (ACoM)',
    ambitionPlay: 'Relationship building with CPMs. A CPM who trusts Ambition becomes a long-term relationship worth hundreds of thousands in recurring service and project work.',
    valuePerContact: '$50-200K/year',
    bestChannel: 'LinkedIn + Luncheons',
    events: ['IREM/CCIM Economic Forecast (joint annual event)', 'Monthly luncheons and education sessions', 'Networking mixers'],
    demographicNote: 'Mid-career to senior property management professionals. These are the people who manage portfolios of commercial buildings, make vendor selection decisions, and control maintenance budgets.',
  },
  {
    name: 'IFMA Greater Phoenix',
    fullName: 'International Facility Management Association',
    website: 'ifmaphoenix.org',
    founded: '40+ years in Phoenix',
    phone: '(602) 570-8808',
    members: 'Facility managers, operations directors, maintenance professionals across corporate, industrial, healthcare, education, government',
    ambitionPlay: 'Trade show presence + case studies. IFMA members control facilities budgets at the largest commercial and industrial properties in Phoenix. Data centers, semiconductor fabs, corporate campuses.',
    valuePerContact: '$100K-500K+/year',
    bestChannel: 'Trade Shows + LinkedIn',
    events: ['IFMA Phoenix Trade Show 2026 (Mesa Convention Center)', 'Monthly meetings with networking receptions', 'Training classes and certifications', 'Annual awards ceremony'],
    demographicNote: 'Won IFMA Large Chapter of the Year. Student chapter at ASU (pipeline of future decision-makers). A single IFMA relationship can be worth more than 50 residential calls.',
  },
];

const orgComparison = [
  { attr: 'Primary Members', boma: 'Property managers, building owners', irem: 'Certified property managers', ifma: 'Facility managers, operations directors' },
  { attr: 'Decision Level', boma: 'Day-to-day vendor selection', irem: 'Portfolio-level vendor relationships', ifma: 'Building systems and maintenance budgets' },
  { attr: 'Age Skew', boma: 'Younger (developing professionals trend)', irem: 'Mid-career to senior', ifma: 'Mixed, corporate-leaning' },
  { attr: 'Best Channel', boma: 'LinkedIn + events', irem: 'LinkedIn + luncheons', ifma: 'Trade shows + LinkedIn' },
  { attr: "Ambition's Play", boma: 'Allied membership + event sponsorship', irem: 'Relationship building with CPMs', ifma: 'Trade show presence + case studies' },
  { attr: 'Value per Contact', boma: '$10-50K/year', irem: '$50-200K/year', ifma: '$100K-500K+/year' },
];

const tier1GCs = [
  { name: 'Willmeng Construction', hq: 'Phoenix (est. 1977)', revenue: '$870M', specialty: 'Commercial ground-up, tenant improvement. 14 market sectors.', mechNeeds: 'Data centers, healthcare, commercial office HVAC.', note: 'Employee-owned (ESOP). ENR Southwest 2023 Contractor of the Year.' },
  { name: 'Kitchell', hq: 'Phoenix (est. 1950)', revenue: '$644M', specialty: 'Healthcare, education, corrections, gaming, performing arts.', mechNeeds: 'Hospital HVAC systems, school HVAC, cleanroom environments.', note: 'Employee-owned. 1,100 workforce. $45B+ in public sector construction completed.' },
  { name: 'CHASSE Building Team', hq: 'Tempe & Tucson (est. 2007)', revenue: '$625M/yr in projects', specialty: 'K-12, higher education, healthcare, municipal.', mechNeeds: 'Education HVAC, healthcare mechanical.', note: '250 employees. Values-driven.' },
  { name: 'DPR Construction', hq: 'Phoenix office (national)', revenue: 'Multi-billion', specialty: 'Advanced tech, life sciences, healthcare, data centers.', mechNeeds: 'Mission-critical HVAC, cleanroom, data center cooling.', note: 'Net-zero energy Phoenix office (LEED Platinum). ~11,000 staff nationally.' },
  { name: 'Sundt Construction', hq: 'Tempe (est. 1890)', revenue: '$4.5B industrial', specialty: 'Industrial, infrastructure, building.', mechNeeds: 'Industrial HVAC, process cooling, heavy mechanical.', note: "Employee-owned. Named nation's safest contractor twice." },
  { name: 'McCarthy Building Companies', hq: 'Chandler office (national)', revenue: 'Multi-billion', specialty: 'Commercial, healthcare, aviation, renewable energy.', mechNeeds: 'Healthcare HVAC, commercial systems, data centers.', note: 'Innovation Center in Chandler. 2,000 regional craft professionals.' },
];

const tier2GCs = [
  { name: 'Haydon Companies', details: 'Phoenix, est. 1991. $292M revenue. 500+ employees. Municipal, healthcare, education.', mechNeeds: 'Municipal HVAC, healthcare, mission-critical cooling.' },
  { name: 'Layton Construction', details: "Phoenix office. Southwest's #1 largest contractor. AZ GC of the Year 8 times.", mechNeeds: 'Commercial office HVAC, retail, mixed-use.' },
  { name: 'Hensel Phelps', details: 'Phoenix, est. 1937. Southwest Region HQ. $2.2B+ revenue nationally.', mechNeeds: 'Government/military HVAC, aviation terminal systems.' },
  { name: 'Ryan Companies', details: 'Phoenix office. Ranked #3 AZ GC (2024). Development + construction + management.', mechNeeds: 'Mixed-use, industrial, commercial HVAC.' },
  { name: 'LGE Design Build', details: 'Phoenix & Dallas, est. 1994. 1,200+ projects, 28M+ sq ft. #1 Industrial GC in AZ 4 consecutive years.', mechNeeds: 'Industrial HVAC, warehouse, distribution center cooling.' },
  { name: 'PCL Construction', details: 'Phoenix office. Canadian HQ, major US presence.', mechNeeds: 'Commercial, industrial HVAC.' },
  { name: 'Okland Construction', details: 'Tempe office. Ranked #9 AZ GC (2024). Est. 1918.', mechNeeds: 'Commercial, institutional HVAC.' },
  { name: 'CORE Construction', details: 'Scottsdale. Education, government, healthcare focus.', mechNeeds: 'School district HVAC, government facility mechanical.' },
];

const nationalPMs = [
  { name: 'CBRE', presence: 'Phoenix office since 1952. Industry leader in the Valley.', portfolio: '7.7B sq ft globally. Major Phoenix portfolio.' },
  { name: 'JLL', presence: 'Full-service Phoenix office.', portfolio: 'Top 5 globally.' },
  { name: 'Cushman & Wakefield', presence: '190+ Phoenix professionals. 2,744 transactions in 2023. $5.1B transaction value.', portfolio: '45M sq ft.' },
  { name: 'Colliers International', presence: 'Major Phoenix office. Full-service CRE.', portfolio: 'National top 5.' },
  { name: 'Lincoln Property Company', presence: 'Leading industrial RE developer in AZ.', portfolio: '601M sq ft nationally (49.9% growth in 2024).' },
];

const localPMs = [
  { name: 'Plaza Companies', details: 'Full-service CRE. Office, medical office, mixed-use.', relevance: 'Medical office HVAC maintenance. High-value.' },
  { name: 'ViaWest Group', details: 'Phoenix, est. 2003. Value-add office and industrial. $3B+ in transactions.', relevance: 'Office and industrial HVAC service contracts.' },
  { name: 'Mark-Taylor Companies', details: '#1 multifamily management in AZ (Ranking Arizona 2026).', relevance: 'Large-scale mechanical systems.' },
  { name: 'Kidder Mathews', details: 'Largest fully independent CRE firm in Western US. 10 years in Phoenix.', relevance: 'Commercial property management and leasing.' },
  { name: 'CPI (Commercial Properties Inc.)', details: "One of Valley's most trusted CRE firms.", relevance: 'Commercial HVAC maintenance contracts.' },
  { name: 'MEB Management Services', details: 'Est. 1998. 501-1,000 employees. Multifamily specialist.', relevance: 'Large-scale residential mechanical.' },
  { name: 'P.B. Bell', details: 'Family-owned, Scottsdale. Est. 1976.', relevance: 'Mixed portfolio mechanical needs.' },
  { name: 'Dunlap & Magee', details: '40+ years. Multi-family and commercial assets.', relevance: 'Building maintenance contracts.' },
];

const valuesAlignment = [
  { theme: 'Quality / Excellence', alignment: 'Ambition is quality-over-quantity. Technical precision.', companies: 'Sundt, McCarthy, Layton, Hensel Phelps, Ryan', fit: 'STRONG', pct: 95 },
  { theme: 'Integrity / Honesty', alignment: "Eric's 20+ years in sales built on trust.", companies: 'Sundt, Layton, DPR, PCL, Ryan, Hensel Phelps', fit: 'STRONG', pct: 90 },
  { theme: 'Innovation / Technical', alignment: "Mo's technical brilliance. Young team with modern approaches.", companies: 'Kitchell, Layton, DPR, Haydon', fit: 'STRONG', pct: 85 },
  { theme: 'People-First / Family', alignment: 'Small, tight crew. Family values.', companies: 'Willmeng, Ryan, Haydon, CHASSE', fit: 'STRONG', pct: 85 },
  { theme: 'Grit / Problem-Solving', alignment: 'Young team that figures it out.', companies: 'Haydon, Okland', fit: 'STRONG', pct: 80 },
  { theme: 'Continuous Improvement', alignment: 'Innovation-driven approach to mechanical work.', companies: 'Sundt, DPR', fit: 'STRONG', pct: 80 },
  { theme: 'Safety', alignment: 'Industry standard, must demonstrate.', companies: 'Sundt, Layton, Ryan', fit: 'MODERATE', pct: 60 },
  { theme: 'Community / Service', alignment: 'Phoenix-rooted. Local investment.', companies: 'Willmeng, Sundt, Kitchell, Hensel Phelps', fit: 'MODERATE', pct: 55 },
];

const missionStatements = [
  { option: '01', tagline: 'Built different. Built to last.', why: 'Short, memorable, ownable. Speaks to both the construction work (built to last) and the identity as a different kind of mechanical contractor (built different). Appeals to younger decision-makers.', use: 'Brand tagline, TikTok bio, hard hat sticker, proposal cover page.' },
  { option: '02', tagline: "Your building's mechanical system is only as good as the team behind it.", why: 'Puts the focus on people. Resonates with PMs who have been burned by unreliable subs. Positions the team as the differentiator.', use: 'Website hero, LinkedIn header.' },
  { option: '03', tagline: 'Engineering comfort. Advancing buildings.', why: '"Engineering" signals technical depth. "Comfort" grounds it. "Advancing" signals innovation. Clean and professional.', use: 'Business cards, LinkedIn headers.' },
  { option: '04', tagline: 'Precision mechanical for the projects that matter.', why: '"Precision" signals quality over quantity. "Projects that matter" positions Ambition as premium, not commodity.', use: 'Proposals, case study headers.' },
  { option: '05', tagline: "We don't just install systems. We build reputations.", why: "Speaks directly to what GCs care about. Their reputation rides on their subs. If Ambition's work makes the GC look good, that GC keeps calling.", use: 'Sales conversations, case study headers.' },
];

const linkedinPillars = [
  { pillar: 'Case Studies', type: 'Project walkthrough with before/during/after. Tag the GC.', freq: '2x/week', example: '"Just wrapped 14 floors of mechanical for [GC]. Here\'s what that looks like."' },
  { pillar: 'Technical Knowledge', type: 'HVAC explainers, system comparisons, code updates.', freq: '1x/week', example: '"VRF vs. RTU: Which is right for your building? Here\'s the data."' },
  { pillar: 'Mo on the Job', type: 'Mo in a blazer on site. Professional but real.', freq: '1x/week', example: 'Short video of Mo explaining a complex system in plain language.' },
  { pillar: 'Team/Culture', type: 'Crew spotlights, project milestones, hiring moments.', freq: '1x/week', example: '"This is the team that delivered [project] 2 weeks early."' },
];

const socialContent = [
  { type: '"Did You Know?"', format: 'Mo on camera, 30 seconds, one surprising HVAC fact', why: 'Educational content gets saved and shared' },
  { type: 'Time-lapse Installs', format: '15-30 second time-lapses of complex installations', why: 'Satisfying to watch. Algorithm loves completion videos.' },
  { type: 'Before/After', format: 'Split screen or swipe. Show the transformation.', why: "TikTok's #1 engagement format for trades" },
  { type: 'Day in the Life', format: 'Follow a tech or Mo through a real workday', why: 'Authenticity. Recruitment angle. Shows scale.' },
  { type: '"What Went Wrong"', format: 'Walk through a problem Ambition solved.', why: 'Positions as problem-solvers, not just installers' },
];

const googleAdsAllocation = [
  { spend: '$250/mo', target: 'Commercial HVAC service', keywords: '"commercial HVAC contractor Phoenix", "commercial AC repair Phoenix"', why: 'Highest intent. People searching are looking to hire now.' },
  { spend: '$150/mo', target: 'Specific services', keywords: '"chiller repair Phoenix", "VRF installation Phoenix", "data center cooling Phoenix"', why: 'More specific = less competition = lower CPC.' },
  { spend: '$100/mo', target: 'Retargeting', keywords: 'Display ads shown to people who already visited the website', why: 'Cheapest clicks. Keeps Ambition top of mind.' },
];

const trackingEvents = [
  { event: 'contact_form_submit', trigger: 'Form submission on contact page', why: 'Primary lead conversion' },
  { event: 'phone_click', trigger: 'Click on phone number', why: 'Mobile lead tracking' },
  { event: 'case_study_view', trigger: 'Pageview on any /case-study/ URL', why: 'Content engagement' },
  { event: 'case_study_scroll_75', trigger: '75% scroll on case study pages', why: 'Did they actually read it?' },
  { event: 'service_page_view', trigger: 'Pageview on any /services/ URL', why: 'Which services get the most interest?' },
  { event: 'cta_click', trigger: 'Click on any CTA button', why: 'Which CTAs convert?' },
  { event: 'video_play', trigger: 'Embedded video started', why: 'Video content engagement' },
];

const quarterlyTimeline = [
  { weeks: 'Weeks 1-2', action: 'LinkedIn profile optimization, Insight Tag install, GA4 setup, first 5 case studies published', outcome: 'Foundation in place. Tracking live.' },
  { weeks: 'Weeks 3-4', action: '100+ targeted LinkedIn connections. 8-10 posts. First Google Ads campaign live.', outcome: 'Initial visibility. Data starts flowing.' },
  { weeks: 'Weeks 5-6', action: 'Case study outreach to 20 prospects. Engage with BOMA/IREM/IFMA content.', outcome: 'First inbound inquiries from LinkedIn. Insight Tag shows who is looking.' },
  { weeks: 'Weeks 7-8', action: 'Cross-reference Insight Tag data with active bids. Attend one BOMA or IFMA event.', outcome: 'First meeting booked from digital efforts.' },
  { weeks: 'Weeks 9-10', action: 'Review Google Ads data. Kill underperforming keywords. Scale what works.', outcome: '2-3 qualified conversations from digital channels.' },
  { weeks: 'Weeks 11-12', action: 'Compile quarterly ROI report. Compare digital-sourced leads vs. traditional.', outcome: 'Proof that the strategy works. Data to justify scaling.' },
];

const generationalShift = [
  { old: '"Who do I know?"', new: '"Who have I seen?"' },
  { old: 'Referrals from other GCs', new: 'LinkedIn research + social media presence' },
  { old: 'Golf course relationships', new: 'Digital-first evaluation' },
  { old: 'Loyal to existing subs', new: 'Open to new subs who demonstrate capability' },
  { old: 'Phone calls', new: 'Email and LinkedIn messages' },
  { old: 'Skeptical of marketing', new: 'Expect marketing as proof of professionalism' },
  { old: 'Evaluate on price and availability', new: 'Evaluate on technical capability, culture fit, and digital presence' },
];

const gcTargets = [
  'Willmeng project managers',
  'Kitchell estimators and PMs',
  'Haydon project directors',
  'LGE Design Build PMs',
  'DPR Phoenix office team',
  'Layton AZ team leads',
  'Sundt building division PMs',
  'McCarthy Phoenix office',
  'CHASSE project managers',
  'Ryan Companies Phoenix development team',
];

const pmTargets = [
  'CBRE Phoenix property managers',
  'Cushman & Wakefield building engineers',
  'JLL operations managers',
  'Lincoln Property facility directors',
  'Plaza Companies maintenance directors',
  'ViaWest Group property managers',
];

/* ─── COMPONENT ─── */

export default function BriefAmbitionStrategy() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">

      {/* ══ HERO ══ */}
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
            <SectionKicker>MARKET RESEARCH & STRATEGY / MARCH 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            AMBITION MECHANICAL: THE MARKET AND THE PLAN
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[60ch] mb-6"
            {...fadeUp(0.2)}
          >
            Deep research on every trade organization, general contractor, and property management firm in Phoenix that matters. Plus a data-driven marketing strategy built to prove ROI this quarter.
          </motion.p>

          <motion.div className="flex flex-wrap items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-aom-orange" />
              Prepared for Eric & Mo
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <Building2 size={12} className="text-aom-orange" />
              Ambition Mechanical
            </span>
          </motion.div>
        </div>
      </section>

      {/* ══ HERO STATS ══ */}
      <section className="bg-aom-night-card border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0">
          {heroStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`p-4 md:p-8 text-center ${i < 3 ? 'border-r border-white/10' : ''} ${i < 2 ? 'border-b md:border-b-0 border-white/10' : ''}`}
              {...fadeUp(i * 0.12)}
            >
              <p className="font-headline text-2xl md:text-3xl font-bold text-aom-orange">{stat.number}</p>
              <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ SECTION 1: TRADE ORGANIZATIONS ══ */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TARGET CLIENT PROFILES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            TRADE ORGANIZATIONS
          </motion.h2>

          <motion.p className="font-body text-base text-aom-text-muted leading-relaxed mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Three organizations control access to every property manager, facility director, and building owner in Phoenix. These are the rooms Ambition needs to be in.
          </motion.p>

          <div className="space-y-6">
            {tradeOrgs.map((org, i) => (
              <motion.div
                key={org.name}
                className="border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                {...fadeUp(i * 0.1)}
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-headline text-xl md:text-2xl font-bold text-aom-text-light">{org.name}</h3>
                      <p className="font-body text-sm text-aom-text-muted mt-1">{org.fullName}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-3 py-1 bg-aom-orange/10 border border-aom-orange/30 text-aom-orange font-body text-sm font-bold">
                        {org.valuePerContact}/year
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mb-2">Members</p>
                      <p className="font-body text-base text-white/60 leading-relaxed">{org.members}</p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mb-2">Key Events</p>
                      <ul className="space-y-1">
                        {org.events.map((e, j) => (
                          <li key={j} className="font-body text-base text-white/60 flex items-start gap-2">
                            <span className="text-aom-orange mt-1.5 flex-shrink-0"><CheckCircle2 size={12} /></span>
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-aom-orange/[0.05] border border-aom-orange/20 mb-4">
                    <p className="font-body text-xs text-aom-orange uppercase tracking-[0.15em] mb-2 font-bold">Ambition's Play</p>
                    <p className="font-body text-base text-aom-orange/80 leading-relaxed">{org.ambitionPlay}</p>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/10">
                    <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mb-2 font-bold">Demographic Insight</p>
                    <p className="font-body text-base text-white/50 leading-relaxed">{org.demographicNote}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ORG COMPARISON TABLE ══ */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CROSS-ORGANIZATION SUMMARY</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            SIDE-BY-SIDE COMPARISON
          </motion.h2>

          <div className="overflow-x-auto -mx-6 px-6">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/10 mb-2">
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Attribute</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase text-center">BOMA</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase text-center">IREM</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase text-center">IFMA</span>
              </div>
              {orgComparison.map((row, i) => (
                <motion.div
                  key={row.attr}
                  className="grid grid-cols-4 gap-2 p-4 border border-white/10 bg-white/[0.02] mb-1"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-body text-sm text-white/70 font-medium">{row.attr}</span>
                  <span className="font-body text-sm text-white/50 text-center">{row.boma}</span>
                  <span className="font-body text-sm text-white/50 text-center">{row.irem}</span>
                  <span className="font-body text-sm text-white/50 text-center">{row.ifma}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 2: GENERAL CONTRACTORS ══ */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TOP GENERAL CONTRACTORS IN PHOENIX</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            THE GCs THAT MATTER
          </motion.h2>

          <motion.p className="font-body text-base text-aom-text-muted leading-relaxed mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Phoenix is in the middle of a historic construction boom. Over $205 billion in semiconductor investment alone. Every major GC in the Valley needs reliable mechanical subs.
          </motion.p>

          {/* Tier 1 */}
          <motion.div {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-orange uppercase tracking-[0.05em] mb-6">Tier 1: Major GCs (Revenue $500M+)</p>
          </motion.div>

          <div className="space-y-3 mb-12">
            {tier1GCs.map((gc, i) => (
              <motion.div
                key={gc.name}
                className="p-5 md:p-6 border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                {...fadeUp(i * 0.06)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                  <h3 className="font-headline text-lg font-bold text-aom-text-light">{gc.name}</h3>
                  <div className="flex items-center gap-3 text-sm font-body text-aom-text-muted">
                    <span>{gc.hq}</span>
                    <span className="text-white/20">|</span>
                    <span className="text-aom-orange font-medium">{gc.revenue}</span>
                  </div>
                </div>
                <p className="font-body text-sm text-white/40 mb-2">{gc.note}</p>
                <div className="flex flex-col md:flex-row gap-4 mt-3">
                  <div className="flex-1">
                    <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mb-1">Specialty</p>
                    <p className="font-body text-base text-white/60">{gc.specialty}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mb-1">Mechanical Sub Needs</p>
                    <p className="font-body text-base text-aom-orange/70">{gc.mechNeeds}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tier 2 */}
          <motion.div {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-orange uppercase tracking-[0.05em] mb-6">Tier 2: Strong Regional GCs ($100M-$500M)</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tier2GCs.map((gc, i) => (
              <motion.div
                key={gc.name}
                className="p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <h3 className="font-headline text-base font-bold text-aom-text-light mb-2">{gc.name}</h3>
                <p className="font-body text-sm text-white/40 mb-2">{gc.details}</p>
                <p className="font-body text-sm text-aom-orange/60">{gc.mechNeeds}</p>
              </motion.div>
            ))}
          </div>

          {/* What GCs Look For */}
          <motion.div className="mt-12 p-6 md:p-8 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-text-light mb-4 uppercase">What GCs Look for in a Mechanical Sub</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Reliability: Show up when you say you will. Hit deadlines.',
                'Technical capability: Data centers, hospitals, cleanrooms.',
                'Safety record: EMR rating, OSHA compliance.',
                'Financial stability: Bonding and insurance capacity.',
                'Workforce: Enough skilled technicians for multiple projects.',
                'Communication: Proactive updates, clean paperwork.',
                'Reputation: Who vouches for you? Track record.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="font-headline text-lg font-bold text-aom-orange/30 mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <p className="font-body text-base text-white/60">{item}</p>
                </div>
              ))}
            </div>
            <p className="font-body text-sm text-aom-orange/60 mt-6 border-t border-white/10 pt-4">
              Ambition's content strategy should directly address these 7 concerns in every case study and LinkedIn post.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ SECTION 3: PROPERTY MANAGEMENT FIRMS ══ */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PROPERTY MANAGEMENT LANDSCAPE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THE FIRMS THAT HIRE MECHANICAL CONTRACTORS
          </motion.h2>

          {/* National */}
          <motion.div {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-orange uppercase tracking-[0.05em] mb-6">National Firms with Major Phoenix Operations</p>
          </motion.div>

          <div className="overflow-x-auto -mx-6 px-6 mb-10">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-3 gap-2 p-4 border-b border-white/10 mb-2">
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Company</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Phoenix Presence</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Portfolio</span>
              </div>
              {nationalPMs.map((pm, i) => (
                <motion.div
                  key={pm.name}
                  className="grid grid-cols-3 gap-2 p-4 border border-white/10 bg-white/[0.02] mb-1"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-headline text-base font-bold text-aom-text-light">{pm.name}</span>
                  <span className="font-body text-sm text-white/50">{pm.presence}</span>
                  <span className="font-body text-sm text-aom-orange/60">{pm.portfolio}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Regional/Local */}
          <motion.div {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-orange uppercase tracking-[0.05em] mb-6">Regional & Local Firms</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
            {localPMs.map((pm, i) => (
              <motion.div
                key={pm.name}
                className="p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <h3 className="font-headline text-base font-bold text-aom-text-light mb-1">{pm.name}</h3>
                <p className="font-body text-sm text-white/40 mb-2">{pm.details}</p>
                <p className="font-body text-sm text-aom-orange/60">{pm.relevance}</p>
              </motion.div>
            ))}
          </div>

          {/* What PMs Want */}
          <motion.div className="p-6 md:p-8 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-text-light mb-4 uppercase">What Property Managers Want</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { num: '01', text: '24/7 emergency response. When a chiller goes down at 2 AM in July in Phoenix, they need someone who answers.' },
                { num: '02', text: 'Preventive maintenance programs. Scheduled service that prevents emergencies.' },
                { num: '03', text: 'Transparent pricing. No surprise change orders. Clear scope of work.' },
                { num: '04', text: 'Documentation. Service reports, photos, compliance records for auditors.' },
                { num: '05', text: 'Tenant communication. Work around tenant schedules and minimize disruption.' },
                { num: '06', text: 'Energy efficiency expertise. Utility costs are a major line item.' },
              ].map((item) => (
                <div key={item.num} className="flex items-start gap-3">
                  <span className="font-headline text-lg font-bold text-aom-orange/30 mt-0.5 flex-shrink-0">{item.num}</span>
                  <p className="font-body text-base text-white/60">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ SECTION 4: VALUES ALIGNMENT ══ */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>MISSION STATEMENT RESEARCH</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            VALUES ALIGNMENT
          </motion.h2>

          <motion.p className="font-body text-base text-aom-text-muted leading-relaxed mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            We mapped every top GC's mission statement and core values. Here is how Ambition's natural identity aligns with what they care about.
          </motion.p>

          <div className="space-y-5 mb-12">
            {valuesAlignment.map((v, i) => (
              <motion.div key={v.theme} {...fadeUp(i * 0.06)}>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-headline text-base font-bold text-aom-text-light">{v.theme}</span>
                    <span className={`px-2 py-0.5 text-xs font-body font-bold uppercase tracking-wider rounded-sm ${v.fit === 'STRONG' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {v.fit}
                    </span>
                  </div>
                  <span className="font-body text-xs text-aom-text-muted">{v.companies}</span>
                </div>
                <p className="font-body text-sm text-white/40 mb-2">{v.alignment}</p>
                <div className="h-2 bg-white/10 rounded-sm overflow-hidden">
                  <div className="h-full bg-aom-orange rounded-sm transition-all duration-700" style={{ width: `${v.pct}%` }} />
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div className="p-6 bg-aom-orange/[0.05] border border-aom-orange/20" {...fadeUp()}>
            <p className="font-body text-base text-aom-orange leading-relaxed">
              <span className="font-bold">Key Insight:</span> Ambition's natural positioning aligns most strongly with Haydon (grit + family + innovation), DPR (uniqueness + integrity + forward-thinking), and Layton (honesty + innovation + quality). These should be top-priority relationship targets.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ SECTION 5: PROPOSED MISSION STATEMENTS ══ */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>BRAND POSITIONING</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            PROPOSED MISSION STATEMENTS
          </motion.h2>

          <div className="space-y-6">
            {missionStatements.map((ms, i) => (
              <motion.div
                key={ms.option}
                className={`p-6 md:p-8 border ${ms.option === '01' || ms.option === '05' ? 'border-aom-orange/30 bg-aom-orange/[0.03]' : 'border-white/10 bg-white/[0.02]'}`}
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-start gap-4">
                  <span className="font-headline text-3xl md:text-4xl font-bold text-aom-orange/30 flex-shrink-0">{ms.option}</span>
                  <div>
                    <h3 className="font-headline text-xl md:text-2xl font-bold text-aom-text-light mb-3 leading-tight">"{ms.tagline}"</h3>
                    <p className="font-body text-base text-white/60 leading-relaxed mb-3">{ms.why}</p>
                    <p className="font-body text-sm text-aom-text-muted">
                      <span className="text-aom-orange font-medium">Best for:</span> {ms.use}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 p-6 bg-aom-orange/[0.05] border border-aom-orange/20" {...fadeUp()}>
            <p className="font-body text-base text-aom-orange leading-relaxed">
              <span className="font-bold">Recommendation:</span> Use Option 1 ("Built different. Built to last.") as the brand tagline and Option 5 ("We don't just install systems. We build reputations.") as the sales positioning line.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ SECTION 6: LINKEDIN STRATEGY ══ */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PLAN OF ATTACK</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            LINKEDIN STRATEGY (75% OF EFFORT)
          </motion.h2>

          <motion.p className="font-body text-base text-aom-text-muted leading-relaxed mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            LinkedIn is where GC project managers, property managers, and facility directors spend their professional time. 80% of contractors use LinkedIn for professional networking and business promotion.
          </motion.p>

          {/* Content Pillars */}
          <motion.div {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-orange uppercase tracking-[0.05em] mb-6">Content Pillars (Post 4-5x/week)</p>
          </motion.div>

          <div className="overflow-x-auto -mx-6 px-6 mb-10">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/10 mb-2">
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Pillar</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Content Type</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase text-center">Frequency</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Example</span>
              </div>
              {linkedinPillars.map((row, i) => (
                <motion.div
                  key={row.pillar}
                  className="grid grid-cols-4 gap-2 p-4 border border-white/10 bg-white/[0.02] mb-1"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-headline text-base font-bold text-aom-text-light">{row.pillar}</span>
                  <span className="font-body text-sm text-white/50">{row.type}</span>
                  <span className="font-body text-sm text-aom-orange text-center font-medium">{row.freq}</span>
                  <span className="font-body text-sm text-white/40 italic">{row.example}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Outreach Phases */}
          <motion.div {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-orange uppercase tracking-[0.05em] mb-6">Connection & Outreach Strategy</p>
          </motion.div>

          <div className="space-y-4 mb-10">
            {[
              { phase: 'Phase 1: Build the Network', weeks: 'Weeks 1-4', actions: ['Connect with all BOMA, IREM, and IFMA Phoenix chapter members', 'Connect with PMs and estimators at the top 20 GCs', 'Connect with property managers at CBRE, JLL, Cushman, Colliers, Lincoln, Plaza, ViaWest', 'Target: 200+ new connections in Month 1'] },
              { phase: 'Phase 2: Engage', weeks: 'Weeks 2-8', actions: ['Comment thoughtfully on every post from target GCs and PM firms', 'Share and tag their project announcements', 'Engage with BOMA/IREM/IFMA chapter posts', 'No pitching. Add value. Be visible.'] },
              { phase: 'Phase 3: Outreach', weeks: 'Weeks 4-12', actions: ['Personalized messages referencing specific projects', 'Share relevant case studies that match their project types', 'Invite to site tours or lunch-and-learns'] },
            ].map((p, i) => (
              <motion.div
                key={p.phase}
                className="p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                  <h3 className="font-headline text-lg font-bold text-aom-text-light">{p.phase}</h3>
                  <span className="font-body text-sm text-aom-orange font-medium">{p.weeks}</span>
                </div>
                <ul className="space-y-2">
                  {p.actions.map((a, j) => (
                    <li key={j} className="font-body text-base text-white/60 flex items-start gap-2">
                      <span className="text-aom-orange mt-1.5 flex-shrink-0"><CheckCircle2 size={12} /></span>
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Priority Targets */}
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" {...fadeUp()}>
            <div className="p-6 border border-white/10 bg-white/[0.02]">
              <p className="font-headline text-base font-bold text-aom-text-light mb-4 uppercase">Top 10 GC Targets</p>
              {gcTargets.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="font-headline text-sm font-bold text-aom-orange/40 w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-body text-base text-white/60">{t}</span>
                </div>
              ))}
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.02]">
              <p className="font-headline text-base font-bold text-aom-text-light mb-4 uppercase">Top 6 PM Targets</p>
              {pmTargets.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="font-headline text-sm font-bold text-aom-orange/40 w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-body text-base text-white/60">{t}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* LinkedIn Insight Tag */}
          <motion.div className="mt-10 p-6 md:p-8 border border-aom-orange/20 bg-aom-orange/[0.03]" {...fadeUp()}>
            <div className="flex items-center gap-3 mb-4">
              <Search size={20} className="text-aom-orange" />
              <p className="font-headline text-lg font-bold text-aom-text-light uppercase">LinkedIn Insight Tag</p>
            </div>
            <p className="font-body text-base text-white/60 leading-relaxed mb-4">
              Install on every page of ambitionmechanical.com. Tracks which companies visit. Free. No ad spend required. When Eric sends a case study link to a prospect, the Insight Tag tracks whether that prospect (or their company) visits the main site afterward. Cross-reference with active bids.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {['Create LinkedIn Advertising account (free)', 'Generate Insight Tag JS snippet', 'Install via Google Tag Manager', 'View "Website Demographics" report'].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-headline text-sm font-bold text-aom-orange mt-0.5">{i + 1}.</span>
                  <span className="font-body text-sm text-white/50">{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ TIKTOK/INSTAGRAM ══ */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SOCIAL MEDIA STRATEGY</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            TIKTOK & INSTAGRAM (25% OF EFFORT)
          </motion.h2>

          <motion.div className="p-6 border border-aom-orange/20 bg-aom-orange/[0.03] mb-10" {...fadeUp(0.15)}>
            <p className="font-headline text-base font-bold text-aom-orange mb-2">THE PATTERN INTERRUPT: MO IN A BLAZER ON A JOB SITE</p>
            <p className="font-body text-base text-white/60 leading-relaxed">
              Every mechanical contractor on social media looks the same: hard hats, pipe wrenches, generic job site footage. Mo shows up different. Blazer + hard hat. Professional but not corporate. "We're not just pipe fitters. We're business people who happen to be technically brilliant."
            </p>
          </motion.div>

          <motion.div {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-orange uppercase tracking-[0.05em] mb-6">Content Types (3-4x/week)</p>
          </motion.div>

          <div className="space-y-3">
            {socialContent.map((item, i) => (
              <motion.div
                key={item.type}
                className="p-5 border border-white/10 bg-white/[0.02] grid grid-cols-1 md:grid-cols-3 gap-4"
                {...fadeUp(i * 0.06)}
              >
                <div>
                  <p className="font-headline text-base font-bold text-aom-text-light">{item.type}</p>
                </div>
                <div>
                  <p className="font-body text-sm text-white/50">{item.format}</p>
                </div>
                <div>
                  <p className="font-body text-sm text-aom-orange/70">{item.why}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p className="font-body text-base text-white/50 leading-relaxed mt-8 max-w-[55ch]" {...fadeUp()}>
            The assistant PM scrolling Instagram at 10 PM is not actively looking for a mechanical contractor. But when she sees Mo explaining why a VRF system saved a building $40K/year in energy costs, she remembers that name. The ROI shows up 3-6 months later.
          </motion.p>
        </div>
      </section>

      {/* ══ GOOGLE ADS ══ */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PAID ADVERTISING</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            GOOGLE ADS ($500/MONTH TEST BUDGET)
          </motion.h2>

          <motion.div className="p-5 border border-yellow-500/20 bg-yellow-500/[0.03] mb-8" {...fadeUp(0.15)}>
            <p className="font-body text-base text-white/60 leading-relaxed">
              <span className="font-bold text-yellow-400">Honest assessment:</span> $500/month is a test budget, not a campaign budget. At $8-50 per click, this yields 10-62 clicks/month. At 3-5% conversion rates, that is 0-3 leads per month. Enough to test and learn, not enough to drive consistent pipeline.
            </p>
          </motion.div>

          <div className="overflow-x-auto -mx-6 px-6 mb-8">
            <div className="min-w-[650px]">
              <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/10 mb-2">
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Budget</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Target</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Keywords</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Rationale</span>
              </div>
              {googleAdsAllocation.map((row, i) => (
                <motion.div
                  key={row.target}
                  className="grid grid-cols-4 gap-2 p-4 border border-white/10 bg-white/[0.02] mb-1"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-headline text-base font-bold text-aom-orange">{row.spend}</span>
                  <span className="font-body text-sm text-white/70">{row.target}</span>
                  <span className="font-body text-sm text-white/40">{row.keywords}</span>
                  <span className="font-body text-sm text-white/50">{row.why}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
            <p className="font-headline text-base font-bold text-aom-text-light mb-3 uppercase">Negative Keywords (Critical)</p>
            <div className="flex flex-wrap gap-2">
              {['free', 'DIY', 'how to', 'jobs', 'hiring', 'salary', 'training', 'school', 'certification', 'home', 'residential', 'near me'].map((kw) => (
                <span key={kw} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-body text-sm">
                  {kw}
                </span>
              ))}
            </div>
            <p className="font-body text-sm text-white/40 mt-3">Add these immediately to avoid wasting the $500 budget on irrelevant clicks.</p>
          </motion.div>

          <motion.p className="font-body text-base text-aom-orange/70 mt-6" {...fadeUp()}>
            If $500/month generates 2+ qualified leads that convert, the math works. Scale to $1,500-3,000/month with confidence.
          </motion.p>
        </div>
      </section>

      {/* ══ ANALYTICS & TRACKING ══ */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>MEASUREMENT FRAMEWORK</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            ANALYTICS & TRACKING PLAN
          </motion.h2>

          <div className="overflow-x-auto -mx-6 px-6 mb-8">
            <div className="min-w-[650px]">
              <div className="grid grid-cols-3 gap-2 p-4 border-b border-white/10 mb-2">
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Event</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Trigger</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Why Track</span>
              </div>
              {trackingEvents.map((row, i) => (
                <motion.div
                  key={row.event}
                  className="grid grid-cols-3 gap-2 p-4 border border-white/10 bg-white/[0.02] mb-1"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-mono text-sm text-aom-orange">{row.event}</span>
                  <span className="font-body text-sm text-white/50">{row.trigger}</span>
                  <span className="font-body text-sm text-white/50">{row.why}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
            <p className="font-headline text-base font-bold text-aom-text-light mb-3 uppercase">Three Layers of Company Identification</p>
            <div className="space-y-3">
              {[
                { layer: 'LinkedIn Insight Tag', desc: 'Shows company names of LinkedIn-logged-in visitors. Free.', cost: '$0' },
                { layer: 'GA4 + Google Ads', desc: 'Shows geographic and demographic data of all visitors.', cost: '$0' },
                { layer: 'Reverse IP Lookup', desc: 'Tools like Leadfeeder/Dealfront identify companies by IP. Consider in Q2.', cost: '$50-200/mo' },
              ].map((l, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="font-headline text-sm font-bold text-aom-orange mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <div>
                    <span className="font-body text-base text-white/70 font-medium">{l.layer}</span>
                    <span className="font-body text-sm text-white/40 ml-2">{l.desc}</span>
                    <span className="font-body text-sm text-aom-orange/60 ml-2">{l.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ GENERATIONAL SHIFT ══ */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>THE BIGGER PICTURE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            THE GENERATIONAL SHIFT
          </motion.h2>

          <motion.p className="font-body text-base text-aom-text-muted leading-relaxed mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Gen Z now represents 14.1% of construction workers (up from 6.4% in 2019). Combined with Millennials, younger generations make up roughly 71% of the total construction workforce. This changes everything about how subs get hired.
          </motion.p>

          <div className="overflow-x-auto -mx-6 px-6 mb-10">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-2 gap-2 p-4 border-b border-white/10 mb-2">
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Old Guard (Boomers/Gen X)</span>
                <span className="font-headline text-sm font-bold text-aom-orange uppercase">New Guard (Millennials/Gen Z)</span>
              </div>
              {generationalShift.map((row, i) => (
                <motion.div
                  key={i}
                  className="grid grid-cols-2 gap-2 p-4 border border-white/10 bg-white/[0.02] mb-1"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-body text-base text-white/40">{row.old}</span>
                  <span className="font-body text-base text-white/70">{row.new}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div className="p-6 bg-aom-orange/[0.05] border border-aom-orange/20" {...fadeUp()}>
            <p className="font-body text-base text-aom-orange leading-relaxed">
              The 28-year-old assistant PM making her first vendor recommendation doesn't have a Rolodex. She has LinkedIn and Google. If Ambition shows up there with case studies, technical knowledge, and a professional brand, they are on her shortlist. If they don't show up, they don't exist to her.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ PHOENIX MARKET TIMING ══ */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>MARKET TIMING</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHY NOW
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[
              { stat: '$205B+', label: 'Semiconductor investment through end of decade' },
              { stat: '$65-100B+', label: 'TSMC Phoenix campus total investment' },
              { stat: '$60M', label: 'KoMiCo new Mesa facility, 200+ jobs' },
              { stat: 'Multiple', label: 'Hyperscale data centers under construction' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-5 border border-white/10 bg-white/[0.02] text-center"
                {...fadeUp(i * 0.08)}
              >
                <p className="font-headline text-2xl md:text-3xl font-bold text-aom-orange mb-1">{item.stat}</p>
                <p className="font-body text-sm text-white/50">{item.label}</p>
              </motion.div>
            ))}
          </div>

          <motion.p className="font-body text-base text-white/60 leading-relaxed max-w-[55ch]" {...fadeUp()}>
            Every one of these projects needs mechanical contractors. The supply of qualified commercial HVAC subs has not kept pace with demand. Ambition is positioned to capture work from this wave if they are visible and credible when GCs go looking.
          </motion.p>
        </div>
      </section>

      {/* ══ ROI TIMELINE ══ */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>QUARTERLY ROI PATH</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            12-WEEK EXECUTION PLAN
          </motion.h2>

          <div className="space-y-4">
            {quarterlyTimeline.map((row, i) => (
              <motion.div
                key={row.weeks}
                className="p-6 border border-white/10 bg-white/[0.02] grid grid-cols-1 md:grid-cols-12 gap-4"
                {...fadeUp(i * 0.08)}
              >
                <div className="md:col-span-2">
                  <span className="font-headline text-base font-bold text-aom-orange">{row.weeks}</span>
                </div>
                <div className="md:col-span-5">
                  <p className="font-body text-base text-white/60 leading-relaxed">{row.action}</p>
                </div>
                <div className="md:col-span-5">
                  <p className="font-body text-base text-white/50 leading-relaxed">
                    <span className="text-aom-orange font-medium">Expected: </span>{row.outcome}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* End of Quarter Expectations */}
          <motion.div className="mt-10 p-6 md:p-8 border border-aom-orange/20 bg-aom-orange/[0.03]" {...fadeUp()}>
            <p className="font-headline text-lg font-bold text-aom-text-light mb-4 uppercase">By End of Q2</p>
            <div className="space-y-3">
              {[
                '500+ LinkedIn connections in the target market',
                '10+ companies identified visiting the website via Insight Tag',
                '3-5 qualified leads attributable to digital efforts',
                'Clear data on which content types drive the most engagement',
                'A repeatable system that compounds over time',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-aom-orange mt-1 flex-shrink-0"><CheckCircle2 size={16} /></span>
                  <p className="font-body text-base text-white/70">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.p className="font-body text-lg text-aom-orange/80 mt-8 leading-relaxed max-w-[55ch]" {...fadeUp()}>
            This approach costs almost nothing except time and consistency. LinkedIn is free. Case studies are built from work already completed. Every piece of content stays online working 24/7. The ROI compounds.
          </motion.p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-aom-night py-12 px-6 text-center border-t border-white/10">
        <a
          href="https://aheadofmarket.com"
          className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-3"
        >
          AOM
        </a>
        <p className="font-body text-xs text-aom-text-muted mb-1">
          Market research and strategy prepared by AOM for Ambition Mechanical. March 2026.
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
