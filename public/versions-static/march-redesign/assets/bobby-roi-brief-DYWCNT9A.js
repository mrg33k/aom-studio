const e="Bobby Brief: ROI Calculator Page",t="bobby-roi-brief",n="Strategy",i="Alex",o="2026-03-12",l="Mar 12",d=null,a="Build brief for Bobby to create the ROI calculator lead magnet page.",s=[],r=`<h1>Bobby Brief: ROI Calculator Page</h1>
<p><strong>Date:</strong> 2026-03-12
<strong>From:</strong> Alex (Deal Architect) + Steve (AI Advisory Lead)
<strong>For:</strong> Bobby (Web Dev)
<strong>Priority:</strong> High. This is the next lead magnet for the AI advisory product.</p>
<hr>
<h2>What to Build</h2>
<p>An interactive ROI calculator page on aheadofmarket.com. Business owners input 6 data points about their operations, hit calculate, and see projected time savings, cost savings, and break-even timeline for AOM&#39;s AI advisory service.</p>
<p><strong>Full spec:</strong> <code>projects/steve/roi-calculator-spec.md</code></p>
<hr>
<h2>Page Location</h2>
<p><code>/roi</code> or <code>/calculator</code> (Patrik decides). Link it from:</p>
<ul>
<li>/system page (as a next step)</li>
<li>Navigation or footer</li>
<li>Outreach emails (Jacob)</li>
</ul>
<hr>
<h2>Build Summary</h2>
<h3>Inputs (6 fields, one form section)</h3>
<ol>
<li>Industry (dropdown: Construction/Trades, Professional Services, Healthcare, Restaurant/Hospitality, Other)</li>
<li>Team size (number, 1-50)</li>
<li>Admin hours per person per week (slider or number, 2-25)</li>
<li>Average hourly rate ($ input, $25-$500)</li>
<li>Monthly software spend ($ input, $0-$5,000)</li>
<li>Monthly revenue ($ input, $10k-$2M)</li>
</ol>
<h3>Outputs (4 primary cards + detailed breakdown)</h3>
<ol>
<li>Hours recovered per week</li>
<li>Monthly value of time saved</li>
<li>Total monthly impact (time + revenue + software)</li>
<li>Break-even timeline in months</li>
</ol>
<p>Below the cards: detailed table breakdown showing where value comes from, 3-year investment vs. return comparison, and industry-specific automation checklist.</p>
<h3>CTAs</h3>
<ul>
<li>Primary: &quot;Book Your Audit&quot; (links to /audit/test or Calendly)</li>
<li>Secondary: &quot;Send Me This Report&quot; (email capture, sends PDF of results)</li>
</ul>
<hr>
<h2>Technical Requirements</h2>
<ul>
<li><strong>Client-side only.</strong> All math in JavaScript. No backend, no API calls.</li>
<li><strong>No page reload.</strong> Results animate in below the inputs on calculate.</li>
<li><strong>URL params for pre-fill:</strong> <code>?industry=construction&amp;team=8&amp;rate=75</code> so Jacob can send personalized links in outreach emails.</li>
<li><strong>Mobile-first.</strong> This gets shared via text message.</li>
<li><strong>Analytics:</strong> Track every calculation. Log inputs anonymously (industry, team size, revenue range). This data feeds Alex&#39;s strategy.</li>
<li><strong>Shareable results:</strong> Generate a permalink or snapshot URL after calculation.</li>
</ul>
<hr>
<h2>Design Direction</h2>
<ul>
<li>Match AOM brand v4. Clean, high-contrast, professional.</li>
<li>Large numbers on the result cards. Clear labels. No clutter.</li>
<li>Green for savings/benefits, neutral for costs, brand accent for CTAs.</li>
<li>Smooth animation when results appear. No gimmicks, no spinning counters.</li>
<li>Feels like a premium SaaS tool, not a generic widget.</li>
<li>&quot;Old people can read em, young people love em.&quot; Minimum 16px body text.</li>
<li>Steffen should review before launch.</li>
</ul>
<hr>
<h2>Formulas (simplified for implementation)</h2>
<p>All formulas and industry-specific multipliers are in the full spec. Key ones:</p>
<pre><code>total_admin_hours = team_size * admin_hours_per_person
automatable_hours = total_admin_hours * industry_automation_rate
weekly_savings = automatable_hours * hourly_rate
monthly_savings = weekly_savings * 4.33
revenue_uplift = monthly_revenue * industry_uplift_rate
software_savings = monthly_software_spend * 0.15
total_monthly_value = monthly_savings + revenue_uplift + software_savings
net_monthly_benefit = total_monthly_value - 2250 (retainer midpoint)
breakeven_months = 9000 (setup midpoint) / net_monthly_benefit
</code></pre>
<p>Industry multipliers:</p>
<table>
<thead>
<tr>
<th>Industry</th>
<th>Automation Rate</th>
<th>Revenue Uplift</th>
</tr>
</thead>
<tbody><tr>
<td>Construction/Trades</td>
<td>35%</td>
<td>4%</td>
</tr>
<tr>
<td>Professional Services</td>
<td>40%</td>
<td>3%</td>
</tr>
<tr>
<td>Healthcare</td>
<td>30%</td>
<td>2%</td>
</tr>
<tr>
<td>Restaurant/Hospitality</td>
<td>35%</td>
<td>4%</td>
</tr>
<tr>
<td>Other</td>
<td>30%</td>
<td>3%</td>
</tr>
</tbody></table>
<hr>
<h2>Honesty Guardrails (non-negotiable)</h2>
<ol>
<li>Never show over 50% admin time reduction</li>
<li>Revenue uplift always labeled &quot;estimated&quot;</li>
<li>Break-even &gt; 8 months = yellow indicator. &gt; 12 months = honest note that full system may not fit yet</li>
<li>Always show costs alongside savings</li>
<li>Disclaimer footer with &quot;estimates based on industry benchmarks&quot; language</li>
<li>Small businesses (1-2 people) get honest small numbers, not inflated ones</li>
</ol>
<hr>
<h2>Edge Cases</h2>
<ul>
<li>1-person shop with low revenue: show real (small) numbers, softer CTA toward audit</li>
<li>50-person company: cap automation rate, suggest custom scoping call</li>
<li>$0 software spend: hide software savings line entirely</li>
<li>Break-even &gt; 12 months: show number with context, don&#39;t hide it</li>
<li>Default values unchanged: show results but nudge user to customize</li>
</ul>
<hr>
<h2>Elmo QA Checklist</h2>
<ul>
<li><input disabled="" type="checkbox"> Calculator works on mobile (iPhone, Android Chrome)</li>
<li><input disabled="" type="checkbox"> All inputs validate properly (no negative numbers, no out-of-range)</li>
<li><input disabled="" type="checkbox"> Results match the formulas in the spec exactly</li>
<li><input disabled="" type="checkbox"> URL params pre-fill correctly</li>
<li><input disabled="" type="checkbox"> CTA buttons link to correct destinations</li>
<li><input disabled="" type="checkbox"> Disclaimer text is visible and readable</li>
<li><input disabled="" type="checkbox"> Page loads fast (no heavy frameworks for a simple calculator)</li>
<li><input disabled="" type="checkbox"> Accessible: labels, focus states, screen reader compatible</li>
<li><input disabled="" type="checkbox"> Break-even edge cases display correctly (&lt; 1 month, &gt; 12 months)</li>
</ul>
<hr>
<h2>What Bobby Does NOT Need to Do</h2>
<ul>
<li>No backend or database</li>
<li>No user accounts</li>
<li>No payment processing</li>
<li>No PDF generation (secondary CTA email capture is a future enhancement, can be a mailto or simple form initially)</li>
</ul>
<hr>
<h2>Reference Files</h2>
<ul>
<li>Full spec: <code>projects/steve/roi-calculator-spec.md</code></li>
<li>Market research (data sources): <code>projects/steve/ai-advisory-market-research.md</code></li>
<li>Offer language (positioning): <code>projects/aom-strategy/ai-advisory-offer-language.md</code></li>
<li>Audit questionnaire (what the calculator feeds into): <code>projects/steve/latest-result.md</code></li>
</ul>
<hr>
<p><em>Brief ready. Bobby builds. Steffen reviews design. Elmo QAs. Patrik approves.</em></p>
`,u={title:e,slug:t,category:n,agent:i,date:o,dateFormatted:l,updated:null,summary:a,tags:s,content:r};export{i as agent,n as category,r as content,o as date,l as dateFormatted,u as default,t as slug,a as summary,s as tags,e as title,d as updated};
