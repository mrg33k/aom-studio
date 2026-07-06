const e="Scribe Agent Assessment",t="scribe-agent-assessment",n="Technical",s="Elon",i="2026-03-10",o="Mar 10",d=null,a="Assessment of an always-running scribe agent that logs Patrik's requests to GitHub.",r=[],h=`<h1>Scribe Agent Assessment</h1>
<p><strong>Date:</strong> 2026-03-10
<strong>From:</strong> Elon (System Architect)
<strong>Request:</strong> Patrik wants an always-running agent that writes down everything he asks for, commits to GitHub every 2-3 messages, and lets the main session &quot;subscribe&quot; to the doc.</p>
<hr>
<h2>Verdict: The idea is solving a real problem, but an always-running agent is the wrong solution.</h2>
<hr>
<h2>1. Overlap with existing systems</h2>
<p>Heavy overlap. Here&#39;s what already captures Patrik&#39;s requests:</p>
<table>
<thead>
<tr>
<th>Existing System</th>
<th>What It Captures</th>
</tr>
</thead>
<tbody><tr>
<td>Auto-Sync Rules (CLAUDE.md)</td>
<td>Mid-conversation task changes, status updates, owner changes, timeline shifts. Updates punch-list.md and current-priorities.md immediately.</td>
</tr>
<tr>
<td>Punch list (punch-list.md)</td>
<td>Master task list. Every actionable item.</td>
</tr>
<tr>
<td>Decision log (decisions/log.md)</td>
<td>Meaningful decisions with reasoning.</td>
</tr>
<tr>
<td>HANDOFF.md</td>
<td>Session state: what&#39;s in progress, what&#39;s next, what&#39;s blocked.</td>
</tr>
<tr>
<td>Session summaries (archives/sessions/)</td>
<td>End-of-session recap of everything that happened.</td>
</tr>
<tr>
<td>MEMORY.md</td>
<td>Persistent preferences, rules, and learnings across all sessions.</td>
</tr>
</tbody></table>
<p>A scribe agent would write to a document that overlaps with ALL of these. The information would exist in 2-3 places, and now you have a sync problem: which source of truth wins when they disagree?</p>
<h2>2. What ISN&#39;T captured today</h2>
<p>Two things:</p>
<p><strong>A. The casual stuff.</strong> Patrik says &quot;oh yeah, remind me to grab the hard drive from the office&quot; or &quot;I think we should try X for ISA&quot; or &quot;Ash mentioned the KOHRS contract might change.&quot; These are half-thoughts, side comments, preferences, intel. They&#39;re not tasks (punch list), not decisions (decision log), not priorities (dashboard). They&#39;re context. Today they evaporate after compaction.</p>
<p><strong>B. The request trail.</strong> When Patrik says 6 things in 20 minutes and the session compacts after item 3, items 4-6 can get lost or deprioritized in the compressed context. There&#39;s no audit trail of &quot;here&#39;s everything Patrik asked for in order.&quot;</p>
<p>These are real gaps. But an always-running agent isn&#39;t the fix.</p>
<h2>3. Why an always-running agent is wrong</h2>
<p>Three problems:</p>
<p><strong>Context cost.</strong> An agent running &quot;all the time&quot; means a persistent Claude Code session. It&#39;s either:</p>
<ul>
<li>The SAME session (shares context with the main session, meaning every scribe write eats main context), or</li>
<li>A SEPARATE session (can&#39;t see what Patrik is saying in the main session unless you relay messages to it, which is just rebuilding the Telegram relay for a second agent)</li>
</ul>
<p>If it&#39;s the same session, it&#39;s not a separate agent. It&#39;s just the main session with a new habit.
If it&#39;s a separate session, it can&#39;t hear Patrik. It would need its own input pipe, its own context, its own compaction cycle. That&#39;s a whole second system to maintain.</p>
<p><strong>Race conditions.</strong> Two sessions writing to the same files (punch-list.md, priorities, any shared doc) = merge conflicts, overwrites, stale reads. We already fight this with Bobby and the main session. Adding another concurrent writer makes it worse.</p>
<p><strong>GitHub commit noise.</strong> Committing every 2-3 messages means 10-20 commits per session just from the scribe. That&#39;s noise in the git history, noise in the dashboard (which reads from these files), and potential deploy triggers if anything touches aom-studio.</p>
<h2>4. The real problem</h2>
<p>The real problem is compaction amnesia. When context compresses:</p>
<ul>
<li>Casual mentions disappear</li>
<li>The request queue loses items</li>
<li>The session &quot;forgets&quot; what was said 45 minutes ago</li>
<li>HANDOFF.md only captures what was top of mind at session end, not everything said during the session</li>
</ul>
<p>Auto-Sync catches task-level changes (status, owner, timeline). But it doesn&#39;t catch:</p>
<ul>
<li>&quot;Oh, I also want to...&quot; (new ideas mid-conversation)</li>
<li>&quot;Remember that...&quot; (context that isn&#39;t a task)</li>
<li>&quot;We should probably...&quot; (soft priorities)</li>
<li>Rapid-fire requests where compaction hits before they&#39;re all processed</li>
</ul>
<h2>5. The simplest solution</h2>
<p><strong>A running log file, not a running agent.</strong></p>
<p>Add a lightweight append-only file: <code>context/session-log.md</code></p>
<p>Rules:</p>
<ul>
<li>Every time Patrik gives a directive, asks for something, shares context, or makes a decision, the MAIN SESSION appends a one-liner to this file. Not a separate agent. The session itself does it.</li>
<li>Format: <code>[HH:MM] request/context/decision -- brief description</code></li>
<li>No commits needed during the session. It&#39;s a local scratch pad.</li>
<li>At wash-hands / session-closeout, the log gets committed. Items that became tasks are already on the punch list. Items that didn&#39;t get actioned get flagged.</li>
<li>After compaction, the session reads this file to recover what was said. It&#39;s the memory that survives compression.</li>
<li>Rotate weekly (archive old logs, keep current).</li>
</ul>
<p>This captures everything the scribe would capture, with zero additional infrastructure:</p>
<ul>
<li>No second agent</li>
<li>No second session</li>
<li>No race conditions</li>
<li>No commit noise</li>
<li>No context cost beyond the file itself</li>
</ul>
<p><strong>Implementation: 3 lines added to CLAUDE.md under a &quot;Session Log&quot; rule.</strong></p>
<p>Something like:</p>
<pre><code>## Session Log

Append to \`context/session-log.md\` whenever Patrik:
- Gives a directive or request (even casual ones)
- Shares context, intel, or preferences
- Makes a decision (also log in decisions/log.md if meaningful)
- Mentions something to remember later

Format: \`[HH:MM] brief description\`
One line per item. No formatting. Just the facts.
After compaction, re-read this file to recover session context.
Rotate at wash-hands (archive to archives/session-logs/).
</code></pre>
<p>That&#39;s it. The main session becomes its own scribe. No new agent. No new infrastructure. No new failure modes.</p>
<h2>6. If you want to go one step further</h2>
<p>Add a post-compaction recovery step to the SessionStart hook. When the hook fires after compaction, it already injects relay messages. It could ALSO inject the tail of session-log.md (last 20 lines). That way the compressed session immediately sees what was discussed recently, not just pending Telegram messages.</p>
<p>This is a 10-line addition to relay-hook.sh. No new agent.</p>
<hr>
<h2>Summary</h2>
<table>
<thead>
<tr>
<th>Approach</th>
<th>Complexity</th>
<th>New failure modes</th>
<th>Captures the gap?</th>
</tr>
</thead>
<tbody><tr>
<td>Scribe agent (always-running)</td>
<td>High</td>
<td>Race conditions, context cost, commit noise, second session management</td>
<td>Yes, but overkill</td>
</tr>
<tr>
<td>Session log file (main session writes)</td>
<td>Near zero</td>
<td>None</td>
<td>Yes</td>
</tr>
<tr>
<td>Session log + hook injection</td>
<td>Low</td>
<td>None</td>
<td>Yes, with compaction recovery</td>
</tr>
</tbody></table>
<p>The scribe agent idea comes from the right instinct: things Patrik says are getting lost. But the fix is a habit change in the main session, not a new piece of infrastructure. Teach the existing session to write things down as they happen. That&#39;s it.</p>
`,l={title:e,slug:t,category:n,agent:s,date:i,dateFormatted:o,updated:null,summary:a,tags:r,content:h};export{s as agent,n as category,h as content,i as date,o as dateFormatted,l as default,t as slug,a as summary,r as tags,e as title,d as updated};
