import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Calendar, Clock, ArrowUpRight } from 'lucide-react';

// --- SURGE COLORS & SYSTEM ---
const SURGE = {
  purple: '#7c3aed',
  cyan: '#06b6d4',
  charcoal: '#2d2d2d',
  white: '#fafafa',
  gradient: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
  lightGray: '#f5f5f5',
  border: '#e5e5e5',
  text: {
    primary: '#2d2d2d',
    secondary: '#666',
    tertiary: '#a1a1aa',
  },
};

// --- FAVICON & META SWAP ON MOUNT ---
const useCornerPageMeta = () => {
  useEffect(() => {
    // Save original favicon and metas
    const originalFavicon = document.querySelector('link[rel="icon"]')?.href || ''
    const originalTitle = document.title
    const originalOgTitle = document.querySelector('meta[property="og:title"]')?.content || ''
    const originalOgDesc = document.querySelector('meta[property="og:description"]')?.content || ''

    // Swap to Corner branding
    const faviconLink = document.querySelector('link[rel="icon"]')
    if (faviconLink) {
      faviconLink.href = '/brand/corner-c-mark.svg'
    }
 document.title = 'corner, book your intro call'

    const ogTitle = document.querySelector('meta[property="og:title"]')
 if (ogTitle) ogTitle.content = 'corner, book your intro call'

    const ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) ogDesc.content = 'Schedule your free 20–30 minute discovery call.'

    // Restore on unmount
    return () => {
      if (faviconLink) faviconLink.href = originalFavicon
      document.title = originalTitle
      if (ogTitle) ogTitle.content = originalOgTitle
      if (ogDesc) ogDesc.content = originalOgDesc
    }
  }, [])
}


const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.08,
      duration: 0.6,
      ease: 'easeOut',
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// --- NAV ---
function CornerNav() {
  const [scrolled, setScrolled] = useState(false);
  React.useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-sm border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Wordmark */}
        <a
          href="/corner"
          className="font-bold text-xl tracking-tight"
          style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: SURGE.white }}
        >
          <span
            style={{
              background: SURGE.gradient,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            corner
          </span>
        </a>

        {/* CTA */}
        <a
          href="/corner"
          className="text-[14px] font-bold px-4 py-2 rounded-lg transition-all text-white hover:shadow-lg"
          style={{
            background: SURGE.gradient,
          }}
        >
          Back to Corner
        </a>
      </div>
    </nav>
  );
}

// --- SECTION LABEL ---
function SectionLabel({ children }) {
  return (
    <motion.p
      variants={fadeUp}
      className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase mb-5"
      style={{ color: SURGE.text.tertiary }}
    >
      {children}
    </motion.p>
  );
}

// --- MOCK TIME SLOTS (Phase 1, fallback) ---
const MOCK_SLOTS = [
  {
    date: new Date(2026, 5, 16),
    dateLabel: 'Monday, Jun 16',
    times: [
      { time: '09:00', display: '9:00 AM' },
      { time: '13:00', display: '1:00 PM' },
      { time: '15:00', display: '3:00 PM' },
    ],
  },
  {
    date: new Date(2026, 5, 17),
    dateLabel: 'Tuesday, Jun 17',
    times: [
      { time: '09:00', display: '9:00 AM' },
      { time: '13:00', display: '1:00 PM' },
      { time: '15:00', display: '3:00 PM' },
    ],
  },
  {
    date: new Date(2026, 5, 18),
    dateLabel: 'Wednesday, Jun 18',
    times: [
      { time: '09:00', display: '9:00 AM' },
      { time: '13:00', display: '1:00 PM' },
      { time: '15:00', display: '3:00 PM' },
    ],
  },
  {
    date: new Date(2026, 5, 19),
    dateLabel: 'Thursday, Jun 19',
    times: [
      { time: '09:00', display: '9:00 AM' },
      { time: '13:00', display: '1:00 PM' },
      { time: '15:00', display: '3:00 PM' },
    ],
  },
];

// --- MAIN COMPONENT ---
export default function BookCorner() {
  useCornerPageMeta();

  const [step, setStep] = useState(1); // 1: select slot, 2: enter details, 3: confirm
  const [slots, setSlots] = useState(MOCK_SLOTS); // Will be replaced by real slots if calendar connected
  const [calendarConnected, setCalendarConnected] = useState(null); // null = loading, true/false = result
  const [selectedSlot, setSelectedSlot] = useState(MOCK_SLOTS[0]);
  const [selectedTime, setSelectedTime] = useState(MOCK_SLOTS[0].times[0]);
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [meetLink, setMeetLink] = useState(null);

  // Fetch real availability on mount
  React.useEffect(() => {
    async function fetchAvailability() {
      try {
        const res = await fetch('/api/corner/availability');
        if (!res.ok) {
          setCalendarConnected(false);
          return;
        }
        const data = await res.json();
        if (data.connected && data.slots && data.slots.length > 0) {
          setCalendarConnected(true);
          setSlots(data.slots);
          setSelectedSlot(data.slots[0]);
          setSelectedTime(data.slots[0].times[0]);
        } else {
          setCalendarConnected(false);
        }
      } catch (err) {
        console.warn('Failed to fetch availability:', err);
        setCalendarConnected(false);
      }
    }
    fetchAvailability();
  }, []);

  const handleSlotSelect = (slot, time) => {
    setSelectedSlot(slot);
    setSelectedTime(time);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid = formData.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  const handleSubmit = async () => {
    if (!isFormValid || !selectedSlot || !selectedTime) return;

    setIsSubmitting(true);

    const bookingData = {
      name: formData.name,
      email: formData.email,
      company: formData.company,
      dateLabel: selectedSlot.dateLabel,
      time: selectedTime.time,
      display: selectedTime.display,
      timezone: 'America/Phoenix',
    };

    try {
      const res = await fetch('/api/corner/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Booking failed');
      }

      const result = await res.json();
      setMeetLink(result.meetLink);
      setSubmitStatus('success');
      setTimeout(() => {
        setFormData({ name: '', email: '', company: '' });
        setSelectedSlot(slots[0]);
        setSelectedTime(slots[0].times[0]);
        setStep(1);
        setSubmitStatus(null);
        setMeetLink(null);
      }, 3000);
    } catch (err) {
      console.error('Booking error:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: SURGE.white }}>
      <CornerNav />

      {/* HERO SECTION */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-32 pb-24" style={{ backgroundColor: SURGE.charcoal }}>
        <div className="max-w-2xl mx-auto w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center"
          >
            <motion.h1
              custom={0}
              variants={fadeUp}
              className="text-[48px] md:text-[64px] tracking-tight leading-tight mb-6"
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, color: SURGE.white }}
            >
              Book Your Intro Call
            </motion.h1>

            <motion.p
              custom={1}
              variants={fadeUp}
              className="text-base md:text-xl leading-relaxed max-w-[600px] mx-auto mb-12"
              style={{ color: '#e4e4e7' }}
            >
              Get a free 20–30 minute discovery call. We'll walk through how Corner helps your business. No sales pitch, no obligation.
            </motion.p>

            {/* MAIN BOOKING CARD */}
            <motion.div
              custom={2}
              variants={fadeUp}
              className="overflow-hidden max-w-4xl mx-auto rounded-lg shadow-xl"
              style={{ backgroundColor: SURGE.white, border: `2px solid ${SURGE.border}` }}
            >
              <AnimatePresence mode="wait">
                {/* STEP 1: SELECT TIME SLOT */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-8 md:p-12"
                  >
                    <div className="mb-10">
                      <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
                        style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: SURGE.charcoal }}
                      >
                        Select Your Time
                      </h2>
                      <p className="text-base md:text-lg" style={{ color: SURGE.text.secondary }}>
                        Pick a slot that works best. All times are in Arizona time (MST).
                      </p>
                    </div>

                    {/* TIME SLOT GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {MOCK_SLOTS.map((slot, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md"
                          style={{
                            borderColor: selectedSlot === slot ? SURGE.purple : SURGE.border,
                            backgroundColor: selectedSlot === slot ? '#f3f0ff' : '#fafafa',
                          }}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <div className="flex items-center gap-3 mb-5">
                            <Calendar size={20} style={{ color: SURGE.purple }} />
                            <span className="text-sm font-bold" style={{ color: SURGE.charcoal }}>{slot.dateLabel}</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {slot.times.map((t, tIdx) => (
                              <button
                                key={tIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSlotSelect(slot, t);
                                }}
                                className="w-full px-4 py-3 text-sm font-semibold rounded-lg transition-all"
                                style={{
                                  backgroundColor: selectedSlot === slot && selectedTime === t ? SURGE.purple : '#ffffff',
                                  color: selectedSlot === slot && selectedTime === t ? '#ffffff' : SURGE.charcoal,
                                  border: selectedSlot === slot && selectedTime === t ? `2px solid ${SURGE.purple}` : `2px solid ${SURGE.border}`,
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <Clock size={14} />
                                    {t.display}
                                  </span>
                                  {selectedSlot === slot && selectedTime === t && (
                                    <Check size={16} />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* NEXT BUTTON */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setStep(2)}
                        disabled={!selectedSlot || !selectedTime}
                        className="flex items-center gap-2 px-8 py-4 rounded-lg font-bold transition-all text-white"
                        style={{
                          background: selectedSlot && selectedTime ? SURGE.gradient : '#ccc',
                          cursor: selectedSlot && selectedTime ? 'pointer' : 'not-allowed',
                          opacity: selectedSlot && selectedTime ? 1 : 0.6,
                        }}
                      >
                        Continue
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: ENTER DETAILS */}
                {step === 2 && selectedSlot && selectedTime && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-8 md:p-12"
                  >
                    <div className="mb-10">
                      <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
                        style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: SURGE.charcoal }}
                      >
                        Your Details
                      </h2>
                      <p className="text-base md:text-lg" style={{ color: SURGE.text.secondary }}>
                        A quick intro so we know who to expect. We'll send a confirmation email to this address.
                      </p>
                    </div>

                    {/* FORM FIELDS */}
                    <div className="space-y-6 mb-10">
                      <div>
                        <label
                          className="block text-sm font-mono font-bold tracking-[0.25em] uppercase mb-3"
                          style={{ color: SURGE.text.tertiary }}
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleFormChange('name', e.target.value)}
                          placeholder="Your name"
                          className="w-full px-6 py-4 border-2 rounded-lg text-base transition-all focus:outline-none"
                          style={{
                            backgroundColor: SURGE.lightGray,
                            borderColor: formData.name ? SURGE.purple : SURGE.border,
                            color: SURGE.charcoal,
                          }}
                        />
                      </div>

                      <div>
                        <label
                          className="block text-sm font-mono font-bold tracking-[0.25em] uppercase mb-3"
                          style={{ color: SURGE.text.tertiary }}
                        >
                          Work Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                          placeholder="you@company.com"
                          className="w-full px-6 py-4 border-2 rounded-lg text-base transition-all focus:outline-none"
                          style={{
                            backgroundColor: SURGE.lightGray,
                            borderColor: formData.email ? SURGE.purple : SURGE.border,
                            color: SURGE.charcoal,
                          }}
                        />
                      </div>

                      <div>
                        <label
                          className="block text-sm font-mono font-bold tracking-[0.25em] uppercase mb-3"
                          style={{ color: SURGE.text.tertiary }}
                        >
                          Company (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => handleFormChange('company', e.target.value)}
                          placeholder="Company name"
                          className="w-full px-6 py-4 border-2 rounded-lg text-base transition-all focus:outline-none"
                          style={{
                            backgroundColor: SURGE.lightGray,
                            borderColor: formData.company ? SURGE.purple : SURGE.border,
                            color: SURGE.charcoal,
                          }}
                        />
                      </div>
                    </div>

                    {/* SCHEDULED TIME RECAP */}
                    <div className="border-l-4 rounded-lg p-6 mb-10" style={{ borderLeftColor: SURGE.purple, backgroundColor: '#f3f0ff' }}>
                      <p
                        className="text-sm font-mono font-bold tracking-[0.25em] uppercase mb-3"
                        style={{ color: SURGE.text.tertiary }}
                      >
                        Scheduled Time
                      </p>
                      <div className="flex flex-col gap-3 text-lg font-semibold" style={{ color: SURGE.charcoal }}>
                        <div className="flex items-center gap-2">
                          <Calendar size={18} style={{ color: SURGE.purple }} />
                          <span>{selectedSlot.dateLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={18} style={{ color: SURGE.purple }} />
                          <span>{selectedTime.display} MST</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-4 justify-between">
                      <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 px-8 py-4 border-2 rounded-lg font-bold transition-all"
                        style={{
                          borderColor: SURGE.border,
                          color: SURGE.charcoal,
                        }}
                      >
                        <ChevronLeft size={16} />
                        Back
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        disabled={!isFormValid}
                        className="flex items-center gap-2 px-8 py-4 rounded-lg font-bold transition-all text-white"
                        style={{
                          background: isFormValid ? SURGE.gradient : '#ccc',
                          cursor: isFormValid ? 'pointer' : 'not-allowed',
                          opacity: isFormValid ? 1 : 0.6,
                        }}
                      >
                        Review
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: CONFIRM & SUBMIT */}
                {step === 3 && selectedSlot && selectedTime && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-8 md:p-12"
                  >
                    <div className="mb-10">
                      <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
                        style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: SURGE.charcoal }}
                      >
                        Confirm Your Booking
                      </h2>
                      <p className="text-base md:text-lg" style={{ color: SURGE.text.secondary }}>
                        Review everything one more time. We'll send a confirmation email to {formData.email}.
                      </p>
                    </div>

                    {/* BOOKING SUMMARY */}
                    <div className="space-y-6 mb-10">
                      <div className="border-l-4 rounded-lg pl-6 py-4" style={{ borderLeftColor: SURGE.purple, backgroundColor: '#f3f0ff' }}>
                        <p
                          className="text-xs font-mono font-bold tracking-[0.25em] uppercase mb-2"
                          style={{ color: SURGE.text.tertiary }}
                        >
                          Date & Time
                        </p>
                        <p className="text-lg font-semibold" style={{ color: SURGE.charcoal }}>
                          {selectedSlot.dateLabel} at {selectedTime.display} MST
                        </p>
                      </div>

                      <div className="border-l-4 rounded-lg pl-6 py-4" style={{ borderLeftColor: SURGE.purple, backgroundColor: '#f3f0ff' }}>
                        <p
                          className="text-xs font-mono font-bold tracking-[0.25em] uppercase mb-2"
                          style={{ color: SURGE.text.tertiary }}
                        >
                          Duration
                        </p>
                        <p className="text-lg font-semibold" style={{ color: SURGE.charcoal }}>
                          20–30 minutes (via Zoom)
                        </p>
                      </div>

                      <div className="border-l-4 rounded-lg pl-6 py-4" style={{ borderLeftColor: SURGE.purple, backgroundColor: '#f3f0ff' }}>
                        <p
                          className="text-xs font-mono font-bold tracking-[0.25em] uppercase mb-2"
                          style={{ color: SURGE.text.tertiary }}
                        >
                          Your Info
                        </p>
                        <div className="space-y-2" style={{ color: SURGE.charcoal }}>
                          <p className="text-base font-semibold">{formData.name}</p>
                          <p className="text-base">{formData.email}</p>
                          {formData.company && <p className="text-base" style={{ color: SURGE.text.secondary }}>{formData.company}</p>}
                        </div>
                      </div>
                    </div>

                    {/* ERROR/SUCCESS MESSAGES */}
                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-2 rounded-lg p-4 mb-6"
                        style={{
                          borderColor: '#fca5a5',
                          backgroundColor: '#fee2e2',
                        }}
                      >
                        <p className="font-semibold text-sm" style={{ color: '#dc2626' }}>
                          Something went wrong. Please try again.
                        </p>
                      </motion.div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-4 justify-between">
                      <button
                        onClick={() => setStep(2)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-4 border-2 rounded-lg font-bold transition-all"
                        style={{
                          borderColor: SURGE.border,
                          color: SURGE.charcoal,
                          opacity: isSubmitting ? 0.5 : 1,
                        }}
                      >
                        <ChevronLeft size={16} />
                        Edit
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-4 rounded-lg font-bold transition-all text-white"
                        style={{
                          background: isSubmitting ? '#ccc' : SURGE.gradient,
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting ? 0.6 : 1,
                        }}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                            Booking...
                          </>
                        ) : (
                          <>
                            Confirm Booking
                            <ChevronRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* SUCCESS STATE */}
                {submitStatus === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-8 md:p-12 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
                      style={{ background: SURGE.gradient }}
                    >
                      <Check size={32} className="text-white" />
                    </motion.div>

                    <h2
                      className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                      style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: SURGE.charcoal }}
                    >
                      You're All Set
                    </h2>

                    <p className="text-lg mb-6 max-w-md mx-auto leading-relaxed" style={{ color: SURGE.text.secondary }}>
                      Check your email at <span className="font-semibold" style={{ color: SURGE.charcoal }}>{formData.email}</span> for a confirmation{calendarConnected && meetLink ? ' and Google Meet link.' : '.'}
                    </p>

                    <p className="text-base mb-10" style={{ color: SURGE.text.tertiary }}>
                      We'll see you on {selectedSlot.dateLabel} at {selectedTime.display}!
                    </p>

                    {meetLink && (
                      <a
                        href={meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold transition-all text-white mb-4"
                        style={{ background: SURGE.gradient }}
                      >
                        Join Google Meet
                        <ArrowUpRight size={16} />
                      </a>
                    )}

                    <div className="mt-6">
                      <a
                        href="/corner"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold transition-all text-white"
                        style={{ background: SURGE.gradient }}
                      >
                        Back to Corner
                        <ChevronRight size={16} />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* TRUST COPY */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: SURGE.text.tertiary }}>
              Free discovery call. No sales pitch. No credit card required. Just a real conversation about how Corner helps your business.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}