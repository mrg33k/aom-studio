// FilesTab.jsx -- Files tab for UnifiedPanel sidebar
// Upload images, view thumbnails, send to chat, full-size modal
// Paste zone for large text (transcripts, notes) -- iPad-friendly
// Storage: Supabase Storage (bucket: 'corner-files') + Supabase 'text_files' table

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, X, Maximize2, Send, Trash2, FolderOpen, FileText, Image, Save, ArrowLeft } from 'lucide-react'
import { supabase } from './lib/supabase.js'

const BUCKET = 'corner-files'
const TEXT_TABLE = 'text_files'

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/-$/, '')
}

function generateFilename(content) {
  const firstLine = (content || '').split('\n')[0].trim()
  const slug = slugify(firstLine) || 'untitled'
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  return `${slug}-${date}.txt`
}

// ---- FilesTab Component ----

export default function FilesTab({ agentSlug, clientId, isNightMode, onSendFileToChat }) {
  const [subTab, setSubTab] = useState('text') // 'images' | 'text'
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxFile, setLightboxFile] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  // Text paste state
  const [textFiles, setTextFiles] = useState([])
  const [textFilesLoading, setTextFilesLoading] = useState(true)
  const [pasteContent, setPasteContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewingFile, setViewingFile] = useState(null) // text file being viewed
  const [textError, setTextError] = useState(null)
  const textareaRef = useRef(null)

  const isDaytime = isNightMode === false

  // Load image files on mount or agent switch
  const loadFiles = useCallback(async () => {
    setFilesLoading(true)
    if (!supabase) {
      // No Supabase configured (missing env vars) -- show empty state
      setFiles([])
      setFilesLoading(false)
      return
    }
    try {
      const prefix = `${agentSlug}/${clientId || 'default'}/`
      const { data, error: listErr } = await supabase.storage.from(BUCKET).list(prefix, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (listErr) throw listErr
      const mapped = (data || [])
        .filter(item => item.name && item.name !== '')
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
    } catch (err) {
      console.warn('[FilesTab] Supabase storage unavailable:', err.message)
      setFiles([])
    } finally {
      setFilesLoading(false)
    }
  }, [agentSlug, clientId])

  // Load text files on mount or agent switch
  const loadTextFiles = useCallback(async () => {
    setTextFilesLoading(true)
    if (!supabase) {
      // No Supabase configured (missing env vars) -- show empty state
      setTextFiles([])
      setTextFilesLoading(false)
      return
    }
    try {
      const { data, error: fetchErr } = await supabase
        .from(TEXT_TABLE)
        .select('*')
        .eq('client_id', clientId || 'default')
        .order('created_at', { ascending: false })
        .limit(100)
      if (fetchErr) throw fetchErr
      setTextFiles((data || []).map(row => ({
        id: row.id,
        filename: row.filename,
        content: row.content,
        type: row.type || 'text',
        created_at: row.created_at,
        source: 'supabase',
        agent: agentSlug,
        clientId: clientId || 'default',
      })))
    } catch (err) {
      console.warn('[FilesTab] Supabase text_files unavailable:', err.message)
      setTextFiles([])
    } finally {
      setTextFilesLoading(false)
    }
  }, [agentSlug, clientId])

  useEffect(() => {
    loadFiles()
    loadTextFiles()
  }, [loadFiles, loadTextFiles])

  // ---- Image upload handlers (unchanged) ----

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
          console.warn('[FilesTab] Supabase upload failed:', err.message)
          setError(`Failed to upload ${file.name}: ${err.message}`)
        }
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
  }, [agentSlug, clientId, lightboxFile])

  // ---- Text paste handlers ----

  const handleSaveText = useCallback(async () => {
    const trimmed = pasteContent.trim()
    if (!trimmed) return
    setTextError(null)
    setSaving(true)

    const filename = generateFilename(trimmed)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()

    if (supabase) {
      try {
        const { error: insertErr } = await supabase.from(TEXT_TABLE).insert({
          client_id: clientId || 'default',
          filename,
          content: trimmed,
          type: 'text',
          created_at: now,
        })
        if (insertErr) throw insertErr
        setPasteContent('')
        await loadTextFiles()
        setSaving(false)
        return
      } catch (err) {
        console.warn('[FilesTab] Supabase text save failed:', err.message)
        setTextError(`Failed to save: ${err.message}`)
      }
    }
    setSaving(false)
  }, [pasteContent, agentSlug, clientId, loadTextFiles])

  const handleDeleteTextFile = useCallback(async (file) => {
    if (file.source === 'supabase' && supabase) {
      try {
        const { error: delErr } = await supabase.from(TEXT_TABLE).delete().eq('id', file.id)
        if (delErr) throw delErr
        setTextFiles(prev => prev.filter(f => f.id !== file.id))
        if (viewingFile?.id === file.id) setViewingFile(null)
        return
      } catch (err) {
        console.warn('[FilesTab] Supabase text delete failed:', err.message)
      }
    }
  }, [viewingFile])

  // Drag and drop (images only)
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
  const accentBg = isDaytime ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'
  const accentBorder = isDaytime ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'
  const accentColor = isDaytime ? '#60A5FA' : '#4D90D0'

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: panelBg,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Sub-tab toggle: Text / Images */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        {[
          { id: 'text', label: 'Text', icon: FileText },
          { id: 'images', label: 'Images', icon: Image },
        ].map(tab => {
          const active = subTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setSubTab(tab.id); setViewingFile(null) }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 0',
                background: active ? accentBg : 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
                color: active ? accentColor : mutedText,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 150ms',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Error messages */}
      {(error || textError) && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#F87171',
          fontSize: 12,
          flexShrink: 0,
        }}>
          {error || textError}
          <button onClick={() => { setError(null); setTextError(null) }} style={{ marginLeft: 8, color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>dismiss</button>
        </div>
      )}

      {/* ============ TEXT SUB-TAB ============ */}
      {subTab === 'text' && !viewingFile && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Paste zone */}
          <div style={{ padding: '12px 14px', flexShrink: 0 }}>
            <textarea
              ref={textareaRef}
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              placeholder="Paste text here (transcripts, notes, etc.)"
              style={{
                width: '100%',
                minHeight: 300,
                maxHeight: 500,
                padding: 12,
                background: isDaytime ? '#0B1423' : '#060B14',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                color: isDaytime ? '#D1D9E6' : '#A0B0C8',
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "'Inter', system-ui, sans-serif",
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                // iPad-friendly: larger touch target, good padding
                WebkitAppearance: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
              onFocus={e => {
                e.target.style.borderColor = accentColor
              }}
              onBlur={e => {
                e.target.style.borderColor = borderColor
              }}
            />
            {/* Character count + Save button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
              gap: 8,
            }}>
              <span style={{ fontSize: 11, color: mutedText }}>
                {pasteContent.length > 0
                  ? `${pasteContent.length.toLocaleString()} chars / ${pasteContent.split('\n').length} lines`
                  : ''}
              </span>
              <button
                onClick={handleSaveText}
                disabled={!pasteContent.trim() || saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  background: pasteContent.trim() ? (isDaytime ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)') : accentBg,
                  border: `1px solid ${pasteContent.trim() ? 'rgba(34,197,94,0.4)' : accentBorder}`,
                  borderRadius: 6,
                  color: pasteContent.trim() ? '#4ADE80' : mutedText,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: pasteContent.trim() && !saving ? 'pointer' : 'not-allowed',
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 150ms',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  // iPad: bigger touch target
                  minHeight: 40,
                }}
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Saved text files list */}
          <div style={{
            borderTop: `1px solid ${borderColor}`,
            padding: '8px 14px',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: labelText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Saved Files ({textFiles.length})
            </div>
          </div>

          {textFilesLoading && (
            <div style={{ textAlign: 'center', color: mutedText, fontSize: 13, padding: '24px 14px' }}>
              Loading...
            </div>
          )}
          {!textFilesLoading && textFiles.length === 0 && (
            <div style={{
              textAlign: 'center', color: mutedText, fontSize: 13, padding: '24px 14px',
            }}>
              No saved text files yet.
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
            {textFiles.map(file => (
              <TextFileRow
                key={file.id}
                file={file}
                isDaytime={isDaytime}
                borderColor={borderColor}
                mutedText={mutedText}
                labelText={labelText}
                accentColor={accentColor}
                onView={() => setViewingFile(file)}
                onDelete={() => handleDeleteTextFile(file)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============ TEXT FILE VIEWER ============ */}
      {subTab === 'text' && viewingFile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Viewer header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderBottom: `1px solid ${borderColor}`,
            flexShrink: 0,
          }}>
            <button
              onClick={() => setViewingFile(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: accentBg, border: `1px solid ${accentBorder}`,
                borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                color: accentColor, flexShrink: 0,
              }}
            >
              <ArrowLeft size={14} />
            </button>
            <span style={{
              color: '#E8ECF0', fontSize: 12, fontWeight: 600,
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {viewingFile.filename}
            </span>
            <span style={{ color: mutedText, fontSize: 11, flexShrink: 0 }}>
              {formatDate(viewingFile.created_at)}
            </span>
            <button
              onClick={() => handleDeleteTextFile(viewingFile)}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, color: '#F87171',
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
          {/* Read-only content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
            <textarea
              readOnly
              value={viewingFile.content}
              style={{
                width: '100%',
                height: '100%',
                minHeight: 300,
                padding: 12,
                background: isDaytime ? '#0B1423' : '#060B14',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                color: isDaytime ? '#D1D9E6' : '#A0B0C8',
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "'Inter', system-ui, sans-serif",
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            />
          </div>
          {/* Footer with stats */}
          <div style={{
            padding: '8px 14px',
            borderTop: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: mutedText }}>
              {viewingFile.content.length.toLocaleString()} chars
            </span>
            <span style={{ fontSize: 11, color: mutedText }}>
              {viewingFile.content.split('\n').length} lines
            </span>
          </div>
        </div>
      )}

      {/* ============ IMAGES SUB-TAB ============ */}
      {subTab === 'images' && (
        <>
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
                background: accentBg,
                border: `1px solid ${accentBorder}`,
                borderRadius: 6,
                color: accentColor,
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

            {/* Loading / Empty state */}
            {filesLoading && (
              <div style={{ textAlign: 'center', color: mutedText, fontSize: 13, padding: '24px 0' }}>
                Loading...
              </div>
            )}
            {!filesLoading && files.length === 0 && !uploading && (
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
        </>
      )}

      {/* Lightbox modal (images) */}
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

// ---- Text File Row ----

function TextFileRow({ file, isDaytime, borderColor, mutedText, labelText, accentColor, onView, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const preview = (file.content || '').slice(0, 100).replace(/\n/g, ' ')

  return (
    <div
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 12px',
        marginBottom: 6,
        background: hovered ? (isDaytime ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)') : 'transparent',
        border: `1px solid ${hovered ? 'rgba(59,130,246,0.25)' : borderColor}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <FileText size={13} style={{ color: accentColor, flexShrink: 0 }} />
        <span style={{
          fontSize: 13, fontWeight: 600, color: '#E8ECF0',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.filename}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#F87171', opacity: hovered ? 0.8 : 0, transition: 'opacity 150ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, flexShrink: 0, padding: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>
      {/* Preview */}
      <div style={{
        fontSize: 12, color: mutedText, lineHeight: 1.4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        paddingLeft: 21,
      }}>
        {preview}{file.content.length > 100 ? '...' : ''}
      </div>
      {/* Date */}
      <div style={{ fontSize: 11, color: isDaytime ? '#4A6080' : '#3A5070', marginTop: 4, paddingLeft: 21 }}>
        {formatDate(file.created_at)}
      </div>
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
