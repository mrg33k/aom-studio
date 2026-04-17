// useChatAttachments -- composer attachments and file uploads.
// Owns both the "stage files for next send" flow (pendingAttachments +
// stageFiles) and the legacy "upload + immediately post as a message"
// flow (handleFileSelection). Both compress images to 1200px / 0.7 JPEG
// before uploading to /api/dashboard/file-upload.
// Extracted from ChatPanel.jsx (R2b split).
import { useCallback, useEffect, useRef, useState } from 'react'

export default function useChatAttachments({
  selectedAgent,
  selectedProject,
  worldId,
  userIdentity,
  setMessages,
  sendProjectTextRef,
}) {
  // ── Pending attachments (staged, consumed on next send) ───────────────────
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [stagingFiles, setStagingFiles] = useState(false)
  // Ref mirror so send functions can read latest without deps churn.
  const pendingAttachmentsRef = useRef([])
  useEffect(() => { pendingAttachmentsRef.current = pendingAttachments }, [pendingAttachments])

  // ── Immediate-upload UI state ────────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

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

  // Upload files and stage them in pendingAttachments without sending.
  // Sub-views wire this to the composer paperclip / drop zone so the user
  // can attach a file, THEN type a message, THEN send them together.
  const stageFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || !worldId) return
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    setStagingFiles(true)
    try {
      for (const file of files) {
        try {
          let dataBase64, mimeType = file.type
          if (file.type.startsWith('image/')) {
            dataBase64 = await new Promise(resolve => {
              const img = new Image()
              const reader = new FileReader()
              reader.onload = () => {
                img.onload = () => {
                  const maxDim = 1200
                  let w = img.width, h = img.height
                  if (w > maxDim || h > maxDim) {
                    const scale = maxDim / Math.max(w, h)
                    w = Math.round(w * scale)
                    h = Math.round(h * scale)
                  }
                  const canvas = document.createElement('canvas')
                  canvas.width = w
                  canvas.height = h
                  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
                  resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
                }
                img.src = reader.result
              }
              reader.readAsDataURL(file)
            })
            mimeType = 'image/jpeg'
          } else {
            dataBase64 = await new Promise(resolve => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result.split(',')[1])
              reader.readAsDataURL(file)
            })
          }
          const uploadRes = await fetch('/api/dashboard/file-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              world: clientId,
              filename: file.name,
              data_base64: dataBase64,
              mime_type: mimeType,
            }),
          })
          const uploadData = await uploadRes.json()
          if (!uploadRes.ok) {
            console.error('[ChatPanel] stageFiles upload error:', uploadData.error)
            continue
          }
          addPendingAttachment({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            url: uploadData.full_url,
            mimeType,
            size: file.size,
          })
        } catch (err) {
          console.error('[ChatPanel] stageFiles error:', err)
        }
      }
    } finally {
      setStagingFiles(false)
    }
  }, [worldId, selectedProject, addPendingAttachment])

  // Legacy flow: upload and immediately post as its own message.
  const handleFileSelection = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !worldId) return
    const agentKey = selectedAgent ? selectedAgent.slug : (selectedProject ? `project:${selectedProject.slug}` : null)
    if (!agentKey) return
    const clientId = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
    e.target.value = ''
    setUploading(true)
    for (const file of files) {
      try {
        let dataBase64, mimeType = file.type
        if (file.type.startsWith('image/')) {
          dataBase64 = await new Promise(resolve => {
            const img = new Image()
            const reader = new FileReader()
            reader.onload = () => {
              img.onload = () => {
                const maxDim = 1200
                let w = img.width, h = img.height
                if (w > maxDim || h > maxDim) {
                  const scale = maxDim / Math.max(w, h)
                  w = Math.round(w * scale)
                  h = Math.round(h * scale)
                }
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                canvas.getContext('2d').drawImage(img, 0, 0, w, h)
                resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
              }
              img.src = reader.result
            }
            reader.readAsDataURL(file)
          })
          mimeType = 'image/jpeg'
        } else {
          dataBase64 = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.readAsDataURL(file)
          })
        }

        const uploadRes = await fetch('/api/dashboard/file-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            world: clientId,
            filename: file.name,
            data_base64: dataBase64,
            mime_type: mimeType,
          }),
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          console.error('[ChatPanel] upload error:', uploadData.error)
          continue
        }
        const publicUrl = uploadData.full_url

        // Optimistic message
        const tempId = `temp-attach-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempId,
          role: 'user',
          agent: agentKey,
          text: `Attached file: ${file.name}\n${publicUrl}`,
          timestamp: new Date().toISOString(),
          source: 'corner-dashboard',
          attachment_url: publicUrl,
          file_mime_type: mimeType,
          file_size: file.size,
        }])

        // Persist to DB -- include the URL in text since messages table has
        // no attachment_url column. Ensures Gemini sees the file reference in
        // conversation history.
        const attachText = `Attached file: ${file.name}\n${publicUrl}`
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agentKey,
            text: attachText,
            role: 'user',
            source: 'corner-dashboard',
            client_id: clientId,
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
      } catch (err) {
        console.error('[ChatPanel] file attach error:', err)
      }
    }
    setUploading(false)

    // Auto-trigger the operator to acknowledge uploaded files
    if (files.length > 0 && selectedProject && sendProjectTextRef?.current) {
      const names = files.map(f => f.name).join(', ')
      const autoMsg = files.length === 1
        ? `I just uploaded ${names}. Can you confirm you got it?`
        : `I just uploaded ${files.length} files: ${names}. Can you confirm you got them?`
      setTimeout(() => sendProjectTextRef.current?.(autoMsg), 500)
    }
  }, [selectedAgent, selectedProject, worldId, userIdentity, setMessages, sendProjectTextRef])

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
