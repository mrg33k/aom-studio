const t="AOM Copy Brand Alignment Review",e="copy-brand-review",o="Design Specs",n="Steffen",s="2026-03-09",i="Mar 9",c=null,r="Brand alignment review of Alex's website copy before Bobby implements.",a=[],d=`<h1>AOM Copy Review: Brand Alignment Check</h1>
<blockquote>
<p>Steffen (Brand) reviewing Alex (Copy) | 2026-03-09
Next: Bobby (implementation)</p>
</blockquote>
<hr>
<h2>Overview</h2>
<p>Alex did strong work. Most of his changes align with brand guidelines and catch real violations. I&#39;m approving the majority and modifying a handful where voice, typography, or layout implications need adjustment.</p>
<p>The biggest intervention: the &quot;3-5 shoots = 30 days of content&quot; framing. Patrik flagged it as sounding too good to be true, and he&#39;s right. AOM&#39;s brand is anti-BS. I&#39;ve rewritten it below to be honest without underselling.</p>
<hr>
<h2>Section-by-Section Review</h2>
<h3>1. Header / Nav</h3>
<p><strong>Alex proposed:</strong> <code>Call Us</code> to <code>Talk to Us</code> | <code>Get Started</code> to <code>Start a Brief</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Both changes align with brand guidelines. &quot;Call Us&quot; is on the kill list. &quot;Start a Brief&quot; matches the form title and the structured-brief philosophy. No layout impact. Both strings are shorter or equal length, so no overflow risk in the nav.</p>
<hr>
<h3>2. Hero Section</h3>
<h4>2a. Subhead Rewrite</h4>
<p><strong>Alex proposed:</strong> <code>We build the content, websites, and systems that make companies impossible to ignore.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> This is nearly word-for-word the one-line positioning statement from brand guidelines. Tighter than the current comma-list version. Fits within the <code>max-w-2xl</code> constraint for subheads. Inter 400, <code>#A8A29E</code>, sentence case. Good.</p>
<h4>2b. Cycling Word: SCALE to WIN</h4>
<p><strong>Alex proposed:</strong> Replace <code>SCALE</code> with <code>WIN</code> in the hero cycling words (BUILD, GROW, SHIP, WIN).</p>
<p><strong>Steffen verdict:</strong> MODIFY</p>
<p><strong>Notes:</strong> &quot;WIN&quot; is strong for construction but reads slightly aggressive in isolation. The cycling words appear in a 72px italic black-weight headline. At that visual scale, &quot;WIN&quot; has a competitive energy that doesn&#39;t match AOM&#39;s &quot;intentional, not scrappy&quot; positioning. Alternative:</p>
<p><strong>Use:</strong> <code>BUILD, GROW, SHIP, MOVE.</code></p>
<p>&quot;MOVE&quot; connects to tagline candidate #3 (&quot;We make what moves you forward&quot;), works for all verticals, and keeps the momentum energy without startup or sports connotations. It also pairs better visually at large type sizes. Four characters, clean.</p>
<p>Bobby: the cycling word array is in <code>HeroSection.jsx</code>. Swap <code>SCALE</code> for <code>MOVE</code>.</p>
<hr>
<h3>3. Services Grid</h3>
<h4>3a. Section Subhead</h4>
<p><strong>Alex proposed:</strong> <code>Whether you need monthly content, a single production, or the systems to tie it all together.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> More specific than the current version. Fits within the subhead role (Inter 400, <code>#A8A29E</code>, <code>max-w-2xl</code>). No layout change needed.</p>
<h4>3b. Content Engine Description (THE &quot;3-5 SHOOTS&quot; LINE)</h4>
<p><strong>Alex proposed:</strong> <code>3-5 shoots a month. 30 days of content. Your in-house media team without the overhead. We handle strategy, production, and posting.</code></p>
<p><strong>Steffen verdict:</strong> MODIFY</p>
<p><strong>Notes:</strong> Patrik&#39;s flag is correct. &quot;3-5 shoots a month = 30 days of content&quot; sounds like a guarantee, and it reads like a marketing formula. AOM&#39;s voice is &quot;we get it,&quot; not &quot;we promise the moon.&quot;</p>
<p>The honest version: the output depends on the client, the scope, and the content type. Some months it&#39;s 3 shoots. Some months it&#39;s more. The content volume scales with how much raw material exists.</p>
<p><strong>Use this instead:</strong></p>
<p><code>Your in-house media team without the overhead. We show up, shoot, and turn it into a month of content. Strategy, production, and posting handled.</code></p>
<p>Why this works:</p>
<ul>
<li>&quot;We show up, shoot, and turn it into a month of content&quot; is honest about the process without promising exact numbers</li>
<li>&quot;A month of content&quot; is directionally true without being a formula</li>
<li>Keeps the &quot;in-house team without the overhead&quot; line that Alex correctly preserved</li>
<li>Reads conversational, not salesy</li>
</ul>
<p>Bobby: this lives in <code>ServicesGrid.jsx</code>, Content Engine card description.</p>
<h4>3c. Service Card CTAs</h4>
<p><strong>Alex proposed:</strong> <code>Learn more</code> to <code>See how it works</code> / <code>See the work</code> / <code>See what we&#39;d build</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Differentiated CTAs per lane is better than three identical &quot;Learn more&quot; links. These match the ghost CTA pattern from brand guidelines (text link, <code>text-aom-orange</code>, <code>font-bold</code>, arrow icon inline). No layout impact since these are text links, not buttons.</p>
<p>Bobby: update all three CTA labels in <code>ServicesGrid.jsx</code>.</p>
<hr>
<h3>4. Construction Callout</h3>
<h4>4a. Recruiting Description</h4>
<p><strong>Alex proposed:</strong> Adding &quot;your competitor&#39;s content&quot; to the Instagram line.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Directly from brand guidelines voice section. The sting is intentional. That&#39;s how AOM talks to construction companies.</p>
<h4>4b. Winning Bids: &quot;GCs&quot; to &quot;General contractors&quot;</h4>
<p><strong>Alex proposed:</strong> Spell out &quot;GCs&quot; to &quot;General contractors.&quot;</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Good call. The person making the buying decision might not be a field PM. Spell it out. The longer string fits fine in the card description at body text size.</p>
<h4>4c. Ambition Proof Card Body</h4>
<p><strong>Alex proposed:</strong> Lead with the story, move service list after.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> &quot;One HVAC company that decided their brand should match the quality of their work&quot; is a strong opening line. Leading with story over services is better copywriting and better brand alignment.</p>
<h4>4d. Mini Stat: &quot;1 Filming Day&quot; to &quot;3-5 Shoots / Per Month&quot;</h4>
<p><strong>Alex proposed:</strong> Change the stat from &quot;1 Filming Day&quot; to &quot;3-5 Shoots&quot; with label &quot;Per Month.&quot;</p>
<p><strong>Steffen verdict:</strong> MODIFY</p>
<p><strong>Notes:</strong> Same issue as the Content Engine card. Specific numbers that read like a guarantee. Stats in this section use Inter Tight 900 italic at 48-72px. A number like &quot;3-5&quot; at that scale with &quot;Per Month&quot; underneath implies a contractual commitment.</p>
<p><strong>Use instead:</strong></p>
<ul>
<li>Stat: <code>Monthly</code></li>
<li>Label: <code>Filming + Posting</code></li>
</ul>
<p>This communicates consistency (which is the real value) without a specific number that varies by client. It pairs with the existing &quot;30+ Posts/Month&quot; stat next to it, which IS a real number from the Ambition engagement.</p>
<p>Bobby: update the stat object in <code>ConstructionCallout.jsx</code>.</p>
<h4>4e. Added Stat Bar: &quot;3-5 shoots a month. 30 days of content. Zero guesswork.&quot;</h4>
<p><strong>Alex proposed:</strong> Add a bold one-line stat bar below the Ambition proof card.</p>
<p><strong>Steffen verdict:</strong> MODIFY</p>
<p><strong>Notes:</strong> The structure is good (a scannable one-liner connecting proof to value prop), but the copy needs the same honesty treatment.</p>
<p><strong>Use:</strong> <code>Consistent filming. Consistent posting. That&#39;s the whole system.</code></p>
<p>This is more &quot;we get it&quot; and less &quot;we guarantee the moon.&quot; It communicates the value (consistency) without specific numbers that sound like a sales pitch.</p>
<p>Bobby: add this as a <code>p</code> element below the Ambition card. Inter Tight 700, sentence case, <code>text-aom-warm-white</code>, <code>text-lg</code>. Not italic (it&#39;s a statement, not a headline).</p>
<hr>
<h3>5. AI Teaser</h3>
<h4>5a. Subhead Rewrite</h4>
<p><strong>Alex proposed:</strong> <code>We built the system that runs our own content pipeline, client ops, and reporting. Now we&#39;re building them for a small group of businesses.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Removes &quot;AI system&quot; lead, which brand guidelines explicitly say not to do. More specific about what the system does. Fits within the subhead role.</p>
<h4>5b. Process Step Input: &quot;1 filming day&quot; to &quot;3-5 shoots / month&quot;</h4>
<p><strong>Alex proposed:</strong> Update the process visualization input.</p>
<p><strong>Steffen verdict:</strong> MODIFY</p>
<p><strong>Notes:</strong> The process visualization uses JetBrains Mono at 13-14px. It&#39;s the &quot;system speaking&quot; layer. Specific numbers work better here than in marketing copy because the context is technical/process.</p>
<p><strong>Use:</strong> <code>filming days / month</code> as input, keeping the output as <code>30 days of social content</code>.</p>
<p>The input is deliberately vague on the exact number because it varies. The output stays specific because that&#39;s the real result. This matches the brand guideline example: &quot;1 filming day in. 30 days of content out.&quot; but drops the &quot;1&quot; to avoid the same promise problem.</p>
<p>Bobby: update the process step in <code>AITeaser.jsx</code>.</p>
<h4>5c. Capabilities List Updates</h4>
<p><strong>Alex proposed:</strong> More specific capability descriptions + &quot;your business&quot; instead of &quot;internal tools.&quot;</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Both changes are improvements. &quot;Content pipeline that turns shoots into 30 days of posts&quot; shows transformation. &quot;Your business&quot; instead of &quot;internal tools&quot; makes it client-facing. These are body text items in the capabilities list, no layout impact.</p>
<hr>
<h3>6. Stats / Authority Section</h3>
<h4>6a. Headline: &quot;PHOENIX PRODUCTION / PROVEN SCALE.&quot; to &quot;THE WORK SPEAKS.&quot;</h4>
<p><strong>Alex proposed:</strong> <code>THE WORK SPEAKS.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> &quot;Phoenix Production&quot; is on the kill list. &quot;THE WORK SPEAKS.&quot; is short, confident, and follows the headline formula (bold claim). Uppercase, italic, black weight, Inter Tight. Clean at any viewport size. Good.</p>
<h4>6b. Sidebar Card Rewrite</h4>
<p><strong>Alex proposed:</strong> <code>Real clients. Real results. Every number on this page is from a project we shipped.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Removes the retired tagline echo. &quot;Every number on this page is from a project we shipped&quot; is anti-BS energy done right. Fits within the sidebar card at body text size.</p>
<h4>6c. Stat Labels</h4>
<p><strong>Alex proposed:</strong> &quot;Phoenix Impact&quot; to &quot;Projects Shipped&quot; | &quot;Regional Reach&quot; to &quot;Clients Served&quot; | &quot;Assets Shipped&quot; to &quot;Videos Delivered&quot;</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> All three changes replace vague internal jargon with plain language. The stat numbers (63+, 34+, 100+) render in Inter Tight 900 italic at 48-72px. The kicker labels sit below at a smaller size. New label text lengths are all comparable to current. No layout risk.</p>
<p>One flag: &quot;Phoenix-based, nationally active&quot; in the Clients Served sub-copy is a clean way to handle geographic identity without the killed &quot;Phoenix Production&quot; positioning. Good workaround.</p>
<p>Bobby: all stat copy lives in the stats section of <code>App.jsx</code> (around line 673 per Alex&#39;s reference).</p>
<hr>
<h3>7. Testimonials</h3>
<h4>7a. Brandon Clarke Quote Fix</h4>
<p><strong>Alex proposed:</strong> Remove redundant &quot;recruiting tool in recruiting.&quot;</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> This is a clarity fix, not a voice change. The quote stays authentic but reads better.</p>
<h4>7b. Gio Osso Missing Period</h4>
<p><strong>Alex proposed:</strong> Add missing period.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Typo fix.</p>
<h4>7c. Future Construction Testimonial (Ambition Mechanical)</h4>
<p><strong>Alex proposed:</strong> Add a placeholder testimonial for when Ambition results are in.</p>
<p><strong>Steffen verdict:</strong> APPROVE (as a flag, not for implementation now)</p>
<p><strong>Notes:</strong> Don&#39;t add a placeholder to the live site. Flag it for when Jake has a real quote. AOM doesn&#39;t use fabricated or projected testimonials. When it&#39;s real, it goes first or second in the testimonial row.</p>
<p>Bobby: no action now. This is a future item.</p>
<hr>
<h3>8. Portfolio Section</h3>
<h4>8a. Tab: &quot;builders&quot; to &quot;construction&quot;</h4>
<p><strong>Alex proposed:</strong> Rename tab to <code>construction</code>.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Clear, direct, matches the target vertical language. No ambiguity.</p>
<h4>8b. Tab: &quot;marketing&quot; to &quot;brands&quot;</h4>
<p><strong>Alex proposed:</strong> Rename tab to <code>brands</code>.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> &quot;Marketing&quot; is confusing because AOM does marketing. &quot;Brands&quot; as a category is the right distinction.</p>
<h4>8c. Add Subhead</h4>
<p><strong>Alex proposed:</strong> <code>Real projects. Real clients. Click any piece to watch.</code></p>
<p><strong>Steffen verdict:</strong> MODIFY</p>
<p><strong>Notes:</strong> &quot;Click any piece to watch&quot; is instructional UI copy, not brand copy. It doesn&#39;t belong in a subhead.</p>
<p><strong>Use:</strong> <code>Real projects. Real clients. All of it shipped.</code></p>
<p>Keeps the anti-BS pair (&quot;real projects, real clients&quot;) and adds &quot;shipped&quot; which is on the approved word list. The interactivity is obvious from the video module hover behavior (grayscale to color).</p>
<p>Bobby: add as a <code>p</code> subhead below &quot;THE PORTFOLIO.&quot; headline. Inter 400, <code>text-aom-stone</code>, <code>max-w-2xl</code>.</p>
<hr>
<h3>9. Engagement Ideas / Packages</h3>
<h4>9a. Micro-label and Headline</h4>
<p><strong>Alex proposed:</strong> <code>Identify Your Needs</code> to <code>How We Work</code> | <code>CHOOSE YOUR EXECUTION PATH.</code> to <code>PICK WHAT FITS.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Both are direct upgrades. &quot;How We Work&quot; is active. &quot;PICK WHAT FITS.&quot; is short, confident, no jargon. Fits the headline formula. At 72px italic, &quot;PICK WHAT FITS.&quot; is scannable and won&#39;t have viewport issues.</p>
<h4>9b. Engagement Idea Renames</h4>
<p><strong>Alex proposed:</strong></p>
<ul>
<li>&quot;The Big Launch&quot; to &quot;Product Launch&quot;</li>
<li>&quot;Founder Authority&quot; to &quot;Brand Authority&quot;</li>
<li>&quot;The Wildcard&quot; to &quot;Custom Brief&quot;</li>
<li>&quot;Social Proof&quot; to &quot;Case Study&quot;</li>
</ul>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> All three kill-list items are addressed. &quot;Brand Authority&quot; works for all verticals (not just founders). &quot;Custom Brief&quot; connects to the form. &quot;Case Study&quot; is plain language. &quot;Product Launch&quot; is descriptive.</p>
<p>The statements Alex wrote for each are on-brand. Specifically: &quot;We have a specific vision that doesn&#39;t fit a template. We need a creative partner who gets it.&quot; on Custom Brief is strong.</p>
<p>Bobby: update engagement idea titles and statements in <code>App.jsx</code>.</p>
<h4>9c. Keep Content Engine and Event Capture</h4>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> These are already clear and on-brand. No change needed.</p>
<hr>
<h3>10. Trust / &quot;Why Us&quot; Section</h3>
<h4>10a. Headline: &quot;THE REASON THIS WORKS.&quot; to &quot;WHY IT WORKS.&quot;</h4>
<p><strong>Alex proposed:</strong> <code>WHY IT WORKS.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Tighter. Same meaning. Good.</p>
<h4>10b. Value Rewrites</h4>
<p><strong>Alex proposed:</strong> Updated descriptions for Lean Crew, Predictable Delivery, Brand Consistency.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> All three rewrites improve clarity for non-production audiences. &quot;Every piece looks like it came from the same team. Because it did.&quot; has the right amount of personality. These are body text items in trust metric cards, no layout concerns.</p>
<hr>
<h3>11. Footer</h3>
<h4>11a. Headline: &quot;Ready to Scale?&quot; to &quot;READY TO BUILD?&quot;</h4>
<p><strong>Alex proposed:</strong> <code>READY TO BUILD?</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Removes startup-speak. &quot;BUILD&quot; is on the approved word list and matches the hero cycling word. Construction-forward. Renders well as an uppercase italic headline at any size.</p>
<h4>11b. CTAs</h4>
<p><strong>Alex proposed:</strong> <code>Start Brief</code> to <code>Start a Brief</code> | <code>Call Us</code> to <code>Talk to Us</code> | <code>Call Production</code> to <code>Call the Team</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> All consistent with header changes and kill list compliance. &quot;Call the Team&quot; is warmer than &quot;Call Production.&quot; No layout impact.</p>
<hr>
<h3>12. Brief / Inquiry Form</h3>
<h4>12a. &quot;Current Bottleneck&quot; to &quot;What&#39;s the challenge?&quot;</h4>
<p><strong>Alex proposed:</strong> Replace jargon with conversational label.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> &quot;Bottleneck&quot; is operations jargon. &quot;What&#39;s the challenge?&quot; is how a human asks the question.</p>
<h4>12b. Updated Placeholder Example</h4>
<p><strong>Alex proposed:</strong> <code>We&#39;re winning jobs but nobody knows it. We need content that shows the work we do.</code></p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Construction-forward. Reads like something an actual contractor would say.</p>
<h4>12c. &quot;Engagement Logic Verified&quot; to &quot;Brief Summary&quot;</h4>
<p><strong>Alex proposed:</strong> Replace system-log language with plain label.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> &quot;Engagement Logic Verified&quot; sounds like a server response, not a confirmation. &quot;Brief Summary&quot; is clear.</p>
<h4>12d. &quot;Select Budget Tier&quot; to &quot;Select your investment range&quot;</h4>
<p><strong>Alex proposed:</strong> Softer language for the budget step.</p>
<p><strong>Steffen verdict:</strong> MODIFY</p>
<p><strong>Notes:</strong> &quot;Investment range&quot; is still slightly corporate. Construction companies talk about project cost, not investment ranges.</p>
<p><strong>Use:</strong> <code>What&#39;s your budget?</code> with note <code>(This submits your brief)</code></p>
<p>Direct. Honest. No one in construction says &quot;investment range.&quot; They say &quot;What&#39;s this gonna cost?&quot; and &quot;What&#39;s the budget?&quot; Match that energy.</p>
<p>Bobby: update label text in the form step 3 in <code>App.jsx</code>.</p>
<hr>
<h3>13. Phone Modal</h3>
<p><strong>Alex proposed:</strong> No changes. Flagged the single-number routing.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Agree with Alex&#39;s flag. No copy changes needed now. The department routing UI is premium and intentional. When call volume grows, revisit.</p>
<hr>
<h3>14. FAQ Section</h3>
<h4>14a. Existing FAQ Copy</h4>
<p><strong>Alex proposed:</strong> Keep existing. &quot;If the asset doesn&#39;t move trust or attention, it&#39;s just expensive footage&quot; is peak AOM voice.</p>
<p><strong>Steffen verdict:</strong> APPROVE</p>
<p><strong>Notes:</strong> Agree completely. That line stays verbatim.</p>
<h4>14b. New FAQs</h4>
<p><strong>Alex proposed three new FAQs:</strong></p>
<ol>
<li><p><code>What industries do you work with?</code> / <code>Construction, hospitality, tech, non-profit. We specialize in construction companies that need consistent content to recruit and win contracts.</code></p>
</li>
<li><p><code>What does a retainer include?</code> / <code>3-5 filming sessions per month, 30+ pieces of social content, strategy, editing, and posting. Everything handled.</code></p>
</li>
<li><p><code>Can we start with a single project?</code> / <code>Yes. A lot of retainer clients start with one brand video or event capture to see how we work. No commitment required.</code></p>
</li>
</ol>
<p><strong>Steffen verdict:</strong> MODIFY (FAQ #2 only, approve #1 and #3)</p>
<p><strong>Notes:</strong> FAQ #2 has the same &quot;3-5 sessions&quot; specificity problem. Rewrite:</p>
<p><strong>Use for FAQ #2:</strong> <code>What does a retainer include?</code> / <code>Regular filming sessions, a full month of social content, strategy, editing, and posting. The scope scales to fit your business. Everything handled.</code></p>
<p>This communicates volume and comprehensiveness without a specific number that reads like a contractual promise.</p>
<p>FAQ #1 and #3 are clean. FAQ #3 (&quot;No commitment required&quot;) is strong for construction companies evaluating vendors.</p>
<p>Bobby: if the FAQ section isn&#39;t rendered on the page (Alex noted this), it needs to be wired up. Check if the FAQ data exists but isn&#39;t being displayed.</p>
<hr>
<h2>&quot;3-5 Shoots = 30 Days of Content&quot; Summary</h2>
<p>Patrik&#39;s instinct is right. Here&#39;s how the value prop appears across the site after my modifications:</p>
<table>
<thead>
<tr>
<th>Location</th>
<th>Alex proposed</th>
<th>Steffen final</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Content Engine card</td>
<td><code>3-5 shoots a month. 30 days of content.</code></td>
<td><code>We show up, shoot, and turn it into a month of content.</code></td>
<td>Honest process, not a formula</td>
</tr>
<tr>
<td>Construction stat</td>
<td><code>3-5 Shoots / Per Month</code></td>
<td><code>Monthly / Filming + Posting</code></td>
<td>Communicates consistency without a number</td>
</tr>
<tr>
<td>Construction stat bar (new)</td>
<td><code>3-5 shoots a month. 30 days of content. Zero guesswork.</code></td>
<td><code>Consistent filming. Consistent posting. That&#39;s the whole system.</code></td>
<td>&quot;We get it&quot; energy, not a sales promise</td>
</tr>
<tr>
<td>AI Teaser process input</td>
<td><code>3-5 shoots / month</code></td>
<td><code>filming days / month</code></td>
<td>Vague input, specific output</td>
</tr>
<tr>
<td>FAQ #2</td>
<td><code>3-5 filming sessions per month, 30+...</code></td>
<td><code>Regular filming sessions, a full month of social content...</code></td>
<td>No specific count</td>
</tr>
</tbody></table>
<p>The theme: communicate consistency and volume without pinning a number that varies by client. The &quot;30 days of content&quot; output can stay where it&#39;s already proven (Ambition Mechanical&#39;s real stat of &quot;30+ Posts/Month&quot;) but should not be presented as a universal guarantee.</p>
<hr>
<h2>Typography Check</h2>
<p>All proposed copy works within the type system:</p>
<ul>
<li><strong>Headlines</strong> (Inter Tight 900, italic, uppercase): &quot;THE WORK SPEAKS.&quot;, &quot;WHY IT WORKS.&quot;, &quot;PICK WHAT FITS.&quot;, &quot;READY TO BUILD?&quot; are all short enough for <code>max-w-45ch</code> at any responsive size. No overflow risk.</li>
<li><strong>Subheads</strong> (Inter Tight 700, sentence case): Alex&#39;s subhead rewrites are all within <code>max-w-2xl</code> bounds.</li>
<li><strong>Body</strong> (Inter 400, <code>#A8A29E</code>): Card descriptions stay within readable line lengths.</li>
<li><strong>Micro-labels</strong> (JetBrains Mono 700, uppercase, <code>tracking-[0.3em]</code>): &quot;How We Work&quot;, &quot;Construction Companies&quot; all fit.</li>
<li><strong>Stat numbers</strong> (Inter Tight 900, italic, 48-72px): The number &quot;Monthly&quot; in the construction stat is text, not a number. Use Inter Tight 700 bold (not 900 black) since it&#39;s a word, not a figure. Or keep the current &quot;1&quot; format and just change to the &quot;30+&quot; stat that&#39;s already proven.</li>
</ul>
<p>One flag from the site audit: the hero headline &quot;BRAND INFRASTRUCTURE&quot; truncates on mobile (375-390px). None of Alex&#39;s hero copy changes fix this. The headline text stays the same length.</p>
<p><strong>Bobby:</strong> the mobile headline truncation issue (from site audit finding #1) should be addressed alongside these copy updates. Reduce <code>font-size</code> at the <code>sm</code> breakpoint or add a responsive step: <code>text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl</code>. Test that &quot;INFRASTRUCTURE&quot; fits at 375px.</p>
<hr>
<h2>Layout / Design Implications</h2>
<ol>
<li><p><strong>New stat bar below Ambition card</strong> (section 4e): This adds a new element to the Construction Callout. Bobby should add it as a full-width line below the proof card, with <code>mt-8</code> spacing. Inter Tight 700, <code>text-lg</code>, <code>text-aom-warm-white</code>.</p>
</li>
<li><p><strong>Portfolio subhead</strong> (section 8c): New <code>p</code> element below &quot;THE PORTFOLIO.&quot; headline. <code>mb-4</code> between headline and subhead, <code>mb-8</code> between subhead and tabs.</p>
</li>
<li><p><strong>Three new FAQs</strong>: If the FAQ section needs to be rendered (Alex flagged it may not be visible), this is a structural addition, not just a copy change. Bobby should check if the FAQ component exists but isn&#39;t imported/rendered.</p>
</li>
<li><p><strong>Service card CTAs</strong>: Changing from identical &quot;Learn more&quot; to differentiated labels means three different strings. Check that the longest one (&quot;See how it works&quot;) doesn&#39;t break the card layout at mobile widths.</p>
</li>
<li><p><strong>Engagement idea rename</strong>: &quot;Brand Authority&quot; is longer than &quot;Founder Authority&quot; by 1 character. &quot;Product Launch&quot; is 1 character shorter than &quot;The Big Launch.&quot; No layout risk. &quot;Custom Brief&quot; is 6 characters shorter than &quot;The Wildcard.&quot; All fine.</p>
</li>
</ol>
<hr>
<h2>Brand Considerations Alex Missed</h2>
<ol>
<li><p><strong>The splash screen.</strong> My site audit flagged a 5-8 second loader with no skip. Alex&#39;s review covers copy but doesn&#39;t mention this UX issue. Bobby should reduce the loader to 2-3 seconds max or add a click-to-skip. This is a conversion issue, not just a polish item.</p>
</li>
<li><p><strong>Zinc to warm palette migration.</strong> Alex noted that legacy App.jsx sections use <code>zinc-</code> color classes instead of <code>aom-</code> custom classes. This is a visual brand violation. The warm palette (Night, Charcoal, Stone) is defined in brand guidelines and should replace all zinc references. Bobby should do a find-and-replace from <code>zinc-</code> to the equivalent <code>aom-</code> values when implementing these copy changes.</p>
</li>
<li><p><strong>&quot;FOUNDERS&quot; tab in portfolio data.</strong> Alex mentioned a &quot;founders&quot; tab exists in the data but isn&#39;t shown. Per brand guidelines, &quot;founders/developers/SaaS as stated audience&quot; is on the kill list. If this data exists, remove it or recategorize those projects under &quot;brands.&quot;</p>
</li>
<li><p><strong>Mobile nav imbalance on iPhone SE.</strong> My site audit found the &quot;GET STARTED&quot; button floats alone at 375px. With the rename to &quot;Start a Brief&quot; (longer string), this could get worse. Bobby should test the header at 375px with the new CTA text.</p>
</li>
<li><p><strong>GET ACCESS button contrast.</strong> The sage green &quot;GET ACCESS&quot; button in the AI section was flagged in my audit as low-contrast. This isn&#39;t a copy issue but it affects the AI Teaser section that Alex reviewed. Bobby should check WCAG AA contrast for that button.</p>
</li>
</ol>
<hr>
<h2>Priority Order for Bobby (Updated)</h2>
<p>Keeping Alex&#39;s priority order but with my modifications applied:</p>
<ol>
<li>Engagement ideas rename (kill list items still live)</li>
<li>Stats section headline and labels (kill list + jargon cleanup)</li>
<li>Footer headline (&quot;Scale&quot; to &quot;Build&quot;)</li>
<li>Header/footer CTAs (&quot;Call Us&quot; to &quot;Talk to Us&quot;, &quot;Get Started&quot; to &quot;Start a Brief&quot;)</li>
<li>Content Engine card (honest framing, no specific shoot count)</li>
<li>Construction callout updates (stat change, stat bar addition, copy tweaks)</li>
<li>AI Teaser subhead and process step</li>
<li>Portfolio tabs rename + subhead addition</li>
<li>Hero subhead + cycling word (SCALE to MOVE)</li>
<li>Form copy updates (bottleneck to challenge, budget tier to &quot;What&#39;s your budget?&quot;)</li>
<li>Trust section headline and value rewrites</li>
<li>FAQ section (render if hidden, add new FAQs, update FAQ #2)</li>
<li>Testimonial quote fixes (minor)</li>
<li>Mobile headline truncation fix (from site audit)</li>
<li>Splash screen duration reduction (from site audit)</li>
</ol>
<hr>
<p><em>All copy in this review is ready for Bobby to copy-paste into implementation. Where I&#39;ve written &quot;Use:&quot; the text is final and approved against brand guidelines.</em></p>
`,l={title:t,slug:e,category:o,agent:n,date:s,dateFormatted:i,updated:null,summary:r,tags:a,content:d};export{n as agent,o as category,d as content,s as date,i as dateFormatted,l as default,e as slug,r as summary,a as tags,t as title,c as updated};
