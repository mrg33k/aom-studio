const e="Text Overlay Research for Cleo",t="text-overlay-research",n="Technical",l="Elon",o="2026-03-12",a="Mar 12",d=null,i="Research on text overlay tools and techniques for video content production.",r=[],s=`<h1>Text Overlay Research for Cleo</h1>
<p><em>Elon, 2026-03-12</em></p>
<h2>Problem</h2>
<p>Cleo needs to add clean, bold text graphics (Instagram Reels / TikTok style) to her video cuts. Text that fades on and off, positioned well, looking professional.</p>
<h2>Current System State</h2>
<table>
<thead>
<tr>
<th>Component</th>
<th>Status</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>ffmpeg 8.0.1</td>
<td>Installed</td>
<td>Homebrew, stripped build</td>
</tr>
<tr>
<td>drawtext filter</td>
<td>NOT AVAILABLE</td>
<td>ffmpeg built without freetype/libass/fontconfig</td>
</tr>
<tr>
<td>subtitles/ASS filter</td>
<td>NOT AVAILABLE</td>
<td>Same reason</td>
</tr>
<tr>
<td>overlay filter</td>
<td>AVAILABLE</td>
<td>This is our foundation</td>
</tr>
<tr>
<td>ImageMagick</td>
<td>NOT INSTALLED</td>
<td>Not needed with Pillow approach</td>
</tr>
<tr>
<td>Pillow (Python)</td>
<td>NOT INSTALLED</td>
<td><code>pip3 install Pillow</code> needed once</td>
</tr>
<tr>
<td>Python 3.9.6</td>
<td>Available</td>
<td>numpy installed</td>
</tr>
</tbody></table>
<h2>Approaches Evaluated</h2>
<h3>1. ffmpeg drawtext (BLOCKED, best if unblocked)</h3>
<ul>
<li>Single-pass, fast, native ffmpeg</li>
<li>Supports font rendering, fade via <code>alpha</code> expression, <code>enable=between(t,X,Y)</code></li>
<li>BLOCKED: Current ffmpeg build lacks <code>--enable-libfreetype</code> and <code>--enable-libass</code></li>
<li><strong>Fix</strong>: <code>brew uninstall ffmpeg &amp;&amp; brew install homebrew-ffmpeg/ffmpeg/ffmpeg-full</code></li>
<li>Would be 5-10x faster than the Pillow approach</li>
</ul>
<h3>2. ASS/SSA Subtitles (BLOCKED, most powerful)</h3>
<ul>
<li>Advanced SubStation Alpha format supports: fades, positioning, fonts, colors, outlines, shadows, karaoke timing, movement</li>
<li><code>ffmpeg -vf &quot;ass=overlay.ass&quot;</code> burns them into video</li>
<li>BLOCKED: same missing libs as drawtext</li>
<li>Best for complex animations (word-by-word reveal, kinetic typography)</li>
</ul>
<h3>3. Pillow + ffmpeg overlay (CHOSEN, works today)</h3>
<ul>
<li>Python renders text as transparent PNG frames using Pillow</li>
<li>Frames encoded as ProRes 4444 (alpha channel) via ffmpeg</li>
<li>Overlaid onto source video using ffmpeg <code>overlay</code> filter (which IS available)</li>
<li>Two-pass: render frames, then composite</li>
<li>Slower but fully functional with current setup</li>
</ul>
<h3>4. ImageMagick + ffmpeg (evaluated, rejected)</h3>
<ul>
<li>Similar concept to Pillow but adds another dependency</li>
<li>ImageMagick CLI is harder to script precisely</li>
<li>No advantage over Pillow for this use case</li>
</ul>
<h3>5. Motion graphics templates (evaluated, not viable for CLI)</h3>
<ul>
<li>After Effects .mogrt / Apple Motion templates require GUI apps</li>
<li>No clean CLI path</li>
<li>Not suitable for an automated agent workflow</li>
</ul>
<h2>Solution Built</h2>
<p><strong>Primary</strong>: Pillow renders text -&gt; ProRes 4444 with alpha -&gt; ffmpeg overlay composite</p>
<p>Files:</p>
<ul>
<li><code>.claude/skills/text-overlay/SKILL.md</code> -- full skill doc with presets, examples, design guidelines</li>
<li><code>scripts/text-overlay.py</code> -- ready-to-use CLI tool and importable Python module</li>
</ul>
<h3>Performance Estimate</h3>
<p>For a 15-second reel at 30fps with 5 seconds of text:</p>
<ul>
<li>~150 frames to render</li>
<li>~1-2 minutes on this Mac</li>
<li>Acceptable for Cleo&#39;s batch workflow</li>
</ul>
<h3>Setup Required</h3>
<pre><code class="language-bash">pip3 install Pillow
</code></pre>
<p>One command. Then everything works.</p>
<h2>Available Fonts</h2>
<p>Best options already on the Mac:</p>
<ul>
<li><strong>SF Pro (SFNS.ttf)</strong> -- Apple&#39;s system font, medium weight, very clean</li>
<li><strong>Helvetica Neue (HelveticaNeue.ttc)</strong> -- classic, but TTC makes bold extraction tricky</li>
<li><strong>SF Compact (SFCompact.ttf)</strong> -- tighter, good for small text</li>
</ul>
<p>Recommendation: Use SF Pro for everything. It&#39;s modern, readable at all sizes, and the default weight is already semi-bold.</p>
<h2>Upgrade Recommendation</h2>
<p>When there&#39;s a good moment, run:</p>
<pre><code class="language-bash">brew uninstall ffmpeg
brew install homebrew-ffmpeg/ffmpeg/ffmpeg-full
</code></pre>
<p>This unlocks drawtext and ASS filters, making text overlays a single-pass operation (dramatically faster). The Pillow approach works perfectly in the meantime.</p>
<h2>Design Guidelines (for Cleo)</h2>
<ol>
<li>White text + drop shadow = universal, works on any background</li>
<li>SF Pro font, 64-96px for titles, 36-48px for details</li>
<li>Fade in/out 0.3-0.5 seconds</li>
<li>Max 2 text elements visible at once</li>
<li>Center screen for impact, lower-third for context</li>
<li>Keep text visible 2-4 seconds</li>
<li>Use dark bg_bar only when footage is too bright for shadow alone</li>
<li>AOM orange (#E85D26) as accent color, not primary</li>
</ol>
`,p={title:e,slug:t,category:n,agent:l,date:o,dateFormatted:a,updated:null,summary:i,tags:r,content:s};export{l as agent,n as category,s as content,o as date,a as dateFormatted,p as default,t as slug,i as summary,r as tags,e as title,d as updated};
