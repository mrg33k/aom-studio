import React, { useState, useEffect } from 'react'

// ─── BRAND CONSTANTS (Dark Frame) ───────────────────────────────────────────
const ORANGE = '#E85D26'
const GREEN = '#22c55e'
const YELLOW = '#eab308'
const RED = '#ef4444'
const BLUE = '#60a5fa'
const PURPLE = '#a78bfa'
const CYAN = '#22d3ee'
const PINK = '#f472b6'
const EMERALD = '#34d399'
const AMBER = '#f59e0b'
const INDIGO = '#818cf8'
const ROSE = '#fb7185'
const MUTED = '#8A847C'
const CREAM = '#F0ECE6'
const BG = '#0C0C0C'
const CARD_BG = '#151515'
const BORDER = 'rgba(255,255,255,0.08)'

// ─── RESPONSIVE HOOK ────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

// ─── REUSABLE COMPONENTS ────────────────────────────────────────────────────

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 32, textAlign: 'center' }}>
      <h2 style={{
        fontSize: 32,
        fontWeight: 700,
        color: CREAM,
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
        fontFamily: 'Syne, system-ui, sans-serif',
      }}>{children}</h2>
      {sub && (
        <p style={{ fontSize: 16, color: MUTED, marginTop: 10, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{sub}</p>
      )}
    </div>
  )
}

function Card({ children, style = {}, highlight = false, glow = false }) {
  return (
    <div style={{
      background: CARD_BG,
      border: highlight ? `1px solid ${ORANGE}40` : `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: '24px',
      transition: 'border-color 0.3s, box-shadow 0.3s',
      ...(glow ? { boxShadow: `0 0 40px ${ORANGE}10` } : {}),
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── PIPELINE DATA ──────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { name: 'Elon', role: 'System', color: RED, desc: 'Finds gaps, audits infrastructure' },
  { name: 'Mom', role: 'Operations', color: PURPLE, desc: 'Orchestrates, routes, closes loops' },
  { name: 'Alex', role: 'Strategy', color: ORANGE, desc: 'Positions offers, plans growth' },
  { name: 'Steffen', role: 'Brand', color: YELLOW, desc: 'Defines visual identity and specs' },
  { name: 'Bobby', role: 'Build', color: CYAN, desc: 'Builds and deploys everything' },
  { name: 'Elmo', role: 'QA', color: GREEN, desc: 'Inspects at 5 viewports, passes or rejects' },
  { name: 'Patrik', role: 'Approve', color: '#fff', desc: 'Final call. Ships or redirects.' },
]

// ─── AGENTS DATA ────────────────────────────────────────────────────────────
const AGENTS = [
  { name: 'Bobby', role: 'Web Development', color: CYAN, desc: 'Builds and deploys all websites. AOM site, client sites, dashboards. Every pixel, every deploy.' },
  { name: 'Elmo', role: 'Quality Assurance', color: GREEN, desc: 'Screenshots every page at 5 viewports. Checks performance, errors, broken links, accessibility. Standard: "DROP DEAD GORGEOUS or it goes back."' },
  { name: 'Jacob', role: 'Outreach', color: BLUE, desc: 'Runs cold email campaigns. Researches prospects, writes personalized emails, manages the full pipeline.' },
  { name: 'Alex', role: 'Strategy', color: ORANGE, desc: 'Offer positioning, competitive analysis, pricing strategy, business growth planning.' },
  { name: 'Steffen', role: 'Brand & Design', color: YELLOW, desc: 'Visual identity, typography, color systems, design direction. Sets the standard everything else follows.' },
  { name: 'Mom', role: 'Operations', color: PURPLE, desc: 'Scans all projects, identifies what needs progress, launches agents, closes loops. The orchestrator.' },
  { name: 'Steve', role: 'AI Advisory', color: INDIGO, desc: 'Packages AOM\'s system into sellable services for other businesses. Turns internal tools into products.' },
  { name: 'Cleo', role: 'Content Strategy', color: PINK, desc: 'Analyzes reference content, defines quality standards, plans content calendars.' },
  { name: 'Tony', role: 'Social Media', color: ROSE, desc: 'Multi-platform posting, scheduling, engagement. Manages presence across LinkedIn, Instagram, TikTok.' },
  { name: 'Paige', role: 'Client Health', color: EMERALD, desc: 'Tracks delivery status, flags risks, manages relationships. Nothing slips through.' },
  { name: 'Elon', role: 'System Architecture', color: RED, desc: 'Infrastructure, security, automation, system optimization. Keeps the machine running.' },
]

// ─── SKILLS DATA ────────────────────────────────────────────────────────────
const SKILLS = [
  { name: 'Rally', desc: 'Morning huddle. Every agent gets briefed and launched in parallel. Full team mobilization in under a minute.', color: ORANGE },
  { name: 'Double Check', desc: 'Elmo\'s QA gate. Playwright screenshots at 5 viewports, performance metrics, console errors, broken links, accessibility audit. Nothing passes that isn\'t perfect.', color: GREEN },
  { name: 'Council', desc: 'Multi-agent deliberation. Ask a business question, get perspectives from 6 specialized agents, synthesized into actionable recommendations.', color: PURPLE },
  { name: 'Big 3', desc: 'Steffen designs, Bobby builds, Elmo inspects. A coordinated chain that handles any visual/web task end-to-end.', color: CYAN },
  { name: 'Masterplan', desc: 'Full system audit. Scores every agent, context file, skill, and infrastructure component. Produces a prioritized fix list.', color: RED },
  { name: 'Session Start', desc: 'Loads all context, checks emails, scans agents, delivers a ranked task list. Ready to work in 30 seconds.', color: AMBER },
  { name: 'Outreach Pipeline', desc: 'End-to-end cold email: prospect research, personalized writing, scheduling, tracking, follow-ups.', color: BLUE },
]

// ─── STACK DATA ─────────────────────────────────────────────────────────────
const STACK = [
  { name: 'Claude Code', desc: 'AI backbone. Every agent runs here.', color: ORANGE },
  { name: 'Telegram Relay', desc: 'Mobile command center. Run the company from your phone.', color: BLUE },
  { name: 'Google Calendar', desc: 'Scheduling, event management, time blocking.', color: GREEN },
  { name: 'Gmail Automation', desc: 'Email triage, drafts, sends, follow-ups.', color: RED },
  { name: 'Playwright', desc: 'Visual QA. Screenshots at every viewport.', color: PURPLE },
  { name: 'GitHub + Vercel', desc: 'Deploy pipeline. Push to ship.', color: CYAN },
  { name: 'Formspree', desc: 'Form handling for client intake.', color: YELLOW },
]

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function SystemPage() {
  const isMobile = useIsMobile()
  const [hoveredAgent, setHoveredAgent] = useState(null)
  const [hoveredStep, setHoveredStep] = useState(null)

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      color: CREAM,
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
    }}>

      {/* ── HERO ── */}
      <section style={{
        padding: isMobile ? '80px 20px 60px' : '120px 40px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 800,
          background: `radial-gradient(ellipse, ${ORANGE}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: ORANGE,
            marginBottom: 20,
          }}>
            Internal Architecture
          </div>

          <h1 style={{
            fontSize: isMobile ? 40 : 64,
            fontWeight: 800,
            color: CREAM,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            fontFamily: 'Syne, system-ui, sans-serif',
            marginBottom: 20,
          }}>
            The AOM System
          </h1>

          <p style={{
            fontSize: isMobile ? 17 : 20,
            color: MUTED,
            maxWidth: 680,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            How we run a full production company with AI agents, automated workflows, and zero back-office staff.
          </p>

          {/* Stat bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? 24 : 48,
            marginTop: 48,
            flexWrap: 'wrap',
          }}>
            {[
              { value: '11', label: 'AI Agents' },
              { value: '7', label: 'Core Skills' },
              { value: '0', label: 'Back-Office Staff' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: isMobile ? 36 : 48,
                  fontWeight: 800,
                  color: i === 2 ? ORANGE : CREAM,
                  fontFamily: 'Syne, system-ui, sans-serif',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}>{stat.value}</div>
                <div style={{
                  fontSize: 13,
                  color: MUTED,
                  marginTop: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 500,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 1: THE PIPELINE ── */}
      <section style={{
        padding: isMobile ? '40px 20px 60px' : '60px 40px 80px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <SectionTitle sub="Every deliverable flows through this chain. Nothing ships without passing QA. Nothing reaches the client without approval.">
          The Pipeline
        </SectionTitle>

        {/* Pipeline flow */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 0 : 0,
          marginTop: 32,
        }}>
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={step.name}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
              }}
              onMouseEnter={() => setHoveredStep(i)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              {/* Node */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: isMobile ? '12px 0' : '0 8px',
                cursor: 'default',
                transition: 'transform 0.2s',
                transform: hoveredStep === i ? 'scale(1.08)' : 'scale(1)',
              }}>
                <div style={{
                  width: isMobile ? 56 : 64,
                  height: isMobile ? 56 : 64,
                  borderRadius: '50%',
                  background: `${step.color}15`,
                  border: `2px solid ${step.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 18 : 20,
                  fontWeight: 700,
                  color: step.color,
                  fontFamily: 'Syne, system-ui, sans-serif',
                  transition: 'box-shadow 0.3s',
                  boxShadow: hoveredStep === i ? `0 0 24px ${step.color}30` : 'none',
                }}>
                  {step.name.charAt(0)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: CREAM,
                    letterSpacing: '-0.01em',
                  }}>{step.name}</div>
                  <div style={{
                    fontSize: 11,
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 500,
                  }}>{step.role}</div>
                </div>
                {/* Tooltip on hover */}
                {hoveredStep === i && (
                  <div style={{
                    fontSize: 13,
                    color: MUTED,
                    maxWidth: 160,
                    textAlign: 'center',
                    lineHeight: 1.4,
                    marginTop: 2,
                  }}>{step.desc}</div>
                )}
              </div>

              {/* Arrow between nodes */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: `${MUTED}60`,
                  fontSize: isMobile ? 18 : 22,
                  padding: isMobile ? '4px 0' : '0 4px',
                  transform: isMobile ? 'rotate(90deg)' : 'none',
                }}>
                  &#x2192;
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pipeline note */}
        <div style={{
          textAlign: 'center',
          marginTop: 32,
          padding: '16px 24px',
          background: `${ORANGE}08`,
          border: `1px solid ${ORANGE}20`,
          borderRadius: 10,
          maxWidth: 600,
          margin: '32px auto 0',
        }}>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            If Patrik redirects, Mom picks it up and re-enters the pipeline. The loop never breaks.
          </p>
        </div>
      </section>

      {/* ── SECTION 2: THE AGENTS ── */}
      <section style={{
        padding: isMobile ? '40px 20px 60px' : '60px 40px 80px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <SectionTitle sub="Every agent has a name, a specialty, and a clear lane. They work in parallel, hand off to each other, and never step on each other's toes.">
          The Agents
        </SectionTitle>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
          marginTop: 8,
        }}>
          {AGENTS.map((agent) => (
            <Card
              key={agent.name}
              highlight={hoveredAgent === agent.name}
              style={{
                cursor: 'default',
                transition: 'border-color 0.3s, transform 0.2s, box-shadow 0.3s',
                transform: hoveredAgent === agent.name ? 'translateY(-2px)' : 'none',
                boxShadow: hoveredAgent === agent.name ? `0 8px 32px ${agent.color}12` : 'none',
              }}
            >
              <div
                onMouseEnter={() => setHoveredAgent(agent.name)}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Agent header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: `${agent.color}15`,
                    border: `2px solid ${agent.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    color: agent.color,
                    fontFamily: 'Syne, system-ui, sans-serif',
                    flexShrink: 0,
                  }}>
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: CREAM,
                      letterSpacing: '-0.01em',
                    }}>{agent.name}</div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: agent.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>{agent.role}</div>
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: 15,
                  color: MUTED,
                  lineHeight: 1.65,
                }}>{agent.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: KEY SKILLS ── */}
      <section style={{
        padding: isMobile ? '40px 20px 60px' : '60px 40px 80px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <SectionTitle sub="Skills are repeatable workflows. One command, fully automated, end-to-end.">
          Key Skills
        </SectionTitle>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
          marginTop: 8,
        }}>
          {SKILLS.map((skill) => (
            <Card key={skill.name} style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Top accent bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${skill.color}, ${skill.color}40)`,
                borderRadius: '14px 14px 0 0',
              }} />

              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: skill.color,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
                marginTop: 4,
              }}>Skill</div>

              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: CREAM,
                marginBottom: 10,
                fontFamily: 'Syne, system-ui, sans-serif',
              }}>{skill.name}</div>

              <p style={{
                fontSize: 15,
                color: MUTED,
                lineHeight: 1.65,
              }}>{skill.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: THE STACK ── */}
      <section style={{
        padding: isMobile ? '40px 20px 60px' : '60px 40px 80px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <SectionTitle sub="The tools that make it all run.">
          The Stack
        </SectionTitle>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 8,
        }}>
          {STACK.map((tool) => (
            <div key={tool.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '18px 22px',
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              transition: 'border-color 0.2s',
            }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: tool.color,
                flexShrink: 0,
                boxShadow: `0 0 8px ${tool.color}40`,
              }} />
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: CREAM,
                }}>{tool.name}</span>
                <span style={{
                  fontSize: 14,
                  color: MUTED,
                  marginLeft: 12,
                }}>{tool.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 5: BUILT BY USING IT ── */}
      <section style={{
        padding: isMobile ? '60px 20px 80px' : '80px 40px 100px',
        maxWidth: 800,
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: isMobile ? 28 : 36,
          fontWeight: 800,
          color: CREAM,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          fontFamily: 'Syne, system-ui, sans-serif',
          marginBottom: 20,
        }}>
          Built by using it.
        </h2>

        <p style={{
          fontSize: isMobile ? 16 : 18,
          color: MUTED,
          lineHeight: 1.7,
          maxWidth: 620,
          margin: '0 auto 40px',
        }}>
          This system wasn't designed in a boardroom. It was built by a small business owner solving his own problems. Every agent, every skill, every automation exists because Patrik needed it. That's why it works. And that's what we can build for you.
        </p>

        <a
          href="https://aheadofmarket.com/#contact"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: ORANGE,
            color: '#fff',
            padding: '16px 36px',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            transition: 'background 0.2s, transform 0.2s',
            fontFamily: 'Syne, system-ui, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D14E1C'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = ORANGE
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          Let's Talk
          <span style={{ fontSize: 18 }}>&#x2192;</span>
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        textAlign: 'center',
        padding: '32px 20px',
        borderTop: `1px solid ${BORDER}`,
      }}>
        <div style={{ fontSize: 13, color: `${MUTED}80` }}>
          AOM (Ahead of Market) &middot; Phoenix, AZ
        </div>
      </footer>
    </div>
  )
}
