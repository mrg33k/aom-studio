const e="Mom Agent Diagnosis",n="mom-diagnosis",s="Audits",t="Elon",o="2026-03-09",i="Mar 9",d=null,a="Diagnosis of Mom agent operational issues and recommended fixes.",l=[],r=`<h1>Mom Diagnosis</h1>
<p><em>Investigated: 2026-03-09</em></p>
<hr>
<h2>What Mom Is Supposed To Do</h2>
<p>Mom is the chief of staff. Her job is:</p>
<ol>
<li><strong>Scan all agents</strong> every 30 minutes (or on manual trigger). Read every AGENT.md, detect what&#39;s stuck, idle, or blocked.</li>
<li><strong>Route work</strong> to the right agent. TYPE A (agent can self-unblock) gets handled directly. TYPE B (needs Patrik) gets surfaced.</li>
<li><strong>Close loops</strong> on completed work. When an agent finishes, Mom reads the output and routes the next step.</li>
<li><strong>Build a push list</strong> at <code>projects/mom/push-list.md</code> with what Patrik needs to act on.</li>
<li><strong>Surface deadlines</strong> approaching within 7 days.</li>
<li><strong>Trigger downstream agents</strong> when work is ready for them.</li>
<li><strong>Check inboxes</strong> (Gmail + iCloud) for anything that changes priorities.</li>
</ol>
<h2>Has Mom Ever Actually Run?</h2>
<p><strong>Once.</strong> On 2026-03-09, Mom ran for the first time. Evidence:</p>
<ul>
<li>Git commit <code>eb3a933</code>: &quot;Mom scan -- 2026-03-08 -- 6 Patrik, 8 idle, 2 deadlines tomorrow&quot;</li>
<li><code>projects/mom/scan-report.md</code> exists with a detailed scan</li>
<li><code>projects/mom/push-list.md</code> exists with a solid push list</li>
<li>AGENT.md session log shows one entry: &quot;2026-03-09 | AGENT.md created | Mom built. First scan: pending.&quot;</li>
</ul>
<p>That single run produced good output. The scan-report and push-list are well-structured and actionable. The problem is not quality. The problem is Mom never runs again.</p>
<h2>What&#39;s Actually Broken</h2>
<h3>1. No automation exists (CRITICAL)</h3>
<p>The SKILL.md says &quot;Cron job runs every 30 minutes.&quot; This is a lie. There is:</p>
<ul>
<li><strong>No crontab entry</strong> (<code>crontab -l</code> returns &quot;no crontab for patrik&quot;)</li>
<li><strong>No scheduled task</strong> in Claude Code (the <code>.claude/scheduled_tasks.lock</code> file is just a session lock, not a scheduler)</li>
<li><strong>No Telegram integration</strong> for triggering Mom (Telegram bot exists but doesn&#39;t call Mom)</li>
<li><strong>No webhook</strong> or any other automated trigger</li>
</ul>
<p>Mom only runs when someone manually says &quot;run Mom&quot; in a Claude Code session. Nobody does that. The &quot;every 30 minutes&quot; claim in the skill file has no backing infrastructure.</p>
<h3>2. Mom has no persistence between sessions (CRITICAL)</h3>
<p>Mom is a skill, not a running process. When the Claude Code session ends, Mom is gone. There is no:</p>
<ul>
<li>Background daemon watching agent states</li>
<li>Polling loop that survives session close</li>
<li>External trigger that starts a new session and runs Mom</li>
</ul>
<p>Mom&#39;s &quot;Infinity Ring&quot; (the master loop described in AGENT.md) is an aspirational design, not a running system. It describes steps 1-13 in a loop, but nothing actually loops. It runs once per manual invocation and stops.</p>
<h3>3. Mom cannot check email (MODERATE)</h3>
<p>The skill file does not include email scanning as a step. The session-start and internal-update skills both check email, but Mom&#39;s scan process (Steps 1-8 in SKILL.md) is purely file-based:</p>
<ul>
<li>Reads punch-list.md, HANDOFF.md, current-priorities.md, decisions/log.md, AGENT.md files</li>
<li>Does NOT read Gmail or iCloud inboxes</li>
<li>Does NOT check calendar for conflicts or approaching events</li>
</ul>
<p>Mom should be catching things like &quot;Elario viewed the invoice but hasn&#39;t paid&quot; or &quot;a client replied to an outreach email.&quot; She can&#39;t.</p>
<h3>4. Mom cannot launch agents (MODERATE)</h3>
<p>The AGENT.md describes Mom routing work and &quot;triggering downstream agents.&quot; But Mom is a skill running inside the main Claude Code session. She can:</p>
<ul>
<li>Write to files (push-list.md, punch-list.md)</li>
<li>Git commit and push</li>
</ul>
<p>She cannot:</p>
<ul>
<li>Launch subagent sessions (that&#39;s Rally&#39;s job, and Rally is a separate skill)</li>
<li>Send messages to agents (no inter-agent communication channel)</li>
<li>Kick off background tasks</li>
</ul>
<p>Mom can write &quot;Bobby should run pre-flight checks&quot; in the scan report, but she can&#39;t actually make Bobby run. The handoff from &quot;Mom identifies work&quot; to &quot;agent does work&quot; is completely manual.</p>
<h3>5. Mom and Rally overlap (MINOR)</h3>
<p>Rally (<code>.claude/skills/rally/SKILL.md</code>) does a lot of what Mom describes:</p>
<ul>
<li>Reads context files and punch list</li>
<li>Scans all AGENT.md files</li>
<li>Assigns missions to agents</li>
<li>Launches agents as subagents</li>
</ul>
<p>The difference: Rally actually launches agents. Mom just writes reports. But their scanning logic is nearly identical. This creates confusion about which one to use and when.</p>
<h3>6. Mom and session-start overlap (MINOR)</h3>
<p>Session-start also scans agents, checks email, reads context files, and produces a status brief. Then it runs Rally. This means session-start already does a lightweight version of Mom&#39;s job every time Patrik starts a session.</p>
<h3>7. No feedback loop to Patrik (MODERATE)</h3>
<p>Mom writes to <code>projects/mom/push-list.md</code> and is supposed to append to <code>context/actions-log.md</code>. But:</p>
<ul>
<li>The actions-log is for external writes (calendar, email), not internal scan results</li>
<li>The push-list sits in a project subfolder Patrik never checks manually</li>
<li>There is no notification, no Telegram message, no dashboard widget showing Mom&#39;s output</li>
<li>The &quot;CC task&quot; Mom is supposed to add to punch-list.md (Step 7 in SKILL.md) worked once but has no mechanism to repeat</li>
</ul>
<p>If Mom ran and found 5 things stuck, Patrik would never know unless he went looking for it.</p>
<h2>Root Cause Summary</h2>
<p>Mom is a well-designed skill with no execution engine. She&#39;s a blueprint for a chief of staff with:</p>
<ul>
<li>No schedule (nothing triggers her)</li>
<li>No persistence (dies when the session ends)</li>
<li>No communication channel (can&#39;t reach Patrik or other agents)</li>
<li>No tool access for email/calendar (can only read files)</li>
</ul>
<p>The single successful run proves the logic works. The problem is entirely about triggering and persistence.</p>
<h2>Specific Fixes Needed (Priority Order)</h2>
<h3>Fix 1: Give Mom a real trigger (P0)</h3>
<p><strong>Option A (Quick, works now):</strong> Add Mom scan to the session-start skill. After Rally launches agents, run Mom&#39;s scan. This means Mom runs at least once per session automatically. Not every 30 minutes, but at least every session.</p>
<p><strong>File to edit:</strong> <code>.claude/skills/session-start/SKILL.md</code>
<strong>Change:</strong> Add a step after step 11 (Rally): &quot;Step 12: Run Mom scan. Execute the mom-scan skill to identify stuck items, route work, and build the push list.&quot;</p>
<p><strong>Option B (Better, needs infrastructure):</strong> Use Claude Code&#39;s scheduled tasks or the Telegram bot to trigger &quot;run Mom&quot; every 30 minutes during business hours (9am-5pm AZ). This requires:</p>
<ul>
<li>A cron job or launchd plist that runs <code>claude -p AOM-EA &quot;run Mom&quot;</code> every 30 minutes</li>
<li>OR the Telegram bot gaining the ability to trigger Claude Code skills on a timer</li>
</ul>
<p><strong>Option C (Best, needs development):</strong> Build a lightweight script (<code>scripts/mom-cron.sh</code>) that:</p>
<ol>
<li>Runs via launchd every 30 minutes during 9am-5pm AZ</li>
<li>Calls <code>claude --print -p AOM-EA &quot;run Mom&quot;</code> (or equivalent CLI invocation)</li>
<li>Captures output and sends it to Telegram</li>
</ol>
<h3>Fix 2: Add email scanning to Mom&#39;s process (P1)</h3>
<p><strong>File to edit:</strong> <code>.claude/skills/mom-scan/SKILL.md</code>
<strong>Change:</strong> Add a step between Step 2 and Step 3:</p>
<p>&quot;Step 2.5: Check inboxes. Scan <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a> (Gmail API, tokens at <code>/Users/patrik/.config/aom-gmail-tokens.json</code>) and <a href="mailto:patrikmatheson@icloud.com">patrikmatheson@icloud.com</a> (Mail.app AppleScript) for: client replies, payment confirmations, urgent requests. Any findings that affect priorities get incorporated into the scan.&quot;</p>
<h3>Fix 3: Connect Mom to Rally (P1)</h3>
<p><strong>File to edit:</strong> <code>.claude/skills/mom-scan/SKILL.md</code>
<strong>Change:</strong> After Mom builds the push list (Step 6), add: &quot;Step 6.5: If any idle agent has clear work waiting (TYPE A), launch Rally with those specific assignments. Mom identifies the work, Rally launches the agents.&quot;</p>
<p>This closes the gap between &quot;Mom sees what needs to happen&quot; and &quot;it actually happens.&quot;</p>
<h3>Fix 4: Add a notification channel (P2)</h3>
<p>Mom&#39;s output needs to reach Patrik without him checking a file. Options:</p>
<ul>
<li><strong>Telegram bot:</strong> Mom sends the push list summary to Patrik via the existing Telegram bot</li>
<li><strong>Dashboard widget:</strong> Push list renders on the AOM dashboard</li>
<li><strong>Calendar event:</strong> Mom creates a daily &quot;Push List&quot; calendar event with the summary in the description</li>
</ul>
<p>The Telegram bot is the fastest path since it already exists and runs locally.</p>
<h3>Fix 5: Deduplicate Mom, Rally, and session-start (P3)</h3>
<p>These three skills share scanning logic. Clarify the roles:</p>
<ul>
<li><strong>Session-start:</strong> Loads context + delivers brief to Patrik. Does NOT scan agents deeply.</li>
<li><strong>Mom:</strong> Deep scan. Finds stuck items, classifies blockers, builds push list. Runs on schedule.</li>
<li><strong>Rally:</strong> Launches agents with missions. Takes input from Mom&#39;s push list or direct commands.</li>
</ul>
<p>The flow should be: Mom scans -&gt; Mom identifies work -&gt; Mom calls Rally for TYPE A items -&gt; Rally launches agents -&gt; Mom monitors results.</p>
<p><strong>Files to edit:</strong></p>
<ul>
<li><code>.claude/skills/session-start/SKILL.md</code>: Remove agent scanning (steps 6-8 of session-start overlap with Mom). Replace with &quot;Run Mom scan.&quot;</li>
<li><code>.claude/skills/mom-scan/SKILL.md</code>: Add Rally invocation for TYPE A items.</li>
<li><code>.claude/skills/rally/SKILL.md</code>: Accept a mission list from Mom instead of always scanning from scratch.</li>
</ul>
<hr>
<h2>Summary</h2>
<p>Mom&#39;s design is solid. Her single run produced exactly the right output. The problem is she has no heartbeat. She&#39;s a skill that sits on a shelf waiting to be manually invoked, in a system where nobody remembers to invoke her.</p>
<p>The minimum viable fix is adding Mom to session-start (Fix 1A) so she runs at least once per session. The real fix is giving her a cron trigger (Fix 1C) and a notification channel (Fix 4) so she actually operates as the always-on chief of staff she was designed to be.</p>
`,c={title:e,slug:n,category:s,agent:t,date:o,dateFormatted:i,updated:null,summary:a,tags:l,content:r};export{t as agent,s as category,r as content,o as date,i as dateFormatted,c as default,n as slug,a as summary,l as tags,e as title,d as updated};
