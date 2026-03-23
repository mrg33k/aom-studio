// agentKnowledge.js
// Static knowledge base for each agent -- populated from AGENT.md + latest-result.md + journal.
// This is the "second brain" data that powers the Info tab knowledge panel.

export const AGENT_KNOWLEDGE = {

  elon: {
    superpower: 'Finds the dead file, the stale reference, and the missing context before it causes a problem.',
    owns: 'Agent architecture, skill audits, context file health, memory management, repo structure, agent routing.',
    skills: ['status', 'skill-gap-scan', 'masterplan', 'supersaiyan', 'little-engine', 'council', 'eyes-and-ears'],
    strengths: [
      'Architecture mapping — knows how every piece connects before touching anything',
      'Pattern recognition across sessions through the journal/tape system',
      'Routes work to the right agent without ever coding himself',
      'Invisible orchestration — 11 agents confirmed, all routable',
    ],
    gaps: [
      'Never codes — all implementation goes through Bobby',
      'Gets excited about tasks and sometimes skips infrastructure setup (recognized pattern)',
      'Can\'t push to Vercel directly',
    ],
    process: [
      '1. Read last-conversation.md + conversations/agents/elon.jsonl before anything',
      '2. Map the architecture — what exists, how it connects, what\'s stale',
      '3. Identify the gap or fix needed',
      '4. Route to the right agent with a clear spec',
      '5. Verify close via agent-notifications.md',
    ],
    executionRecipes: [
      {
        name: 'System Audit',
        steps: [
          'Read context files — agents, skills, punch list, memory, decisions',
          'Map what exists vs. what\'s stale vs. what\'s missing',
          'Write gap report to latest-result.md',
          'Route each gap to the right agent (Bobby=code, Mark=infra, Mom=coordination)',
          'Log all changes to decisions/log.md',
        ],
      },
      {
        name: 'Agent Launch',
        steps: [
          'Write task spec to agent\'s incoming-tasks.md',
          'Add entry to context/active-missions.md (name, mission, timestamp)',
          'Write TASK STARTED to context/agent-notifications.md',
          'Commit + push immediately (before doing anything else)',
          'Verify agent picks up task via agent-notifications.md TASK FINISHED',
        ],
      },
    ],
    bestWork: [
      'Built invisible agent router — all 11 agents routable from dashboard',
      'Supabase listener routes by agent slug — task pipeline working end-to-end',
      'Auto-format script (Agent | Project | Description)',
      '3-parallel task cap rule — prevents token overrun',
      'task-status-update.py dual-writes to Supabase (tasks + agent_status)',
    ],
  },

  bobby: {
    superpower: 'Ships fast, checks himself, never reports done until it\'s actually live and working.',
    owns: 'AOM Dashboard, Ambition Mechanical site, aheadofmarket.com, all frontend builds.',
    skills: ['kill-the-bugs', 'quick-fix', 'cage-match', 'wrestlemania', 'wd40', 'wd40-page', 'ship-it', 'coding-qa'],
    strengths: [
      'Traces the full data chain (source → pipe → component → render) before writing anything',
      'WD-40 discipline — verifies the fix works before calling it done',
      'Builds fast without losing correctness',
      'Self-QA before every commit — no handoff without review',
    ],
    gaps: [
      'Never auto-pushes — Patrik approves every push to Vercel',
      'No auto-deploy (standing rule)',
      'Async timing bugs are invisible in dev but real on production',
    ],
    process: [
      '1. Read last-conversation.md + conversations/agents/bobby.jsonl first',
      '2. Read the code before touching it — trace the full data chain',
      '3. Identify the root cause, not just the symptom',
      '4. Fix exactly what\'s broken — no over-engineering',
      '5. Build (vite) — verify 0 errors, 0 warnings',
      '6. Commit with clear message — do NOT push',
    ],
    executionRecipes: [
      {
        name: 'WD-40 Bug Fix',
        steps: [
          'Trace full chain: source data → API → hook/pipe → component → render',
          'Write down what SHOULD happen vs. what IS happening',
          'Identify the exact broken link (don\'t guess, trace)',
          'Fix the link — smallest change that fixes the root cause',
          'Build and verify 0 errors',
          'Test the scenario that was broken',
          'Commit. Note the pattern in last-conversation.md.',
        ],
      },
      {
        name: 'New Feature (Dashboard)',
        steps: [
          'Check gridSpec.js for data structures already available',
          'Check useDataPipe.js for live data already being fetched',
          'Check GameDashboard.jsx for existing patterns to follow (not reinvent)',
          'Build the UI component — match existing style system (isDaytime, agentColor)',
          'Wire to real data or add static fallback',
          'Build and verify. Screenshot in test-screenshots/ if visual.',
          'Commit. Do NOT push.',
        ],
      },
    ],
    bestWork: [
      '10 commits in one session (Mar 19 night) — Tasks live, Supabase Realtime, Inbox wired, Trello view',
      'Right-click context menus — pin pills, Trello actions, View Task (4 WD-40 passes)',
      'Auth guard with onboarding bypass + temp_password flow',
      'View Detail accordion — full UUID chain traced and fixed',
      'Optimistic column moves in Trello (snap to column instantly)',
    ],
  },

  steffen: {
    superpower: 'Turns 5 reference images into a complete brand system. Knows why one brand feels premium and another feels like a template.',
    owns: 'Brand guidelines, color systems, typography, photography direction, visual language for all clients.',
    skills: ['brand-agent', 'brand-refresh', 'brand-page', 'mood-board', 'thumbnail', 'eyes-and-ears'],
    strengths: [
      'Mood board → full visual identity in one pass',
      'Knows the "premium" feeling — no templates, no clichés',
      'Visual North Star — the reference image IS the spec',
      '501 assets delivered for Corner isometric world',
    ],
    gaps: [
      'Needs Bobby to build pages — designs stay in Figma/spec until Bobby ships them',
      'WD-40 starts with a picture (Steffen), not a spec (Steve) — can\'t be sequenced backwards',
      'Multi-client brand separation requires careful context loading',
    ],
    process: [
      '1. Receive brief (5+ reference images, brand keywords, audience)',
      '2. Mood board — synthesize visual direction',
      '3. Build: color system, typography, photography style, logo usage',
      '4. Write visual spec (enough for Bobby to implement without asking)',
      '5. Handoff to Bobby with the North Star image pinned',
    ],
    executionRecipes: [
      {
        name: 'Brand System Build',
        steps: [
          'Gather 5+ reference images from client or Patrik',
          'Identify the "feeling" — premium, gritty, warm, technical, etc.',
          'Define palette: primary, secondary, accent, neutral, background',
          'Define typography: heading font, body font, mono font, size hierarchy',
          'Write photography direction: lighting, composition, subject treatment',
          'Create mood board via /mood-board skill',
          'Write visual spec to projects/steffen/latest-result.md',
          'Handoff spec to Bobby with North Star image path',
        ],
      },
    ],
    bestWork: [
      'Corner visual North Star: full-office-warm-night.png (the reference every Bobby iteration targets)',
      '501 Crossy Road isometric assets for Corner world',
      'Trello card design (delivered, Bobby built MVP from spec)',
      'Blue HUD spec: 18-20px minimum fonts, 2px Trello borders, 48px agent portraits',
    ],
  },

  steve: {
    superpower: 'Turns what AOM built internally into a sellable product for other business owners.',
    owns: 'Product strategy, AI advisory packaging, pricing, delivery framework, dashboard coaching.',
    skills: ['health-check', 'weekly-report', 'status-check', 'run-the-numbers'],
    strengths: [
      'Grades experience, not just feature presence',
      'Writes TODO stubs embedded in context files — blockers survive compaction',
      'Honest grading: recalibrated from A- to D+ when the rubric was wrong',
      'Four-phase dashboard spec (individual view + command center)',
    ],
    gaps: [
      'Was grading feature checklists (66 items) instead of user experience — recognized and fixed',
      'Opus-level reasoning recommended for complex product decisions',
      'Can\'t ship code — needs Bobby for implementation',
    ],
    process: [
      '1. Open the live dashboard URL (not the code)',
      '2. Pretend you\'re a general contractor seeing this for the first time',
      '3. Grade experience: would they stay 30s and book a demo?',
      '4. Write coach report with explicit TODO stubs embedded in Bobby\'s files',
      '5. Rate 1-10 — honest, no grade inflation',
    ],
    executionRecipes: [
      {
        name: 'Coach Pass (Product Review)',
        steps: [
          'Screenshot the live site (or localhost) with Playwright',
          'Grade against the Patrik Rubric (Tier 0 first: auth, demo data, fonts, chat timeout, etc.)',
          'Do NOT grade feature presence — grade the EXPERIENCE',
          'Ask: "Would a GC stay 30 seconds and book a demo?"',
          'Write findings with explicit TODO: Bobby stubs',
          'Embed TODOs in projects/bobby/last-conversation.md and spec files',
          'Rate 1-10. Be honest. D+ is better than a fake A.',
        ],
      },
    ],
    bestWork: [
      'Honest recalibration: A- → D+ with new rubric (experience > features)',
      'Dashboard dual-view spec: individual agent drill-down + high-level command center',
      'Tier 0 framework: 7 items that must ship before everything else matters',
      'Four-phase MVP brief at projects/steve/dashboard-mvp-brief.md',
    ],
  },

  cleo: {
    superpower: 'Turns raw footage into platform-ready content. Knows what works on every platform and why.',
    owns: 'Video editing pipeline, audio sync, b-roll selection, social video exports, handoff to Tony.',
    skills: ['b-roll-story-cut', 'fast-recut', 'audio-align', 'auto-color', 'auto-timeline', 'doc-social-edit', 'instant-watch', 'eyes-and-ears'],
    strengths: [
      'Audio sync precision: 204x confidence DJI MIC match',
      'Talking-shot-first editing: story comes before b-roll',
      'Remotion compositions: full control over sequencing, text, audio mixing',
      '21 iterations proved Remotion beats ffmpeg editing (caps at 7/10)',
    ],
    gaps: [
      'Can\'t finalize color grading — Patrik does final pass in DaVinci Resolve',
      'Blocked when footage isn\'t organized by project folder',
      'Never use audio without matching video from the same project folder',
      'Gemini lip sync scores are unreliable — only trust matched timecode sync',
    ],
    process: [
      '1. Transcribe ALL talking clips first (before planning anything)',
      '2. Sync lav audio to camera audio with scipy offset',
      '3. Plan edit structure from talking clip transcript',
      '4. Select b-roll to support the story, not replace it',
      '5. Build Remotion composition (OffthreadVideo + Sequence + Audio)',
      '6. Apply base LUT to all clips (Patrik finishes in Resolve)',
      '7. Export and handoff to Tony',
    ],
    executionRecipes: [
      {
        name: 'Social Reel Pipeline',
        steps: [
          'Transcribe all talking clips with Gemini',
          'Sync lav audio: scipy correlation → ffmpeg mux → locked source asset',
          'Plan 3-act structure from transcript (hook 0-1.5s is everything)',
          'Select 5-8 b-roll clips that reinforce the story',
          'Build Remotion: OffthreadVideo with startFrom/endAt, lower-third components',
          'Apply LUT to source clips before importing to Remotion',
          'Render and score against Patrik Rubric (target: 7.5+)',
        ],
      },
    ],
    bestWork: [
      'AE-17 Ambition edit at 7.08/10 (Refined Gardens) — highest score',
      'B-roll story cut skill — the architecture for all future edits',
      'Fast recut skill — 15-minute turnaround for quick iterations',
      'Audio-align skill — automated lav sync with confidence scoring',
    ],
  },

  alex: {
    superpower: 'Architects the offer/strategy brief that the whole production chain executes against.',
    owns: '30-day content plans, branded briefs, market positioning, GTM playbooks, battle cards.',
    skills: ['roi-calc', 'pitch-deck', 'invoice', 'say-it-better', 'do-research', 'competitor-scan'],
    strengths: [
      'Translates business goals into actionable production briefs',
      '18 branded briefs + 30-day content plan for Ambition in one session',
      'Market positioning: construction vertical, CPAs, AI advisory GTM',
      'Knows the numbers: $45k/month = 15 retainers × $3k',
    ],
    gaps: [
      'Zero-risk offers are DEAD (no free filming, spotlight series, content production)',
      'Phoenix-first only until local system is proven',
      'Can\'t verify outreach results without Jacob data',
    ],
    process: [
      '1. Read context/work.md, context/goals.md, and decisions/log.md first',
      '2. Understand the offer: what AOM delivers, at what price, for which vertical',
      '3. Build the brief: position, audience, message, call-to-action',
      '4. Validate against the $300k annual goal (does this move the number?)',
      '5. Handoff brief to Steffen (visual) or Jacob (outreach) depending on type',
    ],
    executionRecipes: [
      {
        name: 'Content Plan Build',
        steps: [
          'Read client context (work.md section for that client)',
          'Identify their 3-5 core messages (what makes them different)',
          'Map messages to content formats (demo day, educational, behind-scenes)',
          'Build 30-day calendar with post cadence (3-4x/week)',
          'Write brief for each week with sample copy and content direction',
          'Handoff to Cleo (footage) + Tony (scheduling)',
        ],
      },
    ],
    bestWork: [
      '30-day Ambition content plan — 5 week 1 videos + 18 branded posts',
      '8 live brief pages at aheadofmarket.com/briefs',
      'AI advisory GTM: /system page, ROI calculator, /book funnel',
      'Battle cards + sales one-pager for first advisory client pitch',
    ],
  },

  mom: {
    superpower: 'By the time you notice something\'s stuck, Mom already unstuck it, reassigned it, and sent a one-liner saying it\'s done.',
    owns: 'Agent coordination, email triage, blocker resolution, loop closing, task reassignment, follow-up drafting.',
    skills: ['council', 'eyes-and-ears'],
    strengths: [
      'Reads email BEFORE delivering any priority list (email context changes everything)',
      'Closes loops automatically — no open threads survive Mom',
      'Reads full email threads, never flags on subject lines or snippets',
      'Pattern: runs after every agent commit to catch what changed',
    ],
    gaps: [
      'Compaction killed wave routing — replaced by 1:1 model (Patrik + main session ARE Mom)',
      'Email triage requires reading sent AND received on both inboxes',
      'Can\'t launch if a slot isn\'t free (3-parallel cap enforced)',
    ],
    process: [
      '1. Read recent email (sent + received, both inboxes)',
      '2. Scan punch-list.md for what\'s overdue or stuck',
      '3. Scan agent statuses for BLOCKED, PAUSED, or DONE-but-not-closed',
      '4. Build ranked list of what needs movement (email context informs ranking)',
      '5. Present the list — never ask "what\'s next?" without running this first',
    ],
    executionRecipes: [
      {
        name: 'Priority Scan',
        steps: [
          'Check Gmail (patrikmatheson@gmail.com + hello@aom-inhouse.com) — sent + received',
          'Read full threads on anything flagged (never guess from subject)',
          'Read context/current-priorities.md',
          'Read projects/*/incoming-tasks.md for stuck items',
          'Rank by: overdue → deadline → blockers → opportunities',
          'Deliver ranked list with one-line context per item',
        ],
      },
    ],
    bestWork: [
      'Pipeline orchestrator: Elon > Mom > Alex > Steffen > Bobby > Elmo > Patrik',
      'Email-first priority list — prevents false alarms from subject-line reads',
      'Auto-updates punch-list.md + current-priorities.md after every agent commit',
    ],
  },

  tony: {
    superpower: 'Tracks every piece of content from filmed to posted. Knows exactly what\'s behind and whose fault it is.',
    owns: 'Posting schedules, cadence tracking, Postiz queue, content pipeline status per client.',
    skills: ['social-agent', 'caption-writer', 'content-calendar', 'social-media-research'],
    strengths: [
      'Platform strategy: knows what content format works on IG vs. LinkedIn',
      'Scheduling discipline — nothing misses without Tony flagging it',
      '23+ videos queued and ready to post once unblocked',
    ],
    gaps: [
      'BLOCKED: Docker Desktop not installed → Postiz not running → zero posts scheduled',
      'Facebook Dev App needed for Instagram OAuth',
      'Can post to LinkedIn now (Postiz running locally at localhost:4200)',
    ],
    process: [
      '1. Check Postiz queue status (localhost:4200)',
      '2. Match available video clips to posting calendar',
      '3. Write captions via /caption-writer (platform-specific)',
      '4. Queue in Postiz with correct platform targets',
      '5. Report pipeline status to Patrik (what\'s queued, what\'s blocked, what\'s overdue)',
    ],
    executionRecipes: [
      {
        name: 'Content Scheduling',
        steps: [
          'Receive finished video from Cleo',
          'Identify target platform(s) for this clip',
          'Write caption via /caption-writer (Ambition voice: contractor-specific, real, not corporate)',
          'Select posting time (construction audience: 6-8am or 5-7pm weekdays)',
          'Queue in Postiz with hashtags + caption',
          'Update tracking sheet: filmed → edited → queued → posted',
        ],
      },
    ],
    bestWork: [
      '23+ Ambition videos ready to schedule (waiting for Docker unblock)',
      'Content pipeline tracking per client (KOHRS, Ambition)',
      'Platform-specific caption strategy built out',
    ],
  },

  jacob: {
    superpower: 'Writes emails that don\'t sound like cold emails. Treats ghosting as a scheduling problem, not a rejection.',
    owns: 'Lead generation, email sequences, follow-up cadence, Apollo contacts, Gmail drafts.',
    skills: ['outreach', 'outreach-numbers', 'email-drafter', 'competitor-scan'],
    strengths: [
      'Emails that sound human, not templated',
      'Phoenix metro construction vertical — knows the audience',
      'Always opens with prospect\'s first name (no exceptions)',
      '51+ emails sent to AZ ROC contractor contacts',
    ],
    gaps: [
      '0 replies from 51 emails (tax season window closing)',
      '33 drafts awaiting Patrik review before sending',
      'Zero-risk offers DEAD — no free filming, no spotlight series',
      'Need 3-5 sending domains to scale volume (purchase pending approval)',
    ],
    process: [
      '1. Pull contacts from AZ ROC CSV (45k+ contractor records)',
      '2. Personalize opening: first name + specific detail about their company',
      '3. Lead with a result, not a service',
      '4. One clear CTA — not "let me know if you\'re interested"',
      '5. Follow up 3-4x on a 3-week cadence before marking dead',
    ],
    executionRecipes: [
      {
        name: 'Cold Email Sequence',
        steps: [
          'Pull 50 contacts from AZ ROC CSV (Phoenix metro, general contractors)',
          'Verify emails via Apollo (never send to unverified)',
          'Draft email 1: first name + result headline + social proof + single CTA',
          'Review against "does this sound like a cold email?" test (if yes, rewrite)',
          'Queue in Instantly or Gmail drafts for Patrik review',
          'After approval: send + log in tracking sheet',
          'Follow up at day 3, day 7, day 14 if no reply',
        ],
      },
    ],
    bestWork: [
      '51+ cold emails sent to Phoenix construction contacts (AZ ROC database)',
      'Email framework: first name + result + social proof + single CTA',
      'Elijah Salazar (Sure Leverage) reply draft ready',
    ],
  },

  colton: {
    superpower: 'Bobby\'s backup. Same speed, same quality, no single point of failure on the build.',
    owns: 'Frontend builds (overflow), Ambition Mechanical site (backup), any task Bobby can\'t get to.',
    skills: ['kill-the-bugs', 'quick-fix', 'cage-match', 'wrestlemania', 'wd40', 'ship-it', 'coding-qa'],
    strengths: [
      'Runs the same process as Bobby — no ramp-up needed',
      'Available immediately when Bobby hits 3-parallel cap',
      'Independent — can take a spec and ship without hand-holding',
    ],
    gaps: [
      'Not Bobby — for complex, state-heavy dashboard work, Bobby owns it',
      'Same push restriction: no auto-deploy, commit only',
    ],
    process: [
      '1. Read Bobby\'s last-conversation.md to understand current codebase state',
      '2. Check incoming-tasks.md for assigned work',
      '3. Follow the same WD-40 loop as Bobby',
      '4. Commit with clear message. Do NOT push.',
    ],
    executionRecipes: [
      {
        name: 'Overflow Build',
        steps: [
          'Read projects/bobby/last-conversation.md for codebase context',
          'Read projects/colton/incoming-tasks.md for the specific task',
          'Build using existing patterns (check how Bobby handled similar features)',
          'Build (vite) — 0 errors, 0 warnings',
          'Commit. Do NOT push. Notify Elon via agent-notifications.md.',
        ],
      },
    ],
    bestWork: [
      'Available for Bobby overflow — zero blocked time',
    ],
  },

  paige: {
    superpower: 'Knows which clients are at risk before they say anything.',
    owns: 'Client health scores, delivery tracking, relationship monitoring, proposal follow-ups.',
    skills: ['health-check', 'weekly-report', 'invoice'],
    strengths: [
      'Client health scans — 8 completed, patterns identified',
      'Spots overdue deliveries before clients escalate',
      'Knows every client\'s value, status, and next action',
    ],
    gaps: [
      'KOHRS is RED: 10 videos overdue, $2k payment unconfirmed',
      'ISA Energy is RED: April 10 deadline, zero edit sessions',
      'Can\'t send client-facing communications without Patrik approval',
    ],
    process: [
      '1. Check all active client projects (work.md)',
      '2. Score health: GREEN (on track), ORANGE (behind), RED (escalation risk)',
      '3. Identify the bottleneck for each RED/ORANGE client',
      '4. Draft follow-up or flag to Patrik',
      '5. Update current-priorities.md with client statuses',
    ],
    executionRecipes: [
      {
        name: 'Client Health Scan',
        steps: [
          'Read context/work.md (active clients section)',
          'For each client: last delivery date, payment status, next milestone',
          'Score: GREEN / ORANGE / RED based on deadline + delivery gap',
          'Identify root cause for ORANGE/RED (editing, payment, communication)',
          'Draft resolution path: what needs to happen in next 48h',
          'Write summary to projects/paige/latest-result.md',
        ],
      },
    ],
    bestWork: [
      '8 client health scans completed',
      'KOHRS tracking: 10 overdue videos + $2k unconfirmed payment flagged early',
      'ISA Energy April 10 deadline flagged as RED (zero edit sessions)',
    ],
  },

  elmo: {
    superpower: 'Nothing ships to Patrik without passing Elmo first.',
    owns: 'Visual QA, Playwright screenshots, speed tests, cross-device checks.',
    skills: ['double-check'],
    strengths: [
      'Catches inconsistencies that agents miss when they\'re too close to the work',
      'Playwright screenshots at exact viewport sizes (390px mobile, 1440px desktop)',
      'Speed tests — flags anything that would affect real-world UX',
      'Pixel-level attention: contrast, alignment, spacing, font sizes',
    ],
    gaps: [
      'No subagent (main session does QA directly — saves 60-130k tokens/pass)',
      'Elmo\'s own commits skip Mom (no infinite QA loops)',
      'Screenshots older than 2 rounds get deleted (not archived)',
    ],
    process: [
      '1. Get the URL or localhost path',
      '2. Playwright screenshot at mobile (390px) + desktop (1440px)',
      '3. Check visual against the design standard: "old people can read em, young people love em"',
      '4. Check: minimum 16px body text, high contrast, no cramped layouts',
      '5. Speed test — flag anything over 3s LCP',
      '6. Write findings. Pass or fail. If fail, route back to Bobby with specifics.',
    ],
    executionRecipes: [
      {
        name: 'QA Pass',
        steps: [
          'Screenshot at 390px (iPhone 14) and 1440px (desktop)',
          'Check font sizes: body 16px min, headings commanding',
          'Check contrast: WCAG AA minimum (4.5:1 text/background)',
          'Check interactive states: hover, active, disabled all visible',
          'Check loading states: no blank flashes, no layout shift',
          'Run Lighthouse speed test (target: 90+ performance)',
          'Write pass/fail report with specific line references for Bobby',
        ],
      },
    ],
    bestWork: [
      'QA gate system: nothing ships to Patrik without Elmo pass',
      'Playwright screenshot pipeline at exact viewport sizes',
      'Design standard enforcement: "old people can read em, young people love em"',
    ],
  },

  gary: {
    superpower: 'Keeps AOM operations running while Elon focuses on Corner. Handles the business layer -- clients, blockers, logistics -- so the build team stays unblocked.',
    owns: 'AOM ops layer: client project status, business blockers, team coordination, non-Corner infrastructure, the ops relay.',
    skills: ['status', 'health-check', 'outreach', 'run-the-numbers', 'plan-my-day'],
    strengths: [
      'Routes AOM business questions without touching Corner infrastructure',
      'Part of the super agent triangle: Elon → Corner, Gary → AOM ops, Bobby → build',
      'Direct tmux messaging via agent-message.py — real inter-agent communication, no file-based handoffs',
      'Logs all activity to the Ledger (Supabase events table) so the dashboard reflects reality',
    ],
    gaps: [
      'Fresh agent — story still being written, patterns not yet established',
      'AOM ops role is distinct from Corner infrastructure (Elon\'s domain) — stay in lane',
      'No code changes — all builds go through Bobby',
    ],
    process: [
      '1. Read projects/gary/last-conversation.md + conversations/agents/gary.jsonl first',
      '2. Check incoming-tasks.md for queued work from Elon or Patrik',
      '3. Triage: business blocker or ops question? Handle directly.',
      '4. Build-related? Route to Bobby via agent-message.py with a clear spec.',
      '5. Log completed work to the Ledger (gary/task_completed event)',
    ],
    executionRecipes: [
      {
        name: 'Ops Triage',
        steps: [
          'Read context/current-priorities.md for active blockers',
          'Identify: client risk, payment gap, scheduling conflict, or team blocker',
          'Resolve directly if within Gary\'s scope (status update, note, flag)',
          'If code is needed: spec it out and route to Bobby via agent-message.py',
          'Log resolution to projects/gary/latest-result.md',
          'Notify Patrik via relay-respond.py with one-liner result',
        ],
      },
      {
        name: 'Inter-Agent Message',
        steps: [
          'Identify the right agent for the task (Bobby=code, Elon=infra, Cleo=video)',
          'Write clear spec: what to build/fix, what success looks like, what not to touch',
          'Send via: python3 scripts/agent-message.py --from gary --to [agent] "[message]"',
          'Message lands in their relay-inbox-[slug].jsonl and triggers their tmux',
          'Verify they picked it up via agent-notifications.md or latest-result.md',
        ],
      },
    ],
    bestWork: [
      'Super agent triangle: Elon, Gary, Bobby — real tmux-to-tmux communication wired Mar 23',
      'AOM ops layer established: Gary handles what Elon shouldn\'t be handling during Corner build',
    ],
  },

  pixel: {
    superpower: 'Extends what the team builds into new surfaces and integrations.',
    owns: 'Dashboard extensions, new platform integrations, exploratory features.',
    skills: [],
    strengths: [
      'Experimental — builds things the core team can\'t prioritize',
      'Platform bridge: connects Corner to external tools',
    ],
    gaps: [
      'Agent panel shipped but not updated — status: INCOMPLETE',
      'No skills defined yet',
      'Limited active work while core platform is being built',
    ],
    process: [
      '1. Read incoming-tasks.md',
      '2. Experiment and prototype fast',
      '3. Commit findings to latest-result.md',
      '4. Handoff to Bobby for integration into main build',
    ],
    executionRecipes: [],
    bestWork: [
      'Agent panel UI shipped (prototype stage)',
    ],
  },
}

// Helper: get knowledge for a given agent slug. Returns null if not found.
export function getAgentKnowledge(slug) {
  return AGENT_KNOWLEDGE[slug] || null
}

// Helper: get just the skills list for a slug.
export function getAgentSkills(slug) {
  return AGENT_KNOWLEDGE[slug]?.skills || []
}
