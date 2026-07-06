const e="AOM Website v2 Brand Review",t="website-v2-brand-review",o="Design Specs",n="Steffen",r="2026-03-09",i="Mar 9",l=null,d="Brand review of v2 website direction addressing Patrik's feedback on kerning, monotony, portfolio.",a=[],s=`<h1>AOM Website v2 Brand Review</h1>
<blockquote>
<p>Steffen (Brand + Design) reviewing Alex (Strategy + Copy) | 2026-03-09
Chain: Alex -&gt; <strong>Steffen</strong> (this doc) -&gt; Bobby (build) -&gt; Elmer (QA)
Addresses Patrik&#39;s direct feedback: kerning, monotony, portfolio, hero video</p>
</blockquote>
<hr>
<h2>1. Copy Review (Alex&#39;s Proposed Changes)</h2>
<h3>1a. Hero Headline</h3>
<p><strong>Alex proposed:</strong> <code>WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE WITH MODIFICATION</p>
<p>The move away from &quot;BRAND INFRASTRUCTURE&quot; is correct. It was abstract and truncated on mobile. But Alex&#39;s version loses the cycling word, which is one of the strongest interactive elements on the site.</p>
<p><strong>Final copy:</strong></p>
<pre><code>WE MAKE COMPANIES
IMPOSSIBLE TO IGNORE.
</code></pre>
<p>No cycling word in the headline. It&#39;s cleaner. Seven words. Fits 375px. The cycling effect was doing too much work in the old version and will feel forced here. Let it retire.</p>
<p>If Patrik insists on keeping the cycling word, use Alex&#39;s alternative: <code>WE HELP COMPANIES BUILD. GROW. SHIP.</code> with the single cycling word. But the first option is stronger.</p>
<p>Bobby: Remove the <code>cycleWords</code> array and <code>useWordCycle</code> hook from <code>HeroSection.jsx</code>. Static headline.</p>
<hr>
<h3>1b. Hero Subhead</h3>
<p><strong>Alex proposed:</strong> <code>Content, websites, and systems built to help you build, grow, and ship.</code></p>
<p><strong>Steffen verdict:</strong> REJECT</p>
<p>This reads like a mission statement, not a hook. The repetition of &quot;build&quot; is clunky (&quot;systems built to help you build&quot;). The current subhead is the stronger line.</p>
<p><strong>Final copy:</strong></p>
<pre><code>We build the content, websites, and systems that make companies impossible to ignore.
</code></pre>
<p>Wait. If the headline IS &quot;impossible to ignore,&quot; the subhead can&#39;t echo it. New subhead:</p>
<p><strong>Final copy:</strong></p>
<pre><code>Content, websites, and systems for companies that build, grow, and ship.
</code></pre>
<p>Drops the &quot;built to help you&quot; construction. Cleaner. The three verbs carry the energy without redundancy.</p>
<p>Bobby: Update subhead in <code>HeroSection.jsx</code>.</p>
<hr>
<h3>1c. Pathway Gate (New Concept)</h3>
<p><strong>Alex proposed:</strong> Three clickable pathway cards below the hero headline.</p>
<p><strong>Steffen verdict:</strong> APPROVE CONCEPT, MODIFY EXECUTION</p>
<p>The segmentation is right. But three cards directly below the headline will create visual congestion on mobile and break the hero&#39;s breathing room.</p>
<p><strong>Design direction:</strong></p>
<ul>
<li>Desktop: three cards in a row, tucked at the bottom of the hero section (not below it). They should feel like part of the hero, not a new section.</li>
<li>Mobile: stack vertically but reduce padding. <code>p-4</code> not <code>p-8</code>. Total mobile height of the three cards should not exceed one screen.</li>
<li>Cards get a 2px top border: <code>border-t-2 border-aom-orange</code> for construction and brands, <code>border-t-2 border-aom-sage</code> for digital.</li>
<li>Background: <code>bg-aom-charcoal/60 backdrop-blur-sm</code> (frosted glass effect over the hero background). This differentiates them from the solid charcoal cards in other sections.</li>
<li>Icons: 24px, not the default 18px. The icon is the first thing the eye hits.</li>
</ul>
<p><strong>Copy modifications:</strong></p>
<ol>
<li>Construction: Alex&#39;s hook is good. Keep it.</li>
<li>Brands + Corporate: Change &quot;Video that closes deals, recruits talent, and tells your story.&quot; to <code>Video and content that tells your story and closes deals.</code> Less list-y.</li>
<li>Digital + Systems: Change &quot;Websites, workflows, and the infrastructure behind it all.&quot; to <code>Websites, workflows, and the systems that make it all run.</code> More active.</li>
</ol>
<p>Bobby: New component. <code>PathwayGate.jsx</code>. Render inside <code>HeroSection</code> at the bottom.</p>
<hr>
<h3>1d. Brands + Corporate Section (New)</h3>
<p><strong>Alex proposed:</strong> New section mirroring Construction Callout structure.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Copy approved as-is from Alex:</strong> Headline, proof points, Gio Osso quote. All on-brand.</p>
<p><strong>One modification:</strong> The proof card client. Alex suggested Virtu or United Food Bank. Use <strong>Virtu Hospitality Group</strong>. The Gio Osso quote is the strongest testimonial AOM has. Luxury hospitality reads as more premium than non-profit for a &quot;Brands + Corporate&quot; section.</p>
<p>Bobby: New component. <code>BrandsCallout.jsx</code>. Same structural bones as <code>ConstructionCallout.jsx</code>.</p>
<hr>
<h3>1e. Digital + Systems Section (New)</h3>
<p><strong>Alex proposed:</strong> New section with sage accent, absorbs current AITeaser.</p>
<p><strong>Steffen verdict:</strong> APPROVE WITH MODIFICATION</p>
<p>Alex&#39;s headline &quot;THE ENGINE BEHIND THE BRAND.&quot; is good but echoes the existing AITeaser headline &quot;THE SYSTEM BEHIND THE BRAND&quot; too closely. Since we&#39;re replacing AITeaser, not adding alongside it, this is fine. But tighten:</p>
<p><strong>Final headline:</strong> <code>THE ENGINE BEHIND THE BRAND.</code></p>
<p>Keep Alex&#39;s three proof point cards. The copy is on-brand. The proof card using Ambition Mechanical website is correct.</p>
<p><strong>Design note:</strong> This section uses sage throughout. But the waitlist form from the current AITeaser must survive. Keep it in the right column of this new section. Don&#39;t lose the form.</p>
<p>Bobby: Replace <code>AITeaser.jsx</code> with <code>DigitalSection.jsx</code>. Migrate waitlist form.</p>
<hr>
<h3>1f. Stats / Authority Section</h3>
<p><strong>Alex proposed:</strong> Headline from &quot;PHOENIX PRODUCTION / PROVEN SCALE.&quot; to &quot;THE WORK SPEAKS.&quot;</p>
<p><strong>Steffen verdict:</strong> APPROVED (previously reviewed in copy-brand-review.md)</p>
<p>All stat label changes, sidebar copy, micro-label changes remain approved. No new modifications.</p>
<hr>
<h3>1g. Portfolio Section</h3>
<p><strong>Alex proposed:</strong> Tabs from <code>marketing | builders</code> to <code>brands | construction | all</code>.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p>Subhead approved: <code>Real projects. Real clients. All of it shipped.</code></p>
<p><strong>One addition not in Alex&#39;s doc:</strong> The <code>all</code> tab should be the default on load. Visitors who don&#39;t know what they want get the broadest view first. The <code>brands</code> and <code>construction</code> tabs are for visitors who self-selected via the pathway gate or scrolled to a specific market section.</p>
<p>Bobby: Default <code>activeTab</code> to <code>&#39;all&#39;</code> in state. <code>all</code> tab shows combined and shuffled campaigns from <code>marketing</code> + <code>builders</code> + recategorized <code>founders</code> data.</p>
<hr>
<h3>1h. Engagement Ideas / Packages</h3>
<p>All Alex&#39;s renames approved in previous review. No new modifications.</p>
<hr>
<h3>1i. Trust / Why Us</h3>
<p>All Alex&#39;s rewrites approved in previous review. No new modifications.</p>
<hr>
<h3>1j. Footer</h3>
<p>All Alex&#39;s changes approved in previous review. No new modifications.</p>
<hr>
<h3>1k. Brief / Inquiry Form</h3>
<p>All Alex&#39;s changes approved in previous review. No new modifications.</p>
<hr>
<h3>1l. FAQ Section</h3>
<p>Alex&#39;s three new FAQs approved (with my FAQ #2 modification from copy-brand-review.md). Bobby still needs to wire up the FAQ section. It exists in data but isn&#39;t rendered.</p>
<hr>
<h2>2. Typography Audit</h2>
<p>Patrik&#39;s feedback: &quot;Text kerning is too tight in spots.&quot; Here&#39;s every problem and the fix.</p>
<h3>2a. Headlines: <code>tracking-tighter</code> Is Too Aggressive at Large Sizes</h3>
<p><strong>Problem:</strong> Every headline uses <code>tracking-tighter</code> (Tailwind: <code>letter-spacing: -0.05em</code>). At 72px+, this crushes letters together. &quot;INFRASTRUCTURE&quot; becomes a wall. &quot;PROVEN SCALE&quot; looks like one word. The italic black weight compounds this because italic glyphs naturally overlap more.</p>
<p><strong>Fix:</strong> Use a custom tracking value that&#39;s tight but not crushed.</p>
<pre><code class="language-css">/* Replace tracking-tighter on headlines */

/* Large headlines (text-5xl and above): */
letter-spacing: -0.025em;  /* Tailwind: tracking-[-0.025em] */

/* Medium headlines (text-3xl to text-4xl): */
letter-spacing: -0.02em;   /* Tailwind: tracking-[-0.02em] */

/* Small headlines (text-xl to text-2xl): */
letter-spacing: -0.015em;  /* Tailwind: tracking-[-0.015em] */
</code></pre>
<p><strong>Affected components and exact changes:</strong></p>
<table>
<thead>
<tr>
<th>File</th>
<th>Current</th>
<th>Change To</th>
</tr>
</thead>
<tbody><tr>
<td><code>HeroSection.jsx</code> line 58</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>ServicesGrid.jsx</code> line 88</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>ConstructionCallout.jsx</code> line 36</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>AITeaser.jsx</code> line 53</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> stats headline (line ~678)</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> portfolio headline (line ~693)</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> packages headline (line ~705)</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> trust headline (line ~716)</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> footer headline (line ~725)</td>
<td><code>tracking-tighter</code></td>
<td><code>tracking-[-0.025em]</code></td>
</tr>
</tbody></table>
<p>Bobby: Find-and-replace <code>tracking-tighter</code> on all headline elements (class containing <code>font-black italic uppercase</code>) with <code>tracking-[-0.025em]</code>. Do NOT change <code>tracking-tighter</code> on non-headline elements like the logo, nav items, or CTA buttons where tight tracking is intentional at smaller sizes.</p>
<hr>
<h3>2b. Micro-label Tracking Is Inconsistent</h3>
<p><strong>Problem:</strong> Micro-labels bounce between <code>tracking-[0.3em]</code>, <code>tracking-[0.35em]</code>, <code>tracking-[0.5em]</code>, and <code>tracking-widest</code>. This creates subtle inconsistency that reads as sloppy at a subconscious level.</p>
<p><strong>Fix:</strong> Standardize all micro-labels to <code>tracking-[0.3em]</code>.</p>
<table>
<thead>
<tr>
<th>File</th>
<th>Element</th>
<th>Current</th>
<th>Change To</th>
</tr>
</thead>
<tbody><tr>
<td><code>App.jsx</code> line ~677</td>
<td>Stats micro-label</td>
<td><code>tracking-[0.5em]</code></td>
<td><code>tracking-[0.3em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> line ~705</td>
<td>Packages micro-label</td>
<td><code>tracking-[0.5em]</code></td>
<td><code>tracking-[0.3em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> line ~715</td>
<td>Trust micro-label</td>
<td><code>tracking-[0.5em]</code></td>
<td><code>tracking-[0.3em]</code></td>
</tr>
<tr>
<td><code>App.jsx</code> VibeStat kicker</td>
<td><code>tracking-[0.35em]</code></td>
<td><code>tracking-[0.3em]</code></td>
<td></td>
</tr>
</tbody></table>
<p>Bobby: Normalize all <code>tracking-[0.5em]</code> and <code>tracking-[0.35em]</code> on mono micro-labels to <code>tracking-[0.3em]</code>.</p>
<hr>
<h3>2c. IdeaCard Statement Text Needs More Breathing Room</h3>
<p><strong>Problem:</strong> The <code>IdeaCard</code> component uses <code>text-xl md:text-2xl font-medium leading-snug</code> for the statement text. <code>leading-snug</code> (1.375) is too tight for italic quoted text at these sizes. The quotes feel cramped, especially multi-line statements.</p>
<p><strong>Fix:</strong></p>
<pre><code>leading-snug -&gt; leading-relaxed (1.625)
</code></pre>
<p>Bobby: <code>App.jsx</code> <code>IdeaCard</code> component, the <code>h3</code> element. Change <code>leading-snug</code> to <code>leading-relaxed</code>.</p>
<hr>
<h3>2d. Testimonial Card Quotes Are Too Heavy</h3>
<p><strong>Problem:</strong> Testimonial quotes use <code>font-headline font-black italic tracking-tight</code>. At <code>text-lg</code>, black weight italic is visually dominant enough to compete with section headlines. Quotes should feel like quotes, not like headlines.</p>
<p><strong>Fix:</strong></p>
<pre><code>font-headline font-black italic tracking-tight -&gt; font-headline font-bold italic tracking-[-0.015em]
</code></pre>
<p>Bobby: <code>TestimonialCard</code> component in <code>App.jsx</code>. Change the quote <code>p</code> element&#39;s classes.</p>
<hr>
<h3>2e. Font Size Hierarchy Gaps</h3>
<p><strong>Problem:</strong> The site jumps from 72px headlines to 16px body text with almost nothing in between. The subheadlines exist but they&#39;re <code>text-base</code> or <code>text-lg</code>, which doesn&#39;t create enough contrast against body text. The eye has nowhere to rest between the massive headline and the paragraph.</p>
<p><strong>Fix:</strong> Introduce a clear mid-tier heading size.</p>
<pre><code class="language-css">/* Section subheads should be: */
text-lg md:text-xl  /* Currently text-base, needs bump */
font-body            /* Inter 400, not headline font */
text-aom-stone       /* Secondary color, not warm-white */
leading-relaxed
</code></pre>
<p><strong>Affected:</strong></p>
<ul>
<li><code>HeroSection.jsx</code> subhead (line 78): Change <code>text-base md:text-lg</code> to <code>text-lg md:text-xl</code></li>
<li><code>ServicesGrid.jsx</code> subhead (line 91): Change <code>text-base</code> to <code>text-lg md:text-xl</code></li>
<li><code>AITeaser.jsx</code> subhead (line 56): Already <code>text-base md:text-lg</code>, change to <code>text-lg md:text-xl</code></li>
</ul>
<p>Bobby: Bump all section subheads one size up.</p>
<hr>
<h3>2f. FAQ Question Text Is Over-Styled</h3>
<p><strong>Problem:</strong> FAQ questions use <code>font-headline font-black italic uppercase tracking-tight text-lg</code>. This makes every question read like a section headline. In an FAQ, questions should feel scannable and conversational, not shouted.</p>
<p><strong>Fix:</strong></p>
<pre><code>font-headline font-black italic uppercase tracking-tight text-lg
-&gt;
font-headline font-bold uppercase tracking-[-0.015em] text-base
</code></pre>
<p>Drop the italic. Drop the black weight. Bring it down to bold. Questions are not headlines.</p>
<p>Bobby: <code>FAQItem</code> component in <code>App.jsx</code>. Update the question <code>span</code> classes.</p>
<hr>
<h2>3. Visual Monotony Fixes</h2>
<p>Patrik&#39;s feedback: &quot;Too much sameness. Words start to glaze over. Needs visual variety, texture changes, rhythm breaks.&quot;</p>
<p>He&#39;s right. Here&#39;s why it happens and how to fix it.</p>
<h3>3a. The Problem</h3>
<p>Every section follows the same pattern:</p>
<ol>
<li>Mono micro-label</li>
<li>Giant italic headline</li>
<li>Small body text</li>
<li>Grid of cards with identical charcoal backgrounds and identical borders</li>
</ol>
<p>The eye learns the pattern after the hero and then glazes through the rest. There&#39;s no surprise, no texture shift, no layout change. It&#39;s a metronome.</p>
<h3>3b. Background Color Alternation</h3>
<p><strong>Current:</strong> Every section is <code>bg-aom-night</code> (#0A0A08). The only exception is <code>AITeaser</code> which uses <code>bg-aom-surface</code> (#1A1A17). There&#39;s no visual distinction between sections.</p>
<p><strong>Fix:</strong> Alternate background colors to create rhythm.</p>
<table>
<thead>
<tr>
<th>Section</th>
<th>Current BG</th>
<th>New BG</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Hero</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-night</code></td>
<td>Keep. Darkest = most dramatic.</td>
</tr>
<tr>
<td>Services Grid</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-surface</code></td>
<td>Lift. Creates separation from hero.</td>
</tr>
<tr>
<td>Construction Callout</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-night</code></td>
<td>Keep dark. This section has the orange accent card which provides color.</td>
</tr>
<tr>
<td>Brands + Corporate (new)</td>
<td>n/a</td>
<td><code>bg-aom-surface</code></td>
<td>Alternate. Matches services grid tone.</td>
</tr>
<tr>
<td>Digital + Systems (new)</td>
<td><code>bg-aom-surface</code></td>
<td><code>bg-aom-night</code></td>
<td>Dark. Sage accents need the darkest canvas.</td>
</tr>
<tr>
<td>Stats / Authority</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-surface</code></td>
<td>Lift. The stat cards are charcoal on night, which is too similar. Surface gives them room.</td>
</tr>
<tr>
<td>Portfolio</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-night</code></td>
<td>Keep. Video thumbnails need the darkest background.</td>
</tr>
<tr>
<td>Packages</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-surface</code></td>
<td>Lift. Six cards need visual separation from the portfolio above.</td>
</tr>
<tr>
<td>Trust / Why Us</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-night</code></td>
<td>Keep. Four cards on dark feels premium.</td>
</tr>
<tr>
<td>FAQ (new render)</td>
<td>n/a</td>
<td><code>bg-aom-surface</code></td>
<td>Alternate.</td>
</tr>
<tr>
<td>Footer</td>
<td><code>bg-aom-night</code></td>
<td><code>bg-aom-night</code></td>
<td>Keep. Bookend the page with the same dark as the hero.</td>
</tr>
</tbody></table>
<p>Bobby: Update <code>className</code> on each section&#39;s root element. The difference between night (#0A0A08) and surface (#1A1A17) is subtle but real. It&#39;s felt, not seen. That&#39;s the point.</p>
<hr>
<h3>3c. Section Dividers Need Variety</h3>
<p><strong>Problem:</strong> Every section uses <code>border-t border-aom-border</code> as its divider. Same 1px line, same color, every time. The eye stops registering them.</p>
<p><strong>Fix:</strong> Three divider treatments, rotated throughout the page.</p>
<p><strong>Type A: Standard line.</strong> <code>border-t border-aom-border</code>. Use between sections that are the same background color.</p>
<p><strong>Type B: Accent line.</strong> A 48px-wide, 2px-tall orange bar, left-aligned. Already exists in <code>ServicesGrid</code> and <code>ConstructionCallout</code> as the accent line below micro-labels. Use this between major topic shifts (e.g., between the market sections and the portfolio).</p>
<pre><code class="language-html">&lt;div class=&quot;w-12 h-[2px] bg-aom-orange mx-6 md:mx-12&quot; /&gt;
</code></pre>
<p><strong>Type C: No divider.</strong> When the background color shifts (night to surface or vice versa), the color change IS the divider. No line needed.</p>
<p>Bobby: Remove <code>border-t border-aom-border</code> from sections where the background alternates. Add Type B dividers before Portfolio and before Footer CTA.</p>
<hr>
<h3>3d. Layout Structure Variation</h3>
<p><strong>Problem:</strong> Every section is centered content with the same max-width container. The eye gets trained to look at the same X-axis position.</p>
<p><strong>Fix:</strong> Introduce asymmetric layouts.</p>
<p><strong>Section layouts by type:</strong></p>
<ol>
<li><strong>Full-width header + grid below</strong> (current pattern, keep for: Services Grid, Packages, Trust)</li>
<li><strong>Split layout: content left, card right</strong> (current pattern, keep for: Construction Callout, Brands Callout, Digital Section)</li>
<li><strong>Centered statement</strong> (NEW, use for: a mid-page &quot;pull quote&quot; moment)</li>
<li><strong>Full-bleed gallery</strong> (current pattern, keep for: Portfolio)</li>
</ol>
<p><strong>New element: Pull Quote Break.</strong> Between the market sections and the portfolio, insert a full-width centered moment. One line, big type, no card.</p>
<pre><code class="language-html">&lt;section class=&quot;py-20 md:py-32 bg-aom-night&quot;&gt;
  &lt;div class=&quot;max-w-4xl mx-auto px-6 text-center&quot;&gt;
    &lt;p class=&quot;font-headline text-2xl md:text-4xl font-black italic uppercase tracking-[-0.025em] text-aom-warm-white leading-[0.95]&quot;&gt;
      If the asset doesn&#39;t move trust or attention, it&#39;s just expensive footage.
    &lt;/p&gt;
    &lt;p class=&quot;font-mono text-[10px] uppercase tracking-[0.3em] text-aom-stone-muted mt-6&quot;&gt;
      That&#39;s how we think about every project.
    &lt;/p&gt;
  &lt;/div&gt;
&lt;/section&gt;
</code></pre>
<p>This is AOM&#39;s strongest brand line (from the FAQ). Surfacing it as a standalone moment breaks the visual rhythm and lands the brand voice.</p>
<p>Bobby: New component. <code>PullQuote.jsx</code>. Insert between the last market section and the Stats section.</p>
<hr>
<h3>3e. Texture and Visual Depth</h3>
<p><strong>Problem:</strong> The noise overlay is global at <code>opacity-[0.03]</code>. It&#39;s there but invisible. The only visual texture is the orange gradient wash at <code>opacity-[0.02]</code>. Everything feels flat.</p>
<p><strong>Fixes:</strong></p>
<ol>
<li><p><strong>Increase noise opacity on alternating sections.</strong> Sections with <code>bg-aom-surface</code> get a local noise overlay at <code>opacity-[0.05]</code>. This makes them feel textured compared to the cleaner night sections.</p>
</li>
<li><p><strong>Add a gradient wash to the Brands + Corporate section.</strong> Same technique as the Construction Callout&#39;s orange wash, but use a warm amber/gold: <code>bg-gradient-to-b from-transparent via-amber-500/5 to-transparent opacity-[0.03]</code>. Differentiates it from the construction section&#39;s orange wash.</p>
</li>
<li><p><strong>Add depth to the Stats section.</strong> The stats cards currently float flat. Add a subtle radial gradient behind the grid: <code>bg-[radial-gradient(ellipse_at_center,_rgba(255,79,0,0.03)_0%,_transparent_70%)]</code>. Creates a subtle warm glow behind the numbers.</p>
</li>
</ol>
<p>Bobby: Add local texture overlays to specific sections. Keep the global noise overlay as-is. These are additive.</p>
<hr>
<h3>3f. Spacing Rhythm Changes</h3>
<p><strong>Problem:</strong> Every section uses <code>py-24 md:py-36</code> or <code>py-16 md:py-24</code>. Same vertical breathing room, every time. The monotony isn&#39;t just visual; it&#39;s spatial.</p>
<p><strong>Fix:</strong> Vary padding based on section weight.</p>
<table>
<thead>
<tr>
<th>Section</th>
<th>Current</th>
<th>New</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Hero</td>
<td><code>min-h-[70vh]</code></td>
<td><code>min-h-[85vh]</code></td>
<td>Hero needs to dominate. Give it more room.</td>
</tr>
<tr>
<td>Services Grid</td>
<td><code>py-16 md:py-24</code></td>
<td><code>py-20 md:py-32</code></td>
<td>Slightly more breathing room. First section after hero.</td>
</tr>
<tr>
<td>Construction Callout</td>
<td><code>py-16 md:py-24</code></td>
<td><code>py-16 md:py-24</code></td>
<td>Keep. Content-dense section doesn&#39;t need extra padding.</td>
</tr>
<tr>
<td>Brands + Corporate</td>
<td>n/a</td>
<td><code>py-16 md:py-24</code></td>
<td>Match construction.</td>
</tr>
<tr>
<td>Pull Quote</td>
<td>n/a</td>
<td><code>py-20 md:py-32</code></td>
<td>Generous. It&#39;s a breathing moment.</td>
</tr>
<tr>
<td>Stats</td>
<td><code>py-24 md:py-36</code></td>
<td><code>py-24 md:py-36</code></td>
<td>Keep. Already generous.</td>
</tr>
<tr>
<td>Portfolio</td>
<td><code>pt-24 pb-[200px]</code></td>
<td><code>py-24 md:py-36</code></td>
<td>Remove the 200px bottom padding. That&#39;s excessive.</td>
</tr>
<tr>
<td>Packages</td>
<td><code>py-24 md:py-36</code></td>
<td><code>py-20 md:py-28</code></td>
<td>Slightly tighter. Six cards create enough visual weight.</td>
</tr>
<tr>
<td>Trust</td>
<td><code>py-36</code></td>
<td><code>py-16 md:py-24</code></td>
<td>Tighter. Four small cards don&#39;t need 36 units of breathing room.</td>
</tr>
<tr>
<td>FAQ</td>
<td>n/a</td>
<td><code>py-16 md:py-24</code></td>
<td>Standard.</td>
</tr>
<tr>
<td>Footer</td>
<td><code>py-24 md:py-48</code></td>
<td><code>py-24 md:py-36</code></td>
<td>Reduce bottom padding. <code>pb-64</code> is wild. <code>pb-24</code> is enough.</td>
</tr>
</tbody></table>
<p>Bobby: Update <code>py-</code> values on section root elements.</p>
<hr>
<h2>4. Portfolio Design Direction</h2>
<p>Patrik&#39;s feedback: &quot;Portfolio section is neat but not impressive.&quot;</p>
<h3>4a. The Problem</h3>
<p>The portfolio is a horizontal scroll gallery of equally-sized video cards. Every card has the same dimensions, the same hover behavior, and the same visual weight. There&#39;s no hierarchy. The eye has no entry point. &quot;Neat&quot; is the right word for it, and that&#39;s not enough for a production company.</p>
<h3>4b. Featured Projects (Hero Tier)</h3>
<p>The top 3 projects per tab should be visually larger and treated as feature pieces.</p>
<p><strong>Design:</strong></p>
<ul>
<li>Featured project: full-width card, <code>aspect-[21/9]</code> (ultrawide), with a text overlay that includes client name, project type, and a one-line result metric.</li>
<li>Below the featured card: a 2-up or 3-up grid of the remaining projects at standard <code>aspect-video</code> size.</li>
</ul>
<p><strong>Featured project card structure:</strong></p>
<pre><code class="language-html">&lt;article class=&quot;relative aspect-[21/9] w-full overflow-hidden border border-aom-border rounded-sm group cursor-pointer&quot;&gt;
  &lt;!-- Video/image background --&gt;
  &lt;div class=&quot;absolute inset-0&quot;&gt;
    &lt;iframe ... class=&quot;w-full h-full opacity-70 grayscale-[0.2] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 scale-105 group-hover:scale-100&quot; /&gt;
  &lt;/div&gt;
  &lt;!-- Gradient overlay --&gt;
  &lt;div class=&quot;absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent&quot; /&gt;
  &lt;!-- Content overlay (left-aligned) --&gt;
  &lt;div class=&quot;absolute inset-0 flex items-end p-8 md:p-12&quot;&gt;
    &lt;div&gt;
      &lt;p class=&quot;font-mono text-[10px] uppercase tracking-[0.3em] text-aom-orange mb-2&quot;&gt;Cinematic Narrative&lt;/p&gt;
      &lt;h3 class=&quot;font-headline text-3xl md:text-5xl font-black italic uppercase tracking-[-0.025em] text-aom-warm-white leading-[0.9]&quot;&gt;Journey to Gary Vee&lt;/h3&gt;
      &lt;p class=&quot;text-aom-stone text-sm mt-3 max-w-md&quot;&gt;Full narrative film capturing the founder&#39;s journey from Phoenix to VeeCon.&lt;/p&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/article&gt;
</code></pre>
<p><strong>Key differences from current cards:</strong></p>
<ul>
<li>Text is left-aligned over a gradient, not bottom-centered</li>
<li>Gradient goes left-to-right (cinematic), not bottom-to-top</li>
<li>Scale animation reverses: starts at 105% and scales DOWN on hover (more cinematic, less &quot;button&quot;)</li>
<li>No tag badges on featured cards. The type and title do the work.</li>
</ul>
<p>Bobby: New component. <code>FeaturedProject.jsx</code>. First item in each tab is the featured project. Rest go into the grid below.</p>
<hr>
<h3>4c. Grid Projects (Standard Tier)</h3>
<p>Below the featured project, show remaining projects in a responsive grid instead of a horizontal scroll.</p>
<p><strong>Why grid over scroll:</strong> Horizontal scroll is great for social clips (9:16 content that benefits from a swipeable row). But for 16:9 campaign work, a grid is more respectful of the content. Each piece gets its own space. The eye can compare and browse.</p>
<p><strong>Grid layout:</strong></p>
<ul>
<li>Desktop: 3 columns, <code>gap-4</code></li>
<li>Tablet: 2 columns</li>
<li>Mobile: 1 column</li>
</ul>
<p><strong>Card design stays mostly the same</strong> but with two additions:</p>
<ol>
<li><strong>Hover: border shifts to orange with a subtle glow.</strong> Current behavior is good. Add <code>shadow-aom-orange/10</code> on hover for depth.</li>
<li><strong>Click anywhere to play.</strong> Current behavior. Keep it.</li>
</ol>
<hr>
<h3>4d. Social Clips Row</h3>
<p>Keep the horizontal scroll for social clips. This is the right format for 9:16 content.</p>
<p><strong>Changes:</strong></p>
<ul>
<li>Add a separator between campaigns grid and social row: a mono micro-label <code>Social Clips</code> with the sage dot indicator.</li>
<li>Reduce card width slightly: <code>w-[240px] md:w-[300px]</code> (down from <code>280px / 380px</code>). Social clips are snackable. Smaller cards reinforce that.</li>
</ul>
<hr>
<h3>4e. Tab Design</h3>
<p><strong>Current:</strong> Tabs are simple text buttons with a selected state (white bg, dark text). They work but they&#39;re small and feel like an afterthought.</p>
<p><strong>Fix:</strong></p>
<ul>
<li>Increase tab size: <code>px-6 md:px-12 py-3 md:py-5</code></li>
<li>Add a subtle bottom indicator on the active tab: <code>border-b-2 border-aom-orange</code> (instead of changing the entire background)</li>
<li>Active tab: <code>text-aom-warm-white border-b-2 border-aom-orange bg-transparent</code></li>
<li>Inactive tab: <code>text-aom-dim border-b-2 border-transparent hover:text-aom-stone</code></li>
</ul>
<p>This gives the tabs a more editorial feel. Less button-like, more navigation.</p>
<p>Bobby: Update tab button classes in <code>App.jsx</code> portfolio section.</p>
<hr>
<h3>4f. &quot;See All Work&quot; Expansion</h3>
<p>Alex proposed showing 6 campaigns per tab on load with a &quot;See all work&quot; expander. Agree.</p>
<p><strong>Design for the expander:</strong></p>
<pre><code class="language-html">&lt;button class=&quot;w-full py-6 border border-aom-border bg-aom-charcoal text-aom-stone font-headline font-bold uppercase tracking-[0.1em] text-sm hover:border-aom-orange/30 hover:text-aom-warm-white transition-all mt-8&quot;&gt;
  See All Work &lt;span class=&quot;text-aom-orange ml-2&quot;&gt;+&lt;/span&gt;
&lt;/button&gt;
</code></pre>
<p>Not a ghost link. A full-width bar that feels like part of the grid. Clicking it reveals the rest with a smooth height animation.</p>
<hr>
<h2>5. Hero Video Direction</h2>
<p>Patrik&#39;s feedback: &quot;I used to have a video back there to give it more life.&quot;</p>
<p>Alex&#39;s technical approach is solid. I&#39;ll add the design layer.</p>
<h3>5a. Visual Treatment</h3>
<p>The video should feel ambient, not like content. It&#39;s texture, not the main event.</p>
<p><strong>Overlay stack (bottom to top):</strong></p>
<ol>
<li><code>&lt;video&gt;</code> element, full-bleed, <code>object-cover</code></li>
<li>Dark overlay: <code>bg-black/65</code> (slightly heavier than Alex&#39;s 60% to protect text)</li>
<li>Gradient overlay: <code>bg-gradient-to-t from-aom-night via-transparent to-aom-night/40</code> (fades to the page color at bottom, prevents hard cut to next section)</li>
<li>The existing noise texture (already global)</li>
</ol>
<p><strong>Video behavior:</strong></p>
<ul>
<li>Starts with poster frame. Video loads after splash screen.</li>
<li>No crossfade between poster and video. Just a clean <code>opacity</code> transition from 0 to 1 when video is ready: <code>transition-opacity duration-1000</code>.</li>
<li>Video plays at 70% opacity. On hover, stays at 70%. It&#39;s background, not interactive.</li>
</ul>
<h3>5b. Content for the Reel</h3>
<p>Alex suggested 2-3 second cuts. Agree. Here&#39;s the shot list based on AOM&#39;s strongest visual moments:</p>
<ol>
<li><strong>Wide drone over construction site</strong> (Ambition / To Have and To Host) - 2s</li>
<li><strong>Interview setup, shallow DOF, subject mid-sentence</strong> (any corporate project) - 1.5s</li>
<li><strong>Hands on a timeline in editing software</strong> (behind the scenes) - 1.5s</li>
<li><strong>Food/product close-up, slow motion</strong> (Pretty Penny or PA&#39;LA) - 1.5s</li>
<li><strong>Event crowd energy, rack focus</strong> (Lagos or Ducor) - 1.5s</li>
</ol>
<p>Total: ~8 seconds. Loop seamlessly. No text overlays. No logo reveals. Just moving images.</p>
<p>Bobby: Add <code>&lt;video&gt;</code> element to <code>HeroSection.jsx</code>. Use <code>preload=&quot;none&quot;</code>, load after init. Patrik needs to export the reel file. Flag as a dependency.</p>
<hr>
<h2>6. Priority List for Bobby</h2>
<p>Ordered by impact. Do these in this order.</p>
<h3>P0: Ship This Week (Blockers for Launch)</h3>
<ol>
<li><p><strong>Typography: Fix tracking on all headlines</strong></p>
<ul>
<li>Find-replace <code>tracking-tighter</code> with <code>tracking-[-0.025em]</code> on all elements with <code>font-black italic uppercase</code></li>
<li>Files: <code>HeroSection.jsx</code>, <code>ServicesGrid.jsx</code>, <code>ConstructionCallout.jsx</code>, <code>AITeaser.jsx</code>, <code>App.jsx</code></li>
<li>Normalize micro-label tracking to <code>tracking-[0.3em]</code></li>
<li>Time: 30 min</li>
</ul>
</li>
<li><p><strong>Typography: Fix testimonial weight and FAQ styling</strong></p>
<ul>
<li>Testimonial quotes: <code>font-black</code> to <code>font-bold</code>, <code>tracking-tight</code> to <code>tracking-[-0.015em]</code></li>
<li>FAQ questions: drop italic, <code>font-black</code> to <code>font-bold</code>, <code>text-lg</code> to <code>text-base</code></li>
<li>Bump section subheads from <code>text-base</code> to <code>text-lg md:text-xl</code></li>
<li>IdeaCard statements: <code>leading-snug</code> to <code>leading-relaxed</code></li>
<li>Time: 20 min</li>
</ul>
</li>
<li><p><strong>Background alternation</strong></p>
<ul>
<li>Add <code>bg-aom-surface</code> to: Services Grid, Stats section, Packages section</li>
<li>Remove <code>border-t border-aom-border</code> where backgrounds alternate</li>
<li>Time: 15 min</li>
</ul>
</li>
<li><p><strong>Hero headline update</strong></p>
<ul>
<li>Static headline: <code>WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.</code></li>
<li>New subhead: <code>Content, websites, and systems for companies that build, grow, and ship.</code></li>
<li>Remove cycling word logic</li>
<li>Increase hero min-height to <code>min-h-[85vh]</code></li>
<li>Time: 20 min</li>
</ul>
</li>
<li><p><strong>Copy updates from approved reviews</strong></p>
<ul>
<li>All changes from <code>copy-brand-review.md</code> (engagement renames, stat labels, footer, form labels, trust values)</li>
<li>Time: 45 min</li>
</ul>
</li>
</ol>
<h3>P1: This Sprint (Before Next Patrik Review)</h3>
<ol start="6">
<li><p><strong>Portfolio restructure</strong></p>
<ul>
<li>New <code>FeaturedProject.jsx</code> component</li>
<li>Switch from horizontal scroll to grid for campaigns</li>
<li>Tab redesign (bottom indicator style)</li>
<li>Default to <code>all</code> tab</li>
<li>Add <code>all</code> tab that merges data</li>
<li>Recategorize <code>founders</code> data into <code>brands</code></li>
<li>Show 6 per tab + &quot;See All Work&quot; expander</li>
<li>Time: 3-4 hours</li>
</ul>
</li>
<li><p><strong>Pull Quote break component</strong></p>
<ul>
<li>New <code>PullQuote.jsx</code></li>
<li>Insert between last market section and Stats</li>
<li>Time: 30 min</li>
</ul>
</li>
<li><p><strong>FAQ section render</strong></p>
<ul>
<li>Wire up existing FAQ data + three new FAQs</li>
<li>Render below Trust section</li>
<li>Time: 1 hour</li>
</ul>
</li>
<li><p><strong>Spacing rhythm updates</strong></p>
<ul>
<li>Update <code>py-</code> values per the table in section 3f</li>
<li>Time: 20 min</li>
</ul>
</li>
</ol>
<h3>P2: Before Full Launch</h3>
<ol start="10">
<li><p><strong>Pathway Gate cards</strong></p>
<ul>
<li>New <code>PathwayGate.jsx</code> component</li>
<li>Three cards at bottom of hero</li>
<li>Frosted glass treatment</li>
<li>Time: 2 hours</li>
</ul>
</li>
<li><p><strong>Brands + Corporate section</strong></p>
<ul>
<li>New <code>BrandsCallout.jsx</code></li>
<li>Mirror Construction Callout structure</li>
<li>Time: 2 hours</li>
</ul>
</li>
<li><p><strong>Digital + Systems section (replace AITeaser)</strong></p>
<ul>
<li>New <code>DigitalSection.jsx</code></li>
<li>Migrate waitlist form</li>
<li>Time: 2-3 hours</li>
</ul>
</li>
<li><p><strong>Hero video background</strong></p>
<ul>
<li>BLOCKED: needs reel file from Patrik</li>
<li>Video element, overlay stack, poster frame, lazy load</li>
<li>Time: 2 hours (after assets received)</li>
</ul>
</li>
<li><p><strong>Texture and depth enhancements</strong></p>
<ul>
<li>Local noise overlays on surface sections</li>
<li>Gradient washes on Brands section</li>
<li>Radial gradient behind Stats grid</li>
<li>Time: 1 hour</li>
</ul>
</li>
<li><p><strong>Remove dead weight</strong></p>
<ul>
<li>Kill three.js import (162KB)</li>
<li>Reduce splash screen to 2s max or add click-to-skip</li>
<li>Time: 30 min</li>
</ul>
</li>
</ol>
<hr>
<h2>Summary</h2>
<p>Alex&#39;s strategy is right. The market segmentation, the copy cleanup, the portfolio restructure. All directionally correct. My modifications are about brand voice precision, typography spacing that Patrik can feel, and breaking the visual monotony that makes the current site glaze over.</p>
<p>The biggest design wins for Patrik:</p>
<ul>
<li><strong>Tracking fix</strong> will make the site feel immediately more polished (P0, 30 min)</li>
<li><strong>Background alternation</strong> breaks the monotony without touching layout (P0, 15 min)</li>
<li><strong>Portfolio featured projects</strong> transforms &quot;neat&quot; into impressive (P1, 3-4 hours)</li>
<li><strong>Pull quote break</strong> adds a brand moment that surprises the eye (P1, 30 min)</li>
</ul>
<p>Total estimated build time: ~16-18 hours across all priorities.</p>
<hr>
<p><em>This document is the final brand-approved direction. Bobby builds from this. Where this doc conflicts with Alex&#39;s direction doc, this version wins. Where this doc doesn&#39;t address something Alex proposed, Alex&#39;s version stands as approved.</em></p>
`,c={title:e,slug:t,category:o,agent:n,date:r,dateFormatted:i,updated:null,summary:d,tags:a,content:s};export{n as agent,o as category,s as content,r as date,i as dateFormatted,c as default,t as slug,d as summary,a as tags,e as title,l as updated};
