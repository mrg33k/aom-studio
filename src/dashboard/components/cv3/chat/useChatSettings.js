// useChatSettings -- settings panel state (tabs, rename, invites, env keys)
// plus per-chat voice selection. The settings effect fires whenever the
// modal opens to refresh collaborators and env_vars for the current scope.
// Extracted from ChatPanel.jsx (R2b split).
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '../../../lib/authFetch.js'

export default function useChatSettings({
  selectedAgent,
  selectedProject,
  worldId,
  currentUser,
  currentChatKey,
}) {
  // ── Modal + tab state ────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('Keys')
  const [filesOpen, setFilesOpen] = useState(false)
  // R79-f1: canon docs reader (VISION/RESEARCH/BUILD/CONTEXT/tape).
  const [canonFilesOpen, setCanonFilesOpen] = useState(false)
  // R40: agent profile overlay (info-icon target).
  const [profileOpen, setProfileOpen] = useState(false)
  // R41: recipes book flyout.
  const [recipesOpen, setRecipesOpen] = useState(false)

  // ── Rename ───────────────────────────────────────────────────────────────
  const [chatNameInput, setChatNameInput] = useState('')

  // ── Collaborators / invite ───────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null)
  const [collaborators, setCollaborators] = useState([])

  // ── Env keys ─────────────────────────────────────────────────────────────
  const [envKeys, setEnvKeys] = useState({ user: [], project: [] })
  const [envKeysLoading, setEnvKeysLoading] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyScope, setNewKeyScope] = useState('user')
  const [keySaveMsg, setKeySaveMsg] = useState(null)

  // ── Per-chat voice selection ─────────────────────────────────────────────
  const [agentVoices, setAgentVoices] = useState({})
  const currentVoice = currentChatKey ? (agentVoices[currentChatKey] || 'kore') : 'kore'

  useEffect(() => {
    if (!worldId) return
    authFetch(`/api/dashboard/agent-voice?client=${encodeURIComponent(worldId)}`)
      .then(r => r.ok ? r.json() : { voices: {} })
      .then(({ voices }) => { if (voices) setAgentVoices(voices) })
      .catch(() => {})
  }, [worldId])

  const selectVoice = useCallback((voice) => {
    if (!currentChatKey) return
    setAgentVoices(prev => ({ ...prev, [currentChatKey]: voice }))
    authFetch('/api/dashboard/agent-voice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: currentChatKey, voice, client_id: worldId }),
    }).catch(() => {})
  }, [currentChatKey, worldId])

  // ── Per-chat model selection (corner:gemini-workers R3) ─────────────────
  // Same shape as voice: user_preferences key='agent_models' via the
  // agent-model endpoint. The bridge daemon reads it per message and routes
  // the turn (claude pool vs gemini lane) — the UI only stores the choice.
  const [agentModels, setAgentModels] = useState({})
  const currentModel = currentChatKey ? (agentModels[currentChatKey] || 'default') : 'default'

  useEffect(() => {
    if (!worldId) return
    authFetch(`/api/dashboard/agent-model?client=${encodeURIComponent(worldId)}`)
      .then(r => r.ok ? r.json() : { models: {} })
      .then(({ models }) => { if (models) setAgentModels(models) })
      .catch(() => {})
  }, [worldId])

  const selectModel = useCallback((model) => {
    if (!currentChatKey) return
    setAgentModels(prev => ({ ...prev, [currentChatKey]: model }))
    authFetch('/api/dashboard/agent-model', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: currentChatKey, model, client_id: worldId }),
    }).catch(() => {})
  }, [currentChatKey, worldId])

  // ── When settings modal opens, refresh name + collaborators + env keys ───
  useEffect(() => {
    if (settingsOpen) {
      setSettingsTab('Keys')
      const name = selectedAgent ? selectedAgent.name : (selectedProject?.name || '')
      setChatNameInput(name)
      if (selectedProject?.id) {
        setInviteEmail('')
        setInviteMsg(null)
        fetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
          .then(r => r.json())
          .then(data => { if (data.collaborators) setCollaborators(data.collaborators) })
          .catch(() => {})
      }
      setEnvKeysLoading(true)
      setNewKeyName('')
      setNewKeyValue('')
      setKeySaveMsg(null)
      const cid = worldId || 'aom'
      const fetches = []
      if (currentUser?.id) {
        fetches.push(
          authFetch(`/api/dashboard/env-vars?scope=user&scope_id=${encodeURIComponent(currentUser.id)}&client=${encodeURIComponent(cid)}`)
            .then(r => r.json()).then(d => d.keys || []).catch(() => [])
        )
      } else {
        fetches.push(Promise.resolve([]))
      }
      const projSlug = selectedProject?.slug
      if (projSlug) {
        fetches.push(
          authFetch(`/api/dashboard/env-vars?scope=project&scope_id=${encodeURIComponent(projSlug)}&client=${encodeURIComponent(cid)}`)
            .then(r => r.json()).then(d => d.keys || []).catch(() => [])
        )
      } else {
        fetches.push(Promise.resolve([]))
      }
      Promise.all(fetches).then(([userKeys, projectKeys]) => {
        setEnvKeys({ user: userKeys, project: projectKeys })
        setEnvKeysLoading(false)
      })
    }
  }, [settingsOpen, selectedAgent, selectedProject])

  const saveRoomName = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed || !currentChatKey) return
    const slug = currentChatKey.startsWith('project:')
      ? currentChatKey.replace('project:', '')
      : currentChatKey
    fetch(`/api/dashboard/agent-status?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(trimmed)}&client_id=${encodeURIComponent(worldId)}`, {
      method: 'PATCH',
    }).catch(() => {})
  }, [currentChatKey, worldId])

  const saveEnvKey = useCallback(async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return
    const cid = worldId || 'aom'
    const scopeId = newKeyScope === 'project'
      ? (selectedProject?.slug || '')
      : (currentUser?.id || '')
    if (!scopeId) { setKeySaveMsg({ type: 'err', text: 'No scope target' }); return }
    try {
      const r = await authFetch('/api/dashboard/env-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: newKeyScope, scope_id: scopeId, key: newKeyName.trim().toUpperCase(), value: newKeyValue.trim(), client_id: cid }),
      })
      const data = await r.json()
      if (data.ok) {
        setKeySaveMsg({ type: 'ok', text: 'Saved' })
        setNewKeyName('')
        setNewKeyValue('')
        const listR = await authFetch(`/api/dashboard/env-vars?scope=${newKeyScope}&scope_id=${encodeURIComponent(scopeId)}&client=${encodeURIComponent(cid)}`)
        const listD = await listR.json()
        setEnvKeys(prev => ({ ...prev, [newKeyScope]: listD.keys || [] }))
      } else {
        setKeySaveMsg({ type: 'err', text: data.error || 'Save failed' })
      }
    } catch { setKeySaveMsg({ type: 'err', text: 'Network error' }) }
  }, [newKeyName, newKeyValue, newKeyScope, worldId, selectedProject, currentUser])

  const deleteEnvKey = useCallback(async (scope, key) => {
    const cid = worldId || 'aom'
    const scopeId = scope === 'project'
      ? (selectedProject?.slug || '')
      : (currentUser?.id || '')
    if (!scopeId) return
    try {
      await authFetch('/api/dashboard/env-vars', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, scope_id: scopeId, key, client_id: cid }),
      })
      const listR = await authFetch(`/api/dashboard/env-vars?scope=${scope}&scope_id=${encodeURIComponent(scopeId)}&client=${encodeURIComponent(cid)}`)
      const listD = await listR.json()
      setEnvKeys(prev => ({ ...prev, [scope]: listD.keys || [] }))
    } catch {}
  }, [worldId, selectedProject, currentUser])

  return {
    settingsOpen, setSettingsOpen,
    settingsTab, setSettingsTab,
    filesOpen, setFilesOpen,
    canonFilesOpen, setCanonFilesOpen,
    profileOpen, setProfileOpen,
    recipesOpen, setRecipesOpen,
    chatNameInput, setChatNameInput,
    inviteEmail, setInviteEmail,
    inviteLoading, setInviteLoading,
    inviteMsg, setInviteMsg,
    collaborators, setCollaborators,
    envKeys, envKeysLoading,
    newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue,
    newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    agentVoices, setAgentVoices,
    currentVoice, selectVoice,
    agentModels, setAgentModels,
    currentModel, selectModel,
    saveRoomName, saveEnvKey, deleteEnvKey,
  }
}
