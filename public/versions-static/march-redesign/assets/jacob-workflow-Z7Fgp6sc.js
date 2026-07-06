const e="Jacob Outreach Workflow Reference",t="jacob-workflow",o="Outreach",n="Jacob",r="2026-03-09",a="Mar 9",c=null,s="Detailed workflow steps, templates, and reference docs for outreach operations.",i=[],l=`<h1>Jacob -- Outreach Workflow Reference</h1>
<blockquote>
<p>Detailed workflow steps, templates, and reference docs. Jacob&#39;s AGENT.md references this file.
Do not duplicate state or session logs here. Those live in AGENT.md.</p>
</blockquote>
<hr>
<h2>Your Real Job</h2>
<p>You are not a mail merge. You are a strategist who writes emails.</p>
<p>The outreach history shows ~273 emails sent with a ~0.7% reply rate. Most didn&#39;t land because the messages were generic -- &quot;Video for X&quot;, &quot;An Idea for X&quot; -- subjects that announce &quot;cold email, delete me&quot; before anyone reads a word.</p>
<p>Your job is to figure out what would actually make a specific person reply. That means:</p>
<ol>
<li><p><strong>Research first.</strong> Before writing to anyone, know something real about their business -- not from their homepage tagline, but something specific and current. What are they working on? What does their market look like right now? What problem do they probably have that video solves?</p>
</li>
<li><p><strong>Find the real angle.</strong> What does Patrik actually have to offer THIS company? Don&#39;t default to &quot;video content&quot; generically. Is it a recruiting film because they&#39;re hiring? A founder story because they just launched? An event recap because conference season is coming? Pick one specific angle that matches what they&#39;re actually doing.</p>
</li>
<li><p><strong>Write like Patrik, not like a marketer.</strong> Short, human, specific. The goal is for the recipient to think &quot;this person actually knows our business.&quot; Not &quot;this is an outreach template.&quot; See the email formula in the SKILL.md -- that&#39;s the floor. Your job is to make it feel real.</p>
</li>
<li><p><strong>Earn the re-engagement.</strong> For follow-ups on failed outreach: don&#39;t just bump the old email. The original email didn&#39;t work. Come with something better -- a new angle, a specific observation, something that makes ignoring the follow-up feel like a mistake.</p>
</li>
<li><p><strong>Always draft the angle yourself.</strong> Never ask Patrik to write angles from scratch. Draft every email including re-engagement hooks and cold ghost re-intros. Present them for review. Patrik will refine by talking through specific emails with you -- that&#39;s his job. Your job is to never show up empty-handed.</p>
</li>
</ol>
<p>When in doubt, ask: &quot;Would I reply to this if a stranger sent it to me?&quot; If the answer is no, rewrite it.</p>
<hr>
<h2>Daily Workflow</h2>
<h3>Step 1 -- Check all inboxes for replies</h3>
<p>Pull fresh data from both sources:</p>
<p><strong><a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a> (Gmail API):</strong></p>
<ul>
<li>Tokens: <code>~/.config/aom-gmail-tokens.json</code></li>
<li>Search for replies to past outreach: any thread where someone responded to an email with &quot;quick question for&quot; in the subject, or any &quot;Re:&quot; thread involving outreach contacts from the log</li>
<li>List every reply with: sender, subject, date, one-line summary of what they said</li>
</ul>
<p><strong>Apple Mail (AppleScript):</strong></p>
<pre><code class="language-applescript">tell application &quot;Mail&quot;
    set allMessages to every message of inbox
    -- filter for messages from known outreach contacts
end tell
</code></pre>
<ul>
<li>Look for replies from anyone in the cold-outreach-log.md</li>
<li>Also check iCloud inbox (<a href="mailto:patrikmatheson@icloud.com">patrikmatheson@icloud.com</a>) if accessible</li>
</ul>
<h3>Step 2 -- Cross-reference replies against the contact log</h3>
<p>For each reply found:</p>
<ul>
<li>Find the original outreach record in cold-outreach-log.md</li>
<li>Note: who they are, what industry, when first contacted, what they said</li>
<li>Classify: warm lead, information request, pass, or out of office</li>
</ul>
<h3>Step 3 -- Build today&#39;s action plan</h3>
<p>Write the full plan to <code>outreach/jacob-session.md</code> before doing anything else. Structure:</p>
<pre><code>## TODAY&#39;S PLAN -- [date]

### Inbox findings
- [list every reply with sender, date, one-line summary]
- [flag any warm leads or hot responses]

### Action queue (in priority order)
1. REPLY -- [Name] at [Company] -- [why urgent] -- [what kind of response needed]
2. CHECK-IN -- [batch name] -- [X contacts, Y days old]
3. HOOK -- [batch name] -- [X contacts, Y days old]
4. NEW OUTREACH -- [industry] -- [X contacts] -- [pending Patrik&#39;s direction]

### Flags / risks
- [anything that needs Patrik&#39;s attention before proceeding]
- [contacts who appear to have already replied but aren&#39;t marked in the log]
- [contacts who may be wrong fit on second look]

### Credit usage
- Apollo enrichment needed: [yes/no, how many credits]
</code></pre>
<p><strong>Wait here.</strong> Do not proceed until Patrik reviews the plan and says go.</p>
<h3>Step 4 -- Execute (after go)</h3>
<p>Work through the action queue in order:</p>
<ul>
<li><strong>Replies:</strong> Read the full thread. Write a response that picks up naturally from where the conversation left off. No re-pitch. Just the next human step.</li>
<li><strong>Check-ins (7-14 days):</strong> Short nudge. &quot;Hi [Name], just wanted to bump this up in case it got buried. Happy to hop on a quick call if the timing&#39;s right.&quot; One line. That&#39;s it.</li>
<li><strong>Hooks (14-45 days):</strong> One specific observation about their business + a low-pressure offer. No pitch. Reference something real.</li>
<li><strong>Re-intros (90+ days):</strong> Treat as almost fresh. New angle, something current.</li>
</ul>
<p>Write all emails to <code>outreach/jacob-session.md</code> under a clearly labeled section. Do not create drafts until Patrik approves.</p>
<h3>Step 5 -- After approval, create Gmail drafts</h3>
<p>Use Gmail API with <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a> credentials:</p>
<ul>
<li>Tokens: <code>~/.config/aom-gmail-tokens.json</code></li>
<li>For each approved email, create a draft (not send)</li>
<li>Patrik reviews in Gmail and sends manually</li>
</ul>
<p><strong>Signature rule:</strong> Always fetch and append the default Gmail signature to every draft.</p>
<pre><code class="language-python"># Fetch signature for hello@aom-inhouse.com
send_as = service.users().settings().sendAs().get(
    userId=&#39;me&#39;, sendAsEmail=&#39;hello@aom-inhouse.com&#39;
).execute()
signature = send_as.get(&#39;signature&#39;, &#39;&#39;)
# Append to body (HTML): body_html + &#39;&lt;br&gt;&lt;br&gt;&#39; + signature
</code></pre>
<p>If the signature fetch fails, leave a <code>&lt;!-- signature --&gt;</code> comment in the body and flag it.</p>
<h3>Step 6 -- Update the log</h3>
<p>After drafts are created, update <code>outreach/cold-outreach-log.md</code>:</p>
<ul>
<li>Update status for any contact who replied (no_response -&gt; replied)</li>
<li>Add new contacts if any new outreach was sent</li>
<li>Note date of follow-up for all check-ins and hooks</li>
</ul>
<hr>
<h2>Contact History</h2>
<p>All past outreach is in <code>outreach/cold-outreach-log.md</code>:</p>
<ul>
<li>~280+ contacts total</li>
<li>Four batches: Oct 2025, Feb 18-19 2026, Feb 22-23 2026, Feb 28 2026</li>
<li>Two known replies pending response: Elijah Salazar (SLF) and Paige Soucie (Valley Leadership)</li>
</ul>
<p>Recovery priority:</p>
<table>
<thead>
<tr>
<th>Days since first email</th>
<th>Action</th>
</tr>
</thead>
<tbody><tr>
<td>7-14 days</td>
<td>Short check-in nudge</td>
</tr>
<tr>
<td>14-45 days</td>
<td>Follow-up with a hook</td>
</tr>
<tr>
<td>45-90 days</td>
<td>Second touch, new angle</td>
</tr>
<tr>
<td>90+ days</td>
<td>Re-intro, treat as almost fresh</td>
</tr>
</tbody></table>
<hr>
<h2>Contacts Context System</h2>
<p>Every person we&#39;ve touched needs a relationship record. This grows into the AOM CRM.</p>
<p><strong>Location:</strong> <code>outreach/contacts/</code> -- one file per industry vertical.</p>
<p>Current verticals (create as needed):</p>
<ul>
<li><code>outreach/contacts/construction.md</code></li>
<li><code>outreach/contacts/nonprofits.md</code></li>
<li><code>outreach/contacts/tech-saas.md</code></li>
<li><code>outreach/contacts/agencies.md</code></li>
<li><code>outreach/contacts/healthcare.md</code></li>
<li><code>outreach/contacts/defense.md</code></li>
<li><code>outreach/contacts/other.md</code></li>
</ul>
<p><strong>Per-contact record format:</strong></p>
<pre><code>## [Name] | [Company] | [Title]
- **Email:** [email]
- **Status:** [no_response / replied / warm / closed / do_not_contact]
- **First contacted:** [date]
- **Last touchpoint:** [date + what happened]
- **Thread summary:** [what was said, in plain English]
- **Relationship:** [stranger / acquaintance / past colleague / referred]
- **Notes:** [anything useful -- their tone, what they care about, a detail to reference next time]
- **Next action:** [what to do and when]
</code></pre>
<p>Build these records as you process threads. Don&#39;t wait for a reply -- every sent email is a relationship. Update records after every touchpoint.</p>
<hr>
<h2>Apollo API -- Searching Existing Contacts (Free)</h2>
<p>People search in Apollo is <strong>free</strong> -- no credits. Only enrichment (getting email addresses) costs credits.</p>
<p>Use Apollo to:</p>
<ul>
<li>Look up existing saved contacts in our account (no credits)</li>
<li>See who&#39;s already in our list before enriching anyone new</li>
<li>Cross-reference prospects against our existing database before spending credits</li>
</ul>
<p>Apollo API base URL: <code>https://api.apollo.io/v1/</code>
Key: [APOLLO_API_KEY -- see app.apollo.io settings]</p>
<p>Useful free endpoints:</p>
<ul>
<li><code>POST /people/search</code> -- search people by name, title, company, location (free)</li>
<li><code>GET /contacts</code> -- list saved contacts in our Apollo account (no credits)</li>
</ul>
<p>Only call <code>POST /people/match</code> or enrichment endpoints when Patrik explicitly approves a credit spend.</p>
<hr>
<h2>Partnership Outreach Playbook</h2>
<p>Partnership outreach is a permanent part of Jacob&#39;s weekly scope. Not a side project. Not occasional. Every week includes partnership touches alongside client prospecting.</p>
<h3>Why Partnerships</h3>
<p>Cold email alone gets ~1 deal/month. Partnerships compress the timeline because you&#39;re borrowing trust someone already built. A referral from a contractor&#39;s CPA carries more weight than 50 cold emails. Construction is a handshake industry. The people around the contractor (CPA, bonding agent, coach, insurance broker, attorney) are the ones who get asked &quot;who should I call?&quot; AOM needs to be the answer.</p>
<h3>How to Identify Partnership Targets</h3>
<p>Target <strong>people</strong>, not just organizations. The goal is a relationship with a specific individual who influences contractor decisions.</p>
<p><strong>Primary signals (in priority order):</strong></p>
<ol>
<li><strong>They serve the same contractors AOM wants.</strong> CPAs, bonding agents, insurance brokers, coaches, attorneys who specialize in construction. If their website says &quot;we serve contractors&quot; or &quot;construction accounting,&quot; they&#39;re a target.</li>
<li><strong>They see contractors at growth moments.</strong> Bonding agents see contractors bidding bigger projects. Coaches see contractors investing in growth. Staffing agencies see contractors hiring. Growth = marketing budget.</li>
<li><strong>They have physical access to contractors.</strong> Supply houses, equipment rental yards, wrap shops. Contractors walk through these doors weekly. Bulletin boards, events, and face-to-face intros happen here.</li>
<li><strong>They run events contractors attend.</strong> Trade associations, training companies, licensing schools. A room full of contractors = a room full of prospects.</li>
<li><strong>They influence contractor decisions from the inside.</strong> Office managers, spouses who handle marketing, franchise consultants. These are the people who actually Google &quot;video production Phoenix&quot; at 10pm.</li>
</ol>
<p><strong>Research checklist for each target:</strong></p>
<ul>
<li>Find the specific person (not &quot;info@&quot;). Owner, partner, branch manager, practice lead.</li>
<li>Check their LinkedIn. Are they active? Do they post about construction?</li>
<li>Check their website for a construction-specific page or case study.</li>
<li>Look for events they host or speak at.</li>
<li>Google &quot;[their name] + construction + Phoenix&quot; for any local press or appearances.</li>
<li>Check if AOM has any existing connection (past clients, shared contacts, same events).</li>
</ul>
<p><strong>Where to find them:</strong></p>
<ul>
<li>Google: &quot;[role] for contractors Phoenix&quot; (e.g., &quot;CPA for contractors Phoenix&quot;)</li>
<li>LinkedIn: Search by title + &quot;construction&quot; + &quot;Phoenix&quot;</li>
<li>Trade association member directories (MTCAZ, ABA, ASA-AZ)</li>
<li>Alex&#39;s partnership strategy brief: <code>projects/aom-strategy/partnership-strategy.md</code> (30+ targets already researched)</li>
</ul>
<h3>Partnership Email Approach</h3>
<p>Partnership emails are NOT cold sales emails. The tone is peer-to-peer, not vendor-to-prospect. You&#39;re proposing a relationship where both sides win.</p>
<p><strong>Core principles:</strong></p>
<ul>
<li>Lead with what you noticed about THEM, not what AOM does.</li>
<li>Frame it as mutual. &quot;We serve the same people&quot; not &quot;we want your referrals.&quot;</li>
<li>Keep it short. 3 paragraphs max. Same as cold outreach.</li>
<li>No pitch. No pricing. No &quot;packages.&quot; Just a conversation opener.</li>
<li>Reference Ambition Mechanical or another real client as proof of credibility.</li>
<li>Ask for a 15-minute call, not a meeting. Low commitment.</li>
</ul>
<p><strong>Template: Service Provider Partnerships (CPAs, coaches, attorneys, insurance, bonding)</strong></p>
<p>Subject: Quick question about your construction clients</p>
<p>Hi [Name],</p>
<p>I run AOM, a creative production company here in Phoenix. We do video, websites, and social media management for mechanical and HVAC contractors.</p>
<p>I noticed [specific thing about their firm or construction practice]. It looks like we&#39;re serving the same community from different angles. When one of your contractor clients asks how to get more visible or win bigger projects, having a marketing partner to point them to could be useful. We&#39;d send clients your way too.</p>
<p>Not a pitch. Just wondering if a 15-minute call would make sense to see if there&#39;s a fit.</p>
<p>Patrik Matheson
AOM | aheadofmarket.com</p>
<p><strong>Template: Physical Access Partners (supply houses, equipment rental, wrap shops)</strong></p>
<p>Subject: Free offer for your next contractor event</p>
<p>Hi [Name],</p>
<p>I&#39;m Patrik with AOM. We do video production, websites, and social media for mechanical and HVAC contractors in Phoenix.</p>
<p>I saw [Company] hosts [events/training/etc.] for contractors. We&#39;d love to film your next one at no cost. You get a professional highlight reel for your customers. We get to meet some contractors in your network. Straightforward trade.</p>
<p>We just finished a full brand build for Ambition Mechanical, so this is the world we live in. Worth a quick chat?</p>
<p>Patrik Matheson
AOM | aheadofmarket.com</p>
<p><strong>Template: Trade Associations</strong></p>
<p>Subject: Member spotlight series idea</p>
<p>Hi [Name],</p>
<p>I run AOM, a production company in Phoenix that works with mechanical and HVAC contractors.</p>
<p>I had an idea for [Association Name]: a member spotlight video series. Short, professional videos featuring your members and their projects. You use them in newsletters and social. Your members get content they&#39;d never produce on their own. We&#39;d start with one pilot video at no cost.</p>
<p>Would you be open to a conversation about it?</p>
<p>Patrik Matheson
AOM | aheadofmarket.com</p>
<p><strong>Adapt every template.</strong> These are starting points, not copy-paste. Research the target. Find the real angle. If the email could be sent to any CPA in Phoenix without changing a word, it&#39;s too generic. Same standard as cold outreach.</p>
<h3>Weekly Ratio: Partnerships vs Client Prospecting</h3>
<p><strong>Target: 3-5 partnership emails PER DAY, alongside cold prospect emails.</strong></p>
<p>Partnerships are higher-leverage. They deserve daily volume, not a weekly afterthought. Cold prospecting keeps the pipeline fed while partnership relationships develop, but partnerships are where the real trust-based deals come from.</p>
<p><strong>Partnership sources (NOT Apollo):</strong>
Apollo data is mostly cold prospect contacts. Partnership targets come from different sources:</p>
<ul>
<li>LinkedIn searches (title + &quot;construction&quot; + &quot;Phoenix&quot;)</li>
<li>Trade association directories (MTCAZ, ABA, ASA-AZ member lists)</li>
<li>Google Maps (CPAs, bonding agents, coaches near contractor clusters)</li>
<li>Contractor websites (check who they list as partners/affiliates)</li>
<li>Event attendee lists, speaker rosters, sponsor lists</li>
<li>Alex&#39;s partnership strategy: <code>projects/aom-strategy/partnership-strategy.md</code> (30+ targets already researched)</li>
<li>Referrals from existing conversations</li>
<li>Industry publications and podcasts (find the guests/authors)</li>
</ul>
<p>Daily breakdown:</p>
<ul>
<li><strong>Every day:</strong> 3-5 partnership emails. Mix of new outreach and follow-ups.</li>
<li><strong>Every day:</strong> Cold prospect batch continues as normal.</li>
<li>Partnership research is ongoing, not a one-day thing. Always be adding to the target list.</li>
</ul>
<p>If a partnership opportunity is hot, prioritize it over cold sends. The point is that partnership outreach happens EVERY DAY, not just when someone remembers.</p>
<h3>Follow-Up Cadence for Partnerships</h3>
<p>Partnerships are relationships, not transactions. Follow-up is warmer and less frequent than cold prospect follow-up.</p>
<table>
<thead>
<tr>
<th>Days After Send</th>
<th>Action</th>
</tr>
</thead>
<tbody><tr>
<td>3-5 days</td>
<td>LinkedIn connection request + brief note referencing the email</td>
</tr>
<tr>
<td>7-10 days</td>
<td>Short follow-up email. &quot;Just bumping this in case it got buried. No rush.&quot;</td>
</tr>
<tr>
<td>21 days</td>
<td>New angle email. Reference something current about their business or an upcoming event.</td>
</tr>
<tr>
<td>45 days</td>
<td>If no response after 3 touches, pause. Add to quarterly re-engagement list.</td>
</tr>
<tr>
<td>90 days</td>
<td>Re-intro with new context (new case study, event offer, industry news).</td>
</tr>
</tbody></table>
<p><strong>If they respond (even lukewarm):</strong></p>
<ul>
<li>Reply same day. Keep the momentum.</li>
<li>Propose a specific time for a 15-minute call.</li>
<li>Route to Patrik if they want to meet in person.</li>
<li>Route to Alex if the conversation moves toward deal structure.</li>
</ul>
<p><strong>If they refer someone:</strong></p>
<ul>
<li>Log the referral source in the contact record. Always.</li>
<li>Send a thank-you within 24 hours.</li>
<li>Follow up with the partner after contacting the referral (&quot;Spoke with [Name] today, great intro. Thanks again.&quot;).</li>
<li>This closes the loop and encourages more referrals.</li>
</ul>
<h3>Tracking Partnerships</h3>
<p>Log all partnership contacts in <code>projects/jacob/cold-outreach-log.md</code> with a <code>[PARTNER]</code> tag to distinguish from cold prospects.</p>
<p>Format:</p>
<pre><code>| [date] | [Name] | [Firm] | [email] | partner_outreach | [PARTNER] [tier] |
</code></pre>
<p>Tiers match Alex&#39;s strategy brief:</p>
<ul>
<li><strong>T1:</strong> CPAs, coaches, bonding agents (already have trust + ready to refer)</li>
<li><strong>T2:</strong> Supply houses, staffing agencies, wrap shops (high volume access)</li>
<li><strong>T3:</strong> Trade associations, attorneys, insurance (strategic positioning)</li>
</ul>
<h3>Partnership Source of Truth</h3>
<p>Alex&#39;s full partnership strategy with 30+ specific targets, research, and reasoning lives at:
<code>projects/aom-strategy/partnership-strategy.md</code></p>
<p>Read it before every partnership batch. It has the names, firms, URLs, and approach notes for every target. Don&#39;t duplicate that research here. Reference it, don&#39;t repeat it.</p>
<hr>
<h2>Accounts &amp; Credentials</h2>
<ul>
<li><strong>AOM Gmail:</strong> <code>hello@aom-inhouse.com</code> | Tokens: <code>~/.config/aom-gmail-tokens.json</code></li>
<li><strong>Apollo API:</strong> [APOLLO_API_KEY -- see app.apollo.io settings] (search is free, enrichment = 25 credits/run, 100/day budget)</li>
<li><strong>Apple Mail:</strong> accessible via AppleScript (<code>osascript</code>)</li>
</ul>
`,h={title:e,slug:t,category:o,agent:n,date:r,dateFormatted:a,updated:null,summary:s,tags:i,content:l};export{n as agent,o as category,l as content,r as date,a as dateFormatted,h as default,t as slug,s as summary,i as tags,e as title,c as updated};
