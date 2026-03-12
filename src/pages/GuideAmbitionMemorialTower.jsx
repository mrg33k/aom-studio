import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Video, Camera, Mic, Image, Clock, HardDrive, AlertTriangle, Clapperboard, Star, ChevronDown, ChevronUp, Calendar, Layers } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = "Ambition Memorial Tower | Editor's Guide | AOM";
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', "Editor's guide for Ambition Mechanical Memorial Tower insulation project. 354 clips across 8 shoot dates, 9 DJI MIC recordings, multi-camera coverage over 6 months.");
    setMeta('og:title', "Ambition Memorial Tower | Editor's Guide", true);
    setMeta('og:description', "354 clips, 8 shoot dates, 9 lav recordings. Full shot inventory and edit recommendations.", true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/guides/ambition-memorial-tower', true);
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
            {shots[0]?.camera && <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4 hidden md:table-cell">Camera</th>}
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
                {shot.camera !== undefined && <td className="font-body text-sm text-white/40 py-3 pr-4 hidden md:table-cell">{shot.camera || ''}</td>}
                <td className="font-body text-sm text-white/50 py-3 leading-relaxed">{shot.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CollapsibleSection({ title, kicker, count, totalDuration, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 bg-white/[0.01]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className="font-headline text-lg font-bold text-aom-text-light">{title}</h3>
          {count && <span className="font-body text-xs text-aom-text-muted uppercase tracking-wider">{count}</span>}
          {totalDuration && <span className="font-body text-xs text-white/30">{totalDuration}</span>}
          {badge && <span className="font-body text-xs px-2 py-0.5 bg-aom-orange/10 text-aom-orange border border-aom-orange/20">{badge}</span>}
        </div>
        {open ? <ChevronUp size={18} className="text-aom-text-muted flex-shrink-0" /> : <ChevronDown size={18} className="text-aom-text-muted flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>}
    </div>
  );
}

/* ================================================================
   SHOOT DATE DATA
   ================================================================ */

const DATE1_DRONE = [
  { clip: 'DJI_0502', duration: '5:20', res: '4K 24fps', notes: 'Long establishing flight. No audio.' },
  { clip: 'DJI_0503', duration: '5:20', res: '4K 24fps', notes: 'Long establishing flight. No audio.' },
  { clip: 'DJI_0504', duration: '1:25', res: '4K 24fps', notes: 'Short drone shot. No audio.' },
];

const DATE1_RONIN = [
  { clip: 'A013C0015', duration: '0:10', notes: 'Short b-roll. 60fps.' },
  { clip: 'A013C0016', duration: '0:12', notes: 'Short b-roll. 60fps.' },
  { clip: 'A013C0017', duration: '0:02', notes: 'Very short. 60fps.' },
  { clip: 'A013C0018', duration: '1:50', notes: 'LIKELY TALKING. Loud audio, long clip. 60fps.' },
  { clip: 'A013C0019', duration: '1:00', notes: 'LIKELY TALKING. Elevated audio. 60fps.' },
  { clip: 'A013C0020', duration: '5:10', notes: 'LIKELY TALKING. Longest clip, loud. Probably crew walkthrough or interview. 60fps.' },
  { clip: 'A013C0021', duration: '1:54', notes: 'LIKELY TALKING. Elevated audio. 60fps.' },
  { clip: 'A013C0022', duration: '2:23', notes: 'LIKELY TALKING. Loudest mean dB. 60fps.' },
  { clip: 'A013C0023', duration: '0:17', notes: 'Short b-roll. 60fps.' },
  { clip: 'A013C0024', duration: '1:10', notes: 'POSSIBLE TALKING. 60fps.' },
  { clip: 'A013C0025', duration: '1:51', notes: 'Ambient with spikes. Machinery? 60fps.' },
  { clip: 'A013C0026', duration: '0:05', notes: 'Short b-roll. 60fps.' },
  { clip: 'A013C0027', duration: '0:12', notes: 'Short b-roll. 60fps.' },
];

const DATE2_DRONE = [
  { clip: 'DJI_0657', duration: '2:23', notes: 'No audio.' },
  { clip: 'DJI_0658', duration: '5:20', notes: 'No audio.' },
  { clip: 'DJI_0659', duration: '5:20', notes: 'No audio.' },
  { clip: 'DJI_0660', duration: '5:20', notes: 'No audio.' },
  { clip: 'DJI_0661', duration: '0:17', notes: 'Short. No audio.' },
  { clip: 'DJI_0662', duration: '5:20', notes: 'No audio.' },
  { clip: 'DJI_0663', duration: '5:20', notes: 'No audio.' },
  { clip: 'DJI_0664', duration: '5:20', notes: 'No audio.' },
  { clip: 'DJI_0665', duration: '5:20', notes: 'No audio.' },
  { clip: 'DJI_0666', duration: '1:21', notes: 'No audio.' },
];

const DATE2_RONIN_KEY = [
  { clip: 'A020C0019', duration: '3:10', notes: 'STRONG SPEECH. Very loud mean (-24.7dB). Top talking clip this date.' },
  { clip: 'A020C0048', duration: '1:19', notes: 'STRONG SPEECH. Mean -26.4dB, clipping.' },
  { clip: 'A020C0021', duration: '0:39', notes: 'LIKELY TALKING.' },
  { clip: 'A020C0046', duration: '1:17', notes: 'LIKELY TALKING.' },
  { clip: 'A020C0068', duration: '0:31', notes: 'LIKELY TALKING.' },
  { clip: 'A020C0072', duration: '1:22', notes: 'LIKELY TALKING.' },
  { clip: 'A020C0066', duration: '4:19', notes: 'Long clip, some talking moments.' },
  { clip: 'A020C0058', duration: '3:13', notes: 'Intermittent talking.' },
];

const DATE2_S5 = [
  { clip: 'PS520445', duration: '4:03', notes: '6K footage. Longest S5 clip. Maximum detail for crop/reframe.' },
  { clip: 'PS520451', duration: '1:48', notes: '6K.' },
  { clip: 'PS520456', duration: '1:03', notes: '6K.' },
  { clip: 'PS520450', duration: '0:57', notes: '6K.' },
  { clip: 'PS520458', duration: '0:43', notes: '6K.' },
  { clip: 'PS520459', duration: '0:32', notes: '6K.' },
];

const DATE3_MIC = [
  { clip: 'DJI_08_071713', duration: '1:35', notes: 'Pre-shoot mic check. No video overlap.' },
  { clip: 'DJI_09_072559', duration: '9:03', notes: 'KEY. Covers C0003-C0012. Only session with direct video sync.' },
  { clip: 'DJI_10_114416', duration: '12:55', notes: 'Long afternoon session. No direct video overlap (42-min gap to afternoon clips).' },
  { clip: 'DJI_11_115712', duration: '0:07', notes: 'False start / mic check.' },
  { clip: 'DJI_12_115720', duration: '6:10', notes: 'Afternoon continuation. No direct video overlap.' },
];

const DATE3_KEY_CLIPS = [
  { clip: 'C0024', duration: '4:20', notes: 'INTERVIEW. Mean -13.4dB. Hottest audio clip across the ENTIRE project. Almost certainly direct-to-mic speech.' },
  { clip: 'C0048', duration: '0:14', notes: 'HOTTEST AUDIO on this date. Mean -10.0dB. Short but extremely loud.' },
  { clip: 'C0123', duration: '4:11', notes: 'EXTENDED INTERVIEW. Mean -23.3dB. Afternoon session. No DJI MIC coverage.' },
  { clip: 'C0096', duration: '4:44', notes: 'Long clip, some talking. Late morning.' },
  { clip: 'C0080', duration: '3:51', notes: 'Long clip, intermittent talking.' },
  { clip: 'C0012', duration: '2:17', notes: 'TALKING. Peaks near clipping. DJI_09 overlap available.' },
  { clip: 'C0022', duration: '0:19', notes: 'STRONG TALKING. Very hot audio, clipping.' },
  { clip: 'C0031', duration: '0:28', notes: 'TALKING.' },
  { clip: 'C0035', duration: '0:24', notes: 'TALKING.' },
  { clip: 'C0039', duration: '0:39', notes: 'TALKING.' },
];

const DATE4_KEY_CLIPS = [
  { clip: 'B002C0012', duration: '5:28', notes: 'INTERVIEW. Mean -16.9dB. ProRes. Best interview clip on the project. DJI MIC available.' },
  { clip: 'B002C0013', duration: '4:44', notes: 'INTERVIEW. Mean -17.2dB. ProRes. Combined 10+ min of interview with C0012. DJI MIC available.' },
  { clip: 'B002C0018', duration: '0:54', notes: 'HOTTEST on this date. Mean -10.6dB. Direct-to-mic statement. DJI MIC session 2.' },
  { clip: 'B002C0005', duration: '2:21', notes: 'STRONG TALKING. Mean -19.4dB. ProRes.' },
  { clip: 'B002C0006', duration: '1:43', notes: 'STRONG TALKING. Mean -20.7dB. ProRes.' },
  { clip: 'B002C0004', duration: '15:59', notes: '16 min continuous. Possibly timelapse or extended work sequence. Quiet audio.' },
  { clip: 'B002C0020', duration: '5:26', notes: 'Long quiet b-roll / work documentation.' },
  { clip: 'B002C0008', duration: '3:28', notes: 'Long b-roll / work sequence.' },
];

const DATE5_KEY_CLIPS = [
  { clip: 'B003C0018', duration: '6:41', notes: 'EXTENDED INTERVIEW. Nearly 7 min of content. Mean -30.1dB. Highest priority for DJI MIC sync.' },
  { clip: 'B003C0024', duration: '3:29', notes: 'STRONG TALKING/INTERVIEW. Mean -26.6dB. Second priority.' },
  { clip: 'B003C0016', duration: '0:10', notes: 'POSSIBLE TALKING.' },
  { clip: 'B003C0017', duration: '0:17', notes: 'POSSIBLE TALKING.' },
];

const DATE6_CLIPS = [
  { clip: 'B005C0001', duration: '2:12', notes: 'Main clip. Some talking/activity. DJI MIC available (1:59 recording).' },
  { clip: 'B005C0002', duration: '0:31', notes: 'Ambient b-roll.' },
];

const DATE7_KEY_CLIPS = [
  { clip: 'C221', duration: '1:20', notes: 'STRONG TALKING. Longest and loudest BlackMagic clip. Mean -24.4dB.' },
  { clip: 'C222', duration: '0:30', notes: 'STRONG TALKING. Hottest mean on this date (-23.1dB).' },
  { clip: 'C220', duration: '0:56', notes: 'STRONG TALKING. Mean -24.8dB.' },
  { clip: 'C219', duration: '0:46', notes: 'STRONG TALKING. Mean -23.2dB.' },
  { clip: 'C215', duration: '0:43', notes: 'TALKING. Mean -27.2dB.' },
  { clip: 'C214', duration: '0:48', notes: 'Possible talking. Mean -31.1dB.' },
];

const SYNC_PRIORITY = [
  { clip: 'B002C0012', date: 'Jan 13', duration: '5:28', mic: 'DJI_01 session 1', notes: 'Interview. ProRes. Top priority.' },
  { clip: 'B002C0013', date: 'Jan 13', duration: '4:44', mic: 'DJI_01 session 1', notes: 'Interview. ProRes.' },
  { clip: 'B003C0018', date: 'Jan 14', duration: '6:41', mic: 'DJI_03', notes: 'Longest interview clip.' },
  { clip: 'B003C0024', date: 'Jan 14', duration: '3:29', mic: 'DJI_03', notes: 'Strong talking.' },
  { clip: 'B002C0005', date: 'Jan 13', duration: '2:21', mic: 'DJI_01 session 1', notes: 'Talking.' },
  { clip: 'B002C0006', date: 'Jan 13', duration: '1:43', mic: 'DJI_01 session 1', notes: 'Talking.' },
  { clip: 'B002C0018', date: 'Jan 13', duration: '0:54', mic: 'DJI_01 session 2', notes: 'Hottest audio on Jan 13.' },
  { clip: 'A001C0012', date: 'Jan 8', duration: '2:17', mic: 'DJI_09', notes: 'Talking. Only 0108 clip with MIC coverage.' },
  { clip: 'B005C0001', date: 'Jan 16', duration: '2:12', mic: 'DJI_01', notes: 'Some talking. Short MIC recording.' },
];

const GAP_ITEMS = [
  { title: 'No DJI MIC on 4 of 8 shoot dates', description: 'Aug 10, Sep 8, Jan 21, and Jan 22 have no lav recordings. Talking clips from these dates rely on camera scratch audio only.' },
  { title: 'Jan 8 afternoon clips have no MIC coverage', description: 'DJI MIC recordings end at ~12:03 PM but afternoon video session starts at 12:45 PM. C0113-C0124 (including the important 4-min C0123) are scratch audio only.' },
  { title: 'Jan 22 has only 1 iPhone clip', description: 'Minimal coverage. Only useful as a progression data point, not for edit content.' },
  { title: 'Jan 21 uses AAC audio (BlackMagic App)', description: 'Lower quality than PCM from Ronin 4D. May need noise reduction for any talking clips.' },
  { title: '60fps vs 24fps visual difference', description: 'Aug/Sep Ronin 4D clips are 60fps while Jan clips are 24fps. Be aware of motion cadence differences when intercutting.' },
  { title: '6K S5 IIX footage needs scaling', description: '5952x3968 footage from Sep 8 will be slower to decode. Use proxies or Optimized Media in Resolve.' },
  { title: 'Pre-rendered edits exist in Sep 8 AUDIO folder', description: 'Two previously cut edits (Mo 1, Mo 2) suggest past editing work. Check with Patrik on building on existing edit vs starting fresh.' },
  { title: 'Some clips have no audio data', description: 'Very short clips where analysis could not complete. These are b-roll, not talking content.' },
];

const CONTENT_IDEAS = [
  {
    title: 'Project Progression Reel',
    impact: 'HIGHEST',
    description: '8 visits over 6 months = powerful before/during/after story. Match drone angles across dates to show transformation. 60-90s for LinkedIn + IG.',
    source: 'Drone footage from all dates (Aug 2025 through Jan 2026)',
  },
  {
    title: 'Interview/Testimonial Cut',
    impact: 'HIGH',
    description: '10+ min of interview from Jan 13, 10 min from Jan 14, plus talking clips from Jan 8 and 21. Sync DJI MIC for clean audio. Cut into testimonial or project narrative.',
    source: 'B002C0012+C0013, B003C0018+C0024, C0024 (0108), BlackMagic clips (0121)',
  },
  {
    title: 'Crew at Work Reels (Multiple)',
    impact: 'HIGH',
    description: 'Hundreds of 3-15s b-roll clips across all shoots. Speed ramp, cut to music, text overlays. Multiple reels from this pool.',
    source: 'Short Ronin4D b-roll from all dates',
  },
  {
    title: 'Drone Showcase',
    impact: 'MEDIUM',
    description: '40+ minutes of aerial footage across 3 dates. Before (Aug) vs After (Jan) aerials. Cinematic orbits, reveals, flyovers.',
    source: 'All drone footage: 3 clips (Aug), 10 clips (Sep), 25 clips (Jan 8)',
  },
  {
    title: '6K Detail Reel',
    impact: 'MEDIUM',
    description: 'Highest resolution footage in the project. Crop/reframe to create multiple compositions from single shots.',
    source: 'S5 IIX 5952x3968 footage from Sep 8 (16 clips)',
  },
  {
    title: 'Day in the Life',
    impact: 'MEDIUM',
    description: 'Full day coverage from Jan 8 (122 Ronin clips) or Jan 13+14 back-to-back days. Multiple cameras, drone, handheld.',
    source: 'Jan 8 full-day shoot or Jan 13+14 combined',
  },
];

/* ================================================================
   COMPONENT
   ================================================================ */

export default function GuideAmbitionMemorialTower() {
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
            Memorial Tower Insulation
          </motion.h2>

          <motion.p
            className="font-body text-lg text-aom-text-muted leading-relaxed max-w-[60ch] mb-4"
            {...fadeUp(0.2)}
          >
            Ambition's most documented job site. 8 shoot dates spanning 6 months (Aug 2025 through Jan 2026), covering a commercial insulation project from early phases through active work. Multi-camera coverage with Ronin 4D, S5 IIX (6K), DJI Drone, and BlackMagic Camera App. Massive progression potential.
          </motion.p>

          <motion.div className="flex flex-wrap gap-4 font-body text-sm text-white/40" {...fadeUp(0.22)}>
            <span>8 Shoot Dates: Aug 2025 through Jan 2026</span>
            <span className="text-white/20">|</span>
            <span>Phoenix, AZ metro</span>
            <span className="text-white/20">|</span>
            <span>Guide generated: March 12, 2026</span>
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
            <StatCard icon={Video} label="Video Clips" value="~354" sub="273 Ronin4D + 38 Drone + 25 S5 + 10 BM + 5 iPhone + 3 pre-edits" />
            <StatCard icon={Mic} label="Lav Recordings" value="9" sub="DJI MIC across 4 dates" />
            <StatCard icon={Calendar} label="Shoot Dates" value="8" sub="Aug 2025 through Jan 2026" />
            <StatCard icon={Camera} label="Cameras" value="5" sub="Ronin 4D, S5 IIX, Drone, BlackMagic, iPhone" />
            <StatCard icon={Image} label="Photos" value="356" sub="RW2 raw files" />
            <StatCard icon={Layers} label="Resolve Project" value="Cloud" sub="Ambition 2026" />
          </div>
        </div>
      </section>

      {/* Hero Clips / Best Interview Material */}
      <section className="bg-aom-night-card py-12 md:py-20 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>HERO MATERIAL</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-3"
            {...fadeUp(0.05)}
          >
            BEST INTERVIEW FOOTAGE: JAN 13
          </motion.h2>

          <motion.p
            className="font-body text-base text-white/50 leading-relaxed mb-6 max-w-[60ch]"
            {...fadeUp(0.08)}
          >
            January 13 is the best interview date. Two clips totaling 10+ minutes of ProRes interview with DJI MIC lav coverage. This is the backbone of any narrative cut.
          </motion.p>

          <motion.div className="space-y-3" {...fadeUp(0.1)}>
            <HeroClip
              clip="B002C0012"
              duration="5:28"
              description="Interview. ProRes 4K, mean -16.9dB. The single best interview clip on the project. 5.5 min of extended talking. DJI MIC session 1 available for clean audio."
            />
            <HeroClip
              clip="B002C0013"
              duration="4:44"
              description="Interview. ProRes 4K, mean -17.2dB. Nearly 5 min, continuation of interview. Combined with C0012, this gives 10+ min of narrative material."
            />
            <HeroClip
              clip="B002C0018"
              duration="0:54"
              description="Hottest audio on Jan 13. Mean -10.6dB. Likely direct-to-mic statement. Perfect soundbite candidate."
            />
            <HeroClip
              clip="B003C0018"
              duration="6:41"
              description="Jan 14. Longest interview clip across the project. Nearly 7 min. DJI MIC (DJI_03) available. Second-best interview source."
            />
            <HeroClip
              clip="C0024 (0108)"
              duration="4:20"
              description="Jan 8. Hottest audio across the ENTIRE project (mean -13.4dB). Almost certainly direct-to-mic speech. No DJI MIC coverage though (recorded after DJI_09 ended)."
            />
          </motion.div>
        </div>
      </section>

      {/* Progression Reel Concept */}
      <section className="bg-aom-night py-12 md:py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>HIGHEST IMPACT CONTENT</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-6"
            {...fadeUp(0.05)}
          >
            PROJECT PROGRESSION REEL
          </motion.h2>

          <motion.div className="p-6 border border-aom-orange/20 bg-aom-orange/[0.04] mb-6" {...fadeUp(0.1)}>
            <p className="font-body text-sm text-aom-orange font-semibold mb-2">The showcase piece</p>
            <p className="font-body text-base text-white/60 leading-relaxed mb-4">
              8 visits over 6 months gives you a before/during/after story that no single shoot can match. Match drone angles across dates to show the building's transformation. The 60fps drone footage from Jan 8 can be slowed to 24fps for cinematic feel.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-white/10 bg-white/[0.02]">
                <p className="font-headline text-sm font-bold text-aom-orange mb-1">BEFORE</p>
                <p className="font-body text-sm text-white/50">Aug 10 drone (3 clips, 12 min)</p>
                <p className="font-body text-xs text-white/30 mt-1">DJI_0502-0504</p>
              </div>
              <div className="p-4 border border-white/10 bg-white/[0.02]">
                <p className="font-headline text-sm font-bold text-aom-orange mb-1">DURING</p>
                <p className="font-body text-sm text-white/50">Sep 8 drone (10 clips, 41 min) + Jan 8 drone (25 clips, 64 min)</p>
                <p className="font-body text-xs text-white/30 mt-1">DJI_0657-0666, DJI_0368-0392</p>
              </div>
              <div className="p-4 border border-white/10 bg-white/[0.02]">
                <p className="font-headline text-sm font-bold text-aom-orange mb-1">AFTER</p>
                <p className="font-body text-sm text-white/50">Jan 13-22 ground footage shows active insulation work in progress</p>
                <p className="font-body text-xs text-white/30 mt-1">Ronin 4D ProRes clips</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Shoot Date Inventory */}
      <section className="bg-aom-night-card py-12 md:py-20 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SHOT INVENTORY</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-8"
            {...fadeUp(0.05)}
          >
            BY SHOOT DATE
          </motion.h2>

          <div className="space-y-3">
            {/* Date 1: Aug 10 */}
            <CollapsibleSection title="Aug 10, 2025" count="16 clips + 63 photos" totalDuration="Drone + Ronin 4D">
              <div className="space-y-6">
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Drone (3 clips)</h4>
                  <ShotTable shots={DATE1_DRONE} />
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Ronin 4D (13 clips, all 60fps DCI 4K)</h4>
                  <ShotTable shots={DATE1_RONIN} heroClips={['A013C0020']} />
                </div>
                <div className="p-4 border border-white/10 bg-white/[0.02]">
                  <p className="font-body text-sm text-white/50">
                    <span className="text-aom-text-light font-semibold">No DJI MIC.</span> Camera scratch audio only. A013C0020 (5:10) is the star of this date.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Date 2: Sep 8 */}
            <CollapsibleSection title="Sep 8, 2025" count="98 clips + 169 photos" totalDuration="Major shoot day" badge="3 CAMERAS + DRONE">
              <div className="space-y-6">
                <div className="p-4 border border-aom-orange/20 bg-aom-orange/[0.04]">
                  <p className="font-body text-sm text-aom-orange font-semibold mb-1">Pre-rendered edits found</p>
                  <p className="font-body text-sm text-white/60">AUDIO folder contains "Mo 1" and "Mo 2" (pre-cut edits with "Modern Rnb Beat" music). Check with Patrik on building on existing edit vs starting fresh.</p>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Drone (10 clips, ~41 min total)</h4>
                  <ShotTable shots={DATE2_DRONE} />
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Ronin 4D Key Clips (72 total, 60fps DCI 4K)</h4>
                  <ShotTable shots={DATE2_RONIN_KEY} heroClips={['A020C0019', 'A020C0048']} />
                  <p className="font-body text-xs text-white/40 mt-3">56 additional short b-roll clips (under 20s each) not listed. Total 72 Ronin 4D clips on this date.</p>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">S5 IIX (16 clips, 6K)</h4>
                  <ShotTable shots={DATE2_S5} heroClips={['PS520445']} />
                  <p className="font-body text-xs text-white/40 mt-3">6K resolution (5952x3968). Will need scaling in Resolve. Maximum detail for crop/reframe.</p>
                </div>
                <div className="p-4 border border-white/10 bg-white/[0.02]">
                  <p className="font-body text-sm text-white/50">
                    <span className="text-aom-text-light font-semibold">No DJI MIC.</span> Camera scratch audio only. Most diverse coverage day (3 cameras + drone).
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Date 3: Jan 8 */}
            <CollapsibleSection title="Jan 8, 2026" count="156 clips + 80 photos" totalDuration="Biggest shoot" badge="5 DJI MIC FILES" defaultOpen={true}>
              <div className="space-y-6">
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">DJI MIC Recordings (5 files)</h4>
                  <ShotTable shots={DATE3_MIC} heroClips={['DJI_09_072559']} />
                  <div className="mt-3 p-4 border border-aom-orange/20 bg-aom-orange/[0.04]">
                    <p className="font-body text-sm text-aom-orange font-semibold mb-1">Sync Warning</p>
                    <p className="font-body text-sm text-white/60 leading-relaxed">
                      Only DJI_09 has direct video overlap (C0003-C0012 morning session). The afternoon talking clips (C0113-C0124, including C0123 at 4:11) do NOT have DJI MIC coverage. The hottest clips (C0024, C0048) were recorded after DJI_09 ended.
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Key Ronin 4D Clips (122 total, 24fps UHD 4K)</h4>
                  <p className="font-body text-xs text-white/40 mb-3">Three sessions: Morning (7:26-8:29 AM), Late Morning (9:24-10:48 AM), Afternoon (12:45-1:07 PM)</p>
                  <ShotTable shots={DATE3_KEY_CLIPS} heroClips={['C0024', 'C0048', 'C0123']} />
                  <p className="font-body text-xs text-white/40 mt-3">112 additional clips not listed. Full breakdown in source guide.</p>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Drone (25 clips, ~64 min)</h4>
                  <p className="font-body text-sm text-white/50">Mixed 24fps and 60fps. 18 clips at 60fps (slo-mo capable), 4 at 24fps, 3 at 60fps. DJI_0368-0392.</p>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">S5 IIX (9 clips, 60fps UHD 4K)</h4>
                  <p className="font-body text-sm text-white/50">PS520081 (2:21) is the longest. Check for talking content.</p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Date 4: Jan 13 */}
            <CollapsibleSection title="Jan 13, 2026" count="21 clips" totalDuration="ProRes + 2 DJI MIC" badge="BEST INTERVIEWS" defaultOpen={true}>
              <div className="space-y-6">
                <div className="p-4 border border-aom-orange/20 bg-aom-orange/[0.04]">
                  <p className="font-body text-sm text-aom-orange font-semibold mb-1">Best interview date on the project</p>
                  <p className="font-body text-sm text-white/60">B002C0012 + B002C0013 = 10+ min of interview with DJI MIC lav coverage. All footage is ProRes 4K at 24fps. Two back-to-back DJI MIC sessions cover ~59 min.</p>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">DJI MIC (2 files, ~59 min combined)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">File</th>
                          <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Duration</th>
                          <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/5">
                          <td className="font-body text-sm text-aom-text-light py-3 pr-4">DJI_01 session 1</td>
                          <td className="font-body text-sm text-white/50 py-3 pr-4">30:45</td>
                          <td className="font-body text-sm text-white/50 py-3">11:17-11:48 AM. Covers C0005, C0006, C0012, C0013.</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="font-body text-sm text-aom-text-light py-3 pr-4">DJI_01 session 2</td>
                          <td className="font-body text-sm text-white/50 py-3 pr-4">28:00</td>
                          <td className="font-body text-sm text-white/50 py-3">11:48 AM-12:16 PM. Louder. Covers C0018 (hottest clip).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Ronin 4D (20 clips, ProRes 4K 24fps)</h4>
                  <ShotTable shots={DATE4_KEY_CLIPS} heroClips={['B002C0012', 'B002C0013', 'B002C0018']} />
                </div>
              </div>
            </CollapsibleSection>

            {/* Date 5: Jan 14 */}
            <CollapsibleSection title="Jan 14, 2026" count="44 clips + 43 photos" totalDuration="ProRes + DJI MIC">
              <div className="space-y-6">
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">DJI MIC (1 file, 30:22)</h4>
                  <p className="font-body text-sm text-white/50 mb-3">DJI_03 covers 7:49-8:20 AM. Full morning session. Sync B003C0018 first (longest interview), then apply offset to all other clips.</p>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">Key Ronin 4D Clips (32 primary + 12 test shots)</h4>
                  <ShotTable shots={DATE5_KEY_CLIPS} heroClips={['B003C0018', 'B003C0024']} />
                  <p className="font-body text-xs text-white/40 mt-3">12 test shots in TEST SHOTS subfolder (very quiet audio, -47 to -57dB). May not be usable unless visual content is needed.</p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Date 6: Jan 16 */}
            <CollapsibleSection title="Jan 16, 2026" count="2 clips + iPhone" totalDuration="Small shoot">
              <div className="space-y-4">
                <p className="font-body text-sm text-white/50">Small session. 2 Ronin 4D ProRes clips + 1 DJI MIC (1:59) + iPhone reference.</p>
                <ShotTable shots={DATE6_CLIPS} heroClips={['B005C0001']} />
              </div>
            </CollapsibleSection>

            {/* Date 7: Jan 21 */}
            <CollapsibleSection title="Jan 21, 2026" count="10 clips + iPhone" totalDuration="BlackMagic App" badge="TALKING-FOCUSED">
              <div className="space-y-6">
                <div className="p-4 border border-aom-orange/20 bg-aom-orange/[0.04]">
                  <p className="font-body text-sm text-aom-orange font-semibold mb-1">No DJI MIC. AAC audio only.</p>
                  <p className="font-body text-sm text-white/60">Nearly every clip has significant audio (mean -23 to -28dB). This was a talking-focused shoot, possibly a walkthrough or testimonial. AAC quality is lower than PCM but phone was close to speaker.</p>
                </div>
                <div>
                  <h4 className="font-headline text-base font-bold text-aom-text-light mb-3">BlackMagic Camera App (10 clips, ProRes 4K 24fps)</h4>
                  <ShotTable shots={DATE7_KEY_CLIPS} heroClips={['C221', 'C222', 'C220']} />
                </div>
              </div>
            </CollapsibleSection>

            {/* Date 8: Jan 22 */}
            <CollapsibleSection title="Jan 22, 2026" count="1 iPhone clip" totalDuration="Quick site check">
              <p className="font-body text-sm text-white/50">Single iPhone reference clip (IMG_8584.MOV, 0:32, 1080p 30fps). Not a full shoot. Use as a progression data point only.</p>
            </CollapsibleSection>
          </div>
        </div>
      </section>

      {/* DJI MIC Sync Priority */}
      <section className="bg-aom-night py-12 md:py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>AUDIO SYNC</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-6"
            {...fadeUp(0.05)}
          >
            DJI MIC SYNC PRIORITY
          </motion.h2>

          <motion.p
            className="font-body text-base text-white/50 leading-relaxed mb-6 max-w-[60ch]"
            {...fadeUp(0.08)}
          >
            9 DJI MIC recordings across 4 dates (~92 min total). Sync these to the talking clips for dramatically cleaner audio. Ranked by importance.
          </motion.p>

          <motion.div {...fadeUp(0.1)}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">#</th>
                    <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Clip</th>
                    <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Date</th>
                    <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Duration</th>
                    <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4 hidden md:table-cell">MIC File</th>
                    <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {SYNC_PRIORITY.map((item, i) => (
                    <tr key={i} className={`border-b border-white/5 ${i < 2 ? 'bg-aom-orange/[0.04]' : ''}`}>
                      <td className="font-headline text-sm font-bold text-aom-orange py-3 pr-4">{i + 1}</td>
                      <td className={`font-body text-sm py-3 pr-4 ${i < 2 ? 'text-aom-orange font-semibold' : 'text-aom-text-light'}`}>{item.clip}</td>
                      <td className="font-body text-sm text-white/50 py-3 pr-4">{item.date}</td>
                      <td className="font-body text-sm text-white/50 py-3 pr-4">{item.duration}</td>
                      <td className="font-body text-sm text-white/40 py-3 pr-4 hidden md:table-cell">{item.mic}</td>
                      <td className="font-body text-sm text-white/50 py-3">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 border border-aom-orange/20 bg-aom-orange/[0.04]">
              <p className="font-body text-sm text-aom-orange font-semibold mb-1">Resolve Sync Method</p>
              <p className="font-body text-sm text-white/60 leading-relaxed">
                Import DJI MIC WAV files alongside video. Use "Auto Sync Audio Based on Waveform" (right-click in Resolve) for automatic alignment. DJI MIC files are 32-bit float WAV. Normalize to -3dB to -6dB peak before mixing. Once synced, mute camera scratch audio and use DJI MIC as primary.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content Ideas */}
      <section className="bg-aom-night-card py-12 md:py-20 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CONTENT IDEAS</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-8"
            {...fadeUp(0.05)}
          >
            RANKED BY IMPACT
          </motion.h2>

          <div className="space-y-4">
            {CONTENT_IDEAS.map((idea, i) => (
              <motion.div
                key={i}
                className="p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-headline text-lg font-bold text-aom-orange">{i + 1}</span>
                  <h3 className="font-headline text-lg font-bold text-aom-text-light">{idea.title}</h3>
                  <span className={`font-body text-xs px-2 py-0.5 border ${idea.impact === 'HIGHEST' ? 'bg-aom-orange/10 text-aom-orange border-aom-orange/20' : idea.impact === 'HIGH' ? 'bg-white/5 text-aom-text-light border-white/20' : 'bg-white/[0.02] text-aom-text-muted border-white/10'}`}>
                    {idea.impact}
                  </span>
                </div>
                <p className="font-body text-sm text-white/50 leading-relaxed mb-2">{idea.description}</p>
                <p className="font-body text-xs text-white/30">Source: {idea.source}</p>
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
            {/* 60-90s Showcase */}
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0)}>
              <div className="flex items-center gap-3 mb-4">
                <Clapperboard size={18} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">LinkedIn + IG Reel</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">60-90s Project Showcase</h3>
              <div className="space-y-3 font-body text-sm text-white/50 leading-relaxed">
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:00-:05</span>
                  <span>Drone establishing (match angle across dates)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:05-:10</span>
                  <span>Text overlay: project name + scope</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:10-:25</span>
                  <span>Quick b-roll montage (2-3s clips each)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:25-:40</span>
                  <span>Interview soundbite from B002C0012 or B002C0013 (sync DJI MIC)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:40-:55</span>
                  <span>Work sequence + detail shots</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:55-:70</span>
                  <span>Drone progression (before vs after)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-aom-orange font-semibold whitespace-nowrap">:70-:90</span>
                  <span>Interview closer + Ambition branding</span>
                </div>
              </div>
              <p className="font-body text-xs text-white/30 mt-4">Music: Industrial ambient, confident. Check "Modern Rnb Beat" from Sep 8 AUDIO folder.</p>
            </motion.div>

            {/* 15-30s Reel */}
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.08)}>
              <div className="flex items-center gap-3 mb-4">
                <Clapperboard size={18} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">IG Reel / TikTok</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">15-30s High Energy</h3>
              <ul className="space-y-3 font-body text-sm text-white/50 leading-relaxed list-none">
                <li>Hook: dramatic drone or 6K close-up detail from S5 IIX (2s)</li>
                <li>Fast b-roll cuts to music (10-20s, 1-2s each)</li>
                <li>Speed ramp the 60fps Ronin 4D footage (24fps ProRes holds up well)</li>
                <li>One-liner soundbite from B002C0018 (hottest audio, 0:54)</li>
                <li>End card with Ambition branding</li>
              </ul>
              <p className="font-body text-xs text-white/30 mt-4">"Watch us insulate a 20-story building" type content. Multiple reels from this pool.</p>
            </motion.div>

            {/* Long-form */}
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.16)}>
              <div className="flex items-center gap-3 mb-4">
                <Clapperboard size={18} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">Case Study</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">2-5 Minute Long-form</h3>
              <ul className="space-y-3 font-body text-sm text-white/50 leading-relaxed list-none">
                <li>Cold open with best soundbite from B002C0012</li>
                <li>Drone establishing (progression angle, Aug vs Jan)</li>
                <li>"The challenge" section: interview clips + wide establishing shots</li>
                <li>"The work" section: b-roll montage from all Jan dates, process shots</li>
                <li>"The result" section: final state drone + finished insulation footage</li>
                <li>Testimonial closing from B002C0013 or B003C0018</li>
                <li>Ambition branding end card</li>
              </ul>
              <p className="font-body text-xs text-white/30 mt-4">Sync all DJI MIC recordings. Use drone aerials as chapter breaks.</p>
            </motion.div>
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

      {/* Technical Reference */}
      <section className="bg-aom-night py-12 md:py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TECHNICAL REFERENCE</SectionKicker>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">Ronin 4D</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">DCI 4K / UHD 4K</p>
              <p className="font-body text-sm text-white/40">h264 (Aug-Sep) / ProRes (Jan)</p>
              <p className="font-body text-sm text-white/40">24fps or 59.94fps</p>
              <p className="font-body text-xs text-white/30 mt-2">PCM 24-bit 48kHz stereo</p>
            </div>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">S5 IIX</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">6K (Sep) / UHD 4K (Jan)</p>
              <p className="font-body text-sm text-white/40">HEVC / h264</p>
              <p className="font-body text-sm text-white/40">23.98fps / 59.94fps</p>
              <p className="font-body text-xs text-white/30 mt-2">PCM 24-bit audio</p>
            </div>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">DJI Drone</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">UHD 4K</p>
              <p className="font-body text-sm text-white/40">h264 / HEVC</p>
              <p className="font-body text-sm text-white/40">23.98fps / 59.94fps</p>
              <p className="font-body text-xs text-white/30 mt-2">No audio</p>
            </div>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">BlackMagic App</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">UHD 4K ProRes</p>
              <p className="font-body text-sm text-white/40">24fps</p>
              <p className="font-body text-xs text-white/30 mt-2">AAC audio (compressed)</p>
            </div>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Mic size={16} className="text-aom-orange" />
                <span className="font-body text-xs uppercase tracking-wider text-aom-text-muted">DJI MIC</span>
              </div>
              <p className="font-body text-sm text-aom-text-light">48kHz, 32-bit float</p>
              <p className="font-body text-sm text-white/40">Mono WAV</p>
              <p className="font-body text-xs text-white/30 mt-2">Normalize to -3 to -6dB peak</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <p className="font-body text-sm text-white/50">
                <span className="text-aom-text-light font-semibold">Timeline recommendation:</span> 3840x2160 at 24fps. Interpret 60fps clips as slo-mo when needed. DCI 4K and 6K clips give room to reframe.
              </p>
            </motion.div>
            <motion.div className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(0.15)}>
              <p className="font-body text-sm text-white/50">
                <span className="text-aom-text-light font-semibold">Performance tip:</span> Use Resolve's Optimized Media for ProRes and HEVC clips if timeline is sluggish. Every shoot date has /Proxy/ subfolders with lower-res versions.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* File Counts Summary */}
      <section className="bg-aom-night-card py-12 md:py-20 px-6 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>FILE COUNTS</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase text-aom-text-light mb-8"
            {...fadeUp(0.05)}
          >
            SUMMARY BY DATE
          </motion.h2>

          <motion.div className="overflow-x-auto" {...fadeUp(0.1)}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Date</th>
                  <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Drone</th>
                  <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">Ronin 4D</th>
                  <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">S5 IIX</th>
                  <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4 hidden md:table-cell">BM/iPhone</th>
                  <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3 pr-4">DJI MIC</th>
                  <th className="font-body text-xs uppercase tracking-wider text-aom-text-muted py-3">Photos</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: 'Aug 10, 2025', drone: '3', ronin: '13', s5: '-', bm: '-', mic: '0', photos: '63' },
                  { date: 'Sep 8, 2025', drone: '10', ronin: '72', s5: '16', bm: '-', mic: '0', photos: '169' },
                  { date: 'Jan 8, 2026', drone: '25', ronin: '122', s5: '9', bm: '-', mic: '5', photos: '80' },
                  { date: 'Jan 13, 2026', drone: '-', ronin: '20', s5: '-', bm: '1', mic: '2', photos: '-' },
                  { date: 'Jan 14, 2026', drone: '-', ronin: '44', s5: '-', bm: '1', mic: '1', photos: '43' },
                  { date: 'Jan 16, 2026', drone: '-', ronin: '2', s5: '-', bm: '1', mic: '1', photos: '-' },
                  { date: 'Jan 21, 2026', drone: '-', ronin: '-', s5: '-', bm: '11', mic: '0', photos: '1' },
                  { date: 'Jan 22, 2026', drone: '-', ronin: '-', s5: '-', bm: '1', mic: '0', photos: '-' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="font-body text-sm text-aom-text-light py-3 pr-4 whitespace-nowrap">{row.date}</td>
                    <td className="font-body text-sm text-white/50 py-3 pr-4">{row.drone}</td>
                    <td className="font-body text-sm text-white/50 py-3 pr-4">{row.ronin}</td>
                    <td className="font-body text-sm text-white/50 py-3 pr-4">{row.s5}</td>
                    <td className="font-body text-sm text-white/40 py-3 pr-4 hidden md:table-cell">{row.bm}</td>
                    <td className={`font-body text-sm py-3 pr-4 ${row.mic !== '0' && row.mic !== '-' ? 'text-aom-orange font-semibold' : 'text-white/50'}`}>{row.mic}</td>
                    <td className="font-body text-sm text-white/50 py-3">{row.photos}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/20">
                  <td className="font-headline text-sm font-bold text-aom-text-light py-3 pr-4">TOTAL</td>
                  <td className="font-headline text-sm font-bold text-aom-orange py-3 pr-4">38</td>
                  <td className="font-headline text-sm font-bold text-aom-orange py-3 pr-4">273</td>
                  <td className="font-headline text-sm font-bold text-aom-orange py-3 pr-4">25</td>
                  <td className="font-headline text-sm font-bold text-aom-orange py-3 pr-4 hidden md:table-cell">15</td>
                  <td className="font-headline text-sm font-bold text-aom-orange py-3 pr-4">9</td>
                  <td className="font-headline text-sm font-bold text-aom-orange py-3">356</td>
                </tr>
              </tbody>
            </table>
          </motion.div>

          <motion.p className="font-body text-xs text-white/30 mt-4" {...fadeUp(0.15)}>
            Total unique video clips (non-proxy): ~354 (including 3 pre-rendered edits in AUDIO folder).
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
