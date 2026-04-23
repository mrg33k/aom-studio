// useChatMessages -- thread messages + realtime subscriptions.
// Loads the last 200 messages for the selected agent or project, subscribes
// to postgres INSERTs (with dedup against temp / bridge-stream / voice
// entries), and fetches avatars for collaborators in shared chats.
// [project:slug] cross-posting is server-side (see api/_lib/crosspost.js) —
// used to run here and raced across browser tabs.
// Extracted from ChatPanel.jsx (R2b split).
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase.js'

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
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', worldId)
      .eq('agent', selectedAgent.slug)
      .or('project.is.null,project.eq.')
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data.reverse())
      })
  }, [selectedAgent, worldId])

  // ── Realtime: watch for new messages in the agent thread ──────────────────
  // R53: channel isolation. Supabase postgres_changes filter accepts only ONE
  // column expression, so we use client_id server-side and enforce
  // agent-slug match client-side. Any mismatch is an isolation leak — we
  // drop it AND log loud so leaks are traceable in production. The gate
  // seeds cross-agent messages to prove no mismatched payload renders.
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    const channel = supabase
      .channel(`cv3-thread-${worldId}-${selectedAgent.slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        (payload) => {
          const msg = payload.new
          // Hard isolation: client_id + agent must both match.
          if (msg.client_id !== worldId) {
            // Shouldn't happen given the server-side filter, but logging it
            // would surface any realtime misrouting immediately.
            console.warn('[R53] dropped cross-tenant message', { expected: worldId, got: msg.client_id, id: msg.id })
            return
          }
          if (msg.agent !== selectedAgent.slug) {
            // This is the bleed Patrik saw. Drop + log so the gate can
            // detect cross-agent misrouting.
            if (typeof window !== 'undefined') {
              window.__R53_BLEED_LOG__ = window.__R53_BLEED_LOG__ || []
              window.__R53_BLEED_LOG__.push({ side: 'agent-thread', expected: selectedAgent.slug, got: msg.agent, id: msg.id, ts: Date.now() })
            }
            return
          }
          // R63: per-project observations (agent='elon' + project='<slug>')
          // must land in the project chat, NOT in the agent's 1:1 thread.
          // Same R53 log channel; new side tag so the R53 gate filters by
          // side and the R63 gate can detect these drops specifically.
          if (msg.project) {
            if (typeof window !== 'undefined') {
              window.__R53_BLEED_LOG__ = window.__R53_BLEED_LOG__ || []
              window.__R53_BLEED_LOG__.push({ side: 'agent-thread-project', expected: selectedAgent.slug, got: msg.agent, project: msg.project, id: msg.id, ts: Date.now() })
            }
            return
          }
          {
            setMessages(prev => {
              // Deduplicate: skip if we already have this id (from optimistic insert)
              if (prev.some(m => m.id === msg.id)) return prev
              // Replace temp optimistic message with real DB row
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
              // Bridge stream dedup: SSE placeholder -> real Supabase row
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
              // Voice messages: replace temp voice entry
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
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedAgent, worldId])

  // ── Load project messages when a project is selected ──────────────────────
  // R6: filter on the `project` column instead of the legacy
  // agent='project:<slug>' pseudo-agent convention. Historical rows with
  // the old shape are still picked up via a second OR filter so pre-R6
  // conversations don't disappear.
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    setLoadingMsgs(true)
    setMessages([])
    const projCid = selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', projCid)
      .or(`project.eq.${selectedProject.slug},agent.eq.project:${selectedProject.slug}`)
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data.reverse())
      })
  }, [worldId, selectedProject, selectedAgent])

  // ── Realtime subscription for project messages ───────────────────────────
  // R53: channel isolation. Same hard-filter principle as the agent thread:
  // client_id + project match; any mismatch is logged and dropped so the
  // gate can prove isolation.
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    const projCid = selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId
    const channel = supabase
      .channel(`cv3-project-${projCid}-${selectedProject.slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${projCid}` },
        (payload) => {
          const msg = payload.new
          if (msg.client_id !== projCid) {
            console.warn('[R53] dropped cross-tenant project message', { expected: projCid, got: msg.client_id, id: msg.id })
            return
          }
          const isForThisProject =
            msg.project === selectedProject.slug ||
            msg.agent === `project:${selectedProject.slug}`
          if (!isForThisProject) {
            if (typeof window !== 'undefined') {
              window.__R53_BLEED_LOG__ = window.__R53_BLEED_LOG__ || []
              window.__R53_BLEED_LOG__.push({ side: 'project-thread', expected: selectedProject.slug, got: msg.project, agent: msg.agent, id: msg.id, ts: Date.now() })
            }
            return
          }
          {
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
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [worldId, selectedProject, selectedAgent])

  // ── Auto-scroll to bottom on new messages ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
  }
}
