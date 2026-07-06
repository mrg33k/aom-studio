const t="Recraft AI Prompting Guide",e="recraft-prompting-guide",n="Design Specs",o="Steffen",r="2026-03-09",a="Mar 9",d=null,s="Reference guide for generating logos, patterns, and brand assets with Recraft AI.",i=[],l=`<h1>Recraft AI Prompting Guide for Brand &amp; Logo Work</h1>
<blockquote>
<p>Steffen&#39;s reference for generating logos, patterns, brand assets, and visual identity elements with Recraft AI.</p>
</blockquote>
<hr>
<h2>1. Quick Start: How Recraft Works</h2>
<h3>Models</h3>
<table>
<thead>
<tr>
<th>Model</th>
<th>Type</th>
<th>Resolution</th>
<th>Speed</th>
<th>Best For</th>
</tr>
</thead>
<tbody><tr>
<td>Recraft V4</td>
<td>Raster</td>
<td>1024x1024</td>
<td>~10s</td>
<td>General images, mockups</td>
</tr>
<tr>
<td>Recraft V4 Vector</td>
<td>Vector/SVG</td>
<td>1024x1024</td>
<td>~15s</td>
<td>Logos, icons, illustrations</td>
</tr>
<tr>
<td>Recraft V4 Pro</td>
<td>Raster</td>
<td>2048x2048</td>
<td>~30s</td>
<td>High-res brand assets, OG images</td>
</tr>
<tr>
<td>Recraft V4 Pro Vector</td>
<td>Vector/SVG</td>
<td>2048x2048</td>
<td>~45s</td>
<td>Production-ready logos, large-format vectors</td>
</tr>
<tr>
<td>Recraft V3</td>
<td>Raster</td>
<td>1024x1024</td>
<td>~8s</td>
<td>Styled illustrations (has style presets)</td>
</tr>
<tr>
<td>Recraft V3 Vector</td>
<td>Vector/SVG</td>
<td>1024x1024</td>
<td>~12s</td>
<td>Styled vector work (has style presets)</td>
</tr>
</tbody></table>
<p><strong>Key difference:</strong> V4 has better composition, color, and text rendering but does NOT support style presets yet. V3 supports a full library of style presets. For logo/brand work, V3 Vector with style presets is often more controllable; V4 Vector produces higher quality raw output.</p>
<h3>API Authentication</h3>
<pre><code>Authorization: Bearer RECRAFT_API_TOKEN
</code></pre>
<h3>API Basics</h3>
<ul>
<li>REST-based API, compatible with OpenAI Python library</li>
<li>Export formats: SVG, PNG, JPG, PDF, TIFF, Lottie</li>
<li>Generate 1-4 variations per request</li>
<li>Style parameter (V3 only): pass <code>style: &quot;style_name&quot;</code> with the generation request</li>
<li>Model parameter: <code>model: &quot;recraftv3&quot;</code> or <code>model: &quot;recraftv4&quot;</code></li>
</ul>
<h3>Credit System</h3>
<p>Free plan gives 50 daily credits. Each generation costs credits. Premium plans give more credits and commercial ownership rights. Key takeaway: <strong>bad prompts waste credits.</strong> Get the prompt right before generating.</p>
<hr>
<h2>2. Logo Prompting</h2>
<h3>The Logo Prompt Formula</h3>
<pre><code>A [style] logo for [brand/company], [visual elements], [typography details], [color palette], [background], [format cues]
</code></pre>
<p>Every logo prompt should include:</p>
<ol>
<li><strong>Subject/brand name</strong> (the company or text to include)</li>
<li><strong>Style</strong> (minimalist, vintage, geometric, hand-drawn, etc.)</li>
<li><strong>Visual elements</strong> (specific symbols, icons, shapes)</li>
<li><strong>Color palette</strong> (explicit colors, not vague)</li>
<li><strong>Background</strong> (&quot;white background&quot;, &quot;transparent background&quot;, &quot;black background&quot;)</li>
<li><strong>Format cues</strong> (&quot;vector&quot;, &quot;flat design&quot;, &quot;clean edges&quot;, &quot;scalable&quot;)</li>
</ol>
<h3>Logo Types + Example Prompts</h3>
<h4>Wordmarks (Text-only logos)</h4>
<p>Best style: <code>Vector art</code>, <code>Bold stroke</code>, or <code>Sharp contrast</code> (V3 Vector)</p>
<pre><code>&quot;ELEVATE&quot; in custom geometric sans-serif typeface, letters with subtle angular
cuts, all caps, charcoal gray on white background, modern and premium,
typography-focused logo design, clean vector, minimal
</code></pre>
<pre><code>Wordmark logo &quot;AHEAD OF MARKET&quot; in bold condensed sans-serif, industrial feel,
all caps, tight letter spacing, white text on black background, clean edges,
scalable vector design
</code></pre>
<p><strong>Tips for wordmarks:</strong></p>
<ul>
<li>Specify the exact text in quotes</li>
<li>Describe the typeface style (geometric, humanist, condensed, slab serif)</li>
<li>Mention letter spacing (tight, tracked out)</li>
<li>Keep it simple. Wordmarks fail when over-described.</li>
<li>If text comes out too formal, enable &quot;Avoid text in prompt&quot; negative prompt and let the model get more creative with letter forms</li>
</ul>
<h4>Icon/Symbol Marks</h4>
<p>Best style: <code>Vector art</code>, <code>Flat 2.0</code>, <code>Roundish flat</code>, or <code>Vivid shapes</code> (V3 Vector)</p>
<pre><code>Minimalist icon logo, abstract arrow pointing forward and upward, geometric
construction, single bold stroke weight, black on white background, scalable
symbol mark, clean vector
</code></pre>
<pre><code>Abstract geometric logo mark, interlocking hexagons forming letter A,
flat design, navy blue and electric orange, white background, modern tech
aesthetic, clean vector output
</code></pre>
<p><strong>Tips for icon marks:</strong></p>
<ul>
<li>Focus on one clear shape or concept</li>
<li>Specify &quot;abstract&quot; or &quot;literal&quot; to control interpretation</li>
<li>Use &quot;geometric construction&quot; or &quot;organic curves&quot; to set the vibe</li>
<li>Always specify background color</li>
</ul>
<h4>Monograms (Letter-based marks)</h4>
<p>Best style: <code>Vector art</code>, <code>Bold stroke</code>, or <code>Engraving</code> (V3 Vector)</p>
<pre><code>Luxury monogram logo, intertwined letters &quot;JD&quot; in gold serif font, ornate
circular frame with laurel wreath, royal crest aesthetic, black background,
metallic gold accents, clean vector
</code></pre>
<pre><code>Modern monogram &quot;AM&quot; letters, geometric interlocking construction, bold
sans-serif, single color black, minimal line work, white background, flat
vector design
</code></pre>
<h4>Badge/Emblem Logos</h4>
<p>Best style: <code>Prestige Emblem</code>, <code>Vintage Emblem</code>, <code>Stamp</code>, or <code>Engraving</code> (V3)</p>
<pre><code>Vintage badge logo for artisan brand, circular emblem with mountain silhouette
at center, ornate decorative border, ribbon banner with &quot;Est. 2024&quot;, stars and
pine tree accents, single-color vintage engraving style, cream and dark green,
clean vector
</code></pre>
<pre><code>Industrial emblem logo &quot;AMBITION MECHANICAL&quot;, circular badge, wrench and gear
icon centered, bold condensed typography, worn texture, orange and dark gray
palette, white background
</code></pre>
<h4>Minimalist Logos</h4>
<p>Best style: <code>Vector art</code>, <code>Line art</code>, <code>Thin</code> (V3 Vector)</p>
<pre><code>Minimalist logo, single continuous line forming a leaf shape, monoline style,
consistent stroke width, black on white, zen composition, generous white space,
scalable vector
</code></pre>
<h4>Bold Graphic Logos (AOM&#39;s direction)</h4>
<p>Best style: <code>Bold stroke</code>, <code>Sharp contrast</code>, <code>Pop Graphic</code>, <code>Punk Graphic</code> (V3)</p>
<pre><code>Bold graphic logo mark, heavy geometric shapes, high contrast black and white,
industrial aesthetic, strong angular forms, oversized type element, raw energy,
clean vector output
</code></pre>
<pre><code>Bold graphic brand mark &quot;AOM&quot;, thick strokes, aggressive geometry,
construction/industrial feel, orange accent on black, high impact,
flat vector, no gradients
</code></pre>
<h3>V3 Emblem-Specific Styles</h3>
<p>These are purpose-built for logo/emblem work in V3:</p>
<table>
<thead>
<tr>
<th>Style</th>
<th>Vibe</th>
<th>Best For</th>
</tr>
</thead>
<tbody><tr>
<td>Prestige Emblem</td>
<td>Luxury, formal, detailed</td>
<td>High-end brand crests</td>
</tr>
<tr>
<td>Pop Graphic</td>
<td>Bold, colorful, energetic</td>
<td>Modern consumer brands</td>
</tr>
<tr>
<td>Stamp</td>
<td>Worn, authentic, vintage</td>
<td>Craft/artisan brands</td>
</tr>
<tr>
<td>Punk Graphic</td>
<td>Raw, aggressive, edgy</td>
<td>Edgy/alternative brands</td>
</tr>
<tr>
<td>Vintage Emblem</td>
<td>Classic, ornate, heritage</td>
<td>Heritage/established brands</td>
</tr>
</tbody></table>
<hr>
<h2>3. Pattern &amp; Texture Prompting</h2>
<h3>Seamless Pattern Styles</h3>
<table>
<thead>
<tr>
<th>Style</th>
<th>Output</th>
<th>Best For</th>
</tr>
</thead>
<tbody><tr>
<td><code>Seamless Digital</code></td>
<td>Raster (PNG)</td>
<td>Web backgrounds, social media fills</td>
</tr>
<tr>
<td><code>Seamless Vector</code></td>
<td>Vector (SVG)</td>
<td>Print, scalable brand textures, packaging</td>
</tr>
</tbody></table>
<h3>How to Generate Patterns</h3>
<ol>
<li>Select <code>Seamless Digital</code> or <code>Seamless Vector</code> style</li>
<li>Describe the pattern motif and arrangement</li>
<li>Adjust the Artistry Level slider (lower = cleaner, more uniform; higher = more creative variation)</li>
<li>Generate and export as PNG, SVG, or PDF</li>
</ol>
<h3>Pattern Prompt Examples</h3>
<p><strong>Geometric brand pattern:</strong></p>
<pre><code>Seamless geometric pattern, interlocking hexagons and triangles, bold lines,
two-color orange and dark charcoal, industrial aesthetic, clean edges,
consistent line weight, tileable
</code></pre>
<p><strong>Subtle texture:</strong></p>
<pre><code>Seamless subtle texture pattern, fine diagonal crosshatch lines, light gray
on white, minimal, paper-like quality, understated brand background
</code></pre>
<p><strong>Construction/industrial pattern:</strong></p>
<pre><code>Seamless pattern of construction elements, simplified bolt heads, gear teeth,
and wrench silhouettes arranged in grid, flat vector style, dark gray on
light concrete gray, industrial brand aesthetic
</code></pre>
<p><strong>Abstract brand texture:</strong></p>
<pre><code>Seamless abstract pattern, overlapping angular shapes, bold graphic style,
three-color palette orange black white, high contrast, modern brand texture
</code></pre>
<h3>Pattern Tips</h3>
<ul>
<li>Use &quot;tileable&quot; or &quot;seamless&quot; in the prompt even when using the Seamless style. It reinforces the intent.</li>
<li>Keep motifs simple. Complex motifs create messy tile seams.</li>
<li>Specify exact colors. &quot;Orange and charcoal&quot; beats &quot;warm tones.&quot;</li>
<li>Lower Artistry Level for more predictable, uniform repeats.</li>
<li>Export vectors (SVG) for anything that might go to print.</li>
<li>Test the tile by placing 4 copies side by side. If seams are visible, regenerate.</li>
</ul>
<hr>
<h2>4. Brand Asset Prompting</h2>
<h3>Social Media Templates / OG Images</h3>
<p>Best model: V4 Pro (2048x2048 raster) or V3 with <code>Illustration</code> style</p>
<pre><code>Professional social media graphic, bold headline area top third, abstract
geometric shapes in orange and black, clean modern layout, corporate but
energetic, space for text overlay, 1200x630 aspect ratio
</code></pre>
<p><strong>Tips:</strong></p>
<ul>
<li>Leave negative space for text overlays. Say &quot;space for text&quot; or &quot;headline area.&quot;</li>
<li>Specify aspect ratio in the prompt if it matters.</li>
<li>Use V4 Pro for highest resolution social assets.</li>
<li>Generate the background/visual element, then overlay text in Figma or your design tool. Don&#39;t rely on Recraft for final text placement on social templates.</li>
</ul>
<h3>Brand Illustrations</h3>
<p>Best model: V3 with style presets for consistency</p>
<pre><code>Flat vector illustration of a team working in a modern office, bold graphic
style, limited palette of navy blue orange and white, clean shapes, no outlines,
editorial illustration aesthetic
</code></pre>
<p><strong>For consistent illustration sets</strong>, use Recraft&#39;s Style Reference feature:</p>
<ol>
<li>Upload 1-5 reference images that define your brand&#39;s illustration style</li>
<li>Save as a custom style</li>
<li>Use that style ID for all future generations</li>
<li>This is the single most important feature for brand consistency</li>
</ol>
<h3>Icons and UI Elements</h3>
<p>Best style: V3 Vector icon substyles</p>
<table>
<thead>
<tr>
<th>Substyle</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Icon</td>
<td>Default filled icon</td>
</tr>
<tr>
<td>Outline</td>
<td>Stroke-only icons</td>
</tr>
<tr>
<td>Pictogram</td>
<td>Simplified symbolic icons</td>
</tr>
<tr>
<td>Colored outline</td>
<td>Outline with color fill</td>
</tr>
<tr>
<td>Doodle</td>
<td>Hand-drawn feel</td>
</tr>
<tr>
<td>Colored shape</td>
<td>Solid color fills</td>
</tr>
<tr>
<td>Gradient outline</td>
<td>Outline with gradient stroke</td>
</tr>
<tr>
<td>Offset doodle</td>
<td>Playful offset hand-drawn</td>
</tr>
<tr>
<td>Gradient shape</td>
<td>Gradient-filled shapes</td>
</tr>
<tr>
<td>Broken line</td>
<td>Gaps in strokes</td>
</tr>
<tr>
<td>Offset fill</td>
<td>Offset shadow effect</td>
</tr>
</tbody></table>
<pre><code>Set of 4 construction industry icons: hard hat, wrench, blueprint, safety vest.
Outline style, consistent 2px stroke weight, rounded corners, single color
dark gray, 64x64 grid, clean vector
</code></pre>
<hr>
<h2>5. Style Reference Chart</h2>
<h3>For Logo &amp; Brand Work (V3 Vector)</h3>
<table>
<thead>
<tr>
<th>Use Case</th>
<th>Recommended Style</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Clean modern logo</td>
<td><code>Vector art</code></td>
<td>Most versatile, clean output</td>
</tr>
<tr>
<td>Bold brand marks</td>
<td><code>Bold stroke</code></td>
<td>Heavy lines, high impact</td>
</tr>
<tr>
<td>Minimal icons</td>
<td><code>Line art</code> or <code>Thin</code></td>
<td>Clean, scalable, simple</td>
</tr>
<tr>
<td>Emblem/badge logos</td>
<td><code>Prestige Emblem</code></td>
<td>Purpose-built for emblems</td>
</tr>
<tr>
<td>Vintage/heritage logos</td>
<td><code>Vintage Emblem</code> or <code>Engraving</code></td>
<td>Classic, detailed feel</td>
</tr>
<tr>
<td>Edgy/alternative brands</td>
<td><code>Punk Graphic</code> or <code>Pop Graphic</code></td>
<td>Raw energy</td>
</tr>
<tr>
<td>Organic/handmade feel</td>
<td><code>Color blobs</code> or <code>Linocut</code></td>
<td>Textured, artisan vibe</td>
</tr>
<tr>
<td>Editorial illustrations</td>
<td><code>Editorial</code> or <code>Emotional flat</code></td>
<td>Magazine-quality vectors</td>
</tr>
<tr>
<td>Construction/industrial</td>
<td><code>Bold stroke</code> + <code>Sharp contrast</code></td>
<td>Heavy, functional aesthetic</td>
</tr>
<tr>
<td>Brand patterns (vector)</td>
<td><code>Seamless Vector</code></td>
<td>Tileable vector output</td>
</tr>
<tr>
<td>Brand patterns (raster)</td>
<td><code>Seamless Digital</code></td>
<td>Tileable raster output</td>
</tr>
<tr>
<td>App icons</td>
<td>Icon substyles (see above)</td>
<td>Purpose-built for UI</td>
</tr>
</tbody></table>
<h3>For Photorealistic Assets (V3 Raster)</h3>
<table>
<thead>
<tr>
<th>Use Case</th>
<th>Recommended Style</th>
</tr>
</thead>
<tbody><tr>
<td>Product mockups</td>
<td><code>Product photo</code></td>
</tr>
<tr>
<td>Team/lifestyle photos</td>
<td><code>Natural light</code></td>
</tr>
<tr>
<td>Studio portraits</td>
<td><code>Studio photo</code></td>
</tr>
<tr>
<td>High-impact hero images</td>
<td><code>HDR</code></td>
</tr>
<tr>
<td>Moody brand imagery</td>
<td><code>Urban Drama</code> or <code>Noir</code></td>
</tr>
</tbody></table>
<h3>V4 (No style presets, but higher quality)</h3>
<p>Use V4 when you want the highest raw quality and don&#39;t need a specific style preset. V4&#39;s &quot;design taste&quot; produces naturally well-composed, color-balanced output. Best for:</p>
<ul>
<li>Final production logos (V4 Pro Vector)</li>
<li>Hero images and key brand visuals (V4 Pro)</li>
<li>Any asset where quality matters more than matching a specific preset style</li>
</ul>
<hr>
<h2>6. Do&#39;s and Don&#39;ts</h2>
<h3>DO</h3>
<ul>
<li><strong>Be specific about visual elements.</strong> &quot;Abstract arrow pointing upward&quot; beats &quot;something dynamic.&quot;</li>
<li><strong>Specify exact colors.</strong> &quot;Navy blue (#1a1a2e) and electric orange (#ff6b35)&quot; beats &quot;blue and orange.&quot;</li>
<li><strong>State the background.</strong> Always include &quot;white background&quot;, &quot;black background&quot;, or &quot;transparent.&quot;</li>
<li><strong>Use format cues.</strong> &quot;Clean vector&quot;, &quot;flat design&quot;, &quot;scalable&quot;, &quot;no gradients&quot; guide the output toward usable assets.</li>
<li><strong>Lower the Artistry Level for logos.</strong> Lower = tighter adherence to your prompt, cleaner geometry.</li>
<li><strong>Generate multiple variations.</strong> Generate 4 at once, pick the best, then iterate on that direction.</li>
<li><strong>Use Style References for brand consistency.</strong> Upload 1-5 reference images, save as a custom style, reuse everywhere.</li>
<li><strong>Specify stroke consistency for line-based designs.</strong> &quot;Consistent 2px stroke weight&quot; or &quot;monoline style.&quot;</li>
<li><strong>Use V3 when you need style presets.</strong> V4 is higher quality but doesn&#39;t support style presets yet.</li>
<li><strong>Use V4 Pro Vector for final production logos.</strong> Highest quality vector output available.</li>
<li><strong>Export as SVG for anything that needs to scale.</strong> Logos, icons, patterns for print.</li>
<li><strong>Iterate in Recraft, finalize in Illustrator/Figma.</strong> Recraft is the starting point, not the finish line.</li>
</ul>
<h3>DON&#39;T</h3>
<ul>
<li><strong>Don&#39;t be vague.</strong> &quot;Cool logo&quot; = wasted credits. Every word should describe something visual.</li>
<li><strong>Don&#39;t use negative phrasing.</strong> &quot;No penguins&quot; often produces penguins. Just describe what you want.</li>
<li><strong>Don&#39;t over-describe.</strong> Too many tiny details break the vector look. 2-3 key elements max for logos.</li>
<li><strong>Don&#39;t use vague plurals.</strong> &quot;Three gears&quot; not &quot;some gears.&quot; Specific quantities.</li>
<li><strong>Don&#39;t expect perfect text on first try.</strong> AI text rendering is improving but still imperfect. Check spelling. Use the &quot;Avoid text in prompt&quot; toggle if text is too stiff.</li>
<li><strong>Don&#39;t skip the style parameter (V3).</strong> Default output without a style is generic. Always pick a style.</li>
<li><strong>Don&#39;t rely on Recraft for final text layout.</strong> Generate the visual, overlay text in your design tool.</li>
<li><strong>Don&#39;t generate at low resolution for production work.</strong> Use V4 Pro or V4 Pro Vector for final assets.</li>
<li><strong>Don&#39;t ignore the Custom Style feature.</strong> It&#39;s Recraft&#39;s biggest advantage for brand work. Upload references, lock the style, reuse it.</li>
<li><strong>Don&#39;t try to get everything in one generation.</strong> Logo icon in one pass, wordmark in another, then combine in Illustrator.</li>
</ul>
<hr>
<h2>7. Example Prompts That Work</h2>
<h3>Construction Company Logo (AOM client vertical)</h3>
<pre><code>Bold industrial logo for &quot;AMBITION MECHANICAL&quot;, geometric wrench icon
integrated with letter A, heavy line weight, condensed sans-serif type,
orange (#ff6600) and dark charcoal (#2a2a2a), white background, flat
vector, no gradients, scalable
</code></pre>
<p>Style: <code>Bold stroke</code> (V3 Vector)</p>
<h3>Modern Agency Wordmark</h3>
<pre><code>Wordmark logo &quot;AOM&quot; in custom bold geometric sans-serif, tight letter
spacing, letters constructed from angular shapes, all caps, black on
white background, high contrast, clean vector, minimal
</code></pre>
<p>Style: <code>Sharp contrast</code> (V3 Vector)</p>
<h3>Heritage Emblem Badge</h3>
<pre><code>Vintage emblem logo &quot;KOHRS CONSTRUCTION&quot;, circular badge design,
crossed hammers at center, established date &quot;2018&quot; on ribbon banner,
ornate border detail, single color dark navy, cream background,
engraving style, clean vector
</code></pre>
<p>Style: <code>Vintage Emblem</code> or <code>Engraving</code> (V3 Vector)</p>
<h3>Minimalist Icon Mark</h3>
<pre><code>Minimalist logo mark, single geometric shape suggesting forward motion,
abstract arrow composed of two overlapping triangles, flat design,
single color black, white background, no text, clean scalable vector
</code></pre>
<p>Style: <code>Vector art</code> (V3 Vector)</p>
<h3>Brand Pattern for Packaging</h3>
<pre><code>Seamless geometric pattern, repeating angular chevron shapes, bold
industrial aesthetic, two colors orange and dark gray, consistent line
weight, clean edges, tileable, flat vector
</code></pre>
<p>Style: <code>Seamless Vector</code> (V3 Vector)</p>
<h3>Social Media OG Image Background</h3>
<pre><code>Abstract geometric background, overlapping angular planes in orange
navy and white, bold graphic composition, high contrast, clean modern
aesthetic, space for text overlay in center, editorial design feel
</code></pre>
<p>Model: V4 Pro (2048x2048)</p>
<h3>App Icon Set</h3>
<pre><code>Construction safety hard hat icon, front view, simplified geometric
shape, consistent 2px outline stroke, rounded corners, single color
dark gray, 64x64 grid, clean vector, minimal detail
</code></pre>
<p>Style: <code>Outline</code> icon substyle (V3 Vector)</p>
<h3>Bold Graphic Brand Mark (AOM direction)</h3>
<pre><code>Bold graphic logo mark, heavy angular letterform &quot;A&quot; constructed from
thick geometric slabs, brutalist design influence, high contrast black
and orange, raw industrial energy, flat vector, no fine detail,
maximum impact at any size
</code></pre>
<p>Style: <code>Punk Graphic</code> or <code>Pop Graphic</code> (V3)</p>
<hr>
<h2>8. Workflow: From Prompt to Production Asset</h2>
<ol>
<li><strong>Brief</strong>: Define what you need (logo type, brand values, colors, references)</li>
<li><strong>Style selection</strong>: Pick the right model + style from the charts above</li>
<li><strong>First pass</strong>: Write a focused prompt, generate 4 variations</li>
<li><strong>Evaluate</strong>: Pick the strongest direction</li>
<li><strong>Refine</strong>: Adjust the prompt based on what worked/didn&#39;t, regenerate</li>
<li><strong>Lock style</strong>: If using V3, save the winning style as a Custom Style for reuse</li>
<li><strong>Upscale</strong>: Use Creative Upscale for any detail issues (faces, fine lines)</li>
<li><strong>Export</strong>: SVG for logos/icons, PNG for raster assets, PDF for print</li>
<li><strong>Polish in design tool</strong>: Open in Illustrator or Figma for final adjustments</li>
<li><strong>Brand consistency check</strong>: Does it match other brand assets? If not, use Style References.</li>
</ol>
<hr>
<h2>Sources</h2>
<ul>
<li><a href="https://www.recraft.ai/docs/prompt-engineering-guide/visual-formats/logos-and-icons">Recraft Prompt Engineering Guide: Logos and Icons</a></li>
<li><a href="https://www.recraft.ai/docs/api-reference/styles">Recraft API Styles Reference</a></li>
<li><a href="https://www.recraft.ai/blog/how-to-generate-a-logo-using-ai">Recraft Blog: How to Generate a Logo Using AI</a></li>
<li><a href="https://www.recraft.ai/blog/how-to-craft-prompts-for-accurate-ai-generated-images">Recraft Blog: How to Craft Prompts for Accurate AI-Generated Images</a></li>
<li><a href="https://www.recraft.ai/docs/recraft-studio/styles/seamless-patterns">Recraft Blog: Seamless Patterns</a></li>
<li><a href="https://www.recraft.ai/blog/new-tools-for-brand-style-consistency-and-control">Recraft Blog: Brand Style Consistency and Control</a></li>
<li><a href="https://www.recraft.ai/docs/recraft-models/recraft-V4">Recraft V4 Documentation</a></li>
<li><a href="https://www.recraft.ai/docs/best-practices/prompting-and-image-generation">Recraft Prompting Best Practices</a></li>
<li><a href="https://sider.ai/blog/ai-tools/the-best-ai-tools-for-logo-generation-ranking-recraft-s-chat-mode-by-strategy-not-hype">Sider AI: Best AI Tools for Logo Generation</a></li>
<li><a href="https://aiinnovationhub.shop/recraft-v3-ai-vector-logo-generator-svg/">AI Innovation Hub: Recraft V3 SVG Guide</a></li>
<li><a href="https://www.hixx.ai/blog/xxai-news/recraft-v3-free-prompts">hixx.ai: Recraft V3 Free Prompts List</a></li>
</ul>
`,c={title:t,slug:e,category:n,agent:o,date:r,dateFormatted:a,updated:null,summary:s,tags:i,content:l};export{o as agent,n as category,l as content,r as date,a as dateFormatted,c as default,e as slug,s as summary,i as tags,t as title,d as updated};
