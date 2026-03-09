import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import BrandGuidelines from './pages/BrandGuidelines.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/brand" element={<BrandGuidelines />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
