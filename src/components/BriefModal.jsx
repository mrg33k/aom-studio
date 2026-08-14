import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { C, F, T, SP, LS, LH, BP } from './home2026/tokens';
import { MODAL } from './home2026/copy';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdalqvg';

// The ONLY strings in this file not sourced from copy.js. The frozen copy has no
// validation microcopy; inline blur validation is a hard requirement of the build.
// Promote these into MODAL on the next copy version bump.
const VALIDATION = {
  name: 'ENTER A FIRST AND LAST NAME',
  email: 'THAT EMAIL DOES NOT LOOK RIGHT',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM = { name: '', email: '', trade: '', crews: '', want: '', when: '' };
const INITIAL_TOUCHED = { name: false, email: false };

const num = (i) => String(i + 1).padStart(2, '0');

/* ---------------------------------------------------------------- hooks */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(BP.mob).matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(BP.mob);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

// Locks the page behind the sheet and gives the scroll position back on close,
// so the page never ends up stuck at the top or frozen after the modal exits.
function useScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    const { body } = document;
    const y = window.scrollY || window.pageYOffset || 0;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [active]);
}

/* ----------------------------------------------------------- primitives */

function FieldLabel({ index, children, style }) {
  return (
    <div
      style={{
        fontFamily: F.mono,
        fontSize: T.lbl,
        letterSpacing: LS.label,
        textTransform: 'uppercase',
        color: C.bronze,
        display: 'flex',
        alignItems: 'baseline',
        gap: SP[3],
        marginBottom: SP[4],
        ...style,
      }}
    >
      <span style={{ color: C.bronzeDim }}>{num(index)}</span>
      {children ? <span>{children}</span> : null}
    </div>
  );
}

function TextField({ index, label, placeholder, value, error, onChange, onBlur, type, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const rule = error ? C.bronze : focused ? C.bronze : C.ruleOnInk;
  return (
    <div>
      <FieldLabel index={index}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={type === 'email' ? 'email' : 'name'}
        aria-invalid={error ? 'true' : 'false'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur(); }}
        style={{
          width: '100%',
          minHeight: 52,
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${rule}`,
          borderRadius: 0,
          outline: 'none',
          padding: `${SP[3]}px 0`,
          fontFamily: F.mono,
          fontSize: 'clamp(15px, 1.15vw, 17px)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: C.onInk,
          transition: 'border-color 160ms ease',
        }}
      />
      <div
        style={{
          minHeight: 18,
          marginTop: SP[2],
          fontFamily: F.mono,
          fontSize: T.lbl,
          letterSpacing: LS.label,
          textTransform: 'uppercase',
          color: C.bronze,
          opacity: error ? 1 : 0,
          transition: 'opacity 160ms ease',
        }}
      >
        {error || ' '}
      </div>
    </div>
  );
}

function OptionButton({ selected, onClick, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minHeight: 48,
        padding: `${SP[3]}px ${SP[4]}px`,
        background: selected ? C.bronze : 'transparent',
        color: selected ? C.ink : C.onInk,
        border: `1px solid ${selected ? C.bronze : hover ? C.bronze : C.onInk}`,
        borderRadius: 0,
        cursor: 'pointer',
        fontFamily: F.display,
        fontWeight: 400,
        fontSize: 'clamp(14px, 1.05vw, 16px)',
        letterSpacing: '0.05em',
        lineHeight: 1.1,
        textTransform: 'uppercase',
        width: '100%',
        transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
      }}
    >
      {children}
    </button>
  );
}

function OptionGrid({ columns, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: SP[2] }}>
      {children}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, busy, children, grow = true }) {
  const [hover, setHover] = useState(false);
  const dead = disabled || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dead}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: grow ? '1 1 auto' : '0 0 auto',
        minHeight: 56,
        padding: `${SP[4]}px ${SP[6]}px`,
        background: dead ? 'rgba(181,138,56,0.28)' : hover ? C.bronzeDim : C.bronze,
        color: dead ? 'rgba(11,11,11,0.55)' : C.ink,
        border: 'none',
        borderRadius: 0,
        cursor: dead ? 'not-allowed' : 'pointer',
        fontFamily: F.display,
        fontWeight: 400,
        fontSize: 'clamp(15px, 1.15vw, 18px)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SP[3],
        transition: 'background 140ms ease',
      }}
    >
      {busy ? <Loader2 size={16} style={{ animation: 'spin 900ms linear infinite' }} /> : null}
      {children}
    </button>
  );
}

function GhostButton({ onClick, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: '0 0 auto',
        minHeight: 56,
        padding: `${SP[4]}px ${SP[7]}px`,
        background: 'transparent',
        color: C.onInk,
        border: `1px solid ${hover ? C.bronze : C.onInk}`,
        borderRadius: 0,
        cursor: 'pointer',
        fontFamily: F.display,
        fontWeight: 400,
        fontSize: 'clamp(15px, 1.15vw, 18px)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        transition: 'border-color 140ms ease',
      }}
    >
      {children}
    </button>
  );
}

function Headline({ children, isMobile }) {
  return (
    <h2
      style={{
        fontFamily: F.display,
        fontWeight: 400,
        fontSize: isMobile ? 'clamp(40px, 12vw, 60px)' : 'clamp(38px, 4.4vw, 62px)',
        lineHeight: LH.display,
        letterSpacing: LS.display,
        textTransform: 'uppercase',
        color: C.onInk,
        margin: `${SP[4]}px 0 ${SP[8]}px`,
      }}
    >
      {children}
    </h2>
  );
}

/* ---------------------------------------------------------------- modal */

/**
 * BriefModal — 3-step intake. Bronze-only accent, frozen copy, Formspree submit.
 *
 * Props (DO NOT CHANGE — imported across the whole site):
 *   isOpen   - boolean
 *   onClose  - () => void
 *   intent   - optional { title, statement }
 */
export default function BriefModal({ isOpen, onClose, intent = null }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState(INITIAL_TOUCHED);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const panelRef = useRef(null);

  useScrollLock(isOpen);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const errors = useMemo(() => ({
    name: form.name.trim().split(/\s+/).filter(Boolean).length < 2 ? VALIDATION.name : '',
    email: EMAIL_RE.test(form.email.trim()) ? '' : VALIDATION.email,
  }), [form.name, form.email]);

  const step1Valid = !errors.name && !errors.email;
  const step2Valid = form.trade !== '' && form.crews !== '';
  const step3Valid = form.want !== '' && form.when !== '';

  const handleClose = () => {
    onClose();
    setStep(1);
    setForm(INITIAL_FORM);
    setTouched(INITIAL_TOUCHED);
    setIsSuccess(false);
    setIsError(false);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !isSubmitting) handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const goNext = () => {
    if (step === 1) {
      setTouched({ name: true, email: true });
      if (!step1Valid) return;
    }
    if (step === 2 && !step2Valid) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = async () => {
    if (!step3Valid) return;
    setIsSubmitting(true);
    setIsError(false);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      trade: form.trade,
      crews: form.crews,
      want: form.want,
      when: form.when,
      intent: intent?.title || 'General Inquiry',
      intentStatement: intent?.statement || 'N/A',
      source: 'aheadofmarket.com brief modal',
      submittedAt: new Date().toISOString(),
    };
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          _subject: `New Lead: ${payload.name} (${payload.trade || payload.intent})`,
        }),
      });
      if (!res.ok) throw new Error('Formspree rejected submission');
      setIsSuccess(true);
    } catch (e) {
      console.error('Brief submission error', e);
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepMeta = [MODAL.step1, MODAL.step2, MODAL.step3][step - 1];
  const stateful = isSuccess || isError;
  const progress = isSuccess ? 1 : step / 3;

  const stepMotion = {
    initial: { opacity: 0, x: 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -12 },
    transition: { duration: 0.22, ease: 'easeOut' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={stepMeta?.h || MODAL.success.h}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !isSubmitting) handleClose(); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.94)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'center',
            padding: isMobile ? 0 : SP[6],
          }}
        >
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: isMobile ? 24 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 24 : 10 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: isMobile ? '100%' : 'min(620px, 100%)',
              height: isMobile ? '100dvh' : 'auto',
              maxHeight: isMobile ? '100dvh' : '92vh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              background: C.inkSoft,
              border: isMobile ? 'none' : `1px solid ${C.bronze}`,
              padding: isMobile
                ? `${SP[6]}px ${SP[5]}px calc(${SP[8]}px + env(safe-area-inset-bottom))`
                : `${SP[7]}px ${SP[8]}px ${SP[8]}px`,
              color: C.onInk,
            }}
          >
            {/* progress + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: SP[5], marginBottom: SP[6] }}>
              <div style={{ flex: '1 1 auto', height: 4, background: 'rgba(181,138,56,0.24)' }}>
                <motion.div
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ height: '100%', background: C.bronze }}
                />
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label="Close"
                style={{
                  flex: '0 0 auto',
                  width: 44,
                  height: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: C.bronze,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  padding: 0,
                }}
              >
                <X size={26} strokeWidth={1.6} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ------------------------------------------------ success */}
              {isSuccess ? (
                <motion.div key="success" {...stepMotion}>
                  <CheckCircle2 size={44} strokeWidth={1.4} color={C.bronze} />
                  <Headline isMobile={isMobile}>{MODAL.success.h}</Headline>
                  <p
                    style={{
                      fontFamily: F.body,
                      fontSize: T.b1,
                      lineHeight: LH.body,
                      color: C.onInkMute,
                      margin: `0 0 ${SP[8]}px`,
                      maxWidth: '46ch',
                    }}
                  >
                    {MODAL.success.body}
                  </p>
                  <div style={{ display: 'flex', gap: SP[3] }}>
                    <PrimaryButton onClick={handleClose}>{MODAL.success.cta}</PrimaryButton>
                  </div>
                </motion.div>
              ) : isError ? (
                /* -------------------------------------------------- error */
                <motion.div key="error" {...stepMotion}>
                  <AlertCircle size={44} strokeWidth={1.4} color={C.bronze} />
                  <Headline isMobile={isMobile}>{MODAL.error.h}</Headline>
                  <p
                    style={{
                      fontFamily: F.body,
                      fontSize: T.b1,
                      lineHeight: LH.body,
                      color: C.onInkMute,
                      margin: `0 0 ${SP[8]}px`,
                      maxWidth: '46ch',
                    }}
                  >
                    {MODAL.error.body}
                  </p>
                  <div style={{ display: 'flex', gap: SP[3], flexWrap: 'wrap' }}>
                    <GhostButton onClick={handleClose}>{MODAL.success.cta}</GhostButton>
                    <PrimaryButton onClick={submit} busy={isSubmitting}>
                      {MODAL.error.cta}
                    </PrimaryButton>
                  </div>
                </motion.div>
              ) : (
                /* --------------------------------------------------- form */
                <motion.div key={`step-${step}`} {...stepMotion}>
                  <div
                    style={{
                      fontFamily: F.mono,
                      fontSize: T.lbl,
                      letterSpacing: LS.label,
                      textTransform: 'uppercase',
                      color: C.bronze,
                    }}
                  >
                    {stepMeta.label}
                  </div>

                  {intent && step === 1 && (
                    <div
                      style={{
                        display: 'inline-block',
                        marginTop: SP[3],
                        padding: `${SP[2]}px ${SP[3]}px`,
                        border: `1px solid ${C.bronzeDim}`,
                        fontFamily: F.mono,
                        fontSize: T.lbl,
                        letterSpacing: LS.label,
                        textTransform: 'uppercase',
                        color: C.bronze,
                      }}
                    >
                      {intent.title}
                    </div>
                  )}

                  <Headline isMobile={isMobile}>{stepMeta.h}</Headline>

                  {step === 1 && (
                    <div style={{ display: 'grid', gap: SP[5] }}>
                      {MODAL.step1.fields.map((f, i) => (
                        <TextField
                          key={f.key}
                          index={i}
                          label={f.label}
                          placeholder={f.placeholder}
                          type={f.key === 'email' ? 'email' : 'text'}
                          autoFocus={i === 0 && !isMobile}
                          value={form[f.key]}
                          error={touched[f.key] ? errors[f.key] : ''}
                          onChange={(v) => set(f.key, v)}
                          onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
                        />
                      ))}
                    </div>
                  )}

                  {step === 2 && (
                    <div style={{ display: 'grid', gap: SP[7] }}>
                      {MODAL.step2.groups.map((g, i) => (
                        <div key={g.key}>
                          <FieldLabel index={i}>{g.label}</FieldLabel>
                          <OptionGrid columns={g.key === 'crews' ? 4 : isMobile ? 2 : 3}>
                            {g.options.map((o) => (
                              <OptionButton
                                key={o}
                                selected={form[g.key] === o}
                                onClick={() => set(g.key, o)}
                              >
                                {o}
                              </OptionButton>
                            ))}
                          </OptionGrid>
                        </div>
                      ))}
                    </div>
                  )}

                  {step === 3 && (
                    <div style={{ display: 'grid', gap: SP[7] }}>
                      {MODAL.step3.groups.map((g, i) => (
                        <div key={g.key}>
                          <FieldLabel index={i}>{g.label}</FieldLabel>
                          <OptionGrid columns={g.key === 'when' ? 3 : 2}>
                            {g.options.map((o) => (
                              <OptionButton
                                key={o}
                                selected={form[g.key] === o}
                                onClick={() => set(g.key, o)}
                              >
                                {o}
                              </OptionButton>
                            ))}
                          </OptionGrid>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: SP[3], marginTop: SP[8] }}>
                    {step > 1 && (
                      <GhostButton onClick={() => setStep((s) => s - 1)}>
                        {step === 2 ? MODAL.step2.back : MODAL.step3.back}
                      </GhostButton>
                    )}
                    {step < 3 ? (
                      <PrimaryButton
                        onClick={goNext}
                        disabled={step === 2 ? !step2Valid : false}
                      >
                        {step === 1 ? MODAL.step1.cta : MODAL.step2.cta}
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={submit} disabled={!step3Valid} busy={isSubmitting}>
                        {MODAL.step3.cta}
                      </PrimaryButton>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
