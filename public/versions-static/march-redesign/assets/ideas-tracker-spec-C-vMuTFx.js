const t="Ideas Tracker System Spec",e="ideas-tracker-spec",n="Technical",o="Elon",i="2026-03-11",a="Mar 11",l=null,s="System spec for the ideas tracker page: a visual of Patrik's brain.",r=[],d=`<h1>Ideas Tracker -- System Spec</h1>
<p><em>Elon | 2026-03-11</em>
<em>&quot;This can&#39;t be a blah page. It&#39;s a visual of my brain.&quot;</em></p>
<hr>
<h2>1. Purpose</h2>
<p>A visual ideas map for Patrik. Internal use, password-gated (same gate as /dashboard). Shows every idea he&#39;s working on, thinking about, or has parked. The key value: <strong>how ideas connect to each other</strong> and where each one stands.</p>
<p>This is not a task manager. It&#39;s a thinking tool. Ideas link to other ideas. Some feed each other. Some compete for the same resources. The visualization makes those relationships visible at a glance.</p>
<p><strong>URL:</strong> <code>aheadofmarket.com/ideas</code>
<strong>Access:</strong> Behind the same password gate as /dashboard</p>
<hr>
<h2>2. UX Concept</h2>
<h3>Option A: Constellation Map (force-directed node graph)</h3>
<p>Nodes float in space like stars. Related ideas cluster together naturally. Connections are visible lines between nodes. Nodes pulse/glow based on activity. Draggable. Zoomable.</p>
<p><strong>Pros:</strong> Organic feel. Relationships emerge visually from proximity + connections. Feels alive.
<strong>Cons:</strong> Can get tangled with many nodes. Positioning is semi-random until the physics settle.</p>
<h3>Option B: Orbital System</h3>
<p>One central node (&quot;AOM&quot;) with ideas orbiting at different distances based on priority. Inner orbit = active/urgent. Outer orbit = parked/future. Connection lines between related ideas form a web across orbits.</p>
<p><strong>Pros:</strong> Immediately shows priority hierarchy. Central gravity feels intentional.
<strong>Cons:</strong> Forces a single hierarchy (distance from center). Some ideas don&#39;t fit neatly into &quot;closer = more important.&quot;</p>
<h3>Option C: Neural Network / Brain Map</h3>
<p>Nodes laid out like neurons. Thick &quot;axon&quot; lines for strong connections, thin &quot;dendrite&quot; lines for loose associations. Nodes fire (brief glow animation) when they&#39;ve had recent activity. Clusters form naturally around related ideas. Background has subtle grid/mesh texture.</p>
<p><strong>Pros:</strong> Literally looks like a brain. The &quot;firing&quot; animation shows momentum. Cluster behavior matches how ideas actually relate. Most original concept.
<strong>Cons:</strong> More complex to implement. Needs careful tuning so it doesn&#39;t look like a generic network graph.</p>
<h3>Recommendation: Option C (Neural Network / Brain Map)</h3>
<p>Patrik said &quot;a visual of my brain.&quot; This is the most literal and the most original interpretation. The firing animation for active ideas creates a sense of life. The cluster behavior means related ideas naturally group without needing manual arrangement. Combined with AOM&#39;s dark theme, glowing nodes on a dark background will look premium and feel like a real thinking tool.</p>
<p>The force-directed layout from Option A provides the physics engine. The &quot;brain&quot; metaphor from Option C provides the visual language. Merge both: force-directed positioning with neural/synaptic visual styling.</p>
<hr>
<h2>3. Data Model</h2>
<h3>Idea Object</h3>
<pre><code class="language-json">{
  &quot;id&quot;: &quot;ai-advisory&quot;,
  &quot;title&quot;: &quot;AI Advisory Product&quot;,
  &quot;description&quot;: &quot;Multi-tenant dashboard platform for SMBs. The Geek Squad for AI.&quot;,
  &quot;status&quot;: &quot;active&quot;,
  &quot;progress&quot;: 45,
  &quot;category&quot;: &quot;product&quot;,
  &quot;owner&quot;: &quot;Steve + Bobby&quot;,
  &quot;connections&quot;: [&quot;construction-vertical&quot;, &quot;skills-as-tiles&quot;, &quot;geek-squad-ai&quot;, &quot;dashboard-platform&quot;],
  &quot;milestones&quot;: [
    { &quot;label&quot;: &quot;Market research&quot;, &quot;done&quot;: true },
    { &quot;label&quot;: &quot;/system page live&quot;, &quot;done&quot;: true },
    { &quot;label&quot;: &quot;Dashboard v2 shipped&quot;, &quot;done&quot;: true },
    { &quot;label&quot;: &quot;CPA outreach launched&quot;, &quot;done&quot;: false },
    { &quot;label&quot;: &quot;First paying client&quot;, &quot;done&quot;: false }
  ],
  &quot;createdAt&quot;: &quot;2026-03-08&quot;,
  &quot;lastActivity&quot;: &quot;2026-03-11&quot;,
  &quot;notes&quot;: &quot;Baby coming July. Revenue is the filter.&quot;
}
</code></pre>
<h3>Status Values</h3>
<table>
<thead>
<tr>
<th>Status</th>
<th>Meaning</th>
<th>Visual</th>
</tr>
</thead>
<tbody><tr>
<td><code>seed</code></td>
<td>Just an idea. No work done yet.</td>
<td>Dim node, slow pulse</td>
</tr>
<tr>
<td><code>growing</code></td>
<td>Some research or early work happening</td>
<td>Medium brightness, occasional fire</td>
</tr>
<tr>
<td><code>active</code></td>
<td>Being built right now</td>
<td>Bright glow, frequent fire animation</td>
</tr>
<tr>
<td><code>shipped</code></td>
<td>Live and working</td>
<td>Solid bright, gold accent, no pulse (stable)</td>
</tr>
<tr>
<td><code>parked</code></td>
<td>On hold intentionally</td>
<td>Muted, slightly transparent, no animation</td>
</tr>
</tbody></table>
<h3>Categories</h3>
<table>
<thead>
<tr>
<th>Category</th>
<th>Color Accent</th>
</tr>
</thead>
<tbody><tr>
<td><code>product</code></td>
<td>AOM Orange (#FF4F00)</td>
</tr>
<tr>
<td><code>revenue</code></td>
<td>Gold (#D4A843)</td>
</tr>
<tr>
<td><code>system</code></td>
<td>Sage (#7C9A72)</td>
</tr>
<tr>
<td><code>content</code></td>
<td>Warm White (#F5F0EB)</td>
</tr>
<tr>
<td><code>side-project</code></td>
<td>Muted Stone (#78716C)</td>
</tr>
</tbody></table>
<h3>Connection Types</h3>
<table>
<thead>
<tr>
<th>Type</th>
<th>Visual</th>
</tr>
</thead>
<tbody><tr>
<td><code>feeds</code></td>
<td>Directed arrow. Idea A feeds into Idea B.</td>
</tr>
<tr>
<td><code>related</code></td>
<td>Undirected line. Ideas share context.</td>
</tr>
<tr>
<td><code>depends</code></td>
<td>Dashed directed arrow. A can&#39;t ship without B.</td>
</tr>
<tr>
<td><code>competes</code></td>
<td>Red-tinted line. Ideas compete for same resources.</td>
</tr>
</tbody></table>
<hr>
<h2>4. Features</h2>
<h3>Core (v1)</h3>
<ul>
<li><strong>Interactive canvas:</strong> Pan, zoom, drag nodes. Canvas fills the viewport below the nav. Dark background with subtle grid texture.</li>
<li><strong>Node rendering:</strong> Each idea is a node. Size scales with progress. Color by category. Glow intensity by status.</li>
<li><strong>Connection lines:</strong> Visible lines between connected ideas. Line style varies by connection type (solid, dashed, directed arrows).</li>
<li><strong>Fire animation:</strong> Active ideas periodically &quot;fire&quot; -- a brief radial glow that pulses outward. Frequency based on lastActivity recency. An idea with activity today fires every 5-10 seconds. One from last week fires every 30 seconds. Parked ideas never fire.</li>
<li><strong>Click to expand:</strong> Clicking a node opens a detail panel (slide-in from right). Shows: title, description, status, progress bar, milestones checklist, connections list, owner, notes, dates.</li>
<li><strong>Cluster behavior:</strong> Force-directed layout naturally groups connected ideas. Ideas with many shared connections cluster tightly. Isolated ideas drift to the edges.</li>
<li><strong>Filter bar:</strong> Top bar with filter chips for status (seed/growing/active/shipped/parked) and category. Filtering dims non-matching nodes instead of hiding them (preserves spatial memory).</li>
<li><strong>Momentum indicator:</strong> Ideas with no activity in 7+ days get a subtle &quot;stagnant&quot; visual -- slightly desaturated, slower pulse. Immediately visible which ideas are getting attention and which are collecting dust.</li>
</ul>
<h3>Add/Edit (v1)</h3>
<ul>
<li><strong>Add idea button:</strong> Opens a form panel. Title, description, status, category, owner, notes. Connections are added by clicking existing nodes after creation.</li>
<li><strong>Quick-connect:</strong> Drag from one node to another to create a connection. Pick connection type from a small dropdown.</li>
<li><strong>Edit inline:</strong> Double-click a node to edit its properties in the detail panel.</li>
<li><strong>Update status:</strong> Drag a node to a status zone (bottom bar with status labels) or change in the detail panel.</li>
</ul>
<h3>Future (v2+)</h3>
<ul>
<li>Supabase backend (replaces JSON file). Real-time sync across devices.</li>
<li>Timeline view toggle: switch from spatial to chronological, showing when ideas were created and when they last had activity.</li>
<li>Agent integration: agents can update idea progress automatically when they complete milestones.</li>
<li>Search: type to highlight matching nodes.</li>
<li>History: see how the idea map evolved over time (snapshot diffs).</li>
</ul>
<hr>
<h2>5. Technical Spec</h2>
<h3>Stack</h3>
<ul>
<li><strong>React component</strong> in the aom-studio repo, matching all other pages.</li>
<li><strong>D3.js force simulation</strong> for layout physics. Handles node positioning, collision detection, link forces.</li>
<li><strong>Canvas or SVG rendering:</strong> SVG for v1 (simpler interaction model, click/hover events are native). Canvas for v2 if performance demands it (50+ nodes).</li>
<li><strong>Data source (v1):</strong> Static JSON file at <code>/data/ideas.json</code> in the aom-studio repo. Editable via the UI (writes to localStorage, exports to JSON). No backend needed for v1.</li>
<li><strong>Data source (v2):</strong> Supabase table. Same schema. Real-time subscriptions for multi-device.</li>
<li><strong>Route:</strong> <code>/ideas</code> in the React Router config.</li>
<li><strong>Password gate:</strong> Same mechanism as /dashboard.</li>
</ul>
<h3>Component Structure</h3>
<pre><code>IdeasPage.jsx
  PasswordGate (reuse from dashboard)
  IdeasCanvas.jsx
    ForceGraph (D3 force simulation)
    IdeaNode.jsx (individual node rendering)
    ConnectionLine.jsx (links between nodes)
    FireAnimation.jsx (pulse/glow effect)
  FilterBar.jsx (status + category chips)
  DetailPanel.jsx (slide-in right panel)
  AddIdeaForm.jsx (modal or panel)
</code></pre>
<h3>Performance</h3>
<ul>
<li>Force simulation runs on mount, settles in ~2 seconds, then only recalculates on drag/add/remove.</li>
<li>Animations use CSS transforms and opacity (GPU-accelerated). No JS animation loops for idle states.</li>
<li>Fire animation uses CSS @keyframes with staggered delays per node.</li>
<li>Target: 60fps with up to 30 nodes and 60 connections.</li>
</ul>
<h3>Responsive</h3>
<ul>
<li><strong>Desktop (1024+):</strong> Full canvas with detail panel as a right sidebar (400px wide).</li>
<li><strong>Tablet (768-1023):</strong> Canvas fills screen. Detail panel slides up from bottom (half-screen).</li>
<li><strong>Mobile (&lt; 768):</strong> Canvas with pinch-to-zoom. Tap a node to open a full-screen detail view. Filter bar collapses to a dropdown.</li>
</ul>
<hr>
<h2>6. Design Notes</h2>
<ul>
<li><strong>Dark theme.</strong> #0A0A08 background (Night). Matches the rest of the AOM site.</li>
<li><strong>Glow effects are the star.</strong> Nodes glow their category color. Active nodes have a larger, brighter glow radius. The whole canvas should feel like looking at a city at night from above -- clusters of light, connections between them, some areas buzzing, some quiet.</li>
<li><strong>Connection lines:</strong> Thin (#292524 base), glow on hover to show the full connection path. Animated dashes for &quot;depends&quot; type.</li>
<li><strong>Typography on nodes:</strong> Syne for titles (bold, 14-16px). JetBrains Mono for status labels (9px, uppercase, tracking wide). Must be readable without zooming.</li>
<li><strong>The grid texture stays.</strong> Same noise/grain overlay as the rest of the site (opacity-[0.03]).</li>
<li><strong>Transitions:</strong> Nodes drift smoothly when filters change. No hard cuts. Everything eases.</li>
<li><strong>Sound (stretch):</strong> Subtle click/chime when a node fires. Off by default. This is a &quot;delight&quot; feature, not core.</li>
</ul>
<hr>
<h2>7. Seed Data</h2>
<p>Pre-populate with Patrik&#39;s current ideas:</p>
<table>
<thead>
<tr>
<th>ID</th>
<th>Title</th>
<th>Status</th>
<th>Category</th>
<th>Key Connections</th>
</tr>
</thead>
<tbody><tr>
<td>ai-advisory</td>
<td>AI Advisory Product</td>
<td>active</td>
<td>product</td>
<td>construction-vertical, skills-tiles, dashboard-platform, geek-squad</td>
</tr>
<tr>
<td>thinksync</td>
<td>ThinkSync</td>
<td>seed</td>
<td>side-project</td>
<td>(standalone)</td>
</tr>
<tr>
<td>meta-ads-tool</td>
<td>Meta Ads Research Tool</td>
<td>seed</td>
<td>system</td>
<td>content-pipeline</td>
</tr>
<tr>
<td>partnership-outreach</td>
<td>Partnership Outreach System</td>
<td>active</td>
<td>revenue</td>
<td>construction-vertical, ai-advisory</td>
</tr>
<tr>
<td>premium-audit</td>
<td>Premium Audit Onboarding</td>
<td>growing</td>
<td>product</td>
<td>ai-advisory</td>
</tr>
<tr>
<td>content-pipeline</td>
<td>Content Pipeline</td>
<td>growing</td>
<td>content</td>
<td>meta-ads-tool, construction-vertical</td>
</tr>
<tr>
<td>construction-vertical</td>
<td>Construction Vertical</td>
<td>active</td>
<td>revenue</td>
<td>partnership-outreach, ai-advisory, content-pipeline</td>
</tr>
<tr>
<td>geek-squad</td>
<td>AOM as Geek Squad for AI</td>
<td>active</td>
<td>product</td>
<td>ai-advisory, skills-tiles</td>
</tr>
<tr>
<td>skills-tiles</td>
<td>Skills as Sellable Tiles</td>
<td>growing</td>
<td>product</td>
<td>ai-advisory, geek-squad, dashboard-platform</td>
</tr>
<tr>
<td>dashboard-platform</td>
<td>Multi-Tenant Dashboard</td>
<td>active</td>
<td>product</td>
<td>ai-advisory, skills-tiles</td>
</tr>
<tr>
<td>cpa-outreach</td>
<td>CPA Tax Season Angle</td>
<td>active</td>
<td>revenue</td>
<td>ai-advisory, partnership-outreach</td>
</tr>
<tr>
<td>postiz-social</td>
<td>Social Media Automation</td>
<td>growing</td>
<td>system</td>
<td>content-pipeline</td>
</tr>
</tbody></table>
<hr>
<h2>8. Handoff</h2>
<ol>
<li>This spec goes to <strong>Steffen</strong> for visual design direction (brief already written).</li>
<li>Steffen&#39;s design spec goes to <strong>Bobby</strong> for implementation.</li>
<li>Bobby builds the page, pushes to aom-studio.</li>
<li><strong>Elmo</strong> QAs before Patrik sees it.</li>
</ol>
<p>Standard pipeline. No shortcuts.</p>
`,c={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:a,updated:null,summary:s,tags:r,content:d};export{o as agent,n as category,d as content,i as date,a as dateFormatted,c as default,e as slug,s as summary,r as tags,t as title,l as updated};
