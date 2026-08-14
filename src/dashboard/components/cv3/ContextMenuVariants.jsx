// ContextMenuVariants.jsx — R2 of corner:right-click-menu
//
// Per-surface menus on top of the existing ContextMenu primitive shipped in
// ContextMenu.jsx. Each variant builds an items array and renders
// <ContextMenu items={...}> on desktop or <ActionSheet items={...}> on mobile.
//
// Five named menus for R3 wiring:
//   MissionContextMenu, FileContextMenu, PillContextMenu,
//   MailThreadContextMenu, NotificationContextMenu
//
// Shared helpers:
//   ActionSheet      — generic mobile bottom drawer (items + optional preview)
//   useLongPress     — 500ms touchstart with <8px movement → onTrigger(x,y)
//   useIsMobile      — matchMedia(`(max-width: 768px)`) reactive bool
//
// Mission home: corner/missions/right-click-menu/

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ContextMenu } from './ContextMenu.jsx'
import { C } from '../../lib/cv3Colors.js'

export function useLongPress(onTrigger, { delayMs = 500, moveThresholdPx = 8 } = {}) {
  const timerRef = useRef(null)
  const startRef = useRef(null)
  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    startRef.current = null
  }, [])
  const handlers = useMemo(() => ({
    onTouchStart: (e) => {
      const t = e.touches?.[0]
      if (!t) return
      startRef.current = { x: t.clientX, y: t.clientY }
      timerRef.current = setTimeout(() => {
        onTrigger?.(startRef.current?.x ?? 0, startRef.current?.y ?? 0, e)
      }, delayMs)
    },
    onTouchMove: (e) => {
      if (!startRef.current || !timerRef.current) return
      const t = e.touches?.[0]
      if (!t) return
      const dx = Math.abs(t.clientX - startRef.current.x)
      const dy = Math.abs(t.clientY - startRef.current.y)
      if (dx > moveThresholdPx || dy > moveThresholdPx) clear()
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
  }), [onTrigger, delayMs, moveThresholdPx, clear])
  useEffect(() => clear, [clear])
  return handlers
}

export function useIsMobile(breakpointPx = 768) {
  const [is, setIs] = useState(() => typeof window !== 'undefined' && window.innerWidth <= breakpointPx)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`)
    const handle = (e) => setIs(!!e.matches)
    setIs(mq.matches)
    mq.addEventListener?.('change', handle)
    return () => mq.removeEventListener?.('change', handle)
  }, [breakpointPx])
  return is
}

export function ActionSheet({ open, items = [], preview, onClose, testId }) {
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])
  if (!open) return null
  const sheet = (
    <>
      <div onClick={onClose} data-test-id={testId ? testId + '-backdrop' : undefined}
        style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.45)' }} />
      <div data-test-id={testId} data-cv4-mobile-sheet
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9991,
          background: 'linear-gradient(180deg, #1a2030, #111827)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px 20px 0 0',
          padding: '12px 0 calc(16px + env(safe-area-inset-bottom, 0px))',
          fontFamily: "'Inter', sans-serif",
          animation: 'slideUpSheet 0.22s ease',
          maxHeight: '70vh', overflowY: 'auto',
        }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '0 auto 14px' }} />
        {preview && (
          <div style={{
            margin: '0 16px 12px', padding: '8px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            fontSize: 12, color: 'rgba(226,232,240,0.55)',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis', lineHeight: 1.5,
          }}>{preview}</div>
        )}
        {items.map((it) => {
          const danger = it.variant === 'danger'
          return (
            <button key={it.key} type="button" disabled={!!it.disabled}
              data-test-id={it.testId}
              onClick={() => {
                if (it.disabled) return
                const r = it.onSelect?.()
                if (r !== 'keep') onClose?.()
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', background: 'transparent', border: 'none',
                color: danger ? C.red : '#E2E8F0',
                cursor: it.disabled ? 'default' : 'pointer',
                opacity: it.disabled ? 0.4 : 1,
                fontSize: 15, fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                textAlign: 'left', transition: 'background 0.1s',
              }}
              onTouchStart={(e) => { if (!it.disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onTouchEnd={(e) => { e.currentTarget.style.background = 'transparent' }}>
              {it.icon && (<span style={{ color: danger ? C.red : C.accent, display: 'flex', alignItems: 'center' }}>{it.icon}</span>)}
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.hasSubmenu && <span style={{ color: 'rgba(226,232,240,0.45)', fontSize: 12 }}>▸</span>}
            </button>
          )
        })}
        <button type="button" onClick={onClose}
          style={{
            width: 'calc(100% - 32px)', margin: '8px 16px 0', padding: '14px',
            borderRadius: 14, background: 'rgba(255,255,255,0.06)',
            border: 'none', color: 'rgba(226,232,240,0.7)',
            cursor: 'pointer', fontSize: 15, fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
          }}>Cancel</button>
      </div>
      <style>{`@keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  )
  return createPortal(sheet, document.body)
}

function MenuOrSheet({ open, mobile, x, y, items, onClose, preview, testId }) {
  if (mobile) return <ActionSheet open={open} items={items} preview={preview} onClose={onClose} testId={testId} />
  return <ContextMenu open={open} x={x} y={y} items={items} onClose={onClose} testId={testId} />
}

function useStage(defaultStage, open) {
  const [stage, setStage] = useState(defaultStage)
  const lastOpenRef = useRef(open)
  useEffect(() => {
    if (lastOpenRef.current && !open) setStage(defaultStage)
    lastOpenRef.current = open
  }, [open, defaultStage])
  return [stage, setStage]
}

const SvgIcon = ({ children }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const I = {
  open: <SvgIcon><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></SvgIcon>,
  copy: <SvgIcon><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></SvgIcon>,
  pin: <SvgIcon><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-2-7h-10z"/><line x1="9" y1="3" x2="15" y2="3"/><line x1="10" y1="3" x2="10" y2="10"/><line x1="14" y1="3" x2="14" y2="10"/></SvgIcon>,
  archive: <SvgIcon><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></SvgIcon>,
  move: <SvgIcon><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></SvgIcon>,
  reply: <SvgIcon><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></SvgIcon>,
  forward: <SvgIcon><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></SvgIcon>,
  read: <SvgIcon><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></SvgIcon>,
  unread: <SvgIcon><circle cx="12" cy="12" r="9"/></SvgIcon>,
  snooze: <SvgIcon><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="5" y1="3" x2="2" y2="6"/><line x1="22" y1="6" x2="19" y2="3"/></SvgIcon>,
  dismiss: <SvgIcon><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></SvgIcon>,
  mute: <SvgIcon><path d="M11 5L6 9H2v6h4l5 4z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></SvgIcon>,
  reveal: <SvgIcon><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="9 12 12 15 16 11"/></SvgIcon>,
  hide: <SvgIcon><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></SvgIcon>,
  doc: <SvgIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></SvgIcon>,
}

export function MissionContextMenu({
  open, x, y, mission, projects = [], folders = [], mobile = false, onClose,
  onAgentPrompt, onRename, onDelete, onCreateSubfolder, onMoveToFolder, onEmbed,
}) {
  const [stage, setStage] = useStage('root', open)
  if (!open || !mission) return null
  // Sub-stage for "Move to subfolder"
  if (stage === 'folders') {
    const items = (folders || []).map(f => ({
      key: f.slug, label: f.name || f.slug, icon: I.move,
      testId: `mission-ctx-movefolder-${f.slug}`,
      onSelect: () => onMoveToFolder?.(mission, f),
    }))
    items.unshift({ key: '__root', label: '(no folder, top level)', icon: I.move,
      testId: 'mission-ctx-movefolder-root',
      onSelect: () => onMoveToFolder?.(mission, null),
    })
    return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? `Move ${mission.name || mission.slug} to subfolder…` : undefined} testId="mission-ctx-folder-picker" />
  }
  const name = mission.name || mission.slug || 'this mission'
  const ref = '`' + (mission.slug || name) + '`'
  const items = [
    { key: 'brief-me', label: 'Brief me', icon: I.open, testId: 'mission-ctx-brief',
      onSelect: () => onAgentPrompt?.(
        'Brief me on the mission ' + ref + ' (project: ' + (mission.projectSlug || mission.project || 'corner') + ').\n\n' +
        'Read its mission home in plain English. Look at CONTEXT.md (current state), BUILD.md (round ledger), the most recent dated file in research/, and last-conversation.md.\n\n' +
        'Tell me: (1) one sentence on what this mission is about, (2) what is in flight right now, (3) what is blocked, (4) what the obvious next move is.\n\n' +
        'Work in this chat with me using /007 and narrate steps as you read.'
      ) },
    { key: 'whats-next', label: "What's next", icon: I.open, testId: 'mission-ctx-whats-next',
      onSelect: () => onAgentPrompt?.(
        'What is next on mission ' + ref + ' (project: ' + (mission.projectSlug || mission.project || 'corner') + ')?\n\n' +
        'Read CONTEXT.md + BUILD.md in its mission home. Look at what shipped last and what is unfinished.\n\n' +
        'Propose the next round: round number, what it ships, what it does NOT touch (out-of-scope), one-line completion criteria. Show your reasoning.\n\n' +
        'Work in this chat /007.'
      ) },
    { key: 'rename', label: 'Rename', icon: I.copy, testId: 'mission-ctx-rename',
      onSelect: () => onRename?.(mission) },
    { key: 'create-subfolder', label: 'Create subfolder…', icon: I.move, testId: 'mission-ctx-create-subfolder',
      onSelect: () => onCreateSubfolder?.(mission) },
    { key: 'move-to-folder', label: 'Move to subfolder…', icon: I.move, hasSubmenu: true, testId: 'mission-ctx-move-folder',
      onSelect: () => { setStage('folders'); return 'keep' } },
    { key: 'embed-this-room', label: 'Embed this room', icon: I.copy, testId: 'mission-ctx-embed',
      onSelect: () => onEmbed?.(mission) },
    { key: 'delete', label: 'Delete', icon: I.archive, variant: 'danger', testId: 'mission-ctx-delete',
      onSelect: () => onDelete?.(mission) },
  ]
  return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? name : undefined} testId="mission-ctx-root" />
}



// ProjectContextMenu — Rename / Create subfolder / Move to subfolder / Delete (direct)
// + Brief me (agent-routed). Used in Drawer left rail + ContextNav top pills.
export function ProjectContextMenu({ open, x, y, project, folders = [], mobile = false, onClose,
  onAgentPrompt, onRename, onDelete, onCreateSubfolder, onMoveToFolder }) {
  const [stage, setStage] = useStage('root', open)
  if (!open || !project) return null

  if (stage === 'folders') {
    const items = (folders || []).map(f => ({
      key: f.slug, label: f.name || f.slug, icon: I.move,
      testId: `project-ctx-movefolder-${f.slug}`,
      onSelect: () => onMoveToFolder?.(project, f),
    }))
    items.unshift({ key: '__root', label: '(no folder, top level)', icon: I.move,
      testId: 'project-ctx-movefolder-root',
      onSelect: () => onMoveToFolder?.(project, null),
    })
    return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? `Move ${project.name || project.slug} to subfolder…` : undefined} testId="project-ctx-folder-picker" />
  }

  const name = project.name || project.slug || 'this project'
  const ref = '`' + (project.slug || name) + '`'
  const items = [
    { key: 'brief-me', label: 'Brief me', icon: I.open, testId: 'project-ctx-brief',
      onSelect: () => onAgentPrompt?.(
        'Brief me on project ' + ref + '.\n\n' +
        'Read the project home (CONTEXT.md, VISION.md, latest research/). List the active missions under it (look in missions/ subfolder). For each, name one sentence on its state.\n\n' +
        'End with: what is the single most important thing happening on this project right now, and what is the obvious next move.\n\n' +
        'Work in this chat /007.'
      ) },
    { key: 'rename', label: 'Rename', icon: I.copy, testId: 'project-ctx-rename',
      onSelect: () => onRename?.(project) },
    { key: 'create-subfolder', label: 'Create subfolder…', icon: I.move, testId: 'project-ctx-create-subfolder',
      onSelect: () => onCreateSubfolder?.(project) },
    { key: 'move-to-folder', label: 'Move to subfolder…', icon: I.move, hasSubmenu: true, testId: 'project-ctx-move-folder',
      onSelect: () => { setStage('folders'); return 'keep' } },
    { key: 'delete', label: 'Delete', icon: I.archive, variant: 'danger', testId: 'project-ctx-delete',
      onSelect: () => onDelete?.(project) },
  ]
  return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? name : undefined} testId="project-ctx-root" />
}

// Right-click menu for a folder inside the right-rail missions panel.
// onCreateSubfolder(folder) — make a subfolder under THIS folder
// onCreateMission(folder)   — make a mission and drop it into this folder
// onRename(folder)          — rename this folder
// onDelete(folder)          — delete this folder (missions inside become ungrouped)
export function FolderContextMenu({ open, x, y, folder, mobile = false, onClose,
  onCreateSubfolder, onCreateMission, onRename, onDelete }) {
  if (!open || !folder) return null
  const name = folder.name || folder.slug || 'this folder'
  const items = [
    { key: 'new-mission', label: 'New mission in folder…', icon: I.open, testId: 'folder-ctx-new-mission',
      onSelect: () => onCreateMission?.(folder) },
    { key: 'new-subfolder', label: 'New subfolder…', icon: I.move, testId: 'folder-ctx-new-subfolder',
      onSelect: () => onCreateSubfolder?.(folder) },
    { key: 'rename', label: 'Rename', icon: I.copy, testId: 'folder-ctx-rename',
      onSelect: () => onRename?.(folder) },
    { key: 'delete', label: 'Delete folder', icon: I.archive, variant: 'danger', testId: 'folder-ctx-delete',
      onSelect: () => onDelete?.(folder) },
  ]
  return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? name : undefined} testId="folder-ctx-root" />
}

// Agent-routed Research / Summarize / Pull quotes + utility Copy path / Reveal.
// onAgentPrompt(text) drops the templated prompt into the active chat via
// useChatDispatch (called by the parent surface).
// onMove(file, folderPath)  — move file to folderPath (or '' for root)
// onDelete(file)            — delete file
// folders                   — array of folder path strings in current tree
export function FileContextMenu({ open, x, y, file, mobile = false, onClose, onAgentPrompt, onCopyPath, onReveal, onMove, onDelete, folders = [] }) {
  const [stage, setStage] = useStage('root', open)
  if (!open || !file) return null

  // Sub-stage: folder picker for "Move to folder"
  if (stage === 'folders') {
    const folderItems = folders.map(f => ({
      key: f, label: f || '/ (root)', icon: I.move,
      testId: `file-ctx-moveto-${f}`,
      onSelect: () => onMove?.(file, f),
    }))
    if (!folderItems.length) folderItems.push({ key: '__none', label: 'No folders yet', disabled: true })
    // Always offer root as a move target
    if (folders.length) {
      folderItems.unshift({ key: '__root', label: '/ (project root)', icon: I.move, testId: 'file-ctx-moveto-root', onSelect: () => onMove?.(file, '') })
    }
    return <MenuOrSheet open mobile={mobile} x={x} y={y} items={folderItems} onClose={onClose} preview={mobile ? `Move ${file.name || 'file'} to…` : undefined} testId="file-ctx-folder-picker" />
  }

  const name = file.displayName || file.name || file.path || 'this file'
  const filePath = file.path || file.full_path || file.relativePath || file.name || ''
  const ref = filePath ? '`' + filePath + '`' : '`' + name + '`'
  const isDisk = !!file.fromDisk

  const items = [
    { key: 'research', label: 'Research', icon: I.copy, testId: 'file-ctx-research',
      onSelect: () => onAgentPrompt?.(
        'Research this file for me: ' + ref + '.\n\n' +
        'Open it with the Read tool. Tell me: (1) what is in it in plain English, (2) what is the most useful or surprising thing in it, (3) what would be worth doing next based on what you read.\n\n' +
        'If it references other files, list them so we can chase them next. Work /007 in this chat.'
      ) },
    { key: 'summarize', label: 'Summarize', icon: I.open, testId: 'file-ctx-summarize',
      onSelect: () => onAgentPrompt?.(
        'Summarize the file ' + ref + ' for me in plain English.\n\n' +
        'Open it with the Read tool. Lead with the one-sentence punchline, then 3-5 bullets of what is in it, then a final line on what (if anything) needs follow-up.\n\n' +
        'Work /007 in this chat.'
      ) },
    { key: 'pull-quotes', label: 'Pull quotes', icon: I.copy, testId: 'file-ctx-pull-quotes',
      onSelect: () => onAgentPrompt?.(
        'Pull the 3-5 most load-bearing or most-cited lines from the file ' + ref + ' and quote them back to me verbatim.\n\n' +
 'Open with the Read tool. Pick lines that capture a decision, a constraint, or a load-bearing fact, not boilerplate. Use markdown blockquote (>) per line. Add a one-sentence why-each-matters under the quote block.\n\n' +
        'Work /007 in this chat.'
      ) },
    { key: 'copy-path', label: 'Copy path', icon: I.copy, testId: 'file-ctx-copy-path',
      onSelect: () => {
        if (filePath) navigator.clipboard?.writeText(filePath).catch(() => {})
        onCopyPath?.(file)
      } },
    { key: 'reveal', label: 'Reveal in mission', icon: I.reveal, testId: 'file-ctx-reveal',
      disabled: !(file.mission || file.mission_slug),
      onSelect: () => onReveal?.(file) },
    // Disk-file operations (move + delete) — only shown for fromDisk files.
    ...(isDisk ? [
      { key: 'move', label: 'Move to folder…', icon: I.move, hasSubmenu: true, testId: 'file-ctx-move',
        onSelect: () => { setStage('folders'); return 'keep' } },
      { key: 'delete', label: 'Delete', icon: I.archive, variant: 'danger', testId: 'file-ctx-delete',
        onSelect: () => onDelete?.(file) },
    ] : []),
  ]
  return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? name : undefined} testId="file-ctx-root" />
}

export function PillContextMenu({ open, x, y, pill, mobile = false, isPinned, isHidden, onClose, onOpenChat, onOpenFiles, onTogglePin, onToggleHide }) {
  if (!open || !pill) return null
  const items = [
    { key: 'open-chat', label: 'Open project chat', icon: I.open, testId: 'pill-ctx-open-chat', onSelect: () => onOpenChat?.(pill) },
    { key: 'open-files', label: 'Open project files', icon: I.doc, testId: 'pill-ctx-open-files', onSelect: () => onOpenFiles?.(pill) },
    { key: 'pin', label: isPinned ? 'Unpin pill' : 'Pin pill', icon: I.pin, testId: 'pill-ctx-pin', onSelect: () => onTogglePin?.(pill) },
    { key: 'hide', label: isHidden ? 'Show pill' : 'Hide pill', icon: I.hide, testId: 'pill-ctx-hide', onSelect: () => onToggleHide?.(pill) },
  ]
  return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? (pill.name || pill.slug) : undefined} testId="pill-ctx-root" />
}

export function MailThreadContextMenu({ open, x, y, thread, projects = [], mobile = false, onClose, onReply, onForward, onToggleRead, onArchive, onSnooze, onMoveTo }) {
  const [stage, setStage] = useStage('root', open)
  if (!open || !thread) return null
  if (stage === 'projects') {
    const items = (projects || []).filter(pr => pr?.slug)
      .sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug))
      .map(pr => ({
        key: pr.slug, label: pr.name || pr.slug,
        testId: `mail-ctx-moveto-${pr.slug}`,
        onSelect: () => onMoveTo?.(thread, pr),
      }))
    if (!items.length) items.push({ key: 'none', label: 'No projects available', disabled: true })
    return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? `Move thread to…` : undefined} testId="mail-ctx-project-picker" />
  }
  const isUnread = !!thread.unread || thread.is_unread === true
  const items = [
    { key: 'reply', label: 'Reply', icon: I.reply, testId: 'mail-ctx-reply', onSelect: () => onReply?.(thread) },
    { key: 'forward', label: 'Forward', icon: I.forward, testId: 'mail-ctx-forward', onSelect: () => onForward?.(thread) },
    { key: 'toggle-read', label: isUnread ? 'Mark as read' : 'Mark as unread', icon: isUnread ? I.read : I.unread, testId: 'mail-ctx-toggle-read', onSelect: () => onToggleRead?.(thread) },
    { key: 'snooze', label: 'Snooze', icon: I.snooze, testId: 'mail-ctx-snooze', onSelect: () => onSnooze?.(thread) },
    { key: 'move', label: 'Move to project…', icon: I.move, hasSubmenu: true, testId: 'mail-ctx-move', onSelect: () => { setStage('projects'); return 'keep' } },
    { key: 'archive', label: 'Archive', icon: I.archive, variant: 'danger', testId: 'mail-ctx-archive', onSelect: () => onArchive?.(thread) },
  ]
  return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? (thread.subject || thread.from || '') : undefined} testId="mail-ctx-root" />
}

export function NotificationContextMenu({ open, x, y, notification, mobile = false, onClose, onOpenSource, onDismiss, onSnooze, onMuteKind }) {
  if (!open || !notification) return null
  const items = [
    { key: 'open', label: 'Open source', icon: I.open, testId: 'notif-ctx-open', onSelect: () => onOpenSource?.(notification) },
    { key: 'snooze', label: 'Snooze', icon: I.snooze, testId: 'notif-ctx-snooze', onSelect: () => onSnooze?.(notification) },
    { key: 'mute', label: `Mute "${notification.kind || 'this kind'}"`, icon: I.mute, testId: 'notif-ctx-mute', onSelect: () => onMuteKind?.(notification) },
    { key: 'dismiss', label: 'Dismiss', icon: I.dismiss, variant: 'danger', testId: 'notif-ctx-dismiss', onSelect: () => onDismiss?.(notification) },
  ]
  return <MenuOrSheet open mobile={mobile} x={x} y={y} items={items} onClose={onClose} preview={mobile ? (notification.title || notification.text || '') : undefined} testId="notif-ctx-root" />
}