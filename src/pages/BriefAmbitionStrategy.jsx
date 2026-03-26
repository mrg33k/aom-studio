import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Target, Zap, Calendar,
  Linkedin, Search, FileText, CheckCircle2, MessageSquare,
  ChevronDown, ChevronUp, ExternalLink, Crosshair, Shield,
  TrendingUp, Eye, MousePointer, Printer, Users, BarChart3,
  Clock, Play, Pause, DollarSign, Mic, Globe, Mail,
  Activity, UserPlus, ThumbsUp, FileBarChart
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Ambition Mechanical: Market Strategy & BD Playbook | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Ambition Mechanical market strategy and business development playbook. GC hit list, PM contacts, outreach strategies, events, competitor intel, and meeting recap.');
    setMeta('og:title', 'Ambition Mechanical: Market Strategy & BD Playbook', true);
    setMeta('og:description', 'Everything discussed in the March 21 strategy session, organized, researched, and ready to execute.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/ambition-market-strategy', true);
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
});

/* Ambition brand colors */
const navy = {
  950: '#070b1e',
  900: '#0a0e2a',
  800: '#111638',
  700: '#1a1f45',
  600: '#1a237e',
};
const red = {
  600: '#b91c1c',
  500: '#dc2626',
  400: '#ef4444',
  300: '#f87171',
};

function RedBar() {
  return <div className="w-12 h-[2px] bg-[#0a0e2a] mb-4" />;
}

function SectionBadge({ children }) {
  return (
    <span className="inline-block text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#0a0e2a]/50 border border-[#0a0e2a]/20 rounded-full px-4 py-1.5 mb-4">
      {children}
    </span>
  );
}

function PartDivider({ id, part, title, ghostNum }) {
  return (
    <div id={id} style={{ background: navy[950] }} className="relative py-28 border-y border-gray-200 scroll-mt-8 overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)',
      }} />
      {ghostNum && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(200px, 30vw, 400px)', fontWeight: 800, color: 'rgba(255,255,255,0.03)', lineHeight: 1 }}>
          {ghostNum}
        </span>
      )}
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <motion.p {...fadeUp()} className="text-red-500 text-sm font-body font-medium uppercase tracking-[0.3em] mb-3">{part}</motion.p>
        <motion.h2 {...fadeUp(0.1)} className="text-4xl md:text-5xl font-heading font-black text-white uppercase tracking-wide">{title}</motion.h2>
        <div className="w-16 h-1 bg-red-500 mx-auto mt-6" />
      </div>
    </div>
  );
}

function Expandable({ number, title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 border-l-4 border-l-[#0a0e2a] rounded-2xl overflow-hidden mb-3 bg-white shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#0a0e2a]/10 font-heading font-black text-3xl">{number}</span>
          {Icon && <Icon size={18} className="text-[#0a0e2a]" />}
          <span className="font-heading font-semibold text-[#0a0e2a] text-base">{title}</span>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 py-5 border-t border-gray-100 bg-gray-50/50">{children}</div>}
    </div>
  );
}

/* --- DATA --- */

const gcHitList = [
  { company: 'Willmeng Construction', person: 'Keyvan Ghahreman', title: 'VP, Operational Excellence', linkedin: 'https://www.linkedin.com/in/keyvan-ghahreman/', builds: 'Commercial, healthcare, higher ed, tenant improvement', talking: 'Employee-owned, 100% ESOP. Reference ASU projects or Banner Health Campus.' },
  { company: 'Willmeng Construction', person: 'Mike Mongelli', title: 'President', linkedin: 'https://www.linkedin.com/in/mike-mongelli/', builds: 'Same', talking: 'Became President in 2020. Company founded 1977.' },
  { company: 'Kitchell Contractors', person: 'Julie Garcia', title: 'VP of Preconstruction', linkedin: 'https://www.linkedin.com/in/julie-garcia/', builds: 'Healthcare, education, government, mixed-use', talking: '18 years in construction. Projects in AZ, CA, TX.' },
  { company: 'Kitchell / Hardison Downey', person: 'Justin Newman', title: 'VP and COO', linkedin: 'https://www.linkedin.com/in/justinnewman/', builds: 'Alt energy, public works, criminal justice', talking: 'Came from McCarthy (17 years). Speak his language.' },
  { company: 'CHASSE Building Team', person: 'Taylor Perkins', title: 'Director of Business Development', linkedin: 'https://www.linkedin.com/in/taylorperkins/', builds: 'Commercial, mixed-use, education, healthcare', talking: '#1 Best Place to Work in AZ (2023). Based in Tempe.' },
  { company: 'CHASSE Building Team', person: 'Barry Chasse', title: 'Founder', linkedin: null, builds: 'Same', talking: 'Founded 2007 on the concept of teamwork.' },
  { company: 'DPR Construction', person: 'TBD (Research needed)', title: 'Regional Leader / Preconstruction', linkedin: 'https://www.linkedin.com/company/dpr-construction/', builds: 'Mission critical, data centers, healthcare, life sciences', talking: 'Net-Zero Energy office in Phoenix. Tech-forward.' },
  { company: 'Sundt Construction', person: 'Melissa Love', title: 'Preconstruction Manager, SW Building Group', linkedin: 'https://www.linkedin.com/in/melissa-love/', builds: 'Healthcare, education, commercial, government', talking: '100+ years in AZ. Employee-owned.' },
  { company: 'McCarthy Building', person: 'Brock Huttenmeyer', title: 'VP Pre-Construction', linkedin: 'https://www.linkedin.com/in/brockhuttenmeyer/', builds: 'Healthcare, mission critical, aviation, municipal', talking: 'One of the largest builders in AZ.' },
  { company: 'McCarthy Building', person: 'Scott Goodall', title: 'Preconstruction Director', linkedin: 'https://www.linkedin.com/in/scott-goodall-b5622266/', builds: 'Same', talking: 'Long track record in Phoenix market.' },
  { company: 'McCarthy Building', person: 'Charlie Crews', title: 'BD Manager (AZ Commercial)', linkedin: null, builds: 'Same', talking: 'Leads relationship-building for AZ commercial. Perfect first contact.' },
  { company: 'Haydon Companies', person: 'Christian Davis', title: 'Exec Dir. of Preconstruction', linkedin: 'https://www.linkedin.com/in/christiandavis/', builds: 'Commercial, mixed-use, entertainment', talking: 'Relocated to Phoenix in 2020 from Atlanta. 15+ years experience.' },
  { company: 'Haydon Companies', person: 'Katie Perry', title: 'Executive Vice President', linkedin: null, builds: 'Same', talking: 'Family-owned since 1991.' },
  { company: 'Layton Construction', person: 'Andrew Geier', title: 'EVP of Preconstruction', linkedin: 'https://www.linkedin.com/in/andrewgeier/', builds: 'Commercial, industrial, healthcare', talking: "SW's #1 largest contractor (ENR). 150 people in Phoenix." },
  { company: 'Layton Construction', person: 'Jimmy Tometich', title: 'EVP (AZ Operations)', linkedin: null, builds: 'Same', talking: 'Leads AZ operations alongside Geier.' },
  { company: 'Hensel Phelps', person: 'Cole Weaver', title: 'Regional VP, Southwest', linkedin: 'https://www.linkedin.com/in/coleweaver/', builds: 'Government, healthcare, aviation, data centers', talking: 'Joined 2007. Self-performing GC.' },
  { company: 'Hensel Phelps', person: 'Anthony Jeffers', title: 'Project Development Director, SW', linkedin: null, builds: 'Same', talking: 'Entry point for new project opportunities.' },
  { company: 'Mortenson', person: 'Ben Goetter', title: 'VP, General Manager (Phoenix)', linkedin: 'https://www.linkedin.com/in/ben-goetter/', builds: 'Data centers, renewable energy, healthcare', talking: '25+ years at Mortenson. All Phoenix BD + preconstruction.' },
  { company: 'Ryan Companies', person: 'Beau Brush', title: 'VP of Construction Ops (Phoenix)', linkedin: null, builds: 'Industrial, office, mixed-use', talking: 'Just broke ground on Phase 2 of 17 North Corporate Center.' },
  { company: 'Ryan Companies', person: 'Chuck Carefoot', title: 'President, Southwest Region', linkedin: null, builds: 'Same', talking: '25+ years in Phoenix market.' },
  { company: 'Wespac Construction', person: 'Garrett Nybo', title: 'President and CEO', linkedin: 'https://www.linkedin.com/in/garrettnybo/', builds: 'Commercial, healthcare, education, hospitality', talking: 'Founded 1991. 85% repeat/referral clients. Tempe-based.' },
  { company: 'Caliente Construction', person: 'Lorraine Bergman', title: 'President and CEO', linkedin: 'https://www.linkedin.com/in/lorrainebergman/', builds: 'Commercial, tenant improvement, renovations', talking: 'Women-Owned Business Enterprise. 4,220+ projects. 34 years in AZ.' },
  { company: 'CoreConstruction', person: 'Todd Steffen', title: 'Director of Preconstruction', linkedin: null, builds: 'Education, government, healthcare', talking: 'Est. 1937. 1,200+ employees. $1.5B+ annual revenue.' },
  { company: 'Okland Construction', person: 'TBD (Research needed)', title: 'Preconstruction Lead', linkedin: 'https://www.linkedin.com/company/okland-construction/', builds: 'Healthcare, commercial, higher ed', talking: 'Founded 1918. Tempe office. Nearly 1,000 employees.' },
  { company: 'Holder Construction', person: 'TBD (Research needed)', title: 'Regional Leader', linkedin: 'https://www.linkedin.com/company/holder-construction/', builds: 'Data centers, mission critical, healthcare', talking: 'Phoenix office since 1999.' },
];

const pmHitList = [
  { company: 'Plaza Companies', person: 'Scott Rubin', title: 'Exec Managing Director, Asset Management', linkedin: 'https://www.linkedin.com/in/scottrubin/', manages: '14M+ sq ft. Medical office, commercial, mixed-use, senior housing.', talking: 'AMO-accredited (top 3% in AZ).' },
  { company: 'ViaWest Group', person: 'Ron (VP Facilities)', title: 'VP, Facilities Management', linkedin: null, manages: 'Commercial office, industrial across Phoenix.', talking: '33+ years facilities experience. Universal HVAC certified himself.' },
  { company: 'ViaWest Group', person: 'Ronald D. Lloyd', title: 'Director, Facilities Management', linkedin: null, manages: 'Same.', talking: 'Direct contact for day-to-day mechanical needs.' },
  { company: 'Lincoln Property Co.', person: 'John Orsak', title: 'Executive VP', linkedin: null, manages: '28M sq ft. Class A office + industrial. AZ, NV, NM.', talking: '23-year CRE veteran. Portfolio valued at $2B+.' },
  { company: 'Transwestern', person: 'Rosie Keller', title: 'SVP, Asset Services', linkedin: 'https://www.linkedin.com/in/rosiekeller/', manages: 'Class A commercial office across Phoenix.', talking: 'Oversees all physical ops, engineering, maintenance. Previously managed 5M+ sq ft.' },
  { company: 'Transwestern', person: 'Mark Stratz', title: 'Managing Director', linkedin: null, manages: 'Same.', talking: 'Oversees all Phoenix expansion.' },
  { company: 'Hines', person: 'Chris Anderson', title: 'Senior Managing Director (AZ + NM)', linkedin: 'https://www.linkedin.com/in/chrisanderson/', manages: 'Premium commercial, mixed-use.', talking: 'Re-joined Hines to oversee AZ/NM operations.' },
  { company: 'Hines', person: 'Darwyn Harp', title: 'Designated Broker / Facility Manager', linkedin: null, manages: '4M+ sq ft commercial.', talking: 'At Hines since 1996. 30 years of property/facility management.' },
  { company: 'Cushman & Wakefield', person: 'Gregory Valladao', title: 'Senior Managing Director', linkedin: null, manages: '190+ professionals. Full-service CRE across Phoenix.', talking: 'Market leader for entire Phoenix operation.' },
  { company: 'JLL', person: 'David Rosato', title: 'SVP, Project and Development Services', linkedin: null, manages: '31,000 sq ft office at The Grove. 120+ professionals.', talking: 'New office build-out signals growth.' },
  { company: 'JLL', person: 'Ryan Timpani', title: 'Managing Director', linkedin: null, manages: 'Same.', talking: 'Regional leadership.' },
  { company: 'Colliers', person: 'Bryce Terveen', title: 'Exec Managing Director, AZ', linkedin: null, manages: 'Office, industrial, retail across Phoenix and Scottsdale.', talking: 'Leads all brokerage operations for AZ.' },
  { company: 'Brookfield Properties', person: 'Dea McDonald', title: 'President, AZ Region', linkedin: null, manages: 'Land development, housing, commercial across AZ.', talking: "One of world's largest RE managers." },
  { company: 'CBRE', person: 'TBD (Research needed)', title: 'Facilities Director', linkedin: 'https://www.linkedin.com/company/cbre/', manages: 'Largest CRE firm globally. Massive Phoenix portfolio.', talking: 'Search LinkedIn for "CBRE Phoenix facilities director."' },
  { company: 'MEB Management', person: 'TBD (Research needed)', title: 'VP Operations', linkedin: null, manages: '23,000+ multi-family units, 1.5M+ sq ft office/retail.', talking: 'AMO Firm. Arizona-based. Massive HVAC service needs.' },
];

const outreachStrategies = [
  {
    num: '01',
    title: 'The Case Study Trap',
    icon: MousePointer,
    desc: 'Send a GC a link to a specific case study on your website. Not the homepage. The case study. They have to hit your website to see it, then they browse.',
    detail: 'Set up UTM parameters per prospect (ambitionac.com/projects/gilmore?utm_source=eric&utm_campaign=willmeng) so Google Analytics shows you exactly which GC clicked, when, and what else they looked at after.',
  },
  {
    num: '02',
    title: 'The Bid Signal',
    icon: Eye,
    desc: 'When you send a bid and then see that company visit your website within 48 hours, that is your signal. They are checking you out.',
    detail: 'Call them the next morning. "Hey, just wanted to see if you had any questions about our proposal." You look responsive, not pushy. Set up a Google Analytics alert for company-level traffic spikes.',
  },
  {
    num: '03',
    title: 'The LinkedIn Warm-Up',
    icon: Linkedin,
    desc: 'Like one of their posts. Comment something technical on another (not "great post" but an actual insight). Then send the connection request.',
    detail: 'By the time they see it, they have already seen your name twice. Response rate doubles vs. cold requests.',
  },
  {
    num: '04',
    title: 'Show Up Where They Already Are',
    icon: Users,
    desc: 'Do not just attend BOMA/IREM/IFMA events. Sponsor a table. Get Mo on a panel. Offer a 10-minute technical presentation at a chapter meeting.',
    detail: '"Common VRF Issues We See in Phoenix Commercial Properties." Now you are the expert in the room, not the guy handing out cards.',
  },
  {
    num: '05',
    title: 'The Reverse Target List',
    icon: Target,
    desc: 'Find which GCs are already following Ambition on social media or have engaged with posts. Those are warm.',
    detail: 'They already know you exist and chose to pay attention. Hit them first before going cold on anyone.',
  },
  {
    num: '06',
    title: 'The "Accidental" Content Play',
    icon: Play,
    desc: 'Mo posts a technical problem he solved today with a photo. No pitch, no CTA, no "call us."',
    detail: 'Just: "Ran into a failed TXV on a 25-ton RTU today. Previous contractor missed it on three service calls. Swapped it out, system running 12 degrees colder on supply." The GC PM scrolling at night sees it and thinks "this guy actually knows his stuff."',
  },
  {
    num: '07',
    title: 'The Print Handoff',
    icon: Printer,
    desc: 'Eric carries printed case studies to every meeting and every event. Each one has a QR code linking to the web version with tracking.',
    detail: 'Physical handoff, digital tracking. You know exactly which printed case study drove which website visit.',
  },
  {
    num: '08',
    title: 'The Bid List Play',
    icon: TrendingUp,
    desc: 'Do not ask "can we get on your bid list?" Ask "what is the best project you have coming up that needs mechanical?"',
    detail: 'You are asking about THEIR work, not yours. They talk, you listen, you follow up with a case study that matches that exact scope. Now you are on the bid list without ever asking.',
  },
];

const linkedinPostIdeas = [
  { title: 'Job site leadership shot', desc: 'Photo of Mo on an active project, hard hat on, reviewing plans. Caption angle: "Every project starts with a plan. But it\'s the people in the field who make it real." Tag the GC if possible.' },
  { title: 'Technical explainer', desc: 'Short video or carousel: "3 things your GC should ask your mechanical sub before signing the contract." Topics: design-build capability, 24/7 response, prefab timeline savings.' },
  { title: 'Team spotlight', desc: 'Photo of a crew member doing brazing or a VRF install. Caption: "Our team has 100+ years combined experience. This is the kind of precision we bring to every job."' },
];

const linkedinGroups = [
  { name: 'Arizona Builders Alliance', why: 'Core AZ construction network. GCs, subs, vendors.' },
  { name: 'BOMA Greater Phoenix', why: 'Building owners/managers who hire mechanical subs.' },
  { name: 'IFMA Greater Phoenix Chapter', why: 'Facilities managers across the Valley. Direct buyers.' },
  { name: 'IREM Greater Phoenix', why: 'Institute of Real Estate Management. Property managers.' },
  { name: 'ASA Arizona (American Subcontractors Association)', why: 'Peer network + direct GC access at events.' },
  { name: 'AZAGC (Associated General Contractors of Arizona)', why: 'The big tent for AZ GCs. Must be visible here.' },
  { name: 'Phoenix Commercial Real Estate Professionals', why: 'CRE brokers, developers, PM firms.' },
  { name: 'Arizona Construction Network', why: 'Broad construction industry group.' },
  { name: 'SMACNA Arizona', why: 'Trade-specific. Shows Ambition is serious about the craft.' },
  { name: 'CoreNet Arizona Chapter', why: 'Corporate real estate. Facility decision-makers.' },
];

const events = [
  { event: 'ASA Spring Golf Tournament', date: 'Mar 26, 2026', location: 'Verrado Golf Club, Buckeye', who: 'GCs, subs, suppliers', why: 'Face time with GC PMs and estimators.', link: 'https://www.asaaz.org/events' },
  { event: 'ASA Partners in Construction: Job Site Mgmt', date: 'Mar 31, 2026', location: 'DIVERGE at Hensel Phelps', who: 'GCs, subs', why: 'Hensel Phelps hosting. Direct access to a target GC.', link: 'https://www.asaaz.org/events' },
  { event: 'ASA Spring Mixer', date: 'Apr 2, 2026', location: "Luci's at the Orchard, Phoenix", who: 'GCs, subs, vendors', why: 'Low-key networking. Show up, shake hands, leave with cards.', link: 'https://www.asaaz.org/events' },
  { event: 'ASA University: Bonded Projects', date: 'Apr 8, 2026', location: 'Sun Valley Builders', who: 'Subs, legal, GC reps', why: 'Learn bonding, meet peers.', link: 'https://www.asaaz.org/events' },
  { event: 'IFMA Phoenix Monthly Meeting', date: 'Apr 8, 2026', location: 'TBD (12:00-1:00 PM)', who: 'Facilities managers', why: 'Direct access to the people who call for HVAC service.', link: 'https://ifmaphoenix.org/' },
  { event: 'Arizona Construction Summit', date: 'Apr 9, 2026', location: 'Grand Canyon University', who: 'Construction owners, leaders', why: 'Industry expert speakers. Decision-makers in one room.', link: null },
  { event: 'ASA Awards Gala: Masquerade Ball', date: 'Apr 30, 2026', location: 'Clayton House, Scottsdale', who: 'GCs, subs, industry leaders', why: 'Premier event. Get a table. Be visible.', link: 'https://www.asaaz.org/events' },
  { event: 'IREM Phoenix Golf Outing', date: 'May 8, 2026', location: 'Talking Stick Golf Club', who: 'Property managers, RE managers', why: 'Property managers = recurring mechanical revenue.', link: 'https://iremphx.org/' },
  { event: 'IFMA Phoenix Monthly Meeting', date: 'May 13, 2026', location: 'TBD (12:00-1:00 PM)', who: 'Facilities managers', why: 'Second IFMA networking.', link: 'https://ifmaphoenix.org/' },
  { event: 'BOMA Industry Luncheon', date: 'TBD (check bomaphoenix.org)', location: 'Arizona Country Club', who: 'Building owners, PMs, engineers', why: 'FREE for PMs/engineers.', link: 'https://www.bomaphoenix.org/' },
  { event: 'GC Expo (ASA + ABA + AMCA)', date: 'TBD 2026', location: 'TBD', who: '400+ companies, 1,000+ attendees', why: 'THE event for subs to meet GCs face-to-face. Get a booth.', link: 'https://www.asaaz.org/events' },
];

const competitors = [
  { name: 'Climatec (Bosch)', followers: '7,250', doing: 'Employee spotlights, community involvement, corporate updates. Professional but corporate.', gap: "They feel like a big company. Ambition is the local, hungry, technical alternative.", category: 'Corporate Giant' },
  { name: 'Comfort Systems USA SW', followers: 'Active', doing: 'Leveraging NYSE-traded parent brand. Corporate content. Large footprint.', gap: "They are big. Ambition is nimble, personal, and available.", category: 'Corporate Giant' },
  { name: 'Pueblo Mechanical (Modigent)', followers: 'Active', doing: "Private equity-backed. Expanding through acquisitions. #4 on PBJ list.", gap: "PE rollup = culture loss. Ambition is founder-led, culture-first.", category: 'PE-Backed' },
  { name: 'Chas Roberts', followers: '1,155', doing: 'Mostly residential brand. Family-owned since 1942.', gap: 'They dominate residential. Ambition owns commercial. No overlap.', category: 'Residential' },
  { name: 'Midstate Mechanical', followers: 'Moderate', doing: 'Clean website. Founded 1986. Focused on commercial HVAC/plumbing.', gap: 'Similar size. Ambition differentiates with content and BD hustle.', category: 'Direct Competitor' },
  { name: 'Tempe Mechanical', followers: 'Low', doing: 'Basic web presence. Retrofit and service focus.', gap: 'Not marketing aggressively. Ambition can out-hustle.', category: 'Local' },
  { name: 'Wolff Mechanical', followers: 'Low', doing: 'East Valley focused. Basic digital presence.', gap: 'No serious social or content game.', category: 'Local' },
  { name: 'North Valley Mechanical', followers: 'Low', doing: '24/7 service. Basic web presence.', gap: 'No LinkedIn game. No content. No brand.', category: 'Local' },
];

const missionStatements = [
  { num: '01', tagline: 'Built different. Built to last.', why: "Short, memorable, ownable. Speaks to both the construction work and the identity as a different kind of contractor.", rec: 'Brand tagline' },
  { num: '02', tagline: "Your building's mechanical system is only as good as the team behind it.", why: 'Puts the focus on people. Resonates with PMs burned by unreliable subs.', rec: null },
  { num: '03', tagline: 'Engineering comfort. Advancing buildings.', why: '"Engineering" signals technical depth. "Comfort" grounds it. "Advancing" signals innovation.', rec: null },
  { num: '04', tagline: 'Precision mechanical for the projects that matter.', why: '"Precision" signals quality over quantity. "Projects that matter" positions as premium.', rec: null },
  { num: '05', tagline: "We don't just install systems. We build reputations.", why: "Speaks directly to what GCs care about. Their reputation rides on their subs.", rec: 'Sales positioning' },
];

const aomCommitments = [
  { item: 'Website Live', detail: 'Full site launch with case studies', type: 'one-time', status: 'complete' },
  { item: 'Case Studies', detail: '3 large, 3 medium, 3 small', type: 'one-time', status: 'in-progress' },
  { item: 'Google Analytics Setup', detail: 'GA4 + LinkedIn Insight Tag via GTM', type: 'one-time', status: 'upcoming' },
  { item: 'Mission Statement Research', detail: '5 options based on competitor/client analysis', type: 'one-time', status: 'complete' },
  { item: 'Weekly Reports', detail: 'Automated every Friday via email', type: 'ongoing', status: 'upcoming' },
  { item: 'LinkedIn Strategy Execution', detail: 'Content pillars, connection targets, post cadence', type: 'ongoing', status: 'in-progress' },
  { item: 'Print Case Studies', detail: 'For in-person meetings and events', type: 'one-time', status: 'needs-meeting' },
];


/* --- COMPONENTS --- */

function HitListTable({ data, type }) {
  const isGC = type === 'gc';
  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[15px] min-w-[900px]">
          <thead>
            <tr className="bg-[#0a0e2a]">
              <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Company</th>
              <th className="py-3 px-3 font-heading font-semibold text-white text-sm">{isGC ? 'What They Build' : 'What They Manage'}</th>
              <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Talking Point</th>
              <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Decision Maker & Title</th>
              <th className="py-3 px-3 font-heading font-semibold text-white text-sm w-24">LinkedIn</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="py-3 px-3 font-semibold text-[#0a0e2a] whitespace-nowrap text-[14px]">{row.company}</td>
                <td className="py-3 px-3 text-gray-600 text-[13px]">{isGC ? row.builds : row.manages}</td>
                <td className="py-3 px-3 text-[13px] text-gray-500 italic">{row.talking}</td>
                <td className="py-3 px-3 text-[14px]">
                  <span className="text-[#0a0e2a] font-medium">{row.person}</span>
                  <br />
                  <span className="text-gray-400 text-[12px]">{row.title}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  {row.linkedin ? (
                    <a href={row.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                      <ExternalLink size={12} /> View
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">Needs research</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* --- MAIN PAGE --- */

export default function BriefAmbitionStrategy() {
  useSEO();

  return (
    <div className="min-h-screen bg-white">

      {/* == HERO (Navy - the ONE dark section) == */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${navy[950]}, ${navy[800]}, ${navy[950]})` }}>
        {/* Thin red bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 z-10" />
        {/* Diagonal line texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)',
        }} />
        {/* Ghost BD watermark */}
        <span className="absolute top-1/2 right-[5%] -translate-y-1/2 pointer-events-none select-none"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(200px, 30vw, 400px)', fontWeight: 800, color: 'rgba(255,255,255,0.03)', lineHeight: 1 }}>
          BD
        </span>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-28 md:pt-28 md:pb-36">
          <motion.a {...fadeUp()} href="/briefs" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-12">
            <ArrowLeft size={16} /> All Briefs
          </motion.a>

          <motion.div {...fadeUp(0.1)} className="mb-2">
            <span className="text-white/40 text-xs font-body font-medium uppercase tracking-[0.3em]">Ambition Mechanical x AOM</span>
          </motion.div>

          <motion.h1 {...fadeUp(0.15)} className="text-7xl md:text-[10rem] font-heading font-black leading-[0.95] mb-4 tracking-tight"
            style={{ color: '#dc2626', textShadow: '0 0 80px rgba(220,38,38,0.3)' }}>
            AMBITION
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="text-sm md:text-base font-heading font-semibold text-white/50 mb-4 uppercase tracking-[0.25em]">
            Business Development Playbook
          </motion.p>

          <motion.p {...fadeUp(0.25)} className="text-base md:text-lg text-white/50 max-w-2xl leading-relaxed mb-10 font-body">
            Built from our March 21 strategy session. Everything we discussed, organized, researched, and ready to execute.
          </motion.p>

          {/* Two navigation cards */}
          <motion.div {...fadeUp(0.3)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 max-w-xl">
            <a
              href="#meeting-recap"
              className="group bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/40 rounded-xl px-6 py-5 transition-all"
            >
              <p className="text-white font-heading font-bold text-lg mb-1">Meeting Recap</p>
              <p className="text-white/40 text-sm font-body group-hover:text-white/60 transition-colors">What we discussed and committed to</p>
            </a>
            <a
              href="#playbook"
              className="group bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500/50 rounded-xl px-6 py-5 transition-all"
            >
              <p className="text-white font-heading font-bold text-lg mb-1">The Playbook</p>
              <p className="text-white/40 text-sm font-body group-hover:text-white/60 transition-colors">Events, contacts, strategies, intel</p>
            </a>
          </motion.div>

          {/* Stat boxes */}
          <motion.div {...fadeUp(0.35)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '27', l: 'GC Contacts' },
              { n: '15', l: 'PM Contacts' },
              { n: '12', l: 'Events Mapped' },
              { n: '8', l: 'Competitors Scanned' },
            ].map((s, i) => (
              <div key={i} className="backdrop-blur-sm bg-white/[0.07] border border-white/[0.12] rounded-xl px-5 py-4 text-center">
                <p className="text-2xl md:text-3xl font-heading font-bold text-red-500">{s.n}</p>
                <p className="text-white/50 text-sm font-body mt-1">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* == WHY THIS MATTERS (Light) == */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <SectionBadge>The Opportunity</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Zap size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">Why This Matters</h2>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-red-400 rounded-t-2xl" />
              <p className="text-3xl font-heading font-bold text-[#0a0e2a] mb-2">$205B+</p>
              <p className="text-[#0a0e2a] font-semibold mb-2">Phoenix Construction Boom</p>
              <p className="text-gray-600 text-[15px] leading-relaxed">Semiconductor investment alone through end of decade. TSMC, KoMiCo, data centers, infrastructure. Every one of these projects needs mechanical contractors.</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-red-400 rounded-t-2xl" />
              <p className="text-3xl font-heading font-bold text-[#0a0e2a] mb-2">71%</p>
              <p className="text-[#0a0e2a] font-semibold mb-2">Generational Shift</p>
              <p className="text-gray-600 text-[15px] leading-relaxed">Millennials and Gen Z now make up 71% of the construction workforce. They evaluate subs on LinkedIn, not at the golf course. Digital presence is now a buying signal.</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-red-400 rounded-t-2xl" />
              <p className="text-3xl font-heading font-bold text-[#0a0e2a] mb-2">0</p>
              <p className="text-[#0a0e2a] font-semibold mb-2">Competitors Doing This</p>
              <p className="text-gray-600 text-[15px] leading-relaxed">Nobody in Phoenix commercial mechanical is doing real content marketing. Climatec posts corporate updates. Everyone else is invisible. Ambition has first-mover advantage in a $39B+ market.</p>
            </div>
          </motion.div>

          <motion.p {...fadeUp(0.2)} className="text-gray-600 text-[16px] leading-relaxed mt-8 max-w-3xl">
            The assistant PM who is 28 years old and making her first vendor recommendation does not have a Rolodex. She has LinkedIn and Google. If Ambition shows up there with case studies, technical knowledge, and a professional brand, you are on her shortlist. If you do not show up there, you do not exist to her.
          </motion.p>
        </div>
      </section>

      {/* ========================================= */}
      {/* PART 1: MEETING RECAP                     */}
      {/* ========================================= */}
      <PartDivider id="meeting-recap" part="Part 1" title="Meeting Recap" ghostNum="1" />

      {/* Recap Intro */}
      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.p {...fadeUp()} className="text-gray-500 text-[16px] leading-relaxed border-l-2 border-red-500/40 pl-6">
            Everything from the March 21 strategy session with Eric, Mo, and Patrik. Key decisions, commitments, LinkedIn strategy, reporting, pricing, and next steps.
          </motion.p>
        </div>
      </section>

      {/* 1. What Was Discussed */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="mb-16 relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              01
            </span>
            <SectionBadge>Section 1</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">What Was Discussed</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 font-body">Key decisions and direction from the March 21 strategy session with Eric, Mo, and Patrik.</p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[
                { quote: '"Quality over quantity."', who: 'Eric' },
                { quote: '"I want to know who\'s clicking."', who: 'Eric' },
                { quote: '"Put him in a suit without a tie."', who: 'Eric (on Mo\'s content look)' },
                { quote: '"I want to know what my return on investment is."', who: 'Eric' },
              ].map((q, i) => (
                <div key={i} className="relative border-l-4 border-red-500 px-5 py-4 rounded-r-2xl bg-slate-50">
                  <span className="absolute -top-2 left-4 text-red-500/10 font-heading text-6xl font-black leading-none">"</span>
                  <p className="relative text-[16px] font-heading font-semibold text-[#0a0e2a] italic">{q.quote}</p>
                  <p className="relative text-xs text-gray-400 mt-1 uppercase tracking-wider">{q.who}, Mar 21</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <h4 className="font-heading font-bold text-[#0a0e2a] mb-4">Key Decisions</h4>
              <ul className="space-y-3 text-[15px] text-gray-700">
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" /> LinkedIn is the primary channel. 75% of effort goes there. GC project managers, property managers, and facility directors live on LinkedIn.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" /> Case studies are the centerpiece. Not claims. Proof. Before/during/after, tag the GC, track who clicks.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" /> Mo in a blazer on the job site. Professional but not corporate. Pattern interrupt against every other contractor on social.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" /> Google Analytics + LinkedIn Insight Tag on the site. Track who visits, which companies, what they look at. Cross-reference with active bids.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" /> $500/month Google Ads test budget. Commercial keywords only. No residential. Dedicated landing page, not the homepage.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" /> Weekly reports to Eric. Every Friday. Website traffic, LinkedIn engagement, social media stats, action items from AOM.</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. What AOM Committed To */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              02
            </span>
            <SectionBadge>Section 2</SectionBadge>
            <RedBar />
            <h2 className="text-2xl font-heading font-bold text-[#0a0e2a] mb-6">What AOM Committed To</h2>

            <div className="space-y-3">
              {aomCommitments.map((c, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl px-5 py-4 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
                  <div className="shrink-0">
                    {c.status === 'complete' ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : c.status === 'in-progress' ? (
                      <Play size={20} className="text-yellow-600" />
                    ) : c.status === 'needs-meeting' ? (
                      <MessageSquare size={20} className="text-blue-500" />
                    ) : (
                      <Clock size={20} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0a0e2a] text-[15px]">{c.item}</p>
                    <p className="text-[13px] text-gray-500 mt-0.5">{c.detail}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      c.type === 'ongoing' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>{c.type === 'ongoing' ? 'Ongoing' : 'One-time'}</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      c.status === 'complete' ? 'bg-green-50 text-green-700' :
                      c.status === 'in-progress' ? 'bg-yellow-50 text-yellow-700' :
                      c.status === 'needs-meeting' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{
                      c.status === 'complete' ? 'Done' :
                      c.status === 'in-progress' ? 'In Progress' :
                      c.status === 'needs-meeting' ? 'Needs Meeting' :
                      'Upcoming'
                    }</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. LinkedIn Playbook */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              03
            </span>
            <SectionBadge>Section 3</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Linkedin size={24} className="text-[#0077b5]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">LinkedIn Playbook</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 max-w-3xl font-body">
              LinkedIn is the primary channel. 75% of effort goes here. GC project managers, property managers, and facility directors live on LinkedIn. AOM handles connection outreach and engagement on your behalf.
            </p>
          </motion.div>

          {/* Strategy Overview */}
          <motion.div {...fadeUp(0.1)} className="mb-10">
            <h3 className="text-xl font-heading font-bold text-[#0a0e2a] mb-4">What AOM Is Doing</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { phase: 'Phase 1: Build (Weeks 1-4)', desc: 'Connect with all BOMA, IREM, IFMA chapter members. Connect with PMs and estimators at top 20 GCs. Target: 200+ new connections in Month 1.' },
                { phase: 'Phase 2: Engage (Weeks 2-8)', desc: 'Comment on every post from target GCs and PM firms. Share and tag their project announcements. No pitching. Add value. Be visible.' },
                { phase: 'Phase 3: Convert (Weeks 4-12)', desc: 'Personalized messages referencing specific projects. Share matching case studies. Invite to site tours or lunch-and-learns.' },
              ].map((p, i) => (
                <div key={i} className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
                  <p className="text-[#0a0e2a]/60 text-xs font-semibold uppercase tracking-wider mb-2">{p.phase}</p>
                  <p className="text-gray-600 text-[14px] leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Post Ideas */}
          <motion.div {...fadeUp(0.15)} className="mb-10">
            <h3 className="text-xl font-heading font-bold text-[#0a0e2a] mb-4">Post Ideas for Mo</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {linkedinPostIdeas.map((p, i) => (
                <div key={i} className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
                  <p className="font-heading font-semibold text-[#0a0e2a] mb-2">{p.title}</p>
                  <p className="text-[14px] text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Groups */}
          <motion.div {...fadeUp(0.2)}>
            <h3 className="text-xl font-heading font-bold text-[#0a0e2a] mb-4">10 Groups to Join</h3>
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              {linkedinGroups.map((g, i) => (
                <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${i < linkedinGroups.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-[#0a0e2a] font-heading font-bold text-sm w-6">{i + 1}</span>
                  <div>
                    <span className="text-[15px] text-[#0a0e2a] font-medium">{g.name}</span>
                    <span className="text-gray-400 text-[13px] ml-3">{g.why}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. Weekly Report */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              04
            </span>
            <SectionBadge>Section 4</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">Weekly Report</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 max-w-3xl font-body">
              Here is what the automated weekly report will look like. Delivered every Friday via email. Real numbers, real insights, no fluff.
            </p>
          </motion.div>

          {/* Visual report mockup - WHITE */}
          <motion.div {...fadeUp(0.1)} className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            {/* Report header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#0a0e2a] flex items-center justify-center">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[#0a0e2a] font-heading font-bold text-lg">Ambition Mechanical Weekly Report</p>
                  <p className="text-gray-400 text-sm">Week of March 24 - 28, 2026</p>
                </div>
              </div>
              <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">Automated</span>
            </div>

            {/* Website Analytics */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-[#0a0e2a]" />
                <p className="text-[#0a0e2a] text-sm font-semibold uppercase tracking-wider">Website Analytics</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Page Views', value: '---', sub: 'Total this week' },
                  { label: 'Unique Visitors', value: '---', sub: 'New + returning' },
                  { label: 'Top Page', value: '---', sub: 'Most visited' },
                  { label: 'Avg. Time on Site', value: '---', sub: 'Minutes' },
                ].map((m, i) => (
                  <div key={i} className="rounded-lg p-4 bg-slate-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">{m.label}</p>
                    <p className="text-[#0a0e2a] font-heading font-bold text-xl">{m.value}</p>
                    <p className="text-gray-400 text-xs mt-1">{m.sub}</p>
                  </div>
                ))}
              </div>
              {/* Advanced tracking callout */}
              <div className="rounded-lg p-4 bg-blue-50 border border-blue-100">
                <p className="text-blue-800 text-sm font-semibold mb-2">Advanced Tracking Capabilities</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Building2, label: 'Company-Level Visitor ID', desc: 'See which companies visit' },
                    { icon: Target, label: 'UTM Campaign Tracking', desc: 'Track per-prospect clicks' },
                    { icon: Eye, label: 'Bid Signal Detection', desc: 'Post-bid visit alerts' },
                    { icon: Activity, label: 'Behavior Flow', desc: 'What they browse after landing' },
                  ].map((t, i) => {
                    const TIcon = t.icon;
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <TIcon size={14} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-blue-800 text-xs font-medium">{t.label}</p>
                          <p className="text-blue-600 text-[11px]">{t.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LinkedIn Metrics */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Linkedin size={16} className="text-[#0077b5]" />
                <p className="text-[#0a0e2a] text-sm font-semibold uppercase tracking-wider">LinkedIn Metrics</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Profile Views', value: '---' },
                  { label: 'Post Engagement', value: '---' },
                  { label: 'Follower Growth', value: '---' },
                  { label: 'New Connections', value: '---' },
                  { label: 'People Invited to Profile', value: '---' },
                ].map((m, i) => (
                  <div key={i} className="rounded-lg p-4 bg-slate-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">{m.label}</p>
                    <p className="text-[#0a0e2a] font-heading font-bold text-xl">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[#0a0e2a]" />
                <p className="text-[#0a0e2a] text-sm font-semibold uppercase tracking-wider">Social Media (Instagram / TikTok)</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Total Views', value: '---' },
                  { label: 'Engagement Rate', value: '---' },
                  { label: 'New Followers', value: '---' },
                ].map((m, i) => (
                  <div key={i} className="rounded-lg p-4 bg-slate-50 border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">{m.label}</p>
                    <p className="text-[#0a0e2a] font-heading font-bold text-xl">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="text-green-600" />
                <p className="text-[#0a0e2a] text-sm font-semibold uppercase tracking-wider">Action Items from AOM</p>
              </div>
              <div className="space-y-3">
                {[
                  'Review data and adjust strategy based on top-performing content',
                  'Follow up on any website visitors that match active bid targets',
                  'Schedule next content shoot based on engagement patterns',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-gray-600 text-[14px]">
                    <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.p {...fadeUp(0.2)} className="text-gray-400 text-sm mt-4 italic">
            Delivered automatically every Friday via email as long as the system is running. Action items come from AOM based on data analysis.
          </motion.p>
        </div>
      </section>

      {/* 5. Pricing */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              05
            </span>
            <SectionBadge>Section 5</SectionBadge>
            <RedBar />
            <h2 className="text-2xl font-heading font-bold text-[#0a0e2a] mb-6">Pricing</h2>
            <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <p className="text-[#0a0e2a] text-xs uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
                <DollarSign size={14} />
                Current Rate: $2,000/month
              </p>

              <p className="text-gray-700 text-[16px] leading-relaxed mb-4">For $2,000/month, AOM is delivering:</p>

              <div className="grid md:grid-cols-2 gap-3 mb-6">
                {[
                  'Video production and content shoots',
                  'Social media management (LinkedIn, Instagram, TikTok)',
                  'Market research and competitive analysis',
                  'Google Analytics setup and tracking',
                  'Strategy development and BD planning',
                  'LinkedIn management and outreach',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-gray-700 text-[14px]">
                    <CheckCircle2 size={14} className="text-green-600 mt-1 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-gray-500 text-[15px] leading-relaxed">
                  Rate and scope to be reviewed at end of Q2 based on performance data and evolving service requirements.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. What We Need From You */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              06
            </span>
            <SectionBadge>Section 6</SectionBadge>
            <RedBar />
            <h2 className="text-2xl font-heading font-bold text-[#0a0e2a] mb-6">What We Need From You</h2>
            <div className="rounded-2xl p-6 bg-white border-2 border-red-200 shadow-sm">
              <ul className="space-y-5 text-[15px] text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-red-500 font-heading font-bold text-lg mt-[-2px]">1</span>
                  <span><strong className="text-[#0a0e2a]">Set up $500/month Google Ads budget.</strong> We handle campaign setup, targeting, and optimization. You fund the spend through your Google Ads account.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 font-heading font-bold text-lg mt-[-2px]">2</span>
                  <span><strong className="text-[#0a0e2a]">Send PDF of Phoenix Business Journal contact list.</strong> Any GC or CRE contacts Eric has from PBJ events or subscriptions. We will cross-reference with our hit list.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 font-heading font-bold text-lg mt-[-2px]">3</span>
                  <span><strong className="text-[#0a0e2a]">Book content shoots.</strong> We need Mo and the team on active job sites for 2-3 hours per shoot. Coordinate with AOM on scheduling.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ========================================= */}
      {/* PART 2: BUSINESS DEVELOPMENT PLAYBOOK     */}
      {/* ========================================= */}
      <PartDivider id="playbook" part="Part 2" title="Business Development Playbook" ghostNum="2" />

      {/* 1. Events Calendar (FIRST) */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              01
            </span>
            <SectionBadge>Section 1</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">Events Calendar</h2>
            </div>
            <p className="text-gray-500 text-lg mb-2 max-w-3xl font-body">
              Where to show up and who you will meet. Register for the first 5 this week.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px] min-w-[850px]">
                <thead>
                  <tr className="bg-[#0a0e2a]">
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Event</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Date</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Location</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Who Attends</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Why It Matters</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm w-20">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="py-3 px-3 font-semibold text-[#0a0e2a]">{e.event}</td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{e.date}</td>
                      <td className="py-3 px-3 text-gray-500">{e.location}</td>
                      <td className="py-3 px-3 text-gray-500">{e.who}</td>
                      <td className="py-3 px-3 text-gray-400 italic">{e.why}</td>
                      <td className="py-3 px-3 text-center">
                        {e.link ? (
                          <a href={e.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                            <ExternalLink size={12} /> View
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">TBD</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Speaking Opportunities (NEW) */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              02
            </span>
            <SectionBadge>Section 2</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Mic size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">Speaking Opportunities</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 max-w-3xl font-body">
              Do not just attend events. Get Mo in front of the room. A 10-minute technical presentation turns him from "another sub" into "the expert."
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="grid md:grid-cols-2 gap-5 mb-8">
            {[
              {
                title: 'BOMA / IREM / IFMA Chapter Meetings',
                desc: 'Offer a 10-minute technical presentation at monthly chapter meetings. Topics like "Common VRF Issues We See in Phoenix Commercial Properties" or "5 Signs Your Building\'s HVAC System is Costing You Money." These groups meet monthly and are always looking for speakers.',
                action: 'Contact chapter program chairs to get on the speaker schedule.',
              },
              {
                title: 'ASA Events and Panels',
                desc: 'ASA hosts multiple events per quarter. The Partners in Construction series and University series both feature industry speakers. Position Mo as a subject matter expert on mechanical systems for commercial projects.',
                action: 'Target: ASA Partners in Construction (Mar 31 at Hensel Phelps) as the first speaking opportunity.',
              },
              {
                title: 'Arizona Construction Summit',
                desc: 'Annual event at GCU (Apr 9) with construction owners and leaders. Get Mo on a panel or as a breakout speaker. Decision-makers are concentrated in one room for an entire day.',
                action: 'Apply for panel or breakout session through the event organizer.',
              },
              {
                title: 'Sponsor a Table at the ASA Awards Gala',
                desc: 'The Masquerade Ball (Apr 30) is the premier ASA event. Sponsoring a table puts Ambition at the center of the networking. Invite target GCs and PMs to sit with you.',
                action: 'Budget for table sponsorship. Invite 3-4 key prospects from the GC Hit List.',
              },
            ].map((opp, i) => (
              <div key={i} className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
                <h4 className="font-heading font-bold text-[#0a0e2a] text-[16px] mb-2">{opp.title}</h4>
                <p className="text-gray-600 text-[14px] leading-relaxed mb-3">{opp.desc}</p>
                <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                  <Zap size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-red-600 font-medium">{opp.action}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="rounded-2xl p-5 bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300">
            <h4 className="font-heading font-bold text-[#0a0e2a] mb-3">Suggested Talk Topics</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                'Common VRF Issues We See in Phoenix Commercial Properties',
                '5 Signs Your Building\'s HVAC System is Costing You Money',
                'Mechanical Best Practices for Arizona\'s Extreme Climate',
                'What GCs Should Ask Their Mechanical Sub Before Signing',
                'Energy Efficiency Upgrades That Pay for Themselves in 12 Months',
                'The Hidden Cost of Deferred HVAC Maintenance in Commercial Buildings',
              ].map((topic, i) => (
                <div key={i} className="flex items-start gap-2 text-gray-600 text-[14px]">
                  <FileText size={14} className="text-[#0a0e2a] mt-0.5 shrink-0" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. GC Hit List */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              03
            </span>
            <SectionBadge>Section 3</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Crosshair size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">GC Hit List</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 max-w-3xl font-body">
              We researched every major GC in Phoenix metro, identified decision-makers, and mapped them to your capabilities. This is your prospecting list, ready to work.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <HitListTable data={gcHitList} type="gc" />
          </motion.div>
          <motion.p {...fadeUp(0.15)} className="text-sm text-gray-400 mt-4">
            25 contacts across 17 companies. "TBD" items: search "[Name] [Company] Phoenix" on LinkedIn to find and connect.
          </motion.p>
        </div>
      </section>

      {/* 4. PM Hit List */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              04
            </span>
            <SectionBadge>Section 4</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Building2 size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">Property Management Hit List</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 max-w-3xl font-body">
              Property management is a different angle for revenue. These firms hire mechanical subs for ongoing maintenance, retrofits, and 24/7 emergency service. The play: Ambition becomes their go-to mechanical partner for their entire portfolio. One relationship here equals recurring revenue for years.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <HitListTable data={pmHitList} type="pm" />
          </motion.div>
          <motion.p {...fadeUp(0.15)} className="text-sm text-gray-400 mt-4">
            15 contacts across 11 firms covering medical office, commercial, industrial, and Class A portfolios.
          </motion.p>
        </div>
      </section>

      {/* 5. Competitor Intel */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              05
            </span>
            <SectionBadge>Section 5</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Search size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">Competitor Intel</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 max-w-3xl font-body">
              Who else is marketing to these same targets, and where they are falling short.
            </p>
          </motion.div>

          {/* Competitor comparison grid */}
          <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px] min-w-[700px]">
                <thead>
                  <tr className="bg-[#0a0e2a]">
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Competitor</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Type</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">LinkedIn</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">What They Do</th>
                    <th className="py-3 px-3 font-heading font-semibold text-white text-sm">Ambition's Edge</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c, i) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="py-3 px-3 font-semibold text-[#0a0e2a] whitespace-nowrap">{c.name}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        c.category === 'Corporate Giant' ? 'bg-blue-50 text-blue-600' :
                        c.category === 'PE-Backed' ? 'bg-purple-50 text-purple-600' :
                        c.category === 'Direct Competitor' ? 'bg-yellow-50 text-yellow-700' :
                        c.category === 'Residential' ? 'bg-green-50 text-green-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>{c.category}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{c.followers}</td>
                    <td className="py-3 px-3 text-gray-500 text-[13px]">{c.doing}</td>
                    <td className="py-3 px-3 text-green-700 font-medium text-[13px]">{c.gap}</td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="rounded-2xl p-6 bg-[#0a0e2a]">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-red-500" />
              <h4 className="text-white font-heading font-bold text-lg">The Bottom Line</h4>
            </div>
            <p className="text-white/80 text-[16px] leading-relaxed">
              Nobody in Phoenix commercial mechanical is doing real content marketing. Ambition has the opportunity to be the ONLY commercial mechanical contractor in Phoenix with real job site content, a founder story, LinkedIn thought leadership, professional case studies, and active social media. This is a massive first-mover advantage.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 6. Mission Statements */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              06
            </span>
            <SectionBadge>Section 6</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Shield size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">Mission Statements</h2>
            </div>
          </motion.div>

          {/* Eric's quote */}
          <motion.div {...fadeUp(0.05)} className="relative border-l-4 border-red-500 pl-6 py-4 mb-8 rounded-r-2xl bg-white shadow-sm">
            <span className="absolute -top-2 left-4 text-red-500/10 font-heading text-6xl font-black leading-none">"</span>
            <p className="relative text-[#0a0e2a] text-[17px] font-heading italic leading-relaxed">
              "I really want him to come up with the mission statement based on this... he can come up with like 5 and then I want you to pick one. And then we're gonna own it."
            </p>
            <p className="relative text-gray-400 text-sm mt-2 uppercase tracking-wider">Eric, Mar 21 Strategy Session</p>
          </motion.div>

          <p className="text-gray-500 text-[16px] mb-8 max-w-3xl font-body">
            Five options based on how your target clients describe their own values. Each one was tested against what GCs and property managers care about most. Pick one, and we run with it everywhere.
          </p>

          <div className="grid gap-5">
            {missionStatements.map((m, i) => (
              <motion.div key={i} {...fadeUp(i * 0.06)} className={`rounded-2xl p-6 bg-white shadow-sm border hover:shadow-lg transition-all duration-300 ${m.rec ? 'border-red-300 ring-1 ring-red-100 hover:border-red-400' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-heading font-bold ${m.rec ? 'text-red-500' : 'text-gray-400'}`}>Option {m.num}</span>
                  {m.rec && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">{m.rec}</span>}
                </div>
                <p className="text-xl md:text-2xl font-heading font-bold leading-snug mb-3 text-[#0a0e2a]">"{m.tagline}"</p>
                <p className="text-[14px] leading-relaxed text-gray-500">{m.why}</p>
              </motion.div>
            ))}
          </div>

          <motion.p {...fadeUp(0.4)} className="text-sm text-gray-400 mt-6 leading-relaxed">
            <span className="font-semibold text-gray-600">Recommendation:</span> Use Option 01 as the brand tagline (TikTok bio, hard hat sticker, proposal cover) and Option 05 as the sales positioning line (case study headers, sales conversations). Both work together.
          </motion.p>
        </div>
      </section>

      {/* 7. Outreach Strategies (LAST - Expandable/Accordion) */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()} className="relative">
            <span className="absolute -top-8 -left-2 pointer-events-none select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 140, fontWeight: 800, color: 'rgba(10,14,42,0.04)', lineHeight: 1 }}>
              07
            </span>
            <SectionBadge>Section 7</SectionBadge>
            <RedBar />
            <div className="flex items-center gap-3 mb-3">
              <Target size={24} className="text-[#0a0e2a]" />
              <h2 className="text-3xl font-heading font-bold text-[#0a0e2a]">8 Outreach Strategies</h2>
            </div>
            <p className="text-gray-500 text-lg mb-8 max-w-3xl font-body">
              These are not email templates. These are strategic plays. Each one is designed to put Ambition in front of the right people at the right time with the right proof. Click any strategy to expand.
            </p>
          </motion.div>

          <div>
            {outreachStrategies.map((s, i) => (
              <motion.div key={i} {...fadeUp(i * 0.04)}>
                <Expandable number={s.num} title={s.title} icon={s.icon}>
                  <p className="text-gray-700 text-[15px] leading-relaxed mb-3">{s.desc}</p>
                  <p className="text-gray-500 text-[14px] leading-relaxed">{s.detail}</p>
                </Expandable>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* == FOOTER == */}
      <div className="relative py-12 border-t border-gray-200 bg-[#0a0e2a] overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)',
        }} />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="w-12 h-[2px] bg-red-500 mx-auto mb-4" />
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">Prepared by</p>
          <p className="text-white/60 text-sm font-body">AOM (Ahead of Market) | March 2026</p>
          <p className="text-white/30 text-xs mt-4">ambitionac.com | (480) 600-2942 | 437 S. 48th St., Suite 101, Tempe, AZ 85281</p>
        </div>
      </div>
    </div>
  );
}
