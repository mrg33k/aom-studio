// useChatMessages -- thread messages + realtime subscriptions.
// Loads the last 200 messages for the selected agent or project, subscribes
// to postgres INSERTs (with dedup against temp / bridge-stream / voice
// entries), and fetches avatars for collaborators in shared chats.
// [project:slug] cross-posting is server-side (see api/_lib/crosspost.js) —
// used to run here and raced across browser tabs.
// Extracted from ChatPanel.jsx (R2b split).
//
// R74: self-healing subscriptions. Every channel now (a) reports status via
// subscribe callback, (b) auto-reconnects with exponential backoff on
// CHANNEL_ERROR / TIMED_OUT / CLOSED, and (c) refetches history on
// (re-)SUBSCRIBE and on window focus / tab visibility. Before R74, a single
// realtime hiccup silently froze the chat panel — the row was in Supabase,
// Telegram fired, but the panel never rendered. Now every surface is
// template-identical and self-heals.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { authFetch } from '../../../lib/authFetch.js'
import { missionSlugsMatch } from '../../../data/canonicalize-mission-slug.js'

// corner:dashboard-speed (2026-06-02): mission-scope isolation for project chat.
// The chat-display query filtered by project only and DROPPED the mission, so
// every mission room under a project shared one chat pool — Courtney's
// ai-education chat surfaced in Patrik's aom-project rooms ("the room thinks
// it's another chat"). This matcher restores isolation: a mission room shows
// only its mission's messages; the project chat (no mission) shows only
// project-level messages with no mission tag. Uses missionSlugsMatch so the
// inconsistent stored formats (`brand` vs `aheadofmarket:brand`) both match.
function makeMissionMatcher(missionSlug) {
  return (m) => {
    const tag = (m && m.metadata && m.metadata.mission_slug) || ''
    if (missionSlug) return missionSlugsMatch(tag, missionSlug)
    return !tag
  }
}

// Drop crosspost twins whose source original is already present in the set.
// Shared rooms mirror owner-world messages into the `shared:<slug>` channel
// (api/_lib/crosspost.js + scripts/reconcile-shared-rooms.py). The room OWNER
// reads BOTH their world channel and shared:<slug>, so without this they'd see
// each mirrored message twice (id-only dedup can't catch it — original and
// twin have different ids). Collaborators only ever see the twin (RLS hides
// the owner channel from them), so for them the twin is kept. Net: everyone
// sees each message exactly once.
// aom:master-loop (2026-06-14): the master loop posts its internal cycle-brief as
// a role='user' message into Elon's chat to wake Elon up each cycle. Those cues are
// plumbing, not Patrik — hide them so the chat reads as "me talking to my assistant"
// (Patrik sees only Elon's replies + questions). Stamped metadata.master_loop=true.
function isHiddenLoopCue(m) {
  return !!(m && m.role === 'user' && m.metadata && m.metadata.master_loop)
}

function dropRedundantCrossposts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows
  const presentIds = new Set(rows.map(r => r && r.id))
  return rows.filter(r => {
    const srcId = r && r.metadata && r.metadata.source_message_id
    if (r && r.source === 'crosspost' && srcId && presentIds.has(srcId)) return false
    return true
  })
}

// Merge new rows into existing messages, dedup by id, preserve any optimistic
// temp-/bridge-stream-/voice- entries that don't yet have a real server row.
function mergeServerRows(prev, serverRows) {
  if (!Array.isArray(serverRows) || serverRows.length === 0) return prev
  const byId = new Map()
  for (const m of prev) byId.set(m.id, m)
  for (const row of serverRows) {
    byId.set(row.id, row)
  }
  // Preserve optimistic entries that have no matching real row (by temp id).
  const preservedTempIds = new Set()
  for (const m of prev) {
    if (typeof m.id === 'string' && (m.id.startsWith('temp-') || m.id.startsWith('bridge-stream-') || m.id.startsWith('voice-'))) {
      // If any server row matches this temp by role+text+agent, drop the temp.
      const matched = serverRows.find(r => r.role === m.role && r.text === m.text && r.agent === m.agent)
      if (!matched) preservedTempIds.add(m.id)
    }
  }
  // M3 fix: also preserve prev messages with real (non-temp) IDs that aren't in
  // the current server snapshot. This covers the race where:
  //   1. User sends → temp-user-xxx added to state
  //   2. Bridge POST returns → temp ID swapped to real UUID
  //   3. refetchHistory() fires (reconnect / focus) with a stale snapshot that
  //      doesn't yet include the newly written row
  //   4. mergeServerRows drops the real-UUID message → flash-then-empty-space bug
  // By preserving these rows, the message stays visible until Realtime INSERT
  // delivers the confirmed row and the dedup pass at the bottom absorbs it cleanly.
  const serverIdSet = new Set(serverRows.map(r => r.id))
  const preservedRealIds = new Set()
  const OPTIMISTIC_PREFIXES = ['temp-', 'bridge-stream-', 'voice-']
  for (const m of prev) {
    if (typeof m.id !== 'string') continue
    if (OPTIMISTIC_PREFIXES.some(p => m.id.startsWith(p))) continue // handled by preservedTempIds
    if (!serverIdSet.has(m.id)) preservedRealIds.add(m.id)
  }
  // Rebuild, sorted by timestamp ascending.
  const out = []
  for (const m of prev) {
    if (preservedTempIds.has(m.id) || preservedRealIds.has(m.id)) out.push(m)
  }
  for (const row of serverRows) out.push(row)
  out.sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime()
    const tb = new Date(b.timestamp || 0).getTime()
    return ta - tb
  })
  // Final dedup pass by id.
  const seen = new Set()
  const dedup = []
  for (const m of out) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    dedup.push(m)
  }
  return dropRedundantCrossposts(dedup)
}

// Schedule a reconnect with exponential backoff.
function scheduleReconnect(attemptRef, resubscribe) {
  const attempt = attemptRef.current
  const delay = Math.min(30_000, 1_000 * Math.pow(2, attempt))
  attemptRef.current = attempt + 1
  return setTimeout(resubscribe, delay)
}

export default function useChatMessages({
  selectedAgent,
  selectedProject,
  worldId,
  currentUser,
}) {
  const [messages, setMessages] = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  // User profile cache for shared chat avatars: { [user_id]: { avatar_url, display_name } }
  const [userProfiles, setUserProfiles] = useState({})
  const fetchedProfileIds = useRef(new Set())

  // R65-impl: live-thread message_step subscription per current surface.
  // Storage model: events table, event_type='message_step', agent=<slug>,
  // payload={parent_message_id, step_index, text, status, client_id,
  // world_id, agent_name?}. Server-side filter is client_id; agent +
  // event_type are enforced client-side (postgres_changes only accepts
  // one column). Steps are grouped by parent_message_id so MessageList
  // can render a StepThread under the matching assistant bubble.
  const [stepsByMessageId, setStepsByMessageId] = useState({})
  // Ref to hold the current refetchSteps fn so other effects can trigger it
  // without depending on the steps-subscription closure's scope.
  const refetchStepsRef = useRef(null)
  // Same pattern for refetchHistory: each thread effect (agent / project) owns a
  // local refetchHistory closure; this ref exposes the active surface's one so
  // the SSE stream can pull missed segment rows the moment a turn starts. Without
  // it, a silently-dropped Realtime socket means the live thought-segments never
  // render until focus/visibility or the 4s safety-net — "delivered-not-rendered"
  // death (council 2026-06-13, step 2 #1).
  const refetchHistoryRef = useRef(null)

  // ── Load message history for an agent thread ──────────────────────────────
  // R63: exclude messages with a project set. Per-project observations
  // (kickoff-sweep, stale-project pings, project-scoped updates) are written
  // with agent='elon' + project='<slug>' so they render in the project chat;
  // they must NOT appear in Elon's 1:1 thread. VISION commits to "Elon's 1:1
  // stays clean of per-project routing."
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    setLoadingMsgs(true)
    setMessages([])
    // corner:chat-reliability CR-2 -- task rooms back-fill: load by
    // agent='task:<id>' OR metadata.task_id='<id>'. Picks up historical
    // R3 rows where metadata was set but agent prefix was inconsistent.
    const isTaskRoom = selectedAgent.slug?.startsWith('task:')
    const taskRoomId = isTaskRoom ? selectedAgent.slug.slice(5) : null
    let q = supabase
      .from('messages')
      .select('*')
      .eq('client_id', worldId)
    if (isTaskRoom && taskRoomId) {
      q = q.or(`agent.eq.${selectedAgent.slug},metadata->>task_id.eq.${taskRoomId}`)
    } else {
      q = q.eq('agent', selectedAgent.slug).or('project.is.null,project.eq.')
    }
    q.order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data.reverse().filter(m => !isHiddenLoopCue(m)))
      })
  }, [selectedAgent?.slug, worldId])

  // ── Realtime + self-heal: agent thread ───────────────────────────────────
  // R53: channel isolation. R74: self-healing — reconnect + history refetch
  // on CHANNEL_ERROR / TIMED_OUT / CLOSED / focus / visibilitychange.
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    let active = true
    let channel = null
    let retryTimer = null
    const retryAttemptRef = { current: 0 }

    const refetchHistory = async () => {
      if (!active) return
      try {
        // corner:chat-reliability CR-2 -- same union as initial load.
        const isTaskRoom = selectedAgent.slug?.startsWith('task:')
        const taskRoomId = isTaskRoom ? selectedAgent.slug.slice(5) : null
        let q = supabase
          .from('messages')
          .select('*')
          .eq('client_id', worldId)
        if (isTaskRoom && taskRoomId) {
          q = q.or(`agent.eq.${selectedAgent.slug},metadata->>task_id.eq.${taskRoomId}`)
        } else {
          q = q.eq('agent', selectedAgent.slug).or('project.is.null,project.eq.')
        }
        const { data, error } = await q
          .order('timestamp', { ascending: false })
          .limit(200)
        if (!active || error || !Array.isArray(data)) return
        const ordered = data.reverse().filter(m => !isHiddenLoopCue(m))
        setMessages(prev => mergeServerRows(prev, ordered))
      } catch (_) { /* best-effort */ }
    }
    refetchHistoryRef.current = refetchHistory

    const handleInsert = (payload) => {
      const msg = payload.new
      console.debug('[useChatMessages] agent-thread INSERT', { id: msg?.id, agent: msg?.agent, role: msg?.role, client_id: msg?.client_id, project: msg?.project })
      if (msg.client_id !== worldId) {
        console.debug('[useChatMessages] agent-thread DROP: client_id mismatch', { expected: worldId, got: msg.client_id })
        console.warn('[R53] dropped cross-tenant message', { expected: worldId, got: msg.client_id, id: msg.id })
        return
      }
      if (msg.agent !== selectedAgent.slug) {
        // corner:chat-reliability CR-2 -- task rooms accept rows tagged by
        // metadata.task_id even when the agent field drifted. Keeps
        // historical / cross-dispatch replies visible in the originating room.
        const isTaskRoom = selectedAgent.slug?.startsWith('task:')
        const taskRoomId = isTaskRoom ? selectedAgent.slug.slice(5) : null
        const metaTaskId = msg.metadata && msg.metadata.task_id
        if (!(isTaskRoom && metaTaskId && metaTaskId === taskRoomId)) {
          console.debug('[useChatMessages] agent-thread DROP: agent mismatch', { expected: selectedAgent.slug, got: msg.agent })
          if (typeof window !== 'undefined') {
            window.__R53_BLEED_LOG__ = window.__R53_BLEED_LOG__ || []
            window.__R53_BLEED_LOG__.push({ side: 'agent-thread', expected: selectedAgent.slug, got: msg.agent, id: msg.id, ts: Date.now() })
          }
          return
        }
      }
      if (msg.project) {
        console.debug('[useChatMessages] agent-thread DROP: project-tagged message in agent thread', { project: msg.project })
        if (typeof window !== 'undefined') {
          window.__R53_BLEED_LOG__ = window.__R53_BLEED_LOG__ || []
          window.__R53_BLEED_LOG__.push({ side: 'agent-thread-project', expected: selectedAgent.slug, got: msg.agent, project: msg.project, id: msg.id, ts: Date.now() })
        }
        return
      }
      if (isHiddenLoopCue(msg)) {
        console.debug('[useChatMessages] agent-thread DROP: hidden master-loop cue', { id: msg.id })
        return
      }
      console.debug('[useChatMessages] agent-thread ACCEPT → setMessages', { id: msg.id, role: msg.role })
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        const tempIdx = prev.findIndex(m =>
          typeof m.id === 'string' && m.id.startsWith('temp-') &&
          m.role === msg.role &&
          m.text === msg.text
        )
        if (tempIdx !== -1) {
          const next = [...prev]
          next[tempIdx] = msg
          return next
        }
        if (msg.role === 'assistant') {
          const bridgeIdx = prev.findIndex(m =>
            typeof m.id === 'string' && m.id.startsWith('bridge-stream-') &&
            m.role === 'assistant' && m.agent === msg.agent
          )
          if (bridgeIdx !== -1) {
            const next = [...prev]
            next[bridgeIdx] = msg
            return next
          }
        }
        if (msg.source === 'voice') {
          const tempRole = msg.role === 'user' ? 'user' : 'agent'
          const voiceIdx = prev.findIndex(m =>
            m.source === 'voice' &&
            m.text === msg.text &&
            m.role === tempRole &&
            typeof m.id === 'string' && m.id.startsWith('voice-')
          )
          if (voiceIdx !== -1) {
            const next = [...prev]
            next[voiceIdx] = msg
            return next
          }
        }
        return [...prev, msg]
      })
    }

    const handleUpdate = (payload) => {
      const msg = payload.new
      if (!msg?.id) return
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m))
    }

    const subscribe = () => {
      if (!active) return
      try { if (channel) supabase.removeChannel(channel) } catch (_) {}
      channel = supabase
        .channel(`cv3-thread-${worldId}-${selectedAgent.slug}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
          handleInsert,
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
          handleUpdate,
        )
        .subscribe((status) => {
          if (!active) return
          if (status === 'SUBSCRIBED') {
            retryAttemptRef.current = 0
            refetchHistory()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[R74] agent-thread channel status=${status}, reconnecting…`)
            retryTimer = scheduleReconnect(retryAttemptRef, subscribe)
          }
        })
    }

    subscribe()

    const onFocus = () => { if (active) refetchHistory() }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
    }

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      try { if (channel) supabase.removeChannel(channel) } catch (_) {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
      }
    }
  }, [selectedAgent?.slug, worldId])

  // ── Load project messages when a project is selected ──────────────────────
  // R6: filter on the `project` column instead of the legacy
  // agent='project:<slug>' pseudo-agent convention. Historical rows with
  // the old shape are still picked up via a second OR filter so pre-R6
  // conversations don't disappear.
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    setLoadingMsgs(true)
    setMessages([])
    // M10 + R2 fix (2026-05-23): project chat messages can live under EITHER
    // the world's client_id (owner's historical writes + agent writes from
    // tmux/bridge) OR the canonical `shared:<slug>` channel (cross-tenant
    // collaboration writes). Always query BOTH regardless of isShared.
    //
    // Why not use isShared as a switch: useProjects.js sets isShared=true on
    // OWNED projects that have collaborators (project_access rows). The owner's
    // historical messages still live at client_id=worldId though — narrowing
    // the read to only shared:<slug> wipes them. Reading both surfaces the
    // full room history regardless of which channel a sender used.
    const sharedCid = `shared:${selectedProject.slug}`
    const clientIds = worldId === sharedCid ? [sharedCid] : [worldId, sharedCid]
    const matchesMission = makeMissionMatcher(selectedProject.missionSlug)
    supabase
      .from('messages')
      .select('*')
      .in('client_id', clientIds)
      .or(`project.eq.${selectedProject.slug},agent.eq.project:${selectedProject.slug}`)
      .order('timestamp', { ascending: false })
      .limit(400)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        // Mission-scope isolation: keep only rows for THIS mission room (or
        // only un-missioned project-level rows when no mission is selected).
        if (!error && data) setMessages(dropRedundantCrossposts(data.filter(matchesMission)).reverse())
      })
  }, [worldId, selectedProject?.slug, selectedProject?.missionSlug, selectedProject?.isShared, selectedAgent?.slug])

  // ── Realtime + self-heal: project chat ───────────────────────────────────
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    // R2 fix (2026-05-23): always include the world channel so owner's
    // historical messages surface even when the project is shared with
    // collaborators (isShared=true). See initial-load comment above for
    // the full reasoning.
    const sharedCid = `shared:${selectedProject.slug}`
    let active = true
    let channel = null
    let retryTimer = null
    const retryAttemptRef = { current: 0 }

    const refetchHistory = async () => {
      if (!active) return
      try {
        const clientIds = worldId === sharedCid ? [sharedCid] : [worldId, sharedCid]
        const matchesMission = makeMissionMatcher(selectedProject.missionSlug)
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .in('client_id', clientIds)
          .or(`project.eq.${selectedProject.slug},agent.eq.project:${selectedProject.slug}`)
          .order('timestamp', { ascending: false })
          .limit(400)
        if (!active || error || !Array.isArray(data)) return
        const ordered = data.filter(matchesMission).reverse()
        setMessages(prev => mergeServerRows(prev, ordered))
      } catch (_) { /* best-effort */ }
    }
    refetchHistoryRef.current = refetchHistory

    const handleInsert = (payload) => {
      const msg = payload.new
      console.debug('[useChatMessages] project-thread INSERT', { id: msg?.id, agent: msg?.agent, role: msg?.role, client_id: msg?.client_id, project: msg?.project })
      // M10 + R2 fix (2026-05-23): accept both the world channel and the
      // canonical shared:<slug> channel. The project + agent filter below
      // still scopes to this room, so cross-tenant bleed remains blocked.
      if (msg.client_id !== worldId && msg.client_id !== sharedCid) {
        console.debug('[useChatMessages] project-thread DROP: client_id mismatch', { expected: [worldId, sharedCid], got: msg.client_id })
        console.warn('[R53] dropped cross-tenant project message', { expected: [worldId, sharedCid], got: msg.client_id, id: msg.id })
        return
      }
      const isForThisProject =
        msg.project === selectedProject.slug ||
        msg.agent === `project:${selectedProject.slug}`
      if (!isForThisProject) {
        console.debug('[useChatMessages] project-thread DROP: not for this project', { expected: selectedProject.slug, gotProject: msg.project, gotAgent: msg.agent })
        if (typeof window !== 'undefined') {
          window.__R53_BLEED_LOG__ = window.__R53_BLEED_LOG__ || []
          window.__R53_BLEED_LOG__.push({ side: 'project-thread', expected: selectedProject.slug, got: msg.project, agent: msg.agent, id: msg.id, ts: Date.now() })
        }
        return
      }
      // Mission-scope isolation (2026-06-02): drop inserts for a DIFFERENT
      // mission than the one this room is scoped to (or any mission-tagged
      // message when we're in the un-missioned project chat). Without this a
      // live message from a sibling mission room bleeds in.
      if (!makeMissionMatcher(selectedProject.missionSlug)(msg)) {
        console.debug('[useChatMessages] project-thread DROP: mission mismatch', { room: selectedProject.missionSlug || '(project)', got: msg?.metadata?.mission_slug })
        return
      }
      console.debug('[useChatMessages] project-thread ACCEPT → setMessages', { id: msg.id, role: msg.role })
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        const tempIdx = prev.findIndex(m =>
          typeof m.id === 'string' && m.id.startsWith('temp-') &&
          m.role === msg.role &&
          m.text === msg.text
        )
        if (tempIdx !== -1) {
          const next = [...prev]
          next[tempIdx] = msg
          return next
        }
        if (msg.role === 'assistant') {
          const bridgeIdx = prev.findIndex(m =>
            typeof m.id === 'string' && m.id.startsWith('bridge-stream-') &&
            m.role === 'assistant' && m.agent === msg.agent
          )
          if (bridgeIdx !== -1) {
            const next = [...prev]
            next[bridgeIdx] = msg
            return next
          }
        }
        if (msg.source === 'voice') {
          const tempRole = msg.role === 'user' ? 'user' : 'agent'
          const voiceIdx = prev.findIndex(m =>
            m.source === 'voice' &&
            m.text === msg.text &&
            m.role === tempRole &&
            typeof m.id === 'string' && m.id.startsWith('voice-')
          )
          if (voiceIdx !== -1) {
            const next = [...prev]
            next[voiceIdx] = msg
            return next
          }
        }
        return [...prev, msg]
      })
    }

    const handleUpdate = (payload) => {
      const msg = payload.new
      if (!msg?.id) return
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m))
    }

    const subscribe = () => {
      if (!active) return
      try { if (channel) supabase.removeChannel(channel) } catch (_) {}
      // M10: subscribe on project column so both world-keyed and shared:<slug>
      // inserts reach handleInsert. handleInsert enforces the dual-client_id
      // match before accepting, so cross-tenant rows are still rejected.
      channel = supabase
        .channel(`cv3-project-${selectedProject.slug}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `project=eq.${selectedProject.slug}` },
          handleInsert,
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `project=eq.${selectedProject.slug}` },
          handleUpdate,
        )
        .subscribe((status) => {
          if (!active) return
          if (status === 'SUBSCRIBED') {
            retryAttemptRef.current = 0
            refetchHistory()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[R74] project-thread channel status=${status}, reconnecting…`)
            retryTimer = scheduleReconnect(retryAttemptRef, subscribe)
          }
        })
    }

    subscribe()

    const onFocus = () => { if (active) refetchHistory() }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
    }

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      try { if (channel) supabase.removeChannel(channel) } catch (_) {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
      }
    }
  }, [worldId, selectedProject?.slug, selectedProject?.missionSlug, selectedProject?.isShared, selectedAgent?.slug])

  // ── R65-impl: subscribe to message_step events for the active surface ────
  // Fetches an initial history window (last 20 step events for the current
  // agent or project) so steps persist across re-renders / page reloads,
  // then opens a realtime channel. Groups by parent_message_id.
  // R74: self-healing — same reconnect pattern.
  useEffect(() => {
    if (!supabase || !worldId) return
    const surfaceAgent = selectedAgent?.slug || null
    const surfaceProject = selectedProject?.slug || null
    if (!surfaceAgent && !surfaceProject) return

    let active = true
    let channel = null
    let retryTimer = null
    const retryAttemptRef = { current: 0 }
    setStepsByMessageId({})

    const refetchSteps = async () => {
      if (!active) return
      // R75-r65-d: proxy through server-side API because the events table has
      // RLS that blocks anon/authed reads from the browser. Before R75-r65-d
      // this fetch returned 0 rows silently (RLS filter drops everything),
      // so StepThread never rendered even when baseline step events existed
      // in the table. The endpoint uses the service-role key, applies the
      // same client-side filter rules, and returns the scoped step list.
      try {
        const qs = new URLSearchParams({
          client_id: worldId,
          limit: '40',
        })
        if (surfaceAgent) qs.set('agent', surfaceAgent)
        if (surfaceProject) qs.set('project', surfaceProject)
        const r = await authFetch(`/api/dashboard/message-steps?${qs.toString()}`)
        if (!r.ok || !active) return
        const payload = await r.json()
        const next = {}
        for (const row of payload.steps || []) {
          const pid = row.parent_message_id
          if (!pid) continue
          if (!next[pid]) next[pid] = []
          next[pid].push({
            id: row.id,
            step_index: row.step_index ?? 0,
            text: row.text || '',
            status: row.status || 'in_progress',
            timestamp: row.timestamp,
          })
        }
        // R75-b5: dedup by step_index — keepalive emits in_progress at poke time,
        // relay-respond emits done at reply time with the same step_index.
        // Keep only the latest event per (parent_message_id, step_index).
        for (const pid of Object.keys(next)) {
          const byIdx = new Map()
          for (const step of next[pid]) {
            const existing = byIdx.get(step.step_index)
            if (!existing || step.timestamp > existing.timestamp) {
              byIdx.set(step.step_index, step)
            }
          }
          next[pid] = [...byIdx.values()].sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
        }
        if (active) setStepsByMessageId(next)
      } catch (_) { /* best-effort */ }
    }
    refetchStepsRef.current = refetchSteps

    // PERF (2026-06-01, corner:live-conversation): removed the realtime
    // subscription to the high-write `events` table. It listened to EVERY
    // events INSERT (no server-side filter); RLS blocks delivery to the
    // browser so its handler never fired -- steps have always arrived via
    // refetchSteps polling (this initial call + the focus listener below +
    // the new-assistant-message and 4s safety-net effects). The dead channel
    // still forced Supabase Realtime to RLS-evaluate the entire events stream
    // (~1.2k rows/hr from tool_activity + liberal step emission) for every
    // open tab, adding latency to the messages channel that delivers new
    // messages/attachments/images. Removing it is zero behavior change for
    // steps and frees the realtime pipe.
    refetchSteps()

    const onFocus = () => { if (active) refetchSteps() }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
    }

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      try { if (channel) supabase.removeChannel(channel) } catch (_) {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
      }
    }
  }, [worldId, selectedAgent?.slug, selectedProject?.slug])

  // ── Safety-net: refetch if a real user message has no response after 4s ──
  // Covers the silent-SUBSCRIBED failure mode: Supabase Realtime shows the
  // channel as SUBSCRIBED but stops delivering INSERT events. R74's reconnect
  // logic only triggers on CHANNEL_ERROR / TIMED_OUT / CLOSED — it misses this
  // case. Before R74, accidental parent re-renders would re-subscribe and heal
  // it; after R74's narrowed deps that free ride is gone. This effect fires the
  // same refetchHistory query the channel fires on SUBSCRIBED, restoring any
  // row that landed in Supabase while the silent failure was active.
  useEffect(() => {
    if (!supabase || !worldId || !messages.length) return
    // Find the last real (non-temp/non-bridge-stream/non-voice) message.
    let lastRealIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      const id = String(messages[i].id)
      if (!id.startsWith('temp-') && !id.startsWith('bridge-stream-') && !id.startsWith('voice-')) {
        lastRealIdx = i; break
      }
    }
    if (lastRealIdx === -1) return
    if (messages[lastRealIdx].role !== 'user') return
    // Already have an assistant response after this user message — nothing to heal.
    const hasResponse = messages.slice(lastRealIdx + 1).some(m => m.role === 'assistant')
    if (hasResponse) return

    const agentSlug = selectedAgent?.slug || null
    const projSlug = selectedProject?.slug || null
    const projIsShared = selectedProject?.isShared || false

    const timer = setTimeout(async () => {
 console.debug('[useChatMessages] safety-net refetch, no response within 4s', { agentSlug, projSlug, worldId })
      try {
        if (agentSlug) {
          const { data, error } = await supabase
            .from('messages').select('*')
            .eq('client_id', worldId).eq('agent', agentSlug)
            .or('project.is.null,project.eq.')
            .order('timestamp', { ascending: false }).limit(200)
          if (!error && Array.isArray(data)) setMessages(prev => mergeServerRows(prev, data.reverse()))
        } else if (projSlug) {
          // R2 fix (2026-05-23): same dual-channel read as initial load,
          // so the safety-net refetch doesn't wipe owner messages when
          // isShared=true on a project they own.
          const sharedCid = `shared:${projSlug}`
          const clientIds = worldId === sharedCid ? [sharedCid] : [worldId, sharedCid]
          const { data, error } = await supabase
            .from('messages').select('*')
            .in('client_id', clientIds)
            .or(`project.eq.${projSlug},agent.eq.project:${projSlug}`)
            .order('timestamp', { ascending: false }).limit(200)
          if (!error && Array.isArray(data)) setMessages(prev => mergeServerRows(prev, data.reverse()))
        }
      } catch (_) { /* best-effort */ }
    }, 4000)
    return () => clearTimeout(timer)
  }, [messages, selectedAgent?.slug, selectedProject?.slug, selectedProject?.isShared, worldId])

  // ── Re-fetch steps when a new settled assistant message arrives without steps ─
  // events RLS blocks realtime postgres_changes delivery to the browser, so the
  // step INSERT in handleInsert (above) never fires for new replies. refetchSteps
  // runs once on subscribe (historical window) but misses new replies written
  // while the page is open. This effect bridges that gap: when a new real
  // assistant message lands with no steps yet, schedule a refetch 300ms later
  // (giving the DB write a moment to settle). Cancels if steps already populated.
  useEffect(() => {
    if (!messages.length || !refetchStepsRef.current) return
    const lastReal = [...messages].reverse().find(m => {
      const id = String(m.id)
      return !id.startsWith('temp-') && !id.startsWith('bridge-stream-') && !id.startsWith('voice-')
    })
    if (!lastReal || lastReal.role !== 'assistant') return
    if (stepsByMessageId[lastReal.id] && stepsByMessageId[lastReal.id].length > 0) return
    const timer = setTimeout(() => { refetchStepsRef.current?.() }, 300)
    return () => clearTimeout(timer)
  }, [messages, stepsByMessageId])

  // ── Auto-scroll to bottom on new messages, only when near bottom ─────────
  // Earlier doctrine scrolled unconditionally, which trapped the user at the
  // bottom: every step-row insert or background message refetch yanked them
  // back down mid-read. Now we only auto-scroll if the user is already within
  // 160px of the bottom (i.e. actively reading the current turn). If they've
  // scrolled up to read history, they stay put.
  useEffect(() => {
    const anchor = messagesEndRef.current
    if (!anchor) return
    const scroller = anchor.parentElement
    if (!scroller) { anchor.scrollIntoView({ behavior: 'smooth' }); return }
    const fromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (fromBottom < 160) {
      anchor.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ── Fetch user profiles for shared-chat avatars ──────────────────────────
  useEffect(() => {
    const newIds = messages
      .filter(m => m.user_id && !fetchedProfileIds.current.has(m.user_id) && m.user_id !== currentUser?.id)
      .map(m => m.user_id)
    const unique = [...new Set(newIds)]
    if (!unique.length) return
    unique.forEach(id => fetchedProfileIds.current.add(id))
    fetch(`/api/dashboard/avatar?user_ids=${unique.join(',')}`)
      .then(r => r.json())
      .then(data => {
        if (data.avatars) setUserProfiles(prev => ({ ...prev, ...data.avatars }))
      })
      .catch(() => {})
  }, [messages, currentUser?.id])

  return {
    messages, setMessages,
    loadingMsgs,
    messagesEndRef, messagesRef,
    userProfiles,
    stepsByMessageId,
    refetchStepsRef,
    refetchHistoryRef,
  }
}