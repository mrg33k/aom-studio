import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Video, Camera, Mic, Image, Clock, HardDrive, AlertTriangle, Clapperboard, Star, ChevronDown, ChevronUp } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = "Ambition Crown HVAC | Editor's Guide | AOM";
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', "Editor's guide for Ambition Mechanical Crown HVAC shoot. 73 clips, shot inventory, gap analysis, edit recommendations.");
    setMeta('og:title', "Ambition Crown HVAC | Editor's Guide", true);
    setMeta('og:description', "73 clips, 3 lav recordings. Full shot inventory and edit recommendations.", true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/guides/ambition-crown', true);
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

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-5 border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={18} className="text-aom-orange" />
        <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">{label}</span>
      </div>
      <p className="font-headline text-2xl font-bold text-aom-text-light">{value}</p>
      {sub && <p className="font-body text-sm text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

function HeroClip({ clip, duration, description }) {
  return (
    <div className="flex items-start gap-4 p-4 border border-aom-orange/20 bg-aom-orange/[0.04]">
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-aom-orange/30">
        <Star size={16} className="text-aom-orange" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-headline text-base font-bold text-aom-orange">{clip}</span>
          <span className="font-body text-sm text-aom-text-muted">{duration}</span>
        </div>
        <p className="font-body text-sm text-white/60 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ShotTable({ shots, heroClips = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/10">
            <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Clip</th>
            <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Duration</th>
            {shots[0]?.res && <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4 hidden md:table-cell">Res</th>}
            <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {shots.map((shot, i) => {
            const isHero = heroClips.includes(shot.clip);
            return (
              <tr key={i} className={`border-b border-white/5 ${isHero ? 'bg-aom-orange/[0.04]' : ''}`}>
                <td className={`font-body text-sm py-3 pr-4 ${isHero ? 'text-aom-orange font-semibold' : 'text-aom-text-light'}`}>
                  {isHero && <Star size={10} className="inline mr-1 text-aom-orange" />}
                  {shot.clip}
                </td>
                <td className="font-body text-sm text-white/50 py-3 pr-4 whitespace-nowrap">{shot.duration}</td>
                {shot.res !== undefined && <td className="font-body text-sm text-white/40 py-3 pr-4 hidden md:table-cell">{shot.res || ''}</td>}
                <td className="font-body text-sm text-white/50 py-3 leading-relaxed">{shot.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CollapsibleSection({ title, kicker, count, totalDuration, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 bg-white/[0.01]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          <h3 className="font-headline text-lg font-bold text-aom-text-light">{title}</h3>
          <span className="font-body text-xs text-aom-text-muted uppercase tracking-wider">{count} clips</span>
          {totalDuration && <span className="font-body text-xs text-white/30">{totalDuration}</span>}
        </div>
        {open ? <ChevronUp size={18} className="text-aom-text-muted" /> : <ChevronDown size={18} className="text-aom-text-muted" />}
      </button>
      {open && <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>}
    </div>
  );
}

const TALKING_SHOTS = [
  { clip: 'C0037', duration: '3:31', notes: 'HERO. Full rooftop site tour. Crew member explains HVAC systems, walks through mechanical room. Backbone of any edit.' },
  { clip: 'C0036', duration: '0:37', notes: 'Loading dock/parking area walkthrough. Crew member exits building, walks past branded truck. Good opener.' },
  { clip: 'C0041', duration: '0:23', notes: 'Large HVAC unit walkthrough with speech. Good supplemental.' },
  { clip: 'C0039', duration: '0:06', notes: 'Piping/valves with off-camera voice. Cutaway with voice.' },
  { clip: 'C0040', duration: '0:14', notes: 'Similar, different pipe angle.' },
  { clip: 'C0042', duration: '0:05', notes: 'Trane control panel with speech.' },
  { clip: 'C0043', duration: '0:06', notes: 'Trane panel, different angle with speech.' },
];

const AERIAL_SHOTS = [
  { clip: '0007', duration: '1:07', res: '2.7K 60fps', notes: 'Orbit of Crown building, wide establishing. Strong opener.' },
  { clip: '0008', duration: '0:33', res: '2.7K 60fps', notes: 'Close-up of rooftop HVAC fans from above.' },
  { clip: '0009', duration: '2:31', res: '2.7K 60fps', notes: 'Wide pull-back from building. Cinematic.' },
  { clip: '0010', duration: '0:03', res: '2.7K 60fps', notes: 'Distant wide, very short.' },
  { clip: '0011', duration: '5:31', res: '2.7K 60fps', notes: 'Extended aerial coverage. Longest drone clip. Multiple angles.' },
  { clip: '0012', duration: '0:21', res: '2.7K 60fps', notes: 'Orbit/pan of surrounding area.' },
  { clip: '0013', duration: '2:12', res: '4K 60fps', notes: 'Wide pan of Crown area. Only 4K drone clip. Best quality.' },
  { clip: '5 JPGs', duration: '--', res: '~30MP', notes: 'Aerial stills of the site.' },
];

const ESTABLISHING_SHOTS = [
  { clip: 'C0004', duration: '0:05', notes: 'Ambition branded truck in parking structure.' },
  { clip: 'C0005', duration: '1:45', notes: 'Rooftop wide, worker in safety vest among HVAC units. Extended coverage.' },
  { clip: 'C0012', duration: '0:05', notes: 'Wide rooftop from above with tile roof.' },
  { clip: 'C0017', duration: '0:09', notes: 'Worker on roof edge overlooking commercial area. Strong hero composition for poster frame.' },
  { clip: 'C0033', duration: '0:25', notes: 'Interior: warehouse/shop establishing + kitchen walkthrough.' },
  { clip: 'C0034', duration: '2:11', notes: 'Interior kitchen: ceiling ductwork + commercial kitchen. Shows indoor scope.' },
  { clip: 'C0035', duration: '1:07', notes: 'Parking garage. Crew exits door, walks to branded truck. Perfect opening or closing shot.' },
  { clip: 'C0066', duration: '0:20', notes: 'Wide piping system, rooftop mechanical room.' },
];

const PROCESS_SHOTS = [
  { clip: 'C0006', duration: '2:27', notes: 'Full rooftop work sequence. Workers disassembling exhaust fans. Best single process clip.' },
  { clip: 'C0010', duration: '0:12', notes: 'Worker inspecting exhaust fan.' },
  { clip: 'C0020', duration: '0:06', notes: 'Worker walking near equipment.' },
  { clip: 'C0025', duration: '0:25', notes: 'Two workers at large HVAC duct. Teamwork visible.' },
  { clip: 'C0026', duration: '0:11', notes: 'Worker inspecting duct.' },
  { clip: 'C0027', duration: '0:26', notes: 'Worker reaching into duct opening. Strong composition.' },
  { clip: 'C0028', duration: '0:21', notes: 'Close-up hands assembling duct components.' },
  { clip: 'C0029', duration: '0:16', notes: 'Worker connecting duct sections.' },
  { clip: 'C0030', duration: '0:20', notes: 'Worker at electrical junction box.' },
  { clip: 'C0031', duration: '0:07', notes: 'Tightening connections, close.' },
  { clip: 'C0032', duration: '0:13', notes: 'Electrical panel work, wider.' },
  { clip: 'C0044', duration: '0:25', notes: 'Slow dolly through pipe systems.' },
  { clip: 'C0062', duration: '0:21', notes: 'Wide piping with equipment.' },
];

const DETAIL_SHOTS = [
  { clip: 'C0007', duration: '0:11', notes: 'Exhaust fan base on gravel roof.' },
  { clip: 'C0008', duration: '0:03', notes: 'Fan blades extreme close-up.' },
  { clip: 'C0009', duration: '0:10', notes: 'Inside exhaust fan, looking down. Textured.' },
  { clip: 'C0011', duration: '0:04', notes: 'Bucket with debris/parts.' },
  { clip: 'C0013', duration: '0:04', notes: 'Fan with label, orbit.' },
  { clip: 'C0014', duration: '0:05', notes: 'Fan label close-up, K-TECH branding.' },
  { clip: 'C0021-C0024', duration: '~0:23', notes: 'Worker detail shots (back, profile, gear).' },
  { clip: 'C0038', duration: '0:07', notes: 'Piping valves (green + red).' },
  { clip: 'C0045-C0055', duration: '~0:49', notes: 'Series of pipe/valve/fitting close-ups. Perfect for rapid-fire cutaway sequence.' },
  { clip: 'C0056', duration: '0:12', notes: 'Green pump/valve, low angle. Strong.' },
  { clip: 'C0057-C0061', duration: '~0:23', notes: 'Pump/motor/equipment details.' },
  { clip: 'C0063-C0065', duration: '~0:21', notes: 'Chiller unit, labels, pipe systems.' },
  { clip: 'C0067-C0069', duration: '~0:27', notes: 'Conduit and equipment details.' },
];

const TRANSITION_SHOTS = [
  { clip: 'C0015', duration: '0:11', notes: 'Shallow DOF rack focus, equipment to street behind.' },
  { clip: 'C0016', duration: '0:19', notes: 'Rack focus equipment to background. Best transition clip.' },
  { clip: 'C0018', duration: '0:01', notes: 'Quick camera move (very short).' },
  { clip: 'C0019', duration: '0:02', notes: 'Short reframe.' },
];

const AUDIO_FILES = [
  { clip: 'DJI_11_074859', duration: '30:46', notes: 'Lav mic recording 1. Covers early part of shoot.' },
  { clip: 'DJI_11_081946', duration: '23:44', notes: 'Lav mic recording 2. Covers mid-shoot.' },
  { clip: 'DJI_12_084830', duration: '6:47', notes: 'Lav mic recording 3. Short session.' },
];

const GAP_ITEMS = [
  { title: 'No before/after shots', description: 'Biggest gap for social content. No "before" state of old equipment to contrast with the new install.' },
  { title: 'Single camera angle on talking shots', description: 'C0037 is great but all one angle/take. A B-camera or alternate framing would give more to work with.' },
  { title: 'No client/building manager testimonial', description: 'Having the Crown facility manager on camera would be gold for case study content.' },
  { title: 'No finished product shots', description: 'We see work in progress but not the completed install running. Critical for before/after content.' },
  { title: 'No Ambition branding hero shot on-site', description: 'Truck shots exist but a deliberate hero shot of the brand at the job site would be stronger.' },
  { title: 'No team portrait/group shot', description: 'Even a candid crew shot. Social media loves showing the team together.' },
  { title: 'Limited indoor kitchen footage', description: 'C0033 and C0034 are mostly walkthrough. More deliberate indoor detail shots would help.' },
];

export default function GuideAmbitionCrown() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">
      {/* Hero */}
      <section className="bg-aom-night py-16 md:py-28 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.a
            href="/guides"
            className="font-body text-sm text-aom-text-muted hover:text-aom-orange transition-colors inline-flex items-center gap-2 mb-12"
            {...fadeUp()}
          >
            <ArrowLeft size={14} />
            Back to Guides
          </motion.a>

          <motion.div {...fadeUp(0.05)}>
            <SectionKicker>EDITOR'S GUIDE</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-3xl md:text-5xl lg:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.15)}
          >
            AMBITION MECHANICAL
          </motion.h1>

          <motion.h2
            className="font-headline text-xl md:text-2xl font-bold text-aom-orange mb-6"
            {...fadeUp(0.18)}
          >
            Crown HVAC Service
          </motion.h2>

          <motion.p
            className="font-body text-lg text-aom-text-muted leading-relaxed max-w-[60ch] mb-4"
            {...fadeUp(0.2)}
          >
            Commercial HVAC service shoot at a retail/entertainment complex. Full scope of a rooftop exhaust fan replacement: truck arrival, crew on the roof disassembling old units, detail shots of every piece of equipment, a 3.5-minute walkthrough, and strong aerial coverage.
          </motion.p>

          <motion.div className="flex flex-wrap gap-4 font-body text-sm text-white/40" {...fadeUp(0.22)}>
            <span>Date of Shoot: March 5, 2026</span>
            <span className="text-white/20">|</span>
            <span>Phoenix, AZ metro</span>
            <span className="text-white/20">|</span>
            <span>Reorganized: March 11, 2026</span>
          </motion.div>
        </div>
      </section>

      {/* Overview Stats */}
      <section className="bg-aom-night px-6 md:px-12 pb-12 md:pb-20">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>OVERVIEW</SectionKicker>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Video} label="Video Clips" value="73" sub="66 Ronin4D + 7 Drone" />
            <StatCard icon={Mic} label="Audio Files" value="3" sub="DJI MIC lav recordings" />
            <StatCard icon={Image} label="Photos" value="5" sub="Drone aerials" />
            <StatCard icon={Clock} label="Video Duration" value="~28 min" />
            <StatCard icon={Mic} label="Audio Duration" value="~61 min" sub="3 lav recordings" />
            <StatCard icon={HardDrive} label="Total Size" value="~105 GB" />
          </div>
        </div>
      </section>

      {/* Quick Cut Recommendation */}
      <section className="bg-aom-night-card py-12 md:py-20 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>QUICK CUT</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-6"
            {...fadeUp(0.05)}
          >
            YOU COULD CUT A 60-90s SHOWCASE TODAY
          </motion.h2>

          <motion.div className="space-y-3" {...fadeUp(0.1)}>
            <HeroClip
              clip="C0035"
              duration="1:07"
              description="Opener. Crew walking to branded truck in parking garage."
            />
            <HeroClip
              clip="C0037"
              duration="3:31"
              description="Voice/backbone. Full rooftop site tour, crew member explaining HVAC systems. Sync with lav audio."
            />
            <HeroClip
              clip="C0006"
              duration="2:27"
              description="Action. Full rooftop work sequence, workers disassembling exhaust fans."
            />
            <HeroClip
              clip="C0045-C0055"
              duration="~0:49"
              description="Cutaways. 11 consecutive detail clips shot as a sequence. Perfect for rapid montage."
            />
            <HeroClip
              clip="0013"
              duration="2:12"
              description="Closer. 4K wide pan drone shot, best quality aerial."
            />
          </motion.div>
        </div>
      </section>

      {/* Shot Inventory */}
      <section className="bg-aom-night py-12 md:py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SHOT INVENTORY</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-8"
            {...fadeUp(0.05)}
          >
            BY CATEGORY
          </motion.h2>

          <div className="space-y-3">
            <CollapsibleSection title="Talking Shots" count="7" totalDuration="~5:34" defaultOpen={true}>
              <ShotTable shots={TALKING_SHOTS} heroClips={['C0037']} />
              <p className="font-body text-xs text-white/40 mt-4">
                All on-camera audio is from camera mic (ambient quality). Sync with the 3 lav WAV files for clean audio.
              </p>
            </CollapsibleSection>

            <CollapsibleSection title="B-Roll: Aerial" count="7 + 5 photos" totalDuration="~12:41">
              <ShotTable shots={AERIAL_SHOTS} heroClips={['0007', '0009', '0013']} />
              <p className="font-body text-xs text-white/40 mt-4">
                All drone clips are 60fps. 2.5x slow-mo at 24fps timeline.
              </p>
            </CollapsibleSection>

            <CollapsibleSection title="B-Roll: Establishing" count="8" totalDuration="~6:07">
              <ShotTable shots={ESTABLISHING_SHOTS} heroClips={['C0005', 'C0017', 'C0034', 'C0035']} />
            </CollapsibleSection>

            <CollapsibleSection title="B-Roll: Process" count="13" totalDuration="~5:49">
              <ShotTable shots={PROCESS_SHOTS} heroClips={['C0006', 'C0025', 'C0027', 'C0030']} />
            </CollapsibleSection>

            <CollapsibleSection title="B-Roll: Detail" count="27" totalDuration="~2:57">
              <ShotTable shots={DETAIL_SHOTS} heroClips={['C0056']} />
              <p className="font-body text-xs text-white/40 mt-4">
                The pipe/valve detail sequence (C0045-C0055) is 11 consecutive clips clearly shot as a sequence. Perfect for a rapid montage cut.
              </p>
            </CollapsibleSection>

            <CollapsibleSection title="B-Roll: Transition" count="4" totalDuration="~0:33">
              <ShotTable shots={TRANSITION_SHOTS} heroClips={['C0016']} />
            </CollapsibleSection>

            <CollapsibleSection title="Audio / Lav Recordings" count="3" totalDuration="~61 min">
              <ShotTable shots={AUDIO_FILES} />
              <div className="mt-4 p-4 border border-aom-orange/20 bg-aom-orange/[0.04]">
                <p className="font-body text-sm text-aom-orange font-semibold mb-1">Critical</p>
                <p className="font-body text-sm text-white/60 leading-relaxed">
                  These need to be synced to the Ronin4D footage. The talking shots (especially C0037) will sound dramatically better with lav audio. Timecodes should align since DJI MIC and Ronin 4D both record creation timestamps.
                </p>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </section>

      {/* Gap Analysis */}
      <section className="bg-aom-night-card py-12 md:py-20 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>GAP ANALYSIS</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-8"
            {...fadeUp(0.05)}
          >
            WHAT'S MISSING
          </motion.h2>

          <div className="space-y-3">
            {GAP_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                className="flex gap-4 p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-yellow-500/30 bg-yellow-500/[0.06] mt-0.5">
                  <AlertTriangle size={14} className="text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-1">{item.title}</h4>
                  <p className="font-body text-sm text-white/50 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Edit Recommendations */}
      <section className="bg-aom-night py-12 md:py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>EDIT RECOMMENDATIONS</SectionKicker>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 60s Showcase */}
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0)}>
              <div className="flex items-center gap-3 mb-4">
                <Clapperboard size={18} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">Instagram Reel / LinkedIn</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">60s Project Showcase</h3>
              <div className="space-y-3 font-body text-sm text-white/50 leading-relaxed">
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:00-:05</span>
                  <span>C0035 truck arrival OR drone 0007 orbit</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:05-:15</span>
                  <span>C0017 hero rooftop, C0005 wide rooftop work</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:15-:35</span>
                  <span>Process montage: C0006, C0025, C0027, C0028</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:35-:45</span>
                  <span>Detail rapid-fire: C0045-C0055 at 1-2s each</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:45-:55</span>
                  <span>C0037 talking pull quote (sync lav audio)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:55-:60</span>
                  <span>Drone 0013 (4K wide pull) as closer</span>
                </div>
              </div>
              <p className="font-body text-xs text-white/30 mt-4">Music: Industrial ambient, confident.</p>
            </motion.div>

            {/* 30s Reel */}
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.08)}>
              <div className="flex items-center gap-3 mb-4">
                <Clapperboard size={18} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">IG Reel</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">30s High Energy</h3>
              <ul className="space-y-3 font-body text-sm text-white/50 leading-relaxed list-none">
                <li>Quick cuts between C0006 process, C0056 pump detail, C0027 hands-in-duct</li>
                <li>Speed ramp the process footage (24fps ProRes holds up beautifully)</li>
                <li>C0037 one-liner as voiceover (2-3 seconds max)</li>
                <li>End on drone establishing</li>
              </ul>
            </motion.div>

            {/* Long-form */}
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.16)}>
              <div className="flex items-center gap-3 mb-4">
                <Clapperboard size={18} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">Case Study</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">2-3 Minute Long-form</h3>
              <ul className="space-y-3 font-body text-sm text-white/50 leading-relaxed list-none">
                <li>C0037 is the spine. Cut between the walking tour and matching b-roll.</li>
                <li>Sync all 3 lav recordings and lay the best audio throughout.</li>
                <li>Drone aerials as chapter breaks.</li>
                <li>Detail sequence as interstitial between sections.</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Technical Reference */}
      <section className="bg-aom-night-card py-12 md:py-20 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TECHNICAL REFERENCE</SectionKicker>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">Ronin4D</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">ProRes 4K (3840x2160)</p>
              <p className="font-body text-sm text-white/40">24fps, PCM 24-bit 48kHz stereo</p>
            </div>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">Drone (Air 3)</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">HEVC 2.7K/4K</p>
              <p className="font-body text-sm text-white/40">59.94fps</p>
            </div>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Mic size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">Lav Audio</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">PCM 32-bit float 48kHz mono</p>
              <p className="font-body text-sm text-white/40">DJI MIC</p>
            </div>
          </div>

          <motion.div className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
            <p className="font-body text-sm text-white/50">
              <span className="text-aom-text-light font-semibold">Color note:</span> Footage appears to be shot in a flat/log profile. Needs color grade.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Folder Structure */}
      <section className="bg-aom-night py-12 md:py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>FOLDER STRUCTURE</SectionKicker>
          </motion.div>

          <motion.div
            className="p-6 border border-white/10 bg-white/[0.02] font-mono text-sm text-white/50 leading-relaxed overflow-x-auto"
            {...fadeUp(0.05)}
          >
            <pre className="whitespace-pre">{`20260305 Crown/
  organized/
    talking-shots/        (7 clips)
    b-roll/
      establishing/       (8 clips)
      detail/             (27 clips)
      process/            (13 clips)
      transition/         (4 clips)
      aerial/             (7 videos + 5 photos)
    audio-lav/            (3 WAV files)
    _reorganization-log.json
  DJI MIC/                (originals preserved)
  DRONE AIR3/             (originals preserved)
  Ronin4D/                (originals preserved)`}</pre>
          </motion.div>

          <motion.p className="font-body text-xs text-white/30 mt-4" {...fadeUp(0.1)}>
            All files were COPIED into the organized structure. Originals remain untouched.
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-aom-night py-8 px-6 text-center border-t border-white/10">
        <a
          href="https://aheadofmarket.com"
          className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-3"
        >
          AOM
        </a>
        <p className="font-body text-xs text-aom-text-muted">
          aheadofmarket.com
        </p>
      </footer>
    </div>
  );
}
