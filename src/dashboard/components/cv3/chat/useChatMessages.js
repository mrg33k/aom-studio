// useChatMessages -- thread messages + realtime subscriptions.
// Loads the last 200 messages for the selected agent or project, subscribes
// to postgres INSERTs (with dedup against temp / bridge-stream / voice
// entries), cross-posts tagged messages to the shared project thread, and
// fetches avatars for collaborators in shared chats.
// Extracted from ChatPanel.jsx (R2b split).
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase.js'

export default function useChatMessages({
  selectedAgent,
  selectedProject,
  worldId,
  currentUser,
  projectsRef,
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
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    setLoadingMsgs(true)
    setMessages([])
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', worldId)
      .eq('agent', selectedAgent.slug)
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data.reverse())
      })
  }, [selectedAgent, worldId])

  // ── Realtime: watch for new messages in the agent thread ──────────────────
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    const channel = supabase
      .channel(`cv3-thread-${worldId}-${selectedAgent.slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        (payload) => {
          const msg = payload.new
          if (msg.agent === selectedAgent.slug) {
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
            // Cross-post messages that mention a project to the shared project
            // thread. Server-side crossposts already have a project field set,
            // so only trigger here when the message arrived without one (e.g.
            // Elon's direct Supabase writes from AOM-EA). source='crosspost'
            // is always skipped.
            if (msg.source !== 'crosspost' && !msg.project) {
              let taggedProject = null
              const tagMatch = (msg.text || '').match(/\[project:([a-z0-9_-]+)\]/i)
              if (tagMatch) taggedProject = tagMatch[1].toLowerCase()
              if (!taggedProject && projectsRef?.current?.length) {
                const lt = (msg.text || '').toLowerCase()
                for (const p of projectsRef.current) {
                  if (p.slug && lt.includes(p.slug.toLowerCase())) { taggedProject = p.slug; break }
                  if (p.name && p.name.length > 2 && lt.includes(p.name.toLowerCase())) { taggedProject = p.slug; break }
                }
              }
              if (taggedProject) {
                fetch('/api/dashboard/supabase-messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    agent: msg.agent,
                    text: msg.text,
                    role: msg.role,
                    source: 'crosspost',
                    project: taggedProject,
                    client_id: `shared:${taggedProject}`,
                  }),
                }).catch(() => {})
              }
            }
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedAgent, worldId, projectsRef])

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
          // R6: match either new shape (project column set) or legacy shape
          // (agent='project:<slug>') so mid-migration history keeps flowing.
          const isForThisProject =
            msg.project === selectedProject.slug ||
            msg.agent === `project:${selectedProject.slug}`
          if (isForThisProject) {
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
