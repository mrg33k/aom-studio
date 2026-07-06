const e="Ambition Component Brand Review",o="ambition-component-brand-review",t="Design Specs",n="Steffen",r="2026-03-09",d="Mar 9",c=null,a="Component-level brand review for Ambition Mechanical website rebuild.",s=[],i=`<h1>Ambition Mechanical: Component Brand Review</h1>
<p><strong>From:</strong> Steffen (SS)
<strong>For:</strong> Bobby (web dev agent)
<strong>Date:</strong> 2026-03-09
<strong>Source of truth:</strong> <code>projects/steffen/ambition-brand-guidelines.md</code> + <code>projects/steffen/ambition-rebuild-spec.md</code></p>
<p>This review covers four components Patrik flagged as off-brand or missing features. Each section has the problem, the fix, and the exact values to use.</p>
<hr>
<h2>1. ContactDrawer.jsx</h2>
<p><strong>File:</strong> <code>/Users/patrik/Documents/Dev/AMBITION/src/components/ContactDrawer.jsx</code></p>
<h3>What&#39;s Off-Brand</h3>
<p>The drawer is dark-only with a glassmorphism aesthetic (translucent panels, glow effects, accent-500 red glows). Per the brand guidelines, the contact form should be on a <strong>light background</strong> (white or neutral-50) with navy headlines and clean inputs. The current drawer reads like a gaming UI, not an industrial mechanical contractor.</p>
<h3>Specific Issues</h3>
<ol>
<li><p><strong>Background:</strong> Uses <code>bg-navy-950/95 backdrop-blur-3xl</code> with decorative glow orbs (<code>bg-accent-500/20 blur-[100px]</code>, <code>bg-navy-500/20 blur-[100px]</code>). The glow orbs are not part of the brand system. Remove them.</p>
</li>
<li><p><strong>Header bar:</strong> <code>bg-navy-950/85</code> is acceptable for the header strip, but the close button uses <code>rounded-full border border-white/15 bg-navy-900/70</code>. Per the brand spec, buttons should be <code>rounded-lg</code> (8px), not pill/rounded-full.</p>
</li>
<li><p><strong>Input styling:</strong> Inputs use <code>bg-white/5 backdrop-blur-md rounded-xl</code> with red glow focus states (<code>shadow-[0_0_20px_rgba(220,38,38,0.22)]</code>). The brand spec says inputs should be: <code>h-12 rounded-lg border border-neutral-200 bg-neutral-100 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20</code>. The red glow focus is wrong. Focus states are <strong>navy</strong>, not red.</p>
</li>
<li><p><strong>Form card panels:</strong> Using <code>rounded-2xl border border-white/10 bg-white/[0.03]</code>. These transparent cards create the glassmorphism look. Replace with solid backgrounds: <code>rounded-xl bg-white border border-neutral-200</code> or <code>rounded-xl bg-neutral-50 border border-neutral-200</code> on light, or <code>rounded-xl bg-navy-800 border border-navy-600/30</code> if staying dark.</p>
</li>
<li><p><strong>Step progress bar:</strong> The red gradient progress bar (<code>from-red-500 via-red-400 to-red-500</code>) is acceptable since red = action. Keep it.</p>
</li>
<li><p><strong>Choice buttons (timeline, contact method):</strong> Using translucent styles (<code>border-white/15 bg-white/[0.03]</code>). Active state uses red glow. Per brand, choice chips on dark should use <code>border-navy-600/30 bg-navy-800</code> for inactive and <code>border-red-500/70 bg-red-500/20 text-white</code> for active. The active state is fine. Fix the inactive state.</p>
</li>
<li><p><strong>Labels:</strong> Using <code>text-xs uppercase tracking-[0.13em] text-gray-400</code>. Should be <code>text-[11px] font-display font-semibold uppercase tracking-[0.2em] text-neutral-400</code> (kicker style per spec). Labels should use Barlow Condensed, not the default font.</p>
</li>
<li><p><strong>Section headings:</strong> Using <code>font-display text-2xl font-bold uppercase tracking-[0.02em] text-white</code>. This is correct. Keep it.</p>
</li>
<li><p><strong>Continue button:</strong> Uses <code>border border-red-500/40 bg-red-500/20</code> (translucent red). Should be the solid <code>btn-primary</code> style: <code>bg-red-500 text-white font-display font-semibold uppercase tracking-[0.08em] rounded-lg</code>. A translucent red button has no precedent in the brand system.</p>
</li>
<li><p><strong>Submit button:</strong> The fancy gradient border animation (<code>bg-[linear-gradient(120deg,#dc2626_0%,#1a237e_45%,#dc2626_100%)]</code>) with inner navy fill is creative but not in the brand system. Replace with a standard <code>btn-primary</code> (solid red-500, hover red-400). Keep it simple.</p>
</li>
<li><p><strong>&quot;Fast Direct Line&quot; section:</strong> The phone CTA uses <code>border-accent-400/35 bg-accent-500/15</code>. This should use solid styling: <code>bg-red-500 text-white rounded-lg</code> for the primary phone CTA, matching the brand button system.</p>
</li>
<li><p><strong>Select dropdowns:</strong> Using <code>bg-white/5</code> translucent style. On dark backgrounds, use <code>bg-navy-700 border border-navy-600/30 text-white</code>. On light backgrounds, use <code>bg-neutral-100 border border-neutral-200 text-neutral-700</code>.</p>
</li>
</ol>
<h3>Steffen&#39;s Recommended Direction</h3>
<p>Two valid paths:</p>
<p><strong>Option A (Recommended): Keep it dark, lose the glass.</strong> The drawer slides over dark hero content, so a dark drawer makes visual sense. But swap all glassmorphism for solid navy surfaces. Background: <code>bg-navy-950</code>. Cards: <code>bg-navy-800 border border-navy-600/30 rounded-xl</code>. Inputs: <code>bg-navy-700 border border-navy-600/30 rounded-lg focus:border-navy-400 focus:ring-2 focus:ring-navy-400/20</code>. No glow orbs. No blur effects. No translucent anything.</p>
<p><strong>Option B: Light drawer.</strong> Background: <code>bg-white</code>. Cards: <code>bg-neutral-50 border border-neutral-200 rounded-xl</code>. Inputs per the contact form spec in the rebuild doc. Headlines: navy-600. Body: neutral-700.</p>
<p>Either works. The key is: <strong>no glassmorphism, no glow effects, no translucent panels.</strong> The brand is industrial and grounded, not futuristic.</p>
<h3>Color Token Cleanup</h3>
<p>The drawer uses legacy tokens that should be replaced:</p>
<ul>
<li><code>accent-500</code> / <code>accent-300</code> / <code>accent-400</code> -&gt; <code>red-500</code> / <code>red-300</code> / <code>red-400</code></li>
<li><code>bg-white/5</code>, <code>bg-white/[0.03]</code>, <code>bg-white/[0.04]</code> -&gt; solid navy-700 or navy-800</li>
<li><code>ring-white/10</code> -&gt; <code>border border-navy-600/30</code> (dark) or <code>border border-neutral-200</code> (light)</li>
<li><code>text-gray-100</code>, <code>text-gray-300</code>, <code>text-gray-400</code>, <code>text-gray-500</code> -&gt; use the brand text color tokens: <code>text-white</code>, <code>text-neutral-300</code>, <code>text-neutral-400</code>, <code>text-neutral-500</code></li>
</ul>
<hr>
<h2>2. RoleApplicationModal.jsx</h2>
<p><strong>File:</strong> <code>/Users/patrik/Documents/Dev/AMBITION/src/components/RoleApplicationModal.jsx</code></p>
<h3>What&#39;s Off-Brand</h3>
<p>Same glassmorphism problem as the drawer, but worse because this modal also uses <strong>legacy <code>dark-*</code> color tokens</strong> that aren&#39;t part of the v3 brand system. The modal overlay, card backgrounds, and form inputs all use <code>dark-950</code>, <code>dark-900</code>, <code>dark-800</code> tokens instead of the navy scale.</p>
<h3>Specific Issues</h3>
<ol>
<li><p><strong>Overlay:</strong> Uses <code>bg-dark-950/85 backdrop-blur-md</code>. Should be <code>bg-navy-950/85 backdrop-blur-sm</code> (or just <code>bg-black/60</code> for simplicity). The blur on the overlay is fine, but use the navy token.</p>
</li>
<li><p><strong>Modal container:</strong> Uses <code>rounded-3xl border border-white/20 bg-dark-900/85 backdrop-blur-xl</code>. Replace with: <code>rounded-xl border border-navy-600/30 bg-navy-900 shadow-[0_32px_90px_rgba(0,0,0,0.55)]</code>. Key changes: <code>rounded-xl</code> not <code>rounded-3xl</code> (brand uses xl, not 3xl), solid navy background (no transparency), remove backdrop-blur on the modal itself.</p>
</li>
<li><p><strong>Glow orbs:</strong> Same decorative glow blobs as the drawer (<code>bg-navy-500/30 blur-3xl</code>, <code>bg-accent-500/20 blur-3xl</code>). Remove both.</p>
</li>
<li><p><strong>Role detail card:</strong> Uses <code>rounded-2xl border border-white/15 bg-dark-950/55</code>. Should be <code>rounded-xl border border-navy-600/30 bg-navy-800</code>.</p>
</li>
<li><p><strong>Role title:</strong> Uses <code>text-2xl font-semibold text-white</code>. Per type spec, this is a card title and should use <code>font-display text-2xl font-semibold uppercase tracking-[0.02em] text-white</code> (add Barlow Condensed, uppercase, tracking).</p>
</li>
<li><p><strong>Tags/chips:</strong> The level chip uses <code>rounded-lg border border-red-500/30 bg-red-500/10</code>. Fine, but make it consistent with the brand: <code>rounded-lg border border-red-500/40 bg-red-500/15 text-red-300</code>. The location chip uses <code>rounded-full</code>. Should be <code>rounded-lg</code> per brand (no pill shapes).</p>
</li>
<li><p><strong>Form inputs:</strong> The form inputs on step 2 have NO styling classes at all. They&#39;re bare <code>&lt;input&gt;</code> and <code>&lt;textarea&gt;</code> elements relying on the @tailwindcss/forms plugin defaults. These need explicit brand styling. Add: <code>w-full h-12 rounded-lg border border-navy-600/30 bg-navy-700 px-4 text-white placeholder:text-neutral-500 focus:border-navy-400 focus:ring-2 focus:ring-navy-400/20 font-body text-base</code> for inputs, and similar for textarea (drop h-12, add py-3).</p>
</li>
<li><p><strong>Step indicator text:</strong> Uses <code>text-sm font-medium text-red-400</code>. Should be kicker style: <code>font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500</code>.</p>
</li>
<li><p><strong>Progress segments:</strong> Using <code>h-1.5 rounded-full</code>. Should be <code>h-1 rounded-full</code> to match the drawer&#39;s progress bar. Active color is fine (red gradient).</p>
</li>
<li><p><strong>Resume step card (step 3):</strong> Uses <code>border-accent-400/45 bg-accent-500/14</code>. Replace with <code>border-red-500/40 bg-red-500/10</code>. Replace <code>accent-*</code> tokens with <code>red-*</code> everywhere.</p>
</li>
<li><p><strong>Checkbox:</strong> Uses <code>bg-dark-800 text-accent-500 focus:ring-accent-500</code>. Replace with <code>bg-navy-700 text-red-500 focus:ring-red-500 border-navy-600</code>.</p>
</li>
<li><p><strong>Buttons:</strong> Uses <code>btn-shift</code> and <code>btn-dark-cta</code> which are properly defined in index.css. These are fine. No changes needed.</p>
</li>
</ol>
<h3>Summary of Changes</h3>
<ul>
<li>Replace all <code>dark-*</code> tokens with <code>navy-*</code> equivalents (<code>dark-950</code> -&gt; <code>navy-950</code>, <code>dark-900</code> -&gt; <code>navy-900</code>, <code>dark-800</code> -&gt; <code>navy-800</code>)</li>
<li>Replace all <code>accent-*</code> tokens with <code>red-*</code></li>
<li>Remove glow orbs</li>
<li>Remove backdrop-blur from modal container</li>
<li>Change <code>rounded-3xl</code> to <code>rounded-xl</code></li>
<li>Change <code>rounded-full</code> on chips to <code>rounded-lg</code></li>
<li>Add font-display + uppercase + tracking to the role title</li>
<li>Add explicit input styling (the bare inputs are the biggest issue)</li>
<li>Use kicker spec for small label text (font-display, 11px, tracking 0.2em)</li>
</ul>
<hr>
<h2>3. Projects Page + Stat Numbers: Count-Up Animations</h2>
<p><strong>Files:</strong></p>
<ul>
<li><code>/Users/patrik/Documents/Dev/AMBITION/src/pages/Projects.jsx</code></li>
<li><code>/Users/patrik/Documents/Dev/AMBITION/src/components/StatBar.jsx</code></li>
<li><code>/Users/patrik/Documents/Dev/AMBITION/src/components/Hero.jsx</code></li>
</ul>
<h3>Where Numbers Appear</h3>
<p>Stats show up in three places:</p>
<ol>
<li><strong>Hero.jsx</strong> (line 85-95): Stats row at the bottom of the hero. Values: <code>500+</code>, <code>23+</code>, <code>9</code>, <code>24/7</code>.</li>
<li><strong>StatBar.jsx</strong> (line 24-42): Standalone stat bar section. Same values: <code>500+</code>, <code>23+</code>, <code>9</code>, <code>24/7</code>.</li>
<li><strong>Projects page</strong> currently has no standalone stat display, but the StatBar component is likely rendered on the Home page between sections.</li>
</ol>
<h3>What Needs to Happen</h3>
<p>Add count-up animations to all numeric stat values. When the stat section scrolls into view, numbers should animate from 0 to their final value.</p>
<h3>Animation Spec</h3>
<ul>
<li><strong>Trigger:</strong> IntersectionObserver, fire when 20% of the stat section is visible (consistent with the existing scroll reveal spec in the rebuild doc)</li>
<li><strong>Duration:</strong> 1.5-2 seconds per number</li>
<li><strong>Easing:</strong> <code>cubic-bezier(0.2, 0.65, 0.2, 1)</code> (same ease as scroll reveals in the brand spec)</li>
<li><strong>Behavior:</strong><ul>
<li><code>500+</code> animates from 0 to 500, then the <code>+</code> appears</li>
<li><code>23+</code> animates from 0 to 23, then the <code>+</code> appears</li>
<li><code>9</code> animates from 0 to 9</li>
<li><code>24/7</code> does NOT animate (it&#39;s not a countable number). It can fade in or just appear.</li>
</ul>
</li>
<li><strong>Stagger:</strong> Each stat starts 100ms after the previous one (left to right)</li>
<li><strong>Run once:</strong> Only animate the first time the section scrolls into view. Don&#39;t re-trigger on scroll back.</li>
<li><strong>Number formatting:</strong> No decimals during animation. Integers only. The <code>+</code> suffix appears after the count completes.</li>
</ul>
<h3>Implementation Notes for Bobby</h3>
<ul>
<li>Use <code>useRef</code> + <code>IntersectionObserver</code> + <code>requestAnimationFrame</code> for the count. Or use <code>framer-motion</code>&#39;s <code>useInView</code> hook + <code>animate</code> since the project already imports framer-motion.</li>
<li>The count should feel smooth, not stepped. Ease the rate so it starts fast and decelerates toward the final number.</li>
<li>The stat value spans are currently in both <code>Hero.jsx</code> (line 88-89) and <code>StatBar.jsx</code> (line 34-35). Both need the animation.</li>
<li>Consider extracting a shared <code>AnimatedStat</code> component that both Hero and StatBar can use. Keep it DRY.</li>
<li>Do not add any additional visual effects (no color change during count, no scale bounce at the end). The animation should be subtle and controlled. Industrial, not playful.</li>
</ul>
<h3>What Steffen Wants to See</h3>
<p>The numbers feel alive when you land on the page instead of feeling like static text. That&#39;s the goal. Nothing fancy. Just movement that earns attention without demanding it.</p>
<hr>
<h2>4. Hero Video Background</h2>
<p><strong>File:</strong> <code>/Users/patrik/Documents/Dev/AMBITION/src/components/Hero.jsx</code></p>
<h3>Current State</h3>
<p>The hero currently uses a CSS gradient background:</p>
<pre><code>linear-gradient(160deg, #070b1e 0%, #111638 50%, #0a0e2a 100%)
</code></pre>
<p>Plus a snowflake pattern overlay at 6% opacity.</p>
<h3>What Patrik Wants</h3>
<p>A video playing in the hero background instead of (or behind) the gradient.</p>
<h3>The Video File</h3>
<p>There is a file specifically made for this purpose:</p>
<p><strong>Path:</strong> <code>/Users/patrik/Ahead of Market Dropbox/AOM/Client/Ambition Mechanical Services/VIDEO/_WEBSITE/Website Background.mov</code></p>
<table>
<thead>
<tr>
<th>Spec</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Duration</td>
<td>35 seconds</td>
</tr>
<tr>
<td>Resolution</td>
<td>1920x1080 (16:9)</td>
</tr>
<tr>
<td>Codec</td>
<td>H.264</td>
</tr>
<tr>
<td>FPS</td>
<td>24</td>
</tr>
<tr>
<td>File size</td>
<td>56.3 MB</td>
</tr>
<tr>
<td>Created</td>
<td>2025-08-27</td>
</tr>
<tr>
<td>Encoder</td>
<td>DaVinci Resolve</td>
</tr>
</tbody></table>
<p>This was explicitly created as a website hero background. It&#39;s a compilation reel of Ambition&#39;s best shots, designed to loop.</p>
<h3>Implementation Spec for Bobby</h3>
<h4>Step 1: Convert the video</h4>
<p>The .mov file is 56 MB. Way too large for a web hero. Bobby needs to:</p>
<ol>
<li>Convert to .mp4 (H.264) at a web-friendly bitrate. Target: 2-4 MB max.<ul>
<li>Use ffmpeg: <code>ffmpeg -i &quot;Website Background.mov&quot; -c:v libx264 -crf 28 -preset slow -vf &quot;scale=1920:1080&quot; -an -movflags +faststart hero-bg.mp4</code></li>
<li><code>-an</code> strips audio (background video should be silent)</li>
<li><code>-crf 28</code> balances quality and file size</li>
<li><code>-movflags +faststart</code> enables progressive loading</li>
</ul>
</li>
<li>Also generate a WebM version for browsers that prefer it: <code>ffmpeg -i &quot;Website Background.mov&quot; -c:v libvpx-vp9 -crf 35 -b:v 0 -vf &quot;scale=1920:1080&quot; -an hero-bg.webm</code></li>
<li>Generate a poster frame (first frame or a manually selected key frame): <code>ffmpeg -i &quot;Website Background.mov&quot; -vframes 1 -q:v 2 hero-poster.jpg</code></li>
<li>Place all three files in <code>/public/video/</code> (or <code>/public/assets/video/</code>)</li>
</ol>
<h4>Step 2: Update Hero.jsx</h4>
<p>Replace the static gradient div with a video element. Layer order (bottom to top):</p>
<ol>
<li><strong>Fallback gradient</strong> (keep the existing one as a fallback while video loads)</li>
<li><strong>Video element</strong> (autoplaying, muted, looping)</li>
<li><strong>Dark overlay</strong> to ensure text readability</li>
<li><strong>Snowflake pattern</strong> (keep at reduced opacity)</li>
<li><strong>Content</strong> (headline, subheading, CTAs, stats)</li>
</ol>
<h4>Video Element Spec</h4>
<pre><code>- Tag: &lt;video&gt;
- Attributes: autoPlay, muted, loop, playsInline, preload=&quot;auto&quot; (or &quot;metadata&quot; for slower connections)
- poster: hero-poster.jpg
- Sources: hero-bg.webm (first, for Chrome/Firefox) + hero-bg.mp4 (fallback)
- Positioning: absolute inset-0, object-cover, w-full h-full
- z-index: z-[1] (above fallback gradient, below overlay)
</code></pre>
<h4>Overlay Spec</h4>
<p>Add a dark overlay on top of the video so the white text stays readable:</p>
<ul>
<li><code>absolute inset-0 z-[2]</code></li>
<li>Background: <code>bg-navy-950/70</code> (70% opacity navy overlay)</li>
<li>This replaces the current standalone gradient div. The gradient still exists as fallback behind the video.</li>
</ul>
<p>The overlay opacity is critical. Too light and text is unreadable. Too dark and you can&#39;t see the video. Start at 70% and adjust. The goal is: you can tell there&#39;s a video playing, but the headline and stats read clearly without squinting.</p>
<h4>Snowflake Pattern</h4>
<p>Keep the snowflake overlay but bump its z-index above the video overlay:</p>
<ul>
<li><code>z-[3]</code> (above overlay)</li>
<li>Reduce opacity to <code>opacity-[0.04]</code> since the video adds visual complexity</li>
</ul>
<h4>Mobile Considerations</h4>
<ul>
<li>On mobile (&lt; 768px), consider <strong>not loading the video</strong> to save bandwidth. Use a static poster image instead. Add a media query or <code>useEffect</code> check.</li>
<li>The video is 16:9 but the hero is full-height. <code>object-cover</code> will crop the sides on portrait screens. This is fine for background video.</li>
<li>If the video autoplays on mobile (iOS requires muted + playsInline, which we have), great. If not, the poster image catches it.</li>
</ul>
<h4>Performance</h4>
<ul>
<li>The video should lazy-load or at least not block first paint. The fallback gradient shows instantly while the video loads.</li>
<li>Add <code>loading=&quot;lazy&quot;</code> equivalent behavior: the video can start loading immediately (it&#39;s above the fold), but the page should not wait for it to render the hero.</li>
<li>Consider adding <code>fetchpriority=&quot;low&quot;</code> on the video&#39;s source to prioritize text content first.</li>
</ul>
<h3>What Steffen Wants to See</h3>
<p>The hero should feel like walking into Ambition&#39;s world. The gradient is fine as a placeholder, but real footage of their work playing behind the headline makes this feel like a company that actually does things. The video shouldn&#39;t overwhelm the content. It&#39;s wallpaper, not the focal point. The headline and CTA are still the main event.</p>
<hr>
<h2>Additional Notes</h2>
<h3>Projects Page (Projects.jsx) Background Color</h3>
<p>The Projects page uses <code>bg-dark-950</code> and <code>bg-dark-900</code> on its sections. These are legacy tokens. Replace with:</p>
<ul>
<li><code>bg-dark-950</code> -&gt; <code>bg-navy-950</code></li>
<li><code>bg-dark-900</code> -&gt; <code>bg-navy-900</code></li>
<li><code>border-gray-800</code> -&gt; <code>border-navy-700</code></li>
</ul>
<h3>Global Token Cleanup</h3>
<p>Across the entire codebase, these legacy tokens should be searched and replaced:</p>
<ul>
<li><code>dark-950</code> -&gt; <code>navy-950</code></li>
<li><code>dark-900</code> -&gt; <code>navy-900</code></li>
<li><code>dark-800</code> -&gt; <code>navy-800</code></li>
<li><code>accent-500</code> -&gt; <code>red-500</code></li>
<li><code>accent-400</code> -&gt; <code>red-400</code></li>
<li><code>accent-300</code> -&gt; <code>red-300</code></li>
<li><code>accent-200</code> -&gt; <code>red-200</code></li>
<li><code>accent-100</code> -&gt; <code>red-100</code></li>
<li><code>secondary-*</code> tokens (sky blue) should not appear anywhere. If they do, flag and remove.</li>
</ul>
<p>The tailwind.config.js still has <code>dark</code>, <code>accent</code>, and <code>secondary</code> color blocks. Once all components are migrated to navy/red tokens, remove these deprecated blocks from the config.</p>
<hr>
<h2>Priority Order for Bobby</h2>
<ol>
<li><strong>Hero video background</strong> (biggest visual impact, one component)</li>
<li><strong>ContactDrawer brand cleanup</strong> (customer-facing, every visitor sees this)</li>
<li><strong>RoleApplicationModal brand cleanup</strong> (fewer visitors see this, but it&#39;s messy)</li>
<li><strong>Count-up animations</strong> (polish, not urgent but Patrik specifically asked for it)</li>
<li><strong>Token cleanup across codebase</strong> (do this as part of each component fix, not as a separate pass)</li>
</ol>
`,l={title:e,slug:o,category:t,agent:n,date:r,dateFormatted:d,updated:null,summary:a,tags:s,content:i};export{n as agent,t as category,i as content,r as date,d as dateFormatted,l as default,o as slug,a as summary,s as tags,e as title,c as updated};
