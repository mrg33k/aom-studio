// LetsTalk.jsx — Partnership / scope page for Conrad Foundation
// Route: /missionwater/lets-talk
// Palette: Conrad Foundation — #071530 navy · #E85D26 orange · #F4F2EF cream
// Mission: conrad-foundation:mission-water
import React, { useEffect } from 'react';
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

// ─── Capabilities AOM brings ──────────────────────────────────────────────────
const CAPABILITIES = [
  {
    icon: '🎮',
    title: 'Interactive Learning',
    desc: 'Immersive, curriculum-aligned games that put students inside the mission — not just reading about it. Oregon Trail meets NASA mission control.',
  },
  {
    icon: '📡',
    title: 'Live Broadcast Platform',
    desc: 'Custom streaming infrastructure built around the program. Live Q&A, session calendars, archive library — all under the Conrad brand.',
  },
  {
    icon: '✍️',
    title: 'Curriculum Strategy',
    desc: 'We help structure the program arc: session flow, learning objectives, student milestones, and presentation day. Content that earns attention.',
  },
  {
    icon: '🎨',
    title: 'Design & Brand',
    desc: 'Full visual identity for the program — from the student-facing site to the game UI to instructor decks. Every pixel matches the mission.',
  },
  {
    icon: '🤖',
    title: 'AI Integration',
    desc: 'AI-powered learning tools: adaptive hints in-game, instructor briefings, session summaries, and post-program reporting for partners and sponsors.',
  },
  {
    icon: '📊',
    title: 'Measurement & Reporting',
    desc: 'Student engagement metrics, completion rates, sponsor-ready impact reports. Evidence the program is working — and worth scaling.',
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
    desc: 'AOM designs and develops the full experience — game, platform, live infrastructure. Conrad reviews at every milestone. Nothing ships without sign-off.',
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

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay: i * 0.08 },
  }),
};

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
      paddingBottom: 'clamp(64px, 10vh, 120px)',
      paddingLeft: 'clamp(24px, 7vw, 120px)',
      paddingRight: 'clamp(24px, 7vw, 120px)',
      background: NAVY,
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <div style={{ maxWidth: 800 }}>
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
          A program that teaches students to think about water like scientists.{' '}
          <em style={{ color: ORANGE }}>And act like engineers.</em>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          style={{
            color: STONE, fontSize: 'clamp(16px, 2vw, 20px)',
            lineHeight: 1.7, maxWidth: 620,
            fontFamily: 'sans-serif', fontWeight: 400,
          }}
        >
          AOM builds the interactive platform. Conrad Foundation owns the curriculum and the mission.
          Together: a program students remember for years and sponsors want to fund.
        </motion.p>
      </div>
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
            { num: '4–6', label: 'week turnaround to MVP platform', note: 'Fully functional — game, stream, calendar.' },
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
    document.title = 'Partnership — Mission Water × AOM';
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
      <WhatWeBring />
      <WhyItWorks />
      <HowItWorks />
      <WhoWeAre />
      <CTA navigate={navigate} />
    </div>
  );
}
