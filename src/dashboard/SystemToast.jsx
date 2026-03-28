import React, { useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Info, XCircle, X } from 'lucide-react'

// ─── Toast Context ────────────────────────────────────────────────────────────
const ToastContext = React.createContext(null)

// ─── Internal store (module-level so useSystemToast works outside React tree) ──
let _showToast = null
export function useSystemToast() {
  const ctx = React.useContext(ToastContext)
  if (ctx) return { showToast: ctx.showToast }
  // fallback: module-level ref (works when called outside provider)
  return {
    showToast: (message, type = 'info', duration = 5000) => {
      if (_showToast) _showToast(message, type, duration)
    },
  }
}

// ─── Config per type ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  info: {
    icon: Info,
    accent: '#4A9EFF',
    bg: 'rgba(10, 25, 50, 0.92)',
  },
  warning: {
    icon: AlertTriangle,
    accent: '#F59E0B',
    bg: 'rgba(20, 15, 5, 0.92)',
  },
  error: {
    icon: XCircle,
    accent: '#EF4444',
    bg: 'rgba(20, 5, 5, 0.92)',
  },
}

// ─── Single Toast ─────────────────────────────────────────────────────────────
function Toast({ id, message, type, onDismiss }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info
  const Icon = cfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.88, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: cfg.bg,
        border: `1px solid ${cfg.accent}33`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        maxWidth: '340px',
        minWidth: '240px',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '8px',
        bottom: '8px',
        width: '3px',
        borderRadius: '0 2px 2px 0',
        background: cfg.accent,
        opacity: 0.9,
      }} />

      {/* Icon */}
      <Icon
        size={16}
        style={{ color: cfg.accent, flexShrink: 0, marginTop: '1px' }}
      />

      {/* Message */}
      <span style={{
        flex: 1,
        fontSize: '13px',
        lineHeight: '1.45',
        color: '#E8EEF8',
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontWeight: 400,
      }}>
        {message}
      </span>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(id)}
        style={{
          background: 'none',
          border: 'none',
          padding: '1px',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.35)',
          flexShrink: 0,
          marginTop: '1px',
          lineHeight: 1,
        }}
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

// ─── Provider + Container ─────────────────────────────────────────────────────
let _idCounter = 0

export function SystemToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++_idCounter
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  // expose module-level reference
  _showToast = showToast

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <SystemToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Container (renders toasts into a portal) ─────────────────────────────────
export function SystemToastContainer({ toasts: externalToasts, onDismiss: externalDismiss } = {}) {
  // When used standalone (not inside provider), manage own state
  const [localToasts, setLocalToasts] = useState([])
  const timersRef = useRef({})

  const isStandalone = externalToasts === undefined

  const dismiss = useCallback((id) => {
    if (!isStandalone) { externalDismiss(id); return }
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setLocalToasts(prev => prev.filter(t => t.id !== id))
  }, [isStandalone, externalDismiss])

  // When standalone, wire up module-level _showToast
  React.useEffect(() => {
    if (!isStandalone) return
    _showToast = (message, type = 'info', duration = 5000) => {
      const id = ++_idCounter
      setLocalToasts(prev => [...prev, { id, message, type }])
      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => {
          setLocalToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
      }
    }
    return () => { _showToast = null }
  }, [isStandalone])

  const toasts = isStandalone ? localToasts : externalToasts

  return createPortal(
    <div style={{
      position: 'fixed',
      top: '64px', // below nav
      right: '16px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto', position: 'relative' }}>
            <Toast
              id={t.id}
              message={t.message}
              type={t.type}
              onDismiss={dismiss}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

export default SystemToastContainer
