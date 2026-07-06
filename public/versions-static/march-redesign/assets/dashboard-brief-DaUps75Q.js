const t="AOM Mission Control Dashboard Brief",e="dashboard-brief",n="Strategy",a="Bobby",o="2026-03-07",s="Mar 7",l=null,r="Gap analysis between current dashboard and reference, with actionable improvement proposals.",i=[],d=`<h1>AOM Mission Control -- Dashboard Improvement Brief</h1>
<p><strong>Date:</strong> 2026-03-07
<strong>Author:</strong> Bobby (Web Dev Agent)
<strong>Purpose:</strong> Gap analysis between current dashboard and reference screenshot. Actionable proposals for Patrik and council.</p>
<hr>
<h2>Reference Screenshot -- What&#39;s In It</h2>
<p>The reference shows a team ops dashboard (appears to be an AI agent management tool). Key elements identified:</p>
<ul>
<li>Top bar: &quot;MISSION CONTROL&quot; label, large prominent stats (14 active, 283 total tasks), filter buttons (Active / Clear / Breakdown / Status)</li>
<li>Left panel: Agent list with real face photos, names, task-count badges, status indicators</li>
<li>Center: Multi-column kanban with 5+ swimlane columns (Backlog, In Progress, Review, Email, etc.)</li>
<li>Task cards: title, truncated description, assignee chip, category tags, color-coded labels</li>
<li>Right panel: Live activity feed with user avatars, comment previews, timestamps, linked items</li>
<li>Overall density: high -- lots of data visible at a glance without scrolling</li>
</ul>
<hr>
<h2>Current Dashboard -- What We Have</h2>
<ul>
<li>Top bar: AOM / Mission Control branding, 4 stats (OPEN / BLOCKED / DEADLINES / UNASSIGNED), refresh + lock</li>
<li>Left sidebar: 6 agents as initials circles, status pills, role labels, agent filter</li>
<li>Center: Priorities section (numbered cards), 3-column kanban (Unassigned / Assigned / Blocked)</li>
<li>Right sidebar: Activity feed (handoff notes + actions log combined, 18 items)</li>
<li>Bottom: CommandBar with agent selector, chat input, + TASK mode, command log popup</li>
<li>Password gate on entry</li>
</ul>
<hr>
<h2>Gap Analysis</h2>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Reference</th>
<th>Ours</th>
</tr>
</thead>
<tbody><tr>
<td>Agent avatars</td>
<td>Real photos</td>
<td>Initials only</td>
</tr>
<tr>
<td>Kanban columns</td>
<td>5+ workflow stages</td>
<td>3 only (Unassigned/Assigned/Blocked)</td>
</tr>
<tr>
<td>Task card labels/tags</td>
<td>Color tags, category chips</td>
<td>Category text only</td>
</tr>
<tr>
<td>Stats bar prominence</td>
<td>Large, front-and-center</td>
<td>Small, inline in header</td>
</tr>
<tr>
<td>Activity feed avatars</td>
<td>Face photos with timestamps</td>
<td>Dot + text, no avatars</td>
</tr>
<tr>
<td>Filter controls</td>
<td>Multi-filter (status, agent, type)</td>
<td>Agent filter only</td>
</tr>
<tr>
<td>Task count per agent</td>
<td>Shown on agent row</td>
<td>Not shown</td>
</tr>
<tr>
<td>Progress indicators</td>
<td>Implied by column counts</td>
<td>Not shown</td>
</tr>
<tr>
<td>In-Progress column</td>
<td>Yes</td>
<td>No -- tasks jump from assigned to blocked</td>
</tr>
<tr>
<td>&quot;Done&quot; visibility</td>
<td>Column exists</td>
<td>No done column or done count visible</td>
</tr>
</tbody></table>
<hr>
<h2>Top 7 Improvement Proposals</h2>
<p>Ranked by impact for AOM as an ops tool, not by visual polish.</p>
<hr>
<h3>1. Add an &quot;In Progress&quot; Kanban Column</h3>
<p><strong>What:</strong> A 4th kanban column between Assigned and Blocked. Agent rows that have &quot;in progress&quot; or &quot;working on&quot; in their AGENT.md surface tasks here automatically.</p>
<p><strong>Why it matters for AOM:</strong> Right now there&#39;s no visual distinction between &quot;Bobby has this in queue&quot; and &quot;Bobby is actively working on this right now.&quot; That&#39;s the most important signal when Patrik opens the dashboard mid-day. In Progress = eyes on it. Assigned = next up. The gap makes the board read as less real.</p>
<p><strong>Complexity:</strong> Simple. One new column config entry + a status inference rule in <code>assignTasksToAgents()</code>.</p>
<hr>
<h3>2. Task Count Badge on Each Agent Row</h3>
<p><strong>What:</strong> Show a small number badge on each agent&#39;s row in the sidebar -- count of open tasks assigned to that agent.</p>
<p><strong>Why it matters for AOM:</strong> At a glance you can see Bobby has 8 open tasks, Jacob has 2. Uneven load distribution becomes immediately visible. Patrik can rebalance without digging into the kanban.</p>
<p><strong>Complexity:</strong> Simple. <code>data.tasks.filter(t =&gt; t.agent === a.name).length</code> already computable from loaded data.</p>
<hr>
<h3>3. Per-Agent &quot;Last Active&quot; Timestamp on Sidebar</h3>
<p><strong>What:</strong> Under each agent&#39;s role label, show the date of their last AGENT.md session log entry. &quot;Last active: Mar 7&quot; or &quot;No activity in 3 days.&quot;</p>
<p><strong>Why it matters for AOM:</strong> Agent staleness is a real ops problem. If Steffen hasn&#39;t had an entry in 2 weeks, that needs to surface. Right now you&#39;d have to click into the agent and read their log. This makes dormancy visible without any extra clicks.</p>
<p><strong>Complexity:</strong> Simple. <code>parseAgentLog()</code> already pulls the last entry date -- just render it on the row.</p>
<hr>
<h3>4. Deadline Countdown on Task Cards</h3>
<p><strong>What:</strong> For tasks flagged with HARD DEADLINE, show how many days remain next to the red &quot;Hard Deadline&quot; label. &quot;Hard Deadline -- 51 days&quot; or &quot;Hard Deadline -- 3 days (ISA Energy).&quot;</p>
<p><strong>Why it matters for AOM:</strong> ISA Energy&#39;s April 27 deadline is existential. Seeing &quot;51 days&quot; on the card every time Patrik opens the dashboard keeps urgency real. It&#39;s the difference between &quot;I know it&#39;s coming&quot; and &quot;I feel it coming.&quot; Deadline tags without countdown are passive.</p>
<p><strong>Complexity:</strong> Simple. Date math from today&#39;s date (already have <code>currentDate</code> in memory) + extract deadline dates from task text. Can start with just showing the ISA Energy date.</p>
<hr>
<h3>5. Priorities Panel as Collapsible Section with Status Flags</h3>
<p><strong>What:</strong> The current priorities cards are static text. Add a visual status flag to each (on track / at risk / blocked) based on whether their corresponding tasks have blockers or hard deadlines with no &quot;in progress&quot; work showing.</p>
<p><strong>Why it matters for AOM:</strong> Priorities + task board are disconnected right now. You read the priorities, then have to mentally cross-reference the kanban. If the priorities panel showed &quot;ISA Energy -- AT RISK (1 blocked task)&quot; it would collapse that mental work into one read.</p>
<p><strong>Complexity:</strong> Medium. Requires a mapping layer between priority labels and task categories. The mapping already partially exists in <code>ownerMap</code>. Would need a status-inference function that scans tasks for a given priority&#39;s project.</p>
<hr>
<h3>6. Done Counter in Top Bar (Completed Today / This Week)</h3>
<p><strong>What:</strong> Add a DONE stat to the top bar alongside OPEN / BLOCKED / DEADLINES. Pull from the actions-log.md entries with today&#39;s date.</p>
<p><strong>Why it matters for AOM:</strong> The current stats only show problems (blocked, deadlines) or work remaining (open). There&#39;s no momentum signal. Seeing &quot;6 done today&quot; gives Patrik a read on velocity without opening Notion or scrolling the activity feed. Momentum is motivating -- it should be visible.</p>
<p><strong>Complexity:</strong> Simple. Filter <code>parseActionsLog()</code> results by today&#39;s date and count them.</p>
<hr>
<h3>7. Revenue Pipeline Snapshot (Top Bar or Sidebar Footer)</h3>
<p><strong>What:</strong> A small, persistent revenue indicator -- &quot;Q1: $35k / $50k target&quot; -- pulled from a goals or pipeline file. Could be as simple as a static value Patrik updates manually, or parsed from goals.md.</p>
<p><strong>Why it matters for AOM:</strong> Every other feature on this dashboard is about execution. But the reason for executing is revenue. Right now the dashboard has zero financial visibility. Even a manual &quot;we&#39;re at $X this quarter&quot; field that Patrik updates would make Mission Control feel more like a real command center vs. a task tracker. The reference screenshot has high-level metrics prominently displayed -- this is why.</p>
<p><strong>Complexity:</strong> Simple (if manual/static field in a context file). Medium (if parsed dynamically from a pipeline file that doesn&#39;t yet exist).</p>
<hr>
<h2>Priority Ranking for Implementation</h2>
<table>
<thead>
<tr>
<th>#</th>
<th>Proposal</th>
<th>Effort</th>
<th>Impact</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>Task count badge on agent rows</td>
<td>Low</td>
<td>High</td>
</tr>
<tr>
<td>2</td>
<td>Per-agent last active timestamp</td>
<td>Low</td>
<td>High</td>
</tr>
<tr>
<td>3</td>
<td>Deadline countdown on task cards</td>
<td>Low</td>
<td>High</td>
</tr>
<tr>
<td>4</td>
<td>Done counter in top bar</td>
<td>Low</td>
<td>Medium-High</td>
</tr>
<tr>
<td>5</td>
<td>In Progress kanban column</td>
<td>Low</td>
<td>Medium</td>
</tr>
<tr>
<td>6</td>
<td>Priorities panel with status flags</td>
<td>Medium</td>
<td>High</td>
</tr>
<tr>
<td>7</td>
<td>Revenue pipeline snapshot</td>
<td>Low-Medium</td>
<td>High (context)</td>
</tr>
</tbody></table>
<p><strong>Recommended first pass (1 session):</strong> Items 1, 2, 3, 4. All low-effort, all high signal. Makes the dashboard read as a live ops tool rather than a static list viewer.</p>
<p><strong>Second pass:</strong> Items 5, 6 together -- they reinforce each other (In Progress column makes the at-risk logic more accurate).</p>
<p><strong>Third pass:</strong> Item 7 -- needs a pipeline data source to be defined first.</p>
<hr>
<h2>What We Have That the Reference Doesn&#39;t</h2>
<ul>
<li>CommandBar (chat + task-add from the dashboard itself) -- this is a real advantage</li>
<li>Password gate -- theirs appears to be open/public</li>
<li>Direct AGENT.md integration -- we read live agent state from GitHub, not a database</li>
</ul>
<p>These are worth keeping and building on, not replacing.</p>
<hr>
<p><em>Brief prepared by Bobby. Ready for Patrik review.</em></p>
`,h={title:t,slug:e,category:n,agent:a,date:o,dateFormatted:s,updated:null,summary:r,tags:i,content:d};export{a as agent,n as category,d as content,o as date,s as dateFormatted,h as default,e as slug,r as summary,i as tags,t as title,l as updated};
