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
    const files = Array.from(e.target.files || [])
    if (!files.length || !worldId) return
    const agentKey = selectedAgent ? selectedAgent.slug : (selectedProject ? `project:${selectedProject.slug}` : null)
    if (!agentKey) return
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    e.target.value = ''
    setUploading(true)

    // Upload all files, collecting results (failed files show toasts; successes bundle into one message)
    const uploaded = []
    for (const file of files) {
      try {
        const result = await uploadOneFile(file, clientId)
        uploaded.push({ file, result })
      } catch (err) {
        console.error('[ChatPanel] file attach error:', err)
        surfaceUploadError(err, file.name)
      }
    }
    setUploading(false)

    if (!uploaded.length) return

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

    let attachText, metadata
    if (attachmentMetas.length === 1) {
      const att = attachmentMetas[0]
      attachText = `Attached file: ${att.name}\n${att.url}`
      metadata = { attachment: att }
    } else {
      const names = attachmentMetas.map(a => a.name).join(', ')
      const urls = attachmentMetas.map(a => a.url).join('\n')
      attachText = `Attached ${attachmentMetas.length} files: ${names}\n${urls}`
      metadata = { attachments: attachmentMetas }
    }

    const firstAtt = attachmentMetas[0]
    const missionSlugForUpload = selectedProject?.missionSlug || null

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
        metadata,
        ...userIdentity,
        ...(missionSlugForUpload ? { mission_slug: missionSlugForUpload } : {}),
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.message?.id) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
        }
      })
      .catch(() => {})

    if (selectedProject && sendProjectTextRef?.current) {
      const names = uploaded.map(r => r.file.name).join(', ')
      const autoMsg = uploaded.length === 1
        ? `I just uploaded ${names}. Can you confirm you got it?`
        : `I just uploaded ${uploaded.length} files: ${names}. Can you confirm you got them?`
      setTimeout(() => sendProjectTextRef.current?.(autoMsg), 500)
    }
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
