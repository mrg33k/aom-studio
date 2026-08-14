import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, User, Camera, Film, MapPin,
  Package, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const ACTS = [
  { n: 1, title: 'The Problem',     time: '0:00–1:10',  color: '#C84B1E' },
  { n: 2, title: 'The Breakthrough',time: '1:10–3:55',  color: '#E85D26' },
  { n: 3, title: 'The Future',      time: '3:55–5:00',  color: '#B8461B' },
];

// type: 'broll' | 'interview' | 'candid' | 'transition'
const TIMELINE = [
  {
    act: 1, beatNum: '1.1', id: 'beat-1-1',
    title: 'The Invisible Dependency', time: '0:00–0:30',
    shots: [
 { t:'0:00–0:02', tp:'transition', v:'BLACK. Text fades in: "ISA Energy"', a:'Silence. Low ambient hum begins.', n:'Theater, let the room settle.' },
      { t:'0:02–0:04', tp:'broll', v:'City skyline at dusk. Buildings lighting up one by one. Wide, locked tripod.', a:'Hum builds.', n:'Tempe Town Lake or stock.' },
      { t:'0:04–0:06', tp:'broll', v:'Phone charging on nightstand. Close-up, handheld, shallow DOF.', a:'Narration: "Everything runs on electricity."', n:'Intimate, personal scale.' },
 { t:'0:06–0:08', tp:'broll', v:'Hospital monitors. Green waveforms. Beeping. Macro lens.', a:'"Every light, every screen..."', n:'Stakes, lives depend on this.' },
      { t:'0:08–0:10', tp:'broll', v:'Data center rack. LEDs blinking. Handheld tracking shot.', a:'"...every system keeping someone alive right now."', n:'Industrial scale.' },
      { t:'0:10–0:12', tp:'broll', v:"Slow push on a light switch. Someone's hand flips it. Light fills room.", a:'"And almost nobody thinks about where it comes from."', n:'The simplest gesture.' },
      { t:'0:12–0:14', tp:'transition', v:'Brief black or dark transition.', a:'Beat. Silence.', n:'Let the line land.' },
      { t:'0:14–0:28', tp:'interview', s:'Hunter', v:'HUNTER talking head. Medium close-up, lab background soft.', a:'Hunter: "When did you first realize how fragile the thing we all depend on actually is?"', n:'First face we see. Warm key light, slight off-center. He should feel real.' },
      { t:'0:28–0:30', tp:'broll', v:'Power line silhouette against sky.', a:"Hunter's last words trail as we transition.", n:'Visual bridge to 1.2.' },
    ],
  },
  {
    act: 1, beatNum: '1.2', id: 'beat-1-2',
    title: 'The Century-Old Grid', time: '0:30–0:55',
    shots: [
      { t:'0:30–0:34', tp:'broll', v:'Wide drone shot: transmission lines crossing desert. Slow lateral move.', a:'Narration: "The grid that powers it all was built more than a century ago."', n:'US-60 or stock. Scale that dwarfs people.' },
      { t:'0:34–0:37', tp:'broll', v:'Massive electrical substation. Locked wide. Heat shimmer if possible.', a:'"Centralized generation. Massive infrastructure."', n:'APS substation from road. Telephoto.' },
      { t:'0:37–0:40', tp:'broll', v:'Cooling towers of a power plant. Steam rising.', a:'"Long-distance transmission with energy lost at every step."', n:'Stock footage. Heavy, industrial feel.' },
      { t:'0:40–0:42', tp:'broll', v:'Workers inspecting aging infrastructure. Hard hats, clipboards.', a:'Narration fades.', n:'Stock or pickup day.' },
      { t:'0:42–0:53', tp:'interview', s:'Skylar', v:'SKYLAR talking head. Clean workspace background.', a:'Skylar: "When you talk to potential customers and partners, what do they say about the current state of energy infrastructure?"', n:'Skylar grounds it in real conversations. Market-facing energy.' },
      { t:'0:53–0:55', tp:'broll', v:'Single power line stretching to horizon.', a:'Transition beat.', n:'Visual punctuation.' },
    ],
  },
  {
    act: 1, beatNum: '1.3', id: 'beat-1-3',
    title: "The Gap Renewables Can't Close", time: '0:55–1:10',
    shots: [
      { t:'0:55–0:58', tp:'broll', v:'Wind turbines at sunset. Blades slowing. Golden light.', a:'Narration: "Renewables are part of the answer."', n:'Stock or Painted Rock Dam area.' },
      { t:'0:58–1:01', tp:'broll', v:'Solar panels. Clouds passing, shadow falling across them. Timelapse.', a:'"But the sun goes down. The wind stops."', n:'Loop 202 solar farms or stock.' },
      { t:'1:01–1:05', tp:'broll', v:'Single house in remote desert. Wide. Isolated. No power lines visible.', a:'"And the places that need power most are often the farthest from any grid."', n:'Hwy 87 toward Payson. Telephoto.' },
      { t:'1:05–1:08', tp:'broll', v:'Slow zoom on the dark windows of the remote house. No lights inside.', a:'Music shifts. Tone changes from problem to possibility.', n:'This is the turn. Act 2 is coming.' },
      { t:'1:08–1:10', tp:'transition', v:'Brief black.', a:'Beat.', n:'Breathe before the breakthrough.' },
    ],
  },
  {
    act: 2, beatNum: '2.1', id: 'beat-2-1',
    title: 'The Origin', time: '1:10–1:50',
    shots: [
      { t:'1:10–1:14', tp:'broll', v:'Sedona lab exterior. Wide establishing shot. Red rocks in background. Slow push toward entrance.', a:'Narration: "Nearly a decade ago, a team in Sedona..."', n:'Shoot day. Golden light if afternoon.' },
      { t:'1:14–1:17', tp:'broll', v:'Door opens. We step inside. Handheld, following someone in.', a:'"...started asking a different question:"', n:'First time inside. Discovery moment.' },
      { t:'1:17–1:20', tp:'broll', v:'Lab interior reveal. Equipment on benches. Whiteboards. Warm, real. Not corporate.', a:'"What if you didn\'t need the grid at all?"', n:'Slow pan. Let the audience take it in.' },
      { t:'1:20–1:23', tp:'candid', v:'LAB CANDID: Two team members at whiteboard, sketching. Marker squeaking.', a:'Ambient lab sounds.', n:'Natural, not staged.' },
      { t:'1:23–1:25', tp:'candid', v:'Close-up: lab notebook pages with handwritten equations.', a:'Quiet.', n:'Texture. Real work.' },
      { t:'1:25–1:42', tp:'interview', s:'Hunter', v:'HUNTER talking head. Lab behind him, slightly out of focus. Equipment visible.', a:'Hunter: "Take me back to the beginning. What was the original insight?"', n:'This is the origin story. Give him room. 15–17 sec of clean answer.' },
      { t:'1:42–1:45', tp:'candid', v:'LAB CANDID: Someone carrying a prototype component across the lab.', a:"Hunter's words trail.", n:'Bridge to tech explanation.' },
      { t:'1:45–1:50', tp:'candid', v:'LAB CANDID: Harrison at his workstation. Shot from behind/side. We see him AND the equipment. Deep focus.', a:'Soft transition music.', n:'Sets up Harrison before we hear from him.' },
    ],
  },
  {
    act: 2, beatNum: '2.2', id: 'beat-2-2',
    title: 'What the Technology Actually Does', time: '1:50–2:35',
    shots: [
      { t:'1:50–1:53', tp:'broll', v:'Extreme close-up: ISA coil device. Rack focus from coil to oscilloscope behind it.', a:'Narration: "ISA\'s technology captures ambient energy..."', n:'Macro lens. Precision.' },
      { t:'1:53–1:56', tp:'broll', v:'Oscilloscope waveform. Clean sine wave. Screen fills frame.', a:'"...energy that already exists in the environment..."', n:'The science made visual.' },
      { t:'1:56–1:59', tp:'broll', v:"Harrison's hands adjusting the transformer coil. Deliberate, careful movements.", a:'"...and converts it into usable power."', n:'His hands tell the story of craft.' },
      { t:'1:59–2:02', tp:'broll', v:'The moment: device powers a light bulb. It turns on. Hold the shot.', a:'"Directly at the point of consumption."', n:'THIS is the money shot. Let it breathe.' },
      { t:'2:02–2:04', tp:'broll', v:'Signal generator and amplifier running. LEDs active.', a:'"No grid connection. No fuel source. No dependence on weather."', n:'Technical credibility.' },
      { t:'2:04–2:30', tp:'interview', s:'Harrison', v:'HARRISON talking head. Lab background. Equipment visible but soft.', a:'Harrison: "In the simplest terms you can, explain what this system actually does."', n:'THE most important soundbite. 25+ sec. If he nails it, DO NOT CUT.' },
      { t:'2:30–2:33', tp:'candid', v:'LAB CANDID: Harrison and team member calibrating coil together. Two people, one problem.', a:"Harrison's last words.", n:'Shows teamwork, not solo genius.' },
      { t:'2:33–2:35', tp:'broll', v:'Close-up: oscilloscope reading. Numbers on screen. Data.', a:'Quiet beat.', n:'Visual proof before we talk about proof.' },
    ],
  },
  {
    act: 2, beatNum: '2.3', id: 'beat-2-3',
    title: 'The Proof', time: '2:35–3:10',
    shots: [
      { t:'2:35–2:38', tp:'broll', v:'Scientist observing measurements. Over-the-shoulder shot looking at equipment.', a:'Narration: "And they proved it."', n:'Simple. Direct.' },
      { t:'2:38–2:41', tp:'broll', v:'Validation study documents. Close-up. Official letterhead. Graphs.', a:'"Independent validation confirmed net energy gain."', n:'Paper proof. Tangible.' },
      { t:'2:41–2:44', tp:'broll', v:'Oscilloscope showing net energy gain reading. Push in slow.', a:'"Not on paper. In the lab."', n:'Data on screen. No hype.' },
      { t:'2:44–2:47', tp:'broll', v:'Lab notebook pages. Handwritten data entries. Pencil marks.', a:'"Measured, documented, and repeatable."', n:'Human touch on scientific process.' },
      { t:'2:47–3:05', tp:'interview', s:'Harrison', v:'HARRISON talking head. Same setup.', a:'Harrison: "What did the validation study actually show? Walk me through the moment you saw the results."', n:'18 sec. The proof delivered with understatement.' },
      { t:'3:05–3:08', tp:'candid', v:'LAB CANDID: Team gathered around monitor, watching results. Someone nods.', a:'Ambient.', n:'Authentic reaction shot.' },
      { t:'3:08–3:10', tp:'candid', v:'LAB CANDID: Equipment rack power-up. LEDs sequence on. Fans spin.', a:'Mechanical sounds.', n:'Energy. Forward motion.' },
    ],
  },
  {
    act: 2, beatNum: '2.4', id: 'beat-2-4',
    title: 'Why Now', time: '3:10–3:55',
    shots: [
      { t:'3:10–3:13', tp:'broll', v:'Dense city at night. Every building lit. Aerial or high angle.', a:'Narration: "The timing matters."', n:'Phoenix downtown or stock.' },
      { t:'3:13–3:16', tp:'broll', v:'Construction cranes. New buildings going up.', a:'"Global energy demand is accelerating faster than infrastructure can grow."', n:'Rio Salado area, Tempe.' },
      { t:'3:16–3:19', tp:'broll', v:'EV charging station. Car plugged in. Lights blinking.', a:'"AI. Electric vehicles."', n:'Any Tesla Supercharger.' },
      { t:'3:19–3:22', tp:'broll', v:'Server farm exterior. Massive building. Industrial cooling units.', a:'"Entire economies going digital."', n:'CyrusOne or QTS, Price Rd. From parking lot.' },
      { t:'3:22–3:25', tp:'broll', v:'Quick montage: phone screen, laptop, smart home device, medical scanner.', a:'"The grid was never built for this."', n:'1-second cuts. Demand is everywhere.' },
      { t:'3:25–3:45', tp:'interview', s:'Skylar', v:'SKYLAR talking head. Same clean setup.', a:'Skylar: "Why does this technology matter right now? What\'s changed in the market?"', n:'20 sec. Market urgency. He should feel energized.' },
      { t:'3:45–3:50', tp:'candid', v:'LAB CANDID: Close-up hands soldering connections. Sparks. Precision.', a:"Skylar's words trail.", n:'The team is building while the market waits.' },
      { t:'3:50–3:55', tp:'broll', v:'Wide shot: lab from above (if possible) or wide interior. Team at work. Activity.', a:'Music swells slightly.', n:'The lab is alive. Transition to Act 3.' },
    ],
  },
  {
    act: 3, beatNum: '3.1', id: 'beat-3-1',
    title: 'What This Means for the World', time: '3:55–4:35',
    shots: [
      { t:'3:55–3:58', tp:'broll', v:'Modern home at night. Warm light from windows. Inviting.', a:'Narration: "Imagine a home that powers itself."', n:'Arcadia neighborhood. Drive-by exterior.' },
      { t:'3:58–4:01', tp:'broll', v:'Office building. Fully powered. Night. Every floor lit.', a:'"A business that never worries about the grid going down."', n:'Scottsdale or Tempe office park.' },
 { t:'4:01–4:04', tp:'broll', v:'Remote community. Small structures. Then, lights come on.', a:'"A community that was never connected to the grid in the first place..."', n:'Stock or composite. The contrast matters.' },
      { t:'4:04–4:07', tp:'broll', v:"Close-up: child's face lit by a lamp turning on. Wonder.", a:'"...finally with reliable power."', n:'Stock. Emotional beat.' },
      { t:'4:07–4:10', tp:'broll', v:'Electric vehicle charging. Night. Clean energy flowing.', a:'Brief pause in narration.', n:'Visual punctuation.' },
      { t:'4:10–4:30', tp:'interview', s:'Hunter', v:'HUNTER talking head. Lab background. Warm.', a:'Hunter: "When this technology is fully deployed, what does the world look like?"', n:'20 sec. Grounded vision. Not "we\'ll change the world." Specific.' },
      { t:'4:30–4:35', tp:'broll', v:'Wide landscape: Sedona at late afternoon. Red rocks. Space.', a:"Hunter's last words.", n:'Setting up the emotional close.' },
    ],
  },
  {
    act: 3, beatNum: '3.2', id: 'beat-3-2',
    title: 'The Close', time: '4:35–4:55',
    shots: [
      { t:'4:35–4:38', tp:'broll', v:'ISA team walking together outside the lab. Golden hour. Casual.', a:'Narration: "The future of energy is not bigger plants and longer power lines."', n:'Natural, not posed. End-of-day energy.' },
      { t:'4:38–4:41', tp:'broll', v:'Golden hour light through lab windows. Dust particles in the beam. Interior.', a:'"It\'s smaller, closer..."', n:'Beautiful light. Cinematic.' },
      { t:'4:41–4:43', tp:'broll', v:'Final device shot. The coil. Still. Powerful in its simplicity.', a:'"...and already here."', n:'The technology. Quiet confidence.' },
      { t:'4:43–4:53', tp:'interview', s:'Hunter', v:'HUNTER talking head. Tightest framing yet. Just his face and shoulders.', a:'Hunter: "What drives you to keep going? What is this really about for you?"', n:'THE emotional close. 10 sec of truth. Last human voice we hear.' },
      { t:'4:53–4:55', tp:'broll', v:'Wide shot: Sedona landscape at dusk. Red rocks, open sky. Hold.', a:"Hunter's last word echoes. Then silence. Music only.", n:'Earned moment.' },
    ],
  },
  {
    act: 3, beatNum: '3.3', id: 'beat-3-3',
    title: 'End Card', time: '4:55–5:00',
    shots: [
      { t:'4:55–4:57', tp:'transition', v:'Black. ISA Energy logo fades in. Clean. Centered.', a:'Music resolves to final note.', n:'Simple. Premium.' },
      { t:'4:57–4:59', tp:'transition', v:'Tagline appears below logo.', a:'Silence.', n:'Let it sit.' },
 { t:'4:59–5:00', tp:'transition', v:'URL or contact info fades in below. Hold.', a:'Silence.', n:'Theater, the screen stays up.' },
    ],
  },
];

const SUBJECTS = [
  {
    name: 'Hunter', role: 'CEO / Founder', order: 2,
    beats: ['1.1', '2.1', '3.1', '3.2'],
    description: 'The visionary. Speaks with the quiet conviction of someone who has been in the lab doing the work.',
    questions: [
      { q: 'When did you first realize how fragile the energy system we all depend on actually is?', beat: '1.1', hope: 'A personal, specific moment. Not a statistic.' },
      { q: 'Take me back to the beginning. What was the original insight that made you believe ambient energy capture was possible?', beat: '2.1', hope: 'The origin story in human terms.' },
      { q: 'When this technology is fully deployed, what does the world look like? What changes for ordinary people?', beat: '3.1', hope: 'Grounded, specific picture. Not "we will change the world."' },
      { q: 'What drives you to keep going? What is this really about for you?', beat: '3.2', hope: 'The emotional truth. Why this matters to him personally. Potential closer.' },
      { q: 'What is the single biggest misconception people have about energy and where it comes from?', beat: '1.1/1.2 flex', hope: 'A sharp, quotable line that reframes the grid.' },
      { q: 'Describe what it felt like the first time the system actually worked.', beat: '2.3 flex', hope: 'The most powerful 5 seconds if he is honest about it.' },
    ],
  },
  {
    name: 'Harrison', role: 'Asst Lead Science', order: 1,
    beats: ['2.2', '2.3'],
 description: 'The engineer. Brings credibility through competence, the quiet authority of someone who builds things that work.',
    questions: [
      { q: 'In the simplest terms you can, explain what this system actually does and why it is different from anything else out there.', beat: '2.2', hope: 'Plainest, clearest explanation possible. 15 sec a non-engineer understands = gold standard.' },
      { q: 'What did the validation study actually show? Walk me through the moment you saw the results.', beat: '2.3', hope: 'Proof delivered with understatement.' },
      { q: 'What makes this system reproducible? How do you know it was not a one-time result?', beat: '2.3 support', hope: 'Scientific credibility. Repeatability is the difference.' },
      { q: 'What is the hardest technical challenge you have solved so far, and what told you the approach was working?', beat: '2.2 flex', hope: 'A specific engineering moment. A problem and how they solved it.' },
      { q: 'What would you say to a skeptical engineer who hears "ambient energy capture" and assumes it is too good to be true?', beat: '2.2/2.3 flex', hope: 'Direct, confident, data-backed. Not defensive.' },
    ],
  },
  {
    name: 'Skylar', role: 'Sales / Business Dev', order: 3,
    beats: ['1.2', '2.4'],
 description: 'The translator. Connects the technology to the real world, market need, customer pain, commercial timing.',
    questions: [
      { q: 'When you talk to potential customers and partners, what do they say about the current state of energy infrastructure?', beat: '1.2', hope: 'Specific, real-world pain points. Actual things people say in meetings.' },
      { q: 'Why does this technology matter right now, specifically? What has changed in the market that makes ISA\'s timing so critical?', beat: '2.4', hope: 'Urgency and specificity. AI demand, grid strain, electrification.' },
      { q: 'What is the commercial case for ambient energy capture? Who are the first customers and what does it solve for them?', beat: '2.4 flex', hope: 'Concrete use cases. Not "everyone." Specific sectors.' },
      { q: 'What do people not understand about how far along ISA actually is?', beat: '2.3 flex', hope: 'A moment of credibility. ISA is not a whiteboard company.' },
      { q: 'If everything goes according to plan over the next 12–18 months, what does ISA look like?', beat: '3.1 flex', hope: 'Forward motion without overpromising. Manufacturing, deployment, partnerships.' },
    ],
  },
  {
    name: 'Jared', role: 'Business / Background', order: 4,
    beats: [],
 description: 'The operator. Business scale, funding, manufacturing. Safety net, only pull in if Hunter/Skylar cannot cover it.',
    questions: [
      { q: 'Where does ISA stand right now in terms of the business infrastructure needed to scale this technology?', beat: '2.4/3.1 flex', hope: 'Manufacturing, supply chain, or capital readiness. "We are not just a lab."' },
      { q: 'What does the funding landscape look like for a company like ISA right now?', beat: '2.4 flex', hope: 'Context on why the capital environment is favorable. Only use if Skylar does not cover this.' },
      { q: 'What is the biggest operational challenge between where ISA is today and full-scale deployment?', beat: '3.1 flex', hope: 'Honesty about what is hard. This adds credibility if used sparingly.' },
    ],
  },
];

const SCHEDULE = [
  { time: '9:00', endTime: '9:45',  label: 'Arrive & set up',           type: 'setup',     note: '45 min' },
  { time: '10:00', endTime: '10:30', label: 'Harrison interview',        type: 'interview', note: '20–30 min' },
  { time: '10:45', endTime: '11:30', label: 'Hunter interview',          type: 'interview', note: '30–40 min' },
  { time: '11:30', endTime: '12:30', label: 'Lab b-roll & device close-ups', type: 'broll', note: '60 min' },
  { time: '12:30', endTime: '13:15', label: 'Lunch',                     type: 'break',     note: '45 min' },
  { time: '13:30', endTime: '14:00', label: 'Skylar interview',          type: 'interview', note: '20–25 min' },
  { time: '14:15', endTime: '14:35', label: 'Jared interview',           type: 'interview', note: '15–20 min' },
  { time: '14:35', endTime: '15:30', label: 'Office b-roll & team candids', type: 'broll', note: '55 min' },
  { time: '15:30', endTime: '17:00', label: 'Sedona exterior b-roll & drone', type: 'broll', note: '90 min' },
 { time: '17:00', endTime: '18:30', label: 'Golden hour exteriors, PRIORITY', type: 'golden', note: '90 min' },
  { time: '18:30', endTime: '19:00', label: 'Wrap',                      type: 'setup',     note: '30 min' },
];

const SCHEDULE_COLORS = {
  setup:     '#4A4A46',
  interview: '#E85D26',
  broll:     '#3A7CA5',
  break:     '#2A2A28',
  golden:    '#C4902A',
};

const BROLL_SHOOT = [
  { shot: 'Lab interior walkthroughs', location: 'ISA Sedona lab', beat: '2.1, 2.2, 2.3', notes: 'The core location. Shoot heavy here.' },
  { shot: 'Team working (candids)', location: 'ISA Sedona lab', beat: '2.1–2.3', notes: 'Between interviews. Real work, not posed.' },
  { shot: 'Device close-ups', location: 'ISA Sedona lab', beat: '2.2', notes: 'Transformer coil, oscilloscope, signal generator. Macro lens.' },
  { shot: 'Whiteboard / notebook details', location: 'ISA Sedona lab', beat: '2.1, 2.2', notes: 'Real equations and diagrams, not staged.' },
 { shot: 'Lab exterior, slow push in', location: 'ISA Sedona lab entrance', beat: '2.1', notes: 'Establishes the "where." Golden light if afternoon.' },
 { shot: 'Sedona landscape wide', location: 'Red rocks, Cathedral Rock / Airport Mesa', beat: '3.2', notes: 'Golden hour.' },
  { shot: 'Sedona dusk wide', location: 'Same viewpoints', beat: '3.2', notes: 'Final closing shot. Plan for 5:30–6:30 PM.' },
  { shot: 'Team walking together', location: 'Lab parking lot or nearby trail', beat: '3.2', notes: 'Casual, natural. End-of-day energy.' },
];

const BROLL_PICKUP = [
  { shot: 'City skyline at dusk', location: 'Tempe Town Lake / South Mountain lookout', beat: '1.1', notes: 'Tripod + timelapse. 30 min at sunset.' },
  { shot: 'Hospital / medical facility exterior', location: 'Banner Health Phoenix', beat: '1.1', notes: 'Public sidewalk only. No permits needed.' },
  { shot: 'Data center exterior', location: 'CyrusOne or QTS, Price Rd', beat: '1.1', notes: 'Shoot from parking lot/street. Scale tells the story.' },
  { shot: 'Transmission lines in desert', location: 'US-60 or Loop 202 shoulder', beat: '1.2', notes: 'Wide lens. 10 minutes.' },
  { shot: 'Electrical substation', location: 'APS substations along major roads', beat: '1.2', notes: 'Telephoto from public road. Do not enter.' },
  { shot: 'Solar panels', location: 'Tempe / Mesa farms visible from Loop 202', beat: '1.3', notes: 'Shoot from road or overpass.' },
 { shot: 'Wind turbines', location: 'Stock OR Painted Rock Dam area (I-8 west)', beat: '1.3', notes: 'If too far, stock footage library.' },
  { shot: 'EV charging station', location: 'Electrify America or Tesla Supercharger (Tempe)', beat: '2.4', notes: 'Walk up and shoot chargers + cars. 10 min.' },
  { shot: 'Construction cranes / growth', location: 'Downtown Phoenix or Rio Salado (Tempe)', beat: '2.4', notes: 'Shoot from sidewalk.' },
  { shot: 'Modern home at night', location: 'Arcadia neighborhood, Scottsdale', beat: '3.1', notes: 'Drive-by exterior. Shoot from street. Evening.' },
  { shot: 'Remote / rural house', location: 'Highway 87 toward Payson', beat: '3.1', notes: 'Single structure in landscape. Telephoto from road.' },
];

const BROLL_STOCK = [
  { shot: 'Cooling towers / power plant', beat: '1.2', source: 'Stock footage library' },
  { shot: 'Wind turbines at sunset', beat: '1.3', source: 'Stock footage library' },
  { shot: 'Server farm interior', beat: '1.1, 2.4', source: 'Stock footage library (interiors rarely allow filming)' },
  { shot: 'Dense city at night (global scale)', beat: '2.4', source: 'Stock footage library' },
  { shot: 'Remote village with lights on', beat: '3.1', source: 'Stock footage library' },
];

const EQUIPMENT = [
  { category: 'Camera', items: ['Cinema camera package (primary + backup body)', 'Interview lens: 50mm or 85mm (shallow DOF)', 'B-roll: 24mm wide, 100mm macro (device close-ups)'] },
 { category: 'Support', items: ['Tripod + fluid head for interviews'·'Handheld rig or gimbal for lab b-roll'·'Drone (if permitted, check Sedona local regs)'] },
  { category: 'Lighting', items: ['2x LED panel lights (key + fill for interviews)', '1x LED tube or edge light (hair / rim / separation)', 'Gaffer tape, clamps, extension cords'] },
  { category: 'Audio', items: ['Shotgun mic on camera for b-roll ambient', '2x lavalier mics (wired or wireless) for interviews', 'Boom mic + operator if crew allows', 'Audio recorder (backup to camera audio)'] },
 { category: 'Media / Power', items: ['4+ memory cards, shoot heavy, do not run out'·'Batteries for everything, plus chargers'·'Laptop for on-set review'] },
  { category: 'Production', items: ['Release forms for all 4 interview subjects', 'Shot list printout (this document)', 'Room tone recording before first interview (30 sec silence each setup)'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const SCHED_START = timeToMin('9:00');
const SCHED_END   = timeToMin('19:00');
const SCHED_SPAN  = SCHED_END - SCHED_START;

function useSEO() {
  useEffect(() => {
    document.title = 'ISA Energy | Brand Video Bible | AOM';
    const set = (name, content, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    set('description', 'Full brand video bible for ISA Energy. Shot-by-shot timeline, interview guide, b-roll locations, shoot day schedule. Sedona Apr 2, 2026.');
    set('og:title', 'ISA Energy | Brand Video Bible', true);
    set('og:description', '3 acts, 9 beats, 4 interview subjects. Sedona Apr 2, 2026.', true);
    set('og:type', 'article', true);
    set('og:url', 'https://aheadofmarket.com/briefs/isa-energy-shoot-script', true);
    set('og:image', 'https://www.aheadofmarket.com/og-isa-energy.png', true);
  }, []);
}

const SHOT_STYLES = {
  broll:      { bg: '#111110', badge: null },
  interview:  { bg: '#18110C', badge: '#E85D26' },
  candid:     { bg: '#0D1410', badge: '#4A8C6A' },
  transition: { bg: '#0A0A0A', badge: null },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ label, title, id }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mb-10"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-3">{label}</p>
      <div className="w-12 h-[2px] bg-[#E85D26] mb-4" />
      <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">{title}</h2>
    </motion.div>
  );
}

function ShotRow({ shot, index }) {
  const style = SHOT_STYLES[shot.tp] || SHOT_STYLES.broll;
  const isInterview = shot.tp === 'interview';
  const isCandid = shot.tp === 'candid';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: index * 0.025 }}
      style={{ background: style.bg }}
      className="border-b border-white/[0.04]"
    >
      {/* Timecode */}
      <td className="py-3 px-3 md:px-4 align-top w-[90px] md:w-[110px]">
        <span className="font-mono text-[10px] text-[#8A847C] whitespace-nowrap">{shot.t}</span>
      </td>
      {/* Type indicator */}
      <td className="py-3 px-1 md:px-2 align-top w-[6px] md:w-[8px]">
        <div
          className="w-[3px] h-full min-h-[20px] rounded-full mt-1"
          style={{
            background: isInterview ? '#E85D26'
              : isCandid ? '#4A8C6A'
              : shot.tp === 'transition' ? '#3A3A38'
              : '#2A2A28',
          }}
        />
      </td>
      {/* Visual */}
      <td className="py-3 px-3 md:px-4 align-top">
        <div className="flex items-start gap-2 flex-wrap">
          {isInterview && (
            <span
              className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-sm flex-shrink-0"
              style={{ background: 'rgba(232,93,38,0.15)', color: '#E85D26', border: '1px solid rgba(232,93,38,0.2)' }}
            >
              {shot.s}
            </span>
          )}
          {isCandid && (
            <span
              className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-sm flex-shrink-0"
              style={{ background: 'rgba(74,140,106,0.12)', color: '#4A8C6A', border: '1px solid rgba(74,140,106,0.2)' }}
            >
              LAB CANDID
            </span>
          )}
          <span
            className="font-body text-xs leading-relaxed"
            style={{ color: isInterview ? '#D4C4B8' : isCandid ? '#B8CEBC' : '#C8C3BB' }}
          >
            {shot.v}
          </span>
        </div>
      </td>
      {/* Audio */}
      <td className="py-3 px-3 md:px-4 align-top hidden md:table-cell">
        <span className="font-body text-xs text-[#8A847C] leading-relaxed italic">{shot.a}</span>
      </td>
      {/* Notes */}
      <td className="py-3 px-3 md:px-4 align-top hidden lg:table-cell">
        <span className="font-mono text-[10px] text-[#6A6460] leading-relaxed">{shot.n}</span>
      </td>
    </motion.tr>
  );
}

function BeatSection({ beat, actColor }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 py-3 px-4 text-left hover:bg-white/[0.02] transition-colors"
        style={{ background: '#0F0F0E', borderLeft: `3px solid ${actColor}` }}
      >
        <div className="flex-1 flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold" style={{ color: actColor }}>BEAT {beat.beatNum}</span>
          <span className="font-body text-sm font-semibold text-[#F5F0EB]">{beat.title}</span>
          <span className="font-mono text-[10px] text-[#8A847C]">{beat.time}</span>
          <span className="font-mono text-[10px] text-[#8A847C]">{beat.shots.length} shots</span>
        </div>
        {open ? <ChevronUp size={12} className="text-[#8A847C] flex-shrink-0" /> : <ChevronDown size={12} className="text-[#8A847C] flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr style={{ background: '#0D0D0C' }} className="border-b border-white/[0.06]">
                    <th className="py-2 px-3 md:px-4 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[#6A6460] w-[90px] md:w-[110px]">Time</th>
                    <th className="py-2 px-1 w-[8px]" />
                    <th className="py-2 px-3 md:px-4 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[#6A6460]">What's on screen</th>
                    <th className="py-2 px-3 md:px-4 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[#6A6460] hidden md:table-cell">Audio</th>
                    <th className="py-2 px-3 md:px-4 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[#6A6460] hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {beat.shots.map((shot, i) => (
                    <ShotRow key={i} shot={shot} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Beat storyboard image */}
            {beat.id !== 'beat-3-3' && (
              <div className="relative h-32 overflow-hidden" style={{ background: '#0A0A08' }}>
                <img
                  src={`/images/isa-energy/${beat.id}.png`}
                  alt={beat.title}
                  className="w-full h-full object-cover opacity-30"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A08] via-transparent to-[#0A0A08]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[10px] text-[#8A847C] tracking-[0.2em]">BEAT {beat.beatNum} REFERENCE</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScheduleVisual() {
  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {[
          { label: 'Interview', color: SCHEDULE_COLORS.interview },
          { label: 'B-Roll', color: SCHEDULE_COLORS.broll },
          { label: 'Golden Hour', color: SCHEDULE_COLORS.golden },
          { label: 'Setup / Break', color: SCHEDULE_COLORS.setup },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
            <span className="font-mono text-[10px] text-[#8A847C]">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Hour labels */}
        <div className="flex justify-between mb-2">
          {['9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM'].map(h => (
            <span key={h} className="font-mono text-[9px] text-[#4A4A46]">{h}</span>
          ))}
        </div>
        {/* Bar container */}
        <div className="relative h-12 rounded-sm overflow-hidden" style={{ background: '#0D0D0C' }}>
          {SCHEDULE.map((item, i) => {
            const left = ((timeToMin(item.time) - SCHED_START) / SCHED_SPAN) * 100;
            const width = ((timeToMin(item.endTime) - timeToMin(item.time)) / SCHED_SPAN) * 100;
            const color = SCHEDULE_COLORS[item.type] || '#4A4A46';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scaleY: 0 }}
                whileInView={{ opacity: 1, scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="absolute top-0 h-full flex items-center px-2 overflow-hidden"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: color,
                  opacity: item.type === 'break' ? 0.4 : 0.85,
                  borderRight: '1px solid rgba(0,0,0,0.3)',
                }}
 title={`${item.time}, ${item.label}`}
              >
                {width > 5 && (
                  <span className="font-mono text-[8px] text-white/80 truncate leading-tight">
                    {item.label.replace(' — PRIORITY', '')}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detailed list */}
      <div className="mt-8 grid md:grid-cols-2 gap-0">
        {SCHEDULE.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-center gap-4 py-3 px-4 border-b border-white/[0.04]"
            style={{
              background: item.type === 'golden' ? 'rgba(196,144,42,0.05)' : 'transparent',
            }}
          >
            <div
              className="w-[3px] h-8 flex-shrink-0 rounded-full"
              style={{ background: SCHEDULE_COLORS[item.type] || '#4A4A46' }}
            />
            <span className="font-mono text-xs text-[#8A847C] w-16 flex-shrink-0">{item.time}</span>
            <span
              className="font-body text-sm flex-1"
              style={{ color: item.type === 'golden' ? '#C4902A' : '#C8C3BB' }}
            >
              {item.label}
            </span>
            <span className="font-mono text-[10px] text-[#4A4A46]">{item.note}</span>
          </motion.div>
        ))}
      </div>

      {/* Golden hour callout */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-start gap-3 p-4 mt-2"
        style={{ background: 'rgba(196,144,42,0.06)', border: '1px solid rgba(196,144,42,0.2)' }}
      >
        <Zap size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#C4902A' }} />
        <p className="font-body text-sm text-[#C8C3BB] leading-relaxed">
          <strong className="text-[#F5F0EB]">Golden hour note:</strong> 5:30–6:30 PM in early April. Do not burn this window on interviews.
          The Sedona landscape shots for Beat 3.2 are significantly more cinematic in that light. Plan b-roll order accordingly.
        </p>
      </motion.div>
    </div>
  );
}

function SubjectCard({ subject, index }) {
  const [expanded, setExpanded] = useState(false);
  const isPrimary = subject.beats.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="flex flex-col"
      style={{ background: '#111110', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center font-headline text-xl font-bold"
          style={{
            background: isPrimary ? 'rgba(232,93,38,0.12)' : 'rgba(255,255,255,0.04)',
            color: isPrimary ? '#E85D26' : '#8A847C',
          }}
        >
          {subject.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-base font-semibold text-[#F5F0EB]">{subject.name}</p>
          <p className="font-mono text-[10px] text-[#8A847C] mt-0.5">{subject.role}</p>
          <p className="font-body text-xs text-[#6A6460] mt-2 leading-relaxed">{subject.description}</p>
        </div>
      </div>

      {/* Beats */}
      {subject.beats.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {subject.beats.map(b => (
            <span
              key={b}
              className="font-mono text-[9px] px-2 py-0.5"
              style={{ background: 'rgba(232,93,38,0.10)', color: '#E85D26', border: '1px solid rgba(232,93,38,0.15)' }}
            >
              Beat {b}
            </span>
          ))}
        </div>
      )}
      {subject.beats.length === 0 && (
        <div className="px-5 pb-4">
 <span className="font-mono text-[9px] text-[#4A4A46]">Safety net, shoot last, may not appear in final cut</span>
        </div>
      )}

      {/* Order badge */}
      <div className="px-5 pb-4">
        <span className="font-mono text-[9px] text-[#8A847C]">Interview order: </span>
        <span className="font-mono text-[9px]" style={{ color: isPrimary ? '#E85D26' : '#4A4A46' }}>#{subject.order}</span>
      </div>

      {/* Questions toggle */}
      <button
        onClick={() => setExpanded(o => !o)}
        className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className="font-mono text-[10px] text-[#8A847C]">{subject.questions.length} questions</span>
        {expanded
          ? <ChevronUp size={11} className="text-[#8A847C]" />
          : <ChevronDown size={11} className="text-[#8A847C]" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 space-y-4">
              {subject.questions.map((q, i) => (
                <div key={i} className="pt-4 border-t border-white/[0.04] first:border-0 first:pt-0">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="font-mono text-[9px] text-[#E85D26] flex-shrink-0 mt-0.5">Q{i + 1}</span>
                    <span className="font-mono text-[9px] text-[#8A847C]/70 flex-shrink-0">Beat {q.beat}</span>
                  </div>
                  <p className="font-body text-xs text-[#C8C3BB] leading-relaxed mb-1">"{q.q}"</p>
                  <p className="font-mono text-[9px] text-[#6A6460] italic leading-relaxed">Hoping for: {q.hope}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function ISAShootScript() {
  useSEO();

  const beatsByAct = (actNum) => TIMELINE.filter(b => b.act === actNum);

  return (
    <div style={{ background: '#0A0A08' }} className="min-h-screen">

      {/* ── HERO COVER ──────────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] min-h-[500px] max-h-[720px] overflow-hidden" style={{ marginTop: 0, paddingTop: 0 }}>
        {/* Background: stacked beat images */}
        <div className="absolute inset-0">
          <img
            src="/images/isa-energy/beat-2-1.png"
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.5 }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(10,10,8,0.4) 0%, rgba(10,10,8,0.1) 40%, rgba(10,10,8,0.85) 85%, #0A0A08 100%)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(10,10,8,0.6) 0%, transparent 60%)' }}
          />
        </div>

        {/* Content */}
        <div className="relative h-full max-w-6xl mx-auto px-6 md:px-12 flex flex-col justify-end pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-16 h-[2px] mb-5" style={{ background: '#E85D26' }} />
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.0] text-[#F5F0EB] mb-4">
              ISA Energy
              <br />
              <span style={{ color: '#E85D26' }}>Brand Video</span>
              <br />
              <span className="text-[#8A847C]">Production Bible</span>
            </h1>
            <p className="font-mono text-sm text-[#8A847C] mt-4 tracking-[0.05em]">
              5-Minute Theater Format &nbsp;|&nbsp; Sedona Apr 2, 2026
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap gap-3 mt-8"
          >
            {[
              { label: 'Runtime', value: '~5 minutes' },
              { label: 'Format', value: 'Theater' },
              { label: 'Shoot Date', value: 'Apr 2, 2026' },
              { label: 'Delivery', value: 'Apr 17, 2026' },
              { label: 'Subjects', value: '4 interviews' },
              { label: 'Beats', value: '9 beats' },
            ].map(item => (
              <div key={item.label} className="px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A847C]/60 mb-0.5">{item.label}</p>
                <p className="font-mono text-xs text-[#F5F0EB]">{item.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ACT NAVIGATION ──────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="border-b border-white/[0.06]"
        style={{ background: '#0D0D0C' }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="flex items-stretch overflow-x-auto">
            {[
              { anchor: '#shot-timeline', label: 'Shot Timeline', icon: Film },
              { anchor: '#schedule', label: 'Shoot Day', icon: Clock },
              { anchor: '#subjects', label: 'Subjects', icon: User },
              { anchor: '#broll', label: 'B-Roll Guide', icon: Camera },
              { anchor: '#equipment', label: 'Equipment', icon: Package },
              { anchor: '#theater', label: 'Theater Notes', icon: Zap },
            ].map(({ anchor, label, icon: Icon }) => (
              <a
                key={anchor}
                href={anchor}
                className="flex items-center gap-2 px-4 py-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A847C] hover:text-[#F5F0EB] border-r border-white/[0.04] whitespace-nowrap transition-colors hover:bg-white/[0.02]"
              >
                <Icon size={10} />
                {label}
              </a>
            ))}
            {ACTS.map(act => (
              <a
                key={act.n}
                href={`#act-${act.n}`}
                className="flex items-center gap-2 px-4 py-4 border-r border-white/[0.04] whitespace-nowrap hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-[3px] h-4 rounded-full" style={{ background: act.color }} />
                <span className="font-mono text-[10px] text-[#8A847C] hover:text-[#F5F0EB] uppercase tracking-[0.15em]">Act {act.n}</span>
              </a>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── SHOT-BY-SHOT TIMELINE ────────────────────────────────────────────── */}
      <section id="shot-timeline" className="mt-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <SectionHeader label="Core Document" title="Shot-by-Shot Timeline" />

          {/* Row type legend */}
          <div className="flex flex-wrap gap-5 mb-8 pb-6 border-b border-white/[0.06]">
            {[
              { label: 'B-Roll', color: '#2A2A28', text: '#C8C3BB' },
              { label: 'Interview', color: '#E85D26', text: '#D4C4B8' },
              { label: 'Lab Candid', color: '#4A8C6A', text: '#B8CEBC' },
              { label: 'Transition', color: '#3A3A38', text: '#8A847C' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2 h-6 rounded-full" style={{ background: item.color }} />
                <span className="font-mono text-[10px] text-[#8A847C]">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Acts */}
          {ACTS.map(act => (
            <section key={act.n} id={`act-${act.n}`} className="mb-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-6 mb-6 pb-5 border-b border-white/[0.06]"
              >
                <div
                  className="font-headline text-7xl md:text-8xl font-bold leading-none select-none"
                  style={{ color: act.color, opacity: 0.12 }}
                >
                  0{act.n}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-1">Act {act.n}</p>
                  <h3 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">{act.title}</h3>
                  <p className="font-mono text-xs mt-1" style={{ color: act.color }}>{act.time}</p>
                </div>
              </motion.div>

              <div className="space-y-2">
                {beatsByAct(act.n).map(beat => (
                  <BeatSection key={beat.id} beat={beat} actColor={act.color} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      {/* ── SHOOT DAY SCHEDULE ───────────────────────────────────────────────── */}
      <section id="schedule" className="mt-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <SectionHeader label="Apr 2, 2026" title="Shoot Day Schedule" />
          <ScheduleVisual />
        </div>
      </section>

      {/* ── INTERVIEW SUBJECTS ───────────────────────────────────────────────── */}
      <section id="subjects" className="mt-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <SectionHeader label="Interview Guide" title="Four Voices" />
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {SUBJECTS.map((s, i) => (
              <SubjectCard key={s.name} subject={s} index={i} />
            ))}
          </div>

          {/* Interview setup notes */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 grid md:grid-cols-2 gap-4"
          >
            {[
 { label: 'Framing', text: 'Medium close-up. Eyes in upper third. Slight off-center. Subject looks just off-camera, interviewer sits next to lens, not behind it.' },
              { label: 'Background', text: 'Lab environment for Hunter and Harrison. Equipment, whiteboards, workbenches visible but soft out of focus. Not a boardroom company.' },
              { label: 'Lighting', text: 'Warm key light, soft fill. Minimal shadows. Use Sedona natural light as starting point, supplement. Avoid sterile/corporate lighting.' },
 { label: 'Audio', text: 'Lav mic on every subject. Boom as backup. Room tone recording before each setup, 30 seconds of silence in each location.' },
            ].map(item => (
              <div key={item.label} className="p-4" style={{ background: '#111110', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: '#E85D26' }}>{item.label}</p>
                <p className="font-body text-sm text-[#8A847C] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── B-ROLL LOCATION GUIDE ────────────────────────────────────────────── */}
      <section id="broll" className="mt-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <SectionHeader label="B-Roll" title="Location Guide" />

          {/* Shoot day */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[3px] h-6" style={{ background: '#C84B1E' }} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A847C]">Shoot Day</p>
 <p className="font-body text-sm font-semibold text-[#F5F0EB]">Apr 2, Sedona</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr style={{ background: '#0D0D0C' }} className="border-b border-white/[0.06]">
                    {['Shot', 'Location', 'Beat', 'Notes'].map(h => (
                      <th key={h} className="py-2 px-4 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[#6A6460]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BROLL_SHOOT.map((row, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="border-b border-white/[0.03]"
                      style={{ background: i % 2 === 0 ? '#111110' : '#0F0F0E' }}
                    >
                      <td className="py-3 px-4 font-body text-sm text-[#C8C3BB]">{row.shot}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#8A847C]">{row.location}</td>
                      <td className="py-3 px-4 font-mono text-[10px]" style={{ color: '#E85D26' }}>{row.beat}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#6A6460]">{row.notes}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pickup day */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[3px] h-6" style={{ background: '#E85D26' }} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A847C]">Pickup Day</p>
 <p className="font-body text-sm font-semibold text-[#F5F0EB]">Apr 7–8, Phoenix Metro &nbsp;<span className="font-mono text-[10px] text-[#8A847C]">Public locations</span></p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr style={{ background: '#0D0D0C' }} className="border-b border-white/[0.06]">
                    {['Shot', 'Location', 'Beat', 'Approach'].map(h => (
                      <th key={h} className="py-2 px-4 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[#6A6460]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BROLL_PICKUP.map((row, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="border-b border-white/[0.03]"
                      style={{ background: i % 2 === 0 ? '#111110' : '#0F0F0E' }}
                    >
                      <td className="py-3 px-4 font-body text-sm text-[#C8C3BB]">{row.shot}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#8A847C]">{row.location}</td>
                      <td className="py-3 px-4 font-mono text-[10px]" style={{ color: '#E85D26' }}>{row.beat}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#6A6460]">{row.notes}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock footage */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[3px] h-6" style={{ background: '#4A4A46' }} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A847C]">Stock Footage</p>
                <p className="font-body text-sm font-semibold text-[#F5F0EB]">Backup &amp; Fill &nbsp;<span className="font-mono text-[10px] text-[#8A847C]">Stock Footage Library</span></p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr style={{ background: '#0D0D0C' }} className="border-b border-white/[0.06]">
                    {['Shot', 'Beat', 'Source'].map(h => (
                      <th key={h} className="py-2 px-4 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-[#6A6460]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BROLL_STOCK.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/[0.03]"
                      style={{ background: i % 2 === 0 ? '#111110' : '#0F0F0E' }}
                    >
                      <td className="py-3 px-4 font-body text-sm text-[#C8C3BB]">{row.shot}</td>
                      <td className="py-3 px-4 font-mono text-[10px]" style={{ color: '#E85D26' }}>{row.beat}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#8A847C]">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── EQUIPMENT CHECKLIST ──────────────────────────────────────────────── */}
      <section id="equipment" className="mt-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <SectionHeader label="Shoot Day" title="Equipment Checklist" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EQUIPMENT.map((cat, i) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-5"
                style={{ background: '#111110', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-[3px] h-5 rounded-full" style={{ background: '#E85D26' }} />
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A847C]">{cat.category}</p>
                </div>
                <ul className="space-y-2">
                  {cat.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="font-mono text-[10px] mt-0.5 flex-shrink-0" style={{ color: '#E85D26' }}>--</span>
                      <span className="font-body text-sm text-[#C8C3BB] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THEATER FORMAT NOTES ─────────────────────────────────────────────── */}
      <section id="theater" className="mt-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <SectionHeader label="Production" title="Theater Format Notes" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
 { label: 'Resolution', value: '4K minimum', note: 'Shoot in 4K. Deliver in 4K. Big screen ready, every frame holds up.' },
              { label: 'Camera Movement', value: 'Slow. Deliberate.', note: 'Slow camera reads better in a theater than fast cuts. Let shots breathe.' },
              { label: 'Sound Design', value: 'The room is the instrument.', note: 'Ambient lab sounds. Subtle music swells. Silence between beats. The extra runtime lives in audio.' },
 { label: 'Color Grade', value: 'Sedona warmth is the anchor.', note: 'Every shot, Sedona or Phoenix, grades to match the warm Sedona palette. Consistent world.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="p-5"
                style={{ background: '#111110', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A847C] mb-2">{item.label}</p>
                <p className="font-body text-base font-semibold text-[#F5F0EB] mb-2">{item.value}</p>
                <p className="font-mono text-[10px] text-[#6A6460] leading-relaxed">{item.note}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 p-5"
            style={{ background: 'rgba(232,93,38,0.05)', border: '1px solid rgba(232,93,38,0.15)' }}
          >
            <p className="font-body text-sm text-[#8A847C] leading-relaxed max-w-3xl">
              The extra runtime in the 5-minute theater version vs a 2-minute cut comes from three things:{' '}
              <strong className="text-[#C8C3BB]">(1)</strong> letting interview answers run longer,{' '}
              <strong className="text-[#C8C3BB]">(2)</strong> lab team candids woven throughout Act 2,{' '}
              <strong className="text-[#C8C3BB]">(3)</strong> b-roll establishing shots that breathe instead of flash-cutting.
              The audience in a theater is not scrolling. Give them space to feel it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="mt-24 mb-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto border-t border-white/[0.06] pt-10 flex justify-center">
          <a
            href="https://aheadofmarket.com"
            aria-label="Ahead of Market"
            style={{ color: '#F5F0EB', textDecoration: 'none' }}
          >
            <span
              className="font-headline font-bold tracking-[-0.04em]"
              style={{ fontSize: '1.25rem', letterSpacing: '-0.04em', color: '#F5F0EB', opacity: 0.6 }}
            >
              AOM
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}