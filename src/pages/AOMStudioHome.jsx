import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'
import BrandMark from '../components/home/BrandMark'
import BriefModal from '../components/BriefModal'
import { navigationItems, portfolioCards } from './aomSiteData'
import './aomStudioHome.css'

function useBodyLock(active) {
  useEffect(() => {
    if (!active) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [active])
}

function SiteHeader({ onBrief }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="aom-studio-header">
      <a className="aom-studio-brand" href="/" aria-label="Ahead of Market home">
        <BrandMark kind="mono" color="currentColor" style={{ width: 24, height: 24 }} />
        <span>Ahead of Market</span>
      </a>
      <span className="aom-studio-location">Phoenix, AZ · Studio</span>
      <button className="aom-studio-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open site menu">
        <Menu size={18} /> <span>Menu</span>
      </button>
      {menuOpen && (
        <div className="aom-studio-menu" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="aom-studio-menu-top">
            <span className="aom-studio-menu-kicker">Ahead of Market</span>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close site menu"><X size={22} /></button>
          </div>
          <nav>
            <a href="#work" onClick={() => setMenuOpen(false)}>Our work <ArrowRight size={18} /></a>
            <a href="#studio" onClick={() => setMenuOpen(false)}>Our studio <ArrowRight size={18} /></a>
            <button type="button" onClick={() => { setMenuOpen(false); onBrief() }}>Work with us <ArrowUpRight size={18} /></button>
          </nav>
          <p>Brand, web, and film for companies ready to be seen differently.</p>
        </div>
      )}
    </header>
  )
}

function WorkRail({ onOpen }) {
  const railRef = useRef(null)
  const [active, setActive] = useState(0)

  const move = (direction) => {
    const next = Math.max(0, Math.min(portfolioCards.length - 1, active + direction))
    setActive(next)
    railRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <section id="work" className="aom-studio-work" aria-labelledby="work-heading">
      <div className="aom-studio-section-head">
        <div>
          <p className="aom-studio-kicker">Selected work · 01—06</p>
          <h2 id="work-heading">The work<br /><em>speaks first.</em></h2>
        </div>
        <div className="aom-studio-rail-controls">
          <button type="button" onClick={() => move(-1)} disabled={active === 0} aria-label="Previous project"><ArrowLeft size={18} /></button>
          <span>{String(active + 1).padStart(2, '0')} / {String(portfolioCards.length).padStart(2, '0')}</span>
          <button type="button" onClick={() => move(1)} disabled={active === portfolioCards.length - 1} aria-label="Next project"><ArrowRight size={18} /></button>
        </div>
      </div>
      <div className="aom-studio-rail" ref={railRef} onScroll={(event) => {
        const cardWidth = event.currentTarget.firstElementChild?.offsetWidth || 1
        setActive(Math.min(portfolioCards.length - 1, Math.round(event.currentTarget.scrollLeft / cardWidth)))
      }}>
        {portfolioCards.map((card, index) => (
          <article className={`aom-studio-card aom-studio-card--${card.tone}`} key={card.id}>
            <button type="button" className="aom-studio-card-hit" onClick={() => onOpen(card)} aria-label={`Open ${card.title} project details`}>
              <span className="aom-studio-card-image"><img src={card.image} alt="" loading={index > 1 ? 'lazy' : 'eager'} /></span>
              <span className="aom-studio-card-copy">
                <span className="aom-studio-kicker">{card.eyebrow}</span>
                <strong>{card.title}</strong>
                <span>{card.category}</span>
                <span className="aom-studio-card-arrow"><ArrowUpRight size={18} /></span>
              </span>
            </button>
          </article>
        ))}
      </div>
      <p className="aom-studio-scroll-hint">Swipe or use the arrows to explore</p>
    </section>
  )
}

function ProjectOverlay({ card, onClose, onBrief }) {
  useBodyLock(Boolean(card))
  useEffect(() => {
    if (!card) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [card, onClose])
  if (!card) return null
  return (
    <div className="aom-studio-overlay" role="dialog" aria-modal="true" aria-labelledby="project-title">
      <button className="aom-studio-overlay-close" type="button" onClick={onClose}><ArrowLeft size={17} /> Back to work</button>
      <div className="aom-studio-overlay-hero">
        <img src={card.image} alt="" />
        <div />
        <div className="aom-studio-overlay-title"><span className="aom-studio-kicker">{card.eyebrow}</span><h2 id="project-title">{card.title}</h2></div>
      </div>
      <div className="aom-studio-overlay-body">
        <p className="aom-studio-overlay-lede">{card.category}</p>
        <div className="aom-studio-overlay-facts"><span><small>Scope</small>Brand + digital</span><span><small>Based in</small>Phoenix, Arizona</span></div>
        <p>We make the thing people notice first. Then we build the system that makes noticing you inevitable.</p>
        <a className="aom-studio-button" href={card.href}>View project <ArrowUpRight size={17} /></a>
        <button className="aom-studio-text-button" type="button" onClick={onBrief}>Start a conversation <ArrowRight size={17} /></button>
      </div>
    </div>
  )
}

export default function AOMStudioHome() {
  const [selectedCard, setSelectedCard] = useState(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const openBrief = () => { setSelectedCard(null); setBriefOpen(true) }

  useEffect(() => {
    document.title = 'Ahead of Market — We make companies impossible to ignore'
    return () => { document.title = 'Ahead of Market' }
  }, [])

  return (
    <div className="aom-studio-site">
      <SiteHeader onBrief={openBrief} />
      <main>
        <section className="aom-studio-hero" aria-labelledby="hero-heading">
          <p className="aom-studio-kicker">Independent creative studio · Phoenix, AZ</p>
          <h1 id="hero-heading">We make companies <em>impossible to ignore.</em></h1>
          <div className="aom-studio-hero-bottom"><p>Brand, web, and film for companies with somewhere to go.</p><a href="#work">See the work <ArrowDown /></a></div>
        </section>
        <WorkRail onOpen={setSelectedCard} />
        <section id="studio" className="aom-studio-studio" aria-labelledby="studio-heading">
          <p className="aom-studio-kicker">Our studio · 02</p>
          <h2 id="studio-heading">You bring the ambition.<br /><em>We make it visible.</em></h2>
          <div className="aom-studio-studio-grid"><p>Most companies do not need another vendor. They need a point of view, a sharper story, and someone who can carry it all the way through.</p><p>That is what Ahead of Market is built for. One senior team across the ideas, the images, and the places your audience meets you.</p></div>
        </section>
        <section className="aom-studio-cta"><p className="aom-studio-kicker">Have something worth seeing?</p><h2>Let’s make<br /><em>some noise.</em></h2><button className="aom-studio-button" type="button" onClick={openBrief}>Work with us <ArrowUpRight size={17} /></button></section>
      </main>
      <footer className="aom-studio-footer"><span>© Ahead of Market</span><span>Phoenix, Arizona</span><a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a></footer>
      <ProjectOverlay card={selectedCard} onClose={() => setSelectedCard(null)} onBrief={openBrief} />
      <BriefModal isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
    </div>
  )
}

function ArrowDown() { return <ArrowRight size={17} className="aom-studio-arrow-down" /> }
