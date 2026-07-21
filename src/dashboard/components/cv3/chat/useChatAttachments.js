// useChatAttachments -- composer attachments and file uploads.
// Owns both the "stage files for next send" flow (pendingAttachments +
// stageFiles) and the "upload + immediately post as a message" flow
// (handleFileSelection).
//
// As of R79-f7 (2026-05-12) uploads stream directly to the RAG server tunnel
// (rag.aheadofmarket.com/upload-file-binary) using a short-lived HMAC token
// minted by /api/dashboard/upload-token. This bypasses Vercel's 25MB body cap
// so video/music files flow through at full size. Images still get compressed
// client-side to 1200px / 0.7 JPEG before upload because that's a UX win, not
// a size workaround. If the tunnel is unreachable we fall back to the legacy
// /api/dashboard/file-upload (base64-through-Vercel) so users aren't blocked
// during transient tunnel outages.
import { useCallback, useEffect, useRef, useState } from 'react'
import { authFetch } from '../../../lib/authFetch.js'
import { supabase } from '../../../lib/supabase.js'
import { useSystemToast } from '../../../SystemToast.jsx'

const TUNNEL_BASE = 'https://rag.aheadofmarket.com'

// R79-f23 leg1 colon fix (2026-05-30): selectedProject.missionSlug may arrive
// as the canonical colon-joined form "<project>:<mission>" (mission ledger
// format). The per-chat-folder disk layout wants just the bare mission slug
// so the directory looks like .../missions/<mission>/Uploads/ - not
// .../missions/<project>:<mission>/Uploads/. Strip the leading project
// prefix if present so disk paths stay clean across all upload paths.
function _bareMissionSlug(missionSlug, projectSlug) {
  if (!missionSlug) return missionSlug
  if (projectSlug && missionSlug.startsWith(projectSlug + ':')) {
    return missionSlug.slice(projectSlug.length + 1)
  }
  return missionSlug
}

// Read a File/Blob as a base64 string (no data: prefix). Only used for the
// legacy fallback path -- the primary tunnel path streams raw bytes.
function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  })
}

// Resize-and-recompress an image File to a 1200px-max JPEG. Returns the
// transformed Blob + the JPEG mime. Non-images are returned as-is.
async function maybeCompressImage(file) {
  if (!file.type.startsWith('image/')) return { blob: file, mime: file.type || 'application/octet-stream' }
  const dataUrl = await new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = dataUrl
  })
  const maxDim = 1200
  let w = img.width, h = img.height
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h)
    w = Math.round(w * scale); h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7))
  return { blob, mime: 'image/jpeg' }
}

async function uploadViaTunnel(file, world, mime, scope) {
  // The rag-server validates the Supabase JWT directly -- no Vercel signing
  // endpoint needed. The user's logged-in session already proves authorization.
  let jwt = null
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession()
      jwt = data?.session?.access_token || null
    } catch (_) { jwt = null }
  }
  if (!jwt) {
    const e = new Error('not signed in (no Supabase session)')
    e.status = 401
    throw e
  }
  // R79-f23 (2026-05-30): per-chat scope params so the rag-server lands the
  // file in the chat-specific Uploads/ folder (VISION pillar 9). project +
  // mission for mission rooms, project alone for project rooms, agent alone
  // for 1:1 agent rooms. Without scope the rag-server falls back to the
  // legacy flat root for backwards compat with cron / scripts.
  const params = new URLSearchParams({
    world,
    filename: file.name || 'upload.bin',
    mime,
  })
  if (scope?.project) params.set('project', scope.project)
  if (scope?.mission) params.set('mission', scope.mission)
  if (scope?.agent) params.set('agent', scope.agent)
  const uploadUrl = `${TUNNEL_BASE}/upload-file-binary?${params.toString()}`
  const r = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': mime,
    },
    body: file,
  })
  let data = null
  try { data = await r.json() } catch (_) {}
  if (!r.ok) {
    const e = new Error(data?.error || `tunnel upload ${r.status}`)
    e.status = r.status
    e.payload = data
    throw e
  }
  const full_url = data.url?.startsWith('http') ? data.url : `${TUNNEL_BASE}${data.url}`
  return { full_url, size: data.size, mime_type: data.mime_type || mime, filename: file.name }
}

async function uploadViaLegacyProxy(file, world, mime, scope) {
  // Legacy base64-through-Vercel fallback. The legacy /file-upload endpoint
  // predates R79-f23 chat-folder routing, so files dropped here still land
  // at the legacy flat root. The chat message metadata still carries the
  // scope so FilesPanel filters keep them visible. Acceptable as a transient
  // fallback when the tunnel is unreachable for small files.
  const data_base64 = await fileToBase64(file)
  const r = await authFetch('/api/dashboard/file-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ world, filename: file.name, data_base64, mime_type: mime, scope }),
  })
  const data = await r.json()
  if (!r.ok) {
    const e = new Error(data?.error || `legacy upload ${r.status}`)
    e.status = r.status
    throw e
  }
  return { full_url: data.full_url, size: data.size, mime_type: data.mime_type || mime, filename: file.name }
}

async function uploadOneFile(file, world, scope) {
  const { blob, mime } = await maybeCompressImage(file)
  const wrapped = new File([blob], file.name, { type: mime })
  let result
  try {
    result = await uploadViaTunnel(wrapped, world, mime, scope)
  } catch (err) {
    if (err.status === 413) throw err
    if (err.status === 401 || err.status === 403) throw err
    if (wrapped.size > 20 * 1024 * 1024) {
      console.error('[ChatPanel] tunnel upload failed for large file, no fallback:', err)
      throw err
    }
    console.warn('[ChatPanel] tunnel upload failed, falling back to legacy:', err.message)
    result = await uploadViaLegacyProxy(wrapped, world, mime, scope)
  }
  // Tell the storage meter to refresh immediately -- otherwise it waits up to
  // 30s for the next poll and the user wonders if the upload counted.
  try {
    window.dispatchEvent(new CustomEvent('corner:upload-finished', { detail: { world, size: result.size } }))
  } catch (_) {}
  return result
}

export default function useChatAttachments({
  selectedAgent,
  selectedProject,
  worldId,
  userIdentity,
  setMessages,
  sendProjectTextRef,
}) {
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [stagingFiles, setStagingFiles] = useState(false)
  const pendingAttachmentsRef = useRef([])
  useEffect(() => { pendingAttachmentsRef.current = pendingAttachments }, [pendingAttachments])

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const { showToast } = useSystemToast()

  const surfaceUploadError = useCallback((err, filename) => {
    let message
    if (err.status === 413) {
      message = err.payload?.used_mb != null
        ? `Storage full (${err.payload.used_mb}MB of ${err.payload.limit_mb}MB used). Clean up or move to cloud storage.`
        : (err.message || 'Storage limit reached.')
    } else if (err.status === 401 || err.status === 403) {
      message = `Upload denied (${err.status}). Try signing in again.`
    } else {
      message = err.message ? `Upload failed: ${err.message}` : 'Upload failed.'
    }
    if (filename) message = `${message} [${filename}]`
    showToast(message, err.status === 413 ? 'warning' : 'error', 7000)
  }, [showToast])

  const addPendingAttachment = useCallback((att) => {
    if (!att || !att.url) return
    setPendingAttachments(prev => {
      if (prev.some(p => p.id === att.id)) return prev
      return [...prev, att]
    })
  }, [])

  const removePendingAttachment = useCallback((id) => {
    setPendingAttachments(prev => prev.filter(p => p.id !== id))
  }, [])

  const stageFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || !worldId) return
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    // R79-f23: pass per-chat scope so the rag-server writes to the right
    // chat folder. Same shape as handleFileSelection so disk routing and
    // message metadata stay in lockstep.
    const scope = {}
    if (selectedProject?.slug) scope.project = selectedProject.slug
    if (selectedProject?.missionSlug) scope.mission = _bareMissionSlug(selectedProject.missionSlug, selectedProject.slug)
    if (selectedAgent?.slug && !selectedProject) scope.agent = selectedAgent.slug
    setStagingFiles(true)
    try {
      for (const file of files) {
        try {
          const result = await uploadOneFile(file, clientId, scope)
          addPendingAttachment({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: result.filename || file.name,
            url: result.full_url,
            mimeType: result.mime_type,
            size: result.size ?? file.size,
          })
        } catch (err) {
          console.error('[ChatPanel] stageFiles error:', err)
          surfaceUploadError(err, file.name)
        }
      }
    } finally {
      setStagingFiles(false)
    }
  }, [worldId, selectedProject, selectedAgent, addPendingAttachment, surfaceUploadError])

  const handleFileSelection = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    // 2026-05-29: make the silent bails loud. Patrik couldn't tell why
    // multi-file uploads were quietly doing nothing. Console + toast both.
    if (!files.length) {
      console.warn('[ChatPanel] upload bailed: no files selected')
      return
    }
    if (!worldId) {
      console.error('[ChatPanel] upload bailed: worldId not loaded — page still signing in')
      try { showToast('Upload paused: still signing in. Try again in a second.', 'warning', 5000) } catch (_) {}
      return
    }
    const agentKey = selectedAgent ? selectedAgent.slug : (selectedProject ? `project:${selectedProject.slug}` : null)
    if (!agentKey) {
      console.error('[ChatPanel] upload bailed: no agent or project — open a chat first')
      try { showToast('Upload failed: open a chat first.', 'warning', 5000) } catch (_) {}
      return
    }
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    e.target.value = ''
    // R79-f23 (2026-05-30): chat scope drives BOTH the disk-folder routing on
    // the rag-server (project/mission/agent → Uploads/) AND the message
    // metadata that the FilesPanel filters on. Same source object so they
    // can't drift.
    const scope = {}
    if (selectedProject?.slug) scope.project = selectedProject.slug
    if (selectedProject?.missionSlug) scope.mission = _bareMissionSlug(selectedProject.missionSlug, selectedProject.slug)
    if (selectedAgent?.slug && !selectedProject) scope.agent = selectedAgent.slug
    console.log('[ChatPanel] upload starting', { fileCount: files.length, agentKey, clientId, scope })
    setUploading(true)

    // Upload all files, collecting results (failed files show toasts; successes bundle into one message)
    const uploaded = []
    for (const file of files) {
      try {
        const result = await uploadOneFile(file, clientId, scope)
        uploaded.push({ file, result })
        console.log('[ChatPanel] upload ok', { name: file.name, size: result.size, url: result.full_url })
      } catch (err) {
        console.error('[ChatPanel] file attach error:', file.name, err)
        surfaceUploadError(err, file.name)
      }
    }
    setUploading(false)

    if (!uploaded.length) {
      console.error('[ChatPanel] upload bailed: all', files.length, 'files failed — see prior errors')
      try { showToast(`Upload failed: all ${files.length} files failed. Check console for the reason.`, 'error', 7000) } catch (_) {}
      return
    }

    // Build a SINGLE message carrying all successfully-uploaded files.
    // Single-file path: keep the "Attached file: name\nurl" shape the listener/
    // bridge already parse for [Local path: ...] hints.
    // Multi-file path: "Attached N files: name1, name2…\nurl1\nurl2…" — the
    // listener/bridge find all RAG URLs in the text body via regex and emit the
    // [Local paths (handle each per its instruction): ...] block.  metadata uses
    // the plural `attachments` array; MessageList reads both shapes.
    const attachmentMetas = uploaded.map(({ file, result }) => ({
      url: result.full_url,
      mime: result.mime_type,
      size: result.size ?? file.size,
      name: file.name,
    }))

    // R79-f19: record the chat scope on every upload so the right-rail
    // file browser can filter to "files uploaded in THIS chat." Three
    // scopes (Patrik 2026-05-29): mission room → mission_slug + project_slug;
    // project room → project_slug only; 1:1 agent → agent_slug only.
    // Disk bytes still live in ~/Documents/Corner/files/<world>/<uuid>-<name>;
    // routing is purely metadata so uploads can't break if scope is wrong.
    const uploadScope = {}
    if (selectedProject?.slug) uploadScope.project_slug = selectedProject.slug
    if (selectedProject?.missionSlug) uploadScope.mission_slug = _bareMissionSlug(selectedProject.missionSlug, selectedProject.slug)
    if (selectedAgent?.slug && !selectedProject) uploadScope.agent_slug = selectedAgent.slug

    // Fold the "can you confirm you got it?" ask into THIS one attachment message
    // for project rooms (RANK 19b), instead of firing a second delayed message that
    // caused a double-dispatch (and sometimes the agent replied to the confirm before
    // the file hint). One row → one dispatch, carrying both the caption and the hint.
    // The ask rides on a trailing line AFTER the URL(s); the bridge/listener parse the
    // "Attached ..." header + RAG URLs, and rowAttachments only reads the URL lines, so
    // a natural-language tail can't be mistaken for a file address.
    const confirmAsk = selectedProject
      ? (attachmentMetas.length === 1
          ? `\n\nI just uploaded ${attachmentMetas[0].name}. Can you confirm you got it?`
          : `\n\nI just uploaded ${attachmentMetas.length} files: ${attachmentMetas.map(a => a.name).join(', ')}. Can you confirm you got them?`)
      : ''

    let attachText, metadata
    if (attachmentMetas.length === 1) {
      const att = attachmentMetas[0]
      attachText = `Attached file: ${att.name}\n${att.url}${confirmAsk}`
      metadata = { attachment: att, ...uploadScope }
    } else {
      const names = attachmentMetas.map(a => a.name).join(', ')
      const urls = attachmentMetas.map(a => a.url).join('\n')
      attachText = `Attached ${attachmentMetas.length} files: ${names}\n${urls}${confirmAsk}`
      metadata = { attachments: attachmentMetas, ...uploadScope }
    }

    const firstAtt = attachmentMetas[0]

    // Optimistic message (single row for all attachments).
    const tempId = `temp-attach-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      agent: agentKey,
      text: attachText,
      timestamp: new Date().toISOString(),
      source: 'corner-dashboard',
      attachment_url: firstAtt.url,
      file_mime_type: firstAtt.mime,
      file_size: firstAtt.size,
      metadata,
    }])

    authFetch('/api/dashboard/supabase-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: agentKey,
        text: attachText,
        role: 'user',
        source: 'corner-dashboard',
        client_id: clientId,
        // 2026-05-29 R79-f22: explicitly send the project slug so the row's
        // `project` column gets populated. Without this, detectProjectFromText
        // ran on text like "Attached N files: name1.xlsx…" — no project tag,
        // no slug match — and stamped project=NULL. The Files panel's
        // `project=eq.<slug>` filter then dropped the row entirely.
        ...(selectedProject?.slug ? { project: selectedProject.slug } : {}),
        metadata,
        ...userIdentity,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.message?.id) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
        }
      })
      .catch(() => {})

    // (RANK 19b) The former delayed second "I just uploaded X, can you confirm…"
    // send was removed — its ask is now folded into attachText above, so the upload
    // is exactly ONE row / ONE dispatch. sendProjectTextRef is retained on the hook's
    // signature for API compatibility but is no longer used here.
  }, [selectedAgent, selectedProject, worldId, userIdentity, setMessages, sendProjectTextRef, surfaceUploadError])

  return {
    pendingAttachments, setPendingAttachments,
    pendingAttachmentsRef,
    stagingFiles,
    uploading,
    fileInputRef,
    addPendingAttachment, removePendingAttachment,
    stageFiles,
    handleFileSelection,
  }
}
