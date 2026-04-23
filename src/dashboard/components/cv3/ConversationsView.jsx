// ConversationsView -- home: greeting + real-time search + Elon focus.
// R4 (Apr 15): added top-level search bar. Below 2 chars -> normal home.
// At >= 2 chars -> grouped filtered results (Messages, Tasks, Agents, Projects).
//
// R3b (Apr 17, 2026): reads from feature-sliced chat contexts instead of a
// single ctx prop. The internal split (R2e) is unchanged.
import { useEffect, useState } from 'react'
import { getStatusColor } from './shared.jsx'
import { useNavigate } from 'react-router-dom'
import { C, agentColors } from '../../lib/cv3Colors.js'

// R19e: EA hero is an opinion, not a fixture. The user can unpin it so
// the EA falls through to AgentsList and other agents can sit where the
// hero was. Restore is surfaced via a small "Pin EA hero" affordance.
const EA_HERO_HIDDEN_KEY = 'aom_ea_hero_hidden'
function readEaHeroHidden() {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(EA_HERO_HIDDEN_KEY) === '1' } catch { return false }
}
function writeEaHeroHidden(hidden) {
  if (typeof window === 'undefined') return
  try {
    if (hidden) localStorage.setItem(EA_HERO_HIDDEN_KEY, '1')
    else localStorage.removeItem(EA_HERO_HIDDEN_KEY)
  } catch {}
}

import { ACTIVE_STATUSES, CONVERSATIONS_KEYFRAMES } from './conversations/conversationsConstants.js'
import useHomeSearch from './conversations/useHomeSearch.js'
import CallInProgressBanner from './conversations/CallInProgressBanner.jsx'
import GreetingHero from './conversations/GreetingHero.jsx'
import HomeSearchBar from './conversations/HomeSearchBar.jsx'
import SearchResults from './conversations/SearchResults.jsx'
import EaHeroCard from './conversations/EaHeroCard.jsx'
import AgentsList from './conversations/AgentsList.jsx'
import ProjectsList from './conversations/ProjectsList.jsx'

import {
  useChatCore,
  useChatMessagesCtx,
  useChatVoiceCtx,
  useChatConversationsCtx,
} from './chat/ChatPanelContext.jsx'

const CLEO = agentColors.cleo

function CleoWorkspacesLink() {
  const navigate = useNavigate()
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.muted,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>Tools</div>
      <button
        onClick={() => navigate('/dashboard/cleo/workspaces')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '11px 14px',
          borderRadius: 12, background: C.s1,
          border: `1px solid rgba(244,114,182,0.15)`,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CLEO, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text2 }}>Cleo Workspaces</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted }}>→</span>
      </button>
    </div>
  )
}

export default function ConversationsView() {
  const {
    agents, projects, allTasks,
    onSelectAgent, onSelectProject,
    setSelectedAgent, setInlineProject,
    displayName, greetingIdx, GREETINGS,
  } = useChatCore()
  const { setMessages } = useChatMessagesCtx()
  const {
    unreadMap, unreadCounts, projectPreviews,
  } = useChatConversationsCtx()
  const {
    isVoiceActive, voiceMinimized, voiceMinimizedAgent,
    setVoiceMinimized,
  } = useChatVoiceCtx()

  // R19e: EA hero unpin state, persisted in localStorage.
  const [eaHeroHidden, setEaHeroHidden] = useState(readEaHeroHidden)
  useEffect(() => { writeEaHeroHidden(eaHeroHidden) }, [eaHeroHidden])

  const search = useHomeSearch({ agents, projects })
  const {
    searchQuery, setSearchQuery,
    searchFocused, setSearchFocused,
    msgHits, taskHits, agentHits, projectHits,
    searching, q, showSearch,
  } = search

  // Hero = the full-powered EA for this world. is_ea alone is too permissive
  // (secondary EAs like rex carry is_ea for default-send/fallback lookups);
  // is_ea && is_terminal uniquely identifies the primary hero.
  const eaAgent = agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea)
  const eaLastMsg = eaAgent ? unreadMap[eaAgent.slug] : null
  const eaUnread = eaAgent ? (unreadCounts[eaAgent.slug] || 0) : 0
  const eaStatusInfo = eaAgent ? getStatusColor(eaAgent.status) : { dot: '#506480', glow: 'none' }
  const eaIsActive = eaAgent?.status?.toUpperCase() !== 'IDLE'

  const activeAgentSlugs = new Set(
    (allTasks || []).filter(t => ACTIVE_STATUSES.has(t.status)).map(t => t.agent_identity).filter(Boolean)
  )
  const activeProjectSlugs = new Set(
    (allTasks || []).filter(t => ACTIVE_STATUSES.has(t.status)).map(t => t.metadata?.project).filter(Boolean)
  )

  // R14a: for each agent whose LATEST activity is a failed task, stash the
  // task so AgentsList + EaHeroCard can render the failure surface strip.
  // "Latest" = most recent updated_at across all that agent's tasks; if it
  // happens to be failed, the strip shows. An older failure superseded by a
  // newer queued/running/done task does NOT show -- only the most recent.
  const latestFailedByAgent = (() => {
    const latestByAgent = {}
    for (const t of (allTasks || [])) {
      const slug = t?.agent_identity || t?.agent
      if (!slug) continue
      const ts = t.updated_at || t.completed_at || t.created_at || ''
      const prev = latestByAgent[slug]
      if (!prev || String(ts) > String(prev._ts)) {
        latestByAgent[slug] = { ...t, _ts: ts }
      }
    }
    const out = {}
    for (const [slug, t] of Object.entries(latestByAgent)) {
      if (t.status === 'failed') out[slug] = t
    }
    return out
  })()

  const sortedProjects = [...(projects || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  const totalResults = msgHits.length + taskHits.length + agentHits.length + projectHits.length

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{CONVERSATIONS_KEYFRAMES}</style>

      <CallInProgressBanner
        voiceMinimized={voiceMinimized}
        isVoiceActive={isVoiceActive}
        voiceMinimizedAgent={voiceMinimizedAgent}
        setInlineProject={setInlineProject}
        onSelectProject={onSelectProject}
        setSelectedAgent={setSelectedAgent}
        onSelectAgent={onSelectAgent}
        setVoiceMinimized={setVoiceMinimized}
      />

      {/* R57: success-rate chip + last-login + time-aware "Good morning"
          variant all retired. The top of home is just the rotating greeting
          + a green live-dot (Pillar 1 VISION). */}
      <GreetingHero
        GREETINGS={GREETINGS}
        greetingIdx={greetingIdx}
        displayName={displayName}
      />

      <HomeSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchFocused={searchFocused}
        setSearchFocused={setSearchFocused}
        showSearch={showSearch}
        searching={searching}
        totalResults={totalResults}
      />

      {showSearch && (
        <SearchResults
          q={q}
          searching={searching}
          agentHits={agentHits}
          projectHits={projectHits}
          taskHits={taskHits}
          msgHits={msgHits}
          agents={agents}
          projects={projects}
          setSearchQuery={setSearchQuery}
          setSelectedAgent={setSelectedAgent}
          onSelectAgent={onSelectAgent}
          setInlineProject={setInlineProject}
          onSelectProject={onSelectProject}
          setMessages={setMessages}
        />
      )}

      {!showSearch && (
        <>
          {!eaHeroHidden && (
            <EaHeroCard
              eaAgent={eaAgent}
              eaLastMsg={eaLastMsg}
              eaUnread={eaUnread}
              eaStatusInfo={eaStatusInfo}
              eaIsActive={eaIsActive}
              activeAgentSlugs={activeAgentSlugs}
              latestFailedTask={eaAgent ? latestFailedByAgent[eaAgent.slug] || null : null}
              setSelectedAgent={setSelectedAgent}
              onSelectAgent={onSelectAgent}
              onUnpin={() => setEaHeroHidden(true)}
            />
          )}
          {eaHeroHidden && eaAgent && (
            <button
              type="button"
              data-testid="ea-hero-restore"
              onClick={() => setEaHeroHidden(false)}
              style={{
                marginBottom: 18,
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid rgba(96,165,250,0.25)',
                background: 'rgba(96,165,250,0.06)',
                color: '#60A5FA',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Pin {eaAgent.name || 'EA'} back to hero
            </button>
          )}

          <AgentsList
            agents={agents}
            unreadMap={unreadMap}
            unreadCounts={unreadCounts}
            activeAgentSlugs={activeAgentSlugs}
            latestFailedByAgent={latestFailedByAgent}
            heroSlug={eaHeroHidden ? null : eaAgent?.slug}
            setSelectedAgent={setSelectedAgent}
            onSelectAgent={onSelectAgent}
          />

          <ProjectsList
            sortedProjects={sortedProjects}
            projectPreviews={projectPreviews}
            activeProjectSlugs={activeProjectSlugs}
            setInlineProject={setInlineProject}
            setMessages={setMessages}
            setSelectedAgent={setSelectedAgent}
            onSelectProject={onSelectProject}
          />

          <CleoWorkspacesLink />
        </>
      )}

    </div>
  )
}
