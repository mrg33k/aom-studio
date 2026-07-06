const e="Pinterest Board Scraper Report",t="pinterest-scraper-report",n="Technical",o="Elon",r="2026-03-09",s="Mar 9",d=null,a="Build report for the Pinterest board scraper tool for brand research.",i=[],l=`<h1>Pinterest Board Scraper</h1>
<p><strong>Status:</strong> Built and tested. Working.
<strong>Date:</strong> 2026-03-09
<strong>Script:</strong> <code>scripts/pinterest-scraper.py</code></p>
<h2>What it does</h2>
<p>Downloads all images (and optionally videos) from any public Pinterest board. Free, no API keys, no paid services.</p>
<h2>How it works</h2>
<p>Pinterest completely blocks unauthenticated access to board content (login wall, as of 2025). The scraper uses two approaches:</p>
<ol>
<li><strong>One-time login</strong> to save cookies (run once, lasts weeks/months)</li>
<li><strong>Playwright headless browser</strong> scrapes pins by scrolling through the board, extracting image URLs from the DOM, then downloads them in parallel</li>
</ol>
<p>The Pinterest internal API (<code>/resource/BoardResource/get/</code>) is dead as of March 2025. Returns 404 for all boards regardless of auth. Playwright browser automation is the only reliable path.</p>
<h2>Setup</h2>
<pre><code class="language-bash"># Dependencies (all free)
pip install playwright requests tqdm
playwright install chromium

# Optional: for --chrome cookie extraction
pip install browser-cookie3
</code></pre>
<h2>First-time auth (pick one)</h2>
<pre><code class="language-bash"># Option A: If already logged into Pinterest in Chrome
python3 scripts/pinterest-scraper.py --chrome

# Option B: Opens a browser window, log in manually
python3 scripts/pinterest-scraper.py --login
</code></pre>
<p>Cookies saved to <code>~/.config/pinterest-scraper/cookies.json</code>. Reused automatically after that.</p>
<h2>Usage</h2>
<pre><code class="language-bash"># Download all pins from a board
python3 scripts/pinterest-scraper.py &quot;https://pinterest.com/user/board&quot;

# Custom output folder
python3 scripts/pinterest-scraper.py &quot;https://pinterest.com/user/board&quot; -o ~/Downloads/board

# Limit to 50 pins
python3 scripts/pinterest-scraper.py &quot;https://pinterest.com/user/board&quot; --limit 50

# Include videos (slower, visits each pin page)
python3 scripts/pinterest-scraper.py &quot;https://pinterest.com/user/board&quot; --video
</code></pre>
<h2>Test results</h2>
<table>
<thead>
<tr>
<th>Board</th>
<th>Pins scraped</th>
<th>Downloaded</th>
<th>Success rate</th>
<th>Time</th>
</tr>
</thead>
<tbody><tr>
<td>buzzfeed/easy-dinner-recipes (15)</td>
<td>15</td>
<td>15</td>
<td>100%</td>
<td>36s</td>
</tr>
<tr>
<td>buzzfeed/easy-dinner-recipes (20)</td>
<td>20</td>
<td>20</td>
<td>100%</td>
<td>33s</td>
</tr>
<tr>
<td>buzzfeed/easy-dinner-recipes (50)</td>
<td>50</td>
<td>46</td>
<td>92%</td>
<td>32s</td>
</tr>
</tbody></table>
<p>The ~8% failure rate at 50 pins is from Pinterest CDN blocking direct access to <code>/originals/</code> for some pins. Script falls back to <code>/736x/</code> (still high quality), and further to <code>/474x/</code>. Some pins are simply no longer accessible.</p>
<h2>Image quality</h2>
<ul>
<li>Attempts <code>/originals/</code> first (full resolution)</li>
<li>Falls back to <code>/736x/</code> if originals return 403</li>
<li>Falls back to <code>/474x/</code> as last resort</li>
<li>File sizes range from ~30KB to ~600KB per image</li>
</ul>
<h2>Architecture</h2>
<p>Single Python file. No external API keys. Key components:</p>
<ul>
<li>Cookie management (Chrome extraction or manual browser login)</li>
<li>Playwright-based DOM scraping with scroll pagination</li>
<li>Concurrent image downloading (8 threads)</li>
<li>Resolution fallback chain (originals -&gt; 736x -&gt; 474x)</li>
<li>Video detection and download from individual pin pages</li>
</ul>
<h2>Cookies location</h2>
<p><code>~/.config/pinterest-scraper/cookies.json</code></p>
<p>Re-run <code>--chrome</code> or <code>--login</code> if cookies expire.</p>
`,c={title:e,slug:t,category:n,agent:o,date:r,dateFormatted:s,updated:null,summary:a,tags:i,content:l};export{o as agent,n as category,l as content,r as date,s as dateFormatted,c as default,t as slug,a as summary,i as tags,e as title,d as updated};
