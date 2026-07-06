const t="Email Freshness System Design",e="email-freshness-design",n="Technical",o="Elon",s="2026-03-10",a="Mar 10",c=null,i="System design for tracking email freshness and follow-up timing.",d=[],r=`<h1>Email Freshness System</h1>
<p><em>Designed 2026-03-10 by Elon</em></p>
<h2>The Problem</h2>
<p>Agents act on stale email context. Example: the W-9 for Included Health was sent on Mar 9 and Lara confirmed AP has everything, but the system kept flagging &quot;W-9 NEEDED&quot; because nothing checked for updates in that thread. Tasks and priorities built from old snapshots stay wrong until someone manually notices.</p>
<h2>Solution: Email Status File + Session Hook</h2>
<p>A lightweight Python script (<code>scripts/check-email-status.py</code>) queries Gmail for recent activity and writes a compact status file (<code>context/email-status.md</code>). Agents read this file instead of relying on stale inline context.</p>
<h3>Why this approach (over alternatives)</h3>
<table>
<thead>
<tr>
<th>Approach</th>
<th>Verdict</th>
</tr>
</thead>
<tbody><tr>
<td>Hook that injects email body into every prompt</td>
<td>Too heavy. Eats context tokens. Rejected.</td>
</tr>
<tr>
<td>Full inbox dump to a file</td>
<td>Same problem. Bloated file agents have to parse. Rejected.</td>
</tr>
<tr>
<td>Compact status file, updated on-demand</td>
<td>Lightweight. ~50 lines max. Agents read when relevant. <strong>Chosen.</strong></td>
</tr>
<tr>
<td>Hook injection of just the status</td>
<td>Considered, but adds latency to every prompt. Better as a file agents check when needed.</td>
</tr>
</tbody></table>
<h3>How it works</h3>
<p><strong>Script: <code>scripts/check-email-status.py</code></strong></p>
<ol>
<li>Connects to Gmail API (<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>, existing OAuth tokens)</li>
<li>Checks two things:<ul>
<li><strong>Watched threads</strong>: A configurable list of thread queries tied to known tasks (e.g., &quot;Included Health W-9&quot;, &quot;KOHRS invoice&quot;). For each, it finds the latest message and reports who sent it, when, and a one-line snippet.</li>
<li><strong>Recent inbox</strong>: Last 24h of new messages in INBOX (unread or recent). Reports subject, sender, time. No bodies.</li>
</ul>
</li>
<li>Writes <code>context/email-status.md</code> with a compact, scannable format</li>
<li>Writes <code>context/.email-last-check</code> with the timestamp + historyId for delta tracking</li>
</ol>
<p><strong>Output format (context/email-status.md):</strong></p>
<pre><code># Email Status
*Last checked: 2026-03-10 11:30 PM AZ*

## Watched Threads

| Thread | Latest From | When | Status |
|--------|------------|------|--------|
| IH Deposit / W-9 | AOM TEAM (us) | Mar 9, 11:20 AM | W-9 SENT. Lara confirmed AP has req RQ-000079. |
| KOHRS invoice | (no recent activity) | -- | Last check found nothing new. |

## New in Last 24h (3 messages)

- [Mar 10 3:00p] Claude Team -- Tips to get the most out of Claude Code
- [Mar 10 1:15p] Vercel -- Your deployment is ready
- [Mar 9 6:30p] Lara Key -- Re: Deposit invoice (W-9 confirmed)
</code></pre>
<h3>When it runs</h3>
<ul>
<li><strong>Session start hook</strong>: Added to the SessionStart hook array. Runs <code>check-email-status.py</code> silently. Takes ~2-3 seconds.</li>
<li><strong>Wash hands</strong>: Added as a step. Keeps status fresh between sessions.</li>
<li><strong>On-demand</strong>: Any agent can run <code>python3 scripts/check-email-status.py</code> before acting on email-related tasks.</li>
</ul>
<h3>Thread Watch List</h3>
<p>The script reads a config file at <code>context/email-watches.json</code>:</p>
<pre><code class="language-json">[
  {
    &quot;label&quot;: &quot;IH Deposit / W-9&quot;,
    &quot;query&quot;: &quot;subject:(deposit invoice conference) (from:includedhealth OR to:includedhealth)&quot;,
    &quot;task_ref&quot;: &quot;IH W-9 needed for $9k&quot;
  },
  {
    &quot;label&quot;: &quot;KOHRS invoice&quot;,
    &quot;query&quot;: &quot;subject:kohrs OR from:leigh&quot;,
    &quot;task_ref&quot;: &quot;Confirm KOHRS $2k from Leigh&quot;
  }
]
</code></pre>
<p>Any agent or Patrik can add watches. Just append to the JSON array.</p>
<h3>Integration with punch-list + priorities</h3>
<p>The script itself does NOT edit punch-list.md or current-priorities.md (per scope boundary). But it sets the foundation:</p>
<ul>
<li>Mom reads <code>context/email-status.md</code> during her scan loop</li>
<li>If a watched thread shows a status change (e.g., &quot;W-9 SENT&quot;), Mom updates the punch list and priorities</li>
<li>The status file includes the <code>task_ref</code> field so Mom can match it to the right punch list item</li>
</ul>
<p>Future enhancement: a <code>--update-tasks</code> flag that auto-updates punch-list entries based on email status changes.</p>
<h3>iCloud (<a href="mailto:patrikmatheson@icloud.com">patrikmatheson@icloud.com</a>)</h3>
<p>Not included in v1. The Gmail account (<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>) handles all business email. iCloud is personal. If needed later, a parallel check via Mail.app AppleScript can write to the same status file.</p>
<h3>Token refresh</h3>
<p>The script handles token refresh automatically. If the access token is expired, it uses the refresh token and saves the updated token back to <code>~/.config/aom-gmail-tokens.json</code>.</p>
<h2>Files Created</h2>
<table>
<thead>
<tr>
<th>File</th>
<th>Purpose</th>
</tr>
</thead>
<tbody><tr>
<td><code>scripts/check-email-status.py</code></td>
<td>Main script. Queries Gmail, writes status file.</td>
</tr>
<tr>
<td><code>context/email-watches.json</code></td>
<td>Watched thread configs. Editable by any agent.</td>
</tr>
<tr>
<td><code>context/email-status.md</code></td>
<td>Output. Compact, scannable email status. Agents read this.</td>
</tr>
<tr>
<td><code>context/.email-last-check</code></td>
<td>Internal. Timestamp + historyId for delta tracking.</td>
</tr>
</tbody></table>
<h2>Hook Config Change (proposed)</h2>
<p>Add to <code>.claude/settings.json</code> &gt; <code>hooks.SessionStart</code>:</p>
<pre><code class="language-json">{
  &quot;type&quot;: &quot;command&quot;,
  &quot;command&quot;: &quot;python3 /Users/patrik/Documents/Dev/AOM-EA/scripts/check-email-status.py --quiet&quot;,
  &quot;timeout&quot;: 10000
}
</code></pre>
<p>This runs before the relay hook, so email status is fresh before any agent reads context.</p>
`,l={title:t,slug:e,category:n,agent:o,date:s,dateFormatted:a,updated:null,summary:i,tags:d,content:r};export{o as agent,n as category,r as content,s as date,a as dateFormatted,l as default,e as slug,i as summary,d as tags,t as title,c as updated};
