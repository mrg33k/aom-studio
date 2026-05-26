// Skills picker shared state (corner:skills-picker R1, 2026-05-25)
//
// Two pieces of cross-component state:
//   1. `skillsShelfOpen` — whether the left rail is taken over by the Skills shelf.
//      Lives in React state in CornerV4; this module exports nothing for it.
//   2. `attachedSkillByMission` — map of "project::mission" → skill record.
//      Persisted to localStorage so the chip survives reload.
//      Subscribed via a tiny pub/sub so input bars pick up updates without
//      prop-drilling through ChatPanel / CornerContext.
//
// Key format: `${projectSlug}::${missionSlug || '_'}` — `_` = "no mission scope".

const STORAGE_KEY = 'cv4-attached-skill-by-mission'

const listeners = new Set()

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch {
    return {}
  }
}

function persist(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}))
  } catch {}
}

function notify() {
  for (const fn of listeners) {
    try { fn() } catch {}
  }
}

export function missionKey(projectSlug, missionSlug) {
  return `${projectSlug || '_'}::${missionSlug || '_'}`
}

export function getAttachedSkill(projectSlug, missionSlug) {
  const key = missionKey(projectSlug, missionSlug)
  const map = read()
  return map[key] || null
}

export function setAttachedSkill(projectSlug, missionSlug, skill) {
  const key = missionKey(projectSlug, missionSlug)
  const map = read()
  if (skill) {
    map[key] = skill
  } else {
    delete map[key]
  }
  persist(map)
  notify()
}

export function clearAttachedSkill(projectSlug, missionSlug) {
  setAttachedSkill(projectSlug, missionSlug, null)
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) notify()
  })
}
