import React from 'react';
import { motion } from 'framer-motion';

const TILES = [
  { id: 't1', name: 'Ambition', from: '#2a1a13', to: '#0a0807', glow: 'rgba(232,93,38,0.45)', gx: '30%', gy: '20%' },
  { id: 't2', name: 'Skylar',   from: '#18211a', to: '#0a0c0a', glow: 'rgba(124,154,114,0.4)', gx: '70%', gy: '30%' },
  { id: 't3', name: 'Wiley',    from: '#1c1612', to: '#0a0805', glow: 'rgba(201,168,76,0.36)', gx: '50%', gy: '30%' },
  { id: 't4', name: 'ISA',      from: '#14171c', to: '#060810', glow: 'rgba(232,93,38,0.32)', gx: '20%', gy: '80%' },
  { id: 't5', name: 'Kohrs',    from: '#1a1a1a', to: '#0a0a0a', glow: 'rgba(232,93,38,0.28)', gx: '70%', gy: '70%' },
];

export default function HeroSection({ openBrief }) {
  const handleStart = () => {
    if (typeof openBrief === 'function') openBrief();
    else window.location.href = '/book';
  };

  return (
    <section
      data-hero="true"
      id="top"
      className="relative overflow-hidden bg-aom-cream"
      style={{
        padding: 'clamp(60px, 8vw, 120px) clamp(20px, 4vw, 64px) clamp(80px, 10vw, 140px)',
      }}
      aria-label="Hero"
    >
      <div
        className="mx-auto grid items-end gap-16"
        style={{
          maxWidth: 1400,
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
        }}
      >
        {/* LEFT: copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div className="hero-label flex items-center gap-3 text-[11px] font-body font-semibold uppercase tracking-[0.22em] text-aom-warm-gray mb-8">
            <span className="block w-7 h-px bg-aom-orange" />
            Phoenix, Arizona &nbsp;·&nbsp; Independent studio &nbsp;·&nbsp; 2026
          </div>

          <h1
            className="font-headline font-extrabold text-aom-black"
            style={{
              fontSize: 'clamp(56px, 8.4vw, 132px)',
              lineHeight: 0.92,
              letterSpacing: '-0.04em',
            }}
          >
            The studio that{' '}
            <em
              className="not-italic"
              style={{ fontStyle: 'italic', color: '#E85D26', fontWeight: 800 }}
            >
              moves
            </em>{' '}
            with you.
          </h1>

          <p
            className="font-body text-aom-warm-gray mt-8 max-w-[56ch]"
            style={{
              fontSize: 'clamp(16px, 1.4vw, 19px)',
              lineHeight: 1.55,
            }}
          >
            Brand, story, motion, and web. We work in days, not months. Phoenix-built, available anywhere. Hire us by subscription, by project, or by walking into the studio.
          </p>

          <div className="flex flex-wrap gap-3.5 mt-9">
            <button onClick={handleStart} className="aom-btn aom-btn--lg">
              Start a project
            </button>
            <a href="#work" className="aom-btn--ghost aom-btn--lg">
              See the work
            </a>
          </div>
        </motion.div>

        {/* RIGHT: work strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
          className="hero-strip"
          aria-hidden="true"
        >
          {TILES.map((t) => (
            <a
              key={t.id}
              href="#work"
              data-name={t.name}
              className={`hero-tile hero-tile--${t.id}`}
              style={{
                background: `linear-gradient(140deg, ${t.from}, ${t.to})`,
              }}
            >
              <span
                className="hero-tile__glow"
                style={{
                  background: `radial-gradient(120% 80% at ${t.gx} ${t.gy}, ${t.glow}, transparent 60%)`,
                }}
              />
              <span className="hero-tile__name">{t.name}</span>
            </a>
          ))}
        </motion.div>
      </div>

      <style>{`
        .aom-btn--lg { padding: 14px 22px; font-size: 14px; }

        .hero-strip {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(3, 100px);
          gap: 8px;
        }
        .hero-tile {
          display: block;
          position: relative;
          overflow: hidden;
          border-radius: 2px;
          transition: transform 0.6s cubic-bezier(.2,.8,.2,1);
          text-decoration: none;
        }
        .hero-tile:hover { transform: translateY(-3px); }
        .hero-tile__glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .hero-tile__name {
          position: absolute;
          left: 12px;
          bottom: 10px;
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.18em;
          color: #FDF6EC;
          text-transform: uppercase;
          z-index: 1;
        }
        .hero-tile--t1 { grid-row: span 2; }
        .hero-tile--t4 { grid-row: span 2; }

        @media (max-width: 1100px) {
          [data-hero="true"] > div {
            grid-template-columns: 1fr !important;
          }
          .hero-strip {
            grid-template-rows: repeat(2, 100px);
            grid-template-columns: repeat(3, 1fr);
          }
          .hero-tile--t1, .hero-tile--t4 { grid-row: auto; }
          .hero-tile--t5 { display: none; }
        }
      `}</style>
    </section>
  );
}
