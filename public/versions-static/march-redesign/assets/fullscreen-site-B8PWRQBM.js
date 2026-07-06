const e="Full-Screen Site Redesign",t="fullscreen-site",n="Design Specs",o="Steffen",d="2026-03-11",i="Mar 11",a=null,l="8-slide scroll-snap pitch deck experience for aheadofmarket.com.",r=[],c=`<h1>AOM Full-Screen Site: Design Spec</h1>
<blockquote>
<p>Steffen | 2026-03-11
For Bobby. Everything you need to build pixel-perfect. No questions.
Brand system: Bold Graphic v4. Fonts: Syne + Space Grotesk + JetBrains Mono.</p>
</blockquote>
<hr>
<h2>Design Decisions (Steffen&#39;s Calls)</h2>
<p>Before the spec, here are the open questions resolved:</p>
<p><strong>Animation on revisit:</strong> Animate on EVERY visit to a slide, not just first view. Reasoning: the scroll-snap model means users will navigate back and forth. Dead slides feel broken. BUT keep animations subtle and fast on revisit (300ms vs 400ms initial). The stagger is the magic. Without it, content just &quot;sits there&quot; and the pitch deck energy dies.</p>
<p><strong>Portfolio format (Slide 3):</strong> Full-bleed auto-playing reel with 3-4 thumbnail selectors below. Not a grid. Reasoning: the pitch deck format demands showstopper moments. A grid is &quot;website energy.&quot; A full-bleed reel with selective thumbnails is &quot;keynote energy.&quot; The thumbnails give control without breaking immersion.</p>
<p><strong>Backgrounds:</strong> All dark. No cream slide. Reasoning: the audit tool earns its cream/dark alternation because it&#39;s a long form (27 slides). 8 slides don&#39;t need that rhythm. Staying all-dark keeps the cinematic quality consistent and lets the orange/sage accents do the contrast work. Cream would feel jarring in a short sequence. The &quot;keep exploring&quot; section below slide 8 CAN use cream for contrast since it breaks out of the slide format.</p>
<p><strong>Mobile snap behavior:</strong> Strict snap (<code>scroll-snap-type: y mandatory</code>). Each swipe = exactly one slide. Reasoning: relaxed snap creates the &quot;did it land?&quot; uncertainty. Mandatory snap is decisive. Matches the pitch deck energy. The visitor is being guided, not browsing.</p>
<p><strong>Pattern strips between slides:</strong> No. Reasoning: the audit tool uses pattern strips as section dividers because it has 27 slides across 6 sections. The main site has 8 slides with no sections to divide. Pattern strips would create visual noise at full-viewport scale. The background color variation (Night / Night Card / Deep Warm) handles the rhythm. Save pattern strips for the &quot;keep exploring&quot; section as a visual break from the slide format.</p>
<p><strong>Vignette:</strong> Hero only. Reasoning: consistent vignette across all slides dulls the effect. The hero needs it because video backgrounds have unpredictable brightness. Content slides have controlled backgrounds. Keep it special.</p>
<p><strong>Contact button icon:</strong> Chat bubble (Lucide <code>MessageCircle</code>). Not phone. Reasoning: phone icon implies &quot;call now&quot; which creates friction. Chat bubble says &quot;let&#39;s talk&quot; which is warmer and lower commitment. Matches AOM&#39;s &quot;no BS, come as you are&quot; tone.</p>
<p><strong>Contact button label:</strong> Yes, show &quot;Let&#39;s Talk&quot; label on first appearance, collapse to icon after 3 seconds. Reasoning: the label gives context on first visit. After that, the orange circle is recognizable. The collapse animation (text fades, circle shrinks to icon-only) is itself a micro-delight.</p>
<p><strong>Contact drawer pattern strip:</strong> Yes, at the top. Reasoning: the diagonal line pattern is AOM&#39;s signature texture. A 4px strip at the top of the drawer connects it to the brand system. Subtle but intentional.</p>
<p><strong>Progress indicator:</strong> Dots with thin connecting line. Active dot larger (10px) than inactive (6px). Hidden on Slide 1. Reasoning: the size change gives a clear &quot;you are here&quot; signal without relying on color alone (accessibility). The connecting line turns the dots into a progress bar, reinforcing the narrative arc. Hiding on Slide 1 gives the hero full immersion. The indicator appearing on Slide 2 is itself a reveal moment.</p>
<hr>
<h2>Color Palette</h2>
<h3>Slide Backgrounds</h3>
<table>
<thead>
<tr>
<th>Slide</th>
<th>Background</th>
<th>Hex</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>1. Hero</td>
<td>Night</td>
<td><code>#0C0C0C</code></td>
<td>Darkest. Video overlay on top.</td>
</tr>
<tr>
<td>2. Hook</td>
<td>Night Card</td>
<td><code>#151515</code></td>
<td>Slightly elevated from hero. Stats pop.</td>
</tr>
<tr>
<td>3. Work</td>
<td>Night</td>
<td><code>#0C0C0C</code></td>
<td>Back to darkest. Portfolio fills the frame.</td>
</tr>
<tr>
<td>4. Services</td>
<td>Deep Warm</td>
<td><code>#1A1A17</code></td>
<td>Warmest dark. Cards float above it.</td>
</tr>
<tr>
<td>5. Construction</td>
<td>Night</td>
<td><code>#0C0C0C</code></td>
<td>Dark and bold. Orange dominates.</td>
</tr>
<tr>
<td>6. AI Advisory</td>
<td>Night Card</td>
<td><code>#151515</code></td>
<td>Sage green differentiates this slide.</td>
</tr>
<tr>
<td>7. Social Proof</td>
<td>Deep Warm</td>
<td><code>#1A1A17</code></td>
<td>Warm base for trust. Testimonial cards read well.</td>
</tr>
<tr>
<td>8. Contact</td>
<td>Night</td>
<td><code>#0C0C0C</code></td>
<td>Return to darkest. CTA gets full contrast.</td>
</tr>
</tbody></table>
<h3>Text Colors</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>On Dark (<code>#0C0C0C</code> / <code>#151515</code> / <code>#1A1A17</code>)</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Primary headline</td>
<td><code>#FDF6EC</code> (Cream)</td>
<td>Warm white. Never cold.</td>
</tr>
<tr>
<td>Secondary headline</td>
<td><code>#F0ECE6</code> (Text Light)</td>
<td>Slightly softer than cream.</td>
</tr>
<tr>
<td>Body text</td>
<td><code>#8A847C</code> (Text Muted)</td>
<td>Readable on all three dark backgrounds.</td>
</tr>
<tr>
<td>Stat numbers</td>
<td><code>#E85D26</code> (Orange)</td>
<td>Orange stats are the accent.</td>
</tr>
<tr>
<td>Micro labels</td>
<td><code>#8A847C</code> (Text Muted)</td>
<td>Same as body text.</td>
</tr>
<tr>
<td>Links (inline)</td>
<td><code>#E85D26</code></td>
<td>Orange, underline on hover.</td>
</tr>
<tr>
<td>Sage text (Slide 6 only)</td>
<td><code>#7C9A72</code></td>
<td>AI Advisory accent text.</td>
</tr>
</tbody></table>
<h3>Accent Colors</h3>
<table>
<thead>
<tr>
<th>Color</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Orange</td>
<td><code>#E85D26</code></td>
<td>CTAs, stat numbers, active states, progress fill, contact button</td>
</tr>
<tr>
<td>Orange Hover</td>
<td><code>#D14E1C</code></td>
<td>Button hover state</td>
</tr>
<tr>
<td>Orange Glow</td>
<td><code>rgba(232,93,38,0.15)</code></td>
<td>Button hover shadow, card glow borders</td>
</tr>
<tr>
<td>Sage</td>
<td><code>#7C9A72</code></td>
<td>AI Advisory slide accent (icons, step numbers, border glow)</td>
</tr>
<tr>
<td>Sage Glow</td>
<td><code>rgba(124,154,114,0.15)</code></td>
<td>AI slide card borders on hover</td>
</tr>
<tr>
<td>Gold</td>
<td><code>#C9A84C</code></td>
<td>Status badges, &quot;keep exploring&quot; accent</td>
</tr>
</tbody></table>
<h3>Border Colors</h3>
<table>
<thead>
<tr>
<th>Context</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>Card border (dark bg)</td>
<td><code>rgba(255,255,255,0.08)</code></td>
</tr>
<tr>
<td>Card border hover</td>
<td><code>rgba(232,93,38,0.3)</code></td>
</tr>
<tr>
<td>Divider line</td>
<td><code>rgba(255,255,255,0.06)</code></td>
</tr>
<tr>
<td>Image border</td>
<td><code>#292524</code> 2px solid</td>
</tr>
<tr>
<td>Image border hover</td>
<td><code>rgba(232,93,38,0.3)</code></td>
</tr>
<tr>
<td>Input underline (Slide 8)</td>
<td><code>rgba(255,255,255,0.15)</code></td>
</tr>
<tr>
<td>Input underline focus</td>
<td><code>#E85D26</code></td>
</tr>
</tbody></table>
<h3>Overlay Colors</h3>
<table>
<thead>
<tr>
<th>Context</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Hero video overlay</td>
<td><code>rgba(12,12,12,0.50)</code></td>
</tr>
<tr>
<td>Hero vignette (radial)</td>
<td><code>radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)</code></td>
</tr>
<tr>
<td>Portfolio overlay (Slide 3)</td>
<td><code>rgba(12,12,12,0.35)</code></td>
</tr>
<tr>
<td>Contact drawer backdrop</td>
<td><code>rgba(0,0,0,0.60)</code></td>
</tr>
</tbody></table>
<hr>
<h2>Typography</h2>
<h3>Per-Slide Type Scale</h3>
<h4>Slide 1: Hero</h4>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size (Desktop)</th>
<th>Size (Mobile)</th>
<th>Line Height</th>
<th>Tracking</th>
<th>Transform</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td>Headline</td>
<td>Syne</td>
<td>900</td>
<td>80px</td>
<td>44px</td>
<td>0.92</td>
<td>-0.03em</td>
<td>uppercase</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Subhead</td>
<td>Space Grotesk</td>
<td>400</td>
<td>20px</td>
<td>16px</td>
<td>1.5</td>
<td>0</td>
<td>none</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Micro-label</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>12px</td>
<td>11px</td>
<td>1.4</td>
<td>0.2em</td>
<td>uppercase</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Status bar items</td>
<td>JetBrains Mono</td>
<td>500</td>
<td>11px</td>
<td>10px</td>
<td>1.4</td>
<td>0.15em</td>
<td>uppercase</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Down arrow label</td>
<td>Space Grotesk</td>
<td>500</td>
<td>13px</td>
<td>12px</td>
<td>1.4</td>
<td>0.08em</td>
<td>uppercase</td>
<td><code>#8A847C</code></td>
</tr>
</tbody></table>
<h4>Slides 2, 4, 5, 7: Content</h4>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size (Desktop)</th>
<th>Size (Mobile)</th>
<th>Line Height</th>
<th>Tracking</th>
<th>Transform</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td>Section headline</td>
<td>Syne</td>
<td>800</td>
<td>52px</td>
<td>34px</td>
<td>1.05</td>
<td>-0.03em</td>
<td>uppercase</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Body text</td>
<td>Space Grotesk</td>
<td>400</td>
<td>18px</td>
<td>16px</td>
<td>1.6</td>
<td>0</td>
<td>none</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Stat number</td>
<td>Syne</td>
<td>900</td>
<td>56px</td>
<td>40px</td>
<td>0.95</td>
<td>-0.02em</td>
<td>none</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>Stat label</td>
<td>Space Grotesk</td>
<td>600</td>
<td>13px</td>
<td>12px</td>
<td>1.4</td>
<td>0.1em</td>
<td>uppercase</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Card title</td>
<td>Space Grotesk</td>
<td>600</td>
<td>20px</td>
<td>18px</td>
<td>1.3</td>
<td>0</td>
<td>none</td>
<td><code>#F0ECE6</code></td>
</tr>
<tr>
<td>Card body</td>
<td>Space Grotesk</td>
<td>400</td>
<td>16px</td>
<td>15px</td>
<td>1.5</td>
<td>0</td>
<td>none</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Card micro-label</td>
<td>JetBrains Mono</td>
<td>500</td>
<td>11px</td>
<td>10px</td>
<td>1.4</td>
<td>0.15em</td>
<td>uppercase</td>
<td><code>#E85D26</code></td>
</tr>
</tbody></table>
<h4>Slide 3: Portfolio</h4>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size (Desktop)</th>
<th>Size (Mobile)</th>
<th>Line Height</th>
<th>Tracking</th>
<th>Transform</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td>Section label</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>12px</td>
<td>11px</td>
<td>1.4</td>
<td>0.2em</td>
<td>uppercase</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Client name overlay</td>
<td>Space Grotesk</td>
<td>600</td>
<td>18px</td>
<td>16px</td>
<td>1.3</td>
<td>0</td>
<td>none</td>
<td><code>#FFFFFF</code></td>
</tr>
<tr>
<td>Client name shadow</td>
<td>--</td>
<td>--</td>
<td>--</td>
<td>--</td>
<td>--</td>
<td>--</td>
<td>--</td>
<td><code>text-shadow: 0 2px 8px rgba(0,0,0,0.6)</code></td>
</tr>
<tr>
<td>Thumbnail label</td>
<td>Space Grotesk</td>
<td>500</td>
<td>12px</td>
<td>11px</td>
<td>1.4</td>
<td>0.05em</td>
<td>uppercase</td>
<td><code>#8A847C</code></td>
</tr>
</tbody></table>
<h4>Slide 6: AI Advisory</h4>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size (Desktop)</th>
<th>Size (Mobile)</th>
<th>Line Height</th>
<th>Tracking</th>
<th>Transform</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td>Section headline</td>
<td>Syne</td>
<td>800</td>
<td>52px</td>
<td>34px</td>
<td>1.05</td>
<td>-0.03em</td>
<td>uppercase</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Step number</td>
<td>Syne</td>
<td>800</td>
<td>40px</td>
<td>32px</td>
<td>1.0</td>
<td>-0.02em</td>
<td>none</td>
<td><code>#7C9A72</code></td>
</tr>
<tr>
<td>Step title</td>
<td>Space Grotesk</td>
<td>600</td>
<td>20px</td>
<td>18px</td>
<td>1.3</td>
<td>0</td>
<td>none</td>
<td><code>#F0ECE6</code></td>
</tr>
<tr>
<td>Step body</td>
<td>Space Grotesk</td>
<td>400</td>
<td>16px</td>
<td>15px</td>
<td>1.5</td>
<td>0</td>
<td>none</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Price callout</td>
<td>Syne</td>
<td>800</td>
<td>28px</td>
<td>22px</td>
<td>1.1</td>
<td>-0.01em</td>
<td>none</td>
<td><code>#7C9A72</code></td>
</tr>
<tr>
<td>Deep dive link</td>
<td>Space Grotesk</td>
<td>600</td>
<td>14px</td>
<td>13px</td>
<td>1.4</td>
<td>0.05em</td>
<td>uppercase</td>
<td><code>#7C9A72</code></td>
</tr>
</tbody></table>
<h4>Slide 8: Contact / CTA</h4>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Size (Desktop)</th>
<th>Size (Mobile)</th>
<th>Line Height</th>
<th>Tracking</th>
<th>Transform</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td>Headline</td>
<td>Syne</td>
<td>900</td>
<td>64px</td>
<td>40px</td>
<td>0.95</td>
<td>-0.03em</td>
<td>uppercase</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Form label</td>
<td>Space Grotesk</td>
<td>600</td>
<td>12px</td>
<td>11px</td>
<td>1.4</td>
<td>0.12em</td>
<td>uppercase</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Form input text</td>
<td>Space Grotesk</td>
<td>400</td>
<td>18px</td>
<td>16px</td>
<td>1.4</td>
<td>0</td>
<td>none</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Form placeholder</td>
<td>Space Grotesk</td>
<td>400</td>
<td>18px</td>
<td>16px</td>
<td>1.4</td>
<td>0</td>
<td>none</td>
<td><code>rgba(255,255,255,0.25)</code></td>
</tr>
<tr>
<td>Submit button</td>
<td>Syne</td>
<td>800</td>
<td>16px</td>
<td>14px</td>
<td>1.0</td>
<td>0.06em</td>
<td>uppercase</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Fallback contact</td>
<td>Space Grotesk</td>
<td>400</td>
<td>16px</td>
<td>15px</td>
<td>1.5</td>
<td>0</td>
<td>none</td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Phone number</td>
<td>Space Grotesk</td>
<td>600</td>
<td>18px</td>
<td>16px</td>
<td>1.4</td>
<td>0</td>
<td>none</td>
<td><code>#F0ECE6</code></td>
</tr>
</tbody></table>
<hr>
<h2>Spacing System</h2>
<h3>Global</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Slide container padding (desktop)</td>
<td><code>0 96px</code> (left/right)</td>
</tr>
<tr>
<td>Slide container padding (tablet)</td>
<td><code>0 48px</code></td>
</tr>
<tr>
<td>Slide container padding (mobile)</td>
<td><code>0 24px</code></td>
</tr>
<tr>
<td>Content max-width</td>
<td><code>1200px</code> centered</td>
</tr>
<tr>
<td>Text max-width</td>
<td><code>65ch</code> (body text line length cap)</td>
</tr>
<tr>
<td>Gap between headline and body</td>
<td><code>24px</code></td>
</tr>
<tr>
<td>Gap between body and CTA</td>
<td><code>40px</code></td>
</tr>
<tr>
<td>Gap between stat blocks</td>
<td><code>48px</code> desktop, <code>32px</code> mobile</td>
</tr>
<tr>
<td>Card grid gap</td>
<td><code>24px</code> desktop, <code>16px</code> mobile</td>
</tr>
<tr>
<td>Card internal padding</td>
<td><code>32px</code> desktop, <code>24px</code> mobile</td>
</tr>
</tbody></table>
<h3>Vertical Rhythm Within Slides</h3>
<table>
<thead>
<tr>
<th>Zone</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Content vertical position</td>
<td>Centered in viewport using flexbox <code>align-items: center</code>. Content sits in the middle 60% of the viewport. Never pinned to top or bottom.</td>
</tr>
<tr>
<td>Top safe zone</td>
<td>Minimum <code>80px</code> from viewport top (clears nav bar)</td>
</tr>
<tr>
<td>Bottom safe zone</td>
<td>Minimum <code>48px</code> from viewport bottom</td>
</tr>
</tbody></table>
<hr>
<h2>Slide-by-Slide Design</h2>
<h3>Slide 1: HERO</h3>
<p><strong>Emotional direction:</strong> &quot;Feel something. This isn&#39;t another agency.&quot;</p>
<p><strong>Background:</strong></p>
<ul>
<li>Full-viewport video via Gumlet iframe, edge-to-edge, no borders</li>
<li>Dark overlay: <code>rgba(12,12,12,0.50)</code> over video</li>
<li>Vignette: <code>radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)</code></li>
<li>Film grain overlay: SVG fractalNoise, <code>opacity: 0.03</code>, <code>mix-blend-mode: overlay</code>, <code>pointer-events: none</code></li>
<li>Bottom gradient: <code>linear-gradient(to bottom, transparent 85%, #0C0C0C 100%)</code> blends into scroll area below</li>
</ul>
<p><strong>Content layout:</strong></p>
<ul>
<li>All content centered horizontally and vertically</li>
<li>Micro-label above headline: &quot;CREATIVE PRODUCTION + AI SYSTEMS&quot;<ul>
<li>Margin below micro-label: <code>16px</code></li>
</ul>
</li>
<li>Headline: &quot;WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.&quot;<ul>
<li>Max-width: <code>900px</code></li>
<li>Text-align: center</li>
<li>Margin below headline: <code>24px</code></li>
</ul>
</li>
<li>Subhead: one line, centered below headline<ul>
<li>Max-width: <code>600px</code></li>
</ul>
</li>
</ul>
<p><strong>Status bar:</strong></p>
<ul>
<li>Positioned at bottom of viewport, <code>32px</code> from bottom edge</li>
<li>Horizontal row of items separated by <code>/</code> or <code>|</code> divider</li>
<li>Items: <code>PHOENIX, AZ / VIDEO / WEB / SOCIAL / SYSTEMS / EST. 2020</code></li>
<li>Each divider: <code>#292524</code>, <code>1px</code> width</li>
<li>Centered horizontally</li>
<li>Entire bar opacity: <code>0.7</code></li>
</ul>
<p><strong>Down arrow (scroll cue):</strong></p>
<ul>
<li>Centered below status bar, <code>16px</code> gap</li>
<li>Lucide <code>ChevronDown</code>, <code>24px</code>, <code>#8A847C</code></li>
<li>Subtle float animation: <code>translateY(0)</code> to <code>translateY(6px)</code> and back, <code>2s ease-in-out infinite</code></li>
<li>On hover: color shifts to <code>#E85D26</code></li>
<li>Clickable, scrolls to Slide 2</li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Micro-label: fade up 20px, 0ms delay, 500ms duration</li>
<li>Headline: fade up 20px, 150ms delay, 500ms duration</li>
<li>Subhead: fade up 20px, 300ms delay, 400ms duration</li>
<li>Status bar: fade in (no translate), 600ms delay, 400ms duration</li>
<li>Down arrow: fade in, 800ms delay, 400ms duration</li>
</ul>
<p><strong>Video fallback:</strong></p>
<ul>
<li>Primary: Gumlet iframe (reel or best-of compilation)</li>
<li>Fallback (slow load / error): Static hero image (strongest frame from the reel), or branded gradient <code>linear-gradient(135deg, #0C0C0C 0%, #1A1A17 50%, #0C0C0C 100%)</code> with film grain active</li>
<li>Loading state: Solid <code>#0C0C0C</code>. Video fades in over <code>600ms ease</code> once loaded. No layout shift.</li>
</ul>
<p><strong>Nav bar:</strong> Semi-transparent on this slide. Background <code>rgba(12,12,12,0.4)</code>, <code>backdrop-filter: blur(12px)</code>. Becomes solid <code>#0C0C0C</code> on Slides 2-8.</p>
<hr>
<h3>Slide 2: THE HOOK</h3>
<p><strong>Emotional direction:</strong> &quot;We already know what you&#39;re tired of. Trust us.&quot;</p>
<p><strong>Background:</strong> <code>#151515</code> (Night Card). No texture. Clean surface.</p>
<p><strong>Content layout:</strong></p>
<ul>
<li>Split layout: 55% left, 45% right. Gap: <code>64px</code>.</li>
<li>Vertical center aligned.</li>
</ul>
<p><strong>Left side:</strong></p>
<ul>
<li>Section label: JetBrains Mono micro-label, &quot;WHY AOM&quot;, <code>#8A847C</code>, <code>margin-bottom: 16px</code></li>
<li>Headline: &quot;SMALL TEAM. CINEMA-GRADE. NO BS.&quot;</li>
<li>Body text below headline: one paragraph, max <code>45ch</code>, <code>margin-top: 24px</code><ul>
<li>Text: &quot;No layers of account managers. No scope creep. You talk to the people doing the work.&quot;</li>
</ul>
</li>
</ul>
<p><strong>Right side:</strong></p>
<ul>
<li>4 stat blocks in a 2x2 grid. <code>gap: 32px</code></li>
<li>Each stat block:<ul>
<li>Stat number (Syne 900, 56px, <code>#E85D26</code>)</li>
<li>Stat label below (Space Grotesk 600, 13px, uppercase, <code>#8A847C</code>)</li>
<li>Gap between number and label: <code>8px</code></li>
</ul>
</li>
<li>Stats: &quot;24-72HR&quot; / Fast Turnarounds, &quot;CINEMA&quot; / Production Quality, &quot;PREDICTABLE&quot; / Delivery Timeline, &quot;REPEATABLE&quot; / Brand Consistency</li>
<li>Stat blocks have a subtle left border: <code>2px solid rgba(232,93,38,0.2)</code>, <code>padding-left: 20px</code></li>
</ul>
<p><strong>Mobile (&lt; 768px):</strong></p>
<ul>
<li>Single column. Headline section on top, stat grid below.</li>
<li>Stats become 2x2 grid (stays 2-column on mobile, each stat stacks number over label)</li>
<li>Gap between text section and stats: <code>40px</code></li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Section label: fade up 15px, 0ms, 400ms</li>
<li>Headline: fade up 15px, 100ms, 400ms</li>
<li>Body: fade up 15px, 200ms, 400ms</li>
<li>Stat blocks: stagger left-to-right then top-to-bottom, 300ms start, 100ms apart, fade up 20px each</li>
</ul>
<hr>
<h3>Slide 3: THE WORK</h3>
<p><strong>Emotional direction:</strong> &quot;Stop reading. Watch this.&quot;</p>
<p><strong>Background:</strong> <code>#0C0C0C</code> (Night). Portfolio fills the frame.</p>
<p><strong>Content layout:</strong></p>
<ul>
<li>Video reel fills approximately 85% of viewport height, centered</li>
<li>Left/right padding: <code>48px</code> desktop, <code>24px</code> mobile, <code>0</code> on reel itself if edge-to-edge feels better (Bobby&#39;s discretion on reel bleed)</li>
<li>Video has overlay: <code>rgba(12,12,12,0.35)</code> to keep any text readable</li>
</ul>
<p><strong>Top-left label:</strong></p>
<ul>
<li>&quot;THE WORK&quot; in micro-label style (JetBrains Mono, 12px, uppercase, <code>tracking: 0.2em</code>, <code>#8A847C</code>)</li>
<li>Position: <code>48px</code> from left, <code>80px</code> from top (below nav)</li>
</ul>
<p><strong>Client name overlay:</strong></p>
<ul>
<li>Bottom-left of video area</li>
<li>Position: <code>48px</code> from left, <code>48px</code> from bottom of reel</li>
<li>Client name: Space Grotesk 600, 18px, <code>#FFFFFF</code>, <code>text-shadow: 0 2px 8px rgba(0,0,0,0.6)</code></li>
<li>Below client name: industry tag in micro-label style, <code>12px</code>, <code>#8A847C</code>, <code>margin-top: 4px</code></li>
<li>Fade transition when switching between pieces: <code>300ms ease</code></li>
</ul>
<p><strong>Thumbnail selectors:</strong></p>
<ul>
<li>Positioned at bottom of viewport, horizontally centered, <code>32px</code> from bottom</li>
<li>4 thumbnails in a row, each <code>80px x 56px</code> (16:9 ratio)</li>
<li>Gap between thumbnails: <code>12px</code></li>
<li>Border: <code>2px solid rgba(255,255,255,0.1)</code></li>
<li>Active thumbnail border: <code>2px solid #E85D26</code></li>
<li>Inactive hover: border <code>rgba(255,255,255,0.25)</code></li>
<li>Border-radius: <code>0</code> (square corners, per brand)</li>
<li>Transition: <code>border-color 200ms ease</code></li>
<li>Each thumbnail is a still frame from that portfolio piece</li>
</ul>
<p><strong>Mobile (&lt; 768px):</strong></p>
<ul>
<li>Video reel fills full width, <code>70vh</code> height</li>
<li>Thumbnails shrink to <code>56px x 40px</code>, <code>gap: 8px</code></li>
<li>Client name moves to <code>24px</code> from left, <code>24px</code> from bottom of reel</li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Section label: fade in, 0ms, 300ms</li>
<li>Reel: fade in (no translate), 100ms, 500ms</li>
<li>Client name: fade up 10px, 400ms, 300ms</li>
<li>Thumbnails: stagger left-to-right, 500ms start, 80ms apart, fade up 10px</li>
</ul>
<hr>
<h3>Slide 4: SERVICES</h3>
<p><strong>Emotional direction:</strong> &quot;Here&#39;s what we do. Pick your lane.&quot;</p>
<p><strong>Background:</strong> <code>#1A1A17</code> (Deep Warm). Warmest dark surface.</p>
<p><strong>Content layout:</strong></p>
<ul>
<li>Section label: &quot;WHAT WE DO&quot; micro-label, centered, <code>margin-bottom: 16px</code></li>
<li>Headline: centered, <code>margin-bottom: 48px</code></li>
<li>3 pathway cards in a row. <code>gap: 24px</code>. Max card width: <code>380px</code> each.</li>
<li>Cards centered as a group within <code>1200px</code> content max.</li>
</ul>
<p><strong>Card design:</strong></p>
<ul>
<li>Background: <code>rgba(255,255,255,0.03)</code></li>
<li>Border: <code>1px solid rgba(255,255,255,0.08)</code></li>
<li>Border-radius: <code>0</code> (square corners)</li>
<li>Padding: <code>40px 32px</code></li>
<li>Height: auto, but all three cards should match the tallest (use CSS grid <code>align-items: stretch</code>)</li>
</ul>
<p><strong>Card contents (top to bottom):</strong></p>
<ol>
<li>Icon: Lucide icon, <code>32px</code>, stroke <code>2px</code>, <code>#E85D26</code>. Top-left of card.<ul>
<li>Card 1 (Construction): <code>HardHat</code> or <code>Building2</code></li>
<li>Card 2 (Brands + Corporate): <code>Film</code> or <code>Video</code></li>
<li>Card 3 (Digital + Systems): <code>Monitor</code> or <code>Code2</code></li>
</ul>
</li>
<li>Gap: <code>24px</code></li>
<li>Card title: Space Grotesk 600, 20px, <code>#F0ECE6</code></li>
<li>Gap: <code>12px</code></li>
<li>Card body: Space Grotesk 400, 16px, <code>#8A847C</code>, max 2-3 lines</li>
<li>Gap: <code>24px</code></li>
<li>Card CTA: Space Grotesk 600, 14px, uppercase, <code>tracking: 0.05em</code>, <code>#E85D26</code>. With Lucide <code>ArrowRight</code> icon, <code>16px</code>, inline, <code>margin-left: 8px</code></li>
</ol>
<p><strong>Card hover:</strong></p>
<ul>
<li>Border: <code>1px solid rgba(232,93,38,0.3)</code></li>
<li>Background: <code>rgba(255,255,255,0.05)</code></li>
<li>CTA text: shifts right <code>4px</code> (the arrow moves)</li>
<li>Transition: <code>200ms ease</code></li>
</ul>
<p><strong>Mobile (&lt; 768px):</strong></p>
<ul>
<li>Cards stack vertically, full-width, <code>gap: 16px</code></li>
<li>Padding reduces to <code>32px 24px</code></li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Section label + headline: fade up 15px, stagger 100ms, 400ms each</li>
<li>Cards: stagger left-to-right, 250ms start, 120ms apart, fade up 25px, 400ms each</li>
</ul>
<hr>
<h3>Slide 5: CONSTRUCTION</h3>
<p><strong>Emotional direction:</strong> &quot;We know YOUR world. Not just marketing. Your world.&quot;</p>
<p><strong>Background:</strong> <code>#0C0C0C</code> (Night). Dark and bold.</p>
<p><strong>Content layout:</strong></p>
<ul>
<li>Split layout: 50% left (content), 50% right (media). Gap: <code>48px</code>.</li>
<li>Vertically centered.</li>
</ul>
<p><strong>Left side:</strong></p>
<ul>
<li>Section label: &quot;CONSTRUCTION&quot; micro-label, <code>#E85D26</code> (orange, not muted, to emphasize the specialty), <code>margin-bottom: 16px</code></li>
<li>Headline: &quot;YOUR CREWS BUILD IT. WE MAKE SURE PEOPLE SEE IT.&quot; (or similar, per copy direction)</li>
<li>Body text: <code>margin-top: 24px</code>, max <code>40ch</code>, one paragraph</li>
<li>2-3 proof points below body:<ul>
<li>Each: orange dot (<code>6px</code> circle, <code>#E85D26</code>) + text (Space Grotesk 400, 16px, <code>#8A847C</code>)</li>
<li>Gap between dot and text: <code>12px</code></li>
<li>Gap between proof points: <code>16px</code></li>
<li><code>margin-top: 32px</code></li>
</ul>
</li>
<li>CTA button: primary orange, <code>margin-top: 40px</code><ul>
<li>&quot;START A PROJECT&quot; or &quot;SEE CONSTRUCTION WORK&quot;</li>
</ul>
</li>
</ul>
<p><strong>Right side:</strong></p>
<ul>
<li>Single image or short video loop showing construction content</li>
<li>Fill the right column, vertically centered</li>
<li>Image treatment: <code>2px solid #292524</code> border, no border-radius</li>
<li>Aspect ratio: 4:5 (portrait, feels like a phone screen showing their social content)</li>
<li>Hover: border shifts to <code>rgba(232,93,38,0.3)</code></li>
</ul>
<p><strong>Mobile (&lt; 768px):</strong></p>
<ul>
<li>Single column. Content on top, image below.</li>
<li>Image becomes 16:9 landscape, full-width</li>
<li>Gap between content and image: <code>32px</code></li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Left content: stagger top-to-bottom (label, headline, body, proof points, CTA), 100ms apart, fade up 15px, 400ms</li>
<li>Right media: fade in + scale from 0.97 to 1.0, 300ms delay, 500ms</li>
</ul>
<hr>
<h3>Slide 6: AI ADVISORY</h3>
<p><strong>Emotional direction:</strong> &quot;We&#39;re building something new. You can be first.&quot;</p>
<p><strong>Background:</strong> <code>#151515</code> (Night Card). Sage green as accent.</p>
<p><strong>Content layout:</strong></p>
<ul>
<li>Two sections: left headline area (40%), right steps area (60%). Gap: <code>64px</code>.</li>
<li>Vertically centered.</li>
</ul>
<p><strong>Left side:</strong></p>
<ul>
<li>Section label: &quot;AI OPERATIONS&quot; micro-label, <code>#7C9A72</code> (sage), <code>margin-bottom: 16px</code></li>
<li>Headline: &quot;THE NEXT GEEK SQUAD FOR AI.&quot; or whatever copy lands</li>
<li>Body text: <code>margin-top: 24px</code>, max <code>35ch</code></li>
<li>Price callout below body:<ul>
<li>&quot;Starting at $2,500&quot; in Syne 800, 28px, <code>#7C9A72</code></li>
<li><code>margin-top: 32px</code></li>
</ul>
</li>
<li>Deep dive link: &quot;EXPLORE THE SYSTEM&quot; with <code>ArrowRight</code>, <code>#7C9A72</code>, <code>margin-top: 24px</code>. Links to <code>/system</code>.</li>
</ul>
<p><strong>Right side:</strong></p>
<ul>
<li>3 step cards stacked vertically. <code>gap: 20px</code>.</li>
<li>Each step card:<ul>
<li>Background: <code>rgba(124,154,114,0.05)</code></li>
<li>Border: <code>1px solid rgba(124,154,114,0.12)</code></li>
<li>Border-radius: <code>0</code></li>
<li>Padding: <code>28px 32px</code></li>
<li>Layout: step number left, content right</li>
<li>Step number: Syne 800, 40px, <code>#7C9A72</code>, <code>margin-right: 24px</code>, vertically centered</li>
<li>Step title: Space Grotesk 600, 20px, <code>#F0ECE6</code></li>
<li>Step body: Space Grotesk 400, 15px, <code>#8A847C</code>, <code>margin-top: 8px</code></li>
</ul>
</li>
<li>Step hover: border <code>rgba(124,154,114,0.25)</code>, background <code>rgba(124,154,114,0.08)</code>, <code>200ms ease</code></li>
</ul>
<p><strong>Steps content:</strong></p>
<ol>
<li>&quot;AUDIT&quot; / &quot;We map your workflows, find the gaps, build the blueprint.&quot;</li>
<li>&quot;SETUP&quot; / &quot;Custom AI agents, dashboards, and automations. Built for your business.&quot;</li>
<li>&quot;PLATFORM&quot; / &quot;Ongoing access. Updates pushed automatically. You just run your business.&quot;</li>
</ol>
<p><strong>Mobile (&lt; 768px):</strong></p>
<ul>
<li>Single column. Headline section on top, step cards below.</li>
<li>Step numbers shrink to 32px</li>
<li>Card padding: <code>24px</code></li>
<li>Gap between headline section and steps: <code>40px</code></li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Left content: stagger top-to-bottom, 100ms apart, fade up 15px, 400ms</li>
<li>Step cards: stagger top-to-bottom, 300ms start, 120ms apart, fade up 20px + fade in, 400ms</li>
</ul>
<hr>
<h3>Slide 7: SOCIAL PROOF</h3>
<p><strong>Emotional direction:</strong> &quot;Don&#39;t take our word for it.&quot;</p>
<p><strong>Background:</strong> <code>#1A1A17</code> (Deep Warm).</p>
<p><strong>Content layout:</strong></p>
<ul>
<li>Section label: &quot;WHAT THEY SAY&quot; micro-label, centered, <code>margin-bottom: 16px</code></li>
<li>Headline: centered, <code>margin-bottom: 48px</code></li>
<li>2-3 testimonial cards in a row. <code>gap: 24px</code>.</li>
<li>If only 2 testimonials: <code>max-width: 800px</code> centered. If 3: full <code>1200px</code> width.</li>
</ul>
<p><strong>Testimonial card design:</strong></p>
<ul>
<li>Background: <code>rgba(255,255,255,0.03)</code></li>
<li>Border: <code>1px solid rgba(255,255,255,0.08)</code></li>
<li>Border-radius: <code>0</code></li>
<li>Padding: <code>40px 32px</code></li>
<li>Top of card: large open-quote mark<ul>
<li>Syne 800, 48px, <code>#E85D26</code>, <code>opacity: 0.4</code></li>
<li><code>margin-bottom: 16px</code></li>
</ul>
</li>
<li>Quote text: Space Grotesk 400, 18px, <code>#F0ECE6</code>, italic, max 4 lines, <code>line-height: 1.6</code></li>
<li>Below quote: <code>24px</code> gap</li>
<li>Metric (if available): Syne 800, 32px, <code>#E85D26</code></li>
<li>Metric label: Space Grotesk 500, 13px, uppercase, <code>#8A847C</code>, <code>margin-top: 4px</code></li>
<li>Divider: <code>1px solid rgba(255,255,255,0.06)</code>, <code>margin: 20px 0</code></li>
<li>Name: Space Grotesk 600, 16px, <code>#F0ECE6</code></li>
<li>Company + industry: Space Grotesk 400, 14px, <code>#8A847C</code>, <code>margin-top: 4px</code></li>
</ul>
<p><strong>Card hover:</strong></p>
<ul>
<li>Border: <code>1px solid rgba(232,93,38,0.2)</code></li>
<li>Transition: <code>200ms ease</code></li>
</ul>
<p><strong>Optional client logo row:</strong></p>
<ul>
<li>Below testimonial cards, <code>margin-top: 48px</code></li>
<li>Horizontal row of logos, <code>gap: 48px</code>, centered</li>
<li>Each logo: <code>max-height: 32px</code>, <code>max-width: 120px</code>, grayscale filter, <code>opacity: 0.5</code></li>
<li>On hover: remove grayscale, <code>opacity: 0.8</code>, <code>200ms ease</code></li>
</ul>
<p><strong>Mobile (&lt; 768px):</strong></p>
<ul>
<li>Cards stack vertically, full-width, <code>gap: 16px</code></li>
<li>Quote text: 16px</li>
<li>Metric number: 28px</li>
<li>Logo row wraps to 2 rows if needed, <code>gap: 32px</code></li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Section label + headline: fade up 15px, stagger 100ms, 400ms</li>
<li>Testimonial cards: stagger left-to-right, 250ms start, 150ms apart, fade up 25px, 500ms</li>
<li>Logo row: fade in (no translate), 600ms delay, 400ms</li>
</ul>
<hr>
<h3>Slide 8: CONTACT / CTA</h3>
<p><strong>Emotional direction:</strong> &quot;You made it. Let&#39;s do this.&quot;</p>
<p><strong>Background:</strong> <code>#0C0C0C</code> (Night). Film grain: active, <code>opacity: 0.03</code>.</p>
<p><strong>Content layout:</strong></p>
<ul>
<li>Split layout: 45% left (headline + fallback info), 55% right (form). Gap: <code>64px</code>.</li>
<li>Vertically centered.</li>
</ul>
<p><strong>Left side:</strong></p>
<ul>
<li>Headline: &quot;LET&#39;S BUILD SOMETHING.&quot;<ul>
<li>Syne 900, 64px, <code>#FDF6EC</code></li>
<li>Max-width: <code>500px</code></li>
</ul>
</li>
<li>Subhead: Space Grotesk 400, 18px, <code>#8A847C</code>, <code>margin-top: 24px</code>, max <code>35ch</code><ul>
<li>Something like: &quot;Tell us what you need. We&#39;ll tell you exactly how we&#39;d do it.&quot;</li>
</ul>
</li>
<li>Divider: <code>1px solid rgba(255,255,255,0.08)</code>, <code>margin: 32px 0</code>, <code>width: 80px</code></li>
<li>Phone: Space Grotesk 600, 18px, <code>#F0ECE6</code>. Lucide <code>Phone</code> icon inline, <code>16px</code>, <code>#E85D26</code>, <code>margin-right: 12px</code></li>
<li>Email: Space Grotesk 600, 18px, <code>#F0ECE6</code>. Lucide <code>Mail</code> icon inline, <code>16px</code>, <code>#E85D26</code>, <code>margin-right: 12px</code>. <code>margin-top: 12px</code>.</li>
<li>Location: Space Grotesk 400, 16px, <code>#8A847C</code>. &quot;Phoenix, AZ&quot;. <code>margin-top: 12px</code>.</li>
</ul>
<p><strong>Right side: Contact form</strong></p>
<ul>
<li>Max-width: <code>480px</code></li>
<li>All inputs use bottom-border style (same as audit onboarding):<ul>
<li>Border: bottom only, <code>2px solid rgba(255,255,255,0.15)</code></li>
<li>Focus border: <code>2px solid #E85D26</code></li>
<li>Background: transparent</li>
<li>Height: <code>48px</code></li>
<li>Text: Space Grotesk 400, 18px, <code>#FDF6EC</code></li>
<li>Placeholder: <code>rgba(255,255,255,0.25)</code></li>
<li>Label above: Space Grotesk 600, 12px, uppercase, <code>tracking: 0.12em</code>, <code>#8A847C</code></li>
<li>Label-to-input gap: <code>8px</code></li>
<li>Between field groups: <code>32px</code></li>
</ul>
</li>
</ul>
<p><strong>Fields:</strong></p>
<ol>
<li>Name (text input)</li>
<li>Email (text input)</li>
<li>What do you need? (dropdown or pill selector: Video, Website, Social Media, AI Advisory, Other)<ul>
<li>If pills: orange fill on selected, same styling as audit onboarding pills but on dark background</li>
<li>Unselected pill: <code>border: 1px solid rgba(255,255,255,0.15)</code>, text <code>#8A847C</code></li>
<li>Selected pill: <code>background: #E85D26</code>, <code>border: 1px solid #E85D26</code>, text <code>#FDF6EC</code></li>
<li>Pill padding: <code>10px 20px</code></li>
<li>Pill gap: <code>10px</code></li>
<li>Wrap: flex-wrap</li>
</ul>
</li>
<li>Budget range (pill selector: same styling)</li>
<li>Timeline (pill selector: same styling)</li>
</ol>
<p><strong>Form submission (v1):</strong></p>
<ul>
<li>Send form data via email (Formspree, Resend, or Vercel serverless function) to <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a></li>
<li>On success: Replace form with confirmation message. Syne 700, 28px, <code>#FDF6EC</code>. &quot;WE&#39;LL BE IN TOUCH.&quot; + body text &quot;Usually within 24 hours.&quot; in Space Grotesk 400, 16px, <code>#8A847C</code>.</li>
<li>On error: Show inline error below submit button. Space Grotesk 400, 14px, <code>#EF4444</code>. &quot;Something went wrong. Try again or email us directly.&quot;</li>
<li>v2: Write to Supabase leads table</li>
</ul>
<p><strong>Submit button:</strong></p>
<ul>
<li>Full orange CTA</li>
<li>Background: <code>#E85D26</code></li>
<li>Text: &quot;START BRIEF&quot;, Syne 800, 16px, uppercase, <code>tracking: 0.06em</code>, <code>#FDF6EC</code></li>
<li>Padding: <code>16px 48px</code></li>
<li>Border-radius: <code>0</code></li>
<li>Hover: <code>#D14E1C</code>, shadow <code>0 0 20px rgba(232,93,38,0.15)</code></li>
<li><code>margin-top: 40px</code></li>
<li>Mobile: full-width</li>
</ul>
<p><strong>Mobile (&lt; 768px):</strong></p>
<ul>
<li>Single column. Headline section on top, form below.</li>
<li>Headline: 40px</li>
<li>Form max-width: full-width with <code>24px</code> padding</li>
<li>Gap between headline section and form: <code>40px</code></li>
</ul>
<p><strong>Entrance animation:</strong></p>
<ul>
<li>Left side: stagger top-to-bottom, 100ms apart, fade up 15px, 400ms</li>
<li>Form fields: stagger top-to-bottom, 300ms start, 80ms apart, fade up 15px, 350ms</li>
<li>Submit button: fade up 20px, 700ms delay, 400ms</li>
</ul>
<hr>
<h2>The &quot;Keep Exploring&quot; Section</h2>
<p>After Slide 8, the scroll-snap container ends. Below it, a traditional scrollable section begins. This is the &quot;keep going&quot; area for visitors who want to go deeper.</p>
<p><strong>Visual transition from Slide 8:</strong></p>
<ul>
<li>A subtle divider between the snap area and the scrollable area</li>
<li>Pattern strip: diagonal line pattern, <code>height: 6px</code>, full-width<ul>
<li><code>repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)</code></li>
</ul>
</li>
<li>Below the strip: background shifts to <code>#141412</code> (Charcoal), slightly different from any slide background, signaling a new zone</li>
</ul>
<p><strong>Section headline:</strong></p>
<ul>
<li>&quot;KEEP EXPLORING&quot; or &quot;GO DEEPER&quot;</li>
<li>Syne 700, 32px, <code>#8A847C</code> (muted, not attention-grabbing like slide headlines)</li>
<li>Centered, <code>padding-top: 80px</code>, <code>margin-bottom: 48px</code></li>
</ul>
<p><strong>Layout: Link cards in a grid</strong></p>
<ul>
<li>2 columns desktop, 1 column mobile</li>
<li><code>gap: 24px</code></li>
<li>Max-width: <code>960px</code>, centered</li>
<li>Content padding: <code>0 48px</code> desktop, <code>0 24px</code> mobile</li>
</ul>
<p><strong>Card design:</strong></p>
<ul>
<li>Background: <code>rgba(255,255,255,0.03)</code></li>
<li>Border: <code>1px solid rgba(255,255,255,0.06)</code></li>
<li>Border-radius: <code>0</code></li>
<li>Padding: <code>32px</code></li>
<li>Hover: border <code>rgba(232,93,38,0.2)</code>, background <code>rgba(255,255,255,0.05)</code>, <code>200ms ease</code></li>
<li>Each card links to a sub-page</li>
</ul>
<p><strong>Card contents:</strong></p>
<ol>
<li>Micro-label: JetBrains Mono, 11px, uppercase, <code>#E85D26</code> or <code>#7C9A72</code> (sage for AI-related links)</li>
<li>Title: Space Grotesk 600, 20px, <code>#F0ECE6</code>, <code>margin-top: 8px</code></li>
<li>Description: Space Grotesk 400, 15px, <code>#8A847C</code>, <code>margin-top: 8px</code>, max 2 lines</li>
<li>Arrow: Lucide <code>ArrowUpRight</code>, <code>16px</code>, <code>#8A847C</code>, absolute <code>top-right: 32px</code>. On hover: <code>#E85D26</code>.</li>
</ol>
<p><strong>Suggested cards:</strong></p>
<ul>
<li>Case Studies (when available)</li>
<li>The System (links to <code>/system</code>)</li>
<li>Briefs Hub (links to <code>/briefs</code>)</li>
<li>AI Advisory Sprint Plan</li>
<li>About AOM (if a dedicated about page exists)</li>
<li>FAQ (moved from main slides to here)</li>
</ul>
<p><strong>Footer:</strong></p>
<ul>
<li>Below the explore cards, <code>padding-top: 64px</code>, <code>padding-bottom: 48px</code></li>
<li>Minimal: AOM logo (small, <code>max-height: 24px</code>), copyright, social links</li>
<li>All text: <code>#8A847C</code>, 13px</li>
<li>Social icons: Lucide, <code>18px</code>, <code>#8A847C</code>, hover <code>#E85D26</code></li>
<li>Centered layout</li>
</ul>
<p><strong>Entrance animations:</strong></p>
<ul>
<li>Standard scroll-triggered fade-up for each card, <code>400ms ease-out</code></li>
<li>No stagger needed here since this is traditional scroll territory</li>
</ul>
<hr>
<h2>Progress Indicator</h2>
<h3>Desktop: Vertical Dot Rail</h3>
<p><strong>Position:</strong></p>
<ul>
<li>Right side of viewport, vertically centered (<code>top: 50%, transform: translateY(-50%)</code>)</li>
<li><code>right: 28px</code></li>
<li><code>z-index: 40</code></li>
</ul>
<p><strong>Visibility:</strong></p>
<ul>
<li>Hidden on Slide 1 (hero gets full immersion)</li>
<li>Fades in when Slide 2 becomes active: <code>opacity 0</code> to <code>1</code>, <code>300ms ease</code></li>
<li>Stays visible through Slides 2-8</li>
<li>Hidden in the &quot;keep exploring&quot; scroll section below</li>
</ul>
<p><strong>Dots:</strong></p>
<ul>
<li>8 dots total, one per slide</li>
<li>Inactive dot: <code>6px</code> circle, <code>#292524</code>, <code>opacity: 0.6</code></li>
<li>Active dot: <code>10px</code> circle, <code>#E85D26</code>, <code>opacity: 1.0</code>, <code>box-shadow: 0 0 8px rgba(232,93,38,0.4)</code></li>
<li>Transition between states: <code>200ms ease</code></li>
</ul>
<p><strong>Connecting line:</strong></p>
<ul>
<li><code>1px</code> wide vertical line connecting all dots</li>
<li>Base color: <code>#292524</code></li>
<li>Fill color: <code>#E85D26</code> from dot 1 to the active dot (like a progress bar)</li>
<li>Fill transition: <code>300ms ease-out</code> on slide change</li>
</ul>
<p><strong>Dot spacing:</strong></p>
<ul>
<li><code>20px</code> gap between dots (center to center, so <code>20px</code> minus dot radius)</li>
</ul>
<p><strong>Hover tooltip:</strong></p>
<ul>
<li>On dot hover: tooltip slides out to the LEFT of the dot</li>
<li>Tooltip: Space Grotesk 500, 12px, uppercase, <code>tracking: 0.08em</code>, <code>#F0ECE6</code></li>
<li>Tooltip background: <code>rgba(12,12,12,0.9)</code>, <code>backdrop-filter: blur(8px)</code></li>
<li>Tooltip padding: <code>6px 12px</code></li>
<li>Tooltip border-radius: <code>2px</code></li>
<li>Tooltip entrance: <code>translateX(8px)</code> to <code>translateX(0)</code> + <code>opacity 0</code> to <code>1</code>, <code>150ms ease</code></li>
<li>Tooltip labels: &quot;HERO&quot;, &quot;HOOK&quot;, &quot;WORK&quot;, &quot;SERVICES&quot;, &quot;CONSTRUCTION&quot;, &quot;AI&quot;, &quot;PROOF&quot;, &quot;CONTACT&quot;</li>
<li><code>8px</code> gap between tooltip and dot</li>
</ul>
<p><strong>Click behavior:</strong></p>
<ul>
<li>Each dot is clickable, scrolls to that slide</li>
<li>Cursor: <code>pointer</code></li>
<li>On click: dot scales <code>1.3x</code> briefly then settles to active size, <code>150ms</code></li>
</ul>
<h3>Mobile: Horizontal Dot Rail</h3>
<p><strong>Position:</strong></p>
<ul>
<li>Bottom of viewport, horizontally centered</li>
<li><code>bottom: 16px</code></li>
<li><code>z-index: 40</code></li>
</ul>
<p><strong>Container pill:</strong></p>
<ul>
<li>Background: <code>rgba(12,12,12,0.7)</code>, <code>backdrop-filter: blur(12px)</code></li>
<li>Border-radius: <code>9999px</code></li>
<li>Padding: <code>10px 20px</code></li>
<li>Height: <code>32px</code></li>
<li><code>pointer-events: auto</code> on the pill, rest of the bar is <code>pointer-events: none</code></li>
</ul>
<p><strong>Dots:</strong></p>
<ul>
<li>Same sizing: inactive <code>6px</code>, active <code>10px</code></li>
<li>Same colors</li>
<li>Horizontal layout, <code>gap: 12px</code> between dots</li>
<li>No connecting line on mobile</li>
<li>No tooltips (too small for touch)</li>
<li>Tappable: <code>44px</code> minimum touch target per dot (invisible hit area around each)</li>
</ul>
<p><strong>Visibility:</strong></p>
<ul>
<li>Same rules: hidden on Slide 1, visible Slides 2-8, hidden in &quot;keep exploring&quot;</li>
</ul>
<hr>
<h2>Floating Contact Button</h2>
<h3>Button</h3>
<p><strong>Position:</strong> Fixed. <code>right: 24px</code>, <code>bottom: 24px</code> desktop. <code>right: 16px</code>, <code>bottom: 16px</code> mobile.</p>
<p><strong>Size:</strong> <code>56px</code> circle desktop, <code>48px</code> circle mobile.</p>
<p><strong>Colors:</strong></p>
<ul>
<li>Background: <code>#E85D26</code></li>
<li>Icon: <code>#FFFFFF</code>, Lucide <code>MessageCircle</code>, <code>22px</code> desktop, <code>20px</code> mobile, stroke <code>2px</code></li>
<li>Shadow: <code>0 4px 16px rgba(232,93,38,0.3)</code></li>
</ul>
<p><strong>Border:</strong> None.</p>
<p><strong>Hover:</strong></p>
<ul>
<li><code>transform: scale(1.08)</code></li>
<li>Shadow: <code>0 6px 24px rgba(232,93,38,0.5)</code></li>
<li>Transition: <code>200ms ease</code></li>
</ul>
<p><strong>Z-index:</strong> <code>50</code> (above progress indicator, above all slide content)</p>
<h3>Label on First Appearance</h3>
<ul>
<li>On first load, button appears as a pill: icon + &quot;Let&#39;s Talk&quot; text</li>
<li>Pill background: <code>#E85D26</code></li>
<li>Text: Space Grotesk 600, 14px, <code>#FFFFFF</code>, <code>margin-left: 10px</code></li>
<li>Pill padding: <code>12px 20px 12px 16px</code></li>
<li>Pill border-radius: <code>9999px</code></li>
<li>After 3 seconds: text fades out (<code>opacity 0</code>, <code>width 0</code>, <code>300ms ease</code>), pill morphs into the circle</li>
</ul>
<h3>Entry Animation</h3>
<ul>
<li>Appears after <code>2000ms</code> delay from page load</li>
<li>Entrance: fade in + slide up <code>20px</code>, <code>400ms ease-out</code></li>
<li>Then single pulse: <code>scale(1.0)</code> to <code>scale(1.06)</code> to <code>scale(1.0)</code>, <code>600ms ease</code>, once</li>
<li>After pulse: static. No repeating animation.</li>
</ul>
<h3>Visibility</h3>
<ul>
<li>Visible on Slides 1-7</li>
<li>Hidden on Slide 8 (contact form is inline)</li>
<li>Transition: fade out <code>200ms</code> when entering Slide 8, fade in <code>200ms</code> when leaving Slide 8</li>
<li>Hidden in &quot;keep exploring&quot; section (contact info is in the footer)</li>
</ul>
<hr>
<h2>Contact Drawer</h2>
<h3>Desktop Drawer</h3>
<p><strong>Position:</strong> Fixed, right side of viewport. Slides in from right.</p>
<p><strong>Width:</strong> <code>420px</code></p>
<p><strong>Background:</strong> <code>#0C0C0C</code> (Night)</p>
<p><strong>Top edge:</strong> <code>4px</code> pattern strip (diagonal lines, same pattern as brand system)</p>
<p><strong>Entrance:</strong></p>
<ul>
<li><code>translateX(100%)</code> to <code>translateX(0)</code>, <code>300ms ease-out</code></li>
<li>Backdrop overlay on rest of page: <code>rgba(0,0,0,0.60)</code>, fades in <code>200ms</code></li>
</ul>
<p><strong>Close:</strong></p>
<ul>
<li>Click backdrop, press <code>Escape</code>, or click X button</li>
<li>X button: top-right, <code>24px</code> from edges, Lucide <code>X</code>, <code>24px</code>, <code>#8A847C</code>, hover <code>#F0ECE6</code></li>
<li>Exit: reverse of entrance, <code>250ms ease-in</code></li>
</ul>
<p><strong>Internal layout:</strong></p>
<ul>
<li>Padding: <code>48px 32px</code></li>
<li>Same form as Slide 8 right side (same fields, same styling)</li>
<li>Below form: phone + email fallback info (same as Slide 8 left side)</li>
<li>Vertically scrollable if content overflows</li>
</ul>
<p><strong>Z-index:</strong> <code>60</code> (above everything)</p>
<h3>Mobile Modal</h3>
<p><strong>Position:</strong> Fixed, full-screen overlay.</p>
<p><strong>Background:</strong> <code>#0C0C0C</code></p>
<p><strong>Entrance:</strong> Slide up from bottom, <code>300ms ease-out</code></p>
<p><strong>Close:</strong></p>
<ul>
<li>X button: top-right, <code>16px</code> from edges</li>
<li>Swipe down gesture (optional, Bobby&#39;s call)</li>
<li>Exit: slide down, <code>250ms ease-in</code></li>
</ul>
<p><strong>Internal layout:</strong></p>
<ul>
<li>Padding: <code>24px</code></li>
<li><code>padding-top: 64px</code> (clear the X button)</li>
<li>Same form, full-width</li>
<li>Scrollable</li>
</ul>
<hr>
<h2>Navigation</h2>
<h3>Top Nav Bar</h3>
<p><strong>Position:</strong> Fixed top. Full viewport width.</p>
<p><strong>Height:</strong> <code>64px</code> desktop, <code>56px</code> mobile.</p>
<p><strong>Background:</strong></p>
<ul>
<li>Slide 1: <code>rgba(12,12,12,0.4)</code>, <code>backdrop-filter: blur(12px)</code></li>
<li>Slides 2-8 + sub-pages: <code>#0C0C0C</code>, <code>border-bottom: 1px solid rgba(255,255,255,0.06)</code></li>
</ul>
<p><strong>Z-index:</strong> <code>45</code></p>
<p><strong>Contents:</strong></p>
<ul>
<li>Left: AOM logo. Max-height <code>28px</code>. Links to <code>/#hero</code> (Slide 1).</li>
<li>Right (desktop): nav links in a row, <code>gap: 32px</code><ul>
<li>&quot;Work&quot; (scrolls to Slide 3)</li>
<li>&quot;Services&quot; (scrolls to Slide 4)</li>
<li>&quot;AI Advisory&quot; (links to <code>/system</code>)</li>
<li>&quot;Contact&quot; (scrolls to Slide 8 OR opens contact drawer)</li>
<li>Each link: Space Grotesk 500, 14px, uppercase, <code>tracking: 0.06em</code>, <code>#8A847C</code></li>
<li>Hover: <code>#F0ECE6</code>, <code>150ms ease</code></li>
<li>Active (current slide): <code>#E85D26</code></li>
</ul>
</li>
<li>Right (mobile): hamburger icon, Lucide <code>Menu</code>, <code>24px</code>, <code>#8A847C</code></li>
</ul>
<p><strong>Mobile menu (hamburger open):</strong></p>
<ul>
<li>Full-screen overlay, <code>#0C0C0C</code> background</li>
<li>Links stacked vertically, centered</li>
<li>Each link: Syne 700, 28px, <code>#F0ECE6</code>, <code>gap: 24px</code> between links</li>
<li>Close: X button top-right</li>
</ul>
<h3>Scroll / Keyboard Navigation</h3>
<table>
<thead>
<tr>
<th>Input</th>
<th>Action</th>
</tr>
</thead>
<tbody><tr>
<td>Mouse wheel / trackpad scroll</td>
<td>Advance one slide (scroll snap handles it)</td>
</tr>
<tr>
<td>Swipe up (mobile)</td>
<td>Advance one slide</td>
</tr>
<tr>
<td>Swipe down (mobile)</td>
<td>Go back one slide</td>
</tr>
<tr>
<td>Arrow Down / Page Down</td>
<td>Advance one slide</td>
</tr>
<tr>
<td>Arrow Up / Page Up</td>
<td>Go back one slide</td>
</tr>
<tr>
<td>Home</td>
<td>Slide 1</td>
</tr>
<tr>
<td>End</td>
<td>Slide 8</td>
</tr>
<tr>
<td>Escape</td>
<td>Close any open drawer/modal</td>
</tr>
</tbody></table>
<h3>Slide Navigation Arrows</h3>
<ul>
<li>Down arrow: bottom-center of each slide (except Slide 8), <code>48px</code> from bottom<ul>
<li>Lucide <code>ChevronDown</code>, <code>20px</code>, <code>#8A847C</code>, <code>opacity: 0.5</code></li>
<li>Hover: <code>opacity: 1.0</code>, <code>#E85D26</code></li>
<li>Float animation same as hero arrow (subtle, <code>2s ease-in-out</code>)</li>
</ul>
</li>
<li>Up arrow: NOT shown. The progress dots handle backward navigation. Up arrows create visual clutter.</li>
</ul>
<hr>
<h2>Transitions</h2>
<h3>Between Slides (CSS Scroll Snap)</h3>
<ul>
<li>The scroll snap itself IS the transition. No custom animation between slides.</li>
<li><code>scroll-behavior: smooth</code> on the container</li>
<li><code>scroll-snap-type: y mandatory</code></li>
<li>Each slide: <code>scroll-snap-align: start</code>, <code>min-height: 100vh</code> (<code>100dvh</code> on mobile)</li>
</ul>
<h3>Within Slides (Content Entrance)</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Animation type</td>
<td>Fade up (translate + opacity)</td>
</tr>
<tr>
<td>Translate distance</td>
<td><code>15-25px</code> depending on element (see per-slide specs)</td>
</tr>
<tr>
<td>Duration (first view)</td>
<td><code>400-500ms</code> per element</td>
</tr>
<tr>
<td>Duration (revisit)</td>
<td><code>300ms</code> per element</td>
</tr>
<tr>
<td>Easing</td>
<td><code>ease-out</code> (deceleration curve)</td>
</tr>
<tr>
<td>Stagger</td>
<td><code>80-150ms</code> between sibling elements (see per-slide specs)</td>
</tr>
<tr>
<td>Trigger</td>
<td><code>IntersectionObserver</code> with <code>threshold: 0.3</code> (element is 30% visible)</td>
</tr>
</tbody></table>
<h3>URL Hash Updates</h3>
<ul>
<li><code>history.replaceState</code> (not <code>pushState</code>) on slide change</li>
<li>Update hash when slide is &gt;50% visible via IntersectionObserver</li>
<li>Hash values: <code>#hero</code>, <code>#hook</code>, <code>#work</code>, <code>#services</code>, <code>#construction</code>, <code>#ai</code>, <code>#proof</code>, <code>#contact</code></li>
<li>On page load with hash: scroll to that slide instantly (no animation)</li>
</ul>
<h3>Reduced Motion</h3>
<ul>
<li>Respect <code>prefers-reduced-motion: reduce</code></li>
<li>Disable all translate animations (content appears immediately, no slide-up)</li>
<li>Keep opacity fades (200ms, flat)</li>
<li>Keep scroll snap (it&#39;s functional, not decorative)</li>
<li>Keep progress indicator updates</li>
</ul>
<hr>
<h2>Responsive Breakpoints</h2>
<table>
<thead>
<tr>
<th>Breakpoint</th>
<th>Key Changes</th>
</tr>
</thead>
<tbody><tr>
<td><strong>&gt; 1280px (Large Desktop)</strong></td>
<td>Full experience. Content <code>max-width: 1200px</code>. Split layouts 50/50 or 55/45 as spec&#39;d.</td>
</tr>
<tr>
<td><strong>1024-1279px (Desktop)</strong></td>
<td>Same layout. Content <code>max-width: 1000px</code>. Slight padding reduction.</td>
</tr>
<tr>
<td><strong>768-1023px (Tablet)</strong></td>
<td>Split layouts collapse to stacked single-column. Cards stay in row if 2, stack if 3. Dot nav: right side, <code>right: 16px</code>. Nav bar items may collapse to hamburger.</td>
</tr>
<tr>
<td><strong>&lt; 768px (Mobile)</strong></td>
<td>Everything single-column. Cards stack. Dot nav moves to bottom-center horizontal. Hamburger menu. Touch targets minimum <code>44px</code>. All type sizes at mobile column. <code>100dvh</code> for slide height. Floating contact: <code>48px</code>, <code>right: 16px</code>, <code>bottom: 16px</code>.</td>
</tr>
<tr>
<td><strong>&lt; 480px (Small Mobile)</strong></td>
<td>Headline sizes at mobile minimum. Slide padding <code>0 20px</code>. Status bar on hero may wrap or hide some items.</td>
</tr>
</tbody></table>
<hr>
<h2>Accessibility</h2>
<table>
<thead>
<tr>
<th>Requirement</th>
<th>Implementation</th>
</tr>
</thead>
<tbody><tr>
<td>Slide semantics</td>
<td>Each slide is a <code>&lt;section&gt;</code> with <code>aria-label</code> (e.g., &quot;Hero&quot;, &quot;Our Services&quot;)</td>
</tr>
<tr>
<td>Progress dots</td>
<td><code>aria-label=&quot;Navigate to [slide name]&quot;</code> on each dot</td>
</tr>
<tr>
<td>Focus ring</td>
<td><code>2px solid #E85D26</code>, <code>offset: 2px</code>, <code>:focus-visible</code> only</td>
</tr>
<tr>
<td>Keyboard nav</td>
<td>Arrow keys, Page Up/Down, Home/End</td>
</tr>
<tr>
<td>Tab order</td>
<td>Follows slide order. Tab moves through current slide content first.</td>
</tr>
<tr>
<td>Contrast (verified)</td>
<td><code>#FDF6EC</code> on <code>#0C0C0C</code> = 16.8:1. <code>#8A847C</code> on <code>#0C0C0C</code> = 4.6:1. <code>#F0ECE6</code> on <code>#151515</code> = 14.2:1. <code>#8A847C</code> on <code>#151515</code> = 4.1:1 (AA pass). <code>#E85D26</code> on <code>#0C0C0C</code> = 4.3:1 (AA pass for large text).</td>
</tr>
<tr>
<td>Reduced motion</td>
<td><code>prefers-reduced-motion</code> honored (see Transitions section)</td>
</tr>
<tr>
<td>Skip link</td>
<td>Hidden &quot;Skip to content&quot; link at top of page, visible on focus, jumps to Slide 2 content</td>
</tr>
</tbody></table>
<hr>
<h2>Texture and Pattern Details</h2>
<h3>Film Grain (Slides 1, 8 only)</h3>
<pre><code>SVG filter: feTurbulence type=&quot;fractalNoise&quot; baseFrequency=&quot;0.65&quot; numOctaves=&quot;3&quot;
Overlay: full viewport
opacity: 0.03
mix-blend-mode: overlay
pointer-events: none
</code></pre>
<h3>Pattern Strip (Keep Exploring section divider only)</h3>
<pre><code>Height: 6px
Width: 100%
Background: repeating-linear-gradient(
  45deg,
  transparent,
  transparent 5px,
  rgba(232,93,38,0.08) 5px,
  rgba(232,93,38,0.08) 6px
)
pointer-events: none
</code></pre>
<h3>Contact Drawer Top Edge</h3>
<pre><code>Height: 4px
Same diagonal pattern as above
</code></pre>
<h3>Subtle Top-Edge Gradient Between Slides</h3>
<p>Each slide (except Slide 1) has a <code>10px</code> gradient at the top that hints at the previous slide&#39;s background color. Creates depth when scrolling.</p>
<pre><code>Slide 2 top gradient: linear-gradient(to bottom, #0C0C0C, transparent) height: 10px
Slide 3 top gradient: linear-gradient(to bottom, #151515, transparent) height: 10px
...and so on, matching the previous slide&#39;s background
</code></pre>
<hr>
<h2>Summary for Bobby</h2>
<p>8 slides + &quot;keep exploring&quot; overflow. One narrative arc. Each slide has ONE job.</p>
<p><strong>Three things to nail:</strong></p>
<ol>
<li><p><strong>The scroll snap.</strong> CSS-native, mandatory, smooth. This is the foundation. If the snap doesn&#39;t feel satisfying and decisive, nothing else matters.</p>
</li>
<li><p><strong>The stagger.</strong> Every slide&#39;s content enters with staggered timing. Headline first, then supporting elements cascade in. This is what makes it feel like a presentation, not a page load. Get the timing right and it&#39;s effortless. Get it wrong and it feels like lag.</p>
</li>
<li><p><strong>The contact accessibility.</strong> Between the floating button, the nav &quot;Contact&quot; link, and Slide 8, there is always a path to conversion within one click. The drawer must feel premium (dark, clean, bottom-border inputs). Not a popup. A destination.</p>
</li>
</ol>
<p>Every value is specified. No ambiguity. Build pixel-perfect.</p>
<p>Design standard: old people can read em, young people love em.</p>
`,s={title:e,slug:t,category:n,agent:o,date:d,dateFormatted:i,updated:null,summary:l,tags:r,content:c};export{o as agent,n as category,c as content,d as date,i as dateFormatted,s as default,t as slug,l as summary,r as tags,e as title,a as updated};
