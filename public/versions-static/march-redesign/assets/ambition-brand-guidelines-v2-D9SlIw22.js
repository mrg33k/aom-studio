const n="Ambition Brand Guidelines v2",e="ambition-brand-guidelines-v2",t="Design Specs",i="Steffen",o="2026-03-09",r="Mar 9",d=null,s="Second iteration of Ambition Mechanical brand guidelines, live at /brands/ambition.",a=[],l=`<h1>Ambition Mechanical Brand Guidelines v2</h1>
<p><strong>Status:</strong> Built. Live at <code>/brands/ambition</code>
<strong>Previous version:</strong> Moved to <code>/brands/ambition/v1</code>
<strong>File:</strong> <code>aom-studio/src/pages/AmbitionBrandGuidelinesV2.jsx</code></p>
<h2>What Changed from v1</h2>
<ul>
<li><strong>Framework:</strong> Tab-based navigation replaced with scrolling single-page (matches AOM brand/v4)</li>
<li><strong>Sections:</strong> Dark/light alternating rhythm with PatternStrip dividers</li>
<li><strong>Typography:</strong> Massively expanded. Live specimens at every scale level. Added <code>Min Mobile</code> column to type scale. Explicit minimum sizes for every role. &quot;Old people can read em, young people love em.&quot;</li>
<li><strong>Spacing System:</strong> Brand new section. Full spacing scale (4px to 128px) with visual reference bars. Context-specific rules for every component type.</li>
<li><strong>Patterns:</strong> Six new industrial/mechanical patterns (Blueprint Grid, Ductwork, Cross Hatch, Diagonal Lines, Hex Bolts, Pipe Run). Different from AOM&#39;s patterns. Construction-grade textures.</li>
<li><strong>Component Library:</strong> Expanded with live button previews, light/dark card variants, credential badge, stat row, section header pattern. All with inline specs.</li>
<li><strong>Section Headers:</strong> Large watermark numbers (AOM v4 style). Badge + section number. Consistent hierarchy.</li>
<li><strong>Logo Section:</strong> Locked logo displayed on dark, light, and brand navy. Clear rules: no modification, minimum clear space, minimum sizes, approved backgrounds.</li>
<li><strong>Color System:</strong> Same colors (spot on, per Patrik). Better organization with visual ratio bar and explicit usage rules.</li>
<li><strong>Website Layout:</strong> Full section-by-section map with background codes and descriptions.</li>
<li><strong>Photography:</strong> Separated into its own section with color grade direction.</li>
<li><strong>Voice and Tone:</strong> Personality spectrum visualization. Hard rules numbered. Tone shifts by context.</li>
<li><strong>Tailwind Config:</strong> Clean drop-in code block with all tokens.</li>
</ul>
<h2>Design Decisions</h2>
<ol>
<li><strong>Logo untouched.</strong> Displayed as-is via <code>/ambition-logo.png</code>. No SVG recreation, no color alterations.</li>
<li><strong>Same fonts</strong> (Barlow Condensed + Inter). These are correct for the brand.</li>
<li><strong>Same colors.</strong> Navy/red/white palette is locked.</li>
<li><strong>Industrial patterns</strong> instead of AOM&#39;s geometric/film-grain patterns. Blueprint grid, ductwork, pipe runs, hex bolts. Construction identity.</li>
<li><strong>Scrolling &gt; tabs.</strong> Better for reviewing the full system. Matches AOM v4.</li>
<li><strong>Generous typography.</strong> Minimum mobile sizes enforced. Body text 15-16px minimum. Headlines clamp down gracefully.</li>
<li><strong>Systematic spacing.</strong> Every value has a token. No magic numbers.</li>
</ol>
<h2>Routing</h2>
<ul>
<li><code>/brands/ambition</code> now loads v2 (AmbitionBrandGuidelinesV2)</li>
<li><code>/brands/ambition/v1</code> preserves the old version for reference</li>
</ul>
`,c={title:n,slug:e,category:t,agent:i,date:o,dateFormatted:r,updated:null,summary:s,tags:a,content:l};export{i as agent,t as category,l as content,o as date,r as dateFormatted,c as default,e as slug,s as summary,a as tags,n as title,d as updated};
