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

async function uploadViaTunnel(file, world, mime) {
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
  const uploadUrl = `${TUNNEL_BASE}/upload-file-binary?world=${encodeURIComponent(world)}&filename=${encodeURIComponent(file.name || 'upload.bin')}&mime=${encodeURIComponent(mime)}`
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

async function uploadViaLegacyProxy(file, world, mime) {
  const data_base64 = await fileToBase64(file)
  const r = await authFetch('/api/dashboard/file-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ world, filename: file.name, data_base64, mime_type: mime }),
  })
  const data = await r.json()
  if (!r.ok) {
    const e = new Error(data?.error || `legacy upload ${r.status}`)
    e.status = r.status
    throw e
  }
  return { full_url: data.full_url, size: data.size, mime_type: data.mime_type || mime, filename: file.name }
}

async function uploadOneFile(file, world) {
  const { blob, mime } = await maybeCompressImage(file)
  const wrapped = new File([blob], file.name, { type: mime })
  let result
  try {
    result = await uploadViaTunnel(wrapped, world, mime)
  } catch (err) {
    if (err.status === 413) throw err
    if (err.status === 401 || err.status === 403) throw err
    if (wrapped.size > 20 * 1024 * 1024) {
      console.error('[ChatPanel] tunnel upload failed for large file, no fallback:', err)
      throw err
    }
    console.warn('[ChatPanel] tunnel upload failed, falling back to legacy:', err.message)
    result = await uploadViaLegacyProxy(wrapped, world, mime)
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

  // R79-f18d: defensive reset. If the room changes (user navigates to a
  // different project / agent / mission), reset the upload spinner state
  // so a stuck `uploading=true` from a crashed prior upload doesn't carry
  // across rooms. Also runs once on mount, which is the moment the user
  // is most likely to hit this on a fresh page load.
  useEffect(() => {
    setUploading(false)
    setStagingFiles(false)
  }, [selectedAgent?.slug, selectedProject?.slug, selectedProject?.missionSlug, worldId])

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
    setStagingFiles(true)
    try {
      for (const file of files) {
        try {
          const result = await uploadOneFile(file, clientId)
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
  }, [worldId, selectedProject, addPendingAttachment, surfaceUploadError])

  const handleFileSelection = useCallback(async (e) => {
    // R79-f18c: ENTRY toast (not just console log) so Patrik can see whether
    // the click is even reaching this function without opening DevTools.
    // R79-f18b: top-level entry log + outer try/catch — diagnostics inside the
    // happy path were missing anything that threw before or after. Whole
    // function is now wrapped so an unexpected exception surfaces as a toast
    // instead of disappearing into React's error boundary.
    const _entryFiles = Array.from(e.target.files || [])
    console.info('[ChatPanel] handleFileSelection ENTRY', {
      files: _entryFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
      worldId,
      selectedAgentSlug: selectedAgent?.slug || null,
      selectedProjectSlug: selectedProject?.slug || null,
      missionSlug: selectedProject?.missionSlug || null,
      isShared: selectedProject?.isShared || false,
    })
    // Visible on-screen diagnostic — disappears in 2s, doesn't block anything.
    // This is the "did my click work?" signal. If you click attach and see
    // NO toast at all, the bug is upstream of this function (button wiring).
    if (_entryFiles.length > 0) {
      try {
        showToast(`Upload starting: ${_entryFiles.length} file${_entryFiles.length === 1 ? '' : 's'}…`, 'info', 2500)
      } catch {}
    }
    const files = _entryFiles
    if (!files.length) {
      console.warn('[ChatPanel] upload skipped: file picker returned 0 files (user cancelled?)')
      return
    }
    // R79-f18: convert silent returns into visible toasts so when an upload
    // disappears we can tell which precondition was missing instead of
    // staring at an empty network tab. The two known silent paths are
    // (a) worldId not resolved yet (auth/session race) and (b) no agent or
    // project selected (user clicked attach before the room was ready).
    if (!worldId) {
      console.error('[ChatPanel] upload aborted: worldId missing', { worldId, selectedAgent, selectedProject })
      showToast('Upload not started — workspace not loaded yet. Refresh and try again.', 'error', 7000)
      e.target.value = ''
      return
    }
    const agentKey = selectedAgent ? selectedAgent.slug : (selectedProject ? `project:${selectedProject.slug}` : null)
    if (!agentKey) {
      console.error('[ChatPanel] upload aborted: no agent or project selected', { selectedAgent, selectedProject })
      showToast('Upload not started — pick an agent or project first.', 'error', 7000)
      e.target.value = ''
      return
    }
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    e.target.value = ''
    setUploading(true)

    try {

    // Upload all files, collecting results (failed files show toasts; successes bundle into one message)
    const uploaded = []
    for (const file of files) {
      try {
        const result = await uploadOneFile(file, clientId)
        uploaded.push({ file, result })
        console.info('[ChatPanel] file uploaded ok', { name: file.name, size: result.size, url: result.full_url })
      } catch (err) {
        console.error('[ChatPanel] file attach error:', err)
        surfaceUploadError(err, file.name)
      }
    }
    setUploading(false)

    if (!uploaded.length) {
      console.warn('[ChatPanel] upload completed: 0/' + files.length + ' files succeeded — no message posted')
      return
    }
    console.info('[ChatPanel] upload phase complete:', uploaded.length + '/' + files.length, 'files succeeded')

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

    const missionSlugForUpload = selectedProject?.missionSlug || null

    let attachText, metadata
    if (attachmentMetas.length === 1) {
      const att = attachmentMetas[0]
      attachText = `Attached file: ${att.name}\n${att.url}`
      metadata = {
        attachment: att,
        ...(missionSlugForUpload ? { mission_slug: missionSlugForUpload } : {}),
      }
    } else {
      const names = attachmentMetas.map(a => a.name).join(', ')
      const urls = attachmentMetas.map(a => a.url).join('\n')
      attachText = `Attached ${attachmentMetas.length} files: ${names}\n${urls}`
      metadata = {
        attachments: attachmentMetas,
        ...(missionSlugForUpload ? { mission_slug: missionSlugForUpload } : {}),
      }
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

    console.info('[ChatPanel] posting attachment message to supabase-messages', {
      agentKey, clientId, attachmentCount: attachmentMetas.length,
      missionSlugInMetadata: metadata.mission_slug || null,
    })
    authFetch('/api/dashboard/supabase-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: agentKey,
        text: attachText,
        role: 'user',
        source: 'corner-dashboard',
        client_id: clientId,
        metadata,
        ...userIdentity,
      }),
    })
      .then(async r => {
        if (!r.ok) {
          const body = await r.text().catch(() => '<no body>')
          console.error('[ChatPanel] supabase-messages POST failed', r.status, body)
          showToast(`File uploaded but message failed to save (HTTP ${r.status}). Refresh to see it.`, 'error', 7000)
          throw new Error(`supabase-messages ${r.status}`)
        }
        return r.json()
      })
      .then(data => {
        if (data?.message?.id) {
          console.info('[ChatPanel] message persisted ok', { id: data.message.id })
          setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
        } else {
          console.warn('[ChatPanel] supabase-messages returned 200 but no message.id', data)
        }
      })
      .catch(err => { console.error('[ChatPanel] supabase-messages POST exception', err) })

    if (selectedProject && sendProjectTextRef?.current) {
      const names = uploaded.map(r => r.file.name).join(', ')
      const autoMsg = uploaded.length === 1
        ? `I just uploaded ${names}. Can you confirm you got it?`
        : `I just uploaded ${uploaded.length} files: ${names}. Can you confirm you got them?`
      setTimeout(() => sendProjectTextRef.current?.(autoMsg), 500)
    }

    } catch (err) {
      // R79-f18b: any unhandled exception from the upload/build/post path
      // now surfaces as a toast + log instead of vanishing into React's
      // error boundary. Also unsticks the upload spinner.
      console.error('[ChatPanel] handleFileSelection unhandled exception', err)
      setUploading(false)
      showToast(`Upload failed: ${err?.message || 'unknown error'}. Check console for details.`, 'error', 8000)
    }
  }, [selectedAgent, selectedProject, worldId, userIdentity, setMessages, sendProjectTextRef, surfaceUploadError, showToast])

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
