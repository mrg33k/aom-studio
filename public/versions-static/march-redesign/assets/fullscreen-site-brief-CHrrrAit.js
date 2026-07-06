const e="Full-Screen Guided Experience Design Brief",t="fullscreen-site-brief",n="Design Specs",i="Elon",o="2026-03-11",l="Mar 11",d=null,r="Design brief from Elon to Steffen for the full-screen guided site experience.",s=[],a=`<h1>Full-Screen Guided Experience: Design Brief for Steffen</h1>
<p><strong>From:</strong> Elon (System Architect)
<strong>To:</strong> Steffen (Brand Agent)
<strong>Date:</strong> 2026-03-11
<strong>Context:</strong> Patrik wants the entire aheadofmarket.com redesigned as a full-screen slide experience. Think pitch deck on the web. Each section fills the viewport. Visitors are guided through, not left to scroll and skim.
<strong>Reference:</strong> The audit onboarding tool at <code>/audit/test</code> is the energy Patrik wants. &quot;Full screen experiences like that are sexy as fuck.&quot;</p>
<hr>
<h2>What Steffen Needs to Deliver</h2>
<p>Design direction for 8 full-viewport slides, the progress indicator, the floating contact button, and the overall visual rhythm. Bobby builds from this. Everything below needs Steffen&#39;s eye before code gets written.</p>
<hr>
<h2>1. Slide Transitions</h2>
<h3>The Feel</h3>
<p>Premium but not slow. This is not a PowerPoint fade. It is not a bouncy React spring. It&#39;s closer to how Apple presents product pages: content arrives with intention, holds, then the next piece arrives.</p>
<h3>Recommendation</h3>
<ul>
<li><strong>Between slides:</strong> CSS scroll snap handles the snap itself (no custom transition). The &quot;transition&quot; IS the scroll locking into place. Fast, physical, satisfying.</li>
<li><strong>Within slides (content entrance):</strong> Each slide&#39;s content fades up and in when the slide becomes active. Staggered: headline first (0ms), then subhead (100ms), then supporting content (200ms), then CTA (300ms).</li>
<li><strong>Duration:</strong> 400-500ms per element. Not faster (feels glitchy). Not slower (feels sluggish).</li>
<li><strong>Easing:</strong> <code>ease-out</code>. Deceleration curve. Things arrive fast and settle gently.</li>
<li><strong>What to avoid:</strong> Parallax scrolling between slides. Horizontal slide transitions. Anything that fights the vertical scroll snap. Bounce/spring physics.</li>
</ul>
<h3>Steffen&#39;s Call</h3>
<ul>
<li>Should content animate on EVERY visit to a slide (user scrolls back up and down again), or only on first view? First-view-only feels cleaner but &quot;dead&quot; on revisit. Every-visit feels alive but can get annoying. Pick one and justify it.</li>
</ul>
<hr>
<h2>2. Typography Scale Per Slide Type</h2>
<p>All type uses the existing Bold Graphic v4 system (Syne headlines, Space Grotesk body, JetBrains Mono micro labels). What Steffen defines here is how the scale SHIFTS per slide type.</p>
<h3>Hero Slide (Slide 1)</h3>
<ul>
<li><strong>Headline:</strong> Syne, 900 weight, uppercase. Desktop: 72-96px (<code>text-7xl</code> to <code>text-8xl</code>). Mobile: 40-48px (<code>text-4xl</code> to <code>text-5xl</code>). Tracking: <code>-0.03em</code>. Leading: <code>0.92</code>.</li>
<li><strong>Subhead:</strong> Space Grotesk, 400 weight. Desktop: 20-24px. Mobile: 16-18px. Color: <code>#8A847C</code> (text-light-muted).</li>
<li><strong>Micro-label:</strong> JetBrains Mono, 700 weight, uppercase, <code>tracking-[0.2em]</code>. 11-12px. Color: <code>#8A847C</code>.</li>
<li>The hero headline should feel like it&#39;s painted on the screen. Maximum impact.</li>
</ul>
<h3>Content Slides (Slides 2, 4, 5, 6, 7)</h3>
<ul>
<li><strong>Section headline:</strong> Syne, 800 weight, uppercase. Desktop: 48-56px (<code>text-5xl</code> to <code>text-6xl</code>). Mobile: 32-36px (<code>text-3xl</code> to <code>text-4xl</code>).</li>
<li><strong>Body text:</strong> Space Grotesk, 400 weight. Desktop: 18-20px. Mobile: 16px. Line height: 1.6. Max width: <code>65ch</code>.</li>
<li><strong>Stat numbers:</strong> Syne, 900 weight, italic. Desktop: 48-64px. Mobile: 36-48px. Color: <code>#E85D26</code> (orange).</li>
<li><strong>Card titles:</strong> Space Grotesk, 600 weight. 18-20px.</li>
<li><strong>Card body:</strong> Space Grotesk, 400 weight. 16px. Color: <code>#8A847C</code>.</li>
<li>Content slides should feel informational but never dense. One thought per visual beat.</li>
</ul>
<h3>Portfolio Slide (Slide 3)</h3>
<ul>
<li><strong>Minimal text.</strong> Section label only: &quot;THE WORK&quot; in micro-label style (JetBrains Mono, 11px, uppercase, tracking wide).</li>
<li>Client name overlay on active piece: Space Grotesk, 600 weight, 16-20px, white with text shadow for readability over video.</li>
<li>This slide is 90% visual. Type gets out of the way.</li>
</ul>
<h3>CTA Slide (Slide 8)</h3>
<ul>
<li><strong>Headline:</strong> Syne, 900 weight, uppercase. Desktop: 56-72px. Mobile: 36-44px. Keep it to 2-4 words. &quot;READY?&quot; or &quot;LET&#39;S BUILD SOMETHING.&quot;</li>
<li><strong>Form labels:</strong> Space Grotesk, 500 weight, 14-16px, uppercase, <code>tracking-[0.05em]</code>.</li>
<li><strong>Form inputs:</strong> Space Grotesk, 400 weight, 18px. Bottom-border style (no box). Same treatment as audit onboarding.</li>
<li><strong>Submit button:</strong> Full AOM orange. Syne, 800 weight, uppercase, 16px. Generous padding (px-10 py-5).</li>
</ul>
<hr>
<h2>3. Progress Indicator</h2>
<h3>Option A: Vertical Dot Rail (Recommended for Desktop)</h3>
<ul>
<li>Right side of viewport, vertically centered</li>
<li>8 dots, one per slide</li>
<li>Inactive: 8px circle, <code>#292524</code> (warm edge / border color), 50% opacity</li>
<li>Active: 8px circle, <code>#E85D26</code> (orange), 100% opacity, subtle glow (<code>box-shadow: 0 0 8px rgba(232,93,38,0.4)</code>)</li>
<li>On hover: dot expands to show slide label in a tooltip (Space Grotesk, 12px, uppercase). Tooltip slides out to the left of the dot.</li>
<li>Connected by a thin vertical line (1px, <code>#292524</code>). The segment between dot 1 and the active dot fills with orange, like a progress bar.</li>
<li>Clickable. Each dot navigates to that slide.</li>
<li>Margin from right edge: 24px desktop, 16px tablet</li>
<li>Visibility: hidden on Slide 1 (hero is full immersion). Appears starting Slide 2.</li>
</ul>
<h3>Option B: Horizontal Dot Rail (Mobile)</h3>
<ul>
<li>Bottom of viewport, horizontally centered, above the safe area</li>
<li>Same dot styling, laid out horizontally</li>
<li>No labels on hover (too small for tooltips on mobile)</li>
<li>Background: subtle dark blur pill behind the dots for readability over any slide background</li>
<li>Height: 32px pill, dots centered vertically within</li>
</ul>
<h3>What Steffen Decides</h3>
<ul>
<li>Dots only? Or dots + thin connecting line?</li>
<li>Should the active dot be larger (10px) than inactive (6px), or same size with color change only?</li>
<li>Does the hero slide (Slide 1) show the progress indicator or hide it for full immersion?</li>
<li>Exact positioning. How far from edge. Centered vs slightly above/below center.</li>
</ul>
<hr>
<h2>4. Floating Contact Button</h2>
<h3>Specs</h3>
<ul>
<li><strong>Position:</strong> Bottom-right corner. Fixed. <code>right: 24px, bottom: 24px</code> desktop. <code>right: 16px, bottom: 16px</code> mobile.</li>
<li><strong>Size:</strong> 56px circle desktop, 48px circle mobile</li>
<li><strong>Color:</strong> <code>#E85D26</code> (AOM orange) background, white icon</li>
<li><strong>Icon:</strong> Phone icon (Lucide <code>Phone</code>, 20px) or chat/message icon. Steffen picks which feels more approachable.</li>
<li><strong>Shadow:</strong> <code>0 4px 16px rgba(232,93,38,0.3)</code> for the warm glow effect</li>
<li><strong>Border:</strong> None. The orange circle is the element.</li>
<li><strong>Hover state:</strong> Scale to 1.08, shadow deepens to <code>0 6px 24px rgba(232,93,38,0.5)</code>. 200ms transition.</li>
</ul>
<h3>Animation on Load</h3>
<ul>
<li>Button enters from bottom-right after 2 seconds (enough time for the hero to land)</li>
<li>Entrance: fade + slide up 20px. 400ms. <code>ease-out</code>.</li>
<li>Optional subtle pulse on first appearance (scale 1.0 -&gt; 1.05 -&gt; 1.0, once, to draw attention)</li>
<li>After first pulse: static. No repeating animations. Pulsing buttons are annoying.</li>
</ul>
<h3>What It Opens</h3>
<ul>
<li><strong>Desktop:</strong> Right-side drawer, 420px wide. Dark background (<code>#0C0C0C</code>). Slides in from right edge. Rest of page gets a dark overlay (<code>rgba(0,0,0,0.6)</code>).</li>
<li><strong>Mobile:</strong> Full-screen modal. Same dark background. Close button (X) top-right.</li>
<li><strong>Drawer/modal content:</strong> Contact form (same as Slide 8), phone number, email. Vertical layout.</li>
<li><strong>Close:</strong> Click outside (desktop), X button, or Escape key.</li>
</ul>
<h3>Visibility Rules</h3>
<ul>
<li>Visible on Slides 1-7</li>
<li>Hidden on Slide 8 (contact is already inline there)</li>
<li>Z-index: above all slide content, below the contact drawer when open</li>
</ul>
<h3>Steffen&#39;s Call</h3>
<ul>
<li>Phone icon vs chat bubble vs arrow icon?</li>
<li>Should the button have a text label on first appearance (&quot;Let&#39;s Talk&quot;) that collapses to just the icon after 3 seconds?</li>
<li>Should the drawer have the AOM pattern strip at the top (like the audit interstitials)?</li>
</ul>
<hr>
<h2>5. Background Treatment Per Slide</h2>
<h3>The Rhythm</h3>
<p>Alternating dark and darker, with strategic moments of contrast. The site IS dark mode. No light slides. But within the dark palette, there&#39;s variation.</p>
<table>
<thead>
<tr>
<th>Slide</th>
<th>Background</th>
<th>Accent</th>
<th>Reasoning</th>
</tr>
</thead>
<tbody><tr>
<td>1. Hero</td>
<td><code>#0C0C0C</code> (Night) + video</td>
<td>Orange headline</td>
<td>Cinematic. Video fills the space. Darkest base.</td>
</tr>
<tr>
<td>2. Hook</td>
<td><code>#151515</code> (Night Card)</td>
<td>Orange stats</td>
<td>Slightly elevated from hero. Content-forward.</td>
</tr>
<tr>
<td>3. Work</td>
<td><code>#0C0C0C</code> (Night) + video/media</td>
<td>Minimal</td>
<td>Drop back to darkest. Let the portfolio fill the frame.</td>
</tr>
<tr>
<td>4. Services</td>
<td><code>#1A1A17</code> (Deep Warm)</td>
<td>Orange + Sage accents</td>
<td>Warmest dark. Cards pop against this surface.</td>
</tr>
<tr>
<td>5. Construction</td>
<td><code>#0C0C0C</code> (Night)</td>
<td>Orange dominant</td>
<td>Dark and bold. Construction is AOM&#39;s bread and butter.</td>
</tr>
<tr>
<td>6. AI Advisory</td>
<td><code>#151515</code> (Night Card)</td>
<td>Sage green (<code>#7C9A72</code>)</td>
<td>Sage differentiates AI content from everything else.</td>
</tr>
<tr>
<td>7. Social Proof</td>
<td><code>#1A1A17</code> (Deep Warm)</td>
<td>Orange accents</td>
<td>Warm surface for testimonial cards. Feels trustworthy.</td>
</tr>
<tr>
<td>8. Contact</td>
<td><code>#0C0C0C</code> (Night)</td>
<td>Orange CTA</td>
<td>Return to darkest. High contrast on the final CTA.</td>
</tr>
</tbody></table>
<h3>Pattern Elements Between Slides</h3>
<ul>
<li>No visible dividers between slides (each fills the viewport, no gap)</li>
<li>Film grain overlay persists across all slides (existing <code>opacity-[0.03]</code> fractalNoise)</li>
<li>Optional: each slide has a subtle top-edge gradient (5-10px) that hints at the previous slide&#39;s background. Creates depth without a hard line.</li>
</ul>
<h3>Steffen&#39;s Call</h3>
<ul>
<li>All dark (as proposed) or should one slide break to cream/light (like the audit onboarding alternates)? Cream on one content slide could create a powerful moment of contrast.</li>
<li>Should the pattern strip (diagonal lines from v4 brand guide) appear as a subtle background element on any slides?</li>
<li>Vignette treatment: hero only, or consistent across all dark slides?</li>
</ul>
<hr>
<h2>6. Media Treatment</h2>
<h3>Full-Viewport Video (Slides 1, 3)</h3>
<ul>
<li>Video fills the entire slide. No borders, no inset, no rounded corners.</li>
<li>Dark overlay for text readability: <code>rgba(12,12,12, 0.45)</code> minimum</li>
<li>Vignette: radial gradient, transparent center, Night edges. Keeps focus center-screen.</li>
<li>Bottom gradient: 120-200px gradient from transparent to next slide&#39;s background color (smooth transition)</li>
<li>Film grain on top of video at <code>opacity-[0.04]</code></li>
</ul>
<h3>Photography/Images in Content Slides</h3>
<ul>
<li>Images should NOT fill the full slide. They sit within the content layout.</li>
<li>Treatment: 2px solid border in <code>#292524</code>, no border-radius (square corners per brand)</li>
<li>On hover: border shifts to <code>rgba(232,93,38,0.3)</code> (orange glow)</li>
<li>Aspect ratios: 16:9 for hero/landscape shots, 4:5 for portrait/social-style, 1:1 for headshots</li>
<li>Color grade: warm, slightly desaturated, rich blacks (per Steffen&#39;s photography direction in v4)</li>
</ul>
<h3>Icons (Lucide)</h3>
<ul>
<li>Size: 20-24px on content slides, 32-40px on pathway cards</li>
<li>Stroke weight: 2px, never filled</li>
<li>Color: match the slide accent (orange on most, sage on AI slide)</li>
</ul>
<hr>
<h2>7. Mobile Slide Behavior</h2>
<h3>Scroll Snap</h3>
<ul>
<li>Vertical swipe. Same as desktop but touch-native.</li>
<li><code>scroll-snap-type: y mandatory</code> with <code>-webkit-overflow-scrolling: touch</code></li>
<li>Each swipe = one slide. No partial-slide resting states.</li>
</ul>
<h3>Viewport Height</h3>
<ul>
<li>Use <code>100dvh</code> (dynamic viewport height) instead of <code>100vh</code>. This accounts for mobile browser chrome (address bar, toolbar) that changes size as the user scrolls.</li>
<li>Without <code>dvh</code>, slides will be too tall when the browser chrome is visible, causing content to be cut off.</li>
</ul>
<h3>Content Stacking</h3>
<ul>
<li>All multi-column layouts collapse to single column</li>
<li>Headline sizes reduce (see type scale above)</li>
<li>Cards stack vertically with 16px gap</li>
<li>Video maintains full-width but gets shorter on landscape phones (max-height: 50vh for inline video)</li>
</ul>
<h3>Touch Targets</h3>
<ul>
<li>All interactive elements: minimum 44px touch target</li>
<li>Card click areas: full card surface</li>
<li>Form inputs: minimum 48px height</li>
<li>Buttons: minimum 48px height, full width on mobile</li>
</ul>
<h3>Performance</h3>
<ul>
<li>Single video on hero (no rotation). Current code already handles this.</li>
<li>Lazy load all slides except 1-2</li>
<li>Reduce animation complexity (fewer staggered children, shorter durations)</li>
</ul>
<hr>
<h2>8. The Overall Energy</h2>
<h3>Pitch Deck, Not Website</h3>
<p>This is the core design decision. Every choice Steffen makes should pass this test: &quot;Does this feel like someone is presenting to me, or does this feel like I&#39;m browsing a website?&quot;</p>
<p><strong>Pitch deck energy:</strong></p>
<ul>
<li>Each slide has ONE message</li>
<li>Generous whitespace. Content breathes. Nothing is cramped.</li>
<li>Big type. Bold statements. You can read the headline from across the room.</li>
<li>The sequence matters. Slide order is intentional. You can&#39;t rearrange them without breaking the narrative.</li>
<li>Progress indicator tells you where you are in the story</li>
<li>CTA at the end feels like a natural next step, not a form dump</li>
</ul>
<p><strong>Website energy (what to avoid):</strong></p>
<ul>
<li>Multiple competing elements per screen</li>
<li>Small text packed with information</li>
<li>Sidebar navigation, footer links, breadcrumbs</li>
<li>&quot;Scroll to explore&quot; feeling. The user should feel guided, not abandoned to browse.</li>
<li>Generic stock-image-plus-text-block layouts</li>
</ul>
<h3>The Narrative Arc</h3>
<ol>
<li><strong>Impact</strong> (Slide 1: Hero) - Who we are. Feel something.</li>
<li><strong>Credibility</strong> (Slide 2: Hook) - Why we&#39;re different. Trust us.</li>
<li><strong>Proof</strong> (Slide 3: Work) - See what we&#39;ve done. Believe us.</li>
<li><strong>Clarity</strong> (Slide 4: Services) - Here&#39;s what we do. Understand us.</li>
<li><strong>Specificity</strong> (Slide 5: Construction) - We know YOUR world. We get you.</li>
<li><strong>Innovation</strong> (Slide 6: AI Advisory) - We&#39;re building the future. Join us.</li>
<li><strong>Validation</strong> (Slide 7: Social Proof) - Don&#39;t take our word for it. Hear from them.</li>
<li><strong>Action</strong> (Slide 8: Contact) - Ready? Let&#39;s go.</li>
</ol>
<p>Each slide earns the right to show the next one. If any slide doesn&#39;t earn that click, it gets cut or reworked.</p>
<hr>
<h2>9. Reference Points</h2>
<p>These are not &quot;copy this&quot; references. They&#39;re energy references.</p>
<ul>
<li><strong>Apple product pages</strong> (iPhone, MacBook): Full-viewport sections, scroll-triggered animations, dark backgrounds, premium feel. The gold standard for guided web experiences.</li>
<li><strong>Tesla configurator</strong>: Step-by-step flow, full-screen imagery, minimal text, progress indicator.</li>
<li><strong>AOM&#39;s own <code>/audit/test</code></strong>: The existing proof that this pattern works in AOM&#39;s brand system. Dark/cream alternation, one thought per screen, progress bar, big type.</li>
<li><strong>Nike campaign microsites</strong>: Bold type, full-bleed photography, orange/black contrast, editorial grid energy.</li>
<li><strong>Porsche configurator / product experiences</strong>: Slow reveal, each section earns attention, premium pacing.</li>
</ul>
<hr>
<h2>10. Deliverable Checklist for Steffen</h2>
<p>Steffen produces design direction (not mockups, not code). Bobby implements.</p>
<ul>
<li><input disabled="" type="checkbox"> Confirm or adjust slide transition approach</li>
<li><input disabled="" type="checkbox"> Finalize type scale per slide type (hero, content, portfolio, CTA)</li>
<li><input disabled="" type="checkbox"> Progress indicator: dot style, size, color, positioning, labels, connecting line</li>
<li><input disabled="" type="checkbox"> Floating contact button: icon choice, label behavior, drawer/modal design notes</li>
<li><input disabled="" type="checkbox"> Background palette per slide: confirm the dark rhythm or propose changes</li>
<li><input disabled="" type="checkbox"> Media treatment rules: video overlays, image borders, icon sizing</li>
<li><input disabled="" type="checkbox"> Mobile adaptations: any mobile-specific design decisions beyond responsive stacking</li>
<li><input disabled="" type="checkbox"> Overall energy confirmation: pitch deck vs website, narrative arc feedback</li>
<li><input disabled="" type="checkbox"> Flag anything that conflicts with Bold Graphic v4 guidelines</li>
<li><input disabled="" type="checkbox"> One sentence per slide: what the visitor should FEEL on that slide (emotional direction for Bobby)</li>
</ul>
`,c={title:e,slug:t,category:n,agent:i,date:o,dateFormatted:l,updated:null,summary:r,tags:s,content:a};export{i as agent,n as category,a as content,o as date,l as dateFormatted,c as default,t as slug,r as summary,s as tags,e as title,d as updated};
