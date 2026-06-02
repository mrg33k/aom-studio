import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, Check, Loader2, Calendar, Clock, Users,
  FileText, Phone, Mail, Building2, ChevronLeft
} from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdalqvg';

const WHAT_TO_EXPECT = [
  {
    icon: Calendar,
    title: '2-3 Hour Discovery Session',
    desc: 'On-site (Phoenix) or video call. We map your actual workflows, tools, and time drains.',
  },
  {
    icon: FileText,
    title: 'Custom AI Operations Roadmap',
    desc: 'A branded report ranking your top automation opportunities by ROI, with implementation timelines.',
  },
  {
    icon: Users,
    title: 'Strategy Walkthrough',
    desc: '30-minute follow-up call to review your roadmap and answer every question.',
  },
];

const PREP_STEPS = [
  'List of tools and software your team uses daily',
  'Rough estimate of team size and roles',
  'Your biggest time drains or operational bottlenecks',
  'Access to someone who knows the day-to-day operations',
];

export default function BookAudit() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    size: '',
    message: '',
    source: '',
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    setStatus('loading');

    // Detect referrer
    const params = new URLSearchParams(window.location.search);
    const source = params.get('from') || 'direct';

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: `[AOM] Audit Booking Request: ${form.company || form.name}`,
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          teamSize: form.size,
          message: form.message,
          source: source,
          type: 'audit-booking',
        }),
      });

      if (res.ok) {
        setStatus('success');
        if (typeof gtag === 'function') {
          gtag('event', 'audit_booking_submit', {
            event_category: 'Conversion',
            event_label: source,
          });
        }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl text-center"
        >
          <div className="w-20 h-20 bg-[#E85D26] flex items-center justify-center mx-auto mb-8">
            <Check size={40} className="text-white" />
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-extrabold uppercase tracking-[-0.02em] text-[#F5F0EB] mb-6">
            YOU'RE BOOKED.
          </h1>
          <p className="font-body text-lg text-[#A89F96] mb-8 max-w-lg mx-auto">
            A creative lead will reach out within 24 hours to confirm your session and send prep materials.
          </p>

          <div className="bg-[#151515] border border-white/10 p-8 text-left max-w-md mx-auto">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E85D26] mb-4">
              What Happens Next
            </p>
            <div className="space-y-4">
              {[
                'Confirmation email with session details',
                'Pre-session prep checklist (what to have ready)',
                '2-3 hour discovery session (on-site or video)',
                'Your custom AI Operations Roadmap within 1 week',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#E85D26] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="font-body text-base text-[#A89F96]">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-[#F5F0EB] font-headline font-bold uppercase tracking-tight text-base hover:border-white/20 transition-colors"
            >
              <ChevronLeft size={16} /> Back to AOM
            </a>
            <a
              href="/system"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E85D26] text-white font-headline font-bold uppercase tracking-tight text-base hover:bg-[#D14E1C] transition-colors"
            >
              Explore The System <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      {/* Film grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-0" aria-hidden="true">
        <svg width="100%" height="100%">
          <filter id="book-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#book-grain)" />
        </svg>
      </div>

      {/* Shared nav */}
      <SiteNav />

      <div className="relative z-10 pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <a href="/" className="inline-flex items-center gap-1 text-[#A89F96] font-body text-base hover:text-[#F5F0EB] transition-colors mb-8">
                <ChevronLeft size={14} /> aheadofmarket.com
              </a>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E85D26] mb-4">
                AI Flow
              </p>
              <div className="w-12 h-[2px] bg-[#E85D26] mb-6" />
              <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold uppercase tracking-[-0.02em] text-[#F5F0EB] leading-[0.92] max-w-[20ch]">
                BOOK YOUR AI FLOW.
              </h1>
              <p className="font-body text-lg md:text-xl text-[#A89F96] mt-6 max-w-2xl leading-relaxed">
                A $2,500 deep dive into your operations. We find where AI saves you time and money, then build you a roadmap to get there.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main content: Form + Info */}
        <section className="px-6 pb-16 md:pb-24">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Left: Booking form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-7"
            >
              <div className="bg-[#151515] border border-white/10 p-6 md:p-10">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-6">
                  Request Your Session
                </p>

                <form onSubmit={handleSubmit} action={FORMSPREE_ENDPOINT} method="POST" className="space-y-5">
                  <input type="hidden" name="_subject" value="[AOM] Audit Booking Request" />
                  <input type="hidden" name="type" value="audit-booking" />
                  <input type="hidden" name="teamSize" value={form.size} />
                  {/* Name */}
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] block mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="First and last name"
                      className="w-full bg-[#1A1A17] border border-white/10 px-4 py-3.5 text-[#F5F0EB] font-body text-base placeholder:text-white/20 focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20 transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] block mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-[#1A1A17] border border-white/10 px-4 py-3.5 text-[#F5F0EB] font-body text-base placeholder:text-white/20 focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20 transition-colors"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] block mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full bg-[#1A1A17] border border-white/10 px-4 py-3.5 text-[#F5F0EB] font-body text-base placeholder:text-white/20 focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20 transition-colors"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] block mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="company"
                      required
                      value={form.company}
                      onChange={(e) => handleChange('company', e.target.value)}
                      placeholder="Your company"
                      className="w-full bg-[#1A1A17] border border-white/10 px-4 py-3.5 text-[#F5F0EB] font-body text-base placeholder:text-white/20 focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20 transition-colors"
                    />
                  </div>

                  {/* Team Size */}
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] block mb-3">
                      Team Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['1-5', '6-15', '16-50', '50+'].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleChange('size', size)}
                          className={`px-5 py-2.5 border text-base font-body transition-all ${
                            form.size === size
                              ? 'bg-[#E85D26] border-[#E85D26] text-white'
                              : 'border-white/10 text-[#A89F96] hover:border-white/20'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] block mb-2">
                      Anything we should know?
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      placeholder="Your biggest bottleneck, what prompted you to look into this, timeline, etc."
                      rows={4}
                      className="w-full bg-[#1A1A17] border border-white/10 px-4 py-3.5 text-[#F5F0EB] font-body text-base placeholder:text-white/20 focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20 transition-colors resize-none"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-[#E85D26] text-white font-headline font-extrabold uppercase tracking-tight text-base md:text-lg px-8 py-5 hover:bg-[#D14E1C] transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ boxShadow: '0 4px 24px rgba(232, 93, 38, 0.2)' }}
                  >
                    {status === 'loading' ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>REQUEST YOUR AUDIT <ArrowRight size={18} /></>
                    )}
                  </button>

                  {status === 'error' && (
                    <p className="text-red-400 font-body text-base text-center">
                      Something went wrong. Try again, or email us directly at hello@aom-inhouse.com.
                    </p>
                  )}

                  <p className="text-[#9A9189] font-body text-sm text-center leading-relaxed">
                    We'll confirm your session within 24 hours. No spam, no sales calls from third parties.
                  </p>
                </form>
              </div>
            </motion.div>

            {/* Right: What to expect */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="lg:col-span-5 space-y-6"
            >
              {/* What's included */}
              <div className="border border-white/10 p-6 md:p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E85D26] mb-6">
                  What's Included
                </p>
                <div className="space-y-6">
                  {WHAT_TO_EXPECT.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-4">
                        <div className="w-10 h-10 border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-[#E85D26]" />
                        </div>
                        <div>
                          <p className="font-headline text-base font-bold text-[#F5F0EB] mb-1">
                            {item.title}
                          </p>
                          <p className="font-body text-base text-[#A89F96] leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price */}
              <div className="border-2 border-[#E85D26]/40 bg-[#E85D26]/5 p-6 md:p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#E85D26] mb-3">
                  Investment
                </p>
                <p className="font-headline text-4xl font-extrabold text-[#F5F0EB]">$2,500</p>
                <p className="font-body text-base text-[#A89F96] mt-2 leading-relaxed">
                  One-time fee. Includes the full discovery session, custom roadmap, and strategy walkthrough. No hidden fees. No recurring charges unless you choose to move forward with a build.
                </p>
              </div>

              {/* What to prepare */}
              <div className="border border-white/10 p-6 md:p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-4">
                  What to Have Ready
                </p>
                <ul className="space-y-3">
                  {PREP_STEPS.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-2 shrink-0" />
                      <span className="font-body text-base text-[#A89F96] leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact alternative */}
              <div className="border border-white/10 bg-white/[0.02] p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-3">
                  Prefer to Talk First?
                </p>
                <div className="space-y-2">
                  <a href="tel:6023732164" className="flex items-center gap-2 text-[#F5F0EB] font-body text-base hover:text-[#E85D26] transition-colors">
                    <Phone size={14} /> (602) 373-2164
                  </a>
                  <a href="mailto:hello@aom-inhouse.com" className="flex items-center gap-2 text-[#F5F0EB] font-body text-base hover:text-[#E85D26] transition-colors">
                    <Mail size={14} /> hello@aom-inhouse.com
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bottom pull quote */}
        <section className="py-16 bg-[#0C0C0C] border-t border-white/5 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-12 h-[2px] bg-[#E85D26] mx-auto mb-6" />
            <p className="font-headline text-xl md:text-2xl font-bold uppercase tracking-tight text-[#F5F0EB] leading-snug">
              Every day without a system is a day your team spends on work a machine should handle.
            </p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9189] mt-4">
              Let's find out exactly how much.
            </p>
          </div>
        </section>

        {/* Shared footer */}
        <SiteFooter />
      </div>
    </div>
  );
}
