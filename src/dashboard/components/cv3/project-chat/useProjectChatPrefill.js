import { useEffect } from 'react'

// If a prefillMessage is handed in (e.g. from task cards), seed the input and
// clear the prefill, then focus the composer on the next animation frame.
export default function useProjectChatPrefill({
  prefillMessage,
  selectedProject,
  setInput,
  setPrefillMessage,
  inputRef,
}) {
  useEffect(() => {
    if (!prefillMessage || !selectedProject) return
    setInput(prefillMessage)
    setPrefillMessage(null)
    requestAnimationFrame(() => {
      inputRef?.current?.focus()
    })
  }, [prefillMessage, selectedProject, setInput, setPrefillMessage, inputRef])
}
