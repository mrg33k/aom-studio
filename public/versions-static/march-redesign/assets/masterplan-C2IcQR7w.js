const e="Masterplan System Audit",t="masterplan",n="Audits",o="Elon",i="2026-03-10",s="Mar 10",d=null,l="Comprehensive audit of AOM agent system architecture.",a=[],r=`<h1>Masterplan Audit -- 2026-03-10</h1>
<p>Full system audit of AOM-EA. Everything read, everything assessed. No sugar-coating.</p>
<hr>
<h2>1. AGENT HEALTH</h2>
<h3>Bobby (Web Dev) -- STRONG</h3>
<ul>
<li><strong>AGENT.md:</strong> Well-written, current, thorough. Pipeline position clear. Design standard baked in. Session log current (last entry Mar 9).</li>
<li><strong>Scope:</strong> Clean. Owns all web builds. No overlap.</li>
<li><strong>Issues:</strong> AGENT.md is 186 lines, which is reasonable but will grow. Session log needs periodic archiving.</li>
<li><strong>Redundancy:</strong> The Infinity Ring section is copy-pasted verbatim into <code>projects/ambition-mechanical/AGENT.md</code>. That&#39;s 40+ lines of duplication. Bobby&#39;s AGENT.md is the source of truth, Ambition&#39;s should just reference it.</li>
<li><strong>Next task:</strong> AOM polish items + Ambition mobile CTA fix + placeholder images.</li>
</ul>
<h3>Mom (Chief of Staff) -- STRONG</h3>
<ul>
<li><strong>AGENT.md:</strong> The best-written agent file in the system. Clear authority model, decision tree, voice and tone. This is what all AGENT.md files should aspire to.</li>
<li><strong>Scope:</strong> Clean. Orchestrator. No overlap with any agent&#39;s actual job.</li>
<li><strong>Issues:</strong> Not actually running on a schedule. AGENT.md says &quot;Scheduled: Daily at 8am AZ time (via cron when live)&quot; but no launchd plist exists for Mom. She only runs manually. This is a major gap. Mom is supposed to be the engine, but the engine has no ignition.</li>
<li><strong>Next task:</strong> Should be running autonomously. Needs launchd setup.</li>
</ul>
<h3>Jacob (Outreach) -- GOOD, STRUCTURAL ISSUE</h3>
<ul>
<li><strong>AGENT.md:</strong> Well-defined. Clear rules, voice template reference, send permission documented.</li>
<li><strong>Scope:</strong> Clean. Outreach only.</li>
<li><strong>Issues:</strong><ul>
<li>Lives in <code>outreach/AGENT.md</code> instead of <code>projects/jacob/AGENT.md</code> or <code>projects/outreach/AGENT.md</code>. This is already flagged on the punch list but hasn&#39;t been fixed. Every other agent is in <code>projects/</code>. Jacob is the orphan. This breaks any automated agent scan that looks in <code>projects/*/AGENT.md</code>.</li>
<li>The outreach folder has 23 files and is getting messy. Old drafts, backups, batch files. Needs archiving.</li>
<li>The outreach SKILL.md had the Apollo API key hardcoded. This was the same credential exposure issue flagged as CRITICAL. <strong>FIXED 2026-03-10.</strong></li>
</ul>
</li>
<li><strong>Next task:</strong> Send remaining Gmail drafts Mar 11, then rest-of-week outreach.</li>
</ul>
<h3>Steffen (Brand) -- GOOD, IDLE</h3>
<ul>
<li><strong>AGENT.md:</strong> Clear scope. Good pipeline position documentation.</li>
<li><strong>Scope:</strong> Clean. Upstream of Bobby. No overlap.</li>
<li><strong>Issues:</strong> Last session entry Mar 9. Has been idle since Dark Frame + loader spec shipped. Practice mode mission is complete. Needs a new mission or gets stale.</li>
<li><strong>Next task:</strong> No clear next task assigned. Should be auditing whether Bobby&#39;s latest deploys match brand guidelines.</li>
</ul>
<h3>Alex (Deal Architect) -- STALE</h3>
<ul>
<li><strong>AGENT.md:</strong> Well-structured but hasn&#39;t run since Mar 7. Last session: &quot;Full analysis run.&quot; That&#39;s 3 days ago. The &quot;3 Piece Special&quot; was killed by Patrik, but Alex&#39;s AGENT.md doesn&#39;t reflect that.</li>
<li><strong>Scope:</strong> Clean in theory but overlaps with Jacob on &quot;what to sell.&quot; The boundary is: Alex designs the offer, Jacob sells it. That&#39;s clear enough.</li>
<li><strong>Issues:</strong><ul>
<li>Duplicate project folder: <code>projects/alex/</code> AND <code>projects/aom-strategy/</code>. The AGENT.md is in <code>projects/aom-strategy/</code> (correct), but <code>projects/alex/</code> exists with one file (<code>website-copy-review.md</code>). This is confusing. One should be deleted.</li>
<li>AGENT.md still references &quot;Notion data&quot; and &quot;Notion dashboards&quot; even though the decisions log says Notion was removed from the stack.</li>
</ul>
</li>
<li><strong>Next task:</strong> Available. Should be refreshing the biz-dev brief with the new outreach voice, construction vertical pricing.</li>
</ul>
<h3>Cleo (Content) -- BLOCKED, NEEDS RETHINK</h3>
<ul>
<li><strong>AGENT.md:</strong> Thorough (234 lines). Good workflow documentation, ffmpeg/Remotion references, output specs.</li>
<li><strong>Scope:</strong> Owns content creation. Clear.</li>
<li><strong>Issues:</strong><ul>
<li>Primrose v3 was rejected. Patrik defined a new role for Cleo: strategist, not editor. Human edits in Resolve. But the AGENT.md still describes Cleo as an editor with ffmpeg. The entire &quot;Edit Workflow&quot; section is now wrong. This is a major AGENT.md update needed.</li>
<li>The content-agent folder is 165MB. That&#39;s mostly audio files and video renders. These should not be in a context/knowledge repo. Consider moving media assets to Dropbox or a separate location.</li>
<li>Knowledge base files (platform-best-practices.md, hook-library.md, edit-patterns.md) were researched Mar 8. Not stale yet but will need quarterly refresh.</li>
</ul>
</li>
<li><strong>Next task:</strong> Write edit plan/strategy for Ambition content. Patrik cuts in Resolve.</li>
</ul>
<h3>Tony (Social Media) -- UNBLOCKED BUT HASN&#39;T DONE ANYTHING</h3>
<ul>
<li><strong>AGENT.md:</strong> Clean. Good pipeline and client roster documentation.</li>
<li><strong>Scope:</strong> Social posting. Clear.</li>
<li><strong>Issues:</strong> Postiz is running (deployed Mar 10) but zero accounts are connected. Facebook Dev App is still needed for Instagram OAuth. Tony has literally 2 session log entries. He&#39;s been &quot;unblocked&quot; but has shipped nothing. This agent is a plan, not a result.</li>
<li><strong>Next task:</strong> Start LinkedIn posting manually (doesn&#39;t need Postiz). That&#39;s the move. Stop waiting for the perfect setup.</li>
</ul>
<h3>Paige (Client Success) -- GOOD, UNDERUSED</h3>
<ul>
<li><strong>AGENT.md:</strong> Clean. Client roster current.</li>
<li><strong>Scope:</strong> Client health tracking. Clear. No overlap.</li>
<li><strong>Issues:</strong> Has run twice (Mar 9 and Mar 10). Both were useful. But she&#39;s &quot;idle&quot; again. Should be on a weekly auto-run like Mom. The client health scan is valuable but it only happens when someone remembers to trigger it.</li>
<li><strong>Next task:</strong> Should auto-run weekly. Fresh scan needed.</li>
</ul>
<h3>Colton (Bobby&#39;s Backup) -- GOOD, RARELY NEEDED</h3>
<ul>
<li><strong>AGENT.md:</strong> Short, clean, well-scoped.</li>
<li><strong>Scope:</strong> Bobby overflow. Clear.</li>
<li><strong>Issues:</strong> Has only run once for real work (responsive audit + dashboard polish + waitlist backend, all Mar 9). He&#39;s a relief pitcher who almost never gets called. That&#39;s fine, but the AGENT.md could be leaner since he shares Bobby&#39;s standing rules almost verbatim.</li>
<li><strong>Next task:</strong> Available. The CTA intake flow spec is ready for building.</li>
</ul>
<h3>Elon (System) -- STRONG</h3>
<ul>
<li><strong>AGENT.md:</strong> Well-written. Clear scope. Good audit checklist.</li>
<li><strong>Issues:</strong> Session log shows heavy activity Mar 9-10 (infrastructure sprint). DMARC fix, email freshness system, relay fixes. Good output. But the to-do list of infrastructure items is long and keeps growing. Needs prioritization.</li>
<li><strong>Next task:</strong> This audit. Then credential rotation.</li>
</ul>
<h3>Council -- NO AGENT.MD, SKILL ONLY</h3>
<ul>
<li><strong>Folder:</strong> <code>projects/council/</code> exists with 3 output files but no AGENT.md. It&#39;s a skill (<code>council/SKILL.md</code>), not an agent. The folder is just output storage. That&#39;s fine, but it&#39;s inconsistent with the &quot;every project has AGENT.md&quot; pattern.</li>
</ul>
<h3>Project-Only Agents (ISA, Skylar, Brandon Wiley)</h3>
<ul>
<li><strong>ISA Energy:</strong> Bare AGENT.md. Placeholder. No contacts filled. Apr 27 deadline, 48 days out, zero edit sessions. This will become a crisis in 2-3 weeks if nobody starts planning.</li>
<li><strong>Skylar:</strong> Bare AGENT.md. No contacts filled. Footage done, zero edits. Lower urgency but still sitting.</li>
<li><strong>Brandon Wiley:</strong> Bare AGENT.md. Ongoing, section-by-section. Low urgency.</li>
</ul>
<hr>
<h2>2. CONTEXT FILES</h2>
<h3>current-priorities.md -- SLIGHTLY STALE</h3>
<ul>
<li>Last updated Mar 10 ~1:30 AM. References &quot;TODAY (Mar 10)&quot; which is now passing.</li>
<li>Agent status table is useful and mostly current.</li>
<li>DMARC shows &quot;Still showing old record (p=none)&quot; but the punch list says DMARC propagated and was confirmed by Patrik. <strong>Contradiction.</strong> One of these is wrong.</li>
<li>References &quot;Primrose v3 REJECTED&quot; correctly.</li>
<li>Overall: needs a refresh but not badly broken.</li>
</ul>
<h3>goals.md -- SLIGHTLY STALE</h3>
<ul>
<li>Still references &quot;targeting launch Mon Mar 9 or Tue Mar 10&quot; for Ambition. That date has passed. Site is live but waiting on client stat confirmation for official launch.</li>
<li>&quot;Re-engage James&quot; is listed as a milestone but James was KILLED (&quot;No James fuck that&quot;). Remove it.</li>
<li>Missing: Included Health milestone ($9k project, happening right now).</li>
</ul>
<h3>work.md -- GOOD, MINOR ISSUES</h3>
<ul>
<li>Active clients list is current.</li>
<li>Still says Ambition at &quot;$2k/month retainer + $4k website&quot; with &quot;targeting launch Mon Mar 9 or Tue Mar 10.&quot; Date is stale.</li>
<li>Says &quot;Notion data -- already indexed&quot; in Alex&#39;s data sources. Notion was removed from the system. Not a live issue but a stale reference.</li>
<li>Missing: Included Health contract details that are now known ($9k, 3-day production, Contact: Elario Young, Kelly Henderson on-site). This info exists in the punch list but not in work.md.</li>
<li>LBX marked &quot;ON HOLD&quot; in punch list but described as &quot;All episodes in production&quot; in work.md.</li>
</ul>
<h3>team.md -- STALE</h3>
<ul>
<li>Still lists James as &quot;Longtime editor. Currently unavailable / out of contact. Worth re-engaging when bandwidth opens up.&quot; Patrik explicitly killed this (&quot;No James fuck that&quot;). Either remove James or mark him as gone.</li>
<li>Missing: No mention of Mo (Ambition Mechanical contact) despite having his LinkedIn credentials on file.</li>
</ul>
<h3>me.md -- CURRENT</h3>
<ul>
<li>Stable context file. Doesn&#39;t need frequent updates. Good.</li>
</ul>
<h3>CLAUDE.md -- BLOATED BUT FUNCTIONAL</h3>
<ul>
<li>271 lines before context file references. This is the master instruction set. It works but it&#39;s doing a lot:<ul>
<li>System architecture</li>
<li>Relay system docs</li>
<li>Agent pipeline description</li>
<li>Project list</li>
<li>Production pipeline</li>
<li>Elmo gate</li>
<li>Auto-sync rules</li>
<li>Wash hands protocol</li>
<li>Mom after every commit</li>
</ul>
</li>
<li>Some of this could be broken out into reference files that agents read on demand rather than loading into every session. The relay system documentation (30+ lines) doesn&#39;t need to be in CLAUDE.md if you&#39;re not in telegram mode. Same with the Phone Home documentation.</li>
<li>The &quot;Projects&quot; section lists agents with brief descriptions. This duplicates information that lives in each AGENT.md. If an agent changes scope, CLAUDE.md gets stale.</li>
</ul>
<h3>HANDOFF.md -- CURRENT</h3>
<ul>
<li>Well-written. Good &quot;last time you were here&quot; section. Detailed agent status. Prioritized next steps.</li>
<li>No issues.</li>
</ul>
<h3>punch-list.md -- CURRENT BUT MESSY</h3>
<ul>
<li>169 lines. Mix of done and undone items. The &quot;TODAY (Mar 9)&quot; section header is wrong (it&#39;s Mar 10+).</li>
<li>Completed items should be archived to <code>archives/completed-tasks.md</code> more aggressively. 24 checked-off items are still inline, making the active list harder to scan.</li>
<li>The &quot;DECISIONS (current session)&quot; section at the bottom is duplicating the decisions log. Pick one place for decisions.</li>
<li>LinkedIn credentials for Ambition are in plain text in <code>projects/ambition-mechanical/AGENT.md</code> (referenced from punch list context). Security issue.</li>
<li>Multiple sections could be consolidated. &quot;AMBITION SITE -- IN PROGRESS&quot; and &quot;AOM SITE -- BLOCKERS + POLISH&quot; and &quot;AOM SITE -- PHASE 2&quot; could just be subsections under a &quot;WEBSITES&quot; heading.</li>
</ul>
<h3>decisions/log.md -- GROWING, NO ARCHIVING</h3>
<ul>
<li>130 lines, 50 entries (all from Mar 6-10). Says &quot;Entries older than 30 days archived to archives/decisions/&quot; but there&#39;s only one archive batch. At this pace (12+ decisions/day during active sessions), this file will be 300+ lines in a month. The 30-day archive window is too long. Archive weekly or bi-weekly.</li>
</ul>
<hr>
<h2>3. SKILLS AUDIT</h2>
<h3>29 Skills Total. Here&#39;s the honest assessment:</h3>
<p><strong>Core Skills (well-written, actively used):</strong></p>
<ol>
<li><code>internal-update</code> -- The backbone. 16 steps. Thorough. Maybe too thorough for a &quot;quick wash hands.&quot; The Mom check at step 15 means every internal update also runs a mini Mom scan, which is heavy.</li>
<li><code>session-start</code> -- Well-structured. Rally at step 11 is good. Email check before brief is smart.</li>
<li><code>mom-scan</code> -- Mirrors Mom&#39;s AGENT.md closely. Could be the same document. See overlap note below.</li>
<li><code>double-check</code> (Elmo) -- Comprehensive QA skill. 8 inspection layers. Playwright setup included. Good.</li>
<li><code>calendar</code> -- Full featured. Color system, time tracking, sync from priorities. Good.</li>
<li><code>outreach</code> -- Detailed but has hardcoded Apollo API key (security issue). Autonomy levels well-designed.</li>
<li><code>blockers</code> -- Clean. Step-by-step blocker clearing. Good.</li>
<li><code>rally</code> -- Clean. Launches all agents with missions. Good.</li>
<li><code>supersaiyan</code> -- Self-improvement loop. Creative and useful. Good.</li>
<li><code>brand-agent</code> (Steffen) -- Well-structured. Good trigger list.</li>
</ol>
<p><strong>Supporting Skills (useful but less critical):</strong>
11. <code>social-post</code> -- LinkedIn posting workflow. Haven&#39;t seen it triggered recently.
12. <code>social-agent</code> -- Multi-platform. Overlaps with <code>social-post</code>. These should be merged or the boundary clarified.
13. <code>email-drafter</code> -- Used by Mom. Good.
14. <code>wash-your-face</code> -- Read-only context refresh. Good for mid-session resets.
15. <code>plan-my-day</code> -- Haven&#39;t audited deeply but useful concept.
16. <code>big-3</code> -- Haven&#39;t audited deeply.
17. <code>calendar-hygiene</code> -- Calendar cleanup. Good maintenance skill.
18. <code>skill-gap-scan</code> -- Meta-skill. Finds missing skills. Good.
19. <code>phone-home</code> -- Mac bridge for away agents. Well-designed architecture.
20. <code>mobile-rundown</code> -- Status brief for phone sessions. Good.
21. <code>punch-list</code> -- Punch list management. Probably overlaps with auto-sync rules in CLAUDE.md.
22. <code>council</code> -- Multi-agent deliberation. Used 3 times (output in projects/council/). Good for big decisions.
23. <code>elevenlabs-voice</code> -- Voice generation. Used by Cleo. Good.
24. <code>audio-library</code> -- Audio management for Cleo. Good.
25. <code>outreach-numbers</code> -- Outreach metrics. Good.</p>
<p><strong>Questionable Skills:</strong>
26. <code>web-dev-agent</code> -- Bobby IS the web dev agent. Is this skill separate from Bobby&#39;s AGENT.md? Potential redundancy.
27. <code>coding-qa</code> -- Overlaps with Elmo (double-check) for code. Unclear when to use this vs Elmo.
28. <code>merge-branches</code> -- Git merge skill. How often is this needed? Very narrow use case.
29. <code>social-media-research</code> -- Overlaps with <code>social-agent</code> and Tony&#39;s research responsibilities.</p>
<h3>Overlaps to Address</h3>
<ul>
<li><code>social-post</code> vs <code>social-agent</code> vs <code>social-media-research</code> -- Three skills for social media. Consolidate into one, or make the boundaries crystal clear.</li>
<li><code>mom-scan</code> SKILL.md vs <code>projects/mom/AGENT.md</code> -- Nearly identical content. Mom&#39;s AGENT.md describes her process in 370 lines. mom-scan SKILL.md describes the same process in 178 lines. One should reference the other, not duplicate.</li>
<li><code>coding-qa</code> vs <code>double-check</code> -- Both QA code. Elmo is the QA standard. If coding-qa exists separately, define when each triggers.</li>
<li><code>web-dev-agent</code> vs Bobby AGENT.md -- Bobby IS the web dev agent. The skill should just launch Bobby.</li>
<li><code>punch-list</code> vs auto-sync rules -- CLAUDE.md has extensive auto-sync rules for the punch list. The punch-list skill may be redundant if auto-sync works.</li>
</ul>
<h3>Missing Skills (should exist)</h3>
<ul>
<li><strong>Client onboarding</strong> -- Already identified on punch list. New client = project folder + AGENT.md + calendar events + Paige entry + Steffen brand brief request. This is a clear repeatable workflow.</li>
<li><strong>Invoice/payment tracking</strong> -- Already identified on punch list. No centralized payment status view.</li>
<li><strong>Masterplan/system-audit</strong> -- This audit itself should be a repeatable skill. (Being built now.)</li>
<li><strong>Weekly digest</strong> -- Already identified. Automated &quot;here&#39;s the week&quot; summary.</li>
<li><strong>ISA production planning</strong> -- 48 days to deadline, zero plan. This isn&#39;t a skill but it highlights that production project planning is a gap.</li>
</ul>
<hr>
<h2>4. INFRASTRUCTURE</h2>
<h3>Relay System -- WORKING, COMPLEX</h3>
<ul>
<li>3-layer architecture (hook + session start + watchdog). Smart design.</li>
<li>relay-hook.sh runs on every prompt (5s timeout). That&#39;s fine.</li>
<li>relay-watchdog.py managed by launchd. Good.</li>
<li>Relay rotation happens during wash-hands. Should also happen via watchdog (already on punch list).</li>
<li>No failures observed in the session log. System appears reliable.</li>
<li><strong>Risk:</strong> If the relay-hook.sh script breaks or times out, messages go silent. The watchdog is the safety net, but a broken hook wouldn&#39;t be noticed until the watchdog fires (90s). Consider adding a health check.</li>
</ul>
<h3>File Organization -- MESSY IN SPOTS</h3>
<ul>
<li><strong>outreach/ lives outside projects/</strong>. Should be <code>projects/jacob/</code> or <code>projects/outreach/</code>. Already flagged.</li>
<li><strong>projects/alex/ is a duplicate</strong> of <code>projects/aom-strategy/</code>. One file in it (<code>website-copy-review.md</code>). Delete or merge.</li>
<li><strong>projects/council/ has no AGENT.md</strong>. It&#39;s a skill output folder, not an agent. Either add an AGENT.md or rename to make it clear this is output storage, not an agent.</li>
<li><strong>Bobby&#39;s double-check folder is 149MB, 253 files.</strong> These are Playwright screenshots that are never cleaned up. They should be gitignored if not already, and auto-deleted per round.</li>
<li><strong>Content-agent folder is 165MB.</strong> Audio files and video renders in a knowledge repo. These should be in Dropbox or a media-specific storage, not alongside markdown context files.</li>
<li><strong>projects/telegram-bot/ is 41MB.</strong> Likely the relay bot with a venv or node_modules. Check if this is needed or if it&#39;s dead weight.</li>
</ul>
<h3>Archives -- UNDERUSED</h3>
<ul>
<li><code>archives/completed-tasks.md</code> exists and has content. Good.</li>
<li><code>archives/decisions/</code> exists with one batch. Needs more frequent archiving.</li>
<li><code>archives/sessions/</code> and <code>archives/session-logs/</code> exist. Good.</li>
<li><code>archives/DASHBOARDS/</code> has 29 folders. Client data from old dashboards. This is reference material, fine where it is.</li>
<li><code>archives/outreach/</code> has some old outreach files. Good.</li>
<li>Overall: the archive system exists but isn&#39;t being used aggressively enough. Completed items linger in active files.</li>
</ul>
<h3>Scripts -- MIXED</h3>
<table>
<thead>
<tr>
<th>Script</th>
<th>Status</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td><code>relay-hook.sh</code></td>
<td>ACTIVE</td>
<td>Core relay infrastructure.</td>
</tr>
<tr>
<td><code>check-relay.sh</code></td>
<td>ACTIVE</td>
<td>Manual relay check.</td>
</tr>
<tr>
<td><code>relay-respond.py</code></td>
<td>ACTIVE</td>
<td>Sends responses via Telegram.</td>
</tr>
<tr>
<td><code>relay-mark-read.py</code></td>
<td>ACTIVE</td>
<td>Marks relay messages as read.</td>
</tr>
<tr>
<td><code>relay-watchdog.py</code></td>
<td>ACTIVE</td>
<td>Launchd-managed background process.</td>
</tr>
<tr>
<td><code>rotate-relay.sh</code></td>
<td>ACTIVE</td>
<td>Relay file rotation.</td>
</tr>
<tr>
<td><code>check-email-status.py</code></td>
<td>ACTIVE</td>
<td>Email freshness system. New (Mar 10).</td>
</tr>
<tr>
<td><code>telegram-relay.py</code></td>
<td>ACTIVE</td>
<td>Telegram bot (dumb pipe).</td>
</tr>
<tr>
<td><code>run-watchdog.sh</code></td>
<td>ACTIVE</td>
<td>Watchdog launcher.</td>
</tr>
<tr>
<td><code>create-drafts-batch4.py</code></td>
<td>STALE</td>
<td>One-time script for Jacob&#39;s batch 4 drafts. Should be archived.</td>
</tr>
<tr>
<td><code>pinterest-scraper.py</code></td>
<td>STALE</td>
<td>One-time Pinterest scrape. Done. Archive.</td>
</tr>
<tr>
<td><code>ig-login.js</code></td>
<td>UNCLEAR</td>
<td>Instagram login script. Used by Tony? Or dead?</td>
</tr>
<tr>
<td><code>check-relay-deferred.sh</code></td>
<td>ACTIVE</td>
<td>Checks deferred relay messages.</td>
</tr>
</tbody></table>
<h3>Security -- CRITICAL, UNFIXED</h3>
<p>This was flagged in the previous audit and nothing has changed.</p>
<p><strong>Credentials exposed in committed files:</strong></p>
<ol>
<li><strong>GitHub PAT</strong> in <code>.claude/settings.json</code> and <code>.claude/hooks/session-start.sh</code></li>
<li><strong>Apify API token</strong> in <code>.claude/settings.json</code></li>
<li><strong>Apollo API key</strong> in <code>.claude/skills/outreach/SKILL.md</code> and <code>outreach/jacob-session.md</code></li>
<li><strong>LinkedIn credentials</strong> [REDACTED] in <code>projects/ambition-mechanical/AGENT.md</code></li>
<li><strong>All of the above persist in git history</strong> even if removed from current files.</li>
</ol>
<p>This is a real security risk. The GitHub PAT in particular has repo access. If anyone gains access to this repo&#39;s history, they have Patrik&#39;s GitHub token.</p>
<p><strong>Fix order:</strong></p>
<ol>
<li>Rotate the GitHub PAT immediately (GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens)</li>
<li>Rotate the Apify token</li>
<li>Move credentials to <code>.claude/settings.local.json</code> (gitignored) or environment variables</li>
<li>Remove LinkedIn creds from AGENT.md, store in <code>.env</code> or local config</li>
<li>Run BFG to scrub history after all tokens are rotated</li>
</ol>
<hr>
<h2>5. PIPELINE EFFICIENCY</h2>
<h3>Elon &gt; Mom &gt; Alex &gt; Steffen &gt; Bobby &gt; Elmo &gt; Patrik</h3>
<p><strong>What&#39;s working:</strong></p>
<ul>
<li>Pipeline is well-documented in multiple places (CLAUDE.md, Mom AGENT.md, Bobby AGENT.md, Elmo skill). Everyone knows the chain.</li>
<li>Bobby &gt; Elmo &gt; Patrik flow works. Bobby commits, Elmo QAs, results surface. This has been validated multiple times (R1-R5 QA rounds).</li>
<li>Steffen &gt; Bobby flow works. Brand guidelines shipped, Bobby implemented them.</li>
</ul>
<p><strong>What&#39;s broken:</strong></p>
<ol>
<li><p><strong>Mom doesn&#39;t auto-run.</strong> The &quot;Mom After Every Commit&quot; rule in CLAUDE.md says &quot;After any agent commits work, launch Mom as a background agent automatically.&quot; But Mom has no launchd plist, no cron, no automation. She only runs when someone types &quot;run Mom.&quot; This means the pipeline doesn&#39;t auto-advance. The engine has no ignition.</p>
</li>
<li><p><strong>Elon &gt; Mom handoff is theoretical.</strong> Elon has run audits, but Mom hasn&#39;t picked up Elon&#39;s findings automatically. The handoff is manual. Someone has to read Elon&#39;s audit and decide what to do with it.</p>
</li>
<li><p><strong>Alex is disconnected.</strong> Alex ran once (Mar 7) and hasn&#39;t been triggered since. The &quot;3 Piece Special&quot; was killed. Alex has no current mission. The pipeline says Mom should launch Alex when strategy work is needed, but Mom isn&#39;t running automatically, so Alex just sits.</p>
</li>
<li><p><strong>No pipeline tracking dashboard.</strong> Mom&#39;s AGENT.md describes a &quot;Pipeline Status&quot; section that should be in every push list, but there&#39;s no centralized view of which stage each project is in. It lives in Mom&#39;s push list (which is a snapshot, not live state).</p>
</li>
<li><p><strong>The &quot;Mom After Every Commit&quot; rule is aspirational.</strong> It says &quot;This is not optional. Every commit triggers Mom.&quot; But the implementation doesn&#39;t exist. There&#39;s no git hook, no CI trigger, no launchd agent watching for commits. It&#39;s a rule that&#39;s never been enforced.</p>
</li>
</ol>
<h3>Elmo Gate</h3>
<ul>
<li><strong>Being enforced?</strong> Partially. Elmo has run QA on both sites (R1-R5). That&#39;s good. But the rule says &quot;All agent output goes through Elmo before Patrik sees it. No exceptions.&quot; In practice, Patrik sees Bobby&#39;s output directly via Vercel deploys before Elmo runs. Elmo runs after, not before. The gate is more of a &quot;post-deploy QA&quot; than a true gate.</li>
<li><strong>Practical reality:</strong> Making Elmo a true gate (blocking deploy until QA passes) would slow down iteration significantly. The current &quot;deploy then QA&quot; approach is fine for web work. But for content (Cleo) and outreach (Jacob), the gate should be enforced more strictly.</li>
</ul>
<h3>Bottlenecks</h3>
<ol>
<li><p><strong>Editing capacity</strong> -- Patrik and Ash are the only editors. No AI agent can replace DaVinci Resolve editing (Cleo proved this with Primrose v3). This bottleneck blocks: KOHRS (10 videos), Skylar (music video), ISA (brand video), Ambition social content. This is the #1 system bottleneck. No amount of agent optimization fixes it. Patrik needs a human editor or needs to block serious edit time.</p>
</li>
<li><p><strong>Patrik is the approval bottleneck</strong> -- Jacob waits for email approval. Content waits for Patrik to cut in Resolve. Ambition launch waits for Patrik to contact the client. Bobby waits for Patrik to decide on placeholder images. In the current system, Patrik is TYPE B on too many items. Some of these could be delegated (e.g., Bobby could source placeholder images from the Dropbox library without waiting for Patrik).</p>
</li>
<li><p><strong>No scheduled agent runs</strong> -- Every agent runs on manual trigger. The Infinity Rings describe continuous loops, but none of them actually loop. They all wait for &quot;Run [agent].&quot; Mom was supposed to solve this by being the scheduler, but Mom doesn&#39;t auto-run either.</p>
</li>
</ol>
<hr>
<h2>6. OPTIMIZATION RECOMMENDATIONS</h2>
<p>Priority order. Do these in sequence.</p>
<h3>P0: CRITICAL (Do Today)</h3>
<p><strong>1. Rotate exposed credentials.</strong></p>
<ul>
<li>GitHub PAT: go to github.com/settings/tokens, revoke old, generate new, update <code>.claude/settings.local.json</code> (not settings.json)</li>
<li>Apify: regenerate at console.apify.com</li>
<li>Apollo: regenerate</li>
<li>LinkedIn: move to <code>.env</code> or local config, remove from AGENT.md</li>
<li>After rotation: run BFG Repo-Cleaner to scrub old tokens from git history</li>
<li><strong>Why:</strong> Anyone with read access to this repo (or its git history) has Patrik&#39;s GitHub token right now.</li>
</ul>
<h3>P1: HIGH (This Week)</h3>
<p><strong>2. Set up Mom on launchd.</strong></p>
<ul>
<li>Create <code>~/Library/LaunchAgents/com.aom-ea.mom-scan.plist</code></li>
<li>Run daily at 8am AZ time</li>
<li>This single change makes the entire pipeline self-driving. Without it, the pipeline is a manual relay race.</li>
<li>Start simple: <code>claude -p &quot;Run Mom scan&quot;</code> as the command. Refine later.</li>
</ul>
<p><strong>3. Move Jacob to projects/.</strong></p>
<ul>
<li><code>mv outreach/ projects/jacob/</code> (or <code>projects/outreach/</code>)</li>
<li>Update all references in CLAUDE.md, skills, and other AGENT.md files</li>
<li>Archive old drafts and batch files to <code>archives/outreach/</code></li>
</ul>
<p><strong>4. Clean up Elmo screenshots.</strong></p>
<ul>
<li>Delete everything in <code>projects/bobby/double-check/</code> except the latest round</li>
<li>Add a cleanup step to Elmo&#39;s skill: &quot;Delete screenshots older than 2 rounds before starting&quot;</li>
<li>That&#39;s 149MB freed</li>
</ul>
<p><strong>5. Update Cleo&#39;s AGENT.md for new role.</strong></p>
<ul>
<li>Strip the ffmpeg editor workflow</li>
<li>Rewrite as strategist: edit plans, shot selection, quality gate, reference analysis</li>
<li>Keep the knowledge base and platform specs (those are still valuable)</li>
<li>Update the Infinity Ring to match the new workflow</li>
</ul>
<p><strong>6. Fix goals.md.</strong></p>
<ul>
<li>Remove &quot;Re-engage James&quot; milestone</li>
<li>Update Ambition launch date reference</li>
<li>Add Included Health as an active milestone</li>
</ul>
<h3>P2: MEDIUM (Next 2 Weeks)</h3>
<p><strong>7. Consolidate social media skills.</strong></p>
<ul>
<li>Merge <code>social-post</code>, <code>social-agent</code>, and <code>social-media-research</code> into one skill</li>
<li>Or define clear non-overlapping scopes with distinct triggers</li>
</ul>
<p><strong>8. Resolve Mom AGENT.md vs mom-scan SKILL.md duplication.</strong></p>
<ul>
<li>Mom&#39;s AGENT.md is 370 lines. mom-scan SKILL.md is 178 lines. They describe the same process.</li>
<li>Recommendation: AGENT.md is Mom&#39;s identity and authority model. SKILL.md is the execution steps. AGENT.md should reference SKILL.md for the process, not duplicate it.</li>
</ul>
<p><strong>9. Fix work.md contradictions.</strong></p>
<ul>
<li>Update LBX status (ON HOLD, not &quot;in production&quot;)</li>
<li>Update Ambition launch date</li>
<li>Add Included Health contract details</li>
<li>Remove stale Notion references from Alex&#39;s data sources</li>
</ul>
<p><strong>10. Fix team.md.</strong></p>
<ul>
<li>Remove or update James entry per Patrik&#39;s direction</li>
<li>Add Mo (Ambition Mechanical contact) if he&#39;s a regular point of contact</li>
</ul>
<p><strong>11. Delete projects/alex/ duplicate folder.</strong></p>
<ul>
<li>Move <code>website-copy-review.md</code> to <code>projects/aom-strategy/</code> if it&#39;s still relevant</li>
<li>Delete the empty <code>projects/alex/</code> folder</li>
</ul>
<p><strong>12. Archive aggressively.</strong></p>
<ul>
<li>Move completed punch list items to archives/completed-tasks.md weekly</li>
<li>Archive decisions older than 14 days (not 30)</li>
<li>Move one-time scripts (create-drafts-batch4.py, pinterest-scraper.py) to archives/scripts/</li>
</ul>
<p><strong>13. Build client onboarding skill.</strong></p>
<ul>
<li>New client = consistent setup: project folder, AGENT.md, brief request, calendar events, Paige entry, Steffen brand brief</li>
<li>This has been on the punch list since the first audit</li>
</ul>
<h3>P3: LOW (When Bandwidth Allows)</h3>
<p><strong>14. Move large media out of the repo.</strong></p>
<ul>
<li>Content-agent audio/video (165MB) should live in Dropbox</li>
<li>Telegram-bot (41MB) should be checked for dead weight</li>
<li>The repo is 779MB total. A context/knowledge repo should be under 100MB.</li>
</ul>
<p><strong>15. Build pipeline tracking.</strong></p>
<ul>
<li>A simple markdown file that shows: Project | Current Stage | Owner | Days in Stage</li>
<li>Mom updates it on every scan. Dashboard reads it.</li>
</ul>
<p><strong>16. Set up Paige on weekly auto-run.</strong></p>
<ul>
<li>Launchd or cron. Weekly client health scan. Results to projects/paige/client-health.md.</li>
</ul>
<p><strong>17. Add git pre-commit hook for credentials.</strong></p>
<ul>
<li>Scan for API key patterns before allowing commits</li>
<li>Prevents the credential exposure problem from recurring</li>
</ul>
<p><strong>18. Evaluate agent consolidation.</strong></p>
<ul>
<li>Tony and Cleo have adjacent scopes (content creation vs content distribution). Cleo&#39;s new strategist role makes them more complementary. Consider whether Tony needs to be a separate agent or if he&#39;s a mode of Cleo.</li>
<li>Council is a skill, not an agent. Remove from the agent list in CLAUDE.md or accept that it&#39;s a skill.</li>
</ul>
<p><strong>19. Reduce CLAUDE.md bloat.</strong></p>
<ul>
<li>Move relay system docs to <code>references/relay-system.md</code></li>
<li>Move Phone Home docs to <code>references/phone-home.md</code></li>
<li>Keep CLAUDE.md under 200 lines. It loads into every session.</li>
</ul>
<p><strong>20. Fix the &quot;Mom After Every Commit&quot; aspiration.</strong></p>
<ul>
<li>Either implement it (git post-commit hook that runs Mom) or remove the rule from CLAUDE.md. Having a rule that says &quot;not optional&quot; but is never enforced erodes trust in the documentation.</li>
</ul>
<hr>
<h2>7. SYSTEM SCORECARD</h2>
<table>
<thead>
<tr>
<th>Category</th>
<th>Score</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Agent definitions</td>
<td>7/10</td>
<td>Most agents well-defined. Cleo needs update. Alex stale. Jacob misplaced.</td>
</tr>
<tr>
<td>Context files</td>
<td>6/10</td>
<td>Functional but contradictions exist. work.md and team.md have stale info.</td>
</tr>
<tr>
<td>Skills</td>
<td>7/10</td>
<td>Good coverage but overlaps in social media. Some unused.</td>
</tr>
<tr>
<td>Pipeline</td>
<td>5/10</td>
<td>Well-designed on paper. Not automated. Mom doesn&#39;t auto-run.</td>
</tr>
<tr>
<td>Security</td>
<td>2/10</td>
<td>Credentials in committed files. Flagged before, still not fixed.</td>
</tr>
<tr>
<td>Repo health</td>
<td>4/10</td>
<td>779MB for a markdown repo. Screenshots, audio, video piling up.</td>
</tr>
<tr>
<td>Relay system</td>
<td>8/10</td>
<td>Working well. 3-layer resilience. Good design.</td>
</tr>
<tr>
<td>Documentation</td>
<td>8/10</td>
<td>Thorough, sometimes too thorough (duplicated content).</td>
</tr>
<tr>
<td>Automation</td>
<td>3/10</td>
<td>Almost everything is manual trigger. Infinity Rings are aspirational.</td>
</tr>
<tr>
<td>Overall</td>
<td>5.5/10</td>
<td>Strong foundation, weak execution on automation and hygiene.</td>
</tr>
</tbody></table>
<hr>
<h2>8. THE REAL TALK</h2>
<p>The system is impressive in design. 13 agents, 29 skills, relay system, pipeline, dashboard. Most solo operators have nothing close to this.</p>
<p>But it&#39;s running at maybe 40% of its potential because:</p>
<ol>
<li><p><strong>Nothing is automated.</strong> Every agent waits for &quot;Run [agent].&quot; The Infinity Rings are beautiful documentation of how things should loop, but none of them actually loop. Mom was supposed to be the engine, but she doesn&#39;t have a starter motor. Fix Mom&#39;s launchd, and the whole system wakes up.</p>
</li>
<li><p><strong>Security is a ticking clock.</strong> The credential exposure has been known since the last audit and nothing changed. This is the one thing that can cause real damage. A leaked GitHub PAT can modify or delete every repo. Rotate today.</p>
</li>
<li><p><strong>The editing bottleneck is a people problem, not a system problem.</strong> No amount of agent optimization will produce the 10 KOHRS videos, cut the Skylar music video, or edit the ISA brand video. Patrik and Ash are the editors. The system can plan, research, strategize, and QA, but it can&#39;t replace a human in DaVinci Resolve. The system should be optimized to make edit sessions as efficient as possible (Cleo as strategist: pre-select clips, write shot-by-shot edit plans, time estimates), but the bottleneck is hours in the chair.</p>
</li>
<li><p><strong>Context duplication is real.</strong> Mom&#39;s AGENT.md and mom-scan SKILL.md say the same thing. Bobby&#39;s AGENT.md and ambition-mechanical AGENT.md share Infinity Ring content. The pipeline is described in CLAUDE.md, Mom&#39;s AGENT.md, Bobby&#39;s AGENT.md, and Elmo&#39;s SKILL.md. When something changes, 4 files need updating. This will get worse over time. Single source of truth matters.</p>
</li>
<li><p><strong>The punch list is both a dashboard and a journal.</strong> It has completed items, decisions, revenue notes, agent status, and active tasks all in one file. It works because Patrik is the only reader. But for the dashboard and agents, a cleaner structure would help: active tasks in one file, completed items in archives, agent status in current-priorities.md, decisions in the decisions log.</p>
</li>
</ol>
<hr>
<h2>9. WHAT WOULD MAKE PATRIK&#39;S LIFE EASIER (TOP 5)</h2>
<ol>
<li><p><strong>Mom running daily at 8am.</strong> He wakes up to a push list of what needs him and what&#39;s already been handled. Agents already working by the time he sits down.</p>
</li>
<li><p><strong>Cleo as a real strategist.</strong> Instead of &quot;run Cleo to edit this,&quot; Patrik says &quot;I have 2 hours to edit Ambition videos.&quot; Cleo responds with: which clips, in what order, what story, what text overlays, target duration, and mood. Patrik opens Resolve with a plan instead of a blank timeline.</p>
</li>
<li><p><strong>Credential rotation done.</strong> One less thing to worry about.</p>
</li>
<li><p><strong>Automatic punch list cleanup.</strong> Completed items auto-archive weekly. The punch list stays lean, only showing active work.</p>
</li>
<li><p><strong>ISA production plan.</strong> 48 days to deadline. Cleo should write the production plan now: footage inventory, shoot schedule, edit timeline, milestones. Before it becomes a fire.</p>
</li>
</ol>
`,c={title:e,slug:t,category:n,agent:o,date:i,dateFormatted:s,updated:null,summary:l,tags:a,content:r};export{o as agent,n as category,r as content,i as date,s as dateFormatted,c as default,t as slug,l as summary,a as tags,e as title,d as updated};
