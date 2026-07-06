const e="Ambition QA Report: Round 5 (Broken)",t="ambition-qa-r5-broken",n="Audits",o="Elmo",i="2026-03-09",s="Mar 9",c=null,l="Round 5 QA revealing critical rendering failures at desktop and tablet.",r=[],a=`<h1>Elmer Report -- Ambition Mechanical (ambition-teal.vercel.app) -- 2026-03-09</h1>
<h2>Verdict: BROKEN</h2>
<p>The site has critical rendering failures at desktop and tablet. Mobile is functional but has significant quality issues. This is not ready for client review.</p>
<hr>
<h2>SEVERITY: CRITICAL (Site-Breaking)</h2>
<h3>C1. Desktop (1440px) is completely unstyled</h3>
<ul>
<li><strong>What:</strong> The entire page renders as raw, unstyled HTML. No Tailwind/CSS is loading at desktop width. Plain text, no layout, no colors, no spacing. Navigation shows as plain blue links. Stats show as plain text &quot;500+Projects 23+Years 9Markets 24/7Dispatch&quot; on one line.</li>
<li><strong>Impact:</strong> Anyone viewing on a laptop or desktop sees a broken page. This is a total failure.</li>
<li><strong>Evidence:</strong> <code>desktop-1440-full.png</code>, <code>desktop-1440-scroll-1.png</code> through <code>desktop-1440-scroll-3.png</code></li>
<li><strong>Likely cause:</strong> CSS/Tailwind breakpoint issue. Styles apply at mobile/small widths but fail above a certain breakpoint. Could be a missing or broken <code>@media</code> query, or Tailwind config not generating classes for <code>lg:</code> / <code>xl:</code> prefixes.</li>
</ul>
<h3>C2. Desktop page is 40,849px tall (should be ~5,000-6,000px)</h3>
<ul>
<li><strong>What:</strong> Because styling is missing, every section stacks vertically at full content height. Project cards that should be in a carousel are all rendered individually as full-width blocks with dark blue placeholder images. The page scrolls for over 40,000px.</li>
<li><strong>Impact:</strong> Unusable. Scrolling through 40k pixels of broken layout.</li>
</ul>
<h3>C3. Tablet (768px) renders only hero + footer, everything else is blank</h3>
<ul>
<li><strong>What:</strong> The hero section and stats render correctly. Then the entire middle of the page is a massive empty gray/white void. Sections (services, industries, projects, testimonials, CTA, careers, FAQ) are all invisible or collapsed. Only the footer shows at the bottom.</li>
<li><strong>Impact:</strong> Tablet visitors see a mostly empty page. Just as broken as desktop, just in a different way.</li>
<li><strong>Evidence:</strong> <code>tablet-768-full.png</code>, <code>tablet-768-scroll-1.png</code> through <code>tablet-768-scroll-5.png</code></li>
<li><strong>Likely cause:</strong> Content sections may have <code>opacity: 0</code> or <code>height: 0</code> at tablet widths, possibly waiting for a scroll animation that never fires. Or a JS error is blocking rendering.</li>
</ul>
<h3>C4. Firebase permissions error on every page load</h3>
<ul>
<li><strong>What:</strong> Console error: <code>Error fetching site settings: FirebaseError: Missing or insufficient permissions.</code></li>
<li><strong>Impact:</strong> Whatever site settings are stored in Firebase (possibly section visibility, content, or config), they&#39;re failing to load. This may be contributing to the blank sections at tablet width.</li>
</ul>
<hr>
<h2>SEVERITY: HIGH (Major Quality Issues on Mobile)</h2>
<h3>H1. ALL service/industry images show &quot;Photo coming soon&quot; placeholder</h3>
<ul>
<li><strong>What:</strong> Every image in the &quot;What We Do&quot; (services) and &quot;Environments We Know Cold&quot; (industries) sections shows a dark navy rectangle with faint &quot;Photo coming soon&quot; text. These are the same dark blue blocks that dominate the broken desktop view.</li>
<li><strong>Impact:</strong> The site looks incomplete and unprofessional. A client seeing this would question readiness.</li>
<li><strong>Sections affected:</strong> HVAC Installation, HVAC Replacement, HVAC Maintenance (services), Office Complexes, Retail &amp; Shopping Centers, Manufacturing Facilities, Data Centers (industries), and ALL project cards.</li>
<li><strong>Evidence:</strong> <code>mobile-390-scroll-2.png</code>, <code>mobile-390-scroll-6.png</code>, every desktop scroll screenshot</li>
</ul>
<h3>H2. Project cards have no images</h3>
<ul>
<li><strong>What:</strong> Every single project card (Abraza, Adobe Suites, Apple Store Chandler Fashion, Banner Physical Therapy, BRKTHRGH, CEVA, Elephante, Melt, Memorial Tower, Tiffanys, etc.) shows the same dark navy &quot;Photo coming soon&quot; placeholder.</li>
<li><strong>Impact:</strong> The projects section is meant to showcase real work. Without images, it&#39;s just text floating over dark rectangles.</li>
</ul>
<h3>H3. Massive empty white/gray spaces between mobile sections</h3>
<ul>
<li><strong>What:</strong> Between nearly every section on mobile, there are enormous blank gaps (500-800px of empty white space). The page is 23,490px tall at 390px width. It should be roughly 8,000-10,000px.</li>
<li><strong>Impact:</strong> Users have to scroll through screen after screen of nothing. The &quot;Environments We Know Cold&quot; section alone has ~3 screens of blank space after the last card before any content appears.</li>
<li><strong>Evidence:</strong> <code>mobile-390-scroll-3.png</code>, <code>mobile-390-scroll-4.png</code>, <code>mobile-390-scroll-5.png</code>, <code>mobile-390-scroll-7.png</code>, <code>mobile-390-scroll-8.png</code>, <code>mobile-390-scroll-12.png</code>, <code>mobile-390-scroll-14.png</code></li>
</ul>
<h3>H4. Cookie consent banner persists on every scroll position</h3>
<ul>
<li><strong>What:</strong> The &quot;Privacy &amp; Cookies&quot; banner is visible at the bottom of every single screenshot. It never goes away, even when scrolling deep into the page. It takes up ~150px of screen real estate on mobile constantly.</li>
<li><strong>Impact:</strong> Covers the bottom ~18% of the mobile viewport at all times. Blocks content and CTAs. Users can&#39;t dismiss it easily because even after scrolling past, it follows.</li>
<li><strong>Note:</strong> The banner appears to be position:fixed but is still within the page flow somehow, which may be contributing to the excessive page height.</li>
</ul>
<h3>H5. Text readability -- 60+ elements under 12px on mobile</h3>
<ul>
<li><strong>What:</strong> Playwright detected 60+ text elements at 11px or smaller on mobile. These include section labels (&quot;OUR SERVICES&quot;, &quot;WHERE WE WORK&quot;, &quot;OUR WORK&quot;, &quot;TESTIMONIALS&quot;, &quot;START HERE&quot;, &quot;COMMON QUESTIONS&quot;, &quot;JOIN THE CREW&quot;), all tag/pill labels (every &quot;COMMERCIAL HVAC&quot;, &quot;PHASED DELIVERY&quot;, &quot;VENTILATION&quot;, etc.), stats labels (&quot;PROJECTS COMPLETED&quot;, &quot;YEARS EXPERIENCE&quot;, etc.), and the license number (10px).</li>
<li><strong>Impact:</strong> All-caps 11px text is very hard to read on mobile. The section labels especially need to be bigger since they orient the user.</li>
<li><strong>WCAG note:</strong> 11px is below the 12px minimum recommended for mobile accessibility.</li>
</ul>
<h3>H6. &quot;SEND MESSAGE&quot; button has low-contrast background</h3>
<ul>
<li><strong>What:</strong> The &quot;Send Message&quot; button in the CTA section has a light pink/salmon background (<code>rgba(255,255,255,0.1)</code> over the gray CTA background). The text is white/cream on a very light background.</li>
<li><strong>Impact:</strong> Button doesn&#39;t look clickable. Hard to see.</li>
<li><strong>Evidence:</strong> <code>mobile-390-scroll-10.png</code></li>
</ul>
<hr>
<h2>SEVERITY: MEDIUM</h2>
<h3>M1. Project card text clipping on mobile (confirmed from Patrik&#39;s screenshot)</h3>
<ul>
<li><strong>What:</strong> In the projects carousel on mobile, the left card shows truncated text. &quot;BRKTHRGH&quot; project name and description get clipped at the left edge. The right card (&quot;CEVA&quot;) is partially off-screen.</li>
<li><strong>Impact:</strong> Users can&#39;t read project names or descriptions without swiping.</li>
<li><strong>Evidence:</strong> Patrik&#39;s original <code>ambition-mobile-projects-section.png</code></li>
</ul>
<h3>M2. Logo section shows text names instead of actual logos</h3>
<ul>
<li><strong>What:</strong> The trust/logos section near the CTA shows plain text: &quot;INTEL&quot;, &quot;BANNER HEALTH&quot;, &quot;AMAZON&quot;, &quot;HONEYWELL&quot;, &quot;CHASE&quot; as text strings, not logo images.</li>
<li><strong>Impact:</strong> Text names have much less visual credibility than actual brand logos.</li>
<li><strong>Evidence:</strong> Patrik&#39;s original <code>ambition-mobile-cta-logos.png</code></li>
</ul>
<h3>M3. Multiple contrast failures (WCAG AA)</h3>
<ul>
<li><strong>What:</strong> Playwright found contrast ratios of 1.00 (essentially invisible) on multiple elements. &quot;SEE OUR PROJECTS&quot; button has white text on near-transparent white background. All tag pills (RELIABILITY, GUEST COMFORT, UPTIME, PERFORMANCE, MEDICAL HVAC, VENTILATION, etc.) have navy text on near-transparent navy background.</li>
<li><strong>Impact:</strong> These elements are technically present but nearly invisible. The tag pills likely rely on a different background color that&#39;s not rendering.</li>
</ul>
<h3>M4. Small touch targets on mobile</h3>
<ul>
<li><strong>What:</strong> Several interactive elements are under the 44px minimum:<ul>
<li>Logo/home link: 168x28px</li>
<li>Phone number link: 358x20px</li>
<li>Email link: 358x20px</li>
<li>Privacy Policy link: 79x16px / 92x17px</li>
<li>Cookie Preferences: 112x16px</li>
<li>Essential Only button: 324x42px (just under)</li>
</ul>
</li>
<li><strong>Impact:</strong> Hard to tap on mobile, especially the footer links.</li>
</ul>
<h3>M5. Duplicate &quot;Privacy Policy&quot; links in footer</h3>
<ul>
<li><strong>What:</strong> Two separate &quot;Privacy Policy&quot; links appear in the footer, both pointing to <code>/privacy</code>.</li>
<li><strong>Impact:</strong> Minor but looks like an oversight.</li>
</ul>
<h3>M6. CTA section has no client logos (gray/empty)</h3>
<ul>
<li><strong>What:</strong> Above &quot;GET STARTED WITH A FREE QUOTE&quot;, there&#39;s a section meant to show client logos. At tablet, the text names are visible. On the gray-background CTA section on mobile, there&#39;s just empty space where logos should be.</li>
<li><strong>Impact:</strong> Missed trust-building opportunity.</li>
</ul>
<h3>M7. No testimonial content visible</h3>
<ul>
<li><strong>What:</strong> The &quot;TESTIMONIALS&quot; section label was detected in the page text, and there&#39;s a giant quotation mark visible in the desktop full-page screenshot, but no actual testimonial text or quotes are visible in any of the mobile or tablet scroll captures.</li>
<li><strong>Impact:</strong> Social proof section exists but content may not be rendering.</li>
</ul>
<hr>
<h2>SEVERITY: LOW</h2>
<h3>L1. Google Analytics request blocked</h3>
<ul>
<li><strong>What:</strong> GA4 collect request to <code>google-analytics.com/g/collect</code> returned ERR_ABORTED on tablet.</li>
<li><strong>Impact:</strong> Analytics may not be tracking. Minor for QA, but worth noting.</li>
</ul>
<h3>L2. Footer contact link heights</h3>
<ul>
<li><strong>What:</strong> Phone and email in footer are full-width (358px) but only 20px tall. The tap target is technically wide enough but the height is tight.</li>
</ul>
<h3>L3. &quot;Tap for details&quot; appears on desktop</h3>
<ul>
<li><strong>What:</strong> Project cards show &quot;Tap for details&quot; even on desktop where users would click, not tap.</li>
<li><strong>Impact:</strong> Minor copy issue. Should say &quot;Click for details&quot; or just &quot;View details&quot; at desktop widths.</li>
</ul>
<hr>
<h2>Performance</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>Mobile (390)</th>
<th>Tablet (768)</th>
<th>Desktop (1440)</th>
</tr>
</thead>
<tbody><tr>
<td>Load time</td>
<td>11,832ms</td>
<td>8,793ms</td>
<td>~12,000ms</td>
</tr>
<tr>
<td>DOM Content Loaded</td>
<td>6,827ms</td>
<td>3,789ms</td>
<td>N/A</td>
</tr>
<tr>
<td>First Paint</td>
<td>6,936ms</td>
<td>3,940ms</td>
<td>N/A</td>
</tr>
<tr>
<td>First Contentful Paint</td>
<td>6,936ms</td>
<td>3,940ms</td>
<td>N/A</td>
</tr>
<tr>
<td>Total Transfer</td>
<td>373KB</td>
<td>373KB</td>
<td>~373KB</td>
</tr>
<tr>
<td>Resources</td>
<td>29</td>
<td>24</td>
<td>~24</td>
</tr>
</tbody></table>
<ul>
<li><strong>Load times are slow.</strong> 7-12 seconds to first paint is unacceptable. Target should be under 3 seconds.</li>
<li><strong>Page weight is reasonable</strong> (373KB), so the slowness is likely server response time or JS execution.</li>
<li><strong>FCP of ~7 seconds on mobile</strong> means users stare at a blank/loading screen for 7 seconds before seeing anything.</li>
</ul>
<hr>
<h2>Heading Hierarchy</h2>
<p>Hierarchy is correct: H1 &gt; H2 &gt; H3, no skips.</p>
<ul>
<li>H1: 48px/800 weight - &quot;WE BUILD THE SYSTEMS THAT KEEP BUSINESS MOVING&quot; (one H1, good)</li>
<li>H2: 28px/700 weight - Section titles (WHAT WE DO, ENVIRONMENTS WE KNOW COLD, FEATURED PROJECTS)</li>
<li>H3: 20px/600 weight - Individual cards (service names, project names)</li>
</ul>
<p>This is solid.</p>
<hr>
<h2>Content / Copy Check</h2>
<p>All visible text reviewed. No typos found. Copy is clean and professional.</p>
<p>Pages confirmed working via links:</p>
<ul>
<li><code>/about</code></li>
<li><code>/projects</code></li>
<li><code>/careers</code></li>
<li><code>/services</code></li>
<li><code>/privacy</code></li>
</ul>
<p>Contact info matches expected:</p>
<ul>
<li>Phone: (480) 600-2942</li>
<li>Email: <a href="mailto:info@ambitionac.com">info@ambitionac.com</a></li>
<li>Location: Phoenix, AZ</li>
<li>License: ROC #320923</li>
</ul>
<hr>
<h2>Contact Drawer</h2>
<p>The contact drawer (tested at desktop via &quot;Get a Quote&quot; click) works and looks polished:</p>
<ul>
<li>&quot;GET IN TOUCH&quot; header</li>
<li>&quot;FAST DIRECT LINE&quot; with Call Dispatch, Email Team, Text Reply options</li>
<li>Step 1 of 3: Project Snapshot form</li>
<li>Fields: Service Needed, Facility Size, Timeline (ASAP / Within 30 days / This quarter / Planning stage)</li>
<li>Preferred reply method: Phone / Email / Text</li>
<li>&quot;CONTINUE&quot; button</li>
<li>&quot;Prefer email? Reach us at <a href="mailto:bids@ambitionac.com">bids@ambitionac.com</a>&quot; fallback</li>
</ul>
<p>This is one of the best-built parts of the site. Clean, functional, well-organized.</p>
<hr>
<h2>Bobby&#39;s Fix List (Priority Order)</h2>
<ol>
<li><p><strong>FIX CSS/STYLING AT DESKTOP WIDTHS</strong> -- This is the #1 blocker. The entire site is unstyled above mobile breakpoints. Check Tailwind config, check if CSS is conditionally loading, check for a broken media query. This likely fixes desktop AND tablet in one shot.</p>
</li>
<li><p><strong>FIX TABLET BLANK SECTIONS</strong> -- If not fixed by #1, investigate why sections are invisible at 768px. Check for scroll-triggered animations that depend on IntersectionObserver or similar, which may not be firing. Check for <code>opacity: 0</code> / <code>transform</code> styles that never get their &quot;visible&quot; class added.</p>
</li>
<li><p><strong>FIX FIREBASE PERMISSIONS</strong> -- The console error &quot;Missing or insufficient permissions&quot; on site settings fetch. Either fix Firestore rules or remove the Firebase dependency if it&#39;s not needed.</p>
</li>
<li><p><strong>ADD REAL IMAGES</strong> -- Replace all &quot;Photo coming soon&quot; placeholders with actual project/service photos. Every section (services, industries, projects) needs real photography. If photos aren&#39;t available yet, use higher-quality placeholders or hide the image slots.</p>
</li>
<li><p><strong>REDUCE EMPTY SPACE ON MOBILE</strong> -- Remove or reduce the massive gaps between sections. Check for elements with large min-height, padding, or margin values. The page should be roughly 8,000-10,000px on mobile, not 23,490px.</p>
</li>
<li><p><strong>FIX COOKIE BANNER</strong> -- Make it dismissable and ensure it actually disappears when &quot;Essential Only&quot; or &quot;Accept All&quot; is clicked. It should not persist across the entire scroll.</p>
</li>
<li><p><strong>INCREASE SMALL TEXT SIZES</strong> -- Bump all 11px text to at least 13-14px on mobile. Section labels, tag pills, stats labels, and the license number all need to be bigger.</p>
</li>
<li><p><strong>FIX CONTRAST ISSUES</strong> -- The tag pills and &quot;SEE OUR PROJECTS&quot; button need visible backgrounds or border treatments. Current near-transparent backgrounds make text invisible.</p>
</li>
<li><p><strong>ADD REAL LOGOS</strong> -- Replace text client names (Intel, Banner Health, Amazon, Honeywell, Chase) with actual logo images.</p>
</li>
<li><p><strong>FIX TOUCH TARGETS</strong> -- Increase footer link heights to at least 44px tap targets.</p>
</li>
<li><p><strong>FIX PERFORMANCE</strong> -- 7-second FCP on mobile is too slow. Investigate server response time and JS bundle size. Consider preloading critical CSS.</p>
</li>
</ol>
`,d={title:e,slug:t,category:n,agent:o,date:i,dateFormatted:s,updated:null,summary:l,tags:r,content:a};export{o as agent,n as category,a as content,i as date,s as dateFormatted,d as default,t as slug,l as summary,r as tags,e as title,c as updated};
