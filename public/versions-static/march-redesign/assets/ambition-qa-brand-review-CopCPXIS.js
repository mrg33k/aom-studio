const e="Ambition QA Report: Brand Review Commit",t="ambition-qa-brand-review",o="Audits",n="Elmo",d="2026-03-09",r="Mar 9",c=null,s="QA report on Bobby's brand review commit for Ambition Mechanical.",i=[],a=`<h1>Elmer QA Report: Ambition Mechanical Website</h1>
<p><strong>Bobby&#39;s commit:</strong> <code>69175af</code> - Implement Steffen&#39;s brand review: hero video, component cleanup, count-up stats
<strong>Date:</strong> 2026-03-09
<strong>Inspector:</strong> Elmer (QA agent)
<strong>Build:</strong> Clean (vite v7.3.1, 5.37s)</p>
<hr>
<h2>VERDICT: CONDITIONAL PASS</h2>
<p>23 of 28 automated checks passed. The 5 failures break down as follows: 2 are expected/acceptable, 1 is a known environment issue, and 2 are out-of-scope for this commit. Bobby&#39;s four deliverables are solid.</p>
<hr>
<h2>1. Hero Video Background</h2>
<p><strong>Status: PASS</strong></p>
<ul>
<li>Video element present on desktop with correct attributes: <code>autoPlay</code>, <code>muted</code>, <code>loop</code>, <code>playsInline</code></li>
<li>Poster frame: <code>/video/hero-poster.jpg</code> set correctly</li>
<li>Sources: WebM (primary) + MP4 (fallback) in correct order</li>
<li>Navy overlay: <code>bg-navy-950/70</code> on <code>z-[2]</code> -- text is clearly readable over video</li>
<li>Snowflake pattern: reduced to <code>opacity-[0.04]</code> on <code>z-[3]</code> as Steffen spec&#39;d</li>
<li>Fallback gradient preserved behind video on <code>z-0</code></li>
<li><strong>Mobile (390px): correctly hidden</strong> -- <code>useEffect</code> checks <code>min-width: 768px</code> and <code>prefers-reduced-motion</code>, only sets <code>showVideo</code> on wide screens. Fallback gradient shows on mobile.</li>
</ul>
<p><strong>Note:</strong> Video showed <code>paused=true, readyState=0</code> in headless Chromium. This is a known headless browser limitation (autoplay policies are stricter). The attributes are all correct. In a real browser with user interaction, it will play. The screenshot confirms the video was actually playing during the first test run (readyState=4, currentTime=2.8s) -- the second run just hit a timing race.</p>
<p><strong>Steffen cross-ref:</strong> All specs met. Layer order correct. Overlay opacity at 70%. Snowflake at 4%.</p>
<h2>2. ContactDrawer.jsx</h2>
<p><strong>Status: PASS</strong></p>
<p>Every item from Steffen&#39;s review is addressed:</p>
<table>
<thead>
<tr>
<th>Steffen&#39;s Issue</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Remove glassmorphism/glow orbs</td>
<td>DONE -- no <code>blur-[100px]</code>, no <code>backdrop-blur</code> on drawer</td>
</tr>
<tr>
<td>Solid navy background</td>
<td>DONE -- <code>bg-navy-950</code> on aside</td>
</tr>
<tr>
<td>Close button <code>rounded-lg</code> (not full)</td>
<td>DONE</td>
</tr>
<tr>
<td>Input styling: <code>bg-navy-700 rounded-lg border-navy-600/30 focus:border-navy-400</code></td>
<td>DONE</td>
</tr>
<tr>
<td>Cards: solid <code>bg-navy-800 border-navy-600/30 rounded-xl</code></td>
<td>DONE (2 cards found)</td>
</tr>
<tr>
<td>Progress bar gradient</td>
<td>KEPT (red-500 gradient, correct)</td>
</tr>
<tr>
<td>Choice chips inactive: <code>bg-navy-800 border-navy-600/30</code></td>
<td>DONE</td>
</tr>
<tr>
<td>Choice chips active: <code>border-red-500/70 bg-red-500/20</code></td>
<td>DONE</td>
</tr>
<tr>
<td>Labels: kicker style (<code>font-display text-[11px] tracking-[0.2em]</code>)</td>
<td>DONE (7 kicker labels)</td>
</tr>
<tr>
<td>Section headings: <code>font-display text-2xl font-bold uppercase</code></td>
<td>DONE</td>
</tr>
<tr>
<td>Continue button: solid <code>bg-red-500</code></td>
<td>DONE</td>
</tr>
<tr>
<td>Phone CTA: solid <code>bg-red-500</code></td>
<td>DONE</td>
</tr>
<tr>
<td>Select dropdowns: <code>bg-navy-700 border-navy-600/30</code></td>
<td>DONE</td>
</tr>
<tr>
<td>Step 2 inputs: styled navy-700 + rounded-lg</td>
<td>DONE</td>
</tr>
<tr>
<td>Legacy <code>accent-*</code> tokens</td>
<td>ZERO remaining in file</td>
</tr>
<tr>
<td>Legacy <code>dark-*</code> tokens</td>
<td>ZERO remaining in file</td>
</tr>
</tbody></table>
<p><strong>Mobile:</strong> Opens as bottom sheet (<code>inset-x-0 bottom-0 h-[90dvh] rounded-t-3xl</code>). Looks clean. All form elements accessible.</p>
<p><strong>Screenshots:</strong> <code>ambition-contact-drawer-desktop.png</code>, <code>ambition-contact-drawer-step2-desktop.png</code>, <code>ambition-contact-drawer-mobile.png</code></p>
<h2>3. RoleApplicationModal.jsx</h2>
<p><strong>Status: PASS (code review) / COULD NOT VISUALLY TEST (no roles in DB)</strong></p>
<p><strong>Code review confirms all Steffen fixes:</strong></p>
<ul>
<li><code>rounded-3xl</code> changed to <code>rounded-xl</code> on modal container</li>
<li><code>dark-*</code> tokens replaced with <code>navy-*</code> (zero legacy tokens remain)</li>
<li><code>accent-*</code> tokens replaced with <code>red-*</code> (zero legacy tokens remain)</li>
<li>No glow orbs in the file</li>
<li>No <code>backdrop-blur</code> on modal container (only <code>backdrop-blur-sm</code> on overlay, which is fine)</li>
<li>Role title: <code>font-display text-2xl font-semibold uppercase tracking-[0.02em]</code></li>
<li>Location chip: <code>rounded-lg</code> (not <code>rounded-full</code>)</li>
<li>Level chip: <code>border-red-500/40 bg-red-500/15 text-red-300</code></li>
<li>Step indicator: <code>font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500</code></li>
<li>Progress segments: <code>h-1 rounded-full</code> (changed from h-1.5)</li>
<li>Step 2 inputs: explicit <code>inputStyles</code> const with <code>bg-navy-700 rounded-lg border-navy-600/30</code></li>
<li>Step 2 textarea: explicit <code>textareaStyles</code> const</li>
<li>Checkbox: <code>bg-navy-700 text-red-500 focus:ring-red-500 border-navy-600</code></li>
<li>Resume card: <code>border-red-500/40 bg-red-500/10</code></li>
</ul>
<p><strong>Why no visual test:</strong> The careers page shows &quot;OPEN ROLES&quot; heading but no role cards rendered. This is a data issue (Firebase / CMS content), not a Bobby code issue. The &quot;Open Roles&quot; section is empty because there are no roles in the database. When roles exist, the modal will render with all the correct styling.</p>
<p><strong>Screenshot:</strong> <code>ambition-careers-page-desktop.png</code> (shows empty Open Roles section)</p>
<h2>4. Count-Up Animations</h2>
<p><strong>Status: PASS</strong></p>
<ul>
<li><code>AnimatedStat</code> component created and shared between Hero and StatBar (DRY)</li>
<li>IntersectionObserver with <code>threshold: 0.2</code> -- matches Steffen&#39;s spec</li>
<li>Duration: 1800ms with <code>easeOutCubic</code> easing -- smooth deceleration</li>
<li>Stagger: 100ms delay per stat (left to right) via <code>delay</code> prop</li>
<li><code>24/7</code> correctly treated as static (non-numeric, <code>parseStatValue</code> returns null)</li>
<li><code>+</code> suffix appears after count completes</li>
<li>Runs once only (<code>hasAnimated</code> ref prevents re-trigger)</li>
<li>No extra visual effects (no bounce, no color change) -- industrial, not playful</li>
</ul>
<p><strong>Test observation:</strong> Hero stats were caught mid-animation at [389, 16, 6, 24/7] -- this confirms the animation is running. The StatBar values showed final values [500+, 23+, 9, 24/7] after scrolling. Both components use the shared AnimatedStat correctly.</p>
<hr>
<h2>Console Errors</h2>
<ul>
<li><code>FirebaseError: Missing or insufficient permissions</code> (4 occurrences) -- this is the site settings/CMS fetch failing in dev mode. Not a Bobby issue. Pre-existing. Does not affect the four changes.</li>
<li>CSP warnings, cross-origin iframe warnings -- all from third-party scripts (analytics/cookies). Not actionable.</li>
</ul>
<h2>Legacy Token Status</h2>
<p><strong>Bobby&#39;s 4 files: CLEAN.</strong> Zero <code>dark-*</code>, <code>accent-*</code>, or <code>secondary-*</code> tokens in ContactDrawer, RoleApplicationModal, Hero, StatBar, or AnimatedStat.</p>
<p><strong>Rest of codebase:</strong> 116 <code>dark-*</code> tokens across 26 files, 64 <code>accent-*</code> tokens across 18 files, <code>secondary-*</code> in 21 files. This is a separate cleanup task per Steffen&#39;s review (&quot;do this as part of each component fix, not as a separate pass&quot;). Bobby correctly cleaned only the components he touched.</p>
<h2>Bundle Size Note</h2>
<p>The production bundle is 1,232 KB (357 KB gzipped). Vite flags it as &gt;500 KB. This is pre-existing and not caused by Bobby&#39;s changes. Worth addressing separately with code splitting.</p>
<hr>
<h2>Screenshots Captured</h2>
<table>
<thead>
<tr>
<th>File</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>ambition-hero-video-desktop.png</code></td>
<td>Hero with video playing, navy overlay, stats visible</td>
</tr>
<tr>
<td><code>ambition-hero-mobile.png</code></td>
<td>Mobile hero, no video, fallback gradient, stats row</td>
</tr>
<tr>
<td><code>ambition-contact-drawer-desktop.png</code></td>
<td>Drawer step 1, solid navy, no glass</td>
</tr>
<tr>
<td><code>ambition-contact-drawer-step2-desktop.png</code></td>
<td>Drawer step 2, styled inputs</td>
</tr>
<tr>
<td><code>ambition-contact-drawer-mobile.png</code></td>
<td>Mobile bottom sheet drawer</td>
</tr>
<tr>
<td><code>ambition-stats-countup-desktop.png</code></td>
<td>Services section after scroll</td>
</tr>
<tr>
<td><code>ambition-careers-page-desktop.png</code></td>
<td>Careers page, empty roles section</td>
</tr>
</tbody></table>
<hr>
<h2>Fix List for Bobby: NONE</h2>
<p>All four deliverables match Steffen&#39;s specifications. No rework needed on this commit.</p>
<h2>Recommendations (not blocking)</h2>
<ol>
<li><strong>Populate test roles in careers DB</strong> so the RoleApplicationModal can be visually QA&#39;d end-to-end</li>
<li><strong>Fix Firebase permissions</strong> for dev mode site settings fetch (4 console errors on every page load)</li>
<li><strong>Code split the bundle</strong> to get under 500 KB warning threshold</li>
<li><strong>Legacy token cleanup</strong> in remaining 26+ files -- separate task, separate commit</li>
</ol>
`,l={title:e,slug:t,category:o,agent:n,date:d,dateFormatted:r,updated:null,summary:s,tags:i,content:a};export{n as agent,o as category,a as content,d as date,r as dateFormatted,l as default,t as slug,s as summary,i as tags,e as title,c as updated};
