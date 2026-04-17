// ChatPanelContext -- feature-sliced local contexts for the ChatPanel tree.
//
// R3b (Apr 17, 2026): replaced the single ~80-field ctx object that ChatPanel
// was threading into ProjectChatView / ThreadView / ConversationsView.
// Each slice below maps to one scoped hook from ./ (or shell-local state).
// The shell (ChatPanel.jsx) is the single composition scope — it runs all
// hooks, shares refs/callbacks across them, and wraps children in the nested
// Providers. Sub-views read via the useChatXxx() hooks instead of destructuring
// a 60-field prop. Cross-cutting props from CornerV3 (worldId, agents, user,
// allTasks, onSelectAgent, etc) still flow in as plain props to ChatPanel —
// R3d collapses that layer.
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

// Core: shell-level selections, identity, route handles, constants.
const core = makeSlice('useChatCore')
export const ChatCoreProvider = core.Provider
export const useChatCore = core.useSlice

// Messages: thread history + realtime subscription state.
const msgs = makeSlice('useChatMessagesCtx')
export const ChatMessagesProvider = msgs.Provider
export const useChatMessagesCtx = msgs.useSlice

// Send: composer input, in-flight state, send callbacks, bridge stream.
const send = makeSlice('useChatSendCtx')
export const ChatSendProvider = send.Provider
export const useChatSendCtx = send.useSlice

// Attachments: pending attachments + legacy upload-as-message flow.
const attach = makeSlice('useChatAttachmentsCtx')
export const ChatAttachmentsProvider = attach.Provider
export const useChatAttachmentsCtx = attach.useSlice

// Recording: mic → transcribe → route to active chat (elapsed timer lives here).
const rec = makeSlice('useChatRecordingCtx')
export const ChatRecordingProvider = rec.Provider
export const useChatRecordingCtx = rec.useSlice

// Voice: live voice-mode session (VoiceChat host + minimized banner).
const voice = makeSlice('useChatVoiceCtx')
export const ChatVoiceProvider = voice.Provider
export const useChatVoiceCtx = voice.useSlice

// Settings: settings modal tabs, rename, invites, env keys, per-chat voice.
const settings = makeSlice('useChatSettingsCtx')
export const ChatSettingsProvider = settings.Provider
export const useChatSettingsCtx = settings.useSlice

// Search: in-chat history search (open chevron → /messages?search=).
const search = makeSlice('useChatSearchCtx')
export const ChatSearchProvider = search.Provider
export const useChatSearchCtx = search.useSlice

// Context menu: right-click / long-press actions (reply, verify, research, move).
const cmenu = makeSlice('useChatContextMenuCtx')
export const ChatContextMenuProvider = cmenu.Provider
export const useChatContextMenuCtx = cmenu.useSlice

// Conversations: sidebar list state (search, pins, previews, filtered lists).
const conv = makeSlice('useChatConversationsCtx')
export const ChatConversationsProvider = conv.Provider
export const useChatConversationsCtx = conv.useSlice

// Prefs: favorites, mutes, hidden, section collapse state.
const prefs = makeSlice('useChatPrefsCtx')
export const ChatPrefsProvider = prefs.Provider
export const useChatPrefsCtx = prefs.useSlice
