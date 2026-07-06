const t="Steffen Logo Skill Upgrade Research",n="steffen-logo-skill-research",e="Technical",o="Elon",i="2026-03-09",l="Mar 9",c=null,r="Research on giving Steffen real logo creation capabilities using SVG in React.",s=[],a=`<h1>Steffen Logo Skill Upgrade: Research Report</h1>
<p><em>Generated: 2026-03-09 by Elon (sys agent)</em>
<em>Purpose: Research what it takes to give Steffen real logo creation capabilities using SVG in React</em></p>
<hr>
<h2>1. What Claude Code Agents Can Actually Do for Logo/Graphic Creation</h2>
<h3>Current Capability: Inline SVG in React Components</h3>
<p>Claude Code agents can write SVG directly inside JSX. This is already happening in the Ambition codebase:</p>
<ul>
<li><code>IconGlyph.jsx</code> renders icon SVGs from a path data library (<code>utils/icons.js</code>)</li>
<li><code>Header.jsx</code> uses inline SVGs for phone icons, social icons, and the fallback logo (gradient dot + text)</li>
<li><code>RoughUnderline.jsx</code> uses SVG for decorative line elements</li>
<li><code>Footer.jsx</code> contains social media icon SVGs</li>
</ul>
<p>The existing approach is <strong>functional but basic</strong>. The &quot;logo&quot; is a CSS gradient dot + styled text spans. No actual logo mark exists as SVG.</p>
<h3>What SVG Can Do (Full Capability List)</h3>
<p>SVG in React supports everything the SVG spec offers:</p>
<p><strong>Shapes and Paths</strong></p>
<ul>
<li>Basic shapes: <code>&lt;rect&gt;</code>, <code>&lt;circle&gt;</code>, <code>&lt;ellipse&gt;</code>, <code>&lt;line&gt;</code>, <code>&lt;polygon&gt;</code>, <code>&lt;polyline&gt;</code></li>
<li>Complex paths: <code>&lt;path&gt;</code> with full bezier curve support (C, S, Q, T commands)</li>
<li>Compound paths: Multiple subpaths in a single <code>&lt;path&gt;</code> element (for cutouts/negative space)</li>
</ul>
<p><strong>Transforms and Composition</strong></p>
<ul>
<li><code>transform</code>: translate, rotate, scale, skewX, skewY, matrix</li>
<li><code>&lt;g&gt;</code> grouping for hierarchical transforms</li>
<li><code>&lt;use&gt;</code> for reusable elements (symmetry, patterns)</li>
<li><code>&lt;clipPath&gt;</code> for masking shapes with other shapes</li>
<li><code>&lt;mask&gt;</code> for opacity-based masking (soft edges, fades)</li>
</ul>
<p><strong>Visual Effects</strong></p>
<ul>
<li><code>&lt;linearGradient&gt;</code> and <code>&lt;radialGradient&gt;</code> with multiple stops</li>
<li><code>&lt;filter&gt;</code> chains: blur, shadow, glow, noise, displacement</li>
<li><code>&lt;pattern&gt;</code> for repeating textures</li>
<li><code>mix-blend-mode</code> for blending</li>
<li><code>opacity</code> and <code>fill-opacity</code> for layered transparency</li>
</ul>
<p><strong>Typography</strong></p>
<ul>
<li><code>&lt;text&gt;</code> with font-family, font-weight, letter-spacing</li>
<li><code>&lt;textPath&gt;</code> for text along a curve</li>
<li>But NOT text-to-outlines (this requires external tools, covered below)</li>
</ul>
<h3>What Looks Good vs What Looks Amateur</h3>
<p><strong>Looks professional:</strong></p>
<ul>
<li>Geometric construction (circles, rectangles, golden ratio guides visible in the underlying geometry)</li>
<li>Consistent stroke weights</li>
<li>Optical alignment (visually centered, not mathematically centered)</li>
<li>Intentional negative space</li>
<li>Clean, minimal path data (optimized curves, not overly complex)</li>
<li>Works at all sizes (favicon to billboard)</li>
</ul>
<p><strong>Looks generated/amateur:</strong></p>
<ul>
<li>Too many anchor points in curves (wobbly, not confident lines)</li>
<li>Arbitrary proportions (no underlying geometric system)</li>
<li>Effects used as a crutch (drop shadows, gradients masking weak form)</li>
<li>Doesn&#39;t scale down cleanly</li>
<li>Overly complex for no reason</li>
<li>Inconsistent visual weight across elements</li>
</ul>
<h3>Honest Limitations</h3>
<ol>
<li><strong>No visual feedback loop.</strong> Claude can write SVG but can&#39;t see the render. Steffen writes blind. The agent needs to either use Elmer (Playwright screenshots) to verify output, or Patrik eyeballs it.</li>
<li><strong>No freehand illustration.</strong> SVG paths must be described numerically. Organic, hand-drawn marks are possible but extremely tedious to author by hand.</li>
<li><strong>No font-to-path conversion natively.</strong> Custom wordmarks require either a tool pipeline or manually tracing letterforms.</li>
<li><strong>Complex illustrations are impractical.</strong> A logomark built from geometric primitives? Excellent. An illustrated mascot? Not realistic by hand in code.</li>
</ol>
<hr>
<h2>2. Best Practices for SVG Logo Design in Code</h2>
<h3>Geometric Construction Principles</h3>
<p>Professional logo designers use geometric construction. A Claude agent can do this too, by building logos from mathematical relationships rather than freehand drawing.</p>
<p><strong>Golden Ratio (1.618:1)</strong></p>
<pre><code class="language-jsx">// Golden ratio rectangle as construction guide
const PHI = 1.618;
const baseUnit = 40;
const width = baseUnit * PHI;  // 64.72
const height = baseUnit;       // 40

// Golden circles for curve construction
const largeR = baseUnit;
const smallR = baseUnit / PHI;  // 24.72
</code></pre>
<p><strong>Grid-Based Construction</strong></p>
<pre><code class="language-jsx">// Logo built on an 8-unit grid ensures clean proportions
const GRID = 8;
// All coordinates snap to multiples of GRID
// x: 0, 8, 16, 24, 32, 40, 48, 56, 64
// This is how Apple, Google, and Airbnb construct their marks
</code></pre>
<p><strong>Optical Alignment</strong></p>
<ul>
<li>Circles and triangles must extend ~3-4% beyond the bounding box to appear the same size as squares</li>
<li>Pointed shapes at the top of a mark should overshoot slightly</li>
<li>Horizontal elements in text-heavy marks should be slightly above mathematical center</li>
</ul>
<h3>Advanced Path Techniques</h3>
<p><strong>Clean Bezier Curves</strong></p>
<pre><code class="language-jsx">// GOOD: Smooth S-curve with minimal control points
&lt;path d=&quot;M 10,80 C 40,10 65,10 95,80&quot; /&gt;

// BAD: Too many points creating a wobbly curve
&lt;path d=&quot;M 10,80 C 20,60 30,40 40,25 C 50,15 55,12 60,12 C 65,12 70,15 80,40 C 85,55 90,70 95,80&quot; /&gt;
</code></pre>
<p><strong>Compound Paths (Negative Space / Cutouts)</strong></p>
<pre><code class="language-jsx">// Letter &quot;O&quot; with counter (hole) using fill-rule
&lt;path
  fillRule=&quot;evenodd&quot;
  d=&quot;M 50,10 A 40,40 0 1,1 50,90 A 40,40 0 1,1 50,10 Z
     M 50,25 A 25,25 0 1,0 50,75 A 25,25 0 1,0 50,25 Z&quot;
/&gt;
// Outer path clockwise, inner path counter-clockwise = cutout
</code></pre>
<p><strong>Boolean-Style Operations in Pure SVG</strong></p>
<pre><code class="language-jsx">// Simulate subtraction using clipPath
&lt;defs&gt;
  &lt;clipPath id=&quot;subtract&quot;&gt;
    &lt;rect x=&quot;0&quot; y=&quot;0&quot; width=&quot;100&quot; height=&quot;100&quot; /&gt;
    {/* The &quot;hole&quot; */}
    &lt;circle cx=&quot;50&quot; cy=&quot;50&quot; r=&quot;20&quot; /&gt;
  &lt;/clipPath&gt;
&lt;/defs&gt;
&lt;rect x=&quot;0&quot; y=&quot;0&quot; width=&quot;100&quot; height=&quot;100&quot; clipPath=&quot;url(#subtract)&quot; /&gt;
</code></pre>
<h3>Professional Logo Component Pattern</h3>
<pre><code class="language-jsx">// A well-structured logo component for React
function AmbitionMark({ size = 48, className = &#39;&#39; }) {
  // All dimensions relative to a base unit for perfect scaling
  const unit = size / 12; // 12-unit grid

  return (
    &lt;svg
      width={size}
      height={size}
      viewBox=&quot;0 0 120 120&quot;
      fill=&quot;none&quot;
      xmlns=&quot;http://www.w3.org/2000/svg&quot;
      className={className}
      role=&quot;img&quot;
      aria-label=&quot;Ambition Mechanical&quot;
    &gt;
      {/* Definitions: gradients, clips, filters */}
      &lt;defs&gt;
        &lt;linearGradient id=&quot;am-grad&quot; x1=&quot;0&quot; y1=&quot;0&quot; x2=&quot;1&quot; y2=&quot;1&quot;&gt;
          &lt;stop offset=&quot;0%&quot; stopColor=&quot;#dc2626&quot; /&gt;
          &lt;stop offset=&quot;100%&quot; stopColor=&quot;#0ea5e9&quot; /&gt;
        &lt;/linearGradient&gt;
      &lt;/defs&gt;

      {/* Mark built from geometric primitives */}
      {/* ... */}
    &lt;/svg&gt;
  );
}
</code></pre>
<h3>What Makes a Logo Look Hand-Crafted, Not Generated</h3>
<ol>
<li><strong>Subtle imperfections on purpose.</strong> Slightly unequal stroke terminals. A curve that&#39;s 98% of a perfect circle. These read as &quot;designed&quot; not &quot;computed.&quot;</li>
<li><strong>Negative space tells a story.</strong> The FedEx arrow. The NBC peacock. The hidden meaning is what makes people remember it.</li>
<li><strong>Restraint.</strong> Fewer elements, more refinement on each one. A mark with 3 shapes is better than 12.</li>
<li><strong>Typography integration.</strong> The mark and wordmark should share DNA (angles, proportions, weight).</li>
<li><strong>Context-aware construction.</strong> A mechanical contractor&#39;s logo should reference precision, tools, engineering. Not abstract swooshes.</li>
</ol>
<hr>
<h2>3. Tools and APIs Worth Wiring In</h2>
<h3>Image Generation APIs (for reference/inspiration, not final logos)</h3>
<p><strong>DALL-E 3 (OpenAI API)</strong></p>
<ul>
<li>Could generate logo concepts as raster images for Steffen to reference when building SVG</li>
<li>$0.04-0.08 per image</li>
<li>Limitation: outputs PNG, not SVG. Would need manual SVG translation.</li>
<li>Best use: &quot;Show me 5 concept directions for a mechanical contractor mark&quot; then Steffen builds the SVG from the best concept</li>
</ul>
<p><strong>Flux (via Replicate or BFL API)</strong></p>
<ul>
<li>Better at clean, graphic outputs than DALL-E in some cases</li>
<li>Similar limitation: raster output only</li>
</ul>
<p><strong>Verdict:</strong> Image gen is useful for ideation/moodboarding, not for final logo output. Steffen would still need to build the SVG by hand. Worth wiring in as a brainstorming step, not a production step.</p>
<h3>SVG Optimization: SVGO</h3>
<p><strong>What it does:</strong> Optimizes SVG files by removing unnecessary metadata, merging paths, simplifying transforms, removing hidden elements.</p>
<p><strong>Why it matters:</strong> Claude-generated SVGs tend to be verbose. SVGO cleans them up for production.</p>
<pre><code class="language-bash">npm install -D svgo
# or run via npx
npx svgo input.svg -o output.svg
</code></pre>
<p><strong>Integration:</strong> After Steffen generates a logo SVG, run it through SVGO automatically. Can be a post-processing step in the skill.</p>
<p>Key SVGO plugins for logos:</p>
<ul>
<li><code>removeTitle</code> / <code>removeDesc</code> (keep aria-label on the component instead)</li>
<li><code>mergePaths</code> (combine adjacent paths)</li>
<li><code>convertShapeToPath</code> (normalize everything to paths)</li>
<li><code>removeDimensions</code> (use viewBox only for scaling)</li>
<li><code>cleanupNumericValues</code> (round coordinates to 2 decimals)</li>
</ul>
<h3>NPM Packages for Programmatic SVG</h3>
<p><strong>paper.js</strong></p>
<ul>
<li>Full 2D vector graphics library</li>
<li>Boolean operations (unite, intersect, subtract, exclude) on paths</li>
<li>Path simplification (reduce anchor points while maintaining shape)</li>
<li>Could run in Node.js for path computation, then export SVG path data for React</li>
<li><strong>High value for logo work.</strong> Boolean operations are the #1 missing capability.</li>
</ul>
<p><strong>opentype.js</strong></p>
<ul>
<li>Parse and render OpenType/TrueType fonts in JavaScript</li>
<li><strong>Converts text to SVG path outlines.</strong> This is the font-to-path tool Steffen needs for custom wordmarks.</li>
<li>Can extract individual letter paths, modify them, then output as SVG <code>&lt;path&gt;</code> data.</li>
<li>Works in Node.js and browser.</li>
</ul>
<pre><code class="language-javascript">import opentype from &#39;opentype.js&#39;;

// Load a font file
const font = await opentype.load(&#39;path/to/font.otf&#39;);

// Convert text to SVG path data
const path = font.getPath(&#39;AMBITION&#39;, 0, 100, 72);
const svgPathData = path.toPathData(2); // 2 decimal precision

// Now you have the exact letter outlines as SVG path data
// Can be used in &lt;path d={svgPathData} /&gt; in React
</code></pre>
<p><strong>This is the single highest-impact tool for Steffen.</strong> It turns any font into editable vector outlines. Custom wordmarks become trivial.</p>
<p><strong>svg-path-commander</strong></p>
<ul>
<li>Path manipulation: reverse, split, join, transform, normalize</li>
<li>Get path bounding box, length, point-at-length</li>
<li>Useful for aligning and composing logo elements programmatically</li>
</ul>
<p><strong>d3-shape / d3-path</strong></p>
<ul>
<li>Programmatic path generation with arc, curve, line generators</li>
<li>Overkill for logos but useful if building data-driven graphic elements</li>
</ul>
<p><strong>Snap.svg / SVG.js</strong></p>
<ul>
<li>DOM manipulation libraries for SVG</li>
<li>Less relevant for React (where SVG is JSX), but Snap.svg&#39;s path utilities could be useful for computation</li>
</ul>
<h3>Font Resources for Wordmark Conversion</h3>
<p><strong>Google Fonts API</strong> (already in Steffen&#39;s knowledge sources)</p>
<ul>
<li>Download .ttf/.otf files programmatically</li>
<li>Feed into opentype.js for path conversion</li>
</ul>
<p><strong>Fontsource</strong></p>
<ul>
<li>NPM packages for every Google Font</li>
<li><code>npm install @fontsource/inter</code> already bundles the font files</li>
<li>Can load the .woff2/.ttf and pass to opentype.js</li>
</ul>
<h3>Recommended Tool Stack for Steffen</h3>
<table>
<thead>
<tr>
<th>Tool</th>
<th>Purpose</th>
<th>Priority</th>
</tr>
</thead>
<tbody><tr>
<td>opentype.js</td>
<td>Font-to-path conversion for wordmarks</td>
<td>HIGH</td>
</tr>
<tr>
<td>paper.js</td>
<td>Boolean operations, path simplification</td>
<td>HIGH</td>
</tr>
<tr>
<td>SVGO</td>
<td>Post-processing SVG optimization</td>
<td>MEDIUM</td>
</tr>
<tr>
<td>svg-path-commander</td>
<td>Path manipulation and alignment</td>
<td>MEDIUM</td>
</tr>
<tr>
<td>DALL-E API</td>
<td>Concept ideation (raster, not final)</td>
<td>LOW</td>
</tr>
</tbody></table>
<hr>
<h2>4. Current State of Steffen&#39;s Capabilities</h2>
<h3>What Steffen Has Now</h3>
<p><strong>Skill file</strong> (<code>.claude/skills/brand-agent/SKILL.md</code>):</p>
<ul>
<li>5-image ingestion and analysis workflow</li>
<li>Color extraction and palette construction</li>
<li>Typography recommendations</li>
<li>Brand guidelines document output</li>
<li>Direction options (2-3 choices) before finalizing</li>
<li>Handoff specs for Bobby, Cleo, Tony</li>
</ul>
<p><strong>Agent file</strong> (<code>projects/steffen/AGENT.md</code>):</p>
<ul>
<li>Infinity ring loop for continuous brand integrity</li>
<li>Construction vertical research completed</li>
<li>Ambition brand guidelines v1.0 delivered</li>
</ul>
<p><strong>Knowledge sources</strong> (<code>projects/steffen/knowledge-sources.md</code>):</p>
<ul>
<li>Color APIs and datasets (The Color API, Color-Pedia, Open Color, Material Design)</li>
<li>Typography resources (Google Fonts API, Fontpair, Typewolf)</li>
<li>Brand identity galleries (Brand New, Behance, 99designs)</li>
<li>Design system references (Carbon, Primer, Polaris)</li>
<li>Construction-specific brand patterns</li>
</ul>
<p><strong>Ambition brand guidelines</strong> (<code>projects/steffen/ambition-brand-guidelines.md</code>):</p>
<ul>
<li>Complete color system documented</li>
<li>Typography system (Inter) documented</li>
<li>Photography/video direction</li>
<li>Social media guidelines</li>
<li>Brand voice guide</li>
<li><strong>Logo section explicitly calls out: &quot;Logo SVG is MISSING. Needs creation.&quot;</strong></li>
</ul>
<h3>What&#39;s Missing</h3>
<ol>
<li><strong>Zero logo creation capability.</strong> Steffen can analyze, recommend, and document. He cannot create.</li>
<li><strong>No SVG knowledge.</strong> The skill file has no reference material on SVG construction techniques.</li>
<li><strong>No tool pipeline.</strong> No access to opentype.js, paper.js, or SVGO for programmatic SVG work.</li>
<li><strong>No design principles reference.</strong> Geometric construction, golden ratio, optical alignment are not in his training/context.</li>
<li><strong>No pattern library.</strong> No reusable SVG elements or construction templates to draw from.</li>
</ol>
<hr>
<h2>5. Proposed Skill Upgrade for Steffen</h2>
<h3>A. New Reference File: <code>references/svg-logo-design.md</code></h3>
<p>A comprehensive reference document Steffen can read before any logo task. Should contain:</p>
<ol>
<li><p><strong>Geometric construction cheat sheet</strong></p>
<ul>
<li>Golden ratio proportions and how to apply them</li>
<li>Grid-based construction (8-unit, 12-unit)</li>
<li>Circle-packing for curved marks</li>
<li>Optical alignment rules (overshoot values for circles, triangles)</li>
</ul>
</li>
<li><p><strong>SVG technique reference</strong></p>
<ul>
<li>Path command reference (M, L, C, S, Q, T, A, Z)</li>
<li>Bezier curve best practices (minimal anchor points, smooth handles)</li>
<li>Compound paths and fill-rule for negative space</li>
<li>Gradient definitions (linear, radial) with examples</li>
<li>clipPath and mask usage</li>
<li>Filter effects (drop shadow, glow, blur)</li>
</ul>
</li>
<li><p><strong>Logo anatomy</strong></p>
<ul>
<li>Logomark (the symbol/icon)</li>
<li>Logotype/wordmark (the text treatment)</li>
<li>Lockup (mark + type combined, with spacing rules)</li>
<li>Clear space rules</li>
<li>Minimum size specifications</li>
<li>Color variations (full color, single color, reversed, dark bg, light bg)</li>
</ul>
</li>
<li><p><strong>React component patterns</strong></p>
<ul>
<li>Responsive SVG component structure</li>
<li>viewBox usage for scaling</li>
<li>Accessibility (role=&quot;img&quot;, aria-label)</li>
<li>CSS variable integration for theme-aware logos</li>
<li>Animation-ready structure (Framer Motion compatibility)</li>
</ul>
</li>
</ol>
<h3>B. SVG Element Library: <code>references/svg-patterns/</code></h3>
<p>Pre-built SVG elements Steffen can compose into logos:</p>
<ul>
<li><strong>Geometric primitives:</strong> Perfect circles, golden rectangles, equilateral triangles, hexagons, octagons</li>
<li><strong>Construction industry marks:</strong> Wrench forms, gear outlines, bolt heads, pipe angles, duct shapes, building silhouettes, roofline angles</li>
<li><strong>Letterform construction guides:</strong> How to build custom A, M, B letters from geometric shapes</li>
<li><strong>Common logo structures:</strong> Monogram frames (circle, shield, diamond, hexagon), badge layouts, split compositions</li>
</ul>
<h3>C. Tool Pipeline Addition to SKILL.md</h3>
<p>Add a new section to the brand agent skill:</p>
<pre><code>## Logo Creation Process

### Step 0: Concept (if image gen API is available)
Generate 3-5 concept sketches using image generation API.
Show to Patrik for direction selection before building SVG.

### Step 1: Construction
Build the mark on a geometric grid.
Use golden ratio proportions where applicable.
Start with basic shapes, refine with bezier curves.

### Step 2: Wordmark
Use opentype.js to convert the chosen font to SVG path outlines.
Modify letterforms for custom wordmark treatment.
Ensure mark and wordmark share visual DNA (angles, weights).

### Step 3: Lockup
Combine mark + wordmark with precise spacing.
Define horizontal, stacked, and icon-only variants.

### Step 4: Variations
- Full color on dark background
- Full color on light background
- Single color (white)
- Single color (black)
- Favicon/small format (simplified mark only)

### Step 5: Optimize
Run through SVGO for production-ready SVG.
Verify rendering at: 16px (favicon), 32px (tab), 48px (nav), 200px (hero), 800px+ (print).

### Step 6: React Component
Export as a React component with:
- Size prop (responsive scaling via viewBox)
- Variant prop (full, mark-only, wordmark-only)
- Color scheme prop (dark, light, mono)
- className pass-through
</code></pre>
<h3>D. Install Script for Tools</h3>
<pre><code class="language-bash"># In the AMBITION repo (or wherever logos are built)
npm install opentype.js paper svgo svg-path-commander --save-dev

# Create a logo build utility at src/utils/logo-tools.js
# that wraps these for Steffen&#39;s use
</code></pre>
<h3>E. Verification Step</h3>
<p>Add to the logo creation process: After generating SVG, use Elmer (Playwright screenshots) to render at multiple sizes and verify it looks correct. This closes the &quot;can&#39;t see what I&#39;m building&quot; gap.</p>
<hr>
<h2>6. Example: Professional SVG Logo Techniques</h2>
<h3>Geometric Logomark (HVAC/Mechanical Style)</h3>
<pre><code class="language-jsx">function AmbitionMark({ size = 48, variant = &#39;full&#39; }) {
  return (
    &lt;svg
      width={size}
      height={size}
      viewBox=&quot;0 0 100 100&quot;
      fill=&quot;none&quot;
      xmlns=&quot;http://www.w3.org/2000/svg&quot;
      role=&quot;img&quot;
      aria-label=&quot;Ambition Mechanical&quot;
    &gt;
      &lt;defs&gt;
        &lt;linearGradient id=&quot;brand-gradient&quot; x1=&quot;0%&quot; y1=&quot;0%&quot; x2=&quot;100%&quot; y2=&quot;100%&quot;&gt;
          &lt;stop offset=&quot;0%&quot; stopColor=&quot;#dc2626&quot; /&gt;
          &lt;stop offset=&quot;100%&quot; stopColor=&quot;#0ea5e9&quot; /&gt;
        &lt;/linearGradient&gt;
        &lt;clipPath id=&quot;a-counter&quot;&gt;
          {/* Triangle cutout for the &quot;A&quot; negative space */}
          &lt;polygon points=&quot;50,38 42,58 58,58&quot; /&gt;
        &lt;/clipPath&gt;
      &lt;/defs&gt;

      {/* Outer circle (represents precision, completeness) */}
      &lt;circle
        cx=&quot;50&quot; cy=&quot;50&quot; r=&quot;46&quot;
        stroke=&quot;currentColor&quot;
        strokeWidth=&quot;2.5&quot;
        fill=&quot;none&quot;
      /&gt;

      {/* Stylized &quot;A&quot; mark built from geometric construction */}
      {/* Two angled strokes meeting at apex */}
      &lt;path
        d=&quot;M 30,72 L 50,22 L 70,72&quot;
        stroke=&quot;currentColor&quot;
        strokeWidth=&quot;5&quot;
        strokeLinecap=&quot;round&quot;
        strokeLinejoin=&quot;round&quot;
        fill=&quot;none&quot;
      /&gt;

      {/* Crossbar of the A (slightly above center for optical balance) */}
      &lt;line
        x1=&quot;37&quot; y1=&quot;54&quot;
        x2=&quot;63&quot; y2=&quot;54&quot;
        stroke=&quot;currentColor&quot;
        strokeWidth=&quot;4&quot;
        strokeLinecap=&quot;round&quot;
      /&gt;

      {/* Subtle accent: small gradient element at the apex */}
      &lt;circle cx=&quot;50&quot; cy=&quot;22&quot; r=&quot;4&quot; fill=&quot;url(#brand-gradient)&quot; /&gt;
    &lt;/svg&gt;
  );
}
</code></pre>
<h3>Custom Wordmark Using opentype.js Output</h3>
<pre><code class="language-jsx">// After running: font.getPath(&#39;AMBITION&#39;, 0, 100, 48).toPathData(2)
// You get precise letter outlines as path data

function AmbitionWordmark({ width = 200, className = &#39;&#39; }) {
  return (
    &lt;svg
      width={width}
      viewBox=&quot;0 0 340 60&quot;
      fill=&quot;currentColor&quot;
      xmlns=&quot;http://www.w3.org/2000/svg&quot;
      className={className}
      role=&quot;img&quot;
      aria-label=&quot;Ambition Mechanical&quot;
    &gt;
      {/* Path data from opentype.js conversion of Inter Black */}
      &lt;path d={AMBITION_PATH_DATA} /&gt;

      {/* &quot;MECHANICAL&quot; in lighter weight, offset below */}
      &lt;path
        d={MECHANICAL_PATH_DATA}
        fill=&quot;#0ea5e9&quot;
        transform=&quot;translate(0, 42) scale(0.65)&quot;
      /&gt;
    &lt;/svg&gt;
  );
}
</code></pre>
<h3>Gradient + Glow Effect (Matches Existing Brand)</h3>
<pre><code class="language-jsx">// Recreating the existing gradient dot but as a proper SVG element
&lt;defs&gt;
  &lt;linearGradient id=&quot;am-glow&quot; x1=&quot;0&quot; y1=&quot;0&quot; x2=&quot;1&quot; y2=&quot;0&quot;&gt;
    &lt;stop offset=&quot;0%&quot; stopColor=&quot;#dc2626&quot; /&gt;
    &lt;stop offset=&quot;100%&quot; stopColor=&quot;#0ea5e9&quot; /&gt;
  &lt;/linearGradient&gt;
  &lt;filter id=&quot;glow&quot;&gt;
    &lt;feGaussianBlur stdDeviation=&quot;3&quot; result=&quot;blur&quot; /&gt;
    &lt;feMerge&gt;
      &lt;feMergeNode in=&quot;blur&quot; /&gt;
      &lt;feMergeNode in=&quot;SourceGraphic&quot; /&gt;
    &lt;/feMerge&gt;
  &lt;/filter&gt;
&lt;/defs&gt;

&lt;circle cx=&quot;50&quot; cy=&quot;50&quot; r=&quot;12&quot; fill=&quot;url(#am-glow)&quot; filter=&quot;url(#glow)&quot; /&gt;
</code></pre>
<h3>Negative Space Technique</h3>
<pre><code class="language-jsx">{/* Shield/badge shape with negative space bolt cutout */}
&lt;path
  fillRule=&quot;evenodd&quot;
  d={\`
    M 50,5 L 90,25 L 90,55 Q 90,85 50,95 Q 10,85 10,55 L 10,25 Z
    M 52,30 L 38,55 L 48,55 L 46,75 L 62,48 L 52,48 Z
  \`}
  fill=&quot;currentColor&quot;
/&gt;
{/* First subpath: shield outline (clockwise) */}
{/* Second subpath: lightning bolt cutout (counter-clockwise) */}
{/* evenodd fill-rule creates the negative space */}
</code></pre>
<hr>
<h2>7. Recommended Implementation Order</h2>
<ol>
<li><p><strong>Create <code>references/svg-logo-design.md</code></strong> with geometric construction principles, SVG technique reference, and React component patterns. This is Steffen&#39;s training material. (No external dependencies.)</p>
</li>
<li><p><strong>Install opentype.js in the AMBITION repo.</strong> This is the single highest-leverage tool. Turns any Google Font into editable SVG path outlines. Unlocks custom wordmarks immediately.</p>
</li>
<li><p><strong>Add logo creation process to SKILL.md.</strong> Extend the brand agent skill with the logo workflow (concept, construct, wordmark, lockup, variations, optimize, component).</p>
</li>
<li><p><strong>Build a small SVG element library</strong> at <code>references/svg-patterns/</code> with construction-industry-relevant geometric elements.</p>
</li>
<li><p><strong>Wire SVGO into the post-processing step.</strong> After any SVG output, run optimization.</p>
</li>
<li><p><strong>Add Elmer verification step.</strong> Playwright screenshot at multiple sizes to close the visual feedback gap.</p>
</li>
<li><p><strong>Optional: Wire image generation API</strong> for concept ideation. Low priority since it requires a purchase approval and only helps with brainstorming, not production.</p>
</li>
</ol>
<hr>
<h2>Summary</h2>
<p>Steffen is currently a strong brand strategist with zero production capability for logos. The gap is clear and fixable:</p>
<ul>
<li><strong>Biggest win:</strong> opentype.js for font-to-path conversion. Unlocks custom wordmarks instantly.</li>
<li><strong>Second biggest:</strong> A reference document teaching geometric SVG construction principles. Makes the agent&#39;s output look intentional, not generated.</li>
<li><strong>Third biggest:</strong> SVGO + Elmer verification pipeline. Clean output that&#39;s been visually confirmed.</li>
</ul>
<p>The Ambition brand guidelines already call out &quot;Logo SVG is MISSING&quot; as a gap. This upgrade would let Steffen close that gap himself.</p>
`,u={title:t,slug:n,category:e,agent:o,date:i,dateFormatted:l,updated:null,summary:r,tags:s,content:a};export{o as agent,e as category,a as content,i as date,l as dateFormatted,u as default,n as slug,r as summary,s as tags,t as title,c as updated};
