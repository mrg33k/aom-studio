import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import BrandGuidelines from './pages/BrandGuidelines.jsx'
import './index.css'

const Dashboard = lazy(() => import('./dashboard/Dashboard.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#0A0A08] flex items-center justify-center text-[#F5F0EB] font-mono text-sm">Loading...</div>}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/brand" element={<BrandGuidelines />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
