import React, { useState, useEffect } from 'react'
import './ConradFoundation.css'

export default function ConradFoundation() {
  const [platformTab, setPlatformTab] = useState('cohort')

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const nancyVideoPath = '/ConradFoundation/nancy-sample-tile-v1.mp4?v=2'
  const nancyStillPath = '/ConradFoundation/nancy-still-placeholder.jpg?v=2'
  const nancyMasterclassStill = '/ConradFoundation/nancy-expert-masterclass.jpg'
  const zoomMockupPath = '/ConradFoundation/zoom-mockup.jpg'

  return (
    <div className="bg-[#FDF6EC] text-[#0C0C0C] antialiased">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1 — THE HOOK (cream, left-aligned, type-only)
         ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen border-b border-[#0C0C0C]/12 flex items-center">
        <div className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-4 mb-8 md:mb-10">
            <span className="w-10 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
              Confidential · For Nancy Conrad · 2026
            </p>
          </div>
          <h1 className="font-display-serif text-[56px] sm:text-[72px] md:text-[112px] lg:text-[128px] leading-[0.92] tracking-[-0.025em] max-w-[1200px]">
            What happens when there's <em className="font-display-italic italic font-medium text-[#E85D26]">no more water?</em>
          </h1>
          <div className="mt-10 md:mt-14 max-w-md">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#0C0C0C]/55">
              Nancy Conrad
            </p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0C0C0C]/45 mt-1.5">
              Founding Chairman · Conrad Foundation
            </p>
          </div>
        </div>
        <div className="absolute bottom-8 left-6 md:left-12 flex items-center gap-3">
          <span className="w-6 h-px bg-[#0C0C0C]/35" />
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#0C0C0C]/45">Scroll</p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2 — HERO TILE (black, Nancy video)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#FDF6EC]/15 bg-[#0C0C0C] text-[#FDF6EC]">
        <div className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <span className="w-10 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
              Field report · Meet the person asking
            </p>
          </div>
          <h2 className="font-display-serif text-[44px] md:text-[72px] lg:text-[88px] leading-[0.95] tracking-[-0.025em] mb-12 md:mb-16 max-w-[1100px]">
            Meet the <em className="font-display-italic italic font-medium text-[#E85D26]">person</em> asking.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-8">
              <div className="aspect-[16/9] relative overflow-hidden border border-[#FDF6EC]/15 bg-black">
                <video
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster={nancyStillPath}
                >
                  <source src={nancyVideoPath} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#FDF6EC]/50 mt-4">
                Nancy Conrad · 90 seconds · Filmed by AOM
              </p>
            </div>

            <div className="lg:col-span-4 lg:pt-2">
              <ul className="border-t border-[#FDF6EC]/20">
                {[
                  ['01', 'Twenty years'],
                  ['02', 'Students from Alabama to Afghanistan'],
                  ['03', 'Critical thinking as diplomacy'],
                  ['04', 'The program she wants to scale'],
                ].map(([num, line]) => (
                  <li
                    key={num}
                    className="flex items-baseline gap-4 border-b border-[#FDF6EC]/20 py-5"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] shrink-0">
                      {num}
                    </span>
                    <span className="font-display-serif text-[20px] md:text-[22px] leading-[1.2] tracking-[-0.01em]">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3 — CURRICULUM LINE (cream, table-of-contents)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#0C0C0C]/12">
        <div className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 mb-7">
            <span className="w-10 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
              The series · Volume one of many
            </p>
          </div>
          <h2 className="font-display-serif text-[44px] md:text-[72px] lg:text-[88px] leading-[0.95] tracking-[-0.025em] mb-14 md:mb-16 max-w-[1100px]">
            One curriculum line. <em className="font-display-italic italic font-medium text-[#E85D26]">Water is just the first.</em>
          </h2>

          <div className="border-t-2 border-[#0C0C0C]">
            {[
              {
                num: '01',
                topic: 'Water',
                hook: 'What happens when there\'s no more water?',
                status: 'The first',
                live: true,
              },
              {
                num: '02',
                topic: 'Space',
                hook: 'In Nancy\'s words —',
                status: 'Coming next',
                live: false,
              },
              {
                num: '03',
                topic: 'Plants',
                hook: 'In Nancy\'s words —',
                status: 'Coming next',
                live: false,
              },
              {
                num: '04',
                topic: 'Open',
                hook: 'In Nancy\'s words —',
                status: 'TBD with Nancy',
                live: false,
              },
            ].map((row) => (
              <div
                key={row.num}
                className="border-b border-[#0C0C0C]/15 grid grid-cols-12 gap-x-6 py-7 md:py-9"
              >
                <div className="col-span-12 md:col-span-2 flex items-baseline gap-3 mb-3 md:mb-0">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26]">
                    {row.num}
                  </span>
                  <p className="font-display-serif text-[22px] md:text-[26px] tracking-[-0.015em]">
                    {row.topic}
                  </p>
                </div>
                <div className="col-span-12 md:col-span-8">
                  {row.live ? (
                    <p className="font-display-serif text-[26px] md:text-[38px] leading-[1.1] tracking-[-0.02em] text-[#0C0C0C]">
                      "{row.hook}"
                    </p>
                  ) : (
                    <p className="font-display-italic italic text-[22px] md:text-[28px] leading-[1.2] tracking-[-0.01em] text-[#0C0C0C]/40">
                      {row.hook}
                    </p>
                  )}
                </div>
                <div className="col-span-12 md:col-span-2 md:text-right flex md:block items-center mt-3 md:mt-2">
                  <p
                    className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${
                      row.live ? 'text-[#E85D26]' : 'text-[#0C0C0C]/45'
                    }`}
                  >
                    {row.status}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="font-display-serif text-[24px] md:text-[34px] leading-[1.25] tracking-[-0.015em] text-[#0C0C0C]/75 mt-14 md:mt-16 max-w-[900px]">
            Mission Water is the first. AOM owns the system that makes the next
            eight feel like <em className="font-display-italic italic text-[#E85D26]">one program.</em>
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4 — PLATFORM (black, clickable demo)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#FDF6EC]/15 bg-[#0C0C0C] text-[#FDF6EC]">
        <div className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 mb-7">
            <span className="w-10 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
              The platform · Pillar one
            </p>
          </div>
          <h2 className="font-display-serif text-[44px] md:text-[72px] lg:text-[88px] leading-[0.95] tracking-[-0.025em] mb-14 md:mb-16 max-w-[1100px]">
            Built for Water. Reusable for <em className="font-display-italic italic font-medium text-[#E85D26]">every masterclass after.</em>
          </h2>

          {/* Mock shell */}
          <div className="border border-[#FDF6EC]/15 bg-[#0C0C0C]">
            {/* Shell chrome */}
            <div className="flex items-center justify-between px-5 md:px-7 py-4 border-b border-[#FDF6EC]/15">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#FDF6EC]/55">
                conradfoundation.org / masterclass
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26]">
                Live preview
              </p>
            </div>

            {/* Tab nav */}
            <div className="flex flex-wrap gap-6 md:gap-10 px-5 md:px-7 pt-5 border-b border-[#FDF6EC]/15">
              {[
                ['cohort', 'cohort'],
                ['schedule', 'schedule'],
                ['expert', 'experts'],
                ['deliverables', 'submit'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPlatformTab(key)}
                  className={`pb-4 font-mono text-[11px] uppercase tracking-[0.28em] transition-colors relative ${
                    platformTab === key
                      ? 'text-[#E85D26]'
                      : 'text-[#FDF6EC]/55 hover:text-[#FDF6EC]'
                  }`}
                >
                  {label}
                  {platformTab === key && (
                    <span className="absolute left-0 right-0 -bottom-px h-px bg-[#E85D26]" />
                  )}
                </button>
              ))}
            </div>

            {/* Shell content */}
            <div className="px-5 md:px-10 py-10 md:py-14 min-h-[420px]">
              {platformTab === 'cohort' && (
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-5">
                    Cohort home · Mission Water · Spring 2026
                  </p>
                  <h3 className="font-display-serif text-[32px] md:text-[52px] leading-[1.0] tracking-[-0.02em] max-w-[900px] mb-12">
                    What happens when there's <em className="font-display-italic italic font-medium text-[#E85D26]">no more water?</em>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10">
                    {[
                      ['Cohort', '50 students'],
                      ['Duration', '6 weeks · 12 sessions'],
                      ['Distribution', 'Live + on-demand'],
                    ].map(([label, value]) => (
                      <div key={label} className="border-t-2 border-[#E85D26] pt-4">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#FDF6EC]/55 mb-2">
                          {label}
                        </p>
                        <p className="font-display-serif text-[28px] md:text-[34px] leading-[1.05] tracking-[-0.02em]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformTab === 'schedule' && (
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-5">
                    Six weeks · Twelve sessions
                  </p>
                  <div className="border-t border-[#FDF6EC]/20">
                    {[
                      ['01', 'Week 1', 'Water systems & climate', 'Tue · 6pm PT · Live'],
                      ['02', 'Week 2', 'Urban water — supply, scarcity, design', 'Tue · 6pm PT · Live'],
                      ['03', 'Week 3', 'Agriculture and the Colorado River', 'Tue · 6pm PT · Live'],
                      ['04', 'Week 4', 'Expert library — pre-recorded faculty', 'On-demand'],
                      ['05', 'Week 5', 'Student dilemmas & defense', 'Tue · 6pm PT · Live'],
                      ['06', 'Week 6', 'Showcase + deliverables', 'Live + livestream'],
                    ].map(([num, week, title, when]) => (
                      <div
                        key={num}
                        className="grid grid-cols-12 gap-x-4 border-b border-[#FDF6EC]/20 py-5"
                      >
                        <span className="col-span-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26]">
                          {num}
                        </span>
                        <p className="col-span-2 md:col-span-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#FDF6EC]/55">
                          {week}
                        </p>
                        <p className="col-span-9 md:col-span-6 font-display-serif text-[18px] md:text-[22px] leading-[1.2] tracking-[-0.01em]">
                          {title}
                        </p>
                        <p className="hidden md:block md:col-span-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#FDF6EC]/55 text-right">
                          {when}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformTab === 'expert' && (
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-5">
                    Expert library · Permanent assets
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                    {[
                      [
                        'Nancy Conrad',
                        'Founding Chairman · Conrad Foundation',
                        'Twenty years scaling STEM education across continents.',
                      ],
                      [
                        'Regional water director',
                        'Colorado River compact authority',
                        'The legal architecture behind every drop in the southwest.',
                      ],
                      [
                        'Water technologist',
                        'Industry · Innovation',
                        'Hard tradeoffs: agriculture, infrastructure, climate.',
                      ],
                      [
                        'Student alum',
                        'Conrad Challenge cohort',
                        'What it looks like when a teenager argues the science.',
                      ],
                    ].map(([name, role, body]) => (
                      <div key={name} className="border-t border-[#FDF6EC]/20 pt-5">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-3">
                          {role}
                        </p>
                        <h4 className="font-display-serif text-[24px] md:text-[28px] leading-[1.1] tracking-[-0.015em] mb-3">
                          {name}
                        </h4>
                        <p className="font-body text-[15px] text-[#FDF6EC]/70 leading-[1.6]">
                          {body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformTab === 'deliverables' && (
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-5">
                    Student deliverable · Upload
                  </p>
                  <h3 className="font-display-serif text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] max-w-[800px] mb-10">
                    Argue your case. <em className="font-display-italic italic font-medium text-[#E85D26]">Send the proof.</em>
                  </h3>
                  <div className="border-2 border-dashed border-[#FDF6EC]/25 px-8 py-12 md:py-16 text-center">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#FDF6EC]/55 mb-3">
                      Drop file · Video, doc, or deck
                    </p>
                    <p className="font-display-serif text-[20px] md:text-[24px] leading-[1.3] tracking-[-0.01em] text-[#FDF6EC]/85">
                      Or click to browse
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="font-display-serif text-[22px] md:text-[30px] leading-[1.3] tracking-[-0.015em] text-[#FDF6EC]/75 mt-12 md:mt-14 max-w-[900px]">
            Built for Water. Same shell hosts Space, Plants, and every course she launches —{' '}
            <em className="font-display-italic italic text-[#E85D26]">without rebuilding it.</em>
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5 — EXPERT FILMING (cream, split-screen)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#0C0C0C]/12">
        <div className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 mb-7">
            <span className="w-10 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
              Expert filming · Pillar two
            </p>
          </div>
          <h2 className="font-display-serif text-[44px] md:text-[72px] lg:text-[88px] leading-[0.95] tracking-[-0.025em] mb-14 md:mb-16 max-w-[1100px]">
            Recorded once. <em className="font-display-italic italic font-medium text-[#E85D26]">Used forever.</em>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            <figure>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0C0C0C]/55 mb-4">
                A · Standard zoom recording
              </p>
              <div className="aspect-[16/9] relative overflow-hidden border border-[#0C0C0C]/15 bg-[#0C0C0C]/5">
                <img
                  src={zoomMockupPath}
                  alt="Standard Zoom recording — washed, lo-res, awkward framing"
                  className="w-full h-full object-cover opacity-90"
                  loading="lazy"
                />
              </div>
              <p className="font-display-serif text-[20px] md:text-[22px] leading-[1.3] tracking-[-0.01em] mt-5 text-[#0C0C0C]/65">
                Washed. Awkward. Gone after the call.
              </p>
            </figure>

            <figure>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-4">
                B · AOM expert capture
              </p>
              <div className="aspect-[16/9] relative overflow-hidden border border-[#0C0C0C]/15 bg-[#0C0C0C]">
                <img
                  src={nancyMasterclassStill}
                  alt="Nancy Conrad — MasterClass-tier expert capture by AOM"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="font-display-serif text-[20px] md:text-[22px] leading-[1.3] tracking-[-0.01em] mt-5">
                Lit. Framed. Archived. <em className="font-display-italic italic text-[#E85D26]">Reusable forever.</em>
              </p>
            </figure>
          </div>

          <p className="font-display-serif text-[22px] md:text-[30px] leading-[1.3] tracking-[-0.015em] text-[#0C0C0C]/75 mt-14 md:mt-16 max-w-[900px]">
            When the expert library outlives the live cast,{' '}
            <em className="font-display-italic italic text-[#E85D26]">the program compounds.</em>
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6 — DILEMMA (cream, letterpress pull-quote)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#0C0C0C]/12">
        <div className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 mb-7">
            <span className="w-10 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
              Session 04 · Critical-thinking stim
            </p>
          </div>

          <figure className="max-w-[1100px]">
            <blockquote className="font-display-serif text-[56px] sm:text-[72px] md:text-[112px] lg:text-[128px] leading-[0.92] tracking-[-0.025em] text-[#0C0C0C]">
              Phoenix farmers{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">vs.</em>{' '}
              Vegas casinos.
            </blockquote>
            <p className="font-display-serif text-[24px] md:text-[34px] leading-[1.25] tracking-[-0.015em] text-[#0C0C0C]/75 mt-10 md:mt-12 max-w-[800px]">
              Both pull from the Colorado River. Whose claim is stronger?
            </p>
            <figcaption className="flex items-center gap-3 mt-10 md:mt-12 border-t border-[#0C0C0C]/15 pt-5 max-w-[600px]">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26]">
                →
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#0C0C0C]/65">
                Argue both sides · 90 seconds · Class votes
              </span>
            </figcaption>
          </figure>

          <p className="font-display-serif text-[22px] md:text-[30px] leading-[1.3] tracking-[-0.015em] text-[#0C0C0C]/75 mt-16 md:mt-20 max-w-[900px]">
            Critical thinking isn't a theme. <em className="font-display-italic italic text-[#E85D26]">It's the engine.</em> Every session ends with a dilemma students have to defend in front of each other.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7 — PARTNERSHIP ENGINE (black, sponsor grid)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#FDF6EC]/15 bg-[#0C0C0C] text-[#FDF6EC]">
        <div className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 mb-7">
            <span className="w-10 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
              The partnership engine
            </p>
          </div>
          <h2 className="font-display-serif text-[44px] md:text-[72px] lg:text-[88px] leading-[0.95] tracking-[-0.025em] mb-14 md:mb-16 max-w-[1200px]">
            You fund the foundation through <em className="font-display-italic italic font-medium text-[#E85D26]">partnerships.</em>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[#FDF6EC]/15">
            {[
              {
                num: '01',
                title: 'Sponsor the platform',
                body: 'Their name on the infrastructure every course runs on. Permanent. Reusable. Visible every time a student logs in.',
                tag: 'Pillar one',
              },
              {
                num: '02',
                title: 'Sponsor an expert',
                body: 'A library asset that lives beyond the cohort. The interview, the deliverable, the citation — all carry their name.',
                tag: 'Pillar two',
              },
              {
                num: '03',
                title: 'Sponsor a course',
                body: 'Their name on a hook the next decade of kids remembers. Water. Space. Plants. Whichever fits their domain.',
                tag: 'Pillar four',
              },
              {
                num: '04',
                title: 'Sponsor a dilemma series',
                body: 'Their domain — energy, health, agriculture — becomes a session module. Students argue inside their world.',
                tag: 'Pillar five',
              },
            ].map((cell) => (
              <div
                key={cell.num}
                className="border-r border-b border-[#FDF6EC]/15 p-8 md:p-10"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] mb-5">
                  {cell.num}
                </p>
                <h3 className="font-display-serif text-[26px] md:text-[34px] leading-[1.05] tracking-[-0.02em] mb-5">
                  {cell.title}
                </h3>
                <p className="font-body text-[15px] md:text-[16px] text-[#FDF6EC]/75 leading-[1.65] mb-6">
                  {cell.body}
                </p>
                <p className="font-display-italic italic text-[15px] text-[#E85D26]">
                  {cell.tag}
                </p>
              </div>
            ))}
          </div>

          <p className="font-display-serif text-[22px] md:text-[30px] leading-[1.3] tracking-[-0.015em] text-[#FDF6EC]/75 mt-14 md:mt-16 max-w-[1000px]">
            Each line above is something a sponsor can put their name on —{' '}
            <em className="font-display-italic italic text-[#E85D26]">walk-in-ready</em> for the next meeting on your calendar.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 8 — CLOSE (cream, huge type)
         ───────────────────────────────────────────────────────────── */}
      <section>
        <div className="px-6 md:px-12 py-28 md:py-44 max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-10 md:mb-14">
            Volume 001 · Ends here
          </p>
          <h2 className="font-display-serif text-[56px] sm:text-[80px] md:text-[120px] lg:text-[160px] leading-[0.88] tracking-[-0.03em] max-w-[1400px]">
            We didn't bring you a deck.<br />
            We brought you <em className="font-display-italic italic font-medium text-[#E85D26]">this page.</em>
          </h2>

          <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-7">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-4">
                Next step
              </p>
              <p className="font-display-serif text-[24px] md:text-[34px] leading-[1.25] tracking-[-0.015em] text-[#0C0C0C]/85">
                One week with Patrik and the AOM team. We come back with this same
                page — <em className="font-display-italic italic text-[#E85D26]">filled in for Water, Space, and Plants.</em>
              </p>
            </div>
            <div className="md:col-span-5 md:text-right md:pt-2">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0C0C0C]/45">
                Built for Nancy Conrad
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0C0C0C]/45 mt-1">
                AOM Studio · 2026-05-13
              </p>
            </div>
          </div>

          <div className="mt-16 md:mt-24 border-t-2 border-[#0C0C0C] pt-6 flex items-center gap-3">
            <span className="w-6 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#0C0C0C]/45">
              aheadofmarket.com / conradfoundation
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
