import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * HigherOrbitsPitch — pitch page for Michelle Lucas (Higher Orbits CEO).
 *
 * Design system mirrors aheadofmarket.com home:
 *   - bg `#0C0C0C` ground, text `#F0ECE6` warm bone, accent `#E85D26` AOM orange
 *   - font-display-serif (Playfair Display) headlines, italic accent in orange
 *   - font-mono kicker 10.5px tracking-[0.28em] uppercase
 *   - sentence-case headings, generous breathing room, rounded forms
 *
 * Tier 1 = $18,000 flat. Tiers 2 & 3 are per-trip add-ons.
 */

function useSEO() {
  useEffect(() => {
    document.title = 'A Film for Higher Orbits | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'A short documentary for the 100th Go For Launch! event and the decade that made it possible.');
    setMeta('og:title', 'A Film for Higher Orbits', true);
    setMeta('og:description', 'Ten years. One hundred events. Three thousand students. Twenty-four experiments in orbit.', true);
    setMeta('og:type', 'article', true);
    setMeta('robots', 'noindex, nofollow');
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

function Kicker({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}>
      {children}
    </p>
  );
}

function StatBlock({ value, label }) {
  return (
    <motion.div className="text-left" {...fadeUp(0.05)}>
      <p className="font-display-serif text-[56px] md:text-[80px] leading-[0.9] tracking-[-0.025em] text-[#F0ECE6]">
        {value}
      </p>
      <p className="font-body text-[13px] md:text-[14px] text-[#F0ECE6]/55 mt-3 leading-[1.5] max-w-[20ch]">
        {label}
      </p>
    </motion.div>
  );
}

function Deliverable({ title, desc }) {
  return (
    <li className="flex gap-5 py-6 border-b border-[#F0ECE6]/[0.08] last:border-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-[14px] flex-shrink-0" />
      <div className="flex-1">
        <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.15] tracking-[-0.015em] text-[#F0ECE6] mb-2">
          {title}
        </p>
        <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.65]">
          {desc}
        </p>
      </div>
    </li>
  );
}

function ProcessStep({ n, title, body }) {
  return (
    <motion.div className="flex gap-6 md:gap-8" {...fadeUp(n * 0.06)}>
      <span className="font-mono text-[11px] tracking-[0.22em] text-[#E85D26] pt-[7px] w-8 flex-shrink-0">
        {String(n + 1).padStart(2, '0')}
      </span>
      <div className="flex-1 pb-10 border-b border-[#F0ECE6]/[0.08] last:border-0">
        <p className="font-display-serif text-[26px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-[#F0ECE6] mb-3">
          {title}
        </p>
        <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.7] max-w-[55ch]">
          {body}
        </p>
      </div>
    </motion.div>
  );
}

export default function HigherOrbitsPitch() {
  useSEO();

  return (
    <div className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen" style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}>

      {/* ──────────────────────────────── HERO ────────────────────────────── */}
      <section className="relative pt-28 md:pt-40 pb-24 md:pb-32 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-3 border border-[#E85D26]/30 bg-[#0C0C0C]/60 backdrop-blur-sm px-3.5 py-1.5 rounded-full mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
              <Kicker className="!text-[#F0ECE6]">For Michelle Lucas · Higher Orbits</Kicker>
            </div>
          </motion.div>

          <motion.h1
            className="font-display-serif text-[14vw] md:text-[88px] lg:text-[112px] xl:text-[136px] leading-[0.88] tracking-[-0.035em] max-w-[900px]"
            {...fadeUp(0.1)}
          >
            A film for<br />
            <em className="font-display-italic italic font-medium text-[#E85D26]">Higher Orbits.</em>
          </motion.h1>

          <motion.p
            className="font-body text-[17px] md:text-[20px] text-[#F0ECE6]/75 mt-10 leading-[1.6] max-w-[58ch]"
            {...fadeUp(0.2)}
          >
            Ten years. One hundred events. Three thousand students. Twenty-four experiments in orbit. The 100th Go For Launch! returns to Deerfield, the same room where it started — and the same astronaut who was there is coming back.
          </motion.p>

          <motion.p
            className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/85 mt-6 leading-[1.6] max-w-[50ch] italic"
            {...fadeUp(0.28)}
          >
            That's not a milestone. That's a story. We'd like to make the film.
          </motion.p>
        </div>
      </section>

      {/* ──────────────────────────── MILESTONE STATS ────────────────────── */}
      <section className="px-6 md:px-12 pb-24 md:pb-32">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-14 border-t border-[#F0ECE6]/[0.10] pt-14 md:pt-20">
            <StatBlock value="10" label="years of Go For Launch!" />
            <StatBlock value="100th" label="event in Deerfield, June 2026" />
            <StatBlock value="24" label="student experiments reached the ISS" />
            <StatBlock value="3,000+" label="students across 23 states" />
          </div>
        </div>
      </section>

      {/* ──────────────────────────── THE STORY ─────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          <motion.div className="md:col-span-4" {...fadeUp()}>
            <Kicker>The story</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              The story <em className="font-display-italic italic font-medium text-[#E85D26]">you've earned.</em>
            </h2>
          </motion.div>

          <motion.div className="md:col-span-7 md:col-start-6 space-y-6" {...fadeUp(0.12)}>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/80 leading-[1.7]">
              Ten years ago, a room full of high schoolers in Deerfield, Illinois built science experiments and presented them to a space shuttle astronaut. That was the first Go For Launch! Those students' experiments actually flew to the International Space Station.
            </p>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/80 leading-[1.7]">
 You've done that 99 more times since then. Three thousand students. Twenty-four experiments in orbit. Twenty-three states. The same astronaut who was in that Deerfield room in 2016, Dorothy Metcalf-Lindenburger, is coming back for number 100.
            </p>
            <p className="font-display-serif text-[26px] md:text-[32px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6] pt-2">
              That's not a milestone. <em className="font-display-italic italic text-[#E85D26]">That's a story.</em>
            </p>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/80 leading-[1.7]">
              Most nonprofits never get a moment like this — where the full arc of what they built is visible all at once. The origin and the anniversary, same room, same people, same mission. The kind of thing that deserves to be filmed properly and seen by the people who should know Higher Orbits exists.
            </p>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6] leading-[1.7] font-medium">
              We want to make that film.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────── WHAT WE'RE PROPOSING ──────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>The proposal</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              A short documentary, <em className="font-display-italic italic font-medium text-[#E85D26]">built right.</em>
            </h2>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              Three to five minutes. TV-quality. Centered on the 100th Go For Launch! event in Deerfield — but not just the event. The people, the mission, the decade it took to get here. A standalone film that could also be Chapter 1 of a continuing series, if you want it to be.
            </p>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/85 mt-4 leading-[1.6] italic">
              The June piece stands on its own. That's the commitment we're asking you to make today.
            </p>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16" {...fadeUp(0.1)}>
            <div className="md:col-span-4">
              <Kicker>What you get</Kicker>
              <h3 className="font-display-serif text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mt-5">
                Five deliverables. <em className="font-display-italic italic text-[#E85D26]">One production window.</em>
              </h3>
              <p className="font-body text-[15px] text-[#F0ECE6]/60 mt-6 leading-[1.65] italic">
                Everything comes from one trip, one crew. No subscriptions, no monthly retainer, no open-ended commitment.
              </p>
            </div>

            <div className="md:col-span-8">
              <ul className="border border-[#F0ECE6]/[0.10] rounded-2xl bg-[#F0ECE6]/[0.02] px-6 md:px-8">
                <Deliverable
                  title="The main film."
                  desc="Three to five minutes. TV-quality. Edited for broadcast, the web, donor meetings, board presentations, grant proposals, school assemblies. Wherever Higher Orbits needs to tell the story, this film goes with it."
                />
                <Deliverable
                  title="A pre-event teaser."
 desc="Thirty seconds, delivered before the event. Built from pre-production and the first day on the ground. Drive anticipation, social, email, donor outreach the week of the event."
                />
                <Deliverable
                  title="A 48-hour recap."
                  desc="Sixty to ninety seconds. We finish the rough cut the night of the event and deliver it within two days. Social-ready, share-ready, captures the moment while it's still news."
                />
                <Deliverable
                  title="Social cuts."
                  desc="Four to six short vertical clips, pulled from the same shoot. Instagram, TikTok, LinkedIn. The moment lives on the channels your audience actually scrolls."
                />
                <Deliverable
                  title="Photos."
                  desc="Thirty to fifty edited stills from the event. Press kit, social graphics, donor newsletter, whatever you need."
                />
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────── HOW WE'D WORK ──────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          <motion.div className="md:col-span-4" {...fadeUp()}>
            <Kicker>The process</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              How we'd <em className="font-display-italic italic font-medium text-[#E85D26]">work together.</em>
            </h2>
          </motion.div>

          <div className="md:col-span-8 md:col-start-6">
            {[
 { title: 'Two of us fly to Chicago.', body: 'Four days on the ground. Tight crew, full coverage, directing, two cameras, stills, producing.' },
              { title: 'We cover the full story.', body: "Michelle's story, the students' story, the astronaut, the event itself, the full-circle moment. The whole arc, captured in one window." },
              { title: 'Edit in Phoenix.', body: 'We come back and edit in-house. You get a rough cut of the main film for feedback. One revision round included.' },
 { title: 'Delivered by end of July.', body: 'Final delivery in every format you need, broadcast, web, vertical, photos, the press-ready pack.' },
            ].map((s, i) => (
              <ProcessStep key={i} n={i} title={s.title} body={s.body} />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── THE INVESTMENT ─────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>The investment</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              One decision <em className="font-display-italic italic font-medium text-[#E85D26]">today.</em>
            </h2>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
 The only decision in front of you is the June piece. Everything else is optional, each its own decision, independently scoped, whenever you're ready.
            </p>
          </motion.div>

          {/* Tier 1 — hero card */}
          <motion.div
            className="relative rounded-3xl border border-[#E85D26]/40 bg-gradient-to-br from-[#E85D26]/[0.06] to-transparent p-8 md:p-14 mb-8 overflow-hidden"
            {...fadeUp(0.1)}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-start">
              <div className="md:col-span-7">
                <Kicker className="!text-[#E85D26]">Tier 1 · The June piece</Kicker>
                <h3 className="font-display-serif text-[44px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-5">
                  $18,000<br />
                  <em className="font-display-italic italic font-medium text-[#E85D26] text-[36px] md:text-[48px]">flat.</em>
                </h3>
                <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 mt-7 leading-[1.65] max-w-[48ch]">
                  Everything — the main film, the pre-event teaser, the 48-hour recap, the social cuts, the photos — for a single flat project fee. Covers the crew, the Chicago trip, all post-production, all music licensing, delivery in every format you need.
                </p>
              </div>

              <div className="md:col-span-5 md:border-l md:border-[#F0ECE6]/[0.10] md:pl-12">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/50 mb-5">
                  Payment in three parts
                </p>
                <ul className="space-y-4">
                  {[
                    ['One-third', 'to confirm and book travel'],
                    ['One-third', 'at end of the Chicago shoot'],
                    ['Final third', 'at delivery'],
                  ].map(([amt, when]) => (
                    <li key={amt} className="flex items-baseline gap-3">
                      <span className="font-display-serif text-[19px] text-[#F0ECE6] tracking-tight">{amt}</span>
                      <span className="font-body text-[14px] text-[#F0ECE6]/60">{when}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Optional additions — two cards side by side */}
          <motion.div className="mb-10" {...fadeUp(0.15)}>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/50 mb-6">
              If you want to go deeper
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Tier 2 */}
              <div className="rounded-2xl border border-[#F0ECE6]/[0.10] bg-[#F0ECE6]/[0.02] p-7 md:p-10">
                <Kicker>Tier 2 · Add the voices</Kicker>
                <h3 className="font-display-serif text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mt-5 mb-5">
                  Alumni and mentor <em className="font-display-italic italic text-[#E85D26]">interviews.</em>
                </h3>
                <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.65] mb-6">
 One dedicated trip for a pre-event interview with a key voice, an alumni who went on to a STEM career, an astronaut mentor, someone whose story adds depth the event footage can't capture on its own. We fly to them, spend a day filming, and weave it into the final cut.
                </p>
                <p className="font-display-serif text-[24px] md:text-[28px] tracking-[-0.015em] text-[#F0ECE6]">
                  $7,500–$8,500 <span className="font-body text-[14px] text-[#F0ECE6]/55 not-italic"> · per interview trip</span>
                </p>
              </div>

              {/* Tier 3 */}
              <div className="rounded-2xl border border-[#F0ECE6]/[0.10] bg-[#F0ECE6]/[0.02] p-7 md:p-10">
                <Kicker>Tier 3 · The next chapter</Kicker>
                <h3 className="font-display-serif text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mt-5 mb-5">
                  Come back for <em className="font-display-italic italic text-[#E85D26]">the next chapter.</em>
                </h3>
                <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.65] mb-6">
                  This is where the June piece becomes a series. When Higher Orbits has another milestone worth capturing — a future event, an ISS experiment return, a significant alumni story — we scope a return trip specifically for that chapter. Same team, same approach. No retainer, no commitment until the right moment arrives.
                </p>
                <p className="font-display-serif text-[24px] md:text-[28px] tracking-[-0.015em] text-[#F0ECE6]">
                  $25,000–$35,000 <span className="font-body text-[14px] text-[#F0ECE6]/55 not-italic"> · per future trip</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Full picture */}
          <motion.div className="rounded-2xl border border-[#F0ECE6]/[0.06] bg-[#F0ECE6]/[0.015] p-7 md:p-10" {...fadeUp(0.2)}>
            <Kicker className="!text-[#F0ECE6]/55">The full picture</Kicker>
            <p className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/70 leading-[1.7] mt-4 max-w-[78ch]">
 If Higher Orbits wanted to do all of the above, the June kickoff piece, two interview trips, and one future chapter, the total investment would land in the{'·'}
 <span className="text-[#F0ECE6] font-medium">$58,000–$70,000</span> range over twelve to eighteen months. That's not one check, it's three separate decisions over a year or more.
              The reason we're showing the whole picture is so you're not surprised later.
            </p>
            <p className="font-display-serif text-[20px] md:text-[24px] tracking-[-0.015em] text-[#F0ECE6] mt-6">
              The only decision today is the June piece. <em className="font-display-italic italic text-[#E85D26]">Do we go make it?</em>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────── WHAT WE NEED FROM YOU ─────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          <motion.div className="md:col-span-4" {...fadeUp()}>
            <Kicker>Next steps</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              What we need <em className="font-display-italic italic font-medium text-[#E85D26]">from you.</em>
            </h2>
          </motion.div>

          <motion.div className="md:col-span-8 md:col-start-6 space-y-7" {...fadeUp(0.12)}>
            {[
              { label: 'Confirm the June event date.', desc: 'The earlier we know, the earlier we book travel and the better the rates.' },
              { label: 'Give us access to the Deerfield event.', desc: "We'll handle the rest of the access list once we know more about the subjects you want centered." },
              { label: 'A contact on your team.', desc: 'Someone who can move fast with us through June.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 pb-7 border-b border-[#F0ECE6]/[0.08] last:border-0 last:pb-0">
                <span className="font-mono text-[11px] tracking-[0.22em] text-[#E85D26] pt-[6px] w-7 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.2] tracking-[-0.015em] text-[#F0ECE6] mb-2">
                    {item.label}
                  </p>
                  <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.65]">{item.desc}</p>
                </div>
              </div>
            ))}
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 leading-[1.65] pt-4 italic">
              We handle the production, the post, the music, the distribution formats, and the delivery.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────── WHY THIS MATTERS ───────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          <motion.div className="md:col-span-4" {...fadeUp()}>
            <Kicker>Why it matters</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Beyond <em className="font-display-italic italic font-medium text-[#E85D26]">June.</em>
            </h2>
          </motion.div>

          <motion.div className="md:col-span-7 md:col-start-6 space-y-6" {...fadeUp(0.12)}>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/80 leading-[1.7]">
              Higher Orbits has done things that should be known. Twenty-four student experiments actually reached the International Space Station. That's not a simulation, not a grant application, not a press release. Real science designed by high schoolers, executed by astronauts, in orbit.
            </p>
            <p className="font-display-serif text-[26px] md:text-[32px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6] pt-2">
              Most people outside your community <em className="font-display-italic italic text-[#E85D26]">have no idea that happens.</em>
            </p>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/80 leading-[1.7]">
              A film that's well made and distributed changes that. It reaches the donors who should be funding you but haven't found you yet. It reaches the students in classrooms across the country whose teachers will show it because it makes space feel real and accessible. It reaches the sponsors who want to be associated with exactly this kind of story.
            </p>
            <p className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/80 leading-[1.7]">
              And it honors what you've built. Michelle's origin story, the decade of work, the people who showed up in gyms across 23 states and gave students something most programs never deliver: a real result, in space.
            </p>
            <p className="font-display-serif text-[26px] md:text-[32px] leading-[1.2] tracking-[-0.02em] text-[#E85D26] pt-3 italic font-medium">
              That story deserves to be told properly. We'd like to be the ones to tell it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────── FOOTER ────────────────────────────── */}
      <footer className="px-6 md:px-12 py-16 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <a
              href="https://aheadofmarket.com"
              className="font-display-serif text-[28px] md:text-[36px] leading-[1] tracking-[-0.02em] text-[#F0ECE6] hover:text-[#E85D26] transition-colors no-underline"
            >
              Ahead of Market
            </a>
            <p className="font-body text-[13px] text-[#F0ECE6]/50 mt-2">
              Pitch prepared for Higher Orbits · Michelle Lucas
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-2">
            <a
              href="mailto:hello@aom-inhouse.com"
              className="font-body text-[15px] text-[#F0ECE6]/80 hover:text-[#E85D26] transition-colors"
            >
              hello@aom-inhouse.com
            </a>
            <a
              href="https://aheadofmarket.com"
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 hover:text-[#E85D26] transition-colors"
            >
              aheadofmarket.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}