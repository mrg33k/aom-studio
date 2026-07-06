const e="Credential Rotation Plan",t="credential-rotation-plan",n="Technical",o="Elon",r="2026-03-11",i="Mar 11",d=null,s="Research-complete plan for rotating credentials across AOM systems.",l=[],a=`<h1>Credential Rotation Plan</h1>
<blockquote>
<p>Prepared: 2026-03-11 | Agent: Elon
Status: RESEARCH COMPLETE. Awaiting Patrik&#39;s go to execute.</p>
</blockquote>
<hr>
<h2>Summary</h2>
<p>4 exposed credentials found in tracked files. 2 more in gitignored .env files (not in git history, lower risk). The repo is private, but any leaked access or client demo of the repo would expose everything. This must be clean before AI advisory demos.</p>
<hr>
<h2>Exposed Credentials (In Git History)</h2>
<h3>1. Instagram Password -- CRITICAL</h3>
<ul>
<li><strong>What:</strong> Instagram password for <code>patrikmatheson</code> account (REDACTED -- see Patrik)</li>
<li><strong>Where (current files):</strong><ul>
<li><code>scripts/ig-login.js</code> (line 18, hardcoded in Playwright login script)</li>
<li><code>.env</code> (line 3, gitignored, NOT in git history)</li>
</ul>
</li>
<li><strong>Git history:</strong> Yes. <code>ig-login.js</code> was committed in <code>5f1e0b5</code>. Password is baked into git history.</li>
<li><strong>Risk:</strong> Anyone with repo access gets Patrik&#39;s Instagram credentials. If this password is reused anywhere else, all those accounts are compromised too.</li>
<li><strong>Action required:</strong><ol>
<li>Rotate the Instagram password immediately (instagram.com &gt; Settings &gt; Password)</li>
<li>Replace hardcoded password in <code>ig-login.js</code> with <code>process.env.IG_PASSWORD</code></li>
<li>BFG needed to scrub from git history</li>
</ol>
</li>
</ul>
<h3>2. Telegram Bot Token -- MEDIUM</h3>
<ul>
<li><strong>What:</strong> Telegram bot token (REDACTED)</li>
<li><strong>Where (current files):</strong><ul>
<li><code>projects/sys/telegram-bridge-research.md</code> (lines 262, 370, in code examples)</li>
<li><code>projects/telegram-bot/.env</code> (gitignored, NOT in git history)</li>
</ul>
</li>
<li><strong>Git history:</strong> Yes. The research doc is tracked and has the real token in example configs.</li>
<li><strong>Risk:</strong> Anyone with the token can impersonate the relay bot, read/send messages as the bot, intercept Patrik&#39;s Telegram relay.</li>
<li><strong>Action required:</strong><ol>
<li>Revoke token via @BotFather on Telegram and generate a new one</li>
<li>Replace real token in <code>telegram-bridge-research.md</code> with a placeholder</li>
<li>Update <code>projects/telegram-bot/.env</code> with new token</li>
<li>BFG needed to scrub old token from git history</li>
</ol>
</li>
</ul>
<h3>3. Anthropic API Key -- MEDIUM</h3>
<ul>
<li><strong>What:</strong> Anthropic API key (REDACTED)</li>
<li><strong>Where (current files):</strong><ul>
<li><code>projects/telegram-bot/.env</code> (gitignored, NOT in git history)</li>
</ul>
</li>
<li><strong>Git history:</strong> No. Never committed. Gitignore caught this one.</li>
<li><strong>Risk:</strong> Lower, since it&#39;s not in git history. But if someone gets filesystem access, they get API billing access.</li>
<li><strong>Action required:</strong><ol>
<li>Rotate on console.anthropic.com as part of the overall cleanup</li>
<li>No BFG needed</li>
</ol>
</li>
</ul>
<h3>4. Postiz API Key -- NO ACTION</h3>
<ul>
<li><strong>What:</strong> Placeholder value <code>YOUR_POSTIZ_API_KEY_HERE</code> in <code>.claude/settings.json</code></li>
<li><strong>Risk:</strong> None. It&#39;s a placeholder, not a real key.</li>
<li><strong>Action required:</strong> None</li>
</ul>
<h3>5. GitHub PAT and Apify Token -- NO ACTION</h3>
<ul>
<li><strong>What:</strong> Referenced via <code>\${GITHUB_TOKEN}</code> and <code>\${APIFY_TOKEN}</code> env var syntax in <code>.claude/settings.json</code></li>
<li><strong>Risk:</strong> None from the repo. These resolve from shell environment at runtime.</li>
<li><strong>Action required:</strong> None from the repo side. Optionally verify these tokens have minimal required scopes.</li>
</ul>
<hr>
<h2>Previously Flagged (Already Fixed)</h2>
<p>Per the 2026-03-09 system audit:</p>
<ul>
<li><strong>Apollo API key</strong> in <code>outreach/SKILL.md</code> -- REDACTED 2026-03-10 (replaced with placeholder)</li>
<li><strong>LinkedIn credentials</strong> in <code>projects/ambition-mechanical/AGENT.md</code> -- REDACTED 2026-03-10</li>
</ul>
<p>These were removed from the current files but are still in git history. BFG is needed to fully clean them.</p>
<hr>
<h2>Action Plan (Priority Order)</h2>
<h3>Phase 1: Rotate All Compromised Credentials (do first)</h3>
<p>Rotate these BEFORE touching git history, so the old values are dead even if someone finds them:</p>
<table>
<thead>
<tr>
<th>#</th>
<th>Credential</th>
<th>Where to Rotate</th>
<th>Who</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>Instagram password</td>
<td>instagram.com &gt; Settings &gt; Password</td>
<td>Patrik</td>
</tr>
<tr>
<td>2</td>
<td>Telegram bot token</td>
<td>Telegram @BotFather &gt; /revoke + /newbot token</td>
<td>Patrik</td>
</tr>
<tr>
<td>3</td>
<td>Anthropic API key</td>
<td>console.anthropic.com &gt; API Keys</td>
<td>Patrik</td>
</tr>
<tr>
<td>4</td>
<td>Apollo API key (if still active)</td>
<td>app.apollo.io &gt; Settings</td>
<td>Patrik</td>
</tr>
</tbody></table>
<p>After rotating:</p>
<ul>
<li>Update <code>projects/telegram-bot/.env</code> with new Telegram token + new Anthropic key</li>
<li>Update <code>.env</code> with new IG password (if still using the login script)</li>
<li>Update any launchd plists or shell profiles that reference old tokens</li>
</ul>
<h3>Phase 2: Clean Current Files</h3>
<table>
<thead>
<tr>
<th>File</th>
<th>What to Do</th>
</tr>
</thead>
<tbody><tr>
<td><code>scripts/ig-login.js</code></td>
<td>Replace hardcoded password with <code>process.env.IG_PASSWORD</code></td>
</tr>
<tr>
<td><code>projects/sys/telegram-bridge-research.md</code></td>
<td>Replace real bot token with <code>[TELEGRAM_BOT_TOKEN]</code> placeholder</td>
</tr>
</tbody></table>
<h3>Phase 3: BFG Repo-Cleaner (Scrub Git History)</h3>
<p>BFG is needed. The following secrets exist in git history even if removed from current files:</p>
<ol>
<li>Instagram password (REDACTED)</li>
<li>Telegram bot token (REDACTED)</li>
<li>Apollo API key (whatever value was in SKILL.md before redaction)</li>
<li>LinkedIn credentials (whatever was in ambition-mechanical/AGENT.md before redaction)</li>
</ol>
<p><strong>BFG Steps:</strong></p>
<pre><code class="language-bash"># 1. Create a file with all strings to scrub (one per line)
cat &gt; /tmp/bfg-replacements.txt &lt;&lt; &#39;SECRETS&#39;
[REDACTED-IG-PASSWORD]
[REDACTED-TELEGRAM-BOT-TOKEN]
[apollo-key-value]
[linkedin-password-value]
SECRETS

# 2. Back up the repo
cp -r /Users/patrik/Documents/Dev/AOM-EA /Users/patrik/Documents/Dev/AOM-EA-backup

# 3. Run BFG (install first: brew install bfg)
cd /Users/patrik/Documents/Dev/AOM-EA
bfg --replace-text /tmp/bfg-replacements.txt

# 4. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push (destructive -- requires all collaborators to re-clone)
git push --force

# 6. Delete the replacements file
rm /tmp/bfg-replacements.txt
</code></pre>
<p><strong>Important:</strong> Force push rewrites history. Anyone with a local clone will need to re-clone. Confirm with Patrik before executing.</p>
<h3>Phase 4: Prevention</h3>
<table>
<thead>
<tr>
<th>Action</th>
<th>Details</th>
</tr>
</thead>
<tbody><tr>
<td>Add <code>.ig-cookies.json</code> to <code>.gitignore</code></td>
<td>Prevent cookie files from being tracked</td>
</tr>
<tr>
<td>Pre-commit hook</td>
<td>Install a git hook that scans for common secret patterns before allowing commits</td>
</tr>
<tr>
<td>Never hardcode credentials</td>
<td>All secrets go in <code>.env</code> files (gitignored) or environment variables</td>
</tr>
<tr>
<td>Audit quarterly</td>
<td>Add credential scan to Elon&#39;s periodic audit checklist</td>
</tr>
</tbody></table>
<hr>
<h2>Risk Assessment</h2>
<table>
<thead>
<tr>
<th>If we do nothing</th>
<th>Impact</th>
</tr>
</thead>
<tbody><tr>
<td>Repo access leaked</td>
<td>Instagram account compromised, Telegram relay hijacked, API billing abuse</td>
</tr>
<tr>
<td>Client demo of repo</td>
<td>Credentials visible in files and git history. Kills trust before the relationship starts.</td>
</tr>
<tr>
<td>SOC 2 readiness</td>
<td>Hardcoded credentials = automatic fail on access management controls</td>
</tr>
</tbody></table>
<p><strong>Bottom line:</strong> This is a 30-minute fix (rotate + clean files) plus a BFG run. No reason to delay.</p>
`,c={title:e,slug:t,category:n,agent:o,date:r,dateFormatted:i,updated:null,summary:s,tags:l,content:a};export{o as agent,n as category,a as content,r as date,i as dateFormatted,c as default,t as slug,s as summary,l as tags,e as title,d as updated};
