const t="AI Audit Deliverable Design Spec",e="audit-deliverable-design-spec",n="Design Specs",o="Steffen",r="2026-03-12",d="Mar 12",c=null,a="Design spec for the $2,500 AI Operations Audit deliverable. Must feel premium.",i=[],l=`<h1>AI Operations Audit Deliverable: Design Spec</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-12
For Bobby. Implementation-ready. No interpretation needed.
This is the $2,500 product. It must FEEL like it costs $2,500.</p>
</blockquote>
<hr>
<h2>0. Design Philosophy</h2>
<p>McKinsey rigor meets premium tech brand. This deliverable is a long-scroll web page that reads like a board-room report but looks like it was designed by a top-tier agency. Every section earns the price tag. No filler. No generic charts. Every pixel says: &quot;We took your business seriously.&quot;</p>
<p><strong>Reference standard:</strong> Think Stripe&#39;s annual reports, Linear&#39;s changelog, or a Pentagram case study. Professional, data-rich, visually commanding.</p>
<p><strong>Two modes:</strong></p>
<ul>
<li><strong>Web mode (primary):</strong> Dark theme, matches aheadofmarket.com. Interactive elements, animations, live data.</li>
<li><strong>Print/PDF mode:</strong> Light background variant triggered by <code>@media print</code> or a &quot;Download PDF&quot; action. Same layout, inverted palette. No animations.</li>
</ul>
<hr>
<h2>1. Page Structure</h2>
<p>Single long-scroll page. 10 sections in sequence. Each section is a full-width band with controlled interior max-width.</p>
<table>
<thead>
<tr>
<th>Section</th>
<th>Name</th>
<th>Max Content Width</th>
<th>Background</th>
</tr>
</thead>
<tbody><tr>
<td>0</td>
<td>Cover Page</td>
<td><code>max-w-4xl</code> (896px)</td>
<td><code>bg-aom-night</code> (#0C0C0C)</td>
</tr>
<tr>
<td>1</td>
<td>Executive Summary</td>
<td><code>max-w-5xl</code> (1024px)</td>
<td><code>bg-aom-night</code></td>
</tr>
<tr>
<td>2</td>
<td>Current State Assessment</td>
<td><code>max-w-5xl</code></td>
<td><code>bg-aom-surface</code> (#1A1A17)</td>
</tr>
<tr>
<td>3</td>
<td>Tool &amp; System Inventory</td>
<td><code>max-w-6xl</code> (1152px)</td>
<td><code>bg-aom-night</code></td>
</tr>
<tr>
<td>4</td>
<td>Time Drain Analysis</td>
<td><code>max-w-6xl</code></td>
<td><code>bg-aom-surface</code></td>
</tr>
<tr>
<td>5</td>
<td>Automation Opportunity Map</td>
<td><code>max-w-6xl</code></td>
<td><code>bg-aom-night</code></td>
</tr>
<tr>
<td>6</td>
<td>ROI Projections</td>
<td><code>max-w-6xl</code></td>
<td><code>bg-aom-cream</code> (#FDF6EC)</td>
</tr>
<tr>
<td>7</td>
<td>Implementation Roadmap</td>
<td><code>max-w-5xl</code></td>
<td><code>bg-aom-night</code></td>
</tr>
<tr>
<td>8</td>
<td>Risk Assessment</td>
<td><code>max-w-5xl</code></td>
<td><code>bg-aom-surface</code></td>
</tr>
<tr>
<td>9</td>
<td>Recommended Next Steps + Appendix</td>
<td><code>max-w-5xl</code></td>
<td><code>bg-aom-night</code></td>
</tr>
</tbody></table>
<p><strong>Rhythm:</strong> Dark-dark-surface-dark-surface-dark-cream-dark-surface-dark. Section 6 (ROI) gets the cream break for maximum contrast on the money numbers. This is the payoff moment.</p>
<p><strong>Section spacing:</strong> <code>py-24</code> desktop, <code>py-16</code> mobile. Consistent throughout.</p>
<hr>
<h2>2. Cover Page (Section 0)</h2>
<p><strong>Layout:</strong> Full viewport height. Centered content. No scroll indicator until user scrolls.</p>
<pre><code>Structure (top to bottom, all centered):
1. AOM logo mark
2. Horizontal rule
3. Report title
4. Client name
5. Prepared date
6. Confidentiality notice
</code></pre>
<p><strong>AOM Logo:</strong></p>
<ul>
<li>&quot;AOM.&quot; in Syne ExtraBold (800), 48px</li>
<li>The period is <code>text-aom-orange</code> (#E85D26)</li>
<li>Remaining letters are <code>text-aom-text-light</code> (#F0ECE6)</li>
<li><code>mb-8</code></li>
</ul>
<p><strong>Horizontal Rule:</strong></p>
<ul>
<li>80px wide, 2px tall, <code>bg-aom-orange</code> (#E85D26)</li>
<li><code>mb-12</code></li>
</ul>
<p><strong>Report Title:</strong></p>
<ul>
<li>&quot;AI OPERATIONS AUDIT&quot;</li>
<li>Syne 800, italic, uppercase, <code>tracking-tighter</code></li>
<li>Desktop: <code>text-5xl md:text-6xl</code></li>
<li>Color: <code>#F0ECE6</code></li>
<li><code>mb-2</code></li>
</ul>
<p><strong>Report Subtitle:</strong></p>
<ul>
<li>&quot;ROADMAP &amp; RECOMMENDATIONS&quot;</li>
<li>Syne 700, uppercase, <code>tracking-[0.15em]</code></li>
<li><code>text-xl</code></li>
<li>Color: <code>#7A7267</code> (stone)</li>
<li><code>mb-16</code></li>
</ul>
<p><strong>Client Name:</strong></p>
<ul>
<li><code>[CLIENT_NAME]</code></li>
<li>Space Grotesk 600, <code>text-2xl</code></li>
<li>Color: <code>#F0ECE6</code></li>
<li><code>mb-2</code></li>
</ul>
<p><strong>Prepared Date:</strong></p>
<ul>
<li><code>Prepared [MONTH] [YEAR]</code></li>
<li>Space Grotesk 400, <code>text-base</code></li>
<li>Color: <code>#8A847C</code> (text-muted)</li>
<li><code>mb-16</code></li>
</ul>
<p><strong>Confidentiality Notice:</strong></p>
<ul>
<li>&quot;CONFIDENTIAL&quot;</li>
<li>JetBrains Mono 700, <code>text-[9px]</code>, uppercase, <code>tracking-[0.3em]</code></li>
<li>Color: <code>#8A847C</code></li>
<li>Border: <code>border border-aom-night-border px-4 py-2</code></li>
</ul>
<p><strong>Client Logo (optional):</strong></p>
<ul>
<li>If the client provides a logo, place it centered between AOM logo and the horizontal rule</li>
<li>Max height: 48px. Grayscale filter: <code>filter grayscale brightness-150</code></li>
<li>If no logo provided, omit. Don&#39;t use a placeholder.</li>
</ul>
<hr>
<h2>3. Executive Summary (Section 1)</h2>
<p>The hero section of the report. A client should be able to read ONLY this section and understand the full picture.</p>
<h3>Section Header</h3>
<p>Standard AOM section header pattern:</p>
<pre><code>Micro-label: &quot;01 / EXECUTIVE SUMMARY&quot;
- text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-text-muted mb-4
- Section number in #E85D26, slash and text in #8A847C

Orange accent line: 48px wide, 2px tall, #E85D26, mb-6

Headline: &quot;THE BIG PICTURE&quot;
- font-headline text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter text-aom-text-light
</code></pre>
<h3>Key Metrics Row (3 cards)</h3>
<p><strong>Layout:</strong> <code>grid grid-cols-3 gap-6</code> desktop, <code>grid-cols-1 gap-4</code> mobile</p>
<p>Each card is a &quot;stat card&quot;:</p>
<pre><code>Card container:
- bg-aom-night-card (#151515)
- border border-aom-night-border
- rounded-sm
- p-8
- Accent line at top: 2px, full width, color varies per card

Structure inside:
1. Metric label (mono micro-label): text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-text-muted
2. Big number: font-headline text-5xl md:text-6xl font-extrabold italic text-aom-text-light leading-none tabular-nums
3. Context line: text-aom-stone text-sm font-body mt-3
</code></pre>
<p><strong>Card 1: Total Hours Recoverable Per Week</strong></p>
<ul>
<li>Accent line: <code>#7C9A72</code> (sage)</li>
<li>Label: &quot;WEEKLY TIME RECOVERED&quot;</li>
<li>Number: <code>[XX] hrs</code></li>
<li>Context: &quot;Across [X] team members&quot;</li>
</ul>
<p><strong>Card 2: Annual Dollar Impact</strong></p>
<ul>
<li>Accent line: <code>#E85D26</code> (orange)</li>
<li>Label: &quot;PROJECTED ANNUAL VALUE&quot;</li>
<li>Number: <code>$[XXX,XXX]</code></li>
<li>Context: &quot;Time savings + revenue uplift + software savings&quot;</li>
</ul>
<p><strong>Card 3: Recommended Priority</strong></p>
<ul>
<li>Accent line: <code>#C9A84C</code> (gold)</li>
<li>Label: &quot;RECOMMENDED FIRST MOVE&quot;</li>
<li>Number: (not a number, instead a short phrase like &quot;CRM AUTOMATION&quot; in Syne 800 italic, text-3xl)</li>
<li>Context: &quot;Highest ROI opportunity identified&quot;</li>
</ul>
<h3>Summary Paragraph</h3>
<p>Below the stat cards, <code>mt-12</code>:</p>
<pre><code>Container:
- max-w-3xl
- text-aom-stone text-base font-body leading-relaxed

Content: 2-3 paragraphs summarizing findings. Space Grotesk 400, 16px, #7A7267.
Key terms or findings can be highlighted with text-aom-text-light font-semibold.
</code></pre>
<h3>Readiness Score</h3>
<p>A single visual indicator below the summary, <code>mt-12</code>:</p>
<pre><code>Container:
- bg-aom-night-card border border-aom-night-border rounded-sm p-8
- flex items-center gap-8 (horizontal on desktop, stacked on mobile)

Left side: Score ring
- SVG circle, 120px diameter
- Track: stroke #1A1A1A, 8px width
- Fill: stroke color based on score (see Color section below), 8px width
- Center text: Score number (e.g., &quot;72&quot;) in Syne 800 italic, text-4xl, #F0ECE6
- Below center: &quot;/100&quot; in Space Grotesk 400, text-sm, #8A847C

Right side: Score interpretation
- Label: &quot;AUTOMATION READINESS SCORE&quot; (mono micro-label)
- Score band name: &quot;STRONG CANDIDATE&quot; (Syne 700, text-xl, color matches ring fill)
- Description: &quot;Your business has significant automation potential with moderate implementation complexity.&quot;
  (Space Grotesk 400, text-sm, #7A7267)
</code></pre>
<p><strong>Score color bands:</strong></p>
<table>
<thead>
<tr>
<th>Range</th>
<th>Band Name</th>
<th>Color</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>80-100</td>
<td>EXCELLENT FIT</td>
<td>Sage</td>
<td><code>#7C9A72</code></td>
</tr>
<tr>
<td>60-79</td>
<td>STRONG CANDIDATE</td>
<td>Gold</td>
<td><code>#C9A84C</code></td>
</tr>
<tr>
<td>40-59</td>
<td>MODERATE POTENTIAL</td>
<td>Orange</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>20-39</td>
<td>NEEDS GROUNDWORK</td>
<td>Stone</td>
<td><code>#7A7267</code></td>
</tr>
<tr>
<td>0-19</td>
<td>NOT RECOMMENDED</td>
<td>Muted</td>
<td><code>#8A847C</code></td>
</tr>
</tbody></table>
<hr>
<h2>4. Current State Assessment (Section 2)</h2>
<h3>Section Header</h3>
<pre><code>Micro-label: &quot;02 / CURRENT STATE&quot;
Headline: &quot;WHERE YOU ARE TODAY&quot;
</code></pre>
<h3>Business Profile Card</h3>
<pre><code>Container:
- bg-aom-night-card border border-aom-night-border rounded-sm p-8 mb-8

Layout: 2-column grid (md:grid-cols-2 gap-8), single column mobile

Each data field:
- Label: mono micro-label style (text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-text-muted mb-1)
- Value: Space Grotesk 600, text-base, #F0ECE6

Fields:
- Company: [CLIENT_NAME]
- Industry: [INDUSTRY]
- Team Size: [X] people
- Annual Revenue: $[X]
- Primary Software: [list]
- Current Automation Level: [None / Basic / Moderate]
</code></pre>
<h3>Workflow Map</h3>
<p>A visual representation of how the client currently operates. Shows information flow and bottlenecks.</p>
<pre><code>Container:
- Full content width
- mt-12

Layout: Horizontal flow diagram on desktop, vertical stack on mobile.

Each workflow node:
- bg-aom-night-card border border-aom-night-border rounded-sm p-6
- Width: 180px (fixed on desktop), full-width on mobile
- Label: mono micro-label at top (e.g., &quot;LEAD COMES IN&quot;)
- Description: Space Grotesk 400, text-sm, #7A7267
- Bottleneck indicator: if flagged, left border becomes 2px solid #E85D26 and add a small &quot;BOTTLENECK&quot; badge
  - Badge: bg-aom-orange/10 text-aom-orange text-[9px] font-mono font-bold uppercase tracking-[0.2em] px-2 py-0.5

Connecting arrows between nodes:
- 2px line in #8A847C
- Arrowhead at each endpoint
- On desktop: horizontal arrows
- On mobile: vertical arrows pointing down

Bottleneck nodes get a subtle orange glow: box-shadow: 0 0 20px rgba(232,93,38,0.1)
</code></pre>
<h3>Pain Points List</h3>
<pre><code>Container: mt-12

Layout: grid grid-cols-2 gap-4 (desktop), grid-cols-1 (mobile)

Each pain point card:
- bg-aom-night border border-aom-night-border rounded-sm p-6
- flex items-start gap-4
- Left: Icon container (w-10 h-10 border border-aom-night-border bg-black/40 flex items-center justify-center)
  - Lucide icon, 18px, #E85D26 (AlertTriangle, Clock, DollarSign, Users, etc.)
- Right:
  - Title: Space Grotesk 600, text-base, #F0ECE6
  - Description: Space Grotesk 400, text-sm, #7A7267, mt-1
</code></pre>
<hr>
<h2>5. Tool &amp; System Inventory (Section 3)</h2>
<h3>Section Header</h3>
<pre><code>Micro-label: &quot;03 / TOOL INVENTORY&quot;
Headline: &quot;WHAT YOU&#39;RE RUNNING&quot;
</code></pre>
<h3>Inventory Table</h3>
<p>A data-rich table showing every tool the client uses, what it does, what it costs, and how well it&#39;s utilized.</p>
<pre><code>Table container:
- bg-aom-night-card border border-aom-night-border rounded-sm overflow-hidden
- overflow-x-auto on mobile

Header row:
- bg-aom-night
- text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-text-muted
- px-6 py-4
- border-b border-aom-night-border

Columns:
| Tool | Category | Monthly Cost | Utilization | Status | Notes |

Body rows:
- px-6 py-4
- text-aom-text-light font-body text-sm
- border-b border-aom-night-border (last row: no border)
- hover:bg-aom-night/50 transition-colors

Utilization column: Visual bar + percentage
- Bar container: w-24 h-1.5 bg-aom-night rounded-full
- Fill bar: h-full rounded-full, width proportional to utilization %
  - 70-100%: bg-aom-sage (#7C9A72) -- well used
  - 40-69%: bg-aom-gold (#C9A84C) -- underused
  - 0-39%: bg-aom-orange (#E85D26) -- poorly used
- Percentage text: font-mono text-xs ml-2, same color as bar

Status column: Dot indicator
- KEEP: 6px circle, bg-aom-sage (#7C9A72)
- REPLACE: 6px circle, bg-aom-orange (#E85D26)
- CONSOLIDATE: 6px circle, bg-aom-gold (#C9A84C)
- REMOVE: 6px circle, bg-red-500 (#EF4444)
- Label text: font-mono text-xs uppercase, same color as dot

Total row:
- bg-aom-night
- border-t-2 border-aom-orange/30
- font-headline font-bold text-base text-aom-text-light
- Shows total monthly cost and potential savings
</code></pre>
<h3>Software Spend Summary Card</h3>
<p>Below the table, <code>mt-8</code>:</p>
<pre><code>Container:
- bg-aom-night-card border border-aom-night-border rounded-sm p-8
- grid grid-cols-3 gap-6 (desktop), grid-cols-1 (mobile)

Card 1: &quot;CURRENT MONTHLY SPEND&quot;
- Big number: font-headline text-4xl font-extrabold italic text-aom-text-light
- Label: mono micro-label

Card 2: &quot;POTENTIAL SAVINGS&quot;
- Big number: same styling, color #7C9A72 (sage)
- Label: mono micro-label

Card 3: &quot;TOOLS TO CONSOLIDATE&quot;
- Big number: same styling, color #E85D26 (orange)
- Label: mono micro-label
</code></pre>
<hr>
<h2>6. Time Drain Analysis (Section 4)</h2>
<h3>Section Header</h3>
<pre><code>Micro-label: &quot;04 / TIME DRAIN ANALYSIS&quot;
Headline: &quot;WHERE YOUR TIME GOES&quot;
</code></pre>
<h3>Time Distribution Chart</h3>
<p>A horizontal stacked bar chart showing how team time breaks down.</p>
<pre><code>Chart container:
- Full content width, mt-8

Each category row:
- flex items-center gap-4 mb-4
- Label (left): w-40 text-sm font-body text-aom-text-light, text-right
- Bar (center): flex-1 h-8 bg-aom-night rounded-sm overflow-hidden relative
  - Fill: h-full, width proportional to hours, color varies by category
  - Inner text (if bar is wide enough): text-[10px] font-mono font-bold text-white/80 absolute right-2 top-1/2 -translate-y-1/2
- Hours (right): w-20 font-mono text-sm text-aom-text-muted tabular-nums

Category colors:
- Admin / Data Entry: #E85D26 (orange) -- the waste signal
- Client Communication: #C9A84C (gold)
- Scheduling: #7C9A72 (sage)
- Invoicing / Billing: #D4B85E (gold-light)
- Billable / Core Work: #F0ECE6 at 20% opacity -- this is the &quot;good&quot; time, shown as quiet
- Other: #8A847C (text-muted)
</code></pre>
<h3>Heatmap: Weekly Time Waste by Role</h3>
<p>A grid showing which roles lose the most time on which activities.</p>
<pre><code>Container:
- mt-16
- overflow-x-auto on mobile

Grid:
- Rows = team roles (or team member categories)
- Columns = activity categories
- Cells = hours lost per week

Cell styling:
- w-16 h-16 (64px square)
- rounded-sm
- flex items-center justify-center
- font-mono text-xs font-bold tabular-nums

Cell colors (intensity mapping):
- 0-2 hrs: bg-aom-night text-aom-text-muted
- 3-5 hrs: bg-aom-orange/10 text-aom-orange/60
- 6-8 hrs: bg-aom-orange/20 text-aom-orange/80
- 9-12 hrs: bg-aom-orange/30 text-aom-orange
- 13+ hrs: bg-aom-orange/50 text-white

Row labels (left): Space Grotesk 600, text-sm, #F0ECE6
Column labels (top): mono micro-label style, angled 45deg on desktop if needed

Below the heatmap:
- Legend: horizontal flex of 5 color swatches with labels
  - Each: w-4 h-4 rounded-sm inline-block + text-[10px] font-mono text-aom-text-muted ml-1 mr-4
</code></pre>
<h3>Time Drain Total Card</h3>
<pre><code>Container: mt-12, bg-aom-night-card border border-aom-night-border rounded-sm p-8 text-center

Big number: &quot;[XX] HOURS / WEEK&quot;
- font-headline text-5xl font-extrabold italic text-aom-orange
- The number that shocks. This is the headline of the section.

Subtext: &quot;Lost to tasks that don&#39;t need a human&quot;
- Space Grotesk 400, text-lg, #7A7267, mt-4
</code></pre>
<hr>
<h2>7. Automation Opportunity Map (Section 5)</h2>
<h3>Section Header</h3>
<pre><code>Micro-label: &quot;05 / AUTOMATION OPPORTUNITIES&quot;
Headline: &quot;WHAT WE&#39;D AUTOMATE&quot;
</code></pre>
<h3>Opportunity Cards</h3>
<p>Ranked list of automation opportunities, each as a detailed card.</p>
<p><strong>Layout:</strong> Single column stack. Each card is full content width. <code>gap-6</code> between cards.</p>
<pre><code>Card container:
- bg-aom-night-card border border-aom-night-border rounded-sm overflow-hidden
- hover:border-aom-night-border-hover transition-colors duration-300

Card layout: grid grid-cols-12 gap-0 (desktop), stacked on mobile

Left column (col-span-8, desktop):
- p-8
- Top row: flex items-center gap-4 mb-4
  - Priority badge: w-8 h-8 rounded-full flex items-center justify-center font-headline font-extrabold text-sm
    - Priority 1-3: bg-aom-orange text-white
    - Priority 4-6: bg-aom-gold text-aom-night
    - Priority 7+: bg-aom-night-card border border-aom-night-border text-aom-text-muted
  - Opportunity name: Syne 700, text-xl, #F0ECE6
  - Complexity badge: inline, font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-0.5
    - Low: bg-aom-sage/10 text-aom-sage border border-aom-sage/20
    - Medium: bg-aom-gold/10 text-aom-gold border border-aom-gold/20
    - High: bg-aom-orange/10 text-aom-orange border border-aom-orange/20

- Description: Space Grotesk 400, text-base, #7A7267, mt-2, max-w-2xl
- Current process: mono micro-label &quot;CURRENT&quot; then Space Grotesk 400, text-sm, #8A847C
- Automated process: mono micro-label &quot;AUTOMATED&quot; then Space Grotesk 400, text-sm, #7C9A72 (sage)

Right column (col-span-4, desktop):
- bg-aom-night p-8 border-l border-aom-night-border
- Stack of 3 mini metrics:

  Each mini metric:
  - Label: mono micro-label style
  - Value: Syne 700, text-lg, color varies

  Metric 1: &quot;TIME SAVED&quot; -- value in #7C9A72 (sage), e.g., &quot;8 hrs/wk&quot;
  Metric 2: &quot;ANNUAL VALUE&quot; -- value in #E85D26 (orange), e.g., &quot;$24,960&quot;
  Metric 3: &quot;READINESS&quot; -- value is a status indicator
    - Ready Now: text-aom-sage + dot
    - Needs Prep: text-aom-gold + dot
    - Complex: text-aom-orange + dot
</code></pre>
<h3>Impact Summary Bar</h3>
<p>Below all opportunity cards, <code>mt-12</code>:</p>
<pre><code>Container: bg-aom-night-card border border-aom-night-border rounded-sm p-8

Layout: grid grid-cols-4 gap-6 (desktop), grid-cols-2 (tablet), grid-cols-1 (mobile)

Card 1: &quot;TOTAL OPPORTUNITIES&quot;
- Number: Syne 800 italic, text-4xl, #F0ECE6
- Label: mono micro-label

Card 2: &quot;TOTAL HOURS SAVED / WEEK&quot;
- Number: Syne 800 italic, text-4xl, #7C9A72 (sage)
- Label: mono micro-label

Card 3: &quot;TOTAL ANNUAL VALUE&quot;
- Number: Syne 800 italic, text-4xl, #E85D26
- Label: mono micro-label

Card 4: &quot;AVG IMPLEMENTATION TIME&quot;
- Number: Syne 800 italic, text-4xl, #C9A84C (gold)
- Label: mono micro-label
</code></pre>
<hr>
<h2>8. ROI Projections (Section 6)</h2>
<p>This section uses the <strong>cream light theme</strong> for maximum contrast. This is the money section. It needs to pop.</p>
<h3>Section Header</h3>
<pre><code>Background: bg-aom-cream (#FDF6EC)

Micro-label: &quot;06 / ROI PROJECTIONS&quot;
- Color: #7A7267 (dark on light)

Headline: &quot;YOUR NUMBERS&quot;
- Color: #0C0C0C (near black on cream)
- font-headline text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter
</code></pre>
<h3>Primary ROI Cards (3 cards)</h3>
<pre><code>Layout: grid grid-cols-3 gap-6 (desktop), grid-cols-1 (mobile)

Card container:
- bg-white border border-aom-light-border (#D9D3CB) rounded-sm p-8
- shadow-lg

Accent line: 2px at top, color varies per card

Card 1: &quot;MONTHLY ROI&quot;
- Accent: #E85D26
- Number: Syne 800 italic, text-5xl, #E85D26
- Format: $XX,XXX
- Label: Space Grotesk 400, text-sm, #7A7267

Card 2: &quot;ANNUAL ROI&quot;
- Accent: #E85D26
- Number: Syne 800 italic, text-5xl, #0C0C0C
- Format: $XXX,XXX
- Label: same

Card 3: &quot;BREAK-EVEN&quot;
- Accent: color from score band (sage/gold/orange based on months)
- Number: Syne 800 italic, text-5xl, color from score band
- Format: X.X months
- Label: same
</code></pre>
<h3>3-Year Projection Table</h3>
<pre><code>Table container:
- bg-white border border-aom-light-border rounded-sm overflow-hidden mt-12

Header row:
- bg-aom-cream-alt (#F5EFE6)
- text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-warm-gray (#7A7267)
- px-6 py-4
- border-b border-aom-light-border

Columns: | Category | Year 1 | Year 2 | Year 3 | 3-Year Total |

Body rows:
- px-6 py-4
- text-aom-black font-body text-sm
- border-b border-aom-light-border

Dollar values:
- font-mono text-sm tabular-nums
- Positive: #0C0C0C
- Green/positive highlight: #5C7A54 (sage-muted, readable on white)
- Cost rows: #7A7267 (neutral)

Net benefit row:
- font-headline font-bold
- Positive: #5C7A54
- Negative: #DC2626

Cumulative ROI row:
- font-headline text-lg font-extrabold italic
- Color: #E85D26

Total row:
- bg-aom-cream-alt
- border-t-2 border-aom-orange/30
</code></pre>
<h3>ROI Visualization</h3>
<p>A simple line chart showing cumulative value vs. cumulative cost over 36 months.</p>
<pre><code>Chart container:
- bg-white border border-aom-light-border rounded-sm p-8 mt-8
- Height: 300px

Chart specs:
- X-axis: Months (0-36), labels every 6 months
  - font-mono text-[10px] text-aom-warm-gray
- Y-axis: Dollar values
  - font-mono text-[10px] text-aom-warm-gray
  - Format: $0, $50k, $100k, etc.

Lines:
- Cumulative value: 2px stroke, #7C9A72 (sage), with area fill at 5% opacity
- Cumulative cost: 2px stroke, #7A7267 (stone), dashed
- Break-even point: vertical dashed line at intersection, #E85D26, with label

Grid lines:
- Horizontal: 1px, #EDE7DF (cream-dark)
- Vertical: none

Legend:
- Below chart, flex items-center gap-8
- Each: 12px line swatch + text-xs font-body text-aom-warm-gray
</code></pre>
<hr>
<h2>9. Implementation Roadmap (Section 7)</h2>
<h3>Section Header</h3>
<pre><code>Micro-label: &quot;07 / IMPLEMENTATION ROADMAP&quot;
Headline: &quot;HOW WE BUILD IT&quot;
</code></pre>
<h3>Phase Timeline</h3>
<p>A Gantt-style timeline showing 3-4 implementation phases.</p>
<pre><code>Container: mt-8

Phase layout: Stack of phase cards with timeline connector

Timeline connector (left side):
- 2px vertical line, #8A847C
- Position: left edge of content (16px from container left)
- Runs full height of section

Each phase card:
- flex items-start gap-8 mb-8 relative
- Timeline dot: w-4 h-4 rounded-full, positioned on the timeline connector
  - Phase active: bg-aom-orange border-2 border-aom-night
  - Phase future: bg-aom-night-card border-2 border-aom-night-border

Card container (right of timeline):
- bg-aom-night-card border border-aom-night-border rounded-sm p-8 flex-1

Phase header:
- flex items-center justify-between mb-4
- Left: Phase label (Syne 700, text-lg, #F0ECE6)
  e.g., &quot;PHASE 1: FOUNDATION&quot;
- Right: Duration badge
  - font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1
  - bg-aom-night border border-aom-night-border text-aom-text-muted
  - e.g., &quot;WEEKS 1-2&quot;

Phase content:
- Description: Space Grotesk 400, text-base, #7A7267, mb-4
- Deliverables list:
  - Each: flex items-center gap-3
  - Check icon: 14px, #7C9A72 (sage)
  - Text: Space Grotesk 400, text-sm, #F0ECE6

Phase cost callout:
- mt-4 pt-4 border-t border-aom-night-border
- flex justify-between items-center
- &quot;Phase Investment&quot;: mono micro-label
- Amount: Syne 700, text-lg, #F0ECE6
</code></pre>
<h3>Timeline Summary Bar</h3>
<p>Below all phases, <code>mt-8</code>:</p>
<pre><code>Container: bg-aom-night-card border border-aom-night-border rounded-sm p-6

Visual bar:
- Full width, h-2 bg-aom-night rounded-full
- Divided into colored segments proportional to phase durations
  - Phase 1: #E85D26
  - Phase 2: #C9A84C
  - Phase 3: #7C9A72
  - Phase 4: #9BB593
- Labels below each segment: phase name, duration

Total duration + cost:
- Right-aligned, mt-4
- &quot;Total: [X] weeks / $[XX,XXX]&quot;
- Syne 700, text-base, #F0ECE6
</code></pre>
<hr>
<h2>10. Risk Assessment (Section 8)</h2>
<h3>Section Header</h3>
<pre><code>Micro-label: &quot;08 / RISK ASSESSMENT&quot;
Headline: &quot;WHAT COULD GO WRONG&quot;
</code></pre>
<h3>Risk Matrix Grid</h3>
<pre><code>Container:
- mt-8

2x2 matrix:
- grid grid-cols-2 gap-4 (desktop and mobile)

Axis labels:
- Y-axis (left): &quot;IMPACT&quot; running vertically, mono micro-label
  - Top: &quot;HIGH&quot;, Bottom: &quot;LOW&quot;
- X-axis (bottom): &quot;LIKELIHOOD&quot; running horizontally, mono micro-label
  - Left: &quot;LOW&quot;, Right: &quot;HIGH&quot;

Quadrant styling:
- Top-left (High impact, Low likelihood): bg-aom-gold/5 border border-aom-gold/20
  - Label: &quot;MONITOR&quot; in gold
- Top-right (High impact, High likelihood): bg-aom-orange/5 border border-aom-orange/20
  - Label: &quot;MITIGATE&quot; in orange
- Bottom-left (Low impact, Low likelihood): bg-aom-night-card border border-aom-night-border
  - Label: &quot;ACCEPT&quot; in text-muted
- Bottom-right (Low impact, High likelihood): bg-aom-sage/5 border border-aom-sage/20
  - Label: &quot;AUTOMATE AWAY&quot; in sage

Risk items placed in quadrants:
- Each: small pill with risk name
  - font-mono text-[10px] uppercase tracking-[0.15em] px-2 py-1 rounded-sm
  - bg-aom-night/80 text-aom-text-light border border-aom-night-border
</code></pre>
<h3>Risk Detail Cards</h3>
<p>Below matrix, <code>mt-12</code>:</p>
<pre><code>Layout: grid grid-cols-1 gap-4

Each risk card:
- bg-aom-night-card border border-aom-night-border rounded-sm p-6
- flex items-start gap-6

Left: Severity indicator
- w-2 h-full (full card height), rounded-full
  - Critical: bg-red-500 (#EF4444)
  - High: bg-aom-orange (#E85D26)
  - Medium: bg-aom-gold (#C9A84C)
  - Low: bg-aom-sage (#7C9A72)

Right: Content
- Risk name: Space Grotesk 600, text-base, #F0ECE6
- Description: Space Grotesk 400, text-sm, #7A7267, mt-1
- Mitigation: mono micro-label &quot;MITIGATION&quot; + Space Grotesk 400, text-sm, #7C9A72 (sage), mt-3
</code></pre>
<hr>
<h2>11. Recommended Next Steps + Appendix (Section 9)</h2>
<h3>Section Header</h3>
<pre><code>Micro-label: &quot;09 / NEXT STEPS&quot;
Headline: &quot;WHERE TO GO FROM HERE&quot;
</code></pre>
<h3>Recommendation Cards</h3>
<p><strong>Layout:</strong> Grid of 2-3 recommendation cards. <code>grid grid-cols-1 gap-6</code>.</p>
<pre><code>Card container:
- bg-aom-night-card border border-aom-night-border rounded-sm overflow-hidden

Card layout: flex (horizontal on desktop, stacked mobile)

Left side: Priority indicator
- w-16 bg-aom-orange flex items-center justify-center
- Number: Syne 800 italic, text-3xl, text-white
  - e.g., &quot;1&quot;, &quot;2&quot;, &quot;3&quot;

Right side: p-8 flex-1
- Title: Syne 700, text-xl, #F0ECE6
- Description: Space Grotesk 400, text-base, #7A7267, mt-2, max-w-2xl
- Expected outcome: mt-4, flex items-center gap-2
  - Lucide TrendingUp, 14px, #7C9A72
  - Space Grotesk 400, text-sm, #7C9A72
  - e.g., &quot;Expected: 12 hrs/week recovered, $3,600/month value&quot;
- CTA (optional): Ghost CTA style (text-aom-orange font-bold text-sm mt-3)
</code></pre>
<h3>Final CTA Block</h3>
<p>Below recommendations, <code>mt-16</code>:</p>
<pre><code>Container:
- text-center
- py-16
- border-t border-aom-night-border

Headline: &quot;READY TO BUILD?&quot;
- Syne 800 italic uppercase, text-3xl, #F0ECE6

Subhead: &quot;Let&#39;s turn this roadmap into a running system.&quot;
- Space Grotesk 400, text-lg, #7A7267, mt-4

Primary button:
- bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight text-lg px-12 py-5 mt-8
- shadow-lg shadow-aom-orange/20
- hover:bg-aom-orange-hover transition-colors
- Text: &quot;START BUILDING&quot;
- No border-radius.

Secondary text:
- mt-6, text-aom-text-muted text-sm font-body
- &quot;Questions? Email hello@aom-inhouse.com&quot;
</code></pre>
<h3>Appendix</h3>
<p>Collapsible section below the CTA:</p>
<pre><code>Container: mt-16 border-t border-aom-night-border pt-16

Section header (smaller):
- Mono micro-label: &quot;APPENDIX&quot;
- Heading: font-headline text-2xl font-extrabold italic uppercase tracking-tighter text-aom-text-light

Content areas (each collapsible via &lt;details&gt;/&lt;summary&gt;):
- Summary: Space Grotesk 600, text-base, #F0ECE6, cursor-pointer
  - flex items-center justify-between
  - Chevron icon: rotates on open
- Content: Space Grotesk 400, text-sm, #7A7267, pt-4
- Separator: border-b border-aom-night-border between items

Appendix items:
1. Methodology &amp; Data Sources
2. Detailed Calculation Assumptions
3. Industry Benchmarks Referenced
4. Terms &amp; Definitions
5. About AOM
</code></pre>
<hr>
<h2>12. Typography Quick Reference (Audit Deliverable)</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Style</th>
<th>Size (desktop)</th>
<th>Size (mobile)</th>
<th>Color (dark)</th>
<th>Color (light)</th>
</tr>
</thead>
<tbody><tr>
<td>Cover title</td>
<td>Syne</td>
<td>800</td>
<td>Italic, uppercase</td>
<td>60px (text-6xl)</td>
<td>36px (text-4xl)</td>
<td>#F0ECE6</td>
<td>n/a</td>
</tr>
<tr>
<td>Section headlines</td>
<td>Syne</td>
<td>800</td>
<td>Italic, uppercase</td>
<td>48px (text-5xl)</td>
<td>30px (text-3xl)</td>
<td>#F0ECE6</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Section numbers</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Normal</td>
<td>10px</td>
<td>10px</td>
<td>#E85D26 / #8A847C</td>
<td>#E85D26 / #7A7267</td>
</tr>
<tr>
<td>Stat big numbers</td>
<td>Syne</td>
<td>800</td>
<td>Italic</td>
<td>60px (text-6xl)</td>
<td>36px (text-4xl)</td>
<td>#F0ECE6</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Card titles</td>
<td>Syne</td>
<td>700</td>
<td>Normal</td>
<td>20px (text-xl)</td>
<td>18px (text-lg)</td>
<td>#F0ECE6</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Body text</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>16px (text-base)</td>
<td>16px</td>
<td>#7A7267</td>
<td>#7A7267</td>
</tr>
<tr>
<td>Body emphasis</td>
<td>Space Grotesk</td>
<td>600</td>
<td>Normal</td>
<td>16px</td>
<td>16px</td>
<td>#F0ECE6</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Micro-labels</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>10px</td>
<td>9px</td>
<td>#8A847C</td>
<td>#7A7267</td>
</tr>
<tr>
<td>Table headers</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>10px</td>
<td>10px</td>
<td>#8A847C</td>
<td>#7A7267</td>
</tr>
<tr>
<td>Table body</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>14px (text-sm)</td>
<td>14px</td>
<td>#F0ECE6</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Table values</td>
<td>JetBrains Mono</td>
<td>400</td>
<td>Normal</td>
<td>14px</td>
<td>14px</td>
<td>#F0ECE6</td>
<td>#0C0C0C</td>
</tr>
<tr>
<td>Badges</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>9px</td>
<td>9px</td>
<td>varies</td>
<td>varies</td>
</tr>
<tr>
<td>Disclaimers</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>12px (text-xs)</td>
<td>12px</td>
<td>#8A847C</td>
<td>#7A7267</td>
</tr>
</tbody></table>
<hr>
<h2>13. Color Usage for Data Visualization</h2>
<h3>Semantic Color Mapping (Audit-Specific)</h3>
<table>
<thead>
<tr>
<th>Meaning</th>
<th>Color</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Time savings / efficiency</td>
<td>Sage</td>
<td><code>#7C9A72</code></td>
<td>Hours recovered, readiness indicators, positive outcomes</td>
</tr>
<tr>
<td>Dollar value / ROI</td>
<td>Orange</td>
<td><code>#E85D26</code></td>
<td>Revenue impact, total value, priority badges top 3</td>
</tr>
<tr>
<td>Premium / recommended</td>
<td>Gold</td>
<td><code>#C9A84C</code></td>
<td>Gold accents on recommended items, moderate indicators</td>
</tr>
<tr>
<td>Neutral / cost</td>
<td>Stone</td>
<td><code>#7A7267</code></td>
<td>Cost columns, secondary data, neutral states</td>
</tr>
<tr>
<td>Warning / bottleneck</td>
<td>Orange</td>
<td><code>#E85D26</code></td>
<td>Bottleneck flags, high complexity, break-even &gt; 8 months</td>
</tr>
<tr>
<td>Critical risk</td>
<td>Red</td>
<td><code>#EF4444</code></td>
<td>Critical severity only. Nowhere else.</td>
</tr>
<tr>
<td>Positive confirmation</td>
<td>Sage Muted</td>
<td><code>#5C7A54</code></td>
<td>Net positive values on light backgrounds</td>
</tr>
</tbody></table>
<h3>Readiness Indicators (used in Opportunity Map)</h3>
<table>
<thead>
<tr>
<th>Status</th>
<th>Visual</th>
<th>Colors</th>
</tr>
</thead>
<tbody><tr>
<td>Ready Now</td>
<td>Filled circle + &quot;READY NOW&quot;</td>
<td>Circle: <code>bg-aom-sage</code>, Text: <code>#7C9A72</code></td>
</tr>
<tr>
<td>Needs Prep</td>
<td>Half-filled circle + &quot;NEEDS PREP&quot;</td>
<td>Circle: <code>bg-aom-gold</code>, Text: <code>#C9A84C</code></td>
</tr>
<tr>
<td>Complex</td>
<td>Empty circle + &quot;COMPLEX&quot;</td>
<td>Circle: <code>border-aom-orange bg-transparent</code>, Text: <code>#E85D26</code></td>
</tr>
</tbody></table>
<hr>
<h2>14. Print / PDF Mode</h2>
<p>Triggered by <code>@media print</code> CSS rules OR a &quot;Download PDF&quot; button that applies a <code>.print-mode</code> class to the body.</p>
<h3>Key Inversions</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Web (Dark)</th>
<th>Print (Light)</th>
</tr>
</thead>
<tbody><tr>
<td>Page background</td>
<td><code>#0C0C0C</code></td>
<td><code>#FFFFFF</code></td>
</tr>
<tr>
<td>Card background</td>
<td><code>#151515</code></td>
<td><code>#FFFFFF</code></td>
</tr>
<tr>
<td>Surface background</td>
<td><code>#1A1A17</code></td>
<td><code>#F9F8F6</code></td>
</tr>
<tr>
<td>Primary text</td>
<td><code>#F0ECE6</code></td>
<td><code>#1A1A1A</code></td>
</tr>
<tr>
<td>Secondary text</td>
<td><code>#7A7267</code></td>
<td><code>#6B6560</code></td>
</tr>
<tr>
<td>Muted text</td>
<td><code>#8A847C</code></td>
<td><code>#9A9189</code></td>
</tr>
<tr>
<td>Borders</td>
<td><code>rgba(255,255,255,0.10)</code></td>
<td><code>#E5E0DB</code></td>
</tr>
<tr>
<td>Orange accent</td>
<td><code>#E85D26</code> (unchanged)</td>
<td><code>#E85D26</code> (unchanged)</td>
</tr>
<tr>
<td>Sage accent</td>
<td><code>#7C9A72</code> (unchanged)</td>
<td><code>#7C9A72</code> (unchanged)</td>
</tr>
<tr>
<td>Gold accent</td>
<td><code>#C9A84C</code> (unchanged)</td>
<td><code>#C9A84C</code> (unchanged)</td>
</tr>
</tbody></table>
<h3>Print-Specific Rules</h3>
<pre><code class="language-css">@media print {
  /* Force page breaks before each section */
  [data-section] { page-break-before: always; }
  [data-section=&quot;0&quot;] { page-break-before: auto; } /* Cover page is first */

  /* Remove hover effects, animations, shadows */
  * { transition: none !important; animation: none !important; box-shadow: none !important; }

  /* Ensure charts/tables don&#39;t split across pages */
  table, .chart-container, .card { page-break-inside: avoid; }

  /* Hide interactive elements */
  .cta-button, .collapsible-trigger { display: none; }

  /* AOM logo in print: dark version */
  .aom-logo { color: #1A1A1A; }
  .aom-logo .dot { color: #E85D26; }

  /* Page margins */
  @page { margin: 0.75in; size: letter; }

  /* Footer on every page */
  @page { @bottom-center { content: &quot;Confidential | AOM | aheadofmarket.com&quot;; font-size: 8px; color: #9A9189; } }
}
</code></pre>
<h3>PDF Download Button</h3>
<p>Position: fixed bottom-right corner, or in a sticky top bar.</p>
<pre><code>Button:
- bg-aom-night-card border border-aom-night-border rounded-sm px-4 py-2
- flex items-center gap-2
- Lucide Download icon, 16px, #F0ECE6
- Text: &quot;Download PDF&quot; in Space Grotesk 600, text-sm, #F0ECE6
- hover:border-aom-night-border-hover transition-colors
- Triggers window.print() or a dedicated PDF generation library
</code></pre>
<hr>
<h2>15. Client Personalization Points</h2>
<p>Every instance of dynamic client data that Bobby needs to template:</p>
<table>
<thead>
<tr>
<th>Placeholder</th>
<th>Location</th>
<th>Example Value</th>
</tr>
</thead>
<tbody><tr>
<td><code>[CLIENT_NAME]</code></td>
<td>Cover page, Business Profile, headers</td>
<td>&quot;Ambition Mechanical&quot;</td>
</tr>
<tr>
<td><code>[CLIENT_LOGO]</code></td>
<td>Cover page (optional)</td>
<td>Logo URL or null</td>
</tr>
<tr>
<td><code>[PREPARED_DATE]</code></td>
<td>Cover page</td>
<td>&quot;March 2026&quot;</td>
</tr>
<tr>
<td><code>[INDUSTRY]</code></td>
<td>Business Profile, section content</td>
<td>&quot;Construction / Trades&quot;</td>
</tr>
<tr>
<td><code>[TEAM_SIZE]</code></td>
<td>Business Profile, calculations</td>
<td>&quot;12 people&quot;</td>
</tr>
<tr>
<td><code>[ANNUAL_REVENUE]</code></td>
<td>Business Profile</td>
<td>&quot;$1,200,000&quot;</td>
</tr>
<tr>
<td><code>[READINESS_SCORE]</code></td>
<td>Executive Summary ring</td>
<td>&quot;72&quot;</td>
</tr>
<tr>
<td><code>[READINESS_BAND]</code></td>
<td>Executive Summary</td>
<td>&quot;STRONG CANDIDATE&quot;</td>
</tr>
<tr>
<td><code>[TOTAL_HOURS_RECOVERED]</code></td>
<td>Exec Summary, Time Drain</td>
<td>&quot;34 hrs&quot;</td>
</tr>
<tr>
<td><code>[ANNUAL_VALUE]</code></td>
<td>Exec Summary, ROI</td>
<td>&quot;$186,000&quot;</td>
</tr>
<tr>
<td><code>[TOP_OPPORTUNITY]</code></td>
<td>Exec Summary</td>
<td>&quot;CRM AUTOMATION&quot;</td>
</tr>
<tr>
<td><code>[TOOLS_LIST]</code></td>
<td>Tool Inventory table</td>
<td>Array of tool objects</td>
</tr>
<tr>
<td><code>[PAIN_POINTS]</code></td>
<td>Current State</td>
<td>Array of pain objects</td>
</tr>
<tr>
<td><code>[WORKFLOW_NODES]</code></td>
<td>Workflow Map</td>
<td>Array of node objects</td>
</tr>
<tr>
<td><code>[TIME_CATEGORIES]</code></td>
<td>Time Drain chart</td>
<td>Array of category objects</td>
</tr>
<tr>
<td><code>[OPPORTUNITIES]</code></td>
<td>Automation Map</td>
<td>Array of opportunity objects</td>
</tr>
<tr>
<td><code>[ROI_NUMBERS]</code></td>
<td>ROI section</td>
<td>Object with monthly/annual/breakeven</td>
</tr>
<tr>
<td><code>[PHASES]</code></td>
<td>Implementation Roadmap</td>
<td>Array of phase objects</td>
</tr>
<tr>
<td><code>[RISKS]</code></td>
<td>Risk Assessment</td>
<td>Array of risk objects</td>
</tr>
<tr>
<td><code>[RECOMMENDATIONS]</code></td>
<td>Next Steps</td>
<td>Array of recommendation objects</td>
</tr>
</tbody></table>
<hr>
<h2>16. Animation Specs (Web Mode Only)</h2>
<h3>Page Load</h3>
<pre><code>Cover page: immediate render, no animation (it&#39;s the first thing they see)

All subsequent sections: standard AOM scroll reveal
- opacity 0 -&gt; 1, translateY 30px -&gt; 0px
- Duration: 700ms
- Easing: ease-out
- Trigger: IntersectionObserver, threshold 0.1
</code></pre>
<h3>Stat Cards</h3>
<pre><code>Stagger entry: 120ms between cards
Number count-up: 0 to final value, 1200ms, ease-out
Start when card enters viewport
</code></pre>
<h3>Readiness Score Ring</h3>
<pre><code>Ring fill animates from 0% to score percentage
Duration: 1500ms
Easing: ease-out
Start when ring enters viewport
Clockwise fill starting from top (12 o&#39;clock position)
</code></pre>
<h3>Charts and Bars</h3>
<pre><code>Horizontal bars: width animates from 0% to final width
Duration: 800ms per bar
Stagger: 80ms between bars
Easing: ease-out

Line chart: SVG path draws from left to right
Duration: 2000ms
Easing: ease-in-out
</code></pre>
<h3>Heatmap</h3>
<pre><code>Cells fade in with stagger
Rows stagger: 100ms
Cells within row stagger: 40ms
Duration per cell: 300ms
Easing: ease-out
</code></pre>
<h3>Reduced Motion</h3>
<pre><code>@media (prefers-reduced-motion: reduce) {
  All animations: instant, no transition
  Number count-up: skip, show final value
  Ring fill: skip, show final state
  Chart draw: skip, show final state
}
</code></pre>
<hr>
<h2>17. Page Background Layers</h2>
<p>Match the existing AOM atmospheric treatment.</p>
<pre><code>Layer 1: Base background
- Section-specific (night, surface, or cream per Section 1 table)

Layer 2: Noise/grain texture overlay
- SVG filter: fractalNoise
- Opacity: 0.03
- Mix-blend-mode: overlay
- Full page coverage, fixed position
- ONLY on dark sections. Not on the cream ROI section.

Layer 3: Subtle orange gradient wash
- Opacity: 0.02
- bg-gradient-to-b from-transparent via-orange-500/5 to-transparent
- Positioned behind Sections 5 (Automation Map) and 9 (Next Steps) for warmth

Print mode: All background layers removed. White only.
</code></pre>
<hr>
<h2>18. Responsive Breakpoints</h2>
<table>
<thead>
<tr>
<th>Breakpoint</th>
<th>Width</th>
<th>Key Layout Changes</th>
</tr>
</thead>
<tbody><tr>
<td>Default (mobile)</td>
<td>&lt; 768px</td>
<td>Single column everything. Cards stack. Tables scroll horizontally. Timeline vertical.</td>
</tr>
<tr>
<td>md</td>
<td>&gt;= 768px</td>
<td>2-column grids where specified. Stat cards 3-col. Opportunity cards keep 12-col grid.</td>
</tr>
<tr>
<td>lg</td>
<td>&gt;= 1024px</td>
<td>Full layouts. Heatmap visible without scroll. Charts at full width.</td>
</tr>
<tr>
<td>xl</td>
<td>&gt;= 1280px</td>
<td>More breathing room. No structural changes from lg.</td>
</tr>
</tbody></table>
<h3>Mobile-Specific Adjustments</h3>
<ul>
<li>All body text: 16px minimum. No exceptions.</li>
<li>Section headlines: <code>text-3xl</code> (from <code>text-5xl</code> on desktop)</li>
<li>Stat big numbers: <code>text-4xl</code> (from <code>text-6xl</code>)</li>
<li>Card padding: <code>p-6</code> (from <code>p-8</code>)</li>
<li>Section spacing: <code>py-16</code> (from <code>py-24</code>)</li>
<li>Touch targets: 44px minimum on all interactive elements</li>
<li>Tables: <code>overflow-x-auto</code> wrapper, minimum column widths enforced</li>
<li>Workflow map: vertical stack with downward arrows</li>
<li>Risk matrix: still 2x2 but cells smaller, text wraps</li>
<li>Phase timeline: dots on left, cards full width</li>
</ul>
<hr>
<h2>19. Accessibility</h2>
<ul>
<li>All images/charts have descriptive <code>alt</code> text or <code>aria-label</code></li>
<li>SVG charts include <code>role=&quot;img&quot;</code> and <code>aria-label</code> with data summary</li>
<li>Color is never the ONLY indicator (always paired with text, shape, or position)</li>
<li>All contrast ratios pass WCAG AA:<ul>
<li>#F0ECE6 on #0C0C0C = 17.8:1 (AAA)</li>
<li>#7A7267 on #0C0C0C = 4.6:1 (AA)</li>
<li>#8A847C on #0C0C0C = 5.1:1 (AA)</li>
<li>#E85D26 on #0C0C0C = 5.0:1 (AA)</li>
<li>#0C0C0C on #FDF6EC = 18.5:1 (AAA)</li>
<li>#7A7267 on #FDF6EC = 3.9:1 (AA Large Text for body at 16px+)</li>
</ul>
</li>
<li>Section navigation: anchor links at top of page for screen reader quick-nav</li>
<li>Print mode fully accessible (no color-only data)</li>
<li><code>aria-live=&quot;polite&quot;</code> on any dynamically loaded content</li>
<li>Semantic HTML: <code>&lt;section&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;table&gt;</code>, <code>&lt;figure&gt;</code>, proper heading hierarchy (h1 on cover, h2 per section, h3 for subsections)</li>
</ul>
<hr>
<h2>20. Navigation Sidebar (Sticky, Optional)</h2>
<p>For longer reports, a sticky sidebar helps navigation.</p>
<pre><code>Position: fixed left-0 top-1/2 -translate-y-1/2 (desktop only, hidden on mobile)
Width: 200px
Background: bg-aom-night/90 backdrop-blur-sm border-r border-aom-night-border

Content: List of section links
Each link:
- py-2 px-4
- font-mono text-[10px] uppercase tracking-[0.15em]
- Default: text-aom-text-muted
- Active (current section in view): text-aom-orange, left border 2px solid #E85D26
- Hover: text-aom-text-light

Scroll behavior: smooth scroll to section on click
Active state: tracked via IntersectionObserver on section elements

Mobile alternative: Horizontal scrollable chip bar at top
- position: sticky top-0 z-50
- bg-aom-night/95 backdrop-blur-sm
- flex overflow-x-auto gap-2 px-4 py-3
- Each chip: px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em] rounded-full
  - Default: bg-aom-night-card border border-aom-night-border text-aom-text-muted
  - Active: bg-aom-orange text-white border-aom-orange
</code></pre>
<hr>
<p><em>Spec complete. Bobby builds from this without interpretation. Every hex value, every class, every animation timing is defined. This deliverable is the $2,500 handshake with every audit client. Make it count.</em></p>
<p><em>Steffen out.</em></p>
`,s={title:t,slug:e,category:n,agent:o,date:r,dateFormatted:d,updated:null,summary:a,tags:i,content:l};export{o as agent,n as category,l as content,r as date,d as dateFormatted,s as default,e as slug,a as summary,i as tags,t as title,c as updated};
