const e="AOM Website v2 Direction",t="website-v2-direction",o="Strategy",n="Alex",s="2026-03-09",r="Mar 9",d=null,i="Strategic direction for AOM website v2 redesign, copy and positioning.",a=[],l=`<h1>AOM Website v2 Direction</h1>
<blockquote>
<p>Alex (Strategy + Copy) | 2026-03-09
Chain: Alex -&gt; Steffen (brand check) -&gt; Bobby (build) -&gt; Elmer (QA)</p>
</blockquote>
<hr>
<h2>The Problem in One Sentence</h2>
<p>The current site positions AOM as a construction social media agency that also does other things. Patrik&#39;s actual business serves three distinct markets, and the site needs to welcome all of them without feeling like a compromise.</p>
<hr>
<h2>Hero Strategy</h2>
<h3>The Hero Feels Dead. Here&#39;s Why.</h3>
<p>The current hero is text on a dark background with a subtle orange glow. No motion. No energy. No proof that AOM is a production company. Patrik said it himself: &quot;I used to have a video back there to give it more life.&quot;</p>
<h3>Video Background Approach</h3>
<p><strong>Do this:</strong> A 6-8 second looping showreel clip behind the hero text. Silent. Muted. No controls. Just moving images that say &quot;we make things.&quot;</p>
<p><strong>Technical approach (Bobby):</strong></p>
<ul>
<li>MP4 format, not WebM (better Safari support)</li>
<li>Max resolution: 1080p. Compress to under 3MB for the loop</li>
<li><code>&lt;video autoplay muted loop playsinline&gt;</code> with a poster frame (JPEG, ~50KB) that loads instantly</li>
<li>The video loads AFTER the page is interactive. Use <code>preload=&quot;none&quot;</code> and trigger load after the splash screen completes</li>
<li>Apply a dark overlay: <code>bg-black/60</code> on top of the video so text stays readable</li>
<li>Fallback: if video hasn&#39;t loaded yet, the poster image + dark background looks identical to the current hero. No flash of missing content.</li>
<li>Mobile: serve a lighter version (720p, under 1.5MB) or skip video entirely and show the poster. Check <code>navigator.connection</code> if available.</li>
</ul>
<p><strong>What&#39;s in the reel:</strong> 2-3 second cuts of AOM&#39;s best moments. A drone shot over a construction site. A corporate interview setup. A hand editing on a timeline. A website going live. Quick, cinematic, diverse. Shows all three markets in under 8 seconds.</p>
<h3>The Pathway Gate</h3>
<p>Right now the hero talks to everyone and no one. Patrik&#39;s feedback: &quot;If we are gonna serve the 3 markets, let&#39;s segment them off early in the hero on the home page and get them exactly what they want to see.&quot;</p>
<p><strong>The concept:</strong> Below the hero headline + subhead, three clickable pathway cards. Not tabs. Not a dropdown. Three distinct visual blocks that say &quot;this is for you&quot; to each audience.</p>
<p><strong>Layout:</strong></p>
<ul>
<li>Hero headline + subhead at top (full width)</li>
<li>Below: 3 pathway cards in a row (desktop) or stacked (mobile)</li>
<li>Each card has: icon, market name, one-line hook, arrow CTA</li>
<li>Clicking a card smooth-scrolls to that market&#39;s section OR routes to a segment-specific page (Phase 2)</li>
</ul>
<p><strong>The three pathways:</strong></p>
<ol>
<li><p><strong>Construction Companies</strong></p>
<ul>
<li>Icon: Building2</li>
<li>Hook: &quot;Social content from your actual job sites.&quot;</li>
<li>CTA: &quot;See what we build for contractors&quot;</li>
</ul>
</li>
<li><p><strong>Brands + Corporate</strong></p>
<ul>
<li>Icon: Clapperboard</li>
<li>Hook: &quot;Video that closes deals, recruits talent, and tells your story.&quot;</li>
<li>CTA: &quot;See the production work&quot;</li>
</ul>
</li>
<li><p><strong>Digital + Systems</strong></p>
<ul>
<li>Icon: Cpu</li>
<li>Hook: &quot;Websites, workflows, and the infrastructure behind it all.&quot;</li>
<li>CTA: &quot;See how we build&quot;</li>
</ul>
</li>
</ol>
<p><strong>Design notes for Steffen/Bobby:</strong></p>
<ul>
<li>Cards sit on <code>bg-aom-charcoal</code> with <code>border border-aom-border</code></li>
<li>Hover: border transitions to <code>border-aom-orange/30</code></li>
<li>Each card gets a very subtle colored top border (2px): orange for construction, orange for brands, sage for digital</li>
<li>Cards should feel like entry points, not service descriptions. Keep them tight.</li>
<li>On mobile: stack vertically, full width, with smaller padding</li>
</ul>
<h3>Hero Copy</h3>
<p><strong>Current headline:</strong></p>
<pre><code>BRAND INFRASTRUCTURE FOR COMPANIES THAT BUILD / GROW / SHIP / MOVE.
</code></pre>
<p><strong>Current subhead:</strong></p>
<pre><code>We build the content, websites, and systems that make companies impossible to ignore.
</code></pre>
<p><strong>What&#39;s wrong:</strong> &quot;Brand infrastructure&quot; is abstract. It&#39;s a positioning statement, not a headline. It tells you what AOM calls itself, not what AOM does for you. Visitors don&#39;t Google &quot;brand infrastructure.&quot; Also, &quot;INFRASTRUCTURE&quot; truncates on mobile at 375px (Steffen flagged this).</p>
<p><strong>New headline:</strong></p>
<pre><code>WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.
</code></pre>
<p><strong>Why:</strong> It&#39;s the promise, not the label. Seven words. Fits on mobile. Confident without overpromising because the portfolio proves it. The cycling words move to the subhead where they have room to breathe.</p>
<p><strong>New subhead:</strong></p>
<pre><code>Content, websites, and systems built to help you build, grow, and ship.
</code></pre>
<p><strong>Why:</strong> This says what AOM actually delivers (content, websites, systems) and what those things do for the client (build, grow, ship). The approved words from the cycling effect now live in the subhead where they read naturally instead of as a gimmick.</p>
<p><strong>Alternative headline (if Patrik wants to keep the cycling effect):</strong></p>
<pre><code>WE HELP COMPANIES BUILD. GROW. SHIP.
</code></pre>
<p>With the cycling word as the only one that changes. Simpler. Still mobile-safe. But the first option is stronger.</p>
<p><strong>Micro-label stays:</strong> <code>Creative Production + Systems</code></p>
<p><strong>Status bar stays:</strong> <code>Phoenix, AZ | Video / Web / Social / Systems | Est. 2020</code></p>
<hr>
<h2>Market Segmentation</h2>
<h3>The Core Problem</h3>
<p>Patrik nailed it: &quot;We niched so hard into construction it feels like no one else belongs.&quot; The current site has an entire dedicated ConstructionCallout section, but corporate/creative clients get nothing. A VP at a hospitality group visits the site, sees &quot;YOUR COMPETITOR&#39;S INSTAGRAM IS THEIR BEST RECRUITER&quot; in 60px type, and thinks &quot;this isn&#39;t for me.&quot;</p>
<h3>The Fix: Welcome Everyone, Then Specialize</h3>
<p><strong>Site structure after the hero:</strong></p>
<ol>
<li><strong>Hero</strong> (with pathway gate below)</li>
<li><strong>Services Grid</strong> (3 lanes, already exists, keep it)</li>
<li><strong>Market sections</strong> (3 panels, one per audience, this is new)</li>
<li><strong>Portfolio</strong> (filtered by market, not one big dump)</li>
<li><strong>Stats / Authority</strong></li>
<li><strong>How We Work</strong> (replaces the engagement ideas section)</li>
<li><strong>AI/Systems Teaser</strong></li>
<li><strong>Trust / Why Us</strong></li>
<li><strong>FAQ</strong></li>
<li><strong>Footer CTA</strong></li>
</ol>
<h3>What Each Segment Sees</h3>
<h4>Construction Companies</h4>
<p><strong>Section headline:</strong> <code>YOUR COMPETITOR&#39;S INSTAGRAM IS THEIR BEST RECRUITER. IS YOURS?</code></p>
<p>This section already exists. Keep it. But reposition it as one of three market panels, not the dominant vertical on the page.</p>
<p><strong>Changes:</strong></p>
<ul>
<li>Add a mono micro-label: <code>Construction Companies</code></li>
<li>Keep the three proof point cards (Recruiting, Winning Bids, Looking Legitimate)</li>
<li>Keep the Ambition Mechanical proof card</li>
<li>Add the stat bar Steffen approved: <code>Consistent filming. Consistent posting. That&#39;s the whole system.</code></li>
</ul>
<h4>Brands + Corporate</h4>
<p><strong>New section. Same visual structure as the Construction Callout.</strong></p>
<p><strong>Section headline:</strong> <code>THE STORY IS ALREADY THERE. WE JUST KNOW HOW TO TELL IT.</code></p>
<p><strong>Micro-label:</strong> <code>Brands + Corporate</code></p>
<p><strong>Three proof point cards:</strong></p>
<ol>
<li><p><strong>Brand Videos</strong></p>
<ul>
<li>Icon: Clapperboard</li>
<li>&quot;A 90-second video that explains who you are, what you do, and why it matters. The asset that works harder than any sales call.&quot;</li>
</ul>
</li>
<li><p><strong>Event Coverage</strong></p>
<ul>
<li>Icon: Mic2</li>
<li>&quot;Conferences, summits, launches. We capture the energy and turn it into assets that extend the event&#39;s shelf life by months.&quot;</li>
</ul>
</li>
<li><p><strong>Documentaries + Long-form</strong></p>
<ul>
<li>Icon: ScrollText</li>
<li>&quot;When the story needs more than 60 seconds. Fundraising films, impact stories, and brand docs that build real trust.&quot;</li>
</ul>
</li>
</ol>
<p><strong>Proof card (right column):</strong></p>
<ul>
<li>Client: Virtu Hospitality Group (or United Food Bank, pick the stronger case)</li>
<li>Pull the Gio Osso quote: &quot;They didn&#39;t just shoot beautiful footage. They showed people the place I created had legacy.&quot;</li>
<li>Stats: <code>3 venue launches</code> and <code>$9k+ projects</code></li>
</ul>
<p><strong>CTA:</strong> <code>See What We&#39;d Produce For You</code></p>
<h4>Digital + Systems</h4>
<p><strong>New section. Uses sage accent instead of orange.</strong></p>
<p><strong>Section headline:</strong> <code>THE ENGINE BEHIND THE BRAND.</code></p>
<p><strong>Micro-label:</strong> <code>Digital Infrastructure</code></p>
<p>This replaces and absorbs the current AITeaser section, but leads with websites (the proven, revenue-generating service) before getting into AI/systems (the emerging, waitlist-stage service).</p>
<p><strong>Three proof point cards:</strong></p>
<ol>
<li><p><strong>Websites</strong></p>
<ul>
<li>Icon: Globe</li>
<li>&quot;Not templates. Custom-built sites designed to convert, built by the same team that produces your content. Your website should feel like your brand, not a theme.&quot;</li>
</ul>
</li>
<li><p><strong>AI Workflows</strong></p>
<ul>
<li>Icon: Cpu</li>
<li>&quot;We built internal systems that run our own content pipeline, reporting, and operations. Now we&#39;re building them for a small group of businesses.&quot;</li>
</ul>
</li>
<li><p><strong>Automation</strong></p>
<ul>
<li>Icon: Repeat</li>
<li>&quot;The repeatable stuff should be automatic. Scheduling, posting, reporting, follow-ups. We build the systems so you can focus on the work.&quot;</li>
</ul>
</li>
</ol>
<p><strong>Proof card (right column):</strong></p>
<ul>
<li>Client: Ambition Mechanical (website)</li>
<li>&quot;Full custom website, built alongside the social media retainer. One team, one brand, one system.&quot;</li>
<li>Stats: <code>Custom Build</code> and <code>Live in 30 days</code></li>
<li>Link to ambitionac.com</li>
</ul>
<p><strong>Waitlist CTA (sage accent):</strong> Keep the existing waitlist form for the AI/systems piece.</p>
<h3>How to Welcome Construction WITHOUT Alienating Others</h3>
<ol>
<li><strong>The pathway gate in the hero</strong> lets every visitor self-select before they see anything vertical-specific</li>
<li><strong>Construction is ONE of three market panels</strong>, not the dominant one. It shows up in the order the visitor chose, or in a default order: Brands + Corporate first (broader appeal), Construction second (the growth play), Digital third (the emerging offering)</li>
<li><strong>The construction headline stays aggressive</strong> (&quot;YOUR COMPETITOR&#39;S INSTAGRAM&quot;) because that&#39;s how you talk to contractors. But it&#39;s contained within its own section. A hospitality exec never has to see it unless they scroll past it.</li>
<li><strong>Portfolio is filtered.</strong> Construction visitors see construction work. Corporate visitors see corporate work. No one is confused.</li>
</ol>
<hr>
<h2>Copy Overhaul (Section by Section)</h2>
<h3>1. Header / Nav</h3>
<p><strong>Current:</strong> <code>Call Us</code> | <code>Get Started</code></p>
<p><strong>What&#39;s wrong:</strong> &quot;Call Us&quot; is cold. &quot;Get Started&quot; is generic startup copy.</p>
<p><strong>New:</strong> <code>Talk to Us</code> | <code>Start a Brief</code></p>
<p><em>Already approved by Steffen in copy-brand-review.md.</em></p>
<hr>
<h3>2. Hero Section</h3>
<p><strong>Current headline:</strong> <code>BRAND INFRASTRUCTURE FOR COMPANIES THAT BUILD / GROW / SHIP / MOVE.</code></p>
<p><strong>Current subhead:</strong> <code>We build the content, websites, and systems that make companies impossible to ignore.</code></p>
<p><strong>What&#39;s wrong with headline:</strong> Abstract. &quot;Brand infrastructure&quot; means something to Patrik but nothing to a first-time visitor. Truncates on mobile. The cycling words are a nice touch but the headline is doing too much.</p>
<p><strong>What&#39;s wrong with subhead:</strong> Nothing. This is the strongest line on the site. It should be the headline.</p>
<p><strong>New headline:</strong> <code>WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.</code></p>
<p><strong>New subhead:</strong> <code>Content, websites, and systems built to help you build, grow, and ship.</code></p>
<p><strong>New CTA (already in place):</strong> <code>See What We&#39;d Build For You</code> (primary) | <code>See the Work</code> (secondary)</p>
<hr>
<h3>3. Services Grid</h3>
<p><strong>Current micro-label:</strong> <code>What We Build</code></p>
<p><strong>Current headline:</strong> <code>THREE WAYS IN</code></p>
<p><strong>Current subhead:</strong> <code>Whether you need monthly content, a single production, or the systems to tie it all together.</code></p>
<p><strong>What&#39;s wrong:</strong> Nothing major. &quot;THREE WAYS IN&quot; is functional. The subhead is clear. Steffen approved the current copy.</p>
<p><strong>Keep as-is.</strong> The service card copy was already updated in the Steffen review:</p>
<ul>
<li>Content Engine: <code>Your in-house media team without the overhead. We show up, shoot, and turn it into a month of content. Strategy, production, and posting handled.</code></li>
<li>Production: <code>Brand videos, documentaries, event coverage. Cinema-grade execution for the moments that define your company.</code></li>
<li>Digital Infrastructure: <code>Websites, AI workflows, and automation that make everything repeatable. The engine behind the brand.</code></li>
</ul>
<hr>
<h3>4. Construction Callout</h3>
<p><strong>Current headline:</strong> <code>YOUR COMPETITOR&#39;S INSTAGRAM IS THEIR BEST RECRUITER. IS YOURS?</code></p>
<p><strong>What&#39;s wrong:</strong> Nothing. This is the best headline on the site. It&#39;s direct, it stings, and it&#39;s exactly how AOM talks to contractors per brand guidelines.</p>
<p><strong>Keep as-is</strong> with Steffen&#39;s approved modifications:</p>
<ul>
<li>Stat change: <code>1 Filming Day</code> becomes <code>Monthly</code> / <code>Filming + Posting</code></li>
<li>Stat bar addition: <code>Consistent filming. Consistent posting. That&#39;s the whole system.</code></li>
</ul>
<hr>
<h3>5. Stats / Authority Section</h3>
<p><strong>Current micro-label:</strong> <code>Market Authority</code></p>
<p><strong>Current headline:</strong> <code>PHOENIX PRODUCTION / PROVEN SCALE.</code></p>
<p><strong>Current sidebar:</strong> <code>System-driven storytelling for Arizona businesses where reliability is the baseline.</code></p>
<p><strong>Current stat labels:</strong> <code>Phoenix Impact</code> (63+) | <code>Regional Reach</code> (34+) | <code>Assets Shipped</code> (100+)</p>
<p><strong>What&#39;s wrong:</strong> &quot;Phoenix Production&quot; is on the kill list. &quot;Proven Scale&quot; is startup speak. The sidebar copy echoes the retired tagline. Stat labels use internal jargon that means nothing to visitors.</p>
<p><strong>New micro-label:</strong> <code>The Work Speaks</code></p>
<p><strong>New headline:</strong> <code>THE WORK SPEAKS.</code></p>
<p><strong>New sidebar:</strong> <code>Real clients. Real results. Every number on this page is from a project we shipped.</code></p>
<p><strong>New stat labels:</strong></p>
<ul>
<li><code>Projects Shipped</code> (63+) / &quot;Across construction, hospitality, non-profit, tech, and events.&quot;</li>
<li><code>Clients Served</code> (34+) / &quot;Phoenix-based, nationally active. Every project gets the same team, the same standard.&quot;</li>
<li><code>Videos Delivered</code> (100+) / Keep the dynamic archive count as the sub-copy.</li>
</ul>
<p><em>All approved by Steffen in copy-brand-review.md.</em></p>
<hr>
<h3>6. Portfolio Section</h3>
<p><strong>Current headline:</strong> <code>The Portfolio.</code></p>
<p><strong>Current tabs:</strong> <code>marketing</code> | <code>builders</code></p>
<p><strong>Current subhead:</strong> None.</p>
<p><strong>What&#39;s wrong:</strong> Two tabs with names that don&#39;t match the three market segments. &quot;Marketing&quot; is confusing (AOM does marketing). &quot;Builders&quot; is ambiguous. No subhead to frame the work. The portfolio is too busy because it dumps everything into two undifferentiated buckets.</p>
<p><strong>New tabs:</strong> <code>brands</code> | <code>construction</code> | <code>all</code></p>
<p><strong>New subhead:</strong> <code>Real projects. Real clients. All of it shipped.</code></p>
<p><strong>Remove the &quot;founders&quot; tab</strong> from the data entirely. Recategorize those projects:</p>
<ul>
<li>SaaS explainers, product stories -&gt; <code>brands</code></li>
<li>Event recaps (IAAPA, Gitex) -&gt; <code>brands</code></li>
</ul>
<p>Why three tabs and not per-market-segment pages: Patrik said the portfolio is &quot;too busy.&quot; Adding more categories makes it busier. Three clean tabs (brands, construction, all) let visitors find what&#39;s relevant without overwhelming them. Per-market landing pages are a Phase 2 move.</p>
<hr>
<h3>7. Engagement Ideas / Packages</h3>
<p><strong>Current micro-label:</strong> <code>Identify Your Needs</code></p>
<p><strong>Current headline:</strong> <code>CHOOSE YOUR EXECUTION PATH.</code></p>
<p><strong>What&#39;s wrong:</strong> &quot;Identify Your Needs&quot; is corporate workshop language. &quot;Execution Path&quot; sounds like a project management tool. The engagement idea names (&quot;The Big Launch&quot;, &quot;Founder Authority&quot;, &quot;The Wildcard&quot;) are on the kill list.</p>
<p><strong>New micro-label:</strong> <code>How We Work</code></p>
<p><strong>New headline:</strong> <code>PICK WHAT FITS.</code></p>
<p><strong>Renamed cards:</strong></p>
<ul>
<li>&quot;The Big Launch&quot; -&gt; <code>Product Launch</code> / &quot;We are bringing a new development or product to market and need a full asset suite.&quot;</li>
<li>&quot;Content Engine&quot; -&gt; keep as-is</li>
<li>&quot;Founder Authority&quot; -&gt; <code>Brand Authority</code> / &quot;We need to establish credibility and trust with clients, investors, or future hires.&quot;</li>
<li>&quot;Social Proof&quot; -&gt; <code>Case Study</code> / &quot;We have great projects but no cinematic case studies. We need to prove our expertise.&quot;</li>
<li>&quot;Event Capture&quot; -&gt; keep as-is</li>
<li>&quot;The Wildcard&quot; -&gt; <code>Custom Brief</code> / &quot;We have a specific vision that doesn&#39;t fit a template. We need a creative partner who gets it.&quot;</li>
</ul>
<p><em>All approved by Steffen.</em></p>
<hr>
<h3>8. Trust / Why Us Section</h3>
<p><strong>Current micro-label:</strong> <code>Why Us</code></p>
<p><strong>Current headline:</strong> <code>THE REASON THIS WORKS.</code></p>
<p><strong>Current values:</strong></p>
<ul>
<li>Predictable Delivery: &quot;Tight timelines&quot; / &quot;Structured pre-pro + capture + edit pipeline.&quot;</li>
<li>Fast Turnarounds: &quot;24-72hr&quot; / &quot;For selects + social cuts when needed.&quot;</li>
<li>Lean Crew: &quot;Cinema-grade&quot; / &quot;Efficient staffing, zero chaos, high output.&quot;</li>
<li>Brand Consistency: &quot;Repeatable&quot; / &quot;Systems for matching style across assets.&quot;</li>
</ul>
<p><strong>What&#39;s wrong:</strong> The descriptions are written for people who already know production jargon. &quot;Pre-pro + capture + edit pipeline&quot; means nothing to a contractor or a VP.</p>
<p><strong>New headline:</strong> <code>WHY IT WORKS.</code></p>
<p><strong>New values:</strong></p>
<ul>
<li>Predictable Delivery: &quot;Tight timelines&quot; / &quot;You&#39;ll know what&#39;s happening and when. No surprises, no delays, no scope creep.&quot;</li>
<li>Fast Turnarounds: &quot;24-72hr&quot; / &quot;When you need social cuts or selects fast, we deliver. Not weeks. Days.&quot;</li>
<li>Lean Crew: &quot;Cinema-grade&quot; / &quot;Small team. Big output. No layers of account managers between you and the people doing the work.&quot;</li>
<li>Brand Consistency: &quot;Repeatable&quot; / &quot;Every piece looks like it came from the same team. Because it did.&quot;</li>
</ul>
<hr>
<h3>9. Footer</h3>
<p><strong>Current headline:</strong> <code>Ready to Scale?</code></p>
<p><strong>Current CTAs:</strong> <code>Start Brief</code> | <code>Call Us</code></p>
<p><strong>Current bottom:</strong> <code>Call Production</code> | <code>hello@aom-inhouse.com</code></p>
<p><strong>What&#39;s wrong:</strong> &quot;Scale&quot; is startup speak. &quot;Call Production&quot; is jargon.</p>
<p><strong>New headline:</strong> <code>READY TO BUILD?</code></p>
<p><strong>New CTAs:</strong> <code>Start a Brief</code> | <code>Talk to Us</code></p>
<p><strong>New bottom:</strong> <code>Call the Team</code> | <code>hello@aom-inhouse.com</code></p>
<hr>
<h3>10. Brief / Inquiry Form</h3>
<p><strong>Current label (step 2):</strong> <code>Current Bottleneck</code></p>
<p><strong>Current placeholder:</strong> <code>Example: We have great work but no case study video that wins industrial contracts.</code></p>
<p><strong>Current label (step 3):</strong> <code>Select Budget Tier (Submits Brief)</code></p>
<p><strong>Current success label:</strong> <code>Engagement Logic Verified</code></p>
<p><strong>What&#39;s wrong:</strong> &quot;Bottleneck&quot; is ops jargon. The placeholder only speaks to one audience. &quot;Budget Tier&quot; is corporate. &quot;Engagement Logic Verified&quot; sounds like a server log.</p>
<p><strong>New label (step 2):</strong> <code>What&#39;s the challenge?</code></p>
<p><strong>New placeholder:</strong> <code>We&#39;re winning jobs but nobody knows it. We need content that shows the work we do.</code></p>
<p><strong>New label (step 3):</strong> <code>What&#39;s your budget? (This submits your brief)</code></p>
<p><strong>New success label:</strong> <code>Brief Summary</code></p>
<hr>
<h3>11. FAQ Section</h3>
<p>The FAQ data exists in App.jsx but the section is not rendered on the page. Bobby needs to wire it up.</p>
<p><strong>Keep existing FAQs:</strong></p>
<ol>
<li>&quot;What happens after I hit &#39;Start Brief&#39;?&quot; (keep as-is)</li>
<li>&quot;Do you handle strategy or just production?&quot; (keep as-is, &quot;If the asset doesn&#39;t move trust or attention, it&#39;s just expensive footage&quot; is peak AOM)</li>
<li>&quot;How fast can you turn edits?&quot; (keep as-is)</li>
</ol>
<p><strong>Add three new FAQs:</strong></p>
<ol start="4">
<li><p><code>What industries do you work with?</code> / <code>Construction, hospitality, tech, non-profit. We specialize in construction companies that need consistent content to recruit and win contracts. But the production quality and systems we&#39;ve built work across all of them.</code></p>
</li>
<li><p><code>What does a retainer include?</code> / <code>Regular filming sessions, a full month of social content, strategy, editing, and posting. The scope scales to fit your business. Everything handled.</code></p>
</li>
<li><p><code>Can we start with a single project?</code> / <code>Yes. A lot of retainer clients start with one brand video or event capture to see how we work. No commitment required.</code></p>
</li>
</ol>
<hr>
<h2>Portfolio Strategy</h2>
<h3>The Problem</h3>
<p>Patrik: &quot;Portfolio is too busy.&quot;</p>
<p>Right now the portfolio dumps 18+ campaigns and 6+ social clips into two tabs (marketing, builders). Each tab loads a gallery with no hierarchy. Everything is equal weight. A visitor&#39;s eye has nowhere to land.</p>
<h3>The Fix</h3>
<p><strong>1. Reduce the visible count.</strong> Show 6 campaigns per tab on load. &quot;See all work&quot; expands to the full library. Less is more. Let the best pieces represent.</p>
<p><strong>2. Lead with the strongest work.</strong> Don&#39;t shuffle. Curate. Pin the top 3 campaigns per tab. The rest can shuffle.</p>
<p>For <code>brands</code>:</p>
<ul>
<li>Pin: Journey to Gary Vee (cinematic narrative), Virtu Hospitality (luxury/food), Gitex Dubai (global scale)</li>
<li>These three show range: story, brand, event</li>
</ul>
<p>For <code>construction</code>:</p>
<ul>
<li>Pin: To Have and To Host (luxury residential), Memorial Towers (industrial scale), Ambition Mechanical social clips</li>
<li>These three show range: residential, commercial, social</li>
</ul>
<p><strong>3. Social clips get their own row.</strong> Don&#39;t mix 16:9 campaigns with 9:16 social content. Social clips are a separate horizontal scroll row below the campaign grid. Smaller thumbnails. Clear visual distinction.</p>
<p><strong>4. Case study approach (Phase 2).</strong> Each pinned project eventually gets a case study page: the brief, the approach, the result, the deliverables. For now, the video embed is enough. But structure the data model to support case studies later.</p>
<h3>Portfolio Tab Names</h3>
<table>
<thead>
<tr>
<th>Current</th>
<th>New</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td><code>marketing</code></td>
<td><code>brands</code></td>
<td>&quot;Marketing&quot; is what AOM does. &quot;Brands&quot; is who the work was for.</td>
</tr>
<tr>
<td><code>builders</code></td>
<td><code>construction</code></td>
<td>Direct. No ambiguity.</td>
</tr>
<tr>
<td>(hidden <code>founders</code>)</td>
<td>remove</td>
<td>Kill list item. Recategorize into <code>brands</code>.</td>
</tr>
<tr>
<td>(none)</td>
<td><code>all</code></td>
<td>Default view. Shows everything. Low effort, high value for visitors who just want to browse.</td>
</tr>
</tbody></table>
<hr>
<h2>Speed Considerations</h2>
<h3>Video Background</h3>
<p>The biggest risk to site speed. Here&#39;s how to keep it fast:</p>
<ol>
<li><strong>Poster image loads first.</strong> A single JPEG frame from the reel. Under 50KB. This is what the visitor sees during the first 0-2 seconds.</li>
<li><strong>Video loads asynchronously.</strong> <code>preload=&quot;none&quot;</code> on the <code>&lt;video&gt;</code> tag. After the splash screen completes, JavaScript triggers the video load.</li>
<li><strong>Compressed aggressively.</strong> Target under 3MB for desktop, under 1.5MB for mobile. Use HandBrake or FFmpeg: <code>ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset fast -vf scale=1920:-2 -an output.mp4</code></li>
<li><strong>Mobile fallback.</strong> On connections slower than 4G (check <code>navigator.connection.effectiveType</code>), skip the video entirely. The poster image is the hero. This alone keeps mobile LCP under 2.5s.</li>
<li><strong>No audio track.</strong> Strip the audio track from the file. Saves 10-20% of filesize for zero benefit (video is muted).</li>
</ol>
<h3>Lazy Loading</h3>
<ul>
<li><strong>Above the fold:</strong> Hero (video + poster), nav, pathway cards. Load immediately.</li>
<li><strong>First scroll:</strong> Services Grid, first market section. Load on scroll trigger (Framer Motion&#39;s <code>whileInView</code> already handles this).</li>
<li><strong>Everything else:</strong> Lazy load. Portfolio video thumbnails use <code>loading=&quot;lazy&quot;</code> on images. Gumlet iframes don&#39;t load until clicked.</li>
<li><strong>The FAQ section:</strong> Render on scroll. It&#39;s text, so it&#39;s tiny, but no reason to include it in the initial bundle.</li>
</ul>
<h3>What to Defer</h3>
<ol>
<li><strong>Firebase auth.</strong> Already deferred (loads async). Keep it that way.</li>
<li><strong>Gumlet embeds.</strong> Only load when a user clicks play. The current implementation does this correctly.</li>
<li><strong>Google Fonts.</strong> Use <code>display=swap</code> (already in the imports). Consider self-hosting Inter and Inter Tight (they&#39;re open source) to eliminate the Google Fonts round-trip. JetBrains Mono can stay on Google CDN since it&#39;s only used for micro-labels.</li>
<li><strong>The brief/inquiry modal.</strong> It&#39;s a React portal. It only renders when opened. No cost at load time.</li>
</ol>
<h3>What to Load Immediately</h3>
<ol>
<li>The hero poster image (JPEG, &lt;50KB)</li>
<li>The CSS (Tailwind, already small)</li>
<li>The nav</li>
<li>Inter Tight Bold + Black Italic (the headline fonts, needed for LCP)</li>
</ol>
<h3>Kill Dead Weight</h3>
<ul>
<li><strong>three.js:</strong> Steffen flagged this. It&#39;s imported but never used. 162KB. Remove it.</li>
<li><strong>Splash screen:</strong> Reduce from 5-8 seconds to 2 seconds max. Or add click-to-skip. Every second of loader is a visitor who bounces.</li>
</ul>
<h3>Target Metrics</h3>
<table>
<thead>
<tr>
<th>Metric</th>
<th>Current (estimate)</th>
<th>Target</th>
</tr>
</thead>
<tbody><tr>
<td>LCP</td>
<td>~3-4s (splash screen blocks it)</td>
<td>&lt;2.5s</td>
</tr>
<tr>
<td>FCP</td>
<td>~1s</td>
<td>&lt;1s</td>
</tr>
<tr>
<td>CLS</td>
<td>Low (good)</td>
<td>&lt;0.1</td>
</tr>
<tr>
<td>Total page weight</td>
<td>~800KB+ (with three.js)</td>
<td>&lt;600KB (excluding lazy-loaded video)</td>
</tr>
</tbody></table>
<hr>
<h2>Summary for the Chain</h2>
<p><strong>Steffen:</strong> Review the hero copy change (from &quot;BRAND INFRASTRUCTURE&quot; to &quot;WE MAKE COMPANIES IMPOSSIBLE TO IGNORE&quot;), the pathway gate concept, the new Brands + Corporate and Digital + Systems sections, and the portfolio restructure. Everything else in this doc builds on copy you&#39;ve already approved.</p>
<p><strong>Bobby:</strong> The biggest structural changes are: (1) video background in hero, (2) pathway gate cards below the hero, (3) two new market sections modeled after ConstructionCallout, (4) portfolio tab restructure, (5) FAQ section wired up, (6) three.js removed, (7) splash screen shortened.</p>
<p><strong>Elmer:</strong> QA the video load behavior across devices, check that pathway cards scroll to the right sections, verify portfolio filtering works, and test the hero on 375px to confirm no truncation.</p>
<hr>
<p><em>This doc is the strategy layer. Steffen checks brand alignment. Bobby builds from it. If something in here conflicts with what Steffen already approved in copy-brand-review.md, Steffen&#39;s version wins.</em></p>
<hr>
<h2>Additional Patrik Feedback (added after Alex&#39;s pass)</h2>
<p>These came directly from Patrik after reviewing the current site:</p>
<ol>
<li><strong>Portfolio section is neat but not impressive.</strong> Needs a better thought-out presentation, not just a clean grid.</li>
<li><strong>Text kerning is too tight in spots.</strong> Steffen needs to audit typography spacing across the site.</li>
<li><strong>Too much sameness.</strong> The site has a monotone visual rhythm. Words start to glaze over. Needs visual variety, texture changes, rhythm breaks to keep attention.</li>
<li><strong>Alex should stay focused on how it converts.</strong> Every decision should drive toward turning visitors into leads.</li>
<li><strong>Jacob needs to review this direction</strong> to make sure the site gives him ammo for outreach campaigns.</li>
</ol>
`,c={title:e,slug:t,category:o,agent:n,date:s,dateFormatted:r,updated:null,summary:i,tags:a,content:l};export{n as agent,o as category,l as content,s as date,r as dateFormatted,c as default,t as slug,i as summary,a as tags,e as title,d as updated};
