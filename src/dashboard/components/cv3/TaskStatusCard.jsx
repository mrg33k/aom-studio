// TaskStatusCard -- inline task status card for chat messages.
// Visual spec: Steffen's .m-task card in public/cv3.html (lines 157-166).
// Base card is a subtle dark surface (var(--s1)) with a small color-coded head
// (icon + label), title, description, and a foot with a status pill + agent/
// project tags. All five runtime states reuse the same shell and swap the
// head/pill color tokens to communicate state.
//
// .m-task   background var(--s1), border var(--border), radius 14, pad 12/16, max-w 88%
// .mt-head  flex gap 6, mb 6
// .mt-icon  18x18 rounded 6, state-tinted bg, 10/800 state color
// .mt-label 10/700 uppercase 0.06em JetBrains Mono, state color
// .mt-title 14/700
// .mt-desc  12 muted, mt 3, line-height 1.4
// .mt-foot  flex gap 8, mt 8
// .mt-pill  9/700 padding 3/8 radius 6 JetBrains Mono
//   .q bg rgba(234,179,8,.12) / yellow     (queued / running / needs_input)
//   .d bg rgba(34,197,94,.12) / green      (done)
//   .f bg rgba(239,68,68,.12) / red        (failed — derived, same pattern)
// .mt-agent 10/600 muted
//
// Running adds a 2px animated yellow bar on the top edge, ported from
// .tc.bld::before @keyframes bld in public/cv3.html (lines 121-122).
import { C } from '../../lib/cv3Colors.js'

// State-color config: one source of truth for icon/label/pill theming.
const VARIANT = {
  queued:      { color: C.yellow, icon: '+', label: 'Task Queued',  pill: 'Queued'   },
  in_progress: { color: C.yellow, icon: '▶', label: 'Running',      pill: 'Building' },
  completed:   { color: C.green,  icon: '✓', label: 'Task Done',    pill: 'Done'     },
  needs_input: { color: C.yellow, icon: '?', label: 'Needs Input',  pill: 'Waiting'  },
  failed:      { color: C.red,    icon: '!', label: 'Task Failed',  pill: 'Failed'   },
}

// rgba() wrapper -- build the .12 alpha tint that Steffen uses for mt-icon bg
// and mt-pill bg. Keeps us token-consistent instead of hard-coding hex alphas.
function tint(hex, alpha = 0.12) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Result payload renderer for the 'done' variant. Mirrors TasksPanel.ResultPreview
// but keeps the color palette on the dark .m-task surface.
function PayloadPreview({ payload }) {
  if (!payload || typeof payload !== 'object' || !payload.type) return null
  const { type, payload: value, summary } = payload
  const box = {
    padding: '9px 11px',
    marginTop: 8,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${C.border}`,
    fontFamily: "'Inter', sans-serif",
  }
  const summaryStyle = {
    fontSize: 11,
    color: C.muted,
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
            background: tint(C.green, 0.12),
            color: C.green,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
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
          color: C.text2,
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
            background: tint(C.yellow, 0.18),
            color: C.yellow,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>!</span>
          <span style={{ fontSize: 12, color: C.text2 }}>{value}</span>
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
  formatTime = v => v,
}) {
  const variant = normalizeStatus(status)
  const cfg = VARIANT[variant]

  // The question text for needs_input -- prefer explicit prop, then
  // description, then title so we always have something to render.
  const questionText = variant === 'needs_input' ? (question || description || title) : null
  // Suppress description-duplicate when needs_input falls back to it.
  const shownDescription =
    variant === 'needs_input' && description && description === questionText
      ? null
      : description

  const isRunning = variant === 'in_progress'

  return (
    <div style={{
      alignSelf: 'flex-start',
      background: C.s1,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: '12px 16px',
      maxWidth: '88%',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Running: animated top accent bar (port of .tc.bld::before) */}
      {isRunning && (
        <div
          className="cv3-tsc-bld-bar"
          style={{
            position: 'absolute', top: 0, left: 0,
            height: 2, background: C.yellow,
            borderRadius: '14px 14px 0 0',
            animation: 'cv3TscBld 5s ease-in-out infinite',
          }}
        />
      )}

      {/* mt-head */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 6,
          background: tint(cfg.color, 0.08),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: cfg.color,
        }}>{cfg.icon}</div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: cfg.color,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: "'JetBrains Mono', monospace",
        }}>{cfg.label}</span>
      </div>

      {/* mt-title */}
      {title && (
        <div style={{
          fontSize: 14, fontWeight: 700, color: C.text,
        }}>{title}</div>
      )}

      {/* mt-desc */}
      {shownDescription && (
        <div style={{
          fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4,
        }}>{shownDescription}</div>
      )}

      {/* needs_input: pulled-out question block */}
      {questionText && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: tint(cfg.color, 0.08),
          border: `1px solid ${tint(cfg.color, 0.18)}`,
          fontSize: 12.5, fontWeight: 500,
          color: C.text, lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
        }}>{questionText}</div>
      )}

      {/* failed: pulled-out error message block */}
      {variant === 'failed' && (errorMessage || description) && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: tint(C.red, 0.08),
          border: `1px solid ${tint(C.red, 0.18)}`,
          fontSize: 12.5, fontWeight: 500,
          color: '#FECACA', lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
        }}>{errorMessage || description}</div>
      )}

      {/* done: payload preview */}
      {variant === 'completed' && <PayloadPreview payload={payload} />}

      {/* mt-foot */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700,
          padding: '3px 8px', borderRadius: 6,
          fontFamily: "'JetBrains Mono', monospace",
          background: tint(cfg.color, 0.12),
          color: cfg.color,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{cfg.pill}</span>
        {qaScore != null && variant === 'completed' && (
          <span style={{
            fontSize: 9, fontWeight: 700,
            padding: '3px 8px', borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
            background: tint(C.accent, 0.12),
            color: C.accent,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>QA {qaScore}</span>
        )}
        {agent && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.muted,
          }}>{agent}</span>
        )}
        {project && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.dim,
          }}>· {project}</span>
        )}
        {timestamp && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 10, color: C.dim,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{formatTime(timestamp)}</span>
        )}
      </div>

      {/* needs_input: reply hint sits below the foot */}
      {variant === 'needs_input' && (
        <div style={{
          marginTop: 6,
          fontSize: 10, fontWeight: 500, color: C.muted,
        }}>Reply below to unblock.</div>
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
