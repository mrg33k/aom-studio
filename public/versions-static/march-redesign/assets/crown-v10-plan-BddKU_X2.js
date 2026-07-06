const t="Crown v10 Production Plan",e="crown-v10-plan",n="Content",o="Cleo",i="2026-03-12",r="Mar 12",l=null,d="Production plan to push Crown from v9 (9/10) to v10 with text overlays and music.",s=[],a=`<h1>Crown v10 Production Plan</h1>
<p><strong>Base:</strong> Crown v9 (26.75s, 9/10 Gemini, 13 clips)
<strong>Goal:</strong> Add text overlays, music bed, and CTA to push from 9/10 to 10/10
<strong>Output:</strong> <code>crown-vertical-v10.mov</code> on Patrik&#39;s Desktop
<strong>Method:</strong> Patrik polishes in DaVinci Resolve using this plan as reference</p>
<hr>
<h2>What v9 Gemini Said Was Missing</h2>
<ol>
<li>Before/after text overlays</li>
<li>Background music</li>
<li>CTA overlay on truck shot</li>
</ol>
<p>These are the three things v10 adds. The cut itself is locked. No re-editing clips.</p>
<hr>
<h2>1. TEXT OVERLAY PLAN</h2>
<h3>Brand Typography (AOM/Ambition)</h3>
<ul>
<li><strong>Headlines:</strong> Syne Bold (AOM brand) or Barlow Condensed Bold (Ambition brand)</li>
<li><strong>Data/stats:</strong> JetBrains Mono (AOM) or Barlow Condensed Medium (Ambition)</li>
<li><strong>Color palette:</strong> White primary, cream (#F5F0E8) secondary, AOM orange (#E85D26) accent</li>
<li><strong>Since this is Ambition Mechanical content:</strong> Use Barlow Condensed Bold for headlines, white on dark footage. If Barlow isn&#39;t on this Mac, fall back to SF Pro Bold.</li>
</ul>
<h3>Overlay Sequence (6 text elements across 26.75s)</h3>
<table>
<thead>
<tr>
<th>#</th>
<th>Time</th>
<th>Text</th>
<th>Position</th>
<th>Font Size</th>
<th>Color</th>
<th>Style</th>
<th>Duration</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>0.0-2.5s</td>
<td><code>BEFORE</code></td>
<td>center</td>
<td>80px</td>
<td>white</td>
<td>Bold, shadow, fade-in 0.3s</td>
<td>2.5s</td>
</tr>
<tr>
<td>2</td>
<td>4.0-7.0s</td>
<td><code>&quot;Alright, I&#39;m ready&quot;</code></td>
<td>lower-third</td>
<td>40px</td>
<td>cream</td>
<td>Italic, bg_bar, fade 0.3s</td>
<td>3.0s</td>
</tr>
<tr>
<td>3</td>
<td>7.7-11.7s</td>
<td><code>THE PROCESS</code></td>
<td>top</td>
<td>64px</td>
<td>white</td>
<td>Bold, shadow, fade 0.4s</td>
<td>4.0s</td>
</tr>
<tr>
<td>4</td>
<td>19.2-22.5s</td>
<td><code>AFTER</code></td>
<td>center</td>
<td>80px</td>
<td>white</td>
<td>Bold, shadow, fade 0.3s</td>
<td>3.3s</td>
</tr>
<tr>
<td>5</td>
<td>23.7-25.5s</td>
<td><code>ambitionmechanical.com</code></td>
<td>lower-third</td>
<td>44px</td>
<td>AOM orange</td>
<td>Bold, bg_bar, fade 0.3s</td>
<td>1.8s</td>
</tr>
<tr>
<td>6</td>
<td>23.7-26.5s</td>
<td><code>CALL (480) XXX-XXXX</code></td>
<td>bottom</td>
<td>36px</td>
<td>white</td>
<td>Shadow, fade 0.3s, fade-out 0.5s</td>
<td>2.8s</td>
</tr>
</tbody></table>
<h3>Overlay Design Notes</h3>
<p><strong>Overlay 1 - &quot;BEFORE&quot; (0.0-2.5s)</strong>
Appears over the burnt fan hook (C0008). Reinforces the story arc. Viewers immediately understand this is damaged equipment. Large, centered, punchy. Fades in over 0.3s so it doesn&#39;t feel like a title card.</p>
<p><strong>Overlay 2 - Speech subtitle (4.0-7.0s)</strong>
Subtitles the &quot;Alright, I&#39;m ready&quot; moment from C0005. Lower-third with a semi-transparent dark bar so it&#39;s readable over any background. Italic to distinguish from titles. This bridges the &quot;before&quot; to &quot;process&quot; sections.</p>
<p><strong>Overlay 3 - &quot;THE PROCESS&quot; (7.7-11.7s)</strong>
Appears at the start of the montage section. Top position to stay clear of the work happening in the center/bottom of frame. Smaller than BEFORE/AFTER but still commanding.</p>
<p><strong>Overlay 4 - &quot;AFTER&quot; (19.2-22.5s)</strong>
Paired with C0015 (switch/completion) and C0012 (completed K-TECH unit). Mirrors the BEFORE text. Same size, same position, same font. The symmetry tells the story without words.</p>
<p><strong>Overlays 5-6 - CTA (23.7-26.5s)</strong>
Over the truck branding closer (C0004). The truck already shows phone/website/social icons, so the text reinforces what&#39;s visible. Orange for the website (matches AOM brand accent). White for the phone number. Patrik: confirm the actual phone number before rendering.</p>
<h3>Text Config (for text-overlay.py or Resolve Fusion)</h3>
<pre><code class="language-json">[
  {
    &quot;text&quot;: &quot;BEFORE&quot;,
    &quot;start&quot;: 0.0, &quot;end&quot;: 2.5,
    &quot;position&quot;: &quot;center&quot;, &quot;font_size&quot;: 80,
    &quot;color&quot;: &quot;white&quot;, &quot;shadow&quot;: true,
    &quot;fade_in&quot;: 0.3, &quot;fade_out&quot;: 0.3,
    &quot;style&quot;: &quot;bold&quot;
  },
  {
    &quot;text&quot;: &quot;\\&quot;Alright, I&#39;m ready\\&quot;&quot;,
    &quot;start&quot;: 4.0, &quot;end&quot;: 7.0,
    &quot;position&quot;: &quot;lower-third&quot;, &quot;font_size&quot;: 40,
    &quot;color&quot;: &quot;#F5F0E8&quot;, &quot;shadow&quot;: false,
    &quot;bg_bar&quot;: true,
    &quot;fade_in&quot;: 0.3, &quot;fade_out&quot;: 0.3
  },
  {
    &quot;text&quot;: &quot;THE PROCESS&quot;,
    &quot;start&quot;: 7.7, &quot;end&quot;: 11.7,
    &quot;position&quot;: &quot;top&quot;, &quot;font_size&quot;: 64,
    &quot;color&quot;: &quot;white&quot;, &quot;shadow&quot;: true,
    &quot;fade_in&quot;: 0.4, &quot;fade_out&quot;: 0.4,
    &quot;style&quot;: &quot;bold&quot;
  },
  {
    &quot;text&quot;: &quot;AFTER&quot;,
    &quot;start&quot;: 19.2, &quot;end&quot;: 22.5,
    &quot;position&quot;: &quot;center&quot;, &quot;font_size&quot;: 80,
    &quot;color&quot;: &quot;white&quot;, &quot;shadow&quot;: true,
    &quot;fade_in&quot;: 0.3, &quot;fade_out&quot;: 0.3,
    &quot;style&quot;: &quot;bold&quot;
  },
  {
    &quot;text&quot;: &quot;ambitionmechanical.com&quot;,
    &quot;start&quot;: 23.7, &quot;end&quot;: 25.5,
    &quot;position&quot;: &quot;lower-third&quot;, &quot;font_size&quot;: 44,
    &quot;color&quot;: &quot;aom-orange&quot;, &quot;shadow&quot;: false,
    &quot;bg_bar&quot;: true,
    &quot;fade_in&quot;: 0.3, &quot;fade_out&quot;: 0.3,
    &quot;style&quot;: &quot;bold&quot;
  },
  {
    &quot;text&quot;: &quot;CALL (480) XXX-XXXX&quot;,
    &quot;start&quot;: 23.7, &quot;end&quot;: 26.5,
    &quot;position&quot;: &quot;bottom&quot;, &quot;font_size&quot;: 36,
    &quot;color&quot;: &quot;white&quot;, &quot;shadow&quot;: true,
    &quot;fade_in&quot;: 0.3, &quot;fade_out&quot;: 0.5
  }
]
</code></pre>
<p><strong>Patrik:</strong> Replace <code>(480) XXX-XXXX</code> with Ambition&#39;s actual number. Also confirm whether to use <code>ambitionmechanical.com</code> or a shortened URL.</p>
<h3>Resolve Fusion Alternative</h3>
<p>If doing this in Resolve instead of the Python script:</p>
<ol>
<li>Add a Fusion composition on Video Track 2 above the v9 timeline</li>
<li>Use Text+ node with Barlow Condensed Bold (or SF Pro Bold)</li>
<li>Keyframe opacity: 0% at start, 100% at +0.3s, 100% until -0.3s from end, 0% at end</li>
<li>For bg_bar: add a Background node with black at 70% opacity, merged behind text, sized to text bounding box + padding</li>
<li>Drop shadow: 3px offset, 50% opacity black</li>
</ol>
<hr>
<h2>2. MUSIC BED PLAN</h2>
<h3>Vibe Analysis</h3>
<p>Crown v9 tells a story: damaged equipment &gt; &quot;I&#39;m ready&quot; &gt; work montage &gt; completion &gt; branding. The music needs to:</p>
<ul>
<li>Start with tension/intrigue (burnt fan reveal)</li>
<li>Build through the process montage</li>
<li>Resolve with confidence on the truck closer</li>
</ul>
<h3>Music Spec</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Genre</td>
<td>Cinematic industrial / modern corporate</td>
</tr>
<tr>
<td>BPM</td>
<td>90-110 (mid-tempo, not frantic)</td>
</tr>
<tr>
<td>Duration needed</td>
<td>27s (trim to fit 26.75s edit)</td>
</tr>
<tr>
<td>Energy curve</td>
<td>Low &gt; building &gt; peak at 15-18s &gt; resolving at 23s</td>
</tr>
<tr>
<td>Instruments</td>
<td>Deep bass, subtle percussion, synth pads, light piano or string hits</td>
</tr>
<tr>
<td>Avoid</td>
<td>Vocals, acoustic guitar, heavy metal, anything &quot;generic corporate&quot;</td>
</tr>
<tr>
<td>Feel</td>
<td>Confident. Professional. Like a Caterpillar or DeWalt ad. Not cheesy.</td>
</tr>
</tbody></table>
<h3>Energy Curve Map</h3>
<pre><code>Time    Energy   What&#39;s on screen
0-3s    LOW      Burnt fan reveal (BEFORE). Tension.
3-7s    RISING   Speech moment. Percussion starts.
7-13s   MEDIUM   Montage begins. Bass drops in.
13-19s  HIGH     Process shots. Full beat. Peak energy.
19-22s  RESOLVE  AFTER text. Music opens up, less percussion.
22-27s  OUTRO    Truck CTA. Music fades or hits a clean ending.
</code></pre>
<h3>Audio Mix Levels (in Resolve Fairlight)</h3>
<table>
<thead>
<tr>
<th>Layer</th>
<th>Level</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Music bed</td>
<td>-18 to -14 dB</td>
<td>Subordinate to speech and nat sound</td>
</tr>
<tr>
<td>Speech (C0005 &quot;I&#39;m ready&quot;)</td>
<td>-6 to -3 dB</td>
<td>Primary, ducked music</td>
</tr>
<tr>
<td>Lav audio (C0004 truck)</td>
<td>-12 dB</td>
<td>Background presence, not featured</td>
</tr>
<tr>
<td>Nat sound (tool sounds, work)</td>
<td>-20 to -16 dB</td>
<td>Texture, layered under music</td>
</tr>
</tbody></table>
<h3>Recommendation: Suno Generation</h3>
<p><strong>Audio Library status:</strong> No catalog.md exists. The local audio library (<code>projects/content-agent/audio/</code>) has not been populated yet. No tracks to check.</p>
<p><strong>Recommendation:</strong> Generate with Suno V4.5 (good quality, fast).</p>
<p><strong>Suno prompt (Custom Mode):</strong></p>
<pre><code>Prompt: &quot;Confident cinematic industrial track, deep bass, subtle percussion building to a peak at the midpoint then resolving. Modern construction company ad feel, like a truck commercial. 90 BPM.&quot;
Style: &quot;Cinematic, Industrial, Electronic, Corporate&quot;
Title: &quot;Crown HVAC Showcase v10&quot;
Instrumental: true
Negative: &quot;Vocals, Singing, Acoustic Guitar, Classical, Lo-fi, Happy, Cheerful&quot;
Model: V4_5ALL
</code></pre>
<p><strong>Suno will generate 2 tracks.</strong> Pick the one that matches the energy curve. Trim to 27s with a fade-out starting at 24s:</p>
<pre><code class="language-bash">ffmpeg -i crown-hvac-showcase-v10-1.mp3 -t 27 -af &quot;afade=t=out:st=24:d=3&quot; crown-music-bed.mp3
</code></pre>
<p><strong>Alternative: Free source download.</strong> Check Pixabay Music or Mixkit for &quot;cinematic industrial&quot; or &quot;construction montage&quot; tracks. If a licensed track fits, skip the Suno generation entirely.</p>
<p><strong>Patrik decision needed:</strong> Generate with Suno (API key required, ~$0.10) or download from a free library (Patrik selects manually)?</p>
<hr>
<h2>3. DAVINCI RESOLVE INTEGRATION</h2>
<h3>resolve_push.py Status</h3>
<p>The script at <code>projects/content-agent/scripts/resolve_push.py</code> is fully functional. It:</p>
<ul>
<li>Connects to a running Resolve instance via the Scripting API</li>
<li>Reads the same edit-plan JSON format Cleo already produces</li>
<li>Imports media into the Media Pool</li>
<li>Creates a new timeline with clips placed at correct in/out points</li>
<li>Supports <code>--append</code> mode to add to an existing timeline</li>
</ul>
<h3>Requirements to Use</h3>
<ol>
<li><strong>DaVinci Resolve must be running</strong> on this Mac</li>
<li><strong>External Scripting must be enabled:</strong> Workspace &gt; Preferences &gt; General &gt; External Scripting Using &gt; Local</li>
<li><strong>Resolve Scripting Modules must exist:</strong> <code>/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/</code></li>
<li><strong>Source media must be mounted:</strong> <code>/Volumes/SS8TB/</code> (the external drive with all Crown footage)</li>
</ol>
<h3>How v10 Would Use It</h3>
<p>Since v9&#39;s cut is already locked and lives as <code>crown-vertical-v9.mov</code>, the Resolve push is more useful for the NEXT project (full Walking Tour edit using the memorial tower guide). For v10 specifically:</p>
<p><strong>Recommended workflow:</strong></p>
<ol>
<li>Import <code>crown-vertical-v9.mov</code> into Resolve manually (it&#39;s one file, not a multi-clip timeline)</li>
<li>Add text overlays using Fusion (see text overlay section above)</li>
<li>Add music bed on Audio Track 2</li>
<li>Mix in Fairlight</li>
<li>Export as <code>crown-vertical-v10.mov</code></li>
</ol>
<p><strong>For the Walking Tour 60s edit (future):</strong></p>
<pre><code class="language-bash">python3 projects/content-agent/scripts/resolve_push.py \\
  --plan projects/content-agent/edit-plans/crown-walking-tour.json \\
  --timeline-name &quot;Crown Walking Tour v1&quot;
</code></pre>
<p>This will push the 14-clip, 60s walking tour timeline directly into Resolve. The edit plan already exists at <code>projects/content-agent/edit-plans/crown-walking-tour.json</code>.</p>
<h3>Resolve Push Readiness Check</h3>
<table>
<thead>
<tr>
<th>Requirement</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Script exists</td>
<td>YES (<code>projects/content-agent/scripts/resolve_push.py</code>)</td>
</tr>
<tr>
<td>Edit plan JSON exists</td>
<td>YES (walking tour). Not needed for v10 (v9 is a single .mov).</td>
</tr>
<tr>
<td>Resolve installed</td>
<td>Likely YES (referenced throughout guides)</td>
</tr>
<tr>
<td>External Scripting enabled</td>
<td>UNKNOWN (Patrik must verify in Preferences)</td>
</tr>
<tr>
<td>Scripting modules installed</td>
<td>UNKNOWN (check: <code>ls /Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/</code>)</td>
</tr>
<tr>
<td>SS8TB mounted</td>
<td>UNKNOWN (check: <code>ls /Volumes/SS8TB/</code>)</td>
</tr>
</tbody></table>
<hr>
<h2>4. v10 PRODUCTION CHECKLIST</h2>
<h3>For Patrik in Resolve</h3>
<ul>
<li><input disabled="" type="checkbox"> Open <code>crown-vertical-v9.mov</code> from Desktop in Resolve</li>
<li><input disabled="" type="checkbox"> Confirm Ambition phone number for CTA text</li>
<li><input disabled="" type="checkbox"> Add 6 text overlays (Fusion or manual titles) per plan above</li>
<li><input disabled="" type="checkbox"> Source or generate music bed (Suno or free library)</li>
<li><input disabled="" type="checkbox"> Add music on Audio Track 2, trim to 27s</li>
<li><input disabled="" type="checkbox"> Set music ducking: auto-duck under speech at 4.0-7.0s</li>
<li><input disabled="" type="checkbox"> Fade music out starting at 24s</li>
<li><input disabled="" type="checkbox"> Mix levels in Fairlight per the table above</li>
<li><input disabled="" type="checkbox"> Loudnorm target: I=-16, TP=-1.5, LRA=11</li>
<li><input disabled="" type="checkbox"> Export as <code>crown-vertical-v10.mov</code> (ProRes LT, 1080x1920, 24fps)</li>
<li><input disabled="" type="checkbox"> Send to Gemini for final 10/10 confirmation</li>
</ul>
<h3>For Cleo (automated path, if Patrik prefers)</h3>
<p>If Patrik wants Cleo to render the text overlays and music bed via ffmpeg/Python instead of Resolve:</p>
<ol>
<li>Save the JSON config above to <code>projects/content-agent/edit-plans/crown-v10-text-config.json</code></li>
<li>Run: <code>python3 scripts/text-overlay.py crown-vertical-v9.mov crown-vertical-v10-text.mov --config crown-v10-text-config.json</code></li>
<li>Add music: <code>ffmpeg -i crown-vertical-v10-text.mov -i crown-music-bed.mp3 -filter_complex &quot;[1:a]volume=0.25,afade=t=out:st=24:d=3[music];[0:a]volume=1.0[orig];[orig][music]amix=inputs=2:duration=shortest&quot; -c:v copy crown-vertical-v10.mov</code></li>
</ol>
<p><strong>Note:</strong> The Python text overlay approach requires Pillow (<code>pip3 install Pillow</code>). Rendering 27s of text frames at 24fps will take 1-3 minutes.</p>
<hr>
<h2>SUMMARY</h2>
<table>
<thead>
<tr>
<th>Component</th>
<th>Plan</th>
<th>Decision Needed</th>
</tr>
</thead>
<tbody><tr>
<td>Text overlays</td>
<td>6 elements: BEFORE, subtitle, THE PROCESS, AFTER, website CTA, phone CTA</td>
<td>Confirm phone number</td>
</tr>
<tr>
<td>Music bed</td>
<td>Cinematic industrial, 90-110 BPM, 27s, energy curve mapped</td>
<td>Suno generate vs free library</td>
</tr>
<tr>
<td>Resolve integration</td>
<td>Script ready. v10 is a single-file polish, not a multi-clip push. Walking Tour push is queued for next project.</td>
<td>Verify External Scripting enabled</td>
</tr>
<tr>
<td>Render method</td>
<td>Resolve (recommended) or Cleo automated (ffmpeg/Python fallback)</td>
<td>Patrik&#39;s preference</td>
</tr>
</tbody></table>
`,u={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:r,updated:null,summary:d,tags:s,content:a};export{o as agent,n as category,a as content,i as date,r as dateFormatted,u as default,e as slug,d as summary,s as tags,t as title,l as updated};
