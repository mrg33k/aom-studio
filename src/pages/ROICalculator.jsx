import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, DollarSign, TrendingUp, Calendar, Check, Info, Users,
  ChevronDown, ArrowRight, Mail
} from 'lucide-react';

// ─── BRAND TOKENS ───
const ORANGE = '#E85D26';
const SAGE = '#7C9A72';

// ─── INDUSTRY DATA ───
const INDUSTRIES = [
  { value: '', label: 'Select your industry' },
  { value: 'construction', label: 'Construction / Trades' },
  { value: 'professional', label: 'Professional Services (CPA / Law / Consulting)' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'restaurant', label: 'Restaurant / Hospitality' },
  { value: 'other', label: 'Other' },
];

const AUTOMATION_RATES = {
  construction: 0.35,
  professional: 0.40,
  healthcare: 0.30,
  restaurant: 0.35,
  other: 0.30,
};

const REVENUE_UPLIFT_RATES = {
  construction: 0.04,
  professional: 0.03,
  healthcare: 0.02,
  restaurant: 0.04,
  other: 0.03,
};

const INDUSTRY_AUTOMATIONS = {
  construction: [
    'Estimate follow-ups and bid tracking',
    'Crew scheduling and dispatch coordination',
    'Invoice generation and payment reminders',
    'Customer communication (appointment confirmations, status updates)',
    'Lead response and qualification',
    'Job documentation and photo organization',
    'Material ordering reminders',
  ],
  professional: [
    'Client document collection and reminders',
    'Appointment scheduling and confirmations',
    'Recurring report generation',
    'Email triage and response drafting',
    'Client onboarding workflows',
    'Deadline tracking and compliance reminders',
    'Marketing outreach and newsletter scheduling',
  ],
  healthcare: [
    'Patient scheduling and reminders',
    'Follow-up appointment booking',
    'Insurance verification workflows',
    'Patient intake form processing',
    'Review and reputation management',
    'Referral tracking',
  ],
  restaurant: [
    'Reservation management and confirmations',
    'Staff scheduling',
    'Inventory alerts and ordering',
    'Customer review responses',
    'Event inquiry follow-ups',
    'Social media posting schedule',
  ],
  other: [
    'Email triage and response drafting',
    'Appointment scheduling and confirmations',
    'Invoice generation and payment reminders',
    'Lead response and qualification',
    'Client onboarding workflows',
    'Report generation and data entry',
  ],
};

// ─── CONSTANTS ───
const SETUP_COST = 9000;
const MONTHLY_SYSTEM_COST = 2250;
const SOFTWARE_SAVINGS_RATE = 0.15;
const MAX_AUTOMATION_CAP = 0.50;

// ─── UTILITIES ───
const formatCurrency = (num) => {
  if (num < 0) return '-$' + Math.abs(Math.round(num)).toLocaleString();
  return '$' + Math.round(num).toLocaleString();
};

const formatPercent = (num) => Math.round(num) + '%';

// ─── ANIMATED NUMBER ───
function AnimatedNumber({ value, format = 'number', duration = 1200, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef(null);
  const prefersReduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (prefersReduced.current) {
      setDisplayValue(value);
      prevValue.current = value;
      return;
    }

    const startValue = prevValue.current;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  let formatted;
  if (format === 'currency') {
    formatted = formatCurrency(displayValue);
  } else if (format === 'decimal') {
    formatted = displayValue.toFixed(1);
  } else {
    formatted = Math.round(displayValue).toLocaleString();
  }

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ─── NOISE OVERLAY ───
function NoiseOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]" style={{ mixBlendMode: 'overlay', opacity: 0.03 }}>
      <svg width="100%" height="100%">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
}

// ─── SCROLL REVEAL ───
function ScrollReveal({ children, className = '', delay = 0 }) {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, y: 30 }}
      whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───
export default function ROICalculator() {
  // ─── STATE ───
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState(5);
  const [adminHours, setAdminHours] = useState(10);
  const [hourlyRate, setHourlyRate] = useState('75');
  const [softwareSpend, setSoftwareSpend] = useState('500');
  const [monthlyRevenue, setMonthlyRevenue] = useState('50000');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState(null);
  const [inputsChanged, setInputsChanged] = useState(false);
  const resultsRef = useRef(null);

  // Track if defaults have been changed
  const [touchedFields, setTouchedFields] = useState(new Set());

  // URL params pre-fill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('industry')) {
      const ind = params.get('industry').toLowerCase();
      if (AUTOMATION_RATES[ind]) setIndustry(ind);
    }
    if (params.get('team')) {
      const t = parseInt(params.get('team'));
      if (t >= 1 && t <= 50) setTeamSize(t);
    }
    if (params.get('hours')) {
      const h = parseInt(params.get('hours'));
      if (h >= 2 && h <= 25) setAdminHours(h);
    }
    if (params.get('rate')) {
      const r = params.get('rate');
      if (parseInt(r) >= 25 && parseInt(r) <= 500) setHourlyRate(r);
    }
    if (params.get('software')) {
      const s = params.get('software');
      if (parseInt(s) >= 0 && parseInt(s) <= 5000) setSoftwareSpend(s);
    }
    if (params.get('revenue')) {
      const rev = params.get('revenue');
      if (parseInt(rev) >= 10000 && parseInt(rev) <= 2000000) setMonthlyRevenue(rev);
    }
  }, []);

  // ─── CALCULATION ENGINE ───
  const calculate = useCallback(() => {
    const rate = parseFloat(hourlyRate) || 75;
    const software = parseFloat(softwareSpend) || 0;
    const revenue = parseFloat(monthlyRevenue) || 50000;

    const automationRate = Math.min(AUTOMATION_RATES[industry] || 0.30, MAX_AUTOMATION_CAP);
    const revenueUpliftRate = REVENUE_UPLIFT_RATES[industry] || 0.03;

    const totalAdminHours = teamSize * adminHours;
    const automatableHoursPerWeek = totalAdminHours * automationRate;
    const weeklySavingsValue = automatableHoursPerWeek * rate;
    const monthlySavingsValue = weeklySavingsValue * 4.33;
    const monthlyRevenueUplift = revenue * revenueUpliftRate;
    const monthlySoftwareSavings = software * SOFTWARE_SAVINGS_RATE;
    const totalMonthlyValue = monthlySavingsValue + monthlyRevenueUplift + monthlySoftwareSavings;
    const netMonthlyBenefit = totalMonthlyValue - MONTHLY_SYSTEM_COST;
    const breakevenMonths = netMonthlyBenefit > 0 ? SETUP_COST / netMonthlyBenefit : 999;

    // Annual calcs
    const year1TotalValue = totalMonthlyValue * 12;
    const year1SystemCost = SETUP_COST + (MONTHLY_SYSTEM_COST * 12);
    const year1NetBenefit = year1TotalValue - year1SystemCost;
    const year2TotalValue = totalMonthlyValue * 12;
    const year2SystemCost = MONTHLY_SYSTEM_COST * 12;
    const year2NetBenefit = year2TotalValue - year2SystemCost;
    const year3TotalValue = totalMonthlyValue * 12;
    const year3SystemCost = MONTHLY_SYSTEM_COST * 12;
    const year3NetBenefit = year3TotalValue - year3SystemCost;

    const cumulativeYear1 = year1NetBenefit;
    const cumulativeYear2 = cumulativeYear1 + year2NetBenefit;
    const cumulativeYear3 = cumulativeYear2 + year3NetBenefit;

    const year1ROI = year1SystemCost > 0 ? (year1NetBenefit / year1SystemCost) * 100 : 0;
    const year2ROI = (year1SystemCost + year2SystemCost) > 0 ? (cumulativeYear2 / (year1SystemCost + year2SystemCost)) * 100 : 0;
    const year3ROI = (year1SystemCost + year2SystemCost + year3SystemCost) > 0 ? (cumulativeYear3 / (year1SystemCost + year2SystemCost + year3SystemCost)) * 100 : 0;

    const annualHours = Math.round(automatableHoursPerWeek * 4.33 * 12);

    // Percentage breakdown
    const timePct = totalMonthlyValue > 0 ? (monthlySavingsValue / totalMonthlyValue) * 100 : 0;
    const revPct = totalMonthlyValue > 0 ? (monthlyRevenueUplift / totalMonthlyValue) * 100 : 0;
    const softPct = totalMonthlyValue > 0 ? (monthlySoftwareSavings / totalMonthlyValue) * 100 : 0;

    return {
      automatableHoursPerWeek: Math.round(automatableHoursPerWeek),
      annualHours,
      monthlySavingsValue,
      monthlyRevenueUplift,
      monthlySoftwareSavings,
      totalMonthlyValue,
      netMonthlyBenefit,
      breakevenMonths: Math.min(breakevenMonths, 99),
      hourlyRate: rate,
      softwareSpendValue: software,
      year1: { totalValue: year1TotalValue, systemCost: year1SystemCost, netBenefit: year1NetBenefit, roi: year1ROI },
      year2: { totalValue: year2TotalValue, systemCost: year2SystemCost, netBenefit: year2NetBenefit, roi: year2ROI },
      year3: { totalValue: year3TotalValue, systemCost: year3SystemCost, netBenefit: year3NetBenefit, roi: year3ROI },
      timePct, revPct, softPct,
      isLargeTeam: teamSize > 30,
      isDefaultsUnchanged: touchedFields.size === 0,
      showSoftwareLine: software > 0,
      breakevenStatus: breakevenMonths < 4 ? 'great' : breakevenMonths <= 8 ? 'good' : breakevenMonths <= 12 ? 'cautious' : 'poor',
    };
  }, [industry, teamSize, adminHours, hourlyRate, softwareSpend, monthlyRevenue, touchedFields]);

  const handleCalculate = () => {
    if (!industry) return;

    setIsCalculating(true);

    // Track analytics (GA4)
    if (typeof gtag === 'function') {
      gtag('event', 'roi_calculate', {
        event_category: 'ROI Calculator',
        industry: industry,
        team_size: teamSize,
        admin_hours: adminHours,
      });
    }

    setTimeout(() => {
      const newResults = calculate();
      setResults(newResults);
      setHasCalculated(true);
      setIsCalculating(false);
      setInputsChanged(false);

      // Scroll to results
      setTimeout(() => {
        if (resultsRef.current) {
          const top = resultsRef.current.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 100);
    }, 400);
  };

  const handleRecalculate = () => {
    if (!industry) return;
    setIsCalculating(true);

    setTimeout(() => {
      const newResults = calculate();
      setResults(newResults);
      setIsCalculating(false);
      setInputsChanged(false);
    }, 400);
  };

  const markTouched = (field) => {
    setTouchedFields(prev => new Set([...prev, field]));
    if (hasCalculated) setInputsChanged(true);
  };

  // Dollar input formatting
  const formatDollarInput = (value) => {
    const num = value.replace(/[^0-9]/g, '');
    return num ? parseInt(num).toLocaleString() : '';
  };

  const parseDollarInput = (formatted) => {
    return formatted.replace(/[^0-9]/g, '');
  };

  // Breakeven accent color
  const getBreakevenColor = (status) => {
    switch (status) {
      case 'great': return SAGE;
      case 'good': return ORANGE;
      case 'cautious': return '#CC3F00';
      case 'poor': return '#78716C';
      default: return ORANGE;
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#F5F0EB] relative">
      <NoiseOverlay />

      {/* ═══ ZONE 1: INPUT SECTION ═══ */}
      <section className="relative z-10 pt-24 md:pt-32 pb-16 md:pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-4 block">
              AI OPERATIONS
            </span>
            <div className="w-12 h-[2px] bg-[#E85D26] mb-6" />
            <h1 className="font-headline text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter text-[#F5F0EB] max-w-3xl">
              WHAT WOULD AI SAVE YOUR BUSINESS?
            </h1>
            <p className="text-[#A89F96] text-base md:text-lg mt-6 max-w-xl font-body">
              Six inputs. Thirty seconds. A clear picture of what's possible.
            </p>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-12 md:mt-16">
            {/* Field 1: Industry */}
            <FieldContainer>
              <FieldLabel>Industry</FieldLabel>
              <HelperText>Select your industry for tailored estimates</HelperText>
              <div className="relative">
                <select
                  value={industry}
                  onChange={(e) => { setIndustry(e.target.value); markTouched('industry'); }}
                  className="w-full bg-[#0C0C0C] border border-[#D9D3CB]/20 rounded-sm px-4 py-3 text-[#F5F0EB] font-body text-base appearance-none cursor-pointer focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20 transition-colors duration-200"
                  aria-label="Select your industry"
                >
                  {INDUSTRIES.map(i => (
                    <option key={i.value} value={i.value} disabled={i.value === ''}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A89F96] pointer-events-none" />
              </div>
            </FieldContainer>

            {/* Field 2: Team Size */}
            <FieldContainer>
              <div className="flex items-baseline justify-between mb-1">
                <FieldLabel noMargin>Team size</FieldLabel>
                <span className="font-headline text-2xl font-black italic tabular-nums text-[#F5F0EB]">
                  {teamSize}
                </span>
              </div>
              <HelperText>How many people work at your company?</HelperText>
              <input
                type="range"
                min={1}
                max={50}
                value={teamSize}
                onChange={(e) => { setTeamSize(parseInt(e.target.value)); markTouched('teamSize'); }}
                className="w-full slider-orange mt-2"
                style={{ background: `linear-gradient(to right, #E85D26 ${((teamSize - 1) / 49) * 100}%, rgba(217,211,203,0.2) ${((teamSize - 1) / 49) * 100}%)` }}
                aria-label="Team size"
                aria-valuenow={teamSize}
                aria-valuemin={1}
                aria-valuemax={50}
              />
              <div className="flex justify-between text-[10px] font-mono text-[#9A9189] mt-1">
                <span>1</span>
                <span>50</span>
              </div>
            </FieldContainer>

            {/* Field 3: Admin Hours */}
            <FieldContainer>
              <div className="flex items-baseline justify-between mb-1">
                <FieldLabel noMargin>Non-billable hours per person</FieldLabel>
                <span>
                  <span className="font-headline text-2xl font-black italic tabular-nums text-[#F5F0EB]">{adminHours}</span>
                  <span className="text-sm text-[#A89F96] ml-1">hrs</span>
                </span>
              </div>
              <HelperText>Email, scheduling, invoicing, follow-ups, data entry. Most small businesses report 8-15 hours per person per week.</HelperText>
              <input
                type="range"
                min={2}
                max={25}
                value={adminHours}
                onChange={(e) => { setAdminHours(parseInt(e.target.value)); markTouched('adminHours'); }}
                className="w-full slider-orange mt-2"
                style={{ background: `linear-gradient(to right, #E85D26 ${((adminHours - 2) / 23) * 100}%, rgba(217,211,203,0.2) ${((adminHours - 2) / 23) * 100}%)` }}
                aria-label="Admin hours per person per week"
                aria-valuenow={adminHours}
                aria-valuemin={2}
                aria-valuemax={25}
              />
              <div className="flex justify-between text-[10px] font-mono text-[#9A9189] mt-1">
                <span>2 hrs</span>
                <span>25 hrs</span>
              </div>
            </FieldContainer>

            {/* Field 4: Hourly Rate */}
            <FieldContainer>
              <FieldLabel>Average hourly rate</FieldLabel>
              <HelperText>If you're a $200k/year business with 2 people working 50 weeks, that's roughly $40/hour per person.</HelperText>
              <DollarInput
                value={hourlyRate}
                onChange={(v) => { setHourlyRate(v); markTouched('hourlyRate'); }}
                placeholder="75"
                ariaLabel="Average hourly rate"
              />
            </FieldContainer>

            {/* Field 5: Software Spend */}
            <FieldContainer>
              <FieldLabel>Monthly software spend</FieldLabel>
              <HelperText>Include everything: QuickBooks, ServiceTitan, Mailchimp, Calendly, project management tools, etc.</HelperText>
              <DollarInput
                value={softwareSpend}
                onChange={(v) => { setSoftwareSpend(v); markTouched('softwareSpend'); }}
                placeholder="500"
                ariaLabel="Monthly software spend"
              />
            </FieldContainer>

            {/* Field 6: Monthly Revenue */}
            <FieldContainer>
              <FieldLabel>Monthly revenue</FieldLabel>
              <HelperText>Ballpark is fine. This helps estimate the revenue impact of faster follow-ups.</HelperText>
              <DollarInput
                value={monthlyRevenue}
                onChange={(v) => { setMonthlyRevenue(v); markTouched('monthlyRevenue'); }}
                placeholder="50,000"
                ariaLabel="Approximate monthly revenue"
              />
            </FieldContainer>
          </div>

          {/* Calculate Button */}
          <div className="mt-10 w-full">
            <button
              onClick={hasCalculated && inputsChanged ? handleRecalculate : handleCalculate}
              disabled={!industry || isCalculating}
              className={`w-full bg-[#E85D26] text-white font-headline font-black uppercase tracking-tight text-base md:text-lg px-8 py-5 shadow-lg transition-colors duration-300 cursor-pointer ${
                !industry || isCalculating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#D14E1C]'
              }`}
              style={{ boxShadow: '0 4px 24px rgba(232, 93, 38, 0.2)' }}
            >
              {isCalculating ? (
                <span className="animate-pulse">CALCULATING...</span>
              ) : hasCalculated && inputsChanged ? (
                'RECALCULATE'
              ) : (
                'CALCULATE MY ROI'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ ZONE 2: RESULTS SECTION ═══ */}
      <AnimatePresence>
        {hasCalculated && results && (
          <motion.section
            ref={resultsRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative z-10 bg-[#141412] border-t border-[#D9D3CB]/10 py-16 md:py-24 px-6"
            aria-live="polite"
          >
            {/* Subtle warm gradient behind results */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.02] to-transparent pointer-events-none" />

            <div className="relative max-w-6xl mx-auto">
              {/* Defaults unchanged nudge */}
              {results.isDefaultsUnchanged && (
                <div className="bg-[#1A1A17] border border-[#7C9A72]/30 rounded-sm px-6 py-3 mb-8 flex items-center gap-3">
                  <Info size={16} className="text-[#7C9A72] flex-shrink-0" />
                  <span className="text-[#A89F96] text-sm font-body">
                    Adjust the inputs to match your business for a more accurate estimate.
                  </span>
                </div>
              )}

              {/* Large team callout */}
              {results.isLargeTeam && (
                <div className="bg-[#1A1A17] border border-[#7C9A72]/30 rounded-sm px-6 py-4 mb-8 flex items-start gap-3">
                  <Users size={16} className="text-[#7C9A72] flex-shrink-0 mt-0.5" />
                  <span className="text-[#A89F96] text-sm font-body">
                    For larger teams, we recommend a custom scoping call for more precise numbers.{' '}
                    <a href="/audit/test" className="text-[#E85D26] hover:underline">Schedule a call</a>
                  </span>
                </div>
              )}

              {/* Result Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Card 1: Hours Recovered */}
                <ResultCard delay={0} accentColor={SAGE}>
                  <CardIcon Icon={Clock} color={SAGE} borderColor="rgba(124, 154, 114, 0.3)" />
                  <div className="mt-4">
                    <span className="font-headline text-4xl md:text-5xl lg:text-6xl font-black italic text-[#F5F0EB] leading-none tabular-nums">
                      <AnimatedNumber value={results.automatableHoursPerWeek} />
                    </span>
                    <span className="text-xl md:text-2xl text-[#A89F96] ml-1 font-bold font-headline">hrs</span>
                  </div>
                  <p className="text-[#A89F96] text-sm font-body mt-3">Hours your team gets back every week</p>
                  <p className="text-[#9A9189] text-xs font-mono mt-2">{results.annualHours.toLocaleString()} hours per year</p>
                </ResultCard>

                {/* Card 2: Monthly Value */}
                <ResultCard delay={0.12} accentColor={ORANGE}>
                  <CardIcon Icon={DollarSign} color={ORANGE} borderColor="rgba(217, 211, 203, 0.2)" />
                  <div className="mt-4">
                    <span className="font-headline text-4xl md:text-5xl lg:text-6xl font-black italic text-[#F5F0EB] leading-none tabular-nums">
                      <AnimatedNumber value={results.monthlySavingsValue} format="currency" />
                    </span>
                  </div>
                  <p className="text-[#A89F96] text-sm font-body mt-3">Monthly value of recovered time</p>
                  <p className="text-[#9A9189] text-xs font-mono mt-2">Based on your ${results.hourlyRate}/hour effective rate</p>
                </ResultCard>

                {/* Card 3: Total Monthly Impact */}
                <ResultCard delay={0.24} accentColor={ORANGE}>
                  <CardIcon Icon={TrendingUp} color={ORANGE} borderColor="rgba(217, 211, 203, 0.2)" />
                  <div className="mt-4">
                    <span className={`font-headline ${results.totalMonthlyValue >= 100000 ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-4xl md:text-5xl lg:text-6xl'} font-black italic text-[#F5F0EB] leading-none tabular-nums`}>
                      <AnimatedNumber value={results.totalMonthlyValue} format="currency" />
                    </span>
                  </div>
                  <p className="text-[#A89F96] text-sm font-body mt-3">Total monthly impact</p>
                  <p className="text-[#9A9189] text-xs font-mono mt-2">
                    Time savings + <em>estimated</em> revenue uplift + software savings
                  </p>
                </ResultCard>

                {/* Card 4: Break-Even */}
                <ResultCard delay={0.36} accentColor={getBreakevenColor(results.breakevenStatus)}>
                  <CardIcon
                    Icon={Calendar}
                    color={getBreakevenColor(results.breakevenStatus)}
                    borderColor={`${getBreakevenColor(results.breakevenStatus)}40`}
                  />
                  <div className="mt-4">
                    <span className="font-headline text-4xl md:text-5xl lg:text-6xl font-black italic text-[#F5F0EB] leading-none tabular-nums">
                      <AnimatedNumber value={Math.min(results.breakevenMonths, 24)} format="decimal" />
                    </span>
                    <span className="text-lg md:text-xl text-[#A89F96] ml-1 font-bold font-headline">months</span>
                  </div>
                  <p className="text-[#A89F96] text-sm font-body mt-3">Months to break even</p>
                  <p className="text-[#9A9189] text-xs font-mono mt-2">Including full setup cost of $9,000</p>
                  {results.breakevenMonths > 12 && (
                    <p className="text-[#A89F96] text-xs font-body mt-2 italic">
                      The audit gives you the real picture.
                    </p>
                  )}
                </ResultCard>
              </div>

              {/* ─── DETAILED BREAKDOWN ─── */}
              <div className="max-w-4xl mx-auto">
                {/* Where the Value Comes From */}
                <ScrollReveal className="mt-16">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-4 block">
                    BREAKDOWN
                  </span>
                  <h2 className="font-headline text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-[#F5F0EB] mb-8">
                    WHERE THE VALUE COMES FROM
                  </h2>

                  <div className="bg-[#1A1A17] border border-[#D9D3CB]/10 rounded-sm overflow-hidden overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="bg-[#0C0C0C] border-b border-[#D9D3CB]/10">
                          <th className="text-left text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4">Source</th>
                          <th className="text-right text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4">Monthly</th>
                          <th className="text-right text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4">Annual</th>
                          <th className="text-right text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4 w-28">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#D9D3CB]/10 hover:bg-[#0C0C0C]/50 transition-colors">
                          <td className="text-[#F5F0EB] font-body text-sm px-6 py-4">
                            Time recovered ({results.automatableHoursPerWeek} hrs/week at ${results.hourlyRate}/hr)
                          </td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">
                            {formatCurrency(results.monthlySavingsValue)}
                          </td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">
                            {formatCurrency(results.monthlySavingsValue * 12)}
                          </td>
                          <td className="text-right px-6 py-4 relative">
                            <div className="absolute inset-0 flex items-center justify-end pr-6">
                              <div className="absolute left-0 top-0 bottom-0 bg-[#E85D26]/[0.08]" style={{ width: `${results.timePct}%` }} />
                              <span className="relative font-mono text-sm tabular-nums text-[#F5F0EB]">{formatPercent(results.timePct)}</span>
                            </div>
                          </td>
                        </tr>
                        <tr className={`border-b border-[#D9D3CB]/10 hover:bg-[#0C0C0C]/50 transition-colors`}>
                          <td className="text-[#F5F0EB] font-body text-sm px-6 py-4">
                            Revenue uplift (faster response + follow-up)
                          </td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">
                            {formatCurrency(results.monthlyRevenueUplift)}
                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#9A9189] bg-[#0C0C0C] px-2 py-0.5 ml-2 rounded-sm">est.</span>
                          </td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">
                            {formatCurrency(results.monthlyRevenueUplift * 12)}
                          </td>
                          <td className="text-right px-6 py-4 relative">
                            <div className="absolute inset-0 flex items-center justify-end pr-6">
                              <div className="absolute left-0 top-0 bottom-0 bg-[#E85D26]/[0.08]" style={{ width: `${results.revPct}%` }} />
                              <span className="relative font-mono text-sm tabular-nums text-[#F5F0EB]">{formatPercent(results.revPct)}</span>
                            </div>
                          </td>
                        </tr>
                        {results.showSoftwareLine && (
                          <tr className="border-b border-[#D9D3CB]/10 hover:bg-[#0C0C0C]/50 transition-colors">
                            <td className="text-[#F5F0EB] font-body text-sm px-6 py-4">
                              Software consolidation
                            </td>
                            <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">
                              {formatCurrency(results.monthlySoftwareSavings)}
                            </td>
                            <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">
                              {formatCurrency(results.monthlySoftwareSavings * 12)}
                            </td>
                            <td className="text-right px-6 py-4 relative">
                              <div className="absolute inset-0 flex items-center justify-end pr-6">
                                <div className="absolute left-0 top-0 bottom-0 bg-[#E85D26]/[0.08]" style={{ width: `${results.softPct}%` }} />
                                <span className="relative font-mono text-sm tabular-nums text-[#F5F0EB]">{formatPercent(results.softPct)}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* Total row */}
                        <tr className="bg-[#0C0C0C] border-t-2 border-[#E85D26]/30">
                          <td className="text-[#F5F0EB] font-headline font-bold text-base px-6 py-4">Total value</td>
                          <td className="text-right font-headline font-bold text-base tabular-nums text-[#F5F0EB] px-6 py-4">
                            {formatCurrency(results.totalMonthlyValue)}
                          </td>
                          <td className="text-right font-headline font-bold text-base tabular-nums text-[#F5F0EB] px-6 py-4">
                            {formatCurrency(results.totalMonthlyValue * 12)}
                          </td>
                          <td className="text-right font-headline font-bold text-base tabular-nums text-[#F5F0EB] px-6 py-4">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </ScrollReveal>

                {/* Investment vs Return */}
                <ScrollReveal className="mt-16">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-4 block">
                    PROJECTION
                  </span>
                  <h2 className="font-headline text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-[#F5F0EB] mb-8">
                    INVESTMENT VS. RETURN
                  </h2>

                  <div className="bg-[#1A1A17] border border-[#D9D3CB]/10 rounded-sm overflow-hidden overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                      <thead>
                        <tr className="bg-[#0C0C0C] border-b border-[#D9D3CB]/10">
                          <th className="text-left text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4"></th>
                          <th className="text-right text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4">YEAR 1</th>
                          <th className="text-right text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4">YEAR 2</th>
                          <th className="text-right text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] px-6 py-4">YEAR 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#D9D3CB]/10 hover:bg-[#0C0C0C]/50 transition-colors">
                          <td className="text-[#F5F0EB] font-body text-sm px-6 py-4">Total value</td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">{formatCurrency(results.year1.totalValue)}</td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">{formatCurrency(results.year2.totalValue)}</td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#F5F0EB] px-6 py-4">{formatCurrency(results.year3.totalValue)}</td>
                        </tr>
                        <tr className="border-b border-[#D9D3CB]/10 hover:bg-[#0C0C0C]/50 transition-colors">
                          <td className="text-[#A89F96] font-body text-sm px-6 py-4">System cost</td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#A89F96] px-6 py-4">{formatCurrency(results.year1.systemCost)}</td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#A89F96] px-6 py-4">{formatCurrency(results.year2.systemCost)}</td>
                          <td className="text-right font-mono text-sm tabular-nums text-[#A89F96] px-6 py-4">{formatCurrency(results.year3.systemCost)}</td>
                        </tr>
                        <tr className="border-b border-[#D9D3CB]/10 hover:bg-[#0C0C0C]/50 transition-colors">
                          <td className="text-[#F5F0EB] font-headline font-bold text-sm px-6 py-4">Net benefit</td>
                          <td className={`text-right font-mono text-sm tabular-nums px-6 py-4 ${results.year1.netBenefit >= 0 ? 'text-[#7C9A72]' : 'text-[#EF4444]'}`}>
                            {formatCurrency(results.year1.netBenefit)}
                          </td>
                          <td className={`text-right font-mono text-sm tabular-nums px-6 py-4 text-[#7C9A72]`}>
                            {formatCurrency(results.year2.netBenefit)}
                          </td>
                          <td className={`text-right font-mono text-sm tabular-nums px-6 py-4 text-[#7C9A72]`}>
                            {formatCurrency(results.year3.netBenefit)}
                          </td>
                        </tr>
                        <tr className="bg-[#0C0C0C] border-t-2 border-[#E85D26]/30">
                          <td className="text-[#F5F0EB] font-headline font-bold text-base px-6 py-4">Cumulative ROI</td>
                          <td className="text-right px-6 py-4">
                            <span className="font-headline font-black italic text-lg text-[#E85D26]">{formatPercent(results.year1.roi)}</span>
                          </td>
                          <td className="text-right px-6 py-4">
                            <span className="font-headline font-black italic text-lg text-[#E85D26]">{formatPercent(results.year2.roi)}</span>
                          </td>
                          <td className="text-right px-6 py-4">
                            <span className="font-headline font-black italic text-lg text-[#E85D26]">{formatPercent(results.year3.roi)}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </ScrollReveal>

                {/* What AI Automates */}
                <ScrollReveal className="mt-16">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-4 block">
                    AUTOMATION
                  </span>
                  <h2 className="font-headline text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-[#F5F0EB] mb-8">
                    WHAT GETS AUTOMATED IN {INDUSTRIES.find(i => i.value === industry)?.label?.toUpperCase() || 'YOUR INDUSTRY'}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    {(INDUSTRY_AUTOMATIONS[industry] || INDUSTRY_AUTOMATIONS.other).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-[#7C9A72]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={12} className="text-[#7C9A72]" />
                        </div>
                        <span className="text-[#A89F96] text-sm font-body">{item}</span>
                      </div>
                    ))}
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ═══ ZONE 3: CTA SECTION ═══ */}
      <AnimatePresence>
        {hasCalculated && results && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative z-10 bg-[#0C0C0C] py-16 md:py-24 px-6"
          >
            <div className="text-center max-w-3xl mx-auto">
              {/* Primary CTA */}
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#9A9189] mb-4 block">
                NEXT STEP
              </span>
              <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-[#F5F0EB] mt-4">
                THESE ARE ESTIMATES. GET YOUR EXACT NUMBERS.
              </h2>
              <p className="text-[#A89F96] text-base font-body mt-4 max-w-xl mx-auto">
                The $2,500 AI Operations Audit uses your actual workflows, not industry averages.
              </p>
              <a
                href="/audit/test"
                className="inline-block bg-[#E85D26] text-white font-headline font-black uppercase tracking-tight text-base md:text-lg px-12 py-5 mt-8 shadow-lg hover:bg-[#D14E1C] transition-colors duration-300 cta-glow"
                style={{ boxShadow: '0 4px 24px rgba(232, 93, 38, 0.2)' }}
              >
                BOOK YOUR AUDIT
              </a>

              {/* Secondary CTA */}
              <div className="mt-12 pt-12 border-t border-[#D9D3CB]/10">
                <h3 className="font-headline text-xl font-bold text-[#F5F0EB]">Send me this report</h3>
                <form
                  className="flex flex-col md:flex-row gap-3 mt-4 justify-center items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const email = e.target.elements.email?.value;
                    if (email && typeof gtag === 'function') {
                      gtag('event', 'roi_email_capture', { event_category: 'ROI Calculator' });
                    }
                    // For now, open mailto as placeholder
                    if (email) {
                      window.location.href = `mailto:hello@aom-inhouse.com?subject=ROI Calculator Report Request&body=Please send my ROI report to: ${email}`;
                    }
                  }}
                >
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    required
                    className="bg-[#1A1A17] border border-[#D9D3CB]/10 rounded-sm px-4 py-3 text-[#F5F0EB] font-body text-base w-full md:w-72 focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20"
                    aria-label="Email address for report"
                  />
                  <button
                    type="submit"
                    className="bg-[#1A1A17] border border-[#F5F0EB] text-[#F5F0EB] font-headline font-bold uppercase tracking-tight px-6 py-3 w-full md:w-auto hover:bg-[#F5F0EB] hover:text-[#0C0C0C] transition-all duration-300"
                  >
                    SEND
                  </button>
                </form>
              </div>

              {/* Disclaimer */}
              <p className="text-[#9A9189] text-xs font-body mt-16 max-w-2xl mx-auto leading-relaxed">
                These projections are estimates based on industry benchmarks and the information you provided. Your actual results will depend on your specific business operations. The $2,500 AI Operations Audit gives you exact numbers based on your actual workflows.
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FIELD CONTAINER ───
function FieldContainer({ children }) {
  return (
    <div className="bg-[#1A1A17] border border-[#D9D3CB]/20 rounded-sm p-5 md:p-6 hover:border-[#D9D3CB]/30 focus-within:border-[#E85D26]/40 transition-colors duration-300">
      {children}
    </div>
  );
}

// ─── FIELD LABEL ───
function FieldLabel({ children, noMargin = false }) {
  return (
    <label className={`text-[#F5F0EB] text-sm font-body font-semibold block ${noMargin ? '' : 'mb-1'}`}>
      {children}
    </label>
  );
}

// ─── HELPER TEXT ───
function HelperText({ children }) {
  return (
    <span className="text-[#9A9189] text-xs font-body mb-3 block leading-relaxed">
      {children}
    </span>
  );
}

// ─── DOLLAR INPUT ───
function DollarInput({ value, onChange, placeholder, ariaLabel }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value) {
      const num = parseInt(value);
      setDisplayValue(isNaN(num) ? '' : num.toLocaleString());
    }
  }, []);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw);
    if (raw === '') {
      setDisplayValue('');
      onChange('0');
    } else if (!isNaN(num)) {
      setDisplayValue(num.toLocaleString());
      onChange(raw);
    }
  };

  const handleBlur = () => {
    const raw = parseInt(value);
    if (!isNaN(raw)) {
      setDisplayValue(raw.toLocaleString());
    }
  };

  return (
    <div className="relative flex items-center">
      <span className="absolute left-4 text-[#9A9189] font-body text-base select-none">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full bg-[#0C0C0C] border border-[#D9D3CB]/20 rounded-sm pl-8 pr-4 py-3 text-[#F5F0EB] font-body text-base tabular-nums focus:outline-none focus:border-[#E85D26]/60 focus:ring-1 focus:ring-[#E85D26]/20 transition-colors duration-200 placeholder:text-[#57534E]"
        aria-label={ariaLabel}
      />
    </div>
  );
}

// ─── RESULT CARD ───
function ResultCard({ children, delay = 0, accentColor }) {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, y: 30 }}
      animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className="bg-[#1A1A17] border border-[#D9D3CB]/10 rounded-sm p-6 md:p-8 relative overflow-hidden hover:border-[#D9D3CB]/20 transition-colors duration-300"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: accentColor }} />
      {children}
    </motion.div>
  );
}

// ─── CARD ICON ───
function CardIcon({ Icon, color, borderColor }) {
  return (
    <div
      className="w-10 h-10 bg-black/40 flex items-center justify-center"
      style={{ border: `1px solid ${borderColor}` }}
    >
      <Icon size={20} style={{ color }} />
    </div>
  );
}
