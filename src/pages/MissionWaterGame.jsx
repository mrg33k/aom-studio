import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MissionWaterGame — Chapter 1: "Earth Is Running Out."
 *
 * Branching narrative prototype: cadet investigates one of three regional
 * water crises (Phoenix / Mumbai / São Paulo), makes a strategic recommendation,
 * earns Discovery badges, then converges at the Mission Council for a reveal
 * connecting Earth's water crisis to the Moon (Chapter 2 teaser).
 *
 * Design system: matches ConradFoundation2.jsx
 *   bg #080810 deep space, text #F0ECE6 warm bone, AOM orange #E85D26,
 *   data blue #3B82F6. Framer Motion scene transitions.
 *
 * Routes: /MissionWaterGame and /mission-water-game (also /missionwater legacy).
 * Task id: 58f26be2-a44f-48e0-bd48-19f093e19147
 */

// ─── Game data ────────────────────────────────────────────────────────────────

const BRANCHES = {
  phoenix: {
    id: 'phoenix',
    title: 'Phoenix, Arizona',
    subtitle: 'Aquifer Emergency',
    coordinates: '33.4484° N, 112.0740° W',
    accentColor: '#E85D26',
    hook: 'A river that should be flowing is bone-dry. The aquifer beneath is collapsing.',
    arrival: `You land outside Phoenix at 0600 hours. Desert air is already 102°F.\n\nYour contact, Dr. Sarah Mendez, meets you at a dry riverbed that was flowing six months ago. She hands you a ground-penetrating radar readout. The numbers are worse than the reports suggested.`,
    crisisHeadline: 'The Ogallala Aquifer is disappearing.',
    crisisText: `The largest underground freshwater source in North America is being consumed 8x faster than rainfall can replenish it. It took 10,000 years to fill. At current withdrawal rates, it reaches critical depletion within 25 years — and cities, farms, and 2 million households collapse with it.`,
    data: [
      { label: 'Annual depth loss', value: '3.2 ft/year', status: 'critical' },
      { label: 'Withdrawal vs. recharge rate', value: '8× faster', status: 'critical' },
      { label: 'Years to critical level', value: '< 25 years', status: 'warning' },
      { label: 'Population dependent', value: '2.3 million', status: 'neutral' },
    ],
    scienceBadge: 'Groundwater Hydrology',
    scienceNote: 'Aquifers are underground rock layers saturated with water. Fossil aquifers formed over thousands of years during wetter climates. Once depleted, they cannot be meaningfully recharged on human timescales — making them non-renewable resources.',
    choiceQuestion: 'The regional water board needs your recommendation. Two viable interventions are on the table:',
    choices: [
      { id: 'a', label: 'Emergency Conservation Mandate', description: 'Reduce agricultural water usage 40% through mandatory rationing and precision smart-irrigation technology.', icon: '📊' },
      { id: 'b', label: 'Managed Aquifer Recharge (MAR)', description: 'Inject treated stormwater and reclaimed water back into the aquifer using a network of deep injection wells.', icon: '💉' },
    ],
    outcomes: {
      a: {
        headline: 'Conservation holds.',
        text: `Precision drip irrigation and soil moisture sensors cut farm water use by 43%. Phoenix's water table stabilizes — but agricultural output drops 28%, straining food supply chains across the Southwest.\n\nYou've bought time. But not a solution. Demand management can slow depletion; it cannot reverse it alone.`,
        discovery: 'Conservation engineering slows the loss but cannot reverse it. Behavioral change + technology must work together — and even together, they only buy time unless supply is also addressed.',
        badge: 'Demand-Side Water Management',
      },
      b: {
        headline: 'The injection wells are working.',
        text: `Stormwater capture and wastewater reclamation begins refilling the aquifer at 3× the natural recharge rate. The water table rises 0.8 feet in year one.\n\nBut treated water requires energy. Energy generation requires cooling water. The cycle reveals itself: solving water requires solving energy. They are the same problem.`,
        discovery: 'Managed Aquifer Recharge proves human-engineered water cycles can mimic natural ones — but the energy cost creates a new dependency. Water and energy infrastructure are inseparable.',
        badge: 'Aquifer Recharge Technology',
      },
    },
  },
  mumbai: {
    id: 'mumbai',
    title: 'Mumbai, India',
    subtitle: 'Chemical Contamination Crisis',
    coordinates: '19.0760° N, 72.8777° E',
    accentColor: '#A855F7',
    hook: 'The river runs the color of rust. The contamination has reached the drinking water.',
    arrival: `You arrive at the Ulhas River estuary at the end of monsoon season. The water should be clear after four months of rain.\n\nInstead, it runs the color of rust. Researcher Priya Sharma hands you a field testing kit without a word. The readings come back in 90 seconds. You stare at the screen.`,
    crisisHeadline: 'Forever chemicals. Everywhere.',
    crisisText: `PFAS — per- and polyfluoroalkyl substances — from electronics manufacturing have saturated 47km of river. They don't break down. They accumulate in fish, enter the drinking water, and reach 4 million households. Safe exposure limits were exceeded years ago. No one knew.`,
    data: [
      { label: 'PFAS concentration detected', value: '840 ppt (limit: 70 ppt)', status: 'critical' },
      { label: 'River length contaminated', value: '47 km', status: 'critical' },
      { label: 'Bioaccumulation in local fish', value: '3,400× above water levels', status: 'warning' },
      { label: 'Households drinking this water', value: '4.2 million', status: 'neutral' },
    ],
    scienceBadge: 'Environmental Chemistry',
    scienceNote: 'PFAS compounds contain carbon-fluorine bonds — among the strongest in chemistry. They resist heat, water, and biological breakdown, earning the name "forever chemicals." They travel through soil into groundwater, accumulate up the food chain, and persist in human tissue for years.',
    choiceQuestion: 'Two intervention strategies are ready for deployment. The decision affects 4 million people immediately:',
    choices: [
      { id: 'a', label: 'Source Containment Protocol', description: 'Mandate zero-discharge manufacturing with closed-loop production lines and establish a 2km industrial buffer zone around waterways.', icon: '🏭' },
      { id: 'b', label: 'Advanced Filtration Network', description: 'Deploy granular activated carbon and reverse osmosis filters at 200 community water access points across the contamination zone.', icon: '🔬' },
    ],
    outcomes: {
      a: {
        headline: 'The source is cut.',
        text: `Closed-loop manufacturing eliminates new PFAS discharge. River concentrations begin dropping — slowly. Very slowly.\n\nExisting contamination in riverbed sediment will continue leaching chemicals for 15-20 years. Preventing new harm is necessary. But it cannot undo the legacy. Both source control and remediation are required.`,
        discovery: 'Source control prevents future harm but cannot address existing contamination. Environmental recovery requires two parallel tracks: stopping the input and cleaning what is already there.',
        badge: 'Industrial Water Law',
      },
      b: {
        headline: 'The filters catch what the river cannot.',
        text: `Granular activated carbon removes 94% of PFAS at point-of-use. The water reaching households tests safe within 60 days.\n\nBut the saturated filters are now solid waste — packed with concentrated forever chemicals. Safe water was produced. A new disposal crisis begins. The contamination didn't disappear. It moved.`,
        discovery: 'Filtration treats the symptom, not the cause. Every contaminant removed from water must go somewhere — revealing that pollution is never destroyed, only relocated.',
        badge: 'Water Treatment Engineering',
      },
    },
  },
  saopaulo: {
    id: 'saopaulo',
    title: 'São Paulo, Brazil',
    subtitle: 'Climate-Driven Water Crisis',
    coordinates: '23.5505° S, 46.6333° W',
    accentColor: '#10B981',
    hook: 'A reservoir for 9 million people has dropped to 8%. The rain pattern has shifted.',
    arrival: `The Cantareira reservoir once supplied 9 million people. You are standing at what used to be the waterline — 12 meters above you.\n\nClimate scientist Dr. Lucas Ferreira points at the horizon. "La Niña moved the rain north. Four years ago. It hasn't come back. And the models say it won't."`,
    crisisHeadline: 'The rain went somewhere else.',
    crisisText: `Shifts in Pacific Ocean temperatures have redirected the atmospheric rivers that São Paulo depends on. Four years of drought. The Cantareira system is at 8% capacity. Climate models show this pattern becoming semi-permanent by 2050 — not an anomaly, but the new baseline.`,
    data: [
      { label: 'Cantareira reservoir level', value: '8% capacity', status: 'critical' },
      { label: 'Rainfall deficit (4-year average)', value: '43% below historical', status: 'critical' },
      { label: 'Population without reliable water', value: '9.1 million', status: 'neutral' },
      { label: 'Probability of permanent shift by 2050', value: '67%', status: 'warning' },
    ],
    scienceBadge: 'Climate Hydrology',
    scienceNote: 'La Niña is a periodic cooling of Pacific Ocean surface temperatures that alters global wind and rainfall patterns. As climate change warms the baseline ocean temperature, La Niña and El Niño cycles intensify — making the rainfall that billions depend on increasingly unpredictable.',
    choiceQuestion: 'The São Paulo water authority needs a strategy deployable within 18 months. Two options have cleared engineering review:',
    choices: [
      { id: 'a', label: 'Atmospheric Water Intervention', description: 'Deploy cloud seeding aircraft using silver iodide particles to stimulate rainfall formation over the watershed catchment area.', icon: '☁️' },
      { id: 'b', label: 'Inter-Basin Water Transfer', description: 'Construct 340km of pipeline infrastructure to divert water from the Paraná River system directly to the Cantareira reservoirs.', icon: '🔧' },
    ],
    outcomes: {
      a: {
        headline: 'The clouds respond — partially.',
        text: `Cloud seeding increases local rainfall by 11-16% when conditions are favorable. In years 1-2, the program adds approximately 180 billion liters to the watershed.\n\nBut La Niña means fewer clouds to seed. The intervention works at the margins, not at scale. It buys weeks, not seasons. Weather modification supplements natural systems. It cannot replace them.`,
        discovery: 'Atmospheric interventions require the right conditions to function. They can enhance what nature provides but cannot manufacture what nature has withdrawn. Adaptation requires working with climate patterns, not against them.',
        badge: 'Atmospheric Science',
      },
      b: {
        headline: 'Water crosses a continent.',
        text: `The pipeline delivers 31 cubic meters per second from the Paraná system. Cantareira stabilizes at 40% within 18 months. The immediate crisis is resolved.\n\nBut downstream ecosystems dependent on Paraná water flow show signs of stress within six months. Water was moved. The problem moved with it — upstream solved, downstream destabilized.`,
        discovery: 'Hydraulic infrastructure can redistribute water across regions but displaces ecological stress to the source basin. Every large-scale water solution creates a new system boundary to manage.',
        badge: 'Hydraulic Engineering',
      },
    },
  },
};

// ─── Animation helpers ────────────────────────────────────────────────────────

const sceneTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

const statusColor = (status) => {
  if (status === 'critical') return '#EF4444';
  if (status === 'warning') return '#F59E0B';
  return '#F0ECE6';
};

// ─── Reusable subcomponents ───────────────────────────────────────────────────

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

function Badge({ label, accent = '#E85D26' }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center gap-2 border rounded-full px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em]"
      style={{
        borderColor: `${accent}55`,
        background: `${accent}10`,
        color: '#F0ECE6',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
      {label}
    </motion.span>
  );
}

function PrimaryButton({ children, onClick, disabled = false, accent = '#E85D26' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-mono text-[11px] uppercase tracking-[0.22em] px-6 py-3.5 rounded-full border transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        borderColor: disabled ? '#F0ECE655' : accent,
        background: disabled ? 'transparent' : accent,
        color: disabled ? '#F0ECE655' : '#0B0B12',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </button>
  );
}

function HUD({ phase, branch, discoveriesCount }) {
  const hidden = phase === 'intro' || phase === 'briefing';
  if (hidden) return null;

  let location = 'Mission Council';
  if (branch && BRANCHES[branch] && phase.startsWith(branch)) {
    location = BRANCHES[branch].title;
  } else if (phase === 'choose_region') {
    location = 'Mission Selection';
  } else if (phase === 'revelation' || phase === 'chapter2_teaser') {
    location = 'Council Chamber';
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b"
      style={{ background: 'rgba(8,8,16,0.75)', borderColor: '#F0ECE61A' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-3 text-[10px] md:text-[11px]">
        <div className="font-mono uppercase tracking-[0.22em] text-[#E85D26]">
          Mission Water · CH.1
        </div>
        <div className="font-mono uppercase tracking-[0.18em] text-[#F0ECE6]/60 hidden sm:block truncate">
          {location}
        </div>
        <div className="font-mono uppercase tracking-[0.22em] text-[#F0ECE6]/80">
          {discoveriesCount} {discoveriesCount === 1 ? 'discovery' : 'discoveries'}
        </div>
      </div>
    </div>
  );
}

// ─── Scene components ─────────────────────────────────────────────────────────

function IntroScene({ onBegin }) {
  return (
    <motion.div
      key="intro"
      {...sceneTransition}
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
    >
      {/* Starfield-ish backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[#F0ECE6]"
            style={{
              top: `${(i * 53) % 100}%`,
              left: `${(i * 71) % 100}%`,
              width: `${(i % 3) + 1}px`,
              height: `${(i % 3) + 1}px`,
              opacity: ((i % 5) + 1) * 0.08,
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(232,93,38,0.07) 0%, rgba(8,8,16,0) 60%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[900px]">
        <Kicker className="mb-8">Conrad Foundation · A prototype</Kicker>
        <h1 className="font-display-serif text-[18vw] md:text-[140px] leading-[0.88] tracking-[-0.04em] mb-8">
          Mission{' '}
          <em className="font-display-italic italic font-medium text-[#E85D26]">Water.</em>
        </h1>
        <p className="font-display-serif text-[20px] md:text-[28px] text-[#F0ECE6]/75 leading-[1.25] tracking-[-0.015em] mb-4 max-w-[36ch] mx-auto">
          The future of water starts with a choice.
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#E85D26] mb-14">
          Chapter 1 — Earth Is Running Out
        </p>
        <PrimaryButton onClick={onBegin}>Begin Mission</PrimaryButton>
      </div>
    </motion.div>
  );
}

function BriefingScene({ cadetName, setCadetName, onAccept }) {
  const valid = cadetName.trim().length >= 2;
  return (
    <motion.div
      key="briefing"
      {...sceneTransition}
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16"
    >
      <div className="max-w-[760px] w-full">
        <div
          className="border rounded-2xl p-8 md:p-12"
          style={{ borderColor: '#F0ECE61A', background: 'rgba(15,15,24,0.6)' }}
        >
          <Kicker className="mb-3">Mission Water Council · Cadet Intake</Kicker>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mb-10">
            Date: June 2047
          </div>

          <h2 className="font-display-serif text-[36px] md:text-[56px] leading-[0.95] tracking-[-0.025em] mb-8">
            Three water crises.{' '}
            <em className="font-display-italic italic text-[#E85D26]">Three regions.</em>{' '}
            One team.
          </h2>

          <p className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/70 leading-[1.65] mb-12 max-w-[58ch]">
            You are being assigned to investigate. Your findings will determine the next mission directive. Every cadet's discoveries become part of the council's understanding of what's happening to Earth's water.
          </p>

          <label className="block">
            <Kicker className="mb-3">Cadet identifier</Kicker>
            <input
              type="text"
              value={cadetName}
              onChange={(e) => setCadetName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-transparent border-b font-display-serif text-[28px] md:text-[36px] text-[#F0ECE6] focus:outline-none pb-3 placeholder:text-[#F0ECE6]/25"
              style={{ borderColor: '#F0ECE640' }}
              maxLength={36}
            />
          </label>

          <div className="mt-12">
            <PrimaryButton onClick={onAccept} disabled={!valid}>
              Accept Mission
            </PrimaryButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ChooseRegionScene({ cadetName, onChoose }) {
  return (
    <motion.div key="choose_region" {...sceneTransition} className="min-h-screen px-6 pt-28 pb-16">
      <div className="max-w-[1180px] mx-auto">
        <div className="mb-14 max-w-[720px]">
          <Kicker className="mb-3">Cadet {cadetName} · Region assignment</Kicker>
          <h2 className="font-display-serif text-[40px] md:text-[64px] leading-[0.95] tracking-[-0.025em]">
            Pick your{' '}
            <em className="font-display-italic italic text-[#E85D26]">investigation.</em>
          </h2>
          <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/55 mt-5 leading-[1.6] max-w-[52ch]">
            Three teams are deploying simultaneously. Three different crises. Your route is yours to choose.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.values(BRANCHES).map((b) => (
            <button
              key={b.id}
              onClick={() => onChoose(b.id)}
              className="text-left border rounded-2xl p-7 md:p-8 transition-all duration-300 group"
              style={{ borderColor: '#F0ECE61A', background: 'rgba(15,15,24,0.5)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = b.accentColor;
                e.currentTarget.style.background = 'rgba(20,20,30,0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#F0ECE61A';
                e.currentTarget.style.background = 'rgba(15,15,24,0.5)';
              }}
            >
              <Kicker color={b.accentColor} className="mb-4">
                {b.subtitle}
              </Kicker>
              <h3 className="font-display-serif text-[28px] md:text-[34px] leading-[1.02] tracking-[-0.02em] mb-5">
                {b.title}
              </h3>
              <p className="font-body text-[14.5px] text-[#F0ECE6]/70 leading-[1.55] mb-6 min-h-[4.5em]">
                {b.hook}
              </p>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#F0ECE6]/40 mb-5">
                {b.coordinates}
              </div>
              <div
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors"
                style={{ color: b.accentColor }}
              >
                Investigate <span aria-hidden>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ArrivalScene({ branch, onNext }) {
  return (
    <motion.div
      key={`${branch.id}_arrival`}
      {...sceneTransition}
      className="min-h-screen px-6 pt-28 pb-16 flex flex-col justify-center"
    >
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-12 md:gap-16 items-start">
          <div>
            <Kicker color={branch.accentColor} className="mb-4">
              Arrival
            </Kicker>
            <h2 className="font-display-serif text-[40px] md:text-[60px] leading-[0.95] tracking-[-0.025em] mb-6">
              {branch.title}
            </h2>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mb-2">
              {branch.subtitle}
            </div>
            <div className="font-mono text-[10.5px] tracking-[0.18em] text-[#F0ECE6]/35">
              {branch.coordinates}
            </div>
          </div>

          <div>
            {branch.arrival.split('\n\n').map((para, i) => (
              <p
                key={i}
                className="font-display-italic italic text-[19px] md:text-[22px] leading-[1.55] text-[#F0ECE6]/80 mb-6 max-w-[52ch]"
              >
                {para}
              </p>
            ))}
            <div className="mt-10">
              <PrimaryButton onClick={onNext} accent={branch.accentColor}>
                Assess the situation
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DiscoveryScene({ branch, onNext }) {
  return (
    <motion.div
      key={`${branch.id}_discovery`}
      {...sceneTransition}
      className="min-h-screen px-6 pt-28 pb-20"
    >
      <div className="max-w-[1080px] mx-auto">
        <Kicker color={branch.accentColor} className="mb-4">
          Field Data · {branch.title}
        </Kicker>
        <h2 className="font-display-serif text-[40px] md:text-[64px] leading-[0.95] tracking-[-0.025em] mb-6">
          {branch.crisisHeadline}
        </h2>
        <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 leading-[1.65] mb-12 max-w-[64ch]">
          {branch.crisisText}
        </p>

        {/* Data terminal */}
        <div
          className="border rounded-2xl overflow-hidden mb-12"
          style={{ borderColor: '#3B82F633', background: 'rgba(12,18,30,0.6)' }}
        >
          <div
            className="px-5 md:px-7 py-3 border-b flex items-center justify-between"
            style={{ borderColor: '#3B82F622', background: 'rgba(59,130,246,0.06)' }}
          >
            <Kicker color="#3B82F6">Telemetry</Kicker>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#3B82F6]/70">
              LIVE
            </span>
          </div>
          {branch.data.map((row, i) => (
            <div
              key={i}
              className="px-5 md:px-7 py-4 grid grid-cols-[1fr_auto] items-center gap-4 border-b last:border-b-0"
              style={{ borderColor: '#3B82F61A' }}
            >
              <div className="font-body text-[13.5px] md:text-[14.5px] text-[#F0ECE6]/75">
                {row.label}
              </div>
              <div
                className="font-mono text-[13px] md:text-[14px] tracking-[0.04em] tabular-nums"
                style={{ color: statusColor(row.status) }}
              >
                {row.value}
              </div>
            </div>
          ))}
        </div>

        {/* Discovery unlocked */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-10"
        >
          <Kicker color={branch.accentColor} className="mb-4">
            Discovery unlocked
          </Kicker>
          <Badge label={branch.scienceBadge} accent={branch.accentColor} />
        </motion.div>

        <div
          className="border rounded-2xl p-6 md:p-8 mb-12"
          style={{ borderColor: '#F0ECE61A', background: 'rgba(15,15,24,0.5)' }}
        >
          <Kicker className="mb-3">The science</Kicker>
          <p className="font-body text-[15px] md:text-[16.5px] text-[#F0ECE6]/80 leading-[1.65]">
            {branch.scienceNote}
          </p>
        </div>

        <PrimaryButton onClick={onNext} accent={branch.accentColor}>
          Make your recommendation
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

function ChoiceScene({ branch, onChoose }) {
  return (
    <motion.div
      key={`${branch.id}_choice`}
      {...sceneTransition}
      className="min-h-screen px-6 pt-28 pb-16"
    >
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-[760px] mb-12">
          <Kicker color={branch.accentColor} className="mb-4">
            Cadet decision · {branch.title}
          </Kicker>
          <h2 className="font-display-serif text-[34px] md:text-[52px] leading-[1.0] tracking-[-0.025em] mb-6">
            Which path do you{' '}
            <em className="font-display-italic italic text-[#E85D26]">recommend?</em>
          </h2>
          <p className="font-body text-[15px] md:text-[16.5px] text-[#F0ECE6]/70 leading-[1.6]">
            {branch.choiceQuestion}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {branch.choices.map((c) => (
            <button
              key={c.id}
              onClick={() => onChoose(c.id)}
              className="text-left border rounded-2xl p-7 md:p-9 transition-all duration-300"
              style={{ borderColor: '#F0ECE61A', background: 'rgba(15,15,24,0.5)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#E85D26';
                e.currentTarget.style.background = 'rgba(232,93,38,0.07)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#F0ECE61A';
                e.currentTarget.style.background = 'rgba(15,15,24,0.5)';
              }}
            >
              <div className="text-[32px] mb-5">{c.icon}</div>
              <h3 className="font-display-serif text-[26px] md:text-[30px] leading-[1.05] tracking-[-0.02em] mb-4">
                {c.label}
              </h3>
              <p className="font-body text-[14.5px] text-[#F0ECE6]/70 leading-[1.6] mb-7">
                {c.description}
              </p>
              <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26]">
                Choose this approach <span aria-hidden>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OutcomeScene({ branch, choiceId, onNext }) {
  const outcome = branch.outcomes[choiceId];
  return (
    <motion.div
      key={`${branch.id}_outcome`}
      {...sceneTransition}
      className="min-h-screen px-6 pt-28 pb-20"
    >
      <div className="max-w-[1000px] mx-auto">
        <Kicker color={branch.accentColor} className="mb-4">
          Outcome
        </Kicker>
        <h2 className="font-display-serif text-[40px] md:text-[64px] leading-[0.95] tracking-[-0.025em] mb-10">
          {outcome.headline}
        </h2>
        {outcome.text.split('\n\n').map((para, i) => (
          <p
            key={i}
            className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/80 leading-[1.7] mb-6 max-w-[64ch]"
          >
            {para}
          </p>
        ))}

        {/* Discovery insight */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="border-l-2 pl-6 md:pl-8 py-3 my-12"
          style={{ borderColor: '#E85D26' }}
        >
          <Kicker className="mb-3">Discovery</Kicker>
          <p className="font-display-serif text-[20px] md:text-[24px] italic font-medium text-[#F0ECE6]/90 leading-[1.4] tracking-[-0.015em] max-w-[58ch]">
            {outcome.discovery}
          </p>
        </motion.div>

        <div className="mb-12">
          <Kicker className="mb-4">Badge earned</Kicker>
          <Badge label={outcome.badge} accent="#E85D26" />
        </div>

        <PrimaryButton onClick={onNext}>Return to Mission Council</PrimaryButton>
      </div>
    </motion.div>
  );
}

function CouncilScene({ cadetName, branch, discoveries, onNext }) {
  return (
    <motion.div
      key="council"
      {...sceneTransition}
      className="min-h-screen px-6 pt-28 pb-16 flex flex-col justify-center"
    >
      <div className="max-w-[1000px] mx-auto w-full">
        <Kicker className="mb-4">Mission Water Council · Cadet Debrief</Kicker>
        <h2 className="font-display-serif text-[40px] md:text-[64px] leading-[0.95] tracking-[-0.025em] mb-8">
          Welcome back,{' '}
          <em className="font-display-italic italic text-[#E85D26]">{cadetName}.</em>
        </h2>
        <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/80 leading-[1.7] mb-12 max-w-[60ch]">
          You've uncovered the {branch.subtitle.toLowerCase()} in {branch.title}. But you're not the only cadet out there. Three teams. Three different crises. And we've found something that connects them all.
        </p>

        <div className="mb-14">
          <Kicker className="mb-5">Your discoveries</Kicker>
          <div className="flex flex-wrap gap-3">
            {discoveries.map((d, i) => (
              <Badge key={i} label={d} accent={branch.accentColor} />
            ))}
          </div>
        </div>

        <div className="border-t pt-10" style={{ borderColor: '#F0ECE61A' }}>
          <p className="font-display-italic italic text-[18px] md:text-[22px] text-[#F0ECE6]/65 leading-[1.55] mb-10 max-w-[58ch]">
            The other teams are reporting in. What we've put together is something nobody expected.
          </p>
          <PrimaryButton onClick={onNext}>See what we found</PrimaryButton>
        </div>
      </div>
    </motion.div>
  );
}

function RevelationScene({ lastDiscoveryText, onNext }) {
  return (
    <motion.div key="revelation" {...sceneTransition} className="min-h-screen px-6 pt-28 pb-20">
      <div className="max-w-[1000px] mx-auto">
        <Kicker className="mb-5">The connection</Kicker>

        <p className="font-display-serif text-[26px] md:text-[36px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6]/85 mb-8 max-w-[28ch]">
          What you found on Earth...
        </p>

        <div className="border-l-2 pl-6 md:pl-8 py-3 my-10" style={{ borderColor: '#E85D26' }}>
          <p className="font-display-serif italic text-[19px] md:text-[22px] text-[#F0ECE6]/85 leading-[1.5] max-w-[58ch]">
            {lastDiscoveryText}
          </p>
        </div>

        <p className="font-display-serif text-[26px] md:text-[36px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6]/85 mb-12 max-w-[36ch]">
          ...mirrors what we found{' '}
          <em className="font-display-italic italic text-[#E85D26]">somewhere else.</em>
        </p>

        {/* Lunar data card */}
        <div
          className="border rounded-2xl p-7 md:p-10 mb-14"
          style={{ borderColor: '#3B82F633', background: 'rgba(12,18,30,0.7)' }}
        >
          <Kicker color="#3B82F6" className="mb-4">
            Lunar South Pole · Confirmed
          </Kicker>
          <h3 className="font-display-serif text-[28px] md:text-[40px] leading-[1.0] tracking-[-0.02em] mb-6">
            Water ice.{' '}
            <em className="font-display-italic italic text-[#3B82F6]">600 million metric tons.</em>
          </h3>
          <p className="font-body text-[15px] md:text-[16.5px] text-[#F0ECE6]/75 leading-[1.65] max-w-[60ch] mb-6">
            Permanently shadowed craters at the lunar south pole. Frozen since before life on Earth. The same distribution problem you investigated: water in the wrong place, in the wrong state.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-7">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#3B82F6]/70 mb-1.5">
                Temperature
              </div>
              <div className="font-mono text-[15px] tabular-nums text-[#F0ECE6]/90">−230 °C</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#3B82F6]/70 mb-1.5">
                Confirmed by
              </div>
              <div className="font-mono text-[15px] tabular-nums text-[#F0ECE6]/90">
                LCROSS · 2009
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#3B82F6]/70 mb-1.5">
                Accessible state
              </div>
              <div className="font-mono text-[15px] tabular-nums text-[#F0ECE6]/90">Ice crystals</div>
            </div>
          </div>
        </div>

        <p className="font-display-serif text-[22px] md:text-[28px] leading-[1.3] tracking-[-0.02em] text-[#F0ECE6]/85 mb-14 max-w-[42ch]">
          Earth's water crisis isn't just about Earth. The same forces that trap water on the Moon are teaching us how to{' '}
          <em className="font-display-italic italic text-[#E85D26]">free it.</em> That's why Mission Water looks up.
        </p>

        {/* Pete Conrad quote */}
        <div
          className="border rounded-2xl p-7 md:p-9 mb-14"
          style={{ borderColor: '#E85D2633', background: 'rgba(232,93,38,0.05)' }}
        >
          <Kicker className="mb-4">In memoriam</Kicker>
          <p className="font-display-serif italic text-[22px] md:text-[28px] leading-[1.35] text-[#F0ECE6]/90 tracking-[-0.015em] mb-5">
            "If you can't be good, be colorful."
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#E85D26] mb-5">
            Pete Conrad · Apollo 12 Commander
          </p>
          <p className="font-body text-[14.5px] text-[#F0ECE6]/65 leading-[1.65] max-w-[56ch]">
            He believed anyone could reach the stars. This mission exists because of that belief.
          </p>
        </div>

        <PrimaryButton onClick={onNext}>See what's next</PrimaryButton>
      </div>
    </motion.div>
  );
}

function Chapter2TeaserScene({ cadetName, discoveries, branchAccent }) {
  const mailto = `mailto:hello@aom-inhouse.com?subject=${encodeURIComponent(
    `Mission Water — ${cadetName} Discovery Report`
  )}&body=${encodeURIComponent(
    `Cadet: ${cadetName}\n\nDiscoveries unlocked:\n${discoveries
      .map((d) => `· ${d}`)
      .join('\n')}\n\nReady for Chapter 2.`
  )}`;

  return (
    <motion.div
      key="chapter2_teaser"
      {...sceneTransition}
      className="min-h-screen px-6 pt-28 pb-20"
    >
      <div className="max-w-[1000px] mx-auto">
        <Kicker className="mb-5">Chapter 1 Complete</Kicker>
        <h2 className="font-display-serif text-[48px] md:text-[80px] leading-[0.9] tracking-[-0.03em] mb-10">
          The Moon holds{' '}
          <em className="font-display-italic italic text-[#E85D26]">the answer.</em>
        </h2>

        <div className="border-l-2 pl-6 md:pl-8 py-3 my-10" style={{ borderColor: branchAccent }}>
          <p className="font-display-italic italic text-[19px] md:text-[24px] text-[#F0ECE6]/80 leading-[1.5] max-w-[58ch]">
            Destination: Lunar South Pole. Objective: Extract water from permanently shadowed craters at −230 °C. Mission brief uploading...
          </p>
        </div>

        <div
          className="border rounded-2xl p-7 md:p-9 my-12"
          style={{ borderColor: '#F0ECE61A', background: 'rgba(15,15,24,0.5)' }}
        >
          <Kicker className="mb-2">Cadet</Kicker>
          <p className="font-display-serif text-[28px] md:text-[36px] mb-8 tracking-[-0.02em]">
            {cadetName}
          </p>
          <Kicker className="mb-4">Discoveries earned</Kicker>
          <div className="flex flex-wrap gap-3">
            {discoveries.map((d, i) => (
              <Badge key={i} label={d} accent={branchAccent} />
            ))}
          </div>
        </div>

        <div className="mb-12">
          <a
            href={mailto}
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] px-6 py-3.5 rounded-full border transition-all duration-300"
            style={{ borderColor: '#E85D26', background: '#E85D26', color: '#0B0B12' }}
          >
            Share your results
          </a>
        </div>

        <p className="font-body text-[13px] text-[#F0ECE6]/45 leading-[1.6] max-w-[58ch]">
          This is a prototype of the Mission Water Platform, developed for the Conrad Foundation by{' '}
          <a
            href="https://aheadofmarket.com"
            className="underline decoration-[#F0ECE6]/30 hover:text-[#F0ECE6]/70 transition-colors"
          >
            Ahead of Market
          </a>
          .
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MissionWaterGame() {
  const [phase, setPhase] = useState('intro');
  const [branch, setBranch] = useState(null);
  const [branchChoice, setBranchChoice] = useState(null);
  const [discoveries, setDiscoveries] = useState([]);
  const [cadetName, setCadetName] = useState('');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    document.title = 'Mission Water · Chapter 1 | Conrad Foundation';
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [phase]);

  const currentBranch = branch ? BRANCHES[branch] : null;
  const currentOutcome =
    currentBranch && branchChoice ? currentBranch.outcomes[branchChoice] : null;
  const branchAccent = currentBranch ? currentBranch.accentColor : '#E85D26';

  const beginMission = () => setPhase('briefing');
  const acceptMission = () => setPhase('choose_region');

  const chooseRegion = (regionId) => {
    setBranch(regionId);
    setPhase(`${regionId}_arrival`);
  };

  const toDiscovery = () => {
    const b = BRANCHES[branch];
    setDiscoveries((prev) =>
      prev.includes(b.scienceBadge) ? prev : [...prev, b.scienceBadge]
    );
    setPhase(`${branch}_discovery`);
  };

  const toChoice = () => setPhase(`${branch}_choice`);

  const makeChoice = (choiceId) => {
    setBranchChoice(choiceId);
    const outcomeBadge = BRANCHES[branch].outcomes[choiceId].badge;
    setDiscoveries((prev) =>
      prev.includes(outcomeBadge) ? prev : [...prev, outcomeBadge]
    );
    setPhase(`${branch}_outcome`);
  };

  const toCouncil = () => setPhase('council');
  const toRevelation = () => setPhase('revelation');
  const toChapter2 = () => setPhase('chapter2_teaser');

  return (
    <div
      className="min-h-screen antialiased relative"
      style={{
        background: '#080810',
        color: '#F0ECE6',
        fontFeatureSettings: '"liga" 1, "kern" 1',
      }}
    >
      <HUD phase={phase} branch={branch} discoveriesCount={discoveries.length} />

      <AnimatePresence mode="wait">
        {phase === 'intro' && <IntroScene key="intro" onBegin={beginMission} />}

        {phase === 'briefing' && (
          <BriefingScene
            key="briefing"
            cadetName={cadetName}
            setCadetName={setCadetName}
            onAccept={acceptMission}
          />
        )}

        {phase === 'choose_region' && (
          <ChooseRegionScene
            key="choose_region"
            cadetName={cadetName}
            onChoose={chooseRegion}
          />
        )}

        {currentBranch && phase === `${branch}_arrival` && (
          <ArrivalScene
            key={`${branch}_arrival`}
            branch={currentBranch}
            onNext={toDiscovery}
          />
        )}

        {currentBranch && phase === `${branch}_discovery` && (
          <DiscoveryScene
            key={`${branch}_discovery`}
            branch={currentBranch}
            onNext={toChoice}
          />
        )}

        {currentBranch && phase === `${branch}_choice` && (
          <ChoiceScene
            key={`${branch}_choice`}
            branch={currentBranch}
            onChoose={makeChoice}
          />
        )}

        {currentBranch && phase === `${branch}_outcome` && branchChoice && (
          <OutcomeScene
            key={`${branch}_outcome`}
            branch={currentBranch}
            choiceId={branchChoice}
            onNext={toCouncil}
          />
        )}

        {phase === 'council' && currentBranch && (
          <CouncilScene
            key="council"
            cadetName={cadetName}
            branch={currentBranch}
            discoveries={discoveries}
            onNext={toRevelation}
          />
        )}

        {phase === 'revelation' && currentOutcome && (
          <RevelationScene
            key="revelation"
            lastDiscoveryText={currentOutcome.discovery}
            onNext={toChapter2}
          />
        )}

        {phase === 'chapter2_teaser' && (
          <Chapter2TeaserScene
            key="chapter2_teaser"
            cadetName={cadetName}
            discoveries={discoveries}
            branchAccent={branchAccent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
