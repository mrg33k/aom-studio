const t="Crown HVAC Audio Sync Map",n="crown-room-sync-map",d="Content",r="Cleo",e="2026-03-12",o="Mar 12",g=null,s="Audio sync map for Crown HVAC Service shoot with DJI MIC timecodes.",i=[],a=`<h1>Audio Sync Map: Crown HVAC Service</h1>
<p><strong>Project:</strong> Ambition Mechanical 2026
<strong>Shoot Date:</strong> March 5, 2026
<strong>Created:</strong> March 12, 2026</p>
<hr>
<h2>Summary</h2>
<table>
<thead>
<tr>
<th>Category</th>
<th>Count</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Talking video clips</td>
<td>7 (C0036-C0043)</td>
<td>Camera mic only</td>
</tr>
<tr>
<td>Lav recordings</td>
<td>3 (DJI MIC)</td>
<td>Pre-camera, minimal overlap</td>
</tr>
<tr>
<td>Video clips with lav overlap</td>
<td>1 (C0004)</td>
<td>5.7s establishing shot only</td>
</tr>
<tr>
<td>Clips needing manual sync</td>
<td>0</td>
<td>No sync pairs exist</td>
</tr>
</tbody></table>
<p><strong>Bottom line: There is no lav-to-video sync to perform for this shoot.</strong> The lav recordings and the talking-shot video were recorded at completely different times.</p>
<hr>
<h2>Timeline Alignment (Why There&#39;s No Sync)</h2>
<pre><code>TIME (AZ)    DJI MIC                         RONIN 4D VIDEO
-----------  ------------------------------  --------------------------------
7:48 AM      MIC 1 starts (lav on rooftop)
8:19 AM      MIC 1 ends / MIC 2 starts
8:43 AM      MIC 2 ends
8:48 AM      MIC 3 starts
8:50 AM      |                               C0004 starts (Crown Room)
8:55 AM      MIC 3 ends                      C0005 still rolling
9:24 AM                                      C0035 ends (Crown Room done)
9:27 AM                                      Drone flights begin
9:48 AM                                      C0036 starts (Memorial Tower)
9:52 AM                                      C0037 HERO starts
10:10 AM                                     C0069 ends (all done)
</code></pre>
<p><strong>The lav was clipped to the crew member&#39;s body from 7:48-8:55 AM</strong> during early morning setup work. The camera didn&#39;t start rolling until 8:50 AM, and the main talking shots at Memorial Tower happened 9:48-10:10 AM, nearly an hour after the lav was turned off.</p>
<hr>
<h2>Detailed Lav Recording Analysis</h2>
<h3>DJI_11_20260305_074859.WAV (Lav Recording 1)</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Duration</td>
<td>30:46</td>
</tr>
<tr>
<td>Time window</td>
<td>7:48 - 8:19 AM</td>
</tr>
<tr>
<td>Format</td>
<td>PCM 32-bit float, 48kHz, mono</td>
</tr>
<tr>
<td>Size</td>
<td>338 MB</td>
</tr>
<tr>
<td>Overall mean</td>
<td>-36.9 dB</td>
</tr>
<tr>
<td>Overall max</td>
<td>0.0 dB (clipping at some point)</td>
</tr>
</tbody></table>
<p><strong>Speech Activity Map (60s segments, speech band 300-3000Hz):</strong></p>
<table>
<thead>
<tr>
<th>Time in File</th>
<th>AZ Clock</th>
<th>Speech Band Mean</th>
<th>Assessment</th>
</tr>
</thead>
<tbody><tr>
<td>0:00-1:00</td>
<td>7:48-7:49</td>
<td>-40.5 dB</td>
<td>Quiet. Mic warmup/setup.</td>
</tr>
<tr>
<td>1:00-2:00</td>
<td>7:49-7:50</td>
<td>-47.5 dB</td>
<td>Very quiet.</td>
</tr>
<tr>
<td>2:00-3:00</td>
<td>7:50-7:51</td>
<td>-47.0 dB</td>
<td>Very quiet.</td>
</tr>
<tr>
<td>3:00-4:00</td>
<td>7:51-7:52</td>
<td>-50.9 dB</td>
<td>Near silence.</td>
</tr>
<tr>
<td>4:00-5:00</td>
<td>7:52-7:53</td>
<td>-38.7 dB</td>
<td>Some activity (footsteps, rustling).</td>
</tr>
<tr>
<td>5:00-6:00</td>
<td>7:53-7:54</td>
<td>-47.8 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>6:00-7:00</td>
<td>7:54-7:55</td>
<td>-39.5 dB</td>
<td>Light activity.</td>
</tr>
<tr>
<td>7:00-8:00</td>
<td>7:55-7:56</td>
<td>-54.1 dB</td>
<td>Near silence.</td>
</tr>
<tr>
<td>8:00-9:00</td>
<td>7:56-7:57</td>
<td>-54.8 dB</td>
<td>Near silence.</td>
</tr>
<tr>
<td>9:00-10:00</td>
<td>7:57-7:58</td>
<td>-46.1 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>10:00-11:00</td>
<td>7:58-7:59</td>
<td>-48.6 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>11:00-12:00</td>
<td>7:59-8:00</td>
<td>-38.9 dB</td>
<td>Some activity.</td>
</tr>
<tr>
<td>12:00-13:00</td>
<td>8:00-8:01</td>
<td>-46.1 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td><strong>13:00-14:00</strong></td>
<td><strong>8:01-8:02</strong></td>
<td><strong>-32.1 dB</strong></td>
<td><strong>SPEECH. Conversation between crew members.</strong></td>
</tr>
<tr>
<td><strong>14:00-15:00</strong></td>
<td><strong>8:02-8:03</strong></td>
<td><strong>-31.5 dB</strong></td>
<td><strong>SPEECH continues. Best segment of this recording.</strong></td>
</tr>
<tr>
<td>15:00-16:00</td>
<td>8:03-8:04</td>
<td>-42.9 dB</td>
<td>Died down.</td>
</tr>
<tr>
<td>16:00-17:00</td>
<td>8:04-8:05</td>
<td>-43.5 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>17:00-18:00</td>
<td>8:05-8:06</td>
<td>-51.1 dB</td>
<td>Near silence.</td>
</tr>
<tr>
<td>18:00-19:00</td>
<td>8:06-8:07</td>
<td>-53.8 dB</td>
<td>Near silence.</td>
</tr>
<tr>
<td>19:00-20:00</td>
<td>8:07-8:08</td>
<td>-50.4 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>20:00-21:00</td>
<td>8:08-8:09</td>
<td>-52.2 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>21:00-22:00</td>
<td>8:09-8:10</td>
<td>-52.6 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>22:00-23:00</td>
<td>8:10-8:11</td>
<td>-51.6 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>23:00-24:00</td>
<td>8:11-8:12</td>
<td>-44.1 dB</td>
<td>Some activity.</td>
</tr>
<tr>
<td>24:00-25:00</td>
<td>8:12-8:13</td>
<td>-43.0 dB</td>
<td>Some activity.</td>
</tr>
<tr>
<td>25:00-26:00</td>
<td>8:13-8:14</td>
<td>-39.0 dB</td>
<td>Activity.</td>
</tr>
<tr>
<td>26:00-27:00</td>
<td>8:14-8:15</td>
<td>-53.7 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>27:00-28:00</td>
<td>8:15-8:16</td>
<td>-53.4 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>28:00-29:00</td>
<td>8:16-8:17</td>
<td>-50.0 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>29:00-30:00</td>
<td>8:17-8:18</td>
<td>-37.8 dB</td>
<td>Activity picks up.</td>
</tr>
<tr>
<td><strong>30:00-30:46</strong></td>
<td><strong>8:18-8:19</strong></td>
<td><strong>-31.4 dB</strong></td>
<td><strong>SPEECH. Likely crew arriving on roof / start of shift handoff.</strong></td>
</tr>
</tbody></table>
<p><strong>Usable speech segments:</strong> 13:00-15:00 (2 min), 30:00-30:46 (46s)
<strong>Potential use:</strong> Ambient work audio under b-roll. If the speech content is relevant (discussing the job, HVAC systems), could be used as voiceover narration.</p>
<hr>
<h3>DJI_11_20260305_081946.WAV (Lav Recording 2)</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Duration</td>
<td>23:44</td>
</tr>
<tr>
<td>Time window</td>
<td>8:19 - 8:43 AM</td>
</tr>
<tr>
<td>Format</td>
<td>PCM 32-bit float, 48kHz, mono</td>
</tr>
<tr>
<td>Size</td>
<td>261 MB</td>
</tr>
<tr>
<td>Overall mean</td>
<td>-23.3 dB</td>
</tr>
<tr>
<td>Overall max</td>
<td>-0.7 dB</td>
</tr>
</tbody></table>
<p><strong>Speech Activity Map:</strong></p>
<table>
<thead>
<tr>
<th>Time in File</th>
<th>AZ Clock</th>
<th>Speech Band Mean</th>
<th>Assessment</th>
</tr>
</thead>
<tbody><tr>
<td><strong>0:00-1:00</strong></td>
<td><strong>8:19-8:20</strong></td>
<td><strong>-32.5 dB</strong></td>
<td><strong>SPEECH. Continuation from MIC 1&#39;s ending conversation.</strong></td>
</tr>
<tr>
<td><strong>1:00-2:00</strong></td>
<td><strong>8:20-8:21</strong></td>
<td><strong>-33.2 dB</strong></td>
<td><strong>SPEECH continues.</strong></td>
</tr>
<tr>
<td>2:00-3:00</td>
<td>8:21-8:22</td>
<td>-35.7 dB</td>
<td>Moderate. Winding down.</td>
</tr>
<tr>
<td>3:00-4:00</td>
<td>8:22-8:23</td>
<td>-40.6 dB</td>
<td>Quiet work sounds.</td>
</tr>
<tr>
<td>4:00-5:00</td>
<td>8:23-8:24</td>
<td>-40.0 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>5:00-6:00</td>
<td>8:24-8:25</td>
<td>-51.4 dB</td>
<td>Near silence.</td>
</tr>
<tr>
<td>6:00-7:00</td>
<td>8:25-8:26</td>
<td>-54.5 dB</td>
<td>Near silence.</td>
</tr>
<tr>
<td>7:00-8:00</td>
<td>8:26-8:27</td>
<td>-50.9 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>8:00-9:00</td>
<td>8:27-8:28</td>
<td>-56.5 dB</td>
<td>Quietest segment.</td>
</tr>
<tr>
<td><strong>9:00-10:00</strong></td>
<td><strong>8:28-8:29</strong></td>
<td><strong>-33.9 dB</strong></td>
<td><strong>SPEECH resumes. New conversation.</strong></td>
</tr>
<tr>
<td><strong>10:00-11:00</strong></td>
<td><strong>8:29-8:30</strong></td>
<td><strong>-32.4 dB</strong></td>
<td><strong>SPEECH. Active talking.</strong></td>
</tr>
<tr>
<td><strong>11:00-12:00</strong></td>
<td><strong>8:30-8:31</strong></td>
<td><strong>-33.4 dB</strong></td>
<td><strong>SPEECH continues.</strong></td>
</tr>
<tr>
<td>12:00-13:00</td>
<td>8:31-8:32</td>
<td>-37.1 dB</td>
<td>Moderate. Some talking.</td>
</tr>
<tr>
<td><strong>13:00-14:00</strong></td>
<td><strong>8:32-8:33</strong></td>
<td><strong>-33.5 dB</strong></td>
<td><strong>SPEECH.</strong></td>
</tr>
<tr>
<td><strong>14:00-15:00</strong></td>
<td><strong>8:33-8:34</strong></td>
<td><strong>-33.0 dB</strong></td>
<td><strong>SPEECH. Sustained conversation.</strong></td>
</tr>
<tr>
<td><strong>15:00-16:00</strong></td>
<td><strong>8:34-8:35</strong></td>
<td><strong>-32.5 dB</strong></td>
<td><strong>SPEECH. Best sustained segment.</strong></td>
</tr>
<tr>
<td>16:00-17:00</td>
<td>8:35-8:36</td>
<td>-36.3 dB</td>
<td>Moderate.</td>
</tr>
<tr>
<td>17:00-18:00</td>
<td>8:36-8:37</td>
<td>-37.0 dB</td>
<td>Moderate.</td>
</tr>
<tr>
<td>18:00-19:00</td>
<td>8:37-8:38</td>
<td>-36.0 dB</td>
<td>Moderate.</td>
</tr>
<tr>
<td><strong>19:00-20:00</strong></td>
<td><strong>8:38-8:39</strong></td>
<td><strong>-33.2 dB</strong></td>
<td><strong>SPEECH resumes.</strong></td>
</tr>
<tr>
<td><strong>20:00-21:00</strong></td>
<td><strong>8:39-8:40</strong></td>
<td><strong>-31.3 dB</strong></td>
<td><strong>SPEECH. Loud/close.</strong></td>
</tr>
<tr>
<td><strong>21:00-22:00</strong></td>
<td><strong>8:40-8:41</strong></td>
<td><strong>-30.7 dB</strong></td>
<td><strong>SPEECH. LOUDEST SEGMENT. Best audio quality in this file.</strong></td>
</tr>
<tr>
<td>22:00-23:00</td>
<td>8:41-8:42</td>
<td>-35.8 dB</td>
<td>Moderate.</td>
</tr>
<tr>
<td>23:00-23:44</td>
<td>8:42-8:43</td>
<td>-45.1 dB</td>
<td>Quiet. Winding down.</td>
</tr>
</tbody></table>
<p><strong>Usable speech segments:</strong></p>
<ul>
<li>0:00-2:00 (2 min) -- continuation conversation</li>
<li>9:00-16:00 (7 min) -- extended work discussion, best sustained block</li>
<li>19:00-22:00 (3 min) -- loudest/clearest speech</li>
</ul>
<p><strong>This is the most content-rich lav recording.</strong> ~12 minutes of usable speech across three blocks. The 21:00-22:00 segment (8:40-8:41 AM real time) has the best audio levels.</p>
<hr>
<h3>DJI_12_20260305_084830.WAV (Lav Recording 3)</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>Duration</td>
<td>6:47</td>
</tr>
<tr>
<td>Time window</td>
<td>8:48 - 8:55 AM</td>
</tr>
<tr>
<td>Format</td>
<td>PCM 32-bit float, 48kHz, mono</td>
</tr>
<tr>
<td>Size</td>
<td>74 MB</td>
</tr>
<tr>
<td>Overall mean</td>
<td>-25.7 dB</td>
</tr>
<tr>
<td>Overall max</td>
<td>0.0 dB (clipping)</td>
</tr>
</tbody></table>
<p><strong>Speech Activity Map (30s segments):</strong></p>
<table>
<thead>
<tr>
<th>Time in File</th>
<th>AZ Clock</th>
<th>Speech Band Mean</th>
<th>Assessment</th>
</tr>
</thead>
<tbody><tr>
<td><strong>0:00-0:30</strong></td>
<td><strong>8:48-8:48:30</strong></td>
<td><strong>-27.1 dB</strong></td>
<td><strong>SPEECH. Active.</strong></td>
</tr>
<tr>
<td><strong>0:30-1:00</strong></td>
<td><strong>8:48:30-8:49</strong></td>
<td><strong>-25.2 dB</strong></td>
<td><strong>SPEECH. Strong.</strong></td>
</tr>
<tr>
<td><strong>1:00-1:30</strong></td>
<td><strong>8:49-8:49:30</strong></td>
<td><strong>-23.9 dB</strong></td>
<td><strong>SPEECH. Loud, close.</strong></td>
</tr>
<tr>
<td><strong>1:30-2:00</strong></td>
<td><strong>8:49:30-8:50</strong></td>
<td><strong>-24.7 dB</strong></td>
<td><strong>SPEECH continues.</strong></td>
</tr>
<tr>
<td><strong>2:00-2:30</strong></td>
<td><strong>8:50-8:50:30</strong></td>
<td><strong>-23.0 dB</strong></td>
<td><strong>SPEECH. LOUDEST. Overlaps with C0004 start (8:50 AM).</strong></td>
</tr>
<tr>
<td><strong>2:30-3:00</strong></td>
<td><strong>8:50:30-8:51</strong></td>
<td><strong>-24.6 dB</strong></td>
<td><strong>SPEECH.</strong></td>
</tr>
<tr>
<td>3:00-3:30</td>
<td>8:51-8:51:30</td>
<td>-28.6 dB</td>
<td>Moderate.</td>
</tr>
<tr>
<td><strong>3:30-4:00</strong></td>
<td><strong>8:51:30-8:52</strong></td>
<td><strong>-25.2 dB</strong></td>
<td><strong>SPEECH pickup.</strong></td>
</tr>
<tr>
<td>4:00-4:30</td>
<td>8:52-8:52:30</td>
<td>-28.5 dB</td>
<td>Moderate.</td>
</tr>
<tr>
<td>4:30-5:00</td>
<td>8:52:30-8:53</td>
<td>-29.7 dB</td>
<td>Moderate.</td>
</tr>
<tr>
<td>5:00-5:30</td>
<td>8:53-8:53:30</td>
<td>-35.4 dB</td>
<td>Quiet. Speech ending.</td>
</tr>
<tr>
<td>5:30-6:00</td>
<td>8:53:30-8:54</td>
<td>-33.1 dB</td>
<td>Quiet.</td>
</tr>
<tr>
<td>6:00-6:30</td>
<td>8:54-8:54:30</td>
<td>-31.1 dB</td>
<td>Low activity.</td>
</tr>
<tr>
<td>6:30-6:47</td>
<td>8:54:30-8:55</td>
<td>-39.1 dB</td>
<td>Near silence. Mic about to be removed.</td>
</tr>
</tbody></table>
<p><strong>Usable speech segments:</strong> 0:00-3:30 (3.5 min) -- strong sustained speech
<strong>C0004 overlap:</strong> At file offset ~2:07, C0004 was recording (8:50:37 AM). The lav has loud speech at this point but C0004 is only a 5.7-second truck establishing shot, not a talking shot. The sync would work but provides no editorial value.</p>
<hr>
<h2>The Only Sync Pair</h2>
<table>
<thead>
<tr>
<th>Video</th>
<th>Lav File</th>
<th>Offset into Lav</th>
<th>Confidence</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>C0004 (5.7s)</td>
<td>DJI_12_084830</td>
<td>~2:07</td>
<td>Timestamp-based (moderate)</td>
<td><strong>LOW.</strong> C0004 is a truck shot, not a talking shot. The lav audio at this moment is talking, but it&#39;s not the person on screen.</td>
</tr>
</tbody></table>
<p><strong>Recommendation:</strong> Don&#39;t bother syncing. The lav speech doesn&#39;t match what&#39;s happening on camera.</p>
<hr>
<h2>Audio Strategy for the Edit</h2>
<h3>For Talking Shots (Camera Mic Only)</h3>
<p>All Memorial Tower talking shots (C0036-C0043) rely on the Ronin 4D&#39;s on-board mic. The audio is:</p>
<ul>
<li><strong>Usable</strong> but room-heavy (mechanical room reverb + HVAC hum)</li>
<li><strong>Best quality:</strong> C0042 (-17.7 dB mean, -6.7 max) and C0043 (-16.5 dB mean, -5.0 max). These Trane panel clips have the clearest speech.</li>
<li><strong>Hero clip audio:</strong> C0037 is best at 1:00-1:50 (-21.8 to -24.3 dB speech band). Before and after this window, audio is weaker.</li>
</ul>
<p><strong>Resolve Fairlight processing recommended:</strong></p>
<ol>
<li>High-pass at 80Hz (cut mechanical room rumble)</li>
<li>Noise reduction (Resolve&#39;s built-in or iZotope) targeting the constant HVAC hum</li>
<li>Light compression (3:1, threshold around -20 dB) to even out speech</li>
<li>De-reverb if available (the mechanical room is reflective)</li>
</ol>
<h3>For B-Roll Audio</h3>
<p>The Crown Room exterior clips have authentic rooftop work sounds:</p>
<ul>
<li>C0006: Tool impacts, fan disassembly</li>
<li>C0025-C0030: Duct work, assembly sounds, metal-on-metal</li>
<li>C0034: Kitchen ambient</li>
</ul>
<p>These are good candidates for natural sound design under the edit. Layer them at -12 to -18 dB under music.</p>
<h3>For Supplemental Audio (DJI MIC)</h3>
<p>If the lav speech content is editorially relevant (crew discussing the job, HVAC systems, plans), the best segments to review are:</p>
<ul>
<li><strong>MIC 2, 21:00-22:00</strong> (8:40-8:41 AM) -- loudest, clearest speech</li>
<li><strong>MIC 2, 9:00-16:00</strong> (8:28-8:35 AM) -- longest sustained block</li>
<li><strong>MIC 3, 0:00-3:30</strong> (8:48-8:51 AM) -- strong pre-camera speech</li>
</ul>
<p>Listen to these in Resolve. If there&#39;s a usable quote or explanation, it could work as voiceover under b-roll. Otherwise, use for ambient texture.</p>
<hr>
<h2>File Reference (Full Paths)</h2>
<h3>Ronin4D (Original)</h3>
<p><code>/Volumes/SS8TB/Ambition Mechanical Services/20260305 Crown/Ronin4D/B006C[XXXX]_260305_HL9406.MOV</code></p>
<h3>DJI MIC (Original)</h3>
<ul>
<li><code>/Volumes/SS8TB/Ambition Mechanical Services/20260305 Crown/DJI MIC/DJI_11_20260305_074859.WAV</code></li>
<li><code>/Volumes/SS8TB/Ambition Mechanical Services/20260305 Crown/DJI MIC/DJI_11_20260305_081946.WAV</code></li>
<li><code>/Volumes/SS8TB/Ambition Mechanical Services/20260305 Crown/DJI MIC/DJI_12_20260305_084830.WAV</code></li>
</ul>
<h3>Drone (Original)</h3>
<p><code>/Volumes/SS8TB/Ambition Mechanical Services/20260305 Crown/DRONE AIR3/DJI_20260305[HHMMSS]_00[XX]_D.MP4</code></p>
<h3>Organized (Copies)</h3>
<p><code>/Volumes/SS8TB/Ambition Mechanical Services/20260305 Crown/organized/</code></p>
<ul>
<li><code>Crown-Room/</code> -- 47 files (b-roll + audio-lav)</li>
<li><code>Memorial-Tower/</code> -- 34 files (talking-shots + b-roll)</li>
</ul>
`,l={title:t,slug:n,category:d,agent:r,date:e,dateFormatted:o,updated:null,summary:s,tags:i,content:a};export{r as agent,d as category,a as content,e as date,o as dateFormatted,l as default,n as slug,s as summary,i as tags,t as title,g as updated};
