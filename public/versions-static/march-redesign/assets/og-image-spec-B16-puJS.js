const t="OG Image Design Spec",e="og-image-spec",n="Design Specs",o="Steffen",i="2026-03-10",l="Mar 10",d=null,r="Design spec for AOM Dark OG image, built as HTML/CSS and screenshotted with Playwright.",s=[],a=`<h1>OG Image Design Spec: AOM Dark</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-10
For Bobby to build as HTML/CSS and screenshot with Playwright at 1200x630px.</p>
</blockquote>
<hr>
<h2>Overview</h2>
<p>Dark, premium, immediately recognizable OG image for aheadofmarket.com. Replaces the current cream version. Must pop as a tiny preview card in a sea of LinkedIn/Twitter posts. The dark background is itself the differentiator since most OG images are white or light.</p>
<p><strong>Output:</strong> 1200x630px PNG
<strong>Safe zone:</strong> All text and key elements within center 900x420px (150px inset on sides, 105px inset top/bottom)
<strong>Render method:</strong> Bobby builds as a standalone HTML page, screenshots with Playwright</p>
<hr>
<h2>Background</h2>
<ul>
<li><strong>Base color:</strong> <code>#0A0A08</code> (Night) filling the entire 1200x630 canvas</li>
<li><strong>Noise texture overlay:</strong> SVG <code>feTurbulence</code> fractalNoise at <code>opacity: 0.03</code>, <code>mix-blend-mode: overlay</code>. Same grain treatment as the main site. Adds analog warmth, prevents the background from looking like a flat slab of black.</li>
<li><strong>Subtle gradient wash:</strong> A radial gradient centered at approximately 70% from left, 40% from top. Color: <code>rgba(255, 79, 0, 0.04)</code> fading to transparent. Radius roughly 500px. This is barely visible but prevents the background from feeling dead. It&#39;s a warm ember glow, not a spotlight.</li>
</ul>
<hr>
<h2>Layout (top to bottom, left-aligned within safe zone)</h2>
<p>Everything is left-aligned. No centering. Left alignment feels more editorial and intentional.</p>
<pre><code>+------------------------------------------------------------------+
|                                                                    |
|   [MICRO LABEL]                                                    |
|                                                                    |
|   [ORANGE ACCENT LINE]                                             |
|                                                                    |
|   AOM                                                              |
|                                                                    |
|   [TAGLINE - two lines]                                            |
|                                                                    |
|   [SERVICE TAGS]                                                   |
|                                                                    |
|   [URL]                                         [GEOMETRIC ACCENT] |
|                                                                    |
+------------------------------------------------------------------+
</code></pre>
<h3>Exact vertical positioning (from top of canvas)</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>Y Position</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Micro label</td>
<td>120px</td>
<td>Top of safe zone</td>
</tr>
<tr>
<td>Orange accent line</td>
<td>158px</td>
<td>14px below micro label baseline</td>
</tr>
<tr>
<td>&quot;AOM&quot; logotype</td>
<td>180px (top of text)</td>
<td>22px below accent line</td>
</tr>
<tr>
<td>Tagline line 1</td>
<td>330px</td>
<td>30px below AOM baseline</td>
</tr>
<tr>
<td>Tagline line 2</td>
<td>388px</td>
<td>Flows naturally from line 1</td>
</tr>
<tr>
<td>Service tags</td>
<td>460px</td>
<td>40px below tagline block</td>
</tr>
<tr>
<td>URL</td>
<td>540px</td>
<td>Near bottom of safe zone</td>
</tr>
<tr>
<td>Geometric accent</td>
<td>Vertically centered at 420px</td>
<td>Right side, outside main text column</td>
</tr>
</tbody></table>
<h3>Horizontal positioning</h3>
<ul>
<li>All text elements: left edge at <strong>150px</strong> from left (safe zone start)</li>
<li>Text column max width: <strong>700px</strong> (leaves room for geometric accent on right)</li>
<li>Geometric accent: right edge at <strong>1050px</strong> from left (safe zone end)</li>
</ul>
<hr>
<h2>Elements (detailed)</h2>
<h3>1. Micro Label</h3>
<ul>
<li><strong>Text:</strong> <code>AHEAD OF MARKET</code></li>
<li><strong>Font:</strong> JetBrains Mono, 700 (Bold)</li>
<li><strong>Size:</strong> 11px</li>
<li><strong>Color:</strong> <code>#78716C</code> (Muted Stone)</li>
<li><strong>Style:</strong> Uppercase</li>
<li><strong>Letter spacing:</strong> <code>0.3em</code></li>
</ul>
<h3>2. Orange Accent Line</h3>
<ul>
<li><strong>Width:</strong> 48px</li>
<li><strong>Height:</strong> 2px</li>
<li><strong>Color:</strong> <code>#FF4F00</code> (AOM Orange)</li>
<li><strong>Position:</strong> Left edge aligned with text column (150px from left)</li>
</ul>
<h3>3. &quot;AOM&quot; Logotype</h3>
<ul>
<li><strong>Text:</strong> <code>AOM</code></li>
<li><strong>Font:</strong> Inter Tight, 900 (Black)</li>
<li><strong>Size:</strong> 130px</li>
<li><strong>Color:</strong> <code>#F5F0EB</code> (Warm White)</li>
<li><strong>Style:</strong> Italic, Uppercase</li>
<li><strong>Letter spacing:</strong> <code>-0.02em</code> (tracking-tighter)</li>
<li><strong>Line height:</strong> 0.85</li>
<li><strong>Note:</strong> This is the hero element. It needs to be readable even at thumbnail size (roughly 300x157px on most platforms). 130px at 1200px wide scales down to ~32px at thumbnail, still legible.</li>
</ul>
<h3>4. Tagline</h3>
<ul>
<li><strong>Text line 1:</strong> <code>BRAND INFRASTRUCTURE</code></li>
<li><strong>Text line 2:</strong> <code>FOR COMPANIES THAT BUILD.</code></li>
<li><strong>Font:</strong> Inter Tight, 700 (Bold)</li>
<li><strong>Size:</strong> 36px</li>
<li><strong>Color:</strong> <code>#A8A29E</code> (Stone)</li>
<li><strong>Style:</strong> Uppercase, Normal (not italic, to contrast with AOM above)</li>
<li><strong>Letter spacing:</strong> <code>-0.01em</code></li>
<li><strong>Line height:</strong> 1.2</li>
<li><strong>Note:</strong> Stone color creates clear visual hierarchy. AOM pops in Warm White, tagline supports without competing.</li>
</ul>
<h3>5. Service Tags</h3>
<ul>
<li><strong>Text:</strong> <code>VIDEO  /  SOCIAL  /  WEB  /  AI SYSTEMS</code></li>
<li><strong>Font:</strong> JetBrains Mono, 400 (Regular)</li>
<li><strong>Size:</strong> 13px</li>
<li><strong>Color:</strong> <code>#57534E</code> (Dim)</li>
<li><strong>Letter spacing:</strong> <code>0.1em</code></li>
<li><strong>Note:</strong> These are intentionally dim. They add texture and context but don&#39;t compete with the tagline. The forward slashes have extra spacing (3 spaces on each side) to breathe.</li>
</ul>
<h3>6. URL</h3>
<ul>
<li><strong>Text:</strong> <code>AHEADOFMARKET.COM</code></li>
<li><strong>Font:</strong> JetBrains Mono, 700 (Bold)</li>
<li><strong>Size:</strong> 13px</li>
<li><strong>Color:</strong> <code>#FF4F00</code> (AOM Orange)</li>
<li><strong>Letter spacing:</strong> <code>0.15em</code></li>
<li><strong>Style:</strong> Uppercase</li>
<li><strong>Note:</strong> The only orange text element. Draws the eye to the URL. This is the call to action.</li>
</ul>
<h3>7. Geometric Accent (right side)</h3>
<p>Two overlapping circles, positioned in the right portion of the canvas. Same concept as the current OG image but in dark-mode brand colors.</p>
<ul>
<li><p><strong>Circle 1 (larger):</strong></p>
<ul>
<li>Diameter: 120px</li>
<li>Fill: <code>#FF4F00</code> at 12% opacity (<code>rgba(255, 79, 0, 0.12)</code>)</li>
<li>Border: 1px solid <code>#FF4F00</code> at 20% opacity</li>
<li>Position: center at x=980px, y=390px</li>
</ul>
</li>
<li><p><strong>Circle 2 (smaller):</strong></p>
<ul>
<li>Diameter: 80px</li>
<li>Fill: <code>#7C9A72</code> at 12% opacity (<code>rgba(124, 154, 114, 0.12)</code>)</li>
<li>Border: 1px solid <code>#7C9A72</code> at 20% opacity</li>
<li>Position: center at x=1030px, y=340px (overlapping upper-right of circle 1)</li>
</ul>
</li>
<li><p><strong>Purpose:</strong> Adds visual interest to the right side without text. Orange = creative/production. Sage = systems/AI. The two overlapping = AOM&#39;s dual identity. They&#39;re ghosted (low opacity) so they feel ambient, not distracting.</p>
</li>
</ul>
<h3>8. Diagonal Accent Line (optional, adds edge)</h3>
<ul>
<li>A single thin diagonal line running from approximately (880px, 630px) to (1200px, 200px)</li>
<li><strong>Color:</strong> <code>#292524</code> (Warm Edge / border color)</li>
<li><strong>Width:</strong> 1px</li>
<li><strong>Purpose:</strong> Adds a subtle geometric cut that makes the composition feel designed, not just &quot;text on dark.&quot; At thumbnail size this reads as a faint architectural line. It separates the text zone from the accent zone.</li>
</ul>
<hr>
<h2>What NOT to Include</h2>
<ul>
<li>No logo mark or icon (the &quot;AOM&quot; text IS the logo at this scale)</li>
<li>No photography or imagery</li>
<li>No gradients blobs or heavy color washes</li>
<li>No rounded corners on any element</li>
<li>No drop shadows on text</li>
<li>No secondary CTAs or additional copy</li>
<li>No tagline #2 or #3 from the guidelines. Only the lead candidate.</li>
<li>No border/frame around the image</li>
</ul>
<hr>
<h2>Why This Works at Thumbnail Size</h2>
<p>Most feeds show OG images at roughly 300x157px to 500x260px. At that scale:</p>
<ol>
<li><strong>&quot;AOM&quot; at 130px renders to ~32-54px at thumbnail.</strong> Still bold, still legible. The black italic weight ensures it doesn&#39;t wash out.</li>
<li><strong>Dark background</strong> is immediately distinct from the 90% of OG cards that are white/light. It stops the scroll.</li>
<li><strong>High contrast ratio:</strong> Warm White (#F5F0EB) on Night (#0A0A08) is roughly 18:1. Way above WCAG AAA.</li>
<li><strong>The orange accent line and orange URL</strong> create two anchor points that the eye finds even at small size.</li>
<li><strong>Geometric circles</strong> add visual texture without requiring legibility. They read as &quot;there&#39;s a design here&quot; even at thumbnail.</li>
<li><strong>Left alignment</strong> means the most important content (AOM, tagline) is on the left side, which is exactly where platforms crop when showing narrow previews.</li>
</ol>
<hr>
<h2>HTML/CSS Build Notes for Bobby</h2>
<ul>
<li>Build as a single HTML file with inline styles or a <code>&lt;style&gt;</code> block. No external dependencies except Google Fonts imports.</li>
<li>Canvas: <code>width: 1200px; height: 630px; overflow: hidden; position: relative;</code></li>
<li>Use absolute positioning for all elements (this is a fixed-size graphic, not responsive).</li>
<li>Google Fonts to load: Inter Tight (700, 900 italic), JetBrains Mono (400, 700).</li>
<li>The noise texture can be an inline SVG filter applied to a full-size overlay div.</li>
<li>Geometric circles are simple divs with <code>border-radius: 50%</code>.</li>
<li>Screenshot with Playwright at exactly 1200x630 viewport, <code>deviceScaleFactor: 2</code> for retina quality, then output as PNG.</li>
<li>Save to: <code>/Users/patrik/Documents/Dev/aom-studio/public/og-image.png</code> (replaces existing)</li>
</ul>
<hr>
<p><em>Spec complete. Bobby should be able to build this without asking questions. If anything is ambiguous, default to the brand guidelines.</em></p>
`,g={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:l,updated:null,summary:r,tags:s,content:a};export{o as agent,n as category,a as content,i as date,l as dateFormatted,g as default,e as slug,r as summary,s as tags,t as title,d as updated};
