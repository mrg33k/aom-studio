// useLongPress -- fires after LONG_PRESS_DELAY ms of stationary touch
// Cancels if finger moves more than MOVE_THRESHOLD px (allows normal scroll)
// Returns touch event props to spread onto any element

import { useRef, useCallback } from 'react'

const LONG_PRESS_DELAY = 500
const MOVE_THRESHOLD = 10

export function useLongPress(callback, delay = LONG_PRESS_DELAY) {
  const timerRef = useRef(null)
  const startPosRef = useRef(null)
  const firedRef = useRef(false)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    startPosRef.current = { x: touch.clientX, y: touch.clientY }
    firedRef.current = false
    const cx = touch.clientX
    const cy = touch.clientY
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      callback({ clientX: cx, clientY: cy })
    }, delay)
  }, [callback, delay])

  const onTouchMove = useCallback((e) => {
    if (!startPosRef.current || !timerRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - startPosRef.current.x)
    const dy = Math.abs(touch.clientY - startPosRef.current.y)
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) cancel()
  }, [cancel])

  const onTouchEnd = useCallback((e) => {
    cancel()
    // Suppress the tap/click that follows a long-press
    if (firedRef.current) {
      e.preventDefault()
      firedRef.current = false
    }
  }, [cancel])

  const onTouchCancel = cancel

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }
}
