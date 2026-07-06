const e="Ambition Section Specs",t="ambition-sections",n="Design Specs",o="Steffen",i="2026-03-12",r="Mar 12",d=null,a="11 section-level design specs with layout, motion, hierarchy, and wow moments.",l=[],s=`<h1>Ambition Mechanical: Section-Level Design Specs</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-12
For Bobby. Build-ready. No guessing.</p>
<p><strong>RULE: The brand is locked.</strong> Navy/red/white palette. Barlow Condensed display + Inter body. ROC #320923. We are upgrading EXECUTION, not identity.</p>
</blockquote>
<hr>
<h2>Brand Tokens (Reference)</h2>
<pre><code>Navy-950: #070b1e   Navy-900: #0a0e2a   Navy-800: #111638
Navy-700: #1a1f45   Navy-600: #1a237e   Red-500: #dc2626
White: #ffffff      Neutral-50: #f8fafc  Neutral-400: #9ca3af
Display: Barlow Condensed (weight 800, uppercase)
Body: Inter (weight 400/500/600)
Container: max-w-7xl, px-4 sm:px-6 lg:px-8
</code></pre>
<hr>
<h2>Section Flow (Top to Bottom)</h2>
<table>
<thead>
<tr>
<th>#</th>
<th>Section</th>
<th>Background</th>
<th>Height Feel</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>Hero</td>
<td>Navy-950 + video</td>
<td>100vh (tall)</td>
</tr>
<tr>
<td>2</td>
<td>Stats Bar</td>
<td>Navy-900</td>
<td>Short/punchy</td>
</tr>
<tr>
<td>3</td>
<td>Services</td>
<td>White</td>
<td>Medium</td>
</tr>
<tr>
<td>4</td>
<td>Industries</td>
<td>Neutral-50</td>
<td>Medium</td>
</tr>
<tr>
<td>5</td>
<td>Featured Projects</td>
<td>White</td>
<td>Tall</td>
</tr>
<tr>
<td>6</td>
<td>Diagonal CTA</td>
<td>Navy-800 + red diagonal</td>
<td>Short/punchy</td>
</tr>
<tr>
<td>7</td>
<td>Testimonials</td>
<td>White</td>
<td>Medium</td>
</tr>
<tr>
<td>8</td>
<td>Quality Contact</td>
<td>Neutral-50</td>
<td>Medium</td>
</tr>
<tr>
<td>9</td>
<td>Careers</td>
<td>Navy-900</td>
<td>Medium-tall</td>
</tr>
<tr>
<td>10</td>
<td>FAQ</td>
<td>Neutral-50 + image</td>
<td>Medium</td>
</tr>
<tr>
<td>11</td>
<td>Footer</td>
<td>Navy-950</td>
<td>Standard</td>
</tr>
</tbody></table>
<p><strong>Rhythm rule:</strong> No two sections of the same height feel sit next to each other. The alternation of tall/short/medium/short creates a visual tempo that keeps the scroll engaging.</p>
<hr>
<h2>Section 1: Hero</h2>
<h3>Current State</h3>
<p>Full-bleed video background, headline, subheading, two CTAs, stats row, trusted-by logos. Functional but flat. The stats and logos feel like afterthoughts bolted beneath the headline.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Full viewport height</strong> (100vh, min 600px). Content vertically centered in the left 60%.</li>
<li>Headline max-width 900px. Left-aligned.</li>
<li>CTA group: two buttons side-by-side on desktop, stacked on mobile.</li>
<li>Stats row: 4 items in a horizontal strip with vertical dividers between them. Positioned as a floating bar anchored to the bottom of the hero, overlapping the next section by 40px. This creates a visual bridge between hero and stats.</li>
<li>Trusted-by logos: REMOVE from hero. Move to StatBar section (see Section 2). The hero is doing too much. Let the headline breathe.</li>
<li><strong>Floating credential badge</strong>: A small glass-morphism card anchored bottom-right of the viewport. Contents: &quot;ROC #320923&quot; with a thin red-500 left border. Size: ~200px wide, ~64px tall. <code>backdrop-blur-md bg-white/5 border border-white/10</code>.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Headline</strong>: Fade in + translate up 30px. Duration 600ms, ease <code>[0.2, 0.65, 0.2, 1]</code>. Fires on mount, no scroll trigger (hero is visible on load).</li>
<li><strong>Subheading</strong>: Same animation, 150ms delay after headline.</li>
<li><strong>CTA buttons</strong>: Same animation, 300ms delay. Stagger 100ms between the two buttons.</li>
<li><strong>Stats row</strong>: <code>whileInView</code> trigger. Each stat counter animates from 0 to its value over 1200ms with <code>easeOut</code>. Stagger 120ms between stats. Use Framer Motion <code>useMotionValue</code> + <code>useTransform</code> for the number interpolation.</li>
<li><strong>Video background</strong>: Subtle parallax. On scroll, video moves at 0.6x speed (CSS <code>transform: translateY(calc(var(--scroll) * 0.4))</code>). Creates depth without being disorienting.</li>
<li><strong>Credential badge</strong>: Slides in from right after 800ms delay. <code>translateX(100%) -&gt; translateX(0)</code>, 400ms, spring damping.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: Headline. <code>heading-display</code> (clamp 3.25rem to 6rem). White. This dominates.</li>
<li><strong>Second</strong>: CTA buttons. Red primary button is the eye-magnet.</li>
<li><strong>Third</strong>: Subheading. Neutral-300, max-width 560px. Supporting, not competing.</li>
<li><strong>Fourth</strong>: Stats (emerge on scroll). Numbers in white, labels in neutral-400.</li>
</ol>
<h3>Wow Moment</h3>
<p>The stats row floating as a bridge element that overlaps hero and StatBar. As you scroll, the stats emerge from behind a subtle fade, the numbers count up, and the bar connects two sections visually instead of sitting inside either one.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Headline drops to <code>text-[3.25rem]</code> with <code>leading-[0.95]</code>. Tight stacking, editorial feel. This already works, keep it.</li>
<li>CTAs stack full-width (<code>flex-col</code>).</li>
<li>Stats grid: 2 columns, 2 rows. No dividers on mobile (too tight).</li>
<li>Credential badge: hidden on mobile (too small to render well).</li>
<li>Video poster image as fallback on reduced-motion preference.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Aceternity: Spotlight</strong> for a subtle radial light following mouse position on the hero background. Adds a living feel without being heavy.</li>
<li><strong>Framer Motion</strong>: <code>motion.div</code> with <code>initial/animate</code> for entrance, <code>useScroll</code> + <code>useTransform</code> for parallax.</li>
</ul>
<hr>
<h2>Section 2: Stats Bar</h2>
<h3>Current State</h3>
<p>Navy-900 background, hex grid pattern at 4% opacity. 4 stats in a horizontal row with dividers. Client logos below. Functional but generic.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: Navy-900 with a gradient: <code>linear-gradient(135deg, #0a0e2a 0%, #111638 60%, #0a0e2a 100%)</code>. The gradient adds subtle dimensionality vs flat navy.</li>
<li><strong>Height</strong>: Short. <code>py-12 md:py-16</code>. This is a breather section, not a content section.</li>
<li><strong>Stats</strong>: 4 items centered in a single row. Each stat: large number (clamp 2.5rem to 3.5rem, Barlow Condensed 800, white) over small label (13px Inter 500, uppercase, tracking 0.12em, neutral-400). Vertical red-500 dividers (1px wide, 40px tall) between each stat on desktop.</li>
<li><strong>Client logos</strong>: Moved here from hero. Horizontal row below stats, separated by <code>mt-10 pt-8 border-t border-white/10</code>. Logos in <code>text-white/30</code>, hover <code>text-white/60</code>. Slightly smaller than current (h-6 sm:h-7).</li>
<li><strong>Hex grid pattern</strong>: Keep at 4% opacity. Masked with radial gradient fading from center.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Stat numbers</strong>: Animated counter. Count from 0 to value over 1500ms. Use <code>whileInView</code> with <code>once: true</code>. Easing: <code>easeOut</code>. The &quot;+&quot; suffix appears after the number finishes counting.</li>
<li><strong>Dividers</strong>: Scale from <code>scaleY(0)</code> to <code>scaleY(1)</code> with <code>transform-origin: center</code>, 400ms, staggered 100ms after each stat finishes.</li>
<li><strong>Client logos</strong>: Fade in as a group, 300ms delay after stats finish. <code>opacity 0 -&gt; 1</code>, 500ms.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: The numbers. Large, white, Barlow Condensed. These are the only thing that matters here.</li>
<li><strong>Second</strong>: Labels beneath numbers. Small, muted. Context for the numbers.</li>
<li><strong>Third</strong>: Client logos. Social proof, not primary content.</li>
</ol>
<h3>Wow Moment</h3>
<p>The stat numbers counting up in sequence, each triggering the next divider to grow between them. A cascading reveal that makes the stats feel earned, not static.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>2x2 grid. No dividers (too tight).</li>
<li>Numbers at <code>text-[2.25rem]</code>. Labels at 12px.</li>
<li>Client logos wrap to 2 rows if needed. Gap shrinks to <code>gap-x-6 gap-y-4</code>.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Aceternity: Animated Counter</strong> (or custom implementation using Framer Motion <code>useSpring</code> + <code>useMotionValue</code>)</li>
<li><strong>Magic UI: Text Reveal</strong> for the &quot;Trusted By&quot; label</li>
</ul>
<hr>
<h2>Section 3: Services (&quot;What We Do&quot;)</h2>
<h3>Current State</h3>
<p>White background, red kicker, navy heading, 3-column card grid. Every card looks the same. The section is clean but forgettable. Identical structure to Industries below, creating monotony.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: White.</li>
<li><strong>Padding</strong>: <code>pt-24 md:pt-32 pb-20 md:pb-28</code>. Generous top padding creates breathing room after the dense stats bar.</li>
<li><strong>Header</strong>: Left-aligned (not centered). Red kicker <code>11px Barlow Condensed 600, uppercase, tracking 0.2em, red-500</code>. Below that: AnimatedLine. Below that: Heading at <code>heading-lg</code> size (clamp 2.75rem to 4rem). Below that: description paragraph in neutral-500, max-width 640px.</li>
<li><strong>Cards</strong>: <strong>Staggered height grid, not equal-height.</strong> 3 columns on desktop. The first card is 120% height (taller card, lead service). The second and third cards are standard height but offset: card 2 starts 40px lower than card 1, card 3 starts 20px lower than card 1. This breaks the grid monotony.</li>
<li>Each card: Rounded-xl, white background, border neutral-200, shadow-sm. Image at top (aspect-[4/3], object-cover, rounded-t-xl). Red kicker above title. Title in navy-600, Barlow Condensed 700, 20px. Description in neutral-500, Inter, 15px. On hover: border transitions to navy-600/30, card lifts <code>translateY(-4px)</code>, shadow deepens.</li>
<li><strong>CTA below grid</strong>: &quot;View All Services&quot; btn-primary, left-aligned to match header.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Header</strong>: <code>whileInView</code> fade-up. Kicker first, then AnimatedLine (extends from left, 400ms), then heading (150ms delay), then description (300ms delay).</li>
<li><strong>Cards</strong>: Staggered reveal. Each card fades in + translates up 40px. First card appears, then 150ms later the second, then 150ms later the third. Duration 500ms, ease <code>[0.2, 0.65, 0.2, 1]</code>. Trigger at 70% viewport intersection.</li>
<li><strong>Card hover</strong>: <code>whileHover={{ y: -4 }}</code> with spring transition (stiffness 300, damping 20). Subtle, purposeful.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: Heading. Navy-600, large, left-aligned with AnimatedLine drawing attention.</li>
<li><strong>Second</strong>: First card (taller, naturally draws the eye first).</li>
<li><strong>Third</strong>: Second and third cards. Staggered position creates a reading flow left-to-right-downward.</li>
</ol>
<h3>Wow Moment</h3>
<p>The staggered card heights. Nobody expects cards at different vertical positions. It breaks the grid-template monotony instantly and signals &quot;designed, not generated.&quot;</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Cards stack single-column. All equal height (stagger removed, it doesn&#39;t work vertically).</li>
<li>Header stays left-aligned.</li>
<li>Image aspect ratio stays 4/3.</li>
<li>Cards get <code>mx-0</code> (full-width within container).</li>
</ul>
<h3>Anti-patterns Avoided</h3>
<ul>
<li>No 3-column equal-height grid.</li>
<li>No centered header (left alignment is more editorial).</li>
<li>Cards have actual visual differentiation from Industries section cards.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Framer Motion</strong>: <code>staggerChildren</code> on the card container, <code>whileInView</code> + <code>whileHover</code> on individual cards.</li>
<li><strong>Aceternity: 3D Card Effect</strong> as an optional upgrade for hover interaction (subtle tilt on mouse position).</li>
</ul>
<hr>
<h2>Section 4: Industries (&quot;Where We Work&quot;)</h2>
<h3>Current State</h3>
<p>Neutral-50 background, 4-column card grid. Same ContentCard component as services. Visually indistinguishable from the services section.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: Neutral-50.</li>
<li><strong>Padding</strong>: <code>py-20 md:py-28</code>.</li>
<li><strong>Header</strong>: Left-aligned. Same pattern: kicker + AnimatedLine + heading-md + description.</li>
<li><strong>DIFFERENT from Services:</strong> Instead of a card grid, use a <strong>horizontal scrolling strip</strong> with oversized image panels. Each panel is <code>w-[75vw] sm:w-[50vw] md:w-[33vw]</code> and <code>aspect-[3/4]</code>. Full-bleed photography with a dark gradient overlay from bottom (<code>from-navy-950/80 via-navy-950/40 to-transparent</code>). Industry name as white heading at bottom-left of each panel. Priority badge chip (e.g., &quot;Air Quality&quot;, &quot;Guest Comfort&quot;) in top-left with <code>bg-red-500 text-white px-3 py-1 rounded-md text-xs uppercase tracking-widest</code>.</li>
<li>This horizontal scroll creates a fundamentally different interaction from the vertical card grid in Services. The user scrapes through images like a portfolio.</li>
<li>Fade overlays on left and right edges: <code>bg-gradient-to-r from-neutral-50</code> and <code>bg-gradient-to-l from-neutral-50</code>.</li>
<li>Navigation: Small chevron buttons right-aligned in the header row (same pattern as Featured Projects).</li>
<li>&quot;View Industries&quot; btn-primary below the scroller, left-aligned.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Panels</strong>: Snap scrolling (<code>snap-x snap-mandatory</code>). Each panel has <code>snap-center</code>.</li>
<li><strong>Panel content (text overlay)</strong>: Fades in when the panel is centered in viewport. Use <code>IntersectionObserver</code> on each panel at 0.6 threshold.</li>
<li><strong>Parallax inside panels</strong>: The background image moves at 0.9x speed within its container as you scroll horizontally, creating a subtle depth effect within each panel.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: The images. Full-bleed, high-impact photography. This section is image-first.</li>
<li><strong>Second</strong>: Industry name overlay. White, Barlow Condensed, ~28px.</li>
<li><strong>Third</strong>: Priority badge chip. Small, red, in the corner.</li>
</ol>
<h3>Wow Moment</h3>
<p>The shift from vertical card grid (Services) to horizontal image scroll (Industries). The user didn&#39;t expect to start swiping. Different layout = different mental model = remembered.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Panels become <code>w-[85vw]</code>. Still horizontal scroll.</li>
<li>Text overlays increase in size slightly for readability (name at 24px).</li>
<li>Snap scrolling stays active. One panel visible at a time with peek of the next.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Aceternity: Parallax Scroll Grid</strong> (adapted for horizontal)</li>
<li><strong>Framer Motion</strong>: <code>useScroll</code> with <code>container</code> ref for horizontal scroll tracking</li>
</ul>
<hr>
<h2>Section 5: Featured Projects / Portfolio</h2>
<h3>Current State</h3>
<p>White background. Horizontal card scroller with auto-advance. Functional. Clean. But the cards are small and the section doesn&#39;t feel like a portfolio.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: White.</li>
<li><strong>Padding</strong>: <code>py-24 md:py-32</code>. Taller section. This is the portfolio, the proof.</li>
<li><strong>Header</strong>: Left-aligned. Kicker + AnimatedLine + heading-lg (larger than other sections, this is important content). Nav arrows right-aligned in header row.</li>
<li><strong>Featured project (first card)</strong>: LARGE. Full-width, <code>aspect-[16/9]</code>, rounded-2xl. Image fills the frame. Dark gradient overlay from bottom. Project name in white Barlow Condensed 800 at ~48px in the bottom-left. Category chip in top-left. Below the image: 2-3 line description in neutral-500.</li>
<li><strong>Remaining projects</strong>: Below the featured card. <strong>Asymmetric 2-column grid.</strong> Left column is 60% width with one tall card (<code>aspect-[3/4]</code>). Right column is 40% width with two stacked cards (<code>aspect-[4/3]</code> each, gap-6 between). This creates a magazine layout.</li>
<li>All project cards: rounded-xl, image fills frame, dark gradient overlay from bottom, project name in white at bottom-left. Hover: image scale 1.03 over 500ms, overlay lightens.</li>
<li>&quot;View All Projects&quot; btn-primary centered below the grid.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Featured card</strong>: Fades in first. <code>whileInView</code>, translate up 30px, 600ms.</li>
<li><strong>Grid cards</strong>: Stagger in after featured card. Left tall card first, then right top card (100ms delay), then right bottom card (200ms delay). All fade-up 40px, 500ms.</li>
<li><strong>Card hover</strong>: Image scales from 1.0 to 1.03 (<code>whileHover</code>). Overlay opacity shifts from 0.4 to 0.3. Title gets a subtle <code>translateY(-2px)</code>.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: Featured project image. Full-width, hero-sized. This is the piece you want the prospect to see first.</li>
<li><strong>Second</strong>: Featured project name. Large, white, commanding.</li>
<li><strong>Third</strong>: Grid cards. Varied sizes create natural reading order: tall left, then top-right, then bottom-right.</li>
</ol>
<h3>Wow Moment</h3>
<p>The shift from horizontal scroller (current) to a curated magazine layout. The featured card at full-width feels like an editorial spread, not a carousel. The asymmetric grid below it feels handpicked, not auto-generated.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Featured card: full-width, <code>aspect-[16/10]</code>. Name drops to 32px.</li>
<li>Grid below: single column. All cards full-width, <code>aspect-[16/10]</code>. The asymmetry is desktop-only.</li>
<li>&quot;View All Projects&quot; button stays centered.</li>
</ul>
<h3>Anti-patterns Avoided</h3>
<ul>
<li>No carousel with dot navigation.</li>
<li>No equal-size card grid.</li>
<li>Featured card creates hierarchy that says &quot;this is our best work.&quot;</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Aceternity: Hero Parallax</strong> (for the featured card parallax depth)</li>
<li><strong>Framer Motion</strong>: <code>staggerChildren</code>, <code>whileHover</code> for card interactions</li>
</ul>
<hr>
<h2>Section 6: Diagonal CTA</h2>
<h3>Current State</h3>
<p>Navy-800 background, snowflake pattern at 5% opacity, centered heading, single button. Minimal. Gets lost between heavier sections.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: Navy-800 base. A bold <strong>red diagonal element</strong> cuts across the right 35% of the section at a 15-degree angle. The diagonal is <code>bg-red-500</code> with <code>clip-path: polygon(65% 0, 100% 0, 100% 100%, 45% 100%)</code>. This creates a dramatic two-tone split.</li>
<li><strong>Height</strong>: <code>py-16 md:py-24</code>. Short and punchy.</li>
<li><strong>Left side (65% width)</strong>: Headline in white, heading-lg. Left-aligned. Below: description in neutral-300, max-width 480px. Below: btn-primary &quot;Get a Quote&quot;.</li>
<li><strong>Right side (35% width, inside the red diagonal)</strong>: A cropped worker/job-site photo with <code>mix-blend-mode: multiply</code> against the red background. The photo should be high-contrast, showing hands on equipment or a rooftop unit. If no photo, a large snowflake SVG pattern at 15% opacity within the diagonal.</li>
<li><strong>Snowflake pattern</strong>: Still present on the navy side at 5% opacity.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Red diagonal</strong>: Slides in from right on scroll entry. <code>clipPath</code> animates from <code>polygon(100% 0, 100% 0, 100% 100%, 100% 100%)</code> to final position over 800ms, <code>easeOut</code>.</li>
<li><strong>Headline</strong>: Fades in from left, 200ms delay after diagonal starts.</li>
<li><strong>Button</strong>: Fades in, 400ms delay.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: The red diagonal. It&#39;s the most visually aggressive element on the page. Stops the scroll.</li>
<li><strong>Second</strong>: Headline. White on navy, large.</li>
<li><strong>Third</strong>: CTA button. Red on navy (matches the diagonal, creates cohesion).</li>
</ol>
<h3>Wow Moment</h3>
<p>The diagonal itself. In a page of rectangular sections, an angled color block breaks the visual monotony hard. The reference site&#39;s most memorable section was exactly this pattern.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Diagonal becomes a full-width red band at the bottom of the section (no angle on mobile, too tight).</li>
<li>Content stacks: headline, description, button, then red band with photo/pattern below.</li>
<li>Red band height: 200px with the photo/pattern inside.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Custom CSS</strong>: <code>clip-path</code> for the diagonal. Framer Motion <code>motion.div</code> for animating the clip-path.</li>
<li>No library component needed. This is a custom layout piece.</li>
</ul>
<hr>
<h2>Section 7: Testimonials</h2>
<h3>Current State</h3>
<p>White background. Single-testimonial carousel with dot navigation. Navy quote mark, quote text, author name/company. Clean but the single-card view feels thin.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: White.</li>
<li><strong>Padding</strong>: <code>py-20 md:py-28</code>.</li>
<li><strong>Header</strong>: Left-aligned. Kicker + AnimatedLine + heading-md.</li>
<li><strong>Layout change</strong>: Replace single-card carousel with a <strong>stacked card layout</strong> showing 2-3 testimonials at once on desktop. Cards are <code>max-w-[640px]</code> each. First card is full opacity and full size. Second card is offset 20px right and 16px down, at 90% scale and 70% opacity. Third card (if present) is offset 40px right and 32px down, at 80% scale and 50% opacity. Creates a depth stack.</li>
<li>The active card: rounded-xl, border neutral-200, bg-white, shadow-md. Large navy quote mark (32px SVG). Quote text in neutral-700, Inter, 18px, leading-relaxed. Author name in navy-600, Barlow Condensed 600, 14px uppercase. Company in neutral-500, 13px uppercase.</li>
<li>Nav arrows: Right-aligned in header row.</li>
<li><strong>Pull quote accent</strong>: The most impactful line from the active testimonial is extracted and displayed above the card stack in <code>heading-md</code> size, navy-600, with red-500 quotation marks. Max-width 800px. This gives the testimonial section a headline.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Card transition</strong>: When navigating, the front card slides left and fades out (300ms). The card behind scales up from 90% to 100% and moves forward (400ms, spring). New card appears at the back of the stack at 80% scale (200ms).</li>
<li><strong>Pull quote</strong>: Cross-fades between quotes (opacity transition, 400ms).</li>
<li><strong>Auto-advance</strong>: Every 8 seconds (slower than projects carousel, quotes need reading time).</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: Pull quote in large heading text. This is what the visitor reads first.</li>
<li><strong>Second</strong>: Active testimonial card with full quote and attribution.</li>
<li><strong>Third</strong>: Stacked cards behind, hinting at more testimonials.</li>
</ol>
<h3>Wow Moment</h3>
<p>The depth stack. Three cards stacked with perspective creates a sense of volume. Most testimonial sections show one flat card or a grid. The stack feels physical.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Pull quote drops to <code>heading-md</code> mobile size.</li>
<li>Card stack becomes single-card (no stacking, too tight). Standard carousel with swipe.</li>
<li>Auto-advance disabled on mobile (prevent accidental swipe conflicts).</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Framer Motion</strong>: <code>AnimatePresence</code> for card enter/exit, <code>layoutId</code> for smooth card position transitions</li>
<li>Custom stacking via CSS <code>position: absolute</code> + Framer Motion <code>animate</code> for scale/opacity</li>
</ul>
<hr>
<h2>Section 8: Quality Contact / CTA</h2>
<h3>Current State</h3>
<p>Neutral-50 background. 2-column: copy + buttons on left, proof points + quick facts on right. Functional, conversion-focused. The layout works but the left side is text-heavy.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: Neutral-50.</li>
<li><strong>Padding</strong>: <code>py-20 md:py-28</code>.</li>
<li><strong>2-column split: 55% left / 45% right.</strong></li>
<li><strong>Left column</strong>:<ul>
<li>Kicker + AnimatedLine + heading-md (navy-600).</li>
<li>Description paragraph, neutral-500, max-width 480px.</li>
<li>CTA group: btn-primary &quot;Start the Conversation&quot; + btn-secondary &quot;Call Dispatch&quot;. Side-by-side on desktop, stacked on mobile.</li>
<li>Below CTAs: A single stat callout. &quot;Response within 1 business day&quot; with a small clock icon (Lucide). Red-500 icon, navy-600 text, 14px Barlow Condensed 600 uppercase.</li>
</ul>
</li>
<li><strong>Right column</strong>:<ul>
<li>A single card with rounded-xl, border neutral-200, bg-white, shadow-sm, p-8.</li>
<li><strong>&quot;Why Teams Trust Us&quot;</strong> heading at top (13px Barlow Condensed 600, uppercase, tracking 0.16em, neutral-500).</li>
<li>Proof points as a clean list. Each item: red-500 dot (6px), navy-600 text (15px Inter 500). Spacing <code>space-y-3</code>.</li>
<li>Below proof points: a divider (border-t border-neutral-200, my-6).</li>
<li>Quick facts: &quot;ROC #320923&quot; in navy-600 font-medium. Coverage area. Response time.</li>
<li>Bottom of card: A small map pin icon + &quot;Phoenix, AZ&quot; in neutral-500, 13px.</li>
</ul>
</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Left column</strong>: Standard fade-up on scroll entry.</li>
<li><strong>Right column card</strong>: Slides in from right, 200ms delay. <code>translateX(30px) -&gt; 0</code>, 500ms.</li>
<li><strong>Proof points</strong>: Stagger in. Each dot + text fades in 100ms after the previous. Creates a &quot;building the case&quot; feel.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: Heading. &quot;Straight talk, clean execution, no runaround.&quot;</li>
<li><strong>Second</strong>: CTA buttons. Red primary immediately visible.</li>
<li><strong>Third</strong>: Proof points card. Supporting evidence on the right.</li>
</ol>
<h3>Wow Moment</h3>
<p>The staggered proof point reveal. Each point appears in sequence like a checklist being built in real-time. Subtle but makes the section feel alive, not static.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Single column. Left content first, then proof points card below.</li>
<li>CTAs stack full-width.</li>
<li>Card gets full-width within container.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Framer Motion</strong>: <code>staggerChildren</code> on proof points list</li>
<li><strong>Lucide icons</strong>: Clock, MapPin, Shield for visual accents</li>
</ul>
<hr>
<h2>Section 9: Careers (&quot;Join the Crew&quot;)</h2>
<h3>Current State</h3>
<p>Navy-900 background. Large &quot;6 Open Roles&quot; counter, 3-column role card grid. Cards are navy-800 with border navy-600/30. Functional, dark, consistent with brand.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: Navy-900 with hex grid pattern at 4% opacity (keep existing).</li>
<li><strong>Padding</strong>: <code>py-20 md:py-28</code>.</li>
<li><strong>Header</strong>: Left-aligned. Kicker in red-500. Red line divider (w-8, h-[2px], bg-red-500). Heading-md in white. Description in neutral-300.</li>
<li><strong>Open Roles counter</strong>: REDESIGN. Instead of the current inline counter badge, make it a standalone element left of the heading. A large <code>text-7xl md:text-8xl</code> number in red-500, Barlow Condensed 800. &quot;Open Roles&quot; label in neutral-400 at 13px below the number. The number sits in its own column at ~120px wide, creating an asymmetric header layout: large number on left, heading + description on right.</li>
<li><strong>Role cards</strong>: Keep 3-column grid but add visual hierarchy. First card: slightly larger padding (p-8 md:p-10) with a &quot;Featured&quot; chip in red-500. Remaining cards: standard padding (p-6 md:p-8). All cards: navy-800 background, border navy-600/30, rounded-xl. Hover: border-white/20, subtle <code>translateY(-2px)</code>.</li>
<li>Each card: red-500 kicker (13px), white title (20px Barlow Condensed 700), neutral-400 description (14px Inter), chips for level/location in <code>bg-white/5 border border-white/10</code>.</li>
<li>&quot;Show All Roles&quot; button: btn-dark-cta, centered below grid.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Open Roles number</strong>: Animated counter from 0 to value, 1200ms, easeOut. Same pattern as StatBar counters.</li>
<li><strong>Cards</strong>: Stagger in from bottom. 150ms between each. Fade + translateY(30px), 400ms.</li>
<li><strong>Featured card</strong>: Appears first (0ms delay). Remaining cards stagger after it.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: The giant role count number. Red-500, 80-96px. Impossible to miss.</li>
<li><strong>Second</strong>: Heading. White, Barlow Condensed.</li>
<li><strong>Third</strong>: Role cards. Each card is a scan target.</li>
</ol>
<h3>Wow Moment</h3>
<p>The oversized role count. A <code>text-8xl</code> red number on a dark background is dramatic. It says &quot;we&#39;re growing&quot; louder than any paragraph could.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Role count moves above the heading (not beside it). Full-width, centered. <code>text-6xl</code>.</li>
<li>Cards stack single-column. Featured card keeps its larger padding.</li>
<li>&quot;Show All Roles&quot; stays centered.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Aceternity: Animated Counter</strong> for the role count</li>
<li><strong>Framer Motion</strong>: <code>staggerChildren</code>, <code>whileInView</code></li>
</ul>
<hr>
<h2>Section 10: FAQ</h2>
<h3>Current State</h3>
<p>Neutral-50 background. Centered accordion, max-w-3xl. Clean but dry. No visual weight.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: Neutral-50.</li>
<li><strong>Padding</strong>: <code>py-20 md:py-28</code>.</li>
<li><strong>REDESIGN: Split layout.</strong> 45% left: a full-height image (job site photo, technician at work, rooftop unit close-up). Image is <code>rounded-2xl</code>, <code>object-cover</code>, <code>aspect-[3/4]</code> on desktop. A thin red-500 border on the left edge of the image (3px solid).</li>
<li><strong>55% right</strong>: Kicker + AnimatedLine + heading-md (navy-600). Accordion below.</li>
<li><strong>Accordion redesign</strong>: Cards instead of flat rows. Each FAQ item: rounded-xl, border neutral-200, bg-white, shadow-sm. Question in navy-600 Barlow Condensed 600, uppercase, tracking 0.02em. Red-500 &quot;+&quot; icon that rotates 45 degrees to &quot;x&quot; on open. Answer in neutral-500 Inter 15px.</li>
<li>Gap between accordion items: <code>space-y-3</code> (keep current).</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>Image</strong>: Fades in with a subtle parallax. As you scroll through the FAQ section, the image moves at 0.85x speed relative to content. Creates depth without being distracting.</li>
<li><strong>Accordion items</strong>: Stagger in on scroll entry. Each item fades in + slides up 20px, 100ms between items, 300ms duration.</li>
<li><strong>Accordion open/close</strong>: Smooth height animation using <code>AnimatePresence</code> + <code>motion.div</code> with <code>initial={{ height: 0, opacity: 0 }}</code> and <code>animate={{ height: &quot;auto&quot;, opacity: 1 }}</code>. Duration 300ms. The &quot;+&quot; rotation is 200ms.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: Image. The photo gives this section weight and breaks the text monotony.</li>
<li><strong>Second</strong>: Section heading.</li>
<li><strong>Third</strong>: Accordion questions (scannable, uppercase).</li>
</ol>
<h3>Wow Moment</h3>
<p>The image. Most FAQ sections are text-only. Adding a strong job-site photo transforms it from a dry legal-feeling section into a branded content moment.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Image moves above the accordion. Full-width, <code>aspect-[16/9]</code>, rounded-xl. Cropped landscape, not portrait.</li>
<li>Accordion becomes full-width below.</li>
<li>Red left border on image becomes a red top border on mobile.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li><strong>Framer Motion</strong>: <code>AnimatePresence</code> for accordion content, <code>useScroll</code> + <code>useTransform</code> for image parallax</li>
<li>Custom accordion (not a library component, the current implementation is close, just needs the split layout and animation upgrade)</li>
</ul>
<hr>
<h2>Section 11: Footer</h2>
<h3>Current State</h3>
<p>Navy-950 background. Red gradient top border (3px). 4-column layout: logo/tagline, quick links, services, contact. Legal bar at bottom. Functional, correct.</p>
<h3>Layout Composition</h3>
<ul>
<li><strong>Background</strong>: Navy-950. Keep existing.</li>
<li><strong>Red top border</strong>: Keep the <code>h-[3px] bg-gradient-to-r from-red-500 via-red-500/60 to-transparent</code>. This is a strong brand signature.</li>
<li><strong>Padding</strong>: <code>py-16</code>. Keep.</li>
<li><strong>4-column grid</strong>: Keep. But add visual improvements:<ul>
<li>Column 1 (Logo): Add <code>max-w-[240px]</code> to tagline paragraph. Add an <code>mt-6</code> before social icons for breathing room.</li>
<li>Column 4 (Contact): Make the phone number slightly larger (<code>text-base font-medium text-white</code>). It&#39;s the most important footer element and should stand out.</li>
<li><strong>New element</strong>: Below the 4-column grid, above the legal bar, add a thin full-width section with &quot;Serving Arizona since 2002&quot; centered in <code>text-xs uppercase tracking-[0.2em] text-neutral-600</code>. Reinforces the founding date.</li>
</ul>
</li>
<li><strong>Legal bar</strong>: <code>mt-12 border-t border-white/10 pt-6</code>. Keep centered layout.</li>
<li>&quot;Licensed ROC #320923&quot; badge: Keep but increase to <code>text-[11px]</code> (from 10px) for readability.</li>
</ul>
<h3>Motion Behavior</h3>
<ul>
<li><strong>None.</strong> The footer should feel solid and grounded, not animated. Static = trustworthy at the bottom of the page.</li>
<li>Exception: social icons get a color transition on hover (<code>text-neutral-400 -&gt; text-white</code>, 200ms). Already in place, keep.</li>
</ul>
<h3>Visual Hierarchy</h3>
<ol>
<li><strong>First</strong>: Logo mark. The brand anchor.</li>
<li><strong>Second</strong>: Phone number and email. Conversion targets.</li>
<li><strong>Third</strong>: Navigation links. Utility.</li>
<li><strong>Fourth</strong>: Legal. Background noise.</li>
</ol>
<h3>Wow Moment</h3>
<p>No wow moment in the footer. This is intentional. The footer is the resolution, not the climax. It should feel stable, trustworthy, and easy to scan.</p>
<h3>Responsive (390px)</h3>
<ul>
<li>Stack to single column. Logo first, then nav, then services, then contact.</li>
<li>Order is important: contact info should not be buried at the bottom. Consider <code>order</code> utilities to push contact above services on mobile.</li>
</ul>
<h3>Component Reference</h3>
<ul>
<li>No special components. Standard HTML + Tailwind.</li>
</ul>
<hr>
<h2>Cross-Section Rules</h2>
<h3>Color Ratio Enforcement</h3>
<p>The Ambition palette ratio is 35/35/15/15 (white/navy/red/gray):</p>
<ul>
<li>White sections (Services, Projects, Testimonials): white backgrounds, navy headings, red accents (kickers, lines, buttons)</li>
<li>Navy sections (Hero, Stats, CTA, Careers): navy backgrounds, white text, red accents (one element per section max)</li>
<li>Neutral sections (Industries, Quality Contact, FAQ): neutral-50 backgrounds, navy headings, red accents</li>
<li>Red is ALWAYS an accent. Never a background for a full section. One red element per section maximum.</li>
</ul>
<h3>Typography Scale (All Sections)</h3>
<table>
<thead>
<tr>
<th>Use</th>
<th>Class</th>
<th>Spec</th>
</tr>
</thead>
<tbody><tr>
<td>Hero headline</td>
<td><code>heading-display</code></td>
<td>clamp(3.25rem, 8vw, 6rem), Barlow Condensed 800, uppercase, tracking 0.04em, leading 0.92</td>
</tr>
<tr>
<td>Section headline (important)</td>
<td><code>heading-lg</code></td>
<td>clamp(2.75rem, 5vw, 4rem), Barlow Condensed 800, uppercase, tracking 0.03em, leading 1.0</td>
</tr>
<tr>
<td>Section headline (standard)</td>
<td><code>heading-md</code></td>
<td>clamp(2rem, 3.5vw, 2.75rem), Barlow Condensed 800, uppercase, tracking 0.02em, leading 1.1</td>
</tr>
<tr>
<td>Card title</td>
<td>custom</td>
<td>20px Barlow Condensed 700, uppercase, tracking 0.02em</td>
</tr>
<tr>
<td>Kicker</td>
<td><code>section-kicker</code></td>
<td>11px Barlow Condensed 600, uppercase, tracking 0.2em</td>
</tr>
<tr>
<td>Body copy</td>
<td>font-body</td>
<td>15-16px Inter 400, leading-relaxed</td>
</tr>
<tr>
<td>Small labels</td>
<td>custom</td>
<td>13px Inter 500, uppercase, tracking 0.12em</td>
</tr>
<tr>
<td>Legal/meta</td>
<td>custom</td>
<td>12px Inter 400, neutral-500/600</td>
</tr>
</tbody></table>
<h3>Minimum Text Size</h3>
<p>16px body text minimum. The only exceptions:</p>
<ul>
<li>Section kickers at 11px (functional, not content)</li>
<li>Footer copyright at 12px (legal, standard)</li>
<li>Chip/badge text at 12-13px (UI element, not content)
Everything else: 15px or larger.</li>
</ul>
<h3>Section Transition Rhythm</h3>
<p>Sections alternate backgrounds: dark / light / off-white / light / dark. The pattern creates natural visual grouping without needing explicit dividers. The red AnimatedLine or section-divider is used WITHIN sections for header decoration, not BETWEEN sections.</p>
<h3>Motion Budget</h3>
<p>Total unique motion types on the page: 5 maximum.</p>
<ol>
<li>Fade-up reveal (primary, used on most content)</li>
<li>Counter animation (stats, role count)</li>
<li>Staggered children (cards, proof points)</li>
<li>Parallax (hero video, FAQ image)</li>
<li>Clip-path/slide (diagonal CTA)</li>
</ol>
<p>No other motion types. Consistency &gt; variety. Every motion should feel like the same design system, not a component library demo.</p>
<h3>Performance Rules</h3>
<ul>
<li>All animations use <code>transform</code> and <code>opacity</code> only. No animating <code>width</code>, <code>height</code>, <code>top</code>, <code>left</code>, or <code>margin</code>.</li>
<li><code>will-change</code> applied to animated elements, removed after animation completes.</li>
<li>Images: <code>loading=&quot;lazy&quot;</code> on everything below the fold.</li>
<li>Video: <code>preload=&quot;metadata&quot;</code> on hero video. Poster image as fallback.</li>
<li>Intersection Observer threshold: 0.3 for most reveals, 0.7 for stats (need to be mostly visible before counting).</li>
<li><code>once: true</code> on all <code>whileInView</code> triggers. Animations play once, not on every scroll pass.</li>
</ul>
<hr>
<h2>Build Priority Order for Bobby</h2>
<ol>
<li><strong>Diagonal CTA (Section 6)</strong> - Highest visual impact, replaces the weakest current section. 4-6 hours.</li>
<li><strong>FAQ Split Layout (Section 10)</strong> - Image + accordion split. Transforms the driest section. 3-4 hours.</li>
<li><strong>Stats Bar with counters (Section 2)</strong> - Animated counters + logo migration from hero. 3-4 hours.</li>
<li><strong>Services staggered cards (Section 3)</strong> - Staggered heights + animation. 3-4 hours.</li>
<li><strong>Industries horizontal scroll (Section 4)</strong> - New interaction pattern. 4-5 hours.</li>
<li><strong>Hero floating stats + credential badge (Section 1)</strong> - Refinement, not rebuild. 2-3 hours.</li>
<li><strong>Featured Projects magazine layout (Section 5)</strong> - Layout restructure. 4-5 hours.</li>
<li><strong>Testimonials depth stack (Section 7)</strong> - Card stacking + pull quote. 3-4 hours.</li>
<li><strong>Quality Contact staggered proof points (Section 8)</strong> - Minor enhancement. 2 hours.</li>
<li><strong>Careers oversized counter (Section 9)</strong> - Layout tweak + counter. 2 hours.</li>
<li><strong>Footer polish (Section 11)</strong> - Minor adjustments. 1 hour.</li>
</ol>
<p><strong>Total estimated: ~32-40 hours of Bobby build time.</strong></p>
<hr>
<h2>Reference Sites for Bobby to Study</h2>
<ul>
<li>Turner Construction (turnerconstruction.com) - HD video hero, audience segmentation</li>
<li>PCL Construction (pcl.com) - Premium slide transitions</li>
<li>Clark Construction (clarkconstruction.com) - Striking imagery + smooth nav</li>
<li>Brasfield &amp; Gorrie (brasfieldgorrie.com) - Legacy brand modernized by Matchstic</li>
<li>Aceternity UI demos (ui.aceternity.com) - Hero Parallax, Spotlight, 3D Card demos</li>
</ul>
`,c={title:e,slug:t,category:n,agent:o,date:i,dateFormatted:r,updated:null,summary:a,tags:l,content:s};export{o as agent,n as category,s as content,i as date,r as dateFormatted,c as default,t as slug,a as summary,l as tags,e as title,d as updated};
