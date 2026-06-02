import React, { useState, useEffect } from 'react'

// Brand constants (matching site-wide Dark Frame)
const ORANGE = '#E85D26'
const GREEN = '#22c55e'
const YELLOW = '#eab308'
const RED = '#ef4444'
const BLUE = '#60a5fa'
const PURPLE = '#a78bfa'
const CYAN = '#22d3ee'
const MUTED = '#8A847C'

// Agent colors for tabs
const AGENT_COLORS = {
  alex: ORANGE,
  jacob: BLUE,
  bobby: CYAN,
  mom: PURPLE,
  paige: GREEN,
  steffen: YELLOW,
}

// ── Utility hooks ──

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

// ── Reusable components ──

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 24, marginTop: 48 }}>
      <h2 style={{
        fontSize: 28,
        fontWeight: 700,
        color: '#F0ECE6',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}>{children}</h2>
      {sub && (
        <p style={{ fontSize: 15, color: MUTED, marginTop: 6 }}>{sub}</p>
      )}
    </div>
  )
}

function Card({ children, style = {}, highlight = false }) {
  return (
    <div style={{
      background: '#151515',
      border: highlight ? `1px solid ${ORANGE}30` : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '24px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function NumberedItem({ number, title, description, color = ORANGE }) {
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      padding: '16px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: `${color}18`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 700,
        color: color,
        flexShrink: 0,
      }}>{number}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#F0ECE6', lineHeight: 1.4 }}>{title}</div>
        {description && (
          <div style={{ fontSize: 15, color: MUTED, marginTop: 6, lineHeight: 1.6 }}>{description}</div>
        )}
      </div>
    </div>
  )
}

function BulletList({ items, color = MUTED }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            marginTop: 8,
          }} />
          <div style={{ fontSize: 15, color: '#F0ECE6', lineHeight: 1.6 }}>{item}</div>
        </div>
      ))}
    </div>
  )
}

function AgentBadge({ name, color }) {
  return (
    <span style={{
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.06em',
      color: color,
      background: `${color}15`,
      padding: '4px 12px',
      borderRadius: 20,
      textTransform: 'uppercase',
    }}>{name}</span>
  )
}

// ── Agent section data ──

function AlexSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 16 }}>Highest ROI Moves, Ranked</div>
        <NumberedItem number={1} title="Close what's already warm" description="NEON, PA-LA, Intelliplay are sitting unsigned. Send a 'checking in, booking Q2 now' follow-up. Cheapest revenue dollars you'll ever get." color={ORANGE} />
        <NumberedItem number={2} title="Upsell Ambition and KOHRS" description="Push Ambition to $3.5k once posting starts. After KOHRS backlog clears, pitch $3k tier with LinkedIn added. Gets recurring from $4k to $6.5-7k/month." color={ORANGE} />
        <NumberedItem number={3} title="$3k is too low for the floor" description="Structure tiers: $3k base (content only), $4.5k with video shoots, $6k full service. Most will land at $4.5k." color={ORANGE} />
        <NumberedItem number={4} title="Included Health is a case study, not just a project" description="Build a 60-second highlight reel after wrapping. Use it in outreach. Jacob should have a separate sequence for corporate event planners." color={ORANGE} />
        <NumberedItem number={5} title="AI advisory is NOT ready to sell" description="No defined deliverable, no case study, no price. Park it until Q2. When ready: 'AI Operations Audit' at $2,500 flat, 2-week engagement, written report." color={ORANGE} />
        <NumberedItem number={6} title="Ash needs to be a revenue contributor" description="If Ash can run shoots solo, Patrik gets 2-3 hours back for sales." color={ORANGE} />
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>Outreach Focus</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
          Construction 10-50 employees with active Instagram (they already value social). Secondary: corporate event teams (the IH profile). Drop founders/nonprofits from cold outreach for now.
        </div>
      </Card>

      <Card highlight>
        <div style={{ fontSize: 16, fontWeight: 600, color: ORANGE, marginBottom: 8 }}>The One Thing That Changes Everything</div>
        <div style={{ fontSize: 17, color: '#F0ECE6', lineHeight: 1.6, fontWeight: 500 }}>
          2 more construction retainers at $4.5k average in 60 days = $9k/month new recurring. $13-16k/month steady. $250k+ annual run rate.
        </div>
      </Card>
    </div>
  )
}

function JacobSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>Cold Email Math</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
          8-10/day, even 3% reply rate = 1 reply every 3-4 days. 20-30% close rate on cold replies = ~1 deal/month. Email works but it's a slow burn.
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 16 }}>Four Things to Add Alongside Email</div>
        <NumberedItem number={1} title="LinkedIn DMs" description="Tony sends 5-10 connection requests/day synced with Jacob's email list. Warms them up before email lands." color={BLUE} />
        <NumberedItem number={2} title="In-person networking" description="One appearance at NAIOP, AZ Builders Alliance, or local BNI generates more leads in a morning than a month of cold email. Construction is a handshake industry." color={BLUE} />
        <NumberedItem number={3} title="Referral asks" description="Ambition, KOHRS, Brandon Wiley are all construction-adjacent. 'Who else in your world could use what we're doing for you?' Converts at 10-20x cold outreach." color={BLUE} />
        <NumberedItem number={4} title="Case study content as magnet" description="Ambition before/after video on LinkedIn with Phoenix construction hashtags. Proves the work AND attracts inbound." color={BLUE} />
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>Phoenix Market Signal</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
          Construction GCs and mechanical contractors are underserved on social. Most have zero LinkedIn, terrible websites, no video. The need is obvious but they don't know they need it. They need to SEE the result first. Ambition case study is the conversion tool.
        </div>
      </Card>

      <Card highlight>
        <div style={{ fontSize: 16, fontWeight: 600, color: BLUE, marginBottom: 8 }}>Realistic Timeline</div>
        <div style={{ fontSize: 17, color: '#F0ECE6', lineHeight: 1.6, fontWeight: 500 }}>
          First closed deal in 3-5 weeks from cold email. With LinkedIn + referrals + one local event, compress to 2-3 weeks.
        </div>
      </Card>
    </div>
  )
}

function BobbySection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 8 }}>The site isn't closing deals because it's not built to.</div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 16 }}>Build Priority Order</div>
        <NumberedItem number={1} title="CTA intake flow (this week)" description="Multi-step form: What's your business? What do you need? Budget range? Captures leads at 11pm on a Tuesday. Highest-leverage thing to ship." color={CYAN} />
        <NumberedItem number={2} title="Vertical landing pages" description="One for construction, one for small businesses. 'Your competitors are posting and you're not. Here's what $3k/month gets you.' Gives Jacob specific URLs for outreach." color={CYAN} />
        <NumberedItem number={3} title="Case studies section" description="Ambition launches Thursday = instant shippable case study. Before/after. What we built. What it costs monthly." color={CYAN} />
        <NumberedItem number={4} title="AI services: not a page, just a tile" description="Single 'AI Flow' offer on services page. One thing, one price, one outcome." color={CYAN} />
        <NumberedItem number={5} title="/outreach-plan as sales demo" description="Anonymize slightly. 'This is what we built for ourselves. We can build it for you.'" color={CYAN} />
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: RED, marginBottom: 12 }}>What NOT To Do</div>
        <BulletList items={[
          'Redesign (it looks good)',
          'Blog (premature)',
          "Client portal (solve 'get clients' before 'manage clients at scale')",
        ]} color={RED} />
      </Card>
    </div>
  )
}

function MomSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card highlight>
        <div style={{ fontSize: 18, fontWeight: 700, color: PURPLE, marginBottom: 12 }}>The hard truth: AOM is not at capacity. Patrik is at capacity.</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
          Every new project requiring Patrik competes with Skylar, KOHRS, ISA, and Brandon for the same 4-5 evening editing blocks. And those blocks aren't happening consistently.
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#F0ECE6', marginTop: 16 }}>
          The bottleneck is editing. Full stop.
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 16 }}>Action Plan</div>
        <NumberedItem number={1} title="Split editing between Patrik and Ash" description="Ash owns: KOHRS videos, routine social cuts, anything that doesn't need Patrik's creative eye. Patrik owns: Skylar, ISA, Brandon, Michael. If Ash can do 80% of it, Ash does 100% of it. Weekly Sunday handoff keeps it clean." color={PURPLE} />
        <NumberedItem number={2} title="Ship what's done before chasing what's new" description="Ambition launches Thursday = case study + referral source. KOHRS backlog must clear so Leigh doesn't churn." color={PURPLE} />
        <NumberedItem number={3} title="March $50k math" description="~$35k through Jan/Feb. IH $9k + Ambition $4k web + KOHRS $2k = potentially $47-50k if IH pays in March. The W-9 reply is literally the most valuable 2-minute task." color={PURPLE} />
        <NumberedItem number={4} title="Push NEON, deprioritize PA-LA and Intelliplay" description="One follow-up call this week." color={PURPLE} />
        <NumberedItem number={5} title="Let Jacob run" description="Pipeline builds without Patrik's time. But when responses come, Patrik needs to be available for calls, not buried in a Resolve timeline." color={PURPLE} />
        <NumberedItem number={6} title="NABI: shelf it" description="Client isn't committed. Revisit Q2." color={PURPLE} />
      </Card>

      <Card highlight>
        <div style={{ fontSize: 16, fontWeight: 600, color: PURPLE, marginBottom: 8 }}>Bottom Line</div>
        <div style={{ fontSize: 17, color: '#F0ECE6', lineHeight: 1.6, fontWeight: 500 }}>
          The growth answer isn't "do more." It's "stop doing the wrong things." Patrik on sales calls = $9k projects. Patrik editing KOHRS footage = $2k minus everything he didn't close that week.
        </div>
      </Card>
    </div>
  )
}

function PaigeSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: RED, letterSpacing: '0.05em', marginBottom: 8 }}>BIGGEST RISK</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#F0ECE6', marginBottom: 8 }}>KOHRS</div>
          <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
            10 videos behind while client pays $2k/month. Construction is referral-heavy. One unhappy client poisons the whole vertical strategy. Acknowledge the gap to Leigh directly. Give her a real timeline.
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: GREEN, letterSpacing: '0.05em', marginBottom: 8 }}>HIGHEST UPSIDE</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#F0ECE6', marginBottom: 8 }}>Included Health</div>
          <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
            Big company, multiple departments, multiple events per year. Post-delivery ask to Elario: "Who else on your team does events like this?" One warm intro = $30-50k/year in repeat work.
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: '0.05em', marginBottom: 8 }}>PROOF CASE</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#F0ECE6', marginBottom: 8 }}>Ambition</div>
          <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
            Once launched, every construction pitch references what we built for them. Real results from a real contractor beats ten portfolio thumbnails.
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>Unsigned Proposals Need a Deadline</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, marginBottom: 16 }}>
          "We're booking Q2 now, want to hold space if you're moving forward." If no response in a week, move to dead.
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>Referrals Nobody's Asked For Yet</div>
        <BulletList items={[
          "Ambition's owner knows other contractors. After launch, ask directly.",
          "Included Health's team post-delivery.",
          "Brandon Wiley runs a business, knows business owners. Has anyone asked?",
        ]} color={GREEN} />
      </Card>

      <Card highlight>
        <div style={{ fontSize: 16, fontWeight: 600, color: GREEN, marginBottom: 8 }}>Fastest Path</div>
        <div style={{ fontSize: 17, color: '#F0ECE6', lineHeight: 1.6, fontWeight: 500 }}>
          Deliver so well for Ambition and IH that they refer you. Closes come from proof, not promises.
        </div>
      </Card>
    </div>
  )
}

function SteffenSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card highlight>
        <div style={{ fontSize: 18, fontWeight: 700, color: YELLOW, marginBottom: 12 }}>The visual identity is premium. The copy is the ceiling.</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
          Design says "we work with serious people." Copy says "we work with construction companies." That's limiting.
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>Positioning Fix: Industry-Agnostic Language, Industry-Specific Proof</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, marginBottom: 16 }}>
          Hero/value props should never name a single vertical. Instead:
        </div>
        <BulletList items={[
          '"Companies that build things" (works for construction, founders, nonprofits)',
          '"You\'re ahead of market. We make sure everyone else knows it."',
        ]} color={YELLOW} />
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, marginTop: 16 }}>
          Let case studies do the vertical targeting. Brand stays wide, proof narrows.
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 16 }}>Missing Brand Assets</div>
        <NumberedItem number={1} title="Case studies with numbers" description="Not 'we made a video.' Before/after with real results." color={YELLOW} />
        <NumberedItem number={2} title="Sizzle reel" description="60-90 seconds, cinematic. Every $9k+ production company has one. Pull from ISA, Ambition, KOHRS footage." color={YELLOW} />
        <NumberedItem number={3} title="Social proof on site" description="Testimonials, client logos, 'trusted by' names." color={YELLOW} />
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>Differentiation Language</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, color: RED, marginBottom: 4 }}>Not this:</div>
            <div style={{ fontSize: 15, color: MUTED }}>"We shoot video."</div>
            <div style={{ fontSize: 14, color: GREEN, marginBottom: 4, marginTop: 8 }}>This:</div>
            <div style={{ fontSize: 15, color: '#F0ECE6', fontWeight: 500 }}>"We build the thing that brings you business."</div>
          </div>
          <div>
            <div style={{ fontSize: 14, color: RED, marginBottom: 4 }}>Not this:</div>
            <div style={{ fontSize: 15, color: MUTED }}>"Social media management."</div>
            <div style={{ fontSize: 14, color: GREEN, marginBottom: 4, marginTop: 8 }}>This:</div>
            <div style={{ fontSize: 15, color: '#F0ECE6', fontWeight: 500 }}>"Your brand, showing up consistently, without you thinking about it."</div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 12 }}>AI as Positioning</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
          "We don't just produce content. We built the system that produces it." No other Phoenix production company can say that. Not a service page yet. Just positioning.
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: RED, marginBottom: 8 }}>Kill "$9k in projects"</div>
        <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
          Replace with "X projects delivered" or "clients across construction, energy, and nonprofits."
        </div>
      </Card>
    </div>
  )
}

// ── Main Component ──

const AGENTS = [
  { id: 'alex', label: 'Alex', role: 'Strategy', Component: AlexSection },
  { id: 'jacob', label: 'Jacob', role: 'Outreach', Component: JacobSection },
  { id: 'bobby', label: 'Bobby', role: 'Tech/Web', Component: BobbySection },
  { id: 'mom', label: 'Mom', role: 'Operations', Component: MomSection },
  { id: 'paige', label: 'Paige', role: 'Clients', Component: PaigeSection },
  { id: 'steffen', label: 'Steffen', role: 'Brand', Component: SteffenSection },
]

export default function GrowthPlan() {
  const [activeAgent, setActiveAgent] = useState('alex')
  const isMobile = useIsMobile()

  const ActiveComponent = AGENTS.find(a => a.id === activeAgent)?.Component || AlexSection

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020202',
      color: '#F0ECE6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: '0.1em' }}>AOM</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>Growth Plan</span>
        </div>
        <div style={{ fontSize: 13, color: MUTED }}>
          Council Brief / March 10, 2026
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ── Synthesis: Where Everyone Agrees ── */}
        <SectionTitle sub="What the entire council aligned on">Consensus</SectionTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <BulletList items={[
              <><strong style={{ color: '#F0ECE6' }}>Ambition launch Thursday is the #1 growth catalyst.</strong> <span style={{ color: MUTED }}>It becomes the case study, the referral source, and the proof for every future pitch.</span></>,
              <><strong style={{ color: '#F0ECE6' }}>Included Health is the highest-upside relationship.</strong> <span style={{ color: MUTED }}>Don't let it die as a one-off. Ask for internal referrals post-delivery.</span></>,
              <><strong style={{ color: '#F0ECE6' }}>KOHRS is the biggest risk.</strong> <span style={{ color: MUTED }}>Fix the backlog before it becomes a reputation problem.</span></>,
              <><strong style={{ color: '#F0ECE6' }}>Cold email works but isn't enough alone.</strong> <span style={{ color: MUTED }}>Add referral asks, LinkedIn DMs, and one in-person networking touchpoint.</span></>,
              <><strong style={{ color: '#F0ECE6' }}>NABI: shelf it.</strong> <span style={{ color: MUTED }}>Don't chase reluctant money.</span></>,
              <><strong style={{ color: '#F0ECE6' }}>The site needs to convert, not just impress.</strong> <span style={{ color: MUTED }}>Intake flow + case studies + vertical pages.</span></>,
              <><strong style={{ color: '#F0ECE6' }}>Copy needs to widen.</strong> <span style={{ color: MUTED }}>Construction-forward is fine in proof/case studies, but hero and value props should speak to all verticals.</span></>,
            ]} color={ORANGE} />
          </Card>
        </div>

        {/* ── The Disagreement ── */}
        <div style={{ marginTop: 24 }}>
          <Card style={{ borderLeft: `3px solid ${YELLOW}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: YELLOW, letterSpacing: '0.05em', marginBottom: 8 }}>THE BIG DISAGREEMENT</div>
            <div style={{ fontSize: 15, color: '#F0ECE6', lineHeight: 1.6, marginBottom: 12 }}>
              <strong>Alex says</strong> drop founders/nonprofits from outreach. <strong>Steffen says</strong> keep the brand wide.
            </div>
            <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
              <strong style={{ color: GREEN }}>Resolution:</strong> Keep brand language inclusive, but focus outreach dollars and Jacob's time on construction. Founders/nonprofits come through the wide net (site, referrals, inbound).
            </div>
          </Card>
        </div>

        {/* ── The Bottleneck ── */}
        <div style={{ marginTop: 24 }}>
          <Card style={{ borderLeft: `3px solid ${PURPLE}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: PURPLE, letterSpacing: '0.05em', marginBottom: 8 }}>THE BOTTLENECK (MOM CALLED IT)</div>
            <div style={{ fontSize: 15, color: '#F0ECE6', lineHeight: 1.6, marginBottom: 12 }}>
              Patrik is the closer, creative director, AND primary editor. Editing is fulfillment, not growth. Every hour editing is an hour not closing.
            </div>
            <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>
              <strong style={{ color: GREEN }}>Solution:</strong> Split editing with Ash. Ash takes KOHRS, routine cuts, and anything that doesn't need Patrik's creative eye. Patrik keeps Skylar, ISA, Brandon, Michael. Weekly Sunday handoff keeps it clean.
            </div>
          </Card>
        </div>

        {/* ── Top 5 Moves ── */}
        <SectionTitle sub="In priority order. Everything can start running now.">Top 5 Moves</SectionTitle>

        <Card>
          <NumberedItem number={1} title="Ask existing clients for referrals" description="Ambition, IH post-delivery, Brandon. Zero cost, highest conversion." color={GREEN} />
          <NumberedItem number={2} title="Split editing backlog with Ash" description="Weekly handoff system. Ash owns routine, Patrik owns creative. Frees Patrik's evenings for sales." color={PURPLE} />
          <NumberedItem number={3} title="Launch Ambition Thursday, then build the case study immediately" description="60-second walkthrough for outreach and LinkedIn." color={ORANGE} />
          <NumberedItem number={4} title="Follow up on NEON this week" description="Soft deadline: 'booking Q2 now.'" color={BLUE} />
          <NumberedItem number={5} title="Bobby: build CTA intake flow on AOM site" description="Captures leads 24/7." color={CYAN} />
        </Card>

        {/* ── Agent Input Tabs ── */}
        <SectionTitle sub="Detailed input from each agent">Agent Perspectives</SectionTitle>

        {/* Tab bar */}
        <nav style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 24,
        }}>
          {AGENTS.map(agent => (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeAgent === agent.id ? `2px solid ${AGENT_COLORS[agent.id]}` : '2px solid transparent',
                color: activeAgent === agent.id ? '#F0ECE6' : MUTED,
                fontSize: 15,
                fontWeight: 500,
                padding: isMobile ? '14px 14px' : '14px 20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{agent.label}</span>
              {!isMobile && <span style={{ fontSize: 12, color: activeAgent === agent.id ? AGENT_COLORS[agent.id] : '#444' }}>{agent.role}</span>}
            </button>
          ))}
        </nav>

        {/* Active agent badge */}
        <div style={{ marginBottom: 20 }}>
          <AgentBadge name={`${AGENTS.find(a => a.id === activeAgent)?.label} / ${AGENTS.find(a => a.id === activeAgent)?.role}`} color={AGENT_COLORS[activeAgent]} />
        </div>

        {/* Agent content */}
        <ActiveComponent />

        {/* ── Open Questions ── */}
        <SectionTitle sub="Decisions needed from Patrik">Open Questions</SectionTitle>

        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              'Should we price retainers at $3k/$4.5k/$6k tiers instead of flat $3k?',
              'Can Ash run shoots solo to free your time?',
              'Green light to follow up on NEON this week?',
              'Want Jacob to prep referral ask scripts for Ambition/IH/Brandon?',
              'Sunday night handoff with Ash, or different day?',
            ].map((q, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                padding: '16px 0',
                borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  color: MUTED,
                  flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ fontSize: 16, color: '#F0ECE6', lineHeight: 1.5 }}>{q}</div>
              </div>
            ))}
          </div>
        </Card>

      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: 12,
        color: '#333',
      }}>
        AOM Internal. Not public.
      </footer>
    </div>
  )
}
