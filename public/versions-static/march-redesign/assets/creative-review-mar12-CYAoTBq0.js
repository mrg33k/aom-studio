const e="Creative Director Review: March 12",t="creative-review-mar12",n="Audits",o="Steffen",i="2026-03-12",a="Mar 12",c=null,s="Full-pass creative review of aheadofmarket.com and ambition-teal.vercel.app.",r=[],d=`<h1>Creative Director Review: March 12, 2026</h1>
<blockquote>
<p>Steffen | Full-pass review of aheadofmarket.com + ambition-teal.vercel.app
Source: codebase audit (App.jsx, components, tailwind.config.js, HTML entry points, SystemPage.jsx)</p>
</blockquote>
<hr>
<h2>Executive Summary</h2>
<p>The AOM site has matured significantly. The component architecture is clean, the section flow is logical (Hook &gt; Prove &gt; Show &gt; Explain &gt; Convert), and the dark frame system from v4 is applied consistently across the homepage. There are no catastrophic visual issues. What follows are the refinements that separate &quot;good&quot; from &quot;Nike campaign book.&quot;</p>
<hr>
<h2>TOP 5 IMPROVEMENTS (Ranked by Visual Impact)</h2>
<h3>1. Font Stack Mismatch: <code>font-mono</code> Maps to Space Grotesk, Not JetBrains Mono</h3>
<p><strong>Severity:</strong> High (brand identity drift)</p>
<p>The Tailwind config maps <code>font-mono</code> to <code>&quot;Space Grotesk&quot;</code> (line 50 of tailwind.config.js):</p>
<pre><code class="language-js">mono: [&#39;&quot;Space Grotesk&quot;&#39;, &#39;monospace&#39;],
</code></pre>
<p>The brand guidelines (v1 and v4) specify JetBrains Mono for all mono/system/AI layer text. JetBrains Mono IS loaded in index.html (line 19), but the Tailwind alias sends everything to Space Grotesk. This means micro-labels, badges, and AI system text throughout the site are NOT in JetBrains Mono even though the font is loaded.</p>
<p><strong>Fix for Bobby:</strong></p>
<pre><code class="language-js">// tailwind.config.js line 50
mono: [&#39;&quot;JetBrains Mono&quot;&#39;, &#39;monospace&#39;],
</code></pre>
<p>This single change fixes every <code>font-mono</code> reference site-wide. Space Grotesk stays as <code>font-body</code>.</p>
<p><strong>Impact:</strong> The entire AI/systems visual layer, every micro-label, every badge, every status indicator gets the correct typeface. The distinction between body text and system text becomes visible.</p>
<hr>
<h3>2. Missing OG Images on Dashboard, V2, Growth Plan, and Outreach Plan Pages</h3>
<p><strong>Severity:</strong> High (brand perception when shared)</p>
<p>Current OG image coverage:</p>
<table>
<thead>
<tr>
<th>Page</th>
<th>OG Image</th>
<th>OG Title</th>
</tr>
</thead>
<tbody><tr>
<td>index.html</td>
<td>/og-image.png</td>
<td>Yes</td>
</tr>
<tr>
<td>system.html</td>
<td>/og-image.png</td>
<td>Yes</td>
</tr>
<tr>
<td>proposals-isa.html</td>
<td>/og-image.png</td>
<td>Yes</td>
</tr>
<tr>
<td>dashboard.html</td>
<td>NONE</td>
<td>NONE</td>
</tr>
<tr>
<td>v2.html</td>
<td>NONE</td>
<td>NONE</td>
</tr>
<tr>
<td>growth-plan.html</td>
<td>NONE</td>
<td>NONE</td>
</tr>
<tr>
<td>outreach-plan.html</td>
<td>NONE</td>
<td>NONE</td>
</tr>
</tbody></table>
<p>When anyone shares a dashboard link, Slack/iMessage/LinkedIn shows a blank preview. For a company selling AI systems, that&#39;s a credibility gap.</p>
<p><strong>Fix for Bobby:</strong>
Every HTML entry point needs at minimum:</p>
<pre><code class="language-html">&lt;meta property=&quot;og:title&quot; content=&quot;[Page Title] | AOM&quot; /&gt;
&lt;meta property=&quot;og:description&quot; content=&quot;[One line]&quot; /&gt;
&lt;meta property=&quot;og:image&quot; content=&quot;https://aheadofmarket.com/og-image.png&quot; /&gt;
&lt;meta property=&quot;og:type&quot; content=&quot;website&quot; /&gt;
&lt;meta name=&quot;twitter:card&quot; content=&quot;summary_large_image&quot; /&gt;
&lt;meta name=&quot;twitter:image&quot; content=&quot;https://aheadofmarket.com/og-image.png&quot; /&gt;
</code></pre>
<p>Longer term: each page type should have its own OG image (system page = sage-tinted, dashboard = data-viz themed). But the shared default OG image is the minimum bar.</p>
<hr>
<h3>3. Services Grid Cream Section: Contrast and Color Temperature Break</h3>
<p><strong>Severity:</strong> Medium-High (visual coherence)</p>
<p>The ServicesGrid component (the &quot;Three Ways In&quot; section) uses <code>bg-aom-cream</code> with <code>text-aom-black</code> and <code>text-aom-warm-gray</code>. It&#39;s the only light section on the entire homepage. The intent is right (breathing room), but the execution creates a jarring temperature shift.</p>
<p>Issues found in ServicesGrid.jsx:</p>
<ul>
<li>Card backgrounds use <code>bg-white</code> (pure white, not <code>bg-aom-cream</code> or <code>bg-aom-cream-alt</code>)</li>
<li>Card borders use <code>border-aom-light-border</code> which is <code>#D9D3CB</code> -- correct warm tone</li>
<li>The cream <code>#FDF6EC</code> background is warm, but <code>bg-white</code> cards on top of it look cold by comparison</li>
<li>Icon containers use <code>bg-aom-cream</code> inside a <code>bg-white</code> card, creating a nested cream-on-white that&#39;s barely distinguishable</li>
</ul>
<p><strong>Fix for Bobby:</strong></p>
<pre><code>Card background: bg-aom-cream-alt (#F5EFE6) instead of bg-white
Card shadow: shadow-sm -&gt; shadow-md (needs more lift on light bg)
Icon container: bg-white instead of bg-aom-cream (white icon box on cream-alt card reads cleaner)
</code></pre>
<p>This keeps the cream breathing section but eliminates the cold white/warm cream clash.</p>
<hr>
<h3>4. Headline Weight Inconsistency: <code>font-bold</code> vs <code>font-extrabold</code> on Section Headlines</h3>
<p><strong>Severity:</strong> Medium (typography discipline)</p>
<p>The brand guidelines specify headlines as &quot;ALWAYS uppercase, italic, black weight.&quot; The site uses <code>font-extrabold</code> (800) consistently on the homepage App.jsx headlines, but the extracted components drift:</p>
<table>
<thead>
<tr>
<th>Component</th>
<th>Headline Weight</th>
<th>Correct?</th>
</tr>
</thead>
<tbody><tr>
<td>HeroSection h1</td>
<td><code>font-extrabold</code></td>
<td>Yes</td>
</tr>
<tr>
<td>ServicesGrid h2</td>
<td><code>font-extrabold</code></td>
<td>Yes</td>
</tr>
<tr>
<td>ConstructionCallout h2</td>
<td><code>font-bold</code> (700)</td>
<td>NO</td>
</tr>
<tr>
<td>BrandsCallout h2</td>
<td><code>font-bold</code> (700)</td>
<td>NO</td>
</tr>
<tr>
<td>AITeaser h2</td>
<td><code>font-bold</code> (700)</td>
<td>NO</td>
</tr>
</tbody></table>
<p>The extracted section components (Construction, Brands, AI Teaser) all use <code>font-bold</code> while the inline sections in App.jsx use <code>font-extrabold</code>. This creates a subtle but real visual hierarchy issue where the section headlines in the extracted components feel lighter.</p>
<p>Additionally: the brand guidelines say headlines should be <strong>italic</strong>. Zero section headlines on the live site use italic. This was a deliberate choice in implementation (italic works for print/editorial but can feel forced on web at very large sizes). I&#39;d recommend keeping non-italic as the current standard but documenting this as a conscious deviation in the brand guidelines.</p>
<p><strong>Fix for Bobby:</strong>
In ConstructionCallout.jsx, BrandsCallout.jsx, and AITeaser.jsx: change <code>font-bold</code> to <code>font-extrabold</code> on all <code>&lt;h2&gt;</code> elements.</p>
<hr>
<h3>5. Pattern Strip Overuse: 7 Dividers Between 12 Sections</h3>
<p><strong>Severity:</strong> Medium (visual noise)</p>
<p>The homepage uses <code>PatternStrip</code> between almost every section. The pattern strip is a strong brand element (diagonal lines, dots, crosshatch), but when used 7 times on a single page scroll, it loses impact and creates a &quot;striped wallpaper&quot; effect.</p>
<p>Current order: diagonal &gt; dots &gt; crosshatch &gt; diagonal &gt; dots &gt; crosshatch &gt; dots &gt; diagonal</p>
<p><strong>Recommendation:</strong></p>
<ul>
<li>Keep pattern strips between major context shifts (dark-to-cream, cream-to-dark, content-type changes)</li>
<li>Remove pattern strips between sections that share the same background color and similar content type</li>
<li>Maximum 4 pattern strips on the homepage</li>
</ul>
<p>Specifically remove:</p>
<ul>
<li>Strip between Stats/Testimonials and Portfolio (both dark, both proof sections)</li>
<li>Strip between Brands Callout and Services (context shift handles separation)</li>
<li>Strip between Pull Quote and FAQ (both dark text sections, the quote itself IS the divider)</li>
</ul>
<p>Replace with: <code>&lt;div className=&quot;w-12 h-[2px] bg-aom-orange mx-6 md:mx-12&quot; /&gt;</code> (the orange accent bar already used before the footer). More restrained, still on-brand.</p>
<hr>
<h2>ADDITIONAL FINDINGS</h2>
<h3>Typography</h3>
<ul>
<li><strong>Body text minimum respected.</strong> All body text is <code>text-base</code> (16px). No violations found.</li>
<li><strong>Max line length.</strong> Body text uses <code>max-w-2xl</code> and <code>max-w-xl</code> consistently. Headlines use <code>max-w-[45ch]</code>. Clean.</li>
<li><strong>Syne loaded correctly.</strong> Weights 700, 800, 900 via Google Fonts. Space Grotesk 400, 500, 600. JetBrains Mono 400, 500, 700.</li>
<li><strong>Loading screen logo.</strong> Uses <code>AOM.</code> with orange dot. Matches approved mark. Good.</li>
</ul>
<h3>Color System</h3>
<ul>
<li><strong>Night (#0C0C0C)</strong> used as primary background across all dark sections. Consistent.</li>
<li><strong>Night Card (#151515)</strong> used for portfolio section and elevated surfaces. Correct hierarchy.</li>
<li><strong>Mid Dark (#1A1A1A)</strong> used for Stats, Packages, AI Teaser sections. Provides subtle section alternation.</li>
<li><strong>Orange (#E85D26)</strong> used sparingly for CTAs, accents, status dots. Under the 10-15% guideline.</li>
<li><strong>Sage (#7C9A72)</strong> correctly isolated to AI/systems sections (AITeaser, Digital pathway card). No bleed.</li>
<li><strong>Text muted (#8A847C)</strong> vs brand guidelines <code>#A8A29E</code> (Stone). The Tailwind config maps <code>text-muted</code> to <code>#8A847C</code> which is darker/warmer than the guidelines&#39; Stone. This is a deliberate v4 evolution and reads better on the darker backgrounds. Document this as the canonical value going forward.</li>
</ul>
<h3>Spacing</h3>
<ul>
<li>Section padding: <code>py-16 md:py-24</code> on most sections, <code>py-24 md:py-36</code> on major sections. Generous. Consistent with guidelines&#39; <code>py-24</code> minimum desktop.</li>
<li>Cards: <code>p-6 md:p-8</code> throughout. Matches guidelines.</li>
<li>Component gaps: <code>gap-6</code> for card grids. Correct.</li>
<li>One exception: the stats section uses <code>px-6 md:px-12</code> directly on the section (no max-w container), but uses <code>max-w-screen-2xl mx-auto</code> inside. This is fine -- the outer padding creates consistent edge gutters.</li>
</ul>
<h3>Animations</h3>
<ul>
<li>Scroll reveals: <code>motion.div</code> with <code>y: 30</code> -&gt; <code>y: 0</code>, <code>duration: 0.7</code>. Correct per guidelines.</li>
<li>Hover states: <code>transition-colors duration-300</code> on cards. Correct.</li>
<li>Video modules: <code>grayscale-[0.3]</code> -&gt; <code>grayscale-0</code> on hover with <code>duration-700</code>. On-brand.</li>
<li>ScrambleText effect: present and working on stat kickers. Good.</li>
<li>The hero parallax effect (<code>translateY(scrollY * 0.15)</code>) is a nice touch.</li>
</ul>
<h3>Accessibility</h3>
<ul>
<li>All interactive elements have <code>min-h-[44px]</code> for touch targets. Good.</li>
<li><code>aria-label</code> on sections. Good.</li>
<li><code>sr-only</code> labels on form inputs. Good.</li>
<li>The <code>.text-outline</code> (transparent text with stroke) has zero fill color -- screen readers can read it but it fails WCAG for color contrast since the stroke is <code>rgba(255,255,255,0.1)</code>. This is an intentional stylistic choice (outline text as visual hierarchy), not body copy. Acceptable.</li>
</ul>
<h3>Navigation</h3>
<ul>
<li>Desktop: clean, minimal. Logo left, links right, two CTAs (ghost + primary). Correct hierarchy.</li>
<li>Mobile: hamburger menu with full-screen overlay. Works.</li>
<li>Sticky nav with <code>bg-aom-night/95 backdrop-blur-md</code> on scroll. Premium feel.</li>
<li>Missing: no link to /dashboard in nav. If this is intentional (internal only), that&#39;s fine. If clients will use it, add it.</li>
</ul>
<h3>System Page (SystemPage.jsx)</h3>
<ul>
<li>Uses matching brand constants: <code>BG = &#39;#0C0C0C&#39;</code>, <code>CARD_BG = &#39;#151515&#39;</code>, <code>TEXT = &#39;#F0ECE6&#39;</code>, <code>MUTED = &#39;#8A847C&#39;</code></li>
<li>Consistent with main site color system</li>
<li>Has its own PatternStrip and GrainOverlay implementations (duplicated from App.jsx). Bobby should extract these to shared components.</li>
</ul>
<hr>
<h2>OG IMAGE AUDIT</h2>
<table>
<thead>
<tr>
<th>Asset</th>
<th>Status</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>/og-image.png</td>
<td>EXISTS</td>
<td>In /public directory</td>
</tr>
<tr>
<td>/og-image.svg</td>
<td>EXISTS</td>
<td>Source file in /public</td>
</tr>
<tr>
<td>Homepage OG</td>
<td>COMPLETE</td>
<td>All tags present, 1200x630</td>
</tr>
<tr>
<td>System OG</td>
<td>PARTIAL</td>
<td>Uses shared og-image.png, has title/desc</td>
</tr>
<tr>
<td>Dashboard OG</td>
<td>MISSING</td>
<td>No OG tags at all</td>
</tr>
<tr>
<td>V2 OG</td>
<td>MISSING</td>
<td>No OG tags</td>
</tr>
<tr>
<td>Growth Plan OG</td>
<td>MISSING</td>
<td>No OG tags</td>
</tr>
<tr>
<td>Proposals ISA OG</td>
<td>PARTIAL</td>
<td>Has image, missing description</td>
</tr>
</tbody></table>
<p><strong>Recommendation:</strong> Create page-specific OG images for /system (sage tint) and /dashboard (data viz theme). Apply shared OG image as fallback to all remaining pages.</p>
<hr>
<h2>IDEAS TRACKER DESIGN SPEC STATUS</h2>
<p>Reviewed the spec at <code>projects/steffen/ideas-tracker-design-spec.md</code>. The spec is comprehensive and implementation-ready. Key findings:</p>
<ol>
<li><p><strong>Spec is solid.</strong> Every value is specified. Colors, sizes, animations, responsive breakpoints, interaction patterns. Bobby has no ambiguity.</p>
</li>
<li><p><strong>Font references are correct.</strong> Spec uses Syne, Space Grotesk, JetBrains Mono -- matching the fonts loaded in index.html. BUT: due to the <code>font-mono</code> Tailwind mapping issue (Finding #1 above), Bobby will need to use <code>font-[&#39;JetBrains_Mono&#39;]</code> or fix the Tailwind config first. Otherwise all the JetBrains Mono references in the spec will render as Space Grotesk.</p>
</li>
<li><p><strong>One update needed:</strong> The spec references <code>#0C0C0C</code> as canvas background but the Tailwind config has <code>aom-night: &#39;#0C0C0C&#39;</code>. Bobby should use <code>bg-aom-night</code> not a custom hex. Spec is correct, just flagging the Tailwind mapping.</p>
</li>
<li><p><strong>IdeasTracker.jsx already exists</strong> (1,524 lines). Bobby has started building it. I did not audit the implementation against the spec in this pass -- that&#39;s an Elmo QA task once Bobby reports it&#39;s ready.</p>
</li>
<li><p><strong>No updates needed to the design spec.</strong> It&#39;s comprehensive, on-brand, and implementation-ready. Ship it.</p>
</li>
</ol>
<hr>
<h2>AMBITION SITE (ambition-teal.vercel.app)</h2>
<p>Could not perform a live visual audit (WebFetch was denied for the live URL). The JSON-LD schema data confirms the business info is correct. A code-level audit of the Ambition site requires access to the AMBITION repo (github.com/mrg33k/AMBITION). Flagging for next pass: pull the Ambition repo and audit component-by-component against <code>projects/steffen/ambition-brand-guidelines.md</code>.</p>
<hr>
<h2>ACTION ITEMS FOR BOBBY (Priority Order)</h2>
<ol>
<li><strong>Fix <code>font-mono</code> in tailwind.config.js</strong> -- Change to JetBrains Mono. Instant site-wide improvement.</li>
<li><strong>Add OG meta tags to dashboard.html, v2.html, growth-plan.html, outreach-plan.html</strong> -- Copy pattern from index.html.</li>
<li><strong>Fix headline weight on ConstructionCallout, BrandsCallout, AITeaser</strong> -- <code>font-bold</code> -&gt; <code>font-extrabold</code>.</li>
<li><strong>Fix ServicesGrid card backgrounds</strong> -- <code>bg-white</code> -&gt; <code>bg-aom-cream-alt</code>.</li>
<li><strong>Reduce pattern strips from 7 to 4</strong> -- Remove 3 specified strips, replace with orange accent bars.</li>
<li><strong>Extract PatternStrip and GrainOverlay to shared components</strong> -- Currently duplicated between App.jsx and SystemPage.jsx.</li>
</ol>
<hr>
<p><em>Next review: after Bobby ships the ideas tracker. Full Playwright screenshot audit at that time.</em></p>
`,l={title:e,slug:t,category:n,agent:o,date:i,dateFormatted:a,updated:null,summary:s,tags:r,content:d};export{o as agent,n as category,d as content,i as date,a as dateFormatted,l as default,t as slug,s as summary,r as tags,e as title,c as updated};
