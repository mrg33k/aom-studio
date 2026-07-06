const t="AOM Homepage Redesign QA: Round 4",e="elmo-aom-redesign-qa-r4",o="Audits",n="Elmo",d="2026-03-09",r="Mar 9",l=null,a="Fourth QA round of Dark Frame redesign after 3 previous FAILs from stale deploys.",i=[],s=`<h1>Elmo QA Report R4: AOM Homepage -- Dark Frame Redesign</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>URL:</strong> <a href="https://aheadofmarket.com">https://aheadofmarket.com</a>
<strong>Previous reports:</strong> R1, R2, R3 (all FAIL -- stale deploys)
<strong>Context:</strong> Bobby&#39;s commits (1b89e88, 99794e4, 687146e) finally deployed to production. This is the first time the Dark Frame redesign is actually live.
<strong>Verdict: CONDITIONAL PASS. The Dark Frame redesign is deployed and the site looks dramatically different. Major structural wins. A handful of polish items remain.</strong></p>
<hr>
<h2>EXECUTIVE SUMMARY</h2>
<p>The site has been completely transformed. After three rounds of testing stale deploys, the Dark Frame redesign is finally live on production. The page went from 36% dark / 64% cream to <strong>94% dark / 6% cream</strong>. The hero is dark with video. Pattern dividers exist. Copy is updated. Service titles are correct. Mobile video is visible. This is a different website than what was live 24 hours ago.</p>
<p>There are still issues. But they&#39;re polish issues, not structural failures. The bones are right.</p>
<hr>
<h2>R3 BLOCKER STATUS (all 6 from previous rounds)</h2>
<h3>B1. HERO DARK FLIP -- FIXED</h3>
<table>
<thead>
<tr>
<th>What</th>
<th>Spec</th>
<th>R3 (old)</th>
<th>R4 (now)</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Hero bg</td>
<td><code>#0C0C0C</code></td>
<td><code>rgb(253,246,236)</code> cream</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>FIXED</td>
</tr>
<tr>
<td>Video visible</td>
<td>Yes, 55% opacity</td>
<td>18% opacity, barely visible</td>
<td>Visible, playing</td>
<td>FIXED</td>
</tr>
<tr>
<td>Hero text</td>
<td>White <code>#F0ECE6</code></td>
<td>Black <code>rgb(10,10,10)</code></td>
<td>White on dark</td>
<td>FIXED</td>
</tr>
<tr>
<td>Subhead</td>
<td>Updated copy</td>
<td>Old copy</td>
<td>&quot;Video, web, and brand systems for construction companies ready to stand out.&quot;</td>
<td>FIXED</td>
</tr>
<tr>
<td>Starburst element</td>
<td>Remove</td>
<td>Present</td>
<td>Gone</td>
<td>FIXED</td>
</tr>
</tbody></table>
<p>The hero looks like a production company&#39;s homepage now. Dark background, video playing behind the text, white type, orange accent on &quot;IMPOSSIBLE TO IGNORE.&quot; This is the energy we were asking for.</p>
<p><strong>One note:</strong> Desktop hero video opacity is extremely low (~0.047 computed). The video is barely perceptible as a dark shimmer behind the text. On mobile it&#39;s 0.55 which is much better. The spec called for 0.55 on desktop too. This isn&#39;t a blocker (the dark aesthetic works either way) but the video could punch harder on desktop.</p>
<h3>B2. PATTERN STRIP DIVIDERS -- FIXED</h3>
<p>Found <strong>7 pattern divider elements</strong> between sections. They use the correct brand v4 diagonal line pattern:</p>
<pre><code>repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)
</code></pre>
<p>Some dividers alternate with a cross-hatch variant. All are 48px tall (h-8 md:h-12). There&#39;s also a small orange bar accent (2px, <code>bg-aom-orange</code>). The pattern strip rhythm between sections is present and correct. This was the brand signature that was completely missing for three rounds.</p>
<h3>B3. MOBILE OVERFLOW -- STILL FIXED (4th consecutive round)</h3>
<p><code>scrollWidth === clientWidth</code> (390 = 390). No horizontal overflow.</p>
<h3>B4. NAV SCROLL BEHAVIOR -- PARTIALLY FIXED</h3>
<p>The nav uses a <code>&lt;header&gt;</code> element (not <code>&lt;nav&gt;</code>), which is why my nav query returned &quot;no nav.&quot; The header has:</p>
<ul>
<li>At top: <code>bg-gradient-to-b from-black/40 to-transparent</code> (dark gradient, not cream)</li>
<li>After scroll: Appears to darken/solidify based on the screenshot</li>
</ul>
<p>The gradient is now dark-based (<code>from-black/40</code>) instead of the old cream gradient (<code>from-aom-cream/95</code>). This is a major improvement. The nav blends into the dark hero and dark sections correctly.</p>
<p><strong>Issue:</strong> Could not programmatically verify the scroll transition because the element is a <code>&lt;header&gt;</code> not <code>&lt;nav&gt;</code>. Visually, the scrolled nav screenshot shows a dark, near-opaque header bar with &quot;TALK TO US&quot; and &quot;START A BRIEF&quot; buttons clearly visible. This looks correct.</p>
<p><strong>Status: FIXED</strong> (gradient direction is correct, dark-based)</p>
<h3>B5. SERVICE TITLES -- FIXED</h3>
<table>
<thead>
<tr>
<th>Old</th>
<th>Spec</th>
<th>R4 (now)</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>&quot;Content Engine&quot;</td>
<td>&quot;Monthly Content&quot;</td>
<td>&quot;Monthly Content&quot;</td>
<td>FIXED</td>
</tr>
<tr>
<td>&quot;Production&quot;</td>
<td>&quot;Brand Videos&quot;</td>
<td>&quot;Brand Videos&quot;</td>
<td>FIXED</td>
</tr>
<tr>
<td>&quot;Digital Infrastructure&quot;</td>
<td>&quot;Websites + Systems&quot;</td>
<td>&quot;Websites + Systems&quot;</td>
<td>FIXED</td>
</tr>
</tbody></table>
<p>All three service titles updated correctly. They appear in the &quot;THREE WAYS IN&quot; section.</p>
<h3>B6. HERO SUBHEAD -- FIXED</h3>
<p>Old: &quot;Content, websites, and systems for companies that build, grow, and ship.&quot;
Spec: &quot;Video, web, and brand systems for construction companies ready to stand out.&quot;
Live: &quot;Video, web, and brand systems for construction companies ready to stand out.&quot;</p>
<p>Exact match. FIXED.</p>
<hr>
<h2>COLOR RATIO -- SPEC MET</h2>
<table>
<thead>
<tr>
<th>Type</th>
<th>R3</th>
<th>R4</th>
<th>Spec</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Dark</td>
<td>36%</td>
<td><strong>94%</strong></td>
<td>~95%</td>
<td>PASS</td>
</tr>
<tr>
<td>Light (cream)</td>
<td>64%</td>
<td><strong>6%</strong></td>
<td>~5%</td>
<td>PASS</td>
</tr>
</tbody></table>
<p>Section-by-section backgrounds:</p>
<table>
<thead>
<tr>
<th>Section</th>
<th>Heading</th>
<th>BG Color</th>
<th>Dark?</th>
</tr>
</thead>
<tbody><tr>
<td>Hero</td>
<td>&quot;WE MAKE COMPANIES...&quot;</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>YES</td>
</tr>
<tr>
<td>Construction</td>
<td>&quot;YOUR COMPETITOR&#39;S INSTAGRAM...&quot;</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>YES</td>
</tr>
<tr>
<td>Work Speaks</td>
<td>&quot;The Work Speaks.&quot;</td>
<td><code>rgb(26,26,26)</code> #1A1A1A</td>
<td>YES</td>
</tr>
<tr>
<td>Portfolio</td>
<td>&quot;ThePortfolio.&quot;</td>
<td><code>rgb(21,21,21)</code> #151515</td>
<td>YES</td>
</tr>
<tr>
<td>Brands</td>
<td>&quot;THE STORY IS ALREADY THERE...&quot;</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>YES</td>
</tr>
<tr>
<td><strong>Services</strong></td>
<td><strong>&quot;THREE WAYS IN&quot;</strong></td>
<td><strong><code>rgb(253,246,236)</code> #FDF6EC</strong></td>
<td><strong>NO (correct)</strong></td>
</tr>
<tr>
<td>Packages</td>
<td>&quot;Pick What Fits.&quot;</td>
<td><code>rgb(26,26,26)</code> #1A1A1A</td>
<td>YES</td>
</tr>
<tr>
<td>Why It Works</td>
<td>&quot;Why It Works.&quot;</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>YES</td>
</tr>
<tr>
<td>Engine</td>
<td>&quot;THE ENGINE BEHIND THE BRAND&quot;</td>
<td><code>rgb(26,26,26)</code> #1A1A1A</td>
<td>YES</td>
</tr>
<tr>
<td>Trust Quote</td>
<td>(unnamed)</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>YES</td>
</tr>
<tr>
<td>FAQ</td>
<td>&quot;Common Questions.&quot;</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>YES</td>
</tr>
<tr>
<td>Footer</td>
<td>&quot;Ready to Build?&quot;</td>
<td><code>rgb(12,12,12)</code> #0C0C0C</td>
<td>YES</td>
</tr>
</tbody></table>
<p>The only cream section is Services (&quot;THREE WAYS IN&quot;) at <code>#FDF6EC</code> -- exactly as specified. Every other section is dark, using the correct palette of <code>#0C0C0C</code> (Night), <code>#1A1A1A</code> (mid-dark), and <code>#151515</code> (Night Card). This is textbook Dark Frame.</p>
<hr>
<h2>MOBILE VIDEO -- FIXED</h2>
<table>
<thead>
<tr>
<th>Viewport</th>
<th>R3</th>
<th>R4</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Desktop</td>
<td>display: block, opacity: 0.18</td>
<td>display: block, opacity: ~0.05, 1656x1554px</td>
<td>Visible but very faint</td>
</tr>
<tr>
<td>Mobile</td>
<td>display: none, 0x0</td>
<td>display: block, opacity: 0.55, 449x1632px</td>
<td>FIXED</td>
</tr>
<tr>
<td>Tablet</td>
<td>Not tested</td>
<td>Visible (confirmed in screenshot)</td>
<td>FIXED</td>
</tr>
</tbody></table>
<p>Mobile hero video is now visible at 55% opacity. It shows actual footage (you can see a person/subject through the dark overlay in the mobile screenshot). This was completely hidden for three rounds. Major fix.</p>
<p>Desktop video opacity is oddly low (~0.047). May be an animation state caught mid-transition, or an intentional ultra-subtle approach. Worth checking.</p>
<hr>
<h2>WHAT&#39;S NEW AND WORKING (compared to R3)</h2>
<ol>
<li><strong>Dark Frame is live.</strong> 94% dark. The site feels like a production company, not a bakery.</li>
<li><strong>Hero is commanding.</strong> Dark background, big white type, orange &quot;IMPOSSIBLE TO IGNORE&quot; accent, video behind it.</li>
<li><strong>Pattern dividers create rhythm.</strong> 7 orange diagonal-line strips between sections. The brand signature from v4 guidelines is present.</li>
<li><strong>Service titles are correct.</strong> Monthly Content, Brand Videos, Websites + Systems.</li>
<li><strong>Subhead copy is correct.</strong> Construction companies, ready to stand out.</li>
<li><strong>Mobile video plays.</strong> At 55% opacity, visible and effective.</li>
<li><strong>Nav is dark-based.</strong> <code>from-black/40</code> gradient instead of cream.</li>
<li><strong>Color palette is consistent.</strong> Proper use of Night, Night Card, and mid-dark surfaces with warm text colors.</li>
<li><strong>Portfolio section looks great.</strong> Dark cards on dark background, good tag badges, video thumbnails.</li>
<li><strong>Pathway cards on hero</strong> have frosted dark glass aesthetic (visible in mobile/tablet screenshots).</li>
<li><strong>Footer CTA still hits.</strong> &quot;Ready to Build?&quot; in outlined type on <code>#0C0C0C</code>.</li>
<li><strong>No mobile overflow.</strong> Clean responsive layout.</li>
</ol>
<hr>
<h2>REMAINING ISSUES</h2>
<h3>POLISH (should fix, not blockers)</h3>
<h4>P1. Desktop Hero Video Opacity Too Low</h4>
<p>Computed opacity: ~0.047 (4.7%). The spec calls for video at 55% opacity with a dark overlay. Mobile correctly shows 0.55. Desktop shows ~0.05 -- the video is barely a dark shimmer. This might be an animation keyframe captured at a low point, or it&#39;s genuinely too faint. On mobile and tablet the video is clearly visible through the overlay, which is the right look.</p>
<p><strong>Fix:</strong> Check if there&#39;s a CSS animation cycling the opacity. If so, ensure the resting state is higher (0.3-0.55 range). If it&#39;s static, bump desktop video opacity to match mobile (0.55).</p>
<h4>P2. Text Size Violations (10px elements)</h4>
<p>Desktop has <strong>~30 elements under 13px</strong>. Most are acceptable badge/label scale (11px), but some are below minimum:</p>
<table>
<thead>
<tr>
<th>Element</th>
<th>Size</th>
<th>Min Spec</th>
<th>Verdict</th>
</tr>
</thead>
<tbody><tr>
<td>&quot;Posts / Month&quot;, &quot;Filming + Posting&quot;</td>
<td>10px</td>
<td>11px (badge)</td>
<td>BELOW MIN</td>
</tr>
<tr>
<td>&quot;Projects Shipped&quot;, &quot;Clients Served&quot;, &quot;Videos Delivered&quot;</td>
<td>10px</td>
<td>11px (badge)</td>
<td>BELOW MIN</td>
</tr>
<tr>
<td>&quot;Startup AZ Foundation&quot;, &quot;Naamly&quot;, &quot;Virtu Hospitality Group&quot;</td>
<td>10px</td>
<td>11px (badge)</td>
<td>BELOW MIN</td>
</tr>
<tr>
<td>&quot;Attracted 3-Cohorts...&quot;, &quot;150% pipeline growth&quot;, &quot;3 venue launches&quot;</td>
<td>10px</td>
<td>11px (badge)</td>
<td>BELOW MIN</td>
</tr>
<tr>
<td>Portfolio tag badges (&quot;Tech&quot;, &quot;Global&quot;, &quot;Doc&quot;, &quot;Build&quot;)</td>
<td>9px</td>
<td>11px (badge)</td>
<td>BELOW MIN</td>
</tr>
<tr>
<td>Portfolio subtitles (&quot;Global Tech Expo&quot;, etc.)</td>
<td>10px</td>
<td>11px</td>
<td>BELOW MIN</td>
</tr>
<tr>
<td>&quot;Creative Production + AI Systems&quot; label</td>
<td>11px</td>
<td>11px (badge)</td>
<td>OK</td>
</tr>
<tr>
<td>&quot;Phoenix, AZ&quot; / &quot;Est. 2020&quot;</td>
<td>11px</td>
<td>11px (badge)</td>
<td>OK</td>
</tr>
</tbody></table>
<p><strong>Fix:</strong> Bump all 10px elements to 11px, and 9px tag badges to 11px. This is a find-and-replace on <code>text-[10px]</code> to <code>text-[11px]</code> and <code>text-[9px]</code> to <code>text-[11px]</code>.</p>
<p>Mobile also has the same 10px/9px violations.</p>
<h4>P3. Tap Target Violations (reduced from R3)</h4>
<p>R3 had 17 combined failures. R4 has <strong>3:</strong></p>
<table>
<thead>
<tr>
<th>Element</th>
<th>Size</th>
<th>Min</th>
<th>Issue</th>
</tr>
</thead>
<tbody><tr>
<td>&quot;AOM.&quot; logo link (desktop)</td>
<td>127x36</td>
<td>44px height</td>
<td>Logo link too short</td>
</tr>
<tr>
<td>&quot;<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>&quot; (desktop)</td>
<td>581x36</td>
<td>44px height</td>
<td>Email link too short</td>
</tr>
<tr>
<td>&quot;AOM.&quot; logo link (mobile)</td>
<td>102x32</td>
<td>44px height</td>
<td>Logo link too short</td>
</tr>
</tbody></table>
<p>The nav CTA buttons (&quot;Talk to Us&quot; at 132x44, &quot;Start a Brief&quot; at 236x44) are now <strong>44px tall</strong>. That was a major R3 blocker and it&#39;s fixed. The remaining tap target issues are minor (logo link height, footer email link height).</p>
<p><strong>Fix:</strong> Add <code>min-h-[44px]</code> to the logo link and footer email link. Quick.</p>
<h4>P4. Nav is a <code>&lt;header&gt;</code>, Not a <code>&lt;nav&gt;</code></h4>
<p>Semantic HTML: the navigation bar uses <code>&lt;header&gt;</code> instead of <code>&lt;nav&gt;</code>. Screen readers and accessibility tools expect <code>&lt;nav&gt;</code> for the main navigation. Not a visual issue, but an a11y concern.</p>
<p><strong>Fix:</strong> Wrap the navigation content in a <code>&lt;nav&gt;</code> element, or change the <code>&lt;header&gt;</code> to <code>&lt;nav&gt;</code>.</p>
<h4>P5. Console Errors (same as R3, no regression)</h4>
<ul>
<li>1x 400 status error (Sentry/analytics)</li>
<li>9x CSP &quot;upgrade-insecure-requests&quot; warnings (Gumlet iframes) -- informational, not actionable</li>
<li>3x <code>navigator.vibrate</code> blocked in cross-origin iframe (Gumlet) -- cosmetic</li>
</ul>
<h4>P6. Failed Requests</h4>
<ul>
<li>4x Google Analytics collect (ERR_ABORTED -- headless browser, expected)</li>
<li>2x Sentry envelope (ERR_ABORTED)</li>
<li>1x Gumlet 1080p video variant (ERR_ABORTED -- resolution negotiation)</li>
</ul>
<p>Gumlet failures reduced from 4 (R3) to 1 (R4). Improvement.</p>
<h4>P7. Heading Spacing</h4>
<p>Several headings render with no space between words in the DOM text:</p>
<ul>
<li>&quot;WE MAKE COMPANIESIMPOSSIBLE TO IGNORE.&quot; (missing space or line break before &quot;IMPOSSIBLE&quot;)</li>
<li>&quot;The WorkSpeaks.&quot; / &quot;ThePortfolio.&quot; / &quot;Pick WhatFits.&quot; / &quot;Why ItWorks.&quot; / &quot;CommonQuestions.&quot;</li>
</ul>
<p>This is likely a <code>&lt;br&gt;</code> or <code>&lt;span&gt;</code> splitting the words with CSS handling the visual spacing. Visually it looks correct in the screenshots (proper line breaks). But the raw text concatenation has no spaces, which would affect screen readers and SEO. Low priority but worth cleaning up.</p>
<hr>
<h2>PERFORMANCE (R4)</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>R1</th>
<th>R2</th>
<th>R3</th>
<th>R4</th>
<th>Trend</th>
</tr>
</thead>
<tbody><tr>
<td>DOM Content Loaded</td>
<td>3,234ms</td>
<td>1,128ms</td>
<td>1,721ms</td>
<td>2,103ms</td>
<td>Slightly up</td>
</tr>
<tr>
<td>First Contentful Paint</td>
<td>3,264ms</td>
<td>1,160ms</td>
<td>1,748ms</td>
<td>2,132ms</td>
<td>Slightly up</td>
</tr>
<tr>
<td>Total Load</td>
<td>--</td>
<td>--</td>
<td>13,928ms</td>
<td>21,062ms</td>
<td>Slower (new content?)</td>
</tr>
<tr>
<td>Mobile Load</td>
<td>--</td>
<td>--</td>
<td>--</td>
<td>5,363ms</td>
<td>Acceptable</td>
</tr>
</tbody></table>
<p>FCP at 2.1s is in the &quot;needs improvement&quot; zone (target &lt;1.8s). The total desktop load is high at 21s but that includes video iframes and Gumlet resolution negotiation. Mobile at 5.4s is reasonable for a video-heavy page.</p>
<p>The performance regression may be due to the new dark frame having more sections rendered, more pattern dividers, and video now visible at higher opacity. Worth investigating but not a blocker.</p>
<hr>
<h2>SCREENSHOTS SAVED</h2>
<p>All at: <code>/Users/patrik/Documents/Dev/AOM-EA/projects/bobby/double-check/</code></p>
<table>
<thead>
<tr>
<th>File</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>elmo-aom-r4-desktop-full.png</code></td>
<td>Desktop 1440x900 full page</td>
</tr>
<tr>
<td><code>elmo-aom-r4-desktop-hero.png</code></td>
<td>Desktop hero (dark, video, white text)</td>
</tr>
<tr>
<td><code>elmo-aom-r4-desktop-nav-scrolled.png</code></td>
<td>Nav after scroll (dark, solidified)</td>
</tr>
<tr>
<td><code>elmo-aom-r4-desktop-mid.png</code></td>
<td>Desktop mid-page (construction section, pattern dividers)</td>
</tr>
<tr>
<td><code>elmo-aom-r4-desktop-lower.png</code></td>
<td>Desktop portfolio section (dark cards)</td>
</tr>
<tr>
<td><code>elmo-aom-r4-mobile-full.png</code></td>
<td>Mobile 390x844 full page</td>
</tr>
<tr>
<td><code>elmo-aom-r4-mobile-hero.png</code></td>
<td>Mobile hero (dark, video visible at 55%)</td>
</tr>
<tr>
<td><code>elmo-aom-r4-mobile-mid.png</code></td>
<td>Mobile mid-page</td>
</tr>
<tr>
<td><code>elmo-aom-r4-tablet-full.png</code></td>
<td>Tablet 768x1024 full page</td>
</tr>
<tr>
<td><code>elmo-aom-r4-tablet-hero.png</code></td>
<td>Tablet hero</td>
</tr>
</tbody></table>
<hr>
<h2>PUNCH LIST FOR BOBBY (R5 polish)</h2>
<h3>SHOULD FIX (not blockers, but they&#39;d make this tighter)</h3>
<ol>
<li><p><strong>Desktop hero video opacity:</strong> Bump from ~0.05 to 0.3-0.55. Mobile is at 0.55 and looks right. Desktop should match or be close.</p>
</li>
<li><p><strong>10px text to 11px:</strong> Find all <code>text-[10px]</code> and change to <code>text-[11px]</code>. Find all <code>text-[9px]</code> and change to <code>text-[11px]</code>. Stat labels, testimonial metadata, portfolio tag badges, portfolio subtitles.</p>
</li>
<li><p><strong>Logo + email tap targets:</strong> Add <code>min-h-[44px]</code> to the AOM logo link and the footer email link.</p>
</li>
<li><p><strong>Semantic nav:</strong> Wrap navigation in <code>&lt;nav&gt;</code> element (currently <code>&lt;header&gt;</code>).</p>
</li>
<li><p><strong>Heading text nodes:</strong> Add spaces or <code>aria-label</code> to headings that concatenate without spaces (&quot;ThePortfolio.&quot; should be &quot;The Portfolio.&quot; in the DOM).</p>
</li>
</ol>
<h3>NICE TO HAVE</h3>
<ol start="6">
<li><p><strong>Performance:</strong> FCP at 2.1s. Could benefit from lazy-loading below-fold Gumlet iframes. The hero iframe loads immediately (correct), but the portfolio video iframe could defer.</p>
</li>
<li><p><strong>Gumlet 1080p fallback:</strong> One video resolution request still failing. Consider capping to 720p or ensuring the 1080p variant exists.</p>
</li>
</ol>
<hr>
<h2>VERDICT</h2>
<p><strong>CONDITIONAL PASS.</strong> The Dark Frame redesign is live and it works. The site went from a cream bakery to a dark, confident production company homepage. 94% dark. Pattern dividers. Correct copy. Mobile video. Updated service titles. Nav with dark gradient. This is a fundamentally different and better website.</p>
<p>The remaining issues are polish: desktop video opacity too faint, 10px text that should be 11px, three tap targets short by 8-12px, semantic HTML. None of these break the experience. They&#39;d make it tighter.</p>
<p>After three rounds of testing deploys that hadn&#39;t changed, Round 4 confirms the work was done. Bobby shipped it. It&#39;s deployed. It&#39;s live.</p>
<p>Is it DROP DEAD GORGEOUS? It&#39;s getting there. The bones are gorgeous. The dark frame with pattern dividers is exactly the Nike campaign book energy the brand guidelines called for. Fix the desktop video opacity and the tiny text, and this thing is ready to show off.</p>
<p><strong>This goes forward with polish notes. Not back to the shop.</strong></p>
`,h={title:t,slug:e,category:o,agent:n,date:d,dateFormatted:r,updated:null,summary:a,tags:i,content:s};export{n as agent,o as category,s as content,d as date,r as dateFormatted,h as default,e as slug,a as summary,i as tags,t as title,l as updated};
