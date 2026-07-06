const n="Brand Pages Inspection Report",e="elmer-brand-pages-report",o="Audits",t="Elmo",i="2026-03-09",r="Mar 9",d=null,s="QA inspection of /brands, /brand, and /brands/ambition pages.",l=[],a=`<h1>Elmer Report: Brand Pages Inspection</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>Inspector:</strong> Elmer (QA Agent)
<strong>Pages:</strong> /brands, /brand, /brands/ambition
<strong>Verdict:</strong> ISSUES FOUND</p>
<hr>
<h2>Summary</h2>
<p>All 3 pages load, render content, and navigate correctly. The AOM brand page is solid. The Ambition page has a real mobile overflow bug that needs fixing. One third-party tracking pixel is throwing 400s on every page (cosmetic, not user-facing). The H1 on /brand has a font-stack issue.</p>
<hr>
<h2>Page 1: /brands (Hub)</h2>
<p><strong>Verdict: PASS</strong></p>
<ul>
<li><strong>Load time:</strong> 1,926ms (acceptable, Vercel CDN)</li>
<li><strong>Desktop overflow:</strong> None</li>
<li><strong>Mobile overflow:</strong> None</li>
<li><strong>Heading hierarchy:</strong> Clean. H1 &gt; H2 x2. Correct structure.</li>
<li><strong>Navigation:</strong> Both &quot;View Guidelines&quot; links work correctly.<ul>
<li>AOM card links to /brand (correct)</li>
<li>Ambition card links to /brands/ambition (correct)</li>
</ul>
</li>
<li><strong>Visual:</strong> Both brand cards render properly. Dark background, clean card layout. Mobile stacks correctly.</li>
<li><strong>Console errors:</strong> 1 (tracking pixel, not user-facing)</li>
<li><strong>Failed requests:</strong> 2x Google Analytics (headless browser, expected), 1x aplo-evnt.com 400 (tracking pixel)</li>
</ul>
<p><strong>Issues:</strong> None.</p>
<hr>
<h2>Page 2: /brand (AOM Brand Guidelines)</h2>
<p><strong>Verdict: PASS (1 minor issue)</strong></p>
<ul>
<li><strong>Load time:</strong> 1,665ms (good)</li>
<li><strong>Desktop overflow:</strong> None</li>
<li><strong>Mobile overflow:</strong> None</li>
<li><strong>Syne font detected:</strong> Yes</li>
<li><strong>Space Grotesk font detected:</strong> Yes</li>
<li><strong>Bold Graphic direction confirmed:</strong> Yes. Syne for display, Space Grotesk for section headers, cream/black/orange palette visible in screenshots.</li>
</ul>
<p><strong>Content sections visible (all H2):</strong></p>
<ol>
<li>Primary Marks</li>
<li>Palette</li>
<li>Typography</li>
<li>Patterns &amp; Elements</li>
<li>Photography Direction</li>
<li>Voice &amp; Tone</li>
<li>Do&#39;s and Don&#39;ts</li>
</ol>
<p><strong>Heading hierarchy:</strong> H1 &gt; H2 x7. Clean.</p>
<p><strong>Fonts in use:</strong></p>
<ul>
<li><code>Syne, sans-serif</code> (display/accent)</li>
<li><code>&quot;Space Grotesk&quot;, sans-serif</code> (section headings)</li>
<li>System UI fallback stack (body)</li>
</ul>
<p><strong>Issue (minor):</strong></p>
<ul>
<li>The H1 (&quot;BRANDguideLINES&quot;) uses the system UI fallback stack, not Syne or Space Grotesk. Every other heading on the page uses Space Grotesk. The H1 should too, or Syne if it&#39;s intentionally the display font for the hero.</li>
<li><strong>File:</strong> <code>/Users/patrik/Documents/Dev/aom-studio/src/pages/BrandGuidelines.jsx</code></li>
<li><strong>Fix:</strong> Add the correct font class to the H1 element.</li>
</ul>
<hr>
<h2>Page 3: /brands/ambition (Ambition Mechanical)</h2>
<p><strong>Verdict: ISSUES FOUND</strong></p>
<ul>
<li><strong>Load time:</strong> 1,593ms (good)</li>
<li><strong>Desktop overflow:</strong> None</li>
<li><strong>Mobile overflow:</strong> YES. 63px horizontal overflow (453px content vs 390px viewport).</li>
<li><strong>Dark theme confirmed:</strong> Yes. Body bg <code>rgb(2, 2, 2)</code>, sections use <code>rgb(10, 14, 42)</code> (deep navy). Correct.</li>
<li><strong>Barlow Condensed font detected:</strong> Yes</li>
<li><strong>Orange (AOM color) detected:</strong> None. Clean separation from AOM brand. Correct.</li>
<li><strong>Ambition colors (navy/red/white):</strong> Confirmed. Headings are white on navy. Red appears in color palette section.</li>
<li><strong>OG Brand / Web Brand tabs:</strong> Present and working.</li>
</ul>
<p><strong>Content sections visible (all H2, Barlow Condensed):</strong></p>
<ol>
<li>THE MARK STAYS</li>
<li>NAVY AND RED</li>
<li>BARLOW CONDENSED + INTER</li>
<li>ELEMENTS FROM THE LOGO</li>
<li>HOW IT LOOKS ON CAMERA</li>
<li>HOW THE BRAND LIVES</li>
<li>HOW AMBITION TALKS</li>
</ol>
<p><strong>Fonts in use:</strong></p>
<ul>
<li><code>&quot;Barlow Condensed&quot;, sans-serif</code> (headings)</li>
<li><code>Inter, system-ui, sans-serif</code> / <code>Inter, sans-serif</code> (body)</li>
<li><code>&quot;JetBrains Mono&quot;, monospace</code> (code/technical elements)</li>
<li>System UI fallback (nav)</li>
</ul>
<h3>Mobile Overflow Bug (the real issue)</h3>
<p><strong>Overflow: 63px.</strong> Three things are causing it:</p>
<ol>
<li><strong>Decorative SVG element</strong> (class: <code>absolute top-0 right-0 opacity-30 pointer-events-none</code>). Fixed 400px wide, overflows by 80px. This is the primary culprit.</li>
<li><strong>Second decorative element</strong> (class: <code>absolute top-0 right-0 opacity-10 pointer-events-none</code>). 200px wide, overflows by 36px.</li>
<li><strong>A content container and paragraph</strong> without proper max-width constraints. 395px wide, overflows by 62px.</li>
</ol>
<p><strong>File:</strong> <code>/Users/patrik/Documents/Dev/aom-studio/src/pages/AmbitionBrandGuidelines.jsx</code></p>
<p><strong>Fixes:</strong></p>
<ol>
<li>Add <code>overflow-hidden</code> to the parent container that holds the decorative SVGs (the <code>min-h-screen relative</code> div). This clips the absolutely-positioned decorative elements without affecting layout.</li>
<li>Alternatively, scale down the SVG width on mobile: <code>w-[200px] md:w-[400px]</code> for the first one, <code>w-[100px] md:w-[200px]</code> for the second.</li>
<li>The 395px content container needs <code>max-w-full</code> or proper padding. Check for missing <code>px-4</code> or <code>overflow-hidden</code> on the section wrapper.</li>
</ol>
<hr>
<h2>Cross-Page Issues</h2>
<h3>Tracking Pixel 400 Error (all pages)</h3>
<ul>
<li><code>aplo-evnt.com/api/v1/intent_pixel/track_request</code> returns 400 on every page load.</li>
<li>Not user-facing, but it&#39;s noise in the console and wasted requests.</li>
<li><strong>Fix:</strong> Either fix the integration config (check the app_id) or remove the tracking pixel if it&#39;s not being used.</li>
</ul>
<h3>Page Titles (all pages)</h3>
<ul>
<li>All 3 pages share the same title: &quot;AOM | Brand Infrastructure for Companies That Build&quot;</li>
<li>The Ambition page should have its own title for SEO: &quot;Ambition Mechanical | Brand Guidelines | AOM&quot;</li>
<li>The hub page title is fine.</li>
</ul>
<h3>Google Analytics</h3>
<ul>
<li>Two GA tracking IDs firing on every page (G-XRC3GJ475X, G-YLM5FV08MY). The ERR_ABORTED is just headless Chromium blocking the requests. Not a real issue.</li>
</ul>
<hr>
<h2>Performance Summary</h2>
<table>
<thead>
<tr>
<th>Page</th>
<th>Load Time</th>
<th>Desktop Overflow</th>
<th>Mobile Overflow</th>
</tr>
</thead>
<tbody><tr>
<td>/brands</td>
<td>1,926ms</td>
<td>None</td>
<td>None</td>
</tr>
<tr>
<td>/brand</td>
<td>1,665ms</td>
<td>None</td>
<td>None</td>
</tr>
<tr>
<td>/brands/ambition</td>
<td>1,593ms</td>
<td>None</td>
<td><strong>63px</strong></td>
</tr>
</tbody></table>
<p>All load times under 2s. Solid.</p>
<hr>
<h2>Screenshots Saved</h2>
<ul>
<li><code>brands-hub-desktop.png</code></li>
<li><code>brands-hub-mobile.png</code></li>
<li><code>brand-page-desktop.png</code></li>
<li><code>brand-page-mobile.png</code></li>
<li><code>ambition-brand-desktop.png</code></li>
<li><code>ambition-brand-mobile.png</code></li>
</ul>
<p>All at: <code>/Users/patrik/Documents/Dev/AOM-EA/projects/bobby/double-check/</code></p>
<hr>
<h2>Priority Fixes for Bobby</h2>
<ol>
<li><strong>[HIGH] Mobile overflow on /brands/ambition</strong> -- Add <code>overflow-x-hidden</code> to the page wrapper or constrain the decorative SVGs. File: <code>AmbitionBrandGuidelines.jsx</code></li>
<li><strong>[LOW] H1 font on /brand</strong> -- Apply Syne or Space Grotesk to the H1. File: <code>BrandGuidelines.jsx</code></li>
<li><strong>[LOW] Page title on /brands/ambition</strong> -- Give it a unique title. File: <code>AmbitionBrandGuidelines.jsx</code></li>
<li><strong>[LOW] Tracking pixel 400</strong> -- Check or remove the aplo-evnt integration.</li>
</ol>
`,c={title:n,slug:e,category:o,agent:t,date:i,dateFormatted:r,updated:null,summary:s,tags:l,content:a};export{t as agent,o as category,a as content,i as date,r as dateFormatted,c as default,e as slug,s as summary,l as tags,n as title,d as updated};
