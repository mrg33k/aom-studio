import React, { useState, useEffect } from 'react'
import { supabase } from '../dashboard/lib/supabase.js'

// ─────────────────────────────────────────────────────────────────────────────
// AI Hours Learning Center
// Route: /ai-hours
// Two views:
//   AOM Team (authenticated): full facilitator view with all sessions + client mgmt
//   Client (access code): session progress view for their current engagement
// ─────────────────────────────────────────────────────────────────────────────

const AOM_ORANGE = '#E85D26'
const AOM_ORANGE_LIGHT = '#F47A48'
const AOM_ORANGE_PALE = '#FFF1EB'
const CREAM = '#FAFAF8'
const CREAM_WARM = '#F5F0EB'
const INK = '#1A1A16'
const INK_SOFT = '#3A3834'
const INK_MUTED = '#6A6660'
const BORDER = '#E8E2D8'
const BORDER_SOFT = '#F0EBE3'
const GREEN_CHECK = '#2D7A4F'
const LOCK_GRAY = '#B8B2A8'

// ─── Session Data ─────────────────────────────────────────────────────────────

const SESSIONS = [
  {
    number: '01',
    title: 'Discovery + First Contact',
    goal: 'Understand the client\'s world. Get Claude running. Land the first win.',
    duration: '2 hours',
    leaveWith: 'Claude installed, one working tool, the mental model',
    description: `The first session is about orientation — yours and theirs. You're learning their business; they're learning that AI isn't scary. Your job is to make them feel a win before the session ends.`,
    clientNotes: `We'll start by mapping out how you work today — the tools, the workflows, the moments that eat your time. Then we'll get Claude set up on your machine and build your first working tool together. You'll leave with something you can actually use tomorrow.`,
    facilitatorNotes: {
      prep: [
        'Review any onboarding questionnaire they completed',
        'Research their industry for 15 minutes — know the vocabulary',
        'Have Claude ready to demonstrate',
        'Prepare 2-3 example prompts relevant to their business type',
      ],
      keyQuestions: [
        'Walk me through a typical Tuesday. What are you doing, what tools are you using?',
        'What\'s the one thing you repeat most often that you wish you didn\'t have to?',
        'Have you tried AI before? What happened?',
        'If this works perfectly, what does your workday look like in 6 months?',
      ],
      commonStalls: [
        {
          stall: 'They\'re skeptical about AI hype',
          handle: 'Validate it. "The hype is real — and most of it doesn\'t apply to you. Here\'s what actually helps." Then demo something specific to their work.',
        },
        {
          stall: 'They want to talk strategy before doing anything',
          handle: 'Get them to do something in the first 20 minutes. "Let\'s just try one thing real quick, then we\'ll plan." The tool demo creates belief; the belief unlocks the plan.',
        },
        {
          stall: 'Their first tool attempt fails or looks wrong',
          handle: 'Make it a teaching moment, not a failure. "This is actually great — it\'s showing us exactly what we need to adjust. Here\'s why..."',
        },
      ],
      homework: [
        'Use the tool you built at least 3 times before we meet again',
        'Write down every moment this week where you think "I should ask Claude about this"',
        'Come back with 2-3 workflows you want to tackle next session',
      ],
    },
  },
  {
    number: '02',
    title: 'Mapping the Business Brain',
    goal: 'Map every workflow. Build their CLAUDE.md brain doc. Rank the top 3 tools to build.',
    duration: '2 hours',
    leaveWith: 'Full workflow map, working CLAUDE.md, Tool 1+2 specs',
    description: `Session 2 is the architecture session. You're building the map of their business — every workflow, every pain point, every repeating task. The output is a CLAUDE.md document that becomes their AI operating system's brain: context about the business that Claude will reference on every interaction.`,
    clientNotes: `We're building your AI's brain today. This is a document that tells Claude everything it needs to know about your business — your voice, your processes, your clients, your shortcuts. Once it's built, every Claude interaction gets smarter because it already knows the context.`,
    facilitatorNotes: {
      prep: [
        'Review homework from Session 1 — what did they actually use?',
        'Have a CLAUDE.md template ready to build live with them',
        'Prepare workflow mapping framework (sticky notes or digital whiteboard)',
        'Know their homework responses before the session',
      ],
      keyQuestions: [
        'What did you use the tool for this week? What worked, what felt off?',
        'Let\'s map everything you do. Walk me through every type of task you handle in a week.',
        'What information would Claude need to know about your business to be actually useful?',
        'Of everything we mapped, what would have the biggest impact if it was faster or automated?',
      ],
      commonStalls: [
        {
          stall: 'They haven\'t done the homework',
          handle: 'Don\'t skip it — improvise. "Let\'s do the usage review right now, live. Tell me about the last 3 things you worked on this week."',
        },
        {
          stall: 'The workflow map becomes overwhelming',
          handle: 'Focus on the 20% that creates 80% of the friction. "We don\'t need to solve everything. What\'s the thing that would help the most people you work with, right now?"',
        },
        {
          stall: 'They don\'t know what to put in CLAUDE.md',
          handle: 'Interview mode. Ask about their best client, their typical email tone, their business values, their most common deliverable. You write; they talk.',
        },
      ],
      homework: [
        'Read through the CLAUDE.md you built together — add anything that feels missing',
        'Start every Claude session this week with your CLAUDE.md as context',
        'Come back with your real reaction to Tool 1 and 2 specs — is this actually what you want built?',
      ],
    },
  },
  {
    number: '03',
    title: 'Build Tool 1',
    goal: 'Build the first real business tool together. Document it.',
    duration: '2 hours',
    leaveWith: 'Working Tool 1 with Tool Card documentation, confidence to run it solo',
    description: `Session 3 is where the OS starts coming to life. You're building Tool 1 — the highest-impact, most immediately useful AI workflow for their specific business. You're also introducing Tool Cards: simple documentation that lets them run (and eventually teach) each tool without you.`,
    clientNotes: `We're building Tool 1 today — your highest-priority AI workflow, built specifically for how you work. By the end of this session, you'll have something running that you can use on your own, plus a simple one-page reference so you never forget how to run it.`,
    facilitatorNotes: {
      prep: [
        'Have the Tool 1 spec from Session 2 ready to reference',
        'Pre-test any technical components so you\'re not troubleshooting live',
        'Prepare a Tool Card template',
        'Know the likely failure modes of this specific tool type',
      ],
      keyQuestions: [
        'Before we build — did the spec from last session still feel right, or has anything changed?',
        'When you imagine using this daily, what does the input look like? Let\'s start real.',
        'What would make this tool feel like cheating?',
        'Who else in your team or life might use this?',
      ],
      commonStalls: [
        {
          stall: 'Tool 1 scope creep during the build',
          handle: 'Protect the original spec. "Let\'s get the core version working perfectly first. We\'ll add the advanced version in Tool 2 or a follow-up session."',
        },
        {
          stall: 'Technical friction slows down the build',
          handle: 'Timebox debugging. If you can\'t fix it in 10 minutes, move to an alternative approach. Ship something working.',
        },
        {
          stall: 'They want to test edge cases endlessly',
          handle: 'Good instinct, wrong moment. "Let\'s get this working for the 80% case first, document it, then we\'ll stress test. We have Tool 2 to build."',
        },
      ],
      homework: [
        'Run Tool 1 at least 5 times before we meet again',
        'Note anything that breaks or feels wrong — we\'ll refine in Session 5',
        'Try explaining the tool to one person in your life — teaching locks in learning',
      ],
    },
  },
  {
    number: '04',
    title: 'Build Tool 2 + Connect the Dots',
    goal: 'Second tool, first connected workflow, OS starting to take shape.',
    duration: '2 hours',
    leaveWith: 'Tool 2 complete, first workflow sequence running, OS sketch',
    description: `Session 4 is where individual tools become a system. You\'re building Tool 2 and — for the first time — connecting tools into a workflow sequence. The client starts to see what an AI Operating System actually looks like when the parts work together.`,
    clientNotes: `Today we build Tool 2 and start connecting your tools into actual workflows. Instead of individual tricks, you\'ll start to see the bigger picture: a sequence of AI-powered steps that runs the parts of your business that used to run you.`,
    facilitatorNotes: {
      prep: [
        'Review Tool 1 usage since Session 3 — where did it work, where did it break?',
        'Have Tool 2 spec ready',
        'Think through the connection point between Tool 1 and Tool 2',
        'Sketch a simple OS diagram to show visually at the end',
      ],
      keyQuestions: [
        'Tell me everything about using Tool 1 this week. Good and bad.',
        'Does Tool 2 still feel like the right next priority?',
        'Where do these two tools naturally connect in your actual workflow?',
        'When you imagine your AI OS being "done" — what does it look like? How many tools, roughly?',
      ],
      commonStalls: [
        {
          stall: 'Tool 1 had problems they didn\'t fix',
          handle: 'Fix it now, briefly. "Let\'s spend 15 minutes getting this right before we build on top of it. A shaky Tool 1 makes everything harder."',
        },
        {
          stall: 'They\'re not sure how the tools connect',
          handle: 'Work backwards from their actual workflow. "Show me what you do with Tool 1\'s output. What\'s the next step after that?" The connection usually becomes obvious.',
        },
        {
          stall: 'Ambition spike — they want to plan 10 more tools',
          handle: 'Great sign. Capture the ideas, stay focused. "I\'m writing all of this down. Let\'s finish Tool 2 and the workflow, then we\'ll do the big planning in Session 5."',
        },
      ],
      homework: [
        'Run the full workflow sequence at least 3 times',
        'Start a list of Tool 3, 4, 5 — what\'s the ideal next layer?',
        'Bring real examples of work from this week to Session 5 — we\'ll review the OS in action',
      ],
    },
  },
  {
    number: '05',
    title: 'Operating System Review + Path Forward',
    goal: 'Take stock of everything. Make a clear path forward recommendation.',
    duration: '2 hours',
    leaveWith: 'Full OS review doc, clear next step (more sessions / retainer / Corner / solo)',
    description: `Session 5 is the graduation session. You\'re reviewing what was built, celebrating progress, identifying gaps, and making an honest recommendation for what comes next — whether that\'s more sessions, a retainer arrangement, Corner access, or flying solo. The client leaves with a complete picture and a clear path.`,
    clientNotes: `Today we review everything you\'ve built and where you want to take it. You\'ll leave with a complete picture of your AI Operating System: what\'s working, what\'s next, and a honest recommendation from us on the best way to keep building on what we started.`,
    facilitatorNotes: {
      prep: [
        'Compile a full summary of what was built across all 5 sessions',
        'Review the CLAUDE.md for completeness — fill any gaps',
        'Have the OS Review document template ready',
        'Prepare your honest next-step recommendation (more sessions / retainer / Corner / solo)',
        'Know current Corner pricing and what a retainer looks like',
      ],
      keyQuestions: [
        'Walk me through your week. Where did the AI OS show up? Where was it absent?',
        'What surprised you most about these 5 sessions?',
        'If you had 5 more sessions, what would you build?',
        'What would "done" feel like for you — and what does your business need to get there?',
      ],
      commonStalls: [
        {
          stall: 'They want to keep the momentum but aren\'t sure what comes next',
          handle: 'Make the recommendation clear and concrete. Don\'t let them float. "Based on what I\'ve seen, here\'s what I\'d do: [specific option]. Here\'s why."',
        },
        {
          stall: 'They feel like they didn\'t get enough done',
          handle: 'Reframe the win. Show the OS review doc. "Look at everything you\'ve built and learned in 10 hours. That\'s real leverage." Then show the path forward.',
        },
        {
          stall: 'They want to decide on next steps later',
          handle: 'That\'s fine — but give them the framework to decide. Send the OS review doc after the session with clear options. Follow up in one week.',
        },
      ],
      homework: null,
    },
  },
]

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    background: CREAM,
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    color: INK,
  },
  header: {
    background: '#fff',
    borderBottom: `1px solid ${BORDER}`,
    padding: '0',
  },
  headerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontSize: 22,
    fontWeight: 400,
    color: INK,
    letterSpacing: '-0.01em',
  },
  logoAccent: {
    color: AOM_ORANGE,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  navBadge: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: INK_MUTED,
    padding: '4px 10px',
    background: CREAM_WARM,
    borderRadius: 4,
    border: `1px solid ${BORDER}`,
  },
  hero: {
    background: INK,
    padding: '80px 40px',
    color: '#fff',
  },
  heroInner: {
    maxWidth: 1100,
    margin: '0 auto',
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: AOM_ORANGE,
    marginBottom: 20,
  },
  heroTitle: {
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontSize: 'clamp(40px, 5vw, 64px)',
    fontWeight: 400,
    lineHeight: 1.1,
    marginBottom: 24,
    letterSpacing: '-0.02em',
    color: '#fff',
  },
  heroSub: {
    fontSize: 18,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.65)',
    maxWidth: 620,
    marginBottom: 40,
  },
  heroBadges: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroBadge: {
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '60px 40px',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: INK_MUTED,
    marginBottom: 32,
    paddingBottom: 16,
    borderBottom: `1px solid ${BORDER}`,
  },
  sessionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginBottom: 64,
  },
  sessionCard: {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  sessionCardActive: {
    border: `2px solid ${AOM_ORANGE}`,
    boxShadow: `0 0 0 4px ${AOM_ORANGE_PALE}`,
  },
  sessionCardLocked: {
    opacity: 0.6,
    background: CREAM_WARM,
  },
  sessionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '24px 28px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  sessionNumber: {
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontSize: 36,
    fontWeight: 400,
    color: BORDER,
    minWidth: 52,
    lineHeight: 1,
  },
  sessionNumberActive: {
    color: AOM_ORANGE,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: INK,
    marginBottom: 4,
    letterSpacing: '-0.01em',
  },
  sessionGoal: {
    fontSize: 14,
    color: INK_MUTED,
    lineHeight: 1.5,
  },
  sessionMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 140,
  },
  sessionBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 4,
    letterSpacing: '0.05em',
  },
  sessionBadgeCurrent: {
    background: AOM_ORANGE_PALE,
    color: AOM_ORANGE,
  },
  sessionBadgeDone: {
    background: '#EBF5EF',
    color: GREEN_CHECK,
  },
  sessionBadgeLocked: {
    background: CREAM_WARM,
    color: LOCK_GRAY,
  },
  sessionDuration: {
    fontSize: 12,
    color: INK_MUTED,
  },
  sessionBody: {
    borderTop: `1px solid ${BORDER_SOFT}`,
    padding: '28px 28px 28px 100px',
  },
  sessionDesc: {
    fontSize: 15,
    lineHeight: 1.7,
    color: INK_SOFT,
    marginBottom: 28,
    maxWidth: 680,
  },
  leaveWith: {
    background: CREAM_WARM,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '14px 18px',
    fontSize: 14,
    color: INK_SOFT,
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 28,
    maxWidth: 580,
  },
  leaveWithLabel: {
    fontWeight: 600,
    color: INK,
    whiteSpace: 'nowrap',
  },
  facilitatorSection: {
    marginTop: 28,
    paddingTop: 28,
    borderTop: `1px solid ${BORDER_SOFT}`,
  },
  facilitatorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: AOM_ORANGE,
    background: AOM_ORANGE_PALE,
    padding: '4px 10px',
    borderRadius: 4,
    marginBottom: 20,
  },
  facilitatorGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 20,
  },
  facilBlock: {
    background: CREAM_WARM,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '18px 20px',
  },
  facilBlockFull: {
    background: CREAM_WARM,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '18px 20px',
    marginBottom: 16,
  },
  facilBlockTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: INK_MUTED,
    marginBottom: 12,
  },
  facilList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  facilListItem: {
    fontSize: 13,
    lineHeight: 1.5,
    color: INK_SOFT,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  facilBullet: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: AOM_ORANGE,
    marginTop: 7,
    flexShrink: 0,
  },
  stallRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: `1px solid ${BORDER_SOFT}`,
  },
  stallLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: INK,
    marginBottom: 4,
  },
  stallHandle: {
    fontSize: 13,
    color: INK_MUTED,
    lineHeight: 1.5,
  },
  clientTable: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 14,
  },
  tableHead: {
    background: CREAM_WARM,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: INK_MUTED,
    borderBottom: `1px solid ${BORDER}`,
  },
  td: {
    padding: '14px 16px',
    color: INK_SOFT,
    borderBottom: `1px solid ${BORDER_SOFT}`,
    verticalAlign: 'middle',
  },
  sessionPip: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: 4,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    background: AOM_ORANGE,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  btnSecondary: {
    background: '#fff',
    color: INK,
    border: `1px solid ${BORDER}`,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    fontSize: 16,
    fontFamily: 'inherit',
    color: INK,
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  errorBox: {
    background: '#FFF0EE',
    border: '1px solid #FFCCC7',
    borderRadius: 6,
    padding: '12px 16px',
    fontSize: 14,
    color: '#CC3311',
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    background: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: (pct) => ({
    height: '100%',
    background: AOM_ORANGE,
    borderRadius: 3,
    width: `${pct}%`,
    transition: 'width 0.4s ease',
  }),
}

// ─── Components ───────────────────────────────────────────────────────────────

function SessionStatusIcon({ status }) {
  if (status === 'done') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill={GREEN_CHECK} />
        <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'locked') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="5" y="9" width="10" height="8" rx="2" fill={LOCK_GRAY} />
        <path d="M7 9V7a3 3 0 016 0v2" stroke={LOCK_GRAY} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (status === 'current') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke={AOM_ORANGE} strokeWidth="2" />
        <circle cx="10" cy="10" r="4" fill={AOM_ORANGE} />
      </svg>
    )
  }
  return null
}

// ─── Access Code Gate ─────────────────────────────────────────────────────────

function AccessCodeGate({ onSuccess }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)

    try {
      if (!supabase) throw new Error('Service unavailable')
      const { data, error: dbErr } = await supabase
        .from('ai_hours_clients')
        .select('*')
        .eq('access_code', code.trim().toUpperCase())
        .single()

      if (dbErr || !data) {
        setError('Access code not found. Please check your code and try again.')
        setLoading(false)
        return
      }

      // Store in localStorage for session persistence
      localStorage.setItem('ai_hours_client', JSON.stringify(data))
      onSuccess(data)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoAccent}>AOM</span> AI Hours
          </div>
        </div>
      </header>

      {/* Gate */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ ...styles.heroEyebrow, color: AOM_ORANGE, textAlign: 'center', marginBottom: 16 }}>
              AI Hours Consulting
            </div>
            <h1 style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 36,
              fontWeight: 400,
              color: INK,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 16, color: INK_MUTED, lineHeight: 1.6 }}>
              Enter the access code AOM provided to access your learning materials.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="AOM-XXXX-000"
                style={styles.input}
                autoFocus
                disabled={loading}
              />
            </div>
            {error && <div style={styles.errorBox}>{error}</div>}
            <button
              type="submit"
              style={{ ...styles.btn, width: '100%', justifyContent: 'center', marginTop: 16, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Access My Sessions'}
            </button>
          </form>

          <p style={{ fontSize: 13, color: INK_MUTED, textAlign: 'center', marginTop: 24 }}>
            Don't have a code? <a href="mailto:hello@aom-inhouse.com" style={{ color: AOM_ORANGE, textDecoration: 'none' }}>Contact AOM</a> to get started.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Client Session View ──────────────────────────────────────────────────────

function ClientView({ client, onLogout }) {
  const [expandedSession, setExpandedSession] = useState(client.current_session)
  const currentSession = client.current_session || 1
  const completedCount = currentSession - 1
  const progressPct = Math.round((completedCount / 5) * 100)

  function getStatus(sessionNum) {
    if (sessionNum < currentSession) return 'done'
    if (sessionNum === currentSession) return 'current'
    return 'locked'
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoAccent}>AOM</span> AI Hours
          </div>
          <div style={styles.nav}>
            <span style={{ fontSize: 14, color: INK_MUTED }}>{client.client_name}</span>
            <button
              onClick={onLogout}
              style={{ ...styles.btn, ...styles.btnSecondary, padding: '8px 16px', fontSize: 13 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Progress hero */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '40px 40px 36px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ ...styles.heroEyebrow, color: AOM_ORANGE, marginBottom: 12 }}>
            Your AI Hours Journey
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: 32,
                fontWeight: 400,
                color: INK,
                letterSpacing: '-0.02em',
                marginBottom: 8,
              }}>
                {client.client_name}
              </h1>
              <p style={{ fontSize: 15, color: INK_MUTED }}>
                Session {currentSession} of 5 &mdash; {completedCount === 0 ? 'Just getting started' : `${completedCount} session${completedCount > 1 ? 's' : ''} complete`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400, color: INK }}>
                {progressPct}<span style={{ fontSize: 20, color: INK_MUTED }}>%</span>
              </div>
              <div style={{ fontSize: 12, color: INK_MUTED }}>complete</div>
            </div>
          </div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill(progressPct)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: INK_MUTED }}>
            <span>Session 1</span>
            <span>Session 5</span>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>
        <div style={styles.sectionLabel}>Your Sessions</div>
        <div style={styles.sessionsGrid}>
          {SESSIONS.map((session, i) => {
            const sessionNum = i + 1
            const status = getStatus(sessionNum)
            const isExpanded = expandedSession === sessionNum && status !== 'locked'

            return (
              <div
                key={sessionNum}
                style={{
                  ...styles.sessionCard,
                  ...(status === 'current' ? styles.sessionCardActive : {}),
                  ...(status === 'locked' ? styles.sessionCardLocked : {}),
                }}
              >
                <div
                  style={styles.sessionHeader}
                  onClick={() => {
                    if (status === 'locked') return
                    setExpandedSession(isExpanded ? null : sessionNum)
                  }}
                >
                  <div style={{
                    ...styles.sessionNumber,
                    ...(status === 'current' ? styles.sessionNumberActive : {}),
                    ...(status === 'done' ? { color: GREEN_CHECK } : {}),
                  }}>
                    {session.number}
                  </div>
                  <div style={styles.sessionInfo}>
                    <div style={styles.sessionTitle}>{session.title}</div>
                    <div style={styles.sessionGoal}>{session.goal}</div>
                  </div>
                  <div style={styles.sessionMeta}>
                    <div style={{
                      ...styles.sessionBadge,
                      ...(status === 'current' ? styles.sessionBadgeCurrent : {}),
                      ...(status === 'done' ? styles.sessionBadgeDone : {}),
                      ...(status === 'locked' ? styles.sessionBadgeLocked : {}),
                    }}>
                      {status === 'current' ? 'Current' : status === 'done' ? 'Complete' : 'Upcoming'}
                    </div>
                    <div style={styles.sessionDuration}>{session.duration}</div>
                    <SessionStatusIcon status={status} />
                  </div>
                </div>

                {isExpanded && (
                  <div style={styles.sessionBody}>
                    <p style={styles.sessionDesc}>{session.clientNotes}</p>
                    <div style={styles.leaveWith}>
                      <span style={styles.leaveWithLabel}>You'll leave with:</span>
                      <span>{session.leaveWith}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: INK, marginBottom: 4 }}>Questions between sessions?</div>
            <div style={{ fontSize: 14, color: INK_MUTED }}>AOM is here to help. Reach out anytime.</div>
          </div>
          <a
            href="mailto:hello@aom-inhouse.com"
            style={{ ...styles.btn, textDecoration: 'none' }}
          >
            Contact AOM
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── AOM Team View ────────────────────────────────────────────────────────────

function TeamView({ user, onLogout }) {
  const [expandedSession, setExpandedSession] = useState(null)
  const [expandedFacil, setExpandedFacil] = useState({})
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sessions')

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    if (!supabase) return
    const { data } = await supabase
      .from('ai_hours_clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setClientsLoading(false)
  }

  function toggleFacil(sessionNum, key) {
    setExpandedFacil(prev => ({
      ...prev,
      [`${sessionNum}-${key}`]: !prev[`${sessionNum}-${key}`],
    }))
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoAccent}>AOM</span> AI Hours
          </div>
          <div style={styles.nav}>
            <span style={{ ...styles.navBadge, color: AOM_ORANGE, borderColor: AOM_ORANGE_PALE, background: AOM_ORANGE_PALE }}>
              AOM Team
            </span>
            <span style={{ fontSize: 14, color: INK_MUTED }}>{user?.email}</span>
            <button
              onClick={onLogout}
              style={{ ...styles.btn, ...styles.btnSecondary, padding: '8px 16px', fontSize: 13 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroEyebrow}>Facilitator Reference</div>
          <h1 style={styles.heroTitle}>AI Hours<br />Learning Center</h1>
          <p style={styles.heroSub}>
            The complete facilitator guide for the 5-session AI Hours consulting engagement.
            Session playbooks, client management, and everything you need to run a great session.
          </p>
          <div style={styles.heroBadges}>
            <span style={styles.heroBadge}>5 Sessions</span>
            <span style={styles.heroBadge}>2 Hours Each</span>
            <span style={styles.heroBadge}>10 Hours Total</span>
            <span style={styles.heroBadge}>AI Operating System Outcome</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 0 }}>
          {[
            { key: 'sessions', label: 'Session Playbooks' },
            { key: 'clients', label: `Clients (${clients.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${AOM_ORANGE}` : '2px solid transparent',
                padding: '16px 20px',
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? INK : INK_MUTED,
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.main}>

        {/* ── Sessions Tab ── */}
        {activeTab === 'sessions' && (
          <>
            <div style={styles.sectionLabel}>5-Session Arc Overview</div>

            {/* Arc overview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 2,
              marginBottom: 48,
            }}>
              {SESSIONS.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: `1px solid ${BORDER}`,
                    borderRadius: i === 0 ? '6px 0 0 6px' : i === 4 ? '0 6px 6px 0' : 0,
                    padding: '20px 16px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setExpandedSession(expandedSession === i + 1 ? null : i + 1)}
                >
                  <div style={{ fontSize: 24, fontFamily: '"Instrument Serif", Georgia, serif', color: AOM_ORANGE, marginBottom: 8 }}>{s.number}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: INK_MUTED }}>{s.duration}</div>
                </div>
              ))}
            </div>

            <div style={styles.sectionLabel}>Full Playbooks</div>
            <div style={styles.sessionsGrid}>
              {SESSIONS.map((session, i) => {
                const sessionNum = i + 1
                const isExpanded = expandedSession === sessionNum
                const fn = session.facilitatorNotes

                return (
                  <div key={sessionNum} style={styles.sessionCard}>
                    <div
                      style={styles.sessionHeader}
                      onClick={() => setExpandedSession(isExpanded ? null : sessionNum)}
                    >
                      <div style={{ ...styles.sessionNumber, color: AOM_ORANGE }}>{session.number}</div>
                      <div style={styles.sessionInfo}>
                        <div style={styles.sessionTitle}>{session.title}</div>
                        <div style={styles.sessionGoal}>{session.goal}</div>
                      </div>
                      <div style={styles.sessionMeta}>
                        <span style={{ ...styles.sessionBadge, ...styles.sessionBadgeCurrent }}>
                          {session.duration}
                        </span>
                        <svg
                          width="16" height="16" viewBox="0 0 16 16" fill="none"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                        >
                          <path d="M4 6l4 4 4-4" stroke={INK_MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={styles.sessionBody}>
                        <p style={styles.sessionDesc}>{session.description}</p>
                        <div style={styles.leaveWith}>
                          <span style={styles.leaveWithLabel}>Client leaves with:</span>
                          <span>{session.leaveWith}</span>
                        </div>

                        {/* Client-facing description */}
                        <div style={{ marginBottom: 28 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK_MUTED, marginBottom: 12 }}>
                            What to tell the client
                          </div>
                          <p style={{ fontSize: 14, lineHeight: 1.7, color: INK_SOFT, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 18px', margin: 0 }}>
                            {session.clientNotes}
                          </p>
                        </div>

                        {/* Facilitator notes */}
                        <div style={styles.facilitatorSection}>
                          <div style={styles.facilitatorBadge}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <circle cx="6" cy="6" r="5" stroke={AOM_ORANGE} strokeWidth="1.5" />
                              <path d="M6 4v4M6 3v.5" stroke={AOM_ORANGE} strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            Facilitator Notes — Internal Only
                          </div>

                          {/* Prep */}
                          <div style={styles.facilBlockFull}>
                            <div style={styles.facilBlockTitle}>Before the session</div>
                            <ul style={styles.facilList}>
                              {fn.prep.map((item, j) => (
                                <li key={j} style={styles.facilListItem}>
                                  <span style={styles.facilBullet} />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div style={styles.facilitatorGrid}>
                            {/* Key questions */}
                            <div style={styles.facilBlock}>
                              <div style={styles.facilBlockTitle}>Key questions to ask</div>
                              <ul style={styles.facilList}>
                                {fn.keyQuestions.map((q, j) => (
                                  <li key={j} style={styles.facilListItem}>
                                    <span style={styles.facilBullet} />
                                    <em style={{ fontStyle: 'italic' }}>{q}</em>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Common stalls */}
                            <div style={styles.facilBlock}>
                              <div style={styles.facilBlockTitle}>Common stalls + how to handle</div>
                              {fn.commonStalls.map((stall, j) => (
                                <div key={j} style={{ ...styles.stallRow, ...(j === fn.commonStalls.length - 1 ? { borderBottom: 'none', marginBottom: 0, paddingBottom: 0 } : {}) }}>
                                  <div style={styles.stallLabel}>"{stall.stall}"</div>
                                  <div style={styles.stallHandle}>{stall.handle}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Homework */}
                          {fn.homework && (
                            <div style={styles.facilBlockFull}>
                              <div style={styles.facilBlockTitle}>Homework to assign</div>
                              <ul style={styles.facilList}>
                                {fn.homework.map((item, j) => (
                                  <li key={j} style={styles.facilListItem}>
                                    <span style={styles.facilBullet} />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Clients Tab ── */}
        {activeTab === 'clients' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <div style={styles.sectionLabel} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                Client Management
              </div>
              <a
                href="mailto:hello@aom-inhouse.com?subject=New AI Hours Client"
                style={{ ...styles.btn, fontSize: 13, padding: '10px 18px', textDecoration: 'none' }}
              >
                + Add Client
              </a>
            </div>

            {clientsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: INK_MUTED }}>Loading clients...</div>
            ) : clients.length === 0 ? (
              <div style={{
                background: '#fff',
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: '48px',
                textAlign: 'center',
                color: INK_MUTED,
              }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>—</div>
                <div style={{ fontSize: 15 }}>No clients yet. Add your first AI Hours client above.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <table style={{ ...styles.clientTable, border: 'none' }}>
                  <thead style={styles.tableHead}>
                    <tr>
                      <th style={styles.th}>Client</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Access Code</th>
                      <th style={styles.th}>Progress</th>
                      <th style={styles.th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client, i) => (
                      <tr key={client.id}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600, color: INK }}>{client.client_name}</div>
                          <div style={{ fontSize: 12, color: INK_MUTED, marginTop: 2 }}>
                            Added {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td style={styles.td}>
                          {client.email ? (
                            <a href={`mailto:${client.email}`} style={{ color: AOM_ORANGE, textDecoration: 'none', fontSize: 13 }}>
                              {client.email}
                            </a>
                          ) : (
                            <span style={{ color: LOCK_GRAY, fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <code style={{
                            fontFamily: 'monospace',
                            fontSize: 13,
                            background: CREAM_WARM,
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: `1px solid ${BORDER}`,
                            color: INK_SOFT,
                          }}>
                            {client.access_code}
                          </code>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {[1, 2, 3, 4, 5].map(n => (
                                <span
                                  key={n}
                                  style={{
                                    ...styles.sessionPip,
                                    background: n < client.current_session
                                      ? GREEN_CHECK
                                      : n === client.current_session
                                      ? AOM_ORANGE
                                      : BORDER,
                                  }}
                                />
                              ))}
                            </div>
                            <span style={{ fontSize: 12, color: INK_MUTED }}>
                              Session {client.current_session}/5
                            </span>
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontSize: 13, color: INK_MUTED, maxWidth: 200 }}>
                          {client.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 24, fontSize: 13, color: INK_MUTED }}>
              To update a client's session progress or add notes, update their record directly in the Supabase dashboard or ask Elon to run the update.
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${BORDER}`,
        background: '#fff',
        padding: '24px 40px',
        marginTop: 40,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: INK_MUTED }}>
            AOM AI Hours — Facilitator Reference &bull; Internal only &bull; Not for distribution
          </div>
          <div style={{ fontSize: 13, color: INK_MUTED }}>
            &copy; {new Date().getFullYear()} Ahead of Market
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIHoursLearning() {
  const [mode, setMode] = useState('loading') // 'loading' | 'gate' | 'client' | 'team'
  const [clientData, setClientData] = useState(null)
  const [teamUser, setTeamUser] = useState(null)

  useEffect(() => {
    async function init() {
      // Check for authenticated AOM team session first
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setTeamUser(user)
          setMode('team')
          return
        }
      }

      // Check for stored client session
      const stored = localStorage.getItem('ai_hours_client')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed?.access_code) {
            // Refresh from DB to get latest session status
            if (supabase) {
              const { data } = await supabase
                .from('ai_hours_clients')
                .select('*')
                .eq('access_code', parsed.access_code)
                .single()
              if (data) {
                setClientData(data)
                setMode('client')
                return
              }
            }
          }
        } catch {
          localStorage.removeItem('ai_hours_client')
        }
      }

      setMode('gate')
    }
    init()
  }, [])

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    localStorage.removeItem('ai_hours_client')
    setMode('gate')
    setClientData(null)
    setTeamUser(null)
  }

  if (mode === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${BORDER}`, borderTop: `2px solid ${AOM_ORANGE}`, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (mode === 'gate') {
    return <AccessCodeGate onSuccess={data => { setClientData(data); setMode('client') }} />
  }

  if (mode === 'client') {
    return <ClientView client={clientData} onLogout={handleLogout} />
  }

  if (mode === 'team') {
    return <TeamView user={teamUser} onLogout={handleLogout} />
  }

  return null
}
