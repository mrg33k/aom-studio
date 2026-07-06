const t="AOM Website Page Layout Review",e="aom-page-layout-review",o="Strategy",n="Alex",s="2026-03-09",i="Mar 9",h=null,r="Business owner perspective review of AOM website page layouts and messaging.",a=[],l=`<h1>AOM Website Page Layout Review</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>Reviewer:</strong> Alex (Deal Architect)
<strong>Perspective:</strong> Business owner landing on this site for the first time</p>
<hr>
<h2>Current Section Order</h2>
<ol>
<li>Hero (video bg + headline + pathways)</li>
<li>Services Grid (&quot;Three Ways In&quot;)</li>
<li>Construction Callout (dark section)</li>
<li>Brands + Corporate Callout</li>
<li>AI/Digital Teaser (waitlist)</li>
<li>Pull Quote Break</li>
<li>Stats + Testimonials (&quot;The Work Speaks&quot;)</li>
<li>Portfolio (video gallery, tabbed)</li>
<li>Engagement Ideas (&quot;Pick What Fits&quot;)</li>
<li>Trust Metrics (&quot;Why It Works&quot;)</li>
<li>FAQ</li>
<li>Footer CTA + Contact</li>
</ol>
<hr>
<h2>What Works</h2>
<p><strong>The headline is strong.</strong> &quot;We Make Companies Impossible to Ignore&quot; is clear, confident, and benefit-driven. A construction company owner reads that and thinks &quot;that&#39;s what I need.&quot; Keep it.</p>
<p><strong>The construction section is excellent.</strong> Dark background, hard-hitting headline (&quot;Your Competitor&#39;s Instagram Is Their Best Recruiter. Is Yours?&quot;), and real pain points (recruiting, winning bids, looking legitimate). This is the single best section on the page. It speaks directly to the target buyer in their language.</p>
<p><strong>The engagement ideas section is smart.</strong> Giving visitors a way to self-select their need (&quot;Content Engine,&quot; &quot;Brand Authority,&quot; &quot;Event Capture&quot;) with starting prices is the right move. It reduces friction and pre-qualifies.</p>
<p><strong>CTAs are consistent and well-placed.</strong> &quot;Start a Brief&quot; appears in the nav, hero, construction section, brands section, engagement section, and footer. The brief form itself is well-designed with the step flow.</p>
<p><strong>Portfolio is deep.</strong> 40+ videos across verticals. The tabbed approach (all/brands/construction) is the right filter mechanism.</p>
<hr>
<h2>What Needs to Change</h2>
<h3>1. The hero video is barely visible</h3>
<p>The video bg plays at 18% opacity with an 88% cream overlay on top. That&#39;s effectively invisible. Patrik is right that the old version with randomly cycling portfolio videos felt alive. Right now the hero feels static and flat despite having a video layer.</p>
<p><strong>Recommendation:</strong> Push video opacity to 35-45% with a darker overlay gradient (not cream). Let the work breathe. The whole point of a video background is energy and proof. If visitors can&#39;t see the work, it&#39;s just loading iframes for nothing.</p>
<h3>2. Section order is wrong for conversion</h3>
<p>The current flow goes: Hero &gt; Services &gt; Construction &gt; Brands &gt; AI &gt; Quote &gt; Stats &gt; Portfolio &gt; Packages &gt; Trust &gt; FAQ &gt; Footer.</p>
<p>Problem: the visitor sees service descriptions before seeing any proof. &quot;Three Ways In&quot; is a menu, not a hook. A skeptical construction company owner doesn&#39;t care about your service categories yet. They care about results.</p>
<p><strong>Recommended order:</strong></p>
<ol>
<li><strong>Hero</strong> (keep, but with stronger video presence)</li>
<li><strong>Construction Callout</strong> (move UP, right after hero. This is the #1 target audience. Hit them immediately.)</li>
<li><strong>Stats + Testimonials</strong> (social proof before the portfolio. Numbers and quotes build credibility fast.)</li>
<li><strong>Portfolio</strong> (now they&#39;re primed to watch. The stats gave them a reason to care.)</li>
<li><strong>Brands + Corporate</strong> (secondary audience gets their section)</li>
<li><strong>Services / &quot;Three Ways In&quot;</strong> (now they understand WHAT you do, explain HOW)</li>
<li><strong>Engagement Ideas / &quot;Pick What Fits&quot;</strong> (pricing signals + self-selection)</li>
<li><strong>Trust Metrics / &quot;Why It Works&quot;</strong> (reinforce before CTA)</li>
<li><strong>AI/Digital Teaser</strong> (keep last among content sections, it&#39;s emerging/experimental)</li>
<li><strong>FAQ</strong></li>
<li><strong>Footer CTA</strong></li>
</ol>
<p>The logic: Hook &gt; Prove &gt; Show &gt; Explain &gt; Convert. Right now it&#39;s Explain &gt; Hook &gt; Show &gt; Prove &gt; Convert. That&#39;s backwards.</p>
<h3>3. Social proof comes too late</h3>
<p>Testimonials don&#39;t appear until section 7 of 12. That&#39;s past the fold on every device. Most visitors will never scroll that far.</p>
<p><strong>Recommendation:</strong> Add a lightweight proof bar right below the hero. Three logos or three one-line quotes. Nothing heavy. Just enough to say &quot;real companies trust us.&quot; Then the full testimonial section can live deeper in the page.</p>
<p>Also: the current testimonials are good but only three. For a company targeting construction, there are zero construction testimonials visible. The Ambition Mechanical proof card is in the Construction section, but it reads more like a case description than a testimonial. Get a quote from Steve at Ambition if possible.</p>
<h3>4. Too much cream, not enough contrast</h3>
<p>Patrik is right. The page alternates between <code>aom-cream</code> and <code>aom-cream-dark</code>, which are barely distinguishable. The only real visual break is the Construction section (black bg) and the Portfolio section (black bg). Everything else blends together.</p>
<p><strong>Recommendations:</strong></p>
<ul>
<li>The Stats section should have a dark or medium-dark background. Big numbers look better on dark.</li>
<li>The &quot;Why It Works&quot; trust section should have more visual weight. Right now it&#39;s four white cards on cream. It fades into the page.</li>
<li>Consider a dark treatment for the Engagement Ideas section. &quot;Pick What Fits&quot; with pricing signals deserves visual emphasis.</li>
<li>The pull quote break (&quot;If the asset doesn&#39;t move trust or attention...&quot;) is strong copy but visually invisible. Give it a dark bg or at minimum a colored accent bar.</li>
</ul>
<h3>5. The AI/Digital section is premature</h3>
<p>The waitlist form asks for an email but links to no backend (<code>/api/waitlist</code> returns nothing on the live site). &quot;Early Access&quot; and &quot;We built this for ourselves first&quot; sounds interesting but there&#39;s no demo, no screenshot, no case study. A business owner reads &quot;content.pipeline.run()&quot; and either doesn&#39;t understand it or doesn&#39;t trust it.</p>
<p><strong>Recommendation:</strong> Either build this out with a real example (show the actual dashboard, show a before/after workflow) or strip it down to a single line: &quot;We also build the systems behind the brand. Websites, automation, AI workflows. Ask us about it.&quot; Don&#39;t pretend the product is further along than it is. Business owners can smell that.</p>
<h3>6. No clear &quot;who is this for&quot; signal above the fold</h3>
<p>The subhead says &quot;Content, websites, and systems for companies that build, grow, and ship.&quot; That&#39;s generic. The pathway cards below try to segment (Construction / Brands + Corporate / Digital + Systems) but they&#39;re small and below the fold on mobile.</p>
<p><strong>Recommendation:</strong> Make the subhead more specific. Something like: &quot;Video, social media, and websites for construction companies and brands that need to be taken seriously.&quot; Name the audience. Construction owners need to see themselves in the first 5 seconds.</p>
<h3>7. Missing elements that build trust</h3>
<ul>
<li><strong>No &quot;About&quot; or team section.</strong> Business owners want to know who they&#39;re hiring. Even a single photo of Patrik/the team on set would help. Construction owners especially buy from people, not brands.</li>
<li><strong>No process explanation.</strong> &quot;How does working with AOM actually work?&quot; Step 1, 2, 3. This is table stakes for service businesses. The brief form is good but the process leading to and after it is invisible.</li>
<li><strong>No industry-specific language beyond the Construction section.</strong> If a restaurant owner or tech founder lands here, the page doesn&#39;t speak to them until the Brands section, which is section 4.</li>
<li><strong>No phone number visible on the page itself.</strong> It&#39;s behind the &quot;Talk to Us&quot; button and in the footer. Construction guys call. Put a number somewhere visible.</li>
</ul>
<h3>8. The &quot;Three Ways In&quot; section is too abstract</h3>
<p>&quot;Content Engine,&quot; &quot;Production,&quot; and &quot;Digital Infrastructure&quot; are internal labels. A construction company owner thinks in terms of: &quot;I need a video for my website,&quot; &quot;I need someone to run my Instagram,&quot; &quot;I need a website that doesn&#39;t embarrass me.&quot; The descriptions are good but the titles don&#39;t land immediately.</p>
<p><strong>Recommendation:</strong> Rename to outcome-oriented titles. &quot;Monthly Content&quot; instead of &quot;Content Engine.&quot; &quot;Brand Videos&quot; instead of &quot;Production.&quot; &quot;Websites + Systems&quot; instead of &quot;Digital Infrastructure.&quot;</p>
<hr>
<h2>Visual Energy Assessment</h2>
<p>Patrik asked specifically about contrast and visual energy.</p>
<p><strong>Current state:</strong> The page is clean and well-designed from a craft perspective. Typography is strong. The brand system (orange/cream/black/sage) is solid. But it reads more like a design agency portfolio than a production company that makes things feel alive.</p>
<p><strong>What&#39;s missing:</strong></p>
<ul>
<li><strong>Movement.</strong> The video bg is too faded to count. The portfolio section has embedded video but you have to scroll far to reach it. The page feels like a brochure until you hit the portfolio.</li>
<li><strong>Texture.</strong> The dotted SVG textures are at 6% opacity. They&#39;re invisible. Either make them part of the visual language or remove them.</li>
<li><strong>Photography.</strong> Zero photos of people, sets, or behind-the-scenes. For a production company, this is a miss. Show the crew on set. Show a camera on a jobsite. Show the Ambition Mechanical team.</li>
<li><strong>Color contrast.</strong> The cream-to-cream-dark transitions are too subtle. Use the full range: black sections, white sections, cream sections. Create rhythm.</li>
</ul>
<p><strong>Agree with Patrik on the video background.</strong> Bring it back with real presence. A production company&#39;s website should feel like watching a reel, not reading a whitepaper.</p>
<hr>
<h2>Priority Changes (Ranked)</h2>
<ol>
<li><strong>Move Construction section to position 2</strong> (right after hero). Highest-value audience should see themselves immediately.</li>
<li><strong>Add a proof/logo bar below the hero.</strong> Even three client names or a &quot;Trusted by 34+ companies&quot; line.</li>
<li><strong>Increase video bg opacity and presence in hero.</strong> Let the work sell itself.</li>
<li><strong>Reorder to: Hook &gt; Prove &gt; Show &gt; Explain &gt; Convert.</strong> Stats and testimonials before the portfolio.</li>
<li><strong>Add more visual contrast.</strong> Dark sections for stats, engagement ideas, and the pull quote.</li>
<li><strong>Add a lightweight &quot;How It Works&quot; process section.</strong> 3 steps. Brief &gt; Produce &gt; Deliver.</li>
<li><strong>Either build out the AI section with real proof or shrink it to a teaser line.</strong></li>
<li><strong>Add visible phone number</strong> on the page, not just behind a modal.</li>
<li><strong>Add one photo of the team or Patrik on set.</strong> People buy from people.</li>
<li><strong>Rename service titles</strong> to match how clients think, not how AOM thinks internally.</li>
</ol>
<hr>
<h2>Bottom Line</h2>
<p>The page is well-built and the copy is strong in places. The Construction section alone could close deals. But the current order buries the best content, the visual energy doesn&#39;t match the work AOM produces, and a first-time visitor has to scroll through 3 explanation sections before they see any proof. Flip the order, turn up the contrast, and let the work lead. That&#39;s what makes a production company&#39;s site convert.</p>
`,u={title:t,slug:e,category:o,agent:n,date:s,dateFormatted:i,updated:null,summary:r,tags:a,content:l};export{n as agent,o as category,l as content,s as date,i as dateFormatted,u as default,e as slug,r as summary,a as tags,t as title,h as updated};
