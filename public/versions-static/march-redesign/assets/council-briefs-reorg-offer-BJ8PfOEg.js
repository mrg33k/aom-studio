const e="Council: Briefs Reorg + Offer Strategy",t="council-briefs-reorg-offer",o="Council",n="Council",r="2026-03-12",i="Mar 12",c=null,a="Council on /briefs accordion reorganization and replacing zero-risk offers in outreach.",s=[],l=`<h1>Council Brief -- Briefs Page Reorg + Outreach Offer Strategy</h1>
<p><strong>Date:</strong> 2026-03-12
<strong>Agents present:</strong> Bobby, Alex, Jacob, Mom, Steffen
<strong>Questions:</strong> (1) How to reorganize /briefs with accordion lists by topic. (2) What replaces the zero-risk free-work offer in outreach.</p>
<hr>
<h2>Bobby</h2>
<p>Accordion by category. Categories: Strategy, Audits, Design Specs, Outreach, System/Infra. Each card shows title + date, expands to summary + link.</p>
<p>Auto-generation: add frontmatter (title, category, date, summary) to each MD file. Build script generates briefs index JSON. Bobby reads JSON, renders accordion. New MD file + frontmatter = auto-appears. No manual page creation per brief.</p>
<p>Build complexity: medium. 2-3 hours. Frontmatter on 100+ existing files is the slow part.</p>
<p>On offer: free AI audit replaces free filming. 30-min call, Patrik runs the system scan live, shows gap report. Zero deliverable burden. The audit IS the product. Converts to paid build.</p>
<h2>Alex</h2>
<p>51/0 = messaging problem, not volume problem. Free work signals desperation.</p>
<p>New offer ladder:</p>
<ol>
<li><strong>First touch</strong> -- &quot;We built an AI system for a Phoenix contractor that cut follow-up time in half. 15-minute call, I&#39;ll show you.&quot; Zero production hours.</li>
<li><strong>Discovery call</strong> -- Free $250 &quot;quick scan&quot; (30 min, review their ops, identify 2-3 AI gaps). Bills toward audit if they convert.</li>
<li><strong>Paid entry</strong> -- $2,500 audit. Now they&#39;re a client.</li>
<li><strong>Upsell</strong> -- $5-8k build + $1,500-3k/month retainer.</li>
</ol>
<p>Lead with AI. Video becomes the retainer upsell once they&#39;re in the door.</p>
<h2>Jacob</h2>
<p>51 across 6 industries over months is not a campaign, it&#39;s a sample. The template is solid (Patrik wrote it). Spread too thin across verticals.</p>
<p>Kill zero-risk free work. The current template doesn&#39;t actually have it. Template is just an open door. No offer needed at email 1. The offer is the conversation.</p>
<p>If offer enters at email 2-3: &quot;I was going to put together a quick breakdown of what similar companies in Phoenix are doing for content. Want me to send it?&quot; That&#39;s 30 min of research, not a shoot day.</p>
<p>Don&#39;t lead with AI for construction. Construction owners open emails from someone who notices their work, not AI pitches. AI mention stays 1-in-5, casual.</p>
<p>Volume is the real unlock. Multi-domain scaling (300-500/week) turns 0% into real data.</p>
<h2>Mom</h2>
<p><strong>Unshipped MD files that should be pages:</strong></p>
<p>HIGH PRIORITY (revenue-facing):</p>
<ul>
<li>partnership-strategy.md, build-proposal-template.md, case-study-brief.md, onboarding-sequence.md, roi-calculator-spec.md</li>
</ul>
<p>DESIGN SPECS:</p>
<ul>
<li>roi-calculator-design-spec.md, case-study-design-spec.md, audit-deliverable-design-spec.md</li>
</ul>
<p>INTERNAL/OPS:</p>
<ul>
<li>council/ai-advisory-sprint.md, council/business-growth.md, masterplan-audit.md</li>
</ul>
<p><strong>Top 3 revenue blockers:</strong> (1) IH $9k payment -- one email. (2) 33 outreach drafts unreviewed -- 15 min. (3) ROI calculator not live yet.</p>
<h2>Steffen</h2>
<p>8 categories: Strategy, Design Specs, Audits, Client Reports, Outreach, Technical, Content, Council.</p>
<p>Accordion UI: dark card bg (#111110), orange left-border on active header, warm white title text, sage green metadata. No icons -- typography carries it.</p>
<p>Closed row: category name (bold, 18px) + item count in sage. Expands to list items in 16px warm white. Each item: Title / Agent tag / Date -- one line.</p>
<p>Information hierarchy: <strong>Title</strong> (warm white, 16px) -- Agent (sage, 14px) -- Date (muted, 14px). Summary on hover or secondary expand. Scannable first.</p>
<p>No per-category color variation. Brand consistency over differentiation. Orange active state is enough signal.</p>
<hr>
<h2>Synthesis</h2>
<p><strong>Where we agree:</strong></p>
<ul>
<li>Kill zero-risk free-work offers. Don&#39;t commit production hours before revenue.</li>
<li>Email 1 is a door-opener, not an offer. The current Patrik-written template is solid.</li>
<li>/briefs needs accordion reorg by category (8 categories per Steffen). Auto-generate from frontmatter.</li>
<li>The AI audit is the product. It&#39;s the natural first-touch value exchange that doesn&#39;t burn time.</li>
</ul>
<p><strong>Where they disagree:</strong></p>
<ul>
<li>Alex says lead with AI for construction. Jacob says don&#39;t -- construction owners respond to trade recognition, not tech pitches. AI stays 1-in-5 per Patrik&#39;s voice template.</li>
<li>Alex sees 0% as a messaging signal. Jacob sees it as insufficient sample size. Both are partially right.</li>
</ul>
<p><strong>Recommended next actions:</strong></p>
<ol>
<li>Bobby builds /briefs accordion page (2-3 hrs). Steffen&#39;s design spec above is the guide.</li>
<li>Jacob rewrites any pending drafts that contain free-work offers. Replace with open-door approach.</li>
<li>For email 2-3 follow-ups: offer a &quot;market breakdown&quot; (30-min research doc) instead of free production work.</li>
<li>The AI advisory &quot;quick scan&quot; becomes the discovery call offer (not email 1, but the call CTA).</li>
<li>Scale volume via multi-domain setup. At 300-500/week, the data becomes meaningful.</li>
<li>Patrik: approve Jacob&#39;s 33 drafts or give clear redirect. 15 minutes.</li>
</ol>
<hr>
<h2>Decision</h2>
<ul>
<li>Zero-risk free-work offers are DEAD. No free filming, no free spotlight series, no free content production in outreach.</li>
<li>Email 1 = open door (Patrik template). Email 2-3 = low-lift value (market breakdown doc). Discovery call = quick scan that bills toward audit.</li>
<li>/briefs page gets accordion reorg with 8 categories. Bobby builds per Steffen spec.</li>
</ul>
`,p={title:e,slug:t,category:o,agent:n,date:r,dateFormatted:i,updated:null,summary:a,tags:s,content:l};export{n as agent,o as category,l as content,r as date,i as dateFormatted,p as default,t as slug,a as summary,s as tags,e as title,c as updated};
