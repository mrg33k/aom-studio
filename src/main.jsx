import React, { lazy, Suspense, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { onAuthStateChange, isTempPassword } from './dashboard/lib/auth.js'
import { supabase } from './dashboard/lib/supabase.js'
import App from './App.jsx'
// Everything else lazy-loaded so non-home routes don't bloat the main bundle.
const Login = lazy(() => import('./pages/Login.jsx'))
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'))
const BrandsHub = lazy(() => import('./pages/BrandsHub.jsx'))
const S3CBrand = lazy(() => import('./pages/S3CBrand.jsx'))
const V2VBrand = lazy(() => import('./pages/V2VBrand.jsx'))
const ValorBrand = lazy(() => import('./pages/ValorBrand.jsx'))
const SpaceRisingBrand = lazy(() => import('./pages/SpaceRisingBrand.jsx'))
const AmbitionBrandGuidelines = lazy(() => import('./pages/AmbitionBrandGuidelines.jsx'))
const AmbitionBrandGuidelinesV2 = lazy(() => import('./pages/AmbitionBrandGuidelinesV2.jsx'))
const Social = lazy(() => import('./pages/Social.jsx'))
const ResearchHVAC = lazy(() => import('./pages/ResearchHVAC.jsx'))
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
const CornerV3 = lazy(() => import('./dashboard/CornerV3.jsx'))
const CornerV4 = lazy(() => import('./dashboard/CornerV4.jsx'))
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
    navigate('/brand/v4', { replace: true })
  }, [navigate])
  return null
}

// AuthGuard: checks Supabase session before rendering dashboard routes.
// Falls through immediately if Supabase is not configured (localhost without env vars).
// First-time users are redirected to /onboarding. Checks metadata + DB for robustness.
function AuthGuard({ children }) {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    // onAuthStateChange fires immediately with current session, then on changes.
    const unsubscribe = onAuthStateChange(async (session) => {
      if (session) {
        // Admin-created accounts must change their temp password first
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

        // Check onboarding status: metadata flags, localStorage, OR world slug exists
        const meta = session.user?.user_metadata || {}
        let isOnboarded =
          meta.onboarded === true ||
          meta.has_completed_onboarding === true ||
          (meta.world && meta.world.trim().length > 0) ||
          localStorage.getItem('corner-onboarded') === 'true'

        // Fallback: if metadata says no but user already has agents in DB, skip onboarding.
        // This catches cleared cookies + metadata write failures.
        if (!isOnboarded && supabase) {
          try {
            const { data } = await supabase
              .from('agent_status')
              .select('id, client_id')
              .limit(1)
            if (data && data.length > 0) {
              isOnboarded = true
              // Self-heal: fix the metadata so this check doesn't repeat
              localStorage.setItem('corner-onboarded', 'true')
              supabase.auth.updateUser({
                data: { onboarded: true, has_completed_onboarding: true, world: data[0].client_id }
              }).catch(() => {})
            }
          } catch {
            // DB check failed, fall through to onboarding
          }
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
        if (!supabase) {
          // Supabase not configured (local dev without env vars) -- allow through.
          setAuthed(true)
          setChecked(true)
        } else {
          // Supabase configured, no session -- redirect to login.
          setChecked(true)
          navigate('/login', { replace: true })
        }
      }
    })
    return unsubscribe
  }, [navigate])

  if (!checked) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0A0F1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #E85D26', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return authed ? children : null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center text-[#8A847C] font-body text-sm">Loading...</div>}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/r4" element={<HomeR4Preview />} />
          <Route path="/construction" element={<ConstructionRedirect />} />
          <Route path="/brand" element={<BrandRedirect />} />
          <Route path="/brand/v4" element={<BrandGuidelinesV4 />} />
          <Route path="/brands" element={<BrandsHub />} />
          <Route path="/brands/ambition" element={<AmbitionBrandGuidelinesV2 />} />
          <Route path="/brands/ambition/v1" element={<AmbitionBrandGuidelines />} />
          <Route path="/brands/ambition/performance" element={<AmbitionPerformance />} />
          <Route path="/brands/ambition/performance/v2" element={<AmbitionPerformanceV2 />} />
          <Route path="/brands/included-health" element={<IncludedHealthBrand />} />
          <Route path="/brands/s3c" element={<S3CBrand />} />
          <Route path="/brands/v2v" element={<V2VBrand />} />
          <Route path="/brands/valor" element={<ValorBrand />} />
          <Route path="/brands/space-rising" element={<SpaceRisingBrand />} />
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
          <Route path="/corner" element={<Corner />} />
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
          <Route path="/finance" element={<FinanceTracker />} />
          <Route path="/directory" element={<MunicipalityDirectory />} />
          <Route path="/blacknight" element={<Blacknight />} />
          <Route path="/:tenantSlug/signup" element={<TenantSignupPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/onboarding/voice" element={<OnboardingVoice />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          {/* /dashboard now renders CV4. CV3 is reachable at /dashboard/cv3 for fallback. */}
          <Route path="/dashboard" element={<AuthGuard><CornerV4 /></AuthGuard>} />
          <Route path="/dashboard/welcome" element={<AuthGuard><DashboardWelcome /></AuthGuard>} />
          <Route path="/dashboard/settings/invites" element={<AuthGuard><DashboardSettingsInvites /></AuthGuard>} />
          <Route path="/dashboard/project/:projectId" element={<AuthGuard><CornerV4 /></AuthGuard>} />
          {/* R21a: canonical per-project chat URL ("/dashboard/projects/<slug>/chat"). */}
          <Route path="/dashboard/projects/:projectId/chat" element={<AuthGuard><CornerV4 /></AuthGuard>} />
          <Route path="/dashboard/projects/:projectId" element={<AuthGuard><CornerV4 /></AuthGuard>} />
          <Route path="/dashboard/v2" element={<AuthGuard><CornerV3 /></AuthGuard>} />
          <Route path="/dashboard/cv3" element={<AuthGuard><CornerV3 /></AuthGuard>} />
          <Route path="/dashboard/cleo/workspaces" element={<AuthGuard><CleoWorkspacesIndex /></AuthGuard>} />
          <Route path="/dashboard/cleo/workspaces/:slug" element={<AuthGuard><CleoWorkspaceDetail /></AuthGuard>} />
          {/* CV4 WD-40 design playground — mirrors /dashboard, iterates toward convention-first shell. */}
          <Route path="/cv4" element={<AuthGuard><CornerV4 /></AuthGuard>} />
          <Route path="/cv4/project/:projectId" element={<AuthGuard><CornerV4 /></AuthGuard>} />
          <Route path="/cv4/projects/:projectId" element={<AuthGuard><CornerV4 /></AuthGuard>} />
          <Route path="/cv4/projects/:projectId/chat" element={<AuthGuard><CornerV4 /></AuthGuard>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
