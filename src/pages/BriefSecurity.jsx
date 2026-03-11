import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Lock, Database, Key, AlertTriangle, Users, Server, Eye, FileCheck } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Security Architecture | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Multi-tenant security architecture for AOM\'s CPA dashboard product. Regulatory compliance, encryption, access control, and AI agent data boundaries.');
    setMeta('og:title', 'Security Architecture: Multi-Tenant Dashboard for CPAs', true);
    setMeta('og:description', 'What it takes to handle CPA data safely. GLBA, SOC 2, encryption, tenant isolation, and the real costs.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/security', true);
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

const regulations = [
  {
    name: 'FTC Safeguards Rule (GLBA)',
    icon: Shield,
    severity: 'mandatory',
    summary: 'Tax preparers are legally classified as financial institutions. Any vendor handling their data inherits obligations.',
    requirements: [
      'Written Information Security Plan (WISP)',
      'Designated security coordinator (a named human)',
      'MFA for ALL access to customer information',
      'AES-256 encryption at rest and in transit',
      'Annual penetration testing + vulnerability scans every 6 months',
      'Incident response plan',
      'Breach notification to FTC within 30 days (500+ consumers)',
    ],
    penalty: 'Up to $100,000 per violation for organizations, $10,000 per individual exec. Per day.',
  },
  {
    name: 'IRS Publication 4557',
    icon: FileCheck,
    severity: 'mandatory',
    summary: 'All tax professionals must follow Pub 4557. CPAs must document due diligence for all third-party vendors.',
    requirements: [
      'Vendors must maintain appropriate safeguards',
      'Contracts must require vendor security compliance',
      'Vendor security assessments are required, not optional',
    ],
    penalty: 'Every CPA client will ask for documentation before signing. If they don\'t, their insurer will ask why.',
  },
  {
    name: 'SOC 2 (AICPA)',
    icon: Lock,
    severity: 'competitive',
    summary: 'Gold standard attestation for SaaS vendors serving financial services. Five Trust Services Criteria.',
    requirements: [
      'Security (mandatory): protect systems from unauthorized access',
      'Availability: systems stay operational',
      'Confidentiality: protect sensitive information',
      'Type I: point-in-time snapshot (3-4 months)',
      'Type II: operating effectiveness over 6-12 months',
    ],
    penalty: 'Not legally required, but competitively mandatory. Intuit, Thomson Reuters, and Wolters Kluwer all have it.',
  },
];

const architectureCards = [
  {
    title: 'Database-per-Tenant',
    icon: Database,
    color: '#22c55e',
    desc: 'Each CPA firm gets a dedicated PostgreSQL database. No cross-tenant queries are physically possible.',
    why: 'One SQL injection in a shared schema exposes every client\'s SSNs. Per-tenant databases mean a breach of one doesn\'t compromise others.',
  },
  {
    title: 'Per-Tenant Encryption',
    icon: Key,
    color: '#60a5fa',
    desc: 'AES-256 encryption with unique keys per CPA firm. Keys stored in managed vault (AWS KMS or HashiCorp Vault).',
    why: 'Never store encryption keys alongside the data they protect. 90-day automatic key rotation minimum.',
  },
  {
    title: 'Role-Based Access Control',
    icon: Users,
    color: '#a78bfa',
    desc: 'Six roles from AOM Super Admin to AI Agent. MFA mandatory for all. 15-minute session timeout on financial data.',
    why: 'Every data access logged: who, what, when, from where. Logs immutable, retained 7 years minimum.',
  },
  {
    title: 'AI Agent Boundaries',
    icon: Eye,
    color: '#E85D26',
    desc: 'Agents NEVER have direct database access. No PII passes through AI model context. All actions logged.',
    why: 'AI model providers never receive raw client data. Agents work with tokenized/anonymized representations only.',
  },
  {
    title: 'Break-Glass Admin Access',
    icon: Shield,
    color: '#eab308',
    desc: 'AOM admins do NOT have standing access to client data. Emergency access triggers immediate alerts to the CPA firm.',
    why: 'Support access requires client-initiated consent. Quarterly reviews ensure no standing permissions exist.',
  },
  {
    title: 'Infrastructure',
    icon: Server,
    color: '#22d3ee',
    desc: 'SOC 2 compliant cloud provider. WAF on all endpoints. DDoS protection. No public-facing database endpoints.',
    why: 'VPC/private networking for internal services. Secrets in AWS Secrets Manager or Vault, never .env files.',
  },
];

const competitorSecurity = [
  { name: 'Intuit ProConnect', standard: 'AES-256, MFA mandatory, continuous monitoring, SOC 2' },
  { name: 'Thomson Reuters', standard: 'AES-256, MFA, intrusion prevention, SOC 2 + SSAE-16 + HIPAA + PCI-DSS' },
  { name: 'Wolters Kluwer', standard: 'SOC 2 Type II, encryption at rest/transit, MFA, annual pen testing' },
];

const day1Requirements = [
  { item: 'Database-per-tenant architecture', effort: '2-3 weeks', cost: 'Hosting costs' },
  { item: 'AES-256 encryption at rest', effort: 'Built-in', cost: '$0 (included)' },
  { item: 'TLS 1.3 everywhere', effort: 'SSL config', cost: '$0-50/mo' },
  { item: 'MFA for all users', effort: 'Auth provider', cost: '$0-100/mo' },
  { item: 'RBAC with audit logging', effort: '1-2 weeks', cost: '$0 (build it)' },
  { item: 'Written security policy + WISP', effort: '1-2 days', cost: '$0' },
  { item: 'Incident response plan', effort: '1 day', cost: '$0' },
  { item: 'Terms of service + data handling', effort: 'Lawyer review', cost: '$500-2,000' },
  { item: 'Cyber liability insurance', effort: 'Application', cost: '$1-3k/yr' },
  { item: 'Fix exposed credentials', effort: '2-4 hours', cost: '$0' },
  { item: 'Pre-commit secret scanning', effort: '1 hour', cost: '$0' },
];

const ownSystemFixes = [
  { pattern: 'Credentials in skill files', problem: 'Secrets in repo = breach waiting to happen', fix: 'Vault or env vars only' },
  { pattern: 'Bash(*) for all agents', problem: 'Unrestricted shell access', fix: 'Scope permissions per role' },
  { pattern: 'Relay files in repo', problem: 'Messages in git history forever', fix: 'Add guardrails, no client data' },
  { pattern: 'No access logging', problem: 'Can\'t audit who accessed what', fix: 'Structured access logs' },
  { pattern: 'Gmail tokens on disk', problem: 'OAuth tokens are sensitive', fix: 'OS keychain or vault' },
  { pattern: 'All agents share permissions', problem: 'No isolation between capabilities', fix: 'Per-agent scoping' },
];

const timeline = [
  { week: 'Week 1-2', phase: 'FOUNDATION', items: ['Fix exposed credentials (BFG scrub + rotation)', 'Pre-commit secret scanning', 'Security policy + WISP + incident response plan', 'Choose cloud provider and auth provider'] },
  { week: 'Week 3-4', phase: 'BUILD', items: ['Database-per-tenant architecture', 'Encryption setup (at rest + TLS)', 'RBAC system with audit logging', 'Tenant onboarding flow'] },
  { week: 'Week 5-6', phase: 'HARDEN', items: ['Security review of all API endpoints', 'Monitoring and alerting', 'Internal vulnerability scan', 'Client-facing security FAQ', 'Apply for cyber insurance'] },
  { week: 'Week 7-8', phase: 'VALIDATE', items: ['Cross-tenant penetration test', 'Incident response tabletop exercise', 'Finalize documentation', 'Begin SOC 2 Type I prep'] },
];

const decisions = [
  'Cloud provider: AWS vs GCP? (Recommendation: AWS for broadest SOC 2 tooling)',
  'Budget for SOC 2: full from day 1, or MVP security first?',
  'Lawyer for Terms of Service / Data Processing Agreement?',
  'Cyber insurance: get quotes immediately?',
  'Green light to rotate all exposed tokens and scrub git history?',
  'Separate repo/infrastructure for client platform (not AOM-EA)?',
  'Auth provider: Auth0, Clerk, WorkOS, or custom?',
];

export default function BriefSecurity() {
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
            <SectionKicker>SECURITY ARCHITECTURE / MARCH 10, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            MULTI-TENANT SECURITY FOR CPA DATA
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.2)}
          >
            CPAs handle SSNs, tax returns, bank accounts. One breach and AOM is finished. What we need to build, what order, and what it costs.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
              Elon (System/Infrastructure)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Regulatory Landscape */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>REGULATORY LANDSCAPE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT CPA VENDORS MUST MEET
          </motion.h2>

          <div className="space-y-6">
            {regulations.map((reg, i) => {
              const Icon = reg.icon;
              return (
                <motion.div
                  key={reg.name}
                  className={`p-6 md:p-8 border ${reg.severity === 'mandatory' ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-yellow-500/20 bg-yellow-500/[0.03]'}`}
                  {...fadeUp(i * 0.1)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10 text-aom-orange">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-headline text-lg font-bold text-aom-text-light">{reg.name}</h3>
                      <span className={`text-xs font-body font-medium uppercase tracking-wider ${reg.severity === 'mandatory' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {reg.severity === 'mandatory' ? 'LEGALLY REQUIRED' : 'COMPETITIVELY REQUIRED'}
                      </span>
                    </div>
                  </div>
                  <p className="font-body text-base text-white/60 leading-relaxed mb-4">{reg.summary}</p>
                  <ul className="space-y-2 mb-4">
                    {reg.requirements.map((req, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                        <span className="font-body text-sm text-white/50">{req}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="font-body text-sm text-white/40 italic">{reg.penalty}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Competitor Bar */}
      <section className="bg-aom-night border-y border-white/10 py-8 px-6 md:py-12 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.p className="font-body text-sm uppercase tracking-[0.2em] text-aom-text-muted mb-6" {...fadeUp()}>
            THE COMPETITIVE BAR
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {competitorSecurity.map((comp, i) => (
              <motion.div key={comp.name} className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.1)}>
                <h4 className="font-headline text-base font-bold text-aom-text-light mb-2">{comp.name}</h4>
                <p className="font-body text-sm text-white/50">{comp.standard}</p>
              </motion.div>
            ))}
          </div>
          <motion.p className="font-body text-sm text-white/40 mt-4" {...fadeUp(0.3)}>
            CPAs are used to this level of security. We can't show up with less.
          </motion.p>
        </div>
      </section>

      {/* Architecture */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ARCHITECTURE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            HOW WE ISOLATE AND PROTECT
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {architectureCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  className="p-6 md:p-8 border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                  {...fadeUp(i * 0.08)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10" style={{ color: card.color }}>
                      <Icon size={20} />
                    </div>
                    <h3 className="font-headline text-lg font-bold text-aom-text-light">{card.title}</h3>
                  </div>
                  <p className="font-body text-base text-white/60 leading-relaxed mb-3">{card.desc}</p>
                  <p className="font-body text-sm text-white/40 leading-relaxed">{card.why}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What We Need to Fix */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>INTERNAL FIXES REQUIRED</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            FIX OUR OWN HOUSE FIRST
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10" {...fadeUp(0.15)}>
            Patterns in the current system that won't scale to client data.
          </motion.p>

          <div className="space-y-3">
            {ownSystemFixes.map((fix, i) => (
              <motion.div
                key={fix.pattern}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div>
                  <span className="font-headline text-sm font-bold text-aom-text-light">{fix.pattern}</span>
                </div>
                <div>
                  <span className="font-body text-sm text-red-400/70">{fix.problem}</span>
                </div>
                <div>
                  <span className="font-body text-sm text-green-400/70">{fix.fix}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Day 1 Requirements */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>MINIMUM VIABLE SECURITY</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            DAY 1 REQUIREMENTS
          </motion.h2>

          <div className="space-y-2">
            {day1Requirements.map((req, i) => (
              <motion.div
                key={req.item}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.04)}
              >
                <div className="md:col-span-6">
                  <span className="font-body text-base text-white/70">{req.item}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-body text-sm text-aom-text-muted">{req.effort}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-body text-sm text-aom-orange">{req.cost}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="font-headline text-2xl md:text-3xl font-bold text-aom-orange">$1.5-5k</p>
                <p className="font-body text-xs text-aom-text-muted uppercase tracking-wider mt-1">One-time</p>
              </div>
              <div>
                <p className="font-headline text-2xl md:text-3xl font-bold text-aom-orange">$100-300</p>
                <p className="font-body text-xs text-aom-text-muted uppercase tracking-wider mt-1">Monthly</p>
              </div>
              <div>
                <p className="font-headline text-2xl md:text-3xl font-bold text-aom-orange">4-6 wks</p>
                <p className="font-body text-xs text-aom-text-muted uppercase tracking-wider mt-1">Build Time</p>
              </div>
              <div>
                <p className="font-headline text-2xl md:text-3xl font-bold text-aom-orange">$24-48k</p>
                <p className="font-body text-xs text-aom-text-muted uppercase tracking-wider mt-1">SOC 2 Path (Y1)</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>IMPLEMENTATION TIMELINE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FASTEST PATH TO SECURE ENOUGH
          </motion.h2>

          <div className="space-y-6">
            {timeline.map((phase, i) => (
              <motion.div
                key={phase.week}
                className="p-6 md:p-8 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.1)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-headline text-2xl font-bold text-aom-orange/40">{phase.week}</span>
                  <span className="px-2 py-1 text-xs font-body font-bold uppercase tracking-wider bg-aom-orange/10 text-aom-orange rounded-sm">
                    {phase.phase}
                  </span>
                </div>
                <ul className="space-y-2">
                  {phase.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                      <span className="font-body text-base text-white/60">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Math */}
      <section className="bg-aom-night border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-0">
          {[
            { number: '2-3', label: 'Clients to cover SOC 2 cost in Y1' },
            { number: '$3k/mo', label: 'Revenue per CPA retainer' },
            { number: '90%', label: 'More credible than competitors with real security' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`p-6 md:p-8 text-center ${i < 2 ? 'border-b md:border-b-0 md:border-r border-white/10' : ''}`}
              {...fadeUp(i * 0.12)}
            >
              <p className="font-headline text-3xl md:text-4xl font-bold text-aom-orange">{stat.number}</p>
              <p className="font-body text-sm text-aom-text-muted uppercase tracking-[0.15em] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Decisions */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>DECISIONS NEEDED</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            QUESTIONS FOR PATRIK
          </motion.h2>

          <div className="space-y-4">
            {decisions.map((d, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 p-5 border border-white/10"
                {...fadeUp(i * 0.08)}
              >
                <span className="font-headline text-lg font-bold text-aom-orange flex-shrink-0">{i + 1}.</span>
                <p className="font-body text-base text-white/70 leading-relaxed">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Line */}
      <section className="bg-aom-night-card border-t border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug max-w-[55ch] mx-auto mb-6"
            {...fadeUp()}
          >
            Most small agencies pitching to CPAs have NONE of this. If AOM shows up with a real security architecture, documented policies, and a SOC 2 timeline, we're immediately more credible than 90% of the competition.
          </motion.p>
          <motion.p className="font-body text-base text-white/50 max-w-[50ch] mx-auto" {...fadeUp(0.1)}>
            The non-negotiable: database-per-tenant isolation, encryption everywhere, MFA, audit logging, and written security policies. Without these, no CPA should trust us.
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
          Security architecture by Elon (System/Infrastructure). March 10, 2026.
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
