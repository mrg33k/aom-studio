// FilesTab.jsx -- Files tab for UnifiedPanel sidebar
// Upload images, view thumbnails, send to chat, full-size modal
// Paste zone for large text (transcripts, notes) -- iPad-friendly
// Storage: Supabase Storage (bucket: 'corner-files') + Supabase 'text_files' table
//
// All Supabase operations go through /api/dashboard/files (service role key server-side).
// Upload flow: get signed URL from server, PUT file directly to Supabase (no Vercel body limit).

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Camera, X, Maximize2, Send, Trash2, FolderOpen, FileText, Image, Save, ArrowLeft, Code, BookOpen, RefreshCw, ExternalLink } from 'lucide-react'
import { marked } from 'marked'
import briefsIndex from '../data/briefs-index.json'

const FILES_API = '/api/dashboard/files'

// ---- Agent deliverable docs ----

const AGENT_FOLDERS = {
  bobby: 'bobby',
  colton: 'colton',
  steffen: 'steffen',
  jacob: 'jacob',
  elon: 'sys',
  gary: 'gary',
  alex: 'aom-strategy',
  steve: 'steve',
  cleo: 'content-agent',
  tony: 'tony',
  paige: 'paige',
  pixel: 'pixel',
  mom: 'mom',
}

function getAgentDocs(agentSlug) {
  const folder = AGENT_FOLDERS[agentSlug]
  const docs = []
  if (folder) {
    docs.push({ label: 'Latest Work', path: `projects/${folder}/latest-result.md`, group: 'Agent' })
    docs.push({ label: 'Agent Brief', path: `projects/${folder}/AGENT.md`, group: 'Agent' })
    docs.push({ label: 'Last Conversation', path: `projects/${folder}/last-conversation.md`, group: 'Agent', truncate: 8000 })
  }
  docs.push({ label: 'Current Priorities', path: 'context/current-priorities.md', group: 'Context' })
  docs.push({ label: 'Decision Log', path: 'decisions/log.md', group: 'Context' })

  // Agent's briefs from briefs-index.json
  const agentNameMap = {
    bobby: 'Bobby', colton: 'Colton', steffen: 'Steffen', jacob: 'Jacob',
    elon: 'Elon', alex: 'Alex', steve: 'Steve', cleo: 'Cleo',
    tony: 'Tony', paige: 'Paige', pixel: 'Pixel', mom: 'Mom',
    elmo: 'Elmo', gary: 'Gary', mark: 'Mark',
  }
  const agentDisplayName = agentNameMap[agentSlug] || agentSlug

  if (briefsIndex?.categories) {
    const briefDocs = []
    for (const cat of briefsIndex.categories) {
      for (const item of (cat.items || [])) {
        // AOM Team room shows ALL briefs; individual agents show only theirs
        const isMatch = agentSlug === 'aom-team' || agentSlug === 'aom-internal'
          || item.agent?.toLowerCase() === agentSlug
          || item.agent === agentDisplayName
        if (isMatch) {
          briefDocs.push({
            label: item.title,
            group: 'Briefs',
            briefSlug: item.slug,
            briefDate: item.date,
            briefSummary: item.summary,
            briefPath: item.path,
            isBrief: true,
          })
        }
      }
    }
    // Sort by date descending (newest first)
    briefDocs.sort((a, b) => (b.briefDate || '').localeCompare(a.briefDate || ''))
    docs.push(...briefDocs)
  }

  return docs
}

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

// ---- Markdown detection ----

function isMarkdown(file) {
  if (!file) return false
  const name = (file.filename || '').toLowerCase()
  if (name.endsWith('.md') || name.endsWith('.markdown')) return true
  const content = (file.content || '').trim()
  // Heuristic: headings, code fences, bold, or list patterns
  return /^#{1,6}\s/m.test(content) || /^```/m.test(content) || /\*\*[^*]+\*\*/.test(content) || /^\s*[-*+]\s/m.test(content)
}

// ---- FilesTab Component ----

export default function FilesTab({ agentSlug, clientId, isNightMode, onSendFileToChat }) {
  const [subTab, setSubTab] = useState('images') // 'images' | 'text' | 'docs'
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
  const [rawMode, setRawMode] = useState(false) // show raw markdown vs rendered
  const [textError, setTextError] = useState(null)
  const textareaRef = useRef(null)

  // Docs tab state
  const [docsDoc, setDocsDoc] = useState(null) // { label, path, content, lastModified }
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState(null)
  const [docsRawMode, setDocsRawMode] = useState(false)

  const loadDoc = useCallback(async (doc) => {
    setDocsLoading(true)
    setDocsError(null)
    setDocsDoc(null)
    setDocsRawMode(false)
    try {
      // Briefs: load HTML content from the JSON file via dynamic import
      if (doc.isBriefInline && doc.briefSlug) {
        const module = await import(`../data/briefs/${doc.briefSlug}.json`)
        const briefData = module.default || module
        const htmlContent = briefData.content || ''
        setDocsDoc({
          ...doc,
          content: htmlContent,
          isHtml: true,
          label: briefData.title || doc.label,
          briefSummary: briefData.summary || doc.briefSummary,
          briefDate: briefData.date || doc.briefDate,
          briefAgent: briefData.agent || '',
        })
        setDocsLoading(false)
        return
      }
      const res = await fetch(`/api/local/file?path=${encodeURIComponent(doc.path)}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      let content = data.content || ''
      // Truncate very long files (last-conversation.md can be huge)
      if (doc.truncate && content.length > doc.truncate) {
        content = content.slice(-doc.truncate)
        content = `> *[Truncated to last ${(doc.truncate / 1000).toFixed(0)}k characters]*\n\n` + content
      }
      setDocsDoc({ ...doc, content, lastModified: data.lastModified })
    } catch (err) {
      setDocsError(err.message)
    } finally {
      setDocsLoading(false)
    }
  }, [])

  const isDaytime = isNightMode === false

  // Load image files on mount or agent switch
  const loadFiles = useCallback(async () => {
    setFilesLoading(true)
    try {
      const prefix = `${agentSlug}/${clientId || 'default'}/`
      const res = await fetch(`${FILES_API}?type=images&prefix=${encodeURIComponent(prefix)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFiles((data.files || []).map(item => ({
        ...item,
        source: 'supabase',
        agent: agentSlug,
        clientId: clientId || 'default',
      })))
    } catch (err) {
      console.warn('[FilesTab] Failed to load files:', err.message)
      setFiles([])
    } finally {
      setFilesLoading(false)
    }
  }, [agentSlug, clientId])

  // Load text files on mount or agent switch
  const loadTextFiles = useCallback(async () => {
    setTextFilesLoading(true)
    try {
      const res = await fetch(`${FILES_API}?type=text&client=${encodeURIComponent(clientId || 'aom')}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTextFiles((data.files || []).map(row => ({
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
      console.warn('[FilesTab] Failed to load text files:', err.message)
      setTextFiles([])
    } finally {
      setTextFilesLoading(false)
    }
  }, [agentSlug, clientId])

  useEffect(() => {
    loadFiles()
    loadTextFiles()
  }, [loadFiles, loadTextFiles])

  // ---- Image upload handlers ----

  const handleUpload = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setError(null)
    setUploading(true)
    const accepted = [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/mov', 'video/hevc',
      'video/x-m4v', 'video/webm', 'video/ogg',
    ]
    // Also accept any image/* or video/* type not in the explicit list (iOS HEIC, etc.)
    const validFiles = Array.from(fileList).filter(f =>
      accepted.includes(f.type) || f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    if (validFiles.length === 0) {
      setError('Only images and videos are supported.')
      setUploading(false)
      return
    }

    for (const file of validFiles) {
      try {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const ext = file.name.split('.').pop()
        const fileName = `${id}.${ext}`
        const storagePath = `${agentSlug}/${clientId || 'default'}/${fileName}`

        // Step 1: get a signed upload URL from the server (uses service role key)
        const signRes = await fetch(FILES_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sign-upload', path: storagePath, contentType: file.type }),
        })
        if (!signRes.ok) {
          const errData = await signRes.json().catch(() => ({}))
          throw new Error(errData.error || `Sign-upload failed (${signRes.status})`)
        }
        const { uploadUrl } = await signRes.json()

        // Step 2: PUT the file directly to Supabase Storage using the signed URL
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!putRes.ok) {
          const errText = await putRes.text()
          throw new Error(`Upload failed (${putRes.status}): ${errText}`)
        }

        // Refresh file list after successful upload
        await loadFiles()
      } catch (err) {
        console.warn('[FilesTab] Upload failed:', err.message)
        setError(`Failed to upload ${file.name}: ${err.message}`)
      }
    }
    setUploading(false)
  }, [agentSlug, clientId, loadFiles])

  const handleDelete = useCallback(async (file) => {
    try {
      const storagePath = `${agentSlug}/${clientId || 'default'}/${file.name}`
      const res = await fetch(`${FILES_API}?type=image&path=${encodeURIComponent(storagePath)}`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Delete failed (${res.status})`)
      }
      setFiles(prev => prev.filter(f => f.id !== file.id))
      if (lightboxFile?.id === file.id) setLightboxFile(null)
    } catch (err) {
      console.warn('[FilesTab] Delete failed:', err.message)
    }
  }, [agentSlug, clientId, lightboxFile])

  // ---- Text paste handlers ----

  const handleSaveText = useCallback(async () => {
    const trimmed = pasteContent.trim()
    if (!trimmed) return
    setTextError(null)
    setSaving(true)

    try {
      const filename = generateFilename(trimmed)
      const res = await fetch(FILES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-text',
          client_id: clientId || 'aom',
          filename,
          content: trimmed,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Save failed (${res.status})`)
      }
      setPasteContent('')
      await loadTextFiles()
    } catch (err) {
      console.warn('[FilesTab] Text save failed:', err.message)
      setTextError(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [pasteContent, clientId, loadTextFiles])

  const handleDeleteTextFile = useCallback(async (file) => {
    try {
      const res = await fetch(`${FILES_API}?type=text&id=${encodeURIComponent(file.id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Delete failed (${res.status})`)
      }
      setTextFiles(prev => prev.filter(f => f.id !== file.id))
      if (viewingFile?.id === file.id) setViewingFile(null)
    } catch (err) {
      console.warn('[FilesTab] Text delete failed:', err.message)
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
          { id: 'images', label: 'Images', icon: Image },
          { id: 'text', label: 'Text', icon: FileText },
          { id: 'docs', label: 'Docs', icon: BookOpen },
        ].map(tab => {
          const active = subTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setSubTab(tab.id); setViewingFile(null); setDocsDoc(null) }}
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
                onView={() => { setViewingFile(file); setRawMode(false) }}
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
            {/* Raw/Rendered toggle (only for markdown files) */}
            {isMarkdown(viewingFile) && (
              <button
                onClick={() => setRawMode(r => !r)}
                title={rawMode ? 'Show rendered' : 'Show raw'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '0 8px',
                  height: 28,
                  background: rawMode ? accentBg : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${rawMode ? accentBorder : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 6, color: rawMode ? accentColor : mutedText,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  transition: 'all 150ms',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                <Code size={11} />
                {rawMode ? 'Rendered' : 'Raw'}
              </button>
            )}
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

          {/* Content: rendered markdown or raw */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {isMarkdown(viewingFile) && !rawMode ? (
              <MarkdownDocViewer content={viewingFile.content} isDaytime={isDaytime} />
            ) : (
              <div style={{ padding: 14, height: '100%', boxSizing: 'border-box' }}>
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
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    WebkitAppearance: 'none',
                    WebkitOverflowScrolling: 'touch',
                  }}
                />
              </div>
            )}
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
            {isMarkdown(viewingFile) && !rawMode && (
              <span style={{ fontSize: 11, color: accentColor, fontWeight: 600 }}>
                MD
              </span>
            )}
            <span style={{ fontSize: 11, color: mutedText }}>
              {viewingFile.content.length.toLocaleString()} chars
            </span>
            <span style={{ fontSize: 11, color: mutedText }}>
              {viewingFile.content.split('\n').length} lines
            </span>
          </div>
        </div>
      )}

      {/* ============ DOCS SUB-TAB ============ */}
      {subTab === 'docs' && !docsDoc && (
        <DocsDocList
          agentSlug={agentSlug}
          isDaytime={isDaytime}
          borderColor={borderColor}
          mutedText={mutedText}
          labelText={labelText}
          accentColor={accentColor}
          accentBg={accentBg}
          accentBorder={accentBorder}
          loading={docsLoading}
          error={docsError}
          onSelectDoc={loadDoc}
        />
      )}

      {subTab === 'docs' && docsDoc && (
        <DocsDocViewer
          doc={docsDoc}
          isDaytime={isDaytime}
          borderColor={borderColor}
          mutedText={mutedText}
          accentColor={accentColor}
          accentBg={accentBg}
          accentBorder={accentBorder}
          rawMode={docsRawMode}
          onToggleRaw={() => setDocsRawMode(r => !r)}
          onBack={() => { setDocsDoc(null); setDocsError(null) }}
          onReload={() => loadDoc(docsDoc)}
          onSendToChat={onSendFileToChat ? () => onSendFileToChat({ type: 'text', filename: docsDoc.label, content: docsDoc.content }) : null}
        />
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
              accept="image/*,video/*"
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
                {dragOver ? 'Drop to upload' : 'Tap to upload from camera roll'}
              </div>
              <div style={{ color: mutedText, fontSize: 11, marginTop: 2 }}>Images and videos</div>
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
                No files yet. Upload images or videos from your camera roll.
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

// ---- Helpers ----

const VIDEO_EXTS = ['mp4', 'mov', 'hevc', 'heic', 'm4v', 'webm', 'ogv', 'avi', 'mkv', '3gp']
function isVideoFile(file) {
  const name = (file.name || file.filename || '').toLowerCase()
  const ext = name.split('.').pop()
  return VIDEO_EXTS.includes(ext)
}

// ---- Thumbnail Card ----

function FileThumbnail({ file, isDaytime, onView, onDelete, onSendToChat }) {
  const [hovered, setHovered] = useState(false)
  const borderColor = isDaytime ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.12)'
  const isVideo = isVideoFile(file)

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
      {isVideo ? (
        /* Video thumbnail: muted poster frame */
        <video
          src={file.url}
          muted
          playsInline
          preload="metadata"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
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
      )}
      {/* Video badge */}
      {isVideo && (
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          padding: '1px 5px',
          fontSize: 9, fontWeight: 700, color: '#93C5FD',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          VIDEO
        </div>
      )}
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

// ---- Docs: list component ----

function DocsDocList({ agentSlug, isDaytime, borderColor, mutedText, labelText, accentColor, accentBg, accentBorder, loading, error, onSelectDoc }) {
  const docs = getAgentDocs(agentSlug)
  const groups = [...new Set(docs.map(d => d.group))]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#F87171', fontSize: 12, marginBottom: 10 }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ textAlign: 'center', color: mutedText, fontSize: 13, padding: '32px 0' }}>
          Loading...
        </div>
      )}
      {groups.map(group => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: labelText, textTransform: 'uppercase',
            letterSpacing: 0.8, marginBottom: 6, paddingLeft: 2,
          }}>
            {group}
          </div>
          {docs.filter(d => d.group === group).map(doc => (
            <DocsDocRow
              key={doc.isBrief ? `brief-${doc.briefSlug}` : doc.path}
              doc={doc}
              isDaytime={isDaytime}
              borderColor={borderColor}
              mutedText={mutedText}
              accentColor={accentColor}
              accentBg={accentBg}
              accentBorder={accentBorder}
              onClick={doc.isBrief ? () => onSelectDoc({ ...doc, content: null, isBriefInline: true }) : () => onSelectDoc(doc)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function DocsDocRow({ doc, isDaytime, borderColor, mutedText, accentColor, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        marginBottom: 4,
        background: hovered ? (isDaytime ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)') : 'transparent',
        border: `1px solid ${hovered ? 'rgba(59,130,246,0.25)' : borderColor}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {doc.isBrief
        ? <ExternalLink size={13} style={{ color: accentColor, flexShrink: 0 }} />
        : <BookOpen size={13} style={{ color: accentColor, flexShrink: 0 }} />
      }
      <span style={{ fontSize: 13, fontWeight: 600, color: '#E8ECF0', flex: 1 }}>
        {doc.label}
      </span>
      {doc.isBrief ? (
        <span style={{ fontSize: 11, color: mutedText, fontFamily: "'JetBrains Mono', monospace" }}>
          {doc.briefDate || ''}
        </span>
      ) : (
        <span style={{ fontSize: 11, color: mutedText, fontFamily: "'JetBrains Mono', monospace" }}>
          {doc.path.split('/').pop()}
        </span>
      )}
    </div>
  )
}

// ---- Docs: viewer component ----

function DocsDocViewer({ doc, isDaytime, borderColor, mutedText, accentColor, accentBg, accentBorder, rawMode, onToggleRaw, onBack, onReload, onSendToChat }) {
  const wordCount = useMemo(() => (doc.content || '').trim().split(/\s+/).filter(Boolean).length, [doc.content])

  return (
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
          onClick={onBack}
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
          {doc.label}
        </span>
        {doc.lastModified && (
          <span style={{ color: mutedText, fontSize: 11, flexShrink: 0 }}>
            {new Date(doc.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={onReload}
          title="Reload"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: mutedText,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <RefreshCw size={12} />
        </button>
        <button
          onClick={onToggleRaw}
          title={rawMode ? 'Show rendered' : 'Show raw'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 8px',
            height: 28,
            background: rawMode ? accentBg : 'rgba(255,255,255,0.05)',
            border: `1px solid ${rawMode ? accentBorder : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 6, color: rawMode ? accentColor : mutedText,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            transition: 'all 150ms',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <Code size={11} />
          {rawMode ? 'Rendered' : 'Raw'}
        </button>
        {onSendToChat && (
          <button
            onClick={onSendToChat}
            title="Send to chat"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0 8px',
              height: 28,
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 6, color: accentColor,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <Send size={11} />
            Chat
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {rawMode ? (
          <div style={{ padding: 14, height: '100%', boxSizing: 'border-box' }}>
            <textarea
              readOnly
              value={doc.content}
              style={{
                width: '100%',
                height: '100%',
                minHeight: 300,
                padding: 12,
                background: isDaytime ? '#0B1423' : '#060B14',
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                color: isDaytime ? '#D1D9E6' : '#A0B0C8',
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            />
          </div>
        ) : doc.isHtml ? (
          <>
            <style>{MD_READER_STYLES}</style>
            {doc.briefAgent && doc.briefDate && (
              <div style={{ padding: '12px 18px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60A5FA', fontWeight: 600 }}>{doc.briefAgent}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}>{doc.briefDate}</span>
              </div>
            )}
            <div
              className={`md-reader${isDaytime ? '' : ' md-reader-night'}`}
              style={{ padding: '16px 18px' }}
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          </>
        ) : (
          <MarkdownDocViewer content={doc.content} isDaytime={isDaytime} />
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 14px',
        borderTop: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          MD
        </span>
        <span style={{ fontSize: 11, color: mutedText }}>
          {wordCount.toLocaleString()} words
        </span>
        <span style={{ fontSize: 11, color: mutedText }}>
          {(doc.content || '').length.toLocaleString()} chars
        </span>
        <span style={{
          fontSize: 11, color: mutedText, flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {doc.path}
        </span>
      </div>
    </div>
  )
}

// ---- Markdown Doc Viewer ----

const MD_READER_STYLES = `
  .md-reader {
    color: #C0D0E8;
    font-size: 14px;
    line-height: 1.75;
    font-family: 'Inter', system-ui, sans-serif;
    word-break: break-word;
  }
  .md-reader h1, .md-reader h2, .md-reader h3,
  .md-reader h4, .md-reader h5, .md-reader h6 {
    color: #E8F0FC;
    font-weight: 700;
    line-height: 1.3;
    margin: 1.4em 0 0.5em;
  }
  .md-reader h1 {
    font-size: 20px;
    border-bottom: 1px solid rgba(59,130,246,0.2);
    padding-bottom: 0.35em;
    margin-top: 0.5em;
  }
  .md-reader h2 { font-size: 17px; }
  .md-reader h3 { font-size: 15px; color: #A8C0DC; }
  .md-reader h4, .md-reader h5, .md-reader h6 { font-size: 13px; color: #7890A8; }
  .md-reader p { margin: 0.65em 0; }
  .md-reader p:first-child { margin-top: 0; }
  .md-reader strong { color: #F0F6FF; font-weight: 700; }
  .md-reader em { font-style: italic; }
  .md-reader a { color: #60A5FA; text-decoration: none; }
  .md-reader a:hover { text-decoration: underline; }
  .md-reader code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 4px;
    padding: 1px 5px;
    color: #7DD3FC;
    white-space: pre-wrap;
  }
  .md-reader pre {
    background: #080F1E;
    border: 1px solid rgba(59,130,246,0.15);
    border-radius: 8px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 1em 0;
  }
  .md-reader pre code {
    background: none;
    border: none;
    padding: 0;
    color: #90B4CC;
    font-size: 12px;
    line-height: 1.65;
  }
  .md-reader ul, .md-reader ol {
    padding-left: 22px;
    margin: 0.65em 0;
  }
  .md-reader li { margin: 0.25em 0; }
  .md-reader li::marker { color: #60A5FA; }
  .md-reader ul li::marker { content: "• "; }
  .md-reader blockquote {
    border-left: 3px solid rgba(59,130,246,0.5);
    margin: 1em 0;
    padding: 0.2em 0 0.2em 14px;
    color: #6888A0;
    background: rgba(59,130,246,0.04);
    border-radius: 0 6px 6px 0;
  }
  .md-reader blockquote p { margin: 0.25em 0; }
  .md-reader hr {
    border: none;
    border-top: 1px solid rgba(59,130,246,0.2);
    margin: 1.5em 0;
  }
  .md-reader table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 13px;
  }
  .md-reader th {
    background: rgba(59,130,246,0.1);
    color: #A8C0DC;
    font-weight: 700;
    padding: 8px 12px;
    text-align: left;
    border: 1px solid rgba(59,130,246,0.18);
  }
  .md-reader td {
    padding: 6px 12px;
    border: 1px solid rgba(59,130,246,0.1);
    color: #8AA8C0;
  }
  .md-reader tr:nth-child(even) td {
    background: rgba(59,130,246,0.03);
  }
  .md-reader img {
    max-width: 100%;
    border-radius: 6px;
    margin: 0.5em 0;
  }
  .md-reader-night h1, .md-reader-night h2, .md-reader-night h3 {
    color: #C8DCF0;
  }
  .md-reader-night {
    color: #8AA8C4;
  }
`

function MarkdownDocViewer({ content, isDaytime }) {
  const html = useMemo(() => {
    try {
      return marked.parse(content || '', { gfm: true, breaks: false })
    } catch {
      return '<p style="color:#F87171">Failed to render markdown.</p>'
    }
  }, [content])

  return (
    <>
      <style>{MD_READER_STYLES}</style>
      <div
        className={`md-reader${isDaytime ? '' : ' md-reader-night'}`}
        style={{ padding: '16px 18px' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
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
        {/* Image or Video */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isVideoFile(file) ? (
            <video
              src={file.url}
              controls
              playsInline
              style={{
                maxWidth: '80vw',
                maxHeight: 'calc(90vh - 60px)',
                display: 'block',
                borderRadius: 6,
              }}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}
