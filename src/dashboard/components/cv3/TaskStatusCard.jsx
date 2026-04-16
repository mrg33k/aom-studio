// TaskStatusCard -- inline task status card for chat messages.
// Port of Steffen's CV3 task-completion card design (public/cv3.html `.tc` / `.tc.bld`)
// into React, extended with queued / in_progress / needs_input / failed variants.
//
// Visual contract (from cv3.html lines 108-122 + design-specs/project-welcome-card-redesign.md):
//   - completed / done: bright colored background (agent palette), dark text, QA score on right
//   - in_progress:       dark bg with animated yellow top bar (`.tc.bld`)
//   - queued:            dark bg with static yellow corner accent
//   - needs_input:       amber background, question prominent, reply hint
//   - failed:            loud red background, bold error message (fail-loud task 1eb1ff96)
//
// Typography:
//   title:  Inter 800 16px, letter-spacing -0.01em, #0A0A0A on bright
//   tags:   Inter 700 9px, uppercase, 0.06em tracking, rgba(0,0,0,0.4)
//   score:  JetBrains Mono 800 20px, rgba(0,0,0,0.55)
//   label:  Inter 600 8px, uppercase
import { useMemo } from 'react'
import { C } from '../../lib/cv3Colors.js'

const AGENT_CARD_COLORS = {
  bobby:   '#FB923C',
  colton:  '#FB923C',
  steffen: '#A78BFA',
  gary:    '#2DD4BF',
  alex:    '#22C55E',
  tony:    '#22C55E',
  jacob:   '#EAB308',
  elon:    '#60A5FA',
  cleo:    '#F472B6',
  rex:     '#10B981',
}
const FALLBACK_PALETTE = ['#EAB308', '#22C55E', '#A78BFA', '#60A5FA', '#F472B6', '#FB923C', '#2DD4BF']

function pickColor(agent, seed = 0) {
  const key = (agent || '').toLowerCase()
  if (AGENT_CARD_COLORS[key]) return AGENT_CARD_COLORS[key]
  const hash = [...(agent || 'task')].reduce((a, c) => a + c.charCodeAt(0), 0)
  return FALLBACK_PALETTE[(hash + seed) % FALLBACK_PALETTE.length]
}

// Result payload renderer -- mirrors TasksPanel.ResultPreview but scoped for
// the chat card. Supports: link, image, video, text, check_external.
function PayloadPreview({ payload, onDarkBg }) {
  if (!payload || typeof payload !== 'object' || !payload.type) return null
  const { type, payload: value, summary } = payload
  const boxBg = onDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const textColor = onDarkBg ? 'rgba(240,244,255,0.92)' : 'rgba(0,0,0,0.82)'
  const summaryColor = onDarkBg ? 'rgba(240,244,255,0.58)' : 'rgba(0,0,0,0.58)'
  const box = {
    padding: '9px 11px',
    marginTop: 10,
    borderRadius: 10,
    background: boxBg,
    fontFamily: "'Inter', sans-serif",
  }
  const summaryStyle = {
    fontSize: 11,
    color: summaryColor,
    marginTop: summary ? 6 : 0,
    lineHeight: 1.4,
  }

  if (type === 'link') {
    return (
      <div style={box}>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'inline-block',
            padding: '5px 12px',
            borderRadius: 6,
            background: onDarkBg ? 'rgba(16,185,129,0.22)' : 'rgba(0,0,0,0.12)',
            color: onDarkBg ? 'rgba(187,247,208,0.95)' : 'rgba(0,0,0,0.9)',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
          }}
        >Open link ↗</a>
        {summary ? <div style={summaryStyle}>{summary}</div> : null}
      </div>
    )
  }
  if (type === 'image') {
    return (
      <div style={box}>
        <img
          src={value}
          alt={summary || 'result'}
          style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, display: 'block' }}
        />
        {summary ? <div style={summaryStyle}>{summary}</div> : null}
      </div>
    )
  }
  if (type === 'video') {
    return (
      <div style={box}>
        <video
          src={value}
          controls
          style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, display: 'block' }}
          onClick={e => e.stopPropagation()}
        />
        {summary ? <div style={summaryStyle}>{summary}</div> : null}
      </div>
    )
  }
  if (type === 'text') {
    return (
      <div style={box}>
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          maxHeight: 150,
          overflow: 'auto',
          color: textColor,
        }}>{value}</pre>
        {summary ? <div style={summaryStyle}>{summary}</div> : null}
      </div>
    )
  }
  if (type === 'check_external') {
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 11,
            background: onDarkBg ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.35)',
            color: onDarkBg ? 'rgba(253,230,138,0.95)' : '#7A5A00',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>!</span>
          <span style={{ fontSize: 12, color: textColor }}>{value}</span>
        </div>
        {summary ? <div style={summaryStyle}>{summary}</div> : null}
      </div>
    )
  }
  return null
}

// Normalize incoming status into one of our 5 canonical variants.
export function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase().trim()
  if (['done', 'complete', 'completed', 'shipped'].includes(s)) return 'completed'
  if (['failed', 'fail', 'error', 'rejected'].includes(s)) return 'failed'
  if (['needs_input', 'checkpoint', 'needs-input', 'waiting', 'blocked'].includes(s)) return 'needs_input'
  if (['queued', 'pending'].includes(s)) return 'queued'
  if (['running', 'building', 'active', 'in_progress', 'in-progress', 'planning', 'qa', 'classifying', 'started'].includes(s)) return 'in_progress'
  return 'in_progress'
}

export default function TaskStatusCard({
  status,
  title,
  description,
  agent,
  project,
  qaScore,
  payload,
  errorMessage,
  question,
  timestamp,
  colorSeed = 0,
  formatTime = v => v,
}) {
  const variant = normalizeStatus(status)

  // Bright-card variants use the agent palette; dark variants use surface colors.
  const brightColor = useMemo(() => pickColor(agent, colorSeed), [agent, colorSeed])

  // ── Completed: bright colored card, Steffen's .tc design ──────────────────
  if (variant === 'completed') {
    return (
      <div style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: brightColor,
        maxWidth: '88%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 16, fontWeight: 800,
              lineHeight: 1.2, letterSpacing: '-0.01em',
              color: '#0A0A0A',
              fontFamily: "'Inter', sans-serif",
            }}>
              {title || 'Task Complete'}
            </div>
            {(agent || project) && (
              <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                {agent && (
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: 'rgba(0,0,0,0.45)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{agent}</span>
                )}
                {project && (
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: 'rgba(0,0,0,0.45)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{project}</span>
                )}
              </div>
            )}
          </div>
          {qaScore != null && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20, fontWeight: 800,
                color: 'rgba(0,0,0,0.6)',
                lineHeight: 1,
              }}>{qaScore}</div>
              <div style={{
                fontSize: 8, fontWeight: 600,
                color: 'rgba(0,0,0,0.35)',
                textTransform: 'uppercase', textAlign: 'right',
                marginTop: 3,
              }}>QA</div>
            </div>
          )}
        </div>
        {description && (
          <div style={{
            fontSize: 12, color: 'rgba(0,0,0,0.62)',
            marginTop: 8, lineHeight: 1.4,
            fontFamily: "'Inter', sans-serif",
          }}>{description}</div>
        )}
        <PayloadPreview payload={payload} onDarkBg={false} />
        {timestamp && (
          <div style={{
            fontSize: 10, color: 'rgba(0,0,0,0.4)',
            marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{formatTime(timestamp)}</div>
        )}
      </div>
    )
  }

  // ── Failed: loud red bright card (fail-loud) ──────────────────────────────
  if (variant === 'failed') {
    return (
      <div style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: C.red,
        maxWidth: '88%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 6px 20px rgba(239,68,68,0.28)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 6,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, color: '#fff',
          }}>!</div>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: '#fff',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontFamily: "'JetBrains Mono', monospace",
          }}>Task Failed</span>
        </div>
        <div style={{
          fontSize: 16, fontWeight: 800,
          lineHeight: 1.2, letterSpacing: '-0.01em',
          color: '#0A0A0A',
          fontFamily: "'Inter', sans-serif",
        }}>{title || 'Task Failed'}</div>
        {(agent || project) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
            {agent && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{agent}</span>
            )}
            {project && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{project}</span>
            )}
          </div>
        )}
        {(errorMessage || description) && (
          <div style={{
            marginTop: 10,
            padding: '9px 11px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.22)',
            fontSize: 12.5,
            fontWeight: 500,
            color: '#FEE2E2',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            fontFamily: "'Inter', sans-serif",
          }}>{errorMessage || description}</div>
        )}
        {timestamp && (
          <div style={{
            fontSize: 10, color: 'rgba(0,0,0,0.45)',
            marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{formatTime(timestamp)}</div>
        )}
      </div>
    )
  }

  // ── Needs input: amber bright card ────────────────────────────────────────
  if (variant === 'needs_input') {
    const questionText = question || description || title
    return (
      <div style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: C.yellow,
        maxWidth: '88%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 6px 20px rgba(234,179,8,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 6,
            background: 'rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, color: '#0A0A0A',
          }}>?</div>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: '#0A0A0A',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontFamily: "'JetBrains Mono', monospace",
          }}>Needs Input</span>
        </div>
        {title && title !== questionText && (
          <div style={{
            fontSize: 16, fontWeight: 800,
            lineHeight: 1.2, letterSpacing: '-0.01em',
            color: '#0A0A0A',
            fontFamily: "'Inter', sans-serif",
          }}>{title}</div>
        )}
        {(agent || project) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
            {agent && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{agent}</span>
            )}
            {project && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{project}</span>
            )}
          </div>
        )}
        {questionText && (
          <div style={{
            marginTop: 10,
            padding: '9px 11px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.14)',
            fontSize: 13,
            fontWeight: 500,
            color: '#0A0A0A',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            fontFamily: "'Inter', sans-serif",
          }}>{questionText}</div>
        )}
        <div style={{
          marginTop: 8,
          fontSize: 10, fontWeight: 600,
          color: 'rgba(0,0,0,0.55)',
          fontFamily: "'Inter', sans-serif",
        }}>Reply below to unblock.</div>
        {timestamp && (
          <div style={{
            fontSize: 10, color: 'rgba(0,0,0,0.4)',
            marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{formatTime(timestamp)}</div>
        )}
      </div>
    )
  }

  // ── In progress + queued: dark card with yellow accent (`.tc.bld` port) ───
  const isBuilding = variant === 'in_progress'
  const accent = C.yellow
  const label = isBuilding ? 'Running' : 'Queued'
  const icon = isBuilding ? '▶' : '+'
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: C.s2,
      border: `1px solid ${isBuilding ? 'rgba(234,179,8,0.18)' : 'rgba(234,179,8,0.08)'}`,
      maxWidth: '88%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {isBuilding && (
        <div
          className="cv3-tsc-bld-bar"
          style={{
            position: 'absolute', top: 0, left: 0,
            height: 2, background: accent,
            borderRadius: '14px 14px 0 0',
            animation: 'cv3TscBld 5s ease-in-out infinite',
          }}
        />
      )}
      {!isBuilding && (
        <div style={{
          position: 'absolute', top: 0, left: 0,
          height: 2, width: '30%', background: 'rgba(234,179,8,0.5)',
          borderRadius: '14px 14px 0 0',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 6,
          background: 'rgba(234,179,8,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: accent,
        }}>{icon}</div>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: accent,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: "'JetBrains Mono', monospace",
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: accent,
        lineHeight: 1.25, letterSpacing: '-0.01em',
        fontFamily: "'Inter', sans-serif",
      }}>{title || (isBuilding ? 'Working on task…' : 'Queued task')}</div>
      {description && (
        <div style={{
          fontSize: 12, color: C.muted,
          marginTop: 4, lineHeight: 1.4,
          fontFamily: "'Inter', sans-serif",
        }}>{description}</div>
      )}
      {(agent || project) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {agent && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{agent}</span>
          )}
          {project && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{project}</span>
          )}
        </div>
      )}
      {timestamp && (
        <div style={{
          fontSize: 10, color: C.dim,
          marginTop: 8,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{formatTime(timestamp)}</div>
      )}
    </div>
  )
}

// Keyframes for the in-progress top bar. Mounted once via a <style> tag.
export function TaskStatusCardStyles() {
  return (
    <style>{`
      @keyframes cv3TscBld {
        0%   { width: 5%; }
        50%  { width: 60%; }
        100% { width: 90%; }
      }
    `}</style>
  )
}

// ── Text parser for task-status messages ──────────────────────────────────────
// Handles the formats emitted by AOM-EA/scripts/post-task-chat-message.py:
//   done          -> "Task done: <title>. <summary>. <link?>"
//   failed        -> "Task failed: <title>. Reason: <err>. I'm on it ..."
//   needs_input   -> "Task needs input: <title>\n\nQuestion: <q>"
// Also handles lifecycle prefixes emitted by task-runner.sh:
//   "Task started: <title>" / "Task queued: <title>" / "Task running: <title>"
export function parseTaskMessageText(text = '') {
  const t = (text || '').trim()
  if (!t) return null

  const niMatch = t.match(/^Task needs input:\s*([\s\S]+)$/i)
  if (niMatch) {
    const rest = niMatch[1]
    const qIdx = rest.search(/\n\s*Question:\s*/i)
    let title = rest
    let question = ''
    if (qIdx >= 0) {
      title = rest.slice(0, qIdx).trim()
      question = rest.slice(qIdx).replace(/^\s*\n\s*Question:\s*/i, '').trim()
    } else {
      title = rest.trim()
    }
    return {
      status: 'needs_input',
      title: title.replace(/[.\s]+$/, '').trim(),
      question,
    }
  }

  const failMatch = t.match(/^Task failed:\s*([^.\n]+?)\.\s*([\s\S]*)$/i)
  if (failMatch) {
    const title = failMatch[1].trim()
    const rest = (failMatch[2] || '').trim()
    // "Reason: <err>. I'm on it — ..." — pull err, drop the trailing hand-hold.
    let errorMessage = rest
    const reasonMatch = rest.match(/^Reason:\s*([\s\S]*)$/i)
    if (reasonMatch) errorMessage = reasonMatch[1].trim()
    errorMessage = errorMessage.split(/\.\s*I'?m on it/i)[0].trim().replace(/[.\s]+$/, '').trim()
    if (!errorMessage) errorMessage = 'no reason supplied'
    return { status: 'failed', title, errorMessage }
  }

  const doneMatch = t.match(/^Task done:\s*([^.\n]+?)\.\s*([\s\S]*)$/i)
  if (doneMatch) {
    const title = doneMatch[1].trim()
    const rest = (doneMatch[2] || '').trim()
    const urlMatch = rest.match(/https?:\/\/\S+/)
    if (urlMatch) {
      const url = urlMatch[0].replace(/[.,)\]]+$/, '')
      const summary = rest.replace(urlMatch[0], '').trim().replace(/[.\s]+$/, '').trim()
      return {
        status: 'completed',
        title,
        description: summary || undefined,
        payload: { type: 'link', payload: url, summary },
      }
    }
    return {
      status: 'completed',
      title,
      description: rest.replace(/[.\s]+$/, '').trim() || undefined,
    }
  }

  const startMatch = t.match(/^Task (started|running|building|in progress):\s*(.+)$/i)
  if (startMatch) {
    return { status: 'in_progress', title: startMatch[2].split('\n')[0].trim() }
  }

  const queueMatch = t.match(/^Task queued:\s*(.+)$/i)
  if (queueMatch) {
    return { status: 'queued', title: queueMatch[1].split('\n')[0].trim() }
  }

  return null
}

// Detect task-status messages in a chat row and render them as a TaskStatusCard.
// Returns a React element wrapped in the standard flex row, or null if the
// message is not a task-status message (caller falls back to default bubble).
// Used by ThreadView and ProjectChatView so the card shows up wherever the
// message lands (agent thread + project room crosspost).
export function renderTaskCardForMessage(msg, { selectedAgent, formatTime = v => v } = {}) {
  if (!msg) return null
  const source = msg.source || ''
  const meta = msg.metadata || {}
  const text = msg.text || ''

  const wrap = (card) => (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>{card}</div>
  )

  // Checkpoint -> needs_input (structured metadata carries the question).
  if (source === 'checkpoint') {
    const question = meta.question || text
    const title = meta.task_title || meta.title
    const cardAgent = meta.agent || msg.agent || selectedAgent?.name
    const project = meta.project || meta.project_name || msg.project
    return wrap(
      <TaskStatusCard
        status="needs_input"
        title={title}
        question={question}
        agent={cardAgent}
        project={project}
        timestamp={msg.timestamp}
        formatTime={formatTime}
      />,
    )
  }

  // task-runner: lifecycle notifications (queued / running / done / failed).
  if (source === 'task-runner') {
    const qaMatch = text.match(/QA:\s*(\d+(?:\.\d+)?)/i)
    const qaScore = qaMatch ? parseFloat(qaMatch[1]) : (meta.qa_score ?? null)
    const rawLines = text.split('\n').filter(l => l.trim())
    const rawTitle = rawLines[0] || ''
    const taskTitle = meta.task_title
      || rawTitle.replace(/^(task\s+(started|complete[d]?|failed|done|queued)[:\s]*)/i, '').trim()
      || rawTitle
    const taskDesc = rawLines.slice(1).join(' ').trim()
    let status = meta.status
    if (!status) {
      if (/fail/i.test(text)) status = 'failed'
      else if (/^task started|running|building|in progress/i.test(text)) status = 'in_progress'
      else if (/^task queued|queued/i.test(text)) status = 'queued'
      else status = 'completed'
    }
    const cardAgent = meta.agent || msg.agent || selectedAgent?.name
    const project = meta.project || meta.project_name || msg.project
    const payload = meta.result_payload
    const errorMessage = status === 'failed' ? (meta.error || taskDesc || text) : undefined
    return wrap(
      <TaskStatusCard
        status={status}
        title={taskTitle}
        description={status === 'failed' ? undefined : taskDesc}
        agent={cardAgent}
        project={project}
        qaScore={qaScore}
        payload={payload}
        errorMessage={errorMessage}
        timestamp={msg.timestamp}
        formatTime={formatTime}
      />,
    )
  }

  // task-completion / task-completion-crosspost / task-notification.
  // These come from AOM-EA/scripts/post-task-chat-message.py and land in the
  // owning agent's thread + the project crosspost client_id. Metadata may be
  // null on historical rows, so we always fall back to text parsing.
  if (
    source === 'task-completion'
    || source === 'task-completion-crosspost'
    || source === 'task-notification'
  ) {
    const parsed = parseTaskMessageText(text) || {}
    const status = meta.status || parsed.status || 'completed'
    const title = meta.task_title || meta.title || parsed.title || ''
    const description = meta.description || parsed.description
    const question = meta.question || parsed.question
    const errorMessage = meta.error || meta.error_message || parsed.errorMessage
    const payload = meta.result_payload || parsed.payload
    const qaScore = meta.qa_score ?? null
    const cardAgent = meta.agent || meta.task_agent || msg.agent || selectedAgent?.name
    const project = meta.project || meta.project_name || msg.project
    return wrap(
      <TaskStatusCard
        status={status}
        title={title}
        description={status === 'failed' ? undefined : description}
        question={question}
        agent={cardAgent}
        project={project}
        qaScore={qaScore}
        payload={payload}
        errorMessage={errorMessage}
        timestamp={msg.timestamp}
        formatTime={formatTime}
      />,
    )
  }

  // Rex "Task created" announcements from front desk -> queued variant.
  if (source === 'gemini-chat' && msg.agent === 'rex' && text.toLowerCase().includes('task created')) {
    const textLines = text.split('\n').filter(l => l.trim())
    const firstLine = textLines[0] || ''
    const titleMatch = firstLine.match(/task created[:\s]+(.+)/i)
    const taskTitle = (titleMatch ? titleMatch[1].trim() : firstLine.replace(/task created/i, '').trim()) || 'New Task'
    const taskDesc = textLines.slice(1).join(' ').trim()
    const agentMatch = text.match(/(?:assigned to|for agent|agent[:\s]+)\s*([A-Za-z]+)/i)
    const taskAgent = agentMatch ? agentMatch[1] : (meta.agent || selectedAgent?.name || '')
    return wrap(
      <TaskStatusCard
        status="queued"
        title={taskTitle}
        description={taskDesc}
        agent={taskAgent}
        project={meta.project || msg.project}
        timestamp={msg.timestamp}
        formatTime={formatTime}
      />,
    )
  }

  // Fallback: any message whose text begins with a task-status prefix.
  // Catches messages from unknown sources that still use the expected shape.
  if (/^Task (done|failed|needs input|queued|running|started|building|in progress):/i.test(text)) {
    const parsed = parseTaskMessageText(text)
    if (parsed) {
      return wrap(
        <TaskStatusCard
          status={parsed.status}
          title={parsed.title}
          description={parsed.status === 'failed' ? undefined : parsed.description}
          question={parsed.question}
          payload={parsed.payload}
          errorMessage={parsed.errorMessage}
          agent={meta.agent || msg.agent || selectedAgent?.name}
          project={meta.project || msg.project}
          timestamp={msg.timestamp}
          formatTime={formatTime}
        />,
      )
    }
  }

  return null
}
