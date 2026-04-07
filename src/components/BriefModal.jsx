import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Clock3, Target, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdalqvg';
const BUDGET_OPTIONS = ['$2k - $5k', '$5k - $10k', '$10k - $25k', '$25k+'];
const GOAL_OPTIONS = ['Close more sales', 'Recruiting', 'Investor / fundraising', 'Brand trust', 'Event recap', 'Launch', 'Other'];
const PLACEMENT_OPTIONS = ['Website', 'Ads', 'LinkedIn', 'Instagram/TikTok', 'Sales outreach', 'Internal', 'Not sure'];
const TIMING_OPTIONS = ['ASAP (1-2 weeks)', 'This month', 'Next 30-60 days', 'Quarterly/ongoing'];
const INITIAL_FORM_STATE = { name: '', email: '', budget: '', goal: '', problem: '', placement: '', timing: '' };

/**
 * BriefModal -- 3-step typeform brief submission.
 * Self-contained: manages its own state, submits to Formspree.
 *
 * Props:
 *   isOpen    - boolean
 *   onClose   - () => void
 *   intent    - optional { title, statement } for pre-selected intent
 */
export default function BriefModal({ isOpen, onClose, intent = null }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingBudget, setPendingBudget] = useState(null);

  const handleClose = () => {
    onClose();
    setIsSuccess(false);
    setIsError(false);
    setStep(1);
    setFormData(INITIAL_FORM_STATE);
    setPendingBudget(null);
  };

  const handleSubmit = async (overrides = {}) => {
    setIsSubmitting(true);
    setIsError(false);
    const finalPayload = {
      ...formData,
      ...overrides,
      intent: intent?.title || 'General Inquiry',
      intentStatement: intent?.statement || 'N/A',
      source: 'aheadofmarket.com modal',
      submittedAt: new Date().toISOString(),
    };
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finalPayload, _subject: `New Lead: ${finalPayload.intent} - ${finalPayload.name}` }),
      });
      if (!response.ok) throw new Error('Formspree rejected submission');
      setIsSuccess(true);
    } catch (e) {
      console.error('Brief submission error', e);
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isStep2Valid = formData.goal !== '' && formData.problem.trim().length >= 15 && formData.placement !== '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="w-full max-w-xl p-8 md:p-12 border border-white/5 bg-[#0A0A08] relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-orange-600/5 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden z-30">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(step / 3) * 100}%` }} className="h-full bg-orange-600 shadow-[0_0_15px_#FF4F00]" />
            </div>
            <button onClick={handleClose} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-40" disabled={isSubmitting} aria-label="Close brief form"><X size={24} /></button>

            {!isSuccess && !isError ? (
              <div className="space-y-10 relative z-10">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-headline font-extrabold text-white uppercase tracking-tighter">Start Brief<span className="text-orange-600">.</span></h2>
                    <span className="text-[11px] font-mono text-white/50 font-bold tracking-widest uppercase">Step {step} of 3</span>
                  </div>
                  {intent && step === 1 && (
                    <div className="inline-flex items-center gap-2 bg-orange-600/10 border border-orange-600/20 px-3 py-1.5">
                      <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-widest">{intent.title}</span>
                    </div>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                      <div className="space-y-6">
                        <div>
                          <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-[0.3em] mb-2 block">Your Name</label>
                          <input type="text" placeholder="FULL NAME" className="w-full bg-transparent border-b border-white/10 py-4 outline-none focus:border-orange-600 uppercase font-bold text-base text-white placeholder:text-white/30 transition-colors" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-[0.3em] mb-2 block">Direct Email</label>
                          <input type="email" placeholder="EMAIL@DOMAIN.COM" className="w-full bg-transparent border-b border-white/10 py-4 outline-none focus:border-orange-600 uppercase font-bold text-base text-white placeholder:text-white/30 transition-colors" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                      </div>
                      <button onClick={() => setStep(2)} disabled={!isStep1Valid} className={`w-full py-5 font-extrabold uppercase shadow-xl transition-all text-base tracking-widest ${isStep1Valid ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-white/5 text-white/40 cursor-not-allowed'}`}>Next Step</button>
                      <p className="text-[11px] text-white/50 font-mono text-center uppercase tracking-widest">A creative lead will reply within 24 hours.</p>
                    </motion.div>
                  )}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                      <div className="p-4 border border-orange-600/20 bg-orange-600/5">
                        <p className="text-[10px] font-mono text-orange-600/60 uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles size={10} /> Logic Preview</p>
                        <div className="flex gap-4">
                          <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Goal</p><p className="text-[11px] font-mono text-white uppercase font-bold tracking-tight">{formData.goal || 'PENDING'}</p></div>
                          <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Platform</p><p className="text-[11px] font-mono text-white uppercase font-bold tracking-tight">{formData.placement || 'PENDING'}</p></div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-[0.3em] mb-4 block">Primary Objective</label>
                          <div className="flex flex-wrap gap-2">
                            {GOAL_OPTIONS.map(g => (
                              <button key={g} onClick={() => setFormData({ ...formData, goal: g })} className={`px-4 py-2 border text-base font-extrabold uppercase transition-all tracking-wider ${formData.goal === g ? 'bg-orange-600 text-white border-orange-600 shadow-[0_0_15px_rgba(255,79,0,0.3)]' : 'border-white/5 bg-white/5 text-white/60 hover:border-white/20'}`}>{g}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-[0.3em] mb-4 block">What's the challenge?</label>
                          <textarea maxLength={180} placeholder="We're growing but nobody knows it. We need content that shows the work we do." className="w-full bg-white/5 border border-white/5 p-4 outline-none focus:border-orange-600 uppercase font-bold text-base text-white h-24 resize-none placeholder:text-white/30 transition-colors" value={formData.problem} onChange={(e) => setFormData({ ...formData, problem: e.target.value })} />
                          <div className="flex justify-between mt-2">
                            {formData.problem.length < 15 && <span className="text-[11px] font-mono text-orange-500/60 uppercase animate-pulse">Min. 15 characters required</span>}
                            <span className="text-[11px] font-mono text-white/20 ml-auto">{formData.problem.length}/180</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-[0.3em] mb-4 block">Asset Placement</label>
                          <div className="flex flex-wrap gap-2">
                            {PLACEMENT_OPTIONS.map(p => (
                              <button key={p} onClick={() => setFormData({ ...formData, placement: p })} className={`px-4 py-2 border text-base font-extrabold uppercase transition-all tracking-wider ${formData.placement === p ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-white/5 bg-white/5 text-white/60 hover:border-white/20'}`}>{p}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="px-8 py-5 border border-white/5 bg-white/5 text-white/60 font-extrabold uppercase text-base tracking-wider hover:text-white transition-all">Back</button>
                        <button onClick={() => setStep(3)} disabled={!isStep2Valid} className={`flex-grow py-5 font-extrabold uppercase shadow-xl transition-all text-base tracking-widest ${isStep2Valid ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-white/5 text-white/40 cursor-not-allowed'}`}>Set Logistics</button>
                      </div>
                    </motion.div>
                  )}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                      <div className="p-4 border border-orange-600/20 bg-orange-600/5">
                        <p className="text-[10px] font-mono text-orange-600/60 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock3 size={10} /> Strategy Summary</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Goal</p><p className="text-[11px] font-mono text-white uppercase font-bold tracking-tight truncate">{formData.goal}</p></div>
                          <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Timing</p><p className="text-[11px] font-mono text-white uppercase font-bold tracking-tight">{formData.timing || 'PENDING'}</p></div>
                          <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Tier</p><p className="text-[11px] font-mono text-white uppercase font-bold tracking-tight">{formData.budget || 'PENDING'}</p></div>
                        </div>
                      </div>
                      <div className="space-y-8">
                        <div>
                          <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-[0.3em] mb-4 block">Preferred Timeline</label>
                          <div className="grid grid-cols-2 gap-2">
                            {TIMING_OPTIONS.map(t => (
                              <button key={t} onClick={() => setFormData({ ...formData, timing: t })} className={`px-4 py-3 border text-base font-extrabold uppercase transition-all tracking-wider text-left ${formData.timing === t ? 'bg-orange-600 text-white border-orange-600 shadow-[0_0_15px_rgba(255,79,0,0.3)]' : 'border-white/5 bg-white/5 text-white/60 hover:border-white/20'}`}>{t}</button>
                            ))}
                          </div>
                          {!formData.timing && <p className="text-[11px] font-mono text-orange-500/60 uppercase mt-3 text-left">Select timing to enable budget tiers</p>}
                        </div>
                        <div>
                          <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-[0.3em] mb-4 block text-left">What's your budget? <span className="text-white/20 font-normal tracking-normal lowercase">(This submits your brief)</span></label>
                          <div className="space-y-2">
                            {BUDGET_OPTIONS.map(o => {
                              const isActive = pendingBudget === o && isSubmitting;
                              return (
                                <button
                                  key={o}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, budget: o }));
                                    setPendingBudget(o);
                                    handleSubmit({ budget: o });
                                  }}
                                  disabled={isSubmitting || !formData.timing}
                                  className={`w-full p-4 border transition-all uppercase font-extrabold text-left text-base tracking-wider flex justify-between items-center ${!formData.timing ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/5 text-white/20' : 'bg-white/5 border-white/5 text-white hover:bg-orange-600 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(255,79,0,0.2)]'}`}
                                >
                                  {o} {isActive && <Loader2 className="animate-spin" size={14} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="px-8 py-5 border border-white/5 bg-white/5 text-white/60 font-extrabold uppercase text-base tracking-wider hover:text-white transition-all">Back</button>
                        <div className="flex-grow flex items-center justify-center text-[11px] text-white/20 font-mono uppercase tracking-widest animate-pulse">
                          {!formData.timing ? 'Waiting for timing...' : 'Select tier to finish'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : isError ? (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 relative z-10">
                <AlertCircle size={64} className="mx-auto text-red-600 mb-8" />
                <h3 className="text-3xl font-extrabold text-white uppercase tracking-tighter mb-4">Submission Failed</h3>
                <p className="text-white/60 text-base leading-relaxed mb-10 max-w-xs mx-auto uppercase font-body font-bold tracking-wider">A network conflict occurred. Please retry with your selected tier ({pendingBudget}).</p>
                <div className="space-y-4">
                  <button onClick={() => handleSubmit({ budget: pendingBudget })} className="w-full bg-orange-600 py-4 font-extrabold uppercase shadow-xl hover:bg-orange-500 transition-all text-base tracking-wider text-white flex items-center justify-center gap-3"><Loader2 className={isSubmitting ? 'animate-spin' : 'hidden'} size={16} /> Retry Submission</button>
                  <button onClick={handleClose} className="w-full bg-white/5 border border-white/10 py-4 font-extrabold uppercase text-white/60 hover:text-white transition-all text-base tracking-wider">Close</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 relative z-10">
                <CheckCircle2 size={64} className="mx-auto text-orange-600 mb-8" />
                <h3 className="text-3xl font-extrabold text-white uppercase tracking-tighter">Brief Received<span className="text-orange-600">.</span></h3>
                <div className="mt-8 p-6 border border-white/5 bg-white/5 text-left space-y-4">
                  <p className="text-[11px] font-mono text-white/60 uppercase tracking-[0.3em] mb-2 flex items-center gap-2"><Target size={10} className="text-orange-600" /> Brief Summary:</p>
                  <div className="grid grid-cols-2 gap-4 border-l-2 border-orange-600 pl-4">
                    <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Goal</p><p className="text-[11px] font-mono font-bold uppercase text-white leading-tight tracking-tight">{formData.goal}</p></div>
                    <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Placement</p><p className="text-[11px] font-mono font-bold uppercase text-white leading-tight tracking-tight">{formData.placement}</p></div>
                    <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Timing</p><p className="text-[11px] font-mono font-bold uppercase text-white leading-tight tracking-tight">{formData.timing}</p></div>
                    <div><p className="text-[10px] font-mono text-white/30 uppercase font-bold">Budget</p><p className="text-[11px] font-mono font-bold uppercase text-white leading-tight tracking-tight">{formData.budget}</p></div>
                  </div>
                </div>
                <p className="text-white/60 text-[11px] mt-10 leading-relaxed font-mono uppercase tracking-widest max-w-sm mx-auto">We've archived your brief. A creative lead will review and contact you via <span className="text-white">{formData.email}</span> shortly.</p>
                <button onClick={handleClose} className="mt-12 w-full px-8 py-4 bg-white text-black font-extrabold uppercase text-base tracking-wider hover:bg-white/90 transition-all shadow-2xl">Return to Work</button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
