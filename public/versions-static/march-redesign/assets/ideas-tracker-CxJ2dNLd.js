const e="Ideas Tracker (Brain Map)",t="ideas-tracker",o="Design Specs",n="Steffen",d="2026-03-11",i="Mar 11",c=null,l="Force-directed graph visualization for idea management.",r=[],s=`<h1>Ideas Tracker (Brain Map): Design Spec</h1>
<blockquote>
<p>Steffen | 2026-03-11
For Bobby. Based on Elon&#39;s brief + AOM Brand Guidelines v4.
Route: <code>aheadofmarket.com/ideas</code> (or <code>/brain</code>)</p>
</blockquote>
<hr>
<h2>Visual Mood</h2>
<p>A city at night from above. Warm clusters of light connected by thin glowing lines against deep darkness. This is a thinking tool that doubles as a piece of art. Not a project management tool with circles on it. Not a screensaver with no utility. The sweet spot: a data visualization that happens to be beautiful. When Patrik looks at this, he should immediately feel what&#39;s alive, what&#39;s dormant, and where his creative energy is concentrated, without reading a single word.</p>
<hr>
<h2>Global Rules</h2>
<ul>
<li><strong>Fonts:</strong> Syne (node titles, panel titles, 700 weight), Space Grotesk (panel body/milestones/notes, 400-500), JetBrains Mono (badges, meta labels, filter chips, 400-700)</li>
<li><strong>Canvas background:</strong> <code>#0C0C0C</code> (Night, slightly warmer than pure black)</li>
<li><strong>Entire page is dark.</strong> No light sections. No cream. The darkness is the canvas.</li>
<li><strong>Grid texture:</strong> Subtle dot grid overlay, <code>5%</code> opacity, <code>40px</code> spacing. Color: <code>rgba(255,255,255,0.03)</code>.</li>
<li><strong>Noise overlay:</strong> SVG <code>feTurbulence</code> fractalNoise, <code>opacity: 0.03</code>, <code>mix-blend-mode: overlay</code>. Same as rest of the site.</li>
<li><strong>All animations must be GPU-accelerated</strong> (transform, opacity only). No layout thrashing on the canvas.</li>
<li><strong>pointer-events: none</strong> on all overlays and textures.</li>
</ul>
<hr>
<h2>Color System</h2>
<h3>Canvas Backgrounds</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Canvas BG</td>
<td><code>#0C0C0C</code></td>
<td>Primary background, the &quot;night sky&quot;</td>
</tr>
<tr>
<td>Detail panel BG</td>
<td><code>#141412</code> (Charcoal)</td>
<td>Side panel background</td>
</tr>
<tr>
<td>Filter bar BG</td>
<td><code>transparent</code> + <code>backdrop-filter: blur(12px)</code></td>
<td>Top filter strip</td>
</tr>
<tr>
<td>Filter bar fallback</td>
<td><code>rgba(10,10,8,0.85)</code></td>
<td>For browsers without backdrop-blur</td>
</tr>
</tbody></table>
<h3>Category Colors (Node Glow)</h3>
<table>
<thead>
<tr>
<th>Category</th>
<th>Node Fill</th>
<th>Glow Color</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>product</td>
<td><code>#2D1509</code></td>
<td>Orange</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>revenue</td>
<td><code>#2D2209</code></td>
<td>Gold</td>
<td><code>#D4A843</code></td>
</tr>
<tr>
<td>system</td>
<td><code>#1A2617</code></td>
<td>Sage</td>
<td><code>#7C9A72</code></td>
</tr>
<tr>
<td>content</td>
<td><code>#1F1D1A</code></td>
<td>Warm White</td>
<td><code>#F5F0EB</code></td>
</tr>
<tr>
<td>side-project</td>
<td><code>#1A1918</code></td>
<td>Muted Stone</td>
<td><code>#78716C</code></td>
</tr>
</tbody></table>
<h3>Status Colors (Badges, Indicators)</h3>
<table>
<thead>
<tr>
<th>Status</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>seed</td>
<td><code>#78716C</code> (Stone)</td>
<td>Low-energy, quiet ideas</td>
</tr>
<tr>
<td>growing</td>
<td><code>#7C9A72</code> (Sage)</td>
<td>Building momentum</td>
</tr>
<tr>
<td>active</td>
<td><code>#E85D26</code> (Orange)</td>
<td>Hot, firing, alive</td>
</tr>
<tr>
<td>shipped</td>
<td><code>#D4A843</code> (Gold)</td>
<td>Complete, stable</td>
</tr>
<tr>
<td>parked</td>
<td><code>#44403C</code> (Muted)</td>
<td>Intentionally dormant</td>
</tr>
</tbody></table>
<h3>Connection Lines</h3>
<table>
<thead>
<tr>
<th>Type</th>
<th>Color (Default)</th>
<th>Color (Hover/Active)</th>
</tr>
</thead>
<tbody><tr>
<td>feeds</td>
<td><code>#292524</code> (Warm Edge)</td>
<td>Category glow color of source node</td>
</tr>
<tr>
<td>related</td>
<td><code>#292524</code></td>
<td>Category glow color, 60% opacity</td>
</tr>
<tr>
<td>depends</td>
<td><code>#292524</code></td>
<td>Category glow color</td>
</tr>
<tr>
<td>competes</td>
<td><code>#44403C</code> base + <code>rgba(255,79,0,0.20)</code> tint</td>
<td><code>#E85D26</code> at 40%</td>
</tr>
</tbody></table>
<h3>Text on Dark</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>Primary text (titles, bright labels)</td>
<td><code>#F5F0EB</code></td>
</tr>
<tr>
<td>Secondary text (descriptions, muted)</td>
<td><code>#A8A29E</code></td>
</tr>
<tr>
<td>Tertiary text (meta, timestamps)</td>
<td><code>#78716C</code></td>
</tr>
<tr>
<td>Panel border</td>
<td><code>#292524</code></td>
</tr>
</tbody></table>
<hr>
<h2>Typography Scale</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size</th>
<th>Line Height</th>
<th>Tracking</th>
<th>Color</th>
<th>Case</th>
</tr>
</thead>
<tbody><tr>
<td>Node title</td>
<td>Syne</td>
<td>700</td>
<td>13px</td>
<td>1.2</td>
<td>0</td>
<td><code>#F5F0EB</code></td>
<td>Sentence</td>
</tr>
<tr>
<td>Node status badge</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>8px</td>
<td>1.0</td>
<td>0.20em</td>
<td>Status color</td>
<td>UPPER</td>
</tr>
<tr>
<td>Panel title</td>
<td>Syne</td>
<td>700</td>
<td>28px</td>
<td>1.1</td>
<td>-0.01em</td>
<td><code>#F5F0EB</code></td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel description</td>
<td>Space Grotesk</td>
<td>400</td>
<td>15px</td>
<td>1.5</td>
<td>0</td>
<td><code>#A8A29E</code></td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel milestone text</td>
<td>Space Grotesk</td>
<td>400</td>
<td>14px</td>
<td>1.4</td>
<td>0</td>
<td><code>#F5F0EB</code> (pending) / <code>#78716C</code> (done)</td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel section header</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>9px</td>
<td>1.4</td>
<td>0.15em</td>
<td><code>#78716C</code></td>
<td>UPPER</td>
</tr>
<tr>
<td>Panel meta label</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>9px</td>
<td>1.4</td>
<td>0.15em</td>
<td><code>#78716C</code></td>
<td>UPPER</td>
</tr>
<tr>
<td>Panel meta value</td>
<td>JetBrains Mono</td>
<td>400</td>
<td>11px</td>
<td>1.4</td>
<td>0</td>
<td><code>#A8A29E</code></td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel notes text</td>
<td>Space Grotesk</td>
<td>400</td>
<td>14px</td>
<td>1.5</td>
<td>0</td>
<td><code>#A8A29E</code></td>
<td>Sentence</td>
</tr>
<tr>
<td>Panel status badge</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>11px</td>
<td>1.0</td>
<td>0.15em</td>
<td>Status color</td>
<td>UPPER</td>
</tr>
<tr>
<td>Panel category label</td>
<td>JetBrains Mono</td>
<td>400</td>
<td>9px</td>
<td>1.4</td>
<td>0.12em</td>
<td><code>#78716C</code></td>
<td>UPPER</td>
</tr>
<tr>
<td>Filter chip</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>9px</td>
<td>1.0</td>
<td>0.12em</td>
<td>varies</td>
<td>UPPER</td>
</tr>
<tr>
<td>Progress percentage</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>12px</td>
<td>1.0</td>
<td>0</td>
<td>Category glow color</td>
<td>--</td>
</tr>
<tr>
<td>Connected idea name</td>
<td>Space Grotesk</td>
<td>500</td>
<td>13px</td>
<td>1.3</td>
<td>0</td>
<td><code>#F5F0EB</code></td>
<td>Sentence</td>
</tr>
<tr>
<td>Connection type label</td>
<td>JetBrains Mono</td>
<td>400</td>
<td>8px</td>
<td>1.0</td>
<td>0.12em</td>
<td><code>#78716C</code></td>
<td>UPPER</td>
</tr>
</tbody></table>
<hr>
<h2>Node Design</h2>
<h3>Shape and Size</h3>
<ul>
<li><strong>Shape:</strong> Circle. No border. Glow does the visual work.</li>
<li><strong>Base diameter:</strong> <code>48px</code></li>
<li><strong>Size scales with progress:</strong><ul>
<li>0% progress: <code>36px</code></li>
<li>25%: <code>42px</code></li>
<li>50%: <code>48px</code></li>
<li>75%: <code>56px</code></li>
<li>100%: <code>64px</code></li>
</ul>
</li>
<li><strong>Formula:</strong> <code>36 + (progress * 0.28)</code> rounded to nearest px</li>
</ul>
<h3>Glow Effect</h3>
<ul>
<li><strong>Technique:</strong> CSS <code>box-shadow</code> with multiple layers for soft radial glow</li>
<li><strong>Structure (using &quot;product&quot; orange as example at 80% intensity):</strong><pre><code>box-shadow:
  0 0 8px rgba(255,79,0, 0.30),
  0 0 24px rgba(255,79,0, 0.15),
  0 0 48px rgba(255,79,0, 0.06);
</code></pre>
</li>
<li><strong>Glow intensity scales with status</strong> (see below). Multiply all opacity values by the intensity multiplier.</li>
<li><strong>Glow radius</strong> also scales:<ul>
<li>20% intensity = inner <code>4px</code>, mid <code>12px</code>, outer <code>24px</code></li>
<li>40% intensity = inner <code>6px</code>, mid <code>18px</code>, outer <code>36px</code></li>
<li>80% intensity = inner <code>8px</code>, mid <code>24px</code>, outer <code>48px</code></li>
</ul>
</li>
</ul>
<h3>Status Visual Effects</h3>
<table>
<thead>
<tr>
<th>Status</th>
<th>Glow Intensity</th>
<th>Opacity</th>
<th>Animation</th>
<th>Extra</th>
</tr>
</thead>
<tbody><tr>
<td>seed</td>
<td>20%</td>
<td>0.70</td>
<td>Slow pulse: glow opacity oscillates 0.6x to 1.0x over <code>4000ms</code>, <code>ease-in-out</code>, infinite</td>
<td>--</td>
</tr>
<tr>
<td>growing</td>
<td>40%</td>
<td>0.85</td>
<td>Medium pulse: oscillates 0.7x to 1.0x over <code>3000ms</code>, <code>ease-in-out</code>, infinite</td>
<td>--</td>
</tr>
<tr>
<td>active</td>
<td>80%</td>
<td>1.00</td>
<td>&quot;Firing&quot; burst (see below) + subtle base pulse <code>2500ms</code></td>
<td>--</td>
</tr>
<tr>
<td>shipped</td>
<td>60%</td>
<td>1.00</td>
<td>No pulse. Stable glow.</td>
<td><code>2px</code> ring, <code>#D4A843</code>, offset <code>4px</code> from node edge</td>
</tr>
<tr>
<td>parked</td>
<td>10%</td>
<td>0.50</td>
<td>No animation</td>
<td>--</td>
</tr>
</tbody></table>
<h3>&quot;Firing&quot; Animation (Active Nodes Only)</h3>
<p>A radial burst that expands outward from the node like a ripple in water.</p>
<ul>
<li><strong>Trigger:</strong> Every <code>5000ms</code> to <code>10000ms</code> (randomized per node to prevent sync). Stagger initial delay randomly per node: <code>Math.random() * 5000</code>.</li>
<li><strong>Animation:</strong><ul>
<li>A separate element (pseudo-element or span) behind the node</li>
<li>Start: same size as node, opacity <code>0.4</code>, glow color at <code>30%</code> opacity</li>
<li>End: <code>2x</code> the normal glow radius, opacity <code>0</code></li>
<li>Duration: <code>800ms</code></li>
<li>Easing: <code>ease-out</code></li>
<li>Scale: <code>1.0</code> to <code>2.5</code></li>
</ul>
</li>
<li><strong>Implementation:</strong> CSS <code>@keyframes</code> with <code>transform: scale()</code> and <code>opacity</code>. GPU-accelerated.</li>
</ul>
<h3>Shipped Ring</h3>
<ul>
<li><strong>Ring:</strong> <code>2px solid #D4A843</code> (Gold)</li>
<li><strong>Offset:</strong> <code>4px</code> outside the node circle (use a separate element or outline-offset)</li>
<li><strong>No animation.</strong> Stable. Earned.</li>
</ul>
<h3>Node Label (Title)</h3>
<ul>
<li><strong>Font:</strong> Syne 700, 13px, <code>#F5F0EB</code></li>
<li><strong>Position:</strong> Centered below node circle, <code>8px</code> gap</li>
<li><strong>Max-width:</strong> <code>100px</code>, <code>text-overflow: ellipsis</code> if needed</li>
<li><strong>Text-align:</strong> center</li>
<li><strong>Visibility rules:</strong><ul>
<li>Desktop: Always visible for <code>active</code> and <code>shipped</code>. Hover-only for others.</li>
<li>Tablet: Visible for <code>active</code> only. Hover for others.</li>
<li>Mobile: Hidden by default. Shown on tap (brief display before detail opens).</li>
</ul>
</li>
<li><strong>Label show/hide transition:</strong> <code>opacity 150ms ease</code></li>
</ul>
<h3>Node Status Badge</h3>
<ul>
<li><strong>Font:</strong> JetBrains Mono 700, 8px, uppercase, <code>tracking: 0.20em</code></li>
<li><strong>Position:</strong> Centered above node circle, <code>6px</code> gap</li>
<li><strong>Color:</strong> Matches status color table</li>
<li><strong>Background:</strong> <code>rgba(0,0,0,0.6)</code>, padding <code>2px 6px</code>, border-radius <code>2px</code></li>
<li><strong>Visibility:</strong> Same rules as node label</li>
</ul>
<h3>Overlap Prevention</h3>
<ul>
<li>If two node labels would overlap (nodes closer than <code>120px</code>), hide the label of the lower-priority node (parked &lt; seed &lt; growing &lt; active &lt; shipped).</li>
<li>Status badges follow the same rule.</li>
</ul>
<hr>
<h2>Connection Lines</h2>
<h3>Base Styling</h3>
<table>
<thead>
<tr>
<th>Type</th>
<th>Style</th>
<th>Thickness</th>
<th>Dash</th>
<th>Arrowhead</th>
</tr>
</thead>
<tbody><tr>
<td>feeds</td>
<td>Solid</td>
<td><code>1.5px</code></td>
<td>None</td>
<td>Yes, <code>8px</code> triangle at target end</td>
</tr>
<tr>
<td>related</td>
<td>Solid</td>
<td><code>1px</code></td>
<td>None</td>
<td>No</td>
</tr>
<tr>
<td>depends</td>
<td>Dashed</td>
<td><code>1.5px</code></td>
<td><code>4px</code> dash, <code>4px</code> gap</td>
<td>Yes, <code>8px</code> triangle</td>
</tr>
<tr>
<td>competes</td>
<td>Dotted</td>
<td><code>1px</code></td>
<td><code>2px</code> dot, <code>3px</code> gap</td>
<td>No</td>
</tr>
</tbody></table>
<h3>Default Color</h3>
<ul>
<li>All lines: <code>#292524</code> (Warm Edge) at <code>100%</code> opacity</li>
<li>Arrowheads: same color as the line</li>
</ul>
<h3>Hover Behavior (Critical Interaction)</h3>
<p>When user hovers a node:</p>
<ol>
<li><strong>Hovered node:</strong> Full brightness, no change</li>
<li><strong>Connected nodes:</strong> Brighten to <code>90%</code> opacity (from whatever their status opacity is)</li>
<li><strong>Connection lines to/from hovered node:</strong> Glow to the category color of the hovered node. Transition <code>300ms ease</code>.</li>
<li><strong>Everything else:</strong> Dim to <code>30%</code> opacity (nodes, labels, lines). Transition <code>300ms ease</code>.</li>
<li><strong>On mouse leave:</strong> Everything returns to default. Transition <code>400ms ease</code>.</li>
</ol>
<h3>Line Animations</h3>
<p><strong><code>feeds</code> lines (particle flow):</strong></p>
<ul>
<li>Tiny dots (<code>2px</code> circles, category glow color, <code>60%</code> opacity) travel along the line from source to target</li>
<li>1-2 particles visible at any time per line</li>
<li>Speed: <code>3000ms</code> to traverse the full line length</li>
<li>Implemented via SVG <code>animateMotion</code> or CSS animation along a path</li>
<li>Only visible when the line is at full brightness (hovered or filtered in)</li>
</ul>
<p><strong><code>depends</code> lines (scrolling dashes):</strong></p>
<ul>
<li>The dash pattern animates: <code>stroke-dashoffset</code> shifts continuously</li>
<li>Speed: <code>4000ms</code> per full cycle</li>
<li>Direction: toward the dependent node</li>
<li>Always animating (even at default opacity), giving a subtle sense of &quot;waiting&quot;</li>
</ul>
<p><strong><code>related</code> lines:</strong> Static. No animation.</p>
<p><strong><code>competes</code> lines:</strong> Static. The dotted pattern and red tint are enough visual distinction.</p>
<hr>
<h2>Detail Panel</h2>
<h3>Desktop (&gt;= 1024px)</h3>
<ul>
<li><strong>Position:</strong> Right side of viewport</li>
<li><strong>Width:</strong> <code>400px</code></li>
<li><strong>Height:</strong> Full viewport height</li>
<li><strong>Behavior:</strong> Pushes canvas left (canvas width = <code>calc(100vw - 400px)</code>). Not an overlay.</li>
<li><strong>Open animation:</strong> <code>translateX(400px)</code> to <code>translateX(0)</code>, <code>250ms ease-out</code>. Canvas width animates simultaneously.</li>
<li><strong>Close:</strong> Reverse. Click outside panel, press Escape, or click close button.</li>
</ul>
<h3>Tablet (768-1023px)</h3>
<ul>
<li><strong>Position:</strong> Bottom of viewport</li>
<li><strong>Height:</strong> <code>50vh</code></li>
<li><strong>Width:</strong> <code>100%</code></li>
<li><strong>Behavior:</strong> Slides up from bottom. Canvas remains full-width but top half only.</li>
<li><strong>Open animation:</strong> <code>translateY(100%)</code> to <code>translateY(0)</code>, <code>250ms ease-out</code></li>
<li><strong>Handle:</strong> <code>40px</code> wide, <code>4px</code> tall, <code>#292524</code>, centered at top of panel, <code>12px</code> from top edge. Drag to resize (optional, nice-to-have).</li>
</ul>
<h3>Mobile (&lt; 768px)</h3>
<ul>
<li><strong>Full screen takeover.</strong> The panel replaces the canvas view entirely.</li>
<li><strong>Close:</strong> Back button (top-left, Ghost style) or swipe right.</li>
<li><strong>Animation:</strong> Slides in from right, <code>250ms ease-out</code></li>
</ul>
<h3>Panel Styling</h3>
<ul>
<li><strong>Background:</strong> <code>#141412</code> (Charcoal)</li>
<li><strong>Border-left (desktop):</strong> <code>1px solid #292524</code></li>
<li><strong>Border-top (tablet):</strong> <code>1px solid #292524</code></li>
<li><strong>Glow bleed:</strong> The selected node&#39;s glow color bleeds into the left edge of the panel. Implementation: a <code>4px</code> wide gradient strip on the left border, from category glow color at <code>30%</code> opacity to transparent, height <code>120px</code>, positioned at the panel header level.</li>
<li><strong>Padding:</strong> <code>32px</code> desktop, <code>24px</code> tablet/mobile</li>
<li><strong>Overflow-y:</strong> <code>auto</code> (panel content can scroll if longer than viewport)</li>
<li><strong>Scrollbar:</strong> Custom styled. Track <code>#141412</code>, thumb <code>#292524</code>, thumb hover <code>#44403C</code>. Width <code>4px</code>.</li>
</ul>
<h3>Panel Layout (Top to Bottom)</h3>
<p><strong>1. Header Area</strong></p>
<ul>
<li><strong>Close button:</strong> Top-right. <code>24px</code> <code>X</code> icon (Lucide <code>X</code>), <code>#78716C</code>, hover <code>#F5F0EB</code>. <code>padding: 8px</code>.</li>
<li><strong>Status badge:</strong> Top-left. JetBrains Mono 700, 11px, uppercase, <code>tracking: 0.15em</code>. Color = status color. Background: status color at <code>15%</code> opacity. Padding <code>4px 10px</code>, border-radius <code>2px</code>.</li>
<li><strong>Category label:</strong> Right of status badge or below it. JetBrains Mono 400, 9px, uppercase, <code>#78716C</code>.</li>
<li><strong>Title:</strong> Below badges. Syne 700, 28px, <code>#F5F0EB</code>. <code>margin-top: 16px</code>.</li>
<li><strong>Description:</strong> Below title. Space Grotesk 400, 15px, <code>#A8A29E</code>. <code>margin-top: 8px</code>. Max 3 lines, <code>text-overflow: ellipsis</code> with &quot;show more&quot; link if truncated.</li>
<li><strong>Spacing below header:</strong> <code>24px</code></li>
</ul>
<p><strong>2. Progress Bar</strong></p>
<ul>
<li><strong>Width:</strong> 100% of panel content area</li>
<li><strong>Height:</strong> <code>6px</code></li>
<li><strong>Border-radius:</strong> <code>3px</code></li>
<li><strong>Track:</strong> <code>#1A1A17</code></li>
<li><strong>Fill:</strong> Category glow color</li>
<li><strong>Percentage label:</strong> Right-aligned below bar. JetBrains Mono 700, 12px, category glow color. <code>margin-top: 4px</code>.</li>
<li><strong>Spacing below:</strong> <code>24px</code></li>
<li><strong>Fill transition:</strong> <code>400ms ease-out</code> when panel opens</li>
</ul>
<p><strong>3. Milestones</strong></p>
<ul>
<li><strong>Section header:</strong> &quot;MILESTONES&quot;, JetBrains Mono 700, 9px, uppercase, <code>tracking: 0.15em</code>, <code>#78716C</code>. <code>margin-bottom: 12px</code>.</li>
<li><strong>Each row:</strong> <code>32px</code> height, flex row, <code>align-items: center</code><ul>
<li><strong>Checkbox circle:</strong> <code>18px</code> diameter<ul>
<li>Pending: <code>2px solid #292524</code>, hollow</li>
<li>Done: filled with category glow color, checkmark icon <code>10px</code> in <code>#0C0C0C</code></li>
</ul>
</li>
<li><strong>Text:</strong> <code>margin-left: 12px</code><ul>
<li>Pending: Space Grotesk 400, 14px, <code>#F5F0EB</code></li>
<li>Done: Space Grotesk 400, 14px, <code>#78716C</code>, <code>text-decoration: line-through</code></li>
</ul>
</li>
</ul>
</li>
<li><strong>Gap between rows:</strong> <code>4px</code></li>
<li><strong>Spacing below section:</strong> <code>24px</code></li>
<li><strong>Divider:</strong> <code>1px solid #292524</code> below milestones section</li>
</ul>
<p><strong>4. Connections</strong></p>
<ul>
<li><strong>Section header:</strong> &quot;CONNECTED TO&quot;, same styling as milestones header. <code>margin-top: 24px</code>, <code>margin-bottom: 12px</code>.</li>
<li><strong>Each row:</strong> Flex row, <code>align-items: center</code>, <code>height: 36px</code><ul>
<li><strong>Small node dot:</strong> <code>8px</code> circle, filled with the connected node&#39;s category glow color</li>
<li><strong>Idea name:</strong> <code>margin-left: 10px</code>. Space Grotesk 500, 13px, <code>#F5F0EB</code>. Cursor pointer, hover underline.</li>
<li><strong>Connection type:</strong> Right-aligned. JetBrains Mono 400, 8px, uppercase, <code>tracking: 0.12em</code>, <code>#78716C</code>.</li>
</ul>
</li>
<li><strong>Click behavior:</strong> Clicking a connected idea name closes the panel, pans the canvas to that node, opens its panel. Smooth pan: <code>500ms ease-in-out</code>.</li>
<li><strong>Gap between rows:</strong> <code>2px</code></li>
<li><strong>Spacing below:</strong> <code>24px</code></li>
<li><strong>Divider:</strong> <code>1px solid #292524</code></li>
</ul>
<p><strong>5. Meta</strong></p>
<ul>
<li><strong>Layout:</strong> 2-column grid, <code>gap: 16px row, 32px column</code>. <code>margin-top: 24px</code>.</li>
<li><strong>Each field:</strong><ul>
<li>Label: JetBrains Mono 700, 9px, uppercase, <code>tracking: 0.15em</code>, <code>#78716C</code></li>
<li>Value: JetBrains Mono 400, 11px, <code>#A8A29E</code>. <code>margin-top: 4px</code>.</li>
</ul>
</li>
<li><strong>Fields:</strong> Owner/Agent, Created (date), Last Activity (date + relative like &quot;3 days ago&quot;)</li>
<li><strong>Spacing below:</strong> <code>24px</code></li>
<li><strong>Divider:</strong> <code>1px solid #292524</code></li>
</ul>
<p><strong>6. Notes</strong></p>
<ul>
<li><strong>Section header:</strong> &quot;NOTES&quot;, same styling. <code>margin-top: 24px</code>, <code>margin-bottom: 12px</code>.</li>
<li><strong>Text area:</strong> Full-width. Background <code>#1A1A17</code>, border <code>1px solid #292524</code>, border-radius <code>2px</code>. Padding <code>12px</code>. Space Grotesk 400, 14px, <code>#A8A29E</code>. Min-height <code>80px</code>, auto-grow.</li>
<li><strong>Focus border:</strong> <code>1px solid #44403C</code></li>
<li><strong>Placeholder:</strong> &quot;Add notes...&quot;, <code>#44403C</code></li>
</ul>
<hr>
<h2>Filter Bar</h2>
<h3>Position and Sizing</h3>
<ul>
<li><strong>Position:</strong> Fixed at top of canvas viewport. <code>z-index: 50</code>.</li>
<li><strong>Height:</strong> <code>56px</code> desktop, <code>48px</code> mobile</li>
<li><strong>Padding:</strong> <code>0 24px</code></li>
<li><strong>Background:</strong> <code>transparent</code> with <code>backdrop-filter: blur(12px)</code> and <code>rgba(10,10,8,0.85)</code> fallback</li>
<li><strong>Border-bottom:</strong> <code>1px solid rgba(255,255,255,0.05)</code></li>
</ul>
<h3>Layout</h3>
<ul>
<li><strong>Desktop:</strong> Flex row. Status chips first (gap <code>8px</code>), then a <code>1px</code> vertical divider (<code>#292524</code>, height <code>24px</code>, margin <code>0 16px</code>), then category chips (gap <code>8px</code>).</li>
<li><strong>Tablet:</strong> Same, horizontal scroll if chips overflow. <code>overflow-x: auto</code>, hide scrollbar.</li>
<li><strong>Mobile:</strong> Single &quot;FILTER&quot; button (Ghost style, JetBrains Mono 700, 9px). Tapping opens a bottom sheet with all chips in a grid layout.</li>
</ul>
<h3>Chip Styling</h3>
<p><strong>Inactive (ghost):</strong></p>
<ul>
<li>Border: <code>1px solid #292524</code></li>
<li>Background: transparent</li>
<li>Text: <code>#78716C</code>, JetBrains Mono 700, 9px, uppercase, <code>tracking: 0.12em</code></li>
<li>Padding: <code>6px 14px</code></li>
<li>Border-radius: <code>2px</code></li>
<li>Cursor: pointer</li>
</ul>
<p><strong>Active (filled):</strong></p>
<ul>
<li>Border: <code>1px solid [chip color]</code></li>
<li>Background: chip color at <code>20%</code> opacity</li>
<li>Text: chip color at full brightness</li>
<li>For status chips: color = status color</li>
<li>For category chips: color = category glow color</li>
</ul>
<p><strong>Hover (inactive):</strong></p>
<ul>
<li>Border: <code>1px solid #44403C</code></li>
<li>Text: <code>#A8A29E</code></li>
<li>Transition: <code>150ms ease</code></li>
</ul>
<h3>Filter Behavior</h3>
<ul>
<li><strong>Filtering dims, never removes.</strong> Non-matching nodes go to <code>15%</code> opacity. Connection lines to dimmed nodes also dim to <code>15%</code>. Spatial layout is never altered.</li>
<li><strong>Multiple filters AND within a group, OR between groups.</strong> Example: selecting &quot;active&quot; + &quot;product&quot; shows nodes that are active AND product. Selecting &quot;active&quot; + &quot;growing&quot; shows nodes that are active OR growing.</li>
<li><strong>Transition:</strong> Dimming/brightening nodes: <code>400ms ease</code>. Smooth, not jarring.</li>
<li><strong>Clear all:</strong> Small &quot;CLEAR&quot; text link, JetBrains Mono 400, 8px, <code>#78716C</code>, right end of filter bar. Only visible when filters are active.</li>
</ul>
<hr>
<h2>Canvas Interaction</h2>
<h3>Desktop</h3>
<ul>
<li><strong>Pan:</strong> Click and drag on empty canvas area. Cursor: grab (default), grabbing (active).</li>
<li><strong>Zoom:</strong> Scroll wheel. Min zoom: <code>0.3x</code>. Max zoom: <code>3x</code>. Zoom centers on cursor position.</li>
<li><strong>Node click:</strong> Opens detail panel.</li>
<li><strong>Node hover:</strong> Triggers connection highlight (see Hover Behavior above).</li>
<li><strong>Double-click empty space:</strong> Reset zoom and pan to fit all nodes. <code>500ms ease-in-out</code>.</li>
</ul>
<h3>Tablet</h3>
<ul>
<li><strong>Pan:</strong> Single-finger drag on empty space.</li>
<li><strong>Zoom:</strong> Pinch gesture. Same min/max as desktop.</li>
<li><strong>Node tap:</strong> Opens detail panel (bottom sheet).</li>
<li><strong>Node long-press:</strong> Shows node label + badge for <code>2000ms</code>.</li>
</ul>
<h3>Mobile</h3>
<ul>
<li><strong>Pan:</strong> Single-finger drag.</li>
<li><strong>Zoom:</strong> Pinch gesture. Same limits.</li>
<li><strong>Node tap:</strong> First tap shows label. Second tap (within <code>1500ms</code>) opens full-screen detail.</li>
<li><strong>Minimum touch target:</strong> <code>44x44px</code> per node. If node is smaller than <code>44px</code> diameter, the tap target extends invisibly to <code>44px</code>.</li>
</ul>
<hr>
<h2>Canvas Background Layers</h2>
<p>Bottom to top:</p>
<ol>
<li><strong>Solid fill:</strong> <code>#0C0C0C</code></li>
<li><strong>Dot grid:</strong> Radial gradient dots, <code>rgba(255,255,255,0.03)</code>, <code>1px</code> radius, spacing <code>40px x 40px</code>. <code>pointer-events: none</code>.</li>
<li><strong>Noise overlay:</strong> SVG feTurbulence, <code>opacity: 0.03</code>, <code>mix-blend-mode: overlay</code>. <code>pointer-events: none</code>.</li>
<li><strong>Connection lines layer</strong> (SVG or Canvas)</li>
<li><strong>Nodes layer</strong></li>
<li><strong>Labels layer</strong></li>
</ol>
<hr>
<h2>Mobile Bottom Sheet (Filter)</h2>
<ul>
<li><strong>Background:</strong> <code>#141412</code></li>
<li><strong>Border-top:</strong> <code>1px solid #292524</code></li>
<li><strong>Border-radius:</strong> <code>12px 12px 0 0</code> (top corners rounded)</li>
<li><strong>Handle:</strong> <code>40px</code> wide, <code>4px</code> tall, <code>#292524</code>, centered, <code>12px</code> from top</li>
<li><strong>Height:</strong> auto, max <code>60vh</code></li>
<li><strong>Layout:</strong> Chips in a flex-wrap grid, <code>gap: 10px</code>, padding <code>24px</code></li>
<li><strong>Section labels:</strong> &quot;STATUS&quot; and &quot;CATEGORY&quot; headers above each group. JetBrains Mono 700, 9px, <code>#78716C</code>, <code>margin-bottom: 12px</code>.</li>
<li><strong>Open animation:</strong> <code>translateY(100%)</code> to <code>translateY(0)</code>, <code>250ms ease-out</code></li>
<li><strong>Close:</strong> Tap outside, swipe down, or tap the &quot;FILTER&quot; button again</li>
</ul>
<hr>
<h2>Responsive Summary</h2>
<table>
<thead>
<tr>
<th>Breakpoint</th>
<th>Canvas</th>
<th>Detail Panel</th>
<th>Filter Bar</th>
<th>Labels</th>
<th>Touch Target</th>
</tr>
</thead>
<tbody><tr>
<td>&gt;= 1024px (Desktop)</td>
<td>Full viewport</td>
<td>Right sidebar, 400px, push</td>
<td>Horizontal chips</td>
<td>Active + shipped visible</td>
<td>n/a (mouse)</td>
</tr>
<tr>
<td>768-1023px (Tablet)</td>
<td>Full viewport</td>
<td>Bottom sheet, 50vh</td>
<td>Horizontal scroll</td>
<td>Active only</td>
<td>44px min</td>
</tr>
<tr>
<td>&lt; 768px (Mobile)</td>
<td>Full viewport</td>
<td>Full-screen takeover</td>
<td>Collapsed to button</td>
<td>Hidden (tap to show)</td>
<td>44px min</td>
</tr>
</tbody></table>
<hr>
<h2>Performance Notes</h2>
<ul>
<li><strong>Rendering:</strong> Use HTML Canvas or SVG for the graph. Canvas preferred for 50+ nodes (better perf). SVG acceptable for &lt; 30 nodes (easier styling).</li>
<li><strong>Glow effects:</strong> CSS <code>box-shadow</code> for nodes (GPU-composited). Do NOT use CSS <code>filter: blur()</code> on many elements simultaneously.</li>
<li><strong>Animations:</strong> All pulse/firing animations use <code>@keyframes</code> with <code>transform</code> and <code>opacity</code> only. No <code>box-shadow</code> animation (repaints). Pre-compute glow layers and animate opacity.</li>
<li><strong>Particle flow on lines:</strong> Limit to visible/hovered connections only. Do not animate offscreen lines.</li>
<li><strong>Zoom:</strong> Use CSS <code>transform: scale()</code> on the canvas container. Do not re-render nodes on every zoom step.</li>
<li><strong>Lazy label rendering:</strong> Only render labels for nodes within the current viewport bounds + 20% buffer.</li>
<li><strong>Target:</strong> 60fps on 2020 MacBook Air with 100 nodes and 200 connections.</li>
</ul>
<hr>
<h2>Stagnation Modifier</h2>
<p>Ideas with <code>lastActivity</code> older than 7 days that are NOT <code>parked</code> or <code>shipped</code> get a stagnation visual:</p>
<ul>
<li><strong>Glow saturation:</strong> Reduce by 40% (apply CSS <code>filter: saturate(0.6)</code> to the glow layers only, not the node fill)</li>
<li><strong>Pulse speed:</strong> Slow to <code>6000ms</code> regardless of status base speed</li>
<li><strong>Node opacity:</strong> Reduce to <code>0.65</code></li>
<li><strong>Transition in:</strong> When an idea crosses the 7-day threshold, the desaturation applies over <code>2000ms ease</code></li>
<li><strong>Transition out:</strong> When activity is logged, snap back to full saturation over <code>800ms ease</code></li>
</ul>
<p>This is orthogonal to status. An <code>active</code> idea with no commits in 8 days should look noticeably dimmer than one touched today. Patrik sees at a glance where energy is flowing and where it&#39;s stalling.</p>
<hr>
<h2>Add/Edit UI</h2>
<h3>Add Idea Button</h3>
<ul>
<li><strong>Position:</strong> Top-right of canvas, inside the filter bar area. Right of the filter chips.</li>
<li><strong>Desktop:</strong> Ghost button style. Border <code>1px solid #292524</code>, text <code>#78716C</code>, JetBrains Mono 700, 9px, uppercase, <code>tracking: 0.12em</code>. Lucide <code>Plus</code> icon, <code>14px</code>, <code>margin-right: 6px</code>. Padding <code>6px 14px</code>.</li>
<li><strong>Hover:</strong> Border <code>1px solid #E85D26</code>, text <code>#E85D26</code>, background <code>rgba(232,93,38,0.08)</code>. Transition <code>150ms ease</code>.</li>
<li><strong>Mobile:</strong> Icon-only button. <code>36px</code> circle, border <code>1px solid #292524</code>, <code>Plus</code> icon <code>18px</code> centered. Same hover colors.</li>
<li><strong>Click:</strong> Opens the Add/Edit panel (see below).</li>
</ul>
<h3>Add/Edit Panel</h3>
<p>Uses the same panel shell as the Detail Panel (right sidebar desktop, bottom sheet tablet, full-screen mobile). Same background, border, padding, close button, scrollbar.</p>
<p><strong>Panel header:</strong></p>
<ul>
<li>Title: &quot;NEW IDEA&quot; (add mode) or idea title (edit mode). Syne 700, 28px, <code>#F5F0EB</code>.</li>
<li>Below title: <code>margin-top: 24px</code></li>
</ul>
<p><strong>Form fields (top to bottom):</strong></p>
<ol>
<li><p><strong>Title</strong></p>
<ul>
<li>Label: JetBrains Mono 700, 9px, uppercase, <code>tracking: 0.15em</code>, <code>#78716C</code>. &quot;TITLE&quot;</li>
<li>Input: Full-width text input. Background <code>#1A1A17</code>, border <code>1px solid #292524</code>, border-radius <code>2px</code>. Padding <code>12px</code>. Space Grotesk 400, 15px, <code>#F5F0EB</code>. Placeholder <code>#44403C</code>.</li>
<li>Focus: border <code>1px solid #E85D26</code></li>
<li>Gap below: <code>20px</code></li>
</ul>
</li>
<li><p><strong>Description</strong></p>
<ul>
<li>Same label style. &quot;DESCRIPTION&quot;</li>
<li>Text area: Same styling as title input. Min-height <code>80px</code>, auto-grow to <code>160px</code>.</li>
<li>Gap below: <code>20px</code></li>
</ul>
</li>
<li><p><strong>Status</strong></p>
<ul>
<li>Label: &quot;STATUS&quot;</li>
<li>Pill selector: 5 pills in a flex-wrap row, <code>gap: 8px</code></li>
<li>Each pill: JetBrains Mono 700, 9px, uppercase, <code>tracking: 0.12em</code>. Padding <code>6px 14px</code>. Border-radius <code>2px</code>.</li>
<li>Unselected: border <code>1px solid #292524</code>, text <code>#78716C</code>, background transparent</li>
<li>Selected: border <code>1px solid [status color]</code>, text <code>[status color]</code>, background <code>[status color] at 15% opacity</code></li>
<li>Gap below: <code>20px</code></li>
</ul>
</li>
<li><p><strong>Category</strong></p>
<ul>
<li>Same pill selector pattern. 5 pills for the 5 categories.</li>
<li>Selected state uses category glow color instead of status color.</li>
<li>Gap below: <code>20px</code></li>
</ul>
</li>
<li><p><strong>Owner</strong></p>
<ul>
<li>Text input, same styling as title. Placeholder: &quot;Agent or person name&quot;</li>
<li>Gap below: <code>20px</code></li>
</ul>
</li>
<li><p><strong>Notes</strong></p>
<ul>
<li>Text area, same styling as description. Placeholder: &quot;Add notes...&quot;</li>
<li>Gap below: <code>32px</code></li>
</ul>
</li>
</ol>
<p><strong>Save button:</strong></p>
<ul>
<li>Full-width within panel. Background <code>#E85D26</code>. Text <code>#FDF6EC</code>, Space Grotesk 700, 14px, uppercase, <code>tracking: 0.06em</code>. Padding <code>14px 0</code>. Border-radius <code>0</code>.</li>
<li>Hover: background <code>#D14E1C</code>, shadow <code>0 0 16px rgba(232,93,38,0.15)</code></li>
<li>Disabled (no title entered): background <code>#292524</code>, text <code>#44403C</code>, cursor not-allowed</li>
</ul>
<p><strong>Delete button (edit mode only):</strong></p>
<ul>
<li>Below save button, <code>margin-top: 12px</code></li>
<li>Ghost style: text <code>#78716C</code>, Space Grotesk 600, 12px, uppercase</li>
<li>Hover: text <code>#EF4444</code> (error red)</li>
<li>Click: confirmation prompt before deleting</li>
</ul>
<h3>Quick-Connect (Drag to Link)</h3>
<ul>
<li><strong>Trigger:</strong> Hold <code>Shift</code> + click and drag from a node</li>
<li><strong>Drag indicator:</strong> A line extends from the source node to the cursor. Line style: <code>2px dashed #E85D26</code>, with a small <code>8px</code> orange circle at the cursor end.</li>
<li><strong>Valid target:</strong> When the drag line is over another node, that node brightens and grows its glow by 1.2x. The drag line snaps to the target node center.</li>
<li><strong>Release on target:</strong> A small dropdown appears at the midpoint of the new connection:<ul>
<li>Background: <code>#141412</code>, border <code>1px solid #292524</code>, border-radius <code>2px</code>, shadow <code>0 4px 16px rgba(0,0,0,0.3)</code></li>
<li>4 options: &quot;FEEDS&quot;, &quot;RELATED&quot;, &quot;DEPENDS&quot;, &quot;COMPETES&quot;</li>
<li>Each option: JetBrains Mono 700, 9px, uppercase, <code>padding: 8px 16px</code>, hover background <code>rgba(232,93,38,0.1)</code>, hover text <code>#E85D26</code></li>
<li>Click an option: connection is created, dropdown closes, line animates to its final style over <code>300ms</code></li>
</ul>
</li>
<li><strong>Release on empty space:</strong> Line snaps back, nothing happens</li>
<li><strong>Mobile:</strong> No drag-to-connect. Use the detail panel instead. In the &quot;CONNECTED TO&quot; section, add a &quot;+ CONNECT&quot; button that opens a node picker (scrollable list of all other ideas, same styling as the connection rows but with a checkbox).</li>
</ul>
<h3>Edit Mode</h3>
<ul>
<li><strong>Trigger:</strong> Double-click a node (desktop), or tap the &quot;EDIT&quot; button in the detail panel header</li>
<li><strong>Edit button in panel:</strong> Ghost style, positioned right of the close button. JetBrains Mono 700, 9px, uppercase, <code>#78716C</code>. Lucide <code>Pencil</code>, <code>14px</code>. Hover: <code>#F5F0EB</code>.</li>
<li><strong>Behavior:</strong> The detail panel transforms into the Add/Edit panel form, pre-filled with current values. Same fields, same styling. The panel header changes to show the idea title as editable.</li>
<li><strong>Milestones editing:</strong> In edit mode, each milestone row gains:<ul>
<li>A Lucide <code>X</code> button on the right, <code>14px</code>, <code>#44403C</code>, hover <code>#EF4444</code>, to delete the milestone</li>
<li>An &quot;ADD MILESTONE&quot; text button below the list: Space Grotesk 500, 13px, <code>#E85D26</code>. Click adds a new text input row.</li>
<li>New milestone input: same styling as other text inputs, auto-focus on add</li>
</ul>
</li>
</ul>
<hr>
<h2>Summary for Bobby</h2>
<p>One dark page, one living canvas. Glowing nodes on <code>#0C0C0C</code>. Five category colors. Five status states with distinct glow intensities and animations. Connection lines with hover highlighting. Detail panel slides in from the right (desktop) / bottom (tablet) / full-screen (mobile). Filter bar at top dims non-matching nodes without removing them.</p>
<p><strong>Three things to nail:</strong></p>
<ol>
<li><strong>The glow.</strong> Each node is a warm light source. The glow system (category color + status intensity + firing animation for active) is what makes this page feel alive. Get the glow layering right and everything else follows.</li>
<li><strong>The hover interaction.</strong> When you hover a node, its connections light up and everything else dims. This is how Patrik reads the relationship web. The <code>300ms</code> transition in, <code>400ms</code> transition out makes it feel responsive but not twitchy.</li>
<li><strong>The firing bursts.</strong> Randomized radial ripples on active nodes. Staggered so they don&#39;t sync. This is the heartbeat of the canvas.</li>
</ol>
<p>Every value is specified. No ambiguity. Build pixel-perfect.</p>
<p>Design standard: old people can read em, young people love em.</p>
`,a={title:e,slug:t,category:o,agent:n,date:d,dateFormatted:i,updated:null,summary:l,tags:r,content:s};export{n as agent,o as category,s as content,d as date,i as dateFormatted,a as default,t as slug,l as summary,r as tags,e as title,c as updated};
