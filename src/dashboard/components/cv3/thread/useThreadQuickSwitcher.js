import { useState, useRef, useEffect } from 'react'

// Agent/project quick-switcher dropdown in the thread header.
// Closes on outside click while the dropdown is open.
export default function useThreadQuickSwitcher() {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)

  useEffect(() => {
    if (!switcherOpen) return
    const handleClick = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [switcherOpen])

  return { switcherOpen, setSwitcherOpen, switcherRef }
}
