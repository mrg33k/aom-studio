// DataContext — Single shared data source for the entire dashboard.
// Before: useDataPipe instantiated 6+ times across different screens,
// each creating redundant polling loops and Supabase subscriptions.
// After: ONE hook instance at the top level, all screens consume from context.
// Also adds client-side caching so navigating back to a screen reads from
// memory instead of triggering a cold network refetch.
//
// Performance improvements:
// - Cold refetches eliminated (navigate to a previously-visited screen, data is cached)
// - Polling intervals collapsed from 6+ to 1 (3s)
// - Supabase subscriptions deduped: 1 per data source instead of 6+
// - Active-agents check fires once per poll instead of 12-16 times per navigation

import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react'
import { useDataPipe } from '../../hooks/useDataPipe'
import { useWorldId } from '../../lib/tenantContext.jsx'
import { useCommand, useTrackerBugs } from '../data/useCommandTracker'

const DataContext = createContext(null)
const CommandContext = createContext(null)

// DataProvider: wraps useDataPipe at the top level once.
export function DataProvider({ children }) {
  const worldId = useWorldId()

  // useDataPipe returns all data that all screens need: agents, rooms, todos, etc.
  // This instantiates ONCE at the top level, so all screens share the same hook instance,
  // the same polling loop (every 3s), and the same Supabase subscriptions.
  const dataPipeResult = useDataPipe(null, worldId, null)

  return (
    <DataContext.Provider value={dataPipeResult}>
      {children}
    </DataContext.Provider>
  )
}

// CommandProvider: wraps useCommand and useTrackerBugs at the top level.
// Manages the state that CornerCV6 needs: selectedKey, statusFilter, goalEdit.
// These persist across screen navigations so the user's selections are preserved.
export function CommandProvider({ children }) {
  const worldId = useWorldId()
  const [selectedKey, setSelectedKey] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [goalEdit, setGoalEdit] = useState(false)

  // useCommand and useTrackerBugs are instantiated ONCE at the top level.
  // This prevents the 40+ requests on navigation and ensures live data updates
  // are received by the entire dashboard instead of being split across
  // multiple hook instances.
  // qa-sweep 2026-07-17: hand them the DataProvider pipe so neither spins up
  // its own useDataPipe (was 3 pipes from this provider chain alone — every
  // realtime INSERT and poll ran in triplicate).
  const sharedPipe = useContext(DataContext)
  const commandResult = useCommand(worldId, selectedKey, statusFilter, goalEdit, sharedPipe)
  const trackerResult = useTrackerBugs(worldId, sharedPipe)

  const value = {
    command: commandResult,
    tracker: trackerResult,
    selectedKey,
    setSelectedKey,
    statusFilter,
    setStatusFilter,
    goalEdit,
    setGoalEdit,
  }

  return (
    <CommandContext.Provider value={value}>
      {children}
    </CommandContext.Provider>
  )
}

// Hook: consume data from the shared context instead of calling useDataPipe directly.
export function useDataContext() {
  const ctx = useContext(DataContext)
  if (!ctx) {
    console.warn('useDataContext called outside DataProvider')
    return {
      agents: [],
      inboxItems: [],
      unreadRooms: [],
      projectRooms: [],
      personalTodos: [],
      missionRooms: [],
      agentThreadRooms: [],
      refetch: () => {},
    }
  }
  return ctx
}

// Hook: consume command data from the shared context.
export function useCommandContext() {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    console.warn('useCommandContext called outside CommandProvider')
    return {
      command: {},
      tracker: {},
      selectedKey: '',
      setSelectedKey: () => {},
      statusFilter: '',
      setStatusFilter: () => {},
      goalEdit: false,
      setGoalEdit: () => {},
    }
  }
  return ctx
}
