const t="Audit Onboarding Tool Design Brief",n="audit-onboarding-brief",e="Design Specs",i="Elon",l="2026-03-11",o="Mar 11",s=null,r="Design brief from Elon to Steffen for the audit onboarding tool UX.",a=[],d=`<h1>Audit Onboarding Tool: Design Brief for Steffen</h1>
<p><strong>From:</strong> Elon (System Architect)
<strong>For:</strong> Steffen (Brand/Design)
<strong>Date:</strong> 2026-03-11
<strong>Next in pipeline:</strong> Bobby builds from this spec</p>
<p><strong>Full technical spec:</strong> <code>projects/sys/audit-onboarding-spec.md</code></p>
<hr>
<h2>What This Is</h2>
<p>A premium onboarding intake for AOM&#39;s $2,500 AI Operations Audit. Lives at <code>aheadofmarket.com/audit/[slug]</code>. Each client gets a unique URL. 27 slides across 6 sections.</p>
<p>This is not a form. It&#39;s a branded presentation where the client fills in their information. Think premium PowerPoint deck, not Google Forms. Every slide should feel like AOM built it on purpose.</p>
<hr>
<h2>Slide Types (4 templates)</h2>
<h3>Type 1: Welcome / Thank You</h3>
<ul>
<li>Full viewport, Night (#0C0C0C) background</li>
<li>Centered content block</li>
<li>Large Syne headline (48-56px desktop, 32-40px mobile)</li>
<li>Space Grotesk body text below (18px, cream #FDF6EC)</li>
<li>Single orange CTA button at bottom</li>
<li>Subtle film grain overlay (opacity 0.03)</li>
<li>Optional: diagonal line pattern strip at bottom edge</li>
</ul>
<h3>Type 2: Section Interstitial (Chapter Card)</h3>
<ul>
<li>Full viewport, Night (#0C0C0C) background</li>
<li>Large section number in orange (#E85D26), Syne 120-200px, positioned top-left or left-aligned</li>
<li>Section title in cream (#FDF6EC), Syne 40-56px, directly below number</li>
<li>One-line description in Text Muted (#8A847C), Space Grotesk 18px</li>
<li>Pattern strip accent: orange diagonal lines across bottom 60px of viewport</li>
<li>Auto-advances after 1.5-2 seconds OR click/Enter to skip</li>
<li>These are the breathing moments between sections</li>
</ul>
<h3>Type 3: Single Input Slide</h3>
<ul>
<li>Full viewport, Cream (#FDF6EC) background</li>
<li>Question headline: Syne 32-40px, black (#0A0A0A), top third of viewport</li>
<li>Optional subtext: Space Grotesk 16px, Warm Gray (#7A7267)</li>
<li>Input field centered in middle third</li>
<li>For radio/checkbox: options arranged as a grid of selectable pills</li>
<li>For text area: generous height, centered, max-width 640px</li>
<li>Navigation buttons in bottom third</li>
</ul>
<h3>Type 4: Multi-Input Slide</h3>
<ul>
<li>Full viewport, Cream (#FDF6EC) background</li>
<li>Slide headline: Syne 28-32px, black (#0A0A0A)</li>
<li>2-4 input fields stacked vertically with clear labels</li>
<li>Labels: Space Grotesk 12px, uppercase, tracking 0.12em, Warm Gray (#7A7267)</li>
<li>Input fields: Space Grotesk 18px, black, bottom-border style</li>
<li>Generous vertical spacing between fields (32-48px)</li>
<li>Fields max-width 560px, centered in viewport</li>
</ul>
<hr>
<h2>Progress Bar</h2>
<p>This is architectural, not decorative. Always visible at the top of every slide.</p>
<p><strong>Desktop layout:</strong></p>
<ul>
<li>Full width of viewport</li>
<li>Height: 4px (the actual bar) + label row above it</li>
<li>Label row: section name (left, Space Grotesk 11px, uppercase, tracking 0.12em) + slide count (right, same style)</li>
<li>Bar: cream track (#EDE7DF on light slides, #1A1A17 on dark slides), orange fill (#E85D26), width = percentage complete</li>
<li>Sits in a 48px tall strip at the very top of the page</li>
</ul>
<p><strong>Mobile layout:</strong></p>
<ul>
<li>Same structure but label text hidden below 480px. Bar only.</li>
<li>Height: 3px bar + 32px strip</li>
</ul>
<p><strong>Transition:</strong> bar width animates on slide change (ease-out, 300ms).</p>
<hr>
<h2>Slide Transitions</h2>
<ul>
<li><strong>Direction:</strong> Horizontal slide. New slide enters from right, current exits left (forward). Reverse for back.</li>
<li><strong>Duration:</strong> 250ms</li>
<li><strong>Easing:</strong> ease-out (fast start, smooth stop)</li>
<li><strong>Interstitials:</strong> Crossfade in (opacity 0 to 1, 300ms). More dramatic than input slides.</li>
<li><strong>No bounce, no spring, no scale effects.</strong> Clean and fast. The premium feel comes from the design, not the animation.</li>
</ul>
<hr>
<h2>Typography Scale (Audit-Specific)</h2>
<p>All within the v4 brand system. These are the specific applications.</p>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Size (Desktop)</th>
<th>Size (Mobile)</th>
<th>Weight</th>
<th>Color (on Cream)</th>
<th>Color (on Night)</th>
</tr>
</thead>
<tbody><tr>
<td>Section Number</td>
<td>Syne</td>
<td>120-200px</td>
<td>72-96px</td>
<td>800</td>
<td>n/a</td>
<td>#E85D26</td>
</tr>
<tr>
<td>Section Title</td>
<td>Syne</td>
<td>40-56px</td>
<td>28-36px</td>
<td>800</td>
<td>n/a</td>
<td>#FDF6EC</td>
</tr>
<tr>
<td>Slide Headline</td>
<td>Syne</td>
<td>32-40px</td>
<td>24-28px</td>
<td>700</td>
<td>#0A0A0A</td>
<td>#FDF6EC</td>
</tr>
<tr>
<td>Body / Subtext</td>
<td>Space Grotesk</td>
<td>18px</td>
<td>16px</td>
<td>400</td>
<td>#7A7267</td>
<td>#8A847C</td>
</tr>
<tr>
<td>Input Text</td>
<td>Space Grotesk</td>
<td>18px</td>
<td>16px</td>
<td>400</td>
<td>#0A0A0A</td>
<td>n/a</td>
</tr>
<tr>
<td>Input Label</td>
<td>Space Grotesk</td>
<td>12px</td>
<td>11px</td>
<td>600</td>
<td>#7A7267</td>
<td>n/a</td>
</tr>
<tr>
<td>Progress Label</td>
<td>Space Grotesk</td>
<td>11px</td>
<td>n/a</td>
<td>600</td>
<td>#7A7267</td>
<td>#8A847C</td>
</tr>
<tr>
<td>Button Text</td>
<td>Space Grotesk</td>
<td>16px</td>
<td>14px</td>
<td>700</td>
<td>#FDF6EC (on orange)</td>
<td>same</td>
</tr>
<tr>
<td>Pill Badge Text</td>
<td>Space Grotesk</td>
<td>14px</td>
<td>13px</td>
<td>500</td>
<td>#0A0A0A (unselected)</td>
<td>n/a</td>
</tr>
</tbody></table>
<hr>
<h2>Color Usage</h2>
<h3>Backgrounds</h3>
<ul>
<li><strong>Input slides:</strong> Cream (#FDF6EC). Clean, open, inviting.</li>
<li><strong>Interstitials + Welcome + Thank You:</strong> Night (#0C0C0C). Dramatic, branded.</li>
<li><strong>Alternation creates rhythm.</strong> Dark chapter card, light input slides, dark chapter card, light input slides.</li>
</ul>
<h3>Accents</h3>
<ul>
<li><strong>Orange (#E85D26):</strong> Progress bar fill, CTA buttons, focused input borders, selected pill badges, section numbers, active radio/checkbox states.</li>
<li><strong>Gold (#C9A84C):</strong> Sparingly. Completion badge on thank you slide. &quot;Saved&quot; indicator text.</li>
<li><strong>Sage (#7C9A72):</strong> Not used in this tool. Keep it for AI/systems content on the main site.</li>
</ul>
<h3>Borders and Dividers</h3>
<ul>
<li>Input underlines: Light Border (#D9D3CB) default, Orange (#E85D26) on focus</li>
<li>Card/pill borders: Light Border (#D9D3CB) default, Orange (#E85D26) on selected</li>
<li>No heavy box borders on inputs. Underline style keeps it open.</li>
</ul>
<h3>Focus and Active States</h3>
<ul>
<li>Text inputs: bottom border transitions from #D9D3CB to #E85D26 on focus (200ms)</li>
<li>Radio/checkbox pills: background transitions from transparent to #E85D26, text goes white</li>
<li>CTA button hover: #D14E1C (Orange Hover), optional orange glow shadow (rgba(232,93,38,0.15))</li>
</ul>
<hr>
<h2>Component Inventory</h2>
<h3>1. Text Input</h3>
<ul>
<li>Full width (max 560px)</li>
<li>Bottom-border only (no box)</li>
<li>48px height, Space Grotesk 18px</li>
<li>Label above: 12px uppercase, Warm Gray</li>
<li>Focus: orange underline, smooth transition</li>
<li>Placeholder text: #D9D3CB</li>
</ul>
<h3>2. Text Area</h3>
<ul>
<li>Full width (max 640px)</li>
<li>Subtle 1px border (#D9D3CB), rounded-sm (2px)</li>
<li>Min-height 120px, auto-grow</li>
<li>Same typography as text input</li>
<li>Focus: orange border</li>
</ul>
<h3>3. Radio Group (Pill Style)</h3>
<ul>
<li>Options as horizontal-wrap pills (think badge components from v4)</li>
<li>Each pill: padding 12px 24px, border 1px #D9D3CB, rounded-full</li>
<li>Unselected: transparent background, #0A0A0A text</li>
<li>Selected: #E85D26 background, #FDF6EC text</li>
<li>Full row clickable (not just the dot)</li>
<li>On mobile: pills stack or wrap naturally</li>
</ul>
<h3>4. Checkbox Group (Pill Grid)</h3>
<ul>
<li>2-3 column grid on desktop, 1 column on mobile</li>
<li>Same pill styling as radio but multi-select</li>
<li>Selected pills get orange background</li>
<li>&quot;Other + write-in&quot; pill expands to show a text input when selected</li>
</ul>
<h3>5. Dropdown (Custom)</h3>
<ul>
<li>Same dimensions as text input (48px, bottom-border)</li>
<li>Chevron icon right-aligned (Lucide ChevronDown, 18px)</li>
<li>Opens a floating panel: cream background, shadow-xl, rounded-sm</li>
<li>Options: 44px height each, orange background on hover</li>
<li>Selected option: orange text</li>
</ul>
<h3>6. Drag-to-Rank (Slide 25 only)</h3>
<ul>
<li>Numbered list items, each in a card: 56px height, subtle border</li>
<li>Drag handle on left (Lucide GripVertical icon)</li>
<li>Orange number indicator on left edge</li>
<li>Smooth reorder animation</li>
<li>Fallback for mobile: tap to assign rank number (1, 2, 3)</li>
</ul>
<h3>7. Primary CTA Button</h3>
<ul>
<li>Background: #E85D26</li>
<li>Text: #FDF6EC, Space Grotesk 16px, weight 700, uppercase, tracking 0.06em</li>
<li>Padding: 16px 48px</li>
<li>No border-radius (square, per brand guidelines)</li>
<li>Hover: #D14E1C + subtle glow shadow</li>
<li>Min-width: 200px</li>
</ul>
<h3>8. Ghost Button (Back)</h3>
<ul>
<li>Background: transparent</li>
<li>Text: #7A7267 on cream, #8A847C on dark</li>
<li>Border: 1px #D9D3CB on cream, 1px rgba(255,255,255,0.10) on dark</li>
<li>Same padding as primary</li>
<li>Hover: text darkens, border darkens</li>
</ul>
<h3>9. Progress Bar</h3>
<ul>
<li>Track: 4px height, full width</li>
<li>Track color: #EDE7DF on cream slides, #1A1A17 on dark slides</li>
<li>Fill: #E85D26, width animated</li>
<li>Contained in 48px strip with section label and count</li>
</ul>
<h3>10. Section Number (Interstitial)</h3>
<ul>
<li>Syne 120-200px, weight 800</li>
<li>Color: #E85D26</li>
<li>Positioned top-left of content area with generous margin</li>
<li>Leading zero: &quot;01&quot;, &quot;02&quot;, etc.</li>
</ul>
<h3>11. &quot;Saved&quot; Indicator</h3>
<ul>
<li>Small text near progress bar: &quot;Saved&quot; in Gold (#C9A84C)</li>
<li>Appears briefly (fade in/out, 2 seconds) after auto-save triggers</li>
<li>Space Grotesk 11px, uppercase</li>
</ul>
<hr>
<h2>What Makes This Different from Typeform</h2>
<table>
<thead>
<tr>
<th>Typeform</th>
<th>AOM Audit</th>
</tr>
</thead>
<tbody><tr>
<td>Generic white/pastel palette</td>
<td>AOM brand: cream/night alternation, orange accents</td>
</tr>
<tr>
<td>Small, centered questions</td>
<td>Large Syne headlines, generous viewport usage</td>
</tr>
<tr>
<td>Thin progress dot indicators</td>
<td>Architectural progress bar with section labels</td>
</tr>
<tr>
<td>Bouncy/playful animations</td>
<td>Clean, fast, confident transitions</td>
</tr>
<tr>
<td>Logo in corner, otherwise unbranded</td>
<td>Every slide unmistakably AOM</td>
</tr>
<tr>
<td>One-size-fits-all input styling</td>
<td>Custom pill selectors, bottom-border inputs, branded dropdowns</td>
</tr>
<tr>
<td>Feels like filling out a form</td>
<td>Feels like walking through a presentation</td>
</tr>
<tr>
<td>Generic &quot;Thank you!&quot; ending</td>
<td>Branded completion with clear next steps</td>
</tr>
</tbody></table>
<p>The key difference: Typeform is neutral on purpose (it works for everyone). This tool is AOM on purpose (it works for one brand, and it works hard).</p>
<hr>
<h2>Layout Principles</h2>
<ul>
<li><strong>Vertical centering.</strong> Content sits in the middle vertical third of the viewport. Not pinned to the top.</li>
<li><strong>Horizontal centering.</strong> All content max-width 720px, centered. Inputs max 560-640px within that.</li>
<li><strong>Viewport = canvas.</strong> Each slide uses the full viewport height. No scrolling within a slide (except text areas on mobile if content is long).</li>
<li><strong>Breathing room.</strong> Minimum 64px between headline and first input. Minimum 32px between input groups.</li>
<li><strong>Navigation anchored.</strong> Back/Continue buttons sit in a fixed bar at the bottom, 80px from viewport bottom. Always in the same place.</li>
</ul>
<hr>
<h2>Responsive Breakpoints</h2>
<table>
<thead>
<tr>
<th>Breakpoint</th>
<th>Layout Changes</th>
</tr>
</thead>
<tbody><tr>
<td>&gt; 1024px (Desktop)</td>
<td>Full layout as described. 2-3 column pill grids.</td>
</tr>
<tr>
<td>768-1024px (Tablet)</td>
<td>Content max-width reduces to 640px. Pill grids go 2 columns.</td>
</tr>
<tr>
<td>&lt; 768px (Mobile)</td>
<td>Content full-width with 24px padding. Pills single column. Section numbers scale to 72px. Navigation buttons full-width. Progress bar label hidden.</td>
</tr>
</tbody></table>
<hr>
<h2>Film Grain and Texture</h2>
<ul>
<li>Film grain SVG overlay on Night slides only (opacity 0.03, per v4 guidelines).</li>
<li>No grain on Cream slides. Keep them clean.</li>
<li>Diagonal line pattern strip on interstitials: bottom 60px of the slide, orange diagonal lines (45deg, rgba(232,93,38,0.08)).</li>
<li>No pattern overlays on input slides. Nothing should compete with the form fields.</li>
</ul>
<hr>
<h2>References</h2>
<ul>
<li>AOM Brand Guidelines v4: <code>projects/steffen/aom-brand-guidelines-v4.md</code></li>
<li>AOM /system page (live): <code>aheadofmarket.com/system</code> (similar premium feel, dark/light alternation)</li>
<li>AOM /briefs pages (live): <code>aheadofmarket.com/briefs</code> (same Syne + Space Grotesk system, section structure)</li>
<li>Circulus poster energy, AIR UK mobile presentation, UGC Portfolio template from Pinterest (in v4 guidelines)</li>
<li>Full slide-by-slide content: <code>projects/sys/audit-onboarding-spec.md</code></li>
</ul>
`,p={title:t,slug:n,category:e,agent:i,date:l,dateFormatted:o,updated:null,summary:r,tags:a,content:d};export{i as agent,e as category,d as content,l as date,o as dateFormatted,p as default,n as slug,r as summary,a as tags,t as title,s as updated};
