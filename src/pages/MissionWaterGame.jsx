import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MissionWaterGame — Chapter 1: "Earth is running out."
 *
 * An interactive decision-based scenario where the player is dropped into
 * a city crisis and must make 5 critical water management decisions.
 *
 * Design system: matches ConradFoundation2.jsx
 *   - bg #0C0C0C, text #F0ECE6 warm bone, accent #E85D26 AOM orange
 *   - font-display-serif (Playfair Display) for scenario headlines
 *   - font-mono (JetBrains Mono) for kickers/stats
 *   - Framer Motion card transitions
 *
 * Route: /missionwater
 * Task id: 0d354c79-27cc-4c7a-b817-87be932cebf2
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

// ─── Game data ────────────────────────────────────────────────────────────────

const DECISIONS = [
  {
    id: 0,
    kicker: 'Chapter 1 · Earth Is Running Out',
    title: 'Day one.',
    subtitle: 'The reservoir hits 18%.',
    scenario:
      "Mesa Verde. Population 2.3 million. The drought is in its fourth year. Engineers estimate forty days of water remain at current usage rates. The mayor's call lasted forty-seven seconds: 'Fix it.' You are the city's water engineer. The room is silent. Everyone is waiting for you to speak.",
    choices: [
      {
        id: 'A',
        label: 'Residential first.',
        detail: 'Cut industrial and agricultural allocations by 60%. Protect the citizens.',
        delta: { water: 0, health: 2, economy: -2 },
        consequence:
          'Industry slows. Unemployment begins to climb. But the taps run. Families trust the city.',
      },
      {
        id: 'B',
        label: 'Keep the economy moving.',
        detail: 'Maintain industrial output. Implement household rationing instead.',
        delta: { water: -3, health: -1, economy: 2 },
        consequence:
          'The economy holds — for now. Rationing is unpopular. Hospitals start reporting stress cases.',
      },
      {
        id: 'C',
        label: 'Equal shares for all.',
        detail: 'Distribute cuts evenly across every sector. No one gets exactly what they need.',
        delta: { water: -1, health: 0, economy: 0 },
        consequence:
          'Everyone is frustrated. No single sector is protected. The city holds — barely. For now.',
      },
    ],
  },
  {
    id: 1,
    kicker: 'Decision 2 · Infrastructure',
    title: 'The pipes are failing.',
    subtitle: '30% of the water disappears before it reaches anyone.',
    scenario:
      'Your infrastructure team confirms it: the pipe network is ancient. Nearly a third of all water is lost underground — pressure failures, cracked joints, century-old clay. Fixing it will cost $220 million and take four months. The city council is divided. The county engineer calls it "engineering malpractice to delay any further." Every day you wait is water you cannot get back.',
    choices: [
      {
        id: 'A',
        label: 'Emergency repairs. Start now.',
        detail: 'Fund the repairs immediately. Borrow if needed. Stop the bleeding.',
        delta: { water: 5, health: 1, economy: -2 },
        consequence:
          'Work begins overnight. Pressure spikes, then steadies. The city recovers 8% of daily capacity within three weeks.',
      },
      {
        id: 'B',
        label: 'Smart meters instead.',
        detail: "Cheaper. Track usage city-wide, find leaks, change behavior. Slower payoff.",
        delta: { water: 2, health: 0, economy: -1 },
        consequence:
          'Usage data reveals pockets of massive waste. Behavior shifts in some neighborhoods. Not fast enough — but it helps.',
      },
      {
        id: 'C',
        label: 'Focus resources elsewhere.',
        detail: 'The pipes will hold another season. Bigger priorities exist.',
        delta: { water: -3, health: -1, economy: 1 },
        consequence:
          'Two major bursts within the week. Forty million gallons lost into the desert floor. The city is furious.',
      },
    ],
  },
  {
    id: 2,
    kicker: 'Decision 3 · Agriculture',
    title: 'The farms.',
    subtitle: 'Agriculture consumes 70% of the region\'s water.',
    scenario:
      'Farming families have worked this valley for generations. Almonds. Cotton. Alfalfa — water-intensive crops in a water-starved land. The state wants mandatory cutbacks. Farmers call it a death sentence for their livelihoods. Scientists say it is the only path to a functioning city. Both groups are right. You have to choose anyway.',
    choices: [
      {
        id: 'A',
        label: 'Mandate 40% farm reductions.',
        detail: "It will hurt. But the math doesn't work any other way.",
        delta: { water: 5, health: 1, economy: -3 },
        consequence:
          'Protests outside City Hall. Three farms file for bankruptcy. But the reservoir rises for the first time in two years.',
      },
      {
        id: 'B',
        label: 'Incentivize drought-resistant crops.',
        detail: 'Subsidize the transition. Make adaptation worth it for farmers.',
        delta: { water: 3, health: 1, economy: -1 },
        consequence:
          'Adoption is slow but real. Three major operations convert. The regional food system begins — slowly — to shift.',
      },
      {
        id: 'C',
        label: 'Agriculture stays untouched.',
        detail: 'The food supply matters too. Find the water somewhere else.',
        delta: { water: -4, health: 0, economy: 2 },
        consequence:
          'Farmers are relieved. Water usage climbs. The reservoir drops to 11%. A federal warning arrives.',
      },
    ],
  },
  {
    id: 3,
    kicker: 'Decision 4 · Public Response',
    title: 'The public.',
    subtitle: '2.3 million people. Some are watering lawns right now.',
    scenario:
      'A study reveals voluntary conservation reduced usage by 3%. Mandatory restrictions could triple that — but enforcement requires a budget you do not have. A water pricing system could shift behavior through economics: use less, pay less; use more, pay dramatically more. The city is watching what you do. They want a signal.',
    choices: [
      {
        id: 'A',
        label: 'Mandatory restrictions. Enforce them.',
        detail: 'Issue city-wide water use limits. Fine violators. Make it real.',
        delta: { water: 4, health: -1, economy: 0 },
        consequence:
          'Compliance reaches 71%. Tension in city council. Conservation numbers are undeniable.',
      },
      {
        id: 'B',
        label: 'Lead with education.',
        detail: 'School programs. Block captains. Door-to-door guidance. Make it a movement.',
        delta: { water: 1, health: 2, economy: 0 },
        consequence:
          'Social change is slow. But the city feels different. Water becomes the defining conversation of the decade.',
      },
      {
        id: 'C',
        label: 'Tiered water pricing.',
        detail: 'Use less, pay less. Use more, pay much more.',
        delta: { water: 3, health: 0, economy: 1 },
        consequence:
          'Wealthy households barely notice. Lower-income families cut usage dramatically. Equity debate erupts at city hall.',
      },
    ],
  },
  {
    id: 4,
    kicker: 'Decision 5 · The Long Game',
    title: 'The final call.',
    subtitle: 'The reservoir is at a turning point.',
    scenario:
      "You've made hard calls. The city has made sacrifices. Now, a regional authority offers a one-time emergency water supply — enough to stabilize the reservoir for two years, but it will drain the emergency fund. The state is offering low-interest bonds to build a desalination plant: expensive, a three-year build, but it ends the dependency permanently. Or trust the conservation measures and hold the line without new spending.",
    choices: [
      {
        id: 'A',
        label: 'Buy the emergency supply.',
        detail: 'Use the emergency fund. Buy time. The city needs to breathe.',
        delta: { water: 8, health: 2, economy: -3 },
        consequence:
          'The reservoir climbs to safe levels. The city exhales. The emergency fund is empty — but the crisis is paused.',
      },
      {
        id: 'B',
        label: 'Commission the desalination plant.',
        detail: '$800 million. A three-year build. But Mesa Verde will never thirst again.',
        delta: { water: 2, health: 1, economy: -3 },
        consequence:
          'Ground breaks in the desert. A long road ahead. But the city has declared its future — and the world is watching.',
      },
      {
        id: 'C',
        label: 'Hold the line.',
        detail: 'The conservation work is real. Trust it. No new spending.',
        delta: { water: -1, health: 0, economy: 2 },
        consequence:
          'A gamble. The reservoir stabilizes — just barely. The city is exposed. One dry winter from the edge again.',
      },
    ],
  },
];

// ─── Outcome logic ────────────────────────────────────────────────────────────

function getOutcome(stats) {
  const { water, health, economy } = stats;

  if (water >= 28 && health >= 8 && economy >= 4) {
    return {
      grade: 'A',
      label: 'Resilient',
      title: 'The city holds.',
      subtitle: 'Mesa Verde becomes a model for water resilience.',
      body:
        "Through difficult trade-offs and long-term thinking, your decisions stabilized the city and built a foundation others can study. The crisis exposed what Mesa Verde was made of. The work is not done — but the city is proof that change is possible when it has to be.",
      color: '#22c55e',
      borderColor: 'border-green-500/30',
      bgColor: 'bg-green-500/5',
    };
  }
  if (water >= 20 || (health >= 6 && economy >= 5)) {
    return {
      grade: 'B',
      label: 'Surviving',
      title: 'The city survives.',
      subtitle: 'Some losses. Some wins. The work continues.',
      body:
        "Your decisions prevented catastrophe but left real damage. Population stress, economic strain, or water insecurity — one of these defines the next decade. The crisis revealed what matters. The next engineer inherits a harder problem but a cleaner path.",
      color: '#f59e0b',
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/5',
    };
  }
  if (water >= 10) {
    return {
      grade: 'C',
      label: 'Critical',
      title: 'The city struggles.',
      subtitle: 'Critical services are maintained. Just barely.',
      body:
        "Mesa Verde is in permanent crisis mode. Emergency declarations. Federal intervention. The decisions made here will be studied for what not to do. But the city still stands. And sometimes standing is everything.",
      color: '#ef4444',
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-500/5',
    };
  }
  return {
    grade: 'D',
    label: 'Collapse',
    title: 'The taps go dry.',
    subtitle: 'Mesa Verde is evacuated.',
    body:
      "280,000 residents leave in the first wave. The national guard arrives to manage the rest. The city that grew out of the desert has returned to it. The decisions made here will be studied by every city facing the same future — as a warning.",
    color: '#991b1b',
    borderColor: 'border-red-900/40',
    bgColor: 'bg-red-900/10',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({ label, value, max, color, icon }) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#F0ECE6]/40">
          {icon} {label}
        </span>
        <span className="font-mono text-[10px] text-[#F0ECE6]/60">{value}</span>
      </div>
      <div className="h-0.5 bg-[#F0ECE6]/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function ConsequenceBadge({ text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="border border-[#E85D26]/25 bg-[#E85D26]/5 rounded px-4 py-3 mb-8"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D26] mb-1">
        ← Consequence
      </p>
      <p className="font-body text-[14px] text-[#F0ECE6]/65 leading-relaxed italic">
        {text}
      </p>
    </motion.div>
  );
}

function ChoiceCard({ choice, onSelect, disabled }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      className={`
        w-full text-left border rounded-sm px-5 py-5 transition-colors duration-200
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${hovered ? 'border-[#E85D26]/50 bg-[#E85D26]/5' : 'border-[#F0ECE6]/10 bg-[#F0ECE6]/[0.02]'}
      `}
      onHoverStart={() => !disabled && setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => !disabled && onSelect(choice)}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`
            font-mono text-[11px] font-bold w-5 h-5 flex items-center justify-center
            rounded-sm shrink-0 mt-0.5 transition-colors duration-200
            ${hovered ? 'bg-[#E85D26] text-white' : 'bg-[#F0ECE6]/10 text-[#F0ECE6]/50'}
          `}
        >
          {choice.id}
        </span>
        <div className="min-w-0">
          <p className="font-display-serif font-semibold text-[17px] text-[#F0ECE6] leading-tight mb-1.5">
            {choice.label}
          </p>
          <p className="font-body text-[13px] text-[#F0ECE6]/50 leading-relaxed">
            {choice.detail}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const INITIAL_STATS = { water: 18, health: 7, economy: 6 };

export default function MissionWaterGame() {
  const [phase, setPhase] = useState('intro'); // 'intro' | 'game' | 'outcome'
  const [step, setStep] = useState(0);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [history, setHistory] = useState([]); // { choice, consequence, delta }
  const [choosing, setChoosing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    document.title = 'Mission Water · Chapter 1 | Conrad Foundation';
    return () => meta.remove();
  }, []);

  function handleStart() {
    setPhase('game');
    setStep(0);
    setStats(INITIAL_STATS);
    setHistory([]);
  }

  function handleRestart() {
    setPhase('intro');
    setStep(0);
    setStats(INITIAL_STATS);
    setHistory([]);
    setChoosing(false);
  }

  function handleChoice(choice) {
    if (choosing) return;
    setChoosing(true);

    const delta = choice.delta;
    const newStats = {
      water: clamp(stats.water + delta.water, 0, 50),
      health: clamp(stats.health + delta.health, 0, 10),
      economy: clamp(stats.economy + delta.economy, 0, 10),
    };

    setStats(newStats);
    setHistory((prev) => [
      ...prev,
      { choiceId: choice.id, consequence: choice.consequence, delta },
    ]);

    // Short delay before advancing — lets stats animate
    setTimeout(() => {
      if (step + 1 >= DECISIONS.length) {
        setPhase('outcome');
      } else {
        setStep((s) => s + 1);
      }
      setChoosing(false);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 500);
  }

  const decision = DECISIONS[step];
  const lastEntry = history.length > 0 ? history[history.length - 1] : null;
  const outcome = getOutcome(stats);

  return (
    <div
      ref={scrollRef}
      className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen antialiased overflow-x-hidden"
      style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
    >
      <AnimatePresence mode="wait">
        {/* ──────────────────── INTRO ──────────────────── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen flex flex-col justify-between px-6 md:px-16 pt-20 pb-16"
          >
            {/* Nav bar */}
            <div className="flex items-center justify-between mb-16">
              <a
                href="/conradfoundation2"
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F0ECE6]/30 hover:text-[#F0ECE6]/60 transition-colors"
              >
                ← Mission Water Platform
              </a>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#E85D26]/60">
                Interactive · Chapter 1
              </span>
            </div>

            {/* Hero content */}
            <div className="max-w-[800px] mx-auto w-full flex-1 flex flex-col justify-center">
              <motion.p
                className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] mb-8"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                Mission Water · Conrad Foundation
              </motion.p>

              <motion.h1
                className="font-display-serif text-[13vw] sm:text-[72px] md:text-[88px] lg:text-[104px] leading-[0.9] tracking-[-0.03em] mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                Earth is running{' '}
                <em className="font-display-italic italic text-[#E85D26]">out.</em>
              </motion.h1>

              <motion.p
                className="font-display-serif text-[18px] md:text-[22px] text-[#F0ECE6]/60 leading-[1.4] max-w-[52ch] mb-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.6 }}
              >
                You are the water engineer for Mesa Verde. Population 2.3 million.
                Reservoir at{' '}
                <em className="font-display-italic italic text-[#F0ECE6]/80">18%.</em>
              </motion.p>

              <motion.p
                className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/40 leading-relaxed max-w-[45ch] mb-14"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.34, duration: 0.6 }}
              >
                Five decisions stand between the city and collapse. There are no easy choices here.
                Only consequences.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42, duration: 0.5 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <button
                  onClick={handleStart}
                  className="group inline-flex items-center gap-3 bg-[#E85D26] text-white font-mono text-[11px] uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[#FF6B2B] transition-colors duration-200"
                >
                  Begin Chapter 1
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </button>
                <a
                  href="/conradfoundation2"
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#F0ECE6]/30 hover:text-[#F0ECE6]/60 transition-colors py-4"
                >
                  View the full platform pitch
                </a>
              </motion.div>
            </div>

            {/* Scenario stats preview */}
            <motion.div
              className="mt-16 pt-8 border-t border-[#F0ECE6]/[0.06]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              <div className="grid grid-cols-3 gap-6 max-w-[500px]">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/30 mb-1">
                    Water Reserve
                  </p>
                  <p className="font-display-serif text-[28px] text-[#60a5fa]">18<span className="text-[14px] text-[#F0ECE6]/30">%</span></p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/30 mb-1">
                    Population
                  </p>
                  <p className="font-display-serif text-[28px] text-[#F0ECE6]/70">2.3<span className="text-[14px] text-[#F0ECE6]/30">M</span></p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/30 mb-1">
                    Days Remaining
                  </p>
                  <p className="font-display-serif text-[28px] text-[#ef4444]">40</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ──────────────────── GAME ──────────────────── */}
        {phase === 'game' && (
          <motion.div
            key={`game-${step}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-screen flex flex-col px-6 md:px-16 pt-10 pb-16"
          >
            {/* Top bar: back link + progress + stats */}
            <div className="mb-10">
              {/* Back + step */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleRestart}
                  className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/25 hover:text-[#F0ECE6]/50 transition-colors"
                >
                  ← Restart
                </button>
                <div className="flex items-center gap-1.5">
                  {DECISIONS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-0.5 rounded-full transition-colors duration-300 ${
                        i < step
                          ? 'bg-[#E85D26]/60'
                          : i === step
                          ? 'bg-[#E85D26]'
                          : 'bg-[#F0ECE6]/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-[#F0ECE6]/25 uppercase tracking-[0.15em]">
                  {step + 1} / {DECISIONS.length}
                </span>
              </div>

              {/* Stats bars */}
              <div className="flex gap-6 max-w-[640px]">
                <StatBar
                  label="Water"
                  value={stats.water}
                  max={50}
                  color="#60a5fa"
                  icon="◈"
                />
                <StatBar
                  label="Health"
                  value={stats.health}
                  max={10}
                  color="#4ade80"
                  icon="◉"
                />
                <StatBar
                  label="Economy"
                  value={stats.economy}
                  max={10}
                  color="#fbbf24"
                  icon="◆"
                />
              </div>
            </div>

            {/* Consequence from previous choice */}
            {lastEntry && <ConsequenceBadge text={lastEntry.consequence} />}

            {/* Scenario card */}
            <div className="flex-1 max-w-[800px] w-full">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] mb-5">
                {decision.kicker}
              </p>

              <h2 className="font-display-serif text-[10vw] sm:text-[52px] md:text-[64px] leading-[0.92] tracking-[-0.03em] mb-3">
                {decision.title}
              </h2>

              <p className="font-display-serif text-[16px] md:text-[20px] text-[#F0ECE6]/50 italic mb-7 leading-[1.3]">
                {decision.subtitle}
              </p>

              <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/60 leading-[1.7] max-w-[58ch] mb-12">
                {decision.scenario}
              </p>

              {/* Choice cards */}
              <div className="space-y-3">
                {decision.choices.map((choice) => (
                  <ChoiceCard
                    key={choice.id}
                    choice={choice}
                    onSelect={handleChoice}
                    disabled={choosing}
                  />
                ))}
              </div>

              {/* Reminder line */}
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#F0ECE6]/15 mt-8">
                Your choice changes the city's trajectory. Choose carefully.
              </p>
            </div>
          </motion.div>
        )}

        {/* ──────────────────── OUTCOME ──────────────────── */}
        {phase === 'outcome' && (
          <motion.div
            key="outcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="min-h-screen flex flex-col px-6 md:px-16 pt-16 pb-16"
          >
            {/* Final stats */}
            <div className="max-w-[800px] w-full mx-auto">
              <motion.p
                className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Chapter 1 · Complete
              </motion.p>

              {/* Grade badge */}
              <motion.div
                className={`inline-flex items-center gap-3 border ${outcome.borderColor} ${outcome.bgColor} rounded-sm px-5 py-3 mb-10`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <span
                  className="font-display-serif text-[36px] font-bold leading-none"
                  style={{ color: outcome.color }}
                >
                  {outcome.grade}
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/40">
                    City Status
                  </p>
                  <p className="font-mono text-[13px]" style={{ color: outcome.color }}>
                    {outcome.label}
                  </p>
                </div>
              </motion.div>

              {/* Outcome headline */}
              <motion.h2
                className="font-display-serif text-[9vw] sm:text-[48px] md:text-[64px] leading-[0.92] tracking-[-0.03em] mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.7 }}
              >
                {outcome.title}
              </motion.h2>

              <motion.p
                className="font-display-serif text-[16px] md:text-[20px] italic text-[#F0ECE6]/50 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.36, duration: 0.6 }}
              >
                {outcome.subtitle}
              </motion.p>

              <motion.p
                className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/60 leading-[1.75] max-w-[58ch] mb-14"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.44, duration: 0.6 }}
              >
                {outcome.body}
              </motion.p>

              {/* Final stats grid */}
              <motion.div
                className="grid grid-cols-3 gap-px border border-[#F0ECE6]/[0.06] rounded-sm overflow-hidden mb-14"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52, duration: 0.6 }}
              >
                {[
                  { label: 'Water Reserve', value: `${stats.water}%`, color: '#60a5fa' },
                  { label: 'Population Health', value: `${stats.health}/10`, color: '#4ade80' },
                  { label: 'Economy', value: `${stats.economy}/10`, color: '#fbbf24' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-[#F0ECE6]/[0.02] px-5 py-6 text-center"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/30 mb-2">
                      {s.label}
                    </p>
                    <p
                      className="font-display-serif text-[28px] leading-none"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </motion.div>

              {/* Decision log */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mb-14"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F0ECE6]/25 mb-5">
                  Your decisions
                </p>
                <div className="space-y-3">
                  {history.map((entry, i) => {
                    const dec = DECISIONS[i];
                    const choice = dec.choices.find((c) => c.id === entry.choiceId);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-4 border-l-2 border-[#E85D26]/20 pl-4 py-1"
                      >
                        <span className="font-mono text-[10px] text-[#F0ECE6]/25 mt-0.5 shrink-0">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#F0ECE6]/30 mb-0.5">
                            {dec.title.replace(/\.$/, '')}
                          </p>
                          <p className="font-body text-[13px] text-[#F0ECE6]/60">
                            {choice?.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* CTA row */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 pb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.68, duration: 0.6 }}
              >
                <button
                  onClick={handleRestart}
                  className="group inline-flex items-center gap-3 bg-[#E85D26] text-white font-mono text-[11px] uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-[#FF6B2B] transition-colors duration-200"
                >
                  Try again
                  <span className="group-hover:translate-x-1 transition-transform duration-200">↺</span>
                </button>
                <a
                  href="/conradfoundation2"
                  className="group inline-flex items-center gap-3 border border-[#F0ECE6]/15 text-[#F0ECE6]/50 font-mono text-[11px] uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:border-[#F0ECE6]/30 hover:text-[#F0ECE6]/70 transition-colors duration-200"
                >
                  View the platform pitch
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </a>
              </motion.div>

              {/* Footer note */}
              <div className="border-t border-[#F0ECE6]/[0.06] pt-8">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/20">
                  Conrad Foundation · Mission Water · Interactive Chapter 1 prototype
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
