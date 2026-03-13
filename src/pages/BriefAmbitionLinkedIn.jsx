import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Linkedin, Calendar, MessageSquare, TrendingUp,
  Camera, Thermometer, ArrowLeftRight, Hash, Target, Clock
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Ambition LinkedIn Posts | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', '3 LinkedIn posts drafted for Ambition Mechanical. Ready to copy-paste. Breaking 4+ weeks of silence with credibility-building content.');
    setMeta('og:title', 'Ambition Mechanical: 3 LinkedIn Posts Ready to Post', true);
    setMeta('og:description', 'Text-only posts covering HVAC expertise, Phoenix heat credibility, and before/after transformation stories. No video editing required.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/ambition-linkedin', true);
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

const postingSchedule = [
  { day: 'Thu Mar 13', post: 'Tony\'s Option A ("We\'ve Been Here")', type: 'Inaugural post' },
  { day: 'Fri Mar 14', post: 'One of these 3 Alex posts', type: 'Content post' },
  { day: 'Mon Mar 17', post: 'Another Alex post', type: 'Content post' },
];

const posts = [
  {
    num: '1',
    title: 'The System Nobody Sees',
    pillar: 'The Work',
    words: 118,
    icon: <Wrench size={18} />,
    photo: 'Din Tai Fung kitchen install or Primrose project photos from the website.',
    hashtags: '#CommercialHVAC #PhoenixContractor #MechanicalContractor #HVAC #ArizonaConstruction',
    body: `Every building you walk into has a system keeping it comfortable. Rooftop units running in 115-degree heat. Piping threaded through ceilings. Controls calibrated so the temperature is right before anyone walks through the door.

That's what we do. 23 years of commercial HVAC, plumbing, and piping across Phoenix. Hospitals. Schools. Restaurants. Data centers. The kind of facilities where the system can't go down.

We just finished a complete mechanical install for a new commercial kitchen build in Scottsdale. Custom ductwork, grease exhaust, makeup air. Every line run clean, every connection tight.

If your building is running right, it's because somebody like us made sure it does.

ambitionmechanical.com`,
  },
  {
    num: '2',
    title: 'Phoenix Heat Is Not a Suggestion',
    pillar: 'Local / Phoenix + Social Proof',
    words: 115,
    icon: <Thermometer size={18} />,
    photo: 'Any on-site crew photo or rooftop unit shot. Desert/heat angle works best.',
    hashtags: '#PhoenixHVAC #EmergencyHVAC #CommercialMechanical #ArizonaBusiness #HVACContractor',
    body: `Phoenix summers don't negotiate. When it's 118 outside and your commercial HVAC goes down, every minute matters. Your employees can't work. Your customers leave. Your product spoils.

We've been handling emergency mechanical calls across the Valley for over two decades. Abraza. Primrose. INEOS. Facilities that call us because they know we pick up and we show up.

There's a reason companies keep our number saved. It's not marketing. It's 23 years of answering the phone when things break.

If your building needs mechanical work in the Phoenix heat, you want someone who's done this a few hundred times. That's us.

ambitionmechanical.com`,
  },
  {
    num: '3',
    title: 'Before and After: What a Real Install Looks Like',
    pillar: 'Before & After',
    words: 107,
    icon: <ArrowLeftRight size={18} />,
    photo: 'Before/after pair from any job site. Primrose progress or Din Tai Fung kitchen build.',
    hashtags: '#BeforeAndAfter #CommercialConstruction #HVAC #MechanicalContractor #PhoenixAZ #BuiltRight',
    body: `People ask what commercial mechanical work actually looks like. Here's the short version:

Before: exposed structure, empty ceiling cavities, no climate system, raw space that can't be occupied.

After: full HVAC, plumbing, and piping running through every wall and ceiling. Temperature controlled. Water flowing. Exhaust vented. Building code passed. Doors open.

That transformation is what Ambition Mechanical does every day. We take commercial spaces from shell to fully operational. The work isn't glamorous, but without it, nothing else in the building works.

23 years. 500+ projects. Phoenix, Scottsdale, and across the Valley.

ambitionmechanical.com`,
  },
];

function Wrench(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export default function BriefAmbitionLinkedIn() {
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
            <SectionKicker>CONTENT DRAFTS / MARCH 12, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            AMBITION LINKEDIN POSTS
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-4"
            {...fadeUp(0.2)}
          >
            3 LinkedIn posts ready to copy-paste. Text-only, no video editing required. Breaking 4+ weeks of silence on Ambition's LinkedIn with credibility-building content.
          </motion.p>

          <motion.p
            className="font-body text-base text-white/40 leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.22)}
          >
            Patrik approval required before posting. These posts complement Tony's 6 drafts for the inaugural post. Combined: 3 posts in 5 days to break silence with momentum.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              Alex (Deal Architect)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Posting Schedule */}
      <section className="bg-aom-night-card border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-0">
          {postingSchedule.map((s, i) => (
            <motion.div
              key={s.day}
              className={`p-6 md:p-8 text-center ${i < 2 ? 'border-b md:border-b-0 md:border-r border-white/10' : ''}`}
              {...fadeUp(i * 0.12)}
            >
              <p className="font-headline text-lg md:text-xl font-bold text-aom-orange">{s.day}</p>
              <p className="font-body text-sm text-aom-text-light mt-2">{s.post}</p>
              <p className="font-mono text-xs text-white/40 mt-1">{s.type}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Posts */}
      {posts.map((post, idx) => (
        <section
          key={post.num}
          className={`${idx % 2 === 0 ? 'bg-aom-night' : 'bg-aom-night-card'} py-12 px-6 md:py-24 md:px-12`}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp()}>
              <SectionKicker>POST {post.num} / {post.words} WORDS</SectionKicker>
              <OrangeBar />
            </motion.div>

            <motion.div className="flex items-center gap-3 mb-6" {...fadeUp(0.05)}>
              <div className="text-aom-orange">{post.icon}</div>
              <h2 className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95]">
                {post.title}
              </h2>
            </motion.div>

            <motion.div className="flex flex-wrap items-center gap-3 mb-8" {...fadeUp(0.1)}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
                <Target size={14} />
                {post.pillar}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
                <Camera size={14} />
                Photo suggested
              </span>
            </motion.div>

            {/* Post Body */}
            <motion.div
              className="p-6 md:p-8 border border-white/10 bg-white/[0.02] mb-6"
              {...fadeUp(0.15)}
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <Linkedin size={20} className="text-[#0A66C2]" />
                <span className="font-body text-sm text-white/40">LinkedIn Post Preview</span>
              </div>
              <div className="font-body text-base text-white/80 leading-relaxed whitespace-pre-line">
                {post.body}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="font-body text-sm text-white/30">{post.hashtags}</p>
              </div>
            </motion.div>

            {/* Photo Suggestion */}
            <motion.div className="p-4 border border-[#7C9A72]/30 bg-[#7C9A72]/[0.05] flex items-start gap-3" {...fadeUp(0.2)}>
              <Camera size={16} className="text-[#7C9A72] flex-shrink-0 mt-0.5" />
              <p className="font-body text-sm text-white/60">{post.photo}</p>
            </motion.div>
          </div>
        </section>
      ))}

      {/* Strategy Alignment */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>STRATEGY ALIGNMENT</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHY THESE POSTS MATTER
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Offer Ladder', desc: 'Not sales posts. They build credibility and visibility. Soft CTA: website link, phone number. No hard sell.' },
              { title: 'Content Pillars', desc: 'All 3 map to defined pillars: The Work, Local/Phoenix, Before & After. Consistent brand voice.' },
              { title: 'Brand Voice', desc: 'Confident, not cocky. Real work shown, not talked about. No corporate speak. Reads like a contractor who knows what they\'re doing.' },
              { title: 'Retainer Justification', desc: '3 posts + Tony\'s drafts = 2+ weeks of LinkedIn at 2/week. Buys time to get video editing flowing for Reels.' },
            ].map((item, i) => (
              <motion.div key={item.title} className="p-5 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.08)}>
                <h3 className="font-headline text-sm font-bold text-aom-orange mb-2">{item.title}</h3>
                <p className="font-body text-sm text-white/60">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-orange mb-3">
              <TrendingUp size={16} className="inline mr-2" />
              UPSELL PATH
            </h3>
            <p className="font-body text-sm text-white/60">
              Consistent posting leads to results, which justifies rate increase from $2k to $3.5k/month. Can't raise the rate while delivering nothing.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What's Next */}
      <section className="bg-aom-night border-y border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>WHAT HAPPENS NEXT</SectionKicker>
            <OrangeBar />
          </motion.div>

          <div className="space-y-3">
            {[
              { step: '1', text: 'These 3 posts + Tony\'s drafts go live (6 total)', timing: 'Week of Mar 13' },
              { step: '2', text: 'Ambition has 2-3 weeks of LinkedIn covered', timing: 'Through end of March' },
              { step: '3', text: 'Start weaving in video posts as Reels get edited', timing: 'Late March' },
              { step: '4', text: 'Build toward full delivery: 5 Reels/week + 2 LinkedIn/week', timing: 'End of March target' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="flex items-start gap-4 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <span className="font-headline text-lg font-bold text-aom-orange flex-shrink-0">{item.step}.</span>
                <div className="flex-1">
                  <span className="font-body text-sm text-aom-text-light">{item.text}</span>
                </div>
                <span className="font-mono text-xs text-[#7C9A72] hidden md:block">{item.timing}</span>
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
            3 posts ready to copy-paste. Ash posts manually. No tools needed. Patrik approval required.
          </motion.p>
          <motion.p className="font-body text-base text-white/50 max-w-[50ch] mx-auto" {...fadeUp(0.1)}>
            Breaking 4+ weeks of silence. Building credibility. Justifying the retainer.
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
          Content drafts by Alex (Deal Architect). March 12, 2026.
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
