import React from 'react'
import ReactDOM from 'react-dom/client'
import GameDashboard from './GameDashboard.jsx'
import '../index.css'

ReactDOM.createRoot(document.getElementById('dashboard-root')).render(
  <React.StrictMode>
    <GameDashboard />
  </React.StrictMode>,
)
