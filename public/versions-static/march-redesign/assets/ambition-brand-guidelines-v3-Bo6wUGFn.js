const t="Ambition Brand Guidelines v3",e="ambition-brand-guidelines-v3",n="Design Specs",o="Steffen",i="2026-03-09",r="Mar 9",l=null,a="Comprehensive brand guidelines for Ambition Mechanical, for Tony, Cleo, and Bobby.",d=[],s=`<h1>Ambition Mechanical -- Brand Guidelines v3.0</h1>
<blockquote>
<p>Created by Steffen (SS) for AOM agents: Tony, Cleo, Bobby
Status: DRAFT -- awaiting Patrik review
Last updated: 2026-03-09</p>
<p><strong>v3 DIRECTION:</strong> OG brand (navy, Barlow Condensed, red, industrial patterns) made website-ready.
Replaces v2 which documented the existing site. White backgrounds added for breathing room.
Full interactive spec lives at: aom-studio <code>/src/pages/AmbitionBrandGuidelines.jsx</code></p>
</blockquote>
<hr>
<h2>Brand Essence</h2>
<p><strong>Who they are:</strong> A commercial and industrial mechanical contractor based in Tempe, AZ. Established 2002. Licensed ROC #320923. They handle HVAC/R installation, service, repair, refrigeration, energy management systems, and new construction mechanical. Not residential. Not small-time. They work with Intel, Banner Health, Amazon, Honeywell, Chase.</p>
<p><strong>What they stand for:</strong> The name says it. Ambition was born from &quot;a strong passion and desire to excel in the HVAC/R industry.&quot; Their stated values: honesty, integrity, reliability. They own every part of the process. Clear communication, upfront expectations.</p>
<p><strong>The feeling:</strong> Competence you can feel. Not flashy, not corporate-cold. Confident and grounded. When Ambition shows up on a job site, you know the work is going to be done right. They&#39;re the contractor other contractors respect.</p>
<p><strong>Positioning:</strong> Premium commercial/industrial mechanical. Not competing on price. Competing on precision, responsiveness, and breadth of capability (preconstruction through maintenance).</p>
<hr>
<h2>Visual Identity</h2>
<h3>Colors</h3>
<p>v3 direction: OG brand palette. Navy replaces sky blue. Navy replaces pure black. White backgrounds for content sections.</p>
<h4>Primary Palette (Navy)</h4>
<table>
<thead>
<tr>
<th>Role</th>
<th>Hex</th>
<th>Tailwind Token</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Navy (Primary)</td>
<td><code>#1a237e</code></td>
<td><code>navy-600</code></td>
<td>Logo core, headlines on light BGs, primary brand color</td>
</tr>
<tr>
<td>Navy Dark</td>
<td><code>#0a0e2a</code></td>
<td><code>navy-900</code></td>
<td>Hero/dark section backgrounds</td>
</tr>
<tr>
<td>Navy Mid</td>
<td><code>#283593</code></td>
<td><code>navy-500</code></td>
<td>Secondary panels, active states</td>
</tr>
<tr>
<td>Navy Light</td>
<td><code>#3949ab</code></td>
<td><code>navy-400</code></td>
<td>Hover states, links, interactive elements</td>
</tr>
</tbody></table>
<h4>Accent Palette (Red)</h4>
<table>
<thead>
<tr>
<th>Role</th>
<th>Hex</th>
<th>Tailwind Token</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Ambition Red</td>
<td><code>#dc2626</code></td>
<td><code>red-500</code></td>
<td>ALL CTAs, flame elements, urgent indicators, kickers</td>
</tr>
<tr>
<td>Red Light</td>
<td><code>#ef4444</code></td>
<td><code>red-400</code></td>
<td>Hover states, gradient endpoints</td>
</tr>
<tr>
<td>Red Dark</td>
<td><code>#b91c1c</code></td>
<td><code>red-600</code></td>
<td>Pressed/active button states</td>
</tr>
<tr>
<td>Flame Orange</td>
<td><code>#ea580c</code></td>
<td><code>flame-500</code></td>
<td>Gradient bridge from red to warmth. Sparingly.</td>
</tr>
</tbody></table>
<h4>Light Surfaces (NEW in v3)</h4>
<table>
<thead>
<tr>
<th>Role</th>
<th>Hex</th>
<th>Tailwind Token</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>White</td>
<td><code>#ffffff</code></td>
<td><code>neutral-white</code></td>
<td>Main content section backgrounds</td>
</tr>
<tr>
<td>Off-White</td>
<td><code>#f8fafc</code></td>
<td><code>neutral-50</code></td>
<td>Alternating content sections</td>
</tr>
<tr>
<td>Light Gray</td>
<td><code>#f3f4f6</code></td>
<td><code>neutral-100</code></td>
<td>Cards, input backgrounds</td>
</tr>
<tr>
<td>Border Gray</td>
<td><code>#e5e7eb</code></td>
<td><code>neutral-200</code></td>
<td>Card borders, dividers</td>
</tr>
</tbody></table>
<h4>Dark Surfaces</h4>
<table>
<thead>
<tr>
<th>Role</th>
<th>Hex</th>
<th>Tailwind Token</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Midnight Navy</td>
<td><code>#070b1e</code></td>
<td><code>navy-950</code></td>
<td>Deepest dark (footer)</td>
</tr>
<tr>
<td>Dark Navy</td>
<td><code>#0a0e2a</code></td>
<td><code>navy-900</code></td>
<td>Hero, CTA, dark content sections</td>
</tr>
<tr>
<td>Deep Navy</td>
<td><code>#111638</code></td>
<td><code>navy-800</code></td>
<td>Cards on dark backgrounds</td>
</tr>
<tr>
<td>Charcoal Navy</td>
<td><code>#1a1f45</code></td>
<td><code>navy-700</code></td>
<td>Inputs, modals on dark</td>
</tr>
</tbody></table>
<h4>Color Rules (v3)</h4>
<ul>
<li><strong>Site alternates dark and light sections.</strong> Hero (dark) -&gt; Services (white) -&gt; Stats (dark) -&gt; About (off-white) -&gt; CTA (dark) -&gt; Contact (white) -&gt; Footer (dark).</li>
<li><strong>Navy is the primary brand color.</strong> Headlines on light backgrounds are navy. Dark sections use navy, not pure black.</li>
<li><strong>Red is for action only.</strong> CTAs, kickers, accent lines. Never decorative.</li>
<li><strong>White backgrounds get navy headlines + steel gray body text.</strong> Never pure black text.</li>
<li><strong>No sky blue, no pure black.</strong> Both are retired from the brand system.</li>
<li><strong>Overall ratio: 35% white, 35% navy, 15% red, 15% gray.</strong></li>
</ul>
<h3>Typography</h3>
<p><strong>Display Font:</strong> Barlow Condensed (Google Fonts)</p>
<ul>
<li>ALL headlines, section titles, buttons, kickers</li>
<li>Matches the logo&#39;s condensed sans-serif</li>
<li>Weights: 400-900</li>
</ul>
<p><strong>Body Font:</strong> Inter (Google Fonts)</p>
<ul>
<li>Body text, navigation, forms, descriptions</li>
<li>Weights: 300-900</li>
</ul>
<p><strong>Type Scale (v3):</strong></p>
<table>
<thead>
<tr>
<th>Context</th>
<th>Font</th>
<th>Size</th>
<th>Weight</th>
<th>Tracking</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Display / Hero</td>
<td>Barlow Condensed</td>
<td>72-96px / clamp(3rem, 8vw, 6rem)</td>
<td>ExtraBold (800)</td>
<td>0.04em</td>
<td>ALL CAPS always</td>
</tr>
<tr>
<td>Section Title</td>
<td>Barlow Condensed</td>
<td>48-64px / clamp(2.5rem, 5vw, 4rem)</td>
<td>Bold (700)</td>
<td>0.03em</td>
<td>ALL CAPS</td>
</tr>
<tr>
<td>Sub-section</td>
<td>Barlow Condensed</td>
<td>32-40px</td>
<td>SemiBold (600)</td>
<td>0.02em</td>
<td>ALL CAPS</td>
</tr>
<tr>
<td>Card Title</td>
<td>Barlow Condensed</td>
<td>24-28px</td>
<td>SemiBold (600)</td>
<td>0.02em</td>
<td>ALL CAPS or sentence</td>
</tr>
<tr>
<td>Body</td>
<td>Inter</td>
<td>15-16px</td>
<td>Regular (400)</td>
<td>Normal</td>
<td>Max width 640px</td>
</tr>
<tr>
<td>Kickers</td>
<td>Barlow Condensed</td>
<td>11-12px</td>
<td>SemiBold (600)</td>
<td>0.2em</td>
<td>UPPERCASE always</td>
</tr>
<tr>
<td>Buttons</td>
<td>Barlow Condensed</td>
<td>14-16px</td>
<td>SemiBold-Bold</td>
<td>0.08em</td>
<td>UPPERCASE on primary CTAs</td>
</tr>
<tr>
<td>Nav</td>
<td>Inter</td>
<td>14-15px</td>
<td>Medium (500)</td>
<td>0.02em</td>
<td>Sentence case</td>
</tr>
</tbody></table>
<p><strong>Type Rules (v3):</strong></p>
<ul>
<li>Headlines: ALL CAPS using Barlow Condensed. Always.</li>
<li>On light backgrounds: navy (#1a237e) headlines, steel gray (#374151) body</li>
<li>On dark backgrounds: white headlines, light gray (#d1d5db) body</li>
<li>Kickers: Barlow Condensed, uppercase, red (#dc2626), tracking 0.2em</li>
<li>Never use Inter for headlines. Never use Barlow for body text.</li>
</ul>
<h3>Photography/Video Style</h3>
<p>Based on Cleo&#39;s footage scan and the existing video library:</p>
<p><strong>The DNA:</strong></p>
<ul>
<li>24fps across all footage. This gives Ambition&#39;s video a slightly cinematic, deliberate feel vs. the 30fps handheld chaos most contractors post.</li>
<li>DaVinci Resolve pipeline (both Studio and non-Studio). Professional-grade color and export.</li>
<li>H.264 at 10-13 Mbps. Clean, high-bitrate output.</li>
</ul>
<p><strong>Visual Direction:</strong></p>
<table>
<thead>
<tr>
<th>Element</th>
<th>Direction</th>
</tr>
</thead>
<tbody><tr>
<td>Color temperature</td>
<td>Cool-neutral. The blue in the brand should subtly inform the grade. Avoid warm/orange tones that read &quot;generic construction.&quot;</td>
</tr>
<tr>
<td>Contrast</td>
<td>Medium-high. Not blown out, not crushed. Clean shadows with detail.</td>
</tr>
<tr>
<td>Saturation</td>
<td>Slightly pulled back from reality. Not desaturated, but not punchy Instagram saturation either. Controlled.</td>
</tr>
<tr>
<td>Lighting</td>
<td>Prioritize well-lit spaces. Existing footage is mostly interior job sites. Let practical lights and work lights add texture.</td>
</tr>
<tr>
<td>Composition</td>
<td>Wide shots show scale of the job. Medium shots show the work. Close-ups show precision (pipe connections, panel wiring, equipment details).</td>
</tr>
<tr>
<td>Movement</td>
<td>Slow, intentional. No shaky handheld. Slider/gimbal or locked-off tripod.</td>
</tr>
</tbody></table>
<p><strong>What makes Ambition footage feel like Ambition:</strong></p>
<ul>
<li>Industrial environments with human scale. Big commercial spaces, but the crew is in the frame doing the work.</li>
<li>Progress updates as a content pillar. Projects like Din Tai Fung, Primrose, Memorial Tower, Abraza all have update-style edits.</li>
<li>High-end client projects visible: Louis Vuitton, Tiffanys, Ritz Carlton, Apple Store. These signal credibility.</li>
<li>Emergency response footage (Abraza) is the most compelling narrative content in the library.</li>
</ul>
<p><strong>Shot List Priorities for Future Shoots:</strong></p>
<ol>
<li>Vertical (9:16) first. The Primrose video is the only vertical file in the library. Social needs vertical.</li>
<li>Crew faces and hands. The &quot;_LABORERS&quot; folder signals intent to humanize the brand but it&#39;s underpopulated.</li>
<li>Equipment close-ups. HVAC equipment has visual appeal when shot with intention.</li>
<li>Before/during/after sequences. Progress is the story.</li>
</ol>
<h3>Logo Usage</h3>
<p><strong>Current State:</strong> No standalone logo file found in the repo. The website uses a text-based logo treatment:</p>
<ul>
<li>A small gradient dot (accent-500 to secondary-500) with a glow effect</li>
<li>&quot;AMBITION&quot; in white, uppercase, semibold, tracking 0.12em</li>
<li>&quot;MECHANICAL&quot; in secondary-400 (sky blue), same treatment</li>
</ul>
<p><strong>Logo Rules:</strong></p>
<ul>
<li>Always uppercase</li>
<li>&quot;Ambition&quot; and &quot;Mechanical&quot; can appear on one line (separated by a space) or stacked</li>
<li>The gradient dot is optional but adds brand signal</li>
<li>Minimum clear space: the height of the &quot;A&quot; on all sides</li>
<li>On dark backgrounds: white + sky blue (default)</li>
<li>On light backgrounds (print, proposals): dark-950 + secondary-600</li>
</ul>
<p><strong>Note for Patrik:</strong> A proper logo file (SVG) should be created and uploaded to both the website and a shared brand assets folder. The current text-based treatment works but limits usage in contexts like truck wraps, signage, hard hat stickers, and proposal headers.</p>
<hr>
<h2>Voice &amp; Tone</h2>
<h3>Brand Voice</h3>
<p>Ambition sounds like a crew lead who knows exactly what they&#39;re doing and doesn&#39;t need to prove it. Confident without being arrogant. Technical when it matters. Human always.</p>
<p><strong>Voice Attributes:</strong></p>
<table>
<thead>
<tr>
<th>Attribute</th>
<th>What it sounds like</th>
<th>What it doesn&#39;t sound like</th>
</tr>
</thead>
<tbody><tr>
<td>Confident</td>
<td>&quot;We handle commercial HVAC systems across every phase.&quot;</td>
<td>&quot;We think we can probably help with your HVAC needs.&quot;</td>
</tr>
<tr>
<td>Direct</td>
<td>&quot;24/7 emergency dispatch. Call (480) 600-2942.&quot;</td>
<td>&quot;Don&#39;t hesitate to reach out if you ever need anything!&quot;</td>
</tr>
<tr>
<td>Knowledgeable</td>
<td>&quot;VRV systems, chillers, rooftop units. All makes, all models.&quot;</td>
<td>&quot;We fix air conditioners and stuff.&quot;</td>
</tr>
<tr>
<td>Grounded</td>
<td>&quot;Built on precision, driven by integrity.&quot;</td>
<td>&quot;We&#39;re the BEST HVAC company in Arizona!!!&quot;</td>
</tr>
<tr>
<td>Human</td>
<td>&quot;Our crew shows up. Every time.&quot;</td>
<td>Corporate-speak with no personality</td>
</tr>
</tbody></table>
<h3>Tone Shifts by Context</h3>
<table>
<thead>
<tr>
<th>Context</th>
<th>Tone</th>
<th>Example</th>
</tr>
</thead>
<tbody><tr>
<td>Website copy</td>
<td>Confident, professional, concise</td>
<td>&quot;We prioritize quality over quantity.&quot;</td>
</tr>
<tr>
<td>Social captions</td>
<td>Slightly warmer, more casual, still competent</td>
<td>&quot;This Din Tai Fung kitchen buildout is coming together. Week 3 update.&quot;</td>
</tr>
<tr>
<td>Emergency/urgent</td>
<td>Direct, no filler</td>
<td>&quot;3AM call at Abraza. We were on-site in under an hour.&quot;</td>
</tr>
<tr>
<td>Recruitment</td>
<td>Proud, inviting</td>
<td>&quot;We&#39;re hiring techs who take the work personally.&quot;</td>
</tr>
<tr>
<td>Client comms</td>
<td>Clear, respectful, zero corporate fluff</td>
<td>&quot;Here&#39;s where we&#39;re at on the project. Next steps below.&quot;</td>
</tr>
</tbody></table>
<h3>Words and Phrases That Feel On-Brand</h3>
<ul>
<li>&quot;We build the systems that keep business moving/cool/warm/just right.&quot; (hero tagline)</li>
<li>&quot;Precision.&quot; &quot;Integrity.&quot; &quot;Reliability.&quot;</li>
<li>&quot;Licensed since day one.&quot;</li>
<li>&quot;All makes, all models.&quot;</li>
<li>&quot;We handle it.&quot;</li>
<li>&quot;From preconstruction to preventive maintenance.&quot;</li>
</ul>
<h3>Words and Phrases to Avoid</h3>
<ul>
<li>&quot;Best in class&quot; / &quot;world-class&quot; / &quot;cutting-edge&quot; (generic, means nothing)</li>
<li>&quot;Solutions provider&quot; (corporate buzzword)</li>
<li>Exclamation points in professional copy</li>
<li>&quot;Don&#39;t hesitate to...&quot; (weak CTA)</li>
<li>&quot;We&#39;re passionate about HVAC&quot; (nobody says this in real life)</li>
<li>Em dashes</li>
</ul>
<hr>
<h2>Social Media Guidelines</h2>
<h3>Key Accounts</h3>
<table>
<thead>
<tr>
<th>Platform</th>
<th>Handle</th>
<th>Current State</th>
</tr>
</thead>
<tbody><tr>
<td>Instagram</td>
<td>@ambition_air_conditioning</td>
<td>~1,542 followers, 55 posts. Educational/project content.</td>
</tr>
<tr>
<td>TikTok</td>
<td>@ambitionmech</td>
<td>Active. Technical repair demos, job site content.</td>
</tr>
<tr>
<td>LinkedIn</td>
<td>Ambition Mechanical Services</td>
<td>Company page exists. Professional audience.</td>
</tr>
<tr>
<td>Facebook</td>
<td>@ambitionac</td>
<td>Page exists. Lower priority.</td>
</tr>
</tbody></table>
<h3>Instagram</h3>
<p><strong>Visual Style:</strong></p>
<ul>
<li>Dark-themed posts. Background: #0a0a0a or #111111</li>
<li>Text overlays in Inter (or closest available: SF Pro, Helvetica Neue)</li>
<li>Sky blue (#0ea5e9) for primary text accents. Red (#dc2626) only for urgent/CTA moments.</li>
<li>Photo posts: slightly cool-graded, medium-high contrast, not over-saturated</li>
<li>Grid should alternate between video content, project photography, and branded graphics (no more than 1 in 3 posts should be a graphic)</li>
</ul>
<p><strong>Caption Voice:</strong></p>
<ul>
<li>First line is the hook. No fluff. Make people stop scrolling.</li>
<li>2-4 sentences max for the body. What the project is, what the challenge was, what Ambition did.</li>
<li>End with a CTA or a question only when it&#39;s natural. Don&#39;t force engagement bait.</li>
<li>Use line breaks for readability.</li>
</ul>
<p><strong>Hashtag Strategy:</strong></p>
<ul>
<li>8-12 per post, placed in a comment (not the caption)</li>
<li>Core set (use on every post): <code>#AmbitionMechanical</code> <code>#CommercialHVAC</code> <code>#PhoenixAZ</code> <code>#MechanicalContractor</code></li>
<li>Rotate from: <code>#HVACLife</code> <code>#HVACR</code> <code>#PipeFitter</code> <code>#BlueCollar</code> <code>#ConstructionLife</code> <code>#CommercialConstruction</code> <code>#HVACTech</code> <code>#RefrigerationRepair</code> <code>#BuiltToLast</code> <code>#PhoenixConstruction</code> <code>#ArizonaContractor</code></li>
<li>Add project-specific tags when relevant: <code>#DinTaiFung</code> <code>#ScottsdaleFashionSquare</code> <code>#DataCenter</code></li>
</ul>
<p><strong>Posting Cadence Target:</strong> 3-4x/week minimum</p>
<ul>
<li>2x video (Reels)</li>
<li>1x project photo or carousel</li>
<li>1x branded graphic or educational content</li>
</ul>
<h3>TikTok</h3>
<p><strong>Content Style:</strong></p>
<ul>
<li>Raw, technical, real. TikTok rewards authenticity over polish.</li>
<li>Show the actual work: diagnosing issues, running tests, installing equipment</li>
<li>15-30 second sweet spot. Hook in the first 1-2 seconds.</li>
<li>Text overlays required (85% watch without sound)</li>
<li>Trending audio is fine but not required. Equipment sounds and on-site audio can work better for this vertical.</li>
</ul>
<p><strong>What works for HVAC/mechanical on TikTok:</strong></p>
<ul>
<li>&quot;Watch us diagnose this...&quot; (problem/solution format)</li>
<li>Satisfying repair completions</li>
<li>Scale reveals (&quot;This chiller serves 200,000 sq ft&quot;)</li>
<li>Emergency response stories</li>
<li>Equipment walkthroughs for other techs (education builds authority)</li>
<li>Crane day footage (construction TikTok consistently engages with crane content)</li>
</ul>
<p><strong>Posting Cadence Target:</strong> 3-5x/week</p>
<h3>LinkedIn</h3>
<p><strong>Professional Tone:</strong></p>
<ul>
<li>Most polished version of the brand voice. Still human, but aware of the audience (project managers, facility directors, GCs, developers).</li>
<li>Landscape video (16:9) performs well here. Don&#39;t crop everything to vertical.</li>
<li>LinkedIn added a vertical video feed in 2025/2026. 9:16 content now gets 3-4x watch time vs landscape.</li>
</ul>
<p><strong>Content Types:</strong></p>
<ul>
<li>Project completions with scope details and client tags</li>
<li>Safety milestones and certifications</li>
<li>Hiring posts for technician roles</li>
<li>Industry perspective posts (original thought, not reshares)</li>
<li>Behind-the-scenes of complex installs</li>
</ul>
<p><strong>Posting Cadence Target:</strong> 2-3x/week</p>
<hr>
<h2>Content Do&#39;s and Don&#39;ts</h2>
<h3>Do&#39;s</h3>
<ul>
<li><strong>Show the scale.</strong> Ambition works on massive commercial projects. Wide shots that reveal the size of the space and complexity of the install.</li>
<li><strong>Show the crew.</strong> The &quot;_LABORERS&quot; content direction is right. People content builds trust. Construction companies that show real faces outperform those that only show equipment.</li>
<li><strong>Tell the project story.</strong> Every project has a narrative: what was the challenge, how did Ambition solve it, what&#39;s the result? Even a 15-second reel can communicate this.</li>
<li><strong>Use the emergency response angle.</strong> The Abraza Emergency Response footage is the most compelling content in the library. &quot;3AM call&quot; stories land because they demonstrate reliability.</li>
<li><strong>Shoot vertical for social from the start.</strong> Only 1 of 6 downloaded videos is vertical (Primrose). Everything else requires cropping that loses 44% of the frame.</li>
<li><strong>Keep video under 30 seconds for Reels/TikTok.</strong> Current library averages 35-104 seconds. Social rewards tight edits.</li>
<li><strong>Add captions/text overlays to every video.</strong> None of the current exports have baked-in captions. 85% of social video is watched without sound.</li>
<li><strong>Reference the high-profile client list.</strong> Working with Intel, Amazon, Honeywell, Banner Health, and Chase is a credibility signal. Use it.</li>
<li><strong>Use progress update format.</strong> It&#39;s already the most common format in the library (Din Tai Fung, Primrose, Novus Place, Memorial Tower). Lean into it as a content pillar.</li>
</ul>
<h3>Don&#39;ts</h3>
<ul>
<li><strong>Don&#39;t use warm/orange color grading.</strong> Every other contractor does it. Ambition&#39;s brand is cool-toned (sky blue). The footage should match.</li>
<li><strong>Don&#39;t post landscape-only video on Instagram or TikTok.</strong> Vertical or square minimum. Landscape gets buried in the algorithm.</li>
<li><strong>Don&#39;t mix stock photography with real footage.</strong> Ambition has real project footage across 29+ project folders. Stock breaks trust instantly.</li>
<li><strong>Don&#39;t use generic contractor caption voice.</strong> No &quot;Another great day on the job site!&quot; or &quot;Hard work pays off!&quot; Be specific about the project, the work, the challenge.</li>
<li><strong>Don&#39;t over-design graphics.</strong> Dark background, one or two lines of text, sky blue accent. The photography and video should do the heavy lifting, not Canva templates.</li>
<li><strong>Don&#39;t post without a hook frame.</strong> First frame of every video needs to earn the watch. A text overlay question, a dramatic shot, or an unexpected visual.</li>
<li><strong>Don&#39;t use the blue+orange construction cliche.</strong> Ambition&#39;s palette (dark + sky blue + red accent) already separates them. Protect that.</li>
<li><strong>Don&#39;t post inconsistently.</strong> Gaps in posting (weeks between posts) hurt more than a slightly imperfect post. Consistency beats perfection.</li>
</ul>
<hr>
<h2>Application Examples</h2>
<h3>Sample Instagram Captions (Brand Voice)</h3>
<p><strong>Project Update (Reel):</strong></p>
<pre><code>Din Tai Fung kitchen buildout. Scottsdale Fashion Square.

Custom ductwork install through a 14-foot ceiling with zero room for error. This is the kind of work you don&#39;t see when you&#39;re eating dumplings.

Week 3 progress.
</code></pre>
<p><strong>Emergency Response (Reel):</strong></p>
<pre><code>3AM. Abraza calls. AC down, critical systems at risk.

We had a tech on-site before sunrise. Diagnosed, repaired, running.

That&#39;s what 24/7 dispatch actually means.

(480) 600-2942
</code></pre>
<p><strong>Crew/People Post (Photo):</strong></p>
<pre><code>The crew behind the chillers at Memorial Tower Senior Apartments.

14 files of footage from this one project. Crane day, pipe setup, insulation, the whole build.

This is what 500+ completed projects looks like in person.
</code></pre>
<p><strong>Educational Post (Carousel or Reel):</strong></p>
<pre><code>VRV system repair at one of the largest data centers in the valley.

Daikin equipment. No joke. Most companies won&#39;t touch it.

We service and install all makes, all models. That&#39;s not a tagline. That&#39;s what the ROC license is for.
</code></pre>
<p><strong>Hiring Post (Photo or Graphic):</strong></p>
<pre><code>We&#39;re looking for HVAC techs who take the work personally.

Not clock-punchers. Not résumé-stuffers. Techs who see a 300-ton chiller and get curious about what&#39;s wrong.

Licensed. Benefits. Real projects. DM or apply at ambitionac.com/careers.
</code></pre>
<h3>Sample Video Title/Description Formats</h3>
<p><strong>YouTube/LinkedIn (Long-form):</strong></p>
<pre><code>Title: Ambition Mechanical | Din Tai Fung Kitchen Buildout | Scottsdale Fashion Square
Description: Week 3 progress update on the full mechanical install at Din Tai Fung, Scottsdale Fashion Square. Custom ductwork, refrigeration lines, and exhaust systems in a high-end restaurant buildout. Ambition Mechanical Services, ROC #320923. (480) 600-2942.
</code></pre>
<p><strong>TikTok/Reels (Short-form):</strong></p>
<pre><code>Caption: This chiller serves an entire senior living facility. Watch the install.
Text overlay (on video): &quot;Crane Day at Memorial Tower&quot;
</code></pre>
<p><strong>LinkedIn Post (Video):</strong></p>
<pre><code>Completed: Full mechanical scope at INEOS Grenadier / Arrowhead facility.

HVAC, controls, and refrigeration across 52 seconds of the build in motion.

From preconstruction to commissioning, Ambition Mechanical handles every phase. We don&#39;t sub out the hard parts.

#CommercialHVAC #PhoenixAZ #MechanicalContractor #AmbitionMechanical
</code></pre>
<hr>
<h2>Quick Reference for Agents</h2>
<h3>For Cleo (Video/Content)</h3>
<ul>
<li>Color grade: cool-neutral, avoid warm/orange, slightly desaturated</li>
<li>Target duration: 15-30s for Reels/TikTok, 30-90s for LinkedIn</li>
<li>Always add text overlays and captions</li>
<li>Prioritize vertical (9:16) output</li>
<li>Use the AMBITION MECHANICAL ElevenLabs voice (ID: <code>WkvyyiDC9ciaSfbQ8bxp</code>) for voiceover</li>
<li>Edit priority from existing library: Abraza Emergency Response &gt; Primrose Update &gt; Arrowhead</li>
</ul>
<h3>For Tony (Social Media)</h3>
<ul>
<li>Post background: #0a0a0a or #111111</li>
<li>Primary accent: #0ea5e9 (sky blue)</li>
<li>Red (#dc2626) for CTAs only</li>
<li>Caption voice: confident, direct, project-specific. Never generic.</li>
<li>Core hashtags on every post: <code>#AmbitionMechanical</code> <code>#CommercialHVAC</code> <code>#PhoenixAZ</code> <code>#MechanicalContractor</code></li>
<li>Cadence: 3-4x/week Instagram, 3-5x/week TikTok, 2-3x/week LinkedIn</li>
</ul>
<h3>For Bobby (Web Dev)</h3>
<ul>
<li><strong>FULL INTERACTIVE SPEC:</strong> aom-studio <code>/src/pages/AmbitionBrandGuidelines.jsx</code> (v3)</li>
<li>Tailwind config tokens ready to copy into <code>/Users/patrik/Documents/Dev/AMBITION/tailwind.config.js</code></li>
<li>Fonts: Barlow Condensed (display) + Inter (body) via Google Fonts</li>
<li>Color system: navy scale + red scale + neutral scale (see brand page Color tab)</li>
<li><strong>Site alternates dark/light sections.</strong> Not dark-only anymore.</li>
<li>Component specs, spacing system, responsive breakpoints, animation specs all documented</li>
<li>Section-by-section layout spec on the Website Layout tab</li>
</ul>
<hr>
<h2>Brand Assets Inventory</h2>
<table>
<thead>
<tr>
<th>Asset</th>
<th>Status</th>
<th>Location</th>
</tr>
</thead>
<tbody><tr>
<td>Logo (SVG)</td>
<td>MISSING</td>
<td>Needs creation. Text treatment exists in Header.jsx / Footer.jsx</td>
</tr>
<tr>
<td>Color palette</td>
<td>DOCUMENTED</td>
<td>This file + tailwind.config.js</td>
</tr>
<tr>
<td>Typography</td>
<td>DOCUMENTED</td>
<td>This file. Inter via Google Fonts.</td>
</tr>
<tr>
<td>Video library</td>
<td>PARTIAL</td>
<td>6 files downloaded (614.6 MB), 82 cloud-only. Dropbox path in Cleo&#39;s footage scan.</td>
</tr>
<tr>
<td>Photography</td>
<td>SPARSE</td>
<td>No standalone photo library found. Stills need to be pulled from video or shot.</td>
</tr>
<tr>
<td>Social templates</td>
<td>MISSING</td>
<td>Need dark-themed templates in brand colors for Instagram/LinkedIn graphics</td>
</tr>
<tr>
<td>Brand voice guide</td>
<td>DOCUMENTED</td>
<td>This file</td>
</tr>
<tr>
<td>Proposal template</td>
<td>MISSING</td>
<td>Should use brand colors, Inter font, dark theme</td>
</tr>
<tr>
<td>Hard hat stickers / signage</td>
<td>MISSING</td>
<td>Needs logo SVG first</td>
</tr>
</tbody></table>
<hr>
<h2>Open Items for Patrik</h2>
<ol>
<li><strong>Logo file.</strong> The text-based logo works on the website but won&#39;t work for physical applications (trucks, hard hats, signage, proposals). Recommend creating a proper SVG.</li>
<li><strong>Download remaining footage.</strong> 82 cloud-only files in Dropbox. Memorial Tower (14 files with crane content) and the Laborers series are highest priority for content production.</li>
<li><strong>Confirm client name usage.</strong> Can AOM publicly reference Intel, Amazon, Honeywell, Banner Health, and Chase in social content? The website lists them but social has different rules.</li>
<li><strong>Photography.</strong> No standalone photo library exists. Either pull stills from video or schedule a dedicated photo shoot at an active job site.</li>
<li><strong>Social templates.</strong> Once this doc is approved, Steffen can spec out templates for Tony to use on Instagram/LinkedIn graphics.</li>
</ol>
`,c={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:r,updated:null,summary:a,tags:d,content:s};export{o as agent,n as category,s as content,i as date,r as dateFormatted,c as default,e as slug,a as summary,d as tags,t as title,l as updated};
