import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Calendar, Clock, User, Mail, Building2, X } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
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
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? 'bg-white border-b border-[#E5E7EB]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/corner" className="text-xl font-headline font-extrabold tracking-tight text-[#111]">
          Corner
        </a>
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'Pricing', href: '/corner#pricing' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[14px] font-medium text-[#555] hover:text-[#111] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="/corner"
          className="hidden md:inline-flex items-center gap-2 text-[#111] text-[14px] font-semibold hover:text-[#E85D26] transition-colors"
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
      className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase mb-5 text-[#999]"
    >
      {children}
    </motion.p>
  );
}

// --- MOCK TIME SLOTS (Phase 1) ---
const MOCK_SLOTS = [
  {
    date: new Date(2026, 5, 16),
    dateLabel: 'Monday, Jun 16',
    times: [
      { time: '09:00 AM', display: '9:00 AM' },
      { time: '10:30 AM', display: '10:30 AM' },
      { time: '02:00 PM', display: '2:00 PM' },
    ],
  },
  {
    date: new Date(2026, 5, 17),
    dateLabel: 'Tuesday, Jun 17',
    times: [
      { time: '10:00 AM', display: '10:00 AM' },
      { time: '11:30 AM', display: '11:30 AM' },
      { time: '03:00 PM', display: '3:00 PM' },
    ],
  },
  {
    date: new Date(2026, 5, 18),
    dateLabel: 'Wednesday, Jun 18',
    times: [
      { time: '09:30 AM', display: '9:30 AM' },
      { time: '01:00 PM', display: '1:00 PM' },
      { time: '04:00 PM', display: '4:00 PM' },
    ],
  },
  {
    date: new Date(2026, 5, 19),
    dateLabel: 'Thursday, Jun 19',
    times: [
      { time: '10:30 AM', display: '10:30 AM' },
      { time: '02:30 PM', display: '2:30 PM' },
      { time: '03:30 PM', display: '3:30 PM' },
    ],
  },
];

// --- MAIN COMPONENT ---
export default function BookCorner() {
  const [step, setStep] = useState(1); // 1: select slot, 2: enter details, 3: confirm
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

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

    // Phase 1: just show success state. Phase 2 will wire Google Calendar.
    const bookingData = {
      name: formData.name,
      email: formData.email,
      company: formData.company,
      date: selectedSlot.dateLabel,
      time: selectedTime.display,
      timezone: 'America/Phoenix',
      type: 'corner-intro-call',
      submittedAt: new Date().toISOString(),
    };

    try {
      // For phase 1, just log it and show success
      console.log('Booking submission:', bookingData);

      // TODO Phase 2: integrate with Google Calendar via calendarClient
      // TODO Phase 2: send confirmation email

      setSubmitStatus('success');
      setTimeout(() => {
        setFormData({ name: '', email: '', company: '' });
        setSelectedSlot(null);
        setSelectedTime(null);
        setStep(1);
        setSubmitStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Booking error:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A08] font-body">
      <CornerNav />

      {/* HERO SECTION */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-32 pb-24">
        <div className="max-w-2xl mx-auto w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center"
          >
            <motion.h1
              variants={fadeUp}
              className="text-[56px] md:text-[72px] font-headline font-black tracking-tight leading-[1.0] text-[#111] mb-6"
            >
              Book Your Intro Call
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-xl md:text-2xl text-[#555] leading-relaxed max-w-[600px] mx-auto mb-12"
            >
              Get a free 20–30 minute walkthrough of Corner. No sales pitch, just a real conversation about your business.
            </motion.p>

            {/* MAIN BOOKING CARD */}
            <motion.div
              variants={fadeUp}
              className="bg-white border border-[#E5E7EB] rounded-sm shadow-xl overflow-hidden max-w-4xl mx-auto"
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
                      <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-[#111] mb-3">
                        Select Your Time
                      </h2>
                      <p className="text-[#666] text-base md:text-lg">
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
                          className="border border-[#E5E7EB] rounded-sm p-5 hover:border-[#E85D26] transition-colors cursor-pointer"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <Calendar size={18} className="text-[#E85D26]" />
                            <span className="text-sm font-semibold text-[#111]">{slot.dateLabel}</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {slot.times.map((t, tIdx) => (
                              <button
                                key={tIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSlotSelect(slot, t);
                                }}
                                className={`w-full px-4 py-3 text-sm font-semibold rounded-sm transition-all ${
                                  selectedSlot === slot && selectedTime === t
                                    ? 'bg-[#E85D26] text-white border border-[#E85D26]'
                                    : 'bg-[#F8F7F6] text-[#111] border border-[#E5E7EB] hover:border-[#E85D26] hover:bg-[#FFF5F0]'
                                }`}
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
                        className={`flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all ${
                          selectedSlot && selectedTime
                            ? 'bg-[#E85D26] hover:bg-[#D14F1E] text-white cursor-pointer'
                            : 'bg-[#E5E7EB] text-[#999] cursor-not-allowed'
                        }`}
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
                      <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-[#111] mb-3">
                        Your Details
                      </h2>
                      <p className="text-[#666] text-base md:text-lg">
                        A quick intro so we know who to expect. We'll send a confirmation email to this address.
                      </p>
                    </div>

                    {/* FORM FIELDS */}
                    <div className="space-y-6 mb-10">
                      <div>
                        <label className="block text-sm font-mono font-bold tracking-[0.25em] uppercase text-[#999] mb-3">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleFormChange('name', e.target.value)}
                          placeholder="Your name"
                          className="w-full px-6 py-4 bg-[#F8F7F6] border border-[#E5E7EB] rounded-sm text-[#111] placeholder-[#999] focus:outline-none focus:border-[#E85D26] focus:bg-white transition-all text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-mono font-bold tracking-[0.25em] uppercase text-[#999] mb-3">
                          Work Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                          placeholder="you@company.com"
                          className="w-full px-6 py-4 bg-[#F8F7F6] border border-[#E5E7EB] rounded-sm text-[#111] placeholder-[#999] focus:outline-none focus:border-[#E85D26] focus:bg-white transition-all text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-mono font-bold tracking-[0.25em] uppercase text-[#999] mb-3">
                          Company (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => handleFormChange('company', e.target.value)}
                          placeholder="Company name"
                          className="w-full px-6 py-4 bg-[#F8F7F6] border border-[#E5E7EB] rounded-sm text-[#111] placeholder-[#999] focus:outline-none focus:border-[#E85D26] focus:bg-white transition-all text-base"
                        />
                      </div>
                    </div>

                    {/* SCHEDULED TIME RECAP */}
                    <div className="bg-[#FFF5F0] border border-[#FFE5D3] rounded-sm p-6 mb-10">
                      <p className="text-sm text-[#666] font-mono font-bold tracking-[0.25em] uppercase mb-2">
                        Scheduled Time
                      </p>
                      <div className="flex items-center gap-4 text-lg font-semibold text-[#111]">
                        <Calendar size={18} className="text-[#E85D26]" />
                        <span>{selectedSlot.dateLabel}</span>
                        <span className="text-[#E85D26]">—</span>
                        <Clock size={18} className="text-[#E85D26]" />
                        <span>{selectedTime.display} MST</span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-4 justify-between">
                      <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 px-8 py-4 border border-[#E5E7EB] rounded-full font-semibold text-[#111] hover:border-[#E85D26] transition-all"
                      >
                        <ChevronLeft size={16} />
                        Back
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        disabled={!isFormValid}
                        className={`flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all ${
                          isFormValid
                            ? 'bg-[#E85D26] hover:bg-[#D14F1E] text-white cursor-pointer'
                            : 'bg-[#E5E7EB] text-[#999] cursor-not-allowed'
                        }`}
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
                      <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-[#111] mb-3">
                        Confirm Your Booking
                      </h2>
                      <p className="text-[#666] text-base md:text-lg">
                        Review everything one more time. We'll send a confirmation email to {formData.email}.
                      </p>
                    </div>

                    {/* BOOKING SUMMARY */}
                    <div className="space-y-6 mb-10">
                      <div className="border-l-4 border-[#E85D26] pl-6 py-4">
                        <p className="text-xs font-mono font-bold tracking-[0.25em] uppercase text-[#999] mb-2">
                          Date & Time
                        </p>
                        <p className="text-lg font-semibold text-[#111]">
                          {selectedSlot.dateLabel} at {selectedTime.display} MST
                        </p>
                      </div>

                      <div className="border-l-4 border-[#E85D26] pl-6 py-4">
                        <p className="text-xs font-mono font-bold tracking-[0.25em] uppercase text-[#999] mb-2">
                          Duration
                        </p>
                        <p className="text-lg font-semibold text-[#111]">
                          20–30 minutes (via Zoom)
                        </p>
                      </div>

                      <div className="border-l-4 border-[#E85D26] pl-6 py-4">
                        <p className="text-xs font-mono font-bold tracking-[0.25em] uppercase text-[#999] mb-2">
                          Your Info
                        </p>
                        <div className="space-y-2 text-[#111]">
                          <p className="text-base font-semibold">{formData.name}</p>
                          <p className="text-base">{formData.email}</p>
                          {formData.company && <p className="text-base text-[#666]">{formData.company}</p>}
                        </div>
                      </div>
                    </div>

                    {/* ERROR/SUCCESS MESSAGES */}
                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-sm p-4 mb-6"
                      >
                        <p className="text-red-800 font-semibold text-sm">
                          Something went wrong. Please try again.
                        </p>
                      </motion.div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-4 justify-between">
                      <button
                        onClick={() => setStep(2)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-4 border border-[#E5E7EB] rounded-full font-semibold text-[#111] hover:border-[#E85D26] transition-all disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                        Edit
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all ${
                          isSubmitting
                            ? 'bg-[#E5E7EB] text-[#999] cursor-not-allowed'
                            : 'bg-[#E85D26] hover:bg-[#D14F1E] text-white cursor-pointer'
                        }`}
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
                      className="inline-flex items-center justify-center w-16 h-16 bg-[#22C55E] rounded-full mb-6"
                    >
                      <Check size={32} className="text-white" />
                    </motion.div>

                    <h2 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-[#111] mb-4">
                      You're All Set
                    </h2>

                    <p className="text-lg text-[#666] mb-6 max-w-md mx-auto leading-relaxed">
                      Check your email at <span className="font-semibold text-[#111]">{formData.email}</span> for a confirmation and Zoom link.
                    </p>

                    <p className="text-base text-[#999] mb-10">
                      We'll see you on {selectedSlot.dateLabel} at {selectedTime.display}!
                    </p>

                    <a
                      href="/corner"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#E85D26] hover:bg-[#D14F1E] text-white rounded-full font-semibold transition-all"
                    >
                      Back to Corner
                      <ChevronRight size={16} />
                    </a>
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
            <p className="text-sm text-[#999] max-w-md mx-auto leading-relaxed">
              Free intro call. No sales pitch. No credit card required. We'll give you honest feedback on how Corner could help your business.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#F8F7F6] border-t border-[#E5E7EB] py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-[#999]">
            © 2026 Ahead of Market. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
