const n="Corner C2 - HUD + Chat Visual Spec",t="c2-hud-spec",e="Design Specs",o="Steffen",i="2026-03-15",l="Mar 15",p=null,r="Task HUD (top) and Chat Bar (bottom) specs for the Corner game dashboard. Complete dimensions, colors, animations.",a=[],s=`<h1>Corner C2: HUD + Chat Visual Spec</h1>
<p><em>Steffen | 2026-03-15</em>
<em>For Bobby. Pixel-perfect specs. No interpretation needed.</em></p>
<hr>
<h2>The Frame Concept</h2>
<p>&quot;Looking through a window at your office, with game controls at the edges of the glass.&quot;</p>
<p>The isometric game world fills the entire viewport. The HUD elements (top task drawer, bottom chat bar) are overlays ON the glass, not alongside the game. Think of a fighter jet HUD or a video game: the world is immersive, the controls are transparent layers on top.</p>
<p><strong>Key principle:</strong> The HUD never blocks more than 35% of the viewport at any time. The game breathes.</p>
<hr>
<h2>Overall Layout</h2>
<pre><code>+================================================================+
|  [TASK HUD - collapsed: 48px bar, expanded: 280px drawer]      |
|                                                                  |
|                                                                  |
|              I S O M E T R I C   G A M E                        |
|                    W O R L D                                     |
|                                                                  |
|                                                                  |
|  [CHAT BAR - collapsed: 56px bar, expanded: 40% or 100%]       |
+================================================================+
</code></pre>
<h3>Viewport Stack (z-index)</h3>
<table>
<thead>
<tr>
<th>Layer</th>
<th>z-index</th>
<th>Element</th>
</tr>
</thead>
<tbody><tr>
<td>Background</td>
<td>0</td>
<td>#0A0F1E solid</td>
</tr>
<tr>
<td>Game world</td>
<td>10</td>
<td>Isometric canvas/div</td>
</tr>
<tr>
<td>Ground plane shadow</td>
<td>11</td>
<td>Below building</td>
</tr>
<tr>
<td>Building + rooms</td>
<td>15</td>
<td>The office</td>
</tr>
<tr>
<td>Agent sprites</td>
<td>20</td>
<td>Inside rooms</td>
</tr>
<tr>
<td>Speech bubbles</td>
<td>25</td>
<td>Above agents</td>
</tr>
<tr>
<td>HUD overlay</td>
<td>30</td>
<td>Task drawer + chat bar</td>
</tr>
<tr>
<td>Task HUD expanded</td>
<td>35</td>
<td>When drawer is open</td>
</tr>
<tr>
<td>Chat expanded</td>
<td>35</td>
<td>When chat panel is open</td>
</tr>
<tr>
<td>Modal/overlay</td>
<td>40</td>
<td>Full-screen chat or detail panels</td>
</tr>
<tr>
<td>Tooltip/popover</td>
<td>45</td>
<td>Hover tooltips</td>
</tr>
</tbody></table>
<hr>
<h2>Task HUD (Top Drawer)</h2>
<h3>Collapsed State (Default)</h3>
<p><strong>Height:</strong> 48px
<strong>Position:</strong> Fixed top, full viewport width
<strong>Background:</strong> rgba(10, 15, 30, 0.85)
<strong>Backdrop filter:</strong> blur(16px)
<strong>Border-bottom:</strong> 1px solid rgba(255, 255, 255, 0.06)
<strong>Shadow:</strong> 0 2px 12px rgba(0, 0, 0, 0.3)</p>
<p><strong>Layout (flexbox, row, space-between, align-center):</strong></p>
<pre><code>+-----------------------------------------------------------------------+
| [CORNER logo]  | Last Session | By Project | Upcoming | Add New  [v] |
+-----------------------------------------------------------------------+
</code></pre>
<p><strong>Left side:</strong></p>
<ul>
<li>Corner logo/wordmark: Syne 800, 16px, #FDF6EC, letter-spacing: 0.05em, uppercase</li>
<li>Padding-left: 20px</li>
<li>Logo dot color: #E85D26 (the &quot;.&quot; in &quot;CORNER.&quot;)</li>
</ul>
<p><strong>Center: Tab Bar</strong></p>
<ul>
<li>Tabs: &quot;Last Session&quot; | &quot;By Project&quot; | &quot;Upcoming&quot; | &quot;Add New&quot;</li>
<li>Font: Space Grotesk 500, 12px, uppercase, letter-spacing: 0.08em</li>
<li>Inactive tab color: #6B7280</li>
<li>Active tab color: #FDF6EC</li>
<li>Active tab underline: 2px solid agentColor of currently-viewed agent (or #E85D26 if no agent selected)</li>
<li>Tab gap: 28px</li>
<li>Hover color: #A0A0A0</li>
<li>Transition: color 150ms ease</li>
</ul>
<p><strong>Right side:</strong></p>
<ul>
<li>Expand/collapse chevron: Lucide ChevronDown, 16px, #6B7280</li>
<li>Rotates 180deg when expanded</li>
<li>Padding-right: 20px</li>
<li>Hover: #FDF6EC</li>
<li>Click: toggles expanded/collapsed</li>
</ul>
<p><strong>Notification badge (on tab):</strong></p>
<ul>
<li>When a tab has new items: small dot, 6px, #E85D26</li>
<li>Position: top-right of tab text, offset (-4px, -4px)</li>
<li>Pulse: scale 1.0 to 1.3 and back, 1500ms, infinite</li>
</ul>
<h3>Expanded State</h3>
<p><strong>Height:</strong> 280px (transitions from 48px)
<strong>Expand animation:</strong> height 48px to 280px, 250ms ease-out. Content fades in 150ms, starts at 100ms delay.
<strong>Collapse animation:</strong> content fades out 100ms, then height 280px to 48px, 200ms ease-in.</p>
<p><strong>Background:</strong> rgba(10, 15, 30, 0.92)
<strong>Backdrop filter:</strong> blur(20px)
<strong>Border-bottom:</strong> 1px solid rgba(255, 255, 255, 0.08)
<strong>Shadow:</strong> 0 4px 24px rgba(0, 0, 0, 0.5)</p>
<p><strong>Internal layout:</strong></p>
<pre><code>+-----------------------------------------------------------------------+
| [CORNER logo]  | Last Session | By Project | Upcoming | Add New  [^] |
|-----------------------------------------------------------------------|
|                                                                        |
|  [Task Item] [Task Item] [Task Item]                                  |
|  [Task Item] [Task Item] [Task Item]                                  |
|  [Task Item] [Task Item]                                              |
|                                                                        |
+-----------------------------------------------------------------------+
</code></pre>
<p><strong>Task Area:</strong></p>
<ul>
<li>Padding: 16px 20px 20px 20px (below tab bar)</li>
<li>Layout: CSS Grid, 3 columns desktop (min 280px each), 2 columns tablet, 1 column mobile</li>
<li>Gap: 12px</li>
<li>Overflow-y: auto (scroll if many tasks)</li>
<li>Scrollbar: thin, #2D3748 track, #4A5568 thumb, 4px width</li>
</ul>
<h3>Task Item Card</h3>
<p><strong>Size:</strong> Auto height, min-height 64px
<strong>Background:</strong> rgba(255, 255, 255, 0.03)
<strong>Border:</strong> 1px solid rgba(255, 255, 255, 0.06)
<strong>Border-radius:</strong> 6px
<strong>Padding:</strong> 14px 16px
<strong>Hover:</strong> background rgba(255, 255, 255, 0.06), border-color rgba(255, 255, 255, 0.1), transition 150ms ease</p>
<p><strong>Card contents:</strong></p>
<pre><code>+-----------------------------------------------+
| [Agent dot]  Task title text that can wrap     |
|              to two lines maximum              |
| [Project tag]             [Status] [Time ago]  |
+-----------------------------------------------+
</code></pre>
<ul>
<li><strong>Agent status dot:</strong> 8px circle, left-aligned. Color = agent&#39;s statusColor.active. Glow: box-shadow 0 0 4px agentColor at 30%.</li>
<li><strong>Task title:</strong> Space Grotesk 400, 14px, #F0ECE6. Max 2 lines, overflow ellipsis. Line-height: 1.4. Margin-left: 16px from dot.</li>
<li><strong>Project tag:</strong> JetBrains Mono 500, 10px, uppercase, letter-spacing: 0.12em. Color: agentColor. Margin-top: 8px.</li>
<li><strong>Status badge:</strong> &quot;DONE&quot; / &quot;ACTIVE&quot; / &quot;BLOCKED&quot; / &quot;QUEUED&quot;<ul>
<li>DONE: bg #10B981 at 15%, text #10B981</li>
<li>ACTIVE: bg #F59E0B at 15%, text #F59E0B</li>
<li>BLOCKED: bg #EF4444 at 15%, text #EF4444</li>
<li>QUEUED: bg #6B7280 at 15%, text #6B7280</li>
<li>Font: JetBrains Mono 600, 9px, uppercase, letter-spacing: 0.1em</li>
<li>Padding: 2px 8px</li>
<li>Border-radius: 3px</li>
</ul>
</li>
<li><strong>Time ago:</strong> Space Grotesk 400, 11px, #6B7280. &quot;2m ago&quot;, &quot;1h ago&quot;, &quot;yesterday&quot;.</li>
</ul>
<p><strong>Click behavior:</strong> Opens the relevant agent&#39;s room (zooms camera + opens chat with that agent).</p>
<h3>Tab Content: &quot;Add New&quot;</h3>
<p>When this tab is active, the task grid is replaced with a quick-add input:</p>
<ul>
<li>Single-line text input, full width</li>
<li>Background: transparent</li>
<li>Border-bottom: 2px solid rgba(255, 255, 255, 0.15)</li>
<li>Focus: border-bottom 2px solid #E85D26</li>
<li>Placeholder: &quot;Add a task for any agent...&quot; in Space Grotesk 400, 14px, rgba(255, 255, 255, 0.25)</li>
<li>Input text: Space Grotesk 400, 14px, #FDF6EC</li>
<li>Below input: row of agent avatar pills (clickable, assigns task to that agent)<ul>
<li>Each pill: 28px height, agent dot (6px) + agent name (Space Grotesk 500, 11px, #8A847C)</li>
<li>Pill gap: 8px</li>
<li>Selected pill: background agentColor at 15%, text agentColor, border 1px solid agentColor at 30%</li>
<li>Unselected pill: background transparent, border 1px solid rgba(255,255,255,0.08)</li>
<li>Pill padding: 4px 12px</li>
<li>Border-radius: 14px</li>
</ul>
</li>
</ul>
<h3>Gradient Fade (Bottom Edge)</h3>
<p>The expanded HUD blends into the game below. No hard edge.</p>
<ul>
<li>Bottom 20px of the HUD: linear-gradient(to bottom, rgba(10, 15, 30, 0.92) 0%, rgba(10, 15, 30, 0) 100%)</li>
<li>This gradient is separate from the main background, applied to a pseudo-element</li>
<li>pointer-events: none on the gradient area</li>
</ul>
<hr>
<h2>Chat Bar (Bottom)</h2>
<h3>Collapsed State (Default)</h3>
<p><strong>Height:</strong> 56px
<strong>Position:</strong> Fixed bottom, full viewport width
<strong>Background:</strong> rgba(10, 15, 30, 0.85)
<strong>Backdrop filter:</strong> blur(16px)
<strong>Border-top:</strong> 1px solid rgba(255, 255, 255, 0.06)
<strong>Shadow:</strong> 0 -2px 12px rgba(0, 0, 0, 0.3)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------------------------------------------+
| [Agent Avatar] [Agent Name]  [text input.......]  [Send] [Expand ^]  |
+-----------------------------------------------------------------------+
</code></pre>
<p><strong>Agent Avatar:</strong></p>
<ul>
<li>Size: 32px circle</li>
<li>Content: Agent&#39;s sprite (idle frame 0), cropped to head/shoulders</li>
<li>Border: 2px solid agentColor</li>
<li>Margin-left: 16px</li>
<li>If no agent selected: show Corner logo mark, border #4A5568</li>
</ul>
<p><strong>Agent Name:</strong></p>
<ul>
<li>Font: Space Grotesk 600, 13px, agentColor</li>
<li>Margin-left: 12px</li>
<li>If no agent: &quot;Corner&quot; in #6B7280</li>
</ul>
<p><strong>Text Input:</strong></p>
<ul>
<li>Flex: 1 (fills remaining space)</li>
<li>Margin: 0 16px</li>
<li>Background: rgba(255, 255, 255, 0.04)</li>
<li>Border: 1px solid rgba(255, 255, 255, 0.08)</li>
<li>Border-radius: 8px</li>
<li>Height: 36px</li>
<li>Padding: 0 16px</li>
<li>Font: Space Grotesk 400, 14px, #FDF6EC</li>
<li>Placeholder: &quot;Message [Agent Name]...&quot; in rgba(255, 255, 255, 0.25)</li>
<li>Focus: border-color agentColor at 40%, background rgba(255, 255, 255, 0.06)</li>
<li>Transition: border-color 150ms ease</li>
</ul>
<p><strong>Send Button:</strong></p>
<ul>
<li>Size: 36px circle</li>
<li>Background: agentColor (or #E85D26 if no agent)</li>
<li>Icon: Lucide Send, 16px, #FDF6EC</li>
<li>Hover: brightness 1.1, scale 1.05</li>
<li>Disabled (empty input): opacity 0.3, cursor not-allowed</li>
<li>Transition: 150ms ease</li>
</ul>
<p><strong>Expand Button:</strong></p>
<ul>
<li>Lucide ChevronUp, 16px, #6B7280</li>
<li>Margin-right: 16px</li>
<li>Hover: #FDF6EC</li>
<li>Click: toggles expanded state</li>
</ul>
<h3>Expanded State: 40% Conversation Panel</h3>
<p><strong>Height:</strong> 40vh
<strong>Position:</strong> Fixed bottom
<strong>Expand animation:</strong> height 56px to 40vh, 300ms ease-out. Chat messages fade in with 150ms delay, 200ms duration.
<strong>Collapse animation:</strong> reverse, 250ms ease-in.</p>
<p><strong>Background:</strong> rgba(10, 15, 30, 0.95)
<strong>Backdrop filter:</strong> blur(24px)
<strong>Border-top:</strong> 1px solid rgba(255, 255, 255, 0.08)
<strong>Shadow:</strong> 0 -4px 24px rgba(0, 0, 0, 0.5)
<strong>Border-radius:</strong> 16px 16px 0 0 (rounded top corners)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------------------------------------------+
| [Drag handle]                                                         |
|                                                                        |
| [Agent Name + Status]                              [Full screen] [X]  |
|-----------------------------------------------------------------------|
|                                                                        |
|  Agent message bubble                                                  |
|                              User message bubble                       |
|  Agent message bubble                                                  |
|                              User message bubble                       |
|  [typing indicator...]                                                 |
|                                                                        |
|-----------------------------------------------------------------------|
| [Agent Avatar] [text input..........................]  [Send]         |
+-----------------------------------------------------------------------+
</code></pre>
<p><strong>Drag handle:</strong></p>
<ul>
<li>40px wide, 4px tall, border-radius 2px</li>
<li>Color: rgba(255, 255, 255, 0.15)</li>
<li>Centered horizontally, 8px from top</li>
<li>Draggable: resize panel height between 30vh and 80vh</li>
</ul>
<p><strong>Header:</strong></p>
<ul>
<li>Height: 44px</li>
<li>Padding: 0 20px</li>
<li>Border-bottom: 1px solid rgba(255, 255, 255, 0.06)</li>
<li>Agent name: Space Grotesk 600, 15px, #FDF6EC</li>
<li>Agent status: Space Grotesk 400, 11px, agentColor. &quot;Active&quot; / &quot;Thinking...&quot; / &quot;Idle&quot;</li>
<li>Status dot: 6px, agentColor, margin-right 6px from status text</li>
<li>Full-screen button: Lucide Maximize2, 16px, #6B7280, hover #FDF6EC</li>
<li>Close button: Lucide X, 16px, #6B7280, hover #FDF6EC</li>
<li>Button gap: 12px</li>
</ul>
<p><strong>Message Area:</strong></p>
<ul>
<li>Flex: 1, overflow-y: auto</li>
<li>Padding: 16px 20px</li>
<li>Scroll behavior: smooth</li>
<li>Auto-scroll to bottom on new messages</li>
</ul>
<p><strong>Agent Message Bubble:</strong></p>
<ul>
<li>Alignment: left</li>
<li>Max-width: 75%</li>
<li>Background: rgba(255, 255, 255, 0.05)</li>
<li>Border: 1px solid rgba(255, 255, 255, 0.08)</li>
<li>Border-radius: 2px 12px 12px 12px (sharp top-left, rounded elsewhere)</li>
<li>Padding: 12px 16px</li>
<li>Font: Space Grotesk 400, 14px, #F0ECE6</li>
<li>Line-height: 1.55</li>
<li>Margin-bottom: 12px</li>
<li>Agent avatar (20px circle, agentColor border) to the left, 8px gap</li>
<li>Timestamp below bubble: Space Grotesk 400, 10px, #6B7280, margin-top: 4px</li>
</ul>
<p><strong>User Message Bubble:</strong></p>
<ul>
<li>Alignment: right</li>
<li>Max-width: 75%</li>
<li>Background: #E85D26 at 12%</li>
<li>Border: 1px solid #E85D26 at 20%</li>
<li>Border-radius: 12px 2px 12px 12px (sharp top-right)</li>
<li>Padding: 12px 16px</li>
<li>Font: Space Grotesk 400, 14px, #FDF6EC</li>
<li>Line-height: 1.55</li>
<li>Margin-bottom: 12px</li>
<li>Timestamp below: same as agent</li>
</ul>
<p><strong>Code Blocks (in messages):</strong></p>
<ul>
<li>Background: rgba(0, 0, 0, 0.3)</li>
<li>Border: 1px solid rgba(255, 255, 255, 0.06)</li>
<li>Border-radius: 6px</li>
<li>Padding: 12px 16px</li>
<li>Font: JetBrains Mono 400, 12px, #81C784 (green tint)</li>
<li>Line-height: 1.5</li>
<li>Overflow-x: auto</li>
<li>Copy button: top-right, Lucide Copy, 14px, #6B7280, hover #FDF6EC</li>
</ul>
<p><strong>Typing Indicator:</strong></p>
<ul>
<li>3 dots, each 6px circle, agentColor</li>
<li>Sequential pulse: each dot scales 1.0 to 1.4 and back, 600ms per dot, 200ms stagger between dots</li>
<li>Background: same as agent message bubble</li>
<li>Border-radius: 12px</li>
<li>Padding: 12px 16px</li>
<li>Width: 56px</li>
<li>Shows when agent is processing</li>
</ul>
<p><strong>Input Bar (bottom of expanded panel):</strong></p>
<ul>
<li>Height: 56px</li>
<li>Padding: 10px 16px</li>
<li>Border-top: 1px solid rgba(255, 255, 255, 0.06)</li>
<li>Same agent avatar, text input, and send button as collapsed bar</li>
<li>Additional: attachment button (Lucide Paperclip, 16px, #6B7280) left of input, for file/image sharing (v2)</li>
</ul>
<h3>Full-Screen State</h3>
<p><strong>Height:</strong> 100vh
<strong>Position:</strong> Fixed, covers entire viewport
<strong>Background:</strong> #0A0F1E (solid, no transparency)
<strong>Border-radius:</strong> 0</p>
<p><strong>Transition:</strong> 40vh to 100vh, 300ms ease-out. Blur backdrop dissolves as solid bg takes over.</p>
<p><strong>Layout changes in full-screen:</strong></p>
<ul>
<li>Message area gets more horizontal space: max-width 720px, centered</li>
<li>Agent avatar in messages: 28px (slightly larger)</li>
<li>Font sizes: +1px across the board</li>
<li>Header height: 56px</li>
<li>Back button appears: Lucide ArrowLeft, 18px, #6B7280, replaces full-screen button. Returns to 40% panel.</li>
<li>Game world is completely hidden behind the chat</li>
</ul>
<h3>Switching Agents</h3>
<p>When user clicks a different room in the game, the chat context switches:</p>
<ol>
<li>Current conversation fades out (opacity 0, 100ms)</li>
<li>Agent avatar + name update (crossfade, 150ms)</li>
<li>New conversation fades in (opacity 1, 200ms, starts from last message with this agent)</li>
<li>Typing indicator appears if agent is processing</li>
</ol>
<p>Chat history per agent is preserved. Switching agents does NOT clear history.</p>
<hr>
<h2>Agent Status HUD (Inline, Game World)</h2>
<p>Small status indicators that float above each room in the game view (NOT in the HUD overlay).</p>
<p><strong>Nameplate:</strong></p>
<ul>
<li>Position: centered above room, 8px above top wall</li>
<li>Background: rgba(10, 15, 30, 0.85)</li>
<li>Border: 1px solid rgba(255, 255, 255, 0.08)</li>
<li>Border-radius: 4px</li>
<li>Padding: 3px 10px</li>
<li>Font: Space Grotesk 600, 11px, #FDF6EC</li>
<li>Shadow: 0 2px 4px rgba(0, 0, 0, 0.3)</li>
</ul>
<p><strong>Status dot on nameplate:</strong></p>
<ul>
<li>6px circle, left of name, 6px gap</li>
<li>Active: agentColor, pulsing (scale 1.0 to 1.3, 1500ms)</li>
<li>Thinking: #F59E0B, faster pulse (800ms)</li>
<li>Idle: #6B7280, no pulse</li>
<li>Error: #EF4444, no pulse</li>
<li>Offline: #374151, no pulse</li>
</ul>
<p><strong>Hover state (room hover):</strong></p>
<ul>
<li>Nameplate gets agentColor border (at 30% opacity)</li>
<li>Shows additional line below name: current task truncated to 20 chars</li>
<li>Additional line: Space Grotesk 400, 9px, #8A847C</li>
<li>Nameplate expands smoothly: 150ms ease</li>
</ul>
<hr>
<h2>Mini-Map (Bottom-Left Corner)</h2>
<p>For larger offices or when zoomed in, a mini-map shows the full floor plan.</p>
<p><strong>Position:</strong> Fixed, bottom-left, 16px from edges
<strong>Size:</strong> 140x100px
<strong>Background:</strong> rgba(10, 15, 30, 0.85)
<strong>Border:</strong> 1px solid rgba(255, 255, 255, 0.08)
<strong>Border-radius:</strong> 6px
<strong>Shadow:</strong> 0 2px 8px rgba(0, 0, 0, 0.3)</p>
<p><strong>Content:</strong></p>
<ul>
<li>Simplified floor plan, rooms as colored rectangles (fill = agentColor at 30%)</li>
<li>Active rooms: agentColor at 60%</li>
<li>Current viewport shown as a white-border rectangle (1px, #FDF6EC at 40%)</li>
<li>Click anywhere on mini-map to pan the main view</li>
</ul>
<p><strong>Visibility:</strong></p>
<ul>
<li>Hidden at overview zoom level (entire office already visible)</li>
<li>Appears when zoom &gt;= 1.0x</li>
<li>Fade in: 200ms ease</li>
</ul>
<hr>
<h2>Notification Toast</h2>
<p>When agents complete tasks or send messages while user is focused elsewhere:</p>
<p><strong>Position:</strong> Top-right, 16px from right, 64px from top (below HUD bar)
<strong>Size:</strong> 320px wide, auto height
<strong>Background:</strong> rgba(10, 15, 30, 0.95)
<strong>Border:</strong> 1px solid agentColor at 20%
<strong>Border-left:</strong> 3px solid agentColor (accent strip)
<strong>Border-radius:</strong> 8px
<strong>Shadow:</strong> 0 4px 16px rgba(0, 0, 0, 0.4)
<strong>Padding:</strong> 14px 16px</p>
<p><strong>Content:</strong></p>
<ul>
<li>Agent avatar (24px circle, agentColor border) + agent name (Space Grotesk 600, 12px, agentColor) + time (10px, #6B7280)</li>
<li>Message preview: Space Grotesk 400, 13px, #F0ECE6, max 2 lines, ellipsis</li>
<li>Click: opens chat with that agent</li>
</ul>
<p><strong>Entrance:</strong> translateX(340px) to translateX(0), 250ms ease-out
<strong>Exit:</strong> translateX(0) to translateX(340px), 200ms ease-in. Auto-dismiss after 5 seconds.
<strong>Stack:</strong> Multiple toasts stack vertically with 8px gap. Max 3 visible. Older ones dismiss first.</p>
<hr>
<h2>Responsive Behavior</h2>
<h3>Desktop (&gt;= 1024px)</h3>
<ul>
<li>Full experience. HUD top, Chat bottom, game center.</li>
<li>Mini-map bottom-left when zoomed.</li>
<li>Toast top-right.</li>
</ul>
<h3>Tablet (768-1023px)</h3>
<ul>
<li>Same layout, slightly compressed.</li>
<li>HUD expanded height: 240px.</li>
<li>Chat 40% state: 45vh.</li>
<li>Task cards: 2 columns.</li>
<li>Mini-map: 120x85px.</li>
</ul>
<h3>Mobile (&lt; 768px)</h3>
<ul>
<li>HUD collapsed: 44px height. Tabs become horizontal scroll.</li>
<li>HUD expanded: 60vh (takes over most of screen).</li>
<li>Chat collapsed: 52px height.</li>
<li>Chat expanded: goes directly to 100vh (full screen). No 40% intermediate.</li>
<li>Game world: pinch to zoom, drag to pan.</li>
<li>Mini-map: hidden on mobile (full-screen chat replaces the need).</li>
<li>Toast: full-width, 12px from sides, 56px from top.</li>
<li>Task cards: 1 column.</li>
</ul>
<hr>
<h2>Keyboard Shortcuts</h2>
<table>
<thead>
<tr>
<th>Key</th>
<th>Action</th>
</tr>
</thead>
<tbody><tr>
<td>T</td>
<td>Toggle Task HUD expanded/collapsed</td>
</tr>
<tr>
<td>Enter (when not in input)</td>
<td>Focus chat input</td>
</tr>
<tr>
<td>Escape</td>
<td>Close any expanded panel, return to game</td>
</tr>
<tr>
<td>1-9</td>
<td>Quick-switch to agent by roster order</td>
</tr>
<tr>
<td>Space</td>
<td>Pause/resume all ambient animations</td>
</tr>
<tr>
<td>M</td>
<td>Toggle mini-map</td>
</tr>
<tr>
<td>/</td>
<td>Focus chat input with &quot;/&quot; prefix (slash commands)</td>
</tr>
</tbody></table>
<p>Display keyboard shortcut hints on hover over relevant buttons. Font: JetBrains Mono 500, 9px, #6B7280. Show in a small pill next to the button label.</p>
<hr>
<p><em>The game is the star. The HUD is the glass. The glass never competes with the view. Bobby builds it transparent, responsive, and fast.</em></p>
`,d={title:n,slug:t,category:e,agent:o,date:i,dateFormatted:l,updated:null,summary:r,tags:a,content:s};export{o as agent,e as category,s as content,i as date,l as dateFormatted,d as default,t as slug,r as summary,a as tags,n as title,p as updated};
