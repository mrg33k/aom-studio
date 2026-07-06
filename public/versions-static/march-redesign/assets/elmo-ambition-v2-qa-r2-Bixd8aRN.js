const t="Ambition Brand v2 QA: Round 2",e="elmo-ambition-v2-qa-r2",n="Audits",o="Elmo",i="2026-03-09",s="Mar 9",l=null,r="Second QA round following 14 blockers and 9 warnings from Round 1.",d=[],a=`<h1>Elmo QA Report: Ambition v2 Round 2</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>URL:</strong> <a href="https://ambition-teal.vercel.app">https://ambition-teal.vercel.app</a>
<strong>Previous round:</strong> 14 blockers, 9 warnings
<strong>This round verdict:</strong> DOES NOT PASS. 8 blockers remain (6 old, 2 new). 7 warnings. Progress was made but this is not shipping yet.</p>
<hr>
<h2>What Bobby Fixed (Verified)</h2>
<table>
<thead>
<tr>
<th>R1 Blocker</th>
<th>Status</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>P-1: 9-second page load</td>
<td>FIXED</td>
<td>DOM Content Loaded now 287ms desktop, 400ms mobile. The 9s preloader is gone. Performance is solid.</td>
</tr>
<tr>
<td>P-3: Hero stat labels 11px mobile</td>
<td>PARTIALLY FIXED</td>
<td>Desktop bumped to 12px via <code>sm:text-xs</code>. Mobile still 11px via <code>text-[11px]</code>. Mobile minimum is 12px. Still fails.</td>
</tr>
<tr>
<td>P-12: Client logos plain text</td>
<td>NOT FIXED</td>
<td>Intel, Banner Health, Amazon, Honeywell, Chase still render as plain text in Barlow Condensed. No SVGs, no images. Zero logo assets. Same as R1.</td>
</tr>
<tr>
<td>P-14: Contact drawer not opening on mobile</td>
<td>FIXED</td>
<td>Drawer opens on both desktop and mobile. &quot;GET A QUOTE&quot; button is visible at 358x56px on mobile. Drawer contains full form: Project Snapshot step 1/3, service select, facility size, timeline, contact method. Verified working.</td>
</tr>
<tr>
<td>Footer tap targets</td>
<td>IMPROVED</td>
<td>Footer link items (About, Projects, Careers, Contact, Services) are now 44px height. Good. Phone/email/privacy links still under 44px.</td>
</tr>
</tbody></table>
<p><strong>Score: 3 of 14 R1 blockers fully resolved. 1 partially. 1 not touched.</strong></p>
<p>Bobby focused on the two structural blockers (load time and contact drawer) and those are both solid fixes. But the text sizing and logo issues were barely touched.</p>
<hr>
<h2>Performance</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>R1</th>
<th>R2</th>
<th>Grade</th>
</tr>
</thead>
<tbody><tr>
<td>DOM Content Loaded</td>
<td>8,717ms</td>
<td>287ms</td>
<td>PASS</td>
</tr>
<tr>
<td>Wall Clock Load</td>
<td>~9s</td>
<td>~2.5s (domcontentloaded)</td>
<td>PASS</td>
</tr>
<tr>
<td>First Contentful Paint</td>
<td>8,792ms</td>
<td>&lt;500ms</td>
<td>PASS</td>
</tr>
<tr>
<td>Total Page Height (mobile)</td>
<td>11,855px</td>
<td>11,855px</td>
<td>WARN</td>
</tr>
<tr>
<td>Resource Count</td>
<td>30</td>
<td>7 (initial)</td>
<td>PASS</td>
</tr>
</tbody></table>
<p>The networkidle timeout at 30s is from long-lived Firestore connections, not actual load blocking. The page renders fast. Users see content within 500ms. This is a massive improvement.</p>
<p><strong>Note:</strong> The <code>networkidle</code> never fires because of persistent Firestore listener connections. This is not a user-facing issue but Bobby should consider lazy-loading Firebase to prevent the hanging connection.</p>
<hr>
<h2>NEW BLOCKER: Scroll-Reveal Opacity Bug</h2>
<p><strong>BLOCKER NB-1: All sections below the hero start at near-zero opacity (0.0000084 to 0.035) and only become visible after scrolling.</strong></p>
<p>This is the single biggest issue on the site right now.</p>
<p>The <code>scroll-reveal will-animate</code> classes set sections to near-zero opacity on initial load. They only animate in when scrolled into view via IntersectionObserver. This means:</p>
<ul>
<li>If a user loads the page and scrolls fast, sections flash in visibly</li>
<li>Playwright full-page screenshots capture invisible sections (blank white space)</li>
<li>Google&#39;s crawler may see a mostly-empty page, killing SEO</li>
<li>The hero section has <code>is-visible</code> class and renders at opacity 1. Every other section does not.</li>
</ul>
<p>The animation easing appears to be working when you scroll naturally, but the initial state is essentially invisible content. The opacity values I measured:</p>
<ul>
<li>Section 0 (Hero): opacity 1.0 (correct, has <code>is-visible</code>)</li>
<li>Section 1 (Services): opacity 0.0000084</li>
<li>Sections 2-9: opacity 0.035</li>
</ul>
<p><strong>Fix:</strong> Set initial opacity to something visible (like 0.15-0.2) or use <code>transform: translateY(20px)</code> for the reveal animation instead of opacity. OR add <code>noscript</code> fallbacks. OR trigger all reveals immediately for crawlers. The scroll-reveal should enhance the experience, not hide the content.</p>
<hr>
<h2>Text Sizing: Still Systematically Failing</h2>
<h3>Desktop Violations (&lt; 13px minimum)</h3>
<p>157 elements under 13px on desktop. The classes that need global fixes:</p>
<table>
<thead>
<tr>
<th>CSS Class</th>
<th>Current Size</th>
<th>Required</th>
<th>Count</th>
</tr>
</thead>
<tbody><tr>
<td><code>content-card-kicker</code></td>
<td>12px</td>
<td>13px</td>
<td>~20 instances</td>
</tr>
<tr>
<td><code>content-card-chip</code></td>
<td>12px</td>
<td>13px</td>
<td>~30 instances</td>
</tr>
<tr>
<td><code>card-cta-muted</code></td>
<td>11px</td>
<td>13px</td>
<td>~15 instances</td>
</tr>
<tr>
<td>Hero stat labels (<code>sm:text-xs</code>)</td>
<td>12px</td>
<td>13px</td>
<td>4 instances</td>
</tr>
<tr>
<td>Stat bar labels (<code>text-xs</code>)</td>
<td>12px</td>
<td>13px</td>
<td>4 instances</td>
</tr>
</tbody></table>
<h3>Mobile Violations (&lt; 12px minimum)</h3>
<p>109 elements under 12px on mobile:</p>
<table>
<thead>
<tr>
<th>CSS Class</th>
<th>Current Size</th>
<th>Required</th>
<th>Count</th>
</tr>
</thead>
<tbody><tr>
<td><code>content-card-chip</code></td>
<td>11px</td>
<td>12px</td>
<td>~30 instances</td>
</tr>
<tr>
<td><code>card-cta-muted</code></td>
<td>11px</td>
<td>12px</td>
<td>~15 instances</td>
</tr>
<tr>
<td>Hero stat labels (<code>text-[11px]</code>)</td>
<td>11px</td>
<td>12px</td>
<td>4 instances</td>
</tr>
</tbody></table>
<p><strong>BLOCKER B-1 (carried from R1): <code>card-cta-muted</code> at 11px across all viewports.</strong> &quot;TAP FOR DETAILS&quot; is a call to action rendered at 11px. This is fine print, not an invitation. Bump to 13px desktop, 12px mobile minimum.</p>
<p><strong>BLOCKER B-2 (carried from R1): <code>content-card-chip</code> at 11px mobile.</strong> Every chip tag (MEDICAL HVAC, VENTILATION, RELIABILITY, COMMERCIAL HVAC, etc.) is at 11px on mobile. Bump to 12px.</p>
<p><strong>BLOCKER B-3 (carried from R1): <code>content-card-kicker</code> at 12px desktop.</strong> Kickers like BUILD, UPGRADE, UPTIME, MARKET FOCUS, COMMERCIAL are all at 12px. Steffen&#39;s spec says 13px minimum for desktop. Bump to 13px.</p>
<p><strong>BLOCKER B-4 (carried from R1): Hero stat labels at 11px mobile.</strong> The class <code>text-[11px] sm:text-xs</code> means mobile gets 11px, desktop gets 12px. Both need a bump: mobile to 12px, desktop to 13px.</p>
<h3>The Fix Is Simple</h3>
<p>These are 4 CSS class definitions. Change them once, fix ~157 desktop violations and ~109 mobile violations in one shot:</p>
<pre><code>content-card-kicker: text-[12px] -&gt; text-[13px]
content-card-chip: text-[12px] (desktop) / text-[11px] (mobile) -&gt; text-[13px] / text-[12px]
card-cta-muted: text-[11px] -&gt; text-[13px] sm:text-sm
stat labels: text-[11px] sm:text-xs -&gt; text-xs sm:text-[13px]
</code></pre>
<hr>
<h2>Client Logos: Still Plain Text</h2>
<p><strong>BLOCKER B-5 (carried from R1, P-12): &quot;INTEL&quot;, &quot;BANNER HEALTH&quot;, &quot;AMAZON&quot;, &quot;HONEYWELL&quot;, &quot;CHASE&quot; are rendered as styled text, not logo images.</strong></p>
<p>No SVG elements, no img elements in the Trusted By section. Zero logo assets loaded. The text is in Barlow Condensed bold, which is the site&#39;s heading font, not the clients&#39; brand fonts. This looks like a placeholder that shipped.</p>
<p>This was flagged in R1. Bobby said he &quot;replaced plain text client logos with SVG brand wordmarks&quot; but the live site still shows plain text. Either the deploy didn&#39;t include this change or the implementation didn&#39;t land.</p>
<p>One <code>img[alt*=&quot;Intel&quot;]</code> element was detected elsewhere on the page but not in the Trusted By section itself.</p>
<hr>
<h2>Nav and Header</h2>
<p><strong>Nav text reads:</strong> &quot;AMBITION MECHANICAL&quot; with links: Home, About, What We Do, Projects, Careers + &quot;GET A QUOTE&quot; button.</p>
<p><strong>Issue:</strong> The nav says &quot;AMBITION MECHANICAL&quot;, not &quot;Ambition Mechanical Services&quot;. Bobby was asked to update to &quot;Ambition Mechanical Services&quot; but the word &quot;Services&quot; is missing.</p>
<p><strong>BLOCKER B-6: Nav brand text missing &quot;Services&quot;.</strong> Should read &quot;AMBITION MECHANICAL SERVICES&quot; per the instructions.</p>
<p><strong>Logo emblem:</strong> One SVG element detected in the header. This appears to be the red dot/emblem before the brand name. This is present and correct.</p>
<hr>
<h2>Contact Drawer (Both Viewports)</h2>
<p><strong>Desktop:</strong> Opens from right side. Contains:</p>
<ul>
<li>&quot;GET IN TOUCH&quot; header with &quot;AMBITION MECHANICAL&quot; branding</li>
<li>&quot;CLOSE&quot; button with X</li>
<li>Fast Direct Line section: Call Dispatch (red), Email Team, Text Reply</li>
<li>Step 1 of 3: Project Snapshot</li>
<li>Form fields: Service Needed, Facility Size, Timeline (ASAP / Within 30 Days / This Quarter / Planning Stage), Preferred Reply Method (Phone / Email / Text)</li>
<li>&quot;CONTINUE&quot; red CTA</li>
</ul>
<p><strong>Mobile:</strong> Full-screen drawer. Same content, properly sized for mobile. Button is 358px wide on mobile (full width minus padding). Good.</p>
<p><strong>Verdict: PASS.</strong> The drawer is functional, professional, and contains a real multi-step form. This was the R1 conversion killer and Bobby fixed it.</p>
<p><strong>Minor note:</strong> The drawer is dark-themed with solid navy backgrounds. Per Steffen&#39;s component review, this matches &quot;Option A: Keep it dark, lose the glass.&quot; The glassmorphism glow orbs appear to be gone. Inputs have solid backgrounds. This aligns with brand direction.</p>
<hr>
<h2>Section Spacing</h2>
<table>
<thead>
<tr>
<th>Section</th>
<th>Padding Top</th>
<th>Padding Bottom</th>
<th>Height</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Hero</td>
<td>0</td>
<td>0</td>
<td>860px (desktop), 820px (mobile)</td>
<td>Full viewport. Good.</td>
</tr>
<tr>
<td>Services</td>
<td>80px</td>
<td>80px</td>
<td>816px</td>
<td>Consistent</td>
</tr>
<tr>
<td>Markets</td>
<td>80px</td>
<td>80px</td>
<td>996px</td>
<td>Consistent</td>
</tr>
<tr>
<td>Projects</td>
<td>80px</td>
<td>80px</td>
<td>1071px</td>
<td>Consistent</td>
</tr>
<tr>
<td>Testimonials</td>
<td>80px</td>
<td>80px</td>
<td>736px</td>
<td>Consistent</td>
</tr>
<tr>
<td>Stats/Trusted</td>
<td>64px</td>
<td>64px</td>
<td>433px</td>
<td>Tighter. Intentional for data sections.</td>
</tr>
<tr>
<td>CTA</td>
<td>64px</td>
<td>64px</td>
<td>416px</td>
<td>Tighter. Intentional.</td>
</tr>
<tr>
<td>Trust/Start</td>
<td>80px</td>
<td>80px</td>
<td>530px</td>
<td>Consistent</td>
</tr>
<tr>
<td>Careers</td>
<td>64px</td>
<td>64px</td>
<td>817px</td>
<td>Consistent</td>
</tr>
<tr>
<td>FAQ</td>
<td>80px</td>
<td>80px</td>
<td>842px</td>
<td>Consistent</td>
</tr>
</tbody></table>
<p>Spacing is clean and systematic. Content sections get <code>py-20 md:py-28</code> (80px/112px). Data/CTA sections get <code>py-16 md:py-24</code> (64px/96px). This is a two-tier spacing system and it works. No complaints.</p>
<p>There&#39;s a 24px gap between hero and first section (884px top vs 860px height). This is likely the cookie banner height. Acceptable.</p>
<hr>
<h2>Footer Tap Targets</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Size</th>
<th>Verdict</th>
</tr>
</thead>
<tbody><tr>
<td>Footer brand logo link</td>
<td>168x28px</td>
<td>FAIL (under 44px)</td>
</tr>
<tr>
<td>About, Projects, Careers, Contact</td>
<td>274x44px</td>
<td>PASS</td>
</tr>
<tr>
<td>Service links</td>
<td>274x44px</td>
<td>PASS</td>
</tr>
<tr>
<td>Phone number link</td>
<td>274x20px</td>
<td>FAIL</td>
</tr>
<tr>
<td>Email link</td>
<td>274x20px</td>
<td>FAIL</td>
</tr>
<tr>
<td>Privacy Policy</td>
<td>79x16px</td>
<td>FAIL</td>
</tr>
<tr>
<td>Cookie Preferences</td>
<td>112x16px</td>
<td>FAIL</td>
</tr>
</tbody></table>
<p><strong>WARNING W-1: Footer phone/email at 20px height.</strong> These are contact links that mobile users tap. They need padding to reach 44px touch targets.</p>
<p><strong>WARNING W-2: Privacy Policy at 16px height.</strong> Legal links should still be tappable.</p>
<p>Bobby improved the main footer nav links to 44px. The contact info and legal links still need padding.</p>
<hr>
<h2>Console Errors</h2>
<ul>
<li><code>FirebaseError: Missing or insufficient permissions.</code> -- Fires on every page load, both viewports. Same as R1. Site settings fetch is failing.</li>
<li><code>Failed to load resource: 400</code> -- Mobile only, likely GA or Firestore related.</li>
<li>Google Analytics <code>net::ERR_ABORTED</code> -- GA collect requests still failing.</li>
</ul>
<p><strong>WARNING W-3: Firebase permissions error persists.</strong> Not user-facing (site uses fallback data) but means CMS changes won&#39;t reflect on the live site until Firestore rules are fixed.</p>
<p><strong>WARNING W-4: Google Analytics not collecting.</strong> Zero analytics data since launch.</p>
<hr>
<h2>Mobile-Specific</h2>
<table>
<thead>
<tr>
<th>Check</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Horizontal overflow</td>
<td>NONE. Body width = viewport width (390px). Good.</td>
</tr>
<tr>
<td>Page height</td>
<td>11,855px. Same as R1. Still extremely tall.</td>
</tr>
<tr>
<td>Hero CTA visibility</td>
<td>PASS. &quot;GET A QUOTE&quot; at 358x56px, prominent.</td>
</tr>
<tr>
<td>Contact drawer</td>
<td>PASS. Opens, full form works.</td>
</tr>
<tr>
<td>Cookie banner</td>
<td>Visible, buttons are readable.</td>
</tr>
</tbody></table>
<p><strong>WARNING W-5: Page still 11,855px on mobile.</strong> 20+ project cards stacking vertically creates an absurdly long page. A &quot;show more&quot; or horizontal carousel would cut this dramatically. Not a launch blocker but a bad mobile experience.</p>
<hr>
<h2>Color Accuracy</h2>
<p>Same as R1: all correct. Navy-950, navy-800, navy-600, red-500, neutral-50, white. No legacy tokens detected in rendered output. The token migration held.</p>
<hr>
<h2>Typography System</h2>
<p>Barlow Condensed (600, 700, 800) + Inter (400, 500, 600) all loading correctly. H1/H2/H3/body hierarchy is correct. The size violations are in the small utility classes (kickers, chips, labels), not in the heading/body system.</p>
<hr>
<h2>Patterns</h2>
<p>Snowflake and hex patterns still rendering at 4-5% opacity on dark sections. No new industrial patterns deployed. Same as R1.</p>
<hr>
<h2>What&#39;s Actually Good</h2>
<ul>
<li><strong>Performance is transformed.</strong> 9s to under 500ms FCP. Massive win.</li>
<li><strong>Contact drawer works on mobile.</strong> The conversion path is open. Biggest R1 fix.</li>
<li><strong>Section spacing is clean and systematic.</strong> Two-tier padding system. Professional.</li>
<li><strong>Color system is locked.</strong> No legacy tokens.</li>
<li><strong>Typography hierarchy is correct.</strong> Barlow Condensed headings are commanding.</li>
<li><strong>Video hero background works.</strong> Plays, loops, muted, readable overlay.</li>
<li><strong>Footer nav links are now 44px.</strong> Main improvement from R1.</li>
<li><strong>Dark/light section rhythm.</strong> Alternation looks polished.</li>
<li><strong>Drawer form is real.</strong> Multi-step, professional, not a placeholder.</li>
</ul>
<hr>
<h2>Summary: Blockers for Bobby (Round 3)</h2>
<h3>Must Fix (8 Blockers)</h3>
<ol>
<li><strong>NB-1: Scroll-reveal sections start invisible.</strong> Sections 1-9 render at near-zero opacity. SEO disaster. Users who scroll fast see content flash in. Fix the initial state.</li>
<li><strong>B-1: <code>card-cta-muted</code> at 11px.</strong> &quot;TAP FOR DETAILS&quot; is fine print. Bump to 13px.</li>
<li><strong>B-2: <code>content-card-chip</code> at 11px mobile.</strong> All chip tags under minimum. Bump to 12px mobile.</li>
<li><strong>B-3: <code>content-card-kicker</code> at 12px desktop.</strong> Kicker labels under 13px desktop minimum. Bump.</li>
<li><strong>B-4: Hero/stat labels at 11px mobile.</strong> <code>text-[11px]</code> needs to be <code>text-xs</code> (12px) minimum.</li>
<li><strong>B-5: Client logos still plain text.</strong> Intel, Banner Health, Amazon, Honeywell, Chase are styled text, not brand marks. This was flagged in R1 and reported as fixed. It is not fixed on the live site.</li>
<li><strong>B-6: Nav says &quot;AMBITION MECHANICAL&quot; not &quot;AMBITION MECHANICAL SERVICES&quot;.</strong> Missing &quot;Services&quot;.</li>
<li><strong>B-2 + B-3 + B-4 are really one fix.</strong> Update 4 CSS class definitions and 150+ violations disappear. This is a 10-minute fix.</li>
</ol>
<h3>Warnings (7)</h3>
<ol>
<li>W-1: Footer phone/email links at 20px height (under 44px tap target).</li>
<li>W-2: Privacy Policy / Cookie Preferences links at 16px height.</li>
<li>W-3: Firebase permissions error on every load.</li>
<li>W-4: Google Analytics not collecting data.</li>
<li>W-5: Mobile page height 11,855px (project cards stack vertically, no truncation).</li>
<li>W-6: All project/service images are still placeholder gradients.</li>
<li>W-7: <code>networkidle</code> never fires due to persistent Firestore connections.</li>
</ol>
<h3>Priority Order</h3>
<ol>
<li><strong>Scroll-reveal opacity</strong> (NB-1) -- This is the most urgent. Invisible content = invisible to Google.</li>
<li><strong>Text size global fix</strong> (B-1 through B-4) -- Four class changes, 10 minutes, 150+ fixes.</li>
<li><strong>Client logos</strong> (B-5) -- Either deploy the SVGs that were supposedly built, or create them.</li>
<li><strong>Nav text</strong> (B-6) -- One string change.</li>
</ol>
<hr>
<h2>The Verdict</h2>
<p>Bobby delivered on the two hardest R1 blockers: performance and the contact drawer. Both are solid fixes. The site loads fast and the conversion path works.</p>
<p>But the text sizing was reported as fixed and it was not. The logos were reported as SVG brand marks and they&#39;re still plain text. The nav was reported as updated and it&#39;s missing a word. And there&#39;s a new scroll-reveal bug that makes 90% of the page invisible on initial render.</p>
<p><strong>This is not DROP DEAD GORGEOUS. It&#39;s &quot;fast and functional with finishing problems.&quot; Fix the scroll reveal, fix the text sizes globally, deploy real logos, and add &quot;Services&quot; to the nav. Then we&#39;re talking.</strong></p>
<hr>
<h2>Screenshots Reference</h2>
<p>All saved to <code>/Users/patrik/Documents/Dev/AOM-EA/projects/bobby/double-check/</code>:</p>
<ul>
<li><code>elmo-ambition-r2-desktop-1440-full.png</code> (shows invisible sections bug)</li>
<li><code>elmo-ambition-r2-desktop-after-scroll.png</code> (shows all sections after scroll trigger)</li>
<li><code>elmo-ambition-r2-hero-desktop.png</code></li>
<li><code>elmo-ambition-r2-hero-mobile.png</code></li>
<li><code>elmo-ambition-r2-mobile-390-full.png</code></li>
<li><code>elmo-ambition-r2-tablet-768-full.png</code></li>
<li><code>elmo-ambition-r2-contact-drawer-desktop.png</code></li>
<li><code>elmo-ambition-r2-contact-drawer-mobile.png</code></li>
</ul>
`,c={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:s,updated:null,summary:r,tags:d,content:a};export{o as agent,n as category,a as content,i as date,s as dateFormatted,c as default,e as slug,r as summary,d as tags,t as title,l as updated};
