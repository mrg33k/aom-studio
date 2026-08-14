// CommandDeckHome — Corner V5 home (the "Command Deck").
//
// Mission: corner:corner-ui-cv5 R2.
//
// This is the CV5 home surface. It consumes the SAME props HomeView (CV4) gets,
// so all functionality is preserved — only the visual language changes. It is
// rendered ONLY by CornerVG (the /cvg CV5-only surface). CornerV4 (/dashboard)
// and CV3 keep their own HomeView import and stay byte-identical.
//
// Visual language ("Command Deck", Patrik-approved direction 2026-06-15):
//   - living space backdrop (radial nebula + ASCII-torus glow + scanline)
//   - frosted console panels with a clipped/angled "corner" motif + HUD brackets
//   - editorial Hedvig headers; IBM Plex Mono labels; Figtree body
//   - a "Needs you" hero with a heavy primary action + a step-DNA progress nod
//   - your rooms as console tiles with per-room hue + REAL last-activity time
//   - a crew strip of your agents; a "Command your world" input
//
// Data is REAL (props). No fabricated feeds. A room with nothing waiting stays quiet.
//
// Type is locked: Hedvig Letters Serif (display) + Figtree (body) + IBM Plex Mono (data).

import { useMemo, useState } from 'react'

// ── helpers (mirrored from cv4/HomeView so this stays self-contained) ──────────
const GREETINGS = {
  morning: ['Good morning', 'Morning', 'Fresh start', 'Up early'],
  afternoon: ['Good afternoon', 'Afternoon', 'Back at it', 'Still rolling'],
  evening: ['Good evening', 'Evening', 'Welcome back', 'Last stretch'],
  late: ['Late night', 'Still going', 'Workshop hours', 'Burning the midnight oil'],
}
function pickGreeting(date = new Date()) {
  const h = date.getHours()
  let slot = 'evening'
  if (h < 5) slot = 'late'
  else if (h < 12) slot = 'morning'
  else if (h < 17) slot = 'afternoon'
  else if (h < 21) slot = 'evening'
  else slot = 'late'
  const pool = GREETINGS[slot]
  return pool[Math.floor(Math.random() * pool.length)]
}
function displayName(user) {
  return user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'there'
}
function relativeTime(iso) {
  if (!iso) return ''
  try {
    const then = new Date(iso).getTime()
    const diff = Math.max(0, Date.now() - then)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'now'
    if (m < 60) return m + 'm ago'
    const h = Math.floor(m / 60)
    if (h < 24) return h + 'h ago'
    const d = Math.floor(h / 24)
    if (d < 7) return d + 'd ago'
    return Math.floor(d / 7) + 'w ago'
  } catch (_) { return '' }
}

const HUES = ['teal', 'amber', 'violet']

export default function CommandDeckHome({
  user,
  worldId,
  agents = [],
  projectRooms = [],
  onSelectAgent,
  onSelectProject,
  onOpenSearch,
  needsYou = [],
}) {
  const [cmd, setCmd] = useState('')
  const greeting = useMemo(() => pickGreeting(), [])
  const name = displayName(user)

  // Rooms sorted by real recency (most recently active first).
  const rooms = useMemo(() => {
    const arr = [...(projectRooms || [])]
    arr.sort((a, b) => {
      const ta = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const tb = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return tb - ta
    })
    return arr
  }, [projectRooms])

  const visibleRooms = rooms.slice(0, 6)
  const quietCount = Math.max(0, rooms.length - visibleRooms.length)

  // Crew = the agents you work with, EA first. Show up to 6 so the panel reads
  // as a real crew, not an empty rail.
  const crew = useMemo(() => {
    const arr = [...(agents || [])]
    arr.sort((a, b) => (b.is_ea ? 1 : 0) - (a.is_ea ? 1 : 0))
    return arr.slice(0, 6)
  }, [agents])

  const topNeed = needsYou && needsYou.length ? needsYou[0] : null
  const moreNeeds = needsYou && needsYou.length > 1 ? needsYou.length - 1 : 0

  return (
    <div data-cv5-deck>
      <style>{`
        [data-cv5-deck]{
          --d-ground:#050d13; --d-bone:#EAEEF2; --d-muted:#7f97a4; --d-faint:#536775;
          --d-line:rgba(150,200,210,.12); --d-hud:rgba(120,225,200,.5);
          --d-teal:#39d6aa; --d-amber:#e7b15a; --d-violet:#9a8bf0;
          --d-display:'Hedvig Letters Serif',Georgia,serif;
          --d-body:'Figtree',system-ui,sans-serif;
          --d-mono:'IBM Plex Mono',monospace;
          position:relative; width:100%; height:100%; overflow:hidden;
          background:var(--d-ground); color:var(--d-bone); font-family:var(--d-body);
          -webkit-font-smoothing:antialiased;
        }
        [data-cv5-deck] *{box-sizing:border-box}
        /* living space */
        [data-cv5-deck] .d-space{position:absolute;inset:0;z-index:0;overflow:hidden;background:
          radial-gradient(1100px 700px at 70% -10%, rgba(57,214,170,.16), transparent 58%),
          radial-gradient(800px 700px at 12% 110%, rgba(154,139,240,.10), transparent 55%),
          radial-gradient(600px 500px at 50% 50%, rgba(10,30,40,.5), transparent 70%),
          linear-gradient(180deg,#06131b,#040b11)}
        [data-cv5-deck] .d-torus{position:absolute;top:-180px;left:60%;width:680px;height:680px;border-radius:50%;
          transform:translateX(-50%) rotate(-12deg);filter:blur(1px);
          background:
            radial-gradient(circle at 50% 50%, transparent 41%, rgba(57,214,170,.18) 43%, transparent 49%),
            radial-gradient(circle at 50% 50%, transparent 33%, rgba(57,214,170,.11) 35%, transparent 41%),
            radial-gradient(circle at 50% 50%, transparent 25%, rgba(57,214,170,.06) 27%, transparent 33%)}
        [data-cv5-deck] .d-scan{position:absolute;inset:0;mix-blend-mode:overlay;
          background:repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 3px)}
        /* deck shell */
        [data-cv5-deck] .d-deck{position:relative;z-index:1;height:100%;height:100svh;display:flex;flex-direction:column;
          padding:18px 26px 20px;gap:16px;overflow:hidden}
        [data-cv5-deck] .d-hud{display:flex;align-items:center;justify-content:space-between;flex:none}
        [data-cv5-deck] .d-wm{display:flex;align-items:center;gap:12px;min-width:0}
        [data-cv5-deck] .d-mk{width:30px;height:30px;flex:none;background:linear-gradient(145deg,var(--d-teal),#157d5e);
          clip-path:polygon(0 0,100% 0,100% 70%,70% 100%,0 100%);box-shadow:0 0 22px rgba(57,214,170,.5)}
        [data-cv5-deck] .d-wm h1{font-family:var(--d-display);font-weight:400;font-size:22px;letter-spacing:.5px;margin:0}
        [data-cv5-deck] .d-tele{font-family:var(--d-mono);font-size:11px;color:var(--d-faint);letter-spacing:.12em}
        [data-cv5-deck] .d-tele b{color:var(--d-teal);font-weight:500}
        [data-cv5-deck] .d-grid{flex:1;min-height:0;display:grid;
          grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);grid-template-rows:auto 1fr auto;gap:16px}
        [data-cv5-deck] .d-panel{position:relative;min-width:0;
          background:linear-gradient(180deg,rgba(14,28,37,.72),rgba(8,18,25,.66));
          backdrop-filter:blur(20px) saturate(1.1);-webkit-backdrop-filter:blur(20px) saturate(1.1);
          border:1px solid var(--d-line);
          clip-path:polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px));
          box-shadow:0 24px 60px -30px rgba(0,0,0,.8)}
        [data-cv5-deck] .d-brk{position:absolute;width:12px;height:12px;border:1.5px solid var(--d-hud);opacity:.55}
        [data-cv5-deck] .d-brk.tl{top:8px;left:8px;border-right:0;border-bottom:0}
        [data-cv5-deck] .d-brk.br{bottom:8px;right:8px;border-left:0;border-top:0}
        [data-cv5-deck] .d-lbl{font-family:var(--d-mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--d-faint)}
        /* hero */
        [data-cv5-deck] .d-hero{grid-column:1 / 3;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}
        [data-cv5-deck] .d-hero .l{min-width:0}
        [data-cv5-deck] .d-hero .d-lbl.alert{color:var(--d-amber)}
        [data-cv5-deck] .d-hero h2{font-family:var(--d-display);font-weight:400;font-size:27px;margin:8px 0 0;line-height:1.12}
        [data-cv5-deck] .d-hero p{color:var(--d-muted);font-size:14px;margin-top:6px}
        /* step nod — a quiet supporting detail, NOT a co-equal CTA. The Review
           button owns the hero; this just shows where the decision sits. */
        [data-cv5-deck] .d-steps{display:flex;align-items:center;margin-top:16px;opacity:.62;font-family:var(--d-mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase}
        [data-cv5-deck] .d-steps .s{display:flex;align-items:center;gap:6px;color:var(--d-faint)}
        [data-cv5-deck] .d-steps .s .dot{width:6px;height:6px;border-radius:50%;border:1px solid var(--d-faint)}
        [data-cv5-deck] .d-steps .s.done{color:var(--d-faint)}
        [data-cv5-deck] .d-steps .s.done .dot{background:var(--d-faint);border-color:var(--d-faint)}
        [data-cv5-deck] .d-steps .s.now{color:var(--d-muted)}
        [data-cv5-deck] .d-steps .s.now .dot{border-color:var(--d-amber);box-shadow:0 0 5px rgba(231,177,90,.4)}
        [data-cv5-deck] .d-steps .bar{width:20px;height:1px;background:rgba(150,200,210,.14);margin:0 8px}
        [data-cv5-deck] .d-cta{font-family:var(--d-mono);font-size:13px;color:#1c1205;
          background:linear-gradient(145deg,var(--d-amber),#cf9636);padding:14px 24px;border:0;cursor:pointer;
          clip-path:polygon(0 0,100% 0,100% 62%,86% 100%,0 100%);font-weight:600;letter-spacing:.06em;white-space:nowrap;
          box-shadow:0 0 0 1px rgba(231,177,90,.4),0 8px 28px -8px rgba(231,177,90,.55);
          transition:transform .12s ease,box-shadow .15s ease}
        [data-cv5-deck] .d-cta:hover{box-shadow:0 0 0 1px rgba(231,177,90,.7),0 10px 34px -6px rgba(231,177,90,.8);transform:translateY(-1px)}
        [data-cv5-deck] .d-cta:active{transform:translateY(1px)}
        [data-cv5-deck] .d-hero.calm h2{color:var(--d-bone)}
        [data-cv5-deck] .d-hero .calmdot{width:8px;height:8px;border-radius:50%;background:var(--d-teal);box-shadow:0 0 10px var(--d-teal)}
        /* rooms */
        [data-cv5-deck] .d-rooms{grid-column:1;grid-row:2;padding:18px 20px;display:flex;flex-direction:column;min-height:0}
        [data-cv5-deck] .d-rooms .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
        [data-cv5-deck] .d-roomlist{flex:1;display:flex;flex-direction:column;gap:12px;overflow:auto;min-height:0}
        [data-cv5-deck] .d-room{position:relative;padding:15px 16px;border:1px solid var(--d-line);background:rgba(255,255,255,.018);
          clip-path:polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);display:flex;gap:14px;align-items:center;
          cursor:pointer;width:100%;text-align:left;font-family:inherit;color:inherit;transition:background .15s ease,border-color .15s ease}
        [data-cv5-deck] .d-room:hover{background:rgba(255,255,255,.045);border-color:rgba(150,200,210,.22)}
        [data-cv5-deck] .d-room>div{min-width:0}
        [data-cv5-deck] .d-room .hue{width:3px;align-self:stretch;border-radius:2px;flex:none}
        [data-cv5-deck] .d-room .body{flex:1;min-width:0}
        [data-cv5-deck] .d-room .nm{font-family:var(--d-display);font-size:18px;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        [data-cv5-deck] .d-room .st{font-family:var(--d-mono);font-size:10.5px;color:var(--d-faint);letter-spacing:.05em;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        [data-cv5-deck] .d-room .meta{margin-left:auto;text-align:right;flex:none}
        [data-cv5-deck] .d-room .d-open{font-family:var(--d-mono);font-size:10.5px;letter-spacing:.08em;color:var(--d-teal);opacity:0;transition:opacity .15s ease}
        [data-cv5-deck] .d-room:hover .d-open{opacity:.85}
        [data-cv5-deck] .c-teal{color:var(--d-teal);background:var(--d-teal)}
        [data-cv5-deck] .c-amber{color:var(--d-amber);background:var(--d-amber)}
        [data-cv5-deck] .c-violet{color:var(--d-violet);background:var(--d-violet)}
        [data-cv5-deck] .d-rooms .ft{margin-top:auto;padding-top:14px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(150,200,210,.08)}
        [data-cv5-deck] .d-rooms .ft .q{font-family:var(--d-mono);font-size:10.5px;color:var(--d-faint);letter-spacing:.06em}
        [data-cv5-deck] .d-rooms .ft .add{font-family:var(--d-mono);font-size:11px;color:var(--d-teal);letter-spacing:.06em;background:none;border:0;cursor:pointer;padding:0}
        /* crew panel (right) */
        [data-cv5-deck] .d-crewpanel{grid-column:2;grid-row:2;padding:18px 20px;display:flex;flex-direction:column;min-height:0}
        [data-cv5-deck] .d-crewlist{display:flex;flex-direction:column;gap:4px;overflow:auto;min-height:0;margin-top:12px}
        [data-cv5-deck] .d-crewrow{display:flex;align-items:center;gap:12px;padding:11px 8px;border-radius:8px;cursor:pointer;
          width:100%;text-align:left;background:none;border:0;color:inherit;font-family:inherit;transition:background .15s ease}
        [data-cv5-deck] .d-crewrow:hover{background:rgba(255,255,255,.045)}
        [data-cv5-deck] .d-crewrow .ph{width:30px;height:30px;border-radius:8px;flex:none;position:relative;background:linear-gradient(145deg,#21404c,#12252e)}
        [data-cv5-deck] .d-crewrow .ph::after{content:"";position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border-radius:50%;
          background:var(--d-teal);box-shadow:0 0 8px var(--d-teal);border:2px solid var(--d-ground)}
        [data-cv5-deck] .d-crewrow .nm{flex:1;min-width:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        [data-cv5-deck] .d-crewrow .ds{font-family:var(--d-mono);font-size:10px;color:var(--d-faint);flex:none}
        /* command bar (bottom, spans) */
        [data-cv5-deck] .d-cmdbar{grid-column:1 / 3;grid-row:3;padding:14px 20px;display:flex;align-items:center;gap:16px}
        [data-cv5-deck] .d-cmdbar .d-lbl{flex:none}
        [data-cv5-deck] .d-cmd{margin-left:auto;display:flex;align-items:center;gap:10px;flex:1;max-width:560px;
          border:1px solid rgba(57,214,170,.25);background:rgba(0,0,0,.3);padding:10px 10px 10px 16px;
          clip-path:polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)}
        [data-cv5-deck] .d-cmd input{flex:1;min-width:0;background:0;border:0;outline:0;color:var(--d-bone);font-family:var(--d-body);font-size:16px}
        [data-cv5-deck] .d-cmd input::placeholder{color:var(--d-faint)}
        [data-cv5-deck] .d-cmd .go{width:34px;height:34px;flex:none;background:linear-gradient(145deg,var(--d-teal),#157d5e);color:#042a1f;font-weight:800;
          display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;clip-path:polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)}
        /* mobile */
        @media (max-width:600px){
          [data-cv5-deck] .d-deck{padding:12px 12px calc(12px + env(safe-area-inset-bottom));gap:12px}
          [data-cv5-deck] .d-grid{grid-template-columns:minmax(0,1fr);grid-template-rows:none;grid-auto-rows:min-content;
            overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
          [data-cv5-deck] .d-hero{grid-column:1;grid-row:auto;flex-direction:column;align-items:flex-start;gap:14px}
          [data-cv5-deck] .d-hero .l{width:100%}
          [data-cv5-deck] .d-hero h2{font-size:24px}
          [data-cv5-deck] .d-cta{width:100%;text-align:center}
          [data-cv5-deck] .d-rooms,[data-cv5-deck] .d-crewpanel,[data-cv5-deck] .d-cmdbar{grid-column:1;grid-row:auto;min-height:0}
          [data-cv5-deck] .d-roomlist,[data-cv5-deck] .d-crewlist{overflow:visible}
          [data-cv5-deck] .d-cmdbar{flex-wrap:wrap;gap:12px}
          [data-cv5-deck] .d-cmd{order:-1;max-width:100%;width:100%;margin-left:0}
          [data-cv5-deck] .d-tele.coords{display:none}
        }
      `}</style>

      <div className="d-space"><div className="d-torus" /><div className="d-scan" /></div>

      <div className="d-deck">
        {/* HUD top bar */}
        <div className="d-hud">
          <div className="d-wm">
            <div className="d-mk" />
            <h1>Corner</h1>
            <span className="d-tele coords">/ deck &nbsp;·&nbsp; <b>{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</b> &nbsp;·&nbsp; {crew.length} {crew.length === 1 ? 'agent' : 'agents'}</span>
          </div>
          <div className="d-tele coords">{greeting}, {name}</div>
        </div>

        <div className="d-grid">
          {/* HERO */}
          {topNeed ? (
            <div className="d-panel d-hero">
              <span className="d-brk tl" /><span className="d-brk br" />
              <div className="l">
                <div className="d-lbl alert">&#9650; Needs you{moreNeeds ? ` · +${moreNeeds} more` : ''}</div>
                <h2>{topNeed.label}</h2>
                {topNeed.detail && <p>{topNeed.detail}</p>}
                <div className="d-steps">
                  <span className="s done"><span className="dot" />Flagged</span>
                  <span className="bar" />
                  <span className="s now"><span className="dot" />Your move</span>
                  <span className="bar" />
                  <span className="s"><span className="dot" />Done</span>
                </div>
              </div>
              <button className="d-cta" onClick={() => topNeed.onOpen && topNeed.onOpen()}>REVIEW NOW &#8594;</button>
            </div>
          ) : (
            <div className="d-panel d-hero calm">
              <span className="d-brk tl" /><span className="d-brk br" />
              <div className="l">
                <div className="d-lbl">&#9650; Command deck</div>
                <h2>{greeting}, {name}.</h2>
                <p>Nothing needs you right now. {rooms.length} {rooms.length === 1 ? 'room is' : 'rooms are'} on the deck below.</p>
              </div>
              <span className="calmdot" />
            </div>
          )}

          {/* ROOMS */}
          <div className="d-panel d-rooms">
            <span className="d-brk tl" />
            <div className="hd"><span className="d-lbl">Your rooms</span><span className="d-lbl">activity</span></div>
            <div className="d-roomlist">
              {visibleRooms.length === 0 && (
                <div style={{ padding: '8px 2px', color: 'var(--d-faint)', fontFamily: 'var(--d-mono)', fontSize: 11 }}>No rooms yet. Use the command bar to start one.</div>
              )}
              {visibleRooms.map((p, i) => {
                const hue = HUES[i % HUES.length]
                const ts = p?.last_message_at ? relativeTime(p.last_message_at) : ''
                return (
                  <button key={p.slug || i} className="d-room" onClick={() => onSelectProject && onSelectProject(p, null)}>
                    <div className={`hue c-${hue}`} />
                    <div className="body">
                      <div className="nm">{p.name || p.slug}</div>
                      <div className="st">{ts ? `last move ${ts}` : 'no activity yet'}</div>
                    </div>
                    <div className="meta"><span className="d-open">open &#8594;</span></div>
                  </button>
                )
              })}
            </div>
            <div className="ft">
              <span className="q">{quietCount > 0 ? `+${quietCount} more ${quietCount === 1 ? 'room' : 'rooms'}` : 'all rooms shown'}</span>
              <button className="add" onClick={() => onOpenSearch && onOpenSearch('')}>+ New room</button>
            </div>
          </div>

          {/* CREW */}
          <div className="d-panel d-crewpanel">
            <span className="d-brk br" />
            <span className="d-lbl">Crew</span>
            <div className="d-crewlist">
              {crew.length === 0 && (
                <div style={{ padding: '8px 2px', color: 'var(--d-faint)', fontFamily: 'var(--d-mono)', fontSize: 11 }}>No agents yet.</div>
              )}
              {crew.map((a, i) => (
                <button key={a.slug || i} className="d-crewrow" onClick={() => onSelectAgent && onSelectAgent(a)}>
                  <span className="ph" />
                  <span className="nm">{a.name || a.slug}</span>
                  <span className="ds">{a.is_ea ? 'EA' : 'agent'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* COMMAND BAR */}
          <div className="d-panel d-cmdbar">
            <span className="d-brk tl" />
            <span className="d-lbl">Command</span>
            <div className="d-cmd">
              <input
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && onOpenSearch) onOpenSearch(cmd) }}
 placeholder="Command your world , @room, /new, or just ask"
              />
              <button className="go" onClick={() => onOpenSearch && onOpenSearch(cmd)}>&#8593;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}