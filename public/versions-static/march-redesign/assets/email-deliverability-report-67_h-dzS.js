const e="Email Deliverability Report",o="email-deliverability-report",n="Audits",t="Elon",a="2026-03-09",i="Mar 9",c=null,s="Deliverability analysis for hello@aom-inhouse.com outbound email.",l=[],r=`<h1>Email Deliverability Report: <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a></h1>
<p><strong>Date:</strong> 2026-03-09
<strong>Run by:</strong> Elon (sys agent)</p>
<h2>Score: AT RISK</h2>
<p>Authentication is technically in place, but the DMARC policy is set to <code>p=none</code> (monitor only) and alignment is strict. Combined with 280+ cold emails from a ~5-year-old domain, deliverability is likely suffering from policy weakness and volume patterns, not missing records.</p>
<hr>
<h2>SPF: PASS</h2>
<pre><code>v=spf1 include:_spf.google.com ~all
</code></pre>
<ul>
<li>Google Workspace is authorized to send.</li>
<li><code>~all</code> (softfail) is standard. Some hardliners prefer <code>-all</code> (hardfail) but <code>~all</code> is fine for most receivers.</li>
</ul>
<h2>DKIM: PASS</h2>
<pre><code>google._domainkey.aom-inhouse.com -&gt; v=DKIM1; k=rsa; p=MIIBIjAN...
</code></pre>
<ul>
<li>DKIM is configured with Google&#39;s selector.</li>
<li>RSA 2048-bit key present and valid.</li>
</ul>
<h2>DMARC: PASS (but weak policy)</h2>
<pre><code>v=DMARC1;p=none;sp=none;pct=100;rua=mailto:hello@aom-inhouse.com;ruf=mailto:hello@aom-inhouse.com;ri=86400;aspf=s;adkim=s;fo=1
</code></pre>
<ul>
<li><strong>Policy: <code>p=none</code></strong> -- This is the problem. <code>p=none</code> means &quot;do nothing if authentication fails.&quot; Receiving servers see this as the domain owner not confident enough to enforce. Gmail, Outlook, and Yahoo all factor DMARC policy strength into spam scoring.</li>
<li><strong>Strict alignment (<code>aspf=s; adkim=s</code>)</strong> -- Unusually strict. This means the From domain must exactly match the SPF/DKIM domain (no subdomains). If Google sends from a slightly different envelope, strict alignment causes DMARC failures silently. Most setups use <code>r</code> (relaxed).</li>
<li><strong>Forensic reports (<code>ruf</code>)</strong> going to <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a> -- good, but most providers don&#39;t send forensic reports. Aggregate reports (<code>rua</code>) are the useful ones.</li>
</ul>
<h2>MX: PASS</h2>
<pre><code>1  aspmx.l.google.com
5  alt1.aspmx.l.google.com
5  alt2.aspmx.l.google.com
10 alt3.aspmx.l.google.com
10 alt4.aspmx.l.google.com
</code></pre>
<ul>
<li>Full Google Workspace MX setup. Correctly prioritized. No issues.</li>
</ul>
<h2>Domain Age: OK</h2>
<ul>
<li><strong>Registered:</strong> 2021-02-20 (~5 years old)</li>
<li>Not a fresh domain. Age is not the issue.</li>
</ul>
<h2>Blacklist Check: CLEAN</h2>
<ul>
<li>Not listed on Spamhaus ZEN (covers SBL, XBL, PBL, DBL).</li>
</ul>
<hr>
<h2>Findings</h2>
<ol>
<li><p><strong>DMARC <code>p=none</code> is the biggest deliverability gap.</strong> Every major email provider (Gmail, Microsoft, Yahoo) uses DMARC policy as a trust signal. <code>p=none</code> tells them &quot;I&#39;m not sure my own authentication works.&quot; This directly impacts inbox placement for cold outreach.</p>
</li>
<li><p><strong>Strict DMARC alignment is risky.</strong> <code>aspf=s</code> and <code>adkim=s</code> mean exact domain match required. Google Workspace sometimes uses envelope senders like <code>bounces.google.com</code> which would fail strict SPF alignment. This could cause silent DMARC failures even though SPF and DKIM individually pass. Relaxed alignment (<code>r</code>) is the industry standard and what Google recommends.</p>
</li>
<li><p><strong>SPF <code>~all</code> vs <code>-all</code>.</strong> Minor point. <code>~all</code> (softfail) is fine for most purposes, but upgrading to <code>-all</code> (hardfail) sends a stronger signal that only Google should send mail for this domain.</p>
</li>
<li><p><strong>280+ cold emails with 0.7% reply rate.</strong> Even with perfect authentication, this volume of cold outreach with near-zero engagement trains spam filters against the domain. Gmail specifically tracks sender reputation based on engagement (opens, replies, not-spam clicks). Low engagement = lower reputation = more spam folder placement. This is a compounding problem.</p>
</li>
<li><p><strong>No warm-up was done.</strong> Sending 280+ cold emails without gradually ramping volume is a classic trigger for spam filters. The domain may already have reduced reputation with Gmail.</p>
</li>
</ol>
<hr>
<h2>Recommended Fixes (Priority Order)</h2>
<h3>1. Fix DMARC alignment (do this first, takes 5 min)</h3>
<p>Change the DMARC record to:</p>
<pre><code>v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:hello@aom-inhouse.com; aspf=r; adkim=r; fo=1
</code></pre>
<p>Changes:</p>
<ul>
<li><code>p=quarantine</code> (tells servers to spam-folder unauthenticated mail, not ignore it)</li>
<li><code>aspf=r; adkim=r</code> (relaxed alignment, prevents silent failures)</li>
<li>Removed <code>ruf</code> (almost no one sends forensic reports, just noise)</li>
</ul>
<p><strong>Where:</strong> GoDaddy DNS (or wherever aom-inhouse.com DNS is managed). Edit the <code>_dmarc</code> TXT record.</p>
<p>After 2-4 weeks with no issues in aggregate reports, upgrade to <code>p=reject</code> for maximum trust.</p>
<h3>2. Check DMARC aggregate reports</h3>
<p>The <code>rua</code> reports are going to <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>. Check that inbox for emails from <code>noreply-dmarc-support@google.com</code> and similar. These XML reports show if any messages are failing authentication. If you&#39;ve never seen these reports, they may be going to spam/trash. Consider using a free DMARC report reader like dmarcian.com or easydmarc.com to parse them.</p>
<h3>3. Warm up the domain for cold outreach</h3>
<ul>
<li><strong>Pause cold outreach for 1-2 weeks.</strong></li>
<li>During that time, send normal business emails (replies, client comms, invoices) to build positive engagement signals.</li>
<li>When resuming cold outreach, start with 10-15/day and increase by 5-10/day each week.</li>
<li>Use a tool like Instantly, Lemlist, or Smartlead that handles warm-up automatically.</li>
</ul>
<h3>4. Consider a separate outreach domain</h3>
<p>Best practice for cold outreach at scale: use a secondary domain (e.g., <code>aom-outreach.com</code> or <code>aominhouse.com</code>) so that cold outreach reputation doesn&#39;t contaminate the main business domain. Set up the same SPF/DKIM/DMARC on the outreach domain. This protects <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>&#39;s reputation for client communication.</p>
<h3>5. Harden SPF (optional)</h3>
<p>Change <code>~all</code> to <code>-all</code> in the SPF record:</p>
<pre><code>v=spf1 include:_spf.google.com -all
</code></pre>
<p>Minor improvement but signals confidence.</p>
<hr>
<h2>Summary</h2>
<p>The authentication stack is present but the DMARC policy (<code>p=none</code> + strict alignment) is actively hurting deliverability. Fix #1 takes 5 minutes in DNS and is the highest-impact change. The cold outreach volume pattern (280 emails, near-zero engagement) is a separate but compounding problem that needs a warm-up strategy or a dedicated outreach domain.</p>
`,d={title:e,slug:o,category:n,agent:t,date:a,dateFormatted:i,updated:null,summary:s,tags:l,content:r};export{t as agent,n as category,r as content,a as date,i as dateFormatted,d as default,o as slug,s as summary,l as tags,e as title,c as updated};
