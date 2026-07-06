const e="Brand Page v4 Update Spec",o="brand-page-v4-spec",t="Design Specs",n="Steffen",i="2026-03-12",a="Mar 12",r=null,d="Spec for updating /brand to current v4 standard with expanded template kit.",l=[],c=`<h1>Brand Page v4 Update Spec</h1>
<blockquote>
<p>Steffen | 2026-03-12
For Bobby. Updates /brand (currently BrandGuidelinesV4.jsx at /brand/v4) to the current v4 standard and expands the template kit.
Source of truth: aom-brand-guidelines-v4.md</p>
</blockquote>
<hr>
<h2>Current State</h2>
<p>The /brand/v4 page (BrandGuidelinesV4.jsx, ~2200 lines) is already the most complete brand reference on the site. It has 8 sections:</p>
<ol>
<li>Brand Mark (logo variations, icon mark, lockups, clear space, misuse)</li>
<li>Color System (primary + extended palettes, contrast ratios)</li>
<li>Typography (Syne + Space Grotesk specimens, type scale)</li>
<li>Pattern Library (diagonal lines, dot grid, cross hatch, angular grid, film grain, bar stack)</li>
<li>Spacing &amp; Grid (12-column system, spacing scale)</li>
<li>Component Library (buttons, badges, cards, dividers)</li>
<li>Photography Style (treatment, cropping, color grade)</li>
<li>Voice &amp; Tone (copy rules, do/don&#39;t examples)</li>
</ol>
<p>Plus: a Brand Toolkit download section between sections 1 and 2.</p>
<p><strong>What&#39;s missing:</strong> Template kit (Patrik specifically called this out), JetBrains Mono specimen, motion/animation guidelines, and some color values have drifted from the latest Tailwind config.</p>
<hr>
<h2>PART 1: V4 Brand Alignment Fixes</h2>
<p>These are specific corrections to bring the existing page in line with the current v4 system.</p>
<h3>1.1 Logo Mark Consistency</h3>
<p><strong>Issue:</strong> The SVG logo throughout the page uses <code>fill=&quot;#F2EDE8&quot;</code> for the wordmark on dark backgrounds. The correct v4 text color on dark is <code>#F0ECE6</code> (Text Light). <code>#F2EDE8</code> is close but not canonical.</p>
<p><strong>Fix for Bobby:</strong></p>
<ul>
<li>All <code>fill=&quot;#F2EDE8&quot;</code> in logo SVGs -&gt; <code>fill=&quot;#F0ECE6&quot;</code></li>
<li>This affects ~16 SVG instances across the Brand Mark section</li>
<li>The on-light logos using <code>fill=&quot;#0A0A0A&quot;</code> are correct. No change.</li>
</ul>
<h3>1.2 Section Label Font Sizes</h3>
<p><strong>Issue:</strong> Icon mark labels use <code>fontSize: 10</code> (line 622 area) and variation labels use <code>fontSize: 11</code>. The documented minimum for mono labels is 12px.</p>
<p><strong>Fix for Bobby:</strong></p>
<ul>
<li>All <code>fontSize: 10</code> in section labels -&gt; <code>fontSize: 12</code></li>
<li>All <code>fontSize: 11</code> in variation labels -&gt; <code>fontSize: 12</code></li>
<li>These are JetBrains Mono uppercase labels. At 12px with <code>tracking: 0.1em</code> they remain compact but pass the readability standard.</li>
</ul>
<h3>1.3 Pattern Strip Function</h3>
<p><strong>Issue (verify):</strong> The <code>PatternStrip</code> component should use the exact CSS recipe from the brand guidelines (<code>repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)</code>). Confirm it matches. If it uses different values, align.</p>
<h3>1.4 Missing JetBrains Mono Typography Specimen</h3>
<p><strong>Issue:</strong> Section 3 (Typography) shows specimens for Syne and Space Grotesk but NOT JetBrains Mono, which is the third font in the system and used heavily across the site for labels, badges, metadata, and code.</p>
<p><strong>Fix for Bobby:</strong> Add a third typography specimen block after Space Grotesk:</p>
<p><strong>JetBrains Mono Specimen Card:</strong></p>
<ul>
<li>Background: <code>#151515</code> (Night Card)</li>
<li>Border: <code>1px solid rgba(255,255,255,0.10)</code></li>
<li>Specimen text: <code>&quot;SYSTEM READY. ALL AGENTS ACTIVE. STATUS: NOMINAL.&quot;</code></li>
<li>Show four weights/sizes:<ul>
<li>Label: JetBrains Mono 700, 12px, <code>tracking: 0.2em</code>, uppercase, <code>#E85D26</code></li>
<li>Badge: JetBrains Mono 500, 11px, <code>tracking: 0.15em</code>, uppercase, <code>#8A847C</code></li>
<li>Micro: JetBrains Mono 500, 10px, <code>tracking: 0.15em</code>, uppercase, <code>#8A847C</code> with note: &quot;Minimum badge size. Never use below 10px.&quot;</li>
<li>Code: JetBrains Mono 400, 14px, <code>tracking: 0</code>, normal case, <code>#F0ECE6</code></li>
</ul>
</li>
<li>Below specimen: usage notes in <code>#8A847C</code><ul>
<li>&quot;Used for: labels, badges, metadata, code snippets, system identifiers, status text, navigation micro-labels&quot;</li>
<li>&quot;Always uppercase for labels and badges. Normal case for code and data.&quot;</li>
</ul>
</li>
</ul>
<h3>1.5 Color System: Add Missing Values</h3>
<p><strong>Issue:</strong> The extended color palette on the page may not include all values from the Tailwind config. Specifically check for:</p>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Status on Page</th>
</tr>
</thead>
<tbody><tr>
<td><code>#0A0A08</code></td>
<td>Canonical page background</td>
<td>May be missing. Different from <code>#0A0A0A</code> (Black).</td>
</tr>
<tr>
<td><code>#F5F0EB</code></td>
<td>Warm white (used on homepage)</td>
<td>May be missing. Sits between Cream and Text Light.</td>
</tr>
<tr>
<td><code>#A89F96</code></td>
<td>Dim text</td>
<td>May be missing. Used for tertiary text.</td>
</tr>
<tr>
<td><code>#D14E1C</code></td>
<td>Orange hover</td>
<td>Should be present. Verify.</td>
</tr>
<tr>
<td><code>#292524</code></td>
<td>Night border warm</td>
<td>Used on /ideas. Add if not present with note about usage.</td>
</tr>
</tbody></table>
<p><strong>Fix for Bobby:</strong> Add any missing swatches to the color grid. Group under &quot;Extended&quot; palette section.</p>
<h3>1.6 Background Color on Page</h3>
<p><strong>Issue:</strong> The DarkSection component uses <code>background: C.night</code> (<code>#0C0C0C</code>). The canonical page background per wave 5 review should be <code>#0A0A08</code>.</p>
<p><strong>Decision:</strong> Keep <code>#0C0C0C</code> for the brand page dark sections. The brand page alternates dark/light (Night / Cream) as a deliberate showcase of the color system. <code>#0A0A08</code> is the page background for content pages. <code>#0C0C0C</code> is the showcase background for the brand system. This is intentional, not a bug. Document this distinction in the color section.</p>
<hr>
<h2>PART 2: Template Kit Expansion</h2>
<p>Patrik said: &quot;I love the direction of the brand page but it needs the v4 brand update. Then I want to keep expanding things like the template kit.&quot;</p>
<p>The page currently has a &quot;Brand Toolkit&quot; download section (section DL, between Brand Mark and Color System) with PNG/SVG exports. But it has ZERO template kits. Templates are pre-designed layouts that the team (and eventually clients) can populate with content.</p>
<h3>New Section: Section 9 - Template Kit</h3>
<p>Place after Voice &amp; Tone (Section 8). This becomes the largest new addition to the page.</p>
<p><strong>Section Header:</strong></p>
<ul>
<li>Number: <code>09</code></li>
<li>Title: <code>&quot;Template Kit&quot;</code></li>
<li>Subtitle: <code>&quot;Production-ready layouts for social, print, and digital. Drag content in, brand stays consistent.&quot;</code></li>
<li>Dark section background</li>
</ul>
<h3>9.1 Social Media Templates</h3>
<p>Each template rendered as a live React component at actual aspect ratio (scaled down). Background: <code>#151515</code> card with <code>1px solid rgba(255,255,255,0.10)</code> border. Padding: <code>32px</code>.</p>
<p><strong>Instagram Post (1080x1080 / 1:1)</strong></p>
<ul>
<li>Layout: Full-bleed background image zone (60% of height) + text zone below</li>
<li>Text zone: <code>#0C0C0C</code> background</li>
<li>Headline: Syne 800, 28px, <code>#FDF6EC</code>, uppercase, max 2 lines</li>
<li>Body: Space Grotesk 400, 14px, <code>#8A847C</code>, max 3 lines</li>
<li>Bottom bar: JetBrains Mono 500, 10px, <code>#E85D26</code>, <code>&quot;AHEADOFMARKET.COM&quot;</code>, <code>tracking: 0.2em</code></li>
<li>Orange accent: <code>3px</code> left border on text zone, <code>#E85D26</code></li>
<li>Variant: Stats template (Syne 900 56px orange stat number center, label below)</li>
</ul>
<p><strong>Instagram Story / Reel Cover (1080x1920 / 9:16)</strong></p>
<ul>
<li>Layout: Full-bleed image (top 65%) + gradient overlay into text zone</li>
<li>Gradient: <code>linear-gradient(to bottom, transparent 40%, #0C0C0C 75%)</code></li>
<li>Headline: Syne 800, 36px, <code>#FDF6EC</code>, uppercase, bottom-aligned in gradient zone</li>
<li>Logo: <code>AOM.</code> with orange dot, bottom-right corner, <code>16px</code></li>
<li>Category label: JetBrains Mono 700, 11px, <code>#E85D26</code>, uppercase, above headline</li>
</ul>
<p><strong>LinkedIn Post (1200x628 / ~1.91:1)</strong></p>
<ul>
<li>Layout: Split 50/50 vertical. Left: image zone. Right: content zone on <code>#0C0C0C</code>.</li>
<li>Headline: Syne 800, 24px, <code>#FDF6EC</code>, uppercase</li>
<li>Body: Space Grotesk 400, 14px, <code>#8A847C</code></li>
<li>CTA strip at bottom: <code>#E85D26</code> background, Space Grotesk 600, 12px, <code>#FFFFFF</code>, uppercase</li>
<li>AOM logo: top-right of content zone</li>
</ul>
<p><strong>Before/After Split</strong></p>
<ul>
<li>Layout: Two images side by side, <code>2px</code> divider in <code>#E85D26</code></li>
<li>Labels: JetBrains Mono 700, 12px, <code>#FDF6EC</code>, positioned over images at bottom</li>
<li>Bottom strip: <code>#0C0C0C</code>, company name left, AOM logo right</li>
<li>Works for construction (before/after site work) and brand (before/after redesign)</li>
</ul>
<p><strong>Testimonial Card</strong></p>
<ul>
<li>Layout: Centered on <code>#0C0C0C</code></li>
<li>Large open-quote: Syne 800, 64px, <code>#E85D26</code>, <code>opacity: 0.3</code></li>
<li>Quote: Space Grotesk 400, 18px, <code>#F0ECE6</code>, italic, centered, max <code>35ch</code></li>
<li>Attribution: Space Grotesk 600, 14px, <code>#F0ECE6</code> name + Space Grotesk 400, 13px, <code>#8A847C</code> company</li>
<li>Orange accent: <code>2px</code> line above quote, <code>48px</code> wide, centered</li>
</ul>
<p><strong>Quick Tip / Educational</strong></p>
<ul>
<li>Layout: Full <code>#0C0C0C</code> background</li>
<li>Top: JetBrains Mono 700, 12px, <code>#E85D26</code>, category label (e.g., <code>&quot;CONSTRUCTION TIP&quot;</code>)</li>
<li>Number: Syne 900, 80px, <code>rgba(232,93,38,0.15)</code>, positioned as watermark behind text</li>
<li>Headline: Syne 800, 28px, <code>#FDF6EC</code>, uppercase</li>
<li>Body: Space Grotesk 400, 16px, <code>#8A847C</code>, 3-4 lines max</li>
<li>Bottom: AOM logo + <code>aheadofmarket.com</code></li>
</ul>
<h3>9.2 Presentation Templates</h3>
<p><strong>Slide: Title Slide</strong></p>
<ul>
<li>Background: <code>#0C0C0C</code></li>
<li>AOM logo: top-left, <code>max-height: 28px</code></li>
<li>Title: Syne 800, 48px, <code>#FDF6EC</code>, centered vertically, max <code>800px</code> width</li>
<li>Subtitle: Space Grotesk 400, 18px, <code>#8A847C</code>, below title</li>
<li>Date/presenter: JetBrains Mono 500, 12px, <code>#8A847C</code>, bottom-left</li>
<li>Pattern strip: diagonal lines at very bottom, <code>4px</code> height</li>
</ul>
<p><strong>Slide: Content Slide</strong></p>
<ul>
<li>Background: <code>#0C0C0C</code></li>
<li>Section label: JetBrains Mono 700, 12px, <code>#E85D26</code>, top-left</li>
<li>Headline: Syne 800, 36px, <code>#FDF6EC</code>, below label</li>
<li>Body zone: max <code>800px</code>, Space Grotesk 400, 16px, <code>#8A847C</code></li>
<li>Page number: JetBrains Mono 400, 11px, <code>#5A5550</code>, bottom-right</li>
</ul>
<p><strong>Slide: Data/Stats Slide</strong></p>
<ul>
<li>Background: <code>#0C0C0C</code></li>
<li>3 stat blocks in a row (same layout as /v2 Slide 2 stats)</li>
<li>Each: Syne 900, 56px, <code>#E85D26</code> number + Space Grotesk 600, 13px, <code>#8A847C</code> label</li>
<li>Left border on each stat: <code>2px solid rgba(232,93,38,0.2)</code></li>
</ul>
<h3>9.3 Print Templates (Show as Preview Cards)</h3>
<p>These can&#39;t be live React components at print resolution, but show preview cards with specs.</p>
<p><strong>Business Card</strong></p>
<ul>
<li>Front: <code>#0C0C0C</code> background, AOM logo centered, orange dot</li>
<li>Back: <code>#FDF6EC</code> background, name (Syne 700, 14pt), title (Space Grotesk 400, 10pt), contact info (Space Grotesk 400, 9pt), pattern strip at top edge</li>
<li>Dimensions: 3.5&quot; x 2&quot; standard</li>
</ul>
<p><strong>Letterhead</strong></p>
<ul>
<li>AOM logo top-left (stacked lockup)</li>
<li>Pattern strip at very top, <code>3mm</code> height</li>
<li>Body zone: Space Grotesk, 11pt body</li>
<li>Footer: contact info in JetBrains Mono 8pt, <code>#8A847C</code></li>
</ul>
<h3>9.4 Template Kit Interaction</h3>
<p>Each template card should have:</p>
<ul>
<li>Live rendered preview (React component, not an image)</li>
<li>Template name: Space Grotesk 600, 16px, <code>#F0ECE6</code></li>
<li>Dimensions: JetBrains Mono 500, 11px, <code>#8A847C</code></li>
<li>Usage note: Space Grotesk 400, 14px, <code>#8A847C</code></li>
<li>Hover: card border <code>rgba(232,93,38,0.2)</code>, slight lift (<code>translateY(-2px)</code>)</li>
<li>Future: download button for PNG/PDF export</li>
</ul>
<hr>
<h2>PART 3: System Integration (Steffen-Callable Templates)</h2>
<p>This is the long-term vision: templates should be callable by agents in the system to produce brand-consistent designs without manual layout work.</p>
<h3>Template Schema</h3>
<p>Each template should have a JSON schema that agents can populate:</p>
<pre><code class="language-json">{
  &quot;template&quot;: &quot;ig-post-stat&quot;,
  &quot;data&quot;: {
    &quot;stat&quot;: &quot;150%&quot;,
    &quot;statLabel&quot;: &quot;Pipeline Growth&quot;,
    &quot;headline&quot;: &quot;Content That Converts&quot;,
    &quot;body&quot;: &quot;We turned posting into pipeline for Naamly.&quot;,
    &quot;image&quot;: null,
    &quot;category&quot;: &quot;CASE STUDY&quot;
  }
}
</code></pre>
<p><strong>For Bobby (v1):</strong> Don&#39;t build the JSON ingestion yet. Just structure the template components so they accept props cleanly. Each template should be a self-contained React component that takes <code>{ headline, body, stat, image, category }</code> or similar. This makes the eventual API integration trivial.</p>
<p><strong>For Bobby (v2):</strong> Add a Supabase endpoint or serverless function that accepts the JSON, renders the template with Playwright, and returns a PNG. This is how Steffen (and eventually Tony, Cleo) will generate brand-consistent social posts programmatically.</p>
<h3>Template Component Naming Convention</h3>
<pre><code>TemplateSocialIGPost.jsx
TemplateSocialIGStory.jsx
TemplateSocialLinkedIn.jsx
TemplateSocialBeforeAfter.jsx
TemplateSocialTestimonial.jsx
TemplateSocialQuickTip.jsx
TemplatePresentationTitle.jsx
TemplatePresentationContent.jsx
TemplatePresentationStats.jsx
</code></pre>
<p>Each lives in <code>src/components/templates/</code> and is imported into the brand page for the showcase display.</p>
<hr>
<h2>PART 4: Page Structure Updates</h2>
<h3>Navigation</h3>
<p>The brand page currently has its own <code>ArrowLeft</code> back button and no site nav. Per the wave 5 review, it needs the shared <code>&lt;SiteNav variant=&quot;minimal&quot; /&gt;</code> component once Bobby builds it.</p>
<p><strong>Interim fix:</strong> Add <code>AOM.</code> logo (Syne 800, text-2xl, with orange dot) top-left, linking to <code>/</code>. Match the homepage nav&#39;s logo exactly.</p>
<h3>URL</h3>
<p>Currently at <code>/brand/v4</code>. Once updates ship, redirect <code>/brand</code> to <code>/brand/v4</code> (or rename the route to just <code>/brand</code>). The v4 qualifier made sense during iteration; now it&#39;s THE brand page.</p>
<h3>Performance</h3>
<p>The page is ~2200 lines in one file. With templates, it&#39;ll push to ~3000+. Bobby should consider code-splitting: lazy-load sections below the fold. The Brand Mark section loads immediately; Color System and beyond load as the user scrolls. <code>React.lazy</code> + <code>IntersectionObserver</code> or Framer Motion <code>whileInView</code>.</p>
<h3>Table of Contents</h3>
<p>Add a sticky sidebar table of contents on desktop (hidden on mobile). Lists all 9 sections. Active section highlighted in <code>#E85D26</code>. Click to jump. This is a long page; users need a map.</p>
<p><strong>Sidebar specs:</strong></p>
<ul>
<li>Position: fixed, left side, <code>left: 24px</code>, vertically centered</li>
<li>Width: <code>140px</code></li>
<li>Each item: Space Grotesk 500, 13px, <code>#8A847C</code></li>
<li>Active item: <code>#E85D26</code>, <code>font-weight: 600</code></li>
<li>Connecting line: <code>1px solid rgba(255,255,255,0.06)</code> between items</li>
<li>Visibility: hidden below <code>1280px</code> width (not enough room)</li>
</ul>
<hr>
<h2>Summary for Bobby</h2>
<p>This is a two-phase update:</p>
<p><strong>Phase 1 (immediate):</strong></p>
<ol>
<li>Fix logo fill color (<code>#F2EDE8</code> -&gt; <code>#F0ECE6</code>)</li>
<li>Fix sub-12px label sizes</li>
<li>Add JetBrains Mono specimen to Typography section</li>
<li>Add missing color swatches</li>
<li>Add AOM logo nav + breadcrumb</li>
<li>Redirect <code>/brand</code> to <code>/brand/v4</code></li>
</ol>
<p><strong>Phase 2 (template kit):</strong>
7. Build Section 9: Template Kit with 6 social templates, 3 presentation templates, 2 print preview cards
8. Structure templates as prop-driven React components in <code>src/components/templates/</code>
9. Add sticky table of contents sidebar
10. Code-split for performance</p>
<p>Phase 1 is a few hours of cleanup. Phase 2 is the real expansion Patrik asked for.</p>
`,s={title:e,slug:o,category:t,agent:n,date:i,dateFormatted:a,updated:null,summary:d,tags:l,content:c};export{n as agent,t as category,c as content,i as date,a as dateFormatted,s as default,o as slug,d as summary,l as tags,e as title,r as updated};
