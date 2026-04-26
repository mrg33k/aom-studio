// Real-time home search hook. Owns the search input state, debounced
// supabase fetch for messages + tasks + files, and client-side filter for
// in-memory agents + projects. R68 (session 21) added the files section —
// MD scaffold-surface events across every project, so the home search is
// the one place Patrik reaches for any document.
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { authFetch } from '../../../lib/authFetch.js'

export default function useHomeSearch({ agents, projects, world }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [msgHits, setMsgHits] = useState([])
  const [taskHits, setTaskHits] = useState([])
  const [fileHits, setFileHits] = useState([])
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0) // cancel out-of-order fetches

  const q = searchQuery.trim()
  const showSearch = q.length >= 2

  useEffect(() => {
    if (!showSearch) {
      setMsgHits([]); setTaskHits([]); setFileHits([]); setSearching(false)
      return
    }
    const mySeq = ++searchSeq.current
    setSearching(true)
    const ilikeQ = `%${q.replace(/%/g, '')}%`
    const handle = window.setTimeout(async () => {
      try {
        const [msgRes, taskRes, fileRes] = await Promise.all([
          supabase
            .from('messages')
            .select('id,text,role,source,agent,project,timestamp')
            .ilike('text', ilikeQ)
            .order('timestamp', { ascending: false })
            .limit(8),
          supabase
            .from('tasks')
            .select('id,title,text,status,project,created_at')
            .or(`title.ilike.${ilikeQ},text.ilike.${ilikeQ}`)
            .order('created_at', { ascending: false })
            .limit(8),
          world
            ? authFetch(`/api/dashboard/file-search?world=${encodeURIComponent(world)}&q=${encodeURIComponent(q)}`)
                .then(r => r.ok ? r.json() : { hits: [] })
                .catch(() => ({ hits: [] }))
            : Promise.resolve({ hits: [] }),
        ])
        if (mySeq !== searchSeq.current) return
        setMsgHits(msgRes?.data || [])
        setTaskHits(taskRes?.data || [])
        setFileHits(Array.isArray(fileRes?.hits) ? fileRes.hits : [])
      } catch {
        if (mySeq !== searchSeq.current) return
        setMsgHits([]); setTaskHits([]); setFileHits([])
      } finally {
        if (mySeq === searchSeq.current) setSearching(false)
      }
    }, 220)
    return () => window.clearTimeout(handle)
  }, [q, showSearch, world])

  // Agents + projects are already in-memory, filter client-side (instant)
  const qLower = q.toLowerCase()
  const agentHits = !showSearch ? [] : (agents || []).filter(a =>
    (a.name || '').toLowerCase().includes(qLower) ||
    (a.slug || '').toLowerCase().includes(qLower)
  )
  const projectHits = !showSearch ? [] : (projects || []).filter(p =>
    (p.name || '').toLowerCase().includes(qLower) ||
    (p.slug || '').toLowerCase().includes(qLower)
  )

  return {
    searchQuery, setSearchQuery,
    searchFocused, setSearchFocused,
    msgHits, taskHits, agentHits, projectHits, fileHits,
    searching,
    q, showSearch,
  }
}
