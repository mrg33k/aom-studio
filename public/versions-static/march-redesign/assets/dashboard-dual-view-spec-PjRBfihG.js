const t="Dashboard Dual-View Product Spec",e="dashboard-dual-view-spec",n="Technical",i="Steve",o="2026-03-12",a="Mar 12",d=null,s="Product spec for two dashboard views: individual agent detail and high-level command center.",l=[],r=`<h1>Dashboard Dual-View Product Spec</h1>
<p><strong>Date:</strong> 2026-03-12
<strong>Author:</strong> Steve (AI Advisory Lead)
<strong>Status:</strong> SPEC COMPLETE. Ready for Bobby build + Alex sales use.</p>
<hr>
<h2>What This Is</h2>
<p>Two views of the same system. One zooms in on a single agent. One zooms out to see everything. Together they turn the AOM dashboard from a task tracker into a live command center.</p>
<p>This architecture serves two customers simultaneously:</p>
<ul>
<li><strong>AOM internal:</strong> Patrik watches his agent army work. 14 agents, real-time status, pipeline throughput.</li>
<li><strong>Client product:</strong> A business owner watches their AI automations run. Same bones, different skin.</li>
</ul>
<p>The dashboard IS the product (from AGENT.md: &quot;The full product is managing the same system we have right here for business owners within a dashboard&quot;).</p>
<hr>
<h2>View 1: Individual Agent View</h2>
<h3>What It Feels Like</h3>
<p>Clicking into an agent should feel like pulling up a chair behind someone working. You see what they&#39;re doing right now, what they just finished, what files they&#39;re touching, and a running log of activity. No guessing. No &quot;last active 4d ago&quot; that lies (see Paige&#39;s teardown, issue #6).</p>
<h3>Layout (Desktop)</h3>
<pre><code>+------------------------------------------------------------------+
| &lt; Back to Command View          BOBBY (Web Dev)        [WORKING] |
+------------------------------------------------------------------+
|                                                                    |
|  CURRENT MISSION                    VITALS                        |
|  +---------------------------+      +---------------------------+ |
|  | Fix /book form (Elmo      |      | Status: WORKING           | |
|  | FAIL x2). Form inputs     |      | Since: 12:34 PM           | |
|  | have no name attrs on     |      | Mission started: 2h ago   | |
|  | production.               |      | Files touched: 4          | |
|  |                           |      | Commits today: 2          | |
|  | Source: active-missions.md|      +---------------------------+ |
|  +---------------------------+                                    |
|                                                                    |
|  RECENT COMPLETIONS (last 7 days)                                 |
|  +--------------------------------------------------------------+ |
|  | [Mar 12] Pipeline page rebuilt (7d27821)                      | |
|  | [Mar 12] /ideas password gate removed (134c8ca)               | |
|  | [Mar 12] 3 Elmo fixes shipped (12b59a8)                       | |
|  | [Mar 11] Steffen&#39;s 5 creative fixes shipped (63ea6fa)         | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  ACTIVE FILES                                                     |
|  +--------------------------------------------------------------+ |
|  | src/app/book/page.tsx                  modified 3m ago         | |
|  | src/components/BookingForm.tsx          modified 8m ago         | |
|  | src/app/book/layout.tsx                modified 12m ago        | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  ACTIVITY LOG (real-time, newest first)                           |
|  +--------------------------------------------------------------+ |
|  | 12:47 PM  Committed: fix form name attributes (a3f21bc)       | |
|  | 12:41 PM  Running Playwright test on /book                    | |
|  | 12:38 PM  Editing src/components/BookingForm.tsx               | |
|  | 12:34 PM  Mission started: Fix /book form                     | |
|  | 12:33 PM  Reading Elmo QA report                              | |
|  | ...                                                            | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
</code></pre>
<h3>Layout (Mobile)</h3>
<p>Single column. Stack: Vitals card (sticky top) &gt; Current Mission &gt; Activity Log (scrollable) &gt; Recent Completions &gt; Active Files (collapsed by default, tap to expand).</p>
<h3>Data for Each Section</h3>
<p><strong>Current Mission</strong></p>
<ul>
<li>Primary source: <code>context/active-missions.md</code> (Running table)</li>
<li>Fallback: <code>projects/[agent]/AGENT.md</code> session log (last entry)</li>
<li>Shows: mission description, when it started, source reference</li>
</ul>
<p><strong>Vitals</strong></p>
<ul>
<li>Status: Derived from active-missions.md (RUNNING = WORKING, not in table = IDLE, has blocker text = BLOCKED)</li>
<li>Since: Timestamp from active-missions.md launch column</li>
<li>Files touched: Count from agent&#39;s latest git activity (git log --author or commit scanning)</li>
<li>Commits today: <code>git log --since=&quot;midnight&quot; --author=[agent]</code> equivalent, parsed from repo</li>
</ul>
<p><strong>Recent Completions</strong></p>
<ul>
<li>Source: <code>context/active-missions.md</code> (Recently Completed table)</li>
<li>Filter: This agent only, last 7 days</li>
<li>Shows: date, description, commit hash (linked to GitHub)</li>
</ul>
<p><strong>Active Files</strong></p>
<ul>
<li>Source: Git diff of the agent&#39;s current working branch, or latest commit file list</li>
<li>For AOM-EA agents: parse latest-result.md for file references</li>
<li>For AMBITION agents: actual git status from that repo</li>
<li>Shows: file path, time since last modification</li>
</ul>
<p><strong>Activity Log</strong></p>
<ul>
<li>This is the hardest piece. See &quot;Real-Time vs Polling&quot; section below.</li>
<li>MVP: Parse <code>projects/[agent]/latest-result.md</code> + <code>context/active-missions.md</code> + git log for this agent</li>
<li>Full version: Live terminal output streaming (requires infrastructure, Phase 2)</li>
<li>Shows: timestamped entries, newest first, auto-scrolls</li>
</ul>
<hr>
<h2>View 2: High-Level Command View</h2>
<h3>What It Feels Like</h3>
<p>Mission control. All agents visible at once. Instantly answer: Who&#39;s working? Who&#39;s idle? What just shipped? Where&#39;s the bottleneck? What&#39;s the pipeline throughput today?</p>
<p>Paige&#39;s teardown nailed it: the current dashboard shows &quot;47 OPEN&quot; tasks and panics people. Command View shows momentum, not backlog.</p>
<h3>Layout (Desktop)</h3>
<pre><code>+------------------------------------------------------------------+
|  AOM MISSION CONTROL                    Mar 12, 2026  2:15 PM AZ |
+------------------------------------------------------------------+
|                                                                    |
|  THROUGHPUT BAR                                                   |
|  +--------------------------------------------------------------+ |
|  |  5 WORKING   3 IDLE   1 BLOCKED   4 DONE TODAY   2 COMMITS  | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  AGENT GRID (3 columns desktop, 2 tablet, 1 mobile)              |
|  +------------------+ +------------------+ +------------------+   |
|  | BOBBY            | | COLTON           | | ELMO             |  |
|  | [WORKING]        | | [IDLE]           | | [WAITING]        |  |
|  | Fix /book form   | | Available for    | | Waiting for      |  |
|  | (2h active)      | | overflow         | | Bobby /book fix  |  |
|  |                  | |                  | |                  |  |
|  | Last: 3 Elmo     | | Last: sub-16px   | | Last: /ideas     |  |
|  | fixes (12b59a8)  | | fix shipped      | | PASS             |  |
|  |                  | |                  | |                  |  |
|  | [View Agent -&gt;]  | | [View Agent -&gt;]  | | [View Agent -&gt;]  |  |
|  +------------------+ +------------------+ +------------------+   |
|  +------------------+ +------------------+ +------------------+   |
|  | STEFFEN          | | JACOB            | | ELON             |  |
|  | [DONE]           | | [PAUSED]         | | [DONE]           |  |
|  | Creative Dir     | | Sending halted   | | Relay healthy    |  |
|  | (always on)      | | by Patrik        | | launchd fixed    |  |
|  | ...              | | ...              | | ...              |  |
|  +------------------+ +------------------+ +------------------+   |
|  (+ rows for Alex, Steve, Cleo, Tony, Paige, Pixel, Mom)        |
|                                                                    |
|  PIPELINE FEED (right side on wide screens, below on narrow)      |
|  +--------------------------------------------------------------+ |
|  | 2:10 PM  Bobby committed: fix form attrs (a3f21bc)            | |
|  | 1:45 PM  Elmo QA: /ideas PASS                                 | |
|  | 1:30 PM  Jacob: 80+ new leads researched                      | |
|  | 12:15 PM Bobby: /ideas password gate removed (134c8ca)        | |
|  | 11:00 AM Steffen: case study design spec shipped               | |
|  | ...                                                            | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  BLOCKERS (red section, only shows if blockers exist)             |
|  +--------------------------------------------------------------+ |
|  | Tony: Docker Desktop not installed (blocking Postiz)           | |
|  | /book form: Elmo FAIL x2, entire funnel dead-ends             | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
</code></pre>
<h3>Layout (Mobile)</h3>
<p>Throughput bar (sticky top) &gt; Agent cards (single column, scrollable) &gt; Pipeline Feed (below cards) &gt; Blockers (bottom, red background if any exist).</p>
<p>Agent cards on mobile: compact. Name + status + one-line current task. Tap to expand or tap &quot;View Agent&quot; to go to Individual View.</p>
<h3>Data for Each Section</h3>
<p><strong>Throughput Bar</strong></p>
<ul>
<li>WORKING count: Agents in active-missions.md Running table</li>
<li>IDLE count: Agents not in Running and not blocked</li>
<li>BLOCKED count: Agents with known blockers (parsed from current-priorities.md AGENTS STATUS table or active-missions.md notes)</li>
<li>DONE TODAY count: Entries in active-missions.md Recently Completed with today&#39;s date</li>
<li>COMMITS count: Total commits across all repos today</li>
</ul>
<p><strong>Agent Grid Cards</strong></p>
<ul>
<li>Status: Same logic as Individual View vitals</li>
<li>Current task: First line of mission from active-missions.md</li>
<li>Time active: Duration since launch timestamp</li>
<li>Last completion: Most recent entry from Recently Completed for this agent</li>
<li>Color coding: Green border = WORKING, Gray = IDLE, Red = BLOCKED, Blue = DONE, Yellow = WAITING, Orange = PAUSED</li>
</ul>
<p><strong>Pipeline Feed</strong></p>
<ul>
<li>Source: Merge of active-missions.md Recently Completed + git log across repos + latest-result.md updates</li>
<li>Sorted: Newest first</li>
<li>Shows: timestamp, agent name, what happened, commit hash if applicable</li>
<li>This is the &quot;what&#39;s getting accomplished right now&quot; answer</li>
</ul>
<p><strong>Blockers</strong></p>
<ul>
<li>Source: current-priorities.md (scan for BLOCKED, &quot;blocking&quot;, &quot;needs approval&quot;, &quot;waiting on Patrik&quot;)</li>
<li>Also: active-missions.md entries with blocker notes</li>
<li>Only renders if blockers exist. If nothing&#39;s blocked, this section is hidden. Clean.</li>
</ul>
<hr>
<h2>View Navigation</h2>
<p><strong>How you move between views:</strong></p>
<ul>
<li>Command View is the default landing page (the &quot;home&quot; of the dashboard)</li>
<li>Click any agent card in Command View to drill into their Individual View</li>
<li>Individual View has a persistent &quot;Back to Command View&quot; link (top left)</li>
<li>URL structure: <code>/dashboard</code> (command view), <code>/dashboard/agent/bobby</code> (individual view)</li>
<li>Browser back button works naturally</li>
<li>On mobile: swipe right from Individual View returns to Command View</li>
</ul>
<hr>
<h2>Data Sources: Where Status Comes From</h2>
<p>This is critical. The current dashboard lies about agent status (Paige teardown, issues #2 and #5). The new system uses a clear hierarchy of truth.</p>
<h3>Source Priority (highest to lowest)</h3>
<table>
<thead>
<tr>
<th>Priority</th>
<th>Source</th>
<th>What It Provides</th>
<th>Refresh Rate</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td><code>context/active-missions.md</code></td>
<td>Running/completed missions, launch times</td>
<td>Every 30s</td>
</tr>
<tr>
<td>2</td>
<td><code>context/current-priorities.md</code></td>
<td>Agent status table, blockers, pipeline status</td>
<td>Every 60s</td>
</tr>
<tr>
<td>3</td>
<td><code>projects/[agent]/latest-result.md</code></td>
<td>Last completed work, detailed output</td>
<td>Every 60s</td>
</tr>
<tr>
<td>4</td>
<td>Git log (AOM-EA + AMBITION repos)</td>
<td>Commits, file changes, timestamps</td>
<td>Every 60s</td>
</tr>
<tr>
<td>5</td>
<td><code>projects/[agent]/AGENT.md</code></td>
<td>Role description, session log history</td>
<td>Every 5m</td>
</tr>
<tr>
<td>6</td>
<td><code>punch-list.md</code></td>
<td>Task assignments, deadlines, owner</td>
<td>Every 5m</td>
</tr>
</tbody></table>
<h3>Status Derivation Logic</h3>
<pre><code>if agent in active-missions.md Running table:
    if blocker text present: status = BLOCKED
    else: status = WORKING

elif agent status in current-priorities.md == &quot;PAUSED&quot;:
    status = PAUSED

elif agent status in current-priorities.md == &quot;BLOCKED&quot;:
    status = BLOCKED

elif agent status in current-priorities.md contains &quot;WAITING&quot;:
    status = WAITING

elif agent in active-missions.md Recently Completed (today):
    status = DONE

else:
    status = IDLE
</code></pre>
<p>No more keyword guessing from AGENT.md last 600 characters. The sources are explicit and maintained by the system (Mom updates active-missions.md and current-priorities.md after every agent commit).</p>
<h3>Activity Log Data (Individual View)</h3>
<p>MVP approach (no infrastructure changes needed):</p>
<ol>
<li>Parse <code>projects/[agent]/latest-result.md</code> for timestamped entries</li>
<li>Parse <code>context/active-missions.md</code> for mission start/complete events</li>
<li>Parse git log for commits attributed to this agent</li>
<li>Merge all sources, sort by timestamp, display newest first</li>
</ol>
<p>Full version (Phase 2):</p>
<ul>
<li>Terminal output streaming via WebSocket</li>
<li>Requires a bridge service that watches Claude Code terminal output</li>
<li>Pipes stdout lines to Supabase real-time channel</li>
<li>Dashboard subscribes to channel for live updates</li>
</ul>
<hr>
<h2>Real-Time vs Polling</h2>
<table>
<thead>
<tr>
<th>Component</th>
<th>Strategy</th>
<th>Interval</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Agent status cards</td>
<td>Poll via GitHub API</td>
<td>30s</td>
<td>active-missions.md changes on every agent launch/complete</td>
</tr>
<tr>
<td>Pipeline feed</td>
<td>Poll + Supabase Realtime (Phase 2)</td>
<td>30s poll / instant realtime</td>
<td>Needs to feel alive</td>
</tr>
<tr>
<td>Individual activity log</td>
<td>Poll MVP / WebSocket Phase 2</td>
<td>15s poll / instant realtime</td>
<td>The &quot;watching someone work&quot; experience needs speed</td>
</tr>
<tr>
<td>Throughput bar</td>
<td>Computed from agent status</td>
<td>Recalc on every poll</td>
<td>Derived data, no separate fetch</td>
</tr>
<tr>
<td>Blockers section</td>
<td>Poll</td>
<td>60s</td>
<td>Blockers don&#39;t change every 15 seconds</td>
</tr>
<tr>
<td>Recent completions</td>
<td>Poll</td>
<td>60s</td>
<td>Historical data, less urgent</td>
</tr>
</tbody></table>
<h3>Phase 1 (MVP): GitHub API Polling</h3>
<ul>
<li>Fetch raw file content from GitHub API (already how the current dashboard works)</li>
<li>Parse markdown files client-side</li>
<li>30-second polling interval for primary data (active-missions.md, current-priorities.md)</li>
<li>60-second for secondary data (latest-result.md, AGENT.md files)</li>
<li>Stagger fetches to avoid rate limits (GitHub API: 5,000 requests/hour authenticated)</li>
<li>Cache aggressively. Only re-render sections where data actually changed.</li>
</ul>
<h3>Phase 2: Supabase Realtime</h3>
<ul>
<li>Agent status changes write to Supabase table (via post-commit hook or Mom)</li>
<li>Dashboard subscribes to Supabase Realtime channels</li>
<li>Instant updates when agents complete work, hit blockers, or start new missions</li>
<li>Eliminates polling latency entirely</li>
<li>Pipeline feed becomes a true live stream</li>
</ul>
<h3>Phase 3: Terminal Streaming</h3>
<ul>
<li>Bridge service captures Claude Code terminal output</li>
<li>Filters for meaningful events (file edits, commits, test runs, errors)</li>
<li>Pipes to Supabase Realtime channel per agent</li>
<li>Individual View activity log becomes truly real-time</li>
<li>This is the &quot;watching someone work&quot; experience at full fidelity</li>
</ul>
<hr>
<h2>Multi-Tenant: How This Becomes the Client Product</h2>
<h3>The Key Insight</h3>
<p>AOM&#39;s agents (Bobby, Steffen, Elmo, etc.) are our internal workforce. A client&#39;s &quot;agents&quot; are their AI automations: the email responder, the appointment scheduler, the invoice generator, the lead qualifier. Different names, same dashboard architecture.</p>
<h3>Tenant Model</h3>
<pre><code>AOM (admin tenant)
├── Agent: Bobby (web dev)
├── Agent: Jacob (outreach)
├── Agent: Elmo (QA)
├── ... (14 agents)
│
Client: &quot;Phoenix CPA Group&quot; (tenant)
├── Automation: Email Triage (sorts inbox, drafts replies)
├── Automation: Client Reminders (deadline + document requests)
├── Automation: Lead Response (responds to website inquiries in &lt; 1 min)
├── Automation: Invoice Follow-up (payment reminders at 30/60/90 days)
│
Client: &quot;Mesa Mechanical&quot; (tenant)
├── Automation: Bid Follow-up (tracks estimates, sends reminders)
├── Automation: Crew Scheduling (dispatch coordination)
├── Automation: Customer Updates (project status texts)
</code></pre>
<h3>What Changes Per Tenant</h3>
<table>
<thead>
<tr>
<th>Component</th>
<th>AOM Version</th>
<th>Client Version</th>
</tr>
</thead>
<tbody><tr>
<td>Agent/Automation names</td>
<td>Bobby, Steffen, Elmo...</td>
<td>Email Triage, Lead Response...</td>
</tr>
<tr>
<td>Agent icons</td>
<td>Internal agent avatars</td>
<td>Automation type icons (envelope, calendar, phone, etc.)</td>
</tr>
<tr>
<td>Data source</td>
<td>GitHub repos + markdown files</td>
<td>Supabase tables (per-tenant schema)</td>
</tr>
<tr>
<td>Activity log</td>
<td>Git commits + file parsing</td>
<td>Supabase event log (structured JSON)</td>
</tr>
<tr>
<td>Command View title</td>
<td>&quot;AOM MISSION CONTROL&quot;</td>
<td>&quot;[Company Name] AI Operations&quot;</td>
</tr>
<tr>
<td>Individual View</td>
<td>Deep technical detail</td>
<td>Simplified: what it did, how many, outcome</td>
</tr>
<tr>
<td>Throughput bar</td>
<td>Working/Idle/Blocked/Done/Commits</td>
<td>Active/Paused/Completed Today/Actions Taken</td>
</tr>
<tr>
<td>Blockers section</td>
<td>Technical blockers, approval needs</td>
<td>&quot;Needs your attention&quot; (plain English)</td>
</tr>
<tr>
<td>Pipeline feed</td>
<td>Raw agent output</td>
<td>Business outcomes (&quot;3 invoices sent&quot;, &quot;2 leads responded to&quot;)</td>
</tr>
<tr>
<td>Access</td>
<td>Password gate (Patrik only)</td>
<td>Supabase Auth (email + password, 2FA)</td>
</tr>
</tbody></table>
<h3>Database Schema (Supabase)</h3>
<pre><code class="language-sql">-- Tenant isolation
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  plan TEXT DEFAULT &#39;audit&#39;  -- audit | build | platform
);

-- Users belong to tenants
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  role TEXT DEFAULT &#39;owner&#39;,  -- owner | admin | viewer
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

-- Automations (the client&#39;s &quot;agents&quot;)
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- email | calendar | lead_response | invoice | custom
  status TEXT DEFAULT &#39;idle&#39;,  -- working | idle | blocked | paused | done
  current_task TEXT,
  config JSONB DEFAULT &#39;{}&#39;,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event log (the activity feed)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  automation_id UUID REFERENCES automations(id),
  event_type TEXT NOT NULL,  -- task_started | task_completed | error | action_taken
  description TEXT NOT NULL,
  metadata JSONB DEFAULT &#39;{}&#39;,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security: tenants only see their own data
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_automations ON automations
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_events ON events
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
</code></pre>
<h3>AOM Admin Panel (Phase 3)</h3>
<p>AOM needs a super-admin view that sees across ALL tenants:</p>
<ul>
<li>List all clients and their automation health</li>
<li>Push updates to all client dashboards (over-the-air updates)</li>
<li>See which automations are failing across the fleet</li>
<li>Revenue per tenant, churn signals, usage metrics</li>
<li>This is the &quot;Geek Squad dispatch center&quot; view</li>
</ul>
<hr>
<h2>Tech Stack</h2>
<table>
<thead>
<tr>
<th>Layer</th>
<th>Tool</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Frontend</td>
<td>Next.js (already in use on aheadofmarket.com)</td>
<td>No new framework. Bobby knows it.</td>
</tr>
<tr>
<td>Hosting</td>
<td>Vercel (already in use)</td>
<td>Decided. No change.</td>
</tr>
<tr>
<td>Database</td>
<td>Supabase (decided)</td>
<td>Postgres + Auth + Realtime + RLS. All-in-one for multi-tenant.</td>
</tr>
<tr>
<td>Auth</td>
<td>Supabase Auth</td>
<td>Email/password + 2FA. Free tier covers MVP.</td>
</tr>
<tr>
<td>Realtime</td>
<td>Supabase Realtime (Phase 2)</td>
<td>WebSocket subscriptions per tenant. Built into Supabase.</td>
</tr>
<tr>
<td>API</td>
<td>Next.js API routes + Supabase client</td>
<td>Server-side for GitHub fetches (AOM), client-side for Supabase (clients).</td>
</tr>
<tr>
<td>Styling</td>
<td>Tailwind (already in use)</td>
<td>AOM brand v4 tokens already defined.</td>
</tr>
<tr>
<td>Data (AOM internal)</td>
<td>GitHub API</td>
<td>Reads markdown files from AOM-EA and AMBITION repos. Existing pattern.</td>
</tr>
<tr>
<td>Data (client product)</td>
<td>Supabase tables</td>
<td>Structured data, not markdown. Faster, queryable, real-time capable.</td>
</tr>
<tr>
<td>Charts (if needed)</td>
<td>Recharts or native SVG</td>
<td>Lightweight. Throughput trends, daily completion charts. Phase 2+.</td>
</tr>
</tbody></table>
<h3>What&#39;s NOT in the stack</h3>
<ul>
<li>No separate backend server. Vercel serverless handles everything.</li>
<li>No Redis. Supabase handles caching and realtime.</li>
<li>No separate WebSocket server. Supabase Realtime covers it.</li>
<li>No Kubernetes. Single Vercel deployment. Multi-tenant via database isolation, not infra isolation.</li>
</ul>
<hr>
<h2>MVP vs Full Version</h2>
<h3>MVP (Ship in 1-2 weeks)</h3>
<p><strong>What ships:</strong></p>
<ol>
<li>Command View with all AOM agents as cards</li>
<li>Individual View for each agent (click to drill in)</li>
<li>Status derived from active-missions.md + current-priorities.md (no more keyword guessing)</li>
<li>Pipeline feed from active-missions.md Recently Completed + git log</li>
<li>Throughput bar (Working/Idle/Blocked/Done counts)</li>
<li>Blockers section (only renders when blockers exist)</li>
<li>Mobile-responsive (both views)</li>
<li>Replaces or sits alongside existing /dashboard</li>
</ol>
<p><strong>Data source:</strong> GitHub API polling only (30s/60s intervals). No Supabase yet.</p>
<p><strong>What it does NOT include:</strong></p>
<ul>
<li>Multi-tenant (AOM only)</li>
<li>Supabase database</li>
<li>Real-time WebSocket updates</li>
<li>Terminal streaming</li>
<li>Client-facing auth</li>
<li>Admin panel</li>
<li>Charts/trends</li>
</ul>
<p><strong>Why this is enough:</strong>
Patrik gets the command center he described. Bobby builds one thing, we validate the UX, then layer on multi-tenant. The MVP is also the demo: when Alex shows a prospect the dashboard, they&#39;re seeing the real thing running, not a mockup.</p>
<h3>Phase 2 (Weeks 3-4): Client-Ready</h3>
<ul>
<li>Supabase integration (database, auth, RLS)</li>
<li>First client tenant provisioned</li>
<li>Client-facing login (email + password)</li>
<li>Automations table replaces agent markdown parsing</li>
<li>Events table powers the activity feed</li>
<li>Supabase Realtime for instant updates</li>
<li>&quot;Good morning [Name]&quot; briefing card (Paige teardown, item #1)</li>
<li>Email triage section (connects to existing email-status infrastructure)</li>
<li>Onboarding flow for first-time users</li>
</ul>
<h3>Phase 3 (Month 2): Platform</h3>
<ul>
<li>AOM admin panel (cross-tenant view)</li>
<li>Over-the-air automation updates</li>
<li>Terminal streaming for AOM internal (real-time activity logs)</li>
<li>Trend charts (completions over time, response times, automation ROI)</li>
<li>Weekly auto-generated reports per tenant</li>
<li>Notification system (email alerts for blockers, daily digest)</li>
<li>SOC 2 audit trail (all events logged, immutable, timestamped)</li>
</ul>
<h3>Phase 4 (Month 3+): Scale</h3>
<ul>
<li>Self-service onboarding (prospect signs up, gets trial dashboard)</li>
<li>Stripe integration for billing</li>
<li>Automation marketplace (pre-built automations clients can enable)</li>
<li>API access for client integrations</li>
<li>White-label option for partners</li>
</ul>
<hr>
<h2>Design Direction (for Steffen + Bobby)</h2>
<p><strong>Overall aesthetic:</strong> Dark, professional, high-density but readable. Mission control, not a toy.</p>
<ul>
<li>Background: <code>bg-aom-night</code> (#0C0C0C) with subtle card elevation via border color</li>
<li>Cards: <code>bg-aom-charcoal</code> (#141412) with <code>border-aom-border</code> (#292524)</li>
<li>Status colors: Green (#22C55E) = working, Gray (#78716C) = idle, Red (#EF4444) = blocked, Blue (#3B82F6) = done, Yellow (#EAB308) = waiting, Orange (#F97316) = paused</li>
<li>Text: Minimum 16px body. Agent names 18px+. Throughput numbers 24px+. &quot;Old people can read em, young people love em.&quot;</li>
<li>Font: System SF/Helvetica stack. Mono (<code>font-mono</code>) for timestamps and commit hashes.</li>
<li>Transitions: Smooth status changes (fade between colors, not instant swap). Cards slide in on load. Pipeline feed items fade in at the top.</li>
<li>Mobile: Full-width cards, generous tap targets (48px minimum), no swipe-to-reveal hidden actions (Paige teardown, issue #17)</li>
</ul>
<p><strong>Command View density:</strong> Show as much as possible without scrolling on a 1440px screen. All 14 agents should be visible at once (3 columns x 5 rows). Pipeline feed and blockers visible without scrolling.</p>
<p><strong>Individual View scrolling:</strong> Current Mission + Vitals should be above the fold. Activity Log is the main scrollable area. Recent Completions and Active Files can be below the fold.</p>
<hr>
<h2>What Bobby Needs to Build MVP</h2>
<p>Concrete deliverables, in order:</p>
<ol>
<li><p><strong>Route setup.</strong> <code>/dashboard</code> renders Command View. <code>/dashboard/agent/[slug]</code> renders Individual View. Agent slugs: <code>bobby</code>, <code>colton</code>, <code>elmo</code>, <code>steffen</code>, <code>jacob</code>, <code>elon</code>, <code>alex</code>, <code>steve</code>, <code>cleo</code>, <code>tony</code>, <code>paige</code>, <code>pixel</code>, <code>mom</code>.</p>
</li>
<li><p><strong>Data fetching layer.</strong> Fetch <code>context/active-missions.md</code> and <code>context/current-priorities.md</code> from GitHub API. Parse the markdown tables into structured data. 30-second polling with stale-while-revalidate.</p>
</li>
<li><p><strong>Status derivation function.</strong> Implement the status logic from &quot;Status Derivation Logic&quot; section above. Returns status + current task + time active for each agent.</p>
</li>
<li><p><strong>Command View component.</strong> Throughput bar + Agent grid (cards) + Pipeline feed + Blockers section. Responsive: 3 cols desktop, 2 tablet, 1 mobile.</p>
</li>
<li><p><strong>Individual View component.</strong> Back navigation + Current Mission + Vitals + Recent Completions + Active Files + Activity Log. Responsive: single column mobile.</p>
</li>
<li><p><strong>Pipeline feed parser.</strong> Merge Recently Completed entries from active-missions.md with recent git log. Sort by time. Display as a scrollable feed.</p>
</li>
<li><p><strong>Polish.</strong> Status color coding, smooth transitions, loading states, empty states (&quot;No blockers right now&quot; with a clean icon, not a blank space).</p>
</li>
</ol>
<hr>
<h2>What Alex Needs to Sell This</h2>
<p>Key talking points for prospects:</p>
<ol>
<li><p><strong>&quot;See everything your AI is doing, in real time.&quot;</strong> The Individual View is the proof. Click into any automation, watch it work. No black box.</p>
</li>
<li><p><strong>&quot;Mission control for your business.&quot;</strong> The Command View. One screen, all your automations, all your statuses. Know in 5 seconds if everything&#39;s running or if something needs attention.</p>
</li>
<li><p><strong>&quot;We run the exact same system.&quot;</strong> This isn&#39;t a mockup. AOM&#39;s dashboard manages 14 AI agents doing real work right now. The client version is the same architecture.</p>
</li>
<li><p><strong>&quot;Your data stays yours.&quot;</strong> Supabase RLS, tenant isolation, SOC 2 roadmap. Every CPA prospect will ask about security. We have the answer (see Elon&#39;s security architecture doc).</p>
</li>
<li><p><strong>&quot;Over-the-air updates.&quot;</strong> When AOM improves an automation, every client gets the update automatically. Like Tesla pushing firmware to your car. You don&#39;t do anything.</p>
</li>
<li><p><strong>Demo flow:</strong> Open AOM&#39;s Command View (live, real agents working). Show Bobby currently building something. Click into Bobby, show the activity log. Say: &quot;This is what your dashboard looks like, but instead of Bobby the web dev, it&#39;s your Email Triage automation responding to client inquiries.&quot; Toggle to a mockup of the client version. Clean. Simple. Obvious value.</p>
</li>
</ol>
<hr>
<p><em>Spec complete. Bobby: build the MVP. Alex: sell the vision. Steffen: review the design direction and add any brand refinements before Bobby starts.</em></p>
`,c={title:t,slug:e,category:n,agent:i,date:o,dateFormatted:a,updated:null,summary:s,tags:l,content:r};export{i as agent,n as category,r as content,o as date,a as dateFormatted,c as default,e as slug,s as summary,l as tags,t as title,d as updated};
