const e="Combined QA Report R5: Ambition + AOM",t="elmo-combined-qa-r5",o="Audits",n="Elmo",i="2026-03-09",a="Mar 9",c=null,s="Combined QA of both Ambition and AOM sites across 4 viewports with Playwright.",r=[],l=`<h1>Elmo Combined QA Report - R5</h1>
<p><strong>Sites:</strong> Ambition Mechanical (ambition-teal.vercel.app) + AOM (aheadofmarket.com)
<strong>Date:</strong> 2026-03-09
<strong>Viewports tested:</strong> Desktop 1440, Laptop 1280, Tablet 768, Mobile 390
<strong>Tools:</strong> Playwright automated screenshots + interaction testing + link audit</p>
<hr>
<h2>AMBITION MECHANICAL (ambition-teal.vercel.app)</h2>
<h3>Loading Screen</h3>
<p><strong>PASS - Looks Industrial and Polished</strong></p>
<p>The loader sequence is clean and well-executed:</p>
<ul>
<li>t0 (0.5s): Gauge ring visible with red tick marks, capacity bar at 54%, no logo yet. The gauge animates with visible tick marks rotating around the circle.</li>
<li>t1 (1.0s): Logo reveals inside the gauge ring (Ambition Mechanical Services compass logo, full color). Capacity bar at 85%.</li>
<li>t2 (1.5s): Logo fully rendered, capacity bar at 96%.</li>
<li>t3 (2.0s): Capacity bar at 100%, bar turns red to signal completion.</li>
<li>t4 (2.5s): Loader exits cleanly to hero with video background.</li>
</ul>
<p>The &quot;CAPACITY&quot; label with percentage is an excellent touch for a mechanical/industrial brand. The gauge-to-logo reveal is smooth. White background during load is clean. No jank, no flicker. <strong>This loader is DROP DEAD GORGEOUS.</strong></p>
<p>One minor note: the background is pure white during load. Consider matching it to the dark hero background (navy/dark) so the transition from loader to hero doesn&#39;t flash white-to-dark. Not a blocker, but the flash is noticeable.</p>
<h3>Hero Section</h3>
<p><strong>PASS with notes</strong></p>
<ul>
<li>Desktop 1440: Hero video background plays. Headline &quot;WE BUILD THE SYSTEMS THAT KEEP BUSINESS MOVING&quot; is bold, white, uppercase, highly readable. Subtext is clean. Two CTAs: red &quot;GET A QUOTE&quot; and outlined &quot;SEE OUR PROJECTS&quot;. Stats row at bottom: 250+, 23+, 9, 24/7.</li>
<li>Laptop 1280: Same layout, scales well. No overflow issues.</li>
<li>Tablet 768: Headline stacks nicely. CTAs stack. Stats row visible below hero. &quot;GET A QUOTE&quot; button visible in top right. Logos (Intel, Banner Health, Amazon, Honeywell, Chase) visible below stats.</li>
<li>Mobile 390: Clean stack. Headline readable. Cookie banner takes significant space but that&#39;s expected. Stats visible below CTAs.</li>
</ul>
<p><strong>The headings are BOLD.</strong> The uppercase tracking and weight on &quot;WE BUILD THE SYSTEMS THAT KEEP BUSINESS MOVING&quot; reads heavy and industrial. This passes the &quot;old people can read em, young people love em&quot; test.</p>
<h3>Logos Section Placement</h3>
<p><strong>PASS</strong> - &quot;TRUSTED BY&quot; logos (Intel, Banner Health, Amazon, Honeywell, Chase) are positioned directly under the hero/stats area on all viewports. On desktop scroll1, the logos are visible right below the hero section before &quot;WHAT WE DO.&quot; They are NOT at the bottom of the page. Correct placement confirmed.</p>
<h3>Duplicate Stats Section</h3>
<p><strong>PASS</strong> - Only one stats row visible (250+ Projects, 23+ Years, 9 Markets, 24/7 Emergency). No duplicates found in any viewport or scroll position. The stats appear once in the hero area and nowhere else.</p>
<h3>Section Order (Desktop)</h3>
<ol>
<li>Hero + Stats + Logos (TRUSTED BY)</li>
<li>&quot;WHAT WE DO&quot; - Services (HVAC Installation, Replacement, Maintenance)</li>
<li>&quot;ENVIRONMENTS WE KNOW COLD&quot; - Markets (Office, Retail, Manufacturing, Data Centers)</li>
<li>&quot;FEATURED PROJECTS&quot; - Project cards carousel (Banner Physician, BRKTHRGH, etc.)</li>
<li>Testimonials carousel</li>
<li>&quot;GET STARTED WITH A FREE QUOTE&quot; - Contact CTA section</li>
<li>Careers section - &quot;PEOPLE WHO CARE ABOUT CRAFT&quot;</li>
<li>FAQ accordion</li>
<li>Footer</li>
</ol>
<p><strong>This order makes sense.</strong> Services &gt; Markets &gt; Proof &gt; Trust &gt; CTA &gt; Careers &gt; FAQ &gt; Footer. No issues.</p>
<h3>Heading Weights</h3>
<p><strong>PASS</strong> - All section headings are thick/bold uppercase:</p>
<ul>
<li>&quot;WHAT WE DO&quot; - navy, bold, industrial font</li>
<li>&quot;ENVIRONMENTS WE KNOW COLD&quot; - large, bold</li>
<li>&quot;FEATURED PROJECTS&quot; - large, bold</li>
<li>&quot;TEAMS WHO VALUE UPTIME TRUST AMBITION&quot; - testimonials heading</li>
<li>&quot;GET STARTED WITH A FREE QUOTE&quot; - white on dark bg, bold</li>
<li>&quot;FREQUENTLY ASKED QUESTIONS&quot; - dark section heading</li>
</ul>
<p>All headings use the Barlow Condensed display font, bold weight, uppercase tracking. Consistent and readable.</p>
<h3>Contact Drawer</h3>
<p><strong>PASS - Desktop</strong></p>
<p>Desktop contact drawer opens from the right side. Shows:</p>
<ul>
<li>Step indicator (Step 1 of 3)</li>
<li>&quot;Call Dispatch&quot; button (red) + &quot;Email Team&quot; and &quot;Text/Reply&quot; options</li>
<li>&quot;PROJECT SNAPSHOT&quot; form with service type dropdown, property size, timeline, planning stage</li>
<li>Dark background with solid panels (not glassmorphism)</li>
</ul>
<p>The drawer is functional and well-structured. The multi-step approach is good UX.</p>
<p><strong>ISSUE - Mobile CTA routing</strong></p>
<p>When clicking &quot;Schedule&quot; CTA on mobile, it navigated to a project detail page (BRKTHRGH) instead of opening the contact drawer. The mobile &quot;Contact&quot; CTA needs to trigger the drawer, not navigate to a project. This appears to be a link target mismatch on mobile.</p>
<p><strong>Severity: MEDIUM</strong> - Mobile users who want to contact the business end up on a project page instead.</p>
<h3>Navigation</h3>
<p><strong>PASS - Desktop</strong>: Full nav visible (Home, About, What We Do, Projects, Careers, Contact) + red &quot;GET A QUOTE&quot; button. All links are proper routes (/about, /services, /projects, /careers).</p>
<p><strong>PASS - Tablet</strong>: Hamburger menu works. Opens slide-in menu with all nav items + &quot;GET A QUOTE&quot; CTA.</p>
<p><strong>PASS - Mobile</strong>: Hamburger menu works. Same slide-in menu with full nav + CTA. Menu items: Home, About, What We Do, Projects, Careers, Contact, GET A QUOTE.</p>
<h3>Content/Image Issues</h3>
<p><strong>FLAG - Placeholder Images</strong></p>
<p>Several service cards and market cards show &quot;Photo coming soon&quot; placeholder images (grey gradient boxes). Visible in:</p>
<ul>
<li>Service cards (HVAC Installation, HVAC Replacement, HVAC Maintenance) - top image areas on mobile</li>
<li>Market cards (Office Complexes, Retail, Manufacturing, Data Centers) - image areas on desktop</li>
</ul>
<p><strong>Severity: MEDIUM</strong> - These need real photos before launch. Placeholder images are not launch-ready. The client needs to provide actual job site/equipment photos, or Bobby should source appropriate stock.</p>
<h3>Cookie Banner</h3>
<p><strong>NOTE</strong> - The cookie consent banner persists across all viewports and takes significant screen real estate, especially on mobile. It&#39;s functional with &quot;Essential Only&quot; and &quot;Accept All&quot; buttons. This is standard but worth noting it partially covers content on mobile until dismissed.</p>
<h3>Link Audit</h3>
<p>23 total links, all properly mapped:</p>
<ul>
<li>Navigation: /, /about, /services, /projects, /careers</li>
<li>CTAs: /projects (See Our Projects, View All Projects)</li>
<li>Markets: /markets (View Industries)</li>
<li>Contact: tel:4806002942 (Call Dispatch)</li>
<li>Footer: /about, /projects, /careers, /services (x4 sub-services), tel:, mailto:<a href="mailto:info@ambitionac.com">info@ambitionac.com</a>, /privacy (x2)</li>
</ul>
<p>23 buttons total including Contact (type=button), Get a Quote (type=button), Send Message, FAQ accordions, Cookie buttons. All functional.</p>
<p>No dead links. No 404 targets visible. <strong>PASS.</strong></p>
<hr>
<h2>AOM SITE (aheadofmarket.com)</h2>
<h3>Page Architecture</h3>
<p>The AOM site uses a section-based scroll layout. The page body height equals the viewport height (900px = 900px), meaning sections are navigated via the nav buttons or scroll-snap, not traditional scrolling. 11 sections total.</p>
<p><strong>Key finding: Desktop scrolling appears locked.</strong> <code>window.scrollBy()</code> does NOT move the viewport. Navigation must happen via the nav buttons (Work, Services, Talk to Us, Start a Brief). This is intentional design but creates an accessibility concern (keyboard-only users, screen readers may struggle).</p>
<p>On mobile, <code>mouse.wheel()</code> scrolling DOES work. The sections scroll normally on touch devices. This is correct behavior.</p>
<h3>Hero</h3>
<p><strong>PASS - DROP DEAD GORGEOUS</strong></p>
<p>Desktop: &quot;WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.&quot; with mixed white/orange typography. The italic orange &quot;IMPOSSIBLE TO IGNORE.&quot; is a strong brand statement. Video/image background with rotating hero images. &quot;CREATIVE PRODUCTION + AI SYSTEMS&quot; subheading. Two CTAs: orange &quot;SEE WHAT WE&#39;D BUILD FOR YOU&quot; and outlined &quot;SEE THE WORK.&quot;</p>
<p>Mobile: Same headline stacks cleanly. &quot;BRIEF&quot; button in header (orange). Hamburger menu. Phoenix, AZ location tag, VIDEO / WEB / SOCIAL / SYSTEMS service list, EST. 2020.</p>
<p>The typography hierarchy is excellent. Bold headline, warm orange accent, dark moody background. <strong>This reads expensive and confident.</strong></p>
<h3>Nav / CTA Testing</h3>
<p><strong>PASS - Work button</strong>: Navigates to &quot;THE PORTFOLIO.&quot; section. Shows real project work (Virtu Hospitality Scottsdale visible). Filter tabs (ALL, BRANDS, CONSTRUCTION). Clean portfolio layout.</p>
<p><strong>PASS - Services button</strong>: Navigates to &quot;PICK WHAT FITS.&quot; section with service packages. Shows three cards: Product Launch ($10k-$25k), Content Engine ($3k/mo), Brand Authority ($5k+). Each has an icon, description, and pricing. Well-structured and clear.</p>
<p><strong>PASS - Talk to Us button</strong>: Opens &quot;CONNECT.&quot; overlay with department selection:</p>
<ul>
<li>SCHEDULING (Inquiries &amp; Logistics)</li>
<li>CREATIVE (Vision &amp; Strategy)</li>
<li>SUPPORT (Operations &amp; Billing)</li>
<li>ACCOUNTING (Invoicing &amp; Vendors)</li>
</ul>
<p>This is a polished, professional phone-tree style contact UI. The department routing is smart for a production company. Has a close (X) button.</p>
<h3>CRITICAL BUG: &quot;Talk to Us&quot; Overlay Blocks All Interaction</h3>
<p><strong>SEVERITY: HIGH</strong></p>
<p>After the &quot;Talk to Us&quot; / CONNECT overlay opens, it creates a <code>fixed inset-0 z-[1000]</code> element that intercepts ALL pointer events on the page. When the &quot;Start a Brief&quot; nav button was clicked after the CONNECT overlay had been shown, the overlay element continued to block clicks even though it appeared dismissed visually.</p>
<p>The error log shows: <code>&lt;div class=&quot;fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl&quot;&gt;...&lt;/div&gt; intercepts pointer events</code></p>
<p>This means:</p>
<ol>
<li>User clicks &quot;Talk to Us&quot; -&gt; overlay opens (GOOD)</li>
<li>User closes overlay -&gt; overlay div remains in DOM with <code>fixed inset-0 z-[1000]</code> -&gt; still intercepts ALL clicks (BAD)</li>
<li>No other buttons on the page can be clicked after this point</li>
</ol>
<p><strong>Bobby must fix this.</strong> The overlay&#39;s container div needs to either be removed from the DOM on close, or set to <code>pointer-events: none</code> / <code>display: none</code> / <code>visibility: hidden</code> when inactive. Currently it creates a dead page after first use.</p>
<h3>Mobile Menu</h3>
<p><strong>PASS - Exists and Works</strong></p>
<p>Mobile hamburger (three lines) opens to a full-screen overlay with large navigation items:</p>
<ul>
<li>WORK</li>
<li>CONSTRUCTION</li>
<li>BRANDS</li>
<li>SERVICES</li>
<li>DIGITAL</li>
<li>TALK TO US</li>
<li>START A BRIEF (orange button)</li>
</ul>
<p>Close button (X) visible. The menu text is large, bold, and easy to tap. Orange glow effects behind items. <strong>This is gorgeous mobile nav.</strong> The typography is confident and the spacing gives plenty of touch target room.</p>
<h3>Mobile Brief Button</h3>
<p><strong>ISSUE</strong> - The &quot;Brief&quot; button in the mobile header bar is not visible (Playwright reports <code>element is not visible</code>). The header shows &quot;AOM.&quot; logo, an orange &quot;BRIEF&quot; button, and hamburger. However, when Playwright tried to click it programmatically, the element was reported as not visible. This could be a z-index issue or the element being covered by another layer.</p>
<p><strong>Severity: MEDIUM</strong> - Needs investigation. The BRIEF button is visually present in the hero screenshot but may be unclickable on certain conditions.</p>
<h3>Mobile Sections (Scroll-through)</h3>
<p>All sections render beautifully on mobile 390px:</p>
<ol>
<li><strong>Hero</strong>: Clean stack, orange CTAs prominent</li>
<li><strong>Service categories</strong>: Construction Companies, Brands + Corporate, Digital + Systems cards. Each with icon and &quot;See what we build&quot; links.</li>
<li><strong>Construction focus</strong>: &quot;YOUR COMPETITOR&#39;S INSTAGRAM IS THEIR BEST RECRUITER. IS YOURS?&quot; - Bold, punchy copy. Recruiting, Winning Bids, Looking Legitimate benefit cards.</li>
<li><strong>Proof point</strong>: Ambition Mechanical case study. &quot;30+ POSTS / MONTH&quot;, &quot;Monthly FILMING + POSTING&quot; stats.</li>
<li><strong>Social clips section</strong>: &quot;SWIPE TO EXPLORE&quot; with 9:16 video thumbnails. Good mobile-native content showcase.</li>
<li><strong>Work section</strong>: &quot;THE WORK SPEAKS.&quot; heading. Portfolio grid with project cards (Pretty Penny, AZ Arts Foundation, N2 Local News, etc.)</li>
<li><strong>Stats</strong>: 63+ Projects Shipped, 34+ Clients Served, 100+ Videos Delivered.</li>
<li><strong>Testimonials</strong>: Real client quotes with names and companies (Brandon Clarke / Startup AZ Foundation, Sumit Seth / Naamly, Gio Osso / Virtu Hospitality).</li>
</ol>
<p><strong>All mobile sections are DROP DEAD GORGEOUS.</strong> The typography scales perfectly. Content is readable. Orange accents pop against the dark backgrounds. Card layouts don&#39;t break.</p>
<h3>Hero CTA Testing</h3>
<p>The hero CTA &quot;See What We&#39;d Build For You&quot; was not caught by the automated test on mobile (hero CTA selector didn&#39;t match). On desktop, no hero CTA result was captured either.</p>
<p><strong>Note:</strong> These are <code>&lt;button&gt;</code> elements, not <code>&lt;a&gt;</code> links. The link audit shows only 3 actual <code>&lt;a&gt;</code> tags on the entire AOM site (logo, Ambition Mechanical external link, email mailto). Everything else is JavaScript-driven buttons. This is fine for a SPA but means crawlers/SEO bots see almost no navigable links.</p>
<h3>Brief / Form</h3>
<p><strong>ISSUE</strong> - No traditional form link was found. The &quot;Start a Brief&quot; button in the nav is a button element, not an anchor. When clicked, it should open a brief/form overlay. Due to the CONNECT overlay blocking bug, this could not be tested after &quot;Talk to Us&quot; was clicked first.</p>
<p><strong>Needs manual verification:</strong> Does &quot;Start a Brief&quot; open a proper intake form? Does the form validate (name &gt; 1 char, valid email)?</p>
<h3>Footer / &quot;Call the Team&quot;</h3>
<p>The link audit shows &quot;Call the Team&quot; exists as a visible button. It was not reachable in testing due to the overlay blocking bug.</p>
<p>Only footer link found: <code>hello@aom-inhouse.com</code> (mailto). No other footer navigation links.</p>
<p><strong>Severity: LOW</strong> - The single-page architecture means footer nav isn&#39;t critical, but the mailto link works.</p>
<h3>Link Audit Summary</h3>
<p><strong>3 total <code>&lt;a&gt;</code> links:</strong></p>
<ul>
<li>[VIS] &quot;AOM.&quot; -&gt; / (logo/home)</li>
<li>[VIS] &quot;See Ambition Mechanical&quot; -&gt; <a href="https://ambitionac.com">https://ambitionac.com</a> (external)</li>
<li>[VIS] &quot;<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>&quot; -&gt; mailto:<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a></li>
</ul>
<p><strong>38 total <code>&lt;button&gt;</code> elements, all visible:</strong></p>
<ul>
<li>Nav: Work, Services, Talk to Us, Start a Brief</li>
<li>Hero CTAs: See What We&#39;d Build For You, See the Work</li>
<li>Department cards: Construction, Brands + Corporate, Digital + Systems</li>
<li>Portfolio filters: all, brands, construction</li>
<li>Various &quot;See What We&#39;d Build/Produce&quot; CTAs throughout sections</li>
<li>Service package cards (6 total)</li>
<li>Form: Get Access (type=submit)</li>
<li>FAQ accordions (6 items)</li>
<li>Footer: Start a Brief, Talk to Us, Call the Team</li>
</ul>
<p>All buttons are rendered and visible. No dead/disabled buttons found (except Brief on mobile - see above).</p>
<hr>
<h2>COMBINED ISSUES - SORTED BY SEVERITY</h2>
<h3>BLOCKERS (Must fix before launch)</h3>
<ol>
<li><strong>[AOM] CONNECT overlay blocks all page interaction after close.</strong> The <code>fixed inset-0 z-[1000]</code> overlay stays in the DOM and intercepts pointer events after being dismissed. User cannot click ANY button after opening &quot;Talk to Us&quot; once. This makes the site partially broken after first contact attempt.</li>
</ol>
<h3>HIGH PRIORITY</h3>
<ol start="2">
<li><p><strong>[AMBITION] Placeholder images on service and market cards.</strong> &quot;Photo coming soon&quot; grey boxes appear on multiple cards. Not launch-ready for a paying client site.</p>
</li>
<li><p><strong>[AMBITION] Mobile CTA routes to project page instead of contact drawer.</strong> The &quot;Schedule&quot; button on mobile navigated to a BRKTHRGH project detail page instead of opening the contact form.</p>
</li>
</ol>
<h3>MEDIUM PRIORITY</h3>
<ol start="4">
<li><p><strong>[AOM] Mobile &quot;Brief&quot; button may be unclickable.</strong> The BRIEF button is visually present in the header but Playwright couldn&#39;t click it (reported as not visible). Needs manual verification.</p>
</li>
<li><p><strong>[AOM] SEO concern: Only 3 <code>&lt;a&gt;</code> tags on entire page.</strong> All navigation is button-driven JavaScript. Crawlers see almost nothing. Consider adding proper anchor tags for key pages if SEO matters (it will when going after construction leads).</p>
</li>
<li><p><strong>[AMBITION] Loader white-to-dark flash.</strong> Loader uses white background, hero is dark. The transition at 100% creates a brief white flash. Consider matching loader background to hero background.</p>
</li>
</ol>
<h3>LOW PRIORITY / POLISH</h3>
<ol start="7">
<li><p><strong>[AOM] Desktop scrolling is locked (section-snap only).</strong> Users can only navigate via nav buttons or mouse wheel snap. No scrollbar visible. Keyboard arrow keys / Page Down behavior should be verified.</p>
</li>
<li><p><strong>[AMBITION] Cookie banner covers content on mobile.</strong> Standard behavior but worth noting the banner takes ~25% of mobile screen.</p>
</li>
<li><p><strong>[AOM] &quot;Start a Brief&quot; form validation untested.</strong> Could not test due to overlay bug blocking. Needs manual QA: name &gt; 1 char, valid email format, form submission flow.</p>
</li>
</ol>
<hr>
<h2>VISUAL DESIGN VERDICT</h2>
<h3>Ambition Mechanical: PASS</h3>
<p>The site looks professional, industrial, and trustworthy. The dark hero with video background establishes credibility immediately. The bold uppercase headings (Barlow Condensed) with &quot;AMBITION&quot; in red and &quot;MECHANICAL SERVICES&quot; in white creates strong brand hierarchy. The red CTAs pop. The loader is polished. The contact drawer is well-structured. Stats (250+, 23+, 9, 24/7) build trust fast.</p>
<p><strong>Needs:</strong> Real photos to replace placeholders, and the mobile CTA routing fix. Once those are in, this is launch-ready for a construction client.</p>
<h3>AOM Site: PASS (with critical bug fix)</h3>
<p>The AOM site is visually stunning. The typography is magazine-quality. The orange/dark palette is bold and confident. The portfolio section with real work looks premium. The &quot;PICK WHAT FITS&quot; pricing cards are clear and well-designed. The CONNECT department overlay is a creative touch. The mobile experience scrolls beautifully.</p>
<p><strong>The one critical fix:</strong> The CONNECT overlay blocking bug. Once that&#39;s patched, this site is a showpiece.</p>
<p><strong>Design standard met: &quot;Old people can read em, young people love em.&quot;</strong> Both sites pass this test. Large, bold typography. High contrast. Clean hierarchy. No tiny text lost in decorative noise.</p>
<hr>
<h2>SCREENSHOTS REFERENCE</h2>
<p>All screenshots saved to: <code>projects/bobby/double-check/combined-r5/</code></p>
<p>Key files:</p>
<ul>
<li><code>amb-loader-t0.png</code> through <code>amb-loader-t5.png</code> - Loader sequence</li>
<li><code>amb-desktop-*.png</code> - Ambition desktop views</li>
<li><code>amb-mobile-*.png</code> - Ambition mobile views</li>
<li><code>aom-deep-*.png</code> - AOM desktop section navigation</li>
<li><code>aom-mob2-*.png</code> - AOM mobile scroll-through</li>
<li><code>aom-mobile-menu-open.png</code> - AOM mobile menu</li>
</ul>
`,u={title:e,slug:t,category:o,agent:n,date:i,dateFormatted:a,updated:null,summary:s,tags:r,content:l};export{n as agent,o as category,l as content,i as date,a as dateFormatted,u as default,t as slug,s as summary,r as tags,e as title,c as updated};
