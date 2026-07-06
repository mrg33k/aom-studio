const e="AOM Brand Iteration v2: Contrast + Life",t="aom-brand-iteration-v2",n="Design Specs",o="Steffen",r="2026-03-09",i="Mar 9",l=null,a="Evolution of Bold Graphic direction with contrast and life calibration.",d=[],s=`<h1>AOM Brand Iteration v2: Contrast + Life</h1>
<p><em>Steffen | 2026-03-09</em>
<em>Evolution of Bold Graphic (Direction C). Not a redesign. A calibration.</em></p>
<hr>
<h2>Pinterest Reference Summary</h2>
<h3>What Patrik&#39;s boards tell us about his taste</h3>
<p>After reviewing 11 boards (web-design, branding, design, art-direction, typography, grids, mobile-design, title-design, aom, construction-marketing, construction-social-media-design), clear patterns emerge:</p>
<p><strong>1. He gravitates toward high-contrast, black-dominant layouts.</strong>
The web-design board is telling. The pins he saved aren&#39;t pastel SaaS landing pages. They&#39;re:</p>
<ul>
<li>Francesco Gioia&#39;s portfolio: true black backgrounds, white type, full-color photos punching through the dark (web-design board)</li>
<li>DarkBlue Studio: deep navy/black hero with a mosaic of vivid project thumbnails (web-design board)</li>
<li>Heli Creative: alternating black and white sections with strong photographic moments (web-design board)</li>
<li>&quot;ANOTHER&quot; agency site: huge serif type on off-white, massive full-bleed photo, then text. Big contrast between type-heavy and image-heavy (web-design board)</li>
</ul>
<p><strong>2. He loves Nike&#39;s graphic language.</strong>
The design board is almost a Nike mood board: &quot;MAKERS OF THE GAME&quot; (massive condensed type, grid boxes, raw texture), &quot;HARLEM DIVISION NONE&quot; (B&amp;W photo, bold type wrapping around it), &quot;IF THEY CAN&#39;T FIND YOU / MAKE THEM LOOK&quot; (B&amp;W photos, oversized type, grid split). This is bold, unapologetic, structured graphic design. Not clean-and-quiet. Loud-and-organized.</p>
<p><strong>3. The branding board confirms: he likes designed information systems.</strong>
The UGC Portfolio pin (black/cream sections, data-rich stat grids, large numbers) and the DesignMart identity (black backgrounds, white type, barcode-style data layouts, industrial labeling). Also the marker brand labels pin: dense information, structured into grids, every piece of data has a place. This is the Bold Graphic badge system taken to its natural conclusion.</p>
<p><strong>4. Art direction references are culture-forward.</strong>
Tyler the Creator / Golf Wang, Adidas x Courir, Debut basketball branding. These aren&#39;t corporate. They&#39;re brands with real personality and strong color confidence. Saturated backgrounds, type that breaks conventions, photography that feels alive.</p>
<p><strong>5. The FYLLA site pin is key.</strong>
Clean cream/off-white base BUT the photos carry all the energy. Big portraits, real people, warm tones. The layout is quiet. The content is alive. This is the balance point.</p>
<p><strong>6. Construction boards show what he DOESN&#39;T want to be.</strong>
Generic stock photos of smiling hard-hat guys on white backgrounds with yellow/orange accents. Every construction marketing pin Patrik saved that&#39;s actually good uses dramatic lighting, real jobsite photography, and bold type over dark backgrounds. The bad ones are all light, safe, and forgettable.</p>
<h3>The core insight</h3>
<p>Patrik&#39;s taste sits at the intersection of:</p>
<ul>
<li><strong>Nike&#39;s graphic confidence</strong> (type as architecture, grid-based information, B&amp;W contrast)</li>
<li><strong>Streetwear-adjacent energy</strong> (Golf Wang, bold color moments, personality)</li>
<li><strong>Editorial restraint</strong> (FYLLA, ANOTHER: letting photos and type do the work without clutter)</li>
</ul>
<p>The current AOM site leans too far into the cream/off-white editorial zone and not enough into the graphic confidence zone. The video background is there but it&#39;s been pulled back so far (18% opacity, 88% cream overlay) that it barely registers. Patrik is right: the page is too white and doesn&#39;t feel alive.</p>
<hr>
<h2>The Problem (What Patrik Said)</h2>
<ol>
<li>&quot;Too white, off-white. Needs more contrast.&quot;</li>
<li>&quot;The old version had video playing random from our collection. It felt very alive.&quot;</li>
<li>&quot;These are just my thoughts, I&#39;m just one person on this team.&quot;</li>
</ol>
<p>On point 3: He&#39;s right to flag it. But his instinct aligns perfectly with his own Pinterest boards. The data backs up the gut feeling. More contrast, more video presence, more life. The direction is correct.</p>
<hr>
<h2>The Proposal: &quot;Dark Frame&quot;</h2>
<p><strong>Concept:</strong> Invert the current light-dominant page to a dark-dominant page with strategic light sections for breathing room. The video background becomes the hero, not a whisper behind text. Dark sections create the contrast Patrik wants while keeping the Bold Graphic typography and badge system intact.</p>
<p>Think of it as putting the current site into a dark frame. The cream becomes the accent, not the base.</p>
<hr>
<h2>Color System Update</h2>
<h3>Current palette (what&#39;s in Tailwind now)</h3>
<table>
<thead>
<tr>
<th>Role</th>
<th>Current</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>Primary background</td>
<td>Cream</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Secondary background</td>
<td>Cream-dark</td>
<td><code>#EDE7DF</code></td>
</tr>
<tr>
<td>Primary text</td>
<td>Black</td>
<td><code>#0A0A0A</code></td>
</tr>
<tr>
<td>Accent</td>
<td>Orange</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>Secondary accent</td>
<td>Sage</td>
<td><code>#7C9A72</code></td>
</tr>
</tbody></table>
<h3>Proposed palette (evolution, not replacement)</h3>
<table>
<thead>
<tr>
<th>Role</th>
<th>Proposed</th>
<th>Hex</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Primary background</td>
<td>Near-black</td>
<td><code>#0C0C0C</code></td>
<td>Replaces cream as the dominant surface. 60-65% of the page.</td>
</tr>
<tr>
<td>Secondary background</td>
<td>Deep charcoal</td>
<td><code>#151515</code></td>
<td>For card surfaces on dark sections. Subtle depth.</td>
</tr>
<tr>
<td>Tertiary background</td>
<td>Warm cream</td>
<td><code>#FDF6EC</code></td>
<td>KEEP. Used for 2-3 &quot;breathing&quot; sections. Now it pops because it&#39;s rare.</td>
</tr>
<tr>
<td>Card surface (on cream)</td>
<td>White</td>
<td><code>#FFFFFF</code></td>
<td>Replaces the cream-on-cream cards. True white on cream = visible.</td>
</tr>
<tr>
<td>Primary text (on dark)</td>
<td>Off-white</td>
<td><code>#F0ECE6</code></td>
<td>Warm, not cold blue-white. Slight cream tint.</td>
</tr>
<tr>
<td>Primary text (on light)</td>
<td>Black</td>
<td><code>#0A0A0A</code></td>
<td>Unchanged.</td>
</tr>
<tr>
<td>Secondary text (on dark)</td>
<td>Warm gray</td>
<td><code>#8A847C</code></td>
<td>Lighter than current warm-gray for readability on dark.</td>
</tr>
<tr>
<td>Secondary text (on light)</td>
<td>Warm gray</td>
<td><code>#7A7267</code></td>
<td>Unchanged.</td>
</tr>
<tr>
<td>Accent orange</td>
<td>Orange</td>
<td><code>#E85D26</code></td>
<td>Unchanged. Pops harder on dark backgrounds.</td>
</tr>
<tr>
<td>Accent orange (glow)</td>
<td>Orange at 15%</td>
<td><code>#E85D2626</code></td>
<td>New. Subtle glow/shadow behind orange elements on dark bg.</td>
</tr>
<tr>
<td>Accent sage</td>
<td>Sage</td>
<td><code>#7C9A72</code></td>
<td>Unchanged.</td>
</tr>
<tr>
<td>Border (on dark)</td>
<td>White at 10%</td>
<td><code>#FFFFFF1A</code></td>
<td>Subtle. Replaces <code>#D9D3CB</code> on dark sections.</td>
</tr>
<tr>
<td>Border (on light)</td>
<td>Current</td>
<td><code>#D9D3CB</code></td>
<td>Unchanged.</td>
</tr>
<tr>
<td>Video overlay (hero)</td>
<td>Black at 55%</td>
<td><code>#0C0C0C8C</code></td>
<td>Replaces cream overlay. Video shows through at ~45% visibility.</td>
</tr>
</tbody></table>
<h3>New Tailwind config additions</h3>
<pre><code class="language-js">// Add to aom colors:
&#39;night&#39;: &#39;#0C0C0C&#39;,
&#39;night-card&#39;: &#39;#151515&#39;,
&#39;night-border&#39;: &#39;rgba(255,255,255,0.10)&#39;,
&#39;night-border-hover&#39;: &#39;rgba(255,255,255,0.18)&#39;,
&#39;text-light&#39;: &#39;#F0ECE6&#39;,
&#39;text-light-muted&#39;: &#39;#8A847C&#39;,
</code></pre>
<hr>
<h2>Section-by-Section Contrast Plan</h2>
<p>The current page flows: cream &gt; cream-dark &gt; black &gt; cream-dark &gt; cream &gt; cream.
Almost entirely light. One dark section (Construction Callout).</p>
<h3>Proposed flow:</h3>
<pre><code>SECTION                     BACKGROUND       TEXT COLOR
---------------------------------------------------------
Nav                         Transparent      White (on dark hero)
                            -&gt; Solid #0C0C0C on scroll
Hero                        VIDEO + dark     White / cream
                            overlay #0C0C0C
                            at 55% opacity
Services Grid               Cream #FDF6EC    Black
                            (breathing room)
Construction Callout         #0C0C0C          White
Brands Callout               #151515          White
                            (subtle step,
                            not identical
                            to construction)
AI Teaser / Systems         Cream #FDF6EC    Black
                            (second breath)
Trust / Testimonials        #0C0C0C          White
FAQ                         #0C0C0C          White
Contact / Footer            #0C0C0C          White
                            with orange
                            accent bar
</code></pre>
<p><strong>Ratio:</strong> ~65% dark, ~35% light. Currently it&#39;s ~85% light, ~15% dark. This is the core shift.</p>
<p><strong>Why this works:</strong> The two cream sections become visual &quot;breaths&quot; between dark blocks. They feel special instead of default. And on the dark sections, orange pops much harder. The badge system (pill borders) inverts to white-on-dark and gains visibility. Photos in bordered containers look better on dark backgrounds. The video hero becomes an event, not a subtle texture.</p>
<hr>
<h2>Hero Section: Video Treatment</h2>
<h3>Current state</h3>
<ul>
<li>Gumlet iframe embeds, 5 random videos cycling every 10 seconds</li>
<li>Opacity: 18% (barely visible)</li>
<li>Cream overlay at 88% opacity on top</li>
<li>Bottom gradient fade into cream</li>
<li>Mobile: video hidden entirely</li>
</ul>
<h3>Proposed changes</h3>
<p><strong>1. Dark overlay instead of cream overlay</strong></p>
<ul>
<li>Replace <code>bg-aom-cream/[0.88]</code> with <code>bg-[#0C0C0C]/[0.55]</code></li>
<li>Video now shows at ~45% visibility instead of ~12%</li>
<li>The video becomes the hero&#39;s energy source, not a faint shimmer</li>
</ul>
<p><strong>2. Increase video base opacity</strong></p>
<ul>
<li>Change inline style <code>opacity: visible ? 0.18 : 0</code> to <code>opacity: visible ? 0.65 : 0</code></li>
<li>Combined with the 55% dark overlay, effective video visibility is ~30%</li>
<li>This is the sweet spot: visible enough to feel alive, dark enough for text readability</li>
</ul>
<p><strong>3. Vignette edge treatment</strong></p>
<ul>
<li>Add a radial gradient vignette (darker at edges, slightly lighter at center)</li>
<li><code>background: radial-gradient(ellipse at center, transparent 40%, #0C0C0C 100%)</code></li>
<li>Keeps focus on the center where the headline lives</li>
<li>Edges darken naturally into the page</li>
</ul>
<p><strong>4. Crossfade timing</strong></p>
<ul>
<li>Keep the 10-second hold and 1.5s crossfade</li>
<li>Add a subtle scale animation: video starts at <code>scale(1.15)</code> (current) and slowly zooms to <code>scale(1.25)</code> over the 10 seconds</li>
<li>Ken Burns effect. Adds perceived motion even on a single frame.</li>
</ul>
<p><strong>5. Film grain overlay</strong></p>
<ul>
<li>Add a subtle CSS noise texture over the video at 4-5% opacity</li>
<li>References: Industrial direction&#39;s noise concept, multiple branding board pins</li>
<li><code>background-image: url(&quot;data:image/svg+xml,...&quot;)</code> with a noise pattern</li>
<li>Makes the video feel cinematic, not like a web embed</li>
</ul>
<p><strong>6. Mobile: show video</strong></p>
<ul>
<li>Currently hidden on mobile for performance</li>
<li>Proposal: Show the first video only (no rotation) as a static background</li>
<li>Use a poster frame / thumbnail as a fallback while loading</li>
<li>If performance is still an issue, use a high-quality still frame from one of the reel videos with the grain overlay</li>
</ul>
<p><strong>7. Text treatment on dark video hero</strong></p>
<ul>
<li>Headline: White (<code>#F0ECE6</code>) instead of black</li>
<li>&quot;IMPOSSIBLE TO IGNORE&quot; accent line: stays orange (<code>#E85D26</code>), now glows against dark</li>
<li>Subhead: <code>#8A847C</code> warm gray</li>
<li>Micro-label: <code>#8A847C</code></li>
<li>CTA button: orange bg is unchanged, but add <code>shadow-lg shadow-aom-orange/30</code> for glow effect</li>
<li>Secondary CTA: switch from <code>border-aom-black</code> to <code>border-white/30 text-white hover:bg-white hover:text-aom-black</code></li>
</ul>
<p><strong>8. Pathway gate cards</strong></p>
<ul>
<li>Switch from <code>bg-white/60 backdrop-blur-sm</code> to <code>bg-white/8 backdrop-blur-md border-white/10</code></li>
<li>Text: white</li>
<li>Accent colors (orange, sage) unchanged</li>
<li>Creates a frosted glass effect over the video. Modern, alive.</li>
</ul>
<h3>Before / After: Hero</h3>
<p><strong>Before:</strong> Cream background with an almost-invisible video shimmer. Black text. Reads like a static page with a subtle texture. Clean but quiet.</p>
<p><strong>After:</strong> Dark, cinematic video background cycling through AOM&#39;s reel. White text punches through a darkened video. Orange CTA glows. Frosted pathway cards float over moving footage. The page is alive from the first frame. You know immediately: this is a production company.</p>
<hr>
<h2>Services Grid: Light &quot;Breathing&quot; Section</h2>
<h3>Current state</h3>
<ul>
<li><code>bg-aom-cream-dark</code> (<code>#EDE7DF</code>)</li>
<li>White card backgrounds with light borders</li>
</ul>
<h3>Proposed changes</h3>
<ul>
<li>Background: <code>bg-aom-cream</code> (<code>#FDF6EC</code>) for a clean, warm break</li>
<li>Card backgrounds: true white <code>#FFFFFF</code> with <code>shadow-md</code> and <code>border-aom-light-border</code></li>
<li>This section stays light. It&#39;s the first breath after the dark hero.</li>
<li>The contrast between the dark hero above and this cream section creates the &quot;magazine section flip&quot; feeling</li>
</ul>
<h3>Why keep this light</h3>
<ul>
<li>Three service cards with descriptions need readability</li>
<li>The light-dark-light alternation prevents fatigue</li>
<li>Patrik&#39;s Pinterest shows he likes both: FYLLA (light with strong photos) and Francesco Gioia (dark with color moments). The page needs both.</li>
</ul>
<hr>
<h2>Construction Callout: Stays Dark, Gets Bolder</h2>
<h3>Current state</h3>
<ul>
<li><code>bg-aom-black</code> with white text</li>
<li>Subtle orange gradient overlay at 3% opacity</li>
</ul>
<h3>Proposed changes</h3>
<ul>
<li>Background: <code>#0C0C0C</code> (matches new dark standard)</li>
<li>Add a very faint orange gradient glow at the top edge: <code>bg-gradient-to-b from-aom-orange/5 to-transparent h-1</code></li>
<li>This is a 1px orange accent bar at the section boundary (reference: Industrial direction&#39;s signature orange bar)</li>
<li>Proof card (Ambition Mechanical): add <code>shadow-2xl shadow-aom-orange/10</code> for a warm glow</li>
<li>Mini stat numbers: bump to <code>text-3xl</code> for more graphic punch</li>
</ul>
<hr>
<h2>Brands Callout: Subtle Dark Step</h2>
<h3>Current state</h3>
<ul>
<li><code>bg-aom-cream</code> (light section)</li>
<li>Light borders, white cards</li>
</ul>
<h3>Proposed changes</h3>
<ul>
<li>Background: <code>#151515</code> (one shade lighter than primary dark)</li>
<li>This creates a subtle &quot;depth layer&quot; between Construction (at <code>#0C0C0C</code>) and Brands</li>
<li>Text: white</li>
<li>Card borders: <code>border-white/10</code> instead of <code>border-aom-light-border</code></li>
<li>Proof card (Virtu): white card with black text on dark background. The card itself becomes the contrast element.</li>
<li>Or: invert the card to match dark theme with <code>border-2 border-aom-orange/40</code></li>
</ul>
<h3>Before / After: Brands</h3>
<p><strong>Before:</strong> Light cream section, nearly identical to the Services Grid above it. Low contrast between sections. Feels monotone.</p>
<p><strong>After:</strong> Dark section with subtle depth difference from Construction above. White text on charcoal. The Virtu proof card either pops as a white card on dark, or glows with orange border on dark. Either way: high contrast, high visibility.</p>
<hr>
<h2>AI Teaser: Second Light Breath</h2>
<h3>Current state</h3>
<ul>
<li><code>bg-aom-cream-dark</code> with sage accents</li>
</ul>
<h3>Proposed changes</h3>
<ul>
<li>Background: <code>bg-aom-cream</code> (<code>#FDF6EC</code>) for the second breathing section</li>
<li>This is the &quot;systems / digital&quot; section, and the sage accent color reads better on light backgrounds</li>
<li>Card surfaces: true white</li>
<li>Waitlist card: keep <code>border-2 border-aom-black</code> treatment, it&#39;s already strong</li>
<li>Process visualization card: <code>border-aom-sage/30</code> on white, clean</li>
</ul>
<hr>
<h2>Trust / Testimonials + FAQ + Footer: Dark Close</h2>
<h3>Current state (in App.jsx)</h3>
<ul>
<li>Trust metrics: cream background</li>
<li>Testimonials: cream background</li>
<li>FAQ: cream background</li>
<li>Footer: black</li>
</ul>
<h3>Proposed changes</h3>
<ul>
<li>All three sections: <code>#0C0C0C</code> background, white text</li>
<li>Testimonial cards: <code>bg-white/5 border-white/10</code> with a subtle backdrop blur</li>
<li>Quote text: <code>text-white/80</code></li>
<li>Attribution: <code>text-aom-orange</code></li>
<li>FAQ accordion: minimal. Question in white, answer in <code>#8A847C</code></li>
<li>Footer: stays <code>#0A0A0A</code>, now blends seamlessly into the dark page end</li>
</ul>
<h3>Why close dark</h3>
<ul>
<li>Builds momentum toward the CTA</li>
<li>The cream &quot;breaths&quot; are done. The page accelerates into trust, proof, and close</li>
<li>Orange CTAs glow hardest on the darkest sections</li>
<li>The final CTA button should feel urgent. Dark background + glowing orange = that energy.</li>
</ul>
<hr>
<h2>Motion and &quot;Aliveness&quot; Additions</h2>
<p>Beyond the video hero, these additions make the page feel alive without being distracting:</p>
<p><strong>1. Section transition lines</strong></p>
<ul>
<li>Between each major section, add a thin animated line (1px, orange, width animates from 0% to 40% viewport on scroll into view)</li>
<li>Subtle. Takes ~0.8 seconds. Only fires once (viewport once: true).</li>
<li>Reference: the 12px orange bar in the hero area (<code>w-12 h-[2px] bg-aom-orange</code>) already exists as a static element. This makes it dynamic.</li>
</ul>
<p><strong>2. Stat counter animation</strong></p>
<ul>
<li>Trust metric numbers: animate counting up when they scroll into view</li>
<li>&quot;24-72hr&quot; -&gt; numbers tick up</li>
<li>Reference: many of Patrik&#39;s saved pins feature large display numbers as visual anchors</li>
</ul>
<p><strong>3. Badge hover states</strong></p>
<ul>
<li>The pill badges (VIDEO, WEB, AI) get a subtle fill on hover</li>
<li><code>hover:bg-aom-orange/10</code> for orange badges, <code>hover:bg-aom-sage/10</code> for sage</li>
<li>Border brightens: <code>hover:border-aom-orange/60</code></li>
</ul>
<p><strong>4. Card hover lift</strong></p>
<ul>
<li>Service cards, proof cards: add <code>hover:-translate-y-1 hover:shadow-xl transition-all duration-300</code></li>
<li>Subtle upward shift. Feels tactile.</li>
</ul>
<p><strong>5. Scroll-based parallax on hero text</strong></p>
<ul>
<li>As user scrolls past the hero, the headline moves up slightly slower than the page</li>
<li><code>translateY</code> based on scroll position, clamped to prevent jank</li>
<li>The video stays fixed (or moves even slower), creating depth layers</li>
</ul>
<p><strong>6. Cursor glow on dark sections</strong> (optional, desktop only)</p>
<ul>
<li>A subtle radial gradient that follows the mouse on dark sections</li>
<li>200px radius, white at 2-3% opacity</li>
<li>Barely noticeable. But it makes the dark sections feel responsive and alive.</li>
<li>Reference: multiple portfolio sites Patrik saved use this technique</li>
</ul>
<hr>
<h2>Typography Changes</h2>
<p>No font changes. Syne (headlines) and Space Grotesk (body) stay. But some weight adjustments on dark backgrounds:</p>
<table>
<thead>
<tr>
<th>Element</th>
<th>Current</th>
<th>On Dark Background</th>
</tr>
</thead>
<tbody><tr>
<td>Section headlines</td>
<td><code>font-extrabold</code> (800)</td>
<td><code>font-bold</code> (700). Heavy type on dark needs slightly less weight to avoid visual bloating.</td>
</tr>
<tr>
<td>Body text</td>
<td>weight 400</td>
<td>weight 400 (unchanged). Space Grotesk reads well at 400 on dark.</td>
</tr>
<tr>
<td>Micro-labels</td>
<td>weight 500</td>
<td>weight 500 (unchanged).</td>
</tr>
<tr>
<td>Badge text</td>
<td>weight 700</td>
<td>weight 600. Same reason as headlines.</td>
</tr>
</tbody></table>
<hr>
<h2>Implementation Notes for Bobby</h2>
<h3>CSS / Tailwind changes</h3>
<ol>
<li>Add new color tokens to <code>tailwind.config.js</code> (listed above)</li>
<li>No new font imports needed</li>
<li>Film grain: CSS-only SVG noise filter (no image assets)</li>
<li>Cursor glow: pure CSS with <code>radial-gradient</code> and JS mouse tracking</li>
</ol>
<h3>Component changes</h3>
<ol>
<li><strong>HeroSection.jsx</strong>: Dark overlay, increased video opacity, white text, frosted pathway cards</li>
<li><strong>ServicesGrid.jsx</strong>: Background to cream, cards to white</li>
<li><strong>ConstructionCallout.jsx</strong>: Minor (already dark). Add orange accent bar, bump stats.</li>
<li><strong>BrandsCallout.jsx</strong>: Flip to dark background. Invert text/border colors.</li>
<li><strong>AITeaser.jsx</strong>: Background to cream. Keep sage accents.</li>
<li><strong>App.jsx</strong>: Trust, Testimonials, FAQ sections flip to dark. Footer unchanged.</li>
<li><strong>Nav</strong>: Transparent on hero, solid dark on scroll (add scroll listener for <code>bg-aom-night</code> class)</li>
</ol>
<h3>Performance considerations</h3>
<ul>
<li>Film grain SVG: rendered once, applied via CSS. Zero runtime cost.</li>
<li>Cursor glow: throttle to 60fps via <code>requestAnimationFrame</code>. Desktop only.</li>
<li>Video on mobile: test with single static embed first. Fall back to poster frame if needed.</li>
<li>All motion respects <code>prefers-reduced-motion: reduce</code>.</li>
</ul>
<hr>
<h2>What This Does NOT Change</h2>
<ul>
<li>Typography system (Syne + Space Grotesk)</li>
<li>Badge/pill design system</li>
<li>Information architecture / section order</li>
<li>Content copy</li>
<li>CTA placement strategy</li>
<li>Mobile layout structure</li>
<li>Gumlet video source library</li>
<li>Orange + sage accent system</li>
</ul>
<p>This is a contrast and energy shift, not a rebuild. Bobby should be able to implement this in one focused session by updating backgrounds, text colors, and border tokens section by section.</p>
<hr>
<h2>Next Steps</h2>
<ol>
<li><strong>Alex reviews</strong> this proposal for layout/content implications</li>
<li><strong>Patrik approves</strong> the direction (or adjusts the dark/light ratio)</li>
<li><strong>Bobby implements</strong> section by section, starting with the hero</li>
<li><strong>Elmer QAs</strong> each section against this spec</li>
</ol>
<hr>
<h2>Steffen&#39;s Take</h2>
<p>The current site is good design. The structure is right. The type system is right. The content flow is right. But it&#39;s wearing a cream sweater when it should be wearing a black jacket. AOM is a production company. The site should feel like opening night, not a Sunday brunch menu.</p>
<p>Patrik&#39;s Pinterest boards make this clear: he&#39;s drawn to high-contrast, photography-forward, typographically confident design. The Bold Graphic direction already has the right bones. This iteration just turns the lights down so the work can glow.</p>
`,c={title:e,slug:t,category:n,agent:o,date:r,dateFormatted:i,updated:null,summary:a,tags:d,content:s};export{o as agent,n as category,s as content,r as date,i as dateFormatted,c as default,t as slug,a as summary,d as tags,e as title,l as updated};
