const e="Dashboard Control Panel Architecture",n="dashboard-control-panel-arch",o="Technical",t="Alex",a="2026-03-09",s="Mar 9",d=null,l="Architecture design for switching dashboard agents to Anthropic tool_use with structured actions.",i=[],r=`<h1>Dashboard Control Panel Architecture</h1>
<p><em>Designed by Alex, 2026-03-09</em></p>
<h2>The Move</h2>
<p>Switch dashboard agents from plain text to Anthropic&#39;s native tool_use. Agents get structured actions they can take. The API becomes a tool execution runtime. The frontend shows what happened and lets Patrik approve or undo.</p>
<h2>V1 Actions</h2>
<ol>
<li><strong>mark_task_done</strong> -- checks off item in punch-list.md, appends date</li>
<li><strong>add_task</strong> -- already exists</li>
<li><strong>log_decision</strong> -- appends to decisions/log.md</li>
<li><strong>update_agent_log</strong> -- appends to agent&#39;s AGENT.md session log</li>
<li><strong>update_handoff</strong> -- replaces HANDOFF.md (requires approval)</li>
</ol>
<h2>API Changes (chat.js)</h2>
<ul>
<li>Add tools array to Anthropic API call</li>
<li>Add tool execution loop (call Anthropic, execute tool_use blocks, send results back, get final text)</li>
<li>Cap loop at 3 iterations</li>
<li>Return <code>actions_taken[]</code> and <code>pending_approval[]</code> in response</li>
</ul>
<h2>Safety Rails</h2>
<ul>
<li><strong>Tier 1 (auto-execute):</strong> mark_task_done, add_task, log_decision, update_agent_log</li>
<li><strong>Tier 2 (show diff, wait for approval):</strong> update_handoff, update_priorities</li>
<li><strong>Tier 3 (always confirm):</strong> money, email, calendar</li>
</ul>
<h2>Frontend Changes</h2>
<ul>
<li>Action badges below chat replies (green check for done, blue pencil for logged)</li>
<li>Undo button on each action</li>
<li>Approval modal for Tier 2 writes</li>
<li>Auto-refresh punch list after writes</li>
</ul>
<h2>Build Order</h2>
<ol>
<li>Phase 1: mark_task_done + tool execution loop + action badges</li>
<li>Phase 2: log_decision + update_agent_log</li>
<li>Phase 3: update_handoff + approval flow</li>
<li>Phase 4: undo system</li>
</ol>
<h2>System Prompt Addition</h2>
<pre><code>You have tools available to update AOM&#39;s system. Use them when:
- A task is confirmed done (mark_task_done)
- A real decision is made, not just discussed (log_decision)
- You&#39;ve done meaningful work worth recording (update_agent_log)
- Patrik asks you to update the handoff (update_handoff)

Do NOT use tools speculatively. Only write when something actually happened.
Do NOT mark tasks done unless Patrik confirms.
Do NOT log decisions that are still being discussed.
</code></pre>
`,c={title:e,slug:n,category:o,agent:t,date:a,dateFormatted:s,updated:null,summary:l,tags:i,content:r};export{t as agent,o as category,r as content,a as date,s as dateFormatted,c as default,n as slug,l as summary,i as tags,e as title,d as updated};
