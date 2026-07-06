const t="Dashboard UX Review",e="dashboard-ux-review",n="Design Specs",d="Steffen",s="2026-03-09",o="Mar 9",l=null,a="UX review of aheadofmarket.com/dashboard with design improvement recommendations.",r=[],i=`<h1>Dashboard UX Review -- Big 3 Chain</h1>
<p><strong>Reviewer:</strong> Steffen (Brand + Design)
<strong>Target:</strong> aheadofmarket.com/dashboard
<strong>Code:</strong> <code>/Users/patrik/Documents/Dev/aom-studio/src/dashboard/Dashboard.jsx</code>
<strong>API:</strong> <code>/Users/patrik/Documents/Dev/aom-studio/api/chat.js</code>
<strong>Date:</strong> 2026-03-09</p>
<hr>
<h2>Critical Bug: Assignment Persistence</h2>
<h3>Root Cause</h3>
<p>The assignment write path and read path are completely disconnected.</p>
<p><strong>Write path (works):</strong> When you assign an agent via the picker, the API (<code>api/chat.js</code> line 834-865) writes a <code>[AgentName]</code> tag into <code>punch-list.md</code> on GitHub. Example: <code>- [ ] [Bobby] Fix the homepage</code> -- this commit succeeds.</p>
<p><strong>Read path (ignores the write):</strong> When the dashboard refreshes (every 30s or after assignment), <code>load()</code> at line 2042 re-fetches <code>punch-list.md</code>, parses it with <code>parsePunchList()</code> (line 52-69), then runs <code>assignTasksToAgents()</code> (line 255-327). Neither function reads the <code>[AgentName]</code> tag that was just written.</p>
<ul>
<li><code>parsePunchList()</code> (line 59) only matches <code>- [x]</code> or <code>- [ ]</code> checkbox patterns. It strips everything into a <code>text</code> field but never extracts an <code>[Agent]</code> tag.</li>
<li><code>assignTasksToAgents()</code> (line 255-327) uses keyword heuristics and category matching to determine agent. It never checks if the task already has a manually assigned <code>[Agent]</code> tag in the markdown.</li>
</ul>
<p><strong>Result:</strong> User assigns Bobby to a task. API writes <code>[Bobby]</code> to the file. 1.2 seconds later, <code>onRefresh()</code> fires (line 608), <code>load()</code> re-fetches the file, heuristic assignment runs, and the task gets re-assigned to whatever the heuristic says (often &quot;unassigned&quot; or a different agent). The green checkmark flash is the only evidence it ever worked.</p>
<h3>Exact Code Locations</h3>
<table>
<thead>
<tr>
<th>Step</th>
<th>File</th>
<th>Line</th>
<th>What Happens</th>
</tr>
</thead>
<tbody><tr>
<td>User picks agent</td>
<td>Dashboard.jsx</td>
<td>595-612</td>
<td><code>assignAgent()</code> POSTs to <code>/api/chat</code> with <code>assign_agent</code> action</td>
</tr>
<tr>
<td>API writes tag</td>
<td>chat.js</td>
<td>834-865</td>
<td>Writes <code>[AgentName]</code> tag into punch-list.md via GitHub API</td>
</tr>
<tr>
<td>Flash shows</td>
<td>Dashboard.jsx</td>
<td>607</td>
<td><code>setAssignFlash(agentName)</code> -- green check + name for 1.2s</td>
</tr>
<tr>
<td>Refresh fires</td>
<td>Dashboard.jsx</td>
<td>608</td>
<td><code>setTimeout(() =&gt; { setAssignFlash(null); onRefresh() }, 1200)</code></td>
</tr>
<tr>
<td>File re-fetched</td>
<td>Dashboard.jsx</td>
<td>2042-2060</td>
<td><code>load()</code> fetches punch-list.md, parses, runs heuristic assignment</td>
</tr>
<tr>
<td>Tag ignored</td>
<td>Dashboard.jsx</td>
<td>52-69</td>
<td><code>parsePunchList()</code> doesn&#39;t extract <code>[Agent]</code> tags</td>
</tr>
<tr>
<td>Heuristic overwrites</td>
<td>Dashboard.jsx</td>
<td>255-327</td>
<td><code>assignTasksToAgents()</code> runs keyword matching, ignores manual tags</td>
</tr>
</tbody></table>
<h3>Fix Direction for Bobby</h3>
<ol>
<li>In <code>parsePunchList()</code> (line 52-69): After parsing the checkbox, check for a <code>[AgentName]</code> tag at the start of the task text. Extract it into a new field like <code>manualAgent</code>. Strip it from the displayed <code>text</code>.</li>
</ol>
<pre><code>// After line 65, before items.push:
const agentTag = text.match(/^\\[(\\w+)\\]\\s*/)
const manualAgent = agentTag ? agentTag[1] : null
const cleanText = manualAgent ? text.replace(agentTag[0], &#39;&#39;) : text
</code></pre>
<ol start="2">
<li>In <code>assignTasksToAgents()</code> (line 255-327): If <code>p.manualAgent</code> exists, use it instead of running the heuristic. Manual assignment should always win.</li>
</ol>
<pre><code>// After line 263, before the heuristic chain:
if (p.manualAgent) { agent = p.manualAgent }
</code></pre>
<p>This is a 10-line fix. The write path already works. The read path just needs to respect what was written.</p>
<hr>
<h2>Feature-by-Feature Audit</h2>
<h3>Mobile (MobileTaskCard, line 394-885)</h3>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Works?</th>
<th>Persists?</th>
<th>Issue</th>
<th>Fix Direction</th>
</tr>
</thead>
<tbody><tr>
<td>Assign agent</td>
<td>Partially</td>
<td>Writes to GitHub but reverts on refresh</td>
<td>See critical bug above</td>
<td>Parse <code>[Agent]</code> tags on read</td>
</tr>
<tr>
<td>Reassign agent</td>
<td>Partially</td>
<td>Same as assign</td>
<td>Same root cause</td>
<td>Same fix</td>
</tr>
<tr>
<td>Delete task</td>
<td>Yes</td>
<td>Yes (GitHub write)</td>
<td>Silent failure on error after 2s timeout</td>
<td>Show persistent error state, not auto-dismiss</td>
</tr>
<tr>
<td>Mark done</td>
<td>Yes</td>
<td>Yes (GitHub write)</td>
<td>No error state shown on failure (catch block empty, line 554)</td>
<td>Add error handling like deleteTask has</td>
</tr>
<tr>
<td>Create task (CommandBar)</td>
<td>Yes</td>
<td>Yes (GitHub write)</td>
<td>Works correctly, auto-refreshes after 2s</td>
<td>None</td>
</tr>
<tr>
<td>Swipe actions</td>
<td>Yes</td>
<td>N/A (UI only)</td>
<td>Works well on mobile</td>
<td>None</td>
</tr>
<tr>
<td>Expand subtasks</td>
<td>Yes</td>
<td>Client-side only (cached in ref)</td>
<td>Lost on refresh, but that&#39;s fine since they&#39;re AI-generated</td>
<td>None</td>
</tr>
<tr>
<td>Inline reply</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Reply disappears if you close and reopen</td>
<td>Consider caching last reply</td>
</tr>
<tr>
<td>Rename task</td>
<td>Yes</td>
<td>Yes (GitHub write)</td>
<td>Silent failure (line 588 catch is empty)</td>
<td>Add error feedback</td>
</tr>
<tr>
<td>Launch agent</td>
<td>Yes</td>
<td>Client-side result</td>
<td>Result disappears on dismiss, no persistence</td>
<td>Fine as-is, it&#39;s ephemeral</td>
</tr>
<tr>
<td>Agent picker dropdown</td>
<td>Yes</td>
<td>N/A (UI only)</td>
<td>Dropdown stays open after tap outside the picker</td>
<td>Add click-outside-to-close</td>
</tr>
<tr>
<td>Filter tabs (all/unassigned/assigned/blocked)</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Resets to &#39;all&#39; on page reload</td>
<td>Consider persisting in localStorage</td>
</tr>
</tbody></table>
<h3>Desktop (TaskCard, line 888-1130)</h3>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Works?</th>
<th>Persists?</th>
<th>Issue</th>
<th>Fix Direction</th>
</tr>
</thead>
<tbody><tr>
<td>Assign agent</td>
<td>NO</td>
<td>N/A</td>
<td>Desktop TaskCard has NO agent picker. Agent shown is read-only (line 1089-1096). No way to assign/reassign from desktop.</td>
<td>Add agent picker like mobile has</td>
</tr>
<tr>
<td>Delete task</td>
<td>Yes</td>
<td>Yes (GitHub write)</td>
<td>Works, has error state</td>
<td>None</td>
</tr>
<tr>
<td>Mark done</td>
<td>NO</td>
<td>N/A</td>
<td>Desktop TaskCard has NO mark-done button. Only delete.</td>
<td>Add mark-done button or right-click menu</td>
</tr>
<tr>
<td>Expand subtasks</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Same as mobile</td>
<td>None</td>
</tr>
<tr>
<td>Inline reply</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Same as mobile</td>
<td>None</td>
</tr>
<tr>
<td>Rename task</td>
<td>Yes</td>
<td>Yes (GitHub write)</td>
<td>Silent failure</td>
<td>Add error feedback</td>
</tr>
<tr>
<td>Kanban columns</td>
<td>Yes</td>
<td>N/A (derived from data)</td>
<td>No drag-and-drop between columns</td>
<td>Consider drag-and-drop for reassignment</td>
</tr>
</tbody></table>
<h3>Chat Panel (CommandBar, line 1708-1900+)</h3>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Works?</th>
<th>Persists?</th>
<th>Issue</th>
<th>Fix Direction</th>
</tr>
</thead>
<tbody><tr>
<td>Add task (TASK mode)</td>
<td>Yes</td>
<td>Yes (GitHub write)</td>
<td>Works correctly</td>
<td>None</td>
</tr>
<tr>
<td>Chat with agent (CHAT mode)</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Conversation lost on page reload</td>
<td>Fine as ephemeral</td>
</tr>
<tr>
<td>Launch agent (AGENT mode)</td>
<td>Yes</td>
<td>Client-side result</td>
<td>Works, shows tool use badges</td>
<td>None</td>
</tr>
<tr>
<td>HOME mode (CC)</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Conversation lost on reload</td>
<td>Fine as ephemeral</td>
</tr>
<tr>
<td>Mode tabs</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Resets to TASK on reload</td>
<td>Fine, TASK is sensible default</td>
</tr>
<tr>
<td>Agent selector (AGENT mode)</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Horizontal scroll on mobile, works</td>
<td>None</td>
</tr>
</tbody></table>
<h3>Agent Sidebar (Desktop, line 2172-2232)</h3>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Works?</th>
<th>Persists?</th>
<th>Issue</th>
<th>Fix Direction</th>
</tr>
</thead>
<tbody><tr>
<td>Agent list</td>
<td>Yes</td>
<td>N/A</td>
<td>Works</td>
<td>None</td>
</tr>
<tr>
<td>Filter by agent</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Resets on reload</td>
<td>None</td>
</tr>
<tr>
<td>Agent profile</td>
<td>Yes</td>
<td>N/A</td>
<td>Shows skills, status, last active</td>
<td>None</td>
</tr>
<tr>
<td>Suggest skill</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Response disappears on agent switch</td>
<td>Fine as ephemeral</td>
</tr>
<tr>
<td>View switcher (Queue/Reports/Skills)</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Resets to Queue on reload</td>
<td>Fine, Queue is sensible default</td>
</tr>
</tbody></table>
<h3>Other</h3>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Works?</th>
<th>Persists?</th>
<th>Issue</th>
<th>Fix Direction</th>
</tr>
</thead>
<tbody><tr>
<td>Auto-refresh (30s)</td>
<td>Yes</td>
<td>N/A</td>
<td>Progress bar works, re-fetches from GitHub</td>
<td>None</td>
</tr>
<tr>
<td>Password gate</td>
<td>Yes</td>
<td>localStorage</td>
<td>Persists across sessions</td>
<td>None</td>
</tr>
<tr>
<td>Council modal</td>
<td>Yes</td>
<td>Client-side only</td>
<td>Not reviewed in detail</td>
<td>N/A</td>
</tr>
<tr>
<td>Priorities carousel (mobile)</td>
<td>Yes</td>
<td>N/A (read-only)</td>
<td>No interaction beyond scroll</td>
<td>None</td>
</tr>
</tbody></table>
<hr>
<h2>Design/UX Issues</h2>
<h3>Missing Feedback States</h3>
<ol>
<li><p><strong>No loading indicator on assignment</strong> (line 597-611): <code>setAssigning(true)</code> is set but never shown in the UI. The user taps an agent name and nothing happens for 1-3s until the flash appears. Add a spinner or &quot;assigning...&quot; text.</p>
</li>
<li><p><strong>Silent failures everywhere</strong>: <code>markDone</code> on mobile (line 554), <code>saveRename</code> on both (line 588, 995), and <code>launchAgent</code> (line 570) all have empty catch blocks. If the network request fails, the user gets zero feedback. At minimum, show a red flash.</p>
</li>
<li><p><strong>No confirmation on delete</strong>: Tapping the delete button immediately fires the API call. On mobile, it&#39;s behind a swipe which provides some protection. On desktop, it&#39;s a tiny &quot;x&quot; button (line 1059-1067) with no confirmation. One mis-click deletes a task from the punch list.</p>
</li>
</ol>
<h3>Interactions That Should Feel Snappier</h3>
<ol start="4">
<li><p><strong>Assignment flash delay is too long</strong>: 1200ms (line 608) between showing the green check and triggering refresh is excessive. The check could show for 600ms, then optimistically update the local state while the refresh loads in the background.</p>
</li>
<li><p><strong>Delete/done animation timing</strong>: 1200ms delay before refresh (lines 527, 552, 971). Task visually disappears but the list doesn&#39;t reflow for over a second. Could optimistically remove from local state immediately.</p>
</li>
<li><p><strong>Rename refresh delay</strong>: 1500ms (line 587, 994). Could be shorter.</p>
</li>
</ol>
<h3>Visual Issues</h3>
<ol start="7">
<li><p><strong>Desktop TaskCard missing parity with mobile</strong>: Mobile cards have swipe actions (done, run, reply, delete), agent picker, and launch agent. Desktop cards only have delete (x button), inline reply, and expand. No mark-done, no assign, no launch. This makes the dashboard significantly less useful on desktop.</p>
</li>
<li><p><strong>Agent picker on mobile doesn&#39;t close on outside tap</strong>: The picker opens/toggles on the agent name tap (line 767), but there&#39;s no click-outside handler. If you open the picker and decide not to assign, you have to tap the agent name again.</p>
</li>
<li><p><strong>Kanban columns have no empty state interaction</strong>: The dashed &quot;No owner yet&quot; / &quot;Queued for agent&quot; / &quot;Needs action&quot; placeholders (line 1149-1151) are dead zones. Could have a &quot;+ Add task&quot; or &quot;Drop here&quot; affordance.</p>
</li>
<li><p><strong>Mobile filter count doesn&#39;t show blocked count separately</strong>: The filter tabs (line 2360-2388) show &quot;All&quot;, &quot;Unassigned&quot;, &quot;Assigned&quot;, &quot;Blocked&quot; with counts, but the counts are computed from <code>filteredTasks</code> which might already be agent-filtered. This can show misleading numbers when viewing a single agent&#39;s queue.</p>
</li>
</ol>
<hr>
<h2>Priority Order for Bobby</h2>
<ol>
<li><p><strong>Fix assignment persistence</strong> -- The critical bug. Parse <code>[Agent]</code> tags in <code>parsePunchList()</code> and respect them in <code>assignTasksToAgents()</code>. 10-line fix. Without this, the assign feature is broken.</p>
</li>
<li><p><strong>Add agent picker to desktop TaskCard</strong> -- Desktop has no way to assign tasks. Port the agent picker from <code>MobileTaskCard</code> (line 593-813) into <code>TaskCard</code>. Without this, desktop users can only assign via chat commands.</p>
</li>
<li><p><strong>Add mark-done to desktop TaskCard</strong> -- Desktop has no &quot;done&quot; button. Only mobile has it via swipe. Add a checkmark button or hover action.</p>
</li>
<li><p><strong>Add error handling to silent catch blocks</strong> -- Lines 554, 588, 570, 995 all swallow errors. Add red flash states like <code>deleteTask</code> already has (line 529-530 pattern). Copy that pattern.</p>
</li>
<li><p><strong>Speed up feedback timing</strong> -- Reduce assignment flash from 1200ms to 600ms (line 608). Reduce delete/done refresh delay from 1200ms to 800ms. Use optimistic local state updates instead of waiting for full GitHub round-trip refresh.</p>
</li>
<li><p><strong>Add delete confirmation on desktop</strong> -- Single-click delete with no undo is risky. Either add a &quot;confirm?&quot; step or an undo toast.</p>
</li>
<li><p><strong>Close agent picker on outside tap</strong> -- Add a transparent overlay behind the picker that closes it on tap.</p>
</li>
<li><p><strong>Persist mobile filter tab in localStorage</strong> -- Minor QoL so the view doesn&#39;t reset on every refresh.</p>
</li>
</ol>
`,h={title:t,slug:e,category:n,agent:d,date:s,dateFormatted:o,updated:null,summary:a,tags:r,content:i};export{d as agent,n as category,i as content,s as date,o as dateFormatted,h as default,e as slug,a as summary,r as tags,t as title,l as updated};
