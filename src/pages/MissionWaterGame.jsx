import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MissionWaterGame — Three-chapter arc: Earth → Journey → Moon.
 *
 * Chapter 1 (Earth): 2 decisions — water allocation & infrastructure
 * Chapter 2 (Journey): 3 decisions — sick crew, electrolysis, tank leak
 * Chapter 3 (Moon): 3 decisions — crater, extraction, return
 *
 * Opens: "You have 30 years of water left. What do you do?"
 * Closes: "The mission to the Moon wasn't about space. It was always about water."
 *
 * Design system:
 *   Chapter 1: #0C0C0C bg, #E85D26 orange — warm, dusty Earth urgency
 *   Chapter 2: #070810 bg, #A78BFA violet — cold, dark, infinite spacecraft
 *   Chapter 3: #0C0C0C bg, #3B82F6 blue — stark lunar grey, ice glinting
 *
 * Route: /missionwater  (also /MissionWaterGame, /mission-water-game)
 * Task id: 28477cee-a056-4e5f-96b5-8359f0de0a75
 */

// ─── Game content ─────────────────────────────────────────────────────────────

const EARTH_DECISIONS = [
  {
    id: 'water_allocation',
    chapter: 'earth',
    kicker: 'Decision 1 of 8 — Water Allocation',
    headline: 'There is not enough water for everyone.',
    subtext:
      "A city of 4 million. A reservoir at 18% capacity. A drought that's entering its third year. You are the water engineer. The board is waiting. You have 72 hours to submit your allocation framework.",
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
        text: 'Drinking water stays stable. 40 liters per person per day. But farm water usage drops 60%, triggering a food import crisis. Supply chains strain. Three major industrial employers shut operations within a year. The city survives. The regional economy does not.',
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
    chapter: 'earth',
    kicker: 'Decision 2 of 8 — Infrastructure',
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

const JOURNEY_DECISIONS = [
  {
    id: 'sick_crew',
    chapter: 'journey',
    kicker: 'Decision 3 of 8 — Medical Crisis',
    headline: 'Day 12. A crew member is sick.',
    subtext:
      "Mission Commander Reyes wakes with a fever of 39.8°C and signs of dehydration. The ship's medical protocol calls for IV hydration — 2 liters a day for 4–5 days. That's 10 liters against reserves at 74% nominal. You are the mission resource officer. The choice is yours.",
    question: 'Water for treatment, or strict ration for all?',
    choices: [
      {
        id: 'treat',
        label: 'Authorize full treatment',
        description:
          "Follow the medical protocol. IV fluids, full hydration support for 5 days. Commander Reyes has 22 more days of mission ahead. You don't leave crew members under-resourced.",
        icon: '🩺',
      },
      {
        id: 'ration',
        label: 'Minimal treatment, maintain rations',
        description:
          'Oral hydration only. The mission cannot afford the reserves drain. If the commander worsens, reassess. Until then, the mission calculus holds.',
        icon: '⚖',
      },
    ],
    outcomes: {
      treat: {
        headline: 'The commander recovers. The reserves drop.',
        text: "IV treatment works. Reyes is back on rotation in 4 days. But reserves drop to 68% of nominal. The next 18 days you'll be running lean on everything — shorter showers, no excess for cooking, strict hygiene protocols. The crew follows orders. Nobody complains. They understand what's at stake.",
        insight:
          'On a spacecraft, every decision about water is also a decision about who gets to stay mission-capable. Medical protocols written on Earth look different inside a sealed container.',
      },
      ration: {
        headline: 'A hard call. The right one mathematically.',
        text: "Oral hydration holds. Reyes runs mild symptoms for six days instead of four, but recovers fully. The strict rationing was defensible. The math said it was correct. But watching the commander work through a fever on half-rations while you control the water supply felt different than the spreadsheet suggested it would.",
        insight:
          'Rationing decisions made in training feel clean. Made in real time, they carry weight. Systems designed for scarcity should account for the human cost of enforcing them.',
      },
    },
  },
  {
    id: 'electrolysis',
    chapter: 'journey',
    kicker: 'Decision 4 of 8 — Oxygen vs. Drinking',
    headline: 'Day 19. The oxygen generator needs water.',
    subtext:
      "The electrolysis system splits water into hydrogen and oxygen — it's how the crew breathes. A partial blockage in the primary cell has cut efficiency by 31%. To compensate and maintain safe O₂ levels, the system needs an additional 4.2 liters per day pulled from drinking reserves. Backup oxygen canisters can supplement — but there are only 6 left, and 11 days to go.",
    question: 'How do you split the water?',
    choices: [
      {
        id: 'oxygen_first',
        label: 'Prioritize electrolysis',
        description:
          'Pull from drinking reserves to keep O₂ at nominal. Drinking rations drop to 1.8L/person/day — below the 2L minimum standard. Tight but survivable.',
        icon: '💨',
      },
      {
        id: 'drinking_first',
        label: 'Protect drinking reserves',
        description:
          "Use backup oxygen canisters to supplement. Drinking stays at 2.4L/person/day. You're burning the canisters faster than planned. If another problem surfaces, you're exposed.",
        icon: '🫙',
      },
    ],
    outcomes: {
      oxygen_first: {
        headline: 'O₂ holds. Rations drop. Everyone manages.',
        text: "Electrolysis runs at target. O₂ stays nominal. The crew runs at 1.8L/person/day for 11 days — below standard, but manageable. Day 27, a sensor malfunction triggers a false low-O₂ alarm. The crew handles it with calm precision. When they get to the Moon, the first thing everyone does is drink an extra cup of water.",
        insight:
          'The ISS recycles 93% of all water — urine, sweat, condensation — back into drinking water. This isn\'t a design choice for elegance. It\'s the only viable approach when resupply is impossible. Every closed system eventually faces this arithmetic.',
      },
      drinking_first: {
        headline: 'Canisters deploy. Drinking stays stable. One fails.',
        text: "Backup canisters supplement O₂ for 8 days. Drinking reserves hold at 2.4L. Then on day 26, a canister seal fails — partial release into the crew quarters. No injury, but the O₂ spike triggers a mandatory 4-hour lock-down protocol. One canister wasted. You still have enough. But the margin is gone.",
        insight:
          "Backup systems exist for the moments when primary systems can't hold. They're not meant to run continuously. Using a backup under sustained load changes the probability math on everything that comes after.",
      },
    },
  },
  {
    id: 'tank_leak',
    chapter: 'journey',
    kicker: 'Decision 5 of 8 — Tank Failure',
    headline: 'Day 24. A water tank is leaking.',
    subtext:
      "Water tank 3 of 6 has a seam failure — slow leak, detected early. It holds 3,200 liters. Current loss rate: 28 liters per hour. You have two options. Note: water tanks on this ship double as radiation shielding around the crew quarters. Losing tank 3 increases crew exposure by 14% for the remainder of the mission.",
    question: 'Repair or redistribute?',
    choices: [
      {
        id: 'repair',
        label: 'Repair the tank',
        description:
          'Two crew into the utility bay. Patch kit from the repair locker. Estimated 6-hour repair window. If the patch holds, you lose maybe 170 liters. If it fails mid-repair, you could lose the tank faster.',
        icon: '🔩',
      },
      {
        id: 'redistribute',
        label: 'Redistribute and push forward',
        description:
          'Transfer contents to tanks 4, 5, and 6 using the emergency pump system. Estimated 2.5 hours, 900-liter loss during transfer. Accept the radiation exposure increase for 7 days and move on.',
        icon: '⟳',
      },
    ],
    outcomes: {
      repair: {
        headline: 'The patch holds. 9 hours later.',
        text: "Repair takes 9 hours instead of 6. The seam is more degraded than the initial scan suggested. The patch holds at 99.4% integrity — crew estimates it will last the mission. You lose 252 liters to the utility bay floor before it's sealed. But you saved 2,948 liters, kept radiation shielding intact, and got a first-hand assessment of the tank's actual condition.",
        insight:
          "The water tanks on the ISS and all long-duration spacecraft serve double duty — structural and shielding. Water is uniquely suited to absorb cosmic radiation. When you think about water as a resource, you're also thinking about protection. They're the same thing.",
      },
      redistribute: {
        headline: 'Transfer complete. 800 liters lost. Radiation up 14%.',
        text: "Emergency pump transfer takes 2.8 hours. You lose 840 liters during transfer — slightly more than modeled, because the seam widened under pump pressure. The remaining tanks are at 112% capacity, within structural limits. Mission continues on schedule. The radiation exposure increase is within acceptable range for a 7-day window. The efficiency of the decision is measurable. The cost is abstract until someone checks the dosimeters.",
        insight:
          "Fast decisions preserve momentum. Slower decisions sometimes preserve more. The mission timeline is real. The radiation exposure is real. Both are data. The weight you give them is judgment.",
      },
    },
  },
];

const MOON_DECISIONS = [
  {
    id: 'crater',
    chapter: 'moon',
    kicker: 'Decision 6 of 8 — Site Selection',
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
    chapter: 'moon',
    kicker: 'Decision 7 of 8 — Extraction Method',
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
    chapter: 'moon',
    kicker: 'Decision 8 of 8 — Return',
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

// Chapter accent colors
const CHAPTER_ACCENT = {
  earth: '#E85D26',
  journey: '#A78BFA',
  moon: '#3B82F6',
};

const TOTAL_DECISIONS = EARTH_DECISIONS.length + JOURNEY_DECISIONS.length + MOON_DECISIONS.length;

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

function PrimaryBtn({ children, onClick, accent = '#E85D26' }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="font-mono text-[11px] uppercase tracking-[0.24em] px-7 py-3.5 rounded-full border transition-all duration-300"
      style={{
        borderColor: accent,
        background: hover ? '#F0ECE6' : accent,
        color: '#0C0C0C',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {children}
    </button>
  );
}

// ─── HUD bar ──────────────────────────────────────────────────────────────────

function HUD({ chapter, decisionIndex, totalDecisions, cadetName }) {
  const hidden = chapter === 'intro' || chapter === 'briefing';
  if (hidden) return null;

  const isEarth = chapter === 'earth';
  const isJourney = chapter === 'journey';
  const isMoon = chapter === 'moon';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-md"
      style={{ background: 'rgba(7,8,16,0.85)', borderColor: '#F0ECE61A' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.24em] text-[#E85D26]">
          Mission Water
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {[
            { label: 'Ch.1 Earth', key: 'earth', color: '#E85D26' },
            { label: '→', key: 'arrow1', color: null },
            { label: 'Ch.2 Journey', key: 'journey', color: '#A78BFA' },
            { label: '→', key: 'arrow2', color: null },
            { label: 'Ch.3 Moon', key: 'moon', color: '#3B82F6' },
          ].map((item) => {
            if (!item.color) return (
              <span key={item.key} className="font-mono text-[9px] text-[#F0ECE6]/20">→</span>
            );
            const active = chapter === item.key;
            return (
              <span
                key={item.key}
                className="font-mono text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border transition-all duration-500"
                style={{
                  borderColor: active ? `${item.color}66` : '#F0ECE61A',
                  color: active ? item.color : '#F0ECE6',
                  opacity: active ? 1 : 0.3,
                  background: active ? `${item.color}12` : 'transparent',
                }}
              >
                {item.label}
              </span>
            );
          })}
        </div>
        <div className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-[#F0ECE6]/50">
          {cadetName && <span className="mr-2">{cadetName}</span>}
          {totalDecisions > 0 && (
            <span className="text-[#F0ECE6]/30">
              {decisionIndex + 1}/{totalDecisions}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Intro & Briefing ─────────────────────────────────────────────────────────

function IntroScene({ onBegin }) {
  return (
    <motion.div
      key="intro"
      {...scene}
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 100 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              top: `${(i * 47) % 100}%`,
              left: `${(i * 73) % 100}%`,
              width: `${(i % 3) + 1}px`,
              height: `${(i % 3) + 1}px`,
              background: i % 9 === 0 ? '#A78BFA' : i % 7 === 0 ? '#3B82F6' : '#F0ECE6',
              opacity: ((i % 6) + 1) * 0.04,
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,93,38,0.05) 0%, rgba(7,8,16,0) 70%)',
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
          className="font-display-serif text-[17px] md:text-[22px] text-[#F0ECE6]/40 leading-[1.3] tracking-[-0.02em] mb-3 max-w-[44ch] mx-auto"
        >
          Getting there requires water too.
        </motion.p>
        <motion.p
          {...fadeIn(0.3)}
          className="font-display-serif text-[15px] md:text-[19px] text-[#F0ECE6]/30 leading-[1.3] tracking-[-0.02em] mb-14 max-w-[48ch] mx-auto"
        >
          The answer was always somewhere unexpected.
        </motion.p>
        <motion.div {...fadeIn(0.4)}>
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
          style={{ borderColor: '#F0ECE61A', background: 'rgba(18,18,24,0.7)' }}
        >
          <Kicker className="mb-3">Mission Brief · 2047</Kicker>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/35 mb-10">
            Global Water Security Council — 3 Chapters
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
            className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/60 leading-[1.7] mb-6 max-w-[60ch]"
          >
            Three chapters. Eight decisions. You will manage the water crisis on Earth, survive the journey through space, and extract water from the Moon.
          </motion.p>
          <motion.p
            {...fadeIn(0.4)}
            className="font-body text-[14px] text-[#F0ECE6]/40 leading-[1.6] mb-12 max-w-[60ch]"
          >
            There are no perfect answers. Only tradeoffs.
          </motion.p>

          <motion.div {...fadeIn(0.5)}>
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

// ─── Chapter 1: Earth ─────────────────────────────────────────────────────────

function EarthContextScene({ onNext }) {
  return (
    <motion.div
      key="earth_context"
      {...scene}
      className="min-h-screen px-6 pt-28 pb-20 flex flex-col justify-center"
    >
      <div className="max-w-[1100px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker className="mb-3">Chapter 1 of 3</Kicker>
          <Kicker className="mb-8" color="#F0ECE6/40">Earth: "We're running out"</Kicker>
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
              style={{ borderColor: '#E85D2620', background: 'rgba(232,93,38,0.03)' }}
            >
              <Kicker className="mb-4">The numbers</Kicker>
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
                            : '#F0ECE6',
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

function EarthCrisisScene({ choices, onNext }) {
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
            { label: choices.water_allocation, desc: 'Your allocation framework held.', num: 1 },
            { label: choices.infrastructure, desc: 'Your infrastructure decision added years.', num: 2 },
          ].map((item, i) => (
            <motion.div
              key={i}
              {...fadeIn(0.2 + i * 0.1)}
              className="border rounded-xl p-6"
              style={{ borderColor: '#F0ECE61A', background: 'rgba(18,18,18,0.5)' }}
            >
              <Kicker className="mb-2">Decision {item.num}</Kicker>
              <p className="font-display-serif text-[18px] md:text-[22px] leading-[1.2] tracking-[-0.015em] mb-2">
                {item.label}
              </p>
              <p className="font-body text-[13px] text-[#F0ECE6]/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          {...fadeIn(0.4)}
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
          {...fadeIn(0.5)}
          className="font-display-serif italic text-[18px] md:text-[22px] text-[#F0ECE6]/55 leading-[1.5] mb-14 max-w-[58ch]"
        >
          There is one more option. It's been in the briefings for three years. Nobody has wanted to say it out loud. The water is on the Moon. Getting there requires a spacecraft. And a spacecraft needs water too.
        </motion.p>

        <motion.div {...fadeIn(0.6)}>
          <PrimaryBtn onClick={onNext}>Board the spacecraft</PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Chapter break: Earth → Journey ──────────────────────────────────────────

function Chapter2BreakScene({ onNext }) {
  return (
    <motion.div
      key="chapter2_break"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#070810' }}
    >
      {/* deep space background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 80%, rgba(167,139,250,0.08) 0%, rgba(7,8,16,0) 65%)',
        }}
      />
      {/* stars — more density, colder */}
      {Array.from({ length: 140 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${(i * 37) % 100}%`,
            left: `${(i * 61) % 100}%`,
            width: `${(i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1)}px`,
            height: `${(i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1)}px`,
            background: i % 13 === 0 ? '#A78BFA' : i % 11 === 0 ? '#3B82F6' : '#F0ECE6',
            opacity: ((i % 8) + 1) * 0.055,
            borderRadius: '50%',
          }}
        />
      ))}

      {/* top line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 h-px origin-left"
        style={{ background: 'linear-gradient(90deg, #A78BFA00 0%, #A78BFA 50%, #A78BFA00 100%)' }}
      />

      <div className="relative z-10 text-center px-6 max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Kicker color="#A78BFA" className="mb-8">
            Chapter 2 of 3
          </Kicker>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/25 mb-8">
            En Route to Lunar South Pole · Day 1 of 29
          </p>
          <h2 className="font-display-serif text-[14vw] md:text-[116px] leading-[0.86] tracking-[-0.045em] mb-8">
            The{' '}
            <em className="font-display-italic italic" style={{ color: '#A78BFA' }}>
              Journey.
            </em>
          </h2>
          <p className="font-display-serif italic text-[18px] md:text-[24px] text-[#F0ECE6]/50 leading-[1.45] mb-6 max-w-[50ch] mx-auto">
            Getting there requires water too.
          </p>
          <p className="font-body text-[14px] text-[#F0ECE6]/35 leading-[1.7] mb-16 max-w-[52ch] mx-auto">
            The spacecraft carries 18,000 liters. No resupply. No margin. Every system — drinking, oxygen generation, fuel, radiation shielding — depends on it.
          </p>
          <PrimaryBtn onClick={onNext} accent="#A78BFA">
            Begin Chapter 2
          </PrimaryBtn>
        </motion.div>
      </div>

      {/* bottom line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px origin-right"
        style={{ background: 'linear-gradient(90deg, #A78BFA00 0%, #A78BFA 50%, #A78BFA00 100%)' }}
      />
    </motion.div>
  );
}

function JourneyContextScene({ onNext }) {
  return (
    <motion.div
      key="journey_context"
      {...scene}
      className="min-h-screen px-6 pt-28 pb-24 flex flex-col justify-center"
      style={{ background: '#070810' }}
    >
      <div className="max-w-[1100px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker color="#A78BFA" className="mb-3">
            What we already know
          </Kicker>
          <Kicker color="#F0ECE6/30" className="mb-10">
            Water in space — the facts
          </Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[44px] md:text-[76px] leading-[0.9] tracking-[-0.04em] mb-10"
        >
          In space, water{' '}
          <em className="font-display-italic italic" style={{ color: '#A78BFA' }}>
            does everything.
          </em>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {[
            {
              kicker: 'Water Recycling',
              title: '93% recovery rate',
              text: "The ISS recycles 93% of all water aboard — urine, sweat, condensation from breath — back into drinking water. This isn't an elegance choice. Without it, resupply missions every few weeks would be required. In deep space, there is no resupply.",
            },
            {
              kicker: 'Electrolysis',
              title: 'Water becomes oxygen',
              text: 'Water split via electrolysis produces hydrogen and oxygen. The oxygen is what the crew breathes. The hydrogen can be used as fuel. Every liter of water is simultaneously drinking water, air supply, and potential propellant.',
            },
            {
              kicker: 'Radiation Shielding',
              title: 'Water absorbs radiation',
              text: "Water tanks placed strategically around crew quarters absorb cosmic radiation — hydrogen atoms in water are uniquely effective at this. On a 29-day journey, the crew's water supply literally surrounds them as a shield.",
            },
            {
              kicker: 'The constraint',
              title: 'No resupply',
              text: 'Once past Earth orbit, the spacecraft carries everything it needs. Every drop of water consumed is calculated against the mission timeline. Loss, contamination, or equipment failure changes the math for everything downstream.',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              {...fadeIn(0.2 + i * 0.08)}
              className="border rounded-2xl p-6 md:p-8"
              style={{ borderColor: '#A78BFA22', background: 'rgba(167,139,250,0.04)' }}
            >
              <Kicker color="#A78BFA" className="mb-2">
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
          className="font-display-serif italic text-[18px] md:text-[22px] text-[#F0ECE6]/50 leading-[1.5] mb-14 max-w-[58ch]"
        >
          Three crises will emerge on the 29-day journey. Three decisions. The same resource that's running out on Earth is the only thing keeping you alive in space.
        </motion.p>

        <motion.div {...fadeIn(0.65)}>
          <PrimaryBtn onClick={onNext} accent="#A78BFA">
            Enter Day 12
          </PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

function JourneyArrivalScene({ choices, onNext }) {
  return (
    <motion.div
      key="journey_arrival"
      {...scene}
      className="min-h-screen px-6 pt-28 pb-24"
      style={{ background: '#070810' }}
    >
      <div className="max-w-[1060px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker color="#A78BFA" className="mb-6">Day 29 · Lunar Orbit Achieved</Kicker>
        </motion.div>
        <motion.h2
          {...fadeIn(0.1)}
          className="font-display-serif text-[44px] md:text-[76px] leading-[0.9] tracking-[-0.035em] mb-10"
        >
          The crew{' '}
          <em className="font-display-italic italic" style={{ color: '#A78BFA' }}>
            made it.
          </em>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            { id: 'sick_crew', label: choices.sick_crew, desc: 'Medical crisis resolved.', num: 3 },
            { id: 'electrolysis', label: choices.electrolysis, desc: 'Oxygen maintained.', num: 4 },
            { id: 'tank_leak', label: choices.tank_leak, desc: 'Water reserves secured.', num: 5 },
          ].map((item, i) => (
            <motion.div
              key={i}
              {...fadeIn(0.2 + i * 0.1)}
              className="border rounded-xl p-5"
              style={{ borderColor: '#A78BFA1A', background: 'rgba(167,139,250,0.04)' }}
            >
              <Kicker color="#A78BFA" className="mb-2">Decision {item.num}</Kicker>
              <p className="font-display-serif text-[16px] md:text-[19px] leading-[1.2] tracking-[-0.015em] mb-2">
                {item.label}
              </p>
              <p className="font-body text-[12px] text-[#F0ECE6]/40">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          {...fadeIn(0.45)}
          className="font-body text-[16px] md:text-[19px] text-[#F0ECE6]/75 leading-[1.75] mb-6 max-w-[66ch]"
        >
          Every decision held. The spacecraft is in lunar orbit. The south pole is 94 kilometers below.
        </motion.p>

        <motion.div
          {...fadeIn(0.55)}
          className="border rounded-2xl p-7 md:p-10 mb-14"
          style={{ borderColor: '#A78BFA33', background: 'rgba(167,139,250,0.05)' }}
        >
          <Kicker color="#A78BFA" className="mb-4">
            But the water problem followed you here
          </Kicker>
          <p className="font-display-serif text-[22px] md:text-[28px] leading-[1.3] tracking-[-0.02em] text-[#F0ECE6]/90">
            The mission to reach the Moon required water every step of the way. Drinking. Breathing. Shielding. The resource you came to find is also the reason you survived long enough to look for it.
          </p>
        </motion.div>

        <motion.p
          {...fadeIn(0.65)}
          className="font-display-serif italic text-[17px] md:text-[21px] text-[#F0ECE6]/45 leading-[1.5] mb-14 max-w-[55ch]"
        >
          Three decisions remain. The lunar south pole is waiting.
        </motion.p>

        <motion.div {...fadeIn(0.75)}>
          <PrimaryBtn onClick={onNext} accent="#3B82F6">
            Descend to the Moon
          </PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Chapter break: Journey → Moon ────────────────────────────────────────────

function Chapter3BreakScene({ onNext }) {
  return (
    <motion.div
      key="chapter3_break"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#080A0C' }}
    >
      {/* lunar atmosphere gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(59,130,246,0.1) 0%, rgba(8,10,12,0) 60%)',
        }}
      />
      {/* sparse stars — we're close to the Moon now */}
      {Array.from({ length: 80 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${(i * 43) % 100}%`,
            left: `${(i * 67) % 100}%`,
            width: `${(i % 4 === 0 ? 2 : 1)}px`,
            height: `${(i % 4 === 0 ? 2 : 1)}px`,
            background: '#F0ECE6',
            opacity: ((i % 7) + 1) * 0.05,
            borderRadius: '50%',
          }}
        />
      ))}
      {/* crater texture hint at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[30vh]"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.06) 60%, rgba(20,24,32,0.3) 100%)',
        }}
      />

      {/* top line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 h-px origin-left"
        style={{ background: 'linear-gradient(90deg, #3B82F600 0%, #3B82F6 50%, #3B82F600 100%)' }}
      />

      <div className="relative z-10 text-center px-6 max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Kicker color="#3B82F6" className="mb-8">
            Chapter 3 of 3
          </Kicker>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/25 mb-8">
            Lunar South Pole · Permanently Shadowed Region · −230°C
          </p>
          <h2 className="font-display-serif text-[14vw] md:text-[116px] leading-[0.86] tracking-[-0.045em] mb-8">
            The{' '}
            <em className="font-display-italic italic" style={{ color: '#3B82F6' }}>
              Moon.
            </em>
          </h2>
          <p className="font-display-serif italic text-[18px] md:text-[24px] text-[#F0ECE6]/50 leading-[1.45] mb-6 max-w-[50ch] mx-auto">
            The answer was always here.
          </p>
          <p className="font-body text-[14px] text-[#F0ECE6]/30 leading-[1.7] mb-16 max-w-[52ch] mx-auto">
            600 million metric tons of water ice. Frozen since before life existed on Earth. In permanent shadow. Waiting.
          </p>
          <PrimaryBtn onClick={onNext} accent="#3B82F6">
            Begin Chapter 3
          </PrimaryBtn>
        </motion.div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
              title: 'A distribution problem, solved',
              text: "Earth's water crisis is a distribution problem: water exists, but not where it's needed. The Moon's water is the same problem in reverse. The science of moving water is the science of solving both.",
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

// ─── Shared Decision / Outcome scenes ─────────────────────────────────────────

function DecisionScene({ decision, onChoose }) {
  const accent = CHAPTER_ACCENT[decision.chapter] || '#E85D26';
  const bg = decision.chapter === 'journey' ? '#070810' : '#0C0C0C';
  return (
    <motion.div
      key={decision.id}
      {...scene}
      className="min-h-screen px-6 pt-28 pb-20"
      style={{ background: bg }}
    >
      <div className="max-w-[1180px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker color={accent} className="mb-5">{decision.kicker}</Kicker>
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
          style={{ borderColor: `${accent}60` }}
        >
          <p className="font-display-serif text-[20px] md:text-[26px] text-[#F0ECE6] leading-[1.35] tracking-[-0.015em]">
            {decision.question}
          </p>
        </motion.div>

        <div className={`grid grid-cols-1 gap-5 ${decision.choices.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
          {decision.choices.map((choice, i) => (
            <motion.button
              key={choice.id}
              {...fadeIn(0.35 + i * 0.08)}
              onClick={() => onChoose(choice.id)}
              className="text-left border rounded-2xl p-7 md:p-8 transition-all duration-300 cursor-pointer"
              style={{ borderColor: '#F0ECE61A', background: 'rgba(18,18,18,0.6)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.background = `${accent}10`;
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
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-5" style={{ color: `${accent}99` }}>
                  {choice.detail}
                </p>
              )}
              <div
                className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em]"
                style={{ color: accent }}
              >
                Choose this <span aria-hidden>→</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OutcomeScene({ decision, choiceId, onNext }) {
  const outcome = decision.outcomes[choiceId];
  const choice = decision.choices.find((c) => c.id === choiceId);
  const accent = CHAPTER_ACCENT[decision.chapter] || '#E85D26';
  const bg = decision.chapter === 'journey' ? '#070810' : '#0C0C0C';
  return (
    <motion.div
      key={`outcome_${decision.id}`}
      {...scene}
      className="min-h-screen px-6 pt-28 pb-24"
      style={{ background: bg }}
    >
      <div className="max-w-[1060px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker color={accent} className="mb-4">Outcome · {choice?.label}</Kicker>
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

        <motion.div
          {...fadeIn(0.35)}
          className="border-l-2 pl-6 md:pl-8 py-2 mb-14"
          style={{ borderColor: accent }}
        >
          <Kicker color={accent} className="mb-3">
            What this reveals
          </Kicker>
          <p className="font-display-serif italic text-[19px] md:text-[23px] text-[#F0ECE6]/85 leading-[1.45] tracking-[-0.015em] max-w-[60ch]">
            {outcome.insight}
          </p>
        </motion.div>

        <motion.div {...fadeIn(0.5)}>
          <PrimaryBtn onClick={onNext} accent={accent}>
            Continue
          </PrimaryBtn>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Conclusion ───────────────────────────────────────────────────────────────

function ConclusionScene({ cadetName, earthChoices, journeyChoices, moonChoices }) {
  const allChoices = { ...earthChoices, ...journeyChoices, ...moonChoices };

  const mailto = `mailto:hello@aom-inhouse.com?subject=${encodeURIComponent(
    `Mission Water — ${cadetName}'s Decisions`
  )}&body=${encodeURIComponent(
    `Cadet: ${cadetName}\n\nChapter 1 — Earth:\n· Water allocation: ${earthChoices.water_allocation}\n· Infrastructure: ${earthChoices.infrastructure}\n\nChapter 2 — The Journey:\n· Medical crisis: ${journeyChoices.sick_crew}\n· Electrolysis: ${journeyChoices.electrolysis}\n· Tank leak: ${journeyChoices.tank_leak}\n\nChapter 3 — The Moon:\n· Crater: ${moonChoices.crater}\n· Extraction: ${moonChoices.extraction}\n· Return: ${moonChoices.return}\n\nThis was the Mission Water experience by the Conrad Foundation.`
  )}`;

  const allDecisions = [
    { chapter: 'Earth', id: 'water_allocation', label: 'Water Allocation', choices: EARTH_DECISIONS[0].choices },
    { chapter: 'Earth', id: 'infrastructure', label: 'Infrastructure', choices: EARTH_DECISIONS[1].choices },
    { chapter: 'Journey', id: 'sick_crew', label: 'Medical Crisis', choices: JOURNEY_DECISIONS[0].choices },
    { chapter: 'Journey', id: 'electrolysis', label: 'Oxygen vs. Drinking', choices: JOURNEY_DECISIONS[1].choices },
    { chapter: 'Journey', id: 'tank_leak', label: 'Tank Failure', choices: JOURNEY_DECISIONS[2].choices },
    { chapter: 'Moon', id: 'crater', label: 'Crater', choices: MOON_DECISIONS[0].choices },
    { chapter: 'Moon', id: 'extraction', label: 'Extraction Method', choices: MOON_DECISIONS[1].choices },
    { chapter: 'Moon', id: 'return', label: 'Return Method', choices: MOON_DECISIONS[2].choices },
  ];

  const chapterColor = { Earth: '#E85D26', Journey: '#A78BFA', Moon: '#3B82F6' };

  return (
    <motion.div key="conclusion" {...scene} className="min-h-screen px-6 pt-28 pb-28">
      <div className="max-w-[1060px] mx-auto">
        <motion.div {...fadeIn(0)}>
          <Kicker color="#3B82F6" className="mb-6">
            Mission Complete · 8 of 8 Decisions
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
          <Kicker className="mb-6">Your 8 decisions — Earth to Moon</Kicker>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allDecisions.map((d, i) => {
              const chosenId = allChoices[d.id];
              const chosenLabel = d.choices?.find((c) => c.id === chosenId)?.label || chosenId;
              const color = chapterColor[d.chapter];
              return (
                <div
                  key={d.id}
                  className="border rounded-xl px-5 py-4 flex items-start gap-4"
                  style={{
                    borderColor: `${color}20`,
                    background: `${color}05`,
                  }}
                >
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.22em] mt-0.5 shrink-0"
                    style={{ color }}
                  >
                    {d.chapter}
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/35 mb-1">
                      {d.label}
                    </p>
                    <p className="font-display-serif text-[16px] md:text-[17px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6]/90">
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

export default function MissionWaterGame() {
  const [phase, setPhase] = useState('intro');
  const [cadetName, setCadetName] = useState('');
  const [earthChoices, setEarthChoices] = useState({});
  const [journeyChoices, setJourneyChoices] = useState({});
  const [moonChoices, setMoonChoices] = useState({});

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    document.title = 'Mission Water — Earth · Journey · Moon | Conrad Foundation';
    return () => { meta.remove(); };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [phase]);

  // ── Determine current chapter for HUD ───────────────────────────────────
  const hudChapter = (() => {
    if (phase === 'intro' || phase === 'briefing') return 'intro';
    if (phase.startsWith('earth') || phase === 'earth_context') return 'earth';
    if (phase.startsWith('chapter2') || phase.startsWith('journey') || phase === 'journey_context' || phase === 'journey_arrival') return 'journey';
    if (phase.startsWith('chapter3') || phase.startsWith('moon') || phase === 'moon_context' || phase === 'conclusion') return 'moon';
    return 'earth';
  })();

  // Decision index for HUD progress
  let hudDecisionIdx = -1;
  let hudTotal = -1;
  if (phase.startsWith('earth_d')) {
    const idx = parseInt(phase.replace('earth_d', ''), 10);
    hudDecisionIdx = idx;
    hudTotal = TOTAL_DECISIONS;
  } else if (phase.startsWith('journey_d')) {
    const idx = parseInt(phase.replace('journey_d', ''), 10);
    hudDecisionIdx = EARTH_DECISIONS.length + idx;
    hudTotal = TOTAL_DECISIONS;
  } else if (phase.startsWith('moon_d')) {
    const idx = parseInt(phase.replace('moon_d', ''), 10);
    hudDecisionIdx = EARTH_DECISIONS.length + JOURNEY_DECISIONS.length + idx;
    hudTotal = TOTAL_DECISIONS;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleBegin = () => setPhase('briefing');
  const handleAcceptMission = () => {
    if (cadetName.trim().length >= 2) setPhase('earth_context');
  };
  const handleStartEarth = () => setPhase('earth_d0');

  const handleEarthChoice = (decisionId, choiceId) => {
    setEarthChoices((prev) => ({ ...prev, [decisionId]: choiceId }));
    setPhase(`earth_outcome_${decisionId}`);
  };
  const handleEarthOutcomeNext = (nextIdx) => {
    if (nextIdx < EARTH_DECISIONS.length) {
      setPhase(`earth_d${nextIdx}`);
    } else {
      setPhase('earth_crisis');
    }
  };
  const handleEarthCrisisNext = () => setPhase('chapter2_break');
  const handleChapter2BreakNext = () => setPhase('journey_context');
  const handleJourneyContextNext = () => setPhase('journey_d0');

  const handleJourneyChoice = (decisionId, choiceId) => {
    setJourneyChoices((prev) => ({ ...prev, [decisionId]: choiceId }));
    setPhase(`journey_outcome_${decisionId}`);
  };
  const handleJourneyOutcomeNext = (nextIdx) => {
    if (nextIdx < JOURNEY_DECISIONS.length) {
      setPhase(`journey_d${nextIdx}`);
    } else {
      setPhase('journey_arrival');
    }
  };
  const handleJourneyArrivalNext = () => setPhase('chapter3_break');
  const handleChapter3BreakNext = () => setPhase('moon_context');
  const handleMoonContextNext = () => setPhase('moon_d0');

  const handleMoonChoice = (decisionId, choiceId) => {
    setMoonChoices((prev) => ({ ...prev, [decisionId]: choiceId }));
    setPhase(`moon_outcome_${decisionId}`);
  };
  const handleMoonOutcomeNext = (nextIdx) => {
    if (nextIdx < MOON_DECISIONS.length) {
      setPhase(`moon_d${nextIdx}`);
    } else {
      setPhase('conclusion');
    }
  };

  // Derived choice labels for summary scenes
  const choiceLabels = {
    water_allocation: EARTH_DECISIONS[0]?.choices.find((c) => c.id === earthChoices.water_allocation)?.label || '',
    infrastructure: EARTH_DECISIONS[1]?.choices.find((c) => c.id === earthChoices.infrastructure)?.label || '',
    sick_crew: JOURNEY_DECISIONS[0]?.choices.find((c) => c.id === journeyChoices.sick_crew)?.label || '',
    electrolysis: JOURNEY_DECISIONS[1]?.choices.find((c) => c.id === journeyChoices.electrolysis)?.label || '',
    tank_leak: JOURNEY_DECISIONS[2]?.choices.find((c) => c.id === journeyChoices.tank_leak)?.label || '',
    crater: MOON_DECISIONS[0]?.choices.find((c) => c.id === moonChoices.crater)?.label || '',
    extraction: MOON_DECISIONS[1]?.choices.find((c) => c.id === moonChoices.extraction)?.label || '',
    return: MOON_DECISIONS[2]?.choices.find((c) => c.id === moonChoices.return)?.label || '',
  };

  const bgColor = (hudChapter === 'journey') ? '#070810' : '#0C0C0C';

  return (
    <div
      className="min-h-screen antialiased relative transition-colors duration-1000"
      style={{ background: bgColor, color: '#F0ECE6' }}
    >
      <HUD
        chapter={hudChapter}
        decisionIndex={hudDecisionIdx}
        totalDecisions={hudTotal}
        cadetName={cadetName}
      />

      <AnimatePresence mode="wait">
        {/* ── Intro & briefing ─────────────────────────────────────── */}
        {phase === 'intro' && <IntroScene key="intro" onBegin={handleBegin} />}
        {phase === 'briefing' && (
          <BriefingScene
            key="briefing"
            cadetName={cadetName}
            setCadetName={setCadetName}
            onAccept={handleAcceptMission}
          />
        )}

        {/* ── Chapter 1: Earth ────────────────────────────────────── */}
        {phase === 'earth_context' && (
          <EarthContextScene key="earth_context" onNext={handleStartEarth} />
        )}
        {EARTH_DECISIONS.map((decision, idx) => (
          <React.Fragment key={decision.id}>
            {phase === `earth_d${idx}` && (
              <DecisionScene
                key={`earth_d${idx}`}
                decision={decision}
                onChoose={(choiceId) => handleEarthChoice(decision.id, choiceId)}
              />
            )}
            {phase === `earth_outcome_${decision.id}` && earthChoices[decision.id] && (
              <OutcomeScene
                key={`earth_outcome_${decision.id}`}
                decision={decision}
                choiceId={earthChoices[decision.id]}
                onNext={() => handleEarthOutcomeNext(idx + 1)}
              />
            )}
          </React.Fragment>
        ))}
        {phase === 'earth_crisis' && (
          <EarthCrisisScene
            key="earth_crisis"
            choices={choiceLabels}
            onNext={handleEarthCrisisNext}
          />
        )}

        {/* ── Chapter break: Earth → Journey ──────────────────────── */}
        {phase === 'chapter2_break' && (
          <Chapter2BreakScene key="chapter2_break" onNext={handleChapter2BreakNext} />
        )}

        {/* ── Chapter 2: Journey ──────────────────────────────────── */}
        {phase === 'journey_context' && (
          <JourneyContextScene key="journey_context" onNext={handleJourneyContextNext} />
        )}
        {JOURNEY_DECISIONS.map((decision, idx) => (
          <React.Fragment key={decision.id}>
            {phase === `journey_d${idx}` && (
              <DecisionScene
                key={`journey_d${idx}`}
                decision={decision}
                onChoose={(choiceId) => handleJourneyChoice(decision.id, choiceId)}
              />
            )}
            {phase === `journey_outcome_${decision.id}` && journeyChoices[decision.id] && (
              <OutcomeScene
                key={`journey_outcome_${decision.id}`}
                decision={decision}
                choiceId={journeyChoices[decision.id]}
                onNext={() => handleJourneyOutcomeNext(idx + 1)}
              />
            )}
          </React.Fragment>
        ))}
        {phase === 'journey_arrival' && (
          <JourneyArrivalScene
            key="journey_arrival"
            choices={choiceLabels}
            onNext={handleJourneyArrivalNext}
          />
        )}

        {/* ── Chapter break: Journey → Moon ───────────────────────── */}
        {phase === 'chapter3_break' && (
          <Chapter3BreakScene key="chapter3_break" onNext={handleChapter3BreakNext} />
        )}

        {/* ── Chapter 3: Moon ─────────────────────────────────────── */}
        {phase === 'moon_context' && (
          <MoonContextScene key="moon_context" onNext={handleMoonContextNext} />
        )}
        {MOON_DECISIONS.map((decision, idx) => (
          <React.Fragment key={decision.id}>
            {phase === `moon_d${idx}` && (
              <DecisionScene
                key={`moon_d${idx}`}
                decision={decision}
                onChoose={(choiceId) => handleMoonChoice(decision.id, choiceId)}
              />
            )}
            {phase === `moon_outcome_${decision.id}` && moonChoices[decision.id] && (
              <OutcomeScene
                key={`moon_outcome_${decision.id}`}
                decision={decision}
                choiceId={moonChoices[decision.id]}
                onNext={() => handleMoonOutcomeNext(idx + 1)}
              />
            )}
          </React.Fragment>
        ))}

        {/* ── Conclusion ──────────────────────────────────────────── */}
        {phase === 'conclusion' && (
          <ConclusionScene
            key="conclusion"
            cadetName={cadetName}
            earthChoices={earthChoices}
            journeyChoices={journeyChoices}
            moonChoices={moonChoices}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
