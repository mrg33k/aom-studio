const t="Ambition Video Intro Catalog",n="ambition-intro-catalog",o="Content",e="Steffen",r="2026-03-15",i="Mar 15",d=null,s="Catalog of Remotion-based video intro compositions for Ambition Mechanical content.",a=[],l=`<h1>Ambition Mechanical Video Intro Catalog</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-15
Status: COMPLETE
Location: <code>projects/content-agent/remotion/src/AmbitionIntro*.tsx</code>
Registered in: <code>projects/content-agent/remotion/src/Root.tsx</code></p>
</blockquote>
<p>All intros are available in both 9:16 (1080x1920) and 16:9 (1920x1080) versions. 24fps. Uses Barlow Condensed (display) + Inter (body) loaded via @remotion/google-fonts.</p>
<hr>
<h2>1. POWER INTRO (The Standard)</h2>
<p><strong>File:</strong> <code>AmbitionIntroPower.tsx</code>
<strong>Compositions:</strong> <code>AmbitionIntroPower</code>, <code>AmbitionIntroPower-16x9</code>
<strong>Duration:</strong> 3 seconds (72 frames)
<strong>When to use:</strong> Default intro for most content. Project walkthroughs, general Reels, any standard video.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>Navy background with blueprint grid pattern (5% opacity)</li>
<li>Ambition logo bounces in with spring physics (0.85 to 1.0 scale)</li>
<li>Red accent line sweeps left to right</li>
<li>&quot;AMBITION MECHANICAL SERVICES&quot; reveals letter by letter with staggered Y-translate</li>
<li>Red underline draws in below the name</li>
<li>Hard flash cut to black on exit</li>
</ul>
<p><strong>Props:</strong></p>
<ul>
<li><code>durationOverride</code> (number, seconds) - Override the 3s default</li>
</ul>
<p><strong>Render commands:</strong></p>
<pre><code class="language-bash">npx remotion render AmbitionIntroPower out/amb-intro-power-9x16.mp4
npx remotion render AmbitionIntroPower-16x9 out/amb-intro-power-16x9.mp4
</code></pre>
<hr>
<h2>2. EMERGENCY INTRO (For 24/7 Content)</h2>
<p><strong>File:</strong> <code>AmbitionIntroEmergency.tsx</code>
<strong>Compositions:</strong> <code>AmbitionIntroEmergency</code>, <code>AmbitionIntroEmergency-16x9</code>
<strong>Duration:</strong> 3.5 seconds (84 frames)
<strong>When to use:</strong> Emergency response stories, 24/7 dispatch content, urgent service calls.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>Red flash on first frames (attention grab)</li>
<li>Cycling radial red pulse (siren effect, subtle)</li>
<li>&quot;EMERGENCY DISPATCH&quot; kicker in red</li>
<li>Massive headline (&quot;24/7&quot; at 280px or &quot;EMERGENCY&quot; at 160px)</li>
<li>Phone number button with pulsing red glow</li>
<li>Logo stamp at end</li>
<li>Flash cut to black</li>
</ul>
<p><strong>Props:</strong></p>
<ul>
<li><code>headline</code> (string) - &quot;24/7&quot; (default), &quot;EMERGENCY&quot;, or any urgent text</li>
<li><code>durationOverride</code> (number, seconds)</li>
</ul>
<p><strong>Render commands:</strong></p>
<pre><code class="language-bash">npx remotion render AmbitionIntroEmergency out/amb-intro-emergency-9x16.mp4
npx remotion render AmbitionIntroEmergency --props=&#39;{&quot;headline&quot;:&quot;EMERGENCY&quot;}&#39; out/amb-intro-emergency-alt-9x16.mp4
</code></pre>
<hr>
<h2>3. PROJECT REVEAL INTRO (For Walkthroughs)</h2>
<p><strong>File:</strong> <code>AmbitionIntroProject.tsx</code>
<strong>Compositions:</strong> <code>AmbitionIntroProject</code>, <code>AmbitionIntroProject-16x9</code>
<strong>Duration:</strong> 4 seconds (96 frames)
<strong>When to use:</strong> Project walkthroughs, job site updates, progress documentation.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>Navy background with slow-drifting hex grid pattern</li>
<li>&quot;PROJECT UPDATE&quot; kicker slides in from left in red</li>
<li>Red accent line draws under kicker</li>
<li>Project name types on character by character (typewriter effect with blinking cursor)</li>
<li>Location bar with red pin dot slides in from right</li>
<li>Progress indicator badge scales in with spring physics (e.g., &quot;WEEK 3&quot;)</li>
<li>Hard cut to black</li>
</ul>
<p><strong>Props:</strong></p>
<ul>
<li><code>projectName</code> (string) - &quot;DIN TAI FUNG&quot; (default)</li>
<li><code>location</code> (string) - &quot;SCOTTSDALE FASHION SQUARE&quot; (default)</li>
<li><code>stage</code> (string) - &quot;WEEK 3&quot; (default), &quot;DAY 1&quot;, &quot;MONTH 2&quot;, &quot;COMPLETE&quot;</li>
<li><code>durationOverride</code> (number, seconds)</li>
</ul>
<p><strong>Render commands:</strong></p>
<pre><code class="language-bash">npx remotion render AmbitionIntroProject out/amb-intro-project-9x16.mp4
npx remotion render AmbitionIntroProject --props=&#39;{&quot;projectName&quot;:&quot;CROWN PUBLIC HOUSE&quot;,&quot;location&quot;:&quot;DOWNTOWN PHOENIX&quot;,&quot;stage&quot;:&quot;DAY 5&quot;}&#39; out/amb-intro-project-crown-9x16.mp4
</code></pre>
<hr>
<h2>4. STAT SLAM INTRO (For Authority Content)</h2>
<p><strong>File:</strong> <code>AmbitionIntroStat.tsx</code>
<strong>Compositions:</strong> <code>AmbitionIntroStat</code>, <code>AmbitionIntroStat-16x9</code>
<strong>Duration:</strong> 3.5 seconds (84 frames)
<strong>When to use:</strong> Authority-building content. Stats that sell scale, experience, or capability.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>Navy background with crosshatch industrial pattern</li>
<li>Red kicker text fades in above (e.g., &quot;COMPLETED PROJECTS&quot;)</li>
<li>MASSIVE stat number counts up from 0 to target (decelerate easing) or types on for non-numeric stats</li>
<li>Red accent line draws under the stat</li>
<li>Supporting line fades up below</li>
<li>Logo watermark in bottom-right corner</li>
<li>Hard cut to black</li>
</ul>
<p><strong>Props:</strong></p>
<ul>
<li><code>stat</code> (string) - &quot;500+&quot; (default), &quot;24/7&quot;, &quot;22&quot;, &quot;&lt;1 HR&quot;</li>
<li><code>kicker</code> (string) - &quot;COMPLETED PROJECTS&quot; (default)</li>
<li><code>support</code> (string) - &quot;Since 2002 in the Valley&quot; (default)</li>
<li><code>durationOverride</code> (number, seconds)</li>
</ul>
<p><strong>Stat bank:</strong></p>
<ul>
<li>&quot;500+&quot; / &quot;COMPLETED PROJECTS&quot; / &quot;Since 2002 in the Valley&quot;</li>
<li>&quot;22&quot; / &quot;YEARS IN THE INDUSTRY&quot; / &quot;Commercial HVAC experts&quot;</li>
<li>&quot;24/7&quot; / &quot;EMERGENCY DISPATCH&quot; / &quot;We answer when it matters&quot;</li>
<li>&quot;&lt;1 HR&quot; / &quot;EMERGENCY RESPONSE TIME&quot; / &quot;Abraza Senior Living, 3 AM&quot;</li>
</ul>
<p><strong>Render commands:</strong></p>
<pre><code class="language-bash">npx remotion render AmbitionIntroStat out/amb-intro-stat-500-9x16.mp4
npx remotion render AmbitionIntroStat --props=&#39;{&quot;stat&quot;:&quot;24/7&quot;,&quot;kicker&quot;:&quot;EMERGENCY DISPATCH&quot;,&quot;support&quot;:&quot;We answer when it matters&quot;}&#39; out/amb-intro-stat-247-9x16.mp4
</code></pre>
<hr>
<h2>5. CREW INTRO (For Team/Culture Content)</h2>
<p><strong>File:</strong> <code>AmbitionIntroCrew.tsx</code>
<strong>Compositions:</strong> <code>AmbitionIntroCrew</code>, <code>AmbitionIntroCrew-16x9</code>
<strong>Duration:</strong> 3 seconds (72 frames)
<strong>When to use:</strong> Team/crew spotlight, day-in-the-life, culture content.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>Navy background with gradient overlay (ready for footage behind)</li>
<li>Red dot appears first with spring scale</li>
<li>Red line draws from dot to the right</li>
<li>Title words stagger in one at a time, sliding from left (e.g., &quot;MEET&quot; then &quot;THE&quot; then &quot;CREW&quot;)</li>
<li>Date stamp fades up (optional)</li>
<li>&quot;AMBITION MECHANICAL&quot; watermark in bottom-right</li>
<li>Hard cut to black</li>
</ul>
<p><strong>Props:</strong></p>
<ul>
<li><code>title</code> (string) - &quot;MEET THE CREW&quot; (default), &quot;A DAY WITH AMBITION&quot;</li>
<li><code>date</code> (string) - empty by default, e.g., &quot;MARCH 15, 2026&quot;</li>
<li><code>durationOverride</code> (number, seconds)</li>
</ul>
<p><strong>Render commands:</strong></p>
<pre><code class="language-bash">npx remotion render AmbitionIntroCrew out/amb-intro-crew-9x16.mp4
npx remotion render AmbitionIntroCrew --props=&#39;{&quot;title&quot;:&quot;A DAY WITH AMBITION&quot;,&quot;date&quot;:&quot;MARCH 15, 2026&quot;}&#39; out/amb-intro-crew-daylife-9x16.mp4
</code></pre>
<hr>
<h2>6. BEFORE/AFTER INTRO (For Transformation Content)</h2>
<p><strong>File:</strong> <code>AmbitionIntroBeforeAfter.tsx</code>
<strong>Compositions:</strong> <code>AmbitionIntroBeforeAfter</code>, <code>AmbitionIntroBeforeAfter-16x9</code>
<strong>Duration:</strong> 3.5 seconds (84 frames)
<strong>When to use:</strong> Renovation reveals, repair transformations, new install vs. old system.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>Navy background with subtle left/right differentiation (left slightly darker, right with navy tint)</li>
<li>Red vertical divider line animates from top to bottom, splitting the frame</li>
<li>Divider pulses with red glow after fully drawn</li>
<li>&quot;BEFORE&quot; label slides in from left with gray accent underline</li>
<li>&quot;AFTER&quot; label slides in from right with red accent underline</li>
<li>Project name with red accent line appears at bottom center</li>
<li>Hard cut to black</li>
</ul>
<p><strong>Props:</strong></p>
<ul>
<li><code>projectName</code> (string) - &quot;CROWN PUBLIC HOUSE&quot; (default)</li>
<li><code>durationOverride</code> (number, seconds)</li>
</ul>
<p><strong>Render commands:</strong></p>
<pre><code class="language-bash">npx remotion render AmbitionIntroBeforeAfter out/amb-intro-beforeafter-9x16.mp4
npx remotion render AmbitionIntroBeforeAfter --props=&#39;{&quot;projectName&quot;:&quot;MEMORIAL TOWER&quot;}&#39; out/amb-intro-beforeafter-memorial-9x16.mp4
</code></pre>
<hr>
<h2>7. BRAND BUMPER (Ultra Short)</h2>
<p><strong>File:</strong> <code>AmbitionIntroBumper.tsx</code>
<strong>Compositions:</strong> <code>AmbitionIntroBumper</code>, <code>AmbitionIntroBumper-16x9</code>
<strong>Duration:</strong> 2 seconds (48 frames)
<strong>When to use:</strong> Quick logo sting between video sections. Transition bumper. Cold opens.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>White flash frame on entry</li>
<li>Logo snaps in with camera-shake effect (sine/cosine displacement that decays)</li>
<li>Red dot pulses once (scale 0 to 1 to 1.4 to 1 with glow)</li>
<li>&quot;AMBITION&quot; in massive 140px type slams in</li>
<li>All elements share the camera shake</li>
<li>Hard 2-frame cut to black</li>
</ul>
<p><strong>Props:</strong></p>
<ul>
<li><code>durationOverride</code> (number, seconds)</li>
</ul>
<p><strong>Render commands:</strong></p>
<pre><code class="language-bash">npx remotion render AmbitionIntroBumper out/amb-intro-bumper-9x16.mp4
npx remotion render AmbitionIntroBumper-16x9 out/amb-intro-bumper-16x9.mp4
</code></pre>
<hr>
<h2>Quick Reference</h2>
<table>
<thead>
<tr>
<th>Intro</th>
<th>Duration</th>
<th>Best For</th>
<th>Key Props</th>
</tr>
</thead>
<tbody><tr>
<td>Power</td>
<td>3s</td>
<td>Default opener</td>
<td>durationOverride</td>
</tr>
<tr>
<td>Emergency</td>
<td>3.5s</td>
<td>24/7, urgent content</td>
<td>headline</td>
</tr>
<tr>
<td>Project</td>
<td>4s</td>
<td>Walkthroughs, site updates</td>
<td>projectName, location, stage</td>
</tr>
<tr>
<td>Stat</td>
<td>3.5s</td>
<td>Authority numbers</td>
<td>stat, kicker, support</td>
</tr>
<tr>
<td>Crew</td>
<td>3s</td>
<td>Team/culture</td>
<td>title, date</td>
</tr>
<tr>
<td>Before/After</td>
<td>3.5s</td>
<td>Transformations</td>
<td>projectName</td>
</tr>
<tr>
<td>Bumper</td>
<td>2s</td>
<td>Section transitions</td>
<td>durationOverride</td>
</tr>
</tbody></table>
<h2>Render All (Batch)</h2>
<pre><code class="language-bash">cd projects/content-agent/remotion

# 9:16 Vertical (Social)
npx remotion render AmbitionIntroPower out/amb-intro-power-9x16.mp4
npx remotion render AmbitionIntroEmergency out/amb-intro-emergency-9x16.mp4
npx remotion render AmbitionIntroProject out/amb-intro-project-9x16.mp4
npx remotion render AmbitionIntroStat out/amb-intro-stat-9x16.mp4
npx remotion render AmbitionIntroCrew out/amb-intro-crew-9x16.mp4
npx remotion render AmbitionIntroBeforeAfter out/amb-intro-beforeafter-9x16.mp4
npx remotion render AmbitionIntroBumper out/amb-intro-bumper-9x16.mp4

# 16:9 Horizontal (YouTube)
npx remotion render AmbitionIntroPower-16x9 out/amb-intro-power-16x9.mp4
npx remotion render AmbitionIntroEmergency-16x9 out/amb-intro-emergency-16x9.mp4
npx remotion render AmbitionIntroProject-16x9 out/amb-intro-project-16x9.mp4
npx remotion render AmbitionIntroStat-16x9 out/amb-intro-stat-16x9.mp4
npx remotion render AmbitionIntroCrew-16x9 out/amb-intro-crew-16x9.mp4
npx remotion render AmbitionIntroBeforeAfter-16x9 out/amb-intro-beforeafter-16x9.mp4
npx remotion render AmbitionIntroBumper-16x9 out/amb-intro-bumper-16x9.mp4
</code></pre>
<h2>Brand Compliance</h2>
<p>All intros follow the Ambition v3 brand system:</p>
<ul>
<li>Navy Dark (#0a0e2a) backgrounds, never black</li>
<li>Red (#dc2626) for accents only, max 10-15% of screen</li>
<li>Barlow Condensed 800 for all display text, ALL CAPS</li>
<li>Inter 400 for body text</li>
<li>24fps always</li>
<li>Industrial patterns (blueprint grid, hex grid, crosshatch) at 3-5% opacity</li>
<li>All text within safe zones</li>
<li>Hard cut exits (no slow fades) for energy and authority</li>
</ul>
`,u={title:t,slug:n,category:o,agent:e,date:r,dateFormatted:i,updated:null,summary:s,tags:a,content:l};export{e as agent,o as category,l as content,r as date,i as dateFormatted,u as default,n as slug,s as summary,a as tags,t as title,d as updated};
