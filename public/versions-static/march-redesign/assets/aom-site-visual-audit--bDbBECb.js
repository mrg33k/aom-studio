const t="AOM Website Visual Audit",e="aom-site-visual-audit",o="Council",n="Council",i="2026-03-08",s="Mar 8",u=null,l="Automated Playwright visual audit of aheadofmarket.com.",a=[],r=`<h1>AOM Website Visual Audit</h1>
<p><strong>URL:</strong> <a href="https://aheadofmarket.com">https://aheadofmarket.com</a>
<strong>Date:</strong> 2026-03-08
<strong>Auditor:</strong> Claude (automated Playwright capture)
<strong>Viewports tested:</strong> Desktop (1440x900), Laptop (1280x800), Tablet Landscape (1024x768), Tablet Portrait (768x1024), iPhone 14 (390x844), iPhone SE (375x667), Android (360x800)
<strong>Screenshots saved to:</strong> <code>/tmp/aom-site-*.png</code></p>
<hr>
<h2>Executive Summary</h2>
<p>The current site is a single-screen, hero-only landing page. There are no additional sections, no scroll depth, and no content below the fold. The entire site experience is one viewport of content with a rotating headline animation and two CTA buttons. This is functionally a splash page, not a website.</p>
<hr>
<h2>Site Structure (What Exists)</h2>
<p>The entire site consists of:</p>
<ol>
<li><strong>Loading screen</strong> - Black background with centered AOM logo and an orange/white progress bar. This runs for several seconds before the main page appears.</li>
<li><strong>Hero section</strong> - The only section. Full viewport height. No scroll.</li>
<li><strong>Bottom ticker bar</strong> - A horizontal scrolling marquee at the very bottom of the screen.</li>
</ol>
<p>That&#39;s it. No services section, no portfolio, no about, no testimonials, no contact form, no footer.</p>
<hr>
<h2>Content Audit (Exact Copy)</h2>
<h3>Navigation</h3>
<ul>
<li><strong>Top left:</strong> AOM. logo (white &quot;A&quot;, dark gray &quot;OM.&quot;)</li>
<li><strong>Top right (desktop/laptop):</strong> &quot;CALL LOGISTICS&quot; button (outlined) + &quot;GET STARTED&quot; button (orange fill)</li>
<li><strong>Top right (tablet):</strong> Same two buttons</li>
<li><strong>Mobile:</strong> Only &quot;GET STARTED&quot; button (orange fill). &quot;CALL LOGISTICS&quot; disappears entirely.</li>
</ul>
<h3>Hero Content</h3>
<ul>
<li><strong>Eyebrow text:</strong> <code>STORY-DRIVEN // PHOENIX VIDEO PRODUCTION</code> (orange vertical bar accent, monospaced font)</li>
<li><strong>Headline:</strong> <code>PHOENIX TEAMS [ROTATE] WITH VIDEO</code> where [ROTATE] cycles through:<ul>
<li>CLOSE FASTER</li>
<li>SCALE FASTER</li>
<li>RECRUIT BETTER</li>
<li>RAISE CAPITAL</li>
<li>OWN ATTENTION</li>
<li>BUILD TRUST</li>
<li>(and possibly more)</li>
</ul>
</li>
<li><strong>Subhead:</strong> &quot;Building repeatable story-driven content systems for founders, developers, and SaaS teams.&quot;</li>
<li><strong>Accent line:</strong> &quot;No agencies. No delays. Just outcomes.&quot; (orange text, bold)</li>
<li><strong>CTA:</strong> &quot;LET&#39;S WORK&quot; with orange lightning bolt icon</li>
</ul>
<h3>Bottom Ticker Bar</h3>
<p>Scrolling marquee with items separated by orange dots:</p>
<ul>
<li>PHOENIX VIDEO PRODUCTION</li>
<li>PARTNER VERIFIED // THE RIGHT TEAM</li>
<li>REAL ESTATE MEDIA</li>
<li>TURNKEY CONTENT</li>
<li>15-MIN CALL</li>
<li>START PROJECT (orange button at far right, fixed position)</li>
</ul>
<h3>Background</h3>
<ul>
<li>Dark/black with what appears to be a faint video or image of a person (barely visible, very dark). On some captures it looks like someone in a casual pose, possibly wearing a watch. Extremely low contrast against the black overlay.</li>
</ul>
<hr>
<h2>Per-Viewport Analysis</h2>
<h3>Desktop (1440x900)</h3>
<ul>
<li><strong>Above the fold:</strong> Everything is above the fold because there&#39;s only one fold.</li>
<li><strong>Layout:</strong> Hero text sits left-center. &quot;LET&#39;S WORK&quot; CTA sits bottom-right. Good visual balance.</li>
<li><strong>Typography:</strong> Headline is large, bold italic. Reads well. The rotating text animation has a typewriter/delete effect that occasionally catches mid-word in screenshots (e.g., &quot;CLOSE F&quot;, &quot;BU&quot;) but that&#39;s expected for animation captures.</li>
<li><strong>Navigation:</strong> Both CTA buttons visible. Clean top bar.</li>
<li><strong>Background image/video:</strong> Barely visible. Almost entirely obscured by dark overlay. Wasted visual opportunity.</li>
<li><strong>Ticker bar:</strong> Visible at bottom. Text is small but readable.</li>
<li><strong>Overall:</strong> Clean and bold, but empty. Feels like a teaser page, not a real website.</li>
</ul>
<h3>Laptop (1280x800)</h3>
<ul>
<li>Same layout as desktop, slightly more compressed.</li>
<li>All elements still visible and well-positioned.</li>
<li>No issues. Same critique applies: it&#39;s just a splash page.</li>
</ul>
<h3>Tablet Landscape (1024x768)</h3>
<ul>
<li>Layout shifts. Navigation buttons move to a more prominent position.</li>
<li>Hero text fills more of the screen.</li>
<li>&quot;No agencies. No delays. Just outcomes.&quot; line and subhead are visible.</li>
<li>Ticker bar partially cut off at bottom, especially &quot;LET&#39;S WORK&quot; button partially hidden.</li>
<li>&quot;LET&#39;S WORK&quot; CTA competes with &quot;START PROJECT&quot; button in the ticker, both fighting for bottom-right real estate.</li>
</ul>
<h3>Tablet Portrait (768x1024)</h3>
<ul>
<li>Layout adapts well. Single column.</li>
<li>Headline remains large and readable.</li>
<li>&quot;LET&#39;S WORK&quot; and lightning bolt visible mid-page.</li>
<li>&quot;CALL LOGISTICS&quot; button still visible alongside &quot;GET STARTED&quot; in nav.</li>
<li>Subhead text wraps naturally. No overflow.</li>
<li>Ticker bar at bottom: text gets truncated. &quot;PARTN...&quot; visible.</li>
<li>More vertical space means more breathing room for the sparse content.</li>
</ul>
<h3>iPhone 14 (390x844)</h3>
<ul>
<li><strong>Nav:</strong> AOM. logo top-left. Only &quot;GET STARTED&quot; button (orange). &quot;CALL LOGISTICS&quot; gone.</li>
<li><strong>Eyebrow:</strong> Wraps to two lines: &quot;STORY-DRIVEN // PHOENIX VIDEO PRODUCTION&quot;</li>
<li><strong>Headline:</strong> Large, fills width. Reads well. Two-line layout for the rotating phrase.</li>
<li><strong>Subhead:</strong> Good size, readable.</li>
<li><strong>&quot;No agencies. No delays. Just outcomes.&quot;</strong> Visible, orange, stands out.</li>
<li><strong>&quot;LET&#39;S WORK&quot;</strong> Visible with lightning bolt.</li>
<li><strong>Bottom bar:</strong> &quot;PHOENIX VIDEO&quot; text + calendar icon + &quot;START PROJECT&quot; button. Very small.</li>
<li><strong>Background:</strong> Even less visible on mobile. Essentially solid black.</li>
<li><strong>Issue:</strong> Lots of dead space between &quot;LET&#39;S WORK&quot; and the bottom ticker. The page feels barren.</li>
</ul>
<h3>iPhone SE (375x667)</h3>
<ul>
<li>Same as iPhone 14 but shorter viewport.</li>
<li>&quot;LET&#39;S WORK&quot; is pushed lower, almost near the bottom ticker.</li>
<li>On the 667px height, content fits but feels cramped compared to iPhone 14.</li>
<li>The &quot;No agencies...&quot; red text is close to mid-screen.</li>
<li>Subhead readable but smaller feeling due to viewport constraints.</li>
<li>&quot;PHOENIX VID...&quot; ticker text gets cut off.</li>
</ul>
<h3>Android (360x800)</h3>
<ul>
<li>Nearly identical to iPhone 14 layout.</li>
<li>Slightly narrower (360 vs 390). No visible issues from the 30px difference.</li>
<li>All text readable. Same dead space issue.</li>
<li>&quot;GET STARTED&quot; button proportionally large in the nav area.</li>
</ul>
<hr>
<h2>Cross-Platform Observations</h2>
<h3>What Works</h3>
<ul>
<li>The bold italic headline typography is strong. It has presence and personality.</li>
<li>The orange accent color is consistent and well-used.</li>
<li>The rotating headline concept is interesting and shows range of services.</li>
<li>&quot;No agencies. No delays. Just outcomes.&quot; is a good line.</li>
<li>Clean, dark aesthetic. Feels premium.</li>
</ul>
<h3>What Breaks or Degrades</h3>
<ul>
<li><strong>&quot;CALL LOGISTICS&quot; disappears on mobile.</strong> That&#39;s a conversion path that vanishes for the majority of traffic. If this is an important CTA, it needs a mobile equivalent.</li>
<li><strong>Background image/video is invisible.</strong> On desktop it&#39;s barely visible. On mobile it&#39;s essentially gone. Whatever investment went into that visual asset is wasted.</li>
<li><strong>Bottom ticker text truncation on mobile.</strong> &quot;PHOENIX VID...&quot; and &quot;PARTN...&quot; are cut.</li>
<li><strong>Competing CTAs.</strong> &quot;GET STARTED&quot;, &quot;CALL LOGISTICS&quot;, &quot;LET&#39;S WORK&quot;, and &quot;START PROJECT&quot; all exist on the same screen. Four CTAs, zero hierarchy beyond visual weight. What do you actually want the visitor to do?</li>
<li><strong>Loading screen is too long.</strong> 5+ seconds of a black screen with a logo and progress bar before any content appears. On mobile connections, this is a bounce risk.</li>
</ul>
<h3>Missing Mobile Considerations</h3>
<ul>
<li>No hamburger menu or mobile navigation. The nav is just &quot;GET STARTED.&quot; If the site had more pages, there would be no way to reach them.</li>
<li>No phone number or tap-to-call.</li>
<li>No address or map link for local Phoenix SEO.</li>
<li>No social links anywhere.</li>
</ul>
<hr>
<h2>Content Gaps (What&#39;s Missing)</h2>
<p>This is the most critical section. The site is missing virtually everything a business website needs.</p>
<h3>Not Present Anywhere on the Site</h3>
<ul>
<li><strong>Services breakdown.</strong> What does AOM actually offer? Video production, social media, websites, AI? None of this is listed.</li>
<li><strong>Portfolio / Work samples.</strong> Zero examples of past work. No video reels, no thumbnails, no case studies.</li>
<li><strong>About / Team.</strong> Who is AOM? Who are the people? No faces, no bios, no story.</li>
<li><strong>Pricing or packages.</strong> No indication of what engagement looks like.</li>
<li><strong>Testimonials or social proof.</strong> No client logos, no quotes, no results.</li>
<li><strong>Contact information.</strong> No email, no phone, no address, no form.</li>
<li><strong>Footer.</strong> No footer at all.</li>
<li><strong>Construction vertical.</strong> The target vertical (construction companies) is not mentioned or addressed anywhere. The site talks about &quot;founders, developers, and SaaS teams.&quot;</li>
<li><strong>AI services.</strong> Not mentioned anywhere despite being an emerging revenue stream.</li>
<li><strong>Web development.</strong> Not mentioned despite being an active service.</li>
<li><strong>Local SEO signals.</strong> &quot;Phoenix&quot; is in the headline, but there&#39;s no address, no Google Maps embed, no service area page.</li>
<li><strong>Blog or content.</strong> Nothing.</li>
<li><strong>Legal.</strong> No privacy policy, no terms.</li>
</ul>
<h3>Messaging Mismatch</h3>
<p>The current positioning (&quot;founders, developers, and SaaS teams&quot;) does not match AOM&#39;s actual target market (construction companies, corporate events, local Phoenix businesses). The site reads like a SaaS-adjacent creative agency, not a production company targeting construction and corporate clients.</p>
<p>The ticker mentions &quot;REAL ESTATE MEDIA&quot; which is closer to the actual target, but it flies by in a scrolling marquee that most visitors won&#39;t read.</p>
<hr>
<h2>Typography &amp; Visual Design</h2>
<ul>
<li><strong>Headline font:</strong> Heavy italic sans-serif. Works well. Strong brand presence.</li>
<li><strong>Body text:</strong> Clean sans-serif. Adequate size on all viewports.</li>
<li><strong>Eyebrow text:</strong> Monospaced, all caps, small. Gives a technical/modern feel. Readable.</li>
<li><strong>Color palette:</strong> Black, white, orange (#FF4500 or similar). Tight and consistent.</li>
<li><strong>Visual hierarchy:</strong> Headline dominates, which is correct. But after that, there&#39;s nothing to guide the eye through a journey. It&#39;s headline &gt; subhead &gt; done.</li>
</ul>
<hr>
<h2>Performance Notes</h2>
<ul>
<li><strong>Loading screen:</strong> The site has a custom splash/loader that shows the AOM logo with a progress bar for multiple seconds before revealing content. This is a significant UX issue. In 2026, users expect instant content. A multi-second loading animation with no visible progress is a bounce factory, especially on mobile.</li>
<li><strong>Background asset:</strong> Whatever is loading behind the hero (video or large image) is so dark it&#39;s barely visible. If it&#39;s a video, that&#39;s bandwidth spent on something nobody can see.</li>
</ul>
<hr>
<h2>Overall Assessment</h2>
<p><strong>Rating: 3/10 as a business website.</strong></p>
<p>The site has strong visual identity bones (logo, color, typography) but it&#39;s not a website. It&#39;s a business card with one sentence on it. There is no way for a visitor to:</p>
<ul>
<li>Learn what AOM does</li>
<li>See examples of the work</li>
<li>Understand pricing or process</li>
<li>Contact the team beyond clicking a generic CTA</li>
<li>Find information about specific services</li>
<li>Read about the team</li>
<li>Discover AOM specializes in construction/corporate content</li>
</ul>
<p>The rotating headline is clever but masks the fact that there&#39;s no substance behind it. A prospective construction company owner who lands here would have no reason to believe AOM understands their industry.</p>
<hr>
<h2>Redesign Priorities (Recommended)</h2>
<ol>
<li><strong>Kill the loading screen.</strong> Content should appear instantly.</li>
<li><strong>Add real sections.</strong> Services, portfolio, about, testimonials, contact. Standard website architecture.</li>
<li><strong>Reposition messaging.</strong> Lead with construction/corporate, not SaaS/founders.</li>
<li><strong>Show the work.</strong> Video reels, thumbnails, case studies. This is a production company. Let the work sell itself.</li>
<li><strong>Single clear CTA hierarchy.</strong> Pick one primary action. Everything else is secondary.</li>
<li><strong>Add social proof.</strong> Client logos (Ambition, ISA, KOHRS, Included Health), testimonials, results.</li>
<li><strong>Surface AI services.</strong> Even a &quot;coming soon&quot; teaser positions AOM as forward-thinking.</li>
<li><strong>Local SEO.</strong> Address, service areas, Phoenix-specific content.</li>
<li><strong>Mobile-first navigation.</strong> Hamburger menu, tap-to-call, sticky CTA.</li>
<li><strong>Make the background visible.</strong> If there&#39;s a showreel or hero image, let people see it.</li>
</ol>
`,g={title:t,slug:e,category:o,agent:n,date:i,dateFormatted:s,updated:null,summary:l,tags:a,content:r};export{n as agent,o as category,r as content,i as date,s as dateFormatted,g as default,e as slug,l as summary,a as tags,t as title,u as updated};
