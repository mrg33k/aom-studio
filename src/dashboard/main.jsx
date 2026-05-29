import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CornerV3 from './CornerV3.jsx'
import { SystemToastProvider } from './SystemToast.jsx'
import '../index.css'

// 2026-05-29: SystemToastProvider wraps the app so the toast-based
// failure surfaces (upload errors, etc.) actually render. Before this
// the provider was defined but never mounted — `useSystemToast` fell
// through to its module-level fallback, which silently no-ops if no
// listener registered, so upload errors disappeared and Patrik saw
// "nothing happens" when uploads failed.
ReactDOM.createRoot(document.getElementById('dashboard-root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SystemToastProvider>
        <CornerV3 />
      </SystemToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
