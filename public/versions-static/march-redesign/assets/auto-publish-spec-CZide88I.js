const e="Auto-Publish Architecture Spec",t="auto-publish-spec",n="Technical",o="Steve",r="2026-03-12",i="Mar 12",l=null,s="Three-layer architecture for auto-publishing .md files as webpages on aheadofmarket.com.",a=[],d=`<h1>Auto-Publish Architecture Spec</h1>
<p><strong>Date:</strong> 2026-03-12
<strong>Author:</strong> Steve (AI Advisory Lead)
<strong>Status:</strong> READY FOR BOBBY</p>
<h2>The Problem</h2>
<p>Agents write .md files in AOM-EA. Bobby hand-builds a JSX page for each one. There are 9 live brief pages (each 200-800 lines of hand-coded JSX) and 40+ items on the /briefs hub with no page. This does not scale. Every new brief requires Bobby to build a custom React component, add a route to main.jsx, and add an import. That&#39;s 30+ minutes per brief, every time.</p>
<h2>The Solution: Three Layers</h2>
<h3>Layer 1: Frontmatter Standard (agents write it)</h3>
<h3>Layer 2: Build-time index generation (script generates JSON)</h3>
<h3>Layer 3: Dynamic brief renderer (one React component renders all briefs)</h3>
<hr>
<h2>Layer 1: Frontmatter Standard</h2>
<p>Every publishable .md file in AOM-EA gets YAML frontmatter at the top. This is the contract between agents and the website.</p>
<h3>Required Fields</h3>
<pre><code class="language-yaml">---
title: &quot;Partnership Strategy&quot;
slug: &quot;partnerships&quot;
category: &quot;Strategy&quot;
agent: &quot;Alex&quot;
date: &quot;2026-03-10&quot;
summary: &quot;Why partnerships beat cold email. 30+ specific targets for AOM growth.&quot;
status: &quot;published&quot;
---
</code></pre>
<h3>Field Definitions</h3>
<table>
<thead>
<tr>
<th>Field</th>
<th>Type</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td><code>title</code></td>
<td>string</td>
<td>YES</td>
<td>Display title on the site. Max 80 chars.</td>
</tr>
<tr>
<td><code>slug</code></td>
<td>string</td>
<td>YES</td>
<td>URL path. Brief lives at <code>/briefs/{slug}</code>. Lowercase, hyphens only.</td>
</tr>
<tr>
<td><code>category</code></td>
<td>enum</td>
<td>YES</td>
<td>One of 8 values (see Category System below).</td>
</tr>
<tr>
<td><code>agent</code></td>
<td>string</td>
<td>YES</td>
<td>Which agent authored it. Maps to the sage-green tag in the UI.</td>
</tr>
<tr>
<td><code>date</code></td>
<td>string</td>
<td>YES</td>
<td>ISO date (YYYY-MM-DD). Used for sort order within categories.</td>
</tr>
<tr>
<td><code>summary</code></td>
<td>string</td>
<td>YES</td>
<td>1-2 sentence description. Shows in the accordion list. Max 200 chars.</td>
</tr>
<tr>
<td><code>status</code></td>
<td>enum</td>
<td>YES</td>
<td><code>draft</code>, <code>published</code>, or <code>archived</code>. Only <code>published</code> shows on site.</td>
</tr>
<tr>
<td><code>updated</code></td>
<td>string</td>
<td>no</td>
<td>ISO date of last meaningful update. Shows &quot;Updated Mar 12&quot; if present.</td>
</tr>
<tr>
<td><code>tags</code></td>
<td>list</td>
<td>no</td>
<td>Additional search terms. Not displayed, but searchable.</td>
</tr>
<tr>
<td><code>priority</code></td>
<td>number</td>
<td>no</td>
<td>1-5 (1=highest). Controls sort within a category when dates are equal.</td>
</tr>
</tbody></table>
<h3>Category System (8 categories, per Steffen)</h3>
<ol>
<li><strong>Strategy</strong> -- Business strategy, growth plans, offer positioning, market analysis</li>
<li><strong>Design Specs</strong> -- Visual specs, UI/UX designs, brand implementation guides</li>
<li><strong>Audits</strong> -- System audits, security reviews, performance analyses</li>
<li><strong>Client Reports</strong> -- Client-facing deliverables, health dashboards, ROI calculations</li>
<li><strong>Outreach</strong> -- Email campaigns, lead research, outreach plans</li>
<li><strong>Technical</strong> -- Infrastructure, relay fixes, credential rotation, architecture docs</li>
<li><strong>Content</strong> -- Video plans, editing guides, social media templates, hook libraries</li>
<li><strong>Council</strong> -- Multi-agent council briefs and synthesis documents</li>
</ol>
<h3>Status Rules</h3>
<ul>
<li><code>draft</code> -- Agent is still working on it. Not visible on site. Still indexed locally for internal search.</li>
<li><code>published</code> -- Live on the website. Shows in accordion, has its own URL.</li>
<li><code>archived</code> -- Removed from active display. Still accessible via direct URL but grayed out / hidden from default view.</li>
</ul>
<hr>
<h2>Layer 2: Build-Time Index Generation</h2>
<p>A Node script scans AOM-EA for .md files with valid frontmatter and generates a JSON index that the site reads.</p>
<h3>The Script: <code>scripts/generate-briefs-index.js</code></h3>
<p>Lives in the aom-studio repo. Runs at build time (Vite plugin or npm prebuild script).</p>
<p><strong>What it does:</strong></p>
<ol>
<li>Reads all .md files from a configured source directory (AOM-EA/projects/)</li>
<li>Parses YAML frontmatter using <code>gray-matter</code> (npm package, lightweight, well-maintained)</li>
<li>Filters to <code>status: &quot;published&quot;</code> only</li>
<li>Converts markdown body to HTML using <code>marked</code> (npm package, already battle-tested)</li>
<li>Writes two outputs:<ul>
<li><code>src/data/briefs-index.json</code> -- metadata only (title, slug, category, agent, date, summary). This powers the BriefsHub accordion.</li>
<li><code>src/data/briefs/[slug].json</code> -- full content per brief (metadata + HTML body). These power individual pages.</li>
</ul>
</li>
</ol>
<h3>JSON Output Format</h3>
<p><strong>briefs-index.json:</strong></p>
<pre><code class="language-json">{
  &quot;generated&quot;: &quot;2026-03-12T14:30:00Z&quot;,
  &quot;categories&quot;: [
    {
      &quot;name&quot;: &quot;Strategy&quot;,
      &quot;items&quot;: [
        {
          &quot;title&quot;: &quot;Partnership Strategy&quot;,
          &quot;slug&quot;: &quot;partnerships&quot;,
          &quot;agent&quot;: &quot;Alex&quot;,
          &quot;date&quot;: &quot;2026-03-10&quot;,
          &quot;summary&quot;: &quot;Why partnerships beat cold email.&quot;,
          &quot;path&quot;: &quot;/briefs/partnerships&quot;,
          &quot;hasPage&quot;: true
        }
      ]
    }
  ]
}
</code></pre>
<p><strong>briefs/partnerships.json:</strong></p>
<pre><code class="language-json">{
  &quot;title&quot;: &quot;Partnership Strategy&quot;,
  &quot;slug&quot;: &quot;partnerships&quot;,
  &quot;category&quot;: &quot;Strategy&quot;,
  &quot;agent&quot;: &quot;Alex&quot;,
  &quot;date&quot;: &quot;2026-03-10&quot;,
  &quot;updated&quot;: null,
  &quot;summary&quot;: &quot;Why partnerships beat cold email.&quot;,
  &quot;content&quot;: &quot;&lt;h2&gt;Why Partnerships&lt;/h2&gt;&lt;p&gt;Cold email has a 0% reply rate after 51 sends...&lt;/p&gt;&quot;
}
</code></pre>
<h3>Source Directory Mapping</h3>
<p>The script needs access to AOM-EA .md files at build time. Two options:</p>
<p><strong>Option A (recommended): Git submodule</strong>
Add AOM-EA as a git submodule in aom-studio. The build script reads from <code>./AOM-EA/projects/</code>. Vercel clones submodules automatically.</p>
<p><strong>Option B: Copy step in CI</strong>
A GitHub Action copies published .md files from AOM-EA to aom-studio before build. More moving parts but no submodule complexity.</p>
<p><strong>Option C: API at build time</strong>
Use the GitHub API (via MCP or raw fetch) to pull .md files at build time. Slowest but zero coupling between repos.</p>
<p><strong>Recommendation:</strong> Option A. Submodule is the simplest, keeps everything in git, and Vercel handles it natively. The AOM-EA repo is private but both repos share the same GitHub account.</p>
<h3>Build Integration</h3>
<p>In <code>package.json</code>:</p>
<pre><code class="language-json">{
  &quot;scripts&quot;: {
    &quot;prebuild&quot;: &quot;node scripts/generate-briefs-index.js&quot;,
    &quot;build&quot;: &quot;vite build&quot;
  }
}
</code></pre>
<p>New dev dependencies:</p>
<ul>
<li><code>gray-matter</code> -- YAML frontmatter parsing</li>
<li><code>marked</code> -- Markdown to HTML conversion</li>
</ul>
<hr>
<h2>Layer 3: Dynamic Brief Renderer</h2>
<p>Replace the 9 hand-coded Brief*.jsx pages with ONE dynamic component.</p>
<h3>New Files</h3>
<p><strong><code>src/pages/BriefPage.jsx</code></strong> -- The universal brief renderer.</p>
<p>What it does:</p>
<ol>
<li>Reads the <code>slug</code> from the URL via <code>useParams()</code></li>
<li>Imports the matching <code>src/data/briefs/[slug].json</code></li>
<li>Renders the content using the shared brief layout (hero, back link, metadata bar, HTML content, footer)</li>
<li>Applies AOM typography and brand styles to rendered HTML via a scoped CSS class</li>
</ol>
<h3>Route Change</h3>
<p>In <code>main.jsx</code>, replace all individual brief routes with one dynamic route:</p>
<p><strong>Before (current, 9 routes):</strong></p>
<pre><code class="language-jsx">&lt;Route path=&quot;/briefs/ai-advisory&quot; element={&lt;BriefAIAdvisory /&gt;} /&gt;
&lt;Route path=&quot;/briefs/partnerships&quot; element={&lt;BriefPartnerships /&gt;} /&gt;
&lt;Route path=&quot;/briefs/masterplan&quot; element={&lt;BriefMasterplan /&gt;} /&gt;
// ... 6 more
</code></pre>
<p><strong>After (1 route):</strong></p>
<pre><code class="language-jsx">&lt;Route path=&quot;/briefs&quot; element={&lt;BriefsHub /&gt;} /&gt;
&lt;Route path=&quot;/briefs/:slug&quot; element={&lt;BriefPage /&gt;} /&gt;
</code></pre>
<h3>BriefsHub Refactor</h3>
<p>Replace the hardcoded <code>categories</code> array in BriefsHub.jsx with an import of <code>briefs-index.json</code>:</p>
<pre><code class="language-jsx">import briefsData from &#39;../data/briefs-index.json&#39;;
const categories = briefsData.categories;
</code></pre>
<p>Everything else in BriefsHub stays the same. The accordion, search, animations, Steffen&#39;s design spec. Zero visual change.</p>
<h3>Content Styling</h3>
<p>The HTML from <code>marked</code> needs styling. Create a CSS class <code>.brief-content</code> that applies AOM typography to standard HTML elements:</p>
<pre><code class="language-css">.brief-content h2 { font-family: var(--font-headline); font-size: 28px; font-weight: 700; margin-top: 2.5rem; }
.brief-content h3 { font-family: var(--font-headline); font-size: 22px; font-weight: 600; margin-top: 2rem; }
.brief-content p { font-family: var(--font-body); font-size: 18px; line-height: 1.7; color: #B8B0A8; margin-bottom: 1.25rem; }
.brief-content ul, .brief-content ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
.brief-content li { font-size: 18px; line-height: 1.7; color: #B8B0A8; margin-bottom: 0.5rem; }
.brief-content strong { color: #F5F0EB; }
.brief-content code { font-family: var(--font-mono); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 2px; }
.brief-content blockquote { border-left: 3px solid #E8652D; padding-left: 1.25rem; color: #B8B0A8; font-style: italic; }
.brief-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
.brief-content th, .brief-content td { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: left; font-size: 16px; }
.brief-content th { color: #F5F0EB; font-weight: 600; }
</code></pre>
<p>This ensures every markdown brief looks native on the site without per-page styling.</p>
<hr>
<h2>The Full Flow (Agent to Live Page)</h2>
<ol>
<li><strong>Agent writes .md file</strong> in AOM-EA with frontmatter (e.g., <code>projects/aom-strategy/partnership-strategy.md</code>)</li>
<li><strong>Agent sets <code>status: published</code></strong> when the content is ready</li>
<li><strong>Agent commits and pushes</strong> to AOM-EA repo</li>
<li><strong>aom-studio build triggers</strong> (Vercel auto-deploy on push, or triggered by AOM-EA submodule update)</li>
<li><strong><code>generate-briefs-index.js</code> runs</strong> at prebuild, scans all .md files, generates JSON</li>
<li><strong>BriefsHub reads <code>briefs-index.json</code></strong> and renders the accordion with all published briefs</li>
<li><strong>BriefPage reads <code>briefs/[slug].json</code></strong> and renders the individual page</li>
<li><strong>Live on aheadofmarket.com</strong> within 60 seconds of push</li>
</ol>
<p>No Bobby involvement. No new JSX files. No route additions. Agent writes markdown, site updates.</p>
<hr>
<h2>Backfill Plan</h2>
<h3>Phase 1: Add frontmatter to existing files (1-2 hours)</h3>
<p>The 55+ items currently listed in BriefsHub.jsx&#39;s hardcoded <code>categories</code> array map to .md files in AOM-EA. Each needs frontmatter added.</p>
<p><strong>Priority order:</strong></p>
<ol>
<li>Files that already have live pages (9 files) -- these validate the system works by comparing rendered output to the existing hand-coded pages</li>
<li>Files listed in BriefsHub with <code>path: null</code> (40+ files) -- these become new pages instantly</li>
<li>Files that exist in AOM-EA but aren&#39;t listed in BriefsHub yet</li>
</ol>
<p><strong>Who does the backfill:</strong></p>
<ul>
<li>Mom assigns each agent their own files. Alex adds frontmatter to strategy files, Elon to audit files, Cleo to content files, etc.</li>
<li>Each agent knows their content best and can write accurate summaries.</li>
<li>A frontmatter template goes in <code>references/sops/frontmatter-standard.md</code> so every agent has the spec.</li>
</ul>
<h3>Phase 2: Replace BriefsHub hardcoded data (Bobby, 1 hour)</h3>
<ol>
<li>Bobby adds the submodule, build script, and new dependencies</li>
<li>Bobby replaces the hardcoded <code>categories</code> array with <code>briefs-index.json</code> import</li>
<li>Bobby adds the <code>BriefPage.jsx</code> dynamic renderer and the catch-all route</li>
<li>Bobby adds <code>.brief-content</code> CSS</li>
<li>Elmo QAs: every previously-live brief should render identically</li>
</ol>
<h3>Phase 3: Deprecate hand-coded brief pages (Bobby, 30 min)</h3>
<p>Once BriefPage.jsx is rendering all briefs correctly:</p>
<ol>
<li>Remove the 9 individual Brief*.jsx files</li>
<li>Remove their imports and routes from main.jsx</li>
<li>Confirm all URLs still work via the dynamic route</li>
</ol>
<h3>Phase 4: Ongoing (all agents, forever)</h3>
<p>Every new deliverable that should be public gets frontmatter with <code>status: published</code>. It appears on the site on next deploy. No Bobby, no tickets, no waiting.</p>
<hr>
<h2>Edge Cases</h2>
<p><strong>What if two files have the same slug?</strong>
The generate script logs a warning and uses the more recently dated file. Slugs must be unique.</p>
<p><strong>What about internal-only files (AGENT.md, latest-result.md)?</strong>
No frontmatter = not indexed. The script only picks up files with valid frontmatter. Internal files stay internal by default.</p>
<p><strong>What about files with sensitive info?</strong>
<code>status: draft</code> keeps them off the site. The build script filters to <code>published</code> only. The JSON files that ship to Vercel never contain draft content.</p>
<p><strong>What about the existing hand-coded pages that have custom layouts?</strong>
The 9 existing brief pages have data visualizations, custom grids, and interactive elements that pure markdown can&#39;t replicate. Two options:</p>
<ol>
<li>Keep them as-is (custom JSX overrides dynamic rendering for those slugs)</li>
<li>Gradually migrate the custom elements into reusable components that can be referenced from markdown via a component shortcode system (future enhancement)</li>
</ol>
<p><strong>Recommendation:</strong> Keep existing custom pages for now. The dynamic route falls through to BriefPage.jsx only if no specific route matches. Bobby can migrate them one by one later.</p>
<p>Route priority in react-router v7 handles this naturally: specific paths (<code>/briefs/ai-advisory</code>) match before dynamic params (<code>/briefs/:slug</code>).</p>
<p><strong>What about non-brief pages (guides, research)?</strong>
Same system, different content type. The frontmatter can include a <code>type</code> field (<code>brief</code>, <code>guide</code>, <code>research</code>) and the generate script can output separate indexes. For now, focus on briefs. Guides and research follow the same pattern later.</p>
<hr>
<h2>New Dependencies</h2>
<table>
<thead>
<tr>
<th>Package</th>
<th>Purpose</th>
<th>Size</th>
</tr>
</thead>
<tbody><tr>
<td><code>gray-matter</code></td>
<td>Parse YAML frontmatter from .md files</td>
<td>12kb</td>
</tr>
<tr>
<td><code>marked</code></td>
<td>Convert markdown to HTML</td>
<td>45kb</td>
</tr>
</tbody></table>
<p>Both are well-maintained, widely used, and have zero security concerns.</p>
<hr>
<h2>What This Unlocks</h2>
<ul>
<li><strong>40+ new pages</strong> from existing .md files, zero Bobby time</li>
<li><strong>Any agent can publish</strong> by adding frontmatter and committing</li>
<li><strong>BriefsHub always current</strong> because it reads from generated data, not hardcoded arrays</li>
<li><strong>Search works automatically</strong> because all metadata is in the index</li>
<li><strong>SEO works automatically</strong> because BriefPage.jsx sets title, description, and OG tags from frontmatter</li>
<li><strong>Future: auto-deploy pipeline</strong> where AOM-EA push triggers aom-studio rebuild via GitHub webhook</li>
<li><strong>Future: same system for /guides, /research, /internal</strong> with different content types</li>
</ul>
<hr>
<h2>Summary for Bobby</h2>
<ol>
<li>Add <code>gray-matter</code> and <code>marked</code> as dev dependencies</li>
<li>Add AOM-EA as git submodule (or set up copy step)</li>
<li>Create <code>scripts/generate-briefs-index.js</code> that scans .md files with frontmatter</li>
<li>Add <code>&quot;prebuild&quot;</code> script to package.json</li>
<li>Create <code>src/pages/BriefPage.jsx</code> as the universal renderer</li>
<li>Replace hardcoded categories in BriefsHub.jsx with JSON import</li>
<li>Add <code>&lt;Route path=&quot;/briefs/:slug&quot; element={&lt;BriefPage /&gt;} /&gt;</code> to main.jsx</li>
<li>Add <code>.brief-content</code> CSS for markdown styling</li>
<li>Keep existing 9 custom brief pages as-is (they take priority in routing)</li>
<li>Elmo QAs everything</li>
</ol>
`,c={title:e,slug:t,category:n,agent:o,date:r,dateFormatted:i,updated:null,summary:s,tags:a,content:d};export{o as agent,n as category,d as content,r as date,i as dateFormatted,c as default,t as slug,s as summary,a as tags,e as title,l as updated};
