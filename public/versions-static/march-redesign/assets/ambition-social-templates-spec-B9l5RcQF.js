const e="Ambition Social Media Templates Spec",o="ambition-social-templates-spec",n="Design Specs",t="Steffen",d="2026-03-13",c="Mar 13",a=null,i="Social media templates and video overlay specs for Ambition Mechanical content.",r=[],l=`<h1>Ambition Mechanical: Social Media Templates + Video Overlay Spec</h1>
<blockquote>
<p>Steffen (SS) | 2026-03-13
For: Cleo (video overlays), Tony (social templates), Bobby (if building template components)
Status: COMPLETE
Brand system: Ambition v3. Navy + Red + White. Barlow Condensed + Inter.</p>
</blockquote>
<hr>
<h2>Design Foundation</h2>
<p>Every template in this spec is derived from the Ambition v3 brand system. Zero deviations.</p>
<h3>Color Tokens (Locked)</h3>
<table>
<thead>
<tr>
<th>Token</th>
<th>Hex</th>
<th>Usage in Templates</th>
</tr>
</thead>
<tbody><tr>
<td>Navy Dark</td>
<td><code>#0a0e2a</code></td>
<td>Solid backgrounds for graphics, overlay panels</td>
</tr>
<tr>
<td>Navy 800</td>
<td><code>#111638</code></td>
<td>Card backgrounds on dark sections</td>
</tr>
<tr>
<td>Navy 700</td>
<td><code>#1a1f45</code></td>
<td>Secondary panels, input fields</td>
</tr>
<tr>
<td>Navy 600</td>
<td><code>#1a237e</code></td>
<td>Primary brand color, headlines on light BGs</td>
</tr>
<tr>
<td>Ambition Red</td>
<td><code>#dc2626</code></td>
<td>CTAs, accent lines, kickers, urgency</td>
</tr>
<tr>
<td>Red Light</td>
<td><code>#ef4444</code></td>
<td>Hover states, gradient endpoints</td>
</tr>
<tr>
<td>White</td>
<td><code>#ffffff</code></td>
<td>Text on dark, light section backgrounds</td>
</tr>
<tr>
<td>Off-White</td>
<td><code>#f8fafc</code></td>
<td>Alternating light sections</td>
</tr>
<tr>
<td>Light Gray</td>
<td><code>#f3f4f6</code></td>
<td>Card backgrounds on light sections</td>
</tr>
<tr>
<td>Steel Gray</td>
<td><code>#374151</code></td>
<td>Body text on light backgrounds</td>
</tr>
<tr>
<td>Mid Gray</td>
<td><code>#d1d5db</code></td>
<td>Body text on dark backgrounds</td>
</tr>
<tr>
<td>Dim Gray</td>
<td><code>#9ca3af</code></td>
<td>Tertiary text, metadata</td>
</tr>
</tbody></table>
<h3>Typography Tokens (Locked)</h3>
<table>
<thead>
<tr>
<th>Role</th>
<th>Font</th>
<th>Weight</th>
<th>Tracking</th>
<th>Case</th>
</tr>
</thead>
<tbody><tr>
<td>Display</td>
<td>Barlow Condensed</td>
<td>800 (ExtraBold)</td>
<td>0.04em</td>
<td>UPPERCASE</td>
</tr>
<tr>
<td>Section Title</td>
<td>Barlow Condensed</td>
<td>700 (Bold)</td>
<td>0.03em</td>
<td>UPPERCASE</td>
</tr>
<tr>
<td>Sub-section</td>
<td>Barlow Condensed</td>
<td>600 (SemiBold)</td>
<td>0.02em</td>
<td>UPPERCASE</td>
</tr>
<tr>
<td>Card Title</td>
<td>Barlow Condensed</td>
<td>600 (SemiBold)</td>
<td>0.02em</td>
<td>UPPERCASE</td>
</tr>
<tr>
<td>Kicker/Label</td>
<td>Barlow Condensed</td>
<td>600 (SemiBold)</td>
<td>0.2em</td>
<td>UPPERCASE</td>
</tr>
<tr>
<td>Body</td>
<td>Inter</td>
<td>400 (Regular)</td>
<td>Normal</td>
<td>Sentence</td>
</tr>
<tr>
<td>Body Bold</td>
<td>Inter</td>
<td>600 (SemiBold)</td>
<td>Normal</td>
<td>Sentence</td>
</tr>
<tr>
<td>CTA/Button</td>
<td>Barlow Condensed</td>
<td>600-700</td>
<td>0.08em</td>
<td>UPPERCASE</td>
</tr>
</tbody></table>
<h3>Overlay Opacity Scale</h3>
<p>For any element placed on top of video footage:</p>
<table>
<thead>
<tr>
<th>Level</th>
<th>Value</th>
<th>Use</th>
</tr>
</thead>
<tbody><tr>
<td>Heavy</td>
<td><code>rgba(10, 14, 42, 0.85)</code></td>
<td>Lower thirds, name cards, CTA end cards</td>
</tr>
<tr>
<td>Medium</td>
<td><code>rgba(10, 14, 42, 0.70)</code></td>
<td>Location bars, progress indicators</td>
</tr>
<tr>
<td>Light</td>
<td><code>rgba(10, 14, 42, 0.50)</code></td>
<td>Subtle label backgrounds</td>
</tr>
<tr>
<td>Accent</td>
<td><code>rgba(220, 38, 38, 0.90)</code></td>
<td>Red accent bars, CTA buttons on video</td>
</tr>
<tr>
<td>Glass</td>
<td><code>rgba(10, 14, 42, 0.60)</code> + <code>backdrop-filter: blur(12px)</code></td>
<td>Premium floating panels</td>
</tr>
</tbody></table>
<h3>Corner Radius</h3>
<table>
<thead>
<tr>
<th>Element</th>
<th>Radius</th>
</tr>
</thead>
<tbody><tr>
<td>Full-width bars (lower thirds, progress)</td>
<td><code>0px</code> (flush edge to edge)</td>
</tr>
<tr>
<td>Floating panels (callouts, name cards)</td>
<td><code>8px</code></td>
</tr>
<tr>
<td>Buttons</td>
<td><code>8px</code> (matching <code>.btn-primary</code> rounded-lg)</td>
</tr>
<tr>
<td>Tags/badges</td>
<td><code>4px</code></td>
</tr>
<tr>
<td>Avatars/profile photos</td>
<td><code>50%</code> (circle)</td>
</tr>
</tbody></table>
<h3>Safe Zones</h3>
<p>All text and graphic elements must respect safe zones on video:</p>
<table>
<thead>
<tr>
<th>Platform</th>
<th>Safe Zone</th>
</tr>
</thead>
<tbody><tr>
<td>Instagram Reels / TikTok (9:16)</td>
<td>48px top, 250px bottom (UI overlaps), 24px sides</td>
</tr>
<tr>
<td>Instagram Feed (1:1)</td>
<td>24px all sides</td>
</tr>
<tr>
<td>LinkedIn / YouTube (16:9)</td>
<td>32px top, 48px bottom, 32px sides</td>
</tr>
<tr>
<td>Stories (9:16)</td>
<td>48px top (status bar), 200px bottom (reply bar), 24px sides</td>
</tr>
</tbody></table>
<hr>
<h2>1. VIDEO WALKTHROUGH OVERLAYS</h2>
<p>These sit on top of live footage. Everything must be legible over unpredictable backgrounds. The navy overlay panels provide guaranteed contrast.</p>
<hr>
<h3>1.1 Lower Third: Name/Title Card</h3>
<p><strong>Use:</strong> When someone is talking on camera. Shows name + title.</p>
<p><strong>Dimensions:</strong> Width <code>480px</code> (desktop) / <code>320px</code> (mobile 9:16). Height <code>auto</code> (content-driven, typically ~72-80px).</p>
<p><strong>Position:</strong> Bottom-left of frame. Aligned <code>32px</code> from left edge, <code>64px</code> from bottom edge. On 9:16 vertical, raise to <code>280px</code> from bottom to clear platform UI.</p>
<p><strong>Layout:</strong></p>
<pre><code>+--[RED ACCENT 4px]--[NAVY PANEL]--+
|  TECHNICIAN NAME                  |
|  Title / Position                 |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Panel background: <code>rgba(10, 14, 42, 0.85)</code></li>
<li>Left accent bar: <code>4px</code> wide, <code>#dc2626</code>, full height of panel</li>
<li>Panel padding: <code>16px 20px 14px 20px</code></li>
<li>Name: Barlow Condensed 700, <code>22px</code> (desktop) / <code>18px</code> (mobile), <code>#ffffff</code>, uppercase, tracking <code>0.03em</code></li>
<li>Title: Inter 400, <code>14px</code> (desktop) / <code>12px</code> (mobile), <code>#d1d5db</code>, sentence case</li>
<li>Drop shadow on panel: <code>0 4px 16px rgba(0, 0, 0, 0.4)</code></li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Entrance: slide in from left (<code>x: -100% to 0</code>), <code>300ms</code>, easing <code>[0, 0, 0.2, 1]</code> (decelerate in)</li>
<li>Red accent bar enters <code>80ms</code> before panel (leading edge reveal)</li>
<li>Name text fades in <code>100ms</code> after panel lands</li>
<li>Title text fades in <code>150ms</code> after panel lands</li>
<li>Hold: minimum <code>4 seconds</code> on screen</li>
<li>Exit: slide out to left (<code>x: 0 to -100%</code>), <code>250ms</code>, easing <code>[0.4, 0, 1, 1]</code> (accelerate out)</li>
</ul>
<p><strong>Variant: With Company Logo</strong></p>
<ul>
<li>Add Ambition logo (small, <code>24px</code> height) right-aligned within the panel</li>
<li>Logo separated from text by <code>16px</code> gap</li>
<li>Logo at <code>opacity: 0.8</code> to not compete with the name</li>
</ul>
<hr>
<h3>1.2 Location / Project Name Overlay</h3>
<p><strong>Use:</strong> Establishing shot. Shows where the job is and what the project is.</p>
<p><strong>Dimensions:</strong> Full width of frame, <code>56px</code> height (desktop) / <code>48px</code> height (mobile).</p>
<p><strong>Position:</strong> Bottom of frame, flush with edges. On 9:16, position at <code>260px</code> from bottom.</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------------------+
| [PIN ICON] SCOTTSDALE FASHION SQUARE    DIN TAI FUNG |
+-----------------------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Bar background: <code>rgba(10, 14, 42, 0.70)</code></li>
<li>Left content: map pin icon (<code>16px</code>, <code>#dc2626</code>) + location name (Barlow Condensed 600, <code>14px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.08em</code>)</li>
<li>Right content: project/client name (Barlow Condensed 700, <code>16px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.03em</code>)</li>
<li>Horizontal padding: <code>24px</code> both sides</li>
<li>Vertical alignment: center</li>
<li>Thin top border: <code>1px solid rgba(255, 255, 255, 0.10)</code></li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Entrance: fade up (<code>y: 8px to 0</code>, opacity <code>0 to 1</code>), <code>350ms</code>, decelerate</li>
<li>Hold: <code>3-5 seconds</code></li>
<li>Exit: fade down (<code>y: 0 to 8px</code>, opacity <code>1 to 0</code>), <code>300ms</code></li>
</ul>
<hr>
<h3>1.3 Before / After Labels</h3>
<p><strong>Use:</strong> Split-screen or transition shots comparing project states.</p>
<p><strong>Dimensions:</strong> <code>120px x 40px</code> per label (desktop) / <code>96px x 34px</code> (mobile).</p>
<p><strong>Position:</strong> Bottom of each half of the split. If full-frame transition (swipe), position bottom-center.</p>
<p><strong>Layout (per label):</strong></p>
<pre><code>+--[NAVY PANEL]--+
|    BEFORE       |
+--[RED LINE]-----+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Panel background: <code>rgba(10, 14, 42, 0.85)</code></li>
<li>Panel padding: <code>8px 20px</code></li>
<li>Text: Barlow Condensed 700, <code>16px</code> (desktop) / <code>14px</code> (mobile), <code>#ffffff</code>, uppercase, tracking <code>0.04em</code></li>
<li>Bottom accent line: <code>2px</code> height, full width of panel<ul>
<li>&quot;BEFORE&quot; label: <code>#9ca3af</code> (gray accent, signaling the old state)</li>
<li>&quot;AFTER&quot; label: <code>#dc2626</code> (red accent, signaling the completed state)</li>
</ul>
</li>
<li>Drop shadow: <code>0 2px 8px rgba(0, 0, 0, 0.3)</code></li>
</ul>
<p><strong>For swipe transition:</strong></p>
<ul>
<li>The divider line between before/after: <code>3px solid #dc2626</code></li>
<li>Animate divider from left to right over <code>600ms</code></li>
<li>Labels stay anchored to their respective halves</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Both labels enter simultaneously: fade in, <code>200ms</code>, <code>50ms</code> after the footage appears</li>
<li>Labels persist as long as the shot is on screen</li>
<li>Exit with the shot transition (no separate exit animation)</li>
</ul>
<hr>
<h3>1.4 Progress Indicator</h3>
<p><strong>Use:</strong> Multi-day or multi-week project documentation. Shows what stage the viewer is seeing.</p>
<p><strong>Dimensions:</strong> <code>auto</code> width (content-driven, typically <code>160-220px</code>) x <code>44px</code> height.</p>
<p><strong>Position:</strong> Top-right corner, <code>24px</code> from top, <code>24px</code> from right. On 9:16, position <code>56px</code> from top to clear status bar.</p>
<p><strong>Layout:</strong></p>
<pre><code>+--[NAVY PANEL]--+
| DAY 1 / WEEK 3 |
+--[RED UNDERLINE]+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Panel background: <code>rgba(10, 14, 42, 0.85)</code></li>
<li>Panel padding: <code>10px 18px 8px 18px</code></li>
<li>Panel corner radius: <code>8px</code></li>
<li>Text: Barlow Condensed 700, <code>18px</code> (desktop) / <code>15px</code> (mobile), <code>#ffffff</code>, uppercase, tracking <code>0.03em</code></li>
<li>Red underline: <code>2px</code> height, <code>#dc2626</code>, <code>60%</code> width of panel, centered</li>
<li>Drop shadow: <code>0 4px 12px rgba(0, 0, 0, 0.35)</code></li>
</ul>
<p><strong>Stages format:</strong></p>
<ul>
<li>Single phase: <code>&quot;DAY 1&quot;</code>, <code>&quot;WEEK 3&quot;</code>, <code>&quot;MONTH 2&quot;</code></li>
<li>Completion: <code>&quot;COMPLETE&quot;</code> with full-width red underline and underline pulses once (<code>opacity 1 to 0.4 to 1</code>, <code>800ms</code>)</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Entrance: scale in from <code>0.9 to 1.0</code> + opacity <code>0 to 1</code>, <code>300ms</code>, decelerate</li>
<li>On stage change (e.g., Day 1 to Day 7): text crossfades (<code>150ms</code> out, <code>150ms</code> in)</li>
<li>Exit: scale out <code>1.0 to 0.9</code> + fade, <code>250ms</code></li>
</ul>
<hr>
<h3>1.5 Equipment / System Callout Labels</h3>
<p><strong>Use:</strong> Pointing at specific equipment, components, or details in frame. Educational content.</p>
<p><strong>Dimensions:</strong> <code>auto</code> (content-driven) x <code>36px</code> height. Max width <code>280px</code>.</p>
<p><strong>Position:</strong> Near the equipment being labeled. Connected by a thin line.</p>
<p><strong>Layout:</strong></p>
<pre><code>         [LINE]---[NAVY PANEL]--+
                  | VRV SYSTEM   |
                  +--------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Panel background: <code>rgba(10, 14, 42, 0.85)</code></li>
<li>Panel padding: <code>8px 14px</code></li>
<li>Panel corner radius: <code>4px</code></li>
<li>Text: Barlow Condensed 600, <code>13px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.08em</code></li>
<li>Connecting line: <code>1px solid rgba(255, 255, 255, 0.40)</code>, length variable (connect panel to the point on the equipment)</li>
<li>Dot at equipment end: <code>6px</code> circle, <code>#dc2626</code>, solid fill</li>
<li>Drop shadow on panel: <code>0 2px 8px rgba(0, 0, 0, 0.3)</code></li>
</ul>
<p><strong>Variant: With Detail Line</strong></p>
<ul>
<li>Add a second line of text below the label name</li>
<li>Detail: Inter 400, <code>11px</code>, <code>#d1d5db</code>, sentence case</li>
<li>Example: <code>&quot;VRV SYSTEM&quot;</code> / <code>&quot;Daikin 3-pipe, 200k BTU&quot;</code></li>
<li>Panel height grows to <code>~52px</code></li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Entrance: dot appears first (scale <code>0 to 1</code>, <code>150ms</code>), then line draws from dot to panel (<code>200ms</code>), then panel fades in (<code>200ms</code>)</li>
<li>Total entrance: <code>~550ms</code></li>
<li>Hold: <code>3-6 seconds</code> (enough to read)</li>
<li>Exit: reverse order. Panel fades, line retracts, dot fades. <code>400ms</code> total.</li>
</ul>
<hr>
<h3>1.6 ROC License Watermark</h3>
<p><strong>Use:</strong> Subtle credential signal. Appears on project videos, especially commercial work.</p>
<p><strong>Dimensions:</strong> N/A (text element only).</p>
<p><strong>Position:</strong> Bottom-right corner, <code>24px</code> from right, <code>24px</code> from bottom. On 9:16, raise to <code>260px</code> from bottom.</p>
<p><strong>Specs:</strong></p>
<ul>
<li>Text: Inter 500, <code>11px</code>, <code>rgba(255, 255, 255, 0.35)</code>, tracking <code>0.06em</code></li>
<li>Content: <code>&quot;ROC #320923&quot;</code></li>
<li>No background panel (text floats directly over footage)</li>
<li>Text shadow: <code>0 1px 4px rgba(0, 0, 0, 0.5)</code> for legibility over any background</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Fades in with the clip, persists, fades out with the clip. No independent animation.</li>
</ul>
<hr>
<h2>2. TEXT OVERLAY TEMPLATES FOR REELS / TIKTOK</h2>
<p>All designed for 9:16 vertical (1080x1920). These sit over footage or over a navy background.</p>
<hr>
<h3>2.1 Hook Text (First 1-3 Seconds)</h3>
<p><strong>Use:</strong> The attention-grabber. Large, impossible to ignore. The frame that stops the scroll.</p>
<p><strong>Dimensions:</strong> Full frame. Text centered within safe zone.</p>
<p><strong>Position:</strong> Vertically centered or slightly above center (golden ratio: ~38% from top).</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|                                   |
|     THIS CHILLER SERVES           |
|     200,000 SQ FT                 |
|                                   |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Background: footage playing behind, with <code>rgba(10, 14, 42, 0.40)</code> full-frame overlay for contrast</li>
<li>Text: Barlow Condensed 800, <code>56px</code> (2-3 word hooks) / <code>44px</code> (longer hooks, 4-6 words), <code>#ffffff</code>, uppercase, tracking <code>0.04em</code>, line-height <code>1.0</code></li>
<li>Text alignment: centered</li>
<li>Text max-width: <code>85%</code> of frame width</li>
<li>Text shadow: <code>0 2px 12px rgba(0, 0, 0, 0.6)</code> for readability over any footage</li>
<li>Optional red highlight word: one key word in <code>#dc2626</code> for emphasis (e.g., &quot;THIS CHILLER SERVES <strong>200,000</strong> SQ FT&quot; where the number is red)</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Text enters: scale from <code>1.05 to 1.0</code> + opacity <code>0 to 1</code>, <code>300ms</code>, decelerate</li>
<li>The &quot;punch&quot; effect: slightly oversized to normal size gives weight without being flashy</li>
<li>Red highlight word: <code>50ms</code> delay after white text, same animation</li>
<li>Hold: <code>1.5-2.5 seconds</code></li>
<li>Exit: fade to <code>0</code> over <code>200ms</code> as footage takes over</li>
</ul>
<p><strong>Content patterns:</strong></p>
<ul>
<li>Question hooks: <code>&quot;WHAT HAPPENS WHEN THE AC FAILS AT 3AM?&quot;</code></li>
<li>Scale reveals: <code>&quot;THIS SYSTEM COOLS 14 FLOORS&quot;</code></li>
<li>Challenge hooks: <code>&quot;ZERO ROOM FOR ERROR&quot;</code></li>
<li>Authority hooks: <code>&quot;22 YEARS. 500+ PROJECTS.&quot;</code></li>
</ul>
<hr>
<h3>2.2 Fact / Stat Callout</h3>
<p><strong>Use:</strong> A specific number or data point that sells competence.</p>
<p><strong>Dimensions:</strong> Stat block occupies <code>60%</code> of frame width, vertically centered.</p>
<p><strong>Position:</strong> Center of frame. On 9:16, slightly above center.</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|        COMPLETED PROJECTS         |
|            500+                   |
|   Since 2002 in the Valley        |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Kicker (above number): Barlow Condensed 600, <code>13px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.2em</code></li>
<li>Stat number: Barlow Condensed 800, <code>96px</code> (desktop) / <code>72px</code> (mobile), <code>#ffffff</code>, tracking <code>0.02em</code></li>
<li>Supporting line (below number): Inter 400, <code>16px</code>, <code>#d1d5db</code>, sentence case</li>
<li>Background: footage with <code>rgba(10, 14, 42, 0.50)</code> overlay, OR solid <code>#0a0e2a</code></li>
<li>Alignment: centered, all three lines</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Kicker fades in first: <code>200ms</code>, <code>delay: 0</code></li>
<li>Number counts up (if numeric): odometer-style, <code>800ms</code>, easing decelerate. Start from <code>0</code>, land on target. If text (like &quot;500+&quot;), type on character by character over <code>400ms</code>.</li>
<li>Supporting line fades in: <code>200ms</code>, <code>delay: 600ms</code></li>
<li>Total entrance: <code>~1s</code></li>
<li>Hold: <code>2-3 seconds</code></li>
</ul>
<p><strong>Stat bank (use these):</strong></p>
<ul>
<li><code>&quot;500+&quot;</code> / <code>&quot;COMPLETED PROJECTS&quot;</code></li>
<li><code>&quot;22&quot;</code> / <code>&quot;YEARS IN THE INDUSTRY&quot;</code> (founded 2002, use current year difference)</li>
<li><code>&quot;24/7&quot;</code> / <code>&quot;EMERGENCY DISPATCH&quot;</code></li>
<li><code>&quot;ROC #320923&quot;</code> / <code>&quot;LICENSED SINCE DAY ONE&quot;</code></li>
<li><code>&quot;&lt;1 HR&quot;</code> / <code>&quot;EMERGENCY RESPONSE TIME&quot;</code> (reference: Abraza story)</li>
</ul>
<hr>
<h3>2.3 Step Counter</h3>
<p><strong>Use:</strong> How-to content, process walkthroughs, multi-step sequences.</p>
<p><strong>Dimensions:</strong> Step indicator <code>auto</code> width, positioned top of frame. Step content below.</p>
<p><strong>Position:</strong> Top-left within safe zone (9:16: <code>56px</code> top, <code>24px</code> left).</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
| STEP 1 OF 5                      |
| [PROGRESS DOTS]                  |
|                                   |
|   DIAGNOSE THE                    |
|   COMPRESSOR                      |
|                                   |
|   [footage underneath]            |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Step label: Barlow Condensed 600, <code>13px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.15em</code></li>
<li>Step format: <code>&quot;STEP 1 OF 5&quot;</code> (not <code>&quot;Step 1/5&quot;</code>)</li>
<li>Progress dots: <code>5</code> dots in a row, <code>8px</code> diameter, <code>8px</code> gap<ul>
<li>Completed steps: <code>#dc2626</code> solid fill</li>
<li>Current step: <code>#dc2626</code> solid fill + <code>box-shadow: 0 0 8px rgba(220, 38, 38, 0.5)</code> glow</li>
<li>Future steps: <code>rgba(255, 255, 255, 0.25)</code> outline only</li>
</ul>
</li>
<li>Step headline: Barlow Condensed 800, <code>40px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.03em</code>, positioned below dots with <code>24px</code> gap</li>
<li>Background overlay: <code>rgba(10, 14, 42, 0.50)</code> gradient from top, fading to transparent at <code>40%</code> of frame height</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>On step change: current dot fills red (<code>200ms</code>), step label crossfades (<code>150ms</code>), headline slides left-to-right swap (<code>300ms</code>, old exits left, new enters from right)</li>
<li>Numbers are the constant. Content changes.</li>
</ul>
<hr>
<h3>2.4 Quote / Testimonial Overlay</h3>
<p><strong>Use:</strong> Client feedback, crew quotes, social proof over footage.</p>
<p><strong>Dimensions:</strong> Quote block occupies <code>80%</code> of frame width. Positioned in bottom third of frame.</p>
<p><strong>Position:</strong> Bottom third, centered horizontally. On 9:16, <code>320px</code> from bottom (above platform UI).</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|   [footage / B-roll]              |
|                                   |
|   +-[GLASS PANEL]---------------+ |
|   | &quot;They were on-site before   | |
|   |  sunrise. That&#39;s what 24/7  | |
|   |  dispatch actually means.&quot;  | |
|   |                             | |
|   |  FACILITY MANAGER           | |
|   |  ABRAZA SENIOR LIVING       | |
|   +-----------------------------+ |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Panel: glass style, <code>rgba(10, 14, 42, 0.60)</code> + <code>backdrop-filter: blur(12px)</code></li>
<li>Panel padding: <code>24px 28px</code></li>
<li>Panel corner radius: <code>8px</code></li>
<li>Panel border: <code>1px solid rgba(255, 255, 255, 0.08)</code></li>
<li>Left accent: <code>3px</code> wide, <code>#dc2626</code>, full height of panel</li>
<li>Quote text: Inter 500, <code>18px</code> (desktop) / <code>16px</code> (mobile), <code>#ffffff</code>, italic, line-height <code>1.5</code></li>
<li>Quote max width: <code>85%</code> of panel width</li>
<li>Opening quote mark: Barlow Condensed 800, <code>48px</code>, <code>rgba(220, 38, 38, 0.30)</code>, positioned above quote text, left-aligned</li>
<li>Attribution name: Barlow Condensed 600, <code>13px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.08em</code></li>
<li>Attribution company: Inter 400, <code>12px</code>, <code>#d1d5db</code>, sentence case</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Panel enters: fade up (<code>y: 20px to 0</code>, opacity <code>0 to 1</code>), <code>400ms</code>, decelerate</li>
<li>Quote text types on word by word: <code>40ms</code> per word (or fade in if typing is too complex)</li>
<li>Attribution fades in: <code>200ms</code>, <code>delay: 800ms</code> after quote completes</li>
<li>Hold: <code>4-5 seconds</code></li>
<li>Exit: fade down, <code>300ms</code></li>
</ul>
<hr>
<h3>2.5 CTA End Card</h3>
<p><strong>Use:</strong> Final frame of every Reel/TikTok. Drives action.</p>
<p><strong>Dimensions:</strong> Full frame, 1080x1920 (9:16).</p>
<p><strong>Position:</strong> Full frame. This IS the frame, not an overlay.</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|        [AMBITION LOGO]            |
|                                   |
|     COMMERCIAL HVAC               |
|     YOU CAN COUNT ON              |
|                                   |
|  +----[RED CTA BUTTON]--------+  |
|  |  CALL (480) 600-2942       |  |
|  +-----------------------------+  |
|                                   |
|       ambitionac.com              |
|       ROC #320923                 |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Background: solid <code>#0a0e2a</code> with industrial pattern overlay (<code>pattern-blueprint</code> or <code>pattern-crosshatch</code> at <code>opacity: 0.04</code>)</li>
<li>Logo: Ambition Mechanical logo, centered, max-height <code>48px</code></li>
<li>Tagline: Barlow Condensed 700, <code>28px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.03em</code>, centered, max 2 lines</li>
<li>CTA button: <code>280px</code> x <code>56px</code>, <code>#dc2626</code> fill, corner radius <code>8px</code><ul>
<li>Text: Barlow Condensed 700, <code>18px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.06em</code></li>
<li>Shadow: <code>0 4px 20px rgba(220, 38, 38, 0.35)</code></li>
</ul>
</li>
<li>Website: Inter 400, <code>14px</code>, <code>#d1d5db</code>, centered, below button with <code>24px</code> gap</li>
<li>ROC: Inter 400, <code>11px</code>, <code>rgba(255, 255, 255, 0.35)</code>, centered, below website with <code>8px</code> gap</li>
</ul>
<p><strong>Animation:</strong></p>
<ul>
<li>Background: instant (no transition, it&#39;s the background)</li>
<li>Logo: fade in, <code>300ms</code>, <code>delay: 0</code></li>
<li>Tagline: fade up (<code>y: 15px</code>), <code>350ms</code>, <code>delay: 200ms</code></li>
<li>CTA button: scale in from <code>0.95 to 1.0</code> + fade, <code>300ms</code>, <code>delay: 400ms</code></li>
<li>Button pulses once after landing: scale <code>1.0 to 1.03 to 1.0</code>, <code>600ms</code>, easing <code>ease-in-out</code></li>
<li>Website + ROC: fade in, <code>200ms</code>, <code>delay: 600ms</code></li>
<li>Hold: <code>3-4 seconds</code></li>
</ul>
<hr>
<h2>3. STATIC SOCIAL POST TEMPLATES</h2>
<p>All designed at 1:1 (1080x1080) for Instagram feed unless noted. Exportable as PNG.</p>
<hr>
<h3>3.1 Project Showcase</h3>
<p><strong>Use:</strong> Highlighting a completed or in-progress project with a hero photo.</p>
<p><strong>Dimensions:</strong> 1080x1080 (1:1)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|   [PROJECT PHOTO - 60% height]    |
|                                   |
+-[NAVY BAR - full width]-----------+
| [RED ACCENT 3px top border]       |
| COMMERCIAL HVAC                    |
| DIN TAI FUNG KITCHEN BUILDOUT     |
| Scottsdale Fashion Square          |
|                               ROC  |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Photo zone: top <code>60%</code> of frame. Photo fills edge to edge, no padding. Slight gradient at bottom: <code>linear-gradient(to bottom, transparent 60%, rgba(10, 14, 42, 0.3) 100%)</code></li>
<li>Navy bar: bottom <code>40%</code>, background <code>#0a0e2a</code></li>
<li>Red top border on navy bar: <code>3px solid #dc2626</code>, full width</li>
<li>Bar padding: <code>28px 32px</code></li>
<li>Kicker: Barlow Condensed 600, <code>12px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.2em</code></li>
<li>Project name: Barlow Condensed 700, <code>28px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.02em</code>, max 2 lines</li>
<li>Location: Inter 400, <code>14px</code>, <code>#d1d5db</code>, sentence case</li>
<li>ROC watermark: Inter 400, <code>10px</code>, <code>rgba(255, 255, 255, 0.25)</code>, bottom-right of navy bar</li>
</ul>
<hr>
<h3>3.2 Before / After Split</h3>
<p><strong>Use:</strong> Showing transformation. Renovation, repair, new install vs. old system.</p>
<p><strong>Dimensions:</strong> 1080x1080 (1:1)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|              |                     |
|   BEFORE     |    AFTER            |
|   [PHOTO]    |    [PHOTO]          |
|              |                     |
+-----------------------------------+
| [NAVY BAR]                         |
| PROJECT NAME              LOGO     |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Split: two photos side by side, each <code>540px</code> wide, full height minus <code>80px</code> bottom bar</li>
<li>Divider: <code>3px solid #dc2626</code> vertical line between photos</li>
<li>&quot;BEFORE&quot; label: positioned bottom-left of left photo<ul>
<li>Background: <code>rgba(10, 14, 42, 0.80)</code></li>
<li>Text: Barlow Condensed 600, <code>13px</code>, <code>#9ca3af</code>, uppercase, tracking <code>0.1em</code></li>
<li>Padding: <code>6px 14px</code></li>
<li>Corner radius: <code>4px</code> (top-right only)</li>
</ul>
</li>
<li>&quot;AFTER&quot; label: same spec but text color <code>#ffffff</code> and bottom accent <code>2px #dc2626</code></li>
<li>Bottom bar: <code>80px</code> height, <code>#0a0e2a</code> background<ul>
<li>Project name: Barlow Condensed 700, <code>18px</code>, <code>#ffffff</code>, uppercase, left-aligned with <code>32px</code> padding</li>
<li>Ambition logo: right-aligned, <code>28px</code> height, <code>32px</code> from right edge</li>
</ul>
</li>
</ul>
<hr>
<h3>3.3 Stat Highlight</h3>
<p><strong>Use:</strong> Standalone stat that sells scale, experience, or capability.</p>
<p><strong>Dimensions:</strong> 1080x1080 (1:1)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|          COMPLETED PROJECTS        |
|                                   |
|              500+                  |
|                                   |
|   Since 2002. Every phase of       |
|   commercial mechanical.           |
|                                   |
|         [RED ACCENT LINE]          |
|         ambitionac.com             |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Background: <code>#0a0e2a</code> with <code>pattern-crosshatch</code> at <code>opacity: 0.03</code></li>
<li>Kicker: Barlow Condensed 600, <code>14px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.2em</code>, centered</li>
<li>Stat number: Barlow Condensed 800, <code>120px</code>, <code>#ffffff</code>, tracking <code>0.02em</code>, centered, line-height <code>1.0</code></li>
<li>Supporting text: Inter 400, <code>16px</code>, <code>#d1d5db</code>, centered, max <code>70%</code> width, line-height <code>1.5</code></li>
<li>Red accent line: <code>48px</code> wide, <code>2px</code> height, <code>#dc2626</code>, centered, between supporting text and website</li>
<li>Website: Inter 400, <code>13px</code>, <code>#9ca3af</code>, centered</li>
</ul>
<hr>
<h3>3.4 Tip / Educational Post</h3>
<p><strong>Use:</strong> Educational content. &quot;3 Signs Your HVAC Needs Service&quot;, tips, explainers.</p>
<p><strong>Dimensions:</strong> 1080x1080 (1:1)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
| HVAC TIP                          |
+---[RED LINE]----------------------+
|                                   |
|  3 SIGNS YOUR                     |
|  COMMERCIAL HVAC                  |
|  NEEDS SERVICE                    |
|                                   |
|  1. Inconsistent temperatures      |
|     across zones                   |
|  2. Unusual noise from             |
|     rooftop units                  |
|  3. Energy bills climbing           |
|     without explanation            |
|                                   |
| ambitionac.com   (480) 600-2942   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Background: <code>#0a0e2a</code></li>
<li>Kicker: Barlow Condensed 600, <code>13px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.2em</code>, top-left, <code>32px</code> from top + left</li>
<li>Red divider: <code>32px</code> wide, <code>2px</code> height, <code>#dc2626</code>, below kicker with <code>12px</code> gap</li>
<li>Headline: Barlow Condensed 800, <code>44px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.03em</code>, left-aligned, <code>32px</code> from left, line-height <code>1.05</code></li>
<li>List items: numbered <code>1.</code> <code>2.</code> <code>3.</code><ul>
<li>Number: Barlow Condensed 700, <code>18px</code>, <code>#dc2626</code></li>
<li>Text: Inter 400, <code>16px</code>, <code>#d1d5db</code>, sentence case, line-height <code>1.5</code></li>
<li>Spacing between items: <code>16px</code></li>
</ul>
</li>
<li>Bottom bar: <code>32px</code> from bottom, flex space-between<ul>
<li>Website: Inter 400, <code>13px</code>, <code>#9ca3af</code></li>
<li>Phone: Inter 500, <code>13px</code>, <code>#ffffff</code></li>
</ul>
</li>
</ul>
<p><strong>For carousel (multi-slide educational):</strong></p>
<ul>
<li>Slide 1: Title card (headline only, large, with kicker)</li>
<li>Slides 2-4: One tip per slide, number as large watermark (<code>Barlow Condensed 800, 200px, rgba(220, 38, 38, 0.06)</code>)</li>
<li>Slide 5: CTA end card (reuse Section 2.5 layout adapted to 1:1)</li>
</ul>
<hr>
<h3>3.5 Team / Crew Spotlight</h3>
<p><strong>Use:</strong> Humanizing the brand. Showing the people behind the equipment.</p>
<p><strong>Dimensions:</strong> 1080x1080 (1:1)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|   [CREW PHOTO - full bleed]       |
|                                   |
|                                   |
+---[GRADIENT FADE]--               |
|                                   |
|   MEET THE CREW                    |
|   MEMORIAL TOWER                   |
|   PROJECT TEAM                     |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Photo: full bleed, entire 1080x1080</li>
<li>Gradient overlay: <code>linear-gradient(to bottom, transparent 40%, rgba(10, 14, 42, 0.95) 75%)</code></li>
<li>Kicker: Barlow Condensed 600, <code>12px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.2em</code>, positioned over gradient, <code>32px</code> from left, <code>~720px</code> from top</li>
<li>Headline: Barlow Condensed 700, <code>32px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.02em</code>, below kicker with <code>8px</code> gap</li>
<li>Sub-line: Inter 400, <code>14px</code>, <code>#d1d5db</code>, below headline with <code>8px</code> gap</li>
<li>Bottom-right: ROC watermark, <code>10px</code>, <code>rgba(255,255,255,0.25)</code></li>
</ul>
<hr>
<h3>3.6 Service Highlight Card</h3>
<p><strong>Use:</strong> Highlighting a specific service offering.</p>
<p><strong>Dimensions:</strong> 1080x1080 (1:1)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|  [SERVICE ICON / PHOTO]           |
|                                   |
+-[RED ACCENT]-[NAVY PANEL]---------+
|                                   |
|  HVAC/R INSTALLATION               |
|                                   |
|  Full commercial mechanical        |
|  from preconstruction to           |
|  commissioning. All makes,         |
|  all models.                       |
|                                   |
|  +---[CTA BUTTON]-------------+   |
|  | SCHEDULE A CONSULTATION    |   |
|  +-----------------------------+   |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Top <code>45%</code>: photo or icon on <code>#111638</code> background<ul>
<li>If photo: job site image with slight vignette</li>
<li>If icon: line icon in <code>#dc2626</code>, <code>64px</code>, centered on <code>#111638</code></li>
</ul>
</li>
<li>Bottom <code>55%</code>: <code>#0a0e2a</code> background</li>
<li>Red accent line: <code>3px</code> height, full width, between photo and text zone</li>
<li>Service name: Barlow Condensed 700, <code>28px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.02em</code>, <code>32px</code> from left</li>
<li>Description: Inter 400, <code>15px</code>, <code>#d1d5db</code>, line-height <code>1.6</code>, max <code>80%</code> width, <code>32px</code> from left</li>
<li>CTA button: <code>280px</code> x <code>48px</code>, <code>#dc2626</code> fill, <code>8px</code> radius<ul>
<li>Text: Barlow Condensed 600, <code>14px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.08em</code></li>
<li>Centered horizontally, <code>32px</code> from bottom</li>
</ul>
</li>
</ul>
<p><strong>Services to template:</strong></p>
<ul>
<li>HVAC/R Installation</li>
<li>Service &amp; Repair</li>
<li>Refrigeration</li>
<li>Energy Management</li>
<li>New Construction</li>
<li>Preventive Maintenance</li>
<li>24/7 Emergency</li>
</ul>
<hr>
<h2>4. STORY / REEL COVER TEMPLATES (9:16)</h2>
<p>These are the cover images that appear in the Instagram grid for Reels and on story highlights.</p>
<hr>
<h3>4.1 Project Walkthrough Cover</h3>
<p><strong>Dimensions:</strong> 1080x1920 (9:16)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|   [PROJECT PHOTO - full bleed]    |
|                                   |
|                                   |
|                                   |
+---[GRADIENT]---                   |
|                                   |
|  PROJECT UPDATE                    |
|  DIN TAI FUNG                      |
|  WEEK 3                            |
|                                   |
| [PROGRESS BAR]                     |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Photo: full bleed 9:16</li>
<li>Gradient: <code>linear-gradient(to bottom, transparent 50%, rgba(10, 14, 42, 0.95) 80%)</code></li>
<li>Kicker: Barlow Condensed 600, <code>13px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.2em</code></li>
<li>Project name: Barlow Condensed 800, <code>40px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.03em</code></li>
<li>Stage: Barlow Condensed 600, <code>24px</code>, <code>#d1d5db</code>, uppercase</li>
<li>Progress bar (optional): <code>240px</code> wide, <code>4px</code> height<ul>
<li>Track: <code>rgba(255, 255, 255, 0.15)</code></li>
<li>Fill: <code>#dc2626</code>, width proportional to project progress</li>
<li>Position: <code>280px</code> from bottom, centered</li>
</ul>
</li>
</ul>
<hr>
<h3>4.2 &quot;Day in the Life&quot; Cover</h3>
<p><strong>Dimensions:</strong> 1080x1920 (9:16)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|   [CREW/SITE PHOTO]               |
|                                   |
|                                   |
+---[GRADIENT]---                   |
|                                   |
|  A DAY WITH                        |
|  AMBITION                          |
|  MECHANICAL                        |
|                                   |
|  [DATE]                            |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Photo: full bleed, ideally showing crew at work</li>
<li>Gradient: <code>linear-gradient(to bottom, transparent 45%, rgba(10, 14, 42, 0.92) 75%)</code></li>
<li>Kicker: Barlow Condensed 600, <code>13px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.2em</code></li>
<li>Title: Barlow Condensed 800, <code>48px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.04em</code>, stacked (&quot;AMBITION&quot; + &quot;MECHANICAL&quot; on separate lines)</li>
<li>Date: Inter 400, <code>14px</code>, <code>#9ca3af</code>, below title with <code>16px</code> gap</li>
</ul>
<hr>
<h3>4.3 Service Explainer Cover</h3>
<p><strong>Dimensions:</strong> 1080x1920 (9:16)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|  [EQUIPMENT PHOTO / close-up]     |
|                                   |
+---[GRADIENT]---                   |
|                                   |
|  WHAT IS A                         |
|  VRV SYSTEM?                       |
|                                   |
|  Everything you need to know       |
|  about variable refrigerant        |
|  volume systems.                   |
|                                   |
|  [SWIPE UP / WATCH indicator]      |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Photo: equipment close-up, top <code>55%</code></li>
<li>Gradient: same as 4.1</li>
<li>Kicker: none (the question IS the hook)</li>
<li>Question headline: Barlow Condensed 800, <code>36px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.03em</code></li>
<li>Description: Inter 400, <code>15px</code>, <code>#d1d5db</code>, line-height <code>1.5</code>, max <code>80%</code> width</li>
<li>Swipe/watch indicator: chevron up icon (<code>16px</code>, <code>#dc2626</code>) + Inter 500, <code>12px</code>, <code>#dc2626</code>, uppercase, tracking <code>0.1em</code>, <code>&quot;WATCH NOW&quot;</code></li>
<li>Position: <code>300px</code> from bottom, centered</li>
</ul>
<hr>
<h3>4.4 Emergency Callout Template</h3>
<p><strong>Use:</strong> Highlighting emergency service capability. The &quot;3AM call&quot; content.</p>
<p><strong>Dimensions:</strong> 1080x1920 (9:16)</p>
<p><strong>Layout:</strong></p>
<pre><code>+-----------------------------------+
|                                   |
|          [RED FLASH OVERLAY]       |
|                                   |
|     EMERGENCY                      |
|     RESPONSE                       |
|                                   |
|     3:00 AM                        |
|     ABRAZA SENIOR LIVING           |
|                                   |
|     AC FAILURE. CRITICAL            |
|     SYSTEMS AT RISK.               |
|                                   |
|  +---[CTA]---------------------+  |
|  |  (480) 600-2942              |  |
|  +------------------------------+  |
|                                   |
+-----------------------------------+
</code></pre>
<p><strong>Specs:</strong></p>
<ul>
<li>Background: <code>#0a0e2a</code> base</li>
<li>Red flash overlay: <code>radial-gradient(ellipse at center, rgba(220, 38, 38, 0.12) 0%, transparent 70%)</code> for a subtle red ambient glow</li>
<li>&quot;EMERGENCY RESPONSE&quot; headline: Barlow Condensed 800, <code>52px</code>, <code>#ffffff</code>, uppercase, tracking <code>0.04em</code>, centered</li>
<li>Time: Barlow Condensed 700, <code>28px</code>, <code>#dc2626</code>, centered</li>
<li>Location: Inter 500, <code>16px</code>, <code>#d1d5db</code>, centered, below time with <code>8px</code> gap</li>
<li>Situation description: Inter 400, <code>16px</code>, <code>#9ca3af</code>, centered, <code>24px</code> below location</li>
<li>CTA: <code>#dc2626</code> fill, <code>280px</code> x <code>52px</code>, <code>8px</code> radius, centered<ul>
<li>Text: Barlow Condensed 700, <code>18px</code>, <code>#ffffff</code>, uppercase</li>
<li>Shadow: <code>0 4px 20px rgba(220, 38, 38, 0.4)</code></li>
</ul>
</li>
<li>Red pulse ring around CTA: <code>2px</code> border expanding outward and fading, if animated</li>
</ul>
<hr>
<h2>5. ANIMATION TIMING REFERENCE</h2>
<p>Summary of all animation timings for consistency across templates.</p>
<table>
<thead>
<tr>
<th>Animation</th>
<th>Duration</th>
<th>Easing</th>
<th>Delay</th>
</tr>
</thead>
<tbody><tr>
<td>Panel slide in</td>
<td><code>300ms</code></td>
<td><code>[0, 0, 0.2, 1]</code> (decelerate)</td>
<td><code>0</code></td>
</tr>
<tr>
<td>Panel slide out</td>
<td><code>250ms</code></td>
<td><code>[0.4, 0, 1, 1]</code> (accelerate)</td>
<td><code>0</code></td>
</tr>
<tr>
<td>Text fade in</td>
<td><code>200-350ms</code></td>
<td><code>ease-out</code></td>
<td>varies by hierarchy</td>
</tr>
<tr>
<td>Text fade out</td>
<td><code>200ms</code></td>
<td><code>ease-in</code></td>
<td><code>0</code></td>
</tr>
<tr>
<td>Scale entrance</td>
<td><code>300ms</code></td>
<td>decelerate</td>
<td><code>0</code></td>
</tr>
<tr>
<td>Counter/odometer</td>
<td><code>800ms</code></td>
<td>decelerate</td>
<td>after container enters</td>
</tr>
<tr>
<td>Stagger between children</td>
<td><code>80-100ms</code></td>
<td>N/A</td>
<td>cumulative</td>
</tr>
<tr>
<td>Line draw (callout)</td>
<td><code>200ms</code></td>
<td><code>linear</code></td>
<td>after dot</td>
</tr>
<tr>
<td>Button pulse</td>
<td><code>600ms</code></td>
<td><code>ease-in-out</code></td>
<td>after button lands</td>
</tr>
<tr>
<td>Overlay fade (full frame)</td>
<td><code>300ms</code></td>
<td><code>linear</code></td>
<td><code>0</code></td>
</tr>
<tr>
<td>Hold time (lower thirds)</td>
<td><code>4000ms</code></td>
<td>N/A</td>
<td>N/A</td>
</tr>
<tr>
<td>Hold time (stats)</td>
<td><code>2500ms</code></td>
<td>N/A</td>
<td>N/A</td>
</tr>
<tr>
<td>Hold time (CTA end card)</td>
<td><code>3500ms</code></td>
<td>N/A</td>
<td>N/A</td>
</tr>
</tbody></table>
<hr>
<h2>6. PLATFORM-SPECIFIC EXPORT SPECS</h2>
<table>
<thead>
<tr>
<th>Platform</th>
<th>Aspect</th>
<th>Resolution</th>
<th>Codec</th>
<th>Bitrate</th>
<th>FPS</th>
</tr>
</thead>
<tbody><tr>
<td>Instagram Feed</td>
<td>1:1</td>
<td>1080x1080</td>
<td>H.264</td>
<td>10 Mbps</td>
<td>N/A (static)</td>
</tr>
<tr>
<td>Instagram Reel</td>
<td>9:16</td>
<td>1080x1920</td>
<td>H.264</td>
<td>12 Mbps</td>
<td>24fps</td>
</tr>
<tr>
<td>Instagram Story</td>
<td>9:16</td>
<td>1080x1920</td>
<td>H.264</td>
<td>12 Mbps</td>
<td>24fps</td>
</tr>
<tr>
<td>TikTok</td>
<td>9:16</td>
<td>1080x1920</td>
<td>H.264</td>
<td>12 Mbps</td>
<td>24fps</td>
</tr>
<tr>
<td>LinkedIn Feed</td>
<td>1.91:1</td>
<td>1200x628</td>
<td>H.264</td>
<td>10 Mbps</td>
<td>N/A (static)</td>
</tr>
<tr>
<td>LinkedIn Video</td>
<td>16:9 or 9:16</td>
<td>1920x1080 or 1080x1920</td>
<td>H.264</td>
<td>12 Mbps</td>
<td>24fps</td>
</tr>
<tr>
<td>YouTube Shorts</td>
<td>9:16</td>
<td>1080x1920</td>
<td>H.264</td>
<td>12 Mbps</td>
<td>24fps</td>
</tr>
</tbody></table>
<p>All video: 24fps to match Ambition&#39;s cinematic footage standard. No 30fps. No 60fps.</p>
<hr>
<h2>7. TEMPLATE NAMING CONVENTION</h2>
<p>For file exports and agent communication:</p>
<pre><code>amb-[type]-[name]-[version].[ext]

Examples:
amb-overlay-lower-third-v1.png
amb-post-stat-highlight-v1.png
amb-reel-hook-emergency-v1.mp4
amb-cover-walkthrough-v1.png
amb-post-before-after-din-tai-fung-v1.png
</code></pre>
<p>Types: <code>overlay</code>, <code>post</code>, <code>reel</code>, <code>story</code>, <code>cover</code>, <code>carousel</code></p>
<hr>
<h2>8. CONTENT PILLARS (What to Template For)</h2>
<p>These are the recurring content types that should be templated and reused:</p>
<table>
<thead>
<tr>
<th>Pillar</th>
<th>Frequency</th>
<th>Primary Template</th>
</tr>
</thead>
<tbody><tr>
<td>Project Updates</td>
<td>2x/week</td>
<td>3.1 Project Showcase, 4.1 Walkthrough Cover</td>
</tr>
<tr>
<td>Emergency Response Stories</td>
<td>1x/week</td>
<td>4.4 Emergency Template, 2.1 Hook Text</td>
</tr>
<tr>
<td>Equipment Education</td>
<td>1x/week</td>
<td>3.4 Tip Post, 4.3 Service Explainer</td>
</tr>
<tr>
<td>Crew/People</td>
<td>1x/week</td>
<td>3.5 Crew Spotlight</td>
</tr>
<tr>
<td>Stats/Authority</td>
<td>1-2x/week</td>
<td>3.3 Stat Highlight, 2.2 Stat Callout</td>
</tr>
<tr>
<td>Before/After</td>
<td>2x/month</td>
<td>3.2 Before/After Split</td>
</tr>
<tr>
<td>Service Highlights</td>
<td>1x/month per service</td>
<td>3.6 Service Highlight Card</td>
</tr>
</tbody></table>
<hr>
<h2>9. QUICK REFERENCE FOR AGENTS</h2>
<h3>For Cleo (Video Overlays)</h3>
<ul>
<li>Lower thirds: Section 1.1. Use for every talking-head clip.</li>
<li>Location bars: Section 1.2. Use on every establishing shot.</li>
<li>Before/After: Section 1.3. Use for project progress transitions.</li>
<li>Progress indicators: Section 1.4. Use for multi-day documentation.</li>
<li>Equipment callouts: Section 1.5. Use for educational/technical content.</li>
<li>ROC watermark: Section 1.6. Include on all commercial project footage.</li>
<li>Hook text: Section 2.1. First 1-3 seconds of every Reel/TikTok.</li>
<li>CTA end card: Section 2.5. Last 3-4 seconds of every Reel/TikTok.</li>
<li>All overlays use the Ambition overlay opacity scale (Section: Overlay Opacity Scale).</li>
<li>Export at 24fps. Always.</li>
</ul>
<h3>For Tony (Social Posts)</h3>
<ul>
<li>Background color for all graphics: <code>#0a0e2a</code> (Navy Dark). Not <code>#0a0a0a</code>.</li>
<li>Primary accent: <code>#dc2626</code> (Ambition Red). For kickers, accent lines, CTAs.</li>
<li>Headlines: Barlow Condensed, UPPERCASE, always.</li>
<li>Body text: Inter, sentence case, always.</li>
<li>Never use sky blue (<code>#0ea5e9</code>). That was v2. v3 is navy + red + white.</li>
<li>Template naming: <code>amb-[type]-[name]-v1.png</code></li>
<li>Hashtags in comment, not caption. Core set on every post.</li>
<li>Cadence: 3-4x/week IG, 3-5x/week TikTok, 2-3x/week LinkedIn.</li>
</ul>
<h3>For Bobby (If Building Template Components)</h3>
<ul>
<li>Each template becomes a React component accepting props: <code>{ headline, body, stat, image, category, projectName, location }</code></li>
<li>Component naming: <code>AmbitionTemplate[Type].jsx</code> (e.g., <code>AmbitionTemplateStatHighlight.jsx</code>)</li>
<li>Lives in <code>src/components/templates/ambition/</code></li>
<li>Uses the Ambition Tailwind config tokens directly (navy-900, red-500, etc.)</li>
<li>Not AOM brand tokens. Ambition has its own system.</li>
</ul>
<hr>
<h2>Brand Guardrails (Non-Negotiable)</h2>
<ol>
<li><strong>Navy, not black.</strong> Dark backgrounds are <code>#0a0e2a</code>, never <code>#000000</code> or <code>#0a0a0a</code>.</li>
<li><strong>Red for action only.</strong> CTAs, kickers, accent lines, urgency. Never decorative fill.</li>
<li><strong>Barlow Condensed for headlines. Inter for body. No exceptions.</strong> No Syne, no Space Grotesk (those are AOM brand). Ambition is its own system.</li>
<li><strong>ALL CAPS for headlines.</strong> Every headline, every kicker, every button, every label.</li>
<li><strong>Minimum 16px body text.</strong> Smaller only for metadata, watermarks, and legal. &quot;Old people can read em.&quot;</li>
<li><strong>No warm color grading.</strong> Cool-neutral footage. Match the navy.</li>
<li><strong>No sky blue.</strong> Retired in v3. Red is the accent now.</li>
<li><strong>ROC #320923 on relevant templates.</strong> Project showcases, service cards, CTA end cards.</li>
<li><strong>24fps video. Always.</strong> Matches the cinematic footage standard.</li>
<li><strong>No stock photography.</strong> Ambition has 29+ project folders of real footage. Use it.</li>
</ol>
`,s={title:e,slug:o,category:n,agent:t,date:d,dateFormatted:c,updated:null,summary:i,tags:r,content:l};export{t as agent,n as category,l as content,d as date,c as dateFormatted,s as default,o as slug,i as summary,r as tags,e as title,a as updated};
