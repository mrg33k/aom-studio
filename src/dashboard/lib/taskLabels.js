// taskLabels.js -- Corner task label/category system
// Labels: bug, feature, polish, urgent, blocked
// Storage: localStorage (instant) + Supabase (when UUID available)
// Keys: task UUID preferred; falls back to text-based key for punch-list tasks

export const TASK_LABELS = [
  { id: 'urgent',  name: 'Urgent',  color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)'  },
  { id: 'blocked', name: 'Blocked', color: '#F97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)' },
  { id: 'bug',     name: 'Bug',     color: '#EC4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)' },
  { id: 'feature', name: 'Feature', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)' },
  { id: 'polish',  name: 'Polish',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)' },
]

const LABEL_MAP = Object.fromEntries(TASK_LABELS.map(l => [l.id, l]))

export function getLabelConfig(labelId) {
  return labelId ? LABEL_MAP[labelId] || null : null
}

// Storage key for localStorage
const LS_KEY = 'corner-task-labels-v1'

function loadLabels() {
  if (typeof localStorage === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}

function saveLabels(map) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)) } catch {}
}

// Stable key: UUID preferred, falls back to text key
function taskKey(taskId, taskText) {
  if (taskId && typeof taskId === 'string' && taskId.length > 10) return taskId
  return `txt:${(taskText || '').slice(0, 80)}`
}

export function getTaskLabel(taskId, taskText) {
  const map = loadLabels()
  return map[taskKey(taskId, taskText)] || null
}

export function setTaskLabel(taskId, taskText, labelId) {
  const map = loadLabels()
  const key = taskKey(taskId, taskText)
  if (labelId) {
    map[key] = labelId
  } else {
    delete map[key]
  }
  saveLabels(map)

  // Fire-and-forget Supabase persist (only when we have a real UUID)
  if (taskId && typeof taskId === 'string' && /^[0-9a-f-]{36}$/i.test(taskId)) {
    fetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setLabel', taskId, taskText, payload: labelId || null }),
    }).catch(() => {})
  }
}
