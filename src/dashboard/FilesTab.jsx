// FilesTab.jsx -- Files tab for UnifiedPanel sidebar
// Upload images, view thumbnails, send to chat, full-size modal
// Storage: Supabase Storage (bucket: 'corner-files') with localStorage fallback

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, X, Maximize2, Send, Trash2, FolderOpen } from 'lucide-react'
import { supabase } from './lib/supabase.js'

const STORAGE_KEY = 'corner-files-local'
const BUCKET = 'corner-files'

// ---- Helpers ----

function getLocalFiles(agentSlug, clientId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw)
    return all.filter(f => f.agent === agentSlug && f.clientId === (clientId || 'default'))
  } catch {
    return []
  }
}

function saveLocalFile(file, agentSlug, clientId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all = raw ? JSON.parse(raw) : []
    all.unshift(file) // newest first
    // Keep max 50 files to avoid localStorage overflow
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)))
  } catch { /* ignore */ }
}

function deleteLocalFile(id, agentSlug, clientId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const all = JSON.parse(raw)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(f => f.id !== id)))
  } catch { /* ignore */ }
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

// ---- FilesTab Component ----

export default function FilesTab({ agentSlug, clientId, isNightMode, onSendFileToChat }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxFile, setLightboxFile] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const isDaytime = isNightMode === false

  // Load files on mount or agent switch
  const loadFiles = useCallback(async () => {
    if (supabase) {
      try {
        const prefix = `${agentSlug}/${clientId || 'default'}/`
        const { data, error: listErr } = await supabase.storage.from(BUCKET).list(prefix, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        })
        if (listErr) throw listErr
        if (data) {
          const mapped = data
            .filter(item => !item.id.endsWith('/'))
            .map(item => ({
              id: item.id,
              name: item.name,
              date: item.created_at,
              url: supabase.storage.from(BUCKET).getPublicUrl(`${prefix}${item.name}`).data.publicUrl,
              source: 'supabase',
              agent: agentSlug,
              clientId: clientId || 'default',
            }))
          setFiles(mapped)
          return
        }
      } catch (err) {
        // Supabase storage not set up or bucket missing -- fall through to localStorage
        console.warn('[FilesTab] Supabase storage unavailable, using localStorage:', err.message)
      }
    }
    // localStorage fallback
    setFiles(getLocalFiles(agentSlug, clientId))
  }, [agentSlug, clientId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleUpload = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setError(null)
    setUploading(true)
    const accepted = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    const validFiles = Array.from(fileList).filter(f => accepted.includes(f.type))
    if (validFiles.length === 0) {
      setError('Only PNG, JPG, GIF, and WebP images are supported.')
      setUploading(false)
      return
    }

    for (const file of validFiles) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const ext = file.name.split('.').pop()
      const fileName = `${id}.${ext}`

      if (supabase) {
        try {
          const path = `${agentSlug}/${clientId || 'default'}/${fileName}`
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
            contentType: file.type,
            upsert: false,
          })
          if (upErr) throw upErr
          // Re-load from Supabase after upload
          await loadFiles()
          continue
        } catch (err) {
          console.warn('[FilesTab] Supabase upload failed, falling back to localStorage:', err.message)
        }
      }

      // localStorage fallback: store as base64
      try {
        const b64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve(e.target.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const entry = {
          id,
          name: file.name,
          date: new Date().toISOString(),
          url: b64,
          source: 'local',
          agent: agentSlug,
          clientId: clientId || 'default',
        }
        saveLocalFile(entry, agentSlug, clientId)
        setFiles(prev => [entry, ...prev])
      } catch (err) {
        setError(`Failed to save ${file.name}: ${err.message}`)
      }
    }
    setUploading(false)
  }, [agentSlug, clientId, loadFiles])

  const handleDelete = useCallback(async (file) => {
    if (file.source === 'supabase' && supabase) {
      try {
        const path = `${agentSlug}/${clientId || 'default'}/${file.name}`
        await supabase.storage.from(BUCKET).remove([path])
        setFiles(prev => prev.filter(f => f.id !== file.id))
        if (lightboxFile?.id === file.id) setLightboxFile(null)
        return
      } catch (err) {
        console.warn('[FilesTab] Supabase delete failed:', err.message)
      }
    }
    deleteLocalFile(file.id, agentSlug, clientId)
    setFiles(prev => prev.filter(f => f.id !== file.id))
    if (lightboxFile?.id === file.id) setLightboxFile(null)
  }, [agentSlug, clientId, lightboxFile])

  // Drag and drop
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }

  // Styles
  const panelBg = isDaytime ? '#0F1B2D' : '#0A0F1A'
  const borderColor = isDaytime ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.12)'
  const mutedText = isDaytime ? '#6B8AB0' : '#4A6080'
  const labelText = isDaytime ? '#8BA4C4' : '#6B8AB0'

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: panelBg,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Upload bar */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${borderColor}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px',
            background: isDaytime ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
            border: `1px solid ${isDaytime ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`,
            borderRadius: 6,
            color: isDaytime ? '#60A5FA' : '#4D90D0',
            fontSize: 13,
            fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
            transition: 'opacity 150ms',
          }}
        >
          <Camera size={14} />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files)}
        />
        {files.length > 0 && (
          <span style={{ fontSize: 12, color: mutedText, marginLeft: 'auto' }}>
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#F87171',
          fontSize: 12,
          flexShrink: 0,
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>dismiss</button>
        </div>
      )}

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Drop zone */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#3B82F6' : borderColor}`,
            borderRadius: 8,
            padding: '16px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(59,130,246,0.06)' : 'transparent',
            transition: 'border-color 150ms, background 150ms',
            flexShrink: 0,
          }}
        >
          <FolderOpen size={20} style={{ color: mutedText, marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
          <div style={{ color: labelText, fontSize: 12 }}>
            {dragOver ? 'Drop to upload' : 'Drop files here'}
          </div>
          <div style={{ color: mutedText, fontSize: 11, marginTop: 2 }}>PNG, JPG, GIF, WebP</div>
        </div>

        {/* Empty state */}
        {files.length === 0 && !uploading && (
          <div style={{
            textAlign: 'center', color: mutedText, fontSize: 13, padding: '24px 0',
          }}>
            No files yet. Upload or drag images above.
          </div>
        )}

        {/* Thumbnail grid */}
        {files.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {files.map(file => (
              <FileThumbnail
                key={file.id}
                file={file}
                isDaytime={isDaytime}
                onView={() => setLightboxFile(file)}
                onDelete={() => handleDelete(file)}
                onSendToChat={onSendFileToChat ? () => onSendFileToChat(file) : null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox modal */}
      {lightboxFile && (
        <FileLightbox
          file={lightboxFile}
          isDaytime={isDaytime}
          onClose={() => setLightboxFile(null)}
          onDelete={() => handleDelete(lightboxFile)}
          onSendToChat={onSendFileToChat ? () => { onSendFileToChat(lightboxFile); setLightboxFile(null) } : null}
        />
      )}
    </div>
  )
}

// ---- Thumbnail Card ----

function FileThumbnail({ file, isDaytime, onView, onDelete, onSendToChat }) {
  const [hovered, setHovered] = useState(false)
  const borderColor = isDaytime ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.12)'

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${hovered ? 'rgba(59,130,246,0.4)' : borderColor}`,
        background: '#0D1929',
        cursor: 'pointer',
        transition: 'border-color 150ms',
        aspectRatio: '1',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onView}
    >
      <img
        src={file.url}
        alt={file.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        loading="lazy"
      />
      {/* Hover overlay */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}>
          <Maximize2 size={16} style={{ color: '#fff' }} />
          {onSendToChat && (
            <button
              onClick={e => { e.stopPropagation(); onSendToChat() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'rgba(59,130,246,0.8)', border: 'none', borderRadius: 4,
                color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 6px', cursor: 'pointer',
              }}
            >
              <Send size={10} />
              Chat
            </button>
          )}
        </div>
      )}
      {/* Delete button (always visible, top-right) */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        style={{
          position: 'absolute', top: 3, right: 3,
          background: 'rgba(0,0,0,0.6)',
          border: 'none', borderRadius: 4,
          width: 18, height: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 150ms',
        }}
      >
        <X size={10} style={{ color: '#F87171' }} />
      </button>
    </div>
  )
}

// ---- Lightbox / Full-size modal ----

function FileLightbox({ file, isDaytime, onClose, onDelete, onSendToChat }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isDaytimeLabel = isDaytime
  const mutedText = isDaytimeLabel ? '#6B8AB0' : '#4A6080'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0F1B2D',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 12,
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(59,130,246,0.15)',
          flexShrink: 0,
        }}>
          <span style={{
            color: '#E8ECF0', fontSize: 13, fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {file.name}
          </span>
          {file.date && (
            <span style={{ color: mutedText, fontSize: 11, flexShrink: 0 }}>
              {formatDate(file.date)}
            </span>
          )}
          {onSendToChat && (
            <button
              onClick={onSendToChat}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 6, color: '#60A5FA',
                fontSize: 12, fontWeight: 600,
                padding: '4px 10px', cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Send size={12} />
              Send to chat
            </button>
          )}
          <button
            onClick={() => onDelete()}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 6, color: '#F87171',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, color: '#94A3B8',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
        {/* Image */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={file.url}
            alt={file.name}
            style={{
              maxWidth: '80vw',
              maxHeight: 'calc(90vh - 60px)',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  )
}
