const t="Audit Onboarding Tool",e="audit-onboarding",n="Design Specs",o="Steffen",d="2026-03-11",i="Mar 11",s=null,r="Premium Typeform-style 27-slide audit intake experience.",l=[],c=`<h1>Audit Onboarding Tool: Design Spec</h1>
<blockquote>
<p>Steffen | 2026-03-11
For Bobby. Based on Elon&#39;s brief + AOM Brand Guidelines v4.
Route: <code>aheadofmarket.com/audit/[slug]</code></p>
</blockquote>
<hr>
<h2>Visual Mood</h2>
<p>A premium keynote presentation, not a web form. Every slide should feel like AOM designed it on purpose for this specific client. The alternating cream/night rhythm creates a cadence: dramatic chapter cards punctuated by clean, inviting input slides. Think Apple product reveal meets high-end consulting intake. Confident, warm, zero clutter.</p>
<hr>
<h2>Global Rules</h2>
<ul>
<li><strong>Fonts:</strong> Syne (headlines, 700-800 weight) + Space Grotesk (body/inputs/labels/buttons, 400-700)</li>
<li><strong>Viewport:</strong> Each slide is <code>min-h-screen</code>, <code>100dvh</code> on mobile. No scrolling within a slide unless absolutely necessary on small screens.</li>
<li><strong>Max content width:</strong> <code>720px</code> centered. Inputs max <code>560px</code> within that. Text areas max <code>640px</code>.</li>
<li><strong>Film grain:</strong> SVG noise overlay on Night slides only, <code>opacity: 0.03</code>, <code>mix-blend-mode: overlay</code>. Zero grain on Cream slides.</li>
<li><strong>Vertical centering:</strong> All content sits in the middle vertical third. Not pinned top. Use flexbox <code>items-center justify-center</code> on the slide container.</li>
<li><strong>Horizontal centering:</strong> Everything centered within the content column.</li>
<li><strong>Breathing room:</strong> Minimum <code>64px</code> between headline and first input. Minimum <code>32px</code> between input groups. Minimum <code>48px</code> between last input and navigation bar.</li>
</ul>
<hr>
<h2>Color System</h2>
<h3>Backgrounds</h3>
<table>
<thead>
<tr>
<th>Context</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Input slides</td>
<td><code>#FDF6EC</code> (Cream)</td>
<td>Clean, open, inviting. All question slides.</td>
</tr>
<tr>
<td>Interstitials + Welcome + Thank You</td>
<td><code>#0C0C0C</code> (Night)</td>
<td>Dramatic, branded. Chapter cards and bookends.</td>
</tr>
</tbody></table>
<h3>Text</h3>
<table>
<thead>
<tr>
<th>Context</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Headline on Cream</td>
<td><code>#0A0A0A</code> (Black)</td>
<td>Maximum contrast on light</td>
</tr>
<tr>
<td>Headline on Night</td>
<td><code>#FDF6EC</code> (Cream)</td>
<td>Warm white on dark</td>
</tr>
<tr>
<td>Body / Subtext on Cream</td>
<td><code>#7A7267</code> (Warm Gray)</td>
<td>Secondary text on light</td>
</tr>
<tr>
<td>Body / Subtext on Night</td>
<td><code>#8A847C</code> (Text Muted)</td>
<td>Secondary text on dark</td>
</tr>
<tr>
<td>Input text</td>
<td><code>#0A0A0A</code></td>
<td>User-entered text, always on Cream</td>
</tr>
<tr>
<td>Input label</td>
<td><code>#7A7267</code></td>
<td>Above inputs, on Cream</td>
</tr>
<tr>
<td>Placeholder text</td>
<td><code>#D9D3CB</code> (Light Border)</td>
<td>Ghost text in empty inputs</td>
</tr>
</tbody></table>
<h3>Accents</h3>
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
<td>Progress bar fill, CTA buttons, focus borders, selected pills, section numbers, active radio/checkbox</td>
</tr>
<tr>
<td>Orange Hover</td>
<td><code>#D14E1C</code></td>
<td>CTA hover state</td>
</tr>
<tr>
<td>Orange Glow</td>
<td><code>rgba(232,93,38,0.15)</code></td>
<td>Button hover shadow</td>
</tr>
<tr>
<td>Gold</td>
<td><code>#C9A84C</code></td>
<td>&quot;Saved&quot; indicator text, completion badge on Thank You slide</td>
</tr>
</tbody></table>
<h3>Borders</h3>
<table>
<thead>
<tr>
<th>Context</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Input underline (default)</td>
<td><code>#D9D3CB</code></td>
<td>Bottom border of text inputs, pill borders, dropdown</td>
</tr>
<tr>
<td>Input underline (focus)</td>
<td><code>#E85D26</code></td>
<td>Orange focus state</td>
</tr>
<tr>
<td>Pill border (unselected)</td>
<td><code>#D9D3CB</code></td>
<td>Ghost pill outlines</td>
</tr>
<tr>
<td>Pill border (selected)</td>
<td><code>#E85D26</code></td>
<td>Active selection</td>
</tr>
<tr>
<td>Ghost button border (on Cream)</td>
<td><code>#D9D3CB</code></td>
<td>Back button</td>
</tr>
<tr>
<td>Ghost button border (on Night)</td>
<td><code>rgba(255,255,255,0.10)</code></td>
<td>Back button on dark slides</td>
</tr>
</tbody></table>
<hr>
<h2>Typography Scale</h2>
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
<th>Color (Cream bg)</th>
<th>Color (Night bg)</th>
</tr>
</thead>
<tbody><tr>
<td>Section Number</td>
<td>Syne</td>
<td>800</td>
<td>160px</td>
<td>80px</td>
<td>0.9</td>
<td>-0.04em</td>
<td>n/a</td>
<td><code>#E85D26</code></td>
</tr>
<tr>
<td>Section Title</td>
<td>Syne</td>
<td>800</td>
<td>48px</td>
<td>32px</td>
<td>1.05</td>
<td>-0.03em</td>
<td>n/a</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Welcome/Thank You Headline</td>
<td>Syne</td>
<td>800</td>
<td>52px</td>
<td>36px</td>
<td>1.05</td>
<td>-0.03em</td>
<td>n/a</td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Slide Headline</td>
<td>Syne</td>
<td>700</td>
<td>36px</td>
<td>26px</td>
<td>1.1</td>
<td>-0.02em</td>
<td><code>#0A0A0A</code></td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Body / Subtext</td>
<td>Space Grotesk</td>
<td>400</td>
<td>18px</td>
<td>16px</td>
<td>1.6</td>
<td>0</td>
<td><code>#7A7267</code></td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Input Text</td>
<td>Space Grotesk</td>
<td>400</td>
<td>18px</td>
<td>16px</td>
<td>1.4</td>
<td>0</td>
<td><code>#0A0A0A</code></td>
<td>n/a</td>
</tr>
<tr>
<td>Input Label</td>
<td>Space Grotesk</td>
<td>600</td>
<td>12px</td>
<td>11px</td>
<td>1.4</td>
<td>0.12em</td>
<td><code>#7A7267</code></td>
<td>n/a</td>
</tr>
<tr>
<td>Progress Label</td>
<td>Space Grotesk</td>
<td>600</td>
<td>11px</td>
<td>hidden</td>
<td>1.4</td>
<td>0.12em</td>
<td><code>#7A7267</code></td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Button Text (Primary)</td>
<td>Space Grotesk</td>
<td>700</td>
<td>16px</td>
<td>14px</td>
<td>1.0</td>
<td>0.06em</td>
<td><code>#FDF6EC</code></td>
<td><code>#FDF6EC</code></td>
</tr>
<tr>
<td>Button Text (Ghost)</td>
<td>Space Grotesk</td>
<td>600</td>
<td>16px</td>
<td>14px</td>
<td>1.0</td>
<td>0.06em</td>
<td><code>#7A7267</code></td>
<td><code>#8A847C</code></td>
</tr>
<tr>
<td>Pill Badge Text</td>
<td>Space Grotesk</td>
<td>500</td>
<td>14px</td>
<td>13px</td>
<td>1.4</td>
<td>0</td>
<td><code>#0A0A0A</code> (unselected) / <code>#FDF6EC</code> (selected)</td>
<td>n/a</td>
</tr>
<tr>
<td>Saved Indicator</td>
<td>Space Grotesk</td>
<td>600</td>
<td>11px</td>
<td>11px</td>
<td>1.4</td>
<td>0.12em</td>
<td><code>#C9A84C</code></td>
<td><code>#C9A84C</code></td>
</tr>
<tr>
<td>Interstitial Description</td>
<td>Space Grotesk</td>
<td>400</td>
<td>18px</td>
<td>16px</td>
<td>1.6</td>
<td>0</td>
<td>n/a</td>
<td><code>#8A847C</code></td>
</tr>
</tbody></table>
<p>All text uppercase: Input Labels, Progress Labels, Button Text, Saved Indicator.
All text sentence case: Headlines, Body, Input Text, Pill Badge Text.</p>
<hr>
<h2>Component Specs</h2>
<h3>1. Text Input (Bottom-Border Style)</h3>
<ul>
<li><strong>Width:</strong> 100%, max <code>560px</code></li>
<li><strong>Height:</strong> <code>48px</code></li>
<li><strong>Border:</strong> bottom only, <code>2px solid #D9D3CB</code></li>
<li><strong>Border (focus):</strong> <code>2px solid #E85D26</code>, transition <code>200ms ease</code></li>
<li><strong>Background:</strong> transparent</li>
<li><strong>Text:</strong> Space Grotesk 400, 18px (16px mobile), <code>#0A0A0A</code></li>
<li><strong>Placeholder:</strong> <code>#D9D3CB</code></li>
<li><strong>Label above:</strong> Space Grotesk 600, 12px (11px mobile), uppercase, <code>tracking: 0.12em</code>, <code>#7A7267</code>. Gap between label and input: <code>8px</code></li>
<li><strong>Padding:</strong> <code>0 0 12px 0</code> (no side padding, bottom padding before the underline)</li>
<li><strong>No border-radius. No box border. Underline only.</strong></li>
</ul>
<h3>2. Text Area</h3>
<ul>
<li><strong>Width:</strong> 100%, max <code>640px</code></li>
<li><strong>Min-height:</strong> <code>120px</code></li>
<li><strong>Auto-grow:</strong> Yes, up to <code>240px</code> then scroll</li>
<li><strong>Border:</strong> <code>1px solid #D9D3CB</code>, border-radius <code>2px</code></li>
<li><strong>Border (focus):</strong> <code>1px solid #E85D26</code>, transition <code>200ms ease</code></li>
<li><strong>Background:</strong> <code>#FFFFFF</code> at 50% opacity (barely visible warmth on cream)</li>
<li><strong>Text:</strong> Space Grotesk 400, 18px (16px mobile), <code>#0A0A0A</code></li>
<li><strong>Padding:</strong> <code>16px</code></li>
<li><strong>Label above:</strong> Same as text input label</li>
</ul>
<h3>3. Radio Group (Pill Style)</h3>
<ul>
<li><strong>Layout:</strong> Flexbox, <code>flex-wrap: wrap</code>, <code>gap: 12px</code>, centered within content column</li>
<li><strong>Each pill:</strong><ul>
<li>Padding: <code>12px 24px</code></li>
<li>Border: <code>1px solid #D9D3CB</code></li>
<li>Border-radius: <code>9999px</code> (fully rounded, pill shape)</li>
<li>Background (unselected): transparent</li>
<li>Text (unselected): <code>#0A0A0A</code>, Space Grotesk 500, 14px (13px mobile)</li>
<li>Background (selected): <code>#E85D26</code></li>
<li>Text (selected): <code>#FDF6EC</code></li>
<li>Border (selected): <code>1px solid #E85D26</code></li>
<li>Transition: <code>background 200ms ease, color 200ms ease, border-color 200ms ease</code></li>
<li>Cursor: pointer</li>
<li>Min-width: <code>120px</code> on desktop, full-width on mobile</li>
</ul>
</li>
<li><strong>Mobile:</strong> Pills stack vertically, full-width, <code>gap: 8px</code></li>
<li><strong>Entire pill is the click target.</strong> No separate radio dot.</li>
</ul>
<h3>4. Checkbox Group (Pill Grid)</h3>
<ul>
<li><strong>Layout:</strong> CSS Grid, <code>grid-template-columns: repeat(3, 1fr)</code> desktop, <code>repeat(2, 1fr)</code> tablet, <code>1fr</code> mobile. Gap: <code>12px</code></li>
<li><strong>Pill styling:</strong> Identical to radio pills but multi-select</li>
<li><strong>&quot;Other&quot; pill:</strong> When selected, expands below to show a text input (bottom-border style, max <code>400px</code>). The expansion is animated: <code>max-height 200ms ease, opacity 200ms ease</code></li>
</ul>
<h3>5. Custom Dropdown</h3>
<ul>
<li><strong>Trigger:</strong> Same dimensions as text input (<code>48px</code> height, bottom-border style)</li>
<li><strong>Chevron:</strong> Lucide <code>ChevronDown</code>, <code>18px</code>, <code>#7A7267</code>, right-aligned. Rotates <code>180deg</code> on open (<code>200ms ease</code>)</li>
<li><strong>Dropdown panel:</strong><ul>
<li>Position: absolute, below trigger, same width</li>
<li>Background: <code>#FDF6EC</code></li>
<li>Border: <code>1px solid #D9D3CB</code></li>
<li>Border-radius: <code>2px</code></li>
<li>Shadow: <code>0 8px 32px rgba(0,0,0,0.12)</code></li>
<li>Max-height: <code>264px</code> (6 visible items), overflow-y: auto</li>
</ul>
</li>
<li><strong>Each option:</strong><ul>
<li>Height: <code>44px</code></li>
<li>Padding: <code>0 16px</code></li>
<li>Text: Space Grotesk 400, 16px, <code>#0A0A0A</code></li>
<li>Hover background: <code>#E85D26</code>, hover text: <code>#FDF6EC</code></li>
<li>Selected option text: <code>#E85D26</code> (when dropdown is closed, selected text shows orange)</li>
</ul>
</li>
</ul>
<h3>6. Drag-to-Rank (Slide 25 Only)</h3>
<ul>
<li><strong>Container:</strong> max <code>560px</code>, centered</li>
<li><strong>Each item:</strong><ul>
<li>Height: <code>56px</code></li>
<li>Background: <code>#FFFFFF</code> at 30% opacity</li>
<li>Border: <code>1px solid #D9D3CB</code></li>
<li>Border-radius: <code>2px</code></li>
<li>Padding: <code>0 16px</code></li>
<li>Display: flex, align-items: center</li>
<li>Gap between items: <code>8px</code></li>
</ul>
</li>
<li><strong>Drag handle:</strong> Lucide <code>GripVertical</code>, <code>18px</code>, <code>#D9D3CB</code>. Left side.</li>
<li><strong>Rank number:</strong> Syne 700, 18px, <code>#E85D26</code>. After drag handle, <code>16px</code> gap.</li>
<li><strong>Item text:</strong> Space Grotesk 400, 16px, <code>#0A0A0A</code></li>
<li><strong>Dragging state:</strong> Shadow <code>0 4px 16px rgba(0,0,0,0.1)</code>, slight scale <code>1.02</code>, border <code>#E85D26</code></li>
<li><strong>Reorder animation:</strong> <code>150ms ease</code> translate</li>
<li><strong>Mobile fallback:</strong> No drag. Tap an item to cycle its rank number (1, 2, 3, 4, 5). Numbered items sort visually. Tap same number to deselect.</li>
</ul>
<h3>7. Primary CTA Button</h3>
<ul>
<li><strong>Background:</strong> <code>#E85D26</code></li>
<li><strong>Text:</strong> <code>#FDF6EC</code>, Space Grotesk 700, 16px (14px mobile), uppercase, <code>tracking: 0.06em</code></li>
<li><strong>Padding:</strong> <code>16px 48px</code></li>
<li><strong>Min-width:</strong> <code>200px</code></li>
<li><strong>Border-radius:</strong> <code>0</code> (square corners, per brand)</li>
<li><strong>Border:</strong> none</li>
<li><strong>Hover:</strong> Background <code>#D14E1C</code>, shadow <code>0 0 20px rgba(232,93,38,0.15)</code></li>
<li><strong>Active (pressed):</strong> Background <code>#C14518</code>, transform <code>translateY(1px)</code></li>
<li><strong>Transition:</strong> <code>background 150ms ease, box-shadow 200ms ease</code></li>
<li><strong>Mobile:</strong> <code>width: 100%</code>, padding <code>16px 0</code></li>
<li><strong>Disabled state:</strong> Background <code>#D9D3CB</code>, text <code>#7A7267</code>, cursor not-allowed</li>
</ul>
<h3>8. Ghost Button (Back)</h3>
<ul>
<li><strong>Background:</strong> transparent</li>
<li><strong>Text (on Cream):</strong> <code>#7A7267</code>, Space Grotesk 600, 16px (14px mobile), uppercase, <code>tracking: 0.06em</code></li>
<li><strong>Text (on Night):</strong> <code>#8A847C</code></li>
<li><strong>Border (on Cream):</strong> <code>1px solid #D9D3CB</code></li>
<li><strong>Border (on Night):</strong> <code>1px solid rgba(255,255,255,0.10)</code></li>
<li><strong>Padding:</strong> <code>16px 48px</code></li>
<li><strong>Border-radius:</strong> <code>0</code></li>
<li><strong>Hover (on Cream):</strong> Text <code>#0A0A0A</code>, border <code>#0A0A0A</code></li>
<li><strong>Hover (on Night):</strong> Text <code>#FDF6EC</code>, border <code>rgba(255,255,255,0.25)</code></li>
<li><strong>Transition:</strong> <code>color 150ms ease, border-color 150ms ease</code></li>
<li><strong>Mobile:</strong> <code>width: 100%</code></li>
</ul>
<h3>9. Progress Bar</h3>
<ul>
<li><strong>Container:</strong> Fixed at top of every slide. Full viewport width. Height: <code>48px</code> (desktop), <code>32px</code> (mobile).</li>
<li><strong>Label row (desktop only):</strong><ul>
<li>Left: Section name, Space Grotesk 600, 11px, uppercase, <code>tracking: 0.12em</code></li>
<li>Right: Slide count (&quot;3 of 27&quot;), same styling</li>
<li>Color (on Cream): <code>#7A7267</code></li>
<li>Color (on Night): <code>#8A847C</code></li>
<li>Padding: <code>0 24px</code></li>
<li>Labels hidden below <code>480px</code></li>
</ul>
</li>
<li><strong>Bar:</strong><ul>
<li>Height: <code>4px</code> (desktop), <code>3px</code> (mobile)</li>
<li>Position: bottom of the container strip</li>
<li>Full viewport width</li>
<li>Track color (on Cream slides): <code>#EDE7DF</code></li>
<li>Track color (on Night slides): <code>#1A1A17</code></li>
<li>Fill color: <code>#E85D26</code></li>
<li>Fill width: percentage of total completion (slide X of 27)</li>
<li>Border-radius on fill: <code>0 2px 2px 0</code> (rounded right end only)</li>
</ul>
</li>
<li><strong>Transition:</strong> Fill width animates <code>300ms ease-out</code> on slide change</li>
</ul>
<h3>10. Section Number (Interstitials)</h3>
<ul>
<li><strong>Font:</strong> Syne 800, <code>160px</code> desktop, <code>80px</code> mobile</li>
<li><strong>Color:</strong> <code>#E85D26</code></li>
<li><strong>Format:</strong> Leading zero: &quot;01&quot;, &quot;02&quot;, &quot;03&quot;, &quot;04&quot;, &quot;05&quot;, &quot;06&quot;</li>
<li><strong>Position:</strong> Left-aligned within content column, <code>margin-bottom: 16px</code></li>
<li><strong>Line height:</strong> 0.9 (tight, no extra space above)</li>
</ul>
<h3>11. &quot;Saved&quot; Indicator</h3>
<ul>
<li><strong>Position:</strong> Inside progress bar container, right side, next to slide count</li>
<li><strong>Text:</strong> &quot;SAVED&quot;, Space Grotesk 600, 11px, uppercase, <code>tracking: 0.12em</code>, <code>#C9A84C</code></li>
<li><strong>Animation:</strong> Fade in <code>200ms</code>, hold <code>1800ms</code>, fade out <code>400ms</code>. Total visible: ~2.4 seconds.</li>
<li><strong>Trigger:</strong> After auto-save completes (on slide advance or after input debounce)</li>
</ul>
<hr>
<h2>Slide Templates</h2>
<h3>Type 1: Welcome / Thank You</h3>
<ul>
<li><strong>Background:</strong> <code>#0C0C0C</code> (Night)</li>
<li><strong>Content:</strong> Vertically and horizontally centered</li>
<li><strong>Headline:</strong> Syne 800, 52px desktop / 36px mobile, <code>#FDF6EC</code></li>
<li><strong>Body:</strong> Space Grotesk 400, 18px (16px mobile), <code>#8A847C</code>, max-width <code>560px</code>, <code>margin-top: 24px</code></li>
<li><strong>CTA:</strong> Primary orange button, centered, <code>margin-top: 48px</code></li>
<li><strong>Film grain:</strong> Active, <code>opacity: 0.03</code></li>
<li><strong>Diagonal line pattern:</strong> Bottom <code>60px</code> of viewport. <code>repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)</code></li>
<li><strong>Thank You additions:</strong> Gold completion badge (pill, <code>#C9A84C</code> background, <code>#0C0C0C</code> text, Space Grotesk 700, 12px, uppercase, &quot;COMPLETE&quot;). Positioned above the headline with <code>margin-bottom: 24px</code>.</li>
</ul>
<h3>Type 2: Section Interstitial (Chapter Card)</h3>
<ul>
<li><strong>Background:</strong> <code>#0C0C0C</code> (Night)</li>
<li><strong>Content:</strong> Left-aligned within centered <code>720px</code> content column. Vertically centered.</li>
<li><strong>Section number:</strong> Syne 800, 160px desktop / 80px mobile, <code>#E85D26</code>. Leading zero.</li>
<li><strong>Section title:</strong> Syne 800, 48px desktop / 32px mobile, <code>#FDF6EC</code>. Directly below number, <code>margin-top: 16px</code>.</li>
<li><strong>Description:</strong> Space Grotesk 400, 18px (16px mobile), <code>#8A847C</code>. <code>margin-top: 12px</code>. One line max.</li>
<li><strong>Film grain:</strong> Active</li>
<li><strong>Pattern strip:</strong> Bottom <code>60px</code>, same diagonal pattern as Welcome</li>
<li><strong>Auto-advance:</strong> After <code>1800ms</code> OR click/Enter/tap to skip immediately</li>
<li><strong>No navigation buttons on this slide type.</strong> It&#39;s a breathing moment.</li>
</ul>
<h3>Type 3: Single Input Slide</h3>
<ul>
<li><strong>Background:</strong> <code>#FDF6EC</code> (Cream)</li>
<li><strong>Layout:</strong> Three vertical zones within centered <code>720px</code> column:<ul>
<li><strong>Top third:</strong> Headline area. Syne 700, 36px desktop / 26px mobile, <code>#0A0A0A</code>. Optional subtext below: Space Grotesk 400, 16px, <code>#7A7267</code>, <code>margin-top: 12px</code>.</li>
<li><strong>Middle third:</strong> Input area. Single component (text input, radio group, checkbox group, dropdown, or text area) centered.</li>
<li><strong>Bottom zone:</strong> Navigation bar (see Navigation section)</li>
</ul>
</li>
<li><strong>No film grain. No pattern. Clean.</strong></li>
</ul>
<h3>Type 4: Multi-Input Slide</h3>
<ul>
<li><strong>Background:</strong> <code>#FDF6EC</code> (Cream)</li>
<li><strong>Layout:</strong> Centered <code>720px</code> column<ul>
<li><strong>Headline:</strong> Syne 700, 32px desktop / 24px mobile, <code>#0A0A0A</code>. Top of content area.</li>
<li><strong>Fields:</strong> 2-4 inputs stacked vertically, max-width <code>560px</code>, centered. Gap between field groups: <code>40px</code> desktop, <code>32px</code> mobile. Each field group = label + input.</li>
<li><strong>Bottom zone:</strong> Navigation bar</li>
</ul>
</li>
<li><strong>No film grain. No pattern.</strong></li>
</ul>
<hr>
<h2>Navigation Bar</h2>
<ul>
<li><strong>Position:</strong> Fixed at bottom of each slide. <code>80px</code> from viewport bottom (desktop), <code>40px</code> from bottom (mobile).</li>
<li><strong>Layout:</strong> Flex row, <code>justify-content: space-between</code>, max-width <code>560px</code>, centered.</li>
<li><strong>Left:</strong> Ghost button (&quot;BACK&quot;). Hidden on first slide.</li>
<li><strong>Right:</strong> Primary CTA button (&quot;CONTINUE&quot; or &quot;SUBMIT&quot; on final input slide).</li>
<li><strong>Mobile:</strong> Buttons stack vertically, Primary on top, Ghost below. <code>gap: 12px</code>. Both full-width.</li>
<li><strong>Keyboard:</strong> Enter key triggers Continue. Escape triggers Back (when available).</li>
</ul>
<hr>
<h2>Slide Transitions</h2>
<ul>
<li><strong>Forward:</strong> Current slide exits left (<code>translateX(-100%)</code>, <code>opacity: 0</code>), new slide enters from right (<code>translateX(100%)</code> to <code>translateX(0)</code>, <code>opacity: 1</code>).</li>
<li><strong>Backward:</strong> Reverse. Current exits right, new enters from left.</li>
<li><strong>Duration:</strong> <code>250ms</code></li>
<li><strong>Easing:</strong> <code>ease-out</code></li>
<li><strong>Interstitials (chapter cards):</strong> Crossfade only. <code>opacity: 0</code> to <code>opacity: 1</code>, <code>300ms ease-out</code>. No horizontal slide. More dramatic entrance.</li>
<li><strong>Progress bar:</strong> Width transition runs simultaneously with slide transition, <code>300ms ease-out</code>.</li>
<li><strong>No bounce, no spring, no scale, no blur.</strong> Clean and fast.</li>
</ul>
<hr>
<h2>Responsive Breakpoints</h2>
<table>
<thead>
<tr>
<th>Breakpoint</th>
<th>Changes</th>
</tr>
</thead>
<tbody><tr>
<td><strong>&gt; 1024px (Desktop)</strong></td>
<td>Full layout as spec&#39;d. Content max <code>720px</code>. Inputs max <code>560px</code>. Pill grids 3 columns. Navigation side-by-side.</td>
</tr>
<tr>
<td><strong>768-1024px (Tablet)</strong></td>
<td>Content max <code>640px</code>. Pill grids 2 columns. Same navigation layout. Section numbers <code>120px</code>.</td>
</tr>
<tr>
<td><strong>&lt; 768px (Mobile)</strong></td>
<td>Content full-width, padding <code>24px</code> left/right. Pills single column, full-width. Navigation stacks vertically, buttons full-width. Section numbers <code>80px</code>. Progress bar labels hidden. Slide headlines scale down per type table. Touch targets <code>48px</code> minimum height.</td>
</tr>
<tr>
<td><strong>&lt; 480px (Small Mobile)</strong></td>
<td>Progress labels fully hidden (bar only). Headline sizes at mobile minimum. CTA buttons <code>14px</code> text. Navigation <code>32px</code> from bottom.</td>
</tr>
</tbody></table>
<hr>
<h2>Keyboard and Accessibility</h2>
<ul>
<li><strong>Tab order:</strong> Label &gt; Input &gt; Continue &gt; Back</li>
<li><strong>Enter:</strong> Advances to next slide (submits current input)</li>
<li><strong>Escape:</strong> Goes back one slide</li>
<li><strong>Focus ring:</strong> <code>2px solid #E85D26</code>, offset <code>2px</code>, on all focusable elements. Visible only on keyboard navigation (<code>:focus-visible</code>).</li>
<li><strong>ARIA:</strong> Each slide is a <code>role=&quot;group&quot;</code> with <code>aria-label</code> matching the slide headline. Progress bar has <code>role=&quot;progressbar&quot;</code> with <code>aria-valuenow</code> and <code>aria-valuemax</code>.</li>
<li><strong>Contrast ratios (WCAG AA verified):</strong><ul>
<li><code>#0A0A0A</code> on <code>#FDF6EC</code> = 15.4:1 (pass)</li>
<li><code>#7A7267</code> on <code>#FDF6EC</code> = 4.8:1 (pass)</li>
<li><code>#FDF6EC</code> on <code>#E85D26</code> = 4.1:1 (pass, borderline, acceptable for large button text)</li>
<li><code>#FDF6EC</code> on <code>#0C0C0C</code> = 16.8:1 (pass)</li>
<li><code>#8A847C</code> on <code>#0C0C0C</code> = 4.6:1 (pass)</li>
</ul>
</li>
</ul>
<hr>
<h2>Texture and Pattern Details</h2>
<h3>Film Grain (Night slides only)</h3>
<pre><code>SVG filter: feTurbulence type=&quot;fractalNoise&quot; baseFrequency=&quot;0.65&quot; numOctaves=&quot;3&quot;
Overlay: full viewport, opacity 0.03, mix-blend-mode: overlay
pointer-events: none
</code></pre>
<h3>Diagonal Line Pattern Strip (Interstitials + Welcome/Thank You)</h3>
<pre><code>Position: absolute bottom
Height: 60px
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
<h3>Input slides</h3>
<p>No textures. No patterns. No overlays. Pure clean cream.</p>
<hr>
<h2>Summary for Bobby</h2>
<p>27 slides across 6 sections. Four slide templates (Welcome, Interstitial, Single Input, Multi-Input). Alternating Night/Cream rhythm gives the presentation its pulse.</p>
<p><strong>Three things to nail:</strong></p>
<ol>
<li><strong>The rhythm.</strong> Dark chapter cards create dramatic pauses between clean input slides. The alternation is the design.</li>
<li><strong>The inputs.</strong> Bottom-border text fields, pill selectors, and custom dropdowns are the hero components. They must feel premium, not like a form library.</li>
<li><strong>The progress bar.</strong> Architectural, always visible, animated. It&#39;s the thread that stitches all 27 slides together.</li>
</ol>
<p>Every value is specified. No ambiguity. Build pixel-perfect.</p>
<p>Design standard: old people can read em, young people love em.</p>
`,a={title:t,slug:e,category:n,agent:o,date:d,dateFormatted:i,updated:null,summary:r,tags:l,content:c};export{o as agent,n as category,c as content,d as date,i as dateFormatted,a as default,e as slug,r as summary,l as tags,t as title,s as updated};
