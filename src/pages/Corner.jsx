import React, { useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// --- SECTION WRAPPER ---
function Section({ children, id, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={`relative ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionLabel({ children }) {
  return (
    <motion.p
      variants={fadeUp}
      className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase mb-5 text-[#999]"
    >
      {children}
    </motion.p>
  );
}

// --- NAV ---
function CornerNav() {
  const [scrolled, setScrolled] = useState(false);
  React.useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 ${
        scrolled
          ? 'bg-white border-b border-[#E5E7EB]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/corner" className="text-xl font-headline font-extrabold tracking-tight text-[#111]">
          Corner
        </a>
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'Demo', href: '/demo' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[14px] font-medium text-[#555] hover:text-[#111] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="/book"
          className="hidden md:inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#D14F1E] text-white text-[14px] font-semibold px-5 py-2.5 rounded-full transition-colors"
        >
          Book a Demo
        </a>
      </div>
    </nav>
  );
}

// --- HERO ---
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white"
    >
      {/* Isometric office background -- 50-60% opacity, parallax */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 pointer-events-none"
      >
        <img
          src="/corner/office-full.png"
          alt=""
          className="w-full h-full object-cover object-center opacity-50"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-white/80" />
      </motion.div>

      {/* Hero content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-32 pb-24">
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-[56px] md:text-[72px] lg:text-[88px] font-headline font-black tracking-tight leading-[1.0] text-[#111] mb-6"
        >
          Your AI team is ready.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-xl md:text-2xl text-[#555] leading-relaxed max-w-[600px] mx-auto mb-10"
        >
          Corner gives your business a team of AI agents that handles scheduling,
          follow-up, outreach, content, and quality control.{' '}
          <span className="text-[#111] font-semibold">24/7. For less than one employee.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
        >
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#D14F1E] text-white text-[16px] font-semibold px-8 py-4 rounded-full transition-colors"
          >
            See it in action
          </a>
          <a
            href="/book"
            className="inline-flex items-center gap-2 text-[#111] text-[16px] font-medium hover:text-[#E85D26] transition-colors"
          >
            Book a demo <ChevronRight size={16} />
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-[13px] text-[#999]"
        >
          Free 30-min discovery call. No commitment.
        </motion.p>
      </div>
    </section>
  );
}

// --- PROBLEM SECTION ---
function ProblemSection() {
  const cards = [
    {
      title: "You're the bottleneck.",
      body: "15–20 hours a week on scheduling, emails, follow-up, and admin. Leads fall through cracks. Clients wait too long. You're doing everything because no one else can.",
    },
    {
      title: "Tools don't fix it.",
      body: "You've tried Zapier, ChatGPT, project management apps. They add more screens to check, not fewer hours to work. Another subscription that doesn't know your business.",
    },
    {
      title: "Hiring is expensive.",
 body: "A part-time office manager costs $30–40k a year. A marketing person costs $50k+. And they still need managing. You're not ready to hire, but you need the help now.",
    },
  ];

  return (
    <Section className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <SectionLabel>Why Corner Exists</SectionLabel>
        <motion.h2
          variants={fadeUp}
          className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#111] mb-16 max-w-[560px]"
        >
          You're good at your work. You're drowning in everything around it.
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-7"
            >
              <h3 className="text-[18px] font-bold text-[#111] mb-3">{card.title}</h3>
              <p className="text-[15px] text-[#666] leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// --- SOLUTION SECTION ---
function SolutionSection() {
  const proofLines = [
    'They work while you sleep.',
    "They remember everything you've told them.",
    'They get better every week.',
  ];

  return (
    <Section className="bg-[#FAFAFA] py-24 px-6" id="solution">
      <div className="max-w-5xl mx-auto">
        <SectionLabel>What Corner Is</SectionLabel>
        <motion.h2
          variants={fadeUp}
          className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#111] mb-6"
        >
          Not another tool. A team.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-[18px] text-[#555] leading-relaxed max-w-[640px] mb-12"
        >
          Corner gives you AI agents that specialize. One handles your calendar.
          One manages client follow-up. One does your outreach. One creates content.
          One checks everyone's work. They remember your business, talk to each other,
          and hand off work without being asked.
          <br /><br />
          You open your office in the morning. The work is already moving.
        </motion.p>

        {/* Isometric office visual */}
        <motion.div variants={fadeUp} className="relative rounded-2xl overflow-hidden mb-12 border border-[#E5E7EB]">
          <img
            src="/corner/office-full.png"
            alt="Corner AI operations command center"
            className="w-full object-cover"
            style={{ maxHeight: 480, objectPosition: 'center top' }}
            loading="lazy"
          />
          {/* Room labels */}
          <div className="absolute inset-0 flex items-end justify-center pb-6 gap-3 flex-wrap px-6">
            {['Scheduler', 'Follow-Up', 'Content', 'QA', 'Outreach'].map((label) => (
              <span
                key={label}
                className="bg-black/70 backdrop-blur-sm text-white text-[12px] font-semibold px-3 py-1.5 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>
        <motion.p
          variants={fadeUp}
          className="text-center text-[14px] text-[#999] italic mb-10"
        >
          This is what an AI operations team looks like.
        </motion.p>

        {/* Proof lines */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {proofLines.map((line, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="flex items-center gap-3"
            >
              <Check size={16} className="text-[#22C55E] flex-shrink-0" />
              <span className="text-[15px] font-medium text-[#333]">{line}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// --- HOW IT WORKS ---
function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'We audit your business.',
      subtitle: 'Free Discovery Call',
      body: '30 minutes. We map your operations, find where time is lost, and identify which agents save you the most. No charge. No commitment.',
    },
    {
      num: '02',
      title: 'Your office goes live.',
      subtitle: 'We Build Your Team',
      body: 'In 48 hours, your Corner office is set up with agents trained on your business. Your clients, your workflows, your language.',
    },
    {
      num: '03',
      title: 'Open Corner each morning.',
      subtitle: 'You Run Your Business',
      body: 'Your agents handled overnight follow-ups, drafted client responses, organized your tasks, and flagged anything that needs you. Review, approve, move on.',
    },
  ];

  return (
    <Section className="bg-white py-24 px-6" id="how-it-works">
      <div className="max-w-5xl mx-auto">
        <SectionLabel>How It Works</SectionLabel>
        <motion.h2
          variants={fadeUp}
          className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#111] mb-16"
        >
          Ready in 48 hours.
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeUp} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-8 h-[1px] bg-[#E5E7EB] z-10" />
              )}
              <div className="text-[40px] font-mono font-black text-[#F0EDE8] leading-none mb-4">
                {step.num}
              </div>
              <div className="text-[11px] font-mono font-bold tracking-[0.15em] uppercase text-[#E85D26] mb-2">
                {step.subtitle}
              </div>
              <h3 className="text-[20px] font-bold text-[#111] mb-3">{step.title}</h3>
              <p className="text-[15px] text-[#666] leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          variants={fadeUp}
          className="mt-14 text-center text-[17px] font-semibold text-[#333]"
        >
          No setup guide. No onboarding video.
          <br />
          <span className="text-[#666] font-normal">Your team figures it out.</span>
        </motion.p>
      </div>
    </Section>
  );
}

// --- PRICING ---
function PricingSection() {
  const tiers = [
    {
      name: 'Starter',
      price: '$1,500',
      period: '/month',
      best: 'Solo operators testing AI operations.',
      features: [
        '3 specialized agents',
        '1 active project',
        'Full task management',
        'Email support',
        'Monthly configuration update',
      ],
      cta: 'Get Started',
      href: '/book',
      highlight: false,
    },
    {
      name: 'Growth',
      price: '$3,500',
      period: '/month',
      best: 'Small businesses ready to run lean.',
      badge: 'Most Popular',
      features: [
        '6 specialized agents',
        'Unlimited projects',
        'Full task + agent chat',
        'Priority support',
        'Weekly 30-min check-in call',
        'New agent skills added monthly',
      ],
      cta: 'Book a Demo',
      href: '/book',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Starting at $8,000',
      period: '/month',
      best: 'Growing teams that need custom infrastructure.',
      features: [
        'Unlimited agents',
        'Dedicated infrastructure (your own server)',
        'Custom integrations (Slack, Teams, QuickBooks, CRM)',
        'On-site setup and training',
        'Dedicated account manager',
      ],
      cta: 'Contact Us',
      href: '/book',
      highlight: false,
    },
  ];

  return (
    <Section className="bg-[#FAFAFA] py-24 px-6" id="pricing">
      <div className="max-w-5xl mx-auto">
        <SectionLabel>Pricing</SectionLabel>
        <motion.h2
          variants={fadeUp}
          className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#111] mb-3"
        >
          One flat monthly rate. Cancel anytime.
        </motion.h2>
        <motion.p variants={fadeUp} className="text-[17px] text-[#666] mb-14">
          30-day money-back guarantee. If Corner doesn't save you time, you don't pay.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={`relative rounded-2xl p-8 flex flex-col ${
                tier.highlight
                  ? 'bg-[#111] text-white border-2 border-[#E85D26] shadow-xl scale-[1.02]'
                  : 'bg-white border border-[#E5E7EB]'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#E85D26] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-[14px] font-mono font-bold uppercase tracking-wider mb-3 ${tier.highlight ? 'text-[#E85D26]' : 'text-[#999]'}`}>
                  {tier.name}
                </h3>
                <div className={`text-[38px] font-headline font-black leading-none mb-1 ${tier.highlight ? 'text-white' : 'text-[#111]'}`}>
                  {tier.price}
                </div>
                <div className={`text-[14px] mb-4 ${tier.highlight ? 'text-[#999]' : 'text-[#999]'}`}>
                  {tier.period}
                </div>
                <p className={`text-[14px] ${tier.highlight ? 'text-[#AAA]' : 'text-[#666]'}`}>
                  Best for: {tier.best}
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <Check size={14} className={`flex-shrink-0 mt-0.5 ${tier.highlight ? 'text-[#E85D26]' : 'text-[#22C55E]'}`} />
                    <span className={`text-[14px] leading-snug ${tier.highlight ? 'text-[#CCC]' : 'text-[#555]'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.href}
                className={`inline-flex justify-center items-center gap-2 text-[15px] font-semibold px-6 py-3 rounded-full transition-colors ${
                  tier.highlight
                    ? 'bg-[#E85D26] hover:bg-[#D14F1E] text-white'
                    : 'bg-[#111] hover:bg-[#222] text-white'
                }`}
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.p
          variants={fadeUp}
          className="mt-10 text-center text-[13px] text-[#999]"
        >
          All plans include: 48-hour setup. 30-day money-back guarantee.
          Month-to-month. Cancel anytime. Your data is always yours.
        </motion.p>
      </div>
    </Section>
  );
}

// --- PROOF SECTION ---
function ProofSection() {
  const stats = [
    { value: '689', label: 'commits shipped' },
    { value: '14', label: 'active agents' },
    { value: '89', label: 'built skills' },
    { value: '200+', label: 'hours saved/month' },
  ];

  return (
    <Section className="bg-white py-24 px-6" id="proof">
      <div className="max-w-5xl mx-auto">
        <SectionLabel>Who's Running on Corner</SectionLabel>
        <motion.h2
          variants={fadeUp}
          className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#111] mb-6"
        >
          AOM runs its entire business on Corner.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-[18px] text-[#555] leading-relaxed max-w-[580px] mb-14"
        >
          We built Corner for ourselves before we sold it to anyone else.
          AOM runs 14 agents across client projects, video production, brand work,
          outreach, and operations. Every day. This is the proof.
        </motion.p>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeUp} className="text-center">
              <div className="text-[42px] font-headline font-black text-[#111] leading-none mb-1">
                {s.value}
              </div>
              <div className="text-[13px] text-[#999] uppercase tracking-wider font-mono">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href="/case-study"
            className="inline-flex items-center gap-2 text-[#E85D26] font-semibold hover:text-[#D14F1E] transition-colors text-[15px]"
          >
            Read the AOM case study <ChevronRight size={16} />
          </a>
        </motion.div>

        {/* Testimonial placeholder */}
        <motion.div
          variants={fadeUp}
          className="mt-12 border border-dashed border-[#E5E7EB] rounded-2xl p-8 text-center"
        >
          <p className="text-[14px] text-[#BBB] italic">
            Testimonial coming in April — first customer cohort
          </p>
        </motion.div>
      </div>
    </Section>
  );
}

// --- FAQ ---
function FAQSection() {
  const [open, setOpen] = useState(null);

  const faqs = [
    {
      q: 'What happens if an agent makes a mistake?',
      a: 'Every agent\'s work goes through a QA agent before it reaches you. You review and approve. Nothing ships without your say.',
    },
    {
      q: 'Can I talk to my agents?',
      a: 'Yes. Same as messaging a coworker. Type a message in Corner\'s chat. Your agent responds, remembers what you said, and acts on it. They\'re not bots. They\'re your team.',
    },
    {
      q: 'What if I want to change how things work?',
      a: 'Your AOM account manager adjusts agents, adds new skills, and reconfigures workflows anytime. Included in your plan. No extra charge.',
    },
    {
      q: 'How is this different from just using ChatGPT?',
      a: 'ChatGPT answers one question at a time and forgets everything when you close the tab. Corner runs six agents in parallel, connected to your actual business, around the clock. Your agents know your clients, your projects, and your preferences. ChatGPT doesn\'t know your name.',
    },
    {
      q: 'What happens if I want to cancel?',
      a: 'Month-to-month. Cancel anytime. We export all your data before you go. No lock-in.',
    },
    {
      q: 'Is my business data safe?',
      a: 'Your data is isolated to your own Corner instance. It\'s not shared with other businesses or used to train any AI. We\'re on the SOC 2 compliance roadmap and treat your data the way we\'d want our own treated.',
    },
  ];

  return (
    <Section className="bg-[#FAFAFA] py-24 px-6" id="faq">
      <div className="max-w-3xl mx-auto">
        <SectionLabel>Common Questions</SectionLabel>
        <motion.h2
          variants={fadeUp}
          className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#111] mb-12"
        >
          We've heard these before.
        </motion.h2>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-6 text-left"
              >
                <span className="text-[16px] font-semibold text-[#111]">{faq.q}</span>
                <motion.div
                  animate={{ rotate: open === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown size={18} className="text-[#999]" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-[15px] text-[#666] leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// --- FINAL CTA ---
function FinalCTASection() {
  return (
    <Section className="bg-[#111] py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          variants={fadeUp}
          className="text-4xl md:text-5xl font-headline font-black tracking-tight text-white mb-6"
        >
          Your team is two minutes away.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-[18px] text-[#AAA] leading-relaxed mb-10"
        >
          Book a free 30-minute call. We'll show you Corner running on a live business,
          map out how it would work for yours, and answer every question.
          <br />
          <span className="text-[#777]">No slides. No pitch deck. Just the product.</span>
        </motion.p>

        <motion.div variants={fadeUp}>
          <a
            href="/book"
            className="inline-flex items-center gap-3 bg-[#E85D26] hover:bg-[#D14F1E] text-white text-[18px] font-bold px-10 py-5 rounded-full transition-colors mb-6"
          >
            Book Your Free Call <ChevronRight size={20} />
          </a>
        </motion.div>

        <motion.p variants={fadeUp} className="text-[14px] text-[#555]">
          Not ready to talk?{' '}
          <a href="/demo" className="text-[#999] hover:text-white underline transition-colors">
            Watch the demo
          </a>{' '}
          instead.
        </motion.p>
      </div>
    </Section>
  );
}

// --- FOOTER ---
function CornerFooter() {
  const cols = [
    {
      heading: 'Product',
      links: [
        { label: 'Features', href: '#solution' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Demo', href: '/demo' },
        { label: 'Case Studies', href: '/case-study' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', href: '/' },
        { label: 'Blog', href: '/briefs' },
        { label: 'Contact', href: '/book' },
        { label: 'Book a Demo', href: '/book' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Service', href: '#' },
      ],
    },
  ];

  return (
    <footer className="bg-[#0A0A08] text-[#666] py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 mb-12">
          <div className="md:w-48 flex-shrink-0">
            <div className="text-white font-headline font-extrabold text-xl mb-2">Corner</div>
            <div className="text-[13px]">Built in Phoenix, AZ by AOM</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-12 flex-1">
            {cols.map((col) => (
              <div key={col.heading} className="flex-1">
                <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#444] mb-4">
                  {col.heading}
                </div>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-[14px] text-[#555] hover:text-white transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px]">© 2026 AOM. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://linkedin.com/company/aheadofmarket" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors text-[13px]">LinkedIn</a>
            <a href="#" className="text-[#555] hover:text-white transition-colors text-[13px]">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// --- ROOT EXPORT ---
export default function Corner() {
  return (
    <div className="font-sans antialiased">
      <CornerNav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <PricingSection />
      <ProofSection />
      <FAQSection />
      <FinalCTASection />
      <CornerFooter />
    </div>
  );
}