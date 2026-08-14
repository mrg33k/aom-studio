import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, ChevronDown, Play, RotateCcw,
  Globe, FileText, Search, Cpu, BookOpen, Pen,
  Monitor, Smartphone,
} from 'lucide-react'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

// Corner V3 color palette (self-contained copy — do not wire to production)
const C = {
  bg:       '#06090F',
  bg2:      '#0B1018',
  s1:       '#111827',
  s2:       '#1A2035',
  s3:       '#222942',
  border:   'rgba(255,255,255,0.04)',
  border2:  'rgba(255,255,255,0.08)',
  text:     '#F1F5F9',
  text2:    '#94A3B8',
  muted:    '#475569',
  dim:      '#334155',
  accent:   '#10B981',
  accent2:  '#34D399',
  accentBg: 'rgba(16,185,129,0.08)',
  yellow:   '#EAB308',
  blue:     '#60A5FA',
  purple:   '#A78BFA',
  pink:     '#F472B6',
  orange:   '#FB923C',
  red:      '#EF4444',
}

// CSS keyframes injected once
const KEYFRAMES = `
  @keyframes breathe {
    0%, 100% { transform: scale(0.8); opacity: 0.55; box-shadow: 0 0 0 0 rgba(16,185,129,0); }
    50%       { transform: scale(1.25); opacity: 1;    box-shadow: 0 0 0 5px rgba(16,185,129,0.12); }
  }
  @keyframes breathe-yellow {
    0%, 100% { transform: scale(0.8); opacity: 0.55; box-shadow: 0 0 0 0 rgba(234,179,8,0); }
    50%       { transform: scale(1.25); opacity: 1;    box-shadow: 0 0 0 5px rgba(234,179,8,0.12); }
  }
  @keyframes breathe-purple {
    0%, 100% { transform: scale(0.8); opacity: 0.55; box-shadow: 0 0 0 0 rgba(167,139,250,0); }
    50%       { transform: scale(1.25); opacity: 1;    box-shadow: 0 0 0 5px rgba(167,139,250,0.12); }
  }
  @keyframes dot-march {
    0%   { background-position: 0 0; }
    100% { background-position: 0 10px; }
  }
  @keyframes pulse-travel {
    0%   { top: -40%; opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 1; }
    100% { top: 140%; opacity: 0; }
  }
  @keyframes typing-dot {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40%           { transform: scale(1.1); opacity: 1; }
  }
  @keyframes settle-glow {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes detail-open {
    from { opacity: 0; max-height: 0; padding-top: 0; }
    to   { opacity: 1; max-height: 72px; padding-top: 6px; }
  }
  .r65-step-enter { animation: settle-glow 0.25s ease both; }
  .r65-answer-enter { animation: settle-glow 0.45s ease both; }
  .r65-detail { animation: detail-open 0.18s ease both; overflow: hidden; }
  .r65-scroll::-webkit-scrollbar { width: 4px; }
  .r65-scroll::-webkit-scrollbar-track { background: transparent; }
  .r65-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }

  .r65-answer-md { font-size: 14px; color: #F1F5F9; font-family: 'Space Grotesk', sans-serif; line-height: 1.6; }
  .r65-answer-md p { margin: 0 0 10px; }
  .r65-answer-md p:last-child { margin-bottom: 0; }
  .r65-answer-md p:first-child { font-size: 15px; font-weight: 400; line-height: 1.5; }
  .r65-answer-md strong { color: #F1F5F9; font-weight: 600; }
  .r65-answer-md a { color: #60A5FA; text-decoration: none; }
  .r65-answer-md a:hover { text-decoration: underline; }
  .r65-answer-md ul, .r65-answer-md ol { margin: 8px 0; padding-left: 20px; }
  .r65-answer-md li { margin-bottom: 5px; }
  .r65-answer-md h1, .r65-answer-md h2, .r65-answer-md h3 { font-size: 14px; font-weight: 600; margin: 0 0 8px; color: #F1F5F9; }
  @media (max-width: 480px) {
    .r65-answer-md { font-size: 13px; }
    .r65-answer-md p:first-child { font-size: 14px; }
  }
`

// ─── Demo scripts ──────────────────────────────────────────────────────────────

const SCRIPTS = {
  short: {
    label: 'Short',
    steps_count: 4,
    agentName: 'Bobby',
    agentColor: C.yellow,
    breatheAnim: 'breathe-yellow',
    query: 'What does the phonebook say about Corner?',
    steps: [
 { id: 'a1', label: 'Reading context', Icon: BookOpen, detail: 'projects/corner/VISION.md, 4 KB' },
 { id: 'a2', label: 'Searching the web', Icon: Globe, detail: 'manny.chat, claude.ai, 3 pages scanned' },
      { id: 'a3', label: 'Analyzing patterns', Icon: Cpu,       detail: '7 UI patterns matched across sources' },
 { id: 'a4', label: 'Composing response', Icon: Pen, detail: 'Draft v1 ready, 180 words' },
    ],
    timing:   [1300, 2700, 4200, 5500],
    settleAt: 6400,
 answer: "Corner uses a **live-thread model** where every thinking step is visible as it happens.\n\nThe key insight from Manny and Claude Coworker: visible steps create trust. The chain should breathe, active steps pulse while completed ones recede quietly.",
  },
  medium: {
    label: 'Medium',
    steps_count: 5,
    agentName: 'Rex',
    agentColor: C.accent,
    breatheAnim: 'breathe',
    query: 'Review the R65 proposal and recommend a connector style.',
    steps: [
 { id: 'b1', label: 'Reading phonebook', Icon: BookOpen, detail: 'AOM-EA/phonebook.md, 247 agents indexed' },
 { id: 'b2', label: 'Opening files', Icon: FileText, detail: 'projects/corner/R65.md, 26 KB, architecture ratified' },
 { id: 'b3', label: 'Searching the web', Icon: Globe, detail: 'Claude Coworker, Manny.chat, step-chain patterns' },
      { id: 'b4', label: 'Running analysis',   Icon: Cpu,       detail: '3 connector styles evaluated against 6 criteria' },
      { id: 'b5', label: 'Writing draft',      Icon: Pen,       detail: 'Recommendation: pulsing connector as default' },
    ],
    timing:   [1100, 2400, 3900, 5400, 7100],
    settleAt: 8300,
 answer: "**Recommendation: pulsing connector** as default with fade settle.\n\nDotted lines carry a TCP/IP 'waiting' signal that conflicts with agentic flow. Solid lines read as finished/static. The pulsing segment maps to how computation actually feels, signal flowing through a circuit.",
  },
  long: {
    label: 'Long',
    steps_count: 6,
    agentName: 'Steffen',
    agentColor: C.purple,
    breatheAnim: 'breathe-purple',
    query: 'Full audit of the Corner live-thread proposal. Give me a design brief.',
    steps: [
 { id: 'c1', label: 'Reading project brief', Icon: BookOpen, detail: 'R65.md, architecture: message_steps + Supabase realtime' },
 { id: 'c2', label: 'Scanning codebase', Icon: FileText, detail: 'src/dashboard/components/cv3/, 18 files, 4 200 lines' },
 { id: 'c3', label: 'Searching web', Icon: Globe, detail: 'openai.com, linear.app, manny.chat, competitor UX' },
      { id: 'c4', label: 'Analyzing competitor patterns',Icon: Search,    detail: 'Manny: 4px dot + 1px line; Claude: fade-in cards; Linear: pills' },
 { id: 'c5', label: 'Cross-referencing vision', Icon: Cpu, detail: 'VISION.md ¶7, "Chat is a live thread with visible thinking steps"' },
 { id: 'c6', label: 'Writing design brief', Icon: Pen, detail: '3 connectors + 2 settle variants + mobile spec, complete' },
    ],
    timing:   [900, 2000, 3500, 5600, 7800, 10200],
    settleAt: 11500,
 answer: "**Full design brief, ready for R65-impl.**\n\n- **Connector:** pulsing as primary, most 'alive' feel, avoids waiting-signal confusion\n- **Settle:** fade as default; collapse for dense analytical threads\n- **Mobile:** vertical connectors stay vertical, tighten step height to 36 px\n- **Working dot:** 8 px, agent color, 2 s breathe cycle\n- **Done steps:** dim to 45% with checkmark; tap expands inline detail",
  },
}

// ─── Connector Line ────────────────────────────────────────────────────────────

function ConnectorLine({ connectorStyle, isActive, isDone, agentColor, height }) {
  const baseColor = isDone ? C.dim : C.border2

  if (connectorStyle === 'solid') {
    return (
      <div style={{
        width: 1,
        height: height || 20,
        background: isActive ? agentColor : baseColor,
        transition: 'background 0.5s ease',
        borderRadius: 1,
      }} />
    )
  }

  if (connectorStyle === 'dotted') {
    const dotColor = isActive ? agentColor : (isDone ? C.dim : C.muted)
    return (
      <div style={{
        width: 1,
        height: height || 20,
        backgroundImage: `repeating-linear-gradient(to bottom, ${dotColor} 0px, ${dotColor} 3px, transparent 3px, transparent 7px)`,
        animation: isActive ? 'dot-march 0.35s linear infinite' : 'none',
        transition: 'background-image 0.4s ease',
        borderRadius: 1,
      }} />
    )
  }

  // pulsing
  return (
    <div style={{
      width: 1,
      height: height || 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Base line */}
      <div style={{ position: 'absolute', inset: 0, background: baseColor, transition: 'background 0.4s ease' }} />
      {/* Traveling pulse */}
      {isActive && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          height: '35%',
          background: `linear-gradient(to bottom, transparent, ${agentColor}, transparent)`,
          animation: 'pulse-travel 1.1s ease-in-out infinite',
          willChange: 'top',
        }} />
      )}
    </div>
  )
}

// ─── Connector row (sits between step rows) ────────────────────────────────────

function ConnectorRow({ connectorStyle, isActive, isDone, agentColor }) {
  return (
    <div style={{ display: 'flex', height: 18 }}>
      <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <ConnectorLine
          connectorStyle={connectorStyle}
          isActive={isActive}
          isDone={isDone}
          agentColor={agentColor}
          height={18}
        />
      </div>
      <div style={{ flex: 1 }} />
    </div>
  )
}

// ─── Step Row ─────────────────────────────────────────────────────────────────

function StepRow({ step, state, agentColor, breatheAnim, settled }) {
  const [expanded, setExpanded] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(null)
  const activatedAt = useRef(null)

  useEffect(() => {
    if (state === 'active') {
      activatedAt.current = Date.now()
      setElapsedMs(null)
    }
    if ((state === 'done') && activatedAt.current) {
      setElapsedMs(Date.now() - activatedAt.current)
    }
  }, [state])

  // Reset expansion on re-run
  useEffect(() => {
    if (state === 'pending') setExpanded(false)
  }, [state])

  const isDone    = state === 'done'
  const isActive  = state === 'active'
  const isPending = state === 'pending'

  const Icon = step.Icon

  const dotOpacity = isPending ? 0.25 : 1

  return (
    <div className="r65-step-enter">
      {/* Main row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          minHeight: 28,
          cursor: isDone ? 'pointer' : 'default',
          borderRadius: 6,
          padding: '1px 4px 1px 0',
          transition: 'background 0.12s ease',
        }}
        onMouseEnter={e => { if (isDone) e.currentTarget.style.background = C.s2 }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        onClick={() => isDone && setExpanded(v => !v)}
      >
        {/* Dot */}
        <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: isDone ? 6 : isActive ? 8 : 6,
            height: isDone ? 6 : isActive ? 8 : 6,
            borderRadius: '50%',
            background: isDone ? C.dim : isActive ? agentColor : C.border2,
            opacity: dotOpacity,
            transition: 'all 0.3s ease',
            animation: isActive ? `${breatheAnim} 2s ease-in-out infinite` : 'none',
            flexShrink: 0,
          }}>
            {isDone && (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={4} style={{ color: C.muted }} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>

        {/* Label */}
        <div style={{ flex: 1, paddingLeft: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isDone && (
            <Icon
              size={10}
              style={{
                color: isActive ? agentColor : C.dim,
                flexShrink: 0,
                transition: 'color 0.3s ease',
              }}
            />
          )}
          <span style={{
            fontSize: 12,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: isActive ? 500 : 400,
            color: isPending ? C.dim : isDone ? C.muted : agentColor,
            lineHeight: 1.4,
            transition: 'color 0.35s ease',
          }}>
            {step.label}
          </span>
        </div>

        {/* Elapsed / expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingLeft: 8 }}>
          {elapsedMs !== null && (
            <span style={{
              fontSize: 10,
              color: C.dim,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`}
            </span>
          )}
          {isDone && (
            <ChevronDown
              size={10}
              style={{
                color: C.dim,
                transition: 'transform 0.18s ease',
                transform: expanded ? 'rotate(180deg)' : 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Inline detail */}
      {expanded && (
        <div
          className="r65-detail"
          style={{
            paddingLeft: 28,
            paddingBottom: 4,
          }}
        >
          <span style={{
            fontSize: 11,
            color: C.text2,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.5,
            display: 'block',
          }}>
            {step.detail}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Typing indicator (before first step) ─────────────────────────────────────

function TypingIndicator({ agentColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 5, height: 5,
            borderRadius: '50%',
            background: agentColor,
            animation: `typing-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Thread Mockup ─────────────────────────────────────────────────────────────

function ThreadMockup({ script, connectorStyle, settleStyle, runState, stepStates }) {
  const [stepsOpen, setStepsOpen] = useState(true)

  const isRunning = runState === 'running'
  const isSettled = runState === 'settled'
  const isActive  = isRunning || isSettled

  // Reset collapse state on new run
  useEffect(() => {
    if (runState === 'idle') setStepsOpen(true)
    if (runState === 'running') setStepsOpen(true)
  }, [runState])

  const showTypingDots = isRunning && stepStates.length > 0 && stepStates[0] === 'pending'
  const showChain      = isActive && stepStates.length > 0 && stepStates[0] !== 'pending'

  const stepsOpacity = isSettled && settleStyle === 'fade' ? 0.38 : 1
  const stepsCollapsed = isSettled && settleStyle === 'collapse' && !stepsOpen

  return (
    <div style={{
      background: C.s1,
      border: `1px solid ${C.border2}`,
      borderRadius: 12,
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Thread header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: `${script.agentColor}1A`,
          border: `1px solid ${script.agentColor}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 11,
            color: script.agentColor,
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {script.agentName[0]}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>
            {script.agentName}
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
            {!isActive ? 'Ready' : isSettled ? 'Settled' : 'Working…'}
          </div>
        </div>

        {/* Status dot */}
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isSettled ? C.dim : script.agentColor,
              animation: isRunning ? `${script.breatheAnim} 2s ease-in-out infinite` : 'none',
              transition: 'background 0.4s ease',
            }} />
            <span style={{
              fontSize: 10,
              fontFamily: "'Space Grotesk', sans-serif",
              color: isSettled ? C.muted : script.agentColor,
              transition: 'color 0.4s ease',
            }}>
              {isSettled ? 'done' : 'working'}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="r65-scroll" style={{ padding: '14px 14px', maxHeight: 520, overflowY: 'auto' }}>

        {/* User query */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <div style={{
            background: C.s2,
            border: `1px solid ${C.border2}`,
            borderRadius: '10px 10px 2px 10px',
            padding: '8px 12px',
            maxWidth: '82%',
          }}>
            <span style={{
              fontSize: 13,
              color: C.text,
              fontFamily: "'Space Grotesk', sans-serif",
              lineHeight: 1.55,
            }}>
              {script.query}
            </span>
          </div>
        </div>

        {/* Agent response */}
        {isActive && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {/* Agent dot */}
            <div style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: script.agentColor,
              flexShrink: 0,
              marginTop: 6,
              transition: 'opacity 0.3s ease',
            }} />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Typing dots */}
              {showTypingDots && <TypingIndicator agentColor={script.agentColor} />}

              {/* Step chain */}
              {showChain && (
                <div style={{
                  opacity: stepsOpacity,
                  transition: 'opacity 0.65s ease',
                  overflow: stepsCollapsed ? 'hidden' : 'visible',
                  maxHeight: stepsCollapsed ? 32 : 9999,
                  transitionProperty: 'opacity, max-height',
                }}>
                  {script.steps.map((step, i) => {
                    const state = stepStates[i] || 'pending'
                    const prevState = i > 0 ? (stepStates[i - 1] || 'pending') : 'done'
                    const connectorActive = state === 'active' || prevState === 'active'
                    const connectorDone   = prevState === 'done' && state === 'done'

                    return (
                      <React.Fragment key={step.id}>
                        {i > 0 && (
                          <ConnectorRow
                            connectorStyle={connectorStyle}
                            isActive={connectorActive}
                            isDone={connectorDone}
                            agentColor={script.agentColor}
                          />
                        )}
                        <StepRow
                          step={step}
                          state={state}
                          agentColor={script.agentColor}
                          breatheAnim={script.breatheAnim}
                          settled={isSettled}
                        />
                      </React.Fragment>
                    )
                  })}
                </div>
              )}

              {/* Collapse toggle */}
              {isSettled && settleStyle === 'collapse' && showChain && (
                <button
                  onClick={() => setStepsOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none',
                    cursor: 'pointer',
                    color: C.muted,
                    fontSize: 11,
                    fontFamily: "'Space Grotesk', sans-serif",
                    padding: '4px 0',
                    marginTop: 2,
                    marginBottom: 8,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.text2}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}
                >
                  <ChevronDown
                    size={11}
                    style={{ transition: 'transform 0.2s ease', transform: stepsOpen ? 'rotate(180deg)' : 'none' }}
                  />
                  {stepsOpen ? 'Hide steps' : `See ${script.steps.length} steps`}
                </button>
              )}

              {/* Final answer */}
              {isSettled && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    marginTop: settleStyle === 'fade' ? 20 : 12,
                    border: `1px solid ${C.border2}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    className="r65-answer-md"
                    dangerouslySetInnerHTML={{ __html: marked.parse(script.answer) }}
                  />
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Idle placeholder */}
        {!isActive && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 80,
            color: C.dim,
            fontSize: 12,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Press Play to begin
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Control Pill Button ───────────────────────────────────────────────────────

function Pill({ label, active, accentColor, onClick, icon: Icon }) {
  const color = accentColor || C.accent
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: '3px 11px',
        borderRadius: 20,
        background: active ? color : C.s1,
        color: active ? C.bg : C.text2,
        border: `1px solid ${active ? color : C.border2}`,
        cursor: 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: active ? 600 : 400,
        transition: 'all 0.14s ease',
        display: 'flex', alignItems: 'center', gap: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {Icon && <Icon size={10} />}
      {label}
    </button>
  )
}

// ─── Info Card ─────────────────────────────────────────────────────────────────

function InfoCard({ title, desc, highlight, active }) {
  return (
    <div style={{
      background: active ? C.s2 : C.s1,
      border: `1px solid ${active ? C.border2 : C.border}`,
      borderRadius: 10,
      padding: '14px 16px',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: active ? highlight : C.text2,
        marginBottom: 5,
        fontFamily: "'Space Grotesk', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        transition: 'color 0.3s ease',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 12,
        color: C.muted,
        lineHeight: 1.55,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {desc}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function R65LiveThread() {
  const [connectorStyle, setConnectorStyle] = useState('pulsing')
  const [settleStyle,    setSettleStyle]    = useState('fade')
  const [scriptKey,      setScriptKey]      = useState('medium')
  const [mobileView,     setMobileView]     = useState(false)

  const [runState,   setRunState]   = useState('idle')
  const [stepStates, setStepStates] = useState([])

  const timers = useRef([])

  const script = SCRIPTS[scriptKey]

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setRunState('idle')
    setStepStates([])
  }, [clearTimers])

  const play = useCallback(() => {
    clearTimers()

    const states = script.steps.map(() => 'pending')
    states[0] = 'active'
    setStepStates([...states])
    setRunState('running')

    script.timing.forEach((ms, i) => {
      const t = setTimeout(() => {
        states[i] = 'done'
        if (i + 1 < states.length) states[i + 1] = 'active'
        setStepStates([...states])
      }, ms)
      timers.current.push(t)
    })

    const tSettle = setTimeout(() => setRunState('settled'), script.settleAt)
    timers.current.push(tSettle)
  }, [script, clearTimers])

  // Reset when switching scripts
  useEffect(() => { reset() }, [scriptKey])
  useEffect(() => () => clearTimers(), [clearTimers])

  const isRunning = runState === 'running'
  const isSettled = runState === 'settled'

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <style>{KEYFRAMES}</style>

      {/* ── Page header ── */}
      <div style={{
        borderBottom: `1px solid ${C.border2}`,
        padding: '18px 24px',
        background: C.bg,
      }}>
        <div style={{
          maxWidth: 980,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{
              fontSize: 10,
              color: C.dim,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Design exploration · R65 · Corner
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              color: C.text,
              letterSpacing: '-0.015em',
              lineHeight: 1.2,
            }}>
              Live Thread
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 10,
              color: C.dim,
              fontFamily: "'Space Grotesk', sans-serif",
              background: C.s1,
              border: `1px solid ${C.border2}`,
              borderRadius: 6,
              padding: '3px 8px',
            }}>
              Not wired to production · R65-impl comes next
            </span>
          </div>
        </div>
      </div>

      {/* ── Control bar ── */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '10px 24px',
        background: C.bg2,
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{
          maxWidth: 980,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
        }}>

          {/* Connector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connector</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['solid', 'dotted', 'pulsing'].map(s => (
                <Pill key={s} label={s} active={connectorStyle === s} accentColor={C.accent} onClick={() => setConnectorStyle(s)} />
              ))}
            </div>
          </div>

          {/* Settle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Settle</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['fade', 'collapse'].map(s => (
                <Pill key={s} label={s} active={settleStyle === s} accentColor={C.purple} onClick={() => setSettleStyle(s)} />
              ))}
            </div>
          </div>

          {/* Script */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Script</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(SCRIPTS).map(([key, s]) => (
                <Pill key={key} label={`${s.label} (${s.steps_count})`} active={scriptKey === key} accentColor={C.blue} onClick={() => setScriptKey(key)} />
              ))}
            </div>
          </div>

          {/* View */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>View</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Pill label="Desktop" active={!mobileView} accentColor={C.yellow} onClick={() => setMobileView(false)} icon={Monitor} />
              <Pill label="Mobile"  active={mobileView}  accentColor={C.yellow} onClick={() => setMobileView(true)}  icon={Smartphone} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={reset}
              style={{
                fontSize: 12, padding: '5px 14px', borderRadius: 8,
                background: C.s1, color: C.text2,
                border: `1px solid ${C.border2}`,
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.14s ease',
              }}
            >
              <RotateCcw size={11} />
              Reset
            </button>
            <button
              onClick={play}
              disabled={isRunning}
              style={{
                fontSize: 12, padding: '5px 16px', borderRadius: 8,
                background: isRunning ? `${C.accent}55` : C.accent,
                color: isRunning ? C.bg2 : C.bg,
                border: 'none',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                display: 'flex', alignItems: 'center', gap: 5,
                fontWeight: 600,
                transition: 'all 0.14s ease',
              }}
            >
              <Play size={11} fill={isRunning ? C.bg2 : C.bg} strokeWidth={0} />
              {isRunning ? 'Running…' : isSettled ? 'Replay' : 'Play'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Demo canvas ── */}
      <div style={{ padding: '36px 24px 60px', maxWidth: 980, margin: '0 auto' }}>

        {/* Active variant label */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>Viewing</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, fontFamily: "'Space Grotesk', sans-serif" }}>{connectorStyle}</span>
          <span style={{ fontSize: 11, color: C.dim }}>connector ·</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.purple, fontFamily: "'Space Grotesk', sans-serif" }}>{settleStyle}</span>
          <span style={{ fontSize: 11, color: C.dim }}>settle ·</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.blue, fontFamily: "'Space Grotesk', sans-serif" }}>{script.label.toLowerCase()} script</span>
          <span style={{ fontSize: 11, color: C.dim }}>({script.steps.length} steps,</span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }}>{script.agentName})</span>
        </div>

        {/* Thread + optional phone frame */}
        <div style={{
          display: 'flex',
          justifyContent: mobileView ? 'center' : 'flex-start',
        }}>
          {mobileView ? (
            /* Phone frame */
            <div style={{
              width: 390,
              maxWidth: '100%',
              borderRadius: 44,
              overflow: 'hidden',
              border: `2px solid ${C.border2}`,
              background: C.bg2,
              boxShadow: `0 0 0 6px ${C.bg}, 0 0 0 8px ${C.border2}`,
              padding: '20px 0 20px',
            }}>
              {/* Notch */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <div style={{
                  width: 80, height: 6,
                  borderRadius: 3,
                  background: C.border2,
                }} />
              </div>
              <div style={{ padding: '0 12px' }}>
                <ThreadMockup
                  script={script}
                  connectorStyle={connectorStyle}
                  settleStyle={settleStyle}
                  runState={runState}
                  stepStates={stepStates}
                />
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: 560 }}>
              <ThreadMockup
                script={script}
                connectorStyle={connectorStyle}
                settleStyle={settleStyle}
                runState={runState}
                stepStates={stepStates}
              />
            </div>
          )}
        </div>

        {/* State guide cards */}
        <div style={{
          marginTop: 48,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          <InfoCard
            title="Working state"
            desc="Active step dot breathes at 2 s. Connector to active step animates. Previous steps are checked and dimmed to 45% opacity."
            highlight={C.accent}
            active={isRunning && !isSettled}
          />
          <InfoCard
 title={`Settled, ${settleStyle}`}
            desc={
              settleStyle === 'fade'
                ? 'Steps fade to 38% opacity. Final answer becomes the visual anchor below the chain.'
                : 'Steps collapse under the answer. "See N steps" toggle expands the work.'
            }
            highlight={C.purple}
            active={isSettled}
          />
          <InfoCard
            title="Tap a settled step"
 desc="Tap any completed step to reveal inline detail, file path, URL, or data note. Expands in-place, no modal."
            highlight={C.blue}
            active={false}
          />
          <InfoCard
            title="Mobile (390 × 844)"
            desc="Connectors stay vertical with tighter 18 px spacing. Step height is 28 px min. Typing indicator works at any width."
            highlight={C.yellow}
            active={mobileView}
          />
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48,
          paddingTop: 20,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>
            R65 design exploration · task 893834e1 · aheadofmarket.com/design/r65-live-thread
          </span>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: "'Space Grotesk', sans-serif" }}>
            R65-impl wires message_steps + Supabase realtime
          </span>
        </div>
      </div>
    </div>
  )
}