// CornerContext -- top-level cross-cutting state for the Corner dashboard.
//
// R3d (Apr 17, 2026): the last layer of prop drilling. Before R3d, CornerV3
// composed a cross-cutting bag (auth, world, data pipe, navigation) and
// passed it as ~24 individual props to ChatPanel + TasksPanel. After R3d,
// CornerV3 owns the same state and exposes it through three sliced contexts;
// ChatPanel and TasksPanel read directly via the matching useCornerXxx()
// hook, with zero cross-cutting props.
//
// Why three slices instead of one provider:
//   - auth: rarely changes (login, world switch). Memoized once per session.
//   - data: refreshes via realtime/polling (agents, tasks, project rooms).
//   - nav: changes on every click (selection, tab, prefill).
// Co-locating auth + data + nav in one provider would re-render every nav
// click as if auth changed. Sliced consumers only re-render when their
// own slice's value identity changes.
//
// Provider nesting (in CornerV3): Auth outermost (foundational), Data next
// (depends on worldId), Nav innermost (depends on Data for selection).
import { createContext, useContext } from 'react'

function makeSlice(name) {
  const Ctx = createContext(null)
  function Provider({ value, children }) {
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }
  function useSlice() {
    const v = useContext(Ctx)
    if (!v) throw new Error(`${name} must be used inside its matching Provider`)
    return v
  }
  return { Provider, useSlice }
}

// Auth: identity + world + session-level helpers.
//   currentUser, setCurrentUser, worldId, showToast
const auth = makeSlice('useCornerAuth')
export const CornerAuthProvider = auth.Provider
export const useCornerAuth = auth.useSlice

// Data: server-fed pipes (realtime / polling).
//   agents, inboxItems, projectRooms (from useDataPipe)
//   queued, rightNow, waiting, done, allTasks, refreshTasks, addOptimisticTask (from useTasks)
const data = makeSlice('useCornerData')
export const CornerDataProvider = data.Provider
export const useCornerData = data.useSlice

// Nav: per-click selection + composer prefill + tab routing callbacks.
//   tab, setTab, handleTabChange
//   selectedAgent, conversationTarget
//   handleSelectAgent, handleSelectProject, handleBackFromConversation
//   prefillMessage, setPrefillMessage
const nav = makeSlice('useCornerNav')
export const CornerNavProvider = nav.Provider
export const useCornerNav = nav.useSlice
