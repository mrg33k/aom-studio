const t="Dashboard MVP Implementation Brief",e="dashboard-mvp-brief",n="Technical",o="Steve",i="2026-03-12",s="Mar 12",d=null,a="Bobby's implementation brief for the dashboard MVP build.",r=[],l=`<h1>Dashboard MVP: Bobby Implementation Brief</h1>
<p><strong>Date:</strong> 2026-03-12
<strong>Author:</strong> Steve (AI Advisory Lead)
<strong>Source spec:</strong> projects/steve/dashboard-dual-view-spec.md
<strong>For:</strong> Bobby. Build-ready. No interpretation needed.
<strong>Scope:</strong> Phase 1 MVP only. AOM internal. GitHub polling. No Supabase.</p>
<hr>
<h2>What You&#39;re Building</h2>
<p>Two new pages that replace the existing /dashboard. A Command View (all agents at once) and an Individual Agent View (drill into one agent). Data comes from GitHub API polling of markdown files in the AOM-EA repo. This is not a redesign of the current dashboard. It is a replacement.</p>
<p>When it ships, this becomes the live demo for prospects. A CPA watching this should think: &quot;I want that for my business.&quot;</p>
<hr>
<h2>Pages + URLs</h2>
<table>
<thead>
<tr>
<th>URL</th>
<th>View</th>
<th>Purpose</th>
</tr>
</thead>
<tbody><tr>
<td><code>/dashboard</code></td>
<td>Command View</td>
<td>All 14 agents visible. Throughput bar, agent grid, pipeline feed, blockers. The home screen.</td>
</tr>
<tr>
<td><code>/dashboard/agent/[slug]</code></td>
<td>Individual Agent View</td>
<td>Drill into one agent. Current mission, vitals, activity log, recent completions, active files.</td>
</tr>
</tbody></table>
<h3>Agent Slugs (14 total)</h3>
<p><code>bobby</code>, <code>colton</code>, <code>elmo</code>, <code>steffen</code>, <code>jacob</code>, <code>elon</code>, <code>alex</code>, <code>steve</code>, <code>cleo</code>, <code>tony</code>, <code>paige</code>, <code>pixel</code>, <code>mom</code>, <code>sys</code></p>
<p>Note: <code>sys</code> is Elon&#39;s project folder (<code>projects/sys/</code>). The display name is &quot;Elon&quot; but the slug matches the folder.</p>
<hr>
<h2>Component Breakdown</h2>
<h3>Command View (<code>/dashboard</code>)</h3>
<p><strong>1. Header Bar</strong></p>
<ul>
<li>Title: &quot;AOM MISSION CONTROL&quot;</li>
<li>Right side: Current date/time in AZ timezone, auto-updating every minute</li>
<li>Font: Inter Tight, 900 Black, uppercase</li>
</ul>
<p><strong>2. Throughput Bar</strong> (sticky below header on scroll)</p>
<ul>
<li>5 metrics in a horizontal row:<ul>
<li>WORKING count (green)</li>
<li>IDLE count (gray)</li>
<li>BLOCKED count (red)</li>
<li>DONE TODAY count (blue)</li>
<li>COMMITS TODAY count (white)</li>
</ul>
</li>
<li>Each metric: number in Inter Tight 900 Black Italic 24px+, label below in JetBrains Mono 9-11px uppercase</li>
<li>Background: <code>bg-aom-charcoal</code> with <code>border-b border-aom-border</code></li>
<li>Computed client-side from agent status data (no separate fetch)</li>
</ul>
<p><strong>3. Agent Grid</strong></p>
<ul>
<li>3 columns desktop (1440px+), 2 columns tablet (768-1439px), 1 column mobile (&lt;768px)</li>
<li>Each card:<ul>
<li>Agent name (18px+, Inter Tight 700 Bold)</li>
<li>Status pill with color: GREEN = WORKING, GRAY = IDLE, RED = BLOCKED, BLUE = DONE, YELLOW = WAITING, ORANGE = PAUSED</li>
<li>One-line current task description (truncate with ellipsis if over 2 lines)</li>
<li>Time active (e.g., &quot;2h active&quot;) or last completion if idle</li>
<li>&quot;View Agent&quot; link at bottom right (navigates to <code>/dashboard/agent/[slug]</code>)</li>
</ul>
</li>
<li>Card styling: <code>bg-aom-charcoal border border-aom-border p-6 rounded-sm</code></li>
<li>Left border color matches status (4px solid left border)</li>
<li>Hover: <code>hover:border-aom-orange/30 transition-colors duration-300</code></li>
<li>All 14 agents visible without scrolling on 1440px (3 cols x 5 rows fits)</li>
</ul>
<p><strong>4. Pipeline Feed</strong> (right side on screens 1440px+, below grid on narrower)</p>
<ul>
<li>Vertical timeline of recent events, newest first</li>
<li>Each entry: timestamp (JetBrains Mono, muted stone) + agent name (bold) + description + commit hash (mono, linked to GitHub)</li>
<li>Max 20 entries visible, scrollable</li>
<li>Source: merged from Recently Completed table + git log</li>
<li>On wide screens: fixed-width right column (350px), agent grid takes remaining space</li>
</ul>
<p><strong>5. Blockers Section</strong> (below grid, only renders if blockers exist)</p>
<ul>
<li>Red left border accent</li>
<li>Each blocker: agent name + description + how long it&#39;s been blocked</li>
<li>Hidden entirely when no blockers. No empty state needed for this section.</li>
</ul>
<h3>Individual Agent View (<code>/dashboard/agent/[slug]</code>)</h3>
<p><strong>1. Navigation</strong></p>
<ul>
<li>Top left: &quot;&lt; Back to Command View&quot; (links to <code>/dashboard</code>)</li>
<li>Top center: Agent name + role description</li>
<li>Top right: Status pill (same colors as Command View)</li>
</ul>
<p><strong>2. Current Mission Card</strong> (above the fold)</p>
<ul>
<li>Source: <code>context/active-missions.md</code> Running table</li>
<li>Shows: mission description, when it started, source file reference</li>
<li>If no active mission: &quot;No active mission&quot; in muted text</li>
<li>Card styling: <code>bg-aom-charcoal border border-aom-border p-8 rounded-sm</code></li>
</ul>
<p><strong>3. Vitals Card</strong> (above the fold, next to Current Mission on desktop)</p>
<ul>
<li>Status: derived from status logic</li>
<li>Since: launch timestamp from active-missions.md</li>
<li>Files touched today: count from git log</li>
<li>Commits today: count from git log</li>
<li>Compact grid layout: 2x2 on desktop, 2x2 on mobile</li>
</ul>
<p><strong>4. Activity Log</strong> (main scrollable area)</p>
<ul>
<li>Timestamped entries, newest first</li>
<li>Sources merged: latest-result.md content, active-missions.md events, git commits</li>
<li>Each entry: time (JetBrains Mono) + description</li>
<li>Commit entries link to GitHub commit URL</li>
<li>Auto-scrolls to top when new entry appears</li>
<li>This is the longest section. It IS the scroll area.</li>
</ul>
<p><strong>5. Recent Completions</strong> (below fold)</p>
<ul>
<li>Source: active-missions.md Recently Completed, filtered to this agent, last 7 days</li>
<li>Each entry: date, description, commit hash (linked)</li>
<li>If empty: &quot;No completions in the last 7 days&quot;</li>
</ul>
<p><strong>6. Active Files</strong> (below fold, collapsed by default on mobile)</p>
<ul>
<li>Source: latest git commit file list for this agent</li>
<li>Each entry: file path + time since modification</li>
<li>Tap/click to expand on mobile</li>
</ul>
<h3>Mobile Layout (both views)</h3>
<ul>
<li>Single column everything</li>
<li>Command View: Throughput bar (sticky) &gt; Agent cards (scrollable) &gt; Pipeline Feed &gt; Blockers</li>
<li>Individual View: Vitals (sticky) &gt; Current Mission &gt; Activity Log (scrollable) &gt; Recent Completions &gt; Active Files (collapsed)</li>
<li>Tap targets minimum 48px</li>
<li>No swipe gestures for navigation. Use explicit buttons/links.</li>
</ul>
<hr>
<h2>Data Sources + Fetching</h2>
<h3>GitHub API Files to Fetch</h3>
<p>All from repo <code>mrg33k/AOM-EA</code>, branch <code>master</code>.</p>
<table>
<thead>
<tr>
<th>File</th>
<th>What It Provides</th>
<th>Poll Interval</th>
</tr>
</thead>
<tbody><tr>
<td><code>context/active-missions.md</code></td>
<td>Running missions, completed missions, launch times</td>
<td>30s</td>
</tr>
<tr>
<td><code>context/current-priorities.md</code></td>
<td>Agent status table, blockers, pipeline status</td>
<td>60s</td>
</tr>
<tr>
<td><code>projects/[agent]/latest-result.md</code></td>
<td>Last work output, timestamps</td>
<td>60s (per agent, only on Individual View)</td>
</tr>
<tr>
<td><code>projects/[agent]/AGENT.md</code></td>
<td>Role, session log</td>
<td>5 min (only on Individual View)</td>
</tr>
<tr>
<td><code>punch-list.md</code></td>
<td>Task assignments, deadlines</td>
<td>5 min</td>
</tr>
</tbody></table>
<h3>How to Fetch</h3>
<p>Use the existing GitHub API pattern from the current dashboard:</p>
<pre><code>GET https://api.github.com/repos/mrg33k/AOM-EA/contents/{path}
Headers: Authorization: token {GITHUB_TOKEN}
Response: base64-encoded content in \`content\` field
</code></pre>
<p>The <code>GITHUB_TOKEN</code> is already in Vercel environment variables (the current dashboard uses it).</p>
<h3>Polling Strategy</h3>
<ul>
<li>Use <code>setInterval</code> with stale-while-revalidate pattern</li>
<li>Show cached data immediately, fetch in background, re-render only if data changed</li>
<li>Compare raw content string before parsing (avoid re-renders on identical data)</li>
<li>Stagger fetches: don&#39;t fire all requests at the same second<ul>
<li>t+0s: active-missions.md</li>
<li>t+10s: current-priorities.md</li>
<li>t+20s: git log (if on Individual View)</li>
<li>t+30s: cycle restarts</li>
</ul>
</li>
<li>GitHub API rate limit: 5,000 requests/hour authenticated. At 30s intervals with ~5 files, that&#39;s ~600 requests/hour. Well within limits.</li>
</ul>
<h3>Git Log for Commits</h3>
<p>For commit data (today&#39;s commits, file changes), use:</p>
<pre><code>GET https://api.github.com/repos/mrg33k/AOM-EA/commits?since={todayISO}&amp;per_page=50
GET https://api.github.com/repos/mrg33k/AMBITION/commits?since={todayISO}&amp;per_page=50
</code></pre>
<p>Parse commit messages to attribute to agents. Agent attribution: check if commit message contains agent name (case-insensitive) or if the commit message starts with the agent name followed by a colon (e.g., &quot;Bobby: fixed form&quot;).</p>
<hr>
<h2>Status Derivation Logic</h2>
<p>This replaces the broken <code>inferAgentStatus()</code> function. Implement exactly as written.</p>
<pre><code class="language-typescript">function deriveAgentStatus(
  agentName: string,
  activeMissions: ParsedMissions,
  currentPriorities: ParsedPriorities
): AgentStatus {
  // 1. Check active-missions.md Running table
  const running = activeMissions.running.find(m =&gt;
    m.agent.toLowerCase() === agentName.toLowerCase()
  );

  if (running) {
    if (running.status.toLowerCase().includes(&#39;block&#39;)) return &#39;BLOCKED&#39;;
    return &#39;WORKING&#39;;
  }

  // 2. Check current-priorities.md AGENTS STATUS table
  const priorityStatus = currentPriorities.agentTable.find(a =&gt;
    a.agent.toLowerCase() === agentName.toLowerCase()
  );

  if (priorityStatus) {
    const s = priorityStatus.status.toUpperCase();
    if (s.includes(&#39;PAUSED&#39;)) return &#39;PAUSED&#39;;
    if (s.includes(&#39;BLOCKED&#39;)) return &#39;BLOCKED&#39;;
    if (s.includes(&#39;WAITING&#39;)) return &#39;WAITING&#39;;
    if (s.includes(&#39;DONE&#39;)) return &#39;DONE&#39;;
    if (s.includes(&#39;ACTIVE&#39;)) return &#39;WORKING&#39;;
    if (s.includes(&#39;IDLE&#39;)) return &#39;IDLE&#39;;
  }

  // 3. Check if completed something today
  const completedToday = activeMissions.recentlyCompleted.find(m =&gt;
    m.agent.toLowerCase() === agentName.toLowerCase() &amp;&amp;
    isToday(m.completed)
  );

  if (completedToday) return &#39;DONE&#39;;

  // 4. Default
  return &#39;IDLE&#39;;
}
</code></pre>
<h3>Status Colors</h3>
<table>
<thead>
<tr>
<th>Status</th>
<th>Pill BG</th>
<th>Left Border</th>
<th>Hex</th>
</tr>
</thead>
<tbody><tr>
<td>WORKING</td>
<td>green-500/20</td>
<td>green-500</td>
<td>#22C55E</td>
</tr>
<tr>
<td>IDLE</td>
<td>stone-500/20</td>
<td>stone-500</td>
<td>#78716C</td>
</tr>
<tr>
<td>BLOCKED</td>
<td>red-500/20</td>
<td>red-500</td>
<td>#EF4444</td>
</tr>
<tr>
<td>DONE</td>
<td>blue-500/20</td>
<td>blue-500</td>
<td>#3B82F6</td>
</tr>
<tr>
<td>WAITING</td>
<td>yellow-500/20</td>
<td>yellow-500</td>
<td>#EAB308</td>
</tr>
<tr>
<td>PAUSED</td>
<td>orange-500/20</td>
<td>orange-500</td>
<td>#F97316</td>
</tr>
</tbody></table>
<hr>
<h2>Markdown Parsing</h2>
<p>You need parsers for two markdown files. Both use pipe-delimited tables.</p>
<h3>active-missions.md Parser</h3>
<p>The file has two tables:</p>
<ol>
<li><strong>Running table</strong> (under <code>## Running</code>): columns Agent, Mission, Launched, Status</li>
<li><strong>Recently Completed table</strong> (under <code>## Recently Completed</code>): columns Agent, Mission, Launched, Completed, Result</li>
</ol>
<p>Parse each table row into structured objects. Skip the header row and the <code>|---|</code> separator row. Handle the &quot;(none)&quot; placeholder row in the Running table (treat as empty).</p>
<pre><code class="language-typescript">interface RunningMission {
  agent: string;
  mission: string;
  launched: string;
  status: string;
}

interface CompletedMission {
  agent: string;
  mission: string;
  launched: string;
  completed: string;
  result: string;
}
</code></pre>
<h3>current-priorities.md Parser</h3>
<p>Parse the <code>## AGENTS -- STATUS</code> table. Columns: Agent, Status, What&#39;s Next.</p>
<p>Also scan for blockers: lines containing &quot;BLOCKED&quot;, &quot;blocking&quot;, &quot;needs approval&quot;, &quot;waiting on Patrik&quot; anywhere in the file. Each match becomes a blocker entry with the surrounding context.</p>
<pre><code class="language-typescript">interface AgentPriority {
  agent: string;
  status: string;
  whatsNext: string;
}

interface Blocker {
  description: string;
  source: string; // which section it was found in
}
</code></pre>
<hr>
<h2>Agent Metadata (Hardcoded)</h2>
<p>These don&#39;t change often. Hardcode in a config file.</p>
<pre><code class="language-typescript">const AGENTS = [
  { slug: &#39;bobby&#39;, name: &#39;Bobby&#39;, role: &#39;Web Dev&#39;, folder: &#39;bobby&#39; },
  { slug: &#39;colton&#39;, name: &#39;Colton&#39;, role: &#39;Backup Builder&#39;, folder: &#39;colton&#39; },
  { slug: &#39;elmo&#39;, name: &#39;Elmo&#39;, role: &#39;QA Gate&#39;, folder: null }, // no project folder, uses skill
  { slug: &#39;steffen&#39;, name: &#39;Steffen&#39;, role: &#39;Creative Director&#39;, folder: &#39;steffen&#39; },
  { slug: &#39;jacob&#39;, name: &#39;Jacob&#39;, role: &#39;Outreach&#39;, folder: &#39;jacob&#39; },
  { slug: &#39;elon&#39;, name: &#39;Elon&#39;, role: &#39;Systems&#39;, folder: &#39;sys&#39; },
  { slug: &#39;alex&#39;, name: &#39;Alex&#39;, role: &#39;Strategy&#39;, folder: &#39;aom-strategy&#39; },
  { slug: &#39;steve&#39;, name: &#39;Steve&#39;, role: &#39;AI Advisory&#39;, folder: &#39;steve&#39; },
  { slug: &#39;cleo&#39;, name: &#39;Cleo&#39;, role: &#39;Content&#39;, folder: &#39;content-agent&#39; },
  { slug: &#39;tony&#39;, name: &#39;Tony&#39;, role: &#39;Social Media&#39;, folder: &#39;tony&#39; },
  { slug: &#39;paige&#39;, name: &#39;Paige&#39;, role: &#39;Client Success&#39;, folder: &#39;paige&#39; },
  { slug: &#39;pixel&#39;, name: &#39;Pixel&#39;, role: &#39;Extension&#39;, folder: &#39;pixel&#39; },
  { slug: &#39;mom&#39;, name: &#39;Mom&#39;, role: &#39;Orchestrator&#39;, folder: &#39;mom&#39; },
  { slug: &#39;sys&#39;, name: &#39;Elon (Sys)&#39;, role: &#39;Infrastructure&#39;, folder: &#39;sys&#39; },
] as const;
</code></pre>
<p>Note: Elon appears twice (as <code>elon</code> and <code>sys</code>). Collapse to one entry. Use slug <code>elon</code>, folder <code>sys</code>. 13 agents total after dedup.</p>
<hr>
<h2>API Routes (Next.js)</h2>
<p>Keep GitHub API calls server-side to protect the token. Three API routes:</p>
<h3><code>GET /api/dashboard/status</code></h3>
<p>Fetches and parses <code>context/active-missions.md</code> + <code>context/current-priorities.md</code>. Returns:</p>
<pre><code class="language-json">{
  &quot;agents&quot;: [
    {
      &quot;slug&quot;: &quot;bobby&quot;,
      &quot;name&quot;: &quot;Bobby&quot;,
      &quot;role&quot;: &quot;Web Dev&quot;,
      &quot;status&quot;: &quot;WORKING&quot;,
      &quot;currentTask&quot;: &quot;Building ROI calculator page&quot;,
      &quot;timeActive&quot;: &quot;2h&quot;,
      &quot;lastCompletion&quot;: {
        &quot;date&quot;: &quot;2026-03-12&quot;,
        &quot;description&quot;: &quot;Pipeline page + /book fix + Steffen 5 fixes + /ideas&quot;,
        &quot;commitHash&quot;: &quot;7d27821&quot;
      }
    }
  ],
  &quot;throughput&quot;: {
    &quot;working&quot;: 5,
    &quot;idle&quot;: 3,
    &quot;blocked&quot;: 1,
    &quot;doneToday&quot;: 4,
    &quot;commitsToday&quot;: 7
  },
  &quot;blockers&quot;: [
    {
      &quot;agent&quot;: &quot;Tony&quot;,
      &quot;description&quot;: &quot;Docker Desktop not installed (blocking Postiz)&quot;,
      &quot;source&quot;: &quot;current-priorities.md&quot;
    }
  ],
  &quot;pipelineFeed&quot;: [
    {
      &quot;time&quot;: &quot;2026-03-12T14:10:00&quot;,
      &quot;agent&quot;: &quot;Bobby&quot;,
      &quot;description&quot;: &quot;committed: fix form attrs&quot;,
      &quot;commitHash&quot;: &quot;a3f21bc&quot;,
      &quot;commitUrl&quot;: &quot;https://github.com/mrg33k/AOM-EA/commit/a3f21bc&quot;
    }
  ],
  &quot;lastUpdated&quot;: &quot;2026-03-12T14:15:00-07:00&quot;
}
</code></pre>
<p>This is the only fetch the Command View needs. One request, all data.</p>
<h3><code>GET /api/dashboard/agent/[slug]</code></h3>
<p>Fetches everything for one agent: active-missions entries, latest-result.md, AGENT.md session log, recent git commits. Returns:</p>
<pre><code class="language-json">{
  &quot;agent&quot;: {
    &quot;slug&quot;: &quot;bobby&quot;,
    &quot;name&quot;: &quot;Bobby&quot;,
    &quot;role&quot;: &quot;Web Dev&quot;,
    &quot;status&quot;: &quot;WORKING&quot;,
    &quot;currentMission&quot;: {
      &quot;description&quot;: &quot;Building ROI calculator page&quot;,
      &quot;launched&quot;: &quot;2026-03-12 10:00&quot;,
      &quot;source&quot;: &quot;active-missions.md&quot;
    },
    &quot;vitals&quot;: {
      &quot;status&quot;: &quot;WORKING&quot;,
      &quot;since&quot;: &quot;10:00 AM&quot;,
      &quot;filesTouchedToday&quot;: 4,
      &quot;commitsToday&quot;: 2
    },
    &quot;activityLog&quot;: [
      {
        &quot;time&quot;: &quot;2026-03-12T12:47:00&quot;,
        &quot;description&quot;: &quot;Committed: fix form name attributes (a3f21bc)&quot;,
        &quot;type&quot;: &quot;commit&quot;
      }
    ],
    &quot;recentCompletions&quot;: [
      {
        &quot;date&quot;: &quot;2026-03-12&quot;,
        &quot;description&quot;: &quot;Pipeline page + /book fix + Steffen 5 fixes + /ideas&quot;,
        &quot;result&quot;: &quot;SHIPPED. Commits 7d27821, 63ea6fa, 12b59a8, 134c8ca, 3512dc7.&quot;
      }
    ],
    &quot;activeFiles&quot;: [
      {
        &quot;path&quot;: &quot;src/app/book/page.tsx&quot;,
        &quot;lastModified&quot;: &quot;3m ago&quot;
      }
    ]
  },
  &quot;lastUpdated&quot;: &quot;2026-03-12T14:15:00-07:00&quot;
}
</code></pre>
<h3><code>GET /api/dashboard/commits</code></h3>
<p>Fetches recent commits from both <code>mrg33k/AOM-EA</code> and <code>mrg33k/AMBITION</code> repos. Merges, sorts by date, returns last 50. Used by both views for pipeline feed and agent commit counts.</p>
<pre><code class="language-json">{
  &quot;commits&quot;: [
    {
      &quot;sha&quot;: &quot;a3f21bc&quot;,
      &quot;message&quot;: &quot;Bobby: fix form name attributes&quot;,
      &quot;repo&quot;: &quot;AOM-EA&quot;,
      &quot;date&quot;: &quot;2026-03-12T12:47:00Z&quot;,
      &quot;url&quot;: &quot;https://github.com/mrg33k/AOM-EA/commit/a3f21bc&quot;,
      &quot;agent&quot;: &quot;bobby&quot;
    }
  ]
}
</code></pre>
<p>Agent attribution from commit message: check if message starts with an agent name (case-insensitive) followed by colon or space. Fallback: search entire message for agent name.</p>
<hr>
<h2>Deployment</h2>
<p><strong>Same Vercel project.</strong> This deploys to <code>aheadofmarket.com/dashboard</code> and <code>aheadofmarket.com/dashboard/agent/[slug]</code>. It lives in the <code>aom-studio</code> repo alongside everything else Bobby builds.</p>
<p>No separate project. No separate domain. The dashboard IS the product, and it lives on the product website.</p>
<p><strong>Environment variables needed (already in Vercel):</strong></p>
<ul>
<li><code>GITHUB_TOKEN</code> (already used by current dashboard)</li>
</ul>
<p>No new env vars for MVP.</p>
<hr>
<h2>Auth</h2>
<p><strong>MVP: Same password gate as current dashboard.</strong> The existing password mechanism stays. This is AOM-internal for now.</p>
<p><strong>For demo purposes:</strong> When showing a prospect, Patrik enters the password himself. The prospect sees a live system with real data. That&#39;s the pitch.</p>
<p><strong>Phase 2 will add:</strong> Supabase Auth with email/password + 2FA for client tenants. That&#39;s not this build.</p>
<hr>
<h2>What Gets Replaced</h2>
<p>The current <code>/dashboard</code> page and its components get replaced entirely. The new Command View is the new <code>/dashboard</code>. Do not try to merge with the existing dashboard code. It has known issues (Paige teardown documented 17+ problems). Build fresh.</p>
<p>Keep the existing dashboard code in the repo until the new version is confirmed working. Don&#39;t delete it; just route <code>/dashboard</code> to the new Command View.</p>
<hr>
<h2>File Structure (Suggested)</h2>
<pre><code>src/
  app/
    dashboard/
      page.tsx                    # Command View
      layout.tsx                  # Shared dashboard layout (header, background)
      agent/
        [slug]/
          page.tsx                # Individual Agent View
  components/
    dashboard/
      ThroughputBar.tsx           # 5-metric summary bar
      AgentCard.tsx               # Single agent card for grid
      AgentGrid.tsx               # Grid layout wrapper
      PipelineFeed.tsx            # Timeline of recent events
      BlockersSection.tsx         # Red-bordered blocker list
      AgentVitals.tsx             # Status/since/files/commits
      CurrentMission.tsx          # Mission description card
      ActivityLog.tsx             # Timestamped event list
      RecentCompletions.tsx       # Last 7 days completed work
      ActiveFiles.tsx             # Files recently touched
      StatusPill.tsx              # Reusable status indicator
  lib/
    dashboard/
      types.ts                    # TypeScript interfaces
      agents.ts                   # Agent metadata config
      parsers.ts                  # Markdown table parsers
      status.ts                   # Status derivation logic
      api.ts                      # Client-side fetch hooks
  api/
    dashboard/
      status/
        route.ts                  # GET /api/dashboard/status
      agent/
        [slug]/
          route.ts                # GET /api/dashboard/agent/[slug]
      commits/
        route.ts                  # GET /api/dashboard/commits
</code></pre>
<hr>
<h2>Loading + Empty States</h2>
<ul>
<li><strong>Loading:</strong> Skeleton cards with pulse animation. Same card dimensions, gray shimmer. No spinner.</li>
<li><strong>Empty agent grid:</strong> Never happens (agents are hardcoded).</li>
<li><strong>No active mission:</strong> &quot;Standing by&quot; in muted text with a subtle dot animation.</li>
<li><strong>No blockers:</strong> Section hidden entirely. Clean.</li>
<li><strong>No completions:</strong> &quot;No completions in the last 7 days&quot; in muted text.</li>
<li><strong>Pipeline feed empty:</strong> &quot;Waiting for activity...&quot; in muted text.</li>
<li><strong>API error:</strong> Show last cached data with a subtle &quot;Last updated X ago&quot; warning. Don&#39;t blow up the whole page.</li>
</ul>
<hr>
<h2>Animations</h2>
<ul>
<li>Status color transitions: <code>transition-colors duration-500</code> (smooth, not instant)</li>
<li>New pipeline feed entries: fade in from top (<code>animate-fadeIn</code>)</li>
<li>Page load: cards stagger in from bottom (50ms delay per card)</li>
<li>Individual View entry: slide in from right</li>
<li>Numbers in throughput bar: count up animation on first load (0 to N over 300ms)</li>
</ul>
<hr>
<h2>Sales Demo Consideration</h2>
<p>This MVP doubles as the sales demo. Keep these in mind:</p>
<ol>
<li>The Command View should look impressive at first glance. 14 agents with real statuses, real activity, real commits. This is not a mockup.</li>
<li>The Pipeline Feed is the &quot;proof of life.&quot; Prospects see real work getting done in real time. Timestamps matter.</li>
<li>Blockers section shows transparency. AOM isn&#39;t hiding problems. That builds trust.</li>
<li>When showing a prospect: &quot;This is what your dashboard looks like, but instead of Bobby the web dev, it&#39;s your Email Triage automation responding to client inquiries.&quot;</li>
<li>The dark theme with green/red status indicators reads as &quot;mission control.&quot; That&#39;s intentional. Business owners want to feel like they have a command center.</li>
</ol>
<hr>
<h2>Build Priority</h2>
<p>Bobby should build in this order:</p>
<ol>
<li>API routes (status + commits). Get data flowing first.</li>
<li>Markdown parsers + status derivation. Core logic.</li>
<li>Command View with agent grid (static data, then polling).</li>
<li>Throughput bar + pipeline feed.</li>
<li>Individual Agent View (route + data).</li>
<li>Blockers section.</li>
<li>Mobile responsive pass.</li>
<li>Animations + polish.</li>
<li>Loading/empty states.</li>
<li>Elmo QA.</li>
</ol>
<p>Estimated time: 1-2 days if Bobby focuses. This is the #1 build priority after ROI calculator.</p>
<hr>
<p><em>Brief complete. Bobby: build it. Steffen: review the design direction in the dual-view spec and flag anything before Bobby starts. Elmo: QA when Bobby ships.</em></p>
`,u={title:t,slug:e,category:n,agent:o,date:i,dateFormatted:s,updated:null,summary:a,tags:r,content:l};export{o as agent,n as category,l as content,i as date,s as dateFormatted,u as default,e as slug,a as summary,r as tags,t as title,d as updated};
