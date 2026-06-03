import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MissionWaterGame — Earth water crisis to Moon pursuit.
 *
 * Two-phase narrative: Phase 1 (Earth) → Phase 2 (Moon).
 * Player makes 5 decisions across both phases. No perfect answer.
 * Opens: "You have 30 years of water left. What do you do?"
 * Closes: "The mission to the Moon wasn't about space. It was always about water."
 *
 * Design system:
 *   bg #0C0C0C, text #F0ECE6 warm bone, accent #E85D26 AOM orange
 *   Playfair Display / font-display-serif for scenario headlines
 *   Framer Motion transitions between cards/phases
 *   Full-width Earth → Moon phase break as the major moment
 *
 * Route: /missionwater  (also /MissionWaterGame, /mission-water-game)
 * Task id: 30626e30-b610-4b58-9e99-5e95bf51f3fb
 */

// ─── Game content ─────────────────────────────────────────────────────────────

const EARTH_DECISIONS = [
  {
    id: 'water_allocation',
    phase: 'earth',
    kicker: 'Decision 1 of 2 — Water Allocation',
    headline: 'There is not enough water for everyone.',
    subtext:
      "A city of 4 million. A reservoir at 18% capacity. A drought that’s entering its third year. You are the water engineer. The board is waiting. You have 72 hours to submit your allocation framework.",
    question: 'When supply collapses, where does the water go first?',
    choices: [
      {
        id: 'agriculture',
        label: 'Protect the food supply',
        description:
          'Agriculture accounts for 70% of water use. Cutting it creates food shortages — but farms are also the economic backbone. Prioritize farming.',
        icon: '🌾',
      },
      {
        id: 'drinking',
        label: 'People over everything',
        description:
          'Drinking water and sanitation first. Everything else is secondary. Industry and agriculture absorb the cuts.',
        icon: '💧',
      },
      {
        id: 'ecosystem',
        label: 'Protect the aquifer recharge zones',
        description:
          'If the ecosystem collapses, the aquifer never recovers. Protect rivers, wetlands, and recharge areas — even at the cost of near-term supply.',
        icon: '🌿',
      },
    ],
    outcomes: {
      agriculture: {
        headline: 'The farms survive. The city strains.',
        text: "Crop yields hold. The regional economy doesn't collapse. But the city's water pressure drops by 40%. Hospitals report supply disruptions. Residents with private wells survive. Everyone else is rationed to 38 liters a day — the humanitarian minimum.",
        insight:
          'Water allocation is a values problem, not just an engineering one. Every framework protects something at the expense of something else.',
      },
      drinking: {
        headline: 'Everyone drinks. Few can grow.',
        text: 'Drinking water stays stable. 40 liters per person per day. But farm water usage drops 60%, triggering a food import crisis. Supply chains strain. Three major industrial employers shut their operations within a year. The city survives. The regional economy does not.',
        insight:
          'Protecting one node in the water system creates stress on connected nodes. Water, food, and energy are the same crisis from different angles.',
      },
      ecosystem: {
        headline: 'A long bet. An immediate cost.',
        text: 'You protect the recharge zones. Aquifer levels stop falling within 18 months. The long-term math improves. But the near-term sacrifice is severe: crop failures, a water rationing emergency, and a political backlash that removes three council members. The next generation inherits a functioning aquifer. This generation paid for it.',
        insight:
          'Protecting future water supply requires sacrifice in the present. Systems thinking and political will rarely occupy the same timeline.',
      },
    },
  },
  {
    id: 'infrastructure',
    phase: 'earth',
    kicker: 'Decision 2 of 2 — Infrastructure',
    headline: "You've bought time. Not a solution.",
    subtext:
      'The allocation framework holds. The city is stable. But 30 years of supply — under the most optimistic models — has become 22 years. The infrastructure question is back on the table. You have one capital budget cycle.',
    question: 'How do you extend the supply?',
    choices: [
      {
        id: 'pipeline',
        label: 'Build the transfer pipeline',
        description:
          "A 340 km pipeline from the distant Northriver system. High capital cost, 8-year build, politically contentious — but when it's done, it adds 40 years of supply.",
        icon: '🔧',
      },
      {
        id: 'desalination',
        label: 'Desalinate at scale',
        description:
          "Build coastal desalination plants. Reliable, proven technology. Energy-intensive — runs on the same grid that's already strained. And it generates hypersaline brine with no clear disposal path.",
        icon: '🌊',
      },
      {
        id: 'conservation',
        label: 'Deep conservation mandate',
        description:
          'Smart metering, behavior change, industrial recycling loops, leak detection — a 30% reduction in demand. No new supply. Just using what exists far more efficiently.',
        icon: '📊',
      },
    ],
    outcomes: {
      pipeline: {
        headline: 'The pipeline works. For now.',
        text: "Eight years later, the pipeline delivers. Supply stabilizes. The city builds on that confidence — growing by 800,000 residents over two decades. In year 30, a study shows consumption has outpaced the pipeline's capacity. You've added 40 years of supply while adding 50 years of demand. The math has not changed.",
        insight:
          "Supply-side solutions enable more demand. Water infrastructure buys time, but doesn't change the fundamental equation unless it's paired with demand limits.",
      },
      desalination: {
        headline: 'Water from the sea. Problems from the sea.',
        text: "The plants produce clean water. Grid demand surges. A summer heat wave causes rolling blackouts — the desalination plants go offline just when demand peaks. The brine disposal issue festers: toxic concentrations near the discharge points shift the ocean chemistry. You've solved the water problem and created two new ones.",
        insight:
          'Every water solution is connected to energy. And every energy solution is connected to climate. They are not separate problems. They are the same problem at different scales.',
      },
      conservation: {
        headline: 'The demand drops. The timeline stretches.',
        text: "Industrial recycling loops cut water use by 28%. Smart meters change behavior. Leaks that were wasting 18% of supply get fixed. The reservoir climbs to 34% capacity over four years. You've turned 22 years into 31. But 31 years is still an end date. Conservation is not a source. It is a postponement.",
        insight:
          "Efficiency extends the clock but doesn't stop it. Without a new source of supply, conservation is a holding pattern — the most dignified version of delay.",
      },
    },
  },
];

const MOON_DECISIONS = [
  {
    id: 'crater',
    phase: 'moon',
    kicker: 'Decision 3 of 5 — Site Selection',
    headline: 'The Moon holds water.',
    subtext:
      "In permanently shadowed craters at the lunar south pole, water ice has been frozen for 3.5 billion years. LCROSS confirmed it in 2009. NASA's VIPER rover mapped deposits in 2024. 600 million metric tons — locked in darkness, preserved by temperatures colder than Pluto. You are lead mission architect. First decision: where do you drill?",
    question: 'Which crater do you target first?',
    choices: [
      {
        id: 'haworth',
        label: 'Haworth Crater',
        description:
          'Smaller. More accessible. Shallower ice deposits — within 50 cm of surface in most areas. Lower extraction energy required. Lower yield per site.',
        icon: '◎',
        detail: '87.4°S, 5.1°W · Depth: 2.8 km · Ice depth: 0–80 cm',
      },
      {
        id: 'shackleton',
        label: 'Shackleton Crater',
        description:
          'Larger. Deep ice confirmed at multiple meters depth. Estimated 30% higher yield than Haworth. Steep internal walls complicate rover deployment. Higher reward, harder mission.',
        icon: '◉',
        detail: '89.9°S, 0°E · Depth: 4.2 km · Ice depth: up to 2m',
      },
      {
        id: 'nobile',
        label: 'Nobile Crater',
        description:
          'The highest confirmed water concentration — 8.5% by mass. Previously mapped by VIPER. Well-studied, well-understood. But near-rim terrain is unstable. Risk profile is different.',
        icon: '⊙',
        detail: '85.4°S, 53.5°E · Ice concentration: 8.5% by mass',
      },
    ],
    outcomes: {
      haworth: {
        headline: 'Safe margins. Real results.',
        text: "Rovers deploy cleanly. Shallow ice is accessible within 8 hours of arrival. First extraction yields 4,200 liters — a fraction of what's possible, but proof it works. The team celebrates and begins Phase 2 planning. The shallow deposits deplete faster than modeled. Next mission will need to go deeper.",
        insight: 'The safest target is rarely the highest-value one. Early success creates the mandate for harder missions.',
      },
      shackleton: {
        headline: 'The gamble pays.',
        text: "Rover deployment is harder. Three of twelve wheels require recalibration in the crater's shadow. But the ice cores are extraordinary — 94% pure water ice at 1.8 meters depth. Extraction yields exceed projections by 40%. The Moon is more generous than the models predicted.",
        insight: 'Lunar craters formed under different physics than Earth geology. The science was right; the risk models were too conservative.',
      },
      nobile: {
        headline: 'Maximum yield. Real consequences.',
        text: "Water extraction volumes exceed any other site. But two weeks in, near-rim instability triggers a minor landslide that buries one of three extraction units. The team recovers 2 of 3 units. Final yield is still the mission's highest ever, but the close call forces a redesign of safety protocols.",
        insight: "High concentration doesn't always mean high safety margin. Water ice and terrain stability are separate problems at the same location.",
      },
    },
  },
  {
    id: 'extraction',
    phase: 'moon',
    kicker: 'Decision 4 of 5 — Extraction Method',
    headline: 'The water is there. Now you have to get it out.',
    subtext:
      'Temperature in the permanently shadowed zone: −230°C. Light: zero. The ice is real, confirmed, waiting. But extracting water at the bottom of a 4 km crater, in permanent shadow, with no communications relay overhead, requires a choice.',
    question: 'How do you extract the ice?',
    choices: [
      {
        id: 'thermal',
        label: 'Thermal sublimation',
        description:
          'Use microwave heating to sublimate ice directly into water vapor. Capture vapor in sealed collection chambers, condense back to liquid. Lower mechanical complexity. Higher energy demand.',
        icon: '♨',
      },
      {
        id: 'mechanical',
        label: 'Mechanical core drilling',
        description:
          'Physical augers drill into the regolith, extract ice cores, transfer to a pressurized processing unit. Proven Earth analog technology. Mechanical failure risk in extreme cold.',
        icon: '⚙',
      },
    ],
    outcomes: {
      thermal: {
        headline: 'The vapor condenses perfectly.',
        text: 'Microwave emitters sublimate the ice into vapor in under 3 minutes per cycle. Collection chambers fill faster than modeled. The system loses 12% of water yield to vapor diffusion before capture. An improvised thermal collar reduces the loss to 4% after 18 hours. Final collection efficiency: 96%. The energy cost is double the initial projections, but the water is there.',
        insight: 'Thermal systems work in extreme cold — but energy calculations in ultra-low-temperature environments have higher uncertainty than standard engineering tables account for.',
      },
      mechanical: {
        headline: 'The drill holds. The ice core is spectacular.',
        text: 'At −230°C, three of six auger drives seize after the first hour. The team switches to two backup units. Ice cores extracted at 1.4 meters depth contain water so pure it exceeds Earth drinking water standards. The mechanical failure forced improvisation. The improvisation worked. The sample is extraordinary.',
        insight: 'Lunar ice is older and purer than any water on Earth — formed from cometary impacts over billions of years, undisturbed. The Moon is a water archive.',
      },
    },
  },
  {
    id: 'return',
    phase: 'moon',
    kicker: 'Decision 5 of 5 — Return',
    headline: 'You have water on the Moon.',
    subtext:
      'The extraction was successful. Containers are filled. The crew has demonstrated that lunar water is real, accessible, and recoverable. The final question: how does it get home? Two return architectures are on the table.',
    question: 'How do you bring it back to Earth?',
    choices: [
      {
        id: 'propulsion',
        label: 'Chemical propulsion return vessel',
        description:
          'Standard rocket return. Proven technology. High energy cost per kilogram. Round trip per mission: enormous fuel overhead. But every payload arrives safely.',
        icon: '🚀',
      },
      {
        id: 'mass_driver',
        label: 'Electromagnetic mass driver launch',
        description:
          'Rail-gun style launcher on the lunar surface accelerates payloads to escape velocity. No chemical fuel per launch after the initial installation. Theoretically 40× lower return cost per kg. Untested at scale.',
        icon: '⚡',
      },
    ],
    outcomes: {
      propulsion: {
        headline: 'Safe delivery. Clear cost.',
        text: 'The return vessel lands at the recovery site. 2,800 liters of lunar water, sealed and intact. The fuel cost for this retrieval mission represents 80% of the total budget. Every liter returned cost approximately $140,000. The engineers already know what that means: the first generation of lunar water returns are about science, not supply. The economics follow later.',
        insight: 'The first missions exist to prove feasibility, not to be economically optimal. The first ship to cross an ocean was also not the shipping industry.',
      },
      mass_driver: {
        headline: 'The launcher works. The capture does not.',
        text: "The mass driver accelerates the first payload container to escape velocity in 2.4 seconds. The targeting is within margin. But the Earth-side recovery vessel misses the intercept by 400 km — the guidance system's GPS-dependent calibration failed in deep space. The second container is recovered. The third, fourth, and fifth succeed. Iteration under pressure. The system works in principle.",
        insight: 'Cheap transport is not free transport. Every novel system carries a development cost. The breakthrough technologies of the future require investment in failure today.',
      },
    },
  },
];

// ─── Animation helpers ────────────────────────────────────────────────────────

const scene = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

// ─── Primitives ───────────────────────────────────────────────────────────────

function Kicker({ children, color = '#E85D26', className = '' }) {
  return (
    <p
      className={`font-mono text-[10.5px] uppercase tracking-[0.28em] ${className}`}
      style={{ color }}
    >
      {children}
    </p>
  );
}

function ScienceBadge({ label, color = '#E85D26' }) {
  return (
    <span
      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] border rounded-full px-3 py-1.5"
      style={{ color: '#F0ECE6', borderColor: `${color}55`, background: `${color}12` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function PrimaryBtn({ children, onClick, accent = '#E85D26', outline = false }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="font-mono text-[11px] uppercase tracking-[0.24em] px-7 py-3.5 rounded-full border transition-all duration-300"
      style={{
        borderColor: accent,
        background: outline ? 'transparent' : hover ? '#F0ECE6' : accent,
        color: outline ? (hover ? accent : `${accent}cc`) : '#0C0C0C',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {children}
    </button>
  );
}

// ─── HUD bar ──────────────────────────────────────────────────────────────────

function HUD({ phase, decisionIndex, totalDecisions, cadetName }) {
  const hidden = phase === 'intro' || phase === 'briefing';
  if (hidden) return null;

  const isEarth = phase === 'earth' || phase.startsWith('earth_');
  const isMoon = phase === 'moon' || phase.startsWith('moon_');
  const isTransition = phase === 'phase_break';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-md"
      style={{ background: 'rgba(12,12,12,0.8)', borderColor: '#F0ECE61A' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.24em] text-[#E85D26]">
          Mission Water
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border"
            style={{
              borderColor: isEarth ? '#E85D2655' : '#F0ECE61A',
              color: isEarth ? '#E85D26' : '#F0ECE6/35',
              background: isEarth ? '#E85D2610' : 'transparent',
            }}
          >
            Phase 1: Earth
          </span>
          <span className="font-mono text-[9px] text-[#F0ECE6]/25">→</span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border"
            style={{
              borderColor: isMoon ? '#3B82F655' : '#F0ECE61A',
              color: isMoon ? '#3B82F6' : '#F0ECE6/35',
              background: isMoon ? '#3B82F610' : 'transparent',
            }}
          >
            Phase 2: Moon
          </span>
        </div>
        <div className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#F0ECE6]/50">
          {cadetName ? cadetName : ''}
          {totalDecisions > 0 && (
            <span className="text-[#F0ECE6]/30 ml-2">
              {decisionIndex + 1}/{totalDecisions}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

function IntroScene({ onBegin }) {
  return (
    <motion.div
      key="intro"
      {...scene}
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
    >
      {/* subtle starfield */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              top: `${(i * 47) % 100}%`,
              left: `${(i * 73) % 100}%`,
              width: `${(i % 3) + 1}px`,
              height: `${(i % 3) + 1}px`,
              background: i % 7 === 0 ? '#3B82F6' : '#F0ECE6',
              opacity: ((i % 6) + 1) * 0.05,
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,93,38,0.06) 0%, rgba(12,12,12,0) 70%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[960px]">
        <motion.div {...fadeIn(0)}>
          <Kicker className="mb-10">Conrad Foundation · Mission Water</Kicker>
        </motion.div>
        <motion.h1
          {...fadeIn(0.1)}
          className="font-display-serif text-[17vw] md:text-[144px] leading-[0.86] tracking-[-0.045em] mb-6"
        >
          Mission{' '}
          <em className="font-display-italic italic text-[#E85D26]">Water.</em>
        </motion.h1>
        <motion.p
          {...fadeIn(0.2)}
          className="font-display-serif text-[20px] md:text-[28px] text-[#F0ECE6]/70 leading-[1.3] tracking-[-0.02em] mb-3 max-w-[40ch] mx-auto"
        >
          Earth is running out.
        </motion.p>
        <motion.p
          {...fadeIn(0.25)}
          className="font-display-serif text-[17px] md:text-[22px] text-[#F0ECE6]/45 leading-[1.3] tracking-[-0.02em] mb-14 max-w-[44ch] mx-auto"
        >
          The answer is somewhere unexpected.
        </motion.p>
        <motion.div {...fadeIn(0.35)}>
          <PrimaryBtn onClick={onBegin}>Begin Mission</PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

function BriefingScene({ cadetName, setCadetName, onAccept }) {
  const valid = cadetName.trim().length >= 2;
  return (
    <motion.div
      key="briefing"
      {...scene}
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16"
    >
      <div className="max-w-[800px] w-full">
        <div
          className="border rounded-2xl p-8 md:p-14"
          style={{ borderColor: '#F0ECE61A', background: 'rgba(18,18,18,0.7)' }}
        >
          <Kicker className="mb-3">Mission Brief · 2047</Kicker>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/35 mb-10">
            Global Water Security Council
          </div>

          <motion.h2
            {...fadeIn(0.15)}
            className="font-display-serif text-[36px] md:text-[58px] leading-[0.95] tracking-[-0.03em] mb-8"
          >
            You have{' '}
            <em className="font-display-italic italic text-[#E85D26]">30 years</em>{' '}
            of water left.
          </motion.h2>
          <motion.p
            {...fadeIn(0.25)}
            className="font-display-serif text-[20px] md:text-[26px] text-[#F0ECE6]/65 leading-[1.3] tracking-[-0.02em] mb-10"
          >
            What do you do?
          </motion.p>

          <motion.p
            {...fadeIn(0.35)}
            className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/60 leading-[1.7] mb-12 max-w-[60ch]"
          >
            You are an engineer and scientist advising a regional water authority. The decisions you make now — about allocation, infrastructure, and eventually, where to look beyond Earth — determine what the next generation inherits.
          </motion.p>

          <motion.div {...fadeIn(0.45)}>
            <label className="block">
              <Kicker className="mb-3">Your name</Kicker>
              <input
                type="text"
                value={cadetName}
                onChange={(e) => setCadetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && valid && onAccept()}
                placeholder="Enter your name"
                className="w-full bg-transparent border-b font-display-serif text-[28px] md:text-[38px] text-[#F0ECE6] focus:outline-none pb-3 placeholder:text-[#F0ECE6]/20"
                style={{ borderColor: '#F0ECE630' }}
                maxLength={40}
              />
            </label>
            <div className="mt-10">
              <PrimaryBtn onClick={onAccept}>
                {valid ? 'Accept the Mission' : 'Enter your name to continue'}
              </PrimaryBtn>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function EarthContextScene({ cadetName, onNext }) {
  return (
    <motion.div
      key="earth_context"
      {...scene}
      className="min-h-screen px-6 pt-28 pb-20 flex flex-col justify-center"
    >
      <div className="max-w-[1100px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker className="mb-5">Phase 1 — Earth: &ldquo;We&rsquo;re running out&rdquo;</Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[52px] md:text-[88px] leading-[0.9] tracking-[-0.04em] mb-10"
        >
          The math is simple.{' '}
          <em className="font-display-italic italic text-[#E85D26]">And unforgiving.</em>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          <motion.div {...fadeIn(0.2)}>
            <div
              className="border rounded-2xl p-7 md:p-9 h-full"
              style={{ borderColor: '#E85D2630', background: 'rgba(232,93,38,0.04)' }}
            >
              <Kicker className="mb-4">The situation</Kicker>
              <p className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/80 leading-[1.7]">
                At current consumption rates, the aquifer beneath your city — the one that's supplied it for 120 years — will reach critical depletion in 30 years. Climate models project this isn't an anomaly. It's the new baseline.
              </p>
            </div>
          </motion.div>
          <motion.div {...fadeIn(0.3)}>
            <div
              className="border rounded-2xl p-7 md:p-9 h-full"
              style={{ borderColor: '#3B82F630', background: 'rgba(59,130,246,0.04)' }}
            >
              <Kicker color="#3B82F6" className="mb-4">The numbers</Kicker>
              <div className="space-y-4">
                {[
                  { label: 'Years to critical depletion', value: '30 years', status: 'warning' },
                  { label: 'Annual depth loss (accelerating)', value: '3.4 ft/yr', status: 'critical' },
                  { label: 'Rainfall deficit (5yr avg)', value: '38% below avg', status: 'critical' },
                  { label: 'Population dependent', value: '4.1 million', status: 'neutral' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="font-body text-[13.5px] text-[#F0ECE6]/65">{row.label}</span>
                    <span
                      className="font-mono text-[13px] tabular-nums"
                      style={{
                        color:
                          row.status === 'critical'
                            ? '#EF4444'
                            : row.status === 'warning'
                            ? '#F59E0B'
                            : '#F0ECE6/80',
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p
          {...fadeIn(0.4)}
          className="font-display-serif italic text-[19px] md:text-[24px] text-[#F0ECE6]/60 leading-[1.5] mb-14 max-w-[58ch]"
        >
          You have been appointed lead water security advisor. Two decisions on Earth must be made before the third option — the one nobody wants to say out loud — becomes unavoidable.
        </motion.p>

        <motion.div {...fadeIn(0.5)}>
          <PrimaryBtn onClick={onNext}>Make the first decision</PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

function DecisionScene({ decision, onChoose, decisionNumber, totalDecisions }) {
  return (
    <motion.div key={decision.id} {...scene} className="min-h-screen px-6 pt-28 pb-20">
      <div className="max-w-[1180px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker className="mb-5">{decision.kicker}</Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[40px] md:text-[68px] leading-[0.93] tracking-[-0.03em] mb-6"
        >
          {decision.headline}
        </motion.h2>
        <motion.p
          {...fadeIn(0.2)}
          className="font-body text-[15px] md:text-[18px] text-[#F0ECE6]/70 leading-[1.7] mb-10 max-w-[66ch]"
        >
          {decision.subtext}
        </motion.p>

        <motion.div
          {...fadeIn(0.3)}
          className="border-l-2 pl-6 md:pl-8 mb-14"
          style={{ borderColor: '#E85D2660' }}
        >
          <p className="font-display-serif text-[20px] md:text-[26px] text-[#F0ECE6] leading-[1.35] tracking-[-0.015em]">
            {decision.question}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {decision.choices.map((choice, i) => (
            <motion.button
              key={choice.id}
              {...fadeIn(0.35 + i * 0.08)}
              onClick={() => onChoose(choice.id)}
              className="text-left border rounded-2xl p-7 md:p-8 transition-all duration-300 group cursor-pointer"
              style={{ borderColor: '#F0ECE61A', background: 'rgba(18,18,18,0.6)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#E85D26';
                e.currentTarget.style.background = 'rgba(232,93,38,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#F0ECE61A';
                e.currentTarget.style.background = 'rgba(18,18,18,0.6)';
              }}
            >
              <div className="text-[28px] mb-5 opacity-75">{choice.icon}</div>
              <h3 className="font-display-serif text-[24px] md:text-[28px] leading-[1.05] tracking-[-0.02em] mb-4">
                {choice.label}
              </h3>
              <p className="font-body text-[14px] md:text-[14.5px] text-[#F0ECE6]/65 leading-[1.65] mb-5">
                {choice.description}
              </p>
              {choice.detail && (
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#3B82F6]/70 mb-5">
                  {choice.detail}
                </p>
              )}
              <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26]">
                Choose this <span aria-hidden>→</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OutcomeScene({ decision, choiceId, isEarth, onNext }) {
  const outcome = decision.outcomes[choiceId];
  const choice = decision.choices.find((c) => c.id === choiceId);
  return (
    <motion.div key={`outcome_${decision.id}`} {...scene} className="min-h-screen px-6 pt-28 pb-24">
      <div className="max-w-[1060px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker className="mb-4">Outcome · {choice?.label}</Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[40px] md:text-[68px] leading-[0.93] tracking-[-0.03em] mb-12"
        >
          {outcome.headline}
        </motion.h2>
        <motion.p
          {...fadeIn(0.2)}
          className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/80 leading-[1.75] mb-14 max-w-[68ch]"
        >
          {outcome.text}
        </motion.p>

        {/* Insight block */}
        <motion.div
          {...fadeIn(0.35)}
          className="border-l-2 pl-6 md:pl-8 py-2 mb-14"
          style={{ borderColor: isEarth ? '#E85D26' : '#3B82F6' }}
        >
          <Kicker color={isEarth ? '#E85D26' : '#3B82F6'} className="mb-3">
            What this reveals
          </Kicker>
          <p className="font-display-serif italic text-[19px] md:text-[23px] text-[#F0ECE6]/85 leading-[1.45] tracking-[-0.015em] max-w-[60ch]">
            {outcome.insight}
          </p>
        </motion.div>

        <motion.div {...fadeIn(0.5)}>
          <PrimaryBtn onClick={onNext} accent={isEarth ? '#E85D26' : '#3B82F6'}>
            Continue
          </PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

function EarthCrisisScene({ cadetName, choices, onNext }) {
  return (
    <motion.div key="earth_crisis" {...scene} className="min-h-screen px-6 pt-28 pb-24">
      <div className="max-w-[1060px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker className="mb-6">Earth · Year 22</Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[44px] md:text-[76px] leading-[0.9] tracking-[-0.035em] mb-10"
        >
          You've done{' '}
          <em className="font-display-italic italic text-[#E85D26]">everything right.</em>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {[
            { label: choices.water_allocation, desc: 'Your allocation framework held.' },
            { label: choices.infrastructure, desc: 'Your infrastructure decision added years.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              {...fadeIn(0.2 + i * 0.1)}
              className="border rounded-xl p-6"
              style={{ borderColor: '#F0ECE61A', background: 'rgba(18,18,18,0.5)' }}
            >
              <Kicker className="mb-2">Decision {i + 1}</Kicker>
              <p className="font-display-serif text-[18px] md:text-[22px] leading-[1.2] tracking-[-0.015em] mb-2">
                {item.label}
              </p>
              <p className="font-body text-[13px] text-[#F0ECE6]/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          {...fadeIn(0.4)}
          className="font-body text-[16px] md:text-[19px] text-[#F0ECE6]/75 leading-[1.75] mb-6 max-w-[66ch]"
        >
          The allocation framework held. The infrastructure decision added years. Engineers estimate you've bought 8 more years of supply, maybe 12 under ideal conditions.
        </motion.p>

        <motion.div
          {...fadeIn(0.5)}
          className="border rounded-2xl p-7 md:p-10 mb-14"
          style={{ borderColor: '#EF444433', background: 'rgba(239,68,68,0.04)' }}
        >
          <Kicker color="#EF4444" className="mb-4">
            The math hasn't changed
          </Kicker>
          <p className="font-display-serif text-[22px] md:text-[28px] leading-[1.3] tracking-[-0.02em] text-[#F0ECE6]/90">
            The aquifer is still depleting. The demand is still growing. What you've done is slow the clock. Not stop it.
          </p>
        </motion.div>

        <motion.p
          {...fadeIn(0.6)}
          className="font-display-serif italic text-[18px] md:text-[22px] text-[#F0ECE6]/55 leading-[1.5] mb-14 max-w-[58ch]"
        >
          There is one more option. It's been in the briefings for three years. Nobody has wanted to say it out loud.
        </motion.p>

        <motion.div {...fadeIn(0.7)}>
          <PrimaryBtn onClick={onNext}>Keep reading</PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

function PhaseBreakScene({ onNext }) {
  return (
    <motion.div
      key="phase_break"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* deep space background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 100% at 50% 100%, rgba(59,130,246,0.12) 0%, rgba(12,12,12,0) 60%)',
        }}
      />
      {/* stars */}
      {Array.from({ length: 100 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${(i * 37) % 100}%`,
            left: `${(i * 61) % 100}%`,
            width: `${(i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1)}px`,
            height: `${(i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1)}px`,
            background: i % 11 === 0 ? '#3B82F6' : '#F0ECE6',
            opacity: ((i % 8) + 1) * 0.06,
            borderRadius: '50%',
          }}
        />
      ))}

      {/* divider line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 h-px origin-left"
        style={{ background: 'linear-gradient(90deg, #3B82F600 0%, #3B82F6 50%, #3B82F600 100%)' }}
      />

      <div className="relative z-10 text-center px-6 max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Kicker color="#3B82F6" className="mb-12">
            Phase 2 — The Moon: 'The answer is up there'
          </Kicker>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/30 mb-8">
            Lunar South Pole · Permanently Shadowed Region · −230°C
          </p>
          <h2 className="font-display-serif text-[14vw] md:text-[120px] leading-[0.86] tracking-[-0.045em] mb-8">
            The{' '}
            <em className="font-display-italic italic" style={{ color: '#3B82F6' }}>
              Moon
            </em>
          </h2>
          <p className="font-display-serif italic text-[18px] md:text-[24px] text-[#F0ECE6]/55 leading-[1.45] mb-16 max-w-[48ch] mx-auto">
            Water ice. 600 million metric tons. Frozen since before life existed on Earth. In permanent shadow. Waiting.
          </p>
          <PrimaryBtn onClick={onNext} accent="#3B82F6">
            Begin Phase 2
          </PrimaryBtn>
        </motion.div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px origin-right"
        style={{ background: 'linear-gradient(90deg, #3B82F600 0%, #3B82F6 50%, #3B82F600 100%)' }}
      />
    </motion.div>
  );
}

function MoonContextScene({ onNext }) {
  return (
    <motion.div key="moon_context" {...scene} className="min-h-screen px-6 pt-28 pb-24">
      <div className="max-w-[1100px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker color="#3B82F6" className="mb-5">
            The science — what we already know
          </Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[44px] md:text-[76px] leading-[0.9] tracking-[-0.04em] mb-10"
        >
          The Moon has{' '}
          <em className="font-display-italic italic" style={{ color: '#3B82F6' }}>
            water ice.
          </em>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {[
            {
              kicker: 'Confirmed 2009',
              title: 'LCROSS Impact',
              text: "NASA's LCROSS mission intentionally crashed into Cabeus crater and detected water vapor in the debris plume. Confirmed: water ice is real, accessible, and present in permanently shadowed regions.",
            },
            {
              kicker: 'Mapped 2024',
              title: 'VIPER Rover Data',
              text: "NASA's VIPER mapped the distribution of water ice at the lunar south pole. Concentration varies by location — from trace amounts to 8.5% by mass in high-value zones.",
            },
            {
              kicker: "Why it's there",
              title: 'Cometary origin',
              text: 'Comets and asteroids carrying water ice have impacted the Moon for billions of years. Ice that landed in permanently shadowed craters — where temperatures never exceed −163°C — has been preserved intact.',
            },
            {
              kicker: 'The opportunity',
              title: 'Distribution problem',
              text: "Earth's water crisis is a distribution problem: water exists, but not where it's needed, not when it's needed. The Moon's water is the same problem in reverse. The science of moving water is the science of solving it.",
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              {...fadeIn(0.2 + i * 0.08)}
              className="border rounded-2xl p-6 md:p-8"
              style={{ borderColor: '#3B82F622', background: 'rgba(59,130,246,0.04)' }}
            >
              <Kicker color="#3B82F6" className="mb-2">
                {card.kicker}
              </Kicker>
              <h3 className="font-display-serif text-[22px] md:text-[26px] leading-[1.1] tracking-[-0.02em] mb-4">
                {card.title}
              </h3>
              <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/70 leading-[1.65]">
                {card.text}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          {...fadeIn(0.55)}
          className="font-display-serif italic text-[18px] md:text-[22px] text-[#F0ECE6]/55 leading-[1.5] mb-14 max-w-[58ch]"
        >
          You are now mission architect for the first operational water extraction mission to the lunar south pole. Three decisions remain.
        </motion.p>

        <motion.div {...fadeIn(0.65)}>
          <PrimaryBtn onClick={onNext} accent="#3B82F6">
            Make the mission decisions
          </PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ConclusionScene({ cadetName, earthChoices, moonChoices }) {
  const allChoices = { ...earthChoices, ...moonChoices };

  const mailto = `mailto:hello@aom-inhouse.com?subject=${encodeURIComponent(
    `Mission Water — ${cadetName}'s Decisions`
  )}&body=${encodeURIComponent(
    `Cadet: ${cadetName}\n\nEarth decisions:\n· Water allocation: ${earthChoices.water_allocation}\n· Infrastructure: ${earthChoices.infrastructure}\n\nMoon decisions:\n· Crater: ${moonChoices.crater}\n· Extraction: ${moonChoices.extraction}\n· Return: ${moonChoices.return}\n\nThis was a prototype experience by the Conrad Foundation.`
  )}`;

  return (
    <motion.div key="conclusion" {...scene} className="min-h-screen px-6 pt-28 pb-28">
      <div className="max-w-[1060px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker color="#3B82F6" className="mb-6">
            Mission Complete
          </Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[44px] md:text-[84px] leading-[0.88] tracking-[-0.04em] mb-12"
        >
          The mission to the Moon{' '}
          <em className="font-display-italic italic text-[#E85D26]">
            wasn't about space.
          </em>
        </motion.h2>

        <motion.div
          {...fadeIn(0.2)}
          className="border-l-2 pl-6 md:pl-8 py-2 mb-16"
          style={{ borderColor: '#E85D26' }}
        >
          <p className="font-display-serif text-[24px] md:text-[32px] italic leading-[1.3] tracking-[-0.02em] text-[#F0ECE6]/90 max-w-[52ch]">
            It was always about water.
          </p>
        </motion.div>

        {/* Decision summary */}
        <motion.div {...fadeIn(0.3)} className="mb-16">
          <Kicker className="mb-6">Your decisions</Kicker>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { phase: 'Earth', id: 'water_allocation', label: 'Water Allocation', choices: EARTH_DECISIONS[0].choices },
              { phase: 'Earth', id: 'infrastructure', label: 'Infrastructure', choices: EARTH_DECISIONS[1].choices },
              { phase: 'Moon', id: 'crater', label: 'Crater', choices: MOON_DECISIONS[0].choices },
              { phase: 'Moon', id: 'extraction', label: 'Extraction Method', choices: MOON_DECISIONS[1].choices },
              { phase: 'Moon', id: 'return', label: 'Return Method', choices: MOON_DECISIONS[2].choices },
            ].map((d, i) => {
              const chosenId = allChoices[d.id];
              const chosenLabel = d.choices?.find((c) => c.id === chosenId)?.label || chosenId;
              return (
                <div
                  key={d.id}
                  className="border rounded-xl px-5 py-4 flex items-start gap-4"
                  style={{
                    borderColor: d.phase === 'Moon' ? '#3B82F620' : '#F0ECE61A',
                    background:
                      d.phase === 'Moon' ? 'rgba(59,130,246,0.04)' : 'rgba(18,18,18,0.4)',
                  }}
                >
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.22em] mt-0.5 shrink-0"
                    style={{ color: d.phase === 'Moon' ? '#3B82F6' : '#E85D26' }}
                  >
                    {d.phase}
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/40 mb-1">
                      {d.label}
                    </p>
                    <p className="font-display-serif text-[16px] md:text-[18px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]/90">
                      {chosenLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Pete Conrad quote */}
        <motion.div
          {...fadeIn(0.4)}
          className="border rounded-2xl p-7 md:p-10 mb-14"
          style={{ borderColor: '#E85D2630', background: 'rgba(232,93,38,0.04)' }}
        >
          <Kicker className="mb-5">Pete Conrad · Apollo 12 Commander</Kicker>
          <p className="font-display-serif italic text-[24px] md:text-[30px] leading-[1.35] text-[#F0ECE6]/90 tracking-[-0.02em] mb-5">
            "If you can't be good, be colorful."
          </p>
          <p className="font-body text-[14.5px] text-[#F0ECE6]/55 leading-[1.65] max-w-[54ch]">
            He believed anyone could reach the stars — and that curiosity was the only prerequisite. This mission exists because of that belief.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeIn(0.5)} className="flex flex-col sm:flex-row items-start gap-5 mb-16">
          <a
            href={mailto}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] px-7 py-3.5 rounded-full border transition-all duration-300"
            style={{ borderColor: '#E85D26', background: '#E85D26', color: '#0C0C0C' }}
          >
            Share your report
          </a>
        </motion.div>

        <motion.p
          {...fadeIn(0.6)}
          className="font-body text-[13px] text-[#F0ECE6]/35 leading-[1.65] max-w-[60ch]"
        >
          This is a prototype of the Mission Water Platform, developed for the Conrad Foundation by{' '}
          <a
            href="https://aheadofmarket.com"
            className="underline decoration-[#F0ECE6]/25 hover:text-[#F0ECE6]/60 transition-colors"
          >
            Ahead of Market
          </a>
          . Water ice data sourced from NASA LCROSS (2009), VIPER mission (2024), and USGS lunar mapping surveys.
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TOTAL_DECISIONS = EARTH_DECISIONS.length + MOON_DECISIONS.length;

export default function MissionWaterGame() {
  const [phase, setPhase] = useState('intro');
  const [cadetName, setCadetName] = useState('');
  const [earthChoices, setEarthChoices] = useState({});
  const [moonChoices, setMoonChoices] = useState({});
  const [currentDecisionIdx, setCurrentDecisionIdx] = useState(0); // for progress tracking

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    document.title = 'Mission Water — Earth to Moon | Conrad Foundation';
    return () => { meta.remove(); };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [phase]);

  const allDecisionsCount = phase.startsWith('earth') || phase === 'intro' || phase === 'briefing'
    ? EARTH_DECISIONS.length
    : TOTAL_DECISIONS;

  // ── Phase: intro → briefing ──────────────────────────────────────────────
  const handleBegin = () => setPhase('briefing');
  const handleAcceptMission = () => {
    if (cadetName.trim().length >= 2) setPhase('earth_context');
  };

  // ── Phase: earth_context → earth decision 0 ──────────────────────────────
  const handleStartEarth = () => setPhase('earth_d0');

  // ── Earth decisions ──────────────────────────────────────────────────────
  const handleEarthChoice = (decisionId, choiceId) => {
    setEarthChoices((prev) => ({ ...prev, [decisionId]: choiceId }));
    setPhase(`earth_outcome_${decisionId}`);
  };

  const handleEarthOutcomeNext = (nextDecisionIdx) => {
    if (nextDecisionIdx < EARTH_DECISIONS.length) {
      setCurrentDecisionIdx(nextDecisionIdx);
      setPhase(`earth_d${nextDecisionIdx}`);
    } else {
      setPhase('earth_crisis');
    }
  };

  const handleEarthCrisisNext = () => setPhase('phase_break');

  // ── Phase break ──────────────────────────────────────────────────────────
  const handlePhaseBreakNext = () => setPhase('moon_context');
  const handleMoonContextNext = () => setPhase('moon_d0');

  // ── Moon decisions ───────────────────────────────────────────────────────
  const handleMoonChoice = (decisionId, choiceId) => {
    setMoonChoices((prev) => ({ ...prev, [decisionId]: choiceId }));
    setPhase(`moon_outcome_${decisionId}`);
  };

  const handleMoonOutcomeNext = (nextDecisionIdx) => {
    if (nextDecisionIdx < MOON_DECISIONS.length) {
      setCurrentDecisionIdx(EARTH_DECISIONS.length + nextDecisionIdx);
      setPhase(`moon_d${nextDecisionIdx}`);
    } else {
      setPhase('conclusion');
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────
  const choiceLabels = {
    water_allocation: EARTH_DECISIONS[0]?.choices.find((c) => c.id === earthChoices.water_allocation)?.label || '',
    infrastructure: EARTH_DECISIONS[1]?.choices.find((c) => c.id === earthChoices.infrastructure)?.label || '',
    crater: MOON_DECISIONS[0]?.choices.find((c) => c.id === moonChoices.crater)?.label || '',
    extraction: MOON_DECISIONS[1]?.choices.find((c) => c.id === moonChoices.extraction)?.label || '',
    return: MOON_DECISIONS[2]?.choices.find((c) => c.id === moonChoices.return)?.label || '',
  };

  // Determine progress numbers
  let hudDecisionIdx = -1;
  let hudTotal = -1;
  if (phase.startsWith('earth_d')) {
    const idx = parseInt(phase.replace('earth_d', ''), 10);
    hudDecisionIdx = idx;
    hudTotal = TOTAL_DECISIONS;
  } else if (phase.startsWith('moon_d')) {
    const idx = parseInt(phase.replace('moon_d', ''), 10);
    hudDecisionIdx = EARTH_DECISIONS.length + idx;
    hudTotal = TOTAL_DECISIONS;
  }

  return (
    <div
      className="min-h-screen antialiased relative"
      style={{ background: '#0C0C0C', color: '#F0ECE6' }}
    >
      <HUD
        phase={phase}
        decisionIndex={hudDecisionIdx}
        totalDecisions={hudTotal}
        cadetName={cadetName}
      />

      <AnimatePresence mode="wait">
        {phase === 'intro' && <IntroScene key="intro" onBegin={handleBegin} />}

        {phase === 'briefing' && (
          <BriefingScene
            key="briefing"
            cadetName={cadetName}
            setCadetName={setCadetName}
            onAccept={handleAcceptMission}
          />
        )}

        {phase === 'earth_context' && (
          <EarthContextScene key="earth_context" cadetName={cadetName} onNext={handleStartEarth} />
        )}

        {/* Earth decision scenes */}
        {EARTH_DECISIONS.map((decision, idx) => (
          <React.Fragment key={decision.id}>
            {phase === `earth_d${idx}` && (
              <DecisionScene
                key={`earth_d${idx}`}
                decision={decision}
                decisionNumber={idx + 1}
                totalDecisions={TOTAL_DECISIONS}
                onChoose={(choiceId) => handleEarthChoice(decision.id, choiceId)}
              />
            )}
            {phase === `earth_outcome_${decision.id}` && earthChoices[decision.id] && (
              <OutcomeScene
                key={`earth_outcome_${decision.id}`}
                decision={decision}
                choiceId={earthChoices[decision.id]}
                isEarth={true}
                onNext={() => handleEarthOutcomeNext(idx + 1)}
              />
            )}
          </React.Fragment>
        ))}

        {phase === 'earth_crisis' && (
          <EarthCrisisScene
            key="earth_crisis"
            cadetName={cadetName}
            choices={choiceLabels}
            onNext={handleEarthCrisisNext}
          />
        )}

        {phase === 'phase_break' && (
          <PhaseBreakScene key="phase_break" onNext={handlePhaseBreakNext} />
        )}

        {phase === 'moon_context' && (
          <MoonContextScene key="moon_context" onNext={handleMoonContextNext} />
        )}

        {/* Moon decision scenes */}
        {MOON_DECISIONS.map((decision, idx) => (
          <React.Fragment key={decision.id}>
            {phase === `moon_d${idx}` && (
              <DecisionScene
                key={`moon_d${idx}`}
                decision={decision}
                decisionNumber={EARTH_DECISIONS.length + idx + 1}
                totalDecisions={TOTAL_DECISIONS}
                onChoose={(choiceId) => handleMoonChoice(decision.id, choiceId)}
              />
            )}
            {phase === `moon_outcome_${decision.id}` && moonChoices[decision.id] && (
              <OutcomeScene
                key={`moon_outcome_${decision.id}`}
                decision={decision}
                choiceId={moonChoices[decision.id]}
                isEarth={false}
                onNext={() => handleMoonOutcomeNext(idx + 1)}
              />
            )}
          </React.Fragment>
        ))}

        {phase === 'conclusion' && (
          <ConclusionScene
            key="conclusion"
            cadetName={cadetName}
            earthChoices={earthChoices}
            moonChoices={moonChoices}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
