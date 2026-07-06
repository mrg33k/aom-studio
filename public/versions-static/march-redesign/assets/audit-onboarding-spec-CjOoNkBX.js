const e="AI Advisory Audit Onboarding Tool Spec",t="audit-onboarding-spec",n="Technical",i="Elon",o="2026-03-11",a="Mar 11",d=null,s="Technical spec for the audit onboarding tool, ready for Steffen design then Bobby build.",r=[],l=`<h1>AI Advisory Audit: Onboarding Tool Spec</h1>
<p><strong>Author:</strong> Elon (System Architect)
<strong>Date:</strong> 2026-03-11
<strong>Status:</strong> Spec complete. Ready for Steffen (design) then Bobby (build).</p>
<hr>
<h2>1. Purpose</h2>
<p>This is the $2,500 AI Operations Audit entry point. A branded, full-page onboarding experience at <code>aheadofmarket.com/audit/[slug]</code> where prospective clients walk through a structured intake process.</p>
<p>It replaces a generic Typeform or PDF questionnaire with something that feels like AOM built it. Premium. Intentional. The kind of thing a client screenshots and sends to their partner with &quot;this is what I&#39;m talking about.&quot;</p>
<p>The data collected feeds directly into the AI Opportunity Roadmap deliverable. Every question maps to a section of the audit output. Nothing is asked without a reason.</p>
<p><strong>Pipeline position:</strong> Client lands here after a sales conversation or cold outreach link. They complete the intake. AOM reviews submissions in an admin view. The audit deliverable gets built from the structured data.</p>
<hr>
<h2>2. UX Flow</h2>
<h3>Navigation Model</h3>
<ul>
<li>Single-page app. One slide visible at a time.</li>
<li>Slides advance forward/backward with keyboard (Enter/arrow keys) and buttons.</li>
<li>Progress bar at the top: thin, orange, grows left-to-right. Shows section name + slide count (e.g., &quot;TECH STACK / 3 of 6&quot;).</li>
<li>Section transitions get a brief interstitial: section number + title + one-line description. These are the &quot;chapter cards.&quot;</li>
</ul>
<h3>Save and Resume</h3>
<ul>
<li>Each client gets a unique URL: <code>aheadofmarket.com/audit/[slug]</code></li>
<li>Slug is generated at intake creation (by AOM, not the client). Sent via email or shared in a meeting.</li>
<li>Progress auto-saves to Supabase on every slide advance. No &quot;save&quot; button needed.</li>
<li>Client can close the tab and come back. Picks up where they left off.</li>
<li>Optional: email reminder if intake is started but not completed after 48 hours.</li>
</ul>
<h3>Completion</h3>
<ul>
<li>Final slide: thank you + what happens next (AOM reviews within 48 hours, schedules walkthrough call).</li>
<li>Submission triggers a notification to AOM admin (Supabase webhook or polling).</li>
</ul>
<h3>Responsive</h3>
<ul>
<li>Desktop-first design (most clients will do this at a desk). Full mobile support.</li>
<li>On mobile: same slide structure, inputs stack vertically, generous touch targets.</li>
</ul>
<hr>
<h2>3. Slide Breakdown (26 slides, 6 sections)</h2>
<h3>SECTION A: YOUR BUSINESS (Slides 1-5)</h3>
<p><strong>Interstitial A:</strong> &quot;01 / YOUR BUSINESS&quot; / &quot;Let&#39;s start with who you are and what you do.&quot;</p>
<p><strong>Slide 1: Welcome</strong></p>
<ul>
<li>Headline: &quot;Your AI Operations Audit Starts Here&quot;</li>
<li>Subtext: &quot;This takes about 15 minutes. Your answers shape a custom roadmap for your business. Everything you share stays confidential.&quot;</li>
<li>CTA: &quot;Let&#39;s Go&quot;</li>
<li>No input fields. Sets the tone.</li>
</ul>
<p><strong>Slide 2: Company Basics</strong></p>
<ul>
<li>Company name (text input)</li>
<li>Your name (text input)</li>
<li>Your role/title (text input)</li>
<li>Company website (text input, optional)</li>
</ul>
<p><strong>Slide 3: Industry and Size</strong></p>
<ul>
<li>Industry (dropdown: Construction, HVAC, Plumbing, Electrical, General Contractor, Roofing, Landscaping, Other Service Business, Professional Services, Other + write-in)</li>
<li>Number of employees (radio: Just me, 2-5, 6-15, 16-50, 51-100, 100+)</li>
<li>Annual revenue range (radio: Under $500k, $500k-$1M, $1M-$3M, $3M-$10M, $10M+, Prefer not to say)</li>
</ul>
<p><strong>Slide 4: Business Model</strong></p>
<ul>
<li>How do most of your jobs come in? (checkbox: Referrals, Website leads, Phone calls, Social media, Repeat customers, Bidding/proposals, Other)</li>
<li>How many active jobs/projects do you run at once? (radio: 1-3, 4-10, 11-25, 25+)</li>
</ul>
<p><strong>Slide 5: Team Structure</strong></p>
<ul>
<li>Who handles scheduling and dispatch? (radio: Me, Office manager, Dedicated dispatcher, Shared responsibility, No one / it&#39;s chaos)</li>
<li>Who handles invoicing and billing? (radio: Me, Bookkeeper, Office manager, Accountant/CPA, Shared responsibility)</li>
<li>Who handles customer communication? (radio: Me, Front desk / receptionist, Sales team, Everyone, It depends)</li>
</ul>
<h3>SECTION B: YOUR TECH STACK (Slides 6-10)</h3>
<p><strong>Interstitial B:</strong> &quot;02 / YOUR TECH STACK&quot; / &quot;What tools are you running today?&quot;</p>
<p><strong>Slide 6: Core Software</strong></p>
<ul>
<li>What software do you use to run your business? (checkbox grid: QuickBooks, Xero, FreshBooks, ServiceTitan, Housecall Pro, Jobber, Buildertrend, CoConstruct, CompanyCam, Google Workspace, Microsoft 365, None / pen and paper, Other + write-in)</li>
</ul>
<p><strong>Slide 7: Communication</strong></p>
<ul>
<li>How does your team communicate day-to-day? (checkbox: Phone calls, Text messages, Email, Slack, Microsoft Teams, WhatsApp, GroupMe, Walkie-talkie apps, Other)</li>
<li>How do customers reach you? (checkbox: Phone, Email, Website form, Text, Social media DM, Walk-in, Other)</li>
</ul>
<p><strong>Slide 8: Scheduling and Dispatch</strong></p>
<ul>
<li>How do you schedule jobs? (radio: Paper calendar, Google Calendar, Software scheduler (ServiceTitan, Jobber, etc.), Spreadsheet, Text messages / group chat, Whiteboard)</li>
<li>How often do scheduling conflicts or missed appointments happen? (radio: Rarely, A few times a month, Weekly, It&#39;s a constant problem)</li>
</ul>
<p><strong>Slide 9: Documents and Data</strong></p>
<ul>
<li>Where do your important files live? (checkbox: Computer desktop, Google Drive, Dropbox, OneDrive, Email attachments, Filing cabinets, Phone photos, All over the place)</li>
<li>How do you handle estimates and proposals? (radio: Templates in Word/Excel, Software-generated, Handwritten, Wing it every time)</li>
</ul>
<p><strong>Slide 10: Current AI Usage</strong></p>
<ul>
<li>Are you using any AI tools today? (radio: Yes actively, Tried it / didn&#39;t stick, Heard of it / haven&#39;t tried, What&#39;s AI?)</li>
<li>If yes, which ones? (text input, conditional on previous answer)</li>
</ul>
<h3>SECTION C: WHERE IT HURTS (Slides 11-16)</h3>
<p><strong>Interstitial C:</strong> &quot;03 / WHERE IT HURTS&quot; / &quot;No judgment. Every business has bottlenecks.&quot;</p>
<p><strong>Slide 11: Time Sinks</strong></p>
<ul>
<li>What tasks eat up the most time every week? (checkbox: Scheduling and rescheduling, Sending estimates/proposals, Following up with leads, Invoicing and chasing payments, Answering the same customer questions, Coordinating with crew/team, Ordering materials, Paperwork and compliance, Social media / marketing, Other + write-in)</li>
<li>Roughly how many hours per week do you spend on admin/ops? (radio: Under 5, 5-10, 10-20, 20-30, 30+, No idea but too many)</li>
</ul>
<p><strong>Slide 12: Follow-Up and Lead Management</strong></p>
<ul>
<li>How quickly do you respond to new leads? (radio: Within an hour, Same day, Next day, It varies wildly, We miss a lot)</li>
<li>How do you track proposals you&#39;ve sent? (radio: CRM/software, Spreadsheet, Email search, Memory, We don&#39;t really track them)</li>
</ul>
<p><strong>Slide 13: The Cracks</strong></p>
<ul>
<li>What falls through the cracks most often? (checkbox: Follow-ups with leads, Scheduling errors, Late invoices, Customer complaints, Internal communication, Material orders, Permit/inspection tracking, Nothing falls through, Other + write-in)</li>
</ul>
<p><strong>Slide 14: Hiring Pain</strong></p>
<ul>
<li>Is hiring and keeping good people a challenge? (radio: Major challenge, Moderate challenge, Manageable, Not an issue)</li>
<li>How do you onboard new hires? (radio: Formal training program, Shadow someone for a week, Sink or swim, We have SOPs / documented processes)</li>
</ul>
<p><strong>Slide 15: Customer Experience</strong></p>
<ul>
<li>How do your customers rate the experience of working with you? (radio: They love us, Generally positive, Mixed, We don&#39;t really know)</li>
<li>What&#39;s the most common customer complaint? (text area, optional)</li>
</ul>
<p><strong>Slide 16: Magic Wand</strong></p>
<ul>
<li>&quot;If you could snap your fingers and fix one thing in your business operations, what would it be?&quot; (text area, full width, generous height)</li>
<li>This is the money question. It tells AOM what the client values most.</li>
</ul>
<h3>SECTION D: YOUR OPERATIONS (Slides 17-20)</h3>
<p><strong>Interstitial D:</strong> &quot;04 / YOUR OPERATIONS&quot; / &quot;How the day-to-day actually runs.&quot;</p>
<p><strong>Slide 17: Daily Workflow</strong></p>
<ul>
<li>Walk us through a typical day from first call to last email. What happens? (text area)</li>
<li>What&#39;s the first thing you do every morning for the business? (text input)</li>
</ul>
<p><strong>Slide 18: Decision Making</strong></p>
<ul>
<li>When a decision needs to be made (pricing, scheduling, hiring), how does it happen? (radio: I make all decisions, I decide with my partner, Team leads have authority, Depends on the decision)</li>
<li>What information do you wish you had at your fingertips that you don&#39;t? (text area, optional)</li>
</ul>
<p><strong>Slide 19: Reporting and Visibility</strong></p>
<ul>
<li>Do you have a clear picture of your business performance at any given time? (radio: Yes / real-time dashboards, Mostly / I check reports weekly, Somewhat / I look at QuickBooks occasionally, No / I go by gut feel)</li>
<li>What would you want to see on a dashboard if you had one? (text area, optional)</li>
</ul>
<p><strong>Slide 20: Processes</strong></p>
<ul>
<li>Do you have documented processes/SOPs for how your team does things? (radio: Yes for most tasks, Some tasks, We&#39;ve been meaning to, No)</li>
<li>What&#39;s one process that&#39;s different every time someone does it? (text input, optional)</li>
</ul>
<h3>SECTION E: AI READINESS (Slides 21-24)</h3>
<p><strong>Interstitial E:</strong> &quot;05 / AI READINESS&quot; / &quot;Where you stand with AI and automation.&quot;</p>
<p><strong>Slide 21: Comfort Level</strong></p>
<ul>
<li>How comfortable are you with new technology? (radio: Love it / early adopter, Comfortable once I see the value, Cautious / need proof, Skeptical / show me)</li>
<li>Has anyone on your team used AI tools? (radio: Yes regularly, A few have tried, No, I&#39;m not sure)</li>
</ul>
<p><strong>Slide 22: Automation Appetite</strong></p>
<ul>
<li>Which of these would you automate if you could? (checkbox: Lead response and follow-up, Scheduling and dispatch, Estimates and proposals, Invoice creation and payment reminders, Customer check-ins and review requests, Social media posting, Employee onboarding, Report generation, Material ordering, All of the above)</li>
</ul>
<p><strong>Slide 23: Budget and Investment</strong></p>
<ul>
<li>What&#39;s your monthly budget for software and tools? (radio: Under $200, $200-$500, $500-$1,000, $1,000-$2,500, $2,500+, Not sure)</li>
<li>Have you invested in a consultant or advisor before? (radio: Yes and it was worth it, Yes and it wasn&#39;t, No but I&#39;m open to it, No and I&#39;m skeptical)</li>
</ul>
<p><strong>Slide 24: Data and Privacy</strong></p>
<ul>
<li>How sensitive is the data your business handles? (radio: Very / financial, medical, legal, Moderate / customer info and contracts, Low / mostly operational, Not sure)</li>
<li>Any compliance requirements? (checkbox: None that I know of, Industry licensing, Insurance requirements, Government contracts, OSHA, Other + write-in)</li>
</ul>
<h3>SECTION F: YOUR GOALS (Slides 25-26)</h3>
<p><strong>Interstitial F:</strong> &quot;06 / YOUR GOALS&quot; / &quot;What winning looks like for you.&quot;</p>
<p><strong>Slide 25: Priorities</strong></p>
<ul>
<li>Rank your top 3 priorities (drag-to-rank or numbered selection):<ul>
<li>Save time on admin work</li>
<li>Win more jobs / close more leads</li>
<li>Improve customer experience</li>
<li>Get better visibility into business performance</li>
<li>Scale without adding headcount</li>
<li>Reduce mistakes and things falling through cracks</li>
<li>Spend more time on the work I actually enjoy</li>
<li>Grow revenue</li>
</ul>
</li>
</ul>
<p><strong>Slide 26: Finish Line</strong></p>
<ul>
<li>What does success look like 12 months from now? (text area)</li>
<li>Anything else we should know? (text area, optional)</li>
<li>CTA: &quot;Submit My Audit&quot;</li>
</ul>
<h3>SLIDE 27: THANK YOU</h3>
<ul>
<li>&quot;You&#39;re in. We&#39;ll review everything and have your AI Opportunity Roadmap ready within 48 hours.&quot;</li>
<li>&quot;Next step: We&#39;ll reach out to schedule a 30-minute walkthrough of your custom roadmap.&quot;</li>
<li>AOM contact info. Link to /system page for more context.</li>
<li>No further input needed.</li>
</ul>
<hr>
<h2>4. Technical Spec</h2>
<h3>Stack</h3>
<ul>
<li><strong>Frontend:</strong> React (single-page app). Lives in the aom-studio repo alongside the existing site.</li>
<li><strong>Route:</strong> <code>/audit/[slug]</code> using React Router dynamic segments.</li>
<li><strong>Backend:</strong> Supabase (already decided for multi-tenant architecture).</li>
<li><strong>Auth:</strong> No client auth required. Unique slug = access. Admin auth via Supabase Auth (AOM team only).</li>
</ul>
<h3>Database Schema</h3>
<p><strong>Table: <code>audit_sessions</code></strong></p>
<table>
<thead>
<tr>
<th>Column</th>
<th>Type</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>id</td>
<td>uuid</td>
<td>Primary key</td>
</tr>
<tr>
<td>slug</td>
<td>text</td>
<td>Unique, URL-safe. Generated by AOM.</td>
</tr>
<tr>
<td>client_name</td>
<td>text</td>
<td>Nullable until slide 2</td>
</tr>
<tr>
<td>company_name</td>
<td>text</td>
<td>Nullable until slide 2</td>
</tr>
<tr>
<td>status</td>
<td>enum</td>
<td><code>draft</code>, <code>in_progress</code>, <code>completed</code>, <code>reviewed</code></td>
</tr>
<tr>
<td>current_slide</td>
<td>integer</td>
<td>Last slide visited</td>
</tr>
<tr>
<td>created_at</td>
<td>timestamp</td>
<td>When AOM created the session</td>
</tr>
<tr>
<td>started_at</td>
<td>timestamp</td>
<td>When client first opened it</td>
</tr>
<tr>
<td>completed_at</td>
<td>timestamp</td>
<td>When client submitted</td>
</tr>
<tr>
<td>reviewed_at</td>
<td>timestamp</td>
<td>When AOM marked it reviewed</td>
</tr>
</tbody></table>
<p><strong>Table: <code>audit_responses</code></strong></p>
<table>
<thead>
<tr>
<th>Column</th>
<th>Type</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>id</td>
<td>uuid</td>
<td>Primary key</td>
</tr>
<tr>
<td>session_id</td>
<td>uuid</td>
<td>FK to audit_sessions</td>
</tr>
<tr>
<td>slide_number</td>
<td>integer</td>
<td>1-27</td>
</tr>
<tr>
<td>question_key</td>
<td>text</td>
<td>Machine-readable key (e.g., <code>company_name</code>, <code>time_sinks</code>)</td>
</tr>
<tr>
<td>response_value</td>
<td>jsonb</td>
<td>Flexible: string, array of selections, ranking array, etc.</td>
</tr>
<tr>
<td>updated_at</td>
<td>timestamp</td>
<td>Last modified</td>
</tr>
</tbody></table>
<p>Using JSONB for responses keeps the schema flat. One row per question per session. Updates overwrite (client can go back and change answers).</p>
<h3>Unique URL Generation</h3>
<ul>
<li>AOM creates a session via admin panel (or API).</li>
<li>Slug format: <code>[company-shortname]-[6-char-random]</code> (e.g., <code>ambition-x7k2m9</code>).</li>
<li>Slug is shared with the client via email or in a meeting.</li>
</ul>
<h3>Auto-Save</h3>
<ul>
<li>On every slide advance (forward or backward), persist all answers on the current slide.</li>
<li>Debounced save on text areas (save 2 seconds after typing stops).</li>
<li>Visual indicator: small &quot;Saved&quot; text near progress bar. No save button.</li>
</ul>
<h3>Admin View</h3>
<ul>
<li>Route: <code>/audit/admin</code> (behind Supabase Auth).</li>
<li>List of all sessions with status, client name, company, completion percentage, dates.</li>
<li>Click into a session to see all responses formatted as a readable report.</li>
<li>Mark as &quot;reviewed&quot; when audit deliverable is being built.</li>
<li>Export option: JSON or CSV of all responses for a session.</li>
</ul>
<h3>Notifications</h3>
<ul>
<li>On completion: Supabase webhook triggers notification (email to AOM or Slack/Telegram message via edge function).</li>
<li>On 48-hour stall: edge function checks for <code>in_progress</code> sessions with no activity &gt; 48 hours, sends reminder email to client (with their slug link).</li>
</ul>
<hr>
<h2>5. Design Direction</h2>
<h3>The Feel</h3>
<p>This is not a form. It&#39;s a presentation. Each slide should feel like a premium PowerPoint deck where the client happens to be filling in their information. The AOM brand should be unmistakable on every screen.</p>
<h3>Key Principles</h3>
<ul>
<li><strong>One thought per slide.</strong> Never cram two unrelated questions on the same screen. Related fields (like name + company) can share a slide.</li>
<li><strong>Big typography.</strong> Syne for slide headlines. Space Grotesk for body and inputs. Headlines should be 32-48px, never smaller.</li>
<li><strong>Generous whitespace.</strong> Content centered vertically and horizontally in the viewport. Inputs never feel cramped.</li>
<li><strong>High contrast.</strong> Cream backgrounds for input-heavy slides. Night backgrounds for interstitials and the welcome/thank you. Orange accents for progress, CTAs, and active states.</li>
<li><strong>The progress bar is architectural.</strong> Not a thin little line. A proper bar with section label and count. Sits at the top of every slide.</li>
</ul>
<h3>Alternating Section Palette</h3>
<ul>
<li><strong>Interstitials (chapter cards):</strong> Night (#0C0C0C) background, Syne headline in cream (#FDF6EC), section number in orange (#E85D26), pattern strip accent.</li>
<li><strong>Input slides:</strong> Cream (#FDF6EC) background, dark text (#0A0A0A), orange accent on focused inputs and active radio/checkbox states.</li>
<li><strong>Welcome and thank you slides:</strong> Night background with orange CTA button.</li>
</ul>
<p>This alternation creates rhythm. Dark, light, dark, light. The client feels progression.</p>
<h3>Input Styling</h3>
<ul>
<li>Text inputs: full width, generous height (48-56px), bottom-border style (no box), Space Grotesk 18px.</li>
<li>Radio groups: large hit targets (full row clickable), pill-shaped options with orange fill on selection.</li>
<li>Checkboxes: grid layout (2-3 columns on desktop, 1 on mobile), pill badges that toggle orange on selection.</li>
<li>Dropdowns: custom styled (not native), cream background, orange highlight on hover.</li>
<li>Text areas: generous height (minimum 120px), subtle border, auto-grow.</li>
<li>All inputs use AOM brand focus states: orange underline or border, no default browser blue.</li>
</ul>
<h3>Navigation</h3>
<ul>
<li>Bottom of each slide: &quot;Back&quot; (ghost button, left) and &quot;Continue&quot; (orange primary button, right).</li>
<li>Keyboard: Enter advances, Shift+Enter for newlines in text areas.</li>
<li>Slide transitions: horizontal slide or crossfade. Subtle, fast (200-300ms). Not bouncy.</li>
</ul>
<h3>Mobile</h3>
<ul>
<li>Same slide structure, inputs stack to single column.</li>
<li>Progress bar simplifies to just the orange bar (no section label text on very small screens).</li>
<li>Navigation buttons full-width at bottom.</li>
<li>Touch targets minimum 44px.</li>
</ul>
<hr>
<h2>6. Data-to-Deliverable Mapping</h2>
<p>Every question maps to a section of the AI Opportunity Roadmap that AOM delivers as the audit output.</p>
<table>
<thead>
<tr>
<th>Audit Section</th>
<th>Fed By Slides</th>
<th>What It Produces</th>
</tr>
</thead>
<tbody><tr>
<td>Business Profile</td>
<td>2, 3, 4, 5</td>
<td>Company overview, size, structure, how work flows in</td>
</tr>
<tr>
<td>Current Tech Assessment</td>
<td>6, 7, 8, 9, 10</td>
<td>Tool inventory, integration gaps, underused software</td>
</tr>
<tr>
<td>Pain Point Analysis</td>
<td>11, 12, 13, 14, 15, 16</td>
<td>Ranked bottlenecks, time waste quantification, &quot;magic wand&quot; priority</td>
</tr>
<tr>
<td>Operations Map</td>
<td>17, 18, 19, 20</td>
<td>Workflow diagram, decision structure, visibility gaps, process maturity</td>
</tr>
<tr>
<td>AI Readiness Score</td>
<td>21, 22, 23, 24</td>
<td>Comfort level, automation appetite, budget fit, data sensitivity</td>
</tr>
<tr>
<td>Opportunity Roadmap</td>
<td>25, 26</td>
<td>Prioritized recommendations matched to stated goals</td>
</tr>
</tbody></table>
<h3>AI Readiness Score Calculation</h3>
<p>A simple composite score from Section E responses:</p>
<ul>
<li>Tech comfort (slide 21, Q1): 1-4 points</li>
<li>Team AI exposure (slide 21, Q2): 1-3 points</li>
<li>Automation appetite (slide 22): 1 point per selection, max 10</li>
<li>Software budget (slide 23, Q1): 1-5 points</li>
<li>Consultant openness (slide 23, Q2): 1-4 points</li>
<li>Data sensitivity awareness (slide 24): 1-3 points</li>
</ul>
<p>Score maps to a tier: <strong>Ready</strong> (20+), <strong>Warming Up</strong> (12-19), <strong>Starting Fresh</strong> (under 12). This tier shapes the language and pacing of the deliverable.</p>
<hr>
<h2>7. Security and Privacy</h2>
<ul>
<li>All data in transit: HTTPS (Vercel default).</li>
<li>All data at rest: Supabase encryption (AES-256).</li>
<li>Slugs are unguessable (6 random alphanumeric chars = 2.1 billion combinations).</li>
<li>No PII beyond business contact info. No SSNs, no financial account numbers.</li>
<li>Revenue range is bracketed (not exact), reducing sensitivity.</li>
<li>Admin view requires Supabase Auth login. No public access to any client&#39;s responses.</li>
<li>Data retention: responses kept until AOM deletes them. No automatic expiry.</li>
<li>SOC 2 alignment: access logs on admin view, no shared credentials, audit trail on status changes.</li>
</ul>
<hr>
<h2>8. Implementation Priority</h2>
<p><strong>Phase 1 (MVP):</strong> Slides 1-27, auto-save, unique URLs, basic admin list view. No reminder emails, no export. Get the intake tool live and usable.</p>
<p><strong>Phase 2:</strong> Admin detail view with formatted report. Export to JSON. Completion notification.</p>
<p><strong>Phase 3:</strong> Reminder emails for stalled sessions. AI Readiness Score auto-calculation. Dashboard integration (sessions feed into the multi-tenant platform).</p>
<hr>
<h2>9. Open Questions for Patrik</h2>
<ol>
<li>Should clients be able to start the audit without a pre-generated slug (self-serve from a public link), or AOM-only creation?</li>
<li>Preferred slug format? Current proposal: <code>company-shortname-random6</code>.</li>
<li>Any questions missing that you always ask in discovery calls?</li>
<li>Should the admin view live at <code>/audit/admin</code> or on the dashboard at <code>/dashboard</code>?</li>
</ol>
`,u={title:e,slug:t,category:n,agent:i,date:o,dateFormatted:a,updated:null,summary:s,tags:r,content:l};export{i as agent,n as category,l as content,o as date,a as dateFormatted,u as default,t as slug,s as summary,r as tags,e as title,d as updated};
