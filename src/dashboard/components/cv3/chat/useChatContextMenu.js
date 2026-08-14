// useChatContextMenu -- right-click menu state + action handlers.
// Owns the replyTo chip, the ctxMenu position/data, the needsVerification
// flag set, and the transient toast. Handlers are shared between ThreadView,
// ProjectChatView, and TasksPanel. Each handler performs the server write
// then surfaces a small toast; the menu itself is opened/closed by
// setCtxMenu from the clicked surface.
// Extracted from ChatPanel.jsx (R2b split).
import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { getClientId } from '../../../lib/clientConfig.js'
import { createTaskWithRex } from '../../../lib/rexTaskClient.js'
import { authFetch } from '../../../lib/authFetch.js'

export default function useChatContextMenu({
  worldId,
  selectedProject,
  userIdentity,
  inputRef,
}) {
  //   replyTo: { type:'message'|'task', id, label, snippet, agent? } | null
  //   ctxMenu: { kind:'message'|'task', x, y, data } | null
  //   needsVerificationIds: Set<string>   local flag for optimistic UI
  //   lastActionToast: { text, at } | null
  const [replyTo, setReplyTo] = useState(null)
  const [ctxMenu, setCtxMenu] = useState(null)
  const [needsVerificationIds, setNeedsVerificationIds] = useState(() => new Set())
  const [lastActionToast, setLastActionToast] = useState(null)

  const showToast = useCallback((text) => {
    setLastActionToast({ text, at: Date.now() })
    setTimeout(() => setLastActionToast(null), 2400)
  }, [])

  const snippetOf = useCallback((s, n = 120) => {
    const t = String(s || '').replace(/\s+/g, ' ').trim()
    return t.length > n ? t.slice(0, n - 1) + '…' : t
  }, [])

  const currentClientId = useMemo(() => {
    if (selectedProject?.isShared) return `shared:${selectedProject.slug}`
    return worldId || getClientId() || 'aom'
  }, [selectedProject, worldId])

  // MESSAGES: Follow-up → set chip, focus composer
  // fallow-ignore-next-line complexity
  const handleMessageFollowUp = useCallback((msg) => {
    if (!msg) return
    // Extract attachment info so the reply chip can show a video/image thumbnail
    let metaAtt = null
    if (msg.metadata) {
      if (typeof msg.metadata === 'object') metaAtt = msg.metadata.attachment
      else { try { metaAtt = JSON.parse(msg.metadata)?.attachment } catch (_) {} }
    }
    const atts = (msg.attachments && msg.attachments.length) ? msg.attachments : null
    const attUrl = atts?.[0]?.url || msg.attachment_url || metaAtt?.url || null
    const attMime = atts?.[0]?.mime || msg.file_mime_type || metaAtt?.mime || null
    const attachmentKind = attMime?.startsWith('video/') ? 'video'
      : attMime?.startsWith('image/') ? 'image'
      : attMime?.startsWith('audio/') ? 'audio'
      : null
    setReplyTo({
      type: 'message',
      id: msg.id,
      label: msg.agent || msg.role || 'message',
      snippet: snippetOf(msg.text),
      agent: msg.agent,
      attachment_kind: attachmentKind,
      attachment_url: attachmentKind ? attUrl : null,
    })
    setTimeout(() => inputRef?.current?.focus(), 40)
  }, [snippetOf, inputRef])

  // MESSAGES: Needs verification → flag message + spawn 'verify' task
  const handleMessageNeedsVerification = useCallback(async (msg) => {
    if (!msg) return
    setNeedsVerificationIds(prev => {
      const next = new Set(prev); next.add(msg.id); return next
    })
    try {
      const text = `Verify this message from ${msg.agent || 'agent'}:\n\n"${snippetOf(msg.text, 480)}"`
      await createTaskWithRex(text, userIdentity.user_id, userIdentity.user_name, {
        projectSlug: selectedProject?.slug || msg.project || null,
        clientId: currentClientId,
      })
      authFetch('/api/dashboard/supabase-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, status: 'delivered' }),
      }).catch(() => {})
      showToast('Verify task queued')
    } catch (err) {
      console.error('[ChatPanel] needs-verification error:', err)
      showToast('Could not queue verify task')
    }
  }, [snippetOf, userIdentity, selectedProject, currentClientId, showToast])

  // MESSAGES: Research → create research task, worker writes brief
  const handleMessageResearch = useCallback(async (msg) => {
    if (!msg) return
    try {
      const title = `Research: ${snippetOf(msg.text, 90)}`
      const body = `${title}\n\nSource message (agent=${msg.agent || '?'}):\n"${snippetOf(msg.text, 500)}"\n\nWrite a brief in docs/briefs/ and attach it to the relevant project's Files section.`
      await createTaskWithRex(body, userIdentity.user_id, userIdentity.user_name, {
        projectSlug: selectedProject?.slug || msg.project || null,
        clientId: currentClientId,
      })
 showToast('Research task queued, brief will land in Files')
    } catch (err) {
      console.error('[ChatPanel] research error:', err)
      showToast('Could not queue research task')
    }
  }, [snippetOf, userIdentity, selectedProject, currentClientId, showToast])

  // MESSAGES: Send to (agent) → crosspost the message body to a target agent
  const handleMessageSendTo = useCallback(async (msg, target) => {
    if (!msg || !target?.slug) return
    try {
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: target.slug,
          text: `[crosspost from ${msg.agent || 'chat'}]\n\n${msg.text || ''}`,
          role: 'user',
          source: 'crosspost',
          client_id: currentClientId,
          ...userIdentity,
          metadata: { crosspost_from: msg.id, from_agent: msg.agent || null },
        }),
      })
      showToast(`Sent to ${target.name || target.slug}`)
    } catch (err) {
      console.error('[ChatPanel] send-to error:', err)
      showToast('Could not send')
    }
  }, [userIdentity, currentClientId, showToast])

  // TASKS: Follow-up → set chip targeting the task
  const handleTaskFollowUp = useCallback((task) => {
    if (!task) return
    setReplyTo({
      type: 'task',
      id: task.id,
      label: task.title || task.id,
      snippet: snippetOf(task.title || task.text || ''),
    })
    setTimeout(() => inputRef?.current?.focus(), 40)
  }, [snippetOf, inputRef])

  // TASKS: Needs verification → create verify sub-task linked via metadata.parent_task_id
  const handleTaskNeedsVerification = useCallback(async (task) => {
    if (!task) return
    try {
 const body = `Verify task "${task.title || task.id}" output.\n\nParent task id: ${task.id}\nProject: ${task.project || '·'}\n\nRead the parent's completion payload and confirm it matches expectations.`
      const row = {
        title: `Verify: ${snippetOf(task.title || task.id, 90)}`,
        text: body,
        description: body,
        status: 'queued',
        source: 'corner-dashboard-task',
        client_id: currentClientId,
        created_by: userIdentity.user_id || null,
        project: task.project || null,
        metadata: {
          parent_task_id: task.id,
          kind: 'verify',
          created_via: 'context-menu',
          model: 'sonnet',
        },
      }
      await supabase.from('tasks').insert(row)
      showToast('Verify sub-task queued')
    } catch (err) {
      console.error('[ChatPanel] task verify error:', err)
      showToast('Could not queue verify sub-task')
    }
  }, [snippetOf, currentClientId, userIdentity, showToast])

  // TASKS: Research → create research sub-task linked via metadata.parent_task_id
  const handleTaskResearch = useCallback(async (task) => {
    if (!task) return
    try {
 const body = `Research follow-up for task "${task.title || task.id}".\n\nParent task id: ${task.id}\nProject: ${task.project || '·'}\n\nWrite a brief in docs/briefs/ and attach it to the ${task.project || 'relevant'} project's Files section.`
      const row = {
        title: `Research: ${snippetOf(task.title || task.id, 90)}`,
        text: body,
        description: body,
        status: 'queued',
        source: 'corner-dashboard-task',
        client_id: currentClientId,
        created_by: userIdentity.user_id || null,
        project: task.project || null,
        metadata: {
          parent_task_id: task.id,
          kind: 'research',
          created_via: 'context-menu',
          model: 'sonnet',
        },
      }
      await supabase.from('tasks').insert(row)
      showToast('Research sub-task queued')
    } catch (err) {
      console.error('[ChatPanel] task research error:', err)
      showToast('Could not queue research sub-task')
    }
  }, [snippetOf, currentClientId, userIdentity, showToast])

  // TASKS: Move to (project) → update tasks.project + append to metadata.move_history
  const handleTaskMoveTo = useCallback(async (task, target) => {
    if (!task || !target?.slug) return
    const fromSlug = task.project || null
    if (fromSlug && String(fromSlug).toLowerCase() === String(target.slug).toLowerCase()) return
    try {
      const existingMeta = (task.metadata && typeof task.metadata === 'object') ? task.metadata : {}
      const history = Array.isArray(existingMeta.move_history) ? existingMeta.move_history : []
      const nextMeta = {
        ...existingMeta,
        move_history: [
          ...history,
          { from: fromSlug, to: target.slug, at: new Date().toISOString(), by: userIdentity.user_id || null },
        ],
      }
      await supabase
        .from('tasks')
        .update({ project: target.slug, metadata: nextMeta })
        .eq('id', task.id)
      showToast(`Moved to ${target.name || target.slug}`)
    } catch (err) {
      console.error('[ChatPanel] task move error:', err)
      showToast('Could not move task')
    }
  }, [userIdentity, showToast])

  return {
    replyTo, setReplyTo,
    ctxMenu, setCtxMenu,
    needsVerificationIds,
    lastActionToast,
    showToast,
    currentClientId,
    handleMessageFollowUp,
    handleMessageNeedsVerification,
    handleMessageResearch,
    handleMessageSendTo,
    handleTaskFollowUp,
    handleTaskNeedsVerification,
    handleTaskResearch,
    handleTaskMoveTo,
  }
}