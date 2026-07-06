const e="AOM Homepage Redesign QA: Round 1",t="elmo-aom-redesign-qa-r1",o="Audits",n="Elmo",i="2026-03-09",r="Mar 9",d=null,s="First QA round of the AOM homepage redesign.",l=[],a=`<h1>Elmo QA Report: AOM Homepage Redesign</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>URL:</strong> <a href="https://aheadofmarket.com">https://aheadofmarket.com</a>
<strong>Commit:</strong> 1b89e88
<strong>Verdict: FAIL. Goes back to Bobby.</strong></p>
<p>The bones are here. The section order is smart, the typography is confident, the portfolio section is legitimately great. But Bobby shipped the OLD version of the hero with a few dark sections bolted on. The spec called for Dark Frame. What&#39;s live is Cream Frame with a dark portfolio and a dark construction callout. That&#39;s not what Steffen designed. That&#39;s not what Patrik asked for.</p>
<hr>
<h2>BLOCKERS (Must fix before Patrik sees this)</h2>
<h3>B1. HERO IS STILL CREAM -- THE ENTIRE POINT WAS DARK FRAME</h3>
<ul>
<li>Hero background is <code>bg-aom-cream</code> with a cream overlay at 88% opacity (<code>bg-aom-cream/[0.88]</code>)</li>
<li>Video iframe opacity is 0.18 (18%). Spec says 0.65 base + 55% dark overlay</li>
<li>Text is black on cream. Spec says white on dark video</li>
<li>The video is barely visible. It&#39;s a faint shimmer behind cream, not a cinematic dark hero</li>
<li>Pathway cards are white/cream with light borders. Spec says frosted glass (<code>bg-white/8 backdrop-blur-md border-white/10</code>)</li>
<li>The starburst decorative element is visible in the top-right corner. On a dark hero it would be subtle. On cream it looks like clip art</li>
<li><strong>This is the #1 issue.</strong> Steffen&#39;s entire v2 proposal was &quot;put the site in a dark frame.&quot; The hero is the most important section and it&#39;s still wearing the cream sweater.</li>
</ul>
<h3>B2. NO PATTERN STRIP DIVIDERS ANYWHERE</h3>
<ul>
<li>Playwright found 0 pattern dividers on the page</li>
<li>Brand v4 spec defines diagonal lines, dot grid, cross hatch, and angular grid patterns</li>
<li>The section contrast pattern should be: Dark &gt; Pattern Strip &gt; Light &gt; Pattern Strip &gt; Dark</li>
<li>There are zero pattern strips between any sections</li>
<li>Without them, section transitions feel flat and the &quot;Nike campaign book&quot; rhythm is missing</li>
</ul>
<h3>B3. MOBILE: PORTFOLIO TEXT CLIPS OFF SCREEN</h3>
<ul>
<li>&quot;THE PORTFOLIO.&quot; headline overflows on mobile (390px). The &quot;THE&quot; and partial &quot;PORTFOLIO&quot; are visible but &quot;Real projects. Real clients.&quot; text starts at x=0, clipping left</li>
<li>The 128px display font doesn&#39;t scale down for mobile</li>
<li>Portfolio filter tabs (&quot;ALL&quot;, &quot;BRANDS&quot;, &quot;CONSTRUCTION&quot;) also clip -- &quot;CONSTRUCTION&quot; extends past viewport edge</li>
</ul>
<h3>B4. NAV DOES NOT TRANSITION TO SOLID ON SCROLL</h3>
<ul>
<li>Nav background stays <code>rgba(0, 0, 0, 0)</code> (transparent) after scrolling 600px</li>
<li>Only a backdrop-blur is applied, no solid background</li>
<li>Spec says: transparent on hero, solid <code>#0C0C0C</code> on scroll</li>
<li>On cream sections the nav text (&quot;TALK TO US&quot;, &quot;START A BRIEF&quot;) is readable but on the dark portfolio section the transparent nav with white text on black bg works by accident, not by design</li>
<li>The nav needs an explicit scroll listener that adds <code>bg-aom-night</code> class</li>
</ul>
<h3>B5. SERVICE TITLES NOT UPDATED PER SPEC</h3>
<ul>
<li>Bobby&#39;s own latest-result.md says titles changed to: &quot;Content Engine&quot; &gt; &quot;Monthly Content&quot;, &quot;Production&quot; &gt; &quot;Brand Videos&quot;, &quot;Digital Infrastructure&quot; &gt; &quot;Websites + Systems&quot;</li>
<li>But live site shows the OLD titles: &quot;Content Engine&quot;, &quot;Production&quot;, &quot;Digital Infrastructure&quot;</li>
<li>Either the deploy didn&#39;t include the content changes, or they were reverted</li>
</ul>
<h3>B6. HERO SUBHEAD NOT UPDATED</h3>
<ul>
<li>Spec says subhead should be: &quot;Video, social media, and websites for construction companies and brands that need to be taken seriously.&quot;</li>
<li>Live site shows: &quot;Content, websites, and systems for companies that build, grow, and ship.&quot;</li>
<li>Different copy entirely</li>
</ul>
<hr>
<h2>CRITICAL ISSUES (Fix immediately after blockers)</h2>
<h3>C1. COLOR SYSTEM IS WRONG -- STILL CREAM-DOMINANT</h3>
<ul>
<li>Body background: <code>rgb(2, 2, 2)</code> (#020202) -- close to spec&#39;s #0C0C0C but slightly different</li>
<li>Hero section: <code>bg-aom-cream</code> (#FDF6EC) -- should be dark video with dark overlay</li>
<li>Services section: <code>bg-aom-cream-dark</code> (#EDE7DF) -- spec says <code>bg-aom-cream</code> (#FDF6EC)</li>
<li>Brands section: <code>bg-aom-cream</code> (#FDF6EC) -- spec says #151515 (dark)</li>
<li>AI Teaser: <code>bg-aom-cream-dark</code> (#EDE7DF) -- spec says <code>bg-aom-cream</code> (#FDF6EC)</li>
<li>Testimonials / &quot;The Work Speaks&quot;: <code>bg-aom-cream-dark</code> (#EDE7DF) -- spec says #0C0C0C (dark)</li>
<li>Trust stats / &quot;Why It Works&quot;: <code>bg-aom-cream</code> (#FDF6EC) -- spec says cream is correct for breathing room, but the section above should be dark</li>
<li>FAQ: <code>bg-aom-cream</code> -- spec says #0C0C0C (dark)</li>
<li><strong>Page ratio is ~75% cream, ~25% dark.</strong> Spec calls for ~65% dark, ~35% cream. It&#39;s inverted.</li>
<li>Only the Construction Callout and Portfolio sections are dark. Everything else stayed cream/cream-dark.</li>
</ul>
<h3>C2. VIDEO ON MOBILE IS HIDDEN</h3>
<ul>
<li>Hero video iframe has <code>display: none</code> on mobile (390px)</li>
<li>Spec explicitly says: &quot;Show the first video only (no rotation) as a static background&quot; or fallback to a poster frame</li>
<li>Mobile hero is just flat cream with black text. Zero energy. A production company with no moving image on mobile is a contradiction.</li>
</ul>
<h3>C3. SOCIAL CLIPS SECTION -- VIDEOS NOT LOADING</h3>
<ul>
<li>The &quot;Social Clips&quot; horizontal scroll row shows 5 cards but all video thumbnails are black rectangles</li>
<li>Titles are visible (&quot;PRIMROSE AMBITION&quot;, &quot;COOK &amp; CRAFT PRETZEL&quot;, etc.) but no actual video content renders</li>
<li>These are Gumlet embeds that either haven&#39;t loaded or are blocked in headless. Needs verification on a real browser, but the black cards with just text look broken.</li>
</ul>
<h3>C4. STAT COUNTERS SHOW &quot;0+&quot;</h3>
<ul>
<li>Trust stats section shows &quot;0+&quot; for all three metrics (Projects Shipped, Clients Served, Videos Delivered)</li>
<li>The countup animation either didn&#39;t trigger or the intersection observer fired too early</li>
<li>On the desktop expanded view they show &quot;40+&quot;, &quot;21+&quot;, &quot;62+&quot; which is correct</li>
<li>The animation likely depends on the main element&#39;s scroll position, not window scroll. If the observer watches window scroll it&#39;ll never fire since the scroll container is <code>&lt;main&gt;</code></li>
</ul>
<hr>
<h2>MAJOR ISSUES</h2>
<h3>M1. TEXT UNDER 16px EVERYWHERE</h3>
<ul>
<li>30 elements found with text under 16px body minimum</li>
<li>Nav buttons &quot;Talk to Us&quot; and &quot;Start a Brief&quot;: 10px (!!)</li>
<li>Micro-labels (&quot;Creative Production + AI Systems&quot;, &quot;Phoenix, AZ&quot;, etc.): 11px</li>
<li>Pathway card titles: 14px (should be 16px minimum for body)</li>
<li>Pathway card descriptions: 12px</li>
<li>Pathway card links: 12px</li>
<li>Service card body text: 14px</li>
<li>Construction section body text: 14px</li>
<li>Proof point label: 11px</li>
<li><strong>10px nav buttons are egregious.</strong> That&#39;s unreadable for anyone over 35. The brand spec says body text is 16px minimum. Labels can go to 11-12px per the type scale, but buttons are interactive elements, not labels.</li>
</ul>
<h3>M2. TAP TARGETS TOO SMALL</h3>
<ul>
<li>8 elements on desktop and 9 on mobile fail the 44px minimum</li>
<li>Nav buttons: 33px height (need 44px)</li>
<li>Service card CTAs (&quot;See how it works&quot;, &quot;See the work&quot;): 20px height</li>
<li>&quot;See Ambition Mechanical&quot; link: 20px height</li>
<li>&quot;Call the Team&quot; button: 36px height</li>
<li>Portfolio filter tabs on mobile: 40px height</li>
<li>These are all interactive elements that users need to tap/click. 20px height CTAs are painful on mobile.</li>
</ul>
<h3>M3. MOBILE HORIZONTAL OVERFLOW IN PORTFOLIO</h3>
<ul>
<li>Portfolio section has elements overflowing past 390px viewport</li>
<li>&quot;construction&quot; filter tab extends to x=422 (32px past viewport)</li>
<li>Portfolio article cards overflow to x=520-776</li>
<li>This is likely the horizontal scroll carousel working as intended, but the filter tabs should not overflow</li>
</ul>
<h3>M4. FAQ SECTION IS LEFT-ALIGNED ONLY, WASTES 40% OF DESKTOP WIDTH</h3>
<ul>
<li>FAQ accordion takes up roughly 55% of the 1440px viewport, all left-aligned</li>
<li>Right side is completely empty</li>
<li>On a page with strong grid work everywhere else, this looks unfinished</li>
<li>Should either center the accordion or use a two-column layout (question left, something right)</li>
</ul>
<hr>
<h2>MODERATE ISSUES</h2>
<h3>m1. NO HOVER STATES VISIBLE ON FROSTED/GLASS CARDS</h3>
<ul>
<li>Pathway cards on hero lack any hover interaction</li>
<li>Service cards have <code>hover:border-aom-orange/40</code> in the classes but on cream backgrounds the visual change is subtle</li>
<li>Spec calls for card hover lift (<code>hover:-translate-y-1 hover:shadow-xl</code>)</li>
<li>Without seeing these in action (headless browser limitation), flagging for manual verification</li>
</ul>
<h3>m2. SECTION SPACING IS INCONSISTENT</h3>
<ul>
<li>Hero to Services transition: large gap (correct per spec)</li>
<li>Services to Construction: adequate</li>
<li>But the cream sections (Brands, AI Teaser, Testimonials, Trust, FAQ) all run together visually because they&#39;re all the same cream/cream-dark palette</li>
<li>Without dark/light alternation or pattern dividers, the page feels like one long cream scroll with a few dark interruptions</li>
</ul>
<h3>m3. HEADING HIERARCHY HAS ISSUES</h3>
<ul>
<li>Multiple H1 tags: &quot;AOM.&quot; (nav logo) at 30px and the main headline at 72px</li>
<li>The nav logo should be a link/span, not an H1</li>
<li>H2 &quot;THE PORTFOLIO.&quot; is 128px -- visually stunning but semantically it&#39;s an H2 that&#39;s larger than any H1</li>
</ul>
<h3>m4. ORANGE COLOR MISMATCH</h3>
<ul>
<li>Brand spec says Orange is <code>#E85D26</code></li>
<li>Bobby&#39;s notes reference <code>#D4763C</code> as a color to check against</li>
<li>The orange on the live site appears to be <code>#E85D26</code> (correct), but the secondary orange hover state should be <code>#D14E1C</code> per spec. Needs manual verification.</li>
</ul>
<h3>m5. MOBILE: MASSIVE EMPTY SPACE IN CONSTRUCTION SECTION</h3>
<ul>
<li>Between the services section and the construction headline, there&#39;s a huge blank cream area (roughly 400px of empty space on mobile)</li>
<li>The construction section heading clips at the bottom of the viewport before the content appears</li>
<li>This dead space makes the mobile experience feel broken</li>
</ul>
<hr>
<h2>PERFORMANCE</h2>
<table>
<thead>
<tr>
<th>Metric</th>
<th>Value</th>
<th>Grade</th>
</tr>
</thead>
<tbody><tr>
<td>Load Time</td>
<td>3,738ms</td>
<td>C</td>
</tr>
<tr>
<td>DOM Content Loaded</td>
<td>3,234ms</td>
<td>C</td>
</tr>
<tr>
<td>First Contentful Paint</td>
<td>3,264ms</td>
<td>D</td>
</tr>
<tr>
<td>Largest Contentful Paint</td>
<td>5,416ms</td>
<td>F</td>
</tr>
<tr>
<td>Page Weight</td>
<td>265 KB</td>
<td>A</td>
</tr>
<tr>
<td>Resources</td>
<td>12</td>
<td>A</td>
</tr>
</tbody></table>
<ul>
<li><strong>LCP of 5.4 seconds is failing.</strong> Google considers &gt;4s &quot;poor&quot;. The hero video iframes are likely the LCP element but they load slowly.</li>
<li>FCP of 3.2 seconds is also poor. Aim for under 1.8s.</li>
<li>Page weight is excellent at 265KB. The issue is not asset size, it&#39;s render-blocking or slow third-party loads (Gumlet).</li>
<li>Consider using a poster/thumbnail image for the hero instead of an iframe to improve FCP.</li>
</ul>
<hr>
<h2>CONSOLE ERRORS</h2>
<ol>
<li><code>Failed to load resource: 400</code> -- unknown resource returning 400</li>
<li>Content Security Policy warning (report-only, non-blocking)</li>
<li><code>navigator.vibrate</code> blocked in cross-origin iframe (Gumlet embed)</li>
<li>Google Analytics collection requests all aborted (likely headless browser blocking, not a real issue)</li>
</ol>
<p>Only #1 needs investigation. The 400 error could be a broken API call or misconfigured resource.</p>
<hr>
<h2>LINKS</h2>
<p>All 6 links checked and working:</p>
<ul>
<li>&quot;See the Work&quot; -&gt; /#work (200)</li>
<li>Construction pathway -&gt; /#construction (200)</li>
<li>Brands pathway -&gt; /#brands (200)</li>
<li>Digital pathway -&gt; /#digital (200)</li>
<li>&quot;See Ambition Mechanical&quot; -&gt; <a href="https://ambitionac.com/">https://ambitionac.com/</a> (200)</li>
<li><a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a> -&gt; mailto (skip)</li>
</ul>
<p><strong>Problem: Only 6 links on the entire page.</strong> For a production company website with a portfolio section, there should be links to individual project pages, social media, or at minimum a phone number link. The portfolio cards appear to be non-linked.</p>
<hr>
<h2>WHAT&#39;S ACTUALLY GOOD</h2>
<p>Credit where it&#39;s due:</p>
<ul>
<li><strong>Portfolio section is fire.</strong> &quot;THE PORTFOLIO.&quot; in outlined 128px type on black is exactly the Bold Graphic energy. The video grid with category tags, the horizontal social clips row -- this section alone shows Bobby understood the assignment.</li>
<li><strong>Construction callout is strong.</strong> Dark background, white text, proof point card with real data. The Ambition Mechanical card with stats and CTA works well.</li>
<li><strong>Typography system is correct.</strong> Syne headlines + Space Grotesk body. The outlined display headings (&quot;THE WORK SPEAKS.&quot;, &quot;PICK WHAT FITS.&quot;, &quot;WHY IT WORKS.&quot;, &quot;COMMON QUESTIONS.&quot;) are excellent.</li>
<li><strong>Section content and copy are solid.</strong> The messaging, the FAQ, the packages section, the &quot;Why It Works&quot; trust cards -- all well-structured.</li>
<li><strong>No horizontal scroll issues on mobile</strong> (except portfolio which is intentional).</li>
<li><strong>Page weight is lean</strong> at 265KB.</li>
</ul>
<hr>
<h2>SUMMARY FOR BOBBY</h2>
<p>The page is 40% done. The dark sections (Construction, Portfolio) are close to spec. Everything else is still the old cream site with the old hero. Here&#39;s the punch list:</p>
<ol>
<li><strong>Hero: dark overlay, video opacity up, white text, frosted glass cards.</strong> This is the single biggest change. Follow Steffen&#39;s v2 spec line by line.</li>
<li><strong>Flip Brands, Testimonials, FAQ, and Footer CTA to dark backgrounds</strong> (#0C0C0C or #151515).</li>
<li><strong>Add pattern strip dividers</strong> between every major section transition.</li>
<li><strong>Nav scroll behavior</strong>: transparent &gt; solid #0C0C0C with backdrop-blur transition.</li>
<li><strong>Fix mobile video</strong>: show first video or poster frame, not <code>display: none</code>.</li>
<li><strong>Fix portfolio overflow</strong> on mobile (filter tabs, headline scaling).</li>
<li><strong>Update service titles and hero subhead</strong> per spec.</li>
<li><strong>Fix stat counter animation</strong> (likely intersection observer targeting wrong scroll container).</li>
<li><strong>Bump nav button font size</strong> from 10px to at least 12px, and button height to 44px.</li>
<li><strong>Fix LCP</strong> -- hero needs a poster image or preload hint for the video.</li>
</ol>
<hr>
<h2>SCREENSHOTS SAVED</h2>
<p>All screenshots at: <code>/Users/patrik/Documents/Dev/AOM-EA/projects/bobby/double-check/</code></p>
<table>
<thead>
<tr>
<th>File</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>aom-redesign-desktop-1440-full.png</code></td>
<td>Desktop full page (with preloader, first load)</td>
</tr>
<tr>
<td><code>aom-redesign-desktop-EXPANDED.png</code></td>
<td>Desktop full page (expanded, all sections visible)</td>
</tr>
<tr>
<td><code>aom-redesign-mobile-EXPANDED.png</code></td>
<td>Mobile full page (expanded)</td>
</tr>
<tr>
<td><code>aom-redesign-d-hero.png</code></td>
<td>Desktop hero section</td>
</tr>
<tr>
<td><code>aom-redesign-d-services.png</code></td>
<td>Desktop services grid</td>
</tr>
<tr>
<td><code>aom-redesign-d-construction.png</code></td>
<td>Desktop construction callout</td>
</tr>
<tr>
<td><code>aom-redesign-d-brands.png</code></td>
<td>Desktop brands section</td>
</tr>
<tr>
<td><code>aom-redesign-d-ai-teaser.png</code></td>
<td>Desktop AI teaser</td>
</tr>
<tr>
<td><code>aom-redesign-d-testimonials.png</code></td>
<td>Desktop testimonials + stats</td>
</tr>
<tr>
<td><code>aom-redesign-d-portfolio-header.png</code></td>
<td>Desktop portfolio header</td>
</tr>
<tr>
<td><code>aom-redesign-d-portfolio-grid.png</code></td>
<td>Desktop portfolio grid</td>
</tr>
<tr>
<td><code>aom-redesign-d-trust-stats.png</code></td>
<td>Desktop social clips + packages</td>
</tr>
<tr>
<td><code>aom-redesign-d-why-it-works.png</code></td>
<td>Desktop why it works section</td>
</tr>
<tr>
<td><code>aom-redesign-d-faq.png</code></td>
<td>Desktop FAQ</td>
</tr>
<tr>
<td><code>aom-redesign-d-footer-cta.png</code></td>
<td>Desktop footer CTA + packages</td>
</tr>
<tr>
<td><code>aom-redesign-d-footer.png</code></td>
<td>Desktop footer</td>
</tr>
<tr>
<td><code>aom-redesign-m-hero.png</code></td>
<td>Mobile hero</td>
</tr>
<tr>
<td><code>aom-redesign-m-construction.png</code></td>
<td>Mobile construction section</td>
</tr>
<tr>
<td><code>aom-redesign-m-portfolio.png</code></td>
<td>Mobile portfolio</td>
</tr>
<tr>
<td><code>aom-redesign-m-footer.png</code></td>
<td>Mobile footer area</td>
</tr>
<tr>
<td><code>aom-redesign-raw-data.json</code></td>
<td>Full Playwright inspection data</td>
</tr>
</tbody></table>
<hr>
<p><strong>Verdict: FAIL. Not ready for Patrik.</strong></p>
<p>The site Bobby deployed is the old cream-dominant layout with the portfolio and construction sections updated to dark. The &quot;Dark Frame&quot; redesign described in Steffen&#39;s v2 spec and Bobby&#39;s own latest-result.md has not been fully implemented. The hero, brands, testimonials, FAQ, and footer are all still cream. Pattern dividers are missing entirely. Mobile video is hidden.</p>
<p>Bobby needs to go section by section through Steffen&#39;s v2 spec and actually flip each section to the specified background. The content and structure are already there. This is a color/overlay/divider pass, not a rebuild.</p>
<p>Route back to Bobby with this report.</p>
`,c={title:e,slug:t,category:o,agent:n,date:i,dateFormatted:r,updated:null,summary:s,tags:l,content:a};export{n as agent,o as category,a as content,i as date,r as dateFormatted,c as default,t as slug,s as summary,l as tags,e as title,d as updated};
