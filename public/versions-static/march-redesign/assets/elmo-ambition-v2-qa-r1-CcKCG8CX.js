const t="Ambition Brand v2 QA: Round 1",e="elmo-ambition-v2-qa-r1",o="Audits",n="Elmo",i="2026-03-09",r="Mar 9",d=null,l="First QA round of Ambition brand v2 token cleanup application.",s=[],a=`<h1>Elmo QA Report: Ambition Brand v2 Application</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>URL:</strong> <a href="https://ambition-teal.vercel.app">https://ambition-teal.vercel.app</a>
<strong>Commit:</strong> 7f99db9 (Bobby&#39;s brand v2 token cleanup)
<strong>Verdict:</strong> DOES NOT PASS. 14 blockers, 9 warnings.</p>
<hr>
<h2>Performance</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>Value</th>
<th>Grade</th>
</tr>
</thead>
<tbody><tr>
<td>DOM Content Loaded</td>
<td>8,717ms</td>
<td>FAIL</td>
</tr>
<tr>
<td>Load Time</td>
<td>8,717ms</td>
<td>FAIL</td>
</tr>
<tr>
<td>First Contentful Paint</td>
<td>8,792ms</td>
<td>FAIL</td>
</tr>
<tr>
<td>Largest Contentful Paint</td>
<td>8,792ms</td>
<td>FAIL</td>
</tr>
<tr>
<td>Total Transfer Size</td>
<td>374 KB</td>
<td>OK</td>
</tr>
<tr>
<td>Resource Count</td>
<td>30</td>
<td>OK</td>
</tr>
</tbody></table>
<p><strong>BLOCKER P-1: Page load is catastrophically slow.</strong> FCP at nearly 9 seconds. This is unusable. Transfer size is fine at 374 KB, so this is likely a render-blocking resource or a preloader animation holding paint. The preloader needs to release within 2 seconds max. Anything over 3 seconds and visitors bounce. A commercial HVAC company&#39;s potential client is not going to wait 9 seconds. Fix this or nothing else matters.</p>
<hr>
<h2>Console Errors</h2>
<ul>
<li><code>FirebaseError: Missing or insufficient permissions.</code> on every viewport. The site settings fetch is failing. This fires on every page load.</li>
<li>Google Analytics POST requests all fail with <code>net::ERR_ABORTED</code>. GA is not collecting data.</li>
</ul>
<p><strong>BLOCKER P-2: Firebase permissions error.</strong> If this controls site settings (CMS content, dynamic data), it means the site is running on fallback/hardcoded data. Verify Firestore rules allow read access for the production domain.</p>
<p><strong>WARNING W-1: Google Analytics blocked.</strong> GA collect requests are being aborted. Likely a Content Security Policy issue or the tracker is misconfigured. No analytics data is being captured.</p>
<hr>
<h2>Hero Section</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Video background is playing (WebM source, autoplay, muted, loop). Good.</li>
<li>H1 &quot;WE BUILD THE SYSTEMS THAT KEEP BUSINESS MOVING&quot; at 96px desktop / 44px mobile in Barlow Condensed 800. Commanding. Correct.</li>
<li>Two CTAs visible: &quot;GET A QUOTE&quot; (red, solid) and &quot;SEE OUR PROJECTS&quot; (outline). Good hierarchy.</li>
<li>Stats row visible: 500+, 23+, 9, 24/7. Bold numbers, clean labels.</li>
<li>Navy overlay on video maintaining text readability.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>BLOCKER P-3: Hero stat labels at 11px on mobile, 12px on desktop.</strong> The labels &quot;PROJECTS&quot;, &quot;YEARS&quot;, &quot;MARKETS&quot;, &quot;DISPATCH&quot; are at <code>text-[11px]</code> on mobile. Steffen&#39;s spec says minimum body text is 15-16px. These are below even the 14px absolute floor. Bump to 12px mobile minimum with <code>sm:text-xs</code> keeping desktop at 12px. The stat labels are an exception since they&#39;re tiny uppercase kickers, but 11px is still too small for mobile readability. Bump to at least 12px on all breakpoints.</p>
<p><strong>WARNING W-2: StatBar labels also tiny.</strong> The second stat bar (in the testimonials section) has the same issue: &quot;PROJECTS COMPLETED&quot;, &quot;YEARS EXPERIENCE&quot; etc. at 12px. These are fine at desktop but should be checked at mobile where they render at similar size.</p>
<hr>
<h2>Services Section (&quot;What We Do&quot;)</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Section kicker &quot;OUR SERVICES&quot; in red, uppercase. Correct brand treatment.</li>
<li>H2 &quot;WHAT WE DO&quot; at 40px desktop / 28px mobile, Barlow Condensed 700, navy color. Good.</li>
<li>Three service cards with placeholder images, kicker labels (BUILD, UPGRADE, UPTIME), card titles in Barlow Condensed.</li>
<li>Cards stack vertically on mobile. Correct.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>BLOCKER P-4: Service card description text at 14px on mobile.</strong> The <code>content-card-description</code> class renders at 14px on mobile. Steffen&#39;s v2 spec mandates 15-16px minimum for body text. This is below the floor. Bump to <code>text-[15px]</code> or <code>text-base</code> (16px) on mobile.</p>
<p><strong>WARNING W-3: All service card images show &quot;Photo coming soon&quot; placeholder.</strong> This is not a Bobby issue (no photos uploaded yet), but it means the client will see placeholder gradient boxes. Flag for Patrik: get real photos into the CMS before launch.</p>
<p><strong>BLOCKER P-5: Card kicker labels at 12px.</strong> <code>content-card-kicker</code> renders at 12px across all breakpoints. These are uppercase labels so 12px is borderline acceptable on desktop, but on mobile it drops below comfortable reading. Use <code>text-[13px]</code> minimum.</p>
<hr>
<h2>Markets Section (&quot;Environments We Know Cold&quot;)</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Four market cards: Office Complexes, Retail &amp; Shopping Centers, Manufacturing Facilities, Data Centers.</li>
<li>Chip badges (RELIABILITY, GUEST COMFORT, UPTIME, PERFORMANCE) in outlined pill style. On-brand.</li>
<li>&quot;VIEW INDUSTRIES&quot; red CTA button. Correct.</li>
<li>Cards in a 4-column grid on desktop, stacking on mobile.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>BLOCKER P-6: Market card chips at 12px desktop, 11px mobile.</strong> <code>content-card-chip</code> renders at 12px/11px. These chips are important differentiators for each market. At 11px on mobile they&#39;re barely legible. Bump to 12px minimum on mobile, 13px on desktop.</p>
<p><strong>BLOCKER P-7: Card description text at 14px on mobile.</strong> Same issue as services. Every <code>content-card-description</code> instance is below the 15px floor on mobile.</p>
<hr>
<h2>Projects Section (&quot;Featured Projects&quot;)</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Grid of project cards with names: Abraza, Adobe Suites, Apple Store Chandler Fashion, Banner PT, etc.</li>
<li>Cards have chip tags (COMMERCIAL HVAC, PHASED DELIVERY, etc.), kicker labels, and &quot;TAP FOR DETAILS&quot; CTA.</li>
<li>H3 project names at 22px desktop / 20px mobile in Barlow Condensed 600. Solid.</li>
<li>&quot;VIEW ALL PROJECTS&quot; red CTA.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>BLOCKER P-8: &quot;TAP FOR DETAILS&quot; at 11px on all breakpoints.</strong> <code>card-cta-muted</code> is 11px. This is a call-to-action. It needs to be readable. Bump to at least 13px. At 11px it looks like fine print, not an invitation to interact.</p>
<p><strong>BLOCKER P-9: Project card chips at 12px desktop, 11px mobile.</strong> Same chip sizing issue as markets. The tags like &quot;MEDICAL HVAC&quot;, &quot;VENTILATION&quot; need to be at least 12px on mobile.</p>
<p><strong>WARNING W-4: All project card images are placeholder gradients.</strong> &quot;Photo coming soon&quot; on every card. Same as services. Need real project photos before launch.</p>
<p><strong>WARNING W-5: Projects section is not horizontally swipeable on mobile.</strong> Patrik flagged this in previous rounds. The cards stack vertically in a long scrolling list. On mobile with 20+ projects, this creates an extremely long page. Should be a horizontal swipe carousel or a &quot;show more&quot; truncation. Currently ALL project cards render, making the mobile page enormously tall (11,855px total page height on iPhone 14).</p>
<hr>
<h2>Testimonials Section</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>H2 &quot;TEAMS WHO VALUE UPTIME TRUST AMBITION&quot; at 40px, Barlow Condensed 700, navy.</li>
<li>Testimonial attribution labels: &quot;PHOENIX OFFICE GROUP&quot;, &quot;SCOTTSDALE HOSPITALITY CLIENT&quot;, &quot;TEMPE MIXED-USE PARTNER&quot; in uppercase tracking.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>WARNING W-6: Testimonial section not visible in mobile scroll.</strong> The testimonials section appears to be between the projects and stats sections but the testimonial cards themselves were not captured clearly. Need to verify testimonial card width/readability. Steffen flagged testimonial width as a previous issue.</p>
<p><strong>BLOCKER P-10: Testimonial attribution at 12px.</strong> The company names under testimonials render at <code>text-xs</code> (12px). As uppercase tracked text this is borderline, but on mobile it needs to be at least 13px for readability.</p>
<hr>
<h2>Stats Bar (Standalone Section)</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Stats render large and bold: 500+, 23+, 9, 24/7 in what appears to be Barlow Condensed heavy weight.</li>
<li>Clean dividers between stats.</li>
<li>Labels underneath in uppercase.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>BLOCKER P-11: Stat labels at 12px.</strong> &quot;PROJECTS COMPLETED&quot;, &quot;YEARS EXPERIENCE&quot;, &quot;MARKETS SERVED&quot;, &quot;EMERGENCY DISPATCH&quot; at <code>text-xs</code> (12px). On the dark navy background this needs more size for legibility. Bump to 13-14px.</p>
<hr>
<h2>&quot;Trusted By&quot; Logo Row</h2>
<p><strong>BLOCKER P-12: Logos are PLAIN TEXT, not actual logos.</strong> &quot;INTEL&quot;, &quot;BANNER HEALTH&quot;, &quot;AMAZON&quot;, &quot;HONEYWELL&quot;, &quot;CHASE&quot; render as text strings in Barlow Condensed bold. Patrik specifically flagged this as an issue in previous rounds. These need to be actual company logos (SVG or PNG). Plain text logos look amateur and undermine credibility. This was called out before and is still not fixed.</p>
<ul>
<li>The &quot;TRUSTED BY&quot; label itself at 12px is fine as a kicker.</li>
<li>But the client names rendered as styled text instead of recognizable brand marks is a credibility killer.</li>
</ul>
<hr>
<h2>CTA Section (&quot;Get Started With A Free Quote&quot;)</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Large H2 at 64px, Barlow Condensed 700, white on navy. Commanding.</li>
<li>&quot;SEND MESSAGE&quot; red CTA button.</li>
<li>Dark navy background with good contrast.</li>
</ul>
<p><strong>No issues found.</strong> This section looks strong.</p>
<hr>
<h2>Trust / Start Here Section</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>&quot;START HERE&quot; kicker in red.</li>
<li>H2 &quot;STRAIGHT TALK, CLEAN EXECUTION, NO RUNAROUND&quot; at 40px, Barlow Condensed 700. Strong headline.</li>
<li>Body text: &quot;Tell us what you are building, fixing, or upgrading.&quot; Good copy.</li>
<li>Two CTAs: &quot;START THE CONVERSATION&quot; (red) and &quot;CALL DISPATCH&quot; (navy outline). Good.</li>
<li>Trust card: &quot;WHY TEAMS TRUST US&quot; with bullet points. Clean layout.</li>
<li>ROC #320923 credential displayed.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>WARNING W-7: &quot;WHY TEAMS TRUST US&quot; kicker at 11px.</strong> The kicker label inside the trust card is at 11px. Consistent with other kicker sizing but still below minimum.</p>
<hr>
<h2>Careers Section</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>&quot;JOIN THE CREW&quot; kicker in red.</li>
<li>H2 &quot;BUILD YOUR CAREER WITH PEOPLE WHO CARE ABOUT CRAFT&quot; on dark navy bg, white text.</li>
<li>Three role cards: HVAC Technician, Service Manager, HVAC Design Engineer.</li>
<li>Chips: EXPERIENCED, SENIOR, TEMPE AZ. Consistent styling.</li>
<li>&quot;SHOW ALL ROLES (6)&quot; button.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>BLOCKER P-13: Career role chips at 11px.</strong> The level/location chips (EXPERIENCED, SENIOR, TEMPE AZ) on career cards render at 11px. Same floor violation as everywhere else.</p>
<p><strong>WARNING W-8: &quot;TAP FOR DETAILS&quot; on career cards at 11px.</strong> Same as project cards. Needs bump.</p>
<hr>
<h2>FAQ Section</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>&quot;COMMON QUESTIONS&quot; kicker in red.</li>
<li>H2 &quot;FREQUENTLY ASKED QUESTIONS&quot; at 40px, Barlow Condensed 700, navy.</li>
<li>Accordion-style questions with + expand icons.</li>
<li>Clean card-based layout with subtle borders.</li>
</ul>
<p><strong>No major issues.</strong> FAQ looks clean and functional.</p>
<hr>
<h2>Footer</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Four-column layout: brand, Quick Links, Services, Contact.</li>
<li>Phone, email, location displayed.</li>
<li>Social icons (Facebook, LinkedIn, Instagram).</li>
<li>ROC #320923 credential.</li>
<li>Privacy Policy and Cookie Preferences links.</li>
<li>Red accent line at top of footer (brand divider).</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>WARNING W-9: Footer copyright and links at 12px.</strong> &quot;2026 Ambition Mechanical. All rights reserved&quot; at 12px and Privacy Policy/Cookie Preferences at 12px. This is standard footer sizing and not a blocker, but it&#39;s technically below Steffen&#39;s floor.</p>
<hr>
<h2>Contact Drawer (Desktop)</h2>
<p><strong>What&#39;s right:</strong></p>
<ul>
<li>Drawer opens from right side, overlaying content. Good UX pattern.</li>
<li>&quot;PROJECT SNAPSHOT&quot; heading in proper brand typography.</li>
<li>Form fields: property type, service needed, select size, timeline, planning stage.</li>
<li>&quot;Call Dispatch&quot; and contact method buttons (Email Team, Text, Reply) at top.</li>
<li>Step progress indicator (1/3).</li>
<li>&quot;CONTINUE&quot; red CTA button.</li>
</ul>
<p><strong>What&#39;s wrong:</strong></p>
<p><strong>BLOCKER P-14: Contact drawer does NOT open on mobile.</strong> The &quot;GET A QUOTE&quot; button in the hero is not visible/clickable on mobile (390px). Playwright could not find or click it. The hamburger menu exists but the quote button appears to be hidden behind <code>hidden sm:inline-flex</code>. On mobile, the only way to get a quote is through the hero CTA, but if that button is hidden, mobile users have NO way to contact. This is a conversion killer. The mobile hero does show &quot;GET A QUOTE&quot; as a full-width button, but the contact drawer itself failed to open via click. Needs testing.</p>
<hr>
<h2>Color Accuracy vs Brand Spec</h2>
<p><strong>Verified correct:</strong></p>
<ul>
<li>Navy-950 backgrounds: rgb(10, 14, 42). Correct.</li>
<li>Navy-800 backgrounds: rgb(17, 22, 56). Correct.</li>
<li>Navy text color on light sections: rgb(26, 35, 126). Correct navy-600.</li>
<li>White (#fff) for text on dark backgrounds. Correct.</li>
<li>Red-500 for CTAs and accents. Correct.</li>
<li>Neutral-50 for light sections: rgb(248, 250, 252). Correct.</li>
<li>White for alternating light sections. Correct.</li>
<li>Section alternation rhythm: white &gt; neutral-50 &gt; white &gt; white &gt; navy-900 &gt; navy-800 &gt; neutral-50 &gt; navy-900 &gt; neutral-50. Good dark/light rhythm.</li>
</ul>
<p><strong>No legacy color tokens detected in rendered output.</strong> The dark-<em>/accent-</em>/secondary-* migration appears complete.</p>
<hr>
<h2>Typography Accuracy vs Brand Spec</h2>
<p><strong>Verified correct:</strong></p>
<ul>
<li>H1: Barlow Condensed, 96px desktop / 44px mobile, weight 800, uppercase, tracking 3.84px. Matches spec.</li>
<li>H2: Barlow Condensed, 40px desktop / 28px mobile, weight 700, uppercase, tracking 0.8px. Matches spec.</li>
<li>H3: Barlow Condensed, 22px desktop / 20px mobile, weight 600, uppercase. Matches spec.</li>
<li>Body text: Inter (font-body). Correct.</li>
<li>Section kickers: 13px, uppercase, red. Correct.</li>
</ul>
<p><strong>Fonts loaded:</strong> Barlow Condensed (600, 700, 800) + Inter (400, 500, 600). All weights present.</p>
<hr>
<h2>Patterns</h2>
<p>Three pattern elements detected:</p>
<ol>
<li><code>pattern-snowflake</code> at 4% opacity on hero. Correct per Steffen&#39;s spec.</li>
<li><code>pattern-hex</code> at 4% opacity on a dark section. Good.</li>
<li><code>pattern-snowflake</code> at 5% opacity on another section. Good.</li>
</ol>
<p><strong>No industrial patterns (blueprint, crosshatch, diagonal, ductwork, piperun) detected in rendered page.</strong> Bobby added the CSS classes to index.css but none of them are being used in the actual components. The 5 new industrial patterns are defined but not applied anywhere. This is not a blocker for launch but represents unused work.</p>
<hr>
<h2>Links</h2>
<p>All internal links return 200. No broken links detected.</p>
<p>Pages verified working:</p>
<ul>
<li>/ (home) - 200</li>
<li>/about - 200</li>
<li>/services - 200</li>
<li>/projects - 200</li>
<li>/careers - 200</li>
<li>/markets - 200</li>
<li>/privacy - 200</li>
</ul>
<p>Tel and mailto links present and correctly formatted.</p>
<hr>
<h2>Mobile-Specific Issues (Patrik&#39;s Previous Flags)</h2>
<table>
<thead>
<tr>
<th>Issue Patrik Flagged</th>
<th>Status</th>
<th>Verdict</th>
</tr>
</thead>
<tbody><tr>
<td>Projects section swipe bugs</td>
<td>NOT FIXED. Cards stack vertically, no swipe. Page is 11,855px tall on iPhone.</td>
<td>FAIL</td>
</tr>
<tr>
<td>Tiny text</td>
<td>PARTIALLY FIXED. Headings are now strong. But kickers, chips, labels, and card descriptions still under 14px on mobile.</td>
<td>FAIL</td>
</tr>
<tr>
<td>Weak headings</td>
<td>FIXED. H1 at 44px, H2 at 28px on mobile. Barlow Condensed, bold weights. Commanding.</td>
<td>PASS</td>
</tr>
<tr>
<td>Plain text logos</td>
<td>NOT FIXED. Intel, Banner Health, Amazon, Honeywell, Chase still rendered as plain text.</td>
<td>FAIL</td>
</tr>
</tbody></table>
<hr>
<h2>Tap Targets</h2>
<p>Several interactive elements below 44px minimum:</p>
<ul>
<li>Nav logo link: 168x28px (height too small)</li>
<li>Nav links: 73-118px wide x 37px tall (height under 44px)</li>
<li>&quot;GET A QUOTE&quot; nav button: 123x40px (height under 44px)</li>
<li>Footer phone/email links: 274x20px (way too short)</li>
<li>Footer Privacy Policy: 79x16px (way too short)</li>
<li>Cookie Preferences button: 112x16px (way too short)</li>
<li>&quot;Essential Only&quot; cookie button: 137x42px (just under)</li>
</ul>
<p>The nav items and footer links are the worst offenders. The footer links at 16-20px height are nearly impossible to tap accurately on mobile.</p>
<hr>
<h2>No Horizontal Overflow</h2>
<p>Mobile body width matches viewport (390px = 390px). No horizontal scroll. Good.</p>
<hr>
<h2>Summary: Blockers for Bobby</h2>
<h3>Must Fix (14 Blockers)</h3>
<ol>
<li><strong>P-1: Page load 9 seconds.</strong> FCP/LCP at ~9s is unacceptable. Investigate preloader timing.</li>
<li><strong>P-2: Firebase permissions error.</strong> Site settings fetch failing on every load.</li>
<li><strong>P-3: Hero stat labels at 11px mobile.</strong> Bump to 12px minimum.</li>
<li><strong>P-4: Service card descriptions at 14px mobile.</strong> Bump to 15-16px.</li>
<li><strong>P-5: Card kicker labels at 12px.</strong> Bump to 13px minimum.</li>
<li><strong>P-6: Market card chips at 11px mobile.</strong> Bump to 12px minimum.</li>
<li><strong>P-7: Card descriptions at 14px mobile.</strong> Global fix needed for <code>content-card-description</code>.</li>
<li><strong>P-8: &quot;TAP FOR DETAILS&quot; at 11px.</strong> Bump to 13px.</li>
<li><strong>P-9: Project card chips at 11px mobile.</strong> Bump to 12px minimum.</li>
<li><strong>P-10: Testimonial attribution at 12px.</strong> Bump to 13px.</li>
<li><strong>P-11: Standalone stat labels at 12px.</strong> Bump to 13-14px.</li>
<li><strong>P-12: Client logos are PLAIN TEXT.</strong> Need actual logo images. Patrik flagged this before.</li>
<li><strong>P-13: Career role chips at 11px.</strong> Bump to 12px minimum.</li>
<li><strong>P-14: Contact drawer not opening on mobile.</strong> Mobile users cannot submit a quote.</li>
</ol>
<h3>Warnings (9)</h3>
<ol>
<li>W-1: Google Analytics not collecting data.</li>
<li>W-2: StatBar labels tiny on mobile.</li>
<li>W-3: All service images are placeholders.</li>
<li>W-4: All project images are placeholders.</li>
<li>W-5: Projects not swipeable on mobile. Page height extreme.</li>
<li>W-6: Testimonial section readability on mobile needs verification.</li>
<li>W-7: Trust card kicker at 11px.</li>
<li>W-8: Career &quot;TAP FOR DETAILS&quot; at 11px.</li>
<li>W-9: Footer text at 12px.</li>
</ol>
<h3>What&#39;s Actually Good</h3>
<ul>
<li>Hero is strong. Video background works. Headline commands attention.</li>
<li>Color migration is complete. No legacy tokens in rendered output.</li>
<li>Typography system is correct (Barlow Condensed + Inter, right weights).</li>
<li>Section rhythm (dark/light alternation) looks professional.</li>
<li>All internal links work. No broken pages.</li>
<li>No horizontal overflow on mobile.</li>
<li>CTA section is powerful.</li>
<li>Trust section copy and layout are solid.</li>
<li>FAQ is clean.</li>
<li>Industrial patterns are defined in CSS (ready to deploy where needed).</li>
</ul>
<h3>The Core Problem</h3>
<p>Bobby did a solid job on the token migration and the macro layout. The bones are right. But there&#39;s a systematic minimum-size violation across the entire site. Every kicker, chip, label, and card description is 1-4px too small. This is a global CSS fix, not a per-component hunt. Update these classes once and it fixes 10+ blockers:</p>
<ul>
<li><code>content-card-kicker</code>: 12px -&gt; 13px</li>
<li><code>content-card-chip</code>: 12px desktop / 11px mobile -&gt; 13px / 12px</li>
<li><code>content-card-description</code>: 14px mobile -&gt; 16px</li>
<li><code>card-cta-muted</code>: 11px -&gt; 13px</li>
<li><code>section-kicker</code>: 13px (this one&#39;s fine)</li>
<li>Hero stat labels: 11px -&gt; 12px mobile</li>
<li>Stat bar labels: 12px -&gt; 13px</li>
</ul>
<p>Plus the two structural blockers: page load time and the mobile contact drawer.</p>
<p>And the two content blockers: plain text logos and placeholder images.</p>
<hr>
<p><strong>This is not DROP DEAD GORGEOUS yet. It&#39;s &quot;solid bones with finishing problems.&quot; Fix the text sizes globally, fix the load time, fix the mobile contact drawer, and get real logos in there. Then we talk gorgeous.</strong></p>
<hr>
<h2>Screenshots Reference</h2>
<p>All saved to <code>/Users/patrik/Documents/Dev/AOM-EA/projects/bobby/double-check/</code>:</p>
<ul>
<li><code>ambition-v2-desktop-1440-full.png</code></li>
<li><code>ambition-v2-laptop-1280-full.png</code></li>
<li><code>ambition-v2-tablet-768-full.png</code></li>
<li><code>ambition-v2-iphone14-390-full.png</code></li>
<li><code>ambition-v2-iphoneSE-375-full.png</code></li>
<li><code>ambition-v2-hero-desktop.png</code></li>
<li><code>ambition-v2-services-desktop.png</code></li>
<li><code>ambition-v2-markets-desktop.png</code></li>
<li><code>ambition-v2-projects-desktop.png</code></li>
<li><code>ambition-v2-testimonials-desktop.png</code></li>
<li><code>ambition-v2-cta-desktop.png</code></li>
<li><code>ambition-v2-careers-desktop.png</code></li>
<li><code>ambition-v2-faq-desktop.png</code></li>
<li><code>ambition-v2-footer-desktop.png</code></li>
<li><code>ambition-v2-hero-mobile.png</code></li>
<li><code>ambition-v2-stats-mobile.png</code></li>
<li><code>ambition-v2-services-mobile.png</code></li>
<li><code>ambition-v2-projects-mobile.png</code></li>
<li><code>ambition-v2-testimonials-mobile.png</code></li>
<li><code>ambition-v2-cta-mobile.png</code></li>
<li><code>ambition-v2-contact-drawer-desktop.png</code></li>
</ul>
`,c={title:t,slug:e,category:o,agent:n,date:i,dateFormatted:r,updated:null,summary:l,tags:s,content:a};export{n as agent,o as category,a as content,i as date,r as dateFormatted,c as default,e as slug,l as summary,s as tags,t as title,d as updated};
