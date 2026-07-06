const t="Corner C2 - Agent Sprite States",n="c2-sprite-spec",e="Design Specs",r="Steffen",a="2026-03-15",o="Mar 15",l=null,s="Complete sprite state definitions for all 13 Corner agents. 4 states each. Bobby builds, pixel artist generates.",d=[],i=`<h1>Corner C2: Agent Sprite States</h1>
<p><em>Steffen | 2026-03-15</em>
<em>For Bobby + sprite generation (Gemini or pixel artist). Everything needed to create and animate each agent.</em></p>
<hr>
<h2>Global Sprite Rules</h2>
<h3>Dimensions</h3>
<ul>
<li><strong>Sprite size:</strong> 32x32px per frame (standard), 64x64px for room-zoom detail view</li>
<li><strong>Spritesheet format:</strong> Horizontal strip per state (all frames in a row)</li>
<li><strong>Total per agent:</strong> 4 states x variable frame count = one spritesheet per agent</li>
</ul>
<h3>Art Style</h3>
<ul>
<li>Isometric pixel art, 2:1 ratio consistent with room grid</li>
<li><strong>2-3 head tall</strong> proportions (chibi/cute, not realistic)</li>
<li>Each agent has a <strong>distinct silhouette</strong> even at 32px (hair, hat, accessories)</li>
<li>Warm, slightly saturated colors. Match agentColor from grid-spec.json as the dominant accent</li>
<li>Black outline (1px) on all sprites for readability against any room background</li>
<li><strong>Direction:</strong> All agents face south-east (toward camera) in their default state</li>
</ul>
<h3>Animation Timing</h3>
<ul>
<li><strong>Idle:</strong> 800ms per frame (slow, relaxed breathing/movement)</li>
<li><strong>Thinking:</strong> 400ms per frame (faster, restless energy)</li>
<li><strong>Speaking:</strong> 200ms per frame (active, mouth/gesture movement)</li>
<li><strong>Done:</strong> 300ms per frame for celebration, then hold last frame</li>
</ul>
<h3>State Transitions</h3>
<ul>
<li>Transition between states: crossfade over 200ms</li>
<li>When entering a new state, always start from frame 0</li>
<li><strong>Done</strong> state plays once, then returns to <strong>Idle</strong></li>
</ul>
<hr>
<h2>Agent Sprites</h2>
<h3>1. Patrik (Owner)</h3>
<p><strong>Accent color:</strong> #E85D26 (orange)
<strong>Silhouette:</strong> Clean-cut, slightly taller than other sprites. Simple t-shirt or henley. No hat. Confident posture.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated at desk, slight lean back, one hand on mouse. Monitor glow on face. Subtle breathing (torso rises 1px on frames 2-3). Coffee mug in reach.</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Leans forward, hand moves to chin (frames 1-2). Looks at monitor, then up and right (frames 3-4). Leans back, arms cross (frames 5-6). Loop.</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Turns slightly toward camera. Right hand gestures outward (frames 1-2), returns (frames 3-4). Small speech bubble indicator dot appears above head.</td>
</tr>
<tr>
<td>Done</td>
<td>6</td>
<td>300ms/frame</td>
<td>Leans back with satisfaction (frames 1-2). Single confident nod (frames 3-4). Returns to relaxed seated position (frames 5-6). Holds frame 6.</td>
</tr>
</tbody></table>
<hr>
<h3>2. Mom (Orchestrator)</h3>
<p><strong>Accent color:</strong> #F59E0B (amber)
<strong>Silhouette:</strong> Standing figure (she uses a standing desk). Slightly shorter, busy energy. Clipboard or tablet in hand.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Standing at desk, one hand on surface, other holds tablet at side. Weight shifts slightly (1px left-right on frames 2-3). Monitors glow behind her.</td>
</tr>
<tr>
<td>Thinking</td>
<td>8</td>
<td>400ms/frame</td>
<td>Looks at main screen (frames 1-2). Looks at side screen (frames 3-4). Looks at tablet, taps it (frames 5-6). Looks back at main screen (frames 7-8). Rapid scanning energy.</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Faces camera, tablet in left hand, right hand points forward (frames 1-2). Hand returns, slight nod (frames 3-4). Directing, delegating energy.</td>
</tr>
<tr>
<td>Done</td>
<td>4</td>
<td>300ms/frame</td>
<td>Crosses item off tablet with a decisive stroke (frames 1-2). Brief satisfied nod, tablet lowers (frames 3-4). Holds frame 4.</td>
</tr>
</tbody></table>
<hr>
<h3>3. Alex (Strategy)</h3>
<p><strong>Accent color:</strong> #3B82F6 (blue)
<strong>Silhouette:</strong> Seated, slightly stockier build. Blazer/collared look. Glasses optional. Globe visible on desk.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated at desk, one hand resting on a book, other on mouse. Slight head tilt (1px) on frames 2-3. Analytical calm. Coffee nearby.</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Spins globe with one hand (frames 1-3, globe rotates). Stops globe, turns to whiteboard (frames 4-5). Writes a single mark on whiteboard (frame 6).</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Turns to camera, hands gesture in a &quot;framing&quot; motion (both hands out, palms facing each other, frames 1-2). Hands come together (frames 3-4). Presenting a concept.</td>
</tr>
<tr>
<td>Done</td>
<td>4</td>
<td>300ms/frame</td>
<td>Closes book with a decisive thump (frame 1). Leans back, one arm on chair armrest (frames 2-3). Single nod (frame 4). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>4. Steve (AI Advisory)</h3>
<p><strong>Accent color:</strong> #7C9A72 (sage)
<strong>Silhouette:</strong> Clean, lean posture. Collared shirt, no blazer. Neat hair. Very still compared to other agents.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated, both hands on desk. Very still. Eyes on monitor showing schema diagram. Subtle blink (frame 3, eyes close 1 frame). Minimal movement is the personality.</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>One hand rises to temple (frames 1-2). Eyes look up-right (recall gesture, frames 3-4). Hand returns to desk, types a short burst (frames 5-6).</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Slight turn toward camera. One hand lifts, palm up (presenting data, frames 1-2). Hand lowers back to desk (frames 3-4). Measured, precise.</td>
</tr>
<tr>
<td>Done</td>
<td>4</td>
<td>300ms/frame</td>
<td>Types final keystroke with emphasis (frame 1). Pushes back from desk slightly (frame 2). Folds hands (frame 3). Slight smile, nod (frame 4). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>5. Steffen (Design/Creative Director)</h3>
<p><strong>Accent color:</strong> #C9A84C (gold)
<strong>Silhouette:</strong> Artsy posture. Slightly messy hair or beret/cap. Paint smudge on sleeve. More expressive body language than others.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated at art desk, one hand holds stylus/pen, other supports chin. Looks at mood board on wall (head angled left). Pen taps desk gently (frame 3, 1px bounce). Golden window light on face.</td>
</tr>
<tr>
<td>Thinking</td>
<td>8</td>
<td>400ms/frame</td>
<td>Stands up from desk (frames 1-2). Steps toward mood board (frames 3-4). Reaches up, repositions a color swatch (frames 5-6). Steps back, tilts head to evaluate (frames 7-8).</td>
</tr>
<tr>
<td>Speaking</td>
<td>6</td>
<td>200ms/frame</td>
<td>Turns to camera with energy. Both hands gesture wide (frames 1-2, &quot;picture this&quot;). Hands move in toward each other (frames 3-4, &quot;narrowing down&quot;). Points at something specific off-camera (frames 5-6).</td>
</tr>
<tr>
<td>Done</td>
<td>6</td>
<td>300ms/frame</td>
<td>Swipes stylus across tablet with a final stroke (frames 1-2). Holds up tablet to admire work (frames 3-4). Sets it down with satisfaction, slight lean back (frames 5-6). Holds frame 6.</td>
</tr>
</tbody></table>
<hr>
<h3>6. Bobby (Web Dev)</h3>
<p><strong>Accent color:</strong> #9C27B0 (purple)
<strong>Silhouette:</strong> Hoodie, headphones around neck or on head. Slouched forward &quot;coding posture.&quot; Slightly messy hair.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Hunched over keyboard, face lit by triple monitors (purple/blue glow). One hand on mouse, other rests on keyboard. Headphones on. Slight head bob (1px, frames 2-3) like listening to music.</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Leans back from screen (frames 1-2). Pulls headphones down to neck (frame 3). Runs hand through hair (frame 4). Leans forward again, rapid typing begins (frames 5-6).</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Slight turn, one headphone pulled off ear. Points at main monitor (frames 1-2, &quot;look at this&quot;). Returns hand to keyboard (frames 3-4). Showing code.</td>
</tr>
<tr>
<td>Done</td>
<td>6</td>
<td>300ms/frame</td>
<td>Hits Enter with dramatic single keystroke (frame 1). Leans back, both arms up in stretch (frames 2-3). Grabs energy drink, takes a sip (frames 4-5). Sets it down, returns to idle posture (frame 6). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>7. Colton (Backup Builder)</h3>
<p><strong>Accent color:</strong> #06B6D4 (cyan)
<strong>Silhouette:</strong> Similar to Bobby but neater. Collar visible under hoodie. More upright posture. Cleaner desk implies more methodical.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Upright at desk, both hands on keyboard, proper typing posture. Dual monitors show code. Organized desk visible. Subtle breathing animation (1px torso, frames 2-3).</td>
</tr>
<tr>
<td>Thinking</td>
<td>4</td>
<td>400ms/frame</td>
<td>Looks at left monitor (frame 1). Looks at right monitor (frame 2). Opens a drawer, pulls out a reference doc (frame 3). Reads it, nods (frame 4). Methodical.</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Turns slightly, one hand up with index finger raised (frames 1-2, &quot;one thing&quot;). Hand returns (frames 3-4). Concise.</td>
</tr>
<tr>
<td>Done</td>
<td>4</td>
<td>300ms/frame</td>
<td>Ctrl+S gesture (both hands on keyboard, deliberate, frame 1). Slight lean back (frame 2). Checks both monitors one more time (frame 3). Satisfied nod (frame 4). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>8. Cleo (Content Production)</h3>
<p><strong>Accent color:</strong> #F97316 (orange, distinct from Patrik&#39;s)
<strong>Silhouette:</strong> Creative energy. Headphones on (over-ear, big). Slight lean toward monitor. Maybe a scarf or bandana.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated at editing desk, headphones on, eyes on timeline. Left hand on jog wheel or mouse, right on keyboard. Orange desk lamp glow. Waveform pulses on secondary monitor (synced to waveform-pulse room animation).</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Scrubs timeline back (frames 1-2, hand moves left on mouse). Scrubs forward (frames 3-4, hand moves right). Stops, puts hand to headphone ear to listen closer (frames 5-6). Critical listening.</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Pulls one headphone off, turns to camera. Points at clapperboard on desk (frames 1-2). Gestures toward camera on tripod (frames 3-4). &quot;Here&#39;s the shot.&quot;</td>
</tr>
<tr>
<td>Done</td>
<td>6</td>
<td>300ms/frame</td>
<td>Hits export/render button (frame 1). Leans back, pulls headphones down to neck (frame 2). Stretches arms up (frame 3). Picks up coffee (frame 4). Takes a sip (frame 5). Sets it down, satisfied look (frame 6). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>9. Tony (Social Media)</h3>
<p><strong>Accent color:</strong> #EC4899 (pink)
<strong>Silhouette:</strong> Trendy. Baseball cap or bucket hat. Slightly animated posture even when idle. Phone always in hand.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>One hand holds phone at eye level (scrolling). Other hand taps desk. Slight lean to one side (casual posture). Ring light glow on face. Phone screen flickers with social feed colors.</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Holds phone up, turns it to landscape (frames 1-2). Looks at content calendar on wall (frames 3-4). Turns back to phone, starts composing (frames 5-6).</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Holds phone out toward camera, showing the screen (frames 1-2, &quot;check this out&quot;). Pulls it back, starts typing with both thumbs (frames 3-4).</td>
</tr>
<tr>
<td>Done</td>
<td>6</td>
<td>300ms/frame</td>
<td>Taps phone with a decisive press (posting, frame 1). Phone arm drops to side (frame 2). Both hands up in a brief &quot;nailed it&quot; gesture (frames 3-4). Returns to casual lean (frames 5-6). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>10. Jacob (Outreach)</h3>
<p><strong>Accent color:</strong> #EF4444 (red)
<strong>Silhouette:</strong> Headset on. Button-up shirt, sleeves rolled. Professional but hustling. Notepad always nearby.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated at desk, headset on, looking at CRM on monitor. One hand on mouse scrolling contact list. Coffee cup in other hand. Notepad visible. Slight shift (frames 2-3, adjusting headset).</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Looks at Phoenix map on wall (frames 1-2). Finger traces a route on the map (frame 3). Returns to monitor (frame 4). Scribbles on notepad (frames 5-6).</td>
</tr>
<tr>
<td>Speaking</td>
<td>6</td>
<td>200ms/frame</td>
<td>Hand to headset (answering call, frame 1). Head nods while listening (frames 2-3). Hand gestures while talking (frames 4-5). Writes on notepad while speaking (frame 6). Multi-tasking.</td>
</tr>
<tr>
<td>Done</td>
<td>4</td>
<td>300ms/frame</td>
<td>Hangs up call (hand taps headset, frame 1). Makes a check mark on notepad (frame 2). Takes a swig of coffee (frame 3). Sets mug down, back to monitor (frame 4). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>11. Elmo (QA)</h3>
<p><strong>Accent color:</strong> #10B981 (green)
<strong>Silhouette:</strong> Lab coat over regular clothes. Slightly hunched, inspecting posture. Magnifying glass in hand or on desk.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated at clinical desk. Eyes darting between two monitors showing side-by-side screenshots (frames 1-2 left monitor, frames 3-4 right monitor). Magnifying glass on desk. Pen in hand. Very still otherwise.</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Picks up magnifying glass (frame 1). Holds it up to left monitor (frames 2-3). Moves it to right monitor (frames 4-5). Sets it down, grabs red pen (frame 6). Found something.</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Turns to camera, holds up red pen (frames 1-2, &quot;found an issue&quot;). Points at monitor with pen (frames 3-4). Reporting findings.</td>
</tr>
<tr>
<td>Done</td>
<td>6</td>
<td>300ms/frame</td>
<td>Makes a large checkmark in the air with red pen (frames 1-3, the pen traces a visible green check). Sets pen down (frame 4). Straightens lab coat (frame 5). Satisfied single nod (frame 6). Holds.</td>
</tr>
</tbody></table>
<hr>
<h3>12. Elon (Infrastructure)</h3>
<p><strong>Accent color:</strong> #4CAF50 (server green)
<strong>Silhouette:</strong> Dark clothing (blends with server room). Terminal glow on face (green). Slightly hunched over terminal. Utilitarian.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Seated at terminal, green text reflecting on face. One hand on keyboard. Server rack lights blink in background (synced to room animation). Very still. Bare bulb casts harsh shadow.</td>
</tr>
<tr>
<td>Thinking</td>
<td>6</td>
<td>400ms/frame</td>
<td>Types rapid command (frames 1-2). Leans forward to read output (frames 3-4). Turns to look at server rack behind (frame 5). Turns back to terminal (frame 6). Diagnostic process.</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Slight turn, one hand stays on keyboard. Other hand makes a flat &quot;stop&quot; gesture (frames 1-2, &quot;hold on&quot;). Returns to typing (frames 3-4). Minimal communication, maximum efficiency.</td>
</tr>
<tr>
<td>Done</td>
<td>4</td>
<td>300ms/frame</td>
<td>Types final command, Enter key (frame 1). Terminal shows a success message (green flash on screen, frame 2). Leans back barely (frame 3). Returns to monitoring position immediately (frame 4). No celebration. Back to work.</td>
</tr>
</tbody></table>
<hr>
<h3>13. Pixel (Extension Agent)</h3>
<p><strong>Accent color:</strong> #8B5CF6 (violet)
<strong>Silhouette:</strong> Compact figure. Distinctive VS Code-blue glow around them. Sits in a minimal workspace. Tech-forward look.</p>
<p>NOTE: Pixel is not in the current floor plan but is a growth-zone candidate. Including sprite spec for when the room is added.</p>
<table>
<thead>
<tr>
<th>State</th>
<th>Frames</th>
<th>Duration</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Idle</td>
<td>4</td>
<td>800ms/frame</td>
<td>Small workspace, monitor showing VS Code interface. Seated, compact posture. Violet glow from monitor. Slight cursor blink visible on screen (frame 3).</td>
</tr>
<tr>
<td>Thinking</td>
<td>4</td>
<td>400ms/frame</td>
<td>Opens command palette (frame 1, screen changes). Scrolls through options (frames 2-3). Selects one (frame 4, screen flashes).</td>
</tr>
<tr>
<td>Speaking</td>
<td>4</td>
<td>200ms/frame</td>
<td>Turns slightly, tooltip-style speech bubble (not round, rectangular with arrow). Types a suggestion (frames 1-4, text appears character by character in the bubble).</td>
</tr>
<tr>
<td>Done</td>
<td>4</td>
<td>300ms/frame</td>
<td>Green checkmark appears on monitor (frame 1). Slight lean back (frame 2). Monitor returns to normal (frame 3). Back to idle (frame 4). Holds.</td>
</tr>
</tbody></table>
<hr>
<h2>Speech Bubbles</h2>
<p>When any agent enters the <strong>Speaking</strong> state, a speech bubble appears:</p>
<h3>In-Game Bubble (Isometric View)</h3>
<ul>
<li><strong>Size:</strong> 48x24px max (scales with zoom)</li>
<li><strong>Shape:</strong> Rounded rectangle, 4px border-radius, small triangular tail pointing down-left toward agent</li>
<li><strong>Background:</strong> rgba(10, 15, 30, 0.90)</li>
<li><strong>Border:</strong> 1px solid agentColor at 40% opacity</li>
<li><strong>Text:</strong> Truncated to ~15 chars with &quot;...&quot; if longer. Space Grotesk 600, 8px at 32px sprite scale, 10px at 64px</li>
<li><strong>Text color:</strong> #FDF6EC</li>
<li><strong>Typing indicator:</strong> 3 dots that pulse sequentially (200ms stagger). Dot color = agentColor. Dot size = 3px. Shown before text appears.</li>
<li><strong>Entrance:</strong> Fade in + scale from 0.8 to 1.0, 150ms ease-out</li>
<li><strong>Exit:</strong> Fade out, 100ms ease-in</li>
</ul>
<h3>Chat Panel Bubble (Expanded View)</h3>
<ul>
<li>Full message text appears in the chat bar (see HUD spec)</li>
<li>In-game bubble shows abbreviated preview only</li>
</ul>
<hr>
<h2>Agent Death / Error State</h2>
<p>When an agent encounters an error, crashes, or is unreachable:</p>
<ul>
<li><strong>Visual:</strong> Agent sprite turns grayscale (CSS filter or pre-rendered grayscale sprite)</li>
<li><strong>Animation:</strong> Sprite &quot;glitches&quot; with 2px horizontal offset flickering (frames alternate between normal position and 2px right, 100ms per frame, 3 cycles then holds offset)</li>
<li><strong>Room lighting:</strong> Dims to 20% brightness</li>
<li><strong>Status dot:</strong> Changes to red (#EF4444), no pulse (solid)</li>
<li><strong>Recovery:</strong> When agent comes back online, color restores with a 400ms ease transition. Room lights fade back up. Status dot returns to green with pulse.</li>
</ul>
<hr>
<h2>Spritesheet Export Format</h2>
<p>For each agent, Bobby needs:</p>
<pre><code>sprites/
  patrik/
    idle.png      (4 frames, 128x32 or 256x64)
    thinking.png  (6 frames, 192x32 or 384x64)
    speaking.png  (4 frames, 128x32 or 256x64)
    done.png      (6 frames, 192x32 or 384x64)
  mom/
    idle.png      (4 frames)
    thinking.png  (8 frames)
    speaking.png  (4 frames)
    done.png      (4 frames)
  ...
</code></pre>
<p>Or a single spritesheet per agent with rows = states, cols = max frames. Pad shorter rows with transparent frames.</p>
<p><strong>Naming convention:</strong> <code>{agentId}-{state}.png</code>
<strong>Background:</strong> Transparent (PNG-32)
<strong>Anti-aliasing:</strong> None (hard pixel edges, this is pixel art)</p>
<hr>
<p><em>Every agent has a personality that comes through even at 32 pixels. Bobby doesn&#39;t need to read the room descriptions again. This is the sprite bible.</em></p>
`,h={title:t,slug:n,category:e,agent:r,date:a,dateFormatted:o,updated:null,summary:s,tags:d,content:i};export{r as agent,e as category,i as content,a as date,o as dateFormatted,h as default,n as slug,s as summary,d as tags,t as title,l as updated};
