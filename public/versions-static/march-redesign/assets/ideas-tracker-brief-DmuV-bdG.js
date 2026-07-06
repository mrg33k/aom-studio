const t="Ideas Tracker Design Brief",e="ideas-tracker-brief",n="Design Specs",o="Elon",i="2026-03-11",d="Mar 11",s=null,a="Design brief from Elon to Steffen for the ideas tracker page.",l=[],r=`<h1>Ideas Tracker -- Design Brief for Steffen</h1>
<p><em>From: Elon (sys) | 2026-03-11</em>
<em>Full spec: <code>projects/sys/ideas-tracker-spec.md</code></em></p>
<hr>
<h2>The Ask</h2>
<p>Design the visual language for Patrik&#39;s Ideas Tracker page. This is a neural-network-style graph where each idea is a glowing node, connections are synaptic lines, and the whole thing feels like looking into someone&#39;s creative brain.</p>
<p>Patrik&#39;s words: <strong>&quot;This can&#39;t be a blah page. It&#39;s a visual of my brain.&quot;</strong></p>
<hr>
<h2>Visual Direction</h2>
<h3>Overall Mood</h3>
<p>A city at night seen from above. Clusters of warm light connected by thin glowing lines. Some areas buzzing with activity, some quiet. The dark AOM background (#0A0A08) is the night sky. Ideas are the lights.</p>
<p>Not clinical. Not corporate. Not a flowchart. This should feel organic, alive, and a little bit beautiful. Think: the opening sequence of a sci-fi film where you see a neural network activating, but make it warm (AOM&#39;s palette) instead of cold blue.</p>
<h3>Reference Energy</h3>
<ul>
<li>Neural network visualizations (but warm-toned, not clinical blue/white)</li>
<li>City lights from airplane windows at night</li>
<li>Constellation maps with connection lines</li>
<li>The &quot;beautiful chaos&quot; of a working creative brain</li>
</ul>
<hr>
<h2>Node Design</h2>
<h3>Shape</h3>
<p>Circles. Simple. Let the glow and color do the work.</p>
<h3>Size</h3>
<ul>
<li>Base diameter: 48px</li>
<li>Scales with progress: 0% = 36px, 100% = 64px</li>
<li>An idea that&#39;s been heavily worked on is literally larger on the canvas</li>
</ul>
<h3>Color by Category</h3>
<p>Each category gets a primary glow color. The node itself is a darker version of the glow color (so the glow reads as light radiating outward).</p>
<table>
<thead>
<tr>
<th>Category</th>
<th>Node Fill</th>
<th>Glow Color</th>
<th>Reference</th>
</tr>
</thead>
<tbody><tr>
<td>product</td>
<td>#331400</td>
<td>#FF4F00 (Orange)</td>
<td>AOM&#39;s primary. The core products.</td>
</tr>
<tr>
<td>revenue</td>
<td>#2D2209</td>
<td>#D4A843 (Gold)</td>
<td>Money-generating ideas glow gold.</td>
</tr>
<tr>
<td>system</td>
<td>#1A2617</td>
<td>#7C9A72 (Sage)</td>
<td>Infrastructure/tools.</td>
</tr>
<tr>
<td>content</td>
<td>#1F1D1A</td>
<td>#F5F0EB (Warm White)</td>
<td>Content ideas glow clean.</td>
</tr>
<tr>
<td>side-project</td>
<td>#1A1918</td>
<td>#78716C (Muted Stone)</td>
<td>Lower visual priority. Not dead, just quiet.</td>
</tr>
</tbody></table>
<h3>Status Effects</h3>
<table>
<thead>
<tr>
<th>Status</th>
<th>Glow Intensity</th>
<th>Animation</th>
<th>Opacity</th>
</tr>
</thead>
<tbody><tr>
<td>seed</td>
<td>20% glow radius</td>
<td>Slow, faint pulse (4s cycle)</td>
<td>70%</td>
</tr>
<tr>
<td>growing</td>
<td>40% glow radius</td>
<td>Medium pulse (3s cycle)</td>
<td>85%</td>
</tr>
<tr>
<td>active</td>
<td>80% glow radius</td>
<td>&quot;Firing&quot; -- bright radial burst every 5-10s</td>
<td>100%</td>
</tr>
<tr>
<td>shipped</td>
<td>60% glow, solid</td>
<td>No pulse. Stable. Slight gold ring.</td>
<td>100%</td>
</tr>
<tr>
<td>parked</td>
<td>10% glow radius</td>
<td>None</td>
<td>50%</td>
</tr>
</tbody></table>
<h3>&quot;Firing&quot; Animation (active ideas only)</h3>
<p>A radial burst: the glow expands outward from the node (like a ripple in water) then fades. Duration: 0.8s. Easing: ease-out. The burst reaches roughly 2x the normal glow radius, then dissipates. Stagger these across active nodes so they don&#39;t all fire simultaneously. This is what makes the canvas feel alive.</p>
<h3>Node Label</h3>
<ul>
<li><strong>Title:</strong> Syne, 700 Bold, 13px, warm white (#F5F0EB). Positioned below the node circle, centered.</li>
<li><strong>Status badge:</strong> JetBrains Mono, 700 Bold, 8px, uppercase, tracking-[0.2em]. Positioned above the node. Color matches the status (orange for active, sage for growing, stone for seed, gold for shipped, muted for parked).</li>
<li>Labels should NOT overlap. If nodes are too close, labels can be hidden and shown on hover.</li>
</ul>
<hr>
<h2>Connection Lines</h2>
<h3>Style by Type</h3>
<table>
<thead>
<tr>
<th>Type</th>
<th>Line Style</th>
<th>Thickness</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td><code>feeds</code></td>
<td>Solid with arrowhead</td>
<td>1.5px</td>
<td>#292524 (Warm Edge) base, glow to category color on hover</td>
</tr>
<tr>
<td><code>related</code></td>
<td>Solid, no arrow</td>
<td>1px</td>
<td>#292524 base</td>
</tr>
<tr>
<td><code>depends</code></td>
<td>Dashed (4px dash, 4px gap), arrowhead</td>
<td>1.5px</td>
<td>#292524 base</td>
</tr>
<tr>
<td><code>competes</code></td>
<td>Dotted, subtle red tint</td>
<td>1px</td>
<td>#44403C with #FF4F00 at 20% opacity</td>
</tr>
</tbody></table>
<h3>Hover Behavior</h3>
<p>When you hover a node, ALL its connections glow to full brightness. The connected nodes also brighten slightly. Everything else dims to ~30% opacity. This makes the relationship web instantly readable.</p>
<h3>Animation</h3>
<ul>
<li><code>feeds</code> lines: subtle particle flow along the line direction (tiny dots traveling from source to target, 1-2 particles visible at a time). Speed: 3s to traverse the full line.</li>
<li><code>depends</code> lines: the dashes slowly animate (scroll), suggesting waiting/dependency.</li>
<li><code>related</code> lines: static. No animation needed.</li>
</ul>
<hr>
<h2>Detail Panel</h2>
<p>Slides in from the right on desktop (400px wide), up from the bottom on mobile (60% screen height).</p>
<h3>Layout (top to bottom)</h3>
<ol>
<li><p><strong>Header area</strong></p>
<ul>
<li>Status badge (top-left, same style as node badge but 11px)</li>
<li>Category label (top-right, JetBrains Mono, 9px, muted)</li>
<li>Title: Syne, 700 Bold, 28px, warm white</li>
<li>Description: Space Grotesk, 400 Regular, 15px, stone (#A8A29E), max 3 lines</li>
</ul>
</li>
<li><p><strong>Progress bar</strong></p>
<ul>
<li>Full-width bar, 6px tall, rounded-sm</li>
<li>Background: #1A1A17</li>
<li>Fill: category glow color</li>
<li>Percentage label right-aligned: JetBrains Mono, 700 Bold, 12px</li>
</ul>
</li>
<li><p><strong>Milestones</strong></p>
<ul>
<li>Checklist style. Each milestone is a row.</li>
<li>Done: line-through text, muted color, checkmark in category color</li>
<li>Pending: bright text, empty circle</li>
<li>Font: Space Grotesk, 400 Regular, 14px</li>
</ul>
</li>
<li><p><strong>Connections</strong></p>
<ul>
<li>&quot;Connected to&quot; header: JetBrains Mono, 9px, uppercase</li>
<li>List of connected idea names, each clickable (navigates canvas to that node)</li>
<li>Connection type shown as a small icon or label next to each</li>
</ul>
</li>
<li><p><strong>Meta</strong></p>
<ul>
<li>Owner/Agent: JetBrains Mono, 11px</li>
<li>Created: date</li>
<li>Last activity: date + relative (&quot;3 days ago&quot;)</li>
</ul>
</li>
<li><p><strong>Notes</strong></p>
<ul>
<li>Free text area. Space Grotesk, 14px, stone color.</li>
<li>Editable.</li>
</ul>
</li>
</ol>
<h3>Panel background</h3>
<p>#141412 (Charcoal). Border-left: 1px solid #292524. Subtle orange glow bleeding from the left edge (the selected node&#39;s glow &quot;leaks&quot; into the panel edge).</p>
<hr>
<h2>Filter Bar</h2>
<p>Top of the canvas. Transparent background with slight backdrop-blur.</p>
<h3>Chips</h3>
<ul>
<li>Status chips: seed, growing, active, shipped, parked</li>
<li>Category chips: product, revenue, system, content, side-project</li>
<li>Chip style: border 1px #292524, rounded-sm, JetBrains Mono 9px uppercase</li>
<li>Active chip: filled with the relevant color (status color or category color), white text</li>
<li>Inactive chip: ghost style, muted text</li>
</ul>
<h3>Behavior</h3>
<p>Filtering DIMS non-matching nodes to 15% opacity instead of removing them. Spatial layout is preserved. This is important: Patrik builds spatial memory of where ideas are. Hiding nodes would break that.</p>
<hr>
<h2>Mobile vs Desktop</h2>
<h3>Desktop (1024+)</h3>
<ul>
<li>Full canvas, mouse drag to pan, scroll to zoom</li>
<li>Detail panel: right sidebar, 400px, push (doesn&#39;t overlay canvas)</li>
<li>Filter bar: horizontal row of chips, fixed at top</li>
<li>Node labels always visible for active/shipped ideas, hover for others</li>
</ul>
<h3>Tablet (768-1023)</h3>
<ul>
<li>Full canvas, touch drag/pinch zoom</li>
<li>Detail panel: slides up from bottom, 50% height</li>
<li>Filter bar: horizontal scroll if needed</li>
<li>Node labels visible for active only</li>
</ul>
<h3>Mobile (&lt; 768)</h3>
<ul>
<li>Canvas with pinch-to-zoom, touch drag</li>
<li>Tap a node: full-screen detail view (not a panel)</li>
<li>Filter bar: collapses to a single dropdown button (&quot;Filter&quot;) that opens a sheet</li>
<li>Node labels hidden by default, shown on tap (before opening detail)</li>
<li>Minimum touch target: 44x44px per node</li>
</ul>
<hr>
<h2>Color System Summary</h2>
<h3>Status Colors (for badges, indicators)</h3>
<table>
<thead>
<tr>
<th>Status</th>
<th>Color</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>seed</td>
<td>Stone</td>
<td>#78716C</td>
</tr>
<tr>
<td>growing</td>
<td>Sage</td>
<td>#7C9A72</td>
</tr>
<tr>
<td>active</td>
<td>Orange</td>
<td>#FF4F00</td>
</tr>
<tr>
<td>shipped</td>
<td>Gold</td>
<td>#D4A843</td>
</tr>
<tr>
<td>parked</td>
<td>Muted</td>
<td>#44403C</td>
</tr>
</tbody></table>
<h3>Category Colors (for node glow)</h3>
<p>Already defined above in the Node Design section.</p>
<h3>Background Layers</h3>
<ul>
<li>Canvas BG: #0A0A08 (Night)</li>
<li>Grid texture: subtle dot grid at 5% opacity, spacing 40px</li>
<li>Noise overlay: same as rest of site (fractalNoise, 3% opacity, mix-blend-overlay)</li>
</ul>
<hr>
<h2>Typography Summary</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size</th>
<th>Color</th>
<th>Case</th>
</tr>
</thead>
<tbody><tr>
<td>Node title</td>
<td>Syne</td>
<td>700</td>
<td>13px</td>
<td>#F5F0EB</td>
<td>Sentence</td>
</tr>
<tr>
<td>Node status badge</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>8px</td>
<td>Status color</td>
<td>UPPER</td>
</tr>
<tr>
<td>Panel title</td>
<td>Syne</td>
<td>700</td>
<td>28px</td>
<td>#F5F0EB</td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel description</td>
<td>Space Grotesk</td>
<td>400</td>
<td>15px</td>
<td>#A8A29E</td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel milestone</td>
<td>Space Grotesk</td>
<td>400</td>
<td>14px</td>
<td>#F5F0EB / #78716C</td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel meta labels</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>9px</td>
<td>#78716C</td>
<td>UPPER</td>
</tr>
<tr>
<td>Panel meta values</td>
<td>JetBrains Mono</td>
<td>400</td>
<td>11px</td>
<td>#A8A29E</td>
<td>Sentence</td>
</tr>
<tr>
<td>Filter chips</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>9px</td>
<td>Varies</td>
<td>UPPER</td>
</tr>
<tr>
<td>Progress %</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>12px</td>
<td>Category color</td>
<td>--</td>
</tr>
</tbody></table>
<hr>
<h2>The Feel</h2>
<p>This page should make Patrik want to add ideas to it. It should feel like a thinking tool that&#39;s also a piece of art. The dark background, the warm glowing nodes, the firing animations, the organic clustering: it&#39;s not a spreadsheet with circles on it. It&#39;s a living map of where his creative energy is going.</p>
<p>When an idea is active, you can feel it. When something is parked, it fades into the background naturally. When two ideas are deeply connected, they&#39;re visually close and linked with glowing lines. When Patrik looks at this page, he should immediately see what&#39;s alive and what&#39;s dormant, without reading a single word.</p>
<p><strong>The benchmark:</strong> If it looks like it could be a screensaver, it&#39;s too abstract. If it looks like a project management tool, it&#39;s too boring. The sweet spot is a data visualization that happens to be beautiful.</p>
`,h={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:d,updated:null,summary:a,tags:l,content:r};export{o as agent,n as category,r as content,i as date,d as dateFormatted,h as default,e as slug,a as summary,l as tags,t as title,s as updated};
