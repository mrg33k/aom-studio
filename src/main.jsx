import React, { lazy, Suspense, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import App from './App.jsx'
import BrandGuidelines from './pages/BrandGuidelines.jsx'
import BrandsHub from './pages/BrandsHub.jsx'
import AmbitionBrandGuidelines from './pages/AmbitionBrandGuidelines.jsx'
import AmbitionBrandGuidelinesV2 from './pages/AmbitionBrandGuidelinesV2.jsx'
import Social from './pages/Social.jsx'
import ResearchHVAC from './pages/ResearchHVAC.jsx'
import BrandGuidelinesV4 from './pages/BrandGuidelinesV4.jsx'
import BriefsHub from './pages/BriefsHub.jsx'
import BriefAIAdvisory from './pages/BriefAIAdvisory.jsx'
import BriefPartnerships from './pages/BriefPartnerships.jsx'
import BriefMasterplan from './pages/BriefMasterplan.jsx'
import BriefSecurity from './pages/BriefSecurity.jsx'
import BriefCompetitors from './pages/BriefCompetitors.jsx'
import BriefVelocity from './pages/BriefVelocity.jsx'
import BriefSprintPlan from './pages/BriefSprintPlan.jsx'
import BriefFullscreenSite from './pages/BriefFullscreenSite.jsx'
import BriefIdeasTracker from './pages/BriefIdeasTracker.jsx'
import BriefAuditOnboarding from './pages/BriefAuditOnboarding.jsx'
import BriefROICalculator from './pages/BriefROICalculator.jsx'
import BriefWebDesignUpgrade from './pages/BriefWebDesignUpgrade.jsx'
import BriefAmbitionSections from './pages/BriefAmbitionSections.jsx'
import BriefAmbitionLinkedIn from './pages/BriefAmbitionLinkedIn.jsx'
import AuditTest from './pages/AuditTest.jsx'
import IdeasTracker from './pages/IdeasTracker.jsx'
import GuidesHub from './pages/GuidesHub.jsx'
import GuideAmbitionCrown from './pages/GuideAmbitionCrown.jsx'
import GuideAmbitionMemorialTower from './pages/GuideAmbitionMemorialTower.jsx'
import ROICalculator from './pages/ROICalculator.jsx'
import CaseStudy from './pages/CaseStudy.jsx'
const BookAudit = lazy(() => import('./pages/BookAudit.jsx'))
import './index.css'

const Dashboard = lazy(() => import('./dashboard/Dashboard.jsx'))

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center text-[#8A847C] font-body text-sm">Loading...</div>}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/construction" element={<ConstructionRedirect />} />
          <Route path="/brand" element={<BrandRedirect />} />
          <Route path="/brand/v4" element={<BrandGuidelinesV4 />} />
          <Route path="/brands" element={<BrandsHub />} />
          <Route path="/brands/ambition" element={<AmbitionBrandGuidelinesV2 />} />
          <Route path="/brands/ambition/v1" element={<AmbitionBrandGuidelines />} />
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
          <Route path="/audit/test" element={<AuditTest />} />
          <Route path="/ideas" element={<IdeasTracker />} />
          <Route path="/guides" element={<GuidesHub />} />
          <Route path="/guides/ambition-crown" element={<GuideAmbitionCrown />} />
          <Route path="/guides/ambition-memorial-tower" element={<GuideAmbitionMemorialTower />} />
          <Route path="/roi-calculator" element={<ROICalculator />} />
          <Route path="/case-study" element={<CaseStudy />} />
          <Route path="/book" element={<BookAudit />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
