const t="CORNER Product Spec",e="product-spec-web",n="Technical",o="Steve",i="2026-03-15",s="Mar 15",d=null,a="THE BIBLE. Complete product specification for CORNER, the AOM OS web edition. Local-first architecture.",r=[],l=`<h1>CORNER: Product Specification</h1>
<p><strong>Product Name:</strong> CORNER
<strong>Tagline:</strong> &quot;A million worlds, one platform.&quot;
<strong>North Star:</strong> &quot;Young people love it, old people can&#39;t live without it.&quot;
<strong>Date:</strong> 2026-03-15 (v1.2, C1 architecture decisions)
<strong>Author:</strong> Steve (AI Advisory Lead)
<strong>Status:</strong> THE BIBLE. All agents reference this. Bobby builds from this. Steffen designs from this.
<strong>Version:</strong> 1.2</p>
<hr>
<h2>Changelog</h2>
<h3>v1.2 (2026-03-15, C1 Meeting)</h3>
<ul>
<li><strong>ARCHITECTURE REWRITE:</strong> Local-first. Claude Code runs on a VM or client&#39;s machine, NOT in the browser via API. The dashboard is a visualization layer, not the brain.</li>
<li><strong>Hosted is primary product.</strong> AOM spins up a Docker container per client. Self-hosted is power-user edge case.</li>
<li><strong>Supabase is a SYNC layer</strong> (user accounts, shared assets, visualization data), not the AI brain. Removed multi-tenant SaaS framing.</li>
<li><strong>Client owns their CC subscription</strong> directly from Anthropic. AOM charges setup + monthly platform fee.</li>
<li><strong>Game IS the dashboard.</strong> Isometric office = 60-70% viewport. Not a dashboard with a game in it.</li>
<li><strong>Task HUD as drawer</strong> above the game (SimCity style). Open by default, collapsible. 4 views: Last Session, By Project, Upcoming, Add New.</li>
<li><strong>Chat bar at bottom.</strong> Always visible. Default agent assigned per user. Tap to expand (40%), can go full screen. RPG turn-based style.</li>
<li><strong>Agent character states refined:</strong> idle, thinking, speaking, done. Thinking = visible animation (hand on chin, typing, pacing). Response streams into speech bubble word by word.</li>
<li><strong>Streaming via WebSocket</strong> (parallel path to file-based Telegram relay). Speed targets: &lt;500ms ack, &lt;2s first token, &lt;1s status updates.</li>
<li><strong>Revised pricing tiers:</strong> Hosted ($2,500 setup + $3-5k/mo) and Self-hosted ($5-8k setup + $1.5-3k/mo).</li>
<li><strong>VM fleet architecture:</strong> Docker per client, AOM admin panel, single server ~50 clients, Kubernetes after that.</li>
<li><strong>C2 build order:</strong> Isometric world first on localhost, then HUD, chat, sprites, WebSocket, port to hosted.</li>
<li><strong>Horizon features added:</strong> Furniture marketplace, points/XP, neighbor offices, room editor.</li>
<li><strong>Mobile:</strong> iPhone PWA right after desktop is nailed.</li>
<li><strong>Autonomous build directive from Patrik:</strong> Ship iterations, Patrik gives feedback when he sees something worth talking about.</li>
</ul>
<h3>v1.1 (2026-03-15)</h3>
<ul>
<li>Product name CORNER, tagline, north star line</li>
<li>Three Modes (Game/Checklist/Megaboard) replace Three Layers</li>
<li>Agent death animations, work handoff transparency</li>
<li>Zero-stage onboarding, &quot;describe your dream office&quot;</li>
<li>Chat-first MVP, skills freemium distribution</li>
<li>RPG tactical menu (Megaboard), mode switching</li>
</ul>
<h3>v1.0 (2026-03-12)</h3>
<ul>
<li>Initial spec. Dashboard + chat + isometric vision.</li>
</ul>
<hr>
<h2>What This Is</h2>
<p>CORNER is the same AI agent system Patrik built in the terminal (AOM-EA), delivered to clients as a hosted service. Not a watered-down version. Not a monitoring page. Not a SaaS wrapper around an API. The REAL Claude Code, running on a VM that AOM manages, with a game-like dashboard as the window into what&#39;s happening.</p>
<p>Patrik is client zero. His wife is the accessibility bar. If she can open it and get value on day one without explanation, it&#39;s ready.</p>
<p><strong>The pitch:</strong> &quot;Your AI team, visible and alive.&quot;
<strong>The line:</strong> &quot;Here&#39;s what&#39;s happening, I can do anything I need to right here with my office game and wifi, fuck the world.&quot;
<strong>The vision:</strong> &quot;A million worlds, one platform.&quot; Every client gets a unique world, same engine.
<strong>The bar:</strong> &quot;A 12-year-old sees this on the news and wants to start their empire before the kid next door.&quot;</p>
<p>CORNER gets its own site/domain. NOT aheadofmarket.com. The product site is &quot;landed in heaven&quot;: ultra clean, white, spacious, bright. The site is the calm container. Creative worlds inside POP because the canvas is minimal. Think Apple keynote stage, not coffee shop. Clean but with ENERGY.</p>
<hr>
<h2>Architecture: Local-First (C1 Decision)</h2>
<p>This is the most important section in the spec. Everything else builds on this.</p>
<h3>The Principle</h3>
<p><strong>CORNER is local-first.</strong> The AI brain is Claude Code running on a real machine (a VM that AOM hosts, or the client&#39;s own machine for power users). NOT a SaaS with Claude API calls from the browser. Real CC with real relay, full tool access: Playwright, MCP servers, CLI, filesystem, git, everything.</p>
<p>The web dashboard is a <strong>visualization of what CC is doing</strong> on the VM. The dashboard is the window, not the brain.</p>
<h3>Why Local-First</h3>
<ul>
<li><strong>Full CC power.</strong> Clients get the same system Patrik runs. Not a subset. Not a chat-only API wrapper. Full agents, full relay, full tool access.</li>
<li><strong>No capability ceiling.</strong> If CC can do it in the terminal, the client gets it. Browser-based API calls hit limits fast (no filesystem, no CLI, no MCP, no Playwright).</li>
<li><strong>AOM controls the environment.</strong> Each client&#39;s VM is configured by AOM. Agents, skills, context files, relay, all managed.</li>
<li><strong>Over-the-air updates.</strong> AOM pushes skill updates, agent improvements, new capabilities to all client VMs at once.</li>
<li><strong>Client data stays on the VM.</strong> Not floating through a shared SaaS database for AI processing.</li>
</ul>
<h3>How It Works</h3>
<pre><code>CLIENT&#39;S BROWSER                    AOM-HOSTED VM (Docker)
+---------------------+            +---------------------------+
|                     |            |                           |
|  Corner Dashboard   | &lt;--WS--&gt;  |  Claude Code (real CC)    |
|  (React/Next.js)    |           |  - Full agent system      |
|                     |            |  - Relay (file-based)     |
|  - Isometric game   |            |  - MCP servers            |
|  - Task HUD         |            |  - Playwright             |
|  - Chat bar         |            |  - Filesystem access      |
|  - Megaboard        |            |  - Git, CLI, everything   |
|                     |            |                           |
+---------------------+            +---------------------------+
         |                                    |
         v                                    v
+---------------------+            +---------------------------+
| Supabase (sync)     |            | Client&#39;s Anthropic sub    |
| - User accounts     |            | (they own the CC license) |
| - Shared assets     |            |                           |
| - Visualization data|            +---------------------------+
| - Room assets       |
| - Auth + 2FA        |
+---------------------+
</code></pre>
<h3>What Lives Where</h3>
<table>
<thead>
<tr>
<th>Data</th>
<th>Where</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Agent execution, reasoning, tool use</td>
<td>VM (Claude Code)</td>
<td>This is the brain. Needs full system access.</td>
</tr>
<tr>
<td>Context files (me.md, work.md, etc.)</td>
<td>VM filesystem</td>
<td>CC reads these directly. Same as AOM-EA.</td>
</tr>
<tr>
<td>Agent status, activity events</td>
<td>VM -&gt; WebSocket -&gt; Dashboard</td>
<td>Real-time visualization of what CC is doing</td>
</tr>
<tr>
<td>Chat messages (streaming)</td>
<td>VM -&gt; WebSocket -&gt; Dashboard</td>
<td>CC responds, streams to browser in real-time</td>
</tr>
<tr>
<td>User accounts, auth, 2FA</td>
<td>Supabase</td>
<td>Shared auth layer across all clients</td>
</tr>
<tr>
<td>Room assets (isometric PNGs)</td>
<td>Supabase Storage</td>
<td>Shared, generated during onboarding</td>
</tr>
<tr>
<td>Task lists (checklist data)</td>
<td>Supabase + VM sync</td>
<td>User edits in browser, syncs to VM context</td>
</tr>
<tr>
<td>Conversation history (display)</td>
<td>Supabase</td>
<td>For conversation list/search in the UI</td>
</tr>
</tbody></table>
<h3>What Supabase Is (and Isn&#39;t)</h3>
<p><strong>Supabase is the SYNC LAYER.</strong> It handles:</p>
<ul>
<li>User authentication (login, 2FA, sessions)</li>
<li>Shared asset storage (room sprites, generated images)</li>
<li>Visualization data (agent statuses for the dashboard to render)</li>
<li>Task persistence (checklist items, synced to VM)</li>
<li>Conversation display history (not the AI context, just the UI display)</li>
</ul>
<p><strong>Supabase is NOT the AI brain.</strong> The AI runs on the VM via Claude Code. Supabase never touches the Claude API. Agent reasoning, tool use, file access, MCP calls, all of that is VM-side.</p>
<h3>Client Subscription Model</h3>
<ul>
<li>Client gets their own Claude Code subscription from Anthropic (Max plan or similar)</li>
<li>AOM charges setup fee ($2,500-8k depending on tier) + monthly platform fee ($1.5-5k)</li>
<li>AOM manages the VM, agents, skills, relay, updates</li>
<li>Client pays Anthropic directly for their CC compute</li>
<li>This means AOM&#39;s platform fee is nearly pure margin (only VM hosting costs)</li>
</ul>
<hr>
<h2>The Game Dashboard</h2>
<h3>The Principle: Game IS the Dashboard</h3>
<p>The isometric office IS the dashboard. Not a dashboard with a game mode. Not a tab you switch to. When you open Corner, you see your office. The game occupies 60-70% of the viewport. Everything else (tasks, chat) is layered on top.</p>
<h3>Layout (Desktop)</h3>
<pre><code>+------------------------------------------------------------------+
|                         TASK HUD (drawer)                         |
|  [Last Session] [By Project] [Upcoming] [Add New]                |
|  - Bobby: Rebuild /v2 to audit standard .............. IN PROG   |
|  - Jacob: Send 10 CPA follow-ups .................... QUEUED     |
|  - Steffen: Brand page v4 ........................... DONE       |
|  [collapse ^]                                                     |
+------------------------------------------------------------------+
|                                                                    |
|                                                                    |
|                    ISOMETRIC OFFICE (60-70%)                       |
|                                                                    |
|             [Patrik] [Mom]  [Alex]  [Steve]                       |
|             [Steffen]  [Main Hall]  [Jacob]                       |
|             [Bobby] [Colton] [Cleo]  [Tony]                       |
|                     [Elmo]  [Elon]                                |
|                                                                    |
|                                                                    |
+------------------------------------------------------------------+
| [Bobby v] Type a message...                              [Send]   |
+------------------------------------------------------------------+
</code></pre>
<h3>Task HUD (Above the Game)</h3>
<p>Sits ABOVE the isometric world as a collapsible drawer. SimCity-style information panel. Open by default, collapsible to a thin bar.</p>
<p><strong>Four views:</strong></p>
<ol>
<li><strong>Last Session</strong> -- What happened in the most recent work session. Recent completions, recent commits, recent events. &quot;Here&#39;s what your team did while you were gone.&quot;</li>
<li><strong>By Project</strong> -- Tasks grouped by project/client. For clients with multiple workstreams.</li>
<li><strong>Upcoming</strong> -- What&#39;s queued next. Priority-ordered across all agents.</li>
<li><strong>Add New</strong> -- Quick task entry. Pick an agent (or let the system route it), type the task.</li>
</ol>
<p><strong>Vibe:</strong> &quot;How do you wanna get things done.&quot; Not project management. Not Jira. A clean, fast way to see what matters and add what&#39;s next.</p>
<h3>Chat Bar (Bottom of Screen)</h3>
<p>Always visible at the bottom. A text input bar, always ready.</p>
<ul>
<li>Default agent assigned per user. Can be changed weekly or on the fly.</li>
<li><strong>Collapsed state:</strong> Single line text input. Agent avatar + name on the left. Send button on the right.</li>
<li><strong>Expanded state (tap/click):</strong> Expands to 40% of viewport. Shows conversation history with the current agent. Messages stream in real-time.</li>
<li><strong>Full screen:</strong> Can go full screen from expanded state. Immersive 1:1 conversation.</li>
<li><strong>RPG turn-based style:</strong> Chat feels like RPG dialogue. Agent speaks in speech bubble with their character portrait. Response streams in word by word. Typing animation plays on the agent&#39;s character in the isometric view simultaneously.</li>
</ul>
<h3>Agent Character States (4 Core)</h3>
<table>
<thead>
<tr>
<th>State</th>
<th>Visual (in isometric room)</th>
<th>Chat Indicator</th>
</tr>
</thead>
<tbody><tr>
<td><strong>Idle</strong></td>
<td>Agent at desk, relaxed posture. Monitor dimmed.</td>
<td>&quot;Ready&quot; status dot</td>
</tr>
<tr>
<td><strong>Thinking</strong></td>
<td>Character animation: hand on chin, OR typing on keyboard, OR pacing in room. Visible, unmistakable &quot;working on it&quot; body language.</td>
<td>Thinking indicator (dots or animation)</td>
</tr>
<tr>
<td><strong>Speaking</strong></td>
<td>Agent faces camera/user direction. Speech bubble appears above character. Response text streams into bubble word by word.</td>
<td>Message streaming in chat bar</td>
</tr>
<tr>
<td><strong>Done</strong></td>
<td>Agent leans back, stretches, green checkmark floats up. Returns to idle.</td>
<td>Response complete, action cards rendered</td>
</tr>
</tbody></table>
<p><strong>Full character movement</strong> (walking between rooms, handoff animations where one agent walks to another&#39;s room to deliver work) is the north star but a later tier. Architecture supports it from day one.</p>
<h3>Agent Death (Still Animations, Not Error Screens)</h3>
<p>Same principle from v1.1. Agent session crashes = character gets up, walks to bathroom/gets water. NOT an error screen. Room stays visible. User can still chat (messages queue). System reconnects silently. Character walks back, reads queue, resumes. User NEVER sees &quot;disconnected&quot; or &quot;error.&quot;</p>
<h3>Work Handoff Transparency</h3>
<p>When one agent assigns work to another, the user SEES it. Notification in the HUD, feed item in the Megaboard, visual cue in the game (note appears on the receiving agent&#39;s desk). User is the boss. They see every assignment in real time.</p>
<hr>
<h2>The Three Modes</h2>
<p>The product is three MODES the user toggles between. Three ways to engage with the same system. A user can live in any mode and get value.</p>
<h3>Mode 1: The Game (Isometric Overworld) -- DEFAULT</h3>
<p>The default home screen. Fun, alive, ambient. See your agents working. Daily engagement through delight. The differentiator. The thing no other AI product has.</p>
<p><strong>What it is:</strong> An isometric pixel-art world where each agent has their own workspace room. You see your entire AI team at once, like looking down into a building with the roof removed. Inspired by The Sims and Habbo Hotel.</p>
<p><strong>What you see:</strong></p>
<ul>
<li>Each agent sits in their own room</li>
<li>Room style reflects the agent&#39;s function (developer room has monitors and code, creative director room has design boards, outreach room has phone and email stacks)</li>
<li>Rooms generated from the client&#39;s own description via Gemini (see Onboarding). &quot;A million worlds, one platform.&quot;</li>
<li>Ambient status is visual, not just a colored dot:<ul>
<li><strong>Idle:</strong> Agent leans back, monitor dimmed, room lights slightly lower</li>
<li><strong>Thinking:</strong> Agent actively animating (hand on chin, typing, pacing). Monitor glow active.</li>
<li><strong>Speaking:</strong> Agent faces user. Speech bubble with streaming text.</li>
<li><strong>Done:</strong> Agent stands up, stretching or coffee animation, green checkmark floats up</li>
</ul>
</li>
<li>Monitor glow color matches status (green/gray/red/blue/yellow/orange, same palette as dashboard)</li>
</ul>
<p><strong>Interactions:</strong></p>
<ul>
<li><strong>Click a room</strong> to focus chat bar on that agent (chat expands)</li>
<li><strong>Hover a room</strong> to see a tooltip with agent name, role, current task, status</li>
<li><strong>Drag agents into shared rooms</strong> to create teams (future: triggers collaborative agent sessions)</li>
<li>Rooms can be rearranged, customized over time (see Room Editor in Horizon Features)</li>
</ul>
<p><strong>Technical approach (v1):</strong></p>
<ul>
<li>Rooms are PNG sprites placed on an isometric grid</li>
<li>No 3D engine needed. HTML/CSS transforms (per C2 build order), PixiJS if performance demands it</li>
<li>Isometric grid uses Steffen&#39;s connected floor plan spec (<code>corner-floor-plan-spec.md</code>)</li>
<li>Sprite sheets for agent animations (4 core states: idle, thinking, speaking, done)</li>
<li>Room images generated per-client via Gemini 2.5 Flash Image model (free tier)</li>
</ul>
<p><strong>Why this matters:</strong>
Every other AI dashboard is a table with status badges. Boring. Forgettable. The isometric world makes agents feel like team members, not line items. It&#39;s the visual that makes a CPA say &quot;I want that&quot; without understanding what AI agents even do.</p>
<h3>Mode 2: The Checklist (Per-Agent Task View)</h3>
<p>The workhorse. 90% of daily client interaction. Simple, fast, no overhead.</p>
<p><strong>What it is:</strong> A simple draggable checklist per agent. Top item = current priority. Drag to reorder. Check off when approved. This is NOT a project management tool. No tickets, no sprints, no status columns, no Gantt charts, no kanban boards.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>Select an agent (from sidebar or game view)</li>
<li>See their task list as a vertical list of items</li>
<li>Top item = what the agent is working on right now</li>
<li>Drag items to reorder priorities</li>
<li>Check off completed work</li>
<li>Add new tasks by typing at the bottom</li>
<li>That&#39;s it. Nothing else.</li>
</ul>
<p><strong>Why no project management complexity:</strong> Patrik&#39;s insight: the moment you add columns, statuses, or workflow stages, you&#39;ve lost the small business owner. They don&#39;t want to learn a tool. They want to tell their AI team what to do and see it get done. The checklist is the interface for that.</p>
<p><strong>Technical:</strong> Tasks stored in Supabase <code>tasks</code> table with <code>automation_id</code> (agent), <code>position</code> (drag order), <code>status</code> (pending/done), <code>text</code>. Changes sync to the VM so agents pick up priority changes. Real-time sync via Supabase Realtime.</p>
<h3>Mode 3: The Megaboard (RPG Tactical Menu)</h3>
<p>The &quot;show me everything&quot; screen. Pokemon/Final Fantasy style stats and strategy view.</p>
<p><strong>What it is:</strong> An RPG tactical menu inspired by Pokemon party screens and Final Fantasy menus. Revenue, throughput, agent performance, deliverables, pipeline flow. The metrics view for when you want the full picture.</p>
<p><strong>What it shows:</strong></p>
<ul>
<li>Party screen: All agents with their stats, levels (experience/tenure), current quests (active tasks)</li>
<li>Quest log: All active missions across all agents, sorted by priority</li>
<li>Inventory: Deliverables produced, files created, assets generated</li>
<li>Mission feed: Real-time pipeline events (commits, completions, handoffs, blocks)</li>
<li>Revenue/throughput metrics: The business numbers</li>
</ul>
<p><strong>Also incorporates the Command View and Individual Agent View</strong> already specced in <code>projects/steve/dashboard-mvp-brief.md</code> and <code>projects/steve/dashboard-dual-view-spec.md</code>. Those specs remain Bobby&#39;s build docs.</p>
<p><strong>Command View shows:</strong></p>
<ul>
<li>Throughput bar (Working / Idle / Blocked / Done Today / Commits Today)</li>
<li>Agent grid (all agents visible, status pills, current tasks, &quot;View Agent&quot; drill-down)</li>
<li>Pipeline feed (real-time events, commits, completions)</li>
<li>Blockers section (only renders if blockers exist)</li>
</ul>
<p><strong>Individual Agent View shows:</strong></p>
<ul>
<li>Current mission</li>
<li>Vitals (status, uptime, files touched, commits)</li>
<li>Activity log (timestamped, newest first)</li>
<li>Recent completions (last 7 days)</li>
<li>Active files</li>
</ul>
<p><strong>Full specs already written:</strong> See <code>dashboard-mvp-brief.md</code> for component breakdown, API routes, data sources, polling strategy, status derivation logic, file structure, and build order. That document is Bobby&#39;s implementation guide for this mode&#39;s data views.</p>
<h3>1:1 Agent Chat (Available From Any Mode)</h3>
<p>The power interaction. Chat is accessible from any mode via the persistent chat bar at the bottom. Not a mode itself.</p>
<p><strong>What it is:</strong> A browser-based chat interface where clients talk directly to any agent. Same experience Patrik has in the terminal, but accessible to anyone with a browser. Connected to REAL Claude Code on the VM, not a proxied API call.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>Chat bar always visible at bottom</li>
<li>Click an agent&#39;s room (The Game) to switch chat context to that agent</li>
<li>Click &quot;Chat&quot; on their card (The Megaboard) or click the agent in The Checklist</li>
<li>Expand the chat bar for conversation view (40% viewport)</li>
<li>Go full screen for deep conversation</li>
<li>Agent responds with full CC power (can run tools, access files, execute tasks)</li>
</ul>
<p><strong>Speed targets (C1):</strong></p>
<ul>
<li>&lt;500ms acknowledgment (agent starts thinking animation)</li>
<li>&lt;2s first token (response starts streaming)</li>
<li>&lt;1s status updates (agent state changes propagate to game view)</li>
</ul>
<p><strong>What agents can do in chat (v1):</strong></p>
<ul>
<li>Anything CC can do. Full tool access on the VM.</li>
<li>Answer questions about the client&#39;s business (using their context files)</li>
<li>Check and manage calendar (via MCP integration on VM)</li>
<li>Draft communications (emails, social posts)</li>
<li>Update priorities and task lists</li>
<li>Generate reports and summaries</li>
<li>Execute multi-step workflows</li>
<li>Trigger other agents (visible to user via work handoff transparency)</li>
<li>Run Playwright for web tasks</li>
<li>Access client&#39;s connected tools</li>
</ul>
<hr>
<h2>Mode Switching</h2>
<p>Users toggle between the three modes fluidly. Clear mode switcher in the nav. Always know where you are. The chat bar and task HUD persist across all modes.</p>
<table>
<thead>
<tr>
<th>Action</th>
<th>Result</th>
</tr>
</thead>
<tbody><tr>
<td>Open app</td>
<td>The Game loads (isometric overworld, default home screen)</td>
</tr>
<tr>
<td>Click a room</td>
<td>Chat bar focuses on that agent, expands</td>
</tr>
<tr>
<td>Switch to Checklist</td>
<td>Per-agent task list view (game minimizes, HUD + checklist take over)</td>
</tr>
<tr>
<td>Switch to Megaboard</td>
<td>RPG tactical menu / stats view</td>
</tr>
<tr>
<td>Click agent in any mode</td>
<td>Chat bar focuses on that agent</td>
</tr>
<tr>
<td>Expand chat</td>
<td>Chat takes 40% viewport, game shrinks</td>
</tr>
<tr>
<td>Full screen chat</td>
<td>Immersive 1:1 conversation</td>
</tr>
<tr>
<td>Keyboard shortcut <code>1</code></td>
<td>The Game</td>
</tr>
<tr>
<td>Keyboard shortcut <code>2</code></td>
<td>The Checklist</td>
</tr>
<tr>
<td>Keyboard shortcut <code>3</code></td>
<td>The Megaboard</td>
</tr>
<tr>
<td>Keyboard shortcut <code>Esc</code></td>
<td>Collapse chat, return to current mode</td>
</tr>
</tbody></table>
<p><strong>URL structure:</strong></p>
<ul>
<li><code>/app</code> or <code>/game</code> -- The Game (isometric overworld)</li>
<li><code>/app/checklist</code> -- The Checklist</li>
<li><code>/app/checklist/[agent-slug]</code> -- Checklist for specific agent</li>
<li><code>/app/megaboard</code> -- The Megaboard (RPG tactical menu)</li>
<li><code>/app/megaboard/agent/[slug]</code> -- Individual Agent deep-dive</li>
<li><code>/app/chat/[agent-slug]</code> -- 1:1 Agent Chat (full screen)</li>
</ul>
<hr>
<h2>Onboarding</h2>
<p>The first experience. This is where &quot;a million worlds, one platform&quot; becomes real.</p>
<h3>Philosophy</h3>
<p>Universal onboarding for ANY business type, at ANY stage, including zero. Not just AI audits. A plumber, a CPA, a restaurant, a law firm, a landscaper. Someone with just an idea and no business yet. The onboarding builds the same context files that power AOM-EA (<code>me.md</code>, <code>work.md</code>, <code>team.md</code>, <code>goals.md</code>) and deploys them to the client&#39;s VM.</p>
<p><strong>Start a Business From the Game:</strong> CORNER works at ANY stage including ZERO. No business required to start. Onboarding asks &quot;what do you want to build?&quot; not &quot;tell us about your company.&quot; Agents guide from idea to launch to growth to scale.</p>
<p><strong>Stage progression:</strong></p>
<ul>
<li>Idea stage: Steve validates the concept, Alex researches the market</li>
<li>Launch: Steffen brands it, Bobby builds the site, Jacob finds customers</li>
<li>Growth: Cleo makes content, Tony posts it, Paige tracks clients</li>
<li>Scale: Mom orchestrates everything, Elon optimizes systems</li>
</ul>
<p><strong>Visual progression IS the retention mechanic:</strong> Rooms fill up as the business grows. Start with 2-3 agents in bare rooms. Eventually full office buzzing with activity. You literally watch your business grow. This maps directly to pricing tiers (see Pricing section).</p>
<h3>The Flow</h3>
<p><strong>Step 1: Welcome</strong></p>
<ul>
<li>&quot;Welcome to Corner. Let&#39;s build your team.&quot;</li>
<li>Clean, warm, one sentence. No walls of text.</li>
</ul>
<p><strong>Step 2: Where Are You?</strong> (determines onboarding path)</p>
<ul>
<li>&quot;Do you have a business, or are you building one?&quot;<ul>
<li><strong>&quot;I have a business&quot;</strong> -&gt; Steps 3-5 (standard info gathering)</li>
<li><strong>&quot;I&#39;m building one&quot;</strong> -&gt; &quot;What do you want to build?&quot; (single open-ended question, agents fill in the rest through conversation)</li>
<li><strong>&quot;Just an idea&quot;</strong> -&gt; &quot;Tell us about it.&quot; (Steve + Alex kick in immediately to validate and research)</li>
</ul>
</li>
</ul>
<p><strong>Step 3: About You</strong> (builds <code>me.md</code>)</p>
<ul>
<li>&quot;What&#39;s your name?&quot;</li>
<li>&quot;What&#39;s your role?&quot;</li>
<li>&quot;Tell us about your business in a sentence or two.&quot;</li>
<li>Conversational format. One question at a time. Feels like texting, not filling out a form.</li>
</ul>
<p><strong>Step 4: Your Business</strong> (builds <code>work.md</code>)</p>
<ul>
<li>&quot;What does your company do?&quot;</li>
<li>&quot;What are your main services or products?&quot;</li>
<li>&quot;Who are your typical clients?&quot;</li>
<li>&quot;How big is your team?&quot;</li>
<li>&quot;What tools do you use daily?&quot; (dropdown + free text for anything not listed)</li>
<li>&quot;What&#39;s your biggest time drain right now?&quot;</li>
</ul>
<p><strong>Step 5: Your Team</strong> (builds <code>team.md</code>)</p>
<ul>
<li>&quot;Who else should have access?&quot; (name + email + role)</li>
<li>&quot;Who handles what?&quot; (brief role descriptions)</li>
<li>Can skip if solo operator</li>
</ul>
<p><strong>Step 6: Your Goals</strong> (builds <code>goals.md</code>)</p>
<ul>
<li>&quot;What&#39;s the #1 thing you&#39;d want your AI team to handle?&quot;</li>
<li>&quot;What does success look like in 90 days?&quot;</li>
<li>&quot;Any specific pain points we should tackle first?&quot;</li>
</ul>
<p><strong>Step 7: Describe Your Dream Office</strong> (generates isometric rooms)</p>
<ul>
<li>&quot;Describe your dream office.&quot;</li>
<li>Client types a description: &quot;Modern tech startup with plants and glass walls&quot; or &quot;Classic wood-paneled law office&quot; or &quot;Industrial shop with tool racks&quot;</li>
<li>The system generates personalized isometric room sprites via Gemini 2.5 Flash Image model (free tier)</li>
<li>Each agent type has a base room description template that gets combined with the client&#39;s aesthetic preferences</li>
<li>Generation happens async. Client sees a loading animation (&quot;Building your command center...&quot;) with progress indicator</li>
<li>&quot;A million worlds, one platform.&quot; Every client gets a unique world, same engine.</li>
</ul>
<p><strong>Step 8: Meet Your Team</strong></p>
<ul>
<li>The isometric world appears for the first time</li>
<li>Rooms populate one by one with a satisfying build animation</li>
<li>Each agent introduces themselves with a one-line greeting in a chat bubble above their room</li>
<li>&quot;Welcome to your Corner&quot; appears as a banner</li>
<li>Client can click any room to start chatting immediately</li>
</ul>
<h3>Behind the Scenes (VM Provisioning)</h3>
<p>While the client goes through Steps 1-7, the system is:</p>
<ol>
<li>Spinning up their Docker container</li>
<li>Writing their context files (me.md, work.md, team.md, goals.md) to the VM filesystem</li>
<li>Configuring their agent roster based on business stage</li>
<li>Setting up the relay system</li>
<li>Generating room assets via Gemini</li>
</ol>
<p>By Step 8, the VM is ready and the client can start chatting with live agents immediately.</p>
<h3>Isometric Room Generation</h3>
<p><strong>Engine:</strong> Gemini 2.5 Flash Image model (free tier, Google API key already exists)</p>
<p><strong>Process:</strong></p>
<ol>
<li>Steffen art-directs a library of prompt templates, one per agent type</li>
<li>Each template defines: room layout, key furniture, functional items (monitors, desks, tools)</li>
<li>Client&#39;s aesthetic description modifies the template&#39;s style parameters (color palette, material, era, vibe)</li>
<li>Gemini generates a set of room PNGs in consistent isometric perspective</li>
<li>Rooms are placed on the isometric grid</li>
</ol>
<p><strong>Template example (Email Agent room):</strong></p>
<pre><code>Base: &quot;Isometric pixel art room, 2:1 diamond perspective, 256x256px.
A small office with a desk, computer monitor showing an inbox,
phone on desk, stack of papers, potted plant, overhead lamp.&quot;

Client modifier: &quot;[Client said: &#39;Modern minimalist with lots of white&#39;]&quot;

Final prompt: &quot;Isometric pixel art room, 2:1 diamond perspective, 256x256px.
A small modern minimalist office with clean white walls, white desk,
sleek computer monitor showing an inbox, wireless phone, small neat
paper stack, single succulent plant, minimalist pendant lamp.
Style: clean, bright, contemporary.&quot;
</code></pre>
<p><strong>Fallback:</strong> If generation fails or quality is low, use a curated library of pre-made room sprites categorized by style (modern, classic, industrial, creative). Client picks the closest match.</p>
<h3>Onboarding Existing AI Audit Clients</h3>
<p>For clients who already went through the AI Operations Audit:</p>
<ul>
<li>Skip Steps 2-6 (we already have their data from the audit discovery session)</li>
<li>Pre-populate context files from the audit report</li>
<li>Go straight to Step 7 (Describe Your Dream Office)</li>
<li>Their agents are pre-configured based on the audit recommendations</li>
</ul>
<hr>
<h2>Technical Architecture</h2>
<h3>The Stack (v1.2, Local-First)</h3>
<table>
<thead>
<tr>
<th>Layer</th>
<th>Tool</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Frontend</td>
<td>Next.js 14+ (App Router)</td>
<td>Already running aheadofmarket.com. Bobby knows it.</td>
</tr>
<tr>
<td>Hosting (frontend)</td>
<td>Vercel</td>
<td>Static frontend + API routes for auth/sync</td>
</tr>
<tr>
<td>AI Engine</td>
<td>Claude Code (real CC on VM)</td>
<td>Full agent system. NOT browser API calls.</td>
</tr>
<tr>
<td>VM Infrastructure</td>
<td>Docker containers on AOM server</td>
<td>One container per client. Isolated environments.</td>
</tr>
<tr>
<td>Sync Layer</td>
<td>Supabase (Auth + Realtime + Storage)</td>
<td>User accounts, visualization sync, room assets</td>
</tr>
<tr>
<td>Auth</td>
<td>Supabase Auth</td>
<td>Email/password + 2FA. Free tier covers MVP.</td>
</tr>
<tr>
<td>Real-time</td>
<td>WebSocket (custom)</td>
<td>Streams CC output to dashboard. Parallel to file-based relay.</td>
</tr>
<tr>
<td>Image Gen</td>
<td>Gemini 2.5 Flash Image (Google)</td>
<td>Room generation during onboarding. Free tier.</td>
</tr>
<tr>
<td>Styling</td>
<td>Tailwind CSS</td>
<td>AOM brand tokens already defined.</td>
</tr>
<tr>
<td>Animations</td>
<td>Framer Motion</td>
<td>Isometric interactions, transitions, agent animations.</td>
</tr>
<tr>
<td>Isometric Rendering</td>
<td>HTML/CSS transforms</td>
<td>Steffen&#39;s grid spec. PixiJS if performance demands.</td>
</tr>
</tbody></table>
<h3>What Changed from v1.1</h3>
<table>
<thead>
<tr>
<th>v1.1 (SaaS Model)</th>
<th>v1.2 (Local-First)</th>
</tr>
</thead>
<tbody><tr>
<td>Claude API calls from Vercel serverless</td>
<td>Claude Code running on VM</td>
</tr>
<tr>
<td>Supabase = primary data store for everything</td>
<td>Supabase = sync layer only</td>
</tr>
<tr>
<td>Multi-tenant via RLS on shared database</td>
<td>Multi-tenant via Docker container per client</td>
</tr>
<tr>
<td>No Kubernetes</td>
<td>Single server ~50 clients, Kubernetes after</td>
</tr>
<tr>
<td>SSE streaming from API routes</td>
<td>WebSocket streaming from VM</td>
</tr>
<tr>
<td>Agent capabilities limited to API</td>
<td>Agent capabilities = full CC (filesystem, CLI, MCP, Playwright)</td>
</tr>
</tbody></table>
<h3>What&#39;s NOT in the Stack</h3>
<ul>
<li>No separate WebSocket server (WebSocket runs on the VM, proxied through a thin gateway)</li>
<li>No 3D engine. Isometric is 2D sprites with CSS transforms.</li>
<li>No Redis. VM filesystem + Supabase handles everything.</li>
<li>No browser-side Claude API calls. All AI runs on the VM.</li>
</ul>
<h3>VM Fleet Architecture</h3>
<p><strong>One Docker container per client.</strong> Each container gets:</p>
<ul>
<li>Its own Claude Code installation</li>
<li>Its own context files (me.md, work.md, team.md, goals.md)</li>
<li>Its own agent roster and AGENT.md files</li>
<li>Its own relay system (file-based, same as AOM-EA)</li>
<li>Its own skills directory</li>
<li>WebSocket endpoint for dashboard connection</li>
</ul>
<p><strong>AOM admin panel</strong> manages the fleet:</p>
<ul>
<li>Spin up new client containers</li>
<li>Push over-the-air updates (new skills, agent improvements, system patches)</li>
<li>Monitor container health across all clients</li>
<li>View aggregate metrics</li>
<li>One-click restart for crashed containers</li>
</ul>
<p><strong>Scaling:</strong></p>
<ul>
<li>Single server handles ~50 clients (Docker Compose)</li>
<li>Kubernetes after 50 (container orchestration, auto-scaling)</li>
<li>Each container is lightweight: CC + context files + relay scripts</li>
</ul>
<p><strong>Security:</strong></p>
<ul>
<li>Container isolation (no cross-client access)</li>
<li>Client&#39;s Anthropic API key stored as container env var</li>
<li>WebSocket connections authenticated via Supabase JWT</li>
<li>VM filesystem not exposed to the internet (only WebSocket endpoint)</li>
</ul>
<h3>Streaming + Speed Architecture</h3>
<p><strong>WebSocket is the primary real-time channel.</strong> This is a parallel path to the file-based Telegram relay. Both work, WebSocket is for the dashboard.</p>
<pre><code>VM (Claude Code)                      Browser (Dashboard)
+------------------+                  +------------------+
| CC generates     |                  |                  |
| response token   |---WebSocket---&gt;  | Token renders    |
| by token         |                  | in chat bubble   |
|                  |                  |                  |
| Agent state      |---WebSocket---&gt;  | Sprite animation |
| changes          |                  | updates          |
|                  |                  |                  |
| Task completes   |---WebSocket---&gt;  | HUD updates,     |
|                  |                  | checkmark animates|
+------------------+                  +------------------+
</code></pre>
<p><strong>Speed targets (C1):</strong></p>
<ul>
<li>&lt;500ms acknowledgment: Agent starts thinking animation as soon as user sends message</li>
<li>&lt;2s first token: First word of response appears within 2 seconds</li>
<li>&lt;1s status updates: Agent state changes (idle -&gt; thinking -&gt; speaking -&gt; done) propagate to game view within 1 second</li>
</ul>
<p><strong>Build strategy:</strong> Build on localhost FIRST, then port to hosted. Find the speed ceiling locally where latency is zero, then add network overhead.</p>
<h3>Data Model (Revised)</h3>
<p>Supabase tables are now the <strong>sync layer</strong>, not the primary data store for AI operations.</p>
<table>
<thead>
<tr>
<th>Table</th>
<th>Purpose</th>
<th>Source of Truth</th>
</tr>
</thead>
<tbody><tr>
<td><code>organizations</code></td>
<td>Tenant record (company name, plan, VM endpoint)</td>
<td>Supabase</td>
</tr>
<tr>
<td><code>profiles</code></td>
<td>Users linked to orgs via Supabase Auth</td>
<td>Supabase</td>
</tr>
<tr>
<td><code>automations</code></td>
<td>Client&#39;s &quot;agents&quot; (name, status, config). Status synced FROM VM.</td>
<td>VM (synced to Supabase)</td>
</tr>
<tr>
<td><code>tasks</code></td>
<td>Per-agent checklist items. Editable in browser, synced to VM.</td>
<td>Supabase (synced to VM)</td>
</tr>
<tr>
<td><code>events</code></td>
<td>Activity feed from VM (commits, completions, handoffs, blocks)</td>
<td>VM (written to Supabase)</td>
</tr>
<tr>
<td><code>conversations</code></td>
<td>Chat display history per agent per tenant</td>
<td>Supabase (copy of VM conversations)</td>
</tr>
<tr>
<td><code>context_files</code></td>
<td>Snapshot of me.md/work.md/team.md/goals.md for onboarding/display</td>
<td>VM filesystem (snapshotted to Supabase)</td>
</tr>
<tr>
<td><code>room_assets</code></td>
<td>Generated isometric room PNGs</td>
<td>Supabase Storage</td>
</tr>
<tr>
<td><code>vm_endpoints</code></td>
<td>WebSocket connection info per tenant</td>
<td>Supabase (AOM admin writes)</td>
</tr>
</tbody></table>
<p><strong>RLS still on all tables.</strong> Tenants only see their own data. Enforced at Postgres level.</p>
<h3>AOM Internal vs Client Data Sources</h3>
<table>
<thead>
<tr>
<th>Data</th>
<th>AOM (Internal)</th>
<th>Client (Product)</th>
</tr>
</thead>
<tbody><tr>
<td>Agent execution</td>
<td>Terminal (Claude Code locally)</td>
<td>VM (Claude Code in Docker)</td>
</tr>
<tr>
<td>Agent status</td>
<td>GitHub API polling of markdown files</td>
<td>VM WebSocket stream</td>
</tr>
<tr>
<td>Activity feed</td>
<td>Git log + latest-result.md parsing</td>
<td>VM events -&gt; Supabase events table</td>
</tr>
<tr>
<td>Chat</td>
<td>Terminal (Claude Code)</td>
<td>WebSocket from VM -&gt; browser chat bar</td>
</tr>
<tr>
<td>Config</td>
<td>Markdown files in repo</td>
<td>Markdown files on VM filesystem</td>
</tr>
<tr>
<td>Room assets</td>
<td>Hardcoded dev sprites</td>
<td>Generated per-client via Gemini</td>
</tr>
</tbody></table>
<hr>
<h2>Isometric Technical Spec</h2>
<h3>Grid System</h3>
<p>Based on Steffen&#39;s connected floor plan (<code>corner-floor-plan-spec.md</code>):</p>
<ul>
<li><strong>Tile size:</strong> 128x64px (standard isometric 2:1 ratio)</li>
<li><strong>Room size:</strong> 4x4 tiles (512x256px per room sprite)</li>
<li><strong>Grid layout:</strong> L-shaped building from Steffen&#39;s spec. 13 agent rooms + Main Hall.</li>
<li><strong>Camera angle:</strong> Standard isometric (30-degree from horizontal, 2:1 pixel ratio). Viewing from SOUTH-EAST corner.</li>
<li><strong>Coordinate system:</strong> Standard isometric projection. Screen X = (tileX - tileY) * tileWidth/2. Screen Y = (tileX + tileY) * tileHeight/2.</li>
</ul>
<h3>Sprite Sheets</h3>
<p>Each agent has a sprite sheet with the 4 core animation states:</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Loop</th>
<th>Duration</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>3 frames (slight movement, breathing)</td>
<td>Yes</td>
<td>4s per cycle</td>
</tr>
<tr>
<td>Thinking</td>
<td>4 frames (hand on chin / typing / pacing cycle)</td>
<td>Yes</td>
<td>2s per cycle</td>
</tr>
<tr>
<td>Speaking</td>
<td>4 frames (facing user, mouth movement, gestures)</td>
<td>Yes (while streaming)</td>
<td>2s per cycle</td>
</tr>
<tr>
<td>Done</td>
<td>4 frames (lean back, stretch, checkmark)</td>
<td>Once, then idle</td>
<td>3s</td>
</tr>
</tbody></table>
<p><strong>Recovery states (for agent death):</strong></p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Loop</th>
<th>Duration</th>
</tr>
</thead>
<tbody><tr>
<td>Walking Away</td>
<td>4 frames (stand, push back chair, walk to door)</td>
<td>Once</td>
<td>2s</td>
</tr>
<tr>
<td>Walking Back</td>
<td>4 frames (enter door, walk to desk, sit down)</td>
<td>Once</td>
<td>2s</td>
</tr>
<tr>
<td>Reading Queue</td>
<td>3 frames (look at screen, scroll, nod)</td>
<td>Once, then idle</td>
<td>2s</td>
</tr>
</tbody></table>
<p><strong>Full movement states (north star, later tier):</strong></p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Loop</th>
<th>Duration</th>
</tr>
</thead>
<tbody><tr>
<td>Walking (directional)</td>
<td>6 frames per direction (N/S/E/W)</td>
<td>Yes while moving</td>
<td>1s per tile</td>
</tr>
<tr>
<td>Handoff Delivery</td>
<td>4 frames (pick up note, walk, deliver, return)</td>
<td>Once</td>
<td>4-6s</td>
</tr>
</tbody></table>
<h3>Room Elements (per room)</h3>
<p>Defined in detail in <code>corner-floor-plan-spec.md</code>. Each room has:</p>
<ul>
<li>Floor tile (matches client aesthetic)</li>
<li>Walls (2 visible sides, isometric, cut away at 3/4 height)</li>
<li>Desk with monitor (monitor glow = status color)</li>
<li>Agent character (sprite sheet)</li>
<li>2-3 decorative items (based on agent type)</li>
<li>Status indicator (subtle, integrated into room)</li>
<li>Room nameplate (readable at zoom-out)</li>
</ul>
<h3>Performance</h3>
<ul>
<li>Total sprite sheet per agent: ~50-100KB (PNG, optimized)</li>
<li>Total for 6 agents: ~300-600KB</li>
<li>Total for 13 agents (AOM): ~650KB-1.3MB</li>
<li>Acceptable. Lazy load rooms as they scroll into view.</li>
<li>Canvas rendering via PixiJS if CPU usage exceeds 15% with CSS-only approach.</li>
</ul>
<h3>Ambient Details (Retention Layer)</h3>
<p>These make the world feel alive. They&#39;re the reason someone opens the app to check on their team even when they don&#39;t have a specific task.</p>
<ul>
<li>Monitor screens show tiny pixel-art representations of what the agent is working on (email list, calendar grid, code lines)</li>
<li>Clock on wall shows real time in client&#39;s timezone</li>
<li>Day/night lighting cycle (subtle, based on client&#39;s local time)</li>
<li>Occasional ambient animations: agent sips coffee, adjusts glasses, stretches</li>
<li>When one agent completes a task, a small celebration animation plays (confetti, fist pump, or checkmark particle effect)</li>
<li>When an agent is blocked, their room light flickers slightly</li>
<li>Speech bubbles with streaming text above speaking agents (visible from zoomed-out view)</li>
</ul>
<hr>
<h2>Pricing (v1.2, Revised)</h2>
<h3>Two Product Tiers</h3>
<p><strong>Tier 1: Hosted (90% of clients)</strong>
AOM spins up and manages the VM. Client just logs in.</p>
<table>
<thead>
<tr>
<th>Component</th>
<th>Price</th>
</tr>
</thead>
<tbody><tr>
<td>Setup</td>
<td>$2,500</td>
</tr>
<tr>
<td>Monthly</td>
<td>$3,000-5,000/mo</td>
</tr>
<tr>
<td>Includes</td>
<td>VM compute + CC subscription management + platform + support</td>
</tr>
</tbody></table>
<p>Client doesn&#39;t need to know what a VM is. They log into their Corner, talk to their agents. AOM handles everything. The $3-5k/mo covers the VM hosting, AOM&#39;s management overhead, and profit margin. CC subscription cost is passed through or bundled.</p>
<p><strong>Tier 2: Self-Hosted (Power users, ~10% of clients)</strong>
Client runs CC on their own machine. AOM provides the platform layer.</p>
<table>
<thead>
<tr>
<th>Component</th>
<th>Price</th>
</tr>
</thead>
<tbody><tr>
<td>Setup</td>
<td>$5,000-8,000</td>
</tr>
<tr>
<td>Monthly</td>
<td>$1,500-3,000/mo</td>
</tr>
<tr>
<td>Includes</td>
<td>Platform license + dashboard + updates + support</td>
</tr>
</tbody></table>
<p>For technically sophisticated clients who want CC running on their own hardware. They handle their own Anthropic subscription and compute. AOM provides the Corner dashboard, agent configurations, skills, and ongoing updates.</p>
<h3>Natural Upgrade Path</h3>
<p>Both tiers scale by agent count:</p>
<ul>
<li><strong>Starter</strong> (3 agents/rooms): Lower end of monthly range</li>
<li><strong>Growth</strong> (6 agents): Mid-range</li>
<li><strong>Scale</strong> (10+ agents): Upper end + custom pricing</li>
</ul>
<p>Visual progression (bare rooms to full office) IS the upgrade motivation. Empty rooms where new agents could sit sell the upgrade without a sales call.</p>
<h3>Entry Point: AI Operations Audit ($2,500 flat)</h3>
<p>Still the foot in the door. 2-week engagement. Audit their operations, identify where AI saves time. Written report. If they see the value, they upgrade to Hosted or Self-Hosted.</p>
<h3>What Each Client Costs AOM to Run (Hosted)</h3>
<ul>
<li>VM hosting: ~$20-50/month per container (depends on compute needs)</li>
<li>CC subscription pass-through: ~$100-200/month (client&#39;s Anthropic plan)</li>
<li>Supabase: ~$0.50/month per tenant</li>
<li>Vercel: Covered under existing plan</li>
<li>Gemini image gen: Free tier</li>
<li><strong>Gross margin at $3,000/month hosted: ~90%+</strong></li>
</ul>
<hr>
<h2>Product Roadmap (v1.2, C2 Build Order)</h2>
<h3>Phase 1: Isometric Game World on Localhost (Week 1-2)</h3>
<p><strong>Goal:</strong> The game running on localhost. HTML/CSS transforms, Steffen&#39;s grid spec. Patrik sees his office.</p>
<p>Build order:</p>
<ol>
<li>Isometric grid renderer (HTML/CSS transforms, Steffen&#39;s floor plan as the layout)</li>
<li>Base room sprites (use Steffen&#39;s existing concept art + Gemini generated rooms)</li>
<li>Room placement on grid with correct adjacency from floor plan spec</li>
<li>Click-to-focus interaction (clicking a room highlights it)</li>
<li>Basic status indicators (monitor glow, room lighting)</li>
</ol>
<p><strong>Ship:</strong> Open localhost, see the connected office with all 13 rooms. Rooms light up. Clicking a room does something.</p>
<h3>Phase 2: Task HUD (Week 2-3)</h3>
<p><strong>Goal:</strong> The SimCity-style drawer above the game.</p>
<p>Build order:</p>
<ol>
<li>HUD drawer component (collapsible, above game viewport)</li>
<li>Last Session view (pull from latest-result.md files)</li>
<li>By Project view (group tasks by project)</li>
<li>Upcoming view (priority queue across agents)</li>
<li>Add New (quick task entry with agent picker)</li>
<li>Connect to Supabase tasks table for persistence</li>
</ol>
<p><strong>Ship:</strong> Game view with a working HUD. Can see what happened, what&#39;s next, and add tasks.</p>
<h3>Phase 3: Chat Bar Connected to Local Relay (Week 3-4)</h3>
<p><strong>Goal:</strong> Chat bar at the bottom, connected to real CC via the local relay.</p>
<p>Build order:</p>
<ol>
<li>Chat bar component (collapsed/expanded/fullscreen states)</li>
<li>WebSocket connection to local CC instance</li>
<li>Streaming response rendering (word by word into chat + speech bubble)</li>
<li>Agent switching (click room -&gt; chat context switches)</li>
<li>RPG dialogue styling (agent portrait, speech bubbles)</li>
</ol>
<p><strong>Speed target: Build on localhost first.</strong> Find the speed ceiling where network latency is zero. &lt;500ms ack, &lt;2s first token locally.</p>
<p><strong>Ship:</strong> Type in the chat bar, CC responds via WebSocket, response streams into the game as a speech bubble AND into the chat panel.</p>
<h3>Phase 4: Agent Sprites with 4 States (Week 4-5)</h3>
<p><strong>Goal:</strong> Agents visually react to what&#39;s happening.</p>
<p>Build order:</p>
<ol>
<li>Sprite sheet system (load, animate, state machine)</li>
<li>Idle state (default, relaxed)</li>
<li>Thinking state (hand on chin / typing / pacing when processing)</li>
<li>Speaking state (facing user, speech bubble with streaming text)</li>
<li>Done state (lean back, checkmark, return to idle)</li>
<li>Connect sprite states to WebSocket events (CC starts processing -&gt; thinking, CC starts streaming -&gt; speaking, CC done -&gt; done)</li>
</ol>
<p><strong>Ship:</strong> Send a message, watch the agent think, then speak, then relax. Alive.</p>
<h3>Phase 5: WebSocket Real-time Layer (Week 5-6)</h3>
<p><strong>Goal:</strong> Rock-solid real-time connection between VM and dashboard.</p>
<p>Build order:</p>
<ol>
<li>WebSocket server on VM (exposes CC state changes as events)</li>
<li>Event types: agent_thinking, agent_speaking, token_stream, agent_done, task_complete, handoff, error_recovery</li>
<li>Reconnection logic (silent reconnect, queue messages during disconnect)</li>
<li>Status propagation (&lt;1s from VM state change to game animation)</li>
<li>Multi-agent support (multiple WebSocket channels, one per active agent)</li>
</ol>
<p><strong>Ship:</strong> Real-time pipeline. VM does something, dashboard shows it within 1 second. Stable across reconnections.</p>
<h3>Phase 6: Port to Hosted (Week 6-8)</h3>
<p><strong>Goal:</strong> Swap local filesystem reads for VM API. Same dashboard, remote brain.</p>
<p>Build order:</p>
<ol>
<li>Docker container template (CC + relay + context files + WebSocket endpoint)</li>
<li>Container provisioning API (spin up new client in minutes)</li>
<li>WebSocket proxy (route browser connections to correct client container)</li>
<li>Onboarding wizard that triggers VM provisioning (Steps 1-8)</li>
<li>Supabase integration (auth, room assets, task sync, event logging)</li>
<li>AOM admin panel (fleet management, health monitoring, update pushing)</li>
<li>Gemini room generation pipeline</li>
</ol>
<p><strong>Ship:</strong> AOM can onboard a new client. Client goes through onboarding, VM spins up, they see their office, they chat with agents. First external client possible.</p>
<h3>Phase 7: Megaboard + Polish (Week 8-10)</h3>
<p>Build order:</p>
<ol>
<li>Megaboard Command View + Individual Agent View (from <code>dashboard-mvp-brief.md</code>)</li>
<li>RPG tactical menu elements (party screen, quest log, mission feed)</li>
<li>Mode switching (toggle between Game, Checklist, Megaboard)</li>
<li>Agent death animations (walk away, walk back, resume)</li>
<li>Work handoff visuals (note on desk, HUD notification)</li>
<li>Ambient animations (coffee sips, day/night cycle, celebrations)</li>
<li>Weekly recap animation</li>
</ol>
<h3>Phase 8: Mobile (Week 10-12)</h3>
<p><strong>Goal:</strong> iPhone right after desktop is nailed. PWA, not native app.</p>
<p>Build order:</p>
<ol>
<li>Responsive isometric view (touch gestures: pinch zoom, tap room, swipe)</li>
<li>Mobile chat interface (full screen, swipe to dismiss)</li>
<li>Mobile HUD (simplified drawer)</li>
<li>Push notifications (agent completed task, agent blocked, daily summary)</li>
<li>Progressive Web App manifest (installable, offline status view)</li>
<li>All three modes working on mobile</li>
</ol>
<p><strong>Ship:</strong> Client installs PWA on phone, opens it like a game, checks on their AI team, chats from mobile. &quot;A 12-year-old sees this on the news and wants to start their empire before the kid next door.&quot;</p>
<h3>Phase 9: Platform Scale (Month 4+)</h3>
<p>Build order:</p>
<ol>
<li>Kubernetes deployment (scale beyond 50 clients)</li>
<li>Skills marketplace (see Skills Distribution + Horizon Features)</li>
<li>Trend charts and ROI reports</li>
<li>Weekly auto-generated reports per tenant</li>
<li>SOC 2 audit trail (all events logged, immutable, timestamped)</li>
<li>Self-service signup (prospect signs up, trial Corner, converts to paid)</li>
<li>API access for client integrations</li>
<li>White-label option for partners</li>
</ol>
<hr>
<h2>Horizon Features</h2>
<p>Architecture supports all of these from day one. Not built yet. These are the features that make Corner a platform, not just a tool.</p>
<h3>Furniture Marketplace</h3>
<p><strong>Concept:</strong> Starter pack of furniture is free with every room. Themed packs available for purchase or unlock. User-generated furniture. Brand partnerships.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>Each room has placeable furniture slots</li>
<li>Starter pack: desk, chair, monitor, lamp, plant (functional items that every room needs)</li>
<li>Themed packs: &quot;Tech Startup&quot; (standing desk, VR headset, whiteboard), &quot;Law Firm&quot; (mahogany desk, bookshelves, gavel), &quot;Creative Studio&quot; (drafting table, canvases, mood board)</li>
<li>User-generated: clients can commission or upload custom furniture sprites</li>
<li>Brand partnerships: IKEA, Herman Miller, etc. Real brands in the game. &quot;Started as a joke, became real.&quot; (Patrik&#39;s Fortnite model reference)</li>
</ul>
<p><strong>Revenue model:</strong> Customization as a revenue stream. The Fortnite model. Free to play, pay for cosmetics. Corner is free to look at (the game view), pay for agents to actually work. Furniture is the cosmetic layer on top.</p>
<p><strong>Build priority:</strong> After Phase 6 (hosted working). Steffen art-directs the furniture library. Gemini generates variants.</p>
<h3>Points / XP System</h3>
<p><strong>Concept:</strong> Tasks completed = points. Deliverables shipped = points. Streaks (consecutive days with completions) = bonus points. Points unlock furniture, rooms, agent skins.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>Every completed task awards XP to the agent that completed it AND to the client</li>
<li>Agent XP = agent &quot;level&quot; (visible in Megaboard party screen)</li>
<li>Client XP = overall &quot;business level&quot;</li>
<li>Streaks: 3-day streak = 1.5x multiplier, 7-day = 2x, 30-day = 3x</li>
<li>Unlocks: new furniture pieces, room themes, agent character variants (casual Friday, holiday outfits)</li>
<li>Opt-in leaderboard: see how your Corner ranks against others (anonymized or named, client&#39;s choice)</li>
</ul>
<p><strong>Why this matters:</strong> Gamification is the retention mechanic. A CPA who logs in daily to see their agent complete tasks and earn points is a CPA who never churns. The game IS the retention.</p>
<p><strong>Build priority:</strong> After MVP is stable. Points are a number in a database. Display is a UI element. Simple to add, powerful for engagement.</p>
<h3>Neighbor Offices</h3>
<p><strong>Concept:</strong> See adjacent users&#39; offices. Visit read-only. Social layer.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>Your Corner has &quot;neighbors&quot; (other Corner users, opted in)</li>
<li>You can see the exterior of their office from your isometric view (a building next door)</li>
<li>Click to visit: see their office layout, room styles, agent roster (read-only, no access to their data)</li>
<li>Social proof: &quot;Wow, their office has 10 agents and custom furniture. I want that.&quot;</li>
<li>Community features: chat between neighbors (optional), share tips, celebrate milestones</li>
</ul>
<p><strong>Privacy:</strong> Strictly opt-in. Default is private. Client chooses what&#39;s visible (room layout, agent names, or nothing at all). No business data ever exposed.</p>
<p><strong>Build priority:</strong> Phase 9+. Social features come after the core product is rock-solid.</p>
<h3>Room Editor</h3>
<p><strong>Concept:</strong> Tap-to-place furniture. Customize your office. Sims Mobile style.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>Enter edit mode on any room you own</li>
<li>Grid-based placement (snap to isometric grid)</li>
<li>Drag furniture from inventory to room</li>
<li>Rotate furniture (4 orientations in isometric)</li>
<li>Save layout (persisted to Supabase)</li>
<li>Share screenshots of your office on social media</li>
</ul>
<p><strong>Why this matters:</strong> Investment in customization = switching cost. The more time someone spends designing their Corner, the less likely they are to leave. Also: it&#39;s fun. People love decorating virtual spaces (Sims, Animal Crossing, Habbo Hotel).</p>
<p><strong>Build priority:</strong> After furniture marketplace. The marketplace provides the items, the editor lets you place them.</p>
<hr>
<h2>What Gets Replaced / Evolved</h2>
<table>
<thead>
<tr>
<th>Current</th>
<th>Becomes</th>
</tr>
</thead>
<tbody><tr>
<td><code>/dashboard</code> on aheadofmarket.com</td>
<td>The Megaboard at <code>/app/megaboard</code></td>
</tr>
<tr>
<td><code>/dashboard</code> v1 (chat-first)</td>
<td>Corner&#39;s chat bar + game view (much richer)</td>
</tr>
<tr>
<td>Pixel (VS Code extension)</td>
<td>1:1 Chat in browser. Right instinct, wrong platform.</td>
</tr>
<tr>
<td>Terminal Claude Code sessions</td>
<td>VM-hosted CC for clients. Patrik keeps terminal too.</td>
</tr>
<tr>
<td>Manual agent launching</td>
<td>Automated via The Game + Checklist interactions (later phases)</td>
</tr>
<tr>
<td>Markdown context files in repo</td>
<td>Same markdown files, but on VM filesystem for clients</td>
</tr>
<tr>
<td>6 terminal windows</td>
<td>Game view + chat bar + HUD. All agents visible at once.</td>
</tr>
<tr>
<td>Telegram relay</td>
<td>Still works. WebSocket is the dashboard channel. Relay is the mobile/backup channel.</td>
</tr>
</tbody></table>
<hr>
<h2>Design Direction (For Steffen)</h2>
<h3>Product Site (corner.___) Design</h3>
<ul>
<li>&quot;Landed in heaven.&quot; Ultra clean, white, spacious, bright.</li>
<li>The site is the calm container. The creative worlds inside POP because the canvas is minimal.</li>
<li>Think Apple keynote stage, not coffee shop. Clean but with ENERGY.</li>
<li>NOT the same visual language as aheadofmarket.com. This is a different brand.</li>
<li>The product site sells the experience. The product IS the experience.</li>
</ul>
<h3>Isometric Art Direction</h3>
<ul>
<li><strong>Style:</strong> Pixel art, clean lines, readable at small sizes. Not retro-nostalgic. Modern pixel aesthetic.</li>
<li><strong>Color palette:</strong> Each room uses the client&#39;s brand colors (from onboarding) plus the AOM status palette for functional elements.</li>
<li><strong>Consistency:</strong> All rooms share the same perspective, tile size, and lighting angle. Even with Gemini generation, Steffen defines the prompt constraints that ensure visual consistency.</li>
<li><strong>Character design:</strong> Simple, 32x32 or 48x48 pixel characters. Enough detail to show actions (typing, standing, stretching) but not so detailed that they look out of place at isometric scale.</li>
<li><strong>Room furniture:</strong> Functional items are recognizable at a glance. A monitor looks like a monitor. A phone looks like a phone. No abstract art.</li>
<li><strong>Connected floor plan:</strong> Steffen&#39;s L-shaped building spec (<code>corner-floor-plan-spec.md</code>) is THE layout. All rooms share walls. One connected map.</li>
</ul>
<h3>Megaboard Design</h3>
<p>Already covered in <code>dashboard-dual-view-spec.md</code>. RPG tactical menu energy: Pokemon party screen, Final Fantasy stats view.</p>
<ul>
<li>Dark theme (<code>bg-aom-night</code> #0C0C0C, <code>bg-aom-charcoal</code> #141412)</li>
<li>Status colors: Green (#22C55E), Gray (#78716C), Red (#EF4444), Blue (#3B82F6), Yellow (#EAB308), Orange (#F97316)</li>
<li>Minimum 16px body text, 18px+ agent names, 24px+ throughput numbers</li>
<li>&quot;Young people love it, old people can&#39;t live without it&quot;</li>
<li>Font: Inter Tight for headlines, system stack for body, JetBrains Mono for data</li>
</ul>
<h3>Chat Design (Updated for Chat Bar)</h3>
<ul>
<li><strong>Collapsed:</strong> Thin bar at bottom. Agent avatar + name + text input + send button. Unobtrusive.</li>
<li><strong>Expanded (40%):</strong> Conversation history visible. Agent messages left-aligned with character portrait. Client messages right-aligned. Streaming tokens appear word by word.</li>
<li><strong>Full screen:</strong> Immersive. RPG dialogue style. Agent portrait large. Speech bubbles. Action cards for tasks executed.</li>
<li>Action cards: distinct visual treatment, card with icon + description + status badge</li>
<li>Input bar: generous height (48px+), clear send button, subtle placeholder text</li>
<li>Typing/thinking indicator: agent&#39;s isometric character animates (thinking state), three dots in chat</li>
</ul>
<h3>Task HUD Design</h3>
<ul>
<li>Clean, scannable. Not dense. SimCity information panel energy.</li>
<li>Tab bar for 4 views (Last Session, By Project, Upcoming, Add New)</li>
<li>Each task item: agent avatar + task text + status (brief). One line per task.</li>
<li>Collapse arrow to minimize HUD and maximize game view</li>
<li>When collapsed: thin bar showing count of active/completed tasks</li>
</ul>
<h3>Onboarding Design</h3>
<ul>
<li>One question per screen. Maximum breathing room.</li>
<li>Progress indicator: subtle dot or line at top (not a numbered stepper)</li>
<li>Transitions: slide left between questions, fade on first and last</li>
<li>Stage selection (Step 2) should feel exciting, not like a quiz. Three clear paths.</li>
<li>&quot;Describe Your Dream Office&quot; step: show a real-time preview as client types their description</li>
<li>Final reveal: rooms build in one by one with satisfying snap-into-place animation + ambient sound (optional). &quot;Welcome to your Corner.&quot;</li>
</ul>
<hr>
<h2>Agent Personalities</h2>
<p>Each agent type has a distinct personality and capability set. These are defined in AGENT.md files on the VM, not hardcoded.</p>
<table>
<thead>
<tr>
<th>Agent Type</th>
<th>Personality</th>
<th>Capabilities</th>
</tr>
</thead>
<tbody><tr>
<td>Email Triage</td>
<td>Efficient, organized, slightly formal</td>
<td>Read inbox summaries, draft replies, prioritize</td>
</tr>
<tr>
<td>Lead Response</td>
<td>Warm, professional, fast</td>
<td>Draft responses, qualify leads, schedule follow-ups</td>
</tr>
<tr>
<td>Calendar Manager</td>
<td>Helpful, precise</td>
<td>Check schedule, book meetings, send invites</td>
</tr>
<tr>
<td>Invoice/Billing</td>
<td>Detail-oriented, clear</td>
<td>Check payment status, send reminders, generate reports</td>
</tr>
<tr>
<td>Content Creator</td>
<td>Creative, brand-aware</td>
<td>Draft social posts, suggest content ideas, schedule</td>
</tr>
<tr>
<td>Operations</td>
<td>Big-picture, strategic</td>
<td>Summarize daily priorities, flag blockers, suggest next actions</td>
</tr>
</tbody></table>
<p><strong>For AOM internal (Patrik&#39;s agents):</strong> Bobby, Steffen, Elmo, Jacob, Elon, Alex, Steve, Cleo, Tony, Paige, Mom. Same names, same personalities, same AGENT.md files as terminal. Running on Patrik&#39;s local machine (not a VM, because he IS client zero on the original system).</p>
<hr>
<h2>Security and Compliance</h2>
<h3>Container Isolation</h3>
<ul>
<li>Each client&#39;s Docker container is isolated. No cross-client filesystem, network, or process access.</li>
<li>Client&#39;s Anthropic API key stored as container environment variable.</li>
<li>VM filesystem not exposed to the internet. Only the WebSocket endpoint is accessible, authenticated via Supabase JWT.</li>
</ul>
<h3>Auth and Access</h3>
<ul>
<li>Supabase Auth with 2FA. Email/password baseline.</li>
<li>WebSocket connections require valid Supabase JWT.</li>
<li>All Supabase tables have RLS. Tenants only see their own data.</li>
<li>AOM admin panel is a separate auth context (not accessible to clients).</li>
</ul>
<h3>Compliance</h3>
<ul>
<li><strong>SOC 2 roadmap.</strong> Audit logging from day one. Every event timestamped and immutable on the VM.</li>
<li><strong>No sensitive data in Supabase.</strong> Supabase stores operational metadata only. Client business data lives on the VM.</li>
<li><strong>Cyber insurance required</strong> before first client engagement (Patrik action item).</li>
</ul>
<hr>
<h2>File Structure (Full Product)</h2>
<pre><code>src/
  app/
    app/                                # Authenticated product area
      page.tsx                          # The Game: Isometric Overworld (Mode 1, default)
      layout.tsx                        # Product layout (HUD, chat bar, mode switcher, auth)
      checklist/
        page.tsx                        # The Checklist (Mode 2)
        [slug]/
          page.tsx                      # Checklist for specific agent
      megaboard/
        page.tsx                        # The Megaboard: RPG Tactical Menu (Mode 3)
        agent/
          [slug]/
            page.tsx                    # Individual Agent deep-dive
      chat/
        [slug]/
          page.tsx                      # 1:1 Agent Chat (full screen mode)
      onboarding/
        page.tsx                        # Onboarding wizard (8 steps)
      settings/
        page.tsx                        # Tenant settings
    api/
      auth/
        [...supabase]/route.ts          # Supabase auth callbacks
      ws/
        connect/route.ts                # WebSocket proxy to client VM
      sync/
        tasks/route.ts                  # Task sync (browser &lt;-&gt; VM)
        events/route.ts                 # Event ingestion from VM
        status/route.ts                 # Agent status sync from VM
      onboarding/
        step/route.ts
        generate-rooms/route.ts
        provision/route.ts              # Trigger VM provisioning
        status/route.ts
      admin/                            # AOM admin only
        fleet/route.ts                  # VM fleet management
        deploy/route.ts                 # Push updates to fleet
        health/route.ts                 # Fleet health monitoring
  components/
    game/
      IsometricGrid.tsx                 # Grid renderer (HTML/CSS transforms)
      Room.tsx                          # Single room with agent
      AgentSprite.tsx                   # Animated agent (4 states + recovery)
      RoomTooltip.tsx                   # Hover tooltip
      StatusGlow.tsx                    # Monitor glow effect
      HandoffNote.tsx                   # Visual note on desk for work handoffs
      SpeechBubble.tsx                  # Streaming text bubble above agent
    hud/
      TaskHUD.tsx                       # Collapsible drawer
      LastSession.tsx                   # Recent completions view
      ByProject.tsx                     # Tasks grouped by project
      Upcoming.tsx                      # Priority queue
      AddNew.tsx                        # Quick task entry
    chat/
      ChatBar.tsx                       # Persistent bottom bar (collapsed/expanded/full)
      ChatWindow.tsx                    # Full conversation interface
      MessageList.tsx                   # Scrollable message list
      MessageBubble.tsx                 # Single message (RPG dialogue style)
      ActionCard.tsx                    # Action taken by agent
      ChatInput.tsx                     # Input bar + send
      StreamingText.tsx                 # Word-by-word token rendering
      AgentPortrait.tsx                 # Character portrait in chat
    checklist/
      TaskList.tsx                      # Draggable task list
      TaskItem.tsx                      # Single task (drag handle, checkbox, text)
      AgentSelector.tsx                 # Pick which agent&#39;s list to view
    megaboard/
      ThroughputBar.tsx
      AgentCard.tsx
      AgentGrid.tsx
      PipelineFeed.tsx
      BlockersSection.tsx
      AgentVitals.tsx
      CurrentMission.tsx
      ActivityLog.tsx
      RecentCompletions.tsx
      ActiveFiles.tsx
      StatusPill.tsx
      PartyScreen.tsx                   # RPG-style all-agents view
      QuestLog.tsx                      # Active missions across agents
    onboarding/
      OnboardingWizard.tsx
      StageSelector.tsx
      QuestionStep.tsx
      DesignStep.tsx
      RevealStep.tsx
    shared/
      StatusPill.tsx
      AgentAvatar.tsx
      LoadingSkeleton.tsx
      ModeSwitcher.tsx                  # Game / Checklist / Megaboard toggle
      WebSocketProvider.tsx             # WebSocket connection manager
  lib/
    websocket/
      client.ts                         # WebSocket client (connect to VM)
      events.ts                         # Event type definitions
      reconnect.ts                      # Auto-reconnect logic
      streaming.ts                      # Token streaming helpers
    supabase/
      client.ts                         # Supabase client init
      auth.ts                           # Auth helpers
      types.ts                          # Database types (generated)
    game/
      grid.ts                           # Grid math (screen coords, hit testing)
      sprites.ts                        # Sprite sheet management
      animations.ts                     # Animation state machine (4 states + recovery)
    megaboard/
      types.ts
      agents.ts                         # Agent metadata config
      parsers.ts                        # Markdown table parsers
      status.ts                         # Status derivation logic
      api.ts                            # Client-side fetch hooks
    chat/
      context.ts                        # Context display helpers
    checklist/
      tasks.ts                          # Task CRUD, drag reorder logic, VM sync
    onboarding/
      gemini.ts                         # Gemini image generation
      prompts.ts                        # Room prompt templates
      context-builder.ts                # Answers to context files
      provision.ts                      # VM provisioning trigger
  assets/
    sprites/
      agents/                           # Agent sprite sheets (4 states + recovery)
      rooms/                            # Base room templates
      furniture/                        # Reusable furniture sprites
      effects/                          # Celebration, alert, handoff animations
</code></pre>
<hr>
<h2>Game Elements for Retention</h2>
<p>These are not gimmicks. They serve a business purpose: daily engagement with the platform. The more a client checks on their agents, the more value they perceive, the lower the churn.</p>
<table>
<thead>
<tr>
<th>Element</th>
<th>What It Does</th>
<th>Why It Matters</th>
</tr>
</thead>
<tbody><tr>
<td>Ambient animations</td>
<td>Agents type, sip coffee, stretch</td>
<td>Makes it feel alive. Worth opening.</td>
</tr>
<tr>
<td>Monitor glow</td>
<td>Status at a glance from the overview</td>
<td>Instant health check without reading text</td>
</tr>
<tr>
<td>Completion celebrations</td>
<td>Small animation when task finishes</td>
<td>Dopamine. Client sees progress happening.</td>
</tr>
<tr>
<td>Day/night cycle</td>
<td>Room lighting shifts with client&#39;s time zone</td>
<td>Personal. The world feels like theirs.</td>
</tr>
<tr>
<td>Room customization</td>
<td>Rearrange rooms, add decorative items</td>
<td>Investment in the space increases switching cost</td>
</tr>
<tr>
<td>Team rooms</td>
<td>Drag agents together to form teams</td>
<td>Feels like building your organization</td>
</tr>
<tr>
<td>Agent greetings</td>
<td>Agents say something when you log in</td>
<td>Personal touch. &quot;Morning, [Name]. 3 emails handled overnight.&quot;</td>
</tr>
<tr>
<td>Weekly recap</td>
<td>Animated summary of what agents accomplished</td>
<td>Visual proof of ROI. Shareable.</td>
</tr>
<tr>
<td>Agent death as animation</td>
<td>Crash = walks to bathroom, not error screen</td>
<td>Nothing scary. System feels reliable even when it breaks.</td>
</tr>
<tr>
<td>Work handoff notes</td>
<td>Note appears on desk when one agent assigns to another</td>
<td>User sees every assignment. They&#39;re the boss.</td>
</tr>
<tr>
<td>Room growth</td>
<td>Bare rooms fill up as business grows</td>
<td>Visual motivation to keep going, upgrade tiers.</td>
</tr>
<tr>
<td>Checklist drag satisfaction</td>
<td>Satisfying drag-and-drop to reorder priorities</td>
<td>Makes task management feel tactile, not bureaucratic.</td>
</tr>
<tr>
<td>Speech bubbles</td>
<td>Streaming text above agent in game view</td>
<td>You SEE the agent talking. Alive.</td>
</tr>
<tr>
<td>Points/XP</td>
<td>Tasks = points, streaks = bonuses, unlock items</td>
<td>Gamification retention loop. Daily engagement driver.</td>
</tr>
<tr>
<td>Furniture</td>
<td>Customize rooms with themed items</td>
<td>Investment = switching cost. Also fun.</td>
</tr>
</tbody></table>
<hr>
<h2>Success Metrics</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>Target (Phase 1-5)</th>
<th>Target (Phase 6+)</th>
</tr>
</thead>
<tbody><tr>
<td>Daily active users (Patrik)</td>
<td>1 (Patrik uses it every day)</td>
<td>N/A</td>
</tr>
<tr>
<td>WebSocket latency</td>
<td>&lt;500ms ack, &lt;2s first token</td>
<td>Same targets on hosted</td>
</tr>
<tr>
<td>Onboarding completion rate</td>
<td>N/A</td>
<td>80%+</td>
</tr>
<tr>
<td>Messages per user per day</td>
<td>5+ (Patrik chatting with agents)</td>
<td>3+ (clients)</td>
</tr>
<tr>
<td>Time to first value</td>
<td>&lt; 5 minutes (Patrik sees his agents)</td>
<td>&lt; 10 minutes (client through onboarding)</td>
</tr>
<tr>
<td>Dashboard opens per day</td>
<td>3+</td>
<td>2+</td>
</tr>
<tr>
<td>VM provisioning time</td>
<td>N/A</td>
<td>&lt; 5 minutes (onboarding to live agents)</td>
</tr>
<tr>
<td>Monthly churn</td>
<td>N/A</td>
<td>&lt; 5%</td>
</tr>
<tr>
<td>NPS</td>
<td>N/A</td>
<td>50+</td>
</tr>
</tbody></table>
<hr>
<h2>Client Zero: Patrik</h2>
<p>Build it for him first. His current setup:</p>
<ul>
<li>6 terminal windows, each talking to an agent or team</li>
<li>Switches between them constantly</li>
<li>Uses the terminal for everything: launching agents, reading results, directing work</li>
</ul>
<p><strong>The MVP is his terminal setup, visualized.</strong> The game view shows all agents. The chat bar talks to them. The HUD shows what&#39;s happening. Same power, visual interface.</p>
<p><strong>What Corner gives him that the terminal doesn&#39;t:</strong></p>
<ul>
<li>Visual overview of all agents at once (The Game)</li>
<li>Task management per agent (The HUD + Checklist)</li>
<li>Chat bar always ready (no terminal tab hunting)</li>
<li>Mobile access (check on agents from phone)</li>
<li>Shareable with Ash (co-owner gets visibility without terminal skills)</li>
<li>Demo-ready (show prospects a real system, not a terminal)</li>
<li>History and search across all conversations</li>
<li>Work handoff visibility (see when agents assign to each other)</li>
<li>The game that sells the product</li>
</ul>
<p><strong>What Corner does NOT replace:</strong></p>
<ul>
<li>Terminal for power-user operations (direct Claude Code, git, system commands)</li>
<li>The relay system (Telegram for mobile quick-hits stays)</li>
<li>AOM-EA repo as source of truth (web reads from it, doesn&#39;t replace it)</li>
</ul>
<p>Patrik uses both. Terminal for building. Corner for monitoring, chatting, directing, and showing off.</p>
<hr>
<h2>The Auto-Publish Connection</h2>
<p>From <code>projects/steve/auto-publish-spec.md</code>: Agent deliverables auto-publish to the website via frontmatter + dynamic rendering. The same pipeline feeds the product:</p>
<ul>
<li>Agent work results become content on aheadofmarket.com (briefs, guides, research)</li>
<li>Agent work results also appear in the client&#39;s dashboard activity log</li>
<li>The auto-publish system means agents don&#39;t just do work in the dark. Everything surfaces.</li>
</ul>
<hr>
<h2>Skills Going Public (Freemium Distribution)</h2>
<p>AOM&#39;s internal skills (<code>.claude/skills/</code>) become the product distribution channel. Skills are packaged as standalone agent capabilities that anyone can use.</p>
<p><strong>The play:</strong> Skills go public on a freemium model. Free tier gets basic agent capabilities. Paid tier unlocks the full Corner experience (persistent agents, isometric world, team orchestration). Skills are the top-of-funnel. Corner is the product.</p>
<p><strong>How it maps:</strong></p>
<ul>
<li>Free: Individual skill execution (one-shot). &quot;Draft a LinkedIn post.&quot; &quot;Audit my website speed.&quot; &quot;Generate a content calendar.&quot;</li>
<li>Paid: Persistent agents that remember context, learn preferences, and work together. The full Corner experience.</li>
</ul>
<p><strong>Distribution:</strong> Skills are shareable. A user can send a skill link to anyone. The recipient uses it for free. If they want their own team of agents, they sign up for Corner. Viral distribution through utility.</p>
<hr>
<h2>Product Name</h2>
<p><strong>Name:</strong> CORNER</p>
<p><strong>Why it works:</strong></p>
<ul>
<li>&quot;Hold down your corner&quot; (hustle, territory, ownership)</li>
<li>&quot;Corner the market&quot; (business ambition)</li>
<li>Kid running a lemonade stand on the corner to CEO. The whole journey in one word.</li>
<li>Simple, clean, unique. App Store ready.</li>
</ul>
<p><strong>Direction from Patrik:</strong> &quot;Million worlds, the fun way to run your business, problem solved vibes.&quot;</p>
<p><strong>Previous candidates (killed):</strong> Loft (RealPage trademark), Forge (Founders Fund+OpenAI), Kova, Realm, Mondo, Alto, Brio. Full research at <code>projects/steffen/product-name-research-v3.md</code>.</p>
<hr>
<h2>What This Document Supersedes</h2>
<p>This spec is the single source of truth for the CORNER product. It incorporates and extends:</p>
<ul>
<li><code>dashboard-dual-view-spec.md</code> (Megaboard design, now part of this spec)</li>
<li><code>dashboard-mvp-brief.md</code> (Megaboard implementation guide, still Bobby&#39;s build doc for the Megaboard data views)</li>
<li><code>supabase-schema-spec.md</code> (database schema, now SYNC LAYER, not primary brain. Schema still valid for sync tables.)</li>
<li><code>auto-publish-spec.md</code> (content pipeline, still the implementation guide)</li>
<li><code>onboarding-sequence.md</code> (email sequence for audit clients, feeds into product onboarding)</li>
<li><code>corner-floor-plan-spec.md</code> (Steffen&#39;s isometric layout, THE grid reference for the game)</li>
</ul>
<p>Those documents remain valid for their specific implementation details. This document is the big picture.</p>
<hr>
<h2>Autonomous Build Directive (From Patrik, C1)</h2>
<blockquote>
<p>&quot;Just send me your iterations and I&#39;ll give feedback through a meeting when I see something worth talking about. Until then you guys run towards the goal. You know the vision I could die right now you guys build this.&quot;</p>
</blockquote>
<p>The team builds autonomously. Ship iterations. Patrik reviews when he sees something worth discussing. The vision is documented. The spec is the bible. Run.</p>
<hr>
<p><em>This is the bible. When in doubt, reference this document. When specs conflict, this wins. When building, check this first.</em></p>
<p><em>&quot;Your AI team, visible and alive.&quot;</em>
<em>&quot;A million worlds, one platform.&quot;</em>
<em>&quot;Young people love it, old people can&#39;t live without it.&quot;</em></p>
`,h={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:s,updated:null,summary:a,tags:r,content:l};export{o as agent,n as category,l as content,i as date,s as dateFormatted,h as default,e as slug,a as summary,r as tags,t as title,d as updated};
