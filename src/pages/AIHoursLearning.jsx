import React, { useState, useEffect } from 'react'
import { supabase } from '../dashboard/lib/supabase.js'

// ─────────────────────────────────────────────────────────────────────────────
// AI Hours Learning Center
// Route: /ai-hours
// Two views:
//   AOM Team (authenticated): full facilitator view with all sessions + client mgmt
//   Client (access code): session progress view for their current engagement
// ─────────────────────────────────────────────────────────────────────────────

// Any @aom-inhouse.com email gets admin access automatically.
// patrikmatheson@gmail.com is explicitly included as it's not an @aom-inhouse.com address.
// courtney@corner.aheadofmarket.com is explicitly included — her OAuth email.
const ADMIN_ALLOWLIST = [
  'patrikmatheson@gmail.com',
  'courtney@corner.aheadofmarket.com',
]

function isAOMTeamMember(email) {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith('@aom-inhouse.com') || ADMIN_ALLOWLIST.includes(normalized)
}

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
const GREEN_CHECK_LIGHT = '#F0FFF4'
const GREEN_CHECK_BORDER = '#B7E5C8'
const LOCK_GRAY = '#B8B2A8'
// Milestone progress colors: red → amber → green
const PROGRESS_RED = '#DC2626'
const PROGRESS_RED_PALE = '#FEF2F2'
const PROGRESS_AMBER = '#D97706'
const PROGRESS_AMBER_PALE = '#FFFBEB'
const PROGRESS_GREEN = '#2D7A4F'
const PROGRESS_GREEN_PALE = '#F0FFF4'

function getProgressColor(checked, total) {
  if (checked === 0) return { bg: BORDER, text: INK_MUTED, card: CREAM_WARM, border: BORDER_SOFT, pale: CREAM_WARM }
  if (checked < total - 1) return { bg: PROGRESS_RED, text: PROGRESS_RED, card: PROGRESS_RED_PALE, border: '#FCA5A5', pale: PROGRESS_RED_PALE }
  if (checked < total) return { bg: PROGRESS_AMBER, text: PROGRESS_AMBER, card: PROGRESS_AMBER_PALE, border: '#FCD34D', pale: PROGRESS_AMBER_PALE }
  return { bg: PROGRESS_GREEN, text: PROGRESS_GREEN, card: PROGRESS_GREEN_PALE, border: GREEN_CHECK_BORDER, pale: PROGRESS_GREEN_PALE }
}

// ─── Session Data ─────────────────────────────────────────────────────────────

const SESSIONS = [
  {
    number: '01',
    title: 'Discovery + First Contact',
    goal: 'Understand the client\'s world. Get Claude running. Land the first win.',
    duration: '2 hours',
    leaveWith: 'Claude installed, one working tool, the mental model',
 description: `The first session is about orientation, yours and theirs. You're learning their business; they're learning that AI isn't scary. Your job is to make them feel a win before the session ends.`,
 clientNotes: `We'll start by mapping out how you work today, the tools, the workflows, the moments that eat your time. Then we'll get Claude set up on your machine and build your first working tool together. You'll leave with something you can actually use tomorrow.`,
    facilitatorNotes: {
      prep: [
        'Review any onboarding questionnaire they completed',
 'Research their industry for 15 minutes, know the vocabulary',
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
 handle: 'Validate it. "The hype is real, and most of it doesn\'t apply to you. Here\'s what actually helps." Then demo something specific to their work.',
        },
        {
          stall: 'They want to talk strategy before doing anything',
          handle: 'Get them to do something in the first 20 minutes. "Let\'s just try one thing real quick, then we\'ll plan." The tool demo creates belief; the belief unlocks the plan.',
        },
        {
          stall: 'Their first tool attempt fails or looks wrong',
 handle: 'Make it a teaching moment, not a failure. "This is actually great, it\'s showing us exactly what we need to adjust. Here\'s why..."',
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
 description: `Session 2 is the architecture session. You're building the map of their business, every workflow, every pain point, every repeating task. The output is a CLAUDE.md document that becomes their AI operating system's brain: context about the business that Claude will reference on every interaction.`,
 clientNotes: `We're building your AI's brain today. This is a document that tells Claude everything it needs to know about your business, your voice, your processes, your clients, your shortcuts. Once it's built, every Claude interaction gets smarter because it already knows the context.`,
    facilitatorNotes: {
      prep: [
 'Review homework from Session 1, what did they actually use?',
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
 handle: 'Don\'t skip it, improvise. "Let\'s do the usage review right now, live. Tell me about the last 3 things you worked on this week."',
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
 'Read through the CLAUDE.md you built together, add anything that feels missing',
        'Start every Claude session this week with your CLAUDE.md as context',
 'Come back with your real reaction to Tool 1 and 2 specs, is this actually what you want built?',
      ],
    },
  },
  {
    number: '03',
    title: 'Build Tool 1',
    goal: 'Build the first real business tool together. Document it.',
    duration: '2 hours',
    leaveWith: 'Working Tool 1 with Tool Card documentation, confidence to run it solo',
 description: `Session 3 is where the OS starts coming to life. You're building Tool 1, the highest-impact, most immediately useful AI workflow for their specific business. You're also introducing Tool Cards: simple documentation that lets them run (and eventually teach) each tool without you.`,
 clientNotes: `We're building Tool 1 today, your highest-priority AI workflow, built specifically for how you work. By the end of this session, you'll have something running that you can use on your own, plus a simple one-page reference so you never forget how to run it.`,
    facilitatorNotes: {
      prep: [
        'Have the Tool 1 spec from Session 2 ready to reference',
        'Pre-test any technical components so you\'re not troubleshooting live',
        'Prepare a Tool Card template',
        'Know the likely failure modes of this specific tool type',
      ],
      keyQuestions: [
 'Before we build, did the spec from last session still feel right, or has anything changed?',
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
 'Note anything that breaks or feels wrong, we\'ll refine in Session 5',
 'Try explaining the tool to one person in your life, teaching locks in learning',
      ],
    },
  },
  {
    number: '04',
    title: 'Build Tool 2 + Connect the Dots',
    goal: 'Second tool, first connected workflow, OS starting to take shape.',
    duration: '2 hours',
    leaveWith: 'Tool 2 complete, first workflow sequence running, OS sketch',
 description: `Session 4 is where individual tools become a system. You\'re building Tool 2 and, for the first time, connecting tools into a workflow sequence. The client starts to see what an AI Operating System actually looks like when the parts work together.`,
    clientNotes: `Today we build Tool 2 and start connecting your tools into actual workflows. Instead of individual tricks, you\'ll start to see the bigger picture: a sequence of AI-powered steps that runs the parts of your business that used to run you.`,
    facilitatorNotes: {
      prep: [
 'Review Tool 1 usage since Session 3, where did it work, where did it break?',
        'Have Tool 2 spec ready',
        'Think through the connection point between Tool 1 and Tool 2',
        'Sketch a simple OS diagram to show visually at the end',
      ],
      keyQuestions: [
        'Tell me everything about using Tool 1 this week. Good and bad.',
        'Does Tool 2 still feel like the right next priority?',
        'Where do these two tools naturally connect in your actual workflow?',
 'When you imagine your AI OS being "done", what does it look like? How many tools, roughly?',
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
 stall: 'Ambition spike, they want to plan 10 more tools',
          handle: 'Great sign. Capture the ideas, stay focused. "I\'m writing all of this down. Let\'s finish Tool 2 and the workflow, then we\'ll do the big planning in Session 5."',
        },
      ],
      homework: [
        'Run the full workflow sequence at least 3 times',
 'Start a list of Tool 3, 4, 5, what\'s the ideal next layer?',
 'Bring real examples of work from this week to Session 5, we\'ll review the OS in action',
      ],
    },
  },
  {
    number: '05',
    title: 'Operating System Review + Path Forward',
    goal: 'Take stock of everything. Make a clear path forward recommendation.',
    duration: '2 hours',
    leaveWith: 'Full OS review doc, clear next step (more sessions / retainer / Corner / solo)',
 description: `Session 5 is the graduation session. You\'re reviewing what was built, celebrating progress, identifying gaps, and making an honest recommendation for what comes next, whether that\'s more sessions, a retainer arrangement, Corner access, or flying solo. The client leaves with a complete picture and a clear path.`,
    clientNotes: `Today we review everything you\'ve built and where you want to take it. You\'ll leave with a complete picture of your AI Operating System: what\'s working, what\'s next, and a honest recommendation from us on the best way to keep building on what we started.`,
    facilitatorNotes: {
      prep: [
        'Compile a full summary of what was built across all 5 sessions',
 'Review the CLAUDE.md for completeness, fill any gaps',
        'Have the OS Review document template ready',
        'Prepare your honest next-step recommendation (more sessions / retainer / Corner / solo)',
        'Know current Corner pricing and what a retainer looks like',
      ],
      keyQuestions: [
        'Walk me through your week. Where did the AI OS show up? Where was it absent?',
        'What surprised you most about these 5 sessions?',
        'If you had 5 more sessions, what would you build?',
 'What would "done" feel like for you, and what does your business need to get there?',
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
 handle: 'That\'s fine, but give them the framework to decide. Send the OS review doc after the session with clear options. Follow up in one week.',
        },
      ],
      homework: null,
    },
  },
]

// ─── Checklist Items Per Session ─────────────────────────────────────────────

const SESSION_CHECKLISTS = {
  1: [
    'Had my discovery conversation with AOM',
    'Got Claude Code running on my machine',
    'Built my first automation live',
  ],
  2: [
    'Reviewed what I built in Session 1',
    'Mapped out my business workflow with AOM',
    'Identified my top bottlenecks',
  ],
  3: [
    'Picked my highest-value use case',
    'Built Tool 1 live with AOM',
    'Know how to use and modify it',
  ],
  4: [
    'Reviewed Tool 1 with AOM and noted friction',
    'Built Tool 2 live with AOM',
    'Connected my two tools into a workflow',
  ],
  5: [
    'Completed my full OS review',
    'Know my gaps and what\'s next',
    'Chose my path forward with AOM',
  ],
}

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

// ─── Session Step Indicator ───────────────────────────────────────────────────

function SessionStepIndicator({ currentSession, checklistCompleted = {}, clientMarkedDone = {} }) {
  const isComplete = currentSession > 5
  // Program complete = AOM advanced past session 5, OR client has marked session 5 as done
  // (sessions 1–4 are already AOM-done when currentSession >= 5)
  const allDone = isComplete || (currentSession >= 5 && !!clientMarkedDone[5])

  function getStepStatus(sessionNum) {
    if (allDone) return 'done'
    if (sessionNum < currentSession) return 'done'
    if (sessionNum === currentSession && !isComplete) return 'current'
    return 'locked'
  }

  return (
    <div style={{
      padding: '28px 40px 24px',
      background: allDone ? 'rgba(45,122,79,0.05)' : '#fff',
      borderBottom: `1px solid ${allDone ? GREEN_CHECK_BORDER : BORDER}`,
      transition: 'background 0.6s ease, border-color 0.6s ease',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ ...styles.heroEyebrow, color: allDone ? PROGRESS_GREEN : AOM_ORANGE, marginBottom: 0 }}>
            Your AI Hours Journey
          </div>
          {allDone && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 16px',
              background: PROGRESS_GREEN,
              color: '#fff',
              borderRadius: 24,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              animation: 'aihours-fadein 0.5s ease',
              boxShadow: '0 2px 12px rgba(45,122,79,0.32)',
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2.5 6.5l3 3L10.5 3" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Program Completed
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {SESSIONS.map((session, i) => {
            const sessionNum = i + 1
            const status = getStepStatus(sessionNum)
            const isLast = sessionNum === 5
            const checklistDone = !!checklistCompleted[sessionNum]

            return (
              <React.Fragment key={sessionNum}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                  {/* Step circle + optional milestone badge */}
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: status === 'done' ? GREEN_CHECK : status === 'current' ? AOM_ORANGE : 'transparent',
                      border: status === 'locked' ? `2px solid ${BORDER}` : 'none',
                      flexShrink: 0,
                      transition: 'background 0.4s ease',
                      boxShadow: allDone ? '0 0 0 4px rgba(45,122,79,0.12)' : 'none',
                    }}>
                      {status === 'done' ? (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M4 9.5l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: status === 'current' ? '#fff' : LOCK_GRAY,
                        }}>
                          {sessionNum}
                        </span>
                      )}
                    </div>
                    {/* Milestone badge: small green check that appears when all checklist items are done */}
                    {checklistDone && status !== 'locked' && !allDone && (
                      <div style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: PROGRESS_GREEN,
                        border: '2px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(45,122,79,0.35)',
                        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                        transform: 'scale(1)',
                      }}>
                        <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                          <path d="M1 3.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: status === 'current' ? 700 : 500,
                    color: status === 'done' ? GREEN_CHECK : status === 'current' ? AOM_ORANGE : LOCK_GRAY,
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    {status === 'done' ? 'Complete' : `Session ${sessionNum}`}
                    {status === 'current' && (
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 700, marginTop: 2 }}>↑ Current</span>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <div style={{
                    height: 2,
                    flex: 1,
                    background: status === 'done' ? GREEN_CHECK : BORDER,
                    marginTop: 20,
                    maxWidth: 64,
                    transition: 'background 0.5s ease',
                  }} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({ completedSession, newSession, onContinue }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        {/* Check circle */}
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#E8F5ED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="22" fill={GREEN_CHECK} />
              <path d="M12 22.5l7 7 13-13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h1 style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 38,
          fontWeight: 400,
          color: INK,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          marginBottom: 16,
        }}>
          Great work on Session {completedSession}.
        </h1>

        <p style={{
          fontSize: 17,
          color: INK_MUTED,
          lineHeight: 1.65,
          marginBottom: 48,
        }}>
          Looking forward to the next session with you — AOM
        </p>

        {/* Progress preview */}
        <div style={{
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: '24px 28px',
          marginBottom: 36,
        }}>
          <div style={{
            fontSize: 11,
            color: INK_MUTED,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Your progress
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {SESSIONS.map((session, i) => {
              const sessionNum = i + 1
              const isDone = sessionNum < newSession
              const isCurrent = sessionNum === newSession
              const isLast = sessionNum === 5

              return (
                <React.Fragment key={sessionNum}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDone ? GREEN_CHECK : isCurrent ? AOM_ORANGE : 'transparent',
                      border: !isDone && !isCurrent ? `2px solid ${BORDER}` : 'none',
                    }}>
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7l2.5 2.5 5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? '#fff' : LOCK_GRAY }}>
                          {sessionNum}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: isDone ? GREEN_CHECK : isCurrent ? AOM_ORANGE : LOCK_GRAY,
                      fontWeight: isCurrent ? 700 : 500,
                    }}>
                      {isCurrent ? 'Next' : `S${sessionNum}`}
                    </span>
                  </div>
                  {!isLast && (
                    <div style={{
                      height: 2,
                      flex: 1,
                      background: isDone ? GREEN_CHECK : BORDER,
                      marginTop: 17,
                    }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        <button
          onClick={onContinue}
          style={{
            ...styles.btn,
            padding: '14px 36px',
            fontSize: 15,
          }}
        >
          View Session {newSession} →
        </button>
      </div>
    </div>
  )
}

// ─── Access Code Gate ─────────────────────────────────────────────────────────
// Client-only gate — admin link is intentionally hidden at the bottom.
// AOM team clicks the tiny "Admin" link to reveal the email/password form.

function AccessCodeGate({ onClientSuccess }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Admin panel state
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState(null)
  const [adminChecking, setAdminChecking] = useState(false)

  async function handleClientSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)

    try {
      // Use the service-role API endpoint so RLS policies don't block anon reads
      const res = await fetch(`/api/ai-hours/clients?access_code=${encodeURIComponent(code.trim().toUpperCase())}`)
      const result = await res.json()

      if (!result.ok || !result.client) {
        setError('Access code not found. Please check your code and try again.')
        setLoading(false)
        return
      }

      // Store in localStorage for session persistence
      localStorage.setItem('ai_hours_client', JSON.stringify(result.client))
      onClientSuccess(result.client)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function handleAdminLinkClick() {
    // When the tiny "Admin" link is clicked, immediately check if there's already
    // a valid session — if so, redirect straight to admin without showing the form.
    setAdminChecking(true)
    try {
      // Check isolated AI Hours admin session
      const stored = localStorage.getItem('ai-hours-admin-session')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.email && isAOMTeamMember(parsed.email)) {
          window.location.replace('/ai-hours/admin')
          return
        }
      }
    } catch {
      localStorage.removeItem('ai-hours-admin-session')
    }

    try {
      // Check Corner Supabase session
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && isAOMTeamMember(session.user.email)) {
          // Stamp the AI Hours session so /ai-hours/admin recognizes them without re-auth
          localStorage.setItem('ai-hours-admin-session', JSON.stringify({ email: session.user.email }))
          window.location.replace('/ai-hours/admin')
          return
        }
      }
    } catch { /* ignore */ }

    // No active session — show the login form
    setAdminChecking(false)
    setShowAdmin(true)
  }

  async function handleAdminSubmit(e) {
    e.preventDefault()
    setAdminLoading(true)
    setAdminError(null)

    try {
      // If already logged into AI Hours admin session (isolated from Corner), redirect directly
      try {
        const aiHoursSession = localStorage.getItem('ai-hours-admin-session')
        if (aiHoursSession) {
          const parsed = JSON.parse(aiHoursSession)
          if (parsed?.email && isAOMTeamMember(parsed.email)) {
            window.location.replace('/ai-hours/admin')
            return
          }
        }
      } catch { /* ignore */ }

      // If already logged into Corner as AOM team member, redirect directly (read-only session check)
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && isAOMTeamMember(session.user.email)) {
          // Stamp the AI Hours session so /ai-hours/admin recognizes them without re-auth
          localStorage.setItem('ai-hours-admin-session', JSON.stringify({ email: session.user.email }))
          window.location.replace('/ai-hours/admin')
          return
        }
      }

      // No active AOM session — validate via server-side endpoint (does NOT touch Corner session)
      if (!adminEmail.trim() || !adminPassword.trim()) {
        setAdminError('Please enter your email and password.')
        setAdminLoading(false)
        return
      }

      const res = await fetch('/api/ai-hours/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      })
      const result = await res.json()

      if (!result.ok) {
        setAdminError(result.error || 'Invalid email or password.')
        setAdminLoading(false)
        return
      }

      // Store isolated AI Hours session — never touches supabase.auth
      localStorage.setItem('ai-hours-admin-session', JSON.stringify({ email: result.email }))
      window.location.replace('/ai-hours/admin')
    } catch {
      setAdminError('Something went wrong. Please try again.')
    }
    setAdminLoading(false)
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
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 36,
              fontWeight: 400,
              color: INK,
              marginBottom: 12,
              letterSpacing: '-0.02em',
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 16, color: INK_MUTED, lineHeight: 1.6, margin: 0 }}>
              Enter the access code AOM provided to view your sessions.
            </p>
          </div>

          <form onSubmit={handleClientSubmit}>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="AOM-XXXX-000"
                style={styles.input}
                autoFocus={!showAdmin}
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

          {/* ── Hidden admin link + inline form ── */}
          <div style={{ marginTop: 48, textAlign: 'center' }}>
            {!showAdmin ? (
              <button
                onClick={handleAdminLinkClick}
                disabled={adminChecking}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 10,
                  color: '#c8c2bb',
                  cursor: adminChecking ? 'default' : 'pointer',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  opacity: adminChecking ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!adminChecking) { e.target.style.color = '#9ca3af'; e.target.style.textDecoration = 'underline' } }}
                onMouseLeave={e => { e.target.style.color = '#c8c2bb'; e.target.style.textDecoration = 'none' }}
              >
                {adminChecking ? '...' : 'Admin'}
              </button>
            ) : (
              <div style={{
                marginTop: 4,
                padding: '20px',
                background: CREAM_WARM,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                textAlign: 'left',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED, marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  AOM Team Login
                </div>
                <form onSubmit={handleAdminSubmit}>
                  <div style={{ marginBottom: 10 }}>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      placeholder="Email"
                      autoFocus
                      style={{
                        ...styles.input,
                        letterSpacing: 'normal',
                        textTransform: 'none',
                        padding: '11px 14px',
                        fontSize: 14,
                      }}
                      disabled={adminLoading}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Password"
                      style={{
                        ...styles.input,
                        letterSpacing: 'normal',
                        textTransform: 'none',
                        padding: '11px 14px',
                        fontSize: 14,
                      }}
                      disabled={adminLoading}
                    />
                  </div>
                  {adminError && <div style={{ ...styles.errorBox, marginBottom: 12 }}>{adminError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit"
                      style={{
                        ...styles.btn,
                        flex: 1,
                        justifyContent: 'center',
                        fontSize: 13,
                        padding: '10px 16px',
                        opacity: adminLoading ? 0.7 : 1,
                      }}
                      disabled={adminLoading}
                    >
                      {adminLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAdmin(false); setAdminEmail(''); setAdminPassword(''); setAdminError(null) }}
                      style={{
                        ...styles.btn,
                        ...styles.btnSecondary,
                        fontSize: 13,
                        padding: '10px 14px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Session Checklist Component ─────────────────────────────────────────────
// Design: strikethrough "crossing off the list" style — items stay visible,
// checked items get strikethrough + green checkbox. No collapse. No accordion.

function SessionChecklist({ sessionNumber, accessCode, onAllChecked, isReadOnly = false, onMarkComplete, markedComplete = false }) {
  const items = SESSION_CHECKLISTS[sessionNumber] || []
  const allIndices = items.map((_, i) => i)
  const storageKey = `ai_hours_checklist_${accessCode}_${sessionNumber}`

  // If session is read-only (AOM-marked complete), show all items checked.
  // Otherwise load from localStorage with Supabase as background sync source.
  const [checked, setChecked] = useState(() => {
    if (isReadOnly) return allIndices
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // If isReadOnly becomes true after mount (e.g. prop change), ensure all show checked
  useEffect(() => {
    if (isReadOnly) {
      setChecked(allIndices)
      if (onAllChecked) onAllChecked(sessionNumber, true)
    }
  }, [isReadOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from Supabase on mount (active sessions only — done sessions always show all checked)
  useEffect(() => {
    if (!accessCode || isReadOnly) return
    fetch(`/api/ai-hours/checklist?access_code=${encodeURIComponent(accessCode)}&session=${sessionNumber}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.checked_items) && data.checked_items.length > 0) {
          setChecked(data.checked_items)
          try { localStorage.setItem(storageKey, JSON.stringify(data.checked_items)) } catch {}
          if (data.checked_items.length >= items.length && onAllChecked) {
            onAllChecked(sessionNumber, true)
          }
        }
      })
      .catch(() => {}) // localStorage is the fallback; silence network errors
  }, [accessCode, sessionNumber, storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(index) {
    if (isReadOnly) return
    const wasChecked = checked.includes(index)
    const next = wasChecked
      ? checked.filter(i => i !== index)
      : [...checked, index]
    setChecked(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}

    const allNowDone = next.length >= items.length
    if (onAllChecked) onAllChecked(sessionNumber, allNowDone)

    // persist to Supabase in background (best-effort)
    fetch('/api/ai-hours/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: accessCode, session_number: sessionNumber, checked_items: next }),
    }).catch(() => {})
  }

  if (items.length === 0) return null
  const doneCount = checked.length
  const totalCount = items.length
  const allDone = doneCount >= totalCount

  return (
    <div style={{
      marginTop: 24,
      borderRadius: 10,
      border: `1.5px solid ${allDone ? GREEN_CHECK_BORDER : BORDER}`,
      background: allDone ? 'rgba(45,122,79,0.03)' : '#fff',
      overflow: 'hidden',
      transition: 'border-color 0.45s ease, background 0.45s ease',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${allDone ? GREEN_CHECK_BORDER : BORDER_SOFT}`,
        transition: 'border-color 0.45s ease',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: allDone ? PROGRESS_GREEN : INK_MUTED,
          transition: 'color 0.45s ease',
        }}>
 {allDone ? 'Session checklist, complete' : 'Session checklist'}
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: allDone ? PROGRESS_GREEN : INK_MUTED,
          transition: 'color 0.45s ease',
        }}>
          {doneCount}/{totalCount}
        </span>
      </div>

      {/* Checklist items — always fully visible, strikethrough when checked */}
      <div style={{ padding: '6px 0' }}>
        {items.map((item, index) => {
          const isChecked = checked.includes(index)

          return (
            <button
              key={index}
              onClick={() => toggle(index)}
              disabled={isReadOnly}
              title={isReadOnly ? undefined : isChecked ? 'Click to uncheck' : 'Click to check off'}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '12px 20px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                cursor: isReadOnly ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { if (!isReadOnly) e.currentTarget.style.background = isChecked ? 'rgba(45,122,79,0.04)' : 'rgba(0,0,0,0.02)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* Checkbox — green filled when checked, gray border when unchecked */}
              <div style={{
                width: 20,
                height: 20,
                minWidth: 20,
                marginTop: 2,
                borderRadius: 5,
                background: isChecked ? PROGRESS_GREEN : '#fff',
                border: isChecked ? `2px solid ${PROGRESS_GREEN}` : `2px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}>
                {isChecked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {/* Task text — strikethrough when checked */}
              <span style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: isChecked ? INK_MUTED : INK_SOFT,
                fontWeight: isChecked ? 400 : 500,
                textDecoration: isChecked ? 'line-through' : 'none',
                transition: 'color 0.2s ease, text-decoration 0.2s ease',
              }}>
                {item}
              </span>
            </button>
          )
        })}
      </div>

      {/* All-done footer: button when active, confirmation when already marked */}
      {allDone && !isReadOnly && (
        <div style={{ padding: '4px 20px 14px' }}>
          {markedComplete ? (
            /* After button click — just the confirmation text, no button */
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill={PROGRESS_GREEN} />
                <path d="M4 7.5l2 2L10 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, color: PROGRESS_GREEN, fontWeight: 600 }}>
                Session marked complete
              </span>
            </div>
          ) : (
            /* Show the button — this is the decisive action */
            <button
              onClick={onMarkComplete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: PROGRESS_GREEN,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                marginTop: 4,
                transition: 'background 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease',
                boxShadow: '0 2px 8px rgba(45,122,79,0.22)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#236040'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,122,79,0.32)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = PROGRESS_GREEN
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(45,122,79,0.22)'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill="rgba(255,255,255,0.25)" />
                <path d="M4 7.5l2 2L10 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Mark as Completed
            </button>
          )}
        </div>
      )}

      {/* AOM-advanced (isReadOnly): just show quiet confirmation */}
      {allDone && isReadOnly && (
        <div style={{ padding: '4px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill={PROGRESS_GREEN} />
              <path d="M4 7.5l2 2L10 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 13, color: PROGRESS_GREEN, fontWeight: 600 }}>
              All items checked off
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Client Session View ──────────────────────────────────────────────────────

function ClientView({ client, onLogout }) {
  const [showContact, setShowContact] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [contactSent, setContactSent] = useState(false)
  const [checklistCompleted, setChecklistCompleted] = useState({}) // { sessionNum: bool }
  // Client-side "I clicked Mark as Completed" — persisted to localStorage
  // This is separate from AOM advancing current_session; it's the client's own signal.
  const [clientMarkedDone, setClientMarkedDone] = useState(() => {
    try {
      const key = `ai_hours_client_marked_done_${client.access_code}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : {}
    } catch { return {} }
  })
  // Collapse state for completed sessions — persisted to localStorage
  // { sessionNum: true } means collapsed. Default: sessions start expanded so completed sessions are accessible.
  const [collapsedSessions, setCollapsedSessions] = useState(() => {
    try {
      const key = `ai_hours_collapsed_${client.access_code}`
      const stored = localStorage.getItem(key)
      if (stored) return JSON.parse(stored)
      // First visit: start all sessions expanded so completed sessions are accessible/reviewable
      return {}
    } catch { return {} }
  })
  const currentSession = parseInt(client.current_session, 10) || 1
  const isComplete = currentSession > 5
  // Whole course finished — same signal the step indicator uses for its all-green state.
  const programComplete = isComplete || (currentSession >= 5 && !!clientMarkedDone[5])
  const firstName = (client.client_name || '').trim().split(/\s+/)[0] || ''

  function getStatus(sessionNum) {
    if (sessionNum < currentSession) return 'done'
    if (sessionNum === currentSession && !isComplete) return 'current'
    return 'locked'
  }

  function handleChecklistComplete(sessionNum, allDone) {
    setChecklistCompleted(prev => ({ ...prev, [sessionNum]: allDone }))
  }

  function handleClientMarkDone(sessionNum) {
    const next = { ...clientMarkedDone, [sessionNum]: true }
    setClientMarkedDone(next)
    try {
      const key = `ai_hours_client_marked_done_${client.access_code}`
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}
    // Auto-collapse once the client marks it done
    toggleCollapsed(sessionNum, true)
  }

  function toggleCollapsed(sessionNum, forceCollapse) {
    setCollapsedSessions(prev => {
      const next = {
        ...prev,
        [sessionNum]: forceCollapse !== undefined ? forceCollapse : !prev[sessionNum],
      }
      try {
        const key = `ai_hours_collapsed_${client.access_code}`
        localStorage.setItem(key, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  function handleContactSubmit(e) {
    e.preventDefault()
    if (!contactMessage.trim()) return
 const subject = encodeURIComponent(`AI Hours Question, ${client.client_name}`)
 const body = encodeURIComponent(`Hi Courtney,\n\n${contactMessage.trim()}\n\n, ${client.client_name}`)
    window.location.href = `mailto:hello@aom-inhouse.com?subject=${subject}&body=${body}`
    setContactSent(true)
    setTimeout(() => {
      setShowContact(false)
      setContactMessage('')
      setContactSent(false)
    }, 3000)
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes aihours-fadein {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aihours-expand {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .aihours-collapse-chevron {
          transition: transform 0.22s ease;
        }
        .aihours-collapse-chevron.open {
          transform: rotate(180deg);
        }
        .aihours-session-body-collapsed {
          display: none;
        }
        .aihours-session-body-expanded {
          animation: aihours-expand 0.2s ease;
        }
        /* Touch target helpers for mobile */
        @media (max-width: 640px) {
          .aihours-collapse-header {
            min-height: 52px;
          }
        }
      `}</style>
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

      {/* ── Program Completion Congratulations — hero level, first thing seen ── */}
      {programComplete && (
        <div style={{
          background: INK,
          padding: '72px 40px',
          color: '#fff',
          animation: 'aihours-fadein 0.7s ease',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: AOM_ORANGE,
              marginBottom: 24,
            }}>
              All five sessions complete
            </div>

            <h2 style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 400,
              color: AOM_ORANGE_LIGHT,
              margin: '0 0 28px',
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              maxWidth: 700,
            }}>
              Congratulations&nbsp;&mdash;&nbsp;you&rsquo;ve completed AI Hours.
            </h2>

            <p style={{
              fontSize: 18,
              lineHeight: 1.72,
              color: 'rgba(245,240,235,0.88)',
              margin: '0 0 36px',
              maxWidth: 600,
            }}>
              You&rsquo;ve done the work. Five sessions, real tools, real results.
              Your business is already moving faster with AI, and this is just the beginning.
              Go build something great.
            </p>

            <p style={{
              fontSize: 15,
              lineHeight: 1.65,
              color: 'rgba(245,240,235,0.42)',
              margin: 0,
              fontStyle: 'italic',
            }}>
              Best of luck with your AI-enhanced business&nbsp;&mdash;&nbsp;we&rsquo;re rooting for you.
              <br />
              <span style={{ fontStyle: 'normal', color: 'rgba(245,240,235,0.55)', letterSpacing: '0.03em' }}>
                &mdash;&nbsp;AOM
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Session step indicator */}
      <SessionStepIndicator currentSession={currentSession} checklistCompleted={checklistCompleted} clientMarkedDone={clientMarkedDone} />

      {/* Sessions */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>
        <div style={styles.sectionLabel}>Your Sessions</div>
        <div style={styles.sessionsGrid}>
          {SESSIONS.map((session, i) => {
            const sessionNum = i + 1
            const status = getStatus(sessionNum)
            const isDone = status === 'done'
            // Client has clicked "Mark as Completed" on this session
            const clientDone = !!clientMarkedDone[sessionNum]
            // Visual complete state: either AOM-advanced OR client self-marked
            const showComplete = isDone || clientDone
            // Collapsed state — only applies to completed sessions
            const isCollapsed = showComplete && !!collapsedSessions[sessionNum]
            const isExpandable = showComplete // only completed sessions can collapse/expand

            return (
              <React.Fragment key={sessionNum}>
                <div
                  style={{
                    ...styles.sessionCard,
                    ...(status === 'current' && !clientDone ? styles.sessionCardActive : {}),
                    ...(status === 'locked' ? styles.sessionCardLocked : {}),
                    ...(showComplete ? {
                      borderColor: GREEN_CHECK_BORDER,
                      background: 'rgba(45,122,79,0.03)',
                      transition: 'border-color 0.45s ease, background 0.45s ease',
                    } : {}),
                  }}
                >
                  {/* Session header — clickable to collapse/expand when completed */}
                  <div
                    className="aihours-collapse-header"
                    style={{
                      ...styles.sessionHeader,
                      cursor: isExpandable ? 'pointer' : 'default',
                      ...(isCollapsed ? { padding: '16px 28px' } : {}),
                    }}
                    onClick={isExpandable ? () => toggleCollapsed(sessionNum) : undefined}
                    role={isExpandable ? 'button' : undefined}
                    aria-expanded={isExpandable ? !isCollapsed : undefined}
 aria-label={isExpandable ? `Session ${sessionNum}: ${session.title}, ${isCollapsed ? 'expand' : 'collapse'}` : undefined}
                  >
                    <div style={{
                      ...styles.sessionNumber,
                      ...(status === 'current' && !clientDone ? styles.sessionNumberActive : {}),
                      ...(showComplete ? { color: PROGRESS_GREEN } : {}),
                      ...(isCollapsed ? { fontSize: 24 } : {}),
                    }}>
                      {session.number}
                    </div>
                    <div style={styles.sessionInfo}>
                      <div style={styles.sessionTitle}>{session.title}</div>
                      {!isCollapsed && <div style={styles.sessionGoal}>{session.goal}</div>}
                    </div>
                    <div style={{ ...styles.sessionMeta, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        ...styles.sessionBadge,
                        ...(status === 'current' && !clientDone ? styles.sessionBadgeCurrent : {}),
                        ...(showComplete ? styles.sessionBadgeDone : {}),
                        ...(status === 'locked' ? styles.sessionBadgeLocked : {}),
                      }}>
                        {showComplete ? 'Complete' : status === 'current' ? 'Current' : 'Upcoming'}
                      </div>
                      <SessionStatusIcon status={showComplete ? 'done' : status} />
                      {/* Chevron for expandable completed sessions */}
                      {isExpandable && (
                        <svg
                          className={`aihours-collapse-chevron${isCollapsed ? '' : ' open'}`}
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          style={{ flexShrink: 0, opacity: 0.5 }}
                        >
                          <path d="M4 6l4 4 4-4" stroke={GREEN_CHECK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Session body — collapsible for completed, always visible for current */}
                  {status !== 'locked' && !isCollapsed && (
                    <div
                      className="aihours-session-body-expanded"
                      style={styles.sessionBody}
                    >
                      <p style={styles.sessionDesc}>{session.clientNotes}</p>
                      <div style={styles.leaveWith}>
                        <span style={styles.leaveWithLabel}>You'll leave with:</span>
                        <span>{session.leaveWith}</span>
                      </div>

                      {/* Inline checklist — current and done sessions */}
                      <SessionChecklist
                        sessionNumber={sessionNum}
                        accessCode={client.access_code}
                        onAllChecked={handleChecklistComplete}
                        isReadOnly={isDone || clientDone}
                        onMarkComplete={() => handleClientMarkDone(sessionNum)}
                        markedComplete={clientDone}
                      />
                    </div>
                  )}
                </div>

 {/* "Next up" teaser, appears below a session the client just marked complete */}
                {clientDone && !isDone && sessionNum < 5 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 20px',
                    margin: '-12px 0 0',
                    background: '#F5FBF8',
                    border: `1px solid ${GREEN_CHECK_BORDER}`,
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    animation: 'aihours-fadein 0.4s ease',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="8" cy="8" r="8" fill={PROGRESS_GREEN} opacity="0.15" />
                      <path d="M6 8l2 2 4-4" stroke={PROGRESS_GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 13, color: PROGRESS_GREEN, fontWeight: 600 }}>
                      Next up: Session {sessionNum + 1} — {SESSIONS[sessionNum].title}
                    </span>
                  </div>
                )}
              </React.Fragment>
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
          <button
            onClick={() => setShowContact(true)}
            style={{ ...styles.btn }}
          >
            Contact AOM
          </button>
        </div>
      </div>

      {/* ── Contact Modal ── */}
      {showContact && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,26,22,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9000, padding: 24,
          }}
          onClick={() => { setShowContact(false); setContactMessage(''); setContactSent(false) }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: 40, maxWidth: 460, width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {contactSent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="11" fill={GREEN_CHECK} />
                    <path d="M6.5 11.5l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 15, fontWeight: 700, color: GREEN_CHECK }}>Message sent</span>
                </div>
                <p style={{ fontSize: 14, color: INK_MUTED, margin: 0 }}>
                  Your email app should have opened. AOM will be in touch soon.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 8 }}>Send AOM a message</div>
                <p style={{ fontSize: 14, color: INK_MUTED, marginTop: 0, marginBottom: 24 }}>
                  Have a question between sessions? Reach out and we'll get back to you.
                </p>
                <form onSubmit={handleContactSubmit}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: INK, marginBottom: 8 }}>
                    Your message
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={5}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      padding: '12px 14px',
                      fontSize: 14,
                      color: INK,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <button
                      type="submit"
                      disabled={!contactMessage.trim()}
                      style={{
                        ...styles.btn,
                        opacity: contactMessage.trim() ? 1 : 0.5,
                        cursor: contactMessage.trim() ? 'pointer' : 'default',
                      }}
                    >
                      Send message
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowContact(false); setContactMessage('') }}
                      style={{ ...styles.btn, ...styles.btnSecondary }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
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
  const [showAddClient, setShowAddClient] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', notes: '' })
  const [addingSaving, setAddingSaving] = useState(false)
  const [addError, setAddError] = useState(null)
  const [newClientConfirm, setNewClientConfirm] = useState(null)
  const [markStates, setMarkStates] = useState({}) // { [clientId]: 'loading' | 'done' }
  const [markConfirm, setMarkConfirm] = useState(null) // { client_name, new_session }

  const WORDLIST = ['APEX', 'NOVA', 'EDGE', 'PEAK', 'CORE', 'GRID', 'LINK', 'MARK', 'NEXT', 'PLUS', 'RISE', 'STAR', 'BOLD', 'CALM', 'FLUX', 'GLOW', 'IRON', 'JADE', 'KEEN', 'LOFT', 'MINT', 'NODE', 'OPEN', 'PORT', 'REEF', 'SAGE', 'TIDE', 'VAST', 'WAVE', 'ZINC', 'ECHO', 'FAST', 'HERO', 'JUMP', 'LEAD', 'ONYX', 'PINE', 'RUBY', 'SAFE', 'WARD']

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

  function generateAccessCode(existingCount) {
    const word = WORDLIST[Math.floor(Math.random() * WORDLIST.length)]
    const num = String(existingCount + 1).padStart(3, '0')
    return `AOM-${word}-${num}`
  }

  async function handleAddClient(e) {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.email.trim()) return
    setAddingSaving(true)
    setAddError(null)
    const access_code = generateAccessCode(clients.length)
    const client_name = addForm.name.trim()
    const client_email = addForm.email.trim()
    const { data, error } = await supabase
      .from('ai_hours_clients')
      .insert({
        access_code,
        client_name,
        email: client_email,
        current_session: 1,
        granted_by: 'aom',
        notes: addForm.notes.trim() || null,
      })
      .select()
      .single()
    if (error) {
      setAddError(error.message)
      setAddingSaving(false)
      return
    }
    // Send welcome email to client + confirmation to facilitator
    try {
      await fetch('/api/ai-hours/send-client-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name, client_email, access_code }),
      })
    } catch {
      // Non-fatal — client was created; email failure shouldn't block the flow
    }
    setNewClientConfirm({ access_code, client_name })
    setAddForm({ name: '', email: '', notes: '' })
    setAddingSaving(false)
    await loadClients()
  }

  function closeAddClientModal() {
    setShowAddClient(false)
    setAddForm({ name: '', email: '', notes: '' })
    setAddError(null)
    setNewClientConfirm(null)
  }

  async function handleMarkComplete(client) {
    if (client.current_session >= 5) return
    const clientId = client.id
    setMarkStates(prev => ({ ...prev, [clientId]: 'loading' }))
    try {
      const newSession = client.current_session + 1
      const { error } = await supabase
        .from('ai_hours_clients')
        .update({ current_session: newSession })
        .eq('id', clientId)
      if (error) throw error
      setMarkConfirm({ client_name: client.client_name, new_session: newSession })
      await loadClients()
      setTimeout(() => {
        setMarkStates(prev => { const s = { ...prev }; delete s[clientId]; return s })
        setMarkConfirm(null)
      }, 6000)
    } catch {
      setMarkStates(prev => { const s = { ...prev }; delete s[clientId]; return s })
    }
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
              <div style={{ ...styles.sectionLabel, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                Client Management
              </div>
              <button
                onClick={() => setShowAddClient(true)}
                style={{ ...styles.btn, fontSize: 13, padding: '10px 18px' }}
              >
                + Add Client
              </button>
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
 <div style={{ fontSize: 32, marginBottom: 16 }}>·</div>
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
                      <th style={styles.th}>Action</th>
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
 <span style={{ color: LOCK_GRAY, fontSize: 13 }}>·</span>
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
                        <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                          {client.current_session >= 5 ? (
                            <span style={{ fontSize: 12, color: GREEN_CHECK, fontWeight: 600 }}>✓ Complete</span>
                          ) : (
                            <button
                              onClick={() => handleMarkComplete(client)}
                              disabled={markStates[client.id] === 'loading'}
                              style={{
                                fontSize: 12,
                                padding: '6px 14px',
                                background: markStates[client.id] === 'loading' ? BORDER : AOM_ORANGE,
                                color: markStates[client.id] === 'loading' ? INK_MUTED : '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: markStates[client.id] === 'loading' ? 'default' : 'pointer',
                                fontWeight: 600,
                                transition: 'background 0.15s',
                              }}
                            >
                              {markStates[client.id] === 'loading' ? 'Saving…' : 'Mark Complete'}
                            </button>
                          )}
                        </td>
                        <td style={{ ...styles.td, fontSize: 13, color: INK_MUTED, maxWidth: 200 }}>
 {client.notes || '·'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {markConfirm && (
              <div style={{
                marginTop: 20,
                background: '#F0FBF4',
                border: `1px solid ${GREEN_CHECK}`,
                borderRadius: 8,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="11" fill={GREEN_CHECK} />
                  <path d="M6.5 11.5l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 14, color: GREEN_CHECK, fontWeight: 600 }}>
                  Session {markConfirm.new_session} unlocked for {markConfirm.client_name}
                </span>
              </div>
            )}
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

      {/* ── Add Client Modal ── */}
      {showAddClient && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,26,22,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9000, padding: 24,
          }}
          onClick={closeAddClientModal}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: 40, maxWidth: 480, width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {newClientConfirm ? (
              /* ── Confirmation ── */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="11" fill={GREEN_CHECK} />
                    <path d="M6.5 11.5l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 15, fontWeight: 700, color: GREEN_CHECK }}>Client Added</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 24 }}>
                  {newClientConfirm.client_name}
                </div>
                <div style={{
                  background: CREAM_WARM, border: `1px solid ${BORDER}`, borderRadius: 8,
                  padding: '24px 28px', marginBottom: 24, textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: INK_MUTED, marginBottom: 12,
                  }}>
                    Access Code — Share with client
                  </div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: 30, fontWeight: 700,
                    color: AOM_ORANGE, letterSpacing: '0.06em', marginBottom: 16,
                  }}>
                    {newClientConfirm.access_code}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(newClientConfirm.access_code)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', background: '#fff', color: INK,
                      border: `1px solid ${BORDER}`, borderRadius: 6,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Copy Code
                  </button>
                </div>
                <p style={{ fontSize: 14, color: INK_MUTED, lineHeight: 1.65, marginBottom: 28 }}>
                  Give this code to your client. They'll enter it at <strong>/ai-hours</strong> to access their sessions and track their progress.
                </p>
                <button
                  onClick={closeAddClientModal}
                  style={{ ...styles.btn, width: '100%', justifyContent: 'center' }}
                >
                  Done
                </button>
              </>
            ) : (
              /* ── Form ── */
              <>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: INK, margin: '0 0 6px' }}>Add Client</h2>
                  <p style={{ fontSize: 14, color: INK_MUTED, margin: 0 }}>
                    An access code will be generated automatically.
                  </p>
                </div>
                <form onSubmit={handleAddClient}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: INK_MUTED,
                      display: 'block', marginBottom: 6,
                    }}>
                      Client Name <span style={{ color: AOM_ORANGE }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ambition Mechanical"
                      value={addForm.name}
                      onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                      required
                      autoFocus
                      style={{
                        ...styles.input, letterSpacing: 'normal', textTransform: 'none',
                        padding: '12px 14px', fontSize: 15,
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: INK_MUTED,
                      display: 'block', marginBottom: 6,
                    }}>
                      Email <span style={{ color: AOM_ORANGE, fontWeight: 700, fontSize: 13 }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={addForm.email}
                      onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                      required
                      style={{
                        ...styles.input, letterSpacing: 'normal', textTransform: 'none',
                        padding: '12px 14px', fontSize: 15,
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: INK_MUTED,
                      display: 'block', marginBottom: 6,
                    }}>
                      Notes <span style={{ color: LOCK_GRAY, fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                      placeholder="e.g. HVAC contractor, Phoenix metro, first session June 10..."
                      value={addForm.notes}
                      onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      style={{
                        ...styles.input, letterSpacing: 'normal', textTransform: 'none',
                        padding: '12px 14px', fontSize: 15,
                        resize: 'vertical', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  {addError && <div style={{ ...styles.errorBox, marginBottom: 16 }}>{addError}</div>}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={closeAddClientModal}
                      style={{ ...styles.btn, ...styles.btnSecondary, flex: 1, justifyContent: 'center' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!addForm.name.trim() || !addForm.email.trim() || addingSaving}
                      style={{
                        ...styles.btn, flex: 2, justifyContent: 'center',
                        opacity: (!addForm.name.trim() || !addForm.email.trim() || addingSaving) ? 0.65 : 1,
                      }}
                    >
                      {addingSaving ? 'Adding...' : 'Add Client →'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIHoursLearning() {
  const [mode, setMode] = useState('loading') // 'loading' | 'gate' | 'client' | 'completion'
  const [clientData, setClientData] = useState(null)
  const [completedSession, setCompletedSession] = useState(null) // { from, to }

  useEffect(() => {
    async function init() {
      // Always show the client access code screen first — no auto-redirects to admin.
      // If a facilitator wants to access admin, they click the tiny "Admin" link at the bottom.
      // The Admin link checks for an existing session and redirects directly without re-auth.

      // Check for stored client session
      const stored = localStorage.getItem('ai_hours_client')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed?.access_code) {
            // Refresh from DB via API endpoint (service-role, bypasses RLS) to get latest session status
            const res = await fetch(`/api/ai-hours/clients?access_code=${encodeURIComponent(parsed.access_code)}`)
            if (res.ok) {
              const result = await res.json()
              if (result.ok && result.client) {
                const data = result.client
                const storedSession = parsed.current_session || 1
                const dbSession = data.current_session || 1
                // Detect if AOM advanced the client since their last visit
                if (dbSession > storedSession) {
                  setClientData(data)
                  setCompletedSession({ from: storedSession, to: dbSession })
                  setMode('completion')
                  return
                }
                // No advancement — update localStorage with fresh data and go to client view
                localStorage.setItem('ai_hours_client', JSON.stringify(data))
                setClientData(data)
                setMode('client')
                return
              }
            }
            // If API returns 404 or access code is invalid, clear the stale session
            localStorage.removeItem('ai_hours_client')
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
    localStorage.removeItem('ai_hours_client')
    setMode('gate')
    setClientData(null)
    setCompletedSession(null)
  }

  function handleCompletionContinue() {
    // Update localStorage with new session data so next visit won't re-trigger the screen
    if (clientData) {
      localStorage.setItem('ai_hours_client', JSON.stringify(clientData))
    }
    setCompletedSession(null)
    setMode('client')
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
    return (
      <AccessCodeGate
        onClientSuccess={data => {
          localStorage.setItem('ai_hours_client', JSON.stringify(data))
          setClientData(data)
          setMode('client')
        }}
      />
    )
  }

  if (mode === 'completion' && completedSession) {
    return (
      <CompletionScreen
        completedSession={completedSession.from}
        newSession={completedSession.to}
        onContinue={handleCompletionContinue}
      />
    )
  }

  if (mode === 'client') {
    return (
      <ClientView
        client={clientData}
        onLogout={handleLogout}
      />
    )
  }

  return null
}