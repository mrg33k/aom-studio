import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronRight, SkipForward, Play, Pause, Zap, MessageSquare, Users, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- CONSTANTS ---
const BG = '#0A0F1A';
const ACCENT = '#3B82F6'; // blue HUD
const ACCENT2 = '#E85D26'; // AOM orange
const STEP_DURATIONS = [3000, 3000, 7000, 4000, 5000, 4000, 3500, 3000, 99999];

const AGENTS = [
  { name: 'Bobby', role: 'Web Dev', color: '#3B82F6', emoji: '💻' },
  { name: 'Cleo', role: 'Content', color: '#8B5CF6', emoji: '🎬' },
  { name: 'Alex', role: 'Strategy', color: '#10B981', emoji: '📊' },
  { name: 'Jacob', role: 'Outreach', color: '#F59E0B', emoji: '📧' },
  { name: 'Steffen', role: 'Creative', color: '#EC4899', emoji: '🎨' },
];

const TASKS = [
  { label: 'Build product page', agent: 'Bobby', status: 'active' },
  { label: 'CPA outreach wave 2', agent: 'Jacob', status: 'queued' },
  { label: 'Crown video final cut', agent: 'Cleo', status: 'done' },
];

const CHAT_MESSAGES = [
  { from: 'user', text: 'What are you working on?' },
  { from: 'agent', text: "Building the /corner product page. I'm about 60% through the hero section. Should be done in ~20 minutes.", delay: 900 },
  { from: 'user', text: 'Make it punchy.' },
  { from: 'agent', text: 'On it. Punchy headline, no fluff.', delay: 700 },
];

// --- DEMO STEPS ---
const STEPS = [
  {
    id: 0,
    type: 'title',
    caption: 'Every business starts somewhere.',
    sub: null,
  },
  {
    id: 1,
    type: 'room-single',
    caption: 'This is your corner.',
    sub: 'One room. One operation.',
  },
  {
    id: 2,
    type: 'room-name',
    caption: 'Name it.',
    sub: 'Your business. Your rules.',
    hasInput: true,
  },
  {
    id: 3,
    type: 'agent-first',
    caption: 'Meet your first hire.',
    sub: 'An AI agent, always on.',
  },
  {
    id: 4,
    type: 'chat',
    caption: 'Talk to them.',
    sub: 'Real conversations. Real output.',
  },
  {
    id: 5,
    type: 'rooms-grow',
    caption: 'Your team grows.',
    sub: 'Add agents as you scale.',
  },
  {
    id: 6,
    type: 'tasks',
    caption: 'They get to work.',
    sub: 'Live task board. Always visible.',
  },
  {
    id: 7,
    type: 'full-dashboard',
    caption: 'This is Corner.',
    sub: 'Your AI operations command center.',
  },
  {
    id: 8,
    type: 'cta',
    caption: 'Get your own Corner.',
    sub: 'Built by AOM. Run by you.',
  },
];

// --- COMPONENTS ---

// Hex room component
function HexRoom({ name, role, color, active, size = 120, showBadge = false, badgeName = '' }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '16px',
          background: active
            ? `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`
            : 'rgba(255,255,255,0.03)',
          border: `2px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? `0 0 24px ${color}44, 0 0 48px ${color}22` : 'none',
          transition: 'all 0.4s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {active && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 50% 30%, ${color}18 0%, transparent 70%)`,
            }}
          />
        )}
        <div style={{ fontSize: size * 0.3, marginBottom: 4, position: 'relative', zIndex: 1 }}>
          {active ? '🤖' : '⬜'}
        </div>
        {active && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1, position: 'relative', zIndex: 1 }}>
              {name?.toUpperCase()}
            </div>
            <div style={{ fontSize: 9, color: color, fontWeight: 500, position: 'relative', zIndex: 1, marginTop: 2 }}>
              {role}
            </div>
          </>
        )}
        {/* Status dot */}
        {active && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        )}
      </div>
      {showBadge && badgeName && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 12,
            color: '#fff',
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {badgeName}
        </motion.div>
      )}
    </div>
  );
}

// Spotlight overlay
function Spotlight({ children, spotX, spotY, spotW, spotH, show }) {
  if (!show) return <>{children}</>;
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
          background: `radial-gradient(ellipse ${spotW}px ${spotH}px at ${spotX}px ${spotY}px, transparent 0%, rgba(0,0,0,0.82) 100%)`,
          transition: 'all 0.6s ease',
        }}
      />
    </div>
  );
}

// Progress bar
function ProgressBar({ step, total, autoPlay, timeLeft, duration }) {
  const pct = duration > 0 ? Math.max(0, Math.min(100, ((duration - timeLeft) / duration) * 100)) : 0;
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 3,
            flex: 1,
            borderRadius: 2,
            background: i < step ? ACCENT : 'rgba(255,255,255,0.12)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'background 0.3s',
          }}
        >
          {i === step && autoPlay && (
            <motion.div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                background: ACCENT,
                borderRadius: 2,
              }}
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

// --- STEP CONTENT RENDERERS ---

function StepTitle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 14, color: ACCENT, letterSpacing: 4, fontWeight: 600, marginBottom: 20, textTransform: 'uppercase' }}>
          Corner by AOM
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${ACCENT}33, ${ACCENT}11)`,
            border: `2px solid ${ACCENT}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: `0 0 32px ${ACCENT}33`,
          }}
        >
          <Zap size={28} color={ACCENT} />
        </div>
      </motion.div>
    </div>
  );
}

function StepRoomSingle() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 120, damping: 14 }}
      >
        <HexRoom active={false} size={140} />
      </motion.div>
    </div>
  );
}

function StepRoomName({ onNameSet, roomName }) {
  const [val, setVal] = useState(roomName || '');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (val.trim()) onNameSet(val.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 28 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
      >
        <HexRoom active={false} size={120} showBadge={!!val} badgeName={val} />
      </motion.div>
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
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
            borderRadius: 10,
            padding: '12px 20px',
            fontSize: 16,
            color: '#fff',
            outline: 'none',
            width: 260,
            textAlign: 'center',
            fontFamily: 'inherit',
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
            background: val ? ACCENT : 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${val ? ACCENT : 'rgba(255,255,255,0.1)'}`,
            color: val ? '#fff' : 'rgba(255,255,255,0.3)',
            borderRadius: 10,
            padding: '10px 28px',
            fontSize: 13,
            fontWeight: 700,
            cursor: val ? 'pointer' : 'default',
            letterSpacing: 1,
            textTransform: 'uppercase',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
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

  useEffect(() => {
    const t = setTimeout(() => setAgentVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {/* Owner room */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <HexRoom
            name={roomName || 'You'}
            role="Owner"
            color={ACCENT2}
            active={true}
            size={110}
          />
        </motion.div>
        {/* Connector */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: agentVisible ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            width: 40,
            height: 2,
            background: `linear-gradient(90deg, ${ACCENT2}, ${AGENTS[0].color})`,
            transformOrigin: 'left',
          }}
        />
        {/* Agent room */}
        <AnimatePresence>
          {agentVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            >
              <HexRoom
                name={AGENTS[0].name}
                role={AGENTS[0].role}
                color={AGENTS[0].color}
                active={true}
                size={110}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepChat({ roomName }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let i = 0;
    const show = () => {
      if (i < CHAT_MESSAGES.length) {
        const msg = CHAT_MESSAGES[i];
        const delay = i === 0 ? 300 : (msg.delay || 800);
        setTimeout(() => {
          setVisibleCount((c) => c + 1);
          i++;
          show();
        }, delay);
      }
    };
    show();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: 340,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${AGENTS[0].color}44, ${AGENTS[0].color}22)`,
              border: `1.5px solid ${AGENTS[0].color}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🤖
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{AGENTS[0].name}</div>
            <div style={{ fontSize: 10, color: AGENTS[0].color }}>Online</div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: AGENTS[0].color,
              boxShadow: `0 0 8px ${AGENTS[0].color}`,
            }}
          />
        </div>
        {/* Messages */}
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 140 }}>
          {CHAT_MESSAGES.slice(0, visibleCount).map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
              style={{
                display: 'flex',
                justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '78%',
                  padding: '8px 12px',
                  borderRadius: msg.from === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background:
                    msg.from === 'user'
                      ? ACCENT
                      : 'rgba(255,255,255,0.07)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: '#fff',
                }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          {/* Typing indicator */}
          {visibleCount > 0 && visibleCount < CHAT_MESSAGES.length && CHAT_MESSAGES[visibleCount]?.from === 'agent' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 4, padding: '6px 12px', alignItems: 'center' }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: AGENTS[0].color }}
                />
              ))}
            </motion.div>
          )}
        </div>
        {/* Input bar */}
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            Message Bobby...
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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
    const timers = AGENTS.slice(1).map((_, i) => {
      return setTimeout(() => setVisibleRooms((c) => c + 1), (i + 1) * 600);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          maxWidth: 380,
        }}
      >
        {/* Owner room always visible */}
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <HexRoom name={roomName || 'You'} role="Owner" color={ACCENT2} active size={100} />
        </motion.div>
        {AGENTS.slice(0, 5).map((agent, i) => (
          <AnimatePresence key={agent.name}>
            {i < visibleRooms && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 16 }}
              >
                <HexRoom name={agent.name} role={agent.role} color={agent.color} active size={100} />
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

  useEffect(() => {
    const timers = TASKS.map((_, i) => setTimeout(() => setVisibleTasks((c) => c + 1), i * 500 + 200));
    return () => timers.forEach(clearTimeout);
  }, []);

  const statusColor = { active: '#22C55E', queued: ACCENT, done: '#6B7280' };
  const statusLabel = { active: 'Right Now', queued: 'To Do', done: 'Done' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      {/* HUD pill */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(34,197,94,0.1)',
          border: '1.5px solid rgba(34,197,94,0.3)',
          borderRadius: 20,
          padding: '6px 16px',
          marginBottom: 4,
        }}
      >
        <Zap size={12} color="#22C55E" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', letterSpacing: 1, textTransform: 'uppercase' }}>
          Right Now
        </span>
        <span
          style={{
            background: '#22C55E',
            color: '#fff',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 7px',
          }}
        >
          {Math.min(visibleTasks, TASKS.filter((t) => t.status === 'active').length)}
        </span>
      </motion.div>
      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 320 }}>
        {TASKS.slice(0, visibleTasks).map((task, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${statusColor[task.status]}33`,
              borderLeft: `3px solid ${statusColor[task.status]}`,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {task.status === 'done' ? (
              <CheckCircle2 size={14} color={statusColor[task.status]} />
            ) : (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusColor[task.status],
                  boxShadow: task.status === 'active' ? `0 0 8px ${statusColor[task.status]}` : 'none',
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ flex: 1, fontSize: 13, color: task.status === 'done' ? 'rgba(255,255,255,0.35)' : '#fff', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
              {task.label}
            </span>
            <span
              style={{
                fontSize: 10,
                color: statusColor[task.status],
                background: `${statusColor[task.status]}18`,
                border: `1px solid ${statusColor[task.status]}33`,
                borderRadius: 6,
                padding: '2px 8px',
                fontWeight: 600,
              }}
            >
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
      {/* Mini dashboard mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, type: 'spring', stiffness: 120, damping: 14 }}
        style={{
          width: 420,
          maxWidth: '100%',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: `0 0 60px rgba(59,130,246,0.12), 0 24px 64px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 5 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
            }}
          >
            aheadofmarket.com/dashboard
          </div>
        </div>
        {/* Dashboard body */}
        <div style={{ padding: 14, display: 'flex', gap: 10 }}>
          {/* Left: agent rooms grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <HexRoom name={roomName || 'You'} role="Owner" color={ACCENT2} active size={72} />
            {AGENTS.slice(0, 3).map((a) => (
              <HexRoom key={a.name} name={a.name} role={a.role} color={a.color} active size={72} />
            ))}
          </div>
          {/* Right: task feed */}
          <div style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, color: ACCENT, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
              Right Now
            </div>
            {TASKS.map((t, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderLeft: `2px solid ${t.status === 'active' ? '#22C55E' : t.status === 'done' ? '#4B5563' : ACCENT}`,
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: 10,
                  color: t.status === 'done' ? 'rgba(255,255,255,0.3)' : '#ddd',
                }}
              >
                {t.label}
              </div>
            ))}
            {/* Chat preview */}
            <div
              style={{
                marginTop: 6,
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 6,
                padding: '6px 8px',
              }}
            >
              <div style={{ fontSize: 9, color: ACCENT, fontWeight: 700, marginBottom: 3 }}>Bobby</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                Building product page... ~20 min
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StepCTA({ onGetStarted }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 28 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
        style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${ACCENT}33, ${ACCENT}11)`,
            border: `2px solid ${ACCENT}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 40px ${ACCENT}33`,
          }}
        >
          <Zap size={34} color={ACCENT} />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: Users, label: '11 AI agents' },
            { icon: MessageSquare, label: 'Live chat relay' },
            { icon: CheckCircle2, label: 'Real-time tasks' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Icon size={12} color={ACCENT} />
              {label}
            </div>
          ))}
        </div>
        {/* Primary CTA */}
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: `0 0 32px ${ACCENT}55` }}
          whileTap={{ scale: 0.97 }}
          onClick={onGetStarted}
          style={{
            background: ACCENT,
            border: 'none',
            borderRadius: 14,
            padding: '16px 44px',
            fontSize: 16,
            fontWeight: 800,
            color: '#fff',
            cursor: 'pointer',
            letterSpacing: 0.5,
            fontFamily: 'inherit',
            boxShadow: `0 0 24px ${ACCENT}44`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          Get your own Corner
          <ArrowRight size={18} />
        </motion.button>
        <a
          href="/corner"
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 1 }}
        >
          Learn more about Corner
        </a>
      </motion.div>
    </div>
  );
}

// --- MAIN DEMO PAGE ---
export default function DemoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [timeLeft, setTimeLeft] = useState(STEP_DURATIONS[0]);
  const [roomName, setRoomName] = useState('');
  const [roomNameSet, setRoomNameSet] = useState(false);
  const timerRef = useRef(null);
  const tickRef = useRef(null);

  const currentStep = STEPS[step];
  const duration = STEP_DURATIONS[step];
  const isLastStep = step === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      setTimeLeft(STEP_DURATIONS[step + 1]);
    }
  }, [step]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      setTimeLeft(STEP_DURATIONS[step - 1]);
    }
  }, [step]);

  // Auto-advance timer
  useEffect(() => {
    if (!autoPlay || isLastStep) return;
    // Skip auto-advance for input step until name is set
    if (currentStep.type === 'room-name' && !roomNameSet) return;

    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);

    setTimeLeft(duration);

    tickRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 100));
    }, 100);

    timerRef.current = setTimeout(() => {
      goNext();
    }, duration);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(tickRef.current);
    };
  }, [step, autoPlay, roomNameSet]);

  const handleNameSet = (name) => {
    setRoomName(name);
    setRoomNameSet(true);
    setTimeout(goNext, 600);
  };

  const handleGetStarted = () => {
    navigate('/book');
  };

  const renderStepContent = () => {
    switch (currentStep.type) {
      case 'title':
        return <StepTitle />;
      case 'room-single':
        return <StepRoomSingle />;
      case 'room-name':
        return <StepRoomName onNameSet={handleNameSet} roomName={roomName} />;
      case 'agent-first':
        return <StepAgentFirst roomName={roomName} />;
      case 'chat':
        return <StepChat roomName={roomName} />;
      case 'rooms-grow':
        return <StepRoomsGrow roomName={roomName} />;
      case 'tasks':
        return <StepTasks />;
      case 'full-dashboard':
        return <StepFullDashboard roomName={roomName} />;
      case 'cta':
        return <StepCTA onGetStarted={handleGetStarted} />;
      default:
        return null;
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
        position: 'relative',
      }}
    >
      {/* Ambient gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Top bar: progress + controls */}
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          padding: '16px 24px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Logo + skip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: `linear-gradient(135deg, ${ACCENT}44, ${ACCENT}22)`,
                border: `1.5px solid ${ACCENT}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={14} color={ACCENT} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>
              Corner
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Auto-play toggle */}
            {!isLastStep && (
              <button
                onClick={() => setAutoPlay((v) => !v)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'inherit',
                }}
              >
                {autoPlay ? <Pause size={11} /> : <Play size={11} />}
                {autoPlay ? 'Pause' : 'Play'}
              </button>
            )}
            {/* Skip to end */}
            {!isLastStep && (
              <button
                onClick={() => setStep(STEPS.length - 1)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'inherit',
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
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* Caption */}
            <div style={{ textAlign: 'center', padding: '28px 24px 0' }}>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  fontSize: 'clamp(22px, 5vw, 36px)',
                  fontWeight: 800,
                  color: '#fff',
                  margin: 0,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
                {currentStep.caption}
              </motion.h2>
              {currentStep.sub && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  style={{
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.45)',
                    margin: '8px 0 0',
                    fontWeight: 400,
                  }}
                >
                  {currentStep.sub}
                </motion.p>
              )}
            </div>

            {/* Step visual content */}
            <div style={{ flex: 1, position: 'relative', padding: '16px 24px' }}>
              {renderStepContent()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          padding: '12px 24px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Back */}
        <button
          onClick={goPrev}
          disabled={step === 0}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '9px 18px',
            cursor: step === 0 ? 'default' : 'pointer',
            color: step === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)',
            fontSize: 13,
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          Back
        </button>

        {/* Step counter */}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
          {step + 1} / {STEPS.length}
        </span>

        {/* Next / CTA */}
        {!isLastStep ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            style={{
              background: ACCENT,
              border: 'none',
              borderRadius: 10,
              padding: '9px 20px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: `0 0 16px ${ACCENT}44`,
            }}
          >
            Next
            <ChevronRight size={14} />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGetStarted}
            style={{
              background: ACCENT,
              border: 'none',
              borderRadius: 10,
              padding: '9px 20px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: `0 0 16px ${ACCENT}44`,
            }}
          >
            Get started
            <ArrowRight size={14} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
