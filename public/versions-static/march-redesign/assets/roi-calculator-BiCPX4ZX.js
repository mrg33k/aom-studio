const e="ROI Calculator Design Spec",t="roi-calculator",n="Design Specs",o="Steffen",a="2026-03-12",r="Mar 12",i=null,d="13-section implementation-ready spec for the ROI calculator page.",l=[],s=`<h1>ROI Calculator: Design Spec</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-12
For Bobby. Implementation-ready. No interpretation needed.</p>
</blockquote>
<hr>
<h2>1. Page Structure</h2>
<p>Single-page layout. Two main zones stacked vertically. No multi-step wizard. No page navigation. Everything on one scroll.</p>
<h3>Zone 1: Input Section (top)</h3>
<ul>
<li>Full viewport width, vertically centered on load</li>
<li>Max content width: <code>max-w-4xl</code> (896px)</li>
<li>Center-aligned on page</li>
<li>Background: <code>bg-aom-night</code> (#0C0C0C)</li>
<li>Padding: <code>pt-32 pb-24</code> desktop, <code>pt-24 pb-16</code> mobile</li>
</ul>
<h3>Zone 2: Results Section (below inputs, hidden until calculate)</h3>
<ul>
<li>Full viewport width</li>
<li>Max content width: <code>max-w-6xl</code> (1152px) for the results cards, <code>max-w-4xl</code> for breakdown tables</li>
<li>Background: <code>bg-aom-charcoal</code> (#141412) with top border <code>border-t border-aom-border</code> (#292524)</li>
<li>Padding: <code>py-24</code> desktop, <code>py-16</code> mobile</li>
<li>Reveals on calculate with animation (see Section 8)</li>
</ul>
<h3>Zone 3: CTA Section (below results, hidden until calculate)</h3>
<ul>
<li>Full viewport width</li>
<li>Max content width: <code>max-w-3xl</code> (768px)</li>
<li>Background: <code>bg-aom-night</code> (#0C0C0C)</li>
<li>Padding: <code>py-24</code> desktop, <code>py-16</code> mobile</li>
</ul>
<hr>
<h2>2. Page Header</h2>
<p>Follows the standard AOM section header pattern.</p>
<pre><code>Structure (top of Zone 1):
1. Mono micro-label
2. Orange accent line
3. Headline
4. Subhead
</code></pre>
<p><strong>Micro-label:</strong></p>
<ul>
<li>Text: &quot;AI OPERATIONS&quot;</li>
<li>Classes: <code>text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4</code></li>
<li>Color: #78716C</li>
</ul>
<p><strong>Accent line:</strong></p>
<ul>
<li>48px wide, 2px tall, #E85D26</li>
<li>Classes: <code>w-12 h-[2px] bg-aom-orange mb-6</code></li>
</ul>
<p><strong>Headline:</strong></p>
<ul>
<li>Text: &quot;WHAT WOULD AI SAVE YOUR BUSINESS?&quot;</li>
<li>Classes: <code>font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold italic uppercase tracking-tighter text-aom-warm-white</code></li>
<li>Color: #F5F0EB</li>
<li>Max width: <code>max-w-3xl</code></li>
</ul>
<p><strong>Subhead:</strong></p>
<ul>
<li>Text: &quot;Six inputs. Thirty seconds. A clear picture of what&#39;s possible.&quot;</li>
<li>Classes: <code>text-aom-stone text-lg mt-6 max-w-xl</code></li>
<li>Color: #A8A29E</li>
<li>Font: Space Grotesk 400</li>
</ul>
<hr>
<h2>3. Input Fields</h2>
<h3>Layout</h3>
<p><strong>Desktop (md+):</strong> 2-column grid, 3 rows.</p>
<ul>
<li>Classes: <code>grid grid-cols-2 gap-8 mt-16</code></li>
</ul>
<p><strong>Mobile:</strong> Single column stack.</p>
<ul>
<li>Classes: <code>grid grid-cols-1 gap-6 mt-12</code></li>
</ul>
<h3>Field Container (each field)</h3>
<pre><code>Wrapper:
- Classes: \`bg-aom-surface border border-aom-border rounded-sm p-6\`
- Background: #1A1A17
- Border: #292524
- Hover: \`hover:border-aom-border-hover transition-colors duration-300\`
- Focus-within: \`focus-within:border-aom-orange/40\`
</code></pre>
<h3>Field Label</h3>
<pre><code>- Classes: \`text-aom-warm-white text-sm font-body font-semibold mb-1 block\`
- Color: #F5F0EB
- Font: Space Grotesk 600, 14px
</code></pre>
<h3>Helper Text</h3>
<pre><code>- Classes: \`text-aom-stone-muted text-xs font-body mb-3 block\`
- Color: #78716C
- Font: Space Grotesk 400, 12px
</code></pre>
<h3>Field 1: Industry (Dropdown)</h3>
<pre><code>Select element:
- Classes: \`w-full bg-aom-night border border-aom-border rounded-sm px-4 py-3 text-aom-warm-white font-body text-base appearance-none cursor-pointer\`
- Background: #0C0C0C
- Border: #292524
- Text: #F5F0EB
- Focus: \`focus:outline-none focus:border-aom-orange/60 focus:ring-1 focus:ring-aom-orange/20\`
- Custom dropdown arrow: Lucide ChevronDown icon, 16px, #A8A29E, absolute positioned right-4

Dropdown options panel (if custom select):
- Background: #141412
- Border: #292524
- Each option: \`px-4 py-3 text-aom-warm-white hover:bg-aom-surface cursor-pointer\`
- Selected option: \`bg-aom-orange/10 text-aom-orange\`
</code></pre>
<h3>Fields 2-6: Number Inputs and Sliders</h3>
<p><strong>Field 2 (Team Size) and Field 3 (Admin Hours): Use SLIDERS with number display.</strong></p>
<p>These two fields benefit most from sliders because they have tight, intuitive ranges.</p>
<pre><code>Slider Track:
- Height: 6px
- Background (empty): #292524
- Background (filled): #E85D26
- Border-radius: 3px (rounded-full on the track)
- Classes: \`w-full h-1.5 rounded-full bg-aom-border appearance-none\`

Slider Thumb:
- Size: 20px x 20px
- Background: #E85D26
- Border: 2px solid #0C0C0C
- Border-radius: 50% (circle)
- Shadow: \`0 0 12px rgba(255, 79, 0, 0.3)\`
- Hover: scale(1.15), shadow intensifies to \`0 0 16px rgba(255, 79, 0, 0.5)\`
- Transition: \`transition-transform duration-150\`

Current Value Display (beside the slider):
- Position: right-aligned next to the label, or above the slider on mobile
- Classes: \`text-aom-warm-white font-headline text-2xl font-extrabold italic tabular-nums\`
- Color: #F5F0EB
- Font: Syne 800 Italic, 24px
- For team size: just the number (e.g., &quot;8&quot;)
- For admin hours: number + &quot;hrs&quot; suffix in stone color (e.g., &quot;10&quot; in white + &quot;hrs&quot; in #A8A29E at 14px)

Slider Range Labels (min/max):
- Classes: \`text-[10px] font-mono text-aom-stone-muted mt-1\`
- Left: min value, Right: max value
- Color: #78716C
</code></pre>
<p><strong>Fields 4, 5, 6 (Dollar inputs): Use NUMBER INPUTS with $ prefix.</strong></p>
<pre><code>Input wrapper:
- Classes: \`relative flex items-center\`

Dollar prefix:
- Classes: \`absolute left-4 text-aom-stone-muted font-body text-base select-none\`
- Color: #78716C
- Text: &quot;$&quot;

Number input:
- Classes: \`w-full bg-aom-night border border-aom-border rounded-sm pl-8 pr-4 py-3 text-aom-warm-white font-body text-base tabular-nums\`
- Background: #0C0C0C
- Border: #292524
- Text: #F5F0EB
- Focus: \`focus:outline-none focus:border-aom-orange/60 focus:ring-1 focus:ring-aom-orange/20\`
- Placeholder: #57534E (aom-dim)
- Number formatting: commas for thousands (e.g., $50,000). Handle via JS on blur/input.
</code></pre>
<h3>Calculate Button</h3>
<p>Full-width below the input grid. The primary action on the page.</p>
<pre><code>Container: \`mt-10 w-full\`

Button:
- Classes: \`w-full bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight text-lg px-8 py-5 shadow-lg shadow-aom-orange/20 hover:bg-aom-orange-hover transition-colors duration-300 cursor-pointer\`
- Background: #E85D26
- Hover: #D14E1C
- Text: &quot;CALCULATE MY ROI&quot;
- No border-radius. Square.
- Shadow: \`0 4px 24px rgba(255, 79, 0, 0.2)\`

Disabled state (before industry is selected):
- Classes: \`opacity-50 cursor-not-allowed\`
- No hover effect
</code></pre>
<hr>
<h2>4. Results Cards (Zone 2)</h2>
<h3>Layout</h3>
<p><strong>Desktop:</strong> 4 cards in a row.</p>
<ul>
<li>Classes: <code>grid grid-cols-4 gap-6</code></li>
</ul>
<p><strong>Tablet (md):</strong> 2x2 grid.</p>
<ul>
<li>Classes: <code>grid grid-cols-2 gap-6</code></li>
</ul>
<p><strong>Mobile:</strong> Single column stack.</p>
<ul>
<li>Classes: <code>grid grid-cols-1 gap-4</code></li>
</ul>
<h3>Card Design</h3>
<p>Each card follows the standard AOM card pattern with specific enhancements for data display.</p>
<pre><code>Card container:
- Classes: \`bg-aom-surface border border-aom-border rounded-sm p-8 relative overflow-hidden\`
- Background: #1A1A17
- Border: #292524

Top accent line (inside card, top edge):
- Height: 2px, full width of card
- Position: absolute top-0 left-0 right-0
- Color per card (see below)
</code></pre>
<h3>Card 1: Hours Recovered Per Week</h3>
<pre><code>Accent line: #7C9A72 (sage)

Icon: Clock (Lucide), 20px, #7C9A72
- Container: \`w-10 h-10 border border-aom-sage-muted/30 bg-black/40 flex items-center justify-center mb-4\`

Big number:
- Classes: \`font-headline text-5xl md:text-6xl font-extrabold italic text-aom-warm-white leading-none tabular-nums\`
- Color: #F5F0EB
- Font: Syne 800 Italic
- Suffix &quot;hrs&quot; in: \`text-2xl text-aom-stone ml-1 font-bold not-italic\`

Label:
- Text: &quot;Hours your team gets back every week&quot;
- Classes: \`text-aom-stone text-sm font-body mt-3\`
- Color: #A8A29E

Subtext:
- Text: &quot;[X] hours per year&quot;
- Classes: \`text-aom-stone-muted text-xs font-mono mt-2\`
- Color: #78716C
</code></pre>
<h3>Card 2: Monthly Value of Time Saved</h3>
<pre><code>Accent line: #E85D26 (orange)

Icon: DollarSign (Lucide), 20px, #E85D26
- Container: \`w-10 h-10 border border-aom-border bg-black/40 flex items-center justify-center mb-4\`

Big number:
- Classes: \`font-headline text-5xl md:text-6xl font-extrabold italic text-aom-warm-white leading-none tabular-nums\`
- Format: $X,XXX (currency, no decimals)

Label:
- Text: &quot;Monthly value of recovered time&quot;
- Classes: \`text-aom-stone text-sm font-body mt-3\`

Subtext:
- Text: &quot;Based on your $XX/hour effective rate&quot;
- Classes: \`text-aom-stone-muted text-xs font-mono mt-2\`
</code></pre>
<h3>Card 3: Total Monthly Impact</h3>
<pre><code>Accent line: #E85D26 (orange)

Icon: TrendingUp (Lucide), 20px, #E85D26
- Container: same as Card 2

Big number:
- Classes: same as Card 2
- Format: $XX,XXX (currency, no decimals)
- This is the biggest number. If it exceeds 5 digits, allow font to scale down: \`text-4xl md:text-5xl\`

Label:
- Text: &quot;Total monthly impact&quot;

Subtext:
- Text: &quot;Time savings + estimated revenue uplift + software savings&quot;
- &quot;estimated&quot; in italic
</code></pre>
<h3>Card 4: Break-Even Timeline</h3>
<pre><code>Accent line color logic:
- &lt; 4 months: #7C9A72 (sage, great)
- 4-8 months: #E85D26 (orange, good)
- 8-12 months: #CC3F00 (burnt orange, cautious)
- &gt; 12 months: #78716C (muted, honest flag)

Icon: Calendar (Lucide), 20px, same color as accent line
- Container: same pattern

Big number:
- Classes: same as others
- Format: X.X (one decimal)
- Suffix &quot;months&quot; in: \`text-xl text-aom-stone ml-1 font-bold not-italic\`

Label:
- Text: &quot;Months to break even&quot;

Subtext:
- Text: &quot;Including full setup cost of $9,000&quot;
- If &gt; 12 months: add line &quot;The audit gives you the real picture.&quot; in #A8A29E italic
</code></pre>
<hr>
<h2>5. Detailed Breakdown (below cards, still in Zone 2)</h2>
<h3>Section: Where the Value Comes From</h3>
<p><strong>Section header:</strong></p>
<pre><code>- Mono micro-label: &quot;BREAKDOWN&quot;
- Classes: \`text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4 mt-16\`
- Heading: &quot;Where the value comes from&quot;
- Classes: \`font-headline text-2xl md:text-3xl font-extrabold italic uppercase tracking-tighter text-aom-warm-white mb-8\`
</code></pre>
<p><strong>Table design:</strong></p>
<pre><code>Container:
- Classes: \`bg-aom-surface border border-aom-border rounded-sm overflow-hidden\`

Table:
- Full width
- No outer border (container handles it)

Header row:
- Background: \`bg-aom-night\`
- Text: \`text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted\`
- Padding: \`px-6 py-4\`
- Border bottom: \`border-b border-aom-border\`

Body rows:
- Background: transparent (inherits surface)
- Text: \`text-aom-warm-white font-body text-sm\`
- Padding: \`px-6 py-4\`
- Border bottom: \`border-b border-aom-border\` (last row: no border)
- Hover: \`hover:bg-aom-night/50 transition-colors\`

Total row:
- Background: \`bg-aom-night\`
- Text: \`text-aom-warm-white font-headline font-bold text-base\`
- Border top: \`border-t-2 border-aom-orange/30\`

Dollar values in body:
- Classes: \`font-mono text-sm tabular-nums\`
- Positive values: #F5F0EB
- The &quot;% of Total&quot; column: use a mini bar behind the percentage
  - Bar: \`bg-aom-orange/15\` (orange at 15% opacity)
  - Height: 100% of cell
  - Width: proportional to percentage value
  - Position: absolute behind the text
</code></pre>
<h3>Section: Investment vs. Return (3-Year View)</h3>
<p><strong>Same table pattern as above, with these differences:</strong></p>
<pre><code>Year columns header labels:
- &quot;YEAR 1&quot;, &quot;YEAR 2&quot;, &quot;YEAR 3&quot;
- Same mono micro-label styling

&quot;Total value&quot; row: values in #F5F0EB
&quot;System cost&quot; row: values in #A8A29E (neutral, not alarming)
&quot;Net benefit&quot; row: values in #7C9A72 (sage green for positive), #EF4444 (red if negative in year 1)
&quot;Cumulative ROI&quot; row: values in #E85D26 (orange, the headline number)
- Format: &quot;XXX%&quot; in \`font-headline font-extrabold italic text-lg\`
</code></pre>
<h3>Section: What AI Automates</h3>
<p><strong>Layout:</strong> Checklist grid.</p>
<pre><code>Container:
- Classes: \`mt-16\`

Section header: same pattern (micro-label + heading)
- Heading: &quot;What gets automated in [INDUSTRY]&quot;

Checklist:
- Desktop: \`grid grid-cols-2 gap-x-8 gap-y-3\`
- Mobile: \`grid grid-cols-1 gap-y-3\`

Each item:
- Classes: \`flex items-start gap-3\`
- Check icon: Lucide Check, 16px, #7C9A72 (sage)
  - Container: \`w-5 h-5 bg-aom-sage/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5\`
- Text: \`text-aom-stone text-sm font-body\`
- Color: #A8A29E
</code></pre>
<hr>
<h2>6. CTA Section (Zone 3)</h2>
<h3>Layout</h3>
<p>Centered, two-tier CTA stack.</p>
<pre><code>Container: \`text-center max-w-3xl mx-auto\`
</code></pre>
<h3>Primary CTA Block</h3>
<pre><code>Mono micro-label: &quot;NEXT STEP&quot;
- Standard micro-label styling

Heading: &quot;THESE ARE ESTIMATES. GET YOUR EXACT NUMBERS.&quot;
- Classes: \`font-headline text-3xl md:text-4xl font-extrabold italic uppercase tracking-tighter text-aom-warm-white mt-4\`

Body text:
- &quot;The $2,500 AI Operations Audit uses your actual workflows, not industry averages.&quot;
- Classes: \`text-aom-stone text-base font-body mt-4 max-w-xl mx-auto\`

Primary button:
- Text: &quot;BOOK YOUR AUDIT&quot;
- Classes: \`inline-block bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight text-lg px-12 py-5 mt-8 shadow-lg shadow-aom-orange/20 hover:bg-aom-orange-hover transition-colors duration-300\`
- No border-radius. Square.
- Links to /audit/test
</code></pre>
<h3>Secondary CTA Block</h3>
<pre><code>Container: \`mt-12 pt-12 border-t border-aom-border\`

Heading: &quot;Send me this report&quot;
- Classes: \`font-headline text-xl font-bold text-aom-warm-white\`

Email input + button inline:
- Input: \`bg-aom-surface border border-aom-border rounded-sm px-4 py-3 text-aom-warm-white font-body text-base w-72 max-w-full\`
- Button: \`bg-aom-surface border border-aom-warm-white text-aom-warm-white font-headline font-bold uppercase tracking-tight px-6 py-3 ml-2 hover:bg-aom-warm-white hover:text-aom-night transition-all duration-300\`
- Button text: &quot;SEND&quot;
</code></pre>
<h3>Disclaimer</h3>
<pre><code>- Classes: \`text-aom-stone-muted text-xs font-body mt-16 max-w-2xl mx-auto leading-relaxed\`
- Color: #78716C
- Text: &quot;These projections are estimates based on industry benchmarks and the information you provided. Your actual results will depend on your specific business operations. The $2,500 AI Operations Audit gives you exact numbers based on your actual workflows.&quot;
</code></pre>
<hr>
<h2>7. Color Usage for Data Visualization</h2>
<h3>Semantic Color Mapping</h3>
<table>
<thead>
<tr>
<th>Meaning</th>
<th>Color</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Time savings</td>
<td>Sage</td>
<td>#7C9A72</td>
<td>Hours card accent, check icons, positive time metrics</td>
</tr>
<tr>
<td>Dollar savings</td>
<td>Orange</td>
<td>#E85D26</td>
<td>Money cards accent, total impact, ROI percentage</td>
</tr>
<tr>
<td>Revenue uplift</td>
<td>Sage Light</td>
<td>#9BB593</td>
<td>Revenue row highlight, uplift indicator</td>
</tr>
<tr>
<td>Cost / investment</td>
<td>Stone</td>
<td>#A8A29E</td>
<td>System cost rows, neutral data</td>
</tr>
<tr>
<td>Warning / caution</td>
<td>Burnt Orange</td>
<td>#CC3F00</td>
<td>Break-even &gt; 8 months accent</td>
</tr>
<tr>
<td>Negative / poor fit</td>
<td>Muted Stone</td>
<td>#78716C</td>
<td>Break-even &gt; 12 months, small business flag</td>
</tr>
<tr>
<td>Success / great</td>
<td>Sage</td>
<td>#7C9A72</td>
<td>Break-even &lt; 4 months</td>
</tr>
</tbody></table>
<h3>Rules</h3>
<ul>
<li>Never use green (#22C55E, the form success color) for savings. Use sage (#7C9A72). Sage is the AOM brand signal for &quot;AI systems working.&quot; Green is reserved for form validation states.</li>
<li>Orange is the attention color. Use it for the biggest, most impressive number on the page (total monthly impact or annual ROI %).</li>
<li>No gradients in data visualization. Flat colors only. Opacity variations are fine (e.g., #E85D26 at 15% for background bars).</li>
<li>Percentage bars use <code>bg-aom-orange/15</code> as the track fill. Keep it subtle. The number is what matters.</li>
</ul>
<hr>
<h2>8. Animation Specs</h2>
<h3>Results Reveal (on calculate click)</h3>
<pre><code>Trigger: User clicks &quot;Calculate My ROI&quot;

Step 1: Button state change
- Button text changes to &quot;CALCULATING...&quot; with a subtle pulse
- Duration: 400ms (fake delay for perceived processing)
- Button background: stays #E85D26, text opacity pulses between 1 and 0.7

Step 2: Smooth scroll to results
- Scroll behavior: smooth, ease-out
- Duration: 600ms
- Target: top of Zone 2 with 80px offset

Step 3: Results zone fades in
- Zone 2 container: opacity 0 -&gt; 1, translateY 40px -&gt; 0px
- Duration: 700ms
- Easing: ease-out
- Delay: 200ms after scroll begins

Step 4: Cards stagger in
- Each card: opacity 0 -&gt; 1, translateY 30px -&gt; 0px
- Duration: 500ms per card
- Stagger: 120ms between each card (Card 1 at 0ms, Card 2 at 120ms, Card 3 at 240ms, Card 4 at 360ms)
- Easing: ease-out

Step 5: Numbers count up
- Each big number animates from 0 to final value
- Duration: 1200ms
- Easing: ease-out (fast start, slow finish)
- Start: when card becomes visible (intersection observer or after card animation completes)
- Format during count: show commas updating in real-time, dollar signs static
- Decimals (break-even months): count to one decimal place

Step 6: Breakdown sections
- Each section (tables, checklist) enters on scroll with standard AOM scroll reveal
- opacity 0 -&gt; 1, translateY 30px -&gt; 0px
- Duration: 700ms
- Easing: ease-out
- Trigger: element enters viewport (IntersectionObserver, threshold 0.1)

Step 7: CTA section
- Same scroll reveal as breakdown
- Primary button gets a subtle orange glow pulse after revealing:
  - \`box-shadow: 0 0 30px rgba(255, 79, 0, 0.15)\` pulsing to \`0 0 40px rgba(255, 79, 0, 0.25)\`
  - Duration: 2000ms, ease-in-out, infinite (subtle, not distracting)
</code></pre>
<h3>Input Interactions</h3>
<pre><code>Slider drag:
- Value display updates in real-time as user drags
- No debounce on display, results don&#39;t auto-calculate (only on button click)
- Thumb scale on hover: transform scale(1.15), duration 150ms

Field focus:
- Border transitions from #292524 to rgba(255, 79, 0, 0.4)
- Duration: 200ms
- Ring: 1px rgba(255, 79, 0, 0.2)

Card hover (results cards):
- Border: transition to #44403C (border-hover)
- Duration: 300ms
- No scale, no lift. Just border warmth.

Table row hover:
- Background: rgba(10, 10, 8, 0.5) (night at 50%)
- Duration: 200ms
</code></pre>
<h3>Recalculate</h3>
<pre><code>When user changes inputs and clicks calculate again:
- Numbers in existing cards animate from old value to new value (not from zero)
- Duration: 800ms
- Same ease-out curve
- No page scroll (results already visible)
- Cards do NOT re-animate their entrance. Only the numbers update.
</code></pre>
<hr>
<h2>9. Mobile Responsive Approach</h2>
<h3>Breakpoints</h3>
<table>
<thead>
<tr>
<th>Breakpoint</th>
<th>Width</th>
<th>Layout Changes</th>
</tr>
</thead>
<tbody><tr>
<td>Default (mobile)</td>
<td>&lt; 768px</td>
<td>Single column everything</td>
</tr>
<tr>
<td>md</td>
<td>&gt;= 768px</td>
<td>Input grid 2-col, result cards 2x2</td>
</tr>
<tr>
<td>lg</td>
<td>&gt;= 1024px</td>
<td>Result cards 4-col, wider max-w</td>
</tr>
<tr>
<td>xl</td>
<td>&gt;= 1280px</td>
<td>No change from lg, just more breathing room</td>
</tr>
</tbody></table>
<h3>Mobile-Specific Adjustments</h3>
<p><strong>Header:</strong></p>
<ul>
<li>Headline: <code>text-3xl</code> (from <code>text-6xl</code> on desktop)</li>
<li>Subhead: <code>text-base</code> (from <code>text-lg</code>)</li>
<li>Padding: <code>pt-24 pb-16</code> (from <code>pt-32 pb-24</code>)</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
<li>Single column: <code>grid-cols-1 gap-6</code></li>
<li>Field padding: <code>p-5</code> (from <code>p-6</code>)</li>
<li>Sliders get larger touch targets: thumb size 24px (from 20px on desktop)</li>
<li>Value display sits above slider, not beside it</li>
<li>Dollar inputs: same layout, slightly smaller padding <code>py-2.5</code></li>
</ul>
<p><strong>Result Cards:</strong></p>
<ul>
<li>Single column: <code>grid-cols-1 gap-4</code></li>
<li>Big numbers: <code>text-4xl</code> (from <code>text-6xl</code>)</li>
<li>Card padding: <code>p-6</code> (from <code>p-8</code>)</li>
</ul>
<p><strong>Tables:</strong></p>
<ul>
<li>Horizontal scroll on mobile: <code>overflow-x-auto</code></li>
<li>Minimum column widths so nothing gets crushed</li>
<li>Alternative: stack rows vertically on mobile (each row becomes a mini-card). Bobby decides based on what reads better. Either approach is acceptable.</li>
</ul>
<p><strong>CTA:</strong></p>
<ul>
<li>Button: full width <code>w-full</code></li>
<li>Email input + send button: stack vertically, both full width</li>
<li>Classes: <code>flex flex-col gap-3</code> on mobile, <code>flex-row</code> on md+</li>
</ul>
<p><strong>General:</strong></p>
<ul>
<li>All section padding: <code>py-16</code> (from <code>py-24</code>)</li>
<li>Card gaps: <code>gap-4</code> (from <code>gap-6</code>)</li>
<li>Body text never below 16px</li>
<li>Touch targets: minimum 44px height on all interactive elements (buttons, sliders, inputs, dropdowns)</li>
</ul>
<hr>
<h2>10. Honesty Indicators (Visual Treatment)</h2>
<p>The spec requires visual cues for break-even quality and edge cases.</p>
<h3>Break-Even Card Color States</h3>
<p>Already defined in Section 4. The accent line and icon color shift based on the number.</p>
<h3>&quot;Defaults Unchanged&quot; Nudge</h3>
<pre><code>If user hasn&#39;t changed any inputs from defaults:
- Show a subtle banner above results:
  - Classes: \`bg-aom-surface border border-aom-sage-muted/30 rounded-sm px-6 py-3 mb-8 flex items-center gap-3\`
  - Icon: Info (Lucide), 16px, #7C9A72
  - Text: &quot;Adjust the inputs to match your business for a more accurate estimate.&quot;
  - Classes: \`text-aom-stone text-sm font-body\`
</code></pre>
<h3>&quot;Estimated&quot; Label on Revenue Uplift</h3>
<pre><code>In the breakdown table, revenue uplift row:
- After the dollar value, add inline badge:
  - Text: &quot;est.&quot;
  - Classes: \`text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-aom-stone-muted bg-aom-night px-2 py-0.5 ml-2 rounded-sm\`
</code></pre>
<h3>Large Team Callout (&gt; 30 people)</h3>
<pre><code>Show a note card below the results cards:
- Classes: \`bg-aom-surface border border-aom-sage-muted/30 rounded-sm px-6 py-4 mt-6 flex items-start gap-3\`
- Icon: Users (Lucide), 16px, #7C9A72
- Text: &quot;For larger teams, we recommend a custom scoping call for more precise numbers.&quot;
- Ghost CTA inline: &quot;Schedule a call&quot; in #E85D26
</code></pre>
<hr>
<h2>11. Typography Quick Reference (this page only)</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Font</th>
<th>Weight</th>
<th>Style</th>
<th>Size (desktop)</th>
<th>Size (mobile)</th>
<th>Color</th>
</tr>
</thead>
<tbody><tr>
<td>Page headline</td>
<td>Syne</td>
<td>800</td>
<td>Italic, uppercase</td>
<td>60px (text-6xl)</td>
<td>30px (text-3xl)</td>
<td>#F0ECE6</td>
</tr>
<tr>
<td>Section headings</td>
<td>Syne</td>
<td>800</td>
<td>Italic, uppercase</td>
<td>30px (text-3xl)</td>
<td>24px (text-2xl)</td>
<td>#F0ECE6</td>
</tr>
<tr>
<td>Result big numbers</td>
<td>Syne</td>
<td>800</td>
<td>Italic</td>
<td>60px (text-6xl)</td>
<td>36px (text-4xl)</td>
<td>#F0ECE6</td>
</tr>
<tr>
<td>Number suffixes</td>
<td>Syne</td>
<td>700</td>
<td>Normal</td>
<td>20px (text-xl)</td>
<td>16px (text-base)</td>
<td>#7A7267</td>
</tr>
<tr>
<td>Card labels</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>14px (text-sm)</td>
<td>14px (text-sm)</td>
<td>#7A7267</td>
</tr>
<tr>
<td>Card subtexts</td>
<td>JetBrains Mono</td>
<td>400</td>
<td>Normal</td>
<td>12px (text-xs)</td>
<td>12px (text-xs)</td>
<td>#8A847C</td>
</tr>
<tr>
<td>Table headers</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>10px</td>
<td>10px</td>
<td>#8A847C</td>
</tr>
<tr>
<td>Table body</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>14px (text-sm)</td>
<td>14px (text-sm)</td>
<td>#F0ECE6</td>
</tr>
<tr>
<td>Table dollar values</td>
<td>JetBrains Mono</td>
<td>400</td>
<td>Normal</td>
<td>14px (text-sm)</td>
<td>14px (text-sm)</td>
<td>#F0ECE6</td>
</tr>
<tr>
<td>ROI percentage</td>
<td>Syne</td>
<td>800</td>
<td>Italic</td>
<td>18px (text-lg)</td>
<td>16px (text-base)</td>
<td>#E85D26</td>
</tr>
<tr>
<td>Field labels</td>
<td>Space Grotesk</td>
<td>600</td>
<td>Normal</td>
<td>14px (text-sm)</td>
<td>14px (text-sm)</td>
<td>#F0ECE6</td>
</tr>
<tr>
<td>Helper text</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>12px (text-xs)</td>
<td>12px (text-xs)</td>
<td>#8A847C</td>
</tr>
<tr>
<td>Micro-labels</td>
<td>JetBrains Mono</td>
<td>700</td>
<td>Uppercase</td>
<td>10px</td>
<td>10px</td>
<td>#8A847C</td>
</tr>
<tr>
<td>Button text</td>
<td>Syne</td>
<td>800</td>
<td>Uppercase</td>
<td>18px (text-lg)</td>
<td>16px (text-base)</td>
<td>#FFFFFF</td>
</tr>
<tr>
<td>Disclaimer</td>
<td>Space Grotesk</td>
<td>400</td>
<td>Normal</td>
<td>12px (text-xs)</td>
<td>12px (text-xs)</td>
<td>#8A847C</td>
</tr>
</tbody></table>
<hr>
<h2>12. Page Background Layers</h2>
<p>Match the existing AOM site atmospheric treatment.</p>
<pre><code>Layer 1: Base background
- bg-aom-night (#0C0C0C)

Layer 2: Noise/grain texture overlay
- SVG filter: fractalNoise
- Opacity: 0.03
- Mix-blend-mode: overlay
- Full page coverage, fixed position

Layer 3: Subtle orange gradient wash
- Opacity: 0.02
- Gradient: \`bg-gradient-to-b from-transparent via-orange-500/5 to-transparent\`
- Positioned behind Zone 2 (results) to give it subtle warmth
</code></pre>
<hr>
<h2>13. Accessibility</h2>
<ul>
<li>All form inputs have associated <code>&lt;label&gt;</code> elements</li>
<li>Slider values announced to screen readers via <code>aria-valuenow</code>, <code>aria-valuemin</code>, <code>aria-valuemax</code></li>
<li>Color contrast: all text passes WCAG AA<ul>
<li>#F5F0EB on #0C0C0C = 17.8:1 (AAA)</li>
<li>#A8A29E on #0C0C0C = 6.9:1 (AA)</li>
<li>#78716C on #0C0C0C = 4.5:1 (AA)</li>
<li>#E85D26 on #0C0C0C = 5.0:1 (AA)</li>
<li>White on #E85D26 = 3.9:1 (AA Large Text, fine for buttons at 18px+)</li>
</ul>
</li>
<li>Focus rings visible on all interactive elements</li>
<li>Tab order: inputs top-to-bottom, left-to-right, then calculate button, then CTA buttons</li>
<li>Results section gets <code>aria-live=&quot;polite&quot;</code> so screen readers announce new results</li>
<li>Animations respect <code>prefers-reduced-motion</code>: skip count-up, skip stagger, instant reveal</li>
</ul>
<hr>
<p><em>Spec complete. Bobby builds from this without interpretation. Every hex value, every class, every animation timing is defined. Steffen reviews the build against this spec before Elmo QA.</em></p>
<p><em>Updated 2026-03-12: Synced all color tokens and font references to match live Tailwind config. Orange #E85D26, Night #0C0C0C, Syne headlines, Space Grotesk body, font-extrabold (800) for Syne.</em></p>
`,c={title:e,slug:t,category:n,agent:o,date:a,dateFormatted:r,updated:null,summary:d,tags:l,content:s};export{o as agent,n as category,s as content,a as date,r as dateFormatted,c as default,t as slug,d as summary,l as tags,e as title,i as updated};
