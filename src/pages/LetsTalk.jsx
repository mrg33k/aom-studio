// LetsTalk.jsx — Partnership / scope page for Conrad Foundation
// Route: /missionwater/lets-talk
// Palette: Conrad Foundation — #071530 navy · #E85D26 orange · #F4F2EF cream
// Mission: conrad-foundation:mission-water
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY   = '#071530';
const NAVY2  = '#0D2045';
const NAVY3  = '#0A1A3A';
const ORANGE = '#E85D26';
const CREAM  = '#F4F2EF';
const WHITE  = '#FFFFFF';
const STONE  = '#C8C4BE';

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay: i * 0.08 },
  }),
};

// ─── Scope packages data ──────────────────────────────────────────────────────
const PACKAGES = [
  {
    id: 'game',
    num: '01',
    eyebrow: 'Package One',
    title: 'The Game',
    subtitle: 'An NASA-grade interactive educational experience students play through chapter by chapter.',
    price: '$15,000',
    adBudget: '+$5,000–$10,000 managed ad spend',
    accentLight: 'rgba(232,93,38,0.08)',
    accentBorder: 'rgba(232,93,38,0.2)',
    deliverables: [
      {
        category: 'Core Game Engine',
        items: [
          'Three-chapter interactive narrative (Earth water crisis → Lunar journey → Moon surface operations)',
          'Role selection system: students choose a mission specialty (Engineer, Scientist, Commander, Communicator)',
 'Resource allocation mechanic, students manage water, power, and oxygen budgets in real-time decisions',
          'Discovery badge system with 12+ earned achievements tied to curriculum milestones',
          'Between-chapter Mission Hub with session recap, badge case, and next-chapter briefing',
 'Blippy, custom animated mascot character with contextual guidance and encouragement',
        ],
      },
      {
        category: 'Production & Design',
        items: [
          'Full game UI design system: NASA instrument panel aesthetic, Conrad Foundation brand integration',
          'Custom background illustrations for all three chapters (Earth / transit / lunar surface)',
          'Animated entry sequences and chapter transitions',
 'Mobile-responsive layout, plays on tablets and phones, not just desktop',
          'Accessibility: high contrast mode, reduced-motion support, screen reader labels',
        ],
      },
      {
        category: 'Technical Delivery',
        items: [
          'Hosted and deployed on Conrad Foundation domain or subdomain of choice',
 'Session persistence, students resume where they left off',
          'Real-time progress tracking per student (view from instructor dashboard)',
 'Source code delivered in full, Conrad Foundation owns the IP',
        ],
      },
    ],
    addons: [
 { label: 'Chapter 4 expansion', desc: 'Additional mission chapter, Mars water discovery or deep-ocean research analog', price: '+$4,500' },
      { label: 'Educator dashboard', desc: 'Instructor-facing view: class progress, individual student completion, export to CSV', price: '+$3,200' },
      { label: 'Cohort tracking', desc: 'Multi-class enrollment, separate leaderboards, cohort-vs-cohort reporting', price: '+$2,800' },
      { label: 'Blippy expression library', desc: '40 additional Blippy poses and reactions for custom prompts and celebrations', price: '+$1,500' },
      { label: 'Spanish localization', desc: 'Full game text translated and validated for Spanish-speaking student cohorts', price: '+$2,200' },
    ],
  },
  {
    id: 'platform',
    num: '02',
    eyebrow: 'Package Two',
    title: 'The Platform',
 subtitle: 'A live broadcast and archive platform built around the program, not borrowed from YouTube.',
    price: '$15,000',
    adBudget: '+$5,000–$10,000 managed ad spend',
    accentLight: 'rgba(232,93,38,0.06)',
    accentBorder: 'rgba(232,93,38,0.15)',
    deliverables: [
      {
        category: 'Live Broadcast Infrastructure',
        items: [
 'Watch Live tab with embedded stream viewer, students watch in-platform, not redirected to YouTube',
          'Live Q&A widget: students submit questions during broadcast, instructor queue displayed on screen',
          'Session calendar: 4-session class schedule displayed with dates, times, and session topic',
 'Countdown timer on session cards, students see time until next live event',
          '"Notify Me" bell system: students subscribe to reminders, receive browser notification at session start',
        ],
      },
      {
        category: 'Archive & Content Library',
        items: [
          'Session archive: recorded past sessions indexed and searchable by topic',
          'Transcript summaries auto-generated for each session (key takeaways, vocabulary, discussion questions)',
          'Thumbnail generation system for each archived session card',
 'Student re-watch tracking, completion indicators per session',
        ],
      },
      {
        category: 'Platform Design & Brand',
        items: [
 'Fully branded platform page at /missionwaterplatform, Conrad Foundation color system and typography',
          'Program overview: mission statement, partner logos, sponsor recognition section',
          'Student sign-up flow: registration with email confirmation and welcome sequence',
 'Mobile-optimized, full Watch Live experience on phone and tablet',
          'Admin panel: session management, stream URL configuration, student list view',
        ],
      },
    ],
    addons: [
 { label: 'Custom streaming embed', desc: 'Proprietary HLS embed replacing third-party player, no YouTube branding visible anywhere', price: '+$3,500' },
      { label: 'Email reminder automation', desc: '24hr and 1hr automated reminder emails to all registered students before each session', price: '+$1,800' },
 { label: 'Multi-cohort support', desc: 'Separate enrollment groups, school A sees different session schedule than school B, same platform', price: '+$2,400' },
      { label: 'Sponsor recognition section', desc: 'Branded sponsor wall with logo display, tier levels, and clickthrough to partner pages', price: '+$1,200' },
      { label: 'Live captioning integration', desc: 'Real-time closed captions pulled from stream and displayed in-platform for accessibility', price: '+$2,000' },
    ],
  },
  {
    id: 'marketing',
    num: '03',
    eyebrow: 'Package Three',
    title: 'The Marketing',
    subtitle: 'A full-scale awareness and enrollment campaign to get students, schools, and sponsors into the program.',
    price: '$15,000',
    adBudget: '+$5,000–$10,000 managed ad spend',
    accentLight: 'rgba(200,196,190,0.06)',
    accentBorder: 'rgba(200,196,190,0.15)',
    deliverables: [
      {
        category: 'Program Marketing Site',
        items: [
          'Standalone Conrad Foundation / Mission Water marketing landing page',
          'Hero video integration: 60-second program overview film (storyboard, script, and edit managed by AOM)',
          'Program details: session dates, what students learn, how to enroll, partner + sponsor block',
 'Educator and school administrator outreach page, separate from student-facing content',
          'SEO-optimized copy, structured data, and social preview cards (OG + Twitter meta)',
        ],
      },
      {
        category: 'Social Media Campaign',
        items: [
          '30-day launch campaign: 90 pieces of original social content across Instagram, LinkedIn, and TikTok',
          'Blippy social character: mascot-led content series introducing the mission to new audiences',
          'Student spotlight series: template for featuring enrolled students (photos + bio + quote)',
          'Behind-the-scenes content plan: Conrad Foundation team, astronaut guests, lab footage',
          'Hashtag strategy, posting schedule, and platform-specific formatting for each asset',
        ],
      },
      {
        category: 'Outreach & Sponsor Materials',
        items: [
          'Sponsor deck: professional pitch document for corporate sponsors and government partners (10–14 slides)',
          'Program one-pager: single-page leave-behind for school principals and district administrators',
          'Email sequence: 5-email enrollment drip for prospective students and parents (written, designed, deployed)',
          'Press kit: program announcement release, founder quotes, program fact sheet, downloadable photos',
 'Paid media management: Google Display, Meta (Facebook/Instagram), and LinkedIn, managed spend with bi-weekly reporting',
        ],
      },
    ],
    addons: [
      { label: 'Video production package', desc: 'Full production (shoot + edit) for 3–5 short-form program videos including astronaut interview and student testimonials', price: '+$6,000' },
 { label: 'Influencer / astronaut content', desc: 'Coordinate one ambassador post or short collab with a STEM influencer or retired astronaut, scripted, filmed, delivered', price: '+$3,500' },
      { label: 'School district outreach campaign', desc: 'Targeted email and LinkedIn campaign to 50 Phoenix-area K–12 administrators to drive enrollment referrals', price: '+$2,400' },
      { label: 'Podcast placement', desc: 'Identify and pitch 3 STEM / education podcasts for Conrad Foundation guest appearances', price: '+$1,800' },
      { label: 'Extended social retainer', desc: 'Month 2–4 social media management and content production following launch month', price: '+$2,800/mo' },
    ],
  },
];

// ─── Capabilities AOM brings ──────────────────────────────────────────────────
const CAPABILITIES = [
  {
    icon: '🎮',
    title: 'Interactive Learning',
 desc: 'Immersive, curriculum-aligned games that put students inside the mission, not just reading about it. Oregon Trail meets NASA mission control.',
  },
  {
    icon: '📡',
    title: 'Live Broadcast Platform',
 desc: 'Custom streaming infrastructure built around the program. Live Q&A, session calendars, archive library, all under the Conrad brand.',
  },
  {
    icon: '✍️',
    title: 'Curriculum Strategy',
    desc: 'We help structure the program arc: session flow, learning objectives, student milestones, and presentation day. Content that earns attention.',
  },
  {
    icon: '🎨',
    title: 'Design & Brand',
 desc: 'Full visual identity for the program, from the student-facing site to the game UI to instructor decks. Every pixel matches the mission.',
  },
  {
    icon: '🤖',
    title: 'AI Integration',
    desc: 'AI-powered learning tools: adaptive hints in-game, instructor briefings, session summaries, and post-program reporting for partners and sponsors.',
  },
  {
    icon: '📊',
    title: 'Measurement & Reporting',
 desc: 'Student engagement metrics, completion rates, sponsor-ready impact reports. Evidence the program is working, and worth scaling.',
  },
];

// ─── How the partnership works ─────────────────────────────────────────────────
const PHASES = [
  {
    num: '01',
    label: 'Define',
    title: 'Scope the program together',
    desc: 'We start with a working session to map the mission: learning goals, audience, session count, live vs. async, budget. We leave with a spec, not a proposal.',
  },
  {
    num: '02',
    label: 'Build',
    title: 'We build, you review',
 desc: 'AOM designs and develops the full experience, game, platform, live infrastructure. Conrad reviews at every milestone. Nothing ships without sign-off.',
  },
  {
    num: '03',
    label: 'Launch',
    title: 'Live with students',
    desc: 'Program goes live. AOM runs the technical side so Conrad can focus on the classroom. We monitor, support, and iterate in real time.',
  },
  {
    num: '04',
    label: 'Report',
    title: 'Impact, documented',
    desc: 'Post-program: engagement reports, student outcomes, sponsor-ready summaries. We document what happened so the next cohort gets a better program.',
  },
];

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const navigate = useNavigate();
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: `1px solid rgba(255,255,255,0.08)`,
      background: `rgba(7,21,48,0.92)`,
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(20px, 5vw, 64px)',
      height: 64,
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate('/missionwaterplatform')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `linear-gradient(135deg, ${ORANGE} 0%, #ff8c5a 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: WHITE,
          fontFamily: 'monospace',
        }}>MW</div>
        <span style={{ color: CREAM, fontFamily: 'serif', fontSize: 15, letterSpacing: '0.02em' }}>
          Mission Water
        </span>
      </button>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate('/missionwaterplatform')}
          style={{
            background: 'none', border: `1px solid rgba(255,255,255,0.2)`,
            borderRadius: 6, color: STONE, fontSize: 13, padding: '7px 16px',
            cursor: 'pointer', fontFamily: 'sans-serif',
          }}
        >
          Platform
        </button>
        <a
          href="mailto:hello@aom-inhouse.com"
          style={{
            background: ORANGE, border: 'none', borderRadius: 6,
            color: WHITE, fontSize: 13, fontWeight: 600,
            padding: '7px 16px', cursor: 'pointer', textDecoration: 'none',
            fontFamily: 'sans-serif',
          }}
        >
          Contact AOM
        </a>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      paddingTop: 'clamp(120px, 18vh, 180px)',
      paddingBottom: 'clamp(64px, 10vh, 100px)',
      paddingLeft: 'clamp(24px, 7vw, 120px)',
      paddingRight: 'clamp(24px, 7vw, 120px)',
      background: NAVY,
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <div style={{ maxWidth: 840 }}>
        {/* Eyebrow */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          style={{
            color: ORANGE, fontFamily: 'monospace', fontSize: 11,
            letterSpacing: '0.35em', textTransform: 'uppercase',
            marginBottom: 20, fontWeight: 700,
          }}
        >
          Ahead of Market × Conrad Foundation
        </motion.p>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 400,
            color: CREAM,
            lineHeight: 1.1,
            margin: '0 0 28px 0',
            letterSpacing: '-0.02em',
          }}
        >
          Three packages. One complete program.{' '}
          <em style={{ color: ORANGE }}>Built to impress.</em>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          style={{
            color: STONE, fontSize: 'clamp(16px, 2vw, 20px)',
            lineHeight: 1.7, maxWidth: 660,
            fontFamily: 'sans-serif', fontWeight: 400,
            marginBottom: 40,
          }}
        >
          Each package is $15,000 with an optional $5,000–$10,000 managed advertising budget.
          You can commission one, two, or all three. Each stands alone. Together they build
          something students will remember — and sponsors will want to fund.
        </motion.p>

        {/* Package anchor links */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
        >
          {[
 { label: '01, The Game', href: '#scope-game' },
 { label: '02, The Platform', href: '#scope-platform' },
 { label: '03, The Marketing', href: '#scope-marketing' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                display: 'inline-block',
                fontFamily: 'monospace',
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: STONE,
                border: `1px solid rgba(255,255,255,0.15)`,
                borderRadius: 4,
                padding: '8px 16px',
                textDecoration: 'none',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = ORANGE;
                e.currentTarget.style.color = CREAM;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = STONE;
              }}
            >
              {link.label}
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────
function PackageCard({ pkg, index }) {
  const [expandedAddons, setExpandedAddons] = useState(false);
  const isEven = index % 2 === 0;

  return (
    <div
      id={`scope-${pkg.id}`}
      style={{
        background: isEven ? NAVY2 : NAVY3,
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        padding: 'clamp(64px, 10vh, 120px) clamp(24px, 7vw, 120px)',
        scrollMarginTop: 72,
      }}
    >
      {/* Package header */}
      <div style={{ maxWidth: 1080 }}>
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{
            color: ORANGE, fontFamily: 'monospace', fontSize: 11,
            letterSpacing: '0.35em', textTransform: 'uppercase',
            marginBottom: 12, fontWeight: 700,
          }}
        >
          {pkg.eyebrow}
        </motion.p>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
          marginBottom: 20,
        }}>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 400,
              color: CREAM,
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {pkg.title}
          </motion.h2>

          {/* Price tag */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            style={{
              background: pkg.accentLight,
              border: `1px solid ${pkg.accentBorder}`,
              borderRadius: 8,
              padding: '20px 28px',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 400,
              color: ORANGE,
              lineHeight: 1,
              marginBottom: 6,
            }}>
              {pkg.price}
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: STONE,
              lineHeight: 1.5,
            }}>
              {pkg.adBudget}
            </div>
          </motion.div>
        </div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={2}
          style={{
            color: STONE,
            fontFamily: 'sans-serif',
            fontSize: 'clamp(15px, 2vw, 18px)',
            lineHeight: 1.65,
            maxWidth: 680,
            margin: '0 0 48px 0',
          }}
        >
          {pkg.subtitle}
        </motion.p>

        {/* Deliverables */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 24,
          marginBottom: 48,
        }}>
          {pkg.deliverables.map((group, gi) => (
            <motion.div
              key={group.category}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={gi * 0.4}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                padding: '24px 22px',
              }}
            >
              <div style={{
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: ORANGE,
                marginBottom: 16,
                fontWeight: 700,
              }}>
                {group.category}
              </div>
              <ul style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                {group.items.map((item, ii) => (
                  <li key={ii} style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{
                      color: ORANGE,
                      fontSize: 14,
                      lineHeight: '20px',
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      —
                    </span>
                    <span style={{
                      color: STONE,
                      fontFamily: 'sans-serif',
                      fontSize: 13,
                      lineHeight: 1.65,
                    }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Add-ons */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <button
            onClick={() => setExpandedAddons(!expandedAddons)}
            style={{
              background: 'none',
              border: `1px solid rgba(255,255,255,0.12)`,
              borderRadius: 6,
              color: STONE,
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              padding: '10px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: expandedAddons ? 24 : 0,
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.color = CREAM;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = STONE;
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: expandedAddons ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              fontSize: 16,
              lineHeight: 1,
            }}>+</span>
            {expandedAddons ? 'Hide add-ons' : `Add-ons & changes (${pkg.addons.length} options)`}
          </button>

          {expandedAddons && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 4,
              }}>
                Optional add-ons — mix and match
              </div>
              {pkg.addons.map((addon, ai) => (
                <div
                  key={ai}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 24,
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '16px 20px',
                  }}
                >
                  <div>
                    <div style={{
                      color: WHITE,
                      fontFamily: 'sans-serif',
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 4,
                    }}>
                      {addon.label}
                    </div>
                    <div style={{
                      color: STONE,
                      fontFamily: 'sans-serif',
                      fontSize: 13,
                      lineHeight: 1.55,
                    }}>
                      {addon.desc}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 16,
                    color: ORANGE,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {addon.price}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Scope Packages (all three) ───────────────────────────────────────────────
function ScopePackages() {
  return (
    <div>
      {PACKAGES.map((pkg, i) => (
        <PackageCard key={pkg.id} pkg={pkg} index={i} />
      ))}
    </div>
  );
}

// ─── Bundle call-out ─────────────────────────────────────────────────────────
function BundleNote() {
  return (
    <section style={{
      background: NAVY,
      padding: 'clamp(48px, 8vh, 96px) clamp(24px, 7vw, 120px)',
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{
          maxWidth: 840,
          margin: '0 auto',
          background: 'rgba(232,93,38,0.07)',
          border: '1px solid rgba(232,93,38,0.22)',
          borderRadius: 10,
          padding: 'clamp(32px, 5vw, 56px)',
        }}
      >
        <p style={{
          color: ORANGE, fontFamily: 'monospace', fontSize: 11,
          letterSpacing: '0.35em', textTransform: 'uppercase',
          marginBottom: 16, fontWeight: 700,
        }}>
          Full program bundle
        </p>
        <h2 style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 'clamp(26px, 4vw, 40px)',
          fontWeight: 400,
          color: CREAM,
          lineHeight: 1.2,
          margin: '0 0 20px 0',
        }}>
          All three together. One cohesive program.
        </h2>
        <p style={{
          color: STONE,
          fontFamily: 'sans-serif',
          fontSize: 16,
          lineHeight: 1.75,
          margin: '0 0 28px 0',
          maxWidth: 620,
        }}>
          When you commission all three packages, the game, the platform, and the marketing
          campaign are designed as a single integrated experience — not three separate vendors
          trying to look consistent. Students move between the game and the live platform
          seamlessly. The marketing drives enrollment that feeds both.
        </p>
        <div style={{
          display: 'flex',
          gap: 32,
          flexWrap: 'wrap',
          alignItems: 'baseline',
        }}>
          <div>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(36px, 5vw, 52px)',
              color: ORANGE,
              lineHeight: 1,
              marginBottom: 4,
            }}>
              $45,000
            </div>
            <div style={{
              color: STONE,
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}>
              base investment (all three packages)
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(24px, 3vw, 36px)',
              color: 'rgba(232,93,38,0.7)',
              lineHeight: 1,
              marginBottom: 4,
            }}>
              +$5–10k
            </div>
            <div style={{
              color: 'rgba(200,196,190,0.6)',
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}>
              per package, ad spend managed by AOM
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── What AOM Brings ──────────────────────────────────────────────────────────
function WhatWeBring() {
  return (
    <section style={{
      background: NAVY2,
      padding: 'clamp(64px, 10vh, 120px) clamp(24px, 7vw, 120px)',
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      {/* Label */}
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{
          color: ORANGE, fontFamily: 'monospace', fontSize: 11,
          letterSpacing: '0.35em', textTransform: 'uppercase',
          marginBottom: 16, fontWeight: 700,
        }}
      >
        Capabilities
      </motion.p>

      <motion.h2
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        custom={1}
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 400,
          color: CREAM,
          lineHeight: 1.2,
          margin: '0 0 56px 0',
          maxWidth: 560,
        }}
      >
        What AOM brings to the table
      </motion.h2>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 24,
        maxWidth: 1080,
      }}>
        {CAPABILITIES.map((cap, i) => (
          <motion.div
            key={cap.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={i * 0.5}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '28px 24px',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 14 }}>{cap.icon}</div>
            <h3 style={{
              color: WHITE,
              fontFamily: 'sans-serif',
              fontSize: 16,
              fontWeight: 600,
              margin: '0 0 10px 0',
              letterSpacing: '-0.01em',
            }}>
              {cap.title}
            </h3>
            <p style={{
              color: STONE,
              fontFamily: 'sans-serif',
              fontSize: 14,
              lineHeight: 1.65,
              margin: 0,
            }}>
              {cap.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Why This Works ────────────────────────────────────────────────────────────
function WhyItWorks() {
  return (
    <section style={{
      background: NAVY,
      padding: 'clamp(64px, 10vh, 120px) clamp(24px, 7vw, 120px)',
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        gap: 'clamp(32px, 6vw, 96px)',
        maxWidth: 1080,
        alignItems: 'start',
      }}
      className="lt-split-grid"
      >
        {/* Left: the argument */}
        <div>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{
              color: ORANGE, fontFamily: 'monospace', fontSize: 11,
              letterSpacing: '0.35em', textTransform: 'uppercase',
              marginBottom: 16, fontWeight: 700,
            }}
          >
            The model
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(26px, 3.5vw, 44px)',
              fontWeight: 400,
              color: CREAM,
              lineHeight: 1.2,
              margin: '0 0 28px 0',
            }}
          >
            Conrad brings the mission. AOM builds the machine.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            style={{
              color: STONE, fontSize: 16, lineHeight: 1.75,
              fontFamily: 'sans-serif', margin: '0 0 20px 0',
            }}
          >
            The Conrad Foundation has something rare: a credible mission, access to real scientists
            and astronauts, and students who care. What most programs lack is infrastructure —
            a platform built to make the program feel as serious as the subject.
          </motion.p>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={3}
            style={{
              color: STONE, fontSize: 16, lineHeight: 1.75,
              fontFamily: 'sans-serif', margin: 0,
            }}
          >
            AOM is a small team that builds fast and ships real work. We don't do RFPs or 18-month
            timelines. We scope the work, build it, and get out of the way so Conrad can run
            the program it was meant to run.
          </motion.p>
        </div>

        {/* Right: pull stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
 { num: '4–6', label: 'week turnaround to MVP platform', note: 'Fully functional, game, stream, calendar.' },
            { num: '100%', label: 'Conrad-owned brand & content', note: 'We build, you own it. Full IP transfer.' },
            { num: '1', label: 'point of contact', note: 'Patrik Matheson. No account managers, no handoffs.' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i * 0.6}
              style={{
                background: 'rgba(232,93,38,0.08)',
                border: '1px solid rgba(232,93,38,0.2)',
                borderRadius: 8,
                padding: '24px 20px',
              }}
            >
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: 400,
                color: ORANGE,
                lineHeight: 1,
                marginBottom: 8,
              }}>
                {stat.num}
              </div>
              <div style={{ color: CREAM, fontFamily: 'sans-serif', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                {stat.label}
              </div>
              <div style={{ color: STONE, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.5 }}>
                {stat.note}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .lt-split-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section style={{
      background: NAVY2,
      padding: 'clamp(64px, 10vh, 120px) clamp(24px, 7vw, 120px)',
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{
          color: ORANGE, fontFamily: 'monospace', fontSize: 11,
          letterSpacing: '0.35em', textTransform: 'uppercase',
          marginBottom: 16, fontWeight: 700,
        }}
      >
        Process
      </motion.p>
      <motion.h2
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        custom={1}
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 400,
          color: CREAM,
          lineHeight: 1.2,
          margin: '0 0 56px 0',
          maxWidth: 480,
        }}
      >
        How the partnership works
      </motion.h2>

      <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {PHASES.map((phase, i) => (
          <motion.div
            key={phase.num}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={i * 0.5}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr',
              gap: 24,
              paddingTop: i === 0 ? 0 : 40,
              paddingBottom: 40,
              borderBottom: i < PHASES.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              alignItems: 'start',
            }}
          >
            {/* Number + label */}
            <div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 30,
                fontWeight: 700,
                color: ORANGE,
                lineHeight: 1,
                marginBottom: 4,
              }}>
                {phase.num}
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}>
                {phase.label}
              </div>
            </div>

            {/* Content */}
            <div>
              <h3 style={{
                color: WHITE,
                fontFamily: 'sans-serif',
                fontSize: 18,
                fontWeight: 600,
                margin: '0 0 10px 0',
              }}>
                {phase.title}
              </h3>
              <p style={{
                color: STONE,
                fontFamily: 'sans-serif',
                fontSize: 15,
                lineHeight: 1.7,
                margin: 0,
              }}>
                {phase.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Who We Are ───────────────────────────────────────────────────────────────
function WhoWeAre() {
  return (
    <section style={{
      background: NAVY3,
      padding: 'clamp(64px, 10vh, 120px) clamp(24px, 7vw, 120px)',
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{
            color: ORANGE, fontFamily: 'monospace', fontSize: 11,
            letterSpacing: '0.35em', textTransform: 'uppercase',
            marginBottom: 24, fontWeight: 700,
          }}
        >
          About AOM
        </motion.p>
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={1}
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(26px, 4vw, 44px)',
            fontWeight: 400,
            color: CREAM,
            lineHeight: 1.25,
            margin: '0 0 32px 0',
          }}
        >
          Ahead of Market is a small AI-native creative studio.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={2}
          style={{
            color: STONE, fontSize: 16, lineHeight: 1.75,
            fontFamily: 'sans-serif', marginBottom: 20,
          }}
        >
          We build interactive platforms, editorial campaigns, and technology infrastructure for
          organizations doing work that matters. Our clients are scientists, founders, and mission-driven
          organizations that need a creative partner who can build fast and think alongside them.
        </motion.p>
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={3}
          style={{
            color: STONE, fontSize: 16, lineHeight: 1.75,
            fontFamily: 'sans-serif', marginBottom: 0,
          }}
        >
          We are based in Phoenix, Arizona — the same city Mission Water starts.
        </motion.p>
      </div>
    </section>
  );
}

// ─── CTA / Footer ─────────────────────────────────────────────────────────────
function CTA({ navigate }) {
  return (
    <section style={{
      background: NAVY,
      padding: 'clamp(80px, 14vh, 160px) clamp(24px, 7vw, 120px)',
      textAlign: 'center',
    }}>
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{
          color: ORANGE, fontFamily: 'monospace', fontSize: 11,
          letterSpacing: '0.35em', textTransform: 'uppercase',
          marginBottom: 24, fontWeight: 700,
        }}
      >
        Ready to talk
      </motion.p>
      <motion.h2
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        custom={1}
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 'clamp(32px, 5vw, 60px)',
          fontWeight: 400,
          color: CREAM,
          lineHeight: 1.15,
          margin: '0 auto 20px auto',
          maxWidth: 600,
        }}
      >
        Let's scope it out.
      </motion.h2>
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        custom={2}
        style={{
          color: STONE, fontSize: 17, lineHeight: 1.7,
          fontFamily: 'sans-serif',
          maxWidth: 480, margin: '0 auto 48px auto',
        }}
      >
        A 30-minute call is enough to know if this is worth building together.
        No pitch decks. Just a conversation.
      </motion.p>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        custom={3}
        style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
      >
        <a
          href="mailto:hello@aom-inhouse.com?subject=Mission%20Water%20Partnership"
          style={{
            background: ORANGE,
            color: WHITE,
            fontFamily: 'sans-serif',
            fontWeight: 600,
            fontSize: 16,
            padding: '16px 36px',
            borderRadius: 8,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Email Patrik
        </a>
        <button
          onClick={() => navigate('/missionwaterplatform')}
          style={{
            background: 'none',
            border: `1px solid rgba(255,255,255,0.25)`,
            color: CREAM,
            fontFamily: 'sans-serif',
            fontWeight: 500,
            fontSize: 16,
            padding: '16px 36px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          See the platform
        </button>
      </motion.div>

      {/* Footer fine print */}
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        custom={4}
        style={{
          color: 'rgba(255,255,255,0.2)',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: '0.1em',
          marginTop: 80,
        }}
      >
        AHEAD OF MARKET · PHOENIX, AZ · 2026
      </motion.p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LetsTalk() {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.title;
 document.title = 'Scope & Pricing, Mission Water × AOM';
    return () => { document.title = prev; };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: NAVY,
      color: WHITE,
      overflowX: 'hidden',
    }}>
      <Nav />
      <Hero />
      <ScopePackages />
      <BundleNote />
      <WhatWeBring />
      <WhyItWorks />
      <HowItWorks />
      <WhoWeAre />
      <CTA navigate={navigate} />
    </div>
  );
}