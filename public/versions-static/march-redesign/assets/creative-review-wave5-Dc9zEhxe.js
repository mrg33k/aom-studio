const e="Creative Director Review: Wave 5",t="creative-review-wave5",o="Audits",n="Steffen",i="2026-03-12",a="Mar 12",l=null,r="Post-deploy creative review of /ideas, /briefs, and /book pages.",s=[],d=`<h1>Creative Director Review: Wave 5 Pages</h1>
<blockquote>
<p>Steffen | Post-deploy review of /ideas, /briefs, /book
Source: codebase audit (IdeasTracker.jsx, BriefsHub.jsx, BookAudit.jsx, tailwind.config.js)
Date: 2026-03-12</p>
</blockquote>
<hr>
<h2>Executive Summary</h2>
<p>Three pages reviewed. /briefs is the cleanest of the three: great brand alignment, correct typography, strong hierarchy. /book is solid with minor consistency gaps. /ideas is a different beast entirely: a full-screen interactive canvas app that plays by its own rules. It&#39;s visually impressive but has the most deviations from the AOM brand system. All three pages lack the shared site navigation and footer that the homepage uses, creating a &quot;different site&quot; feel when navigating between them.</p>
<hr>
<h2>PAGE 1: /ideas (IdeasTracker.jsx)</h2>
<p><strong>Overall:</strong> Impressive interactive experience. D3 force graph, neural network visualization, node editing, filtering. This feels like a premium product page. But it operates as a standalone app rather than an AOM page.</p>
<h3>Issues Found</h3>
<h4>1. NO SITE NAVIGATION OR FOOTER</h4>
<p><strong>Severity:</strong> High (site coherence)</p>
<p>The Ideas Tracker is a full-viewport canvas (<code>100vw x 100vh</code>) with zero navigation back to the rest of the site. No AOM logo, no header, no footer, no way to get back to the homepage except the browser back button. Every other AOM page has either:</p>
<ul>
<li>The full sticky nav (homepage)</li>
<li>A simplified &quot;AOM&quot; text link + breadcrumb (briefs, book)</li>
</ul>
<p>This page has neither. If someone lands here from a shared link, they don&#39;t know they&#39;re on aheadofmarket.com.</p>
<p><strong>Fix for Bobby:</strong></p>
<ul>
<li>Add a minimal fixed nav bar at top-left: <code>AOM.</code> logo linking to <code>/</code>, matching the homepage pattern (<code>text-2xl font-headline font-extrabold tracking-[-0.03em] text-[#F0ECE6]</code> with orange dot)</li>
<li>The filter bar at <code>z-50</code> already occupies the top. Integrate the logo into the left side of the existing filter bar, before the status chips</li>
<li>Background of filter bar is already <code>rgba(10,10,8,0.85)</code> with <code>backdrop-blur(12px)</code>, which matches the homepage nav&#39;s scroll state exactly. Just needs the logo.</li>
</ul>
<h4>2. BACKGROUND COLOR INCONSISTENCY</h4>
<p><strong>Severity:</strong> Low-Medium</p>
<p>The canvas background is <code>#0C0C0C</code> (aom-night), but the homepage and briefs page use <code>#0A0A08</code>. The sidebar panels use <code>#141412</code> (aom-charcoal). These are all valid brand colors, but <code>#0A0A08</code> is the canonical page background per the v4 system. <code>#0C0C0C</code> is the night variant used for cards/nav overlays.</p>
<p>This is a small delta (visually almost indistinguishable) but worth aligning for consistency.</p>
<p><strong>Fix for Bobby:</strong></p>
<ul>
<li>Canvas background: <code>#0C0C0C</code> -&gt; <code>#0A0A08</code></li>
<li>The filter bar&#39;s <code>rgba(10,10,8,0.85)</code> is already correct (that&#39;s <code>#0A0A08</code> with alpha)</li>
<li>Sidebar panels at <code>#141412</code> are fine (elevated surface)</li>
</ul>
<h4>3. INLINE STYLES vs TAILWIND</h4>
<p><strong>Severity:</strong> Medium (maintenance)</p>
<p>The entire IdeasTracker uses inline <code>style={{}}</code> objects instead of Tailwind classes. This is understandable for the SVG/canvas-heavy visualization, but the UI panels (FilterBar, AddEditPanel, DetailPanel) could use Tailwind. Key concern: if the Tailwind config evolves (color values change, font weights adjust), this page won&#39;t inherit those changes because everything is hardcoded.</p>
<p>Colors used inline that should reference Tailwind tokens:</p>
<ul>
<li><code>#F5F0EB</code> (aom-warm-white) - used 12+ times inline</li>
<li><code>#E85D26</code> (aom-orange) - used 20+ times inline</li>
<li><code>#0C0C0C</code> - used as background</li>
<li><code>#141412</code> (aom-charcoal) - used for panels</li>
<li><code>#78716C</code> - used for muted text (not an exact match for <code>aom-text-muted</code> which is <code>#8A847C</code>)</li>
<li><code>#292524</code> - used for borders (not in Tailwind config at all)</li>
</ul>
<p><strong>Fix for Bobby:</strong> Not urgent, but flag for next refactor pass. The inline styles work. The risk is drift over time.</p>
<h4>4. MUTED TEXT COLOR DEVIATION</h4>
<p><strong>Severity:</strong> Low</p>
<p>The Ideas page uses <code>#78716C</code> for muted/secondary text extensively. The AOM brand system uses <code>#8A847C</code> (aom-text-muted) or <code>#A89F96</code> (aom-dim). <code>#78716C</code> is darker and cooler. On the near-black background this reads fine, but it&#39;s a different value than every other AOM page.</p>
<p><strong>Fix for Bobby:</strong> Replace <code>#78716C</code> with <code>#8A847C</code> across the Ideas Tracker panels and UI chrome. Keep the SVG visualization colors as-is (those are part of the node visual system, not body text).</p>
<h4>5. BORDER COLOR: #292524 NOT IN BRAND SYSTEM</h4>
<p><strong>Severity:</strong> Low</p>
<p>The Ideas page uses <code>#292524</code> as its border color throughout (filter chips, panel dividers, inputs). The AOM Tailwind config uses:</p>
<ul>
<li><code>aom-night-border: rgba(255,255,255,0.10)</code> for dark surfaces</li>
<li><code>aom-night-border-hover: rgba(255,255,255,0.18)</code> for hover states</li>
</ul>
<p><code>#292524</code> is a warm stone-brown. <code>rgba(255,255,255,0.10)</code> on <code>#0C0C0C</code> renders as roughly <code>#1F1F1F</code> (neutral gray). The warm tone of <code>#292524</code> actually looks good here, but it&#39;s not in the config.</p>
<p><strong>Recommendation:</strong> Either add <code>#292524</code> to the Tailwind config as <code>aom-night-border-warm</code> (if we want it as an option), or replace with <code>border-white/10</code> to match the system. Low priority.</p>
<h3>What Works Well</h3>
<ul>
<li>Color coding by category and status is clear and effective</li>
<li>Glow effects on nodes feel premium</li>
<li>The D3 force simulation is smooth</li>
<li>Panel sliding animations are responsive-aware (full screen on mobile, bottom sheet on tablet, side panel on desktop)</li>
<li>Font loading: correctly imports Syne, Space Grotesk, JetBrains Mono via Google Fonts in the injected keyframes</li>
<li>JetBrains Mono used correctly for all filter chips, labels, and system text</li>
<li>Save button uses correct aom-orange with hover to aom-orange-hover (#D14E1C)</li>
<li>Input focus states use orange ring. Correct.</li>
</ul>
<hr>
<h2>PAGE 2: /briefs (BriefsHub.jsx)</h2>
<p><strong>Overall:</strong> Clean. This is the most brand-aligned of the three pages. Correct typography stack, correct color usage, correct hierarchy. The accordion pattern is well-executed.</p>
<h3>Issues Found</h3>
<h4>1. NO SHARED NAV COMPONENT</h4>
<p><strong>Severity:</strong> Medium</p>
<p>The page has a simple <code>AOM</code> text link at the top (line 248) that links to the homepage. This works as a minimal breadcrumb. But it doesn&#39;t match the homepage&#39;s nav pattern: no phone number, no &quot;Start a Brief&quot; CTA, no section links.</p>
<p>For internal/reference pages, the minimal approach is fine. But /briefs is a page we might share externally (client can see all our agent output). The lack of a CTA (&quot;Book an Audit&quot; or &quot;Start a Brief&quot;) is a missed conversion opportunity.</p>
<p><strong>Fix for Bobby:</strong></p>
<ul>
<li>Add a &quot;Book Audit&quot; or &quot;Talk to Us&quot; CTA link in the header area, right-aligned, matching the homepage&#39;s nav CTA style: <code>px-6 py-3 bg-aom-orange text-white font-headline font-extrabold text-base uppercase tracking-[0.15em]</code></li>
<li>Keep the minimal aesthetic. Don&#39;t replicate the full homepage nav. Just: <code>AOM</code> left, CTA button right.</li>
</ul>
<h4>2. &quot;COMING&quot; LABEL TOO SMALL</h4>
<p><strong>Severity:</strong> Medium (readability)</p>
<p>Line 199: <code>font-mono text-[11px]</code> for the &quot;Coming&quot; badge on items without pages. 11px is below the 16px body minimum. The label is short (&quot;Coming&quot;) and purely supplemental, so the readability impact is low. But it breaks the rule.</p>
<p><strong>Fix for Bobby:</strong> Bump to <code>text-xs</code> (12px) minimum. Still small enough to read as a secondary label. Or better: remove the &quot;Coming&quot; text entirely and just gray out the item (which is already done via <code>opacity-60</code>). The grayed-out state communicates &quot;not available&quot; without needing a label.</p>
<h4>3. ITEM DATE TEXT TOO SMALL</h4>
<p><strong>Severity:</strong> Medium (readability)</p>
<p>Line 209: <code>font-mono text-[13px]</code> for dates. Also below 16px. This is a common pattern across the site (mono labels at 13px), and it works visually as metadata. But Elmo already flagged 102 sub-16px elements on the homepage. This page adds more.</p>
<p><strong>Recommendation:</strong> This is a systemic decision. Either:</p>
<ul>
<li>Accept 13px as the floor for mono metadata labels (document as a brand exception)</li>
<li>Or bump all mono metadata to <code>text-sm</code> (14px)</li>
</ul>
<p>I&#39;d recommend documenting 13px JetBrains Mono as the accepted minimum for metadata/labels only. Body text stays at 16px.</p>
<h4>4. FOOTER IS TOO MINIMAL</h4>
<p><strong>Severity:</strong> Low</p>
<p>The footer is 3 lines: AOM link, aheadofmarket.com text, border-top. The homepage footer is a full section with CTAs, email, phone, and a massive headline. The briefs footer looks like an afterthought by comparison.</p>
<p><strong>Fix for Bobby:</strong> Add at minimum: email (<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>), phone, and a &quot;Book an Audit&quot; CTA to the footer. Match the tone of /book&#39;s footer which has Home, The System, and ROI Calculator links.</p>
<h3>What Works Well</h3>
<ul>
<li>Background: <code>bg-[#0A0A08]</code> -- correct canonical page background</li>
<li>Typography: <code>font-headline</code> for headings, <code>font-body</code> for items, <code>font-mono</code> for labels. All correct.</li>
<li>Hero structure: Mono label &gt; orange accent bar &gt; big headline &gt; description &gt; stats. Matches homepage pattern.</li>
<li>Accordion: <code>border-l-[3px] border-l-aom-orange</code> active indicator is clean</li>
<li>Sage (#7C9A72) used consistently for item counts, agent names, and chevron. Correct isolation (sage = system/AI layer).</li>
<li>Category structure is logical and comprehensive (8 categories, 52 total items, 16 live)</li>
<li>Warm white <code>#F5F0EB</code> used for primary text on dark background. Correct.</li>
<li>Framer Motion animations with staggered delays. On-brand.</li>
</ul>
<hr>
<h2>PAGE 3: /book (BookAudit.jsx)</h2>
<p><strong>Overall:</strong> This is a conversion page and it looks like one. Professional, focused, clear CTA hierarchy. The form is well-structured. Minor brand deviations.</p>
<h3>Issues Found</h3>
<h4>1. BACKGROUND COLOR DEVIATION</h4>
<p><strong>Severity:</strong> Low-Medium</p>
<p>Uses <code>bg-[#0C0C0C]</code> (aom-night) as the page background, same as /ideas. The canonical page background is <code>#0A0A08</code>. The homepage, briefs, and brand guidelines all use <code>#0A0A08</code>.</p>
<p><strong>Fix for Bobby:</strong> <code>bg-[#0C0C0C]</code> -&gt; <code>bg-[#0A0A08]</code> on the outer div and any sections that reference <code>#0C0C0C</code> directly.</p>
<h4>2. LABEL TEXT AT 10px</h4>
<p><strong>Severity:</strong> High (readability)</p>
<p>Every form label and section label uses <code>text-[10px]</code>. That&#39;s:</p>
<ul>
<li>Line 114: &quot;What Happens Next&quot; label</li>
<li>Line 190: &quot;AI Operations Audit&quot; label</li>
<li>Lines 226, 242, 258, 274, 289, 312, 437: All form labels</li>
<li>Lines 362, 388, 399, 414: Sidebar section labels</li>
</ul>
<p>10px is 6px below the 16px minimum. Even for mono uppercase labels, 10px is pushing it. This is the most aggressive sub-minimum text on any AOM page.</p>
<p><strong>Fix for Bobby:</strong> Bump all <code>text-[10px]</code> to <code>text-xs</code> (12px) minimum. For the form labels specifically, <code>text-[11px]</code> or <code>text-xs</code> would preserve the compact mono label aesthetic while improving readability. The uppercase + wide tracking (<code>tracking-[0.3em]</code>) at 10px makes individual characters barely 7-8px tall.</p>
<h4>3. NAV INCONSISTENCY WITH HOMEPAGE</h4>
<p><strong>Severity:</strong> Medium</p>
<p>The /book page has its own nav (line 167): fixed, <code>bg-[#0C0C0C]/90 backdrop-blur-sm</code>, with <code>AOM</code> logo left and phone number right. The homepage nav has:</p>
<ul>
<li>Logo: <code>AOM.</code> with orange dot, text-2xl/3xl, font-extrabold</li>
<li>/book logo: <code>AOM</code> (no orange dot), text-lg, font-black</li>
</ul>
<p>Differences:</p>
<ul>
<li>Missing orange dot on logo</li>
<li><code>font-black</code> (900) instead of <code>font-extrabold</code> (800)</li>
<li><code>text-lg</code> instead of <code>text-2xl</code></li>
<li><code>tracking-tighter</code> instead of <code>tracking-[-0.03em]</code></li>
<li>No nav links (acceptable for a conversion page)</li>
<li>Phone number in nav (good for conversion)</li>
</ul>
<p><strong>Fix for Bobby:</strong></p>
<ul>
<li>Add orange dot: <code>AOM&lt;span className=&quot;text-[#E85D26]&quot;&gt;.&lt;/span&gt;</code></li>
<li>Match weight: <code>font-extrabold</code> instead of <code>font-black</code></li>
<li>Match size: <code>text-2xl</code> instead of <code>text-lg</code></li>
<li>Match tracking: <code>tracking-[-0.03em]</code> instead of <code>tracking-tighter</code></li>
</ul>
<h4>4. H1 USES <code>italic</code> -- INCONSISTENT WITH REST OF SITE</h4>
<p><strong>Severity:</strong> Low</p>
<p>Line 194: <code>font-black italic uppercase tracking-tighter</code>. The homepage headings are <code>font-extrabold uppercase tracking-[-0.02em]</code> with NO italic. The Mar 12 review noted that italic was in the brand guidelines but consciously omitted from the site. /book&#39;s H1 is the only italic heading on the entire site.</p>
<p><strong>Fix for Bobby:</strong> Remove <code>italic</code> from the H1. Change <code>font-black</code> to <code>font-extrabold</code>. Change <code>tracking-tighter</code> to <code>tracking-[-0.02em]</code>. This aligns with the established homepage pattern.</p>
<p>Also applies to:</p>
<ul>
<li>Line 106: Success state H1 (<code>font-black italic</code>)</li>
<li>Line 434: Pull quote heading (<code>font-bold</code>, not <code>font-extrabold</code>)</li>
</ul>
<h4>5. NO PATTERN STRIP</h4>
<p><strong>Severity:</strong> Low</p>
<p>The homepage uses pattern strips between sections. /book has zero. For a conversion page this is actually fine (less visual noise = more focus on the form). But the orange accent bar (<code>w-12 h-[2px] bg-[#E85D26]</code>) IS present (lines 193, 262, 433), which is the correct lightweight alternative per the Mar 12 review.</p>
<p><strong>No fix needed.</strong> Orange accent bars are the right call for this page type.</p>
<h3>What Works Well</h3>
<ul>
<li>Form UX is excellent: clear labels, proper focus states with orange ring, team size chips, textarea</li>
<li>Price callout section with orange border is attention-grabbing without being overkill</li>
<li>&quot;What&#39;s Included&quot; section with icon grid is scannable</li>
<li>Grid layout (7/5 split) gives the form breathing room</li>
<li>Formspree integration with GA event tracking</li>
<li>Success state is well-designed (numbered steps, clear next actions, two CTAs)</li>
<li>Font stack is correct: Syne headings, Space Grotesk body, JetBrains Mono labels</li>
<li>Footer includes relevant page links (Home, The System, ROI Calculator)</li>
<li>Phone and email prominently displayed</li>
</ul>
<hr>
<h2>CROSS-PAGE CONSISTENCY ISSUES</h2>
<h3>1. No Shared Nav Component</h3>
<p><strong>Severity:</strong> High (site feels fragmented)</p>
<p>Each page builds its own nav:</p>
<table>
<thead>
<tr>
<th>Page</th>
<th>Nav Style</th>
<th>Logo</th>
<th>CTA</th>
</tr>
</thead>
<tbody><tr>
<td>Homepage</td>
<td>Full sticky, scroll transition</td>
<td>AOM. (orange dot, 2xl, extrabold)</td>
<td>Start a Brief + Talk to Us</td>
</tr>
<tr>
<td>/briefs</td>
<td>Static text link</td>
<td>AOM (no dot, sm, bold)</td>
<td>None</td>
</tr>
<tr>
<td>/ideas</td>
<td>None</td>
<td>None</td>
<td>None</td>
</tr>
<tr>
<td>/book</td>
<td>Fixed minimal</td>
<td>AOM (no dot, lg, black)</td>
<td>Phone number</td>
</tr>
</tbody></table>
<p><strong>Fix for Bobby:</strong> Create a shared <code>&lt;SiteNav /&gt;</code> component with two modes:</p>
<ul>
<li><code>variant=&quot;full&quot;</code> -- Homepage style with all links + CTAs</li>
<li><code>variant=&quot;minimal&quot;</code> -- Logo (with orange dot) left, optional CTA right</li>
</ul>
<p>Use <code>variant=&quot;minimal&quot;</code> on /briefs, /ideas, /book. This single component fixes the logo inconsistency, adds navigation, and ensures brand marks are identical.</p>
<h3>2. No Shared Footer Component</h3>
<p><strong>Severity:</strong> Medium</p>
<p>Same fragmentation problem:</p>
<table>
<thead>
<tr>
<th>Page</th>
<th>Footer</th>
</tr>
</thead>
<tbody><tr>
<td>Homepage</td>
<td>Massive CTA section, phone, email, grid layout</td>
</tr>
<tr>
<td>/briefs</td>
<td>3 lines: logo + domain</td>
</tr>
<tr>
<td>/ideas</td>
<td>No footer</td>
</tr>
<tr>
<td>/book</td>
<td>Minimal: company name + 3 links</td>
</tr>
</tbody></table>
<p><strong>Fix for Bobby:</strong> Create <code>&lt;SiteFooter /&gt;</code> with two modes:</p>
<ul>
<li><code>variant=&quot;full&quot;</code> -- Homepage&#39;s big footer</li>
<li><code>variant=&quot;compact&quot;</code> -- Company name, email, phone, 3-4 key page links</li>
</ul>
<h3>3. Background Color Split</h3>
<p><strong>Severity:</strong> Low</p>
<table>
<thead>
<tr>
<th>Page</th>
<th>Background</th>
</tr>
</thead>
<tbody><tr>
<td>Homepage</td>
<td><code>#0A0A08</code> (via sections)</td>
</tr>
<tr>
<td>/briefs</td>
<td><code>#0A0A08</code></td>
</tr>
<tr>
<td>/book</td>
<td><code>#0C0C0C</code></td>
</tr>
<tr>
<td>/ideas</td>
<td><code>#0C0C0C</code></td>
</tr>
</tbody></table>
<p>Align all to <code>#0A0A08</code>.</p>
<h3>4. Sub-16px Text Is Systemic</h3>
<p>Every page has sub-16px text in mono labels. This needs a documented brand exception rather than page-by-page fixes:</p>
<p><strong>Proposed brand addendum:</strong></p>
<ul>
<li>16px minimum for body text (Space Grotesk)</li>
<li>13px minimum for mono metadata labels (JetBrains Mono, uppercase, tracking &gt;= 0.1em)</li>
<li>12px minimum for mono badges/chips (JetBrains Mono, uppercase, tracking &gt;= 0.12em)</li>
<li>10px is NEVER acceptable. Bump all 10px to 12px minimum.</li>
</ul>
<hr>
<h2>ACTION ITEMS FOR BOBBY (Priority Order)</h2>
<h3>Must Fix (Brand Integrity)</h3>
<ol>
<li><strong>Create shared <code>&lt;SiteNav /&gt;</code> component</strong> with full + minimal variants. Apply to /briefs, /ideas, /book. Logo must be <code>AOM.</code> with orange dot on all pages.</li>
<li><strong>Create shared <code>&lt;SiteFooter /&gt;</code> component</strong> with full + compact variants. Apply to all pages.</li>
<li><strong>Fix /book label sizes</strong> -- All <code>text-[10px]</code> -&gt; <code>text-xs</code> (12px) minimum.</li>
<li><strong>Remove <code>italic</code> from /book headings</strong> -- Align with homepage&#39;s non-italic standard.</li>
<li><strong>Align background colors</strong> -- /book and /ideas: <code>#0C0C0C</code> -&gt; <code>#0A0A08</code>.</li>
</ol>
<h3>Should Fix (Polish)</h3>
<ol start="6">
<li><strong>Add AOM logo to /ideas filter bar</strong> -- Left side, before status chips.</li>
<li><strong>Fix /book logo</strong> -- Add orange dot, match size/weight to homepage.</li>
<li><strong>/briefs: Remove &quot;Coming&quot; text or bump to 12px</strong> -- Grayed-out state already communicates unavailability.</li>
<li><strong>/briefs footer: Add email, phone, CTA</strong> -- Match /book&#39;s footer as minimum.</li>
<li><strong>/ideas: Replace <code>#78716C</code> with <code>#8A847C</code></strong> for muted text in UI panels.</li>
</ol>
<h3>Nice to Have (Future Refactor)</h3>
<ol start="11">
<li>Add <code>#292524</code> to Tailwind config as <code>aom-night-border-warm</code>, or replace with <code>border-white/10</code> in /ideas.</li>
<li>Refactor /ideas inline styles to Tailwind classes where possible (UI panels, not SVG).</li>
<li>Document the sub-16px exception for mono labels in brand guidelines v4.</li>
</ol>
<hr>
<h2>BRAND HEALTH SCORE</h2>
<table>
<thead>
<tr>
<th>Page</th>
<th>Score</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>/briefs</td>
<td>8.5/10</td>
<td>Cleanest of the three. Minor footer/nav gaps.</td>
</tr>
<tr>
<td>/book</td>
<td>7/10</td>
<td>Good conversion page. Logo mismatch, 10px labels, italic drift.</td>
</tr>
<tr>
<td>/ideas</td>
<td>6/10</td>
<td>Impressive interactive experience. No nav, no footer, color deviations.</td>
</tr>
</tbody></table>
<p><strong>Overall site coherence:</strong> 6.5/10. The individual pages are good. The problem is they feel like separate sites because there&#39;s no shared navigation or footer component. Fixing items #1 and #2 above would immediately bump this to 8/10.</p>
<hr>
<p><em>Next review: after Bobby ships shared nav/footer components. Playwright screenshot comparison at that time.</em></p>
`,c={title:e,slug:t,category:o,agent:n,date:i,dateFormatted:a,updated:null,summary:r,tags:s,content:d};export{n as agent,o as category,d as content,i as date,a as dateFormatted,c as default,t as slug,r as summary,s as tags,e as title,l as updated};
