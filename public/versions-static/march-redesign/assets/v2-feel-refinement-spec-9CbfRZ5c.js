const e="/v2 Feel Refinement Spec",t="v2-feel-refinement-spec",o="Design Specs",n="Steffen",i="2026-03-12",d="Mar 12",l=null,r="Framer Motion addendum for /v2 rebuild: transitions, animations, and premium feel.",a=[],s=`<h1>/v2 Feel Refinement Spec: Framer Motion Addendum</h1>
<blockquote>
<p>Steffen | 2026-03-12
Addendum to fullscreen-site-design-spec.md
Bobby is rebuilding /v2 from CSS scroll-snap to Framer Motion. This spec covers the feel layer: transitions, animations, progress indicator redesign, and the &quot;audit energy&quot; that makes the experience premium.
Brand system: Bold Graphic v4. Fonts: Syne + Space Grotesk + JetBrains Mono.</p>
</blockquote>
<hr>
<h2>Why Framer Motion Changes Everything</h2>
<p>The original spec was built around CSS <code>scroll-snap-type: y mandatory</code>. That model gives you one thing: a decisive snap to each slide. But it gives you ZERO control over:</p>
<ul>
<li>What happens BETWEEN slides (the transition itself)</li>
<li>What direction the content exits (it just scrolls away)</li>
<li>Per-element choreography (staggering content in/out independently)</li>
<li>Gesture-driven progress (how far through a transition the user is)</li>
</ul>
<p>Framer Motion replaces the browser&#39;s scroll snap with a controlled animation state machine. Each slide is an <code>AnimatePresence</code> child. The transition is now a DESIGN SURFACE, not a browser default.</p>
<hr>
<h2>Transition Model</h2>
<h3>Slide-to-Slide Transition</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Library</td>
<td><code>framer-motion</code> (<code>motion</code>, <code>AnimatePresence</code>)</td>
<td>Already in use on /audit/test</td>
</tr>
<tr>
<td>Mode</td>
<td><code>AnimatePresence mode=&quot;wait&quot;</code></td>
<td>Exit completes before enter starts. Clean. No overlap.</td>
</tr>
<tr>
<td>Direction</td>
<td>Vertical (<code>y</code> axis)</td>
<td>Forward = exit up, enter from below. Backward = exit down, enter from above.</td>
</tr>
<tr>
<td>Exit translate</td>
<td><code>y: -60px</code> (forward) / <code>y: 60px</code> (backward)</td>
<td>Enough motion to feel directional without being dramatic</td>
</tr>
<tr>
<td>Enter translate</td>
<td><code>y: 40px</code> (forward) / <code>y: -40px</code> (backward)</td>
<td>Slightly less than exit. The new slide &quot;arrives&quot; closer to position.</td>
</tr>
<tr>
<td>Exit opacity</td>
<td><code>opacity: 0</code></td>
<td>Full fade out</td>
</tr>
<tr>
<td>Enter opacity</td>
<td><code>opacity: 0</code> to <code>opacity: 1</code></td>
<td>Full fade in</td>
</tr>
<tr>
<td>Exit duration</td>
<td><code>0.25s</code></td>
<td>Fast exit. Don&#39;t linger on old content.</td>
</tr>
<tr>
<td>Enter duration</td>
<td><code>0.35s</code></td>
<td>Slightly slower. Let the new slide breathe into place.</td>
</tr>
<tr>
<td>Exit easing</td>
<td><code>[0.4, 0, 1, 1]</code> (accelerate out)</td>
<td>Content accelerates away. Feels like it&#39;s being dismissed.</td>
</tr>
<tr>
<td>Enter easing</td>
<td><code>[0, 0, 0.2, 1]</code> (decelerate in)</td>
<td>Content decelerates into place. Feels like it&#39;s landing.</td>
</tr>
<tr>
<td>Total transition time</td>
<td>~0.6s perceived (0.25s exit + 0.35s enter, no overlap)</td>
<td>Audit tool runs at 0.3s total. We want slightly more weight here because each slide carries more visual content.</td>
</tr>
</tbody></table>
<h3>What NOT To Do</h3>
<ul>
<li>No crossfade. Overlapping content creates visual noise on full-viewport slides.</li>
<li>No scale transitions (scale from 0.95 to 1.0, etc.). The audit tool uses this because its slides are centered cards. Full-viewport slides don&#39;t need it. Scale would look like a zoom and fight the video backgrounds.</li>
<li>No horizontal transitions. This is a vertical narrative. Horizontal motion signals lateral navigation (tabs, carousels), not progression.</li>
<li>No spring physics for slide transitions. Springs are great for micro-interactions (buttons, tooltips). For full-viewport transitions, use tween with explicit easing. Springs on large movements feel bouncy and playful, which fights the cinematic tone.</li>
</ul>
<hr>
<h2>Direction-Aware Transitions (Implementation)</h2>
<p>Bobby needs to track navigation direction to animate correctly.</p>
<pre><code>// Conceptual model (not code, just logic for Bobby)

state: currentSlide, direction (&#39;forward&#39; | &#39;backward&#39;)

When user navigates:
  if newSlide &gt; currentSlide: direction = &#39;forward&#39;
  if newSlide &lt; currentSlide: direction = &#39;backward&#39;

Exit variant:
  forward:  { y: -60, opacity: 0 }
  backward: { y: 60, opacity: 0 }

Enter variant:
  forward:  initial { y: 40, opacity: 0 } -&gt; animate { y: 0, opacity: 1 }
  backward: initial { y: -40, opacity: 0 } -&gt; animate { y: 0, opacity: 1 }
</code></pre>
<p>This is EXACTLY how the audit tool handles it (line 254: <code>initial={{ opacity: 0, x: 40 }}</code> and <code>exit={{ opacity: 0, x: -40 }}</code>), except the audit tool uses horizontal direction because it&#39;s a form wizard. We use vertical because it&#39;s a pitch deck.</p>
<hr>
<h2>Progress Indicator Redesign: Top Bar Replacing Side Dots</h2>
<h3>Why the Change</h3>
<p>The original spec called for a vertical dot rail on the right side (desktop) and a horizontal dot pill at the bottom (mobile). With Framer Motion, the progress indicator needs to work harder because the browser&#39;s native scroll position is gone. The user needs a stronger &quot;you are here&quot; signal.</p>
<p>The audit tool&#39;s top progress bar is the right model: always visible, always accurate, zero screen real estate cost on the sides.</p>
<h3>Desktop + Mobile: Unified Top Bar</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Position</td>
<td><code>fixed top-0 left-0 right-0 z-50</code></td>
</tr>
<tr>
<td>Container background</td>
<td><code>rgba(12,12,12,0.90)</code>, <code>backdrop-filter: blur(12px)</code></td>
</tr>
<tr>
<td>Container height</td>
<td><code>44px</code> (includes label row + progress bar)</td>
</tr>
<tr>
<td>Container border</td>
<td><code>border-bottom: 1px solid rgba(255,255,255,0.06)</code></td>
</tr>
</tbody></table>
<h3>Label Row (Inside Container)</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Layout</td>
<td>Flex, <code>justify-between</code>, <code>align-center</code></td>
</tr>
<tr>
<td>Padding</td>
<td><code>0 24px</code> (mobile), <code>0 48px</code> (desktop)</td>
</tr>
<tr>
<td>Height</td>
<td><code>36px</code></td>
</tr>
<tr>
<td>Left content</td>
<td>Slide label: JetBrains Mono 500, 11px, uppercase, <code>tracking: 0.15em</code>, <code>#8A847C</code></td>
</tr>
<tr>
<td>Left format</td>
<td><code>&quot;HERO&quot;</code> on Slide 1, <code>&quot;THE HOOK&quot;</code> on Slide 2, etc. (use the slide names from SLIDES array)</td>
</tr>
<tr>
<td>Right content</td>
<td>Slide counter: JetBrains Mono 400, 11px, <code>#5A5550</code>. Format: <code>&quot;2 / 8&quot;</code></td>
</tr>
<tr>
<td>Transition</td>
<td>Label text crossfades on slide change: <code>opacity 0 &gt; 1</code>, <code>200ms ease</code>, <code>50ms</code> delay after slide transition starts</td>
</tr>
</tbody></table>
<h3>Progress Bar (Below Label Row)</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Height</td>
<td><code>3px</code></td>
</tr>
<tr>
<td>Track background</td>
<td><code>#1A1A1A</code></td>
</tr>
<tr>
<td>Fill background</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>Fill width</td>
<td><code>(currentSlide / (totalSlides - 1)) * 100%</code></td>
</tr>
<tr>
<td>Fill transition</td>
<td><code>width 0.4s ease-out</code> (motion.div animate)</td>
</tr>
<tr>
<td>Fill glow</td>
<td><code>box-shadow: 0 0 8px rgba(232,93,38,0.3)</code> at the leading edge</td>
</tr>
</tbody></table>
<h3>Visibility Rules</h3>
<table>
<thead>
<tr>
<th>Context</th>
<th>Behavior</th>
</tr>
</thead>
<tbody><tr>
<td>Slide 1 (Hero)</td>
<td>HIDDEN. Hero gets full immersion. No bar.</td>
</tr>
<tr>
<td>Slides 2-8</td>
<td>VISIBLE. Fades in when Slide 2 activates: <code>opacity 0 &gt; 1, 300ms ease</code>.</td>
</tr>
<tr>
<td>&quot;Keep Exploring&quot; section</td>
<td>HIDDEN. Fades out when scrolling past Slide 8.</td>
</tr>
<tr>
<td>Mobile</td>
<td>Same exact component. No variant needed. The top bar works at all widths.</td>
</tr>
</tbody></table>
<h3>What This Replaces</h3>
<ul>
<li>Kill the vertical dot rail (desktop). The top bar does the job without eating right-side space.</li>
<li>Kill the horizontal dot pill (mobile). Same reason.</li>
<li>Kill the dot hover tooltips. The label row already shows the slide name.</li>
<li>Keep dot-click navigation? YES. Add invisible click/tap targets within the progress bar itself. Divide the bar into 8 equal zones. Clicking a zone navigates to that slide. Cursor: <code>pointer</code> on hover. Active zone gets a subtle tooltip: slide name, <code>150ms</code> fade, positioned below the bar.</li>
</ul>
<h3>Audit Tool Reference</h3>
<p>The audit tool (AuditTest.jsx, lines 583-614) does this:</p>
<ul>
<li>Section label top-left: <code>meta.section / slideInSection of totalInSection</code></li>
<li>Percentage top-right: <code>Math.round(progress)% complete</code></li>
<li>Orange bar below: <code>motion.div</code> animating width</li>
</ul>
<p>We take the same structure but adapt for 8 slides instead of 33. The label is simpler (just the slide name), the counter is simpler (<code>2 / 8</code> instead of <code>23% complete</code>). The bar has the same orange fill with the same <code>easeOut</code> transition.</p>
<hr>
<h2>Per-Slide Entrance Animations (Framer Motion)</h2>
<p>The original spec already defined entrance animations per slide. Those specs are STILL CORRECT for the content choreography. What changes is the implementation: instead of <code>IntersectionObserver</code> triggering CSS animations, Framer Motion&#39;s <code>motion.div</code> with <code>initial</code>/<code>animate</code> handles it.</p>
<h3>Stagger Pattern</h3>
<p>Every slide follows the same pattern with slide-specific timing:</p>
<pre><code>Parent: AnimatePresence mode=&quot;wait&quot;
  Slide wrapper: motion.div (handles the y-translate + opacity for the whole slide)
    Stagger container: motion.div with staggerChildren
      Child 1: motion.div (micro-label or section label)
      Child 2: motion.div (headline)
      Child 3: motion.div (body text)
      Child 4: motion.div (cards, stats, media)
</code></pre>
<h3>Global Stagger Defaults</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>First visit</th>
<th>Revisit</th>
</tr>
</thead>
<tbody><tr>
<td>Parent staggerChildren</td>
<td><code>0.08s</code></td>
<td><code>0.05s</code></td>
</tr>
<tr>
<td>Child initial</td>
<td><code>{ y: 20, opacity: 0 }</code></td>
<td><code>{ y: 12, opacity: 0 }</code></td>
</tr>
<tr>
<td>Child animate</td>
<td><code>{ y: 0, opacity: 1 }</code></td>
<td><code>{ y: 0, opacity: 1 }</code></td>
</tr>
<tr>
<td>Child duration</td>
<td><code>0.4s</code></td>
<td><code>0.3s</code></td>
</tr>
<tr>
<td>Child easing</td>
<td><code>[0, 0, 0.2, 1]</code> (decelerate)</td>
<td><code>[0, 0, 0.2, 1]</code></td>
</tr>
<tr>
<td>Start delay</td>
<td><code>0.15s</code> after slide enters</td>
<td><code>0.08s</code> after slide enters</td>
</tr>
</tbody></table>
<h3>Per-Slide Stagger Overrides</h3>
<p>These override the defaults where the original spec called for specific timing:</p>
<p><strong>Slide 1 (Hero):</strong></p>
<ul>
<li>Micro-label: <code>delay: 0</code>, <code>duration: 0.5s</code>, <code>y: 20</code></li>
<li>Headline: <code>delay: 0.15s</code>, <code>duration: 0.5s</code>, <code>y: 20</code></li>
<li>Subhead: <code>delay: 0.3s</code>, <code>duration: 0.4s</code>, <code>y: 20</code></li>
<li>Status bar: <code>delay: 0.6s</code>, <code>duration: 0.4s</code>, <code>y: 0</code> (fade only, no translate)</li>
<li>Down arrow: <code>delay: 0.8s</code>, <code>duration: 0.4s</code>, <code>y: 0</code> (fade only)</li>
</ul>
<p><strong>Slide 2 (Hook):</strong></p>
<ul>
<li>Left column (label, headline, body): <code>staggerChildren: 0.1s</code>, <code>y: 15</code></li>
<li>Right column (stat blocks): <code>staggerChildren: 0.1s</code>, start after <code>0.3s</code>, <code>y: 20</code></li>
<li>Stats stagger in reading order: top-left, top-right, bottom-left, bottom-right</li>
</ul>
<p><strong>Slide 3 (Work/Portfolio):</strong></p>
<ul>
<li>Section label: <code>delay: 0</code>, <code>duration: 0.3s</code>, fade only</li>
<li>Video reel: <code>delay: 0.1s</code>, <code>duration: 0.5s</code>, fade only (no translate on video)</li>
<li>Client name: <code>delay: 0.4s</code>, <code>duration: 0.3s</code>, <code>y: 10</code></li>
<li>Thumbnails: <code>staggerChildren: 0.08s</code>, start at <code>0.5s</code>, <code>y: 10</code></li>
</ul>
<p><strong>Slide 4 (Services):</strong></p>
<ul>
<li>Section label + headline: <code>staggerChildren: 0.1s</code>, <code>y: 15</code></li>
<li>Service cards: <code>staggerChildren: 0.12s</code>, start at <code>0.25s</code>, <code>y: 25</code></li>
</ul>
<p><strong>Slide 5 (Construction):</strong></p>
<ul>
<li>Left content (label through CTA): <code>staggerChildren: 0.1s</code>, <code>y: 15</code></li>
<li>Right media: <code>delay: 0.3s</code>, <code>duration: 0.5s</code>, <code>scale: 0.97 &gt; 1.0</code> + opacity</li>
</ul>
<p><strong>Slide 6 (AI Advisory):</strong></p>
<ul>
<li>Left content: <code>staggerChildren: 0.1s</code>, <code>y: 15</code></li>
<li>Step cards: <code>staggerChildren: 0.12s</code>, start at <code>0.3s</code>, <code>y: 20</code></li>
</ul>
<p><strong>Slide 7 (Social Proof):</strong></p>
<ul>
<li>Section label + headline: <code>staggerChildren: 0.1s</code>, <code>y: 15</code></li>
<li>Testimonial cards: <code>staggerChildren: 0.15s</code>, start at <code>0.25s</code>, <code>y: 25</code></li>
<li>Logo row (if present): <code>delay: 0.6s</code>, <code>duration: 0.4s</code>, fade only</li>
</ul>
<p><strong>Slide 8 (Contact):</strong></p>
<ul>
<li>Left side: <code>staggerChildren: 0.1s</code>, <code>y: 15</code></li>
<li>Form fields: <code>staggerChildren: 0.08s</code>, start at <code>0.3s</code>, <code>y: 15</code></li>
<li>Submit button: <code>delay: 0.7s</code>, <code>y: 20</code></li>
</ul>
<hr>
<h2>The &quot;Audit Energy&quot;: What Makes /audit/test Feel Premium</h2>
<p>The audit tool is the gold standard for feel on the AOM site. Here&#39;s exactly what creates that energy, and how /v2 must match or exceed it.</p>
<h3>1. Controlled Pacing</h3>
<p>The audit tool removes the user&#39;s ability to scroll freely. You advance one slide at a time via button click, keyboard (Enter/Arrow), or deliberate action. This creates a GUIDED experience. The user surrenders control to the narrative.</p>
<p><strong>/v2 must match this.</strong> With Framer Motion replacing scroll-snap, Bobby controls when slides advance. Options:</p>
<ul>
<li>Wheel/swipe: debounce to one slide per gesture (same as mandatory scroll-snap, but now controlled in JS)</li>
<li>Keyboard: ArrowDown/Up, PageDown/Up advance one slide</li>
<li>Click: progress bar zones and nav links</li>
<li>Touch: swipe up/down with momentum threshold (swipe must travel &gt;50px to trigger)</li>
</ul>
<p><strong>Debounce is critical.</strong> Without it, a fast scroll will skip 3 slides. Implement a <code>isTransitioning</code> lock that blocks input during the 0.6s transition window.</p>
<h3>2. Dark-on-Dark Warmth</h3>
<p>The audit tool uses <code>#0C0C0C</code> as the base with <code>#FDF6EC</code> cream for content slides. The warmth comes from:</p>
<ul>
<li><code>#FDF6EC</code> cream (never cold white <code>#FFFFFF</code>)</li>
<li><code>#E85D26</code> orange as the ONLY bright color (no blue, no green, no competing accents)</li>
<li><code>#8A847C</code> for secondary text (warm gray, not cool gray)</li>
<li><code>rgba(232,93,38,0.15)</code> orange glow on interactive elements</li>
</ul>
<p><strong>/v2 already has this in the spec.</strong> No changes needed. Just don&#39;t let any cold colors creep in during implementation.</p>
<h3>3. Generous Whitespace</h3>
<p>The audit tool&#39;s content slides (<code>ContentSlide</code> wrapper) use <code>max-w-2xl mx-auto</code> (672px max). That&#39;s narrow. Content breathes. Nothing feels cramped.</p>
<p><strong>/v2 adaptation:</strong> Our slides have more complex layouts (split columns, card grids). The max-width is <code>1200px</code> per the original spec. That&#39;s correct for the content density. But within each zone (left column, right column, individual cards), maintain generous internal padding. The <code>32px</code> card padding, <code>64px</code> column gaps, and <code>24px</code> grid gaps from the original spec are correct. Don&#39;t compress them.</p>
<h3>4. Single Focused Action Per Slide</h3>
<p>The audit tool shows ONE question per slide (usually). No competing CTAs, no distractions. You answer and advance.</p>
<p><strong>/v2 adaptation:</strong> Each slide has ONE job (per the original spec&#39;s emotional direction). Reinforce this with animation: the primary CTA or focal element (stat blocks, portfolio reel, service cards, step cards, form) should be the LAST element to animate in. This draws the eye to the action after the context is set.</p>
<h3>5. Progress Feedback</h3>
<p>The audit tool&#39;s orange progress bar fills smoothly from left to right. Combined with the <code>&quot;Section X / slide Y of Z&quot;</code> label, the user always knows where they are and how far they&#39;ve come.</p>
<p><strong>/v2 now matches this</strong> with the redesigned top bar (see Progress Indicator section above). The bar communicates: &quot;you&#39;re on a journey, and you&#39;re making progress.&quot;</p>
<h3>6. Bottom Navigation Bar</h3>
<p>The audit tool has a fixed bottom bar with Back/Next buttons (lines 626-649). This gives clear, always-available navigation without cluttering the slide content.</p>
<p><strong>/v2 does NOT need this.</strong> The audit tool needs it because it&#39;s a form (users need to go back to change answers). /v2 is a presentation. Navigation is via: scroll/swipe (primary), progress bar clicks (secondary), keyboard (power users), nav links (jump navigation). Adding a bottom nav bar would reduce the cinematic viewport height and add UI chrome that fights the immersive feel.</p>
<hr>
<h2>Design Changes Now That We&#39;re on Framer Motion</h2>
<h3>1. Kill the Down Arrow Per-Slide</h3>
<p>The original spec had a <code>ChevronDown</code> arrow at the bottom of each slide (except Slide 8). With CSS scroll-snap, this was the primary scroll cue. With Framer Motion, the progress bar + slide counter at the top communicates &quot;there&#39;s more.&quot; The down arrow is now redundant visual clutter.</p>
<p><strong>Keep ONLY on Slide 1 (Hero).</strong> The hero needs a scroll cue because the progress bar is hidden. Every other slide: remove the arrow. The top bar and the content stagger animation already signal that this is a multi-slide experience.</p>
<h3>2. Nav Bar Behavior</h3>
<p>Original spec: semi-transparent on Slide 1, solid on Slides 2-8.</p>
<p><strong>Updated:</strong> The progress bar IS the nav bar on Slides 2-8. Merge them. On Slide 1, show the standard nav bar (logo left, links right, transparent background with blur). On Slides 2-8, the progress bar container (<code>44px</code> height, <code>rgba(12,12,12,0.90)</code> with blur) replaces the nav bar. The AOM logo stays in the label row (left side, before the slide name), and the nav links collapse into the progress bar&#39;s click zones.</p>
<p>Actually, simpler: keep the nav bar as a SEPARATE element above the progress bar on Slide 1. On Slides 2-8, the progress bar sits at the very top and the nav bar hides. The logo lives in the progress bar&#39;s label row.</p>
<table>
<thead>
<tr>
<th>Slide</th>
<th>Top bar</th>
</tr>
</thead>
<tbody><tr>
<td>1 (Hero)</td>
<td>Nav bar only: logo left, links right, transparent <code>rgba(12,12,12,0.4)</code> + blur</td>
</tr>
<tr>
<td>2-8</td>
<td>Progress bar only: <code>AOM.</code> logo + slide name left, <code>2/8</code> counter right, orange fill bar below. Nav links accessible via hamburger or hidden.</td>
</tr>
<tr>
<td>Keep Exploring</td>
<td>Neither. Standard scrollable page with a compact sticky nav if needed.</td>
</tr>
</tbody></table>
<h3>3. Floating Contact Button</h3>
<p>No change from original spec. It works independently of the transition model. Still fixed position, still visible on Slides 1-7, still hidden on Slide 8.</p>
<h3>4. Film Grain Performance</h3>
<p>With Framer Motion handling transitions, the SVG film grain filter on Slides 1 and 8 should use <code>will-change: auto</code> (not <code>will-change: transform</code>). The grain is static. Only the content below it animates. If Bobby notices jank during transitions on grain slides, reduce grain <code>opacity</code> from <code>0.03</code> to <code>0.02</code> or disable during transition (fade grain out on exit, fade back in 200ms after enter completes).</p>
<h3>5. Video Background on Slide 1</h3>
<p>The Gumlet iframe on the hero slide must NOT re-mount on every visit. When the user navigates away from Slide 1 and comes back, the video should still be playing. Implementation: keep Slide 1&#39;s video element mounted outside <code>AnimatePresence</code> and toggle visibility. Only the content overlay (text, status bar, arrow) participates in the enter/exit animation.</p>
<p>Same applies to Slide 3 (portfolio reel). Keep the video element persistent.</p>
<hr>
<h2>Reduced Motion</h2>
<p>Same rules as original spec, adapted for Framer Motion:</p>
<p>When <code>prefers-reduced-motion: reduce</code>:</p>
<ul>
<li>All <code>motion.div</code> components: set <code>initial</code> and <code>animate</code> to same values (no movement)</li>
<li>Keep <code>opacity</code> transitions but flatten to <code>200ms</code> with no delay</li>
<li>Kill all staggers (<code>staggerChildren: 0</code>)</li>
<li>Slide transitions: instant swap (<code>duration: 0</code>) with a simple <code>200ms opacity</code> crossfade</li>
<li>Progress bar: still animates width (this is functional, not decorative)</li>
</ul>
<hr>
<h2>Summary for Bobby</h2>
<p>The original fullscreen-site-design-spec.md defines WHAT is on each slide. This addendum defines HOW it FEELS.</p>
<p><strong>Three things to nail:</strong></p>
<ol>
<li><p><strong>The transition.</strong> <code>AnimatePresence mode=&quot;wait&quot;</code>, vertical direction, 0.6s total. Exit accelerates out, enter decelerates in. Direction-aware (forward = up exit / below enter, backward = opposite). Debounce all navigation inputs during transition.</p>
</li>
<li><p><strong>The top bar.</strong> Replaces side dots entirely. Orange progress fill, slide name left, counter right. Hidden on Slide 1. Same energy as the audit tool&#39;s progress bar but adapted for 8 slides.</p>
</li>
<li><p><strong>The stagger.</strong> Content within each slide enters with choreographed timing. Labels first, headlines second, body third, interactive elements last. This is the &quot;pitch deck energy.&quot; Without the stagger, slides feel like page loads. With it, they feel like reveals.</p>
</li>
</ol>
<p>The audit tool at /audit/test is the reference implementation for feel. Study it. Match the pacing, the warmth, the control. Then exceed it with the cinematic content this site carries.</p>
`,c={title:e,slug:t,category:o,agent:n,date:i,dateFormatted:d,updated:null,summary:r,tags:a,content:s};export{n as agent,o as category,s as content,i as date,d as dateFormatted,c as default,t as slug,r as summary,a as tags,e as title,l as updated};
