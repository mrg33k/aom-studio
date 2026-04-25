// R75-r65-g: synthetic step chain that progresses while a reply is in flight.
//
// The /design/r65-live-thread mockup drives steps off a real timing array
// (step N goes active → next step takes over after N ms). Production only
// rendered a single static step for the whole wait, which felt like radio
// silence. This hook returns an evolving steps array suitable to feed into
// <StepThread/>: as elapsed time passes, earlier steps flip to 'done' and
// later steps become 'in_progress', up to a final "Still working…" that
// stays active until the reply lands and `active` flips false.
//
// When the real assistant reply lands, the calling component swaps this
// synthetic chain out for the real one (baseline steps from
// scripts/relay-respond.py + any rich steps emitted via relay-emit-step.py)
// rendered above the assistant bubble in settled-dim form.
//
// c76e17f9: isFirstTurn=false skips "Read your message" (turn 1 already
// established context) and starts from "Reading context", giving the chain
// a continuation feel rather than resetting to the beginning each turn.
//
import { useEffect, useState } from 'react'

const PHASES_FIRST_TURN = [
  { offset: 0,    text: 'Read your message' },
  { offset: 1500, text: 'Reading context' },
  { offset: 3500, text: 'Composing reply' },
  { offset: 7500, text: 'Still working' },
]

const PHASES_CONTINUING = [
  { offset: 0,    text: 'Reading context' },
  { offset: 2000, text: 'Composing reply' },
  { offset: 6000, text: 'Still working' },
]

const TICK_MS = 250

export default function useSyntheticChain(active, isFirstTurn = true) {
  const [, forceTick] = useState(0)
  const [startTs, setStartTs] = useState(null)

  useEffect(() => {
    if (!active) {
      setStartTs(null)
      return
    }
    setStartTs(Date.now())
    const id = setInterval(() => forceTick(t => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [active])

  if (!active || !startTs) return []

  const PHASES = isFirstTurn ? PHASES_FIRST_TURN : PHASES_CONTINUING
  const elapsed = Date.now() - startTs
  const steps = []
  for (let i = 0; i < PHASES.length; i++) {
    if (elapsed < PHASES[i].offset) break
    const next = PHASES[i + 1]
    const isLatest = !next || elapsed < next.offset
    steps.push({
      id: `synthetic-${i}`,
      step_index: i,
      text: PHASES[i].text,
      status: isLatest ? 'in_progress' : 'done',
    })
  }
  return steps
}
