// ConversationsView -- home: greeting + real-time search + Elon focus.
// R4 (Apr 15): added top-level search bar. Below 2 chars -> normal home.
// At >= 2 chars -> grouped filtered results (Messages, Tasks, Agents, Projects).
//
// R2e split: the pre-split ConversationsView.jsx was 849 LOC. Behavior and
// ctx contract preserved exactly -- only where each piece lives has changed.
// R3 will replace ctx with scoped hooks.
import { getStatusColor } from './shared.jsx'

import { ACTIVE_STATUSES, CONVERSATIONS_KEYFRAMES } from './conversations/conversationsConstants.js'
import useHomeSearch from './conversations/useHomeSearch.js'
import CallInProgressBanner from './conversations/CallInProgressBanner.jsx'
import GreetingHero from './conversations/GreetingHero.jsx'
import HomeSearchBar from './conversations/HomeSearchBar.jsx'
import SearchResults from './conversations/SearchResults.jsx'
import ElonHeroCard from './conversations/ElonHeroCard.jsx'
import AgentsList from './conversations/AgentsList.jsx'
import ProjectsList from './conversations/ProjectsList.jsx'

export default function ConversationsView(ctx) {
  const {
    agents, onSelectAgent, onSelectProject,
    selectedAgent, setSelectedAgent, setMessages, setInlineProject,
    displayName, greetingIdx, GREETINGS, lastLoginText,
    unreadMap, unreadCounts, projectPreviews,
    projects, allTasks,
    isVoiceActive, voiceMinimized, voiceMinimizedAgent,
    setVoiceMinimized,
  } = ctx

  const search = useHomeSearch({ agents, projects })
  const {
    searchQuery, setSearchQuery,
    searchFocused, setSearchFocused,
    msgHits, taskHits, agentHits, projectHits,
    searching, q, showSearch,
  } = search

  const elonAgent = agents?.find(a => a.slug === 'elon')
  const elonLastMsg = elonAgent ? unreadMap[elonAgent.slug] : null
  const elonUnread = elonAgent ? (unreadCounts[elonAgent.slug] || 0) : 0
  const elonStatusInfo = elonAgent ? getStatusColor(elonAgent.status) : { dot: '#506480', glow: 'none' }
  const elonIsActive = elonAgent?.status?.toUpperCase() !== 'IDLE'

  const activeAgentSlugs = new Set(
    (allTasks || []).filter(t => ACTIVE_STATUSES.has(t.status)).map(t => t.agent_identity).filter(Boolean)
  )
  const activeProjectSlugs = new Set(
    (allTasks || []).filter(t => ACTIVE_STATUSES.has(t.status)).map(t => t.metadata?.project).filter(Boolean)
  )

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

      <GreetingHero
        lastLoginText={lastLoginText}
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
          <ElonHeroCard
            elonAgent={elonAgent}
            elonLastMsg={elonLastMsg}
            elonUnread={elonUnread}
            elonStatusInfo={elonStatusInfo}
            elonIsActive={elonIsActive}
            activeAgentSlugs={activeAgentSlugs}
            setSelectedAgent={setSelectedAgent}
            onSelectAgent={onSelectAgent}
          />

          <AgentsList
            agents={agents}
            unreadMap={unreadMap}
            unreadCounts={unreadCounts}
            activeAgentSlugs={activeAgentSlugs}
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
        </>
      )}

    </div>
  )
}
