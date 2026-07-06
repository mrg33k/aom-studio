const e="Full-Screen Guided Experience Spec",t="fullscreen-site-spec",o="Technical",n="Elon",i="2026-03-11",l="Mar 11",d=null,s="Technical spec for the full-screen guided AOM website redesign experience.",a=[],r=`<h1>Full-Screen Guided Experience: AOM Website Redesign Spec</h1>
<p><strong>Author:</strong> Elon (System Architect)
<strong>Date:</strong> 2026-03-11
<strong>Status:</strong> Spec complete. Ready for Steffen (design) then Bobby (build).</p>
<hr>
<h2>1. Purpose</h2>
<p>The current aheadofmarket.com is a scroll site. It works, but it works like every other agency site: scroll down, skim sections, maybe click contact. The conversion path is passive. The visitor controls the pace. Most bounce before they reach the CTA.</p>
<p>A full-screen guided experience flips this. AOM controls the narrative. Each slide earns the next click. The visitor is being pitched to, not browsing a brochure. This is how premium brands present: Apple keynotes, Tesla configurators, high-end portfolio decks.</p>
<p><strong>Why this is better for AOM specifically:</strong></p>
<ul>
<li>AOM sells creative production and AI advisory. Both are high-trust, high-ticket services. A guided experience builds trust slide by slide, like a sales conversation.</li>
<li>The audit onboarding tool at <code>/audit/test</code> already proves this pattern converts. Patrik loves it. Extend that energy to the entire site.</li>
<li>Construction companies and SMB owners (AOM&#39;s target) don&#39;t read long pages. They need to be shown, step by step, why AOM is different. A guided flow does that.</li>
<li>The &quot;pitch deck on the web&quot; format positions AOM as the kind of company that builds premium experiences, not just talks about them. The site IS the proof of concept.</li>
<li>A persistent contact button means the visitor can bail into a conversation at any point. No more &quot;scroll back up to find the contact form.&quot; Every slide is a potential conversion point.</li>
</ul>
<hr>
<h2>2. Slide Structure</h2>
<p>8 slides. Each earns the next click. No filler. Every slide has a job.</p>
<h3>Slide 1: HERO (First Impression)</h3>
<p><strong>Job:</strong> Stop the scroll. Establish who AOM is in 3 seconds.</p>
<ul>
<li>Full-viewport video background (existing Gumlet rotation, keep the cinematic energy)</li>
<li>Headline: &quot;WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.&quot;</li>
<li>Micro-label: &quot;Creative Production + AI Systems&quot;</li>
<li>Single CTA: down arrow or &quot;See How&quot; to advance</li>
<li>Status bar at bottom: Phoenix, AZ / Video / Web / Social / Systems / Est. 2020</li>
<li>This slide is atmosphere. Dark, cinematic, confident. Let the video breathe.</li>
</ul>
<p><strong>Maps to:</strong> Current <code>HeroSection</code> component (adapted, not rebuilt from scratch)</p>
<h3>Slide 2: THE HOOK (What Makes AOM Different)</h3>
<p><strong>Job:</strong> Answer &quot;why should I care?&quot; before the visitor asks it.</p>
<ul>
<li>Split layout: left side = bold statement, right side = supporting proof</li>
<li>Headline: &quot;Small team. Cinema-grade. No BS.&quot;</li>
<li>3-4 trust metrics rendered as large stat blocks:<ul>
<li>&quot;24-72hr&quot; fast turnarounds</li>
<li>&quot;Predictable Delivery&quot; tight timelines</li>
<li>&quot;Cinema-grade&quot; lean crew, big output</li>
<li>&quot;Repeatable&quot; brand consistency</li>
</ul>
</li>
<li>Subtext: &quot;No layers of account managers. No scope creep. You talk to the people doing the work.&quot;</li>
<li>This is the &quot;we get it&quot; slide. It should feel like AOM already knows what the visitor is tired of.</li>
</ul>
<p><strong>Maps to:</strong> New content (trust metrics exist in <code>TRUST_METRICS</code> array in App.jsx)</p>
<h3>Slide 3: THE WORK (Portfolio/Reel)</h3>
<p><strong>Job:</strong> Show, don&#39;t tell. Let the work speak.</p>
<ul>
<li>Full-bleed video reel or auto-playing highlight clips</li>
<li>Minimal text overlay: &quot;The Work&quot; + client name ticker</li>
<li>Optional: 3-4 thumbnail selectors at the bottom to switch between featured pieces</li>
<li>Clicking a piece opens an overlay or links to the full project</li>
<li>This is the showstopper slide. Pure visual. Maximum screen real estate for the work.</li>
</ul>
<p><strong>Maps to:</strong> Current <code>#work</code> section (portfolio grid, adapted to full-screen)</p>
<h3>Slide 4: SERVICES (What We Offer)</h3>
<p><strong>Job:</strong> Make it clear what AOM actually does, fast.</p>
<ul>
<li>3 pathway cards (existing pattern from HeroSection):<ul>
<li>Construction Companies: &quot;Social content from the work you actually do.&quot;</li>
<li>Brands + Corporate: &quot;Video and content that tells your story and closes deals.&quot;</li>
<li>Digital + Systems: &quot;Websites, workflows, and the systems that make it all run.&quot;</li>
</ul>
</li>
<li>Each card clickable to expand or link to a deeper page</li>
<li>Clean grid layout. Icon + title + one-liner + CTA per card.</li>
<li>Below cards: package tiers if relevant (or save for a sub-page)</li>
</ul>
<p><strong>Maps to:</strong> Current <code>ServicesGrid</code> + pathway cards from <code>HeroSection</code></p>
<h3>Slide 5: CONSTRUCTION (The Specialty)</h3>
<p><strong>Job:</strong> Show construction companies that AOM gets their world.</p>
<ul>
<li>Dark background, orange accents</li>
<li>Headline: something direct about construction social media</li>
<li>Before/after or side-by-side: what construction social looks like without AOM vs with AOM</li>
<li>Stats or proof points specific to construction vertical</li>
<li>CTA: &quot;See the construction work&quot; or &quot;Start a project&quot;</li>
</ul>
<p><strong>Maps to:</strong> Current <code>ConstructionCallout</code> component</p>
<h3>Slide 6: AI ADVISORY (The New Product)</h3>
<p><strong>Job:</strong> Introduce the AI operations product without overwhelming.</p>
<ul>
<li>Sage green accent (per brand guidelines, AI content uses sage)</li>
<li>Headline: Position AOM as the AI operations partner for SMBs</li>
<li>3 simple steps: Audit &gt; Setup &gt; Platform</li>
<li>Pricing hint: &quot;Starting at $2,500&quot;</li>
<li>Link to <code>/system</code> page for the deep dive</li>
<li>This slide teases. The <code>/system</code> page sells.</li>
</ul>
<p><strong>Maps to:</strong> Current <code>AITeaser</code> component</p>
<h3>Slide 7: SOCIAL PROOF (Results + Testimonials)</h3>
<p><strong>Job:</strong> Let other people say what AOM is too humble to.</p>
<ul>
<li>2-3 testimonial cards (existing <code>TESTIMONIALS</code> array)</li>
<li>Each with: quote, metric, name, company, industry</li>
<li>Optional: client logo row at bottom</li>
<li>Clean, high-contrast, readable quotes. Big type.</li>
</ul>
<p><strong>Maps to:</strong> Current <code>BrandsCallout</code> + testimonials section</p>
<h3>Slide 8: CONTACT / CTA (The Close)</h3>
<p><strong>Job:</strong> Make it dead simple to start a conversation.</p>
<ul>
<li>Headline: &quot;Ready?&quot; or &quot;Let&#39;s build something.&quot;</li>
<li>Embedded contact form (name, email, what do you need, budget range)</li>
<li>Alternative: phone number, email link</li>
<li>This slide IS the contact page. No separate /contact needed.</li>
<li>The floating contact button throughout the experience also opens this content.</li>
</ul>
<p><strong>Maps to:</strong> Current brief/contact modal (converted to inline slide)</p>
<hr>
<h2>3. Navigation</h2>
<h3>Primary Navigation Methods</h3>
<p><strong>Scroll Snap (CSS-native)</strong></p>
<ul>
<li><code>scroll-snap-type: y mandatory</code> on the main container</li>
<li>Each slide: <code>scroll-snap-align: start</code> + <code>min-height: 100vh</code></li>
<li>Natural scroll behavior preserved. Users scroll like normal, but each scroll locks to the next slide.</li>
<li>On desktop: mouse wheel, trackpad, Page Up/Down</li>
<li>On mobile: vertical swipe</li>
</ul>
<p><strong>Keyboard</strong></p>
<ul>
<li>Arrow Down / Arrow Up: advance / go back</li>
<li>Page Down / Page Up: same behavior</li>
<li>Home: slide 1, End: slide 8</li>
<li>Escape: close any overlay/modal</li>
</ul>
<p><strong>Progress Indicator (visible on all slides except hero)</strong></p>
<ul>
<li>Right side of viewport: vertical dot rail</li>
<li>Each dot = one slide. Active dot highlighted in orange.</li>
<li>Dots are clickable for direct navigation.</li>
<li>On hover/focus: dot expands to show slide label (e.g., &quot;Services&quot;, &quot;AI Advisory&quot;)</li>
<li>Optional: thin progress line connecting dots, fill grows as user advances</li>
</ul>
<p><strong>Slide Navigation Buttons</strong></p>
<ul>
<li>Bottom-right corner: subtle down-arrow on each slide (except last)</li>
<li>Top-right corner: subtle up-arrow on each slide (except first)</li>
<li>These are hints, not the primary nav. Scroll snap is primary.</li>
</ul>
<h3>Mobile Navigation</h3>
<ul>
<li>Same scroll-snap behavior (touch swipe)</li>
<li>Progress dots move to bottom-center (horizontal) to avoid thumb reach issues</li>
<li>No arrow key support needed (no keyboard on mobile)</li>
<li>Swipe up to advance, swipe down to go back</li>
</ul>
<hr>
<h2>4. Contact Accessibility</h2>
<h3>Floating Contact Button</h3>
<ul>
<li><strong>Position:</strong> Bottom-right corner, fixed</li>
<li><strong>Size:</strong> 56px circle on desktop, 48px on mobile</li>
<li><strong>Visual:</strong> AOM orange, white icon (phone or chat bubble), subtle pulse animation on first load</li>
<li><strong>Always visible</strong> on every slide except Slide 8 (where contact is inline)</li>
<li><strong>Z-index:</strong> Above all content, below any open modals</li>
</ul>
<h3>What It Opens</h3>
<ul>
<li><strong>Desktop:</strong> Slide-in drawer from the right (400px wide). Contains the same contact form as Slide 8. Drawer has a dark overlay on the rest of the page.</li>
<li><strong>Mobile:</strong> Full-screen modal (same content, stacked vertically). Close button top-right.</li>
<li>The drawer/modal does NOT navigate away from the current slide. User stays where they are.</li>
</ul>
<h3>Form Fields (Same as Slide 8)</h3>
<ul>
<li>Name (text)</li>
<li>Email (text)</li>
<li>What do you need? (dropdown or radio: Video, Website, Social Media, AI Advisory, Other)</li>
<li>Budget range (radio: existing <code>BUDGET_OPTIONS</code>)</li>
<li>Timeline (radio: existing <code>TIMING_OPTIONS</code>)</li>
<li>Submit: &quot;Start Brief&quot; (orange button)</li>
<li>Submits to existing Formspree endpoint</li>
</ul>
<h3>Phone/Email Fallback</h3>
<ul>
<li>Below the form: &quot;Or just call: (602) 373-2164&quot; + &quot;<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>&quot;</li>
<li>These are always visible in the drawer/modal</li>
</ul>
<hr>
<h2>5. Technical Spec</h2>
<h3>Architecture Decision: CSS Scroll Snap (not JS slide library)</h3>
<p><strong>Why CSS scroll snap over a JS library (Swiper, FullPage.js, etc.):</strong></p>
<ul>
<li>Zero dependencies. No bundle bloat.</li>
<li>Native browser performance. GPU-accelerated scrolling.</li>
<li>Progressive enhancement: if CSS snap fails, it&#39;s still a scrollable page.</li>
<li>The audit onboarding tool uses JS-managed slides because it has form state per slide. The main site doesn&#39;t need that complexity. Each slide is a static/animated section.</li>
<li>Accessibility: native scroll maintains browser scroll behavior, back button, find-on-page.</li>
</ul>
<p><strong>Implementation:</strong></p>
<pre><code class="language-css">.slide-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.slide {
  min-height: 100vh;
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  justify-content: center;
}
</code></pre>
<h3>Routing (Hash-Based)</h3>
<p>Each slide gets a hash so specific slides are linkable and shareable:</p>
<ul>
<li><code>aheadofmarket.com</code> or <code>aheadofmarket.com/#hero</code> = Slide 1</li>
<li><code>aheadofmarket.com/#hook</code> = Slide 2</li>
<li><code>aheadofmarket.com/#work</code> = Slide 3</li>
<li><code>aheadofmarket.com/#services</code> = Slide 4</li>
<li><code>aheadofmarket.com/#construction</code> = Slide 5</li>
<li><code>aheadofmarket.com/#ai</code> = Slide 6</li>
<li><code>aheadofmarket.com/#proof</code> = Slide 7</li>
<li><code>aheadofmarket.com/#contact</code> = Slide 8</li>
</ul>
<p><strong>Behavior:</strong></p>
<ul>
<li>On page load: if hash is present, scroll to that slide instantly (no animation)</li>
<li>On scroll snap settle: update the URL hash (using <code>history.replaceState</code>, not <code>pushState</code>, to avoid polluting browser history)</li>
<li><code>IntersectionObserver</code> on each slide to detect which is active. Threshold: 0.5 (slide is &quot;active&quot; when 50%+ visible)</li>
</ul>
<h3>Transitions and Animations</h3>
<ul>
<li><strong>Between slides:</strong> CSS scroll snap handles this natively. No custom JS transitions needed.</li>
<li><strong>Within slides:</strong> Framer Motion for entrance animations (existing pattern). Each slide&#39;s content fades/slides in when the slide becomes active.</li>
<li><strong>Entrance trigger:</strong> <code>useInView</code> hook (already imported in App.jsx). Content animates only on first view, not every time the user scrolls back.</li>
<li><strong>Duration:</strong> 400-600ms for content entrance. Staggered children (100ms delay between elements).</li>
<li><strong>Easing:</strong> <code>ease-out</code> for entrances. No bouncy/spring physics.</li>
</ul>
<h3>Video Handling (Slide 1 / Hero)</h3>
<ul>
<li>Keep existing Gumlet iframe rotation</li>
<li>Add <code>loading=&quot;eager&quot;</code> for the first video only</li>
<li>Pause video iframes when slide is not active (IntersectionObserver)</li>
<li>On mobile: reduce to single video (no rotation) for performance. Already handled in current code.</li>
</ul>
<h3>Lazy Loading</h3>
<ul>
<li>Slides 1-2: loaded immediately</li>
<li>Slides 3-8: lazy loaded when within 1 slide of the viewport (<code>rootMargin: &quot;100vh&quot;</code> on IntersectionObserver)</li>
<li>Images/video in non-active slides: <code>loading=&quot;lazy&quot;</code></li>
<li>This prevents loading 8 slides worth of content on initial page load</li>
</ul>
<h3>Responsive Behavior</h3>
<ul>
<li><strong>Desktop (1024px+):</strong> Full experience. Dot nav on right. Floating contact bottom-right.</li>
<li><strong>Tablet (768-1023px):</strong> Same slide structure. Dot nav on right (smaller). Content padding adjusts.</li>
<li><strong>Mobile (&lt; 768px):</strong> Same slide structure. Dot nav moves to bottom-center (horizontal). Content stacks single-column. Floating contact button slightly smaller (48px).</li>
<li>All slides maintain <code>min-height: 100vh</code> across breakpoints.</li>
<li><code>100dvh</code> (dynamic viewport height) instead of <code>100vh</code> on mobile to account for browser chrome.</li>
</ul>
<h3>Accessibility</h3>
<ul>
<li>Each slide is a <code>&lt;section&gt;</code> with <code>aria-label</code></li>
<li>Progress dots have <code>aria-label=&quot;Navigate to [slide name]&quot;</code></li>
<li>Keyboard navigation (arrow keys) works alongside scroll</li>
<li>Reduced motion: respect <code>prefers-reduced-motion</code>. Disable entrance animations, keep scroll snap.</li>
<li>Tab order follows slide order. Focus management moves to active slide content.</li>
</ul>
<hr>
<h2>6. Sub-Pages</h2>
<h3>How /system, /briefs, /dashboard, /audit Fit</h3>
<p>These are <strong>separate experiences</strong>, not integrated into the main slide flow. The main site is the pitch. Sub-pages are the deep dive.</p>
<table>
<thead>
<tr>
<th>Route</th>
<th>Purpose</th>
<th>Relationship to Main Site</th>
</tr>
</thead>
<tbody><tr>
<td><code>/system</code></td>
<td>AI advisory sales page</td>
<td>Slide 6 (AI Advisory) links here for the full breakdown</td>
</tr>
<tr>
<td><code>/briefs/*</code></td>
<td>Strategy briefs hub</td>
<td>Linked from relevant slides or nav, not part of the main flow</td>
</tr>
<tr>
<td><code>/dashboard</code></td>
<td>Client dashboard (password-gated)</td>
<td>Completely separate. Not linked from public slides.</td>
</tr>
<tr>
<td><code>/audit/test</code></td>
<td>AI audit onboarding tool</td>
<td>Linked from Slide 6 or <code>/system</code> page as the &quot;Start Your Audit&quot; CTA</td>
</tr>
<tr>
<td><code>/audit/[slug]</code></td>
<td>Client-specific audit intake</td>
<td>Private links, not discoverable from main site</td>
</tr>
</tbody></table>
<p><strong>Top navigation bar</strong> (minimal, persistent across all pages):</p>
<ul>
<li>Logo (links to <code>/</code> / Slide 1)</li>
<li>&quot;Work&quot; (Slide 3)</li>
<li>&quot;Services&quot; (Slide 4)</li>
<li>&quot;AI Advisory&quot; (links to <code>/system</code>)</li>
<li>&quot;Contact&quot; (Slide 8 or opens contact drawer)</li>
<li>Hamburger on mobile</li>
</ul>
<p>The nav bar should be semi-transparent on Slide 1 (hero), then solid dark on all other slides and sub-pages.</p>
<hr>
<h2>7. Performance Budget</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>Target</th>
</tr>
</thead>
<tbody><tr>
<td>First Contentful Paint</td>
<td>&lt; 1.5s</td>
</tr>
<tr>
<td>Largest Contentful Paint</td>
<td>&lt; 2.5s (hero video poster loads fast, iframe follows)</td>
</tr>
<tr>
<td>Total page weight (initial)</td>
<td>&lt; 500KB (excluding video streams)</td>
</tr>
<tr>
<td>Slides loaded on init</td>
<td>2 (hero + hook)</td>
</tr>
<tr>
<td>Time to interactive</td>
<td>&lt; 3s</td>
</tr>
</tbody></table>
<p><strong>Video strategy:</strong></p>
<ul>
<li>Hero video: Gumlet handles streaming/adaptive bitrate. No self-hosted video.</li>
<li>Portfolio slide: same Gumlet embeds. Lazy loaded.</li>
<li>Poster frames: static JPG fallback while video loads. Must be optimized (&lt; 100KB each).</li>
</ul>
<p><strong>Font loading:</strong></p>
<ul>
<li>Syne + Space Grotesk + JetBrains Mono already in use</li>
<li><code>font-display: swap</code> to prevent FOIT</li>
<li>Preload headline font (Syne) in <code>&lt;head&gt;</code></li>
</ul>
<hr>
<h2>8. Migration Path</h2>
<p>This is not a rebuild. It&#39;s a restructuring of existing components.</p>
<p><strong>What stays:</strong></p>
<ul>
<li>All existing React components (HeroSection, ServicesGrid, ConstructionCallout, AITeaser, BrandsCallout)</li>
<li>Brand colors, typography, patterns (Bold Graphic v4)</li>
<li>Framer Motion animations (adapted to slide context)</li>
<li>Contact form + Formspree integration</li>
<li>All sub-page routes (/system, /briefs, /dashboard, /audit)</li>
</ul>
<p><strong>What changes:</strong></p>
<ul>
<li>Main page layout: vertical scroll -&gt; scroll-snap slide container</li>
<li>Each section component gets wrapped in a <code>.slide</code> container</li>
<li>New components: <code>SlideContainer</code>, <code>ProgressDots</code>, <code>FloatingContact</code>, <code>ContactDrawer</code></li>
<li>Navigation: scrollToSection becomes scroll-to-slide</li>
<li>URL handling: hash-based slide linking added</li>
<li>Existing <code>&lt;main&gt;</code> scroll container gets <code>scroll-snap-type: y mandatory</code></li>
</ul>
<p><strong>What&#39;s new:</strong></p>
<ul>
<li>Slide 2 (The Hook / Trust Metrics) - new slide, content already exists in data arrays</li>
<li>Progress dot rail</li>
<li>Floating contact button + drawer</li>
<li>Keyboard navigation handler</li>
<li>IntersectionObserver for active slide detection</li>
</ul>
<p><strong>Estimated scope:</strong> Medium. The components exist. The data exists. The brand system exists. Bobby is wrapping existing pieces in a new container pattern, not rebuilding from scratch. The audit onboarding tool already proves Bobby can build slide-based experiences.</p>
<hr>
<h2>9. Patrik&#39;s Design Decisions (answered Mar 11)</h2>
<ul>
<li><strong>Slide count:</strong> 8 core slides with the option to keep going. After slide 8, deeper content (case studies, briefs, system page) is accessible. Not a dead end.</li>
<li><strong>Portfolio slide:</strong> Full-bleed video reel for both desktop AND mobile. Project cards as fallback until reel is ready.</li>
<li><strong>Hero/Slide 1:</strong> Keep the moving video background (existing hero video treatment stays).</li>
<li><strong>Backgrounds and mobile snap:</strong> Steffen&#39;s call.</li>
</ul>
<h2>10. Remaining Open Questions</h2>
<ol>
<li><strong>Sound:</strong> Should any slide have optional audio (e.g., reel with sound toggle)?</li>
<li><strong>FAQ:</strong> Own slide, fold into contact, or move to sub-page?</li>
<li><strong>Loading screen:</strong> Branded loading state or poster frame immediately?</li>
</ol>
`,c={title:e,slug:t,category:o,agent:n,date:i,dateFormatted:l,updated:null,summary:s,tags:a,content:r};export{n as agent,o as category,r as content,i as date,l as dateFormatted,c as default,t as slug,s as summary,a as tags,e as title,d as updated};
