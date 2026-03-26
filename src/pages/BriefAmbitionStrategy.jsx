import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Target, Zap, Calendar, Mail,
  Linkedin, Search, Camera, FileText, CheckCircle2, MessageSquare,
  ChevronDown, ChevronUp, ExternalLink, Crosshair, Shield
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
    setMeta('description', 'Ambition Mechanical market strategy and business development playbook. GC hit list, PM contacts, outreach templates, events, competitor intel, and meeting recap.');
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

function OrangeBar() {
  return <div className="w-12 h-[2px] bg-aom-orange mb-4" />;
}

function SectionKicker({ children }) {
  return <p className="text-xs font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-4">{children}</p>;
}

function PartDivider({ part, title }) {
  return (
    <div className="bg-[#0a0f1a] py-20 border-y border-white/5">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <motion.p {...fadeUp()} className="text-aom-orange text-sm font-body font-medium uppercase tracking-[0.3em] mb-3">{part}</motion.p>
        <motion.h2 {...fadeUp(0.1)} className="text-4xl md:text-5xl font-heading font-bold text-white">{title}</motion.h2>
      </div>
    </div>
  );
}

function Expandable({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-heading font-semibold text-[#0f1629] text-base">{title}</span>
        {open ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
      </button>
      {open && <div className="px-5 py-5 bg-white">{children}</div>}
    </div>
  );
}

/* ─── DATA ─── */

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

const outreachTemplates = [
  {
    label: 'Template A',
    title: 'Check Out Our Latest Work',
    subtitle: 'Warm intro or follow-up',
    subject: 'Quick look at what we just finished',
    body: `Hey [First Name],

I'm Eric, Director of Business Development at Ambition Mechanical. We're a commercial HVAC contractor here in Phoenix -- 500+ projects, 100+ years combined experience across our team.

I wanted to share a quick look at some recent work:
[Link to ambitionac.com or case study page]

We specialize in [HVAC / refrigeration / design-build mechanical] for [healthcare / commercial / industrial] -- and we're always looking to connect with GCs who value technical precision and clean execution.

Worth a 10-minute call this week?

Eric
Ambition Mechanical Services
(480) 600-2942`,
  },
  {
    label: 'Template B',
    title: 'Cold Intro to a New GC',
    subtitle: 'First-time outreach',
    subject: 'Mechanical sub for your Phoenix projects',
    body: `Hey [First Name],

Eric here from Ambition Mechanical. I've been following [Company Name]'s work in the Valley -- [specific project or recent news].

We're a Phoenix-based commercial mechanical contractor. HVAC, refrigeration, plumbing, controls. 500+ projects across healthcare, industrial, hospitality, and commercial.

What sets us apart:
- Young, technical team that shows up ready
- 24/7 emergency response
- Full design-build mechanical capability
- Nominated Best Mechanical Contractor in Phoenix (2025)

I'd love to get on your bid list or grab coffee and talk about upcoming projects. What works for you?

Eric
Ambition Mechanical Services
(480) 600-2942`,
  },
  {
    label: 'Template C',
    title: 'Reconnect with a Past GC',
    subtitle: 'Re-engage old contacts',
    subject: 'Following up from [project name / last interaction]',
    body: `Hey [First Name],

Eric from Ambition Mechanical. We [bid on / worked on] [Project Name] a while back and I wanted to reconnect.

We've been growing -- 500+ projects now, expanded our design-build capability, and we're staffed up for the spring push. If you've got anything in preconstruction or early phases, I'd love to be in the conversation.

What's the best way to get on your radar for upcoming mechanical packages?

Eric
Ambition Mechanical Services
(480) 600-2942`,
  },
];

const linkedinConnectionTemplates = [
  { target: 'GC Preconstruction Leader', text: "Eric from Ambition Mechanical in Phoenix. We're a commercial HVAC/mechanical sub and I'd love to connect. Always looking to build relationships with the GCs shaping the Valley." },
  { target: 'Property Manager / Facilities Director', text: "Hey [Name] -- Eric from Ambition Mechanical. We handle commercial HVAC service, maintenance, and retrofits across Phoenix. Would love to connect and learn about your portfolio's mechanical needs." },
  { target: 'Facilities Director at a Large Firm', text: "[Name], I saw you manage [X million sq ft / the Phoenix portfolio] for [Company]. We're a Phoenix mechanical contractor specializing in commercial HVAC for large portfolios. Happy to connect." },
];

const linkedinPostIdeas = [
  { title: 'Job site leadership shot', desc: 'Photo of Mo on an active project, hard hat on, reviewing plans. Caption angle: "Every project starts with a plan. But it\'s the people in the field who make it real." Tag the GC if possible.' },
  { title: 'Technical explainer', desc: 'Short video or carousel: "3 things your GC should ask your mechanical sub before signing the contract." Topics: design-build capability, 24/7 response, prefab timeline savings.' },
  { title: 'Team spotlight', desc: 'Photo of a crew member doing brazing or a VRF install. Caption: "Our team has 100+ years combined experience. This is the kind of precision we bring to every job."' },
];

const linkedinGroups = [
  'Arizona Builders Alliance',
  'BOMA Greater Phoenix',
  'IFMA Greater Phoenix Chapter',
  'IREM Greater Phoenix',
  'ASA Arizona (American Subcontractors Association)',
  'AZAGC (Associated General Contractors of Arizona)',
  'Phoenix Commercial Real Estate Professionals',
  'Arizona Construction Network',
  'SMACNA Arizona',
  'CoreNet Arizona Chapter',
];

const events = [
  { event: 'ASA Spring Golf Tournament', date: 'Mar 26, 2026', location: 'Verrado Golf Club, Buckeye', who: 'GCs, subs, suppliers', why: 'Face time with GC PMs and estimators.' },
  { event: 'ASA Partners in Construction: Job Site Mgmt', date: 'Mar 31, 2026', location: 'DIVERGE at Hensel Phelps', who: 'GCs, subs', why: 'Hensel Phelps hosting. Direct access to a target GC.' },
  { event: 'ASA Spring Mixer', date: 'Apr 2, 2026', location: "Luci's at the Orchard, Phoenix", who: 'GCs, subs, vendors', why: 'Low-key networking. Show up, shake hands, leave with cards.' },
  { event: 'ASA University: Bonded Projects', date: 'Apr 8, 2026', location: 'Sun Valley Builders', who: 'Subs, legal, GC reps', why: 'Learn bonding, meet peers.' },
  { event: 'IFMA Phoenix Monthly Meeting', date: 'Apr 8, 2026', location: 'TBD (12:00-1:00 PM)', who: 'Facilities managers', why: 'Direct access to the people who call for HVAC service.' },
  { event: 'Arizona Construction Summit', date: 'Apr 9, 2026', location: 'Grand Canyon University', who: 'Construction owners, leaders', why: 'Industry expert speakers. Decision-makers in one room.' },
  { event: 'ASA Awards Gala: Masquerade Ball', date: 'Apr 30, 2026', location: 'Clayton House, Scottsdale', who: 'GCs, subs, industry leaders', why: 'Premier event. Get a table. Be visible.' },
  { event: 'IREM Phoenix Golf Outing', date: 'May 8, 2026', location: 'Talking Stick Golf Club', who: 'Property managers, RE managers', why: 'Property managers = recurring mechanical revenue.' },
  { event: 'IFMA Phoenix Monthly Meeting', date: 'May 13, 2026', location: 'TBD (12:00-1:00 PM)', who: 'Facilities managers', why: 'Second IFMA networking.' },
  { event: 'BOMA Industry Luncheon', date: 'TBD (check bomaphoenix.org)', location: 'Arizona Country Club', who: 'Building owners, PMs, engineers', why: 'FREE for PMs/engineers.' },
  { event: 'GC Expo (ASA + ABA + AMCA)', date: 'TBD 2026', location: 'TBD', who: '400+ companies, 1,000+ attendees', why: 'THE event for subs to meet GCs face-to-face. Get a booth.' },
];

const competitors = [
  { name: 'Climatec (Bosch)', followers: '7,250', doing: 'Employee spotlights, community involvement, corporate updates. Professional but corporate.', gap: "They feel like a big company. Ambition can be the local, hungry, technical alternative." },
  { name: 'Comfort Systems USA SW', followers: 'Active', doing: 'Leveraging NYSE-traded parent brand. Corporate content. Large footprint.', gap: "They're big. Ambition is nimble, personal, and available." },
  { name: 'Pueblo Mechanical (Modigent)', followers: 'Active', doing: "Private equity-backed. Expanding through acquisitions. #4 on PBJ list.", gap: "PE rollup = culture loss. Ambition is founder-led, culture-first." },
  { name: 'Chas Roberts', followers: '1,155', doing: 'Mostly residential brand. Family-owned since 1942.', gap: 'They dominate residential. Ambition owns commercial. No overlap.' },
  { name: 'Midstate Mechanical', followers: 'Moderate', doing: 'Clean website. Founded 1986. Focused on commercial HVAC/plumbing.', gap: 'Similar size competitor. Ambition differentiates with content and BD hustle.' },
  { name: 'Tempe Mechanical', followers: 'Low', doing: 'Basic web presence. Retrofit and service focus.', gap: 'Not marketing aggressively. Ambition can out-hustle.' },
  { name: 'Wolff Mechanical', followers: 'Low', doing: 'East Valley focused. Basic digital presence.', gap: 'No serious social or content game.' },
  { name: 'North Valley Mechanical', followers: 'Low', doing: '24/7 service. Basic web presence.', gap: 'No LinkedIn game. No content. No brand.' },
];

const missionStatements = [
  { num: '01', tagline: 'Built different. Built to last.', why: "Short, memorable, ownable. Speaks to both the construction work and the identity as a different kind of contractor.", rec: 'Brand tagline' },
  { num: '02', tagline: "Your building's mechanical system is only as good as the team behind it.", why: 'Puts the focus on people. Resonates with PMs burned by unreliable subs.', rec: null },
  { num: '03', tagline: 'Engineering comfort. Advancing buildings.', why: '"Engineering" signals technical depth. "Comfort" grounds it. "Advancing" signals innovation.', rec: null },
  { num: '04', tagline: 'Precision mechanical for the projects that matter.', why: '"Precision" signals quality over quantity. "Projects that matter" positions as premium.', rec: null },
  { num: '05', tagline: "We don't just install systems. We build reputations.", why: "Speaks directly to what GCs care about. Their reputation rides on their subs.", rec: 'Sales positioning' },
];

const shootIdeas = [
  { what: 'Mo walking through active job site, reviewing plans with foreman', where: 'Active commercial project', wardrobe: 'Navy blazer over clean polo, hard hat, safety vest', caption: '"500+ projects taught us one thing: the details matter."' },
  { what: 'Mo standing in front of completed rooftop unit, arms crossed', where: 'Finished rooftop installation', wardrobe: 'Blazer, clean polo', caption: '"This is what \'done right\' looks like."' },
  { what: 'Mo shaking hands with a GC PM or property manager on site', where: 'Active job site or office', wardrobe: 'Blazer, button-down', caption: '"Building relationships one project at a time."' },
  { what: 'Close-up brazing demo with clean torch work', where: 'Shop or job site', wardrobe: 'Tech in Ambition uniform', caption: '"This is precision. 100+ years combined experience, one standard: perfect."' },
  { what: 'Plan review session: Mo + 2-3 team members around drawings', where: 'Office or job trailer', wardrobe: 'Mo in polo or blazer, team in uniforms', caption: '"Before we touch a tool, we study every detail."' },
  { what: 'Crane lift: time-lapse of large unit being set', where: 'Active project with crane', wardrobe: 'Safety gear', caption: '"Setting a [X]-ton unit today. This is what we live for."' },
  { what: 'VRF troubleshooting walkthrough', where: 'Mechanical room or equipment yard', wardrobe: 'Ambition polo, clean look', caption: '"VRF systems are complex. Here\'s how we approach diagnostics."' },
  { what: 'Full crew photo, trucks lined up behind', where: 'Ambition shop or staging area', wardrobe: 'Full team in uniform', caption: '"This is Ambition. One mission: best mechanical contractor in Phoenix."' },
  { what: 'Before/after: old equipment vs. new install', where: 'Completed retrofit project', wardrobe: 'Mo in polo', caption: '"Transformation Tuesday. Old out, new in. Better efficiency, zero downtime."' },
  { what: 'Internal training session: safety or technical cert', where: 'Office or training room', wardrobe: 'Team in uniforms', caption: '"We don\'t just hire talent. We build it."' },
];

const weeklyReportTemplate = `AMBITION MECHANICAL -- WEEKLY BD REPORT
Week of: [Date]

SITE VISITS / MEETINGS
- [ ] [Company] -- [Who I met] -- [What we discussed]
- [ ] [Company] -- [Who I met] -- [What we discussed]

WEBSITE ANALYTICS
- Total page views this week: ___
- Top 3 pages viewed: ___
- New visitors vs. returning: ___

NEW CONTACTS / LEADS
- [ ] [Name] -- [Company] -- [How we connected] -- [Next step]

BIDS SENT / PROPOSALS OUT
- [ ] [Project] -- [GC] -- [Value] -- [Status]

SOCIAL MEDIA
- LinkedIn posts this week: ___
- Total impressions: ___
- New connections: ___

EVENTS ATTENDED / UPCOMING
- [Event] -- [Date] -- [Key takeaway / contact made]

WIN / LOSS LOG
- Won: [Project] -- [Value] -- [Why we won]
- Lost: [Project] -- [Value] -- [Why we lost]

ACTION ITEMS FOR NEXT WEEK
1. ___
2. ___
3. ___`;


/* ─── COMPONENTS ─── */

function HitListTable({ data, type }) {
  const isGC = type === 'gc';
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-left text-[15px] min-w-[800px]">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Company</th>
            <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Decision Maker</th>
            <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Title</th>
            <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">{isGC ? 'What They Build' : 'What They Manage'}</th>
            <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Talking Point</th>
            <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm w-20">LinkedIn</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <td className="py-3 px-3 font-semibold text-[#0f1629] whitespace-nowrap text-[14px]">{row.company}</td>
              <td className="py-3 px-3 text-[14px]">{row.person}</td>
              <td className="py-3 px-3 text-gray-600 text-[13px]">{row.title}</td>
              <td className="py-3 px-3 text-[13px]">{isGC ? row.builds : row.manages}</td>
              <td className="py-3 px-3 text-[13px] text-gray-600 italic">{row.talking}</td>
              <td className="py-3 px-3 text-center">
                {row.linkedin ? (
                  <a href={row.linkedin} target="_blank" rel="noopener noreferrer" className="text-aom-orange hover:text-orange-600 transition-colors">
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <span className="text-gray-300 text-xs">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmailCard({ template }) {
  return (
    <div className="bg-[#fafafa] border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-[#0f1629] px-5 py-3 flex items-center gap-3">
        <Mail size={16} className="text-aom-orange" />
        <div>
          <span className="text-aom-orange font-heading font-semibold text-sm">{template.label}</span>
          <span className="text-white/60 text-sm ml-2">{template.title}</span>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1">Subject</p>
        <p className="font-semibold text-[#0f1629] mb-4 text-[15px]">{template.subject}</p>
        <pre className="whitespace-pre-wrap font-body text-[14px] leading-relaxed text-gray-700">{template.body}</pre>
      </div>
    </div>
  );
}


/* ─── MAIN PAGE ─── */

export default function BriefAmbitionStrategy() {
  useSEO();

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e]">

      {/* ── HERO ── */}
      <div className="relative bg-[#0a0f1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#111827] to-[#0a0f1a]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-20">
          <motion.a {...fadeUp()} href="/briefs" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-12">
            <ArrowLeft size={16} /> All Briefs
          </motion.a>

          <motion.div {...fadeUp(0.1)} className="mb-6">
            <span className="text-aom-orange text-xs font-body font-medium uppercase tracking-[0.3em]">Ambition Mechanical x AOM</span>
          </motion.div>

          <motion.h1 {...fadeUp(0.2)} className="text-4xl md:text-6xl font-heading font-bold text-white leading-[1.1] mb-6">
            Market Strategy &<br />Business Development<br />Playbook
          </motion.h1>

          <motion.p {...fadeUp(0.3)} className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed mb-10 font-body">
            Built from our March 21 strategy session. Everything discussed, organized, researched, and ready to execute.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '27', l: 'GC Contacts' },
              { n: '15', l: 'PM Contacts' },
              { n: '12', l: 'Events Mapped' },
              { n: '8', l: 'Competitors Scanned' },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-5 py-4 text-center">
                <p className="text-2xl md:text-3xl font-heading font-bold text-aom-orange">{s.n}</p>
                <p className="text-white/50 text-sm font-body mt-1">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── PART 1 DIVIDER ── */}
      <PartDivider part="Part 1" title="The War Room" />

      {/* ── 1. GC HIT LIST ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 1</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Crosshair size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">GC Hit List</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              You mentioned wanting to target the top GCs who align with your quality-first approach. Here's the list, sorted by alignment.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <HitListTable data={gcHitList} type="gc" />
          </motion.div>
          <motion.p {...fadeUp(0.15)} className="text-sm text-gray-400 mt-4 italic">
            25 contacts across 17 companies. "TBD" items: search "[Name] [Company] Phoenix" on LinkedIn to find and connect.
          </motion.p>
        </div>
      </section>

      {/* ── 2. PM HIT LIST ── */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 2</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Building2 size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">Property Management Hit List</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              These are the facilities directors and ops VPs who sign mechanical contracts. The angle: Ambition becomes their go-to mechanical partner for their entire portfolio.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <HitListTable data={pmHitList} type="pm" />
          </motion.div>
          <motion.p {...fadeUp(0.15)} className="text-sm text-gray-400 mt-4 italic">
            15 contacts across 11 firms covering medical office, commercial, industrial, and Class A portfolios.
          </motion.p>
        </div>
      </section>

      {/* ── 3. OUTREACH TEMPLATES ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 3</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Mail size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">Ready-to-Send Outreach</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              Three emails you can send today. Swap the brackets, hit send.
            </p>
          </motion.div>
          <div className="grid gap-6">
            {outreachTemplates.map((t, i) => (
              <motion.div key={i} {...fadeUp(i * 0.08)}>
                <EmailCard template={t} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. LINKEDIN PLAYBOOK ── */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 4</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Linkedin size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">LinkedIn Playbook</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              Connection requests, post ideas, and groups. Everything Mo and Eric need to own LinkedIn in Phoenix mechanical.
            </p>
          </motion.div>

          {/* Connection Templates */}
          <motion.div {...fadeUp(0.1)} className="mb-10">
            <h3 className="text-xl font-heading font-bold text-[#0f1629] mb-4">Connection Request Templates</h3>
            <div className="grid gap-4">
              {linkedinConnectionTemplates.map((t, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5">
                  <p className="text-xs uppercase tracking-wider text-aom-orange font-medium mb-2">{t.target}</p>
                  <p className="text-[15px] text-gray-700 italic">"{t.text}"</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Post Ideas */}
          <motion.div {...fadeUp(0.15)} className="mb-10">
            <h3 className="text-xl font-heading font-bold text-[#0f1629] mb-4">Post Ideas for Mo This Week</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {linkedinPostIdeas.map((p, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5">
                  <p className="font-heading font-semibold text-[#0f1629] mb-2">{p.title}</p>
                  <p className="text-[14px] text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Groups */}
          <motion.div {...fadeUp(0.2)}>
            <h3 className="text-xl font-heading font-bold text-[#0f1629] mb-4">10 Groups to Join</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {linkedinGroups.map((g, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-3 ${i < linkedinGroups.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-aom-orange font-heading font-bold text-sm w-6">{i + 1}</span>
                  <span className="text-[15px] text-[#0f1629]">{g}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 5. EVENTS CALENDAR ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 5</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">Events Calendar</h2>
            </div>
            <p className="text-gray-600 text-lg mb-2 max-w-3xl font-body">
              Where to show up and who you'll meet. Register for the first 5 this week.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="overflow-x-auto -mx-2 mt-6">
            <table className="w-full text-left text-[14px] min-w-[750px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Event</th>
                  <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Date</th>
                  <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Location</th>
                  <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Who Attends</th>
                  <th className="py-3 px-3 font-heading font-semibold text-[#0f1629] text-sm">Why It Matters</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="py-3 px-3 font-semibold text-[#0f1629]">{e.event}</td>
                    <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-3 text-gray-600">{e.location}</td>
                    <td className="py-3 px-3 text-gray-600">{e.who}</td>
                    <td className="py-3 px-3 text-gray-500 italic">{e.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ── 6. COMPETITOR INTEL ── */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 6</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Search size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">Competitor Intel</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              Who else is marketing to these same targets, and where they're falling short.
            </p>
          </motion.div>

          <div className="grid gap-4">
            {competitors.map((c, i) => (
              <motion.div key={i} {...fadeUp(i * 0.05)} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
                  <h4 className="font-heading font-bold text-[#0f1629] text-[16px]">{c.name}</h4>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-medium whitespace-nowrap">LinkedIn: {c.followers}</span>
                </div>
                <p className="text-[14px] text-gray-600 mb-2"><span className="font-semibold text-gray-700">What they do:</span> {c.doing}</p>
                <p className="text-[14px] text-aom-orange font-medium"><span className="font-semibold">Ambition's edge:</span> {c.gap}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.4)} className="mt-8 bg-[#0f1629] rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-aom-orange" />
              <h4 className="text-white font-heading font-bold text-lg">First-Mover Advantage</h4>
            </div>
            <p className="text-white/70 text-[15px] leading-relaxed">
              Nobody in Phoenix commercial mechanical is doing real content marketing. Climatec and Comfort Systems post corporate updates. Everyone else is invisible online. Ambition has the opportunity to be the ONLY commercial mechanical contractor in Phoenix with real job site content, a founder story, LinkedIn thought leadership, case studies, and active social. This is a massive first-mover advantage in a $39B+ market.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 7. MISSION STATEMENTS ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 7</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Target size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">Mission Statements</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              Five options based on how your target clients describe themselves. Pick one, we run with it.
            </p>
          </motion.div>

          <div className="grid gap-5">
            {missionStatements.map((m, i) => (
              <motion.div key={i} {...fadeUp(i * 0.06)} className={`rounded-lg p-6 border ${m.rec ? 'bg-[#0f1629] border-aom-orange/30' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-heading font-bold ${m.rec ? 'text-aom-orange' : 'text-gray-400'}`}>Option {m.num}</span>
                  {m.rec && <span className="text-xs bg-aom-orange/20 text-aom-orange px-2 py-0.5 rounded font-medium">{m.rec}</span>}
                </div>
                <p className={`text-xl md:text-2xl font-heading font-bold leading-snug mb-3 ${m.rec ? 'text-white' : 'text-[#0f1629]'}`}>"{m.tagline}"</p>
                <p className={`text-[14px] leading-relaxed ${m.rec ? 'text-white/60' : 'text-gray-500'}`}>{m.why}</p>
              </motion.div>
            ))}
          </div>

          <motion.p {...fadeUp(0.4)} className="text-sm text-gray-500 mt-6 leading-relaxed">
            <span className="font-semibold">Recommendation:</span> Use Option 01 as the brand tagline (TikTok bio, hard hat sticker, proposal cover) and Option 05 as the sales positioning line (case study headers, sales conversations). Both work together.
          </motion.p>
        </div>
      </section>

      {/* ── 8. CONTENT SHOOT IDEAS ── */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 8</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <Camera size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">Content Shoot Ideas</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              Mo in a blazer on the job site was the direction. Here are 10 specific scenarios.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {shootIdeas.map((s, i) => (
              <motion.div key={i} {...fadeUp(i * 0.04)} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-aom-orange font-heading font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-heading font-semibold text-[#0f1629] text-[15px]">{s.what}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Location</p>
                    <p className="text-gray-600">{s.where}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Wardrobe</p>
                    <p className="text-gray-600">{s.wardrobe}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Caption Angle</p>
                  <p className="text-[13px] text-gray-700 italic">{s.caption}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. WEEKLY REPORT ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp()}>
            <SectionKicker>Section 9</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <FileText size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">Weekly Report Template</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 max-w-3xl font-body">
              Fill this in every Friday. Send it to Mo. Done.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="bg-[#0f1629] rounded-lg p-6 overflow-x-auto">
            <pre className="text-white/80 text-[14px] font-mono leading-relaxed whitespace-pre-wrap">{weeklyReportTemplate}</pre>
          </motion.div>
        </div>
      </section>

      {/* ── PART 2 DIVIDER ── */}
      <PartDivider part="Part 2" title="The Recap" />

      {/* ── MEETING RECAP ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">

          {/* What Was Discussed */}
          <motion.div {...fadeUp()} className="mb-16">
            <SectionKicker>The Meeting</SectionKicker>
            <OrangeBar />
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare size={24} className="text-aom-orange" />
              <h2 className="text-3xl font-heading font-bold text-[#0f1629]">What Was Discussed</h2>
            </div>
            <p className="text-gray-600 text-lg mb-8 font-body">Key decisions and direction from the March 21 strategy session.</p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[
                '"Quality over quantity."',
                '"I want to know who\'s clicking."',
                '"Put him in a suit without a tie."',
                '"I want to know what my return on investment is."',
              ].map((q, i) => (
                <div key={i} className="bg-gray-50 border-l-4 border-aom-orange px-5 py-4 rounded-r-lg">
                  <p className="text-[16px] font-heading font-semibold text-[#0f1629] italic">{q}</p>
                  <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Eric, Mar 21</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-heading font-bold text-[#0f1629] mb-4">Key Decisions</h4>
              <ul className="space-y-3 text-[15px] text-gray-700">
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> LinkedIn is the primary channel. 75% of effort goes there. GC project managers, property managers, and facility directors live on LinkedIn.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> Case studies are the centerpiece. Not claims. Proof. Before/during/after, tag the GC, track who clicks.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> Mo in a blazer on the job site. Professional but not corporate. Pattern interrupt against every other contractor on social.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> Google Analytics + LinkedIn Insight Tag on the site. Track who visits, which companies, what they look at. Cross-reference with active bids.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> $500/month Google Ads test budget. Commercial keywords only. No residential. Dedicated landing page, not the homepage.</li>
                <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> Weekly reports to Eric. Every Monday. Website traffic, LinkedIn engagement, case study clicks, Google Ads performance, company identification.</li>
              </ul>
            </div>
          </motion.div>

          {/* AOM Commitments */}
          <motion.div {...fadeUp(0.1)} className="mb-16">
            <OrangeBar />
            <h2 className="text-2xl font-heading font-bold text-[#0f1629] mb-6">What AOM Committed To</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { item: 'Website live', detail: 'Tuesday target' },
                { item: 'Case studies', detail: '3 large, 3 medium, 3 small' },
                { item: 'Google Analytics setup', detail: 'GA4 + LinkedIn Insight Tag via GTM' },
                { item: 'Weekly reports', detail: 'Every Monday to Eric' },
                { item: 'LinkedIn strategy', detail: 'Content pillars, connection targets, post cadence' },
                { item: 'Mission statement research', detail: '5 options based on competitor/client analysis' },
                { item: 'Print case studies', detail: 'For in-person meetings and events' },
                { item: 'Tracking setup', detail: 'UTM links for every outreach email' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-5 py-4">
                  <CheckCircle2 size={18} className="text-aom-orange mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0f1629] text-[15px]">{c.item}</p>
                    <p className="text-[13px] text-gray-500 mt-0.5">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Ambition Commitments */}
          <motion.div {...fadeUp(0.15)} className="mb-16">
            <OrangeBar />
            <h2 className="text-2xl font-heading font-bold text-[#0f1629] mb-6">What Ambition Committed To</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { item: '2-hour case study review session with Eric', detail: 'Walk through completed projects, pull the stories' },
                { item: '$500/month Google Ads budget', detail: 'Commercial keywords, dedicated landing page' },
                { item: 'Eric as primary contact', detail: 'All BD communication runs through Eric' },
                { item: 'Provide Phoenix Business Journal list', detail: 'GC and CRE contacts from PBJ subscriptions' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-5 py-4">
                  <Shield size={18} className="text-[#0f1629] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0f1629] text-[15px]">{c.item}</p>
                    <p className="text-[13px] text-gray-500 mt-0.5">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pricing Agreement */}
          <motion.div {...fadeUp(0.2)} className="mb-16">
            <OrangeBar />
            <h2 className="text-2xl font-heading font-bold text-[#0f1629] mb-6">Pricing Agreement</h2>
            <div className="bg-[#0f1629] rounded-lg p-6 border border-white/10">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-aom-orange text-xs uppercase tracking-wider font-medium mb-2">Current</p>
                  <p className="text-white text-[16px] leading-relaxed">Current rate through Q2. Full-service deliverables including website, social media, analytics, and BD strategy.</p>
                </div>
                <div>
                  <p className="text-aom-orange text-xs uppercase tracking-wider font-medium mb-2">After Q2</p>
                  <p className="text-white text-[16px] leading-relaxed">Review at end of Q2 with data. If ROI is proven through tracked leads and conversions, bump to $2,500/month.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* What We Need From You */}
          <motion.div {...fadeUp(0.25)}>
            <OrangeBar />
            <h2 className="text-2xl font-heading font-bold text-[#0f1629] mb-6">What We Need From You</h2>
            <div className="bg-white border-2 border-aom-orange/20 rounded-lg p-6">
              <ul className="space-y-4 text-[15px] text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-aom-orange font-heading font-bold">1</span>
                  <span><strong>Schedule the 2-hour case study session.</strong> We need Eric in a room with photos and project details. We pull the stories, write the case studies, publish them.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-aom-orange font-heading font-bold">2</span>
                  <span><strong>Set up the $500/month Google Ads budget.</strong> We handle campaign setup, targeting, and optimization. You fund the spend.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-aom-orange font-heading font-bold">3</span>
                  <span><strong>Send us the Phoenix Business Journal contact list.</strong> Any GC or CRE contacts Eric has from PBJ events or subscriptions.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-aom-orange font-heading font-bold">4</span>
                  <span><strong>Book Mo for the first content shoot.</strong> We need 2-3 hours on an active job site. Blazer, hard hat, the whole setup from Section 8.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-aom-orange font-heading font-bold">5</span>
                  <span><strong>Fill in the weekly report every Friday.</strong> Template is in Section 9. Takes 10 minutes. Keeps everyone aligned.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <div className="bg-[#0a0f1a] py-12 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">Prepared by</p>
          <p className="text-white/60 text-sm font-body">AOM (Ahead of Market) | March 2026</p>
          <p className="text-white/30 text-xs mt-4">ambitionac.com | (480) 600-2942 | 437 S. 48th St., Suite 101, Tempe, AZ 85281</p>
        </div>
      </div>
    </div>
  );
}
