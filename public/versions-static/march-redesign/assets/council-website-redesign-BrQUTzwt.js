const e="Council: AOM Website Redesign",t="council-website-redesign",n="Council",o="Council",i="2026-03-09",s="Mar 9",u=null,r="Council brief on what the AOM website should become beyond video production.",a=[],l=`<h1>Council Brief -- AOM Website Redesign</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>Agents present:</strong> Bobby, Alex, Steffen, Mom
<strong>Question:</strong> The AOM website still reads like a video production company. What should it become?</p>
<hr>
<h2>Bobby (Web Dev)</h2>
<p><strong>Site structure:</strong></p>
<ul>
<li>Keep: Hero (rewrite copy), Portfolio (add case study layer), Footer</li>
<li>Add: Services grid (4 lanes: Video, Web, Social, AI), Construction spotlight, Case studies, AI teaser + waitlist, Testimonials</li>
<li>Kill: Fake trust logos ticker (generic words, not real logos), bottom ticker bar, &quot;Call Rentals&quot; phone</li>
</ul>
<p><strong>Technical debt:</strong></p>
<ul>
<li>App.jsx is 979 lines, one file, zero routing. Must break into components + add React Router first.</li>
<li>three.js loaded (162KB gzipped) but never used</li>
<li>No meta/OG tags, no SEO</li>
<li>GitHub token exposed in client bundle (VITE_ env var)</li>
<li>Firebase loaded for all visitors but only dashboard needs it</li>
</ul>
<p><strong>Reports-as-pages:</strong> Prebuild script that converts markdown to static HTML at deploy time. No GitHub API on public pages.</p>
<p><strong>His Monday plan:</strong></p>
<ol>
<li>Break App.jsx into components + React Router (half day)</li>
<li>Kill dead weight (three.js, fake logos, ticker, rentals phone)</li>
<li>Add services grid, AI teaser, construction callout (one day)</li>
<li>Prebuild script for report pages (half day)</li>
<li>Needs Steffen for: case study page template, services detail pages, overall site IA</li>
</ol>
<hr>
<h2>Alex (Deal Architect)</h2>
<p><strong>Three doors, not fifteen:</strong></p>
<ol>
<li>Content Engine (retainer, $3-3.5k/month) -- &quot;your in-house media team without the overhead&quot;</li>
<li>Production (project, $5-25k) -- brand videos, docs, event coverage</li>
<li>Digital Infrastructure (system) -- websites + AI systems + automation</li>
</ol>
<p><strong>AI positioning:</strong> Dedicated section with waitlist. &quot;We built an AI system that runs our own business. Now we&#39;re building them for clients.&quot; Scarcity IS the positioning. No pricing on site.</p>
<p><strong>Construction play:</strong> Speak their language. &quot;Your best crews aren&#39;t on Indeed. They&#39;re on Instagram watching your competitor&#39;s content.&quot; Hit: recruiting, winning contracts, looking legitimate to GCs.</p>
<p><strong>Three case studies:</strong> Ambition (full-service), Included Health (production credibility), ISA Energy (storytelling depth)</p>
<p><strong>Conversion:</strong> One CTA: &quot;See What We&#39;d Build For You&quot; -- not &quot;Book a call.&quot; Five-field form max. No pricing on site.</p>
<p><strong>What&#39;s hurting us:</strong> The site is selling 2024 AOM. The business is operating as 2026 AOM. That gap is costing deals.</p>
<hr>
<h2>Steffen (Brand)</h2>
<p><strong>Keep:</strong> Dark foundation, heavy italic headlines, #FF4F00 orange with restraint, mono-spaced micro-labels (this IS the AI voice)</p>
<p><strong>Kill:</strong> &quot;Phoenix Video Production&quot; positioning, &quot;Founders/developers/SaaS&quot; audience targeting, generic engagement names (&quot;The Big Launch&quot;, &quot;The Wildcard&quot;)</p>
<p><strong>Positioning:</strong> &quot;Brand infrastructure for companies that build.&quot;</p>
<p><strong>Color evolution:</strong></p>
<ul>
<li>Keep #FF4F00 as primary accent</li>
<li>Shift supporting palette from cool zinc to warm neutrals</li>
<li>Background: #0A0A08 (slightly warmer)</li>
<li>Text: #F5F0EB (warm white)</li>
<li>Secondary: #FAF5EF (cream for contrast)</li>
<li>AI accent: #7C9A72 (sage green -- unexpected, reads &quot;growth&quot; not &quot;tech&quot;)</li>
</ul>
<p><strong>Typography:</strong> Keep heavy italic headlines. Consider Inter Tight or Satoshi. Mono labels stay (JetBrains Mono or IBM Plex Mono). Body text bump to zinc-300 minimum at 15-16px.</p>
<p><strong>AI communication (no gradient blobs, no robots):</strong></p>
<ul>
<li>Show the system, not the technology</li>
<li>Mono type IS the AI layer -- system status indicators, pipeline stages, process labels</li>
<li>Show inputs/outputs: &quot;1 filming day in. 30 days of social content out.&quot;</li>
<li>&quot;How It Works&quot; section reveals the engine without saying &quot;AI&quot; in the headline</li>
</ul>
<p><strong>Summary:</strong> Not about making it prettier. About repositioning from &quot;video company&quot; to &quot;the system that makes your brand work.&quot;</p>
<hr>
<h2>Mom (Chief of Staff)</h2>
<p><strong>Reality check:</strong></p>
<ul>
<li>KOHRS (10 videos owed), Skylar (sitting unedited), outreach pipeline (Mar 11) all rank above this</li>
<li>BUT Alex&#39;s 6 questions are already answered, removing a key blocker</li>
</ul>
<p><strong>Recommended approach:</strong> Phased rollout</p>
<ul>
<li>Phase 0 (this week): Alex audits copy, Steffen proposes directions, Bobby inventories codebase</li>
<li>Phase 1 (next week): Patrik picks direction, Alex writes copy, Bobby implements</li>
<li>Phase 2 (week of Mar 24): Construction landing page, skills tiles, case studies</li>
<li>Phase 3 (April): Full visual redesign if data says it matters</li>
</ul>
<p><strong>Dependency chain:</strong> Patrik&#39;s answers -&gt; Steffen&#39;s designs -&gt; Alex&#39;s copy -&gt; Bobby builds</p>
<p><strong>UPDATE:</strong> Patrik said &quot;we&#39;re doing all that tonight.&quot; Mom&#39;s phased approach is noted but Patrik is choosing velocity.</p>
<hr>
<h2>Synthesis</h2>
<p><strong>Where we agree:</strong></p>
<ul>
<li>The site is selling 2024 AOM. The business is 2026 AOM. The gap is real.</li>
<li>Construction needs to be the front door, not a side tab</li>
<li>AI services need a section NOW (waitlist + proof point, not a full product page)</li>
<li>Three service lanes: Content Engine, Production, Digital Infrastructure</li>
<li>Dark foundation + orange accent + heavy type = keep. Generic messaging + wrong audience = kill.</li>
<li>Reports-as-pages: prebuild markdown to static HTML at deploy</li>
<li>One file (App.jsx, 979 lines) must be broken up before adding features</li>
</ul>
<p><strong>Where they disagree:</strong></p>
<ul>
<li>Mom says phase it over weeks. Patrik says tonight. Bobby says half the work doesn&#39;t need Steffen. The answer: Bobby starts with what he can do solo (routing, cleanup, services grid, AI section), Steffen&#39;s brand direction informs the case study template and visual refinements.</li>
</ul>
<p><strong>Recommended action:</strong>
Bobby starts NOW:</p>
<ol>
<li>Break App.jsx into components + React Router</li>
<li>Kill dead weight (three.js, fake logos, ticker, rentals)</li>
<li>Rewrite hero: drop &quot;Phoenix Video Production&quot;, adopt systems positioning</li>
<li>Add services grid (3 doors per Alex)</li>
<li>Add AI teaser section with waitlist</li>
<li>Add construction callout with Ambition proof</li>
<li>Apply Steffen&#39;s warm neutral palette shift</li>
<li>SEO basics (meta tags, OG tags)</li>
</ol>
<p>Steffen provides: case study page template design direction for Phase 2.
Alex provides: final copy for each new section.</p>
`,d={title:e,slug:t,category:n,agent:o,date:i,dateFormatted:s,updated:null,summary:r,tags:a,content:l};export{o as agent,n as category,l as content,i as date,s as dateFormatted,d as default,t as slug,r as summary,a as tags,e as title,u as updated};
