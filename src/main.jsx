import React, { lazy, Suspense, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { onAuthStateChange, isTempPassword, getSession, updateUserPreferences } from './dashboard/lib/auth.js'
import { hasSession } from './dashboard/lib/convex.js'
import App from './App.jsx'
import { injectThemeVars } from './dashboard/lib/cv3Colors.js'
import { SystemToastProvider } from './dashboard/SystemToast.jsx' // R84: mount toasts on the real app entry (/cvg, /dashboard) so create-failure warnings actually render
import { DataProvider, CommandProvider } from './dashboard/cv6next/providers/DataContext.jsx' // Root-level data + command context for dashboard performance fix
import { TenantProvider } from './dashboard/lib/tenantContext.jsx'
import WorldOverrideBanner from './dashboard/components/WorldOverrideBanner.jsx'
import { AirPodsProvider } from './dashboard/cv6next/airpods/AirPodsProvider.jsx'
import { FullscreenLoading } from './dashboard/cv6kit/FullscreenLoading.jsx'
import { installNativeBootstrap } from './dashboard/nativeBootstrap.js'

installNativeBootstrap()

// Bind CSS-variable palettes before first paint so every `C.bg` etc.
// resolves. The active palette is keyed off <html data-theme>, which
// `useThemeMode` (and the legacy CornerV4 moon toggle, which now
// routes through the hook) keeps in sync with the Arizona clock + the
// user override stored in localStorage.
injectThemeVars()
// Everything else lazy-loaded so non-home routes don't bloat the main bundle.
const Login = lazy(() => import('./pages/Login.jsx'))
const ReportsEditor = lazy(() => import('./pages/ReportsEditor.jsx'))
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'))
const BrandsHub = lazy(() => import('./pages/BrandsHub.jsx'))
const S3CBrand = lazy(() => import('./pages/S3CBrand.jsx'))
const V2VBrand = lazy(() => import('./pages/V2VBrand.jsx'))
const ValorBrand = lazy(() => import('./pages/ValorBrand.jsx'))
const SpaceRisingBrand = lazy(() => import('./pages/SpaceRisingBrand.jsx'))
const ArtlinkBrand = lazy(() => import('./pages/ArtlinkBrand.jsx'))
const ArtlinkSitePitch = lazy(() => import('./pages/ArtlinkSitePitch.jsx'))
const SpaceRisingDealBankCompleted = lazy(() => import('./pages/SpaceRisingDealBankCompleted.jsx'))
const SpaceRisingDealBankAdmin = lazy(() => import('./pages/SpaceRisingDealBankAdmin.jsx'))
const AmbitionBrandGuidelines = lazy(() => import('./pages/AmbitionBrandGuidelines.jsx'))
const AmbitionBrandGuidelinesV2 = lazy(() => import('./pages/AmbitionBrandGuidelinesV2.jsx'))
const Social = lazy(() => import('./pages/Social.jsx'))
const ResearchHVAC = lazy(() => import('./pages/ResearchHVAC.jsx'))
const LiveScribe = lazy(() => import('./pages/LiveScribe.jsx'))
const BrandGuidelinesV4 = lazy(() => import('./pages/BrandGuidelinesV4.jsx'))
const BriefsHub = lazy(() => import('./pages/BriefsHub.jsx'))
const BriefAIAdvisory = lazy(() => import('./pages/BriefAIAdvisory.jsx'))
const BriefPartnerships = lazy(() => import('./pages/BriefPartnerships.jsx'))
const BriefMasterplan = lazy(() => import('./pages/BriefMasterplan.jsx'))
const BriefSecurity = lazy(() => import('./pages/BriefSecurity.jsx'))
const BriefCompetitors = lazy(() => import('./pages/BriefCompetitors.jsx'))
const BriefVelocity = lazy(() => import('./pages/BriefVelocity.jsx'))
const BriefSprintPlan = lazy(() => import('./pages/BriefSprintPlan.jsx'))
const BriefFullscreenSite = lazy(() => import('./pages/BriefFullscreenSite.jsx'))
const BriefIdeasTracker = lazy(() => import('./pages/BriefIdeasTracker.jsx'))
const BriefAuditOnboarding = lazy(() => import('./pages/BriefAuditOnboarding.jsx'))
const BriefROICalculator = lazy(() => import('./pages/BriefROICalculator.jsx'))
const BriefWebDesignUpgrade = lazy(() => import('./pages/BriefWebDesignUpgrade.jsx'))
const BriefAmbitionSections = lazy(() => import('./pages/BriefAmbitionSections.jsx'))
const BriefAmbitionLinkedIn = lazy(() => import('./pages/BriefAmbitionLinkedIn.jsx'))
const BriefAmbitionStrategy = lazy(() => import('./pages/BriefAmbitionStrategy.jsx'))
const AuditTest = lazy(() => import('./pages/AuditTest.jsx'))
const IdeasTracker = lazy(() => import('./pages/IdeasTracker.jsx'))
const GuidesHub = lazy(() => import('./pages/GuidesHub.jsx'))
const GuideAmbitionCrown = lazy(() => import('./pages/GuideAmbitionCrown.jsx'))
const GuideAmbitionMemorialTower = lazy(() => import('./pages/GuideAmbitionMemorialTower.jsx'))
const ROICalculator = lazy(() => import('./pages/ROICalculator.jsx'))
const CaseStudy = lazy(() => import('./pages/CaseStudy.jsx'))
const Gemma4Brief = lazy(() => import('./pages/Gemma4Brief.jsx'))
const Gemma4BriefGemini = lazy(() => import('./pages/Gemma4BriefGemini.jsx'))
const Gemma4BriefDeepseek = lazy(() => import('./pages/Gemma4BriefDeepseek.jsx'))
const AmbitionPerformance = lazy(() => import('./pages/AmbitionPerformance.jsx'))
const AmbitionPerformanceV2 = lazy(() => import('./pages/AmbitionPerformanceV2.jsx'))
const Corner = lazy(() => import('./pages/Corner.jsx'))
const CornerSurgeHomepage = lazy(() => import('./pages/CornerSurgeHomepage.jsx'))
const CornerAsciiHeroPoc = lazy(() => import('./pages/CornerAsciiHeroPoc.jsx'))
const BookCorner = lazy(() => import('./pages/BookCorner.jsx'))
// corner:corner-ui-cv6 R-CLEANUP — fresh CV6 surface. /dashboard renders THIS now.
// Every screen is a Claude Design fill-in template, mounted verbatim through the
// template engine and fed real data. Nothing hand-drawn, nothing faked. Screens
// fill in as Claude Design labels them. CV4 stays the fallback at ?cv4=1.
const loadCornerCV6 = () => import('./dashboard/cv6next/CornerCV6.jsx')
const CornerCV6 = lazy(loadCornerCV6)
// Auth and the 1.1MB dashboard graph used to run serially: the chunk did not even
// start until getSession finished. Warm the dashboard graph immediately on dashboard
// routes so both waits overlap behind the same useful skeleton.
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) loadCornerCV6()

// corner:gut-pruning-ship — CV6 is now the ONLY dashboard surface.
// CV3/CV4 sticky escape hatch removed (pruning Round 3). /dashboard always
// renders CornerCV6 via DataProvider + CommandProvider.
function DashboardSurface() {
  return <TenantProvider><WorldOverrideBanner /><DataProvider><CommandProvider><AirPodsProvider><CornerCV6 /></AirPodsProvider></CommandProvider></DataProvider></TenantProvider>
}

// The HTML boot screen, lazy-chunk fallback, and auth gate deliberately share this
// exact product-shaped shell. A cold start should feel like one dashboard filling in,
// never a logo screen followed by a skeleton followed by the real app.
function DashboardBootSkeleton() {
  useEffect(() => {
    document.getElementById('cv6-boot-loader')?.remove()
    document.documentElement.removeAttribute('data-cv6-boot')
  }, [])
  const rows = Array.from({ length: 8 })
  return (
    <div className="cv6-boot-workspace" role="status" aria-live="polite" aria-label="Loading your rooms and conversation">
      <header className="cv6-boot-topbar">
        <span className="cv6-boot-wordmark" aria-hidden="true" />
        <span className="cv6-boot-top-actions" aria-hidden="true"><i /><i /><i /></span>
      </header>
      <aside className="cv6-boot-rail" aria-hidden="true">
        <i className="cv6-boot-sk cv6-boot-section" />
        <i className="cv6-boot-sk cv6-boot-search" />
        {rows.map((_, index) => <span className="cv6-boot-row" key={index}><i className="cv6-boot-sk cv6-boot-avatar" /><b><i className="cv6-boot-sk" /><i className="cv6-boot-sk" /></b><i className="cv6-boot-sk cv6-boot-time" /></span>)}
      </aside>
      <main className="cv6-boot-main" aria-hidden="true">
        <i className="cv6-boot-sk cv6-boot-kicker" />
        <i className="cv6-boot-sk cv6-boot-compose" />
        {rows.slice(0, 5).map((_, index) => <span className="cv6-boot-card" key={index}><i className="cv6-boot-sk cv6-boot-avatar" /><b><i className="cv6-boot-sk" /><i className="cv6-boot-sk" /></b></span>)}
      </main>
    </div>
  )
}

function RouteLoadingFallback() {
  const { pathname } = useLocation()
  return pathname.startsWith('/dashboard') ? <DashboardBootSkeleton /> : <FullscreenLoading label="Preparing your workspace" />
}
// corner:corner-ui-cv6 — /cv6 component gallery. Renders the real app
// components on one page as the design surface for the CV6 redesign.
const CV6Gallery = lazy(() => import('./dashboard/CV6Gallery.jsx'))
// corner:corner-ui-cv6 — /cv6kit test route. Isolated rendering of the design kit's
// mobile Home screen to verify pixel-perfect rendering before wiring data.
const CV6KitTest = lazy(() => import('./dashboard/CV6KitTest.jsx'))
const MissionsIndex = lazy(() => import('./dashboard/MissionsIndex.jsx'))
const CleoWorkspacesIndex = lazy(() => import('./dashboard/components/cv3/CleoWorkspacesIndex.jsx'))
const CleoWorkspaceDetail = lazy(() => import('./dashboard/components/cv3/CleoWorkspaceDetail.jsx'))
const BriefPage = lazy(() => import('./pages/BriefPage.jsx'))
const ISAShootScript = lazy(() => import('./pages/ISAShootScript.jsx'))
const ISABrandBible = lazy(() => import('./pages/ISABrandBible.jsx'))
const Skills = lazy(() => import('./pages/Skills.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'))
const OnboardingVoice = lazy(() => import('./pages/OnboardingVoice.jsx'))
const AcceptInvite = lazy(() => import('./pages/AcceptInvite.jsx'))
const DashboardWelcome = lazy(() => import('./pages/DashboardWelcome.jsx'))
const HomeR4Preview = lazy(() => import('./pages/HomeR4Preview.jsx'))
const HomeR38Preview = lazy(() => import('./pages/HomeR38Preview.jsx'))
const HomeLayoutOptions = lazy(() => import('./pages/HomeLayoutOptions.jsx'))
const HomeR5Preview = lazy(() => import('./pages/HomeR5Preview.jsx'))
const HomeR6Taste = lazy(() => import('./pages/HomeR6Taste.jsx'))
const VersionsGallery = lazy(() => import('./pages/versions/VersionsGallery.jsx'))
const VSuperside = lazy(() => import('./pages/versions/VSuperside.jsx'))
const VShowcaseLens = lazy(() => import('./pages/versions/VShowcaseLens.jsx'))
const VParadigms = lazy(() => import('./pages/versions/VParadigms.jsx'))
const VBento = lazy(() => import('./pages/versions/VBento.jsx'))
const VFlim = lazy(() => import('./pages/versions/VFlim.jsx'))
const VScrollSite = lazy(() => import('./pages/versions/VScrollSite.jsx'))
const VHorizontal = lazy(() => import('./pages/versions/VHorizontal.jsx'))
const VScrollStory = lazy(() => import('./pages/versions/VScrollStory.jsx'))
const VEditorial = lazy(() => import('./pages/versions/VEditorial.jsx'))
const VGearFloat = lazy(() => import('./pages/versions/VGearFloat.jsx'))
const VActStage = lazy(() => import('./pages/versions/VActStage.jsx'))
const VGearTurn = lazy(() => import('./pages/versions/VGearTurn.jsx'))
const VDensity = lazy(() => import('./pages/versions/VDensity.jsx'))
const VCinematicGlass = lazy(() => import('./pages/versions/VCinematicGlass.jsx'))
const HomeR6Baby = lazy(() => import('./pages/HomeR6Baby.jsx'))
const HomeAOM2026 = lazy(() => import('./pages/HomeAOM2026.jsx'))
const AOMStudioHome = lazy(() => import('./pages/AOMStudioHome.jsx'))
const ServiceBrandFilm = lazy(() => import('./pages/ServiceBrandFilm.jsx'))
const ServiceWebBuild = lazy(() => import('./pages/ServiceWebBuild.jsx'))
const ServiceStrategy = lazy(() => import('./pages/ServiceStrategy.jsx'))
const ServiceDocumentary = lazy(() => import('./pages/ServiceDocumentary.jsx'))
const WorkConstruction = lazy(() => import('./pages/WorkConstruction.jsx'))
const WorkTechSaas = lazy(() => import('./pages/WorkTechSaas.jsx'))
const WorkNonprofit = lazy(() => import('./pages/WorkNonprofit.jsx'))
const WorkISAEnergy = lazy(() => import('./pages/WorkISAEnergy.jsx'))
const WorkIncludedHealth = lazy(() => import('./pages/WorkIncludedHealth.jsx'))
const WorkAmbitionMechanical = lazy(() => import('./pages/WorkAmbitionMechanical.jsx'))
const WorkSpaceRising = lazy(() => import('./pages/WorkSpaceRising.jsx'))
const WorkBrandonWiley = lazy(() => import('./pages/WorkBrandonWiley.jsx'))
const WorkVirtuHospitality = lazy(() => import('./pages/WorkVirtuHospitality.jsx'))
const WorkPala = lazy(() => import('./pages/WorkPala.jsx'))
const WorkKohrs = lazy(() => import('./pages/WorkKohrs.jsx'))
const WorkIntellieplay = lazy(() => import('./pages/WorkIntellieplay.jsx'))
const WorkIndex = lazy(() => import('./pages/WorkIndex.jsx'))
const AboutOurStory = lazy(() => import('./pages/AboutOurStory.jsx'))
const AboutHowWeWork = lazy(() => import('./pages/AboutHowWeWork.jsx'))
const AboutStandards = lazy(() => import('./pages/AboutStandards.jsx'))
const ProjectPage = lazy(() => import('./pages/ProjectPage.jsx'))
const DashboardSettingsInvites = lazy(() => import('./pages/DashboardSettingsInvites.jsx'))
const FinanceTracker = lazy(() => import('./pages/FinanceTracker.jsx'))
const MunicipalityDirectory = lazy(() => import('./pages/MunicipalityDirectory.jsx'))
const Blacknight = lazy(() => import('./pages/Blacknight.jsx'))
const BookAudit = lazy(() => import('./pages/BookAudit.jsx'))
const IncludedHealthBrand = lazy(() => import('./pages/IncludedHealthBrand.jsx'))
const ElonRoomCanvas = lazy(() => import('./pages/ElonRoomCanvas.jsx'))
const DemoPage = lazy(() => import('./demo/DemoPage.jsx'))
const TenantSignupPage = lazy(() => import('./pages/TenantSignupPage.jsx'))
const R65LiveThread = lazy(() => import('./pages/R65LiveThread.jsx'))
const ConradFoundation = lazy(() => import('./pages/ConradFoundation.jsx'))
const ConradFoundation2 = lazy(() => import('./pages/ConradFoundation2.jsx'))
const OutreachTracker = lazy(() => import('./pages/OutreachTracker.jsx'))
const MissionWaterGame = lazy(() => import('./pages/MissionWaterGame.jsx'))
// NOTE: SpaceAvailableGame import + routes removed 2026-06-22 — its file was untracked
// (another workstream's WIP) and broke the Vercel production build (could not resolve
// ./pages/SpaceAvailableGame.jsx from git). Re-add together with the committed file.
const MissionWaterPlatform = lazy(() => import('./pages/MissionWaterPlatform.jsx'))
const MissionWaterLive = lazy(() => import('./pages/MissionWaterLive.jsx'))
const MissionWaterOffering = lazy(() => import('./pages/MissionWaterOffering.jsx'))
const MissionWaterLetsTalk = lazy(() => import('./pages/LetsTalk.jsx'))
const HolisticBalance = lazy(() => import('./pages/HolisticBalance.jsx'))
const AOMStats = lazy(() => import('./pages/AOMStats.jsx'))
const V2Home = lazy(() => import('./pages/V2Home.jsx'))
const HigherOrbitsPitch = lazy(() => import('./pages/HigherOrbitsPitch.jsx'))
const HigherOrbitsPitchAZCT = lazy(() => import('./pages/HigherOrbitsPitchAZCT.jsx'))
const AIHoursLearning = lazy(() => import('./pages/AIHoursLearning.jsx'))
const AIHoursAdmin = lazy(() => import('./pages/AIHoursAdmin.jsx'))
const SupportWish = lazy(() => import('./pages/SupportWish.jsx'))
const SupportAdmin = lazy(() => import('./pages/SupportAdmin.jsx'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const Marketplace = lazy(() => import('./pages/Marketplace.jsx'))
const AIGuide = lazy(() => import('./pages/AIGuide.jsx'))
// corner:files-in-app R79-f2 — local demo of the ProjectFileReader primitive.
const ReaderDemo = lazy(() => import('./dashboard/pages/ReaderDemo.jsx'))
// corner:files-in-app R79-f3 — local demo of the FilesPanel primitive
// (rail-shaped panel + reader modal), mounted against ambition-mechanical by
// default; ?slug=<project-slug> overrides.
import './index.css'

function ConstructionRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/#construction', { replace: true })
    // After navigation, scroll to the section
    setTimeout(() => {
      const el = document.getElementById('construction')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 500)
  }, [navigate])
  return <App />
}

function BrandRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/brand/v5', { replace: true })
  }, [navigate])
  return null
}

// Old shell URLs (/cv3, /cv4, /cvg, the legacy mission room) land on the same
// room in the live dashboard.
function LegacyProjectRedirect() {
  const { projectId } = useParams()
  return <Navigate to={projectId ? `/dashboard/projects/${encodeURIComponent(projectId)}/chat` : '/dashboard'} replace />
}
function LegacyMissionRedirect() {
  const { missionSlug } = useParams()
  return <Navigate to={missionSlug ? `/dashboard/mission/${encodeURIComponent(missionSlug)}` : '/dashboard'} replace />
}

function DealBankRedirect() {
  useEffect(() => {
    // 301 redirect to the new sourcing.directory location
    window.location.href = 'https://sourcing.directory/space-rising-v2/deal-bank'
  }, [])
  return null
}

// AuthGuard: checks the Convex session before rendering dashboard routes
// (corner:retire-supabase R3). No stored token means /login; a token whose
// identity read fails (offline) lets the shell render read-only rather than
// bouncing a signed-in person out. First-time users go to /onboarding; the
// onboarded flag lives in users.preferences (users:viewer.onboarded).
// Public demo routes (like /corner/hero-poc) bypass auth and render for all users.
function AuthGuard({ children }) {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  // Public routes that render without auth (design POCs, public demos, etc.)
  const PUBLIC_ROUTES = ['/corner/hero-poc']
  const publicCv6Fixture = window.location.pathname === '/dashboard'
    && new URLSearchParams(window.location.search).get('demo') === 'global-motion'
  const isPublicRoute = PUBLIC_ROUTES.includes(window.location.pathname) || publicCv6Fixture

  useEffect(() => {
    // If this is a public route, skip auth entirely and render.
    if (isPublicRoute) {
      setAuthed(true)
      setChecked(true)
      return
    }

    let cancelled = false
    let initialSettled = false

    const handleSession = async (session) => {
      if (cancelled) return
      if (session && session.degraded) {
        // Token stored, identity read failed (offline or the deployment is
        // unreachable). Render the shell; the data hooks show their own stale
        // and offline states, and the next session event re-runs this check.
        setAuthed(true)
        setChecked(true)
        return
      }
      if (session && session.user) {
        // Seeded accounts must pick a real password first (users.mustChangePassword).
        if (isTempPassword(session.user)) {
          setChecked(true)
          setAuthed(false)
          navigate('/change-password', { replace: true })
          return
        }
        // QA Mode: force onboarding for testing the new-user experience.
        // corner-qa-active = QA mode on. corner-qa-completed = just finished onboarding, show dashboard.
        // "Return to AOM" clears both. World switcher sets corner-qa-active.
        if (sessionStorage.getItem('corner-qa-active') === 'true' &&
            sessionStorage.getItem('corner-qa-completed') !== 'true') {
          setChecked(true)
          setAuthed(true)
          navigate('/onboarding/voice', { replace: true })
          return
        }

        // Onboarding status: the preferences flag, a world membership, or the
        // local marker from a just-finished onboarding.
        const meta = session.user?.user_metadata || {}
        let isOnboarded =
          meta.onboarded === true ||
          meta.has_completed_onboarding === true ||
          (meta.world && meta.world.trim().length > 0) ||
          localStorage.getItem('corner-onboarded') === 'true'

        // Self-heal: a person who belongs to a world has been through setup even
        // if the flag was never written. Write it so this check does not repeat.
        if (!isOnboarded && session.user.worldSlug) {
          isOnboarded = true
          localStorage.setItem('corner-onboarded', 'true')
          updateUserPreferences({ onboarded: true, has_completed_onboarding: true }).catch(() => {})
        }

        if (!isOnboarded) {
          // First-time user -- send to voice onboarding before dashboard
          setChecked(true)
          setAuthed(false)
          navigate('/onboarding/voice', { replace: true })
        } else {
          setAuthed(true)
          setChecked(true)
        }
      } else {
        // No session -- redirect to login.
        setAuthed(false)
        setChecked(true)
        navigate('/login', { replace: true })
      }
    }

    const settleInitial = (session) => {
      if (initialSettled || cancelled) return
      initialSettled = true
      handleSession(session)
    }

    // Resolve once immediately. A missing token settles as signed out without a
    // network round trip; a stored token asks users:viewer once, with a timer so
    // a hung identity read can never leave the boot skeleton up forever.
    if (!hasSession()) {
      settleInitial(null)
    } else {
      const initialTimer = window.setTimeout(() => {
        // Still waiting on the identity read: render with what we have. The
        // listener below re-checks the moment the session store changes.
        settleInitial({ user: null, degraded: true })
      }, 4000)
      getSession()
        .then((session) => {
          window.clearTimeout(initialTimer)
          settleInitial(session)
        })
        .catch(() => {
          window.clearTimeout(initialTimer)
          settleInitial({ user: null, degraded: true })
        })
    }

    const unsubscribe = onAuthStateChange((session) => {
      if (!initialSettled) settleInitial(session)
      else handleSession(session)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [navigate])

  if (!checked) {
    return <DashboardBootSkeleton />
  }

  return authed ? children : null
}

// ─── TEST MODE BANNER ────────────────────────────────────────────────────────
// Renders a fixed top strip when VITE_DASHBOARD_MODE=test (set on the lab
// Vercel project only). Patrik always knows which surface he's on.
// corner:test-dashboard R1 (design v2: pulsing dot, LAB pill, tight copy)
function TestModeBanner() {
  const { pathname } = useLocation()
  if (import.meta.env.VITE_DASHBOARD_MODE !== 'test') return null
  // Hide on the public marketing preview pages so they review clean (it never shows on real prod anyway).
  if (pathname === '/r5' || pathname === '/r6' || pathname === '/taste' || pathname === '/r4' || pathname === '/r38' || pathname === '/home-v2' || pathname.startsWith('/versions') || pathname === '/work' || pathname.startsWith('/work/') || pathname.startsWith('/services/') || pathname.startsWith('/about/')) return null
  return (
    <>
      <style>{`
        @keyframes _tb_pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes _tb_ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '32px',
        zIndex: 99999,
        background: '#0A0D1A',
        borderBottom: '1px solid rgba(255,79,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 1px 0 rgba(255,79,0,0.15), 0 2px 16px rgba(0,0,0,0.4)',
      }}>
        {/* Left: live dot + LAB pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Pulsing live dot */}
          <div style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: '#FF4F00',
              animation: '_tb_pulse 2s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: '#FF4F00',
              animation: '_tb_ring 2s ease-out infinite',
            }} />
          </div>
          {/* LAB pill */}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#FF4F00',
            background: 'rgba(255,79,0,0.12)',
            border: '1px solid rgba(255,79,0,0.3)',
            borderRadius: '3px',
            padding: '1px 6px',
            lineHeight: 1,
          }}>
            LAB
          </span>
        </div>

        {/* Center: TEST DASHBOARD label */}
        <span style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#fff',
          whiteSpace: 'nowrap',
        }}>
          TEST DASHBOARD
        </span>

        {/* Right: prod link */}
        <a
          href="https://aheadofmarket.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            fontWeight: 400,
            letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.4)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          → prod
        </a>
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TestModeBanner />
      <SystemToastProvider>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomeR6Baby />} />
          <Route path="/slider" element={<AOMStudioHome />} />
          <Route path="/r38" element={<HomeR38Preview />} />
          <Route path="/home-options" element={<HomeLayoutOptions />} />
          <Route path="/r7" element={<HomeAOM2026 />} />
          <Route path="/home-v1" element={<App />} />
          <Route path="/about" element={<App />} />
          <Route path="/home-v2" element={<V2Home />} />
          <Route path="/r4" element={<HomeR4Preview />} />
          <Route path="/r38" element={<HomeR38Preview />} />
          <Route path="/r5" element={<HomeR5Preview />} />
          <Route path="/r6" element={<HomeR6Baby />} />
          <Route path="/services/brand-film" element={<ServiceBrandFilm />} />
          <Route path="/services/web-build" element={<ServiceWebBuild />} />
          <Route path="/services/strategy" element={<ServiceStrategy />} />
          <Route path="/services/documentary" element={<ServiceDocumentary />} />
          <Route path="/work/construction" element={<WorkConstruction />} />
          <Route path="/work/tech-saas" element={<WorkTechSaas />} />
          <Route path="/work/nonprofit" element={<WorkNonprofit />} />
          <Route path="/work/isa-energy" element={<WorkISAEnergy />} />
          <Route path="/work/included-health" element={<WorkIncludedHealth />} />
          <Route path="/work/ambition-mechanical" element={<WorkAmbitionMechanical />} />
          <Route path="/work/space-rising" element={<WorkSpaceRising />} />
          <Route path="/work/brandon-wiley" element={<WorkBrandonWiley />} />
          <Route path="/work/virtu-hospitality" element={<WorkVirtuHospitality />} />
          <Route path="/work/pala" element={<WorkPala />} />
          <Route path="/work/kohrs" element={<WorkKohrs />} />
          <Route path="/work/intelliplay" element={<WorkIntellieplay />} />
          <Route path="/work" element={<WorkIndex />} />
          <Route path="/about/our-story" element={<AboutOurStory />} />
          <Route path="/about/how-we-work" element={<AboutHowWeWork />} />
          <Route path="/about/standards" element={<AboutStandards />} />
          <Route path="/taste" element={<HomeR6Taste />} />
          <Route path="/versions" element={<VersionsGallery />} />
          <Route path="/versions/superside" element={<VSuperside />} />
          <Route path="/versions/showcase-lens" element={<VShowcaseLens />} />
          <Route path="/versions/paradigms" element={<VParadigms />} />
          <Route path="/versions/bento" element={<VBento />} />
          <Route path="/versions/flim" element={<VFlim />} />
          <Route path="/versions/scroll-site" element={<VScrollSite />} />
          <Route path="/versions/horizontal" element={<VHorizontal />} />
          <Route path="/versions/scroll-story" element={<VScrollStory />} />
          <Route path="/versions/editorial" element={<VEditorial />} />
          <Route path="/versions/gear-float" element={<VGearFloat />} />
          <Route path="/versions/act-stage" element={<VActStage />} />
          <Route path="/versions/gear-turn" element={<VGearTurn />} />
          <Route path="/versions/density" element={<VDensity />} />
          <Route path="/versions/cinematic-glass" element={<VCinematicGlass />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
          <Route path="/scribe" element={<LiveScribe />} />
          <Route path="/construction" element={<ConstructionRedirect />} />
          <Route path="/brand" element={<BrandRedirect />} />
          <Route path="/brand/v5" element={<BrandGuidelinesV4 />} />
          <Route path="/brand/v4" element={<BrandRedirect />} />
          <Route path="/brands" element={<BrandsHub />} />
          <Route path="/brands/ambition" element={<AmbitionBrandGuidelinesV2 />} />
          <Route path="/brands/ambition/v1" element={<AmbitionBrandGuidelines />} />
          <Route path="/brands/ambition/performance" element={<AmbitionPerformance />} />
          <Route path="/brands/ambition/performance/v2" element={<AmbitionPerformanceV2 />} />
          <Route path="/brands/included-health" element={<IncludedHealthBrand />} />
          <Route path="/brands/s3c" element={<S3CBrand />} />
          <Route path="/brands/v2v" element={<V2VBrand />} />
          <Route path="/brands/valor" element={<ValorBrand />} />
          <Route path="/brands/artlink" element={<ArtlinkBrand />} />
          <Route path="/brands/artlink/pitch" element={<ArtlinkSitePitch />} />
          <Route path="/brands/space-rising" element={<SpaceRisingBrand />} />
          <Route path="/space-rising/deal-bank" element={<DealBankRedirect />} />
          <Route path="/space-rising/deal-bank/completed" element={<SpaceRisingDealBankCompleted />} />
          <Route path="/space-rising/deal-bank/admin" element={<SpaceRisingDealBankAdmin />} />
          <Route path="/social" element={<Social />} />
          <Route path="/research/hvac-ads-arizona" element={<ResearchHVAC />} />
          <Route path="/briefs" element={<BriefsHub />} />
          <Route path="/briefs/ai-advisory" element={<BriefAIAdvisory />} />
          <Route path="/briefs/partnerships" element={<BriefPartnerships />} />
          <Route path="/briefs/masterplan" element={<BriefMasterplan />} />
          <Route path="/briefs/security" element={<BriefSecurity />} />
          <Route path="/briefs/competitors" element={<BriefCompetitors />} />
          <Route path="/briefs/velocity" element={<BriefVelocity />} />
          <Route path="/briefs/sprint-plan" element={<BriefSprintPlan />} />
          <Route path="/briefs/fullscreen-site" element={<BriefFullscreenSite />} />
          <Route path="/briefs/ideas-tracker" element={<BriefIdeasTracker />} />
          <Route path="/briefs/audit-onboarding" element={<BriefAuditOnboarding />} />
          <Route path="/briefs/roi-calculator" element={<BriefROICalculator />} />
          <Route path="/briefs/web-design-upgrade" element={<BriefWebDesignUpgrade />} />
          <Route path="/briefs/ambition-sections" element={<BriefAmbitionSections />} />
          <Route path="/briefs/ambition-linkedin" element={<BriefAmbitionLinkedIn />} />
          <Route path="/briefs/ambition-market-strategy" element={<BriefAmbitionStrategy />} />
          <Route path="/briefs/isa-energy-shoot-script" element={<ISAShootScript />} />
          <Route path="/briefs/isa-energy-brand-bible" element={<ISABrandBible />} />
          <Route path="/briefs/:slug" element={<BriefPage />} />
          <Route path="/audit/test" element={<AuditTest />} />
          <Route path="/ideas" element={<IdeasTracker />} />
          <Route path="/guides" element={<GuidesHub />} />
          <Route path="/guides/ambition-crown" element={<GuideAmbitionCrown />} />
          <Route path="/guides/ambition-memorial-tower" element={<GuideAmbitionMemorialTower />} />
          <Route path="/roi-calculator" element={<ROICalculator />} />
          <Route path="/case-study" element={<CaseStudy />} />
          <Route path="/ai/gemma-4" element={<Gemma4Brief />} />
          <Route path="/ai/gemma-4/gemini" element={<Gemma4BriefGemini />} />
          <Route path="/ai/gemma-4/deepseek" element={<Gemma4BriefDeepseek />} />
          <Route path="/book" element={<BookAudit />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/ai-guide" element={<AIGuide />} />
          <Route path="/corner" element={<CornerSurgeHomepage />} />
          <Route path="/corner/classic" element={<Corner />} />
          <Route path="/corner/hero-poc" element={<CornerAsciiHeroPoc />} />
          <Route path="/corner/surge-preview" element={<CornerSurgeHomepage />} />
          <Route path="/corner/book" element={<BookCorner />} />
          <Route path="/corner/hero-poc" element={<CornerAsciiHeroPoc />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/elon-room" element={<ElonRoomCanvas />} />
          <Route path="/design/r65-live-thread" element={<R65LiveThread />} />
          <Route path="/ConradFoundation" element={<ConradFoundation />} />
          <Route path="/conradfoundation" element={<ConradFoundation />} />
          <Route path="/Conradfoundation" element={<ConradFoundation />} />
          <Route path="/conrad-foundation" element={<ConradFoundation />} />
          <Route path="/conrad" element={<ConradFoundation />} />
          <Route path="/nancy" element={<ConradFoundation />} />
          <Route path="/conradfoundation2" element={<ConradFoundation2 />} />
          <Route path="/missionwater" element={<MissionWaterGame />} />
          <Route path="/MissionWaterGame" element={<MissionWaterGame />} />
          <Route path="/mission-water-game" element={<MissionWaterGame />} />
          <Route path="/MissionWaterPlatform" element={<MissionWaterPlatform />} />
          <Route path="/missionwaterplatform" element={<MissionWaterPlatform />} />
          <Route path="/platform" element={<MissionWaterPlatform />} />
          <Route path="/MissionWaterLive" element={<MissionWaterLive />} />
          <Route path="/missionwaterlive" element={<MissionWaterLive />} />
          <Route path="/missionwater/live" element={<MissionWaterLive />} />
          <Route path="/MissionWaterOffering" element={<MissionWaterOffering />} />
          <Route path="/missionwateroffering" element={<MissionWaterOffering />} />
          <Route path="/mission-water-offering" element={<MissionWaterOffering />} />
          <Route path="/missionwater/offering" element={<MissionWaterOffering />} />
          <Route path="/missionwater/lets-talk" element={<MissionWaterLetsTalk />} />
          <Route path="/stats" element={<AOMStats />} />
          <Route path="/hb" element={<HolisticBalance />} />
          <Route path="/holistic-balance" element={<HolisticBalance />} />
          <Route path="/higher-orbits" element={<Navigate to="/higherorbits" replace />} />
          <Route path="/higherorbits" element={<HigherOrbitsPitchAZCT />} />
          <Route path="/finance" element={<FinanceTracker />} />
          <Route path="/directory" element={<MunicipalityDirectory />} />
          <Route path="/artlink" element={<ArtlinkBrand />} />
          <Route path="/artlink-pitch" element={<ArtlinkSitePitch />} />
          <Route path="/blacknight" element={<Blacknight />} />
          <Route path="/ai-hours" element={<AIHoursLearning />} />
          <Route path="/ai-hours/admin" element={<AIHoursAdmin />} />
          <Route path="/support" element={<SupportWish />} />
          <Route path="/support/admin" element={<SupportAdmin />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/outreach" element={<OutreachTracker />} />
          <Route path="/:tenantSlug/signup" element={<TenantSignupPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/onboarding/voice" element={<OnboardingVoice />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          {/* corner:retire-supabase: the CV3 / CV4 / CVG shells and the legacy
              mission room are deleted (they read the retired backend). Their
              paths redirect to the live CV6 dashboard below so old links and
              worker phonebooks still land somewhere real. */}
          <Route path="/reports" element={<AuthGuard><ReportsEditor /></AuthGuard>} />
          <Route path="/reports/:client" element={<AuthGuard><ReportsEditor /></AuthGuard>} />
          <Route path="/dashboard" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          <Route path="/dashboard/welcome" element={<AuthGuard><DashboardWelcome /></AuthGuard>} />
          <Route path="/dashboard/settings/invites" element={<AuthGuard><DashboardSettingsInvites /></AuthGuard>} />
          <Route path="/dashboard/project/:projectId" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          {/* R21a: canonical per-project chat URL ("/dashboard/projects/<slug>/chat"). */}
          <Route path="/dashboard/projects/:projectId/chat" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          <Route path="/dashboard/projects/:projectId" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          {/* R21 fix: mission + agent URLs now open in CV6, not legacy R3b.
              Legacy preview preserved at /dashboard/legacy/mission/:slug. */}
          <Route path="/dashboard/mission/:missionSlug" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          <Route path="/dashboard/missions/:missionSlug/chat" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          <Route path="/dashboard/agent/:agentId" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          <Route path="/dashboard/agents/:agentId/chat" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          <Route path="/dashboard/chat/agent/:agentId" element={<AuthGuard><DashboardSurface /></AuthGuard>} />
          {/* corner:mission-rooms R5 — missions index. Demotes the task table
              by giving missions their own primary navigation surface. */}
          <Route path="/dashboard/missions" element={<AuthGuard><MissionsIndex /></AuthGuard>} />
          <Route path="/dashboard/legacy/mission/:missionSlug" element={<LegacyMissionRedirect />} />
          <Route path="/dashboard/v2" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/cv3" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/cleo/workspaces" element={<AuthGuard><CleoWorkspacesIndex /></AuthGuard>} />
          <Route path="/dashboard/cleo/workspaces/:slug" element={<AuthGuard><CleoWorkspaceDetail /></AuthGuard>} />
          {/* Legacy shell paths: redirect into the live dashboard. */}
          {/* corner:files-in-app R79-f2 — reader primitive demo. No AuthGuard
              so the demo renders against bundled fixtures without needing a
              signed-in session. Real production wiring lands in R79-f3. */}
          <Route path="/cv4/reader-demo" element={<ReaderDemo />} />
          <Route path="/cv4" element={<Navigate to="/dashboard" replace />} />
          <Route path="/cv4/project/:projectId" element={<LegacyProjectRedirect />} />
          <Route path="/cv4/projects/:projectId" element={<LegacyProjectRedirect />} />
          <Route path="/cv4/projects/:projectId/chat" element={<LegacyProjectRedirect />} />
          <Route path="/cvg" element={<Navigate to="/dashboard" replace />} />
          <Route path="/cvg/project/:projectId" element={<LegacyProjectRedirect />} />
          <Route path="/cvg/projects/:projectId" element={<LegacyProjectRedirect />} />
          <Route path="/cvg/projects/:projectId/chat" element={<LegacyProjectRedirect />} />
          {/* corner:corner-ui-cv6 — /cv6 component gallery. Public (no user
              data) so it renders frictionlessly for design review. */}
          <Route path="/cv6" element={<CV6Gallery />} />
          {/* corner:corner-ui-cv6 — /cv6kit route removed (Patrik 2026-06-22): the design
              mockups now mount on the live /dashboard surface itself; no parallel preview. */}
          <Route path="/cv3" element={<Navigate to="/dashboard" replace />} />
          <Route path="/cv3/project/:projectId" element={<LegacyProjectRedirect />} />
          <Route path="/cv3/projects/:projectId/chat" element={<LegacyProjectRedirect />} />
          <Route path="/cv3/projects/:projectId" element={<LegacyProjectRedirect />} />
        </Routes>
      </Suspense>
      </SystemToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
