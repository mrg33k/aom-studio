import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronRight, SkipForward, Play, Pause, Zap, MessageSquare, Users, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// --- CONSTANTS ---
const BG = '#080C14';
const ACCENT = '#3B82F6';
const ACCENT2 = '#E85D26';
const FONT_DISPLAY = '"Syne", "SF Pro Display", -apple-system, sans-serif';
const FONT_BODY = '"Space Grotesk", "SF Pro Text", -apple-system, sans-serif';

// Step durations (ms). Last step = CTA, no auto-advance.
const STEP_DURATIONS_MAIN    = [3200, 3000, 7000, 4200, 6000, 5000, 4500, 3500, 99999];
const STEP_DURATIONS_ORIGIN  = [4000, 4000, 5000, 5000, 6000, 5000, 3500, 99999];

// --- AGENTS ---
const AGENTS = [
  { name: 'Bobby',  role: 'Web Dev',   color: '#3B82F6', avatar: '💻' },
  { name: 'Cleo',   role: 'Content',   color: '#8B5CF6', avatar: '🎬' },
  { name: 'Alex',   role: 'Strategy',  color: '#10B981', avatar: '📊' },
  { name: 'Jacob',  role: 'Outreach',  color: '#F59E0B', avatar: '📧' },
  { name: 'Steffen',role: 'Creative',  color: '#EC4899', avatar: '🎨' },
];

const TASKS = [
  { label: 'Build product landing page', agent: 'Bobby',  status: 'active' },
  { label: 'CPA outreach wave 2',         agent: 'Jacob',  status: 'queued' },
 { label: 'Crown video, final cut', agent: 'Cleo', status: 'done' },
];

// Realistic chat messages for Step 4 (main) — Bobby answering a real question
const CHAT_SEQUENCE = [
  { from: 'user',  text: "Hey, what are you working on right now?",           pause: 400 },
 { from: 'agent', text: "Building the /corner product page. I'm about 60% through the hero, punchy headline, feature grid below it. Should be wrapped in ~20 min.", pause: 1100, typing: 900 },
  { from: 'user',  text: "Make the headline more aggressive.",                  pause: 600 },
 { from: 'agent', text: "On it. 'Your AI back office. Always on.', going bolder on the sub too. Pushing now.", pause: 800, typing: 700 },
  { from: 'user',  text: "Ship it.",                                           pause: 400 },
  { from: 'agent', text: "Done. Committed. Vercel picked it up.",               pause: 600, typing: 500 },
];

// --- DEMO STEPS (main variant) ---
const STEPS_MAIN = [
  { id: 0, type: 'title',         caption: 'Every business starts somewhere.',   sub: null },
  { id: 1, type: 'room-single',   caption: 'This is your corner.',               sub: 'One room. One operation.' },
  { id: 2, type: 'room-name',     caption: 'Name it.',                           sub: 'Your business. Your rules.', hasInput: true },
 { id: 3, type: 'agent-first', caption: 'Meet your first hire.', sub: 'An AI agent, always on.' },
  { id: 4, type: 'chat',          caption: 'Talk to them.',                      sub: 'Real conversations. Real output.' },
  { id: 5, type: 'rooms-grow',    caption: 'Your team grows.',                   sub: 'Add agents as you scale.' },
  { id: 6, type: 'tasks',         caption: 'They get to work.',                  sub: 'Live task board. Always visible.' },
  { id: 7, type: 'full-dashboard',caption: 'This is Corner.',                   sub: 'Your AI operations command center.' },
  { id: 8, type: 'cta',           caption: 'Get your own Corner.',               sub: 'Built by AOM. Run by you.' },
];

// --- DEMO STEPS (origin / emotional variant) ---
const STEPS_ORIGIN = [
  { id: 0, type: 'origin-title',  caption: 'It starts with one room.',          sub: null },
  { id: 1, type: 'room-single',   caption: 'Just you.',                         sub: 'One desk. One idea.' },
  { id: 2, type: 'origin-lonely', caption: 'But you can\'t do it alone.',       sub: 'Every founder hits this wall.' },
  { id: 3, type: 'agent-first',   caption: 'So you make your first hire.',      sub: 'An AI agent that never clocks out.' },
  { id: 4, type: 'rooms-grow',    caption: 'Then another. Then another.',       sub: 'Rooms fill as your business grows.' },
  { id: 5, type: 'tasks',         caption: 'Work happens without asking.',      sub: 'They see the list. They move.' },
  { id: 6, type: 'full-dashboard',caption: 'One screen. Your whole operation.', sub: null },
  { id: 7, type: 'cta',           caption: 'Build your corner.',                sub: 'You started alone. You don\'t have to stay that way.' },
];

// --- ROOM IMAGE COMPONENT ---
function RoomImage({ src, alt, size = 120, glow, active = true, label, sublabel }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          overflow: 'hidden',
          border: `2px solid ${active ? (glow || ACCENT) : 'rgba(255,255,255,0.08)'}`,
          boxShadow: active ? `0 0 28px ${(glow || ACCENT)}55, 0 0 60px ${(glow || ACCENT)}22` : 'none',
          transition: 'all 0.4s ease',
          background: '#111827',
          position: 'relative',
        }}
      >
        {src && (
          <img
            src={src}
            alt={alt || label || ''}
            onLoad={() => setLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          />
        )}
        {!src && (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${(glow || ACCENT)}22 0%, ${(glow || ACCENT)}08 100%)`,
          }}>
            <div style={{ fontSize: size * 0.28 }}>🤖</div>
          </div>
        )}
        {/* Status dot */}
        {active && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 9, height: 9, borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 8px #22C55E',
          }} />
        )}
      </div>
      {(label || sublabel) && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          {label && <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT_BODY }}>{label}</div>}
          {sublabel && <div style={{ fontSize: 10, color: glow || ACCENT, fontWeight: 500, marginTop: 2, fontFamily: FONT_BODY }}>{sublabel}</div>}
        </div>
      )}
    </div>
  );
}

// Fallback hex room (for agents without room images)
function HexRoom({ name, role, color, active, size = 120 }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          background: active ? `linear-gradient(135deg, ${color}22 0%, ${color}0A 100%)` : 'rgba(255,255,255,0.03)',
          border: `2px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? `0 0 24px ${color}44, 0 0 48px ${color}18` : 'none',
          transition: 'all 0.4s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {active && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 50% 30%, ${color}18 0%, transparent 70%)`,
          }} />
        )}
        <div style={{ fontSize: size * 0.28, marginBottom: 4, position: 'relative', zIndex: 1 }}>
          {active ? (AGENTS.find(a => a.name === name)?.avatar || '🤖') : '📦'}
        </div>
        {active && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 1, position: 'relative', zIndex: 1, fontFamily: FONT_BODY }}>
              {name?.toUpperCase()}
            </div>
            <div style={{ fontSize: 9, color, fontWeight: 500, position: 'relative', zIndex: 1, marginTop: 2, fontFamily: FONT_BODY }}>
              {role}
            </div>
          </>
        )}
        {active && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 8, height: 8, borderRadius: '50%',
            background: color, boxShadow: `0 0 8px ${color}`,
          }} />
        )}
      </div>
    </div>
  );
}

// --- SPOTLIGHT OVERLAY ---
// Punches a bright hole in a dark overlay over a target element
function SpotlightOverlay({ targetRef, show, color = 'transparent' }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!show || !targetRef?.current) return;
    const update = () => {
      const r = targetRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [show, targetRef]);

  if (!show || !rect) return null;

  const pad = 24;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rx = (rect.width / 2) + pad;
  const ry = (rect.height / 2) + pad;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        background: `radial-gradient(ellipse ${rx}px ${ry}px at ${cx}px ${cy}px, transparent 0%, rgba(0,0,0,0.85) 100%)`,
      }}
    />
  );
}

// --- PROGRESS BAR ---
function ProgressBar({ step, total, autoPlay, timeLeft, duration }) {
  const pct = duration > 0 ? Math.max(0, Math.min(100, ((duration - timeLeft) / duration) * 100)) : 0;
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 2,
            flex: 1,
            borderRadius: 2,
            background: i < step ? ACCENT : 'rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'background 0.3s',
          }}
        >
          {i === step && autoPlay && (
            <motion.div
              style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: ACCENT, borderRadius: 2 }}
              initial={{ width: '0%' }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// --- TYPING INDICATOR ---
function TypingDots({ color }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', gap: 4, padding: '8px 14px', alignItems: 'center' }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.65, delay: i * 0.13 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: color || ACCENT }}
        />
      ))}
    </motion.div>
  );
}

// =====================
// STEP CONTENT COMPONENTS
// =====================

function StepTitle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center' }}
      >
        {/* Corner mark */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            width: 72, height: 72, borderRadius: 20,
            background: `linear-gradient(135deg, ${ACCENT}44, ${ACCENT}11)`,
            border: `2px solid ${ACCENT}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: `0 0 48px ${ACCENT}44`,
          }}
        >
          <Zap size={32} color={ACCENT} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{
            fontSize: 12, color: ACCENT, letterSpacing: 5, fontWeight: 700,
            textTransform: 'uppercase', marginBottom: 16, fontFamily: FONT_BODY,
          }}
        >
          Corner by AOM
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.6 }}
          style={{
            fontSize: 'clamp(13px, 2vw, 16px)', color: 'rgba(255,255,255,0.4)',
            fontFamily: FONT_BODY, lineHeight: 1.6,
          }}
        >
          Your AI operations system — from first idea to full team.
        </motion.div>
      </motion.div>
    </div>
  );
}

function StepOriginTitle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 80 }}
          style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 32px',
          }}
        >
          <span style={{ fontSize: 28 }}>📦</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          style={{
            fontSize: 'clamp(14px, 2vw, 17px)', color: 'rgba(255,255,255,0.5)',
            fontFamily: FONT_BODY, lineHeight: 1.8, margin: 0,
          }}
        >
          Every big company started as one person with one idea and one room.
        </motion.p>
      </motion.div>
    </div>
  );
}

function StepRoomSingle({ isOrigin }) {
  const roomRef = useRef(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        ref={roomRef}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, type: 'spring', stiffness: 100, damping: 14 }}
      >
        <RoomImage
          src="/rooms/patrik-office.png"
          label={isOrigin ? 'You' : null}
          sublabel={isOrigin ? 'Founder' : null}
          glow={ACCENT2}
          size={160}
        />
      </motion.div>
    </div>
  );
}

function StepOriginLonely() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 32 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}
      >
        <RoomImage
          src="/rooms/patrik-office.png"
          label="You"
          sublabel="Founder"
          glow={ACCENT2}
          size={120}
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          style={{
            marginTop: 28,
            fontSize: 'clamp(14px, 2vw, 16px)',
            color: 'rgba(255,255,255,0.45)',
            fontFamily: FONT_BODY, lineHeight: 1.8,
          }}
        >
          The calls pile up. The tasks pile up. The vision is clear
          but you can only move so fast — alone.
        </motion.p>
      </motion.div>
    </div>
  );
}

function StepRoomName({ onNameSet, roomName }) {
  const [val, setVal] = useState(roomName || '');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (val.trim()) onNameSet(val.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 32 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 130 }}
      >
        <RoomImage
          src="/rooms/patrik-office.png"
          glow={ACCENT2}
          size={130}
          label={val || undefined}
          sublabel={val ? 'Your corner' : undefined}
        />
      </motion.div>
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Your business name..."
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${val ? ACCENT : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 12,
            padding: '13px 22px',
            fontSize: 16,
            color: '#fff',
            outline: 'none',
            width: 280,
            textAlign: 'center',
            fontFamily: FONT_BODY,
            transition: 'border-color 0.2s',
            letterSpacing: 0.5,
          }}
          maxLength={30}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: val ? ACCENT2 : 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${val ? ACCENT2 : 'rgba(255,255,255,0.1)'}`,
            color: val ? '#fff' : 'rgba(255,255,255,0.3)',
            borderRadius: 12,
            padding: '11px 32px',
            fontSize: 13,
            fontWeight: 700,
            cursor: val ? 'pointer' : 'default',
            letterSpacing: 1,
            textTransform: 'uppercase',
            transition: 'all 0.2s',
            fontFamily: FONT_BODY,
            boxShadow: val ? `0 0 20px ${ACCENT2}44` : 'none',
          }}
          disabled={!val}
        >
          Claim it
        </motion.button>
      </motion.form>
    </div>
  );
}

function StepAgentFirst({ roomName }) {
  const [agentVisible, setAgentVisible] = useState(false);
  const [lineVisible, setLineVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLineVisible(true), 500);
    const t2 = setTimeout(() => setAgentVisible(true), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Owner room */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
          <RoomImage
            src="/rooms/patrik-office.png"
            label={roomName || 'You'}
            sublabel="Owner"
            glow={ACCENT2}
            size={120}
          />
        </motion.div>
        {/* Connector line */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: lineVisible ? 1 : 0, opacity: lineVisible ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{
            width: 48, height: 2,
            background: `linear-gradient(90deg, ${ACCENT2}, ${AGENTS[0].color})`,
            transformOrigin: 'left',
          }}
        />
        {/* Agent room */}
        <AnimatePresence>
          {agentVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              <HexRoom
                name={AGENTS[0].name}
                role={AGENTS[0].role}
                color={AGENTS[0].color}
                active
                size={120}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {agentVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{
            background: `rgba(59,130,246,0.08)`,
            border: `1px solid rgba(59,130,246,0.25)`,
            borderRadius: 10,
            padding: '8px 18px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: FONT_BODY,
          }}
        >
          Bobby just joined your corner.
        </motion.div>
      )}
    </div>
  );
}

function StepChat({ roomName }) {
  const [visibleMsgs, setVisibleMsgs] = useState([]);
  const [typingFor, setTypingFor] = useState(null); // index of msg being "typed"
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let totalDelay = 0;

    CHAT_SEQUENCE.forEach((msg, i) => {
      totalDelay += msg.pause || 500;
      const showTypingAt = totalDelay;
      const showMsgAt = totalDelay + (msg.typing || 0);

      // Show typing indicator before agent messages
      if (msg.from === 'agent' && msg.typing) {
        setTimeout(() => {
          if (!cancelled) setTypingFor(i);
        }, showTypingAt);
      }

      setTimeout(() => {
        if (!cancelled) {
          setTypingFor(null);
          setVisibleMsgs((prev) => [...prev, msg]);
        }
      }, showMsgAt + (msg.from === 'agent' && msg.typing ? 0 : showTypingAt - totalDelay + totalDelay));
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMsgs, typingFor]);

  const agent = AGENTS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Chat header */}
        <div style={{
          padding: '13px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${agent.color}44, ${agent.color}18)`,
            border: `1.5px solid ${agent.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {agent.avatar}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: FONT_BODY }}>{agent.name}</div>
            <div style={{ fontSize: 10, color: agent.color, fontFamily: FONT_BODY }}>Web Dev · Online</div>
          </div>
          <div style={{
            marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
            background: '#22C55E', boxShadow: '0 0 8px #22C55E',
          }} />
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            padding: '16px 12px', display: 'flex', flexDirection: 'column',
            gap: 8, minHeight: 180, maxHeight: 240, overflowY: 'auto',
          }}
        >
          {visibleMsgs.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, type: 'spring', stiffness: 280, damping: 22 }}
              style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '9px 13px',
                borderRadius: msg.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.from === 'user' ? ACCENT : 'rgba(255,255,255,0.08)',
                fontSize: 13, lineHeight: 1.5, color: '#fff', fontFamily: FONT_BODY,
              }}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {/* Typing indicator */}
          <AnimatePresence>
            {typingFor !== null && (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', justifyContent: 'flex-start' }}
              >
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '14px 14px 14px 4px',
                }}>
                  <TypingDots color={agent.color} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input bar (static UI hint) */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 9, padding: '8px 12px',
            fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY,
          }}>
            Message {agent.name}...
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ArrowRight size={14} color="#fff" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StepRoomsGrow({ roomName }) {
  const [visibleRooms, setVisibleRooms] = useState(1);

  useEffect(() => {
    const timers = AGENTS.slice(1).map((_, i) =>
      setTimeout(() => setVisibleRooms((c) => c + 1), (i + 1) * 550 + 200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        maxWidth: 360,
      }}>
        {/* Owner room */}
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}>
          <RoomImage src="/rooms/patrik-office.png" label={roomName || 'You'} sublabel="Owner" glow={ACCENT2} size={96} />
        </motion.div>
        {/* Team room */}
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.1 }}>
          <RoomImage src="/rooms/aom-team-room.png" label="AOM Team" sublabel="Command" glow={ACCENT} size={96} />
        </motion.div>
        {/* Agent rooms */}
        {AGENTS.slice(0, 4).map((agent, i) => (
          <AnimatePresence key={agent.name}>
            {i < visibleRooms && (
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                <HexRoom name={agent.name} role={agent.role} color={agent.color} active size={96} />
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
}

function StepTasks() {
  const [visibleTasks, setVisibleTasks] = useState(0);
  const statusColor = { active: '#22C55E', queued: ACCENT, done: '#4B5563' };
  const statusLabel = { active: 'Right Now', queued: 'To Do', done: 'Done' };

  useEffect(() => {
    const timers = TASKS.map((_, i) => setTimeout(() => setVisibleTasks((c) => c + 1), i * 520 + 250));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      {/* HUD pill */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.3)',
          borderRadius: 20, padding: '6px 16px', marginBottom: 4,
        }}
      >
        <Zap size={12} color="#22C55E" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: FONT_BODY }}>
          Live Tasks
        </span>
        <span style={{
          background: '#22C55E', color: '#fff', borderRadius: 10,
          fontSize: 10, fontWeight: 700, padding: '1px 7px',
        }}>
          {Math.min(visibleTasks, 1)}
        </span>
      </motion.div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
        {TASKS.slice(0, visibleTasks).map((task, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${statusColor[task.status]}28`,
              borderLeft: `3px solid ${statusColor[task.status]}`,
              borderRadius: 11,
              padding: '11px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {task.status === 'done' ? (
              <CheckCircle2 size={14} color={statusColor[task.status]} />
            ) : (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor[task.status],
                boxShadow: task.status === 'active' ? `0 0 8px ${statusColor[task.status]}` : 'none',
                flexShrink: 0,
              }} />
            )}
            <span style={{
              flex: 1, fontSize: 13, fontFamily: FONT_BODY,
              color: task.status === 'done' ? 'rgba(255,255,255,0.3)' : '#fff',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
            }}>
              {task.label}
            </span>
            <span style={{
              fontSize: 10, fontFamily: FONT_BODY, fontWeight: 600,
              color: statusColor[task.status],
              background: `${statusColor[task.status]}18`,
              border: `1px solid ${statusColor[task.status]}30`,
              borderRadius: 6, padding: '2px 8px',
            }}>
              {statusLabel[task.status]}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepFullDashboard({ roomName }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, type: 'spring', stiffness: 110, damping: 14 }}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: `0 0 80px rgba(59,130,246,0.14), 0 32px 80px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Browser chrome */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.015)',
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6,
            padding: '4px 10px', fontSize: 10,
            color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontFamily: FONT_BODY,
          }}>
            aheadofmarket.com/corner
          </div>
        </div>

        {/* Dashboard body */}
        <div style={{ padding: 14, display: 'flex', gap: 12 }}>
          {/* Left: rooms grid */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}>
            <RoomImage src="/rooms/patrik-office.png" label={roomName || 'You'} sublabel="Owner" glow={ACCENT2} size={72} />
            <RoomImage src="/rooms/aom-team-room.png" label="AOM" sublabel="Team" glow={ACCENT} size={72} />
            {AGENTS.slice(0, 2).map((a) => (
              <HexRoom key={a.name} name={a.name} role={a.role} color={a.color} active size={72} />
            ))}
          </div>

          {/* Right: task feed */}
          <div style={{ width: 155, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, color: ACCENT, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2, fontFamily: FONT_BODY }}>
              Right Now
            </div>
            {TASKS.map((t, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                borderLeft: `2px solid ${t.status === 'active' ? '#22C55E' : t.status === 'done' ? '#374151' : ACCENT}`,
                borderRadius: 6, padding: '5px 8px',
                fontSize: 10, fontFamily: FONT_BODY,
                color: t.status === 'done' ? 'rgba(255,255,255,0.25)' : '#ddd',
              }}>
                {t.label}
              </div>
            ))}
            {/* Chat snippet */}
            <div style={{
              marginTop: 4,
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 6, padding: '6px 8px',
            }}>
              <div style={{ fontSize: 9, color: ACCENT, fontWeight: 700, marginBottom: 3, fontFamily: FONT_BODY }}>Bobby</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontFamily: FONT_BODY }}>
                Product page live. ~20 min.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StepCTA({ onGetStarted, isOrigin }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 32, padding: '0 24px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, type: 'spring', stiffness: 120 }}
        style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
      >
        {/* Corner mark */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{
            width: 80, height: 80, borderRadius: 22,
            background: `linear-gradient(135deg, ${ACCENT2}44, ${ACCENT2}18)`,
            border: `2px solid ${ACCENT2}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 60px ${ACCENT2}44`,
          }}
        >
          <Zap size={38} color={ACCENT2} />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontSize: 'clamp(14px, 2.5vw, 17px)',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: FONT_BODY,
            lineHeight: 1.7,
            margin: 0,
            maxWidth: 380,
          }}
        >
          {isOrigin
            ? 'You started with one room. Now build the whole building.'
            : 'Your AI back office. Built by AOM, run by you.'}
        </motion.p>

        {/* Feature chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {[
            { icon: Users,         label: '11 AI agents' },
            { icon: MessageSquare, label: 'Live chat relay' },
            { icon: CheckCircle2,  label: 'Real-time tasks' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: '7px 14px',
              fontSize: 12, color: 'rgba(255,255,255,0.65)',
              fontFamily: FONT_BODY,
            }}>
              <Icon size={12} color={ACCENT} />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Primary CTA — orange, impactful */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          whileHover={{ scale: 1.05, boxShadow: `0 0 48px ${ACCENT2}77` }}
          whileTap={{ scale: 0.97 }}
          onClick={onGetStarted}
          style={{
            background: ACCENT2,
            border: 'none',
            borderRadius: 16,
            padding: '18px 52px',
            fontSize: 18,
            fontWeight: 800,
            fontFamily: FONT_DISPLAY,
            color: '#fff',
            cursor: 'pointer',
            letterSpacing: 0.3,
            boxShadow: `0 0 32px ${ACCENT2}55, 0 8px 32px rgba(0,0,0,0.4)`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          Get your own Corner
          <ArrowRight size={20} />
        </motion.button>

        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          href="/corner"
          style={{
            fontSize: 13, color: 'rgba(255,255,255,0.35)',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            paddingBottom: 1, fontFamily: FONT_BODY,
          }}
        >
          Learn more about Corner
        </motion.a>
      </motion.div>
    </div>
  );
}

// =====================
// MAIN DEMO PAGE
// =====================
export default function DemoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOrigin = searchParams.get('variant') === 'origin';

  const STEPS         = isOrigin ? STEPS_ORIGIN  : STEPS_MAIN;
  const STEP_DURATIONS = isOrigin ? STEP_DURATIONS_ORIGIN : STEP_DURATIONS_MAIN;

  const [step, setStep]               = useState(0);
  const [autoPlay, setAutoPlay]       = useState(true);
  const [timeLeft, setTimeLeft]       = useState(STEP_DURATIONS[0]);
  const [roomName, setRoomName]       = useState('');
  const [roomNameSet, setRoomNameSet] = useState(false);
  const timerRef = useRef(null);
  const tickRef  = useRef(null);

  const currentStep = STEPS[step];
  const duration    = STEP_DURATIONS[step];
  const isLastStep  = step === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      setTimeLeft(STEP_DURATIONS[step + 1]);
    }
  }, [step, STEPS, STEP_DURATIONS]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      setTimeLeft(STEP_DURATIONS[step - 1]);
    }
  }, [step, STEP_DURATIONS]);

  // Auto-advance timer
  useEffect(() => {
    if (!autoPlay || isLastStep) return;
    if (currentStep.type === 'room-name' && !roomNameSet) return;

    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);

    setTimeLeft(duration);

    tickRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 100));
    }, 100);

    timerRef.current = setTimeout(() => { goNext(); }, duration);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(tickRef.current);
    };
  }, [step, autoPlay, roomNameSet]);

  const handleNameSet = (name) => {
    setRoomName(name);
    setRoomNameSet(true);
    setTimeout(goNext, 650);
  };

  const handleGetStarted = () => navigate('/book');

  const renderStepContent = () => {
    switch (currentStep.type) {
      case 'title':          return <StepTitle />;
      case 'origin-title':   return <StepOriginTitle />;
      case 'origin-lonely':  return <StepOriginLonely />;
      case 'room-single':    return <StepRoomSingle isOrigin={isOrigin} />;
      case 'room-name':      return <StepRoomName onNameSet={handleNameSet} roomName={roomName} />;
      case 'agent-first':    return <StepAgentFirst roomName={roomName} />;
      case 'chat':           return <StepChat roomName={roomName} />;
      case 'rooms-grow':     return <StepRoomsGrow roomName={roomName} />;
      case 'tasks':          return <StepTasks />;
      case 'full-dashboard': return <StepFullDashboard roomName={roomName} />;
      case 'cta':            return <StepCTA onGetStarted={handleGetStarted} isOrigin={isOrigin} />;
      default:               return null;
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: FONT_BODY,
        position: 'relative',
      }}
    >
      {/* Cinematic ambient gradient */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 100% 55% at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 70%),
                     radial-gradient(ellipse 60% 40% at 80% 80%, rgba(232,93,38,0.04) 0%, transparent 60%)`,
      }} />

      {/* Subtle grain texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        opacity: 0.4,
      }} />

      {/* Top bar: logo + progress + controls */}
      <div style={{
        position: 'relative', zIndex: 20,
        padding: '18px 24px 0',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Logo row + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `linear-gradient(135deg, ${ACCENT}44, ${ACCENT}18)`,
              border: `1.5px solid ${ACCENT}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={14} color={ACCENT} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5, fontFamily: FONT_DISPLAY }}>
              Corner
            </span>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isLastStep && (
              <button
                onClick={() => setAutoPlay((v) => !v)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.45)', fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT_BODY,
                }}
              >
                {autoPlay ? <Pause size={11} /> : <Play size={11} />}
                {autoPlay ? 'Pause' : 'Play'}
              </button>
            )}
            {!isLastStep && (
              <button
                onClick={() => setStep(STEPS.length - 1)}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT_BODY,
                }}
              >
                <SkipForward size={11} />
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar step={step} total={STEPS.length} autoPlay={autoPlay} timeLeft={timeLeft} duration={duration} />
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${step}-${isOrigin}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            {/* Caption */}
            <div style={{ textAlign: 'center', padding: '28px 24px 0' }}>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  fontSize: 'clamp(22px, 5.5vw, 40px)',
                  fontWeight: 800,
                  color: '#fff',
                  margin: 0,
                  letterSpacing: '-0.8px',
                  lineHeight: 1.15,
                  fontFamily: FONT_DISPLAY,
                }}
              >
                {currentStep.caption}
              </motion.h2>
              {currentStep.sub && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28, duration: 0.4 }}
                  style={{
                    fontSize: 'clamp(14px, 2vw, 17px)',
                    color: 'rgba(255,255,255,0.42)',
                    margin: '10px 0 0',
                    fontWeight: 400,
                    fontFamily: FONT_BODY,
                    lineHeight: 1.5,
                  }}
                >
                  {currentStep.sub}
                </motion.p>
              )}
            </div>

            {/* Step visual */}
            <div style={{ flex: 1, position: 'relative', padding: '16px 24px', minHeight: 0 }}>
              {renderStepContent()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'relative', zIndex: 20,
        padding: '12px 24px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Back */}
        <button
          onClick={goPrev}
          disabled={step === 0}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '9px 20px',
            cursor: step === 0 ? 'default' : 'pointer',
            color: step === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)',
            fontSize: 13, fontFamily: FONT_BODY,
            transition: 'all 0.2s',
          }}
        >
          Back
        </button>

        {/* Step counter */}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 500, fontFamily: FONT_BODY }}>
          {step + 1} / {STEPS.length}
        </span>

        {/* Next / Get started */}
        {!isLastStep ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            style={{
              background: ACCENT, border: 'none', borderRadius: 10,
              padding: '9px 22px', cursor: 'pointer', color: '#fff',
              fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `0 0 18px ${ACCENT}44`,
            }}
          >
            Next
            <ChevronRight size={14} />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: `0 0 32px ${ACCENT2}66` }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGetStarted}
            style={{
              background: ACCENT2, border: 'none', borderRadius: 10,
              padding: '10px 22px', cursor: 'pointer', color: '#fff',
              fontSize: 14, fontWeight: 800, fontFamily: FONT_DISPLAY,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `0 0 20px ${ACCENT2}55`,
            }}
          >
            Get started
            <ArrowRight size={14} />
          </motion.button>
        )}
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 480px) {
          h2 { font-size: 22px !important; }
        }
        @media (min-width: 768px) and (max-width: 1280px) {
          /* iPad — comfortable scaling handled by clamp() and flex */
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; background: transparent; }
      `}</style>
    </div>
  );
}