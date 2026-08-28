import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import BrandMark from '../components/home/BrandMark'
import BriefModal from '../components/BriefModal'
import { loopCards } from './aomSiteData'
import './aomStudioHome.css'

const DRIFT = 0.38
const esc = (value) => String(value).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))
function DisplayText({ value }) {
  const parts = String(value).split(/(\[\[.*?\]\]|\{\{.*?\}\})/g).filter(Boolean)
  return <>{parts.map((part, index) => part.startsWith('[[') ? <mark key={index}>{part.slice(2, -2)}</mark> : part.startsWith('{{') ? <u key={index}>{part.slice(2, -2)}</u> : part)}</>
}

function CardContent({ card, onOpen }) {
  if (card.kind === 'story' || card.kind === 'ask') return <><div className="loop-tags">{card.tags?.map((tag, index) => <span key={tag.t} className={`loop-tag loop-tag--${tag.s}${index === 0 ? ' loop-tag--fill' : ''}`}>{tag.t}</span>)}</div><p className="loop-display"><DisplayText value={card.display} /></p>{card.kind === 'ask' && <div className="loop-options">{card.options.map((option, index) => <button type="button" className="loop-opt" style={{ '--i': index }} key={option.t} onClick={(event) => { event.stopPropagation(); onOpen(4) }}><b>{option.t}</b><i>{option.p}</i></button>)}</div>}</>
  if (card.kind === 'work' || card.kind === 'team') return <>{card.image && <img className="loop-shot" src={card.image} alt="" loading="lazy" />}<div className="loop-veil" /><div className="loop-foot"><span className="loop-metric">{card.metric || 'Small on purpose'}</span><strong>{card.title}</strong><small>{card.meta || 'Ahead of Market · Phoenix'}</small></div></>
  if (card.kind === 'quote') return <><span className="loop-quote-mark">”</span><p className="loop-quote">{card.quote}</p><div className="loop-rule" /><small>{card.who}</small></>
  if (card.kind === 'service') return <><span className="loop-vertical">{card.service}</span><div className="loop-foot"><strong className="loop-wordmark">{card.service}</strong><h3>{card.headline}</h3><ul>{card.points.map((point) => <li key={point}>{point}</li>)}</ul></div></>
  if (card.kind === 'post') return <><div className="loop-foot loop-post"><small>{card.meta}</small><h3>{card.headline}</h3></div></>
  return <><div className="loop-foot loop-cta"><h3>{card.headline}</h3><p>{card.body}</p><span>Start here <ArrowRight size={15} /></span></div></>
}

function Card({ card, index, active, onOpen }) {
  return <article className={`loop-card loop-card--${card.kind}`} data-index={index} data-live={active ? '' : undefined} style={{ '--card-tint': card.tint || '#e4e1d7', '--hi-bg': card.hi || '#0c0c0c', '--hi-fg': card.hion || '#f5f4f0' }}>
    <div className="loop-card-button" role="button" tabIndex={0} onClick={() => onOpen(index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(index) } }} aria-label={`Open ${card.title}`}>
      {card.step && <div className="loop-step"><b>{String(card.step).padStart(2, '0')}</b><span>{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < card.step ? 'on' : ''} />)}</span><b>05</b></div>}
      <CardContent card={card} onOpen={onOpen} />
      <span className="loop-edge" /><span className="loop-open">Open</span>
    </div>
  </article>
}

function ProjectOverlay({ card, onClose, onBrief, onNext }) {
  useEffect(() => {
    if (!card) return undefined
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous }
  }, [card, onClose])
  if (!card) return null
  const index = loopCards.indexOf(card)
  const next = loopCards[(index + 1) % loopCards.length]
  return <div className="loop-overlay" role="dialog" aria-modal="true" aria-labelledby="loop-overlay-title">
    <button type="button" className="loop-back" onClick={onClose}><ArrowRight size={15} /> Back</button>
    <div className="loop-overlay-hero">{card.image && <img src={card.image} alt="" />}<div className="loop-overlay-wash" /><div><small>{card.label} · Ahead of Market</small><h2 id="loop-overlay-title">{card.kind === 'quote' ? `“${card.quote}”` : card.headline || card.title}</h2></div></div>
    <div className="loop-overlay-body"><p className="loop-overlay-lede">{card.body}</p>{card.metric && <div className="loop-facts"><span>Result <b>{card.metric}</b></span><span>Format <b>{card.meta}</b></span></div>}{card.points && <ul className="loop-overlay-points">{card.points.map((point) => <li key={point}>{point}</li>)}</ul>}<p>We make the thing people notice first, then build the system that keeps it moving.</p>{card.kind === 'cta' ? <button type="button" className="loop-overlay-cta" onClick={onBrief}>Start a brief</button> : <button type="button" className="loop-overlay-next" onClick={() => onNext(next)}>Next · {next.title} <ArrowRight size={15} /></button>}<button type="button" className="loop-overlay-back-link" onClick={onClose}>Back to the loop</button></div>
    <button type="button" className="loop-overlay-x" onClick={onClose} aria-label="Close project details"><X size={18} /></button>
  </div>
}

export default function AOMStudioHome() {
  const railRef = useRef(null)
  const cardRefs = useRef([])
  const ambientRefs = useRef([])
  const motion = useRef({ x: 0, velocity: DRIFT, target: null, drag: null, active: -1, total: 0, positions: [], widths: [], gap: 30 })
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState(null)
  const [briefOpen, setBriefOpen] = useState(false)

  useEffect(() => {
    const state = motion.current
    const measure = () => {
      const height = Math.max(250, Math.min(460, (railRef.current?.clientHeight || 480) - 30))
      const base = Math.round(height * .72)
      state.gap = window.innerWidth < 760 ? 18 : Math.round(30 * height / 428)
      state.widths = loopCards.map((card) => Math.round(base * ({ story: 1.18, ask: 1.24, work: 1.34, quote: 1.12, service: .84, team: 1, post: 1.06, cta: .9 }[card.kind] || 1)))
      let total = 0
      state.positions = state.widths.map((width) => { const position = total + width / 2; total += width + state.gap; return position })
      state.total = total
      cardRefs.current.forEach((element, index) => { if (!element) return; element.style.width = `${state.widths[index]}px`; element.style.height = `${height}px`; element.style.marginTop = `${-height / 2}px`; element.style.marginLeft = `${-state.widths[index] / 2}px` })
    }
    const wrap = (distance) => { if (!state.total) return distance; const normalized = ((distance % state.total) + state.total) % state.total; return normalized > state.total / 2 ? normalized - state.total : normalized }
    const setCurrent = (index) => { if (state.active === index) return; state.active = index; setActive(index) }
    const render = () => {
      const half = window.innerWidth / 2 + (state.widths[0] || 300)
      let closest = 0; let best = Infinity
      cardRefs.current.forEach((element, index) => {
        if (!element) return
        const distance = wrap(state.positions[index] - state.x); const amount = Math.abs(distance)
        if (amount < best) { best = amount; closest = index }
        if (amount > half) { element.style.visibility = 'hidden'; return }
        const normalized = distance / ((state.widths[0] || 300) + state.gap)
        const fade = Math.min(1, Math.max(0, (amount - ((state.widths[0] || 300) + state.gap) * .34) / (((state.widths[0] || 300) + state.gap) * 2)))
        element.style.visibility = 'visible'; element.style.opacity = String(1 - fade * .7); element.style.zIndex = String(100 - Math.round(amount)); element.style.transform = `translate3d(${distance}px,${fade * 14}px,${-fade * 90}px) rotateY(${-normalized * 4.2}deg) scale(${1 - fade * .07})`
      })
      setCurrent(closest)
    }
    const frame = () => {
      if (state.drag) { state.velocity = state.velocity * .6 + (state.x - state.drag.lastX) * .4; state.drag.lastX = state.x }
      else if (state.target !== null) { const distance = wrap(state.target - state.x); if (Math.abs(distance) < .4) { state.x = state.target; state.target = null; state.velocity = DRIFT } else { state.x += distance * .085; state.velocity = distance * .085 } }
      else { state.x += state.velocity; state.velocity += (DRIFT - state.velocity) * .033 }
      render(); state.raf = requestAnimationFrame(frame)
    }
    const onWheel = (event) => { if (selected) return; event.preventDefault(); state.target = null; const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY; state.velocity = Math.max(-70, Math.min(70, state.velocity + delta * .09)) }
    const rail = railRef.current
    const onDown = (event) => { if (event.button !== 0) return; rail.setPointerCapture(event.pointerId); state.target = null; state.drag = { start: event.clientX, origin: state.x, lastX: state.x, moved: 0 } }
    const onMove = (event) => { if (!state.drag) return; const delta = event.clientX - state.drag.start; state.drag.moved = Math.max(state.drag.moved, Math.abs(delta)); state.x = state.drag.origin - delta }
    const onUp = (event) => { if (!state.drag) return; const wasClick = state.drag.moved < 6; const card = event.target.closest?.('.loop-card'); const index = card ? Number(card.dataset.index) : -1; state.drag = null; if (wasClick && index >= 0) { if (index === state.active) setSelected(loopCards[index]); else state.target = state.x + wrap(state.positions[index] - state.x) } }
    measure(); render(); state.raf = requestAnimationFrame(frame); window.addEventListener('resize', measure); window.addEventListener('wheel', onWheel, { passive: false }); rail.addEventListener('pointerdown', onDown); rail.addEventListener('pointermove', onMove); rail.addEventListener('pointerup', onUp); rail.addEventListener('pointercancel', onUp)
    const onKey = (event) => { if (selected) return; if (event.key === 'ArrowRight') state.target = state.x + wrap(state.positions[(state.active + 1) % loopCards.length] - state.x); if (event.key === 'ArrowLeft') state.target = state.x + wrap(state.positions[(state.active - 1 + loopCards.length) % loopCards.length] - state.x); if (event.key === 'Enter') setSelected(loopCards[state.active]) }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(state.raf); window.removeEventListener('resize', measure); window.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); rail.removeEventListener('pointerdown', onDown); rail.removeEventListener('pointermove', onMove); rail.removeEventListener('pointerup', onUp); rail.removeEventListener('pointercancel', onUp) }
  }, [selected])

  useEffect(() => { document.title = 'Ahead of Market — We make companies impossible to ignore' }, [])
  useEffect(() => {
    const next = ambientRefs.current[active % 2]
    const previous = ambientRefs.current[(active + 1) % 2]
    const card = loopCards[active]
    if (!next || !card) return
    next.style.backgroundImage = `radial-gradient(120% 90% at 50% 42%, ${card.tint || '#edeae2'}66 0%, ${card.tint || '#edeae2'}1c 44%, transparent 74%), linear-gradient(180deg, rgba(245,244,240,.42), rgba(245,244,240,.9))`
    next.dataset.on = ''
    previous?.removeAttribute('data-on')
  }, [active])
  const travelToKind = (kind) => { const target = loopCards.findIndex((card) => kind.includes(card.kind)); if (target >= 0) { const state = motion.current; state.target = state.x + (((state.positions[target] || 0) - state.x + state.total / 2) % state.total - state.total / 2) } }
  const openBrief = () => { setSelected(null); setBriefOpen(true) }
  return <div className="aom-loop-site"><div className="loop-ambient"><div className="loop-ambient-layer" ref={(element) => { ambientRefs.current[0] = element }} /><div className="loop-ambient-layer" ref={(element) => { ambientRefs.current[1] = element }} /></div><div className="loop-stage" ref={railRef}>
    <header className="loop-bar"><a href="/slider" className="loop-brand"><BrandMark kind="mono" color="currentColor" style={{ width: 20, height: 20 }} /> Ahead of Market</a><span className="loop-place">Phoenix, AZ · Studio</span><span className="loop-label">Marketing site · endless loop</span></header>
    <p className="loop-claim">We make companies impossible to ignore</p>
    <div className="loop-rail">{loopCards.map((card, index) => <div key={`${card.title}-${index}`} ref={(element) => { cardRefs.current[index] = element }} className="loop-card-shell"><Card card={card} index={index} active={index === active} onOpen={(cardIndex) => { if (cardIndex === active) setSelected(loopCards[cardIndex]); else motion.current.target = motion.current.x + (((motion.current.positions[cardIndex] || 0) - motion.current.x + motion.current.total / 2) % motion.current.total - motion.current.total / 2) }} /></div>)}</div>
    <footer className="loop-footbar"><span className="loop-museum-label"><i>{loopCards[active]?.label} · </i><b>{loopCards[active]?.title}</b></span><span className="loop-hint">Drag or scroll</span><span className="loop-ticks">{loopCards.map((card, index) => <button key={card.title} type="button" className={index === active ? 'on' : ''} onClick={() => { motion.current.target = motion.current.x + (((motion.current.positions[index] || 0) - motion.current.x + motion.current.total / 2) % motion.current.total - motion.current.total / 2) }} aria-label={`Go to ${card.title}`} />)}</span></footer>
  </div><nav className="loop-dock"><button className="loop-dock-mark" type="button" onClick={() => travelToKind(['story'])} aria-label="Ahead of Market home"><BrandMark kind="mono" color="white" style={{ width: 28, height: 28 }} /></button><button type="button" onClick={() => travelToKind(['work'])}>Our Work</button><button type="button" onClick={() => travelToKind(['story', 'service', 'team'])}>Our Studio</button><button type="button" className="solid" onClick={() => { const target = loopCards.findIndex((card) => card.kind === 'cta'); travelToKind(['cta']); setTimeout(() => setSelected(loopCards[target]), 450) }}>Work with us</button></nav><ProjectOverlay card={selected} onClose={() => setSelected(null)} onBrief={openBrief} onNext={(next) => setSelected(next)} /><BriefModal isOpen={briefOpen} onClose={() => setBriefOpen(false)} /></div>
}
