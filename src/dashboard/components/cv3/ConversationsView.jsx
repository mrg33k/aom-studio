// ConversationsView -- home: greeting + real-time search + Elon focus.
// R4 (Apr 15): added top-level search bar. Below 2 chars -> normal home.
// At >= 2 chars -> grouped filtered results (Messages, Tasks, Agents, Projects).
//
// R3b (Apr 17, 2026): reads from feature-sliced chat contexts instead of a
// single ctx prop. The internal split (R2e) is unchanged.
import { getStatusColor } from './shared.jsx'
import { useNavigate } from 'react-router-dom'
import { C, agentColors } from '../../lib/cv3Colors.js'

// R58 (session 20): pin state for the EA hero + every other agent and
// every project lives in the universal usePinned hooks. The legacy
// `aom_ea_hero_hidden` key is read once on first load as a migration
// seed and then superseded by `aom_pinned_agents_<world>`.

import { ACTIVE_STATUSES, CONVERSATIONS_KEYFRAMES } from './conversations/conversationsConstants.js'
import useHomeSearch from './conversations/useHomeSearch.js'
import CallInProgressBanner from './conversations/CallInProgressBanner.jsx'
import GreetingHero from './conversations/GreetingHero.jsx'
import HomeSearchBar from './conversations/HomeSearchBar.jsx'
import HandoffNudge from './shared/HandoffNudge.jsx'
import SearchResults from './conversations/SearchResults.jsx'
import EaHeroCard from './conversations/EaHeroCard.jsx'
import HomeStateFeed from './conversations/HomeStateFeed.jsx'
import AgentsList from './conversations/AgentsList.jsx'
import ProjectsList from './conversations/ProjectsList.jsx'
import { usePinnedAgents, usePinnedProjects } from './conversations/usePinned.js'
import { useAgentOrder, useProjectOrder, applyOrder } from './conversations/useListOrder.js'

import {
  useChatCore,
  useChatMessagesCtx,
  useChatVoiceCtx,
  useChatConversationsCtx,
} from './chat/ChatPanelContext.jsx'

const CLEO = agentColors.cleo

function EmptyRoomPlaceholder() {
  return (
    <div style={{ padding: '28px 0' }}>
      <div style={{
        background: C.s1,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: C.s2,
          border: `1px solid ${C.border2}`,
          margin: '0 auto 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: C.dim }} />
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: C.text2,
          fontFamily: "'Inter', sans-serif",
          marginBottom: 6,
        }}>
          nothing here yet
        </div>
        <div style={{
          fontSize: 12, color: C.muted,
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.5,
        }}>
          Your workspace will appear here once rooms are set up.
        </div>
      </div>
    </div>
  )
}

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
    displayName, greetingIdx, GREETINGS, worldId,
  } = useChatCore()
  const { setMessages } = useChatMessagesCtx()
  const {
    unreadMap, unreadCounts, projectPreviews,
  } = useChatConversationsCtx()
  const {
    isVoiceActive, voiceMinimized, voiceMinimizedAgent,
    setVoiceMinimized,
  } = useChatVoiceCtx()

  const search = useHomeSearch({ agents, projects, world: worldId })
  const {
    searchQuery, setSearchQuery,
    searchFocused, setSearchFocused,
    msgHits, taskHits, agentHits, projectHits, fileHits,
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

  // R58 (session 20): universal pin state for agents + projects. EA is
  // pinned by default for fresh users; migration from R19e's legacy
  // `aom_ea_hero_hidden` flag runs inside usePinnedAgents.
  const pinnedAgents = usePinnedAgents({ world: worldId, defaultEaSlug: eaAgent?.slug })
  const pinnedProjects = usePinnedProjects({ world: worldId })
  const agentOrder = useAgentOrder(worldId)
  const projectOrder = useProjectOrder(worldId)
  const eaHeroHidden = eaAgent ? !pinnedAgents.isPinned(eaAgent.slug) : true

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

  // R61 (session 20): chronological sort by last message. Inbound (realtime
  // INSERT bumps the preview) and outbound (user send inserts, also fires
  // the preview update) both push an item to the top of its list.
  // Fallback sort for items with no messages yet: agents alpha by name /
  // projects alpha by name so the list stays stable for a fresh user.
  const chronoAgentsBase = [...(agents || [])].sort((a, b) => {
    const aTime = unreadMap[a.slug]?.timestamp || ''
    const bTime = unreadMap[b.slug]?.timestamp || ''
    if (aTime && bTime) return bTime > aTime ? 1 : bTime < aTime ? -1 : 0
    if (aTime && !bTime) return -1
    if (!aTime && bTime) return 1
    return (a.name || '').localeCompare(b.name || '')
  })
  // R59: drag-override. Apply the stored order on top of the chrono sort
  // so manual reorders win; untouched items keep their chrono position.
  const chronoAgents = applyOrder(chronoAgentsBase, agentOrder.order)

  const chronoProjectsBase = [...(projects || [])].sort((a, b) => {
    const aTime = projectPreviews[`project:${a.slug}`]?.timestamp || ''
    const bTime = projectPreviews[`project:${b.slug}`]?.timestamp || ''
    if (aTime && bTime) return bTime > aTime ? 1 : bTime < aTime ? -1 : 0
    if (aTime && !bTime) return -1
    if (!aTime && bTime) return 1
    return (a.name || '').localeCompare(b.name || '')
  })
  const sortedProjects = applyOrder(chronoProjectsBase, projectOrder.order)

  const totalResults = msgHits.length + taskHits.length + agentHits.length + projectHits.length + fileHits.length

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

      {/* R75-b3 -- session-hygiene nudge on home EA surface (parity with
          ThreadView + ProjectChatView). Only renders if the home chat has
          accumulated enough turns and the user hasn't dismissed. */}
      <HandoffNudge />

      {showSearch && (
        <SearchResults
          q={q}
          searching={searching}
          agentHits={agentHits}
          projectHits={projectHits}
          taskHits={taskHits}
          msgHits={msgHits}
          fileHits={fileHits}
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
          <HomeStateFeed />
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
              onUnpin={() => pinnedAgents.unpin(eaAgent.slug)}
            />
          )}
          {/* R58 retires the ea-hero-restore CTA — the EA can be pinned back
              via the same PinMenu every other agent card carries. */}

          {(agents || []).length === 0 && (sortedProjects || []).length === 0 ? (
            <EmptyRoomPlaceholder />
          ) : (
            <>
              <AgentsList
                agents={chronoAgents}
                unreadMap={unreadMap}
                unreadCounts={unreadCounts}
                activeAgentSlugs={activeAgentSlugs}
                latestFailedByAgent={latestFailedByAgent}
                heroSlug={eaHeroHidden ? null : eaAgent?.slug}
                setSelectedAgent={setSelectedAgent}
                onSelectAgent={onSelectAgent}
                pinnedSlugs={pinnedAgents.pinned}
                pinAgent={pinnedAgents.pin}
                unpinAgent={pinnedAgents.unpin}
                reorderAgent={agentOrder.move}
              />

              <ProjectsList
                sortedProjects={sortedProjects}
                projectPreviews={projectPreviews}
                activeProjectSlugs={activeProjectSlugs}
                setInlineProject={setInlineProject}
                setMessages={setMessages}
                setSelectedAgent={setSelectedAgent}
                onSelectProject={onSelectProject}
                pinnedSlugs={pinnedProjects.pinned}
                pinProject={pinnedProjects.pin}
                unpinProject={pinnedProjects.unpin}
                reorderProject={projectOrder.move}
              />
            </>
          )}

          <CleoWorkspacesLink />
        </>
      )}

    </div>
  )
}
