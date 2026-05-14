import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CornerV3 from './CornerV3.jsx'
import '../index.css'

ReactDOM.createRoot(document.getElementById('dashboard-root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CornerV3 />
    </BrowserRouter>
  </React.StrictMode>,
)
