import { useState, useRef } from 'react'

// Right-click / long-press context menu state for message bubbles.
// Coordinates stay near the cursor; touch devices use a 600ms long-press.
export default function useThreadMsgMenu() {
  const [msgMenu, setMsgMenu] = useState(null) // { x, y, message }
  const longPressRef = useRef(null)

  const openMsgMenu = (e, message) => {
    e.preventDefault()
    e.stopPropagation()
    setMsgMenu({ x: e.clientX, y: e.clientY, message })
  }

  const startLongPress = (e, message) => {
    if (!e.touches?.length) return
    const t = e.touches[0]
    const x = t.clientX, y = t.clientY
    longPressRef.current = setTimeout(() => {
      setMsgMenu({ x, y, message })
    }, 600)
  }

  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
    longPressRef.current = null
  }

  return { msgMenu, setMsgMenu, openMsgMenu, startLongPress, cancelLongPress }
}
