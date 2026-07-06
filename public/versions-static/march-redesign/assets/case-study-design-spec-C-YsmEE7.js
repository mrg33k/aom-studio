const t="Case Study Page Design Spec",e="case-study-design-spec",n="Design Specs",o="Steffen",r="2026-03-12",a="Mar 12",l=null,d="Implementation-ready design spec for the AOM case study page.",i=[],s=`<h1>Case Study Page: Design Spec</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-12
For Bobby. Implementation-ready. No interpretation needed.
Content brief: <code>projects/aom-strategy/case-study-brief.md</code>
Build brief: <code>projects/aom-strategy/bobby-case-study-brief.md</code></p>
</blockquote>
<hr>
<h2>1. Page Structure and Rhythm</h2>
<p>8 sections. Dark/light alternation creates breathing room. The reader should feel like they&#39;re scrolling through a film, not reading a brochure.</p>
<pre><code>Section 0: Hero           — bg-aom-night (#0C0C0C), full viewport
Section 1: The Problem    — bg-aom-night (#0C0C0C)
Section 2: The Decision   — bg-aom-charcoal (#141412) + orange gradient wash
Section 3: The System     — bg-aom-night (#0C0C0C)
Section 4: The Numbers    — bg-aom-cream (#F5F0EB) ** LIGHT SECTION **
Section 5: Day in the Life— bg-aom-night (#0C0C0C)
Section 6: The Bridge     — bg-aom-charcoal (#141412) + orange gradient wash
Section 7: Footer CTA     — bg-aom-night (#0C0C0C)
</code></pre>
<p><strong>Section padding standard:</strong></p>
<ul>
<li>Desktop: <code>py-32</code></li>
<li>Tablet: <code>py-24</code></li>
<li>Mobile: <code>py-16</code></li>
</ul>
<p><strong>Content max-width:</strong> <code>max-w-5xl</code> (1024px) for text sections, <code>max-w-6xl</code> (1152px) for grids/visualizations, <code>max-w-3xl</code> (768px) for body copy paragraphs.</p>
<hr>
<h2>2. Section 0: Hero</h2>
<p>Full viewport height. The &quot;magazine cover&quot; moment. Nothing competes for attention.</p>
<h3>Layout</h3>
<pre><code>- min-h-screen, flex items-center justify-center
- Content: centered, max-w-4xl
- Padding: px-6
</code></pre>
<h3>Elements (top to bottom, centered)</h3>
<p><strong>Micro-label:</strong></p>
<ul>
<li>Text: &quot;CASE STUDY&quot;</li>
<li>Classes: <code>text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4</code></li>
<li>Color: #78716C</li>
</ul>
<p><strong>Orange accent line:</strong></p>
<ul>
<li>48px wide, 2px tall</li>
<li>Classes: <code>w-12 h-[2px] bg-aom-orange mx-auto mb-8</code></li>
<li>Color: #E85D26</li>
</ul>
<p><strong>Headline:</strong></p>
<ul>
<li>Text: &quot;WE BUILT THE SYSTEM WE SELL.&quot;</li>
<li>Classes: <code>font-headline text-5xl md:text-6xl lg:text-7xl font-extrabold italic uppercase tracking-tighter text-aom-warm-white text-center leading-[0.95]</code></li>
<li>Color: #F5F0EB</li>
<li>The period in &quot;SELL.&quot; is critical. Keep it.</li>
</ul>
<p><strong>Subhead:</strong></p>
<ul>
<li>Text: &quot;12 AI agents. 280+ commits. 2 weeks. $0 new hires. Here&#39;s what happened when a creative agency stopped talking about AI and started running on it.&quot;</li>
<li>Classes: <code>text-aom-stone text-lg md:text-xl text-center mt-8 max-w-2xl mx-auto leading-relaxed</code></li>
<li>Color: #A8A29E</li>
<li>Font: Space Grotesk 400</li>
</ul>
<p><strong>Scroll indicator (bottom of viewport):</strong></p>
<ul>
<li>Position: <code>absolute bottom-8 left-1/2 -translate-x-1/2</code></li>
<li>Text: &quot;READ THE STORY&quot; in mono micro-label style</li>
<li>Below text: Lucide ChevronDown, 16px, #78716C</li>
<li>Animation: <code>translateY(0) -&gt; translateY(6px)</code>, 2000ms, ease-in-out, infinite</li>
<li>Opacity: 0.5, hover: 1.0</li>
<li>Click: smooth scroll to Section 1</li>
</ul>
<h3>Background Treatment</h3>
<pre><code>Layer 1: bg-aom-night (#0C0C0C)
Layer 2: SVG noise grain overlay, opacity 0.03, mix-blend-mode overlay
Layer 3: Radial gradient from center-top: rgba(232, 93, 38, 0.04) -&gt; transparent
  - Creates a very subtle warm glow behind the headline
  - Size: 60% of viewport width, 40% of viewport height
</code></pre>
<hr>
<h2>3. Section 1: The Problem (Before)</h2>
<h3>Layout</h3>
<pre><code>- bg-aom-night (#0C0C0C)
- Content: max-w-5xl mx-auto px-6
</code></pre>
<h3>Header</h3>
<pre><code>Micro-label: &quot;BEFORE&quot;
Orange accent line: 48px, 2px, #E85D26
Headline: &quot;ONE PERSON. EVERY ROLE.&quot;
- Classes: font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-aom-warm-white
</code></pre>
<h3>Body Copy</h3>
<pre><code>Two paragraphs about AOM before the system (from content brief).
- Classes: text-aom-stone text-base md:text-lg leading-relaxed max-w-3xl mt-8
- Color: #A8A29E
- Font: Space Grotesk 400
- Paragraph spacing: mb-6
</code></pre>
<h3>Pain Points Grid</h3>
<p>6 cards in a 2-column grid. These cards should feel like &quot;symptoms&quot; of the problem.</p>
<p><strong>Grid layout:</strong></p>
<ul>
<li>Desktop: <code>grid grid-cols-2 gap-6 mt-16</code></li>
<li>Tablet: <code>grid grid-cols-2 gap-5</code></li>
<li>Mobile: <code>grid grid-cols-1 gap-4</code></li>
</ul>
<p><strong>Each card:</strong></p>
<pre><code>Container:
- Classes: bg-aom-surface border border-aom-border p-6 relative overflow-hidden
- Background: #1A1A17
- Border: #292524
- Hover: border-aom-border-hover transition-colors duration-300

Left accent bar:
- Position: absolute left-0 top-0 bottom-0
- Width: 3px
- Color: #78716C (stone, muted, representing the &quot;broken&quot; state)

Card number (top-left):
- Classes: text-[10px] font-mono font-bold text-aom-stone-muted mb-3
- Format: &quot;01&quot; through &quot;06&quot;
- Color: #78716C

Title:
- Classes: font-headline text-base font-extrabold italic uppercase tracking-tight text-aom-warm-white mb-2
- Color: #F5F0EB

Detail text:
- Classes: text-aom-stone text-sm leading-relaxed
- Color: #A8A29E
</code></pre>
<p><strong>Card content (from brief):</strong></p>
<ol>
<li>Outreach was manual</li>
<li>Client tracking lived in Patrik&#39;s head</li>
<li>Quality control was reactive</li>
<li>Brand consistency was luck</li>
<li>Operations ran on memory</li>
<li>24/7 availability was impossible</li>
</ol>
<hr>
<h2>4. Section 2: The Decision (The Turn)</h2>
<p>The pivot moment. Visual treatment shifts to signal &quot;something changed.&quot;</p>
<h3>Layout</h3>
<pre><code>- bg-aom-charcoal (#141412)
- Orange gradient wash overlay:
  - bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent
  - Full section coverage
- Content: max-w-4xl mx-auto px-6 text-center
</code></pre>
<h3>Header (centered)</h3>
<pre><code>Micro-label: &quot;THE TURN&quot;
Orange accent line: centered
Headline: &quot;WHAT IF THE AGENCY RAN ITSELF?&quot;
- Same headline classes as other sections, add text-center
</code></pre>
<h3>Body Copy (centered)</h3>
<pre><code>Two paragraphs about building vs. hiring (from content brief).
- Classes: text-aom-stone text-base md:text-lg leading-relaxed max-w-3xl mx-auto mt-8 text-center
</code></pre>
<h3>Pull Quote Block</h3>
<p>The centerpiece of this section. Needs to feel like a moment.</p>
<pre><code>Container:
- Classes: mt-16 mb-8 max-w-3xl mx-auto relative

Left border accent:
- Position: absolute left-0 top-0 bottom-0
- Width: 4px
- Color: #E85D26
- OR: replace with large opening quotation mark

Quote text:
- Text: &quot;Isn&#39;t it smart for me as a small business owner to help build tailored solutions for people since I&#39;ve been able to do it for myself?&quot;
- Classes: font-headline text-xl md:text-2xl lg:text-3xl font-extrabold italic text-aom-orange leading-snug pl-8
- Color: #E85D26

Attribution:
- Text: &quot;Patrik Matheson, AOM&quot;
- Classes: text-aom-stone text-sm font-body mt-6 pl-8
- Color: #A8A29E
</code></pre>
<hr>
<h2>5. Section 3: The System (After)</h2>
<p>The longest section. Two major components: pipeline visualization and agent cards grid.</p>
<h3>Layout</h3>
<pre><code>- bg-aom-night (#0C0C0C)
- Content: max-w-6xl mx-auto px-6
</code></pre>
<h3>Header</h3>
<pre><code>Micro-label: &quot;AFTER&quot;
Orange accent line
Headline: &quot;12 AGENTS. ONE SYSTEM. ZERO NEW HIRES.&quot;
</code></pre>
<hr>
<h3>5a. Pipeline Visualization</h3>
<p>This is the showpiece. The production pipeline visualized as a flow diagram. Must look like a system architecture diagram, not a PowerPoint flowchart.</p>
<p><strong>Desktop layout (lg+): Horizontal flow</strong></p>
<pre><code>Container:
- Classes: mt-16 mb-20 py-12 px-8 bg-aom-surface border border-aom-border relative overflow-hidden
- Background: #1A1A17
- Border: #292524

Top label:
- Text: &quot;PRODUCTION PIPELINE&quot;
- Classes: text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-8
- Color: #78716C

Node layout:
- Classes: flex items-center justify-between gap-0
- 7 nodes in a horizontal row with connecting arrows between them
</code></pre>
<p><strong>Each pipeline node:</strong></p>
<pre><code>Container:
- Classes: flex flex-col items-center text-center relative z-10
- Width: auto, flex-shrink-0

Circle/badge:
- Size: 56px x 56px (w-14 h-14)
- Classes: w-14 h-14 rounded-full border-2 flex items-center justify-center mb-3
- Border color: varies by node (see color assignments below)
- Background: bg-aom-night (#0C0C0C)
- Inside: Agent initial letter(s)
  - Classes: font-headline text-sm font-extrabold uppercase
  - Color: matches border color

Agent name:
- Classes: font-headline text-xs font-extrabold uppercase tracking-tight text-aom-warm-white
- Color: #F5F0EB

Role label:
- Classes: text-[10px] font-mono text-aom-stone-muted mt-1
- Color: #78716C
</code></pre>
<p><strong>Pipeline node color assignments:</strong></p>
<pre><code>Elon (System):     border-aom-stone (#A8A29E)      text-aom-stone
Mom (Operations):  border-aom-sage (#7C9A72)        text-aom-sage
Alex (Strategy):   border-aom-gold (#C9A84C)        text-aom-gold
Steffen (Brand):   border-aom-orange (#E85D26)      text-aom-orange
Bobby (Build):     border-aom-orange (#E85D26)      text-aom-orange
Elmo (QA):         border-aom-sage (#7C9A72)        text-aom-sage
Patrik (Approve):  border-aom-warm-white (#F5F0EB)  text-aom-warm-white
</code></pre>
<p><strong>Connecting arrows between nodes:</strong></p>
<pre><code>Line:
- Position: between each node pair, vertically centered with the circles
- Height: 2px
- Background: #292524 (border color)
- Width: fills remaining space between nodes (flex-grow)

Arrow head:
- Lucide ChevronRight, 14px
- Color: #E85D26
- Positioned at the right end of each connecting line
- OR: use a CSS triangle (border trick) in #E85D26

Animated pulse (scroll-triggered):
- On viewport entry, a small orange dot (6px circle, #E85D26) travels along each connector from left to right
- Duration: 600ms per connector, 200ms stagger between connectors
- Total animation: ~2.4s for the full pipeline to &quot;light up&quot;
- Easing: ease-in-out
- Runs once on scroll entry. Does not loop.
- After pulse completes, connectors stay at full opacity with the arrows visible
</code></pre>
<p><strong>Tablet layout (md): Same as desktop, smaller</strong></p>
<pre><code>- Node circles: w-11 h-11 (44px)
- Font sizes scale down one step
- Arrow connectors get shorter
- Still horizontal
</code></pre>
<p><strong>Mobile layout (&lt;md): Vertical stack</strong></p>
<pre><code>Container:
- Classes: flex flex-col items-center gap-0

Each node:
- Same circle/badge design, centered
- Name and role below

Connecting lines:
- Vertical, 2px wide, height 32px
- Centered between nodes
- Arrow: ChevronDown instead of ChevronRight
- Same pulse animation, but vertical (top to bottom)
</code></pre>
<p><strong>Note below pipeline:</strong></p>
<pre><code>- Text: &quot;Every deliverable flows through this chain automatically. Patrik only touches the final approval.&quot;
- Classes: text-aom-stone text-sm text-center mt-8 max-w-xl mx-auto italic
- Color: #A8A29E
</code></pre>
<hr>
<h3>5b. Agent Cards Grid</h3>
<p>12 cards. Should feel like a command roster. Alive, not static.</p>
<p><strong>Grid layout:</strong></p>
<ul>
<li>Desktop: <code>grid grid-cols-3 gap-6 mt-16</code></li>
<li>Tablet: <code>grid grid-cols-2 gap-5</code></li>
<li>Mobile: <code>grid grid-cols-1 gap-4</code></li>
</ul>
<p><strong>Each agent card:</strong></p>
<pre><code>Container:
- Classes: bg-aom-surface border border-aom-border p-6 relative overflow-hidden group
- Background: #1A1A17
- Border: #292524
- Hover: border-[agent-color]/40 transition-all duration-300

Top accent line:
- Position: absolute top-0 left-0 right-0
- Height: 2px
- Color: agent-specific (see color map below)

Status indicator (top-right):
- Position: absolute top-6 right-6
- Size: 8px x 8px circle
- Color: #7C9A72 (sage green, &quot;active&quot;)
- Animation: subtle pulse (opacity 0.5 -&gt; 1.0, 2000ms, infinite)
- This makes the cards feel &quot;alive&quot;

Agent name:
- Classes: font-headline text-lg font-extrabold italic uppercase tracking-tight text-aom-warm-white mb-1
- Color: #F5F0EB

Agent title:
- Classes: text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[agent-color] mb-4
- Color: agent-specific

Description:
- Classes: text-aom-stone text-sm leading-relaxed
- Color: #A8A29E
- One sentence. What this agent replaced.

&quot;What It Replaced&quot; tag (bottom of card):
- Classes: mt-4 pt-4 border-t border-aom-border
- Label: text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-aom-stone-muted
- Text: &quot;REPLACED:&quot; followed by short description
- Classes for text: text-aom-stone text-xs
</code></pre>
<p><strong>Agent color map:</strong></p>
<pre><code>Jacob (Outreach):       #E85D26 (orange)
Mom (Operations):       #7C9A72 (sage)
Paige (Client Health):  #C9A84C (gold)
Elmo (Quality Gate):    #7C9A72 (sage)
Bobby (Web Builder):    #E85D26 (orange)
Steffen (Brand):        #E85D26 (orange)
Cleo (Content):         #C9A84C (gold)
Tony (Social):          #C9A84C (gold)
Elon (System):          #A8A29E (stone)
Alex (Strategy):        #C9A84C (gold)
Steve (AI Advisory):    #C9A84C (gold)
Relay (24/7 Bridge):    #A8A29E (stone)
</code></pre>
<p><strong>Card data (from content brief):</strong></p>
<table>
<thead>
<tr>
<th>Agent</th>
<th>Title</th>
<th>Description</th>
<th>Replaced</th>
</tr>
</thead>
<tbody><tr>
<td>Jacob</td>
<td>Outreach Engine</td>
<td>Researches prospects, writes personalized emails, tracks responses</td>
<td>Manual copy-paste emails with no tracking</td>
</tr>
<tr>
<td>Mom</td>
<td>Chief of Staff</td>
<td>Scans priorities, routes work, closes loops across all agents</td>
<td>Patrik mentally juggling every open task</td>
</tr>
<tr>
<td>Paige</td>
<td>Client Health</td>
<td>Monitors client satisfaction, flags risks, tracks deliverables</td>
<td>Client relationships tracked in Patrik&#39;s head</td>
</tr>
<tr>
<td>Elmo</td>
<td>Quality Gate</td>
<td>Screenshots every page at 5 breakpoints, checks accessibility</td>
<td>Bugs only caught on manual review</td>
</tr>
<tr>
<td>Bobby</td>
<td>Web Builder</td>
<td>Builds pages from design specs, deploys to production</td>
<td>Weeks of development time per page</td>
</tr>
<tr>
<td>Steffen</td>
<td>Brand Director</td>
<td>Enforces visual identity, specs every design decision</td>
<td>Inconsistent visuals across deliverables</td>
</tr>
<tr>
<td>Cleo</td>
<td>Content Producer</td>
<td>Video editing workflows, audio generation, content pipelines</td>
<td>Manual video editing and content creation</td>
</tr>
<tr>
<td>Tony</td>
<td>Social Media</td>
<td>Multi-platform posting, scheduling, content distribution</td>
<td>Manual posting with no scheduling</td>
</tr>
<tr>
<td>Elon</td>
<td>System Admin</td>
<td>Infrastructure monitoring, credential rotation, health checks</td>
<td>No monitoring, no credential management</td>
</tr>
<tr>
<td>Alex</td>
<td>Deal Architect</td>
<td>Offer strategy, pricing models, proposal frameworks</td>
<td>Ad-hoc strategy, never documented</td>
</tr>
<tr>
<td>Steve</td>
<td>AI Advisory Lead</td>
<td>Product packaging, ROI modeling, audit frameworks</td>
<td>No product structure or pricing</td>
</tr>
<tr>
<td>Relay</td>
<td>24/7 Bridge</td>
<td>Telegram relay with &lt;2s response, watchdog for uptime</td>
<td>Messages sitting unread until morning</td>
</tr>
</tbody></table>
<hr>
<h2>6. Section 4: The Numbers (LIGHT SECTION)</h2>
<p>The visual contrast break. Cream background makes the numbers pop. This section proves the claim.</p>
<h3>Layout</h3>
<pre><code>- bg-aom-cream (#F5F0EB) or bg-[#F5F0EB]
- All text colors invert: headlines become #0C0C0C, body becomes #57534E
- Content: max-w-6xl mx-auto px-6
</code></pre>
<h3>Header</h3>
<pre><code>Micro-label: &quot;RESULTS&quot;
- Color on light bg: #A8A29E
Orange accent line: same #E85D26

Headline: &quot;THE NUMBERS DON&#39;T LIE.&quot;
- Classes: font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter
- Color: #0C0C0C (dark on light)
</code></pre>
<hr>
<h3>6a. Metrics Callout Grid</h3>
<p>6 large metric cards. The numbers need to be impossible to ignore.</p>
<p><strong>Grid layout:</strong></p>
<ul>
<li>Desktop: <code>grid grid-cols-3 gap-8 mt-16</code></li>
<li>Tablet: <code>grid grid-cols-2 gap-6</code></li>
<li>Mobile: <code>grid grid-cols-1 gap-5</code></li>
</ul>
<p><strong>Each metric card:</strong></p>
<pre><code>Container:
- Classes: text-center p-8 md:p-10 relative
- No background color (transparent on cream)
- Border-bottom: 2px solid #E85D26 (orange underline for each card)

Big number:
- Classes: font-headline text-6xl md:text-7xl lg:text-8xl font-extrabold italic leading-none tabular-nums
- Color: #0C0C0C
- Font: Syne 800 Italic

Suffix (if applicable, e.g. &quot;hrs&quot;, &quot;+&quot;):
- Classes: text-3xl md:text-4xl font-extrabold not-italic
- Color: #A8A29E
- Inline with number

Label:
- Classes: font-headline text-base font-bold uppercase tracking-tight mt-4
- Color: #0C0C0C

Context line:
- Classes: text-sm font-body mt-2
- Color: #78716C
</code></pre>
<p><strong>Metric card data:</strong></p>
<table>
<thead>
<tr>
<th>Number</th>
<th>Suffix</th>
<th>Label</th>
<th>Context</th>
</tr>
</thead>
<tbody><tr>
<td>12</td>
<td>+</td>
<td>Specialized AI Agents</td>
<td>Running 24/7</td>
</tr>
<tr>
<td>280</td>
<td>+</td>
<td>Commits Shipped</td>
<td>In the first two weeks</td>
</tr>
<tr>
<td>~2</td>
<td>hrs</td>
<td>Time to Build a Page</td>
<td>From spec to live on site</td>
</tr>
<tr>
<td>51</td>
<td>+</td>
<td>Outreach Emails Sent</td>
<td>Personalized and tracked</td>
</tr>
<tr>
<td>$0</td>
<td></td>
<td>Additional Headcount</td>
<td>Zero new hires</td>
</tr>
<tr>
<td>24/7</td>
<td></td>
<td>Operational Uptime</td>
<td>Relay + watchdog + agents</td>
</tr>
</tbody></table>
<p><strong>Count-up animation:</strong></p>
<pre><code>Trigger: IntersectionObserver, threshold 0.2
Start: 0
End: final value
Duration: 1400ms
Easing: ease-out (fast start, slow landing)
Format: Maintain commas, dollar signs, suffixes throughout animation
&quot;$0&quot; card: no animation needed (it&#39;s already zero, which is the point)
&quot;24/7&quot; card: no count-up. Fade in with a subtle scale(0.95) -&gt; scale(1.0) over 600ms.
&quot;~2&quot; card: count from 0.0 to 2.0 over 800ms, then prepend the &quot;~&quot;

Respects prefers-reduced-motion: skip animation, show final values immediately.
</code></pre>
<hr>
<h3>6b. Cost Comparison Table</h3>
<p>The knockout punch. Traditional hires vs. AOM&#39;s system.</p>
<p><strong>Layout:</strong></p>
<pre><code>Container:
- Classes: mt-20 max-w-4xl mx-auto

Section sub-header:
- Mono micro-label: &quot;COST COMPARISON&quot;
- Classes: text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone mb-4
</code></pre>
<p><strong>Desktop: Two-column comparison table</strong></p>
<pre><code>Table container:
- Classes: overflow-hidden border border-aom-stone/20 rounded-sm
- Background: white (#FFFFFF) or bg-white

Header row:
- Left column header: &quot;TRADITIONAL APPROACH&quot;
  - Background: #0C0C0C
  - Text: #F5F0EB, font-mono text-[10px] font-bold uppercase tracking-[0.3em]
- Right column header: &quot;AOM&#39;S AI SYSTEM&quot;
  - Background: #E85D26
  - Text: #FFFFFF, same font treatment

Body rows:
- Background: alternating white / #F9F7F4
- Text color: #0C0C0C for role names, #57534E for salary text
- Padding: px-6 py-4
- Border: border-b border-aom-stone/10

Left column (Traditional):
- Role name: font-body text-sm font-semibold text-[#0C0C0C]
- Salary: font-mono text-sm text-[#57534E]

Right column (AOM System):
- Agent name + &quot;$0&quot;: font-body text-sm font-semibold text-[#0C0C0C]
- Checkmark icon before text: Lucide Check, 14px, #7C9A72

Total row:
- Background: #0C0C0C
- Left: &quot;$200-280k/year&quot; in font-headline text-xl font-extrabold italic text-aom-warm-white
- Right: &quot;Fraction of one hire&quot; in font-headline text-xl font-extrabold italic text-aom-orange
- This row should feel like the mic drop.
</code></pre>
<p><strong>Table data:</strong></p>
<table>
<thead>
<tr>
<th>Role</th>
<th>Traditional Salary</th>
<th>AOM Agent</th>
<th>AOM Cost</th>
</tr>
</thead>
<tbody><tr>
<td>Outreach coordinator</td>
<td>$45-65k/year</td>
<td>Jacob agent</td>
<td>$0</td>
</tr>
<tr>
<td>QA tester</td>
<td>$50-70k/year</td>
<td>Elmo agent</td>
<td>$0</td>
</tr>
<tr>
<td>Project manager</td>
<td>$55-75k/year</td>
<td>Mom agent</td>
<td>$0</td>
</tr>
<tr>
<td>Brand manager</td>
<td>$50-70k/year</td>
<td>Steffen agent</td>
<td>$0</td>
</tr>
<tr>
<td>After-hours coverage</td>
<td>Overtime or missed messages</td>
<td>24/7 relay + watchdog</td>
<td>$0</td>
</tr>
<tr>
<td><strong>Total</strong></td>
<td><strong>$200-280k/year</strong></td>
<td><strong>AI Operations System</strong></td>
<td><strong>Fraction of one hire</strong></td>
</tr>
</tbody></table>
<p><strong>Mobile: Stacked comparison cards</strong></p>
<pre><code>Each role becomes a card:
- Classes: bg-white p-5 border border-aom-stone/10 mb-3

Role name:
- Classes: font-headline text-sm font-bold uppercase text-[#0C0C0C] mb-3

Two-column within card:
- Left label: &quot;Traditional&quot; in mono micro style
- Left value: salary in font-mono
- Right label: &quot;AOM System&quot; in mono micro style, color #E85D26
- Right value: agent name + &quot;$0&quot; with check icon

Divider: border-t border-aom-stone/10 between the two rows
</code></pre>
<p><strong>Footer note:</strong></p>
<pre><code>- Text: &quot;AOM&#39;s system isn&#39;t replacing creative work. It&#39;s replacing the operational overhead that keeps creative people from doing creative work.&quot;
- Classes: text-center text-sm font-body mt-12 max-w-2xl mx-auto italic
- Color: #78716C
</code></pre>
<hr>
<h2>7. Section 5: Day in the Life</h2>
<p>A timeline that proves the system is real. Should feel like watching a system log unfold.</p>
<h3>Layout</h3>
<pre><code>- bg-aom-night (#0C0C0C)
- Content: max-w-4xl mx-auto px-6
</code></pre>
<h3>Header</h3>
<pre><code>Micro-label: &quot;A DAY IN THE LIFE&quot;
Orange accent line
Headline: &quot;WHAT 24 HOURS LOOKS LIKE.&quot;
</code></pre>
<h3>Timeline Design</h3>
<p><strong>Structure: CSS vertical timeline with left timestamps, right content cards.</strong></p>
<pre><code>Timeline container:
- Classes: mt-16 relative

Central line:
- Position: absolute, left-[120px] on desktop, left-[20px] on mobile
- Width: 2px
- Height: full section
- Color: #292524 (border color)
- z-index: 0
</code></pre>
<p><strong>Each timeline entry:</strong></p>
<pre><code>Entry container:
- Classes: flex gap-8 mb-8 relative
- Desktop: flex-row
- Mobile: flex-col, gap reduced to gap-3

Timestamp (left side):
- Width: 100px (desktop), auto (mobile)
- Classes: text-right font-mono text-sm font-bold tabular-nums flex-shrink-0
- Color: #E85D26 for action timestamps, #7C9A72 for QA timestamps, #A8A29E for system timestamps
- Font: JetBrains Mono 700

Dot on timeline:
- Position: absolute, centered on the vertical line
- Size: 12px circle
- Border: 2px solid, same color as timestamp
- Background: #0C0C0C (night, matches page bg)
- z-index: 1

Content card (right side):
- Classes: bg-aom-surface border border-aom-border p-5 flex-grow
- Background: #1A1A17
- Border: #292524

Left border accent on card:
- Width: 3px
- Color: matches timestamp color category (orange/sage/stone)

Event title:
- Classes: font-headline text-sm font-extrabold italic uppercase tracking-tight text-aom-warm-white mb-2
- Color: #F5F0EB

Event description:
- Classes: text-aom-stone text-sm leading-relaxed
- Color: #A8A29E

Agent badge (inline with title):
- Classes: inline-block text-[9px] font-mono font-bold uppercase tracking-[0.2em] px-2 py-0.5 ml-2 border
- Border + text color: matches agent color from color map
- Background: transparent
</code></pre>
<p><strong>Timeline entries (from content brief):</strong></p>
<table>
<thead>
<tr>
<th>Time</th>
<th>Title</th>
<th>Description</th>
<th>Agent</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td>7:00 AM</td>
<td>Message received</td>
<td>Patrik sends a Telegram message: &quot;Check Ambition site, footer looks off on mobile.&quot;</td>
<td>RELAY</td>
<td>#A8A29E (stone)</td>
</tr>
<tr>
<td>7:01 AM</td>
<td>Relay injection</td>
<td>Message picked up via hook. No polling, no delay. Injected into context.</td>
<td>RELAY</td>
<td>#A8A29E (stone)</td>
</tr>
<tr>
<td>7:02 AM</td>
<td>Bobby launches</td>
<td>Reads the request, pulls the repo, identifies the CSS issue.</td>
<td>BOBBY</td>
<td>#E85D26 (orange)</td>
</tr>
<tr>
<td>7:08 AM</td>
<td>Fix committed</td>
<td>Code pushed. Mom auto-launches to scan pipeline.</td>
<td>BOBBY</td>
<td>#E85D26 (orange)</td>
</tr>
<tr>
<td>7:09 AM</td>
<td>QA runs</td>
<td>Elmo screenshots the page at 5 breakpoints. Checks for regressions.</td>
<td>ELMO</td>
<td>#7C9A72 (sage)</td>
</tr>
<tr>
<td>7:12 AM</td>
<td>Confirmed live</td>
<td>Patrik gets confirmation: &quot;Footer fixed. Elmo QA passed. Live on site.&quot;</td>
<td>MOM</td>
<td>#7C9A72 (sage)</td>
</tr>
<tr>
<td>While Patrik&#39;s on a shoot...</td>
<td>Background agents</td>
<td>Jacob sends 15 outreach emails. Paige scans client health. Steffen catches a font-weight deviation.</td>
<td>SYSTEM</td>
<td>#A8A29E (stone)</td>
</tr>
<tr>
<td>11:00 PM</td>
<td>After hours</td>
<td>Patrik&#39;s asleep. Message comes in. Watchdog defers for morning.</td>
<td>RELAY</td>
<td>#A8A29E (stone)</td>
</tr>
</tbody></table>
<p><strong>&quot;12 minutes&quot; callout below timeline:</strong></p>
<pre><code>Container:
- Classes: mt-12 text-center

Big text:
- Text: &quot;12 MINUTES&quot;
- Classes: font-headline text-4xl md:text-5xl font-extrabold italic text-aom-orange
- Color: #E85D26

Subtext:
- Text: &quot;From request to live fix, with QA. While Patrik was still pouring coffee.&quot;
- Classes: text-aom-stone text-base mt-3
- Color: #A8A29E
</code></pre>
<p><strong>Timeline scroll animation:</strong></p>
<pre><code>Each entry reveals on scroll:
- opacity 0 -&gt; 1, translateX(-20px) -&gt; 0
- Duration: 600ms
- Easing: ease-out
- Stagger: 150ms between entries
- Trigger: IntersectionObserver, threshold 0.15

The dot on the timeline line lights up (opacity 0.3 -&gt; 1.0) as its entry enters viewport.
The vertical line fills with orange (#E85D26) from top to bottom as the user scrolls through, tracking scroll position.
  - Implementation: use a gradient mask or a second absolute-positioned div that grows in height based on scroll.
  - Fallback (simpler): just have the line be #292524 static. The dot color changes are enough.
</code></pre>
<hr>
<h2>8. Section 6: The Bridge + CTA</h2>
<p>Transition from &quot;look what we built&quot; to &quot;now let&#39;s build it for you.&quot;</p>
<h3>Layout</h3>
<pre><code>- bg-aom-charcoal (#141412)
- Orange gradient wash: bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent
- Content: max-w-5xl mx-auto px-6 text-center
</code></pre>
<h3>Header (centered)</h3>
<pre><code>Micro-label: &quot;YOUR BUSINESS&quot;
Orange accent line: centered
Headline: &quot;WE BUILT IT FOR US. NOW WE BUILD IT FOR YOU.&quot;
</code></pre>
<h3>Body Copy</h3>
<pre><code>Two paragraphs (from content brief). Centered.
- Classes: text-aom-stone text-base md:text-lg leading-relaxed max-w-3xl mx-auto mt-8 text-center
</code></pre>
<h3>Three CTA Pathway Cards</h3>
<p><strong>Grid layout:</strong></p>
<ul>
<li>Desktop: <code>grid grid-cols-3 gap-6 mt-16</code></li>
<li>Tablet: <code>grid grid-cols-3 gap-5</code></li>
<li>Mobile: <code>grid grid-cols-1 gap-4</code></li>
</ul>
<p><strong>Each pathway card:</strong></p>
<pre><code>Container:
- Classes: bg-aom-surface border border-aom-border p-8 text-center group hover:border-aom-orange/40 transition-all duration-300 cursor-pointer
- Background: #1A1A17
- Border: #292524

Top accent:
- Icon from Lucide, 24px, centered, color per card (see below)
- Icon container: w-12 h-12 border border-[icon-color]/30 bg-[icon-color]/5 flex items-center justify-center mx-auto mb-6

Card title:
- Classes: font-headline text-lg font-extrabold italic uppercase tracking-tight text-aom-warm-white mb-3
- Color: #F5F0EB

Card description:
- Classes: text-aom-stone text-sm leading-relaxed mb-6
- Color: #A8A29E

CTA button:
- Classes: inline-block font-headline text-sm font-extrabold uppercase tracking-tight px-6 py-3 transition-all duration-300
</code></pre>
<p><strong>Card 1: See Your Numbers</strong></p>
<pre><code>Icon: Calculator (Lucide), color #E85D26
Description: &quot;6 inputs. 30 seconds. See what AI operations could save your business.&quot;
Button: &quot;CALCULATE MY ROI&quot;
- Classes: bg-transparent border border-aom-orange text-aom-orange hover:bg-aom-orange hover:text-white
- Link: /roi
</code></pre>
<p><strong>Card 2: Get the Full Picture</strong></p>
<pre><code>Icon: ClipboardCheck (Lucide), color #7C9A72
Description: &quot;The $2,500 AI Operations Audit maps your exact workflows, not industry averages.&quot;
Button: &quot;BOOK YOUR AUDIT&quot;
- Classes: bg-aom-orange text-white hover:bg-aom-orange-hover shadow-lg shadow-aom-orange/20
- Link: /book
- This is the PRIMARY action. Button is filled, not outlined.
</code></pre>
<p><strong>Card 3: Talk to Us</strong></p>
<pre><code>Icon: MessageCircle (Lucide), color #C9A84C
Description: &quot;15 minutes. No cost. No pitch. Just a straight conversation about what&#39;s possible.&quot;
Button: &quot;SCHEDULE A CALL&quot;
- Classes: bg-transparent border border-aom-warm-white text-aom-warm-white hover:bg-aom-warm-white hover:text-aom-night
- Link: /book
</code></pre>
<hr>
<h2>9. Section 7: Footer CTA (Persistent)</h2>
<p>The final close. Simple, bold, no clutter.</p>
<h3>Layout</h3>
<pre><code>- bg-aom-night (#0C0C0C)
- Content: max-w-3xl mx-auto px-6 text-center
- Padding: py-24 md:py-32
</code></pre>
<h3>Elements</h3>
<pre><code>Headline:
- Text: &quot;STOP DOING EVERYTHING YOURSELF.&quot;
- Classes: font-headline text-2xl md:text-3xl lg:text-4xl font-extrabold italic uppercase tracking-tighter text-aom-warm-white
- Color: #F5F0EB

Subhead:
- Text: &quot;Your business deserves the same system we built for ours.&quot;
- Classes: text-aom-stone text-lg mt-6 max-w-xl mx-auto
- Color: #A8A29E

Primary button:
- Text: &quot;BOOK YOUR AUDIT&quot;
- Classes: inline-block bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight text-lg px-12 py-5 mt-10 shadow-lg shadow-aom-orange/20 hover:bg-aom-orange-hover transition-colors duration-300
- No border-radius. Square.
- Link: /book

Secondary link:
- Text: &quot;Or start with the ROI calculator&quot;
- Classes: block mt-6 text-aom-orange text-sm font-body hover:underline transition-all duration-200
- Color: #E85D26
- Link: /roi
</code></pre>
<p><strong>CTA button glow (subtle):</strong></p>
<pre><code>After section enters viewport (1s delay):
- box-shadow oscillates: 0 0 30px rgba(232, 93, 38, 0.1) -&gt; 0 0 50px rgba(232, 93, 38, 0.2)
- Duration: 3000ms, ease-in-out, infinite
- Very subtle. Should feel like warmth, not a beacon.
- Respects prefers-reduced-motion: no pulse, static shadow.
</code></pre>
<hr>
<h2>10. Global Animation Specs</h2>
<h3>Scroll Reveal (all sections)</h3>
<pre><code>Default reveal for all section content:
- opacity: 0 -&gt; 1
- translateY: 30px -&gt; 0
- Duration: 700ms
- Easing: ease-out
- Trigger: IntersectionObserver, threshold 0.1
- Stagger between sibling elements (cards, grid items): 120ms

Apply to:
- Section headers
- Body copy blocks
- Card grids (stagger per card)
- Tables
- Timeline entries (use translateX instead of translateY)
- CTA blocks
</code></pre>
<h3>Pipeline Animation (Section 3)</h3>
<pre><code>On viewport entry:
1. Pipeline container fades in (opacity 0 -&gt; 1, 500ms)
2. Nodes appear left to right, 150ms stagger
3. Orange pulse dot travels along each connector, 200ms stagger
4. Total sequence: ~3 seconds
5. Runs once. Does not repeat.
</code></pre>
<h3>Count-up Animation (Section 4)</h3>
<pre><code>Already defined in Section 6a above.
Summary: IntersectionObserver trigger, 1400ms ease-out, format-preserving.
</code></pre>
<h3>Card Status Pulse (Section 3 agent cards)</h3>
<pre><code>Green dot on each card:
- opacity keyframes: 0.4 -&gt; 1.0 -&gt; 0.4
- Duration: 2500ms
- Infinite, ease-in-out
- Stagger each card&#39;s pulse start by 200ms so they don&#39;t all pulse in unison (feels more organic)
</code></pre>
<h3>prefers-reduced-motion</h3>
<pre><code>All animations:
- Skip translateY/translateX movements
- Skip count-up (show final values)
- Skip pipeline pulse
- Skip status dot pulse (show static dot)
- Keep opacity transitions but make them instant (duration: 0)
- Keep hover effects (they&#39;re user-initiated)
</code></pre>
<hr>
<h2>11. Typography Reference (this page)</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Style</th>
<th>Desktop</th>
<th>Mobile</th>
<th>Color (dark bg)</th>
<th>Color (light bg)</th>
</tr>
</thead>
<tbody><tr>
<td>Hero headline</td>
<td>Syne</td>
<td>800</td>
<td>Italic, uppercase</td>
<td>text-7xl</td>
<td>text-5xl</td>
<td>#F5F0EB</td>
<td>n/a</td>
</tr>
<tr>
<td>Section headlines</td>
<td>Syne</td>
<td>800</td>
<td>Italic, uppercase</td>
<td>text-5xl</td>
<td>text-2xl</td>
<td>#F5F0EB</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Section subheads</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>text-lg</td>
<td>text-base</td>
<td>#A8A29E</td>
<td>#78716C</td>
</tr>
<tr>
<td>Body copy</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>text-base</td>
<td>text-base</td>
<td>#A8A29E</td>
<td>#57534E</td>
</tr>
<tr>
<td>Micro-labels</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>10px</td>
<td>10px</td>
<td>#78716C</td>
<td>#A8A29E</td>
</tr>
<tr>
<td>Card titles</td>
<td>Syne</td>
<td>800</td>
<td>Italic, uppercase</td>
<td>text-lg</td>
<td>text-base</td>
<td>#F5F0EB</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Card body</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>text-sm</td>
<td>text-sm</td>
<td>#A8A29E</td>
<td>#57534E</td>
</tr>
<tr>
<td>Mono tags</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>9px</td>
<td>9px</td>
<td>varies</td>
<td>varies</td>
</tr>
<tr>
<td>Timeline timestamps</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Normal</td>
<td>text-sm</td>
<td>text-xs</td>
<td>varies</td>
<td>n/a</td>
</tr>
<tr>
<td>Metric numbers</td>
<td>Syne</td>
<td>800</td>
<td>Italic</td>
<td>text-8xl</td>
<td>text-6xl</td>
<td>n/a</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Pull quote</td>
<td>Syne</td>
<td>800</td>
<td>Italic</td>
<td>text-3xl</td>
<td>text-xl</td>
<td>#E85D26</td>
<td>n/a</td>
</tr>
<tr>
<td>Buttons</td>
<td>Syne</td>
<td>800</td>
<td>Uppercase</td>
<td>text-lg</td>
<td>text-base</td>
<td>#FFFFFF</td>
<td>#FFFFFF</td>
</tr>
<tr>
<td>Table headers</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>10px</td>
<td>10px</td>
<td>#78716C</td>
<td>#A8A29E</td>
</tr>
<tr>
<td>Table body</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>text-sm</td>
<td>text-sm</td>
<td>#F5F0EB</td>
<td>#0C0C0C</td>
</tr>
</tbody></table>
<p><strong>Hard rule: No text below 16px body. Micro-labels (10px) and mono tags (9px) are the only exceptions, and they are decorative/structural, not content.</strong></p>
<hr>
<h2>12. Color Reference</h2>
<h3>Dark Sections</h3>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>bg-aom-night</td>
<td>#0C0C0C</td>
<td>Primary background</td>
</tr>
<tr>
<td>bg-aom-charcoal</td>
<td>#141412</td>
<td>Alternate dark background</td>
</tr>
<tr>
<td>bg-aom-surface</td>
<td>#1A1A17</td>
<td>Card backgrounds</td>
</tr>
<tr>
<td>border-aom-border</td>
<td>#292524</td>
<td>Card/section borders</td>
</tr>
<tr>
<td>border-aom-border-hover</td>
<td>#44403C</td>
<td>Hover state borders</td>
</tr>
<tr>
<td>text-aom-warm-white</td>
<td>#F5F0EB</td>
<td>Headlines, primary text</td>
</tr>
<tr>
<td>text-aom-stone</td>
<td>#A8A29E</td>
<td>Body text, secondary</td>
</tr>
<tr>
<td>text-aom-stone-muted</td>
<td>#78716C</td>
<td>Tertiary text, micro-labels</td>
</tr>
<tr>
<td>text-aom-dim</td>
<td>#57534E</td>
<td>Placeholders, ghost text</td>
</tr>
</tbody></table>
<h3>Light Section (Section 4 only)</h3>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>bg-aom-cream</td>
<td>#F5F0EB</td>
<td>Section background</td>
</tr>
<tr>
<td>Text primary</td>
<td>#0C0C0C</td>
<td>Headlines</td>
</tr>
<tr>
<td>Text secondary</td>
<td>#57534E</td>
<td>Body</td>
</tr>
<tr>
<td>Text tertiary</td>
<td>#78716C</td>
<td>Captions</td>
</tr>
<tr>
<td>Table bg</td>
<td>#FFFFFF</td>
<td>Table container</td>
</tr>
<tr>
<td>Table alt row</td>
<td>#F9F7F4</td>
<td>Alternating rows</td>
</tr>
</tbody></table>
<h3>Accent Colors</h3>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>aom-orange</td>
<td>#E85D26</td>
<td>Primary accent, CTAs, arrows, highlights</td>
</tr>
<tr>
<td>aom-orange-hover</td>
<td>#D14E1C</td>
<td>Hover state for orange buttons</td>
</tr>
<tr>
<td>aom-sage</td>
<td>#7C9A72</td>
<td>QA, success, active indicators</td>
</tr>
<tr>
<td>aom-gold</td>
<td>#C9A84C</td>
<td>Strategy, advisory, warm accent</td>
</tr>
<tr>
<td>aom-stone</td>
<td>#A8A29E</td>
<td>Neutral, system, infrastructure</td>
</tr>
</tbody></table>
<hr>
<h2>13. Background Layers</h2>
<h3>Dark sections (0, 1, 3, 5, 7)</h3>
<pre><code>Layer 1: bg-aom-night (#0C0C0C)
Layer 2: SVG noise grain, opacity 0.03, mix-blend-mode overlay, fixed
</code></pre>
<h3>Orange wash sections (2, 6)</h3>
<pre><code>Layer 1: bg-aom-charcoal (#141412)
Layer 2: SVG noise grain, opacity 0.03, mix-blend-mode overlay
Layer 3: bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent
</code></pre>
<h3>Light section (4)</h3>
<pre><code>Layer 1: bg-aom-cream (#F5F0EB)
Layer 2: SVG noise grain, opacity 0.02, mix-blend-mode soft-light (lighter grain on cream)
</code></pre>
<hr>
<h2>14. Responsive Breakpoints Summary</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Desktop (lg+)</th>
<th>Tablet (md)</th>
<th>Mobile (&lt;md)</th>
</tr>
</thead>
<tbody><tr>
<td>Hero headline</td>
<td>text-7xl</td>
<td>text-6xl</td>
<td>text-5xl</td>
</tr>
<tr>
<td>Section headlines</td>
<td>text-5xl</td>
<td>text-4xl</td>
<td>text-2xl</td>
</tr>
<tr>
<td>Pain points grid</td>
<td>2 columns</td>
<td>2 columns</td>
<td>1 column</td>
</tr>
<tr>
<td>Pipeline diagram</td>
<td>Horizontal</td>
<td>Horizontal (smaller)</td>
<td>Vertical stack</td>
</tr>
<tr>
<td>Agent cards</td>
<td>3 columns</td>
<td>2 columns</td>
<td>1 column</td>
</tr>
<tr>
<td>Metrics cards</td>
<td>3 columns</td>
<td>2 columns</td>
<td>1 column</td>
</tr>
<tr>
<td>Comparison table</td>
<td>Standard table</td>
<td>Standard table</td>
<td>Stacked cards</td>
</tr>
<tr>
<td>Timeline</td>
<td>Side-by-side</td>
<td>Side-by-side</td>
<td>Stacked</td>
</tr>
<tr>
<td>CTA cards</td>
<td>3 columns</td>
<td>3 columns</td>
<td>1 column</td>
</tr>
<tr>
<td>Section padding</td>
<td>py-32</td>
<td>py-24</td>
<td>py-16</td>
</tr>
<tr>
<td>Content max-width</td>
<td>max-w-5xl/6xl</td>
<td>max-w-4xl</td>
<td>full with px-6</td>
</tr>
</tbody></table>
<hr>
<h2>15. Accessibility</h2>
<ul>
<li>All text passes WCAG AA contrast minimum<ul>
<li>#F5F0EB on #0C0C0C = 17.8:1 (AAA)</li>
<li>#A8A29E on #0C0C0C = 6.9:1 (AA)</li>
<li>#78716C on #0C0C0C = 4.5:1 (AA)</li>
<li>#0C0C0C on #F5F0EB = 17.8:1 (AAA, light section)</li>
<li>#E85D26 on #0C0C0C = 5.0:1 (AA)</li>
<li>White on #E85D26 = 3.9:1 (AA Large Text, fine for buttons at 18px+)</li>
</ul>
</li>
<li>Focus rings visible on all interactive elements (CTA buttons, links)</li>
<li>Status indicator dots have <code>aria-hidden=&quot;true&quot;</code> (decorative)</li>
<li>Timeline entries use semantic markup (<code>&lt;ol&gt;</code>, <code>&lt;li&gt;</code>, <code>&lt;time&gt;</code>)</li>
<li>All animations respect <code>prefers-reduced-motion</code></li>
<li>Minimum touch targets: 44px on all buttons and links</li>
<li>No text below 16px for content (micro-labels/mono tags are decorative exceptions)</li>
<li>Pipeline diagram has <code>role=&quot;img&quot;</code> with <code>aria-label</code> describing the flow</li>
</ul>
<hr>
<h2>16. OG Tags</h2>
<pre><code class="language-html">&lt;title&gt;How AOM Runs on AI | Case Study&lt;/title&gt;
&lt;meta property=&quot;og:title&quot; content=&quot;How AOM Runs on AI | Case Study&quot; /&gt;
&lt;meta property=&quot;og:description&quot; content=&quot;12 AI agents. 280+ commits. 2 weeks. $0 new hires. See how a creative agency built the AI system it now sells.&quot; /&gt;
&lt;meta property=&quot;og:type&quot; content=&quot;article&quot; /&gt;
&lt;meta property=&quot;og:url&quot; content=&quot;https://aheadofmarket.com/case-study&quot; /&gt;
&lt;meta name=&quot;twitter:card&quot; content=&quot;summary_large_image&quot; /&gt;
</code></pre>
<hr>
<p><em>Spec complete. Bobby builds from this without interpretation. Every hex value, every Tailwind class, every animation timing, every responsive breakpoint is defined. The pipeline visualization and agent cards grid are the two hero components. If those look incredible, the page sells itself.</em></p>
<p><em>Steffen reviews the build against this spec before Elmo QA.</em></p>
`,c={title:t,slug:e,category:n,agent:o,date:r,dateFormatted:a,updated:null,summary:d,tags:i,content:s};export{o as agent,n as category,s as content,r as date,a as dateFormatted,c as default,e as slug,d as summary,i as tags,t as title,l as updated};
