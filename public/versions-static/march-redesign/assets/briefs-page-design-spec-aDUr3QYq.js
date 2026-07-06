const t="/briefs Page Accordion Reorg Spec",e="briefs-page-design-spec",n="Design Specs",o="Steffen",r="2026-03-12",i="Mar 12",s=null,d="Design spec for reorganizing the /briefs page with accordion categories.",a=[],l=`<h1>/briefs Page Accordion Reorg: Design Spec</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-12
For Bobby. Implementation-ready. No interpretation needed.
Scope: /briefs page only. Nothing else.</p>
</blockquote>
<hr>
<h2>1. Page Overview</h2>
<p>Replace the current flat card grid on /briefs with an accordion-by-category layout. 8 categories. Each category is a collapsible row that expands to show its items. The page becomes a scannable index of every brief, report, spec, and audit AOM has published.</p>
<p><strong>Current state:</strong> 10 brief cards in a 3-column grid + 3 &quot;Also Available&quot; cards. No categories, no grouping, no filtering. As the brief count grows, this layout breaks.</p>
<p><strong>New state:</strong> 8 category accordions stacked vertically. Each shows category name + item count. Expands to reveal individual brief items. Items link to their existing brief pages. Auto-generated from frontmatter.</p>
<hr>
<h2>2. The 8 Categories</h2>
<table>
<thead>
<tr>
<th>#</th>
<th>Category Name</th>
<th>Description</th>
<th>Expected Items</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>Strategy</td>
<td>Business strategy, growth plans, offer positioning</td>
<td>Partnership Strategy, Growth Plan</td>
</tr>
<tr>
<td>2</td>
<td>Design Specs</td>
<td>Visual specs for Bobby to build</td>
<td>Full-Screen Site, Ideas Tracker, Audit Onboarding, ROI Calculator</td>
</tr>
<tr>
<td>3</td>
<td>Audits</td>
<td>System audits, velocity audits, security reviews</td>
<td>Masterplan Audit, Build Velocity, Security Architecture</td>
</tr>
<tr>
<td>4</td>
<td>Client Reports</td>
<td>Client-facing deliverables, health scans, proposals</td>
<td>(future: client health, proposal pages)</td>
</tr>
<tr>
<td>5</td>
<td>Outreach</td>
<td>Email strategy, outreach plans, market research</td>
<td>Outreach Plan, HVAC Ads Research</td>
</tr>
<tr>
<td>6</td>
<td>Technical</td>
<td>Infrastructure, architecture, system internals</td>
<td>Security Architecture (also in Audits if cross-listed)</td>
</tr>
<tr>
<td>7</td>
<td>Content</td>
<td>Content briefs, video specs, social strategy</td>
<td>(future: Crown spec, social templates)</td>
</tr>
<tr>
<td>8</td>
<td>Council</td>
<td>Multi-agent council briefs and sprint plans</td>
<td>AI Advisory Sprint Plan, AI Advisory Strategy, Briefs Reorg</td>
</tr>
</tbody></table>
<p><strong>Display order:</strong> As listed above. Strategy first (business-facing), Council last (internal). This is fixed, not alphabetical.</p>
<hr>
<h2>3. Page Structure</h2>
<h3>3.1 Page Background</h3>
<ul>
<li>Full page: <code>bg-aom-night</code> (#0C0C0C)</li>
<li>No section background alternation. One continuous dark surface.</li>
</ul>
<h3>3.2 Layout Zones</h3>
<pre><code>+----------------------------------------------------------+
|  [AOM link]                                               |
|                                                           |
|  STRATEGY + RESEARCH  (micro-label)                       |
|  ______  (orange bar)                                     |
|  BRIEFS  (headline)                                       |
|  Subtitle text...                                         |
|                                                           |
|  [Search input]                                           |
|                                                           |
+----------------------------------------------------------+
|                                                           |
|  &gt; Strategy                                    4 briefs   |
|  -----------------------------------------------         |
|  &gt; Design Specs                                5 briefs   |
|  -----------------------------------------------         |
|  &gt; Audits                                      3 briefs   |
|  -----------------------------------------------         |
|  v Client Reports                              2 briefs   |
|    |  Client Health Scan #4      Paige   Mar 12           |
|    |  ISA Energy Proposal        Alex    Mar 11           |
|  -----------------------------------------------         |
|  &gt; Outreach                                    2 briefs   |
|  -----------------------------------------------         |
|  &gt; Technical                                   1 brief    |
|  -----------------------------------------------         |
|  &gt; Content                                     0 briefs   |
|  -----------------------------------------------         |
|  &gt; Council                                     3 briefs   |
|                                                           |
+----------------------------------------------------------+
|  AOM footer                                               |
+----------------------------------------------------------+
</code></pre>
<hr>
<h2>4. Header Section</h2>
<p>Reuse the existing header pattern. Keep it identical to current BriefsHub hero.</p>
<p><strong>Container:</strong></p>
<ul>
<li><code>max-w-5xl mx-auto</code></li>
<li>Padding: <code>py-20 md:py-32 px-6 md:px-12</code></li>
</ul>
<p><strong>AOM back link:</strong></p>
<ul>
<li>Same as current: <code>font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light</code></li>
<li><code>mb-12</code></li>
</ul>
<p><strong>Micro-label:</strong></p>
<ul>
<li>Text: &quot;STRATEGY + RESEARCH&quot;</li>
<li><code>text-xs font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-4</code></li>
</ul>
<p><strong>Orange bar:</strong></p>
<ul>
<li><code>w-12 h-[2px] bg-aom-orange mb-4</code></li>
</ul>
<p><strong>Headline:</strong></p>
<ul>
<li>Text: &quot;BRIEFS&quot;</li>
<li><code>font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6</code></li>
</ul>
<p><strong>Subtitle:</strong></p>
<ul>
<li>Text: &quot;Strategy briefs, market research, and system audits from AOM&#39;s agent system. Each deliverable is produced by a specialized agent, reviewed, and published.&quot;</li>
<li><code>font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch]</code></li>
</ul>
<p><strong>Entry animation:</strong> Same as current. <code>fadeUp</code> with staggered delays (0, 0.05, 0.1, 0.15, 0.2).</p>
<hr>
<h2>5. Search/Filter Bar</h2>
<p>Sits between the header and the accordion list.</p>
<p><strong>Container:</strong></p>
<ul>
<li><code>max-w-5xl mx-auto px-6 md:px-12 pb-8</code></li>
</ul>
<p><strong>Input field:</strong></p>
<ul>
<li>Full width within container</li>
<li>Background: <code>bg-aom-surface</code> (#1A1A17)</li>
<li>Border: <code>border border-white/10</code></li>
<li>Border focus: <code>focus:border-aom-orange/40 focus:outline-none</code></li>
<li>Text: <code>font-body text-base text-aom-text-light</code></li>
<li>Placeholder: &quot;Search briefs...&quot; in <code>text-aom-text-muted</code></li>
<li>Padding: <code>px-5 py-4</code></li>
<li>Corner radius: <code>rounded-none</code> (square, per brand)</li>
<li>Transition: <code>transition-colors duration-300</code></li>
</ul>
<p><strong>Behavior:</strong></p>
<ul>
<li>Client-side filter only. No server calls.</li>
<li>Filters on: title, agent name, category name, summary text.</li>
<li>As user types, categories that have zero matching items collapse and hide (with <code>opacity-0 h-0 overflow-hidden</code> transition, 300ms).</li>
<li>Categories with matches auto-expand.</li>
<li>If search is empty, restore all categories to their previous open/closed state.</li>
<li>Debounce input by 150ms to prevent jank.</li>
</ul>
<p><strong>No dropdown filters, no tag pills, no sort options.</strong> Just the single search input. Keep it simple.</p>
<hr>
<h2>6. Accordion Section</h2>
<h3>6.1 Container</h3>
<ul>
<li><code>max-w-5xl mx-auto px-6 md:px-12 pb-16 md:pb-24</code></li>
</ul>
<h3>6.2 Category Row (Collapsed State)</h3>
<p>Each category is a full-width row.</p>
<p><strong>Layout:</strong> Flex row, space-between, vertically centered.</p>
<pre><code>[Chevron 16px]  [Category Name]                    [Item Count]
</code></pre>
<p><strong>Background:</strong> <code>bg-transparent</code> (no card background in collapsed state)
<strong>Border bottom:</strong> <code>border-b border-white/10</code> between each category
<strong>Padding:</strong> <code>py-5 px-0</code>
<strong>Cursor:</strong> <code>cursor-pointer</code>
<strong>Hover:</strong> Entire row. Background shifts to <code>bg-white/[0.02]</code>. Transition <code>duration-200</code>.</p>
<p><strong>Chevron icon:</strong></p>
<ul>
<li>Lucide <code>ChevronRight</code>, 16px</li>
<li>Color: <code>text-aom-text-muted</code></li>
<li>Rotates 90deg clockwise when expanded</li>
<li>Rotation transition: <code>transform duration-300 ease-out</code></li>
<li><code>mr-4</code> gap between chevron and category name</li>
</ul>
<p><strong>Category name:</strong></p>
<ul>
<li><code>font-headline text-lg font-bold text-aom-text-light</code></li>
<li>18px (text-lg)</li>
<li>Uppercase: NO. Sentence case. &quot;Strategy&quot;, not &quot;STRATEGY&quot;. The page headline is uppercase. Category names are not. Hierarchy.</li>
</ul>
<p><strong>Item count:</strong></p>
<ul>
<li><code>font-body text-sm text-aom-sage</code></li>
<li>Color: <code>#7C9A72</code> (sage)</li>
<li>Format: &quot;4 briefs&quot; or &quot;1 brief&quot; (singular/plural)</li>
<li>Right-aligned via flex <code>ml-auto</code></li>
</ul>
<p><strong>Active state (when expanded):</strong></p>
<ul>
<li>Left border: <code>border-l-2 border-aom-orange</code> (#E85D26)</li>
<li>Padding-left adjusts: <code>pl-4</code> (to accommodate the left border without shifting content)</li>
<li>Category name color stays <code>text-aom-text-light</code> (no change)</li>
<li>Chevron rotates to point down (90deg)</li>
<li>Bottom border removed while expanded (items continue the visual block)</li>
</ul>
<h3>6.3 Category Row (Expanded State / Items List)</h3>
<p>When a category expands, items appear below the header row.</p>
<p><strong>Items container:</strong></p>
<ul>
<li><code>pl-8</code> (indent from left, aligning items under the category name, past the chevron)</li>
<li><code>pb-4</code> (breathing room before the next category border)</li>
<li><code>border-l-2 border-aom-orange</code> continues from the header into the items list (one continuous orange line)</li>
</ul>
<p><strong>Individual item row:</strong></p>
<pre><code>[Title]                              [Agent]    [Date]
</code></pre>
<p><strong>Layout:</strong> Flex row with the title taking available space, agent and date right-aligned.</p>
<p><strong>Item link:</strong> Each row is an <code>&lt;a&gt;</code> tag linking to the brief&#39;s page (<code>/briefs/ai-advisory</code>, etc.)</p>
<p><strong>Item padding:</strong> <code>py-3 px-4</code>
<strong>Item hover:</strong> <code>bg-white/[0.03]</code> background. Transition <code>duration-200</code>.
<strong>Item border:</strong> No borders between items. The spacing + hover state is enough separation.</p>
<p><strong>Title:</strong></p>
<ul>
<li><code>font-body text-base font-medium text-aom-text-light</code></li>
<li>16px</li>
<li>Color: <code>#F0ECE6</code> (text-light)</li>
<li>Hover: <code>text-aom-orange</code> transition <code>duration-200</code></li>
<li><code>flex-1 min-w-0 truncate</code> (truncate if too long on mobile)</li>
</ul>
<p><strong>Agent tag:</strong></p>
<ul>
<li><code>font-mono text-xs text-aom-sage</code></li>
<li>Color: <code>#7C9A72</code> (sage)</li>
<li><code>ml-4</code> spacing from title</li>
<li><code>shrink-0</code> (never wraps)</li>
<li>Shows agent name only: &quot;Steve&quot;, &quot;Elon&quot;, &quot;Steffen&quot;, &quot;Alex&quot;, &quot;Jacob&quot;, &quot;Council&quot;</li>
</ul>
<p><strong>Date:</strong></p>
<ul>
<li><code>font-body text-xs text-aom-text-muted</code></li>
<li>Color: <code>#8A847C</code> (text-muted)</li>
<li><code>ml-4</code> spacing from agent</li>
<li><code>shrink-0</code></li>
<li>Format: &quot;Mar 10&quot; (abbreviated month + day, no year unless different year)</li>
</ul>
<h3>6.4 Item Summary (Secondary Expand)</h3>
<p>Each item row has an optional summary that appears on click/tap of a small expand icon, OR on hover for desktop.</p>
<p><strong>Desktop behavior:</strong></p>
<ul>
<li>Hover on an item row for 400ms reveals summary below the title line.</li>
<li>Summary: <code>font-body text-sm text-white/40 leading-relaxed mt-1</code></li>
<li>Max 2 lines. Truncate with <code>line-clamp-2</code> if longer.</li>
<li>Fade in: <code>opacity-0 to opacity-100</code>, <code>duration-200</code>.</li>
<li>Summary disappears when hover leaves.</li>
</ul>
<p><strong>Mobile behavior:</strong></p>
<ul>
<li>No hover. Tap the item row to toggle summary visibility.</li>
<li>Same styling as desktop summary.</li>
<li>Tap again to collapse. Tapping the title area navigates to the brief page. Tapping the right side (agent/date area) toggles summary.</li>
</ul>
<p><strong>Alternative (simpler, Bobby&#39;s call):</strong> Skip hover-summary entirely. Just navigate on click. The brief pages already have full content. The summary exists in the data for search filtering but doesn&#39;t need to render. Bobby can implement whichever is cleaner. If in doubt, skip it.</p>
<hr>
<h2>7. Expand/Collapse Animation</h2>
<p><strong>Duration:</strong> 300ms
<strong>Easing:</strong> <code>ease-out</code> (CSS) or <code>easeOut</code> (framer-motion)
<strong>Method:</strong> Animate <code>max-height</code> from 0 to calculated content height. Or use framer-motion <code>AnimatePresence</code> with <code>height: &quot;auto&quot;</code> and <code>opacity</code>.</p>
<p><strong>Recommended approach (framer-motion, already in the project):</strong></p>
<pre><code>&lt;AnimatePresence&gt;
  {isOpen &amp;&amp; (
    &lt;motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: &quot;auto&quot;, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: &quot;easeOut&quot; }}
      style={{ overflow: &quot;hidden&quot; }}
    &gt;
      {/* items list */}
    &lt;/motion.div&gt;
  )}
&lt;/AnimatePresence&gt;
</code></pre>
<p><strong>Chevron rotation:</strong> <code>transition-transform duration-300</code> with <code>rotate-90</code> when open.</p>
<p><strong>Multiple open:</strong> Yes. Multiple categories can be open at the same time. This is NOT single-select accordion. Closing one does not close others.</p>
<p><strong>Default state on page load:</strong> All categories collapsed. No category opens automatically.</p>
<p><strong>Exception:</strong> If the URL has a hash (<code>/briefs#strategy</code>), auto-open that category and scroll to it.</p>
<hr>
<h2>8. Mobile Responsive Behavior</h2>
<h3>Breakpoints</h3>
<table>
<thead>
<tr>
<th>Breakpoint</th>
<th>Width</th>
<th>Behavior</th>
</tr>
</thead>
<tbody><tr>
<td>Mobile</td>
<td>&lt; 640px (sm)</td>
<td>Full stack, touch targets, compact spacing</td>
</tr>
<tr>
<td>Tablet</td>
<td>640-1024px (sm-lg)</td>
<td>Same as mobile layout, slightly more padding</td>
</tr>
<tr>
<td>Desktop</td>
<td>&gt; 1024px (lg)</td>
<td>Full layout as described above</td>
</tr>
</tbody></table>
<h3>Mobile Specifics</h3>
<p><strong>Header:</strong></p>
<ul>
<li>Headline: <code>text-4xl</code> (stays same, already responsive in current code)</li>
<li>Padding: <code>py-20 px-6</code></li>
</ul>
<p><strong>Search input:</strong></p>
<ul>
<li>Same full width. <code>py-4 px-4</code>.</li>
</ul>
<p><strong>Category rows:</strong></p>
<ul>
<li><code>py-5 px-0</code> (same)</li>
<li>Touch target: entire row is tappable. Minimum 48px height (already met with py-5 + text-lg).</li>
<li>Chevron stays left, count stays right.</li>
</ul>
<p><strong>Item rows:</strong></p>
<ul>
<li><code>pl-4</code> instead of <code>pl-8</code> (less indent on mobile)</li>
<li><code>py-4</code> instead of <code>py-3</code> (larger touch targets)</li>
<li>Layout shifts: stack title above agent+date instead of inline.</li>
</ul>
<pre><code>Mobile item layout:
[Title]
[Agent]  [Date]
</code></pre>
<ul>
<li>Title: <code>text-base</code>, full width, no truncation (wraps)</li>
<li>Agent + Date: flex row below title, <code>mt-1</code>, <code>text-xs</code></li>
<li>Minimum item row height: 48px (touch target compliance)</li>
</ul>
<p><strong>Category name:</strong> stays <code>text-lg</code> (18px). No reduction.</p>
<p><strong>Item count:</strong> stays visible. Never hidden.</p>
<hr>
<h2>9. Frontmatter System (Auto-Generation)</h2>
<h3>How New Briefs Get Added</h3>
<p>Bobby should NOT hardcode the briefs array. Replace the current hardcoded <code>briefs</code> and <code>existingPages</code> arrays with a build-time generated JSON index.</p>
<h3>Frontmatter Format</h3>
<p>Each brief page&#39;s source file (JSX or MDX) includes a comment block at the top OR a separate <code>briefs-index.json</code> file that Bobby maintains.</p>
<p><strong>Recommended: <code>briefs-index.json</code> in <code>src/data/</code></strong></p>
<pre><code class="language-json">[
  {
    &quot;title&quot;: &quot;AI Advisory Services Strategy&quot;,
    &quot;path&quot;: &quot;/briefs/ai-advisory&quot;,
    &quot;category&quot;: &quot;Strategy&quot;,
    &quot;agent&quot;: &quot;Steve&quot;,
    &quot;date&quot;: &quot;2026-03-10&quot;,
    &quot;summary&quot;: &quot;How AOM turns its internal AI system into a sellable product.&quot;
  },
  {
    &quot;title&quot;: &quot;Partnership Strategy&quot;,
    &quot;path&quot;: &quot;/briefs/partnerships&quot;,
    &quot;category&quot;: &quot;Strategy&quot;,
    &quot;agent&quot;: &quot;Alex&quot;,
    &quot;date&quot;: &quot;2026-03-10&quot;,
    &quot;summary&quot;: &quot;Why partnerships beat cold email. 30+ specific targets.&quot;
  },
  {
    &quot;title&quot;: &quot;Full-Screen Site Redesign&quot;,
    &quot;path&quot;: &quot;/briefs/fullscreen-site&quot;,
    &quot;category&quot;: &quot;Design Specs&quot;,
    &quot;agent&quot;: &quot;Steffen&quot;,
    &quot;date&quot;: &quot;2026-03-11&quot;,
    &quot;summary&quot;: &quot;8-slide scroll-snap pitch deck experience.&quot;
  }
]
</code></pre>
<p><strong>Required fields per entry:</strong></p>
<ul>
<li><code>title</code> (string) -- Brief title</li>
<li><code>path</code> (string) -- Route path, must start with <code>/</code></li>
<li><code>category</code> (string) -- One of the 8 categories, exact match</li>
<li><code>agent</code> (string) -- Agent name</li>
<li><code>date</code> (string) -- ISO date format YYYY-MM-DD</li>
<li><code>summary</code> (string) -- 1-2 sentences, used for search and optional hover display</li>
</ul>
<p><strong>Adding a new brief:</strong></p>
<ol>
<li>Build the brief page (new JSX file, add route)</li>
<li>Add an entry to <code>briefs-index.json</code> with all 6 fields</li>
<li>The accordion auto-picks it up. No other code changes.</li>
</ol>
<p><strong>Category assignment for existing briefs:</strong></p>
<table>
<thead>
<tr>
<th>Brief</th>
<th>Category</th>
</tr>
</thead>
<tbody><tr>
<td>AI Advisory Services Strategy</td>
<td>Strategy</td>
</tr>
<tr>
<td>Partnership Strategy</td>
<td>Strategy</td>
</tr>
<tr>
<td>Growth Plan</td>
<td>Strategy</td>
</tr>
<tr>
<td>Masterplan System Audit</td>
<td>Audits</td>
</tr>
<tr>
<td>Build Velocity Audit</td>
<td>Audits</td>
</tr>
<tr>
<td>Security Architecture</td>
<td>Audits</td>
</tr>
<tr>
<td>Competitive Deep Dive</td>
<td>Strategy</td>
</tr>
<tr>
<td>AI Advisory Sprint Plan</td>
<td>Council</td>
</tr>
<tr>
<td>Full-Screen Site Redesign</td>
<td>Design Specs</td>
</tr>
<tr>
<td>Ideas Tracker (Brain Map)</td>
<td>Design Specs</td>
</tr>
<tr>
<td>Audit Onboarding Tool</td>
<td>Design Specs</td>
</tr>
<tr>
<td>Outreach Plan</td>
<td>Outreach</td>
</tr>
<tr>
<td>HVAC Ads Research</td>
<td>Outreach</td>
</tr>
</tbody></table>
<p><strong>Empty categories:</strong> Still render. Show &quot;0 briefs&quot; in sage. Category row is not clickable/expandable when empty. Muted appearance: category name at <code>text-aom-text-muted</code> instead of <code>text-aom-text-light</code>. No chevron.</p>
<hr>
<h2>10. Color Reference (Quick Sheet)</h2>
<p>All colors pulled directly from AOM Brand Guidelines v2.0. No new colors introduced.</p>
<table>
<thead>
<tr>
<th>Element</th>
<th>Color</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>Page background</td>
<td>Night</td>
<td><code>#0C0C0C</code></td>
</tr>
<tr>
<td>Category row hover</td>
<td>White 2%</td>
<td><code>rgba(255,255,255,0.02)</code></td>
</tr>
<tr>
<td>Item row hover</td>
<td>White 3%</td>
<td><code>rgba(255,255,255,0.03)</code></td>
</tr>
<tr>
<td>Active category left border</td>
<td>AOM Orange</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>Category name (default)</td>
<td>Text Light</td>
<td><code>#F0ECE6</code></td>
</tr>
<tr>
<td>Category name (empty)</td>
<td>Text Muted</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Item title</td>
<td>Text Light</td>
<td><code>#F0ECE6</code></td>
</tr>
<tr>
<td>Item title hover</td>
<td>AOM Orange</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>Item count</td>
<td>Sage</td>
<td><code>#7C9A72</code></td>
</tr>
<tr>
<td>Agent tag</td>
<td>Sage</td>
<td><code>#7C9A72</code></td>
</tr>
<tr>
<td>Date</td>
<td>Text Muted</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Summary text</td>
<td>White 40%</td>
<td><code>rgba(255,255,255,0.40)</code></td>
</tr>
<tr>
<td>Chevron</td>
<td>Text Muted</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Row dividers</td>
<td>White 10%</td>
<td><code>rgba(255,255,255,0.10)</code></td>
</tr>
<tr>
<td>Search input bg</td>
<td>Surface</td>
<td><code>#1A1A17</code></td>
</tr>
<tr>
<td>Search input border</td>
<td>White 10%</td>
<td><code>rgba(255,255,255,0.10)</code></td>
</tr>
<tr>
<td>Search input focus border</td>
<td>Orange 40%</td>
<td><code>rgba(232,93,38,0.40)</code></td>
</tr>
</tbody></table>
<hr>
<h2>11. Component Breakdown for Bobby</h2>
<p>Bobby should build these components:</p>
<h3><code>BriefsHub.jsx</code> (refactor existing)</h3>
<ul>
<li>Import <code>briefs-index.json</code></li>
<li>Group items by category in the fixed order from Section 2</li>
<li>Render header, search bar, accordion list, footer</li>
<li>Manage state: <code>openCategories</code> (Set of open category names), <code>searchQuery</code> (string)</li>
</ul>
<h3><code>CategoryAccordion.jsx</code> (new component)</h3>
<p>Props:</p>
<ul>
<li><code>name</code> (string) -- category name</li>
<li><code>items</code> (array) -- filtered brief items in this category</li>
<li><code>isOpen</code> (boolean)</li>
<li><code>onToggle</code> (function)</li>
<li><code>isEmpty</code> (boolean)</li>
</ul>
<p>Renders the category header row and the expandable items list.</p>
<h3><code>BriefItem.jsx</code> (new component)</h3>
<p>Props:</p>
<ul>
<li><code>title</code> (string)</li>
<li><code>path</code> (string)</li>
<li><code>agent</code> (string)</li>
<li><code>date</code> (string)</li>
<li><code>summary</code> (string)</li>
</ul>
<p>Renders one item row inside an expanded category.</p>
<h3>Remove</h3>
<ul>
<li><code>BriefCard</code> component (the current card grid component, no longer needed)</li>
<li>The <code>existingPages</code> separate array (merge into single <code>briefs-index.json</code>)</li>
<li>The <code>icon</code> and <code>agentColor</code> fields (no longer used, typography-driven)</li>
<li>The Lucide icon imports for brief types (FileText, Cpu, Handshake, etc.)</li>
</ul>
<hr>
<h2>12. Interactions Summary</h2>
<table>
<thead>
<tr>
<th>Interaction</th>
<th>Desktop</th>
<th>Mobile</th>
</tr>
</thead>
<tbody><tr>
<td>Open category</td>
<td>Click row</td>
<td>Tap row</td>
</tr>
<tr>
<td>Close category</td>
<td>Click row again</td>
<td>Tap row again</td>
</tr>
<tr>
<td>Navigate to brief</td>
<td>Click item title</td>
<td>Tap item row</td>
</tr>
<tr>
<td>Search</td>
<td>Type in input</td>
<td>Type in input</td>
</tr>
<tr>
<td>Clear search</td>
<td>Clear input or press Escape</td>
<td>Clear input</td>
</tr>
<tr>
<td>URL hash</td>
<td>Auto-open + scroll to category</td>
<td>Same</td>
</tr>
<tr>
<td>Multiple open</td>
<td>Yes</td>
<td>Yes</td>
</tr>
</tbody></table>
<hr>
<h2>13. What This Spec Does NOT Cover</h2>
<ul>
<li>Individual brief page layouts (those already exist, untouched)</li>
<li>Brand guidelines changes</li>
<li>Other pages on the site</li>
<li>The <code>/v2</code> redesign</li>
<li>Any backend or API work</li>
</ul>
<hr>
<h2>14. Build Estimate</h2>
<p>Based on current BriefsHub.jsx complexity: 2-3 hours.</p>
<ul>
<li>Refactor BriefsHub.jsx: 45 min</li>
<li>Build CategoryAccordion + BriefItem: 45 min</li>
<li>Create briefs-index.json with all existing briefs: 30 min</li>
<li>Search functionality: 30 min</li>
<li>Mobile responsive pass: 30 min</li>
<li>Self-QA with Playwright: 15 min</li>
</ul>
<p>Bobby has everything here. No questions needed. Ship it.</p>
`,c={title:t,slug:e,category:n,agent:o,date:r,dateFormatted:i,updated:null,summary:d,tags:a,content:l};export{o as agent,n as category,l as content,r as date,i as dateFormatted,c as default,e as slug,d as summary,a as tags,t as title,s as updated};
