// CornerVG.jsx — corner:corner-ui-cv5 R1. The /cvg CV5 SURFACE.
// Byte-for-byte duplicate of CornerV4.jsx with three deltas:
//   1. component renamed CornerVG, mounted at /cvg* routes
//   2. basePath pinned to /cvg so in-app navigation stays on this surface
//   3. every chat send from /cvg carries a model override (useChatSend.js
//      cvgModelOverride) so turns run on the Gemini lane regardless of prefs
// R1: Type system (Hedvig Letters Serif + Figtree + IBM Plex Mono) applied via [data-cv5].
// The live /dashboard (CornerV4) stays untouched.
//
// CV3 stays sacred at /dashboard. All CV5 cuts are gated by the [data-cv5]
// CSS scope on this root. Shared cv3/ trees are imported verbatim so voice
// + chain animations stay in lockstep with V3 + V4.
//
// Mission: corner:corner-ui-cv5
// Plan: corner/missions/corner-ui-cv5/CONTEXT.md

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
// cv5.css removed 2026-06-22 (Patrik: remove old stylesheets not associated with CV6).
// The CV5 sheet defined [data-cv5] tokens (serif font, emerald accent, CV5 ground) on the
// same root as CV6 and was a drift source. CV6 screens are self-scoped ([data-cv6kit]) so
// they do not need it.
import './cv6.css' // CV6 design tokens, needed when cv6 mode is on (?cv6=1). Scoped to [data-cv6], inert otherwise.
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import skillsData from '../data/skills.json'
import { supabase } from './lib/supabase.js'
import {
  getClientId,
  setClientIdFromUser,
  setWorldOverride,
  getUserWorld,
} from './lib/clientConfig.js'
import { authFetch } from './lib/authFetch.js'
import { OVERLAY } from './cv4/lib/uiKit.jsx'
// corner:corner-ui-cv6 R-KIT-2 — wired Claude-design mobile Home (real data, kit look).
import { MobileHomeWired } from './cv6kit/MobileHomeWired.jsx'
import { MobileChatList } from './cv6kit/MobileChatList.jsx'
import MobileNavDrawer from './cv6kit/MobileNavDrawer.jsx'
import { MobileProjectWired } from './cv6kit/MobileProjectWired.jsx'
import { NewRoomModal } from './cv6kit/NewRoomModal.jsx'
// R5 — Claude-design DESKTOP Home (3-column shell, real data, self-scoped data-cv6kit).
import { DesktopHomeWired } from './cv6kit/DesktopHomeWired.jsx'
// R-KIT-11/13 — Claude-design Organize screen on phones (kit view + real projects + files).
import { OrganizeLive } from './cv6kit/OrganizeLive.jsx'
// R-KIT-12 — Claude-design Support inbox on phones, wired to the real wishes+email data.
import { SupportLive } from './cv6kit/SupportLive.jsx'
// R-KIT-14 — Claude-design Command goal ledger on phones, wired to the real room-goals data.
import { CommandLive } from './cv6kit/CommandLive.jsx'
// R-KIT-17 — Claude-design Review queue on phones, wired to the real recent-deliverables data.
import { ReviewLive } from './cv6kit/ReviewLive.jsx'
// R-KIT-18 — Claude-design Tracker screen (opens to an honest empty state until a bugs source exists).
import { TrackerView } from './cv6kit/TrackerView.jsx'
import { TrackerLive } from './cv6kit/TrackerLive.jsx'
// corner:corner-ui-cv6 — design mockups dropped onto /dashboard as the baseline so every
// tool shows its full Claude design; real data is wired back in per state (step 2+), the
// sample removed as it lands. Sample data reused from the kit so the design shows until wired.
import { CommandView } from './cv6kit/CommandView.jsx'
import { ReviewView } from './cv6kit/ReviewView.jsx'
import { SupportView } from './cv6kit/SupportView.jsx'
import { OrganizeView } from './cv6kit/OrganizeView.jsx'
import { ChatView, SAMPLE_CHAT } from './cv6kit/ChatView.jsx'
import { ScribeView, SAMPLE_SCRIBE } from './cv6kit/ScribeView.jsx'
import { DesktopHomeView, SAMPLE_HOME } from './cv6kit/DesktopHomeView.jsx'
import { MobileHomeExact } from './cv6kit/MobileHomeExact.jsx'
import { SearchLive } from './cv6kit/SearchLive.jsx'
import { SAMPLE_COMMAND, SAMPLE_REVIEW, SAMPLE_SUPPORT, SAMPLE_ORGANIZE, SAMPLE_TRACKER } from './CV6KitTest.jsx'
// R-KIT-ONBOARD — Claude-design first-run onboarding (5 steps: welcome, connections, permissions, theme, first goal).
import { OnboardingLive } from './cv6kit/OnboardingLive.jsx'
// R4 — cross-page Activity Dock wired to REAL running jobs (status=running tasks for the world).
import { ActivityDockLive } from './cv6kit/ActivityDockLive.jsx'
// R4 — Claude-design Settings (Environment): real integrations, live theme, real per-agent
// permissions + notification prefs (user_preferences), real sign out.
import { SettingsLive } from './cv6kit/SettingsLive.jsx'
import { NotificationPrompt } from './cv6kit/NotificationPrompt.jsx'
import { AddToHomePrompt } from './cv6kit/AddToHomePrompt.jsx'
import './cv6kit/kit.css'
import { useTasks } from './hooks/useTasks'
import { useDataPipe } from './hooks/useDataPipe'
import { useCurrentUserSlug } from './hooks/useCurrentUserSlug'
import useTelephone from './hooks/useTelephone'
import { useThemeMode } from './hooks/useThemeMode.js'
import GlassBackdrop from './cv4/GlassBackdrop.jsx'
import { C } from './lib/cv3Colors.js'
import { AomLogo } from './components/cv3/icons.jsx'
import { Badge, Tab, BellIcon } from './components/cv3/shared.jsx'
import { HomeIcon, TasksIcon, ChatIcon } from './components/cv3/icons.jsx'
import UserAvatar from './components/cv3/UserAvatar.jsx'
import TasksPanel from './components/cv3/TasksPanel.jsx'
import ChatPanel from './components/cv3/ChatPanel.jsx'
import { surfaceModel } from './components/cv3/chat/chatConstants.js'
import HomeView from './cv4/HomeView.jsx'
// /cvg renders the SAME HomeView as /dashboard (CornerV4). The ONLY intended
// delta on this surface is the forced Gemini model lane + the GEMINI badge.
// CV5 "Command Deck" home was reverted 2026-06-16 (Patrik: keep /cvg a clean
// Gemini test surface, not a design workbench).
import { useDefaultView } from './hooks/useDefaultView.js'
import WorldSelector from './components/WorldSelector.jsx'
import {
  CornerAuthProvider,
  CornerDataProvider,
  CornerNavProvider,
} from './CornerContext.jsx'
import { LiveCallProvider } from './providers/LiveCallProvider.jsx'
import GlobalCallButton from './components/cv3/voice/GlobalCallButton.jsx'
import FloatingCallBar from './components/cv3/voice/FloatingCallBar.jsx'
import NotificationsPanel from './components/cv3/NotificationsPanel.jsx'
import PhoneRecordingOverlay from './components/cv3/phone-recording/PhoneRecordingOverlay.jsx'
import CV4Drawer from './cv4/Drawer.jsx'
import CV4ContextNav from './cv4/ContextNav.jsx'
import TasksPanelCv4 from './cv4/TasksPanelCv4.jsx'
import CommandDeck from './cv4/CommandDeck.jsx'
import CommandTracker from './cv4/CommandTracker.jsx'
import { getProjectEA } from './data/project-ea.js'
import RightMenu from './cv4/RightMenu.jsx'
import CvgChatSurface from './cv4/CvgChatSurface.jsx'
import SkillsMissionPicker from './cv4/SkillsMissionPicker.jsx'
// R10 — MailListPanel moved into the left rail (cv4/LeftMailPanel.jsx),
// imported via cv4/Drawer.jsx; no longer mounted here directly.
import MailRoom from './cv4/MailRoom.jsx'
import RoutinesBoard from './cv4/RoutinesBoard.jsx'
import ChatWaveBackground from './cv4/ChatWaveBackground.jsx'
// corner:support N1 — Support Inbox (Patrik workspace only, worldId==='aom')
import SupportInbox from './cv4/SupportInbox.jsx'
import SupportDashboard from './cv4/SupportDashboard.jsx'
// corner:notifications-catchup R2 — Slack-style catch-up modal
import CatchupModal from './cv4/CatchupModal.jsx'

// ── Main component ────────────────────────────────────────────────────────────

// ── Toast notification ────────────────────────────────────────────────────────

function TaskCompletionToast({ message, visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <>
      <style>{`@keyframes su{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        background: C.s2,
        border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 14,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'su 0.3s ease-out',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: C.green,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.text2,
          fontFamily: "'Hanken Grotesk', sans-serif",
        }}>{message}</span>
      </div>
    </>
  )
}

// corner:corner-ui-cv6 R89 — this same CV6 surface now serves two routes:
//   /cvg       -> Gemini brain (surfaceModel() returns a Gemini model on /cvg)
//   /dashboard?cv6=1 -> Claude brain (surfaceModel() returns '' off /cvg, so no
//                       model override leaks -> the room's Claude pref stands)
// In-app navigation must stay on whichever surface the user came in on, so the
// base path is derived from the live pathname instead of pinned to /cvg.
function surfaceBase() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) return '/dashboard'
  return '/cvg'
}
// The Gemini-only chrome (spend badge, GEMINI pill) must NOT show on the Claude
// /dashboard mount. It only belongs on /cvg.
function isGeminiSurface() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/cvg')
}

export default function CornerVG() {
  const navigate = useNavigate()
  const { projectId: routeProjectId } = useParams()
  const routeLocation = useLocation()
  const [currentUser, setCurrentUser]   = useState(null)
  const [authReady, setAuthReady]       = useState(false)
  const [worldId, setWorldId]           = useState(null)
  const [tab, setTab]                   = useState('chat')
 const [deckTab, setDeckTab] = useState('chat') // 'chat' | 'deck', Command Deck in Elon's room (ported from CornerV4)
  // /cvg IS the CV6 surface. No cv4, no toggle (Patrik: "no more cv4 anymore that's the point").
  const cv6Mode = true
  const [unreadChat, setUnreadChat]     = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [conversationTarget, setConversationTarget] = useState(null) // { name, type: 'agent'|'project' }
  // R62 (Patrik): in CV6 we stop opening the old full-screen chat surface. Picking a room
  // anywhere (notification, catchup, command tracker, room links) instead opens the in-page
  // Chat tool. This carries the room to HomeView, which opens the Chat tool preselected.
  const [cv6ChatRequest, setCv6ChatRequest] = useState(null) // { kind, slug, name, missionSlug?, nonce }
 const [cv6ToolRequest, setCv6ToolRequest] = useState(null) // R82: { tool, nonce }, agent opens a tool on the user's screen
  const [prefillMessage, setPrefillMessage] = useState(null)
  // R6.2: mission clicked from the drawer is "attached" to the composer
  // and rendered as a context chip. Cleared on send by useChatSend.
  const [attachedMission, setAttachedMission] = useState(null)
  // CV4 Tools → Mail (R10, 2026-05-25): Mail moved to the left rail
  // (LeftMailPanel in CV4Drawer). activeTool still tracks 'tasks' etc.;
  // selectedMail is the email the user just clicked — pinned as a chat chip
  // until the EA sends a reply or the user clears it.
  const [activeTool, setActiveTool] = useState(null)
  // corner:corner-ui-cv6 R17 — the mobile global-nav drawer (right-anchored,
  // opened by the header menu OR a right-edge swipe). Switches tools; .mback goes
  // up a level within a tool. Mounted once for every cv6 mobile screen.
  const [navOpen, setNavOpen] = useState(false)
  const [notifPromptOpen, setNotifPromptOpen] = useState(false)
  // corner:corner-ui-cv6 R-WIRE — Global Search (⌘K / Ctrl-K). The palette is the
  // SearchLive overlay; this just owns open/close. Cmd-K toggles it from anywhere.
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // corner:corner-ui-cv6 BUG1-fix — ?view=<key> deep-link support. Reads the URL param
  // once on mount, routes to the matching surface, then strips the param so the address
  // bar stays clean. All state setters are stable refs — empty deps is intentional.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = new URLSearchParams(window.location.search).get('view')
    if (!v) return
    const VALID = new Set(['home', 'chat', 'organize', 'review', 'tracker', 'command', 'scribe', 'onboarding', 'support', 'search'])
    if (!VALID.has(v)) return
    if (v === 'home') { setActiveTool(null); setShowSupportInbox(false) }
    else if (v === 'support') { setShowSupportInbox(true) }
    else if (v === 'search') { setSearchOpen(true) }
    else { setActiveTool(v); setShowSupportInbox(false) }
    try {
      const u = new URL(window.location.href)
      u.searchParams.delete('view')
      window.history.replaceState({}, '', u.toString())
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [selectedMail, setSelectedMail] = useState(null)
  // corner:support N1 — Support Inbox view (Patrik workspace only)
  // ?support=1 deep-links straight to the Support dashboard (verify-at URL for
  // corner:support-desk — also how agents screenshot this surface).
  const [showSupportInbox, setShowSupportInbox] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('support'))
  // corner:support-desk M10 — pending support count for the headphones-icon badge.
  // M16-R4: ONE truth — the badge and the home Needs-you strip count the same
  // universe the Support headline counts (open wishes + emails needing a reply),
  // so home can never say "1 waiting" while Support says "6 waiting on you".
  const [supportWishesPending, setSupportWishesPending] = useState(0)
  const [supportEmailNeeds, setSupportEmailNeeds] = useState(0)
  const supportPending = supportWishesPending + supportEmailNeeds
  useEffect(() => {
    if (worldId !== 'aom') return
    let alive = true
    const load = async () => {
      try {
        const r = await fetch('/api/support/wishes')
        const d = await r.json()
        if (alive && d?.ok) {
          setSupportWishesPending((d.wishes || []).filter(w => ['heard', 'working', 'needs_team'].includes(w.status)).length)
        }
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [worldId])
  useEffect(() => {
    // Email needs poll at a gentler cadence — it walks Gmail server-side.
    if (worldId !== 'aom') return
    let alive = true
    const load = async () => {
      try {
        const r = await authFetch('/api/support/inbox', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ email: 'patrikmatheson@gmail.com', days: 7 }) })
        const d = await r.json()
        if (alive && d?.ok) {
          setSupportEmailNeeds((d.mailboxes || []).reduce((n, b) => n + (b.needs?.length || 0), 0))
        }
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 300000)
    return () => { alive = false; clearInterval(t) }
  }, [worldId])
  // corner:support-desk M16-R2 — home tells the real story. Rows only ship when
  // their click target is real; every row is one tap from acting on it.
  const homeNeedsYou = useMemo(() => {
    const rows = []
    if (worldId === 'aom' && supportPending > 0) {
      rows.push({
        key: 'support', label: 'Support', detail: supportPending + ' waiting',
        onOpen: () => setShowSupportInbox(true),
      })
    }
    return rows
  }, [worldId, supportPending])
  const [inputBarText, setInputBarText] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifReadAt, setNotifReadAt] = useState({})
  // corner:notifications-catchup R2 — catch-up modal
  const [catchupOpen, setCatchupOpen] = useState(false)

  // R49 (2026-04-23): when setPrefillMessage is fired from TasksPanel
  // (new-project recipe), drop it into the home input bar and clear
  // the pending prefill so it doesn't fire twice.
  useEffect(() => {
    if (prefillMessage && tab === 'chat' && !selectedAgent && !conversationTarget) {
      setInputBarText(prefillMessage)
      setPrefillMessage(null)
    }
  }, [prefillMessage, tab, selectedAgent, conversationTarget])
  const [inputBarSending, setInputBarSending] = useState(false)
  const [inputBarFocused, setInputBarFocused] = useState(false)
  // Attach: stageFilesRef is set by ChatPanel to its useChatAttachments.stageFiles;
  // homeFileInputRef triggers the OS file picker from the home-tab toolbar.
  const stageFilesRef = useRef(null)
  const homeFileInputRef = useRef(null)
  const [showCommandsModal, setShowCommandsModal] = useState(false)
  // R6.6: docked sidebar on desktop. Drawer opens by default at >=1024px and
  // sits inline so chat messages feel anchored, not adrift in a centered void.
  // Below 1024px it falls back to the overlay slide-in.
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // R78-p9c: increment to force both Drawer instances to refetch missions-tree
  // immediately after a new project or mission is created via the self-serve door.
  const [drawerRefreshKey, setDrawerRefreshKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  // corner-ui-cv4 R23: side menus auto-close after 10s without hover and
  // reopen when the screen-edge gutter is hovered. Hover state feeds the
  // idle timers below; the gutters live in the main desktop row.
  const [leftRailHover, setLeftRailHover] = useState(false)
  const [rightRailHover, setRightRailHover] = useState(false)
  // Once a rail has been hovered and left, the close delay drops from the
  // initial 10s to a couple of beats — lingering open after the pointer
  // leaves feels too slow. Resets when the rail closes.
  const [leftRailTouched, setLeftRailTouched] = useState(false)
  const [rightRailTouched, setRightRailTouched] = useState(false)
  // corner:skills-picker R1 — Skills shelf takeover of the left rail, plus
  // the mission-picker modal that fires after the user clicks a skill chip.
  const [skillsShelfOpen, setSkillsShelfOpen] = useState(false)
  const [skillsPickerSkill, setSkillsPickerSkill] = useState(null)
  const toggleSkillsShelf = useCallback(() => {
    setSkillsShelfOpen((o) => {
      const next = !o
      // Opening the shelf auto-opens the left drawer so users always see the
      // takeover; closing the shelf doesn't auto-close the drawer.
      if (next) setDrawerOpen(true)
      return next
    })
  }, [])
  const handlePickSkill = useCallback((skill) => {
    if (skill) setSkillsPickerSkill(skill)
  }, [])
  const handleSkillAttached = useCallback((mission, _skill) => {
    setSkillsPickerSkill(null)
    setSkillsShelfOpen(false)
    // Route to the chat for that mission's project so the chip shows up on
    // the right input bar. If the mission picker resolved to a project root
    // (missionSlug = null), still route to the project.
    if (mission?.projectSlug && typeof window !== 'undefined') {
      try {
        // Append ?mission=<slug> so ProjectChat highlights / attaches it.
        const path = `/cv4/p/${encodeURIComponent(mission.projectSlug)}`
        const qs = mission.missionSlug ? `?mission=${encodeURIComponent(mission.missionSlug)}` : ''
        navigate(path + qs)
      } catch { /* ignore — fall back to staying put */ }
    }
  }, [navigate])
  // R7.1: Tasks panel lives in a right-side docked drawer on desktop. Open
  // by default; toggle button sits in the second-row nav's right slot.
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)
  // corner-ui-cv4 R23: 10s no-hover idle timers. While a drawer is open and
  // the pointer isn't over it, count down; hovering it resets the countdown.
  useEffect(() => {
    if (!isDesktop || !drawerOpen || leftRailHover) return undefined
    const t = setTimeout(() => { setDrawerOpen(false); setLeftRailTouched(false) }, leftRailTouched ? 2000 : 10000)
    return () => clearTimeout(t)
  }, [isDesktop, drawerOpen, leftRailHover, leftRailTouched])
  useEffect(() => {
    if (!isDesktop || !tasksDrawerOpen || rightRailHover) return undefined
    const t = setTimeout(() => { setTasksDrawerOpen(false); setRightRailTouched(false) }, rightRailTouched ? 2000 : 10000)
    return () => clearTimeout(t)
  }, [isDesktop, tasksDrawerOpen, rightRailHover, rightRailTouched])
  // R23b: clicking anywhere in the chat / center column dismisses both
  // side menus right away — the user's focus moved to the conversation.
  const closeRailsOnContentClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setDrawerOpen(false)
      setTasksDrawerOpen(false)
      setLeftRailTouched(false)
      setRightRailTouched(false)
    }
  }, [])
  // R8.0: theme is owned by `useThemeMode` (Arizona auto-seed + manual
  // override). `setTheme(...)` here is wired to the hook so the legacy
  // moon-toggle button keeps working and the CSS-vars repaint
  // (cv3Colors.js) responds.
  const { mode: theme, override, setTheme: setThemeHook, cycleTheme, backdropIndex } = useThemeMode()
  const setTheme = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(theme) : next
    setThemeHook(resolved)
  }, [theme, setThemeHook])
  // corner:corner-ui-cv6 — CV6 is dark-first. Every Claude design .html is
  // data-theme="dark"; the CV6 surface must NOT inherit CV4's Arizona daytime
  // light auto-seed (that is what left desktop Home stuck in light mode). Until
  // the user explicitly picks a theme (override === 'auto'), render dark. A manual
  // light / dark / glass choice via the toggle is always respected.
  const effectiveTheme = (cv6Mode && override === 'auto') ? 'dark' : theme
  // corner:corner-ui-cv6 — one-time CV6 dark-first migration. CV6 relaunched dark
  // (every Claude design .html is data-theme="dark"). A stale CV4-era light choice
  // (cv4-theme + the user-set flag) was carrying the new design into light, and the
  // real lever is the GLOBAL <html data-theme> that useThemeMode writes from the
  // saved mode — not the inner div data-theme. So set the actual mode to dark once:
  // on first cv6 load, unless the saved theme is already an explicit dark/glass,
  // reset to dark (this repaints <html data-theme>, so EVERY surface goes dark, not
  // one component). Runs once per browser; the user can toggle afterward and it persists.
  useEffect(() => {
    if (!cv6Mode || typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem('cv6-theme-init') === '1') return
      window.localStorage.setItem('cv6-theme-init', '1')
      const saved = window.localStorage.getItem('cv4-theme')
      if (saved !== 'dark' && saved !== 'glass') setThemeHook('dark')
    } catch { /* private mode: skip */ }
  }, [cv6Mode, setThemeHook])
  useEffect(() => {
    if (typeof document === 'undefined') return
    // Keep the cv4 shell scope so all [data-shell="cv4"] CSS applies here too.
    document.documentElement.setAttribute('data-shell', 'cv4')
    // CVG delta: persistent GEMINI surface badge so it's always obvious this is
    // the Gemini workbench. ONLY on /cvg — the /dashboard?cv6=1 mount runs the
    // Claude brain and must not wear Gemini chrome. R89.
    let style = null, badge = null
    if (isGeminiSurface()) {
      style = document.createElement('style')
      style.id = 'cvg-badge-styles'
      style.textContent = '@keyframes cvg-dot-pulse{0%,100%{opacity:1}50%{opacity:.4}}'
      document.head.appendChild(style)
      badge = document.createElement('div')
      badge.id = 'cvg-surface-badge'
      badge.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#34d399;display:inline-block;margin-right:7px;animation:cvg-dot-pulse 2s ease-in-out infinite;vertical-align:middle"></span><span>GEMINI 3.5 FLASH</span>'
      // CV6-native: calm glass pill (surface + 1px hairline, no loud amber), mono label.
      // Narrow screens: dock bottom-LEFT — bottom-right collides with the menu/avatar
      // FABs and floats over the room list (loop R3).
      const dockLeft = window.matchMedia('(max-width: 900px)').matches
      badge.style.cssText = `position:fixed;bottom:max(14px, env(safe-area-inset-bottom, 0px));${dockLeft ? 'left:14px;' : 'right:14px;'}z-index:99999;` +
        'font:500 10px/1.35 "JetBrains Mono",monospace;letter-spacing:.08em;' +
        'color:#E8EBEF;background:rgba(20,21,24,0.82);' +
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
        'border:1px solid rgba(255,255,255,0.10);padding:7px 11px;border-radius:8px;' +
        'pointer-events:none;display:flex;align-items:center;'
      document.body.appendChild(badge)
    }
    return () => {
      try { document.documentElement.removeAttribute('data-shell') } catch (_) {}
      try { if (badge) badge.remove() } catch (_) {}
      try { if (style) style.remove() } catch (_) {}
    }
  }, [])
  const [toast, setToast] = useState({ visible: false, message: '' })
  const showToast = useCallback((message) => setToast({ visible: true, message }), [])
  const prevDoneIdsRef = useRef(null)

  useEffect(() => {
    console.log('CornerV4 mounted')
  }, [])

  // gemini-workers: show month-to-date Gemini spend in the surface badge footer.
  // /cvg only — the Claude /dashboard mount has no Gemini spend to show. R89.
  useEffect(() => {
    if (!worldId || !isGeminiSurface()) return
    authFetch(`/api/dashboard/gemini-spend?client_id=${encodeURIComponent(worldId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const badge = document.getElementById('cvg-surface-badge')
        if (!badge) return
        badge.style.flexDirection = 'column'
        badge.style.alignItems = 'flex-start'
        badge.style.gap = '4px'
        badge.innerHTML =
          '<div style="display:flex;align-items:center">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:#34d399;display:inline-block;margin-right:7px;animation:cvg-dot-pulse 2s ease-in-out infinite"></span>' +
          '<span>GEMINI 3.5 FLASH</span></div>' +
          `<div style="font-size:9px;letter-spacing:.04em;color:#9BA3AE;padding-left:14px">$${data.cost_usd.toFixed(2)} this month</div>`
      })
      .catch(() => {})
  }, [worldId])

  // ── R7.16 Mobile world reset escape hatch ─────────────────────────────────
  // Visit /cv4?reset_world=1 on mobile to wipe both override stores and reload
  // into a fresh shell that resolves worldId from auth (Patrik → aom). Runs
  // synchronously before anything else mounts, so the next read of
  // getClientId() returns the auth-derived world.
  if (typeof window !== 'undefined') {
    try {
      const p = new URLSearchParams(window.location.search)
      if (p.has('reset_world')) {
        sessionStorage.removeItem('corner-world-override')
        localStorage.removeItem('corner-world-override-persist')
        p.delete('reset_world')
        const rest = p.toString()
        // Replace (not push) so back button doesn't loop the reset.
        window.location.replace(window.location.pathname + (rest ? `?${rest}` : ''))
      }
    } catch { /* ignore */ }
  }

  // ── Google OAuth callback toast ────────────────────────────────────────────
  // R12 (2026-05-25) — read the actual ?integrations=connected|error params
  // the callback sets (the earlier ?google_oauth=success|denied check never
  // matched the callback's redirect). reason=scope-insufficient gets its
  // own message so the user knows to pick "Select all" on Google's granular
  // permissions screen on the next attempt — the most common bug here was
  // skipping that checkbox and landing as "connected" with no actual access.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('integrations')
    if (!status) return
    const slug = params.get('slug') || ''
    const reason = params.get('reason') || ''
    if (status === 'connected') {
      const labelMap = { gmail: 'Gmail', 'google-calendar': 'Google Calendar', 'google-drive': 'Google Drive' }
      const label = labelMap[slug] || slug || 'Integration'
      setToast({ visible: true, message: `${label} connected.` })
    } else if (status === 'error') {
      if (reason.startsWith('scope-insufficient')) {
        setToast({
          visible: true,
          message: 'Gmail connected with limited access. Please reconnect and tick "Select all" on the permissions screen.',
        })
      } else if (reason.startsWith('provider:access_denied')) {
        setToast({ visible: true, message: 'Google authorization was cancelled.' })
      } else {
        setToast({ visible: true, message: `Couldn’t connect: ${reason || 'unknown error'}` })
      }
    }
    params.delete('integrations')
    params.delete('slug')
    params.delete('reason')
    params.delete('world_id')
    const newSearch = params.toString()
    window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname)
  }, [])

  // mission-rooms: read ?mission= from the URL on mount and persist mission
  // scope on the conversationTarget. Lets a direct link to
  // /cv4/project/:slug?mission=:missionSlug land the user inside the mission
  // room, not the project's general chat or the previously-selected 1:1
  // agent surface (clearing selectedAgent mirrors handleSelectMission so
  // the chat panel actually re-renders into the project room).
  useEffect(() => {
    if (!routeProjectId) return
    const params = new URLSearchParams(routeLocation.search || '')
    const missionSlug = params.get('mission')
    if (!missionSlug) {
      // mission-rooms: search param dropped OR direct-URL navigation to a
      // project room with no mission scope. Either way the conversationTarget
      // must reflect this project so ChatPanel renders the project chat
      // surface (not the empty Home fallback). Three cases:
      //   1) prev is null (direct URL load, e.g. /dashboard/project/space-rising)
      //      → set it to a plain project target so the room actually opens
      //      and its messages load (without this the chat tab falls through
      //      to "Home / Start a conversation" and history never appears).
      //   2) prev has missionSlug (room change clearing mission scope) → drop mission
      //   3) prev is already this project with no mission → no-op
      setSelectedAgent(null)
      setConversationTarget(prev => {
        if (prev && prev.slug === routeProjectId && !prev.missionSlug) return prev
        return { name: prev?.name || routeProjectId, slug: routeProjectId, type: 'project' }
      })
      return
    }
    setSelectedAgent(null)
    // Direct-URL load has no friendly mission name in scope (the missions tree
    // loads inside child components), so title-case the slug as a readable
    // fallback. Click navigation (handleSelectMission) sets the real name.
    const titleFromSlug = missionSlug.replace(/[-_:]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    setConversationTarget(prev => {
      if (prev && prev.slug === routeProjectId && prev.missionSlug === missionSlug) return prev
      return {
        name: titleFromSlug,
        slug: routeProjectId,
        type: 'project',
        missionSlug,
        missionName: titleFromSlug,
        missionPath: `corner:${missionSlug}`,
      }
    })
  }, [routeProjectId, routeLocation.search])

  // User identity for multi-user message tracking (parent scope)
  const parentUserIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  // corner:mission-rooms — tasks retired 2026-05-17. Keeping the useTasks
  // call so downstream consumers (MessageList task-room failure branch,
  // TasksPanelCv4, etc.) don't crash before they're cut in their own
  // rounds. queued/rightNow/waiting/done/allTasks will all be empty arrays
  // once the tasks table query returns nothing. The "task completed" toast
  // is gone — no chrome talks tasks anymore.
  const { queued, rightNow, waiting, done, allTasks, refresh: refreshTasks, addOptimisticTask } = useTasks(worldId)
  // R14e-4 (viewing-user model): the viewer's slug inside this tenant.
  // Resolved from `tenant_users.slug` keyed on auth.uid() + current worldId.
  // AOM tenant: Patrik → 'patrik', Ash → 'ash'. Future personal tenants:
  // each viewer gets their own slug in their own tenant_users row.
  const currentUserSlug = useCurrentUserSlug(currentUser, worldId)

  // useDataPipe provides agents, inboxItems, projectRooms (from agent_status),
  // and filters personal/non-personal tasks by the viewer's slug.
  const { agents, inboxItems, projectRooms, personalTodos, lastUpdated: dataPipeUpdatedAt, refetch: refetchData } = useDataPipe(null, worldId, currentUserSlug)

  // Default-view setting: 'home' (default) OR { kind:'agent'|'project', slug:'...' }.
  // Lets the user override what loads first when opening the dashboard.
  // Mission: corner:home-screen R1.
  const { defaultView, setDefaultView, resetToHome } = useDefaultView(currentUser?.id)
  const isHomeMode = (!conversationTarget && !routeProjectId && (defaultView?.kind === 'home' || !defaultView?.kind))

  // Expose setDefaultView / resetToHome via window so the composer-menu
  // "Make default room" command and the user-avatar "Reset default view"
  // entry can invoke them without prop drilling for R1.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__cv4SetDefaultView = (value) => setDefaultView(value)
    window.__cv4ResetDefaultView = () => resetToHome()
    window.__cv4CurrentConversation = conversationTarget
    window.__cv4SelectedAgent = selectedAgent
    return () => {
      try { delete window.__cv4SetDefaultView; delete window.__cv4ResetDefaultView; delete window.__cv4CurrentConversation; delete window.__cv4SelectedAgent } catch (_) {}
    }
  }, [setDefaultView, resetToHome, conversationTarget, selectedAgent])

  // corner:shared-rooms M8 — world-transition reset.
  // The auto-select effect below pins selectedAgent on first paint. On a slow
  // auth resolve (or an admin world-override flip) the agents list changes
  // out from under us — e.g. Ben logs in: first render uses the default 'aom'
  // clientId because auth hasn't resolved, picks a default AOM EA, then
  // arsenal resolves and agents becomes [ea] but selectedAgent is still pinned
  // to the AOM one. Without this reset, the early-return below blocks
  // re-selection and Ben stays in a room for an agent that doesn't exist in
  // his world. Reset only fires when the current selection is genuinely
  // orphaned from the new world's agent list — mid-conversation users whose
  // agent IS in the new list don't get clobbered.
  useEffect(() => {
    if (!agents || agents.length === 0) return
    if (!selectedAgent) return
    const stillPresent = agents.some(a => a.slug === selectedAgent.slug)
    if (stillPresent) return
    setSelectedAgent(null)
    setConversationTarget(null)
  }, [agents, selectedAgent])

  // R5.1 / R7.20: no more "home" view. First paint = chat with the world's EA.
  // Reads is_ea + is_terminal from agent_status — works for every tenant without
  // hard-coding a slug. (Previously hard-coded 'elon', which broke non-AOM worlds
  // like arsenal where the EA slug is 'ea'.) Skips auto-select if the user
  // already has a conversation in flight (e.g. landed on /cv4/project/:id).
  // R-home-screen: default first paint = HomeView. Auto-route only fires when
  // the user has set a non-home default (an agent or project room). Without that
  // override, the home view renders and the user picks where to go.
  useEffect(() => {
    if (!agents || agents.length === 0) return
    if (selectedAgent || conversationTarget) return
    if (routeProjectId) return
    const kind = defaultView?.kind
 if (!kind || kind === 'home') return // home is the default, let HomeView render
    if (kind === 'agent' && defaultView.slug) {
      const target = agents.find(a => a.slug === defaultView.slug)
      if (target) {
        setSelectedAgent(target)
        setConversationTarget({ name: target.name, type: 'agent' })
        return
      }
    }
    if (kind === 'project' && defaultView.slug) {
      const proj = (projectRooms || []).find(p => p.slug === defaultView.slug)
      if (proj) {
        setConversationTarget({ name: proj.name || proj.slug, slug: proj.slug, type: 'project' })
        try {
          const basePath = surfaceBase()
          navigate(basePath + '/project/' + proj.slug)
        } catch (_) {}
        return
      }
    }
  }, [agents, projectRooms, selectedAgent, conversationTarget, routeProjectId, defaultView, navigate])

  // Tenant access guard (2026-05-25): if the URL points at a project the
  // current user can't access, redirect to the dashboard root. Without
  // this, a tenant user (e.g. Karen) who lands on
  // /cv4/project/aheadofmarket via a stale URL, a bookmark, or an
  // accidental click ends up with conversationTarget=aheadofmarket, and
  // every message she sends gets stamped client_id="shared:aheadofmarket"
  // — which Patrik's aheadofmarket chat then legitimately reads via the
  // [worldId, sharedCid] union. That produced the 2026-05-25 live leak.
  // The accessible-list is the same data feeding the left rail, so
  // anything visible to the user remains reachable. Skips the guard
  // while projectRooms is loading (avoids redirect race on cold load).
  // Placed AFTER the auto-select useEffect so projectRooms (declared via
  // useDataPipe above) is guaranteed in scope; placing it earlier trips
  // TDZ in the minified bundle (Vercel deploy 2026-05-25T23:30 incident).
  useEffect(() => {
    if (!routeProjectId) return
    if (!projectRooms || projectRooms.length === 0) return
    // Skip guard when navigating to a mission URL — handleSelectMission already
    // validated the project via resolveCanonicalProject before calling navigate().
    // Blocking mission-URL navigations here causes the "goes to home" bug where
    // right-menu mission clicks land on the home screen instead of the mission room.
    const hasMissionParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mission')
    if (hasMissionParam) return
    const accessible = projectRooms.some(p => p?.slug === routeProjectId)
    if (!accessible) {
      const basePath = surfaceBase()
      console.warn('[tenant-isolation] blocked URL-route to inaccessible project; redirecting', { routeProjectId, accessibleSlugs: projectRooms.map(p => p?.slug) })
      navigate(basePath, { replace: true })
    }
  }, [routeProjectId, projectRooms, navigate])

  // Telephone mode (long-form record → transcribe → post to active super-agent).
  // Lives at this level so recording survives Home/Tasks/Chat navigation.
  const telephone = useTelephone({
    worldId,
    agents,
    selectedAgent,
    userIdentity: parentUserIdentity,
  })
  const [phoneOverlayOpen, setPhoneOverlayOpen] = useState(false)
  // corner:support N2 — Support button for non-Patrik tenants
  const [supportOpen, setSupportOpen] = useState(false)

  // Auto-close overlay 2 s after transcript dispatches, then toast.
  useEffect(() => {
    if (!telephone.lastTranscript || telephone.isRecording || telephone.isTranscribing) return
    showToast('Transcript sent.')
    const t = setTimeout(() => setPhoneOverlayOpen(false), 2000)
    return () => clearTimeout(t)
  }, [telephone.lastTranscript, telephone.isRecording, telephone.isTranscribing])

  // Notifications: filter inboxItems by per-ROOM read timestamps (session-only).
  // corner:notifications R1 — read state keys on roomKey so opening one room's
  // notification doesn't silence another room from the same agent. Fall back to
  // agent for any legacy item missing roomKey.
  const notifItems = useMemo(() => {
    return (inboxItems || []).filter(item => {
      const key = item.roomKey || item.agent
      return key && (!notifReadAt[key] || item.timestamp > notifReadAt[key])
    })
  }, [inboxItems, notifReadAt])

  const totalUnread = notifItems.length

  // tabRef keeps the realtime callback fresh without resubscribing on every tab change
  const tabRef = useRef(tab)

  // Active task count: queued + building/qa
  const activeTaskCount = (queued?.length || 0) + (rightNow?.length || 0)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured (local dev without env vars) -- allow through.
      setAuthReady(true)
      return
    }

    // getSession() reads from localStorage (near-instant) rather than making a network
    // request like getUser() does. This seeds currentUser before the first paint cycle.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null
      if (user) {
        setCurrentUser(user)
        setClientIdFromUser(user)
        setWorldId(getClientId())
      }
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      // Only update state when the user identity actually changes.
      // Passing a function to setCurrentUser avoids re-renders on transient
      // events (TOKEN_REFRESHED, USER_UPDATED) where the user ID is the same.
      setCurrentUser(prev => {
        if (user?.id && user.id === prev?.id) return prev
        return user
      })
      if (user) {
        setClientIdFromUser(user)
        setWorldId(getClientId())
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Keep tabRef in sync so realtime callback always sees current tab without resubscribing
  useEffect(() => { tabRef.current = tab }, [tab])

  // ── New-user onboarding auto-start ────────────────────────────────────────
  // When a brand new user loads their empty workspace the EA sends the first
  // message — a warm welcome + lead-in question. The user should never see a
  // blank chat and wonder if something is broken.
  // Primary guard: msgs.length > 0 (DB state). sessionStorage is a lightweight
  // dedup to avoid re-checking on every render within the same tab session.
  useEffect(() => {
    if (!authReady || !worldId || !currentUser) return
 if (worldId === 'aom') return // Patrik's world, never auto-start
    // Find the EA agent specifically — not just agents[0] which may be a project room
    const eaAgent = agents?.find(a => a.is_ea && a.is_terminal)
      || agents?.find(a => a.is_ea)
      || agents?.[0]
    if (!eaAgent) return
    const flagKey = `onboard-started-${worldId}`
    // Delay to let the message list load before we check if it's empty
    const timer = setTimeout(async () => {
      try {
        // all=true: the GET requires either an agent slug or all=true. We want
        // "any message in this world" — sending all=true checks across agents
        // so the greeting fires once per world, not once per agent. Without
        // this, the endpoint returns 400 ('agent required') and the welcome
        // never posts for new tenants like Ben's Arsenal workspace.
        const r = await authFetch(
          `/api/dashboard/supabase-messages?client=${encodeURIComponent(worldId)}&all=true&limit=1`
        )
        if (!r.ok) return
        const data = await r.json()
        const msgs = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : []
        if (msgs.length > 0) {
          // Already has messages — set the dedup flag so we stop checking each render
          sessionStorage.setItem(flagKey, '1')
          return
        }
        // No messages — EA sends the welcome first as assistant
        if (sessionStorage.getItem(flagKey)) return  // already fired this session
        sessionStorage.setItem(flagKey, '1')
        await authFetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: eaAgent.slug,
 text: "Hey, welcome! I'm your EA, I help you stay organized and get things done. What kind of work do you do? Give me a quick rundown and I'll get your workspace set up.",
            role: 'assistant',
            source: 'corner-onboarding-auto',
            client_id: worldId,
          }),
        })
      } catch (e) { console.warn('[onboarding] welcome send failed:', e) }
    }, 1200)
    return () => clearTimeout(timer)
  }, [authReady, worldId, currentUser, agents])

  // ── Chat unread count (realtime) ──────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return

    // Reset unread when switching worlds
    setUnreadChat(0)

    // chat-5: unique per-mount topic so a fast workspace switch (or a double
    // effect run) can never leave two same-named channels both delivering the
    // same INSERT (double-counted unread). Cleanup removes this exact instance.
    // NOTE: only safe for postgres_changes (local topic); the cv6-view broadcast
    // channel below must keep its fixed name so the sender's topic still matches.
    const channel = supabase
      .channel(`cornerv3-messages-${worldId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        () => {
          // Only increment unread if not currently on chat tab (reads tabRef to avoid resubscribe)
          setUnreadChat(prev => tabRef.current === 'chat' ? 0 : prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [worldId])

  // R82 (Patrik: "agents can control the view of the user"): a live broadcast
  // channel an agent (terminal / loop) can push to so the user's screen follows.
  // An agent sends a Supabase Realtime broadcast on topic `cv6-view-<world>`,
  // event `navigate`, with a payload that either opens a room or opens a tool:
  //   { kind:'project'|'mission'|'agent', slug, missionSlug?, name? }  -> opens the room
  //   { tool:'command'|'chat'|'organize'|'review'|'support'|'tracker'|'scribe' } -> opens the tool
  // Cheap + serverless: no table, no polling — broadcast is ephemeral and instant.
  useEffect(() => {
    if (!supabase || !worldId) return
    const ch = supabase
      .channel(`cv6-view-${worldId}`)
      .on('broadcast', { event: 'navigate' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return
        try {
          if (payload.tool) {
            setCv6ToolRequest({ tool: payload.tool, nonce: Date.now() })
          }
          if (payload.kind && payload.slug) {
            setCv6ChatRequest({
              kind: payload.kind,
              slug: payload.slug,
              missionSlug: payload.missionSlug || undefined,
              name: payload.name || payload.slug,
              nonce: Date.now(),
            })
          }
        } catch (e) { console.warn('[cv6-view] bad navigate payload', e) }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [worldId])

  // Clear unread when switching to chat; clear conversation only when tapping
  // Chat tab while already on chat (the "back to home" gesture). When returning
  // from Tasks, preserve the agent/project the user was in.
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab)
    if (newTab === 'chat') {
      setUnreadChat(0)
      if (tab === 'chat') {
        setSelectedAgent(null)
        setConversationTarget(null)
      }
    }
  }, [tab])

  // Select an agent and switch to chat tab
  const handleSelectAgent = useCallback((agent) => {
    // Navigation reset: clear overlay state so user lands in the new surface clean.
    setSelectedMail(null)
    setActiveTool(null)
    setShowSupportInbox(false)
    if (agent?.slug) {
      // corner:notifications R2 — opening the 1:1 agent thread clears its
      // notification dot (roomKey = 'agent:<slug>' per useDataPipe roomKey logic).
      setNotifReadAt(prev => ({ ...prev, [`agent:${agent.slug}`]: new Date().toISOString() }))
    }
    if (cv6Mode && isDesktop) {
      // R62: desktop opens the in-page Chat tool and stays in home mode (the
      // desktop Home hosts that panel). On mobile the kit Home is full-screen
      // with no in-page host, so fall through to set conversationTarget and open
      // the full-screen CvgChatSurface — otherwise a room tap is a no-op.
      setCv6ChatRequest({ kind: 'agent', slug: agent.slug, name: agent.name, nonce: Date.now() })
      return
    }
    setSelectedAgent(agent)
    setConversationTarget({ name: agent.name, type: 'agent' })
    setTab('chat')
    setUnreadChat(0)
    // R7.21: Preserve the entry-point base path (/dashboard or /cv4) so the
    // URL bar doesn't snap from /dashboard → /cv4 when the user navigates.
    const basePath = surfaceBase()
    // Clear any project route so ChatPanel renders the agent thread (not project chat).
    if (routeProjectId) navigate(basePath)
  }, [navigate, routeProjectId, cv6Mode, isDesktop])

  // R21c: notifications carry `item.project` from a message's `project` column,
  // which is sometimes the display name (e.g. "aheadofmarket.com") instead of
  // the canonical DB slug ("aheadofmarket"). Without normalization, clicking a
  // notification navigates to /project/<display-name>, the tenant-isolation
  // guard rejects it as inaccessible, and ChatPanel falls back to its home
  // view — feels like the home screen is "blocking" the click. Resolve against
  // projectRooms by exact slug, then case-insensitive name, then case-insensitive
  // slug; if nothing matches, pass through (the guard will do its job).
  const resolveCanonicalProject = useCallback((input) => {
    if (!input || !Array.isArray(projectRooms) || projectRooms.length === 0) return null
    const raw = String(input)
    const lower = raw.toLowerCase()
    return (
      projectRooms.find(p => p?.slug === raw) ||
      projectRooms.find(p => (p?.name || '').toLowerCase() === lower) ||
      projectRooms.find(p => (p?.slug || '').toLowerCase() === lower) ||
      null
    )
  }, [projectRooms])

  // Called by ChatPanel (and the CV4 drawer) when a project is selected.
  // Carries `slug` so the drawer's active highlight + Tasks-tab scoping can key on it.
  // Navigates to <basePath>/project/:slug so ChatPanel's useParams picks up
  // projectId → routes to ProjectChatView instead of the conversations list.
  const handleSelectProject = useCallback((project) => {
    const canonical = resolveCanonicalProject(project?.slug)
    const canonicalSlug = canonical?.slug || project?.slug
    const canonicalName = canonical?.name || project?.name || canonicalSlug
    // Navigation reset: clear overlay state so user lands in the new surface clean.
    setSelectedMail(null)
    setActiveTool(null)
    setShowSupportInbox(false)
    if (canonicalSlug) {
      // corner:notifications R2 — opening the project room clears its
      // project-level notification dot (roomKey = project slug).
      setNotifReadAt(prev => ({ ...prev, [canonicalSlug]: new Date().toISOString() }))
    }
    if (cv6Mode && isDesktop) {
      // R62: desktop opens the in-page Chat tool drilled to this project (stays in
      // home mode). On mobile the kit Home is full-screen with no in-page host, so
      // fall through to set conversationTarget and open the full-screen chat.
      setCv6ChatRequest({ kind: 'project', slug: canonicalSlug, name: canonicalName, nonce: Date.now() })
      return
    }
    setSelectedAgent(null)
    setConversationTarget({ name: canonicalName, slug: canonicalSlug, type: 'project' })
    setTab('chat')
    setUnreadChat(0)
    if (canonicalSlug) {
      const basePath = surfaceBase()
      navigate(`${basePath}/project/${canonicalSlug}`)
    }
  }, [navigate, resolveCanonicalProject, cv6Mode, isDesktop])

  // R78-p9 corner:new-projects — self-serve creation. The "+ New project"
  // door in the drawer opens a name popup; on submit we create the room and
  // drop the user straight into it, where the agent's kickoff greeting
  // (posted server-side by create-project-from-chat) is already waiting.
  const [newRoomModal, setNewRoomModal] = useState(null) // null | { kind: 'project' | 'mission', parentSlug?, parentName? }
  // corner:corner-ui-cv6 LIVE-FEEDBACK — the project whose "missions inside" view
  // is open on mobile (set when a room is tapped on the Home screen). Rendered via
  // activeTool === 'projectview'; null otherwise.
  const [mobileProject, setMobileProject] = useState(null)
  const [creatingRoom, setCreatingRoom]  = useState(false)
  const [createRoomError, setCreateRoomError] = useState(null)

  const slugify = (s) =>
    (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)

  const handleCreateProject = useCallback(async (rawName) => {
    const name = (rawName || '').trim()
    if (!name || !worldId) return
    const slug = slugify(name) || `room-${Date.now().toString(36)}`
    setCreatingRoom(true)
    setCreateRoomError(null)
    try {
      const r = await authFetch('/api/dashboard/create-project-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, client_id: worldId }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j && j.ok) {
        setNewRoomModal(null)
        handleSelectProject({ slug: j.slug || slug, name: j.name || name })
        // R78-p9c: force immediate refetch of data pipe + missions-tree.
        refetchData && refetchData()
        setDrawerRefreshKey(k => k + 1)
      } else {
        setCreateRoomError((j && j.error) || 'Could not create the project. Try again.')
      }
    } catch (e) {
      setCreateRoomError('Could not create the project. Try again.')
    } finally {
      setCreatingRoom(false)
    }
  }, [worldId, handleSelectProject, refetchData])

  // R3 corner:mission-rooms — clicking a mission in the drawer OR in the
  // tasks-view file manager routes into a focused chat surface scoped to
  // that mission. Same chat template as a project/agent room; the room
  // is keyed by project+mission so the bridge loads mission CONTEXT/VISION/
  // BUILD as starting context (bridge.py R1) and `mission_slug` rides on
  // every outgoing message's metadata so the SDK reply is mission-aware.
  const handleSelectMission = useCallback((mission, project) => {
    if (!mission || !project) return
    // R21c: same display-name vs canonical-slug mismatch as handleSelectProject.
    // The project arg from notification paths can carry a display string.
    const canonical = resolveCanonicalProject(project?.slug)
    const canonicalProjectSlug = canonical?.slug || project?.slug
    // Navigation reset: clear overlay state so user lands in the mission room clean.
    setSelectedMail(null)
    setShowSupportInbox(false)
    setActiveTool(null)
    // corner:notifications R2 — opening the mission room clears that mission's
    // notification dot (roomKey = full mission_slug "project:mission").
    setNotifReadAt(prev => ({ ...prev, [`${canonicalProjectSlug}:${mission.slug}`]: new Date().toISOString() }))
    if (cv6Mode && isDesktop) {
      // R62: desktop opens the in-page Chat tool on this mission room (stays in
      // home mode). On mobile the kit Home is full-screen with no in-page host, so
      // fall through to set conversationTarget and open the full-screen chat.
      setCv6ChatRequest({ kind: 'mission', slug: canonicalProjectSlug, missionSlug: mission.slug, name: mission.name || mission.slug, nonce: Date.now() })
      return
    }
    setSelectedAgent(null)
    setConversationTarget({
      name: mission.name || mission.slug,
      slug: canonicalProjectSlug,
      type: 'project',
      missionSlug: mission.slug,
      missionName: mission.name || mission.slug,
      missionPath: mission.path || `corner:${mission.slug}`,
    })
    setAttachedMission(null)
    setTab('chat')
    setUnreadChat(0)
    const basePath = surfaceBase()
    navigate(`${basePath}/project/${canonicalProjectSlug}?mission=${encodeURIComponent(mission.slug)}`)
  }, [navigate, resolveCanonicalProject, cv6Mode, isDesktop])

  // R78-p9b corner:new-projects — self-serve mission creation. The "New mission"
  // row in an expanded project triggers a name popup; on submit we scaffold the
  // mission and drop the user into its room, where the kickoff greeting waits.
  const handleCreateMission = useCallback(async (rawName, parentSlug, parentName) => {
    const name = (rawName || '').trim()
    if (!name || !worldId || !parentSlug) return
    const slug = slugify(name) || `mission-${Date.now().toString(36)}`
    setCreatingRoom(true)
    setCreateRoomError(null)
    try {
      const r = await authFetch('/api/dashboard/create-mission-from-drawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_slug: parentSlug, mission_slug: slug, name, client_id: worldId }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j && j.ok) {
        setNewRoomModal(null)
        handleSelectMission(
          { slug: j.mission_slug || slug, name: j.name || name },
          { slug: parentSlug, name: parentName || parentSlug }
        )
        // R78-p9c: refresh data pipe + missions-tree so the new mission appears immediately.
        refetchData && refetchData()
        setDrawerRefreshKey(k => k + 1)
      } else {
        setCreateRoomError((j && j.error) || 'Could not create the mission. Try again.')
      }
    } catch (e) {
      setCreateRoomError('Could not create the mission. Try again.')
    } finally {
      setCreatingRoom(false)
    }
  }, [worldId, handleSelectMission, refetchData])


  // corner:notifications R1 — a notification opens the ROOM its message lives
  // in, not the agent that sent it. Routes to the mission room when the item
  // carries a mission_slug, else the project room when it carries a project,
  // else the 1:1 agent thread. Then marks that room's notification read.
  const handleSelectNotification = useCallback((item) => {
    if (!item) return
    if (item.missionSlug) {
      // mission_slug is the full path "project:mission" (e.g. "corner:notifications").
      // handleSelectMission puts mission.slug in the URL as the bare slug and
      // rebuilds the path as `corner:<slug>`, so split off the project prefix.
      const colon = item.missionSlug.indexOf(':')
      const projectSlug = item.project || (colon > -1 ? item.missionSlug.slice(0, colon) : 'corner')
      const missionBare = colon > -1 ? item.missionSlug.slice(colon + 1) : item.missionSlug
      handleSelectMission(
        { slug: missionBare, name: missionBare, path: item.missionSlug },
        { slug: projectSlug, name: projectSlug }
      )
    } else if (item.project) {
      handleSelectProject({ slug: item.project, name: item.project })
    } else {
      const agent = (agents || []).find(a => a.slug === item.agent) || { slug: item.agent, name: item.agent }
      handleSelectAgent(agent)
    }
    const key = item.roomKey || item.agent
    if (key) setNotifReadAt(prev => ({ ...prev, [key]: new Date().toISOString() }))
  }, [agents, handleSelectMission, handleSelectProject, handleSelectAgent])

  // corner:notifications-catchup R2 — build the CatchupNotification[] from notifItems.
  // Maps useDataPipe inboxItems into the shape CatchupModal expects.
  //
  // corner:corner-ui-cv6 (Patrik 2026-06-20): Catch Up is NOT a feed of every update.
  // A card appears ONLY when the item BLOCKS Patrik or NEEDS his attention to move
  // forward. The test: does this stop until he acts? Everything else stays in the rooms
  // list and never becomes a Catch Up card. If nothing needs him, Catch Up is empty —
  // that is the win state, not a bug. (Round 1: conservative, real-signal filter on the
  // message itself. Round 2 wires a worker that flags needs_you + writes the summary /
  // drafted response, plus the email feeder. Full rule: corner/missions/corner-ui-cv6/
  // deliverables/catch-up-card-rule-2026-06-20.md)
  const needsPatrik = useCallback((item) => {
    const m = item.metadata || {}
    // explicit flags a worker / triage may set (Round 2 feeds these)
    if (m.needs_you === true || m.needs_input === true || m.blocker === true || m.blocked === true) return true
    if (m.catchup_priority === 'needs_you' || m.status === 'needs_you' || m.status === 'blocked') return true
    // real-text signal: a direct question or an explicit ask to Patrik. Conservative on
    // purpose — a plain status update ("shipped X", "new update") does NOT qualify.
    const t = (item.text || '').trim()
    if (/\?\s*$/.test(t)) return true
    return /\b(should i|shall i|which (one|option|do you)|can you|could you|would you|do you want|let me know|your call|your (input|sign[- ]?off|go[- ]?ahead|approval|decision)|need (your|you to)|waiting on (you|your)|please (confirm|approve|review|decide)|approve this|go ahead\b|option [ab]\b|ok(ay)? to)\b/i.test(t)
  }, [])

  const buildCatchupNotifications = useCallback((items) => {
    return (items || []).filter(needsPatrik).map(item => {
      // Resolve display name from agents list
      const agentObj = (agents || []).find(a => a.slug === item.agent)
      const senderName = agentObj?.name || item.agent || 'Agent'
      const initials = senderName.slice(0, 2).toUpperCase()

      // Prettify room name from roomKey ("corner:notifications-catchup" → "Notifications Catchup")
      const rawRoom = item.roomKey || item.agent || ''
      const roomName = rawRoom
        .replace(/^[^:]+:/, '') // strip "project:" prefix
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        || senderName

      // Relative time
      let timeAgo = ''
      try {
        const diff = Date.now() - new Date(item.timestamp).getTime()
        if (diff < 60000) timeAgo = 'just now'
        else if (diff < 3600000) timeAgo = `${Math.floor(diff / 60000)}m ago`
        else if (diff < 86400000) timeAgo = `${Math.floor(diff / 3600000)}h ago`
        else timeAgo = `${Math.floor(diff / 86400000)}d ago`
      } catch (_) { timeAgo = '' }

      // Suggested replies — only show when real suggestions exist.
      // Heuristic canned replies dropped (R3 direction, 2026-05-30):
      // all-canned chips feel worse than no chips at all.
      const suggestedReplies = []

      // R99 — the card already shows a Review affordance for attachments, so the
      // agent's inline "Attached file: <raw-hash-name>.md" line is redundant noise
      // that leaks an under-the-hood filename into the user's world. Strip just that
      // one pattern; leave all other message text untouched.
      const hasAttach = !!(item.metadata?.attachment || (item.metadata?.attachments && item.metadata.attachments.length))
      const cleanedPreview = ((item.text || '')
        .replace(/^\s*Attached(?:\s+file)?:\s*.+$/gim, '')
        .replace(/\n{2,}/g, '\n')
        .trim()) || (hasAttach ? 'Shared a file for you to review' : '')

      return {
        id: item.id,
        senderName,
        senderInitials: initials,
        senderType: 'agent',
        roomName,
        timeAgo,
        badgeType: 'message',
        messagePreview: cleanedPreview,
        suggestedReplies,
        // R5 — pass image attachments so the card can render them
        attachment: item.metadata?.attachment || null,
        attachments: item.metadata?.attachments || null,
        // raw timestamp + routing keys for fetchCatchupContext
        timestamp: item.timestamp,
        _agent: item.agent,
        _project: item.project || null,
        _missionSlug: item.missionSlug || null,
        _roomKey: item.roomKey || item.agent,
      }
    })
  }, [agents, needsPatrik])

  // corner:notifications-catchup R2 — reply handler: POST to supabase-messages + mark read
  const handleCatchupReply = useCallback(async (notif, replyText) => {
    if (!replyText || !notif) return
    try {
      const body = {
        agent: notif._agent,
        text: replyText,
        role: 'user',
        source: 'corner-dashboard',
        client_id: worldId,
        world_id: worldId,
        user_id: currentUser?.id || null,
        user_name: currentUser?.email || null,
      }
      if (notif._project) body.project = notif._project
      // corner:gemini-workers step 6 — carry the /cvg Gemini surface model so a
      // catch-up reply sent from /cvg runs on Gemini (the listener reads
      // metadata.model). Empty off /cvg -> room's Claude pref stands.
      const _sm = surfaceModel()
      if (notif._missionSlug || _sm) {
        body.metadata = {
          ...(notif._missionSlug ? { mission_slug: notif._missionSlug } : {}),
          ...(_sm ? { model: _sm } : {}),
        }
      }
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err) {
      console.error('[CatchupModal] reply failed', err)
    }
    // Mark the notification read
    const key = notif._roomKey || notif._agent
    if (key) setNotifReadAt(prev => ({ ...prev, [key]: new Date().toISOString() }))
  }, [worldId, currentUser, authFetch])

  // corner:notifications-catchup R2 — skip handler: just mark read
  const handleCatchupSkip = useCallback((notif) => {
    if (!notif) return
    const key = notif._roomKey || notif._agent
    if (key) setNotifReadAt(prev => ({ ...prev, [key]: new Date().toISOString() }))
  }, [])

  // corner:notifications-catchup R3 — "Open room" from a catchup card.
  // Closes the modal then routes into the correct room (mission > project > agent).
  const handleCatchupOpenRoom = useCallback((notif) => {
    if (!notif) return
    setCatchupOpen(false)
    if (notif._missionSlug && notif._project) {
      handleSelectMission(
        { slug: notif._missionSlug, name: notif.roomName },
        { slug: notif._project },
      )
    } else if (notif._project) {
      handleSelectProject({ slug: notif._project, name: notif.roomName })
    } else {
      const agentObj = (agents || []).find(a => a.slug === notif._agent)
      if (agentObj) handleSelectAgent(agentObj)
    }
  }, [handleSelectAgent, handleSelectProject, handleSelectMission, agents])

  // corner:notifications-catchup R3 — context fetcher.
  // For each unread notification the modal shows, look up the last 2
  // messages in the SAME room that landed BEFORE the unread one. That
  // gives the user enough thread context to remember what the agent is
  // replying to instead of seeing a one-liner cold.
  //
  // Routes through /api/dashboard/supabase-messages (server-side, service
  // role) instead of supabase-js directly. Reason: when Patrik switches
  // into a tenant world (e.g. karens-world) his JWT still scopes to his
  // home world via RLS, so a direct client-side query returns empty even
  // though the data exists. The server endpoint sees everything.
  //
  // Returns an array ordered oldest → newest (the endpoint already
  // reverses to chronological).
  const fetchCatchupContext = useCallback(async (notif) => {
    if (!notif || !worldId || !notif._agent) return []
    try {
      const params = new URLSearchParams()
      params.set('client', worldId)
      params.set('agent', notif._agent)
      if (notif._project) params.set('project', notif._project)
      if (notif._missionSlug) params.set('mission_slug', notif._missionSlug)
      if (notif.timestamp) params.set('before', notif.timestamp)
      params.set('limit', '10')
      const res = await authFetch(`/api/dashboard/supabase-messages?${params.toString()}`)
      if (!res.ok) return []
      const data = await res.json()
      const msgs = Array.isArray(data?.messages) ? data.messages : []
      // Endpoint already returns oldest → newest.
      return msgs.map(m => ({
        id: m.id,
        role: m.role || (m.user_name ? 'user' : 'agent'),
        text: m.text || '',
        timestamp: m.timestamp,
        senderName: m.user_name || m.agent || 'Agent',
        // R5 — pass image attachments through so context renders them
        attachment: m.metadata?.attachment || null,
        attachments: m.metadata?.attachments || null,
      }))
    } catch (e) {
      console.warn('[CatchupModal] context fetch failed', e)
      return []
    }
  }, [worldId, authFetch])

  // R6 corner:task-rooms — open the task room as a chat surface using the
  // existing ThreadView (same chat template as agent + project chats).
  // The task is encoded as a pseudo-agent with slug `task:<id>` — matches
  // the convention already used by api/dashboard/task-message.js and
  // scripts/sub-agent-reply.sh (both write messages with that agent value
  // and metadata.task_id). One template, zero data-path changes, the
  // chat surface "just works" for task rooms. Patrik's
  // feedback_chats_are_one_template.md doctrine holds.
  const handleSelectTask = useCallback((task) => {
    if (!task || !task.id) return
    // Navigation reset: clear overlay state so user lands in the task room clean.
    setSelectedMail(null)
    setActiveTool(null)
    const rawTitle = task.title || task.text || `Task ${String(task.id).slice(0, 8)}`
    setSelectedAgent({
      slug: `task:${task.id}`,
      name: rawTitle,
      isTaskRoom: true,
      taskId: task.id,
      taskStatus: task.status || null,
      taskClientId: task.client_id || task.clientId || null,
      taskProject: task.project || null,
    })
    setConversationTarget(null)
    setTab('chat')
    setUnreadChat(0)
    const basePath = surfaceBase()
    if (routeProjectId) navigate(basePath)
  }, [navigate, routeProjectId])

  // R10 (2026-05-25) — Mail moved to the left rail (LeftMailPanel).
  // handleSelectTool no longer auto-opens the right rail to Mail; the tool
  // routing stays for 'tasks' and any future tools. Mail-from-left-rail
  // simply pins emails via handleSelectMail.
  const handleSelectTool = useCallback((tool) => {
    setActiveTool(tool)
    if (tool !== 'mail') setSelectedMail(null)
  }, [])

  // corner:corner-ui-cv6 R17 — ONE tool-switch map shared by the Home menu, the
  // desktop Home tiles, and the mobile nav drawer. Every key lands on its real
  // wired surface (never the old CV4 tasks/files screen). Closes the nav drawer.
  const handleCv6Nav = useCallback((key) => {
    setNavOpen(false)
    setSelectedMail(null)
    if (key === 'home') { setActiveTool(null); setShowSupportInbox(false); setSelectedAgent(null); setConversationTarget(null); setTab('chat'); }
    else if (key === 'chat') { setShowSupportInbox(false); setSelectedAgent(null); setConversationTarget(null); setActiveTool('chat'); }
    else if (key === 'support') { setActiveTool(null); setShowSupportInbox(true); }
    else if (key === 'organize') { setShowSupportInbox(false); setActiveTool('organize'); }
    else if (key === 'command') { setShowSupportInbox(false); setActiveTool('command'); }
    else if (key === 'review') { setShowSupportInbox(false); setActiveTool('review'); }
    else if (key === 'tracker') { setShowSupportInbox(false); setActiveTool('tracker'); }
    else if (key === 'onboarding') { setShowSupportInbox(false); setActiveTool('onboarding'); }
    else if (key === 'settings' || key === 'profile') { setShowSupportInbox(false); setActiveTool('settings'); }
    else if (key === 'newproject') { setActiveTool(null); setShowSupportInbox(false); setNewRoomModal({ kind: 'project' }); }
    else if (key === 'scribe') { setShowSupportInbox(false); setSelectedAgent(null); setConversationTarget(null); setActiveTool('scribe'); }
    else if (key === 'search') { setSearchOpen(true); }
    else { setActiveTool(null); setShowSupportInbox(false); setSelectedAgent(null); setConversationTarget(null); setTab('chat'); }
  }, [telephone])

  // Called by LeftMailPanel / MailListPanel when the user clicks an email.
  // R15 (2026-05-25): also flip activeTool='mail' so the existing wiring
  // fires — MailChip renders above the composer, and useChatSend reads
  // selectedMail via activeTool==='mail' to prepend the email body +
  // attachments as Mail Room context on the next send to the EA.
  const handleSelectMail = useCallback((email) => {
    console.log('[MailRoom] handleSelectMail fired', email?.id, email?.subject)
    setSelectedMail(email)
    setActiveTool('mail')
  }, [])

  const handleBackFromMailRoom = useCallback(() => {
    setSelectedMail(null)
    setActiveTool(null)
  }, [])

  // Called by ChatPanel back button — clear conversation. R6: when the
  // user is backing out of a task room, return to the tasks tab instead of
  // dropping to the home view. The task list IS the room directory.
  const handleBackFromConversation = useCallback(() => {
    const wasTaskRoom = !!selectedAgent?.isTaskRoom
    // Record the project being left so it surfaces at the top of RECENTS on home
    if (conversationTarget?.slug && conversationTarget?.type === 'project') {
      try {
        const key = 'cv4_recent_visits:' + currentUser?.id
        const existing = JSON.parse(localStorage.getItem(key) || '{}')
        localStorage.setItem(key, JSON.stringify({ ...existing, [conversationTarget.slug]: Date.now() }))
      } catch (_) {}
    }
    setSelectedAgent(null)
    setConversationTarget(null)
    if (routeProjectId) {
      const basePath = surfaceBase()
      navigate(basePath)
    }
    if (wasTaskRoom) {
      setTab('tasks')
    }
  }, [navigate, routeProjectId, selectedAgent?.isTaskRoom, conversationTarget, currentUser?.id])

  // ── World switching ───────────────────────────────────────────────────────

  const handleEnterWorld = useCallback((world) => {
    setWorldOverride(world.world)
    setWorldId(world.world)
    authFetch(`/api/worlds/${world.world}/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})
    setSelectedAgent(null)
    setConversationTarget(null)
    prevDoneIdsRef.current = null
  }, [])

  const handleReturnToMyWorld = useCallback(() => {
    setWorldOverride(null)
    const myWorld = getUserWorld()
    setWorldId(myWorld)
    setSelectedAgent(null)
    setConversationTarget(null)
    prevDoneIdsRef.current = null
  }, [])

  // ── Input bar handlers ────────────────────────────────────────────────────

  const handleInputBarFocus = useCallback(() => {
    // If not already on chat view, open chat with last selected agent or rex
    if (tab !== 'chat') {
      const target = selectedAgent || agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea) || agents?.[0]
      if (target) {
        setSelectedAgent(target)
        setConversationTarget({ name: target.name, type: 'agent' })
      }
      setTab('chat')
      setUnreadChat(0)
    }
  }, [tab, selectedAgent, agents])

  // corner:support-desk M18 — "Chat about this email": jump from a Support card into
  // the EA chat with the email context posted as the opening message. The agent reads
  // the context block, the human discusses, the agent replies on the real email thread
  // via the mail tools (draft-first; nothing sends without a go-ahead).
  const handleDiscussSupportEmail = useCallback(async (text) => {
    const target = agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea) || selectedAgent || agents?.[0]
    if (!target) return
    setShowSupportInbox(false)
    setSelectedAgent(target)
    setConversationTarget({ name: target.name, type: 'agent' })
    setTab('chat')
    setUnreadChat(0)
    try {
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: target.slug, text, role: 'user', source: 'corner-dashboard',
          client_id: worldId, ...parentUserIdentity,
          // corner:gemini-workers step 6 — run the support "discuss" turn on the
          // /cvg Gemini surface (listener reads metadata.model). Empty off /cvg.
          ...(surfaceModel() ? { metadata: { model: surfaceModel() } } : {}),
        }),
      }).catch(() => null)
    } catch (e) { /* message lands via realtime when it persists */ }
  }, [agents, selectedAgent, worldId, parentUserIdentity])

  const handleInputBarSend = useCallback(async () => {
    const text = inputBarText.trim()
    if (!text || inputBarSending) return

    // Ensure we have an agent to send to
    const target = selectedAgent || agents?.find(a => a.is_ea && a.is_terminal) || agents?.find(a => a.is_ea) || agents?.[0]
    if (!target) return

    // Switch to chat tab if not already there
    if (tab !== 'chat') {
      setSelectedAgent(target)
      setConversationTarget({ name: target.name, type: 'agent' })
      setTab('chat')
      setUnreadChat(0)
    }

    setInputBarText('')
    setInputBarSending(true)

    // R5: dropped the parallel haiku-chat fetch. User message persists via
    // supabase-messages, listener routes to Elon's tmux, his reply arrives
    // via the cv3-thread realtime subscription in ChatPanel.
    try {
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: target.slug,
          text,
          role: 'user',
          source: 'corner-dashboard',
          client_id: worldId,
          ...parentUserIdentity,
        }),
      }).catch(() => null)
    } catch (e) {
      // silent fail -- message already persisted optimistically by ChatPanel
    } finally {
      setInputBarSending(false)
    }
  }, [inputBarText, inputBarSending, selectedAgent, agents, tab, worldId])

  // Command Deck reply-to-room (ported from CornerV4). Routes a deck reply to
  // the right room: project:mission via chat-bridge, plain agent via supabase-messages.
  const postReplyToRoom = useCallback(async (roomSlug, text) => {
    const t = (text || '').trim()
    if (!roomSlug || !t) return { ok: false }
    try {
      const parts = roomSlug.split(':')
      if (parts.length > 1) {
        const mission = parts[parts.length - 1]
        const projSlug = parts[parts.length - 2]
        const projectObj = (projectRooms || []).find(p => p?.slug === projSlug) || { slug: projSlug }
        const agentKey = getProjectEA(projectObj, agents) || 'elon'
        const clientId = projectObj.isShared ? `shared:${projSlug}` : worldId
        const res = await authFetch('/api/dashboard/chat-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agentKey, message: t, room: `project:${projSlug}`, project: projSlug, mission,
            client_id: clientId, user_id: currentUser?.id || null, user_name: currentUser?.email || null,
            metadata: { mission_slug: mission, command_deck_reply: true },
          }),
        })
        return { ok: res.ok }
      }
      const res = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: roomSlug, text: t, role: 'user', source: 'command-deck',
          client_id: worldId, world_id: worldId, user_id: currentUser?.id || null,
          user_name: currentUser?.email || null, metadata: { command_deck_reply: true },
        }),
      })
      return { ok: res.ok }
    } catch (err) {
      console.error('[CommandDeck] reply failed', err)
      return { ok: false }
    }
  }, [agents, projectRooms, worldId, currentUser])

  // Real send for the CV6 Chat tool on /cvg. Routes by room kind and ALWAYS
  // carries the Gemini surface model (surfaceModel()) so /cvg turns run on the
  // Gemini lane — keeps billing separate from the Claude /dashboard.
  const handleCvgChatSend = useCallback(async (sel, text) => {
    const t = (text || '').trim()
    if (!sel || !t) return
    const sm = surfaceModel()
    try {
      if (sel.type === 'project') {
        const projectObj = (projectRooms || []).find(p => p?.slug === sel.slug) || { slug: sel.slug }
        const agentKey = getProjectEA(projectObj, agents) || 'elon'
        const clientId = projectObj.isShared ? `shared:${sel.slug}` : worldId
        await authFetch('/api/dashboard/chat-bridge', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agentKey, message: t, room: `project:${sel.slug}`, project: sel.slug,
            client_id: clientId, user_id: currentUser?.id || null, user_name: currentUser?.email || null,
            metadata: { source: 'cvg-chat-tool', ...(sel.missionSlug ? { mission_slug: sel.missionSlug } : {}), ...(sm ? { model: sm } : {}) },
          }),
        })
      } else {
        await authFetch('/api/dashboard/supabase-messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: sel.slug, text: t, role: 'user', source: 'cvg-chat-tool',
            client_id: worldId, world_id: worldId, user_id: currentUser?.id || null,
            user_name: currentUser?.email || null,
            ...(sm ? { metadata: { model: sm } } : {}),
          }),
        })
      }
    } catch (err) {
      console.error('[cvg chat-tool send] failed', err)
      throw err
    }
  }, [agents, projectRooms, worldId, currentUser])

  // ── Nav heights ───────────────────────────────────────────────────────────

  const ROW1_H = 44
  const ROW2_H = 36
  const NAV_H  = ROW1_H + ROW2_H

  // ── Memoized provider values for CornerContext ───────────────────────────
  // Sliced by update cadence so consumers don't re-render on unrelated changes.
  // Auth: stable across the session (login + world switch). Data: realtime
  // pipes. Nav: per-click selection + composer prefill.
  //
  // R4d audit (2026-04-19): verified slices are truly independent. All
  // non-state deps are stable: showToast is useCallback([]), handle*/refresh*/
  // addOptimisticTask are useCallback, *Ref values are useRef. So auth value
  // identity only bumps on login/world switch, data only on pipe updates, nav
  // only on nav clicks / prefill. No cascades observed.
  const authValue = useMemo(() => ({
    currentUser, setCurrentUser,
    worldId,
    showToast,
  }), [currentUser, worldId, showToast])

  const dataValue = useMemo(() => ({
    agents, inboxItems, projectRooms,
    queued, rightNow, waiting, done, allTasks,
    refreshTasks, addOptimisticTask,
    currentUserSlug, personalTodos,
  }), [agents, inboxItems, projectRooms, queued, rightNow, waiting, done, allTasks, refreshTasks, addOptimisticTask, currentUserSlug, personalTodos])

  // R-home-screen R4 hotfix: replace ChatPanel's CV3 ConversationsView
  // fallback with our brutalist HomeView. ChatPanel reads cv4HomeView from
  // the nav context — when set, it renders that instead of the legacy
  // ConversationsView whenever there's no selectedAgent + no projectId.
  // Kills the "old home view flashes / leaks under mail" regression.
  const cv4HomeView = useMemo(() => (
    <HomeView
      user={currentUser}
      worldId={worldId}
      agents={agents}
      projectRooms={projectRooms}
      needsYou={homeNeedsYou}
      onSelectAgent={(agent) => {
        setSelectedAgent(agent)
        setConversationTarget({ name: agent.name, type: 'agent' })
      }}
      onSelectProject={(proj, mission) => {
        if (mission && mission.slug) {
          handleSelectMission(mission, proj)
        } else {
          handleSelectProject(proj)
        }
      }}
    />
  ), [currentUser, agents, projectRooms, handleSelectMission, handleSelectProject, worldId, homeNeedsYou])

  const navValue = useMemo(() => ({
    tab, setTab, handleTabChange,
    selectedAgent, conversationTarget,
    handleSelectAgent, handleSelectProject, handleSelectMission, handleSelectTask, handleBackFromConversation,
    prefillMessage, setPrefillMessage,
    attachedMission, setAttachedMission,
    activeTool, selectedMail, setSelectedMail,
    stageFilesRef,
    cv4HomeView,
  }), [tab, handleTabChange, selectedAgent, conversationTarget, handleSelectAgent, handleSelectProject, handleSelectMission, handleSelectTask, handleBackFromConversation, prefillMessage, attachedMission, activeTool, selectedMail, stageFilesRef, cv4HomeView])

  // ── Render ────────────────────────────────────────────────────────────────

  // Wait for auth to resolve AND world to be set before rendering
  // This prevents hooks from fetching with the wrong client_id (e.g. 'aom' default)
  // ISOLATION FIX 2026-05-24: Also check worldId to prevent cross-tenant leak during load
  if (!authReady || !worldId || (!!supabase && !currentUser && typeof window !== 'undefined')) {
    return (
      <div style={{ width: '100%', height: '100dvh', background: '#060A14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Hanken Grotesk', sans-serif" }}>
        <style>{`@keyframes cvLoaderBar { 0% { width: 0%; } 100% { width: 100%; } } @keyframes cvSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 32, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.03em', marginBottom: 32 }}>
          Corner<span style={{ color: '#10B981' }}>.</span>
        </div>
        <div style={{ width: 200, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: 2, animation: 'cvLoaderBar 2s ease-in-out infinite' }} />
        </div>
        <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Loading your workspace...</div>
      </div>
    )
  }

  // corner-ui-cv4 R22: wave background shows only in chat mode — home,
  // support inbox, routines board, and mail room stay clean. The same flag
  // turns on the frosted message panel so text reads over the wave.
  const chatWaveActive = !showSupportInbox && activeTool !== 'routines' && !selectedMail && !isHomeMode && (isDesktop || tab !== 'tasks')

  return (
    <CornerAuthProvider value={authValue}>
      <CornerDataProvider value={dataValue}>
        <CornerNavProvider value={navValue}>
          <LiveCallProvider>
    <div data-testid="dashboard-home-root" data-cv6 data-shell="cv4" data-theme={effectiveTheme} style={{
      width: '100%',
      // 100vh fallback; the @supports rule below upgrades to 100svh which
      // tracks the SMALL viewport (URL bar visible). 100dvh was overshooting
      // on iOS Safari and creating ~200px of empty space below the composer.
      height: '100vh',
      // cv6: shell ground = cv6-ground so no cv5 beige peeks around the home
      // (matches the /cv6 gallery's seamless ground in both themes).
      background: cv6Mode ? 'var(--cv6-ground)' : C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Hanken Grotesk', sans-serif",
    }}>
      {/* Glass theme (3rd mode): the backdrop behind the frosted UI. The toggle
          steps glassIndex; it holds (no auto-drift). Only mounted in glass mode. */}
      {effectiveTheme === 'glass' && <GlassBackdrop index={backdropIndex} />}
      {/* corner:corner-ui-cv6 — web-to-app nudge (self-gates: hidden when standalone
          or dismissed) + the notifications permission ask (opened from Settings). */}
      <AddToHomePrompt />
      <NotificationPrompt
        open={notifPromptOpen}
        isDesktop={isDesktop}
        onAllow={() => setNotifPromptOpen(false)}
        onDismiss={() => setNotifPromptOpen(false)}
      />
      {/* corner:corner-ui-cv6 R-WIRE — Global Search palette (⌘K). Real results: Rooms ←
          your agents + projects (instant client filter); Files ← /api/dashboard/file-search.
          Esc / click-out / select closes. Selecting a room opens it; a file routes to its room. */}
      {searchOpen && (
        <SearchLive
          worldId={worldId}
          agents={agents}
          projectRooms={projectRooms}
          isDesktop={isDesktop}
          onClose={() => setSearchOpen(false)}
          onSelectAgent={(a) => { setSearchOpen(false); if (a) handleSelectAgent(a) }}
          onSelectProject={(p) => { setSearchOpen(false); if (p) handleSelectProject(p) }}
          onNav={handleCv6Nav}
          user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
        />
      )}
      {/* R5.1 CV4 scoped styles. Everything keyed to [data-shell="cv4"] so the
          shared cv3/ components stay unchanged on /dashboard. */}
      <style>{`
        /* R6.5: viewport sizing — upgrade fallback 100vh to 100svh on browsers
           that support it. svh matches the smallest visible viewport (URL bar
           up) so the composer never gets pushed below the visible area on
           iOS Safari. dvh was overshooting and producing a ~200px bottom gap
           on tablet/mobile. */
        @supports (height: 100svh) {
          [data-shell="cv4"] { height: 100svh !important; }
        }
        /* R198: in the INSTALLED PWA (no browser URL bar) svh undershoots and
           leaves a ~50-100px dead band below the tab bar on iPhone. There the
           dynamic viewport equals the full screen, so fill it. Safari keeps svh. */
        @media all and (display-mode: standalone) {
          [data-shell="cv4"] { height: 100dvh !important; }
        }
        [data-shell="cv4"] [data-role="composer-actions"] { order: -1; margin-right: 4px; }
        [data-shell="cv4"] [data-role="thread-header"] { display: none !important; }
        /* R7.18: Project chats were leaking the cv3 ProjectChatHeader on top of
           ContextNav. Hide it — ContextNav already shows the room name and
           switcher, and the action icons (mic, files, settings, search) move
           into the composer menus. */
        [data-shell="cv4"] [data-testid="project-chat-header"] { display: none !important; }
        /* R6.6: message typography — proper prose. Beats the inline 14px /
           lh 1.6 / #E2E8F0 styling that MessageList passes into
           ChatMessageRenderer's .cmr-content (inline → has to be !important).
           Targets every nested element so paragraph rhythm, list spacing,
           and color all read like long-form copy instead of SMS. */
        [data-shell="cv4"] [data-bubble],
        [data-shell="cv4"] [data-bubble] .chat-message-container,
        [data-shell="cv4"] [data-bubble] .cmr-content,
        [data-shell="cv4"] [data-bubble] .message-content {
          font-size: 15.5px !important;
          line-height: 1.72 !important;
          letter-spacing: 0.005em !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-weight: 400 !important;
        }
        [data-shell="cv4"] [data-bubble] { max-width: 64ch; }
        [data-shell="cv4"] [data-bubble="assistant"],
        [data-shell="cv4"] [data-bubble="assistant"] .cmr-content,
        [data-shell="cv4"] [data-bubble="assistant"] .message-content {
          color: #B6C2D1 !important;
        }
        [data-shell="cv4"] [data-bubble="user"],
        [data-shell="cv4"] [data-bubble="user"] .cmr-content,
        [data-shell="cv4"] [data-bubble="user"] .message-content {
          color: #DCE3ED !important;
        }
        /* Paragraph rhythm — generous bottom margin for prose, zero on tail. */
        [data-shell="cv4"] [data-bubble] .cmr-content p,
        [data-shell="cv4"] [data-bubble] .message-content p {
          margin: 0 0 0.95em 0 !important;
          line-height: 1.72 !important;
        }
        [data-shell="cv4"] [data-bubble] .cmr-content p:last-child,
        [data-shell="cv4"] [data-bubble] .message-content p:last-child { margin-bottom: 0 !important; }
        /* Lists — denser internally than prose so they don't feel airy,
           but with proper margin around the block. */
        [data-shell="cv4"] [data-bubble] .cmr-content ul,
        [data-shell="cv4"] [data-bubble] .cmr-content ol,
        [data-shell="cv4"] [data-bubble] .message-content ul,
        [data-shell="cv4"] [data-bubble] .message-content ol {
          margin: 0.3em 0 1em 0 !important;
          padding-left: 1.4em !important;
        }
        [data-shell="cv4"] [data-bubble] .cmr-content li,
        [data-shell="cv4"] [data-bubble] .message-content li {
          margin: 0 0 0.45em 0 !important;
          line-height: 1.6 !important;
        }
        /* Headings — quiet, not loud. Same weight, just larger + breathing. */
        [data-shell="cv4"] [data-bubble] .cmr-content h1,
        [data-shell="cv4"] [data-bubble] .cmr-content h2,
        [data-shell="cv4"] [data-bubble] .cmr-content h3,
        [data-shell="cv4"] [data-bubble] .message-content h1,
        [data-shell="cv4"] [data-bubble] .message-content h2,
        [data-shell="cv4"] [data-bubble] .message-content h3 {
          font-size: 1.06em !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          margin: 1.2em 0 0.4em 0 !important;
          letter-spacing: -0.005em !important;
          color: #D6DEEA !important;
        }
        /* Bold without being shouty. */
        [data-shell="cv4"] [data-bubble] .cmr-content strong,
        [data-shell="cv4"] [data-bubble] .message-content strong {
          font-weight: 600 !important;
          color: #D6DEEA !important;
        }
        /* Inline code: subtle chip, monospace. */
        [data-shell="cv4"] [data-bubble] .cmr-content code,
        [data-shell="cv4"] [data-bubble] .message-content code {
          font-size: 0.88em !important;
          padding: 1px 6px !important;
          background: rgba(255,255,255,0.045) !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          border-radius: 4px !important;
          color: #CBD5E1 !important;
        }
        /* Links — calm blue, not Twitter-blue. */
        [data-shell="cv4"] [data-bubble] .cmr-content a,
        [data-shell="cv4"] [data-bubble] .message-content a {
          color: #7DD3FC !important;
          text-decoration-color: rgba(125,211,252,0.35) !important;
          text-underline-offset: 3px !important;
        }
        /* Light-theme overrides — bubble prose, hash IDs, inline code,
           and links were all pinned to slate/sky colors that wash out
           on the cream paper background. Switch to dark navy
           (Tailwind blue-900/800) so contrast hits WCAG AA. Same
           specificity as the dark rules above, declared later, so
           data-theme="light" wins via source order. */
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content p,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content p,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content li,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content li,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content strong,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content strong,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content h1,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content h2,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content h3,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content h1,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content h2,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content h3 {
          color: #1A1F2C !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content code,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content code {
          background: rgba(26,31,44,0.06) !important;
          border: 1px solid rgba(26,31,44,0.10) !important;
          color: #1E3A8A !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble] .cmr-content a,
        [data-shell="cv4"][data-theme="light"] [data-bubble] .message-content a {
          color: #1E40AF !important;
          text-decoration-color: rgba(30,64,175,0.35) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble="user"] {
          background: rgba(26,31,44,0.05) !important;
          border-color: rgba(26,31,44,0.10) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble="assistant"] {
          border-left-color: rgba(26,31,44,0.10) !important;
        }
        /* Hide bubble chrome a bit — the prose IS the thing. */
        [data-shell="cv4"] [data-bubble="assistant"] {
          background: transparent !important;
          padding-left: 0 !important;
        }

        /* ── R7.1: blend the drawers + chat into one continuous surface ────
           Soften the dividers between left drawer, chat, right tasks drawer
           so the eye reads them as one plane, not three separate boxes. */
        [data-shell="cv4"] [data-cv4-drawer-docked="true"] {
          border-right-color: rgba(255,255,255,0.04) !important;
        }
        [data-shell="cv4"] [data-cv4-tasks-drawer] {
          border-left-color: rgba(255,255,255,0.04) !important;
        }
        /* Chat column max-width handled inline via [data-cv4-content-inner]. */

        /* ── R7.2: scrollbar styling — thin, dim, only when scrolling. The
           chat scroll on the right edge was reading as distracting chrome. */
        [data-shell="cv4"] *::-webkit-scrollbar { width: 6px; height: 6px; }
        [data-shell="cv4"] *::-webkit-scrollbar-track { background: transparent; }
        [data-shell="cv4"] *::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 0;
        }
        [data-shell="cv4"] *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        [data-shell="cv4"] * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }

        /* ── R7.4: composer + chat area pick up the drawer aesthetic.
           Sharp 2px corners on the pill, hairline borders, square action
           buttons. The composer reads as a flat extension of the drawer
           palette instead of a rounded floating SMS pill. */
        [data-shell="cv4"] [data-testid="thread-chat-input"],
        [data-shell="cv4"] [data-testid="project-chat-input"] {
          font-family: 'Hanken Grotesk', sans-serif !important;
        }
        /* The pill = parent of the input + composer-actions row.
           Match by structure: any element that directly contains
           [data-role="composer-actions"] and has a borderRadius set. */
        [data-shell="cv4"] *:has(> [data-role="composer-actions"]) {
          border-radius: 2px !important;
          border-width: 1px !important;
          background: rgba(255,255,255,0.02) !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        [data-shell="cv4"] *:has(> [data-role="composer-actions"]):focus-within {
          border-color: rgba(255,255,255,0.18) !important;
          background: rgba(255,255,255,0.03) !important;
        }
        /* All round composer-action buttons → square. Mic + send become 2px. */
        [data-shell="cv4"] [data-role="composer-actions"] > button,
        [data-shell="cv4"] [data-role="composer-actions"] ~ button,
        [data-shell="cv4"] [data-role="composer-actions"] + button {
          border-radius: 4px !important;
        }
        /* User bubble (right side) — calm, drawer-toned chip instead of
           heavy accent. The text is already #DCE3ED from R6.6; the bg now
           reads as part of the panel surface. */
        [data-shell="cv4"] [data-bubble="user"] {
          background: rgba(255,255,255,0.035) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 2px !important;
          padding: 10px 14px !important;
          filter: none !important;
        }
        /* Assistant — already transparent (R6.4); add a faint left-rule so
           the column reads as structured prose. */
        [data-shell="cv4"] [data-bubble="assistant"] {
          padding-left: 12px !important;
          border-left: 1px solid rgba(255,255,255,0.06) !important;
        }
        /* Soften the centered chat content's outer border (the seam between
           chat and the right tasks drawer). */
        [data-shell="cv4"] [data-cv4-content-col] { background: transparent; }
        /* The composer's outer container (sticky bottom strip). Match the
           drawer bg so it reads as one continuous surface, not a banner. */
        [data-shell="cv4"] [data-testid="thread-chat-input"],
        [data-shell="cv4"] [data-testid="project-chat-input"] {
          background: transparent !important;
        }

        /* ── R7: TASK VIEW BRUTALIST OVERHAUL ─────────────────────────────────
           Sharp rectangles, monospace screaming caps for section headers,
           hard borders, tighter rows. Targets TasksPanel via its existing
           data-testid markers so we don't have to rewrite the component tree. */
        [data-shell="cv4"] h2[data-testid="task-column-header"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 26px !important;
          font-weight: 800 !important;
          letter-spacing: 0.02em !important;
          text-transform: uppercase !important;
          color: #F1F5F9 !important;
          line-height: 1 !important;
          padding-bottom: 10px !important;
          border-bottom: 2px solid rgba(255,255,255,0.08) !important;
          width: 100% !important;
        }
        [data-shell="cv4"] h2[data-testid="task-column-header"] + span {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          padding: 2px 8px !important;
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
        }
        /* Section spacing — tighter. */
        [data-shell="cv4"] [data-testid="task-column-header"] {
          margin-bottom: 14px !important;
        }
        /* Task cards — square, hard borders, denser. */
        [data-shell="cv4"] [data-testid="task-card"] {
          border-radius: 2px !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          padding: 12px 14px !important;
          margin-bottom: 6px !important;
          background: rgba(255,255,255,0.015) !important;
          transition: border-color 0.12s, background 0.12s !important;
        }
        [data-shell="cv4"] [data-testid="task-card"]:hover {
          border-color: rgba(255,255,255,0.18) !important;
          background: rgba(255,255,255,0.03) !important;
        }
        /* Project filter pills — square chips, monospace, tighter. */
        [data-shell="cv4"] button[data-testid^="project-pill-"] {
          border-radius: 2px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.04em !important;
          text-transform: uppercase !important;
          padding: 5px 10px !important;
          border-width: 1px !important;
        }
        /* Search input — square, hairline border. */
        [data-shell="cv4"] [data-testid="tasks-search"],
        [data-shell="cv4"] input[placeholder="Search tasks..."] {
          border-radius: 0 !important;
        }
        /* The search shell wrapping the input. */
        [data-shell="cv4"] input[placeholder="Search tasks..."]:focus {
          outline: 1px solid rgba(255,255,255,0.2) !important;
        }
        /* Generic: kill the soft rounded look on common task chrome. */
        [data-shell="cv4"] [data-testid="task-card"] > div {
          border-radius: 0 !important;
        }

        /* CV4 shows a single compaction/context meter — hide the second
           floppy-disk-ish storage meter that lived alongside it. */
        [data-shell="cv4"] [data-testid="storage-quota-meter"] {
          display: none !important;
        }

        /* R7.13 — Commands menu + Notifications panel match the CV4 drawer
           aesthetic: sharp corners, hairline borders, drawer-toned surface.
           R7.16 — dark theme background flipped from the navy-tinted C.s1
           to the same near-black surface the drawers use (no blue cast). */
        [data-shell="cv4"] [data-testid="cv4-commands-menu-popover"],
        [data-shell="cv4"] [data-cv4-notifications],
        [data-shell="cv4"] [data-cv4-switcher-popover],
        [data-shell="cv4"] [data-cv4-profile-popover] {
          background: #0B1018 !important;
          border-radius: 2px !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,0.55) !important;
        }
        [data-shell="cv4"] [data-testid="cv4-commands-menu-popover"] button,
        [data-shell="cv4"] [data-cv4-notifications] button,
        [data-shell="cv4"] [data-cv4-switcher-popover] button,
        [data-shell="cv4"] [data-cv4-profile-popover] button {
          border-radius: 2px !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="cv4-commands-menu-popover"],
        [data-shell="cv4"][data-theme="light"] [data-cv4-notifications],
        [data-shell="cv4"][data-theme="light"] [data-cv4-switcher-popover],
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] {
          background: #F4EFE3 !important;
          border: 1px solid rgba(0,0,0,0.10) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important;
        }

        /* R7.18 — Mobile long-press action sheet (MobileActionSheet) themed
           to match CV4. Portal renders to document.body so we mirror the
           shell/theme attributes onto <html> and target via :root. Sharp
           corners, hairline borders, drawer-toned surface. */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] {
          background: #0B1018 !important;
          border-top: 1px solid rgba(255,255,255,0.10) !important;
          border-left: 1px solid rgba(255,255,255,0.10) !important;
          border-right: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 2px 2px 0 0 !important;
          box-shadow: 0 -12px 32px rgba(0,0,0,0.55) !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] {
          background: #F4EFE3 !important;
          border-top: 1px solid rgba(0,0,0,0.10) !important;
          border-left: 1px solid rgba(0,0,0,0.10) !important;
          border-right: 1px solid rgba(0,0,0,0.10) !important;
          box-shadow: 0 -12px 32px rgba(0,0,0,0.18) !important;
          color: #2A2620 !important;
        }
        /* Drag handle — neutralize */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] > div:first-child {
          background: rgba(255,255,255,0.16) !important;
          border-radius: 1px !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] > div:first-child {
          background: rgba(0,0,0,0.16) !important;
        }
        /* Message preview chip — square + hairline */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] > div:nth-child(2) {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 2px !important;
          color: rgba(226,232,240,0.65) !important;
          font-family: 'Hanken Grotesk', sans-serif !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] > div:nth-child(2) {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          color: rgba(42,38,32,0.65) !important;
        }
        /* Action rows — flat, sharp, mono-caps */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] button[data-test-id^="sheet-"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
          color: #E2E8F0 !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] button[data-test-id^="sheet-"] {
          color: #2A2620 !important;
        }
        /* Action icon — theme accent (green), not blue */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] button[data-test-id^="sheet-"] > span:first-child {
          color: #10B981 !important;
        }
        /* Cancel button — sharp + hairline + neutral */
        :root[data-shell="cv4"] [data-cv4-mobile-sheet] > button:last-child {
          background: transparent !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 2px !important;
          color: rgba(226,232,240,0.75) !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
        }
        :root[data-shell="cv4"][data-theme="light"] [data-cv4-mobile-sheet] > button:last-child {
          border: 1px solid rgba(0,0,0,0.16) !important;
          color: rgba(42,38,32,0.80) !important;
        }

        /* R7.19 — Profile menu becomes a CENTER-SCREEN HOME BASE MODAL in CV4.
           Activates the backdrop (default invisible in CV3) and re-positions
           the popover from the top-right dropdown into a centered command
           panel. Wider (380px), more padding, sharper chrome. */
        [data-shell="cv4"] [data-cv4-profile-backdrop] {
          pointer-events: auto !important;
          opacity: 1 !important;
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-backdrop] {
          background: rgba(20,18,14,0.45) !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          right: auto !important;
          transform: translate(-50%, -50%) !important;
          width: min(400px, 92vw) !important;
          padding: 28px 24px !important;
          max-height: 92vh !important;
          overflow-y: auto !important;
        }
        /* Avatar tile + display-name input + sign-out button — all sharp */
        [data-shell="cv4"] [data-cv4-profile-popover] input,
        [data-shell="cv4"] [data-cv4-profile-popover] > div > div:first-child,
        [data-shell="cv4"] [data-cv4-profile-popover] > div > div:first-child > div {
          border-radius: 2px !important;
        }
        /* Display-name input — flatter chrome */
        [data-shell="cv4"] [data-cv4-profile-popover] input {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          font-family: 'Hanken Grotesk', sans-serif !important;
          color: ${C.text} !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] input {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.10) !important;
          color: #2A2620 !important;
        }
        /* DISPLAY NAME label — mono caps to match Settings/Commands footer */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:nth-child(2) {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
        }
        /* Save button — sharp, theme-aware, no rounded blue blob */
        [data-shell="cv4"] [data-cv4-profile-popover] > button {
          border-radius: 2px !important;
          font-family: 'Hanken Grotesk', sans-serif !important;
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: ${C.text} !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] > button:not(:disabled):hover {
          background: rgba(255,255,255,0.14) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > button {
          background: rgba(0,0,0,0.05) !important;
          border: 1px solid rgba(0,0,0,0.12) !important;
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > button:not(:disabled):hover {
          background: rgba(0,0,0,0.10) !important;
        }
        /* Sign-out section divider + button */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child {
          border-top: 1px solid rgba(255,255,255,0.08) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > div:last-child {
          border-top: 1px solid rgba(0,0,0,0.08) !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child > button {
          border-radius: 2px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
          background: transparent !important;
          border: 1px solid rgba(239,68,68,0.35) !important;
          color: #F87171 !important;
        }
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child > button:hover {
          background: rgba(239,68,68,0.08) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-profile-popover] > div:last-child > button {
          border: 1px solid rgba(190,40,40,0.45) !important;
          color: #B91C1C !important;
        }
        /* Email row inside sign-out section */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:last-child > div:first-child {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          letter-spacing: 0.02em !important;
        }
        /* Avatar tile — square it off (was 12px rounded) */
        [data-shell="cv4"] [data-cv4-profile-popover] > div:first-child > div:first-child {
          border-radius: 2px !important;
        }

        /* Brief viewer in CV4 — sharp corners on internal chrome. */
        [data-shell="cv4"] [data-cv4-brief-viewer] .briefing-summary-body h1,
        [data-shell="cv4"] [data-cv4-brief-viewer] .briefing-summary-body h2,
        [data-shell="cv4"] [data-cv4-brief-viewer] .briefing-summary-body h3 {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
        }

        /* R7.20 — Settings overlay always renders as a sleek CENTERED MODAL
           in CV4, on any screen size. Drops the data-mobile=true full-screen
           takeover and the data-mobile=false desktop-only flow. Sidebar on
           top (horizontal tabs) + content below, all bounded inside a 92vw
           card. Black backdrop in dark theme, warm paper backdrop in light. */
        [data-shell="cv4"] [data-testid="project-settings-overlay"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] {
          font-family: 'Hanken Grotesk', sans-serif !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 4vh 12px !important;
          gap: 0 !important;
        }
        /* Top strip / sidebar — now uniformly a horizontal tab strip header */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:first-child,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:first-child {
          border-radius: 2px 2px 0 0 !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-bottom: 1px solid rgba(255,255,255,0.10) !important;
          width: min(560px, calc(100vw - 24px)) !important;
          height: auto !important;
          align-self: center !important;
          background: #0B1018 !important;
        }
        /* Content pane — capped width/height, scrolls internally */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:nth-child(2),
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:nth-child(2) {
          border-radius: 0 0 2px 2px !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-top: none !important;
          width: min(560px, calc(100vw - 24px)) !important;
          max-width: calc(100vw - 24px) !important;
          max-height: 70vh !important;
          height: auto !important;
          overflow: auto !important;
          align-self: center !important;
          padding: 16px 18px !important;
          background: #0B1018 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] > div:first-child,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] > div:first-child,
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] > div:nth-child(2),
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] > div:nth-child(2) {
          background: #F4EFE3 !important;
          border-color: rgba(0,0,0,0.10) !important;
        }
        /* Inner content: kill any wider inline padding/widths */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:nth-child(2) > *,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:nth-child(2) > * {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        /* Inputs span the pane width (so Remove button has room beside) */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] textarea,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] textarea {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        /* Backdrop on mobile variant was a solid surface — make it a dim
           overlay so the modal floats. */
        [data-shell="cv4"] [data-testid="project-settings-overlay"][data-mobile="true"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"][data-mobile="true"] {
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"][data-mobile="true"],
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"][data-mobile="true"] {
          background: rgba(20,18,14,0.45) !important;
        }
        /* Tabs strip — horizontal on every viewport now */
        [data-shell="cv4"] [data-testid="thread-settings-tabs"],
        [data-shell="cv4"] [data-testid="project-settings-tabs"] {
          flex-direction: row !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* R7.20 — About-agent overlay (AgentProfileOverlay) themed to match
           the settings modal: centered card in dimmed backdrop, sharp 2px
           corners, hairline borders, brutalist surface. The cv3 component
           uses position:absolute;inset:0 so the panel covers ChatPanel only.
           We re-cast it as a centered modal over the whole viewport. */
        [data-shell="cv4"] [data-testid="agent-profile-overlay"] {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
          z-index: 9990 !important;
          padding: 5vh 12px !important;
          align-items: center !important;
          justify-content: center !important;
          flex-direction: column !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-overlay"] {
          background: rgba(20,18,14,0.45) !important;
        }
        /* Header strip becomes the modal card top */
        [data-shell="cv4"] [data-testid="agent-profile-overlay"] > div:first-child {
          border-radius: 2px 2px 0 0 !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-bottom: none !important;
          background: #0B1018 !important;
          width: min(560px, calc(100vw - 24px)) !important;
          align-self: center !important;
        }
        /* Body becomes the modal card content */
        [data-shell="cv4"] [data-testid="agent-profile-overlay"] > div:nth-child(2) {
          border-radius: 0 0 2px 2px !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          background: #0B1018 !important;
          width: min(560px, calc(100vw - 24px)) !important;
          max-height: 70vh !important;
          overflow: auto !important;
          align-self: center !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-overlay"] > div:first-child,
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-overlay"] > div:nth-child(2) {
          background: #F4EFE3 !important;
          border-color: rgba(0,0,0,0.10) !important;
        }
        /* Close button — sharp + neutral, not blue circle */
        [data-shell="cv4"] [data-testid="agent-profile-close"] {
          border-radius: 2px !important;
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="agent-profile-close"] {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.12) !important;
        }
        /* Tame the giant in-pane headings (e.g. "MY KEYS") — they're
           competing with the small "Keys" tab title above. The cv3 source
           uses styled <div>s, not <h*>, so we ALSO target divs that
           inline-styled themselves into a heading via uppercase+bold+large.
           Match by inline style substring (React serializes inline style
           verbatim, including the kebab-cased declaration string). */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] h1,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] h2,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] h3,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] h1,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] h2,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] h3,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 26"],
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 24"],
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 22"],
        [data-shell="cv4"] [data-testid="project-settings-overlay"] div[style*="font-size: 20"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 26"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 24"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 22"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] div[style*="font-size: 20"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
          margin: 4px 0 10px !important;
          color: rgba(255,255,255,0.55) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] h1,
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] h2,
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"] h3,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] h1,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] h2,
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"] h3 {
          color: rgba(42,38,32,0.65) !important;
        }
        /* (legacy responsive overrides — superseded by R7.20 unified rules) */
        /* (kept for reference, no longer active) */
        [data-shell="cv4"] [data-testid="project-settings-overlay"][data-mobile="true"] > div:first-child,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"][data-mobile="true"] > div:first-child {
          border-radius: 0 !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        /* "Settings" header → mono caps */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] span,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] span {
          /* avoid restyling every inline span — narrow to the first big
             header span via the surrounding header padding pattern */
        }
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:first-child > div:first-child > span,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:first-child > div:first-child > span {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          letter-spacing: 0.10em !important;
          text-transform: uppercase !important;
        }
        /* Tighten the sidebar header padding */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] > div:first-child > div:first-child,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] > div:first-child > div:first-child {
          padding: 14px 14px !important;
        }
        /* Tab buttons in sidebar — sharp + thin + mono */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] button,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] button {
          border-radius: 2px !important;
        }
        [data-shell="cv4"] [data-testid="project-settings-overlay"] [data-testid^="project-settings-tab-"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] [data-testid^="thread-settings-tab-"] {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          padding: 8px 12px !important;
          border-radius: 2px !important;
        }
        /* Modal backdrop dim (desktop only) — heavier so the panel reads as
           a true modal floating over a hidden background. */
        [data-shell="cv4"] [data-testid="project-settings-overlay"][data-mobile="false"],
        [data-shell="cv4"] [data-testid="thread-settings-overlay"][data-mobile="false"] {
          background: rgba(0,0,0,0.65) !important;
          backdrop-filter: blur(4px) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="project-settings-overlay"][data-mobile="false"],
        [data-shell="cv4"][data-theme="light"] [data-testid="thread-settings-overlay"][data-mobile="false"] {
          background: rgba(20,18,14,0.45) !important;
        }
        /* All inputs inside settings — flat + sharp */
        [data-shell="cv4"] [data-testid="project-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="project-settings-overlay"] textarea,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] input,
        [data-shell="cv4"] [data-testid="thread-settings-overlay"] textarea {
          border-radius: 2px !important;
          font-family: 'Hanken Grotesk', sans-serif !important;
        }

        /* R7.14b — remove the blue project-room dot in the context nav.
           Anywhere a project name shows in the title row, kill the dot's
           default blue and just lean on the title text. */
        /* Targeted via the explicit C.blue color which renders as
           rgb(96, 165, 250) — substring match either form. */
        [data-shell="cv4"] [style*="rgb(96, 165, 250)"],
        [data-shell="cv4"] [style*="#60A5FA"],
        [data-shell="cv4"] [style*="#60a5fa"] {
          background: ${C.muted} !important;
        }

        /* R7.14c — make the purple sparkles "Commands" button follow the
           theme instead of being a permanent purple/blue cast. */
        [data-shell="cv4"] [data-testid="cv4-commands-menu-button"] {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          color: ${C.text} !important;
          box-shadow: none !important;
        }
        [data-shell="cv4"] [data-testid="cv4-commands-menu-button"]:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="cv4-commands-menu-button"] {
          background: rgba(0,0,0,0.04) !important;
          border: 1px solid rgba(0,0,0,0.10) !important;
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-testid="cv4-commands-menu-button"]:hover {
          background: rgba(0,0,0,0.07) !important;
        }

        /* ── R7.6 LIGHT THEME ────────────────────────────────────────────
           Soft paper palette, intentionally NOT pure white. Many CV4 inline
           styles use exact hex values from cv3Colors.js; we override them via
           [style*=""] substring selectors. The browser keeps React's style
           string as-written, so hex literals match reliably. */
        [data-shell="cv4"][data-theme="light"] {
          /* R-QA-FIX-15 (Patrik: "neutral for sure, not warm"): the page ground is the
             neutral CV6 ground (#f5f5f5), matching the home container, so no warm beige
             peeks around or behind the dashboard in light mode. */
          background: #f5f5f5 !important;
          color: #2A2620;
        }
        /* Surfaces (page bg, drawer bg, cards) → NEUTRAL grey tiers (Patrik 2026-06-19:
 "neutral for sure, not warm", was warm paper/beige, which still peeked behind
           containers in CV6 light mode). Same light→dark tiering, just neutralized. */
        [data-shell="cv4"][data-theme="light"] [style*="#06090F"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(6, 9, 15)"] {
          background-color: #f5f5f5 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#0B1018"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(11, 16, 24)"] {
          background-color: #f2f2f2 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#111827"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(17, 24, 39)"] {
          background-color: #ededed !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#1A2035"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(26, 32, 53)"] {
          background-color: #e8e8e8 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#222942"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(34, 41, 66)"] {
          background-color: #e2e2e2 !important;
        }
        /* Body text → warm near-black */
        [data-shell="cv4"][data-theme="light"] [style*="#F1F5F9"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(241, 245, 249)"] {
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#94A3B8"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(148, 163, 184)"] {
          color: #5C5448 !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#475569"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(71, 85, 105)"] {
          color: #736B5C !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="#334155"],
        [data-shell="cv4"][data-theme="light"] [style*="rgb(51, 65, 85)"] {
          color: #8A8170 !important;
        }
        /* Hairline borders → softened dark hairlines */
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.04)"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.04)"] {
          border-color: rgba(0,0,0,0.06) !important;
        }
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.08)"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.08)"] {
          border-color: rgba(0,0,0,0.10) !important;
        }
        /* Composer pill + bubbles already scoped to CV4 — flip surface */
        [data-shell="cv4"][data-theme="light"] *:has(> [data-role="composer-actions"]) {
          background: #F7F2E6 !important;
          border-color: rgba(0,0,0,0.10) !important;
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble="user"],
        [data-shell="cv4"][data-theme="light"] [data-bubble="user"] .cmr-content,
        [data-shell="cv4"][data-theme="light"] [data-bubble="user"] .message-content {
          background: #E8E1CF !important;
          color: #2A2620 !important;
          border-color: rgba(0,0,0,0.10) !important;
        }
        [data-shell="cv4"][data-theme="light"] [data-bubble="assistant"],
        [data-shell="cv4"][data-theme="light"] [data-bubble="assistant"] .cmr-content,
        [data-shell="cv4"][data-theme="light"] [data-bubble="assistant"] .message-content {
          color: #2A2620 !important;
        }
        /* Inputs (search etc.) — keep contrast */
        [data-shell="cv4"][data-theme="light"] input,
        [data-shell="cv4"][data-theme="light"] textarea {
          color: #2A2620 !important;
        }
        [data-shell="cv4"][data-theme="light"] input::placeholder,
        [data-shell="cv4"][data-theme="light"] textarea::placeholder {
          color: #8A8170 !important;
        }
        /* The narrative paragraph card */
        [data-shell="cv4"][data-theme="light"] [data-cv4-tasks-narrative] [data-testid="living-paragraph-text"] {
          color: #5C5448 !important;
        }

        /* R7.9 LIGHT MODE — catch invisible-on-cream text. Many shared CV3
           pieces use color: white / #FFFFFF / inherit; on mobile especially
           these were unreadable. Force any element whose declared color is
           pure white over to our warm near-black. Substring match the
           lowercased + uppercased spellings React emits. */
        [data-shell="cv4"][data-theme="light"] [style*="color: #FFFFFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#FFFFFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color: #ffffff"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#ffffff"],
        [data-shell="cv4"][data-theme="light"] [style*="color: #FFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#FFF"],
        [data-shell="cv4"][data-theme="light"] [style*="color: #fff"],
        [data-shell="cv4"][data-theme="light"] [style*="color:#fff"],
        [data-shell="cv4"][data-theme="light"] [style*="color: white"],
        [data-shell="cv4"][data-theme="light"] [style*="color:white"],
        [data-shell="cv4"][data-theme="light"] [style*="color: rgb(255, 255, 255)"],
        [data-shell="cv4"][data-theme="light"] [style*="color: rgb(255,255,255)"] {
          color: #2A2620 !important;
        }
        /* Backgrounds that were pure white in dark surfaces (unlikely but
           guard against the inverse). Cards using rgba(255,255,255,N) for
           subtle layers — flip to a subtle dark wash so they remain visible. */
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.02"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.02"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.03"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.03"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.05"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.05"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255,255,255,0.06"],
        [data-shell="cv4"][data-theme="light"] [style*="rgba(255, 255, 255, 0.06"] {
          background-color: rgba(0,0,0,0.035) !important;
        }
        /* Body fallback: if a descendant inherits color, root forces warm dark. */
        [data-shell="cv4"][data-theme="light"] { color: #2A2620; }
        /* Default headings + paragraphs inside CV4 in light mode */
        [data-shell="cv4"][data-theme="light"] h1,
        [data-shell="cv4"][data-theme="light"] h2,
        [data-shell="cv4"][data-theme="light"] h3,
        [data-shell="cv4"][data-theme="light"] h4 { color: #2A2620; }
        [data-shell="cv4"][data-theme="light"] p { color: #3D362C; }

        /* Home + Theme toggle — sit inline in the top nav next to the bell.
           Mission: corner:home-screen. */
        [data-shell="cv4"] [data-cv4-home-toggle],
        [data-shell="cv4"] [data-cv4-theme-toggle] {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.10);
          color: #94A3B8;
          cursor: pointer;
          border-radius: 2px;
          padding: 0;
          transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
        }
        [data-shell="cv4"] [data-cv4-home-toggle]:hover,
        [data-shell="cv4"] [data-cv4-theme-toggle]:hover {
          background: rgba(255,255,255,0.05);
          color: #F1F5F9;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home-toggle],
        [data-shell="cv4"][data-theme="light"] [data-cv4-theme-toggle] {
          background: transparent;
          border: 1px solid rgba(0,0,0,0.12);
          color: #5C5448;
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home-toggle]:hover,
        [data-shell="cv4"][data-theme="light"] [data-cv4-theme-toggle]:hover {
          background: rgba(0,0,0,0.04);
          color: #2A2620;
        }

        /* Home button: sage-accent when the user is currently on the home view. */
        [data-shell="cv4"] [data-cv4-home-toggle][data-active="true"] {
          color: #10B981;
          border-color: rgba(16,185,129,0.35);
          background: rgba(16,185,129,0.05);
        }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home-toggle][data-active="true"] {
          color: #0E8E63;
          border-color: rgba(14,142,99,0.40);
          background: rgba(14,142,99,0.06);
        }
      `}</style>

      {/* ── NAV BAR (R208: CV6 mobile refinement — search + theme LEFT, bell + avatar RIGHT) ───
          Corner:corner-ui-cv6 R208: Top nav redesigned to match TopBar.dc.html one-for-one.
          LEFT: search magnifier (19px) + theme toggle moon (18px, filled), both 38x38 with subtle chip bg.
          RIGHT: bell (19px, transparent, unread dot when unread) + avatar (38x38 circle).
          Safe-area-inset-top padding ensures the bar sits below iOS status bar in PWA.
          cv6Mode: hidden — the CV6 home carries its own top (clock, avatar, search). */}
      {!cv6Mode && (<nav
        aria-label="Main navigation"
        style={{
          width: '100%',
          flexShrink: 0,
          background: C.bg,
          borderBottom: '1px solid ' + C.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'calc(54px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          gap: 12,
        }}
      >
        {/* LEFT GROUP: search + theme toggle (gap 8px, 38x38 buttons with chip bg) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Search button: 38x38, magnifier 19px, chip bg */}
          <button
            type="button"
            aria-label="Search"
            title="Search"
            onClick={() => {
              // Wire to HomeView's search if available; for now placeholder
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              border: 'none',
              background: 'var(--cv6-surface, rgba(255,255,255,.05))',
              color: 'var(--cv6-text-primary, #E5E5E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform .12s ease, background .15s ease',
              padding: 0,
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(.94)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
          </button>

          {/* Theme toggle button: 38x38, moon 18px filled, chip bg */}
          <button
            type="button"
            aria-label={theme === 'light' ? 'Switch to dark theme' : theme === 'dark' ? 'Switch to glass theme' : 'Switch to light theme'}
            title={theme === 'light' ? 'Light · tap for Dark' : theme === 'dark' ? 'Dark · tap for Glass' : 'Glass · tap for Light'}
            onClick={() => cycleTheme()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              border: 'none',
              background: 'var(--cv6-surface, rgba(255,255,255,.05))',
              color: 'var(--cv6-text-primary, #E5E5E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform .12s ease, background .15s ease',
              padding: 0,
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(.94)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {/* Filled moon SVG, 18px */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 9 9c-5 0-9-4-9-9Z" />
            </svg>
          </button>
        </div>

        {/* RIGHT GROUP: bell + avatar (gap 10px) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
          {/* Bell button: 38x38, transparent bg, bell 19px, muted color, unread dot when unread */}
          <button
            type="button"
            aria-label={`Notifications${totalUnread > 0 ? ` (${totalUnread} unread)` : ''}`}
            title="Notifications"
            onClick={() => setNotifOpen(o => !o)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              border: 'none',
              background: 'transparent',
              color: 'var(--cv6-text-secondary, #A3A3A3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform .12s ease',
              padding: 0,
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(.94)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>
            </svg>
            {/* Unread dot: 7x7, shown only when unread > 0 */}
            {totalUnread > 0 && (
              <span style={{
                position: 'absolute',
                top: 8,
                right: 9,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--cv6-accent-primary, #3B82F6)',
                border: '2px solid var(--cv6-ground, #0A0A0B)',
              }}/>
            )}
          </button>

          {/* Notifications panel (existing, stays same) */}
          {notifOpen && (
            <NotificationsPanel
              items={notifItems}
              agents={agents}
              onSelectNotification={handleSelectNotification}
              onSelectAgent={handleSelectAgent}
              onMarkAllRead={() => {
                const now = new Date().toISOString()
                setNotifReadAt(prev => {
                  const next = { ...prev }
                  for (const item of notifItems) next[item.roomKey || item.agent] = now
                  return next
                })
                setNotifOpen(false)
              }}
              onClose={() => setNotifOpen(false)}
            />
          )}

          {/* Avatar: 38x38 circle, existing UserAvatar component */}
          <UserAvatar
            user={currentUser}
            onUserUpdate={setCurrentUser}
            extraMenuItems={(
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: C.dim,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 6,
                }}>World</div>
                <WorldSelector
                  currentWorldId={worldId}
                  currentUser={currentUser}
                  onEnterWorld={handleEnterWorld}
                  onReturnToMyWorld={handleReturnToMyWorld}
                  isNightMode={true}
                  isMobile={false}
                />

                {/* corner:home-screen — Default View control. Shows current
                    default (home OR a pinned room) + a reset to home button. */}
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: C.dim,
                  fontFamily: "'JetBrains Mono', monospace",
                  margin: '14px 0 6px',
                }}>Default View</div>
                <button
                  type="button"
                  onClick={() => { resetToHome(); }}
                  disabled={!defaultView || defaultView.kind === 'home' || !defaultView.kind}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 2,
                    color: (!defaultView || defaultView.kind === 'home' || !defaultView.kind) ? C.muted : C.text,
                    cursor: (!defaultView || defaultView.kind === 'home' || !defaultView.kind) ? 'default' : 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                    textAlign: 'left',
                  }}
                  data-testid="cv4-default-view-reset"
                  title="Reset default view to home"
                  aria-label="Reset default view to home"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ flexShrink: 0 }}>
                    <path d="M12 2 L2 11 H5 V21 H10 V14 H14 V21 H19 V11 H22 Z"/>
                  </svg>
                  <span style={{ flex: 1 }}>
                    {(!defaultView || defaultView.kind === 'home' || !defaultView.kind)
                      ? 'Home (default)'
                      : 'Reset to home'}
                  </span>
                </button>
                {defaultView && defaultView.kind && defaultView.kind !== 'home' && (
                  <div style={{
                    fontSize: 10, fontFamily: "'Hanken Grotesk', sans-serif",
                    color: C.muted, marginTop: 6, lineHeight: 1.4,
                  }}>
                    Currently opens to <strong style={{ color: C.text2, fontWeight: 600 }}>{defaultView.slug}</strong> on first load.
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </nav>)}

      {/* corner:corner-ui-cv6 R4 — cross-page Activity Dock. A real running job
          (status=running task for this world) shows as a full-width glass pill that
          follows the user across every cv6 mobile screen; renders nothing when idle.
          Fixed wrapper gives the absolute pill its full-width positioned parent. */}
      {cv6Mode && !isDesktop && (
        <div style={{ position: 'fixed', left: 0, right: 0, top: 'calc(env(safe-area-inset-top, 0px) + 56px)', zIndex: 55 }}>
          <ActivityDockLive worldId={worldId} variant="float" />
        </div>
      )}

      {/* corner:corner-ui-cv6 R17 — mobile global nav drawer (right-anchored).
          Mounted ONCE above every cv6 mobile screen (z above the z:50 screens and
          the z:55 float dock) so the right-edge swipe + grabber and the header menu
          all open the same tool switcher from anywhere. Self-scoped data-cv6kit so
          the ported nav classes + tokens resolve; pointerEvents:none lets the screen
          beneath stay live until the grabber/drawer is touched. */}
      {cv6Mode && !isDesktop && (
        <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }}>
          <MobileNavDrawer
            open={navOpen}
            onOpen={() => setNavOpen(true)}
            onClose={() => setNavOpen(false)}
            onNav={handleCv6Nav}
            activeKey={showSupportInbox ? 'support' : (activeTool === 'chat' ? 'chat' : activeTool === 'organize' ? 'organize' : activeTool === 'command' ? 'command' : activeTool === 'review' ? 'review' : activeTool === 'tracker' ? 'tracker' : activeTool === 'settings' ? 'settings' : 'home')}
            user={{ initials: ((currentUser?.name || 'P').trim()[0] || 'P').toUpperCase(), name: currentUser?.name || 'You' }}
            badges={supportPending > 0 ? { support: { needs: supportPending } } : {}}
          />
        </div>
      )}

      {/* ── CV4 CONTEXT NAV (second row: hamburger + title · Chat|Tasks · slot) */}
      {!cv6Mode && <CV4ContextNav
        tab={tab}
        onSwitchTab={handleTabChange}
        unreadChat={unreadChat}
        activeTaskCount={activeTaskCount}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen(o => !o)}
        tasksDrawerOpen={tasksDrawerOpen}
        onToggleTasksDrawer={() => setTasksDrawerOpen(o => !o)}
        isDesktop={isDesktop}
        selectedAgent={selectedAgent}
        conversationTarget={conversationTarget}
        agents={agents}
        projects={projectRooms}
        onSelectAgent={handleSelectAgent}
        onSelectProject={handleSelectProject}
        worldId={worldId}
        activeTool={activeTool}
        onExitTool={() => setActiveTool(null)}
        deckActive={deckTab === 'deck'}
        onToggleDeck={() => setDeckTab(t => (t === 'deck' ? 'chat' : 'deck'))}
      />}

      {/* ── MAIN ROW (desktop): [Files drawer] [Chat (centered)] [Tasks drawer].
          Both side drawers are closeable; chat caps its width on wide screens
          so the eye doesn't have to dart left/right when both drawers are
          collapsed. Mobile/tablet still uses the tab toggle in ContextNav. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
        {isDesktop && !showSupportInbox && !cv6Mode && (
          /* R23: animated wrapper — collapses to a 14px hover gutter after
             10s without hover; hovering the gutter slides the drawer back
             open. The drawer keeps its fixed 300px width inside so the
             collapse reads as a smooth slide, not a squish.
             cv6Mode hides this rail — CV6 uses its own single-column tools layout. */
          <div
            data-cv4-left-rail-wrap
            onMouseEnter={() => { setLeftRailHover(true); if (!drawerOpen) setDrawerOpen(true) }}
            onMouseLeave={() => { setLeftRailHover(false); setLeftRailTouched(true) }}
            style={{
              width: drawerOpen ? 300 : 14,
              flexShrink: 0,
              display: 'flex',
              overflow: 'hidden',
              transition: 'width 0.35s ease',
              cursor: drawerOpen ? 'auto' : 'pointer',
            }}
          >
          <CV4Drawer
            docked
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            agents={agents}
            projectRooms={projectRooms}
            notifItems={notifItems}
            worldId={worldId}
            currentUserId={currentUser?.id || null}
            selectedAgentSlug={selectedAgent?.slug}
            selectedProjectSlug={conversationTarget?.type === 'project' ? conversationTarget?.slug : null}
            activeTool={activeTool}
            selectedMailId={selectedMail?.id}
            onSelectMail={handleSelectMail}
            onSelectTool={handleSelectTool}
            onSelectAgent={handleSelectAgent}
            onSelectProject={handleSelectProject}
            onNewProject={() => setNewRoomModal({ kind: 'project' })}
            onNewMission={(p) => setNewRoomModal({ kind: 'mission', parentSlug: p.slug, parentName: p.name })}
            onSelectMission={(mission, project) => handleSelectMission(mission, project)}
            refreshKey={drawerRefreshKey}
            skillsShelfOpen={skillsShelfOpen}
            onToggleSkillsShelf={toggleSkillsShelf}
            onCloseSkillsShelf={() => setSkillsShelfOpen(false)}
            onPickSkill={handlePickSkill}
            onSelectTask={(task, mission, project) => {
              // R5 corner:task-rooms — open the task room by routing to the
              // tasks tool with the task id in the URL hash. TasksPanelCv4
              // reads the hash and auto-expands the matching row.
              if (project) handleSelectProject(project)
              if (mission) {
                setAttachedMission({
                  slug: mission.slug,
                  name: mission.name,
                  projectSlug: project?.slug || null,
                  path: `corner:${mission.slug}`,
                })
              }
              if (handleSelectTool) handleSelectTool('tasks')
              try { window.location.hash = `task=${task.id}` } catch { /* ignore */ }
            }}
            onLogout={async () => {
              if (supabase) await supabase.auth.signOut().catch(() => {})
              window.location.href = '/'
            }}
          />
          </div>
        )}
        <div data-cv4-content-col onMouseDown={closeRailsOnContentClick} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* corner-ui-cv4 R22: ambient per-chat wave (real ai-input-hero
              Three.js pipeline). Mounted at the content-col level so it
              stretches the full center area — with the rails closed it spans
              edge to edge, with them open it fills whatever is left. Only in
              chat mode; home/support/mail/routines stay clean. */}
          {chatWaveActive && (
            <ChatWaveBackground
              chatKey={conversationTarget?.path || conversationTarget?.name || selectedAgent?.slug || 'chat'}
              theme={theme}
            />
          )}
          {/* Center the chat column on wide screens so messages don't hug the
              left edge — especially when both side drawers are closed. */}
          <div
            data-cv4-content-inner
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              position: 'relative', zIndex: 1, // keep chat above the wave canvas
              width: '100%',
              // cv6 HOME fills the full width like the /cv6 gallery (the home
              // owns its own centered max-width via .hm-shell). The 840px clamp
              // is for the chat conversation line-length only — keep it there.
              maxWidth: showSupportInbox ? '100%' : ((cv6Mode && isHomeMode) ? '100%' : (isDesktop ? 840 : '100%')),
              margin: '0 auto',
              // R22d: frosted panel behind the messages so text reads over
              // the wave — translucent room ink + blur; wave glows through
              // softly inside and at full strength on either side.
              ...(chatWaveActive ? {
                background: theme === 'light' ? 'rgba(250,247,240,0.66)' : 'rgba(6,9,15,0.55)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderLeft: '1px solid ' + C.border,
                borderRight: '1px solid ' + C.border,
              } : {}),
            }}
          >
            {/* corner:support N1 — Support Inbox (Patrik only). Phone gets the Claude-design
                inbox (SupportLive: real wishes+email, tap hands the item to the EA); desktop
                keeps the full SupportDashboard until its kit desktop layout + actions are wired. */}
            {showSupportInbox && worldId === 'aom' ? (
              /* corner:corner-ui-cv6 R-WIRE — Support now wired to REAL data on desktop AND
                 mobile via SupportLive (wishes + filtered mailbox feed, real-people-only).
                 Tapping an item hands it to the EA to draft a reply and check with Patrik;
                 nothing sends to the customer from here. */
              <SupportLive
                worldId={worldId}
                isDesktop={isDesktop}
                activeTool="support"
                onNav={handleCv6Nav}
                onMenu={() => setNavOpen(true)}
                onClose={() => setShowSupportInbox(false)}
                onDiscuss={handleDiscussSupportEmail}
                user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
              />
            ) : activeTool === 'routines' ? (
              /* corner:routines R3 — full-area card view of every open loop.
                 Selecting any agent / project / mission / mail clears
                 activeTool, which force-closes this board. */
              <RoutinesBoard worldId={worldId} onClose={() => setActiveTool(null)} />
            ) : (activeTool === 'projectview') ? (
              /* corner:corner-ui-cv6 LIVE-FEEDBACK R2 — tapping a room on the mobile
                 Home opens the project (missions inside) view, not straight-to-chat.
                 Real missions via /api/dashboard/missions-tree; the general-chat
                 button keeps the old room-tap behaviour; a mission row opens that
                 mission; New mission opens the real create flow. */
              <MobileProjectWired
                project={mobileProject}
                worldId={worldId}
                onBack={() => { setActiveTool(null); setMobileProject(null); }}
                onOpenChat={(p) => { setActiveTool(null); setMobileProject(null); handleSelectProject(p); }}
                onOpenMission={(p, m) => { setActiveTool(null); setMobileProject(null); handleSelectMission(m, p); }}
                onNewMission={(p) => setNewRoomModal({ kind: 'mission', parentSlug: p.slug, parentName: p.name })}
              />
            ) : (activeTool === 'organize') ? (
              /* corner:corner-ui-cv6 R-WIRE — Organize wired to REAL data on desktop AND
                 mobile via OrganizeLive: your real project rooms + each project's real text
                 files (content rides along for the preview). Opens on files (first project),
                 switch from the top. Move/Rename/Share/Delete are stubbed (console.warn) until
                 their endpoints are defined. onBack returns home. */
              <OrganizeLive
                projectRooms={projectRooms}
                worldId={worldId}
                isDesktop={isDesktop}
                activeTool="organize"
                onNav={handleCv6Nav}
                onMenu={() => setNavOpen(true)}
                onBack={() => setActiveTool(null)}
                user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
              />
            ) : (activeTool === 'command') ? (
              /* corner:corner-ui-cv6 R-KIT-14 — Claude-design Command goal ledger on the
                 phone, wired to the real room-goals data (read-only: featured goal + room
                 roster with status; needs-you rooms surface amber). Tapping a room opens it
                 if it resolves to a real project/agent. The interactive controls (loop
                 toggle, inline reply, edit-goal, autopilot) stay on the desktop tracker. */
              <CommandLive
                worldId={worldId}
                isDesktop={isDesktop}
                activeTool="command"
                onNav={handleCv6Nav}
                onMenu={() => setNavOpen(true)}
                onBack={() => setActiveTool(null)}
                user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
                onSelectRoom={(r) => {
                  const slug = (r && (r.slug || r.id)) || ''
                  if (!slug) return
                  if (slug.includes(':')) {
                    const proj = slug.split(':')[0]
                    const match = projectRooms?.find(p => p?.slug === proj || (p?.slug || '').toLowerCase() === proj.toLowerCase())
                    if (match) { setActiveTool(null); handleSelectProject(match) }
                  } else {
                    const ag = agents?.find(a => a?.slug === slug)
                    if (ag) { setActiveTool(null); handleSelectAgent(ag) }
                  }
                }}
              />
            ) : (activeTool === 'review') ? (
              /* corner:corner-ui-cv6 R-KIT-17 — Claude-design Review queue on the phone,
                 wired to the real recent-deliverables queue (/api/dashboard/review-queue).
                 Read-only browse: list of recent finished work, tap to read it. Approve /
                 request-changes held until that action is defined (action bar stays hidden).
                 onExit returns home. */
              <ReviewLive
                worldId={worldId}
                isDesktop={isDesktop}
                activeTool="review"
                onNav={handleCv6Nav}
                onMenu={() => setNavOpen(true)}
                onExit={() => setActiveTool(null)}
                user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
              />
            ) : (activeTool === 'chat') ? (
              /* corner:corner-ui-cv6 R-KIT-CHAT — Chat. Mobile lands on the conversations
                 LIST (chat-list.html canon: .mhdr header, your assistants + project rooms);
                 tapping a row opens that room. Desktop shows the Claude-design Chat (rooms
                 rail · graphical Goal thread · mission goals/files drawer) as the sample
                 mockup baseline; the live conversation is wired back at step 2. */
              !isDesktop ? (
                <MobileChatList
                  agents={agents}
                  projectRooms={projectRooms}
                  onOpenAgent={handleSelectAgent}
                  onOpenProject={(proj) => { setMobileProject(proj); setActiveTool('projectview') }}
                  onMenu={() => setNavOpen(true)}
                  onBack={() => setActiveTool(null)}
                />
              ) : (
                <ChatView
                  {...SAMPLE_CHAT}
                  isDesktop={isDesktop}
                  activeTool="chat"
                  onNav={handleCv6Nav}
                  user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
                  onMenu={() => setNavOpen(true)}
                  onBack={() => setActiveTool(null)}
                />
              )
            ) : (activeTool === 'scribe') ? (
              /* corner:corner-ui-cv6 R-KIT-SCRIBE — Claude-design Live Scribe (live
                 transcript + auto-extracted actions/decisions on desktop; the recording
                 screen on mobile). Sample mockup baseline; live recording is wired at
                 step 2. */
              <ScribeView
                {...SAMPLE_SCRIBE}
                isDesktop={isDesktop}
                activeTool="scribe"
                onNav={handleCv6Nav}
                user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
                onMenu={() => setNavOpen(true)}
                onBack={() => setActiveTool(null)}
              />
            ) : (activeTool === 'settings') ? (
              /* corner:corner-ui-cv6 R4 — Claude-design Settings (Environment). Real wiring:
                 integrations list + OAuth connect/disconnect, live theme switch, per-agent
                 permissions + notification prefs persisted to user_preferences, real sign out.
                 onRerunSetup opens the onboarding flow. onBack returns home. */
              <SettingsLive
                user={currentUser}
                theme={theme}
                onThemeChange={setTheme}
                onSignOut={() => { if (supabase) supabase.auth.signOut().catch(() => {}) }}
                onRerunSetup={() => setActiveTool('onboarding')}
                agents={agents}
                worldId={worldId}
                isDesktop={isDesktop}
                onNav={handleCv6Nav}
                onEnableNotifications={() => setNotifPromptOpen(true)}
                onBack={() => setActiveTool(null)}
              />
            ) : (activeTool === 'onboarding') ? (
              /* corner:corner-ui-cv6 R-KIT-ONBOARD — Claude-design first-run onboarding flow
                 (5 steps: welcome, connections, permissions, theme, first goal + done).
                 Wired to real endpoints: oauth/start, agent-permissions, create-project-from-chat,
                 onboarding-state. Missing endpoints reported as console.warn + openWiring list.
                 onNavigateHome returns to home after setup completes. */
              <OnboardingLive
                user={currentUser}
                worldId={worldId}
                onFinish={(result) => {
                  // Setup complete. Clear onboarding state.
                  setActiveTool(null)
                  // Optionally log the result (theme/connections/permissions)
                  console.log('[OnboardingLive] Setup complete:', result)
                }}
                setTheme={setTheme}
                onNavigateHome={() => {
                  setActiveTool(null)
                  // Ensure we're on home view
                  setShowSupportInbox(false)
                  setSelectedAgent(null)
                  setConversationTarget(null)
                  setTab('chat')
                }}
              />
            ) : (activeTool === 'tracker') ? (
              /* corner:corner-ui-cv6 R14 — Tracker now wired to the REAL CV6 bug list
                 (TrackerLive -> /api/dashboard/cv6-bugs). Tap a bug for its detail;
                 Assign to agent hands it to the assistant. onBack returns home. The
                 Space Rising tracker (second source) is a separate bridge, not yet. */
              <TrackerLive
                worldId={worldId}
                isDesktop={isDesktop}
                activeTool="tracker"
                onNav={handleCv6Nav}
                onMenu={() => setNavOpen(true)}
                onBack={() => setActiveTool(null)}
                onDiscuss={handleDiscussSupportEmail}
                user={{ initial: (currentUser?.user_metadata?.full_name || 'P').charAt(0) }}
              />
            ) : /* R10 — Mail list moved to the left rail. Right rail / mobile
                'tasks' tab no longer renders MailListPanel. Clicking an email
                in the left rail still opens MailRoom in the center column. */
            (!isDesktop && tab === 'tasks') ? (
              selectedMail
                ? <MailRoom email={selectedMail} onBack={handleBackFromMailRoom} />
                : <RightMenu handleSelectMission={handleSelectMission} handleSelectProject={handleSelectProject} handleSelectTask={handleSelectTask} />
            ) : selectedMail ? (
              <MailRoom email={selectedMail} onBack={handleBackFromMailRoom} />
            ) : isHomeMode ? (
              !isDesktop ? (
                /* corner:corner-ui-cv6 — mobile Home is the design transcribed VERBATIM
                   (MobileHomeExact: the design's own scoped CSS + markup), wired to REAL
                   data: All Rooms ← your agents + projects, Catch Up ← the needs-you queue,
                   tap a room opens it. This is the design straight from the file, on the
                   real /dashboard surface. */
                <MobileHomeExact
                  user={currentUser}
                  agents={agents}
                  projectRooms={projectRooms}
                  catchup={buildCatchupNotifications(notifItems)}
                  onSelectAgent={handleSelectAgent}
                  onSelectProject={handleSelectProject}
                  onCatchupOpen={handleCatchupOpenRoom}
                  onNav={handleCv6Nav}
                  theme={effectiveTheme}
                />
              ) : (
              /* corner:corner-ui-cv6 R-WIRE — Claude-design DESKTOP Home, three-column shell
                 (All Rooms | Catch Up | Conversation), now REAL data (DesktopHomeWired):
                 All Rooms ← agents + projects with status; Catch Up ← the needs-you queue
                 (honest empty); Conversation ← honest "pick a room" until one is opened (the
                 rich sample goal dashboard is not fabricated). */
              <DesktopHomeWired
                user={currentUser}
                agents={agents}
                projectRooms={projectRooms}
                catchup={buildCatchupNotifications(notifItems)}
                recentMessages={[]}
                onSelectAgent={handleSelectAgent}
                onSelectProject={handleSelectProject}
                onCatchupOpen={handleCatchupOpenRoom}
                onNav={handleCv6Nav}
                theme={theme}
                roomsLoading={!dataPipeUpdatedAt && (projectRooms || []).length === 0}
              />
              )
            ) : selectedAgent?.slug === 'elon' && deckTab === 'deck' ? (
              // command:deck — entry is the loop icon in the room header (ContextNav).
              // Ported from CornerV4 so the live goal ledger is testable on /cvg.
              <CommandDeck
                worldId={worldId}
                basePath={`/cvg/project`}
                onClose={() => setDeckTab('chat')}
                onReplyToRoom={postReplyToRoom}
                onJumpToRoom={(room) => {
                  if (room.includes(':')) {
                    const parts = room.split(':')
                    const mission = parts.pop()
                    const proj = parts[parts.length - 1]
                    navigate(`/cvg/project/${proj}?mission=${encodeURIComponent(mission)}`)
                  } else {
                    setSelectedAgent({ slug: room, name: room })
                    setConversationTarget({ name: room, type: 'agent' })
                  }
                  setDeckTab('chat')
                }}
              />
            ) : cv6Mode && (selectedAgent || conversationTarget) ? (
              /* CvgChatSurface (cv6 live conversation surface) wired to Supabase
                 for real-time message streaming. Routes sends through handleCvgChatSend
                 which applies the Gemini model override. */
              <CvgChatSurface
                key={selectedAgent?.slug || conversationTarget?.slug || 'chat'}
                worldId={worldId}
                target={selectedAgent ? {
                  type: 'agent',
                  slug: selectedAgent.slug,
                  name: selectedAgent.name,
                } : conversationTarget?.type === 'project' ? {
                  type: 'project',
                  slug: conversationTarget.slug,
                  name: conversationTarget.name,
                  missionSlug: conversationTarget.missionSlug,
                } : null}
                theme={theme}
                kit={!isDesktop}
                onSend={handleCvgChatSend}
                onBack={handleBackFromConversation}
              />
            ) : (
              /* Fall back to ChatPanel on cv4 surfaces (non-cv6 OR no conversation selected) */
              <ChatPanel key={selectedAgent?.slug || 'chat'} />
            )}
          </div>
        </div>
        {isDesktop && !showSupportInbox && !cv6Mode && (
          /* R23: animated wrapper — same idle-close / hover-reopen behavior
             as the left rail. Inner aside keeps its fixed clamp width so the
             collapse slides instead of squishing.
             cv6Mode hides this rail — CV6 uses its own single-column tools layout. */
          <div
            data-cv4-right-rail-wrap
            onMouseEnter={() => { setRightRailHover(true); if (!tasksDrawerOpen) setTasksDrawerOpen(true) }}
            onMouseLeave={() => { setRightRailHover(false); setRightRailTouched(true) }}
            style={{
              width: tasksDrawerOpen ? 'clamp(300px, 20vw, 460px)' : 14,
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'flex-start',
              overflow: 'hidden',
              transition: 'width 0.35s ease',
              cursor: tasksDrawerOpen ? 'auto' : 'pointer',
            }}
          >
          <aside
            data-cv4-tasks-drawer
            style={{
              // R7.2: ~20% of viewport, clamped sensibly so it stays readable.
              width: 'clamp(300px, 20vw, 460px)',
              flexShrink: 0,
              background: C.bg,
              borderLeft: '1px solid ' + C.border,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* R10 — Right rail is Missions/Tasks/Files only. Mail moved
                to the left rail (LeftMailPanel inside CV4Drawer). */}
            <RightMenu handleSelectMission={handleSelectMission} handleSelectProject={handleSelectProject} handleSelectTask={handleSelectTask} />
          </aside>
          </div>
        )}
      </div>

      {/* corner:skills-picker R1 — modal that picks which mission/project the
          chosen skill should be attached to. Closes on Esc / backdrop / pick. */}
      {skillsPickerSkill && (
        <SkillsMissionPicker
          skill={skillsPickerSkill}
          worldId={worldId}
          onClose={() => setSkillsPickerSkill(null)}
          onAttached={handleSkillAttached}
        />
      )}

      {/* R5.1: persistent home input bar removed. Chat is the always-on default,
          and its composer (ThreadInputBar) lives inside ChatPanel. */}

      {/* ── COMMANDS PALETTE MODAL ───────────────────────────────────────── */}
      {showCommandsModal && (
        <div
          onClick={() => setShowCommandsModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: OVERLAY.backdrop,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 80,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560,
              background: C.s1,
              border: '1px solid ' + C.border2,
              borderRadius: OVERLAY.panelRadius,
              boxShadow: OVERLAY.panelShadow,
              overflow: 'hidden',
              maxHeight: '60vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: '1px solid ' + C.border,
            }}>
              <span style={{
                fontSize: 22, fontWeight: 800, lineHeight: 1, color: C.text,
                fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '-0.03em',
              }}>
                Slash Commands
              </span>
              <button
                onClick={() => setShowCommandsModal(false)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
              >×</button>
            </div>
            {/* List */}
            <div style={{ overflowY: 'auto', padding: 6 }}>
              {skillsData.skills.map(skill => (
                <button
                  key={skill.name}
                  onClick={() => {
                    setInputBarText(skill.name + ' ')
                    setShowCommandsModal(false)
                    handleInputBarFocus()
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', textAlign: 'left',
                    padding: '8px 10px', borderRadius: 10,
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.10)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  onTouchStart={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.10)' }}
                  onTouchEnd={e => { e.currentTarget.style.background = 'none' }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: C.accent2,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0, minWidth: 0,
                  }}>{skill.name}</span>
                  <span style={{
                    fontSize: 11, color: C.text2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                  }}>{skill.description}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: C.muted, flexShrink: 0,
                  }}>{skill.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PHONE RECORDING OVERLAY ───────────────────────────────────────── */}
      {phoneOverlayOpen && (
        <PhoneRecordingOverlay
          isRecording={telephone.isRecording}
          isTranscribing={telephone.isTranscribing}
          micError={telephone.micError}
          elapsed={telephone.elapsed}
          lastTranscript={telephone.lastTranscript}
          onToggle={telephone.toggle}
          onClose={() => {
            setPhoneOverlayOpen(false)
            if (telephone.isRecording) telephone.stop()
          }}
        />
      )}

      {/* ── TOAST NOTIFICATION ────────────────────────────────────────────── */}
      <TaskCompletionToast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

      {/* ── CV4 DRAWER (mobile/tablet overlay; desktop renders docked above) ─ */}
      {!isDesktop && (
        <CV4Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          agents={agents}
          projectRooms={projectRooms}
          notifItems={notifItems}
          worldId={worldId}
          currentUserId={currentUser?.id || null}
          selectedAgentSlug={selectedAgent?.slug}
          selectedProjectSlug={conversationTarget?.type === 'project' ? conversationTarget?.slug : null}
          activeTool={activeTool}
          selectedMailId={selectedMail?.id}
          onSelectMail={handleSelectMail}
          onSelectTool={handleSelectTool}
          onSelectAgent={handleSelectAgent}
          onSelectProject={handleSelectProject}
          onNewProject={() => setNewRoomModal({ kind: 'project' })}
          onNewMission={(p) => setNewRoomModal({ kind: 'mission', parentSlug: p.slug, parentName: p.name })}
          onSelectMission={(mission, project) => handleSelectMission(mission, project)}
          refreshKey={drawerRefreshKey}
          skillsShelfOpen={skillsShelfOpen}
          onToggleSkillsShelf={toggleSkillsShelf}
          onCloseSkillsShelf={() => setSkillsShelfOpen(false)}
          onPickSkill={handlePickSkill}
          onSelectTask={(task, mission, project) => {
            if (project) handleSelectProject(project)
            if (mission) {
              setAttachedMission({
                slug: mission.slug,
                name: mission.name,
                projectSlug: project?.slug || null,
                path: `corner:${mission.slug}`,
              })
            }
            if (handleSelectTool) handleSelectTool('tasks')
            try { window.location.hash = `task=${task.id}` } catch { /* ignore */ }
          }}
          onLogout={async () => {
            if (supabase) await supabase.auth.signOut().catch(() => {})
            window.location.href = '/'
          }}
        />
      )}

      {newRoomModal && (
        <NewRoomModal
          kind={newRoomModal.kind}
          busy={creatingRoom}
          error={createRoomError}
          onSubmit={(name) => {
            if (newRoomModal.kind === 'project') handleCreateProject(name)
            else if (newRoomModal.kind === 'mission') handleCreateMission(name, newRoomModal.parentSlug, newRoomModal.parentName)
          }}
          onClose={() => { if (!creatingRoom) { setNewRoomModal(null); setCreateRoomError(null) } }}
        />
      )}

      <FloatingCallBar />

      {/* ── CATCHUP MODAL (corner:notifications-catchup R2) ──────────────── */}
      <CatchupModal
        isOpen={catchupOpen}
        notifications={buildCatchupNotifications(notifItems)}
        onClose={() => setCatchupOpen(false)}
        onReply={handleCatchupReply}
        onSkip={handleCatchupSkip}
        onLoadContext={fetchCatchupContext}
        onOpenRoom={handleCatchupOpenRoom}
      />

      {/* ── CORNER SUPPORT MODAL (non-Patrik tenants only) ───────────────── */}
      {supportOpen && worldId && worldId !== 'aom' && (
        <CornerSupportModal
          worldId={worldId}
          theme={theme}
          onClose={() => setSupportOpen(false)}
        />
      )}
    </div>
          </LiveCallProvider>
        </CornerNavProvider>
      </CornerDataProvider>
    </CornerAuthProvider>
  )
}

// NewRoomModal moved to ./cv6kit/NewRoomModal.jsx (cv6 glass redesign, also used
// by the /cv6kit?screen=newroom preview). Imported at the top of this file.

// corner:support N3-r2 — Support chat modal for non-Patrik tenants.
// Opens the Corner Support embed (emb_corner_support) in an iframe.
// Tagged with visitor_id=support-<worldId> so Patrik can distinguish
// who is who in the corner:support mission room.
//
// Chrome model (N3-r2): the WIDGET owns the chrome (header, footer,
// rounded card, shadow). The outer wrapper is invisible — just a click-
// to-dismiss backdrop and an absolute-positioned close X over the
// iframe's top-right corner. This kills the "two windows stacked" feel
// from N3 where both the wrapper AND the widget had their own headers.
//
// Theme: the dashboard's current theme (light|dark) flows through to
// the embed via ?theme=, so the chat surface matches the dashboard
// instead of always rendering dark.
function CornerSupportModal({ worldId, theme, onClose }) {
  const safeTheme = theme === 'light' ? 'light' : 'dark'
  // bare=1 strips the embed test-page scaffold + forces inline widget mount
  // (no second nested test-page inside this host modal).
  // chrome=widget tells the widget to render its OWN header + footer; the
  //   host suppresses its outer header so the chrome doesn't double.
  // theme=<light|dark> matches the dashboard's current theme.
  const embedSrc =
    'https://www.aheadofmarket.com/embed?id=emb_corner_support&bare=1&chrome=widget&theme=' +
    safeTheme +
    '&visitor_id=' + encodeURIComponent('support-' + worldId)

  const isLight = safeTheme === 'light'
  const closeColor = isLight ? '#475569' : '#94A3B8'
  const closeHover = isLight ? '#0f172a' : '#E5E7EB'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: isLight ? 'rgba(15,23,42,0.25)' : 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        padding: '0 20px 24px 0',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(420px, calc(100vw - 32px))',
          height: 'min(600px, calc(100vh - 80px))',
          background: 'transparent',
          borderRadius: 16,
          overflow: 'visible',
        }}
      >
        <iframe
          src={embedSrc}
          title="Corner Support"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            border: 'none',
            borderRadius: 16,
            background: 'transparent',
            boxShadow: isLight
              ? '0 24px 60px rgba(15,23,42,0.18)'
              : '0 24px 60px rgba(0,0,0,0.7)',
          }}
          allow="microphone"
        />
        <button
          type="button"
          aria-label="Close support"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10, right: 10,
            width: 26, height: 26,
            background: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)',
            border: 'none', cursor: 'pointer',
            color: closeColor,
            padding: 4, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = closeHover }}
          onMouseLeave={e => { e.currentTarget.style.color = closeColor }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}