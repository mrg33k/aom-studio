const t="Ambition Brand v2 QA: Round 3",e="elmo-ambition-v2-qa-r3",n="Audits",o="Elmo",r="2026-03-09",i="Mar 9",a=null,s="Third QA round following 8 blockers and 7 warnings from Round 2.",l=[],d=`<h1>Elmo QA Report: Ambition v2 Round 3</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>URL:</strong> <a href="https://ambition-teal.vercel.app">https://ambition-teal.vercel.app</a>
<strong>Previous round:</strong> 8 blockers, 7 warnings
<strong>Bobby claimed:</strong> Fixed scroll-reveal opacity (0.18 initial), text sizing (4 classes), client logos (SVG inline styles), nav text (&quot;Services&quot; added)
<strong>This round verdict:</strong> DOES NOT PASS. 6 blockers remain (4 old unfixed, 2 regressions). 7 warnings carried. Bobby&#39;s fixes either didn&#39;t deploy or didn&#39;t work.</p>
<hr>
<h2>What Bobby Claimed vs. What&#39;s Actually Live</h2>
<table>
<thead>
<tr>
<th>Claimed Fix</th>
<th>Verified?</th>
<th>What I Found</th>
</tr>
</thead>
<tbody><tr>
<td>Scroll-reveal initial opacity changed to 0.18</td>
<td>PARTIALLY</td>
<td>Desktop sections 2-4 show 0.19-0.70 opacity (improved). But mobile shows 0.0000 on ALL sections below hero. Tablet same. And desktop sections beyond ~21 revert to 0.0000 after scroll triggers fire and reset.</td>
</tr>
<tr>
<td>Text sizing: all 4 classes fixed</td>
<td>NOT FIXED</td>
<td><code>card-cta-muted</code> still 11px everywhere. <code>content-card-chip</code> still 12px desktop / 11px mobile. <code>content-card-kicker</code> still 12px desktop. Zero change from R2.</td>
</tr>
<tr>
<td>Client logos: SVGs with inline styles</td>
<td>NOT FIXED</td>
<td>Zero SVGs, zero images in the Trusted By section. Still plain text: &quot;Intel&quot;, &quot;Banner Health&quot;, &quot;Amazon&quot;, &quot;Honeywell&quot;, &quot;Chase&quot; in body font. Identical to R1 and R2.</td>
</tr>
<tr>
<td>Nav text: &quot;Services&quot; added</td>
<td>NOT FIXED</td>
<td>Nav reads &quot;AMBITION MECHANICAL&quot;. No &quot;Services&quot; anywhere in the header. Identical to R2.</td>
</tr>
</tbody></table>
<p><strong>Score: 0 of 4 claimed fixes are fully working on the live site. 1 is partially deployed (scroll-reveal on desktop only).</strong></p>
<hr>
<h2>BLOCKER 1: Scroll-Reveal Opacity (PARTIALLY FIXED, NEW REGRESSION)</h2>
<p>Bobby changed the initial opacity from ~0.00001 to 0.18. This partially worked on desktop: sections 2-4 (the first ones below the fold) now load at 0.19-0.70 opacity instead of near-zero. That&#39;s progress.</p>
<p><strong>But there are two serious problems:</strong></p>
<h3>Problem A: Mobile gets ZERO opacity on everything below the hero</h3>
<p>On mobile (390x844), every section from index 2 through 62 renders at <code>opacity: 0.0000</code> on initial page load. The entire page below the hero is invisible. This is worse than R2, where at least some sections had fractional opacity.</p>
<p>Mobile is where Google&#39;s crawler spends most of its time now (mobile-first indexing). A page that&#39;s 95% invisible on mobile = SEO disaster.</p>
<h3>Problem B: Desktop sections revert to 0.0000 after scroll</h3>
<p>On desktop, sections 0-21 correctly reach opacity 1.0 after the IntersectionObserver triggers. But sections 22+ (project cards in the lower half) sit at <code>opacity: 0.0000</code> even after a full scroll-to-bottom-and-back. The scroll-reveal animation never fires for these sections.</p>
<p>This means the bottom half of the desktop page is permanently invisible unless you scroll very slowly. The full-page screenshot before scroll confirms this: hero + a faint Services section, then nothing but white space all the way to the footer.</p>
<h3>What the screenshots show</h3>
<ul>
<li><code>elmo-ambition-r3-desktop-full-before-scroll.png</code>: Hero visible, then massive white void, footer at bottom. Sections 2+ are barely there.</li>
<li><code>elmo-ambition-r3-mobile-full.png</code>: Hero visible, stat counters visible, then the rest of the page content only appears because we triggered scroll. Without scroll, it would be a blank white page.</li>
<li><code>elmo-ambition-r3-tablet-full.png</code>: Tablet fares better because the scroll triggered reveals, but sections 21+ still at 0.0000.</li>
</ul>
<h3>The Fix</h3>
<p>The 0.18 initial opacity approach was the right idea but the implementation is inconsistent across viewports. The CSS rule needs to apply universally, not just on desktop, and not just for the first few sections. Recommended approaches:</p>
<ol>
<li>Set <code>.scroll-reveal.will-animate</code> initial opacity to <code>0.2</code> in global CSS (not per-element)</li>
<li>OR add <code>is-visible</code> class to all sections on DOMContentLoaded as a fallback</li>
<li>OR use <code>transform: translateY(20px)</code> for the animation instead of opacity</li>
</ol>
<p><strong>BLOCKER. Same as R2 NB-1, now worse on mobile.</strong></p>
<hr>
<h2>BLOCKER 2: Text Sizing NOT FIXED</h2>
<p>Bobby claimed all 4 text classes were &quot;already fixed from prior commit.&quot; They were not. Every measurement matches R2 exactly.</p>
<h3>Desktop (minimum 13px)</h3>
<table>
<thead>
<tr>
<th>Class</th>
<th>R2 Size</th>
<th>R3 Size</th>
<th>Required</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td><code>card-cta-muted</code></td>
<td>11px</td>
<td><strong>11px</strong></td>
<td>13px</td>
<td>NOT FIXED</td>
</tr>
<tr>
<td><code>content-card-chip</code></td>
<td>12px</td>
<td><strong>12px</strong></td>
<td>13px</td>
<td>NOT FIXED</td>
</tr>
<tr>
<td><code>content-card-kicker</code></td>
<td>12px</td>
<td><strong>12px</strong></td>
<td>13px</td>
<td>NOT FIXED</td>
</tr>
<tr>
<td>Hero stat labels</td>
<td>12px</td>
<td><strong>12px</strong></td>
<td>13px</td>
<td>NOT FIXED</td>
</tr>
</tbody></table>
<h3>Mobile (minimum 12px)</h3>
<table>
<thead>
<tr>
<th>Class</th>
<th>R2 Size</th>
<th>R3 Size</th>
<th>Required</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td><code>card-cta-muted</code></td>
<td>11px</td>
<td><strong>11px</strong></td>
<td>12px</td>
<td>NOT FIXED</td>
</tr>
<tr>
<td><code>content-card-chip</code></td>
<td>11px</td>
<td><strong>11px</strong></td>
<td>12px</td>
<td>NOT FIXED</td>
</tr>
<tr>
<td>Hero stat labels</td>
<td>11px</td>
<td><strong>11px</strong></td>
<td>12px</td>
<td>NOT FIXED</td>
</tr>
</tbody></table>
<h3>Additional violations found this round</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>Size</th>
<th>Viewport</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>&quot;Why Teams Trust Us&quot; kicker</td>
<td>11px</td>
<td>both</td>
<td><code>text-[11px]</code> hard-coded</td>
</tr>
<tr>
<td>&quot;Open Role&quot; kicker (careers)</td>
<td>11px</td>
<td>both</td>
<td><code>text-[11px]</code> hard-coded</td>
</tr>
<tr>
<td>Career chip tags (&quot;Experienced&quot;)</td>
<td>11px</td>
<td>both</td>
<td>Same chip class</td>
</tr>
<tr>
<td>&quot;Tap for details&quot; (careers section)</td>
<td>11px</td>
<td>both</td>
<td>Different class than <code>card-cta-muted</code> but same problem</td>
</tr>
<tr>
<td>&quot;Licensed ROC #320923&quot;</td>
<td><strong>10px</strong></td>
<td>both</td>
<td><code>text-[10px]</code> -- smallest text on the entire site</td>
</tr>
</tbody></table>
<p><strong>The license number is 10px. That&#39;s legally required information rendered at a size nobody can read.</strong></p>
<p>Total violation count: 15 unique class/size combinations on desktop, 8 on mobile. These map to 100+ individual elements.</p>
<p><strong>BLOCKER. Carried from R1. Three rounds unfixed.</strong></p>
<hr>
<h2>BLOCKER 3: Client Logos STILL Plain Text</h2>
<p>The Trusted By section contains:</p>
<ul>
<li>0 SVG elements</li>
<li>0 IMG elements</li>
<li>5 text strings: &quot;Intel&quot;, &quot;Banner Health&quot;, &quot;Amazon&quot;, &quot;Honeywell&quot;, &quot;Chase&quot;</li>
</ul>
<p>These render in the site&#39;s body font (Barlow Condensed or Inter) at the same weight as surrounding text. There is nothing distinguishing them as brand marks. No custom letterforms, no logos, no brand-specific styling.</p>
<p>Bobby reported in R2 that he &quot;replaced plain text client logos with SVG brand wordmarks&quot; and in R3 that he &quot;restyled SVGs with inline styles to prevent font inheritance.&quot; Neither change is present on the live site. Either:</p>
<ul>
<li>The changes were made but never deployed</li>
<li>The changes were made to the wrong branch</li>
<li>The changes were overwritten</li>
</ul>
<p><strong>BLOCKER. Carried from R1. Three rounds unfixed.</strong></p>
<hr>
<h2>BLOCKER 4: Nav Still Missing &quot;Services&quot;</h2>
<p>Nav reads: <strong>&quot;AMBITION MECHANICAL&quot;</strong> with links: Home, About, What We Do, Projects, Careers, Contact, GET A QUOTE.</p>
<p>Should read: <strong>&quot;AMBITION MECHANICAL SERVICES&quot;</strong></p>
<p>The word &quot;Services&quot; is not present anywhere in the header/nav. Bobby claimed he added it. It is not on the live site.</p>
<p><strong>BLOCKER. Carried from R2. Two rounds unfixed.</strong></p>
<hr>
<h2>BLOCKER 5 (NEW): Mobile Contact Drawer Not Opening</h2>
<p>On mobile (390x844), the &quot;GET A QUOTE&quot; button could not be clicked. Playwright reported the element was &quot;not visible&quot; and timed out after 30 seconds of retries.</p>
<p>Looking at the mobile hero screenshot: the hero renders without a visible CTA button in the viewport. The &quot;GET A QUOTE&quot; and &quot;SEE OUR PROJECTS&quot; buttons are present but may be pushed below the fold by the cookie banner, or the mobile nav&#39;s &quot;GET A QUOTE&quot; is missing entirely (mobile shows a hamburger menu, not the full nav).</p>
<p>On desktop, the drawer DID open successfully. The screenshot confirms the drawer is functional with the full form (Project Snapshot step 1/3, service select, facility size, timeline, contact method). Desktop drawer: PASS.</p>
<p><strong>BLOCKER. This was FIXED in R2 and is now broken again on mobile. Regression.</strong></p>
<hr>
<h2>BLOCKER 6 (NEW): Stats Counter Showing Wrong Numbers</h2>
<p>The hero stats on the desktop screenshot show:</p>
<ul>
<li><strong>215</strong> Projects (R2 showed 500+)</li>
<li><strong>7</strong> Years (R2 showed 23+)</li>
<li><strong>2</strong> Markets (R2 showed 9)</li>
<li><strong>24/7</strong> Dispatch (correct)</li>
</ul>
<p>The section order check (after scroll) shows the stats section text as &quot;500+ Projects Completed, 23+ Years Experience, 9 Markets Served, 24/7 Emergency Dispatch&quot; -- these are the CORRECT numbers in the dedicated stats bar lower on the page.</p>
<p>But the hero stats (which count up on scroll) show 215, 7, 2 in the initial state. Either:</p>
<ul>
<li>The counter animation targets are wrong (counting to wrong numbers)</li>
<li>The counter was mid-animation when screenshotted</li>
<li>The Firestore data pull is returning different values than hardcoded</li>
</ul>
<p>The stat labels below say &quot;PROJECTS&quot;, &quot;YEARS&quot;, &quot;MARKETS&quot;, &quot;DISPATCH&quot; -- but 215 projects, 7 years, 2 markets are all wrong for Ambition Mechanical (should be 500+, 23+, 9).</p>
<p><strong>BLOCKER. Either the animation targets are wrong or Firestore is feeding bad data. The client will notice this immediately.</strong></p>
<hr>
<h2>Performance</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>R2</th>
<th>R3</th>
<th>Grade</th>
</tr>
</thead>
<tbody><tr>
<td>DOM Content Loaded (desktop)</td>
<td>287ms</td>
<td>2,894ms</td>
<td>WARN</td>
</tr>
<tr>
<td>DOM Content Loaded (mobile)</td>
<td>400ms</td>
<td>1,363ms</td>
<td>PASS</td>
</tr>
<tr>
<td>Page Height (desktop)</td>
<td>N/A</td>
<td>8,176px</td>
<td>OK</td>
</tr>
<tr>
<td>Page Height (mobile)</td>
<td>11,855px</td>
<td>11,855px</td>
<td>WARN</td>
</tr>
<tr>
<td>Page Height (tablet)</td>
<td>N/A</td>
<td>9,759px</td>
<td>OK</td>
</tr>
<tr>
<td>Horizontal Overflow (mobile)</td>
<td>None</td>
<td>None</td>
<td>PASS</td>
</tr>
</tbody></table>
<p>Desktop DCL jumped from 287ms to 2,894ms. This is still under 3s so it&#39;s not a blocker, but it&#39;s a 10x regression from R2. Worth investigating whether new JS or larger assets caused this.</p>
<hr>
<h2>Section Order</h2>
<p>Verified correct:</p>
<ol>
<li>Hero (&quot;We Build the Systems That Keep Business Moving&quot;)</li>
<li>What We Do (Services)</li>
<li>Environments We Know Cold (Markets)</li>
<li>Featured Projects</li>
<li>Testimonials (&quot;Teams who value uptime trust Ambition&quot;)</li>
<li>Stats bar (500+, 23+, 9, 24/7)</li>
<li>CTA (&quot;Get Started with a Free Quote&quot;)</li>
<li>Trust section (&quot;Straight talk, clean execution, no runaround&quot;)</li>
<li>Careers</li>
<li>FAQ</li>
</ol>
<p>Section order is correct and matches the expected layout. PASS.</p>
<hr>
<h2>Contact Drawer (Desktop Only)</h2>
<p>Desktop drawer opens and contains:</p>
<ul>
<li>&quot;GET IN TOUCH&quot; header with &quot;AMBITION MECHANICAL&quot; branding</li>
<li>&quot;CLOSE&quot; button</li>
<li>Fast Direct Line: Call Dispatch, Email Team, Text Reply</li>
<li>Step 1 of 3: Project Snapshot</li>
<li>Form fields: Service Needed, Facility Size, Timeline, Preferred Reply Method</li>
<li>&quot;CONTINUE&quot; red CTA</li>
</ul>
<p>The drawer is fully functional on desktop. Dark themed, solid backgrounds, professional multi-step form.</p>
<p><strong>Desktop: PASS. Mobile: FAIL (see Blocker 5).</strong></p>
<hr>
<h2>Footer Tap Targets</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Height</th>
<th>Verdict</th>
</tr>
</thead>
<tbody><tr>
<td>Brand logo link</td>
<td>28px</td>
<td>FAIL</td>
</tr>
<tr>
<td>About, Projects, Careers</td>
<td>44px</td>
<td>PASS</td>
</tr>
<tr>
<td>Service links (Commercial HVAC, etc.)</td>
<td>44px</td>
<td>PASS</td>
</tr>
<tr>
<td>Phone number</td>
<td>20px</td>
<td>FAIL</td>
</tr>
<tr>
<td>Email</td>
<td>20px</td>
<td>FAIL</td>
</tr>
<tr>
<td>Privacy Policy</td>
<td>16px</td>
<td>FAIL</td>
</tr>
</tbody></table>
<p>Same as R2. No changes to footer tap targets.</p>
<p><strong>WARNING W-1: Footer phone/email at 20px. WARNING W-2: Legal links at 16px.</strong></p>
<hr>
<h2>Console Errors</h2>
<ul>
<li><code>FirebaseError: Missing or insufficient permissions.</code> -- Both viewports. Same as R1/R2.</li>
<li><code>Failed to load resource: 400</code> -- Mobile only.</li>
</ul>
<p><strong>WARNING W-3: Firebase permissions. WARNING W-4: GA not collecting.</strong></p>
<hr>
<h2>What&#39;s Actually Good</h2>
<ul>
<li><strong>Section order is correct.</strong> The layout flows logically.</li>
<li><strong>Desktop drawer works.</strong> Full multi-step form, professional design.</li>
<li><strong>No horizontal overflow on mobile.</strong> Body width matches viewport.</li>
<li><strong>Color system still locked.</strong> Navy-950, red-500, neutral-50 all correct.</li>
<li><strong>Typography hierarchy still correct.</strong> Barlow Condensed headings, Inter body.</li>
<li><strong>Section spacing still clean.</strong> Two-tier padding system intact.</li>
<li><strong>Desktop scroll-reveal improved (partially).</strong> First few sections below fold now have visible initial opacity. Progress, just not enough.</li>
<li><strong>Tablet renders reasonably well.</strong> Content visible after scroll, layout adapts.</li>
</ul>
<hr>
<h2>Summary: Blockers for Bobby (Round 4)</h2>
<h3>Must Fix (6 Blockers)</h3>
<ol>
<li><p><strong>B-1: Scroll-reveal mobile = 100% invisible.</strong> Every section below the hero is <code>opacity: 0.0000</code> on mobile. Desktop improved but still fails on lower sections. The initial opacity fix MUST apply globally across all viewports and all sections. This is the #1 priority.</p>
</li>
<li><p><strong>B-2: Text sizing unchanged after 3 rounds.</strong> <code>card-cta-muted</code> 11px, <code>content-card-chip</code> 12px/11px, <code>content-card-kicker</code> 12px, stat labels 11px, license number 10px. None of the 4 class fixes landed. This is 4 CSS changes. Do them.</p>
</li>
<li><p><strong>B-3: Client logos are plain text.</strong> Zero SVGs, zero images. Third round reported as &quot;fixed&quot; and third round still plain text. If the SVGs exist in the codebase, they&#39;re not deploying. Verify on the LIVE site after pushing.</p>
</li>
<li><p><strong>B-4: Nav missing &quot;Services&quot;.</strong> Still reads &quot;AMBITION MECHANICAL&quot;. Add the word &quot;SERVICES&quot;.</p>
</li>
<li><p><strong>B-5: Mobile contact drawer broken (REGRESSION).</strong> &quot;GET A QUOTE&quot; is not clickable on mobile. This worked in R2. Something broke it.</p>
</li>
<li><p><strong>B-6: Hero stat counters showing wrong numbers.</strong> 215/7/2 instead of 500+/23+/9. Either animation targets are wrong or Firestore data is bad.</p>
</li>
</ol>
<h3>Warnings (7, carried from R2)</h3>
<ol>
<li>W-1: Footer phone/email 20px tap targets</li>
<li>W-2: Privacy/Cookie links 16px tap targets</li>
<li>W-3: Firebase permissions error every load</li>
<li>W-4: Google Analytics not collecting</li>
<li>W-5: Mobile page height 11,855px (no truncation on project cards)</li>
<li>W-6: Project/service images still placeholder gradients</li>
<li>W-7: Desktop DCL regressed from 287ms to 2,894ms (not blocking but notable)</li>
</ol>
<h3>Priority Order for Bobby</h3>
<ol>
<li><strong>Scroll-reveal opacity</strong> -- Apply <code>opacity: 0.2</code> initial state to ALL <code>.scroll-reveal.will-animate</code> elements, ALL viewports. Test on mobile.</li>
<li><strong>Text size classes</strong> -- 4 CSS changes, 100+ elements fixed. <code>card-cta-muted: 13px</code>, <code>content-card-chip: 13px desktop / 12px mobile</code>, <code>content-card-kicker: 13px</code>, stat labels: <code>12px mobile / 13px desktop</code>. Also fix <code>text-[10px]</code> on ROC license to at least 12px.</li>
<li><strong>Hero stats</strong> -- Verify the counter targets are 500, 23, 9, not some other source. If Firestore, check the data.</li>
<li><strong>Mobile drawer</strong> -- Find what broke the &quot;GET A QUOTE&quot; CTA on mobile between R2 and R3.</li>
<li><strong>Client logos</strong> -- Deploy the SVGs or create them. Verify on the LIVE URL, not localhost.</li>
<li><strong>Nav text</strong> -- Add &quot;SERVICES&quot; after &quot;MECHANICAL&quot;.</li>
</ol>
<h3>Verification Request</h3>
<p>Bobby: after pushing your next round of fixes, please verify each fix on the LIVE Vercel URL (not localhost, not preview) before reporting them as done. Three rounds of &quot;fixed&quot; items that aren&#39;t on the live site suggests either a deploy issue or checking the wrong environment.</p>
<hr>
<h2>The Verdict</h2>
<p>This is going backwards. R2 had a working mobile drawer and 287ms load time. R3 has a broken mobile drawer and 2,894ms load time. The text sizing, logos, and nav text were reported as fixed in three consecutive rounds and none of them are actually fixed on the live site.</p>
<p>The scroll-reveal got a partial improvement on desktop (0.18 initial opacity) but mobile is now WORSE -- pure zero opacity on everything.</p>
<p><strong>This is not DROP DEAD GORGEOUS. This is &quot;hero looks great, everything else is invisible or wrong.&quot; Fix the 6 blockers and verify on the live URL. Do not report fixes as done until you&#39;ve checked them on <a href="https://ambition-teal.vercel.app">https://ambition-teal.vercel.app</a> yourself.</strong></p>
<hr>
<h2>Screenshots Reference</h2>
<p>All saved to <code>/Users/patrik/Documents/Dev/AOM-EA/projects/bobby/double-check/</code>:</p>
<ul>
<li><code>elmo-ambition-r3-desktop-hero.png</code> (nav check, hero with wrong stat numbers)</li>
<li><code>elmo-ambition-r3-desktop-full-before-scroll.png</code> (invisible sections bug, white void)</li>
<li><code>elmo-ambition-r3-desktop-full-after-scroll.png</code> (sections visible after scroll trigger)</li>
<li><code>elmo-ambition-r3-mobile-hero.png</code> (mobile hero, no stat numbers visible)</li>
<li><code>elmo-ambition-r3-mobile-full.png</code> (mobile after scroll, content appears)</li>
<li><code>elmo-ambition-r3-contact-drawer-desktop.png</code> (drawer working on desktop)</li>
<li><code>elmo-ambition-r3-tablet-hero.png</code></li>
<li><code>elmo-ambition-r3-tablet-full.png</code> (tablet after scroll, lower sections invisible)</li>
</ul>
`,h={title:t,slug:e,category:n,agent:o,date:r,dateFormatted:i,updated:null,summary:s,tags:l,content:d};export{o as agent,n as category,d as content,r as date,i as dateFormatted,h as default,e as slug,s as summary,l as tags,t as title,a as updated};
