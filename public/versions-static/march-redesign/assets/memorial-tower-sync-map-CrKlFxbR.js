const t="Memorial Tower Audio Sync Map",n="memorial-tower-sync-map",d="Content",r="Cleo",e="2026-03-12",o="Mar 12",l=null,s="DJI MIC audio-to-video sync map for the Memorial Tower project.",a=[],i=`<h1>Memorial Tower - Audio Sync Map</h1>
<p><strong>Purpose:</strong> Map DJI MIC audio files to video clips for DaVinci Resolve sync.
<strong>Generated:</strong> 2026-03-12
<strong>Method:</strong> Timestamp correlation between DJI MIC filenames (which encode start time) and Ronin 4D creation timestamps.</p>
<hr>
<h2>How to Use This in DaVinci Resolve</h2>
<ol>
<li>Import both the video clips and the DJI MIC WAV files listed below</li>
<li>Place the DJI MIC WAV on an audio track</li>
<li>Use Resolve&#39;s &quot;Auto Sync Audio&quot; (right-click clip &gt; Auto Sync Audio Based on Waveform) for automatic alignment</li>
<li>OR use the timestamp offsets below for manual placement</li>
<li>Once synced, mute the camera scratch audio track and use the DJI MIC as primary</li>
</ol>
<p><strong>Important:</strong> DJI MIC files are 32-bit float WAV. Resolve handles these natively. The dynamic range is massive, so normalize to -3dB to -6dB peak before mixing.</p>
<hr>
<h2>Date: January 8, 2026 (20260108)</h2>
<h3>DJI MIC Session 1: DJI_08_20260108_071713.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI MIC/DJI_08_20260108_071713.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>1:35</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>7:17:13 AM MST (14:17:13 UTC)</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~7:18:48 AM MST (14:18:48 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-32.4 dB</td>
</tr>
<tr>
<td><strong>Format</strong></td>
<td>48kHz, 32-bit float, mono</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips:</strong> NONE directly. This recording ends at ~14:18 UTC, but the first Ronin4D clip (C0003) starts at 14:26 UTC. This was likely a pre-shoot mic check or ambient recording.</p>
<hr>
<h3>DJI MIC Session 2: DJI_09_20260108_072559.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI MIC/DJI_09_20260108_072559.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>9:03</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>7:25:59 AM MST (14:25:59 UTC)</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~7:35:02 AM MST (14:35:02 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-33.1 dB</td>
</tr>
<tr>
<td><strong>Format</strong></td>
<td>48kHz, 32-bit float, mono</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips:</strong></p>
<table>
<thead>
<tr>
<th>Video Clip</th>
<th>Created (UTC)</th>
<th>Duration</th>
<th>Offset in MIC</th>
<th>Audio Level</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>A001C0003</td>
<td>14:26:07</td>
<td>0:20</td>
<td>0:08</td>
<td>mean:-35.8</td>
<td>First clip, ambient</td>
</tr>
<tr>
<td>A001C0004</td>
<td>14:26:44</td>
<td>0:04</td>
<td>0:45</td>
<td>mean:-30.5</td>
<td>Short</td>
</tr>
<tr>
<td>A001C0005</td>
<td>14:26:58</td>
<td>0:05</td>
<td>0:59</td>
<td>mean:-32.1</td>
<td>Short</td>
</tr>
<tr>
<td>A001C0006</td>
<td>14:28:00</td>
<td>0:18</td>
<td>2:01</td>
<td>mean:-44.5</td>
<td>Quiet</td>
</tr>
<tr>
<td>A001C0007</td>
<td>14:28:31</td>
<td>0:08</td>
<td>2:32</td>
<td>mean:-44.8</td>
<td>Quiet</td>
</tr>
<tr>
<td>A001C0008</td>
<td>14:28:57</td>
<td>0:04</td>
<td>2:58</td>
<td>mean:-41.1</td>
<td></td>
</tr>
<tr>
<td>A001C0009</td>
<td>14:29:41</td>
<td>0:12</td>
<td>3:42</td>
<td>mean:-41.6</td>
<td></td>
</tr>
<tr>
<td>A001C0010</td>
<td>14:30:26</td>
<td>0:04</td>
<td>4:27</td>
<td>mean:-40.9</td>
<td></td>
</tr>
<tr>
<td>A001C0011</td>
<td>14:31:30</td>
<td>0:34</td>
<td>5:31</td>
<td>mean:-45.1</td>
<td>Quiet work</td>
</tr>
<tr>
<td>A001C0012</td>
<td>14:32:32</td>
<td>2:17</td>
<td>6:33</td>
<td>mean:-35.3, max:-1.0</td>
<td><strong>TALKING</strong> - peaks near clipping</td>
</tr>
</tbody></table>
<p><strong>Resolve Sync Instructions:</strong></p>
<ul>
<li>Place DJI_09 WAV on audio track starting at the same timecode as C0003 minus 8 seconds</li>
<li>The offset for each clip = clip creation time minus DJI_09 start time (14:25:59)</li>
<li>C0012 is the primary target for clean audio from this session</li>
<li>After C0012 ends (~14:34:49), the MIC still has ~18 seconds of recording</li>
</ul>
<hr>
<h3>DJI MIC Session 3: DJI_10_20260108_114416.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI MIC/DJI_10_20260108_114416.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>12:55</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>11:44:16 AM MST (18:44:16 UTC)</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~11:57:12 AM MST (18:57:12 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-32.9 dB</td>
</tr>
<tr>
<td><strong>Format</strong></td>
<td>48kHz, 32-bit float, mono</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips:</strong> NO DIRECT MATCH. The Ronin4D clips from this date have creation times in two windows:</p>
<ul>
<li>Morning: 14:26-15:29 UTC (7:26-8:29 AM)</li>
<li>Late morning: 16:24-17:48 UTC (9:24-10:48 AM)</li>
<li>Afternoon: 19:45-20:07 UTC (12:45-1:07 PM)</li>
</ul>
<p>DJI_10 covers 18:44-18:57 UTC, which falls between the late morning and afternoon video sessions. No Ronin4D clips were recorded during this window. The mic was running but the camera was off. This audio may contain conversation/planning between takes or during a break.</p>
<p><strong>Possible use:</strong> Check if there&#39;s useful dialogue (project discussion, plans, crew conversation) that could be used as voiceover.</p>
<hr>
<h3>DJI MIC Session 4: DJI_11_20260108_115712.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI MIC/DJI_11_20260108_115712.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>0:07</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>11:57:12 AM MST (18:57:12 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-32.1 dB</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips:</strong> NONE. 7-second recording. Mic restart/check.</p>
<hr>
<h3>DJI MIC Session 5: DJI_12_20260108_115720.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI MIC/DJI_12_20260108_115720.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>6:10</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>11:57:20 AM MST (18:57:20 UTC)</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~12:03:30 PM MST (19:03:30 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-33.3 dB</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips:</strong> NO DIRECT MATCH. Ends at 19:03 UTC, but afternoon video session starts at 19:45 UTC (42-minute gap). Same situation as DJI_10 above. Audio-only recording during non-filming time.</p>
<hr>
<h3>0108 Summary</h3>
<ul>
<li><strong>Only DJI_09 has direct video overlap</strong> (C0003-C0012 morning session)</li>
<li>The afternoon talking clips (C0113-C0124, including the important C0123 at 4:11) do NOT have DJI MIC coverage</li>
<li>The loudest talking clips (C0024, C0048) were recorded after DJI_09 ended</li>
<li>For clips without DJI MIC, camera scratch audio is the only option</li>
<li>Consider using Resolve&#39;s auto-sync as a backup verification of the timestamp-based mapping</li>
</ul>
<hr>
<h2>Date: January 13, 2026 (20260113)</h2>
<h3>DJI MIC Session 1: DJI_01_20260113_111718.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI_01_20260113_111718.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>30:45</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>11:17:18 AM MST (18:17:18 UTC)</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~11:48:03 AM MST (18:48:03 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-34.5 dB</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips:</strong> Need creation timestamps from B002 clips to map precisely. Based on the DJI MIC filename pattern (DJI_01 = transmitter 1), this 30-minute recording should overlap with multiple B002 clips.</p>
<p><strong>Likely matches (by audio level correlation):</strong></p>
<ul>
<li><strong>B002C0005</strong> (2:21, mean:-19.4) - <strong>STRONG TALKING</strong></li>
<li><strong>B002C0006</strong> (1:43, mean:-20.7) - <strong>STRONG TALKING</strong></li>
<li><strong>B002C0012</strong> (5:28, mean:-16.9) - <strong>INTERVIEW</strong></li>
<li><strong>B002C0013</strong> (4:44, mean:-17.2) - <strong>INTERVIEW</strong></li>
</ul>
<hr>
<h3>DJI MIC Session 2: DJI_01_20260113_114808.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI_01_20260113_114808.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>28:00</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>11:48:08 AM MST (18:48:08 UTC)</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~12:16:08 PM MST (19:16:08 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-29.4 dB (louder than session 1)</td>
</tr>
</tbody></table>
<p><strong>Likely matches:</strong></p>
<ul>
<li><strong>B002C0018</strong> (0:54, mean:-10.6) - <strong>HOTTEST CLIP</strong> on this date, very likely during this louder session</li>
</ul>
<h3>0113 Sync Strategy</h3>
<p>The two MIC recordings are nearly back-to-back (session 1 ends ~11:48, session 2 starts 11:48). Combined they cover ~59 minutes of the shoot.</p>
<p><strong>In Resolve:</strong></p>
<ol>
<li>Import both WAV files</li>
<li>Place session 1 WAV and mark timestamp 11:17:18</li>
<li>Place session 2 WAV starting at 11:48:08</li>
<li>Use Resolve&#39;s auto-sync on the talking clips (B002C0005, C0006, C0012, C0013, C0018) to find exact offset</li>
<li>The MIC audio will be dramatically cleaner than camera scratch audio on these ProRes clips</li>
</ol>
<hr>
<h2>Date: January 14, 2026 (20260114)</h2>
<h3>DJI MIC Session: DJI_03_20260114_074937.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI_03_20260114_074937.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>30:22</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>7:49:37 AM MST (14:49:37 UTC)</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~8:19:59 AM MST (15:19:59 UTC)</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-31.6 dB</td>
</tr>
<tr>
<td><strong>Transmitter</strong></td>
<td>DJI_03 (transmitter 3, different from 0113&#39;s DJI_01)</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips (by audio level, primary targets):</strong></p>
<ul>
<li><strong>B003C0016</strong> (0:10, mean:-31.1) - Possible talking</li>
<li><strong>B003C0017</strong> (0:17, mean:-32.1) - Possible talking</li>
<li><strong>B003C0018</strong> (6:41, mean:-30.1) - <strong>EXTENDED INTERVIEW</strong> - highest priority for sync</li>
<li><strong>B003C0024</strong> (3:29, mean:-26.6) - <strong>STRONG TALKING</strong> - second priority</li>
</ul>
<h3>0114 Sync Strategy</h3>
<p>Single 30-minute MIC recording should cover all primary clips since the shoot appears to have been a morning session.</p>
<p><strong>In Resolve:</strong></p>
<ol>
<li>Import DJI_03 WAV</li>
<li>Use auto-sync on B003C0018 first (longest, most audio content, best match candidate)</li>
<li>Once B003C0018 offset is found, apply same timeline offset to all other B003 clips</li>
<li>Verify with auto-sync on B003C0024</li>
</ol>
<hr>
<h2>Date: January 16, 2026 (20260116)</h2>
<h3>DJI MIC Session: DJI_01_20260116_075644.WAV</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td><strong>File</strong></td>
<td><code>DJI_01_20260116_075644.WAV</code></td>
</tr>
<tr>
<td><strong>Duration</strong></td>
<td>1:59</td>
</tr>
<tr>
<td><strong>Start Time</strong></td>
<td>7:56:44 AM MST</td>
</tr>
<tr>
<td><strong>End Time</strong></td>
<td>~7:58:43 AM MST</td>
</tr>
<tr>
<td><strong>Mean Volume</strong></td>
<td>-29.4 dB (loud)</td>
</tr>
</tbody></table>
<p><strong>Matching Video Clips:</strong></p>
<ul>
<li><strong>B005C0001</strong> (2:12, mean:-36.2) - Primary match. MIC is only 1:59, so it covers most but not all of B005C0001.</li>
<li><strong>B005C0002</strong> (0:31, mean:-39.1) - May partially overlap.</li>
</ul>
<h3>0116 Sync Strategy</h3>
<p>Short session. Place the MIC WAV and sync to B005C0001. The MIC recording is louder (mean -29.4) than the camera audio (mean -36.2), confirming it captured closer/cleaner audio.</p>
<hr>
<h2>Dates Without DJI MIC</h2>
<h3>August 10, 2025 (20250810)</h3>
<p>No DJI MIC. Camera scratch audio only. The talking clips (C0018-C0022, C0024-C0025) have audio at mean -27 to -30 dB from the Ronin 4D onboard mic. This may be usable but will have more room/construction noise.</p>
<h3>September 8, 2025 (20250908)</h3>
<p>No DJI MIC. Camera scratch audio from Ronin 4D (PCM 24-bit stereo) and S5 IIX (PCM 24-bit). The AUDIO folder contains pre-rendered edits, not raw MIC recordings. Talking clips (A020C0019, C0048, C0068, C0072) rely on scratch audio only.</p>
<h3>January 21, 2026 (20260121)</h3>
<p>No DJI MIC. BlackMagic Camera App clips have AAC audio (compressed). The consistently loud audio (mean -23 to -28 dB) suggests the phone was close to the speaker, so quality may still be decent despite AAC compression.</p>
<h3>January 22, 2026 (20260122)</h3>
<p>Single iPhone clip. No MIC needed.</p>
<hr>
<h2>Master Sync Priority List</h2>
<p>Ranked by how important it is to get clean DJI MIC audio synced:</p>
<table>
<thead>
<tr>
<th>Priority</th>
<th>Video Clip</th>
<th>Date</th>
<th>Duration</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>B002C0012</td>
<td>0113</td>
<td>5:28</td>
<td>Interview, DJI_01 session 1 available</td>
</tr>
<tr>
<td>2</td>
<td>B002C0013</td>
<td>0113</td>
<td>4:44</td>
<td>Interview, DJI_01 session 1 available</td>
</tr>
<tr>
<td>3</td>
<td>B003C0018</td>
<td>0114</td>
<td>6:41</td>
<td>Longest interview, DJI_03 available</td>
</tr>
<tr>
<td>4</td>
<td>B003C0024</td>
<td>0114</td>
<td>3:29</td>
<td>Strong talking, DJI_03 available</td>
</tr>
<tr>
<td>5</td>
<td>B002C0005</td>
<td>0113</td>
<td>2:21</td>
<td>Talking, DJI_01 session 1 available</td>
</tr>
<tr>
<td>6</td>
<td>B002C0006</td>
<td>0113</td>
<td>1:43</td>
<td>Talking, DJI_01 session 1 available</td>
</tr>
<tr>
<td>7</td>
<td>B002C0018</td>
<td>0113</td>
<td>0:54</td>
<td>Hottest audio, DJI_01 session 2 available</td>
</tr>
<tr>
<td>8</td>
<td>A001C0012</td>
<td>0108</td>
<td>2:17</td>
<td>Talking, DJI_09 available</td>
</tr>
<tr>
<td>9</td>
<td>B005C0001</td>
<td>0116</td>
<td>2:12</td>
<td>Some talking, DJI_01 available</td>
</tr>
<tr>
<td>10</td>
<td>A001C0024</td>
<td>0108</td>
<td>4:20</td>
<td>Interview, but NO DJI MIC coverage (recorded after DJI_09 ended)</td>
</tr>
<tr>
<td>11</td>
<td>A001C0123</td>
<td>0108</td>
<td>4:11</td>
<td>Interview, but NO DJI MIC coverage (afternoon session, no MIC)</td>
</tr>
</tbody></table>
<hr>
<h2>Quick Reference: All DJI MIC Files</h2>
<table>
<thead>
<tr>
<th>File</th>
<th>Date</th>
<th>Duration</th>
<th>Start Time (MST)</th>
<th>Transmitter</th>
</tr>
</thead>
<tbody><tr>
<td>DJI_08_20260108_071713.WAV</td>
<td>Jan 8</td>
<td>1:35</td>
<td>7:17 AM</td>
<td>TX 08</td>
</tr>
<tr>
<td>DJI_09_20260108_072559.WAV</td>
<td>Jan 8</td>
<td>9:03</td>
<td>7:25 AM</td>
<td>TX 09</td>
</tr>
<tr>
<td>DJI_10_20260108_114416.WAV</td>
<td>Jan 8</td>
<td>12:55</td>
<td>11:44 AM</td>
<td>TX 10</td>
</tr>
<tr>
<td>DJI_11_20260108_115712.WAV</td>
<td>Jan 8</td>
<td>0:07</td>
<td>11:57 AM</td>
<td>TX 11</td>
</tr>
<tr>
<td>DJI_12_20260108_115720.WAV</td>
<td>Jan 8</td>
<td>6:10</td>
<td>11:57 AM</td>
<td>TX 12</td>
</tr>
<tr>
<td>DJI_01_20260113_111718.WAV</td>
<td>Jan 13</td>
<td>30:45</td>
<td>11:17 AM</td>
<td>TX 01</td>
</tr>
<tr>
<td>DJI_01_20260113_114808.WAV</td>
<td>Jan 13</td>
<td>28:00</td>
<td>11:48 AM</td>
<td>TX 01</td>
</tr>
<tr>
<td>DJI_03_20260114_074937.WAV</td>
<td>Jan 14</td>
<td>30:22</td>
<td>7:49 AM</td>
<td>TX 03</td>
</tr>
<tr>
<td>DJI_01_20260116_075644.WAV</td>
<td>Jan 16</td>
<td>1:59</td>
<td>7:56 AM</td>
<td>TX 01</td>
</tr>
</tbody></table>
<p>Total DJI MIC recording time: ~92 minutes across 4 dates.</p>
`,h={title:t,slug:n,category:d,agent:r,date:e,dateFormatted:o,updated:null,summary:s,tags:a,content:i};export{r as agent,d as category,i as content,e as date,o as dateFormatted,h as default,n as slug,s as summary,a as tags,t as title,l as updated};
