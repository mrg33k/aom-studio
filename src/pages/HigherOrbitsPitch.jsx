import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

function useSEO() {
  useEffect(() => {
    document.title = 'A Film for Higher Orbits | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'A short documentary pitch for Higher Orbits — a film for the 100th Go For Launch! event and the decade that made it possible.');
    setMeta('og:title', 'A Film for Higher Orbits', true);
    setMeta('og:description', 'The story of 10 years, 100 events, 3,000 students, and 24 experiments in orbit.', true);
    setMeta('og:type', 'article', true);
    setMeta('robots', 'noindex, nofollow');
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.65, delay, ease: 'easeOut' },
});

function Kicker({ children }) {
  return (
    <p className="text-[11px] font-mono font-medium uppercase tracking-[0.28em] text-aom-orange mb-5">
      {children}
    </p>
  );
}

function Rule() {
  return <div className="w-10 h-[2px] bg-aom-orange mb-6" />;
}

function SectionDivider() {
  return <div className="w-full h-px bg-white/[0.08] my-0" />;
}

// Placeholder badge — visually distinct so Patrik can't miss it
function PricePlaceholder({ children }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-sm font-medium rounded-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
      {children}
    </span>
  );
}

function StatCard({ value, label }) {
  return (
    <motion.div
      className="border border-white/[0.09] bg-white/[0.02] p-6"
      {...fadeUp(0.05)}
    >
      <p className="font-headline text-4xl md:text-5xl font-bold text-aom-orange leading-none mb-2">{value}</p>
      <p className="font-body text-sm text-aom-text-muted leading-snug">{label}</p>
    </motion.div>
  );
}

function DeliverableItem({ title, desc }) {
  return (
    <div className="flex gap-5 py-5 border-b border-white/[0.07] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2.5 flex-shrink-0" />
      <div>
        <p className="font-headline text-base font-bold text-aom-text-light mb-1">{title}</p>
        <p className="font-body text-base text-aom-text-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function HigherOrbitsPitch() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen" style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}>

      {/* ──────────────────────────────── HERO ────────────────────────────── */}
      <section className="bg-aom-night pt-20 pb-20 md:pt-32 md:pb-28 px-6 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <Kicker>FILM PROPOSAL · HIGHER ORBITS · MAY 2026</Kicker>
          </motion.div>

          <motion.div {...fadeUp(0.05)}>
            <Rule />
          </motion.div>

          <motion.h1
            className="font-headline text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-[-0.03em] text-aom-text-light leading-[0.9] mb-8"
            {...fadeUp(0.1)}
          >
            A Film for<br />
            <span className="text-aom-orange">Higher Orbits</span>
          </motion.h1>

          <motion.p
            className="font-body text-xl md:text-2xl text-aom-text-muted leading-relaxed max-w-[52ch]"
            {...fadeUp(0.2)}
          >
            Prepared for Michelle Lucas — for review before our call.
          </motion.p>

          <motion.div
            className="mt-10 inline-flex items-center gap-2 px-4 py-2 border border-amber-500/30 bg-amber-500/5"
            {...fadeUp(0.25)}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-xs text-amber-400 uppercase tracking-[0.2em]">Draft — pricing placeholders need Patrik's approval before sharing</span>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* ──────────────────────────── MILESTONE STATS ────────────────────── */}
      <section className="bg-aom-night-card py-12 px-6 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value="10" label="years of Go For Launch!" />
          <StatCard value="100th" label="event in Deerfield, June 2026" />
          <StatCard value="24" label="student experiments reached the ISS" />
          <StatCard value="3,000+" label="students across 23 states" />
        </div>
      </section>

      <SectionDivider />

      {/* ──────────────────────────── THE STORY ─────────────────────────── */}
      <section className="bg-aom-night py-16 px-6 md:py-24 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
            <motion.div className="md:col-span-4" {...fadeUp()}>
              <Kicker>The Story</Kicker>
              <Rule />
              <h2 className="font-headline text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[1]">
                The Story<br />You've Earned
              </h2>
            </motion.div>

            <motion.div className="md:col-span-8 space-y-5" {...fadeUp(0.1)}>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75]">
                Ten years ago, a room full of high schoolers in Deerfield, Illinois built science experiments and presented them to a space shuttle astronaut. That was the first Go For Launch! Those students' experiments actually flew to the International Space Station.
              </p>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75]">
                You've done that 99 more times since then. Three thousand students. Twenty-four experiments in orbit. Twenty-three states. The same astronaut who was in that Deerfield room in 2016 — Dorothy Metcalf-Lindenburger — is coming back for number 100.
              </p>
              <p className="font-body text-xl text-aom-text-light leading-[1.7] font-medium">
                That's not a milestone. That's a story.
              </p>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75]">
                Most nonprofits never get a moment like this — where the full arc of what they built is visible all at once. The origin and the anniversary, same room, same people, same mission. The kind of thing that deserves to be filmed properly and seen by the people who should know Higher Orbits exists.
              </p>
              <p className="font-body text-lg text-aom-orange leading-[1.75] font-medium">
                We want to make that film.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────────── WHAT WE'RE PROPOSING ──────────────── */}
      <section className="bg-aom-night-card py-16 px-6 md:py-24 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
            <motion.div className="md:col-span-4" {...fadeUp()}>
              <Kicker>The Proposal</Kicker>
              <Rule />
              <h2 className="font-headline text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[1]">
                What We're<br />Proposing
              </h2>
            </motion.div>

            <motion.div className="md:col-span-8" {...fadeUp(0.1)}>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75] mb-8">
                A short documentary. Five to ten minutes. TV-quality. Centered on the 100th Go For Launch! event in Deerfield — but not just the event. The people, the mission, the decade it took to get here.
              </p>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75] mb-10">
                This piece becomes the first chapter of something bigger if you want it to. We'd film it as a standalone that could also be Chapter 1 of a continuing series — alumni voices, future experiments, the next milestone after this one. <span className="text-aom-text-light">But the June piece stands on its own. That's the commitment we're asking you to make today.</span>
              </p>

              <h3 className="font-headline text-xl font-bold uppercase text-aom-text-light tracking-[-0.01em] mb-5">What the June Piece Delivers</h3>
              <div className="border border-white/[0.09] bg-white/[0.02] divide-y divide-white/[0.06] mb-10">
                <DeliverableItem
                  title="The main film"
                  desc="Five to ten minutes. Edited for broadcast, the web, donor meetings, board presentations, grant proposals, school assemblies. Wherever Higher Orbits needs to tell the story, this film goes with it."
                />
                <DeliverableItem
                  title="A 48-hour recap"
                  desc="Sixty to ninety seconds. We finish the rough cut the night of the event and deliver it within two days. Social-ready, share-ready, captures the moment while it's still news."
                />
                <DeliverableItem
                  title="Social cuts"
                  desc="Four to six short vertical clips, pulled from the same shoot. Instagram, TikTok, LinkedIn. The moment lives on the channels your audience actually scrolls."
                />
                <DeliverableItem
                  title="Photos"
                  desc="Thirty to fifty edited stills from the event. Press kit, social graphics, donor newsletter, whatever you need."
                />
              </div>
              <p className="font-body text-base text-aom-text-muted italic">Everything comes from one trip, one crew, one production window.</p>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────────── HOW WE'D WORK ──────────────────────── */}
      <section className="bg-aom-night py-16 px-6 md:py-24 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
            <motion.div className="md:col-span-4" {...fadeUp()}>
              <Kicker>The Process</Kicker>
              <Rule />
              <h2 className="font-headline text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[1]">
                How We'd<br />Work Together
              </h2>
            </motion.div>

            <motion.div className="md:col-span-8" {...fadeUp(0.1)}>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Chicago', desc: 'Three of us fly to Chicago. Four days on the ground. Two cameras, one producer/director.' },
                  { step: '02', title: 'On location', desc: 'We cover Michelle\'s story, the students\' story, the astronaut, the event itself, the full-circle moment.' },
                  { step: '03', title: 'Edit in Phoenix', desc: 'We come back and edit. You get a rough cut for feedback. One revision round included.' },
                  { step: '04', title: 'Final delivery', desc: 'Final delivery by end of July — every format you need.' },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    className="flex gap-6 items-start"
                    {...fadeUp(i * 0.08)}
                  >
                    <span className="font-headline text-2xl font-bold text-aom-orange/30 w-10 flex-shrink-0 pt-0.5">{item.step}</span>
                    <div>
                      <p className="font-headline text-lg font-bold text-aom-text-light mb-1">{item.title}</p>
                      <p className="font-body text-base text-aom-text-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="mt-10 p-6 border border-white/[0.09] bg-white/[0.02]"
                {...fadeUp(0.35)}
              >
                <p className="font-body text-base text-aom-text-muted leading-relaxed">
                  <span className="text-aom-text-light font-medium">No subscriptions, no monthly retainer, no open-ended commitment.</span> One production, one price, one delivery.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────────── THE INVESTMENT ─────────────────────── */}
      <section className="bg-aom-night-card py-16 px-6 md:py-24 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <Kicker>The Investment</Kicker>
            <Rule />
            <h2 className="font-headline text-3xl md:text-5xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4">
              A Three-Tier Path
            </h2>
            <p className="font-body text-lg text-aom-text-muted leading-relaxed max-w-[55ch] mb-14">
              The only decision in front of you today is Tier 1. Everything else is optional — each its own decision, independently scoped.
            </p>
          </motion.div>

          {/* Tier 1 */}
          <motion.div
            className="border border-aom-orange/30 bg-aom-orange/[0.03] p-8 md:p-10 mb-6"
            {...fadeUp(0.1)}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-xs text-aom-orange uppercase tracking-[0.2em]">Tier 1 — The June Piece</span>
                  <span className="px-2 py-0.5 bg-aom-orange/10 border border-aom-orange/20 text-aom-orange font-mono text-xs uppercase tracking-wider">The decision today</span>
                </div>
                <h3 className="font-headline text-2xl md:text-3xl font-bold text-aom-text-light mb-4">Starting Point — The June Piece</h3>
                <p className="font-body text-base text-aom-text-muted leading-relaxed mb-4">
                  Everything above — the main film, the recap, the social cuts, the photos — for a single flat project fee. Covers the crew, the Chicago trip, all post-production, and delivery in every format you need.
                </p>
                <p className="font-body text-sm text-aom-text-muted leading-relaxed mb-6">
                  Payment structure: one-third to confirm and book travel, one-third at end of the Chicago shoot, final third at delivery.
                </p>
                <PricePlaceholder>Tier 1: $[PATRIK: confirm — target $48,000–$58,000 flat]</PricePlaceholder>
              </div>
            </div>
          </motion.div>

          {/* Tier 2 */}
          <motion.div
            className="border border-white/[0.09] bg-white/[0.02] p-8 md:p-10 mb-6"
            {...fadeUp(0.15)}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-xs text-aom-text-muted uppercase tracking-[0.2em]">Tier 2 — Optional Add-on</span>
            </div>
            <h3 className="font-headline text-xl md:text-2xl font-bold text-aom-text-light mb-3">Add Alumni and Mentor Interviews</h3>
            <p className="font-body text-base text-aom-text-muted leading-relaxed mb-6">
              One dedicated trip for a pre-event interview with a key voice — an alumni who went on to a STEM career, an astronaut mentor, someone whose story adds depth the event footage can't capture on its own. We fly to them, spend a day filming, and weave it into the final cut. Two trips is the typical base scope, but even one adds dimension the June footage alone can't.
            </p>
            <PricePlaceholder>Per interview trip: $[PATRIK: confirm — target $7,500–$8,500]</PricePlaceholder>
          </motion.div>

          {/* Tier 3 */}
          <motion.div
            className="border border-white/[0.09] bg-white/[0.02] p-8 md:p-10 mb-10"
            {...fadeUp(0.2)}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-xs text-aom-text-muted uppercase tracking-[0.2em]">Tier 3 — The Next Chapter</span>
            </div>
            <h3 className="font-headline text-xl md:text-2xl font-bold text-aom-text-light mb-3">Come Back for the Next Chapter</h3>
            <p className="font-body text-base text-aom-text-muted leading-relaxed mb-6">
              This is where the June piece becomes a series. When Higher Orbits has another milestone worth capturing — a future event, an ISS experiment return, a significant alumni story — we scope a return trip specifically for that chapter. Same team, same approach, priced per trip. No retainer, no commitment until the right moment arrives.
            </p>
            <PricePlaceholder>Per future return trip: $[PATRIK: confirm — target $42,000–$52,000]</PricePlaceholder>
          </motion.div>

          {/* Full picture callout */}
          <motion.div
            className="border border-white/[0.06] bg-white/[0.015] p-7 md:p-9"
            {...fadeUp(0.25)}
          >
            <p className="font-body text-sm uppercase tracking-[0.18em] text-aom-text-muted mb-3">The Full Picture</p>
            <p className="font-body text-base text-aom-text-muted leading-relaxed">
              If Higher Orbits wanted to do all of the above — the June kickoff piece, two interview trips, and one future chapter — the total investment across all of it would be roughly{' '}
              <span className="font-mono text-amber-300 text-sm">$[PATRIK: total all tiers — approximately $70K–$90K over 12–18 months]</span>.{' '}
              That's not one check — it's three separate decisions over a year or more. The reason we're showing the whole picture is so you're not surprised later.
            </p>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────── WHAT WE NEED FROM YOU ─────────────────── */}
      <section className="bg-aom-night py-16 px-6 md:py-24 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
            <motion.div className="md:col-span-4" {...fadeUp()}>
              <Kicker>Next Steps</Kicker>
              <Rule />
              <h2 className="font-headline text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[1]">
                What We<br />Need from You
              </h2>
            </motion.div>

            <motion.div className="md:col-span-8" {...fadeUp(0.1)}>
              <div className="space-y-4 mb-8">
                {[
                  { label: 'Confirm the June event date.', desc: 'The earlier we know, the earlier we book travel and the better the rates.' },
                  { label: 'Give us access to the Deerfield event.', desc: "We'll handle the rest of the access list once we know more about the subjects you want centered." },
                  { label: 'A contact on your team who can move fast with us through June.' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-4 p-5 border border-white/[0.08] bg-white/[0.02]"
                    {...fadeUp(i * 0.08)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-body text-base text-aom-text-light font-medium mb-0.5">{item.label}</p>
                      {item.desc && <p className="font-body text-sm text-aom-text-muted">{item.desc}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
              <p className="font-body text-base text-aom-text-muted leading-relaxed">
                We handle the production, the post, the music, the distribution formats, and the delivery.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────── WHY THIS MATTERS ───────────────────────── */}
      <section className="bg-aom-night-card py-16 px-6 md:py-24 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
            <motion.div className="md:col-span-4" {...fadeUp()}>
              <Kicker>The Bigger Picture</Kicker>
              <Rule />
              <h2 className="font-headline text-3xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[1]">
                Why This<br />Matters Beyond<br />June
              </h2>
            </motion.div>

            <motion.div className="md:col-span-8 space-y-5" {...fadeUp(0.1)}>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75]">
                Higher Orbits has done things that should be known. Twenty-four student experiments actually reached the International Space Station. That's not a simulation, not a grant application, not a press release. Real science designed by high schoolers, executed by astronauts, in orbit.
              </p>
              <p className="font-body text-xl text-aom-text-light leading-[1.7] font-medium">
                Most people outside your community have no idea that happens.
              </p>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75]">
                A film that's well made and distributed changes that. It reaches the donors who should be funding you but haven't found you yet. It reaches the students in classrooms across the country whose teachers will show it because it makes space feel real and accessible. It reaches the sponsors who want to be associated with exactly this kind of story.
              </p>
              <p className="font-body text-lg text-aom-text-muted leading-[1.75]">
                And it honors what you've built. Michelle's origin story, the decade of work, the people who showed up in gyms across 23 states and gave students something most programs never deliver: a real result, in space.
              </p>
              <p className="font-body text-xl text-aom-orange leading-[1.7] font-medium">
                That story deserves to be told properly. We'd like to be the ones to tell it.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ──────────────────────────── FOOTER ────────────────────────────── */}
      <footer className="bg-aom-night py-12 px-6 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <a
              href="https://aheadofmarket.com"
              className="font-headline text-sm font-bold uppercase tracking-[0.18em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-1"
            >
              AOM — Ahead of Market
            </a>
            <p className="font-body text-xs text-aom-text-muted">
              Pitch prepared for Higher Orbits · Michelle Lucas
            </p>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="mailto:hello@aom-inhouse.com"
              className="font-body text-sm text-aom-text-muted hover:text-aom-orange transition-colors"
            >
              hello@aom-inhouse.com
            </a>
            <a
              href="https://aheadofmarket.com"
              className="font-body text-sm text-aom-text-muted hover:text-aom-orange transition-colors"
            >
              aheadofmarket.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
