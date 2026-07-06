const t="Ambition Loading Screen Spec",e="ambition-loader-spec",n="Design Specs",o="Steffen",i="2026-03-09",r="Mar 9",s=null,d="Loading screen design specification for the Ambition Mechanical website.",a=[],l=`<h1>Ambition Mechanical: Loading Screen Spec</h1>
<p><strong>For:</strong> Bobby (web dev agent)
<strong>From:</strong> Steffen (brand)
<strong>Date:</strong> 2026-03-09
<strong>Status:</strong> Ready for build</p>
<hr>
<h2>Concept</h2>
<p>A full-viewport loading screen that holds the site behind it while assets load. The Ambition logo starts as a ghost (white on white), then fills with color as a capacity-style progress bar reaches 100%. When complete, the loader peels away to reveal the site. Think: construction site capacity meter meets premium brand reveal.</p>
<hr>
<h2>Layout</h2>
<h3>Structure (all breakpoints)</h3>
<pre><code>+--------------------------------------------------+
|                                                    |
|                                                    |
|              [  CIRCLE WITH LOGO  ]               |
|                                                    |
|              [  CAPACITY BAR  ]                   |
|              [  PERCENTAGE TEXT  ]                 |
|                                                    |
|                                                    |
+--------------------------------------------------+
</code></pre>
<ul>
<li>Everything is centered vertically and horizontally</li>
<li>The circle + bar + percentage are grouped as a single centered block</li>
<li>Gap between circle bottom and bar top: 32px (desktop), 24px (mobile)</li>
<li>Gap between bar bottom and percentage text: 12px</li>
</ul>
<h3>Sizing by Breakpoint</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>Desktop (1280+)</th>
<th>Tablet (768-1279)</th>
<th>Mobile (&lt;768)</th>
</tr>
</thead>
<tbody><tr>
<td>Circle diameter</td>
<td>200px</td>
<td>160px</td>
<td>128px</td>
</tr>
<tr>
<td>Logo inside circle</td>
<td>56% of circle width</td>
<td>56% of circle width</td>
<td>56% of circle width</td>
</tr>
<tr>
<td>Progress bar width</td>
<td>280px</td>
<td>240px</td>
<td>200px</td>
</tr>
<tr>
<td>Progress bar height</td>
<td>6px</td>
<td>6px</td>
<td>5px</td>
</tr>
<tr>
<td>Percentage text size</td>
<td>13px</td>
<td>13px</td>
<td>12px</td>
</tr>
</tbody></table>
<hr>
<h2>The Circle</h2>
<h3>Design</h3>
<p>A circle border around the Ambition logo. The border uses the <strong>Hexagonal Grid</strong> pattern concept: small hex-bolt tick marks evenly spaced around the circumference, like gauge markings on an industrial pressure meter.</p>
<p><strong>Construction:</strong></p>
<ol>
<li>Outer ring: 2px solid stroke, color <code>#283593</code> (navy-500) at 30% opacity</li>
<li>12 tick marks evenly spaced around the ring (every 30 degrees), like a clock face<ul>
<li>Each tick: 8px long, 2px wide, extending outward from the ring</li>
<li>Color: <code>#283593</code> (navy-500) at 40% opacity</li>
<li>The tick at 12 o&#39;clock position: <code>#dc2626</code> (red-500) at 80% opacity (the &quot;zero&quot; mark)</li>
</ul>
</li>
<li>As capacity fills, ticks light up clockwise from 12 o&#39;clock:<ul>
<li>Lit ticks turn <code>#dc2626</code> (red-500) at 100% opacity</li>
<li>Transition: each tick fades in over 150ms</li>
</ul>
</li>
</ol>
<p>This gives the circle an industrial gauge feel without being busy.</p>
<h3>The Logo Inside</h3>
<p><strong>Phase 1 (0-80% loaded): Ghost state</strong></p>
<ul>
<li>Use <code>/ambition-logo.png</code></li>
<li>The logo renders in <strong>white on the white background</strong>, barely visible</li>
<li>Achieved with CSS: <code>opacity: 0.06</code> and <code>filter: brightness(10)</code> (forces all pixels toward white)</li>
<li>Subtle: you can see it if you look, but it&#39;s a ghost</li>
</ul>
<p><strong>Phase 2 (80-100% loaded): Color reveal</strong></p>
<ul>
<li>Over 400ms, transition to full color:<ul>
<li><code>opacity: 0.06</code> to <code>opacity: 1</code></li>
<li><code>filter: brightness(10)</code> to <code>filter: brightness(1)</code></li>
<li>Easing: <code>cubic-bezier(0.2, 0.65, 0.2, 1)</code></li>
</ul>
</li>
<li>The logo &quot;materializes&quot; from white into its real colors</li>
</ul>
<p><strong>Phase 3 (100%): Full presence</strong></p>
<ul>
<li>Logo at full opacity and natural color</li>
<li>Holds for 300ms before the exit animation begins</li>
</ul>
<hr>
<h2>Background</h2>
<ul>
<li>Solid <code>#ffffff</code> (white)</li>
<li>Position: <code>fixed</code>, full viewport, <code>z-index: 9999</code></li>
<li>No patterns on the loader background (patterns are for dark sections only, per brand rules)</li>
</ul>
<hr>
<h2>The Capacity Bar</h2>
<h3>Visual Style</h3>
<p>Not a generic browser progress bar. This is a construction-grade capacity meter.</p>
<p><strong>Track (empty state):</strong></p>
<ul>
<li>Background: <code>#e5e7eb</code> (neutral-200)</li>
<li>Border-radius: 3px (slightly rounded, not pill-shaped)</li>
<li>Full width of the bar element</li>
</ul>
<p><strong>Fill (progress):</strong></p>
<ul>
<li>Background: linear-gradient 90deg from <code>#1a237e</code> (navy-600) to <code>#283593</code> (navy-500)</li>
<li>Border-radius: 3px (matches track)</li>
<li>Width animates from 0% to 100% based on actual page load progress</li>
<li>Transition: <code>width 200ms ease-out</code> (smooth, no jitter)</li>
</ul>
<p><strong>At 100% complete:</strong></p>
<ul>
<li>Fill color shifts to <code>#dc2626</code> (red-500) over 300ms</li>
<li>This signals &quot;capacity reached&quot; / &quot;ready to go&quot;</li>
</ul>
<h3>Progress Source</h3>
<p>Use a combination of real load signals:</p>
<ol>
<li><code>document.readyState</code> changes (loading -&gt; interactive -&gt; complete)</li>
<li>Track critical resource loading (fonts, hero image/video, key JS bundles)</li>
<li>Minimum display time: <strong>1.5 seconds</strong> (even if everything loads instantly, the animation plays out so the brand moment lands)</li>
<li>Maximum display time: <strong>6 seconds</strong> (if something stalls, force-complete at 6s)</li>
</ol>
<p><strong>Progress curve (approximate):</strong></p>
<ul>
<li>0-30%: fires immediately on script execution (DOM parsing)</li>
<li>30-60%: <code>DOMContentLoaded</code></li>
<li>60-85%: fonts loaded (<code>document.fonts.ready</code>)</li>
<li>85-95%: hero assets loaded (images/video in viewport)</li>
<li>95-100%: <code>window.onload</code> or max timeout</li>
</ul>
<p>Smooth the progress with <code>requestAnimationFrame</code>. Never let the bar jump. If a stage completes fast, animate to that mark over 200ms minimum.</p>
<hr>
<h2>Percentage Text</h2>
<ul>
<li>Font: Barlow Condensed, weight 600 (SemiBold)</li>
<li>Size: 13px desktop, 12px mobile</li>
<li>Color: <code>#6b7280</code> (neutral-500)</li>
<li>Tracking: 0.08em</li>
<li>Uppercase: <code>CAPACITY 0%</code> through <code>CAPACITY 100%</code></li>
<li>Updates in sync with the bar (same smooth animation, no flickering numbers)</li>
<li>At 100%: text changes to <code>CAPACITY 100%</code>, color shifts to <code>#1a237e</code> (navy-600) over 200ms</li>
</ul>
<hr>
<h2>Exit Animation (Loader to Site Reveal)</h2>
<p>When capacity hits 100%, hold for 300ms (let the moment land), then:</p>
<ol>
<li><p><strong>Logo + bar + text group:</strong> scale up slightly (<code>transform: scale(1.04)</code>) over 200ms, then fade to <code>opacity: 0</code> over 300ms</p>
<ul>
<li>Easing: <code>cubic-bezier(0.2, 0.65, 0.2, 1)</code></li>
</ul>
</li>
<li><p><strong>White background:</strong> after the group fades (200ms delay), the white backdrop slides up (<code>transform: translateY(-100vh)</code>) over 500ms</p>
<ul>
<li>Easing: <code>cubic-bezier(0.4, 0, 0.2, 1)</code> (fast start, smooth land)</li>
<li>This reveals the site underneath like lifting a curtain</li>
</ul>
</li>
<li><p><strong>Total exit duration:</strong> ~1000ms from the 100% hold ending to fully gone</p>
</li>
<li><p>After animation completes: remove the loader element from the DOM entirely (<code>display: none</code> or unmount). Do not leave it stacked invisibly.</p>
</li>
</ol>
<hr>
<h2>Colors Reference (all hex values used)</h2>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Where</th>
</tr>
</thead>
<tbody><tr>
<td>White</td>
<td><code>#ffffff</code></td>
<td>Loader background</td>
</tr>
<tr>
<td>Navy-600</td>
<td><code>#1a237e</code></td>
<td>Bar fill gradient start, percentage text at 100%</td>
</tr>
<tr>
<td>Navy-500</td>
<td><code>#283593</code></td>
<td>Bar fill gradient end, circle ring, tick marks</td>
</tr>
<tr>
<td>Red-500</td>
<td><code>#dc2626</code></td>
<td>Bar at 100%, lit tick marks, 12 o&#39;clock tick</td>
</tr>
<tr>
<td>Neutral-200</td>
<td><code>#e5e7eb</code></td>
<td>Bar track (empty)</td>
</tr>
<tr>
<td>Neutral-500</td>
<td><code>#6b7280</code></td>
<td>Percentage text</td>
</tr>
</tbody></table>
<hr>
<h2>Typography Reference</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size</th>
<th>Tracking</th>
<th>Transform</th>
</tr>
</thead>
<tbody><tr>
<td>Percentage text</td>
<td>Barlow Condensed</td>
<td>600</td>
<td>13px / 12px mobile</td>
<td>0.08em</td>
<td>uppercase</td>
</tr>
</tbody></table>
<hr>
<h2>Animation Timing Summary</h2>
<table>
<thead>
<tr>
<th>Step</th>
<th>What happens</th>
<th>Duration</th>
<th>Easing</th>
</tr>
</thead>
<tbody><tr>
<td>Page start</td>
<td>Loader visible, bar at 0%, logo ghosted</td>
<td>-</td>
<td>-</td>
</tr>
<tr>
<td>0 to ~1.5s+</td>
<td>Bar fills based on load progress</td>
<td>varies</td>
<td>ease-out per step</td>
</tr>
<tr>
<td>At 80% loaded</td>
<td>Logo begins color reveal</td>
<td>400ms</td>
<td>cubic-bezier(0.2, 0.65, 0.2, 1)</td>
</tr>
<tr>
<td>At 100%</td>
<td>Bar turns red, percentage text turns navy</td>
<td>300ms</td>
<td>ease-out</td>
</tr>
<tr>
<td>100% + 300ms hold</td>
<td>Logo + bar group scales up and fades</td>
<td>500ms</td>
<td>cubic-bezier(0.2, 0.65, 0.2, 1)</td>
</tr>
<tr>
<td>+200ms after fade starts</td>
<td>White backdrop slides up</td>
<td>500ms</td>
<td>cubic-bezier(0.4, 0, 0.2, 1)</td>
</tr>
<tr>
<td>Exit complete</td>
<td>Loader removed from DOM</td>
<td>-</td>
<td>-</td>
</tr>
</tbody></table>
<p><strong>Minimum total on-screen time:</strong> 1.5s + 300ms hold + ~1s exit = ~2.8s
<strong>If assets load instantly:</strong> still plays the full 2.8s sequence</p>
<hr>
<h2>Implementation Notes for Bobby</h2>
<ol>
<li><strong>Component:</strong> Create as <code>LoadingScreen.jsx</code> (or similar). Mount it at the app root level, above the router.</li>
<li><strong>First paint:</strong> The loader should be the FIRST thing rendered. Consider inlining critical loader CSS in <code>index.html</code> <code>&lt;head&gt;</code> so it appears before React hydrates.</li>
<li><strong>Logo path:</strong> <code>/ambition-logo.png</code> (already in public directory, used by Header.jsx)</li>
<li><strong>No layout shift:</strong> The site content should be rendering behind the loader (invisible). When the loader lifts, the site is already painted and ready.</li>
<li><strong>Repeat visits:</strong> Show the loader on every full page load (hard refresh, direct URL navigation). Do NOT show on client-side route changes (React Router transitions).</li>
<li><strong>Accessibility:</strong> Add <code>role=&quot;progressbar&quot;</code> with <code>aria-valuenow</code>, <code>aria-valuemin=&quot;0&quot;</code>, <code>aria-valuemax=&quot;100&quot;</code> to the capacity bar. Add <code>aria-hidden=&quot;true&quot;</code> to the loader after exit so screen readers skip it.</li>
<li><strong>Reduced motion:</strong> If <code>prefers-reduced-motion: reduce</code> is active, skip all animations. Show the loader at 100% state for 500ms, then remove instantly (no slide, no scale).</li>
</ol>
<hr>
<h2>&quot;Ambition Mechanical&quot; Services Section Heading</h2>
<p>Patrik also wants the top of the services section to say &quot;AMBITION MECHANICAL&quot; as the section header.</p>
<h3>Spec</h3>
<ul>
<li><strong>Text:</strong> <code>AMBITION MECHANICAL</code></li>
<li><strong>Font:</strong> Barlow Condensed, weight 800 (ExtraBold)</li>
<li><strong>Size:</strong> <code>clamp(2.5rem, 5vw, 4rem)</code> (same as Section Title in type scale)</li>
<li><strong>Color on light BG:</strong> <code>#1a237e</code> (navy-600)</li>
<li><strong>Color on dark BG:</strong> <code>#ffffff</code> (white)</li>
<li><strong>Tracking:</strong> 0.03em</li>
<li><strong>Transform:</strong> uppercase</li>
<li><strong>Placement:</strong> Centered above the services grid. Below the hero section.</li>
<li><strong>Spacing:</strong> 80px padding-top from previous section, 48px margin-bottom to the first service card row</li>
<li><strong>Optional kicker above it:</strong> <code>WHAT WE DO</code> in Barlow Condensed 600, 11px, tracking 0.2em, color <code>#dc2626</code> (red-500). 16px margin-bottom between kicker and heading.</li>
<li><strong>Optional watermark number:</strong> Large <code>02</code> behind the heading at 3-5% opacity, navy-500. Same treatment as other section headers per rebuild spec. Only if the site is using numbered sections.</li>
</ul>
`,c={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:r,updated:null,summary:d,tags:a,content:l};export{o as agent,n as category,l as content,i as date,r as dateFormatted,c as default,e as slug,d as summary,a as tags,t as title,s as updated};
