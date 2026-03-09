import React, { lazy, Suspense, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import App from './App.jsx'
import BrandGuidelines from './pages/BrandGuidelines.jsx'
import BrandsHub from './pages/BrandsHub.jsx'
import AmbitionBrandGuidelines from './pages/AmbitionBrandGuidelines.jsx'
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#FDF6EC] flex items-center justify-center text-[#7A7267] font-body text-sm">Loading...</div>}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/construction" element={<ConstructionRedirect />} />
          <Route path="/brand" element={<BrandGuidelines />} />
          <Route path="/brands" element={<BrandsHub />} />
          <Route path="/brands/ambition" element={<AmbitionBrandGuidelines />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
