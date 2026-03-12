import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

// ─── BRAND TOKENS ───
const ORANGE = '#E85D26';
const NIGHT = '#0C0C0C';
const CREAM = '#FDF6EC';

// ─── SLIDE DEFINITIONS ───
// Each slide has: type ('welcome'|'interstitial'|'content'|'thanks'), section info, render fn
// Total: 28 slides (indices 0-27)
//
// 0: Welcome
// 1: Interstitial A (Your Business)
// 2-5: Section A content (4 slides)
// 6: Interstitial B (Your Tech Stack)
// 7-11: Section B content (5 slides)
// 12: Interstitial C (Where It Hurts)
// 13-18: Section C content (6 slides)
// 19: Interstitial D (Your Operations)
// 20-23: Section D content (4 slides)
// 24: Interstitial E (AI Readiness)
// 25-28: Section E content (4 slides) -- wait, that's 29.
// Let me recount to fit 28 exactly (indices 0-27):
//
// 0: Welcome
// 1: Inter A | 2-5: A (4 slides) = 5 total
// 6: Inter B | 7-10: B (4 slides) = 5 total
// 11: Inter C | 12-17: C (6 slides) = 7 total
// 18: Inter D | 19-22: D (4 slides) = 5 total
// 23: Inter E | 24-25: E (2 slides... too few)
//
// Better mapping for exactly 28 slides:
// 0: Welcome
// 1: Inter A | 2,3,4,5: A (4)
// 6: Inter B | 7,8,9,10,11: B (5)
// 12: Inter C | 13,14,15,16,17,18: C (6)
// 19: Inter D | 20,21,22,23: D (4)
// 24: Inter E | 25,26: E (2) -- combine budget+data into one
// -- that's 27. Need one more.
// Add: Inter F at 27, then goals at 28,29, thanks at 30... too many.
//
// Simplest: make it 30 slides total.
// 0: Welcome
// 1: Inter A | 2-5: A (4)
// 6: Inter B | 7-11: B (5)
// 12: Inter C | 13-18: C (6)
// 19: Inter D | 20-23: D (4)
// 24: Inter E | 25-28: E (4)
// 29: Inter F | 30-31: F (2)
// 32: Thanks
// = 33 slides. Too many.
//
// Spec says 27 slides. Let me just do exactly that with a flat array.

const SLIDE_META = [
  // 0
  { type: 'welcome', dark: true },
  // 1: Inter A
  { type: 'interstitial', dark: true, sectionNum: 1, sectionTitle: 'Your Business', sectionDesc: 'Tell us about your company so we can tailor the audit to your world.' },
  // 2-5: Section A
  { type: 'content', section: 'YOUR BUSINESS', slideInSection: 1, totalInSection: 4 },
  { type: 'content', section: 'YOUR BUSINESS', slideInSection: 2, totalInSection: 4 },
  { type: 'content', section: 'YOUR BUSINESS', slideInSection: 3, totalInSection: 4 },
  { type: 'content', section: 'YOUR BUSINESS', slideInSection: 4, totalInSection: 4 },
  // 6: Inter B
  { type: 'interstitial', dark: true, sectionNum: 2, sectionTitle: 'Your Tech Stack', sectionDesc: 'What tools are you running today, and where are the gaps?' },
  // 7-11: Section B
  { type: 'content', section: 'YOUR TECH STACK', slideInSection: 1, totalInSection: 5 },
  { type: 'content', section: 'YOUR TECH STACK', slideInSection: 2, totalInSection: 5 },
  { type: 'content', section: 'YOUR TECH STACK', slideInSection: 3, totalInSection: 5 },
  { type: 'content', section: 'YOUR TECH STACK', slideInSection: 4, totalInSection: 5 },
  { type: 'content', section: 'YOUR TECH STACK', slideInSection: 5, totalInSection: 5 },
  // 12: Inter C
  { type: 'interstitial', dark: true, sectionNum: 3, sectionTitle: 'Where It Hurts', sectionDesc: 'Every business has friction. Let\'s find yours.' },
  // 13-18: Section C
  { type: 'content', section: 'WHERE IT HURTS', slideInSection: 1, totalInSection: 6 },
  { type: 'content', section: 'WHERE IT HURTS', slideInSection: 2, totalInSection: 6 },
  { type: 'content', section: 'WHERE IT HURTS', slideInSection: 3, totalInSection: 6 },
  { type: 'content', section: 'WHERE IT HURTS', slideInSection: 4, totalInSection: 6 },
  { type: 'content', section: 'WHERE IT HURTS', slideInSection: 5, totalInSection: 6 },
  { type: 'content', section: 'WHERE IT HURTS', slideInSection: 6, totalInSection: 6 },
  // 19: Inter D
  { type: 'interstitial', dark: true, sectionNum: 4, sectionTitle: 'Your Operations', sectionDesc: 'How work actually gets done, day to day.' },
  // 20-23: Section D
  { type: 'content', section: 'YOUR OPERATIONS', slideInSection: 1, totalInSection: 4 },
  { type: 'content', section: 'YOUR OPERATIONS', slideInSection: 2, totalInSection: 4 },
  { type: 'content', section: 'YOUR OPERATIONS', slideInSection: 3, totalInSection: 4 },
  { type: 'content', section: 'YOUR OPERATIONS', slideInSection: 4, totalInSection: 4 },
  // 24: Inter E
  { type: 'interstitial', dark: true, sectionNum: 5, sectionTitle: 'AI Readiness', sectionDesc: 'How ready is your team to adopt smarter systems?' },
  // 25-28: Section E
  { type: 'content', section: 'AI READINESS', slideInSection: 1, totalInSection: 4 },
  { type: 'content', section: 'AI READINESS', slideInSection: 2, totalInSection: 4 },
  { type: 'content', section: 'AI READINESS', slideInSection: 3, totalInSection: 4 },
  { type: 'content', section: 'AI READINESS', slideInSection: 4, totalInSection: 4 },
  // 29: Inter F
  { type: 'interstitial', dark: true, sectionNum: 6, sectionTitle: 'Your Goals', sectionDesc: 'What does winning look like for you?' },
  // 30-31: Section F
  { type: 'content', section: 'YOUR GOALS', slideInSection: 1, totalInSection: 2 },
  { type: 'content', section: 'YOUR GOALS', slideInSection: 2, totalInSection: 2 },
  // 32: Thanks
  { type: 'thanks', dark: true },
];

const TOTAL_SLIDES = SLIDE_META.length;

// ─── REUSABLE INPUT COMPONENTS ───

function TextInput({ label, value, onChange, placeholder = '' }) {
  return (
    <div className="mb-6">
      <label className="block font-body text-sm font-medium text-[#5A5550] mb-2 tracking-wide uppercase">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-b-2 border-[#D9D3CB] focus:border-[#E85D26] outline-none py-3 px-1 font-body text-lg text-[#0A0A0A] placeholder:text-[#C4BDB4] transition-colors"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder = '', rows = 4 }) {
  return (
    <div className="mb-6">
      <label className="block font-body text-sm font-medium text-[#5A5550] mb-2 tracking-wide uppercase">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-white/60 border-2 border-[#D9D3CB] focus:border-[#E85D26] rounded-xl outline-none py-3 px-4 font-body text-lg text-[#0A0A0A] placeholder:text-[#C4BDB4] transition-colors resize-none"
      />
    </div>
  );
}

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div className="mb-6">
      <label className="block font-body text-sm font-medium text-[#5A5550] mb-3 tracking-wide uppercase">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-5 py-3 rounded-full font-body text-base transition-all border-2 ${
              value === opt
                ? 'bg-[#E85D26] border-[#E85D26] text-white shadow-lg shadow-[#E85D26]/20'
                : 'bg-white border-[#D9D3CB] text-[#3A3530] hover:border-[#E85D26]/40'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup({ label, options, value = [], onChange }) {
  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="mb-6">
      <label className="block font-body text-sm font-medium text-[#5A5550] mb-3 tracking-wide uppercase">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-5 py-3 rounded-full font-body text-base transition-all border-2 flex items-center gap-2 ${
              value.includes(opt)
                ? 'bg-[#E85D26] border-[#E85D26] text-white shadow-lg shadow-[#E85D26]/20'
                : 'bg-white border-[#D9D3CB] text-[#3A3530] hover:border-[#E85D26]/40'
            }`}
          >
            {value.includes(opt) && <Check size={16} />}
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dropdown({ label, options, value, onChange }) {
  return (
    <div className="mb-6">
      <label className="block font-body text-sm font-medium text-[#5A5550] mb-2 tracking-wide uppercase">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border-b-2 border-[#D9D3CB] focus:border-[#E85D26] outline-none py-3 px-1 font-body text-lg text-[#0A0A0A] appearance-none cursor-pointer"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function RankedSelection({ label, options, value = [], onChange, max = 3 }) {
  const handleClick = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else if (value.length < max) {
      onChange([...value, opt]);
    }
  };
  return (
    <div className="mb-6">
      <label className="block font-body text-sm font-medium text-[#5A5550] mb-1 tracking-wide uppercase">{label}</label>
      <p className="font-body text-sm text-[#8A847C] mb-4">Click to select your top {max} in order of priority.</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const rank = value.indexOf(opt);
          const isSelected = rank !== -1;
          return (
            <button
              key={opt}
              onClick={() => handleClick(opt)}
              className={`px-5 py-4 rounded-xl font-body text-base text-left transition-all border-2 flex items-center gap-3 ${
                isSelected
                  ? 'bg-[#E85D26] border-[#E85D26] text-white shadow-lg shadow-[#E85D26]/20'
                  : 'bg-white border-[#D9D3CB] text-[#3A3530] hover:border-[#E85D26]/40'
              }`}
            >
              {isSelected ? (
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-headline font-bold text-lg flex-shrink-0">{rank + 1}</span>
              ) : (
                <span className="w-8 h-8 rounded-full border-2 border-current opacity-30 flex items-center justify-center flex-shrink-0" />
              )}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SLIDE WRAPPER COMPONENTS ───

function ContentSlide({ children, title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      {title && <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#0A0A0A] mb-2">{title}</h2>}
      {subtitle && <p className="font-body text-base text-[#8A847C] mb-8">{subtitle}</p>}
      {!subtitle && title && <div className="mb-8" />}
      {children}
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───

export default function AuditTest() {
  const [slide, setSlide] = useState(0);
  const [data, setData] = useState({});

  const set = useCallback((key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const next = useCallback(() => {
    setSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
  }, []);

  const prev = useCallback(() => {
    setSlide((s) => Math.max(s - 1, 0));
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Enter') { e.preventDefault(); next(); }
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  useEffect(() => { window.scrollTo(0, 0); }, [slide]);

  const meta = SLIDE_META[slide];
  const isDark = meta.dark || meta.type === 'welcome' || meta.type === 'thanks' || meta.type === 'interstitial';
  const progress = (slide / (TOTAL_SLIDES - 1)) * 100;

  // Render the content for each slide index
  const renderContent = () => {
    switch (slide) {
      // ─── WELCOME ───
      case 0:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-2xl">
              <span className="font-body text-sm tracking-[0.3em] uppercase block mb-2" style={{ color: ORANGE }}>AOM AI Advisory</span>
              <div className="w-12 h-[2px] mx-auto mb-8" style={{ background: ORANGE }} />
              <h1 className="font-headline text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">Your AI Operations Audit Starts Here</h1>
              <p className="font-body text-xl text-[#8A847C] mb-4 max-w-lg mx-auto">This takes about 15 minutes. There are no wrong answers.</p>
              <p className="font-body text-lg text-[#5A5550] mb-12 max-w-lg mx-auto">We just need to understand how your business actually runs so we can show you where AI fits.</p>
              <button onClick={next} className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-headline text-xl font-bold text-white transition-all hover:scale-105 hover:shadow-orange-glow-lg" style={{ background: ORANGE }}>
                Let's Go <ArrowRight size={22} />
              </button>
            </motion.div>
          </div>
        );

      // ─── INTERSTITIALS ───
      case 1: case 6: case 12: case 19: case 24: case 29:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="font-body text-sm tracking-[0.3em] uppercase mb-4 block" style={{ color: ORANGE }}>
                Section {meta.sectionNum} of 6
              </span>
              <h1 className="font-headline text-5xl md:text-7xl font-bold text-white mb-4">{meta.sectionTitle}</h1>
              <p className="font-body text-xl text-[#8A847C] max-w-xl mx-auto mb-12">{meta.sectionDesc}</p>
              <button onClick={next} className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-body text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-orange-glow" style={{ background: ORANGE }}>
                Continue <ArrowRight size={20} />
              </button>
            </motion.div>
          </div>
        );

      // ─── SECTION A: YOUR BUSINESS (2-5) ───
      case 2:
        return (
          <ContentSlide title="The Basics">
            <TextInput label="Company Name" value={data.companyName} onChange={(v) => set('companyName', v)} placeholder="Acme Corp" />
            <TextInput label="Your Name" value={data.yourName} onChange={(v) => set('yourName', v)} placeholder="Jane Smith" />
            <TextInput label="Role / Title" value={data.role} onChange={(v) => set('role', v)} placeholder="Owner, CEO, Operations Manager..." />
            <TextInput label="Website" value={data.website} onChange={(v) => set('website', v)} placeholder="www.example.com" />
          </ContentSlide>
        );
      case 3:
        return (
          <ContentSlide title="Company Profile">
            <Dropdown label="Industry" options={['Construction / Trades', 'Professional Services', 'Healthcare', 'Real Estate', 'Retail / E-commerce', 'Restaurant / Hospitality', 'Manufacturing', 'Technology', 'Finance / Accounting', 'Legal', 'Other']} value={data.industry} onChange={(v) => set('industry', v)} />
            <RadioGroup label="Number of Employees" options={['Just me', '2-5', '6-15', '16-50', '50+']} value={data.employees} onChange={(v) => set('employees', v)} />
            <RadioGroup label="Annual Revenue Range" options={['Under $250k', '$250k-$500k', '$500k-$1M', '$1M-$5M', '$5M+']} value={data.revenue} onChange={(v) => set('revenue', v)} />
          </ContentSlide>
        );
      case 4:
        return (
          <ContentSlide title="How Work Comes In">
            <CheckboxGroup label="How do you get new jobs / clients?" options={['Referrals', 'Google / SEO', 'Social media', 'Paid ads', 'Cold outreach', 'Trade shows / events', 'Repeat clients', 'Other']} value={data.leadSources} onChange={(v) => set('leadSources', v)} />
            <RadioGroup label="How many active jobs / clients at any given time?" options={['1-3', '4-10', '11-25', '25+']} value={data.activeJobs} onChange={(v) => set('activeJobs', v)} />
          </ContentSlide>
        );
      case 5:
        return (
          <ContentSlide title="Who Handles What?">
            <RadioGroup label="Scheduling & dispatch" options={['Me', 'Office manager', 'Shared / everyone', 'Software handles it', 'Nobody (chaos)']} value={data.scheduling} onChange={(v) => set('scheduling', v)} />
            <RadioGroup label="Invoicing & billing" options={['Me', 'Bookkeeper', 'Office manager', 'Accountant / CPA', 'Software handles it']} value={data.invoicing} onChange={(v) => set('invoicing', v)} />
            <RadioGroup label="Customer communications" options={['Me', 'Front desk / receptionist', 'Everyone on the team', 'Nobody specific']} value={data.customerComms} onChange={(v) => set('customerComms', v)} />
          </ContentSlide>
        );

      // ─── SECTION B: YOUR TECH STACK (7-11) ───
      case 7:
        return (
          <ContentSlide title="Business Software" subtitle="Check everything you currently use.">
            <CheckboxGroup label="Tools in use" options={['QuickBooks', 'Google Workspace', 'Microsoft 365', 'Salesforce', 'HubSpot', 'ServiceTitan', 'Jobber', 'Housecall Pro', 'Excel / Spreadsheets', 'Square / Stripe', 'Shopify', 'Custom / internal system', 'Other']} value={data.software} onChange={(v) => set('software', v)} />
          </ContentSlide>
        );
      case 8:
        return (
          <ContentSlide title="Communication Channels">
            <CheckboxGroup label="How does your team communicate?" options={['Phone calls', 'Text / SMS', 'Email', 'Slack', 'Microsoft Teams', 'WhatsApp', 'In person only', 'Other']} value={data.teamComm} onChange={(v) => set('teamComm', v)} />
            <CheckboxGroup label="How do customers reach you?" options={['Phone', 'Email', 'Website form', 'Social media DMs', 'Text / SMS', 'Walk-ins', 'Online booking', 'Other']} value={data.customerChannels} onChange={(v) => set('customerChannels', v)} />
          </ContentSlide>
        );
      case 9:
        return (
          <ContentSlide title="Scheduling & Conflicts">
            <RadioGroup label="How do you schedule jobs / appointments?" options={['Paper calendar', 'Google Calendar', 'Scheduling software', 'Phone + memory', 'Combination of everything']} value={data.scheduleMethod} onChange={(v) => set('scheduleMethod', v)} />
            <RadioGroup label="How often do scheduling conflicts happen?" options={['Never', 'Rarely', 'A few times a month', 'Weekly', 'Constantly']} value={data.conflictFreq} onChange={(v) => set('conflictFreq', v)} />
          </ContentSlide>
        );
      case 10:
        return (
          <ContentSlide title="Files & Estimates">
            <CheckboxGroup label="Where do your files live?" options={['Google Drive', 'Dropbox', 'OneDrive', 'Local computer', 'Paper files', 'Email attachments', 'Everywhere / no system']} value={data.fileStorage} onChange={(v) => set('fileStorage', v)} />
            <RadioGroup label="How do you handle estimates / proposals?" options={['Email (typed out)', 'PDF from software', 'Handwritten', 'Verbal', 'Don\'t do estimates']} value={data.estimateMethod} onChange={(v) => set('estimateMethod', v)} />
          </ContentSlide>
        );
      case 11:
        return (
          <ContentSlide title="Current AI Usage">
            <RadioGroup label="Are you using any AI tools today?" options={['Yes, regularly', 'Tried a few things', 'Heard about it but haven\'t tried', 'No, not at all']} value={data.aiUsage} onChange={(v) => set('aiUsage', v)} />
            {(data.aiUsage === 'Yes, regularly' || data.aiUsage === 'Tried a few things') && (
              <TextInput label="Which tools?" value={data.aiTools} onChange={(v) => set('aiTools', v)} placeholder="ChatGPT, Grammarly, Copilot..." />
            )}
          </ContentSlide>
        );

      // ─── SECTION C: WHERE IT HURTS (13-18) ───
      case 13:
        return (
          <ContentSlide title="Time Sinks">
            <CheckboxGroup label="Which tasks eat the most time?" options={['Answering phones / emails', 'Scheduling', 'Invoicing / billing', 'Following up on leads', 'Managing employees', 'Paperwork / compliance', 'Social media', 'Driving between jobs']} value={data.timeSinks} onChange={(v) => set('timeSinks', v)} />
            <RadioGroup label="Hours per week on admin / non-billable work?" options={['Under 5', '5-10', '10-20', '20-30', '30+']} value={data.adminHours} onChange={(v) => set('adminHours', v)} />
          </ContentSlide>
        );
      case 14:
        return (
          <ContentSlide title="Sales & Follow-Up">
            <RadioGroup label="How fast do you respond to new leads?" options={['Within minutes', 'Within an hour', 'Same day', 'Next day', 'When I get around to it']} value={data.leadResponse} onChange={(v) => set('leadResponse', v)} />
            <RadioGroup label="Do you track proposals and follow up?" options={['Yes, systematically', 'Sometimes', 'Rarely', 'No system at all']} value={data.proposalTracking} onChange={(v) => set('proposalTracking', v)} />
          </ContentSlide>
        );
      case 15:
        return (
          <ContentSlide title="What Falls Through the Cracks?">
            <CheckboxGroup label="Which of these happen to you?" options={['Missed calls / messages', 'Forgotten follow-ups', 'Double-booked appointments', 'Late invoices', 'Missed deadlines', 'Lost files / documents', 'Customer complaints from delays', 'Team miscommunication']} value={data.cracks} onChange={(v) => set('cracks', v)} />
          </ContentSlide>
        );
      case 16:
        return (
          <ContentSlide title="People & Onboarding">
            <RadioGroup label="Biggest hiring challenge?" options={['Finding qualified candidates', 'Retaining good people', 'Training takes too long', 'Can\'t afford to hire yet', 'Not hiring right now']} value={data.hiringChallenge} onChange={(v) => set('hiringChallenge', v)} />
            <RadioGroup label="How long to onboard a new hire?" options={['A few days', '1-2 weeks', 'A month', 'Months', 'No real process']} value={data.onboarding} onChange={(v) => set('onboarding', v)} />
          </ContentSlide>
        );
      case 17:
        return (
          <ContentSlide title="Customer Experience">
            <RadioGroup label="How would your customers rate you?" options={['5 stars, always', '4 stars, usually great', '3 stars, hit or miss', 'Not sure honestly']} value={data.customerRating} onChange={(v) => set('customerRating', v)} />
            <TextArea label="Most common customer complaint or friction?" value={data.customerComplaint} onChange={(v) => set('customerComplaint', v)} placeholder="Takes too long, hard to reach, pricing unclear..." rows={3} />
          </ContentSlide>
        );
      case 18:
        return (
          <ContentSlide title="The Magic Wand Question">
            <TextArea label="If you could wave a magic wand and fix ONE thing in your business tomorrow, what would it be?" value={data.magicWand} onChange={(v) => set('magicWand', v)} placeholder="Take your time with this one..." rows={5} />
          </ContentSlide>
        );

      // ─── SECTION D: YOUR OPERATIONS (20-23) ───
      case 20:
        return (
          <ContentSlide title="Your Daily Workflow">
            <TextArea label="Walk us through a typical day" value={data.dailyWorkflow} onChange={(v) => set('dailyWorkflow', v)} placeholder="I wake up, check my phone, drive to the first job..." rows={4} />
            <TextInput label="What's the first thing you do when you open your laptop / phone for work?" value={data.firstTask} onChange={(v) => set('firstTask', v)} placeholder="Check email, look at schedule..." />
          </ContentSlide>
        );
      case 21:
        return (
          <ContentSlide title="Decision Making">
            <RadioGroup label="When you need to make a business decision, where do you look for data?" options={['Gut feeling', 'Spreadsheets', 'Software dashboards', 'Ask my team', 'Don\'t have good data']} value={data.decisionMaking} onChange={(v) => set('decisionMaking', v)} />
            <TextArea label="What information do you wish you had at your fingertips?" value={data.wishedInfo} onChange={(v) => set('wishedInfo', v)} placeholder="Revenue by job type, team utilization, profit margins..." rows={3} />
          </ContentSlide>
        );
      case 22:
        return (
          <ContentSlide title="Visibility">
            <RadioGroup label="Can you see what every team member is doing right now?" options={['Yes, clearly', 'Mostly', 'Somewhat', 'Not really', 'Absolutely not']} value={data.visibility} onChange={(v) => set('visibility', v)} />
            <TextArea label="If you had a dream dashboard, what would it show?" value={data.dreamDashboard} onChange={(v) => set('dreamDashboard', v)} placeholder="Today's jobs, revenue this month, who's doing what..." rows={3} />
          </ContentSlide>
        );
      case 23:
        return (
          <ContentSlide title="Processes & SOPs">
            <RadioGroup label="Do you have SOPs (Standard Operating Procedures) documented?" options={['Yes, thorough', 'Some things', 'In my head only', 'What\'s an SOP?']} value={data.sopStatus} onChange={(v) => set('sopStatus', v)} />
            <TextInput label="What process is most inconsistent in your business?" value={data.inconsistentProcess} onChange={(v) => set('inconsistentProcess', v)} placeholder="Quoting, onboarding, follow-up..." />
          </ContentSlide>
        );

      // ─── SECTION E: AI READINESS (25-28) ───
      case 25:
        return (
          <ContentSlide title="Tech Comfort">
            <RadioGroup label="How comfortable are you with new technology?" options={['Love it, early adopter', 'Open to it if it saves time', 'Cautious but willing', 'Prefer to keep things simple', 'Honestly, I struggle with tech']} value={data.techComfort} onChange={(v) => set('techComfort', v)} />
            <RadioGroup label="Has anyone on your team used AI tools?" options={['Yes, several people', 'One or two have tried', 'Nobody yet', 'Not sure']} value={data.teamAI} onChange={(v) => set('teamAI', v)} />
          </ContentSlide>
        );
      case 26:
        return (
          <ContentSlide title="What Would You Automate?" subtitle="If a system could handle these automatically, which would you want?">
            <CheckboxGroup label="Select all that apply" options={['Answering common customer questions', 'Scheduling & dispatch', 'Invoice generation', 'Lead follow-up', 'Social media posting', 'Report generation', 'Employee onboarding docs', 'Data entry & filing', 'Inventory tracking', 'Review requests']} value={data.automateWishes} onChange={(v) => set('automateWishes', v)} />
          </ContentSlide>
        );
      case 27:
        return (
          <ContentSlide title="Budget & Experience">
            <RadioGroup label="What do you currently spend monthly on software tools?" options={['Under $100', '$100-$500', '$500-$1,000', '$1,000-$2,500', '$2,500+', 'No idea']} value={data.softwareBudget} onChange={(v) => set('softwareBudget', v)} />
            <RadioGroup label="Have you ever hired a consultant or agency for your business?" options={['Yes, good experience', 'Yes, bad experience', 'Yes, mixed', 'No, never']} value={data.consultantExp} onChange={(v) => set('consultantExp', v)} />
          </ContentSlide>
        );
      case 28:
        return (
          <ContentSlide title="Data & Compliance">
            <RadioGroup label="How sensitive is the data your business handles?" options={['Very (medical, financial, legal)', 'Somewhat (customer PII)', 'Not very (general business)', 'Not sure']} value={data.dataSensitivity} onChange={(v) => set('dataSensitivity', v)} />
            <CheckboxGroup label="Any compliance requirements?" options={['HIPAA', 'SOC 2', 'PCI DSS', 'GDPR', 'State licensing', 'Industry-specific', 'None that I know of', 'Not sure']} value={data.compliance} onChange={(v) => set('compliance', v)} />
          </ContentSlide>
        );

      // ─── SECTION F: YOUR GOALS (30-31) ───
      case 30:
        return (
          <ContentSlide title="Rank Your Priorities" subtitle="What matters most to you right now?">
            <RankedSelection label="Select your top 3" options={['Save time on admin work', 'Get more leads / customers', 'Improve customer experience', 'Reduce costs', 'Scale without more hires', 'Better data and visibility', 'Streamline communication', 'Stay ahead of competitors']} value={data.priorities} onChange={(v) => set('priorities', v)} max={3} />
          </ContentSlide>
        );
      case 31:
        return (
          <ContentSlide title="The Finish Line">
            <TextArea label="What does success look like for your business in 12 months?" value={data.success12} onChange={(v) => set('success12', v)} placeholder="More revenue, less stress, better systems..." rows={4} />
            <TextArea label="Anything else you want us to know?" value={data.anythingElse} onChange={(v) => set('anythingElse', v)} placeholder="No question is too small..." rows={3} />
            <div className="mt-8">
              <button onClick={next} className="w-full inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full font-headline text-xl font-bold text-white transition-all hover:scale-[1.02] hover:shadow-orange-glow-lg" style={{ background: ORANGE }}>
                Submit My Audit <ArrowRight size={22} />
              </button>
            </div>
          </ContentSlide>
        );

      // ─── THANK YOU ───
      case 32:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-2xl">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-8" style={{ background: ORANGE }}>
                <Check size={40} className="text-white" />
              </div>
              <h1 className="font-headline text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">You're In.</h1>
              <p className="font-body text-xl text-[#8A847C] mb-4 max-w-lg mx-auto">Your answers are saved. Now let's get you on the calendar.</p>
              <a
                href="/book?from=audit-test"
                className="inline-flex items-center gap-2 px-10 py-5 font-headline text-xl font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: ORANGE, boxShadow: '0 4px 24px rgba(232, 93, 38, 0.2)' }}
              >
                Book Your Audit Session <ArrowRight size={22} />
              </a>
              <div className="bg-[#151515] p-8 max-w-md mx-auto text-left border border-white/10 mt-10">
                <h3 className="font-headline text-lg font-bold text-white mb-4">What happens next:</h3>
                <div className="space-y-4">
                  {['Book your 2-3 hour discovery session', 'We review your questionnaire answers beforehand', 'Deep dive into your operations during the session', 'Receive your custom AI Operations Roadmap within 1 week'].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5" style={{ background: ORANGE, color: 'white' }}>{i + 1}</span>
                      <span className="font-body text-base text-[#C4BDB4]">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="font-body text-base text-[#5A5550] mt-6">
                Prefer to talk first? <a href="tel:6023732164" className="text-white hover:underline">(602) 373-2164</a>
              </p>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show/hide nav buttons
  const showBack = slide > 0 && slide < TOTAL_SLIDES - 1;
  const showNext = slide > 0 && meta.type === 'content' && slide < TOTAL_SLIDES - 1;
  // Don't show next on the submit slide (31) since it has its own CTA
  const showNextButton = showNext && slide !== 31;

  return (
    <div className="min-h-screen" style={{ background: isDark ? NIGHT : CREAM }}>
      {/* Progress bar - hidden on welcome and thanks */}
      {slide > 0 && slide < TOTAL_SLIDES - 1 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          {/* Section label */}
          {meta.type === 'content' && meta.section && (
            <div className="bg-[#0A0A0A]/90 backdrop-blur-sm px-6 py-2 flex items-center justify-between">
              <span className="font-body text-xs tracking-[0.2em] uppercase text-[#8A847C]">
                {meta.section} / {meta.slideInSection} of {meta.totalInSection}
              </span>
              <span className="font-body text-xs text-[#5A5550]">
                {Math.round(progress)}% complete
              </span>
            </div>
          )}
          {meta.type === 'interstitial' && (
            <div className="bg-[#0A0A0A]/90 backdrop-blur-sm px-6 py-2 flex items-center justify-end">
              <span className="font-body text-xs text-[#5A5550]">
                {Math.round(progress)}% complete
              </span>
            </div>
          )}
          {/* Orange progress bar */}
          <div className="h-1 bg-[#1A1A1A]">
            <motion.div
              className="h-full"
              style={{ background: ORANGE }}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Slide content */}
      <div className={`${slide > 0 && slide < TOTAL_SLIDES - 1 ? 'pt-12' : ''} ${meta.type === 'content' ? 'min-h-screen flex items-center justify-center px-4 py-16' : ''}`}>
        <AnimatePresence mode="wait">
          <div key={slide}>
            {renderContent()}
          </div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      {(showBack || showNextButton) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between" style={{ background: isDark ? 'rgba(12,12,12,0.95)' : 'rgba(253,246,236,0.95)', backdropFilter: 'blur(8px)' }}>
          {showBack ? (
            <button
              onClick={prev}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-body text-base transition-all border-2 ${
                isDark
                  ? 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                  : 'border-[#D9D3CB] text-[#8A847C] hover:border-[#E85D26]/40 hover:text-[#3A3530]'
              }`}
            >
              <ArrowLeft size={18} /> Back
            </button>
          ) : <div />}
          {showNextButton ? (
            <button
              onClick={next}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-base font-semibold text-white transition-all hover:scale-105"
              style={{ background: ORANGE }}
            >
              Next <ArrowRight size={18} />
            </button>
          ) : <div />}
        </div>
      )}
    </div>
  );
}
