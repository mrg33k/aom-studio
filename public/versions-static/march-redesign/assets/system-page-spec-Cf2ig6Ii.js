const e="/system Page Design Spec",o="system-page-spec",n="Design Specs",t="Steffen",i="2026-03-10",l="Mar 10",d=null,r="Design spec for the /system page based on Steve's content and AOM Dark Frame v4.",s=[],a=`<h1>/system Page Design Spec</h1>
<blockquote>
<p>Steffen | 2026-03-10
For Bobby. Based on Steve&#39;s content (10 sections) + AOM Dark Frame v4.
Route: <code>aheadofmarket.com/system</code></p>
</blockquote>
<hr>
<h2>Global Rules</h2>
<ul>
<li><strong>Fonts:</strong> Syne (headlines, 800 weight) + Space Grotesk (body, 400/500/600/700)</li>
<li><strong>Background:</strong> Night <code>#0C0C0C</code> primary, Night Card <code>#151515</code> for cards</li>
<li><strong>Text:</strong> Text Light <code>#F0ECE6</code> for headlines/body, Text Muted <code>#8A847C</code> for secondary</li>
<li><strong>Accents:</strong> Orange <code>#E85D26</code> for CTAs and emphasis. Sage <code>#7C9A72</code> for AI/systems elements.</li>
<li><strong>Section spacing:</strong> <code>py-24</code> desktop (96px), <code>py-16</code> mobile (64px)</li>
<li><strong>Max content width:</strong> <code>max-w-6xl</code> (1152px), centered</li>
<li><strong>Body text:</strong> 16px minimum. 18px preferred for long-form paragraphs. Line height 1.6.</li>
<li><strong>Headline minimum:</strong> 32px on mobile, 48px on desktop</li>
<li><strong>Section rhythm:</strong> Dark &gt; Pattern Strip &gt; Dark. No light sections on this page. The entire page is dark. The pattern strip dividers (diagonal lines at 8% orange opacity) break sections visually.</li>
<li><strong>Film grain overlay:</strong> Active on full page, <code>opacity-[0.03]</code>, same as main site</li>
<li><strong>No stock photos.</strong> Screenshots of the actual system or nothing.</li>
</ul>
<hr>
<h2>Section 1: HERO</h2>
<h3>Layout</h3>
<ul>
<li>Full viewport height (<code>min-h-screen</code>), centered vertically</li>
<li>Content stacked: micro-label &gt; headline &gt; subheadline &gt; CTA</li>
<li>No background image. Pure type on Night background with subtle orange gradient wash (<code>opacity-[0.02]</code>)</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Micro-label:</strong> <code>THE SYSTEM</code> in Space Grotesk 700, 11px, <code>tracking-[0.15em]</code>, uppercase, Sage <code>#7C9A72</code>. Position above headline with 16px gap.</li>
<li><strong>Headline:</strong> &quot;WE BUILT AN AI SYSTEM THAT RUNS OUR BUSINESS. NOW WE BUILD YOURS.&quot; Syne 800, uppercase. Desktop: 56px. Mobile: 36px. Line height 1.05. Tracking -0.03em. Color: <code>#F0ECE6</code>. Max width <code>max-w-4xl</code>.</li>
<li><strong>Subheadline:</strong> Steve&#39;s full subheadline text. Space Grotesk 400, 18px desktop / 16px mobile. Color: <code>#8A847C</code>. Max width <code>max-w-2xl</code>. 24px below headline.</li>
<li><strong>CTA:</strong> Primary orange button: &quot;TALK TO US&quot;. 48px below subheadline.</li>
</ul>
<h3>Animation</h3>
<ul>
<li>Headline fades up (<code>y: 40</code> to <code>y: 0</code>, duration 1000ms, ease-out)</li>
<li>Subheadline follows 200ms delayed</li>
<li>CTA follows 400ms delayed</li>
<li>Micro-label appears instantly (no animation)</li>
</ul>
<hr>
<h2>Section 2: THE PROBLEM</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider (full-width, 6px tall, diagonal lines pattern) above section</li>
<li>Two-column on desktop: left column = headline area (sticky on scroll), right column = content</li>
<li>Single column on mobile, headline above content</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Micro-label:</strong> <code>THE PROBLEM</code> / Sage / same styling as Section 1</li>
<li><strong>Headline:</strong> &quot;YOU&#39;RE DOING $20/HOUR WORK ON A $200/HOUR SCHEDULE&quot; Syne 800, 40px desktop / 28px mobile. Color: <code>#F0ECE6</code>.</li>
<li><strong>Body intro:</strong> Steve&#39;s first paragraph. Space Grotesk 400, 18px, <code>#8A847C</code>.</li>
<li><strong>Pain point list:</strong> 5 bullet points from Steve&#39;s content. Each bullet gets its own line with generous spacing (<code>mb-4</code>). Use orange <code>#E85D26</code> bullet markers (small 6px circles, not default list style). Text: Space Grotesk 400, 16px, <code>#F0ECE6</code>.</li>
<li><strong>Closing paragraph:</strong> &quot;Sound familiar?...&quot; Space Grotesk 400, 18px, <code>#8A847C</code>.</li>
</ul>
<h3>Animation</h3>
<ul>
<li>Each bullet fades in sequentially on scroll (stagger 100ms, <code>y: 20</code>, duration 500ms)</li>
</ul>
<hr>
<h2>Section 3: WHAT WE BUILT</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider above</li>
<li>Vertical stack: micro-label &gt; headline &gt; intro paragraph &gt; capability cards (2x3 grid desktop, 1 column mobile) &gt; pipeline diagram</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Micro-label:</strong> <code>WHAT WE BUILT</code> / Sage</li>
<li><strong>Headline:</strong> &quot;WE FIXED IT FOR OURSELVES FIRST&quot; Syne 800, 40px desktop / 28px mobile</li>
<li><strong>Intro:</strong> Steve&#39;s intro paragraph. Space Grotesk 400, 18px, <code>#8A847C</code>.</li>
</ul>
<h3>Capability Cards (6 cards)</h3>
<p>Each card represents one of Steve&#39;s capability areas: Email Outreach, Calendar Management, Multi-Agent Pipeline, Quality Control, Mobile Command Center, Institutional Memory.</p>
<p><strong>Card styling:</strong></p>
<ul>
<li>Background: Night Card <code>#151515</code></li>
<li>Border: 1px <code>rgba(255,255,255,0.10)</code>, hover to <code>rgba(232,93,38,0.3)</code></li>
<li>Padding: 32px</li>
<li>No border-radius (square corners per brand)</li>
<li>Shadow: <code>shadow-xl</code></li>
</ul>
<p><strong>Card interior:</strong></p>
<ul>
<li><strong>Icon area:</strong> 48px square container, border <code>rgba(255,255,255,0.10)</code>, Sage <code>#7C9A72</code> Lucide icon centered (20px). Icons: Mail for Email, Calendar for Calendar, Workflow for Pipeline, ShieldCheck for QC, Smartphone for Mobile, Brain for Memory.</li>
<li><strong>Title:</strong> Space Grotesk 700, 18px, <code>#F0ECE6</code>, uppercase, <code>tracking-[0.05em]</code>. 16px below icon.</li>
<li><strong>Description:</strong> Space Grotesk 400, 15px, <code>#8A847C</code>. 8px below title. 2-3 lines max from Steve&#39;s copy.</li>
</ul>
<p><strong>Grid:</strong> <code>grid-cols-2 gap-6</code> desktop, <code>grid-cols-1 gap-4</code> mobile. The Multi-Agent Pipeline card spans full width on desktop (<code>col-span-2</code>) to give the pipeline diagram room.</p>
<h3>Agent Pipeline Diagram (inside the Multi-Agent Pipeline card or directly below)</h3>
<p><strong>This is the centerpiece visual of the page.</strong></p>
<p><strong>Layout:</strong> Horizontal flow on desktop, vertical on mobile. Six nodes connected by lines/arrows.</p>
<p><strong>Each node:</strong></p>
<ul>
<li>80px wide container (desktop), full-width row (mobile)</li>
<li>Night Card background with sage border: <code>border border-[#5C7A54]/40</code></li>
<li>Agent name in Space Grotesk 700, 13px, uppercase, <code>tracking-[0.1em]</code>, <code>#F0ECE6</code></li>
<li>Role label below in Space Grotesk 400, 11px, <code>#8A847C</code></li>
<li>Small sage dot (6px) top-left as status indicator, color <code>#7C9A72</code></li>
</ul>
<p><strong>Node content:</strong></p>
<ol>
<li><strong>ELON</strong> / System Scanner</li>
<li><strong>MOM</strong> / Orchestrator</li>
<li><strong>ALEX</strong> / Strategist</li>
<li><strong>STEFFEN</strong> / Brand + Design</li>
<li><strong>BOBBY</strong> / Builder</li>
<li><strong>ELMO</strong> / Quality Gate</li>
</ol>
<p><strong>Connections:</strong> Thin lines (1px, <code>#7C9A72</code> at 40% opacity) between nodes. On desktop, horizontal with small arrow chevrons. On mobile, vertical with downward arrows.</p>
<p><strong>Final arrow:</strong> From ELMO, a dashed line (orange <code>#E85D26</code> at 40%) loops back up to PATRIK (a separate node styled differently: orange border instead of sage, label &quot;APPROVE / REDIRECT&quot;). This shows the human-in-the-loop.</p>
<p><strong>Animation:</strong></p>
<ul>
<li>On scroll into view, nodes appear sequentially left-to-right (desktop) or top-to-bottom (mobile), stagger 150ms each</li>
<li>Connection lines draw in after their source node appears (CSS stroke-dashoffset animation)</li>
<li>The loop-back arrow draws last</li>
</ul>
<hr>
<h2>Section 4: REAL RESULTS</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider above</li>
<li>Micro-label &gt; headline &gt; results cards (2x2 grid desktop, 1 column mobile) &gt; bottom note</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Micro-label:</strong> <code>PROOF</code> / Sage</li>
<li><strong>Headline:</strong> &quot;THIS IS WHAT HAPPENED LAST WEEK&quot; Syne 800, 40px desktop / 28px mobile</li>
</ul>
<h3>Results Cards (5 cards from Steve&#39;s content)</h3>
<p><strong>Card styling:</strong></p>
<ul>
<li>Background: Night Card <code>#151515</code></li>
<li>Left border accent: 3px solid <code>#E85D26</code> (orange) instead of full border. This makes the stat pop.</li>
<li>Padding: 32px</li>
<li>No border-radius</li>
</ul>
<p><strong>Card interior:</strong></p>
<ul>
<li><strong>Stat number:</strong> The bold number from each result (12, 2, 0, 100%, etc.). Syne 800, 48px, <code>#E85D26</code>. This is the visual anchor.</li>
<li><strong>Stat label:</strong> Short descriptor. Space Grotesk 700, 14px, <code>#F0ECE6</code>, uppercase. Example: &quot;OUTREACH EMAILS SENT&quot;</li>
<li><strong>Detail:</strong> 1-2 sentence context from Steve&#39;s copy. Space Grotesk 400, 15px, <code>#8A847C</code>.</li>
</ul>
<p><strong>Card data mapping:</strong></p>
<ol>
<li>Stat: <code>12</code> / Label: <code>OUTREACH EMAILS SENT</code> / Detail: &quot;While the founder was on a film set...&quot;</li>
<li>Stat: <code>2</code> / Label: <code>WEBSITES BUILT + QA&#39;D</code> / Detail: &quot;Without writing a single line of code...&quot;</li>
<li>Stat: <code>0</code> / Label: <code>DROPPED BALLS</code> / Detail: &quot;On a 6-client workload...&quot;</li>
<li>Stat: <code>100%</code> / Label: <code>CALENDAR BY VOICE</code> / Detail: &quot;Editing blocks, client calls, production days...&quot;</li>
<li>Stat: <code>AUTO</code> / Label: <code>BRAND CONSISTENCY</code> / Detail: &quot;Every visual checked against standards...&quot;</li>
</ol>
<p><strong>Grid:</strong> <code>grid-cols-2 gap-6</code> desktop (card 5 spans <code>col-span-2</code> centered or stretches). Single column mobile.</p>
<h3>Animation</h3>
<ul>
<li>Cards fade up on scroll, stagger 150ms</li>
<li>Stat numbers count up from 0 (countUp.js or CSS counter, duration 1500ms). &quot;AUTO&quot; types in letter by letter.</li>
</ul>
<hr>
<h2>Section 5: THE GAP (Comparison Table)</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider above</li>
<li>Micro-label &gt; headline &gt; intro text &gt; comparison table &gt; closing line</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Micro-label:</strong> <code>THE GAP</code> / Sage</li>
<li><strong>Headline:</strong> &quot;ENTERPRISE GETS THIS. YOU DON&#39;T. UNTIL NOW.&quot; Syne 800, 40px desktop / 28px mobile</li>
<li><strong>Intro:</strong> Steve&#39;s intro paragraphs. Space Grotesk 400, 18px, <code>#8A847C</code>.</li>
</ul>
<h3>Comparison Table Design</h3>
<p><strong>This is NOT a standard HTML table.</strong> It&#39;s a visual comparison built with cards/columns.</p>
<p><strong>Desktop (3 columns side by side):</strong></p>
<table>
<thead>
<tr>
<th></th>
<th>Enterprise</th>
<th>DIY / Courses</th>
<th>AOM</th>
</tr>
</thead>
</table>
<p>Each column is a card. The AOM column is visually elevated.</p>
<p><strong>Column styling:</strong></p>
<p><strong>Enterprise column:</strong></p>
<ul>
<li>Background: Night Card <code>#151515</code></li>
<li>Border: 1px <code>rgba(255,255,255,0.10)</code></li>
<li>Header: Space Grotesk 700, 16px, <code>#8A847C</code>, uppercase</li>
<li>All text: <code>#8A847C</code> (intentionally muted, this option isn&#39;t for them)</li>
</ul>
<p><strong>DIY column:</strong></p>
<ul>
<li>Same as Enterprise styling</li>
<li>Also muted. This isn&#39;t the answer either.</li>
</ul>
<p><strong>AOM column (featured):</strong></p>
<ul>
<li>Background: <code>#151515</code> with subtle orange glow: <code>shadow-[0_0_60px_rgba(232,93,38,0.08)]</code></li>
<li>Border: 1px <code>rgba(232,93,38,0.4)</code> (orange border)</li>
<li>Header: Syne 700, 18px, <code>#E85D26</code>, with small &quot;RECOMMENDED&quot; badge above (Space Grotesk 700, 10px, <code>tracking-[0.15em]</code>, orange bg, white text, inline badge)</li>
<li>Values in <code>#F0ECE6</code> (bright, stands out against the muted competitors)</li>
</ul>
<p><strong>Row data (4 rows in each column):</strong>
Each row inside the column card:</p>
<ul>
<li><strong>Row label:</strong> Space Grotesk 600, 12px, uppercase, <code>tracking-[0.1em]</code>, <code>#8A847C</code></li>
<li><strong>Row value:</strong> Space Grotesk 400, 16px</li>
<li>Rows separated by 1px border <code>rgba(255,255,255,0.05)</code></li>
<li>Padding: 20px per row</li>
</ul>
<p><strong>Row content:</strong></p>
<ol>
<li><strong>COST:</strong> &quot;$50K-$500K+&quot; | &quot;$0-$500&quot; | &quot;$2,500-$8,000&quot;</li>
<li><strong>WHAT YOU GET:</strong> &quot;Custom system, dedicated team&quot; | &quot;Videos, templates, figure it out&quot; | &quot;Working system, built for your business&quot;</li>
<li><strong>WHO IT&#39;S FOR:</strong> &quot;Fortune 500&quot; | &quot;Hobbyists, solopreneurs&quot; | &quot;Real businesses, 5-50 employees&quot;</li>
<li><strong>TIMELINE:</strong> &quot;6-12 months&quot; | &quot;Self-paced (forever)&quot; | &quot;2-4 weeks&quot;</li>
</ol>
<p><strong>Mobile:</strong> Stack columns vertically. AOM column on top (show the winner first). Enterprise and DIY below, collapsed/accordion style (tap to expand).</p>
<p><strong>Closing line:</strong> &quot;That gap in the middle? That&#39;s where 99% of businesses live. That&#39;s where we operate.&quot; Space Grotesk 500, 20px, <code>#F0ECE6</code>. Centered. 48px below table.</p>
<h3>Animation</h3>
<ul>
<li>AOM column fades in slightly after the other two (200ms delay), drawing the eye</li>
</ul>
<hr>
<h2>Section 6: WHO THIS IS FOR</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider above</li>
<li>Micro-label &gt; headline &gt; body text &gt; industry tags</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Micro-label:</strong> <code>WHO IT&#39;S FOR</code> / Sage</li>
<li><strong>Headline:</strong> &quot;BUILT FOR BUSINESSES LIKE YOURS&quot; Syne 800, 40px desktop / 28px mobile</li>
<li><strong>Body:</strong> Steve&#39;s full section text. Space Grotesk 400, 18px, <code>#8A847C</code>. Max width <code>max-w-3xl</code>.</li>
</ul>
<h3>Industry Tags</h3>
<p>A horizontal row of pill badges showing the verticals Steve listed. Wraps on mobile.</p>
<p><strong>Tag styling:</strong></p>
<ul>
<li>Background: transparent</li>
<li>Border: 1px <code>rgba(255,255,255,0.10)</code></li>
<li>Text: Space Grotesk 600, 12px, uppercase, <code>tracking-[0.1em]</code>, <code>#8A847C</code></li>
<li>Padding: <code>px-4 py-2</code></li>
<li>No border-radius (square, per brand)</li>
<li>Hover: border shifts to <code>rgba(232,93,38,0.3)</code>, text to <code>#F0ECE6</code></li>
</ul>
<p><strong>Tags:</strong> Contractors | HVAC | Law Firms | Dental Practices | Real Estate | Nonprofits | Creative Agencies</p>
<p><strong>Closing line:</strong> &quot;We know because we are you.&quot; Space Grotesk 500, 20px, <code>#F0ECE6</code>. 32px below tags.</p>
<hr>
<h2>Section 7: THE OFFER</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider above</li>
<li>This section gets a distinct treatment: a single large card centered on the page, like a product listing. Think Nike product detail page energy.</li>
</ul>
<h3>The Offer Card</h3>
<ul>
<li>Max width: <code>max-w-3xl</code>, centered</li>
<li>Background: Night Card <code>#151515</code></li>
<li>Border: 1px <code>rgba(232,93,38,0.25)</code> (subtle orange)</li>
<li>Shadow: <code>shadow-2xl shadow-[rgba(232,93,38,0.06)]</code></li>
<li>Padding: 48px desktop, 32px mobile</li>
</ul>
<p><strong>Card interior (top to bottom):</strong></p>
<ol>
<li><p><strong>Micro-label:</strong> <code>THE OFFER</code> / Orange <code>#E85D26</code> (not sage, this is commercial)</p>
</li>
<li><p><strong>Headline:</strong> &quot;AI OPERATIONS AUDIT&quot; Syne 800, 40px, <code>#F0ECE6</code></p>
</li>
<li><p><strong>Price:</strong> &quot;$2,500 FLAT&quot; Syne 800, 56px, <code>#E85D26</code>. 16px below headline.</p>
</li>
<li><p><strong>Description:</strong> Steve&#39;s intro paragraph. Space Grotesk 400, 18px, <code>#8A847C</code>. 24px below price.</p>
</li>
<li><p><strong>What&#39;s Included (5 items):</strong></p>
<ul>
<li>Each item is a numbered row</li>
<li>Number: Syne 800, 32px, <code>#E85D26</code> (acts as a visual marker)</li>
<li>Title: Space Grotesk 700, 18px, <code>#F0ECE6</code></li>
<li>Description: Space Grotesk 400, 15px, <code>#8A847C</code></li>
<li>Items separated by 1px border <code>rgba(255,255,255,0.05)</code></li>
<li>Padding between items: 24px</li>
</ul>
</li>
<li><p><strong>The Math callout:</strong></p>
<ul>
<li>Inset box within the card: background <code>rgba(232,93,38,0.05)</code>, border 1px <code>rgba(232,93,38,0.15)</code></li>
<li>Steve&#39;s &quot;math is simple&quot; paragraph</li>
<li>Space Grotesk 500, 16px, <code>#F0ECE6</code></li>
<li>Key numbers bold: &quot;$100/hour&quot;, &quot;10 hours&quot;, &quot;$2,500&quot;, &quot;three weeks&quot; in <code>#E85D26</code></li>
</ul>
</li>
<li><p><strong>CTA:</strong> Primary orange button &quot;TALK TO US&quot; centered at bottom of card, 32px below math box</p>
</li>
</ol>
<hr>
<h2>Section 8: WHY AOM</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider above</li>
<li>Two-column on desktop: left = headline + body, right = pull quote card</li>
<li>Single column on mobile, pull quote below body</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Micro-label:</strong> <code>WHY US</code> / Sage</li>
<li><strong>Headline:</strong> &quot;WE&#39;RE NOT CONSULTANTS. WE&#39;RE OPERATORS.&quot; Syne 800, 40px desktop / 28px mobile</li>
<li><strong>Body:</strong> Steve&#39;s full text. Space Grotesk 400, 18px, <code>#8A847C</code>.</li>
</ul>
<h3>Pull Quote Card (right column)</h3>
<ul>
<li>Background: Night Card <code>#151515</code></li>
<li>Left border: 3px solid <code>#E85D26</code></li>
<li>Padding: 32px</li>
<li>Quote text: &quot;WE&#39;RE THE PROOF OF CONCEPT.&quot; Syne 700, 28px, <code>#F0ECE6</code></li>
<li>Attribution: &quot;Patrik Matheson, Founder&quot; Space Grotesk 400, 14px, <code>#8A847C</code></li>
</ul>
<hr>
<h2>Section 9: CTA (Final)</h2>
<h3>Layout</h3>
<ul>
<li>Pattern strip divider above</li>
<li>Centered, generous vertical padding (<code>py-32</code> desktop, <code>py-20</code> mobile)</li>
<li>This is the closer. Maximum visual weight.</li>
</ul>
<h3>Content</h3>
<ul>
<li><strong>Headline:</strong> &quot;LET&#39;S FIND YOUR 10 HOURS&quot; Syne 800, 56px desktop / 36px mobile, <code>#F0ECE6</code>. Centered.</li>
<li><strong>Body:</strong> Steve&#39;s text. Space Grotesk 400, 20px, <code>#8A847C</code>. Centered. Max width <code>max-w-2xl</code>. 24px below headline.</li>
<li><strong>CTA Button:</strong> &quot;TALK TO US&quot; Primary orange, oversized: <code>px-12 py-5</code>, text 18px. Centered. 40px below body.<ul>
<li>Shadow: <code>shadow-lg shadow-[rgba(232,93,38,0.25)]</code></li>
<li>Hover: background shifts to <code>#D14E1C</code>, shadow intensifies to <code>rgba(232,93,38,0.35)</code></li>
</ul>
</li>
<li><strong>Subtext below button:</strong> &quot;Free 15-minute call. No pitch. No pressure.&quot; Space Grotesk 400, 14px, <code>#8A847C</code>. 16px below button.</li>
</ul>
<h3>CTA Routing</h3>
<p>Route through the existing Talk to Us overlay/intake flow. Tag lead source as <code>system-page</code> in the form data so we can track conversions from this page.</p>
<h3>Animation</h3>
<ul>
<li>Headline fades up on scroll</li>
<li>Button pulses once on entry (subtle scale 1.0 &gt; 1.02 &gt; 1.0, duration 600ms, ease-in-out). One time only. No infinite pulse.</li>
</ul>
<hr>
<h2>Section 10: SOCIAL PROOF (Future)</h2>
<h3>Layout</h3>
<ul>
<li>Below CTA section, separated by pattern strip</li>
<li>Initially empty or hidden. Structure the component now so content can be added later.</li>
</ul>
<h3>Planned Elements</h3>
<p><strong>Testimonial cards (when available):</strong></p>
<ul>
<li>Same card styling as results cards (Night Card bg, left orange border)</li>
<li>Quote text in Space Grotesk 500, 18px, <code>#F0ECE6</code></li>
<li>Client name + company in Space Grotesk 400, 14px, <code>#8A847C</code></li>
</ul>
<p><strong>Live system counter (if technically feasible):</strong></p>
<ul>
<li>A small bar at the bottom showing real-time or weekly stats</li>
<li>&quot;This week: X emails sent, X tasks completed, X deliverables QA&#39;d&quot;</li>
<li>Space Grotesk 600, 14px, Sage <code>#7C9A72</code></li>
<li>Updated via API or static weekly refresh</li>
</ul>
<p><strong>Video embed (when Patrik films the 30-60s demo):</strong></p>
<ul>
<li>Full-width container, max-w-4xl centered</li>
<li>Aspect ratio 16:9</li>
<li>Border: 1px <code>rgba(255,255,255,0.10)</code></li>
<li>No autoplay. Poster frame required.</li>
</ul>
<h3>For Now</h3>
<p>Bobby: Build the section container with a placeholder state. No &quot;coming soon&quot; text. Just leave the section out of the DOM until content is ready. The component should exist in code, commented out or feature-flagged, so adding content later is a 5-minute job.</p>
<hr>
<h2>Mobile Considerations</h2>
<p><strong>This page is mobile-first.</strong> Business owners will find this on their phones.</p>
<ul>
<li>All grids collapse to single column below <code>md</code> (768px)</li>
<li>Body text: 16px minimum everywhere. No exceptions.</li>
<li>Headlines scale down but never below 28px</li>
<li>Card padding reduces from 32px to 24px on mobile</li>
<li>Section padding reduces from 96px to 64px on mobile</li>
<li>Pipeline diagram rotates to vertical flow on mobile</li>
<li>Comparison table: AOM column on top, others below (accordion expand)</li>
<li>CTAs are full-width on mobile (<code>w-full</code>)</li>
<li>Touch targets: 48px minimum height on all interactive elements</li>
<li>The offer card gets no horizontal margin reduction below <code>sm</code> (it can go edge-to-edge with 16px page padding)</li>
<li>Industry tags wrap naturally, no horizontal scroll</li>
</ul>
<hr>
<h2>Navigation</h2>
<p>Add <code>/system</code> to the main site nav. Label: &quot;The System&quot; or just &quot;System&quot;.</p>
<p>Position: After &quot;Services&quot; (or equivalent), before &quot;Contact&quot;. This page is a sales tool and deserves primary nav placement.</p>
<p>Mobile nav: same position, full label &quot;The System&quot;.</p>
<hr>
<h2>Pattern Strip Divider (Reference)</h2>
<p>Used between every section. Already in brand v4.</p>
<pre><code class="language-css">/* 6px tall, full-width */
height: 6px;
width: 100%;
background: repeating-linear-gradient(
  45deg,
  transparent,
  transparent 5px,
  rgba(232,93,38,0.08) 5px,
  rgba(232,93,38,0.08) 6px
);
</code></pre>
<hr>
<h2>Performance Notes</h2>
<ul>
<li>Lazy load below-the-fold sections</li>
<li>Use Intersection Observer for scroll animations (not scroll event listeners)</li>
<li>The pipeline diagram SVG should be inline, not an image</li>
<li>CountUp animations should only fire once (not re-trigger on scroll back)</li>
<li>Total page weight target: under 200KB excluding fonts</li>
</ul>
<hr>
<h2>Summary for Bobby</h2>
<p>10 sections, all on <code>#0C0C0C</code> Night background. Syne 800 for all headlines, Space Grotesk for everything else. Orange <code>#E85D26</code> for CTAs and emphasis. Sage <code>#7C9A72</code> for system/AI elements and micro-labels. Pattern strip dividers between every section.</p>
<p>The three visual anchors of this page:</p>
<ol>
<li><strong>The pipeline diagram</strong> (Section 3) shows the system is real</li>
<li><strong>The comparison table</strong> (Section 5) shows the market gap</li>
<li><strong>The offer card</strong> (Section 7) makes the ask clear</li>
</ol>
<p>Everything else builds the case for those three moments.</p>
<p>Route the CTA through the existing Talk to Us overlay. Tag source as <code>system-page</code>.</p>
<p>Design standard: old people can read em, young people love em.</p>
`,c={title:e,slug:o,category:n,agent:t,date:i,dateFormatted:l,updated:null,summary:r,tags:s,content:a};export{t as agent,n as category,a as content,i as date,l as dateFormatted,c as default,o as slug,r as summary,s as tags,e as title,d as updated};
