const t="Bobby Brief: Build /case-study Page",e="bobby-case-study-brief",n="Strategy",o="Alex",i="2026-03-12",l="Mar 12",d=null,r="Build brief for Bobby to create the /case-study page showcasing AOM as proof of concept.",a=[],s=`<h1>Bobby Brief: Build /case-study Page</h1>
<p><strong>Date:</strong> 2026-03-12
<strong>From:</strong> Alex + Steve
<strong>For:</strong> Bobby (build), Steffen (design review before build)
<strong>Repo:</strong> AOM-studio (github.com/mrg33k/AOM-studio)
<strong>Route:</strong> /case-study
<strong>Priority:</strong> After ROI calculator ships</p>
<hr>
<h2>What This Is</h2>
<p>A static page that tells AOM&#39;s story as Case Study #1 for the AI advisory product. No dynamic data. No API calls. All content is hardcoded.</p>
<p>Full content brief with narrative, metrics, and copy: <code>projects/aom-strategy/case-study-brief.md</code>
Steve&#39;s detailed visual spec: <code>projects/steve/latest-result.md</code></p>
<p>This brief is the Bobby-specific build instructions.</p>
<hr>
<h2>Page Structure (7 Sections)</h2>
<h3>Section 0: Hero</h3>
<ul>
<li><strong>Layout:</strong> Full viewport height (min-h-screen). Dark (bg-aom-night). Centered content.</li>
<li><strong>Content:</strong><ul>
<li>Micro-label: &quot;CASE STUDY&quot; (JetBrains Mono 700, 10px, uppercase, tracking-[0.3em], aom-stone-muted)</li>
<li>Orange accent line: 48px wide, 2px tall, #E85D26</li>
<li>Headline: &quot;WE BUILT THE SYSTEM WE SELL.&quot; (Syne 800 italic uppercase, tracking-tighter, text-6xl desktop / text-3xl mobile, #F5F0EB)</li>
<li>Subhead: &quot;12 AI agents. 280+ commits. 2 weeks. $0 new hires. Here&#39;s what happened when a creative agency stopped talking about AI and started running on it.&quot; (Space Grotesk 400, text-lg, #A8A29E, max-w-2xl centered)</li>
<li>Scroll indicator: subtle down-arrow or &quot;Read the story&quot; in mono, bottom of viewport</li>
</ul>
</li>
</ul>
<h3>Section 1: The Problem (Before)</h3>
<ul>
<li><strong>Layout:</strong> Dark. max-w-4xl centered.</li>
<li><strong>Content:</strong><ul>
<li>Micro-label: &quot;BEFORE&quot;</li>
<li>Headline: &quot;ONE PERSON. EVERY ROLE.&quot; (Syne 800 italic uppercase, text-4xl desktop / text-2xl mobile)</li>
<li>Body copy (Space Grotesk 400, text-base, #A8A29E, max-w-3xl): Two paragraphs about AOM before the system. Copy in content brief.</li>
<li><strong>Pain Points Grid:</strong> 2 columns desktop, 1 mobile. 6 cards (bg-aom-surface, border-aom-border, p-6). Each card: bold title + detail text. Items:<ol>
<li>Outreach was manual</li>
<li>Client tracking lived in Patrik&#39;s head</li>
<li>Quality control was reactive</li>
<li>Brand consistency was luck</li>
<li>Operations ran on memory</li>
<li>24/7 availability was impossible</li>
</ol>
</li>
</ul>
</li>
</ul>
<h3>Section 2: The Decision (The Turn)</h3>
<ul>
<li><strong>Layout:</strong> Dark with subtle orange gradient wash (same treatment as ROI calc Zone 2).</li>
<li><strong>Content:</strong><ul>
<li>Micro-label: &quot;THE TURN&quot;</li>
<li>Headline: &quot;WHAT IF THE AGENCY RAN ITSELF?&quot;</li>
<li>Body copy: Two paragraphs about building vs. hiring. Copy in content brief.</li>
<li><strong>Pull quote:</strong> Large blockquote (Syne 800 italic, text-2xl, #E85D26): &quot;Isn&#39;t it smart for me as a small business owner to help build tailored solutions for people since I&#39;ve been able to do it for myself?&quot;</li>
<li>Attribution: &quot;Patrik Matheson, AOM&quot; (Space Grotesk 400, text-sm, #A8A29E)</li>
</ul>
</li>
</ul>
<h3>Section 3: The System (After)</h3>
<ul>
<li><strong>Layout:</strong> Dark. Full width. Longest section.</li>
<li><strong>Content:</strong><ul>
<li>Micro-label: &quot;AFTER&quot;</li>
<li>Headline: &quot;12 AGENTS. ONE SYSTEM. ZERO NEW HIRES.&quot;</li>
<li><strong>Pipeline Visualization:</strong> Build in code (flexbox/grid, NOT an image). Horizontal row desktop, vertical stack mobile. 7 nodes: Elon (System) &gt; Mom (Operations) &gt; Alex (Strategy) &gt; Steffen (Brand) &gt; Bobby (Build) &gt; Elmo (QA) &gt; Patrik (Approve). Each node: agent name (Syne 800, text-sm, uppercase) + role (Space Grotesk 400, text-xs, #A8A29E). Connecting arrows in #E85D26.</li>
<li>Note below pipeline: &quot;Every deliverable flows through this chain automatically. Patrik only touches the final approval.&quot;</li>
<li><strong>Agent Cards Grid:</strong> 3 columns desktop, 2 tablet, 1 mobile. 12 cards (bg-aom-surface, border-aom-border, p-6). Top accent line per card. Each card: agent name, title, 1-sentence description. Data in content brief.</li>
</ul>
</li>
</ul>
<h3>Section 4: The Numbers (Light Section)</h3>
<ul>
<li><strong>Layout:</strong> LIGHT background (bg-aom-cream or similar). This is the dark-light rhythm break.</li>
<li><strong>Content:</strong><ul>
<li>Micro-label: &quot;RESULTS&quot;</li>
<li>Headline: &quot;THE NUMBERS DON&#39;T LIE.&quot; (dark text, #0C0C0C)</li>
<li><strong>Metrics Grid:</strong> 3 columns desktop, 2 tablet, 1 mobile. 6 large number cards:<ol>
<li>12+ / Specialized AI agents / Running 24/7</li>
<li>280+ / Commits in first week / Code shipped to production</li>
<li>~2 hrs / Time to build a new page / From spec to live</li>
<li>51+ / Outreach emails sent / Personalized, tracked, automated</li>
<li>$0 / Additional headcount cost / Zero new hires</li>
<li>24/7 / Operational uptime / Relay + watchdog + background agents</li>
</ol>
</li>
<li><strong>Count-up animation:</strong> Same implementation as ROI calculator cards (IntersectionObserver + ease-out). Numbers count up when they enter viewport.</li>
<li><strong>Comparison Table:</strong> 2-column. &quot;Traditional approach&quot; vs. &quot;AOM&#39;s AI system.&quot; 5 rows (Outreach coord, QA tester, PM, Brand manager, After-hours). Desktop: standard table. Mobile: stacked cards.</li>
<li>Footer note (Space Grotesk 400, text-sm, #78716C): &quot;AOM&#39;s system isn&#39;t replacing creative work. It&#39;s replacing the operational overhead that keeps creative people from doing creative work.&quot;</li>
</ul>
</li>
</ul>
<h3>Section 5: Day in the Life</h3>
<ul>
<li><strong>Layout:</strong> Dark.</li>
<li><strong>Content:</strong><ul>
<li>Micro-label: &quot;A DAY IN THE LIFE&quot;</li>
<li>Headline: &quot;WHAT 24 HOURS LOOKS LIKE.&quot;</li>
<li><strong>Timeline:</strong> CSS vertical timeline. Left: timestamps (JetBrains Mono). Right: event cards (bg-aom-surface). Left-border accent colors: orange for actions, sage for QA, stone for system events. 7 timeline entries (data in content brief). Should feel like a terminal log or system feed.</li>
</ul>
</li>
</ul>
<h3>Section 6: The Bridge + CTA</h3>
<ul>
<li><strong>Layout:</strong> Dark with subtle orange gradient wash (same as Section 2).</li>
<li><strong>Content:</strong><ul>
<li>Micro-label: &quot;YOUR BUSINESS&quot;</li>
<li>Headline: &quot;WE BUILT IT FOR US. NOW WE BUILD IT FOR YOU.&quot;</li>
<li>Body copy: Two paragraphs. Copy in content brief.</li>
<li><strong>Three CTA Cards</strong> (matching pathway gate style):<ol>
<li>&quot;See Your Numbers&quot; / ROI calculator description / &quot;Calculate My ROI&quot; -&gt; /roi</li>
<li>&quot;Get the Full Picture&quot; / Audit description / &quot;Book Your Audit&quot; -&gt; /book</li>
<li>&quot;Talk to Us&quot; / Call description / &quot;Schedule a Call&quot; -&gt; /book</li>
</ol>
</li>
</ul>
</li>
</ul>
<h3>Section 7: Footer CTA (Persistent)</h3>
<ul>
<li><strong>Layout:</strong> Full width. Dark. Centered.</li>
<li><strong>Content:</strong><ul>
<li>Headline: &quot;STOP DOING EVERYTHING YOURSELF.&quot; (Syne 800 italic uppercase, text-3xl)</li>
<li>Subhead: &quot;Your business deserves the same system we built for ours.&quot; (Space Grotesk 400, text-lg, #A8A29E)</li>
<li>Primary button: &quot;BOOK YOUR AUDIT&quot; (bg-aom-orange, full-width mobile, inline desktop) -&gt; /book</li>
<li>Secondary link: &quot;Or start with the ROI calculator&quot; (#E85D26, underline on hover) -&gt; /roi</li>
</ul>
</li>
</ul>
<hr>
<h2>Technical Requirements</h2>
<ul>
<li><strong>Route:</strong> /case-study</li>
<li><strong>Static page.</strong> No dynamic data. No API calls. All content hardcoded.</li>
<li><strong>Lazy load</strong> the page component in main.jsx.</li>
<li><strong>Add rewrite rule</strong> in vercel.json for /case-study.</li>
<li><strong>Pipeline diagram:</strong> Build in code (flexbox/grid). Must be responsive.</li>
<li><strong>Timeline (Section 5):</strong> CSS vertical timeline. Left timestamps, right content cards.</li>
<li><strong>Count-up animation:</strong> IntersectionObserver + ease-out (same as ROI calc).</li>
<li><strong>Scroll reveal:</strong> Standard AOM pattern (opacity 0-&gt;1, y 30-&gt;0, 700ms ease-out, stagger 120ms between cards).</li>
<li><strong>Comparison table:</strong> Standard table desktop, stacked cards mobile.</li>
<li><strong>OG tags:</strong> title &quot;How AOM Runs on AI | Case Study&quot;, description &quot;12 AI agents. 280+ commits. 2 weeks. $0 new hires. See how a creative agency built the AI system it now sells.&quot;</li>
<li><strong>Add to sitemap.</strong></li>
<li><strong>Link from:</strong> /system page, navigation menu, ROI calculator CTA area.</li>
<li><strong>Minimum body text:</strong> 16px. No exceptions. &quot;Old people can read em, young people love em.&quot;</li>
</ul>
<hr>
<h2>Visual Assets</h2>
<p><strong>Bobby builds the page with placeholder containers for these. Structure and text carry the page. Screenshots are enhancers, not blockers.</strong></p>
<ol>
<li>Dashboard screenshot (placeholder: gray box with &quot;Mission Control Dashboard&quot; label)</li>
<li>Relay screenshot (placeholder: gray box with &quot;Telegram Relay&quot; label)</li>
<li>Agent pipeline diagram (build in code, not an image)</li>
<li>ROI calculator screenshot (placeholder or link to live /roi)</li>
<li>QA screenshot grid (placeholder: gray box with &quot;Automated QA Screenshots&quot; label)</li>
</ol>
<hr>
<h2>Responsive Behavior</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Desktop</th>
<th>Tablet</th>
<th>Mobile</th>
</tr>
</thead>
<tbody><tr>
<td>Hero headline</td>
<td>text-6xl</td>
<td>text-4xl</td>
<td>text-3xl</td>
</tr>
<tr>
<td>Section headlines</td>
<td>text-4xl</td>
<td>text-3xl</td>
<td>text-2xl</td>
</tr>
<tr>
<td>Pain points grid</td>
<td>2 columns</td>
<td>2 columns</td>
<td>1 column</td>
</tr>
<tr>
<td>Agent cards grid</td>
<td>3 columns</td>
<td>2 columns</td>
<td>1 column</td>
</tr>
<tr>
<td>Metrics grid</td>
<td>3 columns</td>
<td>2 columns</td>
<td>1 column</td>
</tr>
<tr>
<td>Pipeline diagram</td>
<td>Horizontal row</td>
<td>Horizontal row (smaller)</td>
<td>Vertical stack</td>
</tr>
<tr>
<td>Comparison table</td>
<td>Standard table</td>
<td>Standard table</td>
<td>Stacked cards</td>
</tr>
<tr>
<td>Timeline</td>
<td>Left timestamps, right cards</td>
<td>Same</td>
<td>Same, compact</td>
</tr>
<tr>
<td>CTA cards</td>
<td>3 columns</td>
<td>2 columns</td>
<td>1 column</td>
</tr>
</tbody></table>
<hr>
<h2>Files to Create/Modify</h2>
<ul>
<li><code>src/pages/CaseStudy.jsx</code> (new)</li>
<li><code>src/main.jsx</code> (add route, lazy-load)</li>
<li><code>vercel.json</code> (add /case-study rewrite)</li>
<li>Navigation component (add /case-study link)</li>
<li>/system page (add link to case study)</li>
<li>ROI calculator (add link to case study in CTA area)</li>
</ul>
<hr>
<h2>Copy Source</h2>
<p>All section copy is in <code>projects/aom-strategy/case-study-brief.md</code>. Use it as-is for the first build. Patrik will refine wording on review.</p>
<p><strong>Tone:</strong> Confident but not arrogant. Showing, not selling. A contractor reading this should understand every sentence. No jargon. No AI whitepaper language.</p>
<hr>
<p><em>Bobby brief complete. Ready to build after ROI calculator ships and Steffen reviews design direction.</em></p>
`,c={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:l,updated:null,summary:r,tags:a,content:s};export{o as agent,n as category,s as content,i as date,l as dateFormatted,c as default,e as slug,r as summary,a as tags,t as title,d as updated};
