const e="CORNER C3 Spec: The Living Office",t="c3-spec",n="Technical",o="Steve",i="2026-03-16",l="Mar 16",c=null,a="C3 build spec. Full character movement, WebSocket real-time, Megaboard mode, Checklist mode, mode switching, room zoom, mobile PWA, mini-map, keyboard shortcuts. Everything that makes Corner feel alive.",s=[],r=`<h1>CORNER C3 Spec: The Living Office</h1>
<p><strong>Author:</strong> Steve (AI Advisory Lead)
<strong>Date:</strong> 2026-03-16
<strong>Depends on:</strong> C2 complete (isometric game, HUD, chat bar, agent sprites, SSE streaming)
<strong>Unlocks:</strong> C4 (hosted VM architecture, multi-tenant, onboarding)</p>
<hr>
<h2>What C2 Delivered</h2>
<p>C2 gave us the skeleton. A working isometric office at <code>/dashboard</code> with 13 rooms, 4 agent states, a task HUD drawer, and a chat bar with SSE streaming. One mode. Desktop only. Reads from GitHub API. No character movement beyond state animations. No Megaboard. No Checklist view. No mode switching.</p>
<p>C2 proved the concept. C3 makes it feel alive.</p>
<hr>
<h2>What C3 Is</h2>
<p>C3 is the &quot;feel&quot; release. Everything that makes Corner feel like a living world instead of a static dashboard with pixel art on top. Character movement. Real-time WebSocket streaming. All three modes working. Mobile. The features that make a CPA open this daily because it feels good, not because they have to.</p>
<p><strong>C3 North Star:</strong> After C3, someone watching over your shoulder should say &quot;what is that?&quot; and want to try it. The game should feel like a game. The tools should feel invisible.</p>
<hr>
<h2>C3 Scope (Prioritized)</h2>
<h3>Tier 1: Must Ship (Core C3)</h3>
<p><strong>1. WebSocket Real-Time Layer</strong>
Replace SSE/polling with WebSocket. This is the backbone for everything else in C3.</p>
<ul>
<li>WebSocket server on the VM exposes CC state changes as events</li>
<li>Event types:<ul>
<li><code>agent_state_change</code> (idle -&gt; thinking -&gt; speaking -&gt; done)</li>
<li><code>token_stream</code> (individual tokens for word-by-word chat rendering)</li>
<li><code>task_complete</code> (agent finished work)</li>
<li><code>task_created</code> (new task assigned)</li>
<li><code>handoff</code> (work passed between agents)</li>
<li><code>error_recovery</code> (agent crash -&gt; walk away -&gt; reconnect -&gt; walk back)</li>
<li><code>system_status</code> (VM health, connection quality)</li>
</ul>
</li>
<li>Reconnection logic: silent reconnect, queue messages during disconnect, replay missed events on reconnect</li>
<li>Multi-agent support: single WebSocket connection with multiplexed channels per agent</li>
<li>Speed targets from C1: &lt;500ms ack, &lt;2s first token, &lt;1s status updates</li>
<li>Heartbeat: 30s ping/pong, auto-reconnect on 3 missed pongs</li>
</ul>
<p><strong>Build note for Bobby:</strong> The current SSE path (<code>/api/dashboard/chat</code>) stays as fallback. WebSocket is the primary path. Feature-flag it: <code>NEXT_PUBLIC_WS_ENABLED=true</code>. When WebSocket is connected, SSE never fires. When WebSocket drops and can&#39;t reconnect, SSE takes over silently.</p>
<p><strong>2. Streaming Chat via WebSocket</strong>
Chat bar streams responses word-by-word through WebSocket instead of SSE.</p>
<ul>
<li>Token events render into chat bubble AND into the speech bubble above the agent&#39;s isometric character simultaneously</li>
<li>Typing indicator fires on <code>agent_state_change: thinking</code> (&lt;500ms from user send)</li>
<li>First token appears on <code>token_stream</code> first event (&lt;2s from user send)</li>
<li>Speech bubble above agent in isometric view shows the first ~60 chars of response, truncated with &quot;...&quot; for longer responses. Full response in the chat panel.</li>
<li>Streaming respects agent context: each agent&#39;s WebSocket channel carries its own conversation context</li>
<li>Chat history persists across page reloads (localStorage as cache, Supabase as source of truth once connected)</li>
</ul>
<p><strong>3. Mode Switching (Game / Checklist / Megaboard)</strong>
The three modes from the product spec, with fluid toggling.</p>
<ul>
<li>Mode switcher in the top nav bar. Three icons/labels. Active mode highlighted.</li>
<li>URL structure:<ul>
<li><code>/app</code> or <code>/app/game</code> = The Game (isometric overworld, default)</li>
<li><code>/app/checklist</code> = The Checklist</li>
<li><code>/app/checklist/[agent-slug]</code> = Checklist for specific agent</li>
<li><code>/app/megaboard</code> = The Megaboard</li>
<li><code>/app/megaboard/agent/[slug]</code> = Individual Agent deep-dive</li>
<li><code>/app/chat/[agent-slug]</code> = Full-screen 1:1 chat</li>
</ul>
</li>
<li>Transitions between modes: crossfade (200ms opacity, no spatial transforms). Clean, not distracting.</li>
<li>Chat bar persists across all modes (bottom of screen, always visible)</li>
<li>Task HUD persists across Game and Megaboard modes (not shown in Checklist since Checklist IS the task view)</li>
<li>Keyboard shortcuts: <code>1</code> = Game, <code>2</code> = Checklist, <code>3</code> = Megaboard, <code>Esc</code> = collapse chat/return to current mode</li>
<li>Last-used mode saved to localStorage. Next visit loads the same mode.</li>
<li>Deep links work: sharing <code>/app/megaboard/agent/bobby</code> takes you directly there after auth.</li>
</ul>
<p><strong>4. The Checklist (Mode 2)</strong>
Per-agent draggable task list. The workhorse mode.</p>
<ul>
<li>Agent selector: sidebar or top bar with all agents. Click to view that agent&#39;s tasks.</li>
<li>Task list: vertical list of items, drag to reorder.</li>
<li>Top item = what the agent is working on now (highlighted, status indicator)</li>
<li>Each task item: drag handle (left), checkbox (left of text), task text, brief status pill (right)</li>
<li>Check off completed work (checkbox, line-through, move to &quot;done&quot; section below)</li>
<li>Add new task: text input at the bottom of the list. Type, enter, task appears at bottom.</li>
<li>Agent avatar + name + current status at the top of the list</li>
<li>Done section: collapsed by default, expandable. Shows completed tasks for last 7 days.</li>
<li>Data: Supabase <code>tasks</code> table. <code>automation_id</code> (agent), <code>position</code> (drag order), <code>status</code> (pending/in_progress/done), <code>text</code>, <code>created_at</code>, <code>completed_at</code>.</li>
<li>Real-time sync: drag reorder writes position to Supabase. VM picks up priority changes.</li>
<li>WebSocket: when VM completes a task, the Checklist animates the checkmark in real-time.</li>
</ul>
<p><strong>Steffen design need:</strong> Checklist visual spec. Agent selector style (sidebar vs top tabs). Task item card design. Drag handle visual. Done section styling. Empty state (&quot;No tasks yet. Type one below.&quot;).</p>
<p><strong>5. The Megaboard (Mode 3)</strong>
RPG tactical menu. The &quot;show me everything&quot; view.</p>
<p>Bobby already built the Command View (throughput bar, agent grid, pipeline feed, blockers) and Individual Agent View (mission, vitals, activity log, completions, files) in the pre-C2 dashboard. These get ported into Mode 3 with RPG styling.</p>
<p>C3 Megaboard adds:</p>
<ul>
<li><strong>Party Screen:</strong> All agents displayed as RPG character cards. Agent name, avatar, &quot;level&quot; (based on tasks completed), current quest (active task), HP-style bar showing utilization (idle time vs active time over last 24h). Inspired by Pokemon party screen.</li>
<li><strong>Quest Log:</strong> All active missions across all agents, sorted by priority. Each quest shows: agent avatar, quest name (task text), status (in progress / queued / blocked), time elapsed. Tap a quest to see the agent&#39;s detail view.</li>
<li><strong>Mission Feed:</strong> Real-time pipeline events. Commits, completions, handoffs, blocks. Newest at top. Each event: timestamp, agent avatar, event type icon, one-line description. This is the existing pipeline feed from the Command View, but with RPG visual treatment.</li>
<li><strong>Inventory section (later C3 or C3.1):</strong> Deliverables produced, files created, assets generated. Not critical for C3 launch.</li>
</ul>
<p>The existing Command View and Individual Agent View specs (<code>dashboard-mvp-brief.md</code>, <code>dashboard-dual-view-spec.md</code>) remain Bobby&#39;s build docs for the data layer. C3 wraps them in the Megaboard&#39;s RPG aesthetic.</p>
<p><strong>Steffen design need:</strong> Party Screen card design. Quest Log layout. RPG-styled mission feed. Character &quot;level&quot; badge. HP/utilization bar design. Overall Megaboard composition (how Party Screen, Quest Log, and Mission Feed arrange on the page).</p>
<p><strong>6. Room Zoom</strong>
Click a room in the Game view, smooth zoom into it. See full detail.</p>
<ul>
<li>Default view: full office, all rooms visible. Rooms are ~100-120px wide on screen.</li>
<li>Zoom levels:<ul>
<li>Level 1 (default): Full office. All 13 rooms visible. Agent nameplates readable.</li>
<li>Level 2 (room focus): 3-4 rooms visible. Furniture details visible. Agent character larger.</li>
<li>Level 3 (room detail): Single room fills ~60% of viewport. Full furniture detail, ambient animations visible, monitor screens readable.</li>
</ul>
</li>
<li>Zoom interaction:<ul>
<li>Click a room: smooth zoom to Level 2 centered on that room (400ms ease-out)</li>
<li>Double-click or pinch: zoom to Level 3</li>
<li>Click background or Esc: zoom back out to Level 1 (300ms ease-in)</li>
<li>Scroll wheel: continuous zoom between levels</li>
<li>On mobile: pinch to zoom, tap room to zoom in</li>
</ul>
</li>
<li>When zoomed to Level 2 or 3, clicking the agent character opens the chat bar focused on that agent</li>
<li>Pan: click-and-drag the game viewport when zoomed in. Momentum scrolling.</li>
<li>Mini-map appears when zoomed past Level 1 (see Mini-Map spec below)</li>
</ul>
<p><strong>Steffen design need:</strong> Room sprites at multiple detail levels (or confirm single sprite scales well). Zoom transition feel (spring, ease, linear). Mini-map visual design.</p>
<p><strong>7. Mini-Map</strong>
Small overview map visible when zoomed into the game.</p>
<ul>
<li>Size: 140x100px (from Steffen&#39;s C2 HUD spec)</li>
<li>Position: bottom-right corner of the game viewport, above the chat bar</li>
<li>Shows: the full office silhouette, a rectangle indicating the current viewport area, colored dots for each agent (dot color = status color)</li>
<li>Click/drag on mini-map to pan the main viewport</li>
<li>Fades out when at Level 1 zoom (full view). Fades in at Level 2+.</li>
<li>Semi-transparent background (rgba(0,0,0,0.6))</li>
</ul>
<p><strong>8. Keyboard Shortcuts</strong>
Global keyboard shortcuts. Must work from any mode.</p>
<p>From Steffen&#39;s C2 HUD spec:</p>
<table>
<thead>
<tr>
<th>Key</th>
<th>Action</th>
</tr>
</thead>
<tbody><tr>
<td><code>1</code></td>
<td>Switch to Game mode</td>
</tr>
<tr>
<td><code>2</code></td>
<td>Switch to Checklist mode</td>
</tr>
<tr>
<td><code>3</code></td>
<td>Switch to Megaboard mode</td>
</tr>
<tr>
<td><code>Esc</code></td>
<td>Collapse chat / zoom out / close modal</td>
</tr>
<tr>
<td><code>/</code></td>
<td>Focus chat input (like Slack)</td>
</tr>
<tr>
<td><code>T</code></td>
<td>Toggle Task HUD open/closed</td>
</tr>
<tr>
<td><code>?</code></td>
<td>Show keyboard shortcuts overlay</td>
</tr>
<tr>
<td><code>Cmd/Ctrl + K</code></td>
<td>Command palette (search agents, tasks, switch modes)</td>
</tr>
</tbody></table>
<p>Command palette is the power-user feature. Search &quot;Bobby&quot; -&gt; jump to Bobby&#39;s room (Game), Bobby&#39;s checklist (Checklist), or Bobby&#39;s stats (Megaboard). Search &quot;rebuild v2&quot; -&gt; find the task across any agent.</p>
<p><strong>9. Notification Toasts</strong>
From Steffen&#39;s C2 HUD spec. Real-time notifications.</p>
<ul>
<li>Position: top-right, stacked vertically, max 3 visible</li>
<li>Each toast: agent avatar (24px), one-line message, timestamp, dismiss X</li>
<li>Auto-dismiss after 5s (configurable)</li>
<li>Toast types:<ul>
<li><code>task_complete</code> (green accent): &quot;Bobby completed: Rebuild /v2&quot;</li>
<li><code>handoff</code> (blue accent): &quot;Steffen handed off to Bobby: Brand specs&quot;</li>
<li><code>error_recovery</code> (yellow accent): &quot;Cleo reconnecting...&quot;</li>
<li><code>system</code> (gray accent): &quot;WebSocket reconnected&quot;</li>
</ul>
</li>
<li>Click toast to navigate to relevant agent/task</li>
<li>Sound: subtle chime on task_complete (opt-in, off by default)</li>
<li>Toasts also trigger via WebSocket events</li>
</ul>
<h3>Tier 2: Ship If Time (High Value, Lower Risk)</h3>
<p><strong>10. Agent Death Animations</strong>
When an agent session crashes, the character doesn&#39;t show an error. They walk away.</p>
<ul>
<li>Crash detected via WebSocket <code>error_recovery</code> event</li>
<li>Animation sequence:<ol>
<li>Agent stands up, pushes back chair (1s)</li>
<li>Agent walks to room door (1s)</li>
<li>Agent disappears through door</li>
<li>Room lights dim slightly. Monitor shows screensaver.</li>
<li>System reconnects silently in background</li>
<li>On reconnect: agent walks back through door (1s), sits at desk (1s), reads queue (1s), resumes normal state</li>
</ol>
</li>
<li>User can still chat during &quot;away&quot; state. Messages queue. When agent returns, they process the queue.</li>
<li>If reconnect fails after 30s: room stays dim, small &quot;reconnecting&quot; badge on the room (NOT an error screen). Toast notification: &quot;[Agent] is taking a break. They&#39;ll be back.&quot;</li>
<li>Chat panel shows: &quot;Messages will be delivered when [Agent] returns.&quot; (not an error, a status)</li>
</ul>
<p><strong>11. Work Handoff Visualization</strong>
When one agent assigns work to another, the user sees it.</p>
<ul>
<li>Handoff detected via WebSocket <code>handoff</code> event (contains: from_agent, to_agent, task_description)</li>
<li>Visual in Game mode:<ul>
<li>A small note/document icon appears on the sending agent&#39;s desk</li>
<li>The icon floats from the sending room to the receiving room along the shortest adjacency path (use the adjacency map from Steffen&#39;s grid spec)</li>
<li>The note lands on the receiving agent&#39;s desk</li>
<li>Receiving agent&#39;s character looks at the note, nods, picks it up (2s animation)</li>
</ul>
</li>
<li>HUD notification: &quot;[From Agent] assigned to [To Agent]: [task description]&quot;</li>
<li>Toast notification with blue accent</li>
<li>Megaboard Quest Log: new quest appears for receiving agent</li>
<li>Checklist: new task appears at top of receiving agent&#39;s list</li>
</ul>
<p><strong>Steffen design need:</strong> Handoff note icon design. Float animation path (straight line vs curved). Receiving agent &quot;pickup&quot; animation frames.</p>
<p><strong>12. Full Character Movement</strong>
Agents can walk between rooms. The north star animation.</p>
<ul>
<li>Characters walk from their desk to another room&#39;s desk for handoffs</li>
<li>Walk speed: 1 tile per second (smooth, not rushed)</li>
<li>Directional sprites: 4 directions (NE, NW, SE, SW in isometric space)</li>
<li>Pathfinding: A* or simple adjacency-based routing using the floor plan adjacency map. Agents walk through shared doorways.</li>
<li>Walk triggers:<ul>
<li>Handoff (delivering work to another agent)</li>
<li>Meeting (two agents temporarily in the same room, e.g., Bobby and Steffen discussing a design)</li>
<li>Bathroom break (death animation, walks to an off-screen &quot;bathroom&quot; area south of the building)</li>
</ul>
</li>
<li>When an agent is walking, their room status shows &quot;away&quot; and their isometric character is visually in the hallway/Main Hall</li>
<li>Only one agent walks at a time (to avoid visual chaos). Queue walks.</li>
</ul>
<p><strong>Steffen design need:</strong> Walking sprites (4 directions, 6 frames each per direction). Hallway/door transition animation. &quot;Meeting&quot; pose (two agents in one room).</p>
<p><strong>13. Mobile Responsive (PWA)</strong>
iPhone right after desktop is nailed. From the product spec Phase 8.</p>
<ul>
<li>Responsive breakpoints:<ul>
<li>Desktop: 1024px+ (full experience)</li>
<li>Tablet: 768-1023px (game slightly smaller, HUD as overlay)</li>
<li>Mobile: 390-767px (game takes full screen, HUD as bottom sheet, chat as full screen overlay)</li>
</ul>
</li>
<li>Mobile Game mode:<ul>
<li>Full-screen isometric view with pinch-to-zoom</li>
<li>Tap room to zoom and show agent detail bottom sheet</li>
<li>Bottom sheet: agent name, status, current task, &quot;Chat&quot; button</li>
<li>Swipe down to dismiss bottom sheet</li>
</ul>
</li>
<li>Mobile Checklist mode:<ul>
<li>Full-screen task list with agent selector at top (horizontal scroll)</li>
<li>Drag-to-reorder works with touch</li>
</ul>
</li>
<li>Mobile Megaboard mode:<ul>
<li>Stacked cards instead of grid. Scroll vertically.</li>
<li>Party Screen as horizontal scrollable cards</li>
</ul>
</li>
<li>Mobile Chat:<ul>
<li>Full screen when expanded (no split view)</li>
<li>Swipe right to dismiss and return to previous mode</li>
<li>Input bar with keyboard avoidance (no content hidden behind keyboard)</li>
</ul>
</li>
<li>PWA manifest:<ul>
<li><code>display: standalone</code></li>
<li>App icon (Corner logo, Steffen designs)</li>
<li>Splash screen</li>
<li>Offline status view: show last-known agent states, &quot;Reconnecting...&quot; banner</li>
</ul>
</li>
<li>Push notifications (Phase 2 of mobile, not C3 launch):<ul>
<li>Task completed</li>
<li>Agent blocked</li>
<li>Daily summary</li>
</ul>
</li>
</ul>
<p><strong>Steffen design need:</strong> Mobile layout wireframes for all 3 modes. Bottom sheet design. PWA icon. Splash screen. Agent detail bottom sheet content.</p>
<h3>Tier 3: Data Layer (No UI Yet)</h3>
<p><strong>14. Points/XP Data Model</strong>
Not building UI yet. Just the data structure so we can layer UI on later.</p>
<ul>
<li>Supabase table <code>xp_events</code>:<ul>
<li><code>id</code>, <code>org_id</code>, <code>automation_id</code> (agent), <code>event_type</code> (task_complete, commit, handoff_complete), <code>points</code>, <code>created_at</code></li>
</ul>
</li>
<li>Supabase table <code>xp_totals</code> (materialized view or computed):<ul>
<li><code>org_id</code>, <code>automation_id</code>, <code>total_xp</code>, <code>level</code>, <code>streak_days</code>, <code>streak_multiplier</code></li>
</ul>
</li>
<li>Point values:<ul>
<li>Task completed: 10 XP</li>
<li>Commit pushed: 5 XP</li>
<li>Handoff completed: 3 XP</li>
<li>Streak bonus: 3-day = 1.5x, 7-day = 2x, 30-day = 3x</li>
</ul>
</li>
<li>Level calculation: <code>level = floor(sqrt(total_xp / 100))</code> (Level 1 at 100 XP, Level 2 at 400 XP, Level 5 at 2500 XP, Level 10 at 10000 XP). Logarithmic, gets harder to level up.</li>
<li>When tasks complete via WebSocket, log the XP event. Totals computed from events.</li>
<li>No UI rendering in C3. Data starts accumulating. C4 or C5 renders it in the Megaboard Party Screen.</li>
</ul>
<p><strong>15. Furniture as Swappable JSON Config</strong>
Bobby may partially do this in C2.1. C3 formalizes it.</p>
<ul>
<li>Each room&#39;s furniture loaded from JSON config, NOT hardcoded in the component</li>
<li>JSON structure per room:</li>
</ul>
<pre><code class="language-json">{
  &quot;room_id&quot;: &quot;bobby&quot;,
  &quot;furniture&quot;: [
    {
      &quot;id&quot;: &quot;desk_triple_monitor&quot;,
      &quot;sprite&quot;: &quot;/sprites/furniture/desk-triple-monitor.png&quot;,
      &quot;grid_position&quot;: [2, 1],
      &quot;grid_size&quot;: [2, 1],
      &quot;z_index&quot;: 10
    },
    {
      &quot;id&quot;: &quot;chair_gaming&quot;,
      &quot;sprite&quot;: &quot;/sprites/furniture/chair-gaming.png&quot;,
      &quot;grid_position&quot;: [2, 2],
      &quot;grid_size&quot;: [1, 1],
      &quot;z_index&quot;: 15
    }
  ]
}
</code></pre>
<ul>
<li>Furniture configs stored in Supabase <code>room_assets</code> or as static JSON files for MVP</li>
<li>Room editor (C4+) reads and writes this JSON</li>
<li>Steffen&#39;s c2-furniture-spec.md defines the 15 base items. Each gets a sprite and a JSON entry.</li>
<li>Default placements from Steffen&#39;s spec pre-loaded per room</li>
</ul>
<hr>
<h2>C3 Build Order</h2>
<p>Sequenced for maximum impact per iteration. Bobby can ship after each step and it&#39;s better than before.</p>
<h3>Step 1: WebSocket Foundation (3-4 days)</h3>
<p>Build the WebSocket server and client. Everything else depends on this.</p>
<ul>
<li>WebSocket server on local machine (Node.js, ws library)</li>
<li>Event protocol (JSON messages with <code>type</code>, <code>agent</code>, <code>data</code>, <code>timestamp</code>)</li>
<li>Client-side WebSocket hook (<code>useWebSocket</code>) with auto-reconnect</li>
<li>Feature flag: <code>NEXT_PUBLIC_WS_ENABLED</code></li>
<li>Connect to existing chat: messages flow through WebSocket instead of SSE</li>
<li>Heartbeat + reconnection logic</li>
<li><strong>Ship:</strong> Chat works via WebSocket. Faster. Reconnects silently.</li>
</ul>
<h3>Step 2: Streaming Chat + Agent State Sync (2-3 days)</h3>
<p>Wire up the real-time layer to the visual layer.</p>
<ul>
<li>Token streaming through WebSocket renders word-by-word in chat AND speech bubble</li>
<li>Agent state changes via WebSocket drive sprite animations (thinking/speaking/done)</li>
<li>Status propagation measured: target &lt;1s from event to visual update</li>
<li><strong>Ship:</strong> Send a message, agent starts thinking immediately, response streams in real-time. Feels alive.</li>
</ul>
<h3>Step 3: Mode Switching Infrastructure (2 days)</h3>
<p>The routing and layout framework for all three modes.</p>
<ul>
<li>Route structure (<code>/app</code>, <code>/app/checklist</code>, <code>/app/megaboard</code>)</li>
<li>Mode switcher component in nav</li>
<li>Shared layout (chat bar + HUD persist across modes)</li>
<li>Keyboard shortcuts (<code>1</code>, <code>2</code>, <code>3</code>, <code>Esc</code>, <code>/</code>, <code>T</code>)</li>
<li>Mode transition animations (crossfade)</li>
<li><strong>Ship:</strong> Three modes exist. Game works (existing). Checklist and Megaboard are placeholder screens with the correct routing.</li>
</ul>
<h3>Step 4: Checklist Mode (3-4 days)</h3>
<p>The workhorse view that clients use daily.</p>
<ul>
<li>Agent selector</li>
<li>Draggable task list (react-beautiful-dnd or @dnd-kit/core)</li>
<li>Task CRUD (add, reorder, check off)</li>
<li>Supabase tasks table integration</li>
<li>WebSocket sync (task completed on VM -&gt; checkbox animates in browser)</li>
<li>Done section (collapsed, expandable)</li>
<li><strong>Ship:</strong> Checklist mode is fully functional. Add tasks, reorder, complete. Real-time updates.</li>
</ul>
<h3>Step 5: Megaboard Mode (3-4 days)</h3>
<p>Port existing Command View + Agent View into Mode 3 with RPG styling.</p>
<ul>
<li>Party Screen (agent cards with stats)</li>
<li>Quest Log (active missions)</li>
<li>Mission Feed (real-time events, now via WebSocket)</li>
<li>Individual Agent drill-down (existing vitals, activity log, completions)</li>
<li>RPG visual treatment (dark theme, game-inspired typography, status as &quot;HP bars&quot;)</li>
<li><strong>Ship:</strong> Megaboard is the power-user view. Everything visible, RPG energy.</li>
</ul>
<h3>Step 6: Room Zoom + Mini-Map (2-3 days)</h3>
<p>Make the Game mode feel explorable.</p>
<ul>
<li>Click-to-zoom (3 zoom levels, smooth transitions)</li>
<li>Scroll wheel / pinch zoom</li>
<li>Pan when zoomed in (click-drag, momentum)</li>
<li>Mini-map component (140x100px, bottom-right)</li>
<li>Mini-map shows viewport rectangle + agent status dots</li>
<li>Click mini-map to pan</li>
<li><strong>Ship:</strong> Game mode feels like a world you can explore, not a static image.</li>
</ul>
<h3>Step 7: Notifications + Keyboard Shortcuts Polish (1-2 days)</h3>
<ul>
<li>Toast notification system</li>
<li>Command palette (<code>Cmd+K</code>)</li>
<li>All keyboard shortcuts wired up</li>
<li>Shortcut overlay (<code>?</code>)</li>
<li><strong>Ship:</strong> Power users can fly. Notifications keep everyone informed.</li>
</ul>
<h3>Step 8: Agent Death + Handoff Animations (3-4 days)</h3>
<p>The &quot;wow&quot; animations that make this feel like a game.</p>
<ul>
<li>Death sequence (stand up, walk to door, disappear, reconnect, walk back)</li>
<li>Handoff note animation (float from room to room)</li>
<li>Receiving agent pickup animation</li>
<li>Crash recovery flow (dim room, badge, queue messages, resume)</li>
<li><strong>Ship:</strong> Agents feel like characters, not status indicators.</li>
</ul>
<h3>Step 9: Full Character Movement (4-5 days)</h3>
<p>The north star. Agents walk.</p>
<ul>
<li>4-directional walking sprites</li>
<li>A* pathfinding on the adjacency map</li>
<li>Walk triggers (handoff, meeting, bathroom break)</li>
<li>Walk queue (one at a time)</li>
<li>Room &quot;away&quot; state when character is walking</li>
<li><strong>Ship:</strong> The isometric office is alive. Agents move between rooms.</li>
</ul>
<h3>Step 10: Mobile Responsive + PWA (4-5 days)</h3>
<p>Corner on your phone.</p>
<ul>
<li>Responsive layouts for all 3 modes</li>
<li>Touch interactions (pinch zoom, tap room, swipe dismiss)</li>
<li>Bottom sheet for agent detail on mobile</li>
<li>PWA manifest (installable)</li>
<li>Offline status view</li>
<li><strong>Ship:</strong> Install Corner on your phone. Check on your team from anywhere.</li>
</ul>
<p><strong>Total estimated build time: 28-38 days (6-8 weeks)</strong></p>
<hr>
<h2>What C3 Unlocks</h2>
<p>After C3 ships, these become possible (they weren&#39;t before):</p>
<ol>
<li><p><strong>Client demos that sell.</strong> The game feels alive. Character movement, real-time streaming, three modes. This is the &quot;what is that?&quot; moment. Patrik can show a prospect Corner running on his phone and close the deal.</p>
</li>
<li><p><strong>Daily engagement loop.</strong> Checklist mode gives clients a reason to open Corner every morning. Megaboard gives power users depth. Game mode gives everyone delight. Three engagement layers, three user types served.</p>
</li>
<li><p><strong>Real-time pipeline visibility.</strong> WebSocket means the dashboard reflects reality within 1 second. No more polling delays. When Bobby commits code, Patrik sees it appear in the Megaboard feed instantly.</p>
</li>
<li><p><strong>Mobile-first client access.</strong> PWA means clients can check on their AI team from their phone at a job site, in a meeting, on the couch. This is how contractors and CPAs actually work: phone first.</p>
</li>
<li><p><strong>C4 readiness.</strong> WebSocket architecture is the same protocol that works over the internet to a hosted VM. C3 proves it on localhost. C4 just swaps the WebSocket endpoint from <code>localhost</code> to <code>client-vm.corner.app</code>. Minimal code change, proven architecture.</p>
</li>
<li><p><strong>XP data accumulation.</strong> Even though XP UI isn&#39;t built, data starts accumulating from C3 launch. By C4, there&#39;s a history of agent activity ready to display.</p>
</li>
<li><p><strong>Handoff transparency as a selling point.</strong> &quot;Your AI team assigns work to each other and you SEE it happen.&quot; No other AI product shows this. The handoff animation is a differentiator.</p>
</li>
</ol>
<hr>
<h2>Technical Requirements</h2>
<h3>WebSocket Server</h3>
<p><strong>Runtime:</strong> Node.js (same as the Next.js dev server initially, separate process for production)
<strong>Library:</strong> <code>ws</code> (npm package, lightweight, battle-tested)
<strong>Port:</strong> 3001 (default, configurable via <code>WS_PORT</code> env var)
<strong>Protocol:</strong></p>
<pre><code>Client -&gt; Server:
{
  &quot;type&quot;: &quot;chat_message&quot;,
  &quot;agent&quot;: &quot;bobby&quot;,
  &quot;content&quot;: &quot;Rebuild /v2 with Framer Motion&quot;,
  &quot;timestamp&quot;: &quot;2026-03-16T14:30:00Z&quot;
}

Server -&gt; Client:
{
  &quot;type&quot;: &quot;agent_state_change&quot;,
  &quot;agent&quot;: &quot;bobby&quot;,
  &quot;state&quot;: &quot;thinking&quot;,
  &quot;timestamp&quot;: &quot;2026-03-16T14:30:00.4Z&quot;
}

{
  &quot;type&quot;: &quot;token_stream&quot;,
  &quot;agent&quot;: &quot;bobby&quot;,
  &quot;token&quot;: &quot;I&#39;ll&quot;,
  &quot;timestamp&quot;: &quot;2026-03-16T14:30:01.8Z&quot;
}

{
  &quot;type&quot;: &quot;task_complete&quot;,
  &quot;agent&quot;: &quot;bobby&quot;,
  &quot;task&quot;: &quot;Rebuild /v2 with Framer Motion&quot;,
  &quot;result_file&quot;: &quot;projects/bobby/latest-result.md&quot;,
  &quot;timestamp&quot;: &quot;2026-03-16T15:45:00Z&quot;
}

{
  &quot;type&quot;: &quot;handoff&quot;,
  &quot;from_agent&quot;: &quot;steffen&quot;,
  &quot;to_agent&quot;: &quot;bobby&quot;,
  &quot;task&quot;: &quot;Brand page v4 design specs&quot;,
  &quot;timestamp&quot;: &quot;2026-03-16T16:00:00Z&quot;
}

{
  &quot;type&quot;: &quot;error_recovery&quot;,
  &quot;agent&quot;: &quot;cleo&quot;,
  &quot;status&quot;: &quot;disconnected&quot;,  // or &quot;reconnecting&quot; or &quot;reconnected&quot;
  &quot;timestamp&quot;: &quot;2026-03-16T16:30:00Z&quot;
}
</code></pre>
<p><strong>Authentication:</strong> JWT from Supabase Auth passed on WebSocket handshake. Server validates before accepting connection. Reject invalid/expired tokens.</p>
<p><strong>Multiplexing:</strong> Single WebSocket connection per client session. All agents&#39; events flow through one connection, filtered by <code>agent</code> field. Client-side hooks filter events per component (chat panel only renders its focused agent&#39;s tokens).</p>
<h3>Local File Reading (C3 Stretch)</h3>
<p>C2 reads agent data from GitHub API. C3 should read from the local filesystem when running on localhost. This eliminates GitHub rate limits and makes data appear instantly.</p>
<p><strong>Approach:</strong> The WebSocket server (Node.js, port 3001) also serves a REST API for file reads:</p>
<ul>
<li><code>GET /api/local/file?path=projects/bobby/latest-result.md</code> -&gt; file contents</li>
<li><code>GET /api/local/file?path=context/current-priorities.md</code> -&gt; file contents</li>
<li><code>GET /api/local/agents</code> -&gt; list of agent directories with AGENT.md parsed</li>
</ul>
<p><strong>Security:</strong> Only serves files within the AOM-EA repo root. Path traversal protection (reject <code>..</code>). Only active when <code>LOCAL_MODE=true</code> env var is set. In hosted mode (C4+), this endpoint doesn&#39;t exist; the VM&#39;s WebSocket server provides the same data through events.</p>
<h3>Streaming Architecture</h3>
<pre><code>CC generates token
       |
       v
WebSocket server detects output
(watches relay-outbox.jsonl or CC stdout)
       |
       v
WebSocket broadcast to connected dashboard
       |
       +---&gt; Chat panel: token renders in message bubble
       +---&gt; Game view: speech bubble updates above agent
       +---&gt; Megaboard: mission feed entry appears
       +---&gt; Notification: toast if relevant
</code></pre>
<p><strong>How WebSocket server detects CC output:</strong></p>
<p>Option A (file watcher): Watch <code>context/relay-outbox.jsonl</code> for new lines. When CC writes a response, parse it and broadcast via WebSocket. Low-latency on local filesystem (fswatch/chokidar, &lt;50ms detection).</p>
<p>Option B (stdout pipe): If CC runs as a child process of the WebSocket server, pipe stdout and parse token events directly. Lowest latency possible.</p>
<p><strong>C3 recommendation:</strong> Option A (file watcher). It works with the existing relay architecture. No changes to how CC runs. Bobby just needs to watch the outbox file and broadcast new lines.</p>
<p>Option B is for C4 (hosted VMs where AOM controls the CC process lifecycle).</p>
<hr>
<h2>Design Requirements for Steffen</h2>
<p>Steffen needs to produce these specs before Bobby can build the corresponding C3 features. Ordered by build sequence.</p>
<h3>Must Have (Before C3 Build Starts)</h3>
<ol>
<li><p><strong>Checklist Mode Visual Spec</strong></p>
<ul>
<li>Agent selector component (sidebar vs top tabs vs horizontal scroll)</li>
<li>Task item card design (drag handle, checkbox, text, status pill)</li>
<li>Empty state design</li>
<li>Done section (collapsed/expanded)</li>
<li>Add new task input design</li>
<li>Responsive: desktop + mobile layouts</li>
</ul>
</li>
<li><p><strong>Megaboard RPG Visual Spec</strong></p>
<ul>
<li>Party Screen: agent character card design (avatar, name, level badge, HP/utilization bar, current quest)</li>
<li>Quest Log: layout, quest item design, status indicators</li>
<li>Mission Feed: event item design, event type icons</li>
<li>Overall Megaboard composition (how the sections arrange)</li>
<li>Dark theme, RPG typography, game-inspired UI elements</li>
<li>Responsive: desktop (grid) + mobile (stacked cards)</li>
</ul>
</li>
<li><p><strong>Mode Switcher Design</strong></p>
<ul>
<li>Nav bar with mode toggle (3 icons/labels)</li>
<li>Active state indicator</li>
<li>Where it sits relative to HUD and chat bar</li>
<li>Mobile: bottom tab bar or top toggle</li>
</ul>
</li>
<li><p><strong>Notification Toast Design</strong></p>
<ul>
<li>Toast card design (agent avatar, message, timestamp, dismiss)</li>
<li>4 accent colors (green/blue/yellow/gray for different event types)</li>
<li>Stack behavior (max 3, newest at top)</li>
<li>Position on screen (top-right, above the HUD)</li>
</ul>
</li>
</ol>
<h3>Nice to Have (Can Spec During Build)</h3>
<ol start="5">
<li><p><strong>Room Zoom Transition Feel</strong></p>
<ul>
<li>Zoom animation curve (spring, ease-out, linear)</li>
<li>What happens to HUD/chat during zoom (do they shrink? overlay?)</li>
<li>Level 3 zoom: room detail polish (any extra visual elements that appear at close-up?)</li>
</ul>
</li>
<li><p><strong>Mini-Map Design</strong></p>
<ul>
<li>Exact visual (simplified building silhouette vs full detail miniature)</li>
<li>Agent dot colors and sizes</li>
<li>Viewport rectangle style</li>
<li>Fade in/out behavior</li>
</ul>
</li>
<li><p><strong>Handoff Animation Design</strong></p>
<ul>
<li>Note/document icon (what does it look like?)</li>
<li>Float path (straight line vs curved arc)</li>
<li>Receiving agent &quot;pickup&quot; pose (add to sprite sheet)</li>
</ul>
</li>
<li><p><strong>Walking Sprite Sheets</strong></p>
<ul>
<li>4 directional walking animations (NE, NW, SE, SW)</li>
<li>6 frames per direction</li>
<li>Consistent with existing idle/thinking/speaking/done sprites</li>
<li>Door enter/exit frames</li>
</ul>
</li>
<li><p><strong>Mobile Layout Wireframes</strong></p>
<ul>
<li>Game mode on mobile (390px)</li>
<li>Bottom sheet for agent detail</li>
<li>Checklist on mobile</li>
<li>Megaboard on mobile (stacked cards)</li>
<li>Chat on mobile (full screen)</li>
<li>PWA icon and splash screen</li>
</ul>
</li>
<li><p><strong>Command Palette Design</strong></p>
<ul>
<li>Overlay design (centered modal, search input at top, results below)</li>
<li>Result item design (icon + label + subtitle + keyboard shortcut hint)</li>
<li>Fuzzy search result highlighting</li>
</ul>
</li>
</ol>
<hr>
<h2>Bobby&#39;s C3 Checklist</h2>
<p>Specific implementation tasks. Check off as completed.</p>
<h3>Infrastructure</h3>
<ul>
<li><input disabled="" type="checkbox"> WebSocket server (Node.js, ws library, port 3001)</li>
<li><input disabled="" type="checkbox"> WebSocket event protocol (JSON schema for all event types)</li>
<li><input disabled="" type="checkbox"> WebSocket client hook (<code>useWebSocket</code> with auto-reconnect)</li>
<li><input disabled="" type="checkbox"> Feature flag <code>NEXT_PUBLIC_WS_ENABLED</code></li>
<li><input disabled="" type="checkbox"> SSE fallback (existing chat path stays, used when WS unavailable)</li>
<li><input disabled="" type="checkbox"> File watcher on relay-outbox.jsonl (chokidar)</li>
<li><input disabled="" type="checkbox"> JWT auth on WebSocket handshake</li>
<li><input disabled="" type="checkbox"> Heartbeat (30s ping/pong)</li>
</ul>
<h3>Streaming Chat</h3>
<ul>
<li><input disabled="" type="checkbox"> Token streaming via WebSocket -&gt; chat bubble</li>
<li><input disabled="" type="checkbox"> Token streaming via WebSocket -&gt; speech bubble above agent in game</li>
<li><input disabled="" type="checkbox"> Typing indicator on <code>agent_state_change: thinking</code></li>
<li><input disabled="" type="checkbox"> Agent state sync: WebSocket events drive sprite animation states</li>
<li><input disabled="" type="checkbox"> Chat history persistence (localStorage cache + Supabase sync)</li>
</ul>
<h3>Mode Switching</h3>
<ul>
<li><input disabled="" type="checkbox"> Route structure (<code>/app</code>, <code>/app/checklist</code>, <code>/app/megaboard</code>, etc.)</li>
<li><input disabled="" type="checkbox"> Mode switcher component (nav bar, 3 icons)</li>
<li><input disabled="" type="checkbox"> Crossfade transition between modes (200ms)</li>
<li><input disabled="" type="checkbox"> Chat bar persists across modes</li>
<li><input disabled="" type="checkbox"> HUD persists across Game + Megaboard (hidden in Checklist)</li>
<li><input disabled="" type="checkbox"> Keyboard shortcuts: <code>1</code>, <code>2</code>, <code>3</code>, <code>Esc</code>, <code>/</code>, <code>T</code>, <code>?</code>, <code>Cmd+K</code></li>
<li><input disabled="" type="checkbox"> Last-used mode saved to localStorage</li>
<li><input disabled="" type="checkbox"> Deep linking (direct URL to any mode/agent)</li>
</ul>
<h3>Checklist Mode</h3>
<ul>
<li><input disabled="" type="checkbox"> Agent selector component</li>
<li><input disabled="" type="checkbox"> Draggable task list (<code>@dnd-kit/core</code> or <code>react-beautiful-dnd</code>)</li>
<li><input disabled="" type="checkbox"> Task item component (drag handle, checkbox, text, status pill)</li>
<li><input disabled="" type="checkbox"> Add new task input</li>
<li><input disabled="" type="checkbox"> Check off task (line-through, move to done section)</li>
<li><input disabled="" type="checkbox"> Done section (collapsed by default, expandable)</li>
<li><input disabled="" type="checkbox"> Supabase <code>tasks</code> table CRUD</li>
<li><input disabled="" type="checkbox"> Real-time sync: WebSocket <code>task_complete</code> -&gt; animate checkbox</li>
<li><input disabled="" type="checkbox"> Empty state</li>
</ul>
<h3>Megaboard Mode</h3>
<ul>
<li><input disabled="" type="checkbox"> Port existing Command View into Megaboard layout</li>
<li><input disabled="" type="checkbox"> Port existing Individual Agent View into Megaboard layout</li>
<li><input disabled="" type="checkbox"> Party Screen (agent cards with level, utilization bar, current quest)</li>
<li><input disabled="" type="checkbox"> Quest Log (all active missions, sorted by priority)</li>
<li><input disabled="" type="checkbox"> Mission Feed (real-time via WebSocket, RPG styling)</li>
<li><input disabled="" type="checkbox"> Dark theme, RPG typography</li>
<li><input disabled="" type="checkbox"> Agent drill-down navigation</li>
</ul>
<h3>Room Zoom</h3>
<ul>
<li><input disabled="" type="checkbox"> 3 zoom levels with smooth transitions (400ms ease-out)</li>
<li><input disabled="" type="checkbox"> Click room to zoom Level 2</li>
<li><input disabled="" type="checkbox"> Double-click / pinch to zoom Level 3</li>
<li><input disabled="" type="checkbox"> Click background / Esc to zoom out</li>
<li><input disabled="" type="checkbox"> Scroll wheel continuous zoom</li>
<li><input disabled="" type="checkbox"> Pan when zoomed (click-drag, momentum scrolling)</li>
<li><input disabled="" type="checkbox"> Mini-map component (140x100px)</li>
<li><input disabled="" type="checkbox"> Mini-map viewport rectangle</li>
<li><input disabled="" type="checkbox"> Mini-map click-to-pan</li>
<li><input disabled="" type="checkbox"> Mini-map fade in/out on zoom level</li>
</ul>
<h3>Notifications</h3>
<ul>
<li><input disabled="" type="checkbox"> Toast notification component</li>
<li><input disabled="" type="checkbox"> Toast stack (max 3, top-right)</li>
<li><input disabled="" type="checkbox"> 4 toast types (task_complete, handoff, error_recovery, system)</li>
<li><input disabled="" type="checkbox"> Auto-dismiss (5s)</li>
<li><input disabled="" type="checkbox"> Click toast to navigate</li>
<li><input disabled="" type="checkbox"> WebSocket events trigger toasts</li>
</ul>
<h3>Keyboard Shortcuts</h3>
<ul>
<li><input disabled="" type="checkbox"> Global keyboard listener</li>
<li><input disabled="" type="checkbox"> Mode switching (<code>1</code>, <code>2</code>, <code>3</code>)</li>
<li><input disabled="" type="checkbox"> Chat focus (<code>/</code>)</li>
<li><input disabled="" type="checkbox"> HUD toggle (<code>T</code>)</li>
<li><input disabled="" type="checkbox"> Escape (collapse/zoom out/close)</li>
<li><input disabled="" type="checkbox"> Shortcuts overlay (<code>?</code>)</li>
<li><input disabled="" type="checkbox"> Command palette (<code>Cmd+K</code>)</li>
</ul>
<h3>Agent Death Animation</h3>
<ul>
<li><input disabled="" type="checkbox"> Death sequence sprites (stand, walk to door, disappear)</li>
<li><input disabled="" type="checkbox"> Room dimming on agent departure</li>
<li><input disabled="" type="checkbox"> &quot;Away&quot; state with reconnecting badge</li>
<li><input disabled="" type="checkbox"> Return sequence sprites (enter, walk to desk, sit, resume)</li>
<li><input disabled="" type="checkbox"> Message queueing during away state</li>
<li><input disabled="" type="checkbox"> Chat panel &quot;messages will be delivered&quot; status</li>
</ul>
<h3>Handoff Animation</h3>
<ul>
<li><input disabled="" type="checkbox"> Handoff note sprite</li>
<li><input disabled="" type="checkbox"> Float animation (room to room, follow adjacency path)</li>
<li><input disabled="" type="checkbox"> Receiving agent pickup animation</li>
<li><input disabled="" type="checkbox"> HUD notification on handoff</li>
<li><input disabled="" type="checkbox"> Checklist: new task appears on receiving agent&#39;s list</li>
</ul>
<h3>Character Movement</h3>
<ul>
<li><input disabled="" type="checkbox"> Walking sprite sheets (4 directions, 6 frames each)</li>
<li><input disabled="" type="checkbox"> A* pathfinding on adjacency map</li>
<li><input disabled="" type="checkbox"> Walk speed (1 tile/second)</li>
<li><input disabled="" type="checkbox"> Walk triggers (handoff, meeting, bathroom)</li>
<li><input disabled="" type="checkbox"> Walk queue (one at a time)</li>
<li><input disabled="" type="checkbox"> Room &quot;away&quot; state during walk</li>
<li><input disabled="" type="checkbox"> Hallway/door transitions</li>
</ul>
<h3>Mobile + PWA</h3>
<ul>
<li><input disabled="" type="checkbox"> Responsive breakpoints (1024px, 768px, 390px)</li>
<li><input disabled="" type="checkbox"> Mobile Game mode (full screen, tap room, bottom sheet)</li>
<li><input disabled="" type="checkbox"> Mobile Checklist mode (full screen list, touch drag)</li>
<li><input disabled="" type="checkbox"> Mobile Megaboard mode (stacked cards)</li>
<li><input disabled="" type="checkbox"> Mobile Chat (full screen, swipe to dismiss)</li>
<li><input disabled="" type="checkbox"> PWA manifest (standalone, icon, splash)</li>
<li><input disabled="" type="checkbox"> Offline status view</li>
<li><input disabled="" type="checkbox"> Keyboard avoidance on mobile chat input</li>
</ul>
<h3>Data Layer</h3>
<ul>
<li><input disabled="" type="checkbox"> Supabase <code>xp_events</code> table (schema only, no UI)</li>
<li><input disabled="" type="checkbox"> Supabase <code>xp_totals</code> view (computed from events)</li>
<li><input disabled="" type="checkbox"> XP event logging on task_complete/commit/handoff</li>
<li><input disabled="" type="checkbox"> Furniture JSON config format defined</li>
<li><input disabled="" type="checkbox"> Room furniture loaded from JSON (not hardcoded)</li>
<li><input disabled="" type="checkbox"> Default furniture placements from Steffen&#39;s c2-furniture-spec.md</li>
</ul>
<hr>
<h2>What C3 Does NOT Include</h2>
<p>Explicitly out of scope for C3. These are C4+ features:</p>
<ul>
<li><strong>Hosted VM architecture</strong> (Docker containers, fleet management, provisioning API). C4.</li>
<li><strong>Onboarding wizard</strong> (Steps 1-8, Gemini room generation, VM provisioning). C4.</li>
<li><strong>Multi-tenant</strong> (Supabase RLS, org-based data isolation). C4.</li>
<li><strong>AOM admin panel</strong> (fleet management, update pushing, health monitoring). C4.</li>
<li><strong>Room editor</strong> (tap-to-place furniture). C5+.</li>
<li><strong>Furniture marketplace</strong> (themed packs, purchases). C5+.</li>
<li><strong>Neighbor offices</strong> (social layer, visit other users). C5+.</li>
<li><strong>Points/XP UI rendering</strong> (Party Screen level badges are placeholder). C4 or C5.</li>
<li><strong>Skills marketplace</strong> (public skills, freemium distribution). C5+.</li>
<li><strong>Self-service signup</strong> (prospect signs up, trial, converts). C5+.</li>
<li><strong>White-label option.</strong> C6+.</li>
<li><strong>Kubernetes scaling.</strong> When client count demands it.</li>
<li><strong>SOC 2 formal audit.</strong> After first paying clients.</li>
</ul>
<hr>
<h2>C4-C5 Horizon Notes (Early Thinking)</h2>
<h3>C4: The Hosted Platform</h3>
<p>C3 proves everything on localhost. C4 makes it work over the internet with paying clients.</p>
<p><strong>Core C4 scope:</strong></p>
<ul>
<li>Docker container template (CC + relay + context files + WebSocket endpoint)</li>
<li>Container provisioning API (spin up new client in &lt;5 minutes)</li>
<li>WebSocket proxy (route browser connections to correct client container based on auth)</li>
<li>Onboarding wizard (Steps 1-8 from product spec, triggers VM provisioning)</li>
<li>Supabase multi-tenant (RLS, org isolation)</li>
<li>AOM admin panel MVP (fleet health, one-click restart, push updates)</li>
<li>Gemini room generation pipeline (client describes dream office, rooms generate)</li>
<li>Domain setup (corner.__ TLD)</li>
</ul>
<p><strong>Key C4 architecture question:</strong> Where do the Docker containers run?</p>
<ul>
<li>Option A: Dedicated server (Hetzner, $50-100/mo for 50 clients). Simple. AOM manages one machine.</li>
<li>Option B: Cloud VPS per client (DigitalOcean droplets, AWS EC2). More isolated. More expensive.</li>
<li>Option C: Container-as-a-service (Fly.io, Railway). Auto-scaling. Managed infrastructure.</li>
<li><strong>Recommendation:</strong> Option A for first 10-20 clients. Prove the model. Move to Option C when scaling demands it. Don&#39;t over-engineer before first dollar.</li>
</ul>
<p><strong>C4 unlocks:</strong> First paying client. Revenue from the platform. Proof of product-market fit.</p>
<h3>C5: The Platform</h3>
<p>After C4 has clients running, C5 is about making the platform sticky and scalable.</p>
<p><strong>Core C5 scope:</strong></p>
<ul>
<li>Room editor (tap-to-place furniture, save to Supabase)</li>
<li>XP UI (level badges, streak indicators, progress bars in Party Screen)</li>
<li>Weekly recap animation (animated summary of agent accomplishments)</li>
<li>Skills gallery on the Corner site (browse, try, subscribe)</li>
<li>Self-service signup flow (prospect -&gt; trial -&gt; paid conversion)</li>
<li>Trend charts and ROI reports per client</li>
<li>SOC 2 audit trail formalization</li>
<li>API access for client integrations</li>
</ul>
<p><strong>C5 unlocks:</strong> Platform stickiness. Self-service growth. Revenue that doesn&#39;t require AOM to manually onboard every client.</p>
<hr>
<p><em>This spec is the bridge between &quot;it works&quot; (C2) and &quot;I want that&quot; (C3). WebSocket makes it real-time. Three modes make it usable for everyone. Character movement makes it unforgettable. Build it, ship it, iterate.</em></p>
<p><em>&quot;Your AI team, visible and alive.&quot;</em></p>
`,d={title:e,slug:t,category:n,agent:o,date:i,dateFormatted:l,updated:null,summary:a,tags:s,content:r};export{o as agent,n as category,r as content,i as date,l as dateFormatted,d as default,t as slug,a as summary,s as tags,e as title,c as updated};
