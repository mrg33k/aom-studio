import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import './ConradFoundation.css'

export default function ConradFoundation() {
  const [nancyVideoReady, setNancyVideoReady] = useState(false)
  const [platformTab, setPlatformTab] = useState('cohort')
  const [scrollProgress, setScrollProgress] = useState(0)

  // Set noindex meta tag on mount
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  // Handle scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const totalScroll = docHeight - windowHeight
      setScrollProgress(totalScroll > 0 ? scrollTop / totalScroll : 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Video placeholder path — will be replaced by Cleo's cut at task 42e4e77c
  // In the meantime, use a still from the Space Rising footage archive
  const nancyVideoPath = '/ConradFoundation/nancy-sample-tile-v1.mp4'
  const nancyStillPath = '/ConradFoundation/nancy-still-placeholder.jpg'

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  }

  return (
    <div className="conrad-foundation">
      {/* SECTION 1: THE HOOK */}
      <section className="section section-1-hook">
        <motion.div
          className="hook-container"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <h1 className="hook-text">What happens when there's no more water?</h1>
          <p className="hook-attribution">— Nancy Conrad, Founding Chairman, Conrad Foundation</p>
        </motion.div>
        <motion.div
          className="scroll-cue"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </motion.div>
      </section>

      {/* SECTION 2: THE HERO TILE (NANCY) */}
      <section className="section section-2-hero">
        <div className="hero-content">
          <motion.div
            className="hero-eyebrow"
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            Meet the person asking.
          </motion.div>

          <motion.div
            className="hero-video-container"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <video
              className="hero-video"
              controls
              poster={nancyStillPath}
              onCanPlay={() => setNancyVideoReady(true)}
            >
              <source src={nancyVideoPath} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </motion.div>

          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <p>Twenty years.</p>
            <p>Students from Alabama to Afghanistan.</p>
            <p>Critical thinking as diplomacy.</p>
            <p className="hero-text-emphasis">This is the program she wants to scale.</p>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3: CURRICULUM LINE */}
      <section className="section section-3-curriculum">
        <motion.div
          className="curriculum-container"
          initial="hidden"
          whileInView="visible"
          variants={containerVariants}
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="curriculum-grid">
            {/* Water Card */}
            <motion.div className="curriculum-card" variants={itemVariants}>
              <div className="card-hook">What happens when there's no more water?</div>
              <div className="card-status">The first.</div>
              <div className="card-label">Water</div>
            </motion.div>

            {/* Space Card */}
            <motion.div className="curriculum-card curriculum-card-future" variants={itemVariants}>
              <div className="card-hook placeholder">—</div>
              <div className="card-status">Space — coming next</div>
              <div className="card-label">In Nancy's words</div>
            </motion.div>

            {/* Plants Card */}
            <motion.div className="curriculum-card curriculum-card-future" variants={itemVariants}>
              <div className="card-hook placeholder">—</div>
              <div className="card-status">Plants — coming next</div>
              <div className="card-label">In Nancy's words</div>
            </motion.div>

            {/* Future Card */}
            <motion.div className="curriculum-card curriculum-card-future" variants={itemVariants}>
              <div className="card-hook placeholder">—</div>
              <div className="card-status">TBD with Nancy</div>
              <div className="card-label">In Nancy's words</div>
            </motion.div>
          </div>

          <motion.div
            className="curriculum-text"
            variants={itemVariants}
          >
            <p>Mission Water Master Classes is the first. AOM owns the system that makes the next eight feel like one program.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 4: THE PLATFORM */}
      <section className="section section-4-platform">
        <motion.div
          className="platform-container"
          initial="hidden"
          whileInView="visible"
          variants={containerVariants}
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="platform-demo">
            <div className="platform-header">
              <div className="platform-logo">Mission Water</div>
              <div className="platform-nav">
                <button
                  className={`platform-tab ${platformTab === 'cohort' ? 'active' : ''}`}
                  onClick={() => setPlatformTab('cohort')}
                >
                  Cohort
                </button>
                <button
                  className={`platform-tab ${platformTab === 'schedule' ? 'active' : ''}`}
                  onClick={() => setPlatformTab('schedule')}
                >
                  Schedule
                </button>
                <button
                  className={`platform-tab ${platformTab === 'expert' ? 'active' : ''}`}
                  onClick={() => setPlatformTab('expert')}
                >
                  Experts
                </button>
                <button
                  className={`platform-tab ${platformTab === 'deliverables' ? 'active' : ''}`}
                  onClick={() => setPlatformTab('deliverables')}
                >
                  Submit
                </button>
              </div>
            </div>

            <div className="platform-content">
              {platformTab === 'cohort' && (
                <div className="platform-view">
                  <h3>What happens when there's no more water?</h3>
                  <p className="platform-tagline">A 6-week intensive on water security, efficiency, and innovation.</p>
                  <div className="platform-stats">
                    <div className="stat">
                      <div className="stat-label">Cohort Size</div>
                      <div className="stat-value">50 Students</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Duration</div>
                      <div className="stat-value">6 Weeks</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Sessions</div>
                      <div className="stat-value">12 Live + Archived</div>
                    </div>
                  </div>
                </div>
              )}

              {platformTab === 'schedule' && (
                <div className="platform-view">
                  <h3>Session Schedule</h3>
                  <div className="schedule-list">
                    <div className="schedule-item">
                      <div className="schedule-week">Week 1</div>
                      <div className="schedule-title">Water Systems & Climate</div>
                      <div className="schedule-date">Live Tuesday 6pm PT</div>
                    </div>
                    <div className="schedule-item">
                      <div className="schedule-week">Week 2</div>
                      <div className="schedule-title">Urban Water Challenges</div>
                      <div className="schedule-date">Live Tuesday 6pm PT</div>
                    </div>
                    <div className="schedule-item">
                      <div className="schedule-week">Week 3-6</div>
                      <div className="schedule-title">Expert Interviews + Dilemmas</div>
                      <div className="schedule-date">On-demand + Live Q&A</div>
                    </div>
                  </div>
                </div>
              )}

              {platformTab === 'expert' && (
                <div className="platform-view">
                  <h3>Expert Faculty</h3>
                  <div className="expert-list">
                    <div className="expert-item">
                      <div className="expert-name">Nancy Conrad</div>
                      <div className="expert-role">Founding Chairman, Conrad Foundation</div>
                    </div>
                    <div className="expert-item">
                      <div className="expert-name">Regional Water Directors</div>
                      <div className="expert-role">From Colorado River Compact agencies</div>
                    </div>
                    <div className="expert-item">
                      <div className="expert-name">Innovation Leaders</div>
                      <div className="expert-role">Water tech & policy experts</div>
                    </div>
                  </div>
                </div>
              )}

              {platformTab === 'deliverables' && (
                <div className="platform-view">
                  <h3>Student Deliverables</h3>
                  <p>Students propose solutions to real water challenges. Upload your project here:</p>
                  <div className="deliverable-upload">
                    <div className="upload-placeholder">
                      <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p>Drop your project file here</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <motion.div
            className="platform-text"
            variants={itemVariants}
          >
            <p>Built for Water. Reusable for every masterclass after. Same shell hosts Space, Plants, and every course she launches.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 5: EXPERT FILMING */}
      <section className="section section-5-filming">
        <motion.div
          className="filming-container"
          initial="hidden"
          whileInView="visible"
          variants={containerVariants}
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="filming-split">
            {/* Left: Bad Zoom */}
            <motion.div className="filming-side filming-bad" variants={itemVariants}>
              <div className="filming-label">Standard Zoom Recording</div>
              <div className="zoom-mock">
                <div className="zoom-frame">
                  <div className="zoom-participant">
                    <div className="zoom-avatar"></div>
                  </div>
                  <div className="zoom-chat-stub"></div>
                </div>
              </div>
              <div className="zoom-meta">Washed out. Awkward framing. Gone after the live.</div>
            </motion.div>

            {/* Right: MasterClass */}
            <motion.div className="filming-side filming-good" variants={itemVariants}>
              <div className="filming-label">AOM Expert Capture</div>
              <div className="masterclass-frame">
                <img src={nancyStillPath} alt="Nancy Conrad — Expert capture sample" />
              </div>
              <div className="masterclass-meta">Lit. Framed. Archived. Reusable forever.</div>
            </motion.div>
          </div>

          <motion.div
            className="filming-text"
            variants={itemVariants}
          >
            <p>Recorded once. Used forever. When the expert library outlives the live cast, the program compounds.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 6: CRITICAL THINKING DILEMMA */}
      <section className="section section-6-dilemma">
        <motion.div
          className="dilemma-container"
          initial="hidden"
          whileInView="visible"
          variants={containerVariants}
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.div className="dilemma-card" variants={itemVariants}>
            <div className="dilemma-title">Phoenix Farmers vs. Vegas Casinos</div>
            <div className="dilemma-question">Both pull from the Colorado River. Whose claim is stronger?</div>
            <div className="dilemma-action">
              <span className="dilemma-arrow">→</span> Argue both sides. 90 seconds. Class votes.
            </div>
          </motion.div>

          <motion.div
            className="dilemma-text"
            variants={itemVariants}
          >
            <p>Critical thinking isn't a theme. It's the engine. Every session ends with a dilemma students have to defend in front of each other.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION 7: SPONSOR ATTACHABLE */}
      <section className="section section-7-sponsors">
        <motion.div
          className="sponsors-container"
          initial="hidden"
          whileInView="visible"
          variants={containerVariants}
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.div className="sponsors-intro" variants={itemVariants}>
            <p>You fund the foundation through partnerships. Each pillar below is something a sponsor can put their name on.</p>
          </motion.div>

          <div className="sponsors-grid">
            <motion.div className="sponsor-item" variants={itemVariants}>
              <div className="sponsor-label">Sponsor the platform</div>
              <div className="sponsor-tag">Pillar 1</div>
              <div className="sponsor-value">Permanent infrastructure for every course</div>
            </motion.div>

            <motion.div className="sponsor-item" variants={itemVariants}>
              <div className="sponsor-label">Sponsor an expert</div>
              <div className="sponsor-tag">Pillar 2</div>
              <div className="sponsor-value">A library asset that lives beyond the cohort</div>
            </motion.div>

            <motion.div className="sponsor-item" variants={itemVariants}>
              <div className="sponsor-label">Sponsor a course</div>
              <div className="sponsor-tag">Pillar 4</div>
              <div className="sponsor-value">Their name on a hook the next decade of kids remembers</div>
            </motion.div>

            <motion.div className="sponsor-item" variants={itemVariants}>
              <div className="sponsor-label">Sponsor a dilemma series</div>
              <div className="sponsor-tag">Pillar 5</div>
              <div className="sponsor-value">Their domain becomes a session module</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* SECTION 8: CLOSE */}
      <section className="section section-8-close">
        <motion.div
          className="close-container"
          initial="hidden"
          whileInView="visible"
          variants={containerVariants}
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.div className="close-text" variants={itemVariants}>
            <p className="close-p1">We didn't bring you a deck.</p>
            <p className="close-p2">We brought you this page.</p>
          </motion.div>

          <motion.div className="close-next" variants={itemVariants}>
            <p>Next step: one week with Patrik and the AOM team. We come back with this same page, filled in for Water, Space, and Plants.</p>
          </motion.div>

          <motion.div className="close-footer" variants={itemVariants}>
            <p>Built for Nancy Conrad — 2026-05-13</p>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
