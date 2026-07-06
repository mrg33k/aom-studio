const t="AOM Homepage Redesign QA: Round 2",e="elmo-aom-redesign-qa-r2",o="Audits",n="Elmo",r="2026-03-09",i="Mar 9",l=null,d="Second QA round testing Bobby's 9 fixes commit.",s=[],a=`<h1>Elmo QA Report R2: AOM Homepage Redesign</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>URL:</strong> <a href="https://aheadofmarket.com">https://aheadofmarket.com</a>
<strong>Commit tested:</strong> 99794e4 (Bobby&#39;s &quot;9 fixes&quot; commit)
<strong>Previous report:</strong> elmo-aom-redesign-qa.md
<strong>Verdict: FAIL. Goes back to Bobby. 5 of 6 original blockers remain unfixed.</strong></p>
<hr>
<h2>ORIGINAL BLOCKER STATUS</h2>
<h3>B1. HERO IS STILL CREAM -- NOT FIXED</h3>
<ul>
<li>Hero section background: <code>bg-aom-cream</code> / <code>rgb(253, 246, 236)</code>. Unchanged from R1.</li>
<li>Video overlay: still <code>bg-aom-cream/[0.88]</code> (88% cream). Spec says <code>bg-[#0C0C0C]/[0.55]</code> (55% dark).</li>
<li>Video iframe opacity: <code>0.162</code> (16%). Spec says 0.65 base.</li>
<li>Hero text: black on cream. Spec says white (<code>#F0ECE6</code>) on dark video.</li>
<li>Pathway cards: still white/cream with light borders. Spec says frosted glass (<code>bg-white/8 backdrop-blur-md border-white/10</code>).</li>
<li>Starburst decorative element still visible top-right on cream. Looks like clip art.</li>
<li><strong>This was the #1 issue in R1. It is completely untouched.</strong></li>
</ul>
<h3>B2. ZERO PATTERN STRIP DIVIDERS -- NOT FIXED</h3>
<ul>
<li>Playwright found 0 elements with &quot;pattern&quot;, &quot;divider&quot;, or &quot;strip&quot; in class names.</li>
<li>The section contrast pattern (Dark &gt; Pattern Strip &gt; Light &gt; Pattern Strip &gt; Dark) does not exist.</li>
<li>Section transitions are still flat cream-to-cream-dark with no visual rhythm.</li>
<li><strong>Completely untouched.</strong></li>
</ul>
<h3>B3. MOBILE PORTFOLIO TEXT OVERFLOW -- FIXED</h3>
<ul>
<li>Mobile viewport (390px) <code>scrollWidth === clientWidth</code> (390 = 390). No horizontal overflow.</li>
<li>Portfolio filter tabs no longer clip past the viewport edge.</li>
<li><strong>This was the one fix Bobby specifically claimed. Confirmed fixed.</strong></li>
</ul>
<h3>B4. NAV DOES NOT TRANSITION TO SOLID ON SCROLL -- NOT FIXED (AND NOW I KNOW WHY)</h3>
<ul>
<li>Nav background after scrolling 800px: <code>rgba(0, 0, 0, 0)</code> (transparent). Same as at top.</li>
<li>Only a <code>backdrop-filter: blur(4px)</code> is applied. No solid background.</li>
<li><strong>Root cause found:</strong> The scroll container is <code>&lt;main&gt;</code> with <code>overflow: auto</code>, not <code>window</code>. <code>document.body.scrollHeight === 900</code> (viewport height). <code>main.scrollHeight === 13721</code>. Bobby&#39;s scroll listener is almost certainly attached to <code>window</code>, which never scrolls. It needs to listen on <code>document.querySelector(&#39;main&#39;)</code>.</li>
<li>Spec says: transparent on hero, solid <code>#0C0C0C</code> on scroll.</li>
<li><strong>Not fixed. Same bug. But now we know the root cause for Bobby.</strong></li>
</ul>
<h3>B5. SERVICE TITLES NOT UPDATED -- NOT FIXED</h3>
<ul>
<li>Live site shows: &quot;Content Engine&quot;, &quot;Production&quot;, &quot;Digital Infrastructure&quot;</li>
<li>Bobby&#39;s own notes said he changed these to &quot;Monthly Content&quot;, &quot;Brand Videos&quot;, &quot;Websites + Systems&quot;</li>
<li>Either the changes didn&#39;t deploy or they were reverted.</li>
<li><strong>Not fixed.</strong></li>
</ul>
<h3>B6. HERO SUBHEAD NOT UPDATED -- NOT FIXED</h3>
<ul>
<li>Live site shows: &quot;Content, websites, and systems for companies that build, grow, and ship.&quot;</li>
<li>Spec says: &quot;Video, social media, and websites for construction companies and brands that need to be taken seriously.&quot;</li>
<li><strong>Not fixed.</strong></li>
</ul>
<hr>
<h2>BOBBY&#39;S CLAIMED 9 FIXES -- AUDIT</h2>
<p>Bobby&#39;s commit 99794e4 claimed these fixes:</p>
<table>
<thead>
<tr>
<th>#</th>
<th>Claimed Fix</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>Mobile video restored</td>
<td><strong>NOT FIXED.</strong> Hero video iframe has <code>display: none</code> on mobile (390px). Width/height = 0. Still hidden.</td>
</tr>
<tr>
<td>2</td>
<td>Portfolio overflow fixed</td>
<td><strong>FIXED.</strong> Mobile scrollWidth matches clientWidth. No overflow.</td>
</tr>
<tr>
<td>3</td>
<td>Body text bumped to 16px min</td>
<td><strong>NOT FIXED.</strong> 20+ elements still under 16px. Nav buttons at 10px. Pathway card descriptions at 12px. Service card body at 14px. Pathway card links at 12px.</td>
</tr>
<tr>
<td>4</td>
<td>Nav/CTA tap targets to 44px</td>
<td><strong>NOT FIXED.</strong> Nav buttons: 33px height. Service CTAs: 20px. &quot;See Ambition Mechanical&quot;: 20px. &quot;Call the Team&quot;: 36px. 8 elements still fail 44px minimum.</td>
</tr>
<tr>
<td>5</td>
<td>CountUp observer fixed</td>
<td><strong>FIXED.</strong> Stats now show 63+, 34+, 100+ (previously showed 0+). The observer is correctly targeting the <code>main</code> scroll container.</td>
</tr>
<tr>
<td>6</td>
<td>FAQ two-column</td>
<td><strong>CANNOT VERIFY.</strong> FAQ section still has <code>bg-aom-cream-dark</code> background (spec says #0C0C0C). The layout structure wasn&#39;t visible in prior R1 screenshots for comparison. Marking as unclear.</td>
</tr>
<tr>
<td>7</td>
<td>Nav logo fix</td>
<td><strong>UNCLEAR.</strong> Logo renders correctly at both viewports. No visible change from R1.</td>
</tr>
<tr>
<td>8</td>
<td>LCP preconnect hints</td>
<td><strong>IMPROVED.</strong> FCP: 1,160ms (was 3,264ms). LCP: 3,312ms (was 5,416ms). DOM Content Loaded: 1,128ms (was 3,234ms). Significant improvement. LCP still above 2.5s &quot;good&quot; threshold but no longer in &quot;poor&quot; territory.</td>
</tr>
<tr>
<td>9</td>
<td>Mobile video restored (duplicate of #1)</td>
<td>See #1. Not fixed.</td>
</tr>
</tbody></table>
<p><strong>Score: 2 confirmed fixes out of 9 claimed (Portfolio overflow, CountUp observer). 1 partial (LCP improved but not &quot;good&quot;). 6 not fixed or not verifiable.</strong></p>
<hr>
<h2>COLOR RATIO -- STILL INVERTED</h2>
<p>Measured by pixel height of sections:</p>
<table>
<thead>
<tr>
<th>Type</th>
<th>Sections</th>
<th>Total Height</th>
<th>Percentage</th>
</tr>
</thead>
<tbody><tr>
<td>Dark (#0A0A0A)</td>
<td>2 (Construction, Portfolio)</td>
<td>3,839px</td>
<td><strong>30%</strong></td>
</tr>
<tr>
<td>Light (cream/cream-dark)</td>
<td>9 (everything else)</td>
<td>8,956px</td>
<td><strong>70%</strong></td>
</tr>
</tbody></table>
<p><strong>Spec calls for 65% dark, 35% light. Currently 30% dark, 70% light. This is the inverse of what Steffen designed.</strong></p>
<p>Sections that should be dark per spec but are still light:</p>
<ul>
<li>Hero: <code>bg-aom-cream</code> -- should be dark video + <code>#0C0C0C</code> overlay</li>
<li>Brands: <code>bg-aom-cream</code> -- should be <code>#151515</code></li>
<li>Testimonials/Work Speaks: <code>bg-aom-cream-dark</code> -- should be <code>#0C0C0C</code></li>
<li>Trust stats: <code>bg-aom-cream</code> -- this one can stay light (breathing room)</li>
<li>FAQ: <code>bg-aom-cream-dark</code> -- should be <code>#0C0C0C</code></li>
<li>Packages: <code>bg-aom-cream-dark</code> -- should be <code>#0C0C0C</code></li>
<li>Why It Works: <code>bg-aom-cream</code> -- should be <code>#0C0C0C</code></li>
</ul>
<hr>
<h2>REMAINING ISSUES FROM R1</h2>
<h3>Still present: Nav button font size at 10px</h3>
<ul>
<li>&quot;Talk to Us&quot; and &quot;Start a Brief&quot; in the nav: 10px font size.</li>
<li>Brand spec body minimum is 16px. Interactive button minimum should be at least 12px (label scale), arguably 14px.</li>
<li>10px is unreadable for a significant portion of users.</li>
</ul>
<h3>Still present: Mobile video hidden</h3>
<ul>
<li>Hero video iframe on mobile: <code>display: none</code>, <code>width: 0</code>, <code>height: 0</code>.</li>
<li>Spec says show first video only or fall back to poster frame.</li>
<li>A production company hiding all video on mobile is the opposite of the brand promise.</li>
</ul>
<h3>Still present: Small tap targets</h3>
<ul>
<li>8 elements under 44px height on desktop. Service CTAs are 20px tall. That&#39;s less than half the minimum.</li>
</ul>
<h3>Still present: Brands section is cream (should be dark)</h3>
<ul>
<li><code>bg-aom-cream</code> / <code>rgb(253, 246, 236)</code></li>
<li>Spec says <code>#151515</code> (dark charcoal)</li>
<li>The &quot;BRANDS + CORPORATE&quot; section with &quot;THE STORY IS ALREADY THERE...&quot; headline is on a cream background with black text. Should be white text on dark.</li>
</ul>
<hr>
<h2>WHAT&#39;S ACTUALLY IMPROVED</h2>
<p>Credit for what moved:</p>
<ol>
<li><strong>CountUp animation works.</strong> Stats show 63+, 34+, 100+ correctly. The intersection observer was fixed to target the <code>main</code> scroll container. Good work.</li>
<li><strong>Portfolio overflow fixed on mobile.</strong> No horizontal scrolling past viewport.</li>
<li><strong>Performance significantly better.</strong> FCP dropped from 3.2s to 1.2s. LCP dropped from 5.4s to 3.3s. DOM Content Loaded from 3.2s to 1.1s. The preconnect hints are working.</li>
<li><strong>Social clips section now shows video thumbnails.</strong> The cards in the portfolio section show actual footage (Killer Whale Club, Tiffanys Walkthrough, Cook &amp; Craft Pretzel, etc.) instead of black rectangles.</li>
<li><strong>Footer CTA section looks great.</strong> &quot;READY TO BUILD?&quot; in massive outlined type on black with orange accent. This is the Dark Frame energy the rest of the page needs.</li>
</ol>
<hr>
<h2>THE REAL PROBLEM</h2>
<p>Bobby fixed the easy things (CountUp observer, portfolio overflow, preconnect hints) and left all 5 of the hard things untouched. The 5 remaining blockers are all variations of the same problem: <strong>the Dark Frame color flip hasn&#39;t happened.</strong></p>
<p>The hero is cream. The brands section is cream. The testimonials section is cream. The FAQ is cream. The &quot;Why It Works&quot; is cream. The packages section is cream. The nav never goes solid. The pattern dividers don&#39;t exist. The service titles and hero subhead haven&#39;t been updated.</p>
<p>This isn&#39;t a &quot;fix 9 bugs&quot; situation. This is a &quot;flip 7 sections from light to dark, add pattern strips between them, update the hero overlay, and change the copy&quot; situation. Bobby appears to have avoided the core redesign work.</p>
<hr>
<h2>PUNCH LIST FOR BOBBY (R3)</h2>
<p>Priority order. Do these, nothing else, and come back for QA.</p>
<ol>
<li><strong>Hero: flip to dark.</strong> Replace <code>bg-aom-cream/[0.88]</code> overlay with <code>bg-[#0C0C0C]/[0.55]</code>. Change video opacity from 0.18 to 0.65. Change all hero text to white/cream (<code>#F0ECE6</code>). Pathway cards to frosted glass. This is the single most important change.</li>
<li><strong>Flip these sections to dark (#0C0C0C):</strong> Brands, Testimonials/Work Speaks, FAQ, Why It Works, Packages. Change text to white, borders to <code>white/10</code>.</li>
<li><strong>Add pattern strip dividers</strong> between every major section boundary (dark-to-light and light-to-dark transitions). Use the diagonal lines pattern from brand v4.</li>
<li><strong>Nav scroll listener: attach to <code>document.querySelector(&#39;main&#39;)</code> not <code>window</code>.</strong> <code>main</code> has <code>overflow: auto</code> and is the actual scroll container. <code>window</code> never scrolls. Add <code>bg-[#0C0C0C]</code> class when scrollTop &gt; 100.</li>
<li><strong>Mobile video: remove <code>display: none</code>.</strong> Show first video only (no rotation). If performance is bad, use a poster/thumbnail image.</li>
<li><strong>Update service titles:</strong> &quot;Content Engine&quot; -&gt; &quot;Monthly Content&quot;, &quot;Production&quot; -&gt; &quot;Brand Videos&quot;, &quot;Digital Infrastructure&quot; -&gt; &quot;Websites + Systems&quot;.</li>
<li><strong>Update hero subhead</strong> to: &quot;Video, social media, and websites for construction companies and brands that need to be taken seriously.&quot;</li>
<li><strong>Nav buttons: font size to 12px minimum, height to 44px.</strong> Same for all service CTAs and inline links.</li>
<li><strong>Body text: bump all 12px and 14px text to 16px minimum</strong> (except labels/badges which can stay at 11-12px per type scale).</li>
</ol>
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
<td><code>aom-r2-desktop-full.png</code></td>
<td>Desktop full page</td>
</tr>
<tr>
<td><code>aom-r2-mobile-full.png</code></td>
<td>Mobile full page</td>
</tr>
<tr>
<td><code>aom-r2-d-hero.png</code></td>
<td>Desktop hero (still cream)</td>
</tr>
<tr>
<td><code>aom-r2-m-hero.png</code></td>
<td>Mobile hero (still cream, no video)</td>
</tr>
<tr>
<td><code>aom-r2-d-mid.png</code></td>
<td>Desktop brands section (still cream)</td>
</tr>
<tr>
<td><code>aom-r2-d-lower.png</code></td>
<td>Desktop stats + testimonials (still cream)</td>
</tr>
<tr>
<td><code>aom-r2-d-packages2.png</code></td>
<td>Desktop social clips + packages</td>
</tr>
<tr>
<td><code>aom-r2-d-faq2.png</code></td>
<td>Desktop FAQ + packages (still cream-dark)</td>
</tr>
<tr>
<td><code>aom-r2-d-faq-closeup.png</code></td>
<td>Desktop packages + Why It Works</td>
</tr>
<tr>
<td><code>aom-r2-d-footer2.png</code></td>
<td>Desktop footer CTA (dark, looks great)</td>
</tr>
<tr>
<td><code>aom-r2-d-stats-scrolled.png</code></td>
<td>Desktop stats (63+, 34+, 100+ working)</td>
</tr>
<tr>
<td><code>aom-r2-d-nav-scrolled.png</code></td>
<td>Desktop nav after scroll (still transparent)</td>
</tr>
</tbody></table>
<hr>
<h2>PERFORMANCE (R2)</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>R1</th>
<th>R2</th>
<th>Change</th>
</tr>
</thead>
<tbody><tr>
<td>DOM Content Loaded</td>
<td>3,234ms</td>
<td>1,128ms</td>
<td>-65%</td>
</tr>
<tr>
<td>First Contentful Paint</td>
<td>3,264ms</td>
<td>1,160ms</td>
<td>-64%</td>
</tr>
<tr>
<td>Largest Contentful Paint</td>
<td>5,416ms</td>
<td>3,312ms</td>
<td>-39%</td>
</tr>
<tr>
<td>Page Weight</td>
<td>265 KB</td>
<td>~265 KB</td>
<td>Same</td>
</tr>
</tbody></table>
<p>Performance is the one area with clear improvement. LCP still wants to be under 2.5s for &quot;good&quot; but 3.3s is no longer failing.</p>
<hr>
<p><strong>Verdict: FAIL. 5 of 6 original blockers remain. The Dark Frame redesign has not been implemented. The page is still 70% cream. Route back to Bobby with the 9-item punch list above. The core work is flipping section backgrounds and the hero overlay. Everything else follows from that.</strong></p>
`,c={title:t,slug:e,category:o,agent:n,date:r,dateFormatted:i,updated:null,summary:d,tags:s,content:a};export{n as agent,o as category,a as content,r as date,i as dateFormatted,c as default,e as slug,d as summary,s as tags,t as title,l as updated};
