const t="Ambition Website Rebuild Spec",n="ambition-rebuild-spec",e="Design Specs",d="Steffen",o="2026-03-09",r="Mar 9",s=null,l="Full rebuild specification for the Ambition Mechanical website.",i=[],a=`<h1>Ambition Mechanical Website Rebuild Spec</h1>
<p><strong>For:</strong> Bobby (web dev agent)
<strong>Repo:</strong> <code>github.com/mrg33k/AMBITION</code> / <code>/Users/patrik/Documents/Dev/AMBITION</code>
<strong>Source of truth:</strong> AOM Studio brand page (<code>AmbitionBrandGuidelines.jsx</code>)
<strong>Date:</strong> 2026-03-09</p>
<p>This is everything you need to rebuild the Ambition Mechanical site. Every value is explicit. Do not guess.</p>
<hr>
<h2>1. Google Fonts</h2>
<p>Load these two fonts. No others.</p>
<pre><code class="language-html">&lt;link href=&quot;https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&amp;family=Inter:wght@300;400;500;600;700;800;900&amp;display=swap&quot; rel=&quot;stylesheet&quot;&gt;
</code></pre>
<hr>
<h2>2. Tailwind Config</h2>
<p>Drop this into <code>tailwind.config.js</code> under <code>extend</code>:</p>
<pre><code class="language-js">colors: {
  navy: {
    950: &#39;#070b1e&#39;,
    900: &#39;#0a0e2a&#39;,
    800: &#39;#111638&#39;,
    700: &#39;#1a1f45&#39;,
    600: &#39;#1a237e&#39;,
    500: &#39;#283593&#39;,
    400: &#39;#3949ab&#39;,
    300: &#39;#5c6bc0&#39;,
  },
  red: {
    700: &#39;#991b1b&#39;,
    600: &#39;#b91c1c&#39;,
    500: &#39;#dc2626&#39;,
    400: &#39;#ef4444&#39;,
    300: &#39;#f87171&#39;,
  },
  flame: {
    500: &#39;#ea580c&#39;,
    400: &#39;#f97316&#39;,
  },
},
fontFamily: {
  display: [&#39;Barlow Condensed&#39;, &#39;sans-serif&#39;],
  body: [&#39;Inter&#39;, &#39;system-ui&#39;, &#39;sans-serif&#39;],
},
</code></pre>
<p>Also keep the default Tailwind neutral scale. The brand uses these neutrals:</p>
<ul>
<li><code>neutral-950</code>: #0a0a0a</li>
<li><code>neutral-900</code>: #111111</li>
<li><code>neutral-800</code>: #1a1a1a</li>
<li><code>neutral-700</code>: #374151</li>
<li><code>neutral-600</code>: #4b5563</li>
<li><code>neutral-500</code>: #6b7280</li>
<li><code>neutral-400</code>: #9ca3af</li>
<li><code>neutral-300</code>: #d1d5db</li>
<li><code>neutral-200</code>: #e5e7eb</li>
<li><code>neutral-100</code>: #f3f4f6</li>
<li><code>neutral-50</code>: #f8fafc</li>
</ul>
<hr>
<h2>3. Color System</h2>
<h3>Primary: Navy Blue</h3>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>navy-600</td>
<td>#1a237e</td>
<td>Primary brand. Logo core, hero BG, nav, footer, headlines on light BG</td>
</tr>
<tr>
<td>navy-900</td>
<td>#0a0e2a</td>
<td>Deep background. Dark hero sections, dark panels, overlays</td>
</tr>
<tr>
<td>navy-500</td>
<td>#283593</td>
<td>Secondary panels, active states, section BGs</td>
</tr>
<tr>
<td>navy-400</td>
<td>#3949ab</td>
<td>Hover states, links, button hover on dark BGs</td>
</tr>
<tr>
<td>navy-950</td>
<td>#070b1e</td>
<td>Deepest dark. Hero sections, full-bleed dark panels</td>
</tr>
<tr>
<td>navy-800</td>
<td>#111638</td>
<td>Dark cards and panels on dark BGs</td>
</tr>
<tr>
<td>navy-700</td>
<td>#1a1f45</td>
<td>Inputs, elevated panels, modals on dark</td>
</tr>
</tbody></table>
<h3>Accent: Red</h3>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>red-500</td>
<td>#dc2626</td>
<td>ALL CTA buttons, flame elements, urgent indicators, headline accents</td>
</tr>
<tr>
<td>red-400</td>
<td>#ef4444</td>
<td>Button hover states, gradient endpoints</td>
</tr>
<tr>
<td>red-600</td>
<td>#b91c1c</td>
<td>Pressed/active button states</td>
</tr>
<tr>
<td>flame-500</td>
<td>#ea580c</td>
<td>Gradient bridge from red to warmth. Sparingly.</td>
</tr>
</tbody></table>
<h3>Light Surfaces</h3>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>white</td>
<td>#ffffff</td>
<td>Main content section BGs, cards on dark, logo text</td>
</tr>
<tr>
<td>neutral-50</td>
<td>#f8fafc</td>
<td>Alternating light section BGs</td>
</tr>
<tr>
<td>neutral-100</td>
<td>#f3f4f6</td>
<td>Cards, input BGs, subtle surfaces</td>
</tr>
<tr>
<td>neutral-200</td>
<td>#e5e7eb</td>
<td>Card borders, dividers, input borders on light</td>
</tr>
</tbody></table>
<h3>Text Colors</h3>
<table>
<thead>
<tr>
<th>Color</th>
<th>Hex</th>
<th>Context</th>
</tr>
</thead>
<tbody><tr>
<td>White</td>
<td>#ffffff</td>
<td>Headlines on dark BGs</td>
</tr>
<tr>
<td>Navy</td>
<td>#1a237e</td>
<td>Headlines on light BGs. PRIMARY heading color on white/off-white</td>
</tr>
<tr>
<td>Steel</td>
<td>#374151</td>
<td>Body text on light BGs</td>
</tr>
<tr>
<td>Gray</td>
<td>#6b7280</td>
<td>Captions, kickers, muted text, timestamps</td>
</tr>
<tr>
<td>Light Gray</td>
<td>#d1d5db</td>
<td>Body text on dark BGs</td>
</tr>
<tr>
<td>Muted</td>
<td>#9ca3af</td>
<td>Secondary info on dark BGs</td>
</tr>
</tbody></table>
<h3>Color Rules (non-negotiable)</h3>
<ol>
<li>Navy is the primary brand color. When in doubt, use navy.</li>
<li>Red is for action only. CTA buttons, accent lines, dividers. Never decorative.</li>
<li>White/light BGs get navy headlines (#1a237e), steel body text (#374151). Never pure black.</li>
<li>Dark sections get white headlines, neutral-300 body text (#d1d5db).</li>
<li>Alternate light/dark sections for rhythm.</li>
<li>No sky blue (#0ea5e9). No pure black (#0a0a0a) as section BG. Navy replaces both.</li>
</ol>
<h3>Overall Color Ratio</h3>
<ul>
<li>35% White</li>
<li>35% Navy</li>
<li>15% Red</li>
<li>15% Gray</li>
</ul>
<hr>
<h2>4. Typography</h2>
<h3>Type Scale</h3>
<table>
<thead>
<tr>
<th>Role</th>
<th>Font</th>
<th>Weight</th>
<th>Size</th>
<th>Tracking</th>
<th>Line Height</th>
<th>Transform</th>
</tr>
</thead>
<tbody><tr>
<td>Display / Hero</td>
<td>Barlow Condensed</td>
<td>800 (ExtraBold)</td>
<td>clamp(3rem, 8vw, 6rem)</td>
<td>0.04em</td>
<td>0.92</td>
<td>uppercase</td>
</tr>
<tr>
<td>H1 / Section Title</td>
<td>Barlow Condensed</td>
<td>700 (Bold)</td>
<td>clamp(2.5rem, 5vw, 4rem)</td>
<td>0.03em</td>
<td>1.0</td>
<td>uppercase</td>
</tr>
<tr>
<td>H2 / Sub-section</td>
<td>Barlow Condensed</td>
<td>600 (SemiBold)</td>
<td>clamp(1.75rem, 3.5vw, 2.5rem)</td>
<td>0.02em</td>
<td>1.1</td>
<td>uppercase</td>
</tr>
<tr>
<td>H3 / Card Title</td>
<td>Barlow Condensed</td>
<td>600 (SemiBold)</td>
<td>24-28px</td>
<td>0.02em</td>
<td>1.2</td>
<td>uppercase or sentence</td>
</tr>
<tr>
<td>Body Large</td>
<td>Inter</td>
<td>400 (Regular)</td>
<td>18px / 1.125rem</td>
<td>normal</td>
<td>1.65</td>
<td>sentence</td>
</tr>
<tr>
<td>Body</td>
<td>Inter</td>
<td>400 (Regular)</td>
<td>15-16px / 1rem</td>
<td>normal</td>
<td>1.65</td>
<td>sentence</td>
</tr>
<tr>
<td>Body Small</td>
<td>Inter</td>
<td>400 (Regular)</td>
<td>13-14px / 0.875rem</td>
<td>0.01em</td>
<td>1.6</td>
<td>sentence</td>
</tr>
<tr>
<td>Labels / Kickers</td>
<td>Barlow Condensed</td>
<td>600 (SemiBold)</td>
<td>11-12px</td>
<td>0.2em</td>
<td>1.2</td>
<td>uppercase</td>
</tr>
<tr>
<td>Nav Links</td>
<td>Inter</td>
<td>500 (Medium)</td>
<td>14-15px / 0.875rem</td>
<td>0.02em</td>
<td>1.4</td>
<td>sentence</td>
</tr>
<tr>
<td>Buttons</td>
<td>Barlow Condensed</td>
<td>600-700</td>
<td>14-16px</td>
<td>0.08em</td>
<td>1.2</td>
<td>uppercase</td>
</tr>
</tbody></table>
<h3>Typography Rules</h3>
<ul>
<li>All headlines use Barlow Condensed, uppercase, tight tracking</li>
<li>Body text max width: 640px (<code>max-w-prose</code> or <code>max-w-xl</code>)</li>
<li>Kickers are always: Barlow Condensed 600, 11px, tracking 0.2em, red-500, uppercase</li>
<li>Every kicker gets a 2px red line below it (<code>w-8 h-[2px] bg-red-500</code>)</li>
</ul>
<hr>
<h2>5. Button System</h2>
<h3>Primary CTA (Red)</h3>
<ul>
<li>Classes: <code>bg-red-500 text-white font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg</code></li>
<li>Hover: <code>bg-red-400</code>, <code>shadow-[0_8px_24px_rgba(220,38,38,0.3)]</code>, <code>-translate-y-0.5</code></li>
<li>Active: <code>bg-red-600</code>, <code>translate-y-0</code></li>
</ul>
<h3>Secondary CTA (Navy Outline)</h3>
<ul>
<li>Classes: <code>border-2 border-navy-600 text-navy-600 font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg</code></li>
<li>Hover: <code>bg-navy-600 text-white</code></li>
<li>Active: <code>bg-navy-800</code></li>
</ul>
<h3>Ghost / Link</h3>
<ul>
<li>Classes: <code>text-navy-600 font-medium underline-offset-4 hover:underline</code> (light) / <code>text-neutral-300</code> (dark)</li>
<li>Hover: <code>text-red-500</code></li>
<li>Active: <code>text-red-600</code></li>
</ul>
<h3>Dark CTA (For Dark BGs)</h3>
<ul>
<li>Classes: <code>bg-white/10 backdrop-blur-sm border border-white/20 text-white font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg</code></li>
<li>Hover: <code>bg-red-500 border-red-500 shadow-[0_8px_24px_rgba(220,38,38,0.25)]</code></li>
<li>Active: <code>bg-red-600</code></li>
</ul>
<h3>Button Rules</h3>
<ul>
<li>Radius: <code>rounded-lg</code> (8px). NOT pill-shaped.</li>
<li>Primary CTAs always Barlow Condensed uppercase.</li>
<li>Smaller nav CTA variant: <code>px-6 py-2.5</code></li>
</ul>
<hr>
<h2>6. Component Specs</h2>
<h3>Navigation Bar</h3>
<ul>
<li>Fixed top. Transparent over hero, solidifies on scroll.</li>
<li>Height: 72px (desktop), 64px (mobile)</li>
<li>BG: <code>transparent</code> -&gt; <code>navy-900/95 backdrop-blur-xl</code> on scroll</li>
<li>Border: none -&gt; <code>border-b border-white/10</code> on scroll</li>
<li>Logo: existing badge/seal mark, max-height 40px, left aligned</li>
<li>Nav links: Inter Medium 14px, tracking 0.02em, white/80, hover white. Center aligned.</li>
<li>CTA: Primary button (red), smaller variant (px-6 py-2.5). Right aligned.</li>
<li>Mobile: hamburger menu, slide-in drawer from right, navy-900 BG</li>
<li>Transition: all 400ms ease</li>
</ul>
<h3>Hero Section</h3>
<ul>
<li>Height: 100vh (min 600px)</li>
<li>BG: <code>linear-gradient(160deg, navy-950 0%, navy-800 50%, navy-900 100%)</code></li>
<li>Pattern overlay: snowflake geometry at 5-8% opacity, positioned top-right</li>
<li>Headline: Barlow Condensed 800, white, clamp(3rem, 8vw, 6rem)</li>
<li>Subheading: Inter Regular 18px, neutral-300, max-w-xl</li>
<li>CTA group: Primary (red) + Secondary (white outline), gap-4</li>
<li>Stats row below CTAs: flex gap-8, stat values white font-bold, labels neutral-400 uppercase 11px</li>
<li>Padding: pt-32 pb-20 (clears fixed nav)</li>
</ul>
<h3>Content Section (Light)</h3>
<ul>
<li>BG: white or neutral-50 (alternate between them)</li>
<li>Container: <code>max-w-7xl mx-auto px-6 lg:px-8</code></li>
<li>Padding: <code>py-20 md:py-28</code></li>
<li>Kicker: Barlow Condensed 600, 11px, tracking 0.2em, red-500, uppercase</li>
<li>Headline: Barlow Condensed 700, navy-600, clamp(1.75rem, 5vw, 3rem), uppercase</li>
<li>Body: Inter Regular 16px, neutral-700, leading-relaxed, max-w-prose</li>
<li>Section divider: 2px red line, w-12, placed below kicker</li>
</ul>
<h3>Content Section (Dark)</h3>
<ul>
<li>BG: navy-900 or navy-800</li>
<li>Same container/padding as light sections</li>
<li>Headline: Barlow Condensed 700, white</li>
<li>Body: Inter Regular 16px, neutral-300</li>
<li>Accent elements: red-500 lines, dots, CTA buttons</li>
<li>Optional: snowflake or hex grid pattern at 3-5% opacity</li>
</ul>
<h3>Service Card</h3>
<p><strong>Light variant:</strong></p>
<ul>
<li><code>bg-white border border-neutral-200 rounded-xl shadow-sm</code></li>
<li>Padding: <code>p-8</code></li>
<li>Icon area: 48x48, navy-600 BG with white icon</li>
<li>Title: Barlow Condensed 600, 20-24px, navy-600</li>
<li>Body: Inter Regular 14px, neutral-500</li>
<li>Hover: <code>-translate-y-1 shadow-lg</code></li>
<li>Transition: all 300ms ease</li>
</ul>
<p><strong>Dark variant:</strong></p>
<ul>
<li><code>bg-navy-800 border border-navy-600/30 rounded-xl</code></li>
<li>Icon area: 48x48, red-500/10 BG with red icon</li>
<li>Title: Barlow Condensed 600, 20-24px, white</li>
<li>Body: Inter Regular 14px, neutral-400</li>
<li>Hover: <code>border-white/20</code></li>
</ul>
<h3>Stat Bar</h3>
<ul>
<li>Layout: <code>flex justify-around max-w-4xl mx-auto</code></li>
<li>Stat value: Barlow Condensed 700, 36-48px, white (dark) or navy-600 (light)</li>
<li>Stat label: Inter Medium 11px, uppercase, tracking 0.15em, neutral-400 (dark) or neutral-500 (light)</li>
<li>Dividers: 1px vertical lines, neutral-700 (dark) or neutral-200 (light)</li>
<li>Mobile: 2-col grid, gap-6</li>
</ul>
<h3>Contact Form</h3>
<ul>
<li>BG: white or neutral-50</li>
<li>Input: <code>h-12 rounded-lg border border-neutral-200 bg-neutral-100 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20</code></li>
<li>Label: Inter Medium 13px, neutral-700</li>
<li>Submit: Primary CTA button, full-width on mobile</li>
<li>Helper text: Inter Regular 12px, neutral-500</li>
<li>Error: <code>border-red-500 text-red-500</code></li>
</ul>
<h3>Footer</h3>
<ul>
<li>BG: navy-950</li>
<li>Top border: 3px gradient from-red-500 to-transparent</li>
<li>Logo: badge/seal mark, max-h-12</li>
<li>Nav columns: Inter Medium 14px, neutral-400, hover white</li>
<li>Contact: phone, email, address in neutral-300</li>
<li>Credential: &quot;Licensed ROC #320923&quot; in Barlow Condensed 600, 10px, tracking 0.2em, neutral-500</li>
<li>Copyright: Inter Regular 12px, neutral-600</li>
<li>Padding: py-16</li>
</ul>
<hr>
<h2>7. Spacing System</h2>
<table>
<thead>
<tr>
<th>Context</th>
<th>Value</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Container</td>
<td><code>max-w-7xl mx-auto px-4 sm:px-6 lg:px-8</code></td>
<td>1280px max width. All content sections.</td>
</tr>
<tr>
<td>Section (light)</td>
<td><code>py-20 md:py-28</code></td>
<td>Generous vertical padding</td>
</tr>
<tr>
<td>Section (dark)</td>
<td><code>py-16 md:py-24</code></td>
<td>Slightly tighter (dark feels heavier)</td>
</tr>
<tr>
<td>Hero padding</td>
<td><code>pt-32 pb-20 md:pt-40 md:pb-24</code></td>
<td>Extra top to clear fixed nav</td>
</tr>
<tr>
<td>Card padding</td>
<td><code>p-6 md:p-8</code></td>
<td>Internal card spacing</td>
</tr>
<tr>
<td>Card radius</td>
<td><code>rounded-xl</code> (12px)</td>
<td>All cards and panels</td>
</tr>
<tr>
<td>Button radius</td>
<td><code>rounded-lg</code> (8px)</td>
<td>All buttons and inputs</td>
</tr>
<tr>
<td>Gap (card grid)</td>
<td><code>gap-6 md:gap-8</code></td>
<td>Grid gap between cards</td>
</tr>
<tr>
<td>Gap (section content)</td>
<td><code>gap-12 md:gap-16</code></td>
<td>Between major content blocks</td>
</tr>
<tr>
<td>Heading gap</td>
<td><code>mb-12</code></td>
<td>Space between section header and content</td>
</tr>
</tbody></table>
<hr>
<h2>8. Responsive Breakpoints</h2>
<table>
<thead>
<tr>
<th>Name</th>
<th>Range</th>
<th>Grid Cols</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Mobile</td>
<td>&lt; 640px</td>
<td>1</td>
<td>Single column. Stacked. Hamburger nav. Full-width CTAs. Hero headline clamps to 3rem.</td>
</tr>
<tr>
<td>Tablet</td>
<td>640-1024px</td>
<td>2</td>
<td>Two-column grids. Side-by-side CTAs. Nav links visible. Hero headline clamps to 4.5rem.</td>
</tr>
<tr>
<td>Desktop</td>
<td>1024-1280px</td>
<td>3</td>
<td>Three-column card grids. Full nav. max-w-7xl kicks in.</td>
</tr>
<tr>
<td>Wide</td>
<td>&gt; 1280px</td>
<td>3-4</td>
<td>Content centered in max-w-7xl. Extra whitespace on sides.</td>
</tr>
</tbody></table>
<hr>
<h2>9. Homepage Section-by-Section Layout</h2>
<p>Build top to bottom in this exact order.</p>
<h3>Section 1: Navigation</h3>
<ul>
<li><strong>BG:</strong> transparent -&gt; navy-900/95 on scroll</li>
<li><strong>Pattern:</strong> Fixed top, transitions on scroll</li>
<li><strong>Content:</strong> Transparent over hero, solidifies to navy on scroll. Logo left, links center, red CTA right.</li>
</ul>
<h3>Section 2: Hero</h3>
<ul>
<li><strong>BG:</strong> navy-950 -&gt; navy-800 gradient (160deg)</li>
<li><strong>Pattern:</strong> Full viewport, snowflake pattern overlay at 5-8% opacity top-right</li>
<li><strong>Content:</strong> &quot;We Build The Systems That Keep Business Moving.&quot; Barlow 800 headline, Inter body, red CTA + white outline CTA. Stats row at bottom (500+ Projects, 23+ Years, 9 Markets, 24/7 Dispatch).</li>
</ul>
<h3>Section 3: Services</h3>
<ul>
<li><strong>BG:</strong> WHITE</li>
<li><strong>Pattern:</strong> Kicker + Headline + 3-col card grid</li>
<li><strong>Content:</strong> Light section. Service cards with icons. Clean, lots of white space. Navy headlines, steel body text.</li>
</ul>
<h3>Section 4: Stats / Social Proof</h3>
<ul>
<li><strong>BG:</strong> navy-900</li>
<li><strong>Pattern:</strong> Stat bar + client logos</li>
<li><strong>Content:</strong> Dark band. &quot;500+ Projects. 23+ Years. 9 Markets. 24/7 Dispatch.&quot; Client logo row below at white/40 opacity.</li>
</ul>
<h3>Section 5: About / Why Ambition</h3>
<ul>
<li><strong>BG:</strong> neutral-50 (off-white)</li>
<li><strong>Pattern:</strong> 2-col layout: copy left, photo right</li>
<li><strong>Content:</strong> Light section. Company story, values, differentiators. Photo of crew on job site. Navy headline, steel body.</li>
</ul>
<h3>Section 6: Projects / Portfolio</h3>
<ul>
<li><strong>BG:</strong> WHITE</li>
<li><strong>Pattern:</strong> Kicker + Headline + card grid</li>
<li><strong>Content:</strong> Project cards with images, category chips, brief descriptions. Cards have subtle shadow, hover lift.</li>
</ul>
<h3>Section 7: CTA Band</h3>
<ul>
<li><strong>BG:</strong> navy-800 with snowflake pattern at 5% opacity</li>
<li><strong>Pattern:</strong> Centered headline + CTA</li>
<li><strong>Content:</strong> &quot;Ready to solve your next HVAC challenge?&quot; Barlow headline, red CTA. Snowflake geometry behind.</li>
</ul>
<h3>Section 8: Testimonials</h3>
<ul>
<li><strong>BG:</strong> WHITE</li>
<li><strong>Pattern:</strong> Quote cards, 1-2 column</li>
<li><strong>Content:</strong> Client quotes with name, title, company. Navy quote marks. Clean cards on white.</li>
</ul>
<h3>Section 9: Contact</h3>
<ul>
<li><strong>BG:</strong> neutral-50</li>
<li><strong>Pattern:</strong> 2-col: form left, contact info right</li>
<li><strong>Content:</strong> Contact form with clean inputs. Right side: phone, email, address, map embed, credential badge.</li>
</ul>
<h3>Section 10: Footer</h3>
<ul>
<li><strong>BG:</strong> navy-950</li>
<li><strong>Pattern:</strong> 4-col layout</li>
<li><strong>Content:</strong> Logo + tagline | Quick links | Services | Contact info. Red gradient top border. Credential badges.</li>
</ul>
<hr>
<h2>10. Industrial Patterns</h2>
<p>Three brand patterns extracted from the OG logo. Used ONLY on dark backgrounds as subtle overlays.</p>
<h3>Snowflake Geometry</h3>
<ul>
<li>Six-fold symmetry from the logo&#39;s cooling element</li>
<li>Where: Hero background (top-right, offset), CTA sections</li>
<li>Opacity: 5-8%</li>
<li>Color: navy-500 (#283593) or white at low opacity</li>
</ul>
<h3>Heat Wave / Flame Motif</h3>
<ul>
<li>Radiating wave from the logo&#39;s flame elements</li>
<li>Where: Section dividers, accent backgrounds</li>
<li>Opacity: 3-5%</li>
<li>Color: red-500 (#dc2626)</li>
</ul>
<h3>Hexagonal Grid</h3>
<ul>
<li>Based on the snowflake&#39;s hexagonal symmetry</li>
<li>Where: Full-bleed background texture on dark sections</li>
<li>Opacity: 3-5%</li>
<li>Color: navy-500 (#283593)</li>
</ul>
<h3>Pattern Rules</h3>
<ul>
<li>NEVER use patterns on light/white backgrounds</li>
<li>Patterns are texture, not content. They should never compete with text.</li>
<li>Keep opacity low. If you can easily see the pattern, it&#39;s too strong.</li>
</ul>
<hr>
<h2>11. Animation / Motion</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Animation</th>
<th>Duration</th>
<th>Easing</th>
</tr>
</thead>
<tbody><tr>
<td>Scroll reveal</td>
<td>opacity 0-&gt;1, translateY(24px)-&gt;0</td>
<td>500ms</td>
<td>cubic-bezier(0.2, 0.65, 0.2, 1)</td>
</tr>
<tr>
<td>Scroll stagger</td>
<td>60ms per item, max 300ms</td>
<td>-</td>
<td>-</td>
</tr>
<tr>
<td>Scroll trigger</td>
<td>IntersectionObserver at 20% threshold</td>
<td>-</td>
<td>-</td>
</tr>
<tr>
<td>Card hover</td>
<td>-translate-y-1, shadow-lg</td>
<td>300ms</td>
<td>ease-out</td>
</tr>
<tr>
<td>Button hover</td>
<td>bg-color + shadow</td>
<td>200ms</td>
<td>ease</td>
</tr>
<tr>
<td>Primary CTA hover</td>
<td>optional -translate-y-0.5</td>
<td>200ms</td>
<td>ease</td>
</tr>
<tr>
<td>Nav scroll</td>
<td>transparent -&gt; navy-900/95 + backdrop-blur-xl</td>
<td>400ms</td>
<td>ease</td>
</tr>
<tr>
<td>Nav trigger</td>
<td>scroll &gt; 24px</td>
<td>-</td>
<td>-</td>
</tr>
<tr>
<td>Page transitions</td>
<td>opacity 0-&gt;1</td>
<td>300ms</td>
<td>ease</td>
</tr>
</tbody></table>
<p>No scale transforms on cards. No slide transitions between pages. Keep motion grounded and industrial.</p>
<hr>
<h2>12. Key Business Content</h2>
<p>These values go into the site (confirm with client first):</p>
<ul>
<li><strong>500+ projects completed</strong></li>
<li><strong>23+ years</strong> (established 2002)</li>
<li><strong>9 markets served</strong></li>
<li><strong>24/7 emergency dispatch</strong></li>
<li><strong>Phone:</strong> (480) 600-2942</li>
<li><strong>License:</strong> ROC #320923</li>
<li><strong>Tagline options:</strong> &quot;We Build The Systems That Keep Business Moving&quot; / &quot;Built on Precision, Driven by Integrity&quot;</li>
</ul>
<hr>
<h2>13. What NOT to Do</h2>
<ul>
<li>No sky blue. No pure black section backgrounds.</li>
<li>No pill-shaped buttons.</li>
<li>No exclamation marks in headlines.</li>
<li>No corporate filler (&quot;committed to excellence&quot;, &quot;second to none&quot;, &quot;best in class&quot;).</li>
<li>No warm/orange color grading on photos. Neutral to slightly cool.</li>
<li>No bouncy animations. Industrial means controlled.</li>
<li>No patterns on light backgrounds.</li>
<li>No body text wider than 640px.</li>
</ul>
`,c={title:t,slug:n,category:e,agent:d,date:o,dateFormatted:r,updated:null,summary:l,tags:i,content:a};export{d as agent,e as category,a as content,o as date,r as dateFormatted,c as default,n as slug,l as summary,i as tags,t as title,s as updated};
