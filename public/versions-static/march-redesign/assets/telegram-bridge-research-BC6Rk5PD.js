const e="Telegram Bridge Research",t="telegram-bridge-research",n="Technical",o="Elon",s="2026-03-09",i="Mar 9",d=null,l="Research on bridging Telegram to Claude Code for full agent access from mobile.",a=[],r=`<h1>Telegram Bridge Research</h1>
<blockquote>
<p>The goal: Patrik sends a Telegram message from his phone on set. The system receives it, has full AOM context, can launch agents, edit files, check email, update the punch list, and responds back via Telegram. Same brain, different interface.</p>
</blockquote>
<p><strong>Date:</strong> 2026-03-09
<strong>Agent:</strong> Elon (System)
<strong>Status:</strong> Research complete. Ready to build.</p>
<hr>
<h2>What&#39;s Been Tried Already</h2>
<p>A basic Telegram bot already exists at <code>projects/telegram-bot/bot.py</code>. It was built on 2026-03-08, activated 2026-03-09.</p>
<p><strong>What it does:</strong></p>
<ul>
<li>Receives messages via python-telegram-bot (polling)</li>
<li>Calls the Anthropic API directly (Claude Sonnet) with tool use</li>
<li>Has 4 custom tools: read_file, write_file, run_bash, list_files</li>
<li>Loads context files (me.md, work.md, team.md, priorities, goals, HANDOFF.md) into the system prompt</li>
<li>Keeps a rolling conversation history (last 40 messages)</li>
<li>Locked to Patrik&#39;s user ID (set via TELEGRAM_ALLOWED_USER_ID env var)</li>
</ul>
<p><strong>What it can&#39;t do:</strong></p>
<ul>
<li>No Claude Code tools (Edit, Grep, Glob, Task, WebSearch, etc.)</li>
<li>No MCP server access (no calendar, no future integrations)</li>
<li>No session persistence across restarts</li>
<li>No agent launching capability</li>
<li>No skills</li>
<li>No CLAUDE.md awareness (standing rules, auto-sync, wash hands)</li>
<li>No streaming (waits for full response)</li>
<li>No auto-restart if it crashes</li>
<li>Conversation history is in-memory only (lost on restart)</li>
</ul>
<p><strong>Why it&#39;s &quot;sad&quot;:</strong>
It&#39;s a Claude API wrapper with file access. Not the same brain. It doesn&#39;t know about agents, can&#39;t run Mom, can&#39;t check the dashboard, can&#39;t launch Bobby. It&#39;s a smart chatbot, not the executive assistant.</p>
<hr>
<h2>Architecture Options</h2>
<h3>Option A: Telegram Bot with Anthropic API (Current Approach)</h3>
<p><strong>How it works:</strong> Python bot receives Telegram messages, calls Claude API with system prompt + context files, executes tool calls locally, sends response back.</p>
<p><strong>Pros:</strong></p>
<ul>
<li>Already built and running</li>
<li>Low latency (direct API call)</li>
<li>Full control over system prompt and tools</li>
<li>Can define unlimited custom tools</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
<li>Completely separate from Claude Code. Different brain, different tools, different capabilities.</li>
<li>Every tool must be manually implemented (read, write, bash are done; but no Grep, Glob, Edit, Task, WebSearch, etc.)</li>
<li>No MCP server access (calendar, email, etc.) unless you build MCP client support yourself</li>
<li>No CLAUDE.md loading, no standing rules, no auto-sync behavior</li>
<li>No skills system</li>
<li>No subagent launching</li>
<li>Adding features means rewriting what Claude Code already does</li>
<li>Cost: ~$3 input / $15 output per million tokens (Sonnet). A typical conversation with context loading costs $0.05-0.30.</li>
</ul>
<p><strong>Verdict:</strong> Dead end for the full vision. Fine as a quick &quot;ask Claude something&quot; tool, but will never match what Claude Code can do.</p>
<hr>
<h3>Option B: Telegram Bot invoking Claude Code CLI (<code>claude -p</code>)</h3>
<p><strong>How it works:</strong> Telegram bot receives a message. Runs <code>claude -p &quot;the message&quot;</code> as a subprocess in the AOM-EA directory. Captures stdout. Sends it back to Telegram.</p>
<p><strong>Pros:</strong></p>
<ul>
<li>Full Claude Code capabilities: all tools, MCP servers, CLAUDE.md, skills, standing rules</li>
<li>Same brain, same context, same everything</li>
<li>Simple to implement (subprocess call)</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
<li>Each <code>-p</code> call is a new session by default (no conversation continuity)</li>
<li><code>--continue</code> flag exists but has a known bug with <code>--print</code> mode for session resume</li>
<li>Cold start on every message (loads all context fresh)</li>
<li>No streaming (waits for full response, which can take 30-60s)</li>
<li>Can&#39;t run nested: &quot;Claude Code cannot be launched inside another Claude Code session&quot; (CLAUDECODE env var check)</li>
<li>Would need to unset CLAUDECODE env var in subprocess</li>
</ul>
<p><strong>Key findings from research:</strong></p>
<ul>
<li><code>claude -p &quot;message&quot;</code> works for single-shot queries</li>
<li><code>claude --continue --print &quot;message&quot;</code> should resume the last session but has a documented bug (GitHub issue #1967)</li>
<li><code>--session-id</code> flag allows targeting specific sessions</li>
<li><code>--output-format stream-json</code> enables streaming output</li>
<li>The nesting protection can be bypassed by unsetting the CLAUDECODE env var</li>
</ul>
<p><strong>Verdict:</strong> Workable for simple queries. Session continuity is the weak point. Not great for conversational back-and-forth but perfect for &quot;run this task&quot; commands.</p>
<hr>
<h3>Option C: Telegram Bot via tmux Bridge (CCBot / claudecode-telegram approach)</h3>
<p><strong>How it works:</strong> Claude Code runs persistently in a tmux session. The Telegram bot injects messages into the tmux window via <code>tmux send-keys</code>. Claude Code&#39;s output is read from the tmux pane buffer or via hooks. Responses are sent back to Telegram.</p>
<p><strong>Pros:</strong></p>
<ul>
<li>THE SAME actual Claude Code session (not a copy, not API, the real thing)</li>
<li>Can switch between desktop and phone mid-conversation</li>
<li>Full context, full tools, full MCP, full everything</li>
<li>Multiple sessions via tmux windows / Telegram topics</li>
<li>Session persistence is automatic (tmux keeps it alive)</li>
<li>Can use Claude Code hooks for clean response capture</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
<li>Depends on tmux being running</li>
<li>Slightly hacky (reading terminal output, keystroke injection)</li>
<li>Mac needs to stay on</li>
<li>Needs a way to expose the bot to the internet (Cloudflare tunnel or polling)</li>
</ul>
<p><strong>Two implementations exist:</strong></p>
<ol>
<li><p><strong>CCBot (six-ddc/ccmux)</strong> -- The cleanest. Python. Each Telegram topic = 1 tmux window = 1 Claude session. Hook-based session tracking. Voice messages via OpenAI Whisper. Real-time notifications. Install via <code>uv tool install</code>. Actively maintained.</p>
</li>
<li><p><strong>claudecode-telegram (hanxiao)</strong> -- Simpler. Uses Cloudflare tunnel for webhooks. Stop hook reads transcript and sends to Telegram. Minimal but functional.</p>
</li>
</ol>
<p><strong>Verdict:</strong> This is the closest to &quot;same brain, different interface.&quot; The tmux approach is battle-tested and multiple teams have built it independently.</p>
<hr>
<h3>Option D: Telegram Bot via Claude Code SDK (claude-code-sdk)</h3>
<p><strong>How it works:</strong> Use the official <code>claude-code-sdk</code> Python package to programmatically create Claude Code sessions. The SDK wraps the CLI under the hood but provides a clean Python API with streaming, session management, and all Claude Code tools.</p>
<p><strong>Pros:</strong></p>
<ul>
<li>Official SDK. Clean Python API. Not hacky.</li>
<li>Full Claude Code capabilities (all tools, MCP, CLAUDE.md)</li>
<li>Streaming support built-in</li>
<li>Session resume via session ID</li>
<li>Permission handling via callbacks (can auto-approve or ask via Telegram)</li>
<li>No tmux dependency</li>
<li>The terranc/claude-telegram-bot-bridge project proves this works end-to-end</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
<li>SDK is relatively new (v0.0.25+)</li>
<li>Uses the CLI under the hood (subprocess), so still has the CLAUDECODE nesting issue</li>
<li>Each message still loads context fresh (no persistent in-memory conversation)</li>
<li>Heavier than tmux approach in some ways</li>
</ul>
<p><strong>What terranc&#39;s bridge does (the reference implementation):</strong></p>
<ul>
<li>Uses <code>claude-code-sdk</code> with <code>ClaudeSDKClient</code> and <code>ClaudeCodeOptions</code></li>
<li>Streams responses progressively to Telegram (real-time typing)</li>
<li>Session resume with <code>/resume</code> command</li>
<li>Model switching (Sonnet/Opus/Haiku)</li>
<li>Voice messages via Whisper</li>
<li>File permission approval via Telegram inline buttons</li>
<li>Auto-restart daemon mode with launchd</li>
<li>macOS auto-start on boot (<code>--install</code>)</li>
<li>One project directory per bot instance</li>
</ul>
<p><strong>Verdict:</strong> The most production-ready approach. Clean API, proven implementation exists, all capabilities preserved.</p>
<hr>
<h3>Option E: Telegram Bot via Claude Agent SDK</h3>
<p><strong>How it works:</strong> Use the <code>claude-agent-sdk</code> (separate from <code>claude-code-sdk</code>) to build a custom agent with defined tools, subagents, and MCP connections.</p>
<p><strong>Pros:</strong></p>
<ul>
<li>Most flexible architecture</li>
<li>Can define custom subagents (Mom, Bobby, etc.) as first-class concepts</li>
<li>MCP server support built-in</li>
<li>Session management with resume</li>
<li>Hook system for lifecycle events</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
<li>Requires rebuilding the tool ecosystem (the Agent SDK doesn&#39;t come with Claude Code&#39;s built-in tools)</li>
<li>More complex to set up</li>
<li>Would need to replicate what Claude Code already provides</li>
<li>Overkill for this use case</li>
</ul>
<p><strong>Verdict:</strong> Interesting for the future, but unnecessary right now. Claude Code SDK already gives us everything. The Agent SDK is for when you want to build something fundamentally different from Claude Code.</p>
<hr>
<h3>Option F: Git-based Phone Home Queue (existing)</h3>
<p><strong>How it works:</strong> Already partially exists in <code>context/home-queue.md</code>. Write a command to the file, push, Mac picks it up.</p>
<p><strong>Pros:</strong></p>
<ul>
<li>Already built</li>
<li>Works from any device with git access</li>
</ul>
<p><strong>Cons:</strong></p>
<ul>
<li>1-2 minute round trip minimum</li>
<li>Not conversational</li>
<li>Clunky UX</li>
<li>Requires git access from the phone</li>
</ul>
<p><strong>Verdict:</strong> Backup option only. Not a real solution.</p>
<hr>
<h2>Recommendation: What to Build</h2>
<h3>Phase 1 (MVP): Deploy terranc/claude-telegram-bot-bridge -- TODAY</h3>
<p>This is not a &quot;build from scratch&quot; situation. A production-ready, actively maintained open-source project exists that does exactly what we want. It uses the official <code>claude-code-sdk</code>, supports streaming, session resume, voice messages, model switching, and daemon mode with auto-restart.</p>
<p><strong>Why this over CCBot (tmux approach):</strong></p>
<ul>
<li>Cleaner architecture (SDK vs tmux keystroke injection)</li>
<li>Better streaming (progressive message updates vs polling pane buffer)</li>
<li>Built-in daemon mode with launchd auto-start</li>
<li>Doesn&#39;t require managing tmux sessions</li>
<li>Session resume is cleaner (SDK handles it vs hook-based tracking)</li>
</ul>
<p><strong>Why this over building our own:</strong></p>
<ul>
<li>It already works. 500+ lines of battle-tested code.</li>
<li>Has features we&#39;d want but wouldn&#39;t build in an MVP (voice, streaming, permission callbacks)</li>
<li>Actively maintained, MIT license</li>
</ul>
<h3>Phase 2 (Enhancement): Wire in AOM-specific capabilities</h3>
<p>Once the bridge is running:</p>
<ul>
<li>Add custom system prompt append with AOM context</li>
<li>Wire Mom scan as a scheduled trigger</li>
<li>Add agent-launching shortcuts (&quot;/bobby&quot;, &quot;/mom&quot;, &quot;/cleo&quot;)</li>
<li>Connect email triage notifications</li>
</ul>
<h3>Phase 3 (Full Vision): Multi-project support + proactive notifications</h3>
<ul>
<li>Multiple project directories (AOM-EA, AMBITION, aom-studio)</li>
<li>Mom sends push list to Telegram proactively</li>
<li>Calendar reminders via Telegram</li>
<li>Build status notifications (Vercel deploys)</li>
</ul>
<hr>
<h2>MVP Implementation: Step by Step</h2>
<h3>Prerequisites</h3>
<ul>
<li>Python 3.11+ (already have it)</li>
<li>Claude Code CLI (already installed: v2.1.71)</li>
<li>Telegram bot token (already have it: from existing bot)</li>
<li>ffmpeg (for voice messages): <code>brew install ffmpeg</code></li>
<li>OpenAI API key (for voice transcription, optional)</li>
</ul>
<h3>Step 1: Clone the bridge</h3>
<pre><code class="language-bash">cd /Users/patrik/Documents/Dev
git clone https://github.com/terranc/claude-telegram-bot-bridge
cd claude-telegram-bot-bridge
</code></pre>
<h3>Step 2: Run setup</h3>
<pre><code class="language-bash"># Option A: Use Claude Code&#39;s built-in setup skill
claude
# Then type: /setup

# Option B: Direct setup
./setup.sh
</code></pre>
<h3>Step 3: Configure environment</h3>
<p>Create <code>.env</code> in the project root:</p>
<pre><code class="language-bash">TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
ALLOWED_USER_IDS=YOUR_TELEGRAM_USER_ID_HERE
CLAUDE_CLI_PATH=/usr/local/bin/claude
CLAUDE_PROCESS_TIMEOUT=600
LOG_LEVEL=INFO
</code></pre>
<p>Optional (for voice messages):</p>
<pre><code class="language-bash">OPENAI_API_KEY=sk-...
</code></pre>
<h3>Step 4: Start the bot</h3>
<pre><code class="language-bash"># Foreground (for testing)
./start.sh --path /Users/patrik/Documents/Dev/AOM-EA

# Background daemon (for production)
./start.sh --path /Users/patrik/Documents/Dev/AOM-EA -d

# Auto-start on Mac boot
./start.sh --path /Users/patrik/Documents/Dev/AOM-EA --install
</code></pre>
<h3>Step 5: Stop the existing bot</h3>
<p>The current <code>projects/telegram-bot/bot.py</code> uses the same Telegram token. Only one bot can use a token at a time. Kill the old one first:</p>
<pre><code class="language-bash"># Find and kill the old bot
ps aux | grep &quot;bot.py&quot; | grep -v grep | awk &#39;{print $2}&#39; | xargs kill
</code></pre>
<h3>Step 6: Test from Telegram</h3>
<p>Send a message to the bot. It should now respond with full Claude Code capabilities.</p>
<hr>
<h2>What It Would Cost</h2>
<h3>Current bot (Anthropic API direct):</h3>
<ul>
<li>Sonnet: $3/M input, $15/M output tokens</li>
<li>Each message with full context (~5k tokens in) + response (~1k tokens out) = ~$0.03</li>
<li>50 messages/day = ~$1.50/day = ~$45/month</li>
<li>Heavy usage (100+ messages): ~$90/month</li>
</ul>
<h3>New bridge (Claude Code SDK, uses Anthropic API under the hood):</h3>
<ul>
<li>Same token costs as above</li>
<li>BUT: Claude Code uses prompt caching (90% savings on repeated context)</li>
<li>Estimated: ~$0.01-0.02 per message with caching</li>
<li>50 messages/day = ~$0.75/day = ~$22/month</li>
<li>Heavy usage: ~$45/month</li>
</ul>
<h3>Cost optimization options:</h3>
<ul>
<li>Use Haiku for simple queries ($1/M input, $5/M output) = 3x cheaper</li>
<li>The bridge supports <code>/model haiku</code> to switch on the fly</li>
<li>Use Haiku for quick checks, Sonnet for real work</li>
</ul>
<h3>Claude Code subscription:</h3>
<ul>
<li>If using Claude Code with a subscription (not API key), the cost is $0 per message (included in subscription)</li>
<li>The SDK/CLI works with subscription auth, not just API keys</li>
<li>This is the cheapest option by far</li>
</ul>
<hr>
<h2>What Could Go Wrong</h2>
<ol>
<li><p><strong>Mac goes to sleep or restarts</strong> -- Bot dies. Fix: launchd auto-start (<code>--install</code> flag). Also set Mac to never sleep: System Settings &gt; Energy &gt; Prevent automatic sleeping.</p>
</li>
<li><p><strong>Telegram token conflict</strong> -- Can&#39;t run two bots on the same token. Must kill the old bot first.</p>
</li>
<li><p><strong>Claude Code nesting</strong> -- If Patrik has Claude Code running in terminal AND the bot tries to run, it might conflict. The SDK handles this (separate subprocess), but watch for issues.</p>
</li>
<li><p><strong>Long responses</strong> -- Telegram has a 4096 character limit per message. The bridge handles this (splits messages), but very long agent outputs might be noisy.</p>
</li>
<li><p><strong>Permissions</strong> -- Claude Code asks for permission on certain operations. The bridge handles this with Telegram inline buttons. But if Patrik doesn&#39;t respond to a permission prompt, the bot hangs until timeout (600s default).</p>
</li>
<li><p><strong>Cost runaway</strong> -- If something triggers a loop (agent launching agent launching agent), costs can spike. Set <code>--max-budget-usd</code> on the Claude Code options. Monitor the first week.</p>
</li>
<li><p><strong>Context size</strong> -- AOM-EA has a lot of context files. Each message loads them all. This is fine with caching but watch token counts.</p>
</li>
</ol>
<hr>
<h2>How Long to Build</h2>
<table>
<thead>
<tr>
<th>Phase</th>
<th>Effort</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>Phase 1 (MVP)</td>
<td>30-60 minutes</td>
<td>Clone, configure, deploy terranc bridge. Kill old bot. Test.</td>
</tr>
<tr>
<td>Phase 2 (AOM wiring)</td>
<td>2-4 hours</td>
<td>Custom system prompt, agent shortcuts, Mom integration</td>
</tr>
<tr>
<td>Phase 3 (Full vision)</td>
<td>1-2 days</td>
<td>Multi-project, proactive notifications, calendar integration</td>
</tr>
</tbody></table>
<p>Phase 1 could be done today. The hardest part is killing the old bot and making sure the token handoff is clean.</p>
<hr>
<h2>Alternative: CCBot (If SDK Approach Has Issues)</h2>
<p>If the SDK-based bridge has problems (nesting issues, SDK bugs), CCBot is the fallback:</p>
<pre><code class="language-bash"># Install
uv tool install git+https://github.com/six-ddc/ccmux.git

# Configure
mkdir -p ~/.ccbot
cat &gt; ~/.ccbot/.env &lt;&lt; &#39;EOF&#39;
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
ALLOWED_USERS=YOUR_TELEGRAM_USER_ID_HERE
EOF

# Start Claude Code in tmux
tmux new -s ccbot
claude

# In another terminal, start CCBot
ccbot
</code></pre>
<p>CCBot is simpler (tmux-based) and has fewer moving parts, but less polished UX.</p>
<hr>
<h2>Summary</h2>
<table>
<thead>
<tr>
<th>Approach</th>
<th>Same Brain?</th>
<th>Full Tools?</th>
<th>Streaming?</th>
<th>Effort</th>
<th>Recommended?</th>
</tr>
</thead>
<tbody><tr>
<td>Current bot (API)</td>
<td>No</td>
<td>No</td>
<td>No</td>
<td>Done</td>
<td>No (dead end)</td>
</tr>
<tr>
<td>CLI pipe (claude -p)</td>
<td>Yes</td>
<td>Yes</td>
<td>Limited</td>
<td>Low</td>
<td>No (no conversation)</td>
</tr>
<tr>
<td>tmux bridge (CCBot)</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
<td>Low</td>
<td>Backup option</td>
</tr>
<tr>
<td><strong>SDK bridge (terranc)</strong></td>
<td><strong>Yes</strong></td>
<td><strong>Yes</strong></td>
<td><strong>Yes</strong></td>
<td><strong>Low</strong></td>
<td><strong>YES</strong></td>
</tr>
<tr>
<td>Agent SDK</td>
<td>Partial</td>
<td>Custom</td>
<td>Yes</td>
<td>High</td>
<td>No (overkill)</td>
</tr>
<tr>
<td>Git queue</td>
<td>No</td>
<td>Indirect</td>
<td>No</td>
<td>Done</td>
<td>No (too slow)</td>
</tr>
</tbody></table>
<p><strong>The answer is the SDK bridge.</strong> Clone it, configure it, deploy it. Same brain, different interface. Patrik talks to the real Claude Code from anywhere.</p>
`,c={title:e,slug:t,category:n,agent:o,date:s,dateFormatted:i,updated:null,summary:l,tags:a,content:r};export{o as agent,n as category,r as content,s as date,i as dateFormatted,c as default,t as slug,l as summary,a as tags,e as title,d as updated};
